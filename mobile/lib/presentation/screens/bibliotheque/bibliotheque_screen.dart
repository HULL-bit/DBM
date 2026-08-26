import 'package:flutter/material.dart';
import '../../../core/constants/colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/app_drawer.dart';
import 'pdf_viewer_screen.dart';

class BibliothequeScreen extends StatefulWidget {
  const BibliothequeScreen({super.key});

  @override
  State<BibliothequeScreen> createState() => _BibliothequeScreenState();
}

class _BibliothequeScreenState extends State<BibliothequeScreen> {
  final _api = ApiService();
  List<dynamic> _tousLesLivres = [];
  bool _loading = true;
  String _search = '';
  String _categorie = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  /// Recherche côté client sur le nom, la description et le nom de fichier
  /// du PDF (ex: "sourate", "jukki 12", nom du khassida) — même logique que
  /// la recherche web, qui matche aussi sur des livres sans description.
  List<dynamic> get _livres {
    if (_search.isEmpty) return _tousLesLivres;
    final q = _search.toLowerCase();
    return _tousLesLivres.where((l) {
      final nom = (l['nom'] ?? '').toString().toLowerCase();
      final description = (l['description'] ?? '').toString().toLowerCase();
      final pdfUrl = (l['pdf'] ?? l['fichier'] ?? '').toString();
      final nomFichier = Uri.decodeComponent(pdfUrl.split('/').last).toLowerCase();
      return nom.contains(q) || description.contains(q) || nomFichier.contains(q);
    }).toList();
  }

  Future<void> _load() async {
    try {
      final endpoint = _categorie.isEmpty
          ? '${ApiEndpoints.livres}?page_size=500'
          : '${ApiEndpoints.livres}?page_size=500&categorie=$_categorie';
      final data = await _api.get(endpoint);
      if (mounted) {
        setState(() {
          _tousLesLivres = data['results'] ?? [];
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
      appBar: AppBar(title: const Text('Bibliothèque')),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          // Filtre par type de document
          Container(
            color: AppColors.primaryGreen,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              children: [
                ChoiceChip(
                  label: const Text('Toutes'),
                  selected: _categorie.isEmpty,
                  onSelected: (_) {
                    setState(() { _categorie = ''; _loading = true; });
                    _load();
                  },
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Al-Quran & Islâm'),
                  selected: _categorie == 'alquran',
                  onSelected: (_) {
                    setState(() { _categorie = 'alquran'; _loading = true; });
                    _load();
                  },
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Qassida'),
                  selected: _categorie == 'qassida',
                  onSelected: (_) {
                    setState(() { _categorie = 'qassida'; _loading = true; });
                    _load();
                  },
                ),
              ],
            ),
          ),
          // Barre de recherche
          Container(
            color: AppColors.primaryGreen,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              style: const TextStyle(color: AppColors.white),
              decoration: InputDecoration(
                hintText: 'Rechercher un livre...',
                hintStyle: TextStyle(color: AppColors.white.withValues(alpha: 0.6)),
                prefixIcon: const Icon(Icons.search, color: AppColors.white),
                filled: true,
                fillColor: AppColors.white.withValues(alpha: 0.15),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),

          // Liste
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primaryGreen,
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
                  : _livres.isEmpty
                      ? const Center(child: Text('Aucun livre trouvé'))
                      : GridView.builder(
                          padding: const EdgeInsets.all(16),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: 0.75,
                          ),
                          itemCount: _livres.length,
                          itemBuilder: (_, i) => _LivreCard(data: _livres[i]),
                        ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LivreCard extends StatelessWidget {
  final dynamic data;
  const _LivreCard({required this.data});

  void _openPdf(BuildContext context, String? url, String titre) {
    if (url == null) return;
    final fullUrl = url.startsWith('http')
        ? url
        : '${ApiEndpoints.mediaBaseUrl}$url';
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => PdfViewerScreen(url: fullUrl, title: titre)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final coverUrl = data['couverture'] ?? data['image'];
    final pdfUrl = data['pdf'] ?? data['fichier'];

    return GestureDetector(
      onTap: () => _openPdf(context, pdfUrl, (data['nom'] ?? data['titre'] ?? 'Document').toString()),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.primaryGold.withValues(alpha: 0.3)),
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryGreen.withValues(alpha: 0.06),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Couverture
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
              child: coverUrl != null
                  ? Image.network(
                      coverUrl.startsWith('http')
                          ? coverUrl
                          : '${ApiEndpoints.mediaBaseUrl}$coverUrl',
                      height: 130,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, _a) => _BookPlaceholder(),
                    )
                  : _BookPlaceholder(),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    data['nom'] ?? data['titre'] ?? '',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (data['categorie'] != null)
                    Text(
                      data['categorie'] == 'alquran' ? 'Al-Quran & Islâm' : 'Qassida',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.primaryGold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  if (pdfUrl != null)
                    const Padding(
                      padding: EdgeInsets.only(top: 6),
                      child: Row(
                        children: [
                          Icon(Icons.picture_as_pdf,
                              size: 14, color: AppColors.error),
                          SizedBox(width: 4),
                          Text('Lire',
                              style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.error,
                                  fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BookPlaceholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 130,
      width: double.infinity,
      color: AppColors.primaryGreen.withValues(alpha: 0.1),
      child: const Icon(Icons.menu_book,
          size: 48, color: AppColors.primaryGreen),
    );
  }
}
