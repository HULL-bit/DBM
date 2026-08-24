import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../../core/constants/api_endpoints.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  AuthStatus _status = AuthStatus.unknown;
  UserModel? _user;
  String? _error;

  AuthStatus get status => _status;
  UserModel? get user => _user;
  String? get error => _error;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  bool get isLoading => _status == AuthStatus.unknown;

  Future<void> checkAuth() async {
    final token = await _api.getAccessToken();
    if (token == null) {
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }
    try {
      final data = await _api.get(ApiEndpoints.me);
      _user = UserModel.fromJson(data);
      _status = AuthStatus.authenticated;
    } catch (e) {
      _status = AuthStatus.unauthenticated;
      await _api.clearTokens();
    }
    notifyListeners();
  }

  Future<bool> login(String username, String password) async {
    _error = null;
    try {
      final data = await _api.post(
        ApiEndpoints.login,
        {'username': username, 'password': password},
        auth: false,
      );
      if (data['access'] == null || data['refresh'] == null) {
        _error = 'Réponse invalide du serveur. Réessayez.';
        notifyListeners();
        return false;
      }
      await _api.saveTokens(data['access'], data['refresh']);
      if (data['user'] != null) {
        _user = UserModel.fromJson(data['user']);
      } else {
        final userData = await _api.get(ApiEndpoints.me);
        _user = UserModel.fromJson(userData);
      }
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      // Erreur retournée par le serveur (401, 400, etc.)
      if (e.statusCode == 401 || e.statusCode == 400) {
        _error = 'Identifiants incorrects. Vérifiez votre nom d\'utilisateur et mot de passe.';
      } else {
        _error = e.message;
      }
      notifyListeners();
      return false;
    } catch (e) {
      // Erreur réseau (pas de connexion, timeout, etc.)
      final errStr = e.toString().toLowerCase();
      if (errStr.contains('socket') || errStr.contains('connection') || errStr.contains('network')) {
        _error = 'Pas de connexion réseau. Vérifiez votre connexion internet.';
      } else if (errStr.contains('timeout')) {
        _error = 'Le serveur met trop de temps à répondre. Réessayez dans quelques secondes.';
      } else {
        _error = 'Erreur de connexion. Vérifiez votre réseau et réessayez.';
      }
      notifyListeners();
      return false;
    }
  }

  Future<bool> register(Map<String, dynamic> data) async {
    _error = null;
    try {
      await _api.post(ApiEndpoints.register, data, auth: false);
      return true;
    } catch (e) {
      _error = e is ApiException ? e.message : 'Erreur lors de l\'inscription';
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _api.clearTokens();
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<bool> updateProfile(Map<String, dynamic> data) async {
    _error = null;
    try {
      final updated = await _api.patch(ApiEndpoints.me, data);
      _user = UserModel.fromJson(updated);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e is ApiException ? e.message : 'Erreur de mise à jour';
      notifyListeners();
      return false;
    }
  }

  Future<void> fetchMe() async {
    try {
      final data = await _api.get(ApiEndpoints.me);
      _user = UserModel.fromJson(data);
      notifyListeners();
    } catch (_) {}
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
