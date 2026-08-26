import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/constants/colors.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/app_drawer.dart';

const _categories = [
  ['MAGAL', 'Magal'],
  ['GAMOU', 'Gamou'],
  ['KAZU RAJABB', 'Kazu Rajabb'],
  ['KOOR', 'Koor'],
  ['SOCIAL', 'Social'],
  ['XELCOM', 'Xelcom'],
  ['MENSUALITE', 'Mensualités'],
  ['AUTRES', 'Autres'],
];

/// Dépenses & Bilan (miroir de GestionDepenses.jsx côté web) : réservé aux
/// admins / jewrin finance (contrôlé côté backend par IsAdminOrJewrinFinance).
class DepensesScreen extends StatefulWidget {
  const DepensesScreen({super.key});

  @override
  State<DepensesScreen> createState() => _DepensesScreenState();
}

class _DepensesScreenState extends State<DepensesScreen> with SingleTickerProviderStateMixin {
  final ApiService _api = ApiService();
  late final TabController _tabController;

  List<dynamic> _bilan = [];
  bool _loadingBilan = true;
  int? _annee;
  bool _exporting = false;
  bool _accesRefuse = false;

  List<dynamic> _depenses = [];
  bool _loadingDepenses = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadBilan();
    _loadDepenses();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadBilan() async {
    setState(() => _loadingBilan = true);
    try {
      final qs = _annee != null ? '?annee=$_annee' : '';
      final data = await _api.get('${ApiEndpoints.bilanFinancier}$qs');
      final list = data['results'] ?? [];
      if (mounted) setState(() { _bilan = list is List ? list : []; _loadingBilan = false; });
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingBilan = false;
          if (e.toString().contains('403')) _accesRefuse = true;
        });
      }
    }
  }

  Future<void> _loadDepenses() async {
    setState(() => _loadingDepenses = true);
    try {
      final data = await _api.get('${ApiEndpoints.depenses}?page_size=500');
      final list = data['results'] ?? [];
      if (mounted) setState(() { _depenses = list is List ? list : []; _loadingDepenses = false; });
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingDepenses = false;
          if (e.toString().contains('403')) _accesRefuse = true;
        });
      }
    }
  }

  Future<void> _exporterBilan(String format) async {
    setState(() => _exporting = true);
    try {
      final qs = _annee != null ? '&annee=$_annee' : '';
      final response = await _api.getBytes('${ApiEndpoints.bilanFinancierExport}?format=$format$qs');
      final dir = await getTemporaryDirectory();
      final ext = format == 'pdf' ? 'pdf' : 'xlsx';
      final file = File('${dir.path}/bilan_financier.$ext');
      await file.writeAsBytes(response.bodyBytes, flush: true);
      await OpenFile.open(file.path);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Erreur lors de l'export du bilan."), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  void _showAjouterDepense() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DepenseFormSheet(
        api: _api,
        onSaved: () {
          _loadDepenses();
          _loadBilan();
        },
      ),
    );
  }

  Future<void> _valider(dynamic d) async {
    try {
      await _api.post('${ApiEndpoints.depenses}${d['id']}/valider/', {});
      _loadDepenses();
      _loadBilan();
    } catch (_) {}
  }

  Future<void> _refuser(dynamic d) async {
    try {
      await _api.post('${ApiEndpoints.depenses}${d['id']}/refuser/', {});
      _loadDepenses();
    } catch (_) {}
  }

  Future<void> _supprimer(dynamic d) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer ?'),
        content: Text('Supprimer la dépense "${d['motif']}" ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _api.delete('${ApiEndpoints.depenses}${d['id']}/');
      _loadDepenses();
      _loadBilan();
    } catch (_) {}
  }

  Color _statutColor(String? s) {
    switch (s) {
      case 'validee': return AppColors.success;
      case 'refusee': return AppColors.error;
      default: return AppColors.warning;
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'fr_FR');

    if (_accesRefuse) {
      return Scaffold(
        appBar: AppBar(title: const Text('Dépenses & Bilan')),
        drawer: const AppDrawer(),
        body: const Center(child: Text('Accès réservé au chargé de finance.', style: TextStyle(color: AppColors.textGrey))),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dépenses & Bilan'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primaryGold,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [Tab(text: 'Bilan par catégorie'), Tab(text: 'Dépenses')],
        ),
      ),
      drawer: const AppDrawer(),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildBilanTab(fmt),
          _buildDepensesTab(fmt),
        ],
      ),
    );
  }

  Widget _buildBilanTab(NumberFormat fmt) {
    return RefreshIndicator(
      onRefresh: _loadBilan,
      color: AppColors.primaryGreen,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(children: [
            Expanded(
              child: TextField(
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Année (optionnel)',
                  isDense: true,
                  filled: true, fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onChanged: (v) => _annee = int.tryParse(v),
                onSubmitted: (_) => _loadBilan(),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: _loadBilan,
              icon: const Icon(Icons.search, color: AppColors.primaryGreen),
            ),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _exporting ? null : () => _exporterBilan('excel'),
                icon: const Icon(Icons.table_chart, size: 16),
                label: const Text('Export Excel'),
                style: OutlinedButton.styleFrom(foregroundColor: AppColors.primaryGreen, side: const BorderSide(color: AppColors.primaryGreen)),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _exporting ? null : () => _exporterBilan('pdf'),
                icon: _exporting
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.picture_as_pdf, size: 16),
                label: const Text('Export PDF'),
                style: OutlinedButton.styleFrom(foregroundColor: AppColors.primaryGreen, side: const BorderSide(color: AppColors.primaryGreen)),
              ),
            ),
          ]),
          const SizedBox(height: 12),
          if (_loadingBilan)
            const Padding(padding: EdgeInsets.only(top: 40), child: Center(child: CircularProgressIndicator(color: AppColors.primaryGreen)))
          else if (_bilan.isEmpty)
            const Padding(padding: EdgeInsets.only(top: 40), child: Center(child: Text('Aucune donnée.', style: TextStyle(color: AppColors.textGrey))))
          else
            ..._bilan.map((l) {
              final estTotal = l['categorie'] == 'TOTAL';
              final reste = double.tryParse(l['reste']?.toString() ?? '0') ?? 0;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: estTotal ? AppColors.primaryGold.withValues(alpha: 0.1) : Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.primaryGold.withValues(alpha: 0.3)),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(l['categorie_display'] ?? '', style: TextStyle(fontWeight: estTotal ? FontWeight.w800 : FontWeight.w700, color: AppColors.darkGreen)),
                  const SizedBox(height: 6),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text('Collecté', style: const TextStyle(fontSize: 11, color: AppColors.textGrey)),
                    Text('${fmt.format(double.tryParse(l['montant_collecte']?.toString() ?? '0') ?? 0)} F', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  ]),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text('Dépenses', style: const TextStyle(fontSize: 11, color: AppColors.textGrey)),
                    Text('${fmt.format(double.tryParse(l['montant_depense']?.toString() ?? '0') ?? 0)} F', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  ]),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('Reste', style: TextStyle(fontSize: 11, color: AppColors.textGrey)),
                    Text('${fmt.format(reste)} F', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: reste < 0 ? AppColors.error : AppColors.success)),
                  ]),
                ]),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildDepensesTab(NumberFormat fmt) {
    return Stack(children: [
      RefreshIndicator(
        onRefresh: _loadDepenses,
        color: AppColors.primaryGreen,
        child: _loadingDepenses
            ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
            : _depenses.isEmpty
                ? ListView(children: const [
                    Padding(padding: EdgeInsets.only(top: 80), child: Center(child: Text('Aucune dépense enregistrée.', style: TextStyle(color: AppColors.textGrey)))),
                  ])
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                    itemCount: _depenses.length,
                    itemBuilder: (_, i) {
                      final d = _depenses[i];
                      final enAttente = d['statut'] == 'en_attente';
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.primaryGold.withValues(alpha: 0.3)),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            Expanded(
                              child: Text(d['motif'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                            ),
                            Text('${fmt.format(double.tryParse(d['montant']?.toString() ?? '0') ?? 0)} F', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
                          ]),
                          const SizedBox(height: 4),
                          Text(
                            '${d['categorie_display'] ?? d['categorie'] ?? ''} • ${d['date_depense'] != null ? DateFormat('dd/MM/yyyy').format(DateTime.parse(d['date_depense'])) : ''}',
                            style: const TextStyle(fontSize: 12, color: AppColors.textGrey),
                          ),
                          if ((d['cree_par_nom'] ?? '').toString().isNotEmpty)
                            Text('Créée par ${d['cree_par_nom']}', style: const TextStyle(fontSize: 11, color: AppColors.textGrey)),
                          const SizedBox(height: 8),
                          Row(children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(color: _statutColor(d['statut']).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                              child: Text(d['statut_display'] ?? d['statut'] ?? '', style: TextStyle(fontSize: 11, color: _statutColor(d['statut']), fontWeight: FontWeight.w600)),
                            ),
                            const Spacer(),
                            if (d['justificatif'] != null)
                              IconButton(
                                iconSize: 18,
                                icon: const Icon(Icons.attach_file, color: AppColors.primaryGreen),
                                onPressed: () {
                                  final url = d['justificatif'].toString();
                                  launchUrl(Uri.parse(url.startsWith('http') ? url : '${ApiEndpoints.mediaBaseUrl}$url'), mode: LaunchMode.externalApplication);
                                },
                              ),
                            if (enAttente) ...[
                              IconButton(iconSize: 20, icon: const Icon(Icons.check_circle, color: AppColors.success), onPressed: () => _valider(d)),
                              IconButton(iconSize: 20, icon: const Icon(Icons.cancel, color: AppColors.error), onPressed: () => _refuser(d)),
                            ],
                            IconButton(iconSize: 18, icon: const Icon(Icons.delete, color: AppColors.error), onPressed: () => _supprimer(d)),
                          ]),
                        ]),
                      );
                    },
                  ),
      ),
      Positioned(
        right: 16, bottom: 16,
        child: FloatingActionButton(
          backgroundColor: AppColors.primaryGreen,
          onPressed: _showAjouterDepense,
          child: const Icon(Icons.add, color: Colors.white),
        ),
      ),
    ]);
  }
}

class _DepenseFormSheet extends StatefulWidget {
  final ApiService api;
  final VoidCallback onSaved;
  const _DepenseFormSheet({required this.api, required this.onSaved});

  @override
  State<_DepenseFormSheet> createState() => _DepenseFormSheetState();
}

class _DepenseFormSheetState extends State<_DepenseFormSheet> {
  final _motifCtrl = TextEditingController();
  final _montantCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  String _categorie = 'AUTRES';
  DateTime _date = DateTime.now();
  File? _justificatif;
  bool _saving = false;

  @override
  void dispose() {
    _motifCtrl.dispose();
    _montantCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_motifCtrl.text.trim().isEmpty || _montantCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Motif et montant sont requis.'), backgroundColor: AppColors.error),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final fields = {
        'motif': _motifCtrl.text.trim(),
        'categorie': _categorie,
        'montant': _montantCtrl.text.trim(),
        'date_depense': '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}',
        'notes': _notesCtrl.text.trim(),
      };
      final files = <http.MultipartFile>[];
      if (_justificatif != null) {
        final bytes = await _justificatif!.readAsBytes();
        files.add(http.MultipartFile.fromBytes('justificatif', bytes, filename: _justificatif!.path.split('/').last));
      }
      await widget.api.postMultipart(ApiEndpoints.depenses, fields: fields, files: files);
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Ajouter une dépense', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.primaryGreen)),
            const SizedBox(height: 16),
            TextField(controller: _motifCtrl, decoration: const InputDecoration(labelText: 'Motif *', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _categorie,
              decoration: const InputDecoration(labelText: 'Catégorie', border: OutlineInputBorder()),
              items: _categories.map((c) => DropdownMenuItem(value: c[0], child: Text(c[1]))).toList(),
              onChanged: (v) => setState(() => _categorie = v!),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _montantCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Montant (FCFA) *', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            InkWell(
              onTap: () async {
                final d = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime(2020), lastDate: DateTime(2030));
                if (d != null) setState(() => _date = d);
              },
              child: InputDecorator(
                decoration: const InputDecoration(labelText: 'Date *', border: OutlineInputBorder()),
                child: Text('${_date.day.toString().padLeft(2, '0')}/${_date.month.toString().padLeft(2, '0')}/${_date.year}'),
              ),
            ),
            const SizedBox(height: 12),
            TextField(controller: _notesCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Notes (optionnel)', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () async {
                final result = await FilePicker.platform.pickFiles();
                if (result != null && result.files.single.path != null) {
                  setState(() => _justificatif = File(result.files.single.path!));
                }
              },
              icon: const Icon(Icons.attach_file),
              label: Text(_justificatif != null ? _justificatif!.path.split('/').last : 'Joindre un justificatif (optionnel)'),
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.primaryGreen, side: const BorderSide(color: AppColors.primaryGreen)),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity, height: 48,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen, foregroundColor: Colors.white),
                child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Enregistrer'),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}
