import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists JWT access/refresh tokens - and a small cached copy of the
/// user's profile, so the app can restore a session on relaunch without a
/// dedicated `/auth/me` endpoint - using platform secure storage (Android
/// Keystore / iOS Keychain), never SharedPreferences or plain files. See
/// SECURITY.md - the app never stores card data, only these tokens.
///
/// All session fields are kept under a single storage key as one JSON blob.
/// `flutter_secure_storage`'s web backend has a known bug where writing
/// multiple separate keys (especially concurrently) can leave all but the
/// most-recently-written key undecryptable (throws a raw `OperationError`
/// on read - see https://github.com/mogol/flutter_secure_storage/issues/381).
/// A single key sidesteps that entirely and is just as valid a strategy on
/// native Keystore/Keychain backends.
class SecureTokenStorage {
  static const _sessionKey = 'auth_session_v2';

  final FlutterSecureStorage _storage;

  const SecureTokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  Future<Map<String, dynamic>> _readSession() async {
    final raw = await _storage.read(key: _sessionKey);
    if (raw == null) return {};
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }

  Future<void> _writeSession(Map<String, dynamic> session) {
    return _storage.write(key: _sessionKey, value: jsonEncode(session));
  }

  Future<void> saveTokens(
      {required String accessToken, required String refreshToken}) async {
    final session = await _readSession();
    session['accessToken'] = accessToken;
    session['refreshToken'] = refreshToken;
    await _writeSession(session);
  }

  Future<String?> readAccessToken() async {
    final session = await _readSession();
    return session['accessToken'] as String?;
  }

  Future<String?> readRefreshToken() async {
    final session = await _readSession();
    return session['refreshToken'] as String?;
  }

  Future<void> saveCachedUser(Map<String, dynamic> userJson) async {
    final session = await _readSession();
    session['cachedUser'] = userJson;
    await _writeSession(session);
  }

  Future<Map<String, dynamic>?> readCachedUser() async {
    final session = await _readSession();
    return session['cachedUser'] as Map<String, dynamic>?;
  }

  Future<void> clear() async {
    await _storage.delete(key: _sessionKey);
  }
}
