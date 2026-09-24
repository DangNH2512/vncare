import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createActor, createTestApp, setRole, trackActor, type Actor } from '../../support/harness.js';

const ENDPOINT = '/api/v1/admin/system/health';

/** Pulls the refresh cookie out of a Set-Cookie header list. */
function refreshCookie(headers: Record<string, unknown>): string | undefined {
  const raw = headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  return list.find((cookie) => cookie.startsWith('dnc_refresh='));
}

/**
 * Covers RolesGuard end to end against the one endpoint gated by it today,
 * plus the guard-ordering and staleness rules the task board pins down:
 * D-07 (role denies before trust), and "a role change only takes effect on a
 * freshly minted token" (AC-6/AC-7), which is the same claims-are-not-live
 * behaviour the trust ladder already relies on.
 */
describe('admin system health', () => {
  describe('with every dependency running', () => {
    let app: INestApplication;
    let member: Actor;
    let curator: Actor;
    let moderator: Actor;
    let admin: Actor;
    let superAdmin: Actor;

    beforeAll(async () => {
      app = await createTestApp();
      member = await createActor(app);
      curator = await createActor(app, { role: 'curator' });
      moderator = await createActor(app, { role: 'moderator' });
      admin = await createActor(app, { role: 'admin' });
      superAdmin = await createActor(app, { role: 'super_admin' });
    });

    afterAll(async () => {
      await app.close();
    });

    it('1. rejects a missing token with 401 UNAUTHENTICATED', async () => {
      const res = await request(app.getHttpServer()).get(ENDPOINT);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        code: 'UNAUTHENTICATED',
        messageKey: 'errors.auth.unauthenticated',
      });
    });

    it('2. rejects a member with 403 ROLE_NOT_ALLOWED and no allowed-role list', async () => {
      const res = await request(app.getHttpServer()).get(ENDPOINT).set(member.headers);
      expect(res.status).toBe(403);
      // Strict equality, not a subset match: a `details` field creeping back
      // in would leak exactly the roles a prober should not learn.
      expect(res.body).toEqual({
        code: 'ROLE_NOT_ALLOWED',
        messageKey: 'errors.auth.roleNotAllowed',
      });
    });

    it('3. lets admin through with the full readiness shape', async () => {
      const res = await request(app.getHttpServer()).get(ENDPOINT).set(admin.headers).expect(200);
      expect(res.body).toEqual({
        success: true,
        data: {
          status: 'ok',
          checks: { database: 'up', redisCache: 'up', redisQueue: 'up' },
          environment: expect.any(String),
          uptimeSeconds: expect.any(Number),
          checkedAt: expect.any(String),
        },
      });
      // Round-trips through Date without losing information: a genuine
      // ISO-8601 instant, not a formatted display string.
      expect(new Date(res.body.data.checkedAt as string).toISOString()).toBe(
        res.body.data.checkedAt,
      );
    });

    it('4. lets super_admin through with the same shape', async () => {
      const res = await request(app.getHttpServer())
        .get(ENDPOINT)
        .set(superAdmin.headers)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.checks).toEqual({
        database: 'up',
        redisCache: 'up',
        redisQueue: 'up',
      });
    });

    it('5. rejects curator with 403', async () => {
      await request(app.getHttpServer()).get(ENDPOINT).set(curator.headers).expect(403);
    });

    it('6. rejects moderator with 403', async () => {
      await request(app.getHttpServer()).get(ENDPOINT).set(moderator.headers).expect(403);
    });

    describe('when an account is promoted mid-session', () => {
      let userId: string;
      let email: string;
      let password: string;
      let oldAccessToken: string;
      let cookie: string;

      beforeAll(async () => {
        const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
        email = `e2e_${suffix}@example.test`;
        password = 'e2e-password-long-enough';

        const registered = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email,
            password,
            displayName: `E2E ${suffix.slice(0, 6)}`,
            handle: `e2e_${suffix}`,
          })
          .expect(201);

        userId = registered.body.data.user.id as string;
        oldAccessToken = registered.body.data.accessToken as string;
        cookie = refreshCookie(registered.headers as Record<string, unknown>) as string;
        trackActor(userId);

        // Promotes the account directly in the database — there is no
        // role-assignment endpoint yet — while the access token minted above
        // stays outstanding and unexpired.
        await setRole(userId, 'admin');
      });

      it('7. keeps rejecting the token issued before the promotion', async () => {
        await request(app.getHttpServer())
          .get(ENDPOINT)
          .set({ authorization: `Bearer ${oldAccessToken}` })
          .expect(403);
      });

      it('8. accepts a token reissued after the promotion via refresh', async () => {
        const refreshed = await request(app.getHttpServer())
          .post('/api/v1/auth/refresh')
          .set('Cookie', cookie)
          .expect(200);
        const freshAccessToken = refreshed.body.data.accessToken as string;

        const res = await request(app.getHttpServer())
          .get(ENDPOINT)
          .set({ authorization: `Bearer ${freshAccessToken}` })
          .expect(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('ok');
      });
    });
  });

  describe('with the queue Redis unreachable', () => {
    let app: INestApplication;
    let admin: Actor;
    const original = process.env['REDIS_QUEUE_URL'];

    beforeAll(async () => {
      // Nothing listens on this port; the client factory reads the URL at boot.
      process.env['REDIS_QUEUE_URL'] = 'redis://localhost:6399';
      app = await createTestApp();
      admin = await createActor(app, { role: 'admin' });
    });

    afterAll(async () => {
      await app.close();
      if (original === undefined) {
        delete process.env['REDIS_QUEUE_URL'];
      } else {
        process.env['REDIS_QUEUE_URL'] = original;
      }
    });

    it('9. still answers 200 for admin, reporting degraded with redisQueue down', async () => {
      const res = await request(app.getHttpServer()).get(ENDPOINT).set(admin.headers).expect(200);
      expect(res.body).toEqual({
        success: true,
        data: {
          status: 'degraded',
          checks: { database: 'up', redisCache: 'up', redisQueue: 'down' },
          environment: expect.any(String),
          uptimeSeconds: expect.any(Number),
          checkedAt: expect.any(String),
        },
      });
    });
  });
});
