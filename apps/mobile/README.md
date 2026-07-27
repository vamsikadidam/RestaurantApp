# Restaurant App (Flutter)

Customer-facing mobile app. See the root `README.md` for the full product/architecture
overview. This README covers local Flutter setup only.

## Phase 3 status

Implemented so far:

- App shell, Material 3 theme, Riverpod + GoRouter wiring with auth-aware redirects
  (`lib/core/router`).
- Secure session storage and JWT access/refresh handling with auto-retry-on-401
  (`lib/core/storage`, `lib/core/network`).
- Guest & customer authentication: register, login, guest session, forgot/reset
  password (`lib/features/auth`).
- Browse: restaurant header, open/closed + pickup/delivery availability banner, menu
  categories and items, search (`lib/features/menu`).
- Item detail with modifier-group selection (single/multi-choice, min/max validation),
  quantity, and special instructions.
- Local shopping cart with line-item merging, quantity edits, and a running subtotal
  estimate (`lib/features/cart`). Cart pricing here is a **client-side estimate only** -
  the backend recalculates authoritative totals at checkout (Phase 4).

Not yet implemented: checkout/payment, order tracking, account/profile, notifications,
and screens 2-28 beyond the above (added in Phases 4+).

**Important - verify locally:** Flutter/Dart SDKs were not available in the environment
that wrote this code, so none of it has been run through `flutter pub get`,
`flutter analyze`, or `flutter test` yet. All models in `lib/features/*/data/models` are
hand-written (not Freezed-generated) specifically so they can be read/reviewed directly
without codegen. Once you have Flutter installed, run `flutter pub get`,
`flutter analyze`, and `flutter test` first and fix anything that surfaces before
continuing - see steps below.

## Prerequisites

- Flutter SDK (stable channel, 3.24+) - https://docs.flutter.dev/get-started/install
- Android Studio (for the Android SDK/emulator) - required since this project is
  Android-first
- A running backend API (see `apps/api/README` section in the root README) reachable at
  the URL configured in `lib/core/config/app_config.dart`

## First-time setup

```bash
cd apps/mobile

# Generates android/ and ios/ platform projects for this existing pubspec/lib structure.
# Answer "yes" if prompted to overwrite - it will not touch lib/ or pubspec.yaml.
flutter create --org com.restaurant --project-name restaurant_app .

flutter pub get

# Sanity-check the hand-written code above (recommended before running the app).
flutter analyze
flutter test
```

## Running the app

This app is built per-restaurant, so `RESTAURANT_ID` must match a seeded restaurant in
your database (see `apps/api/prisma/seed.ts`).

```bash
# List devices/emulators
flutter devices

# Run against the local backend (Android emulator uses 10.0.2.2 for host localhost)
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1 \
  --dart-define=APP_ENV=development \
  --dart-define=RESTAURANT_ID=<your-seeded-restaurant-id>
```

## Testing

```bash
flutter test
```

`test/cart_controller_test.dart` covers the local cart logic (merging identical line
items, quantity/price math, removal) with no widget rendering required. Add widget tests
for screens as they stabilize.

## Firebase setup (required before Cloud Messaging/Crashlytics/Analytics work)

1. Create a Firebase project and register an Android app with the applicationId you
   configure in `android/app/build.gradle` (see `GOOGLE_PLAY_RELEASE_GUIDE.md`).
2. Download `google-services.json` and place it at `android/app/google-services.json`
   (git-ignored - never commit this file with real project data).
3. Firebase initialization code (Cloud Messaging/Crashlytics/Analytics) is added to
   `lib/main.dart` in a later phase, once push notifications (order status updates) are
   implemented alongside the backend webhook/notification pipeline.

## Notes on secrets

This app must never contain Clover client secrets, ecommerce private keys, or any other
server-only credential. Only the public API base URL is configured here. See the root
`SECURITY.md`.
