# Google Play Release Guide

> **Status: placeholder.** This guide is fully written in **Phase 7** of the build plan
> (see root `README.md`), once the Flutter app, backend, and privacy/legal docs are
> complete enough to actually submit for review. It is created now so the documented
> project structure exists from the start.

Once complete, this document will explain how to:

1. Change the application ID (`com.company.restaurant` placeholder → real ID)
2. Replace app icons (adaptive launcher icon foreground/background)
3. Configure release signing (upload keystore, `key.properties`, Play App Signing)
4. Generate a signed `.aab` (Android App Bundle) release build
5. Upload the bundle to Play Console
6. Complete the Data Safety form accurately for this app's actual data collection
7. Declare payment/financial functionality accurately (Clover-processed payments for
   physical goods/services - **not** Google Play Billing)
8. Provide a privacy policy URL
9. Provide the public account-deletion request page URL (see §18 of the product spec)
10. Test through Internal Testing
11. Promote a tested release to Production
12. Increase `versionCode`/`versionName` for future releases

## Important early decisions already reflected in the codebase

- **No Google Play Billing** is used for food orders - those are physical goods/services
  paid via Clover, per Play policy on real-world goods. This is documented so it isn't
  accidentally "fixed" later by adding Billing.
- The Flutter app (`apps/mobile`) is configured with a placeholder `applicationId`; the
  real one is set by following this guide once finalized.
- Minimal Android permissions and a network security config are added when the Android
  platform project is generated (Phase 3+, see `apps/mobile/README.md`).
