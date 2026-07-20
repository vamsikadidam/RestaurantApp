import { validateEnv } from './env.validation';

const baseValidEnv = {
  NODE_ENV: 'test',
  PORT: '3000',
  APP_BASE_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  TOKEN_ENCRYPTION_KEY: 'c'.repeat(32),
  CLOVER_ENVIRONMENT: 'sandbox',
};

describe('validateEnv', () => {
  it('passes for a valid minimal configuration', () => {
    expect(() => validateEnv({ ...baseValidEnv })).not.toThrow();
  });

  it('throws when a required variable is missing', () => {
    const withoutDatabaseUrl: Record<string, string> = { ...baseValidEnv };
    delete withoutDatabaseUrl.DATABASE_URL;
    expect(() => validateEnv(withoutDatabaseUrl)).toThrow(/DATABASE_URL/);
  });

  it('throws when CLOVER_ENVIRONMENT is not sandbox or production', () => {
    expect(() => validateEnv({ ...baseValidEnv, CLOVER_ENVIRONMENT: 'staging' })).toThrow(
      /CLOVER_ENVIRONMENT/,
    );
  });

  it('throws when NODE_ENV is invalid', () => {
    expect(() => validateEnv({ ...baseValidEnv, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
