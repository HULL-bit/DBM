import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/colors.dart';
import '../../../data/providers/auth_provider.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/stat_card.dart';

class JewrinDashboard extends StatelessWidget {
  const JewrinDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Espace Jewrin'),
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
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: AppColors.goldGradient,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.mosque, color: AppColors.white, size: 28),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'As-salamu alaykum',
                            style: TextStyle(
                              color: AppColors.white.withOpacity(0.8),
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            user?.fullName ?? 'Jewrin',
                            style: const TextStyle(
                              color: AppColors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primaryGreen.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      _roleLabel(user?.role ?? ''),
                      style: const TextStyle(
                        color: AppColors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Modules selon le rôle
            const SectionHeader(
              title: 'Mes modules',
              icon: Icons.grid_view_outlined,
            ),
            const SizedBox(height: 12),
            _buildModules(context, user?.role ?? ''),
          ],
        ),
      ),
    );
  }

  Widget _buildModules(BuildContext context, String role) {
    final allModules = [
      if (role == 'jewrin' || role == 'jewrine_culturelle') ...[
        ('Validations Kamil', Icons.verified_outlined, '/kamil', AppColors.primaryGreen),
        ('Activités religieuses', Icons.mosque_outlined, '/activites-religieuses', AppColors.darkGreen),
      ],
      if (role == 'jewrin' || role == 'jewrine_finance') ...[
        ('Finance', Icons.payments_outlined, '/cotisations', AppColors.primaryGold),
        ('Levées de fonds', Icons.volunteer_activism_outlined, '/levees-fonds', AppColors.darkGold),
      ],
      if (role == 'jewrin' || role == 'jewrine_sociale') ...[
        ('Projets sociaux', Icons.handshake_outlined, '/projets-sociaux', AppColors.success),
      ],
      if (role == 'jewrin' || role == 'jewrine_communication') ...[
        ('Messagerie', Icons.chat_outlined, '/messagerie', AppColors.info),
        ('Notifications', Icons.notifications_outlined, '/notifications', AppColors.warning),
      ],
      if (role == 'jewrin' || role == 'jewrine_organisation') ...[
        ('Réunions', Icons.meeting_room_outlined, '/reunions', AppColors.error),
      ],
      if (role == 'jewrin' || role == 'jewrine_scientifique') ...[
        ('Cours scientifiques', Icons.science_outlined, '/cours', AppColors.info),
      ],
      if (role == 'jewrin' || role == 'jewrine_conservatoire') ...[
        ('Conservatoire', Icons.archive_outlined, '/conservatoire', AppColors.darkGold),
      ],
      // Communs
      ('Événements', Icons.event_outlined, '/evenements', AppColors.primaryGreen),
      ('Actualités', Icons.newspaper_outlined, '/news', AppColors.primaryGold),
      ('Bibliothèque', Icons.library_books_outlined, '/bibliotheque', AppColors.success),
      ('Profil', Icons.person_outlined, '/profile', AppColors.textGrey),
    ];

    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.9,
      ),
      itemCount: allModules.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemBuilder: (ctx, i) {
        final m = allModules[i];
        return GestureDetector(
          onTap: () => context.push(m.$3),
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.primaryGold.withOpacity(0.3)),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: m.$4.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(m.$2, color: m.$4, size: 22),
                ),
                const SizedBox(height: 8),
                Text(
                  m.$1,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textDark,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _roleLabel(String role) {
    const labels = {
      'jewrin': 'Jewrin',
      'jewrine_finance': 'Jewrine Finance',
      'jewrine_culturelle': 'Jewrine Culturelle',
      'jewrine_sociale': 'Jewrine Sociale',
      'jewrine_communication': 'Jewrine Communication',
      'jewrine_organisation': 'Jewrine Organisation',
      'jewrine_scientifique': 'Jewrine Scientifique',
      'jewrine_conservatoire': 'Jewrine Conservatoire',
    };
    return labels[role] ?? 'Jewrin';
  }
}
