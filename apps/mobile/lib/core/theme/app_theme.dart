import 'package:flutter/material.dart';

/// India Garden brand theme — dark charcoal surfaces with warm orange accent,
/// matching https://indiagardenscv.com/ (black header, orange active nav).
class AppTheme {
  AppTheme._();

  static const Color brandOrange = Color(0xFFE85D04);
  static const Color brandOrangeDark = Color(0xFFD00000);
  static const Color brandBlack = Color(0xFF0B0B0C);
  static const Color brandCharcoal = Color(0xFF17181C);
  static const Color brandSurface = Color(0xFF1E1F24);

  static ThemeData light() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: brandOrange,
      brightness: Brightness.light,
      primary: brandOrange,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      visualDensity: VisualDensity.standard,
      textTheme: _textTheme(colorScheme),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          backgroundColor: brandOrange,
          foregroundColor: Colors.white,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
    const colorScheme = ColorScheme.dark(
      primary: brandOrange,
      onPrimary: Colors.white,
      secondary: brandOrangeDark,
      surface: brandSurface,
      onSurface: Color(0xFFF2F2F3),
      error: Color(0xFFFF6B6B),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: brandBlack,
      textTheme: _textTheme(colorScheme),
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        elevation: 0,
        backgroundColor: brandCharcoal,
        foregroundColor: Colors.white,
      ),
      cardTheme: CardThemeData(
        color: brandSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          backgroundColor: brandOrange,
          foregroundColor: Colors.white,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: brandCharcoal,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  static TextTheme _textTheme(ColorScheme scheme) {
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
