import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';

export enum CloverEnvironment {
  Sandbox = 'sandbox',
  Production = 'production',
}

/**
 * Strongly-typed representation of every environment variable the API relies
 * on. Validated once at boot so misconfiguration fails fast instead of
 * surfacing as a confusing runtime error later (e.g. during a payment).
 */
export class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV!: string;

  @IsNumberString()
  PORT!: string;

  @IsString()
  @IsOptional()
  API_GLOBAL_PREFIX?: string;

  @IsUrl({ require_tld: false })
  APP_BASE_URL!: string;

  @IsString()
  @IsOptional()
  CORS_ALLOWED_ORIGINS?: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TOKEN_TTL?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_TOKEN_TTL?: string;

  @IsString()
  @IsNotEmpty()
  TOKEN_ENCRYPTION_KEY!: string;

  @IsIn([CloverEnvironment.Sandbox, CloverEnvironment.Production])
  CLOVER_ENVIRONMENT!: CloverEnvironment;

  @IsString()
  @IsOptional()
  CLOVER_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  CLOVER_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  CLOVER_MERCHANT_ID?: string;

  @IsString()
  @IsOptional()
  CLOVER_REDIRECT_URI?: string;

  @IsString()
  @IsOptional()
  CLOVER_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  CLOVER_ECOMMERCE_PUBLIC_KEY?: string;

  @IsString()
  @IsOptional()
  CLOVER_ECOMMERCE_PRIVATE_KEY?: string;

  @IsString()
  @IsOptional()
  CLOVER_API_BASE_URL?: string;

  @IsString()
  @IsOptional()
  FIREBASE_PROJECT_ID?: string;

  @IsString()
  @IsOptional()
  FIREBASE_CLIENT_EMAIL?: string;

  @IsString()
  @IsOptional()
  FIREBASE_PRIVATE_KEY?: string;

  @IsString()
  @IsOptional()
  DEFAULT_CURRENCY?: string;

  @IsString()
  @IsOptional()
  DEFAULT_COUNTRY?: string;

  @IsNumberString()
  @IsOptional()
  DEFAULT_PREP_TIME_MINUTES?: string;

  @IsBooleanString()
  @IsOptional()
  GUEST_CHECKOUT_ENABLED?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const formatted = errors
      .map((error) => `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  return validatedConfig;
}
