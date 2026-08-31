---
name: database-migrations
description: Thay đổi schema PostgreSQL an toàn bằng migration TypeORM cho Da Nang Connect — bảng events, rsvps, users, profiles, areas, reports..., kể cả migration thêm cột PostGIS. Dùng khi thêm/sửa bảng, cột, enum, index, cột địa lý, backfill dữ liệu, HOẶC trước mọi lần deploy staging/production. Áp cổng STOP đổi schema và bước đối chiếu schema trước deploy.
---

# Database Migrations — TypeORM + PostgreSQL 16 + PostGIS

> **⚠️ Hai cổng luôn áp dụng.**
> 1. **Cổng STOP đổi schema** — mọi thay đổi bảng/cột/enum/index cần cảnh báo
>    migration + người dùng duyệt rõ ràng **TRƯỚC KHI** viết file migration.
> 2. **Cổng không tự deploy** — chạy migration lên server **remote** (staging hoặc
>    production) là hành động deploy, cần người dùng duyệt **từng lần**. **Điều tra
>    chỉ đọc** (`\d`, `\dt`, `migration:show`, so sánh schema) thì luôn được phép.

Stack: **PostgreSQL 16 + PostGIS 3.4, TypeORM 0.3.2x, `synchronize: false`**.
Migration là **class TypeScript** trong `apps/api/src/database/migrations/`, chạy qua
TypeORM CLI. Không dùng file `.sql` rời, không dùng `synchronize` kể cả ở môi trường dev.

Nguồn sự thật về schema: `docs/analysis/03-domain-va-du-lieu.md`.

---

## 1. DataSource và quy ước file

`apps/api/src/database/data-source.ts` là DataSource dùng cho CLI:

```ts
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export const AppDataSource = new DataSource({
  type: 'postgres',
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,                  // luôn dùng migration, kể cả ở dev
  migrationsTransactionMode: 'each',   // mỗi file chạy trong transaction riêng
  migrations: ['src/database/migrations/*.ts'],
  entities: ['src/**/*.entity.ts'],
  extra: { options: '-c timezone=UTC' },
});
```

| Mục | Giá trị |
|---|---|
| Vị trí | `apps/api/src/database/migrations/` |
| Đặt tên | `<epoch_ms>-<PascalCase>.ts` — ví dụ `1756598400000-CreateEventTable.ts` |
| Thứ tự | Theo timestamp trong tên file. **Không bao giờ** đổi số hay đổi tên file đã chạy |
| Bảng theo dõi | `migrations(id, timestamp, name)` — TypeORM tự quản lý |
| Entity | Cập nhật `*.entity.ts` tương ứng trong cùng commit |
| Seed | `apps/api/src/database/seeds/` — khu vực Đà Nẵng, danh mục sự kiện |

### Script cần có trong `apps/api/package.json`

```jsonc
"scripts": {
  "typeorm": "typeorm-ts-node-commonjs -d src/database/data-source.ts",
  "migration:create": "typeorm-ts-node-commonjs migration:create",
  "migration:generate": "pnpm typeorm migration:generate",
  "migration:run": "pnpm typeorm migration:run",
  "migration:revert": "pnpm typeorm migration:revert",
  "migration:show": "pnpm typeorm migration:show"
}
```

```bash
# Xem trạng thái (chỉ đọc — luôn được phép)
pnpm --filter @dnc/api migration:show

# Tạo file rỗng để tự viết (khuyên dùng cho PostGIS, enum, backfill)
pnpm --filter @dnc/api migration:create src/database/migrations/AddEventGeoPoint

# Sinh từ diff entity ↔ database (PHẢI đọc lại SQL sinh ra trước khi commit)
pnpm --filter @dnc/api migration:generate src/database/migrations/AddRsvpWaitlist

# Chạy trên local
pnpm --filter @dnc/api migration:run
```

> **`migration:generate` không phải nút bấm cho xong.** Nó không hiểu cột PostGIS,
> partial unique index, enum Postgres, index GIST, hay `CHECK` constraint tự viết. Với
> những thứ đó nó sẽ sinh diff sai hoặc sinh lặp lại mỗi lần chạy. Quy tắc: **đọc từng
> dòng SQL sinh ra, xoá phần rác, tự viết phần địa lý.**

### Khung file migration

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thêm cột toạ độ cho bảng events + index GIST.
 * WHY: màn hình Discover lọc sự kiện theo bán kính quanh vị trí người dùng.
 * Cột dùng geography(Point,4326) — ST_DWithin trả khoảng cách theo mét.
 */
export class AddEventGeoPoint1756598400000 implements MigrationInterface {
  name = 'AddEventGeoPoint1756598400000';

  public async up(queryRunner: QueryRunner): Promise<void> { /* ... */ }
  public async down(queryRunner: QueryRunner): Promise<void> { /* ... */ }
}
```

`down()` bắt buộc phải viết và phải chạy được **trên local**. Ở production thì
forward-only (xem mục 6), nhưng `down()` là công cụ để lập trình viên thử lại nhanh.

---

## 2. Môi trường

| Môi trường | Nơi chạy | Migration được áp dụng thế nào |
|---|---|---|
| **local** | `ops/compose/docker-compose.local.yml` (postgres+postgis, redis, minio, mailpit) | Thủ công: `pnpm --filter @dnc/api migration:run` |
| **staging** | Docker Compose trên host staging | **Tự động** — job migration trong `.github/workflows/deploy-staging.yml`, chạy **trước** khi rollout container API |
| **production** | Docker Compose trên host production | **Tự động** — job migration trong `.github/workflows/deploy-production.yml`, chạy **sau** bước backup và **trước** rollout |

Thứ tự bất di bất dịch trong pipeline deploy:

```
backup database → migration:run → rollout container API → health check → (rollback nếu fail)
```

**Hệ quả phải thiết kế theo:**

- Migration lỗi thì **chặn cả lần deploy** — container API cũ vẫn chạy, schema chưa
  đổi. Đây là hành vi mong muốn: thà không deploy còn hơn deploy code trỏ vào bảng
  chưa tồn tại.
- Vì `migrationsTransactionMode: 'each'`, mỗi file được bọc trong một transaction →
  file lỗi giữa chừng sẽ **rollback sạch** và **không** được ghi vào bảng `migrations`.
  Điều này chỉ đúng nếu file **không** chứa lệnh không chạy được trong transaction
  (xem mục 5).
- Container API cũ và mới có thể **cùng chạy** vài giây lúc rollout → migration phải
  **tương thích ngược một bước**: đừng xoá cột mà code cũ còn đọc trong cùng một lần
  deploy. Xem mục 4 (đổi tên cột trong ba lần deploy).

---

## 3. 🚦 Đối chiếu schema trước deploy (BẮT BUỘC, mọi môi trường)

> **Luật:** trước khi deploy lên bất kỳ server nào, xác nhận mọi bảng/cột/enum mà code
> mới cần đều đã có migration tương ứng và migration đó sẽ chạy trong lần deploy này.
> Không bao giờ deploy code truy vấn một cột mà server đích chưa có.

### Bước 1 — Điều tra server đích (chỉ đọc, không cần duyệt)

```bash
# Server đích đã chạy tới migration nào?
pnpm --filter @dnc/api migration:show          # với biến môi trường trỏ vào DB đích

# Bảng và cột thực tế trên server đích
psql "$DATABASE_URL" -c "\dt"
psql "$DATABASE_URL" -c "\d+ events"
psql "$DATABASE_URL" -c "\d+ rsvps"

# Extension đã bật chưa (PostGIS là điều kiện sống còn của module area/search)
psql "$DATABASE_URL" -c "SELECT extname FROM pg_extension ORDER BY 1;"
```

### Bước 2 — So sánh với local

```bash
# Migration có trong repo nhưng chưa chạy trên đích
pnpm --filter @dnc/api migration:show | grep -i "\[ \]"

# Bảng khai báo trong migration của repo
grep -rhoE "CREATE TABLE (IF NOT EXISTS )?\"?[a-z_]+" \
  apps/api/src/database/migrations/*.ts | awk '{print $NF}' | tr -d '"' | sort -u
```

Liệt kê mọi đối tượng có ở local mà thiếu trên đích. Mỗi khoảng trống phải được phủ
bởi một file migration mà pipeline sẽ chạy.

### Bước 3 — Kiểm tra tính tương thích ngược

Với mỗi migration sắp chạy, trả lời: *container API cũ có sống sót sau khi migration
này chạy xong không?* Nếu câu trả lời là không (xoá cột, đổi tên cột, thêm `NOT NULL`
không default), phải tách thành nhiều lần deploy.

### Bước 4 — Áp dụng lên server đích (cần duyệt rõ ràng)

Theo cổng không tự deploy: chạy migration lên remote cần người dùng đồng ý từng lần.
Đường mặc định là để pipeline chạy; chỉ can thiệp tay khi pipeline đã hỏng.

### Bước 5 — Xác minh rồi mới rollout

```bash
psql "$DATABASE_URL" -c \
  "SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='events' AND column_name='geo_point');"
```

---

## 4. PostGIS — phần dễ sai nhất của dự án này

Truy vấn theo khu vực (My Khe, An Thuong, My An, Hai Chau, Son Tra, Ngu Hanh Son) và
theo bán kính là tính năng lõi. Cột địa lý phải viết tay, không để `migration:generate`
tự sinh.

### 4.1 Bật extension — migration đầu tiên, chạy trước mọi thứ khác

```ts
public async up(q: QueryRunner): Promise<void> {
  await q.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
  await q.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await q.query(`CREATE EXTENSION IF NOT EXISTS citext`);
  await q.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  await q.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
}
```

`CREATE EXTENSION` cần quyền superuser hoặc user đã được cấp quyền. Trên staging và
production, extension phải được bật **một lần khi provision database**, không phụ
thuộc vào việc migration chạy bằng user nào. `IF NOT EXISTS` giữ cho file idempotent.

### 4.2 Thêm cột toạ độ + index GIST

```ts
public async up(q: QueryRunner): Promise<void> {
  await q.query(`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS geo_point geography(Point,4326)
  `);

  // Index GIST là bắt buộc — thiếu nó, ST_DWithin quét toàn bảng.
  await q.query(`
    CREATE INDEX IF NOT EXISTS idx_events_geo_point
    ON events USING GIST (geo_point)
  `);
}

public async down(q: QueryRunner): Promise<void> {
  await q.query(`DROP INDEX IF EXISTS idx_events_geo_point`);
  await q.query(`ALTER TABLE events DROP COLUMN IF EXISTS geo_point`);
}
```

### 4.3 Ba cái bẫy toạ độ — đọc kỹ trước khi viết

1. **Thứ tự là `(lng, lat)`**, không phải `(lat, lng)`. `ST_MakePoint(lng, lat)` và
   GeoJSON `coordinates: [lng, lat]`. Đảo thứ tự sẽ đưa mọi sự kiện Đà Nẵng
   (≈ `16.05, 108.22`) ra giữa Ấn Độ Dương mà **không** báo lỗi.
2. **`geography` chứ không phải `geometry`.** `geography(Point,4326)` cho khoảng cách
   theo **mét** trên mặt cầu — `ST_DWithin(a, b, 1500)` là "trong bán kính 1500 m".
   Với `geometry` cùng SRID 4326, cùng lệnh đó có nghĩa "trong 1500 **độ**" — sai
   hoàn toàn và vẫn chạy.
3. **SRID luôn là 4326.** Điểm ghép từ raw SQL phải có `::geography` hoặc
   `ST_SetSRID(..., 4326)`, nếu không Postgres từ chối so sánh.

### 4.4 Backfill từ cột lat/lng có sẵn — file migration RIÊNG

```ts
// Backfill là DML, tách khỏi file DDL ở 4.2.
await q.query(`
  UPDATE events
  SET geo_point = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  WHERE geo_point IS NULL
    AND longitude IS NOT NULL
    AND latitude IS NOT NULL
`);
```

Bảng lớn thì backfill theo lô (`WHERE id > $cursor LIMIT 5000`) trong một BullMQ job,
không nhét vào migration — migration giữ transaction mở quá lâu sẽ khoá bảng.

### 4.5 Ranh giới khu vực Đà Nẵng

```ts
await q.query(`
  ALTER TABLE areas
  ADD COLUMN IF NOT EXISTS boundary geography(MultiPolygon,4326),
  ADD COLUMN IF NOT EXISTS center   geography(Point,4326)
`);
await q.query(`
  CREATE INDEX IF NOT EXISTS idx_areas_boundary ON areas USING GIST (boundary)
`);
```

Dữ liệu ranh giới thật của sáu khu vực là **seed**, không phải migration — đặt ở
`apps/api/src/database/seeds/` và chạy bằng `ops/scripts/seed-danang-areas.ts`. Lý do:
ranh giới sẽ được chỉnh nhiều lần theo phản hồi cộng đồng, không nên khoá vào lịch sử
migration bất biến.

### 4.6 Entity phải khớp cột địa lý

```ts
@Index({ spatial: true })
@Column({
  type: 'geography',
  spatialFeatureType: 'Point',
  srid: 4326,
  nullable: true,
})
geoPoint: Point | null;
```

Khai báo đúng như trên thì `migration:generate` mới thôi sinh diff lặp cho cột địa lý.
Dù vậy, **vẫn luôn đọc lại** SQL nó sinh ra.

---

## 5. Quy tắc bất biến khi viết migration

Vì `migrationsTransactionMode: 'each'`, mọi file chạy trong một transaction. Ba loại
lệnh **không** chạy được trong transaction:

| Lệnh | Vấn đề | Cách xử lý |
|---|---|---|
| `CREATE INDEX CONCURRENTLY` | Postgres cấm trong transaction block | Dùng `CREATE INDEX` thường. Bảng thật sự lớn thì đặt `public transaction = false;` trong class migration, hoặc áp tay ngoài giờ cao điểm rồi ghi nhận riêng |
| `ALTER TYPE ... ADD VALUE` rồi **dùng ngay** giá trị mới | Postgres cho thêm value trong transaction (từ PG12) nhưng **không cho dùng** trước khi commit | Tách hai file: file 1 thêm value vào enum, file 2 mới `UPDATE` dữ liệu sang value đó |
| `VACUUM`, `REINDEX CONCURRENTLY` | Không chạy trong transaction | Không đưa vào migration |

Ngoài ra, mọi file nên **idempotent** để chạy lại được sau khi khôi phục từ backup:

- `CREATE TABLE IF NOT EXISTS`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DROP ... IF EXISTS`
- Seed/upsert dùng `ON CONFLICT DO NOTHING` hoặc `DO UPDATE`

---

## 6. Nguyên tắc cốt lõi

1. **Mọi thay đổi schema là migration** — không bao giờ sửa tay database trên server
   ngoài file migration được theo dõi (trừ thao tác chỉ đọc).
2. **Forward-only ở production** — muốn huỷ một thay đổi thì viết migration tiến mới,
   không chạy `migration:revert` trên production.
3. **Tách DDL khỏi DML** — thay đổi schema và backfill dữ liệu nằm ở hai file khác nhau.
4. **Không bao giờ sửa migration đã chạy** — file đã chạy trên bất kỳ server nào là bất
   biến; thêm file mới.
5. **Entity đi cùng migration trong một commit** — `*.entity.ts` và schema không được
   lệch nhau dù chỉ một commit.
6. **Đổi tên cột = ba lần deploy**, không phải một:
   `deploy 1` thêm cột mới + ghi cả hai → `deploy 2` code chỉ đọc cột mới →
   `deploy 3` xoá cột cũ. Đây là cách duy nhất để rollout không rơi request.

---

## 7. Checklist an toàn (trước khi áp dụng)

- [ ] **Cột mới là nullable hoặc có DEFAULT** — không bao giờ `NOT NULL` không default
      trên bảng đã có dữ liệu.
- [ ] **File idempotent** (`IF NOT EXISTS` ở mọi chỗ) — sống sót khi chạy lại.
- [ ] **Không có lệnh cấm-transaction** trong file (mục 5).
- [ ] **Backfill nằm ở file riêng** so với thay đổi schema.
- [ ] **UNIQUE trên bảng có xoá mềm là partial index** `WHERE deleted_at IS NULL` —
      nếu không, người dùng không RSVP lại được sự kiện họ từng huỷ.
- [ ] **Cột địa lý là `geography(Point,4326)` và có index GIST** — không có index thì
      truy vấn bán kính quét toàn bảng.
- [ ] **Thứ tự index tổ hợp: cột so sánh bằng trước, cột khoảng sau** — ví dụ
      `(area_id, status, starts_at)` cho feed sự kiện sắp diễn ra theo khu vực.
- [ ] **Khoá ngoại có `ON DELETE` rõ ràng** — `CASCADE` cho dữ liệu phụ thuộc hoàn
      toàn (`rsvps` → `events`), `RESTRICT` cho tham chiếu dùng chung (`events` → `areas`).
- [ ] **Cột đếm có ràng buộc CHECK** — `ck_events_capacity_positive`. Số đếm RSVP
      không được âm.
- [ ] **Hình dạng jsonb được ghi rõ trong docblock** của migration.
- [ ] **Đối chiếu schema trước deploy đã làm** (mục 3).
- [ ] **Kế hoạch quay lui đã ghi rõ** — chính là migration tiến sẽ đảo ngược nó.

---

## 8. Mẫu SQL đúng chuẩn dự án

```sql
-- ✅ Bảng mới — idempotent, id là uuid v7 do ứng dụng sinh
CREATE TABLE IF NOT EXISTS rsvps (
  id             uuid PRIMARY KEY,
  occurrence_id  uuid NOT NULL REFERENCES event_occurrences(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         rsvp_status_enum NOT NULL DEFAULT 'going',
  guest_count    smallint NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  version        integer NOT NULL DEFAULT 1,
  CONSTRAINT ck_rsvps_guest_count_non_negative CHECK (guest_count >= 0)
);

-- ✅ Unique có xoá mềm — BẮT BUỘC là partial index
CREATE UNIQUE INDEX IF NOT EXISTS uq_rsvps_occurrence_user
  ON rsvps (occurrence_id, user_id) WHERE deleted_at IS NULL;

-- ✅ Index cho feed sự kiện theo khu vực: bằng trước, khoảng sau
CREATE INDEX IF NOT EXISTS idx_events_area_status_starts_at
  ON events (area_id, status, starts_at) WHERE deleted_at IS NULL;

-- ✅ Cột nullable, không khoá bảng lâu
ALTER TABLE events ADD COLUMN IF NOT EXISTS cancel_reason text;

-- ✅ Enum Postgres — hậu tố _enum
DO $$ BEGIN
  CREATE TYPE report_status_enum AS ENUM ('open','reviewing','actioned','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ✅ Index địa lý
CREATE INDEX IF NOT EXISTS idx_events_geo_point ON events USING GIST (geo_point);

-- ✅ Tìm không dấu — "an thuong" ra "An Thượng"
CREATE INDEX IF NOT EXISTS idx_areas_name_trgm
  ON areas USING GIN (unaccent(name) gin_trgm_ops);

-- ✅ Seed idempotent
INSERT INTO event_categories (id, slug, sort_order)
VALUES (gen_random_uuid(), 'language-exchange', 30)
ON CONFLICT (slug) DO UPDATE SET sort_order = EXCLUDED.sort_order;
```

> `unaccent` mặc định là `STABLE`, không dùng trực tiếp trong generated column được.
> Cách xử lý (bọc thành hàm `IMMUTABLE` riêng) ghi ở `docs/analysis/03-domain-va-du-lieu.md`.

### Quy tắc kiểu dữ liệu

| Trường hợp | Kiểu đúng | Tránh |
|---|---|---|
| Mốc thời gian | `timestamptz` (luôn UTC) | `timestamp` không timezone |
| Ngày Đà Nẵng để gom nhóm | `date` | `timestamptz` rồi cắt chuỗi |
| Tiền | `integer` (VND, không phần lẻ) | `float`, `numeric` có phần lẻ |
| Khoá chính | `uuid` (uuid v7 do ứng dụng sinh) | `serial`, `bigserial` |
| Toạ độ | `geography(Point,4326)` | `geometry`, cặp `float` rời |
| Mã ngôn ngữ | `varchar(5)` (`en`, `vi`) | `text` tự do |
| Mã quốc gia | `char(2)` ISO 3166-1 | `varchar` tự do |
| Email / handle | `citext` | `varchar` + `LOWER()` thủ công |
| Cấu hình mở | `jsonb` | `json`, text đã stringify |
| Danh sách ngắn cố định | `varchar[]` | chuỗi nối bằng dấu phẩy |
| Cờ | `boolean` | `varchar`, `smallint` |

---

## 9. Xác minh (trước khi báo xong)

```bash
# 1. Chạy trên local rồi kiểm tra schema thật
pnpm --filter @dnc/api migration:run
psql "$DATABASE_URL" -c "\d+ rsvps"

# 2. down() chạy được rồi up() lại được (chỉ thử trên local)
pnpm --filter @dnc/api migration:revert && pnpm --filter @dnc/api migration:run

# 3. Entity biên dịch khớp schema mới
pnpm --filter @dnc/api exec tsc --noEmit

# 4. API khởi động được với schema mới (synchronize vẫn false)
pnpm --filter @dnc/api dev

# 5. Với thay đổi PostGIS: xác nhận truy vấn bán kính chạy đúng VÀ dùng index
psql "$DATABASE_URL" -c "
  EXPLAIN ANALYZE
  SELECT id FROM events
  WHERE ST_DWithin(geo_point,
                   ST_SetSRID(ST_MakePoint(108.2450, 16.0600), 4326)::geography,
                   1500);"
# → phải thấy Index Scan trên idx_events_geo_point, không phải Seq Scan
```

Sau đó theo [verification-before-completion](../verification-before-completion/SKILL.md):
luồng thật chạm vào bảng vừa đổi (tạo sự kiện, RSVP, lọc theo khu vực) phải pass.

---

## 10. Anti-pattern

1. Deploy code truy vấn cột mà server đích chưa có → API sập lúc boot (bỏ bước đối
   chiếu ở mục 3).
2. Xoá hoặc đổi tên cột trong cùng một lần deploy với code đọc nó → rơi request trong
   lúc rollout. Phải tách ba deploy.
3. `ST_MakePoint(lat, lng)` — đảo thứ tự. Không có lỗi, chỉ có dữ liệu sai giữa đại dương.
4. Dùng `geometry` thay `geography` rồi truyền bán kính bằng mét → lọc sai hoàn toàn
   mà vẫn trả về kết quả.
5. Thêm cột địa lý mà quên index GIST → mọi truy vấn Discover quét toàn bảng.
6. UNIQUE thường trên bảng có `deleted_at` → người dùng không RSVP lại được sự kiện đã huỷ.
7. `CREATE INDEX CONCURRENTLY` trong migration → lỗi ngay vì file chạy trong transaction.
8. `ALTER TYPE ... ADD VALUE` rồi `UPDATE` sang value mới trong **cùng một file**.
9. `ADD COLUMN ... NOT NULL` không default trên bảng đã có dữ liệu.
10. Backfill toàn bảng trong migration → transaction dài, khoá bảng, deploy treo.
11. Sửa hoặc đổi tên một migration đã chạy trên bất kỳ server nào.
12. Nhét ranh giới khu vực Đà Nẵng vào migration thay vì seed — ranh giới sẽ còn chỉnh nhiều.
13. Bật `synchronize: true` cho "nhanh" — cấm tuyệt đối trong dự án này.
14. Chạy migration lên staging/production khi chưa được người dùng duyệt.
