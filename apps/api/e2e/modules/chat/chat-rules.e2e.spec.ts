import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RateLimitService } from '../../../src/common/rate-limit/index.js';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';

const HOUR = 3_600_000;

describe('chat rules', { timeout: 60_000 }, () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;
  let db: Pool;
  let host: Actor;

  const http = () => request(app.getHttpServer());

  interface Fixture {
    eventId: string;
    occurrenceId: string;
    roomId: string;
  }

  const rsvp = (occurrenceId: string, actor: Actor) =>
    http()
      .post(`/api/v1/occurrences/${occurrenceId}/rsvps`)
      .set({ ...actor.headers, 'idempotency-key': randomUUID() });

  const cancelRsvp = (occurrenceId: string, actor: Actor) =>
    http().delete(`/api/v1/occurrences/${occurrenceId}/rsvps`).set(actor.headers).expect(204);

  /** Moves an occurrence in time directly: the API refuses past starts and an RSVP needs a future one. */
  const reschedule = async (occurrenceId: string, startsAt: Date, endsAt: Date | null) => {
    await db.query(`UPDATE event_occurrences SET starts_at = $2, ends_at = $3 WHERE id = $1`, [
      occurrenceId,
      startsAt,
      endsAt,
    ]);
  };

  /** A published event starting in 24h with the host's room already open. */
  const fixture = async (capacity = 10): Promise<Fixture> => {
    const created = await http()
      .post('/api/v1/events')
      .set(host.headers)
      .send({
        title: `Chat rules ${randomUUID().slice(0, 8)}`,
        areaId,
        lat: 16.06,
        lng: 108.247,
        startsAt: new Date(Date.now() + 24 * HOUR).toISOString(),
        capacity,
      })
      .expect(201);
    const eventId: string = created.body.data.id;
    await http()
      .put(`/api/v1/events/${eventId}/status`)
      .set(host.headers)
      .send({ status: 'published' })
      .expect(200);
    const room = await http()
      .post('/api/v1/conversations')
      .set(host.headers)
      .send({ type: 'event_group', eventId })
      .expect(201);
    return {
      eventId,
      occurrenceId: created.body.data.occurrenceId,
      roomId: room.body.data.id,
    };
  };

  const attendee = async (f: Fixture, trustLevel = 1): Promise<Actor> => {
    const actor = await createActor(app, { trustLevel });
    await rsvp(f.occurrenceId, actor).expect(201);
    await http()
      .post(`/api/v1/conversations/${f.roomId}/participants`)
      .set(actor.headers)
      .expect(201);
    return actor;
  };

  const conv = (id: string) => `/api/v1/conversations/${id}`;
  const send = (id: string, actor: Actor, body = 'hello', clientMessageId = randomUUID()) =>
    http()
      .post(`${conv(id)}/messages`)
      .set(actor.headers)
      .send({ type: 'text', body, clientMessageId });

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    db = new Pool({ connectionString: DATABASE_URL, max: 2 });
    host = await createActor(app, { trustLevel: 3 });
  });

  afterAll(async () => {
    await db.end();
    await app.close();
    await cleanup();
  });

  describe('eligibility on every request', () => {
    it('organizer and attendee read and write; everyone else gets the same 404', async () => {
      const f = await fixture(1);
      const member = await attendee(f);
      const waitlisted = await createActor(app);
      expect((await rsvp(f.occurrenceId, waitlisted).expect(201)).body.data.status).toBe(
        'waitlisted',
      );
      const stranger = await createActor(app);

      for (const ok of [host, member]) {
        await http().get(conv(f.roomId)).set(ok.headers).expect(200);
        await send(f.roomId, ok).expect(201);
        await http().get(`${conv(f.roomId)}/messages`).set(ok.headers).expect(200);
      }
      for (const out of [waitlisted, stranger]) {
        await http().get(conv(f.roomId)).set(out.headers).expect(404);
        await http().get(`${conv(f.roomId)}/messages`).set(out.headers).expect(404);
        const res = await send(f.roomId, out).expect(404);
        expect(res.body.code).toBe('CONVERSATION_NOT_FOUND');
        await http()
          .put(`${conv(f.roomId)}/read`)
          .set(out.headers)
          .send({ lastReadMessageId: unknownId() })
          .expect(404);
        const listed = await http().get('/api/v1/conversations').set(out.headers).expect(200);
        expect(listed.body.data.items).toHaveLength(0);
      }
      const open = await http()
        .post('/api/v1/conversations')
        .set(waitlisted.headers)
        .send({ type: 'event_group', eventId: f.eventId })
        .expect(404);
      expect(open.body.code).toBe('EVENT_NOT_FOUND');
    });

    it('an ex-attendee who joined and then cancelled loses read, write, read-marker and inbox at once', async () => {
      const f = await fixture();
      const quitter = await attendee(f);
      const sent = await send(f.roomId, host).expect(201);
      await http().get(conv(f.roomId)).set(quitter.headers).expect(200);

      await cancelRsvp(f.occurrenceId, quitter);

      await http().get(conv(f.roomId)).set(quitter.headers).expect(404);
      await http().get(`${conv(f.roomId)}/messages`).set(quitter.headers).expect(404);
      expect((await send(f.roomId, quitter).expect(404)).body.code).toBe(
        'CONVERSATION_NOT_FOUND',
      );
      await http()
        .put(`${conv(f.roomId)}/read`)
        .set(quitter.headers)
        .send({ lastReadMessageId: sent.body.data.id })
        .expect(404);
      await http().delete(`${conv(f.roomId)}/messages/${sent.body.data.id}`).set(quitter.headers).expect(404);
      const listed = await http().get('/api/v1/conversations').set(quitter.headers).expect(200);
      expect(listed.body.data.items).toHaveLength(0);
      // The seat row is still there: only the per-request check closes the door.
      const { rows } = await db.query(
        `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [f.roomId, quitter.id],
      );
      expect(rows).toHaveLength(1);
    });

    it('a room of a cancelled event disappears for its attendees', async () => {
      const f = await fixture();
      const member = await attendee(f);
      await http()
        .put(`/api/v1/events/${f.eventId}/status`)
        .set(host.headers)
        .send({ status: 'cancelled' })
        .expect(200);
      await http().get(conv(f.roomId)).set(member.headers).expect(404);
      await send(f.roomId, member).expect(404);
    });

    it('T0 cannot send (403) and a guest gets 401 on every route', async () => {
      const f = await fixture();
      const t0 = await createActor(app, { trustLevel: 0 });
      expect((await send(f.roomId, t0).expect(403)).body.code).toBe('TRUST_LEVEL_TOO_LOW');

      const id = f.roomId;
      await http().get('/api/v1/conversations').expect(401);
      await http().get(conv(id)).expect(401);
      await http().get(`${conv(id)}/messages`).expect(401);
      await http().post(`${conv(id)}/messages`).send({}).expect(401);
      await http().put(`${conv(id)}/read`).send({}).expect(401);
      await http().post(`${conv(id)}/participants`).expect(401);
      await http().delete(`${conv(id)}/participants/me`).expect(401);
      await http().delete(`${conv(id)}/messages/${unknownId()}`).expect(401);
    });
  });

  describe('chat window', () => {
    it('refuses to open or join before opensAt with the exact instant, and sending too', async () => {
      const f = await fixture();
      const member = await attendee(f);
      const starts = new Date(Date.now() + 72 * HOUR);
      await reschedule(f.occurrenceId, starts, null);

      const late = await createActor(app);
      await rsvp(f.occurrenceId, late).expect(201);
      const join = await http()
        .post(`${conv(f.roomId)}/participants`)
        .set(late.headers)
        .expect(403);
      expect(join.body.code).toBe('CHAT_NOT_OPEN');
      expect(join.body.messageKey).toBe('errors.chat.notOpen');
      expect(join.body.details.opensAt).toBe(new Date(starts.getTime() - 48 * HOUR).toISOString());

      const open = await http()
        .post('/api/v1/conversations')
        .set(late.headers)
        .send({ type: 'event_group', eventId: f.eventId })
        .expect(403);
      expect(open.body.code).toBe('CHAT_NOT_OPEN');

      const sent = await send(f.roomId, member).expect(403);
      expect(sent.body.code).toBe('CHAT_NOT_OPEN');
      // A refusal must not leave a seat behind.
      const { rows } = await db.query(
        `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [f.roomId, late.id],
      );
      expect(rows).toHaveLength(0);
    });

    it('is not_open 30s before opensAt and open 30s after it', async () => {
      const f = await fixture();
      const member = await attendee(f);
      await reschedule(f.occurrenceId, new Date(Date.now() + 48 * HOUR + 30_000), null);
      await send(f.roomId, member).expect(403);
      await reschedule(f.occurrenceId, new Date(Date.now() + 48 * HOUR - 30_000), null);
      await send(f.roomId, member).expect(201);
    });

    it('closes 48h after the end: history stays readable, sending is CONVERSATION_CLOSED', async () => {
      const f = await fixture();
      const member = await attendee(f);
      await send(f.roomId, host, 'before the close').expect(201);
      await reschedule(
        f.occurrenceId,
        new Date(Date.now() - 51 * HOUR),
        new Date(Date.now() - 49 * HOUR),
      );

      const closed = await send(f.roomId, member).expect(403);
      expect(closed.body.code).toBe('CONVERSATION_CLOSED');
      expect(closed.body.messageKey).toBe('errors.chat.conversationClosed');
      const history = await http().get(`${conv(f.roomId)}/messages`).set(member.headers).expect(200);
      expect(history.body.data.items).toHaveLength(1);
      await http().get(conv(f.roomId)).set(member.headers).expect(200);
      // Opening a closed room is allowed: it opens read-only.
      await http()
        .post('/api/v1/conversations')
        .set(member.headers)
        .send({ type: 'event_group', eventId: f.eventId })
        .expect(201);

      // No end time: the close is measured from the start.
      await reschedule(f.occurrenceId, new Date(Date.now() - 47 * HOUR), null);
      await send(f.roomId, member).expect(201);
      await reschedule(f.occurrenceId, new Date(Date.now() - 49 * HOUR), null);
      await send(f.roomId, member).expect(403);
    });

    it('fills chatWindow and event on the room and the inbox, and nulls them for a direct thread', async () => {
      const f = await fixture();
      const member = await attendee(f);
      const { rows } = await db.query<{ starts_at: Date }>(
        `SELECT starts_at FROM event_occurrences WHERE id = $1`,
        [f.occurrenceId],
      );
      const startsAt = rows[0]!.starts_at;
      const res = await http().get(conv(f.roomId)).set(member.headers).expect(200);
      expect(res.body.data.chatWindow).toEqual({
        opensAt: new Date(startsAt.getTime() - 48 * HOUR).toISOString(),
        closesAt: new Date(startsAt.getTime() + 48 * HOUR).toISOString(),
      });
      expect(res.body.data.event).toMatchObject({
        id: f.eventId,
        startsAt: startsAt.toISOString(),
        endsAt: null,
      });
      const inbox = await http()
        .get('/api/v1/conversations?type=event_group')
        .set(member.headers)
        .expect(200);
      expect(inbox.body.data.items.map((c: { id: string }) => c.id)).toEqual([f.roomId]);
      expect(inbox.body.data.items[0].event.title).toContain('Chat rules');

      const peer = await createActor(app, { trustLevel: 2 });
      const talker = await createActor(app, { trustLevel: 2 });
      const direct = await http()
        .post('/api/v1/conversations')
        .set(talker.headers)
        .send({ type: 'direct', recipientUserId: peer.id })
        .expect(201);
      expect(direct.body.data.event).toBeNull();
      expect(direct.body.data.chatWindow).toBeNull();
      const onlyDirect = await http()
        .get('/api/v1/conversations?type=direct')
        .set(talker.headers)
        .expect(200);
      expect(onlyDirect.body.data.items.map((c: { id: string }) => c.id)).toEqual([
        direct.body.data.id,
      ]);
    });
  });

  describe('leave', () => {
    it('is 204 every time, hides the room, and joining again restores the history', async () => {
      const f = await fixture();
      const member = await attendee(f);
      await send(f.roomId, host, 'history line').expect(201);

      await http().delete(`${conv(f.roomId)}/participants/me`).set(member.headers).expect(204);
      await http().delete(`${conv(f.roomId)}/participants/me`).set(member.headers).expect(204);
      await http().get(conv(f.roomId)).set(member.headers).expect(404);
      await http().get(`${conv(f.roomId)}/messages`).set(member.headers).expect(404);
      const inbox = await http().get('/api/v1/conversations').set(member.headers).expect(200);
      expect(inbox.body.data.items).toHaveLength(0);
      const { rows } = await db.query<{ left_at: Date | null }>(
        `SELECT left_at FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [f.roomId, member.id],
      );
      expect(rows[0]?.left_at).not.toBeNull();

      await http().post(`${conv(f.roomId)}/participants`).set(member.headers).expect(201);
      const history = await http().get(`${conv(f.roomId)}/messages`).set(member.headers).expect(200);
      expect(history.body.data.items).toHaveLength(1);
    });

    it('answers 404 for a stranger, a direct thread and an unknown id; an ex-attendee may still leave', async () => {
      const f = await fixture();
      const stranger = await createActor(app);
      await http().delete(`${conv(f.roomId)}/participants/me`).set(stranger.headers).expect(404);
      await http().delete(`${conv(unknownId())}/participants/me`).set(stranger.headers).expect(404);
      await http().delete(`${conv('not-a-uuid')}/participants/me`).set(stranger.headers).expect(400);

      const a = await createActor(app, { trustLevel: 2 });
      const b = await createActor(app, { trustLevel: 2 });
      const direct = await http()
        .post('/api/v1/conversations')
        .set(a.headers)
        .send({ type: 'direct', recipientUserId: b.id })
        .expect(201);
      await http().delete(`${conv(direct.body.data.id)}/participants/me`).set(a.headers).expect(404);
      await http().get(conv(direct.body.data.id)).set(a.headers).expect(200);

      const quitter = await attendee(f);
      await cancelRsvp(f.occurrenceId, quitter);
      await http().delete(`${conv(f.roomId)}/participants/me`).set(quitter.headers).expect(204);
    });
  });

  describe('rate limit', () => {
    it('T1: the 31st message in the hour is 429 with Retry-After', async () => {
      const f = await fixture();
      const t1 = await attendee(f, 1);
      // The 10/minute ceiling stops a spec from reaching 30 in real time, so the
      // hourly counter is pre-filled through the same service and key.
      const limiter = app.get(RateLimitService, { strict: false });
      const key = limiter.keyFor('chat_message', 'user', t1.id, 'hour');
      for (let i = 0; i < 30; i += 1) {
        await limiter.reserve([
          { key, max: 1_000, windowSeconds: 3_600, bucket: 'user_hour', action: 'chat_message' },
        ]);
      }
      const res = await send(f.roomId, t1).expect(429);
      expect(res.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(res.body.messageKey).toBe('errors.rateLimit.exceeded');
      const retryAfter = Number(res.headers['retry-after']);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(3_600);
      const history = await http().get(`${conv(f.roomId)}/messages`).set(t1.headers).expect(200);
      expect(history.body.data.items).toHaveLength(0);
    });

    it('allows 10 per minute, refuses the 11th, and replays never spend a slot', async () => {
      const f = await fixture();
      const member = await attendee(f, 2);
      const key = randomUUID();
      const first = await send(f.roomId, member, 'once', key).expect(201);
      for (let i = 0; i < 15; i += 1) {
        const again = await send(f.roomId, member, 'once', key).expect(201);
        expect(again.body.data.id).toBe(first.body.data.id);
      }
      for (let i = 0; i < 9; i += 1) await send(f.roomId, member).expect(201);
      const res = await send(f.roomId, member).expect(429);
      expect(Number(res.headers['retry-after'])).toBeLessThanOrEqual(60);

      const history = await http().get(`${conv(f.roomId)}/messages`).set(member.headers).expect(200);
      expect(history.body.data.items).toHaveLength(10);
    });

    it('does not spend a slot on a validation failure or a closed room', async () => {
      const f = await fixture();
      const member = await attendee(f, 2);
      for (let i = 0; i < 12; i += 1) {
        await http()
          .post(`${conv(f.roomId)}/messages`)
          .set(member.headers)
          .send({ type: 'text', body: '   ', clientMessageId: randomUUID() })
          .expect(400);
      }
      await reschedule(
        f.occurrenceId,
        new Date(Date.now() - 51 * HOUR),
        new Date(Date.now() - 49 * HOUR),
      );
      for (let i = 0; i < 12; i += 1) await send(f.roomId, member).expect(403);
      await reschedule(f.occurrenceId, new Date(Date.now() + 24 * HOUR), null);
      for (let i = 0; i < 10; i += 1) await send(f.roomId, member).expect(201);
    });
  });

  describe('read marker', () => {
    it('moves forward only, rejects an id from another room, and never raises the count', async () => {
      const f = await fixture();
      const other = await fixture();
      const member = await attendee(f);
      const ids: string[] = [];
      for (let i = 0; i < 3; i += 1) {
        ids.push((await send(f.roomId, host, `m${i}`).expect(201)).body.data.id);
      }
      const read = (id: string, lastReadMessageId: string) =>
        http().put(`${conv(id)}/read`).set(member.headers).send({ lastReadMessageId });

      const inbox = await http().get(conv(f.roomId)).set(member.headers).expect(200);
      expect(inbox.body.data.unreadCount).toBe(3);

      expect((await read(f.roomId, ids[2]!).expect(200)).body.data.unreadCount).toBe(0);
      await send(f.roomId, host, 'm3').expect(201);
      await send(f.roomId, host, 'm4').expect(201);
      const afterNew = await http().get(conv(f.roomId)).set(member.headers).expect(200);
      expect(afterNew.body.data.unreadCount).toBe(2);

      // An older id changes nothing.
      expect((await read(f.roomId, ids[0]!).expect(200)).body.data.unreadCount).toBe(2);

      // An id that belongs to another room is refused and changes nothing.
      const foreign = (await send(other.roomId, host, 'elsewhere').expect(201)).body.data.id;
      const bad = await read(f.roomId, foreign).expect(404);
      expect(bad.body.code).toBe('MESSAGE_NOT_FOUND');
      await read(f.roomId, unknownId()).expect(404);
      const still = await http().get(conv(f.roomId)).set(member.headers).expect(200);
      expect(still.body.data.unreadCount).toBe(2);
    });
  });

  describe('response shape', () => {
    it('exposes identity only as UserSummary and nothing of anyone else\'s read state', async () => {
      const f = await fixture();
      const member = await attendee(f);
      const sent = await send(f.roomId, member, 'who am I').expect(201);
      expect(Object.keys(sent.body.data.sender).toSorted()).toEqual(
        ['displayName', 'handle', 'trustLevel', 'userId'],
      );
      expect(sent.body.data.sender.userId).toBe(member.id);
      expect(sent.body.data.sender.handle).toBe(member.handle);

      const history = await http().get(`${conv(f.roomId)}/messages`).set(host.headers).expect(200);
      expect(history.body.data.items[0].sender.userId).toBe(member.id);

      const room = await http().get(conv(f.roomId)).set(host.headers).expect(200);
      const participants = room.body.data.participants as Array<Record<string, unknown>>;
      expect(participants).toHaveLength(2);
      for (const p of participants) {
        expect(Object.keys(p).toSorted()).toEqual(
          ['joinedAt', 'leftAt', 'role', 'user', 'userId'],
        );
        expect(Object.keys(p['user'] as object).toSorted()).toEqual(
          ['displayName', 'handle', 'trustLevel', 'userId'],
        );
      }
      const raw = JSON.stringify([room.body, history.body, sent.body]);
      for (const leaked of ['lastRead', 'last_read', 'unread_count', 'email', 'password']) {
        expect(raw).not.toContain(leaked);
      }
    });

    it('lets no one delete another person\'s message, host included', async () => {
      const f = await fixture();
      const member = await attendee(f);
      const msg = (await send(f.roomId, member, 'mine').expect(201)).body.data.id;

      await http().delete(`${conv(f.roomId)}/messages/${msg}`).set(host.headers).expect(404);
      const stillThere = await http().get(`${conv(f.roomId)}/messages`).set(member.headers).expect(200);
      expect(stillThere.body.data.items).toHaveLength(1);

      // The sender can, but only through the room the message lives in.
      const other = await fixture();
      await http().delete(`${conv(other.roomId)}/messages/${msg}`).set(host.headers).expect(404);
      await http().delete(`${conv(f.roomId)}/messages/${msg}`).set(member.headers).expect(204);
    });
  });
});
