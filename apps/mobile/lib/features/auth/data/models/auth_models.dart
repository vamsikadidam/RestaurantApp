/// Hand-written immutable models mirroring the backend's AuthResult contract
/// (apps/api/src/auth/interfaces/auth-result.interface.ts).
///
/// NOTE: this project's dependency list includes Freezed/json_serializable
/// for future codegen, but this environment has no Dart/Flutter SDK to run
/// `build_runner`, so these models are written by hand instead - simple
/// enough to review directly, and safe to migrate to `@freezed` later.
class AuthUser {
  final String id;
  final String? email;
  final String? firstName;
  final String? lastName;
  final bool isGuest;

  const AuthUser({
    required this.id,
    required this.isGuest,
    this.email,
    this.firstName,
    this.lastName,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String?,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      isGuest: json['isGuest'] as bool? ?? false,
    );
  }

  String get displayName {
    if (firstName != null && firstName!.isNotEmpty) return firstName!;
    if (email != null && email!.isNotEmpty) return email!;
    return isGuest ? 'Guest' : 'Account';
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'firstName': firstName,
        'lastName': lastName,
        'isGuest': isGuest,
      };
}

class AuthSession {
  final String accessToken;
  final String refreshToken;
  final AuthUser user;

  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}

class RefreshedTokens {
  final String accessToken;
  final String refreshToken;

  const RefreshedTokens(
      {required this.accessToken, required this.refreshToken});

  factory RefreshedTokens.fromJson(Map<String, dynamic> json) {
    return RefreshedTokens(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
    );
  }
}
