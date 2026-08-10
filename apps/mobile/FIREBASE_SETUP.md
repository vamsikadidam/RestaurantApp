# Firebase setup for India Garden (`com.indiagarden.app`)

Push notifications, Crashlytics, and Analytics need a Firebase project before
production. The app already depends on the FlutterFire packages; only the
project config files are missing (they are gitignored on purpose).

## Steps

1. Create a Firebase project at https://console.firebase.google.com (e.g. `india-garden-scv`).
2. Add an **Android** app with package name exactly:
   ```
   com.indiagarden.app
   ```
3. Download `google-services.json` and place it at:
   ```
   apps/mobile/android/app/google-services.json
   ```
4. In `apps/mobile/android/settings.gradle.kts` / `app/build.gradle.kts`, ensure the
   Google Services plugin is applied (FlutterFire docs:
   https://firebase.google.com/docs/flutter/setup).
5. Enable **Cloud Messaging**, **Crashlytics**, and **Analytics** in the Firebase console.
6. Create a Firebase **service account** for the NestJS API (push sending), download the
   JSON key, and set on Render:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (keep `\n` escapes)

Until this is done, the app runs without real push/crash reporting.
