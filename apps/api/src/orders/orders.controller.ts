import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderStatus, UserRoleType } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantScopeGuard } from '../common/guards/restaurant-scope.guard';
import { RequestUser } from '../common/types/authenticated-request';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('orders')
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ApiOperation({
    summary: 'Convert a cart into a pending order with authoritative, revalidated pricing',
  })
  checkout(@CurrentUser() user: RequestUser, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(user.userId, dto);
  }

  @Get('orders/me')
  @ApiOperation({ summary: "List the current user's order history" })
  listMyOrders(
    @CurrentUser() user: RequestUser,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.ordersService.listMyOrders(user.userId, Number(take) || 20, Number(skip) || 0);
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Get a single order (owner or restaurant staff scoped to it)' })
  getOrder(@CurrentUser() user: RequestUser, @Param('orderId') orderId: string) {
    return this.ordersService.getOrder(orderId, user);
  }

  @Patch('orders/:orderId/status')
  @ApiOperation({ summary: 'Transition an order to a new status (restaurant admin/employee only)' })
  @UseGuards(RolesGuard)
  @Roles(UserRoleType.RESTAURANT_ADMIN, UserRoleType.RESTAURANT_EMPLOYEE)
  updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(orderId, dto.status, user, dto.reason);
  }

  @Get('restaurants/:restaurantId/orders')
  @ApiOperation({ summary: 'List orders for a restaurant (admin/employee dashboard)' })
  @UseGuards(RolesGuard, RestaurantScopeGuard)
  @Roles(UserRoleType.RESTAURANT_ADMIN, UserRoleType.RESTAURANT_EMPLOYEE)
  listRestaurantOrders(
    @Param('restaurantId') restaurantId: string,
    @Query('restaurantLocationId') restaurantLocationId?: string,
    @Query('status') status?: OrderStatus,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.ordersService.listRestaurantOrders(
      restaurantId,
      { restaurantLocationId, status },
      Number(take) || 50,
      Number(skip) || 0,
    );
  }
}
