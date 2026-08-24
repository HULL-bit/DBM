import 'dart:convert';
import 'package:dbm/core/constant/strings.dart';
import 'package:dbm/core/error/exceptions.dart';
import 'package:dbm/core/error/failures.dart';
import 'package:dbm/features/auth/data/data_sources/remote/user_remote_data_source.dart';
import 'package:dbm/features/auth/data/models/user/authentication_response_model.dart';
import 'package:dbm/features/auth/domain/usecases/user/sign_in_usecase.dart';
import 'package:dbm/features/auth/domain/usecases/user/sign_up_usecase.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mocktail/mocktail.dart';

import '../../../../../fixtures/fixture_reader.dart';

class MockHttpClient extends Mock implements http.Client {}

void main() {
  late UserRemoteDataSourceImpl dataSource;
  late MockHttpClient mockHttpClient;

  setUp(() {
    mockHttpClient = MockHttpClient();
    dataSource = UserRemoteDataSourceImpl(client: mockHttpClient);
  });

  group('signIn', () {
    const fakeParams = SignInParams(username: 'username', password: 'password');
    final expectedUrl = Uri.parse('$baseUrl/auth/token/');
    final expectedBody = jsonEncode({
      'username': fakeParams.username,
      'password': fakeParams.password,
    });

    test(
        'should perform a POST request to /auth/token/ with the given parameters',
        () async {
      /// Arrange
      final fakeResponse = fixture('user/authentication_response.json');
      when(() => mockHttpClient.post(
            expectedUrl,
            headers: {'Content-Type': 'application/json'},
            body: expectedBody,
          )).thenAnswer((_) async => http.Response(fakeResponse, 200));

      /// Act
      final result = await dataSource.signIn(fakeParams);

      /// Assert
      verify(() => mockHttpClient.post(
            expectedUrl,
            headers: {'Content-Type': 'application/json'},
            body: expectedBody,
          ));
      expect(result, isA<AuthenticationResponseModel>());
    });

    test('should throw a CredentialFailure on 400 or 401 status code',
        () async {
      /// Arrange
      when(() => mockHttpClient.post(
            expectedUrl,
            headers: {'Content-Type': 'application/json'},
            body: expectedBody,
          )).thenAnswer((_) async => http.Response('Error message', 400));

      /// Act
      final result = dataSource.signIn(fakeParams);

      /// Assert
      expect(result, throwsA(isA<CredentialFailure>()));
    });

    test(
        'should throw a ServerException on non-200 status code other than 400 or 401',
        () async {
      /// Arrange
      when(() => mockHttpClient.post(
            expectedUrl,
            headers: {'Content-Type': 'application/json'},
            body: expectedBody,
          )).thenAnswer((_) async => http.Response('Error message', 404));

      /// Act
      final result = dataSource.signIn(fakeParams);

      /// Assert
      expect(result, throwsA(isA<ServerException>()));
    });
  });

  group('signUp', () {
    const fakeParams = SignUpParams(
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password',
    );
    final registerUrl = Uri.parse('$baseUrl/auth/register/');
    final registerBody = jsonEncode({
      'username': fakeParams.email.split('@').first,
      'first_name': fakeParams.firstName,
      'last_name': fakeParams.lastName,
      'email': fakeParams.email,
      'password': fakeParams.password,
    });
    final tokenUrl = Uri.parse('$baseUrl/auth/token/');
    final tokenBody = jsonEncode({
      'username': fakeParams.email.split('@').first,
      'password': fakeParams.password,
    });

    test(
        'should register then auto sign-in to retrieve tokens on success',
        () async {
      /// Arrange
      final fakeResponse = fixture('user/authentication_response.json');
      when(() => mockHttpClient.post(
            registerUrl,
            headers: {'Content-Type': 'application/json'},
            body: registerBody,
          )).thenAnswer((_) async => http.Response('{}', 201));
      when(() => mockHttpClient.post(
            tokenUrl,
            headers: {'Content-Type': 'application/json'},
            body: tokenBody,
          )).thenAnswer((_) async => http.Response(fakeResponse, 200));

      /// Act
      final result = await dataSource.signUp(fakeParams);

      /// Assert
      verify(() => mockHttpClient.post(
            registerUrl,
            headers: {'Content-Type': 'application/json'},
            body: registerBody,
          ));
      verify(() => mockHttpClient.post(
            tokenUrl,
            headers: {'Content-Type': 'application/json'},
            body: tokenBody,
          ));
      expect(result, isA<AuthenticationResponseModel>());
    });

    test('should throw a CredentialFailure on 400 status code', () async {
      /// Arrange
      when(() => mockHttpClient.post(
            registerUrl,
            headers: {'Content-Type': 'application/json'},
            body: registerBody,
          )).thenAnswer((_) async => http.Response('Error message', 400));

      /// Act
      final result = dataSource.signUp(fakeParams);

      /// Assert
      expect(result, throwsA(isA<CredentialFailure>()));
    });

    test(
        'should throw a ServerException on non-201 status code other than 400',
        () async {
      /// Arrange
      when(() => mockHttpClient.post(
            registerUrl,
            headers: {'Content-Type': 'application/json'},
            body: registerBody,
          )).thenAnswer((_) async => http.Response('Error message', 500));

      /// Act
      final result = dataSource.signUp(fakeParams);

      /// Assert
      expect(result, throwsA(isA<ServerException>()));
    });
  });
}
