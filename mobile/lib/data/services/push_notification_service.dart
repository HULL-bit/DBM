import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/constants/api_endpoints.dart';
import 'api_service.dart';

// v2 : nouvel identifiant de canal — les propriétés d'un canal Android (son, vibration...)
// sont figées dès sa première création et ne peuvent plus être changées après coup ; un
// appareil ayant déjà l'ancien canal "dbm_notifications" (sans son explicite) resterait
// silencieux malgré cette mise à jour sans ce changement d'identifiant.
const _canalNotifications = AndroidNotificationChannel(
  'dbm_notifications_v2',
  'Notifications DBM',
  description: 'Messages, événements, LAAJ et autres notifications de la plateforme',
  importance: Importance.high,
  playSound: true,
  enableVibration: true,
);

/// Gère une notification FCM reçue pendant que l'appli est en arrière-plan ou fermée.
/// L'OS affiche déjà la notification système à partir du payload "notification" : rien à
/// faire ici (doit rester un top-level/static entry-point pour Firebase).
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {}

/// Notifications push mobiles (Firebase Cloud Messaging) : reçoit les messages, demande la
/// permission système, enregistre/désenregistre le token de l'appareil auprès du backend, et
/// affiche une notification locale quand l'appli est au premier plan (comportement natif FCM
/// par défaut : la notification n'apparaît QUE si l'appli n'est pas déjà ouverte).
/// Tolérant à l'absence de configuration Firebase (google-services.json non fourni) : toute
/// erreur d'initialisation désactive simplement les notifications push, sans jamais planter
/// le reste de l'application.
class PushNotificationService {
  static final PushNotificationService _instance = PushNotificationService._internal();
  factory PushNotificationService() => _instance;
  PushNotificationService._internal();

  final _api = ApiService();
  final _local = FlutterLocalNotificationsPlugin();
  GoRouter? _router;
  bool _disponible = false;
  bool _initialise = false;

  /// Permet de naviguer vers /notifications au tap sur une notification, même si l'appli
  /// était fermée (appelé une fois depuis main.dart dès que le GoRouter existe).
  void attacherRouter(GoRouter router) => _router = router;

  Future<void> initialiser() async {
    if (_initialise) return;
    _initialise = true;

    try {
      await Firebase.initializeApp();
    } catch (_) {
      // Pas de google-services.json / GoogleService-Info.plist : Firebase non configuré,
      // notifications push mobiles simplement indisponibles.
      return;
    }

    try {
      await _local.initialize(
        InitializationSettings(
          android: const AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: const DarwinInitializationSettings(),
        ),
        onDidReceiveNotificationResponse: (details) {
          _router?.go('/notifications');
        },
      );
      await _local
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_canalNotifications);

      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      FirebaseMessaging.onMessage.listen((message) {
        final notif = message.notification;
        if (notif == null) return;
        _local.show(
          message.hashCode,
          notif.title,
          notif.body,
          NotificationDetails(
            android: AndroidNotificationDetails(
              _canalNotifications.id, _canalNotifications.name,
              channelDescription: _canalNotifications.description,
              importance: Importance.high, priority: Priority.high,
              playSound: true, enableVibration: true,
            ),
            iOS: const DarwinNotificationDetails(presentSound: true, presentAlert: true, presentBadge: true),
          ),
        );
      });

      FirebaseMessaging.onMessageOpenedApp.listen((message) {
        _router?.go('/notifications');
      });

      _disponible = true;
    } catch (_) {
      _disponible = false;
    }
  }

  /// À appeler après une connexion réussie (ou au démarrage si une session existe déjà) :
  /// demande la permission système puis enregistre le token FCM de cet appareil.
  Future<void> enregistrerApresConnexion() async {
    if (!_disponible) return;
    try {
      final permission = await FirebaseMessaging.instance.requestPermission(
        alert: true, badge: true, sound: true,
      );
      if (permission.authorizationStatus == AuthorizationStatus.denied) return;
      if (Platform.isAndroid) {
        await Permission.notification.request();
      }

      final token = await FirebaseMessaging.instance.getToken();
      if (token == null) return;
      await _api.post(ApiEndpoints.pushFcm, {
        'token': token,
        'plateforme': Platform.isIOS ? 'ios' : 'android',
      });

      // Si le token est renouvelé par Firebase pendant que l'appli tourne (rotation
      // périodique), on le ré-enregistre pour ne pas perdre les notifications.
      FirebaseMessaging.instance.onTokenRefresh.listen((nouveauToken) {
        _api.post(ApiEndpoints.pushFcm, {
          'token': nouveauToken,
          'plateforme': Platform.isIOS ? 'ios' : 'android',
        }).catchError((_) => <String, dynamic>{});
      });
    } catch (_) {
      // Non bloquant : l'appli continue de fonctionner sans notifications push.
    }
  }

  /// À appeler à la déconnexion : désenregistre ce token pour que l'appareil arrête de
  /// recevoir des notifications pour ce compte.
  Future<void> desenregistrerADeconnexion() async {
    if (!_disponible) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null) return;
      await _api.delete(ApiEndpoints.pushFcm, {'token': token});
    } catch (_) {}
  }
}
