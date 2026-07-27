import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PaymentProviderMode } from '@prisma/client';
import { CloverOAuthService } from '../../clover/clover-oauth.service';
import {
  CLOVER_API_CLIENT,
  CloverApiClient,
} from '../../clover/interfaces/clover-api-client.interface';
import {
  PaymentChargeInput,
  PaymentChargeResult,
  PaymentProvider,
  PaymentRefundInput,
  PaymentRefundResult,
} from './payment-provider.interface';

/**
 * Card-not-present payments. The mobile app tokenizes the card *directly*
 * against Clover's tokenization host using a non-secret per-merchant
 * `apiAccessKey` (see PaymentsService.getTokenizationConfig) - raw card
 * data never reaches this server. This provider only ever sees the
 * resulting single-use `clv_...` token and the merchant's OAuth access
 * token (which never leaves the backend).
 */
@Injectable()
export class CloverEcommercePaymentProvider implements PaymentProvider {
  readonly mode = PaymentProviderMode.CLOVER_ECOMMERCE;

  constructor(
    private readonly cloverOAuthService: CloverOAuthService,
    @Inject(CLOVER_API_CLIENT) private readonly cloverApiClient: CloverApiClient,
  ) {}

  async charge(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    if (!input.sourceToken) {
      throw new BadRequestException('A card token is required for card payments');
    }

    const { accessToken } = await this.cloverOAuthService.getValidAccessToken(
      input.restaurantLocationId,
    );
    const result = await this.cloverApiClient.createCharge(accessToken, {
      amountCents: input.amountCents,
      currency: input.currency,
      source: input.sourceToken,
      clientIp: input.clientIp,
      orderId: input.orderId,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      providerPaymentId: result.id,
      status: result.status === 'succeeded' ? 'succeeded' : 'failed',
      failureReason:
        result.status === 'succeeded' ? undefined : `Card was declined (status: ${result.status})`,
    };
  }

  async refund(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    const { accessToken } = await this.cloverOAuthService.getValidAccessToken(
      input.restaurantLocationId,
    );
    const result = await this.cloverApiClient.createRefund(
      accessToken,
      input.providerPaymentId,
      input.amountCents,
    );

    return {
      providerRefundId: result.id,
      status: result.status === 'succeeded' ? 'succeeded' : 'failed',
    };
  }
}
