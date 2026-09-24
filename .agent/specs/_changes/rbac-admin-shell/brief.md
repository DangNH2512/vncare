# Requirement Brief — RBAC trên API + khung web admin (Phase 1, bước 2)

**Chủ:** TV1 · **Nguồn:** BA Agent, 23/09/2026 · **Trạng thái:** đã duyệt phạm vi (PO chọn "Khung + đăng nhập + sức khoẻ", chạy L8 đầy đủ)
**Checklist:** E2-S7, S1-DoD-5, M1-5, S1-Demo-5, MT-17, PERM-MATRIX (M1)

## Mục tiêu nghiệp vụ

1. Chặn cứng ở API khi tài khoản không đủ role gọi endpoint dành cho nhân sự vận hành (hiện chưa có `RolesGuard`/`@Roles`).
2. Một nơi máy đọc được duy nhất mô tả role nào được làm gì, dùng chung `apps/api` và `apps/web-admin-side`.
3. Bước đầu của console vận hành: đăng nhập staff và trang "System health", làm nền cho E9-S1 (TV3, M4).

## Tác nhân

- `member` — đối chứng âm cho mọi ca 403.
- `curator`, `moderator` — vào được console, chưa có màn chuyên biệt.
- `admin`, `super_admin` — người dùng chính của "System health".

## Trong phạm vi

1. `@Roles(...)` + `RolesGuard` global (thứ tự guard: Tech Lead chốt, xem câu hỏi mở).
2. `PERMISSION_MATRIX` ở `packages/domain`: (a) tập role "staff" được vào console; (b) role được gọi `GET /api/v1/admin/system/health` (`admin`, `super_admin`). Cấu trúc mở rộng được tới ma trận đầy đủ của doc 01 §9.2.
3. `GET /api/v1/admin/system/health`: cần đăng nhập + role `admin`/`super_admin`; trả nguyên readiness (`database`, `redisCache`, `redisQueue`) cộng thông tin cơ bản không nhạy cảm. Không trả connection string, hostname nội bộ, stack trace.
4. Scaffold `apps/web-admin-side`: Next.js 16 + React 19 + Tailwind 4, cổng 3002, rewrite `/api/:path*` như web client, dùng `@dnc/tokens`, `@dnc/i18n`, `robots: noindex`.
5. Trang đăng nhập staff dùng lại `POST /api/v1/auth/login`.
6. App shell: sidebar + header (tên hiển thị, role, sign out), landing overview, trang System health.
7. Sign out dùng lại `POST /api/v1/auth/logout`.

## Ngoài phạm vi

Console curate, hàng đợi kiểm duyệt, quản lý user & role, analytics, audit log viewer (E9-S1, TV3, M4) — không thêm menu placeholder. Endpoint đổi role, bảng `audit_log`, 2FA cho staff, `AccountStatusGuard` per-request, rate limit đăng nhập (E2-S10), locale trong URL.

## Hành vi hiện tại đã quan sát

- Không có chặn theo role ở bất kỳ endpoint nào.
- `JwtAuthGuard` đọc `role`/`trustLevel` từ claim JWT, không tra DB. Access token TTL 900 giây. `POST /api/v1/auth/refresh` đọc lại role/trust từ DB rồi ký token mới — đây là nơi duy nhất đồng bộ role vào token.
- `GET /api/v1/auth/me` đọc thẳng DB nên luôn đúng thực tế.
- `apps/web-client-side/app/_lib/api.ts` là khuôn mẫu: access token giữ ở biến module, refresh cookie httpOnly path `/api/v1/auth`, refresh một lần rồi replay khi gặp 401, `ApiError` có `isOffline` / `isUnauthenticated`.
- `packages/i18n` có namespace `errors.auth.*` đủ cặp EN/VI và `message-keys.ts` sinh tự động.
- `packages/domain/src/trust.ts` + test là tiền lệ cho file quyền framework-free.

## Acceptance criteria

- **AC-1:** Không có Authorization → `GET /api/v1/admin/system/health` trả **401** `UNAUTHENTICATED` / `errors.auth.unauthenticated`.
- **AC-2:** Token của `member` → **403** (không 404, không 500), `code` ổn định mới + `messageKey` có EN/VI; body không liệt kê role được phép.
- **AC-3:** Token của `admin` → **200**, `data.checks` đúng ba khoá `database`, `redisCache`, `redisQueue` với giá trị `up`/`down`, có thời điểm kiểm tra.
- **AC-4:** Token của `super_admin` → **200**, cùng shape AC-3.
- **AC-5:** Token của `curator` hoặc `moderator` → **403**; sidebar không render mục "System health" cho hai role này.
- **AC-6:** Đổi `users.role` từ `member` sang `moderator` trong DB rồi gọi endpoint moderator bằng **access token cũ còn hạn** → vẫn **403** (claim chưa đổi; đúng thiết kế).
- **AC-7:** Cùng tài khoản, gọi `POST /api/v1/auth/refresh` (hoặc đăng nhập lại) rồi gọi bằng token mới → **200**. Đây là cách trình diễn đúng của S1-Demo-5 / M1-5.
- **AC-8:** Trang System health khi API không phản hồi (`isOffline`) → trạng thái lỗi rõ bằng i18n, có nút Thử lại; không màn trắng, không crash.
- **AC-9:** Trang System health phân biệt ba trạng thái có giao diện và key i18n riêng: All up · Degraded (nêu đúng dependency down) · Unreachable.
- **AC-10:** `member` đăng nhập ở web admin → không giữ access token, gọi ngay `POST /api/v1/auth/logout`, hiện thông báo từ chối bằng i18n, không render shell.
- **AC-11:** `curator`/`moderator`/`admin`/`super_admin` đăng nhập → thấy sidebar, header có tên hiển thị + nhãn role, landing overview; "System health" chỉ hiện cho `admin`/`super_admin`.
- **AC-12:** Sign out → gọi logout, xoá access token khỏi bộ nhớ, cookie `dnc_refresh` bị xoá, về màn đăng nhập; Back/reload không hiện lại dữ liệu console.
- **AC-13:** Đổi role bằng UPDATE SQL trực tiếp không sinh audit log — N/A có chủ đích, chờ story quản lý role có audit.
- **AC-14:** Mọi chuỗi mới ở màn đăng nhập, shell, System health (ba trạng thái) hiển thị đúng EN/VI, không lộ raw key; `en.json`/`vi.json` cập nhật cùng lúc.
- **AC-15:** Mọi trang của web admin (kể cả trang lỗi) có `robots: noindex, nofollow`.

## Hợp đồng

- Lỗi thiếu role dùng cùng envelope lỗi với `TRUST_LEVEL_TOO_LOW` (`code` + `messageKey` + `details` tuỳ chọn).
- Response admin health chứa nguyên nội dung `/health/ready` (không đổi tên field/giá trị) cộng phần thông tin cơ bản.
- `PERMISSION_MATRIX` là nguồn duy nhất cho cả API và web admin.

## Dữ liệu cá nhân

Không thu thập trường mới. Header chỉ hiện tên hiển thị + role của chính người đăng nhập, không hiện email/SĐT. Endpoint admin không trả PII. Không log token, mật khẩu.

## Câu hỏi mở (BA đề xuất mặc định — Tech Lead chốt)

1. Thông tin cơ bản của admin health: `environment`, `uptimeSeconds`, `checkedAt`.
2. HTTP khi degraded: admin endpoint trả 200 kèm `data.status` (khác public 503).
3. Mã lỗi 403: `ROLE_NOT_ALLOWED` (BA) hay `PERM_ROLE_REQUIRED` (doc 04 §6.3).
4. 2FA cho staff (doc 01 §8.3 bắt buộc, chưa có hạ tầng): chấp nhận nợ ở bước này — cần Founder xác nhận.
5. Vị trí `PERMISSION_MATRIX`: `packages/domain`.

## Rủi ro BA ghi nhận

- Thứ tự guard D-07 (doc 01 §15.1): trạng thái → role → quan hệ → trust.
- Tài khoản staff bị khoá vẫn dùng được access token cũ tới 15 phút (không có `AccountStatusGuard` per-request).
- Chưa có rate limit đăng nhập (E2-S10) — cổng staff là mục tiêu brute-force giá trị cao.
