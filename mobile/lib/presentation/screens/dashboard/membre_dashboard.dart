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

class MembreDashboard extends StatefulWidget {
  const MembreDashboard({super.key});

  @override
  State<MembreDashboard> createState() => _MembreDashboardState();
}

class _MembreDashboardState extends State<MembreDashboard> {
  final _api = ApiService();
  List<dynamic> _evenements = [];
  List<dynamic> _notifications = [];
  bool _loading = true;

  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() { _loading = true; _errorMessage = null; });
    try {
      final results = await Future.wait([
        _api.get(ApiEndpoints.evenements),
        _api.get(ApiEndpoints.notifications),
      ]);
      if (mounted) {
        setState(() {
          final evtData = results[0]['results'] ?? results[0]['data'];
          _evenements = evtData is List ? List<dynamic>.from(evtData) : [];
          
          final notifData = results[1]['results'] ?? results[1]['data'];
          _notifications = notifData is List ? List<dynamic>.from(notifData) : [];
          
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() {
        _loading = false;
        _errorMessage = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Espace Membre'),
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
        onRefresh: _loadData,
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
                    if (_errorMessage != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.shade200),
                        ),
                        child: Text(_errorMessage!, style: const TextStyle(color: Colors.red)),
                      ),
                    // Header de bienvenue
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor: AppColors.primaryGold,
                            child: Text(
                              (user?.fullName.isNotEmpty == true
                                      ? user!.fullName[0]
                                      : 'M')
                                  .toUpperCase(),
                              style: const TextStyle(
                                color: AppColors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'As-salamu alaykum',
                                  style: TextStyle(
                                    color: AppColors.primaryGold,
                                    fontSize: 12,
                                  ),
                                ),
                                Text(
                                  user?.fullName ?? 'Membre',
                                  style: const TextStyle(
                                    color: AppColors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  DateFormat('EEEE d MMMM', 'fr_FR')
                                      .format(DateTime.now()),
                                  style: TextStyle(
                                    color: AppColors.white.withOpacity(0.7),
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Accès rapides
                    const SectionHeader(
                      title: 'Mes accès',
                      icon: Icons.apps_outlined,
                    ),
                    const SizedBox(height: 12),
                    GridView.count(
                      crossAxisCount: 3,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 0.95,
                      children: [
                        _QuickCard('Cotisations', Icons.payments_outlined,
                            AppColors.primaryGold, '/cotisations', context),
                        _QuickCard('Kamil', Icons.menu_book_outlined,
                            AppColors.primaryGreen, '/kamil', context),
                        _QuickCard('Événements', Icons.event_outlined,
                            AppColors.info, '/evenements', context),
                        _QuickCard('Canaux', Icons.forum_outlined,
                            AppColors.darkGreen, '/canaux', context),
                        _QuickCard('Messagerie', Icons.chat_outlined,
                            AppColors.warning, '/messagerie', context),
                        _QuickCard('Bibliothèque', Icons.library_books_outlined,
                            AppColors.success, '/bibliotheque', context),
                        _QuickCard('Profil', Icons.person_outlined,
                            AppColors.textGrey, '/profile', context),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Événements à venir
                    SectionHeader(
                      title: 'Événements à venir',
                      icon: Icons.event_outlined,
                      actionLabel: 'Voir tout',
                      onAction: () => context.push('/evenements'),
                    ),
                    const SizedBox(height: 12),
                    if (_evenements.isEmpty)
                      _EmptyState('Aucun événement à venir')
                    else
                      ...(_evenements.take(3).map((e) => _EvenementCard(e))),
                    const SizedBox(height: 20),

                    // Notifications récentes
                    SectionHeader(
                      title: 'Notifications',
                      icon: Icons.notifications_outlined,
                      actionLabel: 'Voir tout',
                      onAction: () => context.push('/notifications'),
                    ),
                    const SizedBox(height: 12),
                    if (_notifications.isEmpty)
                      _EmptyState('Aucune notification')
                    else
                      ...(_notifications.take(3).map((n) => _NotifCard(n))),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
      ),
    );
  }
}

Widget _QuickCard(
    String label, IconData icon, Color color, String route, BuildContext ctx) {
  return GestureDetector(
    onTap: () => ctx.go(route),
    child: Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primaryGold.withOpacity(0.3)),
      ),
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 6),
          Text(
            label,
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
    ),
  );
}

class _EvenementCard extends StatelessWidget {
  final dynamic data;
  const _EvenementCard(this.data);

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(data['date_debut'] ?? '');
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primaryGold.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.primaryGreen,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  date != null ? DateFormat('d').format(date) : '-',
                  style: const TextStyle(
                    color: AppColors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  date != null ? DateFormat('MMM', 'fr').format(date) : '',
                  style: const TextStyle(color: AppColors.primaryGold, fontSize: 10),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data['titre'] ?? '',
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (data['lieu'] != null)
                  Text(
                    data['lieu'],
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 1,
                  ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppColors.textGrey, size: 18),
        ],
      ),
    );
  }
}

class _NotifCard extends StatelessWidget {
  final dynamic data;
  const _NotifCard(this.data);

  @override
  Widget build(BuildContext context) {
    final lu = data['lu'] ?? false;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: lu ? AppColors.white : AppColors.primaryGreen.withOpacity(0.05),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: lu
              ? AppColors.primaryGold.withOpacity(0.2)
              : AppColors.primaryGreen.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: lu ? Colors.transparent : AppColors.primaryGreen,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data['titre'] ?? '',
                  style: TextStyle(
                    fontWeight: lu ? FontWeight.w400 : FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                Text(
                  data['message'] ?? '',
                  style: Theme.of(context).textTheme.bodyMedium,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final String message;
  const _EmptyState(this.message);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 24),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primaryGold.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Icon(Icons.inbox_outlined,
              color: AppColors.textGrey.withOpacity(0.5), size: 36),
          const SizedBox(height: 8),
          Text(message, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}
