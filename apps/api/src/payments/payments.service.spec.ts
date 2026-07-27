import { BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentProviderMode, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let redis: any;
  let configService: any;
  let ordersService: any;
  let cloverOAuthService: any;
  let providerResolver: any;
  let cloverApiClient: any;
  let provider: any;

  const order = {
    id: 'order-1',
    userId: 'user-1',
    restaurantLocationId: 'loc-1',
    status: OrderStatus.PENDING_PAYMENT,
    totalCents: 1500,
    currency: 'USD',
  };
  const user = { userId: 'user-1', isGuest: false, roles: [] };

  beforeEach(() => {
    prisma = {
      payment: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      order: { findUnique: jest.fn().mockResolvedValue(order) },
    };
    redis = { get: jest.fn(), set: jest.fn() };
    configService = { get: jest.fn().mockReturnValue('https://token-sandbox.dev.clover.com') };
    ordersService = {
      applyStatusTransition: jest.fn(async (o: any, status: OrderStatus) => ({ ...o, status })),
    };
    cloverOAuthService = {
      getValidAccessToken: jest.fn().mockResolvedValue({ accessToken: 'tok', merchantId: 'M1' }),
    };
    cloverApiClient = { getEcommerceApiAccessKey: jest.fn().mockResolvedValue('KEY123') };

    provider = { charge: jest.fn(), refund: jest.fn() };
    providerResolver = { resolve: jest.fn().mockReturnValue(provider) };

    service = new PaymentsService(
      prisma,
      redis,
      configService,
      ordersService,
      cloverOAuthService,
      providerResolver,
      cloverApiClient,
    );
  });

  describe('charge', () => {
    const dto = {
      orderId: 'order-1',
      provider: PaymentProviderMode.CLOVER_ECOMMERCE,
      sourceToken: 'clv_test',
      idempotencyKey: 'idem-1',
    };

    it('short-circuits and returns the existing payment when the idempotency key was already used', async () => {
      const existingPayment = { id: 'pay-1', orderId: 'order-1' };
      prisma.payment.findUnique.mockResolvedValue(existingPayment);

      const result = await service.charge(user as any, dto);

      expect(result.payment).toBe(existingPayment);
      expect(provider.charge).not.toHaveBeenCalled();
    });

    it('marks the payment SUCCEEDED and moves the order to PAID then SUBMITTED_TO_RESTAURANT on success', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue({ id: 'pay-1', orderId: 'order-1' });
      prisma.payment.update.mockImplementation((args: any) =>
        Promise.resolve({ id: 'pay-1', ...args.data }),
      );
      provider.charge.mockResolvedValue({ providerPaymentId: 'ch_1', status: 'succeeded' });

      const result = await service.charge(user as any, dto);

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PaymentStatus.SUCCEEDED }),
        }),
      );
      expect(ordersService.applyStatusTransition).toHaveBeenCalledWith(
        expect.anything(),
        OrderStatus.PAYMENT_PROCESSING,
        expect.anything(),
      );
      expect(result.order!.status).toBe(OrderStatus.SUBMITTED_TO_RESTAURANT);
    });

    it('marks the payment FAILED and moves the order to PAYMENT_FAILED when the card is declined', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue({ id: 'pay-1', orderId: 'order-1' });
      prisma.payment.update.mockImplementation((args: any) =>
        Promise.resolve({ id: 'pay-1', ...args.data }),
      );
      provider.charge.mockResolvedValue({
        providerPaymentId: 'ch_2',
        status: 'failed',
        failureReason: 'Card declined',
      });

      const result = await service.charge(user as any, dto);

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PaymentStatus.FAILED,
            failureReason: 'Card declined',
          }),
        }),
      );
      expect(result.order!.status).toBe(OrderStatus.PAYMENT_FAILED);
    });

    it('rejects charging an order that is not awaiting payment', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.order.findUnique.mockResolvedValue({ ...order, status: OrderStatus.PAID });

      await expect(service.charge(user as any, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTokenizationConfig', () => {
    it('fetches and caches the PAKMS key when not already cached', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getTokenizationConfig('order-1', user as any);

      expect(cloverApiClient.getEcommerceApiAccessKey).toHaveBeenCalledWith('M1', 'tok');
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('loc-1'),
        'KEY123',
        expect.any(Number),
      );
      expect(result.apiAccessKey).toBe('KEY123');
    });

    it('reuses the cached key without calling PAKMS again', async () => {
      redis.get.mockResolvedValue('CACHED_KEY');

      const result = await service.getTokenizationConfig('order-1', user as any);

      expect(cloverApiClient.getEcommerceApiAccessKey).not.toHaveBeenCalled();
      expect(result.apiAccessKey).toBe('CACHED_KEY');
    });
  });
});
