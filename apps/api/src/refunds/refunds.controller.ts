import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestUser } from '../common/types/authenticated-request';
import { RefundsService } from './refunds.service';
import { CreateRefundDto } from './dto/create-refund.dto';

@ApiTags('refunds')
@Controller('orders/:orderId/refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRoleType.RESTAURANT_ADMIN, UserRoleType.RESTAURANT_EMPLOYEE)
  @ApiOperation({
    summary: 'Issue a full or partial refund for an order (restaurant admin/employee only)',
  })
  createRefund(
    @CurrentUser() actor: RequestUser,
    @Param('orderId') orderId: string,
    @Body() dto: CreateRefundDto,
  ) {
    return this.refundsService.createRefund(orderId, dto, actor);
  }

  @Get()
  @ApiOperation({ summary: 'List refunds for an order (owner or restaurant staff)' })
  list(@CurrentUser() actor: RequestUser, @Param('orderId') orderId: string) {
    return this.refundsService.listForOrder(orderId, actor);
  }
}
