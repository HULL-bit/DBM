import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/colors.dart';
import '../../../data/providers/auth_provider.dart';
import '../../widgets/logo_widget.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  int _step = 0;
  bool _obscure = true;
  bool _loading = false;

  // Step 1 - Identifiants
  final _usernameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  // Step 2 - Infos personnelles
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _telephoneCtrl = TextEditingController();
  final _adresseCtrl = TextEditingController();
  String? _sexe;
  String? _categorie = 'professionnel';

  // Step 3 - Infos communautaires
  String? _cellule;
  String? _groupeSanguin;
  String? _niveauAlquran;
  String? _niveauMajalis;
  final _professionCtrl = TextEditingController();
  final _numeroCarteCtrl = TextEditingController();

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _telephoneCtrl.dispose();
    _adresseCtrl.dispose();
    _professionCtrl.dispose();
    _numeroCarteCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    final auth = context.read<AuthProvider>();
    final success = await auth.register({
      'username': _usernameCtrl.text.trim(),
      'email': _emailCtrl.text.trim(),
      'password': _passwordCtrl.text,
      'first_name': _firstNameCtrl.text.trim(),
      'last_name': _lastNameCtrl.text.trim(),
      'telephone': _telephoneCtrl.text.trim(),
      'adresse': _adresseCtrl.text.trim(),
      'sexe': _sexe ?? '',
      'categorie': _categorie ?? 'professionnel',
      'cellule': _cellule ?? '',
      'groupe_sanguin': _groupeSanguin ?? '',
      'niveau_alquran': _niveauAlquran ?? '',
      'niveau_majalis': _niveauMajalis ?? '',
      'profession': _professionCtrl.text.trim(),
      'numero_carte': _numeroCarteCtrl.text.trim(),
      'role': 'membre',
    });

    if (mounted) {
      setState(() => _loading = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Inscription réussie ! Bienvenue dans la communauté.'),
            backgroundColor: AppColors.success,
          ),
        );
        context.go('/login');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(auth.error ?? "Erreur lors de l'inscription"),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundBeige,
      appBar: AppBar(
        backgroundColor: AppColors.primaryGreen,
        title: const LogoDaara(height: 32, dark: true),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.white),
          onPressed: _step > 0 ? () => setState(() => _step--) : () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              // Indicateur d'étape
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                color: AppColors.primaryGreen.withOpacity(0.06),
                child: Row(
                  children: List.generate(3, (i) {
                    final active = i == _step;
                    final done = i < _step;
                    return Expanded(
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 14,
                            backgroundColor: done || active
                                ? AppColors.primaryGreen
                                : AppColors.textGrey.withOpacity(0.3),
                            child: done
                                ? const Icon(Icons.check, color: AppColors.white, size: 14)
                                : Text('${i + 1}', style: TextStyle(
                                    color: active ? AppColors.white : AppColors.textGrey,
                                    fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                          if (i < 2)
                            Expanded(
                              child: Container(
                                height: 2,
                                color: i < _step ? AppColors.primaryGreen : AppColors.textGrey.withOpacity(0.3),
                              ),
                            ),
                        ],
                      ),
                    );
                  }),
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _step == 0 ? 'Identifiants' : _step == 1 ? 'Informations personnelles' : 'Informations communautaires',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppColors.primaryGreen, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _step == 0 ? 'Étape 1 sur 3' : _step == 1 ? 'Étape 2 sur 3' : 'Étape 3 sur 3',
                        style: const TextStyle(color: AppColors.textGrey, fontSize: 13),
                      ),
                      const SizedBox(height: 24),

                      if (_step == 0) ..._buildStep1(),
                      if (_step == 1) ..._buildStep2(),
                      if (_step == 2) ..._buildStep3(),

                      const SizedBox(height: 28),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: _loading ? null : () {
                            if (!_formKey.currentState!.validate()) return;
                            if (_step < 2) {
                              setState(() => _step++);
                            } else {
                              _register();
                            }
                          },
                          child: _loading
                              ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white))
                              : Text(_step < 2 ? 'Suivant →' : "S'inscrire", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                        ),
                      ),
                      if (_step == 0) ...[
                        const SizedBox(height: 16),
                        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                          Text('Déjà un compte ? ', style: Theme.of(context).textTheme.bodyMedium),
                          GestureDetector(
                            onTap: () => context.pop(),
                            child: const Text('Se connecter', style: TextStyle(color: AppColors.primaryGreen, fontWeight: FontWeight.w600)),
                          ),
                        ]),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildStep1() => [
    Row(children: [
      Expanded(child: TextFormField(
        controller: _firstNameCtrl,
        decoration: const InputDecoration(labelText: 'Prénom *'),
        validator: (v) => v == null || v.isEmpty ? 'Requis' : null,
        textInputAction: TextInputAction.next,
      )),
      const SizedBox(width: 12),
      Expanded(child: TextFormField(
        controller: _lastNameCtrl,
        decoration: const InputDecoration(labelText: 'Nom *'),
        validator: (v) => v == null || v.isEmpty ? 'Requis' : null,
        textInputAction: TextInputAction.next,
      )),
    ]),
    const SizedBox(height: 16),
    TextFormField(
      controller: _usernameCtrl,
      decoration: const InputDecoration(labelText: "Nom d'utilisateur *", prefixIcon: Icon(Icons.person_outline, color: AppColors.primaryGreen)),
      validator: (v) => v == null || v.isEmpty ? 'Champ requis' : null,
      textInputAction: TextInputAction.next,
    ),
    const SizedBox(height: 16),
    TextFormField(
      controller: _emailCtrl,
      keyboardType: TextInputType.emailAddress,
      decoration: const InputDecoration(labelText: 'Email *', prefixIcon: Icon(Icons.email_outlined, color: AppColors.primaryGreen)),
      validator: (v) {
        if (v == null || v.isEmpty) return 'Champ requis';
        if (!v.contains('@')) return 'Email invalide';
        return null;
      },
      textInputAction: TextInputAction.next,
    ),
    const SizedBox(height: 16),
    TextFormField(
      controller: _passwordCtrl,
      obscureText: _obscure,
      decoration: InputDecoration(
        labelText: 'Mot de passe *',
        prefixIcon: const Icon(Icons.lock_outline, color: AppColors.primaryGreen),
        suffixIcon: IconButton(
          icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility, color: AppColors.textGrey),
          onPressed: () => setState(() => _obscure = !_obscure),
        ),
      ),
      validator: (v) {
        if (v == null || v.isEmpty) return 'Champ requis';
        if (v.length < 8) return 'Minimum 8 caractères';
        return null;
      },
    ),
  ];

  List<Widget> _buildStep2() => [
    TextFormField(
      controller: _telephoneCtrl,
      keyboardType: TextInputType.phone,
      decoration: const InputDecoration(labelText: 'Téléphone', prefixIcon: Icon(Icons.phone_outlined, color: AppColors.primaryGreen)),
      textInputAction: TextInputAction.next,
    ),
    const SizedBox(height: 16),
    TextFormField(
      controller: _adresseCtrl,
      decoration: const InputDecoration(labelText: 'Adresse', prefixIcon: Icon(Icons.location_on_outlined, color: AppColors.primaryGreen)),
      textInputAction: TextInputAction.next,
    ),
    const SizedBox(height: 16),
    _buildDropdown<String>(
      label: 'Sexe',
      value: _sexe,
      items: const [MapEntry('M', 'Masculin'), MapEntry('F', 'Féminin')],
      onChanged: (v) => setState(() => _sexe = v),
      icon: Icons.person_outline,
    ),
    const SizedBox(height: 16),
    _buildDropdown<String>(
      label: 'Catégorie',
      value: _categorie,
      items: const [MapEntry('eleve', 'Élève'), MapEntry('etudiant', 'Étudiant'), MapEntry('professionnel', 'Professionnel')],
      onChanged: (v) => setState(() => _categorie = v),
      icon: Icons.category_outlined,
    ),
    const SizedBox(height: 16),
    TextFormField(
      controller: _professionCtrl,
      decoration: const InputDecoration(labelText: 'Profession', prefixIcon: Icon(Icons.work_outline, color: AppColors.primaryGreen)),
      textInputAction: TextInputAction.next,
    ),
  ];

  List<Widget> _buildStep3() => [
    _buildDropdown<String>(
      label: 'Cellule',
      value: _cellule,
      items: const [MapEntry('dakar', 'Dakar'), MapEntry('touba_mbacke', 'Touba / Mbacké'), MapEntry('diaspora', 'Diaspora')],
      onChanged: (v) => setState(() => _cellule = v),
      icon: Icons.group_outlined,
    ),
    const SizedBox(height: 16),
    _buildDropdown<String>(
      label: 'Groupe Sanguin',
      value: _groupeSanguin,
      items: const [MapEntry('A+', 'A+'), MapEntry('A-', 'A-'), MapEntry('B+', 'B+'), MapEntry('B-', 'B-'), MapEntry('AB+', 'AB+'), MapEntry('AB-', 'AB-'), MapEntry('O+', 'O+'), MapEntry('O-', 'O-')],
      onChanged: (v) => setState(() => _groupeSanguin = v),
      icon: Icons.bloodtype_outlined,
    ),
    const SizedBox(height: 16),
    _buildDropdown<String>(
      label: 'Niveau Al-Quran',
      value: _niveauAlquran,
      items: const [MapEntry('faible', 'Faible'), MapEntry('debutant', 'Débutant'), MapEntry('moyen', 'Moyen'), MapEntry('intermediaire', 'Intermédiaire'), MapEntry('avance', 'Avancé')],
      onChanged: (v) => setState(() => _niveauAlquran = v),
      icon: Icons.menu_book_outlined,
    ),
    const SizedBox(height: 16),
    _buildDropdown<String>(
      label: 'Niveau Majalis',
      value: _niveauMajalis,
      items: const [MapEntry('faible', 'Faible'), MapEntry('debutant', 'Débutant'), MapEntry('moyen', 'Moyen'), MapEntry('intermediaire', 'Intermédiaire'), MapEntry('avance', 'Avancé')],
      onChanged: (v) => setState(() => _niveauMajalis = v),
      icon: Icons.mosque_outlined,
    ),
    const SizedBox(height: 16),
    const SizedBox(height: 16),
    TextFormField(
      controller: _numeroCarteCtrl,
      decoration: const InputDecoration(labelText: 'Numéro de Carte', prefixIcon: Icon(Icons.credit_card_outlined, color: AppColors.primaryGreen)),
      textInputAction: TextInputAction.done,
    ),
  ];

  Widget _buildDropdown<T>({
    required String label,
    required T? value,
    required List<MapEntry<T, String>> items,
    required void Function(T?) onChanged,
    required IconData icon,
  }) {
    return DropdownButtonFormField<T>(
      value: value,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: AppColors.primaryGreen),
      ),
      items: items.map((e) => DropdownMenuItem<T>(value: e.key, child: Text(e.value))).toList(),
      onChanged: onChanged,
    );
  }
}
