# Playwright (web) — patterns Da Nang Connect

> Test web sống ở `apps/web/e2e/*.spec.ts`, config `apps/web/playwright.config.ts`.
> Hai project viewport: **mobile (mặc định)** + desktop (variant). Fixtures dùng chung
> ở `apps/web/e2e/_fixtures.ts`.
>
> - **Web** chạy ở `http://localhost:3000` (Next.js App Router, `apps/web`).
> - **API** chạy ở `http://localhost:3001` (NestJS, `apps/api`) — khai báo qua biến
>   môi trường `E2E_API_URL` để không hard-code cổng vào spec.
>
> ## ⚡ Hai luật bất biến trước khi viết dòng test đầu tiên
>
> **1. Viewport mobile là mặc định.** Phần lớn expat mở app bằng điện thoại khi đang
> di chuyển. Desktop là variant, không phải oracle.
> ```ts
> test.use({ viewport: { width: 390, height: 844 } });
> test.describe('RSVP button at mobile viewport', () => { /* ... */ });
> ```
> Tap-target ≥44×44 đo qua `getBoundingClientRect()` **chỉ valid ở viewport mobile** —
> nút stretch theo flex ở desktop có thể "pass" giả.
>
> **2. Locale mặc định là EN.** KHÔNG assert bằng chuỗi hiển thị — đổi locale là đỏ
> giả. Assert qua `getByTestId` / `getByRole`, hoặc resolve i18n key:
> ```ts
> import en from '@/messages/en.json';
> await expect(page.getByTestId('event-rsvp-cta')).toHaveText(en.events.rsvp.cta);
> ```
> Feature nào có chữ thì phải có thêm 1 case chạy locale VI (`/vi/...` hoặc set cookie
> locale) để bắt thiếu key + tràn layout.

---

## Cấu trúc 1 spec

Tách `test.describe` theo lớp: **API contract** → **UI** → **behavior/feature**. Mỗi
test 1 hành vi, comment giải thích *vì sao*.

```ts
import { test, expect, type APIRequestContext } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:3001';

// ── Helpers ──────────────────────────────────────────────
// `identifier` = địa chỉ liên hệ đăng nhập (hoặc số điện thoại). Mỗi feature dùng
// một tài khoản riêng để không đụng dữ liệu còn sót từ lần chạy trước.
const TEST_USER = {
  displayName: 'E2E Events User',
  identifier: 'qa_events@dnc.test',
  password: 'E2eEvents!234',
  locale: 'en',
};

async function login(request: APIRequestContext) {
  // register idempotent — nuốt lỗi "user exists"
  await request.post(`${API}/auth/register`, { data: TEST_USER }).catch(() => {});
  const r = await request.post(`${API}/auth/login`, {
    data: {
      identifier: TEST_USER.identifier,
      password: TEST_USER.password,
      device: { deviceId: 'e2e-events', deviceType: 'web', deviceName: 'e2e' },
    },
  });
  if (!r.ok()) return null;
  const body = await r.json();
  return body.success ? body.data : null; // { accessToken, refreshToken, user: { id } }
}

// ── API contract ─────────────────────────────────────────
test.describe('Events API', () => {
  test('GET /events lọc theo khu vực trả về đúng shape', async ({ request }) => {
    const r = await request.get(`${API}/events`, { params: { area: 'an-thuong' } });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  test('POST /events không auth → 401', async ({ request }) => {
    const r = await request.post(`${API}/events`, { data: {} });
    expect(r.status()).toBe(401);
  });

  test('RSVP → cancel → RSVP lại là idempotent', async ({ request }) => {
    const auth = await login(request);
    test.skip(!auth, 'Login failed');
    const headers = { Authorization: `Bearer ${auth.accessToken}` };
    // clean slate → RSVP → verify attendeeCount → RSVP lại (không nhân đôi)
    // → cancel → cancel lần nữa (không âm) → verify count trở về ban đầu
  });
});

// ── UI ───────────────────────────────────────────────────
test.describe('Events UI', () => {
  test('chưa đăng nhập bấm RSVP → chuyển sang trang đăng nhập', async ({ page }) => {
    await page.goto('/events/<slug>');
    const cta = page.getByTestId('event-rsvp-cta');
    await expect(cta).toBeVisible({ timeout: 5000 });
    await cta.click();
    await page.waitForURL(/\/(en|vi)\/login/, { timeout: 5000 });
  });
});
```

---

## Quy tắc cứng

1. **Tài khoản RIÊNG mỗi feature.** Mỗi spec dùng `identifier` riêng (xem
   `_fixtures.ts`, tách theo `events` / `rsvp` / `moderation`) → tránh đụng tài khoản
   còn sót từ lần test trước.

2. **Register idempotent, nuốt lỗi.** `await request.post(`${API}/auth/register`, …).catch(() => {})`
   — chạy lại spec nhiều lần vẫn ok.

3. **Né rate-limit auth.** Spec nhiều test cùng đăng nhập → cache trong
   `test.beforeAll()` (helper `loginAs` trong `_fixtures.ts`) thay vì đăng nhập mỗi
   test. Spec nặng → đặt serial:
   ```ts
   test.describe.configure({ mode: 'serial' });
   ```

4. **`test.skip` khi thiếu data**, đừng làm test đỏ giả:
   ```ts
   const target = await pickUpcomingEvent(request);
   test.skip(!target, 'No upcoming event seeded');
   ```

5. **Dùng `_fixtures.ts`** khi cần login + target có sẵn (sự kiện sắp tới, sự kiện đã
   đầy chỗ, người dùng đã bị chặn):
   ```ts
   import { loginAs, fetchTestTargets } from './_fixtures';
   let targets: Awaited<ReturnType<typeof fetchTestTargets>>;
   test.beforeAll(async ({ request }) => { targets = await fetchTestTargets(request); });
   ```

6. **Assert UI qua testid/role**, không qua chuỗi hiển thị (luật i18n ở đầu file).
   Thiếu hook → ghi "cần `data-testid`" (xem `test-design.md` §E), đừng assert mò.

7. **Response shape chuẩn repo:** `{ success: boolean, data?, error?, code? }`. Assert
   cả `success` lẫn `data`. Lỗi → assert `code` (vd `INVALID_INPUT`, `RATE_LIMITED`,
   `EVENT_FULL`, `RSVP_CLOSED`, `USER_BLOCKED`, `NOT_FOUND`).

8. **In body khi assert status** để debug nhanh khi đỏ:
   ```ts
   expect(r.status(), `POST body: ${await r.text()}`).toBe(201);
   ```

9. **Thời gian tương đối, không hard-code ngày.** Seed sự kiện bằng offset
   (`now + 2h`, `now - 1h`) và assert theo `Asia/Ho_Chi_Minh` — spec hard-code
   `2026-03-01` sẽ mục theo thời gian và giấu bug timezone.

---

## Risk-class test snippets (web)

**Chặn người dùng phải enforce ở API** (sweep §6):
```ts
test('người bị chặn gọi thẳng API vẫn không xem được sự kiện riêng tư', async ({ request }) => {
  const auth = await login(request);
  test.skip(!auth, 'login');
  const r = await request.get(`${API}/events/${privateEventId}`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });
  expect([403, 404]).toContain(r.status()); // ẩn ở API, không chỉ ẩn trên UI
});
```

**Nội dung chờ duyệt không lọt ra công khai** (sweep §6):
```ts
test('sự kiện đang pending không xuất hiện trong feed công khai', async ({ request }) => {
  const r = await request.get(`${API}/events`, { params: { area: 'my-khe' } });
  const ids = (await r.json()).data.items.map((e: { id: string }) => e.id);
  expect(ids).not.toContain(pendingEventId);
});
```

**Race chỗ cuối cùng** (sweep §1) — bắn song song, đúng 1 người vào được:
```ts
test('2 người RSVP đồng thời vào 1 chỗ cuối → 1 going, 1 waitlist', async ({ playwright }) => {
  const [a, b] = await Promise.all([ctxFor('qa_race_a'), ctxFor('qa_race_b')]);
  const results = await Promise.all([
    a.post(`${API}/events/${fullMinusOneId}/rsvp`),
    b.post(`${API}/events/${fullMinusOneId}/rsvp`),
  ]);
  const statuses = await Promise.all(results.map(async (r) => (await r.json()).data.status));
  expect(statuses.sort()).toEqual(['going', 'waitlist']);
});
```

**"default useState lie"** (sweep §10) — so UI vs API:
```ts
test('số chỗ trống lấy từ API, không phải state mặc định', async ({ page, request }) => {
  const r = await request.get(`${API}/events/${eventId}`);
  const spots = (await r.json()).data.spotsLeft;
  await page.goto(`/events/${eventId}`);
  await expect(page.getByTestId('event-spots-left')).toHaveText(String(spots));
});
```

**i18n — không thiếu key** (sweep §4):
```ts
test('màn sự kiện ở locale VI không lòi i18n key thô', async ({ page }) => {
  await page.goto(`/vi/events/${eventId}`);
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/\b[a-z]+(\.[a-zA-Z]+){2,}\b/); // vd "events.rsvp.cta"
});
```

**SEO 404** (web public): slug giả → HTTP 404 thật:
```ts
test('/events/<slug-giả> trả 404 (notFound, không soft-200)', async ({ request }) => {
  const r = await request.get('http://localhost:3000/en/events/khong-ton-tai-xyz123');
  expect(r.status()).toBe(404);
});
```

---

## Unit test (logic thuần, no browser/DB)

Pure function (validation, mapping khu vực → slug, tính khoảng cách, quy tắc trust
level, format ngày theo locale) nên là unit test cạnh source
(`apps/web/src/**/*.test.ts` hoặc `packages/shared-types/**/*.test.ts`) — nhanh, ổn
định, không cần server chạy.

```ts
import { describe, it, expect } from 'vitest';
import { areaFromSlug } from '@/lib/areas';

describe('areaFromSlug', () => {
  it('nhận slug hợp lệ của 6 khu vực đang hỗ trợ', () => {
    expect(areaFromSlug('an-thuong')?.nameEn).toBe('An Thuong');
  });
  it('trả về null cho slug lạ thay vì throw', () => {
    expect(areaFromSlug('somewhere-else')).toBeNull();
  });
});
```

Ưu tiên tách logic ra khỏi DB/HTTP để unit-test được — ví dụ tách hàm tính bán kính
và hàm chuẩn hoá khu vực khỏi service TypeORM, để test không cần Postgres.
