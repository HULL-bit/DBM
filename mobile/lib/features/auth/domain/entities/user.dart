import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String username;
  final String firstName;
  final String lastName;
  final String? image;
  final String email;
  final String role;

  const User({
    required this.id,
    required this.username,
    required this.firstName,
    required this.lastName,
    this.image,
    required this.email,
    required this.role,
  });

  @override
  List<Object?> get props => [
        id,
        username,
        firstName,
        lastName,
        email,
        image,
        role,
      ];
}
