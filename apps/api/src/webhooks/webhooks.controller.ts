import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CloverWebhooksService } from './clover-webhooks.service';
import { CloverWebhookPayload } from './clover-webhook-payload.interface';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly cloverWebhooksService: CloverWebhooksService) {}

  @Public()
  @Post('clover')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Clover app-level webhook callback (payments/refunds/orders). Verified via the X-Clover-Auth header.',
  })
  handleCloverWebhook(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: CloverWebhookPayload,
  ) {
    return this.cloverWebhooksService.handleIncoming(headers, body);
  }
}
