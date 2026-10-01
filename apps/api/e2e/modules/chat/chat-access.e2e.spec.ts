import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';

describe('chat access control', () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;
  let db: Pool;
  let host: Actor;

  const http = () => request(app.getHttpServer());

  /** Creates and publishes an event, returning its ids. */
  const publishEvent = async (
    capacity = 5,
    organizer: Actor = host,
  ): Promise<{ eventId: string; occurrenceId: string }> => {
    const created = await http()
      .post('/api/v1/events')
      .set(organizer.headers)
      .send({
        title: `Chat access ${randomUUID().slice(0, 8)}`,
        areaId,
        lat: 16.06,
        lng: 108.247,
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        capacity,
      })
      .expect(201);
    await http()
      .put(`/api/v1/events/${created.body.data.id}/status`)
      .set(organizer.headers)
      .send({ status: 'published' })
      .expect(200);
    return { eventId: created.body.data.id, occurrenceId: created.body.data.occurrenceId };
  };

  const rsvp = (occurrenceId: string, actor: Actor) =>
    http()
      .post(`/api/v1/occurrences/${occurrenceId}/rsvps`)
      .set({ ...actor.headers, 'idempotency-key': randomUUID() });

  const openRoom = (eventId: string, actor: Actor, extra: Record<string, unknown> = {}) =>
    http()
      .post('/api/v1/conversations')
      .set(actor.headers)
      .send({ type: 'event_group', eventId, ...extra });

  const joinRoom = (conversationId: string, actor: Actor) =>
    http().post(`/api/v1/conversations/${conversationId}/participants`).set(actor.headers);

  const memberRows = async (conversationId: string, userId: string): Promise<number> => {
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM conversation_participants
        WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId],
    );
    return rows[0]?.n ?? 0;
  };

  const attendee = async (occurrenceId: string, trustLevel = 1): Promise<Actor> => {
    const actor = await createActor(app, { trustLevel });
    await rsvp(occurrenceId, actor).expect(201);
    return actor;
  };

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    db = new Pool({ connectionString: DATABASE_URL, max: 2 });
    host = await createActor(app, { trustLevel: 2 });
  });

  afterAll(async () => {
    await db.end();
    await app.close();
    await cleanup();
  });

  describe('POST /conversations/:id/participants', () => {
    it('refuses an outsider joining someone else\'s direct thread, without a new row', async () => {
      const a = await createActor(app, { trustLevel: 2 });
      const b = await createActor(app, { trustLevel: 2 });
      const outsider = await createActor(app, { trustLevel: 2 });
      const direct = await http()
        .post('/api/v1/conversations')
        .set(a.headers)
        .send({ type: 'direct', recipientUserId: b.id })
        .expect(201);
      const id: string = direct.body.data.id;

      const res = await joinRoom(id, outsider).expect(404);
      expect(res.body.code).toBe('CONVERSATION_NOT_FOUND');
      expect(await memberRows(id, outsider.id)).toBe(0);
    });

    it('refuses a caller with no RSVP, a waitlisted RSVP, or a cancelled one', async () => {
      const { eventId, occurrenceId } = await publishEvent(1);
      const room = await openRoom(eventId, host).expect(201);
      const id: string = room.body.data.id;

      const confirmed = await attendee(occurrenceId);
      const none = await createActor(app);
      const waitlisted = await createActor(app);
      const waitRes = await rsvp(occurrenceId, waitlisted).expect(201);
      expect(waitRes.body.data.status).toBe('waitlisted');

      await joinRoom(id, none).expect(404);
      await joinRoom(id, waitlisted).expect(404);
      expect(await memberRows(id, none.id)).toBe(0);
      expect(await memberRows(id, waitlisted.id)).toBe(0);

      await joinRoom(id, confirmed).expect(201);
      expect(await memberRows(id, confirmed.id)).toBe(1);
    });

    it('refuses a caller who confirmed and then cancelled their RSVP', async () => {
      const { eventId, occurrenceId } = await publishEvent();
      const room = await openRoom(eventId, host).expect(201);
      const id: string = room.body.data.id;
      const quitter = await attendee(occurrenceId);
      await http()
        .delete(`/api/v1/occurrences/${occurrenceId}/rsvps`)
        .set(quitter.headers)
        .expect(204);

      await joinRoom(id, quitter).expect(404);
      expect(await memberRows(id, quitter.id)).toBe(0);

      const other = await publishEvent();
      const second = await attendee(other.occurrenceId);
      await http()
        .delete(`/api/v1/occurrences/${other.occurrenceId}/rsvps`)
        .set(second.headers)
        .expect(204);
      await openRoom(other.eventId, second).expect(404);
      const { rows } = await db.query(`SELECT 1 FROM conversations WHERE event_id = $1`, [
        other.eventId,
      ]);
      expect(rows).toHaveLength(0);
    });

    it('refuses T0 and a caller below min_trust_level_to_join', async () => {
      const { eventId, occurrenceId } = await publishEvent();
      const room = await openRoom(eventId, host, { minTrustLevelToJoin: 3 }).expect(201);
      const id: string = room.body.data.id;

      const lowTrust = await attendee(occurrenceId, 2);
      const highTrust = await attendee(occurrenceId, 3);
      const t0 = await createActor(app, { trustLevel: 0 });

      await joinRoom(id, t0).expect(403);
      await joinRoom(id, lowTrust).expect(404);
      expect(await memberRows(id, t0.id)).toBe(0);
      expect(await memberRows(id, lowTrust.id)).toBe(0);

      await joinRoom(id, highTrust).expect(201);
    });

    it('lets the host join, and rejoining is harmless', async () => {
      const { eventId } = await publishEvent();
      const room = await openRoom(eventId, host).expect(201);
      const id: string = room.body.data.id;
      await joinRoom(id, host).expect(201);
      await joinRoom(id, host).expect(201);
      expect(await memberRows(id, host.id)).toBe(1);
    });

    it('refuses a room whose event is no longer published', async () => {
      const { eventId, occurrenceId } = await publishEvent();
      const room = await openRoom(eventId, host).expect(201);
      const member = await attendee(occurrenceId);
      await http()
        .put(`/api/v1/events/${eventId}/status`)
        .set(host.headers)
        .send({ status: 'cancelled' })
        .expect(200);
      await joinRoom(room.body.data.id, member).expect(404);
    });

    it('answers an unknown id with 404 and a malformed id with 400, never 500', async () => {
      const member = await createActor(app);
      const missing = await joinRoom(unknownId(), member).expect(404);
      expect(missing.body.code).toBe('CONVERSATION_NOT_FOUND');
      await joinRoom('not-a-uuid', member).expect(400);
    });

    it('requires authentication', async () => {
      await http().post(`/api/v1/conversations/${unknownId()}/participants`).expect(401);
    });
  });

  describe('POST /conversations (event_group)', () => {
    it('refuses a caller with no confirmed RSVP, without leaking the event', async () => {
      const { eventId, occurrenceId } = await publishEvent(1);
      await attendee(occurrenceId);
      const stranger = await createActor(app);
      const waitlisted = await createActor(app);
      await rsvp(occurrenceId, waitlisted).expect(201);

      for (const actor of [stranger, waitlisted]) {
        const res = await openRoom(eventId, actor).expect(404);
        expect(res.body.code).toBe('EVENT_NOT_FOUND');
      }
      const { rows } = await db.query(`SELECT 1 FROM conversations WHERE event_id = $1`, [
        eventId,
      ]);
      expect(rows).toHaveLength(0);
    });

    it('opens one room per occurrence, idempotently, with the organizer as owner', async () => {
      const { eventId, occurrenceId } = await publishEvent();
      const member = await attendee(occurrenceId);

      const first = await openRoom(eventId, member).expect(201);
      const second = await openRoom(eventId, host).expect(201);
      const third = await openRoom(eventId, member, { occurrenceId }).expect(201);
      expect(second.body.data.id).toBe(first.body.data.id);
      expect(third.body.data.id).toBe(first.body.data.id);

      const owners = first.body.data.participants.filter(
        (p: { role: string }) => p.role === 'owner',
      );
      expect(owners.map((p: { userId: string }) => p.userId)).toEqual([host.id]);

      const { rows } = await db.query(`SELECT 1 FROM conversations WHERE event_id = $1`, [
        eventId,
      ]);
      expect(rows).toHaveLength(1);
    });

    it('converges concurrent first requests on one room', async () => {
      const { eventId, occurrenceId } = await publishEvent();
      const a = await attendee(occurrenceId);
      const b = await attendee(occurrenceId);
      const results = await Promise.all([
        openRoom(eventId, a),
        openRoom(eventId, b),
        openRoom(eventId, host),
      ]);
      for (const res of results) expect(res.status).toBe(201);
      expect(new Set(results.map((r) => r.body.data.id)).size).toBe(1);
      const { rows } = await db.query<{ rooms: number; owners: number }>(
        `SELECT count(DISTINCT c.id)::int AS rooms,
                count(*) FILTER (WHERE p.role = 'owner')::int AS owners
           FROM conversations c
           JOIN conversation_participants p ON p.conversation_id = c.id
          WHERE c.event_id = $1`,
        [eventId],
      );
      expect(rows[0]).toEqual({ rooms: 1, owners: 1 });
    });

    it('ignores a trust floor set by a non-organizer', async () => {
      const { eventId, occurrenceId } = await publishEvent();
      const member = await attendee(occurrenceId);
      const room = await openRoom(eventId, member, { minTrustLevelToJoin: 5 }).expect(201);
      const { rows } = await db.query<{ min_trust_level_to_join: number }>(
        `SELECT min_trust_level_to_join FROM conversations WHERE id = $1`,
        [room.body.data.id],
      );
      expect(rows[0]?.min_trust_level_to_join).toBe(0);
    });

    it('rejects an occurrence that belongs to another event', async () => {
      const one = await publishEvent();
      const other = await publishEvent();
      const res = await openRoom(one.eventId, host, {
        occurrenceId: other.occurrenceId,
      }).expect(400);
      expect(res.body.code).toBe('OCCURRENCE_NOT_IN_EVENT');
    });

    it('answers a draft, unknown or malformed event without a 500', async () => {
      const draft = await http()
        .post('/api/v1/events')
        .set(host.headers)
        .send({
          title: 'Draft chat probe',
          areaId,
          lat: 16.06,
          lng: 108.247,
          startsAt: new Date(Date.now() + 86_400_000).toISOString(),
          capacity: 5,
        })
        .expect(201);
      await openRoom(draft.body.data.id, host).expect(404);
      await openRoom(unknownId(), host).expect(404);
      await openRoom('not-a-uuid', host).expect(400);
      await openRoom(draft.body.data.id, host, { occurrenceId: 'nope' }).expect(400);
    });
  });
});
