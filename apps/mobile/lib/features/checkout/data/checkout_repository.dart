import 'package:dio/dio.dart';
import '../../../core/network/api_exception.dart';
import '../../cart/data/models/cart_models.dart';
import 'models/checkout_models.dart';

/// Syncs the local cart to the backend, then runs checkout + payment.
///
/// Card tokenization against Clover is skipped in mock/dev: we send a
/// non-decline `clv_...` token that the mock Clover client always accepts.
/// Production builds should replace [_mockSourceToken] with a real Clover
/// iframe/SDK token from [getTokenizationConfig].
class CheckoutRepository {
  final Dio _dio;

  /// Accepted by the mock Clover charge path (see clover-api-client.mock.ts).
  static const mockSourceToken = 'clv_mock_dev_token';

  const CheckoutRepository(this._dio);

  Future<ServerCart> syncLocalCart({
    required String restaurantLocationId,
    required List<CartLineItem> localItems,
    String fulfillmentType = 'PICKUP',
  }) async {
    try {
      final createResponse = await _dio.post(
        '/cart',
        data: {
          'restaurantLocationId': restaurantLocationId,
          'fulfillmentType': fulfillmentType,
        },
      );
      var cart = ServerCart.fromJson(createResponse.data as Map<String, dynamic>);

      await _dio.delete('/cart/${cart.id}/items');

      for (final line in localItems) {
        await _dio.post(
          '/cart/${cart.id}/items',
          data: {
            'menuItemId': line.menuItemId,
            'quantity': line.quantity,
            if (line.specialInstructions != null &&
                line.specialInstructions!.isNotEmpty)
              'specialInstructions': line.specialInstructions,
            if (line.modifiers.isNotEmpty)
              'modifiers': line.modifiers
                  .map((m) => {
                        'modifierOptionId': m.optionId,
                        'quantity': m.quantity,
                      })
                  .toList(),
          },
        );
      }

      final priced = await _dio.get('/cart/${cart.id}');
      return ServerCart.fromJson(priced.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<OrderSummary> checkout({
    required String cartId,
    required String idempotencyKey,
    int tipCents = 0,
    String? specialInstructions,
  }) async {
    try {
      final response = await _dio.post(
        '/checkout',
        data: {
          'cartId': cartId,
          'idempotencyKey': idempotencyKey,
          'tipCents': tipCents,
          if (specialInstructions != null && specialInstructions.isNotEmpty)
            'specialInstructions': specialInstructions,
        },
      );
      return OrderSummary.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<OrderSummary> payOrder({
    required String orderId,
    required String idempotencyKey,
    String sourceToken = mockSourceToken,
  }) async {
    try {
      final response = await _dio.post(
        '/payments',
        data: {
          'orderId': orderId,
          'provider': 'CLOVER_ECOMMERCE',
          'sourceToken': sourceToken,
          'idempotencyKey': idempotencyKey,
        },
      );
      final data = response.data as Map<String, dynamic>;
      final orderJson = data['order'] as Map<String, dynamic>? ?? data;
      return OrderSummary.fromJson(orderJson);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
