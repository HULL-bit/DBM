import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../data/providers/auth_provider.dart';
import '../widgets/logo_widget.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;
  late Animation<double> _slideAnim;

  @override
  void initState() {
    super.initState();

    // Masque la barre de statut pour un effet plein écran
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersive);

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    );

    _fadeAnim = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.0, 0.6, curve: Curves.easeIn),
    );
    _scaleAnim = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.0, 0.7, curve: Curves.easeOutBack),
    );
    _slideAnim = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.4, 1.0, curve: Curves.easeOut),
    );

    _controller.forward();

    Future.delayed(const Duration(milliseconds: 2500), () {
      if (!mounted) return;
      // Restaure la barre de statut
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

      final auth = context.read<AuthProvider>();
      if (auth.isAuthenticated) {
        final user = auth.user;
        if (user?.isAdmin == true) {
          context.go('/admin');
        } else if (user?.isJewrin == true) {
          context.go('/jewrin');
        } else {
          context.go('/membre');
        }
      } else {
        context.go('/login');
      }
    });
  }

  @override
  void dispose() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    
    // Taille du logo adaptée à l'écran : 30% de la largeur, max 160px
    final logoHeight = (screenWidth * 0.30).clamp(60.0, 160.0);

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          image: DecorationImage(
            image: AssetImage('assets/images/splash_bg.png'),
            fit: BoxFit.cover,
          ),
        ),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.black.withValues(alpha: 0.2),
                AppColors.darkGreen.withValues(alpha: 0.7),
              ],
            ),
          ),
          child: Stack(
            children: [
              // Contenu principal centré (scrollable en secours sur les très petits écrans,
              // pour ne jamais déborder visuellement quel que soit l'appareil)
              Center(
                child: SingleChildScrollView(
                  physics: const NeverScrollableScrollPhysics(),
                  child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Logo animé dans un cadre premium
                    ScaleTransition(
                      scale: _scaleAnim,
                      child: FadeTransition(
                        opacity: _fadeAnim,
                        child: Container(
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: AppColors.white.withValues(alpha: 0.08),
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.primaryGold.withValues(alpha: 0.3), width: 1.5),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 20, spreadRadius: 5),
                            ],
                          ),
                          child: LogoDaara(height: logoHeight, dark: true, showText: true, animate: true),
                        ),
                      ),
                    ),

                    SizedBox(height: screenHeight * 0.08),

                    // Indicateur de chargement
                    FadeTransition(
                      opacity: _slideAnim,
                      child: const Column(
                        children: [
                          SizedBox(
                            width: 28,
                            height: 28,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryGold),
                            ),
                          ),
                          SizedBox(height: 16),
                          Text(
                            'Chargement...',
                            style: TextStyle(color: Colors.white38, fontSize: 10, letterSpacing: 1),
                          ),
                        ],
                      ),
                    ),
                  ],
                  ),
                ),
              ),

              // Version en bas
              Positioned(
                bottom: screenHeight * 0.06,
                left: 0,
                right: 0,
                child: FadeTransition(
                  opacity: _slideAnim,
                  child: const Column(
                    children: [
                      Text(
                        'Wakeur Serigne Moustapha Saliou',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 1.2,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'v1.0.0',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white38,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
