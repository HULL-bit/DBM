import 'package:flutter/material.dart';

class AppColors {
  // Primary Green
  static const Color primaryGreen = Color(0xFF2D5F3F);
  static const Color lightGreen = Color(0xFF3d7a52);
  static const Color darkGreen = Color(0xFF1e4029);

  // Secondary Gold
  static const Color primaryGold = Color(0xFFC9A961);
  static const Color lightGold = Color(0xFFddc078);
  static const Color darkGold = Color(0xFFb89447);

  // Background
  static const Color backgroundBeige = Color(0xFFF4EAD5);
  static const Color lightBeige = Color(0xFFfaf5eb);

  // Text
  static const Color textDark = Color(0xFF1A1A1A);
  static const Color textGrey = Color(0xFF6B7280);
  static const Color white = Color(0xFFFFFFFF);

  // Status
  static const Color success = Color(0xFF22C55E);
  static const Color error = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color info = Color(0xFF3B82F6);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [darkGreen, primaryGreen],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient goldGradient = LinearGradient(
    colors: [darkGold, primaryGold],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
