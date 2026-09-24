import { Global, Inject, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';

/** Injection token for the cache instance: rate limits, short-lived caches. */
export const REDIS_CACHE = Symbol('REDIS_CACHE');

/** Injection token for the queue instance: BullMQ jobs only. */
export const REDIS_QUEUE = Symbol('REDIS_QUEUE');

/** Clients being disconnected on purpose; their 'close' is not an outage. */
const closing = new WeakSet<Redis>();

/**
 * Two clients for two Redis instances, never one shared instance.
 *
 * The cache runs `allkeys-lru` and may evict any key under memory pressure; the
 * queue runs `noeviction`, because BullMQ loses jobs silently when a key it
 * owns is evicted. Pointing both at one instance hides that failure until
 * production load triggers it.
 *
 * Both clients connect lazily. The process boots, and the specs run, without
 * Redis; the first command opens the connection, and the readiness probe
 * reports the instance as down instead of the process failing to start.
 */
function createClient(url: string, name: string, options: { forQueue: boolean }): Redis {
  const client = new Redis(url, {
    connectionName: `dnc-api-${name}`,
    lazyConnect: true,
    // BullMQ requires this to be null on the connections it uses: a blocking
    // command must wait for the reconnect rather than fail after N retries.
    maxRetriesPerRequest: options.forQueue ? null : 2,
  });
  // Without an error listener ioredis prints a stack trace on every reconnect
  // attempt. Log transitions only: the connection going down, and coming back.
  // A refused connection surfaces as `error`; a server that goes away behind a
  // port proxy only as `close`, so both count.
  const logger = new Logger(`Redis:${name}`);
  let down = false;
  let wasReady = false;
  const reportDown = (reason: string): void => {
    if (!down) {
      down = true;
      logger.warn(`connection lost: ${reason}`);
    }
  };
  client.on('error', (error: Error) => reportDown(reasonOf(error)));
  client.on('close', () => {
    if (wasReady && !closing.has(client)) {
      reportDown('connection closed');
    }
  });
  client.on('ready', () => {
    wasReady = true;
    if (down) {
      down = false;
      logger.log('connection restored');
    }
  });
  return client;
}

/** Node reports a refused dual-stack connect as an AggregateError with an empty message. */
function reasonOf(error: Error): string {
  if (error.message) {
    return error.message;
  }
  const first: unknown = error instanceof AggregateError ? error.errors[0] : undefined;
  return first instanceof Error && first.message ? first.message : error.name;
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CACHE,
      useFactory: (): Redis =>
        createClient(process.env['REDIS_CACHE_URL'] ?? 'redis://localhost:6381', 'cache', {
          forQueue: false,
        }),
    },
    {
      provide: REDIS_QUEUE,
      useFactory: (): Redis =>
        createClient(process.env['REDIS_QUEUE_URL'] ?? 'redis://localhost:6380', 'queue', {
          forQueue: true,
        }),
    },
  ],
  exports: [REDIS_CACHE, REDIS_QUEUE],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(
    @Inject(REDIS_CACHE) private readonly cache: Redis,
    @Inject(REDIS_QUEUE) private readonly queue: Redis,
  ) {}

  onApplicationShutdown(): void {
    // disconnect() rather than quit(): quit() waits on a server that may be
    // unreachable, which would hang shutdown for a client that never connected.
    for (const client of [this.cache, this.queue]) {
      closing.add(client);
      client.disconnect();
    }
  }
}
