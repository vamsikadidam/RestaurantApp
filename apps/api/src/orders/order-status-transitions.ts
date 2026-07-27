import { OrderStatus } from '@prisma/client';

/**
 * Manual transitions a restaurant admin/employee can trigger from the
 * order dashboard (Phase 6). Payment- and refund-driven transitions
 * (PENDING_PAYMENT -> PAYMENT_PROCESSING -> PAID/PAYMENT_FAILED,
 * PAID -> SUBMITTED_TO_RESTAURANT, *_REFUND*) are applied by
 * PaymentsService/RefundsService/CloverWebhooksService, not this map, since
 * only the system can know a charge or refund actually succeeded.
 */
export const STAFF_ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CART]: [],
  [OrderStatus.PENDING_PAYMENT]: [],
  [OrderStatus.PAYMENT_PROCESSING]: [],
  [OrderStatus.PAYMENT_FAILED]: [],
  [OrderStatus.PAID]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED],
  [OrderStatus.SUBMITTED_TO_RESTAURANT]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUND_PENDING]: [],
  [OrderStatus.PARTIALLY_REFUNDED]: [],
  [OrderStatus.REFUNDED]: [],
};

export function isValidStaffTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STAFF_ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.COMPLETED,
  OrderStatus.REJECTED,
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
]);

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}
