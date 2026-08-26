class ApiEndpoints {
  static const String baseUrl = 'https://dbm-8ym4.onrender.com/api';
  static const String mediaBaseUrl = 'https://dbm-8ym4.onrender.com';

  // Auth
  static const String login = '/auth/token/';
  static const String refresh = '/auth/token/refresh/';
  static const String register = '/auth/register/';
  static const String passwordForgot = '/auth/password/forgot/';
  static const String passwordReset = '/auth/password/reset/';
  static const String me = '/auth/me/';
  static const String changePassword = '/auth/me/change-password/';
  static const String users = '/auth/users/';
  static const String adminStats = '/auth/admin/statistiques/';
  static const String badges = '/auth/me/badges/';

  // Informations
  static const String evenements = '/informations/evenements/';
  static const String publications = '/informations/publications/';
  static const String news = '/informations/news/';
  static const String groupes = '/informations/groupes/';
  static const String annonces = '/informations/annonces/';
  static const String galerie = '/informations/galerie/';

  // Finance
  static const String cotisations = '/finance/cotisations/';
  static const String leveesFonds = '/finance/levees-fonds/';
  static const String transactions = '/finance/transactions/';
  static const String dons = '/finance/dons/';
  static const String depenses = '/finance/depenses/';
  static const String bilanFinancier = '/finance/bilan/';
  static const String bilanFinancierExport = '/finance/bilan/export/';

  // Culturelle
  static const String kamil = '/culturelle/kamil/';
  static const String jukkis = '/culturelle/jukkis/';
  static const String mesJukkis = '/culturelle/jukkis/mes_jukkis/';
  static const String progressions = '/culturelle/progressions/';
  static const String chapitres = '/culturelle/chapitres/';
  static const String versementsKamil = '/culturelle/versements-kamil/';
  static const String activitesReligieuses = '/culturelle/activites-religieuses/';
  static const String enseignements = '/culturelle/enseignements/';

  // Communication
  static const String messages = '/communication/messages/';
  static const String notifications = '/communication/notifications/';
  static const String forums = '/communication/forums/sujets/';
  static const String canaux = '/communication/canaux/';
  static const String messagesCanaux = '/communication/messages-canaux/';

  // Sociale
  static const String projetsSociaux = '/sociale/projets-entraide/';
  static const String actionsSociales = '/sociale/actions-sociales/';

  // Conservatoire
  static const String conservatoireDocuments = '/conservatoire/documents/';
  static const String conservatoireAudio = '/conservatoire/audio/';
  static const String conservatoireVideos = '/conservatoire/videos/';
  static const String conservatoireAlbums = '/conservatoire/albums/';
  static const String conservatoirePhotos = '/conservatoire/photos/';
  static const String kourels = '/conservatoire/kourels/';
  static const String seancesConservatoire = '/conservatoire/seances/';
  static const String presencesStats = '/conservatoire/presences/stats_membres/';
  static const String presences = '/conservatoire/presences/';

  // Bibliotheque
  static const String livres = '/bibliotheque/livres/';

  // Scientifique
  static const String cours = '/scientifique/cours/';
  static const String domaines = '/scientifique/domaines/';
  static const String inscriptions = '/scientifique/inscriptions/';
  static const String ouvragesScientifiques = '/scientifique/ouvrages/';
  static const String publicationsScientifiques = '/scientifique/publications/';

  // Organisation
  static const String reunions = '/organisation/reunions/';
  static const String pv = '/organisation/pv/';
  static const String decisions = '/organisation/decisions/';
}
