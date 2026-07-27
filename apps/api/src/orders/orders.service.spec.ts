import { ForbiddenException } from '@nestjs/common';
import { FulfillmentType, OrderStatus, OrderStatusSource } from '@prisma/client';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;
  let cartService: any;
  let cloverOAuthService: any;
  let cloverApiClient: any;
  let notificationsService: any;

  const baseOrder = {
    id: 'order-1',
    userId: 'user-1',
    restaurantId: 'rest-1',
    restaurantLocationId: 'loc-1',
    publicOrderNumber: 'ORD-240101-ABC123',
    status: OrderStatus.PENDING_PAYMENT,
    items: [],
    statusHistory: [],
    payments: [],
    refunds: [],
  };

  beforeEach(() => {
    prisma = {
      order: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), findMany: jest.fn() },
      customerAddress: { findUnique: jest.fn() },
      promotionRedemption: { create: jest.fn() },
      cart: { update: jest.fn() },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };

    cartService = {
      loadOwnedCart: jest.fn(),
      revalidateForCheckout: jest.fn(),
    };

    cloverOAuthService = { getValidAccessToken: jest.fn() };
    cloverApiClient = { createOrder: jest.fn() };
    notificationsService = { notifyOrderStatusChange: jest.fn().mockResolvedValue(undefined) };

    service = new OrdersService(
      prisma,
      cartService,
      cloverOAuthService,
      cloverApiClient,
      notificationsService,
    );
  });

  describe('checkout', () => {
    it('returns the existing order without touching the cart when the idempotency key was already used', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder);

      const result = await service.checkout('user-1', {
        cartId: 'cart-1',
        idempotencyKey: 'key-1',
      });

      expect(result).toBe(baseOrder);
      expect(cartService.loadOwnedCart).not.toHaveBeenCalled();
    });

    it('rejects reusing an idempotency key that belongs to a different user', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...baseOrder, userId: 'someone-else' });

      await expect(
        service.checkout('user-1', { cartId: 'cart-1', idempotencyKey: 'key-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates a new order from a revalidated cart and marks the cart CONVERTED', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      cartService.loadOwnedCart.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
        fulfillmentType: FulfillmentType.PICKUP,
        deliveryAddressId: null,
        promoCode: null,
      });
      cartService.revalidateForCheckout.mockResolvedValue({
        snapshotItems: [
          {
            menuItemId: 'item-1',
            nameSnapshot: 'Cheeseburger',
            skuSnapshot: 'SKU-1',
            unitPriceCents: 1000,
            quantity: 2,
            taxRateBasisPoints: 0,
            specialInstructions: undefined,
            modifiers: [],
            cloverItemId: null,
          },
        ],
        pricing: {
          subtotalCents: 2000,
          taxCents: 0,
          serviceFeeCents: 0,
          deliveryFeeCents: 0,
          discountCents: 0,
          tipCents: 0,
          totalCents: 2000,
          currency: 'USD',
        },
        location: {
          id: 'loc-1',
          restaurantId: 'rest-1',
          deliveryFeeCents: 0,
          serviceFeeCents: 0,
          serviceFeeBasisPoints: 0,
          minimumOrderAmountCents: 0,
        },
        promotion: null,
        currency: 'USD',
      });

      prisma.order.create.mockImplementation((args: any) =>
        Promise.resolve({ ...baseOrder, ...args.data }),
      );
      cloverOAuthService.getValidAccessToken.mockRejectedValue(new Error('not connected'));

      const result = await service.checkout('user-1', {
        cartId: 'cart-1',
        idempotencyKey: 'key-2',
      });

      expect(prisma.order.create).toHaveBeenCalled();
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { status: 'CONVERTED' },
      });
      expect(result.totalCents).toBe(2000);
    });
  });

  describe('applyStatusTransition', () => {
    it('writes a status history entry and notifies the customer', async () => {
      const updatedOrder = { ...baseOrder, status: OrderStatus.PAID };
      prisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.applyStatusTransition(
        baseOrder as any,
        OrderStatus.PAID,
        OrderStatusSource.SYSTEM,
      );

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({
            status: OrderStatus.PAID,
            statusHistory: {
              create: expect.objectContaining({
                previousStatus: OrderStatus.PENDING_PAYMENT,
                newStatus: OrderStatus.PAID,
                source: OrderStatusSource.SYSTEM,
              }),
            },
          }),
        }),
      );
      expect(notificationsService.notifyOrderStatusChange).toHaveBeenCalledWith(
        updatedOrder,
        OrderStatus.PAID,
      );
      expect(result).toBe(updatedOrder);
    });
  });
});
