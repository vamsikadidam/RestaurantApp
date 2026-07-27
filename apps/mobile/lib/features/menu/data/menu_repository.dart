import 'package:dio/dio.dart';
import '../../../core/network/api_exception.dart';
import 'models/menu_models.dart';

/// Talks to the backend's public restaurant/menu read endpoints
/// (apps/api/src/restaurants, apps/api/src/menu). All of these are public
/// (no login required to browse), so they're called on the shared `apiDio`
/// instance - the Authorization header is attached when present but not
/// required by these routes.
class MenuRepository {
  final Dio _dio;

  const MenuRepository(this._dio);

  Future<Restaurant> getRestaurant(String restaurantId) {
    return _get('/restaurants/$restaurantId', Restaurant.fromJson);
  }

  Future<RestaurantAvailability> getAvailability(String restaurantId,
      {String? locationId}) {
    return _get(
      '/restaurants/$restaurantId/availability',
      RestaurantAvailability.fromJson,
      queryParameters: locationId != null ? {'locationId': locationId} : null,
    );
  }

  Future<List<MenuCategory>> getMenu(String restaurantId) async {
    try {
      final response = await _dio.get('/restaurants/$restaurantId/menu');
      final data = response.data as List<dynamic>;
      return data
          .map((e) => MenuCategory.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<MenuItemDetail> getItem(String itemId) {
    return _get('/menu-items/$itemId', MenuItemDetail.fromJson);
  }

  Future<List<MenuItemSummary>> search(
      String restaurantId, String query) async {
    if (query.trim().isEmpty) return [];
    try {
      final response = await _dio.get(
        '/restaurants/$restaurantId/menu/search',
        queryParameters: {'q': query},
      );
      final data = response.data as List<dynamic>;
      return data
          .map((e) => MenuItemSummary.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<T> _get<T>(
    String path,
    T Function(Map<String, dynamic>) fromJson, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
