import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/authenticated-request';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('ecommerce-tokenization-config/:orderId')
  @ApiOperation({
    summary:
      'Get the non-secret Clover Ecommerce key + host the app uses to tokenize a card directly with Clover',
  })
  getTokenizationConfig(@CurrentUser() user: RequestUser, @Param('orderId') orderId: string) {
    return this.paymentsService.getTokenizationConfig(orderId, user);
  }

  @Post()
  @ApiOperation({
    summary: 'Charge an order (card token for Ecommerce, device id for in-restaurant terminal)',
  })
  charge(@CurrentUser() user: RequestUser, @Body() dto: CreatePaymentDto, @Req() req: Request) {
    return this.paymentsService.charge(user, dto, req.ip);
  }

  @Get(':paymentId')
  @ApiOperation({ summary: 'Get the status of a payment (used to poll terminal payments)' })
  getPayment(@CurrentUser() user: RequestUser, @Param('paymentId') paymentId: string) {
    return this.paymentsService.getPayment(paymentId, user);
  }
}
