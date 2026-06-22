import 'dart:convert';

import 'package:dbm/core/error/failures.dart';
import 'package:http/http.dart' as http;

import 'package:dbm/core/error/exceptions.dart';
import 'package:dbm/core/constant/strings.dart';
import '../../../domain/usecases/user/sign_in_usecase.dart';
import '../../../domain/usecases/user/sign_up_usecase.dart';
import '../../models/user/authentication_response_model.dart';

abstract class UserRemoteDataSource {
  Future<AuthenticationResponseModel> signIn(SignInParams params);
  Future<AuthenticationResponseModel> signUp(SignUpParams params);
}

class UserRemoteDataSourceImpl implements UserRemoteDataSource {
  final http.Client client;
  UserRemoteDataSourceImpl({required this.client});

  @override
  Future<AuthenticationResponseModel> signIn(SignInParams params) async {
    final response = await client.post(
      Uri.parse('$baseUrl/auth/token/'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'username': params.username,
        'password': params.password,
      }),
    );
    if (response.statusCode == 200) {
      return authenticationResponseModelFromJson(response.body);
    } else if (response.statusCode == 400 || response.statusCode == 401) {
      throw CredentialFailure();
    } else {
      throw ServerException();
    }
  }

  @override
  Future<AuthenticationResponseModel> signUp(SignUpParams params) async {
    final registerResponse = await client.post(
      Uri.parse('$baseUrl/auth/register/'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'username': params.email.split('@').first,
        'first_name': params.firstName,
        'last_name': params.lastName,
        'email': params.email,
        'password': params.password,
      }),
    );
    if (registerResponse.statusCode == 201) {
      // Auto-login pour récupérer les tokens après inscription
      final tokenResponse = await client.post(
        Uri.parse('$baseUrl/auth/token/'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'username': params.email.split('@').first,
          'password': params.password,
        }),
      );
      if (tokenResponse.statusCode == 200) {
        return authenticationResponseModelFromJson(tokenResponse.body);
      }
      throw ServerException();
    } else if (registerResponse.statusCode == 400) {
      throw CredentialFailure();
    } else {
      throw ServerException();
    }
  }
}
