import 'package:dartz/dartz.dart';

import 'package:dbm/core/error/failures.dart';
import 'package:dbm/core/usecases/usecase.dart';
import '../../entities/cart/cart_item.dart';
import '../../repositories/cart_repository.dart';

class GetLocalCartItemsUseCase implements UseCase<List<CartItem>, NoParams> {
  final CartRepository repository;
  GetLocalCartItemsUseCase(this.repository);

  @override
  Future<Either<Failure, List<CartItem>>> call(NoParams params) async {
    return await repository.getLocalCartItems();
  }
}
