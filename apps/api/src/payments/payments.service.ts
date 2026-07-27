import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, OrderStatusSource, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RequestUser } from '../common/types/authenticated-request';
import { CloverOAuthService } from '../clover/clover-oauth.service';
import {
  CLOVER_API_CLIENT,
  CloverApiClient,
} from '../clover/interfaces/clover-api-client.interface';
import { ORDER_INCLUDE, OrdersService } from '../orders/orders.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentProviderResolver } from './providers/payment-provider.resolver';
import { PaymentOutcomeStatus } from './providers/payment-provider.interface';

const ECOMMERCE_KEY_CACHE_PREFIX = 'clover:ecommerce-api-key:';
const ECOMMERCE_KEY_CACHE_TTL_SECONDS = 24 * 60 * 60;

const PAYABLE_STATUSES: OrderStatus[] = [OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_FAILED];

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly cloverOAuthService: CloverOAuthService,
    private readonly providerResolver: PaymentProviderResolver,
    @Inject(CLOVER_API_CLIENT) private readonly cloverApiClient: CloverApiClient,
  ) {}

  /**
   * Returns everything the mobile app needs to tokenize a card *directly*
   * against Clover (never through our backend) - see
   * ClovertEcommercePaymentProvider and SECURITY.md for why this is safe.
   */
  async getTokenizationConfig(orderId: string, user: RequestUser) {
    const order = await this.loadOwnedPayableOrder(orderId, user.userId);

    const cacheKey = `${ECOMMERCE_KEY_CACHE_PREFIX}${order.restaurantLocationId}`;
    let apiAccessKey = await this.redis.get(cacheKey);

    if (!apiAccessKey) {
      const { accessToken, merchantId } = await this.cloverOAuthService.getValidAccessToken(
        order.restaurantLocationId,
      );
      apiAccessKey = await this.cloverApiClient.getEcommerceApiAccessKey(merchantId, accessToken);
      await this.redis.set(cacheKey, apiAccessKey, ECOMMERCE_KEY_CACHE_TTL_SECONDS);
    }

    return {
      orderId: order.id,
      apiAccessKey,
      tokenBaseUrl: this.configService.get<string>('clover.tokenBaseUrl'),
      amountCents: order.totalCents,
      currency: order.currency,
    };
  }

  async charge(user: RequestUser, dto: CreatePaymentDto, clientIp?: string) {
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existingPayment) {
      const order = await this.prisma.order.findUnique({
        where: { id: existingPayment.orderId },
        include: ORDER_INCLUDE,
      });
      return { payment: existingPayment, order };
    }

    const order = await this.loadOwnedPayableOrder(dto.orderId, user.userId);

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: dto.provider,
        status: PaymentStatus.PENDING,
        amountCents: order.totalCents,
        currency: order.currency,
        idempotencyKey: dto.idempotencyKey,
      },
    });

    let currentOrder = await this.ordersService.applyStatusTransition(
      order,
      OrderStatus.PAYMENT_PROCESSING,
      OrderStatusSource.SYSTEM,
    );

    const provider = this.providerResolver.resolve(dto.provider);
    let outcome: {
      providerPaymentId: string;
      status: PaymentOutcomeStatus;
      failureReason?: string;
    };
    try {
      outcome = await provider.charge({
        orderId: order.id,
        restaurantLocationId: order.restaurantLocationId,
        amountCents: order.totalCents,
        currency: order.currency,
        sourceToken: dto.sourceToken,
        terminalDeviceId: dto.terminalDeviceId,
        clientIp,
        idempotencyKey: dto.idempotencyKey,
      });
    } catch (error) {
      outcome = {
        providerPaymentId: '',
        status: 'failed',
        failureReason: (error as Error).message,
      };
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: this.toPaymentStatus(outcome.status),
        cloverPaymentId: outcome.providerPaymentId || undefined,
        failureReason: outcome.failureReason,
        processedAt: new Date(),
      },
    });

    if (outcome.status === 'succeeded') {
      currentOrder = await this.ordersService.applyStatusTransition(
        currentOrder,
        OrderStatus.PAID,
        OrderStatusSource.SYSTEM,
      );
      currentOrder = await this.ordersService.applyStatusTransition(
        currentOrder,
        OrderStatus.SUBMITTED_TO_RESTAURANT,
        OrderStatusSource.SYSTEM,
      );
    } else if (outcome.status === 'failed') {
      currentOrder = await this.ordersService.applyStatusTransition(
        currentOrder,
        OrderStatus.PAYMENT_FAILED,
        OrderStatusSource.SYSTEM,
        undefined,
        outcome.failureReason,
      );
    }
    // 'processing' (terminal payments only): order stays in PAYMENT_PROCESSING
    // until the Clover webhook confirms the on-device result - see WebhooksModule.

    return { payment: updatedPayment, order: currentOrder };
  }

  async getPayment(paymentId: string, user: RequestUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.order.userId !== user.userId) {
      throw new ForbiddenException('You do not have access to this payment');
    }
    return payment;
  }

  private async loadOwnedPayableOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    if (!PAYABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('This order is not awaiting payment');
    }
    return order;
  }

  private toPaymentStatus(status: PaymentOutcomeStatus): PaymentStatus {
    if (status === 'succeeded') return PaymentStatus.SUCCEEDED;
    if (status === 'failed') return PaymentStatus.FAILED;
    return PaymentStatus.PROCESSING;
  }
}
