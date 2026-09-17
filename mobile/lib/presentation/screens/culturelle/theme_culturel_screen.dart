import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/constants/colors.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/voice_message_player.dart';
import 'majaaliss_screen.dart' show mediaUrl;
import '../bibliotheque/pdf_viewer_screen.dart';

const Map<String, String> categoriesTheme = {
  'coran': 'Coran et Tafsir',
  'hadith': 'Hadith',
  'fiqh': 'Fiqh (Jurisprudence)',
  'aqida': 'Aqida (Croyance)',
  'sira': 'Sira (Vie du Prophète)',
  'akhlaq': 'Akhlaq (Morale)',
  'khassaida': 'Khassaïd',
  'autre': 'Autre',
};

class ThemeCulturelScreen extends StatefulWidget {
  const ThemeCulturelScreen({super.key});

  @override
  State<ThemeCulturelScreen> createState() => _ThemeCulturelScreenState();
}

class _ThemeCulturelScreenState extends State<ThemeCulturelScreen> {
  final _api = ApiService();
  List<dynamic> _list = [];
  bool _loading = true;
  String _categorieFilter = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await _api.get('${ApiEndpoints.enseignements}?page_size=500');
      if (mounted) {
        setState(() {
          _list = data['results'] ?? data['data'] ?? [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> get _filtered => _categorieFilter.isEmpty ? _list : _list.where((t) => t['categorie'] == _categorieFilter).toList();

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final canManage = user != null && (user.isAdmin || user.isJewrinCulturelle);

    return Scaffold(
      appBar: AppBar(title: const Text('Thème culturel')),
      drawer: const AppDrawer(),
      floatingActionButton: canManage
          ? FloatingActionButton(
              onPressed: () => _showForm(context),
              backgroundColor: AppColors.primaryGreen,
              child: const Icon(Icons.add, color: AppColors.white),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primaryGreen,
        child: Column(
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  ChoiceChip(label: const Text('Toutes'), selected: _categorieFilter.isEmpty, onSelected: (_) => setState(() => _categorieFilter = '')),
                  const SizedBox(width: 8),
                  ...categoriesTheme.entries.map((e) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(label: Text(e.value), selected: _categorieFilter == e.key, onSelected: (_) => setState(() => _categorieFilter = e.key)),
                      )),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
                  : _filtered.isEmpty
                      ? const Center(child: Text('Aucun thème enregistré', style: TextStyle(color: AppColors.textGrey)))
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filtered.length,
                          itemBuilder: (context, i) {
                            final t = _filtered[i];
                            final date = DateTime.tryParse(t['date_publication'] ?? '');
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              child: ListTile(
                                contentPadding: const EdgeInsets.all(14),
                                leading: Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(color: AppColors.primaryGreen.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                                  child: const Icon(Icons.auto_stories, color: AppColors.primaryGreen, size: 20),
                                ),
                                title: Text(t['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(t['categorie_display'] ?? '', style: const TextStyle(fontSize: 11, color: AppColors.primaryGold, fontWeight: FontWeight.w600)),
                                    if (date != null) Text(DateFormat('d MMM yyyy', 'fr_FR').format(date), style: const TextStyle(fontSize: 11, color: AppColors.textGrey)),
                                  ],
                                ),
                                onTap: () => _showDetail(context, t, canManage),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  void _showDetail(BuildContext context, dynamic theme, bool canManage) {
    final pdf = theme['fichier_pdf'] as String?;
    final audio = theme['fichier_audio'] as String?;
    final video = theme['fichier_video'] as String?;
    final tags = ((theme['tags'] as String?) ?? '').split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(theme['titre'] ?? ''),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(theme['categorie_display'] ?? '', style: const TextStyle(fontSize: 12, color: AppColors.primaryGold, fontWeight: FontWeight.w600)),
              const SizedBox(height: 10),
              Text(theme['contenu'] ?? ''),
              if (tags.isNotEmpty) ...[
                const SizedBox(height: 10),
                Wrap(spacing: 6, runSpacing: 6, children: tags.map((tag) => Chip(label: Text(tag, style: const TextStyle(fontSize: 11)))).toList()),
              ],
              if (audio != null && audio.isNotEmpty) ...[
                const SizedBox(height: 12),
                const Text('Audio', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.darkGreen)),
                const SizedBox(height: 4),
                VoiceMessagePlayer(url: mediaUrl(audio)),
              ],
              if (video != null && video.isNotEmpty) ...[
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => launchUrl(Uri.parse(mediaUrl(video)), mode: LaunchMode.externalApplication),
                  icon: const Icon(Icons.videocam),
                  label: const Text('Ouvrir la vidéo'),
                ),
              ],
              if (pdf != null && pdf.isNotEmpty) ...[
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(
                    builder: (_) => PdfViewerScreen(url: mediaUrl(pdf), title: theme['titre'] ?? 'Document'),
                  )),
                  icon: const Icon(Icons.picture_as_pdf),
                  label: const Text('Ouvrir le document PDF'),
                ),
              ],
            ],
          ),
        ),
        actions: [
          if (canManage) ...[
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                _showForm(context, item: theme);
              },
              child: const Text('Modifier'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                _confirmDelete(context, theme);
              },
              style: TextButton.styleFrom(foregroundColor: AppColors.error),
              child: const Text('Supprimer'),
            ),
          ],
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Fermer')),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, dynamic theme) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer ce thème ?'),
        content: Text('Supprimer « ${theme['titre']} » ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () async {
              try {
                await _api.delete('${ApiEndpoints.enseignements}${theme['id']}/');
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

  void _showForm(BuildContext context, {dynamic item}) {
    final titreCtrl = TextEditingController(text: item?['titre']);
    final contenuCtrl = TextEditingController(text: item?['contenu']);
    final tagsCtrl = TextEditingController(text: item?['tags']);
    String categorie = item?['categorie'] ?? 'autre';
    File? pdfFile;
    File? audioFile;
    File? videoFile;
    bool saving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(item == null ? 'Ajouter un thème culturel' : 'Modifier le thème'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: titreCtrl, decoration: const InputDecoration(labelText: 'Titre *')),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: categorie,
                  decoration: const InputDecoration(labelText: 'Catégorie'),
                  items: categoriesTheme.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
                  onChanged: (v) => setDialogState(() => categorie = v ?? 'autre'),
                ),
                const SizedBox(height: 10),
                TextField(controller: contenuCtrl, decoration: const InputDecoration(labelText: 'Contenu *'), maxLines: 5),
                const SizedBox(height: 10),
                TextField(controller: tagsCtrl, decoration: const InputDecoration(labelText: 'Tags (séparés par des virgules)')),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () async {
                    final r = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['pdf']);
                    if (r?.files.single.path != null) setDialogState(() => pdfFile = File(r!.files.single.path!));
                  },
                  icon: const Icon(Icons.picture_as_pdf),
                  label: Text(pdfFile != null ? pdfFile!.path.split('/').last : 'Joindre un PDF (optionnel)'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () async {
                    final r = await FilePicker.platform.pickFiles(type: FileType.audio);
                    if (r?.files.single.path != null) setDialogState(() => audioFile = File(r!.files.single.path!));
                  },
                  icon: const Icon(Icons.audiotrack),
                  label: Text(audioFile != null ? audioFile!.path.split('/').last : 'Joindre un audio (optionnel)'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () async {
                    final r = await FilePicker.platform.pickFiles(type: FileType.video);
                    if (r?.files.single.path != null) setDialogState(() => videoFile = File(r!.files.single.path!));
                  },
                  icon: const Icon(Icons.videocam),
                  label: Text(videoFile != null ? videoFile!.path.split('/').last : 'Joindre une vidéo (optionnel)'),
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
                      if (titreCtrl.text.trim().isEmpty || contenuCtrl.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Titre et contenu requis.'), backgroundColor: AppColors.error),
                        );
                        return;
                      }
                      setDialogState(() => saving = true);
                      try {
                        final files = <http.MultipartFile>[];
                        if (pdfFile != null) files.add(await http.MultipartFile.fromPath('fichier_pdf', pdfFile!.path));
                        if (audioFile != null) files.add(await http.MultipartFile.fromPath('fichier_audio', audioFile!.path));
                        if (videoFile != null) files.add(await http.MultipartFile.fromPath('fichier_video', videoFile!.path));
                        final fields = {
                          'titre': titreCtrl.text.trim(),
                          'categorie': categorie,
                          'contenu': contenuCtrl.text,
                          'tags': tagsCtrl.text,
                        };
                        if (item == null) {
                          await _api.postMultipart(ApiEndpoints.enseignements, fields: fields, files: files);
                        } else {
                          await _api.patchMultipart('${ApiEndpoints.enseignements}${item['id']}/', fields: fields, files: files);
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
