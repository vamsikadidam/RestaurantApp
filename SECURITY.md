# Security Model

This document explains the security boundaries and controls for the restaurant ordering
platform. It is a living document - update it whenever a boundary described here changes.

## 1. Core principle: the mobile app is untrusted

The Flutter app (`apps/mobile`) is treated as a fully untrusted client, like a browser.
It:

- Never holds Clover client secrets, ecommerce private keys, or the webhook secret.
- Never talks to Clover's API directly. All Clover OAuth, order, payment, and refund
  operations happen server-side in `apps/api`.
- Never computes authoritative prices/totals. The backend recalculates subtotal, tax,
  fees, discounts, tip, and total from current menu data before every payment. Client
  submitted prices are informational only (`unitPriceCentsSnapshot` on cart items) and
  are ignored for money calculations.
- Stores only JWT access/refresh tokens locally, using `flutter_secure_storage` (Android
  Keystore / iOS Keychain backed), never plain files or `SharedPreferences`.

## 2. Card data never touches our systems

- Card numbers, CVVs, and full PANs are entered only inside Clover's hosted
  tokenization UI (Mode A: Ecommerce) or directly on Clover hardware (Mode B: Terminal).
- The mobile app and backend only ever see a **Clover-issued token/reference**, never
  raw card data.
- Raw card data is never stored in PostgreSQL, Redis, application logs, Crashlytics, or
  Analytics. This is enforced by:
  - The `Payment` Prisma model only has a `tokenReference` column (a Clover token id),
    never card fields.
  - A logging redaction interceptor (`LoggingRedactionInterceptor`, added Phase 2, applied
    globally in `AppModule`) strips `Authorization` headers and any field matching
    card/token/secret/password patterns - recursively, including nested objects - before
    anything is logged.
  - Firebase Crashlytics/Analytics event schemas (Phase 3) exclude payment payloads by
    construction - only order IDs/status/timing are ever sent.

## 3. Clover credentials

| Secret | Where it lives | Notes |
|---|---|---|
| `CLOVER_CLIENT_SECRET` | Backend env only | Used only during OAuth token exchange |
| `CLOVER_ECOMMERCE_PRIVATE_KEY` | Backend env only | Used only server-side to charge tokens |
| `CLOVER_WEBHOOK_SECRET` | Backend env only | Used to verify inbound webhook signatures |
| `CLOVER_ECOMMERCE_PUBLIC_KEY` | Backend env, served to client at runtime | Safe to expose - used to initialize Clover's hosted tokenization on-device; it cannot charge anything by itself |

Clover OAuth access/refresh tokens received per merchant are stored **encrypted at
rest** (`CloverConnection.accessTokenEncrypted` / `refreshTokenEncrypted`) using
AES-256-GCM with a random IV per value (`EncryptionService`, keyed by
`TOKEN_ENCRYPTION_KEY`), never in plaintext, and never returned to any client or
logged. Expired access tokens are refreshed server-side (`/oauth/v2/refresh`)
without ever exposing the refresh token to the client.

The OAuth connect flow (`CloverOAuthService`) uses a random, single-use, 10-minute
`state` token (stored server-side in Redis, never trusted from the client alone) to
bind the Clover redirect callback back to the restaurant location and admin user
that started the flow, mitigating CSRF on the connect flow.

Least-privilege: the Clover OAuth app requests only the scopes required for menu
sync (Phase 2), order creation, ecommerce payments, and refunds (Phase 4/5) -
nothing broader.

## 4. Authentication & authorization

- Every route requires a valid JWT access token by default (`JwtAuthGuard`, applied
  globally); a route must explicitly opt out with `@Public()` rather than the other way
  around, so a forgotten guard can never accidentally expose a protected endpoint.
- Passwords are hashed with **Argon2id** (never stored or logged in plain text).
  `login`/`forgotPassword` respond identically whether or not the email exists, to
  prevent account enumeration.
- Access tokens are short-lived JWTs (default 15m); refresh tokens **rotate** on every
  use and are stored hashed with SHA-256 (`RefreshToken.tokenHash`, never the raw
  token), so a leaked refresh token can be revoked and cannot be replayed after
  rotation. Resetting a password revokes every existing refresh token for that user.
- Role-based authorization (`UserRoleType`: `CUSTOMER`, `RESTAURANT_ADMIN`,
  `RESTAURANT_EMPLOYEE`) is enforced per-request via `RolesGuard`, plus
  restaurant/location scoping (`RestaurantScopeGuard`, checking
  `UserRole.restaurantId` / `restaurantLocationId` against the resource in the route
  params/query/body) so an employee or admin at one location cannot act on another
  location's data.
- Rate limiting (`ThrottlerModule`; global default plus tighter `@Throttle()` limits on
  `register`/`login`/`forgot-password`) mitigates brute-force and credential-stuffing
  attempts.

## 5. Payments are idempotent and server-confirmed

- Every payment-initiating request carries an idempotency key; duplicate submissions
  (double taps, retried network requests) are detected and short-circuited server-side
  rather than double-charging.
- An order is only marked `PAID` after the backend verifies the result **directly with
  Clover** (via API call and/or verified webhook) - never based solely on a client
  callback claiming success.

## 6. Webhooks

- Clover webhook payloads are verified using Clover's current recommended signature
  method before any processing.
- Invalid/unverifiable signatures are rejected immediately.
- Each event's Clover event ID is stored (`WebhookEvent.cloverEventId`, unique) to
  prevent duplicate/replayed processing - webhook delivery is treated as **at-least-once
  and out-of-order**, never exactly-once or ordered.
- The webhook endpoint returns quickly (2xx) and defers actual processing to an async
  worker; repeatedly failing events move to a dead-letter state instead of retrying
  forever.

## 7. Transport & infrastructure

- HTTPS-only in production (enforced at the load balancer/ingress; local dev uses plain
  HTTP against `localhost` only).
- `helmet` sets secure HTTP headers on every response.
- CORS is an explicit allowlist (`CORS_ALLOWED_ORIGINS`), not a wildcard.
- All database access goes through Prisma's parameterized queries - no raw string
  concatenation SQL - preventing SQL injection.
- Input validation via `class-validator` DTOs on every endpoint; unknown properties are
  rejected (`forbidNonWhitelisted`).

## 8. Secrets management

- `.env` files are git-ignored everywhere in this repo; only `.env.example` files (no
  real values) are committed.
- No secrets are ever hardcoded in the Flutter source tree - only the public API base
  URL and the public ecommerce key are baked into client builds.
- CI pipelines source secrets from GitHub Actions encrypted secrets, never from
  committed files.

## 9. Audit logging

Administrative actions with security or financial impact (status overrides, refunds,
Clover disconnect/reconnect, business-setting changes) are written to `AuditLog` with
actor, previous/new value, IP, and user agent, in addition to the order-specific
`OrderStatusHistory` trail.

## 10. Dependency & build security

- `npm audit` (backend/admin-web/shared packages) and `flutter pub outdated` (mobile) run
  in CI (`.github/workflows/dependency-scan.yml`) plus Dependabot for automated update
  PRs.
- Production Docker images are built from a minimal multi-stage `Dockerfile` (see
  `apps/api/Dockerfile`) that excludes dev dependencies and source maps from the final
  image.

## 11. Reporting a vulnerability

Until a dedicated security contact is established for this project (owner: to be filled
in by the business), report suspected vulnerabilities privately to the repository
maintainers rather than opening a public issue.
