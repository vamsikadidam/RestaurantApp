# Clover Setup Guide

> **Status:** OAuth connection + inventory sync are implemented (Phase 2). Payments
> (Ecommerce + Pay Display) and webhooks are added in Phase 4/5 and will extend this
> guide. Endpoints/hosts documented below were verified against current Clover
> developer documentation (docs.clover.com/dev) at the time of writing - always
> re-check docs.clover.com before connecting a real production merchant.

## 1. Create a Clover developer account and app

1. Sign up at the [Clover Developer Dashboard](https://www.clover.com/developers).
2. Create a new app. This gives you a **App ID** (`CLOVER_CLIENT_ID`) and **App
   Secret** (`CLOVER_CLIENT_SECRET`) for the sandbox environment.
3. Under your app's settings, set the **Alternate Launch Path / Redirect URL** to
   your API's callback endpoint, e.g. `https://api.yourdomain.com/api/v1/integrations/clover/oauth/callback`
   (or `http://localhost:3000/api/v1/integrations/clover/oauth/callback` for local
   dev with a tunnel such as ngrok, since Clover must be able to reach it). Put the
   same value in `CLOVER_REDIRECT_URI`.
4. Request the least-privilege permissions your app needs. For Phase 2 (inventory
   read-only) that's typically **Inventory: Read**. Phases 4/5 will add **Orders:
   Read/Write**, **Payments: Read/Write/Refund**, and a webhook subscription -
   confirm the exact permission names in the Dashboard's permission picker, since
   Clover's naming can change between accounts/regions.

## 2. Sandbox merchant

1. In the Developer Dashboard, create a **sandbox test merchant** (Clover
   provisions one per app for testing without touching real merchant data).
2. Note its Merchant ID - useful for manually inspecting data in the sandbox
   Merchant Dashboard while developing.

## 3. Environment variables

Set these in `apps/api/.env` (see `apps/api/.env.example` for the full list):

| Variable | Purpose |
|---|---|
| `CLOVER_ENVIRONMENT` | `sandbox` or `production` |
| `CLOVER_CLIENT_ID` / `CLOVER_CLIENT_SECRET` | From your Clover app |
| `CLOVER_REDIRECT_URI` | Must exactly match the app's configured redirect URL |
| `CLOVER_API_BASE_URL` / `CLOVER_OAUTH_WEB_BASE_URL` | Leave unset unless you're outside North America (see below) |
| `CLOVER_USE_MOCK_CLIENT` | `true` to force the mock adapter even with real credentials set; defaults to `true` automatically when `CLOVER_CLIENT_ID`/`SECRET` are unset |
| `TOKEN_ENCRYPTION_KEY` | Symmetric key used to encrypt stored Clover OAuth tokens (AES-256-GCM) - required regardless of mock/real mode |

Regional hosts (override only if not North America):

| Region | OAuth web host | API host |
|---|---|---|
| Sandbox (all regions) | `sandbox.dev.clover.com` | `apisandbox.dev.clover.com` |
| Production - North America | `www.clover.com` | `api.clover.com` |
| Production - Europe | `www.eu.clover.com` | `api.eu.clover.com` |
| Production - Latin America | `www.la.clover.com` | `api.la.clover.com` |

## 4. How the OAuth connection flow works in this codebase

See `apps/api/src/clover/clover-oauth.service.ts` and `clover.controller.ts`.

1. A restaurant admin (authenticated, `RESTAURANT_ADMIN` role, scoped to the
   target restaurant location) hits `GET /api/v1/integrations/clover/oauth/start?restaurantLocationId=...`.
2. The server generates a random, single-use `state` token, stores
   `{restaurantLocationId, connectedByUserId}` against it in Redis for 10 minutes,
   and redirects the browser to `{oauthWebBaseUrl}/oauth/v2/authorize?client_id=...&redirect_uri=...&state=...`.
3. The merchant logs into Clover and approves access. Clover redirects back to
   `CLOVER_REDIRECT_URI` with `code`, `state` (echoed back), and usually a merchant
   identifier.
4. `GET /api/v1/integrations/clover/oauth/callback` looks up the `state` in Redis,
   exchanges `code` for an access/refresh token pair via `POST {apiBaseUrl}/oauth/v2/token`,
   encrypts both tokens (AES-256-GCM, `TOKEN_ENCRYPTION_KEY`), and upserts a
   `CloverConnection` row for that restaurant location.
5. Expired access tokens are transparently refreshed via `POST {apiBaseUrl}/oauth/v2/refresh`
   the next time they're needed (see `CloverOAuthService.getValidAccessToken`).

**Without real Clover credentials configured**, all of the above still works end
to end using `CloverApiClientMock` (deterministic fake merchant/tokens/inventory) -
useful for local development, demos, and CI.

## 5. Inventory sync

`POST /api/v1/integrations/clover/sync` (admin-only, restaurant-scoped) triggers a
full sync: Clover categories, modifier groups + modifiers, and items (with
`expand=categories,modifierGroups,taxRates`) are fetched from
`GET {apiBaseUrl}/v3/merchants/{mId}/...` and upserted into the local
`MenuCategory` / `ModifierGroup` / `ModifierOption` / `MenuItem` tables.

Rules enforced by `CloverSyncService`:

- App-owned fields (`description`, `imageUrl`, `isFeatured`, `isSoldOutOverride`,
  etc.) are **never** overwritten by sync, only set at first creation.
- Items previously synced from Clover but no longer returned by Clover are
  **soft-deleted** (`deletedAt` set); local-only (non-Clover) items are untouched.
  Nothing is ever hard-deleted.
- Per-record failures (e.g. a malformed single item) are logged and counted but
  do not abort the whole sync - the job finishes as `PARTIAL` rather than `FAILED`.
- Every run is recorded as a `SyncJob` row (`GET /api/v1/integrations/clover/sync-status`)
  with counts and a log array for troubleshooting.

**Before connecting a real production merchant**, re-verify the exact
list-endpoint response envelope and field names against
`docs.clover.com/dev/reference` - `CloverApiClientHttp` defensively supports
both Clover's common `{ elements: [...] }` list wrapper and bare arrays, but the
inventory JSON shape should be spot-checked against a real sandbox merchant with
representative data (multiple categories, required/optional modifiers, hidden
items) before go-live.

## 6. Still to come (Phase 4/5)

- Clover Ecommerce (card-not-present) tokenization/charge/refund - `Mode A`.
- Clover Pay Display / Remote Pay terminal flow - `Mode B`.
- `POST /webhooks/clover` signature verification, deduplication, and
  order-status sync.

## 7. Common errors and how this app surfaces them

| Symptom | Where it's handled |
|---|---|
| `state` missing/expired at callback | `400 Bad Request`, "connection request has expired" - user is told to retry |
| No merchant ID returned by Clover | `400 Bad Request` - connection is not saved |
| Access token expired, no refresh token | `400 Bad Request`, "must be reconnected" |
| Location not connected to Clover | `404 Not Found` when a sync is attempted |
| Clover API request fails (5xx, timeout) | Logged server-side with status/message; sync job marked `FAILED` with `errorSummary`; raw Clover error body is never returned to the client (see `SECURITY.md`) |
