import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { envelope, MediaUploadResponse, PostResponse } from '@dnc/contracts';
import {
  createActor,
  createTestApp,
  seedArea,
  type Actor,
} from '../../support/harness.js';

/** A 4x4 PNG, small enough to inline and real enough for storage to accept. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAF0lEQVR42mP8z8BQz0AEYBxVSF+FAAhKDveksOjmAAAAAElFTkSuQmCC',
  'base64',
);

describe('media module', () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;

  let author: Actor;
  let stranger: Actor;

  /** Walks the full handshake: reserve, PUT to storage, confirm. */
  const uploadImage = async (user: Actor): Promise<string> => {
    const reserved = await request(app.getHttpServer())
      .post('/api/v1/media/uploads')
      .set(user.headers)
      .send({ kind: 'image', mimeType: 'image/png', byteSize: PNG.byteLength })
      .expect(201);

    const { mediaId, uploadUrl } = envelope(MediaUploadResponse).parse(reserved.body).data;

    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': 'image/png' },
      body: new Uint8Array(PNG),
    });
    expect(put.status, 'presigned PUT accepted by object storage').toBe(200);

    await request(app.getHttpServer())
      .put(`/api/v1/media/${mediaId}/complete`)
      .set(user.headers)
      .send({ width: 4, height: 4 })
      .expect(200);

    return mediaId;
  };

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    author = await createActor(app);
    stranger = await createActor(app);
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
  });

  it('issues a presigned upload the client can use directly', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/media/uploads')
      .set(author.headers)
      .send({ kind: 'image', mimeType: 'image/jpeg', byteSize: 1024 })
      .expect(201);

    const parsed = envelope(MediaUploadResponse).parse(res.body);
    expect(parsed.data.uploadHeaders['content-type']).toBe('image/jpeg');
    expect(parsed.data.expiresInSeconds).toBeGreaterThan(0);
    // The key is derived server-side; the client never names the object.
    expect(parsed.data.uploadUrl).toContain(parsed.data.mediaId);
  });

  it('refuses a disallowed type and an oversized file', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/media/uploads')
      .set(author.headers)
      .send({ kind: 'image', mimeType: 'application/pdf', byteSize: 1024 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/media/uploads')
      .set(author.headers)
      .send({ kind: 'image', mimeType: 'image/png', byteSize: 90 * 1024 * 1024 })
      .expect(400);
  });

  /** Confirming without uploading would attach a permanently broken frame to a post. */
  it('refuses to complete an upload whose bytes never arrived', async () => {
    const reserved = await request(app.getHttpServer())
      .post('/api/v1/media/uploads')
      .set(author.headers)
      .send({ kind: 'image', mimeType: 'image/png', byteSize: PNG.byteLength })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/v1/media/${reserved.body.data.mediaId}/complete`)
      .set(author.headers)
      .send({})
      .expect(400);
  });

  it('completes a real upload and returns a signed URL that fetches the bytes', async () => {
    const mediaId = await uploadImage(author);

    const post = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set(author.headers)
      .send({ kind: 'recommendation', body: 'Photo post', areaId, mediaIds: [mediaId] })
      .expect(201);

    const parsed = envelope(PostResponse).parse(post.body);
    expect(parsed.data.media).toHaveLength(1);
    expect(parsed.data.media[0]?.kind).toBe('image');
    expect(parsed.data.media[0]?.width).toBe(4);

    const fetched = await fetch(parsed.data.media[0]?.url as string);
    expect(fetched.status).toBe(200);
    expect(Buffer.from(await fetched.arrayBuffer()).byteLength).toBe(PNG.byteLength);
  });

  it('hides someone else’s media from completion', async () => {
    const reserved = await request(app.getHttpServer())
      .post('/api/v1/media/uploads')
      .set(author.headers)
      .send({ kind: 'image', mimeType: 'image/png', byteSize: PNG.byteLength })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/v1/media/${reserved.body.data.mediaId}/complete`)
      .set(stranger.headers)
      .send({})
      .expect(404);
  });

  /**
   * Attaching another member's media id would republish their photo under a
   * different name, so unattachable ids are dropped rather than trusted.
   */
  it('drops media the author does not own instead of publishing it', async () => {
    const mine = await uploadImage(author);
    const theirs = await uploadImage(stranger);

    const post = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set(author.headers)
      .send({ kind: 'notice', body: 'Mixed gallery', areaId, mediaIds: [mine, theirs] })
      .expect(201);

    expect(post.body.data.mediaIds).toEqual([mine]);
    expect(post.body.data.media).toHaveLength(1);
  });

  /** A gallery has no item ceiling; the feed's preview budget is a rendering concern. */
  it('accepts a gallery larger than the feed preview budget', async () => {
    // In parallel, the way a picker full of photos actually uploads them.
    const mine = await Promise.all(Array.from({ length: 7 }, () => uploadImage(author)));

    const res = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set(author.headers)
      .send({ kind: 'notice', body: 'Seven photos', areaId, mediaIds: mine })
      .expect(201);

    expect(res.body.data.mediaIds).toHaveLength(7);
    expect(res.body.data.media).toHaveLength(7);
  });

  /**
   * Reservations race.
   *
   * Selecting a picker full of photos fires these together. An implementation
   * that inserts a placeholder key and updates it afterwards passes every
   * sequential test and fails here on `uq_media_storage_key`.
   */
  it('reserves distinct storage keys for simultaneous uploads', async () => {
    const reservations = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app.getHttpServer())
          .post('/api/v1/media/uploads')
          .set(author.headers)
          .send({ kind: 'image', mimeType: 'image/png', byteSize: PNG.byteLength }),
      ),
    );

    expect(reservations.map((r) => r.status)).toEqual(Array(8).fill(201));
    const ids = reservations.map((r) => r.body.data.mediaId as string);
    expect(new Set(ids).size).toBe(8);
  });

  it('stores a location and returns it as plain coordinates', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set(author.headers)
      .send({
        kind: 'recommendation',
        body: 'Great banh mi here',
        areaId,
        location: { lat: 16.0425, lng: 108.2435, label: 'An Thuong' },
      })
      .expect(201);

    expect(res.body.data.location).toEqual({
      lat: expect.closeTo(16.0425, 5),
      lng: expect.closeTo(108.2435, 5),
      label: 'An Thuong',
    });
    // PostGIS output never reaches the client.
    expect(JSON.stringify(res.body)).not.toContain('POINT');
  });

  it('refuses a location with no label', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set(author.headers)
      .send({
        kind: 'notice',
        body: 'Unlabelled pin',
        areaId,
        location: { lat: 16.04, lng: 108.24 },
      })
      .expect(400);
  });
});
