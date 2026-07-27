import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cart, CartStatus, FulfillmentType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { priceCart } from './cart-pricing.util';
import { PricedLineItem } from './interfaces/cart-pricing.interface';

const CART_ITEM_INCLUDE = {
  items: {
    include: { modifiers: true },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof CART_ITEM_INCLUDE }>;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  async getOrCreateActiveCart(userId: string, dto: CreateCartDto) {
    const location = await this.prisma.restaurantLocation.findFirst({
      where: { id: dto.restaurantLocationId, deletedAt: null, isActive: true },
    });
    if (!location) {
      throw new NotFoundException('Restaurant location not found');
    }

    let cart = await this.prisma.cart.findFirst({
      where: { userId, restaurantLocationId: dto.restaurantLocationId, status: CartStatus.ACTIVE },
      include: CART_ITEM_INCLUDE,
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
          restaurantLocationId: dto.restaurantLocationId,
          fulfillmentType: dto.fulfillmentType,
        },
        include: CART_ITEM_INCLUDE,
      });
    } else if (dto.fulfillmentType && cart.fulfillmentType !== dto.fulfillmentType) {
      cart = await this.prisma.cart.update({
        where: { id: cart.id },
        data: { fulfillmentType: dto.fulfillmentType },
        include: CART_ITEM_INCLUDE,
      });
    }

    return this.buildPricedCart(cart);
  }

  async getCart(cartId: string, userId: string) {
    const cart = await this.loadOwnedCart(cartId, userId);
    return this.buildPricedCart(cart);
  }

  async updateCart(cartId: string, userId: string, dto: UpdateCartDto) {
    const cart = await this.loadOwnedCart(cartId, userId);

    if (dto.fulfillmentType) {
      const restaurantId = await this.locationRestaurantId(cart.restaurantLocationId);
      await this.restaurantsService.validateFulfillmentAvailable(
        restaurantId,
        dto.fulfillmentType,
        cart.restaurantLocationId,
      );
    }

    if (dto.deliveryAddressId) {
      const address = await this.prisma.customerAddress.findFirst({
        where: { id: dto.deliveryAddressId, userId, deletedAt: null },
      });
      if (!address) {
        throw new NotFoundException('Delivery address not found');
      }
    }

    let promoValidation: { promotionId: string | null } = { promotionId: null };
    if (dto.promoCode !== undefined) {
      promoValidation = await this.validatePromoCode(cart, dto.promoCode);
    }

    const updated = await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        fulfillmentType: dto.fulfillmentType ?? undefined,
        deliveryAddressId: dto.deliveryAddressId ?? undefined,
        promoCode: dto.promoCode === undefined ? undefined : dto.promoCode,
      },
      include: CART_ITEM_INCLUDE,
    });

    return this.buildPricedCart(updated, promoValidation.promotionId ?? undefined);
  }

  async addItem(cartId: string, userId: string, dto: AddCartItemDto) {
    const cart = await this.loadOwnedCart(cartId, userId);

    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: dto.menuItemId, deletedAt: null },
      include: {
        modifierGroups: { include: { modifierGroup: { include: { options: true } } } },
      },
    });

    if (!menuItem || !menuItem.isActive) {
      throw new NotFoundException('Menu item not found');
    }
    if (menuItem.restaurantId !== (await this.locationRestaurantId(cart.restaurantLocationId))) {
      throw new BadRequestException('This item does not belong to this restaurant');
    }
    if (!menuItem.isAvailable || menuItem.isSoldOutOverride) {
      throw new BadRequestException(`${menuItem.name} is currently unavailable`);
    }

    const validatedModifiers = this.validateModifierSelections(menuItem, dto.modifiers);

    await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        menuItemId: menuItem.id,
        quantity: dto.quantity,
        specialInstructions: dto.specialInstructions,
        unitPriceCentsSnapshot: menuItem.priceCents,
        modifiers: {
          create: validatedModifiers.map((m) => ({ modifierOptionId: m.id, quantity: m.quantity })),
        },
      },
    });

    const refreshed = await this.loadOwnedCart(cartId, userId);
    return this.buildPricedCart(refreshed);
  }

  async updateItem(cartId: string, userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.loadOwnedCart(cartId, userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity ?? undefined,
        specialInstructions:
          dto.specialInstructions === undefined ? undefined : dto.specialInstructions,
      },
    });

    const refreshed = await this.loadOwnedCart(cartId, userId);
    return this.buildPricedCart(refreshed);
  }

  async removeItem(cartId: string, userId: string, itemId: string) {
    const cart = await this.loadOwnedCart(cartId, userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    const refreshed = await this.loadOwnedCart(cartId, userId);
    return this.buildPricedCart(refreshed);
  }

  async clearItems(cartId: string, userId: string) {
    const cart = await this.loadOwnedCart(cartId, userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    const refreshed = await this.loadOwnedCart(cartId, userId);
    return this.buildPricedCart(refreshed);
  }

  /** Used by OrdersService to load + fully revalidate a cart right before checkout. */
  async loadOwnedCart(cartId: string, userId: string): Promise<CartWithItems> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: CART_ITEM_INCLUDE,
    });

    if (!cart || cart.status !== CartStatus.ACTIVE) {
      throw new NotFoundException('Cart not found');
    }
    if (cart.userId !== userId) {
      throw new ForbiddenException('This cart does not belong to you');
    }

    return cart;
  }

  async validatePromoCode(cart: CartWithItems, code: string | null) {
    if (!code) {
      return { promotionId: null };
    }

    const restaurantId = await this.locationRestaurantId(cart.restaurantLocationId);
    const promotion = await this.prisma.promotion.findFirst({
      where: { restaurantId, code, isActive: true, deletedAt: null },
    });

    if (!promotion) {
      throw new NotFoundException('This promo code is invalid or has expired');
    }

    const now = new Date();
    if (promotion.startsAt && promotion.startsAt > now) {
      throw new BadRequestException('This promo code is not active yet');
    }
    if (promotion.endsAt && promotion.endsAt < now) {
      throw new BadRequestException('This promo code has expired');
    }

    if (promotion.maxRedemptionsPerUser) {
      const redemptions = await this.prisma.promotionRedemption.count({
        where: { promotionId: promotion.id, userId: cart.userId ?? undefined },
      });
      if (redemptions >= promotion.maxRedemptionsPerUser) {
        throw new BadRequestException('You have already used this promo code');
      }
    }

    if (promotion.maxRedemptionsTotal) {
      const totalRedemptions = await this.prisma.promotionRedemption.count({
        where: { promotionId: promotion.id },
      });
      if (totalRedemptions >= promotion.maxRedemptionsTotal) {
        throw new BadRequestException('This promo code has reached its redemption limit');
      }
    }

    return { promotionId: promotion.id };
  }

  /**
   * Strict variant of buildPricedCart used right before order creation:
   * throws instead of warning if anything is unavailable, out of stock, or
   * below the location's order minimum, and returns the exact snapshot data
   * OrdersService needs to freeze into Order/OrderItem/OrderItemModifier
   * rows. This is the "backend revalidation" step - the client's cart view
   * is only ever a preview, never the source of truth for what gets charged.
   */
  async revalidateForCheckout(cart: CartWithItems, tipCents = 0) {
    if (cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }
    if (!cart.fulfillmentType) {
      throw new BadRequestException('Please choose pickup or delivery before checking out');
    }
    if (cart.fulfillmentType === FulfillmentType.DELIVERY && !cart.deliveryAddressId) {
      throw new BadRequestException('Please choose a delivery address before checking out');
    }

    const restaurantId = await this.locationRestaurantId(cart.restaurantLocationId);
    await this.restaurantsService.validateFulfillmentAvailable(
      restaurantId,
      cart.fulfillmentType,
      cart.restaurantLocationId,
    );

    const location = await this.prisma.restaurantLocation.findUniqueOrThrow({
      where: { id: cart.restaurantLocationId },
    });
    const currency = await this.currencyForRestaurant(restaurantId);

    const menuItemIds = [...new Set(cart.items.map((i) => i.menuItemId))];
    const modifierOptionIds = [
      ...new Set(cart.items.flatMap((i) => i.modifiers.map((m) => m.modifierOptionId))),
    ];
    const [menuItems, modifierOptions] = await Promise.all([
      this.prisma.menuItem.findMany({ where: { id: { in: menuItemIds } } }),
      this.prisma.modifierOption.findMany({ where: { id: { in: modifierOptionIds } } }),
    ]);
    const menuItemsById = new Map(menuItems.map((m) => [m.id, m]));
    const modifierOptionsById = new Map(modifierOptions.map((m) => [m.id, m]));

    const snapshotItems = cart.items.map((cartItem) => {
      const menuItem = menuItemsById.get(cartItem.menuItemId);
      if (!menuItem || !menuItem.isActive || !menuItem.isAvailable || menuItem.isSoldOutOverride) {
        throw new BadRequestException(
          `${menuItem?.name ?? 'An item'} in your cart is no longer available. Please remove it and try again.`,
        );
      }

      const modifiers = cartItem.modifiers.map((modifier) => {
        const option = modifierOptionsById.get(modifier.modifierOptionId);
        if (!option || !option.isAvailable) {
          throw new BadRequestException(
            `A modifier on ${menuItem.name} is no longer available. Please update this item and try again.`,
          );
        }
        return {
          modifierOptionId: option.id,
          name: option.name,
          unitPriceCents: option.priceCents,
          quantity: modifier.quantity,
        };
      });

      return {
        cartItemId: cartItem.id,
        menuItemId: menuItem.id,
        skuSnapshot: menuItem.sku,
        nameSnapshot: menuItem.name,
        unitPriceCents: menuItem.priceCents,
        quantity: cartItem.quantity,
        taxRateBasisPoints: menuItem.taxRateBasisPoints,
        specialInstructions: cartItem.specialInstructions,
        modifiers,
        cloverItemId: menuItem.cloverItemId,
      };
    });

    const promoValidation = await this.validatePromoCode(cart, cart.promoCode);
    let discount: {
      percentageBasisPoints?: number | null;
      fixedAmountCents?: number | null;
    } | null = null;
    let promotion: { id: string } | null = null;
    if (promoValidation.promotionId) {
      const found = await this.prisma.promotion.findUnique({
        where: { id: promoValidation.promotionId },
      });
      if (found) {
        promotion = { id: found.id };
        discount = {
          percentageBasisPoints: found.percentageBasisPoints,
          fixedAmountCents: found.fixedAmountCents,
        };
      }
    }

    const pricing = priceCart({
      items: snapshotItems.map((i) => ({
        unitPriceCents: i.unitPriceCents,
        quantity: i.quantity,
        taxRateBasisPoints: i.taxRateBasisPoints,
        modifiers: i.modifiers.map((m) => ({ priceCents: m.unitPriceCents, quantity: m.quantity })),
      })),
      fulfillmentType: cart.fulfillmentType,
      deliveryFeeCents: location.deliveryFeeCents,
      serviceFeeCents: location.serviceFeeCents,
      serviceFeeBasisPoints: location.serviceFeeBasisPoints,
      discount,
      tipCents,
      currency,
    });

    if (
      cart.fulfillmentType === FulfillmentType.DELIVERY &&
      pricing.subtotalCents < location.minimumOrderAmountCents
    ) {
      throw new BadRequestException(
        `This restaurant requires a minimum order of $${(location.minimumOrderAmountCents / 100).toFixed(2)} for delivery`,
      );
    }

    return { snapshotItems, pricing, location, promotion, currency };
  }

  /**
   * Rebuilds the cart's price breakdown from *live* menu data. Also flags
   * (rather than silently dropping) items that became unavailable or whose
   * price changed since they were added, so the client can surface a clear
   * "this item changed" message before checkout.
   */
  async buildPricedCart(cart: CartWithItems, knownPromotionId?: string) {
    const location = await this.prisma.restaurantLocation.findUniqueOrThrow({
      where: { id: cart.restaurantLocationId },
    });

    const menuItemIds = [...new Set(cart.items.map((i) => i.menuItemId))];
    const modifierOptionIds = [
      ...new Set(cart.items.flatMap((i) => i.modifiers.map((m) => m.modifierOptionId))),
    ];

    const [menuItems, modifierOptions] = await Promise.all([
      this.prisma.menuItem.findMany({ where: { id: { in: menuItemIds } } }),
      this.prisma.modifierOption.findMany({ where: { id: { in: modifierOptionIds } } }),
    ]);
    const menuItemsById = new Map(menuItems.map((m) => [m.id, m]));
    const modifierOptionsById = new Map(modifierOptions.map((m) => [m.id, m]));

    const warnings: string[] = [];
    const lineItems: PricedLineItem[] = [];
    const responseItems = cart.items.map((cartItem) => {
      const liveMenuItem = menuItemsById.get(cartItem.menuItemId);
      const isAvailable = Boolean(
        liveMenuItem?.isActive && liveMenuItem?.isAvailable && !liveMenuItem?.isSoldOutOverride,
      );
      if (!isAvailable) {
        warnings.push(`${liveMenuItem?.name ?? 'An item'} in your cart is no longer available.`);
      }

      const liveUnitPriceCents = liveMenuItem?.priceCents ?? cartItem.unitPriceCentsSnapshot;
      const priceChanged = liveUnitPriceCents !== cartItem.unitPriceCentsSnapshot;
      if (priceChanged && liveMenuItem) {
        warnings.push(`The price of ${liveMenuItem.name} has changed.`);
      }

      const modifiers = cartItem.modifiers.map((modifier) => {
        const option = modifierOptionsById.get(modifier.modifierOptionId);
        return {
          modifierOptionId: modifier.modifierOptionId,
          name: option?.name ?? 'Modifier',
          priceCents: option?.priceCents ?? 0,
          quantity: modifier.quantity,
        };
      });

      if (isAvailable) {
        lineItems.push({
          unitPriceCents: liveUnitPriceCents,
          quantity: cartItem.quantity,
          taxRateBasisPoints: liveMenuItem?.taxRateBasisPoints ?? 0,
          modifiers: modifiers.map((m) => ({ priceCents: m.priceCents, quantity: m.quantity })),
        });
      }

      return {
        id: cartItem.id,
        menuItemId: cartItem.menuItemId,
        name: liveMenuItem?.name ?? 'Item',
        imageUrl: liveMenuItem?.imageUrl ?? liveMenuItem?.cloverImageUrl ?? null,
        quantity: cartItem.quantity,
        unitPriceCents: liveUnitPriceCents,
        specialInstructions: cartItem.specialInstructions,
        isAvailable,
        priceChanged,
        modifiers,
      };
    });

    let discount: {
      percentageBasisPoints?: number | null;
      fixedAmountCents?: number | null;
    } | null = null;
    if (cart.promoCode || knownPromotionId) {
      try {
        const validation = knownPromotionId
          ? { promotionId: knownPromotionId }
          : await this.validatePromoCode(cart, cart.promoCode);
        if (validation.promotionId) {
          const promotion = await this.prisma.promotion.findUnique({
            where: { id: validation.promotionId },
          });
          if (promotion) {
            discount = {
              percentageBasisPoints: promotion.percentageBasisPoints,
              fixedAmountCents: promotion.fixedAmountCents,
            };
          }
        }
      } catch (error) {
        warnings.push(
          error instanceof Error ? error.message : 'Your promo code is no longer valid.',
        );
      }
    }

    const pricing = priceCart({
      items: lineItems,
      fulfillmentType: cart.fulfillmentType,
      deliveryFeeCents: location.deliveryFeeCents,
      serviceFeeCents: location.serviceFeeCents,
      serviceFeeBasisPoints: location.serviceFeeBasisPoints,
      discount,
      tipCents: 0,
      currency: location.restaurantId
        ? await this.currencyForRestaurant(location.restaurantId)
        : 'USD',
    });

    const meetsMinimum =
      cart.fulfillmentType !== FulfillmentType.DELIVERY ||
      pricing.subtotalCents >= location.minimumOrderAmountCents;
    if (!meetsMinimum) {
      warnings.push(
        `This restaurant requires a minimum order of ${(location.minimumOrderAmountCents / 100).toFixed(2)} for delivery.`,
      );
    }

    return {
      id: cart.id,
      restaurantLocationId: cart.restaurantLocationId,
      fulfillmentType: cart.fulfillmentType,
      deliveryAddressId: cart.deliveryAddressId,
      promoCode: cart.promoCode,
      status: cart.status,
      items: responseItems,
      pricing,
      warnings,
      meetsMinimumOrder: meetsMinimum,
      tipPresetsBasisPoints: location.tipPresetsBasisPoints,
    };
  }

  private validateModifierSelections(
    menuItem: Prisma.MenuItemGetPayload<{
      include: { modifierGroups: { include: { modifierGroup: { include: { options: true } } } } };
    }>,
    selections: { modifierOptionId: string; quantity: number }[],
  ) {
    const validOptionsByGroup = new Map(
      menuItem.modifierGroups.map((link) => [link.modifierGroup.id, link.modifierGroup]),
    );
    const allOptionIds = new Map(
      menuItem.modifierGroups.flatMap((link) =>
        link.modifierGroup.options.map((o) => [o.id, o] as const),
      ),
    );

    const selectionsByGroup = new Map<string, { modifierOptionId: string; quantity: number }[]>();
    for (const selection of selections) {
      const option = allOptionIds.get(selection.modifierOptionId);
      if (!option || !option.isAvailable) {
        throw new BadRequestException(
          'One or more selected options is not available for this item',
        );
      }
      if (selection.quantity > option.maxQuantity) {
        throw new BadRequestException(
          `You can select "${option.name}" at most ${option.maxQuantity} time(s)`,
        );
      }
      const group = [...validOptionsByGroup.values()].find((g) =>
        g.options.some((o) => o.id === option.id),
      );
      if (!group) {
        throw new BadRequestException('Invalid modifier selection');
      }
      const list = selectionsByGroup.get(group.id) ?? [];
      list.push(selection);
      selectionsByGroup.set(group.id, list);
    }

    for (const group of validOptionsByGroup.values()) {
      const selectedCount = (selectionsByGroup.get(group.id) ?? []).reduce(
        (s, x) => s + x.quantity,
        0,
      );
      if (group.isRequired && selectedCount < Math.max(group.minSelect, 1)) {
        throw new BadRequestException(`Please make a selection for "${group.name}"`);
      }
      if (selectedCount < group.minSelect) {
        throw new BadRequestException(
          `Please select at least ${group.minSelect} option(s) for "${group.name}"`,
        );
      }
      if (group.maxSelect !== null && selectedCount > group.maxSelect) {
        throw new BadRequestException(
          `You can select at most ${group.maxSelect} option(s) for "${group.name}"`,
        );
      }
    }

    return selections.map((s) => ({ id: s.modifierOptionId, quantity: s.quantity }));
  }

  private async locationRestaurantId(restaurantLocationId: string): Promise<string> {
    const location = await this.prisma.restaurantLocation.findUniqueOrThrow({
      where: { id: restaurantLocationId },
      select: { restaurantId: true },
    });
    return location.restaurantId;
  }

  private async currencyForRestaurant(restaurantId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { currency: true },
    });
    return restaurant?.currency ?? 'USD';
  }
}

export type { CartWithItems, Cart };
