import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AreaDetailResponse, AreaResponse, envelope } from '@dnc/contracts';
import { upsertAreas } from '../../../src/database/seeds/areas.js';
import { createTestApp, DATABASE_URL, seedArea, unknownId } from '../../support/harness.js';

/** The six launch areas the discovery filter must expose (S2-DoD-6, M2-4). */
const MVP_SLUGS = ['an-thuong', 'hai-chau', 'my-an', 'my-khe', 'ngu-hanh-son', 'son-tra'];

describe('area module', () => {
  let app: INestApplication;
  let pool: Pool;
  let extraAreaId: string;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    await upsertAreas(pool);
    // A non-launch row, standing in for the rest of the hierarchy the table
    // will hold: the mvp filter has to leave it out.
    ({ areaId: extraAreaId, cleanup } = await seedArea());
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
    await pool.end();
  });

  it('GET /areas?mvp=true returns exactly the six launch areas', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/areas?mvp=true').expect(200);
    const body = envelope(z.array(AreaResponse)).parse(res.body);

    expect(body.data).toHaveLength(6);
    expect(body.data.map((a) => a.slug).sort()).toEqual(MVP_SLUGS);
    expect(body.data.every((a) => a.isMvp)).toBe(true);
    expect(body.data.map((a) => a.id)).not.toContain(extraAreaId);
  });

  it('GET /areas without a filter also lists non-launch areas, flagged as such', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/areas').expect(200);
    const extra = (res.body.data as { id: string; isMvp: boolean }[]).find(
      (a) => a.id === extraAreaId,
    );
    expect(extra?.isMvp).toBe(false);
  });

  it('GET /areas?mvp=false leaves every launch area out', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/areas?mvp=false').expect(200);
    const slugs = (res.body.data as { slug: string }[]).map((a) => a.slug);
    expect(slugs.some((s) => MVP_SLUGS.includes(s))).toBe(false);
  });

  it('rejects an mvp value that is not a boolean', async () => {
    await request(app.getHttpServer()).get('/api/v1/areas?mvp=maybe').expect(400);
  });

  it('GET /areas/:id returns the boundary as a GeoJSON polygon', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/areas?mvp=true').expect(200);
    const haiChau = (list.body.data as { id: string; slug: string }[]).find(
      (a) => a.slug === 'hai-chau',
    );

    const res = await request(app.getHttpServer())
      .get(`/api/v1/areas/${haiChau?.id}`)
      .expect(200);
    const { data } = envelope(AreaDetailResponse).parse(res.body);

    expect(data.boundary.type).toBe('Polygon');
    const ring = data.boundary.coordinates[0] ?? [];
    expect(ring.length).toBeGreaterThanOrEqual(4);
    // A closed ring ends where it starts.
    expect(ring.at(-1)).toEqual(ring[0]);
  });

  it('GET /areas/:id answers 404 for an unknown area', async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/areas/${unknownId()}`).expect(404);
    expect(res.body.code).toBe('AREA_NOT_FOUND');
  });

  it('GET /areas/resolve maps a point inside a launch area to that area', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/areas?mvp=true').expect(200);
    const sonTra = (
      list.body.data as { id: string; slug: string; center: { lat: number; lng: number } }[]
    ).find((a) => a.slug === 'son-tra');

    const res = await request(app.getHttpServer())
      .get('/api/v1/areas/resolve')
      .query({ lat: sonTra?.center.lat, lng: sonTra?.center.lng })
      .expect(200);
    expect(res.body.data.id).toBe(sonTra?.id);
  });

  it('GET /areas/resolve answers 404 for a point outside every area', async () => {
    // Hà Nội — far outside the Đà Nẵng coverage.
    const res = await request(app.getHttpServer())
      .get('/api/v1/areas/resolve')
      .query({ lat: 21.0285, lng: 105.8542 })
      .expect(404);
    expect(res.body.code).toBe('AREA_OUTSIDE_COVERAGE');
  });

  it('is readable without an account', async () => {
    await request(app.getHttpServer()).get('/api/v1/areas').expect(200);
  });
});
