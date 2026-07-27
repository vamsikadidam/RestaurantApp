import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Decouples the low-level network layer (core/network) from the auth
/// feature: the Dio 401/refresh-retry interceptor reports "the session is no
/// longer valid" here, and AuthController (features/auth) listens for it,
/// rather than the two depending on each other directly.
class SessionEvents extends ChangeNotifier {
  void notifySessionExpired() => notifyListeners();
}

final sessionEventsProvider = Provider<SessionEvents>((ref) => SessionEvents());
