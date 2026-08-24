import 'package:flutter/material.dart';
import '../../core/constants/colors.dart';

class LogoDaara extends StatefulWidget {
  final double height;
  final bool showText;
  final bool dark;
  final bool animate;

  const LogoDaara({
    super.key,
    this.height = 50,
    this.showText = true,
    this.dark = false,
    this.animate = false,
  });

  @override
  State<LogoDaara> createState() => _LogoDaaraState();
}

class _LogoDaaraState extends State<LogoDaara> with SingleTickerProviderStateMixin {
  AnimationController? _rotationController;

  @override
  void initState() {
    super.initState();
    if (widget.animate) {
      _rotationController = AnimationController(
        vsync: this,
        duration: const Duration(seconds: 12),
      )..repeat();
    }
  }

  @override
  void dispose() {
    _rotationController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final height = widget.height;
    final dark = widget.dark;
    final showText = widget.showText;

    final sunburst = Container(
      width: height * 1.5,
      height: height * 1.5,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: SweepGradient(
          colors: [
            AppColors.primaryGold.withOpacity(0.35),
            AppColors.primaryGold.withOpacity(0.05),
            AppColors.primaryGold.withOpacity(0.35),
          ],
        ),
      ),
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          alignment: Alignment.center,
          children: [
            // Décoration "sunburst" dorée en arrière-plan, tourne lentement en continu
            _rotationController != null
                ? RotationTransition(turns: _rotationController!, child: sunburst)
                : sunburst,
            // Anneau secondaire, pulse doucement
            if (_rotationController != null)
              AnimatedBuilder(
                animation: _rotationController!,
                builder: (context, child) {
                  final pulse = 1.0 + (0.04 * (0.5 - (_rotationController!.value - 0.5).abs()));
                  return Transform.scale(scale: pulse, child: child);
                },
                child: Container(
                  width: height * 1.2,
                  height: height * 1.2,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.primaryGold.withOpacity(0.15), width: 1),
                  ),
                ),
              )
            else
              Container(
                width: height * 1.2,
                height: height * 1.2,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.primaryGold.withOpacity(0.15), width: 1),
                ),
              ),
            // Le logo lui-même
            Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10, spreadRadius: 2),
                ],
              ),
              child: Image.asset(
                'assets/images/logo.png',
                height: height,
                errorBuilder: (_, __, ___) => Container(
                  height: height,
                  width: height,
                  decoration: BoxDecoration(
                    color: dark ? AppColors.primaryGold : AppColors.primaryGreen,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.mosque,
                    color: dark ? AppColors.primaryGreen : AppColors.white,
                    size: height * 0.6,
                  ),
                ),
              ),
            ),
          ],
        ),
        if (showText) ...[
          const SizedBox(height: 16),
          Text(
            'DBM',
            style: TextStyle(
              color: dark ? AppColors.white : AppColors.primaryGreen,
              fontSize: height * 0.45,
              fontWeight: FontWeight.w900,
              letterSpacing: 4,
            ),
          ),
          Container(height: 2, width: 30, color: AppColors.primaryGold),
          const SizedBox(height: 8),
          Text(
            'Daara Barakatul Mahaahidi'.toUpperCase(),
            style: TextStyle(
              color: AppColors.primaryGold,
              fontSize: height * 0.16,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
            ),
          ),
        ],
      ],
    );
  }
}
