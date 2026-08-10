# Deployment guide (Render + Vercel) — India Garden SCV

This guide takes the India Garden backend and admin portal from local development to
production. The mobile app's Play Store steps are in `GOOGLE_PLAY_RELEASE_GUIDE.md`.
Firebase setup for the Android app is in `apps/mobile/FIREBASE_SETUP.md`.

**Restaurant:** India Garden · 24341 Magic Mountain Pkwy, Santa Clarita, CA 91355  
**Website:** https://indiagardenscv.com/  
**Android applicationId:** `com.indiagarden.app`

| Piece | Where it deploys | Config in repo |
|---|---|---|
| API (`apps/api`) + Postgres + Redis | [Render](https://render.com) | `render.yaml` |
| Admin portal (`apps/admin-web`) | [Vercel](https://vercel.com) | `apps/admin-web/vercel.json` |
| Customer app (`apps/mobile`) | Google Play | `GOOGLE_PLAY_RELEASE_GUIDE.md` |

## 1. Deploy the backend on Render

### Prerequisites

- A GitHub (or GitLab/Bitbucket) repo with this codebase pushed.
- A [Render](https://dashboard.render.com) account.

### Create the Blueprint

1. Open [Render Dashboard → New → Blueprint](https://dashboard.render.com/blueprints).
2. Connect this repository and select the branch to deploy (usually `main`).
3. Render reads `render.yaml` and will create:
   - `restaurant-postgres` (Postgres 16)
   - `restaurant-redis` (Key Value / Redis-compatible)
   - `restaurant-api` (Docker web service from `apps/api/Dockerfile`)
4. For every env var marked `sync: false` in `render.yaml`, Render prompts you to
   enter a value. For the **first** deploy you can leave Clover/Firebase blank (or put
   a placeholder) and keep `CLOVER_USE_MOCK_CLIENT=true` so the API boots with the mock
   Clover adapter. You **must** set:
   - `CORS_ALLOWED_ORIGINS` — temporarily use `*` only if you accept the risk, or set
     it after Vercel gives you a URL (step 2), then redeploy. Recommended: leave it as
     your Vercel URL once known, e.g. `https://indiagarden-admin.vercel.app`.
5. Click **Apply**. Wait for the first deploy to finish (build + `prisma migrate deploy`
   via `preDeployCommand` + start).
6. Copy the public API URL from the service page, e.g.
   `https://restaurant-api.onrender.com`. Health check:
   `https://restaurant-api.onrender.com/api/v1/health`.

### Seed admin users (one-time)

Render does **not** run the Prisma seed automatically. After the first successful
deploy, open a Render shell on `restaurant-api` (or run against the public
`DATABASE_URL` from a trusted machine) and seed:

```bash
# From apps/api inside the running service, if a shell is available:
npx prisma db seed
```

Or run seed locally pointed at the production `DATABASE_URL` (only from a trusted
machine — never commit that URL):

```bash
cd apps/api
DATABASE_URL="postgresql://..." npx prisma db seed
```

### When you have real Clover / Firebase credentials

In Render → `restaurant-api` → Environment, set:

- `CLOVER_ENVIRONMENT=sandbox` (or `production` when live)
- `CLOVER_CLIENT_ID` / `CLOVER_CLIENT_SECRET` / `CLOVER_MERCHANT_ID`
- `CLOVER_REDIRECT_URI=https://<your-api-host>/api/v1/integrations/clover/oauth/callback`
- `CLOVER_WEBHOOK_SECRET`, ecommerce keys as needed
- `CLOVER_USE_MOCK_CLIENT=false`
- Firebase Admin fields for push notifications

See `CLOVER_SETUP_GUIDE.md`.

## 2. Deploy the admin portal on Vercel

1. Open [Vercel](https://vercel.com) → **Add New Project** → import this repo.
2. Set **Root Directory** to `apps/admin-web` (important for the monorepo).
3. Framework preset: Next.js. The `vercel.json` in that folder already sets
   `installCommand` / `buildCommand` so shared packages (`shared-types`, `api-client`)
   are built before the Next.js build.
4. Add environment variable:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://restaurant-api.onrender.com`
     (no `/api/v1` suffix — the shared client appends paths itself; confirm against
     `apps/admin-web/src/lib/api-client.ts` if you change the client).
5. Deploy. Copy the resulting URL, e.g. `https://indiagarden-admin.vercel.app`.
6. Go back to Render → `restaurant-api` → Environment and set:
   ```
   CORS_ALLOWED_ORIGINS=https://indiagarden-admin.vercel.app
   ```
   Save and redeploy the API so the admin portal can call it from the browser.

### Verify

- Open `https://<admin>/login` and sign in with a seeded restaurant admin.
- Open `https://<admin>/legal` and `https://<admin>/account-deletion` (public pages).
- Open `https://<api>/api/v1/docs` (Swagger).

## 3. Point the mobile app at production

Once the API URL is stable, release builds must use it:

```bash
cd apps/mobile
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://restaurant-api.onrender.com/api/v1 \
  --dart-define=APP_ENV=production \
  --dart-define=RESTAURANT_ID=<your restaurant UUID from the DB>
```

Release signing is already wired via `apps/mobile/android/key.properties` and
`upload-keystore.jks` (both gitignored). See `GOOGLE_PLAY_RELEASE_GUIDE.md` for Play
Console steps.

## 4. Checklist before calling this "live"

- [ ] Render API health endpoint returns OK
- [ ] Prisma migrations applied (`preDeployCommand` succeeded)
- [ ] Seed data / first restaurant admin exists
- [ ] Vercel admin portal loads and can log in
- [ ] `CORS_ALLOWED_ORIGINS` includes the Vercel URL
- [ ] Privacy policy + account deletion URLs publicly reachable (for Play Console)
- [ ] Clover sandbox or production credentials configured when you leave mock mode
- [ ] Firebase project + `google-services.json` for `com.indiagarden.app`
- [ ] Mobile release `.aab` built with production `--dart-define` values

## Cost notes (approximate, subject to change)

- Render: Postgres + Starter web service are paid; Key Value has a free plan option
  used in `render.yaml`.
- Vercel: hobby tier is usually enough for the admin portal at low traffic.
- Google Play: one-time $25 developer registration.
