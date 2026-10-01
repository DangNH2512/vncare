import { z } from 'zod';
import { EventStatus } from './event';

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

/** Length of the rolling window behind the "new in the last N days" counters. */
export const ADMIN_OVERVIEW_WINDOW_DAYS = 7;

/**
 * Headline counters. Every field is a plain non-negative integer: an empty
 * table yields 0, never null, so the console never renders a missing figure.
 */
export const AdminOverviewKpis = z.object({
  /** Users that are neither soft-deleted nor anonymized. */
  totalUsers: z.number().int().nonnegative(),
  /** Subset of `totalUsers` created within the rolling window. */
  newUsers: z.number().int().nonnegative(),
  /** Published events whose visible occurrence starts after now. */
  upcomingEvents: z.number().int().nonnegative(),
  /** Non-cancelled RSVPs created within the rolling window. */
  rsvps: z.number().int().nonnegative(),
  /** Visible posts created within the rolling window. */
  posts: z.number().int().nonnegative(),
});
export type AdminOverviewKpisT = z.infer<typeof AdminOverviewKpis>;

/** Public profile fields only; contact data and role never travel here. */
export const AdminLatestMember = z.object({
  id: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
  trustLevel: z.number().int().min(0).max(5),
  createdAt: z.iso.datetime(),
});
export type AdminLatestMemberT = z.infer<typeof AdminLatestMember>;

/** Event summary without description or coordinates. */
export const AdminLatestEvent = z.object({
  id: z.uuid(),
  title: z.string(),
  areaId: z.uuid(),
  startsAt: z.iso.datetime(),
  status: EventStatus,
  organizer: z.object({
    handle: z.string(),
    displayName: z.string(),
  }),
});
export type AdminLatestEventT = z.infer<typeof AdminLatestEvent>;

/**
 * Platform snapshot for `GET /api/v1/admin/overview`.
 *
 * `generatedAt` and the rolling window share one database `now()`, so the
 * counters are consistent with each other. System health is not embedded;
 * clients fetch it separately so one failing source cannot blank the page.
 */
export const AdminOverviewResponse = z.object({
  windowDays: z.literal(ADMIN_OVERVIEW_WINDOW_DAYS),
  /** ISO-8601 UTC timestamp the snapshot was taken at. */
  generatedAt: z.iso.datetime(),
  kpis: AdminOverviewKpis,
  latestMembers: z.array(AdminLatestMember).max(5),
  latestEvents: z.array(AdminLatestEvent).max(5),
});
export type AdminOverviewResponseT = z.infer<typeof AdminOverviewResponse>;
