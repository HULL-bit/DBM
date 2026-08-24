import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../data/services/api_service.dart';
import '../../../data/providers/auth_provider.dart';
import '../../widgets/app_drawer.dart';

class ConservatoireScreen extends StatefulWidget {
  const ConservatoireScreen({super.key});

  @override
  State<ConservatoireScreen> createState() => _ConservatoireScreenState();
}

class _ConservatoireScreenState extends State<ConservatoireScreen>
    with SingleTickerProviderStateMixin {
  final _api = ApiService();
  late TabController _tabController;

  final _tabs = const [
    Tab(text: 'Documents', icon: Icon(Icons.description, size: 16)),
    Tab(text: 'Audio', icon: Icon(Icons.audiotrack, size: 16)),
    Tab(text: 'Vidéos', icon: Icon(Icons.video_library, size: 16)),
    Tab(text: 'Photos', icon: Icon(Icons.photo_library, size: 16)),
  ];

  final _endpoints = [
    ApiEndpoints.conservatoireDocuments,
    ApiEndpoints.conservatoireAudio,
    ApiEndpoints.conservatoireVideos,
    ApiEndpoints.conservatoirePhotos,
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final canManage = user?.isAdmin == true || user?.role == 'jewrine_conservatoire';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Conservatoire'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primaryGold,
          labelColor: AppColors.white,
          unselectedLabelColor: Colors.white54,
          isScrollable: true,
          tabs: [
            ..._tabs,
            if (canManage) const Tab(text: 'Statistiques', icon: Icon(Icons.analytics, size: 16)),
          ],
        ),
      ),
      drawer: const AppDrawer(),
      body: TabBarView(
        controller: _tabController,
        children: [
          ...List.generate(
            _tabs.length,
            (i) => _ArchiveList(endpoint: _endpoints[i], type: i),
          ),
          if (canManage) const _ConservatoireStats(),
        ],
      ),
    );
  }
}

class _ConservatoireStats extends StatefulWidget {
  const _ConservatoireStats();

  @override
  State<_ConservatoireStats> createState() => _ConservatoireStatsState();
}

class _ConservatoireStatsState extends State<_ConservatoireStats> {
  final _api = ApiService();
  List<dynamic> _stats = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _api.get('/conservatoire/presences/stats_membres/');
      if (mounted) {
        setState(() {
          _stats = data is List ? data : (data['results'] ?? []);
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_stats.isEmpty) return const Center(child: Text('Aucune donnée statistique.'));

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _stats.length,
      itemBuilder: (context, i) {
        final item = _stats[i];
        final percentage = (item['pourcentage'] ?? 0).toDouble();
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            title: Text(item['membre_nom'] ?? 'Membre #${item['membre_id']}'),
            subtitle: Text('Présences : ${item['nb_presents']} / ${item['nb_total']}'),
            trailing: CircleAvatar(
              backgroundColor: percentage >= 80 ? AppColors.success : percentage >= 50 ? AppColors.warning : AppColors.error,
              radius: 20,
              child: Text('${percentage.round()}%', style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ),
        );
      },
    );
  }
}

class _ArchiveList extends StatefulWidget {
  final String endpoint;
  final int type;
  const _ArchiveList({required this.endpoint, required this.type});

  @override
  State<_ArchiveList> createState() => _ArchiveListState();
}

class _ArchiveListState extends State<_ArchiveList>
    with AutomaticKeepAliveClientMixin {
  final _api = ApiService();
  List<dynamic> _items = [];
  bool _loading = true;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _api.get(widget.endpoint);
      if (mounted) {
        setState(() {
          _items = data['results'] ?? [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_loading) {
      return const Center(
          child: CircularProgressIndicator(color: AppColors.primaryGreen));
    }
    if (_items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(_typeIcon(), size: 64, color: AppColors.textGrey.withValues(alpha: 0.4)),
            const SizedBox(height: 16),
            Text('Aucun élément dans cette catégorie'),
          ],
        ),
      );
    }

    if (widget.type == 3) {
      // Photos - grille
      return GridView.builder(
        padding: const EdgeInsets.all(12),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: 6,
          mainAxisSpacing: 6,
        ),
        itemCount: _items.length,
        itemBuilder: (_, i) {
          final img = _items[i]['image'] ?? _items[i]['fichier'];
          return ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: img != null
                ? Image.network(
                    img.startsWith('http')
                        ? img
                        : '${ApiEndpoints.mediaBaseUrl}$img',
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, _a) => Container(
                      color: AppColors.primaryGreen.withValues(alpha: 0.1),
                      child: const Icon(Icons.photo,
                          color: AppColors.primaryGreen),
                    ),
                  )
                : Container(
                    color: AppColors.primaryGreen.withValues(alpha: 0.1),
                    child: const Icon(Icons.photo, color: AppColors.primaryGreen),
                  ),
          );
        },
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primaryGreen,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        itemBuilder: (_, i) => _ArchiveTile(data: _items[i], typeIcon: _typeIcon()),
      ),
    );
  }

  IconData _typeIcon() {
    switch (widget.type) {
      case 0: return Icons.description;
      case 1: return Icons.audiotrack;
      case 2: return Icons.video_library;
      case 3: return Icons.photo;
      default: return Icons.folder;
    }
  }
}

class _ArchiveTile extends StatelessWidget {
  final dynamic data;
  final IconData typeIcon;
  const _ArchiveTile({required this.data, required this.typeIcon});

  @override
  Widget build(BuildContext context) {
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
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.primaryGold.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(typeIcon, color: AppColors.primaryGold, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data['titre'] ?? data['nom'] ?? '',
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                if (data['description'] != null)
                  Text(
                    data['description'],
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                if (data['categorie'] is Map)
                  Text(
                    data['categorie']['nom'] ?? '',
                    style: const TextStyle(
                        fontSize: 10, color: AppColors.primaryGold),
                  ),
              ],
            ),
          ),
          const Icon(Icons.download_outlined,
              color: AppColors.textGrey, size: 18),
        ],
      ),
    );
  }
}
