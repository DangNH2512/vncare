import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module.js';
import { REDIS_CACHE, REDIS_QUEUE } from '../../redis/redis.module.js';

/** The backing services the API cannot serve traffic without. */
export type Dependency = 'database' | 'redisCache' | 'redisQueue';

/** Round-trips to each backing service. Each call rejects when the service is unreachable. */
@Injectable()
export class HealthRepository {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS_CACHE) private readonly cache: Redis,
    @Inject(REDIS_QUEUE) private readonly queue: Redis,
  ) {}

  async ping(dependency: Dependency): Promise<void> {
    switch (dependency) {
      case 'database':
        await this.pool.query('SELECT 1');
        return;
      case 'redisCache':
        await this.cache.ping();
        return;
      case 'redisQueue':
        await this.queue.ping();
        return;
    }
  }
}
