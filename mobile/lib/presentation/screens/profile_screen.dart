import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/colors.dart';
import '../../data/providers/auth_provider.dart';
import '../../data/services/api_service.dart';
import '../widgets/safe_avatar.dart';
import '../widgets/app_drawer.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon Profil'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primaryGold,
          labelColor: AppColors.white,
          unselectedLabelColor: AppColors.white.withOpacity(0.6),
          tabs: const [
            Tab(icon: Icon(Icons.person_outline), text: 'Profil'),
            Tab(icon: Icon(Icons.workspace_premium_outlined), text: 'Badges'),
            Tab(icon: Icon(Icons.lock_outline), text: 'Sécurité'),
          ],
        ),
      ),
      drawer: const AppDrawer(),
      body: user == null
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _EditProfileTab(user: user, auth: auth),
                _BadgesTab(),
                _ChangePasswordTab(),
              ],
            ),
    );
  }
}

// ─── Tab 1: Modifier le profil ───────────────────────────────────────────────
class _EditProfileTab extends StatefulWidget {
  final dynamic user;
  final AuthProvider auth;
  const _EditProfileTab({required this.user, required this.auth});

  @override
  State<_EditProfileTab> createState() => _EditProfileTabState();
}

class _EditProfileTabState extends State<_EditProfileTab> {
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;
  File? _selectedImage;
  bool _uploadingPhoto = false;
  final ImagePicker _picker = ImagePicker();

  late TextEditingController _firstNameCtrl;
  late TextEditingController _lastNameCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _telephoneCtrl;
  late TextEditingController _adresseCtrl;
  late TextEditingController _professionCtrl;
  late TextEditingController _biographieCtrl;
  late TextEditingController _numeroCarteCtrl;

  String? _sexe;
  String? _categorie;
  String? _cellule;
  String? _groupeSanguin;
  String? _niveauAlquran;
  String? _niveauMajalis;

  @override
  void initState() {
    super.initState();
    final u = widget.user;
    _firstNameCtrl = TextEditingController(text: u.firstName ?? '');
    _lastNameCtrl = TextEditingController(text: u.lastName ?? '');
    _emailCtrl = TextEditingController(text: u.email);
    _telephoneCtrl = TextEditingController(text: u.telephone ?? '');
    _adresseCtrl = TextEditingController(text: u.adresse ?? '');
    _professionCtrl = TextEditingController(text: u.profession ?? '');
    _biographieCtrl = TextEditingController(text: u.biographie ?? '');
    _numeroCarteCtrl = TextEditingController(text: u.numeroCarte ?? '');
    _sexe = u.sexe?.isNotEmpty == true ? u.sexe : null;
    _categorie = u.categorie?.isNotEmpty == true ? u.categorie : 'professionnel';
    _cellule = u.cellule?.isNotEmpty == true ? u.cellule : null;
    _groupeSanguin = u.groupeSanguin?.isNotEmpty == true ? u.groupeSanguin : null;
    _niveauAlquran = u.niveauAlquran?.isNotEmpty == true ? u.niveauAlquran : null;
    _niveauMajalis = u.niveauMajalis?.isNotEmpty == true ? u.niveauMajalis : null;
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _emailCtrl.dispose();
    _telephoneCtrl.dispose();
    _adresseCtrl.dispose();
    _professionCtrl.dispose();
    _biographieCtrl.dispose();
    _numeroCarteCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final api = ApiService();
      await api.patch(ApiEndpoints.me, {
        'first_name': _firstNameCtrl.text.trim(),
        'last_name': _lastNameCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'telephone': _telephoneCtrl.text.trim(),
        'adresse': _adresseCtrl.text.trim(),
        'sexe': _sexe ?? '',
        'categorie': _categorie ?? 'professionnel',
        'cellule': _cellule ?? '',
        'groupe_sanguin': _groupeSanguin ?? '',
        'niveau_alquran': _niveauAlquran ?? '',
        'niveau_majalis': _niveauMajalis ?? '',
        'profession': _professionCtrl.text.trim(),
        'biographie': _biographieCtrl.text.trim(),
        'numero_carte': _numeroCarteCtrl.text.trim(),
      });
      await widget.auth.fetchMe();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profil mis à jour avec succès !'), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _uploadProfilePhoto() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );

      if (image == null || !mounted) return;

      setState(() {
        _selectedImage = File(image.path);
        _uploadingPhoto = true;
      });

      final api = ApiService();
      final request = http.MultipartRequest(
        'PATCH',
        Uri.parse('${ApiEndpoints.baseUrl}${ApiEndpoints.me}'),
      );

      // Add auth token
      final token = await api.getAccessToken();
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      // Add file
      request.files.add(
        await http.MultipartFile.fromPath('photo', _selectedImage!.path),
      );

      final response = await request.send();

      if (response.statusCode == 200) {
        await widget.auth.fetchMe();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Photo de profil mise à jour !'), backgroundColor: AppColors.success),
          );
        }
      } else {
        throw Exception('Échec de l\'upload: ${response.statusCode}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final u = widget.user;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Avatar
            GestureDetector(
              onTap: _uploadingPhoto ? null : _uploadProfilePhoto,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SafeAvatar(
                    photoUrl: u.photo,
                    fallbackText: u.fullName.isNotEmpty ? u.fullName : 'U',
                    radius: 50,
                  ),
                  if (_uploadingPhoto)
                    Container(
                      decoration: const BoxDecoration(
                        color: Colors.black54,
                        shape: BoxShape.circle,
                      ),
                      child: const CircularProgressIndicator(
                        color: AppColors.white,
                        strokeWidth: 3,
                      ),
                    )
                  else
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.primaryGold,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.white, width: 2),
                        ),
                        child: const Icon(Icons.camera_alt, size: 18, color: AppColors.white),
                      ),
                    ),
                ],
              ),
            ),
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Column(children: [
                  Text(u.fullName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  Text(u.roleDisplay ?? u.role, style: const TextStyle(color: AppColors.primaryGold, fontWeight: FontWeight.w600)),
                  if (u.dateInscription != null)
                    Text('Membre depuis ${u.dateInscription!.year}', style: const TextStyle(color: AppColors.textGrey, fontSize: 12)),
                ]),
              ),
            ),

            // Stats rapides
            Row(
              children: [
                _statBadge('${u.cotisationsPayees}', 'Cotisations'),
                _statBadge('${u.chapitresLus}', 'Chapitres lus'),
                _statBadge('${u.evenementsParticipes}', 'Événements'),
              ],
            ),
            const SizedBox(height: 24),

            _sectionTitle('Informations Générales'),
            Row(children: [
              Expanded(child: _field(_firstNameCtrl, 'Prénom', Icons.person_outline)),
              const SizedBox(width: 12),
              Expanded(child: _field(_lastNameCtrl, 'Nom', Icons.person_outline)),
            ]),
            const SizedBox(height: 14),
            _field(_emailCtrl, 'Email', Icons.email_outlined, keyboard: TextInputType.emailAddress),
            const SizedBox(height: 14),
            _field(_telephoneCtrl, 'Téléphone', Icons.phone_outlined, keyboard: TextInputType.phone),
            const SizedBox(height: 14),
            _field(_adresseCtrl, 'Adresse', Icons.location_on_outlined),
            const SizedBox(height: 14),
            _field(_professionCtrl, 'Profession', Icons.work_outline),
            const SizedBox(height: 14),

            _sectionTitle('Caractéristiques'),
            _dropdownField('Sexe', _sexe, Icons.wc_outlined,
              items: const [MapEntry('M', 'Masculin'), MapEntry('F', 'Féminin')],
              onChanged: (v) => setState(() => _sexe = v),
            ),
            const SizedBox(height: 14),
            _dropdownField('Catégorie', _categorie, Icons.category_outlined,
              items: const [MapEntry('eleve', 'Élève'), MapEntry('etudiant', 'Étudiant'), MapEntry('professionnel', 'Professionnel')],
              onChanged: (v) => setState(() => _categorie = v),
            ),
            const SizedBox(height: 14),
            _dropdownField('Cellule', _cellule, Icons.group_outlined,
              items: const [MapEntry('dakar', 'Dakar'), MapEntry('touba_mbacke', 'Touba / Mbacké'), MapEntry('diaspora', 'Diaspora')],
              onChanged: (v) => setState(() => _cellule = v),
            ),
            const SizedBox(height: 14),
            _dropdownField('Groupe Sanguin', _groupeSanguin, Icons.bloodtype_outlined,
              items: const [MapEntry('A+', 'A+'), MapEntry('A-', 'A-'), MapEntry('B+', 'B+'), MapEntry('B-', 'B-'), MapEntry('AB+', 'AB+'), MapEntry('AB-', 'AB-'), MapEntry('O+', 'O+'), MapEntry('O-', 'O-')],
              onChanged: (v) => setState(() => _groupeSanguin = v),
            ),
            const SizedBox(height: 24),

            _sectionTitle('Niveaux Religieux'),
            _dropdownField('Niveau Al-Quran', _niveauAlquran, Icons.menu_book_outlined,
              items: const [MapEntry('faible', 'Faible'), MapEntry('debutant', 'Débutant'), MapEntry('moyen', 'Moyen'), MapEntry('intermediaire', 'Intermédiaire'), MapEntry('avance', 'Avancé')],
              onChanged: (v) => setState(() => _niveauAlquran = v),
            ),
            const SizedBox(height: 14),
            _dropdownField('Niveau Majalis', _niveauMajalis, Icons.mosque_outlined,
              items: const [MapEntry('faible', 'Faible'), MapEntry('debutant', 'Débutant'), MapEntry('moyen', 'Moyen'), MapEntry('intermediaire', 'Intermédiaire'), MapEntry('avance', 'Avancé')],
              onChanged: (v) => setState(() => _niveauMajalis = v),
            ),
            const SizedBox(height: 24),

            _sectionTitle('Informations Financières'),
            _field(_numeroCarteCtrl, 'Numéro de Carte Membre', Icons.credit_card_outlined),
            const SizedBox(height: 24),

            _sectionTitle('Biographie'),
            TextFormField(
              controller: _biographieCtrl,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Biographie / À propos', prefixIcon: Icon(Icons.edit_note_outlined, color: AppColors.primaryGreen), alignLabelWithHint: true),
            ),
            const SizedBox(height: 24),

            // Boutons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryGreen,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: _saving
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2))
                        : const Icon(Icons.save_outlined, color: AppColors.white),
                    label: Text(_saving ? 'Sauvegarde...' : 'Enregistrer', style: const TextStyle(color: AppColors.white, fontWeight: FontWeight.bold)),
                    onPressed: _saving ? null : _save,
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.error,
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.logout, color: AppColors.white),
                  label: const Text('Quitter', style: TextStyle(color: AppColors.white)),
                  onPressed: () async {
                    await widget.auth.logout();
                    if (context.mounted) context.go('/login');
                  },
                ),
              ],
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String t) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Text(t, style: const TextStyle(color: AppColors.primaryGreen, fontWeight: FontWeight.bold, fontSize: 16)),
  );

  Widget _statBadge(String value, String label) => Expanded(
    child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.primaryGreen.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(children: [
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primaryGreen)),
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textGrey), textAlign: TextAlign.center),
      ]),
    ),
  );

  Widget _field(TextEditingController ctrl, String label, IconData icon, {TextInputType? keyboard}) {
    return TextFormField(
      controller: ctrl,
      keyboardType: keyboard,
      decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon, color: AppColors.primaryGreen)),
    );
  }

  Widget _dropdownField<T>(String label, T? value, IconData icon, {required List<MapEntry<T, String>> items, required void Function(T?) onChanged}) {
    return DropdownButtonFormField<T>(
      value: value,
      decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon, color: AppColors.primaryGreen)),
      items: items.map((e) => DropdownMenuItem<T>(value: e.key, child: Text(e.value))).toList(),
      onChanged: onChanged,
    );
  }
}

// ─── Tab 2: Changer le mot de passe ────────────────────────────────────────
class _ChangePasswordTab extends StatefulWidget {
  @override
  State<_ChangePasswordTab> createState() => _ChangePasswordTabState();
}

class _ChangePasswordTabState extends State<_ChangePasswordTab> {
  final _formKey = GlobalKey<FormState>();
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _saving = false;
  bool _obscCurrent = true;
  bool _obscNew = true;
  bool _obscConfirm = true;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final api = ApiService();
      await api.post(ApiEndpoints.changePassword, {
        'old_password': _currentCtrl.text,
        'new_password': _newCtrl.text,
        'new_password_confirm': _confirmCtrl.text,
      });
      if (mounted) {
        _currentCtrl.clear();
        _newCtrl.clear();
        _confirmCtrl.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mot de passe modifié avec succès !'), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primaryGold.withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primaryGold.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: AppColors.primaryGold),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Utilisez un mot de passe fort d\'au moins 8 caractères, avec des chiffres et caractères spéciaux.',
                      style: TextStyle(color: AppColors.primaryGold.withOpacity(0.9), fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            _passField(_currentCtrl, 'Mot de passe actuel', _obscCurrent, () => setState(() => _obscCurrent = !_obscCurrent),
              validator: (v) => v == null || v.isEmpty ? 'Requis' : null,
            ),
            const SizedBox(height: 16),
            _passField(_newCtrl, 'Nouveau mot de passe', _obscNew, () => setState(() => _obscNew = !_obscNew),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Requis';
                if (v.length < 8) return 'Minimum 8 caractères';
                return null;
              },
            ),
            const SizedBox(height: 16),
            _passField(_confirmCtrl, 'Confirmer le nouveau mot de passe', _obscConfirm, () => setState(() => _obscConfirm = !_obscConfirm),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Requis';
                if (v != _newCtrl.text) return 'Les mots de passe ne correspondent pas';
                return null;
              },
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryGreen,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: _saving
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2))
                    : const Icon(Icons.lock_reset_outlined, color: AppColors.white),
                label: Text(
                  _saving ? 'En cours...' : 'Modifier le mot de passe',
                  style: const TextStyle(color: AppColors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                onPressed: _saving ? null : _changePassword,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _passField(TextEditingController ctrl, String label, bool obscure, VoidCallback toggle, {String? Function(String?)? validator}) {
    return TextFormField(
      controller: ctrl,
      obscureText: obscure,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: const Icon(Icons.lock_outline, color: AppColors.primaryGreen),
        suffixIcon: IconButton(
          icon: Icon(obscure ? Icons.visibility_off : Icons.visibility, color: AppColors.textGrey),
          onPressed: toggle,
        ),
      ),
      validator: validator,
    );
  }
}

// ─── Tab 3: Badges ───────────────────────────────────────────────
class _BadgesTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final api = ApiService();
    return FutureBuilder<Map<String, dynamic>>(
      future: api.get(ApiEndpoints.badges),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        final list = snapshot.data?['results'] ?? snapshot.data?['data'] ?? [];
        if (list.isEmpty) return const Center(child: Text('Aucun badge obtenu pour le moment'));

        return GridView.builder(
          padding: const EdgeInsets.all(20),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 15,
            mainAxisSpacing: 20,
            childAspectRatio: 0.8,
          ),
          itemCount: list.length,
          itemBuilder: (ctx, i) {
            final b = list[i]['badge'] ?? list[i];
            return GestureDetector(
              onTap: () => _showBadgeDetail(context, b),
              child: Column(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.primaryGold.withOpacity(0.1),
                        border: Border.all(color: AppColors.primaryGold.withOpacity(0.3)),
                      ),
                      child: const Center(
                        child: Icon(Icons.workspace_premium, color: AppColors.primaryGold, size: 30),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    b['nom'] ?? 'Badge',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showBadgeDetail(BuildContext context, dynamic b) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.workspace_premium, color: AppColors.primaryGold, size: 60),
            const SizedBox(height: 16),
            Text(b['nom'] ?? 'Badge', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(b['description'] ?? '', textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textGrey)),
            const SizedBox(height: 16),
            if (b['points'] != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: AppColors.primaryGreen.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                child: Text('+${b['points']} points', style: const TextStyle(color: AppColors.primaryGreen, fontWeight: FontWeight.bold)),
              ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
