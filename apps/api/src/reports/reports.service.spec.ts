import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: { order: { findMany: jest.Mock } };

  beforeEach(() => {
    prisma = { order: { findMany: jest.fn() } };
    service = new ReportsService(prisma as unknown as PrismaService);
  });

  it('rejects an inverted date range', async () => {
    await expect(
      service.getSalesSummary('rest-1', '2026-02-01', '2026-01-01'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unparsable date', async () => {
    await expect(service.getSalesSummary('rest-1', 'not-a-date')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('excludes non-sale statuses from revenue but still counts them by status', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'o1',
        status: OrderStatus.CANCELLED,
        totalCents: 1000,
        createdAt: new Date('2026-01-05'),
        refunds: [],
      },
      {
        id: 'o2',
        status: OrderStatus.COMPLETED,
        totalCents: 2000,
        createdAt: new Date('2026-01-05'),
        refunds: [],
      },
    ]);

    const summary = await service.getSalesSummary('rest-1', '2026-01-01', '2026-01-31');

    expect(summary.ordersCount).toBe(1);
    expect(summary.grossRevenueCents).toBe(2000);
    expect(summary.ordersByStatus[OrderStatus.CANCELLED]).toBe(1);
    expect(summary.ordersByStatus[OrderStatus.COMPLETED]).toBe(1);
  });

  it('nets out successful refunds from gross revenue and per-day totals', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'o1',
        status: OrderStatus.COMPLETED,
        totalCents: 5000,
        createdAt: new Date('2026-01-10T12:00:00Z'),
        refunds: [{ amountCents: 1500 }],
      },
      {
        id: 'o2',
        status: OrderStatus.REFUNDED,
        totalCents: 3000,
        createdAt: new Date('2026-01-10T18:00:00Z'),
        refunds: [{ amountCents: 3000 }],
      },
    ]);

    const summary = await service.getSalesSummary('rest-1', '2026-01-01', '2026-01-31');

    expect(summary.grossRevenueCents).toBe(8000);
    expect(summary.refundedCents).toBe(4500);
    expect(summary.netRevenueCents).toBe(3500);
    expect(summary.ordersCount).toBe(2);
    expect(summary.averageOrderValueCents).toBe(1750);
    expect(summary.revenueByDay).toEqual([
      { date: '2026-01-10', orders: 2, netRevenueCents: 3500 },
    ]);
  });

  it('defaults averageOrderValueCents to 0 when there are no sale orders', async () => {
    prisma.order.findMany.mockResolvedValue([]);
    const summary = await service.getSalesSummary('rest-1');
    expect(summary.ordersCount).toBe(0);
    expect(summary.averageOrderValueCents).toBe(0);
    expect(summary.revenueByDay).toEqual([]);
  });
});
