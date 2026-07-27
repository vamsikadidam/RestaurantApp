import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_app/features/cart/application/cart_controller.dart';
import 'package:restaurant_app/features/cart/data/models/cart_models.dart';

void main() {
  group('CartController', () {
    test('starts empty', () {
      final controller = CartController();
      expect(controller.state.isEmpty, isTrue);
      expect(controller.state.itemCount, 0);
      expect(controller.state.subtotalCentsEstimate, 0);
    });

    test('adding an item creates a single line with the right total', () {
      final controller = CartController();

      controller.addItem(
        menuItemId: 'item-1',
        name: 'Cheeseburger',
        unitPriceCents: 999,
        quantity: 2,
      );

      expect(controller.state.items, hasLength(1));
      expect(controller.state.itemCount, 2);
      expect(controller.state.subtotalCentsEstimate, 1998);
    });

    test(
        'adding the same item+modifiers+instructions again merges into one line',
        () {
      final controller = CartController();
      const modifiers = [
        SelectedModifier(
          groupId: 'g1',
          groupName: 'Toppings',
          optionId: 'opt-1',
          optionName: 'Extra cheese',
          priceCentsSnapshot: 100,
        ),
      ];

      controller.addItem(
        menuItemId: 'item-1',
        name: 'Cheeseburger',
        unitPriceCents: 999,
        modifiers: modifiers,
        specialInstructions: 'No onions',
      );
      controller.addItem(
        menuItemId: 'item-1',
        name: 'Cheeseburger',
        unitPriceCents: 999,
        modifiers: modifiers,
        specialInstructions: 'No onions',
      );

      expect(controller.state.items, hasLength(1));
      expect(controller.state.items.single.quantity, 2);
    });

    test('different modifiers create a separate line instead of merging', () {
      final controller = CartController();

      controller.addItem(
          menuItemId: 'item-1', name: 'Cheeseburger', unitPriceCents: 999);
      controller.addItem(
        menuItemId: 'item-1',
        name: 'Cheeseburger',
        unitPriceCents: 999,
        modifiers: const [
          SelectedModifier(
            groupId: 'g1',
            groupName: 'Toppings',
            optionId: 'opt-1',
            optionName: 'Bacon',
            priceCentsSnapshot: 200,
          ),
        ],
      );

      expect(controller.state.items, hasLength(2));
    });

    test(
        'line total includes modifier price times modifier quantity, times line quantity',
        () {
      final controller = CartController();

      controller.addItem(
        menuItemId: 'item-1',
        name: 'Cheeseburger',
        unitPriceCents: 1000,
        quantity: 3,
        modifiers: const [
          SelectedModifier(
            groupId: 'g1',
            groupName: 'Toppings',
            optionId: 'opt-1',
            optionName: 'Bacon',
            priceCentsSnapshot: 200,
            quantity: 2,
          ),
        ],
      );

      // (1000 + 200*2) * 3 = 4200
      expect(controller.state.items.single.lineTotalCents, 4200);
      expect(controller.state.subtotalCentsEstimate, 4200);
    });

    test('updateQuantity to zero removes the line', () {
      final controller = CartController();
      controller.addItem(
          menuItemId: 'item-1', name: 'Cheeseburger', unitPriceCents: 999);
      final lineId = controller.state.items.single.id;

      controller.updateQuantity(lineId, 0);

      expect(controller.state.isEmpty, isTrue);
    });

    test('removeItem removes only the targeted line', () {
      final controller = CartController();
      controller.addItem(
          menuItemId: 'item-1', name: 'Cheeseburger', unitPriceCents: 999);
      controller.addItem(
          menuItemId: 'item-2', name: 'Soda', unitPriceCents: 299);
      final firstLineId = controller.state.items.first.id;

      controller.removeItem(firstLineId);

      expect(controller.state.items, hasLength(1));
      expect(controller.state.items.single.menuItemId, 'item-2');
    });

    test('clear empties the cart', () {
      final controller = CartController();
      controller.addItem(
          menuItemId: 'item-1', name: 'Cheeseburger', unitPriceCents: 999);

      controller.clear();

      expect(controller.state.isEmpty, isTrue);
    });

    test('updateInstructions changes only the targeted line', () {
      final controller = CartController();
      controller.addItem(
          menuItemId: 'item-1', name: 'Cheeseburger', unitPriceCents: 999);
      final lineId = controller.state.items.single.id;

      controller.updateInstructions(lineId, 'Well done please');

      expect(controller.state.items.single.specialInstructions,
          'Well done please');
    });
  });
}
