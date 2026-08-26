import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/colors.dart';
import '../widgets/app_drawer.dart';
import '../widgets/generic_list_screen.dart';
import '../widgets/stat_card.dart';
import 'package:provider/provider.dart';
import '../../data/providers/auth_provider.dart';
import '../../data/services/api_service.dart';
import 'package:file_picker/file_picker.dart';
import 'package:open_file/open_file.dart';
import 'dart:io';
import 'package:http/http.dart' as http;

// ─── Helpers ──────────────────────────────────────────────────────────────────


// ─── Kamil ────────────────────────────────────────────────────────────────────
class KamilScreen extends StatefulWidget {
  const KamilScreen({super.key});

  @override
  State<KamilScreen> createState() => _KamilScreenState();
}

class _KamilScreenState extends State<KamilScreen> {
  final GlobalKey<GenericListScreenState> _listKey = GlobalKey<GenericListScreenState>();

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final isManager = user?.isAdmin == true || user?.isJewrinCulturelle == true;

    return GenericListScreen(
      key: _listKey,
      title: 'Programme Kamil',
      endpoint: ApiEndpoints.kamil,
      emptyMessage: 'Aucun programme Kamil en cours',
      header: FutureBuilder<Map<String, dynamic>>(
        future: () async {
          final stats = await ApiService().get(ApiEndpoints.adminStats);
          // also fetch jukkis to compute real validation %
          try {
            final jukkis = await ApiService().get(ApiEndpoints.jukkis);
            final allJukkis = jukkis['results'] ?? jukkis ?? [];
            final total = (allJukkis as List).length;
            final valides = allJukkis.where((j) => j['est_valide'] == true).length;
            stats['progress_global'] = total > 0 ? ((valides / total) * 100).round() : 0;
          } catch (_) {}
          return stats;
        }(),
        builder: (context, snapshot) {
          final stats = snapshot.data;
          final loading = snapshot.connectionState == ConnectionState.waiting;
          return SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Row(
              children: [
                SizedBox(
                  width: 150,
                  child: StatCard(
                    title: 'Kamils actifs',
                    value: loading ? '...' : '${stats?['total_kamil'] ?? 0}',
                    icon: Icons.menu_book,
                    color: AppColors.primaryGreen,
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 150,
                  child: StatCard(
                    title: 'Jukkis valid\u00e9s',
                    value: loading ? '...' : '${stats?['progress_global'] ?? 0}%',
                    icon: Icons.auto_graph,
                    color: AppColors.primaryGold,
                  ),
                ),
              ],
            ),
          );
        },
      ),
      floatingActionButton: isManager ? FloatingActionButton(
        onPressed: () => _showKamilForm(context, onRefresh: () => _listKey.currentState?.loadData()),
        backgroundColor: AppColors.primaryGreen,
        child: const Icon(Icons.add, color: AppColors.white),
      ) : null,
      itemBuilder: (item) {
        final chapTotal = item['total_chapitres'] ?? 0;
        final chapLus = item['chapitres_lus_count'] ?? 0;
        final progress = chapTotal > 0 ? chapLus / chapTotal : 0.0;

        return Card(
          margin: const EdgeInsets.only(bottom: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: ExpansionTile(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            collapsedShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            leading: const CircleAvatar(backgroundColor: AppColors.primaryGreen, child: Icon(Icons.menu_book, color: AppColors.white, size: 20)),
            title: Text(item['titre'] ?? item['nom'] ?? 'Kamil', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (item['description'] != null)
                Text(item['description'], style: const TextStyle(fontSize: 12, color: AppColors.textGrey), maxLines: 1, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 4),
              Row(children: [
                Expanded(child: LinearProgressIndicator(value: progress.toDouble(), backgroundColor: AppColors.primaryGreen.withValues(alpha: 0.15), valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryGreen), minHeight: 4, borderRadius: BorderRadius.circular(2))),
                const SizedBox(width: 8),
                Text('${(progress * 100).round()}%', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
              ]),
            ]),
            trailing: isManager ? Row(mainAxisSize: MainAxisSize.min, children: [
              IconButton(icon: const Icon(Icons.edit, size: 18, color: AppColors.primaryGold), onPressed: () => _showKamilForm(context, item: item, onRefresh: () => _listKey.currentState?.loadData())),
              IconButton(icon: const Icon(Icons.delete, size: 18, color: AppColors.error), onPressed: () => _confirmDelete(context, ApiEndpoints.kamil, item['id'], onRefresh: () => _listKey.currentState?.loadData())),
            ]) : null,
            children: [
              const Divider(),
              if (isManager)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    children: [
                      ElevatedButton.icon(
                        onPressed: () => _showJukkiAssignmentDialog(context, item, onRefresh: () => _listKey.currentState?.loadData()),
                        icon: const Icon(Icons.person_add_alt_1, size: 18),
                        label: const Text('Gérer les assignations (1-30)'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryGreen,
                          foregroundColor: AppColors.white,
                          minimumSize: const Size(double.infinity, 40),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                      const SizedBox(height: 8),
                      OutlinedButton.icon(
                        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => KamilValidationsScreen(kamil: item))),
                        icon: const Icon(Icons.check_circle_outline, size: 18),
                        label: const Text('Suivi des validations'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primaryGreen,
                          side: const BorderSide(color: AppColors.primaryGreen),
                          minimumSize: const Size(double.infinity, 40),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ],
                  ),
                )
              else 
                const Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Text('Consultez vos Jukki assignés dans vos progressions ou contactez un administrateur.', 
                    style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppColors.textGrey)),
                ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }
}

class KamilValidationsScreen extends StatefulWidget {
  final dynamic kamil;
  const KamilValidationsScreen({super.key, required this.kamil});

  @override
  State<KamilValidationsScreen> createState() => _KamilValidationsScreenState();
}

class _KamilValidationsScreenState extends State<KamilValidationsScreen> {
  final ApiService _api = ApiService();
  List<dynamic> _jukkis = [];
  bool _loading = true;
  dynamic _fullKamil;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final kamil = await _api.get('${ApiEndpoints.kamil}${widget.kamil['id']}/');
      _fullKamil = kamil;
      List<dynamic> jukkis = List.from(kamil['jukkis'] ?? []);
      if (jukkis.isEmpty) {
        final res = await _api.get('${ApiEndpoints.jukkis}?kamil=${widget.kamil['id']}');
        jukkis = List.from(res['results'] ?? res['data'] ?? res ?? []);
      }
      jukkis.sort((a, b) => (a['numero'] as int).compareTo(b['numero'] as int));
      setState(() {
        _jukkis = jukkis;
        _loading = false;
      });
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primaryGold)));

    final k = _fullKamil ?? widget.kamil;
    final progress = (k['pourcentage_completion'] ?? 0).toDouble();

    return Scaffold(
      appBar: AppBar(
        title: Text('Validations : ${k['titre'] ?? k['nom']}'),
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.textDark,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.replay, color: AppColors.primaryGold),
            onPressed: () => _confirmRecommencer(),
            tooltip: 'Recommencer un cycle',
          )
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: AppColors.primaryGreen.withValues(alpha: 0.05),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _statItem('Cycles lus', '${k['nb_lectures'] ?? 0}', Icons.menu_book),
                    _statItem('Validés', '${k['nb_jukkis_valides'] ?? 0}/30', Icons.check_circle),
                    _statItem('Progression', '${progress.round()}%', Icons.trending_up),
                  ],
                ),
                const SizedBox(height: 16),
                LinearProgressIndicator(
                  value: progress / 100,
                  backgroundColor: AppColors.primaryGreen.withValues(alpha: 0.1),
                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryGreen),
                  minHeight: 8,
                  borderRadius: BorderRadius.circular(4),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: _jukkis.length,
              itemBuilder: (context, index) {
                final j = _jukkis[index];
                final isValid = j['est_valide'] == true;
                final mName = j['membre_nom'] ?? (j['membre'] is Map ? j['membre']['full_name'] : 'Non assigné');

                return ListTile(
                  dense: true,
                  leading: CircleAvatar(
                    radius: 14,
                    backgroundColor: isValid ? AppColors.success : AppColors.textGrey.withValues(alpha: 0.1),
                    child: Text('${j['numero']}', style: const TextStyle(fontSize: 11, color: AppColors.white)),
                  ),
                  title: Text(mName, style: TextStyle(fontWeight: isValid ? FontWeight.bold : FontWeight.normal)),
                  subtitle: Text(isValid ? 'Lu et validé' : 'En attente de lecture', style: TextStyle(color: isValid ? AppColors.success : AppColors.textGrey, fontSize: 11)),
                  trailing: Switch(
                    value: isValid,
                    onChanged: (val) => _changeJukkiStatus(j, val),
                    activeColor: AppColors.primaryGreen,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _statItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, size: 20, color: AppColors.primaryGold),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textGrey)),
      ],
    );
  }

  Future<void> _changeJukkiStatus(dynamic jukki, bool isValid) async {
    // Optimistic update
    setState(() {
      jukki['est_valide'] = isValid;
    });
    try {
      await _api.patch('${ApiEndpoints.jukkis}${jukki['id']}/changer_statut/', {'est_valide': isValid});
      _loadData();
    } catch (e) {
      // Backend 500 is a serializer bug (membre=null) but the save succeeds.
      // Keep optimistic update and reload to confirm.
      _loadData();
    }
  }

  void _confirmRecommencer() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nouveau Cycle ?'),
        content: const Text('Voulez-vous recommencer ce programme Kamil ? \n\nCela va :\n1. Incrémenter le nombre de Kamils lus.\n2. Réinitialiser toutes les validations à "Non lu".'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () async {
              try {
                await _api.post('${ApiEndpoints.kamil}${widget.kamil['id']}/recommencer/', {});
                Navigator.pop(ctx);
                _loadData();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGold),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );
  }
}

// ─── Réunions ─────────────────────────────────────────────────────────────────
class ReunionsScreen extends StatelessWidget {
  const ReunionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GenericListScreen(
      title: 'Réunions',
      endpoint: ApiEndpoints.reunions,
      emptyMessage: 'Aucune réunion planifiée',
      itemBuilder: (item) {
        final statut = item['statut'] ?? 'planifiee';
        final statutColor = statut == 'terminee' ? AppColors.textGrey : statut == 'en_cours' ? AppColors.success : AppColors.primaryGold;

        return Card(
          margin: const EdgeInsets.only(bottom: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Expanded(
                  child: Text(item['sujet'] ?? item['titre'] ?? 'Réunion',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: statutColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                  child: Text(statut.replaceAll('_', ' '), style: TextStyle(color: statutColor, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ]),
              const SizedBox(height: 10),
              if (item['date_reunion'] != null)
                Row(children: [
                  const Icon(Icons.calendar_today, size: 14, color: AppColors.primaryGold),
                  const SizedBox(width: 6),
                  Text(item['date_reunion'].toString().split('T')[0], style: const TextStyle(fontSize: 13, color: AppColors.textDark)),
                  if (item['heure_debut'] != null) ...[
                    const SizedBox(width: 10),
                    const Icon(Icons.access_time, size: 14, color: AppColors.primaryGold),
                    const SizedBox(width: 4),
                    Text(item['heure_debut'].toString().substring(0, 5), style: const TextStyle(fontSize: 13)),
                  ],
                ]),
              if (item['lieu'] != null) ...[
                const SizedBox(height: 6),
                Row(children: [
                  const Icon(Icons.location_on, size: 14, color: AppColors.primaryGreen),
                  const SizedBox(width: 6),
                  Text(item['lieu'], style: const TextStyle(fontSize: 13)),
                ]),
              ],
            ]),
          ),
        );
      },
    );
  }
}

// ─── Bibliothèque ─────────────────────────────────────────────────────────────
class BibliothequeScreen extends StatefulWidget {
  const BibliothequeScreen({super.key});

  @override
  State<BibliothequeScreen> createState() => _BibliothequeScreenState();
}

class _BibliothequeScreenState extends State<BibliothequeScreen> {
  final GlobalKey<GenericListScreenState> _listKey = GlobalKey<GenericListScreenState>();

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final isManager = user?.isAdmin == true || user?.isJewrinScientifique == true;

    return GenericListScreen(
      key: _listKey,
      title: 'Bibliothèque',
      endpoint: ApiEndpoints.livres,
      emptyMessage: 'Aucun livre disponible',
      floatingActionButton: isManager ? FloatingActionButton(
        onPressed: () => _showLivreForm(context, onRefresh: () => _listKey.currentState?.loadData()),
        backgroundColor: AppColors.primaryGreen,
        child: const Icon(Icons.add_business, color: AppColors.white),
      ) : null,
      itemBuilder: (item) {
        return Card(
          margin: const EdgeInsets.only(bottom: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: 56,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.primaryGreen.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.picture_as_pdf, color: AppColors.primaryGreen, size: 32),
              ),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item['nom'] ?? 'Livre', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                if (item['categorie'] != null)
                  Text(
                    item['categorie'] == 'alquran' ? 'ALQURAN' : 'QASSIDA',
                    style: const TextStyle(color: AppColors.primaryGold, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                const SizedBox(height: 6),
                if (item['description'] != null)
                  Text(item['description'], style: const TextStyle(fontSize: 12, color: AppColors.textDark), maxLines: 2, overflow: TextOverflow.ellipsis),
              ])),
              if (isManager)
                Row(mainAxisSize: MainAxisSize.min, children: [
                  IconButton(icon: const Icon(Icons.edit, size: 18, color: AppColors.primaryGold), onPressed: () => _showLivreForm(context, item: item, onRefresh: () => _listKey.currentState?.loadData())),
                  IconButton(icon: const Icon(Icons.delete, size: 18, color: AppColors.error), onPressed: () => _confirmDelete(context, ApiEndpoints.livres, item['id'], onRefresh: () => _listKey.currentState?.loadData())),
                ])
              else
                const Icon(Icons.download_outlined, color: AppColors.primaryGold),
            ]),
          ),
        );
      },
    );
  }

  void _showLivreForm(BuildContext context, {dynamic item, VoidCallback? onRefresh}) {
    final nomCtrl = TextEditingController(text: item?['nom']);
    final descCtrl = TextEditingController(text: item?['description']);
    String selectedCategorie = item?['categorie'] ?? 'alquran';
    final api = ApiService();
    File? selectedFile;
    bool isUploading = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(item == null ? 'Nouveau Livre' : 'Modifier Livre'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nomCtrl,
                  decoration: const InputDecoration(labelText: 'Nom du livre *'),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: selectedCategorie,
                  decoration: const InputDecoration(labelText: 'Catégorie *'),
                  items: const [
                    DropdownMenuItem(value: 'alquran', child: Text('ALQURAN')),
                    DropdownMenuItem(value: 'qassida', child: Text('QASSIDA')),
                  ],
                  onChanged: (v) => setDialogState(() => selectedCategorie = v!),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: descCtrl,
                  decoration: const InputDecoration(labelText: 'Description'),
                  maxLines: 2,
                ),
                const SizedBox(height: 12),
                if (item == null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.primaryGreen),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.picture_as_pdf, color: AppColors.primaryGreen),
                            const SizedBox(width: 8),
                            const Text('Fichier PDF *', style: TextStyle(fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        if (selectedFile != null)
                          Text('Fichier sélectionné: ${selectedFile!.path.split('/').last}',
                              style: const TextStyle(fontSize: 12, color: AppColors.success))
                        else
                          const Text('Aucun fichier sélectionné', style: TextStyle(fontSize: 12, color: AppColors.textGrey)),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: isUploading
                                ? null
                                : () async {
                                    FilePickerResult? result = await FilePicker.platform.pickFiles(
                                      type: FileType.custom,
                                      allowedExtensions: ['pdf'],
                                    );
                                    if (result != null) {
                                      setDialogState(() {
                                        selectedFile = File(result.files.single.path!);
                                      });
                                    }
                                  },
                            icon: isUploading
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                : const Icon(Icons.upload_file),
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
              onPressed: isUploading
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

                      setDialogState(() => isUploading = true);
                      try {
                        if (item == null && selectedFile != null) {
                          // Upload with file
                          final request = http.MultipartRequest(
                            'POST',
                            Uri.parse('${ApiEndpoints.baseUrl}${ApiEndpoints.livres}'),
                          );
                          final token = await api.getAccessToken();
                          if (token != null) {
                            request.headers['Authorization'] = 'Bearer $token';
                          }
                          request.fields['nom'] = nomCtrl.text.trim();
                          request.fields['categorie'] = selectedCategorie;
                          request.fields['description'] = descCtrl.text.trim();
                          request.files.add(
                            await http.MultipartFile.fromPath('pdf', selectedFile!.path),
                          );
                          final response = await request.send();
                          if (response.statusCode >= 200 && response.statusCode < 300) {
                            Navigator.pop(ctx);
                            if (onRefresh != null) onRefresh();
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Livre ajouté avec succès !'), backgroundColor: AppColors.success),
                            );
                          } else {
                            throw Exception('Erreur lors de l\'upload (${response.statusCode})');
                          }
                        } else {
                          // Update without file
                          final data = {
                            'nom': nomCtrl.text.trim(),
                            'categorie': selectedCategorie,
                            'description': descCtrl.text.trim(),
                          };
                          await api.patch('${ApiEndpoints.livres}${item['id']}/', data);
                          Navigator.pop(ctx);
                          if (onRefresh != null) onRefresh();
                        }
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Erreur: $e'), backgroundColor: AppColors.error),
                        );
                      } finally {
                        setDialogState(() => isUploading = false);
                      }
                    },
              child: isUploading
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2))
                  : const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Cotisations ──────────────────────────────────────────────────────────────
class CotisationsScreen extends StatelessWidget {
  const CotisationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final isManager = user?.isJewrinFinance == true;

    return GenericListScreen(
      title: 'Cotisations',
      endpoint: ApiEndpoints.cotisations,
      emptyMessage: 'Aucune cotisation enregistrée',
      floatingActionButton: isManager ? FloatingActionButton(
        onPressed: () => _showCotisationForm(context),
        backgroundColor: AppColors.primaryGold,
        child: const Icon(Icons.add, color: AppColors.white),
      ) : null,
      itemBuilder: (item) {
        final statut = item['statut'] ?? 'en_attente';
        final isPaid = statut == 'paye' || statut == 'valide';
        final statusColor = isPaid ? AppColors.success : statut == 'rejete' ? AppColors.error : AppColors.warning;
        final statusLabel = isPaid ? 'Payé' : statut == 'rejete' ? 'Rejeté' : 'En attente';

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(children: [
                  CircleAvatar(
                    backgroundColor: statusColor.withValues(alpha: 0.15),
                    child: Icon(isPaid ? Icons.check_circle : Icons.pending, color: statusColor),
                  ),
                  const SizedBox(width: 14),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${item['montant'] ?? 0} CFA', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    if (item['periode'] != null) Text('Période: ${item['periode']}', style: const TextStyle(fontSize: 12, color: AppColors.textGrey)),
                    if (item['membre_nom'] != null) Text('Cible: ${item['membre_nom']}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ])),
                  if (isManager) ...[
                    IconButton(icon: const Icon(Icons.edit, size: 18, color: AppColors.primaryGold), onPressed: () => _showCotisationForm(context, item: item)),
                    IconButton(icon: const Icon(Icons.delete, size: 18, color: AppColors.error), onPressed: () => _confirmDelete(context, ApiEndpoints.cotisations, item['id'])),
                  ],
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                    child: Text(statusLabel, style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ]),
                if (!isPaid && (item['membre'] == user?.id || item['membre_id'] == user?.id)) ...[
                  const Divider(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        // Logic for Wave Payment or deep link
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue, 
                        foregroundColor: Colors.white, 
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))
                      ),
                      icon: const Icon(Icons.payment),
                      label: const Text('Payer avec Wave'),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

// ─── Projets Sociaux ──────────────────────────────────────────────────────────
class ProjetsSociauxScreen extends StatelessWidget {
  const ProjetsSociauxScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GenericListScreen(
      title: 'Projets Sociaux',
      endpoint: ApiEndpoints.projetsSociaux,
      emptyMessage: 'Aucun projet social',
      itemBuilder: (item) {
        final objectif = (item['montant_objectif'] ?? 0) as num;
        final recolte = (item['montant_recolte'] ?? 0) as num;
        final progress = objectif > 0 ? (recolte / objectif).clamp(0, 1).toDouble() : 0.0;

        return Card(
          margin: const EdgeInsets.only(bottom: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          clipBehavior: Clip.antiAlias,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (item['image'] != null)
              Image.network(
                item['image'].toString().startsWith('http') ? item['image'] : '${ApiEndpoints.mediaBaseUrl}${item['image']}',
                height: 120, width: double.infinity, fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(height: 60, color: AppColors.primaryGreen.withValues(alpha: 0.1)),
              ),
            Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(item['titre'] ?? 'Projet', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(height: 6),
              Text(item['description'] ?? '', style: const TextStyle(fontSize: 13, color: AppColors.textDark), maxLines: 3, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 10),
              if (objectif > 0) ...[
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text('$recolte / $objectif CFA', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  Text('${(progress * 100).round()}%', style: const TextStyle(color: AppColors.primaryGreen, fontSize: 12, fontWeight: FontWeight.bold)),
                ]),
                const SizedBox(height: 6),
                LinearProgressIndicator(value: progress, backgroundColor: AppColors.primaryGold.withValues(alpha: 0.2), valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryGold), minHeight: 6, borderRadius: BorderRadius.circular(3)),
              ],
            ])),
          ]),
        );
      },
    );
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final GlobalKey<GenericListScreenState> _listKey = GlobalKey<GenericListScreenState>();

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final isManager = user?.isAdmin == true || user?.isJewrinCommunication == true;

    return GenericListScreen(
      key: _listKey,
      title: 'Notifications',
      endpoint: ApiEndpoints.notifications,
      emptyMessage: 'Aucune notification',
      floatingActionButton: isManager ? FloatingActionButton(
        onPressed: () => _showNotificationForm(context, onRefresh: () => _listKey.currentState?.loadData()),
        backgroundColor: AppColors.primaryGreen,
        child: const Icon(Icons.add_alert, color: AppColors.white),
      ) : null,
      itemBuilder: (item) {
        final lu = item['lu'] ?? false;
        final type = item['type'] ?? 'info';
        final typeColor = type == 'urgent' ? AppColors.error : type == 'finance' ? AppColors.primaryGold : AppColors.primaryGreen;

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: lu ? AppColors.white : AppColors.primaryGreen.withValues(alpha: 0.04),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: lu ? AppColors.textGrey.withValues(alpha: 0.15) : AppColors.primaryGreen.withValues(alpha: 0.25)),
          ),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              margin: const EdgeInsets.only(top: 4),
              width: 8, height: 8,
              decoration: BoxDecoration(color: lu ? Colors.transparent : AppColors.primaryGreen, shape: BoxShape.circle),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Expanded(child: Text(item['titre'] ?? 'Notification',
                  style: TextStyle(fontWeight: lu ? FontWeight.w500 : FontWeight.bold, fontSize: 14))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: typeColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                  child: Text(type, style: TextStyle(color: typeColor, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ]),
              const SizedBox(height: 4),
              Text(item['message'] ?? '', style: const TextStyle(color: AppColors.textDark, fontSize: 13)),
              if (item['date_creation'] != null) ...[
                const SizedBox(height: 6),
                Text(item['date_creation'].toString().split('T')[0], style: const TextStyle(color: AppColors.textGrey, fontSize: 11)),
              ],
            ])),
          ]),
        );
      },
    );
  }

  void _showNotificationForm(BuildContext context, {VoidCallback? onRefresh}) {
    final titleCtrl = TextEditingController();
    final messageCtrl = TextEditingController();
    String selectedType = 'info';
    final api = ApiService();
    List<dynamic> targetMembers = [];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Envoyer une Notification'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Titre')),
                const SizedBox(height: 12),
                TextField(controller: messageCtrl, decoration: const InputDecoration(labelText: 'Message'), maxLines: 3),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: selectedType,
                  decoration: const InputDecoration(labelText: 'Type'),
                  items: const [
                    DropdownMenuItem(value: 'info', child: Text('Information')),
                    DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                    DropdownMenuItem(value: 'finance', child: Text('Finance')),
                  ],
                  onChanged: (v) => setDialogState(() => selectedType = v!),
                ),
                const SizedBox(height: 16),
                const Text('Cibler des membres (Laisser vide pour TOUS)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textGrey)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    ...targetMembers.map((m) => Chip(
                      label: Text(m['nom'] ?? m['username'] ?? m['fullName'] ?? 'Membre', style: const TextStyle(fontSize: 10)),
                      onDeleted: () => setDialogState(() => targetMembers.remove(m)),
                      deleteIconColor: AppColors.error,
                      backgroundColor: AppColors.primaryGreen.withValues(alpha: 0.1),
                    )),
                    ActionChip(
                      label: const Icon(Icons.person_add, size: 16),
                      onPressed: () async {
                        final m = await _selectMember(context);
                        if (m != null && !targetMembers.any((x) => x['id'] == m['id'])) {
                          setDialogState(() => targetMembers.add(m));
                        }
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () async {
                try {
                  await api.post(ApiEndpoints.notifications, {
                    'titre': titleCtrl.text,
                    'message': messageCtrl.text,
                    'type': selectedType,
                    'est_globale': targetMembers.isEmpty,
                    'cibles': targetMembers.map((m) => m['id']).toList(),
                  });
                  Navigator.pop(ctx);
                  if (onRefresh != null) onRefresh();
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Notification envoyée !')));
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
                }
              },
              child: const Text('Envoyer'),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Levées de Fonds ──────────────────────────────────────────────────────────
class LeveesFondsScreen extends StatelessWidget {
  const LeveesFondsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GenericListScreen(
      title: 'Levées de Fonds',
      endpoint: ApiEndpoints.leveesFonds,
      emptyMessage: 'Aucune levée de fonds en cours',
      itemBuilder: (item) {
        final objectif = (item['objectif'] ?? item['montant_objectif'] ?? 0) as num;
        final recolte = (item['montant_recolte'] ?? 0) as num;
        final progress = objectif > 0 ? (recolte / objectif).clamp(0, 1).toDouble() : 0.0;
        final actif = item['est_actif'] ?? item['statut'] == 'en_cours';

        return Card(
          margin: const EdgeInsets.only(bottom: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Expanded(child: Text(item['titre'] ?? 'Campagne', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: (actif == true ? AppColors.success : AppColors.textGrey).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                child: Text(actif == true ? 'Actif' : 'Terminé', style: TextStyle(color: actif == true ? AppColors.success : AppColors.textGrey, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ]),
            const SizedBox(height: 12),
            LinearProgressIndicator(value: progress, backgroundColor: AppColors.primaryGold.withValues(alpha: 0.2), valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryGold), minHeight: 8, borderRadius: BorderRadius.circular(4)),
            const SizedBox(height: 8),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('Récolté: $recolte CFA', style: const TextStyle(fontSize: 12, color: AppColors.textDark)),
              Text('Objectif: $objectif CFA', style: const TextStyle(fontSize: 12, color: AppColors.primaryGold, fontWeight: FontWeight.bold)),
            ]),
          ])),
        );
      },
    );
  }
}

// ─── Progressions ─────────────────────────────────────────────────────────────
class ProgressionsScreen extends StatefulWidget {
  const ProgressionsScreen({super.key});

  @override
  State<ProgressionsScreen> createState() => _ProgressionsScreenState();
}

class _ProgressionsScreenState extends State<ProgressionsScreen> {
  final GlobalKey<GenericListScreenState> _listKey = GlobalKey<GenericListScreenState>();
  final ApiService _api = ApiService();

  @override
  Widget build(BuildContext context) {
    return GenericListScreen(
      key: _listKey,
      title: 'Ma Progression (Jukki)',
      endpoint: ApiEndpoints.mesJukkis,
      emptyMessage: 'Aucun Jukki ne vous est assigné pour le moment.',
      itemBuilder: (item) {
        final isValid = item['est_valide'] == true;
        final numero = item['numero'] ?? '?';
        final kamilTitre = item['kamil_titre'] ?? 'Programme Kamil';

        return Card(
          margin: const EdgeInsets.only(bottom: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: isValid ? AppColors.success.withValues(alpha: 0.1) : AppColors.primaryGold.withValues(alpha: 0.1),
                  child: Icon(isValid ? Icons.check_circle : Icons.menu_book, 
                    color: isValid ? AppColors.success : AppColors.primaryGold),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(kamilTitre, style: const TextStyle(fontSize: 12, color: AppColors.textGrey)),
                      Text('JUKKI $numero', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      Text(isValid ? 'Validé le ${item['date_validation']?.split('T')[0] ?? ''}' : 'À lire / En cours', 
                        style: TextStyle(fontSize: 11, color: isValid ? AppColors.success : AppColors.textGrey)),
                    ],
                  ),
                ),
                if (!isValid)
                  ElevatedButton(
                    onPressed: () => _markAsValidated(item),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryGreen,
                      foregroundColor: AppColors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      minimumSize: const Size(80, 32),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Valider', style: TextStyle(fontSize: 12)),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _markAsValidated(dynamic item) async {
    try {
      await _api.post('${ApiEndpoints.jukkis}${item['id']}/valider/', {});
      _listKey.currentState?.loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('JUKKI validé avec succès ! BarakaAllahou fik.')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      }
    }
  }
}


// ─── Transactions ─────────────────────────────────────────────────────────────
class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});
  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  final _api = ApiService();
  List<dynamic> _transactions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _api.get(ApiEndpoints.transactions);
      if (mounted) setState(() {
        _transactions = data['results'] ?? data ?? [];
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  double get _totalMontant => _transactions.fold(
      0.0, (s, t) => s + (double.tryParse(t['montant']?.toString() ?? '0') ?? 0));

  int get _nbValidees => _transactions.where((t) => t['statut'] == 'validee').length;
  int get _nbAttente => _transactions.where((t) => t['statut'] == 'en_attente').length;

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'fr_FR');
    return Scaffold(
      appBar: AppBar(title: const Text('Transactions')),
      drawer: const AppDrawer(),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primaryGreen,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : Column(
                children: [
                  // Stats header
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        SizedBox(width: 160, child: StatCard(
                          title: 'Total',
                          value: '${fmt.format(_totalMontant)} F',
                          icon: Icons.account_balance_wallet,
                          color: AppColors.primaryGreen,
                        )),
                        const SizedBox(width: 12),
                        SizedBox(width: 140, child: StatCard(
                          title: 'Valid\u00e9es',
                          value: '$_nbValidees',
                          icon: Icons.check_circle_outline,
                          color: AppColors.success,
                        )),
                        const SizedBox(width: 12),
                        SizedBox(width: 140, child: StatCard(
                          title: 'En attente',
                          value: '$_nbAttente',
                          icon: Icons.hourglass_empty,
                          color: AppColors.warning,
                        )),
                        const SizedBox(width: 12),
                        SizedBox(width: 140, child: StatCard(
                          title: 'Total',
                          value: '${_transactions.length}',
                          icon: Icons.receipt_long,
                          color: AppColors.info,
                        )),
                      ],
                    ),
                  ),
                  Expanded(
                    child: _transactions.isEmpty
                        ? const Center(child: Text('Aucune transaction'))
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                            itemCount: _transactions.length,
                            itemBuilder: (_, i) {
                              final item = _transactions[i];
                              final date = item['date_transaction'] != null
                                  ? item['date_transaction'].toString().split('T')[0]
                                  : '';
                              final status = item['statut'] ?? '';
                              final isValide = status == 'validee';
                              final color = isValide ? AppColors.success
                                  : status == 'echouee' ? AppColors.error
                                  : AppColors.warning;
                              return Card(
                                margin: const EdgeInsets.only(bottom: 10),
                                child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor: color.withValues(alpha: 0.1),
                                    child: Icon(Icons.receipt_long, color: color, size: 20),
                                  ),
                                  title: Text(
                                    '${fmt.format(double.tryParse(item['montant']?.toString() ?? '0') ?? 0)} FCFA',
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  subtitle: Text(
                                    '${item['type_transaction'] ?? ''} • $date',
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                  trailing: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: color.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      item['statut_display'] ?? status,
                                      style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  ),
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
}

// ─── Management Helpers ───────────────────────────────────────────────────────


Future<dynamic> _selectMember(BuildContext context) async {
  final api = ApiService();
  return showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Sélectionner un membre'),
      content: Container(
        width: double.maxFinite,
        constraints: const BoxConstraints(maxHeight: 400),
        child: FutureBuilder(
          future: api.get('${ApiEndpoints.users}?page_size=500'),
          builder: (c, snapshot) {
            if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
            final data = snapshot.data as Map<String, dynamic>?;
            final members = data?['results'] ?? [];
            return ListView.builder(
              shrinkWrap: true,
              itemCount: members.length,
              itemBuilder: (cc, i) {
                final m = members[i];
                final nomComplet = '${m['first_name'] ?? ''} ${m['last_name'] ?? ''}'.trim();
                return ListTile(
                  title: Text(nomComplet.isNotEmpty ? nomComplet : (m['username'] ?? '')),
                  onTap: () => Navigator.pop(ctx, m),
                );
              },
            );
          },
        ),
      ),
    ),
  );
}

void _showCotisationForm(BuildContext context, {dynamic item}) {
  final montantCtrl = TextEditingController(text: item?['montant']?.toString());
  final periodeCtrl = TextEditingController(text: item?['periode']);
  final api = ApiService();
  dynamic selectedMember = item?['membre_details'];
  String? selectedCellule;

  showDialog(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: Text(item == null ? 'Nouvelle Cotisation' : 'Modifier Cotisation'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: selectedCellule,
                decoration: const InputDecoration(labelText: 'Par Cellule (Optionnel)', labelStyle: TextStyle(fontSize: 12)),
                items: ['dakar', 'touba_mbacke', 'thies', 'saint_louis', 'mbour', 'casamance', 'diourbel', 'etranger']
                    .map((c) => DropdownMenuItem(value: c, child: Text(c.replaceAll('_', '/'))))
                    .toList(),
                onChanged: (v) => setState(() { selectedCellule = v; if (v != null) selectedMember = null; }),
              ),
              const SizedBox(height: 12),
              ListTile(
                dense: true,
                title: Text(selectedMember?['fullName'] ?? selectedMember?['nom'] ?? 'Cibler un membre spécifique'),
                trailing: const Icon(Icons.person, size: 20),
                subtitle: const Text('Ignoré si une cellule est choisie', style: TextStyle(fontSize: 10)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: BorderSide(color: AppColors.textGrey.withValues(alpha: 0.3))),
                onTap: () async {
                  final m = await _selectMember(context);
                  if (m != null) setState(() { selectedMember = m; selectedCellule = null; });
                },
              ),
              const SizedBox(height: 16),
              TextField(controller: montantCtrl, decoration: const InputDecoration(labelText: 'Montant (CFA)'), keyboardType: TextInputType.number),
              TextField(controller: periodeCtrl, decoration: const InputDecoration(labelText: 'Période (ex: Janvier 2024)')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () async {
              try {
                final data = {
                  'montant': int.tryParse(montantCtrl.text) ?? 0,
                  'periode': periodeCtrl.text,
                  if (selectedMember != null) 'membre': selectedMember['id'],
                  if (selectedCellule != null) 'cellule': selectedCellule,
                  'statut': 'en_attente',
                  'type_cotisation': 'mensuelle', // Default according to backend finance method
                };
                if (item == null) {
                  await api.post(ApiEndpoints.cotisations, data);
                } else {
                  await api.patch('${ApiEndpoints.cotisations}${item['id']}/', data);
                }
                Navigator.pop(ctx);
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
              }
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    ),
  );
}


void _showKamilForm(BuildContext context, {dynamic item, VoidCallback? onRefresh}) {
  final titreCtrl = TextEditingController(text: item?['titre'] ?? item?['nom'] ?? '');
  final descCtrl = TextEditingController(text: item?['description'] ?? '');
  final debutCtrl = TextEditingController(text: item?['date_debut'] ?? '');
  final finCtrl = TextEditingController(text: item?['date_fin'] ?? '');
  final api = ApiService();

  Future<void> pickDate(BuildContext ctx, TextEditingController ctrl) async {
    final d = await showDatePicker(
      context: ctx,
      initialDate: ctrl.text.isNotEmpty ? (DateTime.tryParse(ctrl.text) ?? DateTime.now()) : DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (d != null) ctrl.text = d.toIso8601String().split('T')[0];
  }

  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(item == null ? 'Nouveau Programme Kamil' : 'Modifier Kamil'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: titreCtrl, decoration: const InputDecoration(labelText: 'Titre *')),
            const SizedBox(height: 8),
            TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 2),
            const SizedBox(height: 8),
            TextField(
              controller: debutCtrl,
              readOnly: true,
              decoration: const InputDecoration(labelText: 'Date début *', suffixIcon: Icon(Icons.calendar_today, size: 18)),
              onTap: () => pickDate(ctx, debutCtrl),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: finCtrl,
              readOnly: true,
              decoration: const InputDecoration(labelText: 'Date fin *', suffixIcon: Icon(Icons.calendar_today, size: 18)),
              onTap: () => pickDate(ctx, finCtrl),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
        ElevatedButton(
          onPressed: () async {
            if (titreCtrl.text.isEmpty || debutCtrl.text.isEmpty || finCtrl.text.isEmpty) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Titre, date début et date fin requis.')));
              return;
            }
            try {
              final data = {
                'titre': titreCtrl.text,
                'description': descCtrl.text.isNotEmpty ? descCtrl.text : titreCtrl.text,
                'date_debut': debutCtrl.text,
                'date_fin': finCtrl.text,
              };
              if (item == null) {
                await api.post(ApiEndpoints.kamil, data);
              } else {
                await api.patch('${ApiEndpoints.kamil}${item['id']}/', data);
              }
              Navigator.pop(ctx);
              if (onRefresh != null) onRefresh();
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


void _showJukkiAssignmentDialog(BuildContext context, dynamic item, {VoidCallback? onRefresh}) {
  final api = ApiService();
  
  showDialog(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => const Center(child: CircularProgressIndicator(color: AppColors.primaryGold)),
  );

  api.get('${ApiEndpoints.kamil}${item['id']}/').then((fullKamil) async {
    final kamil = fullKamil;
    List<dynamic> localJukkis = List.from(kamil['jukkis'] ?? []);

    if (localJukkis.isEmpty) {
      try {
        final res = await api.get('${ApiEndpoints.jukkis}?kamil=${item['id']}');
        localJukkis = List.from(res['results'] ?? res['data'] ?? res ?? []);
      } catch (_) {}
    }

    if (context.mounted) Navigator.pop(context); 

    if (localJukkis.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Aucun JUKKI trouvé. Créez le programme via le web ou contactez l\'admin.')));
      return;
    }

    Map<int, int?> currentAssignations = {}; // numero -> membre_id
    for (var j in localJukkis) {
      currentAssignations[j['numero']] = j['membre'] is Map ? j['membre']['id'] : j['membre'];
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Assignations : ${kamil['titre'] ?? kamil['nom']}'),
          contentPadding: EdgeInsets.zero,
          content: SizedBox(
            width: double.maxFinite,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Padding(
                  padding: EdgeInsets.all(12.0),
                  child: Text('Sélectionnez un membre pour chaque JUKKI.', style: TextStyle(fontSize: 12, color: AppColors.textGrey)),
                ),
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: 30, 
                    itemBuilder: (c, idx) {
                      final numero = idx + 1;
                      final jukki = localJukkis.firstWhere((j) => j['numero'] == numero, orElse: () => null);
                      final mId = currentAssignations[numero];
                      
                      // Try to find member info in local Jukkis if already there
                      String? mName;
                      if (jukki != null && jukki['membre_nom'] != null) mName = jukki['membre_nom'];
                      if (mName == null && jukki != null && jukki['membre'] is Map) {
                        mName = jukki['membre']['fullName'] ?? jukki['membre']['nom'] ?? jukki['membre']['username'] ?? jukki['membre']['get_full_name'];
                      }

                      return Container(
                        decoration: BoxDecoration(
                          border: Border(bottom: BorderSide(color: AppColors.textGrey.withValues(alpha: 0.05))),
                          color: mId != null ? AppColors.primaryGreen.withValues(alpha: 0.02) : Colors.transparent,
                        ),
                        child: ListTile(
                          dense: true,
                          leading: CircleAvatar(
                            radius: 14,
                            backgroundColor: mId != null ? AppColors.primaryGreen : AppColors.textGrey.withValues(alpha: 0.1),
                            child: Text('$numero', style: const TextStyle(fontSize: 11, color: AppColors.white, fontWeight: FontWeight.bold)),
                          ),
                          title: Text('JUKKI $numero', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text(mName ?? 'Cliquer pour assigner', 
                            style: TextStyle(color: mId != null ? AppColors.textDark : AppColors.textGrey, fontSize: 11)),
                          trailing: const Icon(Icons.person_add_alt_1, size: 16, color: AppColors.primaryGold),
                          onTap: () async {
                            final m = await _selectMember(context);
                            if (m != null) {
                              setDialogState(() {
                                currentAssignations[numero] = m['id'];
                                // Update local jukki to show name immediately
                                if (jukki != null) {
                                  jukki['membre_nom'] = m['fullName'] ?? m['nom'] ?? m['username'] ?? m['first_name'];
                                  jukki['membre'] = m;
                                }
                              });
                            }
                          },
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () async {
                try {
                  // Prepare bulk payload for /assigner_jukkis/
                  Map<String, int?> payload = {};
                  currentAssignations.forEach((k, v) => payload[k.toString()] = v);
                  
                  await api.patch('${ApiEndpoints.kamil}${item['id']}/assigner_jukkis/', {'assignations': payload});
                  
                  Navigator.pop(ctx);
                  if (onRefresh != null) onRefresh();
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Assignations enregistrées avec succès !')));
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur lors de l\'enregistrement: $e')));
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen),
              child: const Text('Enregistrer tout', style: TextStyle(color: AppColors.white)),
            ),
          ],
        ),
      ),
    );
  }).catchError((e) {
    if (context.mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  });
}

void _confirmDelete(BuildContext context, String endpoint, int id, {VoidCallback? onRefresh}) {
  final api = ApiService();
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Confirmer la suppression'),
      content: const Text('Voulez-vous vraiment supprimer cet élément ?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
        TextButton(
          onPressed: () async {
            try {
              await api.delete('$endpoint$id/');
              Navigator.pop(ctx);
              if (onRefresh != null) onRefresh();
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
