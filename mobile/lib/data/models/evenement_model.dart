class EvenementModel {
  final int id;
  final String titre;
  final String description;
  final DateTime dateDebut;
  final DateTime? dateFin;
  final String? lieu;
  final String? image;
  final String statut;

  EvenementModel({
    required this.id,
    required this.titre,
    required this.description,
    required this.dateDebut,
    this.dateFin,
    this.lieu,
    this.image,
    this.statut = 'a_venir',
  });

  factory EvenementModel.fromJson(Map<String, dynamic> json) {
    return EvenementModel(
      id: json['id'] ?? 0,
      titre: json['titre'] ?? '',
      description: json['description'] ?? '',
      dateDebut: DateTime.tryParse(json['date_debut'] ?? '') ?? DateTime.now(),
      dateFin: json['date_fin'] != null ? DateTime.tryParse(json['date_fin']) : null,
      lieu: json['lieu'],
      image: json['image'],
      statut: json['statut'] ?? 'a_venir',
    );
  }
}

class NewsModel {
  final int id;
  final String titre;
  final String contenu;
  final DateTime datePublication;
  final String? image;
  final String? auteur;

  NewsModel({
    required this.id,
    required this.titre,
    required this.contenu,
    required this.datePublication,
    this.image,
    this.auteur,
  });

  factory NewsModel.fromJson(Map<String, dynamic> json) {
    return NewsModel(
      id: json['id'] ?? 0,
      titre: json['titre'] ?? '',
      contenu: json['contenu'] ?? '',
      datePublication: DateTime.tryParse(json['date_publication'] ?? '') ?? DateTime.now(),
      image: json['image'],
      auteur: json['auteur'] is Map ? json['auteur']['username'] : json['auteur'],
    );
  }
}
