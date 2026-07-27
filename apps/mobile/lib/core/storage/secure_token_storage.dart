import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists JWT access/refresh tokens - and a small cached copy of the
/// user's profile, so the app can restore a session on relaunch without a
/// dedicated `/auth/me` endpoint - using platform secure storage (Android
/// Keystore / iOS Keychain), never SharedPreferences or plain files. See
/// SECURITY.md - the app never stores card data, only these tokens.
class SecureTokenStorage {
  static const _accessTokenKey = 'auth_access_token';
  static const _refreshTokenKey = 'auth_refresh_token';
  static const _cachedUserKey = 'auth_cached_user';

  final FlutterSecureStorage _storage;

  const SecureTokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  Future<void> saveTokens(
      {required String accessToken, required String refreshToken}) async {
    await Future.wait([
      _storage.write(key: _accessTokenKey, value: accessToken),
      _storage.write(key: _refreshTokenKey, value: refreshToken),
    ]);
  }

  Future<String?> readAccessToken() => _storage.read(key: _accessTokenKey);

  Future<String?> readRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<void> saveCachedUser(Map<String, dynamic> userJson) {
    return _storage.write(key: _cachedUserKey, value: jsonEncode(userJson));
  }

  Future<Map<String, dynamic>?> readCachedUser() async {
    final raw = await _storage.read(key: _cachedUserKey);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<void> clear() async {
    await Future.wait([
      _storage.delete(key: _accessTokenKey),
      _storage.delete(key: _refreshTokenKey),
      _storage.delete(key: _cachedUserKey),
    ]);
  }
}
