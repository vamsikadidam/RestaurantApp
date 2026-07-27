import 'package:dio/dio.dart';
import '../../../core/network/api_exception.dart';
import 'models/auth_models.dart';

/// Talks to the backend's /auth/* endpoints (apps/api/src/auth). Uses a bare
/// Dio instance with no auth-header/retry interceptors, since every one of
/// these endpoints is either public or authenticates via an explicit token
/// in the request body (refresh/reset) rather than a Bearer header.
class AuthRepository {
  final Dio _dio;

  const AuthRepository(this._dio);

  Future<AuthSession> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
    String? phone,
  }) {
    return _post(
        '/auth/register',
        {
          'email': email,
          'password': password,
          if (firstName != null && firstName.isNotEmpty) 'firstName': firstName,
          if (lastName != null && lastName.isNotEmpty) 'lastName': lastName,
          if (phone != null && phone.isNotEmpty) 'phone': phone,
        },
        AuthSession.fromJson);
  }

  Future<AuthSession> login({required String email, required String password}) {
    return _post('/auth/login', {'email': email, 'password': password},
        AuthSession.fromJson);
  }

  Future<AuthSession> guestSession() {
    return _post('/auth/guest-session', const {}, AuthSession.fromJson);
  }

  Future<RefreshedTokens> refresh({required String refreshToken}) {
    return _post(
      '/auth/refresh',
      {'refreshToken': refreshToken},
      RefreshedTokens.fromJson,
    );
  }

  Future<void> logout({required String refreshToken}) async {
    try {
      await _dio.post('/auth/logout', data: {'refreshToken': refreshToken});
    } on DioException catch (e) {
      // Logout is best-effort client-side (tokens are cleared locally
      // regardless) - don't block the user on a network hiccup here.
      if (e.response?.statusCode != 204) {
        throw ApiException.fromDioException(e);
      }
    }
  }

  Future<void> forgotPassword({required String email}) async {
    try {
      await _dio.post('/auth/forgot-password', data: {'email': email});
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> resetPassword(
      {required String token, required String newPassword}) async {
    try {
      await _dio.post(
        '/auth/reset-password',
        data: {'token': token, 'newPassword': newPassword},
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<T> _post<T>(
    String path,
    Map<String, dynamic> body,
    T Function(Map<String, dynamic>) fromJson,
  ) async {
    try {
      final response = await _dio.post(path, data: body);
      return fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
