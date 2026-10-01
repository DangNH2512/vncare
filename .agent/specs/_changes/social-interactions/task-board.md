# Task board: social-interactions (Tech Lead, 01/10/2026)

Brief: [brief.md](brief.md). Khuôn: [discover-and-admin-overview/task-board.md](../discover-and-admin-overview/task-board.md). Cùng quyết định Coordinator 01/10/2026: Q-1..Q-5 theo mặc định BA. Mọi AC id dẫn theo brief (S2-AC-n, S3-AC-n, S4-AC-n).

**Cổng G0 (chỉ cho card web):** card web-client chỉ bắt đầu sau khi đợt Discover/Swipe commit. Cho tới lúc đó cấm đụng `apps/web-client-side/app/(shell)/discover/**`, `app/_lib/swipe-store.ts`, `app/_lib/use-now.ts`, `app/_components/auth-provider.tsx`, `next.config.ts`, và `app/_lib/api.ts` (đang dirty). Card backend và card `packages/*` không bị G0. Mọi card web đọc file ở trạng thái đã commit.

## 1. Quyết định kỹ thuật (a)–(i) của brief §17

| Câu | Quyết định | Căn cứ code |
|---|---|---|
| (a) Audit | **Dùng chung bảng `audit_log` của track Admin** (migration `0010_audit_log.sql`). Social **không** tạo `moderation_audit_log`. Chỉ S2-5 ghi audit (chủ thread xoá bình luận người khác, cùng transaction), phụ thuộc X-1. `.agent/rules/behaviors.md:114-115` ghi tên `moderation_audit_log`: Coordinator đổi tài liệu cho khớp tên cuối cùng của Admin. S2-1..S2-4 không cần audit. | `comment.service.ts:148-151` (TODO moderation) |
| (b) Follow | **Phương án A** (bảng `follows` đa hình như doc 03 §8.4): một nguồn sự thật, không phải dựng bảng thứ hai khi có follow event/venue. Mất toàn vẹn FK được bù bằng: (1) kiểm đích tồn tại + hợp lệ khi tạo; (2) `FollowRepository.deleteAllForUser(userId, tx?)` xoá **hai chiều**; (3) e2e gọi thẳng hàm này. **Phát hiện:** repo chưa có job/ service ẩn danh hoá tài khoản (`anonymized_at` chỉ là cột), nên S4-AC-11 chỉ chứng minh được ở mức hàm repository; nối vào job ẩn danh là follow-up F-5 (Coordinator ghi vào backlog, gắn với task ẩn danh). Enum đủ 5 giá trị, API v1 chỉ nhận `user`. | brief §9.2; `0008_identity.sql:57` |
| (c) Mã lỗi | Sự kiện `cancelled` + ghi bình luận: **403 `COMMENTS_CLOSED`** (`errors.comment.closed`, key mới). Đọc `cancelled`: 200. `draft/pending_review/suspended/taken_down/đã xoá`: **404 `EVENT_NOT_FOUND`** cả đọc và ghi. Reaction trên sự kiện: cho phép khi `published` hoặc `cancelled` (không có văn bản), còn lại 404. Chat: T0 gọi tạo/vào/gửi: **403 `TRUST_LEVEL_TOO_LOW`** (`@MinTrustLevel(1)` đã chạy trước service, không lộ gì về phòng). Không đủ RSVP/không phải thành viên: **404 `CONVERSATION_NOT_FOUND`** (tạo phòng khi chưa đủ điều kiện: 404 `EVENT_NOT_FOUND`). Trước giờ mở: 403 `CHAT_NOT_OPEN` (`errors.chat.notOpen`, `details.opensAt`). Sau giờ đóng, gửi: 403 `CONVERSATION_CLOSED` (`errors.chat.closed`, key mới). `occurrenceId` không thuộc `eventId`: 404 `EVENT_NOT_FOUND`. | `comment.repository.ts:92-99` |
| (d) Idempotency bình luận | **Dedupe phía client** (D-S2-8), không thêm cột/migration. R-4 giữ nguyên. | brief S-6 |
| (e) Vị trí suggestions | Module `follow` mới: `GET /api/v1/users/suggestions`. Không xung đột route: profile dùng `profiles/:handle`, `me/profile` (`profile.controller.ts:32,38,53`). `viewerIsFollowing` do `ProfileService` đọc qua hàm read-only của repository riêng của profile (một `EXISTS` trên `follows`), không import `FollowRepository`. | profile.controller.ts |
| (f) Kiểm RSVP cho chat | `ChatRepository` có phương thức riêng `findEligibility(viewerId, conversation/eventId)` chạy **SQL read-only** trên `events`/`event_occurrences`/`rsvps` (mẫu `rsvp.repository.ts`). Không import `RsvpRepository`/`RsvpModule` (giữ biên module). Vị từ: viewer là organizer của event, **hoặc** có `rsvps.status IN ('confirmed','attended') AND deleted_at IS NULL` trên đúng occurrence. Ghi comment trỏ `rsvp.repository.ts` và `0002_rsvp_core.sql` vì lặp vị từ. Dùng **ở mọi request** (join, create, findForParticipant, list, send, read, delete message). | `chat.repository.ts:214-243` |
| (g) Cửa sổ chat | `packages/domain/src/chat-window.ts`, export qua `index.ts`: `CHAT_OPEN_BEFORE_START_MS = 48*3_600_000`, `CHAT_CLOSE_AFTER_END_MS = 48*3_600_000`, `chatWindowOf({startsAt, endsAt}) -> {opensAt, closesAt}` (không có `endsAt` thì `startsAt + 48h`), `chatStateAt(window, now) -> 'not_open'\|'open'\|'closed'` (mở: `now >= opensAt`; đóng: `now >= closesAt`). Hàm thuần nhận `Date`, test biên ±1 giây. API dùng để chặn, web dùng để hiện "Opens {time}". | doc 01 UC-46 |
| (h) Socket S3b | **Không** proxy WebSocket qua Next. Web nối **thẳng origin API** (`NEXT_PUBLIC_SOCKET_URL`, mặc định `http://localhost:3101`), `transports: ['websocket','polling']`, token qua handshake `auth` (đã có). Gateway thêm `cors.origin` đọc từ env allow-list (`WEB_ORIGINS`), `credentials: false`. **Không sửa `next.config.ts`.** Production: nginx `location /socket.io/` với `Upgrade`/`Connection` (ghi vào tài liệu vận hành, không code). **Payload socket chỉ là tín hiệu** `{conversationId, messageId}` (không body, không sender): client luôn lấy nội dung qua REST, nên quyền (huỷ RSVP, rời phòng) được kiểm ở REST và không lộ tin cho socket còn sống trong room. Thay đổi so với D-S3-11 ("chèn nếu id chưa có"): tốn thêm 1 request mỗi tin, chấp nhận ở beta. | `chat.gateway.ts` |
| (i) `avatarUrl` | **Không** (đúng mặc định). `UserSummary` đúng 4 trường. | brief D-1 |

Quyết định phụ:
- **Số migration (đề xuất Coordinator đối chiếu Admin):** Admin `0010_audit_log.sql`, **Social `0011_follows.sql`**, Admin `0012_reports.sql`. Social không phụ thuộc 0010 trừ S2-5.
- **Gộp thay đổi package để tránh tranh file:** một card contracts (SH-1) chứa **toàn bộ** thay đổi additive của S2+S3+S4; một card i18n (SH-2) chứa **toàn bộ** key brief §15 (EN+VI) + hai key mới `errors.comment.closed`, `errors.chat.closed`. Sau đó không card nào khác động vào `packages/contracts|i18n` (trừ S3-1 thêm `packages/domain/src/chat-window.ts`).
- **`call()` trong `apps/web-client-side/app/_lib/api.ts:101` chưa export.** Card S2-3 (web đầu tiên sau G0) là người **duy nhất** sửa `api.ts` (chỉ thêm `export` cho `call`/`CallInit` nếu có); mọi hàm Social sau đó nằm trong file riêng: `app/_lib/comments-api.ts`, `chat-api.ts`, `follow-api.ts`. Hết đụng `api.ts` giữa các card web.
- **Rate limit** dùng `RateLimitService` (reserve-first, fail-open, `Retry-After`). `keyFor` hiện chỉ nhận cửa sổ `'hour'|'day'`: card S2-2 được thêm `'minute'` (additive) trong `apps/api/src/common/rate-limit/` và xác nhận cửa sổ ngày là TTL 24 giờ từ lần đầu (đúng D-S2-7); khác biệt nếu có phải ghi lại. Hằng số hạn mức đặt trong `rate-limit.config.ts` theo bảng brief. 429 dùng `RateLimitedException` có sẵn. Bình luận/tin bị từ chối do validation hoặc idempotent replay thì `release` slot.
- Đồng thời: S3 không chạm đếm RSVP/sức chứa (chỉ đọc `rsvps`). Race thật sự duy nhất: tạo phòng đồng thời (S3-0/S3-AC-18) và trần follow 500 (S4-1).

## 2. Hợp đồng

### 2.1 `packages/contracts` (SH-1, toàn bộ additive, không đổi/ xoá trường cũ)
- `user-summary.ts` mới: `UserSummary = z.object({ userId: z.uuid(), handle: z.string(), displayName: z.string(), trustLevel: z.number().int().min(0).max(5) })`. Allow-list, không `.omit()`.
- `post.ts` `PostResponse`: `author: UserSummary.nullable()`. `comment.ts` `CommentResponse`: `author: UserSummary.nullable()`.
- `chat.ts`: `MessageResponse.sender: UserSummary.nullable()` (null cho `system` và tài khoản đã rời); `ConversationParticipantResponse.user: UserSummary.nullable()`; `ConversationResponse.event: z.object({ id: z.uuid(), title: z.string(), startsAt: z.iso.datetime(), endsAt: z.iso.datetime().nullable() }).nullable()` (null cho `direct`); `ConversationResponse.chatWindow: z.object({ opensAt, closesAt }).nullable()`.
- `profile.ts` `PublicProfileResponse`: `viewerIsFollowing: z.boolean().nullable()` (null: guest hoặc chính mình).
- `follow.ts` mới: `FollowTargetType = z.enum(['user','event','venue','category','area'])`; `FollowResponse = { userId: uuid, following: z.literal(true), notify: boolean, createdAt: iso }`; `FollowingItem = { user: UserSummary, followedAt: iso }`; `ListFollowingQuery = { limit (mặc định 20, tối đa 50), cursor? }`; `SuggestionQuery = { limit: int 1..10 default 3 }`; `SuggestionsResponse = { items: UserSummary[] }`. Export qua `index.ts`.
- Không có package `api-client` trong repo; không sinh gì thêm. OpenAPI chạy từ schema (`common/openapi.ts`).

### 2.2 Endpoint (đã chốt)
| Method path | Auth | Ghi chú |
|---|---|---|
| `GET /posts`, `GET /posts/:id`, `GET /(posts\|events)/:id/comments` | public | thêm `author`; cùng route cũ |
| `POST (posts\|events)/:id/comments` | T1 | + rate limit 429, 403 `COMMENTS_CLOSED`, 404 `EVENT_NOT_FOUND` |
| `PUT /comments/:id/pin` | chủ thread | kiểm trước khi gỡ ghim cũ |
| `DELETE /comments/:id` | tác giả/chủ thread | xoá root xoá reply cùng transaction |
| `POST /conversations` | T1 + đủ điều kiện | `event_group`: lười + idempotent, organizer là `owner` |
| `POST /conversations/:id/participants` | T1 + đủ điều kiện | chỉ `event_group` active |
| **`DELETE /conversations/:id/participants/me`** (mới) | participant | 204 idempotent, đặt `left_at` |
| `GET/POST .../messages`, `PUT .../read` | participant đủ điều kiện | cửa sổ + 429; `markRead` kiểm message thuộc phòng (R-14) |
| **`POST /users/:userId/follow`** (mới) | T1 | 200 `FollowResponse` idempotent; 403 `CANNOT_FOLLOW_SELF`, `FOLLOW_LIMIT_REACHED`, `TRUST_LEVEL_TOO_LOW`; 404 `USER_NOT_FOUND`; 429 |
| **`DELETE /users/:userId/follow`** (mới) | T1 | luôn 204 |
| **`GET /me/following`** (mới) | login | mới nhất trước, cursor `(created_at,id)` |
| **`GET /users/suggestions`** (mới) | public | `UserSummary[]`, sắp tất định theo D-S4-5 |

Mã lỗi mới (body phẳng `{code,messageKey,details?}`): `COMMENTS_CLOSED` (`errors.comment.closed`), `CHAT_NOT_OPEN` (`errors.chat.notOpen`), `CONVERSATION_CLOSED` (`errors.chat.closed`), `CANNOT_FOLLOW_SELF` (`errors.follow.cannotFollowSelf`), `FOLLOW_LIMIT_REACHED` (`errors.follow.limitReached`), `USER_NOT_FOUND` (`errors.profile.notFound`, đã có), 429 `RATE_LIMIT_EXCEEDED` (`errors.rateLimit.exceeded`). Lỗi validation vẫn dạng `{message:[...],error,statusCode}` của `StandardSchemaValidationPipe` (như L-1 của board Discover): AC nào yêu cầu "messageKey" cho validation phải đọc theo dạng này.

### 2.3 Dữ liệu
Một migration duy nhất của Social: `apps/api/src/database/sql/0011_follows.sql` = đúng DDL brief §9.2 (enum 5 giá trị, `ck_follows_no_self`, `uq_follows_edge`, `idx_follows_target WHERE notify`, `idx_follows_follower`). Rollback: `DROP TABLE follows; DROP TYPE follow_target_enum;` (bảng mới, không dữ liệu cũ). Suggestions: anti-join `NOT EXISTS` trên `uq_follows_edge`, không index mới trên `users/profiles` (R-7). Không migration cho S2/S3.

Trần 500 + race: trong một transaction, `pg_advisory_xact_lock(hashtextextended(follower_id::text, 0))`, đếm, rồi `INSERT ... ON CONFLICT DO NOTHING`. Nếu `ON CONFLICT` không chèn thì đọc dòng cũ trả 200.

Tạo phòng: server xác định `occurrenceId` (occurrence sớm nhất chưa xoá nếu client không gửi; nếu gửi thì phải thuộc `eventId`), rồi `INSERT ... ON CONFLICT (occurrence_id) WHERE occurrence_id IS NOT NULL DO NOTHING` + `SELECT` (đối chiếu `uq_conversations_occurrence`, `0004_community_interaction.sql:223`; BE đọc đúng predicate). Hai request đồng thời cho ra một phòng.

### 2.4 UI, i18n
Key bám brief §15 nguyên văn (SH-2). Thêm: `errors.comment.closed` (EN "Comments are closed for this event." | VI "Bình luận đã đóng cho sự kiện này."), `errors.chat.closed` (EN "This chat is closed." | VI "Phòng chat này đã đóng."), `reaction.target.post|comment|event`. `profile.following.empty.body` giữ lời không hứa thông báo (Q-5). Quy ước: mọi UGC hiển thị chữ thuần, `whitespace-pre-wrap break-words`.

## 3. Task cards

Quy ước chung mọi card: DoD luôn gồm (1) code, (2) test ở lane ghi trong card, (3) `corepack pnpm --filter <pkg> typecheck` sạch, (4) cập nhật `.agent/specs/_changes/social-interactions/` ghi chú nếu lệch brief, (5) log API không chứa `body`/nội dung. Lệnh test API: `corepack pnpm --filter @dnc/api test -- <đường dẫn spec>` (vitest, BE xác nhận cách chạy e2e có DB trong `apps/api/package.json`). Lệnh web: `corepack pnpm --filter @dnc/web-client typecheck` và `build`; Playwright là script Node ở scratchpad chạy **Chromium và WebKit**, ở 390 px và 1280 px, EN rồi VI.

### Pha 0 (ưu tiên cao nhất, giao ngay như sửa lỗi bảo mật)

**S3-0** — Vá lỗ hổng `join`/`createEventGroup`
- Owner: backend-agent. Goal: đóng S-11/R-2 trước khi có UI nào nối chat.
- Allowed: `apps/api/src/modules/chat/chat.repository.ts`, `chat.service.ts`, `chat.controller.ts` (chỉ nếu cần đổi decorator), `apps/api/e2e/modules/chat/chat-access.e2e.spec.ts` (file mới). Do not edit: `packages/**`, `chat.gateway.ts`, module khác, SQL, web.
- Việc: (1) `ChatRepository.findEligibility` (quyết định (f)). (2) `join`: chỉ `type='event_group'`, `status`/`request_status` hợp lệ, `deleted_at IS NULL`, đủ điều kiện, `trust_level >= min_trust_level_to_join`; còn lại **404 `CONVERSATION_NOT_FOUND`**, không INSERT; bọc `translatePostgresError` (id sai → 4xx). (3) `createEventGroup`: sự kiện `published`; `occurrenceId` thuộc `eventId` hoặc suy ra occurrence sớm nhất; chỉ organizer hoặc RSVP `confirmed/attended` được tạo; lười + idempotent (trả phòng cũ); organizer luôn là `owner` (người gọi attendee là `member`); `minTrustLevelToJoin` từ người không phải organizer bị ép về 0; bọc `translatePostgresError`. (4) `findForParticipant`/`listForUser` thêm điều kiện đủ điều kiện (để huỷ RSVP mất quyền ngay, S3-AC-8). **Không** làm cửa sổ 48h, rate limit, `sender`/`event`, leave (thuộc S3-1).
- Dependencies: none. Parallel: được (chạy cùng SH-1).
- Acceptance: S3-AC-16, S3-AC-17 (phần vai), S3-AC-18, S3-AC-8 (phía API).
- Test lane: **integration/API** (e2e có DB thật) + regression `chat.e2e.spec.ts`/`chat.gateway.e2e.spec.ts` hiện có phải xanh (sửa fixture nếu chúng dựa vào hành vi lỗ hổng, ghi rõ trong báo cáo).
- DoD: e2e chứng minh, và **đếm dòng `conversation_participants` trước/sau**: (i) U gọi `POST /conversations/{direct-id}/participants` → 404, không thêm dòng; (ii) id không tồn tại và id không phải UUID → 404/400, không 500; (iii) phòng sự kiện với người lạ, `waitlisted`, đã huỷ RSVP, T0, dưới `min_trust_level_to_join` → từ chối đúng mã (404, T0 403), không dòng mới; (iv) create bởi người lạ → 404, chưa publish → 404, `occurrenceId` của sự kiện khác → 404, host/attendee → thành công và organizer là `owner` duy nhất; (v) hai `POST /conversations` đồng thời (`Promise.all`) → cùng `id`, một dòng `conversations`; (vi) attendee huỷ RSVP rồi `GET messages`/`POST message`/`PUT read` → 404; (vii) không token → 401. Lệnh: `corepack pnpm --filter @dnc/api test -- e2e/modules/chat` rồi `corepack pnpm --filter @dnc/api test` toàn bộ, `typecheck`.
- Risk: **cao**: sửa kiểm quyền lõi; fixture cũ có thể giả định ai cũng join được; lọc thêm vào `findForParticipant` chạm hot path (index `uq`/PK đủ, đo không cần). Có thể đi thẳng không cần Debate.

**SH-1** — Hợp đồng contracts additive (Social)
- Owner: backend-agent. Allowed: `packages/contracts/src/user-summary.ts` (mới), `follow.ts` (mới), `post.ts`, `comment.ts`, `chat.ts`, `profile.ts`, `index.ts`, `packages/contracts/test/social-contracts.spec.ts` (mới). Do not edit: `admin.ts`, `event.ts`, mọi thứ ngoài `packages/contracts`.
- Goal: mục 2.1. **Phải nối tiếp** với mọi card Admin chạm `packages/contracts/src/index.ts` (Coordinator xếp lịch, không chạy song song).
- Dependencies: none (nhưng thứ tự với Admin). Parallel: cùng S3-0.
- Acceptance: S2-AC-24, S3-AC-21 (cấu trúc schema), S4-AC-14 (shape).
- Test lane: **unit** (schema parse allow-list: `UserSummary` loại `email`/`role` thừa; mọi trường mới `nullable`, cũ không đổi).
- DoD: `corepack pnpm --filter @dnc/contracts test` (hoặc lệnh vitest của package) và `typecheck` xanh; `corepack pnpm -r typecheck` ở **api** và **web-client** đều báo lỗi **chỉ** ở chỗ mapper/response chưa có trường mới (nếu `PostResponse.author` bắt buộc thì BE card kế tiếp sửa; vì vậy SH-1 để các trường mới là `.nullable()` bắt buộc có mặt, và SH-1 **cùng commit** thêm stub `author: null`/`sender: null` tối thiểu trong mapper để build không gãy: được phép sửa `post.mapper.ts`, `comment.mapper.ts`, `chat.mapper.ts`, `profile.mapper.ts` chỉ ở mức điền `null` / `event: null`). Bổ sung allowed files: các `*.mapper.ts` đó.
- Risk: web/mobile cũ thấy trường lạ: vô hại (additive). Lệch hai `PostResponse` nếu Admin cũng sửa `post.ts`: không (Admin không chạm).

**SH-2** — Key i18n (Social)
- Owner: web-client-agent. Allowed: `packages/i18n/messages/en.json`, `vi.json`, `packages/i18n/src/message-keys.ts`. Do not edit: mọi thứ khác. **Nối tiếp** với card Admin chạm `packages/i18n/**`.
- Goal: toàn bộ key brief §15 + `errors.comment.closed`, `errors.chat.closed`, `reaction.target.*` (EN+VI cùng commit, không xoá key cũ).
- Dependencies: none (xếp sau S3-0/SH-1 theo lịch, trước mọi card web UI). Không bị G0 (package, không phải app), nhưng chạy sau commit `packages/i18n` của Discover/m1 để không giẫm file dirty: **đọc bản đã commit**, Coordinator chốt thời điểm.
- Acceptance: S2-AC-23, S3-AC-20, S4-AC-17 (nền).
- Test lane: **unit** (test parity key EN/VI nếu có trong `packages/i18n/test`, nếu chưa thì script kiểm hai file có cùng tập key) + kiểm tay VI (không tiếng Việt không dấu bị viết hoa/ thiếu).
- DoD: `corepack pnpm --filter @dnc/i18n test` (hoặc script kiểm key), `typecheck` mọi app; không key thô lộ; không xoá key.
- Risk: `message-keys.ts` là union có thể xung đột merge với Admin; giải bằng nối tiếp.

### Pha S2

**S2-1** — API: `author` cho bài đăng và bình luận (sửa lỗi "0")
- Owner: backend-agent. Allowed: `apps/api/src/modules/post/post.repository.ts`, `post.mapper.ts`, `post.service.ts`; `apps/api/src/modules/comment/comment.repository.ts` (chỉ phần SELECT/join), `comment.mapper.ts`; e2e mới `apps/api/e2e/modules/post/post-author.e2e.spec.ts`, bổ sung `apps/api/e2e/modules/comment/comment.e2e.spec.ts` (chỉ thêm ca). Do not edit: `packages/**`, các phần logic quyền/ghim/xoá của comment (thuộc S2-2).
- Goal: join `profiles` + `users` **một truy vấn** (không N+1) trong `list`/`findOne` của post và `list` của comment; `author=null` khi `anonymized_at`/`deleted_at` không null hoặc không có hồ sơ. Mẫu join: `rsvp.repository.ts:256-272`.
- Dependencies: SH-1. Parallel: cùng SH-2.
- Acceptance: S2-AC-2 (API), S2-AC-14, S2-AC-24.
- Test lane: **integration** + unit mapper.
- DoD: e2e: `author` đủ 4 trường, vẫn có `authorUserId`/`userId`, không `email/phone/role/status`; tài khoản ẩn danh → `author:null`; `displayName` chứa `<img onerror>` trả nguyên chuỗi; đếm truy vấn của `GET /posts?limit=20` không tăng theo số bài. `corepack pnpm --filter @dnc/api test -- e2e/modules/post e2e/modules/comment`, rồi full `test` và `typecheck`.
- Risk: `post.repository.ts:58-66` có phân trang keyset, join không được đổi thứ tự; hồ sơ `private` vẫn hiện tên (D-S2-14).

**S2-2** — API: quy tắc bình luận/reaction (rate limit, trạng thái sự kiện, ghim, xoá cascade)
- Owner: backend-agent. Allowed: `apps/api/src/modules/comment/**`, `apps/api/src/modules/reaction/**`, `apps/api/src/common/rate-limit/rate-limit.service.ts`, `rate-limit.config.ts` (chỉ thêm cửa sổ `'minute'` + hằng hạn mức; additive), `apps/api/e2e/modules/comment/comment-rules.e2e.spec.ts` (mới), `apps/api/e2e/modules/reaction/reaction-rules.e2e.spec.ts` (mới). Do not edit: `packages/**`, `auth` module, SQL.
- Goal: (1) `targetState` thay `targetExists` (quyết định (c)); đọc và ghi đều áp, **kể cả reaction của sự kiện** (`reaction.repository.ts:26`). (2) rate limit `POST comments`: ngày T1 5/T2 30/T3 100/T4 300/T5+ không giới hạn, cộng 5/phút mọi bậc; reaction 60/phút; reserve-first, `release` khi validation hỏng. (3) `setPinned`: một câu lệnh, CTE `target` kiểm gốc/chưa xoá/đúng thread, `cleared` chỉ chạy `WHERE EXISTS (SELECT 1 FROM target)`; service trả 403 `CANNOT_PIN_REPLY` **trước** khi đụng ghim cũ. (4) xoá root: một transaction xoá mềm root + `parent_id = root`. **Không** ghi audit, **không** đổi quyền xoá của chủ thread (S2-5). Giữ `TODO(moderation)` trỏ S2-5.
- Dependencies: S2-1 (cùng module comment, nối tiếp). Parallel: được với S2-3 (khác app).
- Acceptance: S2-AC-10, 11, 12, 17, 18 (API), 19, 20.
- Test lane: **integration** (ma trận vai: guest, T0, T1 tác giả, T1 người khác, chủ thread) + **regression** (comment.e2e hiện có).
- DoD: e2e với đồng hồ/Redis thật hoặc `RateLimitService` giả có thể điều khiển: comment thứ 6/24h → 429 + `Retry-After`; 6/phút ở T3 → 429; Redis lỗi → vẫn đăng được; ghim reply → 403 và ghim cũ còn `is_pinned=true`; ghim comment của sự kiện khác/đã xoá → 403/404, ghim cũ còn; xoá root với 2 reply → 3 dòng `deleted_at`, `posts.comment_count` đúng; `cancelled` → GET 200, POST 403 `COMMENTS_CLOSED`; `draft` → 404 cả hai; sự kiện đã kết thúc vẫn đăng được. Lệnh: `corepack pnpm --filter @dnc/api test -- e2e/modules/comment e2e/modules/reaction`, full test, typecheck.
- Risk: rate-limit module dùng chung với auth (thay đổi additive, chạy lại test auth: `... test -- e2e/modules/auth`); dùng chung `TRUST` mapping; số liệu hạn mức là mặc định BA (R-3).

**S2-3** — Web: `CommentThread` + composer trên `/events/[id]` + reaction sự kiện
- Owner: web-client-agent. **Chỉ chạy sau G0.** Allowed: `apps/web-client-side/app/_lib/api.ts` (**chỉ** thêm `export` cho `call`/`CallInit`), `app/_lib/comments-api.ts` (mới), `app/(shell)/events/[id]/page.tsx`, `app/(shell)/_components/comments/**` (mới: `comment-thread.tsx`, `comment-composer.tsx`, `comment-item.tsx`, `reaction-button.tsx`), script Playwright ở scratchpad. Do not edit: `discover/**`, `community-post.tsx` (S2-4), `packages/**`, `next.config.ts`, `auth-provider.tsx`.
- Goal: D-S2-1..3, 5, 6, 8, 9, 11 (phần sự kiện), 12 (không nút Remove), 13. Dùng `requireAuth` hiện có (đọc, không sửa `auth-provider.tsx`).
- Dependencies: S2-1, SH-2, G0 (S2-2 nên xong trước khi nghiệm thu AC-12/17, nhưng không chặn việc code).
- Acceptance: S2-AC-1, 3, 4, 5 (sự kiện), 6, 7, 8, 9, 13, 15, 16, 21, 23, 25 (phần event page).
- Test lane: **screen** (Playwright Chromium + WebKit, 390/1280, EN+VI) + typecheck/build.
- DoD: kịch bản Playwright: guest đọc 3 comment (ghim đầu) rồi bấm Reply ra modal và ô nhập giữ chữ; member đăng, trả lời reply (một cấp), Like lạc quan và hoàn tác khi `route.abort`; ghim/bỏ ghim bởi organizer, không thấy nút ở người khác; phân trang 45 bình luận (20/40/45, không trùng id); offline rồi "Try again" không tạo hai bản (dedupe 60 giây); 429 giữ chữ; sự kiện `cancelled` ẩn form; `draft` của organizer ẩn thẻ; không cuộn ngang với URL dài ở 390 px; không key thô ở VI. Lệnh: `corepack pnpm --filter @dnc/web-client typecheck && corepack pnpm --filter @dnc/web-client build`.
- Risk: **cao nhất ở UI**: đua Like (AC-15) cần hàng đợi thao tác cuối-thắng; `aria-live`; chạm `events/[id]/page.tsx` (chạm cả RSVP: chỉ thêm thẻ dưới Attendees, không đổi logic RSVP).

**S2-4** — Web: thread inline + Like + tên tác giả trên `CommunityPost`
- Owner: web-client-agent. Allowed: `apps/web-client-side/app/(shell)/_components/community-post.tsx`, các file `_components/comments/**` (đã có, chỉ sửa nếu bắt buộc, ghi rõ), `app/_lib/comments-api.ts`, script scratchpad. Do not edit: `discover/**`, `event-card.tsx`, `api.ts`.
- Goal: D-S2-1 (inline, lười), D-S2-11 (post), D-S2-13 (tên, `TrustBadge`, avatar chữ cái đầu, `author=null` → "Former member"), xoá `authorUserId.slice(0,2)`.
- Dependencies: S2-1, S2-3 (dùng lại `CommentThread`), SH-2.
- Acceptance: S2-AC-2, 5 (post/comment), 14, 21, 23, 25.
- Test lane: **screen** + typecheck/build.
- DoD: Playwright: Home hiện "Linh Nguyễn" (link `/u/linh`), badge, avatar "L", không "0"; `author:null` → "Former member" không link; mở/đóng thread giữ trạng thái; Like bài 4→5→4; WebKit + Chromium, EN+VI. `typecheck` và `build` của `@dnc/web-client`.
- Risk: Home feed đang được Discover sửa (G0): đọc bản commit; Like trên feed không được gây N call (post dùng `reactionCount`).

**S2-5** — (CHỜ X-1) Nút "Remove" + audit xoá bình luận người khác
- Owner: backend-agent rồi web-client-agent (hai card con S2-5a/S2-5b). Dependencies: X-1 (bảng `audit_log` của Admin, `0010`) + S2-2 + S2-3. Chưa viết card chi tiết; Coordinator mở sau khi Admin xong A-audit. Allowed (dự kiến): `comment.service.ts`, `comment.repository.ts` (cùng transaction), `comment-item.tsx`. Acceptance: S2-AC-22(b), S2-AC-21.

### Pha S3

**S3-1** — API: cửa sổ chat, rời phòng, rate limit, `sender`/`user`/`event`
- Owner: backend-agent. Allowed: `apps/api/src/modules/chat/chat.repository.ts`, `chat.service.ts`, `chat.controller.ts`, `chat.mapper.ts`; `packages/domain/src/chat-window.ts` (mới), `packages/domain/src/index.ts` (**nối tiếp** với Admin vì Admin cũng sửa file này), `packages/domain/test/chat-window.spec.ts` (mới); `apps/api/e2e/modules/chat/chat-rules.e2e.spec.ts` (mới); chỉnh `chat.e2e.spec.ts` nếu hợp đồng đổi. Do not edit: `chat.gateway.ts` (S3-4a), `packages/contracts` (đã SH-1), web.
- Goal: (1) `chat-window.ts` (quyết định (g)); API dùng: tạo/vào trước `opensAt` → 403 `CHAT_NOT_OPEN` + `details.opensAt`; gửi sau `closesAt` → 403 `CONVERSATION_CLOSED`, đọc vẫn được. (2) `DELETE /conversations/:id/participants/me` (204, idempotent, đặt `left_at`, hộp thư ẩn, vào lại được nếu còn đủ điều kiện). (3) rate limit gửi: T1 30/T2 100/T3 300/T4+ 500 mỗi giờ + 10/phút; **idempotency replay chạy trước, không tính** (`chat.service.ts:126-135`). (4) mapper điền `sender`, `participants[].user`, `event`, `chatWindow` (join `profiles`/`events`/occurrence trong truy vấn danh sách, không N+1). (5) `markRead` kiểm `lastReadMessageId` thuộc phòng. (6) hộp thư `GET /conversations?type=event_group` lọc đúng.
- Dependencies: S3-0, SH-1. Parallel: được với S2-4 (khác app).
- Acceptance: S3-AC-1 (API), 3, 4, 5, 6, 7, 8, 9, 15 (API), 17, 19, 21.
- Test lane: **unit** (`chat-window`, đồng hồ giả, biên ±1 giây) + **integration**.
- DoD: unit biên mở/đóng cho có/không `endsAt`, đổi `TZ` không ảnh hưởng; e2e ma trận vai (organizer, attendee, waitlisted, ex-attendee, người lạ, T0, guest); 31 tin trong giờ → 429 + `Retry-After`; retry `clientMessageId` không tăng đếm; leave lặp 204; `unreadCount` không tăng khi `markRead` id cũ; response không lộ `lastReadAt`/`unread_count` người khác; không endpoint nào cho host xoá tin người khác. Lệnh: `corepack pnpm --filter @dnc/domain test`, `corepack pnpm --filter @dnc/api test -- e2e/modules/chat`, full test, typecheck.
- Risk: cửa sổ giờ (lệch múi giờ): tính tất cả UTC, test biên; `chatWindow` null cho `direct`; hot path `listForUser` thêm join (kiểm bằng `EXPLAIN` tuỳ chọn trong `BEGIN … ROLLBACK`).

**S3-2** — Web: thẻ chat + thread REST + gửi idempotent
- Owner: web-client-agent. Sau G0. Allowed: `app/_lib/chat-api.ts` (mới), `app/(shell)/events/[id]/chat/page.tsx` (mới) và `app/(shell)/events/[id]/chat/_components/**` (mới), `app/(shell)/events/[id]/_components/chat-card.tsx` (mới; **page.tsx của events/[id] chỉ được thêm một dòng import+render thẻ**, ghi rõ), script scratchpad. Do not edit: `discover/**`, `api.ts`, `nav-items.ts` (S3-3), `next.config.ts`.
- Goal: D-S3-1..3, 5..9, 12, 13, 14 (dòng "Be kind", không nút Report/Block), polling 5 giây khi tab hiện / 30 giây khi ẩn, `clientMessageId` UUID giữ nguyên khi retry, hàng chờ offline cục bộ, IME-safe Enter. `chatStateAt` từ `@dnc/domain` cho "Opens {time}" (giờ `Asia/Ho_Chi_Minh`).
- Dependencies: S3-1, SH-2, S2-3 (cả hai đụng `events/[id]/page.tsx`: **nối tiếp**, không chạy cùng lúc).
- Acceptance: S3-AC-1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 20, 22.
- Test lane: **screen** (Playwright 2 context = hai thành viên, Chromium + WebKit, 390/1280, EN+VI) + typecheck/build.
- DoD: A gửi, B thấy ≤ 5 giây; "Sending…" rồi xong; `route.abort` sau khi server đã ghi rồi retry → đúng 1 tin; 75 tin → 30 + cuộn tải thêm không nhảy vị trí; huỷ RSVP → "This chat is no longer available"; chưa mở hiện "Opens …"; đã đóng ô nhập thành "This chat is closed."; Enter/Shift+Enter/IME; `role="log"` + `aria-live`; không cuộn trang với URL dài. `typecheck` + `build`.
- Risk: bàn phím ảo iOS (WebKit) che ô nhập; polling gấp đôi tải khi nhiều tab (chấp nhận beta).

**S3-3** — Web: `/messages` + dấu chưa đọc + mục nav
- Owner: web-client-agent. Sau G0. Allowed: `app/(shell)/messages/page.tsx` (mới) + `messages/_components/**`, `app/(shell)/_components/nav-items.ts`, `side-nav.tsx`, `app/_lib/chat-api.ts` (thêm hàm), script scratchpad. Do not edit: `discover/**`, bottom tabs, `api.ts`.
- Goal: D-S3-6 (c)(d): hộp thư chỉ `event_group`, tổng `unreadCount` làm mới 30 giây khi tab hiện + khi quay lại tab, chấm trên side-nav (không thêm bottom tab), empty state ES.
- Dependencies: S3-1, S3-2 (dùng chung `chat-api.ts` nối tiếp), SH-2. Parallel: được với S4-2 (file rời nhau).
- Acceptance: S3-AC-2 (chấm), 3, 4, 5, 12, 13, 20, 21, 22.
- Test lane: **screen**.
- DoD: 2 phòng sắp theo hoạt động gần nhất, không có `direct`; B +1 chưa đọc → chấm; đọc xong chấm tắt; rỗng → "Browse events" tới `/discover`; guest không thấy mục. `typecheck` + `build`.
- Risk: `nav-items.ts`/`side-nav.tsx` có thể do Discover sửa: đọc bản commit.

**S3-4a** — API gateway S3b: CORS + payload tín hiệu
- Owner: backend-agent. Allowed: `apps/api/src/modules/chat/chat.gateway.ts`, `apps/api/e2e/modules/chat/chat.gateway.e2e.spec.ts`, `apps/api/src/config/**` hoặc nơi env được khai báo (thêm `WEB_ORIGINS`; BE xác nhận chỗ), `.env.example`. Do not edit: `chat.service.ts` (chỉ gọi hàm emit đã có), web.
- Goal: `cors.origin` từ `WEB_ORIGINS`; `message.created`/`conversation.updated` phát `{conversationId, messageId}`; `conversation.join` kiểm đủ điều kiện (dùng `ChatService`/repository, không logic trùng); `typing` chỉ chuyển tiếp `{conversationId, userId}` cho người đã join.
- Dependencies: S3-1 (S3-3 không bắt buộc). Parallel: được với S4-3.
- Acceptance: S3-AC-2 (<1 giây), S3-AC-14 (socket rớt vẫn dùng REST), S3-AC-17.
- Test lane: **integration** (socket.io-client trong e2e).
- DoD: e2e: người ngoài `conversation.join` bị từ chối; payload không có `body`/`sender`; origin ngoài allow-list không nối được; sau khi mất đủ điều kiện, REST trả 404 dù socket còn kết nối. `corepack pnpm --filter @dnc/api test -- e2e/modules/chat`, full test, typecheck.
- Risk: đổi hợp đồng socket cũ (kiểm gateway e2e cũ); nginx production cần `Upgrade` (ghi runbook, không code).

**S3-4b** — Web: socket.io-client + trạng thái kết nối
- Owner: web-client-agent. Sau G0. Allowed: `apps/web-client-side/package.json`, `pnpm-lock.yaml` (**nối tiếp**, chạy một mình trên lockfile; Admin cũng đụng lockfile), `app/_lib/chat-socket.ts` (mới), `app/(shell)/events/[id]/chat/_components/**`, `messages/_components/**`, `.env.example` của web. Do not edit: `next.config.ts`, `discover/**`.
- Goal: D-S3-11/12: kết nối thẳng `NEXT_PUBLIC_SOCKET_URL`, nhận tín hiệu rồi refetch REST, khử trùng theo `id`, "Reconnecting…", fallback polling khi socket rớt, `typing` 4 giây.
- Dependencies: S3-4a, S3-2, S3-3.
- Acceptance: S3-AC-2, 13, 14, 20.
- Test lane: **screen** (Chromium + WebKit; bật/tắt mạng bằng `context.setOffline`).
- DoD: B thấy tin <1 giây; ngắt mạng ≤ 5 giây hiện "Reconnecting…", sau 30 giây "You are offline…", nối lại thì không mất/ không trùng; tắt socket server thì polling vẫn chạy. `typecheck` + `build`; `corepack pnpm install --frozen-lockfile` sạch.
- Risk: WebKit/ITP với WebSocket cross-origin ở dev (localhost khác cổng); bundle size `socket.io-client`.

### Pha S4

**S4-1** — API: migration `0011_follows.sql` + module `follow` + `viewerIsFollowing`
- Owner: backend-agent. Allowed: `apps/api/src/database/sql/0011_follows.sql` (mới), `apps/api/src/modules/follow/**` (mới: controller, service, repository, mapper, module, index), `apps/api/src/app.module.ts` (**chỉ thêm `FollowModule`**, nối tiếp với Admin vì cũng sửa file này), `apps/api/src/modules/profile/profile.repository.ts`, `profile.service.ts`, `profile.mapper.ts`, `apps/api/e2e/modules/follow/follow.e2e.spec.ts` (mới), `apps/api/e2e/modules/profile/` (thêm ca). Do not edit: `packages/**`, bảng khác.
- Goal: DDL brief §9.2; `POST/DELETE /users/:userId/follow`, `GET /me/following`, `GET /users/suggestions` (D-S4-5, tất định); `viewerIsFollowing`; trần 500 với advisory lock; rate limit 30/giờ; `FollowRepository.deleteAllForUser`; không audit, không log `target_id`/`handle`; hồ sơ `private`/không tồn tại cùng 404 `USER_NOT_FOUND`.
- Dependencies: SH-1; số migration `0011` đã Coordinator đối chiếu với Admin (`0010` audit, `0012` reports); runner SQL áp theo thứ tự tên. Parallel: được với S3-2 (web).
- Acceptance: S4-AC-1 (API), 2, 3, 5, 6, 7, 8, 10, 11 (mức hàm), 13, 14, 15, 16.
- Test lane: **integration** (DB thật, chạy migration) + unit nhỏ cho thứ tự suggestions.
- DoD: e2e ma trận guest/T0/T1; `POST` hai lần → 200 và 1 dòng; tự follow → 403 và `INSERT` trực tiếp vi phạm `ck_follows_no_self`; 5 user: hai người có sự kiện sắp tới đứng đầu, hai lần gọi cùng thứ tự, loại người xem/đã follow/`private`/T0/ẩn danh; 500 follow → thứ 501 403 (`Promise.all` 2 request ở 499 → đúng 1 thành công); 31 lượt/giờ → 429, `DELETE` vẫn 204; B không thể biết A follow X; `deleteAllForUser(A)` xoá cả `follower=A` lẫn `target_id=A`. **Migration:** chạy `0011` trên DB đang có dữ liệu (các bảng khác không đổi), rồi `DROP TABLE follows; DROP TYPE follow_target_enum;` hoàn tác sạch, ghi kết quả vào báo cáo (S4-AC-16). Lệnh: `corepack pnpm --filter @dnc/api test -- e2e/modules/follow e2e/modules/profile`, full test, typecheck.
- Risk: **migration**: enum không thể `DROP VALUE` dễ dàng, nhưng 5 giá trị đã chốt đủ; chưa có `dnc_app` role (T-19): nếu có trước thì cấp quyền riêng; truy vấn gợi ý quét `users`/`profiles` (R-7, ổn ở beta); toàn vẹn `target_id` do service.

**S4-2** — Web: right rail thật + Follow lạc quan
- Owner: web-client-agent. Sau G0. Allowed: `app/(shell)/_components/right-rail.tsx`, `app/(shell)/_components/follow-button.tsx` (mới), `app/_lib/follow-api.ts` (mới), script scratchpad. Do not edit: `discover/**`, `api.ts`, `auth-provider.tsx`.
- Goal: xoá `SUGGESTED_PEOPLE` (`right-rail.tsx:20-27`), gọi `GET /users/suggestions?limit=3`, `UserSummary` + `TrustBadge`, `FollowButton` `aria-pressed` + nhãn có tên, lạc quan + hoàn tác + toast, guest → `requireAuth`, người vừa follow không biến mất khỏi khối, khối ẩn hoàn toàn khi rỗng hoặc lỗi.
- Dependencies: S4-1, SH-2, S2-3 (để đã có `call` export). Parallel: với S3-3.
- Acceptance: S4-AC-1, 2, 9a, 10, 12, 13, 17, 18.
- Test lane: **screen** (≥ xl 1280 px) + typecheck/build.
- DoD: không còn tên mẫu; follow → "Following" ngay, tải lại thì người đó không còn trong gợi ý; Follow rồi Unfollow nhanh → trạng thái cuối khớp; `route.abort` hoàn về "Follow" kèm toast; suggestions lỗi → khối ẩn; Chromium + WebKit, EN+VI.
- Risk: `right-rail.tsx` hiện cho cả guest ở xl; chạm file đang dirty (G0).

**S4-3** — Web: nút Follow ở `/u/[handle]` + trang `/following`
- Owner: web-client-agent. Sau G0. Allowed: `app/(shell)/u/[handle]/page.tsx`, `app/(shell)/following/page.tsx` (mới) + `following/_components/**`, `app/_lib/follow-api.ts`, script scratchpad. Do not edit: `discover/**`, `api.ts`, `follow-button.tsx` (dùng lại, không sửa; nếu cần sửa, nối tiếp sau S4-2 và ghi rõ).
- Goal: D-S4-9 (b)(c): `viewerIsFollowing` điều khiển nút, null → không nút (guest thấy nút mở `requireAuth`), `/following` với cursor "Show more", Unfollow, empty ES-26 đã đổi lời (Q-5), link "Following" trên hồ sơ của chính mình, không số follower ở đâu.
- Dependencies: S4-1, S4-2.
- Acceptance: S4-AC-3, 4, 5, 9b, 12, 17, 18.
- Test lane: **screen**.
- DoD: 25 người → 20 + Show more 5; tên dài `truncate`, không che nút ở 390 px; empty không hứa "ping"; Unfollow lần hai 204 không lỗi. `typecheck` + `build`.
- Risk: `/u/[handle]` có thể xem qua server component: lấy `viewerIsFollowing` cần token (kiểm cơ chế fetch hiện có trước khi thiết kế).

## 4. Thứ tự và song song (Social tối đa 2 worker cùng lúc)

Hai làn, mỗi nhịp một cặp (BE ∥ Web hoặc BE ∥ package):

| Nhịp | Worker 1 | Worker 2 | Ghi chú |
|---|---|---|---|
| T0 | **S3-0** (BE, giao ngay) | SH-1 (contracts) | file rời nhau; SH-1 xếp so với Admin trên `index.ts` |
| T1 | S2-1 (BE) | SH-2 (i18n) | SH-2 xếp so với Admin trên `packages/i18n/**` |
| T2 | S2-2 (BE) | S2-3 (web) | **G0** phải xong cho S2-3 |
| T3 | S3-1 (BE) | S2-4 (web) | S3-1 nối tiếp Admin trên `packages/domain/src/index.ts` |
| T4 | S4-1 (BE) | S3-2 (web) | S3-2 nối tiếp S2-3 (cùng `events/[id]/page.tsx`) |
| T5 | S3-4a (BE) | S3-3 (web) | |
| T6 | — (nhường slot cho Admin) | S4-2 (web) | |
| T7 | — | S4-3 (web) | |
| T8 | — | S3-4b (web) | nối tiếp lockfile |
| Sau | S2-5a/b khi X-1 xong | | |

Sau mỗi pha, Tester xác minh AC của pha (S2 sau T3, S3 sau T8, S4 sau T7); BA đối chiếu (brief §18). S3-0 có thể giao ngay lập tức, không chờ Tester của pha khác. Nếu Admin cần slot: thứ tự ưu tiên cắt của Social là S3-0 > SH-1 > S2-1 > S2-2 > S2-3 > S4-1 > S3-1.

File dùng chung phải nối tiếp (một chủ tại một thời điểm): `packages/contracts/src/index.ts` (SH-1 ∥ Admin: nối tiếp), `packages/i18n/**` (SH-2 ∥ Admin: nối tiếp), `packages/domain/src/index.ts` (S3-1 ∥ Admin), `apps/api/src/app.module.ts` (S4-1 ∥ Admin), `apps/api/src/database/sql/` (số 0010/0011/0012), `pnpm-lock.yaml` (S3-4b), `apps/web-client-side/app/_lib/api.ts` (chỉ S2-3), `apps/web-client-side/app/(shell)/events/[id]/page.tsx` (S2-3 → S3-2), `_lib/comments-api.ts` (S2-3 → S2-4), `_lib/chat-api.ts` (S3-2 → S3-3 → S3-4b), `_lib/follow-api.ts` (S4-2 → S4-3), `community-post.tsx` (S2-4 duy nhất), `right-rail.tsx` (S4-2 duy nhất), module `comment` (S2-1 → S2-2), module `chat` (S3-0 → S3-1 → S3-4a).

## 5. Test lane bắt buộc

- **S3-0, S2-1, S2-2, S3-1, S3-4a, S4-1:** integration/API (DB thật, ma trận vai) + regression của e2e cũ cùng module; unit cho `chat-window`, schema contracts, mapper.
- **Card web (S2-3, S2-4, S3-2, S3-3, S3-4b, S4-2, S4-3):** screen (Playwright Chromium + WebKit, 390 + 1280 px, EN + VI, trạng thái loading/empty/error/guest/T0/429) + `typecheck` + `build`. Web-client chưa có vitest; unit logic thuần (nếu cần) phải đặt ở `packages/domain`.
- **Lane bỏ qua có lý do:** `apps/web-admin-side` và `apps/mobile` không đổi, không chạy; không cần unit riêng cho SH-2 ngoài kiểm parity key; không E2E nhiều thiết bị thật (kiểm bằng hai context Playwright).
- **Cuối đợt:** regression `corepack pnpm --filter @dnc/api test` toàn bộ, `corepack pnpm -r typecheck`, `corepack pnpm --filter @dnc/web-client build`, và `corepack pnpm --filter @dnc/web-admin typecheck` (phát hiện hợp đồng additive làm gãy admin).

## 6. Rủi ro (đặc thù dự án)

- **Quyền/trust/riêng tư:** S3-0 là lỗ hổng thật (T1 vào 1-1 của người khác). Rò rỉ qua response: dùng allow-list `UserSummary`, e2e kiểm khoá cấm (`email`, `phone`, `role`, `status`, `lastReadAt`). Socket phát tín hiệu thay nội dung để huỷ RSVP không để lộ tin (quyết định (h)).
- **Đồng thời:** tạo phòng đồng thời (một phòng/occurrence, `ON CONFLICT` trên index có điều kiện); trần follow 500 (advisory lock); Like/Follow đua ở client (hàng đợi thao tác cuối). Không chạm đếm RSVP/sức chứa.
- **Truy vấn địa lý/PostGIS:** không chạm. Danh sách hộp thư và gợi ý follow quét `users/profiles/conversations` không index mới (R-7), ổn ở beta.
- **Múi giờ:** cửa sổ chat tính UTC từ `startsAt/endsAt`, chỉ hiển thị theo `Asia/Ho_Chi_Minh`; test biên ±1 giây và đổi `TZ` máy.
- **Migration:** chỉ `0011_follows.sql` (bảng mới, rollback bằng DROP, chạy thử trên DB có dữ liệu); phụ thuộc đối chiếu số với Admin.
- **BullMQ/EAS:** không chạm hàng đợi; `apps/mobile` không đổi và không buộc build lại EAS. Contracts additive nên mobile cũ vẫn chạy.
- **Kiểm duyệt (R-1, R-6):** bình luận và chat là UGC người lạ thấy được nhưng **chưa có Report/Block/gỡ của host/moderator**; ship cho dev/beta, **cổng bắt buộc trước M6** (Report từ track Admin A4). Host không xoá được tin người khác; chủ thread xoá bình luận người khác bị ẩn UI cho tới S2-5.
- **Dữ liệu cá nhân:** `handle/displayName/trustLevel` (allow-list), nội dung bình luận (công khai), tin chat (chỉ thành viên đủ điều kiện), quan hệ follow (chỉ chiều của chính mình, hard delete). Log API không chứa `body`, `target_id`, `handle`.
- **i18n:** tất cả key tới từ SH-2 một lần để web không đoán; kiểm VI trước khi báo xong từng card web.
- **Dependency ngoài track:** S2-5 chờ `audit_log` (X-1); gắn ẩn danh follow vào job ẩn danh (F-5) vì chưa có job; web chờ G0.

## 7. Cần Coordinator đối chiếu / quyết

1. **Số migration:** Admin `0010_audit_log`, Social `0011_follows`, Admin `0012_reports` (đề xuất bạn đưa). Social chỉ cần `0011` và độc lập với `0010` trừ S2-5.
2. **Tên bảng audit:** thống nhất `audit_log` và sửa `.agent/rules/behaviors.md:114-115`.
3. **Thay đổi so với brief:** socket phát tín hiệu thay vì nội dung tin (D-S3-11); reaction trên sự kiện `cancelled` vẫn cho phép; không có job ẩn danh trong repo nên S4-AC-11 chỉ nghiệm thu ở mức hàm repository (BA điều chỉnh AC hoặc mở follow-up F-5).

Câu hỏi kỹ thuật còn mở: không có điều gì chặn bắt đầu S3-0.
Cần Debate Gate: không. Các đánh đổi (follow A/B, socket proxy, payload tín hiệu) đã chốt theo nguyên tắc đơn giản; chỉ trình chủ dự án migration `0011`.

## 8. Quyết định Coordinator (01/10/2026)

- Số migration chốt: `0010_audit_logs.sql` (Admin A3), `0011_follows.sql` (Social S4-1), `0012_moderation.sql` (Admin A4). Bảng audit duy nhất là của A3; sửa tên trong `.agent/rules/behaviors.md` khi A3 chốt tên cuối.
- Chấp nhận ba thay đổi so với brief ở mục 7.3 (socket phát tín hiệu; reaction trên sự kiện `cancelled`; S4-AC-11 ở mức hàm repository, follow-up F-5).
- S3-0 đã xong ngày 01/10 (297/297 API), chờ review bảo mật rồi commit riêng.

## 9. Ghi chú Coordinator sau review lô 1 (01/10/2026)

- **Key i18n `chat.leave` → `chat.leave.action`** (brief §15 dùng `chat.leave` nhưng xung đột cấu trúc với `chat.leave.confirm`). Card web S3 dùng `chat.leave.action`.
- **`CONVERSATION_CLOSED` dùng `errors.chat.conversationClosed`** (key có sẵn); không thêm `errors.chat.closed`.
- `toAuthor` đang lặp ở `post.mapper.ts` và `comment.mapper.ts`: card S3-1/S4-1 tách một helper `toUserSummary` dùng chung trước khi thêm bản thứ ba; `chat.mapper.ts` thay spread `...p` bằng allow-list.
- S2-2 sửa thêm `rate-limited.exception.ts` (tham số `messageKey` tuỳ chọn) và `rate-limit/index.ts` ngoài Allowed files: chấp nhận (additive, auth giữ key cũ).
- **Card mới S2-2b (backend, sau S2-2):** áp quyết định (c) cho mọi thao tác ghi còn lại — `update`, `remove`, `setPinned` của comment và reaction lên comment khi sự kiện/bài cha không còn công khai (`cancelled` chỉ đọc; `draft`/`pending_review`/`suspended`/`taken_down`/đã xoá → 404). Nguyên tắc "ẩn là ẩn". Review S2-2 minor-2.
- **Nợ kỹ thuật:** gom `RateLimitService` + `RATE_LIMIT_CONFIG` thành một `RateLimitModule` dùng chung (hiện khai báo lặp ở Auth/Comment/Reaction module, nhân bản cờ `degraded` và log). Làm khi có card chạm `auth.module.ts`.
- Hai request ghim đồng thời hai comment khác nhau có thể cùng `is_pinned=true` (hành vi có từ trước; cần partial unique index — follow-up có migration).

## 10. Ghi chú Coordinator sau review S3-1 + S2-2b (01/10/2026)

- S2-2b: approved. S3-1: approved-with-conditions. Điều kiện: socket đã `conversation.join` vẫn nhận nguyên nội dung tin sau khi người dùng huỷ RSVP/rời phòng (review major-1, vi phạm D-S3-1 và quyết định (h)).
- **Coordinator kéo S3-4a lên trước và commit S3-1 cùng S3-4a**: `message.created` chỉ phát `{conversationId, messageId}`, client refetch qua REST có kiểm quyền. Replay đồng thời cùng `clientMessageId` thì release slot và không emit (minor-3a). Lý do: sửa nhỏ, đóng lỗ rò quyền đọc ngay thay vì để nợ.
- **Cổng bắt buộc:** không client web/mobile nào nối socket chat (S3b) trước khi S3-4a được merge.
- S2-2b minor-5 (tác giả vẫn sửa được comment đã bị ẩn) gộp vào cùng lượt sửa: `update` thêm `status = 'visible'`.
- **Nợ ghi nhận:** (1) người huỷ RSVP nhưng không gọi leave vẫn `left_at IS NULL`, còn trong `participants[]` và nhận `conversation.updated` (không nội dung). Xử lý khi có hook huỷ RSVP hoặc lọc participant theo vị từ đủ điều kiện. (2) Trust bị hạ giữa phiên: route chat dựa vào `@MinTrustLevel(1)` theo token; giới hạn chấp nhận được ở beta. (3) `chat.repository.ts` 722 dòng > 500, tách fragment SQL cần Tech Lead xác nhận khuôn file helper. (4) `RateLimitService` khai báo lặp ở 4 module (Auth, Comment, Reaction, Chat).
- **Chủ dự án đã duyệt DDL `0011_follows.sql` phương án A** (một bảng `follows` đa hình, enum 5 giá trị, API v1 chỉ nhận `user`) ngày 01/10/2026, áp trên DB local. S4-1 được mở.
- Review S4-1: approved. Sửa nhanh trước commit: cursor `/me/following` được validate trước khi query, không còn `catch` nuốt lỗi DB; thêm test "cùng khu" cho suggestions. Cursor hỏng ở API phía người dùng thì về trang 1 (cùng quy ước post/comment); admin vẫn trả 400.
- **Nợ:** (1) `FollowRepository.deleteAllForUser(userId, tx)` chưa có caller, gắn vào card xoá/ẩn danh tài khoản (F-5). (2) `idx_follows_target` là partial `WHERE notify`; khi có tính năng tắt thông báo thì thêm index đầy đủ `(target_type, target_id)` hoặc tách DELETE. (3) Replay follow khi đã hết 30 lượt/giờ trả 429, chấp nhận theo AC-13.
