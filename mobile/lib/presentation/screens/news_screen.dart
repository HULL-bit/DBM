import 'package:flutter/material.dart';
import '../../core/constants/colors.dart';
import '../../core/constants/api_endpoints.dart';
import '../../data/services/api_service.dart';
import '../../data/providers/auth_provider.dart';
import 'package:provider/provider.dart';
import '../widgets/app_drawer.dart';

class NewsScreen extends StatefulWidget {
  const NewsScreen({super.key});

  @override
  State<NewsScreen> createState() => _NewsScreenState();
}

class _NewsScreenState extends State<NewsScreen> {
  final ApiService _api = ApiService();
  bool _loading = true;
  List<dynamic> _news = [];

  @override
  void initState() {
    super.initState();
    _loadNews();
  }

  Future<void> _loadNews() async {
    setState(() => _loading = true);
    try {
      final res = await _api.get(ApiEndpoints.news);
      final list = res['results'] ?? res['data'] ?? [];
      if (mounted) setState(() { _news = list is List ? list : []; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isManager = context.read<AuthProvider>().user?.isAdmin == true;

    return Scaffold(
      appBar: AppBar(title: const Text('Actualités')),
      drawer: const AppDrawer(),
      floatingActionButton: isManager ? FloatingActionButton(
        onPressed: () => _showNewsForm(),
        backgroundColor: AppColors.primaryGreen,
        child: const Icon(Icons.add, color: AppColors.white),
      ) : null,
      body: RefreshIndicator(
        onRefresh: _loadNews,
        color: AppColors.primaryGreen,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _news.isEmpty
                ? const Center(child: Text('Aucune actualité disponible', style: TextStyle(color: AppColors.textGrey)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _news.length,
                    itemBuilder: (context, index) {
                      final item = _news[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 16),
                        clipBehavior: Clip.antiAlias,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (item['image'] != null)
                              Image.network(
                                item['image'].toString().startsWith('http') ? item['image'] : '${ApiEndpoints.mediaBaseUrl}${item['image']}',
                                height: 160,
                                width: double.infinity,
                                fit: BoxFit.cover,
                                errorBuilder: (_,__,___) => Container(height: 160, color: AppColors.textGrey.withOpacity(0.2), child: const Icon(Icons.image_not_supported)),
                              )
                            else
                              Container(height: 120, color: AppColors.primaryGreen.withOpacity(0.1), child: const Center(child: Icon(Icons.newspaper, size: 40, color: AppColors.primaryGreen))),
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(child: Text(item['titre'] ?? 'Sans titre', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18))),
                                      if (isManager)
                                        Row(mainAxisSize: MainAxisSize.min, children: [
                                          IconButton(icon: const Icon(Icons.edit, size: 18, color: AppColors.primaryGold), onPressed: () => _showNewsForm(item: item)),
                                          IconButton(icon: const Icon(Icons.delete, size: 18, color: AppColors.error), onPressed: () => _confirmDelete(item['id'])),
                                        ]),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    item['contenu'] ?? '',
                                    style: const TextStyle(color: AppColors.textDark, fontSize: 14),
                                    maxLines: 3,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        item['date_publication']?.split('T')[0] ?? '',
                                        style: const TextStyle(color: AppColors.primaryGold, fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                      TextButton(onPressed: (){}, child: const Text('Lire la suite'))
                                    ],
                                  )
                                ],
                              ),
                            )
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  void _showNewsForm({dynamic item}) {
    final titleCtrl = TextEditingController(text: item?['titre']);
    final contentCtrl = TextEditingController(text: item?['contenu']);
    
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(item == null ? 'Nouvelle Actualité' : 'Modifier Actualité'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Titre')),
              TextField(controller: contentCtrl, decoration: const InputDecoration(labelText: 'Contenu'), maxLines: 4),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () async {
              try {
                if (item == null) {
                  await _api.post(ApiEndpoints.news, {'titre': titleCtrl.text, 'contenu': contentCtrl.text, 'statut': 'publie'});
                } else {
                  await _api.patch('${ApiEndpoints.news}${item['id']}/', {'titre': titleCtrl.text, 'contenu': contentCtrl.text});
                }
                Navigator.pop(ctx);
                _loadNews();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
              }
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(int id) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: const Text('Voulez-vous vraiment supprimer cette actualité ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          TextButton(
            onPressed: () async {
              try {
                await _api.delete('${ApiEndpoints.news}$id/');
                Navigator.pop(ctx);
                _loadNews();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
              }
            },
            child: const Text('Supprimer', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }
}
