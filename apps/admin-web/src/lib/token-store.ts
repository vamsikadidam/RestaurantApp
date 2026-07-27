/**
 * Tokens live in localStorage (this is an internal restaurant-staff tool,
 * not the customer-facing app - see SECURITY.md for why the Flutter app
 * instead uses OS-level secure storage). A module-level cache avoids
 * re-reading localStorage on every request and lets the ApiClient's
 * getAccessToken accessor always see the latest value after a refresh.
 */
const ACCESS_TOKEN_KEY = 'admin_access_token';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';

let accessTokenCache: string | null = null;
let refreshTokenCache: string | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

export function loadTokens(): { accessToken: string | null; refreshToken: string | null } {
  if (!isBrowser()) return { accessToken: null, refreshToken: null };
  accessTokenCache = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  refreshTokenCache = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  return { accessToken: accessTokenCache, refreshToken: refreshTokenCache };
}

export function setTokens(accessToken: string, refreshToken: string): void {
  accessTokenCache = accessToken;
  refreshTokenCache = refreshToken;
  if (isBrowser()) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearTokens(): void {
  accessTokenCache = null;
  refreshTokenCache = null;
  if (isBrowser()) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function getAccessToken(): string | null {
  return accessTokenCache;
}

export function getRefreshToken(): string | null {
  return refreshTokenCache;
}
