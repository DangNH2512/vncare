import { z } from 'zod';

/**
 * Single source of truth for the RSVP vocabulary (see ADR-0000).
 *
 * TypeORM entities, the `assert_capacity` trigger SQL, the overbooking canary
 * query and every guard must be generated from or cross-checked against the
 * constants in this file. A CI test asserts that SEAT_OCCUPYING matches the
 * status list hard-coded in the trigger migration
 * (test/rsvp-vocabulary.spec.ts).
 */
export const RsvpStatus = z.enum([
  'confirmed', // occupies a seat
  'held', // promoted from waitlist, awaiting confirmation — occupies a seat
  'waitlisted', // does not occupy a seat
  'cancelled', // does not occupy a seat
  'attended', // occupies a seat (checked in)
  'no_show', // occupies a seat (occurrence has passed)
]);
export type RsvpStatusT = z.infer<typeof RsvpStatus>;

/** Statuses that occupy a seat. Used by the recount trigger, the canary and every capacity computation. */
export const SEAT_OCCUPYING: readonly RsvpStatusT[] = [
  'confirmed',
  'held',
  'attended',
  'no_show',
];

/** Statuses considered "active" — the predicate of the partial unique index that prevents duplicate RSVPs. */
export const ACTIVE_RSVP_STATUSES: readonly RsvpStatusT[] = [
  'confirmed',
  'held',
  'waitlisted',
];

/** Physical table/column names. Project convention: plural snake_case table names. */
export const RSVP_TABLE = 'rsvps';
export const RSVP_STATUS_COLUMN = 'status';
export const OCCURRENCE_TABLE = 'event_occurrences';
export const OCCURRENCE_CAPACITY_COLUMN = 'capacity';

export const WaitlistStatus = z.enum(['waiting', 'promoted', 'expired', 'cancelled']);
export type WaitlistStatusT = z.infer<typeof WaitlistStatus>;

/**
 * RSVP creation request body. The Idempotency-Key header is mandatory at the
 * HTTP layer and is intentionally not part of the body schema.
 */
export const RsvpCreateRequest = z.object({
  occurrenceId: z.uuid(),
});
export type RsvpCreateRequestT = z.infer<typeof RsvpCreateRequest>;

export const RsvpResponse = z.object({
  id: z.uuid(),
  occurrenceId: z.uuid(),
  userId: z.uuid(),
  status: RsvpStatus,
  /** Position in the waitlist; null unless status is `waitlisted`. */
  waitlistPosition: z.number().int().positive().nullable(),
  /** Confirmation deadline for a held seat; null unless status is `held`. */
  holdExpiresAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type RsvpResponseT = z.infer<typeof RsvpResponse>;

/**
 * One person on the attendee list.
 *
 * An allow-list at a privacy boundary: display identity and the trust badge,
 * nothing else. Email, phone and counts of anything never belong here.
 */
export const AttendeeResponse = z.object({
  userId: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.url().nullable(),
  trustLevel: z.number().int().min(0).max(5),
  status: RsvpStatus,
});
export type AttendeeResponseT = z.infer<typeof AttendeeResponse>;
