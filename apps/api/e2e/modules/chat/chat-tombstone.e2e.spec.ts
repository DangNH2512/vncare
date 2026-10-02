import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createActor, createTestApp, DATABASE_URL, type Actor } from '../../support/harness.js';

describe('chat tombstones', () => {
  let app: INestApplication;
  let pool: Pool;

  beforeAll(async () => {
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  const pair = async (): Promise<[Actor, Actor]> => [
    await createActor(app, { trustLevel: 2 }),
    await createActor(app, { trustLevel: 2 }),
  ];

  const thread = async (a: Actor, b: Actor): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/conversations')
      .set(a.headers)
      .send({ type: 'direct', recipientUserId: b.id })
      .expect(201);
    await request(app.getHttpServer())
      .put(`/api/v1/conversations/${res.body.data.id}/request`)
      .set(b.headers)
      .send({ decision: 'accepted' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${res.body.data.id}/messages`)
      .set(a.headers)
      .send({ type: 'text', body: 'hello', clientMessageId: randomUUID() })
      .expect(201);
    return res.body.data.id;
  };

  const send = async (id: string, from: Actor, body: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/conversations/${id}/messages`)
      .set(from.headers)
      .send({ type: 'text', body, clientMessageId: randomUUID() });
    expect(res.status).toBe(201);
    return res.body.data.id;
  };

  const list = (id: string, as: Actor, qs = '') =>
    request(app.getHttpServer()).get(`/api/v1/conversations/${id}/messages${qs}`).set(as.headers);

  const del = (id: string, msg: string, as: Actor) =>
    request(app.getHttpServer())
      .delete(`/api/v1/conversations/${id}/messages/${msg}`)
      .set(as.headers);

  it('shows the recipient a removed message with no content', async () => {
    const [a, b] = await pair();
    const id = await thread(a, b);
    const msg = await send(id, a, 'secret words');
    await del(id, msg, a).expect(204);

    const res = await list(id, b).expect(200);
    const tomb = res.body.data.items.find((m: { id: string }) => m.id === msg);
    expect(tomb).toMatchObject({
      status: 'removed',
      body: null,
      bodyLocale: null,
      mediaId: null,
      sharedEventId: null,
      replyToMessageId: null,
      senderUserId: a.id,
    });
    expect(tomb.createdAt).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain('secret words');
  });

  it('paginates across tombstones without duplicates or gaps', async () => {
    const [a, b] = await pair();
    const id = await thread(a, b);
    const sent: string[] = [];
    for (let i = 0; i < 5; i++) sent.push(await send(id, a, `m${i}`));
    await del(id, sent[1]!, a).expect(204);
    await del(id, sent[3]!, a).expect(204);

    const seen: string[] = [];
    let cursor: string | null = null;
    for (let guard = 0; guard < 10; guard++) {
      const qs: string = `?limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const res = await list(id, b, qs).expect(200);
      seen.push(...res.body.data.items.map((m: { id: string }) => m.id));
      cursor = res.body.data.nextCursor ?? null;
      if (!cursor) break;
    }
    // Five sent plus the opening hello.
    expect(seen).toHaveLength(6);
    expect(new Set(seen).size).toBe(6);
    for (const m of sent) expect(seen).toContain(m);
  });

  it('keeps the removed body out of the inbox preview and unread count', async () => {
    const [a, b] = await pair();
    const id = await thread(a, b);
    const msg = await send(id, a, 'regrettable');
    await del(id, msg, a).expect(204);

    const inbox = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set(b.headers)
      .expect(200);
    const row = inbox.body.data.items.find((c: { id: string }) => c.id === id);
    expect(row.lastMessagePreview).toBe('hello');
    expect(JSON.stringify(inbox.body)).not.toContain('regrettable');

    // Reading up to the tombstone must leave nothing unread.
    const latest = (await list(id, b).expect(200)).body.data.items[0].id;
    await request(app.getHttpServer())
      .put(`/api/v1/conversations/${id}/read`)
      .set(b.headers)
      .send({ lastReadMessageId: latest })
      .expect((r) => expect([200, 204]).toContain(r.status));
    const after = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set(b.headers)
      .expect(200);
    const mine = after.body.data.items.find((c: { id: string }) => c.id === id);
    expect(mine.unreadCount).toBe(0);
  });

  it('falls back to the previous visible message when the last one is hidden', async () => {
    const [a, b] = await pair();
    const id = await thread(a, b);
    const msg = await send(id, a, 'moderated away');
    await pool.query(`UPDATE messages SET status = 'hidden' WHERE id = $1`, [msg]);

    const inbox = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set(b.headers)
      .expect(200);
    const row = inbox.body.data.items.find((c: { id: string }) => c.id === id);
    expect(row.lastMessagePreview).toBe('hello');
    expect(JSON.stringify(inbox.body)).not.toContain('moderated away');
  });

  it('omits moderation-hidden messages from the thread', async () => {
    const [a, b] = await pair();
    const id = await thread(a, b);
    const msg = await send(id, a, 'hide me');
    await pool.query(`UPDATE messages SET status = 'hidden' WHERE id = $1`, [msg]);

    const res = await list(id, b).expect(200);
    expect(res.body.data.items.map((m: { id: string }) => m.id)).not.toContain(msg);
    expect(JSON.stringify(res.body)).not.toContain('hide me');
  });
});
