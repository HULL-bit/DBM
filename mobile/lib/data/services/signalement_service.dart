import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../../core/constants/api_endpoints.dart';
import 'api_service.dart';

/// Remontée automatique des plantages de l'appli vers le serveur (journal « Incidents
/// techniques » + email d'alerte à l'administrateur). Ne doit jamais faire planter
/// l'appli elle-même : toute erreur ici est ignorée.
class SignalementService {
  SignalementService._();

  static const _version = '1.0.0+2';
  static const _intervalle = Duration(minutes: 5);
  static final Map<String, DateTime> _dejaSignalees = {};

  static Future<void> signaler(Object erreur, StackTrace? stack, {String contexte = '', bool critique = false}) async {
    try {
      if (kDebugMode) return; // en développement, les erreurs s'affichent déjà dans la console
      final message = erreur.toString();
      final texte = message.length > 500 ? message.substring(0, 500) : message;
      final maintenant = DateTime.now();
      final derniere = _dejaSignalees[texte];
      if (derniere != null && maintenant.difference(derniere) < _intervalle) return;
      _dejaSignalees[texte] = maintenant;

      final headers = {'Content-Type': 'application/json'};
      final token = await ApiService().getAccessToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
      await http
          .post(
            Uri.parse('${ApiEndpoints.baseUrl}/monitoring/erreur-client/'),
            headers: headers,
            body: jsonEncode({
              'source': 'mobile',
              'niveau': critique ? 'critique' : 'erreur',
              'message': texte,
              'stack': (stack ?? StackTrace.empty).toString(),
              'page': contexte,
              'version': _version,
              'contexte': {'plateforme': defaultTargetPlatform.name},
            }),
          )
          .timeout(const Duration(seconds: 15));
    } catch (_) {}
  }
}
