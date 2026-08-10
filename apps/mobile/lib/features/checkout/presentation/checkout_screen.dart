import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_providers.dart';
import '../../../core/router/app_router.dart';
import '../../../core/utils/money_formatter.dart';
import '../../cart/application/cart_controller.dart';
import '../../menu/application/menu_providers.dart';
import '../data/checkout_repository.dart';
import '../data/models/checkout_models.dart';

final checkoutRepositoryProvider = Provider<CheckoutRepository>((ref) {
  return CheckoutRepository(ref.watch(apiDioProvider));
});

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _notesController = TextEditingController();
  final _customTipController = TextEditingController();
  ServerCart? _serverCart;
  Object? _loadError;
  bool _loadingCart = true;
  bool _submitting = false;
  int _selectedTipBasisPoints = 1500;
  bool _isCustomTip = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncCart());
  }

  @override
  void dispose() {
    _notesController.dispose();
    _customTipController.dispose();
    super.dispose();
  }

  Future<void> _syncCart() async {
    setState(() {
      _loadingCart = true;
      _loadError = null;
    });

    try {
      final restaurant = await ref.read(restaurantProvider.future);
      final location = restaurant.primaryLocation;
      if (location == null) {
        throw const ApiException(
          errorCode: 'NO_LOCATION',
          message: 'Restaurant location is not configured.',
        );
      }

      final localCart = ref.read(cartControllerProvider);
      if (localCart.isEmpty) {
        if (mounted) context.go(AppRoutes.cart);
        return;
      }

      final presets = location.tipPresetsBasisPoints;
      final cart = await ref.read(checkoutRepositoryProvider).syncLocalCart(
            restaurantLocationId: location.id,
            localItems: localCart.items,
            fulfillmentType: 'PICKUP',
          );

      if (!mounted) return;
      setState(() {
        _serverCart = cart;
        _selectedTipBasisPoints = presets.isNotEmpty
            ? presets[presets.length > 1 ? 1 : 0]
            : (cart.tipPresetsBasisPoints.isNotEmpty
                ? cart.tipPresetsBasisPoints.first
                : 1500);
        _loadingCart = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadError = error;
        _loadingCart = false;
      });
    }
  }

  int _tipCentsFor(ServerCart cart, int tipBasisPoints) {
    return ((cart.pricing.subtotalCents * tipBasisPoints) / 10000).round();
  }

  /// Current tip amount: either a % of subtotal (preset chips) or a
  /// customer-typed dollar amount (custom chip), including $0 for no tip.
  int _currentTipCents(ServerCart cart) {
    if (_isCustomTip) {
      final dollars = double.tryParse(_customTipController.text.trim());
      if (dollars == null || dollars <= 0) return 0;
      return (dollars * 100).round();
    }
    return _tipCentsFor(cart, _selectedTipBasisPoints);
  }

  String _idempotencyKey(String prefix) {
    final stamp = DateTime.now().microsecondsSinceEpoch;
    final nonce = Random().nextInt(1 << 30);
    return '$prefix-$stamp-$nonce';
  }

  Future<void> _placeOrder() async {
    final cart = _serverCart;
    if (cart == null || _submitting) return;

    setState(() => _submitting = true);
    final messenger = ScaffoldMessenger.of(context);
    final repo = ref.read(checkoutRepositoryProvider);

    try {
      final tipCents = _currentTipCents(cart);
      final order = await repo.checkout(
        cartId: cart.id,
        idempotencyKey: _idempotencyKey('checkout'),
        tipCents: tipCents,
        specialInstructions: _notesController.text.trim(),
      );

      final paid = await repo.payOrder(
        orderId: order.id,
        idempotencyKey: _idempotencyKey('pay'),
      );

      ref.read(cartControllerProvider.notifier).clear();

      if (!mounted) return;
      context.go(AppRoutes.orderConfirmationPath(paid.id), extra: paid);
    } catch (error) {
      final message =
          error is ApiException ? error.message : 'Checkout failed. Please try again.';
      messenger.showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final money = ref.watch(moneyFormatterProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: _loadingCart
          ? const Center(child: CircularProgressIndicator())
          : _loadError != null
              ? _ErrorBody(
                  message: _loadError is ApiException
                      ? (_loadError as ApiException).message
                      : 'Could not prepare checkout.',
                  onRetry: _syncCart,
                )
              : _buildBody(context, money),
      bottomNavigationBar: _serverCart == null || _loadingCart
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton(
                  onPressed: _submitting ? null : _placeOrder,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                  ),
                  child: _submitting
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(
                          'Place pickup order · ${money.format(_totalWithTip(_serverCart!))}',
                        ),
                ),
              ),
            ),
    );
  }

  int _totalWithTip(ServerCart cart) {
    final tipCents = _currentTipCents(cart);
    return cart.pricing.totalCents - cart.pricing.tipCents + tipCents;
  }

  Widget _buildBody(BuildContext context, MoneyFormatter money) {
    final cart = _serverCart!;
    final tipCents = _currentTipCents(cart);
    final totalWithTip = _totalWithTip(cart);
    final tipOptions = cart.tipPresetsBasisPoints.isNotEmpty
        ? cart.tipPresetsBasisPoints
        : const [1000, 1500, 2000, 0];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Pickup', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        Text(
          'Pay in the app (sandbox/mock card). Real Clover card entry ships with production keys.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        if (cart.warnings.isNotEmpty) ...[
          const SizedBox(height: 12),
          ...cart.warnings.map(
            (w) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(w, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          ),
        ],
        const SizedBox(height: 20),
        Text('Tip', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final bp in tipOptions)
              ChoiceChip(
                label: Text(bp == 0 ? 'No tip' : '${(bp / 100).round()}%'),
                selected: !_isCustomTip && _selectedTipBasisPoints == bp,
                onSelected: (_) => setState(() {
                  _isCustomTip = false;
                  _selectedTipBasisPoints = bp;
                }),
              ),
            ChoiceChip(
              label: const Text('Custom'),
              selected: _isCustomTip,
              onSelected: (_) => setState(() => _isCustomTip = true),
            ),
          ],
        ),
        if (_isCustomTip) ...[
          const SizedBox(height: 12),
          TextField(
            controller: _customTipController,
            autofocus: true,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Custom tip amount',
              hintText: 'Enter 0 for no tip',
              prefixText: '\$ ',
              border: OutlineInputBorder(),
            ),
            onChanged: (_) => setState(() {}),
          ),
        ],
        const SizedBox(height: 20),
        TextField(
          controller: _notesController,
          maxLength: 280,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Special instructions',
            hintText: 'Allergies, gate code, etc.',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        Text('Order total', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        _MoneyRow(label: 'Subtotal', value: money.format(cart.pricing.subtotalCents)),
        _MoneyRow(label: 'Tax', value: money.format(cart.pricing.taxCents)),
        _MoneyRow(label: 'Service fee', value: money.format(cart.pricing.serviceFeeCents)),
        if (cart.pricing.deliveryFeeCents > 0)
          _MoneyRow(
            label: 'Delivery',
            value: money.format(cart.pricing.deliveryFeeCents),
          ),
        if (cart.pricing.discountCents > 0)
          _MoneyRow(
            label: 'Discount',
            value: '-${money.format(cart.pricing.discountCents)}',
          ),
        _MoneyRow(label: 'Tip', value: money.format(tipCents)),
        const Divider(height: 24),
        _MoneyRow(
          label: 'Total',
          value: money.format(totalWithTip),
          emphasize: true,
        ),
      ],
    );
  }
}

class _MoneyRow extends StatelessWidget {
  final String label;
  final String value;
  final bool emphasize;

  const _MoneyRow({
    required this.label,
    required this.value,
    this.emphasize = false,
  });

  @override
  Widget build(BuildContext context) {
    final style = emphasize
        ? Theme.of(context).textTheme.titleMedium
        : Theme.of(context).textTheme.bodyMedium;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: style),
          Text(value, style: style),
        ],
      ),
    );
  }
}

class _ErrorBody extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorBody({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
