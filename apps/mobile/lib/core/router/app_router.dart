import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/splash/presentation/splash_screen.dart';

/// Route paths are centralized here so screens never hardcode navigation
/// strings. Onboarding, home, menu, cart, checkout, orders, and account
/// routes (screens 2-28 in the product spec) are added starting in Phase 3.
abstract class AppRoutes {
  static const splash = '/';
}

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: true,
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),
    ],
  );
});
