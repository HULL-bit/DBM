import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../data/services/api_service.dart';
import '../../../data/providers/auth_provider.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/stat_card.dart';

class CotisationsScreen extends StatefulWidget {
  const CotisationsScreen({super.key});

  @override
  State<CotisationsScreen> createState() => _CotisationsScreenState();
}

class _CotisationsScreenState extends State<CotisationsScreen> {
  final _api = ApiService();
  List<dynamic> _cotisations = [];
  bool _loading = true;
  int _annee = DateTime.now().year;

  // Filtres (miroir des filtres web : type, mois, membre)
  String _typeFilter = '';
  int? _moisFilter;
  int? _membreFilter;
  List<Map<String, dynamic>> _usersFiltre = [];

  // Sélection multiple + validation groupée (comme le web)
  bool _selectionMode = false;
  final Set<int> _selection = {};

  static const _mois = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  Color _statutColor(String? statut) {
    switch (statut) {
      case 'payee': return AppColors.success;
      case 'declare': return AppColors.warning;
      case 'retard': return AppColors.error;
      case 'annulee': return AppColors.textGrey;
      default: return AppColors.textGrey;
    }
  }

  String _statutLabel(String? statut) {
    switch (statut) {
      case 'payee': return 'Payée';
      case 'declare': return 'Déclarée';
      case 'retard': return 'En retard';
      case 'annulee': return 'Annulée';
      default: return 'En attente';
    }
  }

  Future<void> _payerCotisation(dynamic c) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Déclarer mon paiement'),
        content: Text(
          'Cotisation ${c['mois']}/${c['annee']} — Montant : ${c['montant']} FCFA.\n\n'
          'En confirmant, votre cotisation passera en attente de confirmation. '
          'Le chargé de finance vérifiera votre paiement et le validera prochainement.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen, foregroundColor: Colors.white),
            child: const Text('Déclarer mon paiement'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _api.post('${ApiEndpoints.cotisations}${c['id']}/payer/', {'mode_paiement': 'liquide'});
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: AppColors.error));
    }
  }

  // ── Member picker ─────────────────────────────────────────
  Future<List<Map<String, dynamic>>> _fetchUsers() async {
    try {
      final data = await _api.get('${ApiEndpoints.users}?page_size=500');
      final list = data['results'] ?? data ?? [];
      return List<Map<String, dynamic>>.from(
        (list as List).map((u) => {
          'id': u['id'],
          'nom': '${u['first_name'] ?? ''} ${u['last_name'] ?? ''}'.trim().isEmpty
              ? u['username'] ?? 'User ${u["id"]}'
              : '${u['first_name'] ?? ''} ${u['last_name'] ?? ''}'.trim(),
          'username': u['username'] ?? '',
          'cellule': u['cellule'] ?? '',
        }),
      );
    } catch (_) {
      return [];
    }
  }


  // ── Cellule labels ──
  static const _celluleLabels = {
    'all': 'Tous',
    'dakar': 'Dakar',
    'touba_mbacke': 'Touba/Mbacké',
    'diaspora': 'Diaspora',
  };

  // ── Add/Edit cotisation form (full-screen dialog) ──────────
  void _showCotisationForm({dynamic item}) {
    Navigator.of(context).push(MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => _CotisationFormPage(
        api: _api,
        item: item,
        annee: _annee,
        moisLabels: _mois,
        celluleLabels: _celluleLabels,
        fetchUsers: _fetchUsers,
        onSaved: () {
          _load();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(item != null ? 'Cotisation modifiée' : 'Cotisation(s) créée(s) !'),
              backgroundColor: AppColors.success,
            ));
          }
        },
      ),
    ));
  }

  @override
  void initState() {
    super.initState();
    _load();
    _fetchUsers().then((u) { if (mounted) setState(() => _usersFiltre = u); });
  }

  Future<void> _load() async {
    try {
      final data = await _api.get('${ApiEndpoints.cotisations}?annee=$_annee');
      Map<String, dynamic> statsData = {};
      try {
        statsData = await _api.get('${ApiEndpoints.cotisations}statistiques/') ?? {};
      } catch (_) {}
      if (mounted) {
        setState(() {
          _cotisations = data['results'] ?? data ?? [];
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> get _filtered => _cotisations.where((c) {
        final typeOk = _typeFilter.isEmpty || c['type_cotisation'] == _typeFilter;
        final moisOk = _moisFilter == null || (int.tryParse(c['mois']?.toString() ?? '') ?? -1) == _moisFilter;
        final membreOk = _membreFilter == null || (c['membre'] is int ? c['membre'] : int.tryParse(c['membre']?.toString() ?? '')) == _membreFilter;
        return typeOk && moisOk && membreOk;
      }).toList();

  bool _estConfirmable(dynamic c) => c['statut'] != 'payee' && c['statut'] != 'annulee';

  List<dynamic> get _confirmables => _filtered.where(_estConfirmable).toList();

  void _resetFiltres() {
    setState(() { _typeFilter = ''; _moisFilter = null; _membreFilter = null; });
  }

  void _toggleSelection(int id) {
    setState(() {
      if (_selection.contains(id)) {
        _selection.remove(id);
      } else {
        _selection.add(id);
      }
    });
  }

  Future<void> _confirmerSelection() async {
    if (_selection.isEmpty) return;
    final ids = _selection.toList();
    try {
      await Future.wait(ids.map((id) => _api.patch('${ApiEndpoints.cotisations}$id/', {'statut': 'payee'})));
      setState(() { _selection.clear(); _selectionMode = false; });
      _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('${ids.length} paiement(s) validé(s).'),
          backgroundColor: AppColors.success,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: AppColors.error));
      }
    }
  }

  double get _total => _cotisations.fold(
      0.0, (s, c) => s + (double.tryParse(c['montant']?.toString() ?? '0') ?? 0));

  int get _payees =>
      _cotisations.where((c) => c['statut'] == 'payee').length;

  double get _totalMensualite => _cotisations
      .where((c) => c['type_cotisation'] == 'mensualite')
      .fold(0.0, (s, c) => s + (double.tryParse(c['montant']?.toString() ?? '0') ?? 0));

  double get _totalAssignation => _cotisations
      .where((c) => c['type_cotisation'] == 'assignation')
      .fold(0.0, (s, c) => s + (double.tryParse(c['montant']?.toString() ?? '0') ?? 0));

  double get _pourcentagePaiement {
    if (_cotisations.isEmpty) return 0;
    return (_payees / _cotisations.length) * 100;
  }

  @override
  Widget build(BuildContext context) {
    final user = context.read<AuthProvider>().user;
    final fmt = NumberFormat('#,##0', 'fr_FR');

    final isJewrinFinance = user?.isJewrinFinance == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('SAAS YI'),
        actions: [
          if (isJewrinFinance && _selectionMode)
            IconButton(
              tooltip: _selection.length == _confirmables.length ? 'Tout désélectionner' : 'Tout sélectionner',
              icon: Icon(
                _selection.length == _confirmables.length && _confirmables.isNotEmpty
                    ? Icons.deselect
                    : Icons.select_all,
                color: AppColors.white,
              ),
              onPressed: () => setState(() {
                if (_selection.length == _confirmables.length) {
                  _selection.clear();
                } else {
                  _selection
                    ..clear()
                    ..addAll(_confirmables.map((c) => c['id'] as int));
                }
              }),
            ),
          if (isJewrinFinance)
            IconButton(
              tooltip: _selectionMode ? 'Annuler la sélection' : 'Sélectionner et valider',
              icon: Icon(_selectionMode ? Icons.close : Icons.playlist_add_check, color: AppColors.white),
              onPressed: () => setState(() {
                _selectionMode = !_selectionMode;
                _selection.clear();
              }),
            ),
          DropdownButtonHideUnderline(
            child: DropdownButton<int>(
              value: _annee,
              dropdownColor: AppColors.darkGreen,
              style: const TextStyle(color: AppColors.white),
              items: List.generate(5, (i) => DateTime.now().year - i)
                  .map((y) => DropdownMenuItem(
                        value: y,
                        child: Text('$y',
                            style: const TextStyle(color: AppColors.white)),
                      ))
                  .toList(),
              onChanged: (y) {
                if (y != null) setState(() { _annee = y; _loading = true; });
                _load();
              },
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      drawer: const AppDrawer(),
      floatingActionButton: (isJewrinFinance && !_selectionMode)
          ? FloatingActionButton(
              backgroundColor: AppColors.primaryGreen,
              onPressed: () => _showCotisationForm(),
              child: const Icon(Icons.add, color: AppColors.white),
            )
          : null,
      bottomNavigationBar: (_selectionMode && _selection.isNotEmpty)
          ? SafeArea(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                color: AppColors.white,
                child: Row(children: [
                  Text('${_selection.length} sélectionné(s)', style: const TextStyle(fontWeight: FontWeight.w600)),
                  const Spacer(),
                  ElevatedButton.icon(
                    onPressed: _confirmerSelection,
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Confirmer'),
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen, foregroundColor: Colors.white),
                  ),
                ]),
              ),
            )
          : null,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
          : Column(children: [
              _buildFiltres(),
              Expanded(
                child: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primaryGreen,
        child: ListView.builder(
                    padding: EdgeInsets.zero,
                    itemCount: _filtered.isEmpty ? 2 : _filtered.length + 1,
                    itemBuilder: (_, i) {
                      // Item 0: stats cards row
                      if (i == 0) {
                        return SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 160,
                                child: StatCard(
                                  title: 'Mensualités',
                                  value: '${fmt.format(_totalMensualite)} F',
                                  icon: Icons.calendar_month,
                                  color: AppColors.primaryGreen,
                                ),
                              ),
                              const SizedBox(width: 12),
                              SizedBox(
                                width: 160,
                                child: StatCard(
                                  title: 'Assignations',
                                  value: '${fmt.format(_totalAssignation)} F',
                                  icon: Icons.assignment,
                                  color: AppColors.primaryGold,
                                ),
                              ),
                              const SizedBox(width: 12),
                              SizedBox(
                                width: 160,
                                child: StatCard(
                                  title: 'Total',
                                  value: '${fmt.format(_total)} F',
                                  icon: Icons.account_balance_wallet,
                                  color: AppColors.success,
                                ),
                              ),
                              const SizedBox(width: 12),
                              SizedBox(
                                width: 160,
                                child: StatCard(
                                  title: 'Taux paiement',
                                  value: '${_pourcentagePaiement.toStringAsFixed(1)}%',
                                  icon: Icons.percent,
                                  color: AppColors.info,
                                ),
                              ),
                            ],
                          ),
                        );
                      }
                      // Item 1 when empty
                      if (_filtered.isEmpty) {
                        return Padding(
                          padding: const EdgeInsets.all(40),
                          child: Center(child: Text(
                            _cotisations.isEmpty ? 'Aucune cotisation' : 'Aucune cotisation ne correspond aux filtres',
                            style: const TextStyle(color: AppColors.textGrey),
                          )),
                        );
                      }
                      // Cotisation items
                      final i2 = i - 1;
                      final c = _filtered[i2];
                      final isPaye = c['statut'] == 'payee';
                      final moisNum = int.tryParse(c['mois']?.toString() ?? '0') ?? 0;
                      final moisLabel = moisNum >= 1 && moisNum <= 12
                          ? _mois[moisNum - 1]
                          : c['mois']?.toString() ?? '-';

                      return Container(
                        margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isPaye
                                ? AppColors.success.withValues(alpha: 0.4)
                                : AppColors.primaryGold.withValues(alpha: 0.3),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                if (_selectionMode && _estConfirmable(c))
                                  Checkbox(
                                    value: _selection.contains(c['id'] as int),
                                    activeColor: AppColors.primaryGreen,
                                    onChanged: (_) => _toggleSelection(c['id'] as int),
                                  )
                                else
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: isPaye
                                          ? AppColors.success.withValues(alpha: 0.12)
                                          : AppColors.warning.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Icon(
                                      isPaye ? Icons.check_circle : Icons.pending,
                                      color: isPaye ? AppColors.success : AppColors.warning,
                                      size: 20,
                                    ),
                                  ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      if (user?.isJewrinFinance == true)
                                        Text(
                                          c['membre_nom'] ?? (c['membre'] is Map
                                              ? c['membre']['username'] ?? ''
                                              : c['membre']?.toString() ?? ''),
                                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                        ),
                                      Text(
                                        '${c['type_cotisation'] == 'assignation' ? 'Assignation' : 'Mensualité'} • $moisLabel ${c['annee']}',
                                        style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
                                      ),
                                      if (c['objet_assignation'] != null && (c['objet_assignation'] as String).isNotEmpty)
                                        Text(c['objet_assignation'], style: const TextStyle(fontSize: 11, color: AppColors.textGrey)),
                                      Row(children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: _statutColor(c['statut']).withValues(alpha: 0.12),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(_statutLabel(c['statut']), style: TextStyle(fontSize: 10, color: _statutColor(c['statut']), fontWeight: FontWeight.w600)),
                                        ),
                                      ]),
                                    ],
                                  ),
                                ),
                                Text(
                                  '${fmt.format(double.tryParse(c['montant']?.toString() ?? '0') ?? 0)} F',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: isPaye ? AppColors.success : AppColors.warning,
                                  ),
                                ),
                              ],
                            ),
                            // Member's own "Payer" flow
                            if (user != null && c['membre'] == user.id && (c['statut'] == 'en_attente' || c['statut'] == 'declare'))
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Align(
                                  alignment: Alignment.centerRight,
                                  child: c['statut'] == 'declare'
                                      ? Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: AppColors.warning.withValues(alpha: 0.12),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: const Text(
                                            'En attente de confirmation',
                                            style: TextStyle(fontSize: 11, color: AppColors.warning, fontWeight: FontWeight.w600),
                                          ),
                                        )
                                      : ElevatedButton.icon(
                                          onPressed: () => _payerCotisation(c),
                                          icon: const Icon(Icons.payment, size: 14),
                                          label: const Text('Payer', style: TextStyle(fontSize: 12)),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: AppColors.primaryGreen,
                                            foregroundColor: Colors.white,
                                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                            minimumSize: Size.zero,
                                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                          ),
                                        ),
                                ),
                              ),
                            // Admin actions
                            if (user?.isJewrinFinance == true)
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    // Quick mark as paid
                                    if (!isPaye)
                                      InkWell(
                                        onTap: () async {
                                          try {
                                            await _api.patch('${ApiEndpoints.cotisations}${c['id']}/', {'statut': 'payee'});
                                            _load();
                                          } catch (e) {
                                            if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
                                          }
                                        },
                                        borderRadius: BorderRadius.circular(6),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: AppColors.success.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: const Row(mainAxisSize: MainAxisSize.min, children: [
                                            Icon(Icons.check, size: 13, color: AppColors.success),
                                            SizedBox(width: 3),
                                            Text('Marquer payée', style: TextStyle(fontSize: 11, color: AppColors.success, fontWeight: FontWeight.w500)),
                                          ]),
                                        ),
                                      ),
                                    if (!isPaye) const SizedBox(width: 6),
                                    // Edit
                                    InkWell(
                                      onTap: () => _showCotisationForm(item: c),
                                      borderRadius: BorderRadius.circular(6),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: AppColors.primaryGold.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: const Row(mainAxisSize: MainAxisSize.min, children: [
                                          Icon(Icons.edit, size: 13, color: AppColors.primaryGold),
                                          SizedBox(width: 3),
                                          Text('Modifier', style: TextStyle(fontSize: 11, color: AppColors.primaryGold, fontWeight: FontWeight.w500)),
                                        ]),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    // Delete
                                    InkWell(
                                      onTap: () async {
                                        final ok = await showDialog<bool>(
                                          context: context,
                                          builder: (ctx) => AlertDialog(
                                            title: const Text('Supprimer ?'),
                                            content: const Text('Supprimer cette cotisation ?'),
                                            actions: [
                                              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
                                              ElevatedButton(onPressed: () => Navigator.pop(ctx, true), style: ElevatedButton.styleFrom(backgroundColor: AppColors.error), child: const Text('Supprimer')),
                                            ],
                                          ),
                                        );
                                        if (ok == true) {
                                          try {
                                            await _api.delete('${ApiEndpoints.cotisations}${c['id']}/');
                                            _load();
                                          } catch (e) {
                                            if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
                                          }
                                        }
                                      },
                                      borderRadius: BorderRadius.circular(6),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: AppColors.error.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: const Row(mainAxisSize: MainAxisSize.min, children: [
                                          Icon(Icons.delete, size: 13, color: AppColors.error),
                                          SizedBox(width: 3),
                                          Text('Supprimer', style: TextStyle(fontSize: 11, color: AppColors.error, fontWeight: FontWeight.w500)),
                                        ]),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      );
                            },
                          ),
        ),
              ),
            ]),
    );
  }

  Widget _buildFiltres() {
    final hasFilter = _typeFilter.isNotEmpty || _moisFilter != null || _membreFilter != null;
    final user = context.read<AuthProvider>().user;
    return Container(
      color: AppColors.primaryGreen,
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 10),
      child: Column(children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: [
            ChoiceChip(
              label: const Text('Toutes'),
              selected: _typeFilter.isEmpty,
              onSelected: (_) => setState(() => _typeFilter = ''),
            ),
            const SizedBox(width: 6),
            ChoiceChip(
              label: const Text('Mensualités'),
              selected: _typeFilter == 'mensualite',
              onSelected: (_) => setState(() => _typeFilter = 'mensualite'),
            ),
            const SizedBox(width: 6),
            ChoiceChip(
              label: const Text('Assignations'),
              selected: _typeFilter == 'assignation',
              onSelected: (_) => setState(() => _typeFilter = 'assignation'),
            ),
          ]),
        ),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(
            child: DropdownButtonFormField<int>(
              initialValue: _moisFilter,
              isExpanded: true,
              decoration: _filtreDeco('Mois'),
              dropdownColor: AppColors.white,
              items: [
                const DropdownMenuItem(value: null, child: Text('Tous')),
                ...List.generate(12, (i) => DropdownMenuItem(value: i + 1, child: Text(_mois[i]))),
              ],
              onChanged: (v) => setState(() => _moisFilter = v),
            ),
          ),
          if (user?.isJewrinFinance == true) ...[
            const SizedBox(width: 8),
            Expanded(
              child: DropdownButtonFormField<int>(
                initialValue: _membreFilter,
                isExpanded: true,
                decoration: _filtreDeco('Membre'),
                dropdownColor: AppColors.white,
                items: [
                  const DropdownMenuItem(value: null, child: Text('Tous')),
                  ..._usersFiltre.map((u) => DropdownMenuItem(value: u['id'] as int, child: Text(u['nom'] as String, overflow: TextOverflow.ellipsis))),
                ],
                onChanged: (v) => setState(() => _membreFilter = v),
              ),
            ),
          ],
          if (hasFilter) ...[
            const SizedBox(width: 4),
            IconButton(
              tooltip: 'Réinitialiser',
              icon: const Icon(Icons.filter_alt_off, color: AppColors.white, size: 20),
              onPressed: _resetFiltres,
            ),
          ],
        ]),
      ]),
    );
  }

  InputDecoration _filtreDeco(String label) => InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppColors.textGrey, fontSize: 12),
        filled: true,
        fillColor: AppColors.white,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
      );
}

// ══════════════════════════════════════════════════════════════
// Full-screen Cotisation Form Page (matches React Cotisations.jsx)
// ══════════════════════════════════════════════════════════════
class _CotisationFormPage extends StatefulWidget {
  final ApiService api;
  final dynamic item;
  final int annee;
  final List<String> moisLabels;
  final Map<String, String> celluleLabels;
  final Future<List<Map<String, dynamic>>> Function() fetchUsers;
  final VoidCallback onSaved;

  const _CotisationFormPage({
    required this.api,
    required this.item,
    required this.annee,
    required this.moisLabels,
    required this.celluleLabels,
    required this.fetchUsers,
    required this.onSaved,
  });

  @override
  State<_CotisationFormPage> createState() => _CotisationFormPageState();
}

class _CotisationFormPageState extends State<_CotisationFormPage> {
  String _typeCotisation = 'mensualite';
  String _objetAssignation = '';
  String _modePaiement = 'wave';
  String _statut = 'en_attente';
  late TextEditingController _montantCtrl;
  late TextEditingController _notesCtrl;
  late TextEditingController _refCtrl;
  int _mois = DateTime.now().month;
  int _annee = DateTime.now().year;
  DateTime? _dateEcheance;
  bool _isMultiMode = true;
  List<int> _selectedMemberIds = [];
  int? _singleMemberId;
  List<Map<String, dynamic>> _allUsers = [];
  String _memberSearch = '';
  String _celluleFilter = 'all';
  bool _loading = true;
  bool _saving = false;

  bool get _isEditing => widget.item != null;

  @override
  void initState() {
    super.initState();
    final item = widget.item;
    _typeCotisation = item?['type_cotisation'] ?? 'mensualite';
    _objetAssignation = item?['objet_assignation'] ?? '';
    _modePaiement = item?['mode_paiement'] ?? 'wave';
    _statut = item?['statut'] ?? 'en_attente';
    _montantCtrl = TextEditingController(text: item?['montant']?.toString() ?? '1000');
    _notesCtrl = TextEditingController(text: item?['notes'] ?? '');
    _refCtrl = TextEditingController(text: item?['reference_wave'] ?? '');
    _mois = item != null ? (int.tryParse(item['mois']?.toString() ?? '') ?? DateTime.now().month) : DateTime.now().month;
    _annee = item != null ? (int.tryParse(item['annee']?.toString() ?? '') ?? widget.annee) : widget.annee;
    _dateEcheance = item?['date_echeance'] != null ? DateTime.tryParse(item['date_echeance']) : DateTime.now();
    if (!_isEditing) {
      widget.fetchUsers().then((users) {
        if (mounted) {
          setState(() {
            _allUsers = users;
            _selectedMemberIds = users.map((u) => u['id'] as int).toList();
            _loading = false;
          });
        }
      });
    } else {
      _loading = false;
    }
  }

  @override
  void dispose() {
    _montantCtrl.dispose();
    _notesCtrl.dispose();
    _refCtrl.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _filteredUsers {
    return _allUsers.where((u) {
      if (_celluleFilter != 'all' && u['cellule'] != _celluleFilter) return false;
      if (_memberSearch.isNotEmpty) {
        final q = _memberSearch.toLowerCase();
        return (u['nom'] as String).toLowerCase().contains(q) ||
            (u['username'] as String).toLowerCase().contains(q);
      }
      return true;
    }).toList();
  }

  InputDecoration _deco(String label, {String? suffix}) => InputDecoration(
    labelText: label, suffixText: suffix,
    filled: true, fillColor: Colors.white,
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: AppColors.primaryGold.withValues(alpha: 0.3))),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: AppColors.primaryGold.withValues(alpha: 0.3))),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.primaryGreen, width: 1.5)),
    labelStyle: const TextStyle(fontSize: 13, color: AppColors.textGrey),
  );

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: AppColors.error));
  }

  Future<void> _save() async {
    if (!_isEditing) {
      if (_isMultiMode && _selectedMemberIds.isEmpty) { _showError('Sélectionnez au moins un membre'); return; }
      if (!_isMultiMode && _singleMemberId == null) { _showError('Sélectionnez un membre'); return; }
    }
    if (_dateEcheance == null) { _showError('Date d\'échéance requise'); return; }
    if (_typeCotisation == 'assignation' && _objetAssignation.isEmpty) { _showError('Objet d\'assignation requis'); return; }

    setState(() => _saving = true);
    final data = {
      'type_cotisation': _typeCotisation,
      'objet_assignation': _typeCotisation == 'assignation' ? _objetAssignation : '',
      'montant': _montantCtrl.text.trim().isEmpty ? '1000' : _montantCtrl.text.trim(),
      'mois': _mois, 'annee': _annee,
      'date_echeance': '${_dateEcheance!.year}-${_dateEcheance!.month.toString().padLeft(2, '0')}-${_dateEcheance!.day.toString().padLeft(2, '0')}',
      'statut': _statut, 'mode_paiement': _modePaiement,
      'reference_wave': _refCtrl.text.trim(), 'notes': _notesCtrl.text.trim(),
    };
    try {
      if (_isEditing) {
        await widget.api.patch('${ApiEndpoints.cotisations}${widget.item['id']}/', data);
      } else if (!_isMultiMode && _singleMemberId != null) {
        await widget.api.post(ApiEndpoints.cotisations, {...data, 'membre': _singleMemberId});
      } else {
        await widget.api.post('${ApiEndpoints.cotisations}create-multiple/', {'membres': _selectedMemberIds, 'cotisation': data});
      }
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() => _saving = false);
      _showError('Erreur: $e');
    }
  }

  Widget _sectionTitle(String t) => Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: Text(t, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryGreen)),
  );

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredUsers;
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: AppColors.primaryGreen,
        leading: IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: Text(_isEditing ? 'Modifier Cotisation' : 'Nouvelle Cotisation', style: const TextStyle(color: Colors.white, fontSize: 17)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primaryGreen))
          : Column(children: [
              Expanded(
                child: ListView(padding: const EdgeInsets.all(16), children: [
                  // ─── 1. MEMBERS (creation only) ───
                  if (!_isEditing) ...[
                    _sectionTitle('Membres *'),
                    DropdownButtonFormField<String>(
                      value: _isMultiMode ? 'multiple' : 'single',
                      decoration: _deco('Type de création'),
                      items: const [
                        DropdownMenuItem(value: 'single', child: Text('Un seul membre')),
                        DropdownMenuItem(value: 'multiple', child: Text('Plusieurs membres (tous ou sélection)')),
                      ],
                      onChanged: (v) => setState(() {
                        _isMultiMode = v == 'multiple';
                        if (_isMultiMode) {
                          _selectedMemberIds = _allUsers.map((u) => u['id'] as int).toList();
                          _singleMemberId = null;
                        } else {
                          _selectedMemberIds = [];
                        }
                      }),
                    ),
                    const SizedBox(height: 8),
                    if (_isMultiMode) ...[
                      Row(children: [
                        Text('${_selectedMemberIds.length} / ${_allUsers.length} sélectionné(s)',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        const Spacer(),
                        TextButton(
                          onPressed: () => setState(() => _selectedMemberIds = _allUsers.map((u) => u['id'] as int).toList()),
                          child: const Text('Tout sélectionner', style: TextStyle(fontSize: 11)),
                        ),
                        TextButton(
                          onPressed: () => setState(() => _selectedMemberIds = []),
                          child: const Text('Désélectionner', style: TextStyle(fontSize: 11, color: AppColors.error)),
                        ),
                      ]),
                      // Cellule filter (3 cellules: Dakar, Touba/Mbacké, Diaspora)
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: widget.celluleLabels.entries.map((e) {
                            final active = _celluleFilter == e.key;
                            return Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: ChoiceChip(
                                label: Text(e.value, style: TextStyle(fontSize: 11, color: active ? Colors.white : AppColors.textDark)),
                                selected: active,
                                selectedColor: AppColors.primaryGreen,
                                onSelected: (_) => setState(() => _celluleFilter = e.key),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        onChanged: (v) => setState(() => _memberSearch = v),
                        decoration: InputDecoration(
                          hintText: 'Rechercher un membre...',
                          prefixIcon: const Icon(Icons.search, size: 18),
                          filled: true, fillColor: Colors.white, isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        constraints: const BoxConstraints(maxHeight: 220),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: AppColors.textGrey.withValues(alpha: 0.3)),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: ListView.builder(
                          shrinkWrap: true,
                          itemCount: filtered.length,
                          itemBuilder: (_, i) {
                            final u = filtered[i];
                            final uid = u['id'] as int;
                            final checked = _selectedMemberIds.contains(uid);
                            final cellule = u['cellule'] as String;
                            final cl = cellule.isNotEmpty ? (widget.celluleLabels[cellule] ?? cellule) : '';
                            return CheckboxListTile(
                              dense: true,
                              controlAffinity: ListTileControlAffinity.leading,
                              activeColor: AppColors.primaryGreen,
                              value: checked,
                              title: Text(u['nom'] as String, style: const TextStyle(fontSize: 12)),
                              subtitle: Text('${u['username']}${cl.isNotEmpty ? ' • $cl' : ''}', style: const TextStyle(fontSize: 10, color: AppColors.textGrey)),
                              onChanged: (v) => setState(() {
                                if (v == true) { _selectedMemberIds.add(uid); } else { _selectedMemberIds.remove(uid); }
                              }),
                            );
                          },
                        ),
                      ),
                    ] else ...[
                      DropdownButtonFormField<int>(
                        value: _singleMemberId,
                        decoration: _deco('Sélectionner un membre *'),
                        isExpanded: true,
                        items: _allUsers.map((u) => DropdownMenuItem<int>(
                          value: u['id'] as int,
                          child: Text('${u['nom']} (${u['username']})', style: const TextStyle(fontSize: 13)),
                        )).toList(),
                        onChanged: (v) => setState(() => _singleMemberId = v),
                      ),
                    ],
                    const SizedBox(height: 16),
                  ],

                  // ─── 2. TYPE COTISATION ───
                  _sectionTitle('Type de cotisation'),
                  DropdownButtonFormField<String>(
                    value: _typeCotisation,
                    decoration: _deco('Type'),
                    items: const [
                      DropdownMenuItem(value: 'mensualite', child: Text('Mensualité')),
                      DropdownMenuItem(value: 'assignation', child: Text('Assignation')),
                    ],
                    onChanged: (v) => setState(() => _typeCotisation = v!),
                  ),
                  const SizedBox(height: 12),

                  // ─── 3. OBJET ASSIGNATION (conditional) ───
                  if (_typeCotisation == 'assignation') ...[
                    _sectionTitle('Objet de l\'assignation *'),
                    DropdownButtonFormField<String>(
                      value: _objetAssignation.isEmpty ? null : _objetAssignation,
                      decoration: _deco('Objet'),
                      hint: const Text('MAGAL, GAMOU, KAZU RAJABB...'),
                      items: const [
                        DropdownMenuItem(value: 'MAGAL', child: Text('MAGAL')),
                        DropdownMenuItem(value: 'GAMOU', child: Text('GAMOU')),
                        DropdownMenuItem(value: 'KAZU RAJABB', child: Text('KAZU RAJABB')),
                        DropdownMenuItem(value: 'KOOR', child: Text('KOOR')),
                        DropdownMenuItem(value: 'SOCIAL', child: Text('SOCIAL')),
                        DropdownMenuItem(value: 'XELCOM', child: Text('XELCOM')),
                        DropdownMenuItem(value: 'AUTRES', child: Text('AUTRES')),
                      ],
                      onChanged: (v) => setState(() => _objetAssignation = v ?? ''),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // ─── 4. MODE PAIEMENT ───
                  _sectionTitle('Mode de paiement'),
                  DropdownButtonFormField<String>(
                    value: _modePaiement,
                    decoration: _deco('Mode'),
                    items: const [
                      DropdownMenuItem(value: 'wave', child: Text('Wave')),
                      DropdownMenuItem(value: 'liquide', child: Text('Espèces / Liquide')),
                      DropdownMenuItem(value: 'autre', child: Text('Autre')),
                    ],
                    onChanged: (v) => setState(() => _modePaiement = v!),
                  ),
                  const SizedBox(height: 12),

                  // ─── 5. MONTANT ───
                  _sectionTitle('Montant (FCFA)'),
                  TextField(
                    controller: _montantCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: _deco('Montant *', suffix: 'F'),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 12),

                  // ─── 6. NOTES ───
                  _sectionTitle('Notes (optionnel)'),
                  TextField(controller: _notesCtrl, decoration: _deco('Notes'), maxLines: 2),
                  const SizedBox(height: 12),

                  // ─── 7. MOIS ───
                  _sectionTitle('Mois'),
                  DropdownButtonFormField<int>(
                    value: _mois,
                    decoration: _deco('Mois *'),
                    isExpanded: true,
                    items: List.generate(12, (i) => DropdownMenuItem(value: i + 1, child: Text(widget.moisLabels[i]))),
                    onChanged: (v) => setState(() => _mois = v!),
                  ),
                  const SizedBox(height: 12),

                  // ─── 8. ANNÉE ───
                  _sectionTitle('Année'),
                  DropdownButtonFormField<int>(
                    value: _annee,
                    decoration: _deco('Année *'),
                    items: List.generate(5, (i) => DateTime.now().year - 2 + i)
                        .map((y) => DropdownMenuItem(value: y, child: Text('$y'))).toList(),
                    onChanged: (v) => setState(() => _annee = v!),
                  ),
                  const SizedBox(height: 12),

                  // ─── 9. DATE ÉCHÉANCE ───
                  _sectionTitle('Date d\'échéance *'),
                  InkWell(
                    onTap: () async {
                      final d = await showDatePicker(
                        context: context,
                        initialDate: _dateEcheance ?? DateTime(_annee, _mois, 28),
                        firstDate: DateTime(2020), lastDate: DateTime(2030),
                      );
                      if (d != null) setState(() => _dateEcheance = d);
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      decoration: BoxDecoration(
                        color: Colors.white, borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: _dateEcheance == null ? AppColors.error.withValues(alpha: 0.5) : AppColors.primaryGreen.withValues(alpha: 0.4)),
                      ),
                      child: Row(children: [
                        Icon(Icons.event, size: 18, color: _dateEcheance == null ? AppColors.error : AppColors.primaryGreen),
                        const SizedBox(width: 10),
                        Text(
                          _dateEcheance != null
                              ? '${_dateEcheance!.day.toString().padLeft(2, '0')}/${_dateEcheance!.month.toString().padLeft(2, '0')}/${_dateEcheance!.year}'
                              : 'Sélectionner une date',
                          style: TextStyle(fontSize: 14, color: _dateEcheance == null ? AppColors.error : AppColors.textDark),
                        ),
                      ]),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // ─── 10. STATUT ───
                  _sectionTitle('Statut'),
                  DropdownButtonFormField<String>(
                    value: _statut,
                    decoration: _deco('Statut'),
                    items: const [
                      DropdownMenuItem(value: 'en_attente', child: Text('En attente')),
                      DropdownMenuItem(value: 'declare', child: Text('Déclarée')),
                      DropdownMenuItem(value: 'payee', child: Text('Payée')),
                      DropdownMenuItem(value: 'retard', child: Text('En retard')),
                      DropdownMenuItem(value: 'annulee', child: Text('Annulée')),
                    ],
                    onChanged: (v) => setState(() => _statut = v!),
                  ),
                  const SizedBox(height: 24),
                ]),
              ),
              // Save button
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: SizedBox(
                    width: double.infinity, height: 52,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryGreen, foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _saving ? null : _save,
                      child: _saving
                          ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text(_isEditing ? 'Enregistrer' : 'Créer la cotisation', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ),
              ),
            ]),
    );
  }
}
