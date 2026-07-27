import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CartStatus,
  FulfillmentType,
  Order,
  OrderStatus,
  OrderStatusSource,
  Prisma,
  UserRoleType,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../common/types/authenticated-request';
import { CartService } from '../cart/cart.service';
import { CloverOAuthService } from '../clover/clover-oauth.service';
import {
  CLOVER_API_CLIENT,
  CloverApiClient,
} from '../clover/interfaces/clover-api-client.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { CheckoutDto } from './dto/checkout.dto';
import { isValidStaffTransition } from './order-status-transitions';

export const ORDER_INCLUDE = {
  items: { include: { modifiers: true }, orderBy: { createdAt: 'asc' as const } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  payments: { orderBy: { createdAt: 'asc' as const } },
  refunds: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly cloverOAuthService: CloverOAuthService,
    @Inject(CLOVER_API_CLIENT) private readonly cloverApiClient: CloverApiClient,
    private readonly notificationsService: NotificationsService,
  ) {}

  async checkout(userId: string, dto: CheckoutDto): Promise<OrderWithDetails> {
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: ORDER_INCLUDE,
    });
    if (existing) {
      if (existing.userId !== userId) {
        throw new ForbiddenException('This idempotency key was already used for a different order');
      }
      return existing;
    }

    const cart = await this.cartService.loadOwnedCart(dto.cartId, userId);
    const tipCents = Math.max(0, dto.tipCents ?? 0);
    const { snapshotItems, pricing, location, promotion, currency } =
      await this.cartService.revalidateForCheckout(cart, tipCents);

    let deliveryAddressSnapshot: Prisma.InputJsonValue | undefined;
    if (cart.fulfillmentType === FulfillmentType.DELIVERY && cart.deliveryAddressId) {
      const address = await this.prisma.customerAddress.findUnique({
        where: { id: cart.deliveryAddressId },
      });
      if (!address) {
        throw new BadRequestException('The selected delivery address no longer exists');
      }
      deliveryAddressSnapshot = {
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        deliveryInstructions: address.deliveryInstructions,
      };
    }

    const publicOrderNumber = this.generatePublicOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          publicOrderNumber,
          userId,
          restaurantId: location.restaurantId,
          restaurantLocationId: location.id,
          fulfillmentType: cart.fulfillmentType!,
          deliveryAddressId: cart.deliveryAddressId,
          deliveryAddressSnapshot,
          status: OrderStatus.PENDING_PAYMENT,
          subtotalCents: pricing.subtotalCents,
          taxCents: pricing.taxCents,
          serviceFeeCents: pricing.serviceFeeCents,
          deliveryFeeCents: pricing.deliveryFeeCents,
          discountCents: pricing.discountCents,
          tipCents: pricing.tipCents,
          totalCents: pricing.totalCents,
          currency,
          promotionId: promotion?.id,
          promoCode: cart.promoCode,
          specialInstructions: dto.specialInstructions,
          idempotencyKey: dto.idempotencyKey,
          items: {
            create: snapshotItems.map((item) => ({
              menuItemId: item.menuItemId,
              nameSnapshot: item.nameSnapshot,
              skuSnapshot: item.skuSnapshot,
              unitPriceCents: item.unitPriceCents,
              quantity: item.quantity,
              specialInstructions: item.specialInstructions,
              lineTotalCents:
                (item.unitPriceCents +
                  item.modifiers.reduce((s, m) => s + m.unitPriceCents * m.quantity, 0)) *
                item.quantity,
              modifiers: {
                create: item.modifiers.map((m) => ({
                  modifierOptionId: m.modifierOptionId,
                  nameSnapshot: m.name,
                  unitPriceCents: m.unitPriceCents,
                  quantity: m.quantity,
                })),
              },
            })),
          },
          statusHistory: {
            create: {
              previousStatus: null,
              newStatus: OrderStatus.PENDING_PAYMENT,
              source: OrderStatusSource.CUSTOMER,
              actorUserId: userId,
            },
          },
        },
        include: ORDER_INCLUDE,
      });

      if (promotion) {
        await tx.promotionRedemption.create({
          data: {
            promotionId: promotion.id,
            userId,
            orderId: created.id,
            discountAppliedCents: pricing.discountCents,
          },
        });
      }

      await tx.cart.update({ where: { id: cart.id }, data: { status: CartStatus.CONVERTED } });

      return created;
    });

    this.syncOrderToClover(order).catch((error) => {
      this.logger.warn(
        `Best-effort Clover order sync failed for order ${order.id}: ${error.message}`,
      );
    });

    return order;
  }

  async getOrder(orderId: string, user: RequestUser): Promise<OrderWithDetails> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.assertCanView(order, user);
    return order;
  }

  async listMyOrders(userId: string, take = 20, skip = 0) {
    return this.prisma.order.findMany({
      where: { userId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async listRestaurantOrders(
    restaurantId: string,
    filters: { restaurantLocationId?: string; status?: OrderStatus },
    take = 50,
    skip = 0,
  ) {
    return this.prisma.order.findMany({
      where: {
        restaurantId,
        restaurantLocationId: filters.restaurantLocationId,
        status: filters.status,
      },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    actor: RequestUser,
    reason?: string,
  ): Promise<OrderWithDetails> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isStaffForRestaurant = actor.roles.some(
      (r) =>
        (r.role === UserRoleType.RESTAURANT_ADMIN || r.role === UserRoleType.RESTAURANT_EMPLOYEE) &&
        (r.restaurantId === order.restaurantId ||
          r.restaurantLocationId === order.restaurantLocationId),
    );
    if (!isStaffForRestaurant) {
      throw new ForbiddenException('You do not have access to this order');
    }

    if (!isValidStaffTransition(order.status, newStatus)) {
      throw new BadRequestException(`Cannot move an order from ${order.status} to ${newStatus}`);
    }

    return this.applyStatusTransition(
      order,
      newStatus,
      OrderStatusSource.EMPLOYEE,
      actor.userId,
      reason,
    );
  }

  /** Shared by the staff endpoint above and by PaymentsService/webhooks - the
   * single place that writes OrderStatusHistory and fires notifications so
   * neither path can drift out of sync. */
  async applyStatusTransition(
    order: OrderWithDetails,
    newStatus: OrderStatus,
    source: OrderStatusSource,
    actorUserId?: string,
    reason?: string,
  ): Promise<OrderWithDetails> {
    const timestamps: {
      acceptedAt?: Date;
      rejectedAt?: Date;
      completedAt?: Date;
      cancelledAt?: Date;
      cancellationReason?: string;
    } = {};
    if (newStatus === OrderStatus.ACCEPTED) timestamps.acceptedAt = new Date();
    if (newStatus === OrderStatus.REJECTED) timestamps.rejectedAt = new Date();
    if (newStatus === OrderStatus.COMPLETED) timestamps.completedAt = new Date();
    if (newStatus === OrderStatus.CANCELLED) timestamps.cancelledAt = new Date();
    if (newStatus === OrderStatus.CANCELLED) timestamps.cancellationReason = reason;

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
        ...timestamps,
        statusHistory: {
          create: { previousStatus: order.status, newStatus, source, actorUserId, reason },
        },
      },
      include: ORDER_INCLUDE,
    });

    await this.notificationsService.notifyOrderStatusChange(updated, newStatus).catch((error) => {
      this.logger.error(`Failed to notify customer of order status change: ${error.message}`);
    });

    return updated;
  }

  private assertCanView(order: Order, user: RequestUser) {
    if (order.userId === user.userId) return;
    const isStaffForRestaurant = user.roles.some(
      (r) =>
        (r.restaurantId === order.restaurantId ||
          r.restaurantLocationId === order.restaurantLocationId) &&
        (r.role === UserRoleType.RESTAURANT_ADMIN || r.role === UserRoleType.RESTAURANT_EMPLOYEE),
    );
    if (!isStaffForRestaurant) {
      throw new ForbiddenException('You do not have access to this order');
    }
  }

  private async syncOrderToClover(order: OrderWithDetails): Promise<void> {
    try {
      const { accessToken, merchantId } = await this.cloverOAuthService.getValidAccessToken(
        order.restaurantLocationId,
      );

      const cloverOrder = await this.cloverApiClient.createOrder(merchantId, accessToken, {
        note: `Online order #${order.publicOrderNumber}`,
        lineItems: order.items.map((item) => ({
          name: item.nameSnapshot,
          priceCents: item.unitPriceCents,
          quantity: item.quantity,
        })),
      });

      await this.prisma.order.update({
        where: { id: order.id },
        data: { cloverOrderId: cloverOrder.id },
      });
    } catch (error) {
      // Not fatal: the restaurant location may simply not be connected to
      // Clover yet, or the connection may be temporarily down. The order is
      // still valid and payable; staff can still see it in this app's own
      // order dashboard (Phase 6) even without Clover sync.
      this.logger.warn(
        `Skipping Clover order sync for order ${order.id}: ${(error as Error).message}`,
      );
    }
  }

  private generatePublicOrderNumber(): string {
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${datePart}-${randomPart}`;
  }
}
