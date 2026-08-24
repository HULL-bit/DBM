import 'package:go_router/go_router.dart';
import '../../presentation/screens/auth/login_screen.dart';
import '../../presentation/screens/profile_screen.dart';
import '../../presentation/screens/more_screens.dart';
import '../../presentation/screens/finance/cotisations_screen.dart' as finance;
import '../../presentation/screens/membres_screen.dart';
import '../../presentation/screens/news_screen.dart';
import '../../presentation/screens/evenements_screen.dart';
import '../../presentation/screens/conservatoire_screen.dart';
import '../../presentation/screens/dashboard/admin_dashboard.dart';
import '../../presentation/screens/dashboard/jewrin_dashboard.dart';
import '../../presentation/screens/splash_screen.dart';
import '../../presentation/screens/dashboard/membre_dashboard.dart';
import '../../presentation/screens/auth/register_screen.dart';
import '../../presentation/screens/messagerie_screen.dart';
import '../../presentation/screens/communication/canaux_screen.dart';
import '../../presentation/screens/placeholder_screen.dart';
import '../../data/providers/auth_provider.dart';

class AppRouter {
  final AuthProvider authProvider;
  AppRouter(this.authProvider);

  late final router = GoRouter(
    initialLocation: '/splash',
    refreshListenable: authProvider,
    redirect: (context, state) {
      final isLoggedIn = authProvider.isAuthenticated;
      final isSplash = state.matchedLocation == '/splash';
      final isLoggingIn = state.matchedLocation == '/login';
      final isRegistering = state.matchedLocation == '/register';

      if (!isLoggedIn && !isLoggingIn && !isSplash && !isRegistering) return '/login';
      if (isLoggedIn && isLoggingIn) return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) {
          final user = authProvider.user;
          if (user?.isAdmin == true) return const AdminDashboard();
          if (user?.isJewrin == true) return const JewrinDashboard();
          return const MembreDashboard();
        },
      ),
      GoRoute(
        path: '/admin',
        builder: (context, state) => const AdminDashboard(),
      ),
      GoRoute(
        path: '/jewrin',
        builder: (context, state) => const JewrinDashboard(),
      ),
      GoRoute(
        path: '/membre',
        builder: (context, state) => const MembreDashboard(),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/profil',
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/membres',
        builder: (context, state) => const MembresScreen(),
      ),
      GoRoute(
        path: '/annonces',
        builder: (context, state) => const AnnoncesScreen(),
      ),
      GoRoute(
        path: '/conservatoire',
        builder: (context, state) => const ConservatoireScreen(),
      ),
      GoRoute(
        path: '/cotisations',
        builder: (context, state) => const finance.CotisationsScreen(),
      ),
      GoRoute(
        path: '/news',
        builder: (context, state) => const NewsScreen(),
      ),
      GoRoute(
        path: '/evenements',
        builder: (context, state) => const EvenementsScreen(),
      ),
      GoRoute(
        path: '/kamil',
        builder: (context, state) => const KamilScreen(),
      ),
      GoRoute(
        path: '/progressions',
        builder: (context, state) => const ProgressionsScreen(),
      ),
      GoRoute(
        path: '/bibliotheque',
        builder: (context, state) => const BibliothequeScreen(),
      ),
      GoRoute(
        path: '/transactions',
        builder: (context, state) => const TransactionsScreen(),
      ),
      GoRoute(
        path: '/levees-fonds',
        builder: (context, state) => const LeveesFondsScreen(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/reunions',
        builder: (context, state) => const ReunionsScreen(),
      ),
      GoRoute(
        path: '/projets-sociaux',
        builder: (context, state) => const ProjetsSociauxScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/messagerie',
        builder: (context, state) => const MessagerieScreen(),
      ),
      GoRoute(
        path: '/canaux',
        builder: (context, state) => const CanauxScreen(),
      ),
      GoRoute(
        path: '/placeholder',
        builder: (context, state) => const PlaceholderScreen(title: 'Bientôt disponible'),
      ),
    ],
  );
}
