import 'package:dartz/dartz.dart';

import 'package:dbm/core/error/failures.dart';
import 'package:dbm/core/usecases/usecase.dart';
import '../entities/delivery_info.dart';

abstract class DeliveryInfoRepository {
  Future<Either<Failure, List<DeliveryInfo>>> getRemoteDeliveryInfo();
  Future<Either<Failure, List<DeliveryInfo>>> getLocalDeliveryInfo();
  Future<Either<Failure, DeliveryInfo>> addDeliveryInfo(DeliveryInfo param);
  Future<Either<Failure, DeliveryInfo>> editDeliveryInfo(DeliveryInfo param);
  Future<Either<Failure, DeliveryInfo>> selectDeliveryInfo(DeliveryInfo param);
  Future<Either<Failure, DeliveryInfo>> getSelectedDeliveryInfo();
  Future<Either<Failure, NoParams>> deleteLocalDeliveryInfo();
}
