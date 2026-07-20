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

// Clover Ecommerce (hosted tokenization) host - used starting in Phase 4 for
// Mode A card-not-present payments. NOTE: confirm the exact ecommerce/pakms
// host and iframe/SDK integration approach against current Clover Ecommerce
// API docs before implementing the real adapter; this value is unused until
// then.
const CLOVER_ECOMMERCE_BASE_URLS: Record<CloverEnvironment, string> = {
  [CloverEnvironment.Sandbox]: 'https://scl-sandbox.dev.clover.com',
  [CloverEnvironment.Production]: 'https://scl.clover.com',
};

export interface CloverConfig {
  environment: CloverEnvironment;
  clientId?: string;
  clientSecret?: string;
  merchantId?: string;
  redirectUri?: string;
  webhookSecret?: string;
  ecommercePublicKey?: string;
  ecommercePrivateKey?: string;
  apiBaseUrl: string;
  oauthWebBaseUrl: string;
  ecommerceBaseUrl: string;
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
    ecommercePublicKey: process.env.CLOVER_ECOMMERCE_PUBLIC_KEY,
    ecommercePrivateKey: process.env.CLOVER_ECOMMERCE_PRIVATE_KEY,
    // CLOVER_API_BASE_URL / CLOVER_OAUTH_WEB_BASE_URL let an operator override
    // the resolved host (e.g. for a different Clover region) without a code change.
    apiBaseUrl: process.env.CLOVER_API_BASE_URL || CLOVER_API_BASE_URLS[environment],
    oauthWebBaseUrl:
      process.env.CLOVER_OAUTH_WEB_BASE_URL || CLOVER_OAUTH_WEB_BASE_URLS[environment],
    ecommerceBaseUrl: CLOVER_ECOMMERCE_BASE_URLS[environment],
    // Without real Clover credentials configured, fall back to the mock
    // adapter so the app remains fully runnable for local development/tests
    // (see clover-api-client.mock.ts). Explicit env var wins either way.
    useMockClient:
      process.env.CLOVER_USE_MOCK_CLIENT === 'true' ||
      (process.env.CLOVER_USE_MOCK_CLIENT !== 'false' && (!clientId || !clientSecret)),
  };
});
