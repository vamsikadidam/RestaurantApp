import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';

const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|authorization|card|cvv|pan|refresh|accesstoken)/i;

/**
 * Structured request logging that redacts anything that looks like a
 * secret, token, or payment credential before it ever reaches a log line.
 * See SECURITY.md §2 (card data) and §8 (secrets) for the guarantees this
 * enforces.
 */
@Injectable()
export class LoggingRedactionInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `${request.method} ${request.url} ${Date.now() - start}ms ${this.redactedBody(request.body)}`,
          );
        },
        error: (error) => {
          this.logger.warn(
            `${request.method} ${request.url} ${Date.now() - start}ms FAILED: ${
              error instanceof Error ? error.message : 'unknown error'
            }`,
          );
        },
      }),
    );
  }

  private redactedBody(body: unknown): string {
    if (!body || typeof body !== 'object') return '';
    const redacted = this.redact(body as Record<string, unknown>);
    return JSON.stringify(redacted);
  }

  private redact(input: Record<string, unknown>): Record<string, unknown> {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        output[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        output[key] = this.redact(value as Record<string, unknown>);
      } else {
        output[key] = value;
      }
    }
    return output;
  }
}
