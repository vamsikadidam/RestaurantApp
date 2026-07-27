import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../session/session_events.dart';
import '../storage/secure_token_storage.dart';
import '../../features/auth/data/auth_repository.dart';

final secureTokenStorageProvider = Provider<SecureTokenStorage>((ref) {
  return const SecureTokenStorage();
});

BaseOptions _baseOptions() => BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      sendTimeout: const Duration(seconds: 15),
      contentType: 'application/json',
    );

/// Bare Dio instance for the /auth/* endpoints - no Authorization header,
/// no retry-on-401 logic (those endpoints don't need it; see AuthRepository).
final authDioProvider = Provider<Dio>((ref) => Dio(_baseOptions()));

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(authDioProvider));
});

/// Dio instance for every other (authenticated) API call: attaches the
/// current access token to each request, and on a 401 response attempts
/// exactly one silent refresh-and-retry before giving up and broadcasting
/// a session-expired event (see SessionEvents).
final apiDioProvider = Provider<Dio>((ref) {
  final dio = Dio(_baseOptions());
  final tokenStorage = ref.watch(secureTokenStorageProvider);

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await tokenStorage.readAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final isUnauthorized = error.response?.statusCode == 401;
        final alreadyRetried = error.requestOptions.extra['retried'] == true;

        if (!isUnauthorized || alreadyRetried) {
          handler.next(error);
          return;
        }

        final refreshToken = await tokenStorage.readRefreshToken();
        if (refreshToken == null) {
          await tokenStorage.clear();
          ref.read(sessionEventsProvider).notifySessionExpired();
          handler.next(error);
          return;
        }

        try {
          final refreshed = await ref
              .read(authRepositoryProvider)
              .refresh(refreshToken: refreshToken);
          await tokenStorage.saveTokens(
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
          );

          final retryOptions = error.requestOptions;
          retryOptions.headers['Authorization'] =
              'Bearer ${refreshed.accessToken}';
          retryOptions.extra['retried'] = true;

          final response = await dio.fetch(retryOptions);
          handler.resolve(response);
        } catch (_) {
          await tokenStorage.clear();
          ref.read(sessionEventsProvider).notifySessionExpired();
          handler.next(error);
        }
      },
    ),
  );

  return dio;
});
