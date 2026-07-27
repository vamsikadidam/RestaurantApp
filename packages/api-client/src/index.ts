import type {
  AdminMenuItem,
  AdminMenuResponse,
  AuthTokens,
  CloverSyncJob,
  CurrentUser,
  HealthCheckResponse,
  LoginResponse,
  OrderDetail,
  OrderStatus,
  RestaurantLocationSettings,
  RestaurantWithLocations,
  SalesSummary,
} from '@restaurant-platform/shared-types';

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null> | string | null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Typed fetch wrapper for the admin portal, covering the endpoints
 * implemented through Phase 6 (auth identity, order dashboard, menu
 * management, business settings, reports, Clover connect/sync).
 */
export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.options.getAccessToken?.();
    const response = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => undefined);
      throw new ApiError(response.status, body?.message ?? `API request failed: ${response.status} ${response.statusText}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  health() {
    return this.request<HealthCheckResponse>('/api/v1/health');
  }

  // ---- Auth ------------------------------------------------------------

  login(email: string, password: string) {
    return this.request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  me() {
    return this.request<CurrentUser>('/api/v1/auth/me');
  }

  logout(refreshToken: string) {
    return this.request<void>('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  requestAccountDeletion(email: string, password: string) {
    return this.request<void>('/api/v1/auth/account-deletion', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  refresh(refreshToken: string) {
    return this.request<AuthTokens>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // ---- Orders ------------------------------------------------------------

  listRestaurantOrders(
    restaurantId: string,
    filters: { status?: OrderStatus; restaurantLocationId?: string } = {},
  ) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.restaurantLocationId) params.set('restaurantLocationId', filters.restaurantLocationId);
    const qs = params.toString();
    return this.request<OrderDetail[]>(`/api/v1/restaurants/${restaurantId}/orders${qs ? `?${qs}` : ''}`);
  }

  updateOrderStatus(orderId: string, status: OrderStatus, reason?: string) {
    return this.request<OrderDetail>(`/api/v1/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  }

  createRefund(orderId: string, input: { amountCents?: number; reason?: string } = {}) {
    return this.request<{ refund: unknown; order: OrderDetail }>(`/api/v1/orders/${orderId}/refunds`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ---- Menu management ------------------------------------------------------------

  listAdminMenuItems(restaurantId: string) {
    return this.request<AdminMenuResponse>(`/api/v1/restaurants/${restaurantId}/admin/menu-items`);
  }

  updateMenuItem(
    itemId: string,
    restaurantId: string,
    changes: Partial<Pick<AdminMenuItem, 'priceCents' | 'description' | 'isAvailable' | 'isSoldOutOverride' | 'isFeatured'>>,
  ) {
    return this.request<AdminMenuItem>(`/api/v1/menu-items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ restaurantId, ...changes }),
    });
  }

  getRestaurant(restaurantId: string) {
    return this.request<RestaurantWithLocations>(`/api/v1/restaurants/${restaurantId}`);
  }

  // ---- Business settings ------------------------------------------------------------

  getLocationSettings(restaurantId: string, locationId: string) {
    return this.request<RestaurantLocationSettings>(
      `/api/v1/restaurants/${restaurantId}/locations/${locationId}/settings`,
    );
  }

  updateLocationSettings(
    restaurantId: string,
    locationId: string,
    changes: Partial<
      Pick<
        RestaurantLocationSettings,
        | 'pickupEnabled'
        | 'deliveryEnabled'
        | 'deliveryRadiusMeters'
        | 'minimumOrderAmountCents'
        | 'deliveryFeeCents'
        | 'serviceFeeCents'
        | 'serviceFeeBasisPoints'
        | 'defaultPrepTimeMinutes'
        | 'tipPresetsBasisPoints'
        | 'isActive'
      >
    >,
  ) {
    return this.request<RestaurantLocationSettings>(
      `/api/v1/restaurants/${restaurantId}/locations/${locationId}/settings`,
      { method: 'PATCH', body: JSON.stringify(changes) },
    );
  }

  updateHours(restaurantId: string, locationId: string, hours: RestaurantLocationSettings['hours']) {
    return this.request<RestaurantLocationSettings['hours']>(
      `/api/v1/restaurants/${restaurantId}/locations/${locationId}/hours`,
      { method: 'PUT', body: JSON.stringify({ hours }) },
    );
  }

  // ---- Clover ------------------------------------------------------------

  getCloverOAuthStartUrl(restaurantLocationId: string) {
    return this.request<{ url: string }>(
      `/api/v1/integrations/clover/oauth/start-url?restaurantLocationId=${restaurantLocationId}`,
    );
  }

  getCloverConnectionStatus(restaurantLocationId: string) {
    return this.request<{ connected: boolean; merchantId?: string; connectedAt?: string; lastSyncAt?: string | null }>(
      `/api/v1/integrations/clover/connection-status?restaurantLocationId=${restaurantLocationId}`,
    );
  }

  disconnectClover(restaurantId: string, restaurantLocationId: string) {
    return this.request<{ disconnected: boolean }>('/api/v1/integrations/clover/disconnect', {
      method: 'POST',
      body: JSON.stringify({ restaurantId, restaurantLocationId }),
    });
  }

  triggerCloverSync(restaurantId: string, restaurantLocationId: string) {
    return this.request<CloverSyncJob>('/api/v1/integrations/clover/sync', {
      method: 'POST',
      body: JSON.stringify({ restaurantId, restaurantLocationId }),
    });
  }

  getCloverSyncStatus(restaurantId: string) {
    return this.request<CloverSyncJob[]>(`/api/v1/integrations/clover/sync-status?restaurantId=${restaurantId}`);
  }

  // ---- Reports ------------------------------------------------------------

  getSalesSummary(restaurantId: string, from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return this.request<SalesSummary>(`/api/v1/restaurants/${restaurantId}/reports/summary${qs ? `?${qs}` : ''}`);
  }
}
