# Run policy + pattern API test + test-case doc + QA report

> Khi nào được chạy, chạy thế nào, và viết kết quả ra đâu. **Mặc định
> GENERATE-ONLY** — sinh test + đưa lệnh, KHÔNG tự chạy.

---

## A. Run policy (GENERATE-ONLY)

### Mặc định: KHÔNG chạy, chỉ đưa lệnh

Sau khi sinh test, đưa cho user lệnh để **họ** chạy. KHÔNG tự chạy full suite (mất
nhiều phút; chạy song song đè chết container Postgres/Redis dùng chung).

### Pre-req khi user muốn chạy (nói rõ cho họ)

- **Hạ tầng:** `docker compose -f ops/docker-compose.yml up -d postgres redis`
  (PostgreSQL 16 + PostGIS + Redis). Migration đã chạy, seed dữ liệu test đã có.
- **API:** `apps/api` chạy ở `http://localhost:3001`.
- **Web:** `apps/web` chạy ở `http://localhost:3000` (test **không** tự start server).
- **Mobile:** simulator + Metro (:8081) + dev-client đã cài; `apps/mobile/.env.local`
  trỏ API localhost.
- **Serial:** chạy `--workers=1`. Song song vừa đè container vừa làm hỏng test race
  (test RSVP race phải là request song song *bên trong* một test, không phải nhiều
  worker cùng đụng một sự kiện).
- **Múi giờ:** đặt `TZ=Asia/Ho_Chi_Minh` khi chạy để kết quả khớp cái user nhìn thấy.

### Lệnh chuẩn (đưa cho user, hoặc chạy khi user nói rõ "chạy")

```bash
# API — 1 file e2e (supertest), serial:
pnpm --filter @dnc/api test:e2e -- test/<feature>.e2e-spec.ts --runInBand

# API — unit theo tên:
pnpm --filter @dnc/api test -- --testNamePattern="<tên test>"

# Web — 1 spec targeted (an toàn nhất), serial:
pnpm --filter @dnc/web exec playwright test e2e/<feature>.spec.ts --workers=1

# Web — 1 test theo tên:
pnpm --filter @dnc/web exec playwright test e2e/<feature>.spec.ts -g "tên test" --workers=1

# Web — chỉ project mobile viewport (mặc định của sản phẩm):
pnpm --filter @dnc/web exec playwright test e2e/<feature>.spec.ts --project=mobile

# Report khi đỏ:
pnpm --filter @dnc/web exec playwright show-report
pnpm --filter @dnc/web exec playwright show-trace test-results/*/trace.zip

# Mobile — syntax validate (không cần sim):
maestro test --dry-run apps/mobile/.maestro/flows/<area>/<case>.yaml

# Mobile — chạy 1 flow (cần sim + Metro):
maestro test apps/mobile/.maestro/flows/<area>/<case>.yaml
```

### Khi user nói "chạy test đi"

- Chạy **targeted** (1 file / 1 grep), serial. KHÔNG full suite trừ khi user nói rõ.
- Báo kết quả trung thực: test đỏ → dán output, đừng giấu. Skip → nói rõ skip vì sao.
- Test đỏ do **bug thật** (không phải test sai): lộ dữ liệu cá nhân / bypass block /
  lọt nội dung chưa duyệt → P0, sửa hoặc báo ngay; behavior bug lớn/mơ hồ → bàn
  business-analyst chốt hành vi đúng trước khi "fix".

---

## B. Pattern test API (`apps/api`, Jest + supertest)

Đây là tầng rẻ nhất để test race, phân quyền và truy vấn PostGIS — đừng đẩy hết lên UI.

```ts
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('RSVP (e2e)', () => {
  let app: INestApplication;
  let organizerToken: string;
  let memberToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    // seed idempotent: 2 tài khoản + 1 sự kiện còn đúng 1 chỗ
  });

  afterAll(async () => { await app.close(); });

  it('RSVP hai lần chỉ tạo một bản ghi (idempotent)', async () => {
    await request(app.getHttpServer())
      .post(`/events/${eventId}/rsvp`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/events/${eventId}/rsvp`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200); // đã going rồi — không tạo thêm, không 500

    const detail = await request(app.getHttpServer()).get(`/events/${eventId}`);
    expect(detail.body.data.attendeeCount).toBe(1);
  });

  it('hai người RSVP đồng thời vào chỗ cuối → 1 going, 1 waitlist', async () => {
    const [a, b] = await Promise.all([
      request(app.getHttpServer()).post(`/events/${lastSpotId}/rsvp`).set('Authorization', `Bearer ${tokenA}`),
      request(app.getHttpServer()).post(`/events/${lastSpotId}/rsvp`).set('Authorization', `Bearer ${tokenB}`),
    ]);
    expect([a.body.data.status, b.body.data.status].sort()).toEqual(['going', 'waitlist']);
  });

  it('lọc bán kính 2km quanh An Thuong khớp số dòng PostGIS', async () => {
    const res = await request(app.getHttpServer())
      .get('/events')
      .query({ lat: 16.045, lng: 108.247, radiusM: 2000 })
      .expect(200);
    // so với: SELECT count(*) FROM events
    //   WHERE ST_DWithin(location::geography,
    //         ST_SetSRID(ST_MakePoint(108.247, 16.045), 4326)::geography, 2000);
    expect(res.body.data.items.length).toBe(expectedFromDb);
  });

  it('người bị chặn không RSVP được vào sự kiện của người đã chặn mình', async () => {
    await request(app.getHttpServer())
      .post(`/events/${organizerEventId}/rsvp`)
      .set('Authorization', `Bearer ${blockedToken}`)
      .expect(403);
  });
});
```

Quy ước:
- **Dữ liệu seed có prefix rõ ràng** (`qa_`) và cờ `isSeedData` → dọn được, không đụng
  dữ liệu thật.
- **Không mock Postgres cho case PostGIS** — mock sẽ giấu đúng lớp bug cần bắt
  (SRID, đơn vị, thứ tự lng/lat).
- **Assert `code` trong body lỗi** (`EVENT_FULL`, `RSVP_CLOSED`, `USER_BLOCKED`,
  `CONTENT_PENDING`), không assert chuỗi message (chuỗi đổi theo locale).

---

## C. Test-case doc — `docs/test-case/<feature>.md`

Bảng TC-ID với cột API / Web Desktop / Web Mobile / Mobile App.

```markdown
# <Feature> — Test Cases

> **Scope**: 1-2 dòng. **Source**: `apps/api/src/...` · `apps/web/src/...` · `apps/mobile/src/...`.
> **API**: endpoint chính. **Existing E2E**: `apps/web/e2e/<feature>.spec.ts`.
> **Platforms**: API / Web desktop / Web mobile / Mobile app.
> **Locale**: EN (mặc định) + VI.
> **Acceptance criteria**: link tới `docs/features/<feature>.md#acceptance-criteria` (oracle).

## Pre-requisites
- [ ] Postgres+PostGIS & Redis chạy từ `ops/docker-compose.yml`
- [ ] `apps/api` ở :3001, `apps/web` ở :3000, Metro :8081 (nếu test mobile)
- [ ] Test user: `<identifier>` / `<password>`; seed sự kiện `qa_*`

## Test cases

| TC-ID | AC-ID | Title | Steps | Expected | API | Web Desktop | Web Mobile | Mobile App | Priority |
|---|---|---|---|---|---|---|---|---|---|
| `RSVP-001` | AC-1 | RSVP sự kiện còn chỗ | 1.…<br>2.… | status `going`, count +1 | ✅ | ✅ | ✅ | ✅ | P0 |
| `RSVP-002` | AC-3 | Chỗ cuối, 2 người đồng thời | gọi song song | 1 `going`, 1 `waitlist` | ✅ | ➖ | ➖ | ➖ | P0 |
| `RSVP-003` | AC-5 | Huỷ RSVP → promote waitlist | … | người đầu waitlist thành `going` + nhận push | ✅ | ✅ | ➖ | ✅ | P1 |
| `EVT-010` | AC-7 | Lọc khu vực An Thuong | … | chỉ sự kiện trong bán kính | ✅ | ✅ | ✅ | ✅ | P1 |
| `I18N-002` | AC-9 | Đổi EN→VI giữa flow | … | UI đổi ngay, không mất state, không lòi key | ➖ | ✅ | ✅ | ✅ | P1 |
| `MOD-004` | AC-12 | Người bị chặn gọi thẳng API | curl Bearer | 403 | ✅ | ➖ | ➖ | ➖ | P0 |

## Cross-platform notes
| TC-ID | Web | Mobile app | Note |
|---|---|---|---|

## Known bugs / open issues
| Bug ID | TC-ID | Status |
|---|---|---|

## Heavy details (steps/payload dài)
### TC `RSVP-002` — …
```

Cột status: ✅ pass · ❌ fail · ⚠️ flaky · ➖ N/A · ⏳ chưa chạy.
Evidence (screenshot) → `docs/test-case/evidence/<session>/<TC-ID>.png`, **đã che dữ
liệu cá nhân**.

---

## D. QA report — sau 1 đợt test thật

Ghi ở `docs/test-info/qa-<scope>-report-<YYYY-MM-DD>.md`.

```markdown
# <Scope> — QA Report

**Tester:** Claude
**Target:** apps/web localhost:3000 · apps/api localhost:3001 · iPhone 16 sim
**Locale đã test:** EN + VI
**Test User:** `<identifier>` / `<password>`
**Run:** YYYY-MM-DD HH:MM → HH:MM (giờ Asia/Ho_Chi_Minh)

## Methodology
1. <cách chạy: Jest/supertest targeted / Playwright targeted / Maestro flows / idb visual>
2. So với acceptance criteria trong `docs/features/<feature>.md`.
3. Gap → trace tới source → đề xuất/fix → re-run.

## Pass / Fail Matrix
| # | Case | TC-ID | Anchor (testID/route/endpoint) | Result | Notes |
|---|---|---|---|---|---|
| 01 | RSVP sự kiện còn chỗ | RSVP-001 | `POST /events/:id/rsvp` | ✅ | |
| 02 | Promote waitlist | RSVP-003 | `event-rsvp-status` | ✅ (after fix) | <fix gì> |
| 03 | Lọc bán kính | EVT-010 | `GET /events?radiusM=` | ⚠️ | lệch 1 dòng ở biên — chờ chốt include/exclude |

## Bugs Found & Fixed
### 🟥 BUG-1: <tiêu đề ngắn>
**File:** `apps/api/src/events/rsvp.service.ts:NN`
**Symptom:** <triệu chứng quan sát được>
**Root cause:** <nguyên nhân>
**Fix:** <đã sửa gì> (hoặc "đề xuất — chờ business-analyst chốt hành vi")

## Còn lại / Known gaps
- <case chưa cover + khi nào nên làm>
```

---

## E. Harness gotchas (tham chiếu nhanh)

| Gotcha | Cách xử |
|---|---|
| Chạy song song đè chết container dùng chung | `--workers=1` / `--runInBand` |
| Test race RSVP chạy nhiều worker → kết quả loạn | song song **trong** 1 test bằng `Promise.all`, không phải nhiều worker |
| Rate-limit auth | cache đăng nhập ở `beforeAll`, tài khoản riêng cho mỗi feature |
| Kết quả ngày lệch 7 tiếng | đặt `TZ=Asia/Ho_Chi_Minh` khi chạy; lưu UTC, so ở giờ VN |
| PostGIS trả rỗng bất ngờ | kiểm SRID 4326, `::geography`, thứ tự `(lng, lat)` |
| Assert đỏ giả sau khi đổi locale | assert bằng testID/i18n key, không bằng chuỗi hiển thị |
| Maestro XCUITest chết trên máy này | dùng `idb` cho visual/gesture test |
| idb text rớt đuôi | chunk ≤4 ký tự |
| "iPhone 16 Pro" treo sim | dùng "iPhone 16" |
| App mobile trỏ sai môi trường | `apps/mobile/.env.local` → API localhost |
| Tab nav `tapOn id:tab-*` không fire | deep link `danangconnect://<tab>` |
| Worklet edit không apply | force reload `curl -X POST http://localhost:8081/reload` |
| Claim "fix applied" chưa verify | bắt buộc evidence: marker log / screenshot / idb |
