import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/models/cart_models.dart';

final cartControllerProvider =
    StateNotifierProvider<CartController, CartState>((ref) {
  return CartController();
});

/// Purely local, in-memory shopping cart. There is deliberately no
/// server-side "cart" call here yet (added in Phase 4 alongside authoritative
/// backend pricing/checkout) - this controller only tracks *what* the
/// customer wants to order; the backend recomputes *how much* it costs.
class CartController extends StateNotifier<CartState> {
  final Random _random = Random();

  CartController() : super(const CartState());

  void addItem({
    required String menuItemId,
    required String name,
    required int unitPriceCents,
    String? imageUrl,
    int quantity = 1,
    List<SelectedModifier> modifiers = const [],
    String? specialInstructions,
  }) {
    final matchIndex = state.items.indexWhere(
      (line) =>
          _sameConfiguration(line, menuItemId, modifiers, specialInstructions),
    );

    if (matchIndex != -1) {
      final existing = state.items[matchIndex];
      final updatedItems = [...state.items];
      updatedItems[matchIndex] =
          existing.copyWith(quantity: existing.quantity + quantity);
      state = CartState(items: updatedItems);
      return;
    }

    final newLine = CartLineItem(
      id: _generateLineId(),
      menuItemId: menuItemId,
      name: name,
      imageUrl: imageUrl,
      unitPriceCentsSnapshot: unitPriceCents,
      quantity: quantity,
      modifiers: modifiers,
      specialInstructions: specialInstructions,
    );
    state = CartState(items: [...state.items, newLine]);
  }

  void updateQuantity(String lineItemId, int quantity) {
    if (quantity <= 0) {
      removeItem(lineItemId);
      return;
    }
    state = CartState(
      items: [
        for (final line in state.items)
          if (line.id == lineItemId)
            line.copyWith(quantity: quantity)
          else
            line,
      ],
    );
  }

  void updateInstructions(String lineItemId, String? instructions) {
    state = CartState(
      items: [
        for (final line in state.items)
          if (line.id == lineItemId)
            line.copyWith(specialInstructions: instructions)
          else
            line,
      ],
    );
  }

  void removeItem(String lineItemId) {
    state = CartState(
        items: state.items.where((line) => line.id != lineItemId).toList());
  }

  void clear() => state = const CartState();

  bool _sameConfiguration(
    CartLineItem line,
    String menuItemId,
    List<SelectedModifier> modifiers,
    String? specialInstructions,
  ) {
    if (line.menuItemId != menuItemId) return false;
    if ((line.specialInstructions ?? '') != (specialInstructions ?? '')) {
      return false;
    }
    if (line.modifiers.length != modifiers.length) return false;

    final existingSorted = [...line.modifiers]
      ..sort((a, b) => a.optionId.compareTo(b.optionId));
    final incomingSorted = [...modifiers]
      ..sort((a, b) => a.optionId.compareTo(b.optionId));

    for (var i = 0; i < existingSorted.length; i++) {
      if (existingSorted[i].optionId != incomingSorted[i].optionId ||
          existingSorted[i].quantity != incomingSorted[i].quantity) {
        return false;
      }
    }
    return true;
  }

  // Use 1<<30 (not 1<<32): on Flutter Web, 1<<32 becomes 0 and Random.nextInt throws.
  String _generateLineId() =>
      '${DateTime.now().microsecondsSinceEpoch}-${_random.nextInt(1 << 30)}';
}
