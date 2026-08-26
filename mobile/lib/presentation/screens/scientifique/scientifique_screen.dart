import 'package:flutter/material.dart';
import '../../../core/constants/colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/app_drawer.dart';

class ScientifiqueScreen extends StatefulWidget {
  const ScientifiqueScreen({super.key});

  @override
  State<ScientifiqueScreen> createState() => _ScientifiqueScreenState();
}

class _ScientifiqueScreenState extends State<ScientifiqueScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _api = ApiService();
  
  // Data for Cours tab
  List<dynamic> _cours = [];
  List<dynamic> _domaines = [];
  bool _loadingCours = true;
  int? _selectedDomaine;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadCours();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadCours() async {
    try {
      final results = await Future.wait([
        _api.get(ApiEndpoints.cours),
        _api.get(ApiEndpoints.domaines),
      ]);
      if (mounted) {
        setState(() {
          _cours = results[0]['results'] ?? [];
          _domaines = results[1]['results'] ?? [];
          _loadingCours = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingCours = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scientifique'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primaryGold,
          tabs: const [
            Tab(text: 'Cours'),
            Tab(text: 'Ouvrages'),
            Tab(text: 'Publications'),
          ],
        ),
      ),
      drawer: const AppDrawer(),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildCoursTab(),
          _buildGenericTab(ApiEndpoints.ouvragesScientifiques, Icons.menu_book, 'Aucun ouvrage'),
          _buildGenericTab(ApiEndpoints.publicationsScientifiques, Icons.article, 'Aucune publication'),
        ],
      ),
    );
  }

  Widget _buildCoursTab() {
    final filtered = _selectedDomaine == null
        ? _cours
        : _cours.where((c) {
            final d = c['domaine'];
            return d is Map ? d['id'] == _selectedDomaine : d == _selectedDomaine;
          }).toList();

    return Column(
      children: [
        if (_domaines.isNotEmpty)
          Container(
            color: AppColors.primaryGreen,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            height: 50,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _domaines.length + 1,
              separatorBuilder: (_, _s) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                if (i == 0) {
                  return _FilterChip(
                    label: 'Tous',
                    selected: _selectedDomaine == null,
                    onTap: () => setState(() => _selectedDomaine = null),
                  );
                }
                final d = _domaines[i - 1];
                return _FilterChip(
                  label: d['nom'] ?? '',
                  selected: _selectedDomaine == d['id'],
                  onTap: () => setState(() => _selectedDomaine = d['id'] as int?),
                );
              },
            ),
          ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadCours,
            color: AppColors.primaryGreen,
            child: _loadingCours
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? const Center(child: Text('Aucun cours disponible'))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filtered.length,
                        itemBuilder: (_, i) => _CoursCard(data: filtered[i]),
                      ),
          ),
        ),
      ],
    );
  }

  Widget _buildGenericTab(String endpoint, IconData icon, String emptyMsg) {
    return FutureBuilder<Map<String, dynamic>>(
      future: _api.get(endpoint),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        final list = snapshot.data?['results'] ?? snapshot.data?['data'] ?? [];
        if (list.isEmpty) return Center(child: Text(emptyMsg, style: const TextStyle(color: AppColors.textGrey)));

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: list.length,
          itemBuilder: (ctx, i) {
            final item = list[i];
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppColors.primaryGreen.withValues(alpha: 0.1),
                  child: Icon(icon, color: AppColors.primaryGreen, size: 20),
                ),
                title: Text(item['titre'] ?? 'Sans titre', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: Text(item['auteur'] ?? item['type_publication'] ?? '', style: const TextStyle(fontSize: 12)),
                trailing: const Icon(Icons.download, size: 18, color: AppColors.primaryGold),
              ),
            );
          },
        );
      },
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _FilterChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryGold : AppColors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? AppColors.primaryGold : AppColors.white.withValues(alpha: 0.3)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? AppColors.white : AppColors.white.withValues(alpha: 0.8),
            fontSize: 12,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
      ),
    );
  }
}

class _CoursCard extends StatelessWidget {
  final dynamic data;
  const _CoursCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final domaine = data['domaine'] is Map ? data['domaine']['nom'] ?? '' : '';
    final modules = data['modules_count'] ?? data['nombre_modules'] ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primaryGold.withValues(alpha: 0.3)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(14),
        leading: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            gradient: AppColors.primaryGradient,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.science, color: AppColors.white, size: 24),
        ),
        title: Text(
          data['titre'] ?? data['nom'] ?? '',
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (data['description'] != null)
              Text(
                data['description'],
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12),
              ),
            const SizedBox(height: 6),
            Row(
              children: [
                if (domaine.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primaryGold.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(domaine, style: const TextStyle(fontSize: 10, color: AppColors.primaryGold)),
                  ),
                  const SizedBox(width: 8),
                ],
                if (modules > 0)
                  Text('$modules module(s)', style: const TextStyle(fontSize: 10, color: AppColors.textGrey)),
              ],
            ),
          ],
        ),
        trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textGrey),
      ),
    );
  }
}
