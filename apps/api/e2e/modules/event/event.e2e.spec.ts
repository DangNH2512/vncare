import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { envelope, EventResponse } from '@dnc/contracts';
import { createOpenApiDocument } from '../../../src/common/openapi.js';
import { asUser, createTestApp, newUserId, seedArea } from '../../support/harness.js';

/**
 * Proves the contract chain end to end — Zod schema -> validation pipe ->
 * serializer -> OpenAPI — now against the real database, and the ownership
 * boundary that guards every write.
 */
describe('event module', () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;

  const organizer = newUserId();
  const stranger = newUserId();

  const validBody = () => ({
    title: 'Sunday beach volleyball',
    areaId,
    lat: 16.06,
    lng: 108.247,
    startsAt: '2026-10-04T09:00:00.000Z',
    capacity: 12,
  });

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
  });

  it('GET /api/v1/health returns the standard envelope', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('rejects an unauthenticated write with 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/events').send(validBody()).expect(401);
  });

  it('rejects a T0 account with 403 before the body is even considered', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/events')
      .set(asUser(organizer, 0))
      .send(validBody())
      .expect(403);
  });

  it('rejects an invalid body with 400 (title below minimum length)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/events')
      .set(asUser(organizer))
      .send({ ...validBody(), title: 'ab' })
      .expect(400);
  });

  it('rejects a body with an out-of-range coordinate', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/events')
      .set(asUser(organizer))
      .send({ ...validBody(), lat: 123 })
      .expect(400);
  });

  it('accepts a valid body, applies schema defaults and persists the occurrence', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set(asUser(organizer))
      .send(validBody())
      .expect(201);

    const parsed = envelope(EventResponse).parse(res.body);
    expect(parsed.data.title).toBe('Sunday beach volleyball');
    expect(parsed.data.status).toBe('draft');
    // Applied by the Zod default, not sent by the client.
    expect(parsed.data.requiredTrustLevel).toBe(0);
    // Time and capacity live on event_occurrences and are flattened back in.
    expect(parsed.data.capacity).toBe(12);
    expect(parsed.data.seatsTaken).toBe(0);
    // Round-tripped through geography(Point,4326) without swapping the axes.
    expect(parsed.data.lat).toBeCloseTo(16.06, 5);
    expect(parsed.data.lng).toBeCloseTo(108.247, 5);
  });

  it('keeps internal columns out of the response', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set(asUser(organizer))
      .send(validBody())
      .expect(201);

    for (const leak of ['organizerId', 'organizer_id', 'location', 'deletedAt', 'deleted_at']) {
      expect(res.body.data).not.toHaveProperty(leak);
    }
  });

  it('hides a draft from everyone but its organizer', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set(asUser(organizer))
      .send(validBody())
      .expect(201);
    const id: string = created.body.data.id;

    await request(app.getHttpServer())
      .get(`/api/v1/events/${id}`)
      .set(asUser(organizer))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/events/${id}`)
      .set(asUser(stranger))
      .expect(404);
  });

  it('refuses an update from someone who is not the organizer', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set(asUser(organizer))
      .send(validBody())
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/events/${created.body.data.id}`)
      .set(asUser(stranger))
      .send({ title: 'Hijacked title' })
      .expect(403);
  });

  it('publishes, then finds the event by radius but not from far away', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set(asUser(organizer))
      .send({ ...validBody(), title: 'Radius probe event' })
      .expect(201);
    const id: string = created.body.data.id;

    await request(app.getHttpServer())
      .put(`/api/v1/events/${id}/status`)
      .set(asUser(organizer))
      .send({ status: 'published' })
      .expect(200);

    const near = await request(app.getHttpServer())
      .get('/api/v1/events')
      .query({ areaId, lat: 16.06, lng: 108.247, radiusMeters: 1500, limit: 50 })
      .set(asUser(stranger))
      .expect(200);
    expect(near.body.data.items.map((e: { id: string }) => e.id)).toContain(id);

    // Hoi An, ~25 km south: outside a 1.5 km radius.
    const far = await request(app.getHttpServer())
      .get('/api/v1/events')
      .query({ areaId, lat: 15.88, lng: 108.33, radiusMeters: 1500, limit: 50 })
      .set(asUser(stranger))
      .expect(200);
    expect(far.body.data.items.map((e: { id: string }) => e.id)).not.toContain(id);
  });

  it('rejects a radius search that omits its coordinates', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/events')
      .query({ radiusMeters: 1500 })
      .set(asUser(stranger))
      .expect(400);
  });

  it('generates OpenAPI request constraints from the Zod schema', () => {
    const doc = createOpenApiDocument(app);
    const post = doc.paths['/api/v1/events']?.post;
    expect(post, 'POST /api/v1/events present in OpenAPI').toBeDefined();

    const media = (post as Record<string, any>)['requestBody']?.content?.[
      'application/json'
    ];
    expect(media?.schema, 'request body schema present').toBeDefined();

    const resolve = (schema: Record<string, any>): Record<string, any> => {
      const ref: string | undefined = schema['$ref'];
      if (!ref) return schema;
      const name = ref.split('/').at(-1) as string;
      return (doc.components?.schemas?.[name] ?? {}) as Record<string, any>;
    };

    const body = resolve(media.schema as Record<string, any>);
    const title = resolve((body['properties']?.['title'] ?? {}) as Record<string, any>);
    expect(title['minLength']).toBe(3);
    expect(title['maxLength']).toBe(120);
    expect(body['required']).toContain('areaId');
  });
});
