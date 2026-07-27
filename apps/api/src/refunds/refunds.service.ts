import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  OrderStatusSource,
  PaymentStatus,
  RefundStatus,
  UserRoleType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/types/authenticated-request';
import { ORDER_INCLUDE, OrdersService } from '../orders/orders.service';
import { PaymentProviderResolver } from '../payments/providers/payment-provider.resolver';
import { CreateRefundDto } from './dto/create-refund.dto';

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly providerResolver: PaymentProviderResolver,
  ) {}

  async createRefund(orderId: string, dto: CreateRefundDto, actor: RequestUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.assertStaffAccess(order, actor);

    const payment = dto.paymentId
      ? order.payments.find((p) => p.id === dto.paymentId)
      : [...order.payments].reverse().find((p) => p.status === PaymentStatus.SUCCEEDED);

    if (!payment || payment.status !== PaymentStatus.SUCCEEDED || !payment.cloverPaymentId) {
      throw new BadRequestException('There is no successful payment on this order to refund');
    }

    const alreadyRefundedCents = order.refunds
      .filter((r) => r.paymentId === payment.id && r.status === RefundStatus.SUCCEEDED)
      .reduce((sum, r) => sum + r.amountCents, 0);
    const refundableCents = payment.amountCents - alreadyRefundedCents;

    if (refundableCents <= 0) {
      throw new BadRequestException('This payment has already been fully refunded');
    }

    const amountCents = dto.amountCents ?? refundableCents;
    if (amountCents > refundableCents) {
      throw new BadRequestException(
        `You can refund at most $${(refundableCents / 100).toFixed(2)} on this payment`,
      );
    }

    const refund = await this.prisma.refund.create({
      data: {
        paymentId: payment.id,
        orderId: order.id,
        amountCents,
        reason: dto.reason,
        status: RefundStatus.PENDING,
        initiatedByUserId: actor.userId,
      },
    });

    let currentOrder = await this.ordersService.applyStatusTransition(
      order,
      OrderStatus.REFUND_PENDING,
      OrderStatusSource.ADMINISTRATOR,
      actor.userId,
      dto.reason,
    );

    const provider = this.providerResolver.resolve(payment.provider);
    let outcome: {
      providerRefundId: string;
      status: 'succeeded' | 'failed';
      failureReason?: string;
    };
    try {
      outcome = await provider.refund({
        restaurantLocationId: order.restaurantLocationId,
        providerPaymentId: payment.cloverPaymentId,
        amountCents,
      });
    } catch (error) {
      outcome = { providerRefundId: '', status: 'failed', failureReason: (error as Error).message };
    }

    const updatedRefund = await this.prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: outcome.status === 'succeeded' ? RefundStatus.SUCCEEDED : RefundStatus.FAILED,
        cloverRefundId: outcome.providerRefundId || undefined,
        processedAt: new Date(),
      },
    });

    if (outcome.status === 'succeeded') {
      const totalRefundedCents = alreadyRefundedCents + amountCents;
      const newStatus =
        totalRefundedCents >= order.totalCents
          ? OrderStatus.REFUNDED
          : OrderStatus.PARTIALLY_REFUNDED;
      currentOrder = await this.ordersService.applyStatusTransition(
        currentOrder,
        newStatus,
        OrderStatusSource.SYSTEM,
      );
    } else {
      // Refund failed at the processor - restore the order to its
      // pre-refund-attempt status rather than leaving it stuck in
      // REFUND_PENDING indefinitely.
      currentOrder = await this.ordersService.applyStatusTransition(
        currentOrder,
        order.status,
        OrderStatusSource.SYSTEM,
        undefined,
        outcome.failureReason,
      );
    }

    return { refund: updatedRefund, order: currentOrder };
  }

  async listForOrder(orderId: string, actor: RequestUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== actor.userId) {
      this.assertStaffAccess(order, actor);
    }
    return order.refunds;
  }

  private assertStaffAccess(
    order: { restaurantId: string; restaurantLocationId: string },
    actor: RequestUser,
  ) {
    const isStaffForRestaurant = actor.roles.some(
      (r) =>
        (r.role === UserRoleType.RESTAURANT_ADMIN || r.role === UserRoleType.RESTAURANT_EMPLOYEE) &&
        (r.restaurantId === order.restaurantId ||
          r.restaurantLocationId === order.restaurantLocationId),
    );
    if (!isStaffForRestaurant) {
      throw new ForbiddenException('You do not have access to this order');
    }
  }
}
