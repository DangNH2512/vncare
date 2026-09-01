import type { INestApplication } from '@nestjs/common';
import {
  StandardSchemaSerializerInterceptor,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { envelope, EventResponse } from '@dnc/contracts';
import { AppModule } from '../../../src/app.module.js';
import { createOpenApiDocument } from '../../../src/common/openapi.js';

/**
 * Proves the contract chain end to end:
 * Zod schema -> StandardSchemaValidationPipe (input) ->
 * StandardSchemaSerializerInterceptor (output) -> OpenAPI generation.
 */
describe('event contract chain (spike gate)', () => {
  let app: INestApplication;

  const validBody = {
    title: 'Sunday beach volleyball',
    areaId: '018f4f4e-89ab-7def-8123-456789abcdef',
    lat: 16.06,
    lng: 108.247,
    startsAt: '2026-10-04T09:00:00.000Z',
    capacity: 12,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    app.useGlobalInterceptors(
      new StandardSchemaSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns the standard envelope', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('rejects an invalid body with 400 (title below minimum length)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/events')
      .send({ ...validBody, title: 'ab' })
      .expect(400);
  });

  it('rejects a body with an out-of-range coordinate', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/events')
      .send({ ...validBody, lat: 123 })
      .expect(400);
  });

  it('accepts a valid body, applies schema defaults and returns a parseable response', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/events')
      .send(validBody)
      .expect(201);

    const parsed = envelope(EventResponse).parse(res.body);
    expect(parsed.success).toBe(true);
    expect(parsed.data.title).toBe(validBody.title);
    expect(parsed.data.status).toBe('draft');
    // Applied by the Zod default, not sent by the client.
    expect(parsed.data.requiredTrustLevel).toBe(0);
  });

  it('strips internal fields from the response via the output schema', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/events')
      .send(validBody)
      .expect(201);
    expect(res.body.data).not.toHaveProperty('internalModerationNote');
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
