import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface StandardErrorBody {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

/**
 * Converts every thrown error into the standardized ApiErrorResponse shape
 * (see packages/shared-types) so the Flutter app and admin portal can rely
 * on one error contract. Never leaks stack traces, raw Prisma errors, or raw
 * upstream (Clover) error bodies to the client - see error-handling matrix
 * in the root README and SECURITY.md.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, errorCode, message, details } = this.normalize(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode} ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: StandardErrorBody = {
      statusCode,
      errorCode,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): {
    statusCode: number;
    errorCode: string;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();
      const message =
        typeof responseBody === 'string'
          ? responseBody
          : (((responseBody as Record<string, unknown>)?.message as string) ?? exception.message);
      const details =
        typeof responseBody === 'object'
          ? (responseBody as Record<string, unknown>)?.details
          : undefined;

      return {
        statusCode: status,
        errorCode: HttpStatus[status] ?? 'ERROR',
        message: Array.isArray(message) ? message.join('; ') : message,
        details,
      };
    }

    // Unknown/unexpected error (e.g. a Prisma or Clover client throwing) -
    // never expose internals to the client.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong. Please try again in a moment.',
    };
  }
}
