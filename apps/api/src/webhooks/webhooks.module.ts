import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { WebhooksController } from './webhooks.controller';
import { CloverWebhooksService } from './clover-webhooks.service';

@Module({
  imports: [OrdersModule],
  controllers: [WebhooksController],
  providers: [CloverWebhooksService],
})
export class WebhooksModule {}
