import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api',
  baseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL,
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL ?? '30d',
}));

export const securityConfig = registerAs('security', () => ({
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
}));

export const firebaseConfig = registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Service account private keys are stored with literal \n sequences in most
  // secret managers / .env files; they must be converted back to real newlines.
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}));

export const businessDefaultsConfig = registerAs('businessDefaults', () => ({
  currency: process.env.DEFAULT_CURRENCY ?? 'USD',
  country: process.env.DEFAULT_COUNTRY ?? 'US',
  defaultPrepTimeMinutes: parseInt(process.env.DEFAULT_PREP_TIME_MINUTES ?? '25', 10),
  guestCheckoutEnabled: (process.env.GUEST_CHECKOUT_ENABLED ?? 'true') === 'true',
}));
