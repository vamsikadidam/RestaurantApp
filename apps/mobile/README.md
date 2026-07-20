# Restaurant App (Flutter)

Customer-facing mobile app. See the root `README.md` for the full product/architecture
overview. This README covers local Flutter setup only.

## Phase 1 status

This app is currently a **scaffold**: app shell, Material 3 theme, and a Riverpod +
GoRouter wiring with a single splash route. Screens 2-28 (onboarding, menu, cart,
checkout, Clover payment, order tracking, profile, etc.) are built starting in Phase 3.

Flutter/Dart SDKs are not installed in the environment that generated this scaffold, so
the `android/` and `ios/` platform folders have **not** been generated yet. Follow the
steps below on a machine with Flutter installed.

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

# Only needed once Freezed/json_serializable models exist (Phase 3+).
dart run build_runner build --delete-conflicting-outputs
```

## Running the app

```bash
# List devices/emulators
flutter devices

# Run against the local backend (Android emulator uses 10.0.2.2 for host localhost)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1 --dart-define=APP_ENV=development
```

## Testing

```bash
flutter test
```

## Firebase setup (required before Cloud Messaging/Crashlytics/Analytics work)

1. Create a Firebase project and register an Android app with the applicationId you
   configure in `android/app/build.gradle` (see `GOOGLE_PLAY_RELEASE_GUIDE.md`).
2. Download `google-services.json` and place it at `android/app/google-services.json`
   (git-ignored - never commit this file with real project data).
3. Firebase initialization code is added to `lib/main.dart` in Phase 3+.

## Notes on secrets

This app must never contain Clover client secrets, ecommerce private keys, or any other
server-only credential. Only the public API base URL is configured here. See the root
`SECURITY.md`.
