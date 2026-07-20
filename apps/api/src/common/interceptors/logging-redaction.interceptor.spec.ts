import { of, throwError } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { LoggingRedactionInterceptor } from './logging-redaction.interceptor';

function buildContext(body: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'POST', url: '/api/v1/auth/login', body }),
    }),
  } as unknown as ExecutionContext;
}

function buildHandler(result: unknown, shouldThrow = false): CallHandler {
  return {
    handle: () => (shouldThrow ? throwError(() => result) : of(result)),
  };
}

describe('LoggingRedactionInterceptor', () => {
  it('redacts sensitive fields before logging, without mutating the response', (done) => {
    const interceptor = new LoggingRedactionInterceptor();
    const logSpy = jest.spyOn((interceptor as any).logger, 'log').mockImplementation();

    const context = buildContext({
      email: 'user@example.com',
      password: 'super-secret',
      nested: { refreshToken: 'abc.def.ghi', cardNumber: '4111111111111111' },
    });

    interceptor.intercept(context, buildHandler({ ok: true })).subscribe((result) => {
      expect(result).toEqual({ ok: true });
      const loggedLine = logSpy.mock.calls[0][0] as string;
      expect(loggedLine).not.toContain('super-secret');
      expect(loggedLine).not.toContain('4111111111111111');
      expect(loggedLine).toContain('[REDACTED]');
      expect(loggedLine).toContain('user@example.com');
      done();
    });
  });

  it('logs a warning without throwing when the handler errors', (done) => {
    const interceptor = new LoggingRedactionInterceptor();
    const warnSpy = jest.spyOn((interceptor as any).logger, 'warn').mockImplementation();

    const context = buildContext({});

    interceptor.intercept(context, buildHandler(new Error('boom'), true)).subscribe({
      error: (err) => {
        expect(err.message).toBe('boom');
        expect(warnSpy).toHaveBeenCalled();
        done();
      },
    });
  });
});
