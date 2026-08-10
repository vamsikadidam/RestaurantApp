class ServerCartPricing {
  final int subtotalCents;
  final int taxCents;
  final int serviceFeeCents;
  final int deliveryFeeCents;
  final int discountCents;
  final int tipCents;
  final int totalCents;
  final String currency;

  const ServerCartPricing({
    required this.subtotalCents,
    required this.taxCents,
    required this.serviceFeeCents,
    required this.deliveryFeeCents,
    required this.discountCents,
    required this.tipCents,
    required this.totalCents,
    required this.currency,
  });

  factory ServerCartPricing.fromJson(Map<String, dynamic> json) {
    return ServerCartPricing(
      subtotalCents: json['subtotalCents'] as int? ?? 0,
      taxCents: json['taxCents'] as int? ?? 0,
      serviceFeeCents: json['serviceFeeCents'] as int? ?? 0,
      deliveryFeeCents: json['deliveryFeeCents'] as int? ?? 0,
      discountCents: json['discountCents'] as int? ?? 0,
      tipCents: json['tipCents'] as int? ?? 0,
      totalCents: json['totalCents'] as int? ?? 0,
      currency: json['currency'] as String? ?? 'USD',
    );
  }
}

class ServerCart {
  final String id;
  final String restaurantLocationId;
  final String? fulfillmentType;
  final ServerCartPricing pricing;
  final List<int> tipPresetsBasisPoints;
  final List<String> warnings;
  final bool meetsMinimumOrder;

  const ServerCart({
    required this.id,
    required this.restaurantLocationId,
    required this.pricing,
    this.fulfillmentType,
    this.tipPresetsBasisPoints = const [],
    this.warnings = const [],
    this.meetsMinimumOrder = true,
  });

  factory ServerCart.fromJson(Map<String, dynamic> json) {
    final tipPresets = json['tipPresetsBasisPoints'];
    return ServerCart(
      id: json['id'] as String,
      restaurantLocationId: json['restaurantLocationId'] as String,
      fulfillmentType: json['fulfillmentType'] as String?,
      pricing: ServerCartPricing.fromJson(
        json['pricing'] as Map<String, dynamic>? ?? const {},
      ),
      tipPresetsBasisPoints: tipPresets is List
          ? tipPresets.map((e) => e as int).toList()
          : const [],
      warnings: (json['warnings'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      meetsMinimumOrder: json['meetsMinimumOrder'] as bool? ?? true,
    );
  }
}

class OrderSummary {
  final String id;
  final String publicOrderNumber;
  final String status;
  final int totalCents;
  final String currency;
  final int tipCents;
  final int taxCents;
  final int subtotalCents;
  final int serviceFeeCents;
  final int deliveryFeeCents;

  const OrderSummary({
    required this.id,
    required this.publicOrderNumber,
    required this.status,
    required this.totalCents,
    required this.currency,
    required this.tipCents,
    required this.taxCents,
    required this.subtotalCents,
    required this.serviceFeeCents,
    required this.deliveryFeeCents,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    return OrderSummary(
      id: json['id'] as String,
      publicOrderNumber: json['publicOrderNumber'] as String? ?? json['id'] as String,
      status: json['status'] as String? ?? 'UNKNOWN',
      totalCents: json['totalCents'] as int? ?? 0,
      currency: json['currency'] as String? ?? 'USD',
      tipCents: json['tipCents'] as int? ?? 0,
      taxCents: json['taxCents'] as int? ?? 0,
      subtotalCents: json['subtotalCents'] as int? ?? 0,
      serviceFeeCents: json['serviceFeeCents'] as int? ?? 0,
      deliveryFeeCents: json['deliveryFeeCents'] as int? ?? 0,
    );
  }
}
