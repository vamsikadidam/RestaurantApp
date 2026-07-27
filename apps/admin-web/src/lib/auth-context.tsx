'use client';

import { ApiError } from '@restaurant-platform/api-client';
import {
  UserRoleType,
  type AuthUser,
  type CurrentUser,
  type CurrentUserRole,
} from '@restaurant-platform/shared-types';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { anonymousApiClient, apiClient } from './api-client';
import { clearTokens, getRefreshToken, loadTokens, setTokens } from './token-store';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface StaffContext {
  role: UserRoleType.RESTAURANT_ADMIN | UserRoleType.RESTAURANT_EMPLOYEE;
  restaurantId: string;
  restaurantLocationId: string | null;
  isAdmin: boolean;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  identity: CurrentUser | null;
  staff: StaffContext | null;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function deriveStaffContext(roles: CurrentUserRole[]): StaffContext | null {
  const staffRole = roles.find(
    (r) =>
      (r.role === UserRoleType.RESTAURANT_ADMIN || r.role === UserRoleType.RESTAURANT_EMPLOYEE) && r.restaurantId,
  );
  if (!staffRole || !staffRole.restaurantId) return null;

  return {
    role: staffRole.role as StaffContext['role'],
    restaurantId: staffRole.restaurantId,
    restaurantLocationId: staffRole.restaurantLocationId ?? null,
    isAdmin: roles.some((r) => r.role === UserRoleType.RESTAURANT_ADMIN),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [identity, setIdentity] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finishAuthenticated = useCallback((who: CurrentUser, userSummary: AuthUser | null) => {
    setIdentity(who);
    setUser(userSummary);
    setStatus('authenticated');
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const result = await anonymousApiClient.login(email, password);
        setTokens(result.accessToken, result.refreshToken);
        const who = await apiClient.me();
        if (!deriveStaffContext(who.roles)) {
          clearTokens();
          setStatus('unauthenticated');
          throw new Error('This account is not linked to a restaurant admin or employee role.');
        }
        finishAuthenticated(who, result.user);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : (err as Error).message || 'Login failed';
        setError(message);
        setStatus('unauthenticated');
        throw err;
      }
    },
    [finishAuthenticated],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    clearTokens();
    setUser(null);
    setIdentity(null);
    setStatus('unauthenticated');
    if (refreshToken) {
      await anonymousApiClient.logout(refreshToken).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const { accessToken, refreshToken } = loadTokens();
      if (!accessToken) {
        setStatus('unauthenticated');
        return;
      }

      try {
        const who = await apiClient.me();
        if (!deriveStaffContext(who.roles)) {
          clearTokens();
          setStatus('unauthenticated');
          return;
        }
        finishAuthenticated(who, null);
        return;
      } catch {
        // Access token likely expired - fall through to a refresh attempt.
      }

      if (!refreshToken) {
        clearTokens();
        setStatus('unauthenticated');
        return;
      }

      try {
        const tokens = await anonymousApiClient.refresh(refreshToken);
        setTokens(tokens.accessToken, tokens.refreshToken);
        const who = await apiClient.me();
        if (!deriveStaffContext(who.roles)) {
          clearTokens();
          setStatus('unauthenticated');
          return;
        }
        finishAuthenticated(who, null);
      } catch {
        clearTokens();
        setStatus('unauthenticated');
      }
    }

    void bootstrap();
  }, [finishAuthenticated]);

  const staff = useMemo(() => (identity ? deriveStaffContext(identity.roles) : null), [identity]);

  const value: AuthContextValue = { status, user, identity, staff, error, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
