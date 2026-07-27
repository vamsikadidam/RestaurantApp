import { OrderStatus, PaymentStatus, WebhookEventStatus } from '@prisma/client';
import { CloverWebhooksService } from './clover-webhooks.service';

describe('CloverWebhooksService', () => {
  let service: CloverWebhooksService;
  let prisma: any;
  let configService: any;
  let ordersService: any;

  beforeEach(() => {
    prisma = {
      webhookEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
      payment: { findUnique: jest.fn(), update: jest.fn() },
      order: { findUnique: jest.fn() },
      refund: { findUnique: jest.fn(), update: jest.fn() },
    };
    configService = { get: jest.fn().mockReturnValue('shared-secret') };
    ordersService = {
      applyStatusTransition: jest.fn(async (o: any, status: OrderStatus) => ({ ...o, status })),
    };

    prisma.webhookEvent.create.mockResolvedValue({ id: 'evt-1', attempts: 0 });

    service = new CloverWebhooksService(prisma, configService, ordersService);
  });

  it('immediately acknowledges the one-time verification handshake without processing it as an event', async () => {
    const result = await service.handleIncoming({}, { verificationCode: 'abc-123' });

    expect(result).toEqual({ received: true });
    expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
  });

  it('records signatureValid=false when the X-Clover-Auth header is missing or wrong', async () => {
    await service.handleIncoming(
      { 'x-clover-auth': 'wrong-secret' },
      { merchants: { M1: [{ objectId: 'ORDER:O1', type: 'UPDATE', ts: 1 }] } },
    );

    expect(prisma.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ signatureValid: false }) }),
    );
  });

  it('records signatureValid=true when the X-Clover-Auth header matches the configured secret', async () => {
    await service.handleIncoming(
      { 'x-clover-auth': 'shared-secret' },
      { merchants: { M1: [{ objectId: 'ORDER:O1', type: 'UPDATE', ts: 1 }] } },
    );

    expect(prisma.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ signatureValid: true }) }),
    );
  });

  it('ignores a duplicate event instead of processing it twice', async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue({ id: 'existing' });

    await service.handleIncoming(
      { 'x-clover-auth': 'shared-secret' },
      { merchants: { M1: [{ objectId: 'PAYMENT:P1', type: 'UPDATE', ts: 1 }] } },
    );

    expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
  });

  it('reconciles a matching local payment to SUCCEEDED and moves the order to PAID then SUBMITTED_TO_RESTAURANT', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      orderId: 'order-1',
      status: PaymentStatus.PROCESSING,
    });
    prisma.payment.update.mockResolvedValue({
      id: 'pay-1',
      orderId: 'order-1',
      status: PaymentStatus.SUCCEEDED,
    });
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PAYMENT_PROCESSING,
    });

    await service.handleIncoming(
      { 'x-clover-auth': 'shared-secret' },
      { merchants: { M1: [{ objectId: 'PAYMENT:P1', type: 'UPDATE', ts: 42 }] } },
    );

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: PaymentStatus.SUCCEEDED }),
      }),
    );
    expect(ordersService.applyStatusTransition).toHaveBeenCalledWith(
      expect.anything(),
      OrderStatus.PAID,
      'CLOVER',
    );
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: WebhookEventStatus.PROCESSED }),
      }),
    );
  });

  it('does nothing when no local payment matches the Clover payment id', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);

    await service.handleIncoming(
      { 'x-clover-auth': 'shared-secret' },
      { merchants: { M1: [{ objectId: 'PAYMENT:UNKNOWN', type: 'UPDATE', ts: 1 }] } },
    );

    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: WebhookEventStatus.PROCESSED }),
      }),
    );
  });
});
