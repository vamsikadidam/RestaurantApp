import { FulfillmentType, OrderStatus, PaymentProviderMode } from './enums';

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
