import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  StandardSchemaSerializerInterceptor,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';

/**
 * Shared setup for the API integration specs.
 *
 * Runs against the local PostGIS container, not a mock: most of the behaviour
 * under test is enforced by the database itself — partial unique indexes, CHECK
 * constraints, foreign keys, counter triggers. Actors are real accounts created
 * through the registration endpoint.
 */
export const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://dnc:dnc@localhost:5433/dnc';

export async function createTestApp(): Promise<INestApplication> {
  process.env['DATABASE_URL'] = DATABASE_URL;
  // Vitest runs each spec file in its own worker, each with its own pool. Nine
  // files at the production default of 10 is ninety connections against a
  // max_connections of 100 — plus this file's own throwaway pools and whatever
  // else is pointed at the same database. Four is ample for a spec and leaves
  // the ceiling far away.
  process.env['DATABASE_POOL_MAX'] ??= '4';
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalInterceptors(new StandardSchemaSerializerInterceptor(app.get(Reflector)));
  await app.init();

  // Bind once on an ephemeral port. Given a server that is not yet listening,
  // supertest starts a throwaway one per request; a handful of parallel calls
  // then reset connections for reasons that have nothing to do with the API,
  // which is what made the concurrency specs flaky. One listener serves them all.
  await app.listen(0);
  return app;
}

/** A registered account plus the headers that authenticate as it. */
export interface Actor {
  id: string;
  handle: string;
  email: string;
  accessToken: string;
  headers: Record<string, string>;
}

/** Every actor a spec file created, so teardown can find their rows. */
const actors: string[] = [];

/**
 * Registers a real account.
 *
 * Registration grants T1, which is what most routes require. `trustLevel`
 * overrides it directly in the database for the cases that need a different
 * rung — a T0 account to prove the gate bites, or T2 to open a direct message.
 */
export async function createActor(
  app: INestApplication,
  options: { trustLevel?: number } = {},
): Promise<Actor> {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const email = `e2e_${suffix}@example.test`;

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      email,
      password: 'e2e-password-long-enough',
      displayName: `E2E ${suffix.slice(0, 6)}`,
      handle: `e2e_${suffix}`,
    })
    .expect(201);

  const { accessToken, user } = res.body.data as {
    accessToken: string;
    user: { id: string; handle: string };
  };
  actors.push(user.id);

  if (options.trustLevel !== undefined && options.trustLevel !== 1) {
    await setTrustLevel(user.id, options.trustLevel);
    // The level is a token claim, so it only takes effect on a fresh token.
    return refreshedActor(app, email, user.id, user.handle);
  }

  return {
    id: user.id,
    handle: user.handle,
    email,
    accessToken,
    headers: bearer(accessToken),
  };
}

async function refreshedActor(
  app: INestApplication,
  email: string,
  id: string,
  handle: string,
): Promise<Actor> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: 'e2e-password-long-enough' })
    .expect(200);
  const accessToken = res.body.data.accessToken as string;
  return { id, handle, email, accessToken, headers: bearer(accessToken) };
}

export function bearer(accessToken: string): Record<string, string> {
  return { authorization: `Bearer ${accessToken}` };
}

/** Moves an account up or down the trust ladder without going through the job that normally does it. */
export async function setTrustLevel(userId: string, trustLevel: number): Promise<void> {
  const pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
  try {
    await pool.query(
      `UPDATE users SET trust_level = $2, trust_level_changed_at = now() WHERE id = $1`,
      [userId, trustLevel],
    );
  } finally {
    await pool.end();
  }
}

/**
 * Backdates every rotation on an account past the grace window.
 *
 * Lets a spec assert the reuse rule without sleeping through the real window:
 * the rule is "a rotation older than the grace is theft", and this makes one
 * old on demand.
 */
export async function ageRotations(userId: string, seconds = 60): Promise<void> {
  const pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
  try {
    await pool.query(
      `UPDATE auth_sessions
          SET revoked_at = now() - ($2 || ' seconds')::interval
        WHERE user_id = $1 AND revoked_reason = 'rotation'`,
      [userId, String(seconds)],
    );
  } finally {
    await pool.end();
  }
}

/**
 * Seeds one throwaway area and returns its id plus a cleanup handle.
 *
 * Every spec gets its own area so runs do not interfere, and the teardown
 * removes what its own actors created rather than truncating shared tables.
 */
export async function seedArea(): Promise<{ areaId: string; cleanup: () => Promise<void> }> {
  const pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
  const slug = `e2e-${randomUUID().slice(0, 8)}`;
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO areas (slug, name_en, name_vi, boundary, center)
     VALUES ($1, 'E2E Area', 'Khu vực E2E',
             ST_GeogFromText('POLYGON((108.15 15.95,108.35 15.95,108.35 16.15,108.15 16.15,108.15 15.95))'),
             ST_GeogFromText('POINT(108.24 16.06)'))
     RETURNING id`,
    [slug],
  );
  const areaId = rows[0]?.id as string;

  return {
    areaId,
    cleanup: async () => {
      // Ordered by dependency, and scoped to this file's actors so parallel
      // spec files never delete each other's rows.
      await pool.query(
        `DELETE FROM reactions WHERE user_id = ANY($1::uuid[])
            OR post_id IN (SELECT id FROM posts WHERE author_user_id = ANY($1::uuid[]))
            OR comment_id IN (SELECT id FROM comments WHERE user_id = ANY($1::uuid[]))`,
        [actors],
      );
      await pool.query(
        `DELETE FROM comments WHERE user_id = ANY($1::uuid[])
            OR post_id IN (SELECT id FROM posts WHERE author_user_id = ANY($1::uuid[]))
            OR event_id IN (SELECT id FROM events WHERE organizer_id = ANY($1::uuid[]))`,
        [actors],
      );
      await pool.query(`DELETE FROM posts WHERE author_user_id = ANY($1::uuid[])`, [actors]);
      await pool.query(
        `DELETE FROM messages WHERE conversation_id IN
           (SELECT conversation_id FROM conversation_participants WHERE user_id = ANY($1::uuid[]))`,
        [actors],
      );
      await pool.query(
        `DELETE FROM conversations WHERE id IN
           (SELECT conversation_id FROM conversation_participants WHERE user_id = ANY($1::uuid[]))`,
        [actors],
      );
      await pool.query(
        `DELETE FROM event_occurrences WHERE event_id IN
           (SELECT id FROM events WHERE organizer_id = ANY($1::uuid[]))`,
        [actors],
      );
      await pool.query(`DELETE FROM events WHERE organizer_id = ANY($1::uuid[])`, [actors]);
      await pool.query(`UPDATE profiles SET avatar_media_id = NULL WHERE user_id = ANY($1::uuid[])`, [actors]);
      await pool.query(`DELETE FROM media WHERE owner_user_id = ANY($1::uuid[])`, [actors]);
      await pool.query(`DELETE FROM posts WHERE area_id = $1`, [areaId]);
      await pool.query(`DELETE FROM areas WHERE id = $1`, [areaId]);
      await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [actors]);
      await pool.end();
    },
  };
}

/** A uuid that belongs to nothing — for "not found" and "not yours" assertions. */
export function unknownId(): string {
  return randomUUID();
}
