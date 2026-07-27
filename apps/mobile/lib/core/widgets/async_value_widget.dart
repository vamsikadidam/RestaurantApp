import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_exception.dart';

/// Renders an [AsyncValue] with consistent loading/error/data handling
/// across every screen, including a friendly retryable error state built
/// from [ApiException] where possible.
class AsyncValueWidget<T> extends StatelessWidget {
  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final VoidCallback? onRetry;
  final Widget Function()? loading;

  const AsyncValueWidget({
    super.key,
    required this.value,
    required this.data,
    this.onRetry,
    this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return value.when(
      data: data,
      loading: () =>
          loading?.call() ?? const Center(child: CircularProgressIndicator()),
      error: (error, stackTrace) => _ErrorState(error: error, onRetry: onRetry),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final Object error;
  final VoidCallback? onRetry;

  const _ErrorState({required this.error, this.onRetry});

  @override
  Widget build(BuildContext context) {
    final currentError = error;
    final message = currentError is ApiException
        ? currentError.message
        : 'Something went wrong. Please try again.';

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline,
                size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              FilledButton(onPressed: onRetry, child: const Text('Try again')),
            ],
          ],
        ),
      ),
    );
  }
}
