import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  OrderStatusSource,
  PaymentStatus,
  RefundStatus,
  WebhookEventStatus,
} from '@prisma/client';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ORDER_INCLUDE, OrdersService } from '../orders/orders.service';
import {
  CloverWebhookMerchantEvent,
  CloverWebhookPayload,
} from './clover-webhook-payload.interface';

const CLOVER_AUTH_HEADER = 'x-clover-auth';

@Injectable()
export class CloverWebhooksService {
  private readonly logger = new Logger(CloverWebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Entry point called by the controller for every inbound POST. Always
   * returns quickly (Clover expects a fast 200) - persistence + dedup
   * happen synchronously (cheap, needed for the response), but the actual
   * side effects (order/payment updates) are kicked off without blocking
   * the response.
   */
  async handleIncoming(
    headers: Record<string, string | string[] | undefined>,
    rawBody: CloverWebhookPayload,
  ) {
    // One-time callback URL verification handshake - see CLOVER_SETUP_GUIDE.md.
    // No X-Clover-Auth header exists yet at this point, so there's nothing to
    // verify; just surface the code loudly so an operator can paste it into
    // the Clover dashboard.
    if (rawBody?.verificationCode) {
      this.logger.warn(
        `Received Clover webhook verification code: ${rawBody.verificationCode}. ` +
          'Paste this into the Clover Developer Dashboard > App Settings > Webhooks to finish setup.',
      );
      return { received: true };
    }

    const signatureValid = this.verifySignature(headers);
    const merchants = rawBody?.merchants ?? {};

    for (const [merchantId, events] of Object.entries(merchants)) {
      for (const event of events) {
        await this.recordAndProcessEvent(merchantId, event, rawBody, signatureValid);
      }
    }

    return { received: true };
  }

  private verifySignature(headers: Record<string, string | string[] | undefined>): boolean {
    const configuredSecret = this.configService.get<string>('clover.webhookSecret');
    if (!configuredSecret) {
      // Not configured yet (e.g. local dev with the mock Clover client) -
      // accept but flag as unverified rather than hard-failing, so the rest
      // of the pipeline stays exercisable in tests/dev.
      return false;
    }

    const headerValue = headers[CLOVER_AUTH_HEADER];
    const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!provided) {
      return false;
    }

    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(configuredSecret);
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return timingSafeEqual(providedBuffer, expectedBuffer);
  }

  private async recordAndProcessEvent(
    merchantId: string,
    event: CloverWebhookMerchantEvent,
    fullPayload: CloverWebhookPayload,
    signatureValid: boolean,
  ) {
    const dedupeKey = createHash('sha256')
      .update(`${merchantId}:${event.objectId}:${event.type}:${event.ts}`)
      .digest('hex');

    const existing = await this.prisma.webhookEvent.findUnique({
      where: { cloverEventId: dedupeKey },
    });
    if (existing) {
      this.logger.debug(`Ignoring duplicate Clover webhook event ${dedupeKey}`);
      return;
    }

    const webhookEvent = await this.prisma.webhookEvent.create({
      data: {
        cloverEventId: dedupeKey,
        eventType: event.objectId.split(':')[0] ?? 'UNKNOWN',
        merchantId,
        payload: fullPayload as object,
        signatureValid,
        status: WebhookEventStatus.RECEIVED,
      },
    });

    try {
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: WebhookEventStatus.PROCESSING, attempts: { increment: 1 } },
      });

      await this.processEvent(merchantId, event);

      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: WebhookEventStatus.PROCESSED, processedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(
        `Failed to process Clover webhook event ${webhookEvent.id}: ${(error as Error).message}`,
      );
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status:
            webhookEvent.attempts >= 4 ? WebhookEventStatus.DEAD_LETTER : WebhookEventStatus.FAILED,
          lastError: (error as Error).message,
        },
      });
    }
  }

  /**
   * Only PAYMENT/REFUND notifications drive real state changes today - they
   * confirm the outcome of in-restaurant terminal payments/refunds
   * initiated via the REST Pay Display API (see CloverTerminalPaymentProvider),
   * which don't return a definitive result synchronously the way the
   * Ecommerce Charges API does. ORDER notifications (e.g. staff editing an
   * order on the physical Register) are intentionally not applied back onto
   * our own order records yet - see CLOVER_SETUP_GUIDE.md "Known limitations".
   */
  private async processEvent(merchantId: string, event: CloverWebhookMerchantEvent) {
    const [prefix, cloverObjectId] = event.objectId.split(':');
    if (!cloverObjectId) return;

    if (prefix === 'PAYMENT') {
      await this.reconcilePayment(cloverObjectId);
    } else if (prefix === 'REFUND') {
      await this.reconcileRefund(cloverObjectId);
    } else {
      this.logger.debug(
        `No handler for Clover webhook object prefix "${prefix}" (merchant ${merchantId})`,
      );
    }
  }

  private async reconcilePayment(cloverPaymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { cloverPaymentId } });
    if (!payment || payment.status === PaymentStatus.SUCCEEDED) {
      return;
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.SUCCEEDED, processedAt: new Date() },
    });

    const order = await this.prisma.order.findUnique({
      where: { id: updatedPayment.orderId },
      include: ORDER_INCLUDE,
    });
    if (
      !order ||
      order.status === OrderStatus.PAID ||
      order.status === OrderStatus.SUBMITTED_TO_RESTAURANT
    ) {
      return;
    }

    const paid = await this.ordersService.applyStatusTransition(
      order,
      OrderStatus.PAID,
      OrderStatusSource.CLOVER,
    );
    await this.ordersService.applyStatusTransition(
      paid,
      OrderStatus.SUBMITTED_TO_RESTAURANT,
      OrderStatusSource.CLOVER,
    );
  }

  private async reconcileRefund(cloverRefundId: string) {
    const refund = await this.prisma.refund.findUnique({ where: { cloverRefundId } });
    if (!refund || refund.status === RefundStatus.SUCCEEDED) {
      return;
    }

    await this.prisma.refund.update({
      where: { id: refund.id },
      data: { status: RefundStatus.SUCCEEDED, processedAt: new Date() },
    });
  }
}
