# Requirement Brief — M1 auth hardening (Phase 1, M1)

**Chủ:** TV1 (migration, test enum, dev.sh, SEC-JWT-LOG) + TV2 (rate limit) · **Nguồn:** BA Agent, 01/10/2026 · **Trạng thái:** đã duyệt phạm vi (chủ dự án chọn "cả đợt, kể cả 2 mục rủi ro": migration schema + rate limit auth; commit lên branch hiện tại sau review + test). Chạy L8.
**Checklist:** SEC-JWT-LOG, M1-4 / S1-DoD-1, E2-S10 / S1-DoD-7 / M1-7 (ACTIVE_TASKS T-12), M1-6 / S1-DoD-3, form login admin (đang chưa commit), `ops/dev.sh`.

## 0. Quyết định của Coordinator (01/10/2026)

| Câu hỏi | Quyết định | Ghi chú |
|---|---|---|
| Q-1 khoá 30 phút theo `email_hash` (doc 05 §6.1) | **Không khoá 30 phút.** Bộ đếm identifier 5 lần sai/15 phút, hết cửa sổ là hết chặn | Tránh bị lợi dụng khoá người khác. Báo chủ dự án ở báo cáo cuối |
| Q-2 ngưỡng đăng ký | **Theo doc 05: 5/giờ + 15/ngày theo IP**, cấu hình qua env | Lệch doc 02 E-3 ghi lại ở Rủi ro 6 |
| Q-3 vai trò Postgres ứng dụng | Migration tạo vai trò `NOLOGIN` (đề xuất `dnc_app`) và chỉ cấp quyền trên `trust_signals`. **Chuyển kết nối API sang vai trò này là follow-up** | Trigger là lớp bảo vệ thật với `dnc` |
| Q-4 chuyển trạng thái signal | v1 chỉ INSERT dòng ở trạng thái cuối; thu hồi bằng `revoked_at`/`revoked_reason` | Tech Lead xác nhận |
| Q-5 Redis cache hỏng | **Fail-open** + cảnh báo log không PII | Rủi ro chấp nhận, báo chủ dự án ở báo cáo cuối |
| Q-6 env, băm, cửa sổ, `trust proxy`, `details` | Tech Lead chốt | — |
| §7 client hiển thị 429 | **Trong phạm vi, phần tối thiểu** (key i18n + nhánh 429 + web-client đọc body phẳng). Đếm ngược và khoá nút là follow-up E2-S8 | — |

## 1. Mục tiêu nghiệp vụ

1. Không để khoá riêng JWT lọt vào log ở bất kỳ level nào, trước khi bật log tập trung.
2. Chặn dò mật khẩu và spam đăng ký trên endpoint xác thực bằng 429 + `Retry-After`. Cổng staff (admin/super_admin) là mục tiêu giá trị cao.
3. Khoá bằng test cứng rằng `users.role` có đúng 5 giá trị.
4. Có bảng chứng cứ tin cậy `trust_signals` append-only làm nền cho `trust:recompute` (T-13).
5. Môi trường dev đúng thực tế (Redis + Mailpit chạy, health không `degraded`); form login admin khớp API (một ô nhận email, username hoặc phone).

## 2. Tác nhân

- **Member** (web-client `/login`, `/register`): gõ sai vài lần cần thông báo hiểu được, không bị khoá oan, không bị nói sai là "sai mật khẩu" khi thực ra bị giới hạn.
- **Staff** `curator`/`moderator`/`admin`/`super_admin` (web-admin `/login`): mục tiêu brute-force; đăng nhập bằng email, handle hoặc phone.
- **`member` mở nhầm web-admin**: vẫn bị từ chối như AC-10 của rbac-admin-shell.
- **Kẻ tấn công ẩn danh**: dò mật khẩu, dò tài khoản, giả header IP.
- **Dev/Tester**: stack local đủ dịch vụ; e2e không tự khoá mình.

## 3. Phạm vi

**Trong phạm vi**
1. SEC-JWT-LOG: bỏ hai dòng `logger.debug` xuất khoá; giữ `logger.warn`; cặp khoá sinh tạm nên `extractable: false`; `.env.example` hướng dẫn tạo cặp khoá cố định bằng openssl.
2. M1-4: test `pg_enum` cho `user_role_enum` + kiểm tra cột `users.role`.
3. `ops/dev.sh`: bật `postgres redis-cache redis-queue mailpit minio`; banner thêm Mailpit `http://localhost:8025`.
4. Rate limit `POST /api/v1/auth/login` và `POST /api/v1/auth/register`: Redis cache, bộ đếm theo IP và theo identifier, ngưỡng qua env, không log PII, mã lỗi + key i18n `errors.auth.rateLimited`.
5. Client hiển thị 429 (tối thiểu): web-admin `/login`, web-client form đăng nhập/đăng ký; web-client đọc body lỗi phẳng.
6. Migration `trust_signals` theo doc 03 §4.5: bảng, 2 enum, 2 index, quyền, trigger chặn sửa cột bất biến, test, quy trình áp tay vào DB local.
7. Form login admin (thay đổi chưa commit) + `apps/web-admin-side/e2e/support/login.ts`.

**Ngoài phạm vi:** job `trust:recompute`, ghi signal, đổi `TRUST_LEVEL_ON_REGISTER`, endpoint `trust_signals`; chuyển kết nối API sang vai trò không superuser; rate limit cho refresh/logout/endpoint nghiệp vụ, `QuotaService`; quên mật khẩu, OTP, CAPTCHA, 2FA, email báo khoá; đếm ngược/khoá nút khi 429 (E2-S8); bảng `audit_log`; log tập trung.

## 4. Hành vi as-is (đọc code; mục [chạy thật] chờ Tester xác nhận)

- `auth.service.ts` ~105-110: thiếu khoá và không phải production thì sinh RS256 `extractable: true`, rồi `logger.debug(exportPKCS8(privateKey))` và `logger.debug(exportSPKI(...))`.
- `0008_identity.sql`: `user_role_enum` đúng 5 giá trị, `users.role NOT NULL DEFAULT 'member'`; chưa có test `pg_enum`.
- `ops/dev.sh` chỉ `up -d postgres minio` → health `degraded` [đã quan sát 01/10].
- Chưa có rate limit; `app.module.ts` có 3 `APP_GUARD` (`JwtAuthGuard`, `RolesGuard`, `TrustLevelGuard`). Sai thông tin trả `401 { code: 'INVALID_CREDENTIALS', messageKey: 'errors.auth.invalidCredentials' }` body phẳng; `login()` chống dò thời gian bằng `dummyHash`.
- **IP client:** `request.ip`, không có cấu hình `trust proxy`. Hai web app gọi API qua rewrite của Next, nên mọi người dùng có thể chung một IP [chạy thật].
- **Client 429:** web-admin đọc body phẳng đúng, không có nhánh 429. Web-client `_lib/api.ts` đọc `body.message.code`/`body.message.messageKey` (lồng) — lệch với body phẳng, nên mọi `messageKey` server bị mất; 409 `EMAIL_TAKEN`/`HANDLE_TAKEN` rơi về chuỗi chung [chạy thật].
- App và e2e kết nối bằng `dnc` = `POSTGRES_USER` (superuser, chủ bảng); không có `CREATE ROLE`/`GRANT` trong thư mục sql.
- e2e harness teardown bằng `DELETE FROM users WHERE id = ANY(...)` → cascade sang `trust_signals`.
- Form login admin (chưa commit): key `auth.field.identifier`, `type="text"`, `autoComplete="username"`, `maxLength=254`. API `LoginRequest.identifier` + `findByIdentifier` đã hỗ trợ email/handle/phone.

## 5. Behavior smell

| # | Smell |
|---|---|
| S-1 | Ngưỡng đăng nhập lệch: DoD/doc 08 10 lần/IP/15 phút; doc 05 §6.1 5 lần/15 phút theo `email_hash` + khoá 30 phút |
| S-2 | Mã 429 lệch: doc 04 + doc 01 §13.1 `RATE_LIMIT_EXCEEDED`; doc 02/05/14 `RATE_LIMITED`; doc 01 §11.2 `error.rate_limit.<scope>` |
| S-3 | Ngưỡng đăng ký lệch: doc 02 E-3 5/IP/15 phút; doc 05 5/giờ + 15/ngày |
| S-4 | `REVOKE` vô hiệu vì `dnc` là superuser và chủ bảng |
| S-5 | "Append-only" mâu thuẫn với các trạng thái `pending`/`expired`/`revoked` |
| S-6 | Hai DDL `trust_signals` khác nhau (doc 01 §11.3 vs doc 03 §4.5) — chốt doc 03 |
| S-7 | Trigger chặn DELETE sẽ phá cascade và teardown e2e |
| S-8 | Web-client đọc sai shape lỗi |
| S-9 | Giới hạn theo IP phụ thuộc cấu hình proxy |

## 6. Quyết định nghiệp vụ

### 6.1 Rate limit

| Câu hỏi | Quyết định | Nguồn |
|---|---|---|
| Đếm gì | Login: chỉ lần sai (`INVALID_CREDENTIALS`); lần đúng không tăng; `ACCOUNT_NOT_ACTIVE` không tính. Register: mọi lần gọi | Login: DoD. Register: mặc định BA |
| Login đếm theo | Hai bộ đếm độc lập, vượt một trong hai là 429: (a) IP 10 sai/15 phút; (b) identifier chuẩn hoá 5 sai/15 phút | (a) DoD/doc 08:721. (b) doc 05:565, bỏ khoá 30 phút |
| Register đếm theo | IP: 5/giờ và 15/ngày | doc 05:564 |
| Reset khi đăng nhập đúng | Reset bộ đếm identifier; **không** reset bộ đếm IP | Mặc định BA |
| Thứ tự | Kiểm giới hạn **trước** `argonVerify`; đang bị chặn thì mật khẩu đúng vẫn 429, không tạo session | Mặc định BA |
| Tài khoản tồn tại hay không | Đếm và phản hồi y hệt | doc 04:1429 |
| Response | 429, `Retry-After` số nguyên giây (1..cửa sổ), body phẳng `{ code: 'RATE_LIMIT_EXCEEDED', messageKey: 'errors.auth.rateLimited', details: { retryAfterSeconds } }`; không nói bộ đếm nào bị vượt | Mã: doc 04:1016. Phần còn lại Tech Lead chốt |
| i18n | `errors.auth.rateLimited` — EN "Too many attempts. Please wait a few minutes and try again." / VI "Bạn thử quá nhiều lần. Vui lòng đợi vài phút rồi thử lại." | Mặc định BA |
| Redis cache down | Fail-open, cảnh báo log một lần mỗi lần chuyển trạng thái (không PII), chờ Redis tối đa 1 giây | Quyết định Coordinator Q-5 |
| Cấu hình | Ngưỡng qua env, mặc định như trên; giá trị sai (0, âm, chữ) → API từ chối khởi động, nêu tên biến; e2e đặt ngưỡng cao; không có công tắc tắt ở production | Mặc định BA |
| IP | IP client thật; chỉ tin `X-Forwarded-For` từ hop tin cậy đã khai báo; IPv6 gom /64 | Mặc định BA; Tech Lead cấu hình |
| Endpoint | Chỉ `login` và `register` | Mặc định BA |

### 6.2 Quyền riêng tư

- Không bao giờ ghi log: mật khẩu, identifier thô, IP thô, token, khoá JWT. Log giới hạn chỉ có tên sự kiện, hành động, loại bộ đếm, số lần.
- Key Redis không chứa dữ liệu thô: identifier và IP băm HMAC. Dạng `rl:{action}:{scope}`. Identifier chuẩn hoá như `login()` (trim + lowercase + `normalizePhone`) trước khi băm. Mọi key có TTL ≤ cửa sổ.
- Giới hạn đã biết: cùng tài khoản gõ bằng email/handle/phone là 3 bucket identifier khác nhau; bộ đếm IP là chốt chặn còn lại. Chấp nhận ở v1.

### 6.3 Migration `trust_signals`

- `REVOKE UPDATE, DELETE` khỏi `PUBLIC` và vai trò ứng dụng; `GRANT SELECT, INSERT` + `GRANT UPDATE (revoked_at, revoked_reason)` cho vai trò ứng dụng.
- Trigger `BEFORE UPDATE` từ chối sửa cột khác `revoked_at`/`revoked_reason`, và từ chối sửa `revoked_at` đã có giá trị. Có hiệu lực với cả `dnc`. Không có trigger chặn DELETE (S-7).
- Schema theo doc 03 §4.5: `trust_signal_type_enum` 14 giá trị (`email_verified`, `phone_verified`, `social_google`, `social_facebook`, `social_apple`, `id_document`, `profile_completed`, `attended_event`, `hosted_event_completed`, `positive_review`, `community_vouch`, `staff_endorsement`, `penalty_no_show`, `penalty_report_upheld`); `trust_signal_status_enum` 5 giá trị (`pending`, `verified`, `rejected`, `expired`, `revoked`); `idx_trust_signals_user_active`; `uq_trust_signals_unique_kind`. Trọng số không nằm trong migration.
- DB local đang chạy phải áp tay; lệnh ghi ở task board.

## 7. Acceptance criteria

### A. SEC-JWT-LOG
- **AC-1:** GIVEN không phải production, không đặt `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`, log level tối đa WHEN API khởi động THEN log/console không chứa `BEGIN PRIVATE KEY`, `BEGIN PUBLIC KEY` hay thân base64 của khoá; có đúng một dòng `warn` về khoá tạm; token ký ra vẫn verify được.
- **AC-2:** GIVEN có cặp khoá hợp lệ THEN không có cảnh báo và không có khoá trong log. GIVEN `NODE_ENV=production` và thiếu khoá THEN API thất bại, thông báo chỉ nêu tên biến.
- **AC-3:** GIVEN `JWT_PRIVATE_KEY` sai định dạng THEN lỗi nêu tên biến, không in lại giá trị.
- **AC-4:** Không còn đường nào đưa `exportPKCS8` tới logger/console trong `apps/api/src`; khoá sinh tạm `extractable: false` nếu Tech Lead đồng ý.
- **AC-5:** Có test tự động (spy logger mọi level) chống tái phát.
- **AC-6:** `.env.example` có hướng dẫn tạo cặp khoá bằng openssl.

### B. M1-4 — test `pg_enum`
- **AC-7:** `SELECT enumlabel FROM pg_enum ... WHERE typname = 'user_role_enum' ORDER BY enumsortorder` trả đúng `member, curator, moderator, admin, super_admin`.
- **AC-8:** Không có `guest`, `organizer`, `verified_member`, `support`; `users.role` kiểu `user_role_enum`, `NOT NULL`, mặc định `member`; INSERT `role = 'guest'` bị DB từ chối.
- **AC-9:** Không kết nối được DB thì test thất bại rõ, không bị bỏ qua im lặng.
- **AC-10:** N/A quyền/audit/i18n; chạy trong lane integration của `apps/api`.

### C. `ops/dev.sh`
- **AC-11:** Docker chạy, container tắt WHEN chạy `ops/dev.sh` THEN `postgres`, `redis-cache`, `redis-queue`, `mailpit`, `minio` chạy; `GET /health/ready` 200, ba check `up`; banner có Mailpit.
- **AC-12:** Chạy lại khi container đã chạy thì không lỗi, không trùng, không đổi dữ liệu; `ADMIN_PORT` vẫn ghi đè được.
- **AC-13:** Docker daemon không chạy → thoát mã khác 0, báo lỗi trước khi bật dev server.
- **AC-14:** Không thêm bí mật; Mailpit như compose hiện có.

### D. Rate limit
- **AC-15:** Ngưỡng IP 10/15 phút: 10 lần sai (10 identifier khác nhau) → 401; lần 11 → 429, `Retry-After` 1..900, body `{ code: 'RATE_LIMIT_EXCEEDED', messageKey: 'errors.auth.rateLimited', details: { retryAfterSeconds } }`.
- **AC-16:** Đang 429 mà gửi mật khẩu đúng → vẫn 429, không tạo `auth_sessions`, không `Set-Cookie`.
- **AC-17:** Sai 9 lần, đăng nhập đúng (200), sai thêm 1 → request kế tiếp 429 (không reset bộ đếm IP).
- **AC-18:** Identifier có thật và không tồn tại cần cùng số lần để ra 429; 429 giống hệt nhau.
- **AC-19:** IP-A đang 429, IP-B vẫn được xử lý bình thường.
- **AC-20:** Ngưỡng identifier 5/15 phút: cùng identifier (khác hoa thường/khoảng trắng) sai 5 lần từ 5 IP → lần 6 từ IP mới vẫn 429. Đăng nhập đúng trước ngưỡng reset bộ đếm identifier.
- **AC-21:** Đợi quá `Retry-After` → xử lý bình thường, bộ đếm bắt đầu lại.
- **AC-22:** Register lần 6 trong giờ từ cùng IP (kể cả các lần trước thành công hay 409) → 429 như AC-15; không tạo user, không lộ `HANDLE_TAKEN`/`EMAIL_TAKEN`.
- **AC-23:** `POST /auth/refresh`, `POST /auth/logout`, `GET /health/ready` không bị chặn.
- **AC-24:** `redis-cache` dừng → login vẫn 200/401 (fail-open), không 500, cộng thêm ≤ 1 giây, health báo `redisCache: down`, đúng một dòng cảnh báo không PII; Redis chạy lại thì limiter hoạt động lại không cần restart.
- **AC-25:** Env ngưỡng sai → API không khởi động, nêu tên biến; env = 3 → 429 sau đúng 3 lần sai.
- **AC-26:** Qua rewrite của web app (hop tin cậy), hai client có `X-Forwarded-For` khác nhau có bộ đếm riêng; client nối thẳng, không qua hop tin cậy, tự đổi `X-Forwarded-For` mỗi lần vẫn bị 429.
- **AC-27:** `SCAN rl:*` không có key chứa identifier/IP thô; mọi key TTL ≤ cửa sổ; log không chứa identifier, IP, mật khẩu, token.
- **AC-28:** Mỗi 429 có một dòng log có cấu trúc (hành động, loại bộ đếm), không PII.
- **AC-29:** Toàn bộ e2e `apps/api` và Playwright `apps/web-admin-side` không gặp 429; spec rate limit tự đặt ngưỡng thấp và dọn key `rl:*` giữa các ca.
- **AC-30:** `errors.auth.rateLimited` có trong `en.json`, `vi.json`, `message-keys.ts` đã sinh lại; test parity i18n qua.

### E. Client hiển thị 429
- **AC-31:** Web-admin `/login` (EN, VI) nhận 429 → `role="alert"` hiện `errors.auth.rateLimited` đúng ngôn ngữ; không giữ token; nút dùng lại được.
- **AC-32:** Web-client đăng nhập và đăng ký (EN, VI) nhận 429 → hiện cùng chuỗi, không phải `auth.error.generic`.
- **AC-33:** Web-client đăng ký trùng email/handle → `errors.auth.emailTaken`/`errors.auth.handleTaken`; sai mật khẩu vẫn `errors.auth.invalidCredentials`.
- **AC-34:** Mất mạng/500 → giữ `auth.error.offline`/`auth.error.generic`.
- **AC-35:** N/A; chặn thật nằm ở API.
- **AC-36:** Không lộ raw key ở hai form, cả EN và VI.

### F. Migration `trust_signals`
- **AC-37:** Bảng đủ cột/kiểu doc 03 §4.5; FK `user_id` → `users` `ON DELETE CASCADE`; 2 enum đúng số giá trị; 2 index đúng tên; DB áp tay và DB initdb mới giống nhau.
- **AC-38:** `SET ROLE` vai trò ứng dụng: INSERT/SELECT được; UPDATE `weight` → `42501`; DELETE → `42501`; UPDATE `revoked_at`/`revoked_reason` được; `has_table_privilege` UPDATE/DELETE false, `has_column_privilege` hai cột revoked true.
- **AC-39:** Bằng `dnc`: UPDATE cột khác `revoked_at`/`revoked_reason` bị trigger từ chối; `revoked_at` NULL → giá trị được; sửa `revoked_at` đã có giá trị bị từ chối.
- **AC-40:** `email_verified` verified thứ hai cho cùng user → `23505`; `type` ngoài enum → lỗi; CHECK `revoked_reason` cần `revoked_at` nếu Tech Lead đưa vào.
- **AC-41:** `DELETE FROM users` cascade sang `trust_signals`; toàn bộ e2e hiện có vẫn qua.
- **AC-42:** Áp tay vào DB local thành công một lần, không đụng bảng khác; áp lần hai thất bại rõ hoặc không làm gì; migration chạy trong một transaction.
- **AC-43:** Không có code ghi `trust_signals`, không endpoint mới, `TRUST_LEVEL_ON_REGISTER` vẫn 1.
- **AC-44:** N/A audit/i18n.

### G. Form login admin
- **AC-45:** Nhãn ô đầu "Email, username or phone" / "Email, tên đăng nhập hoặc số điện thoại"; `auth.field.identifier` có ở `en.json` và `vi.json`; không lộ raw key.
- **AC-46:** Staff đăng nhập được bằng email, handle (không phân biệt hoa thường), phone; `member` bị từ chối như AC-10 rbac-admin-shell.
- **AC-47:** Handle không có `@` submit được; `type=text`, `autocomplete=username`, `maxlength=254`; nút bật khi hai ô khác rỗng sau trim; identifier được trim.
- **AC-48:** Sai thông tin → `errors.auth.invalidCredentials`; mất mạng → `auth.error.offline`.
- **AC-49:** Đăng nhập bằng handle/phone không đổi quyền; các ca 403 rbac-admin-shell vẫn đúng.
- **AC-50:** N/A audit.
- **AC-51:** `loginAs()` với nhãn mới: spec Playwright web-admin hiện có vẫn qua.

## 8. Service bị ảnh hưởng

- `apps/api`: `auth.service.ts`, limiter + `trust proxy`, env mới, SQL migration mới, e2e (enum, rate limit, trust_signals), `.env.example`.
- `apps/web-client-side`: `app/_lib/api.ts`, `app/_components/auth-form.tsx`.
- `apps/web-admin-side`: `app/(auth)/login/page.tsx`, `e2e/support/login.ts`.
- `packages/i18n`: key mới + sinh lại `message-keys.ts`. `packages/contracts` không đổi.
- `ops/dev.sh`.
- DB: bảng, 2 enum, vai trò Postgres, trigger.

## 9. Rủi ro

1. Cấu hình `trust proxy` sai → giới hạn IP vô tác dụng hoặc khoá toàn hệ thống. Rủi ro cao nhất; Tester kiểm bằng chạy thật.
2. e2e tự khoá nếu ngưỡng mặc định áp vào e2e (AC-29).
3. `REVOKE` trên superuser vô hiệu; trigger là lớp bảo vệ thật.
4. Fail-open để lộ cổng staff khi Redis hỏng.
5. Né bộ đếm identifier bằng 3 cách gõ và nhiều IP.
6. Tài liệu lệch nhau (S-1, S-2, S-3, S-6) — cập nhật doc 04/05 theo quyết định cuối.
7. Sửa `api.ts` web-client đổi hành vi lỗi 409 (tốt hơn) — cần hồi quy.
8. Migration áp tay dễ bị quên.

## 10. Câu hỏi mở còn lại

- Q-7: khi có bảng `audit_log`, ghi sự kiện 429 ở đâu.
- Follow-up: chuyển kết nối API sang vai trò không superuser; E2-S8 đếm ngược `Retry-After`; cập nhật doc 04/05 về mã lỗi và ngưỡng.
