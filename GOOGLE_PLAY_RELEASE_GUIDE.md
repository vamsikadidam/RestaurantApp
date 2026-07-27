# Google Play Release Guide

This guide walks through everything needed to take `apps/mobile` from the current
development build to a production release on Google Play, for a **single restaurant's
branded app** (this codebase is built/published per merchant - see
`AppConfig.restaurantId` in `apps/mobile/lib/core/config/app_config.dart`).

Follow the sections in order the first time you release. Re-releases only need
§7-§10.

## 0. Prerequisites

- A Google Play Developer account (one-time $25 registration fee).
- The backend API (`apps/api`) deployed and reachable over HTTPS at a stable production
  URL - Play will not accept an app that only works against `localhost`/emulator
  addresses.
- The admin portal (`apps/admin-web`) deployed, so the public legal document URLs (§8)
  and account-deletion URL (§9) resolve for reviewers.
- Clover production (not sandbox) credentials configured on the backend - see
  `CLOVER_SETUP_GUIDE.md`.
- Firebase project created for this restaurant's app, with `google-services.json`
  downloaded (see `apps/mobile/README.md` for where it goes - it is intentionally
  gitignored, since it's environment-specific).

## 1. Choose and set the real application ID

The placeholder `com.restaurantapp.restaurant_app` must be replaced with a real,
reverse-DNS application ID you control (e.g. `com.acmepizza.app`), before the first
Play Console upload - **the application ID cannot be changed after the first release**.

1. Pick the ID and register/confirm the matching domain if you plan to use Android App
   Links.
2. In `apps/mobile/android/app/build.gradle.kts`, update:
   ```kotlin
   android {
       namespace = "com.acmepizza.app"
       defaultConfig {
           applicationId = "com.acmepizza.app"
           // ...
       }
   }
   ```
3. Update the Kotlin package path to match: move
   `apps/mobile/android/app/src/main/kotlin/com/restaurantapp/restaurant_app/MainActivity.kt`
   to `.../com/acmepizza/app/MainActivity.kt` and update its `package` declaration.
4. Re-download `google-services.json` from Firebase for the new package name and place
   it at `apps/mobile/android/app/google-services.json`.
5. Update the app's display name in
   `apps/mobile/android/app/src/main/AndroidManifest.xml` (`android:label`).

## 2. Replace app icons and branding

The current launcher icons under
`apps/mobile/android/app/src/main/res/mipmap-*/ic_launcher.png` are Flutter's default
placeholder icon.

1. Design a real launcher icon (1024x1024 source), plus an adaptive-icon
   foreground/background pair per
   [Android adaptive icon guidelines](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive).
2. Easiest path: add the
   [`flutter_launcher_icons`](https://pub.dev/packages/flutter_launcher_icons) dev
   dependency, configure it in `pubspec.yaml` pointing at your source image, and run:
   ```bash
   flutter pub run flutter_launcher_icons
   ```
   This regenerates every `mipmap-*` density automatically (also update
   `web/icons/Icon-*.png` and `web/favicon.png` if the web build is published anywhere).
3. Update `apps/mobile/android/app/src/main/res/values/styles.xml` and
   `values-night/styles.xml` launch background/theme colors to match your brand, and
   `drawable*/launch_background.xml` for the splash screen.
4. Confirm `apps/mobile/lib/core/theme/app_theme.dart` matches the restaurant's brand
   colors.

## 3. Configure release signing

Play requires every release build to be signed. Since Play App Signing is enabled by
default for new apps, you generate an **upload key** (used to sign what you send to
Google) while Google re-signs with the actual **app signing key** for distribution.

1. Generate an upload keystore (once per app, keep it safe - losing it and its
   passwords means you cannot update the app without contacting Google support):
   ```bash
   keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
2. **Never commit the keystore or its passwords to git.** Store `upload-keystore.jks`
   outside the repo (or in a secrets manager / CI secret store).
3. Create `apps/mobile/android/key.properties` (already covered by `.gitignore` -
   confirm it's not tracked) with:
   ```properties
   storePassword=<store password>
   keyPassword=<key password>
   keyAlias=upload
   storeFile=<absolute path to upload-keystore.jks>
   ```
4. Update `apps/mobile/android/app/build.gradle.kts` to load it and use it for the
   release build type, replacing the current debug-signing placeholder:
   ```kotlin
   import java.util.Properties
   import java.io.FileInputStream

   val keystoreProperties = Properties()
   val keystorePropertiesFile = rootProject.file("key.properties")
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(FileInputStream(keystorePropertiesFile))
   }

   android {
       // ...
       signingConfigs {
           create("release") {
               keyAlias = keystoreProperties["keyAlias"] as String?
               keyPassword = keystoreProperties["keyPassword"] as String?
               storeFile = keystoreProperties["storeFile"]?.let { file(it) }
               storePassword = keystoreProperties["storePassword"] as String?
           }
       }
       buildTypes {
           release {
               signingConfig = signingConfigs.getByName("release")
               isMinifyEnabled = true
               isShrinkResources = true
           }
       }
   }
   ```

## 4. Set version numbers

`apps/mobile/pubspec.yaml` controls both `versionName` (user-facing, e.g. `1.0.0`) and
`versionCode` (internal integer, must strictly increase every Play upload) via the
`version: 1.0.0+1` field (`name+code`). Bump this before every release build.

## 5. Build the release bundle

Google Play requires an **Android App Bundle** (`.aab`), not a raw `.apk`, for new apps.

```bash
cd apps/mobile
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://api.yourdomain.com/api/v1 \
  --dart-define=APP_ENV=production \
  --dart-define=RESTAURANT_ID=<this restaurant's UUID in the database>
```

The signed bundle is output to
`apps/mobile/build/app/outputs/bundle/release/app-release.aab`.

**Double-check the `--dart-define` values above** - `API_BASE_URL` must be the
production backend's public HTTPS URL (not an emulator/localhost address, see
`AppConfig`), and `RESTAURANT_ID` must be the correct restaurant row for this branded
app.

## 6. Create the app in Play Console

1. [Play Console](https://play.google.com/console) → **Create app** → set name, default
   language, app/game = App, free/paid.
2. Complete the **App content** section (see §7-9 below for the parts requiring care).
3. Set up **Store listing**: short/full description, screenshots (phone required,
   tablet optional), feature graphic, app icon.

## 7. Content rating questionnaire

Complete Play's content rating questionnaire honestly. A food-ordering app with no
user-generated content, no gambling, and no mature content should receive the lowest
rating tier, but answer based on the actual app.

## 8. Privacy policy URL

Play requires a **public, always-accessible** privacy policy URL. Once
`legal/privacy-policy.md` has been reviewed by counsel and finalized (see
`legal/README.md`), its content is rendered at:

```
https://<your-admin-web-deployment>/legal/privacy-policy
```

(implemented in `apps/admin-web/src/app/legal/privacy-policy/page.tsx`). Enter that URL
in Play Console → App content → Privacy policy. The other legal documents
(`/legal/terms-and-conditions`, `/legal/refund-cancellation-policy`,
`/legal/delivery-policy`, `/legal/account-deletion-policy`, `/legal/data-retention-policy`)
are reachable from `/legal` and should be linked from the app itself (e.g. a Settings/
Legal screen) and/or your store listing description.

## 9. Data Safety form

This is the most commonly rejected/misfilled section - fill it in based on what the app
**actually does**, cross-referenced against `SECURITY.md` and `legal/privacy-policy.md`:

| Data type | Collected? | Shared? | Purpose | Notes |
|---|---|---|---|---|
| Name, email, phone number | Yes | With the restaurant you order from (via Clover), for order fulfillment | Account functionality, order fulfillment | Encrypted in transit; deletable (see below) |
| Address (delivery address) | Yes, if delivery is used | With the restaurant/delivery fulfillment | App functionality | Deletable |
| User IDs (internal account ID) | Yes | No | Account functionality | Deletable |
| Purchase history (orders) | Yes | With the restaurant, and Clover for payment processing | App functionality, fraud prevention | Retained in anonymized form after account deletion - see `legal/data-retention-policy.md` |
| Financial info (card numbers) | **No** - never collected/stored by this app or its backend | N/A | N/A | Entered directly into Clover's tokenized/hosted flow or Clover hardware - see `SECURITY.md` §2 |
| Device/other IDs (push token) | Yes | With Firebase Cloud Messaging | App functionality (order status notifications) | Deletable by disabling notifications / deleting account |
| App interactions / diagnostics (crash logs, analytics) | Yes | With Firebase/Google | Analytics, crash reporting | Anonymized/aggregated; designed to exclude order/payment content |

Also answer explicitly:

- **Is data encrypted in transit?** Yes (HTTPS/TLS everywhere - see `SECURITY.md`).
- **Can users request data deletion?** Yes - link the public account-deletion page:
  ```
  https://<your-admin-web-deployment>/account-deletion
  ```
  implemented in `apps/admin-web/src/app/account-deletion/page.tsx`, backed by
  `POST /auth/account-deletion` (`apps/api/src/auth/auth.service.ts`,
  `requestAccountDeletion`). This is required even though the same flow should
  eventually also exist inside the app itself - Play explicitly requires it be
  reachable **without** installing/opening the app.
- **Is data collection optional?** Account creation is required to place orders (guest
  checkout, if enabled, avoids persistent account data beyond the order record itself).

## 10. Payments / financial features declaration

Declare this app's payment functionality accurately in Play Console → App content:

- This app **facilitates payment for real-world goods and services (prepared food)**
  processed by a third-party payment processor (Clover), which is **compliant** with
  Play policy and does **not** require Google Play Billing.
- Google Play Billing is only required for digital goods/in-app content, which this app
  does not sell. Do not add Play Billing - see the note already in this repo about that
  decision.

## 11. Target audience and ads

- Set the target age group honestly (this app is not directed at children - see
  `legal/privacy-policy.md` §7 for the minimum age placeholder, which must be finalized
  before submission).
- Declare whether the app contains ads (likely "No" for a single-restaurant ordering
  app).

## 12. Internal testing track

Before Production, upload the signed `.aab` to the **Internal testing** track first:

1. Play Console → Testing → Internal testing → Create release.
2. Upload `app-release.aab`, add release notes.
3. Add internal tester emails (Google accounts) under the testing track's tester list.
4. Share the opt-in URL with testers; install and smoke-test:
   - Registration, login, forgot password
   - Browse menu, add to cart, checkout, pay (use a real low-value order against Clover
     production, or a Clover sandbox/test merchant if not yet live)
   - Push notification delivery on order status change
   - Account deletion flow end-to-end (both in future in-app and via the web page)

## 13. Closed/open testing (optional but recommended)

Consider a closed testing track with a handful of real customers before full Production,
especially for the first release, to catch device-specific issues (different Android
versions/OEMs) that internal testing might miss.

## 14. Promote to Production

1. Play Console → Production → Create release → select the tested build (or upload a
   new one with a bumped `versionCode`).
2. Set a staged rollout percentage (e.g. start at 20%) rather than 100% immediately, to
   limit blast radius if an issue surfaces.
3. Submit for review. Initial review can take from a few hours to a few days; app
   updates are typically faster.

## 15. Post-launch: releasing updates

For every subsequent release:

1. Bump `version` in `apps/mobile/pubspec.yaml` (`versionCode` **must** increase).
2. Rebuild with `flutter build appbundle --release` using the same production
   `--dart-define` values (§5) and the same upload keystore (§3).
3. Upload to Internal testing first, verify, then promote the same build to Production
   (Play Console lets you promote a release across tracks without re-uploading).

## 16. Common rejection reasons to double-check before submitting

- Privacy policy URL is broken, or doesn't match actual data practices (§8-9).
- Account deletion is not reachable without logging in / outside the app (§9).
- App crashes on launch on a fresh device (test on a real device or a fresh emulator
  image, not just your dev machine with cached state).
- Screenshots/store listing show functionality not present in the actual build.
- Misdeclared payment functionality (§10) - this app must **not** claim or use Google
  Play Billing for physical food orders.
- Sensitive permissions requested without a matching, justified use case declared in
  Play Console (this app should only need network access and notification permissions
  - review `apps/mobile/android/app/src/main/AndroidManifest.xml` if any other
  permission has been added and confirm it's actually needed).

## 17. Reference: important early decisions already reflected in the codebase

- **No Google Play Billing** is used for food orders - those are physical goods/services
  paid via Clover, per Play policy on real-world goods. This is documented so it isn't
  accidentally "fixed" later by adding Billing.
- The Flutter app (`apps/mobile`) ships with a placeholder `applicationId`
  (`com.restaurantapp.restaurant_app`); the real one is set by following §1 of this
  guide before the first release.
- This app is built and published **once per restaurant** (a distinct app listing,
  application ID, and Firebase project per merchant) - `RESTAURANT_ID` is baked in at
  build time via `--dart-define`, not selected by the customer at runtime.
