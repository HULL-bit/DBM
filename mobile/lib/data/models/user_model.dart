class UserModel {
  final int id;
  final String username;
  final String email;
  final String role;
  final String? roleDisplay;
  final String? firstName;
  final String? lastName;
  final String? photo;
  final String? telephone;
  final String? adresse;
  final String? sexe;
  final String? profession;
  final String? categorie;
  final String? cellule;
  final String? groupeSanguin;
  final String? niveauAlquran;
  final String? niveauMajalis;
  final String? specialite;
  final String? biographie;
  final String? numeroWave;
  final String? numeroCarte;
  final bool isActive;
  final int cotisationsPayees;
  final int chapitresLus;
  final int evenementsParticipes;
  final DateTime? dateInscription;

  UserModel({
    required this.id,
    required this.username,
    required this.email,
    required this.role,
    this.roleDisplay,
    this.firstName,
    this.lastName,
    this.photo,
    this.telephone,
    this.adresse,
    this.sexe,
    this.profession,
    this.categorie,
    this.cellule,
    this.groupeSanguin,
    this.niveauAlquran,
    this.niveauMajalis,
    this.specialite,
    this.biographie,
    this.numeroWave,
    this.numeroCarte,
    this.isActive = true,
    this.cotisationsPayees = 0,
    this.chapitresLus = 0,
    this.evenementsParticipes = 0,
    this.dateInscription,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? 0,
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'membre',
      roleDisplay: json['role_display'],
      firstName: json['first_name'],
      lastName: json['last_name'],
      photo: json['photo'],
      telephone: json['telephone'],
      adresse: json['adresse'],
      sexe: json['sexe'],
      profession: json['profession'],
      categorie: json['categorie'],
      cellule: json['cellule'],
      groupeSanguin: json['groupe_sanguin'],
      niveauAlquran: json['niveau_alquran'],
      niveauMajalis: json['niveau_majalis'],
      specialite: json['specialite'],
      biographie: json['biographie'],
      numeroWave: json['numero_wave'],
      numeroCarte: json['numero_carte'],
      isActive: json['est_actif'] ?? json['is_active'] ?? true,
      cotisationsPayees: json['cotisations_payees'] ?? 0,
      chapitresLus: json['chapitres_lus'] ?? 0,
      evenementsParticipes: json['evenements_participes'] ?? 0,
      dateInscription: json['date_inscription'] != null
          ? DateTime.tryParse(json['date_inscription'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'first_name': firstName ?? '',
      'last_name': lastName ?? '',
      'email': email,
      'telephone': telephone ?? '',
      'adresse': adresse ?? '',
      'sexe': sexe ?? '',
      'profession': profession ?? '',
      'categorie': categorie ?? 'professionnel',
      'cellule': cellule ?? '',
      'groupe_sanguin': groupeSanguin ?? '',
      'niveau_alquran': niveauAlquran ?? '',
      'niveau_majalis': niveauMajalis ?? '',
      'specialite': specialite ?? '',
      'biographie': biographie ?? '',
      'numero_wave': numeroWave ?? '',
      'numero_carte': numeroCarte ?? '',
    };
  }

  String get fullName {
    if (firstName != null && lastName != null) {
      return '$firstName $lastName'.trim();
    }
    if (firstName != null && firstName!.isNotEmpty) return firstName!;
    if (lastName != null && lastName!.isNotEmpty) return lastName!;
    return username;
  }

  bool get isAdmin => role == 'admin';
  bool get isMembre => role == 'membre';
  bool get isJewrinGeneral => role == 'jewrin';
  bool get isJewrin => role == 'jewrin' || role.startsWith('jewrine_');
  
  /// true si admin global OU jewrin général OU jewrin spécialisé pour ce module
  bool _hasAccess(String spec) => role == spec || isAdmin || isJewrinGeneral;

  // Rôles spécialisés (admin + jewrin général + jewrine_xxx)
  bool get isJewrinFinance => _hasAccess('jewrine_finance');
  bool get isJewrinScientifique => _hasAccess('jewrine_scientifique');
  bool get isJewrinConservatoire => _hasAccess('jewrine_conservatoire');
  bool get isJewrinCulturelle => _hasAccess('jewrine_culturelle');
  bool get isJewrinSociale => _hasAccess('jewrine_sociale');
  bool get isJewrinCommunication => _hasAccess('jewrine_communication');
  bool get isJewrinOrganisation => _hasAccess('jewrine_organisation');
}

class AuthResponse {
  final String access;
  final String refresh;
  final UserModel user;

  AuthResponse({
    required this.access,
    required this.refresh,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      access: json['access'] ?? '',
      refresh: json['refresh'] ?? '',
      user: UserModel.fromJson(json['user'] ?? {}),
    );
  }
}
