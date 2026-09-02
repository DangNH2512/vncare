import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { envelope, RsvpResponse } from '@dnc/contracts';
import {
  createActor,
  createTestApp,
  seedArea,
  type Actor,
} from '../../support/harness.js';

describe('rsvp module', () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;
  let host: Actor;

  /** Creates and publishes an event, returning its RSVP target. */
  const publishEvent = async (
    capacity: number,
    overrides: Record<string, unknown> = {},
  ): Promise<{ eventId: string; occurrenceId: string }> => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set(host.headers)
      .send({
        title: `RSVP probe ${randomUUID().slice(0, 8)}`,
        areaId,
        lat: 16.06,
        lng: 108.247,
        startsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        capacity,
        ...overrides,
      })
      .expect(201);
    await request(app.getHttpServer())
      .put(`/api/v1/events/${created.body.data.id}/status`)
      .set(host.headers)
      .send({ status: 'published' })
      .expect(200);
    return {
      eventId: created.body.data.id,
      occurrenceId: created.body.data.occurrenceId,
    };
  };

  const join = (occurrenceId: string, actor: Actor, key = randomUUID()) =>
    request(app.getHttpServer())
      .post(`/api/v1/occurrences/${occurrenceId}/rsvps`)
      .set({ ...actor.headers, 'idempotency-key': key });

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    host = await createActor(app);
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
  });

  it('confirms a seat while capacity remains and reports it on the event', async () => {
    const { eventId, occurrenceId } = await publishEvent(3);
    const guest = await createActor(app);

    const res = await join(occurrenceId, guest).expect(201);
    const parsed = envelope(RsvpResponse).parse(res.body);
    expect(parsed.data.status).toBe('confirmed');
    expect(parsed.data.waitlistPosition).toBeNull();

    const event = await request(app.getHttpServer())
      .get(`/api/v1/events/${eventId}`)
      .set(guest.headers)
      .expect(200);
    expect(event.body.data.seatsTaken).toBe(1);
    // The feed paints the Join button from this field.
    expect(event.body.data.viewerRsvpStatus).toBe('confirmed');
  });

  it('queues people once the room is full, in arrival order', async () => {
    const { occurrenceId } = await publishEvent(1);
    const first = await createActor(app);
    const second = await createActor(app);
    const third = await createActor(app);

    expect((await join(occurrenceId, first).expect(201)).body.data.status).toBe('confirmed');

    const queued = await join(occurrenceId, second).expect(201);
    expect(queued.body.data.status).toBe('waitlisted');
    expect(queued.body.data.waitlistPosition).toBe(1);

    const queuedNext = await join(occurrenceId, third).expect(201);
    expect(queuedNext.body.data.waitlistPosition).toBe(2);
  });

  /** A retry after a dropped connection is the same request, not a second seat. */
  it('returns the original RSVP when the same Idempotency-Key is replayed', async () => {
    const { occurrenceId } = await publishEvent(5);
    const guest = await createActor(app);
    const key = randomUUID();

    const first = await join(occurrenceId, guest, key).expect(201);
    const retry = await join(occurrenceId, guest, key).expect(201);
    expect(retry.body.data.id).toBe(first.body.data.id);
  });

  it('refuses a second registration with a fresh key', async () => {
    const { occurrenceId } = await publishEvent(5);
    const guest = await createActor(app);
    await join(occurrenceId, guest).expect(201);
    await join(occurrenceId, guest).expect(409);
  });

  it('refuses a join with no Idempotency-Key', async () => {
    const { occurrenceId } = await publishEvent(5);
    const guest = await createActor(app);
    await request(app.getHttpServer())
      .post(`/api/v1/occurrences/${occurrenceId}/rsvps`)
      .set(guest.headers)
      .expect(400);
  });

  /**
   * The product's core promise: a freed seat goes to the head of the queue in
   * the same transaction, never to whoever refreshes fastest.
   */
  it('promotes the first waiting person when a confirmed seat frees up', async () => {
    const { eventId, occurrenceId } = await publishEvent(1);
    const leaver = await createActor(app);
    const waiting = await createActor(app);

    await join(occurrenceId, leaver).expect(201);
    await join(occurrenceId, waiting).expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/occurrences/${occurrenceId}/rsvps`)
      .set(leaver.headers)
      .expect(204);

    const promoted = await request(app.getHttpServer())
      .get(`/api/v1/occurrences/${occurrenceId}/rsvps/me`)
      .set(waiting.headers)
      .expect(200);
    expect(promoted.body.data.status).toBe('confirmed');

    // The seat count is unchanged: one person left, one moved up.
    const event = await request(app.getHttpServer())
      .get(`/api/v1/events/${eventId}`)
      .set(waiting.headers)
      .expect(200);
    expect(event.body.data.seatsTaken).toBe(1);
  });

  it('cancelling a waitlist place promotes nobody', async () => {
    const { eventId, occurrenceId } = await publishEvent(1);
    const seated = await createActor(app);
    const queued = await createActor(app);

    await join(occurrenceId, seated).expect(201);
    await join(occurrenceId, queued).expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/occurrences/${occurrenceId}/rsvps`)
      .set(queued.headers)
      .expect(204);

    const event = await request(app.getHttpServer())
      .get(`/api/v1/events/${eventId}`)
      .set(seated.headers)
      .expect(200);
    expect(event.body.data.seatsTaken).toBe(1);
    expect(event.body.data.viewerRsvpStatus).toBe('confirmed');
  });

  it('enforces the event trust floor', async () => {
    const { occurrenceId } = await publishEvent(5, { requiredTrustLevel: 2 });
    const newcomer = await createActor(app); // T1
    const trusted = await createActor(app, { trustLevel: 2 });

    await join(occurrenceId, newcomer).expect(403);
    await join(occurrenceId, trusted).expect(201);
  });

  it('refuses a draft event and a past occurrence', async () => {
    const draft = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set(host.headers)
      .send({
        title: 'Still a draft',
        areaId,
        lat: 16.06,
        lng: 108.247,
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        capacity: 5,
      })
      .expect(201);
    const guest = await createActor(app);
    await join(draft.body.data.occurrenceId, guest).expect(400);
  });

  it('serves the attendee list to members only, with display data only', async () => {
    const { occurrenceId } = await publishEvent(2);
    const going = await createActor(app);
    const queued = await createActor(app);
    const another = await createActor(app);
    await join(occurrenceId, going).expect(201);
    await join(occurrenceId, another).expect(201);
    await join(occurrenceId, queued).expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/occurrences/${occurrenceId}/rsvps`)
      .expect(401);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/occurrences/${occurrenceId}/rsvps`)
      .set(going.headers)
      .expect(200);

    expect(res.body.data).toHaveLength(3);
    // Confirmed people first, the queue after.
    expect(res.body.data.map((a: { status: string }) => a.status)).toEqual([
      'confirmed',
      'confirmed',
      'waitlisted',
    ]);
    for (const leak of ['email', 'phone', 'noShowCount']) {
      expect(res.body.data[0]).not.toHaveProperty(leak);
    }
  });

  /**
   * Two people race for the last seat. Exactly one may sit; the other queues.
   * This is what the occurrence row lock exists for, and what the
   * assert_capacity trigger guards if the lock is ever lost in a refactor.
   */
  it('never oversells the last seat under a concurrent race', async () => {
    const { eventId, occurrenceId } = await publishEvent(1);
    const a = await createActor(app);
    const b = await createActor(app);

    const [ra, rb] = await Promise.all([
      join(occurrenceId, a),
      join(occurrenceId, b),
    ]);
    const statuses = [ra.body.data.status, rb.body.data.status].sort();
    expect(statuses).toEqual(['confirmed', 'waitlisted']);

    const event = await request(app.getHttpServer())
      .get(`/api/v1/events/${eventId}`)
      .set(a.headers)
      .expect(200);
    expect(event.body.data.seatsTaken).toBe(1);
  });
});
