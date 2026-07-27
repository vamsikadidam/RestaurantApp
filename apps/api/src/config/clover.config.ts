import { registerAs } from '@nestjs/config';
import { CloverEnvironment } from './env.validation';

/**
 * Clover hosts per environment, verified against current Clover developer
 * documentation (docs.clover.com/dev/docs/use-oauth, "Sandbox and production
 * environment URLs"). Do not hardcode these anywhere else in the codebase -
 * always resolve hosts through this config so switching CLOVER_ENVIRONMENT
 * is the single source of truth.
 *
 * Two distinct hosts exist:
 *  - `apiBaseUrl`  ("api" host) - REST API calls (/v3/merchants/..) and the
 *    OAuth token/refresh endpoints (/oauth/v2/token, /oauth/v2/refresh).
 *  - `oauthWebBaseUrl` ("www" host) - the OAuth *authorize* endpoint
 *    (/oauth/v2/authorize), which is a merchant-facing login/consent page.
 *
 * Production also varies by region (North America / Europe / Latin
 * America); this app defaults to North America and can be overridden via
 * CLOVER_API_BASE_URL / CLOVER_OAUTH_WEB_BASE_URL for other regions.
 */
const CLOVER_API_BASE_URLS: Record<CloverEnvironment, string> = {
  [CloverEnvironment.Sandbox]: 'https://apisandbox.dev.clover.com',
  [CloverEnvironment.Production]: 'https://api.clover.com',
};

const CLOVER_OAUTH_WEB_BASE_URLS: Record<CloverEnvironment, string> = {
  [CloverEnvironment.Sandbox]: 'https://sandbox.dev.clover.com',
  [CloverEnvironment.Production]: 'https://www.clover.com',
};

// Clover Ecommerce (card-not-present) hosts, verified against
// docs.clover.com/dev/docs/ecommerce-api-payments-flow:
//  - `ecommerceBaseUrl` ("scl" host) - POST /v1/charges, /v1/refunds.
//  - `tokenBaseUrl` ("token" host) - POST /v1/tokens (card tokenization).
//    This host is called *directly by the mobile app*, never by our
//    backend, using the per-merchant `apiAccessKey` obtained via PAKMS (see
//    PaymentsService.getEcommerceTokenizationConfig) - so raw card data
//    never transits our server. See SECURITY.md.
const CLOVER_ECOMMERCE_BASE_URLS: Record<CloverEnvironment, string> = {
  [CloverEnvironment.Sandbox]: 'https://scl-sandbox.dev.clover.com',
  [CloverEnvironment.Production]: 'https://scl.clover.com',
};

const CLOVER_TOKEN_BASE_URLS: Record<CloverEnvironment, string> = {
  [CloverEnvironment.Sandbox]: 'https://token-sandbox.dev.clover.com',
  [CloverEnvironment.Production]: 'https://token.clover.com',
};

// REST Pay Display API (in-restaurant terminal payments) - used only by the
// admin/employee "charge on terminal" flow (Phase 6), never by the customer
// mobile app directly. NOTE: re-verify this host against
// docs.clover.com/dev/docs/rest-pay-development-basics before go-live; it is
// only reachable with a physical Clover device present, so it cannot be
// exercised in CI and always falls back to the mock adapter unless
// CLOVER_USE_MOCK_CLIENT=false is explicitly set.
const CLOVER_REST_PAY_BASE_URLS: Record<CloverEnvironment, string> = {
  [CloverEnvironment.Sandbox]: 'https://apisandbox.dev.clover.com/connect',
  [CloverEnvironment.Production]: 'https://api.clover.com/connect',
};

export interface CloverConfig {
  environment: CloverEnvironment;
  clientId?: string;
  clientSecret?: string;
  merchantId?: string;
  redirectUri?: string;
  webhookSecret?: string;
  apiBaseUrl: string;
  oauthWebBaseUrl: string;
  ecommerceBaseUrl: string;
  tokenBaseUrl: string;
  restPayBaseUrl: string;
  useMockClient: boolean;
}

export default registerAs('clover', (): CloverConfig => {
  const environment =
    (process.env.CLOVER_ENVIRONMENT as CloverEnvironment) ?? CloverEnvironment.Sandbox;

  const clientId = process.env.CLOVER_CLIENT_ID;
  const clientSecret = process.env.CLOVER_CLIENT_SECRET;

  return {
    environment,
    clientId,
    clientSecret,
    merchantId: process.env.CLOVER_MERCHANT_ID,
    redirectUri: process.env.CLOVER_REDIRECT_URI,
    webhookSecret: process.env.CLOVER_WEBHOOK_SECRET,
    // CLOVER_API_BASE_URL / CLOVER_OAUTH_WEB_BASE_URL let an operator override
    // the resolved host (e.g. for a different Clover region) without a code change.
    apiBaseUrl: process.env.CLOVER_API_BASE_URL || CLOVER_API_BASE_URLS[environment],
    oauthWebBaseUrl:
      process.env.CLOVER_OAUTH_WEB_BASE_URL || CLOVER_OAUTH_WEB_BASE_URLS[environment],
    ecommerceBaseUrl: CLOVER_ECOMMERCE_BASE_URLS[environment],
    tokenBaseUrl: CLOVER_TOKEN_BASE_URLS[environment],
    restPayBaseUrl: CLOVER_REST_PAY_BASE_URLS[environment],
    // Without real Clover credentials configured, fall back to the mock
    // adapter so the app remains fully runnable for local development/tests
    // (see clover-api-client.mock.ts). Explicit env var wins either way.
    useMockClient:
      process.env.CLOVER_USE_MOCK_CLIENT === 'true' ||
      (process.env.CLOVER_USE_MOCK_CLIENT !== 'false' && (!clientId || !clientSecret)),
  };
});
