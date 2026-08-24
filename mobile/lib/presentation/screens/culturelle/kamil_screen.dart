import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/app_drawer.dart';

class KamilScreen extends StatefulWidget {
  const KamilScreen({super.key});

  @override
  State<KamilScreen> createState() => _KamilScreenState();
}

class _KamilScreenState extends State<KamilScreen>
    with SingleTickerProviderStateMixin {
  final _api = ApiService();
  late TabController _tabController;
  List<dynamic> _kamils = [];
  List<dynamic> _progressions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        _api.get(ApiEndpoints.kamil),
        _api.get(ApiEndpoints.progressions),
      ]);
      if (mounted) {
        setState(() {
          _kamils = results[0]['results'] ?? [];
          _progressions = results[1]['results'] ?? [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Programme Kamil'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primaryGold,
          labelColor: AppColors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(text: 'Programmes', icon: Icon(Icons.menu_book, size: 16)),
            Tab(text: 'Progressions', icon: Icon(Icons.trending_up, size: 16)),
          ],
        ),
      ),
      drawer: const AppDrawer(),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
          : TabBarView(
              controller: _tabController,
              children: [
                _KamilList(kamils: _kamils),
                _ProgressionList(progressions: _progressions),
              ],
            ),
    );
  }
}

class _KamilList extends StatelessWidget {
  final List<dynamic> kamils;
  const _KamilList({required this.kamils});

  @override
  Widget build(BuildContext context) {
    if (kamils.isEmpty) {
      return const Center(child: Text('Aucun programme Kamil'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: kamils.length,
      itemBuilder: (_, i) {
        final k = kamils[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primaryGold.withValues(alpha: 0.3)),
          ),
          child: ListTile(
            leading: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.menu_book, color: AppColors.white, size: 20),
            ),
            title: Text(k['nom'] ?? k['titre'] ?? '',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            subtitle: Text(
              k['description'] ?? '',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12),
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (k['montant_requis'] != null)
                  Text(
                    '${NumberFormat('#,##0', 'fr_FR').format(double.tryParse(k['montant_requis']?.toString() ?? '0') ?? 0)} F',
                    style: const TextStyle(
                        color: AppColors.primaryGold,
                        fontWeight: FontWeight.bold,
                        fontSize: 12),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ProgressionList extends StatelessWidget {
  final List<dynamic> progressions;
  const _ProgressionList({required this.progressions});

  @override
  Widget build(BuildContext context) {
    if (progressions.isEmpty) {
      return const Center(child: Text('Aucune progression enregistrée'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: progressions.length,
      itemBuilder: (_, i) {
        final p = progressions[i];
        final date = DateTime.tryParse(p['date_lecture'] ?? p['date'] ?? '');
        final membre = p['membre'] is Map
            ? p['membre']['username'] ?? ''
            : p['membre']?.toString() ?? '';
        final chapitre = p['chapitre'] is Map
            ? p['chapitre']['nom'] ?? p['chapitre']['numero']?.toString() ?? ''
            : p['chapitre']?.toString() ?? '';

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primaryGold.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppColors.primaryGreen.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.auto_stories,
                    color: AppColors.primaryGreen, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (membre.isNotEmpty)
                      Text(membre,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 13)),
                    if (chapitre.isNotEmpty)
                      Text('Chapitre: $chapitre',
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.primaryGold)),
                    if (date != null)
                      Text(
                        DateFormat('d MMM yyyy', 'fr_FR').format(date),
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textGrey),
                      ),
                  ],
                ),
              ),
              if (p['statut'] != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    p['statut'] == 'valide' ? 'Validé' : p['statut'],
                    style: const TextStyle(
                        color: AppColors.success,
                        fontSize: 10,
                        fontWeight: FontWeight.w600),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
