import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicatorResult, HealthIndicator } from '@nestjs/terminus';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redisService.getClient().ping();
      const isHealthy = pong === 'PONG';
      if (!isHealthy) {
        throw new Error(`Unexpected Redis ping response: ${pong}`);
      }
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
