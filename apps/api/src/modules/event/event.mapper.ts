import type { EventResponseT } from '@dnc/contracts';
import type { EventRow } from './event.repository.js';

/**
 * Maps an event row onto the public response.
 *
 * `location` never leaves the repository as PostGIS output: the query projects
 * it to two numbers and this mapper passes them through, so no client ever sees
 * WKB or WKT.
 */
export function toEventResponse(row: EventRow): EventResponseT {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    areaId: row.area_id,
    lat: row.lat,
    lng: row.lng,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at?.toISOString() ?? null,
    capacity: row.capacity,
    seatsTaken: row.seats_taken,
    status: row.status,
    requiredTrustLevel: row.required_trust_level,
    createdAt: row.created_at.toISOString(),
  };
}
