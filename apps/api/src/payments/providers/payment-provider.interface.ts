import { PaymentProviderMode } from '@prisma/client';

export const PAYMENT_PROVIDER_RESOLVER = Symbol('PAYMENT_PROVIDER_RESOLVER');

export type PaymentOutcomeStatus = 'succeeded' | 'failed' | 'processing';

export interface PaymentChargeInput {
  orderId: string;
  restaurantLocationId: string;
  amountCents: number;
  currency: string;
  /** Required for CLOVER_ECOMMERCE - the single-use `clv_...` token the
   * mobile app obtained directly from Clover's tokenization host. */
  sourceToken?: string;
  /** Required for CLOVER_TERMINAL - which physical device to send the Pay
   * Display request to. */
  terminalDeviceId?: string;
  clientIp?: string;
  idempotencyKey: string;
}

export interface PaymentChargeResult {
  providerPaymentId: string;
  status: PaymentOutcomeStatus;
  failureReason?: string;
}

export interface PaymentRefundInput {
  restaurantLocationId: string;
  providerPaymentId: string;
  amountCents?: number;
}

export interface PaymentRefundResult {
  providerRefundId: string;
  status: 'succeeded' | 'failed';
  failureReason?: string;
}

/**
 * Abstraction point for "how do we actually move money". Today both
 * implementations talk to Clover (card-not-present Ecommerce API vs.
 * in-restaurant Pay Display/terminal API) but new payment methods (e.g. a
 * different processor) only need to add a new class implementing this
 * interface and register it in PaymentProviderResolver - nothing in
 * PaymentsService/OrdersService needs to change.
 */
export interface PaymentProvider {
  readonly mode: PaymentProviderMode;
  charge(input: PaymentChargeInput): Promise<PaymentChargeResult>;
  refund(input: PaymentRefundInput): Promise<PaymentRefundResult>;
}
