import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/app_config.dart';
import '../../../core/network/dio_providers.dart';
import '../../../core/utils/money_formatter.dart';
import '../data/menu_repository.dart';
import '../data/models/menu_models.dart';

final menuRepositoryProvider = Provider<MenuRepository>((ref) {
  return MenuRepository(ref.watch(apiDioProvider));
});

/// This app is single-restaurant (see AppConfig.restaurantId), so these
/// providers don't take a restaurantId parameter - they're scoped to the
/// one restaurant this build targets.
final restaurantProvider = FutureProvider<Restaurant>((ref) {
  return ref
      .watch(menuRepositoryProvider)
      .getRestaurant(AppConfig.restaurantId);
});

final availabilityProvider = FutureProvider<RestaurantAvailability>((ref) {
  return ref
      .watch(menuRepositoryProvider)
      .getAvailability(AppConfig.restaurantId);
});

final menuProvider = FutureProvider<List<MenuCategory>>((ref) {
  return ref.watch(menuRepositoryProvider).getMenu(AppConfig.restaurantId);
});

final menuItemProvider =
    FutureProvider.family<MenuItemDetail, String>((ref, itemId) {
  return ref.watch(menuRepositoryProvider).getItem(itemId);
});

final menuSearchQueryProvider = StateProvider<String>((ref) => '');

final menuSearchResultsProvider = FutureProvider<List<MenuItemSummary>>((ref) {
  final query = ref.watch(menuSearchQueryProvider);
  return ref
      .watch(menuRepositoryProvider)
      .search(AppConfig.restaurantId, query);
});

/// Falls back to USD while the restaurant is still loading so screens don't
/// need to special-case a null formatter during the initial fetch.
final moneyFormatterProvider = Provider<MoneyFormatter>((ref) {
  final restaurant = ref.watch(restaurantProvider).valueOrNull;
  return MoneyFormatter(currency: restaurant?.currency ?? 'USD');
});
