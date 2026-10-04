# Code review — moderation-core + areas-api (Code Review Agent, 25/09/2026)

**Phạm vi:** `git diff 52f7f7a` → working tree `HanDP_branch` (102 file) + untracked
`apps/api/e2e/modules/{audit/,moderation/moderation-actions|moderation-queue|suspension.e2e.spec.ts}`.
**Chuẩn đối chiếu:** `moderation-core/brief.md` (AC-1…AC-48), `moderation-core/task-board.md` (D1–D16, §4),
`areas-api/brief.md`.
**Bằng chứng đã chạy:** `tsc --noEmit` — `apps/api` sạch trừ 5 lỗi TS2307 có sẵn (nodemailer/ioredis);
`packages/{contracts,domain,i18n}` và `apps/web-client-side` sạch; `apps/web-admin-side` **không kiểm được**
(thiếu node_modules → mọi import `@dnc/*` TS2307). i18n: `en.json`/`vi.json` cùng 577 key, không lệch; mọi
`errors.*` backend mới đều có key. **E2E chưa chạy** (không Docker) — mọi kết luận hành vi dưới đây là từ đọc code.

Mức: blocker = không merge · major = phải sửa hoặc chấp nhận qua Debate Gate trước merge · minor = sửa trong
follow-up · nit = tuỳ chọn. "Chắc chắn" = đã lần theo code tới kết quả; "nghi ngờ" = cần chạy để xác nhận.

## Tóm tắt

| Mức | Số lượng |
|---|---|
| blocker | 0 |
| major | 3 |
| minor | 6 |
| nit | 3 |

Đã kiểm và **không** thấy lỗi: SQL injection (`block-filter.ts` chỉ nhận hằng, regex neo `^…$`, `LOCK_TARGET_SQL`
theo enum đã validate, mọi giá trị người dùng đều bind); guard mọi route mới (`@Roles(allowedRolesFor(...))` +
JwtAuthGuard toàn cục, area `@Public` đúng brief); transaction nguyên tử action + `moderation_actions` + `audit_logs`
+ đóng ticket (một `withTransaction`, audit dùng `tx` của caller); `FOR UPDATE` ticket → AC-37; advisory lock theo
reporter cho rate limit; upsert ticket bằng partial unique index; migration 0009 (enum thấp→cao, partial unique,
trigger append-only row + statement TRUNCATE, FK vào hai bảng append-only đều RESTRICT, `lift_expired_suspension`
khoá hàng + ghi đủ 2 dòng, note hệ thống 47 ký tự ≥ 20, action khớp CHECK regex); SLA do đồng hồ DB
(GREATEST/LEAST, đổi mức = first_reported_at + SLA); mở khoá lười giữ nguyên hành vi cũ khi `suspended_until IS NULL`
và fast-path `active` không thêm query; `USER_COLUMNS` có `suspended_until` ở mọi đường tạo `UserRow`; mọi chữ ký
repository đổi (`findByHandle`, `findOwner`, `findAuthor`, `targetExists`, `findParent`, `listAttendees`) đã cập
nhật hết caller (tsc sạch); guest (`$n::uuid IS NULL`) được constant-fold vì node-pg dùng unnamed statement → truy
vấn guest y như cũ; `idx_events_location` không bị ảnh hưởng (predicate chặn là SubPlan theo dòng, không đổi
index phục vụ `ST_DWithin`); mapper liệt kê từng trường; service không SQL; PII: không email/phone trong response
staff/audit, danh tính reporter chỉ ở DTO chi tiết ticket, danh tính moderator khác bị ẩn với moderator (AC-41);
test đặt đúng `apps/api/e2e/**`.

---

## Major

### CR-1 — `POST /reports` là oracle lộ quan hệ chặn (AC-17) · major · chắc chắn · lane BE-1
**File:** `apps/api/src/modules/report/report.repository.ts:162-255` (`resolveTarget` bỏ qua `blocks` cả hai chiều),
`report.service.ts:125-131`.
**Mô tả:** D9 bỏ bộ lọc chặn khi resolve target để đáp ứng AC-7 (người **chặn** vẫn báo cáo được người bị chặn),
nhưng bỏ luôn chiều ngược lại. Người **bị chặn** nhận 201 cho đối tượng mà mọi endpoint khác trả 404.
**Kịch bản:** A chặn B. B biết id bài P của A (hoặc `A.userId`, lộ sẵn qua `authorUserId` trên bài cũ).
`GET /posts/P` → 404; `POST /reports {post,P}` → **201**; `POST /reports {post,<uuid ngẫu nhiên>}` → 404. B kết luận
chắc chắn có chặn giữa hai người. Tương tự với target `user` (`GET /profiles/:handle` 404 nhưng report user 201).
Mỗi lần dò còn sinh một ticket rác trong hàng đợi của moderator.
**Đề xuất:** trong `resolveTarget` thêm điều kiện "chủ đối tượng **không** chặn reporter"
(`NOT EXISTS (SELECT 1 FROM blocks WHERE blocker_user_id = <owner> AND blocked_user_id = $reporter)`) → 404 như
không tồn tại; giữ nguyên chiều reporter→owner (AC-7 vẫn xanh). Thêm e2e hai chiều cho report trong
`block.e2e.spec.ts`. Cần BA xác nhận (Debate Gate ngắn): người bị chặn có cần báo cáo được người đã chặn mình không —
brief §6 chỉ quy định chiều ngược lại.

### CR-2 — Sự kiện bị gỡ/tạm gỡ vẫn mở luồng bình luận và reaction · major · chắc chắn · lane BE-2
**File:** `apps/api/src/modules/comment/comment.repository.ts:96-111` (nhánh event:
`SELECT 1 FROM events WHERE id=$1 AND deleted_at IS NULL AND <chặn>` — không xét `status`),
`apps/api/src/modules/reaction/reaction.repository.ts:29-36` (`EXISTS_SQL.event` tương tự).
**Mô tả:** Post/comment kiểm `status='visible'`, event thì không. Lỗ này có từ trước diff nhưng diff này thêm
`take_down_event`/`suspend_event` và dựa vào "chi tiết 404 với mọi người trừ organizer và staff" (brief §9, AC-30,
S5-Demo-2) — luồng bình luận là một phần của chi tiết.
**Kịch bản:** M gỡ sự kiện lừa đảo E (`taken_down`). Người thứ ba (kể cả guest — route `@Public`):
`GET /events/E` → 404 nhưng `GET /events/E/comments` → **200** trả toàn bộ bình luận (có thể chứa số tài khoản/liên
hệ của kẻ lừa đảo); member `POST /events/E/comments` → **201**, `PUT /events/E/reactions` → 200. Cùng lỗ: 
`GET /occurrences/:id/rsvps` (`rsvp.repository.ts:266`) vẫn trả danh sách người tham gia của E.
**Đề xuất:** nhánh event dùng cùng quy tắc với `event.repository.findById`:
`AND (status = 'published' OR organizer_id = $2)` ở cả comment và reaction; attendees kiểm event `published` hoặc
viewer là organizer (hoặc chấp nhận có chủ đích, ghi vào D16). Thêm assert vào e2e AC-30. Rủi ro regression: bình
luận trên sự kiện `draft`/`cancelled` của người khác sẽ 404 — xác nhận với BA/TV1 là mong muốn.

### CR-3 — Chặn/báo cáo tài khoản không `active` trả 404 trong khi hồ sơ vẫn hiện → lộ trạng thái khoá, nạn nhân không chặn được · major · chắc chắn · lane BE-2 (+BE-1)
**File:** `apps/api/src/modules/profile/profile.repository.ts:167-181` (`block`: `status = 'active'`) và
`report.repository.ts:232-238` (target `user`: `u.status = 'active'`), đối chiếu `profile.repository.ts:101`
(hồ sơ công khai: `u.status <> 'deleted'`).
**Mô tả:** Hồ sơ của tài khoản `suspended`/`deactivated`/`pending` vẫn hiển thị 200 kèm SafetyMenu, nhưng Chặn →
404 `PROFILE_NOT_FOUND`, Báo cáo hồ sơ → 404 `REPORT_TARGET_NOT_FOUND`. Đúng chữ task board E2 nhưng sinh hai hậu quả.
**Kịch bản:** B quấy rối A và bị M khoá 7 ngày. (a) Bất kỳ member nào mở `/u/B` rồi bấm Chặn nhận 404 → biết B đang
bị xử lý (kết quả kiểm duyệt là thông tin không công khai). (b) A muốn chặn B trước khi hết hạn khoá → không được;
ngày thứ 8 B đăng nhập lại (lazy lift) và tiếp cận A không bị lọc.
**Đề xuất:** `block` và target `user` dùng cùng vị từ với hồ sơ công khai (`deleted_at IS NULL AND status <> 'deleted'`);
sửa dòng E2 trong task board §4 cho khớp. Cập nhật test "AC-16: 404 for an account that is not active"
(`block.e2e.spec.ts:199`). Cần Tech Lead ký vì đổi hợp đồng đã chốt.

---

## Minor

### CR-4 — Bỏ `ticketId` ở hành động đảo ngược là vượt được kiểm xung đột lợi ích (INV-4) · minor · chắc chắn · lane BE-1
**File:** `apps/api/src/modules/moderation/moderation.service.ts:179-205`; contract `Reversal` (`moderation.ts:209`).
**Mô tả:** COI chỉ chạy khi có `ticketId`; không có ticket thì chỉ còn kiểm "không phải chủ".
**Kịch bản:** M là organizer sự kiện E; bình luận C trên E bị M2 ẩn qua ticket T (M bị COI vì
`related_event_organizer_id`). M gọi thẳng `POST /admin/moderation/actions {restore_content, comment, C}` không
`ticketId` → 201, C hiện lại. Tương tự người báo cáo trong ticket. UI luôn gửi `ticketId` nên chỉ lộ qua API.
**Đề xuất:** khi thiếu `ticketId`, nạp mọi ticket (mọi trạng thái) của target và áp `noConflict`; hoặc bắt buộc
`ticketId` cho cả đảo ngược (UI đã gửi sẵn).

### CR-5 — Không khoá lại trực tiếp được tài khoản có hạn khoá đã qua mà chưa đăng nhập · minor · chắc chắn · lane BE-1 + ADM
**File:** `moderation.repository.ts:423-438` (`suspendUser ... WHERE status = 'active'`),
`apps/web-admin-side/app/_components/moderation/ticket-actions.ts:125-126`.
**Kịch bản:** B bị khoá tới T, sau T chưa đăng nhập nên vẫn `suspended`. Report mới về B; M chọn khoá 30 ngày → UI
chỉ hiện "Mở khoá"; gọi API `suspend_user` → 409 `MODERATION_INVALID_STATE`. M phải ghi một hành động
`user_unsuspended` (sai sự thật trong bản ghi bất biến) rồi mới khoá.
**Đề xuất:** trong transaction của `suspend_user` gọi `lift_expired_suspension(target)` trước (hoặc cho `WHERE` nhận
`status='suspended' AND suspended_until <= now()`); UI coi `suspendedUntil` đã qua như `active`.

### CR-6 — Báo cáo lại với lý do nặng hơn bị nuốt, ticket không nâng mức · minor · chắc chắn · lane BE-1 (BA quyết)
**File:** `report.service.ts:117-123`.
**Kịch bản:** A báo cáo bài P là `spam` (P2, hạn 48 h), sau đó nhận ra có đe doạ, báo lại `danger` → trả report cũ,
ticket vẫn P2. Đúng chữ AC-5 nhưng ngược tinh thần "gộp chỉ làm tăng mức" (§7) cho ca an toàn.
**Đề xuất:** khi report mở đã có mà mức mới > mức cũ, vẫn trả report cũ nhưng nâng ticket
(`GREATEST`/`LEAST` như upsert) — hoặc BA xác nhận giữ nguyên.

### CR-7 — `POST /conversations` phân biệt được "bị chặn" với "bị từ chối" · minor · chắc chắn · lane BE-2 (BA quyết)
**File:** `apps/api/src/modules/chat/chat.service.ts:67-80`.
**Mô tả:** Cặp có chặn → 403 `CONVERSATION_REQUEST_REFUSED`; cặp từng bị từ chối → `findOrCreateDirect` trả hội thoại
cũ, 201. Vậy 403 ở bước **mở** hội thoại chỉ xảy ra khi có chặn — mâu thuẫn giữa AC-13 (bắt 403) và AC-17 (không
lộ). Đường gửi tin thì không phân biệt được (declined/blocked đều 403).
**Đề xuất:** BA chọn một: (a) mở hội thoại luôn "thành công" như cặp declined, chỉ chặn ở bước gửi; hoặc (b) cho cặp
declined cũng 403 ở bước mở. Ghi quyết định vào task board.

### CR-8 — `GET /comments/:id` và danh sách người tham gia vẫn lộ đối tượng của bên kia · minor · chắc chắn · lane BE-2
**File:** `comment.repository.ts:160-171` (chỉ lọc tác giả comment, không lọc chủ post/event chứa nó),
`rsvp.repository.ts:266-282` (không kiểm organizer).
**Kịch bản:** A chặn B. C bình luận trên bài P của A. B `GET /comments/<id của C>` → 200 kèm `postId = P`, trong khi
`GET /posts/P` → 404 → xác nhận P tồn tại (oracle tương tự CR-1). B `GET /occurrences/<occ của sự kiện A>/rsvps` →
200 dù `GET /events/<A>` → 404.
**Đề xuất:** `findById` comment join post/event và áp `notBlockedBetween` lên chủ thread; attendees trả 404 khi
viewer có chặn với organizer.

### CR-9 — Web admin chưa được typecheck · minor · chắc chắn · lane ADM
**Mô tả:** `apps/web-admin-side` thiếu node_modules → ~3.000 dòng TSX mới (moderation, audit-logs, ui/*) chưa qua
`tsc`. Không phải lỗi code đã thấy, nhưng là khoảng trống bằng chứng trước merge.
**Đề xuất:** `pnpm install` + `tsc --noEmit` + `next build` cho web-admin trên máy có pnpm trước khi merge.

---

## Nit

### CR-10 — Độ dài ghi chú đếm theo UTF-16 ở Zod nhưng theo ký tự ở CHECK → 500 · nit · chắc chắn · lane T-CONTRACT
**File:** `packages/contracts/src/moderation.ts:40-44` vs `0009_moderation_core.sql` (`length(btrim(note)) BETWEEN 20 AND 2000`).
**Kịch bản:** ghi chú 10 emoji = 20 đơn vị UTF-16 → Zod qua, Postgres `length` = 10 → vi phạm CHECK 23514 → 500
thay vì 400 `noteTooShort`. **Đề xuất:** `.refine(s => [...s].length >= 20)` hoặc đếm code point.

### CR-11 — Cursor `me/blocks` mất độ chính xác micro giây và không validate · nit · chắc chắn · lane BE-2
**File:** `profile.repository.ts:28-31, 197-216`. `toISOString()` cắt µs → hai block cùng mili giây có thể bị bỏ sót
ở ranh giới trang; cursor giả (`blockedAt:"x"`) → lỗi cast Postgres → 500. Cùng mẫu với cursor post/comment có sẵn,
module moderation đã làm đúng (`to_char … US`) — nên thống nhất dần.

### CR-12 — Định dạng thời gian trong `before/after` của audit hệ thống khác audit staff · nit · nghi ngờ · lane T-CONTRACT
**File:** `0009_moderation_core.sql` hàm `lift_expired_suspension` (`jsonb_build_object('suspendedUntil', v_until)`).
jsonb của `timestamptz` theo `TimeZone` phiên (vd `…+07:00`), còn staff ghi `toISOString()` (`…Z`). Không vỡ schema
(`z.record(unknown)`) nhưng viewer/so sánh phải xử lý hai dạng. **Đề xuất:** `to_char(v_until AT TIME ZONE 'UTC', …"Z")`.

---

## Khoảng trống test
- Không có e2e cho: report như oracle chặn (CR-1); bình luận/reaction trên sự kiện `taken_down` (CR-2); chặn/báo cáo
  tài khoản `suspended` (CR-3); hành động đảo ngược không `ticketId` với moderator dính COI (CR-4).
- Toàn bộ 7 spec e2e mới/sửa **chưa chạy** (không Docker) — phải xanh trên Postgres/PostGIS trước merge.

## Ranh giới sở hữu
Không thấy vi phạm ngoài ngoại lệ đã ghi (D9 report ghi `blocks`; D13 moderation ghi `posts/comments/events/users/
auth_sessions`). `packages/**` đổi cần TV1 review (areas-api brief ghi rõ).

## Kết luận
**Approval: changes-requested.** Không có blocker; 3 major (CR-1, CR-2, CR-3) phải sửa hoặc được BA/Tech Lead chấp
nhận có ghi lại qua Debate Gate, kèm e2e chạy xanh và web-admin typecheck/build (CR-9) trước khi merge.
