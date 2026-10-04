import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { expect } from 'vitest';
import { DATABASE_URL, type Actor } from '../../support/harness.js';

/**
 * Builders shared by the report, moderation and audit specs.
 *
 * Every row is created through the public API as a real member would create
 * it; SQL is used only to read state back, to move a clock (backdating), or
 * to pre-fill a rate-limit window — never to fake the behaviour under test.
 */

/** A decision note that clears the 20-character minimum after trimming. */
export const NOTE = 'Reviewed the evidence; this clearly breaks the guidelines.';

export const PASSWORD = 'e2e-password-long-enough';

/** One small pool per spec file, for reads the API does not expose. */
export function openDb(): Pool {
  return new Pool({ connectionString: DATABASE_URL, max: 3 });
}

export function http(app: INestApplication) {
  return request(app.getHttpServer());
}

export function idempotencyKey(): string {
  return `e2e-${randomUUID()}`;
}

/** Creates a draft event and publishes it; returns its event and occurrence ids. */
export async function publishEvent(
  app: INestApplication,
  organizer: Actor,
  areaId: string,
  title = 'Morning beach cleanup',
): Promise<{ eventId: string; occurrenceId: string }> {
  const created = await http(app)
    .post('/api/v1/events')
    .set(organizer.headers)
    .send({
      title,
      areaId,
      lat: 16.06,
      lng: 108.247,
      startsAt: '2027-06-01T09:00:00.000Z',
      capacity: 12,
    })
    .expect(201);
  const eventId: string = created.body.data.id;
  await http(app)
    .put(`/api/v1/events/${eventId}/status`)
    .set(organizer.headers)
    .send({ status: 'published' })
    .expect(200);
  return { eventId, occurrenceId: created.body.data.occurrenceId };
}

export async function createPost(
  app: INestApplication,
  author: Actor,
  areaId: string,
  body = 'Where can I find a good tailor near the river?',
): Promise<string> {
  const res = await http(app)
    .post('/api/v1/posts')
    .set(author.headers)
    .send({ kind: 'question', body, areaId })
    .expect(201);
  return res.body.data.id as string;
}

export async function createEventComment(
  app: INestApplication,
  author: Actor,
  eventId: string,
  body = 'Is there parking near the start point?',
): Promise<string> {
  const res = await http(app)
    .post(`/api/v1/events/${eventId}/comments`)
    .set(author.headers)
    .send({ body })
    .expect(201);
  return res.body.data.id as string;
}

export interface ReportBody {
  targetType: 'event' | 'post' | 'comment' | 'user';
  targetId: string;
  reason: string;
  description?: string;
  alsoBlock?: boolean;
}

export function postReport(
  app: INestApplication,
  reporter: Actor,
  body: ReportBody,
  key: string = idempotencyKey(),
) {
  return http(app)
    .post('/api/v1/reports')
    .set(reporter.headers)
    .set('Idempotency-Key', key)
    .send(body);
}

/** Files a report through the API and returns the ticket it landed in. */
export async function openTicket(
  app: INestApplication,
  db: Pool,
  reporter: Actor,
  body: ReportBody,
): Promise<string> {
  const res = await postReport(app, reporter, body).expect(201);
  const { rows } = await db.query<{ ticket_id: string }>(
    `SELECT ticket_id FROM reports WHERE id = $1`,
    [res.body.data.id],
  );
  const ticketId = rows[0]?.ticket_id;
  expect(ticketId).toBeDefined();
  return ticketId as string;
}

export function postAction(
  app: INestApplication,
  actor: Actor,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  return http(app)
    .post('/api/v1/admin/moderation/actions')
    .set(actor.headers)
    .set(headers)
    .send({ reasonCode: 'scam', note: NOTE, ...body });
}

/** Signs in with the harness password and returns the refresh cookie the API set. */
export async function signIn(
  app: INestApplication,
  actor: Actor,
  expected = 200,
): Promise<{ status: number; body: Record<string, unknown>; cookie: string | undefined }> {
  const res = await http(app)
    .post('/api/v1/auth/login')
    .send({ identifier: actor.email, password: PASSWORD })
    .expect(expected);
  return { status: res.status, body: res.body, cookie: refreshCookie(res.headers) };
}

export function refreshCookie(headers: Record<string, unknown>): string | undefined {
  const raw = headers['set-cookie'];
  const list = Array.isArray(raw) ? (raw as string[]) : typeof raw === 'string' ? [raw] : [];
  return list.find((cookie) => cookie.startsWith('dnc_refresh='));
}

/**
 * Round-robins reports over several high-trust reporters so a spec that opens
 * many tickets never trips the daily report limit it is not testing.
 */
export class ReporterPool {
  private index = 0;

  constructor(private readonly reporters: readonly Actor[]) {}

  next(): Actor {
    const reporter = this.reporters[this.index % this.reporters.length] as Actor;
    this.index += 1;
    return reporter;
  }
}

/** Walks every page of the queue, so assertions see all of this file's tickets. */
export async function collectQueue(
  app: INestApplication,
  viewer: Actor,
  query: Record<string, string> = {},
  pageSize = 50,
): Promise<Array<Record<string, unknown>>> {
  const items: Array<Record<string, unknown>> = [];
  let cursor: string | null = null;
  for (let page = 0; page < 200; page += 1) {
    const res = await http(app)
      .get('/api/v1/admin/moderation/queue')
      .set(viewer.headers)
      .query({ ...query, limit: String(pageSize), ...(cursor ? { cursor } : {}) })
      .expect(200);
    items.push(...(res.body.data.items as Array<Record<string, unknown>>));
    cursor = res.body.data.nextCursor as string | null;
    if (!cursor) return items;
  }
  throw new Error('queue pagination did not terminate');
}

export async function countRows(
  db: Pool,
  sql: string,
  params: unknown[],
): Promise<number> {
  const { rows } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${sql}`, params);
  return rows[0]?.n ?? 0;
}
