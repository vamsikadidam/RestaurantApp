import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import {
  CloverApiClient,
  CloverCategoryDto,
  CloverItemDto,
  CloverModifierGroupDto,
  CloverOAuthTokenResult,
} from './interfaces/clover-api-client.interface';

const PAGE_LIMIT = 1000; // Clover's documented maximum page size for v3 list endpoints.

/**
 * Real Clover REST adapter. Endpoints and hosts are verified against current
 * Clover developer documentation as of this implementation:
 *  - OAuth token exchange:  POST {apiBaseUrl}/oauth/v2/token
 *    https://docs.clover.com/dev/docs/high-trust-app-auth-flow
 *  - OAuth refresh:         POST {apiBaseUrl}/oauth/v2/refresh
 *    https://docs.clover.com/dev/docs/generate-expiring-tokens-using-v2-oauth-flow
 *  - Categories:            GET {apiBaseUrl}/v3/merchants/{mId}/categories
 *    https://docs.clover.com/dev/docs/managing-categories
 *  - Modifier groups:       GET {apiBaseUrl}/v3/merchants/{mId}/modifier_groups?expand=modifiers
 *    https://docs.clover.com/dev/reference/modifiergetmodifiergroups
 *  - Items:                 GET {apiBaseUrl}/v3/merchants/{mId}/items?expand=categories,modifierGroups,taxRates
 *    https://docs.clover.com/dev/docs/managing-modifier-groups-modifiers
 *
 * IMPORTANT: re-verify the exact response envelope/field names (this client
 * defensively supports both Clover's common `{ elements: [...] }` list
 * envelope and a bare array) against docs.clover.com/dev/reference before
 * connecting a real production merchant - see CLOVER_SETUP_GUIDE.md.
 */
@Injectable()
export class CloverApiClientHttp implements CloverApiClient {
  private readonly logger = new Logger(CloverApiClientHttp.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async exchangeAuthorizationCode(code: string): Promise<CloverOAuthTokenResult> {
    const apiBaseUrl = this.configService.get<string>('clover.apiBaseUrl');
    const clientId = this.configService.get<string>('clover.clientId');
    const clientSecret = this.configService.get<string>('clover.clientSecret');

    const response = await this.request(() =>
      this.httpService.axiosRef.post(`${apiBaseUrl}/oauth/v2/token`, {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    );

    return this.toTokenResult(response.data);
  }

  async refreshAccessToken(refreshToken: string): Promise<CloverOAuthTokenResult> {
    const apiBaseUrl = this.configService.get<string>('clover.apiBaseUrl');
    const clientId = this.configService.get<string>('clover.clientId');

    const response = await this.request(() =>
      this.httpService.axiosRef.post(`${apiBaseUrl}/oauth/v2/refresh`, {
        client_id: clientId,
        refresh_token: refreshToken,
      }),
    );

    return this.toTokenResult(response.data);
  }

  async listCategories(merchantId: string, accessToken: string): Promise<CloverCategoryDto[]> {
    const raw = await this.paginate(`/v3/merchants/${merchantId}/categories`, accessToken);
    return raw.map((c) => ({ id: c.id, name: c.name }));
  }

  async listModifierGroups(
    merchantId: string,
    accessToken: string,
  ): Promise<CloverModifierGroupDto[]> {
    const raw = await this.paginate(`/v3/merchants/${merchantId}/modifier_groups`, accessToken, {
      expand: 'modifiers',
    });

    return raw.map((group) => ({
      id: group.id,
      name: group.name,
      minRequired: group.minRequired,
      maxAllowed: group.maxAllowed,
      modifiers: this.extractElements(group.modifiers).map((m: any) => ({
        id: m.id,
        name: m.name,
        price: m.price ?? 0,
      })),
    }));
  }

  async listItems(merchantId: string, accessToken: string): Promise<CloverItemDto[]> {
    const raw = await this.paginate(`/v3/merchants/${merchantId}/items`, accessToken, {
      expand: 'categories,modifierGroups,taxRates',
    });

    return raw.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price ?? 0,
      hidden: Boolean(item.hidden),
      sku: item.sku,
      categories: this.extractElements(item.categories).map((c: any) => ({
        id: c.id,
        name: c.name,
      })),
      modifierGroups: this.extractElements(item.modifierGroups).map((g: any) => ({
        id: g.id,
        name: g.name,
        minRequired: g.minRequired,
        maxAllowed: g.maxAllowed,
        modifiers: this.extractElements(g.modifiers).map((m: any) => ({
          id: m.id,
          name: m.name,
          price: m.price ?? 0,
        })),
      })),
      taxRates: this.extractElements(item.taxRates).map((t: any) => ({
        id: t.id,
        name: t.name,
        rate: t.rate ?? 0,
      })),
    }));
  }

  private async paginate(
    path: string,
    accessToken: string,
    extraParams: Record<string, string> = {},
  ): Promise<any[]> {
    const apiBaseUrl = this.configService.get<string>('clover.apiBaseUrl');
    const results: any[] = [];
    let offset = 0;
    let hasMorePages = true;

    while (hasMorePages) {
      const response = await this.request(() =>
        this.httpService.axiosRef.get(`${apiBaseUrl}${path}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { limit: PAGE_LIMIT, offset, ...extraParams },
        }),
      );

      const page = this.extractElements(response.data);
      results.push(...page);

      hasMorePages = page.length === PAGE_LIMIT;
      offset += PAGE_LIMIT;
    }

    return results;
  }

  private extractElements(value: unknown): any[] {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object' && Array.isArray((value as any).elements)) {
      return (value as any).elements;
    }
    return [];
  }

  private toTokenResult(data: any): CloverOAuthTokenResult {
    return {
      accessToken: data.access_token ?? data.accessToken,
      refreshToken: data.refresh_token ?? data.refreshToken,
      accessTokenExpiresAt: this.toMillis(
        data.access_token_expiration ?? data.accessTokenExpiration,
      ),
      refreshTokenExpiresAt: this.toMillis(
        data.refresh_token_expiration ?? data.refreshTokenExpiration,
      ),
      merchantId: data.merchant_id ?? data.merchantId,
    };
  }

  private toMillis(value: number | undefined): number | undefined {
    if (!value) return undefined;
    // Clover's docs show Unix timestamps for expiration; normalize seconds
    // vs. milliseconds defensively (values under 10^12 are almost certainly
    // seconds, not ms, given current dates).
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  private async request<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Clover API request failed: ${axiosError.response?.status} ${axiosError.message}`,
      );
      throw error;
    }
  }
}
