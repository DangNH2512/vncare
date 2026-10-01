import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AdminUserListItemT } from '@dnc/contracts';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  newPhone,
  seedArea,
  unknownId,
  type Actor,
} from '../../support/harness.js';

import { PG_POOL } from '../../../src/database/database.module.js';
import {
  emailMaskSql,
  maskEmail,
  maskPhone,
  phoneMaskSql,
} from '../../../src/modules/admin/admin-mask.js';
import { Logger } from '@nestjs/common';

const LIST = '/api/v1/admin/users';
const forge = (c: { s: string; d: string; v: string | null; id: string }) =>
  Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
const BANNED = [
  'email', 'phone', 'passwordHash', 'password_hash', 'ip', 'userAgent', 'birthYear', 'gender',
  'deviceId', 'tokenHash', 'metadata', 'evidenceId', 'issuedBy',
];

function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(allKeys);
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => [k, ...allKeys(v)]);
  }
  return [];
}

async function expectStatus<T extends { status: number }>(pending: PromiseLike<T>, status: number): Promise<T> {
  const res = await pending;
  expect(res.status).toBe(status);
  return res;
}

const BASE = Date.parse('2001-03-01T00:00:00Z');
const N = 30;

describe('admin users', () => {
  let app: INestApplication;
  let pool: Pool;
  let cleanup: () => Promise<void>;
  let areaId: string;
  const tag = randomBytes(3).toString('hex');
  const prefix = `zq${tag}`;

  let member: Actor;
  let curator: Actor;
  let moderator: Actor;
  let admin: Actor;
  let superAdmin: Actor;
  let seeded: Actor[] = [];
  let phone = '';

  const get = (path: string, actor?: Actor) => {
    const req = request(app.getHttpServer()).get(path);
    return actor ? req.set(actor.headers) : req;
  };
  const list = async (qs: string) => get(`${LIST}?${qs}`, admin);
  const scoped = (extra = '') => `q=${prefix}&${extra}`;

  async function walk(qs: string): Promise<AdminUserListItemT[]> {
    const out: AdminUserListItemT[] = [];
    let cursor: string | null = null;
    for (let i = 0; i < 20; i++) {
      const response = await list(`${qs}${cursor ? `&cursor=${cursor}` : ''}`);
      expect(response.status).toBe(200);
      const res = response.body.data as { items: AdminUserListItemT[]; nextCursor: string | null };
      out.push(...res.items);
      if (!res.nextCursor) return out;
      cursor = res.nextCursor;
    }
    throw new Error('cursor never ended');
  }

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });

    member = await createActor(app);
    curator = await createActor(app, { role: 'curator' });
    moderator = await createActor(app, { role: 'moderator' });
    admin = await createActor(app, { role: 'admin' });
    superAdmin = await createActor(app, { role: 'super_admin' });

    for (let i = 0; i < N; i += 5) {
      const batch = await Promise.all(Array.from({ length: 5 }, () => createActor(app)));
      seeded.push(...batch);
    }
    phone = newPhone();
    for (const [i, a] of seeded.entries()) {
      const handle = `${prefix}_${String(i).padStart(2, '0')}`;
      const display = i === 0 ? 'Müller Test' : i === 1 ? 'a%b' : i === 2 ? 'a_b' : `Anna ${i}`;
      await pool.query(
        `UPDATE profiles SET handle = $2, display_name = $3 WHERE user_id = $1`,
        [a.id, handle, display],
      );
      await pool.query(
        `UPDATE users SET created_at = $2::timestamptz, trust_level = $3,
                last_active_at = $4::timestamptz,
                role = CASE WHEN $5 THEN 'moderator'::user_role_enum ELSE role END,
                status = CASE WHEN $6 THEN 'suspended'::user_status_enum ELSE status END,
                deleted_at = CASE WHEN $7 THEN now() END,
                anonymized_at = CASE WHEN $8 THEN now() END,
                phone = CASE WHEN $9 THEN $10 END,
                phone_verified_at = CASE WHEN $9 THEN now() END
          WHERE id = $1`,
        [
          a.id,
          new Date(BASE + i * 3_600_000).toISOString(),
          i % 6,
          i < 20 ? new Date(BASE + (i % 7) * 86_400_000).toISOString() : null,
          i === 10 || i === 11,
          i === 12,
          i === 3,
          i === 4,
          i === 5,
          phone,
        ],
      );
    }
  }, 180_000);

  afterAll(async () => {
    await pool.end();
    await app.close();
    await cleanup();
  });

  describe('access', () => {
    it('answers 401 to a guest on both routes', async () => {
      await get(LIST).expect(401);
      await get(`${LIST}/${unknownId()}`).expect(401);
    });

    it.each(['member', 'curator', 'moderator'] as const)('answers 403 to %s', async (role) => {
      const actor = { member, curator, moderator }[role];
      await get(LIST, actor).expect(403);
      await get(`${LIST}/${unknownId()}`, actor).expect(403);
    });

    it('answers 200 to admin and super_admin', async () => {
      await get(`${LIST}?limit=1`, admin).expect(200);
      await get(`${LIST}?limit=1`, superAdmin).expect(200);
      await get(`${LIST}/${admin.id}`, superAdmin).expect(200);
    });
  });

  describe('privacy', () => {
    it('never carries contact data or internals, at any depth, and masks email and phone', async () => {
      const res = await expectStatus(list(scoped('includeDeleted=true&limit=30')), 200);
      const keys = allKeys(res.body);
      for (const banned of BANNED) expect(keys).not.toContain(banned);
      const raw = JSON.stringify(res.body);
      for (const a of seeded) expect(raw).not.toContain(a.email);
      expect(raw).not.toContain(phone);
      const items = res.body.data.items as AdminUserListItemT[];
      expect(items.every((i) => i.emailMasked === null || /^.\*{3}@.+$/.test(i.emailMasked))).toBe(true);
      const withPhone = items.find((i) => i.id === seeded[5]?.id);
      expect(withPhone?.phoneMasked).toBe(`*** *** ${phone.slice(-3)}`);
    });
  });

  describe('search', () => {
    it('matches a handle by prefix and a display name by substring', async () => {
      const byHandle = await list(`q=${prefix}_0`).then((r) => r.body.data.items as AdminUserListItemT[]);
      expect(byHandle.length).toBeGreaterThan(0);
      expect(byHandle.every((i) => i.handle.startsWith(`${prefix}_0`))).toBe(true);
      const byName = await list(`q=${encodeURIComponent('nna 7')}`).then(
        (r) => r.body.data.items as AdminUserListItemT[],
      );
      expect(byName.map((i) => i.id)).toContain(seeded[7]?.id);
      // A mid-handle fragment is not a prefix.
      const mid = await list(`q=${tag}`).then((r) => r.body.data.items as AdminUserListItemT[]);
      expect(mid.map((i) => i.id)).not.toContain(seeded[7]?.id);
    });

    it('matches a non-ASCII display name', async () => {
      const items = await list(`q=${encodeURIComponent('müll')}`).then(
        (r) => r.body.data.items as AdminUserListItemT[],
      );
      expect(items.map((i) => i.id)).toContain(seeded[0]?.id);
    });

    it('matches an email exactly, ignoring case, and still returns it masked', async () => {
      const target = seeded[8] as Actor;
      for (const q of [target.email, target.email.toUpperCase()]) {
        const items = await list(`q=${encodeURIComponent(q)}`).then(
          (r) => r.body.data.items as AdminUserListItemT[],
        );
        expect(items.map((i) => i.id)).toEqual([target.id]);
        expect(items[0]?.emailMasked).toBe(`e***@example.test`);
      }
    });

    it('does not match part of an email', async () => {
      const target = seeded[8] as Actor;
      const partial = target.email.slice(0, target.email.indexOf('@') - 2);
      for (const q of [`${partial}@example.te`, 'example.test', 'example']) {
        const items = await list(`q=${encodeURIComponent(q)}`).then(
          (r) => r.body.data.items as AdminUserListItemT[],
        );
        expect(items.map((i) => i.id)).not.toContain(target.id);
      }
    });

    it('matches a phone exactly in national and international form, never partially', async () => {
      const national = `0${phone.slice(3)}`;
      for (const q of [phone, national, `${national.slice(0, 4)} ${national.slice(4)}`]) {
        const items = await list(`q=${encodeURIComponent(q)}`).then(
          (r) => r.body.data.items as AdminUserListItemT[],
        );
        expect(items.map((i) => i.id)).toEqual([seeded[5]?.id]);
      }
      const partial = await list(`q=${encodeURIComponent(phone.slice(0, -2))}`).then(
        (r) => r.body.data.items as AdminUserListItemT[],
      );
      expect(partial.map((i) => i.id)).not.toContain(seeded[5]?.id);
    });

    it('matches a uuid against the id', async () => {
      const items = await list(`q=${seeded[9]?.id}`).then((r) => r.body.data.items as AdminUserListItemT[]);
      expect(items.map((i) => i.id)).toEqual([seeded[9]?.id]);
    });

    it('treats % and _ literally', async () => {
      const pct = await list(`q=${encodeURIComponent('a%b')}`).then(
        (r) => r.body.data.items as AdminUserListItemT[],
      );
      expect(pct.map((i) => i.id)).toContain(seeded[1]?.id);
      expect(pct.map((i) => i.id)).not.toContain(seeded[2]?.id);
      const und = await list(`q=${encodeURIComponent('a_b')}`).then(
        (r) => r.body.data.items as AdminUserListItemT[],
      );
      expect(und.map((i) => i.id)).toContain(seeded[2]?.id);
      expect(und.map((i) => i.id)).not.toContain(seeded[1]?.id);
      const wild = await list(`q=${encodeURIComponent('%%')}`).then(
        (r) => r.body.data.items as AdminUserListItemT[],
      );
      expect(wild.map((i) => i.id)).not.toContain(seeded[7]?.id);
    });
  });

  describe('filters', () => {
    const ids = (items: AdminUserListItemT[]) => items.map((i) => i.id);
    const run = (extra: string) => walk(scoped(`includeDeleted=true&${extra}`));

    it('filters by role, including CSV', async () => {
      expect(ids(await run('role=moderator'))).toEqual(
        expect.arrayContaining([seeded[10]?.id, seeded[11]?.id]),
      );
      const only = await run('role=moderator');
      expect(only.every((i) => i.role === 'moderator')).toBe(true);
      expect(only).toHaveLength(2);
      expect(await run('role=moderator,admin')).toHaveLength(2);
    });

    it('filters by status', async () => {
      const items = await run('status=suspended');
      expect(ids(items)).toEqual([seeded[12]?.id]);
    });

    it('filters by trust range', async () => {
      const items = await run('trustMin=4&trustMax=5');
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i) => i.trustLevel >= 4)).toBe(true);
      expect(items).toHaveLength(10);
    });

    it('treats joinedTo as exclusive and joinedFrom as inclusive', async () => {
      const t = new Date(BASE + 5 * 3_600_000).toISOString();
      const before = await run(`joinedTo=${encodeURIComponent(t)}`);
      expect(before).toHaveLength(5);
      const from = await run(`joinedFrom=${encodeURIComponent(t)}`);
      expect(ids(from)).toContain(seeded[5]?.id);
      expect(from).toHaveLength(N - 5);
    });

    it('hides deleted and anonymized accounts unless asked, and flags them', async () => {
      const def = await walk(scoped());
      expect(def).toHaveLength(N - 2);
      expect(ids(def)).not.toContain(seeded[3]?.id);
      expect(ids(def)).not.toContain(seeded[4]?.id);
      const all = await run('');
      expect(all).toHaveLength(N);
      expect(all.filter((i) => i.deleted).map((i) => i.id).sort((a, b) => a.localeCompare(b))).toEqual(
        [seeded[3]?.id, seeded[4]?.id].sort((a, b) => String(a).localeCompare(String(b))),
      );
    });
  });

  describe('sort and cursor', () => {
    it('returns 25 with a cursor, then the rest, then null', async () => {
      const first = await list(scoped('includeDeleted=true')).then((r) => r.body.data);
      expect(first.items).toHaveLength(25);
      expect(first.nextCursor).not.toBeNull();
      const second = await list(scoped(`includeDeleted=true&cursor=${first.nextCursor}`)).then(
        (r) => r.body.data,
      );
      expect(second.items).toHaveLength(5);
      expect(second.nextCursor).toBeNull();
      const exact = await list(scoped('includeDeleted=true&limit=30')).then((r) => r.body.data);
      expect(exact.nextCursor).toBeNull();
    });

    it.each([
      ['createdAt', 'asc'],
      ['createdAt', 'desc'],
      ['trustLevel', 'asc'],
      ['trustLevel', 'desc'],
      ['handle', 'asc'],
      ['handle', 'desc'],
      ['lastActiveAt', 'asc'],
      ['lastActiveAt', 'desc'],
    ] as const)('pages %s %s without duplicates or gaps', async (sort, dir) => {
      const items = await walk(scoped(`includeDeleted=true&sort=${sort}&dir=${dir}&limit=7`));
      expect(new Set(items.map((i) => i.id)).size).toBe(N);
      expect(items).toHaveLength(N);
      const sign = dir === 'asc' ? 1 : -1;
      const key = (i: AdminUserListItemT): string | number | null =>
        sort === 'createdAt'
          ? i.createdAt
          : sort === 'trustLevel'
            ? i.trustLevel
            : sort === 'handle'
              ? i.handle
              : i.lastActiveAt;
      let seenNull = false;
      let prev: string | number | null = null;
      for (const item of items) {
        const k = key(item);
        if (k === null) {
          seenNull = true;
          continue;
        }
        expect(seenNull).toBe(false);
        if (prev !== null) expect((k > prev ? 1 : k < prev ? -1 : 0) * sign).toBeGreaterThanOrEqual(0);
        prev = k;
      }
      if (sort === 'lastActiveAt') {
        expect(items.slice(-10).every((i) => i.lastActiveAt === null)).toBe(true);
      }
    });

    it('rejects a tampered cursor or one reused under another sort', async () => {
      const first = await list(scoped('limit=5')).then((r) => r.body.data);
      const cursor = first.nextCursor as string;
      const flipped = `${cursor.slice(0, 4)}${cursor[4] === 'A' ? 'B' : 'A'}${cursor.slice(5)}`;
      for (const qs of [
        scoped(`limit=5&cursor=${flipped}`),
        scoped(`limit=5&sort=handle&cursor=${cursor}`),
        scoped(`limit=5&dir=asc&cursor=${cursor}`),
        scoped('limit=5&cursor=not-a-cursor'),
      ]) {
        const res = await expectStatus(list(qs), 400);
        expect(res.body.error?.code ?? res.body.code).toBe('ADMIN_CURSOR_INVALID');
      }
    });

    it('answers 400 ADMIN_CURSOR_INVALID to a well-shaped cursor with an impossible value', async () => {
      const id = unknownId();
      const cases: [string, string, string | null][] = [
        ['createdAt', 'desc', '2025-99-99T99:99:99.000000Z'],
        ['createdAt', 'desc', '2025-02-30T10:00:00.000000Z'],
        ['createdAt', 'desc', '0001-01-01T00:00:00.000000Z'],
        ['lastActiveAt', 'desc', '2025-13-01T00:00:00.000000Z'],
        ['handle', 'desc', 'ab\u0000cd'],
        ['handle', 'desc', 'UPPER_CASE'],
        ['handle', 'desc', 'has space'],
        ['trustLevel', 'desc', '9'],
        ['trustLevel', 'desc', 'x'],
      ];
      for (const [sort, dir, v] of cases) {
        const cursor = forge({ s: sort, d: dir, v, id });
        const res = await expectStatus(list(`sort=${sort}&dir=${dir}&cursor=${cursor}`), 400);
        expect(res.body).toEqual({ code: 'ADMIN_CURSOR_INVALID', messageKey: 'errors.admin.cursorInvalid' });
      }
    });
  });

  describe('invalid query', () => {
    it.each([
      'trustMin=7',
      'limit=500',
      'status=archived',
      'q=a',
      'q=%00ab',
      'joinedFrom=0000-01-01T00:00:00.000Z',
      'joinedTo=2500-01-01T00:00:00.000Z',
      'q=ab%07',
      'unknown=1',
      'trustMin=4&trustMax=2',
      'sort=email',
      'joinedFrom=2031-01-02T00:00:00.000Z&joinedTo=2031-01-01T00:00:00.000Z',
    ])('answers 400 ADMIN_QUERY_INVALID for %s', async (qs) => {
      const res = await expectStatus(list(qs), 400);
      const body = res.body.error ?? res.body;
      expect(body.code).toBe('ADMIN_QUERY_INVALID');
      expect(body.messageKey).toBe('errors.admin.queryInvalid');
    });
  });

  describe('detail', () => {
    let subject: Actor;

    beforeAll(async () => {
      subject = seeded[20] as Actor;
      const ev = await pool.query<{ id: string }>(
        `INSERT INTO events (organizer_id, area_id, slug, title, location, status)
         VALUES ($1, $2, $3, $4, ST_GeogFromText('POINT(108.24 16.06)'), $5::event_status_enum)
         RETURNING id`,
        [subject.id, areaId, `adu-${tag}-pub`, 'Detail published', 'published'],
      );
      await pool.query(
        `INSERT INTO events (organizer_id, area_id, slug, title, location, status)
         VALUES ($1, $2, $3, 'Detail draft', ST_GeogFromText('POINT(108.24 16.06)'), 'draft')`,
        [subject.id, areaId, `adu-${tag}-draft`],
      );
      const occ = await pool.query<{ id: string }>(
        `INSERT INTO event_occurrences (event_id, starts_at, capacity)
         VALUES ($1, '2031-06-01T10:00:00Z', 10) RETURNING id`,
        [ev.rows[0]?.id],
      );
      await pool.query(
        `INSERT INTO rsvps (occurrence_id, user_id, status) VALUES ($1, $2, 'confirmed')`,
        [occ.rows[0]?.id, subject.id],
      );
      await pool.query(
        `INSERT INTO posts (author_user_id, body, status)
         VALUES ($1, $2, 'visible'), ($1, 'hidden one', 'hidden')`,
        [subject.id, 'x'.repeat(300)],
      );
      await pool.query(
        `INSERT INTO trust_signals (user_id, type, status, weight, evidence_type, metadata, verified_at)
         VALUES ($1, 'email_verified', 'verified', 1, 'manual', '{"secret":1}', now())`,
        [subject.id],
      );
      await pool.query(`UPDATE profiles SET bio = $2 WHERE user_id = $1`, [subject.id, 'b'.repeat(900)]);
    });

    it('returns every block, with drafts left out and excerpts truncated', async () => {
      const res = await expectStatus(get(`${LIST}/${subject.id}`, admin), 200);
      const d = res.body.data;
      expect(d.id).toBe(subject.id);
      expect(d.profile.bio).toHaveLength(500);
      expect(d.account.emailMasked).toBe('e***@example.test');
      expect(d.trust.signals).toHaveLength(1);
      expect(d.hostedEvents.total).toBe(1);
      expect(d.hostedEvents.items[0].title).toBe('Detail published');
      expect(d.rsvps.total).toBe(1);
      expect(d.posts.total).toBe(2);
      expect(d.posts.items.map((p: { excerpt: string }) => p.excerpt.length).sort((a: number, b: number) => a - b)).toEqual([10, 140]);
      expect(d.sessions.activeCount).toBeGreaterThanOrEqual(1);
      const keys = allKeys(res.body);
      for (const banned of BANNED) expect(keys).not.toContain(banned);
      expect(JSON.stringify(res.body)).not.toContain(subject.email);
    });

    it('shows a soft-deleted account with its deletion fields', async () => {
      const res = await expectStatus(get(`${LIST}/${seeded[3]?.id}`, admin), 200);
      expect(res.body.data.account.deletedAt).not.toBeNull();
    });

    it('returns null emailMasked for an account without an email', async () => {
      const noEmail = await createActor(app);
      await pool.query(`UPDATE users SET email = NULL, email_verified_at = NULL, phone = $2 WHERE id = $1`, [
        noEmail.id,
        newPhone(),
      ]);
      const detail = await expectStatus(get(`${LIST}/${noEmail.id}`, admin), 200);
      expect(detail.body.data.account.emailMasked).toBeNull();
      const found = await list(`q=${noEmail.id}`);
      expect(found.body.data.items[0].emailMasked).toBeNull();
    });

    it('keeps a hosted event with no live occurrence and picks the nearest upcoming start', async () => {
      const host = seeded[21] as Actor;
      const mk = async (slug: string, title: string) =>
        (
          await pool.query<{ id: string }>(
            `INSERT INTO events (organizer_id, area_id, slug, title, location, status)
             VALUES ($1, $2, $3, $4, ST_GeogFromText('POINT(108.24 16.06)'), 'published') RETURNING id`,
            [host.id, areaId, `adu-${tag}-${slug}`, title],
          )
        ).rows[0]?.id as string;
      const recurring = await mk('rec', 'Recurring');
      const pastOnly = await mk('past', 'Past only');
      const none = await mk('none', 'No occurrence');
      const gone = await mk('gone', 'Deleted occurrence');
      const insert = (event: string, startsAt: string, deleted = false) =>
        pool.query(
          `INSERT INTO event_occurrences (event_id, starts_at, capacity, deleted_at)
           VALUES ($1, $2, 5, CASE WHEN $3 THEN now() END)`,
          [event, startsAt, deleted],
        );
      await insert(recurring, '2001-05-01T10:00:00Z');
      await insert(recurring, '2040-02-01T10:00:00Z');
      await insert(recurring, '2040-01-01T10:00:00Z');
      await insert(pastOnly, '2001-06-01T10:00:00Z');
      await insert(pastOnly, '2001-07-01T10:00:00Z');
      await insert(gone, '2041-01-01T10:00:00Z', true);

      const res = await expectStatus(get(`${LIST}/${host.id}`, admin), 200);
      const hosted = res.body.data.hostedEvents as {
        items: { id: string; startsAt: string }[];
        total: number;
      };
      expect(hosted.total).toBe(4);
      const at = (id: string): string | null | undefined => hosted.items.find((i) => i.id === id)?.startsAt;
      expect(at(recurring)).toBe('2040-01-01T10:00:00.000Z');
      expect(at(pastOnly)).toBe('2001-07-01T10:00:00.000Z');
      expect(at(none)).toBeNull();
      expect(at(gone)).toBeNull();
    });

    it('blanks authored text and contact data of an anonymized account', async () => {
      const target = seeded[4] as Actor;
      await pool.query(
        `UPDATE profiles SET bio = 'secret bio', headline = 'secret headline' WHERE user_id = $1`,
        [target.id],
      );
      await pool.query(
        `UPDATE users SET suspension_reason = 'secret reason', phone = $2 WHERE id = $1`,
        [target.id, newPhone()],
      );
      await pool.query(`INSERT INTO posts (author_user_id, body, status) VALUES ($1, 'secret post', 'visible')`, [
        target.id,
      ]);
      const res = await expectStatus(get(`${LIST}/${target.id}`, admin), 200);
      const d = res.body.data;
      expect(d.account.anonymizedAt).not.toBeNull();
      expect(d.profile.bio).toBeNull();
      expect(d.profile.headline).toBeNull();
      expect(d.account.emailMasked).toBeNull();
      expect(d.account.phoneMasked).toBeNull();
      expect(d.account.suspensionReason).toBeNull();
      expect(d.posts).toEqual({ items: [], total: 0 });
      expect(JSON.stringify(res.body)).not.toContain('secret');
      const listed = await expectStatus(list(`q=${prefix}_04&includeDeleted=true`), 200);
      const row = (listed.body.data.items as AdminUserListItemT[]).find((i) => i.id === target.id);
      expect(row).toBeDefined();
      expect(row?.emailMasked).toBeNull();
      expect(row?.phoneMasked).toBeNull();
    });

    it('never holds more than 3 pool connections and issues only reads', async () => {
      const appPool = app.get<Pool>(PG_POOL);
      const original = appPool.query.bind(appPool) as (...args: unknown[]) => Promise<unknown>;
      let inFlight = 0;
      let peak = 0;
      const statements: string[] = [];
      const spy = vi.spyOn(appPool, 'query').mockImplementation(((...args: unknown[]) => {
        const first = args[0];
        const sql = typeof first === 'string' ? first : String((first as { text?: string }).text);
        // The auth guard touches last_active_at on its own, outside the handler under test.
        if (sql.startsWith('UPDATE users SET last_active_at')) return original(...args);
        statements.push(sql);
        inFlight++;
        peak = Math.max(peak, inFlight);
        return original(...args).finally(() => {
          inFlight--;
        });
      }) as never);
      try {
        await expectStatus(get(`${LIST}/${seeded[21]?.id}`, admin), 200);
        await expectStatus(get(`${LIST}/${subject.id}`, admin), 200);
        await expectStatus(list(scoped('limit=5')), 200);
      } finally {
        spy.mockRestore();
      }
      expect(peak).toBeLessThanOrEqual(3);
      const writes = statements.filter((sql) => /^\s*(INSERT|UPDATE|DELETE|TRUNCATE|MERGE)\b/i.test(sql));
      expect(writes).toEqual([]);
      expect(statements.length).toBeGreaterThan(6);
    });

    it('logs only the user id and answers 404 when the profile row is missing', async () => {
      const orphan = await createActor(app);
      await pool.query(`DELETE FROM profiles WHERE user_id = $1`, [orphan.id]);
      const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      try {
        const res = await expectStatus(get(`${LIST}/${orphan.id}`, admin), 404);
        expect((res.body.error ?? res.body).code).toBe('USER_NOT_FOUND');
        const ours = warn.mock.calls.filter((c) => String(c[0]).includes(orphan.id));
        expect(ours).toHaveLength(1);
        expect(String(ours[0]?.[0])).toBe(`user ${orphan.id} has no profile row; detail answered 404`);
        expect(String(ours[0]?.[0])).not.toContain(orphan.email);
      } finally {
        warn.mockRestore();
      }
    });

    it('answers 404 USER_NOT_FOUND for an unknown id and 400 for a malformed one', async () => {
      const nf = await expectStatus(get(`${LIST}/${unknownId()}`, admin), 404);
      expect((nf.body.error ?? nf.body).code).toBe('USER_NOT_FOUND');
      await get(`${LIST}/not-a-uuid`, admin).expect(400);
    });
  });
});

describe('admin mask SQL parity', () => {
  let pool: Pool;
  beforeAll(() => {
    pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  });
  afterAll(async () => {
    await pool.end();
  });

  const emails = [
    'anna@gmail.com', 'a@b.co', 'a@b@c.com', 'no-at-sign', '@x.com', 'a@', '', 'a@@b',
    'ÉMILE@x.fr', 'x@y.io', 'UPPER@Case.COM', null,
  ];
  const phones = ['+84901234678', '+14155552671', '+4915112345678', '0901234567', '+8490', null];

  it('maskEmail matches emailMaskSql on every sample', async () => {
    for (const email of emails) {
      const { rows } = await pool.query<{ m: string | null }>(
        `SELECT ${emailMaskSql('t.v')} AS m FROM (SELECT $1::citext AS v) t`,
        [email],
      );
      expect(rows[0]?.m, String(email)).toBe(maskEmail(email));
    }
  });

  it('maskPhone matches phoneMaskSql on every sample', async () => {
    for (const phone of phones) {
      const { rows } = await pool.query<{ m: string | null }>(
        `SELECT ${phoneMaskSql('t.v')} AS m FROM (SELECT $1::text AS v) t`,
        [phone],
      );
      expect(rows[0]?.m, String(phone)).toBe(maskPhone(phone));
    }
  });
});
