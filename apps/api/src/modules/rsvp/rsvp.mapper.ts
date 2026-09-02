import type { AttendeeResponseT, RsvpResponseT } from '@dnc/contracts';
import type { AttendeeRow, RsvpRow } from './rsvp.repository.js';

export function toRsvpResponse(row: RsvpRow): RsvpResponseT {
  return {
    id: row.id,
    occurrenceId: row.occurrence_id,
    userId: row.user_id,
    status: row.status,
    waitlistPosition: row.status === 'waitlisted' ? row.waitlist_position : null,
    holdExpiresAt: row.hold_expires_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * @param avatarUrl - Signed by the caller; the row only carries the media id.
 */
export function toAttendeeResponse(row: AttendeeRow, avatarUrl: string | null): AttendeeResponseT {
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl,
    trustLevel: row.trust_level,
    status: row.status,
  };
}
