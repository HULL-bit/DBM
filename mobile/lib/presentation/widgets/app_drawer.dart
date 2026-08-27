import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/colors.dart';
import '../../core/constants/api_endpoints.dart';
import '../../data/providers/auth_provider.dart';
import 'logo_widget.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    if (user == null) return const SizedBox.shrink();

    final isAdmin = user.isAdmin;
    final isJewrin = user.isJewrin;

    return Drawer(
      child: Container(
        color: AppColors.darkGreen,
        child: Column(
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 48, 16, 20),
              decoration: BoxDecoration(
                color: AppColors.primaryGreen,
                border: Border(
                  bottom: BorderSide(
                    color: AppColors.primaryGold.withValues(alpha: 0.5),
                    width: 1,
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const LogoDaara(height: 44, dark: true),
                  const SizedBox(height: 16),
                  // Avatar with profile photo
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: AppColors.primaryGold,
                    backgroundImage: user.photo != null && user.photo!.isNotEmpty
                        ? NetworkImage(
                            user.photo!.startsWith('http')
                                ? user.photo!
                                : '${ApiEndpoints.mediaBaseUrl}${user.photo}',
                          )
                        : null,
                    child: user.photo != null && user.photo!.isNotEmpty
                        ? null
                        : Text(
                            user.fullName.isNotEmpty
                                ? user.fullName[0].toUpperCase()
                                : 'U',
                            style: const TextStyle(
                              color: AppColors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    user.fullName,
                    style: const TextStyle(
                      color: AppColors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    _roleLabel(user.role),
                    style: TextStyle(
                      color: AppColors.primaryGold,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),

            // Menu items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8),
                children: [
                  // Dashboard
                  _DrawerItem(
                    icon: Icons.dashboard_outlined,
                    label: 'Tableau de bord',
                    onTap: () {
                      if (isAdmin) {
                        context.go('/admin');
                      } else if (isJewrin) {
                        context.go('/jewrin');
                      } else {
                        context.go('/membre');
                      }
                      Navigator.pop(context);
                    },
                  ),

                  _SectionLabel('INFORMATIONS'),
                  _DrawerItem(
                    icon: Icons.event_outlined,
                    label: 'Événements',
                    onTap: () => _nav(context, '/evenements'),
                  ),
                  _DrawerItem(
                    icon: Icons.newspaper_outlined,
                    label: 'Actualités',
                    onTap: () => _nav(context, '/news'),
                  ),

                  _SectionLabel('FINANCE'),
                  _DrawerItem(
                    icon: Icons.payments_outlined,
                    label: 'SAAS YI',
                    onTap: () => _nav(context, '/cotisations'),
                  ),
                  _DrawerItem(
                    icon: Icons.history_outlined,
                    label: 'Samayy SASS',
                    onTap: () => _nav(context, '/transactions'),
                  ),
                  if (user.isJewrinFinance)
                    _DrawerItem(
                      icon: Icons.receipt_long_outlined,
                      label: 'Dépenses & Bilan',
                      onTap: () => _nav(context, '/depenses'),
                    ),

                  _SectionLabel('CULTUREL'),
                  _DrawerItem(
                    icon: Icons.menu_book_outlined,
                    label: 'Programme Kamil',
                    onTap: () => _nav(context, '/kamil'),
                  ),
                  _DrawerItem(
                    icon: Icons.trending_up_outlined,
                    label: 'Mes progressions',
                    onTap: () => _nav(context, '/progressions'),
                  ),

                  _SectionLabel('RESSOURCES'),
                  _DrawerItem(
                    icon: Icons.library_books_outlined,
                    label: 'Bibliothèque',
                    onTap: () => _nav(context, '/bibliotheque'),
                  ),
                  _DrawerItem(
                    icon: Icons.archive_outlined,
                    label: 'Conservatoire',
                    onTap: () => _nav(context, '/conservatoire'),
                  ),


                  _SectionLabel('COMMUNICATION'),
                  _DrawerItem(
                    icon: Icons.forum_outlined,
                    label: 'Canaux',
                    onTap: () => _nav(context, '/canaux'),
                  ),
                  _DrawerItem(
                    icon: Icons.message_outlined,
                    label: 'Messagerie',
                    onTap: () => _nav(context, '/messagerie'),
                  ),
                  _DrawerItem(
                    icon: Icons.notifications_outlined,
                    label: 'Notifications',
                    onTap: () => _nav(context, '/notifications'),
                  ),

                  if (isAdmin) ...[
                    _SectionLabel('ADMINISTRATION'),
                    _DrawerItem(
                      icon: Icons.group_outlined,
                      label: 'Gestion membres',
                      onTap: () => _nav(context, '/membres'),
                    ),
                  ],

                  const Divider(color: Colors.white24, height: 24),

                  _DrawerItem(
                    icon: Icons.person_outlined,
                    label: 'Mon profil',
                    onTap: () => _nav(context, '/profile'),
                  ),
                  _DrawerItem(
                    icon: Icons.logout,
                    label: 'Déconnexion',
                    color: AppColors.error,
                    onTap: () async {
                      Navigator.pop(context);
                      await auth.logout();
                      if (context.mounted) context.go('/login');
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _nav(BuildContext context, String route) {
    Navigator.pop(context);
    context.push(route);
  }

  String _roleLabel(String role) {
    const labels = {
      'admin': 'Administrateur',
      'membre': 'Membre',
      'jewrin': 'Jewrin',
      'jewrine_finance': 'Jewrine - Finance',
      'jewrine_culturelle': 'Jewrine - Culturelle',
      'jewrine_sociale': 'Jewrine - Sociale',
      'jewrine_communication': 'Jewrine - Communication',
      'jewrine_organisation': 'Jewrine - Organisation',
      'jewrine_scientifique': 'Jewrine - Scientifique',
      'jewrine_conservatoire': 'Jewrine - Conservatoire',
    };
    return labels[role] ?? role;
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors.white;
    return ListTile(
      dense: true,
      leading: Icon(icon, color: c, size: 20),
      title: Text(
        label,
        style: TextStyle(color: c, fontSize: 13, fontWeight: FontWeight.w500),
      ),
      onTap: onTap,
      hoverColor: AppColors.primaryGold.withValues(alpha: 0.1),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel(this.label);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Text(
        label,
        style: TextStyle(
          color: AppColors.primaryGold.withValues(alpha: 0.7),
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}
