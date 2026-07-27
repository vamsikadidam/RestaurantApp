import { Injectable } from '@nestjs/common';
import { PaymentProviderMode } from '@prisma/client';
import { CloverEcommercePaymentProvider } from './clover-ecommerce-payment.provider';
import { CloverTerminalPaymentProvider } from './clover-terminal-payment.provider';
import { PaymentProvider } from './payment-provider.interface';

@Injectable()
export class PaymentProviderResolver {
  private readonly providers: Record<PaymentProviderMode, PaymentProvider>;

  constructor(ecommerce: CloverEcommercePaymentProvider, terminal: CloverTerminalPaymentProvider) {
    this.providers = {
      [PaymentProviderMode.CLOVER_ECOMMERCE]: ecommerce,
      [PaymentProviderMode.CLOVER_TERMINAL]: terminal,
    };
  }

  resolve(mode: PaymentProviderMode): PaymentProvider {
    return this.providers[mode];
  }
}
