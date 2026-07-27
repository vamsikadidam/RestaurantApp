import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../application/cart_controller.dart';

/// Shopping-cart AppBar action with a small badge showing the current item
/// count. Kept as its own widget so it can be reused on any screen's AppBar.
class CartBadgeIcon extends ConsumerWidget {
  final VoidCallback onTap;

  const CartBadgeIcon({super.key, required this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itemCount =
        ref.watch(cartControllerProvider.select((state) => state.itemCount));

    return IconButton(
      onPressed: onTap,
      icon: Badge(
        label: Text('$itemCount'),
        isLabelVisible: itemCount > 0,
        child: const Icon(Icons.shopping_cart_outlined),
      ),
    );
  }
}
