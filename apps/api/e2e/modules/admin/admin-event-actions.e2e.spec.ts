import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuditService } from '../../../src/modules/audit/index.js';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';

const BASE = '/api/v1/admin/events';
const REASON = 'Reported as misleading by several guests';
const tag = randomBytes(3).toString('hex');

interface AuditRow {
  actor_user_id: string;
  actor_role_at_time: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason: string;
  severity: string;
}

describe('admin event actions', () => {
  let app: INestApplication;
  let pool: Pool;
  let cleanup: () => Promise<void>;
  let areaId: string;
  const entityIds: string[] = [];
  const actorIds: string[] = [];
  let seq = 0;

  let member: Actor;
  let curator: Actor;
  let moderator: Actor;
  let admin: Actor;
  let host: Actor;

  const act = (verb: string, id: string, who: Actor | null, body: unknown = { reason: REASON, confirm: true }) => {
    const req = request(app.getHttpServer()).post(`${BASE}/${id}/${verb}`);
    return (who ? req.set(who.headers) : req).send(body as object);
  };

  /** One event with one future occurrence, written in SQL so the fixture needs no event route. */
  async function makeEvent(status: string, organizer: Actor = host, capacity = 10): Promise<{ id: string; occ: string }> {
    seq += 1;
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO events (organizer_id, area_id, slug, title, location, status)
       VALUES ($1, $2, $3, $4, ST_GeogFromText('POINT(108.25 16.05)'), $5::event_status_enum)
       RETURNING id`,
      [organizer.id, areaId, `aea-${tag}-${seq}`, `AEA ${tag} ${seq}`, status],
    );
    const id = rows[0]?.id as string;
    const occ = await pool.query<{ id: string }>(
      `INSERT INTO event_occurrences (event_id, starts_at, ends_at, capacity)
       VALUES ($1, now() + interval '7 days', now() + interval '7 days 2 hours', $2) RETURNING id`,
      [id, capacity],
    );
    entityIds.push(id);
    return { id, occ: occ.rows[0]?.id as string };
  }

  const statusOf = async (id: string) =>
    (await pool.query<{ status: string }>(`SELECT status FROM events WHERE id = $1`, [id])).rows[0]?.status;
  const audits = async (id: string) =>
    (await pool.query<AuditRow>(`SELECT * FROM audit_logs WHERE entity_id = $1 ORDER BY created_at`, [id])).rows;
  const join = (occ: string, guest: Actor) =>
    request(app.getHttpServer())
      .post(`/api/v1/occurrences/${occ}/rsvps`)
      .set({ ...guest.headers, 'idempotency-key': randomUUID() });
  const listedIds = async (viewer: Actor) => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/events?areaId=${areaId}&limit=50`)
      .set(viewer.headers)
      .expect(200);
    return (res.body.data.items as { id: string }[]).map((e) => e.id);
  };

  async function makeActor(role?: 'curator' | 'moderator' | 'admin' | 'super_admin'): Promise<Actor> {
    const a = await createActor(app, { ...(role ? { role } : {}), trustLevel: 3 });
    actorIds.push(a.id);
    return a;
  }

  /**
   * Runs `work` with a short-lived super_admin and demotes it right after. The
   * user-actions spec counts active super_admins on the shared database, so a
   * super_admin that lived for the whole file would make that count flaky.
   */
  async function withSuperAdmin<T>(work: (who: Actor) => Promise<T>): Promise<T> {
    const who = await makeActor('super_admin');
    try {
      return await work(who);
    } finally {
      await pool.query(`UPDATE users SET role = 'member' WHERE id = $1`, [who.id]);
    }
  }

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
    member = await makeActor();
    curator = await makeActor('curator');
    moderator = await makeActor('moderator');
    admin = await makeActor('admin');
    host = await makeActor();
  }, 120_000);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_guard_delete');
      await client.query(
        `DELETE FROM audit_logs WHERE entity_id = ANY($1::uuid[]) OR actor_user_id = ANY($2::uuid[])`,
        [entityIds, actorIds],
      );
      await client.query('ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_guard_delete');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
    await pool.end();
    await app.close();
    await cleanup();
  });

  describe('access', () => {
    const routes: [string, string[]][] = [
      ['suspend', ['moderator', 'admin', 'super_admin']],
      ['restore', ['moderator', 'admin', 'super_admin']],
      ['takedown', ['admin', 'super_admin']],
    ];

    it.each(routes)('%s answers 401 to a guest', async (verb) => {
      await act(verb, unknownId(), null).expect(401);
    });

    it.each(routes)('%s answers 403 ROLE_NOT_ALLOWED to roles outside the matrix', async (verb, allowed) => {
      const everyone: [string, Actor][] = [
        ['member', member], ['curator', curator], ['moderator', moderator],
        ['admin', admin],
      ];
      for (const [role, who] of everyone) {
        const res = await act(verb, unknownId(), who);
        if (allowed.includes(role)) {
          // Allowed roles get past the guard and meet the missing event.
          expect(res.status, `${verb} ${role}`).toBe(404);
          expect(res.body.code ?? res.body.error?.code).toBe('EVENT_NOT_FOUND');
        } else {
          expect(res.status, `${verb} ${role}`).toBe(403);
        }
      }
    });

    it('super_admin is allowed on all three routes', async () => {
      await withSuperAdmin(async (who) => {
        for (const verb of ['suspend', 'restore', 'takedown']) {
          expect((await act(verb, unknownId(), who)).status, verb).toBe(404);
        }
        const { id } = await makeEvent('published');
        await act('takedown', id, who).expect(200);
        expect(await statusOf(id)).toBe('taken_down');
      });
    });

    it('a moderator cannot take an event down and nothing changes', async () => {
      const { id } = await makeEvent('published');
      await act('takedown', id, moderator).expect(403);
      expect(await statusOf(id)).toBe('published');
      expect(await audits(id)).toHaveLength(0);
    });

    it('re-reads the role from the database, not the token claim', async () => {
      const demoted = await makeActor('moderator');
      const { id } = await makeEvent('published');
      await pool.query(`UPDATE users SET role = 'member' WHERE id = $1`, [demoted.id]);
      const res = await act('suspend', id, demoted).expect(403);
      expect(JSON.stringify(res.body)).toContain('ROLE_NOT_ALLOWED');
      expect(await statusOf(id)).toBe('published');
      expect(await audits(id)).toHaveLength(0);
    });
  });

  describe('transitions and audit', () => {
    it('suspend: published -> suspended with one warning line holding only {status}', async () => {
      const { id } = await makeEvent('published');
      const res = await act('suspend', id, moderator).expect(200);
      expect(res.body.data).toEqual({ id, status: 'suspended' });
      const lines = await audits(id);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({
        actor_user_id: moderator.id,
        actor_role_at_time: 'moderator',
        action: 'event.suspended',
        entity_type: 'event',
        before: { status: 'published' },
        after: { status: 'suspended' },
        reason: REASON,
        severity: 'warning',
      });
    });

    it('suspend also takes pending_review', async () => {
      const { id } = await makeEvent('pending_review');
      await act('suspend', id, admin).expect(200);
      expect((await audits(id))[0]?.before).toEqual({ status: 'pending_review' });
    });

    it('restore returns a published event to published with a notice line', async () => {
      const { id } = await makeEvent('published');
      await act('suspend', id, moderator).expect(200);
      const res = await act('restore', id, moderator).expect(200);
      expect(res.body.data).toEqual({ id, status: 'published' });
      const lines = await audits(id);
      expect(lines).toHaveLength(2);
      expect(lines[1]).toMatchObject({
        action: 'event.restored',
        severity: 'notice',
        before: { status: 'suspended' },
        after: { status: 'published' },
      });
    });

    it('restore returns a pending_review event to pending_review, not public', async () => {
      const { id } = await makeEvent('pending_review');
      const stranger = await makeActor();
      await act('suspend', id, moderator).expect(200);
      const res = await act('restore', id, moderator).expect(200);
      expect(res.body.data.status).toBe('pending_review');
      expect((await audits(id))[1]?.after).toEqual({ status: 'pending_review' });
      expect(await listedIds(stranger)).not.toContain(id);
    });

    it('restores correctly over several rounds with a status change in between', async () => {
      const { id } = await makeEvent('pending_review');
      await act('suspend', id, moderator).expect(200);
      expect((await act('restore', id, moderator).expect(200)).body.data.status).toBe('pending_review');
      await pool.query(`UPDATE events SET status = 'published' WHERE id = $1`, [id]);
      await act('suspend', id, moderator).expect(200);
      expect((await act('restore', id, moderator).expect(200)).body.data.status).toBe('published');
      // Third round back through review: the closed rounds must not leak in.
      await pool.query(`UPDATE events SET status = 'pending_review' WHERE id = $1`, [id]);
      await act('suspend', id, moderator).expect(200);
      expect((await act('restore', id, moderator).expect(200)).body.data.status).toBe('pending_review');
    });

    it('picks the suspension line that is newest by id even when created_at runs the other way', async () => {
      const { id } = await makeEvent('suspended');
      const audit = app.get(AuditService);
      const line = (from: string) => ({
        actor: { userId: null, type: 'system' as const, role: null },
        action: 'event.suspended',
        entityType: 'event' as const,
        entityId: id,
        before: { status: from },
        after: { status: 'suspended' },
      });
      const first = await pool.connect();
      const second = await pool.connect();
      try {
        // `first` starts earlier (older created_at) but inserts later (newer id).
        await first.query('BEGIN');
        await first.query('SELECT now()');
        await new Promise((resolve) => setTimeout(resolve, 20));
        await second.query('BEGIN');
        await audit.record(second, line('pending_review'));
        await second.query('COMMIT');
        await new Promise((resolve) => setTimeout(resolve, 20));
        await audit.record(first, line('published'));
        await first.query('COMMIT');
      } finally {
        await first.query('ROLLBACK').catch(() => undefined);
        await second.query('ROLLBACK').catch(() => undefined);
        first.release();
        second.release();
      }
      const rows = await pool.query<{ status: string }>(
        `SELECT "before"->>'status' AS status FROM audit_logs WHERE entity_id = $1 ORDER BY created_at`,
        [id],
      );
      expect(rows.rows.map((r) => r.status)).toEqual(['published', 'pending_review']);
      expect((await act('restore', id, moderator).expect(200)).body.data.status).toBe('published');
    });

    it('the organizer still sees their own suspended event in the list (existing behaviour)', async () => {
      const { id } = await makeEvent('published');
      await act('suspend', id, moderator).expect(200);
      expect(await listedIds(host)).toContain(id);
    });

    it('restore falls back to pending_review when no suspend line exists', async () => {
      const { id } = await makeEvent('suspended');
      const res = await act('restore', id, moderator).expect(200);
      expect(res.body.data.status).toBe('pending_review');
      const lines = await audits(id);
      expect(lines).toHaveLength(1);
      expect(lines[0]?.after).toEqual({ status: 'pending_review' });
    });

    it.each([['published'], ['pending_review'], ['suspended']])(
      'takedown from %s ends in taken_down with a critical line',
      async (from) => {
        const { id } = await makeEvent(from);
        await act('takedown', id, admin).expect(200);
        expect(await statusOf(id)).toBe('taken_down');
        const lines = await audits(id);
        expect(lines).toHaveLength(1);
        expect(lines[0]).toMatchObject({
          action: 'event.taken_down',
          severity: 'critical',
          before: { status: from },
          after: { status: 'taken_down' },
        });
        expect(Object.keys(lines[0]?.before ?? {})).toEqual(['status']);
        expect(Object.keys(lines[0]?.after ?? {})).toEqual(['status']);
      },
    );

    const wrong: [string, string, string][] = [
      ['suspend', 'draft', 'draft'], ['suspend', 'cancelled', 'cancelled'],
      ['suspend', 'taken_down', 'taken_down'], ['suspend', 'suspended', 'suspended'],
      ['restore', 'published', 'published'], ['restore', 'draft', 'draft'],
      ['restore', 'cancelled', 'cancelled'], ['restore', 'taken_down', 'taken_down'],
      ['takedown', 'draft', 'draft'], ['takedown', 'cancelled', 'cancelled'],
      ['takedown', 'taken_down', 'taken_down'],
    ];
    it.each(wrong)('%s on %s answers 409 INVALID_TRANSITION, no audit line, status unchanged', async (verb, from) => {
      const { id } = await makeEvent(from);
      const res = await act(verb, id, admin).expect(409);
      expect(JSON.stringify(res.body)).toContain('INVALID_TRANSITION');
      expect(JSON.stringify(res.body)).toContain('errors.admin.invalidTransition');
      expect(await statusOf(id)).toBe(from);
      expect(await audits(id)).toHaveLength(0);
    });

    it('taken_down is final: every later action is 409', async () => {
      const { id } = await makeEvent('published');
      await act('takedown', id, admin).expect(200);
      for (const verb of ['suspend', 'restore', 'takedown']) {
        await act(verb, id, admin).expect(409);
      }
      expect(await audits(id)).toHaveLength(1);
    });

    it('answers 404 for a soft-deleted event and writes nothing', async () => {
      const { id } = await makeEvent('published');
      await pool.query(`UPDATE events SET deleted_at = now() WHERE id = $1`, [id]);
      await act('suspend', id, admin).expect(404);
      expect(await audits(id)).toHaveLength(0);
    });
  });

  describe('input validation', () => {
    it.each([
      ['19 characters', { reason: 'x'.repeat(19), confirm: true }, 'REASON_REQUIRED'],
      ['blank', { reason: ' '.repeat(30), confirm: true }, 'REASON_REQUIRED'],
      ['256 characters', { reason: 'x'.repeat(256), confirm: true }, 'REASON_REQUIRED'],
      ['missing reason', { confirm: true }, 'REASON_REQUIRED'],
      ['missing confirm', { reason: REASON }, 'CONFIRMATION_REQUIRED'],
      ['confirm false', { reason: REASON, confirm: false }, 'CONFIRMATION_REQUIRED'],
      ['unknown field', { reason: REASON, confirm: true, extra: 1 }, 'ADMIN_BODY_INVALID'],
    ])('%s answers 400 and leaves no trace', async (_name, body, code) => {
      const { id } = await makeEvent('published');
      for (const verb of ['suspend', 'takedown']) {
        const res = await act(verb, id, admin, body).expect(400);
        expect(JSON.stringify(res.body)).toContain(code);
      }
      expect(await statusOf(id)).toBe('published');
      expect(await audits(id)).toHaveLength(0);
    });

    it('answers 400 for a malformed id', async () => {
      await act('suspend', 'not-a-uuid', admin).expect(400);
    });
  });

  describe('conflict of interest', () => {
    it('refuses a moderator acting on their own event, with no audit line', async () => {
      const own = await makeActor('moderator');
      const { id } = await makeEvent('published', own);
      const res = await act('suspend', id, own).expect(403);
      expect(JSON.stringify(res.body)).toContain('CONFLICT_OF_INTEREST');
      expect(JSON.stringify(res.body)).toContain('errors.admin.conflictOfInterest');
      expect(await statusOf(id)).toBe('published');
      expect(await audits(id)).toHaveLength(0);

      await pool.query(`UPDATE events SET status = 'suspended' WHERE id = $1`, [id]);
      await act('restore', id, own).expect(403);
      expect(await audits(id)).toHaveLength(0);
    });

    it('lets a moderator act on someone else\'s event', async () => {
      const { id } = await makeEvent('published', host);
      await act('suspend', id, moderator).expect(200);
    });
  });

  describe('atomicity and concurrency', () => {
    it('rolls the status back when the audit write fails', async () => {
      const { id } = await makeEvent('published');
      vi.spyOn(app.get(AuditService), 'record').mockRejectedValueOnce(new Error('audit down'));
      const res = await act('suspend', id, admin);
      expect(res.status).toBe(500);
      expect(await statusOf(id)).toBe('published');
      expect(await audits(id)).toHaveLength(0);
    });

    it('two simultaneous suspends: one 200, one 409, one audit line', async () => {
      const { id } = await makeEvent('published');
      const results = await Promise.all([act('suspend', id, moderator), act('suspend', id, admin)]);
      expect(results.map((r) => r.status).toSorted((a, b) => a - b)).toEqual([200, 409]);
      expect(await audits(id)).toHaveLength(1);
      expect(await statusOf(id)).toBe('suspended');
    });

    it('suspend racing takedown: both can win in order only; final state is taken_down or suspended-then-409', async () => {
      const { id } = await makeEvent('published');
      const results = await Promise.all([act('suspend', id, moderator), act('takedown', id, admin)]);
      const statuses = results.map((r) => r.status).toSorted((a, b) => a - b);
      // takedown always lands; suspend either went first (200) or met taken_down (409).
      expect([[200, 200], [200, 409]]).toContainEqual(statuses);
      expect(await statusOf(id)).toBe('taken_down');
      expect((await audits(id)).length).toBe(statuses.filter((s) => s === 200).length);
    });

    it('suspend racing an RSVP join: no 500, no deadlock, consistent outcome', async () => {
      for (let round = 0; round < 8; round += 1) {
        const { id, occ } = await makeEvent('published', host, 3);
        const guests = await Promise.all([makeActor(), makeActor(), makeActor()]);
        const [sus, ...joins] = await Promise.all([
          act('suspend', id, admin),
          ...guests.map((g) => join(occ, g)),
        ]);
        expect(sus.status).toBe(200);
        for (const j of joins) {
          // Either seated before the suspension or refused after it; never a server error.
          expect([201, 400], JSON.stringify(j.body)).toContain(j.status);
          if (j.status === 400) expect(JSON.stringify(j.body)).toContain('OCCURRENCE_CLOSED');
        }
        const confirmed = await pool.query<{ n: string }>(
          `SELECT count(*) AS n FROM rsvps WHERE occurrence_id = $1 AND status = 'confirmed'`,
          [occ],
        );
        expect(Number(confirmed.rows[0]?.n)).toBe(joins.filter((j) => j.status === 201).length);
        expect(await statusOf(id)).toBe('suspended');
        expect(await audits(id)).toHaveLength(1);
      }
    });
  });

  describe('effect on RSVP and the public feed', () => {
    it('refuses new RSVPs, keeps old ones confirmed, hides then restores the event', async () => {
      const { id, occ } = await makeEvent('published', host, 5);
      const early = await makeActor();
      const late = await makeActor();
      const stranger = await makeActor();
      await join(occ, early).expect(201);
      expect(await listedIds(stranger)).toContain(id);

      await act('suspend', id, moderator).expect(200);

      const refused = await join(occ, late);
      expect(refused.status).toBe(400);
      expect(JSON.stringify(refused.body)).toContain('OCCURRENCE_CLOSED');
      const rows = await pool.query<{ user_id: string; status: string }>(
        `SELECT user_id, status FROM rsvps WHERE occurrence_id = $1`,
        [occ],
      );
      expect(rows.rows).toEqual([{ user_id: early.id, status: 'confirmed' }]);
      expect(await listedIds(stranger)).not.toContain(id);

      await act('restore', id, moderator).expect(200);
      expect(await listedIds(stranger)).toContain(id);
      await join(occ, late).expect(201);
    });

    it('does not touch rsvps on takedown either', async () => {
      const { id, occ } = await makeEvent('published', host, 5);
      const guest = await makeActor();
      await join(occ, guest).expect(201);
      await act('takedown', id, admin).expect(200);
      const rows = await pool.query<{ status: string }>(`SELECT status FROM rsvps WHERE occurrence_id = $1`, [occ]);
      expect(rows.rows).toEqual([{ status: 'confirmed' }]);
    });
  });
});
