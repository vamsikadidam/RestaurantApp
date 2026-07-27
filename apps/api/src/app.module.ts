import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  appConfig,
  businessDefaultsConfig,
  databaseConfig,
  firebaseConfig,
  jwtConfig,
  redisConfig,
  securityConfig,
} from './config/configuration';
import cloverConfig from './config/clover.config';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { CryptoModule } from './crypto/crypto.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { MenuModule } from './menu/menu.module';
import { CloverModule } from './clover/clover.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { RefundsModule } from './refunds/refunds.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ReportsModule } from './reports/reports.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingRedactionInterceptor } from './common/interceptors/logging-redaction.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        jwtConfig,
        securityConfig,
        cloverConfig,
        firebaseConfig,
        businessDefaultsConfig,
      ],
    }),
    ThrottlerModule.forRoot([
      {
        // Conservative global default; individual auth endpoints set tighter
        // limits via @Throttle() (see AuthController).
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    RedisModule,
    CryptoModule,
    HealthModule,
    AuthModule,
    RestaurantsModule,
    MenuModule,
    CloverModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    RefundsModule,
    NotificationsModule,
    WebhooksModule,
    ReportsModule,
  ],
  providers: [
    // Order matters: JwtAuthGuard populates request.user before RolesGuard
    // (applied per-route via @UseGuards) can read it. ThrottlerGuard applies
    // the global rate limit to every route.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingRedactionInterceptor },
  ],
})
export class AppModule {}
