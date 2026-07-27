/// Hand-written models mirroring apps/api/src/restaurants and
/// apps/api/src/menu response shapes. See note in
/// features/auth/data/models/auth_models.dart about why these aren't
/// Freezed-generated in this environment.
class Restaurant {
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? logoUrl;
  final String? bannerUrl;
  final String currency;
  final List<RestaurantLocation> locations;

  const Restaurant({
    required this.id,
    required this.name,
    required this.slug,
    required this.currency,
    this.description,
    this.logoUrl,
    this.bannerUrl,
    this.locations = const [],
  });

  RestaurantLocation? get primaryLocation {
    if (locations.isEmpty) return null;
    return locations.firstWhere((l) => l.isPrimary,
        orElse: () => locations.first);
  }

  factory Restaurant.fromJson(Map<String, dynamic> json) {
    return Restaurant(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      description: json['description'] as String?,
      logoUrl: json['logoUrl'] as String?,
      bannerUrl: json['bannerUrl'] as String?,
      currency: json['currency'] as String? ?? 'USD',
      locations: (json['locations'] as List<dynamic>? ?? [])
          .map((e) => RestaurantLocation.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class RestaurantLocation {
  final String id;
  final String name;
  final String addressLine1;
  final String? addressLine2;
  final String city;
  final String state;
  final String postalCode;
  final String? phone;
  final String timezone;
  final bool isPrimary;
  final bool pickupEnabled;
  final bool deliveryEnabled;
  final int minimumOrderAmountCents;
  final int deliveryFeeCents;
  final int defaultPrepTimeMinutes;
  final List<int> tipPresetsBasisPoints;

  const RestaurantLocation({
    required this.id,
    required this.name,
    required this.addressLine1,
    required this.city,
    required this.state,
    required this.postalCode,
    required this.timezone,
    required this.isPrimary,
    required this.pickupEnabled,
    required this.deliveryEnabled,
    required this.minimumOrderAmountCents,
    required this.deliveryFeeCents,
    required this.defaultPrepTimeMinutes,
    required this.tipPresetsBasisPoints,
    this.addressLine2,
    this.phone,
  });

  String get shortAddress => '$addressLine1, $city, $state $postalCode';

  factory RestaurantLocation.fromJson(Map<String, dynamic> json) {
    return RestaurantLocation(
      id: json['id'] as String,
      name: json['name'] as String,
      addressLine1: json['addressLine1'] as String,
      addressLine2: json['addressLine2'] as String?,
      city: json['city'] as String,
      state: json['state'] as String,
      postalCode: json['postalCode'] as String,
      phone: json['phone'] as String?,
      timezone: json['timezone'] as String? ?? 'America/New_York',
      isPrimary: json['isPrimary'] as bool? ?? false,
      pickupEnabled: json['pickupEnabled'] as bool? ?? true,
      deliveryEnabled: json['deliveryEnabled'] as bool? ?? true,
      minimumOrderAmountCents: json['minimumOrderAmountCents'] as int? ?? 0,
      deliveryFeeCents: json['deliveryFeeCents'] as int? ?? 0,
      defaultPrepTimeMinutes: json['defaultPrepTimeMinutes'] as int? ?? 25,
      tipPresetsBasisPoints: (json['tipPresetsBasisPoints'] as List<dynamic>? ??
              [1000, 1500, 1800, 2000])
          .map((e) => e as int)
          .toList(),
    );
  }
}

class RestaurantAvailability {
  final bool isOpenNow;
  final bool pickupAvailable;
  final bool deliveryAvailable;
  final String? reason;

  const RestaurantAvailability({
    required this.isOpenNow,
    required this.pickupAvailable,
    required this.deliveryAvailable,
    this.reason,
  });

  factory RestaurantAvailability.fromJson(Map<String, dynamic> json) {
    return RestaurantAvailability(
      isOpenNow: json['isOpenNow'] as bool? ?? false,
      pickupAvailable: json['pickupAvailable'] as bool? ?? false,
      deliveryAvailable: json['deliveryAvailable'] as bool? ?? false,
      reason: json['reason'] as String?,
    );
  }
}

class MenuCategory {
  final String id;
  final String name;
  final String? description;
  final String? imageUrl;
  final int displayOrder;
  final List<MenuItemSummary> items;

  const MenuCategory({
    required this.id,
    required this.name,
    required this.displayOrder,
    this.description,
    this.imageUrl,
    this.items = const [],
  });

  factory MenuCategory.fromJson(Map<String, dynamic> json) {
    return MenuCategory(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      imageUrl: json['imageUrl'] as String?,
      displayOrder: json['displayOrder'] as int? ?? 0,
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => MenuItemSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class MenuItemSummary {
  final String id;
  final String? categoryId;
  final String name;
  final String? description;
  final int priceCents;
  final String? imageUrl;
  final bool isAvailable;
  final bool isFeatured;

  const MenuItemSummary({
    required this.id,
    required this.name,
    required this.priceCents,
    required this.isAvailable,
    required this.isFeatured,
    this.categoryId,
    this.description,
    this.imageUrl,
  });

  factory MenuItemSummary.fromJson(Map<String, dynamic> json) {
    return MenuItemSummary(
      id: json['id'] as String,
      categoryId: json['categoryId'] as String?,
      name: json['name'] as String,
      description: json['description'] as String?,
      priceCents: json['priceCents'] as int,
      imageUrl: json['imageUrl'] as String?,
      isAvailable: json['isAvailable'] as bool? ?? true,
      isFeatured: json['isFeatured'] as bool? ?? false,
    );
  }
}

class MenuItemDetail extends MenuItemSummary {
  final int taxRateBasisPoints;
  final List<ModifierGroup> modifierGroups;

  const MenuItemDetail({
    required super.id,
    required super.name,
    required super.priceCents,
    required super.isAvailable,
    required super.isFeatured,
    required this.taxRateBasisPoints,
    this.modifierGroups = const [],
    super.categoryId,
    super.description,
    super.imageUrl,
  });

  factory MenuItemDetail.fromJson(Map<String, dynamic> json) {
    return MenuItemDetail(
      id: json['id'] as String,
      categoryId: json['categoryId'] as String?,
      name: json['name'] as String,
      description: json['description'] as String?,
      priceCents: json['priceCents'] as int,
      imageUrl: json['imageUrl'] as String?,
      isAvailable: json['isAvailable'] as bool? ?? true,
      isFeatured: json['isFeatured'] as bool? ?? false,
      taxRateBasisPoints: json['taxRateBasisPoints'] as int? ?? 0,
      modifierGroups: (json['modifierGroups'] as List<dynamic>? ?? [])
          .map((e) => ModifierGroup.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ModifierGroup {
  final String id;
  final String name;
  final int minSelect;
  final int? maxSelect;
  final bool isRequired;
  final List<ModifierOption> options;

  const ModifierGroup({
    required this.id,
    required this.name,
    required this.minSelect,
    required this.isRequired,
    this.maxSelect,
    this.options = const [],
  });

  /// Whether this group allows more than one selection (checkboxes) or
  /// exactly one (radio buttons) - `maxSelect == 1` is the common "choose
  /// one" case; anything else (including unlimited/null) renders as
  /// multi-select with quantity steppers per option.
  bool get isSingleChoice => maxSelect == 1;

  factory ModifierGroup.fromJson(Map<String, dynamic> json) {
    return ModifierGroup(
      id: json['id'] as String,
      name: json['name'] as String,
      minSelect: json['minSelect'] as int? ?? 0,
      maxSelect: json['maxSelect'] as int?,
      isRequired: json['isRequired'] as bool? ?? false,
      options: (json['options'] as List<dynamic>? ?? [])
          .map((e) => ModifierOption.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ModifierOption {
  final String id;
  final String name;
  final int priceCents;
  final int maxQuantity;
  final bool isAvailable;

  const ModifierOption({
    required this.id,
    required this.name,
    required this.priceCents,
    required this.maxQuantity,
    required this.isAvailable,
  });

  factory ModifierOption.fromJson(Map<String, dynamic> json) {
    return ModifierOption(
      id: json['id'] as String,
      name: json['name'] as String,
      priceCents: json['priceCents'] as int,
      maxQuantity: json['maxQuantity'] as int? ?? 1,
      isAvailable: json['isAvailable'] as bool? ?? true,
    );
  }
}
