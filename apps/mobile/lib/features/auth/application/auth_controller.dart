import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_providers.dart';
import '../../../core/session/session_events.dart';
import '../../../core/storage/secure_token_storage.dart';
import '../data/auth_repository.dart';
import '../data/models/auth_models.dart';
import 'auth_state.dart';

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  final controller = AuthController(
    authRepository: ref.watch(authRepositoryProvider),
    tokenStorage: ref.watch(secureTokenStorageProvider),
    sessionEvents: ref.watch(sessionEventsProvider),
  );
  ref.onDispose(controller.dispose);
  return controller;
});

/// Owns the app's session lifecycle: restoring a saved session on launch,
/// register/login/guest-session/logout, and reacting to a forced session
/// expiry reported by the network layer (see SessionEvents).
class AuthController extends StateNotifier<AuthState> {
  final AuthRepository _authRepository;
  final SecureTokenStorage _tokenStorage;
  final SessionEvents _sessionEvents;

  AuthController({
    required AuthRepository authRepository,
    required SecureTokenStorage tokenStorage,
    required SessionEvents sessionEvents,
  })  : _authRepository = authRepository,
        _tokenStorage = tokenStorage,
        _sessionEvents = sessionEvents,
        super(const AuthState.loading()) {
    _sessionEvents.addListener(_handleSessionExpired);
    _restoreSession();
  }

  /// Reads persisted tokens with a hard timeout and never leaves the app
  /// stuck on the splash screen: any read failure (e.g. a secure-storage
  /// backend that hangs, or a cached value written by an incompatible
  /// earlier app version) falls back to a clean unauthenticated state
  /// instead of leaving [state] as `AuthState.loading()` forever.
  Future<void> _restoreSession() async {
    try {
      final accessToken = await _tokenStorage
          .readAccessToken()
          .timeout(const Duration(seconds: 5));
      final cachedUser = await _tokenStorage
          .readCachedUser()
          .timeout(const Duration(seconds: 5));

      if (accessToken == null || cachedUser == null) {
        state = const AuthState.unauthenticated();
        return;
      }

      final user = AuthUser.fromJson(cachedUser);
      state = user.isGuest
          ? AuthState.guest(user)
          : AuthState.authenticated(user);
    } catch (_) {
      await _tokenStorage.clear().catchError((_) {});
      state = const AuthState.unauthenticated();
    }
  }

  Future<void> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
    String? phone,
  }) async {
    final session = await _authRepository.register(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      phone: phone,
    );
    await _persistSession(session);
    state = AuthState.authenticated(session.user);
  }

  Future<void> login({required String email, required String password}) async {
    final session =
        await _authRepository.login(email: email, password: password);
    await _persistSession(session);
    state = AuthState.authenticated(session.user);
  }

  Future<void> continueAsGuest() async {
    final session = await _authRepository.guestSession();
    await _persistSession(session);
    state = AuthState.guest(session.user);
  }

  Future<void> logout() async {
    final refreshToken = await _tokenStorage.readRefreshToken();
    if (refreshToken != null) {
      // Best-effort - the local session is cleared regardless of whether
      // this network call succeeds, so failures are swallowed intentionally.
      _authRepository.logout(refreshToken: refreshToken).catchError((_) {});
    }
    await _tokenStorage.clear();
    state = const AuthState.unauthenticated();
  }

  Future<void> forgotPassword({required String email}) {
    return _authRepository.forgotPassword(email: email);
  }

  Future<void> resetPassword(
      {required String token, required String newPassword}) {
    return _authRepository.resetPassword(
        token: token, newPassword: newPassword);
  }

  void _handleSessionExpired() {
    _tokenStorage.clear();
    state = const AuthState.unauthenticated();
  }

  Future<void> _persistSession(AuthSession session) async {
    await _tokenStorage.saveTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
    await _tokenStorage.saveCachedUser(session.user.toJson());
  }

  @override
  void dispose() {
    _sessionEvents.removeListener(_handleSessionExpired);
    super.dispose();
  }
}
