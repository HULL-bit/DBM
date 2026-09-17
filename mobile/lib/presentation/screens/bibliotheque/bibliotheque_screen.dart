import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/constants/colors.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/app_drawer.dart';
import 'pdf_viewer_screen.dart';

const List<Map<String, String>> categoriesLivre = [
  {'value': 'alquran', 'label': 'ALQURAN'},
  {'value': 'qassida', 'label': 'QASSIDA'},
];

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
      final rawFileName = pdfUrl.split('/').last;
      String nomFichier;
      try {
        nomFichier = Uri.decodeComponent(rawFileName).toLowerCase();
      } catch (_) {
        nomFichier = rawFileName.toLowerCase();
      }
      return nom.contains(q) || description.contains(q) || nomFichier.contains(q);
    }).toList();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
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
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final isManager = user?.isAdmin == true || auth.peut('bibliotheque', action: 'gerer');

    return Scaffold(
      appBar: AppBar(title: const Text('Bibliothèque')),
      drawer: const AppDrawer(),
      floatingActionButton: isManager
          ? FloatingActionButton(
              onPressed: () => _showLivreForm(context),
              backgroundColor: AppColors.primaryGreen,
              child: const Icon(Icons.add, color: AppColors.white),
            )
          : null,
      body: Column(
        children: [
          // Filtre par catégorie
          Container(
            color: AppColors.primaryGreen,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              children: [
                ChoiceChip(
                  label: const Text('Toutes'),
                  selected: _categorie.isEmpty,
                  onSelected: (_) {
                    setState(() => _categorie = '');
                    _load();
                  },
                ),
                const SizedBox(width: 8),
                ...categoriesLivre.map((c) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(c['label']!),
                        selected: _categorie == c['value'],
                        onSelected: (_) {
                          setState(() => _categorie = c['value']!);
                          _load();
                        },
                      ),
                    )),
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
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
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
                            childAspectRatio: 0.7,
                          ),
                          itemCount: _livres.length,
                          itemBuilder: (_, i) => _LivreCard(
                            data: _livres[i],
                            isManager: isManager,
                            onEdit: () => _showLivreForm(context, item: _livres[i]),
                            onDelete: () => _confirmDelete(context, _livres[i]),
                          ),
                        ),
            ),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, dynamic livre) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer ce livre ?'),
        content: Text('Supprimer « ${livre['nom']} » ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () async {
              try {
                await _api.delete('${ApiEndpoints.livres}${livre['id']}/');
                if (context.mounted) Navigator.pop(ctx);
                _load();
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: AppColors.error));
                }
              }
            },
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }

  void _showLivreForm(BuildContext context, {dynamic item}) {
    final nomCtrl = TextEditingController(text: item?['nom']);
    final descCtrl = TextEditingController(text: item?['description']);
    String selectedCategorie = item?['categorie'] ?? 'alquran';
    File? selectedFile;
    bool saving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(item == null ? 'Nouveau Livre' : 'Modifier Livre'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nomCtrl, decoration: const InputDecoration(labelText: 'Nom du livre *')),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: selectedCategorie,
                  decoration: const InputDecoration(labelText: 'Catégorie *'),
                  items: categoriesLivre.map((c) => DropdownMenuItem(value: c['value'], child: Text(c['label']!))).toList(),
                  onChanged: (v) => setDialogState(() => selectedCategorie = v!),
                ),
                const SizedBox(height: 8),
                TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 2),
                const SizedBox(height: 12),
                if (item == null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(border: Border.all(color: AppColors.primaryGreen), borderRadius: BorderRadius.circular(8)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(children: [
                          Icon(Icons.picture_as_pdf, color: AppColors.primaryGreen),
                          SizedBox(width: 8),
                          Text('Fichier PDF *', style: TextStyle(fontWeight: FontWeight.bold)),
                        ]),
                        const SizedBox(height: 8),
                        Text(
                          selectedFile != null ? 'Fichier sélectionné: ${selectedFile!.path.split('/').last}' : 'Aucun fichier sélectionné',
                          style: TextStyle(fontSize: 12, color: selectedFile != null ? AppColors.success : AppColors.textGrey),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final result = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['pdf']);
                              if (result?.files.single.path != null) setDialogState(() => selectedFile = File(result!.files.single.path!));
                            },
                            icon: const Icon(Icons.upload_file),
                            label: const Text('Sélectionner un PDF'),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: saving
                  ? null
                  : () async {
                      if (item == null && selectedFile == null) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Veuillez sélectionner un fichier PDF'), backgroundColor: AppColors.error),
                        );
                        return;
                      }
                      if (nomCtrl.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Le nom du livre est requis'), backgroundColor: AppColors.error),
                        );
                        return;
                      }
                      setDialogState(() => saving = true);
                      try {
                        final fields = {
                          'nom': nomCtrl.text.trim(),
                          'categorie': selectedCategorie,
                          'description': descCtrl.text.trim(),
                        };
                        if (item == null) {
                          await _api.postMultipart(
                            ApiEndpoints.livres,
                            fields: fields,
                            files: [await http.MultipartFile.fromPath('pdf', selectedFile!.path)],
                          );
                        } else if (selectedFile != null) {
                          await _api.patchMultipart(
                            '${ApiEndpoints.livres}${item['id']}/',
                            fields: fields,
                            files: [await http.MultipartFile.fromPath('pdf', selectedFile!.path)],
                          );
                        } else {
                          await _api.patch('${ApiEndpoints.livres}${item['id']}/', fields);
                        }
                        if (context.mounted) Navigator.pop(ctx);
                        _load();
                      } catch (e) {
                        setDialogState(() => saving = false);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: AppColors.error));
                        }
                      }
                    },
              child: saving
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2))
                  : const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }
}

class _LivreCard extends StatelessWidget {
  final dynamic data;
  final bool isManager;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  const _LivreCard({required this.data, required this.isManager, required this.onEdit, required this.onDelete});

  void _openPdf(BuildContext context, String? url, String titre) {
    if (url == null) return;
    final fullUrl = url.startsWith('http') ? url : '${ApiEndpoints.mediaBaseUrl}$url';
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => PdfViewerScreen(url: fullUrl, title: titre)));
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
          boxShadow: [BoxShadow(color: AppColors.primaryGreen.withValues(alpha: 0.06), blurRadius: 6, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
              child: coverUrl != null
                  ? Image.network(
                      coverUrl.toString().startsWith('http') ? coverUrl : '${ApiEndpoints.mediaBaseUrl}$coverUrl',
                      height: 110,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const _BookPlaceholder(),
                    )
                  : const _BookPlaceholder(),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      data['nom'] ?? data['titre'] ?? '',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (data['categorie'] != null)
                      Text(
                        data['categorie'] == 'alquran' ? 'ALQURAN' : 'QASSIDA',
                        style: const TextStyle(fontSize: 10, color: AppColors.primaryGold, fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    const Spacer(),
                    Row(
                      children: [
                        if (pdfUrl != null) ...[
                          const Icon(Icons.picture_as_pdf, size: 14, color: AppColors.error),
                          const SizedBox(width: 4),
                          const Expanded(child: Text('Lire', style: TextStyle(fontSize: 11, color: AppColors.error, fontWeight: FontWeight.w600))),
                        ] else
                          const Spacer(),
                        if (isManager) ...[
                          GestureDetector(onTap: onEdit, child: const Icon(Icons.edit, size: 16, color: AppColors.primaryGold)),
                          const SizedBox(width: 8),
                          GestureDetector(onTap: onDelete, child: const Icon(Icons.delete, size: 16, color: AppColors.error)),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BookPlaceholder extends StatelessWidget {
  const _BookPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 110,
      width: double.infinity,
      color: AppColors.primaryGreen.withValues(alpha: 0.1),
      child: const Icon(Icons.menu_book, size: 40, color: AppColors.primaryGreen),
    );
  }
}
