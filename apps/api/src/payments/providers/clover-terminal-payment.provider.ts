import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderMode } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CloverOAuthService } from '../../clover/clover-oauth.service';
import {
  PaymentChargeInput,
  PaymentChargeResult,
  PaymentProvider,
  PaymentRefundInput,
  PaymentRefundResult,
} from './payment-provider.interface';

/**
 * In-restaurant terminal payments via Clover's REST Pay Display API. Used
 * by restaurant staff (admin portal, Phase 6) to charge a physical Clover
 * device for orders taken in person or paid at pickup - never called
 * directly by the customer mobile app.
 *
 * Verified against docs.clover.com/dev/reference/pay and
 * docs.clover.com/dev/docs/rest-pay-payment-flows:
 *  - POST {restPayBaseUrl}/v1/payments (headers: X-Clover-Device-Id,
 *    X-POS-Id, Idempotency-Key, Authorization: Bearer {access_token}).
 *  - POST {restPayBaseUrl}/v1/payments/{paymentId}/refunds for refunds.
 * This flow is inherently untestable without a physical device/sandbox dev
 * kit, so it always resolves to the mock branch unless
 * CLOVER_USE_MOCK_CLIENT=false is explicitly set. `charge()` only
 * *initiates* the on-device flow - the definitive result arrives later via
 * the Clover webhook (see WebhooksModule), so the returned status is always
 * "processing" for a real call.
 */
@Injectable()
export class CloverTerminalPaymentProvider implements PaymentProvider {
  readonly mode = PaymentProviderMode.CLOVER_TERMINAL;
  private readonly logger = new Logger(CloverTerminalPaymentProvider.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cloverOAuthService: CloverOAuthService,
  ) {}

  async charge(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    if (!input.terminalDeviceId) {
      throw new BadRequestException('A terminal device id is required for in-person card payments');
    }

    if (this.configService.get<boolean>('clover.useMockClient')) {
      const providerPaymentId = `MOCK_TERMINAL_PAYMENT_${randomUUID()}`;
      this.logger.debug(
        `[mock] initiated terminal payment ${providerPaymentId} for ${input.amountCents} cents`,
      );
      return { providerPaymentId, status: 'processing' };
    }

    const { accessToken } = await this.cloverOAuthService.getValidAccessToken(
      input.restaurantLocationId,
    );
    const restPayBaseUrl = this.configService.get<string>('clover.restPayBaseUrl');

    const response = await this.httpService.axiosRef.post(
      `${restPayBaseUrl}/v1/payments`,
      { amount: input.amountCents, externalPaymentId: input.orderId },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Clover-Device-Id': input.terminalDeviceId,
          'X-POS-Id': 'restaurant-platform',
          'Idempotency-Key': input.idempotencyKey,
        },
      },
    );

    return { providerPaymentId: response.data.paymentId ?? response.data.id, status: 'processing' };
  }

  async refund(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    if (this.configService.get<boolean>('clover.useMockClient')) {
      return { providerRefundId: `MOCK_TERMINAL_REFUND_${randomUUID()}`, status: 'succeeded' };
    }

    const { accessToken } = await this.cloverOAuthService.getValidAccessToken(
      input.restaurantLocationId,
    );
    const restPayBaseUrl = this.configService.get<string>('clover.restPayBaseUrl');

    const response = await this.httpService.axiosRef.post(
      `${restPayBaseUrl}/v1/payments/${input.providerPaymentId}/refunds`,
      input.amountCents ? { amount: input.amountCents } : {},
      { headers: { Authorization: `Bearer ${accessToken}`, 'Idempotency-Key': randomUUID() } },
    );

    return { providerRefundId: response.data.id, status: 'succeeded' };
  }
}
