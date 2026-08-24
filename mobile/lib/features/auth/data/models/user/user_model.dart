import 'dart:convert';

import 'package:dbm/features/auth/domain/entities/user.dart';

UserModel userModelFromJson(String str) => UserModel.fromJson(json.decode(str));

String userModelToJson(UserModel data) => json.encode(data.toJson());

class UserModel extends User {
  const UserModel({
    required super.id,
    required super.username,
    required super.firstName,
    required super.lastName,
    super.image,
    required super.email,
    required super.role,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
    id: (json["id"] ?? json["_id"] ?? '').toString(),
    username: json["username"] ?? '',
    firstName: json["first_name"] ?? json["firstName"] ?? '',
    lastName: json["last_name"] ?? json["lastName"] ?? '',
    image: json["photo"] ?? json["image"],
    email: json["email"] ?? '',
    role: json["role"] ?? 'membre',
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "username": username,
    "first_name": firstName,
    "last_name": lastName,
    "photo": image,
    "email": email,
    "role": role,
  };
}
