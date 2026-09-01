import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';

/** Injection token for the shared connection pool. */
export const PG_POOL = Symbol('PG_POOL');

/**
 * Single pool for the whole process.
 *
 * `timezone=UTC` is set on the connection as well as on the role (0003): a
 * connection opened by a tool that skips role defaults must still not reinterpret
 * a timestamptz. Statement and lock timeouts stay at the role level so every
 * client inherits them, including psql and migration runs.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: (): Pool => {
        const connectionString = process.env['DATABASE_URL'];
        if (!connectionString) {
          throw new Error('DATABASE_URL is not configured');
        }
        return new Pool({
          connectionString,
          max: Number(process.env['DATABASE_POOL_MAX'] ?? 10),
          options: '-c timezone=UTC',
        });
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
