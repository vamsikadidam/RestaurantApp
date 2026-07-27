import { ApiClient } from '@restaurant-platform/api-client';
import { getAccessToken } from './token-store';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => getAccessToken(),
});

/** Used only for the login/refresh calls, which must never send a (possibly stale) bearer token. */
export const anonymousApiClient = new ApiClient({ baseUrl: API_BASE_URL });
