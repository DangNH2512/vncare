# Task board — M1 auth hardening (Tech Lead, 01/10/2026)

Brief: [brief.md](brief.md). Coordinator giữ bảng này.

## 1. Quyết định kỹ thuật đã chốt (dựa trên code thật)

### D1. Limiter: tự viết, không thêm dependency
- Tự viết `RateLimitService` trên `REDIS_CACHE` có sẵn (`apps/api/src/redis/redis.module.ts:69-78`, `ioredis` 6 đã là dependency). Không dùng `@nestjs/throttler`. Lý do: throttler đếm trước khi handler chạy, không biết kết quả xác thực nên không đếm "chỉ lần sai" và không reset identifier khi đúng được. Muốn đủ AC còn phải thêm package storage Redis và vẫn viết thêm logic. Phương án tự viết khoảng 80 dòng Lua + TS, không đổi `package.json`.
- Cổng gọi nằm trong `AuthService` (không phải guard), vì cần kết quả `argonVerify`. IP lấy từ `context.ip` (`auth.controller.ts:156` `contextOf` đã truyền `request.ip`).
- **Thuật toán: fixed window, "đặt chỗ trước" (reserve-first), không "kiểm rồi mới đếm".**
  - Trước `argonVerify`, `INCR` cả hai bộ đếm (Lua: INCR, nếu count==1 hoặc PTTL<0 thì `PEXPIRE`, trả `{count, pttl}`). `count > max` thì 429.
  - Lý do: argon mất vài chục ms; kiểu "kiểm rồi đếm khi sai" cho phép N request song song cùng lọt qua ngưỡng. Reserve-first atomic, không vượt ngưỡng dưới tải song song.
  - Hành vi quan sát được giống hệt brief: lần đúng không tăng vì có bù trừ.
  - Đăng nhập đúng: `DEL` key identifier, `release` key IP.
  - `ACCOUNT_NOT_ACTIVE`: `release` cả hai.
  - `INVALID_CREDENTIALS`: giữ nguyên chỗ đã đặt.
  - `release` bằng Lua: `if EXISTS then DECR; nếu <=0 thì DEL`. Không bao giờ tạo key không TTL.
  - Khi bị chặn: `release` các bucket chưa vượt (không để request bị chặn ăn quota IP của bucket kia). Bucket đã vượt thì không DECR.
  - Retry-After = `ceil(pttl/1000)` lớn nhất trong các bucket vượt, kẹp 1..windowSeconds.
- Register: hai bộ đếm IP `hour` (3600s) và `day` (86400s), cùng reserve-first, không bù trừ (mọi lần gọi đều tính). Kiểm **trước** `handleTaken` (không lộ `HANDLE_TAKEN`/`EMAIL_TAKEN`). Giới hạn đã biết: body sai schema bị zod pipe trả 400 trước handler nên không được đếm (chấp nhận, rẻ và không lộ gì).
- "Ngày" = cửa sổ trượt cố định 86400s tính từ lần đầu, không phải ngày lịch, nên không dính lệch múi giờ nửa đêm.
- **Fail-open:** mọi lệnh Redis bọc `Promise.race` với timeout cứng 1000ms. Lỗi hoặc timeout thì coi như cho qua, bỏ qua bù trừ. Service giữ cờ `degraded`:
  - chuyển ok→degraded: một dòng `warn` `rate limiter unavailable, failing open` (không PII);
  - chuyển degraded→ok: một dòng `log`.
  - Lưu ý cho Tester: `redis.module.ts:41-57` tự log `connection lost` của nó, tức là có hai dòng warn khi cache chết (một của Redis module, một của limiter). AC-24 "đúng một dòng" tính theo dòng của limiter.
  - Mỗi request trong lúc Redis chết tốn tối đa 1s. Chấp nhận ở v1.
- **Băm khoá:** `HMAC-SHA256(secret, "<scope>:<subject>")`, hex cắt 32 ký tự. Tên key: `rl:login:ip:<h>`, `rl:login:id:<h>`, `rl:register:ip:hour:<h>`, `rl:register:ip:day:<h>`. Mọi key đều có TTL ≤ cửa sổ.
  - Subject identifier = `normalizePhone(id) ?? id` sau `trim().toLowerCase()` (đúng như `auth.service.ts:~150`).
  - Subject IP = IP chuẩn hoá: IPv4-mapped (`::ffff:a.b.c.d`) → IPv4; IPv6 → gom /64 (4 hextet đầu, đã expand); thiếu IP → bucket `unknown` dùng chung (fail-safe).
- **Log 429:** một dòng `warn` có cấu trúc dạng `auth.rate_limited action=login bucket=identifier count=6`. Không IP, identifier, token.

### D2. Hình dạng lỗi 429
- `TRUST_LEVEL_TOO_LOW` / `ROLE_NOT_ALLOWED` được ném bằng `new ForbiddenException({ code, messageKey, details? })` (`trust-level.guard.ts:36-40`, `roles.guard.ts:41-44`). Nest dùng thẳng object làm body, nên body phẳng.
- 429 cần thêm header `Retry-After`, mà `HttpException` không đặt được header. Chốt:
  - `RateLimitedException extends HttpException` (status 429) mang `retryAfterSeconds`;
  - `RateLimitedExceptionFilter` (`@Catch(RateLimitedException)`) gọi `res.status(429).set('Retry-After', String(n)).json({ code: 'RATE_LIMIT_EXCEEDED', messageKey: 'errors.auth.rateLimited', details: { retryAfterSeconds: n } })`;
  - gắn `@UseFilters(RateLimitedExceptionFilter)` ở class `AuthController`, không đụng `app.module.ts`, và hoạt động cả trong harness e2e.
- `packages/contracts` **không đổi**: không có registry mã lỗi nào ở đó (đã grep); mã nằm trong `ApiError` generic. Doc 04:1016 đã có `RATE_LIMIT_EXCEEDED`. Doc 02/05/14 dùng `RATE_LIMITED` là việc sửa tài liệu (mục 6).
- `Retry-After` không nằm trong `Access-Control-Expose-Headers`. Chấp nhận vì hai web gọi cùng origin qua rewrite; đưa vào follow-up E2-S8.

### D3. Env
Validate lúc khởi động bằng hàm thuần `loadRateLimitConfig(env)`, gọi trong `useFactory` của provider `RATE_LIMIT_CONFIG` đăng ký ở `AuthModule`. Lỗi ném khi DI khởi tạo thì `NestFactory.create` reject và process thoát. Đọc **lazy trong factory, không đọc ở top-level module**, để spec đặt `process.env` trước `createTestApp()` (cùng cách `health.e2e.spec.ts:41`).

| Biến | Mặc định | Ràng buộc |
|---|---|---|
| `RATE_LIMIT_LOGIN_IP_MAX` | 10 | số nguyên 1..1_000_000 |
| `RATE_LIMIT_LOGIN_IDENTIFIER_MAX` | 5 | như trên |
| `RATE_LIMIT_LOGIN_WINDOW_SECONDS` | 900 | 1..86400 |
| `RATE_LIMIT_REGISTER_HOURLY_MAX` | 5 | như trên |
| `RATE_LIMIT_REGISTER_DAILY_MAX` | 15 | như trên |
| `RATE_LIMIT_HMAC_SECRET` | dev: ngẫu nhiên 32 byte mỗi lần khởi động | production: bắt buộc, ≥32 ký tự, thiếu thì từ chối khởi động |

- Giá trị sai (0, âm, chữ, thập phân) thì throw `RATE_LIMIT_LOGIN_IP_MAX must be an integer between 1 and 1000000`. Thông báo chỉ nêu tên biến, không in lại giá trị (bí mật HMAC tuyệt đối không in).
- Cửa sổ register cố định 3600/86400 (không env, ít núm hơn). AC-21 kiểm bằng cửa sổ login đặt 2s.
- HMAC ngẫu nhiên mỗi lần khởi động ở dev: **chấp nhận được** (bộ đếm mồ côi sau restart; `vite-node --watch` restart thì reset giới hạn, vô hại ở dev). Production bắt buộc có secret chung vì nhiều instance phải băm giống nhau.
- **e2e đặt ngưỡng cao** ở `apps/api/vitest.config.ts` qua `test.env`: tất cả ngưỡng = `100000`, `RATE_LIMIT_HMAC_SECRET` cố định. Spec rate limit tự ghi đè `process.env` trước `createTestApp()` bằng ngưỡng thật/thấp. Vitest chạy mỗi file một worker và hầu hết spec đăng ký từ 127.0.0.1, nên nếu không có override thì đăng ký thứ 6 trong giờ sẽ 429 toàn bộ suite.
- **API đang chạy thật (dev :3101) đọc `apps/api/.env` (gitignored, hiện không có biến RATE_LIMIT nào).** Playwright admin `global-setup.ts` đăng ký 3 tài khoản mỗi lần chạy, nên chỉ cần chạy 2 lần trong giờ là dính 5/giờ. **Việc thủ công của Coordinator sau RL-3:** thêm vào `apps/api/.env` các ngưỡng cao (ví dụ 1000) rồi restart API trước khi Playwright/Tester chạy. `.env.example` ghi sẵn khối comment hướng dẫn.

### D4. `trust proxy`
- API dùng **Express adapter** (`@nestjs/platform-express`, `auth.controller.ts` import type từ `express`).
- Cấu hình bằng env `TRUST_PROXY`, hàm `applyTrustProxy(app, env)` ở `src/common/http/trust-proxy.ts`, gọi **cả** trong `main.ts` và `e2e/support/harness.ts` (harness tự dựng app, không đi qua `main.ts`).
  - Chưa đặt và không phải production thì `'loopback'`.
  - `NODE_ENV=production` mà thiếu thì **từ chối khởi động**, nêu tên biến.
  - Chấp nhận: số nguyên hop, hoặc danh sách phân tách phẩy gồm `loopback`/`linklocal`/`uniquelocal`/IP/CIDR. **Từ chối `true`** (tin mọi XFF) bằng lỗi nêu tên biến.
- **Phát hiện từ code Next 16.3.4 (`base-server.js:612`): `req.headers['x-forwarded-for'] ??= socket.remoteAddress`.** `proxy-request.js:39` chỉ thêm `x-forwarded-host`; httpxy không bật `xfwd`. Hệ quả:
  1. ~~Trình duyệt thật không gửi XFF thì Next điền IP socket của client.~~ **Đính chính sau lane Integration (01/10):** đo thật bằng echo server sau rewrite (Next 16.3.4, `next dev` và `next start`), Next **không** điền `X-Forwarded-For` khi client không gửi; API thấy peer là chính Next (`::1`). Không có reverse proxy phía trước thì mọi người dùng web chung một bucket IP (10 lần sai của bất kỳ ai chặn đăng nhập của tất cả trong 15 phút). Production bắt buộc có nginx append IP thật (`proxy_add_x_forwarded_for`) và `TRUST_PROXY` tin loopback + hop của proxy; `.env.example` đã ghi đúng.
  2. Next **không append**, nên XFF do client gửi lên origin web được chuyển nguyên xi vào API. Với `trust proxy=loopback`, một client qua web origin có thể tự đổi XFF mỗi request và né bộ đếm IP. Bộ đếm identifier vẫn chặn dò mật khẩu một tài khoản, nhưng spray nhiều identifier thì né được.
  3. Production an toàn chỉ khi LB phía trước Next **ghi đè/append** XFF và `TRUST_PROXY` khai đúng số hop/CIDR. Đây là rủi ro #1 của brief, giữ nguyên là rủi ro cao nhất.
  - Việc này được ghi vào DoD của RL-1 (tài liệu trong `.env.example`) và là mục Tester xác nhận bằng chạy thật. Follow-up (ngoài phạm vi): để Next middleware ghi đè XFF bằng IP socket.
- AC-26 nửa sau (nối thẳng, không qua hop tin cậy) kiểm trong e2e: tạo app với `TRUST_PROXY=10.255.255.1`. supertest đến từ loopback (không tin cậy) nên XFF bị bỏ qua, spoof vô tác dụng.

### D5. Migration `0009_trust_signals.sql`
Tên file: `apps/api/src/database/sql/0009_trust_signals.sql`. `id uuid PRIMARY KEY DEFAULT uuidv7()` như 0008. Bọc `BEGIN; … COMMIT;` trong chính file (hợp lệ cả khi initdb chạy `psql -v ON_ERROR_STOP=1 -f` lẫn áp tay).

```sql
BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dnc_app') THEN
    CREATE ROLE dnc_app NOLOGIN;
  END IF;
END $$;

CREATE TYPE trust_signal_type_enum AS ENUM (
  'email_verified','phone_verified','social_google','social_facebook','social_apple',
  'id_document','profile_completed','attended_event','hosted_event_completed',
  'positive_review','community_vouch','staff_endorsement',
  'penalty_no_show','penalty_report_upheld');
CREATE TYPE trust_signal_status_enum AS ENUM
  ('pending','verified','rejected','expired','revoked');

CREATE TABLE trust_signals (
  id                uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id           uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type              trust_signal_type_enum NOT NULL,
  status            trust_signal_status_enum NOT NULL,
  weight            smallint NOT NULL,
  evidence_type     varchar(40) NOT NULL
                      CHECK (evidence_type IN ('event','review','document','oauth','manual')),
  evidence_id       uuid,                              -- no FK: points at several tables
  issued_by_user_id uuid REFERENCES users (id) ON DELETE RESTRICT,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at       timestamptz,
  expires_at        timestamptz,
  revoked_at        timestamptz,
  revoked_reason    varchar(255),
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_trust_signals_revoked_reason_needs_revoked_at
    CHECK (revoked_reason IS NULL OR revoked_at IS NOT NULL)
);

CREATE INDEX idx_trust_signals_user_active ON trust_signals (user_id)
  WHERE status = 'verified' AND revoked_at IS NULL;
CREATE UNIQUE INDEX uq_trust_signals_unique_kind ON trust_signals (user_id, type)
  WHERE type IN ('email_verified','phone_verified','id_document','profile_completed')
    AND status = 'verified' AND revoked_at IS NULL;   -- revoked_at IS NULL: deviation from doc 03

CREATE FUNCTION trust_signals_guard_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['revoked_at','revoked_reason'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['revoked_at','revoked_reason']) THEN
    RAISE EXCEPTION 'trust_signals is append-only: only revoked_at and revoked_reason may change'
      USING ERRCODE = '55000';
  END IF;
  IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
    RAISE EXCEPTION 'trust_signals.revoked_at is already set' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_trust_signals_guard_update
  BEFORE UPDATE ON trust_signals FOR EACH ROW EXECUTE FUNCTION trust_signals_guard_update();

REVOKE ALL ON trust_signals FROM PUBLIC;
REVOKE ALL ON trust_signals FROM dnc_app;
GRANT USAGE ON SCHEMA public TO dnc_app;
GRANT SELECT, INSERT ON trust_signals TO dnc_app;
GRANT UPDATE (revoked_at, revoked_reason) ON trust_signals TO dnc_app;

COMMIT;
```
- `to_jsonb(NEW) - ARRAY[...]` thay vì liệt kê cột: cột thêm sau này tự thành bất biến. Migration nào thêm cột sửa được phải cập nhật trigger.
- **Bẫy FK `issued_by_user_id`:** `ON DELETE SET NULL` sẽ phát một UPDATE nội bộ trên `trust_signals` và bị trigger từ chối, làm xoá user phát hành thất bại. Vì vậy dùng `RESTRICT` (khớp tinh thần 0008: user bị ẩn danh hoá, không xoá cứng). `user_id ... ON DELETE CASCADE` không kích trigger UPDATE nên teardown e2e (`DELETE FROM users`) vẫn chạy (S-7).
- `CREATE ROLE` bọc `IF NOT EXISTS` để idempotent ở mức role. Toàn file không idempotent ở mức bảng: lần áp thứ hai lỗi `type "trust_signal_type_enum" already exists` và rollback toàn transaction, không để lại gì (AC-42 đạt "thất bại rõ").
- **Lệnh áp tay vào DB local** (một lần, từ gốc repo):
  `docker exec -i vncare-postgres-1 psql -U dnc -d dnc -v ON_ERROR_STOP=1 < apps/api/src/database/sql/0009_trust_signals.sql`
  Kiểm: `docker exec vncare-postgres-1 psql -U dnc -d dnc -c "\d trust_signals" -c "select rolname from pg_roles where rolname='dnc_app'"`. DB initdb mới tự chạy file này theo thứ tự tên.
- **Đối chiếu DB áp tay và DB initdb mới (AC-37):** dựng container scratch `docker run -d --name vncare-scratch-pg -e POSTGRES_USER=dnc -e POSTGRES_PASSWORD=dnc -e POSTGRES_DB=dnc -p 5499:5432 -v "$PWD/apps/api/src/database/sql:/docker-entrypoint-initdb.d:ro" imresamu/postgis:18-3.6` (không volume dữ liệu), `pg_dump -s` hai bên cho riêng `trust_signals` + hai enum + hàm trigger rồi `diff`, sau đó `docker rm -f vncare-scratch-pg`.
- **Quay lui** (ghi trong comment đầu file): `DROP TABLE trust_signals; DROP FUNCTION trust_signals_guard_update(); DROP TYPE trust_signal_status_enum, trust_signal_type_enum; REVOKE USAGE ON SCHEMA public FROM dnc_app; DROP ROLE dnc_app;`. Bảng mới, chưa có dữ liệu, nên chi phí migration bằng 0.
- Không bọc `TRUNCATE` (superuser vẫn truncate được; S-4 ghi nhận). Chỉ mục `(user_id)` đầy đủ cho cascade delete không thêm (brief chốt đúng 2 index); follow-up khi bảng lớn.

### D6. Vị trí test (theo `test-file-placement.md`: `e2e/**` phản chiếu `src/**`)
| Test | Đường dẫn |
|---|---|
| `pg_enum` + cột `users.role` | `apps/api/e2e/database/user-role-enum.e2e.spec.ts` |
| `trust_signals` (cột, index, quyền, trigger, cascade) | `apps/api/e2e/database/trust-signals.e2e.spec.ts` |
| SEC-JWT-LOG (spy logger mọi level + quét tĩnh `src`) | `apps/api/e2e/modules/auth/auth-key-logging.e2e.spec.ts` |
| Config + IP + trust proxy (thuần) | `apps/api/e2e/common/rate-limit/rate-limit.config.spec.ts`, `client-ip.spec.ts`; `apps/api/e2e/common/http/trust-proxy.spec.ts` |
| `RateLimitService` trên Redis thật | `apps/api/e2e/common/rate-limit/rate-limit.service.e2e.spec.ts` |
| Rate limit end-to-end (AC-15..29) | `apps/api/e2e/modules/auth/auth-rate-limit.e2e.spec.ts` |
| Playwright admin | `apps/web-admin-side/e2e/login-identifier.spec.ts`, `login-rate-limited.spec.ts` (file mới, không sửa `auth.spec.ts`) |

- Spec DB: mở `Pool` riêng từ `DATABASE_URL` (xuất từ `harness.ts`), `beforeAll` kết nối **không try/catch, không skip** (AC-9). `SET ROLE dnc_app` / `RESET ROLE` trong transaction rồi `ROLLBACK`; INSERT cần một `users` thật, dọn bằng `DELETE FROM users` (cascade).
- Spec SEC-JWT-LOG: `Logger.overrideLogger(collector)` thu mọi level (`log,error,warn,debug,verbose,fatal`) cộng spy `process.stdout.write`/`console.*`. Xoá `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` khỏi env, khởi động lại `AuthService.onModuleInit()` (hoặc `createTestApp()`), khẳng định:
  - không có `/BEGIN (PRIVATE|PUBLIC) KEY/` hay chuỗi base64 ≥64 ký tự;
  - đúng một dòng warn;
  - login rồi `/me` vẫn verify được token;
  - production thiếu khoá thì throw chỉ nêu tên biến;
  - PEM sai định dạng thì lỗi nêu `JWT_PRIVATE_KEY` mà không chứa giá trị.
  - Thêm một ca quét tĩnh `fs` trên `src/**/*.ts` khẳng định không còn `exportPKCS8`.
  - Khôi phục `process.env` trong `afterEach`.
- **Dọn key `rl:*`:** spec rate limit lấy `app.get(REDIS_CACHE)`, `SCAN MATCH rl:*` rồi `DEL` ở `beforeEach` và `afterAll`. Xoá toàn bộ `rl:*` an toàn vì các spec khác chạy song song có ngưỡng 100000. Để tránh đụng bộ đếm, spec rate limit dùng IP giả qua `X-Forwarded-For` duy nhất mỗi ca (dải `203.0.113.x`/`198.51.100.x`/`2001:db8::`, loopback được tin nên XFF có hiệu lực) và identifier ngẫu nhiên.

### D7. i18n
- `errors.auth.rateLimited` chưa có (đã kiểm `en.json`/`vi.json`, nhóm `errors.auth` hiện gồm unauthenticated…accountUnavailable). Thêm vào cả hai file theo nguyên văn brief §6.1, chạy `node packages/i18n/scripts/generate-keys.mjs` (hoặc `pnpm gen:i18n-keys`), rồi `pnpm --filter @dnc/i18n test` (parity + MESSAGE_KEYS).
- `auth.field.identifier` **đã có** EN "Email, username or phone" và VI "Email, tên đăng nhập… " trong `en.json` và `vi.json` (vi: "Email, tên người dùng hoặc số điện thoại"). Chú ý: bản VI dùng "tên người dùng", còn brief AC-45 ghi "tên đăng nhập". **Giữ nguyên bản VI hiện có** (đang được commit, tránh churn); AC-45 chấp nhận "tên người dùng" (Coordinator xác nhận khi nghiệm thu). Cũng có sẵn `auth.hint.identifier`.
- Một owner duy nhất cho `packages/i18n/**`: card AH-I18N. Hai card client chạy sau nó.

### D8. Client
- `ApiError` **đã mang `status`, `code`, `messageKey`** ở cả hai web (`api.ts`), nên không cần đổi lớp.
- **Web-client `app/_lib/api.ts:~125-130`** đọc `body.message.{code,messageKey}` (lồng) trong khi API trả body phẳng. Sửa: đọc `body.messageKey`/`body.code` ở mức gốc, fallback sang `body.message.*` cho bất kỳ lỗi Nest chuẩn nào còn lồng.
- `auth-form.tsx` `describe()` đã dịch `messageKey` do server chọn, nên 409/429 tự đúng khi `api.ts` đọc được. Thêm nhánh dự phòng `status === 429` → `errors.auth.rateLimited` (đặt trước 401).
- Web-admin `api.ts` đã đọc phẳng. Chỉ cần nhánh 429 dự phòng trong `describeError` của `(auth)/login/page.tsx`.

## 2. Hợp đồng

**API.** `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, thêm phản hồi:
- `429`, header `Retry-After: <int 1..window>`, body `{ "code": "RATE_LIMIT_EXCEEDED", "messageKey": "errors.auth.rateLimited", "details": { "retryAfterSeconds": <int> } }`. Không `Set-Cookie`. Không nói bộ đếm nào bị vượt.
- Không đổi request/response thành công, không đổi 401/409. Không endpoint mới. `packages/contracts` không đổi.

**Service nội bộ (để RL-2 và RL-3 khớp nhau).**
```ts
interface RateLimitRule { key: string /* rl:... đã băm */; max: number; windowSeconds: number; bucket: string }
interface Reservation { key: string; count: number; ttlSeconds: number; exceeded: boolean; tracked: boolean }
interface RateLimitDecision { blocked: boolean; retryAfterSeconds: number; reservations: Reservation[] }
class RateLimitService {
  keyFor(action, scope, subject, window?): string   // HMAC, không bao giờ trả về dữ liệu thô
  reserve(rules): Promise<RateLimitDecision>        // INCR tất cả; nếu blocked thì tự release bucket chưa vượt
  release(reservations): Promise<void>              // bù trừ DECR an toàn
  clear(reservation): Promise<void>                 // DEL
}
class RateLimitedException extends HttpException { constructor(readonly retryAfterSeconds: number) }
```

**Dữ liệu:** mục D5. **UI/i18n:** chỉ `errors.auth.rateLimited` (EN/VI trong brief §6.1), owner AH-I18N.

## 3. Task cards

Quy ước chung mọi card: comment code bằng tiếng Anh, văn phong API (xem `.agent/rules/code-documentation.md`); không log PII/khoá; không sửa file ngoài `Allowed files`. Typecheck API: `pnpm --filter @dnc/api typecheck`. Test API (cần Postgres :5433, Redis cache :6381): `pnpm --filter @dnc/api test` hoặc `pnpm --filter @dnc/api exec vitest run <đường dẫn spec>`.

---
## Task Card
ID: AH-SEC-JWT
Title: Bỏ log khoá JWT, khoá tạm không extractable, lỗi khoá không lộ giá trị, `.env.example`
Owner Agent: backend-agent
Goal: Không còn đường nào đưa khoá riêng JWT tới logger/console; lỗi cấu hình khoá nêu tên biến mà không in lại giá trị.
Scope: Sửa `AuthService.onModuleInit` (hiện `auth.service.ts:~85-110`): bỏ hai `logger.debug(exportPKCS8/exportSPKI)` và các import `exportPKCS8`, `exportSPKI`; `generateKeyPair('RS256', { extractable: false })`; giữ đúng một `logger.warn`. Bọc `importPKCS8`/`importSPKI` bằng try/catch, ném `new Error('JWT_PRIVATE_KEY is not a valid RS256 PKCS8 key')` (tương tự `JWT_PUBLIC_KEY`/SPKI), **không** gắn `cause` chứa giá trị. `.env.example`: thêm hướng dẫn openssl tạo cặp khoá một dòng `\n` (thay dòng comment `node -e` đang cụt), kèm hai khối env cho card sau (xem dưới).
Allowed files: apps/api/src/modules/auth/auth.service.ts (chỉ hàm onModuleInit + import), apps/api/.env.example, apps/api/e2e/modules/auth/auth-key-logging.e2e.spec.ts
Do not edit: các hàm khác của auth.service.ts (register/login/refresh sẽ do AH-RL-3 sửa sau), auth.controller.ts, bất kỳ file khác.
Inputs: D6 (spec), brief AC-1..6.
Dependencies: —
Acceptance slice: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6.
Test lane: integration (spec mới) + regression (toàn bộ auth e2e).
Definition of Done:
- Code: như Scope.
- `.env.example` thêm hai khối comment sau (RL-1/RL-3 triển khai, card này chỉ ghi tài liệu): (a) `# TRUST_PROXY` giải thích loopback mặc định ở dev, bắt buộc ở production, khai số hop hoặc CIDR của LB, cảnh báo Next chỉ gán `X-Forwarded-For` khi thiếu và không append nên LB phải ghi đè, cấm `true`; (b) khối `RATE_LIMIT_*` với mặc định ở D3, `RATE_LIMIT_HMAC_SECRET` (production bắt buộc ≥32 ký tự, ví dụ `openssl rand -hex 32`), và dòng ví dụ ngưỡng cao cho dev/Playwright (`RATE_LIMIT_REGISTER_HOURLY_MAX=1000`...) ghi rõ "chỉ cho local, đừng dùng ở production".
- Test: spec `auth-key-logging.e2e.spec.ts` theo D6, gồm cả quét tĩnh không còn `exportPKCS8` trong `src/`.
- Xác minh: `pnpm --filter @dnc/api typecheck && pnpm --filter @dnc/api exec vitest run e2e/modules/auth` xanh; `grep -rn "exportPKCS8" apps/api/src` rỗng; khởi động API không `.env` khoá ở level debug, thấy đúng một warn, không PEM.
Risk: Khoá tạm không extractable thì dev không còn xuất khoá để ghim vào `.env`, nên hướng dẫn openssl là bắt buộc. Token vẫn ký/verify được trong cùng process (kiểm bằng test).

---
## Task Card
ID: AH-DB-1
Title: Migration `0009_trust_signals.sql` + áp tay vào DB local
Owner Agent: backend-agent
Goal: Bảng chứng cứ `trust_signals` append-only với trigger bảo vệ thật (có hiệu lực với `dnc`) và vai trò `dnc_app NOLOGIN`.
Scope: Tạo file SQL đúng như D5 (DDL đầy đủ, comment đầu file giải thích S-4/S-7, bẫy FK `issued_by`, quay lui). Áp tay vào container đang chạy. Đối chiếu với DB initdb mới.
Allowed files: apps/api/src/database/sql/0009_trust_signals.sql
Do not edit: các file sql 0000..0008, docker-compose.local.yml, mọi file TypeScript.
Inputs: D5 (DDL, lệnh áp, lệnh đối chiếu, quay lui), brief §6.3.
Dependencies: —
Acceptance slice: AC-37, AC-38 (phần đặc quyền), AC-39 (phần trigger), AC-40, AC-41, AC-42, AC-43.
Test lane: integration (do AH-TS-TEST viết); card này tự xác minh bằng psql.
Definition of Done:
- Code: file SQL, bọc BEGIN/COMMIT, không idempotent ở mức bảng.
- Áp tay thành công một lần: `docker exec -i vncare-postgres-1 psql -U dnc -d dnc -v ON_ERROR_STOP=1 < apps/api/src/database/sql/0009_trust_signals.sql`. Áp lần hai phải lỗi `already exists` và không làm đổi gì (kiểm `\d trust_signals` không đổi).
- Đối chiếu `pg_dump -s` với container scratch (D5) khớp; container scratch được xoá sau khi xong.
- psql kiểm: `has_table_privilege('dnc_app','trust_signals','UPDATE')` = false, `…'DELETE'` = false; `has_column_privilege('dnc_app','trust_signals','revoked_at','UPDATE')` = true; `SELECT count(*) FROM pg_enum` của hai enum = 14 và 5.
- Báo cáo ghi rõ lệnh đã chạy và đầu ra tóm tắt.
Risk: Áp tay quên (rủi ro 8 của brief): thiếu bảng thì AH-TS-TEST đỏ. Đây là ràng buộc cứng trước AH-TS-TEST. `dnc_app` là role cấp cluster, không quay lui nhầm khi có DB khác dùng chung cluster (hiện không có).

---
## Task Card
ID: AH-I18N
Title: Thêm `errors.auth.rateLimited` (EN/VI), sinh lại `message-keys.ts`
Owner Agent: backend-agent (đã là owner của `packages/i18n` ở RBAC-2; chủ sở hữu duy nhất đợt này)
Goal: Key chuỗi 429 có trong cả hai catalog và union `MessageKey`.
Scope: Thêm vào nhóm `errors.auth` của `en.json` và `vi.json` đúng chuỗi brief §6.1 ("Too many attempts. Please wait a few minutes and try again." / "Bạn thử quá nhiều lần. Vui lòng đợi vài phút rồi thử lại."). Chạy `node packages/i18n/scripts/generate-keys.mjs`. Không sửa `auth.field.identifier` (đã có đủ EN/VI).
Allowed files: packages/i18n/messages/en.json, packages/i18n/messages/vi.json, packages/i18n/src/message-keys.ts
Do not edit: mọi file khác trong packages/i18n, mọi app.
Inputs: D7.
Dependencies: —
Acceptance slice: AC-30 (và nền cho AC-31/32/36).
Test lane: unit (catalog parity có sẵn).
Definition of Done: `node packages/i18n/scripts/generate-keys.mjs && pnpm --filter @dnc/i18n typecheck && pnpm --filter @dnc/i18n test` xanh; `git diff --stat` chỉ ba file trên; `message-keys.ts` có đúng một key mới.
Risk: Thấp. Phải chạy trước AH-WC và AH-ADM-1 vì chúng gõ `t('errors.auth.rateLimited')` (typed MessageKey).

---
## Task Card
ID: AH-RL-1
Title: Cấu hình rate limit, IP chuẩn hoá, `trust proxy`, env test
Owner Agent: backend-agent
Goal: Các khối thuần (không Redis) mà limiter cần: đọc/validate env, chuẩn hoá IP, cấu hình `trust proxy` dùng chung cho `main.ts` và harness.
Scope:
- `src/common/rate-limit/rate-limit.config.ts`: `RATE_LIMIT_CONFIG` token, kiểu `RateLimitConfig`, `loadRateLimitConfig(env)` (bảng D3, throw nêu tên biến, không in giá trị, secret ngẫu nhiên ở dev, bắt buộc ở production).
- `src/common/rate-limit/client-ip.ts`: `normalizeClientIp(ip)` (IPv4-mapped → v4, IPv6 → /64, thiếu → `unknown`).
- `src/common/http/trust-proxy.ts`: `applyTrustProxy(app, env)` (D4: mặc định `loopback` ở dev, bắt buộc ở production, cấm `true`, nhận hop/CIDR/keyword).
- `main.ts`: gọi `applyTrustProxy(app, process.env)` ngay sau `NestFactory.create`.
- `e2e/support/harness.ts`: gọi `applyTrustProxy` sau `createNestApplication()`.
- `vitest.config.ts`: `test.env` đặt toàn bộ ngưỡng `RATE_LIMIT_*_MAX=100000`, `RATE_LIMIT_HMAC_SECRET` cố định.
- Spec thuần.
Allowed files: apps/api/src/common/rate-limit/rate-limit.config.ts, apps/api/src/common/rate-limit/client-ip.ts, apps/api/src/common/http/trust-proxy.ts, apps/api/src/main.ts, apps/api/e2e/support/harness.ts, apps/api/vitest.config.ts, apps/api/e2e/common/rate-limit/rate-limit.config.spec.ts, apps/api/e2e/common/rate-limit/client-ip.spec.ts, apps/api/e2e/common/http/trust-proxy.spec.ts
Do not edit: app.module.ts, auth/*, redis/*, `.env.example` (do AH-SEC-JWT), các spec cũ.
Inputs: D1 (chuẩn hoá IP/băm), D3, D4.
Dependencies: —
Acceptance slice: AC-25 (một nửa: env sai), AC-26 (nửa sau), AC-27 (nền), AC-29 (vitest env).
Test lane: unit (spec thuần) + regression (toàn bộ e2e hiện có phải xanh với `trust proxy` mới).
Definition of Done:
- Unit test: env mặc định, từng biến sai (0, âm, chữ, thập phân, vượt trần) throw đúng tên biến và không chứa giá trị; production thiếu secret hoặc secret <32 ký tự throw; dev thiếu secret trả secret ngẫu nhiên khác nhau mỗi lần gọi; `normalizeClientIp` bao phủ v4, v4-mapped, v6 hai địa chỉ cùng /64 ra cùng giá trị, v6 khác /64 khác giá trị, undefined; `applyTrustProxy` từ chối `true`, thiếu ở production, nhận `loopback`, `2`, `10.0.0.0/8`.
- Xác minh: `pnpm --filter @dnc/api typecheck && pnpm --filter @dnc/api test` toàn bộ xanh (hồi quy).
Risk: Sửa `harness.ts` ảnh hưởng mọi spec: chỉ thêm một dòng, giữ nguyên còn lại. `trust proxy` đổi `request.ip`, nên `auth_sessions.ip` sẽ ghi IP thật hơn (không phá gì, ghi vào báo cáo).

---
## Task Card
ID: AH-RL-2
Title: `RateLimitService` (Redis Lua, fail-open) + `RateLimitedException` + filter
Owner Agent: backend-agent
Goal: Dịch vụ đếm cửa sổ cố định reserve-first, fail-open timeout 1s, và đường ném 429 có `Retry-After` đúng body phẳng.
Scope:
- `src/common/rate-limit/rate-limit.service.ts`: Lua reserve/release, hash HMAC, `Promise.race` 1000ms, cờ `degraded` với log chuyển trạng thái, log 429 có cấu trúc (D1). Inject `REDIS_CACHE` và `RATE_LIMIT_CONFIG`.
- `src/common/rate-limit/rate-limited.exception.ts`: exception.
- `src/common/rate-limit/rate-limited.filter.ts`: `RateLimitedExceptionFilter` (D2).
- `src/common/rate-limit/index.ts` export.
- Spec trên Redis thật.
Allowed files: apps/api/src/common/rate-limit/rate-limit.service.ts, apps/api/src/common/rate-limit/rate-limited.exception.ts, apps/api/src/common/rate-limit/rate-limited.filter.ts, apps/api/src/common/rate-limit/index.ts, apps/api/e2e/common/rate-limit/rate-limit.service.e2e.spec.ts
Do not edit: rate-limit.config.ts và client-ip.ts (AH-RL-1), auth/*, redis.module.ts, app.module.ts.
Inputs: D1, D2, contract nội bộ mục 2.
Dependencies: AH-RL-1
Acceptance slice: nền AC-15, AC-21, AC-24, AC-27, AC-28.
Test lane: integration (Redis cache thật localhost:6381, spec tự dọn `rl:*`).
Definition of Done:
- Spec: `reserve` chặn đúng ở count>max và không tăng quá dưới 20 lời gọi song song; `release`/`clear` đúng, release không tạo key không TTL (kiểm `TTL` mọi key ≥ 0 hoặc key đã mất); key sau TTL hết thì đếm lại; khi bị chặn thì bucket chưa vượt được release; mọi key khớp `^rl:[a-z]+:[a-z]+(:[a-z]+)?:[0-9a-f]{32}$` và TTL ≤ cửa sổ; client Redis trỏ cổng chết thì `reserve` trả `blocked=false` trong ≤ ~1.2s, đúng một warn `degraded`, và tự phục hồi (log một dòng) khi Redis trở lại; log không chứa subject thô (spy logger).
- Xác minh: `pnpm --filter @dnc/api typecheck && pnpm --filter @dnc/api exec vitest run e2e/common/rate-limit`.
Risk: Lua và `EVAL` trên cache `allkeys-lru`: counter có thể bị evict dưới áp lực bộ nhớ, đồng nghĩa giới hạn reset, chấp nhận ở v1. Lệnh xếp hàng offline của ioredis khi Redis chết: race timeout xử lý; không `await` lệnh trễ.

---
## Task Card
ID: AH-RL-3
Title: Nối limiter vào `login`/`register`
Owner Agent: backend-agent
Goal: 429 đúng AC, kiểm trước `argonVerify`, đếm chỉ lần sai, reset identifier khi đúng.
Scope:
- `AuthModule`: đăng ký provider `RateLimitService`, `{ provide: RATE_LIMIT_CONFIG, useFactory: () => loadRateLimitConfig(process.env) }`.
- `AuthController`: `@UseFilters(RateLimitedExceptionFilter)` ở class.
- `AuthService`: inject `RateLimitService`; `login()`: chuẩn hoá identifier, `reserve([ip, identifier])` trước mọi truy vấn DB/argon, chặn thì `throw new RateLimitedException`; thành công thì `clear` identifier + `release` IP; `ACCOUNT_NOT_ACTIVE` (`assertUsable` ném) thì `release` cả hai; `INVALID_CREDENTIALS` giữ nguyên. `register()`: `reserve([ip hour, ip day])` trước `handleTaken`.
Allowed files: apps/api/src/modules/auth/auth.service.ts (register, login, constructor, import), apps/api/src/modules/auth/auth.controller.ts, apps/api/src/modules/auth/auth.module.ts
Do not edit: onModuleInit (đã xong ở AH-SEC-JWT), refresh/logout, repository, mapper, `app.module.ts`, `common/rate-limit/*`.
Inputs: D1, D2, mục 2.
Dependencies: AH-SEC-JWT (cùng sửa `auth.service.ts`, phải nối tiếp), AH-RL-1, AH-RL-2.
Acceptance slice: AC-15..AC-23, AC-25..AC-28 (do AH-RL-4 chứng minh).
Test lane: regression (toàn bộ auth e2e + toàn bộ API e2e hiện có phải xanh) ở card này; spec rate limit riêng ở AH-RL-4.
Definition of Done:
- Code: như Scope; không đổi hành vi 200/401/409/201 khi dưới ngưỡng; thời gian chống dò (dummyHash) giữ nguyên.
- Xác minh: `pnpm --filter @dnc/api typecheck && pnpm --filter @dnc/api test` toàn bộ xanh (ngưỡng 100000 từ vitest env).
- Tự kiểm bằng API chạy thật với `RATE_LIMIT_LOGIN_IP_MAX=3` (`PORT` khác để không đụng :3101): đúng 3 lần login sai (identifier khác nhau) trả 401 rồi lần 4 trả 429 có header `Retry-After`. Không quá 5 lần login sai/lượt.
Risk: Race `release`/`clear` sau khi request đã tới: dùng try/finally cẩn thận để mọi nhánh đều bù trừ đúng (rò slot làm sai số đếm). Dev API đang chạy sẽ áp ngưỡng mặc định ngay: nhắc Coordinator đặt ngưỡng cao trong `apps/api/.env` (D3) trước khi chạy Playwright.

---
## Task Card
ID: AH-RL-4
Title: E2E rate limit (AC-15..29)
Owner Agent: backend-agent
Goal: Chứng minh từng AC rate limit bằng spec chạy với DB và Redis thật.
Scope: Spec `auth-rate-limit.e2e.spec.ts`, tự ghi đè `process.env` trước `createTestApp()` (login IP=10, identifier=5, window=900; register hour=5/day=15; HMAC cố định) và dọn `rl:*` đầu mỗi ca. Các ca: AC-15 (10 identifier khác nhau → 401 ×10 rồi 429, kiểm `Retry-After` 1..900 và body); AC-16 (429 thì mật khẩu đúng vẫn 429, không `auth_sessions` mới, không `Set-Cookie`); AC-17 (sai 9, đúng, sai 1, request kế 429); AC-18 (identifier thật và không tồn tại cùng số lần và body 429 giống hệt); AC-19 (IP-A bị chặn, IP-B qua); AC-20 (cùng identifier khác hoa thường/khoảng trắng từ 5 IP khác nhau → lần 6 từ IP mới 429; đúng trước ngưỡng reset bộ đếm identifier); AC-21 (cửa sổ 2s, chờ rồi xử lý lại bình thường); AC-22 (register lần 6 trong giờ → 429, không tạo user, không `HANDLE_TAKEN`/`EMAIL_TAKEN`; một ca 409 cũng được đếm); AC-23 (`refresh`, `logout`, `/health/ready` không bị chặn); AC-24 (client Redis cache trỏ cổng chết bằng `REDIS_CACHE_URL` sai trước `createTestApp()`: login vẫn 200/401, không 500, thêm ≤1s, đúng một warn của limiter); AC-25 (ngưỡng=3 → 429 sau đúng 3 lần sai; env sai thì `createTestApp()` reject nêu tên biến); AC-26 (qua XFF khác nhau có bộ đếm riêng; app với `TRUST_PROXY=10.255.255.1` thì XFF bị bỏ qua nên spoof vẫn 429); AC-27 (`SCAN rl:*` không chứa identifier/IP thô, TTL ≤ cửa sổ; spy logger không chứa identifier/IP/mật khẩu/token); AC-28 (mỗi 429 một dòng log có cấu trúc).
Allowed files: apps/api/e2e/modules/auth/auth-rate-limit.e2e.spec.ts
Do not edit: `harness.ts` (chỉ import), mọi file `src/`, các spec khác.
Inputs: D6 (cách dọn key, IP giả), brief AC.
Dependencies: AH-RL-3
Acceptance slice: AC-15..AC-28.
Test lane: integration.
Definition of Done:
- Mọi AC trên có ít nhất một ca; không `it.skip`; tài khoản tạo qua `trackActor`/`createActor` để teardown dọn.
- Xác minh: `pnpm --filter @dnc/api exec vitest run e2e/modules/auth/auth-rate-limit.e2e.spec.ts` rồi toàn bộ `pnpm --filter @dnc/api test` xanh hai lần liên tiếp (không flaky, không tự khoá).
Risk: Spec chạy song song với spec khác dùng cùng Redis: tránh bằng IP giả/identifier ngẫu nhiên; ca AC-21 phụ thuộc thời gian thực, dùng cửa sổ 2s với dư địa, không ngủ thừa.

---
## Task Card
ID: AH-TS-TEST
Title: Test `trust_signals` (cột, index, quyền, trigger, cascade)
Owner Agent: backend-agent
Goal: Khoá bằng test cứng hợp đồng DB của migration 0009.
Scope: `trust-signals.e2e.spec.ts` theo D6: AC-37 (cột/kiểu từ `information_schema`, FK `ON DELETE CASCADE`, đủ 14 + 5 giá trị enum, hai index đúng tên); AC-38 (`SET ROLE dnc_app`: INSERT/SELECT được, UPDATE `weight` → `42501`, DELETE → `42501`, UPDATE `revoked_at`/`revoked_reason` được, `has_table_privilege`/`has_column_privilege`); AC-39 (bằng `dnc`: UPDATE cột khác bị trigger `55000`; `revoked_at` NULL → có giá trị được; sửa `revoked_at` đã có giá trị bị từ chối); AC-40 (verified thứ hai của `email_verified` → `23505`; sau khi revoke, verified mới cùng loại được chèn; `type` ngoài enum lỗi; `revoked_reason` không có `revoked_at` vi phạm CHECK `23514`); AC-41 (`DELETE FROM users` cascade xoá `trust_signals`).
Allowed files: apps/api/e2e/database/trust-signals.e2e.spec.ts
Do not edit: file SQL migration, `harness.ts`, `src/`.
Inputs: D5, D6.
Dependencies: AH-DB-1 (migration đã áp vào DB local)
Acceptance slice: AC-37..AC-41.
Test lane: integration.
Definition of Done: `pnpm --filter @dnc/api exec vitest run e2e/database/trust-signals.e2e.spec.ts` xanh; kết nối DB thất bại thì spec đỏ rõ ràng (không skip, AC-9); dọn mọi `users` tạo ra; toàn bộ `pnpm --filter @dnc/api test` vẫn xanh (AC-41).
Risk: Phụ thuộc DB local đã áp tay (rủi ro 8); thiếu bảng thì thông báo lỗi phải nói rõ "áp 0009". Dùng transaction + `ROLLBACK` cho các ca quyền để không để dữ liệu rác.

---
## Task Card
ID: AH-ENUM-TEST
Title: Test `pg_enum` cho `user_role_enum` (M1-4)
Owner Agent: backend-agent
Goal: Khoá bằng test cứng rằng `users.role` có đúng 5 giá trị.
Scope: `user-role-enum.e2e.spec.ts`: AC-7 (`SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='user_role_enum' ORDER BY e.enumsortorder` bằng đúng `['member','curator','moderator','admin','super_admin']`); AC-8 (không có `guest`/`organizer`/`verified_member`/`support`; `users.role` kiểu `user_role_enum`, `NOT NULL`, default `member` từ `information_schema`; INSERT `role='guest'` bị từ chối `22P02`); AC-9 (kết nối thất bại thì đỏ, không skip).
Allowed files: apps/api/e2e/database/user-role-enum.e2e.spec.ts
Do not edit: file SQL, `harness.ts`, `src/`.
Inputs: D6, brief AC-7..10.
Dependencies: — (0008 đã áp)
Acceptance slice: AC-7, AC-8, AC-9, AC-10.
Test lane: integration.
Definition of Done: `pnpm --filter @dnc/api exec vitest run e2e/database/user-role-enum.e2e.spec.ts` xanh; ca INSERT `guest` chạy trong transaction rồi `ROLLBACK`, không để lại dòng nào.
Risk: Thấp.

---
## Task Card
ID: AH-DEV
Title: `ops/dev.sh` bật đủ Redis + Mailpit
Owner Agent: backend-agent (như RBAC-5)
Goal: Môi trường dev đúng thực tế: health không `degraded`.
Scope: Đổi `docker compose … up -d postgres minio` thành `up -d postgres redis-cache redis-queue mailpit minio`; thêm trước đó kiểm `docker info >/dev/null 2>&1 || { echo "Docker daemon is not running" >&2; exit 1; }`; banner thêm dòng `Mail  http://localhost:8025   (Mailpit)`. Giữ nguyên `ADMIN_PORT` ghi đè và mọi phần còn lại.
Allowed files: ops/dev.sh
Do not edit: docker-compose.local.yml, mọi file khác.
Inputs: brief AC-11..14.
Dependencies: —
Acceptance slice: AC-11, AC-12, AC-13, AC-14.
Test lane: regression (chạy thật, không có unit).
Definition of Done: `bash -n ops/dev.sh` sạch; chạy `ops/dev.sh` khi container tắt thì bật đủ 5 container và `curl localhost:<PORT API>/api/v1/health/ready` trả 200 với ba check `up`; chạy lại không lỗi/không trùng; tắt Docker thì thoát khác 0 trước khi bật dev server. Chỉ dừng/khởi động lại đúng container của project `vncare`, không đụng container khác trên máy.
Risk: Có container khác (`boongchat-*`, `sociagri-*`) trên cùng máy: không dùng lệnh dừng toàn cục. Thay đổi bash không buộc build EAS.

---
## Task Card
ID: AH-WC
Title: Web-client đọc body lỗi phẳng + nhánh 429
Owner Agent: web-client-agent
Goal: `messageKey` do server chọn hiển thị đúng ở form đăng nhập/đăng ký, gồm 429, 409 và 401.
Scope: `app/_lib/api.ts`, khối `if (!response.ok)`: đọc `body.code` và `body.messageKey` ở mức gốc, fallback `body.message?.code/messageKey` cho dạng lồng. `app/_components/auth-form.tsx`, `describe()`: thêm `if (cause.status === 429) return t('errors.auth.rateLimited')` trước nhánh 401. Không đổi lớp `ApiError`.
Allowed files: apps/web-client-side/app/_lib/api.ts, apps/web-client-side/app/_components/auth-form.tsx
Do not edit: mọi file khác của web-client, `packages/**`.
Inputs: D8, key `errors.auth.rateLimited`.
Dependencies: AH-I18N
Acceptance slice: AC-32, AC-33, AC-34, AC-36.
Test lane: screen (Tester chạy thật, web-client chưa có e2e) + typecheck.
Definition of Done:
- `pnpm --filter @dnc/web-client typecheck` xanh.
- Ghi vào báo cáo đầu ra mong đợi để Tester đối chiếu: đăng ký trùng email/handle → `errors.auth.emailTaken`/`handleTaken`; sai mật khẩu → `invalidCredentials`; 429 → chuỗi rate limit EN/VI; mất mạng → `auth.error.offline`; 500 → `auth.error.generic`; không lộ raw key.
Risk: Sửa `api.ts` đổi thông báo 409 thành đúng hơn (rủi ro 7): hồi quy trên mọi chỗ gọi `call()` (các lỗi khác vẫn rơi về `auth.error.generic`/`status`). `api.ts` là file dùng chung của web-client nhưng không có card khác sửa nó trong đợt này.

---
## Task Card
ID: AH-ADM-1
Title: Form login admin: nhánh 429 và chốt thay đổi chưa commit
Owner Agent: web-admin-agent
Goal: Form một ô identifier + nhánh 429; hai file đang sửa dở (`login/page.tsx`, `e2e/support/login.ts`) đạt AC-45..51.
Scope: Giữ thay đổi đang có (`auth.field.identifier`, `type="text"`, `autoComplete="username"`, `maxLength=254`, trim). `describeError` trong `(auth)/login/page.tsx` thêm `if (cause.status === 429) return t('errors.auth.rateLimited')` trước nhánh 401. `e2e/support/login.ts` đã dùng nhãn `Email, username or phone`; thêm tuỳ chọn `loginWithIdentifier(page, identifier, password)` trong cùng file nếu cần cho AH-ADM-2.
Allowed files: apps/web-admin-side/app/(auth)/login/page.tsx, apps/web-admin-side/e2e/support/login.ts
Do not edit: `app/_lib/api.ts` (đã đọc phẳng), `auth-provider.tsx`, `packages/**`, các spec hiện có.
Inputs: D8, key `errors.auth.rateLimited`.
Dependencies: AH-I18N
Acceptance slice: AC-31 (mã), AC-45, AC-47, AC-48.
Test lane: screen (do AH-ADM-2) + typecheck.
Definition of Done: `pnpm --filter @dnc/web-admin typecheck` xanh; diff sau chỉnh gồm đúng hai file này; hành vi form khớp AC-47 (handle không `@` submit được, nút bật khi cả hai ô khác rỗng sau trim).
Risk: Thấp. Không commit trong card (Coordinator commit sau review + test).

---
## Task Card
ID: AH-ADM-2
Title: Playwright admin: identifier + 429
Owner Agent: web-admin-agent
Goal: Chứng minh AC-31 và AC-45..51 trên trình duyệt thật.
Scope: Hai spec mới. `login-identifier.spec.ts`: nhãn EN và VI (đặt `localStorage['dnc-locale']`) đúng và không lộ raw key; staff đăng nhập bằng email, handle (viết hoa/thường lẫn lộn), phone (spec tự `psql` `UPDATE users SET phone='…' WHERE email='…'` cho tài khoản admin e2e rồi dọn theo teardown có sẵn); `member` vẫn bị từ chối như AC-10; sai thông tin → `errors.auth.invalidCredentials`; handle không có `@` submit được. `login-rate-limited.spec.ts`: dùng `page.route('**/api/v1/auth/login', …)` trả 429 giả `{code:'RATE_LIMIT_EXCEEDED',messageKey:'errors.auth.rateLimited',details:{retryAfterSeconds:60}}` (kèm `Retry-After`), kiểm `role="alert"` hiện chuỗi EN và VI, không giữ token (truy cập `/` quay về `/login`), nút dùng lại được. Hermetic: không phụ thuộc limiter thật.
Allowed files: apps/web-admin-side/e2e/login-identifier.spec.ts, apps/web-admin-side/e2e/login-rate-limited.spec.ts
Do not edit: `accounts.ts`, `global-setup.ts`, `global-teardown.ts`, `playwright.config.ts`, các spec hiện có.
Inputs: AH-ADM-1, D3 (ngưỡng cao trong `.env` API).
Dependencies: AH-ADM-1, AH-RL-3 (để chạy trên API đã có limiter và ngưỡng cao trong `apps/api/.env`).
Acceptance slice: AC-31, AC-45..AC-49, AC-51.
Test lane: screen (Playwright).
Definition of Done: `PW_BASE_URL=http://localhost:3012 PW_API_ORIGIN=http://localhost:3101 PW_DATABASE_URL=postgresql://dnc:dnc@localhost:5433/dnc pnpm --filter @dnc/web-admin test:e2e` xanh toàn bộ (gồm các spec cũ, AC-51); không ca nào gặp 429 thật (AC-29).
Risk: Cần stack đang chạy và `apps/api/.env` đã có ngưỡng cao, nếu không `global-setup` đăng ký (3 lần/lượt) sẽ chạm 5/giờ. Phone phải duy nhất, dùng số ngẫu nhiên kiểu `newPhone()`.

## 4. Thứ tự thực thi và song song (tối đa 4 worker)

```
Đợt 1 (4 song song):   AH-SEC-JWT | AH-DB-1 | AH-I18N | AH-RL-1
Đợt 2 (4 song song):   AH-RL-2 (sau RL-1) | AH-TS-TEST (sau DB-1) | AH-WC (sau I18N) | AH-ADM-1 (sau I18N)
Đợt 3 (4 song song):   AH-RL-3 (sau SEC-JWT, RL-1, RL-2) | AH-ENUM-TEST | AH-DEV | (ADM-2 chờ RL-3 xong, xem dưới)
Đợt 4:                 AH-RL-4 (sau RL-3) | AH-ADM-2 (sau ADM-1 và RL-3 + Coordinator đặt ngưỡng cao trong apps/api/.env)
Cuối:                  hồi quy toàn bộ -> Code Review -> Tester -> Coordinator commit
```
- Đường tuần tự bắt buộc: `AH-SEC-JWT → AH-RL-3 → AH-RL-4`; `AH-RL-1 → AH-RL-2 → AH-RL-3`; `AH-DB-1 → AH-TS-TEST`; `AH-I18N → AH-WC / AH-ADM-1 → AH-ADM-2`.
- Song song an toàn (tập file rời nhau): SEC-JWT, DB-1, I18N, RL-1, ENUM-TEST, DEV, WC, ADM-1, TS-TEST, RL-2. Có thể điều phối động: ENUM-TEST và DEV không phụ thuộc ai, lấp vào bất kỳ slot trống nào.
- **File dùng chung phải nối tiếp:**
  - `apps/api/src/modules/auth/auth.service.ts`: AH-SEC-JWT (onModuleInit) → AH-RL-3 (login/register).
  - `apps/api/.env.example`: chỉ AH-SEC-JWT.
  - `apps/api/e2e/support/harness.ts`, `src/main.ts`, `vitest.config.ts`: chỉ AH-RL-1.
  - `packages/i18n/**`: chỉ AH-I18N.
  - `apps/web-admin-side/e2e/support/login.ts` và `(auth)/login/page.tsx`: chỉ AH-ADM-1.
  - Không có hai card nào ghi cùng một file (đã đối chiếu từng cặp).
- **Việc thủ công của Coordinator (không phải card):** sau AH-RL-3, thêm ngưỡng cao vào `apps/api/.env` (gitignored) và restart API dev trước khi AH-ADM-2/Tester chạy Playwright, nếu không Playwright tự khoá.

## 5. Test lane bắt buộc
- Unit: config, client-ip, trust-proxy, catalog i18n.
- Integration: toàn bộ spec ở D6 (DB thật + Redis thật). Chạy lại toàn bộ `pnpm --filter @dnc/api test` hai lần liên tiếp sau AH-RL-4.
- Screen: Playwright admin (AH-ADM-2); web-client do Tester chạy tay hoặc Playwright MCP (chưa có e2e trong web-client, không thêm hạ tầng đợt này).
- Regression: toàn bộ e2e API cũ, Playwright admin cũ (AC-51), `pnpm dep-check`, `pnpm lint`, `pnpm --filter @dnc/web-client typecheck`, `pnpm --filter @dnc/web-admin typecheck`, `pnpm --filter @dnc/api typecheck`.
- Tester xác nhận bằng chạy thật (không tự động hoá được): AC-26 qua Next rewrite (hai client XFF khác nhau; quan sát được rằng client tự đặt XFF vẫn né được IP bucket qua web origin, xem D4), AC-24 trên container `vncare-redis-cache-1`, AC-11/12/13 của `ops/dev.sh`.

## 6. Ảnh hưởng và rủi ro tóm tắt
- **Build EAS:** không. Không đụng `apps/mobile`, không đổi `packages` nào ngoài `packages/i18n` (JSON + file sinh, Mobile chưa dùng key mới). `packages/contracts` không đổi.
- **BullMQ:** không chạm hàng đợi. Limiter chỉ dùng `REDIS_CACHE`, không đụng `REDIS_QUEUE`.
- **Dữ liệu cá nhân:** IP client và identifier chỉ tồn tại dưới dạng HMAC-SHA256 trong key Redis (TTL ≤24h, cơ sở xử lý: lợi ích chính đáng cho an ninh tài khoản); log không chứa PII. `auth_sessions.ip` đã có sẵn từ 0008 (không đổi). `trust_signals` mới chứa dữ liệu chứng cứ tin cậy gắn `user_id` nhưng chưa có đường ghi hay đọc qua API trong đợt này.
- **Kiểm duyệt/report:** không có nội dung mới hiển thị cho người lạ.
- **Múi giờ:** không (cửa sổ là số giây tương đối).
- **Đồng thời RSVP/PostGIS:** không liên quan.
- **Rủi ro chính:** (1) `trust proxy` + hành vi XFF của Next (D4); (2) e2e và dev API tự khoá nếu thiếu ngưỡng cao (D3); (3) Redis chết thì giới hạn tắt (fail-open, đã duyệt); (4) bộ đếm identifier có thể bị lợi dụng để khoá tài khoản người khác trong ≤15 phút (đã duyệt Q-1, không khoá 30 phút); (5) migration áp tay quên.

## Engineering Plan (mục theo mẫu)
- **Quyết định kiến trúc:** D1 đến D8 ở trên.
- **Service và module bị ảnh hưởng:** `apps/api` (`common/rate-limit`, `common/http`, `modules/auth`, `main.ts`, SQL 0009, e2e, vitest config, `.env.example`); `apps/web-client-side` (`_lib/api.ts`, `_components/auth-form.tsx`); `apps/web-admin-side` (`(auth)/login/page.tsx`, e2e); `packages/i18n`; `ops/dev.sh`; DB (bảng, 2 enum, role `dnc_app`, trigger).
- **Câu hỏi kỹ thuật còn mở:** không chặn triển khai. Cần xác nhận khi nghiệm thu: bản VI `auth.field.identifier` giữ "tên người dùng" (không đổi sang "tên đăng nhập" như AC-45 ghi).

## 7. Debate Gate
Không mở debate. Các điểm lệch brief cần Coordinator biết và xác nhận (đều là chi tiết kỹ thuật, không đánh đổi kiến trúc đáng tranh luận):
1. **Reserve-first thay cho "kiểm rồi đếm khi sai":** hành vi quan sát được trùng AC (AC-15..20 vẫn đúng), chỉ khác ở độ chặt khi song song. Brief §6.1 vẫn giữ nguyên ngữ nghĩa "chỉ lần sai".
2. **Index `uq_trust_signals_unique_kind` thêm `AND revoked_at IS NULL`** (lệch DDL doc 03 §4.5): nếu không, signal đã thu hồi (vẫn `status='verified'`, `revoked_at` có giá trị, vì trigger cấm đổi `status`) sẽ chặn vĩnh viễn việc cấp lại `email_verified` cho user đó. AC-40 vẫn đạt. Cần sửa doc 03 theo.
3. **`issued_by_user_id` dùng `ON DELETE RESTRICT`** (không `SET NULL`) vì cascade update sẽ vấp trigger. Khớp tinh thần 0008.
4. **Next không append `X-Forwarded-For`** (`??=`), nên bộ đếm IP chỉ chắc chắn khi LB production ghi đè XFF và `TRUST_PROXY` đúng. Production thiếu `TRUST_PROXY` hoặc `RATE_LIMIT_HMAC_SECRET` thì API từ chối khởi động (quyết định của tôi, brief chỉ nói "cấu hình"). Báo chủ dự án cùng Q-1, Q-5. Follow-up đề xuất: Next middleware ghi đè XFF.
5. **Register chỉ đếm sau khi body qua validation** (400 do zod không tính). Brief ghi "mọi lần gọi"; lệch nhỏ, không lộ thông tin.
6. **Local `apps/api/.env` phải nâng ngưỡng** trước Playwright (việc thủ công của Coordinator).

## 8. Việc tài liệu sau khi xong
- Đóng trong checklist M1: SEC-JWT-LOG, M1-4 / S1-DoD-1, E2-S10 / S1-DoD-7 / M1-7 (ACTIVE_TASKS T-12), M1-6 / S1-DoD-3, mục form login admin và `ops/dev.sh` (Coordinator đối chiếu tên mục chính xác trong checklist M1).
- Cập nhật doc 04 (mã lỗi `RATE_LIMIT_EXCEEDED` và `errors.auth.rateLimited`, §6.3 mục lỗi 429; chốt ngưỡng 10 IP/5 identifier/5-giờ-15-ngày; ghi `TRUST_PROXY` và `RATE_LIMIT_*` vào mục cấu hình).
- Cập nhật doc 05 §6.1 (bỏ khoá 30 phút theo `email_hash`, thay bằng cửa sổ 15 phút) và doc 02 E-3 (ngưỡng đăng ký), doc 14/doc 01 §11.2/§13.1 thống nhất mã `RATE_LIMIT_EXCEEDED`.
- Cập nhật doc 03 §4.5: predicate `uq_trust_signals_unique_kind` thêm `revoked_at IS NULL`, FK `issued_by_user_id RESTRICT`, vai trò `dnc_app`, trigger append-only; sửa doc 01 §11.3 trỏ về doc 03 (S-6).
- Ghi follow-up: chuyển kết nối API sang `dnc_app`; E2-S8 đếm ngược `Retry-After` (cần expose header); Q-7 ghi sự kiện 429 vào `audit_log`; ghi đè XFF ở Next; chỉ mục `(user_id)` đầy đủ cho `trust_signals` khi bảng lớn.
## 9. Quyết định Coordinator về mục 7 (01/10/2026)

Chấp nhận cả sáu điểm lệch, không mở Debate Gate:

1. Reserve-first: chấp nhận, hành vi quan sát được trùng AC.
2. `uq_trust_signals_unique_kind` thêm `revoked_at IS NULL`: chấp nhận; sửa doc 03 ở việc tài liệu.
3. `issued_by_user_id ON DELETE RESTRICT`: chấp nhận.
4. Production thiếu `TRUST_PROXY` hoặc `RATE_LIMIT_HMAC_SECRET` thì API từ chối khởi động: chấp nhận (fail loud). **Việc trước lần deploy kế tiếp:** thêm hai biến này vào env production. Báo chủ dự án.
5. Register chỉ đếm sau validation: chấp nhận.
6. Ngưỡng cao trong `apps/api/.env` local: Coordinator làm trước khi chạy Playwright.

`auth.field.identifier` bản VI giữ "Email, tên người dùng hoặc số điện thoại" (AC-45 chấp nhận "tên người dùng").

## 10. Phân công thực tế (Coordinator)

| Worker | Agent | Card | Ghi chú |
|---|---|---|---|
| W-A | backend-agent | AH-SEC-JWT → AH-RL-1 → AH-RL-2 → AH-RL-3 → AH-RL-4 | Đường găng, nối tiếp trong một worker |
| W-B | backend-agent | AH-DB-1 → AH-TS-TEST → AH-ENUM-TEST → AH-DEV | Tập file rời W-A; chỉ chạy spec của mình, hồi quy toàn bộ là việc của W-A và Tester |
| W-C | backend-agent | AH-I18N | Ngắn; mở khoá W-D, W-E |
| W-D | web-client-agent | AH-WC | Sau W-C |
| W-E | web-admin-agent | AH-ADM-1, sau đó AH-ADM-2 | AH-ADM-2 chờ AH-RL-3 + ngưỡng cao trong `apps/api/.env` |

Tối đa 4 worker triển khai chạy cùng lúc.
