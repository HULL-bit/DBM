import 'dart:convert';

import 'package:dbm/features/auth/domain/entities/user.dart';

UserModel userModelFromJson(String str) => UserModel.fromJson(json.decode(str));

String userModelToJson(UserModel data) => json.encode(data.toJson());

class UserModel extends User {
  const UserModel({
    required super.id,
    required super.firstName,
    required super.lastName,
    required super.email,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
    id: (json["id"] ?? json["_id"] ?? '').toString(),
    firstName: json["first_name"] ?? json["firstName"] ?? '',
    lastName: json["last_name"] ?? json["lastName"] ?? '',
    email: json["email"] ?? '',
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "first_name": firstName,
    "last_name": lastName,
    "email": email,
  };
}
