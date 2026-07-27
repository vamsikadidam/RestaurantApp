/// A single modifier option the customer selected for a cart line item.
/// `priceCents` is a client-side snapshot only - the backend always
/// recalculates authoritative pricing from current menu data at checkout
/// (see SECURITY.md and CartLineItem doc below).
class SelectedModifier {
  final String groupId;
  final String groupName;
  final String optionId;
  final String optionName;
  final int priceCentsSnapshot;
  final int quantity;

  const SelectedModifier({
    required this.groupId,
    required this.groupName,
    required this.optionId,
    required this.optionName,
    required this.priceCentsSnapshot,
    this.quantity = 1,
  });
}

/// One line in the local cart. All prices here (`unitPriceCentsSnapshot`,
/// modifier prices) are informational client-side snapshots taken at
/// add-to-cart time, used only to render an estimate to the customer - the
/// backend is the sole source of truth for authoritative pricing and
/// recalculates subtotal/tax/fees/total from live menu data before any
/// payment is taken.
class CartLineItem {
  final String id;
  final String menuItemId;
  final String name;
  final String? imageUrl;
  final int unitPriceCentsSnapshot;
  final int quantity;
  final List<SelectedModifier> modifiers;
  final String? specialInstructions;

  const CartLineItem({
    required this.id,
    required this.menuItemId,
    required this.name,
    required this.unitPriceCentsSnapshot,
    required this.quantity,
    this.imageUrl,
    this.modifiers = const [],
    this.specialInstructions,
  });

  int get modifiersTotalCentsPerUnit =>
      modifiers.fold(0, (sum, m) => sum + m.priceCentsSnapshot * m.quantity);

  int get unitTotalCents => unitPriceCentsSnapshot + modifiersTotalCentsPerUnit;

  int get lineTotalCents => unitTotalCents * quantity;

  CartLineItem copyWith({int? quantity, String? specialInstructions}) {
    return CartLineItem(
      id: id,
      menuItemId: menuItemId,
      name: name,
      imageUrl: imageUrl,
      unitPriceCentsSnapshot: unitPriceCentsSnapshot,
      quantity: quantity ?? this.quantity,
      modifiers: modifiers,
      specialInstructions: specialInstructions ?? this.specialInstructions,
    );
  }
}

class CartState {
  final List<CartLineItem> items;

  const CartState({this.items = const []});

  bool get isEmpty => items.isEmpty;
  int get itemCount => items.fold(0, (sum, item) => sum + item.quantity);
  int get subtotalCentsEstimate =>
      items.fold(0, (sum, item) => sum + item.lineTotalCents);
}
