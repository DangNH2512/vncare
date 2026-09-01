import { z } from 'zod';

/**
 * Event lifecycle states. `suspended` and `taken_down` implement the
 * two-step moderation flow: suspension is reversible within the appeal
 * window, takedown is not.
 */
export const EventStatus = z.enum([
  'draft',
  'pending_review',
  'published',
  'suspended',
  'taken_down',
  'cancelled',
]);
export type EventStatusT = z.infer<typeof EventStatus>;

export const EventCreateRequest = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(5000).optional(),
  areaId: z.uuid(),
  /** WGS84 coordinates. GeoJSON order is [lng, lat]; these fields are named to avoid that ambiguity. */
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime().optional(),
  capacity: z.number().int().min(1).max(1000),
  /** Minimum trust level required to RSVP; 0 means open to everyone. */
  requiredTrustLevel: z.number().int().min(0).max(5).default(0),
});
export type EventCreateRequestT = z.infer<typeof EventCreateRequest>;

export const EventResponse = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  areaId: z.uuid(),
  lat: z.number(),
  lng: z.number(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime().nullable(),
  capacity: z.number().int(),
  /** Seats currently occupied (SEAT_OCCUPYING semantics). Display value; never used for admission decisions. */
  seatsTaken: z.number().int(),
  status: EventStatus,
  requiredTrustLevel: z.number().int(),
  createdAt: z.iso.datetime(),
});
export type EventResponseT = z.infer<typeof EventResponse>;
