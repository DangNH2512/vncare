import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuditLogResponse, cursorPage, envelope } from '@dnc/contracts';
import {
  createActor,
  createTestApp,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';
import {
  createPost,
  http,
  openDb,
  openTicket,
  postAction,
  ReporterPool,
} from '../moderation/moderation-fixtures.js';

const AUDIT = '/api/v1/admin/audit-logs';
const AuditPage = envelope(cursorPage(AuditLogResponse));

/**
 * GET /api/v1/admin/audit-logs — T-API-3 (brief E9-S1, Đ48–Đ51).
 *
 * AC-44 (scope by role), AC-45 (filters, cursor, newest first, read-only).
 */
describe('audit log', () => {
  let app: INestApplication;
  let db: Pool;
  let areaId: string;
  let cleanup: () => Promise<void>;

  let author: Actor;
  let member: Actor;
  let curator: Actor;
  let moderator: Actor; // M
  let moderator2: Actor; // M2
  let admin: Actor; // AD
  let superAdmin: Actor; // SA
  let reporters: ReporterPool;

  /** Hides a fresh post as `actor`; returns the post id. */
  const hideFreshPost = async (actor: Actor) => {
    const post = await createPost(app, author, areaId, `Post hidden by ${actor.handle}`);
    const ticketId = await openTicket(app, db, reporters.next(), {
      targetType: 'post',
      targetId: post,
      reason: 'spam',
    });
    await postAction(app, actor, {
      action: 'hide_content',
      ticketId,
      targetType: 'post',
      targetId: post,
      reasonCode: 'spam',
    }).expect(201);
    return post;
  };

  const list = async (viewer: Actor, query: Record<string, string> = {}) => {
    const res = await http(app).get(AUDIT).set(viewer.headers).query(query).expect(200);
    return AuditPage.parse(res.body).data;
  };

  let modPosts: string[] = [];
  let mod2Post: string;
  let superAdminPost: string;

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    db = openDb();
    author = await createActor(app);
    member = await createActor(app);
    curator = await createActor(app, { role: 'curator' });
    moderator = await createActor(app, { role: 'moderator' });
    moderator2 = await createActor(app, { role: 'moderator' });
    admin = await createActor(app, { role: 'admin' });
    superAdmin = await createActor(app, { role: 'super_admin' });
    reporters = new ReporterPool([await createActor(app, { trustLevel: 3 })]);

    modPosts = [
      await hideFreshPost(moderator),
      await hideFreshPost(moderator),
      await hideFreshPost(moderator),
    ];
    mod2Post = await hideFreshPost(moderator2);
    superAdminPost = await hideFreshPost(superAdmin);
  });

  afterAll(async () => {
    await app.close();
    await db.end();
    await cleanup();
  });

  describe('access (AC-44)', () => {
    it('401 without a token', async () => {
      await http(app).get(AUDIT).expect(401);
    });

    it.each([
      ['member', () => member],
      ['curator', () => curator],
    ] as const)('403 ROLE_NOT_ALLOWED for a %s', async (_role, actor) => {
      const res = await http(app).get(AUDIT).set(actor().headers).expect(403);
      expect(res.body).toEqual({ code: 'ROLE_NOT_ALLOWED', messageKey: 'errors.auth.roleNotAllowed' });
    });

    it('has no route that edits or deletes an entry (AC-45)', async () => {
      const id = unknownId();
      await http(app).patch(`${AUDIT}/${id}`).set(superAdmin.headers).send({}).expect(404);
      await http(app).put(`${AUDIT}/${id}`).set(superAdmin.headers).send({}).expect(404);
      await http(app).delete(`${AUDIT}/${id}`).set(superAdmin.headers).expect(404);
      await http(app).post(AUDIT).set(superAdmin.headers).send({}).expect(404);
    });
  });

  describe('scope by role (AC-44)', () => {
    it('a moderator sees only their own entries', async () => {
      const page = await list(moderator, { limit: '50' });
      expect(page.items.length).toBeGreaterThanOrEqual(3);
      expect(page.items.every((entry) => entry.actor?.userId === moderator.id)).toBe(true);
      expect(page.items.map((entry) => entry.entityId)).toEqual(expect.arrayContaining(modPosts));
    });

    it('a moderator filtering by someone else gets an empty page, not a 403', async () => {
      const page = await list(moderator, { actorUserId: moderator2.id });
      expect(page.items).toEqual([]);
      expect(page.nextCursor).toBeNull();
    });

    it('an admin sees other staff but never a super_admin’s entries', async () => {
      const others = await list(admin, { actorUserId: moderator2.id });
      expect(others.items.map((entry) => entry.entityId)).toContain(mod2Post);
      const hidden = await list(admin, { actorUserId: superAdmin.id });
      expect(hidden.items).toEqual([]);
      const recent = await list(admin, { limit: '50' });
      expect(recent.items.every((entry) => entry.actorRole !== 'super_admin')).toBe(true);
    });

    it('a super_admin sees everything, including their own entries', async () => {
      const own = await list(superAdmin, { actorUserId: superAdmin.id });
      expect(own.items.map((entry) => entry.entityId)).toContain(superAdminPost);
      const others = await list(superAdmin, { actorUserId: moderator.id, limit: '50' });
      expect(others.items.map((entry) => entry.entityId)).toEqual(expect.arrayContaining(modPosts));
    });
  });

  describe('reading (AC-45)', () => {
    it('pages newest first with a cursor, without repeats', async () => {
      const seen: string[] = [];
      const entities: string[] = [];
      let cursor: string | null = null;
      for (let i = 0; i < 10; i += 1) {
        const page = await list(moderator, { limit: '1', ...(cursor ? { cursor } : {}) });
        seen.push(...page.items.map((entry) => entry.id));
        entities.push(...page.items.map((entry) => entry.entityId));
        cursor = page.nextCursor;
        if (!cursor) break;
      }
      expect(new Set(seen).size).toBe(seen.length);
      expect([...seen].sort().reverse()).toEqual(seen);
      // Hidden in order 0, 1, 2 — so listed 2, 1, 0.
      expect(entities.filter((id) => modPosts.includes(id))).toEqual([...modPosts].reverse());
    });

    it('filters by action, entity type and time window', async () => {
      const byAction = await list(superAdmin, {
        actorUserId: moderator.id,
        action: 'moderation.content_hidden',
        entityType: 'post',
      });
      expect(byAction.items.length).toBeGreaterThanOrEqual(3);
      expect(
        byAction.items.every(
          (entry) => entry.action === 'moderation.content_hidden' && entry.entityType === 'post',
        ),
      ).toBe(true);

      const otherAction = await list(superAdmin, {
        actorUserId: moderator.id,
        action: 'moderation.user_suspended',
      });
      expect(otherAction.items).toEqual([]);

      const past = await list(superAdmin, {
        actorUserId: moderator.id,
        to: '2020-01-01T00:00:00.000Z',
      });
      expect(past.items).toEqual([]);
      const window = await list(superAdmin, {
        actorUserId: moderator.id,
        from: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        to: new Date(Date.now() + 60 * 1000).toISOString(),
      });
      expect(window.items.length).toBeGreaterThanOrEqual(3);
    });

    it('an entry carries who, what, why and the change, never contact details or content', async () => {
      const page = await list(moderator, { limit: '1' });
      const entry = page.items[0];
      expect(entry).toMatchObject({
        actorType: 'staff',
        actorRole: 'moderator',
        action: 'moderation.content_hidden',
        entityType: 'post',
        before: { status: 'visible' },
        after: { status: 'hidden', moderationState: 'actioned' },
        reasonCode: 'spam',
        severity: 'notice',
      });
      expect(entry?.requestId).toEqual(expect.any(String));
      expect(JSON.stringify(entry)).not.toMatch(/example\.test|Post hidden by/);
    });

    it('rejects an unknown action filter with 400', async () => {
      await http(app).get(AUDIT).set(superAdmin.headers).query({ action: 'moderation.nope' }).expect(400);
    });
  });
});
