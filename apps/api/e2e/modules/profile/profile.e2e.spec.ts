import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { envelope, MyProfileResponse, PublicProfileResponse } from '@dnc/contracts';
import { createActor, createTestApp, seedArea, type Actor } from '../../support/harness.js';

describe('profile module', () => {
  let app: INestApplication;
  let areaId: string;
  let cleanup: () => Promise<void>;
  let owner: Actor;
  let other: Actor;

  beforeAll(async () => {
    ({ areaId, cleanup } = await seedArea());
    app = await createTestApp();
    owner = await createActor(app);
    other = await createActor(app);
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
  });

  it('creates a profile alongside the account', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set(owner.headers)
      .expect(200);

    const parsed = envelope(MyProfileResponse).parse(res.body);
    expect(parsed.data.handle).toBe(owner.handle);
    expect(parsed.data.email).toBe(owner.email);
    expect(parsed.data.visibility).toBe('public');
  });

  it('serves a public profile to a reader with no account', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/profiles/${owner.handle}`)
      .expect(200);
    envelope(PublicProfileResponse).parse(res.body);
  });

  /**
   * The public shape is an allow-list, not the owner's shape minus a few
   * fields, so a column added to the owner's view cannot leak here by default.
   */
  it('withholds private fields from everyone but the owner', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/profiles/${owner.handle}`)
      .set(other.headers)
      .expect(200);

    for (const leak of ['email', 'birthYear', 'gender', 'visibility', 'trustPoints']) {
      expect(res.body.data).not.toHaveProperty(leak);
    }
  });

  it('lets the owner edit and clear their own fields', async () => {
    const updated = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set(owner.headers)
      .send({
        displayName: 'Updated Name',
        headline: 'Yoga teacher · An Thuong',
        homeAreaId: areaId,
        spokenLanguages: [{ code: 'en', level: 'native' }],
      })
      .expect(200);
    expect(updated.body.data.displayName).toBe('Updated Name');
    expect(updated.body.data.homeAreaId).toBe(areaId);

    // Null is a value here, not an omission: it clears the field.
    const cleared = await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set(owner.headers)
      .send({ headline: null })
      .expect(200);
    expect(cleared.body.data.headline).toBeNull();
    // A field that was not sent keeps its value.
    expect(cleared.body.data.displayName).toBe('Updated Name');
  });

  it('refuses profile edits without an account', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .send({ displayName: 'Anonymous edit' })
      .expect(401);
  });

  /** Hiding the area must hide it from readers while the owner still sees it. */
  it('honours showAreaPublicly', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set(owner.headers)
      .send({ homeAreaId: areaId, showAreaPublicly: false })
      .expect(200);

    const publicView = await request(app.getHttpServer())
      .get(`/api/v1/profiles/${owner.handle}`)
      .expect(200);
    expect(publicView.body.data.homeAreaId).toBeNull();

    const ownerView = await request(app.getHttpServer())
      .get('/api/v1/me/profile')
      .set(owner.headers)
      .expect(200);
    expect(ownerView.body.data.homeAreaId).toBe(areaId);
  });

  /**
   * `members_only` answers 404 to an anonymous reader: telling a stranger that
   * a handle exists but is hidden still tells them the handle exists.
   */
  it('hides a members_only profile from anonymous readers', async () => {
    const shy = await createActor(app);
    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set(shy.headers)
      .send({ visibility: 'members_only' })
      .expect(200);

    await request(app.getHttpServer()).get(`/api/v1/profiles/${shy.handle}`).expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/profiles/${shy.handle}`)
      .set(other.headers)
      .expect(200);
  });

  it('hides a private profile from everyone but its owner', async () => {
    const hidden = await createActor(app);
    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set(hidden.headers)
      .send({ visibility: 'private' })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/profiles/${hidden.handle}`)
      .set(other.headers)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/profiles/${hidden.handle}`)
      .set(hidden.headers)
      .expect(200);
  });

  it('answers 404 for a handle nobody holds', async () => {
    await request(app.getHttpServer()).get('/api/v1/profiles/nobody_here_at_all').expect(404);
  });

  it('rejects an avatar the caller does not own', async () => {
    const theirUpload = await request(app.getHttpServer())
      .post('/api/v1/media/uploads')
      .set(other.headers)
      .send({ kind: 'image', mimeType: 'image/png', byteSize: 128 })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set(owner.headers)
      .send({ avatarMediaId: theirUpload.body.data.mediaId })
      .expect(403);
  });
});
