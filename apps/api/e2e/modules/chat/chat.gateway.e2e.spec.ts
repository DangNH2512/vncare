import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CHAT_SOCKET_EVENTS, type MessageResponseT } from '@dnc/contracts';
import {
  createActor,
  createTestApp,
  seedArea,
  type Actor,
} from '../../support/harness.js';

/**
 * Realtime delivery, end to end over a real socket.
 *
 * The assertions are deliberately about authorization as much as delivery: a
 * gateway that broadcasts correctly but joins the wrong sockets to a room is a
 * privacy incident, and only a real connection can show the difference.
 */
describe('chat gateway', () => {
  let app: INestApplication;
  let cleanup: () => Promise<void>;
  let url: string;
  const sockets: Socket[] = [];

  let speaker: Actor;
  let listener: Actor;
  let outsider: Actor;
  let conversationId: string;

  const connect = (actor: Actor): Promise<Socket> =>
    new Promise((resolve, reject) => {
      const socket = io(`${url}/chat`, {
        transports: ['websocket'],
        // The socket presents the same access token as HTTP; there is no
        // second authentication path to get wrong.
        auth: { token: actor.accessToken },
      });
      sockets.push(socket);
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', reject);
    });

  const waitFor = <T>(socket: Socket, event: string, ms = 2000): Promise<T> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
      socket.once(event, (payload: T) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });

  beforeAll(async () => {
    ({ cleanup } = await seedArea());
    app = await createTestApp();
    speaker = await createActor(app, { trustLevel: 2 });
    listener = await createActor(app, { trustLevel: 2 });
    outsider = await createActor(app, { trustLevel: 2 });
    // createTestApp already bound the port; read it rather than listening twice.
    const address = app.getHttpServer().address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}`;

    const conversation = await request(app.getHttpServer())
      .post('/api/v1/conversations')
      .set(speaker.headers)
      .send({ type: 'direct', recipientUserId: listener.id })
      .expect(201);
    conversationId = conversation.body.data.id;

    await request(app.getHttpServer())
      .put(`/api/v1/conversations/${conversationId}/request`)
      .set(listener.headers)
      .send({ decision: 'accepted' })
      .expect(200);
  });

  afterAll(async () => {
    for (const socket of sockets) socket.disconnect();
    await app.close();
    await cleanup();
  });

  it('refuses a socket with no credential', async () => {
    const anonymous = io(`${url}/chat`, { transports: ['websocket'] });
    sockets.push(anonymous);
    const disconnected = await new Promise<boolean>((resolve) => {
      anonymous.on('disconnect', () => resolve(true));
      setTimeout(() => resolve(false), 2000);
    });
    expect(disconnected).toBe(true);
  });

  it('refuses a socket presenting a forged token', async () => {
    const forged = io(`${url}/chat`, {
      transports: ['websocket'],
      auth: { token: 'not.a.real.token' },
    });
    sockets.push(forged);
    const disconnected = await new Promise<boolean>((resolve) => {
      forged.on('disconnect', () => resolve(true));
      setTimeout(() => resolve(false), 2000);
    });
    expect(disconnected).toBe(true);
  });

  it('lets a participant join their conversation room', async () => {
    const socket = await connect(listener);
    const ack = await socket.emitWithAck('conversation.join', { conversationId });
    expect(ack).toEqual({ joined: true });
  });

  it('refuses a room join from someone who is not a participant', async () => {
    const socket = await connect(outsider);
    const ack = await socket.emitWithAck('conversation.join', { conversationId });
    expect(ack).toEqual({ joined: false });
  });

  it('delivers a message posted over REST to the joined participant', async () => {
    const socket = await connect(listener);
    await socket.emitWithAck('conversation.join', { conversationId });

    const delivered = waitFor<MessageResponseT>(socket, CHAT_SOCKET_EVENTS.messageCreated);
    const sent = await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(speaker.headers)
      .send({ type: 'text', body: 'Realtime hello', clientMessageId: randomUUID() })
      .expect(201);

    const payload = await delivered;
    expect(payload.id).toBe(sent.body.data.id);
    expect(payload.body).toBe('Realtime hello');
  });

  /** The inbox must move even when the recipient is not looking at the thread. */
  it('notifies a participant who has joined no room', async () => {
    const socket = await connect(listener);
    const notified = waitFor<{ conversationId: string }>(
      socket,
      CHAT_SOCKET_EVENTS.conversationUpdated,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(speaker.headers)
      .send({ type: 'text', body: 'Inbox ping', clientMessageId: randomUUID() })
      .expect(201);

    expect((await notified).conversationId).toBe(conversationId);
  });

  it('never delivers a message to a non-participant socket', async () => {
    const intruder = await connect(outsider);
    let received = false;
    intruder.on(CHAT_SOCKET_EVENTS.messageCreated, () => {
      received = true;
    });

    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(speaker.headers)
      .send({ type: 'text', body: 'Private', clientMessageId: randomUUID() })
      .expect(201);

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(received).toBe(false);
  });
});
