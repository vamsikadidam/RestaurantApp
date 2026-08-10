import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/application/auth_state.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/auth/presentation/welcome_screen.dart';
import '../../features/cart/presentation/cart_screen.dart';
import '../../features/checkout/data/models/checkout_models.dart';
import '../../features/checkout/presentation/checkout_screen.dart';
import '../../features/checkout/presentation/order_confirmation_screen.dart';
import '../../features/menu/presentation/home_screen.dart';
import '../../features/menu/presentation/item_detail_screen.dart';
import '../../features/menu/presentation/search_screen.dart';
import '../../features/splash/presentation/splash_screen.dart';
import 'router_refresh_notifier.dart';

/// Route paths are centralized here so screens never hardcode navigation
/// strings.
abstract class AppRoutes {
  static const splash = '/';
  static const welcome = '/welcome';
  static const login = '/login';
  static const register = '/register';
  static const forgotPassword = '/forgot-password';
  static const home = '/home';
  static const cart = '/cart';
  static const checkout = '/checkout';
  static const search = '/search';
  static const itemDetail = '/item/:itemId';
  static const orderConfirmation = '/orders/:orderId/confirmation';

  static String itemDetailPath(String itemId) => '/item/$itemId';
  static String orderConfirmationPath(String orderId) =>
      '/orders/$orderId/confirmation';
}

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: true,
    refreshListenable: ref.watch(routerRefreshNotifierProvider),
    redirect: (context, state) {
      final authState = ref.read(authControllerProvider);
      final location = state.matchedLocation;

      // Still restoring a saved session from secure storage - keep the
      // splash screen up rather than flashing the welcome/home screen.
      if (authState.isLoading) {
        return location == AppRoutes.splash ? null : AppRoutes.splash;
      }

      // Browsing the menu never requires an account (see MenuModule
      // @Public() endpoints) - only the splash screen forces a redirect,
      // straight to home.
      if (location == AppRoutes.splash) {
        return AppRoutes.home;
      }

      // A signed-in user doesn't need the welcome/login/register screens.
      final isAuthEntryRoute = {
        AppRoutes.welcome,
        AppRoutes.login,
        AppRoutes.register,
      }.contains(location);
      if (isAuthEntryRoute && authState.status != AuthStatus.unauthenticated) {
        return AppRoutes.home;
      }

      // Checkout requires a session (customer or guest).
      if (location == AppRoutes.checkout &&
          authState.status == AuthStatus.unauthenticated) {
        return AppRoutes.welcome;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: AppRoutes.welcome,
        name: 'welcome',
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.register,
        name: 'register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        name: 'forgotPassword',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: AppRoutes.home,
        name: 'home',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: AppRoutes.cart,
        name: 'cart',
        builder: (context, state) => const CartScreen(),
      ),
      GoRoute(
        path: AppRoutes.checkout,
        name: 'checkout',
        builder: (context, state) => const CheckoutScreen(),
      ),
      GoRoute(
        path: AppRoutes.orderConfirmation,
        name: 'orderConfirmation',
        builder: (context, state) {
          final order = state.extra;
          if (order is OrderSummary) {
            return OrderConfirmationScreen(order: order);
          }
          // Deep-link / refresh fallback when extra is missing.
          return OrderConfirmationScreen(
            order: OrderSummary(
              id: state.pathParameters['orderId'] ?? 'unknown',
              publicOrderNumber: state.pathParameters['orderId'] ?? 'unknown',
              status: 'PAID',
              totalCents: 0,
              currency: 'USD',
              tipCents: 0,
              taxCents: 0,
              subtotalCents: 0,
              serviceFeeCents: 0,
              deliveryFeeCents: 0,
            ),
          );
        },
      ),
      GoRoute(
        path: AppRoutes.search,
        name: 'search',
        builder: (context, state) => const SearchScreen(),
      ),
      GoRoute(
        path: AppRoutes.itemDetail,
        name: 'itemDetail',
        builder: (context, state) =>
            ItemDetailScreen(itemId: state.pathParameters['itemId']!),
      ),
    ],
  );
});
