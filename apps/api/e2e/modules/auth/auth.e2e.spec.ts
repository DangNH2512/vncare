import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthSessionResponse, envelope } from '@dnc/contracts';
import {
  ageRotations,
  createActor,
  createTestApp,
  seedArea,
  type Actor,
} from '../../support/harness.js';

/** Pulls the refresh cookie out of a Set-Cookie header list. */
function refreshCookie(headers: Record<string, unknown>): string | undefined {
  const raw = headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  return list.find((cookie) => cookie.startsWith('dnc_refresh='));
}

describe('auth module', () => {
  let app: INestApplication;
  let cleanup: () => Promise<void>;
  let existing: Actor;

  const account = () => ({
    email: `e2e_${randomUUID().replaceAll('-', '').slice(0, 12)}@example.test`,
    password: 'a-sufficiently-long-passphrase',
    displayName: 'New Member',
    handle: `h_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
  });

  beforeAll(async () => {
    ({ cleanup } = await seedArea());
    app = await createTestApp();
    existing = await createActor(app);
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
  });

  it('registers an account and returns a usable session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(account())
      .expect(201);

    const parsed = envelope(AuthSessionResponse).parse(res.body);
    expect(parsed.data.user.role).toBe('member');
    // Registration grants T1 so a new member can post; see the constant in
    // AuthService for what changes when email verification lands.
    expect(parsed.data.user.trustLevel).toBe(1);
    expect(parsed.data.user.emailVerified).toBe(false);

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set({ authorization: `Bearer ${parsed.data.accessToken}` })
      .expect(200);
    expect(me.body.data.id).toBe(parsed.data.user.id);
  });

  /** The token that can mint sessions must be out of reach of any script on the page. */
  it('sets the refresh token as an httpOnly, path-scoped cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(account())
      .expect(201);

    const cookie = refreshCookie(res.headers as Record<string, unknown>);
    expect(cookie).toBeDefined();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/api/v1/auth');
    expect(cookie).toMatch(/SameSite=Lax/i);
    // The response body must not carry it as well; that would undo the cookie.
    expect(JSON.stringify(res.body)).not.toContain('dnc_refresh');
    expect(res.body.data).not.toHaveProperty('refreshToken');
  });

  it('never returns the password hash', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(account())
      .expect(201);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('argon2');
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('password_hash');
  });

  it('rejects a short password and a malformed handle', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...account(), password: 'short' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...account(), handle: 'Has Capitals And Spaces' })
      .expect(400);
  });

  it('refuses a duplicate email and a duplicate handle', async () => {
    const first = account();
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(first).expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...account(), email: first.email })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...account(), handle: first.handle })
      .expect(409);
  });

  /** Emails are case-insensitive, so one person cannot hold two accounts by capitalisation. */
  it('treats an email as case-insensitive', async () => {
    const first = account();
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(first).expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...account(), email: first.email.toUpperCase() })
      .expect(409);
  });

  it('signs in with the right password and refuses the wrong one', async () => {
    const created = account();
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(created).expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: created.email, password: created.password })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: created.email, password: 'not-the-password' })
      .expect(401);
  });

  /**
   * A wrong password and an unknown account must be indistinguishable, or the
   * sign-in form becomes a way to enumerate who has an account here.
   */
  it('answers the same way for an unknown account as for a wrong password', async () => {
    const created = account();
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(created).expect(201);

    const wrongPassword = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: created.email, password: 'not-the-password' })
      .expect(401);

    const noSuchUser = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `absent_${randomUUID()}@example.test`, password: 'not-the-password' })
      .expect(401);

    expect(noSuchUser.body).toEqual(wrongPassword.body);
  });

  it('rejects a forged or absent access token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set({ authorization: 'Bearer not.a.real.token' })
      .expect(401);
    // A well-formed header with the wrong scheme is not a credential either.
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set({ authorization: existing.accessToken })
      .expect(401);
  });

  it('rotates the refresh token and issues a new access token', async () => {
    const created = account();
    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(created)
      .expect(201);
    const cookie = refreshCookie(registered.headers as Record<string, unknown>) as string;

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .expect(200);
    expect(refreshed.body.data.user.id).toBe(registered.body.data.user.id);
    expect(refreshCookie(refreshed.headers as Record<string, unknown>)).not.toBe(cookie);
  });

  /**
   * Two refreshes firing at once is an honest client racing itself — a re-run
   * effect, two restored tabs — not a stolen token. Both must succeed, or
   * opening a second tab signs the user out.
   */
  it('tolerates two refreshes racing on the same token', async () => {
    const created = account();
    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(created)
      .expect(201);
    const cookie = refreshCookie(registered.headers as Record<string, unknown>) as string;

    const [a, b] = await Promise.all([
      request(app.getHttpServer()).post('/api/v1/auth/refresh').set('Cookie', cookie),
      request(app.getHttpServer()).post('/api/v1/auth/refresh').set('Cookie', cookie),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
  });

  /**
   * Past the grace window a spent token is theft, not a race: the whole
   * rotation family is dropped, which signs out the legitimate client too —
   * the alternative is leaving an attacker holding a valid session.
   *
   * The rotation is aged in the database rather than by waiting, so the test
   * pins the rule instead of the clock.
   */
  it('revokes the whole family when a long-spent refresh token is replayed', async () => {
    const created = account();
    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(created)
      .expect(201);
    const first = refreshCookie(registered.headers as Record<string, unknown>) as string;

    const rotated = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', first)
      .expect(200);
    const second = refreshCookie(rotated.headers as Record<string, unknown>) as string;

    await ageRotations(registered.body.data.user.id);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', first)
      .expect(401);

    // The token that was still valid a moment ago is now dead as well.
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', second)
      .expect(401);
  });

  /**
   * A visitor who never signed in has no session to restore. That is the
   * ordinary case on every first page load, not an authentication failure, and
   * answering 401 would paint an error in the console of every anonymous
   * reader. A cookie that is present but bad still answers 401.
   */
  it('answers 204 when there is no refresh cookie at all', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/refresh').expect(204);
  });

  it('answers 401 for a refresh cookie that is present but wrong', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'dnc_refresh=not-a-real-token')
      .expect(401);
  });

  it('signs out, after which the refresh token no longer works', async () => {
    const created = account();
    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(created)
      .expect(201);
    const cookie = refreshCookie(registered.headers as Record<string, unknown>) as string;

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .expect(401);
  });
});
