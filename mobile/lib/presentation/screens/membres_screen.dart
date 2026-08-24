import 'package:flutter/material.dart';
import '../../core/constants/colors.dart';
import '../../core/constants/api_endpoints.dart';
import '../../data/services/api_service.dart';
import '../../data/models/user_model.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:provider/provider.dart';
import '../../data/providers/auth_provider.dart';
import '../widgets/safe_avatar.dart';
import '../widgets/app_drawer.dart';
import '../widgets/stat_card.dart';

class MembresScreen extends StatefulWidget {
  const MembresScreen({super.key});

  @override
  State<MembresScreen> createState() => _MembresScreenState();
}

class _MembresScreenState extends State<MembresScreen> {
  final ApiService _api = ApiService();
  bool _loading = true;
  bool _hasError = false;
  List<UserModel> _membres = [];
  List<UserModel> _filtered = [];
  String _searchQuery = '';
  String _roleFilter = 'all';
  String _sexFilter = 'all';
  String _categoryFilter = 'all';

  @override
  void initState() {
    super.initState();
    _loadMembres();
  }

  Future<void> _loadMembres() async {
    setState(() { _loading = true; _hasError = false; });
    try {
      final res = await _api.get(ApiEndpoints.users);
      final list = res['results'] ?? res['data'] ?? [];
      if (mounted) {
        final membres = (list as List).map((u) => UserModel.fromJson(u)).toList();
        setState(() {
          _membres = membres;
          _applyFilters();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() { _loading = false; _hasError = true; });
    }
  }

  void _applyFilters() {
    _filtered = _membres.where((m) {
      final matchSearch = m.fullName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          m.email.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          m.username.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchRole = _roleFilter == 'all' || m.role == _roleFilter;
      final matchSex = _sexFilter == 'all' || m.sexe == _sexFilter;
      final matchCat = _categoryFilter == 'all' || m.categorie == _categoryFilter;
      return matchSearch && matchRole && matchSex && matchCat;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Membres (${_filtered.length})'),
      ),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          // Stats Cards
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  SizedBox(
                    width: 140,
                    child: StatCard(
                      title: 'Total',
                      value: '${_membres.length}',
                      icon: Icons.people_outline,
                      color: AppColors.primaryGreen,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 140,
                    child: StatCard(
                      title: 'Hommes',
                      value: '${_membres.where((m) => m.sexe == 'M').length}',
                      icon: Icons.male,
                      color: AppColors.info,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 140,
                    child: StatCard(
                      title: 'Femmes',
                      value: '${_membres.where((m) => m.sexe == 'F').length}',
                      icon: Icons.female,
                      color: AppColors.error,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Search + filter bar
          Container(
            color: AppColors.backgroundBeige,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Column(
              children: [
                TextField(
                  onChanged: (val) => setState(() { _searchQuery = val; _applyFilters(); }),
                  decoration: InputDecoration(
                    hintText: 'Rechercher un membre...',
                    prefixIcon: const Icon(Icons.search, color: AppColors.primaryGreen, size: 20),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () => setState(() { _searchQuery = ''; _applyFilters(); }))
                        : null,
                    filled: true,
                    fillColor: AppColors.white,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _filterChip('role', 'all', 'Tous'),
                      _filterChip('role', 'membre', 'Membres'),
                      _filterChip('role', 'jewrin', 'Jewrin'),
                      _filterChip('role', 'admin', 'Admin'),
                      const VerticalDivider(width: 20),
                      _filterChip('sexe', 'all', 'Sexe: Tous'),
                      _filterChip('sexe', 'M', 'Hommes'),
                      _filterChip('sexe', 'F', 'Femmes'),
                      const VerticalDivider(width: 20),
                      _filterChip('cat', 'all', 'Cat: Toutes'),
                      _filterChip('cat', 'eleve', 'Élève'),
                      _filterChip('cat', 'etudiant', 'Étudiant'),
                      _filterChip('cat', 'professionnel', 'Professionnel'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadMembres,
              color: AppColors.primaryGreen,
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _hasError
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.cloud_off, size: 60, color: AppColors.textGrey),
                              const SizedBox(height: 12),
                              const Text('Erreur de chargement', style: TextStyle(color: AppColors.textGrey)),
                              const SizedBox(height: 12),
                              ElevatedButton(onPressed: _loadMembres, child: const Text('Réessayer')),
                            ],
                          ),
                        )
                      : _filtered.isEmpty
                          ? const Center(child: Text('Aucun membre trouvé.', style: TextStyle(color: AppColors.textGrey)))
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              itemCount: _filtered.length,
                              itemBuilder: (context, index) => _MemberCard(
                                membre: _filtered[index],
                                onTap: () => _showMemberDetail(_filtered[index]),
                              ),
                            ),
            ),
          ),
        ],
      ),
      floatingActionButton: context.watch<AuthProvider>().user?.isAdmin == true
          ? FloatingActionButton(
              onPressed: _showAddMemberForm,
              backgroundColor: AppColors.primaryGreen,
              child: const Icon(Icons.person_add, color: AppColors.white),
            )
          : null,
    );
  }

  Widget _filterChip(String group, String value, String label) {
    String current = group == 'role' ? _roleFilter : (group == 'sexe' ? _sexFilter : _categoryFilter);
    final selected = current == value;
    return GestureDetector(
      onTap: () => setState(() {
        if (group == 'role') _roleFilter = value;
        else if (group == 'sexe') _sexFilter = value;
        else _categoryFilter = value;
        _applyFilters();
      }),
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryGreen : AppColors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? AppColors.primaryGreen : AppColors.textGrey.withOpacity(0.3)),
        ),
        child: Text(label, style: TextStyle(color: selected ? AppColors.white : AppColors.textDark, fontSize: 12, fontWeight: FontWeight.w500)),
      ),
    );
  }

  void _showMemberDetail(UserModel m) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _MemberDetailSheet(membre: m),
    );
  }

  void _showAddMemberForm() {
    final formKey = GlobalKey<FormState>();
    final usernameCtrl = TextEditingController();
    final firstCtrl = TextEditingController();
    final lastCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    final professionCtrl = TextEditingController();
    final numeroCarteCtrl = TextEditingController();
    
    String selectedSexe = 'M';
    String selectedCat = 'professionnel';
    String selectedRole = 'membre';
    String? selectedCellule;
    String? selectedSang;
    String? selectedAlquran;
    String? selectedMajalis;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Nouveau Membre'),
          content: Container(
            width: double.maxFinite,
            child: SingleChildScrollView(
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Identifiants', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
                    TextFormField(controller: usernameCtrl, decoration: const InputDecoration(labelText: 'Username *')),
                    TextFormField(controller: emailCtrl, decoration: const InputDecoration(labelText: 'Email *')),
                    TextFormField(controller: passCtrl, decoration: const InputDecoration(labelText: 'Mot de passe *'), obscureText: true),
                    
                    const SizedBox(height: 16),
                    const Text('Infos Personnelles', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
                    TextFormField(controller: firstCtrl, decoration: const InputDecoration(labelText: 'Prénom *')),
                    TextFormField(controller: lastCtrl, decoration: const InputDecoration(labelText: 'Nom *')),
                    TextFormField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'Téléphone')),
                    TextFormField(controller: addressCtrl, decoration: const InputDecoration(labelText: 'Adresse')),
                    DropdownButtonFormField<String>(
                      value: selectedSexe,
                      decoration: const InputDecoration(labelText: 'Sexe'),
                      items: const [DropdownMenuItem(value: 'M', child: Text('Masculin')), DropdownMenuItem(value: 'F', child: Text('Féminin'))],
                      onChanged: (v) => setDialogState(() => selectedSexe = v!),
                    ),

                    const SizedBox(height: 16),
                    const Text('Infos Communautaires', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
                    DropdownButtonFormField<String>(
                      value: selectedRole,
                      decoration: const InputDecoration(labelText: 'Rôle'),
                      items: const [
                        DropdownMenuItem(value: 'membre', child: Text('Membre')),
                        DropdownMenuItem(value: 'jewrin', child: Text('Jewrin')),
                        DropdownMenuItem(value: 'jewrine_culturelle', child: Text('Jewrin Culturelle')),
                        DropdownMenuItem(value: 'jewrine_scientifique', child: Text('Jewrin Scientifique')),
                        DropdownMenuItem(value: 'jewrine_finance', child: Text('Jewrin Finance')),
                        DropdownMenuItem(value: 'jewrine_conservatoire', child: Text('Jewrin Conservatoire')),
                        DropdownMenuItem(value: 'jewrine_communication', child: Text('Jewrin Communication')),
                        DropdownMenuItem(value: 'jewrine_organisation', child: Text('Jewrin Organisation')),
                        DropdownMenuItem(value: 'jewrine_sociale', child: Text('Jewrin Sociale')),
                        DropdownMenuItem(value: 'admin', child: Text('Admin')),
                      ],
                      onChanged: (v) => setDialogState(() => selectedRole = v!),
                    ),
                    DropdownButtonFormField<String>(
                      value: selectedCat,
                      decoration: const InputDecoration(labelText: 'Catégorie'),
                      items: const [
                        DropdownMenuItem(value: 'eleve', child: Text('Élève')),
                        DropdownMenuItem(value: 'etudiant', child: Text('Étudiant')),
                        DropdownMenuItem(value: 'professionnel', child: Text('Professionnel')),
                      ],
                      onChanged: (v) => setDialogState(() => selectedCat = v!),
                    ),
                    DropdownButtonFormField<String>(
                      value: selectedCellule,
                      decoration: const InputDecoration(labelText: 'Cellule'),
                      items: const [
                        DropdownMenuItem(value: 'dakar', child: Text('Dakar')),
                        DropdownMenuItem(value: 'touba_mbacke', child: Text('Touba / Mbacké')),
                        DropdownMenuItem(value: 'diaspora', child: Text('Diaspora')),
                      ],
                      onChanged: (v) => setDialogState(() => selectedCellule = v),
                    ),
                    DropdownButtonFormField<String>(
                      value: selectedSang,
                      decoration: const InputDecoration(labelText: 'Groupe Sanguin'),
                      items: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                      onChanged: (v) => setDialogState(() => selectedSang = v),
                    ),
                    
                    const SizedBox(height: 16),
                    const Text('Niveaux Religieux', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
                    DropdownButtonFormField<String>(
                      value: selectedAlquran,
                      decoration: const InputDecoration(labelText: 'Niveau Al-Quran'),
                      items: ['faible', 'debutant', 'moyen', 'intermediaire', 'avance'].map((n) => DropdownMenuItem(value: n, child: Text(n.toUpperCase()))).toList(),
                      onChanged: (v) => setDialogState(() => selectedAlquran = v),
                    ),
                    DropdownButtonFormField<String>(
                      value: selectedMajalis,
                      decoration: const InputDecoration(labelText: 'Niveau Majalis'),
                      items: ['faible', 'debutant', 'moyen', 'intermediaire', 'avance'].map((n) => DropdownMenuItem(value: n, child: Text(n.toUpperCase()))).toList(),
                      onChanged: (v) => setDialogState(() => selectedMajalis = v),
                    ),
                    
                    const SizedBox(height: 16),
                    const Text('Autres', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
                    TextFormField(controller: professionCtrl, decoration: const InputDecoration(labelText: 'Profession')),
                    TextFormField(controller: numeroCarteCtrl, decoration: const InputDecoration(labelText: 'Numéro Carte')),
                  ],
                ),
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: () async {
                try {
                  final data = {
                    'username': usernameCtrl.text.trim(),
                    'email': emailCtrl.text.trim(),
                    'password': passCtrl.text,
                    'first_name': firstCtrl.text.trim(),
                    'last_name': lastCtrl.text.trim(),
                    'telephone': phoneCtrl.text.trim(),
                    'adresse': addressCtrl.text.trim(),
                    'sexe': selectedSexe,
                    'categorie': selectedCat,
                    'role': selectedRole,
                    'cellule': selectedCellule ?? '',
                    'groupe_sanguin': selectedSang ?? '',
                    'niveau_alquran': selectedAlquran ?? '',
                    'niveau_majalis': selectedMajalis ?? '',
                    'profession': professionCtrl.text.trim(),
                    'numero_carte': numeroCarteCtrl.text.trim(),
                  };
                  await _api.post(ApiEndpoints.users, data);
                  if (mounted) {
                    Navigator.pop(ctx);
                    _loadMembres();
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Membre créé avec succès')));
                  }
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
                }
              },
              child: const Text('Créer'),
            ),
          ],
        ),
      ),
    );
  }
}

class _MemberCard extends StatelessWidget {
  final UserModel membre;
  final VoidCallback onTap;
  const _MemberCard({required this.membre, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final m = membre;
    final celluleColor = m.cellule == 'dakar' ? AppColors.primaryGreen : m.cellule == 'touba_mbacke' ? AppColors.primaryGold : AppColors.info;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              SafeAvatar(
                photoUrl: m.photo,
                fallbackText: m.fullName.isNotEmpty ? m.fullName : 'M',
                radius: 26,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(m.fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text(m.email, style: const TextStyle(fontSize: 11, color: AppColors.textGrey)),
                    const SizedBox(height: 4),
                    Row(children: [
                      _badge(m.roleDisplay ?? m.role, AppColors.primaryGold),
                      if (m.cellule != null && m.cellule!.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        _badge(m.cellule!.replaceAll('_', '/'), celluleColor),
                      ],
                    ]),
                  ],
                ),
              ),
              if (m.telephone != null && m.telephone!.isNotEmpty)
                IconButton(
                  icon: const Icon(Icons.phone, color: AppColors.primaryGreen, size: 20),
                  onPressed: () => launchUrl(Uri.parse('tel:${m.telephone}')),
                ),
              if (context.read<AuthProvider>().user?.isAdmin == true)
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: AppColors.error, size: 20),
                  onPressed: () => _confirmDelete(context, m),
                ),
              const Icon(Icons.chevron_right, color: AppColors.textGrey, size: 18),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context, UserModel m) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer membre'),
        content: Text('Voulez-vous vraiment supprimer ${m.fullName} ? Cette action est irréversible.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          TextButton(
            onPressed: () async {
              try {
                await ApiService().delete('${ApiEndpoints.users}${m.id}/');
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Membre supprimé')));
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

  Widget _badge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}

class _MemberDetailSheet extends StatelessWidget {
  final UserModel membre;
  const _MemberDetailSheet({required this.membre});

  @override
  Widget build(BuildContext context) {
    final m = membre;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      builder: (_, controller) => SingleChildScrollView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.textGrey.withOpacity(0.3), borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 20),
            // Header
            Row(children: [
              SafeAvatar(
                photoUrl: m.photo,
                fallbackText: m.fullName.isNotEmpty ? m.fullName : 'M',
                radius: 36,
              ),
              const SizedBox(width: 16),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(m.fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                Text(m.roleDisplay ?? m.role, style: const TextStyle(color: AppColors.primaryGold, fontWeight: FontWeight.w600)),
                if (m.dateInscription != null)
                  Text('Membre depuis ${m.dateInscription!.year}', style: const TextStyle(color: AppColors.textGrey, fontSize: 12)),
              ])),
            ]),
            const SizedBox(height: 20),

            // Stats
            Row(children: [
              _statBox('${m.cotisationsPayees}', 'Cotisations'),
              _statBox('${m.chapitresLus}', 'Chapitres'),
              _statBox('${m.evenementsParticipes}', 'Événements'),
            ]),
            const SizedBox(height: 20),

            // Infos
            _section('Coordonnées', [
              _info(Icons.email_outlined, 'Email', m.email),
              if (m.telephone?.isNotEmpty == true) _info(Icons.phone_outlined, 'Tél.', m.telephone!),
              if (m.adresse?.isNotEmpty == true) _info(Icons.location_on_outlined, 'Adresse', m.adresse!),
            ]),
            _section('Profil', [
              if (m.sexe?.isNotEmpty == true) _info(Icons.wc_outlined, 'Sexe', m.sexe == 'M' ? 'Masculin' : 'Féminin'),
              if (m.categorie?.isNotEmpty == true) _info(Icons.category_outlined, 'Catégorie', m.categorie!),
              if (m.profession?.isNotEmpty == true) _info(Icons.work_outline, 'Profession', m.profession!),
              if (m.cellule?.isNotEmpty == true) _info(Icons.group_outlined, 'Cellule', m.cellule!.replaceAll('_', '/')),
              if (m.groupeSanguin?.isNotEmpty == true) _info(Icons.bloodtype_outlined, 'Groupe Sanguin', m.groupeSanguin!),
            ]),
            _section('Niveau Religieux', [
              if (m.niveauAlquran?.isNotEmpty == true) _progressInfo('Niveau Al-Quran', m.niveauAlquran!),
              if (m.niveauMajalis?.isNotEmpty == true) _progressInfo('Niveau Majalis', m.niveauMajalis!),
            ]),
            if (m.biographie?.isNotEmpty == true) ...[
              const Text('Biographie', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
              const SizedBox(height: 8),
              Text(m.biographie!, style: const TextStyle(color: AppColors.textDark)),
              const SizedBox(height: 16),
            ],

            // Actions
            if (m.telephone?.isNotEmpty == true)
              Row(children: [
                Expanded(child: OutlinedButton.icon(
                  icon: const Icon(Icons.phone),
                  label: const Text('Appeler'),
                  onPressed: () => launchUrl(Uri.parse('tel:${m.telephone}')),
                )),
                const SizedBox(width: 12),
                Expanded(child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                  icon: const Icon(Icons.chat, color: AppColors.white),
                  label: const Text('WhatsApp', style: TextStyle(color: AppColors.white)),
                  onPressed: () => launchUrl(Uri.parse('https://wa.me/${m.telephone}')),
                )),
              ]),
            if (context.read<AuthProvider>().user?.isAdmin == true) ...[
              const Divider(height: 32),
              const Text('Administration : Assigner un Rôle', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _roleButton(context, m, 'admin', 'Administrateur'),
                  _roleButton(context, m, 'jewrine_culturelle', 'Jewrin Culturelle'),
                  _roleButton(context, m, 'jewrine_scientifique', 'Jewrin Scientifique'),
                  _roleButton(context, m, 'jewrine_finance', 'Jewrin Finance'),
                  _roleButton(context, m, 'jewrine_conservatoire', 'Jewrin Conservatoire'),
                  _roleButton(context, m, 'jewrine_communication', 'Jewrin Communication'),
                  _roleButton(context, m, 'jewrine_organisation', 'Jewrin Organisation'),
                  _roleButton(context, m, 'jewrine_sociale', 'Jewrin Sociale'),
                  _roleButton(context, m, 'membre', 'Membre Simple'),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _roleButton(BuildContext context, UserModel m, String newRole, String label) {
    return ActionChip(
      label: Text(label, style: const TextStyle(fontSize: 11)),
      onPressed: () async {
        try {
          await ApiService().patch('${ApiEndpoints.users}${m.id}/', {'role': newRole});
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Rôle mis à jour pour ${m.fullName}')));
        } catch (e) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
        }
      },
    );
  }

  Widget _statBox(String value, String label) => Expanded(
    child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(color: AppColors.primaryGreen.withOpacity(0.08), borderRadius: BorderRadius.circular(10)),
      child: Column(children: [
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textGrey)),
      ]),
    ),
  );

  Widget _section(String title, List<Widget> children) {
    if (children.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryGreen, fontSize: 14)),
      const SizedBox(height: 8),
      ...children,
      const SizedBox(height: 16),
    ]);
  }

  Widget _info(IconData icon, String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(children: [
      Icon(icon, size: 16, color: AppColors.primaryGreen),
      const SizedBox(width: 10),
      Text('$label : ', style: const TextStyle(color: AppColors.textGrey, fontSize: 13)),
      Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
    ]),
  );

  Widget _progressInfo(String label, String niveau) {
    const niveaux = ['faible', 'debutant', 'moyen', 'intermediaire', 'avance'];
    final idx = niveaux.indexOf(niveau);
    final progress = idx == -1 ? 0.0 : (idx + 1) / niveaux.length;
    final labels = {'faible': 'Faible', 'debutant': 'Débutant', 'moyen': 'Moyen', 'intermediaire': 'Intermédiaire', 'avance': 'Avancé'};
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textGrey)),
          Text(labels[niveau] ?? niveau, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primaryGreen)),
        ]),
        const SizedBox(height: 6),
        LinearProgressIndicator(
          value: progress,
          backgroundColor: AppColors.primaryGreen.withOpacity(0.15),
          valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryGreen),
          minHeight: 6,
          borderRadius: BorderRadius.circular(3),
        ),
      ]),
    );
  }
}
