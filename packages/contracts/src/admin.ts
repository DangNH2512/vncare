import { z } from 'zod';

/**
 * Health of one backing service. Field names and values are shared verbatim
 * with `GET /api/v1/health/ready` — the admin console never renders a
 * different vocabulary for the same fact.
 */
export const AdminDependencyStatus = z.enum(['up', 'down']);
export type AdminDependencyStatusT = z.infer<typeof AdminDependencyStatus>;

/**
 * Aggregate status for the admin console.
 *
 * Unlike the public readiness probe — which the load balancer reads and
 * which answers 503 while degraded — this always resolves 200: a signed-in
 * operator needs the page to render even when a dependency is down, so the
 * state travels in `status` instead of the HTTP status code.
 */
export const AdminSystemHealthStatus = z.enum(['ok', 'degraded']);
export type AdminSystemHealthStatusT = z.infer<typeof AdminSystemHealthStatus>;

export const AdminSystemHealthResponse = z.object({
  status: AdminSystemHealthStatus,
  checks: z.object({
    database: AdminDependencyStatus,
    redisCache: AdminDependencyStatus,
    redisQueue: AdminDependencyStatus,
  }),
  /** Deployment environment name, e.g. 'development' or 'production'. */
  environment: z.string(),
  /** Seconds since the API process started. */
  uptimeSeconds: z.number().int().nonnegative(),
  /** ISO-8601 UTC timestamp this snapshot was taken at. */
  checkedAt: z.iso.datetime(),
});
export type AdminSystemHealthResponseT = z.infer<typeof AdminSystemHealthResponse>;
