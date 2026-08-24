class CotisationModel {
  final int id;
  final String membre;
  final int membreId;
  final double montant;
  final String mois;
  final int annee;
  final String statut;
  final DateTime? datePaiement;

  CotisationModel({
    required this.id,
    required this.membre,
    required this.membreId,
    required this.montant,
    required this.mois,
    required this.annee,
    required this.statut,
    this.datePaiement,
  });

  factory CotisationModel.fromJson(Map<String, dynamic> json) {
    return CotisationModel(
      id: json['id'] ?? 0,
      membre: json['membre'] is Map
          ? json['membre']['username'] ?? ''
          : json['membre']?.toString() ?? '',
      membreId: json['membre'] is Map
          ? json['membre']['id'] ?? 0
          : json['membre_id'] ?? 0,
      montant: double.tryParse(json['montant']?.toString() ?? '0') ?? 0,
      mois: json['mois']?.toString() ?? '',
      annee: json['annee'] ?? DateTime.now().year,
      statut: json['statut'] ?? 'en_attente',
      datePaiement: json['date_paiement'] != null
          ? DateTime.tryParse(json['date_paiement'])
          : null,
    );
  }

  bool get isPaye => statut == 'paye';
}

class LeveeFondsModel {
  final int id;
  final String titre;
  final String description;
  final double objectif;
  final double montantCollecte;
  final DateTime dateDebut;
  final DateTime? dateFin;
  final String statut;

  LeveeFondsModel({
    required this.id,
    required this.titre,
    required this.description,
    required this.objectif,
    required this.montantCollecte,
    required this.dateDebut,
    this.dateFin,
    required this.statut,
  });

  factory LeveeFondsModel.fromJson(Map<String, dynamic> json) {
    return LeveeFondsModel(
      id: json['id'] ?? 0,
      titre: json['titre'] ?? '',
      description: json['description'] ?? '',
      objectif: double.tryParse(json['objectif']?.toString() ?? '0') ?? 0,
      montantCollecte:
          double.tryParse(json['montant_collecte']?.toString() ?? '0') ?? 0,
      dateDebut: DateTime.tryParse(json['date_debut'] ?? '') ?? DateTime.now(),
      dateFin: json['date_fin'] != null ? DateTime.tryParse(json['date_fin']) : null,
      statut: json['statut'] ?? 'en_cours',
    );
  }

  double get progression =>
      objectif > 0 ? (montantCollecte / objectif).clamp(0, 1) : 0;
}
