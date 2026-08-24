import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/constants/api_endpoints.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final _storage = const FlutterSecureStorage();

  Future<String?> getAccessToken() async {
    try {
      return await _storage.read(key: 'access_token');
    } catch (_) {
      return null;
    }
  }

  Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: 'refresh_token');
    } catch (_) {
      return null;
    }
  }

  Future<void> saveTokens(String access, String refresh) async {
    try {
      await _storage.write(key: 'access_token', value: access);
      await _storage.write(key: 'refresh_token', value: refresh);
    } catch (_) {}
  }

  Future<void> clearTokens() async {
    try {
      await _storage.delete(key: 'access_token');
      await _storage.delete(key: 'refresh_token');
    } catch (_) {}
  }

  Future<Map<String, String>> _getHeaders({bool auth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (auth) {
      final token = await getAccessToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  Future<http.Response> _handleResponse(
    Future<http.Response> Function() request, {
    bool retry = true,
  }) async {
    var response = await request();

    if (response.statusCode == 401 && retry) {
      final refreshed = await _refreshToken();
      if (refreshed) {
        return await _handleResponse(request, retry: false);
      }
    }

    return response;
  }

  Future<bool> _refreshToken() async {
    final refreshToken = await getRefreshToken();
    if (refreshToken == null) return false;

    try {
      final response = await http.post(
        Uri.parse('${ApiEndpoints.baseUrl}${ApiEndpoints.refresh}'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await _storage.write(key: 'access_token', value: data['access']);
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<Map<String, dynamic>> get(String endpoint) async {
    final headers = await _getHeaders();
    final response = await _handleResponse(
      () => http.get(
        Uri.parse('${ApiEndpoints.baseUrl}$endpoint'),
        headers: headers,
      ),
    );
    return _parseResponse(response);
  }

  Future<Map<String, dynamic>> post(
    String endpoint,
    Map<String, dynamic> body, {
    bool auth = true,
  }) async {
    final headers = await _getHeaders(auth: auth);
    final response = await _handleResponse(
      () => http.post(
        Uri.parse('${ApiEndpoints.baseUrl}$endpoint'),
        headers: headers,
        body: jsonEncode(body),
      ),
      retry: auth,
    );
    return _parseResponse(response);
  }

  Future<Map<String, dynamic>> patch(
    String endpoint,
    Map<String, dynamic> body,
  ) async {
    final headers = await _getHeaders();
    final response = await _handleResponse(
      () => http.patch(
        Uri.parse('${ApiEndpoints.baseUrl}$endpoint'),
        headers: headers,
        body: jsonEncode(body),
      ),
    );
    return _parseResponse(response);
  }

  Future<Map<String, dynamic>> delete(String endpoint) async {
    final headers = await _getHeaders();
    final response = await _handleResponse(
      () => http.delete(
        Uri.parse('${ApiEndpoints.baseUrl}$endpoint'),
        headers: headers,
      ),
    );
    return _parseResponse(response);
  }

  Map<String, dynamic> _parseResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {'success': true};
      try {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        if (decoded is List) {
          return {'results': decoded, 'count': decoded.length};
        }
        if (decoded is Map<String, dynamic>) {
          return decoded;
        }
        return {'data': decoded};
      } catch (e) {
        return {'success': true, 'message': 'Parsed as non-json', 'raw': response.body};
      }
    } else {
      Map<String, dynamic> errorBody = {};
      try {
        errorBody = jsonDecode(utf8.decode(response.bodyBytes));
      } catch (_) {
        errorBody = {'message': 'Erreur serveur (${response.statusCode})'};
      }
      throw ApiException(
        statusCode: response.statusCode,
        message: errorBody['detail'] ?? errorBody['message'] ?? 'Erreur serveur',
        errors: errorBody,
      );
    }
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final Map<String, dynamic> errors;

  ApiException({
    required this.statusCode,
    required this.message,
    this.errors = const {},
  });

  @override
  String toString() => 'ApiException($statusCode): $message';
}
