import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartStatus, FulfillmentType } from '@prisma/client';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;
  let prisma: any;
  let restaurantsService: any;

  const location = {
    id: 'loc-1',
    restaurantId: 'rest-1',
    deletedAt: null,
    isActive: true,
    deliveryFeeCents: 300,
    serviceFeeCents: 0,
    serviceFeeBasisPoints: 0,
    minimumOrderAmountCents: 0,
    tipPresetsBasisPoints: [1000, 1500, 2000],
  };

  const menuItem = {
    id: 'item-1',
    restaurantId: 'rest-1',
    name: 'Cheeseburger',
    priceCents: 999,
    taxRateBasisPoints: 0,
    isActive: true,
    isAvailable: true,
    isSoldOutOverride: false,
    imageUrl: null,
    cloverImageUrl: null,
    sku: null,
    cloverItemId: null,
    modifierGroups: [
      {
        modifierGroup: {
          id: 'group-1',
          name: 'Size',
          minSelect: 1,
          maxSelect: 1,
          isRequired: true,
          options: [
            { id: 'opt-1', name: 'Small', priceCents: 0, maxQuantity: 1, isAvailable: true },
            { id: 'opt-2', name: 'Large', priceCents: 200, maxQuantity: 1, isAvailable: true },
          ],
        },
      },
    ],
  };

  beforeEach(() => {
    prisma = {
      restaurantLocation: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
      cart: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      cartItem: { create: jest.fn(), update: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
      menuItem: { findFirst: jest.fn(), findMany: jest.fn() },
      modifierOption: { findMany: jest.fn() },
      restaurant: { findUnique: jest.fn() },
      customerAddress: { findFirst: jest.fn() },
      promotion: { findFirst: jest.fn(), findUnique: jest.fn() },
      promotionRedemption: { count: jest.fn() },
    };

    restaurantsService = { validateFulfillmentAvailable: jest.fn() };

    prisma.restaurantLocation.findUniqueOrThrow.mockResolvedValue(location);
    prisma.restaurant.findUnique.mockResolvedValue({ currency: 'USD' });
    prisma.menuItem.findMany.mockResolvedValue([]);
    prisma.modifierOption.findMany.mockResolvedValue([]);

    service = new CartService(prisma, restaurantsService);
  });

  describe('getOrCreateActiveCart', () => {
    it('creates a new cart when none exists for the user + location', async () => {
      prisma.restaurantLocation.findFirst.mockResolvedValue(location);
      prisma.cart.findFirst.mockResolvedValue(null);
      prisma.cart.create.mockResolvedValue({
        id: 'cart-1',
        items: [],
        promoCode: null,
        fulfillmentType: FulfillmentType.PICKUP,
        restaurantLocationId: 'loc-1',
        deliveryAddressId: null,
        status: CartStatus.ACTIVE,
      });

      const result = await service.getOrCreateActiveCart('user-1', {
        restaurantLocationId: 'loc-1',
        fulfillmentType: FulfillmentType.PICKUP,
      });

      expect(prisma.cart.create).toHaveBeenCalled();
      expect(result.id).toBe('cart-1');
    });

    it('reuses an existing active cart instead of creating a duplicate', async () => {
      const existing = {
        id: 'cart-existing',
        items: [],
        promoCode: null,
        fulfillmentType: FulfillmentType.PICKUP,
        restaurantLocationId: 'loc-1',
        deliveryAddressId: null,
        status: CartStatus.ACTIVE,
      };
      prisma.restaurantLocation.findFirst.mockResolvedValue(location);
      prisma.cart.findFirst.mockResolvedValue(existing);

      const result = await service.getOrCreateActiveCart('user-1', {
        restaurantLocationId: 'loc-1',
      });

      expect(prisma.cart.create).not.toHaveBeenCalled();
      expect(result.id).toBe('cart-existing');
    });

    it('throws when the restaurant location does not exist', async () => {
      prisma.restaurantLocation.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrCreateActiveCart('user-1', { restaurantLocationId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addItem', () => {
    const cart = {
      id: 'cart-1',
      userId: 'user-1',
      status: CartStatus.ACTIVE,
      restaurantLocationId: 'loc-1',
      items: [],
      promoCode: null,
      fulfillmentType: null,
      deliveryAddressId: null,
    };

    it('rejects adding an item when a required modifier group has no selection', async () => {
      prisma.cart.findUnique = jest.fn().mockResolvedValue(cart);
      prisma.menuItem.findFirst.mockResolvedValue(menuItem);

      await expect(
        service.addItem('cart-1', 'user-1', {
          menuItemId: 'item-1',
          quantity: 1,
          modifiers: [],
          specialInstructions: undefined,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('adds the item with a valid modifier selection and snapshots the current price', async () => {
      prisma.cart.findUnique = jest.fn().mockResolvedValue(cart);
      prisma.menuItem.findFirst.mockResolvedValue(menuItem);
      prisma.menuItem.findMany.mockResolvedValue([menuItem]);
      prisma.modifierOption.findMany.mockResolvedValue(
        menuItem.modifierGroups[0].modifierGroup.options,
      );
      prisma.cartItem.create.mockResolvedValue({ id: 'cart-item-1' });

      await service.addItem('cart-1', 'user-1', {
        menuItemId: 'item-1',
        quantity: 1,
        modifiers: [{ modifierOptionId: 'opt-2', quantity: 1 }],
        specialInstructions: undefined,
      });

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cartId: 'cart-1',
            menuItemId: 'item-1',
            unitPriceCentsSnapshot: 999,
            modifiers: { create: [{ modifierOptionId: 'opt-2', quantity: 1 }] },
          }),
        }),
      );
    });

    it('rejects adding an item that belongs to a different restaurant', async () => {
      prisma.cart.findUnique = jest.fn().mockResolvedValue(cart);
      prisma.menuItem.findFirst.mockResolvedValue({
        ...menuItem,
        restaurantId: 'other-restaurant',
      });

      await expect(
        service.addItem('cart-1', 'user-1', {
          menuItemId: 'item-1',
          quantity: 1,
          modifiers: [],
          specialInstructions: undefined,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
