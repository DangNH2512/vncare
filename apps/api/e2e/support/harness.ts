import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  StandardSchemaSerializerInterceptor,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { AppModule } from '../../src/app.module.js';

/**
 * Shared setup for the API integration specs.
 *
 * The suite runs against the local PostGIS container rather than a mock: the
 * behaviour under test is largely enforced by the database itself — partial
 * unique indexes, CHECK constraints and the counter triggers — and a mocked
 * repository would assert only that the mock was called.
 */
export const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://dnc:dnc@localhost:5433/dnc';

export async function createTestApp(): Promise<INestApplication> {
  process.env['DATABASE_URL'] = DATABASE_URL;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalInterceptors(new StandardSchemaSerializerInterceptor(app.get(Reflector)));
  await app.init();
  return app;
}

/** Headers the development auth stub reads. Replaced by a bearer token with the auth module. */
export function asUser(userId: string, trustLevel = 3): Record<string, string> {
  return { 'x-user-id': userId, 'x-trust-level': String(trustLevel) };
}

/**
 * Every actor a spec file hands out, so teardown can find their rows.
 *
 * Per spec file: vitest gives each file its own module instance, so two files
 * running in parallel never see each other's actors.
 */
const actors: string[] = [];

/** UUIDv4 stand-in for a user row; the users table arrives with the auth module. */
export function newUserId(): string {
  const id = randomUUID();
  actors.push(id);
  return id;
}

/**
 * Seeds one throwaway area and returns its id plus a cleanup handle.
 *
 * Every spec gets its own area so runs do not interfere, and the teardown
 * removes the whole subtree it created rather than truncating shared tables.
 */
export async function seedArea(): Promise<{ areaId: string; cleanup: () => Promise<void> }> {
  const pool = new Pool({ connectionString: DATABASE_URL });
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
      // Rows are found by author, not only by area: a spec that moves a post to
      // city-wide (area_id = NULL) would otherwise leave it behind forever.
      await pool.query(
        `DELETE FROM reactions WHERE user_id = ANY($1::uuid[])
            OR post_id IN (SELECT id FROM posts WHERE author_user_id = ANY($1::uuid[]))
            OR comment_id IN (SELECT id FROM comments WHERE user_id = ANY($1::uuid[]))`,
        [actors],
      );
      await pool.query(`DELETE FROM comments WHERE user_id = ANY($1::uuid[])`, [actors]);
      await pool.query(
        `DELETE FROM comments WHERE post_id IN
           (SELECT id FROM posts WHERE author_user_id = ANY($1::uuid[]))`,
        [actors],
      );
      await pool.query(`DELETE FROM posts WHERE author_user_id = ANY($1::uuid[])`, [actors]);
      await pool.query(`DELETE FROM media WHERE owner_user_id = ANY($1::uuid[])`, [actors]);
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

      // Ordered by dependency: reactions and comments point at posts and
      // events, which point at the area.
      await pool.query(
        `DELETE FROM reactions WHERE post_id IN (SELECT id FROM posts WHERE area_id = $1)
            OR comment_id IN (SELECT id FROM comments WHERE post_id IN (SELECT id FROM posts WHERE area_id = $1))
            OR event_id IN (SELECT id FROM events WHERE area_id = $1)`,
        [areaId],
      );
      await pool.query(
        `DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE area_id = $1)
            OR event_id IN (SELECT id FROM events WHERE area_id = $1)`,
        [areaId],
      );
      await pool.query(`DELETE FROM posts WHERE area_id = $1`, [areaId]);
      await pool.query(
        `DELETE FROM messages WHERE conversation_id IN
           (SELECT id FROM conversations WHERE event_id IN (SELECT id FROM events WHERE area_id = $1))`,
        [areaId],
      );
      await pool.query(
        `DELETE FROM event_occurrences WHERE event_id IN (SELECT id FROM events WHERE area_id = $1)`,
        [areaId],
      );
      await pool.query(`DELETE FROM events WHERE area_id = $1`, [areaId]);
      await pool.query(`DELETE FROM areas WHERE id = $1`, [areaId]);
      await pool.end();
    },
  };
}
