import { z } from 'zod';
import { cursorPage } from './common';
import { UserRole, UserStatus } from './auth';
import { EventStatus } from './event';
import { SEAT_OCCUPYING, type RsvpStatusT } from './rsvp';
import { AdminSortDirection, hasNoControlChars, queryInstant } from './admin-users';

export const ADMIN_EVENT_LIST_DEFAULT_LIMIT = 25;
export const ADMIN_EVENT_LIST_MAX_LIMIT = 100;

const csv = (value: unknown) =>
  typeof value === 'string' ? value.split(',').map((part) => part.trim()).filter(Boolean) : value;

/** True when instant `a` is strictly earlier than `b` (compares time, not text). */
const before = (a: string, b: string) => Date.parse(a) < Date.parse(b);

export const AdminEventSort = z.enum(['startsAt', 'createdAt', 'title']);
export type AdminEventSortT = z.infer<typeof AdminEventSort>;

export const AdminEventTiming = z.enum(['all', 'upcoming', 'past']);
export type AdminEventTimingT = z.infer<typeof AdminEventTiming>;

/** Query of `GET /admin/events`. Strict; array filters accept CSV. */
export const AdminEventListQuery = z
  .strictObject({
    q: z.string().trim().min(2).max(100).refine(hasNoControlChars).optional(),
    status: z.preprocess(csv, z.array(EventStatus).min(1)).optional(),
    areaId: z.uuid().optional(),
    startsFrom: queryInstant.optional(),
    startsTo: queryInstant.optional(),
    createdFrom: queryInstant.optional(),
    createdTo: queryInstant.optional(),
    hostId: z.uuid().optional(),
    hostHandle: z.string().trim().regex(/^[a-z0-9_]{1,24}$/i).optional(),
    timing: AdminEventTiming.default('all'),
    sort: AdminEventSort.default('createdAt'),
    dir: AdminSortDirection.default('desc'),
    cursor: z.string().min(1).max(512).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(ADMIN_EVENT_LIST_MAX_LIMIT)
      .default(ADMIN_EVENT_LIST_DEFAULT_LIMIT),
  })
  .refine((q) => !q.startsFrom || !q.startsTo || before(q.startsFrom, q.startsTo), {
    path: ['startsFrom'],
    message: 'startsFrom must be before startsTo',
  })
  .refine((q) => !q.createdFrom || !q.createdTo || before(q.createdFrom, q.createdTo), {
    path: ['createdFrom'],
    message: 'createdFrom must be before createdTo',
  });
export type AdminEventListQueryT = z.infer<typeof AdminEventListQuery>;

/** Host identity as the console shows it: no contact data. */
export const AdminEventOrganizer = z.object({
  id: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
});
export type AdminEventOrganizerT = z.infer<typeof AdminEventOrganizer>;

/**
 * List row. For `status = draft` the schedule and capacity fields are null:
 * a draft is private to its author and the console only sees the shell.
 */
export const AdminEventListItem = z.object({
  id: z.uuid(),
  title: z.string(),
  status: EventStatus,
  areaId: z.uuid().nullable(),
  startsAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
  capacity: z.number().int().nullable(),
  /** Seats taken on the earliest live occurrence, `SEAT_OCCUPYING` semantics. */
  seatsTaken: z.number().int().nonnegative().nullable(),
  waitlistWaiting: z.number().int().nonnegative().nullable(),
  organizer: AdminEventOrganizer,
  createdAt: z.iso.datetime(),
});
export type AdminEventListItemT = z.infer<typeof AdminEventListItem>;

export const AdminEventListResponse = cursorPage(AdminEventListItem);
export type AdminEventListResponseT = z.infer<typeof AdminEventListResponse>;

/** Aggregate RSVP figures of one occurrence (D-E3). Counts only, no attendee names. */
export const AdminOccurrenceStats = z.object({
  confirmed: z.number().int().nonnegative(),
  held: z.number().int().nonnegative(),
  waitlisted: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(),
  attended: z.number().int().nonnegative(),
  noShow: z.number().int().nonnegative(),
  waitlistWaiting: z.number().int().nonnegative(),
  /** Derived from `SEAT_OCCUPYING`; display value only. */
  seatsTaken: z.number().int().nonnegative(),
});
export type AdminOccurrenceStatsT = z.infer<typeof AdminOccurrenceStats>;

const STATS_KEY: Partial<Record<RsvpStatusT, 'confirmed' | 'held' | 'attended' | 'noShow'>> = {
  confirmed: 'confirmed',
  held: 'held',
  attended: 'attended',
  no_show: 'noShow',
};

/**
 * Seats taken for one occurrence, summed over the shared `SEAT_OCCUPYING`
 * set so the console can never drift from the capacity trigger.
 */
export function seatsTakenFromStats(
  stats: Pick<AdminOccurrenceStatsT, 'confirmed' | 'held' | 'attended' | 'noShow'>,
): number {
  return SEAT_OCCUPYING.reduce((sum, status) => {
    const key = STATS_KEY[status];
    return sum + (key ? stats[key] : 0);
  }, 0);
}

export const AdminEventOccurrence = z.object({
  id: z.uuid(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime().nullable(),
  capacity: z.number().int(),
  stats: AdminOccurrenceStats,
});
export type AdminEventOccurrenceT = z.infer<typeof AdminEventOccurrence>;

export const AdminEventHost = z.object({
  id: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
  trustLevel: z.number().int().min(0).max(5),
  role: UserRole,
  /** Account status of the host. */
  status: UserStatus,
});
export type AdminEventHostT = z.infer<typeof AdminEventHost>;

/**
 * `GET /admin/events/:id`. For a draft: `description` is null, `lat`/`lng`
 * are null and `occurrences` is empty. Exact coordinates are allowed here
 * only; they never travel to a public client from this contract.
 */
export const AdminEventDetailResponse = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  areaId: z.uuid().nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  status: EventStatus,
  isFeatured: z.boolean(),
  requiredTrustLevel: z.number().int().min(0).max(5),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  host: AdminEventHost,
  occurrences: z.array(AdminEventOccurrence),
  commentCount: z.number().int().nonnegative(),
});
export type AdminEventDetailResponseT = z.infer<typeof AdminEventDetailResponse>;
