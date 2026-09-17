import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/constants/colors.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/voice_message_player.dart';
import '../../widgets/voice_recorder_button.dart';
import '../bibliotheque/pdf_viewer_screen.dart';

const List<String> tereCourants = ['KUN KAATIMAN', 'TAZA WUDU SIXAAR', 'JAWXARATUN NAFIIS', 'NAXJU'];

String mediaUrl(String? path) {
  if (path == null || path.isEmpty) return '';
  return path.startsWith('http') ? path : '${ApiEndpoints.mediaBaseUrl}$path';
}

class MajaalissScreen extends StatefulWidget {
  const MajaalissScreen({super.key});

  @override
  State<MajaalissScreen> createState() => _MajaalissScreenState();
}

class _MajaalissScreenState extends State<MajaalissScreen> {
  final _api = ApiService();
  List<dynamic> _list = [];
  bool _loading = true;
  String _statutFilter = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await _api.get('${ApiEndpoints.assignationsTere}?page_size=500');
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

  List<dynamic> get _filtered => _statutFilter.isEmpty
      ? _list
      : _list.where((a) => a['statut'] == _statutFilter).toList();

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final canManage = user != null && (user.isAdmin || user.isJewrinCulturelle);

    return Scaffold(
      appBar: AppBar(title: const Text('Majaaliss')),
      drawer: const AppDrawer(),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              onPressed: () => _showAssignDialog(context),
              backgroundColor: AppColors.primaryGreen,
              icon: const Icon(Icons.add, color: AppColors.white),
              label: const Text('Assigner un TERE', style: TextStyle(color: AppColors.white)),
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
                  ChoiceChip(label: const Text('Tous'), selected: _statutFilter.isEmpty, onSelected: (_) => setState(() => _statutFilter = '')),
                  const SizedBox(width: 8),
                  ChoiceChip(label: const Text('En cours'), selected: _statutFilter == 'en_cours', onSelected: (_) => setState(() => _statutFilter = 'en_cours')),
                  const SizedBox(width: 8),
                  ChoiceChip(label: const Text('Terminé'), selected: _statutFilter == 'termine', onSelected: (_) => setState(() => _statutFilter = 'termine')),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
                  : _filtered.isEmpty
                      ? const Center(child: Text('Aucun TERE assigné', style: TextStyle(color: AppColors.textGrey)))
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filtered.length,
                          itemBuilder: (context, i) {
                            final a = _filtered[i];
                            final termine = a['statut'] == 'termine';
                            final nbBinds = a['nb_binds'] ?? (a['binds'] as List?)?.length ?? 0;
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              child: ListTile(
                                contentPadding: const EdgeInsets.all(14),
                                leading: Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(10)),
                                  child: const Icon(Icons.auto_stories, color: AppColors.white, size: 20),
                                ),
                                title: Text(a['nom_tere'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (canManage && a['membre_nom'] != null)
                                      Text(a['membre_nom'], style: const TextStyle(fontSize: 12, color: AppColors.primaryGreen, fontWeight: FontWeight.w600)),
                                    Text('$nbBinds BIND', style: const TextStyle(fontSize: 11, color: AppColors.textGrey)),
                                  ],
                                ),
                                trailing: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: (termine ? AppColors.success : AppColors.warning).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    a['statut_display'] ?? (termine ? 'Terminé' : 'En cours'),
                                    style: TextStyle(color: termine ? AppColors.success : AppColors.warning, fontSize: 10, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                onTap: () async {
                                  await context.push('/majaaliss/detail', extra: a);
                                  _load();
                                },
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

  void _showAssignDialog(BuildContext context) {
    final Set<int> selectedIds = {};
    String nomTere = '';
    File? pdfFile;
    bool saving = false;
    List<dynamic> users = [];
    bool loadingUsers = true;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          if (loadingUsers) {
            _api.get('${ApiEndpoints.users}?page_size=500').then((data) {
              setDialogState(() {
                users = data['results'] ?? [];
                loadingUsers = false;
              });
            }).catchError((_) {
              setDialogState(() => loadingUsers = false);
            });
          }
          return AlertDialog(
            title: const Text('Assigner un TERE'),
            content: SizedBox(
              width: double.maxFinite,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Membre(s) sélectionné(s) : ${selectedIds.length}', style: const TextStyle(fontSize: 12, color: AppColors.textGrey)),
                    const SizedBox(height: 6),
                    Container(
                      constraints: const BoxConstraints(maxHeight: 220),
                      decoration: BoxDecoration(border: Border.all(color: AppColors.textGrey.withValues(alpha: 0.3)), borderRadius: BorderRadius.circular(8)),
                      child: loadingUsers
                          ? const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator()))
                          : ListView(
                              shrinkWrap: true,
                              children: users.map<Widget>((u) {
                                final id = u['id'] as int;
                                final nom = '${u['first_name'] ?? ''} ${u['last_name'] ?? ''}'.trim();
                                return CheckboxListTile(
                                  dense: true,
                                  value: selectedIds.contains(id),
                                  title: Text(nom.isNotEmpty ? nom : (u['username'] ?? ''), style: const TextStyle(fontSize: 13)),
                                  onChanged: (v) => setDialogState(() {
                                    if (v == true) {
                                      selectedIds.add(id);
                                    } else {
                                      selectedIds.remove(id);
                                    }
                                  }),
                                );
                              }).toList(),
                            ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(labelText: 'TERE (livre)'),
                      items: [
                        ...tereCourants.map((t) => DropdownMenuItem(value: t, child: Text(t))),
                        const DropdownMenuItem(value: '__autre__', child: Text('Autre (saisir)')),
                      ],
                      onChanged: (v) {
                        if (v == '__autre__') {
                          setDialogState(() => nomTere = '');
                        } else {
                          setDialogState(() => nomTere = v ?? '');
                        }
                      },
                    ),
                    if (nomTere.isEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: TextField(
                          decoration: const InputDecoration(labelText: 'Nom du TERE personnalisé'),
                          onChanged: (v) => nomTere = v,
                        ),
                      ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final result = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['pdf']);
                        if (result != null && result.files.single.path != null) {
                          setDialogState(() => pdfFile = File(result.files.single.path!));
                        }
                      },
                      icon: const Icon(Icons.picture_as_pdf),
                      label: Text(pdfFile != null ? pdfFile!.path.split('/').last : 'Joindre le PDF du livre (optionnel)'),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
              ElevatedButton(
                onPressed: saving
                    ? null
                    : () async {
                        if (selectedIds.isEmpty || nomTere.trim().isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Sélectionnez au moins un membre et un TERE.'), backgroundColor: AppColors.error),
                          );
                          return;
                        }
                        setDialogState(() => saving = true);
                        try {
                          final files = <http.MultipartFile>[];
                          if (pdfFile != null) {
                            files.add(await http.MultipartFile.fromPath('fichier_pdf', pdfFile!.path));
                          }
                          await _api.postMultipart(
                            '${ApiEndpoints.assignationsTere}assigner-multiple/',
                            fields: {
                              'membres': jsonEncode(selectedIds.toList()),
                              'nom_tere': nomTere.trim().toUpperCase(),
                            },
                            files: files,
                          );
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
                    : const Text('Assigner'),
              ),
            ],
          );
        },
      ),
    );
  }

}

class MajaalissDetailScreen extends StatefulWidget {
  final Map<String, dynamic> assignation;
  const MajaalissDetailScreen({super.key, required this.assignation});

  @override
  State<MajaalissDetailScreen> createState() => _MajaalissDetailScreenState();
}

class _MajaalissDetailScreenState extends State<MajaalissDetailScreen> {
  final _api = ApiService();
  late Map<String, dynamic> _a;
  bool _busy = false;
  final _pageCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _a = Map<String, dynamic>.from(widget.assignation);
    _reload();
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    try {
      final data = await _api.get('${ApiEndpoints.assignationsTere}${_a['id']}/');
      if (mounted) setState(() => _a = data);
    } catch (_) {}
  }

  void _snack(String msg, {bool erreur = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: erreur ? AppColors.error : AppColors.success),
    );
  }

  Future<void> _terminer() async {
    setState(() => _busy = true);
    try {
      await _api.post('${ApiEndpoints.assignationsTere}${_a['id']}/terminer/', {});
      await _reload();
      _snack('TERE marqué terminé.');
    } catch (e) {
      _snack('Erreur.', erreur: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reprendre() async {
    setState(() => _busy = true);
    try {
      await _api.post('${ApiEndpoints.assignationsTere}${_a['id']}/reprendre/', {});
      await _reload();
      _snack('TERE réouvert.');
    } catch (e) {
      _snack('Erreur.', erreur: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _joindrePdf() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['pdf']);
    if (result == null || result.files.single.path == null) return;
    setState(() => _busy = true);
    try {
      await _api.patchMultipart(
        '${ApiEndpoints.assignationsTere}${_a['id']}/',
        files: [await http.MultipartFile.fromPath('fichier_pdf', result.files.single.path!)],
      );
      await _reload();
      _snack('PDF du TERE mis à jour.');
    } catch (e) {
      _snack("Erreur lors de l'envoi du PDF.", erreur: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submitBind(File file, int dureeSecondes) async {
    setState(() => _busy = true);
    try {
      final files = [await http.MultipartFile.fromPath('audio', file.path)];
      final fields = <String, String>{'assignation': '${_a['id']}', 'notes': _notesCtrl.text};
      if (_pageCtrl.text.trim().isNotEmpty) fields['page'] = _pageCtrl.text.trim();
      await _api.postMultipart(ApiEndpoints.binds, fields: fields, files: files);
      _pageCtrl.clear();
      _notesCtrl.clear();
      await _reload();
      _snack('BIND ajouté.');
    } catch (e) {
      _snack('Erreur lors de la création du BIND.', erreur: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submitTarri(int bindId, File file, int dureeSecondes) async {
    setState(() => _busy = true);
    try {
      await _api.postMultipart(
        '${ApiEndpoints.binds}$bindId/tarri/',
        files: [await http.MultipartFile.fromPath('tarri_audio', file.path)],
      );
      await _reload();
      _snack('Récitation envoyée.');
    } catch (e) {
      _snack("Erreur lors de l'envoi de la récitation.", erreur: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final canManage = user != null && (user.isAdmin || user.isJewrinCulturelle);
    final termine = _a['statut'] == 'termine';
    final binds = List<dynamic>.from(_a['binds'] ?? []);
    final pdf = _a['fichier_pdf'] as String?;

    return Scaffold(
      appBar: AppBar(
        title: Text(_a['nom_tere'] ?? 'TERE'),
        actions: [
          if (canManage)
            IconButton(
              icon: Icon(termine ? Icons.restart_alt : Icons.check_circle, color: AppColors.white),
              tooltip: termine ? 'Reprendre' : 'Marquer terminé',
              onPressed: _busy ? null : (termine ? _reprendre : _terminer),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _reload,
        color: AppColors.primaryGreen,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                if (canManage && _a['membre_nom'] != null)
                  Expanded(child: Text(_a['membre_nom'], style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.primaryGreen))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: (termine ? AppColors.success : AppColors.warning).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                  child: Text(_a['statut_display'] ?? (termine ? 'Terminé' : 'En cours'),
                      style: TextStyle(color: termine ? AppColors.success : AppColors.warning, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    if (pdf != null && pdf.isNotEmpty)
                      OutlinedButton.icon(
                        onPressed: () => Navigator.push(context, MaterialPageRoute(
                          builder: (_) => PdfViewerScreen(url: mediaUrl(pdf), title: _a['nom_tere'] ?? 'Livre'),
                        )),
                        icon: const Icon(Icons.picture_as_pdf, size: 18),
                        label: const Text('Lire le livre'),
                      )
                    else
                      const Text('Aucun PDF du livre pour ce TERE.', style: TextStyle(fontSize: 12, color: AppColors.textGrey)),
                    if (canManage)
                      TextButton.icon(
                        onPressed: _busy ? null : _joindrePdf,
                        icon: const Icon(Icons.upload_file, size: 18),
                        label: Text((pdf != null && pdf.isNotEmpty) ? 'Remplacer le PDF' : 'Joindre le PDF'),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text('BINDs (${binds.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.primaryGreen)),
            const SizedBox(height: 8),
            if (binds.isEmpty)
              const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text("Aucun BIND pour l'instant.", style: TextStyle(color: AppColors.textGrey)))
            else
              ...binds.map((b) => _BindCard(
                    bind: b,
                    isMine: !canManage,
                    busy: _busy,
                    onSubmitTarri: (file, duree) => _submitTarri(b['id'], file, duree),
                  )),
            if (canManage) ...[
              const SizedBox(height: 8),
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                color: AppColors.primaryGreen.withValues(alpha: 0.04),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Nouveau BIND ${binds.length + 1}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
                      if (termine)
                        const Padding(
                          padding: EdgeInsets.only(top: 8),
                          child: Text(
                            'Ce TERE est marqué terminé — vous pouvez quand même ajouter un BIND (ou tapez sur l\'icône en haut pour le reprendre).',
                            style: TextStyle(fontSize: 12, color: AppColors.warning),
                          ),
                        ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _pageCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Page du TERE (optionnel)', isDense: true),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _notesCtrl,
                        decoration: const InputDecoration(labelText: 'Notes (optionnel)', isDense: true),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          const Text('Vocal du BIND :', style: TextStyle(fontSize: 12, color: AppColors.textGrey)),
                          const Spacer(),
                          _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : VoiceRecorderButton(onRecorded: _submitBind),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _BindCard extends StatelessWidget {
  final dynamic bind;
  final bool isMine;
  final bool busy;
  final void Function(File file, int dureeSecondes) onSubmitTarri;

  const _BindCard({required this.bind, required this.isMine, required this.busy, required this.onSubmitTarri});

  @override
  Widget build(BuildContext context) {
    final audio = bind['audio'] as String?;
    final tarriAudio = bind['tarri_audio'] as String?;
    final page = bind['page'];
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('BIND ${bind['numero']}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
                if (page != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: AppColors.primaryGold.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                    child: Text('Page $page', style: const TextStyle(fontSize: 11, color: AppColors.darkGreen, fontWeight: FontWeight.w600)),
                  ),
              ],
            ),
            if (audio != null && audio.isNotEmpty) ...[
              const SizedBox(height: 6),
              VoiceMessagePlayer(url: mediaUrl(audio)),
            ],
            if ((bind['notes'] as String?)?.isNotEmpty == true) ...[
              const SizedBox(height: 6),
              Text(bind['notes'], style: const TextStyle(fontSize: 12, color: AppColors.textGrey)),
            ],
            if (bind['cree_par_nom'] != null) ...[
              const SizedBox(height: 4),
              Text(bind['cree_par_nom'], style: const TextStyle(fontSize: 11, color: AppColors.textGrey)),
            ],
            const Divider(height: 20),
            Text('Récitation du membre (TARRI)${tarriAudio != null && tarriAudio.isNotEmpty ? ' — envoyée' : ''}',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.darkGreen)),
            const SizedBox(height: 4),
            if (tarriAudio != null && tarriAudio.isNotEmpty)
              VoiceMessagePlayer(url: mediaUrl(tarriAudio))
            else if (!isMine)
              const Text('Pas encore de récitation.', style: TextStyle(fontSize: 12, color: AppColors.textGrey)),
            if (isMine) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Text(tarriAudio != null && tarriAudio.isNotEmpty ? 'Refaire ma récitation :' : 'Réciter (TARRI) :', style: const TextStyle(fontSize: 12, color: AppColors.textGrey)),
                  const Spacer(),
                  busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : VoiceRecorderButton(onRecorded: onSubmitTarri),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
