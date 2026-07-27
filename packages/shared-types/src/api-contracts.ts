import { FulfillmentType, OrderStatus, PaymentProviderMode, UserRoleType } from './enums';

/**
 * Lightweight shared response/request shapes. These are intentionally
 * minimal in Phase 1 - full DTOs (with validation decorators) live in the
 * NestJS app and get mirrored/expanded here as each endpoint in section 12
 * of the spec is implemented in later phases.
 */

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string }>;
  details?: Record<string, { status: string }>;
}

export interface RestaurantSummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  currency: string;
}

export interface MenuCategorySummary {
  id: string;
  name: string;
  displayOrder: number;
}

export interface MenuItemSummary {
  id: string;
  categoryId: string | null;
  name: string;
  description?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
}

export interface CartPriceBreakdown {
  subtotalCents: number;
  taxCents: number;
  serviceFeeCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  tipCents: number;
  totalCents: number;
  currency: string;
}

export interface OrderSummary {
  id: string;
  publicOrderNumber: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  totalCents: number;
  currency: string;
  createdAt: string;
}

export interface PaymentSessionResponse {
  orderId: string;
  provider: PaymentProviderMode;
  // For CLOVER_ECOMMERCE: an ephemeral session token used to render Clover's
  // hosted card field client-side. Never a raw API secret.
  clientSessionToken?: string;
  // For CLOVER_TERMINAL: identifies the in-progress Pay Display request so
  // the admin portal / employee device can poll or listen for completion.
  terminalRequestId?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
}

// =============================================================================
// Admin portal (Phase 6) - auth identity, orders, menu management, business
// settings, and reports. See apps/api/src/{auth,orders,menu,restaurants,reports}.
// =============================================================================

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isGuest: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

export interface CurrentUserRole {
  role: UserRoleType;
  restaurantId?: string | null;
  restaurantLocationId?: string | null;
}

export interface CurrentUser {
  userId: string;
  email?: string | null;
  isGuest: boolean;
  roles: CurrentUserRole[];
}

export interface OrderItemModifierDetail {
  id: string;
  nameSnapshot: string;
  unitPriceCents: number;
  quantity: number;
}

export interface OrderItemDetail {
  id: string;
  nameSnapshot: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  specialInstructions?: string | null;
  modifiers: OrderItemModifierDetail[];
}

export interface OrderDetail {
  id: string;
  publicOrderNumber: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  subtotalCents: number;
  taxCents: number;
  serviceFeeCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  tipCents: number;
  totalCents: number;
  currency: string;
  specialInstructions?: string | null;
  createdAt: string;
  items: OrderItemDetail[];
  payments: Array<{ id: string; status: string; amountCents: number; provider: PaymentProviderMode }>;
  refunds: Array<{ id: string; status: string; amountCents: number }>;
}

export interface RestaurantHoursEntry {
  dayOfWeek: number;
  opensAtMinutes: number;
  closesAtMinutes: number;
  isClosed: boolean;
}

export interface RestaurantLocationSettings {
  id: string;
  restaurantId: string;
  name: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryRadiusMeters: number | null;
  minimumOrderAmountCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  serviceFeeBasisPoints: number;
  defaultPrepTimeMinutes: number;
  tipPresetsBasisPoints: number[];
  isActive: boolean;
  hours: RestaurantHoursEntry[];
}

export interface AdminMenuItem {
  id: string;
  restaurantId: string;
  categoryId: string | null;
  name: string;
  description?: string | null;
  priceCents: number;
  isAvailable: boolean;
  isSoldOutOverride: boolean;
  isFeatured: boolean;
  isActive: boolean;
}

export interface AdminMenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface AdminMenuResponse {
  categories: AdminMenuCategory[];
  items: AdminMenuItem[];
}

export interface SalesSummary {
  from: string;
  to: string;
  ordersCount: number;
  grossRevenueCents: number;
  refundedCents: number;
  netRevenueCents: number;
  averageOrderValueCents: number;
  ordersByStatus: Record<string, number>;
  revenueByDay: Array<{ date: string; orders: number; netRevenueCents: number }>;
}

export interface RestaurantLocationRef {
  id: string;
  name: string;
  isPrimary: boolean;
}

export interface RestaurantWithLocations extends RestaurantSummary {
  locations: RestaurantLocationRef[];
}

export interface CloverSyncJob {
  id: string;
  type: string;
  status: string;
  startedAt: string;
  finishedAt?: string | null;
  errorSummary?: string | null;
  itemsSynced: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSoftDeleted: number;
}
