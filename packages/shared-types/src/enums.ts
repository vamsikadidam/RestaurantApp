/**
 * These enums must stay in sync with apps/api/prisma/schema.prisma.
 * They are duplicated here (rather than importing @prisma/client) so that
 * the Flutter app's OpenAPI-generated client and the admin-web app can share
 * a single source of truth without depending on Prisma internals.
 */

export enum UserRoleType {
  CUSTOMER = 'CUSTOMER',
  RESTAURANT_ADMIN = 'RESTAURANT_ADMIN',
  RESTAURANT_EMPLOYEE = 'RESTAURANT_EMPLOYEE',
}

export enum FulfillmentType {
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
}

export enum OrderStatus {
  CART = 'CART',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAID = 'PAID',
  SUBMITTED_TO_RESTAURANT = 'SUBMITTED_TO_RESTAURANT',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  REFUND_PENDING = 'REFUND_PENDING',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  REFUNDED = 'REFUNDED',
}

export enum OrderStatusSource {
  CUSTOMER = 'CUSTOMER',
  EMPLOYEE = 'EMPLOYEE',
  ADMINISTRATOR = 'ADMINISTRATOR',
  CLOVER = 'CLOVER',
  SYSTEM = 'SYSTEM',
}

export enum PaymentProviderMode {
  CLOVER_ECOMMERCE = 'CLOVER_ECOMMERCE',
  CLOVER_TERMINAL = 'CLOVER_TERMINAL',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export enum PromotionType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}
