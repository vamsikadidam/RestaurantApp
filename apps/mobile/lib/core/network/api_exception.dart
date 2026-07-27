import 'package:dio/dio.dart';

/// Normalizes every network/backend failure into one shape the UI can
/// render a friendly message for, mirroring the backend's ApiErrorResponse
/// (see packages/shared-types/src/api-contracts.ts). Screens should catch
/// this type specifically rather than raw DioException/Exception.
class ApiException implements Exception {
  final int? statusCode;
  final String errorCode;
  final String message;

  const ApiException({
    required this.errorCode,
    required this.message,
    this.statusCode,
  });

  bool get isNetworkError => statusCode == null;
  bool get isUnauthorized => statusCode == 401;
  bool get isValidationError => statusCode == 400;
  bool get isNotFound => statusCode == 404;
  bool get isServerError => statusCode != null && statusCode! >= 500;

  factory ApiException.fromDioException(DioException error) {
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      return const ApiException(
        errorCode: 'TIMEOUT',
        message:
            'The request took too long. Please check your connection and try again.',
      );
    }

    if (error.type == DioExceptionType.connectionError) {
      return const ApiException(
        errorCode: 'NETWORK_ERROR',
        message:
            'Could not reach the server. Please check your connection and try again.',
      );
    }

    final response = error.response;
    if (response == null) {
      return const ApiException(
        errorCode: 'UNKNOWN_ERROR',
        message: 'Something went wrong. Please try again.',
      );
    }

    final data = response.data;
    if (data is Map<String, dynamic>) {
      final message = data['message'];
      final errorCode = data['errorCode'];
      return ApiException(
        statusCode: response.statusCode,
        errorCode: errorCode is String ? errorCode : 'ERROR',
        message: message is String
            ? message
            : 'Something went wrong. Please try again.',
      );
    }

    return ApiException(
      statusCode: response.statusCode,
      errorCode: 'ERROR',
      message: 'Something went wrong. Please try again.',
    );
  }

  @override
  String toString() => 'ApiException($errorCode, $statusCode): $message';
}
