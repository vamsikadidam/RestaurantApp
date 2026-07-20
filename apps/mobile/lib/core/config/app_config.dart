/// Build-time, non-secret configuration for the mobile app.
///
/// IMPORTANT: this app must never contain Clover client secrets, ecommerce
/// private keys, or any other server-side credential. Only the backend API
/// base URL (a public value) belongs here. All Clover operations happen on
/// the backend - see SECURITY.md.
class AppConfig {
  const AppConfig._();

  /// Overridden per build flavor via `--dart-define=API_BASE_URL=...`.
  /// Defaults to the local backend for development.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api/v1',
  );

  static const String environmentName = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'development',
  );

  static bool get isProduction => environmentName == 'production';
}
