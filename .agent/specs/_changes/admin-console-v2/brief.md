# Requirement Brief — admin-console-v2 (Giai đoạn 1)

**Chủ:** chưa gán (Coordinator gắn) · **Nguồn:** BA Agent, 01/10/2026 (Thứ Năm, giờ Đà Nẵng) · **Trạng thái:** phạm vi bốn hạng mục đã được chủ dự án chọn; chấp nhận migration cho audit log và kiểm duyệt. Brief chờ Tech Lead chốt hợp đồng và DDL. Chạy L8, chạy song song với track Social.
**Giai đoạn:** 1 kết nối cộng đồng. Thuộc nền console vận hành, chạm M4 (`docs/checklists/theo-phase/M4-trust-safety.md`: E8-S1, E8-S3, E8-S4, E9-S1, S5-DoD-6, S5-DoD-7, M4-1, M4-3, M4-4). Không chuẩn bị gì cho giai đoạn 2/3.
**Điều kiện trước:** đợt `discover-and-admin-overview` đã có `GET /admin/overview`, khoá `analytics.platform.view`, bộ `ui/*` và `MetricHint` (đang là thay đổi chưa commit trong cây làm việc). Các pha dưới đây dựng tiếp trên đó.

## 0. Thứ tự pha và phụ thuộc

| Pha | Nội dung | Migration | Quyền liên quan | Giao độc lập? |
|---|---|---|---|---|
| **A1** | Quản lý người dùng, chỉ đọc | Không | admin, super_admin | Có. Làm trước. |
| **A2** | Quản lý sự kiện, chỉ đọc | Không | moderator, admin, super_admin | Có. Song song A1 được. |
| **A3** | Thao tác (khoá/mở khoá, đổi role, ẩn/gỡ sự kiện) + `audit_logs` + trang Audit log | `0010_audit_logs.sql` | Theo từng thao tác (§9.2) | Cần A1 (nút ở trang chi tiết user) và A2 (nút ở trang chi tiết sự kiện). |
| **A4** | Hàng đợi kiểm duyệt + báo cáo từ web-client | `0011_moderation.sql` | moderator, admin, super_admin | Cần A3 (audit, mutation thật). Chạm `apps/web-client-side`, phụ thuộc track Social (§10.9). |

## 1. Mục tiêu nghiệp vụ

Hôm nay mọi thao tác quản trị phải làm bằng SQL tay và không để lại dấu vết (doc 14:754). Đợt này cho đội vận hành:
- **A1/A2:** tra được "ai là người này, họ đang ở trạng thái nào, họ đã làm gì" và "sự kiện này đang ở đâu trong vòng đời, có bao nhiêu người tham gia", mà không lộ liên lạc cá nhân.
- **A3:** thực hiện ba loại can thiệp có lý do bắt buộc, có xác nhận, và để lại bản ghi bất biến (ai, lúc nào, trước/sau, vì sao).
- **A4:** thành viên báo cáo được nội dung xấu từ web-client; moderator thấy hàng đợi theo mức nghiêm trọng và hạn SLA, xử lý, và quyết định được ghi lại.

## 2. Tác nhân và quyền đề xuất

Nguồn: `PERMISSION_MATRIX` hiện có 3 khoá (`admin_console.access`, `system.health.view`, `analytics.platform.view`); doc 01 §9.2, §9.3 (Đ8-Đ9, Đ34-Đ41, Đ48-Đ51), §9.4; doc 14 §10-11. Khoá in nghiêng là **khoá mới ngoài 22 quyền của doc 01**, BA đề xuất để Tech Lead thêm vào `PERMISSION_MATRIX`.

| Khoá | Doc | curator | moderator | admin | super_admin | Pha |
|---|---|:-:|:-:|:-:|:-:|---|
| *`user.directory.view`* | UC-73, AD-40/41 | ❌ | ❌ | ✅ | ✅ | A1 |
| *`event.directory.view`* | AD-30/31 (ngữ cảnh) | ❌ | ✅ | ✅ | ✅ | A2 |
| `content.hide` (#14, Đ35) | §9.2 | ❌ | ✅ | ✅ | ✅ | A3, A4 |
| *`event.takedown`* | Đ35 + contracts/event.ts:3-7 | ❌ | ❌ | ✅ | ✅ | A3 |
| `user.suspend` (#15, Đ37-Đ39) | §9.2 | ❌ | ❌ ở A3 (vào qua case ở A4) | ✅ Đ38 | ✅ Đ39 | A3 |
| `user.role.assign` (§9.4) | §8.3 | ❌ | ❌ | ❌ | ✅ | A3 |
| `audit_log.view` (#22, Đ48-Đ51) | §9.2 | ❌ | ⚠️ chỉ log của chính mình (Đ49) | ⚠️ trừ log của super_admin (Đ50) | ✅ Đ51 | A3 |
| `moderation.queue.view` (#16) | §9.2 | ❌ (Đ40 "Curated content" chưa có dữ liệu) | ✅ Đ41 | ✅ | ✅ | A4 |
| *`moderation.decide`* | §13.10 | ❌ | ✅ (không `banned`) | ✅ | ✅ | A4 |
| `report.create` (#13) | §9.2 | member và mọi staff, `trust_level >= 1` (§13.10) | | | | A4 |

Persona dùng trong AC:
- **Founder/Admin (B4)**: vận hành chính, tra người dùng, khoá tài khoản, gỡ sự kiện. Desktop.
- **Moderator (B2)**: hàng đợi báo cáo, ẩn nội dung. Ở giai đoạn đầu là Founder kiêm nhiệm (M4 TG-M4-2). Desktop.
- **Super admin (B5)**: duy nhất đổi role; đọc toàn bộ audit.
- **Curator (B1)**: vào console như cũ, không có mục nào mới (không có Users/Events/Audit/Moderation trong sidebar, API 403).
- **Member (P1 expat)**: chỉ xuất hiện ở A4 như người báo cáo và như chủ nội dung bị báo cáo.
- **Member mở nhầm web-admin**: bị từ chối như cũ (không đổi).

## 3. Phạm vi

**Trong phạm vi**
- A1. Danh sách người dùng (cursor, tìm kiếm, lọc, sắp xếp), trang chi tiết người dùng chỉ đọc.
- A2. Danh sách sự kiện mọi trạng thái, trang chi tiết sự kiện chỉ đọc (occurrence, số liệu RSVP/waitlist gộp, host).
- A3. Bảng `audit_logs` append-only; thao tác: khoá/mở khoá tài khoản, đổi role, ẩn/khôi phục/gỡ sự kiện; lý do bắt buộc, xác nhận hai bước; trang Audit log; thu hồi phiên khi khoá/đổi role.
- A4. Bảng `reports`, `moderation_cases`, `moderation_actions`; `POST /reports`, `GET /reports/mine`; nút/sheet báo cáo trên web-client; hàng đợi và chi tiết case trên console; quyết định (bỏ qua, ẩn, gỡ, cảnh cáo, khoá có hạn); SLA hiển thị; gộp theo target; guard xung đột lợi ích.
- Mọi pha: bảng đủ chức năng (sắp xếp theo cột, lọc, phân trang phía server, trạng thái bảng trong URL), desktop trước nhưng kiểm 768 / 1280 / 1920 px, EN/VI đầy đủ, `MetricHint` cho mọi số liệu tổng hợp (rule `dashboard-metric-tooltips`).

**Ngoài phạm vi (không mở rộng)**
- Reveal email/phone đầy đủ (cần `pii_access` audit), impersonate (doc 01 Q-06 chưa chốt), xuất dữ liệu cá nhân, tra cứu theo `support_ticket_id` (không có hệ thống ticket).
- Sửa nội dung sự kiện/hồ sơ từ console, sửa/huỷ sự kiện thay host (Đ9), gán trust level bằng tay (Q-12 mặc định không), xoá vĩnh viễn, ẩn danh hoá.
- Khoá có thời hạn ở A3 (cần job hết hạn; vào ở A4, §10.7), trạng thái `restricted`/`banned` (enum `user_status_enum` chưa có; cần migration riêng), `feature_restricted`, `banned`.
- Cấp `super_admin` (four-eyes), 2FA cho staff, lọc/xuất CSV, thao tác hàng loạt.
- Khiếu nại (`appeals`), chặn người dùng (`blocks`, E8-S2), guest report có CAPTCHA, báo cáo tin nhắn/ảnh/review, phát hiện tự động (N2), rà soát chủ động (N3), `priority_score` + job `moderation:rescore`, leo thang SLA bằng push/gọi điện, biểu đồ.
- Mọi kênh thông báo (notification chưa có): người bị xử lý và người báo cáo **không** được push/email trong v1 (§14).
- Console curation (AD-20..23), taxonomy (AD-50/51), feature flag (AD-60).

## 4. Hành vi as-is [đọc code; Tester xác nhận bằng chạy thật]

**API (`apps/api`)**
- `AdminController` hiện có `GET admin/system/health` và `GET admin/overview`, cả hai `@Roles(...allowedRolesFor(<key>))` (admin.controller.ts:29-46). Chưa có route nào ghi dữ liệu trong module admin.
- `RolesGuard` trả 403 `{ code: 'ROLE_NOT_ALLOWED', messageKey: 'errors.auth.roleNotAllowed' }`, không liệt kê role được phép (roles.guard.ts:42-45).
- `JwtAuthGuard` chỉ verify chữ ký JWT và đọc `role`, `trustLevel` từ claims, **không tra DB hay Redis** (jwt-auth.guard.ts:52-66; auth.service.ts:295-312). Access token sống 15 phút (auth.service.ts:35). `assertUsable` (auth.service.ts:324-330) chỉ chạy khi đăng nhập và refresh, trả 403 `ACCOUNT_NOT_ACTIVE` với key `errors.auth.accountSuspended` hoặc `accountUnavailable`. Hệ quả: một tài khoản bị khoá hay đổi role vẫn gọi API bình thường tới 15 phút nếu không có cơ chế mới.
- Phiên: bảng `auth_sessions` (user_id, family_id, platform, ip, user_agent, expires_at, revoked_at, revoked_reason); đã có `revokeFamily`, `revokeSession` ở `AuthRepository` (auth.repository.ts:179-198). Chưa có hàm "thu hồi mọi phiên của một user".
- Cột sẵn có trên `users` (0008_identity.sql:37-64): `role`, `trust_level`, `trust_level_changed_at`, `status` (`pending|active|suspended|deactivated|deleted`), `suspended_until`, `suspension_reason`, `last_active_at`, `deletion_requested_at`, `anonymized_at`, `legal_hold_until`, `deleted_at`. **Không** có `restricted`/`banned` trong enum. `profiles` có `handle`, `display_name`, `visibility`, `birth_year`, `gender`, `trust_points`, `events_hosted_count`, `events_attended_count`, `no_show_count`.
- `events` có `organizer_id`, `status` (6 giá trị gồm `suspended`, `taken_down`), `is_featured`, `deleted_at`, không có cột lý do ẩn (0002_rsvp_core.sql:23-39). Mỗi sự kiện hiện có đúng 1 occurrence (`event_occurrences`). `EventRepository` chặn organizer sửa trạng thái khi đang `suspended`/`taken_down` (event.repository.ts:285-295). RSVP chỉ nhận khi `event_status === 'published'` (rsvp.service.ts:65).
- `posts`, `comments` có `status` (`visible|pending_review|hidden|removed`), `moderation_state` (`clean|flagged|under_review|actioned`), `report_count`, chỉ mục `idx_*_moderation` (0004_community_interaction.sql). Chưa có bảng `reports`, `moderation_*`, `audit_logs`, `appeals`, `blocks`. Capability-map ghi "Báo cáo vi phạm & kiểm duyệt: chưa làm".
- Mẫu tham chiếu cho bảng bất biến: `trust_signals` dùng **trigger** chặn UPDATE khác ngoài hai cột thu hồi, vì API/migration kết nối bằng owner `dnc` (REVOKE không có tác dụng với owner); role `dnc_app` NOLOGIN đã có (0009_trust_signals.sql:11-20, 90-112). Các migration là file SQL đánh số tay, chạy tay lên DB local (không có thư mục `migrations/`).
- Không có module `notification` trong `apps/api/src/modules`.

**Console (`apps/web-admin-side`)**
- Route group `(console)` gồm `/` (Overview, đã có KPI + 2 bảng "newest" + khối system) và `/system-health`. **Không có tiền tố `/admin`**; doc 10 §AD-* dùng `/admin/users`... nên lệch (S-6).
- Sidebar chỉ có Overview (mọi staff) và System health (admin, super_admin), lọc bằng hằng số từ `@dnc/domain` (sidebar.tsx:26-33). Trang đích dùng `RequireRole` (cho người gõ thẳng URL).
- Bộ UI: `Button, Card, Badge, EmptyState, Input, Skeleton, MetricHint`; **chưa có component Table, Select, Dialog, Pagination, Tabs**. `OverviewTable` là bảng tĩnh không sắp xếp, không phân trang (overview-table.tsx).
- `_lib/api.ts` là client viết tay, `call()` tự refresh 1 lần khi 401, ném `ApiError { status, code, messageKey }`; lỗi body phẳng (api.ts:123-136). `_lib/areas.ts` có 6 khu theo `AREA_SLUGS`.
- i18n: nhánh `admin.*` đã có `nav`, `overview`, `health`, `login`, `header`; nhánh `role.*` thiếu `role.member.label`; có `trust.*` và `event.status.*`.

## 5. Behavior smell phát hiện

| # | Smell | Xử lý |
|---|---|---|
| S-1 | Doc 03 §9 (`reports`, `moderation_actions`, `appeals` kiểu cũ, không có `moderation_cases`) mâu thuẫn doc 05 §13 (`reports` → `moderation_cases` → `moderation_actions`, dedupe, SLA). Doc 03 §9.2 cho `report_id` nullable, doc 05 §13.5 cho `case_id NOT NULL` | Theo **doc 05 §13** (chi tiết hơn, có checklist M4 tham chiếu). Nới `case_id` thành nullable cho thao tác chủ động của admin (A3). Ghi lại để sửa doc 03 (Tech Lead). |
| S-2 | Tên bảng audit: doc 01 gọi `audit_log`, doc 03 §10.4 gọi `audit_logs`, rule `behaviors.md:115` và `checklists.md:158-177` gọi `moderation_audit_log` với API `record({action,targetType,targetId,reason,changes})` | Một bảng duy nhất `audit_logs` (doc 03). `moderation_audit_log` trong rule là cùng khái niệm. Đề xuất Tech Lead cập nhật hai rule. |
| S-3 | Khoá/đổi role không có hiệu lực tức thì (guard không tra trạng thái, token 15 phút). Doc 14 X-J11-07 yêu cầu hiệu lực ngay | Mặc định BA: có hiệu lực tức thì (AC A3). Cách thực hiện do Tech Lead chọn (gợi ý: khoá deny-list trong Redis theo `userId` sống đúng 15 phút, JwtAuthGuard tra mỗi request; Redis đã có trong stack). Nếu Tech Lead từ chối vì chi phí, phải ghi rõ khoảng trễ tối đa 15 phút và Founder duyệt (Q-2). |
| S-4 | Doc 01 §9.3 Đ9 nói audit mức `high` nhưng cột `severity` của `audit_logs` chỉ có `info/notice/warning/critical` | Ánh xạ: xem §9.4. |
| S-5 | Doc 05 §13.2 `report_target_enum` không có `post`, trong khi bảng `posts` đã tồn tại (0004) | Thêm `post` vào enum. |
| S-6 | Doc 10 dùng route `/admin/users`...; console thật không có tiền tố `/admin` | Dùng `/users`, `/users/[id]`, `/events`, `/events/[id]`, `/audit-log`, `/moderation`, `/moderation/[caseNumber]`. |
| S-7 | Doc 03 §9.1 dùng `severity` = `critical/high/medium/low`; doc 05 §7 dùng `critical/high/normal/low`; checklist M4 dùng P0-P3 với SLA 2h/12h/48h/**72h**, doc 05 §7.3 dùng 2h/12h/48h/**7 ngày** | Theo doc 05 §7.3 (đã nêu ánh xạ P0→critical...). |
| S-8 | Trigger INV-4 mẫu ở doc 05 §13.4 tham chiếu `events.host_user_id`, cột thật là `organizer_id` | Dùng `organizer_id`. |
| S-9 | Doc 14 AD-40 buộc nhập `support_ticket_id` trước khi tra người dùng, nhưng không có hệ thống ticket; doc 01 Đ21 cấm danh sách attendee tự do | A1/A2 che PII và chỉ cho tổng hợp (D-U3, D-E3). Ghi Q-1. |
| S-10 | INV-2 (doc 01 §9.5) đòi mọi hành động staff trên dữ liệu người khác sinh đúng 1 bản ghi audit, nhưng A1/A2 đọc trước khi có bảng audit | A1/A2 chỉ đọc dữ liệu đã che; chặn mọi thứ cần `pii_access` ra khỏi A1/A2 (D-U3). Reveal đi cùng audit ở follow-up. |
| S-11 | Doc 01 §8.3 yêu cầu nâng staff phải `trust_level >= 3` và staff phải bật 2FA; tài khoản seed/dev hiện ở T0 và 2FA chưa tồn tại | Giữ ràng buộc trust ở API (D-R3). 2FA ghi rủi ro R-2. |
| S-12 | `moderation_state` trên `posts`/`comments` (`flagged`, `under_review`, `actioned`) và `report_count` hiện không ai ghi | A4 cập nhật chúng cùng transaction khi tạo report/quyết định. |
| S-13 | `user_status_enum` có `deactivated`, `pending`, `deleted` nhưng chưa có luồng nào đặt chúng; doc 01 §10 (S5) dùng `restricted`/`banned` | A3 chỉ thao tác `active ⇄ suspended`; các trạng thái khác chỉ hiển thị. |
| S-14 | `OCCURRENCE_JOIN` lấy occurrence sớm nhất; an toàn khi mỗi sự kiện có 1 occurrence (đợt trước S-9) | Danh sách A2 dùng cùng định nghĩa; chi tiết A2 liệt kê **mọi** occurrence để không vỡ khi có sự kiện lặp. |

## 6. Quyết định chung (mọi pha)

Nguồn ghi `file:dòng` hoặc "Mặc định BA".

| ID | Câu hỏi | Quyết định | Nguồn |
|---|---|---|---|
| C-1 | Route và phân quyền API | Mọi route dưới `api/v1/admin/**`, `@Roles(...allowedRolesFor('<khoá>'))`. Không có route phụ cho phép người ngoài danh sách; 401 khi không token, 403 `ROLE_NOT_ALLOWED` khi sai role. Quyền theo hàng/dòng (audit của moderator, case bị COI) kiểm ở service | admin.controller.ts:29-46 |
| C-2 | Phân trang | **Cursor (keyset)**, mặc định 25, tối đa 100. Không trả tổng số (tránh COUNT toàn bảng). Cursor mờ đục, gắn với tổ hợp `sort+dir` (đổi sort mà giữ cursor cũ → 400 `errors.admin.cursorInvalid`). Phá hoà bằng `id` | doc 14 B1 ("cursor pagination"); web-admin-agent "phân trang phía server" |
| C-3 | Sắp xếp | Danh sách trắng cột và hướng; cột lạ → 400 (không bỏ qua ngầm) | Mặc định BA |
| C-4 | Mốc thời gian | API nhận và trả ISO-8601 UTC. Lọc ngày: `from` **inclusive**, `to` **exclusive** (cùng quy ước `ListEventQuery`). Client tính nửa đêm `Asia/Ho_Chi_Minh` rồi đổi sang UTC. Hiển thị theo giờ VN | event.ts:79-97; luật dự án |
| C-5 | Trạng thái bảng | Bộ lọc, sắp xếp, `cursor` nằm trong query string (chia sẻ và quay lại được). Trang kế = đẩy `cursor` vào URL (nút Back quay về trang trước). Không có số trang | web-admin-agent:83-87, 145 |
| C-6 | Che PII | API trả `emailMasked` (ký tự đầu của phần local + `***` + `@` + miền đầy đủ, ví dụ `a***@gmail.com`), `phoneMasked` (chỉ 3 số cuối, ví dụ `*** *** 123`). **Không bao giờ** trả `email`, `phone`, `passwordHash`, `ip`, `userAgent`, `birthYear`, `gender` ở A1/A2. Che làm ở server | doc 05 Q-01, D-29; brief trước D-17 |
| C-7 | Tiền tố khoá lỗi | `errors.admin.*` cho lỗi console, `errors.report.*` cho lỗi báo cáo. Body lỗi phẳng `{ code, messageKey }` như hiện có | api.ts:123-136 |
| C-8 | Không cache | Mọi danh sách đọc trực tiếp DB; không cache ở v1 | Mặc định BA |
| C-9 | Nội dung do người dùng nhập | Render là văn bản thuần (không HTML), cắt ngắn trong bảng, tooltip đầy đủ | brief trước B-AC-8 |
| C-10 | Số liệu tổng hợp | Mọi số trên màn hình (KPI dải hàng đợi, đếm theo trạng thái) có `MetricHint` đủ EN/VI nêu "đếm cái gì, tính thế nào, cạm bẫy" | rule dashboard-metric-tooltips |

---

## 7. PHA A1 — Quản lý người dùng (chỉ đọc)

### 7.1 Quyết định A1

| ID | Câu hỏi | Quyết định | Nguồn |
|---|---|---|---|
| D-U1 | Ai dùng | `user.directory.view`: admin, super_admin. Moderator/curator/member: 403. Sidebar chỉ hiện "Users" cho hai role này. Moderator tiếp cận một người dùng cụ thể chỉ qua ngữ cảnh case ở A4 | doc 14 §11.1; Mặc định BA (khoá mới) |
| D-U2 | Tập hợp mặc định | Mọi user `deleted_at IS NULL AND anonymized_at IS NULL`, mọi role và mọi status. Công tắc `includeDeleted=true` thêm user đã xoá mềm và đã ẩn danh (hàng đánh dấu, handle có thể đã bị thay) | Mặc định BA; khác Overview D-16 vì support cần tìm tài khoản đang trong ân hạn xoá 14 ngày (doc 14 §10 B8) |
| D-U3 | Tìm kiếm `q` | Cắt khoảng trắng, tối thiểu 2 ký tự, tối đa 100. Phân loại: (a) có `@` → **khớp chính xác** email không phân biệt hoa thường; (b) bắt đầu bằng `+` hoặc toàn chữ số và dài ≥ 8 → **khớp chính xác** phone (sau khi bỏ khoảng trắng và dấu `-`); (c) là UUID → khớp `id`; (d) còn lại → handle **bắt đầu bằng** `q` hoặc `display_name` **chứa** `q`, không phân biệt hoa thường. Ký tự `%` `_` `\` thoát nghĩa. **Không** khớp một phần trên email/phone (chống dò danh bạ) | doc 05 Q-01; Mặc định BA |
| D-U4 | Lọc | `role` (nhiều giá trị), `status` (nhiều giá trị), `trustMin`/`trustMax` (0-5, `trustMin <= trustMax`), `joinedFrom`/`joinedTo` (theo `users.created_at`, C-4), `includeDeleted`. Kết hợp bằng AND; trong một nhóm nhiều giá trị là OR | Mặc định BA |
| D-U5 | Sắp xếp | `createdAt` (mặc định, giảm dần), `lastActiveAt` (NULL xếp cuối cả hai hướng), `trustLevel`, `handle`. Hướng `asc`/`desc` | C-3 |
| D-U6 | Cột bảng | Tên hiển thị (+ avatar nhỏ), handle, role (Badge), status (Badge), trust (T0-T5, nhãn doc 05 S5-DoD-4), email đã che + dấu "đã xác minh", phone đã che + dấu xác minh, ngày tham gia, lần cuối hoạt động. Bấm hàng mở chi tiết. Không có thao tác hàng loạt (không có thao tác nào ở A1) | web-admin-agent |
| D-U7 | Chi tiết: hồ sơ | `handle`, `displayName`, `headline`, `bio` (cắt 500 ký tự), quốc tịch, `expatType`, khu nhà (`homeAreaId`), `inDaNangSince`, `visibility`, `avatarUrl`, ngày tạo, `lastActiveAt`. **Không** `birthYear`, `gender` (không có lý do vận hành ở A1) | doc 01 Đ1; C-6 |
| D-U8 | Chi tiết: tài khoản | `role`, `status`, `suspendedUntil`, `suspensionReason`, `emailMasked`, `emailVerified`, `phoneMasked`, `phoneVerified`, `locale`, `deletionRequestedAt`, `anonymizedAt`, `deletedAt`, `legalHoldUntil` (chỉ cờ có/không + ngày). `suspensionReason` là văn bản staff nhập, hiển thị cho admin+ | Mặc định BA |
| D-U9 | Chi tiết: trust | `trustLevel`, `trustLevelChangedAt`, và danh sách tín hiệu (`type`, `status`, `weight`, `verifiedAt`, `revokedAt`; **không** `metadata`, `evidenceId`, `issuedBy`) tối đa 20 gần nhất, kèm bộ đếm `eventsHostedCount`, `eventsAttendedCount`, `noShowCount`. Tín hiệu âm (`penalty_*`) hiển thị cho admin+ (vẫn không lộ cho member, S5-DoD-5) | docs/checklists M4 S5-DoD-5; 0009_trust_signals.sql |
| D-U10 | Chi tiết: hoạt động | (a) Sự kiện đã tổ chức: 10 gần nhất (`id`, `title`, `status`, `startsAt`, link `/events/[id]`), kể cả `suspended`/`taken_down`, **loại `draft`**. (b) RSVP: 10 gần nhất (`eventId`, `eventTitle`, `status`, `createdAt`), loại RSVP của sự kiện `draft`. (c) Bài đăng: 10 gần nhất kể cả `hidden`/`removed` (`id`, `kind`, `status`, `createdAt`, trích 140 ký tự thân bài). Mỗi mục kèm tổng số. Không có bình luận ở v1 | Mặc định BA |
| D-U11 | Chi tiết: phiên | Số phiên đang sống và 5 phiên gần nhất: `platform`, `createdAt`, `expiresAt`, `revokedAt`, `revokedReason`. **Không** IP, user-agent, `deviceId`, hash token (IP là dữ liệu cá nhân; hiển thị đi kèm `pii_access` ở follow-up) | auth_sessions schema; C-6 |
| D-U12 | Không tồn tại | `GET /admin/users/{id}` với id không có (hoặc không phải UUID) → 404 `USER_NOT_FOUND` / 400 validation. Không phân biệt "đã ẩn danh" với "không có" khi `includeDeleted=false` | Mặc định BA |
| D-U13 | Đọc không audit | Đọc dữ liệu đã che ở A1 **không** ghi audit (chưa có bảng, và không có PII thô). Điều này phải được kiểm lại khi thêm reveal | S-10; Q-1 |

### 7.2 Hợp đồng A1 (ngôn ngữ nghiệp vụ)

- **Danh sách người dùng**: nhận `q`, `role[]`, `status[]`, `trustMin`, `trustMax`, `joinedFrom`, `joinedTo`, `includeDeleted`, `sort`, `dir`, `cursor`, `limit`. Trả `items[]` (`id`, `handle`, `displayName`, `avatarUrl`, `role`, `status`, `trustLevel`, `emailMasked`, `emailVerified`, `phoneMasked` hoặc null, `phoneVerified`, `createdAt`, `lastActiveAt`, `deleted` boolean) và `nextCursor` (null khi hết). Tham số lạ hoặc sai kiểu bị từ chối, không bỏ qua ngầm.
- **Chi tiết người dùng**: một lần đọc trả các khối D-U7 đến D-U11. Mỗi khối danh sách có `items` và `total`.
- Schema phản hồi là allow-list (`@SerializeOptions`), loại mọi trường thừa. Hai bảng `users` và `profiles` nối trong; user thiếu profile không thuộc trạng thái hợp lệ nhưng không được làm sập danh sách (bỏ qua hàng, ghi log mức warn không chứa PII).

### 7.3 Acceptance criteria A1

- **A1-AC-1 (Happy, danh sách):** GIVEN admin đăng nhập, DB có 30 user WHEN mở `/users` THEN gọi `GET /api/v1/admin/users?limit=25&sort=createdAt&dir=desc`, hiện 25 hàng theo `createdAt` giảm dần với đủ cột D-U6, hàng cuối có nút "Next page" (vì còn 5 user), tiêu đề cột "Joined" có dấu sắp xếp giảm dần.
- **A1-AC-2 (Happy, tìm kiếm):** GIVEN có user `handle=anna_dn`, `displayName="Anna Müller"`, `email=anna.m@gmail.com` WHEN admin nhập `anna` THEN thấy user đó (khớp tiền tố handle); nhập `müll` thấy user đó (khớp chứa trong tên); nhập `anna.m@gmail.com` thấy đúng 1 user; nhập `ANNA.M@GMAIL.COM` vẫn thấy (không phân biệt hoa thường); nhập `anna.m@gm` **không** thấy; nhập `gmail` **không** thấy user nào theo email.
- **A1-AC-3 (Happy, lọc):** GIVEN user rải đều 5 role và 3 status WHEN chọn role `moderator`+`admin`, status `active`, trust 2-4 THEN request mang đúng tham số, mọi hàng trả về khớp cả ba điều kiện, URL phản ánh bộ lọc; tải lại trang giữ nguyên bộ lọc và kết quả.
- **A1-AC-4 (Happy, ngày tham gia):** GIVEN lọc "Joined" từ 2026-09-15 đến 2026-09-17 theo lịch giờ VN WHEN gửi THEN `joinedFrom=2026-09-14T17:00:00.000Z`, `joinedTo=2026-09-17T17:00:00.000Z`; user tạo lúc `2026-09-17T16:59:59Z` hiện, user tạo đúng `2026-09-17T17:00:00Z` **không** hiện.
- **A1-AC-5 (Happy, chi tiết):** GIVEN user có 3 sự kiện đã tổ chức (1 `taken_down`, 1 `draft`), 12 RSVP, 2 bài (1 `hidden`) WHEN admin mở `/users/{id}` THEN hiện hồ sơ, tài khoản, trust (kèm tín hiệu), "Events hosted" 2 mục (không có draft) và `total=2`, "RSVPs" 10 mục và `total=12`, "Posts" 2 mục kể cả `hidden`, và "Sessions".
- **A1-AC-6 (Edge, cursor):** GIVEN đúng 25 user khớp bộ lọc WHEN `limit=25` THEN `nextCursor` là null và không hiện nút "Next page". GIVEN 26 user WHEN bấm "Next page" THEN trang 2 có đúng 1 hàng, không trùng id với trang 1, URL có `cursor=...`, nút Back của trình duyệt quay về trang 1 với cùng bộ lọc.
- **A1-AC-7 (Edge, cursor sai):** GIVEN cursor lấy từ `sort=createdAt` WHEN gọi với `sort=trustLevel` giữ nguyên cursor, hoặc cursor bị sửa ký tự THEN 400 `{ messageKey: 'errors.admin.cursorInvalid' }`; UI xoá cursor và nạp lại trang đầu kèm thông báo "The list changed. Showing the first page."
- **A1-AC-8 (Edge, rỗng):** GIVEN DB không có user nào khớp WHEN lọc THEN hiện EmptyState "No users match your filters" kèm nút "Clear filters" (xoá hết tham số trừ `sort`/`dir`); GIVEN `q` có ký tự `%` hoặc `_` THEN chỉ khớp ký tự đó theo nghĩa đen (không trả toàn bộ).
- **A1-AC-9 (Edge, includeDeleted):** GIVEN một user đã xoá mềm và một user đã ẩn danh WHEN `includeDeleted` tắt THEN không có trong danh sách; WHEN bật THEN có trong danh sách với huy hiệu "Deleted"/"Anonymised", và mở chi tiết trả `deletedAt`/`anonymizedAt`.
- **A1-AC-10 (Edge, giá trị trống):** GIVEN user chỉ có email (không phone) và user chỉ có phone WHEN xem THEN `phoneMasked` là null và UI hiện "No phone"; email null hiện "No email"; `lastActiveAt` null hiện "Never" và xếp cuối khi sắp xếp theo cột này ở cả hai hướng.
- **A1-AC-11 (Error):** GIVEN mất mạng hoặc API 5xx WHEN mở `/users` THEN skeleton biến thành thẻ lỗi "Could not load users" + "Check your connection and try again." + nút "Retry" gọi lại đúng bộ lọc hiện tại; GIVEN `GET /admin/users/{id}` trả 404 THEN trang hiện "This user could not be found" + liên kết về danh sách (không trang trắng); GIVEN tham số sai (`trustMin=7`, `limit=500`, `role=boss`) THEN 400 validation, không có dữ liệu.
- **A1-AC-12 (Quyền):** GIVEN không token THEN 401; GIVEN token `member`, `curator`, `moderator` THEN 403 `ROLE_NOT_ALLOWED` cho cả danh sách và chi tiết; GIVEN `admin` và `super_admin` THEN 200. GIVEN moderator đăng nhập console THEN sidebar không có "Users", gõ thẳng `/users` thấy màn không đủ quyền (qua `RequireRole`) và trình duyệt **không** gọi `/admin/users` (assert network). Có test API đủ 5 vai.
- **A1-AC-13 (Dữ liệu cá nhân):** GIVEN mọi response của hai endpoint WHEN duyệt JSON THEN không có khoá `email`, `phone`, `passwordHash`, `ip`, `userAgent`, `birthYear`, `gender`, `deviceId`, `tokenHash`, `metadata`; `emailMasked` khớp mẫu `^.\*{3}@.+$`, `phoneMasked` chỉ lộ tối đa 3 ký tự số cuối. Test có chuỗi `<script>` trong `displayName` thì hiển thị là văn bản.
- **A1-AC-14 (Audit):** GIVEN các thao tác xem/lọc/tìm WHEN hoàn tất THEN không có bản ghi nào của `users`, `profiles`, `auth_sessions`, `trust_signals` bị thay đổi; log API không chứa giá trị `q` khi `q` là email/phone, không chứa `handle`/`displayName`.
- **A1-AC-15 (i18n):** GIVEN `en` rồi `vi` WHEN mở `/users` và `/users/[id]` ở các trạng thái (đang tải, dữ liệu, rỗng, lỗi, không đủ quyền) THEN mọi chuỗi (cột, bộ lọc, huy hiệu role/status/trust, nhãn tìm kiếm, `MetricHint` nếu có số tổng hợp, empty, lỗi) đúng ngôn ngữ, không lộ key thô `admin.users.*`; ngày giờ theo `Asia/Ho_Chi_Minh`; role dùng `role.*.label` (kể cả `role.member.label` mới), status dùng nhãn riêng không hiện enum thô `deactivated`.
- **A1-AC-16 (Responsive):** GIVEN viewport 768, 1280, 1920 px WHEN mở `/users` THEN bảng cuộn ngang bên trong khung (không cuộn cả trang), hàng đầu cố định khi cuộn dọc, cột Name và Handle luôn thấy, thanh lọc xuống dòng không bị cắt chuỗi VI dài nhất.

### 7.4 i18n key mới A1 (cùng đổi `en.json`, `vi.json`, `message-keys.ts`)

| Key | EN | VI |
|---|---|---|
| `admin.nav.users` | Users | Người dùng |
| `role.member.label` | Member | Thành viên |
| `admin.users.title` | Users | Người dùng |
| `admin.users.search.label` | Search users | Tìm người dùng |
| `admin.users.search.placeholder` | Name, username, exact email or phone | Tên, tên người dùng, email hoặc số điện thoại chính xác |
| `admin.users.search.hint` | Email and phone only match in full. | Email và số điện thoại chỉ khớp khi nhập đầy đủ. |
| `admin.users.filter.role` | Role | Vai trò |
| `admin.users.filter.status` | Status | Trạng thái |
| `admin.users.filter.trust` | Trust level | Cấp tin cậy |
| `admin.users.filter.joined` | Joined | Ngày tham gia |
| `admin.users.filter.includeDeleted` | Include deleted accounts | Gồm tài khoản đã xoá |
| `admin.users.filter.clear` | Clear filters | Xoá bộ lọc |
| `admin.users.col.name` / `.handle` / `.role` / `.status` / `.trust` / `.email` / `.phone` / `.joined` / `.lastActive` | Name / Username / Role / Status / Trust / Email / Phone / Joined / Last active | Tên / Tên người dùng / Vai trò / Trạng thái / Cấp tin cậy / Email / Số điện thoại / Ngày tham gia / Hoạt động gần nhất |
| `admin.users.status.pending` / `.active` / `.suspended` / `.deactivated` / `.deleted` | Pending / Active / Suspended / Deactivated / Deleted | Chờ xác minh / Đang hoạt động / Đã tạm khoá / Đã vô hiệu / Đã xoá |
| `admin.users.verified` / `.unverified` | Verified / Not verified | Đã xác minh / Chưa xác minh |
| `admin.users.noPhone` / `.noEmail` / `.never` | No phone / No email / Never | Chưa có số điện thoại / Chưa có email / Chưa từng |
| `admin.users.anonymised` | Anonymised | Đã ẩn danh |
| `admin.users.next` / `.previous` | Next page / Previous page | Trang sau / Trang trước |
| `admin.users.cursorReset` | The list changed. Showing the first page. | Danh sách đã thay đổi. Đang hiện trang đầu. |
| `admin.users.empty.title` | No users match your filters | Không có người dùng nào khớp bộ lọc |
| `admin.users.error.title` / `.body` | Could not load users / Check your connection and try again. | Không tải được danh sách người dùng / Kiểm tra kết nối rồi thử lại. |
| `admin.users.detail.notFound` | This user could not be found | Không tìm thấy người dùng này |
| `admin.users.detail.back` | Back to users | Về danh sách người dùng |
| `admin.users.detail.section.profile` / `.account` / `.trust` / `.hosted` / `.rsvps` / `.posts` / `.sessions` | Profile / Account / Trust / Events hosted / RSVPs / Posts / Sessions | Hồ sơ / Tài khoản / Tin cậy / Sự kiện đã tổ chức / RSVP / Bài đăng / Phiên đăng nhập |
| `admin.users.detail.sessions.active` | {count} active sessions | {count} phiên đang hoạt động |
| `admin.users.detail.contactMasked` | Contact details are partly hidden. | Thông tin liên hệ được che một phần. |
| `admin.users.detail.trust.signals` | Trust signals | Tín hiệu tin cậy |
| `admin.users.detail.trust.hint` | The level is recomputed from signals by a scheduled job; it is not edited by hand. | Cấp tin cậy được tính lại từ các tín hiệu bằng tác vụ định kỳ, không sửa tay. |
| `errors.admin.cursorInvalid` | The page position is no longer valid. | Vị trí trang không còn hợp lệ. |
| `errors.admin.queryInvalid` | One of the filters is not valid. | Một bộ lọc không hợp lệ. |

---

## 8. PHA A2 — Quản lý sự kiện (chỉ đọc)

### 8.1 Quyết định A2

| ID | Câu hỏi | Quyết định | Nguồn |
|---|---|---|---|
| D-E1 | Ai dùng | `event.directory.view`: moderator, admin, super_admin. Curator/member: 403. Liên kết từ tên host sang `/users/[id]` chỉ hiện nếu role có `user.directory.view` (moderator thì host hiển thị dạng văn bản) | doc 01 Đ8, Đ35; Mặc định BA |
| D-E2 | Tập hợp mặc định | Mọi sự kiện `deleted_at IS NULL` ở các trạng thái `pending_review, published, suspended, taken_down, cancelled`. `draft` là nội dung riêng của người tạo: **chỉ hiện khi lọc rõ `status=draft`**, và khi đó danh sách chỉ có tiêu đề, host, ngày tạo (chi tiết không có mô tả). Ngày bắt đầu lấy từ occurrence sớm nhất chưa xoá | doc 01 Đ1 ("draft chỉ host thấy"); brief trước D-18 |
| D-E3 | RSVP/waitlist | Chỉ **số liệu gộp** theo occurrence: `confirmed`, `held`, `waitlisted`, `cancelled`, `attended`, `noShow`, `waitlistWaiting`. **Không** danh sách người tham gia (Đ21 cấm duyệt attendee tự do; chỉ mở khi có `moderation_case_id`, vào ở A4) | doc 01 Đ21 |
| D-E4 | Tìm kiếm | `q` ≥ 2 ký tự, khớp **chứa** trong `title` không phân biệt hoa thường; nếu `q` là UUID khớp `id`; nếu khớp mẫu slug thì khớp `slug` chính xác. Ký tự đại diện thoát nghĩa | Mặc định BA |
| D-E5 | Lọc | `status[]`, `areaId` (một khu, từ `AREA_SLUGS`), `startsFrom`/`startsTo` (theo giờ bắt đầu occurrence sớm nhất, C-4), `createdFrom`/`createdTo`, `hostId` (UUID) hoặc `hostHandle` (khớp chính xác), `timing` = `upcoming` (bắt đầu > now) / `past` (≤ now) / `all` (mặc định). AND giữa nhóm | event.ts:98-124 (tham chiếu quy ước); Mặc định BA |
| D-E6 | Sắp xếp | `startsAt`, `createdAt` (mặc định giảm dần), `title`. Cursor theo C-2 | C-3 |
| D-E7 | Cột bảng | Tiêu đề, trạng thái (Badge, nhãn `event.status.*`), khu vực (tên theo locale), bắt đầu (giờ VN), host (displayName + @handle), chỗ (`seatsTaken/capacity`), số chờ, ngày tạo | Mặc định BA |
| D-E8 | Chi tiết | Khối chung: `id`, `slug`, `title`, `description` (đầy đủ, trừ `draft`), khu vực, **toạ độ chính xác** (admin cần để kiểm tra; không lộ ra ngoài console), `status`, `isFeatured`, `requiredTrustLevel`, `createdAt`, `updatedAt`. Host: `id`, `handle`, `displayName`, `trustLevel`, `role`, `status` tài khoản. Danh sách **mọi** occurrence (`id`, `startsAt`, `endsAt`, `capacity`, số liệu D-E3). Đếm bình luận. Liên kết "Open public page" nếu `published` | contracts/event.ts:33-58; S-14 |
| D-E9 | Hàng đợi báo cáo | Từ A4: khối "Reports" ở chi tiết hiển thị số case đang mở trỏ tới sự kiện. Ở A2 khối này **không có** (không hiện rỗng) | Mặc định BA |
| D-E10 | Lịch sử thao tác | Từ A3: tab "History" liệt kê bản ghi `audit_logs` của sự kiện. Ở A2 chưa có tab | Mặc định BA |
| D-E11 | Đọc không audit | Như D-U13. Toạ độ chính xác và mô tả là nội dung đã công khai (trừ draft), không phải PII cá nhân | C-6 |

### 8.2 Hợp đồng A2

- **Danh sách sự kiện** nhận `q`, `status[]`, `areaId`, `startsFrom`, `startsTo`, `createdFrom`, `createdTo`, `hostId`, `hostHandle`, `timing`, `sort`, `dir`, `cursor`, `limit`. Trả `items[]` (`id`, `title`, `status`, `areaId`, `startsAt`, `endsAt`, `capacity`, `seatsTaken`, `waitlistWaiting`, `organizer {id, handle, displayName}`, `createdAt`) + `nextCursor`.
- **Chi tiết sự kiện** theo D-E8. Schema allow-list: không `description` khi `status=draft`; không email/phone của host.
- Sự kiện không có occurrence sống (không hợp lệ theo thiết kế) bị bỏ khỏi danh sách giống mọi danh sách khác, không làm sập trang.

### 8.3 Acceptance criteria A2

- **A2-AC-1 (Happy, danh sách):** GIVEN DB có sự kiện ở đủ 6 trạng thái WHEN moderator mở `/events` THEN gọi `GET /api/v1/admin/events?limit=25&sort=createdAt&dir=desc`, hiện các sự kiện **trừ `draft`**, đủ cột D-E7, trạng thái dùng nhãn `event.status.*`.
- **A2-AC-2 (Happy, lọc):** GIVEN sự kiện ở nhiều khu và nhiều host WHEN chọn status `suspended`+`taken_down`, khu "My Khe" THEN request có `status=suspended,taken_down` và `areaId=<id Mỹ Khê>`; mọi hàng khớp; URL phản ánh bộ lọc.
- **A2-AC-3 (Happy, ngày):** GIVEN lọc "Starts" từ 2026-10-03 đến 2026-10-04 giờ VN WHEN gửi THEN `startsFrom=2026-10-02T17:00:00.000Z`, `startsTo=2026-10-04T17:00:00.000Z`; sự kiện lúc `2026-10-04T16:59Z` hiện, lúc `2026-10-04T17:00Z` không hiện.
- **A2-AC-4 (Happy, tìm kiếm):** GIVEN sự kiện "Sunset Yoga at My Khe" WHEN nhập `yoga` THEN thấy; nhập `SUNSET YOGA` thấy; nhập id UUID của sự kiện thấy đúng 1 hàng.
- **A2-AC-5 (Happy, chi tiết):** GIVEN sự kiện `published` capacity 10 có 6 RSVP `confirmed`, 1 `held`, 3 `waitlisted` (waitlist `waiting`), 2 `cancelled` WHEN admin mở `/events/{id}` THEN thấy host, khu, toạ độ, 1 occurrence với `confirmed=6`, `held=1`, `waitlisted=3`, `cancelled=2`, `seatsTaken=7` (đúng `SEAT_OCCUPYING`), `waitlistWaiting=3`; **không** có tên người tham gia ở bất cứ đâu.
- **A2-AC-6 (Edge, draft):** GIVEN một `draft` WHEN không lọc status THEN không xuất hiện; WHEN lọc `status=draft` bằng admin THEN xuất hiện chỉ với tiêu đề, host, ngày tạo; mở chi tiết trả `description: null` và không có toạ độ.
- **A2-AC-7 (Edge, thời điểm):** GIVEN sự kiện bắt đầu 1 giờ trước và sự kiện bắt đầu 1 giờ sau WHEN `timing=upcoming` THEN chỉ có sự kiện thứ hai; `timing=past` chỉ có sự kiện đầu; `timing=all` có cả hai. Sự kiện đang diễn ra (đã bắt đầu, chưa kết thúc) thuộc `past` và hàng hiện nhãn "In progress" nếu `endsAt` > now.
- **A2-AC-8 (Edge, nhiều occurrence):** GIVEN dữ liệu thử có sự kiện 2 occurrence WHEN mở chi tiết THEN liệt kê đủ 2 occurrence theo `startsAt` tăng dần với số liệu riêng; danh sách dùng giờ của occurrence sớm nhất chưa xoá.
- **A2-AC-9 (Edge, đầy chỗ và chờ):** GIVEN sự kiện capacity 5 đã `seatsTaken=5` và 2 người chờ WHEN xem THEN cột chỗ hiện "5/5", cột chờ hiện 2, chi tiết hiện nhãn "Full".
- **A2-AC-10 (Edge, cursor, rỗng, lọc sai):** hành vi như A1-AC-6/7/8 với dữ liệu sự kiện; `startsFrom >= startsTo` hoặc `status=archived` → 400 validation với `errors.admin.queryInvalid`.
- **A2-AC-11 (Error):** GIVEN lỗi 5xx/mất mạng WHEN mở `/events` hoặc `/events/{id}` THEN thẻ lỗi "Could not load events" / "Could not load this event" + nút "Retry"; 404 (`EVENT_NOT_FOUND`) hiện "This event could not be found" + liên kết về danh sách.
- **A2-AC-12 (Quyền):** GIVEN không token THEN 401; `member`, `curator` THEN 403 `ROLE_NOT_ALLOWED`; `moderator`, `admin`, `super_admin` THEN 200. GIVEN moderator ở chi tiết sự kiện THEN tên host là văn bản, không có liên kết `/users/{id}` trong DOM, và gọi thẳng `/admin/users/{id}` vẫn 403. Sidebar curator không có "Events". Có test API đủ 5 vai.
- **A2-AC-13 (Dữ liệu cá nhân):** GIVEN response danh sách/chi tiết WHEN duyệt JSON THEN không có `email`, `phone`, `passwordHash`, danh sách người tham gia, `viewerRsvpStatus`; `organizer` chỉ có `id`, `handle`, `displayName` (danh sách) và thêm `trustLevel`, `role`, `status` (chi tiết).
- **A2-AC-14 (Audit):** GIVEN các thao tác xem/lọc WHEN hoàn tất THEN không có mutation trên `events`, `event_occurrences`, `rsvps`; log API không chứa tiêu đề hay mô tả sự kiện draft.
- **A2-AC-15 (i18n):** GIVEN `en` và `vi` WHEN mở `/events` và `/events/[id]` ở mọi trạng thái THEN mọi chuỗi (cột, bộ lọc, `timing`, nhãn số liệu occurrence, `MetricHint`, empty, lỗi) đúng ngôn ngữ, không lộ key thô; tên khu theo locale; giờ theo `Asia/Ho_Chi_Minh`; tiêu đề/mô tả do người tạo hiện nguyên văn không dịch.
- **A2-AC-16 (MetricHint):** GIVEN chi tiết sự kiện hiện các con số theo occurrence WHEN focus bằng bàn phím vào dấu "?" của "Seats taken" THEN tooltip nêu: đếm RSVP `confirmed + held + attended + no_show` không xoá; không gồm `waitlisted`/`cancelled`; là số hiển thị, không dùng để quyết định nhận RSVP. Key hint có ở cả EN và VI.
- **A2-AC-17 (Responsive):** như A1-AC-16.

### 8.4 i18n key mới A2

| Key | EN | VI |
|---|---|---|
| `admin.nav.events` | Events | Sự kiện |
| `admin.events.title` | Events | Sự kiện |
| `admin.events.search.placeholder` | Event title, link name or ID | Tên sự kiện, đường dẫn hoặc mã |
| `admin.events.filter.status` / `.area` / `.starts` / `.created` / `.host` / `.timing` | Status / Area / Starts / Created / Host / When | Trạng thái / Khu vực / Bắt đầu / Ngày tạo / Người tổ chức / Thời điểm |
| `admin.events.timing.all` / `.upcoming` / `.past` | All / Upcoming / Past | Tất cả / Sắp diễn ra / Đã qua |
| `admin.events.inProgress` | In progress | Đang diễn ra |
| `admin.events.full` | Full | Đã đầy |
| `admin.events.col.title` / `.status` / `.area` / `.starts` / `.host` / `.seats` / `.waitlist` / `.created` | Event / Status / Area / Starts / Host / Seats / Waitlist / Created | Sự kiện / Trạng thái / Khu vực / Bắt đầu / Người tổ chức / Chỗ / Hàng chờ / Ngày tạo |
| `admin.events.empty.title` | No events match your filters | Không có sự kiện nào khớp bộ lọc |
| `admin.events.error.title` / `admin.events.detail.error.title` | Could not load events / Could not load this event | Không tải được danh sách sự kiện / Không tải được sự kiện này |
| `admin.events.detail.notFound` | This event could not be found | Không tìm thấy sự kiện này |
| `admin.events.detail.draftHidden` | This is a draft. Its content is private to the organizer. | Đây là bản nháp. Nội dung chỉ người tạo xem được. |
| `admin.events.detail.occurrences` | Occurrences | Các buổi diễn ra |
| `admin.events.detail.counts.confirmed` / `.held` / `.waitlisted` / `.cancelled` / `.attended` / `.noShow` | Confirmed / Held / Waitlisted / Cancelled / Attended / No-show | Đã xác nhận / Đang giữ chỗ / Đang chờ / Đã huỷ / Đã tham dự / Vắng mặt |
| `admin.events.detail.seatsTaken` + `...Hint` | Seats taken + (hint nêu đếm/tính/cạm bẫy như A2-AC-16) | Chỗ đã dùng + (bản VI tương ứng) |
| `admin.events.detail.attendeesNote` | Attendee names are not shown here. | Tên người tham gia không hiển thị ở đây. |
| `admin.events.detail.openPublic` | Open public page | Mở trang công khai |
| `errors.admin.eventNotFound` | Event not found. | Không tìm thấy sự kiện. |

---

## 9. PHA A3 — Thao tác và audit log

### 9.1 Phạm vi thao tác

| # | Thao tác | Khoá | Từ → đến | Ghi chú |
|---|---|---|---|---|
| T1 | Khoá tài khoản | `user.suspend` | `users.status`: `active → suspended` | Vô thời hạn ở v1 (không `suspended_until`) |
| T2 | Mở khoá tài khoản | `user.suspend` | `suspended → active` | Xoá `suspension_reason`; lý do mở khoá nằm trong audit |
| T3 | Đổi role | `user.role.assign` | giữa `member`, `curator`, `moderator`, `admin` | Chỉ super_admin; cấp `super_admin` nằm ngoài v1 |
| T4 | Ẩn sự kiện | `content.hide` | `events.status`: `published|pending_review → suspended` | Đảo ngược được |
| T5 | Khôi phục sự kiện | `content.hide` | `suspended → published` | |
| T6 | Gỡ sự kiện | `event.takedown` | `published|pending_review|suspended → taken_down` | **Không đảo ngược** ở v1 (hợp đồng event.ts:3-7) |

### 9.2 Quyết định A3

| ID | Câu hỏi | Quyết định | Nguồn |
|---|---|---|---|
| D-R1 | Lý do bắt buộc | Mọi thao tác có `reason` văn bản 20-255 ký tự (sau khi cắt khoảng trắng), do staff nhập; thiếu → 400 `errors.admin.reasonRequired`. Ràng buộc có ở DB (`CHECK` trên `audit_logs` cho `actor_type='staff'`) | doc 01 §8.3 quy tắc 3, Đ35; doc 14 §11.1 |
| D-R2 | Xác nhận hai bước | UI: bước 1 mở hộp thoại chọn thao tác + nhập lý do; bước 2 là màn **tóm tắt** ("Bạn sắp ... người X ... lý do ..."). Riêng thao tác không đảo ngược hoặc ảnh hưởng staff (T3, T6, và T1 khi đích là staff) bước 2 còn bắt gõ lại định danh đích (`handle` của người dùng, `slug` của sự kiện). API: body phải có `confirm: true`; thiếu → 400 `errors.admin.confirmationRequired` (để một cú gọi lỡ tay không thành thao tác) | Yêu cầu chủ dự án; Mặc định BA |
| D-R3 | Quy tắc cứng đổi role | (1) `actorId != targetId`. (2) Chỉ `super_admin`. (3) Chỉ các giá trị `member|curator|moderator|admin`; muốn cấp `super_admin` → ngoài v1 (four-eyes chưa có). (4) Đích phải `status=active`. (5) Nâng lên `moderator` hoặc `admin` yêu cầu `trust_level >= 3`; vi phạm → 409 `errors.admin.trustTooLow`. (6) Hạ một `super_admin` xuống bất kỳ role nào khác → bị chặn ở v1 vì cần four-eyes; nếu số `super_admin` đang `active` sẽ < 2 sau thao tác → 409 `errors.admin.lastSuperAdmin` (INV-3). (7) Role mới = role cũ → 409 `errors.admin.invalidTransition`. (8) Đổi role **thu hồi mọi phiên** của đích và có hiệu lực tức thì | doc 01 §8.3 quy tắc 1-5, §9.4; doc 14 §11.1, X-J11-01/07 |
| D-R4 | Quy tắc cứng khoá tài khoản | (1) Không tự khoá chính mình (403 `errors.admin.selfAction`). (2) `admin` khoá được `member|curator|moderator`; **không** khoá `admin`/`super_admin` (403 `errors.admin.targetRoleProtected`). (3) `super_admin` khoá được mọi tài khoản trừ chính mình. (4) Khoá `super_admin` mà số `super_admin` active còn < 2 → 409 `errors.admin.lastSuperAdmin`. (5) Chỉ `active ⇄ suspended`; các trạng thái khác → 409 `errors.admin.invalidTransition`. (6) Khoá **thu hồi mọi phiên** của đích; hiệu lực tức thì (S-3) | doc 01 Đ37-Đ39; doc 14 X-J11-07 |
| D-R5 | Hệ quả khoá lên nội dung | Không tự động ẩn sự kiện/bài/RSVP của người bị khoá ở v1 (can thiệp nội dung là thao tác riêng T4-T6 hoặc quyết định ở A4). Ghi rõ vào tooltip của hộp thoại | Mặc định BA; R-4 |
| D-R6 | Quy tắc cứng sự kiện | (1) Đích phải đúng trạng thái nguồn, ngược lại 409 `errors.admin.invalidTransition` (không "bỏ qua êm"). (2) `draft` và `cancelled` không ẩn/gỡ được qua console (409). (3) Moderator không ẩn được sự kiện mà chính họ là `organizer` (403 `errors.admin.conflictOfInterest`, Đ34). (4) `taken_down` là trạng thái cuối ở v1: mọi thao tác tiếp theo → 409. (5) Sau khi ẩn/gỡ, sự kiện biến khỏi Discover/Home và RSVP mới bị từ chối (hành vi sẵn có `status='published'` ở rsvp.service.ts:65 phải được Tester xác nhận); RSVP đã có **giữ nguyên** | contracts/event.ts:3-7; event.repository.ts:285-295; doc 01 Đ34 |
| D-R7 | Đồng thời | Cập nhật có điều kiện theo trạng thái nguồn (`UPDATE ... WHERE status = <nguồn>`); không hàng nào bị đổi → 409. Hai admin bấm cùng lúc: một bên thành công, bên kia nhận 409 và thấy trạng thái mới sau khi làm mới | Mặc định BA |
| D-R8 | Nguyên tử | Thay đổi dữ liệu + bản ghi `audit_logs` (+ thu hồi phiên) trong **một transaction**; ghi audit lỗi thì thao tác không xảy ra (doc 01 INV-2, rule B5 "cùng transaction") | rule behaviors.md:114-115; checklists.md:165 |
| D-R9 | Hành động audit | `user.suspended`, `user.unsuspended`, `user.role_changed`, `event.suspended`, `event.restored`, `event.taken_down`. Khớp mẫu `^[a-z_]+\.[a-z_0-9]+$` | doc 03 §10.4 |
| D-R10 | Mức nghiêm trọng | `user.role_changed` và `event.taken_down` = `critical`; `user.suspended`, `user.unsuspended`, `event.suspended` = `warning`; `event.restored` = `notice` | S-4; Mặc định BA |
| D-R11 | Nội dung `before`/`after` | Chỉ các trường thay đổi, đã lọc PII: `{role}`, `{status}`, `{status}`; **không** email, phone, mô tả sự kiện. `entity_type` = `user` hoặc `event`, `entity_id` = id đích | doc 03 §10.4 |
| D-R12 | Ai xem Audit log | `audit_log.view`: moderator (chỉ dòng `actor_user_id` = chính mình), admin (mọi dòng **trừ** `actor_role_at_time='super_admin'`), super_admin (tất cả). member/curator 403. Lọc theo quyền làm ở server (không dựa vào UI) | doc 01 Đ48-Đ51 |
| D-R13 | Trang Audit log | Bảng: thời gian (giờ VN), người thực hiện (handle + role tại thời điểm), hành động, đối tượng (`entity_type` + liên kết sang chi tiết nếu role có quyền xem), mức nghiêm trọng, lý do (cắt, tooltip đầy đủ), nút mở rộng xem `before → after`. Lọc: `actorId`, `action` (nhiều), `entityType`, `entityId`, `severity`, `from`/`to` (C-4). Sắp xếp duy nhất: mới nhất trước (`created_at DESC, id DESC`). Cursor C-2. **Không trả `ip`, `userAgent`** ở v1 (lưu trong DB nhưng chưa hiển thị) | doc 03 §10.4; Mặc định BA |
| D-R14 | Bất biến | Không endpoint UPDATE/DELETE cho `audit_logs`. DB chặn UPDATE/DELETE bằng trigger (owner `dnc` bỏ qua REVOKE, xem mẫu 0009). Ngoại lệ duy nhất cho job tương lai: đặt `ip`, `user_agent` về NULL | 0009_trust_signals.sql:11-20; doc 03 §10.4 |
| D-R15 | Hiệu lực tức thì | Sau T1/T3, mọi request kế tiếp của đích bằng access token cũ phải bị từ chối: T1 → 403 `ACCOUNT_NOT_ACTIVE` (`errors.auth.accountSuspended`); T3 → 401 `UNAUTHENTICATED`-họ (buộc đăng nhập lại, vì claim role đã lỗi thời). Refresh token đã bị thu hồi. Cơ chế do Tech Lead chọn (S-3) | doc 14 X-J11-07; Q-2 |
| D-R16 | Nút trên UI | Nút thao tác chỉ **tồn tại trong DOM** nếu role đủ quyền và trạng thái cho phép (không phải chỉ `disabled`): nút "Change role" không có trong DOM với admin (AC-J11-01). API vẫn là hàng rào thật | doc 14 AC-J11-01 |
| D-R17 | Tách A3 khỏi A4 | A3 chỉ ghi `audit_logs`. Khi A4 vào, các thao tác T1, T4-T6 cũng chèn `moderation_actions` (với `case_id` NULL) trong cùng transaction (thẻ "A4-retrofit"). Không backfill dữ liệu cũ | S-1; M4-4; Q-6 |

### 9.3 DDL đề xuất `0010_audit_logs.sql` (Tech Lead chốt)

Theo doc 03 §10.4, điều chỉnh cho thực tế repo. Khác doc: **không phân vùng** ở v1 (quy mô vài chục bản ghi/ngày; PK rút còn `id`; Tech Lead có thể chọn phân vùng ngay nếu muốn tránh viết lại bảng, Q-5), và bất biến bằng trigger.

```sql
CREATE TABLE audit_logs (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  actor_user_id      uuid,                       -- no FK: survives anonymisation
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
-- Trigger: reject DELETE; reject UPDATE except ip / user_agent set to NULL.
-- Grants to dnc_app: SELECT, INSERT, UPDATE (ip, user_agent).
```

Không cần migration cho khoá tài khoản và đổi role (dùng cột sẵn có). Ghi `suspension_reason` cho T1 là bản sao của `reason` (hiển thị cho admin trong chi tiết A1); `suspended_until` luôn NULL ở v1.

### 9.4 Hợp đồng A3 (ngôn ngữ nghiệp vụ)

- **Khoá / mở khoá tài khoản**: nhận `reason`, `confirm=true`. Trả trạng thái mới của tài khoản (không kèm PII).
- **Đổi role**: nhận `role` mới, `reason`, `confirm=true`. Trả role mới.
- **Ẩn / khôi phục / gỡ sự kiện**: ba hành động riêng, mỗi hành động nhận `reason`, `confirm=true`. Trả trạng thái mới.
- **Danh sách audit log**: nhận `actorId`, `action[]`, `entityType`, `entityId`, `severity[]`, `from`, `to`, `cursor`, `limit`; trả `items[]` (`id`, `createdAt`, `actor {id, handle, role}`, `action`, `entityType`, `entityId`, `severity`, `reason`, `before`, `after`) + `nextCursor`. Phạm vi hàng theo D-R12, do server áp.
- Thay đổi thành công trả 200 với đối tượng mới; thất bại trả mã ở D-R3/D-R4/D-R6, body phẳng `{ code, messageKey }`.

### 9.5 Acceptance criteria A3

- **A3-AC-1 (Happy, khoá):** GIVEN admin ở `/users/{id}` của member `active` WHEN bấm "Suspend account", nhập lý do 25 ký tự, qua màn tóm tắt, xác nhận THEN `POST` trả 200 và `status=suspended`; trang hiện huy hiệu "Suspended" và lý do; `audit_logs` có đúng 1 dòng `action='user.suspended'`, `entity_type='user'`, `entity_id=<id>`, `actor_user_id=<admin>`, `actor_role_at_time='admin'`, `before={status:'active'}`, `after={status:'suspended'}`, `reason` khớp, `severity='warning'`.
- **A3-AC-2 (Happy, hiệu lực tức thì):** GIVEN member đang giữ access token còn hạn 10 phút WHEN admin khoá thành công THEN request kế tiếp của member (ví dụ `GET /api/v1/auth/me` hoặc RSVP) trả 403 `ACCOUNT_NOT_ACTIVE` với `messageKey: 'errors.auth.accountSuspended'`; `POST /auth/refresh` bằng cookie cũ bị từ chối; `auth_sessions` của user có `revoked_at` khác NULL; đăng nhập lại trả 403 `ACCOUNT_NOT_ACTIVE`.
- **A3-AC-3 (Happy, mở khoá):** GIVEN user `suspended` WHEN admin mở khoá với lý do ≥ 20 ký tự THEN `status=active`, `suspension_reason` về NULL, audit `user.unsuspended` (`before.status='suspended'`, `after.status='active'`); user đăng nhập lại được.
- **A3-AC-4 (Happy, đổi role):** GIVEN super_admin, đích là member `active`, `trust_level=3` WHEN đổi sang `moderator` với lý do hợp lệ, xác nhận hai bước (gõ lại handle) THEN `users.role='moderator'`, mọi phiên của đích bị thu hồi, audit `user.role_changed` với `before.role='member'`, `after.role='moderator'`, `severity='critical'`; đích gọi API với token cũ nhận 401 và phải đăng nhập lại.
- **A3-AC-5 (Happy, ẩn sự kiện):** GIVEN moderator ở `/events/{id}` của sự kiện `published` WHEN bấm "Suspend event" với lý do hợp lệ THEN `status=suspended`, audit `event.suspended`; sự kiện biến khỏi `GET /api/v1/events` và `/discover`; `POST` RSVP mới trả lỗi từ chối (không 5xx); RSVP đã có giữ nguyên `confirmed`.
- **A3-AC-6 (Happy, khôi phục và gỡ):** GIVEN sự kiện `suspended` WHEN moderator "Restore" THEN `published` và audit `event.restored` (`notice`); GIVEN sự kiện `suspended` WHEN admin "Take down" (gõ lại slug) THEN `taken_down`, audit `event.taken_down` (`critical`), không còn nút nào đảo ngược; moderator không thấy nút "Take down".
- **A3-AC-7 (Edge, lý do ngắn/trống):** GIVEN lý do 19 ký tự hoặc toàn khoảng trắng hoặc dài 256 WHEN gửi THEN 400 `errors.admin.reasonRequired`; không đổi dữ liệu, không có dòng audit; UI hiện đếm ký tự và chặn nút xác nhận.
- **A3-AC-8 (Edge, thiếu confirm):** GIVEN thân yêu cầu không có `confirm: true` WHEN gọi trực tiếp THEN 400 `errors.admin.confirmationRequired`; không đổi dữ liệu.
- **A3-AC-9 (Edge, tự thao tác):** GIVEN admin hoặc super_admin WHEN khoá hoặc đổi role chính mình THEN 403 `errors.admin.selfAction`; không có dòng audit.
- **A3-AC-10 (Edge, role được bảo vệ):** GIVEN admin WHEN khoá một `admin` hoặc `super_admin` THEN 403 `errors.admin.targetRoleProtected`; GIVEN admin WHEN gọi đổi role THEN 403 `ROLE_NOT_ALLOWED` (không phải 404); GIVEN super_admin muốn cấp `super_admin` hoặc hạ một `super_admin` THEN bị từ chối với `errors.admin.invalidTransition`.
- **A3-AC-11 (Edge, INV-3):** GIVEN đúng 2 `super_admin` active WHEN super_admin A khoá super_admin B THEN 409 `errors.admin.lastSuperAdmin`; trạng thái không đổi.
- **A3-AC-12 (Edge, trust quá thấp):** GIVEN member `trust_level=2` WHEN nâng lên `moderator` THEN 409 `errors.admin.trustTooLow`; GIVEN đích `status=suspended` WHEN nâng role THEN 409 `errors.admin.invalidTransition`.
- **A3-AC-13 (Edge, đua):** GIVEN hai admin cùng khoá một user trong cùng giây WHEN cả hai gửi THEN đúng 1 thành công (200), 1 nhận 409 `errors.admin.invalidTransition`; `audit_logs` có đúng 1 dòng `user.suspended`.
- **A3-AC-14 (Edge, trạng thái nguồn sai):** GIVEN sự kiện `draft`, `cancelled` hoặc `taken_down` WHEN gọi ẩn/khôi phục/gỡ THEN 409 `errors.admin.invalidTransition`; UI không hiện nút tương ứng. GIVEN user `deleted`/`pending` WHEN gọi khoá THEN 409.
- **A3-AC-15 (Edge, xung đột lợi ích):** GIVEN moderator là `organizer` của sự kiện WHEN ẩn sự kiện đó THEN 403 `errors.admin.conflictOfInterest`; không có dòng audit.
- **A3-AC-16 (Error, atomic):** GIVEN lỗi khi ghi `audit_logs` (mô phỏng) WHEN thực hiện khoá THEN toàn bộ transaction roll back: `users.status` vẫn `active`, phiên không bị thu hồi, UI hiện "Could not complete this action. Nothing was changed." + nút "Try again"; GIVEN mất mạng giữa chừng THEN UI không báo thành công, sau khi làm mới trang hiện trạng thái thật.
- **A3-AC-17 (Quyền):** GIVEN token `member`, `curator` THEN mọi route thao tác 403 `ROLE_NOT_ALLOWED`; `moderator` gọi khoá/đổi role/gỡ → 403; `admin` gọi đổi role → 403; chỉ `super_admin` đổi role được. DOM của admin không có nút "Change role"; DOM của moderator không có "Suspend account", "Change role", "Take down". Test API đủ 5 vai cho từng thao tác.
- **A3-AC-18 (Audit, bất biến):** GIVEN bảng `audit_logs` WHEN chạy `UPDATE audit_logs SET reason='x'` hoặc `DELETE` bằng chính tài khoản DB mà API dùng THEN lỗi (trigger), 0 hàng bị đổi; riêng `UPDATE audit_logs SET ip = NULL` được phép. Mỗi thao tác thành công trong AC-1..6 sinh **đúng 1** dòng; thao tác bị từ chối (4xx) sinh **0** dòng.
- **A3-AC-19 (Audit, xem):** GIVEN dữ liệu audit do moderator M1, admin A1, super_admin S1 tạo WHEN M1 mở `/audit-log` THEN chỉ thấy dòng của M1; WHEN A1 mở THEN thấy dòng của M1 và A1, không thấy dòng của S1; WHEN S1 mở THEN thấy tất cả; WHEN curator/member gọi `GET /admin/audit-logs` THEN 403. Lọc `action=user.role_changed`, `severity=critical`, khoảng ngày (C-4) trả đúng tập; `before → after` mở rộng được; không có `ip`/`userAgent` trong JSON.
- **A3-AC-20 (Dữ liệu cá nhân):** GIVEN dòng audit vừa tạo WHEN kiểm `before`/`after` THEN chỉ chứa `role` hoặc `status`; không email, phone, mô tả; `reason` hiển thị cho đúng các role xem được dòng đó.
- **A3-AC-21 (i18n):** GIVEN `en` và `vi` WHEN mở hộp thoại thao tác (hai bước), trang Audit log, mọi thông báo lỗi THEN mọi chuỗi đúng ngôn ngữ; nhãn hành động audit (`user.role_changed` → "Role changed"/"Đã đổi vai trò") không lộ key thô; lỗi dùng `messageKey` của server qua i18n (không "generic error" khi server đã trả key).
- **A3-AC-22 (Responsive):** như A1-AC-16; hộp thoại thao tác dùng được ở 768 px, nút xác nhận ≥ 44 px, bước 2 không cuộn ngang.

### 9.6 i18n key chính A3 (Tech Lead/BA hoàn thiện khi cắt thẻ)

| Key | EN | VI |
|---|---|---|
| `admin.nav.auditLog` | Audit log | Nhật ký thao tác |
| `admin.action.suspendUser` / `.unsuspendUser` / `.changeRole` / `.suspendEvent` / `.restoreEvent` / `.takeDownEvent` | Suspend account / Restore account / Change role / Suspend event / Restore event / Take down event | Tạm khoá tài khoản / Mở khoá tài khoản / Đổi vai trò / Ẩn sự kiện / Khôi phục sự kiện / Gỡ sự kiện |
| `admin.action.reason.label` / `.hint` / `.counter` | Reason / At least 20 characters. Recorded in the audit log. / {count}/255 | Lý do / Tối thiểu 20 ký tự. Được ghi vào nhật ký thao tác. / {count}/255 |
| `admin.action.review.title` / `.confirm` / `.cancel` | Review before you confirm / Confirm / Cancel | Xem lại trước khi xác nhận / Xác nhận / Huỷ |
| `admin.action.typeToConfirm` | Type {value} to confirm | Gõ {value} để xác nhận |
| `admin.action.irreversible` | This cannot be undone. | Không thể hoàn tác. |
| `admin.action.suspendUserEffect` | The person is signed out everywhere and cannot sign in. Their events and posts stay as they are. | Người này bị đăng xuất khỏi mọi thiết bị và không đăng nhập lại được. Sự kiện và bài đăng của họ giữ nguyên. |
| `admin.action.failed` | Could not complete this action. Nothing was changed. | Không thực hiện được thao tác này. Chưa có gì bị thay đổi. |
| `admin.audit.title` / `.col.time` / `.col.actor` / `.col.action` / `.col.target` / `.col.severity` / `.col.reason` | Audit log / Time / Actor / Action / Target / Severity / Reason | Nhật ký thao tác / Thời gian / Người thực hiện / Hành động / Đối tượng / Mức độ / Lý do |
| `admin.audit.action.user.suspended` / `...unsuspended` / `...role_changed` / `event.suspended` / `...restored` / `...taken_down` | Account suspended / Account restored / Role changed / Event suspended / Event restored / Event taken down | Đã tạm khoá tài khoản / Đã mở khoá tài khoản / Đã đổi vai trò / Đã ẩn sự kiện / Đã khôi phục sự kiện / Đã gỡ sự kiện |
| `admin.audit.severity.info` / `.notice` / `.warning` / `.critical` | Info / Notice / Warning / Critical | Thông tin / Lưu ý / Cảnh báo / Nghiêm trọng |
| `admin.audit.scope.own` / `.noSuperAdmin` | Showing your own actions only. / Super admin actions are not shown. | Chỉ hiện thao tác của bạn. / Thao tác của super admin không được hiển thị. |
| `admin.audit.empty.title` | No audit entries match your filters | Không có bản ghi nào khớp bộ lọc |
| `errors.admin.reasonRequired` | Enter a reason of 20 to 255 characters. | Nhập lý do từ 20 đến 255 ký tự. |
| `errors.admin.confirmationRequired` | Confirm the action to continue. | Hãy xác nhận thao tác để tiếp tục. |
| `errors.admin.selfAction` | You cannot do this to your own account. | Bạn không thể làm điều này với chính tài khoản của mình. |
| `errors.admin.targetRoleProtected` | Your role cannot do this to that account. | Vai trò của bạn không thể làm điều này với tài khoản đó. |
| `errors.admin.lastSuperAdmin` | At least two active super admins must remain. | Phải còn ít nhất hai super admin đang hoạt động. |
| `errors.admin.trustTooLow` | The account needs trust level 3 or higher for this role. | Tài khoản cần cấp tin cậy 3 trở lên để nhận vai trò này. |
| `errors.admin.invalidTransition` | This is no longer possible in the current state. Refresh and try again. | Hiện không thể thực hiện ở trạng thái này. Hãy làm mới và thử lại. |
| `errors.admin.conflictOfInterest` | You cannot act on your own event. | Bạn không thể xử lý sự kiện của chính mình. |

---

## 10. PHA A4 — Hàng đợi kiểm duyệt

### 10.1 Quyết định A4

| ID | Câu hỏi | Quyết định | Nguồn |
|---|---|---|---|
| D-M1 | Đối tượng báo cáo được | `event`, `post`, `comment`, `user` (hồ sơ). Backend nhận cả bốn từ ngày đầu. Tin nhắn, ảnh, review: ngoài v1. Không báo cáo nội dung của chính mình (400 `errors.report.ownContent`) | doc 05 §13.2 (+`post`, S-5); M4-1 "hoạt động và người dùng" |
| D-M2 | Ai báo cáo | Thành viên đăng nhập `trust_level >= 1` (mọi role). T0 → 403 `TRUST_LEVEL_TOO_LOW` kèm đường đạt: xác minh email (cách đạt T1). Guest: **ngoài v1** (cần CAPTCHA + hash IP, Đ33) | doc 05 §13.10; doc 01 Đ33 |
| D-M3 | Lý do báo cáo | Người dùng chọn 1 trong **12 nhóm** (§16.1 doc 05): `danger, harassment, sexual, hate, scam, ghost_event, impersonation, spam, privacy, illegal, unsafe_setup, other`; mô tả tuỳ chọn ≤ 2000 ký tự. `reason_code` 30 giá trị (doc 05 §13.2) do **moderator chọn khi quyết định**, từ danh sách ánh xạ của nhóm đó. Không ảnh chụp đính kèm ở v1 | doc 05 §16.1, §7.6; Mặc định BA (tránh lưu đoán sai) |
| D-M4 | Mức khởi tạo | Suy từ nhóm: `danger, illegal, privacy` → `critical`; `harassment, sexual, hate, scam, ghost_event, impersonation, unsafe_setup` → `high`; `spam` → `normal`; `other` → `low`. Moderator đổi được, mỗi lần đổi ghi `moderation_actions` loại `severity_changed` kèm lý do. Bảng này cần Founder duyệt vì `critical` kích hoạt ẩn tự động và SLA 2 giờ | doc 05 §7.2 (V-01..V-28), §7.3; Mặc định BA; Q-4 |
| D-M5 | SLA | `sla_due_at = first_reported_at +` TTFR: critical 2 giờ, high 12 giờ, normal 48 giờ, low 7 ngày (đồng hồ thật 24/7 cho **mọi** mức ở v1; doc 05 chạy giờ hành chính cho mức dưới critical, đơn giản hoá, bản đồng hồ giờ hành chính là follow-up). Mức tăng thì `sla_due_at` giữ hạn sớm hơn. `first_response_at` đặt khi moderator **nhận case** lần đầu. Hiển thị đếm ngược, quá hạn nhuộm đỏ | doc 05 §7.3; M4 S5-DoD-6 |
| D-M6 | Gộp trùng | Mỗi target có tối đa **một case đang mở** (`open`, `in_review`). Report mới trúng target đó gắn vào case có sẵn (`report_count += 1`, `severity = max`), vẫn là một dòng `reports` riêng. Cùng người báo cáo lại cùng target khi case còn mở → 409 `errors.report.alreadyReported` (không tạo dòng mới); sau khi case đóng thì báo lại được. Idempotency-Key bắt buộc: gửi lại cùng khoá trả lại kết quả cũ | doc 05 §7.5, §13.3 `uq_reports_idempotency`; Mặc định BA |
| D-M7 | Ẩn tự động (fail-closed) | Report `critical` trên `event`/`post`/`comment`: nội dung chuyển ngay sang trạng thái ẩn (`events.status=suspended`; `posts/comments.status=hidden`), `moderation_cases.auto_hidden=true`, `moderation_state=under_review`, audit `actor_type='system'` (`event.suspended`...). Tài khoản người dùng **không** bị khoá tự động. Moderator khôi phục khi kết luận "không vi phạm". Đây là mặc định BA cần Founder xác nhận (rủi ro bịt miệng bằng báo cáo ác ý) | doc 05 §7.1, §7.4, P9; Q-3 |
| D-M8 | Hàng đợi | Chỉ case `open`/`in_review`. Sắp theo `severity` (critical trước) rồi `sla_due_at` tăng dần (khớp "xếp theo mức nghiêm trọng + thời gian chờ", M4-3), không dùng `priority_score`/job rescore ở v1. Lọc: `severity[]`, `status[]`, `targetType[]`, `assignee` (`me`/`unassigned`/`any`), `overdue` (bool). Cursor C-2. Dải số liệu có `MetricHint`: "Open cases", "Overdue", "Critical open" | doc 05 §7.5 (rút gọn); M4-3; C-10 |
| D-M9 | Chi tiết case | Số case (`#1042`, `case_number`), đối tượng bị báo cáo (ảnh chụp **tại thời điểm báo cáo** cạnh trạng thái hiện tại), chủ nội dung (handle, role, status, trust, số strike đang hiệu lực, lịch sử case trước), danh sách report (người báo cáo: **handle và trust**, nhóm lý do, mô tả, thời điểm), nhật ký hành động. Không có email/phone, không có danh sách người tham gia | doc 05 §7.7, §13.4; doc 01 Đ21 |
| D-M10 | Nhận case | Moderator+ nhận case cho chính mình (`POST assign`); admin gán cho người khác được. Chặn xung đột lợi ích (INV-4): không nhận/xử lý nếu là người báo cáo, chủ nội dung bị báo cáo, hoặc `organizer` của sự kiện liên quan. Enforce ở service **và** trigger DB (`organizer_id`, S-8). Case bị COI **ẩn khỏi hàng đợi** của người đó (Đ41) | doc 01 Đ34, Đ41; doc 05 §7.7, §13.4 |
| D-M11 | Quyết định | `moderation.decide`. Lựa chọn: (a) **Bỏ qua** = `no_action`, `resolution_code=no_violation`, khôi phục nội dung nếu đã ẩn tự động; (b) **Ẩn** = `content_hidden` (event → `suspended`, post/comment → `hidden`); (c) **Gỡ** = `content_removed` (event → `taken_down` cần admin+ qua `event.takedown`; post/comment → `removed`), enum cần thêm giá trị này (Q-6); (d) **Cảnh cáo** = `warning` ghi strike cho chủ nội dung, **chưa có kênh gửi** (§14); (e) **Khoá có hạn** = `suspended` với `expires_at` bắt buộc, moderator ≤ 30 ngày chỉ với đích `member`, admin không giới hạn trừ staff khác (Đ37-Đ38); `banned` ngoài v1. Mọi quyết định cần `reasonCode` (30 giá trị), `reasonNote` ≥ 20 ký tự (CHECK DB), và đóng case (`status=resolved`, `resolved_by`, `resolution_code`). Cho phép nhiều hành động trong một case (ví dụ ẩn + cảnh cáo) trước khi đóng | doc 05 §7.3, §8.1; Đ35-Đ38 |
| D-M12 | Khoá có hạn tự hết hạn | Case quyết định (e) cần tài khoản tự về `active` trong tối đa 5 phút sau `expires_at`, ghi audit `actor_type='job'`, `user.unsuspended`. Cơ chế (job BullMQ hay kiểm lười ở guard) do Tech Lead chọn | doc 05 §13.9; doc 01 S6 |
| D-M13 | Ghi và bất biến | Quyết định + cập nhật nội dung/trạng thái + `moderation_actions` + `audit_logs` + `posts/comments.moderation_state`, `report_count` trong **một transaction**. `moderation_actions` append-only (trigger, chỉ cho đặt `revoked_*`) | doc 05 §13.5; rule B5 |
| D-M14 | Người báo cáo nhận kết quả | Không có thông báo. Thay vào đó `GET /reports/mine` (web-client, trang "My reports") hiện trạng thái từng báo cáo: "Received", "Under review", "Closed - action taken", "Closed - no action needed" (chung chung, không lộ chi tiết case, danh tính moderator hay người bị báo cáo). Không bao giờ lộ người báo cáo cho người bị báo cáo | doc 05 §7.7, §13.10 |
| D-M15 | Giới hạn báo cáo | Theo tier: T1 5/ngày, T2 10, T3-T5 20 (`rl:report:{uid}`); vượt → 429 `RATE_LIMITED` + `Retry-After`. Không bao giờ tước hẳn quyền báo cáo | doc 05 §6.1, §7.9 |
| D-M16 | Nút báo cáo trên web-client | Thành phần dùng chung "Report" (sheet) với `targetType` + `targetId`: tiêu đề, trấn an ẩn danh, chọn nhóm lý do, mô tả, gửi, xác nhận; khi chọn "Someone is in danger" hiện ngay khối gọi 113/115 trước mô tả. Chuỗi UI theo doc 05 §7.6 (`safety.report.*`). A4 gắn vào trang/thẻ **sự kiện** (thuộc track này). Gắn vào **bài đăng, bình luận, hồ sơ người dùng** do track Social làm sau khi thành phần có sẵn (§10.9) | doc 05 §7.6, §16.1 |
| D-M17 | Snapshot bằng chứng | Khi tạo report, server chụp nội dung đang hiển thị (event: tiêu đề, mô tả, thời gian, khu; post/comment: thân bài; user: handle, tên, headline, bio) vào `evidence_snapshot` (bắt buộc, vì nội dung có thể bị sửa/xoá). Không nhận snapshot do client gửi | doc 05 §13.3 |
| D-M18 | Tính toàn vẹn đích | Đích không tồn tại hoặc người báo cáo không thấy được (draft của người khác, đã `removed`) → 404 (không lộ tồn tại). Đích đã `suspended`/`taken_down`/`hidden`/`removed` bởi kiểm duyệt → 409 `errors.report.targetUnavailable` hiển thị "This content is already under review." | Mặc định BA |

### 10.2 DDL đề xuất `0011_moderation.sql` (Tech Lead chốt)

Rút gọn doc 05 §13.2-13.5: bỏ `priority_score`, `corroborated`, `sla_paused_ms`, `legal_hold`, `escalated_to`, `appeals`, `blocks`, `restricted_feature_enum`, ảnh đính kèm. Thêm có chủ đích: `post` vào target, `reason_group`, `content_removed`, `case_id` nullable ở `moderation_actions`.

```sql
CREATE TYPE report_source_enum AS ENUM ('user_report','auto_detection','proactive_review','external_request');
CREATE TYPE report_target_enum AS ENUM ('user','event','post','comment');          -- doc 05 + 'post', minus unused
CREATE TYPE moderation_severity_enum AS ENUM ('critical','high','normal','low');   -- declared order = queue order
CREATE TYPE report_status_enum AS ENUM ('open','merged','resolved','rejected','withdrawn');
CREATE TYPE moderation_case_status_enum AS ENUM ('open','in_review','awaiting_info','resolved','escalated');
CREATE TYPE report_reason_group_enum AS ENUM (
  'danger','harassment','sexual','hate','scam','ghost_event',
  'impersonation','spam','privacy','illegal','unsafe_setup','other');
CREATE TYPE report_reason_enum AS ENUM ( /* the 30 values of doc 05 section 13.2 */ );
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
-- trigger trg_moderation_cases_coi: doc 05 13.4 with events.organizer_id (not host_user_id)

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
  actor_user_id         uuid REFERENCES users (id) ON DELETE RESTRICT,             -- NULL = system
  actor_role            user_role_enum,
  subject_user_id       uuid REFERENCES users (id) ON DELETE SET NULL,
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
  revoked_by_user_id    uuid REFERENCES users (id) ON DELETE SET NULL,
  revoke_reason         text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_moderation_actions_expiry
    CHECK (action_type <> 'suspended' OR expires_at IS NOT NULL OR case_id IS NULL)  -- A3 manual suspend is open-ended
);
-- trigger: append-only, only revoked_at / revoked_by_user_id / revoke_reason may change (pattern of 0009)
-- grants to dnc_app: SELECT, INSERT, UPDATE (revoked_*)
CREATE INDEX idx_moderation_actions_case ON moderation_actions (case_id, created_at DESC);
CREATE INDEX idx_moderation_actions_subject ON moderation_actions (subject_user_id, created_at DESC);
CREATE INDEX idx_moderation_actions_expiring ON moderation_actions (expires_at)
  WHERE expires_at IS NOT NULL AND revoked_at IS NULL;
```

Mục Tech Lead cần quyết: có tách `moderation_cases` hay gộp vào `reports` cho v1 (BA nghiêng về giữ cases vì gộp trùng và COI cần nó); `case_number` identity chỉ để hiển thị.

### 10.3 Hợp đồng A4 (ngôn ngữ nghiệp vụ)

- **Gửi báo cáo** (web-client, member `trust>=1`): nhận `targetType`, `targetId`, `reasonGroup`, `description` tuỳ chọn; bắt buộc `Idempotency-Key`. Trả `reportId`, `status`. Server tạo/gắn case, tính mức/SLA, chụp snapshot, ẩn tự động nếu `critical` (D-M7).
- **Báo cáo của tôi**: danh sách của chính người gọi, trả `id`, `targetType`, `createdAt`, `status` công khai (D-M14). Không `caseId`, không người xử lý.
- **Hàng đợi** (console): D-M8; mỗi mục có số case, loại + tiêu đề/trích đối tượng, mức, `slaDueAt`, `slaState` (`ok|due_soon|overdue`), số report, người được gán, `autoHidden`.
- **Chi tiết case**: D-M9.
- **Nhận case**, **đổi mức**, **quyết định**: D-M10, D-M4, D-M11. Quyết định nhận `actionType`, `reasonCode`, `reasonNote`, `expiresAt` (bắt buộc với khoá), `confirm=true`.
- Lỗi theo C-7: `errors.report.*`, `errors.admin.*`.

### 10.4 Acceptance criteria A4

- **A4-AC-1 (Happy, gửi báo cáo):** GIVEN member T1 xem sự kiện `published` của người khác WHEN mở "Report", chọn "Spam or advertising", gửi THEN `POST /api/v1/reports` (có `Idempotency-Key`) trả 201; sheet hiện "Thanks. We review every report. Reports involving safety are reviewed within 4 hours. We'll let you know the outcome."; DB có 1 `reports` (`reason_group='spam'`, `severity='normal'`, `evidence_snapshot` chứa tiêu đề sự kiện) và 1 `moderation_cases` (`status='open'`, `report_count=1`, `sla_due_at = first_reported_at + 48h`).
- **A4-AC-2 (Happy, hàng đợi):** GIVEN 4 case ở mức critical/high/normal/low với SLA khác nhau WHEN moderator mở `/moderation` THEN thứ tự: critical, high, normal, low; trong cùng mức thì `sla_due_at` sớm nhất trước; mỗi hàng có đếm ngược ("1h 59m left") dùng `MetricHint`-ready; case quá hạn nhuộm đỏ với "Overdue by 20 min".
- **A4-AC-3 (Happy, gộp trùng):** GIVEN case mở cho sự kiện E (1 report `spam`) WHEN member khác báo cáo E nhóm `scam` THEN không tạo case mới; cùng case có `report_count=2`, `severity` nâng thành `high` (max), `sla_due_at` giữ hạn sớm hơn trong hai hạn tính được; chi tiết case liệt kê **2 report riêng**.
- **A4-AC-4 (Happy, ẩn tự động):** GIVEN member báo cáo bài đăng nhóm "Someone is in danger" THEN case `critical`, `auto_hidden=true`, `posts.status='hidden'`, `moderation_state='under_review'`, bài biến khỏi feed công khai ngay trong request; audit có dòng `actor_type='system'`; sheet đã hiện khối "call 113 / 115" trước ô mô tả khi chọn lý do này.
- **A4-AC-5 (Happy, xử lý: bỏ qua):** GIVEN moderator đã nhận case có `auto_hidden=true` WHEN quyết định "Dismiss" với `reasonNote` ≥ 20 ký tự THEN `moderation_actions` có `no_action`; case `resolved` (`resolution_code='no_violation'`); nội dung được khôi phục (`posts.status='visible'`); `moderation_state='clean'`; audit ghi.
- **A4-AC-6 (Happy, xử lý: ẩn, gỡ, cảnh cáo):** GIVEN case `high` trên sự kiện WHEN moderator chọn "Hide" THEN `events.status='suspended'`, `moderation_actions.content_hidden`; WHEN admin chọn "Remove" trên sự kiện THEN `taken_down`, `content_removed`; WHEN moderator chọn "Warn" THEN `moderation_actions.warning` với `strike_weight=1`, và chi tiết case/user hiện thêm 1 strike đang hiệu lực. Mỗi quyết định sinh đúng 1 `moderation_actions` + 1 `audit_logs` trong cùng transaction.
- **A4-AC-7 (Happy, khoá có hạn):** GIVEN moderator WHEN chọn "Suspend account" cho chủ nội dung (member) với `expiresAt` = +7 ngày THEN `users.status='suspended'`, `moderation_actions.suspended` có `expires_at`, phiên bị thu hồi; WHEN quá `expires_at` THEN trong ≤ 5 phút tài khoản về `active` và audit có dòng `actor_type='job'`; moderator đặt +31 ngày → 403/400 `errors.admin.durationTooLong`.
- **A4-AC-8 (Happy, báo cáo của tôi):** GIVEN người báo cáo WHEN mở "My reports" THEN thấy báo cáo với "Under review", sau khi case đóng với hành động thấy "Closed - action taken", đóng bỏ qua thấy "Closed - no action needed"; JSON không chứa `caseId`, handle người bị báo cáo hay moderator.
- **A4-AC-9 (Edge, trùng người báo cáo):** GIVEN member đã báo cáo target T (case còn mở) WHEN báo cáo T lần nữa THEN 409 `errors.report.alreadyReported`, UI hiện "You already reported this. We are reviewing it."; không có dòng `reports` mới; sau khi case đóng, báo lại được và tạo case mới.
- **A4-AC-10 (Edge, idempotency):** GIVEN hai request cùng `Idempotency-Key` WHEN gửi liên tiếp (mạng chập chờn) THEN chỉ 1 dòng `reports`; request thứ hai trả cùng `reportId`; thiếu header → 400 `errors.report.idempotencyRequired`.
- **A4-AC-11 (Edge, đích):** GIVEN member báo cáo nội dung của chính mình THEN 400 `errors.report.ownContent`; GIVEN đích không tồn tại/không thấy được THEN 404; GIVEN đích đã bị kiểm duyệt ẩn THEN 409 `errors.report.targetUnavailable`.
- **A4-AC-12 (Edge, COI):** GIVEN moderator M là `organizer` của sự kiện E, hoặc người báo cáo, hoặc chủ nội dung WHEN mở hàng đợi THEN case đó **không có** trong danh sách của M; gọi trực tiếp assign/decide → 403 `errors.admin.conflictOfInterest`; chèn trực tiếp `resolved_by_user_id=M` vào DB bị trigger từ chối.
- **A4-AC-13 (Edge, SLA):** GIVEN case `high` tạo lúc 10:00 ICT WHEN 22:00 ICT chưa ai nhận THEN `slaState='overdue'`, hàng nhuộm đỏ; WHEN moderator nhận lúc 22:30 THEN `first_response_at` = 22:30 (không đổi sau đó), case vẫn hiện "Overdue" cho tới khi đóng. Case tăng mức từ `normal` lên `critical` THEN `sla_due_at` = hạn sớm hơn của hai hạn.
- **A4-AC-14 (Edge, rate limit):** GIVEN member T1 đã gửi 5 báo cáo trong ngày WHEN gửi báo cáo thứ 6 THEN 429 `RATE_LIMITED` + `Retry-After`; sheet hiện "You have reached today's report limit. Try again tomorrow." và vẫn giữ nội dung đã nhập.
- **A4-AC-15 (Edge, T0 và quyết định đồng thời):** GIVEN member `trust_level=0` WHEN bấm Report THEN 403 `TRUST_LEVEL_TOO_LOW` và UI hướng dẫn xác minh email; GIVEN hai moderator cùng quyết định một case THEN một thành công, một nhận 409 `errors.admin.invalidTransition`, không hành động trùng.
- **A4-AC-16 (Error):** GIVEN lỗi mạng khi gửi báo cáo THEN sheet giữ lý do và mô tả, hiện "We could not send your report. Try again." + nút "Try again" (dùng lại cùng `Idempotency-Key`); GIVEN hàng đợi 5xx THEN thẻ lỗi "Could not load the moderation queue" + "Retry"; GIVEN lỗi giữa chừng khi quyết định THEN rollback toàn bộ (nội dung, trạng thái, `moderation_actions`, audit cùng nguyên trạng).
- **A4-AC-17 (Quyền):** GIVEN `report.create`: không token → 401; member T0 → 403; member T1+ → 201. GIVEN hàng đợi/chi tiết/nhận/quyết định: member, curator → 403 `ROLE_NOT_ALLOWED`; moderator, admin, super_admin → 200. GIVEN moderator WHEN quyết định `event.takedown` (gỡ sự kiện) hoặc khoá tài khoản staff THEN 403. Sidebar curator/member không có "Moderation". Test API đủ 5 vai.
- **A4-AC-18 (Audit và bất biến):** GIVEN mọi quyết định THEN đúng 1 dòng `moderation_actions` (có `actor_role`, `reason_code`, `reason_note`) và 1 dòng `audit_logs`; `UPDATE moderation_actions SET reason_note=...` và `DELETE` bị trigger từ chối, chỉ `revoked_*` đổi được; `reason_note` 19 ký tự bị CHECK DB từ chối.
- **A4-AC-19 (Riêng tư):** GIVEN response gửi tới người bị xử lý hoặc tới người báo cáo ở A4 THEN không chứa `reporterUserId` hay handle người báo cáo; handle người báo cáo chỉ xuất hiện trong chi tiết case cho moderator, admin, super_admin; chi tiết case không có email/phone/IP.
- **A4-AC-20 (i18n):** GIVEN `en` và `vi` WHEN dùng sheet báo cáo trên web-client và console kiểm duyệt ở mọi trạng thái THEN mọi chuỗi (12 lý do, trấn an ẩn danh, khối 113/115, xác nhận, trạng thái "My reports", cột hàng đợi, nhãn mức, SLA, nút quyết định, lỗi) đúng ngôn ngữ, không lộ key thô `safety.report.*`/`admin.moderation.*`; đếm ngược và hạn theo `Asia/Ho_Chi_Minh`; nội dung bị báo cáo hiện nguyên văn.
- **A4-AC-21 (MetricHint):** GIVEN dải số "Open cases", "Overdue", "Critical open" WHEN focus bàn phím THEN tooltip nêu tập hợp (case `open` + `in_review`, không gồm đã gộp/đã đóng), cách tính (theo `sla_due_at` so với bây giờ), cạm bẫy (SLA chạy đồng hồ thật 24/7 ở v1; chưa có thông báo nên không ai được báo chủ động).
- **A4-AC-22 (Responsive):** console như A1-AC-16; sheet báo cáo trên web-client dùng được ở 390 px và 1280 px, vùng bấm ≥ 44 px.

### 10.5 i18n key chính A4

Console (`apps/web-admin-side`):

| Key | EN | VI |
|---|---|---|
| `admin.nav.moderation` | Moderation | Kiểm duyệt |
| `admin.moderation.title` | Moderation queue | Hàng đợi kiểm duyệt |
| `admin.moderation.kpi.open` / `.overdue` / `.critical` (+ `...Hint`) | Open cases / Overdue / Critical open (+ hint nêu tập hợp, cách tính, cạm bẫy) | Case đang mở / Quá hạn / Nghiêm trọng đang mở (+ bản VI) |
| `admin.moderation.col.case` / `.target` / `.severity` / `.sla` / `.reports` / `.assignee` | Case / Content / Severity / Time left / Reports / Assigned to | Case / Nội dung / Mức độ / Thời gian còn lại / Báo cáo / Người xử lý |
| `admin.moderation.severity.critical` / `.high` / `.normal` / `.low` | Critical / High / Normal / Low | Nghiêm trọng / Cao / Trung bình / Thấp |
| `admin.moderation.sla.left` / `.overdue` | {time} left / Overdue by {time} | Còn {time} / Quá hạn {time} |
| `admin.moderation.autoHidden` | Hidden automatically | Đã tự động ẩn |
| `admin.moderation.assign` / `.assignedToYou` | Take this case / Assigned to you | Nhận case này / Đã giao cho bạn |
| `admin.moderation.decision.dismiss` / `.hide` / `.remove` / `.warn` / `.suspend` | Dismiss / Hide / Remove / Warn / Suspend account | Bỏ qua / Ẩn / Gỡ / Cảnh cáo / Tạm khoá tài khoản |
| `admin.moderation.detail.snapshot` / `.current` / `.reports` / `.history` / `.strikes` | Content when reported / Content now / Reports / History / Active strikes | Nội dung lúc bị báo cáo / Nội dung hiện tại / Báo cáo / Lịch sử / Lần vi phạm đang hiệu lực |
| `admin.moderation.empty.title` | The queue is clear | Hàng đợi đang trống |
| `admin.moderation.error.title` | Could not load the moderation queue | Không tải được hàng đợi kiểm duyệt |
| `errors.admin.durationTooLong` | Your role can suspend for at most 30 days. | Vai trò của bạn chỉ được khoá tối đa 30 ngày. |

Web-client (theo doc 05 §7.6, §16.1):

| Key | EN | VI |
|---|---|---|
| `safety.report.title` | Report this | Báo cáo nội dung này |
| `safety.report.anonymity_notice` | Your report is anonymous. The person you report is never told who reported them. | Báo cáo của bạn được ẩn danh. Người bị báo cáo không bao giờ biết ai đã báo cáo. |
| `safety.report.reason.danger` / `.harassment` / `.sexual` / `.hate` / `.scam` / `.ghost_event` / `.impersonation` / `.spam` / `.privacy` / `.illegal` / `.unsafe_setup` / `.other` | 12 chuỗi theo doc 05 §16.1 | 12 chuỗi theo doc 05 §16.1 |
| `safety.report.description_label` | Tell us what happened (optional, but it helps a lot) | Kể lại chuyện đã xảy ra (không bắt buộc, nhưng rất hữu ích) |
| `safety.report.emergency_first` | If someone is in immediate danger, call 113 (police) or 115 (ambulance) first. Then tell us. | Nếu có người đang gặp nguy hiểm ngay lúc này, hãy gọi 113 (công an) hoặc 115 (cấp cứu) trước. Sau đó báo cho chúng tôi. |
| `safety.report.submit` / `.submitted` | Submit report / Thanks. We review every report. Reports involving safety are reviewed within 4 hours. We'll let you know the outcome. | Gửi báo cáo / Cảm ơn bạn. Chúng tôi xem xét mọi báo cáo. Báo cáo liên quan đến an toàn được xem trong vòng 4 giờ. Chúng tôi sẽ báo lại kết quả. |
| `safety.report.alreadyReported` | You already reported this. We are reviewing it. | Bạn đã báo cáo nội dung này. Chúng tôi đang xem xét. |
| `safety.report.limitReached` | You have reached today's report limit. Try again tomorrow. | Bạn đã dùng hết số báo cáo hôm nay. Hãy thử lại vào ngày mai. |
| `safety.report.sendFailed` | We could not send your report. Try again. | Không gửi được báo cáo. Hãy thử lại. |
| `safety.myReports.title` / `.status.received` / `.status.reviewing` / `.status.actionTaken` / `.status.noAction` | My reports / Received / Under review / Closed - action taken / Closed - no action needed | Báo cáo của tôi / Đã nhận / Đang xem xét / Đã đóng - đã xử lý / Đã đóng - không cần xử lý |
| `errors.report.ownContent` / `.targetUnavailable` / `.alreadyReported` / `.idempotencyRequired` | You cannot report your own content. / This content is already under review. / You already reported this. / Missing request key. | Bạn không thể báo cáo nội dung của chính mình. / Nội dung này đang được xem xét. / Bạn đã báo cáo nội dung này. / Thiếu khoá yêu cầu. |

### 10.6 Phụ thuộc và thứ tự trong A4

1. Migration `0011` và API tạo/gộp report (backend, nền).
2. Console: hàng đợi và chi tiết case (cần A2 cho khối "Reports" ở chi tiết sự kiện, cần A3 cho cơ chế audit/thu hồi phiên/transaction).
3. Quyết định (cần A3 T1, T4-T6 tái dùng) và retrofit `moderation_actions` cho A3 (D-R17).
4. Web-client: thành phần Report + trang "My reports" + gắn vào sự kiện.
5. Khoá có hạn tự hết hạn (D-M12).

### 10.7 Phụ thuộc track Social (§10.9)

Track Social sở hữu thẻ bài đăng, bình luận, hồ sơ trên `apps/web-client-side`. Thoả thuận đề xuất: A4 giao thành phần Report với giao diện `targetType` + `targetId` và API nhận sẵn `post`, `comment`, `user`; track Social chỉ việc đặt nút khi dựng bề mặt tương ứng. Nếu track Social đổi `posts`/`comments` (cột `status`, `moderation_state`, `report_count`) hay `content_status_enum`, phải báo cho A4. Xung đột sở hữu file `apps/web-client-side/**` và `packages/i18n` (cùng `en.json`/`vi.json`/`message-keys.ts`) cần Coordinator điều phối (khoá theo nhánh khoá/tuần tự).

---

## 11. Service bị ảnh hưởng theo pha

| Service | A1 | A2 | A3 | A4 |
|---|---|---|---|---|
| `apps/api` | `modules/admin`: route, service, repository, mapper người dùng. Repository mới đọc `users`, `profiles`, `auth_sessions`, `trust_signals`, `events`, `rsvps`, `posts` (module không import repository của module khác, như `admin.repository.ts:82-90`) | Như A1 cho sự kiện, occurrence, RSVP, waitlist, comment | Route ghi, dịch vụ audit dùng chung (ghi trong transaction của thao tác), thu hồi phiên theo user (`AuthRepository`), JwtAuthGuard tra deny-list, `0010_audit_logs.sql`, test e2e đủ 5 vai | Module `report` (`modules/report`, capability-map hiện "chưa làm"), `moderation` trong admin, job hết hạn khoá, rate limit, `0011_moderation.sql`, trigger COI |
| `apps/web-admin-side` | `/users`, `/users/[id]`, component Table, Select, Pagination dùng chung, sidebar | `/events`, `/events/[id]`, Tabs | Hộp thoại hai bước, `/audit-log`, nút thao tác, tab "History" | `/moderation`, `/moderation/[caseNumber]`, khối "Reports" ở chi tiết sự kiện/người dùng |
| `apps/web-client-side` | không | không | không | Thành phần Report, trang "My reports", gắn vào sự kiện (thẻ và chi tiết) |
| `apps/mobile` | không | không | không | không (hợp đồng `POST /reports` dùng lại được sau) |
| `packages/contracts` | `admin.ts`: `AdminUserList*`, `AdminUserDetail` | `AdminEventList*`, `AdminEventDetail` | Thân yêu cầu hành động (`reason`, `confirm`), `AdminAuditLog*`, khoá lỗi | `report.ts` (mới), `AdminModeration*` |
| `packages/domain` | `PermissionKey`: `user.directory.view`; hằng role | `event.directory.view` | `content.hide`, `event.takedown`, `user.suspend`, `user.role.assign`, `audit_log.view` | `moderation.queue.view`, `moderation.decide`, `report.create`; hàm xếp mức/SLA dùng chung (Tech Lead cân nhắc đặt ở đây cho mobile) |
| `packages/i18n` | §7.4 | §8.4 | §9.6 | §10.5; `en.json`, `vi.json`, `message-keys.ts` cùng một thay đổi |
| Cơ sở dữ liệu | không migration; có thể cần chỉ mục cho sắp xếp (Tech Lead) | không | `0010_audit_logs.sql` | `0011_moderation.sql` |

## 12. Ảnh hưởng trust_level / kiểm duyệt / report

- **Trust:** không có thao tác nào ghi `users.trust_level` (Q-12 mặc định không; S5-DoD-1). A1 chỉ hiển thị cấp và tín hiệu. Đổi role lên moderator/admin yêu cầu `trust_level >= 3` (D-R3). Báo cáo yêu cầu T1+ (D-M2). Người dưới ngưỡng thấy lỗi `TRUST_LEVEL_TOO_LOW` kèm cách đạt (xác minh email). Quyết định `warning` ghi strike; **chưa** tạo `trust_signals` `penalty_report_upheld` (job `trust:recompute` chưa tồn tại; follow-up).
- **Kiểm duyệt:** A3 là thao tác chủ động; A4 là thao tác theo case. Ẩn nội dung = trạng thái, **không xoá** (Đ35); nội dung ẩn vẫn nằm trong DB phục vụ khiếu nại và nghĩa vụ lưu trữ. Người lạ không thấy nội dung `suspended`/`taken_down`/`hidden`/`removed`.
- **Report:** A4 tạo mới. Không có khiếu nại ở v1 (hành động `suspended` có hạn và `content_removed` chưa có đường phản đối; ghi rủi ro R-5).

## 13. Ảnh hưởng dữ liệu cá nhân

| Dữ liệu | Pha | Ai nhìn thấy | Xử lý |
|---|---|---|---|
| Email, phone | A1 | admin, super_admin thấy **bản che** | Che ở server; không bao giờ trả bản thô; tìm bằng khớp chính xác, không khớp một phần; không log giá trị `q` |
| Tên hiển thị, handle, headline, bio, quốc tịch, loại expat, khu nhà, `lastActiveAt` | A1 | admin, super_admin | Hồ sơ công khai và dữ liệu vận hành tối thiểu |
| `birthYear`, `gender` | A1 | không ai ở console | Loại khỏi hợp đồng |
| IP, user-agent, `deviceId` của phiên | A1 | không ai (v1) | Loại khỏi hợp đồng; hiển thị cần `pii_access` ở follow-up |
| Toạ độ chính xác sự kiện | A2 | moderator, admin, super_admin | Nội dung sự kiện, không phải vị trí cá nhân; không lộ ra ngoài console |
| Danh sách người tham gia | A2 | không ai ở v1 (chỉ số gộp) | Đ21; mở lại ở A4 chỉ khi có case và `pii_access` (follow-up) |
| Lý do, `before`/`after`, hành động của staff | A3 | theo D-R12 | Đã lọc PII; `reason` do staff nhập, không nhập PII (hướng dẫn trên UI) |
| Danh tính người báo cáo | A4 | moderator, admin, super_admin (handle + trust) | Không bao giờ ra người bị báo cáo hay người dùng thường |
| Snapshot nội dung bị báo cáo | A4 | moderator, admin, super_admin | Giữ 12 tháng nếu chứa dữ liệu cá nhân, sau đó chỉ hash + tóm tắt (doc 05 §13.11); job dọn là follow-up |
| `reports`, `moderation_*`, `audit_logs` khi chủ tài khoản xoá | A3, A4 | | Giữ theo doc 05 §13.11 và doc 03 §10.4 (24 tháng, `ip`/`user_agent` xoá sau 90 ngày). **CẦN LUẬT SƯ XÁC NHẬN** cơ sở giữ theo Luật 91/2025/QH15 trước khi chạy migration trên dữ liệu thật |

Người dùng rút đồng ý: không có thu thập mới nào dựa trên đồng ý ở các pha này; báo cáo và audit giữ theo nghĩa vụ/lợi ích hợp pháp (cần luật sư xác nhận, ghi ở trên).

## 14. Thông báo cần gửi

Không có kênh nào ở v1 (module `notification` chưa tồn tại; M4 E7-S6 đã cắt/hoãn). Hệ quả cần chủ dự án biết:
- Người bị ẩn/gỡ/cảnh cáo/khoá **không** được báo (trái Đ8, Đ11, doc 05 §8.4). Bù tạm: người bị khoá nhận thông báo lỗi khi đăng nhập (`errors.auth.accountSuspended`); sự kiện bị ẩn hiện đúng trạng thái ở trang sự kiện của host. Cảnh cáo ở v1 chỉ ghi nhận cho nhân sự (strike), chưa tới được người nhận.
- Người báo cáo được báo kết quả bằng trang "My reports" (kéo, không đẩy).
- Moderator trực không được báo chủ động khi có case `critical`; SLA 2 giờ phụ thuộc người mở hàng đợi (M4 TG-M4-2 cần kênh P0). Đề nghị follow-up: email cho Founder khi có case `critical` (Mailpit/email đã có trong stack dev).
- Tắt được: không áp dụng (không có thông báo).

## 15. Rủi ro / trường hợp biên

- **R-1** Khoá/đổi role có hiệu lực tức thì tuỳ thuộc cơ chế mới ở guard (S-3, Q-2). Nếu bỏ, tài khoản bị khoá vẫn thao tác tới 15 phút: trái doc 14 X-J11-07.
- **R-2** Staff chưa có 2FA (doc 01 §8.3 "bắt buộc"). Nâng một người lên admin/moderator khi chưa có 2FA là rủi ro chiếm tài khoản. Cần Founder chấp nhận tạm thời hoặc đưa 2FA vào lộ trình trước khi mở console cho người ngoài đội sáng lập.
- **R-3** Cấp/hạ `super_admin` và break-glass (doc 14 X-J11-02, "chặn go-live M1") ngoài phạm vi. Cho tới khi có, `super_admin` chỉ đổi bằng SQL.
- **R-4** Khoá người dùng không động tới sự kiện/bài/RSVP của họ: sự kiện của người bị khoá vẫn hiện và vẫn nhận RSVP. Admin phải ẩn riêng bằng T4.
- **R-5** Không khiếu nại, không thông báo: mọi quyết định không đảo ngược ở v1 (`taken_down`, `content_removed`) không có đường phản đối. Doc 05 §8.5 coi khiếu nại là một phần của cam kết công khai. Cần chốt thời điểm làm.
- **R-6** Ẩn tự động `critical` có thể bị lạm dụng (một người báo cáo ác ý ẩn một sự kiện). Giảm nhẹ: T1+ và hạn mức 5/ngày, người báo cáo bị ghi nhận, moderator khôi phục. Doc 05 §7.9 (brigading, báo cáo trả đũa) chưa được hiện thực hoá ở v1.
- **R-7** SLA chạy đồng hồ thật 24/7 cho mọi mức ở v1; doc 05 chạy giờ hành chính cho high/normal/low. Số case "quá hạn" ở cuối tuần sẽ phóng đại so với cam kết đối ngoại. Tooltip phải nói rõ.
- **R-8** Tìm kiếm user theo email/phone chỉ khớp chính xác và không audit ở A1 (S-10, Q-1). Admin ác ý vẫn có thể dò từng địa chỉ đã biết. Chấp nhận ở quy mô đội sáng lập; cần audit khi mở console cho tình nguyện viên (D-29).
- **R-9** `audit_logs` không phân vùng: nếu sau này cần phân vùng theo tháng, phải viết lại bảng. Chấp nhận do quy mô nhỏ; Tech Lead có thể phản đối (Q-5).
- **R-10** Dữ liệu thử: tài khoản seed ở `trust_level=0` sẽ không nâng role được (D-R3); e2e phải dựng user T3. Tài khoản `@example.test` hiện trong mọi danh sách (đồng nhất D-20 đợt trước).
- **R-11** Danh sách có 6 trạng thái sự kiện và đếm chỗ dùng `SEAT_OCCUPYING` từ `@dnc/contracts`; nếu hai nơi lệch nhau, A2-AC-5 sẽ phát hiện.
- **R-12** Xung đột file với track Social ở `packages/i18n/messages/*.json`, `message-keys.ts`, `apps/web-client-side/app/_lib/api.ts`. Coordinator cần quy định thứ tự gộp.
- **R-13** Doc 03 §9, doc 01/03/rule bất nhất về tên bảng và vocabulary (S-1, S-2, S-4, S-7): cần một PR đồng bộ tài liệu, ngoài phạm vi code của brief này.

## 16. Câu hỏi mở (mỗi câu có mặc định BA; không BLOCKING)

- **Q-1** Admin có tra user theo email/phone khớp chính xác **không cần lý do/ticket** ở A1 không (doc 14 B1 đòi `support_ticket_id`, nhưng không có hệ thống ticket và A1 chưa có audit)? **Mặc định:** có, không ticket, chỉ khớp chính xác, không audit, API chỉ trả bản che. Cần đổi sang bắt lý do + audit khi thêm reveal.
- **Q-2** Khoá/đổi role có hiệu lực **tức thì** (thêm tra Redis ở mỗi request) hay chấp nhận trễ tối đa 15 phút? **Mặc định:** tức thì. Founder/Tech Lead chốt chi phí.
- **Q-3** Ẩn tự động case `critical` (D-M7) có bật ở v1 không? **Mặc định:** bật cho sự kiện/bài/bình luận, không cho người dùng. Phương án thay thế: không ẩn tự động, chỉ xếp đầu hàng đợi (an toàn kém hơn, ít lạm dụng hơn).
- **Q-4** Bảng ánh xạ 12 nhóm lý do → mức khởi tạo (D-M4) có đúng không (đặc biệt `privacy` và `illegal` = `critical`)? **Mặc định:** như D-M4. Founder duyệt vì quyết định ẩn tự động và SLA.
- **Q-5** `audit_logs` có phân vùng theo tháng ngay từ đầu không? **Mặc định:** không (D-R14, §9.3). Tech Lead chốt.
- **Q-6** Thêm giá trị `content_removed` vào `moderation_action_type_enum` (doc 05 chỉ có `content_hidden`) và `case_id` nullable cho `moderation_actions` (doc 05 NOT NULL)? **Mặc định:** thêm cả hai; Tech Lead xác nhận và đồng bộ doc.
- **Q-7** Moderator có xem được người dùng (A1) khi xử lý case? **Mặc định:** không có `user.directory.view`; case hiển thị đủ chủ nội dung (handle, role, status, trust, strike). Nếu cần đầy đủ như doc 14 AD-41, thêm khoá và `pii_access` sau.
- **Q-8** Thông báo email cho Founder khi có case `critical` và thông báo cho người bị xử lý: làm ở follow-up nào (phụ thuộc module `notification`)? **Mặc định:** follow-up ngay sau A4.
- **Q-9** Draft có hiện cho admin ở A2 không (D-E2)? **Mặc định:** chỉ khi lọc rõ `status=draft`, chỉ tiêu đề/host/ngày tạo.
- **Q-10** Guest báo cáo (CAPTCHA, hạn mức 3/IP/ngày) khi nào? **Mặc định:** ngoài v1, ghi vào backlog M6.

## 17. Đề xuất cắt thẻ cho Tech Lead

- **A1** (vừa, 3-8 file mỗi service, nhiều service): 1) hợp đồng + khoá quyền; 2) API danh sách + chi tiết; 3) Table/Select/Pagination dùng chung trong web-admin; 4) trang `/users`; 5) trang `/users/[id]`; 6) i18n + e2e đủ 5 vai.
- **A2**: tách tương tự (có thể tái dùng Table của A1; nếu hai thẻ chạy song song thì A1 sở hữu component dùng chung, A2 chờ hoặc tạm đặt cục bộ).
- **A3**: 1) migration + dịch vụ audit + trigger; 2) thu hồi phiên + hiệu lực tức thì ở guard; 3) T1-T2; 4) T3; 5) T4-T6; 6) trang Audit log + hộp thoại hai bước.
- **A4**: theo §10.6. Đề nghị dùng `story-writer` cho A3 và A4 (lớn, nhiều service), rồi round-table chốt hợp đồng và DDL trước khi viết code.
- **Đề nghị đồng bộ tài liệu:** sửa doc 03 §9 theo doc 05 §13, thống nhất tên `audit_logs` trong rule `behaviors.md` và `checklists.md`, ghi đường dẫn console thật (không `/admin`) vào doc 10.
## Quyết định Coordinator (01/10/2026)

- Chủ dự án chọn cả bốn pha A1–A4 và chấp nhận migration cho audit log và kiểm duyệt; DDL cụ thể vẫn được trình trước khi áp.
- **Cấp số migration dùng chung hai track:** `0010_audit_logs.sql` (A3), `0011_follows.sql` (track Social S4), `0012_moderation.sql` (A4). Bảng audit của A3 là bảng audit **duy nhất** của hệ thống; track Social (xoá bình luận bởi host/moderator, X-1) dùng chung, không tạo bảng audit riêng.
- Câu hỏi mở §16 giữ mặc định BA.
