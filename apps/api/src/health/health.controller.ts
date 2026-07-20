import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { PrismaHealthIndicator } from './indicators/prisma-health.indicator';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaIndicator.check('database'),
      () => this.redisIndicator.check('redis'),
    ]);
  }

  @Public()
  @Get('live')
  live() {
    // Liveness probe: process is up and able to respond. Deliberately does
    // not touch external dependencies so it can't be taken down by a
    // temporary Postgres/Redis blip.
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
