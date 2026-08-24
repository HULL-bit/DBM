import 'dart:convert';

import 'user_model.dart';

AuthenticationResponseModel authenticationResponseModelFromJson(String str) =>
    AuthenticationResponseModel.fromJson(json.decode(str));

String authenticationResponseModelToJson(AuthenticationResponseModel data) =>
    json.encode(data.toJson());

class AuthenticationResponseModel {
  final String token;
  final String refreshToken;
  final UserModel user;

  const AuthenticationResponseModel({
    required this.token,
    required this.refreshToken,
    required this.user,
  });

  factory AuthenticationResponseModel.fromJson(Map<String, dynamic> json) =>
      AuthenticationResponseModel(
        token: json["access"] ?? json["token"] ?? '',
        refreshToken: json["refresh"] ?? '',
        user: UserModel.fromJson(json["user"] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() => {
        "access": token,
        "refresh": refreshToken,
        "user": user.toJson(),
      };
}
