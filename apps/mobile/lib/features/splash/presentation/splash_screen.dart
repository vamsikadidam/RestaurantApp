import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

/// Brand splash for India Garden SCV.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.brandBlack,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.asset(
                'assets/branding/logo.jpeg',
                width: 112,
                height: 112,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.restaurant_menu,
                  size: 72,
                  color: AppTheme.brandOrange,
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'India Garden',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    letterSpacing: 0.5,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              'Santa Clarita',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white70,
                  ),
            ),
            const SizedBox(height: 28),
            const CircularProgressIndicator(color: AppTheme.brandOrange),
          ],
        ),
      ),
    );
  }
}
