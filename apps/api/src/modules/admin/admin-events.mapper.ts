import {
  seatsTakenFromStats,
  type AdminEventDetailResponseT,
  type AdminEventListItemT,
  type AdminOccurrenceStatsT,
} from '@dnc/contracts';
import type {
  AdminEventListRow,
  AdminEventDetailRows,
  AdminOccurrenceCounts,
} from './admin-events.repository.js';

export function toOccurrenceStats(c: Partial<AdminOccurrenceCounts>): AdminOccurrenceStatsT {
  const base = {
    confirmed: c.confirmed ?? 0,
    held: c.held ?? 0,
    attended: c.attended ?? 0,
    noShow: c.no_show ?? 0,
  };
  return {
    ...base,
    waitlisted: c.waitlisted ?? 0,
    cancelled: c.cancelled ?? 0,
    waitlistWaiting: c.waitlist_waiting ?? 0,
    seatsTaken: seatsTakenFromStats(base),
  };
}

/** Field-by-field: a draft keeps only title, status, host and creation date. */
export function toAdminEventListItem(row: AdminEventListRow): AdminEventListItemT {
  const draft = row.status === 'draft';
  const stats = draft ? null : toOccurrenceStats(row);
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    areaId: draft ? null : row.area_id,
    startsAt: row.starts_at?.toISOString() ?? null,
    endsAt: row.ends_at?.toISOString() ?? null,
    capacity: row.capacity,
    seatsTaken: stats?.seatsTaken ?? null,
    waitlistWaiting: stats?.waitlistWaiting ?? null,
    organizer: {
      id: row.organizer_id,
      handle: row.organizer_handle,
      displayName: row.organizer_display_name,
    },
    createdAt: row.created_at.toISOString(),
  };
}

export function toAdminEventDetail(rows: AdminEventDetailRows): AdminEventDetailResponseT {
  const b = rows.base;
  const draft = b.status === 'draft';
  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    description: draft ? null : b.description,
    areaId: draft ? null : b.area_id,
    lat: draft ? null : b.lat,
    lng: draft ? null : b.lng,
    status: b.status,
    isFeatured: b.is_featured,
    requiredTrustLevel: b.required_trust_level,
    createdAt: b.created_at.toISOString(),
    // A draft's edit history is private to its author, so it shows the creation time.
    updatedAt: (draft ? b.created_at : b.updated_at).toISOString(),
    host: {
      id: b.host_id,
      handle: b.host_handle,
      displayName: b.host_display_name,
      trustLevel: b.host_trust_level,
      role: b.host_role,
      status: b.host_status,
    },
    occurrences: draft
      ? []
      : rows.occurrences.map((o) => ({
          id: o.id,
          startsAt: o.starts_at.toISOString(),
          endsAt: o.ends_at?.toISOString() ?? null,
          capacity: o.capacity,
          stats: toOccurrenceStats(o),
        })),
    commentCount: draft ? 0 : b.comment_count,
  };
}
