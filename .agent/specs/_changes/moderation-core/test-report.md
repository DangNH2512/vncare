# Test report — moderation-core + areas-api (Tester Lead, 25/09/2026)

**Phạm vi:** `git diff 52f7f7a` + untracked trên `HanDP_branch`, gồm các bản sửa sau review (BE-1: CR-1,3,4,5,6,10 ·
BE-2: CR-2,3,8 · i18n + nhãn ADM · orchestrator sửa setup `reaction.e2e.spec.ts`).
**Đầu vào:** `brief.md` (AC-1…AC-48), `task-board.md`, `code-review.md`, `areas-api/brief.md`.
**Chế độ:** Tester Lead chạy tuần tự bốn lane (unit, integration, screen, regression) làm checklist, không spawn agent.

## Kết luận nhanh

| Mục | Kết quả |
|---|---|
| Mức tin cậy | **trung bình**. Code và 7 spec e2e mới/sửa đã được đọc kỹ, đối chiếu với controller, service và SQL thật. Không thấy spec nào chắc chắn fail. Typecheck sạch cả 6 target. Unit test của package xanh qua shim. Nhưng **chưa chạy e2e nào** trên Postgres, và **chưa mở trình duyệt**. |
| AC có test tự động | **43/48**. 14 AC trong số đó chỉ có test ở tầng API, phần UI chưa có test (ghi ở cột "Còn thiếu"). |
| AC không có test | **5**: AC-3, AC-8, AC-19, AC-28, AC-48. Cả năm chỉ có hành vi UI, và app chưa có Playwright. |
| AC hoãn trọn vẹn | **0**. Hoãn một phần có lý do (D16/E7): AC-2 (nút trên bình luận ở web), AC-30 (nhãn ở my-events, thông báo huỷ). |
| Bug sản phẩm | TR-1 (P2), TR-2 (P2, chờ BA), TR-3 (P3), TR-6 (P3, rủi ro còn lại). Chi tiết ở §3. |
| Rủi ro flake của test | TR-4, TR-5 (P3). Không sửa, vì chưa phải lỗi rõ ràng. |
| File test đã sửa | **Không có.** Không tìm thấy lỗi setup hay assert nào sai so với hợp đồng đã chốt. |
| Bằng chứng không hợp lệ | Không có. Không chụp ảnh màn hình nào, vì lane screen bị chặn. |

## 1. Bằng chứng đã chạy (máy hiện tại: Node 18.17, không Docker, không pnpm)

| Lệnh | Kết quả |
|---|---|
| `tsc.exe --noEmit -p packages/contracts` | exit 0, không lỗi |
| `tsc.exe --noEmit -p packages/domain` | exit 0 |
| `tsc.exe --noEmit -p packages/i18n` | exit 0 |
| `tsc.exe --noEmit -p packages/geo` | exit 0 |
| `tsc.exe --noEmit -p apps/api` (gồm `e2e/**`) | chỉ còn 5 lỗi TS2307 có sẵn (nodemailer ×3, ioredis ×2), không lỗi mới |
| `tsc.exe --noEmit -p apps/web-client-side` | exit 0 |
| `tsc.exe -p <scratchpad>/admin-tc/tsconfig.json`: web-admin, `@dnc/*` map vào `packages/*/src`, `next`/`react` lấy từ `node_modules` gốc | exit 0, 43 file web-admin được kiểm (xác nhận bằng `--listFilesOnly`) |
| Unit test `packages/{contracts,domain,i18n}/test/**`: transpile bằng `@swc/core` sang CJS, chạy qua shim `vitest` tối giản (vitest 4 thật không chạy trên Node 18: `node:util.styleText`) | 77/77 xanh: contracts 12, domain 62, i18n 3. Shim đã được thử với 4 assert sai và báo đủ 4 fail. |
| Soát key i18n: mọi literal `errors.*`/`rsvp.*`/`safety.*`/`admin.*` trong `apps/api/src` + `packages/{contracts,domain}/src` phải có ở cả `en.json` và `vi.json` | 69 literal, không thiếu key nào. 3 "thiếu" là khoá quyền trong `permission-matrix.ts`, không phải key i18n. |
| Gọi thử `notBlockedBetween` / `blockedBetween` / `eventVisibleTo` / `commentThreadVisibleTo` với đúng các tham số mà repository truyền lúc load module (`reaction.repository` dựng `EXISTS_SQL` khi import) | không call nào throw. Tham số sai hình dạng bị từ chối. |
| Point-in-polygon cho centroid 6 khu vực MVP (spec area `resolve`) | centroid Sơn Trà chỉ nằm trong Sơn Trà. Hộp e2e 0.2°×0.2° lớn hơn mọi polygon MVP, nên `ORDER BY ST_Area ASC` vẫn chọn Sơn Trà. |

**Lane bị chặn:**
- integration/e2e: không có Postgres/PostGIS.
- screen: không có trình duyệt, Playwright hay API đang chạy.
- `next build`: không có pnpm/Node ≥ 24.

Hệ quả: mọi kết luận về hành vi dưới đây đều **đến từ đọc code** và phải được xác nhận bằng §6.

## 2. Ma trận truy vết

Viết tắt file:
- **R** = `apps/api/e2e/modules/report/report.e2e.spec.ts`
- **B** = `apps/api/e2e/modules/profile/block.e2e.spec.ts`
- **Q** = `apps/api/e2e/modules/moderation/moderation-queue.e2e.spec.ts`
- **A** = `apps/api/e2e/modules/moderation/moderation-actions.e2e.spec.ts`
- **S** = `apps/api/e2e/modules/moderation/suspension.e2e.spec.ts`
- **L** = `apps/api/e2e/modules/audit/audit-log.e2e.spec.ts`
- **AR** = `apps/api/e2e/modules/area/area.e2e.spec.ts`
- **DM** = `packages/domain/test/moderation.spec.ts`
- **DP** = `packages/domain/test/permission-matrix.spec.ts`
- **CV** = `packages/contracts/test/moderation-vocabulary.spec.ts`
- **IC** = `packages/i18n/test/catalog.spec.ts`

Tên `it` được trích nguyên văn, rút gọn bằng "…". Cột "Assert đúng AC?" ghi kết quả đối chiếu với code thật.

| AC | Test | Assert đúng AC? | Còn thiếu |
|---|---|---|---|
| AC-1 | R "reports a published event as scam: 201, receipt only, P0 ticket due in exactly 2 hours" | Có: 201, body chỉ có `id/status/createdAt`, `critical`, `sla − first = 2 h`, snapshot | UI: chuỗi `safety.report.submitted`, countdown trên console |
| AC-2 | R `it.each` "reports a %s with the right target type and owner" (post/comment/user) + AC-1 (event) | Có: `target_type`, `target_owner_user_id = B` | UI ẩn nút trên đồ của mình. Nút trên bình luận ở web hoãn theo D16. |
| AC-3 | — (DM "covers all twelve reasons…" chỉ phủ bảng mức) | — | **Không test**: 12 lý do trong sheet, khối 113/115 |
| AC-4 | R "alsoBlock blocks the owner of the target in the same request" | Có: dòng `blocks` | UI: ô mặc định bật với harassment |
| AC-5 | R "returns the first report on a retry with the same key and on a second report of the same target"; R "a retry of an accepted report still answers 201 after the limit is reached" | Có: cùng id, 1 dòng, `report_count = 1`, không trừ hạn mức | — |
| AC-6 | R `it.each` "refuses reporting your own %s with 422…" · "answers 404 for a target that does not exist" · "…(a draft event)" · "rejects a description over 2000 characters…" | Có: body 422/404 đúng từng byte, 400 có key | — |
| AC-7 | R "still lets a member report someone they have blocked"; câu cuối của R "a target whose owner blocked the reporter…" | Có | — |
| AC-8 | — (idempotency API đã phủ ở AC-5) | — | **Không test**: offline + Thử lại, giữ nội dung đã nhập |
| AC-9 | R `it.each` "T%i: report %i is accepted and the next answers 429 with Retry-After" (T1/T2/T3) · "T0 gets the T1 allowance"; DM "reportDailyLimit" | Có: 429, `RATE_LIMITED`, `Retry-After` = `details.retryAfterSeconds`, trong (0, 86400] | UI thông báo i18n |
| AC-10 | R "rejects a missing token with 401" · "rejects a missing Idempotency-Key with 400…" | Có | — |
| AC-11 | R "nothing the reported owner reads mentions reports or moderation" (event, post, profile, auth/me) | Có | my-events chưa có API |
| AC-12 | B "AC-12, AC-20: the blocker sees the person in their own list, and only there" | Có: 204, có trong list, B không thấy gì | UI |
| AC-13 | B `describe` "two-way effect on every surface" × 2 chiều: events (list + radius + detail), RSVP join, attendees, posts (feed + author filter + detail), comments (thread R/W, root + reply), reactions, profile, DM mở/gửi, CR-8 | Có: đủ hai chiều cho từng dòng §4, 404 so với body của id không tồn tại | Xem TR-2 (CR-7) |
| AC-14 | B "AC-14: a third person still sees both sides everywhere" | Có | — |
| AC-15 | B "AC-15: an RSVP made before the block is untouched" | Có: `confirmed`, 1 dòng | — |
| AC-16 | B "AC-16: refuses a self-block with 422…" · "…blocking twice…" · "…unblocking someone never blocked…" · "AC-16: after unblocking, every surface comes back on the next request" | Có | Sau khi bỏ chặn, `GET /posts` (feed) không được kiểm lại, chỉ kiểm chi tiết. Thiếu nhỏ. |
| AC-17 | B mọi `toEqual(unknown.*)`; R "a target whose owner blocked the reporter answers the same 404 as an unknown id"; B "CR-3: only a deleted account answers 404, the same 404 as an unknown id" | Có | TR-2: `POST /conversations` vẫn phân biệt được 403 do chặn với 201 do bị từ chối |
| AC-18 | Q "a member blocking the moderator does not hide their content from the console (AC-18)" | Có phần xem (queue + snapshot) | Chưa thử "vẫn xử lý được" sau khi bị chặn. Theo code thì lọc chặn không áp ở module moderation. |
| AC-19 | — | — | **Không test** (UI) |
| AC-20 | B "AC-20: requires an account on every block route" + AC-12 | Có | — |
| AC-21 | Q "401 without a token" · `it.each` "403 ROLE_NOT_ALLOWED for a %s" · "200 for a %s, with the server clock"; DP "keeps curator out of the moderation queue and the audit log" | Có (API + ma trận) | UI sidebar của curator |
| AC-22 | Q "orders P0 before P2 before P3, then longest waiting first; the P0 filter returns only P0" | Có: keyset qua trang cỡ 2, lọc `critical` | — |
| AC-23 | Q `it.each` "%s opens a %s ticket due %i hours after the first report"; DM "slaState" (31/30/29 phút, ngưỡng 25%, quá hạn) | Có (API + domain) | UI màu + nhãn |
| AC-24 | R "a harassment report an hour after a spam report raises the ticket to P0, due at T+3h" | Có (±5 s) | — |
| AC-25 | A "re-rating P2 to P1 restarts the deadline from the first report and records both levels" · "rejects a dismiss and a severity change without a long enough note" | Có: delta 12 h, before/after, 409 khi cùng mức | — |
| AC-26 | Q `describe` "conflict of interest": reporter / owner / organizer; A "403 CONFLICT_OF_INTEREST on every decision for a moderator who reported in the ticket"; A CR-4 ×2 | Có: ẩn khỏi queue, 403 ở chi tiết và ở mọi quyết định, M2 xử lý được | — |
| AC-27 | Q "shows the snapshot as reported even after the author edits and then deletes the post" | Có: snapshot, reasons, reporters, `deleted = true`, không email/phone | UI nhãn lý do i18n |
| AC-28 | — | — | **Không test** (UI) |
| AC-29 | Q "a dismissed ticket leaves the open list and shows under closed with its outcome" | Có | UI |
| AC-30 | A "takes the event out of discovery, keeps RSVPs, resolves the ticket, writes one action and one audit entry"; B `describe` "CR-2: surfaces follow the event's visibility" | Có | Nhãn my-events hoãn (D16), thông báo huỷ hoãn (E7), nhãn organizer ở UI |
| AC-31 | A "hides a post from everyone but its author and staff…" · "hides and restores a comment" · "409 MODERATION_INVALID_STATE when hiding…"; B `describe` "editing hidden content" (409, xoá vẫn được, nội dung visible sửa bình thường) | Có | UI nhãn "đã bị ẩn" |
| AC-32 | A "a moderator suspends and restores an event" · "only an admin restores a taken-down event" · "409 when restoring an event that is not suspended or taken down" | Có | — |
| AC-33 | A "suspends a member for 7 days and revokes every refresh session"; S "a suspended member is refused at sign-in and at refresh…" · "lifting a suspension early…" | Có | — |
| AC-34 | S "after the end date, sign-in lifts the suspension as the system (AC-34)" · "…a refresh with the revoked session…" · "two sign-ins racing…" · "a suspension with no end date is still refused…" · "a suspension that has not ended yet is not lifted" | Có | — |
| AC-35 | A "a moderator may suspend for at most 30 days…" · `it.each` "a %s cannot suspend a %s…" · "an admin suspends a moderator; a super_admin suspends an admin" · "nobody suspends or lifts their own account (403)" | Có | — |
| AC-36 | A `it.each` "rejects %s with 400 and changes nothing" (4 ca, trên `hide_content`) + dismiss/severity + CR-10 | Có | Ma trận 4 ca chỉ chạy trên `hide_content`. Các hành động khác chỉ kiểm qua ca CR-10. |
| AC-37 | A "two moderators acting at once: one 201, one 409 TICKET_ALREADY_CLOSED, one closing action" | Có | — |
| AC-38 | A "dismissing closes the ticket and its reports, leaves the content, records no_action" | Có | — |
| AC-39 | A "401 without a token" · `it.each` "403 ROLE_NOT_ALLOWED for a %s, whatever the body"; Q access | Có: 5 route | — |
| AC-40 | A take-down (dòng đủ trường S5-DoD-7) · "the database refuses UPDATE, DELETE and TRUNCATE…" | Có | Hình dạng dòng chỉ được assert đầy đủ cho `event_taken_down` |
| AC-41 | Q "a moderator sees another moderator only by role; admin and super_admin see who" | Có | — |
| AC-42 | A take-down (`toHaveLength(1)`, đủ trường); A restore / suspend / unsuspend / dismiss / severity (`[0]` toMatchObject); S hệ thống | Có | "Đúng một" chỉ được khẳng định chặt ở take-down |
| AC-43 | A "a failing audit insert rolls the whole decision back" | Có | — |
| AC-44 | L `describe` "access" + "scope by role" | Có | UI menu (ma trận DP) |
| AC-45 | L "pages newest first with a cursor, without repeats" · "filters by action, entity type and time window" · "has no route that edits or deletes an entry"; A "has no route that edits or deletes a decision (AC-45)" | Có | UI viewer |
| AC-46 | R "member reports and blocks write nothing to the audit log"; B "AC-46: blocking and unblocking write no audit entry" | Có | — |
| AC-47 | IC (en = vi = MESSAGE_KEYS, không chuỗi rỗng) + soát key backend (§1) + `t()` có kiểu `MessageKey` (tsc) | Một phần | Screen EN/VI chưa làm |
| AC-48 | — | — | **Không test**: `server-clock.ts` chưa có unit test, UI chưa có screen test |
| S5-DoD-6 | = AC-23 | Có (API + domain) | Màu UI |
| S5-DoD-7 | = AC-40 | Có | — |
| S5-DoD-8 | = AC-13 | Có | — |
| M4-1 | = AC-1, AC-2 (API) | Có | Video: nghiệm thu tay |
| M4-2 | = AC-13 | Có | — |
| M4-3 | = AC-22, AC-23 | Có (API) | Ảnh giao diện: nghiệm thu tay |
| M4-4 | = AC-40 | Có | Truy vấn SQL chạy tay (§6 bước 8) |
| S5-Demo-1 | = AC-1 | Có (API) | Demo UI |
| S5-Demo-2 | = AC-30 | Có phần gỡ | Thông báo cho người đã RSVP hoãn theo E7 (brief §4) |
| S2-DoD-6 | AR "GET /areas?mvp=true returns exactly the six launch areas" (+7 ca) | Có | Seed phân cấp đầy đủ cần migration riêng (areas brief, câu hỏi mở) |

## 3. Phát hiện

### TR-1: nửa UI của CR-5 chưa sửa · P2 · Owner: web-admin-agent
- **Area:** `apps/web-admin-side/app/_components/moderation/ticket-actions.ts:125-126`. File không đổi kể từ 37f9216.
- **Steps:**
  1. B bị khoá tới T. Qua T, B chưa đăng nhập, nên DB vẫn ghi `status = 'suspended'`.
  2. Có report mới về B. M mở ticket.
- **Expected:** có nút "Khoá" (API đã sửa: `suspend_user` tự lift bằng hệ thống rồi khoá, test A "suspending an account whose suspension has lapsed…").
- **Actual:** UI chỉ hiện nút khoá khi `owner.status === 'active'`, nên M chỉ thấy "Mở khoá". Bấm "Mở khoá" sẽ ghi một hành động `user_unsuspended` của staff, đúng loại bản ghi sai sự thật mà CR-5 muốn tránh.
- **Evidence:** đọc code. `suspendedUntil` của owner có trong DTO (`targetOwner.suspendedUntil`).
- **Direction:** coi `status === 'suspended' && suspendedUntil <= serverNow` như `active`: hiện "Khoá", ẩn "Mở khoá".

### TR-2: CR-7 còn mở, AC-13 mâu thuẫn AC-17 · P2 · Owner: ba-agent (quyết), sau đó backend-agent #2
- **Steps:** A chặn B. B gọi `POST /conversations {direct, A}` → 403 `CONVERSATION_REQUEST_REFUSED`. Một cặp từng bị từ chối thì bước mở vẫn 201.
- **Expected:** theo AC-17, không có endpoint nào lộ việc bị chặn.
- **Actual:** 403 ở bước mở chỉ xảy ra khi có chặn. Test B "direct messages: no new thread…" đang khoá hành vi hiện tại.
- **Direction:** BA chọn phương án (a) hoặc (b) theo task board §5.5, rồi sửa test B theo quyết định. Không hạ mức khi chưa qua Debate Gate.

### TR-3: CR-10 mới đóng ở server; contract và UI vẫn đếm UTF-16 · P3 · Owner: T-CONTRACT + web-admin-agent
- **Area:** `packages/contracts/src/moderation.ts` (`ModerationNote` vẫn là `.trim().min(20)`); `ticket-actions.ts:189-196` (`note.trim().length`).
- **Steps:** trong hộp thoại hành động, nhập 10 emoji.
- **Expected:** nút Gửi vẫn khoá.
- **Actual:** nút mở. API trả 400 `errors.moderation.noteTooShort`: đúng, không 500. Nhưng client và server không cùng luật đếm.
- **Direction:** thêm `.refine(s => [...s].length >= 20)` vào contract, hoặc cho `noteLength` đếm theo code point. Chỉ đổi mã thông báo, không đổi hợp đồng HTTP.

### TR-4: `TRUNCATE` trong AC-40 có thể khoá chéo với spec khác chạy song song · P3 (flake) · Owner: backend-agent #1 (spec A), lane integration
- **Area:** A "the database refuses UPDATE, DELETE and TRUNCATE…".
- **Cơ chế:**
  - `TRUNCATE moderation_actions CASCADE` lấy ACCESS EXCLUSIVE trên `moderation_actions` rồi mới tới `audit_logs`, và chỉ sau đó trigger mới raise lỗi.
  - Harness `removeModerationTrail` của file khác làm theo thứ tự ngược lại: DELETE `audit_logs` rồi DELETE `moderation_actions`.
  - Hai phía khớp thời điểm thì Postgres báo 40P01 thay vì 42501, và có thể làm hỏng `afterAll` của file kia.
- **Xác suất:** thấp, vì cửa sổ chỉ vài mili giây. Không sửa, vì test không sai về logic.
- **Direction:** nếu gặp lỗi đỏ 40P01 thì chạy lại, hoặc chạy nhóm `e2e/modules/moderation` với `--no-file-parallelism`. Về lâu dài: đưa `SET LOCAL lock_timeout = '2s'` vào `attempt`, hoặc tách ca TRUNCATE ra spec chạy riêng.

### TR-5: `collectQueue` đi hết hàng đợi toàn cục, giới hạn 200 trang · P3 (flake theo dữ liệu) · Owner: backend-agent #1, lane integration
- **Area:** Q "orders P0…". Trang cỡ 2 × 200 trang = 400 ticket mở. DB dev còn rác từ lần chạy hỏng (ví dụ harness fail vì chưa áp 0009) có thể vượt ngưỡng này và gây `queue pagination did not terminate`.
- **Đã soát:** không spec nào hạ mức ticket hay đẩy `first_reported_at` về sau, nên keyset không lặp dòng khi các file chạy song song. Assert "no duplicates" an toàn.
- **Direction:** chạy `pnpm db:clean-test` trước (§6 bước 3).

### TR-6: rủi ro còn lại sau CR-2, chat nhóm của sự kiện bị gỡ · P3 · Owner: ba-agent
- `POST /conversations/:id/participants` và gửi tin trong phòng `event_group` của một sự kiện `suspended`/`taken_down` không đi qua `eventVisibleTo`. Kẻ lừa đảo vẫn nhắn được cho người đã vào phòng.
- Brief §4 loại group chat khỏi phạm vi nên đây không phải bug của task này. Cần BA ghi vào backlog.

### Khoảng trống bao phủ (không phải bug)
- UI không có test tự động nào ở cả hai web (không Playwright): AC-3, AC-8, AC-19, AC-28, AC-48, cộng phần UI của 14 AC ở §2.
- AC-36 và AC-42 chỉ được kiểm chặt trên một loại hành động (xem §2).
- T-API-6 DoD còn nợ `EXPLAIN` cho `GET /events?lat&lng&radiusMeters` (§6 bước 9).

## 4. Kiểm lại các bản sửa CR

| CR | Trạng thái | Bằng chứng |
|---|---|---|
| CR-1 | **Đóng** | `report.repository.ts` `ownerHasNotBlocked` một chiều cho event/post/comment (cả tác giả, chủ post và organizer của thread)/user. Resolve chạy trước rate limit. Test R "blocked by the owner (CR-1)" so body với id không tồn tại và giữ AC-7. Debate Gate với BA về chiều ngược lại chưa có biên bản. |
| CR-2 | **Đóng** trong phạm vi | `common/db/event-visibility.ts` được dùng ở event findById/list, comment targetExists/findById, reaction `EXISTS_SQL.event/.comment`, rsvp `occurrenceVisible`. Hợp đồng đổi: attendees với id lạ trả 404 `OCCURRENCE_NOT_FOUND`. `web-client` bọc `.catch(() => null)` nên không vỡ. Test B "CR-2…". Còn TR-6. |
| CR-3 | **Đóng** | `profile.repository.block` và report target `user` dùng `deleted_at IS NULL AND status <> 'deleted'`. Test B "CR-3: …" ×2, R "accounts that are not active (CR-3)". |
| CR-4 | **Đóng** | `moderation.repository.conflictedOnTarget` (ticket mọi trạng thái của target, cộng ticket mà các hành động trước đó trên target đã dùng) được gọi khi thiếu `ticketId`. Test A CR-4 ×2. |
| CR-5 | **Đóng ở API, còn mở ở UI** | `suspend_user` gọi `lift_expired_suspension` trong cùng tx, `before` được sửa. Test A CR-5. UI xem **TR-1**. |
| CR-6 | **Đóng** | `ReportService` gọi `raiseTicket` (GREATEST/LEAST, chỉ khi mức mới cao hơn) trên nhánh dedupe. Test R "a graver reason…(CR-6)". |
| CR-7 | **Mở** (chờ BA) | TR-2 |
| CR-8 | **Đóng** | Comment `findById` thêm `commentThreadVisibleTo`. Attendees 404 khi có chặn với organizer. Test B "CR-8: …" ×2. |
| CR-9 | **Đóng một nửa** | `tsc` web-admin sạch qua tsconfig map (§1). `next build` và `pnpm install` thật vẫn phải chạy (§6 bước 10). |
| CR-10 | **Đóng ở server** | `assertNoteLength` đếm code point ở act/dismiss/severity, trả 400 `noteTooShort`. Test A CR-10. Contract và UI xem **TR-3**. |
| CR-11 | Mở (nit, ngoài danh sách sửa) | cursor `me/blocks` vẫn dùng `toISOString()` |
| CR-12 | UI đã xử lý (task board T-ADM-3); SQL chưa đổi | — |

## 5. Regression: spec cũ (có trước 52f7f7a)

Kiểm bằng đọc code:

| Spec cũ | Điểm chạm | Kết luận |
|---|---|---|
| `event/event.e2e.spec.ts` | `eventVisibleTo` = điều kiện cũ + chặn; `$1::uuid` nhất quán | Không đổi hành vi khi không có chặn (draft chỉ organizer thấy, radius) |
| `post/post.e2e.spec.ts` | lọc chặn; `findOwner` trả status; 409 chỉ với `hidden/removed` | An toàn |
| `comment/comment.e2e.spec.ts` | chỉ luồng post; `commentThreadVisibleTo` phía post chỉ thêm luật chặn | An toàn (spec không có bình luận trên sự kiện) |
| `reaction/reaction.e2e.spec.ts` | CR-2: react lên sự kiện draft của người khác nay trả 404 | **Đã sửa setup** (publish trong `beforeAll`, orchestrator). Assertion giữ nguyên. `startsAt 2026-11-01` vẫn ở tương lai. |
| `rsvp/rsvp.e2e.spec.ts` | `blocked_with_organizer`; attendees gate | Attendees chỉ gọi trên sự kiện published. Không token vẫn 401 trước service. Join draft vẫn 400. An toàn. |
| `chat/chat.e2e.spec.ts`, `chat.gateway.e2e.spec.ts` | `respond blocked` ghi thêm `blocks`; `isBlockedBetween` | Cặp bị chặn (alice ↔ blocker) không được dùng lại. Phòng nhóm trên sự kiện draft không đi qua luật hiển thị. An toàn. |
| `auth/auth.e2e.spec.ts` | `assertUsable` async; nhánh `account_suspended` đứng trước reuse-detection | Chỉ bắt đúng lý do đó, luồng rotation/reuse giữ nguyên. An toàn. |
| `profile`, `media`, `admin-system-health`, `health`, `mail` | `findByHandle(handle, viewer)`; ma trận quyền thêm khoá | An toàn (DP xanh) |
| **Mọi spec** (harness) | `removeModerationTrail` chạy ở mọi `cleanup()`: cần **bảng 0009** và **role superuser** (`session_replication_role`) | Chưa áp 0009 hoặc user DB không phải superuser thì **mọi** spec fail ở `afterAll` (§6 bước 1–2) |

## 6. Lệnh phải chạy trên máy có Docker (Node ≥ 24, pnpm), đúng thứ tự

```bash
# 0. Cài đặt + DB
pnpm install
pnpm db:up

# 1. Áp 0009 (DB đã có dữ liệu; volume mới tinh đã tự chạy qua initdb.d — chạy lại sẽ lỗi ở CREATE TYPE và rollback sạch)
docker exec -i vncare-postgres-1 psql -U dnc -d dnc -v ON_ERROR_STOP=1 --single-transaction \
  < apps/api/src/database/sql/0009_moderation_core.sql

# 2. Harness cần superuser: phải in ra 't'
docker exec vncare-postgres-1 psql -U dnc -d dnc -tAc "SELECT rolsuper FROM pg_roles WHERE rolname = current_user"

# 3. Dọn rác của các lần chạy trước (TR-5)
pnpm db:clean-test

# 4. Unit test package (bản chạy thật, thay cho shim)
pnpm --filter @dnc/contracts test && pnpm --filter @dnc/domain test && pnpm --filter @dnc/i18n test

# 5. Typecheck API
pnpm --filter @dnc/api typecheck

# 6. E2E API, lần 1 rồi lần 2 liên tiếp (không flaky)
pnpm --filter @dnc/api test
pnpm --filter @dnc/api test
#    Nếu lỗi đỏ là 40P01 ở ca TRUNCATE (TR-4): chạy riêng để phân biệt flake với bug
pnpm --filter @dnc/api exec vitest run e2e/modules/moderation e2e/modules/audit --no-file-parallelism

# 7. Teardown sạch: cả 3 số phải bằng 0 sau khi chạy xong
docker exec vncare-postgres-1 psql -U dnc -d dnc -tAc \
  "SELECT (SELECT count(*) FROM users WHERE email LIKE '%@example.test'),
          (SELECT count(*) FROM moderation_tickets), (SELECT count(*) FROM blocks)"

# 8. M4-4 / AC-40: bằng chứng SQL (chạy khi còn dữ liệu demo, trước bước 7 hoặc trên dữ liệu tay)
docker exec vncare-postgres-1 psql -U dnc -d dnc -c \
  "SELECT actor_type, actor_role, action_type, target_type, target_id, target_user_id, reason_code, left(note,40), created_at
     FROM moderation_actions ORDER BY created_at DESC LIMIT 20"

# 9. T-API-6 DoD: vẫn phải dùng idx_events_location
docker exec vncare-postgres-1 psql -U dnc -d dnc -c "EXPLAIN SELECT 1 FROM events e WHERE ST_DWithin(e.location, ST_MakePoint(108.247,16.06)::geography, 5000) AND e.deleted_at IS NULL AND e.status='published'"

# 10. Web admin (CR-9) + web client + lint
pnpm --filter @dnc/web-admin typecheck && pnpm --filter @dnc/web-admin build
pnpm --filter @dnc/web-client typecheck && pnpm --filter @dnc/web-client build
pnpm lint

# 11. Lane screen (tay hoặc Playwright khi có), EN + VI:
#     sheet báo cáo (12 lý do, khối 113/115, ô chặn mặc định, offline + Thử lại, 429),
#     chặn/bỏ chặn + /settings/blocked, queue (3 trạng thái SLA, đổi giờ máy),
#     chi tiết ticket + hộp thoại (note 10 emoji: TR-3), khoá lại tài khoản có hạn khoá đã qua (TR-1),
#     audit log, curator không thấy menu
```

Cột `e.location` ở bước 9 khớp `idx_events_location` (0002). So kế hoạch với câu SQL thật của `EventRepository.list` khi có thể.

## Agent Output
Status: needs-review
Files changed: `.agent/specs/_changes/moderation-core/test-report.md` (file này). Không sửa file test hay code nào.
Files read:
- 7 spec e2e mới/sửa + `moderation-fixtures.ts` + `harness.ts`
- spec cũ: rsvp, chat, reaction, event, auth
- `apps/api/src/{common/db,modules/{report,moderation,audit,profile,comment,reaction,rsvp,event,post,chat,auth,area}}`
- `0009`, contracts (safety/moderation/audit/event/reaction), domain + test, `web-admin ticket-actions.ts`
Test evidence: xem §1. Typecheck ×7 sạch (api còn 5 lỗi TS2307 có sẵn). Unit qua shim: 77/77.
Mức tin cậy cuối: **trung bình**
Cần Debate Gate: **có**. CR-7 (TR-2) chờ BA. Biên bản BA cho chiều ngược lại của CR-1 chưa có.
