import { OrderStatus } from '@prisma/client';

/** Human-readable copy shown to the customer for each order status change.
 * Kept separate from NotificationsService so admin-web / other channels can
 * reuse the same copy without importing the whole notifications module. */
export const ORDER_STATUS_NOTIFICATION_COPY: Partial<
  Record<OrderStatus, { title: string; body: string }>
> = {
  [OrderStatus.PAID]: {
    title: 'Payment received',
    body: 'Your payment was successful and your order is being sent to the restaurant.',
  },
  [OrderStatus.SUBMITTED_TO_RESTAURANT]: {
    title: 'Order sent to the restaurant',
    body: 'The restaurant has received your order and will confirm it shortly.',
  },
  [OrderStatus.ACCEPTED]: {
    title: 'Order accepted',
    body: 'The restaurant has accepted your order and will start preparing it soon.',
  },
  [OrderStatus.PREPARING]: {
    title: 'Order in progress',
    body: 'The restaurant is preparing your order.',
  },
  [OrderStatus.READY_FOR_PICKUP]: {
    title: 'Ready for pickup',
    body: 'Your order is ready! Please head to the restaurant to pick it up.',
  },
  [OrderStatus.OUT_FOR_DELIVERY]: {
    title: 'Out for delivery',
    body: 'Your order is on its way to you.',
  },
  [OrderStatus.COMPLETED]: {
    title: 'Order complete',
    body: 'Thanks for your order! We hope you enjoyed it.',
  },
  [OrderStatus.REJECTED]: {
    title: 'Order could not be accepted',
    body: 'Unfortunately the restaurant was unable to accept your order. Any payment will be refunded.',
  },
  [OrderStatus.CANCELLED]: {
    title: 'Order cancelled',
    body: 'Your order has been cancelled.',
  },
  [OrderStatus.PAYMENT_FAILED]: {
    title: 'Payment failed',
    body: 'We were unable to process your payment. Please try again with a different card.',
  },
  [OrderStatus.REFUND_PENDING]: {
    title: 'Refund in progress',
    body: 'A refund for your order is being processed.',
  },
  [OrderStatus.PARTIALLY_REFUNDED]: {
    title: 'Partial refund issued',
    body: 'Part of your order total has been refunded.',
  },
  [OrderStatus.REFUNDED]: {
    title: 'Refund issued',
    body: 'Your order has been fully refunded.',
  },
};
