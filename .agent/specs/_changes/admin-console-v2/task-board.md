# Task board: admin-console-v2 (Tech Lead, 01/10/2026)

Brief: [brief.md](brief.md) (D-*, A*-AC-*, Q-* dẫn theo brief). Khuôn: [discover-and-admin-overview/task-board.md](../discover-and-admin-overview/task-board.md). Song song với [social-interactions/task-board.md](../social-interactions/task-board.md). Q-1..Q-10 giữ mặc định BA, trừ Q-2, Q-5, Q-6 chốt ở mục 1.

**Quy ước chung mọi card:** DoD gồm (1) code, (2) test đúng lane, (3) `corepack pnpm --filter <pkg> typecheck` sạch, (4) ghi chú lệch brief vào thư mục spec, (5) log API không chứa `q`, email, phone, `reason`, nội dung. Lệnh API: `corepack pnpm --filter @dnc/api test -- <path>` (vitest, `e2e/` cần DB). Lệnh web: `corepack pnpm --filter @dnc/web-admin typecheck && corepack pnpm --filter @dnc/web-admin build`. Playwright là script Node ở scratchpad, Chromium + WebKit, 768/1280/1920 px, EN rồi VI (web-client: 390/1280).

## 1. Quyết định kỹ thuật

| # | Quyết định | Căn cứ |
|---|---|---|
| T-1 | **Route:** controller riêng theo chủ đề trong `modules/admin`: `admin-users.controller.ts`, `admin-events.controller.ts`, `admin-user-actions.controller.ts`, `admin-event-actions.controller.ts`, `admin-audit.controller.ts`, `admin-moderation.controller.ts` (không nhồi vào `admin.controller.ts:29-46` để hai card song song không đụng file). Mọi route `@Roles(...allowedRolesFor('<key>'))`. `admin.module.ts` do card BE đang chạy sở hữu (chuỗi BE tuần tự, mục 5). | admin.controller.ts:29-46 |
| T-2 | **Khoá quyền** (AD-0), thêm vào `PermissionKey` + `PERMISSION_MATRIX`, mỗi khoá một hằng `*_ROLES` export: `user.directory.view` {admin, super_admin}; `event.directory.view` {moderator, admin, super_admin}; `content.hide` {moderator, admin, super_admin}; `event.takedown` {admin, super_admin}; `user.suspend` {admin, super_admin}; `user.role.assign` {super_admin}; `audit_log.view` {moderator, admin, super_admin} (lọc hàng ở service, D-R12); `moderation.queue.view` {moderator, admin, super_admin}; `moderation.decide` {moderator, admin, super_admin}; `report.create` không vào matrix role (quyền theo `trust_level>=1` qua `@MinTrustLevel(1)`; ghi `docRef` để web biết). Ràng buộc theo hàng (admin không khoá admin, moderator giới hạn 30 ngày) ở service, không đổi matrix. `packages/domain/src/index.ts` liệt kê export tường minh nên AD-0 sửa file này. | permission-matrix.ts:33-45; domain/index.ts |
| T-3 | **Cursor:** codec riêng admin `admin-cursor.ts` (AD-2 tạo, AD-3/AD-7/AD-15 dùng chung): base64url của `{s: sort, d: dir, v: giá trị cột (null được), id}`, giải mã sai hoặc `s/d` lệch query → 400 `ADMIN_CURSOR_INVALID` (`errors.admin.cursorInvalid`). Lấy `limit+1` để biết `nextCursor`, không COUNT. `lastActiveAt`: `ORDER BY (col IS NULL), col DIR, id DIR` (NULL cuối cả hai hướng), vị từ keyset có nhánh NULL riêng. Query sai (tham số lạ, `trustMin=7`, `limit=500`, `status=archived`, `from>=to`) → 400 `ADMIN_QUERY_INVALID` (`errors.admin.queryInvalid`) qua pipe riêng của module admin (không dùng dạng `{message:[...]}` mặc định, vì AC cần `messageKey`). Mảng truyền dạng CSV (`role=moderator,admin`) khớp A2-AC-2. | brief C-2, C-3, A2-AC-10 |
| T-4 | **Che PII ở server:** `apps/api/src/modules/admin/admin-mask.ts` (hàm thuần, unit test): `emailMasked` = ký tự đầu + `***` + `@` + miền (khớp `^.\*{3}@.+$`), `phoneMasked` = `*** *** ` + 3 số cuối. Mapper allow-list (`@SerializeOptions` + schema `.strict`-style, test duyệt JSON tìm khoá cấm). Tìm kiếm: email và phone **khớp chính xác** (`lower(email)=lower($q)`; phone qua `normalizePhone` của `@dnc/domain`, so với cột đã chuẩn hoá), UUID khớp `id`, còn lại handle tiền tố / `display_name` chứa với `escapeLike`. BE kiểm `EXPLAIN` cho `lower(email)` (nếu seq scan ở beta thì ghi chú, không thêm index trong A1 vì card không có migration). | brief C-6, D-U3; 0008_identity.sql |
| T-5 | **Hiệu lực tức thì (Q-2, S-3): chọn deny-list Redis, không migration.** Sau commit của T1/T3 (và khi A4 khoá), ghi key `auth:revoked:{userId}` = `"<epochMs>:<kind>"` (`kind` = `suspended` hoặc `role`), TTL = 16 phút (access TTL 15 phút + 60 giây). Kiểm đặt **trong `AuthService.verifyAccessToken`** (không phải `JwtAuthGuard`) nên `ChatGateway` cũng được bảo vệ. Token bị từ chối khi `claims.iat*1000 <= epochMs`: `suspended` → 403 `ACCOUNT_NOT_ACTIVE` (`errors.auth.accountSuspended`), `role` → 401 `UNAUTHENTICATED`. So `iat` thay vì "có key là chặn" để người được mở khoá/đổi role đăng nhập lại ngay vẫn dùng được token mới. `AccessTokenClaims` hiện **không có `iat`** (auth.service.ts:301-305): AD-7 thêm từ `payload.iat`. Chi phí: 1 Redis GET mỗi request có token, timeout 300 ms, **fail-open + log warn** (cùng triết lý `RateLimitService`; khi Redis chết trần trễ là 15 phút, bù bằng việc refresh token đã bị thu hồi trong DB). Ghi key hỏng sau commit chỉ log `error`, không rollback. Đồng thời thu hồi phiên: `AuthService.revokeAllSessionsForUser(userId, reason, tx)` (bọc `AuthRepository`, thêm hàm `revokeAllForUser` cạnh auth.repository.ts:179-198; module admin chỉ gọi qua `AuthService` export, không import repository của auth). | jwt-auth.guard.ts:52-66; auth.service.ts:295-312 |
| T-6 | **Audit:** module mới `apps/api/src/modules/audit` (`AuditModule` export `AuditService.record(tx, input)` + `AuditRepository`); một bảng `audit_logs` duy nhất (Social S2-5 import `AuditModule` từ `CommentModule`). `AdminModule` import `AuditModule` và `AuthModule` nên **không phải sửa `app.module.ts`** ở A3. Thao tác ghi dùng `withTransaction` (`common/db/transaction.ts`): `SELECT ... FOR UPDATE` đích, kiểm luật, `UPDATE ... WHERE status=<nguồn>` (0 hàng → 409 `errors.admin.invalidTransition`, D-R7), `AuditService.record`, thu hồi phiên. Khoá đồng thời `super_admin`: `pg_advisory_xact_lock` hằng số trước khi đếm (INV-3). `request_id` lấy từ request; `ip`/`user_agent` ghi vào DB nhưng không đưa ra API (D-R13). | brief D-R7, D-R8, D-R14 |
| T-7 | **Bất biến audit/moderation (D-R14, D-M13):** trigger như 0009, nhưng **không FK** từ `audit_logs` và `moderation_actions` sang `users` (uuid thường): `ON DELETE SET NULL` sẽ phát UPDATE nội bộ bị trigger chặn (đúng cảnh báo ở 0009). Teardown e2e dùng `TRUNCATE` (trigger DELETE chặn `DELETE FROM`, TRUNCATE không bị guard, giống ghi chú 0009). | 0009_trust_signals.sql header |
| T-8 | **A4 giữ `moderation_cases`** (BA nghiêng giữ; cần cho gộp trùng và COI). `uq_moderation_cases_open_target` là cơ chế gộp: `INSERT ... ON CONFLICT (target_type, target_id) WHERE status IN (...) DO UPDATE SET report_count=report_count+1, severity=<max theo thứ tự enum>, sla_due_at=LEAST(...)` trong một transaction cùng chèn `reports` (đua hai người báo cùng target chỉ ra một case). Thêm `content_removed` và `case_id` nullable cho `moderation_actions` (Q-6 duyệt). Trigger COI mở rộng cả `assigned_to_user_id` (D-M10), dùng `events.organizer_id` (S-8). Enum `report_reason_enum` đủ **30 giá trị** ở doc 05:1543-1551 (comment "28" trong doc sai). | brief S-1, S-8; doc 05 §13.2 |
| T-9 | **Khoá có hạn hết hạn (D-M12):** job BullMQ lặp mỗi 1 phút (`moderation:expire-suspensions`, queue tên mới, không chạm queue cũ) gọi `expireDueSuspensions()` (UPDATE có điều kiện + audit `actor_type='job'`); cùng hàm đó gọi lười ở `assertUsable` khi đăng nhập/refresh để không phụ thuộc job. BE xác nhận bootstrap BullMQ hiện có (health có `redisQueue`); chưa có thì dựng module tối thiểu trong AD-15. | auth.service.ts:324-330 |
| T-10 | **Rate limit báo cáo:** `RateLimitService` reserve-first, key `rl:report:{uid}` cửa sổ ngày (T1 5, T2 10, T3-T5 20); hằng số thêm vào `rate-limit.config.ts` (AD-14, sau S2-2/S3-1/S4-1 đã sửa file này). | D-M15 |
| T-11 | **Không thêm dependency.** Bảng, select, phân trang, hộp thoại, tabs tự viết theo token (AD-4). Không COUNT tổng. Không phân vùng `audit_logs` (Q-5: vài chục dòng/ngày, hoãn đến khi đo; khi cần phân vùng sẽ viết lại bảng, rủi ro R-9 đã chấp nhận). | brief R-9 |
| T-12 | **Console đọc cache:** không cache (C-8). Đọc audit **không** ghi audit. | brief C-8 |
| T-13 | **Hợp đồng nút báo cáo cho Social:** thành phần `ReportButton` (`apps/web-client-side/app/(shell)/_components/report/report-button.tsx`) props `{ targetType: 'event'\|'post'\|'comment'\|'user', targetId: string, ownerUserId?: string }`: ẩn khi `ownerUserId` là chính viewer; guest → `requireAuth`; T0 → thông báo xác minh email. Social **không** tự dựng nút; AD-18 gắn vào post/comment/profile sau khi các card Social đó commit. | brief D-M16, §10.7 |

## 2. Hợp đồng

### 2.1 API (tất cả dưới `api/v1`, body lỗi phẳng `{code, messageKey, details?}`)

| Method path | Quyền (khoá) | Ghi chú |
|---|---|---|
| `GET /admin/users` | `user.directory.view` | query: `q, role, status, trustMin, trustMax, joinedFrom, joinedTo, includeDeleted, sort(createdAt\|lastActiveAt\|trustLevel\|handle), dir, cursor, limit(<=100, mặc định 25)` → `{items[], nextCursor}` theo D-U6/§7.2 |
| `GET /admin/users/:id` | `user.directory.view` | khối D-U7..U11, mỗi list `{items,total}`; 404 `USER_NOT_FOUND`; id không UUID → 400 |
| `GET /admin/events` | `event.directory.view` | query D-E4..E6 (`timing=all\|upcoming\|past`); `draft` chỉ khi `status=draft` và khi đó các trường `areaId/startsAt/endsAt/capacity/seatsTaken/waitlistWaiting` = `null` (contract nullable) |
| `GET /admin/events/:id` | `event.directory.view` | D-E8, mọi occurrence + số liệu gộp; draft: `description:null`, không toạ độ, `occurrences:[]`; 404 `EVENT_NOT_FOUND` |
| `POST /admin/users/:id/suspend` / `unsuspend` | `user.suspend` | body `{reason, confirm:true}` → 200 `{id, status, role}` |
| `POST /admin/users/:id/role` | `user.role.assign` | body `{role: member\|curator\|moderator\|admin, reason, confirm:true}` → 200 `{id, role}` |
| `POST /admin/events/:id/suspend` / `restore` | `content.hide` | body `{reason, confirm:true}` → 200 `{id, status}` |
| `POST /admin/events/:id/takedown` | `event.takedown` | như trên |
| `GET /admin/audit-logs` | `audit_log.view` | query D-R13; lọc hàng ở service: moderator `actor_user_id=self`; admin loại `actor_role_at_time='super_admin'`; không `ip/userAgent` |
| `POST /reports` | `@MinTrustLevel(1)` | header `Idempotency-Key` (uuid) bắt buộc; body `{targetType, targetId, reasonGroup, description?}` → 201 `{reportId, status}` |
| `GET /reports/mine` | login | `{items:[{id,targetType,createdAt,status: received\|reviewing\|action_taken\|no_action}], nextCursor}` |
| `GET /admin/moderation/queue` | `moderation.queue.view` | query D-M8; trả thêm `kpis{open,overdue,critical}` |
| `GET /admin/moderation/cases/:caseNumber` | `moderation.queue.view` | D-M9; COI → 404 |
| `POST /admin/moderation/cases/:caseNumber/assign` | `moderation.queue.view` | admin+ gán người khác qua body `{assigneeId?}` |
| `POST /admin/moderation/cases/:caseNumber/severity` | `moderation.decide` | `{severity, reasonNote}` |
| `POST /admin/moderation/cases/:caseNumber/decide` | `moderation.decide` | `{actionType: no_action\|content_hidden\|content_removed\|warning\|suspended, reasonCode(30), reasonNote(>=20), expiresAt?, confirm:true}` |

Mã lỗi mới (thứ tự kiểm cho thao tác A3: reason sai → `errors.admin.reasonRequired` trước, rồi `confirm` thiếu → `confirmationRequired`): `ADMIN_CURSOR_INVALID`, `ADMIN_QUERY_INVALID`, `ADMIN_REASON_REQUIRED` (400), `ADMIN_CONFIRMATION_REQUIRED` (400), `ADMIN_SELF_ACTION` (403), `ADMIN_TARGET_ROLE_PROTECTED` (403), `ADMIN_CONFLICT_OF_INTEREST` (403), `ADMIN_TRUST_TOO_LOW` (409), `ADMIN_LAST_SUPER_ADMIN` (409), `ADMIN_INVALID_TRANSITION` (409), `ADMIN_DURATION_TOO_LONG` (400), `REPORT_OWN_CONTENT` (400), `REPORT_ALREADY_REPORTED` (409), `REPORT_TARGET_UNAVAILABLE` (409), `REPORT_IDEMPOTENCY_REQUIRED` (400), `TRUST_LEVEL_TOO_LOW` (403, sẵn có), 429 `RATE_LIMIT_EXCEEDED` (sẵn có; brief ghi `RATE_LIMITED`, dùng mã sẵn có để web không phải xử lý hai mã). `messageKey` dạng `errors.admin.*` / `errors.report.*` đúng bảng i18n brief.

### 2.2 `packages/contracts` (additive, file mới + dòng export)
- AD-1: `admin-users.ts` (`AdminUserListQuery`, `AdminUserListResponse`, `AdminUserDetailResponse`), `admin-events.ts` (`AdminEventListQuery/Response`, `AdminEventDetailResponse`), `admin-actions.ts` (`ReasonedActionBody` = `{reason: trim 20..255, confirm: literal(true)}`, `ChangeRoleBody`, `AdminActionResult*`), `admin-audit.ts` (`AdminAuditListQuery/Response`, `AuditAction` regex `^[a-z_]+\.[a-z_0-9]+$`, `AuditSeverity`), + `test/admin-contracts.spec.ts`.
- AD-13: `report.ts` (`ReportReasonGroup` 12, `ReportReason` 30, `CreateReportBody`, `MyReportsResponse`), `admin-moderation.ts`.
- Không đổi/xoá trường cũ; web/mobile cũ không vỡ.

### 2.3 UI
Route console (không tiền tố `/admin`, S-6): `/users`, `/users/[id]`, `/events`, `/events/[id]`, `/audit-log`, `/moderation`, `/moderation/[caseNumber]`. Trạng thái bảng trong URL (C-5). Nút thao tác chỉ tồn tại trong DOM khi đủ quyền và đúng trạng thái (D-R16). Key i18n: toàn bộ ở AD-I (mục 3). Web-client: `safety.*` + route `/me/reports`.

## 3. Task cards

Owner viết tắt: BE = backend-agent, WA = web-admin-agent, WC = web-client-agent.

### Pha nền (không migration)

**AD-0** — Khoá quyền (domain)
- Owner: BE. Allowed: `packages/domain/src/permission-matrix.ts`, `packages/domain/src/index.ts`, `packages/domain/test/permission-matrix.spec.ts`. Do not edit: contracts, i18n, app.
- Goal: T-2 cho cả A1-A4 một lần. Dependencies: none. Parallel: với SH-1 và AD-4.
- Acceptance: bảng quyền brief §2. Test lane: **unit** (ma trận 5 vai x 9 khoá; `allowedRolesFor` ném khi khoá lạ).
- DoD: `corepack pnpm --filter @dnc/domain test` + `typecheck`; `corepack pnpm -r typecheck` không gãy app nào.
- Risk: thấp. Chạm `domain/index.ts` trước S3-1 (T3 của Social).

**AD-1** — Contracts A1-A3
- Owner: BE. Allowed: `packages/contracts/src/admin-users.ts`, `admin-events.ts`, `admin-actions.ts`, `admin-audit.ts` (mới), `packages/contracts/src/index.ts`, `packages/contracts/test/admin-contracts.spec.ts`. Do not edit: `admin.ts`, `event.ts`, `post.ts`, `comment.ts`, `chat.ts`, `profile.ts`.
- Goal: mục 2.2 AD-1; allow-list `.omit`-free (liệt kê trường, không kế thừa schema có email). Dependencies: **SH-1 đã commit** (cùng `index.ts`). Nối tiếp bắt buộc.
- Test lane: **unit** (parse hợp lệ/không hợp lệ; `reason` 19/20/255/256 ký tự; `confirm:false`; schema detail loại `email`, `phone`, `birthYear`, `ip` khi parse object thừa).
- DoD: `corepack pnpm --filter @dnc/contracts test` + `typecheck`, rồi `corepack pnpm -r typecheck` xanh (additive).
- Risk: lệch với `SEAT_OCCUPYING` trong `event.ts` nếu tự định nghĩa lại: phải import.

**AD-I** — Key i18n Admin (gom A1-A4)
- Owner: WA. Allowed: `packages/i18n/messages/en.json`, `vi.json`, `packages/i18n/src/message-keys.ts`. Do not edit: mọi thứ khác. **Nối tiếp sau SH-2 đã commit.**
- Goal: toàn bộ key brief §7.4, §8.4, §9.6, §10.5 (`admin.*`, `errors.admin.*`, `errors.report.*`, `safety.report.*`, `safety.myReports.*`, `role.member.label`), cộng key còn thiếu: nhãn lý do `admin.moderation.reason.*` (30 mã), hint của mọi `MetricHint` (`admin.users...`/`admin.events.detail.seatsTaken.hint`/`admin.moderation.kpi.*Hint`: nêu đếm gì, tính thế nào, cạm bẫy), `admin.moderation.sla.dueSoon`, `admin.users.status.*`, `admin.audit.action.*` đủ 6 hành động. EN và VI cùng commit, không xoá key cũ.
- Dependencies: SH-2 (Social). Parallel: với AD-2.
- Test lane: **unit** (parity key EN/VI; script kiểm key chứa ký tự nháy/brace hỏng) + kiểm tay VI có dấu.
- DoD: `corepack pnpm --filter @dnc/i18n test` (hoặc script parity), `typecheck` mọi app.
- Risk: `message-keys.ts` xung đột merge: do nối tiếp. Chuỗi `{count}`/`{time}`/`{value}` phải khớp biến ở UI.

**AD-2** — API A1: người dùng
- Owner: BE. Allowed: `apps/api/src/modules/admin/admin-users.{controller,service,repository,mapper}.ts` (mới), `admin-cursor.ts`, `admin-mask.ts`, `admin-query.pipe.ts` (mới), `admin.module.ts`, `index.ts`, `apps/api/e2e/modules/admin/_fixtures.ts` (mới: dựng 5 vai, user T3, user có sự kiện/RSVP/bài/phiên), `admin-users.e2e.spec.ts`, `admin-mask.spec.ts`, `admin-cursor.spec.ts` (mới). Do not edit: `admin.controller.ts`, `admin.repository.ts` (đã có overview), `packages/**`, auth, SQL.
- Goal: `GET /admin/users`, `GET /admin/users/:id` theo 2.1, T-3, T-4. Module không import repository của module khác (đọc SQL trực tiếp như `admin.repository.ts:82-90`). Dependencies: AD-0, AD-1.
- Acceptance: A1-AC-1..14 (phía API), 12, 13.
- Test lane: **integration** (DB thật; ma trận 5 vai + 401) + unit (mask, cursor).
- DoD: e2e: 30 user → 25 + `nextCursor`, đúng 25 → `nextCursor:null`, sửa ký tự/đổi sort giữ cursor → 400 `cursorInvalid`; tìm `anna`, `müll`, email đủ/hoa thường, `anna.m@gm` và `gmail` không ra; `%` `_` theo nghĩa đen; biên `joinedTo` exclusive; `includeDeleted`; NULL `lastActiveAt` cuối ở cả `asc/desc`; JSON không chứa `email, phone, passwordHash, ip, userAgent, birthYear, gender, deviceId, tokenHash, metadata` (duyệt đệ quy); log không chứa `q`; không bảng nào bị ghi. Lệnh: `corepack pnpm --filter @dnc/api test -- e2e/modules/admin src/modules/admin`, full `test`, `typecheck`.
- Risk: user thiếu `profiles` (bỏ hàng + warn không PII); `lower(email)` quét bảng (EXPLAIN, ghi lại); keyset NULL sai thứ tự là lỗi hay gặp, cần ca thử.

**AD-3** — API A2: sự kiện
- Owner: BE. Allowed: `apps/api/src/modules/admin/admin-events.{controller,service,repository,mapper}.ts` (mới), `admin.module.ts` (nối tiếp AD-2), `apps/api/e2e/modules/admin/admin-events.e2e.spec.ts`. Do not edit: `admin-users.*`, `admin-cursor.ts` (chỉ import), contracts, module event/rsvp.
- Goal: `GET /admin/events` (+`:id`) theo 2.1. Số liệu theo occurrence bằng một truy vấn gộp (không N+1), `seatsTaken` dùng đúng tập `SEAT_OCCUPYING` từ contracts. Danh sách dùng occurrence sớm nhất chưa xoá; chi tiết liệt kê mọi occurrence. Dependencies: AD-2.
- Acceptance: A2-AC-1..10, 12, 13, 14 (API).
- Test lane: **integration** (5 vai: curator/member 403) + regression `corepack pnpm --filter @dnc/api test` full.
- DoD: e2e: 6 trạng thái (không draft mặc định); `status=draft` redacted; A2-AC-5 số liệu 6/1/3/2 → `seatsTaken=7`, `waitlistWaiting=3`; `timing` đúng giờ hiện tại (đồng hồ có điều khiển); sự kiện 2 occurrence; biên `startsTo` exclusive; JSON không có tên người tham gia. Lệnh như AD-2.
- Risk: **múi giờ/biên nửa đêm** (API chỉ nhận UTC; biên kiểm bằng chuỗi `...T17:00:00.000Z`); sự kiện lặp (OCCURRENCE_JOIN chỉ đúng khi 1 occurrence, S-14); `draft` lộ nội dung.

**AD-4** — Bộ UI bảng dùng chung (web-admin)
- Owner: WA. Allowed: `apps/web-admin-side/app/_components/ui/{data-table,select,pagination,dialog,tabs,filter-bar}.tsx` (mới), `ui/index.ts`, `apps/web-admin-side/app/_lib/list-query.ts` (hook đọc/ghi query string, `cursor` đẩy vào URL), `app/_lib/api.ts` (chỉ thêm `export` cho `call`/`CallInit`). Do not edit: `(console)/**`, `packages/**`.
- Goal: component tự viết theo token (không dependency): `DataTable` (cột sắp xếp có `aria-sort`, hàng đầu dính, cuộn ngang trong khung, trạng thái skeleton/error/empty), `Select` đa chọn, `Pagination` (Next/Previous bằng cursor), `Dialog` (focus trap, Esc, nút ≥ 44 px), `Tabs`. Chuỗi hiển thị nhận qua props (không hard-code). Dependencies: none (chạy ngay, không cần i18n).
- Acceptance: nền cho A1-AC-16, A3-AC-22. Test lane: **screen** (một trang thử tạm hoặc kiểm bằng AD-5; Playwright 768/1280/1920) + typecheck/build.
- DoD: `typecheck && build` của `@dnc/web-admin`; bàn phím điều khiển được `DataTable` header, `Select`, `Dialog`; không cuộn trang khi bảng rộng.
- Risk: `api.ts` là file chung của web-admin: card này là **người duy nhất** sửa nó (mọi hàm API sau nằm file riêng `_lib/users-api.ts`, `events-api.ts`, `actions-api.ts`, `audit-api.ts`, `moderation-api.ts`).

**AD-5** — Web A1: `/users`, `/users/[id]`
- Owner: WA. Allowed: `apps/web-admin-side/app/(console)/users/**` (mới), `app/_lib/users-api.ts` (mới), `app/_components/shell/sidebar.tsx` (thêm mục Users, nối tiếp), `app/_lib/roles.ts` nếu cần. Do not edit: `ui/**` (đã AD-4; nếu thiếu thì ghi lại xin nối tiếp), `packages/**`, `api.ts`.
- Goal: D-U6 bảng + lọc + sắp xếp + cursor; chi tiết D-U7..U11; `MetricHint` cho số tổng hợp (rule `dashboard-metric-tooltips`); `RequireRole` + không gọi API khi thiếu quyền; sidebar lọc bằng `allowedRolesFor('user.directory.view')`. Dependencies: AD-2, AD-4, AD-I.
- Acceptance: A1-AC-1..11, 12 (DOM), 15, 16.
- Test lane: **screen** (Playwright Chromium + WebKit, 768/1280/1920, EN + VI, trạng thái loading/data/empty/error/forbidden; assert network khi moderator gõ `/users`).
- DoD: kịch bản: lọc/tải lại giữ URL; Next/Back; cursor sai → "The list changed..."; `<script>` trong tên hiện chữ; không key thô ở VI; `typecheck && build`.
- Risk: `sidebar.tsx` do chuỗi WA sở hữu tuần tự (AD-5 → AD-6 → AD-10 → AD-16); chuỗi VI dài làm gãy thanh lọc.

**AD-6** — Web A2: `/events`, `/events/[id]`
- Owner: WA. Allowed: `apps/web-admin-side/app/(console)/events/**` (mới), `app/_lib/events-api.ts` (mới), `app/_components/shell/sidebar.tsx` (thêm Events, nối tiếp AD-5). Do not edit: `users/**`, `ui/**`, `api.ts`, `packages/**`.
- Goal: D-E7 bảng, chi tiết D-E8 (mọi occurrence, số liệu, không tên người tham gia, "Full", "In progress"), host là link `/users/[id]` **chỉ khi** role có `user.directory.view`. Dependencies: AD-3, AD-5 (dùng chung mẫu), AD-4.
- Acceptance: A2-AC-1..17.
- Test lane: **screen** như AD-5; DoD thêm A2-AC-16 (focus `?` của "Seats taken" ra tooltip EN/VI).
- Risk: nhãn khu theo locale từ `_lib/areas.ts` (chỉ 6 khu); `draft` redacted không được vẽ trang trắng.
- **Tester gate sau AD-2/3/5/6** (A1+A2 không migration).

### Pha A3

**AD-7** — API A3 hạ tầng: migration 0010, audit, deny-list, thu hồi phiên, danh sách audit
- Owner: BE. Allowed: `apps/api/src/database/sql/0010_audit_logs.sql` (mới), `apps/api/src/modules/audit/**` (mới), `apps/api/src/modules/auth/auth.service.ts`, `auth.repository.ts`, `auth.module.ts` (export), `apps/api/src/modules/admin/admin-audit.{controller,service,repository,mapper}.ts` (mới), `admin.module.ts` (nối tiếp), e2e `apps/api/e2e/modules/audit/audit-immutable.e2e.spec.ts`, `apps/api/e2e/modules/admin/admin-audit.e2e.spec.ts`, `apps/api/e2e/modules/auth/auth-revocation.e2e.spec.ts` (mới). Do not edit: `jwt-auth.guard.ts`, `app.module.ts`, contracts, web, `rate-limit/**`.
- Goal: DDL mục 7.1; T-5 (thêm `iat`, deny-list, `revokeAllSessionsForUser`); `AuditService.record`; `GET /admin/audit-logs` (D-R12 lọc theo vai, D-R13). Dependencies: AD-1 (contracts audit), AD-3 (chuỗi `admin.module.ts`). **DDL phải được chủ dự án duyệt trước khi áp lên DB.**
- Acceptance: A3-AC-18, A3-AC-19, A3-AC-20, A3-AC-2 (cơ chế).
- Test lane: **integration** (áp `0010` trên DB local đã có dữ liệu của các bảng khác; `UPDATE reason`/`DELETE` bằng chính role API → lỗi, `UPDATE ip=NULL` được) + auth regression `corepack pnpm --filter @dnc/api test -- e2e/modules/auth`.
- DoD: e2e: moderator/admin/super_admin thấy đúng tập dòng; lọc `action`, `severity`, khoảng ngày (exclusive `to`); không `ip/userAgent` trong JSON; deny-list: token cũ `iat <= ts` bị từ chối, token mới sau đó dùng được; Redis lỗi → fail-open + log; **rollback**: `DROP TABLE audit_logs; DROP FUNCTION audit_logs_guard_update, audit_logs_guard_delete;` chạy sạch trên DB thử, kết quả ghi vào báo cáo. Lệnh: `corepack pnpm --filter @dnc/api test -- e2e/modules/audit e2e/modules/admin e2e/modules/auth`, full `test`, `typecheck`.
- Risk: **cao**: sửa đường xác thực lõi (mọi request); thêm 1 Redis GET/req; test teardown dùng `TRUNCATE`. Sau khi bảng có dữ liệu thật thì rollback bằng DROP không còn dùng được (giữ theo luật lưu trữ, cần luật sư xác nhận, brief §13).

**AD-8** — API A3: thao tác người dùng (T1-T3)
- Owner: BE. Allowed: `apps/api/src/modules/admin/admin-user-actions.{controller,service,repository}.ts` (mới), `admin.module.ts` (nối tiếp), `apps/api/e2e/modules/admin/admin-user-actions.e2e.spec.ts`. Do not edit: `admin-users.*`, `modules/audit/**` (chỉ gọi), `packages/**`.
- Goal: D-R1..R5, R7..R11, R15 cho `suspend/unsuspend/role` (T-6: một transaction + khoá hàng + advisory lock INV-3; audit `severity` theo D-R10; `suspension_reason` = reason, `suspended_until` NULL). Dependencies: AD-7.
- Acceptance: A3-AC-1..4, 7..13, 16, 17 (user), 20.
- Test lane: **integration** (ma trận 5 vai cho 3 route) + đua `Promise.all` hai admin khoá cùng user (1x200, 1x409, đúng 1 dòng audit).
- DoD: e2e: reason 19/256/trắng → 400 và 0 dòng audit; thiếu `confirm` → 400; tự khoá 403; admin khoá admin/super_admin 403; admin gọi `/role` 403 `ROLE_NOT_ALLOWED`; cấp `super_admin`/hạ `super_admin` → `invalidTransition`; hai `super_admin` khoá nhau → `lastSuperAdmin`; T2 nâng lên moderator 409 `trustTooLow`; đích `suspended` đổi role 409; token cũ sau khoá → 403 `ACCOUNT_NOT_ACTIVE`, `POST /auth/refresh` bị từ chối, `auth_sessions.revoked_at` set; đổi role → token cũ 401; ép lỗi `AuditService` → toàn bộ rollback (status, phiên). Lệnh: `corepack pnpm --filter @dnc/api test -- e2e/modules/admin`, full `test`, `typecheck`.
- Risk: **quyền/trust_level**; hiệu lực tức thì phụ thuộc Redis (fail-open); fixture user T3 (tài khoản seed ở T0 không nâng role được, R-10).

**AD-9** — API A3: thao tác sự kiện (T4-T6)
- Owner: BE. Allowed: `apps/api/src/modules/admin/admin-event-actions.{controller,service,repository}.ts` (mới), `admin.module.ts` (nối tiếp AD-8), `apps/api/e2e/modules/admin/admin-event-actions.e2e.spec.ts`. Do not edit: module `event`/`rsvp`, `packages/**`.
- Goal: D-R6 (`UPDATE events SET status=... WHERE id=$1 AND status = ANY(nguồn)`; `organizer_id = actor` với moderator → 403 `conflictOfInterest`; `draft`/`cancelled`/`taken_down` → 409). Dependencies: AD-8.
- Acceptance: A3-AC-5, 6, 14, 15, 16, 17 (event).
- Test lane: **integration** + regression RSVP (sự kiện `suspended`: RSVP mới bị từ chối, RSVP cũ giữ `confirmed`, `GET /events` không còn sự kiện; xác nhận `rsvp.service.ts:65`).
- DoD: e2e ma trận 5 vai (moderator không takedown); đua hai thao tác; audit `before/after` chỉ `{status}`; mỗi thành công đúng 1 dòng, mỗi 4xx 0 dòng.
- Risk: **đồng thời RSVP/sức chứa** (ẩn sự kiện trong lúc có RSVP đang giữ chỗ: không đổi `rsvps`, chỉ kiểm hành vi); quyền theo hàng; `taken_down` không đảo ngược.

**AD-10** — Web: `/audit-log`
- Owner: WA. Allowed: `apps/web-admin-side/app/(console)/audit-log/**` (mới), `app/_lib/audit-api.ts` (mới), `sidebar.tsx` (nối tiếp AD-6). Do not edit: `ui/**`, `users/**`, `events/**`, `api.ts`.
- Goal: D-R13 bảng, lọc, mở rộng `before → after`, dòng thông báo phạm vi (`admin.audit.scope.*`), nhãn hành động qua i18n. Dependencies: AD-7, AD-I, AD-6. Parallel: với AD-8.
- Acceptance: A3-AC-19, 21, 22 (phần trang).
- Test lane: **screen** (3 tài khoản moderator/admin/super_admin thấy tập khác nhau; EN+VI).
- DoD: `typecheck && build`; không key thô cho 6 hành động; ngày theo `Asia/Ho_Chi_Minh`.
- Risk: dữ liệu `reason` do staff nhập hiển thị nguyên văn (chữ thuần).

**AD-11** — Web: hộp thoại hai bước + nút ở `/users/[id]`
- Owner: WA. Allowed: `apps/web-admin-side/app/_components/action-dialog/**` (mới: `ActionDialog` hai bước, đếm ký tự, gõ lại định danh), `app/_lib/actions-api.ts` (mới), `(console)/users/[id]/**` (thêm nút, nối tiếp AD-5). Do not edit: `events/**`, `ui/**`, `api.ts`.
- Goal: D-R2, D-R16 (nút chỉ có trong DOM khi đủ quyền + trạng thái), lỗi dùng `messageKey` của server, UI "Nothing was changed" khi lỗi giữa chừng. Dependencies: AD-8, AD-10 (không bắt buộc), AD-I, AD-5.
- Acceptance: A3-AC-1..4 (UI), 7, 16, 17 (DOM), 21, 22.
- Test lane: **screen** (admin: có Suspend, không Change role; super_admin: có cả hai; bước 2 gõ lại handle cho T3 và T1 với staff; 768 px nút ≥ 44 px, không cuộn ngang).
- Risk: lạc hậu giữa danh sách và API (race 409 phải hiện "Refresh and try again").

**AD-12** — Web: nút ở `/events/[id]` + tab "History"
- Owner: WA. Allowed: `apps/web-admin-side/app/(console)/events/[id]/**` (nối tiếp AD-6), `app/_lib/audit-api.ts` (thêm hàm, nối tiếp AD-10). Do not edit: `action-dialog/**` (chỉ import), `users/**`.
- Goal: Suspend/Restore (moderator+), Take down (admin+, gõ lại slug, "cannot be undone"); tab History lọc `entityType=event&entityId`. Dependencies: AD-9, AD-11.
- Acceptance: A3-AC-5, 6, 14 (UI), 17 (DOM moderator không Take down).
- Test lane: **screen**. **Tester gate sau A3** (AD-7..12).

### Pha A4

**AD-13** — Contracts A4 + hàm SLA dùng chung
- Owner: BE. Allowed: `packages/contracts/src/report.ts`, `admin-moderation.ts` (mới), `packages/contracts/src/index.ts`, `packages/contracts/test/report-contracts.spec.ts`, `packages/domain/src/moderation.ts` (mới: `severityForReasonGroup` theo D-M4, `slaDueAt(severity, from)`, `slaState`, `maxSeverity`), `packages/domain/src/index.ts`, `packages/domain/test/moderation.spec.ts`. Do not edit: file contracts cũ, i18n.
- Goal: mục 2.2 AD-13; hàm thuần nhận `Date` (UTC), SLA đồng hồ thật 24/7 (D-M5). Dependencies: AD-12 (hết chuỗi A3), **S3-1 và các card Social chạm `index.ts` đã commit** (cùng file). Nối tiếp bắt buộc.
- Test lane: **unit** (biên SLA ±1 giây, `max` theo thứ tự enum, `severityForReasonGroup` đủ 12 nhóm).
- DoD: `corepack pnpm --filter @dnc/contracts test`, `corepack pnpm --filter @dnc/domain test`, `corepack pnpm -r typecheck`.
- Risk: bảng nhóm-lý-do → mức cần Founder duyệt (Q-4) trước AD-14 vì `critical` kích hoạt ẩn tự động.

**AD-14** — API: migration 0012 + module `report` (tạo/gộp báo cáo)
- Owner: BE. Allowed: `apps/api/src/database/sql/0012_moderation.sql` (mới), `apps/api/src/modules/report/**` (mới), `apps/api/src/app.module.ts` (**chỉ thêm `ReportModule`**, sau S4-1), `apps/api/src/common/rate-limit/rate-limit.config.ts` (chỉ thêm hằng `report`), `apps/api/e2e/modules/report/report.e2e.spec.ts`, `moderation-immutable.e2e.spec.ts`. Do not edit: `packages/**`, module post/comment/event (đọc SQL trực tiếp để snapshot, như mẫu `rsvp.repository.ts`).
- Goal: DDL mục 7.2 (đã chốt); `POST /reports` (Idempotency-Key, snapshot do server chụp D-M17, T-8 upsert case, `uq_reports_one_open` → 409, ẩn tự động `critical` cho event/post/comment trong cùng transaction D-M7: `events.status='suspended'` hoặc `posts/comments.status='hidden'`, `moderation_state`, `report_count`; audit `actor_type='system'`), `GET /reports/mine` (D-M14), rate limit T-10. Dependencies: AD-13, AD-7 (AuditModule), Founder duyệt D-M7/D-M4 và DDL 0012.
- Acceptance: A4-AC-1, 3, 4, 8, 9, 10, 11, 14, 15 (T0), 17 (report), 19.
- Test lane: **integration** (DB thật) + migration test: chạy `0012` trên DB có dữ liệu, rollback `DROP` theo thứ tự ngược.
- DoD: e2e: 2 request cùng `Idempotency-Key` → 1 dòng; hai người báo cùng target `Promise.all` → 1 case, `report_count=2`; thiếu header → 400; T0 → 403; tự báo 400; nội dung đã ẩn 409; bài `critical` biến khỏi `GET /posts` trong request; `/reports/mine` JSON không `caseId`, handle người bị báo cáo, moderator; `UPDATE/DELETE moderation_actions` bị trigger chặn, chỉ `revoked_*` đổi; `reason_note` 19 ký tự bị CHECK. Lệnh: `corepack pnpm --filter @dnc/api test -- e2e/modules/report`, full `test`, `typecheck`.
- Risk: **cao**: migration lớn nhất; ghi nhiều bảng cùng transaction; ẩn tự động bị lạm dụng (R-6); đụng module post/comment/event qua SQL (nếu Social đổi cột `status`/`moderation_state`, phải báo AD-14); tránh chạm hàng đợi BullMQ đang chạy (AD-14 không dùng queue).

**AD-15** — API: hàng đợi và quyết định kiểm duyệt + retrofit A3 + job hết hạn
- Owner: BE. Allowed: `apps/api/src/modules/admin/admin-moderation.{controller,service,repository,mapper}.ts` (mới), `admin.module.ts` (nối tiếp), `apps/api/src/modules/admin/admin-user-actions.service.ts`, `admin-event-actions.service.ts` (**chỉ** thêm chèn `moderation_actions` với `case_id` NULL trong cùng transaction, D-R17), `apps/api/src/modules/auth/auth.service.ts` (`assertUsable` gọi `expireDueSuspensions` lười), module/queue job `apps/api/src/modules/moderation-jobs/**` (mới), `apps/api/e2e/modules/admin/admin-moderation.e2e.spec.ts`. Do not edit: `modules/report/**` (AD-14), `packages/**`.
- Goal: queue D-M8 (sắp `severity` rồi `sla_due_at`, COI ẩn khỏi danh sách của người đó), detail D-M9, assign D-M10, severity, decide D-M11 (mọi hành động + `moderation_actions` + `audit_logs` + `moderation_state/report_count` một transaction; `suspended` có `expiresAt`, moderator ≤ 30 ngày chỉ `member`, đích staff 403; `event.takedown` cần admin+; no_action khôi phục nội dung auto-hidden), T-9 job. Dependencies: AD-14.
- Acceptance: A4-AC-2, 5, 6, 7, 12, 13, 15 (đua), 16, 17, 18.
- Test lane: **integration** (5 vai; đồng hồ giả cho SLA/expiry; hai moderator decide `Promise.all` → 1 thành công) + regression A3 (`corepack pnpm --filter @dnc/api test -- e2e/modules/admin` vẫn xanh sau retrofit).
- DoD: COI: chèn trực tiếp `resolved_by_user_id=<organizer>` bị trigger từ chối; đóng case khi rollback giữa chừng giữ nguyên nội dung và `moderation_actions`; job: `expires_at` qua → tài khoản `active` trong ≤ 5 phút và audit `actor_type='job'`; +31 ngày → 400 `durationTooLong`. Lệnh như trên + full `test`.
- Risk: **cao** (quyền theo hàng, COI, thao tác không đảo ngược `taken_down`/`removed`, job lặp mới trong BullMQ: tên queue riêng, đặt `jobId` cố định để không nhân bản lịch).

**AD-16** — Web A4 console: `/moderation`, `/moderation/[caseNumber]` + khối "Reports"
- Owner: WA. Allowed: `apps/web-admin-side/app/(console)/moderation/**` (mới), `app/_lib/moderation-api.ts` (mới), `sidebar.tsx` (nối tiếp AD-10), `(console)/events/[id]/**` và `(console)/users/[id]/**` (chỉ thêm khối "Reports" theo D-E9, nối tiếp AD-12/AD-11). Do not edit: `action-dialog/**` (dùng lại), `ui/**`, `api.ts`.
- Goal: dải KPI có `MetricHint` (AC-21), bảng queue, đếm ngược theo `Asia/Ho_Chi_Minh`, nhuộm đỏ quá hạn, chi tiết (snapshot cạnh trạng thái hiện tại, strike), nút quyết định theo quyền, hộp thoại tái dùng. Dependencies: AD-15, AD-I, AD-12.
- Acceptance: A4-AC-2, 5..7 (UI), 12, 16, 17 (sidebar), 20, 21, 22.
- Test lane: **screen** (moderator, admin, curator/member không thấy mục; COI không hiện; EN+VI; 768/1280/1920).
- Risk: đếm ngược dùng đồng hồ client lệch (lấy `now` từ `Date` + `slaDueAt` của server, không lưu chuỗi đã tính).

**AD-17** — Web-client: Report sheet + "My reports" + gắn vào sự kiện
- Owner: WC. **Chỉ sau G0 của web-client** và sau S3-2 (cùng `events/[id]/page.tsx`). Allowed: `apps/web-client-side/app/(shell)/_components/report/**` (mới: `report-button.tsx`, `report-sheet.tsx`), `app/_lib/report-api.ts` (mới, import `call` đã export bởi S2-3), `app/(shell)/me/reports/page.tsx` (mới), `app/(shell)/events/[id]/page.tsx` (**chỉ thêm một dòng import+render nút**, ghi rõ), `app/(shell)/_components/event-card.tsx` nếu cần menu (đang dirty/G0: đọc bản commit). Do not edit: `api.ts`, `discover/**`, `next.config.ts`, `community-post.tsx`, `packages/**`.
- Goal: D-M16: sheet, 12 lý do, khối gọi 113/115 trước mô tả khi chọn "danger", `Idempotency-Key` sinh một lần và tái dùng khi Retry, giữ chữ khi 429/lỗi mạng, T0 → hướng dẫn xác minh email, "My reports" 4 trạng thái. Dependencies: AD-14, AD-I, S2-3, S3-2, G0.
- Acceptance: A4-AC-1, 8, 9, 10, 14, 15 (T0), 16, 20, 22.
- Test lane: **screen** (Playwright Chromium + WebKit, 390/1280, EN+VI; guest/T0/T1/429/offline-retry; không cuộn ngang).
- Risk: đua với S3-2 trên `events/[id]/page.tsx` nếu không nối tiếp.

**AD-18** — Web-client: gắn `ReportButton` vào post/comment/hồ sơ
- Owner: WC. Sau G0, sau AD-17, S2-3, S2-4, S4-3. Allowed: `apps/web-client-side/app/(shell)/_components/community-post.tsx`, `app/(shell)/_components/comments/comment-item.tsx`, `app/(shell)/u/[handle]/page.tsx` (mỗi file chỉ thêm nút theo T-13). Do not edit: `report/**` (dùng lại), `api.ts`.
- Acceptance: A4-AC-1 cho post/comment/user, A4-AC-11 (ẩn nút trên nội dung của chính mình). Test lane: **screen**. Risk: chạm file Social đã hoàn tất; một dòng mỗi file, đọc bản commit.
- **Tester gate sau A4** (AD-13..18). Đây là cổng trước M6 mà Social R-1 đang chờ (Report cho bình luận/chat).

## 4. Thứ tự và song song (Admin tối đa 2 worker)

| Nhịp | Worker 1 (BE) | Worker 2 (Web/package) | Ghi chú đối chiếu Social |
|---|---|---|---|
| A-T0 | AD-0 | AD-4 | Social T0: S3-0 + SH-1. AD-0 sửa `domain/index.ts`, trước S3-1 (T3) |
| A-T1 | AD-1 (sau SH-1 commit) | (AD-4 nốt) | `contracts/index.ts` nối tiếp |
| A-T2 | AD-2 | AD-I (sau SH-2 commit) | `packages/i18n/**` nối tiếp |
| A-T3 | AD-3 | AD-5 | |
| A-T4 | AD-7 | AD-6 | Social T4: S4-1 (`0011`, `app.module.ts`), AD-7 không đụng hai file đó |
| A-T5 | AD-8 | AD-10 | |
| A-T6 | AD-9 | AD-11 | |
| A-T7 | AD-13 | AD-12 | AD-13 nối tiếp mọi card Social chạm `contracts/index.ts`, `domain/index.ts` |
| A-T8 | AD-14 | (trống, nhường slot Social) | `app.module.ts` sau S4-1; `rate-limit.config.ts` sau S2-2/S3-1/S4-1; Founder duyệt 0012 và D-M7 trước nhịp này |
| A-T9 | AD-15 | AD-17 | AD-17 cần G0 + S3-2 xong |
| A-T10 | — | AD-16 | |
| A-T11 | — | AD-18 | sau S2-4, S4-3 |

Gate Tester: sau A-T3 (A1+A2), sau A-T7 (A3), sau A-T11 (A4); BA đối chiếu AC theo brief.

## 5. File dùng chung phải nối tiếp
- `packages/contracts/src/index.ts`: SH-1 → AD-1 → AD-13.
- `packages/i18n/{messages/en.json,vi.json,src/message-keys.ts}`: SH-2 → AD-I (một lần, không card nào khác).
- `packages/domain/src/index.ts`: AD-0 → S3-1 → AD-13.
- `apps/api/src/app.module.ts`: S4-1 → AD-14 (Admin không sửa ở A3 vì `AdminModule` import `AuditModule`/`AuthModule`).
- `apps/api/src/database/sql/`: `0010` (AD-7), `0011` (S4-1), `0012` (AD-14); runner áp theo tên; DDL cần chủ dự án duyệt.
- `apps/api/src/common/rate-limit/rate-limit.config.ts`: S2-2 → S3-1 → S4-1 → AD-14.
- `apps/api/src/modules/admin/admin.module.ts`: AD-2 → AD-3 → AD-7 → AD-8 → AD-9 → AD-15 (chuỗi BE, không song song).
- `apps/api/src/modules/auth/auth.service.ts`: AD-7 → AD-15 (Social cấm sửa auth).
- `apps/web-admin-side/app/_lib/api.ts`: chỉ AD-4.
- `apps/web-admin-side/app/_components/shell/sidebar.tsx`: AD-5 → AD-6 → AD-10 → AD-16.
- `apps/web-admin-side/app/(console)/users/[id]/**`: AD-5 → AD-11 → AD-16; `events/[id]/**`: AD-6 → AD-12 → AD-16.
- `apps/web-client-side/app/(shell)/events/[id]/page.tsx`: S2-3 → S3-2 → AD-17; `community-post.tsx`, `comment-item.tsx`, `u/[handle]/page.tsx`: Social xong rồi AD-18.
- `pnpm-lock.yaml`: Admin không đổi (không dependency mới).

## 6. Test lane, EAS, rủi ro
- **Lane:** AD-0/1/13 unit; AD-2/3/7/8/9/14/15 integration (DB thật, ma trận 5 vai + 401, đồng hồ giả cho thời gian) + unit mask/cursor/SLA; AD-4/5/6/10/11/12/16/17/18 screen (Playwright) + typecheck/build. Regression cuối mỗi pha: `corepack pnpm --filter @dnc/api test`, `corepack pnpm -r typecheck`, `corepack pnpm --filter @dnc/web-admin build`, `corepack pnpm --filter @dnc/web-client build`. Bỏ qua: `apps/mobile` (không đổi); web-client không có vitest, logic thuần đặt ở `packages/domain`.
- **EAS:** không card nào buộc build lại EAS. Contracts additive; `POST /reports` dùng lại được cho mobile sau.
- **Rủi ro đặc thù:** (1) AD-7 chạm xác thực lõi và thêm Redis vào đường nóng (fail-open); (2) migration `0010` và `0012` tạo bảng append-only, rollback bằng DROP chỉ hợp lệ trước khi có dữ liệu thật, sau đó chỉ forward-fix, cần luật sư xác nhận cơ sở lưu giữ (brief §13); (3) đồng thời: khoá/đổi role/ẩn sự kiện (UPDATE có điều kiện + khóa hàng), gộp report (`ON CONFLICT` trên index một phần), INV-3 (advisory lock); không chạm đếm RSVP; (4) PostGIS/GIST: không chạm (toạ độ A2 chỉ đọc cột); (5) múi giờ: API UTC, biên `to` exclusive, SLA 24/7, hiển thị `Asia/Ho_Chi_Minh`; (6) rò rỉ PII: che ở server + allow-list + duyệt JSON ở e2e, log không chứa `q`/reason; (7) BullMQ: queue mới `moderation:expire-suspensions` với `jobId` cố định, không đụng queue đang chạy; (8) i18n: một card AD-I duy nhất, parity EN/VI; (9) kiểm duyệt: nội dung mới (báo cáo, snapshot) chỉ moderator+ thấy; người bị báo cáo/báo cáo không nhận thông báo (không có `notification`), nêu rõ cho Founder.

## 7. DDL trình chủ dự án

Cả hai file là bảng mới, không sửa bảng cũ. Chạy tay bằng `psql` với owner `dnc` theo thứ tự tên, như `0009`. Chưa áp trước khi chủ dự án duyệt.

### 7.1 `apps/api/src/database/sql/0010_audit_logs.sql` (AD-7)

Khác brief §9.3: bọc `BEGIN/COMMIT`; thêm hàm trigger cho DELETE; không FK sang `users` (tránh UPDATE nội bộ bị trigger chặn); không phân vùng; `uuidv7()` phải có sẵn (BE kiểm trước bằng `SELECT uuidv7()`, nếu thiếu dùng cách 0009 dùng cho PK).

```sql
BEGIN;

CREATE TABLE audit_logs (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  actor_user_id      uuid,                           -- plain uuid, survives anonymisation
  actor_type         varchar(16) NOT NULL DEFAULT 'user'
                       CHECK (actor_type IN ('user','staff','system','job','api_client')),
  actor_role_at_time varchar(20),
  action             varchar(80) NOT NULL CHECK (action ~ '^[a-z_]+\.[a-z_0-9]+$'),
  entity_type        varchar(40) NOT NULL,
  entity_id          uuid,
  "before"           jsonb,
  "after"            jsonb,
  reason             varchar(255),
  request_id         uuid,
  ip                 inet,
  user_agent         varchar(255),
  severity           varchar(16) NOT NULL DEFAULT 'info'
                       CHECK (severity IN ('info','notice','warning','critical')),
  CONSTRAINT ck_audit_logs_staff_reason
    CHECK (actor_type <> 'staff' OR length(btrim(coalesce(reason, ''))) >= 20)
);
CREATE INDEX idx_audit_created  ON audit_logs (created_at DESC, id DESC);
CREATE INDEX idx_audit_entity   ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_actor    ON audit_logs (actor_user_id, created_at DESC);
CREATE INDEX idx_audit_action   ON audit_logs (action, created_at DESC);
CREATE INDEX idx_audit_critical ON audit_logs (created_at DESC) WHERE severity = 'critical';

-- Append-only: only ip / user_agent may be cleared (retention job), never rewritten.
CREATE FUNCTION audit_logs_guard_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['ip','user_agent'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['ip','user_agent'])
     OR NEW.ip IS NOT NULL AND NEW.ip IS DISTINCT FROM OLD.ip
     OR NEW.user_agent IS NOT NULL AND NEW.user_agent IS DISTINCT FROM OLD.user_agent THEN
    RAISE EXCEPTION 'audit_logs is append-only: only ip and user_agent may be set to NULL'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_audit_logs_guard_update
  BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION audit_logs_guard_update();

CREATE FUNCTION audit_logs_guard_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: rows cannot be deleted' USING ERRCODE = '55000';
END $$;
CREATE TRIGGER trg_audit_logs_guard_delete
  BEFORE DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION audit_logs_guard_delete();
-- TRUNCATE is deliberately not guarded (test teardown, superuser), as in 0009.

REVOKE ALL ON audit_logs FROM PUBLIC;
REVOKE ALL ON audit_logs FROM dnc_app;
GRANT USAGE ON SCHEMA public TO dnc_app;
GRANT SELECT, INSERT ON audit_logs TO dnc_app;
GRANT UPDATE (ip, user_agent) ON audit_logs TO dnc_app;

COMMIT;
```

Rollback (chỉ khi bảng chưa có dữ liệu thật): `DROP TABLE audit_logs; DROP FUNCTION audit_logs_guard_update(), audit_logs_guard_delete();`. Ghi chú: truy vấn của admin loại `actor_role_at_time='super_admin'` không có index riêng, chấp nhận ở quy mô hiện tại. Cần luật sư xác nhận thời hạn giữ (24 tháng, xoá `ip`/`user_agent` sau 90 ngày theo doc 03 §10.4) trước khi chạy trên dữ liệu thật.

### 7.2 `apps/api/src/database/sql/0012_moderation.sql` (AD-14)

Chốt các mục BA để Tech Lead quyết: **giữ `moderation_cases`**; thêm `post` vào target, `content_removed`, `case_id` nullable ở `moderation_actions`. Sửa so với brief §10.2: bọc transaction; `moderation_actions` không FK sang `users` và append-only bằng trigger UPDATE + DELETE (cùng lý do T-7); trigger COI bao cả `assigned_to_user_id`, dùng `organizer_id`; `report_reason_enum` đủ 30 giá trị.

```sql
BEGIN;

CREATE TYPE report_source_enum AS ENUM ('user_report','auto_detection','proactive_review','external_request');
CREATE TYPE report_target_enum AS ENUM ('user','event','post','comment');
CREATE TYPE moderation_severity_enum AS ENUM ('critical','high','normal','low');   -- declared order = queue order
CREATE TYPE report_status_enum AS ENUM ('open','merged','resolved','rejected','withdrawn');
CREATE TYPE moderation_case_status_enum AS ENUM ('open','in_review','awaiting_info','resolved','escalated');
CREATE TYPE report_reason_group_enum AS ENUM (
  'danger','harassment','sexual','hate','scam','ghost_event',
  'impersonation','spam','privacy','illegal','unsafe_setup','other');
CREATE TYPE report_reason_enum AS ENUM (   -- 30 values, docs/analysis/05 section 13.2
  'physical_threat','sexual_harassment','sexual_assault_report','stalking',
  'minor_safety','illegal_substance','political_or_state_sensitive',
  'unauthorized_religious_activity','financial_scam','fake_job_or_fee',
  'investment_pitch','impersonation','ghost_event','event_clone',
  'sexual_services','nsfw_content','hate_speech','harassment','doxxing',
  'spam_advertising','cross_post_spam','off_topic_or_miscategorized',
  'unsafe_activity_setup','private_residence_unverified','no_show_abuse',
  'malicious_report','ban_evasion','curation_attribution_error',
  'curation_takedown_request','other');
CREATE TYPE moderation_action_type_enum AS ENUM (
  'reminder','warning','content_hidden','content_removed','feature_restricted',
  'suspended','banned','no_action','severity_changed','trust_level_downgraded','action_revoked');

CREATE TABLE moderation_cases (
  id                    uuid PRIMARY KEY DEFAULT uuidv7(),
  case_number           bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  target_type           report_target_enum NOT NULL,
  target_id             uuid NOT NULL,
  target_owner_user_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  related_event_id      uuid REFERENCES events (id) ON DELETE SET NULL,
  severity              moderation_severity_enum NOT NULL,
  status                moderation_case_status_enum NOT NULL DEFAULT 'open',
  report_count          integer NOT NULL DEFAULT 1,
  auto_hidden           boolean NOT NULL DEFAULT false,
  first_reported_at     timestamptz NOT NULL DEFAULT now(),
  sla_due_at            timestamptz NOT NULL,
  first_response_at     timestamptz,
  assigned_to_user_id   uuid REFERENCES users (id) ON DELETE SET NULL,
  assigned_at           timestamptz,
  resolved_by_user_id   uuid REFERENCES users (id) ON DELETE SET NULL,
  resolved_at           timestamptz,
  resolution_code       varchar(48) CHECK (resolution_code IN
                          ('violation_confirmed','no_violation','malicious_report','duplicate','resolved_stale')),
  resolution_note       text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_moderation_cases_resolution
    CHECK (status <> 'resolved' OR (resolved_by_user_id IS NOT NULL AND resolution_code IS NOT NULL))
);
CREATE UNIQUE INDEX uq_moderation_cases_open_target ON moderation_cases (target_type, target_id)
  WHERE status IN ('open','in_review','awaiting_info');
CREATE INDEX idx_moderation_cases_queue ON moderation_cases (severity, sla_due_at)
  WHERE status IN ('open','in_review');
CREATE INDEX idx_moderation_cases_assignee ON moderation_cases (assigned_to_user_id)
  WHERE status IN ('open','in_review','awaiting_info');

CREATE TABLE reports (
  id                    uuid PRIMARY KEY DEFAULT uuidv7(),
  case_id               uuid NOT NULL REFERENCES moderation_cases (id) ON DELETE RESTRICT,
  source                report_source_enum NOT NULL DEFAULT 'user_report',
  reporter_user_id      uuid REFERENCES users (id) ON DELETE SET NULL,
  reporter_trust_level  smallint,
  target_type           report_target_enum NOT NULL,
  target_id             uuid NOT NULL,
  target_owner_user_id  uuid REFERENCES users (id) ON DELETE SET NULL,
  reason_group          report_reason_group_enum NOT NULL,
  severity              moderation_severity_enum NOT NULL,
  description           varchar(2000),
  evidence_snapshot     jsonb NOT NULL,
  content_locale        varchar(5),
  status                report_status_enum NOT NULL DEFAULT 'open',
  idempotency_key       uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_reports_one_open ON reports (reporter_user_id, target_type, target_id)
  WHERE status = 'open' AND reporter_user_id IS NOT NULL;
CREATE UNIQUE INDEX uq_reports_idempotency ON reports (reporter_user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_reports_case ON reports (case_id);
CREATE INDEX idx_reports_target ON reports (target_type, target_id, created_at DESC);
CREATE INDEX idx_reports_reporter_recent ON reports (reporter_user_id, created_at DESC);

CREATE TABLE moderation_actions (
  id                    uuid PRIMARY KEY DEFAULT uuidv7(),
  case_id               uuid REFERENCES moderation_cases (id) ON DELETE RESTRICT,  -- NULL = admin-initiated (A3)
  action_type           moderation_action_type_enum NOT NULL,
  actor_user_id         uuid,                    -- plain uuid; NULL = system
  actor_role            user_role_enum,
  subject_user_id       uuid,                    -- plain uuid (no FK: append-only, see 0009 note)
  target_type           report_target_enum,
  target_id             uuid,
  reason_code           report_reason_enum NOT NULL,
  reason_note           text NOT NULL CHECK (length(btrim(reason_note)) >= 20),
  severity              moderation_severity_enum NOT NULL,
  starts_at             timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz,
  strike_weight         smallint NOT NULL DEFAULT 0,
  strike_group          varchar(32),
  evidence_snapshot     jsonb,
  revoked_at            timestamptz,
  revoked_by_user_id    uuid,
  revoke_reason         text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_moderation_actions_expiry
    CHECK (action_type <> 'suspended' OR expires_at IS NOT NULL OR case_id IS NULL)
);
CREATE INDEX idx_moderation_actions_case ON moderation_actions (case_id, created_at DESC);
CREATE INDEX idx_moderation_actions_subject ON moderation_actions (subject_user_id, created_at DESC);
CREATE INDEX idx_moderation_actions_expiring ON moderation_actions (expires_at)
  WHERE expires_at IS NOT NULL AND revoked_at IS NULL;

-- Append-only: only the revocation columns may change, and revocation is final (pattern of 0009).
CREATE FUNCTION moderation_actions_guard_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['revoked_at','revoked_by_user_id','revoke_reason'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['revoked_at','revoked_by_user_id','revoke_reason']) THEN
    RAISE EXCEPTION 'moderation_actions is append-only: only revoked_* may change' USING ERRCODE = '55000';
  END IF;
  IF OLD.revoked_at IS NOT NULL
     AND (NEW.revoked_at IS DISTINCT FROM OLD.revoked_at
          OR NEW.revoked_by_user_id IS DISTINCT FROM OLD.revoked_by_user_id
          OR NEW.revoke_reason IS DISTINCT FROM OLD.revoke_reason) THEN
    RAISE EXCEPTION 'moderation_actions revocation is final' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_moderation_actions_guard_update
  BEFORE UPDATE ON moderation_actions FOR EACH ROW EXECUTE FUNCTION moderation_actions_guard_update();
CREATE FUNCTION moderation_actions_guard_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'moderation_actions is append-only: rows cannot be deleted' USING ERRCODE = '55000';
END $$;
CREATE TRIGGER trg_moderation_actions_guard_delete
  BEFORE DELETE ON moderation_actions FOR EACH ROW EXECUTE FUNCTION moderation_actions_guard_delete();

-- INV-4 conflict of interest: assignee and resolver may not be the reported owner, a reporter,
-- or the organizer of the related event (events.organizer_id, not host_user_id).
CREATE FUNCTION fn_check_case_conflict_of_interest() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE who uuid;
BEGIN
  FOREACH who IN ARRAY ARRAY[NEW.assigned_to_user_id, NEW.resolved_by_user_id] LOOP
    CONTINUE WHEN who IS NULL;
    IF who = NEW.target_owner_user_id THEN
      RAISE EXCEPTION 'INV-4: handler cannot be the reported party (case %)', NEW.case_number;
    END IF;
    IF EXISTS (SELECT 1 FROM reports r WHERE r.case_id = NEW.id AND r.reporter_user_id = who) THEN
      RAISE EXCEPTION 'INV-4: handler cannot be a reporter (case %)', NEW.case_number;
    END IF;
    IF NEW.related_event_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM events e WHERE e.id = NEW.related_event_id AND e.organizer_id = who) THEN
      RAISE EXCEPTION 'INV-4: handler cannot be the organizer of the related event (case %)', NEW.case_number;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_moderation_cases_coi
  BEFORE INSERT OR UPDATE ON moderation_cases
  FOR EACH ROW EXECUTE FUNCTION fn_check_case_conflict_of_interest();

REVOKE ALL ON moderation_cases, reports, moderation_actions FROM PUBLIC;
REVOKE ALL ON moderation_cases, reports, moderation_actions FROM dnc_app;
GRANT USAGE ON SCHEMA public TO dnc_app;
GRANT SELECT, INSERT, UPDATE ON moderation_cases, reports TO dnc_app;
GRANT SELECT, INSERT ON moderation_actions TO dnc_app;
GRANT UPDATE (revoked_at, revoked_by_user_id, revoke_reason) ON moderation_actions TO dnc_app;

COMMIT;
```

Rollback (chỉ khi chưa có dữ liệu thật): `DROP TABLE moderation_actions, reports, moderation_cases; DROP FUNCTION fn_check_case_conflict_of_interest(), moderation_actions_guard_update(), moderation_actions_guard_delete(); DROP TYPE moderation_action_type_enum, report_reason_enum, report_reason_group_enum, moderation_case_status_enum, report_status_enum, moderation_severity_enum, report_target_enum, report_source_enum;` Chú ý: `ALTER TYPE ... ADD VALUE` sau này không rollback được dễ dàng, nên 30 giá trị lý do và 11 loại hành động đã được chốt đầy đủ. `reports` chứa snapshot nội dung có dữ liệu cá nhân: cần luật sư xác nhận (giữ 12 tháng rồi chỉ giữ hash, job dọn là follow-up). Teardown e2e dùng `TRUNCATE ... CASCADE` cho ba bảng.

## Engineering Plan (tóm tắt theo mẫu)
Quyết định kiến trúc: T-1..T-13 (mục 1); không dependency mới; một DB, một Redis, không tách service.
Service & module bị ảnh hưởng: `apps/api` modules `admin` (nhiều controller), `audit` (mới), `report` (mới), `auth` (iat, deny-list, revoke), job `moderation-jobs` (mới); `apps/web-admin-side` (6 route, ui kit, hộp thoại); `apps/web-client-side` (Report sheet, My reports, gắn nút); `packages/domain`, `contracts`, `i18n`; `apps/mobile` không đổi.
Hợp đồng API/DTO/mã lỗi: mục 2.1, 2.2.
Hợp đồng dữ liệu & migration: mục 7 (0010, 0012; không migration cho A1/A2; `0011` thuộc Social).
Hợp đồng UI & key i18n: mục 2.3 + AD-I (một chủ sở hữu).
Task cards: AD-0..AD-18 + AD-I.
Thứ tự thực thi: mục 4. Nhóm song song an toàn: mỗi nhịp một cặp BE ∥ Web/package. File chung nối tiếp: mục 5. Test lane: mục 6. Ảnh hưởng EAS: không.
Câu hỏi kỹ thuật còn mở (cần xác nhận, không chặn A1/A2): (a) `uuidv7()` có sẵn trên DB chạy migration không (BE kiểm ở AD-7); (b) đã có bootstrap BullMQ dùng được cho AD-15 chưa (BE kiểm); (c) Founder duyệt D-M7 ẩn tự động, bảng D-M4, hai DDL trước A-T8; (d) tài liệu cần đồng bộ (Coordinator): `.agent/rules/behaviors.md:114-115` và `checklists.md` đổi `moderation_audit_log` thành `audit_logs`; doc 03 §9 theo doc 05 §13; doc 05 comment "28 giá trị" thực tế 30; brief §9.3/§10.2 ghi `0010/0011` nhưng số chốt là `0010/0012` (và Social giữ `0011`), cập nhật tên file trong brief.
Cần Debate Gate: không. Các lựa chọn có đánh đổi (deny-list Redis thay vì token ngắn hơn/cột epoch; giữ `moderation_cases`; không phân vùng audit) đã chốt theo nguyên tắc đơn giản và có căn cứ code; chỉ trình chủ dự án hai DDL.
## 9. Ghi chú Coordinator sau review AD-1/AD-I/AD-4 (01/10/2026)

- Key i18n đổi tên do xung đột cấu trúc: `admin.action.suspendUser.effect` → `admin.action.suspendUserEffect`; hint ghế là `admin.events.detail.seatsTakenHint` (không phải `seatsTaken.hint`). Card UI dùng đúng tên này.
- `AuditSeverity` phải có đủ 4 mức `info|notice|warning|critical` khớp cột DB và i18n (review MAJOR-3, sửa ở AD-1).
- Phân trang: trang kế/trang trước dùng `router.push` (Back quay về trang trước); đổi lọc/sắp xếp dùng `replace`.
- AD-2 xong (75 e2e admin xanh). Quyết định: `emailMasked` thành nullable trong contract vì `users.email` có thể NULL (tài khoản chỉ có phone/social); bỏ placeholder. Làm ở card dọn **AD-2b**, cùng lint `require-array-sort-compare` trong e2e.
- Key lỗi mới của AD-2 (`errors.admin.queryInvalid|cursorInvalid|userNotFound`) và MINOR-10 được thêm ở lượt AD-I follow-up, chạy trước AD-5 trong cùng worker web-admin. `packages/i18n` vẫn nối tiếp, mỗi lúc một worker.
- `AuditEntityType` hiện chỉ có `user|event`. AD-7/AD-14 thêm giá trị (report, comment, post...) khi cần, nối tiếp qua `contracts/index.ts`.
- Worker không được dùng `pkill -f next-server`/`pkill -f next`. Chỉ kill đúng PID mình đã bật.

## 10. Ghi chú Coordinator sau review AD-2/AD-4 lượt 2, AD-3/AD-5 xong (01/10/2026)

- **Chủ dự án đã duyệt DDL `0010_audit_logs.sql` (mục 7.1)** ngày 01/10/2026, áp trên DB local. Trước khi chạy trên dữ liệu thật vẫn cần xác nhận pháp lý về thời hạn lưu (24 tháng, xoá `ip`/`user_agent` sau 90 ngày). `0012` chưa trình.
- Review lượt 2: AD-1 approved (m9: `AuditDiff` phải chuẩn hoá khoá snake_case/camelCase/hoa thường trước AD-7). AD-2/2b changes-requested (M1 cursor hợp lệ về hình dạng nhưng sai giá trị gây 500). AD-4 changes-requested (M11 Select tự đóng khi cuộn chính listbox). Sửa ở card **AD-2c** (BE + contracts) và **AD-4b** (kit web).
- **Quyết định m5 (PII trong query string `q`), không mở Debate Gate:** giữ `GET /admin/users?q=` theo D-U3 (console nội bộ, chỉ admin+). Giảm thiểu ở hạ tầng: log nginx cho `/api/v1/admin/*` và console admin bỏ `$args`; Sentry (khi có) xoá query khỏi breadcrumb và URL. Gộp vào T-18 (runbook nginx production). Nếu sau này mở tìm kiếm cho vai thấp hơn thì chuyển sang `POST .../search`.
- Gap kit AD-4 (từ AD-5): `Input` chưa có `wrapperClassName`, chưa có `Checkbox`. `RequireRole` redirect `/` thay vì hiện màn thiếu quyền (A1-AC-12), ghi nợ cho card shell.
- AD-3 thêm key lỗi `errors.admin.eventNotFound`, lượt i18n tiếp theo do worker web-admin (AD-6) thêm.
- Review AD-3: changes-requested nhẹ (M-A cursor sai giá trị cùng gốc M1; m-1 `escapeLike` sang `admin-sql.ts`; m-2 test đang diễn ra; m-3 draft không lộ `updatedAt`/`slug`; m-5 e2e không lệch KPI overview). Gộp vào AD-2c. m-4 (7 scalar subquery, chưa EXPLAIN) ghi nợ.
- Review AD-5: approved-with-changes. Card **AD-5b** chạy sau AD-6 (cùng worker web-admin, vì i18n nối tiếp):
  - m-6: nhãn `revokedReason`, không in mã thô.
  - m-7: 400 `queryInvalid` thì hiện "bộ lọc không hợp lệ" + Xoá bộ lọc; chặn trust min > max.
  - m-8: test lọc ngày VN→UTC, moderator gõ `/users`, `includeDeleted`, trust range; thêm project WebKit.
  - m-10: giảm chữ. Gộp hint tìm kiếm vào tooltip, rút placeholder; ẩn hàng hồ sơ trống; bỏ `contactMasked`/`trust.hint` khỏi thân thẻ; thẻ rỗng chỉ ghi "Chưa có"; ghi chú múi giờ một lần ở shell; bỏ cột "Hết hạn" ở bảng phiên.
  - n-1: xoá key mồ côi.
  - n-2: nhãn VI `expat.*`, ví dụ `local_host` = "Người dẫn dắt địa phương".
  - n-4: comment lỗi thời.
