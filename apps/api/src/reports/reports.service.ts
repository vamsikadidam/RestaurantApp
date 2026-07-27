import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, RefundStatus } from '@prisma/client';

/** Orders in these statuses never became real, payable sales. */
const EXCLUDED_FROM_REVENUE: OrderStatus[] = [
  OrderStatus.CART,
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PAYMENT_PROCESSING,
  OrderStatus.PAYMENT_FAILED,
  OrderStatus.REJECTED,
  OrderStatus.CANCELLED,
];

export interface SalesSummary {
  from: string;
  to: string;
  ordersCount: number;
  grossRevenueCents: number;
  refundedCents: number;
  netRevenueCents: number;
  averageOrderValueCents: number;
  ordersByStatus: Record<string, number>;
  revenueByDay: Array<{ date: string; orders: number; netRevenueCents: number }>;
}

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesSummary(
    restaurantId: string,
    fromInput?: string,
    toInput?: string,
    restaurantLocationId?: string,
  ): Promise<SalesSummary> {
    const to = toInput ? new Date(toInput) : new Date();
    const from = fromInput
      ? new Date(fromInput)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid from/to date');
    }
    if (from > to) {
      throw new BadRequestException('"from" must be before "to"');
    }

    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        restaurantLocationId,
        createdAt: { gte: from, lte: to },
        status: { notIn: [OrderStatus.CART] },
      },
      select: {
        id: true,
        status: true,
        totalCents: true,
        createdAt: true,
        refunds: { where: { status: RefundStatus.SUCCEEDED }, select: { amountCents: true } },
      },
    });

    const ordersByStatus: Record<string, number> = {};
    const byDay = new Map<string, { orders: number; netRevenueCents: number }>();

    let ordersCount = 0;
    let grossRevenueCents = 0;
    let refundedCents = 0;

    for (const order of orders) {
      ordersByStatus[order.status] = (ordersByStatus[order.status] ?? 0) + 1;

      if (EXCLUDED_FROM_REVENUE.includes(order.status)) {
        continue;
      }

      ordersCount += 1;
      grossRevenueCents += order.totalCents;
      const orderRefundedCents = order.refunds.reduce((sum, r) => sum + r.amountCents, 0);
      refundedCents += orderRefundedCents;

      const dayKey = order.createdAt.toISOString().slice(0, 10);
      const day = byDay.get(dayKey) ?? { orders: 0, netRevenueCents: 0 };
      day.orders += 1;
      day.netRevenueCents += order.totalCents - orderRefundedCents;
      byDay.set(dayKey, day);
    }

    const netRevenueCents = grossRevenueCents - refundedCents;

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      ordersCount,
      grossRevenueCents,
      refundedCents,
      netRevenueCents,
      averageOrderValueCents: ordersCount > 0 ? Math.round(netRevenueCents / ordersCount) : 0,
      ordersByStatus,
      revenueByDay: [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v })),
    };
  }
}
