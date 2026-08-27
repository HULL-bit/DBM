import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/colors.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../data/services/api_service.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/stat_card.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  final _api = ApiService();
  Map<String, dynamic>? _stats;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    try {
      final data = await _api.get(ApiEndpoints.adminStats);
      if (mounted) setState(() { _stats = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final fmt = NumberFormat('#,##0', 'fr_FR');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tableau de bord Admin'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
          IconButton(
            icon: const Icon(Icons.person_outlined),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: RefreshIndicator(
        onRefresh: _loadStats,
        color: AppColors.primaryGreen,
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Salutation
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'As-salamu alaykum,',
                            style: TextStyle(
                              color: AppColors.primaryGold,
                              fontSize: 13,
                            ),
                          ),
                          Text(
                            user?.fullName ?? 'Administrateur',
                            style: const TextStyle(
                              color: AppColors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            DateFormat('EEEE d MMMM yyyy', 'fr_FR')
                                .format(DateTime.now()),
                            style: TextStyle(
                              color: AppColors.white.withValues(alpha: 0.7),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Statistiques
                    const SectionHeader(
                      title: 'Statistiques',
                      icon: Icons.bar_chart,
                    ),
                    const SizedBox(height: 12),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.4,
                      children: [
                        StatCard(
                          title: 'Membres actifs',
                          value: _stats?['total_membres']?.toString() ?? '0',
                          icon: Icons.group_outlined,
                          color: AppColors.primaryGreen,
                          onTap: () => context.push('/membres'),
                        ),
                        StatCard(
                          title: 'Cotisations ce mois',
                          value: fmt.format(
                              _stats?['cotisations_mois'] ?? 0),
                          icon: Icons.payments_outlined,
                          color: AppColors.primaryGold,
                          onTap: () => context.push('/cotisations'),
                        ),
                        StatCard(
                          title: 'Événements',
                          value: _stats?['total_evenements']?.toString() ?? '0',
                          icon: Icons.event_outlined,
                          color: AppColors.info,
                          onTap: () => context.push('/evenements'),
                        ),
                        StatCard(
                          title: 'Projets sociaux',
                          value: _stats?['total_projets']?.toString() ?? '0',
                          icon: Icons.handshake_outlined,
                          color: AppColors.success,
                          onTap: () => context.push('/projets-sociaux'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Accès rapides
                    const SectionHeader(
                      title: 'Accès rapides',
                      icon: Icons.grid_view_outlined,
                    ),
                    const SizedBox(height: 12),
                    _QuickAccessGrid(),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
      ),
    );
  }
}

class _QuickAccessGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final items = [
      ('Membres', Icons.group_outlined, '/membres', AppColors.primaryGreen),
      ('Canaux', Icons.forum_outlined, '/canaux', AppColors.darkGreen),
      ('SAAS YI', Icons.payments_outlined, '/cotisations', AppColors.primaryGold),
      ('Dépenses', Icons.receipt_long_outlined, '/depenses', AppColors.darkGold),
      ('Événements', Icons.event_outlined, '/evenements', AppColors.info),
      ('Actualités', Icons.newspaper_outlined, '/news', AppColors.warning),
      ('Kamil', Icons.menu_book_outlined, '/kamil', AppColors.darkGreen),
      ('Bibliothèque', Icons.library_books_outlined, '/bibliotheque', AppColors.success),
      ('Conservatoire', Icons.archive_outlined, '/conservatoire', AppColors.darkGold),
    ];

    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.9,
      ),
      itemCount: items.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemBuilder: (ctx, i) {
        final item = items[i];
        return GestureDetector(
          onTap: () => context.push(item.$3),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: item.$4.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                  border:
                      Border.all(color: item.$4.withValues(alpha: 0.3), width: 1),
                ),
                child: Icon(item.$2, color: item.$4, size: 20),
              ),
              const SizedBox(height: 6),
              Text(
                item.$1,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textDark,
                  height: 1.2,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        );
      },
    );
  }
}
