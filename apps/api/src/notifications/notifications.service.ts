import { Inject, Injectable, Logger } from '@nestjs/common';
import { DevicePlatform, NotificationChannel, Order, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PUSH_SENDER, PushSender } from './push-sender.interface';
import { ORDER_STATUS_NOTIFICATION_COPY } from './order-status-messages';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
  ) {}

  async registerDeviceToken(userId: string, token: string, platform: DevicePlatform) {
    return this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, isActive: true, lastUsedAt: new Date() },
    });
  }

  async unregisterDeviceToken(token: string) {
    await this.prisma.deviceToken.updateMany({
      where: { token },
      data: { isActive: false },
    });
  }

  async listForUser(userId: string, take = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async markRead(notificationId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /** Fires on every order status transition; a no-op (besides logging) for
   * statuses without customer-facing copy (e.g. internal PENDING_PAYMENT). */
  async notifyOrderStatusChange(
    order: Pick<Order, 'id' | 'userId' | 'publicOrderNumber'>,
    newStatus: OrderStatus,
  ) {
    const copy = ORDER_STATUS_NOTIFICATION_COPY[newStatus];
    if (!copy || !order.userId) {
      return;
    }

    await this.create({
      userId: order.userId,
      orderId: order.id,
      type: `order_status:${newStatus}`,
      title: copy.title,
      body: `Order #${order.publicOrderNumber}: ${copy.body}`,
      data: { orderId: order.id, status: newStatus },
    });
  }

  async create(input: {
    userId: string;
    orderId?: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        orderId: input.orderId,
        title: input.title,
        body: input.body,
        type: input.type,
        channel: NotificationChannel.PUSH,
        data: input.data,
      },
    });

    try {
      const deviceTokens = await this.prisma.deviceToken.findMany({
        where: { userId: input.userId, isActive: true },
        select: { token: true },
      });

      await this.pushSender.send({
        deviceTokens: deviceTokens.map((d) => d.token),
        title: input.title,
        body: input.body,
        data: input.data,
      });

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date() },
      });
    } catch (error) {
      this.logger.error(
        `Failed to deliver push notification ${notification.id}: ${(error as Error).message}`,
      );
    }

    return notification;
  }
}
