export const CLOVER_API_CLIENT = Symbol('CLOVER_API_CLIENT');

export interface CloverOAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  /** Unix ms timestamp, if provided by Clover. */
  accessTokenExpiresAt?: number;
  refreshTokenExpiresAt?: number;
  /** Present when Clover's token response includes it; otherwise the
   * caller falls back to the merchantId echoed on the OAuth callback. */
  merchantId?: string;
}

export interface CloverTaxRateDto {
  id: string;
  name: string;
  rate: number; // Clover represents rate in basis-point-like integer units.
}

export interface CloverCategoryDto {
  id: string;
  name: string;
}

export interface CloverModifierDto {
  id: string;
  name: string;
  price: number; // cents
}

export interface CloverModifierGroupDto {
  id: string;
  name: string;
  minRequired?: number;
  maxAllowed?: number;
  modifiers: CloverModifierDto[];
}

export interface CloverItemDto {
  id: string;
  name: string;
  price: number; // cents
  hidden?: boolean;
  sku?: string;
  categories?: CloverCategoryDto[];
  modifierGroups?: CloverModifierGroupDto[];
  taxRates?: CloverTaxRateDto[];
}

/**
 * Port for all Clover REST calls this app needs. Two adapters implement it:
 *  - CloverApiClientMock: deterministic in-memory data, used whenever real
 *    credentials aren't configured (local dev, CI, tests).
 *  - CloverApiClientHttp: real calls to Clover's REST API, verified against
 *    current docs.clover.com/dev documentation (see inline comments on each
 *    method for the exact endpoint and what to re-verify before go-live).
 */
export interface CloverApiClient {
  exchangeAuthorizationCode(code: string): Promise<CloverOAuthTokenResult>;
  refreshAccessToken(refreshToken: string): Promise<CloverOAuthTokenResult>;
  listCategories(merchantId: string, accessToken: string): Promise<CloverCategoryDto[]>;
  listModifierGroups(merchantId: string, accessToken: string): Promise<CloverModifierGroupDto[]>;
  listItems(merchantId: string, accessToken: string): Promise<CloverItemDto[]>;
}
