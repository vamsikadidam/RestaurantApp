import type { HealthCheckResponse } from '@restaurant-platform/shared-types';

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null> | string | null;
}

/**
 * Minimal typed fetch wrapper for the admin portal. This will grow into a
 * full generated client (from the NestJS OpenAPI spec) as endpoints from
 * section 12 of the spec are implemented in later phases. Kept intentionally
 * small in Phase 1 so there's a real, working seam to build on.
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
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  health() {
    return this.request<HealthCheckResponse>('/api/v1/health');
  }
}
