import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/router/app_router.dart';
import '../application/auth_controller.dart';

/// Shown to signed-out visitors when they choose to sign in, register, or
/// check out as a guest - browsing the menu itself never requires this
/// (see AppRouter redirect logic).
class WelcomeScreen extends ConsumerStatefulWidget {
  const WelcomeScreen({super.key});

  @override
  ConsumerState<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends ConsumerState<WelcomeScreen> {
  bool _isContinuingAsGuest = false;

  Future<void> _continueAsGuest() async {
    setState(() => _isContinuingAsGuest = true);
    try {
      await ref.read(authControllerProvider.notifier).continueAsGuest();
      if (mounted) context.go(AppRoutes.home);
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _isContinuingAsGuest = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Spacer(),
              Icon(Icons.restaurant_menu,
                  size: 64, color: theme.colorScheme.primary),
              const SizedBox(height: 16),
              Text('Welcome', style: theme.textTheme.headlineMedium),
              const SizedBox(height: 8),
              Text(
                'Sign in for a faster checkout and order history, or continue as a guest.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium,
              ),
              const Spacer(),
              FilledButton(
                onPressed: () => context.push(AppRoutes.login),
                style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(48)),
                child: const Text('Log in'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => context.push(AppRoutes.register),
                style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48)),
                child: const Text('Create an account'),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: _isContinuingAsGuest ? null : _continueAsGuest,
                child: _isContinuingAsGuest
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Continue as guest'),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}
