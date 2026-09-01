import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ConversationResponse, envelope, MessageResponse } from '@dnc/contracts';
import {
  createActor,
  createTestApp,
  seedArea,
  type Actor,
} from '../../support/harness.js';

describe('chat module', () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;

  let alice: Actor;
  let bob: Actor;
  let carol: Actor;
  /** T1: enough to comment, not enough to open a direct thread with a stranger. */
  let untrusted: Actor;

  /** A fresh T2 pair, so a test that closes a thread cannot affect another. */
  const pair = async (): Promise<[Actor, Actor]> => [
    await createActor(app, { trustLevel: 2 }),
    await createActor(app, { trustLevel: 2 }),
  ];

  const openDirect = (from: Actor, to: Actor) =>
    request(app.getHttpServer())
      .post('/api/v1/conversations')
      .set(from.headers)
      .send({ type: 'direct', recipientUserId: to.id });

  const send = (conversationId: string, from: Actor, body: string) =>
    request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(from.headers)
      .send({ type: 'text', body, clientMessageId: randomUUID() });

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    alice = await createActor(app, { trustLevel: 2 });
    bob = await createActor(app, { trustLevel: 2 });
    carol = await createActor(app, { trustLevel: 2 });
    untrusted = await createActor(app);
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
  });

  it('requires T2 to open a direct conversation with a stranger', async () => {
    await openDirect(untrusted, bob).expect(403);
  });

  it('refuses a conversation with yourself', async () => {
    await openDirect(alice, alice).expect(403);
  });

  it('opens a direct conversation as a pending request with both participants', async () => {
    const res = await openDirect(alice, bob).expect(201);
    const parsed = envelope(ConversationResponse).parse(res.body);
    expect(parsed.data.type).toBe('direct');
    expect(parsed.data.requestStatus).toBe('pending');
    expect(parsed.data.createdByUserId).toBe(alice.id);
    expect(parsed.data.participants.map((p) => p.userId).toSorted()).toEqual(
      [alice.id, bob.id].toSorted(),
    );
  });

  it('resolves the same pair to one conversation regardless of who asks', async () => {
    const first = await openDirect(alice, bob).expect(201);
    const second = await openDirect(bob, alice).expect(201);
    expect(second.body.data.id).toBe(first.body.data.id);
  });

  it('hides a conversation from a non-participant behind a 404', async () => {
    const conversation = await openDirect(alice, bob).expect(201);
    await request(app.getHttpServer())
      .get(`/api/v1/conversations/${conversation.body.data.id}`)
      .set(carol.headers)
      .expect(404);
  });

  it('stops the opener at the request quota until the recipient answers', async () => {
    const conversation = await openDirect(alice, bob).expect(201);
    const id: string = conversation.body.data.id;

    // The default quota is one opening message.
    await send(id, alice, 'Hi, are you going to the language exchange?').expect(201);
    await send(id, alice, 'Following up on that').expect(403);

    // The recipient is never quota-limited: replying is consent.
    await send(id, bob, 'Yes, see you there').expect(201);
  });

  it('lifts the quota once the request is accepted, and only the recipient may accept', async () => {
    const conversation = await openDirect(alice, carol).expect(201);
    const id: string = conversation.body.data.id;
    await send(id, alice, 'Opening message').expect(201);
    await send(id, alice, 'Blocked by quota').expect(403);

    await request(app.getHttpServer())
      .put(`/api/v1/conversations/${id}/request`)
      .set(alice.headers)
      .send({ decision: 'accepted' })
      .expect(403);

    await request(app.getHttpServer())
      .put(`/api/v1/conversations/${id}/request`)
      .set(carol.headers)
      .send({ decision: 'accepted' })
      .expect(200);

    await send(id, alice, 'Now allowed').expect(201);
  });

  it('closes the thread when the recipient blocks it', async () => {
    const blocker = await createActor(app, { trustLevel: 2 });
    const conversation = await openDirect(alice, blocker).expect(201);
    const id: string = conversation.body.data.id;

    await request(app.getHttpServer())
      .put(`/api/v1/conversations/${id}/request`)
      .set(blocker.headers)
      .send({ decision: 'blocked' })
      .expect(200);

    await send(id, alice, 'Should not get through').expect(403);
  });

  /**
   * The idempotency key belongs to the client: a mobile retry after a dropped
   * connection must resolve to the message already stored, not a second one.
   */
  it('returns the original message when the same clientMessageId is retried', async () => {
    const [sender, recipient] = await pair();
    const conversation = await openDirect(sender, recipient).expect(201);
    const id: string = conversation.body.data.id;
    const clientMessageId = randomUUID();

    const first = await request(app.getHttpServer())
      .post(`/api/v1/conversations/${id}/messages`)
      .set(sender.headers)
      .send({ type: 'text', body: 'Retry me', clientMessageId })
      .expect(201);

    const retry = await request(app.getHttpServer())
      .post(`/api/v1/conversations/${id}/messages`)
      .set(sender.headers)
      .send({ type: 'text', body: 'Retry me', clientMessageId })
      .expect(201);

    expect(retry.body.data.id).toBe(first.body.data.id);

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${id}/messages`)
      .set(sender.headers)
      .expect(200);
    expect(listed.body.data.items).toHaveLength(1);
  });

  it('rejects a payload that does not match its message type', async () => {
    const [sender, recipient] = await pair();
    const conversation = await openDirect(sender, recipient).expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversation.body.data.id}/messages`)
      .set(sender.headers)
      .send({ type: 'image', body: 'no media id', clientMessageId: randomUUID() })
      .expect(400);
  });

  it('rejects a message with no idempotency key', async () => {
    const [sender, recipient] = await pair();
    const conversation = await openDirect(sender, recipient).expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversation.body.data.id}/messages`)
      .set(sender.headers)
      .send({ type: 'text', body: 'no key' })
      .expect(400);
  });

  it('counts unread for the recipient only, and clears it on read', async () => {
    const [speaker, listener] = await pair();
    const conversation = await openDirect(speaker, listener).expect(201);
    const id: string = conversation.body.data.id;

    await request(app.getHttpServer())
      .put(`/api/v1/conversations/${id}/request`)
      .set(listener.headers)
      .send({ decision: 'accepted' })
      .expect(200);

    const sent = await send(id, speaker, 'First').expect(201);
    await send(id, speaker, 'Second').expect(201);

    const speakerView = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${id}`)
      .set(speaker.headers)
      .expect(200);
    expect(speakerView.body.data.unreadCount).toBe(0);
    expect(speakerView.body.data.messageCount).toBe(2);
    expect(speakerView.body.data.lastMessagePreview).toBe('Second');

    const listenerView = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${id}`)
      .set(listener.headers)
      .expect(200);
    expect(listenerView.body.data.unreadCount).toBe(2);

    const messages = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${id}/messages`)
      .set(listener.headers)
      .expect(200);
    // Newest first.
    expect(messages.body.data.items[0].body).toBe('Second');
    expect(messages.body.data.items.at(-1).id).toBe(sent.body.data.id);

    const afterRead = await request(app.getHttpServer())
      .put(`/api/v1/conversations/${id}/read`)
      .set(listener.headers)
      .send({ lastReadMessageId: messages.body.data.items[0].id })
      .expect(200);
    expect(afterRead.body.data.unreadCount).toBe(0);
  });

  it('never exposes another participant read state', async () => {
    const [a, b] = await pair();
    const conversation = await openDirect(a, b).expect(201);
    const participant = conversation.body.data.participants[0];
    for (const leak of ['unreadCount', 'lastReadAt', 'lastReadMessageId', 'mutedUntil']) {
      expect(participant).not.toHaveProperty(leak);
    }
  });

  it('lets the sender delete their own message and refuses someone else', async () => {
    const [speaker, listener] = await pair();
    const conversation = await openDirect(speaker, listener).expect(201);
    const id: string = conversation.body.data.id;
    const message = await send(id, speaker, 'Delete me').expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/conversations/${id}/messages/${message.body.data.id}`)
      .set(listener.headers)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/v1/conversations/${id}/messages/${message.body.data.id}`)
      .set(speaker.headers)
      .expect(204);

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${id}/messages`)
      .set(speaker.headers)
      .expect(200);
    expect(listed.body.data.items).toHaveLength(0);
  });

  it('opens an event group room and lets a member join it', async () => {
    const host = await createActor(app, { trustLevel: 2 });
    const member = await createActor(app, { trustLevel: 2 });

    const event = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set(host.headers)
      .send({
        title: 'Chat room probe event',
        areaId,
        lat: 16.06,
        lng: 108.247,
        startsAt: '2026-12-01T09:00:00.000Z',
        capacity: 8,
      })
      .expect(201);

    const room = await request(app.getHttpServer())
      .post('/api/v1/conversations')
      .set(host.headers)
      .send({ type: 'event_group', eventId: event.body.data.id })
      .expect(201);
    expect(room.body.data.type).toBe('event_group');
    // A room needs no request flow; membership is the gate.
    expect(room.body.data.requestStatus).toBe('accepted');

    const id: string = room.body.data.id;
    await request(app.getHttpServer())
      .get(`/api/v1/conversations/${id}`)
      .set(member.headers)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${id}/participants`)
      .set(member.headers)
      .expect(201);

    const joined = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${id}`)
      .set(member.headers)
      .expect(200);
    expect(joined.body.data.participants.map((p: { userId: string }) => p.userId)).toContain(
      member.id,
    );

    const message = await send(id, member, 'Is it still on tomorrow?').expect(201);
    envelope(MessageResponse).parse(message.body);
  });

  it('lists the inbox most recently active first', async () => {
    const owner = await createActor(app, { trustLevel: 2 });
    const first = await openDirect(owner, await createActor(app, { trustLevel: 2 })).expect(201);
    const second = await openDirect(owner, await createActor(app, { trustLevel: 2 })).expect(201);

    await send(first.body.data.id, owner, 'older').expect(201);
    await send(second.body.data.id, owner, 'newer').expect(201);

    const inbox = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set(owner.headers)
      .expect(200);
    expect(inbox.body.data.items[0].id).toBe(second.body.data.id);
    expect(inbox.body.data.items[1].id).toBe(first.body.data.id);
  });
});
