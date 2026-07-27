import '../data/models/auth_models.dart';

enum AuthStatus {
  /// App just launched - still checking secure storage for a saved session.
  loading,
  unauthenticated,
  guest,
  authenticated,
}

class AuthState {
  final AuthStatus status;
  final AuthUser? user;

  const AuthState._(this.status, this.user);

  const AuthState.loading() : this._(AuthStatus.loading, null);
  const AuthState.unauthenticated() : this._(AuthStatus.unauthenticated, null);
  const AuthState.guest(AuthUser user) : this._(AuthStatus.guest, user);
  const AuthState.authenticated(AuthUser user)
      : this._(AuthStatus.authenticated, user);

  bool get isLoading => status == AuthStatus.loading;
  bool get isSignedIn =>
      status == AuthStatus.guest || status == AuthStatus.authenticated;
  bool get canOrder => isSignedIn; // guests can order too (guest checkout).
}
