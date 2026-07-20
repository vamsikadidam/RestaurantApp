import 'package:flutter/material.dart';

/// Central Material 3 theme for the restaurant app. Colors are placeholders
/// until brand colors are supplied; typography favors larger, accessible
/// sizes per the design requirements (large touch targets, readable type).
class AppTheme {
  AppTheme._();

  static const Color _seedColor = Color(0xFFD84315); // warm restaurant accent

  static ThemeData light() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: _seedColor,
      brightness: Brightness.light,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      visualDensity: VisualDensity.standard,
      textTheme: _textTheme(colorScheme),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      appBarTheme: const AppBarTheme(centerTitle: false, elevation: 0),
    );
  }

  static ThemeData dark() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: _seedColor,
      brightness: Brightness.dark,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      textTheme: _textTheme(colorScheme),
    );
  }

  static TextTheme _textTheme(ColorScheme scheme) {
    // Slightly larger base sizes than Material defaults for readability /
    // accessibility, per the design requirements.
    return const TextTheme(
      headlineLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.w700),
      headlineMedium: TextStyle(fontSize: 26, fontWeight: FontWeight.w700),
      titleLarge: TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
      titleMedium: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
      bodyLarge: TextStyle(fontSize: 17),
      bodyMedium: TextStyle(fontSize: 15),
      labelLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
    );
  }
}
