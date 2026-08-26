import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/colors.dart';

/// Avatar sécurisé qui gère les erreurs de chargement d'image (404, timeout, etc.)
/// Utilise Image.network avec errorBuilder au lieu de CircleAvatar.backgroundImage
/// qui ne supporte pas errorBuilder et crash en cas d'erreur réseau.
class SafeAvatar extends StatelessWidget {
  final String? photoUrl;
  final String fallbackText;
  final double radius;
  final Color? backgroundColor;
  final Color? textColor;

  const SafeAvatar({
    super.key,
    required this.fallbackText,
    this.photoUrl,
    this.radius = 24,
    this.backgroundColor,
    this.textColor,
  });

  String _resolveUrl(String url) {
    if (url.startsWith('http')) return url;
    return '${ApiEndpoints.mediaBaseUrl}$url';
  }

  @override
  Widget build(BuildContext context) {
    final bgColor = backgroundColor ?? AppColors.primaryGreen.withValues(alpha: 0.15);
    final fgColor = textColor ?? AppColors.primaryGreen;
    final initial = fallbackText.isNotEmpty ? fallbackText[0].toUpperCase() : '?';

    if (photoUrl == null || photoUrl!.isEmpty) {
      return _buildFallback(bgColor, fgColor, initial);
    }

    return ClipOval(
      child: SizedBox(
        width: radius * 2,
        height: radius * 2,
        child: Image.network(
          _resolveUrl(photoUrl!),
          fit: BoxFit.cover,
          loadingBuilder: (ctx, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return Container(
              color: bgColor,
              child: Center(
                child: SizedBox(
                  width: radius * 0.6,
                  height: radius * 0.6,
                  child: CircularProgressIndicator(
                    strokeWidth: 1.5,
                    valueColor: AlwaysStoppedAnimation<Color>(fgColor),
                  ),
                ),
              ),
            );
          },
          errorBuilder: (ctx, error, stackTrace) {
            return _buildFallback(bgColor, fgColor, initial);
          },
        ),
      ),
    );
  }

  Widget _buildFallback(Color bgColor, Color fgColor, String initial) {
    return Container(
      width: radius * 2,
      height: radius * 2,
      decoration: BoxDecoration(
        color: bgColor,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            color: fgColor,
            fontSize: radius * 0.75,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
