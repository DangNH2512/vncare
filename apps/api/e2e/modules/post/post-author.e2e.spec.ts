import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cursorPage, envelope, PostResponse } from '@dnc/contracts';
import {
  createActor,
  createTestApp,
  DATABASE_URL,
  seedArea,
  type Actor,
} from '../../support/harness.js';

const FORBIDDEN_KEYS = ['email', 'phone', 'role', 'status'];

/** Collects every object key at any depth, minus the post's own `status`. */
function authorKeys(value: unknown): string[] {
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([k, v]) => [k, ...authorKeys(v)]);
}

describe('post and comment author summary', () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;
  let pool: Pool;
  let author: Actor;
  let ghost: Actor;
  let viewer: Actor;
  let ghostPostId: string;
  let authorPostId: string;

  const createPost = async (user: Actor, text: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set(user.headers)
      .send({ kind: 'question', body: text, areaId })
      .expect(201);
    return res.body.data.id as string;
  };

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    author = await createActor(app);
    ghost = await createActor(app);
    viewer = await createActor(app);

    await pool.query(
      `UPDATE profiles SET display_name = $2, visibility = 'private' WHERE user_id = $1`,
      [author.id, '<img src=x onerror=alert(1)>'],
    );
    authorPostId = await createPost(author, 'Author post for the summary spec.');
    ghostPostId = await createPost(ghost, 'Ghost post for the summary spec.');
    await request(app.getHttpServer())
      .post(`/api/v1/posts/${authorPostId}/comments`)
      .set(author.headers)
      .send({ body: 'Own comment.' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/posts/${ghostPostId}/comments`)
      .set(ghost.headers)
      .send({ body: 'Ghost comment.' })
      .expect(201);
    await pool.query(`UPDATE users SET anonymized_at = now() WHERE id = $1`, [ghost.id]);
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
    await cleanup();
  });

  it('fills author with exactly four fields and keeps authorUserId', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/posts/${authorPostId}`)
      .set(viewer.headers)
      .expect(200);
    const post = envelope(PostResponse).parse(res.body).data;
    expect(post.authorUserId).toBe(author.id);
    expect(Object.keys(post.author ?? {}).sort()).toEqual([
      'displayName',
      'handle',
      'trustLevel',
      'userId',
    ]);
    expect(post.author?.userId).toBe(author.id);
    expect(post.author?.handle).toBe(author.handle);
    expect(typeof post.author?.trustLevel).toBe('number');
    const keys = authorKeys(post.author);
    for (const forbidden of FORBIDDEN_KEYS) expect(keys).not.toContain(forbidden);
  });

  it('shows the name of a private profile and returns markup verbatim', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/posts/${authorPostId}`)
      .set(viewer.headers)
      .expect(200);
    expect(res.body.data.author.displayName).toBe('<img src=x onerror=alert(1)>');
  });

  it('lists posts with author and null for an anonymized account', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/posts?limit=20&areaId=${areaId}`)
      .set(viewer.headers)
      .expect(200);
    const page = envelope(cursorPage(PostResponse)).parse(res.body).data;
    const mine = page.items.find((p) => p.id === authorPostId);
    const gone = page.items.find((p) => p.id === ghostPostId);
    expect(mine?.author?.userId).toBe(author.id);
    expect(gone).toBeDefined();
    expect(gone?.author).toBeNull();
    expect(gone?.authorUserId).toBe(ghost.id);
  });

  it('keeps keyset pagination intact with the author join', async () => {
    const first = await request(app.getHttpServer())
      .get(`/api/v1/posts?limit=1&areaId=${areaId}`)
      .set(viewer.headers)
      .expect(200);
    const cursor = first.body.data.nextCursor;
    expect(cursor).toBeTruthy();
    const second = await request(app.getHttpServer())
      .get(`/api/v1/posts?limit=1&areaId=${areaId}&cursor=${encodeURIComponent(cursor)}`)
      .set(viewer.headers)
      .expect(200);
    expect(second.body.data.items[0].id).not.toBe(first.body.data.items[0].id);
  });

  it('fills comment author and nulls it for an anonymized account', async () => {
    const own = await request(app.getHttpServer())
      .get(`/api/v1/posts/${authorPostId}/comments`)
      .set(viewer.headers)
      .expect(200);
    const c = own.body.data.items[0];
    expect(c.userId).toBe(author.id);
    expect(Object.keys(c.author).sort()).toEqual(['displayName', 'handle', 'trustLevel', 'userId']);

    const gone = await request(app.getHttpServer())
      .get(`/api/v1/posts/${ghostPostId}/comments`)
      .set(viewer.headers)
      .expect(200);
    expect(gone.body.data.items[0].author).toBeNull();
    expect(gone.body.data.items[0].userId).toBe(ghost.id);
  });
});
