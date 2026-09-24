import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from '../../support/harness.js';

describe('health module', () => {
  describe('with every dependency running', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createTestApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('answers liveness without touching a dependency', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
      expect(res.body).toEqual({ success: true, data: { status: 'ok' } });
    });

    it('reports ready when PostgreSQL and both Redis instances answer', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
      expect(res.body).toEqual({
        success: true,
        data: {
          status: 'ok',
          checks: { database: 'up', redisCache: 'up', redisQueue: 'up' },
        },
      });
    });
  });

  describe('with the queue Redis unreachable', () => {
    let app: INestApplication;
    const original = process.env['REDIS_QUEUE_URL'];

    beforeAll(async () => {
      // Nothing listens on this port; the client factory reads the URL at boot.
      process.env['REDIS_QUEUE_URL'] = 'redis://localhost:6399';
      app = await createTestApp();
    });

    afterAll(async () => {
      await app.close();
      if (original === undefined) {
        delete process.env['REDIS_QUEUE_URL'];
      } else {
        process.env['REDIS_QUEUE_URL'] = original;
      }
    });

    it('still boots and serves liveness', async () => {
      await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    });

    it('answers readiness with 503 and names the failed dependency', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503);
      expect(res.body).toEqual({
        success: false,
        data: {
          status: 'degraded',
          checks: { database: 'up', redisCache: 'up', redisQueue: 'down' },
        },
      });
    });
  });
});
