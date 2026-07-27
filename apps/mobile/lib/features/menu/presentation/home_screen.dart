import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/router/app_router.dart';
import '../../../core/utils/money_formatter.dart';
import '../../../core/widgets/async_value_widget.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/application/auth_state.dart';
import '../../cart/presentation/widgets/cart_badge_icon.dart';
import '../application/menu_providers.dart';
import '../data/models/menu_models.dart';
import 'widgets/menu_item_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final restaurantAsync = ref.watch(restaurantProvider);
    final authState = ref.watch(authControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(restaurantAsync.valueOrNull?.name ?? 'Menu'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => context.push(AppRoutes.search),
          ),
          IconButton(
            icon: Icon(
                authState.isSignedIn ? Icons.person : Icons.person_outline),
            onPressed: () => _handleAccountTap(context, ref, authState),
          ),
          CartBadgeIcon(onTap: () => context.push(AppRoutes.cart)),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(restaurantProvider);
          ref.invalidate(menuProvider);
          ref.invalidate(availabilityProvider);
        },
        child: AsyncValueWidget<Restaurant>(
          value: restaurantAsync,
          onRetry: () => ref.invalidate(restaurantProvider),
          data: (restaurant) => _HomeBody(restaurant: restaurant),
        ),
      ),
    );
  }

  void _handleAccountTap(
      BuildContext context, WidgetRef ref, AuthState authState) {
    if (!authState.isSignedIn) {
      context.push(AppRoutes.welcome);
      return;
    }

    showModalBottomSheet<void>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.person_outline),
              title: Text(authState.user?.displayName ?? 'Account'),
              subtitle: Text(authState.status == AuthStatus.guest
                  ? 'Guest session'
                  : 'Signed in'),
            ),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Log out'),
              onTap: () {
                Navigator.of(context).pop();
                ref.read(authControllerProvider.notifier).logout();
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeBody extends ConsumerWidget {
  final Restaurant restaurant;

  const _HomeBody({required this.restaurant});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final menuAsync = ref.watch(menuProvider);
    final availabilityAsync = ref.watch(availabilityProvider);
    final moneyFormatter = ref.watch(moneyFormatterProvider);

    return CustomScrollView(
      slivers: [
        if (restaurant.bannerUrl != null)
          SliverToBoxAdapter(
            child: CachedNetworkImage(
              imageUrl: restaurant.bannerUrl!,
              height: 160,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
        SliverToBoxAdapter(
          child: availabilityAsync.maybeWhen(
            data: (availability) => availability.isOpenNow
                ? const SizedBox.shrink()
                : _ClosedBanner(reason: availability.reason),
            orElse: () => const SizedBox.shrink(),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: AsyncValueSliver(
            value: menuAsync,
            onRetry: () => ref.invalidate(menuProvider),
            data: (categories) => _MenuList(
                categories: categories, moneyFormatter: moneyFormatter),
          ),
        ),
      ],
    );
  }
}

/// Sliver-friendly variant of AsyncValueWidget (a plain widget can't be
/// placed directly inside a sliver list without wrapping it).
class AsyncValueSliver<T> extends StatelessWidget {
  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final VoidCallback? onRetry;

  const AsyncValueSliver(
      {super.key, required this.value, required this.data, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: value.when(
        data: data,
        loading: () => const Padding(
          padding: EdgeInsets.symmetric(vertical: 48),
          child: Center(child: CircularProgressIndicator()),
        ),
        error: (error, stackTrace) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 48),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Could not load the menu.'),
                if (onRetry != null)
                  TextButton(
                      onPressed: onRetry, child: const Text('Try again')),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MenuList extends StatelessWidget {
  final List<MenuCategory> categories;
  final MoneyFormatter moneyFormatter;

  const _MenuList({required this.categories, required this.moneyFormatter});

  @override
  Widget build(BuildContext context) {
    if (categories.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 48),
        child: Center(child: Text('This menu is not available yet.')),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final category in categories) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 8, top: 8),
            child: Text(category.name,
                style: Theme.of(context).textTheme.titleLarge),
          ),
          for (final item in category.items)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: MenuItemCard(
                item: item,
                moneyFormatter: moneyFormatter,
                onTap: () => context.push(AppRoutes.itemDetailPath(item.id)),
              ),
            ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}

class _ClosedBanner extends StatelessWidget {
  final String? reason;

  const _ClosedBanner({this.reason});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      color: theme.colorScheme.errorContainer,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Icon(Icons.info_outline,
              color: theme.colorScheme.onErrorContainer, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              reason ?? 'This restaurant is currently closed.',
              style: TextStyle(color: theme.colorScheme.onErrorContainer),
            ),
          ),
        ],
      ),
    );
  }
}
