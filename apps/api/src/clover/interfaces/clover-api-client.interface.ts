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

export interface CloverCreateOrderLineItemInput {
  name: string;
  priceCents: number;
  quantity: number;
  cloverItemId?: string;
}

export interface CloverCreateOrderInput {
  lineItems: CloverCreateOrderLineItemInput[];
  note?: string;
}

export interface CloverOrderDto {
  id: string;
  total: number;
  state?: string;
}

export interface CloverChargeInput {
  amountCents: number;
  currency: string;
  /** Single-use `clv_...` token produced by the Ecommerce tokenization
   * endpoint - see PaymentsService. Never a raw card number. */
  source: string;
  clientIp?: string;
  orderId?: string;
  idempotencyKey?: string;
}

export interface CloverChargeResultDto {
  id: string;
  status: string;
  amountCents: number;
}

export interface CloverRefundResultDto {
  id: string;
  status: string;
  amountCents: number;
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

  /** Mirrors a locally-created order into Clover's Register/KDS via the
   * Orders API so restaurant staff see it alongside in-person orders. */
  createOrder(
    merchantId: string,
    accessToken: string,
    input: CloverCreateOrderInput,
  ): Promise<CloverOrderDto>;

  /** Fetches (and caches upstream, per Clover's docs) the per-merchant
   * Ecommerce API key used to *tokenize* cards. This key can only create
   * single-use card tokens - it cannot charge anything - so it's safe to
   * hand to the mobile client. See PaymentsService.getTokenizationConfig. */
  getEcommerceApiAccessKey(merchantId: string, accessToken: string): Promise<string>;

  /** Charges a previously-tokenized card via the Ecommerce Charges API.
   * Never called with raw card data - `input.source` is always a `clv_...`
   * token produced by the client directly against Clover's token host. */
  createCharge(accessToken: string, input: CloverChargeInput): Promise<CloverChargeResultDto>;

  createRefund(
    accessToken: string,
    chargeId: string,
    amountCents?: number,
  ): Promise<CloverRefundResultDto>;
}
