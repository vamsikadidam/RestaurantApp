import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/router/app_router.dart';
import '../../../core/utils/money_formatter.dart';
import '../../auth/application/auth_controller.dart';
import '../../menu/application/menu_providers.dart';
import '../application/cart_controller.dart';
import '../data/models/cart_models.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartControllerProvider);
    final moneyFormatter = ref.watch(moneyFormatterProvider);
    final authState = ref.watch(authControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Your cart'),
        actions: [
          if (!cart.isEmpty)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              tooltip: 'Clear cart',
              onPressed: () => _confirmClear(context, ref),
            ),
        ],
      ),
      body: cart.isEmpty
          ? _EmptyCart(onBrowse: () => context.go(AppRoutes.home))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: cart.items.length,
              separatorBuilder: (_, __) => const Divider(height: 24),
              itemBuilder: (context, index) {
                final line = cart.items[index];
                return _CartLineTile(
                    line: line, moneyFormatter: moneyFormatter);
              },
            ),
      bottomNavigationBar: cart.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Subtotal',
                            style: Theme.of(context).textTheme.titleMedium),
                        Text(
                          moneyFormatter.format(cart.subtotalCentsEstimate),
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Taxes, fees, and tip are calculated at checkout.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () =>
                          _handleCheckout(context, ref, authState.isSignedIn),
                      style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(48)),
                      child: Text(authState.isSignedIn
                          ? 'Proceed to checkout'
                          : 'Sign in to checkout'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  void _confirmClear(BuildContext context, WidgetRef ref) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear cart?'),
        content: const Text('This will remove all items from your cart.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              ref.read(cartControllerProvider.notifier).clear();
              Navigator.of(context).pop();
            },
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }

  void _handleCheckout(BuildContext context, WidgetRef ref, bool isSignedIn) {
    if (!isSignedIn) {
      context.push(AppRoutes.welcome);
      return;
    }
    // Authoritative checkout (backend pricing, Clover order sync, payment) is
    // implemented in Phase 4 - this app can already build a valid cart and
    // sign the customer in ahead of that.
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Checkout is coming soon!')),
    );
  }
}

class _EmptyCart extends StatelessWidget {
  final VoidCallback onBrowse;

  const _EmptyCart({required this.onBrowse});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.shopping_cart_outlined,
                size: 56, color: Theme.of(context).colorScheme.outline),
            const SizedBox(height: 16),
            const Text('Your cart is empty'),
            const SizedBox(height: 16),
            FilledButton(
                onPressed: onBrowse, child: const Text('Browse the menu')),
          ],
        ),
      ),
    );
  }
}

class _CartLineTile extends ConsumerWidget {
  final CartLineItem line;
  final MoneyFormatter moneyFormatter;

  const _CartLineTile({required this.line, required this.moneyFormatter});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(line.name, style: theme.textTheme.titleMedium),
              if (line.modifiers.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  line.modifiers
                      .map((m) => m.quantity > 1
                          ? '${m.optionName} x${m.quantity}'
                          : m.optionName)
                      .join(', '),
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
              ],
              if (line.specialInstructions != null &&
                  line.specialInstructions!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  '"${line.specialInstructions}"',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(fontStyle: FontStyle.italic),
                ),
              ],
              const SizedBox(height: 8),
              Text(
                moneyFormatter.format(line.lineTotalCents),
                style: theme.textTheme.titleSmall
                    ?.copyWith(color: theme.colorScheme.primary),
              ),
            ],
          ),
        ),
        Column(
          children: [
            IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: () =>
                  ref.read(cartControllerProvider.notifier).removeItem(line.id),
            ),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.remove_circle_outline),
                  onPressed: () => ref
                      .read(cartControllerProvider.notifier)
                      .updateQuantity(line.id, line.quantity - 1),
                ),
                Text('${line.quantity}'),
                IconButton(
                  icon: const Icon(Icons.add_circle_outline),
                  onPressed: () => ref
                      .read(cartControllerProvider.notifier)
                      .updateQuantity(line.id, line.quantity + 1),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}
