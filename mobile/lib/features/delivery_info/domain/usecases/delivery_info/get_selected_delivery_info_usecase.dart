import 'package:dartz/dartz.dart';

import 'package:dbm/core/error/failures.dart';
import 'package:dbm/core/usecases/usecase.dart';
import '../../entities/delivery_info.dart';
import '../../repositories/delivery_info_repository.dart';

class GetSelectedDeliveryInfoInfoUseCase
    implements UseCase<DeliveryInfo, NoParams> {
  final DeliveryInfoRepository repository;
  GetSelectedDeliveryInfoInfoUseCase(this.repository);

  @override
  Future<Either<Failure, DeliveryInfo>> call(NoParams params) async {
    return await repository.getSelectedDeliveryInfo();
  }
}
