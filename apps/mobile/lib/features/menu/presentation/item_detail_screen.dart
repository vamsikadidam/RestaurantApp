import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/money_formatter.dart';
import '../../../core/widgets/async_value_widget.dart';
import '../../cart/application/cart_controller.dart';
import '../../cart/data/models/cart_models.dart';
import '../application/menu_providers.dart';
import '../data/models/menu_models.dart';

class ItemDetailScreen extends ConsumerWidget {
  final String itemId;

  const ItemDetailScreen({super.key, required this.itemId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itemAsync = ref.watch(menuItemProvider(itemId));

    return Scaffold(
      appBar: AppBar(title: const Text('Item details')),
      body: AsyncValueWidget<MenuItemDetail>(
        value: itemAsync,
        onRetry: () => ref.invalidate(menuItemProvider(itemId)),
        data: (item) => _ItemDetailBody(item: item),
      ),
    );
  }
}

class _ItemDetailBody extends ConsumerStatefulWidget {
  final MenuItemDetail item;

  const _ItemDetailBody({required this.item});

  @override
  ConsumerState<_ItemDetailBody> createState() => _ItemDetailBodyState();
}

class _ItemDetailBodyState extends ConsumerState<_ItemDetailBody> {
  // groupId -> (optionId -> selected quantity)
  final Map<String, Map<String, int>> _selections = {};
  final _instructionsController = TextEditingController();
  int _quantity = 1;

  @override
  void dispose() {
    _instructionsController.dispose();
    super.dispose();
  }

  int _groupSelectedCount(ModifierGroup group) {
    final selections = _selections[group.id] ?? const {};
    return selections.values.fold(0, (sum, qty) => sum + qty);
  }

  void _toggleSingleChoice(ModifierGroup group, ModifierOption option) {
    setState(() {
      _selections[group.id] = {option.id: 1};
    });
  }

  void _setOptionQuantity(
      ModifierGroup group, ModifierOption option, int quantity) {
    setState(() {
      final groupSelections =
          Map<String, int>.from(_selections[group.id] ?? const {});
      if (quantity <= 0) {
        groupSelections.remove(option.id);
      } else {
        groupSelections[option.id] = quantity;
      }
      _selections[group.id] = groupSelections;
    });
  }

  /// Returns the names of required groups that don't yet satisfy their
  /// minimum selection count, so the "Add to cart" flow can explain exactly
  /// what's missing rather than a generic error.
  List<String> _unsatisfiedRequiredGroups() {
    final unsatisfied = <String>[];
    for (final group in widget.item.modifierGroups) {
      final selectedCount = _groupSelectedCount(group);
      if (selectedCount < group.minSelect) {
        unsatisfied.add(group.name);
      }
    }
    return unsatisfied;
  }

  int get _modifiersPriceCents {
    var total = 0;
    for (final group in widget.item.modifierGroups) {
      final selections = _selections[group.id] ?? const {};
      for (final option in group.options) {
        final qty = selections[option.id] ?? 0;
        total += option.priceCents * qty;
      }
    }
    return total;
  }

  int get _totalPriceCents =>
      (widget.item.priceCents + _modifiersPriceCents) * _quantity;

  void _addToCart() {
    final missingGroups = _unsatisfiedRequiredGroups();
    if (missingGroups.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(
                'Please choose an option for: ${missingGroups.join(', ')}')),
      );
      return;
    }

    final selectedModifiers = <SelectedModifier>[];
    for (final group in widget.item.modifierGroups) {
      final selections = _selections[group.id] ?? const {};
      for (final option in group.options) {
        final qty = selections[option.id] ?? 0;
        if (qty > 0) {
          selectedModifiers.add(
            SelectedModifier(
              groupId: group.id,
              groupName: group.name,
              optionId: option.id,
              optionName: option.name,
              priceCentsSnapshot: option.priceCents,
              quantity: qty,
            ),
          );
        }
      }
    }

    ref.read(cartControllerProvider.notifier).addItem(
          menuItemId: widget.item.id,
          name: widget.item.name,
          unitPriceCents: widget.item.priceCents,
          imageUrl: widget.item.imageUrl,
          quantity: _quantity,
          modifiers: selectedModifiers,
          specialInstructions: _instructionsController.text.trim().isEmpty
              ? null
              : _instructionsController.text.trim(),
        );

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Added ${widget.item.name} to cart')),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final theme = Theme.of(context);
    final moneyFormatter = ref.watch(moneyFormatterProvider);

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (item.imageUrl != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: CachedNetworkImage(
                    imageUrl: item.imageUrl!,
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
              const SizedBox(height: 16),
              Text(item.name, style: theme.textTheme.headlineSmall),
              const SizedBox(height: 8),
              if (item.description != null && item.description!.isNotEmpty)
                Text(item.description!, style: theme.textTheme.bodyMedium),
              const SizedBox(height: 8),
              Text(
                moneyFormatter.format(item.priceCents),
                style: theme.textTheme.titleMedium
                    ?.copyWith(color: theme.colorScheme.primary),
              ),
              if (!item.isAvailable) ...[
                const SizedBox(height: 8),
                Text('Currently sold out',
                    style: TextStyle(color: theme.colorScheme.error)),
              ],
              const Divider(height: 32),
              for (final group in item.modifierGroups)
                _ModifierGroupSection(
                  group: group,
                  selections: _selections[group.id] ?? const {},
                  selectedCount: _groupSelectedCount(group),
                  moneyFormatter: moneyFormatter,
                  onSingleChoiceSelected: (option) =>
                      _toggleSingleChoice(group, option),
                  onQuantityChanged: (option, qty) =>
                      _setOptionQuantity(group, option, qty),
                ),
              const SizedBox(height: 8),
              Text('Special instructions', style: theme.textTheme.titleSmall),
              const SizedBox(height: 8),
              TextField(
                controller: _instructionsController,
                maxLines: 3,
                maxLength: 200,
                decoration: const InputDecoration(
                  hintText: 'E.g. no onions, extra napkins...',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                _QuantityStepper(
                  quantity: _quantity,
                  onChanged: (qty) => setState(() => _quantity = qty),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: item.isAvailable ? _addToCart : null,
                    style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(48)),
                    child: Text(
                      item.isAvailable
                          ? 'Add to cart - ${moneyFormatter.format(_totalPriceCents)}'
                          : 'Sold out',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ModifierGroupSection extends StatelessWidget {
  final ModifierGroup group;
  final Map<String, int> selections;
  final int selectedCount;
  final MoneyFormatter moneyFormatter;
  final void Function(ModifierOption option) onSingleChoiceSelected;
  final void Function(ModifierOption option, int quantity) onQuantityChanged;

  const _ModifierGroupSection({
    required this.group,
    required this.selections,
    required this.selectedCount,
    required this.moneyFormatter,
    required this.onSingleChoiceSelected,
    required this.onQuantityChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final atMax = group.maxSelect != null && selectedCount >= group.maxSelect!;

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(group.name, style: theme.textTheme.titleSmall),
              const SizedBox(width: 8),
              if (group.isRequired)
                const Chip(
                  label: Text('Required', style: TextStyle(fontSize: 11)),
                  visualDensity: VisualDensity.compact,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
            ],
          ),
          Text(
            group.isSingleChoice
                ? 'Choose 1'
                : group.maxSelect != null
                    ? 'Choose up to ${group.maxSelect}'
                    : 'Choose any',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 4),
          if (group.isSingleChoice)
            RadioGroup<String>(
              groupValue:
                  selections.keys.isEmpty ? null : selections.keys.first,
              onChanged: (optionId) {
                final option =
                    group.options.firstWhere((o) => o.id == optionId);
                onSingleChoiceSelected(option);
              },
              child: Column(
                children: [
                  for (final option in group.options)
                    RadioListTile<String>(
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                      value: option.id,
                      enabled: option.isAvailable,
                      title: Text(option.name),
                      secondary: option.priceCents > 0
                          ? Text('+${moneyFormatter.format(option.priceCents)}')
                          : null,
                    ),
                ],
              ),
            )
          else
            for (final option in group.options)
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                dense: true,
                value: (selections[option.id] ?? 0) > 0,
                onChanged: !option.isAvailable ||
                        (atMax && (selections[option.id] ?? 0) == 0)
                    ? null
                    : (checked) =>
                        onQuantityChanged(option, checked == true ? 1 : 0),
                title: Text(option.name),
                secondary: option.priceCents > 0
                    ? Text('+${moneyFormatter.format(option.priceCents)}')
                    : null,
              ),
        ],
      ),
    );
  }
}

class _QuantityStepper extends StatelessWidget {
  final int quantity;
  final ValueChanged<int> onChanged;

  const _QuantityStepper({required this.quantity, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton(
          onPressed: quantity > 1 ? () => onChanged(quantity - 1) : null,
          icon: const Icon(Icons.remove_circle_outline),
        ),
        Text('$quantity', style: Theme.of(context).textTheme.titleMedium),
        IconButton(
          onPressed: () => onChanged(quantity + 1),
          icon: const Icon(Icons.add_circle_outline),
        ),
      ],
    );
  }
}
