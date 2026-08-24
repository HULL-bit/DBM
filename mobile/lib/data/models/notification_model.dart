class NotificationModel {
  final int id;
  final String titre;
  final String message;
  final bool lu;
  final DateTime dateCreation;
  final String type;

  NotificationModel({
    required this.id,
    required this.titre,
    required this.message,
    required this.lu,
    required this.dateCreation,
    required this.type,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] ?? 0,
      titre: json['titre'] ?? '',
      message: json['message'] ?? '',
      lu: json['lu'] ?? false,
      dateCreation:
          DateTime.tryParse(json['date_creation'] ?? '') ?? DateTime.now(),
      type: json['type'] ?? 'info',
    );
  }
}

class MessageModel {
  final int id;
  final Map<String, dynamic> expediteur;
  final Map<String, dynamic> destinataire;
  final String contenu;
  final bool lu;
  final DateTime dateEnvoi;

  MessageModel({
    required this.id,
    required this.expediteur,
    required this.destinataire,
    required this.contenu,
    required this.lu,
    required this.dateEnvoi,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    return MessageModel(
      id: json['id'] ?? 0,
      expediteur: json['expediteur'] is Map ? json['expediteur'] : {},
      destinataire: json['destinataire'] is Map ? json['destinataire'] : {},
      contenu: json['contenu'] ?? '',
      lu: json['lu'] ?? false,
      dateEnvoi:
          DateTime.tryParse(json['date_envoi'] ?? '') ?? DateTime.now(),
    );
  }
}
