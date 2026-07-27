import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CloverModule } from '../clover/clover.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CloverEcommercePaymentProvider } from './providers/clover-ecommerce-payment.provider';
import { CloverTerminalPaymentProvider } from './providers/clover-terminal-payment.provider';
import { PaymentProviderResolver } from './providers/payment-provider.resolver';

@Module({
  imports: [HttpModule.register({ timeout: 15_000 }), CloverModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    CloverEcommercePaymentProvider,
    CloverTerminalPaymentProvider,
    PaymentProviderResolver,
  ],
  exports: [PaymentsService, PaymentProviderResolver],
})
export class PaymentsModule {}
