# Requirement Brief — social-interactions (Giai đoạn 1)

**Chủ:** chưa gán (Coordinator gắn) · **Nguồn:** BA Agent, 01/10/2026 (Thứ Năm, giờ Đà Nẵng) · **Trạng thái:** chủ dự án đã chọn cả ba hạng mục và chấp nhận migration cho Follow; chờ Tech Lead chốt hợp đồng và cắt card. Chạy L8, **sau** đợt `discover-and-admin-overview` (không đụng Discover/Swipe/Admin Overview).
**Giai đoạn:** 1 kết nối cộng đồng, thuộc T-05 ("Nối comment + reaction + chat vào web client") cộng thêm Follow (UC-50, M-54). Không chuẩn bị gì cho giai đoạn 2/3.
**Chia pha, giao độc lập, thứ tự S2 → S3 → S4.** S3 và S4 không phụ thuộc nhau. S3 phụ thuộc `UserSummary` do S2 tạo (xem D-1).

## 0. Phụ thuộc ngoài track

| ID | Phụ thuộc | Ảnh hưởng | Mặc định nếu chưa có |
|---|---|---|---|
| X-1 | Bảng `moderation_audit_log` (T-02; track Admin đề xuất `audit_log`, **tên cần thống nhất**: `.agent/rules/behaviors.md:114-115` ghi `moderation_audit_log`) | Chủ thread xoá bình luận của người khác là hành động cưỡng chế, phải ghi audit cùng transaction | UI **không** hiển thị nút "Remove" cho bình luận của người khác cho tới khi X-1 xong (API vẫn cho phép như as-is). Xem D-S2-12 |
| X-2 | Bảng/API `reports` và `blocks` (doc 03 §13.3, §13.7; doc 05 §7.1) **chưa tồn tại** (SQL chỉ có 0000–0009) | Mọi UGC phải report được (doc 05); không có nút Report ở S2/S3 | Ghi **cổng trước M6**: không mở công khai bình luận và chat khi chưa có Report + hàng đợi kiểm duyệt. Dev/beta nội bộ vẫn chạy. Xem Q-1 |
| X-3 | Module `notification` chưa có (notifications page là `BlankScreen`, `notifications/page.tsx:9-16`) | Không có thông báo "có người trả lời bạn", "có người theo dõi bạn", push tin nhắn | Chỉ hiển thị trong app khi người dùng đang mở; follow-up F-1 |
| X-4 | Xác minh email/SĐT chưa có (T-10, T-10b): đăng ký đang cấp thẳng T1, **không ai đạt T2** | Chat nhóm theo doc 01 UC-46 yêu cầu T2 → không ai chat được | Dùng T1 + RSVP `going` (doc 05 §4.3 dòng 414, API hiện tại). Xem Q-2 |

---

## 1. Mục tiêu nghiệp vụ

Một expat vừa đến Đà Nẵng mở một sự kiện hoặc một bài hỏi đáp trên Home và **thấy được cuộc trò chuyện đã có** (ai hỏi, host trả lời gì, câu nào được ghim), có thể hỏi một câu như "Có nói tiếng Anh không?", thả cảm xúc, và nếu đã đăng ký tham gia thì **nhắn nhóm** với những người cùng đi để hỏi "buổi này còn diễn ra chứ?". Họ chọn theo dõi vài người tổ chức đáng tin để lần sau thấy họ trước. Mọi nơi hiển thị **tên người thật** (không phải mã id), tôn trọng quyền riêng tư và không mở lối cho spam.

- **S2** biến API comment/reaction đã có thành trải nghiệm thật trên `/events/[id]` và thẻ bài đăng ở Home; sửa lỗi bài đăng hiện chữ "0" thay vì tên tác giả.
- **S3** nối chat nhóm theo sự kiện (REST, rồi realtime), sửa lỗ hổng phân quyền đang có ở API chat.
- **S4** tạo Follow thành viên (bảng + API + UI), thay danh sách "People to follow" dữ liệu mẫu cứng ở right rail.

## 2. Tác nhân

| Tác nhân | Dùng gì | Ghi chú |
|---|---|---|
| **Guest** | Đọc bình luận, xem số reaction, xem gợi ý người theo dõi | Không viết, không thả reaction, không chat. Bấm hành động thì `requireAuth` (modal, không điều hướng), giữ nội dung đã gõ |
| **Member T0** | Đọc | API `@MinTrustLevel(1)` chặn ghi. Hiện thực tế không tạo ra T0 (đăng ký cấp T1) nhưng AC vẫn kiểm |
| **Member T1+** | Bình luận, trả lời, sửa/xoá của mình, reaction, follow, chat (nếu đã RSVP `going`) | Persona P1 (expat mới đến), P2 (người có sở thích chung) |
| **Event Organizer (host)** | Ghim 1 bình luận trong sự kiện của mình; luôn vào được phòng chat sự kiện của mình, là `owner` | Doc 01 UC-45 "ghim 1 comment" |
| **Chủ bài đăng (post author)** | Ghim 1 bình luận trên bài của mình | As-is `findTargetOwner` trả `author_user_id` |
| **Local Bilingual Host** | Như Organizer | Không có luồng riêng đợt này |
| **Moderator / Admin** | **Không có công cụ** trong đợt này | Ẩn/gỡ qua web-admin là follow-up (cần X-1, X-2) |
| **Người bị theo dõi (followee)** | Không thấy ai theo dõi mình, không nhận thông báo (X-3) | Doc 01 UC-50 "không lộ danh sách người theo dõi" |

Không có tác nhân mới.

## 3. Phạm vi

**Trong phạm vi**

- **S2** (a) Thành phần thread bình luận dùng chung cho `/events/[id]` và `CommunityPost` (mở rộng inline, không có trang `/posts/[id]`). (b) Reaction `like` (toggle) cho sự kiện, bài đăng, bình luận. (c) Soạn, trả lời 1 cấp, sửa, xoá của mình; ghim/bỏ ghim; phân trang gốc và nhánh trả lời. (d) `author` trong `PostResponse` và `CommentResponse` (thay đổi additive) để sửa lỗi "0". (e) Quy tắc API: giới hạn tần suất bình luận theo trust level, sự kiện `draft` không bình luận được, xoá root xoá luôn reply, sửa lỗi ghim làm mất ghim cũ.
- **S3a** Chat nhóm sự kiện qua REST: vào phòng, danh sách tin, gửi tin (idempotent theo `clientMessageId`), đánh dấu đã đọc, hộp thư `/messages`, chấm chưa đọc trên điều hướng, rời phòng, xoá tin của mình. Sửa lỗ hổng `join`/`create`. Cập nhật tin bằng polling.
- **S3b** Realtime qua socket.io namespace `/chat` (kết nối lại, trạng thái mất kết nối, đang gõ).
- **S4** Bảng `follows` (migration 0010), `POST/DELETE /users/:userId/follow`, `GET /me/following`, `GET /users/suggestions`, nút Follow ở right rail và trang `/u/[handle]`, trang `/following`.

**Ngoài phạm vi**

- Chat 1-1 (direct) trên UI: cần Block/Report, `who_can_message_me`, điều kiện "từng chung occurrence" (doc 01 UC-47, Đ29-Đ32) chưa có. API direct giữ nguyên, không sửa, không nối UI.
- Gửi ảnh và chia sẻ sự kiện trong chat (`image`, `event_share`), sửa tin nhắn, thả reaction trong chat, mute, chat bán lại.
- Sắp xếp "Top" của bình luận, @mention có gợi ý (`mentionedUserIds` UI gửi `[]`), chèn link/ảnh trong bình luận, bộ lọc tự động UC-64, dịch bình luận.
- Reaction nhiều loại trong UI (chỉ `like`); "Interested" bằng kind `going` (dễ nhầm với RSVP "Going").
- Report, Block, hàng đợi kiểm duyệt, công cụ ẩn bình luận của moderator, nút xoá bình luận người khác (xem X-1).
- Thông báo (push/email/in-app) cho comment, reply, follow, tin nhắn (X-3).
- Danh sách người theo dõi mình (followers), số follower công khai, follow `event`/`venue`/`category`/`area`, tắt thông báo theo từng người (`notify` có trong cột nhưng UI chưa dùng), ưu tiên feed theo follow (doc 14 S6).
- Trang chi tiết bài đăng `/posts/[id]`, bình luận trên Home event card, `apps/mobile`, `apps/web-admin-side`.

## 4. Hành vi as-is [đọc code; Tester xác nhận bằng chạy thật]

**Web (`apps/web-client-side`)**
- `/events/[id]` (`events/[id]/page.tsx:237-282`) chỉ có thẻ chi tiết và thẻ "Attendees". **Không có bình luận, reaction hay chat.** `_lib/api.ts` không có hàm gọi comment/reaction/conversation (grep). Không có `socket.io-client` trong `apps/web-client-side`.
- `CommunityPost` (`community-post.tsx:43-45`): `authorLabel = post.authorUserId.slice(0, 2).toUpperCase()`. `authorUserId` là UUIDv7 nên hai ký tự đầu thường là `0x` → avatar hiện "0". Không hiện tên, không liên kết hồ sơ. Dòng "💬 N comments" (dòng 91) là chữ tĩnh, không bấm được. Không có nút reaction.
- Right rail (`right-rail.tsx:20-27, 128-149`): `SUGGESTED_PEOPLE` là 3 tên cứng ("Lucas Meyer", "Phạm Bảo Ngọc", "Sarah O'Connell"), nút "Follow" (`shell.rail.follow`) **không có `onClick`**. Hiện cho cả guest ở màn hình ≥ xl.
- Điều hướng không có mục tin nhắn; `/notifications` là `BlankScreen`. `/u/[handle]` có nhưng không có nút Follow/Message (grep).
- `call()` (`api.ts:101-152`) tự refresh token một lần khi 401, gói lỗi vào `ApiError(status, code, messageKey)`; `status===0` là offline.

**API (`apps/api`)**
- **Comment**: `POST /posts/:id/comments`, `POST /events/:id/comments` (`@MinTrustLevel(1)`, `comment.controller.ts:50-52, 75-77`); `GET` công khai; `PATCH /comments/:id` (T1 + chỉ tác giả, 403 `NOT_COMMENT_AUTHOR`); `DELETE` (tác giả **hoặc chủ thread**, `comment.service.ts:135-156`); `PUT/DELETE /comments/:id/pin` (chỉ chủ thread, 403 `NOT_THREAD_OWNER`, reply không ghim được 403 `CANNOT_PIN_REPLY`). Gốc: ghim trước rồi mới nhất trước; nhánh (`?parentId=`): cũ nhất trước. Trả lời reply được gộp về nhánh gốc (`comment.service.ts:60-77`). Giới hạn 2000 ký tự, `mentionedUserIds` ≤ 10. `limit` mặc định 20, tối đa 50 (`content.ts:28-31`).
- `CommentResponse` **chỉ có `userId`**, không tên (`comment.ts:31-50`). `PostResponse` tương tự `authorUserId` (`post.ts:68-97`); `post.repository.ts:58-66` không join `profiles`.
- **Không có rate limit** cho comment/reaction/chat. `RateLimitService` (Redis, fixed window, reserve-first, fail-open sau 750 ms, 429 `RATE_LIMIT_EXCEEDED` + `Retry-After`) đã có nhưng chỉ auth dùng.
- `targetExists` cho sự kiện chỉ kiểm `deleted_at IS NULL` (`comment.repository.ts:92-99`), **không kiểm `status`** → có thể bình luận và đọc bình luận của sự kiện `draft`/`pending_review`/`taken_down`. Reaction cho sự kiện cũng vậy (`reaction.repository.ts:26`).
- `comment.service.ts:148-151` có `TODO(moderation)`: chủ thread xoá bình luận người khác chưa ghi audit.
- `setPinned` (`comment.repository.ts:268-291`): CTE `cleared` **gỡ ghim cũ** chạy cả khi `updated` không khớp dòng nào (ví dụ đích là reply) → 403 `CANNOT_PIN_REPLY` nhưng ghim cũ đã mất.
- Xoá mềm một root **không** xoá reply. Trigger đếm (0005:20-68) chỉ đổi theo từng dòng → `posts.comment_count` vẫn tính các reply mồ côi, trong khi `list` không còn đường tới chúng ở UI.
- **Reaction**: `PUT/DELETE/GET .../posts|comments|events/:id/reactions`, PUT idempotent, DELETE luôn 204. Trigger đếm chỉ cho post và comment (0005:73-103); **sự kiện không có bộ đếm** (`EventResponse` không có `reactionCount`), lấy qua `GET /events/:id/reactions`. Enum `ReactionKind` dùng chung có `going` cho cả comment/post (vô nghĩa).
- **Chat**: `POST /conversations` T1 (direct cần T2, `chat.service.ts:23-24, 60-66`); `GET /conversations`; `POST :id/participants` (T1); `POST :id/messages` (T1, idempotent `clientMessageId`, `chat.service.ts:119-170`); `GET :id/messages` (mới nhất trước, cursor là message id); `PUT :id/read`; `DELETE :id/messages/:messageId` (chỉ người gửi). Người không phải thành viên nhận 404 (`findForParticipant`, `chat.repository.ts:230-243`). Trigger 0005:109-151 tự cộng `unread_count`.
- **Lỗ hổng chat** [đọc code]: (1) `ChatRepository.join` (`chat.repository.ts:214-222`) chỉ `INSERT ... ON CONFLICT` vào `conversation_participants`, **không kiểm loại cuộc trò chuyện, trạng thái, `deleted_at`, `min_trust_level_to_join` (cột chỉ được ghi, không được đọc ở đâu), RSVP hay thời gian**. Bất kỳ T1 nào biết UUID đều có thể `POST /conversations/:id/participants` vào **cuộc trò chuyện 1-1 của người khác**. UUID khó đoán nhưng không phải bí mật (có thể lộ qua `sharedEventId`, log, ảnh chụp). (2) `createEventGroup` (`chat.repository.ts:176-196`) cho **bất kỳ T1** tạo phòng cho **bất kỳ sự kiện** và tự thành `owner`; không kiểm sự kiện tồn tại/đã publish, không kiểm người tạo là host hay đã RSVP; nếu không truyền `occurrenceId` thì có thể tạo nhiều phòng cho cùng sự kiện (chỉ `uq_conversations_occurrence` chặn, mà index đó có điều kiện `occurrence_id IS NOT NULL`); `occurrenceId` không được kiểm thuộc `eventId`. (3) Cả `join` và `create` không bọc `translatePostgresError` → id sai ra 500 thay vì 4xx. (4) Không có giới hạn tin nhắn (doc 05 §6.1 `rl:msg`), không có endpoint rời phòng (cột `left_at` chỉ được hồi sinh bằng `join`). (5) Chưa có cửa sổ mở T-48h/đóng T+48h (doc 01 UC-46). (6) `markRead` không kiểm `lastReadMessageId` thuộc cuộc trò chuyện đó (nhẹ).
- `MessageResponse.senderUserId` và `ConversationParticipantResponse.userId` **chỉ là id** (`chat.ts:74-88, 91-96`) → UI không có tên để hiển thị.
- **Gateway** (`chat.gateway.ts`): namespace `/chat`, xác thực bằng access token handshake, `conversation.join` kiểm thành viên, sự kiện `message.created`, `conversation.updated`, `typing`. Không có cấu hình CORS riêng. Next `rewrites()` chỉ proxy `/api/:path*` (`next.config.ts:37-38`); đường `/socket.io` **không** được proxy → web không nối được socket trong dev nếu chưa đổi.
- **Follow**: không có bảng, enum, module, hợp đồng. Doc 03 §8.4 đã thiết kế bảng `follows` (đa hình), doc 02 đã đặt route (`POST/DELETE /users/{id}/follow`, `GET /me/following`, UC-50).

## 5. Behavior smell (đã chạy checklist)

| # | Smell | Xử lý |
|---|---|---|
| S-1 | Bài đăng hiện "0" thay tên tác giả; mọi nơi UGC chỉ có id | D-1 (`UserSummary`) |
| S-2 | Nút "Follow" ở right rail không làm gì, tên là dữ liệu giả hiển thị cho cả guest (lừa người dùng) | S4 thay bằng dữ liệu thật; trước đó có thể ẩn (R-10) |
| S-3 | Bình luận sự kiện nháp/chờ duyệt/bị gỡ truy cập được qua API | D-S2-4 |
| S-4 | Ghim: lỗi 403 nhưng đã gỡ ghim cũ (CTE chạy ngoài điều kiện) | D-S2-9 |
| S-5 | Xoá root để lại reply mồ côi, `comment_count` lệch | D-S2-10 |
| S-6 | `POST comments` không có khoá idempotency (chat có `clientMessageId`); timeout sau khi server đã ghi → bấm lại tạo trùng | D-S2-8 (mặc định phía client), Tech Lead có thể thêm cột `client_comment_id` (cần migration) |
| S-7 | `ReactionKind.going` dùng được trên comment/post/event, dễ nhầm với RSVP | D-S2-11 (UI chỉ `like`) |
| S-8 | Sự kiện: reaction không có bộ đếm trong `EventResponse` | D-S2-11 (gọi `GET /events/:id/reactions`) |
| S-9 | Doc 01 Đ1 "guest chỉ thấy 3 bình luận đầu" mâu thuẫn doc 10 Q-01 (guest-first) và API (public toàn bộ) | Q-3, mặc định guest đọc đủ |
| S-10 | Doc 05 §4.3 chat T1; doc 01 UC-46 chat T2; API T1 | X-4, Q-2 |
| S-11 | `join`/`create` phòng không phân quyền (xem as-is) | D-S3-1..4, sửa trước khi nối UI |
| S-12 | Chủ thread xoá bình luận người khác không audit (`TODO(moderation)`); doc 01 Đ36 lại muốn "ẩn" kèm report tự sinh, API đang xoá cứng mềm | D-S2-12 |
| S-13 | Không rate limit mọi thao tác UGC trong khi doc 05 §6.1 và doc 01 §11.2 có bảng hạn mức | D-S2-7, D-S3-10, D-S4-9 |
| S-14 | Event card trên Home cũng có thể gặp "Already started" (đợt trước); chat phải tôn trọng cửa sổ thời gian theo giờ bắt đầu thật | D-S3-5 |
| S-15 | Hai tài liệu khác nhau về điều kiện nhắn 1-1 (doc 01 Đ29-32 vs API chỉ kiểm T2) | Ngoài phạm vi; ghi R-8 |

---

## 6. Quyết định chung (mọi pha)

| ID | Câu hỏi | Quyết định | Nguồn |
|---|---|---|---|
| D-1 | Danh tính người dùng trong UGC | Tạo schema dùng chung **`UserSummary`** = `{ userId, handle, displayName, trustLevel }` (allow-list từng trường, không `email/phone/role/status`). Dùng cho `PostResponse.author`, `CommentResponse.author`, `MessageResponse.sender`, `ConversationParticipantResponse.user`, kết quả follow/gợi ý. Trường `userId`/`authorUserId` hiện có **giữ nguyên** (không đổi hợp đồng cũ). Tài khoản đã xoá/ẩn danh hoặc không có hồ sơ: `author = null`, UI hiển thị "Former member". Không `avatarUrl` ở đợt này (avatar ký URL tốn truy vấn; UI dùng chữ cái đầu của `displayName`, follow-up) | `profile.ts:38-58` (allow-list), `rsvp.repository.ts:256-272` (mẫu join `profiles`+`users`), doc 03 |
| D-2 | Hiển thị tên | `displayName` là chữ thuần (React escape, không HTML), liên kết `/u/{handle}`; huy hiệu `TrustBadge variant="compact"` cạnh tên (doc 05 §huy hiệu "mọi nơi: bình luận, hồ sơ") | doc 05 dòng 1092 (Trusted badge ở bình luận); `event.organizer` đã làm vậy |
| D-3 | Nội dung do người dùng tạo | Hiển thị nguyên văn, không dịch, không gắn nhãn ngôn ngữ (`whitespace-pre-wrap break-words`); gửi `bodyLocale` **không** (null) vì UI không biết người dùng gõ ngôn ngữ nào | doc 10 dòng 1890; `community-post.tsx:60-62` |
| D-4 | Thời gian | Bình luận/tin nhắn: tương đối (`timeAgo`, đã có) kèm `title`/`<time dateTime>` UTC; giờ tuyệt đối theo `Asia/Ho_Chi_Minh`. Cửa sổ chat tính theo UTC từ `startsAt/endsAt` | doc 10 T-4 (dòng 1725 cho phép thiết bị, nhưng dự án chọn VN; mặc định BA giữ `Asia/Ho_Chi_Minh` đồng nhất) |
| D-5 | Mã lỗi quyền | 401 chưa đăng nhập; 403 `TRUST_LEVEL_TOO_LOW` kèm `details.required`; 403 sai chủ; 404 khi không thấy/không được thấy; 429 `RATE_LIMIT_EXCEEDED` + `Retry-After`. Body lỗi phẳng `{ code, messageKey, details? }` như hiện có | `chat.service.ts:60-66`, `rate-limited.exception.ts` |
| D-6 | Giới hạn tần suất | Dùng `RateLimitService` có sẵn, khoá theo `userId` (đã HMAC), reserve-first, fail-open (Redis chết thì cho qua, ghi log chuyển trạng thái). Con số theo từng pha dưới đây. Thêm key i18n chung `errors.rateLimit.exceeded` (key `errors.auth.rateLimited` nói về "attempts" nên không dùng lại) | `rate-limit.service.ts:76-96`; doc 05 §6.1; doc 01 §11.2 |
| D-7 | Audit | Chỉ hành động **cưỡng chế** cần `moderation_audit_log` cùng transaction (chủ thread xoá bình luận của người khác). Bình luận/sửa/xoá của chính mình, reaction, ghim, chat, follow: dòng dữ liệu là bằng chứng (không audit riêng). Follow/unfollow **không** audit: doc 03 §8.4 dòng 1347 quy định hard delete "không có giá trị lịch sử", audit sẽ giữ lại đồ thị quan hệ trái nguyên tắc tối thiểu dữ liệu | `.agent/rules/behaviors.md:114-115`; doc 03:1347 |

---

## 7. Pha S2 — Bình luận + reaction + sửa lỗi tên tác giả

### 7.1 Quyết định S2

| ID | Câu hỏi | Quyết định | Nguồn |
|---|---|---|---|
| D-S2-1 | Đặt ở đâu | `/events/[id]`: thẻ "Comments" **dưới** thẻ Attendees. Home: bấm "💬 N comments" trên `CommunityPost` mở thread **inline** (tải lười, đóng lại giữ trạng thái). Dùng chung một thành phần `CommentThread` nhận `target: {type:'event'|'post', id, ownerUserId}`. Không tạo `/posts/[id]` | `events/[id]/page.tsx:237-282`; `community-post.tsx:91`; mockup `web-event-mockup.html` tab Comments |
| D-S2-2 | Ai đọc, ai viết | Đọc: **mọi người kể cả guest**, toàn bộ (Q-3). Viết, trả lời, sửa, xoá của mình, reaction: **T1+**. T0 thấy form bị khoá kèm thông báo actionable từ `errors.auth.trustLevelTooLow`. Guest thấy ô nhập mô phỏng: bấm vào thì `requireAuth`, giữ nguyên chữ đã gõ qua modal | `comment.controller.ts:50`; doc 01 Đ28; doc 10 Q-01, Q-02 |
| D-S2-3 | Thứ tự, phân trang | Gốc: ghim trước, rồi mới nhất trước (đúng API), **không có điều khiển sort** ở v1 ("Top" là follow-up F-3, cần `sort=top` và cursor theo `reaction_count`). 20 gốc mỗi trang, nút "Show more comments" bằng `nextCursor`, khử trùng theo `id`. Mỗi gốc có "View N replies" tải nhánh `?parentId=` (20 mỗi lần, **cũ nhất trước**), nút "Show more replies". Bình luận mới của chính mình chèn ngay đầu danh sách (hoặc cuối nhánh) từ phản hồi của server, không refetch toàn bộ | `comment.repository.ts:166-228`; `content.ts:28-31` |
| D-S2-4 | Sự kiện nào bình luận được | Đọc/ghi chỉ khi sự kiện `published`. `cancelled`: **chỉ đọc** (form ẩn, hiện "Comments are closed because the event was cancelled"). `draft`/`pending_review`/`suspended`/`taken_down`/đã xoá: API trả 404 `EVENT_NOT_FOUND` cho cả đọc và ghi (kể cả organizer ghi); UI organizer ẩn thẻ Comments khi `draft`. **Đã bắt đầu hoặc đã kết thúc**: vẫn bình luận được (người dự xong cảm ơn, hỏi đồ thất lạc) | Mặc định BA; đóng khoảng trống `comment.repository.ts:92-99` |
| D-S2-5 | Trả lời | Một cấp. Bấm "Reply" trên reply thì hiển thị trong **cùng nhánh gốc**, composer ghi "Replying to {name}" (không chèn `@`). API đã gộp sẵn | `comment.service.ts:60-77` |
| D-S2-6 | Sửa/xoá của mình | Sửa trong ô tại chỗ; hiện nhãn "edited" (`isEdited`). Không giới hạn thời gian sửa, không lưu lịch sử (ghi R-5). Xoá có hộp xác nhận. Không sửa được `parentId`/đích (đúng hợp đồng) | `comment.ts:24-29` |
| D-S2-7 | Giới hạn tần suất | `POST comments` (cả gốc và reply, cả hai đích): **theo ngày (cửa sổ 24 giờ kể từ bình luận đầu)** T1 **5**, T2 **30**, T3 **100**, T4 **300**, T5+ không giới hạn mềm; cộng **tối đa 5 bình luận/phút/người** mọi bậc (Mặc định BA, chống dán hàng loạt). 429 kèm `Retry-After`. Reaction: **60 thao tác/phút/người** (Mặc định BA). Sửa và xoá không đếm | doc 01:1005 (bảng ngày); phút và reaction là mặc định BA |
| D-S2-8 | Gửi trùng khi mạng chập chờn | Nút "Post" khoá trong lúc chờ. Lỗi `status 0` hoặc quá thời gian khi gửi: giữ nguyên chữ trong ô, hiện lỗi actionable + "Try again". Khi bấm lại, client **trước hết tải lại trang gốc đầu** và nếu thấy bình luận cùng tác giả, cùng nội dung, tạo trong 60 giây gần nhất thì coi là đã gửi (không tạo bản mới). Tech Lead có thể thay bằng khoá idempotency phía server (cần cột + migration, ngoài phạm vi S2) | S-6; mẫu `clientMessageId` của chat |
| D-S2-9 | Ghim | Chỉ chủ thread (organizer của sự kiện / tác giả bài) thấy nút Pin/Unpin, **chỉ trên bình luận gốc**. Ghim cái mới thì cái cũ tự bỏ (đúng API). Nhãn "Pinned by the host" (sự kiện) / "Pinned by the author" (bài). **API sửa**: kiểm đích là gốc, chưa xoá, đúng thread **trước khi** gỡ ghim cũ; thất bại (403/404) thì ghim cũ **giữ nguyên** | `comment.repository.ts:268-291` (S-4); doc 01 UC-45 |
| D-S2-10 | Xoá root | Tác giả (hoặc chủ thread) xoá bình luận gốc thì **xoá mềm luôn các reply của nó trong cùng transaction**, để `reply_count`/`comment_count` đúng và không có reply mồ côi. Hộp xác nhận ghi rõ "Replies will be removed too." Xoá reply chỉ xoá reply đó | S-5; trigger 0005:20-68 |
| D-S2-11 | Reaction | UI chỉ **một nút "Like"** (kind `like`) toggle: bấm lần 1 `PUT`, bấm lần 2 `DELETE`. Nếu `viewerReaction` là kind khác (dữ liệu từ nơi khác) thì hiển thị đã bấm và bấm lại là `DELETE`. Cập nhật **lạc quan**, lỗi thì hoàn tác và báo. Số đếm: bài và bình luận dùng `reactionCount` có sẵn trong response; **sự kiện** dùng một lần `GET /events/:id/reactions` khi mở trang (trigger không đếm cho sự kiện). Guest bấm: `requireAuth` rồi áp dụng sau khi đăng nhập (pending intent). `going` **không** có trong UI | `reaction.controller.ts`; 0005:73-103; S-7 |
| D-S2-12 | Chủ thread xoá bình luận người khác | API **giữ** (as-is) nhưng **UI chưa hiển thị** "Remove" cho bình luận của người khác cho tới khi X-1 xong và `comment.service.ts` ghi `moderation_audit_log` trong cùng transaction (xoá `TODO(moderation)`). Hai thứ cùng một card, hoàn thành cùng lúc. Doc 01 Đ36 còn yêu cầu hành động này sinh một report `auto_generated`: ghi follow-up F-2 (cần X-2) | `comment.service.ts:148-151`; doc 01 Đ36; T-02 |
| D-S2-13 | Sửa lỗi tên tác giả | `GET /posts` và `GET /posts/:id` trả thêm `author: UserSummary | null` (additive). `CommunityPost` hiện `displayName` (liên kết `/u/{handle}`), `TrustBadge` compact, avatar bằng chữ cái đầu của `displayName`; `author=null` thì "Former member". Avatar hiện ra **không còn** là hai ký tự của UUID. Truy vấn `list` join `profiles` + `users` trong **một** truy vấn (không N+1) | S-1; `post.repository.ts:58-66, 143-171`; `post.mapper.ts:15-41` |
| D-S2-14 | Tác giả có hồ sơ `private` | Tên và handle vẫn hiện (người đó đăng công khai), liên kết `/u/{handle}` dẫn tới trang hồ sơ tự xử lý quyền xem (`profile.service.ts`) | Mặc định BA |
| D-S2-15 | Sự kiện/bài chỉ có `pending_review` của tác giả | Bài `visible` mới bình luận được (đúng `targetExists`); bài của chính tác giả đang chờ duyệt: không bình luận | `comment.repository.ts:95` |

### 7.2 Acceptance criteria S2

**Happy**
- **S2-AC-1 (đọc, sự kiện):** GIVEN sự kiện `published` có 3 bình luận gốc (1 ghim cũ nhất, 2 thường) và guest mở `/events/{id}` WHEN trang tải THEN gọi `GET /api/v1/events/{id}/comments?limit=20` (200, không cần token), thẻ "Comments (3)" hiện bình luận ghim **đầu tiên** với nhãn "Pinned by the host", rồi 2 bình luận còn lại mới nhất trước; mỗi dòng có `displayName` (liên kết `/u/{handle}`), `TrustBadge`, "N hours ago", nhãn "edited" nếu `isEdited`, "View N replies" nếu `replyCount>0`, số like nếu `reactionCount>0`; không có nút Reply/Like hoạt động cho guest (bấm ra modal đăng nhập).
- **S2-AC-2 (sửa lỗi tên tác giả):** GIVEN Home có bài đăng do user `handle=linh`, `displayName="Linh Nguyễn"` WHEN mở Home THEN thẻ bài đăng hiện "Linh Nguyễn" (liên kết `/u/linh`), huy hiệu tin cậy đúng `trustLevel`, avatar chữ "L"; **không** hiện chữ "0" hay hai ký tự của UUID. `GET /api/v1/posts` mỗi item có `author {userId, handle, displayName, trustLevel}` và vẫn có `authorUserId`.
- **S2-AC-3 (đăng bình luận):** GIVEN member T1 đã đăng nhập mở sự kiện `published` WHEN gõ "Is this beginner friendly?" và bấm "Post" THEN gọi `POST /api/v1/events/{id}/comments` body `{ "body": "Is this beginner friendly?", "mentionedUserIds": [] }` (không `bodyLocale`), phản hồi 200 `isPinned=false, depth=0`, bình luận xuất hiện **đầu danh sách (sau bình luận ghim nếu có)** với tên của chính người dùng, ô nhập được xoá và giữ tiêu điểm, bộ đếm "Comments (n)" +1, vùng `aria-live` thông báo "Comment posted."
- **S2-AC-4 (trả lời):** GIVEN một bình luận gốc có 1 reply WHEN member bấm "Reply" trên **chính reply đó** và gửi THEN request có `parentId` = id của reply, server trả `depth=1, parentId` = id của **gốc**, reply mới hiện cuối nhánh của gốc đó (không tạo cấp 3), composer ghi "Replying to {name}" trước khi gửi, "View 2 replies" cập nhật.
- **S2-AC-5 (reaction):** GIVEN member chưa like bài đăng có `reactionCount=4` WHEN bấm "Like" THEN số hiện 5 và nút đã bấm **ngay lập tức**, gọi `PUT /api/v1/posts/{id}/reactions` body `{ "kind": "like" }`; bấm lần nữa thì `DELETE` (204) và về 4. Cùng hành vi với bình luận (`/comments/{id}/reactions`) và sự kiện (`/events/{id}/reactions`; số đếm lấy từ `GET /events/{id}/reactions`, `total`).
- **S2-AC-6 (ghim):** GIVEN organizer mở sự kiện của mình có bình luận A đang ghim và B không ghim WHEN bấm "Pin" trên B THEN `PUT /api/v1/comments/{B}/pin` 200, B lên đầu với nhãn "Pinned by the host", A mất nhãn và về đúng vị trí theo thời gian; bấm "Unpin" trên B thì `DELETE .../pin` 200. Người không phải organizer **không thấy** nút Pin.
- **S2-AC-7 (sửa, xoá của mình):** GIVEN tác giả bình luận WHEN sửa thành văn bản mới và lưu THEN `PATCH /api/v1/comments/{id}` body `{ "body": "..." }`, nhãn "edited" hiện, thứ tự không đổi. WHEN bấm "Delete" và xác nhận THEN `DELETE` 204, bình luận biến mất và số đếm giảm.

**Edge**
- **S2-AC-8 (phân trang):** GIVEN sự kiện có 45 bình luận gốc WHEN mở và bấm "Show more comments" hai lần THEN các trang lần lượt 20, 40, 45 bình luận, nút biến mất ở trang cuối, không `id` trùng, mỗi lần gửi đúng `cursor` của `nextCursor` trước. GIVEN một gốc có 25 reply WHEN bấm "View 25 replies" THEN gọi `?parentId={id}&limit=20` (cũ nhất trước), có "Show more replies" cho 5 còn lại.
- **S2-AC-9 (độ dài, rỗng):** GIVEN ô nhập WHEN chỉ có khoảng trắng THEN nút "Post" bị vô hiệu. WHEN gõ tới 2000 ký tự THEN bộ đếm hiện "0 left" và không thể gõ thêm; dán 2500 ký tự thì cắt còn 2000 và báo. Server nhận 2001 ký tự trả 400 (validation hiện có).
- **S2-AC-10 (ghim hỏng không mất ghim cũ):** GIVEN A đang ghim WHEN `PUT /comments/{reply}/pin` (đích là reply) bởi chủ thread THEN 403 `CANNOT_PIN_REPLY` **và A vẫn `isPinned=true`**. GIVEN `PUT /comments/{id-thuộc-sự-kiện-khác}/pin` THEN 403/404 và ghim cũ giữ nguyên. Cùng assert với comment đã xoá.
- **S2-AC-11 (xoá gốc có reply):** GIVEN bài đăng `commentCount=4` gồm 1 gốc có 2 reply và 1 gốc khác WHEN tác giả xoá gốc đầu THEN cả 3 dòng (gốc + 2 reply) có `deleted_at`, `GET /posts/{id}` trả `commentCount=1`, `GET .../comments?parentId={gốc đã xoá}` không còn item. Hộp xác nhận trước đó có chuỗi "Replies will be removed too."
- **S2-AC-12 (trạng thái sự kiện):** GIVEN sự kiện `cancelled` THEN thẻ Comments hiện đọc được, form ẩn kèm "Comments are closed because the event was cancelled", `POST` trả 403/404 (Tech Lead chốt mã, assert `messageKey`). GIVEN sự kiện `draft` của người khác THEN `GET`/`POST .../comments` trả 404 `EVENT_NOT_FOUND`. GIVEN organizer mở sự kiện `draft` của mình THEN thẻ Comments không hiển thị. GIVEN sự kiện `published` **đã kết thúc** THEN vẫn bình luận được.
- **S2-AC-13 (guest giữ nội dung):** GIVEN guest gõ "Is parking free?" rồi bấm "Post" WHEN đăng nhập xong trong modal THEN ô nhập vẫn chứa nguyên văn đó, chưa gửi tự động, và người dùng bấm "Post" mới gửi. Với reaction, guest bấm Like thì sau đăng nhập like được áp dụng một lần.
- **S2-AC-14 (tác giả đã rời):** GIVEN bình luận/bài của tài khoản đã xoá hoặc ẩn danh WHEN hiển thị THEN `author=null`, UI hiện "Former member", không liên kết, không lỗi hay "undefined".
- **S2-AC-15 (nhiều tab, đua):** GIVEN hai thao tác Like/Unlike liên tiếp nhanh WHEN phản hồi về lộn thứ tự THEN trạng thái cuối khớp thao tác **cuối cùng** của người dùng (không nhảy số).

**Error**
- **S2-AC-16 (mạng):** GIVEN mất mạng WHEN bấm "Post" THEN chữ trong ô giữ nguyên, hiện "We could not post your comment. Check your connection and try again." + nút "Try again", không bình luận nào bị mất; WHEN mạng về và bấm "Try again" sau khi lần đầu **thực ra đã ghi thành công** THEN client phát hiện bình luận trùng (D-S2-8) và **không** tạo bản thứ hai (assert đúng 1 dòng trong DB). Tải bình luận thất bại thì thẻ lỗi "We could not load comments" + "Retry", phần còn lại của trang vẫn dùng được.
- **S2-AC-17 (429):** GIVEN T1 đã đăng 5 bình luận trong 24 giờ WHEN gửi bình luận thứ 6 THEN API trả 429 `RATE_LIMIT_EXCEEDED` + header `Retry-After`; UI hiện "You are commenting too quickly. Try again later." giữ chữ trong ô, không mất nội dung. GIVEN 6 bình luận trong 1 phút (T3) THEN bình luận thứ 6 bị 429. Redis không khả dụng thì bình luận vẫn đăng được (fail-open) và có log chuyển trạng thái.
- **S2-AC-18 (404, 403 do UI cũ):** GIVEN bài/bình luận bị xoá ở tab khác WHEN gửi bình luận/reply/like THEN hiện `errors.post.notFound`/`errors.comment.parentNotFound`/`errors.comment.notFound` đúng ngôn ngữ, thread tự làm mới. GIVEN reaction thất bại THEN số và nút hoàn tác về trạng thái trước và có thông báo ngắn.
- **S2-AC-19 (T0):** GIVEN member T0 (hoặc người bị hạ T0) WHEN mở sự kiện THEN form bị khoá với thông điệp từ `errors.auth.trustLevelTooLow` và hướng dẫn cách nâng bậc (xác minh email); `POST` trả 403 `TRUST_LEVEL_TOO_LOW` `details.required=1`.

**Quyền**
- **S2-AC-20 (API, không chỉ ẩn nút):** GIVEN không token WHEN `POST .../comments`, `PATCH/DELETE /comments/{id}`, `PUT/DELETE .../pin`, `PUT/DELETE .../reactions` THEN 401. GIVEN token T0 WHEN `POST comments` hoặc `PUT reactions` THEN 403 `TRUST_LEVEL_TOO_LOW`. GIVEN user A WHEN `PATCH` bình luận của B THEN 403 `NOT_COMMENT_AUTHOR`. GIVEN user không phải chủ thread WHEN `PUT .../pin` THEN 403 `NOT_THREAD_OWNER`. GIVEN user không phải tác giả/không phải chủ thread WHEN `DELETE` bình luận người khác THEN 403 `NOT_COMMENT_AUTHOR`. GIVEN guest `GET` bình luận/reaction summary THEN 200 (public). Test API cho đủ vai guest, T0, T1 tác giả, T1 người khác, chủ thread.
- **S2-AC-21 (UI bám quyền):** GIVEN T1 không phải chủ thread THEN không thấy Pin; GIVEN không phải tác giả THEN không thấy Edit/Delete; GIVEN chủ thread THEN **không** thấy "Remove" trên bình luận người khác (D-S2-12) cho tới khi X-1 xong.

**Audit**
- **S2-AC-22 (audit):** (a) GIVEN pin/unpin/sửa/xoá của chính mình/reaction THEN dòng dữ liệu phản ánh (`is_pinned`, `is_edited`+`edited_at`, `deleted_at`, hàng `reactions`), `updated_at` đổi; log API **không chứa nội dung bình luận**. (b) GIVEN X-1 đã có WHEN chủ thread xoá bình luận **của người khác** THEN trong **cùng transaction** có một dòng `moderation_audit_log` với `actor` = chủ thread, `action` = xoá bình luận, `entityId` = id bình luận (thao tác UI mở cùng lúc, không trước). Test (b) là cổng nghiệm thu của nút "Remove".

**i18n**
- **S2-AC-23 (EN/VI):** GIVEN `en` rồi `vi` WHEN mở `/events/{id}` và Home ở các trạng thái (đang tải, có dữ liệu, rỗng, lỗi, guest, T0, sự kiện cancelled, 429) THEN mọi chuỗi (tiêu đề, placeholder, nút, nhãn ghim/đã sửa, hộp xác nhận, aria-label, thông báo `aria-live`) đúng ngôn ngữ, không lộ key thô dạng `comments.xxx`; "2 giờ trước"/"2 hours ago" theo locale; nội dung bình luận do người dùng viết hiển thị nguyên văn không dịch; `errors.comment.*` và `errors.rateLimit.exceeded` hiển thị bằng bản dịch của `messageKey`.

**Dữ liệu / giao diện**
- **S2-AC-24 (hợp đồng, rò rỉ):** GIVEN `GET /posts`, `GET /posts/{id}`, `GET .../comments` WHEN kiểm JSON THEN `author` chỉ có `userId, handle, displayName, trustLevel` (không `email`, `phone`, `role`, `status`); không có `moderationState`, `reportCount`. Schema bị `@SerializeOptions` loại mọi trường thừa. `displayName` chứa `<img onerror>` hiển thị như chữ thuần.
- **S2-AC-25 (responsive/a11y):** GIVEN viewport 390 px và 1280 px THEN thread không cuộn ngang với URL dài dán vào, vùng bấm ≥ 44 px (Like, Reply, menu), reply thụt vào nhưng không tràn ở 390 px với chuỗi VI dài nhất, danh sách là `ul/li`, nút "View replies" có `aria-expanded`, thông báo lỗi `role="alert"`, thao tác hoàn toàn bằng bàn phím, sau khi gửi tiêu điểm về ô nhập.

---

## 8. Pha S3 — Chat nhóm sự kiện

### 8.1 Quyết định S3

| ID | Câu hỏi | Quyết định | Nguồn |
|---|---|---|---|
| D-S3-1 | **Ai được chat** | Chỉ **organizer** của sự kiện **hoặc** người có RSVP `confirmed` hoặc `attended` trên occurrence đó, và `trust_level >= 1` (Q-2). Người `waitlisted`/`held`/đã huỷ/bị gỡ: **không**. Điều kiện kiểm **ở mọi request** (vào, đọc, gửi, đánh dấu đọc, danh sách), không chỉ lúc vào: huỷ RSVP hoặc bị host gỡ thì mất quyền ngay, phòng biến khỏi hộp thư | doc 01 UC-46 ("Chỉ người có RSVP going"); doc 05 §4.3:414; `rsvp.repository.ts:266` (các trạng thái) |
| D-S3-2 | 1-1 hay nhóm | **Nhóm theo sự kiện** (`type='event_group'`), **một phòng mỗi occurrence** (v1 mỗi sự kiện đúng một occurrence). 1-1 không có UI | `chat.ts:25-37`; `uq_conversations_occurrence` |
| D-S3-3 | Tạo phòng | **Lười và idempotent**: `POST /conversations {type:'event_group', eventId}` (tham số `occurrenceId` tuỳ chọn, mặc định occurrence sớm nhất) trả **phòng đã có** nếu có, ngược lại tạo. Chỉ người đủ điều kiện D-S3-1 được gọi. Server thêm **organizer làm `owner`** khi tạo; người gọi (nếu là attendee) là `member`. Server **bỏ qua** `minTrustLevelToJoin` từ người không phải organizer (mặc định 0); v1 UI không đặt giá trị này. `occurrenceId` phải thuộc `eventId`; sự kiện phải `published` | Sửa `chat.repository.ts:176-196` |
| D-S3-4 | Vào phòng (`POST /conversations/:id/participants`) | **Bắt buộc sửa** (P0): chỉ `type='event_group'`, `status='active'`, chưa xoá, đủ D-S3-1 và `min_trust_level_to_join`. Cuộc trò chuyện 1-1 hoặc phòng không đủ điều kiện: **404 `CONVERSATION_NOT_FOUND`** (không lộ tồn tại). Id không tồn tại: 404, không 500 | S-11; `chat.repository.ts:214-222` |
| D-S3-5 | Cửa sổ thời gian | Phòng **mở** từ `startsAt - 48 giờ`, **đóng** (`CONVERSATION_CLOSED`, chỉ đọc) từ `endsAt + 48 giờ` (nếu không có `endsAt` thì `startsAt + 48 giờ`). Tính theo giờ của request, không cần job. Trước giờ mở: `POST` tạo/vào trả 403 `CHAT_NOT_OPEN` (`details.opensAt` ISO UTC). Sau khi đóng: lịch sử vẫn **đọc được** với thành viên đủ điều kiện, không gửi được | doc 01 UC-46; doc 10 ES-13 ("This chat opens 48 hours before the event") |
| D-S3-6 | Điểm vào UI | (a) Thẻ "Group chat" trên `/events/[id]` cho người đủ điều kiện (ngoài giờ mở thì hiện "Opens {time}"; người chưa RSVP thấy "RSVP to join the group chat"; guest thấy ẩn). (b) Trang luồng `/events/[id]/chat`. (c) Hộp thư `/messages` liệt kê **chỉ phòng sự kiện** (lọc `type=event_group`), có chấm chưa đọc. (d) Mục "Messages" trong side-nav và dấu chấm chưa đọc (tổng `unreadCount` qua `GET /conversations?type=event_group&limit=50`, làm mới 30 giây khi tab hiện, và khi quay lại tab). Không thêm vào bottom tabs (đủ 5 chỗ) | `nav-items.ts:24-28`; mockup myspace "Group chat" |
| D-S3-7 | Tin nhắn | Chỉ **văn bản** (`type:'text'`, 1–4000 ký tự), hiển thị `sender.displayName` + `TrustBadge`; tin của mình bên phải. Gửi kèm `clientMessageId` (UUID mới mỗi lần soạn, **giữ nguyên khi thử lại**). Tin đang chờ hiện "Sending…", lỗi hiện "Not sent. Tap to retry" và giữ chữ, thử lại dùng đúng `clientMessageId` cũ (server trả bản gốc, không trùng). Mới nhất ở dưới, cuộn lên tải thêm (cursor là id của tin cũ nhất), tải 30 tin mỗi lần | `chat.ts:53-72`; `chat.repository.ts:358-374` |
| D-S3-8 | Đã đọc, chưa đọc | Mở thread thì sau khi hiển thị tin mới nhất gọi `PUT /conversations/:id/read` với `lastReadMessageId` = tin mới nhất (id lớn nhất); chỉ tiến tới, không lùi. `unreadCount` hiển thị theo `ConversationResponse` của chính người đó; **không hiển thị ai đã đọc** | `chat.ts:101-106`; `chat.repository.ts:393-420` |
| D-S3-9 | Rời phòng, xoá tin | Thêm `DELETE /conversations/:id/participants/me` (204, idempotent): đặt `left_at`, ngừng nhận, mất khỏi hộp thư, có thể vào lại nếu còn đủ điều kiện. Xoá tin **của mình** (có sẵn, 204, chỉ người gửi): tin hiện "Message removed" cho mọi người. **Host không xoá được tin người khác** ở đợt này (cần X-1, X-2): ghi rủi ro R-6 | doc 03 §8.2 (`left_at`); `chat.service.ts:219-232` |
| D-S3-10 | Giới hạn | **Tổng tin nhắn/giờ/người**: T1 **30**, T2 **100**, T3 **300**, T4+ **500**; gửi tin lặp lại `clientMessageId` đã có **không** tính (idempotency xử lý trước, như code hiện tại). 429 + `Retry-After`. Thêm "tối đa 10 tin/phút/người" (Mặc định BA). Cảnh báo: T1 30 tin/giờ chặt cho trò chuyện nhóm (Q-2) | doc 05 §6.1 dòng `rl:msg`; `chat.service.ts:126-135` |
| D-S3-11 | Realtime (S3b) | **S3a (REST + polling)** giao trước: thread tải lại 5 giây khi tab hiện và có tiêu điểm, 30 giây khi ẩn; ngừng polling khi tab ẩn lâu. **S3b** thêm socket.io: kết nối `/chat` bằng access token, `conversation.join` mỗi thread đang mở, nhận `message.created` (chèn nếu `id` chưa có), `conversation.updated` (cập nhật hộp thư), `typing` (hiển thị "{name} is typing…", tự tắt sau 4 giây, không lưu). REST là nguồn sự thật: khi (kết nối lại / quay lại tab) luôn **refetch trang mới nhất** và khử trùng theo `id`. Trước S3b Tech Lead phải xử lý: dependency `socket.io-client`, CORS/`path` của gateway, proxy `/socket.io` trong Next (HTTP long-polling transport proxy được, **nâng cấp WebSocket qua Next rewrites không đáng tin cậy ở dev**), nginx production `Upgrade`. Token hết hạn giữa chừng: refresh qua REST rồi kết nối lại | `chat.gateway.ts`; `chat.ts:141-150`; doc 01 C6 ("Mất kết nối → tự kết nối lại; tin nhắn vẫn lưu qua REST"); `next.config.ts:37-38` |
| D-S3-12 | Mất kết nối (UI) | Thanh trên thread: "Reconnecting…" (có `role="status"`), tin đang gửi vào hàng chờ cục bộ và gửi lại theo thứ tự với **cùng `clientMessageId`** khi có mạng; offline > 30 giây hiện "You are offline. Messages will send when you are back." Không mất chữ đang soạn | doc 10 §offline; S-6 |
| D-S3-13 | Danh tính trong phòng | `MessageResponse` thêm `sender: UserSummary | null` (additive; `null` cho `system` và tài khoản đã rời); `ConversationParticipantResponse` thêm `user: UserSummary | null`. Hộp thư hiện tên sự kiện và số người; **cần `ConversationResponse.event: { id, title, startsAt }`** (additive) để không phải gọi thêm | S-1; `chat.ts:90-122` |
| D-S3-14 | Chặn, báo cáo | **Chưa có** (X-2). Phòng chat có dòng cố định "Be kind. Hosts may remove people who break the rules." Không có nút Report/Block/Remove; ghi **cổng trước M6** và R-6. Chat 1-1 không mở UI vì lý do này | doc 05 §7; X-2 |
| D-S3-15 | Thông báo | Chưa có push/email (X-3). Dấu chưa đọc trong app (D-S3-6d) là kênh duy nhất; không `muted_until` UI | X-3 |
| D-S3-16 | Dữ liệu cuộc trò chuyện | Không đưa chat vào chỉ mục tìm kiếm chung (đã có ghi chú trong 0004); log API **không** ghi `body`; không lộ `lastMessagePreview` cho người không đủ điều kiện (liệt kê chỉ cho thành viên) | 0004 dòng 299-300; doc 03 §8.3 |

### 8.2 Acceptance criteria S3

**Happy**
- **S3-AC-1 (vào chat):** GIVEN member T1 có RSVP `confirmed` cho sự kiện bắt đầu sau 20 giờ WHEN mở `/events/{id}` THEN thẻ "Group chat" có nút "Open chat"; bấm thì `POST /api/v1/conversations` body `{ "type": "event_group", "eventId": "…" }` trả phòng (200/201) với organizer là `owner`; điều hướng `/events/{id}/chat`; lần mở thứ hai trả **cùng `id`** (không tạo phòng mới).
- **S3-AC-2 (gửi, nhận):** GIVEN hai thành viên A và B trong phòng WHEN A gửi "Is it still on?" THEN `POST /conversations/{id}/messages` body `{ type:'text', body, clientMessageId }` 200, tin hiện cuối thread của A ngay (trạng thái "Sending…" rồi gửi xong), B thấy tin trong vòng **5 giây** (S3a, polling) hoặc **dưới 1 giây** (S3b) với tên của A và huy hiệu; B có `unreadCount` +1 ở `/messages` và dấu chấm ở side-nav.
- **S3-AC-3 (đã đọc):** GIVEN B có 3 tin chưa đọc WHEN mở thread và tin mới nhất hiện THEN `PUT /conversations/{id}/read` với id của tin mới nhất, `unreadCount=0`, dấu chấm tắt (nếu không còn phòng nào khác chưa đọc); gửi lại id cũ hơn không làm tăng `unreadCount`.
- **S3-AC-4 (hộp thư):** GIVEN người dùng có 2 phòng, một có tin mới nhất 1 giờ trước và một im lặng WHEN mở `/messages` THEN phòng hoạt động gần nhất lên đầu, mỗi dòng có tên sự kiện, `lastMessagePreview` (cắt, chữ thuần), thời gian tương đối, số chưa đọc; phòng im lặng sắp theo `createdAt`; không có hội thoại 1-1 trong danh sách.
- **S3-AC-5 (rời phòng):** GIVEN thành viên WHEN bấm "Leave chat" và xác nhận THEN `DELETE /conversations/{id}/participants/me` 204, phòng biến khỏi `/messages`, không nhận cập nhật; bấm lại (lặp) vẫn 204. WHEN còn đủ điều kiện và vào lại thì lịch sử đọc được.
- **S3-AC-6 (xoá tin của mình):** GIVEN tin của A WHEN A xoá THEN `DELETE …/messages/{id}` 204, mọi người thấy "Message removed"; B không xoá được tin của A (404 `MESSAGE_NOT_FOUND`).

**Edge**
- **S3-AC-7 (cửa sổ thời gian):** GIVEN sự kiện bắt đầu sau 3 ngày WHEN attendee mở thẻ chat THEN thấy "Opens {ngày giờ VN}" và `POST /conversations` trả 403 `CHAT_NOT_OPEN` với `details.opensAt` đúng `startsAt − 48h` (UTC). GIVEN sự kiện đã kết thúc 49 giờ trước THEN phòng mở được ở chế độ chỉ đọc, ô nhập thay bằng "This chat is closed", `POST message` trả 403 `CONVERSATION_CLOSED`. GIVEN đúng biên mở/đóng (±1 giây) THEN assert bằng đồng hồ test.
- **S3-AC-8 (mất quyền):** GIVEN attendee hiện đang ở trong phòng WHEN huỷ RSVP (hoặc bị host gỡ) THEN request kế tiếp `GET /conversations/{id}`, `/messages`, `POST message`, `PUT read` đều 404 `CONVERSATION_NOT_FOUND`, phòng biến khỏi `/messages`, UI thread chuyển thành "This chat is no longer available". Người `waitlisted` mở chat: thẻ chỉ hiện "RSVP to join the group chat"; `POST /conversations` trả 404 (không lộ).
- **S3-AC-9 (idempotent, trùng):** GIVEN gửi tin lỗi mạng sau khi server đã ghi WHEN thử lại với cùng `clientMessageId` THEN server trả đúng tin cũ, thread chỉ có **1** tin; trùng lặp qua socket và qua REST cũng khử theo `id`. Retry không bị tính vào hạn mức giờ.
- **S3-AC-10 (độ dài, rỗng):** GIVEN ô nhập rỗng/khoảng trắng THEN nút "Send" vô hiệu; 4001 ký tự: client chặn, server 400. Enter gửi, Shift+Enter xuống dòng, đang gõ IME (tiếng Việt, tiếng Hàn) không gửi sớm.
- **S3-AC-11 (tải cũ hơn):** GIVEN phòng có 75 tin WHEN mở THEN thấy 30 tin mới nhất; cuộn lên đầu tải 30 tin cũ nữa bằng `cursor`, giữ nguyên vị trí cuộn, không trùng; hết thì "Beginning of the chat".
- **S3-AC-12 (rỗng):** GIVEN phòng chưa có tin THEN hiện empty "No messages yet" + "Say hi to the others going." (hai biến thể: chưa mở/đã đóng-trống có chuỗi riêng). GIVEN `/messages` không có phòng THEN empty "No chats yet. RSVP to an event to join its group chat." + nút "Browse events" tới `/discover`.
- **S3-AC-13 (đa tab/đa thiết bị):** GIVEN hai thiết bị cùng người dùng WHEN đọc ở thiết bị 1 THEN thiết bị 2 cập nhật `unreadCount` ở lần polling/sự kiện kế (≤ 30 giây S3a).

**Error**
- **S3-AC-14 (mất kết nối):** GIVEN đang trong thread WHEN mất mạng THEN trong ≤ 5 giây hiện "Reconnecting…"; tin gõ trong lúc offline ở trạng thái "Sending…" rồi gửi tự động khi có mạng (đúng thứ tự, `clientMessageId` giữ nguyên); quá 30 giây hiện "You are offline…". Khi có mạng thread **refetch** trang mới nhất, không mất và không trùng tin. (S3b) socket rớt thì thread vẫn dùng được qua REST/polling.
- **S3-AC-15 (429, đóng, lỗi server):** GIVEN T1 đã gửi 30 tin trong 1 giờ WHEN gửi tin thứ 31 THEN 429 + `Retry-After`, UI giữ chữ, hiện `errors.rateLimit.exceeded`. GIVEN 5xx khi gửi THEN trạng thái "Not sent. Tap to retry". GIVEN `CONVERSATION_CLOSED` giữa lúc gõ THEN ô nhập chuyển sang chỉ đọc, chữ đang gõ không mất.

**Quyền (đóng lỗ hổng)**
- **S3-AC-16 (không vào được chỗ không phải của mình):** GIVEN user U không thuộc cuộc trò chuyện 1-1 giữa A và B WHEN `POST /conversations/{direct-id}/participants` THEN **404 `CONVERSATION_NOT_FOUND`** và **không** có dòng mới trong `conversation_participants`. GIVEN id không tồn tại THEN 404 (không 500). GIVEN phòng sự kiện mà U chưa RSVP / `waitlisted` / T0 / dưới `min_trust_level_to_join` THEN 404 (hoặc 403 `TRUST_LEVEL_TOO_LOW` cho T0, Tech Lead chốt, assert `messageKey`) và không tạo participant. GIVEN `POST /conversations` event_group bởi người không phải organizer và chưa RSVP THEN 404; `occurrenceId` không thuộc `eventId` THEN 400/404 rõ ràng; sự kiện chưa publish THEN 404.
- **S3-AC-17 (API, mọi vai):** GIVEN không token WHEN gọi mọi `/conversations*` THEN 401. GIVEN non-participant WHEN `GET /conversations/{id}`, `/messages`, `POST message`, `PUT read`, `DELETE message` THEN 404 (không 403, không lộ). GIVEN T0 WHEN `POST message` THEN 403 `TRUST_LEVEL_TOO_LOW`. Có test cho: organizer, attendee, waitlisted, ex-attendee, người lạ, T0, guest.
- **S3-AC-18 (một phòng/occurrence):** GIVEN hai request `POST /conversations` đồng thời cho cùng sự kiện (không truyền `occurrenceId`) THEN chỉ **một** phòng (cùng `id`), organizer là `owner` duy nhất.

**Audit**
- **S3-AC-19 (audit):** GIVEN gửi/xoá tin của mình, vào/rời phòng THEN dòng `messages`/`conversation_participants` (và `deleted_at`, `status='removed'`, `left_at`) là bằng chứng; log API **không** chứa `body` tin nhắn. GIVEN host xoá tin người khác (chưa có, R-6) → khi làm sẽ ghi `moderation_audit_log` (X-1). Tester xác nhận không có endpoint nào cho phép host xoá tin người khác trong đợt này.

**i18n**
- **S3-AC-20 (EN/VI):** GIVEN `en` rồi `vi` WHEN mở thẻ chat, `/events/{id}/chat`, `/messages` ở các trạng thái (chưa mở, đang mở, đã đóng, rỗng, mất kết nối, đang gửi, lỗi, mất quyền, 429) THEN mọi chuỗi và aria-label đúng ngôn ngữ, không lộ key thô; giờ "Opens {time}" theo `Asia/Ho_Chi_Minh`; nội dung tin nhắn do người dùng viết nguyên văn, không dịch; preview hội thoại là chữ thuần. `errors.chat.*` hiển thị bản dịch của `messageKey`.

**Dữ liệu / giao diện**
- **S3-AC-21 (rò rỉ):** GIVEN `MessageResponse`/`ConversationResponse` THEN `sender`/`user` chỉ gồm `userId, handle, displayName, trustLevel`; không `lastReadAt`/`last_read_message_id`/`unread_count` của người khác; hộp thư không lộ phòng người dùng không còn đủ điều kiện.
- **S3-AC-22 (responsive/a11y):** GIVEN 390 px và 1280 px THEN thread cuộn trong khung (không cuộn cả trang), ô nhập dính đáy và không bị bàn phím ảo che (390 px), URL dài trong tin không làm tràn, vùng bấm ≥ 44 px, danh sách tin có `role="log"` + `aria-live="polite"`, bàn phím thao tác trọn vẹn, tin mới không giật cuộn khi người dùng đang đọc phía trên (hiện nút "New messages").

---

## 9. Pha S4 — Follow thành viên

### 9.1 Quyết định S4

| ID | Câu hỏi | Quyết định | Nguồn |
|---|---|---|---|
| D-S4-1 | Đối tượng follow | v1 **chỉ `user`** (người tổ chức và bất kỳ thành viên có hồ sơ xem được). `target_type` trong schema theo doc 03 để chừa chỗ `event/venue/category/area` (không làm sớm: API không nhận) | doc 03 §8.4 (dòng 1336-1355), enum `follow_target_enum` (dòng 1202) |
| D-S4-2 | Ai follow được | **T1+** đã đăng nhập. T0 403 `TRUST_LEVEL_TOO_LOW`. Không tự follow (403 `CANNOT_FOLLOW_SELF`, theo tiền lệ `CANNOT_MESSAGE_SELF`). Trùng: `POST` lần hai trả 200 cùng bản ghi (idempotent), không tạo dòng mới. Bỏ follow: `DELETE` luôn 204 (như reaction) | doc 01 UC-50 (T1); `chat.service.ts:54-59`; `reaction.service.ts:29-39` |
| D-S4-3 | Đích hợp lệ | Người dùng tồn tại, chưa xoá/ẩn danh, đang hoạt động, hồ sơ `public` hoặc `members_only`. Hồ sơ `private` hoặc không thấy được: 404 `USER_NOT_FOUND` (không lộ tồn tại, `messageKey: errors.profile.notFound` đã có) | `profile.service.ts:50` (`visibility`); `profile.ts:18` |
| D-S4-4 | Ai thấy danh sách | **Chỉ chính mình thấy ai mình theo dõi** (`GET /me/following`). **Không** có API/giao diện lộ ai theo dõi người khác, không số follower công khai, không danh sách follower kể cả cho chính chủ (Q-4) | doc 01 UC-50 ("không lộ danh sách người theo dõi") |
| D-S4-5 | Gợi ý "People to follow" | `GET /users/suggestions?limit=3` (mặc định 3, tối đa 10), **công khai** (guest xem được; bấm Follow thì `requireAuth`). Ứng viên: người dùng chưa xoá/ẩn danh, đang hoạt động, hồ sơ **`public`**, `trust_level >= 1`, **không phải chính người xem**, **chưa được người xem theo dõi**. Xếp **tất định** (không ngẫu nhiên, để test và cache): (1) đang có sự kiện `published` sắp diễn ra do họ tổ chức, (2) cùng `home_area_id` với người xem (nếu biết và họ cho hiển thị khu), (3) `trust_level` giảm dần, (4) `events_hosted_count` giảm dần, (5) `created_at` giảm dần, (6) `user_id`. Không có ứng viên: **ẩn cả khối** "People to follow" (không hiện khung rỗng). Danh sách cứng `SUGGESTED_PEOPLE` bị xoá | `right-rail.tsx:20-27, 128-149`; `profile.repository.ts:42-45` (có `events_hosted_count`, `home_area_id`) |
| D-S4-6 | Chống spam | `POST follow`: **30 lượt/giờ/người** (mọi bậc, Mặc định BA) và **tổng đang theo dõi tối đa 500** (403 `FOLLOW_LIMIT_REACHED`). `DELETE` không đếm. 429 + `Retry-After` | Mặc định BA; doc 05 §6.1 không có dòng follow |
| D-S4-7 | Thông báo | Không (X-3). Người bị theo dõi **không** được báo. Ghi F-1 | X-3 |
| D-S4-8 | Tác động trust/ranking | Không đổi `trust_level` hay điểm; follow chưa vào feed, chưa vào xếp hạng thẻ (doc 14 S6 là việc sau). Khi có `blocks` thì follow bị gỡ hai chiều (F-4) | doc 14:8968 (sau) |
| D-S4-9 | UI | (a) Right rail: tên thật (`UserSummary`), `TrustBadge` compact, nút "Follow" đổi thành "Following" (cập nhật lạc quan, lỗi hoàn tác). Sau khi follow, người đó **không biến mất** khỏi khối (tránh nhảy bố cục), lần tải kế mới loại. (b) `/u/[handle]` của người khác: nút Follow/Following (cần `PublicProfileResponse.viewerIsFollowing: boolean | null`; `null` cho guest và xem chính mình), không hiện số follower. (c) `/following` (M-54): danh sách người mình theo dõi, nút "Unfollow", empty ES-26 ("Follow hosts you like"); đường vào: link "Following" trên hồ sơ của chính mình | doc 10 M-54, ES-26 (dòng 296, 1325) |
| D-S4-10 | Xoá tài khoản | Khi xoá/ẩn danh một người dùng, xoá **cả hai chiều** (`follower_user_id = u` **và** `target_type='user' AND target_id = u`). Doc 03:3172 hiện chỉ xoá chiều follower, phải cập nhật. Vì `target_id` đa hình không có FK nên cần việc này bằng service/job | doc 03:3172; doc 03:1345 ("Toàn vẹn do service + job đối soát") |

### 9.2 DDL đề xuất (Tech Lead chốt, Coordinator trình chủ dự án)

Migration `0010_follows.sql` (theo quy ước file SQL hiện tại, T-04 chuyển TypeORM sau). Giữ đúng doc 03 §8.4:

```sql
CREATE TYPE follow_target_enum AS ENUM ('user', 'event', 'venue', 'category', 'area');

CREATE TABLE follows (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  follower_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_type      follow_target_enum NOT NULL,
  target_id        uuid NOT NULL,
  notify           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_follows_no_self
    CHECK (NOT (target_type = 'user' AND target_id = follower_user_id))
);

-- Hard delete on unfollow, so a full UNIQUE (not partial) is correct.
CREATE UNIQUE INDEX uq_follows_edge
  ON follows (follower_user_id, target_type, target_id);

CREATE INDEX idx_follows_target
  ON follows (target_type, target_id) WHERE notify;

CREATE INDEX idx_follows_follower
  ON follows (follower_user_id, target_type, created_at DESC);
```

Lưu ý cho Tech Lead:
- **Phương án B** (BA nêu để cân nhắc): vì v1 chỉ follow `user`, bảng riêng `user_follows(follower_user_id, followee_user_id)` với **hai FK thật** + `CHECK (follower <> followee)` cho toàn vẹn tốt hơn (không cần job đối soát, không mồ côi), giữ `follows` đa hình cho các loại đích khác về sau. Mặc định BA là **phương án A** (doc 03, một bảng, không phải thiết kế lại sau). Tech Lead chốt.
- `follow_target_enum` đủ 5 giá trị để tránh `ALTER TYPE` sau; API v1 **từ chối** giá trị khác `user`.
- Reversible: `DROP TABLE follows; DROP TYPE follow_target_enum;` (không có dữ liệu cũ, không ảnh hưởng bảng khác).
- Không thêm FK `target_id` (đa hình, doc 03:1345); toàn vẹn qua D-S4-3 (kiểm đích tồn tại khi tạo) và D-S4-10 (dọn khi xoá tài khoản).
- Không `deleted_at` (doc 03:1347). Không denormalized counter (số follower không công khai ở v1).
- Truy vấn gợi ý cần chỉ mục hỗ trợ lọc "chưa follow" (`idx_follows_follower` đủ). Không thêm index trên `users`/`profiles` đợt này (quy mô beta, ghi R-7).
- Quyền DB: nếu T-19 (`dnc_app`) xong trước, cấp quyền riêng `follows`.

### 9.3 Acceptance criteria S4

**Happy**
- **S4-AC-1 (gợi ý thật):** GIVEN DB có 5 thành viên `public` T1+, 2 người trong số đó có sự kiện sắp diễn ra do họ tổ chức WHEN mở Home ở màn ≥ xl (guest hoặc member) THEN right rail gọi `GET /api/v1/users/suggestions?limit=3` và hiện **3 người thật** (tên, huy hiệu), hai người có sự kiện sắp tới đứng đầu; không còn "Lucas Meyer / Phạm Bảo Ngọc / Sarah O'Connell"; không có chính người xem; thứ tự lặp lại giống nhau giữa hai lần tải (tất định).
- **S4-AC-2 (follow):** GIVEN member T1 WHEN bấm "Follow" ở right rail THEN nút ngay lập tức thành "Following", gọi `POST /api/v1/users/{id}/follow` (200, `{ userId, following:true, notify:true, createdAt }`); tải lại trang thì người đó **không** còn trong gợi ý; `GET /me/following` có người đó.
- **S4-AC-3 (unfollow):** GIVEN người đang được theo dõi WHEN bấm "Following" → "Unfollow" ở `/following` hoặc trang hồ sơ THEN `DELETE /users/{id}/follow` 204, người đó biến khỏi danh sách, nút trở lại "Follow"; gọi `DELETE` lần hai vẫn 204.
- **S4-AC-4 (trang hồ sơ):** GIVEN member xem `/u/{handle}` của người khác (hồ sơ `public`) THEN thấy nút Follow/Following theo `viewerIsFollowing`; xem hồ sơ của chính mình hoặc là guest thì `viewerIsFollowing=null` và không có nút Follow (guest thấy nút mở `requireAuth`). Không có số follower ở đâu.
- **S4-AC-5 (danh sách `/following`):** GIVEN member theo dõi 25 người WHEN mở `/following` THEN `GET /me/following?limit=20` mới nhất trước, "Show more" tải 5 người còn lại bằng `cursor`, mỗi dòng có tên, huy hiệu, liên kết `/u/{handle}`, "Following since {date VN}", nút Unfollow.

**Edge**
- **S4-AC-6 (idempotent, tự follow):** GIVEN đã follow X WHEN `POST` follow X lần nữa THEN 200 và vẫn đúng **1** dòng trong `follows` cho cặp đó. GIVEN `POST /users/{id-của-chính-mình}/follow` THEN 403 `CANNOT_FOLLOW_SELF` (`messageKey: errors.follow.cannotFollowSelf`) và không có dòng nào; kiểm cả `CHECK ck_follows_no_self` bằng INSERT trực tiếp thất bại.
- **S4-AC-7 (đích không hợp lệ):** GIVEN đích là user đã xoá/ẩn danh/không hoạt động/hồ sơ `private`/id không tồn tại/id không phải UUID WHEN `POST follow` THEN 404 `USER_NOT_FOUND` (id sai định dạng thì 400 validation hiện có) và không tạo dòng nào; phản hồi **giống nhau** giữa "không tồn tại" và "hồ sơ private" (không lộ).
- **S4-AC-8 (trần):** GIVEN member đang theo dõi 500 người WHEN follow người thứ 501 THEN 403 `FOLLOW_LIMIT_REACHED` (`errors.follow.limitReached`), UI hiện thông báo kèm gợi ý bỏ theo dõi bớt; unfollow vẫn được.
- **S4-AC-9 (rỗng):** (a) GIVEN không có ứng viên nào (hoặc người xem đã theo dõi hết) THEN **khối "People to follow" ẩn hoàn toàn**, các khối khác của rail vẫn hiện. (b) GIVEN `/following` rỗng THEN empty "Follow hosts you like" + "You will get a ping whenever they post something new." + nút "Browse hosts" tới `/discover` (ES-26; **lưu ý** câu "ping" hứa thông báo chưa có, Q-5 mặc định đổi lời thành không hứa thông báo).
- **S4-AC-10 (đua):** GIVEN bấm Follow rồi Unfollow nhanh WHEN phản hồi về lộn thứ tự THEN trạng thái cuối khớp thao tác cuối của người dùng và khớp DB; hai tab cùng follow cùng người chỉ tạo 1 dòng (UNIQUE `uq_follows_edge` + `ON CONFLICT DO NOTHING`).
- **S4-AC-11 (xoá tài khoản):** GIVEN A theo dõi B và B theo dõi A WHEN A bị xoá/ẩn danh THEN **không còn dòng follow nào chứa A ở cả hai chiều**, B không thấy A trong `/following` và không có dòng mồ côi.

**Error**
- **S4-AC-12 (mạng):** GIVEN mất mạng hoặc 5xx WHEN bấm Follow THEN nút hoàn về "Follow", toast "Could not follow. Check your connection and try again." (có thể thử lại), không để nút kẹt "Please wait". GIVEN `GET /users/suggestions` lỗi THEN **khối ẩn** (không hiện lỗi vì rail chỉ là lối tắt, như `listEvents` ở rail), phần còn lại dùng được. `/following` lỗi tải thì thẻ lỗi + "Retry".
- **S4-AC-13 (429):** GIVEN member đã follow 30 lần trong 1 giờ WHEN follow lần 31 THEN 429 `RATE_LIMIT_EXCEEDED` + `Retry-After`, nút hoàn về "Follow", thông báo `errors.rateLimit.exceeded`. `DELETE` trong cùng khoảng vẫn thành công.

**Quyền**
- **S4-AC-14 (API):** GIVEN không token WHEN `POST/DELETE /users/{id}/follow`, `GET /me/following` THEN 401. GIVEN token T0 WHEN `POST follow` THEN 403 `TRUST_LEVEL_TOO_LOW`. GIVEN guest WHEN `GET /users/suggestions` THEN 200 (public) và kết quả **không** có người `private`, T0, hay bất kỳ trường ngoài `UserSummary`. GIVEN member A WHEN tìm cách đọc follow của B (`GET /me/following` luôn trả của chính A; không có route theo id) THEN không thể. Có test cho guest, T0, T1.
- **S4-AC-15 (cách ly dữ liệu):** GIVEN A theo dõi X WHEN B gọi mọi endpoint (profile, suggestions, following) THEN không có phản hồi nào cho B biết A theo dõi X; `X` không biết ai theo dõi mình.

**Audit**
- **S4-AC-16 (audit):** GIVEN follow/unfollow THEN **không** ghi audit riêng (D-7; hard delete theo doc 03:1347); dòng `follows` (`follower_user_id`, `target_id`, `created_at`) là bằng chứng khi tồn tại; log API **không** chứa `target_id`/`handle`. GIVEN migration 0010 chạy trên DB đang có dữ liệu THEN các bảng khác không đổi, và `DROP TABLE follows` hoàn tác sạch (Tech Lead chạy thử).

**i18n**
- **S4-AC-17 (EN/VI):** GIVEN `en` rồi `vi` WHEN mở Home (rail), `/u/{handle}`, `/following` ở các trạng thái (đang tải, có dữ liệu, rỗng, lỗi, 429, trần) THEN mọi chuỗi và aria-label đúng ngôn ngữ, không lộ key thô; `displayName` hiển thị nguyên văn; nút `aria-pressed` hoặc nhãn "Following {name}" cho trình đọc màn hình (nhãn cần tên người, không chỉ "Follow").
- **S4-AC-18 (responsive/a11y):** GIVEN 390 px và 1280 px THEN `/following` và nút trên hồ sơ không tràn với tên dài (cắt `truncate`, không che nút), vùng bấm ≥ 44 px; rail chỉ hiện từ xl (như hiện tại) nên mobile dùng `/u/{handle}` và `/following` làm đường vào; bàn phím thao tác trọn vẹn.

---

## 10. Service bị ảnh hưởng

- **apps/api**
  - **S2** `modules/post` (join `profiles`/`users`, mapper thêm `author`), `modules/comment` (`author`, rate limit, kiểm trạng thái sự kiện cho `targetExists`, ghim kiểm trước khi gỡ ghim cũ, xoá root xoá reply; sau X-1 ghi audit), `modules/reaction` (kiểm trạng thái sự kiện, rate limit). Dùng `RateLimitService` (`common/rate-limit`) cho các module trên.
  - **S3** `modules/chat`: sửa `join`, `createEventGroup` (idempotent, đủ điều kiện), kiểm điều kiện RSVP/cửa sổ ở mọi request, thêm `DELETE .../participants/me`, rate limit tin nhắn, thêm `sender`/`user`/`event` vào response, `translatePostgresError` cho `join`/`create`; S3b: cấu hình CORS/`path` gateway. Cần đọc `rsvp` (kiểm trạng thái RSVP) qua một hàm repository chung, tránh import chéo module (Tech Lead chốt).
  - **S4** module mới `follow` (controller, service, repository, mapper, module) + `database/sql/0010_follows.sql`; endpoint suggestions (có thể nằm trong module `follow` hoặc `profile`, Tech Lead chốt); `modules/profile` thêm `viewerIsFollowing` vào `PublicProfileResponse`; dọn follow khi xoá tài khoản.
  - Test e2e: toàn bộ ma trận vai ở AC-20 (S2), AC-16/17/18 (S3), AC-14/15 (S4), cùng hồi quy cho các thay đổi quy tắc.
- **apps/web-client-side**
  - **S2** `events/[id]/page.tsx`, `community-post.tsx`, thành phần `CommentThread`, `CommentComposer`, `ReactionButton` mới; `_lib/api.ts` thêm hàm comment/reaction; `post.card.*` cập nhật.
  - **S3** trang `events/[id]/chat`, `messages`, thẻ chat trên `events/[id]`, mục side-nav + dấu chưa đọc (`nav-items.ts`, `side-nav.tsx`), kho trạng thái hàng chờ gửi; S3b: `socket.io-client`, đổi `next.config.ts` (proxy `/socket.io`).
  - **S4** `right-rail.tsx` (xoá `SUGGESTED_PEOPLE`, nối API), `u/[handle]/page.tsx` (nút Follow), trang `following`, `_lib/api.ts`.
- **apps/web-admin-side**: không đổi. (Moderation UI là follow-up.)
- **apps/mobile**: không đổi; hợp đồng và `UserSummary` dùng lại được sau này.
- **packages dùng chung**
  - `packages/contracts`: mới `user-summary.ts` (`UserSummary`), `follow.ts` (`FollowResponse`, `FollowingItem`, `ListFollowingQuery`, `SuggestionQuery`); sửa `post.ts` (`author`), `comment.ts` (`author`), `chat.ts` (`sender`, `participants[].user`, `event`), `profile.ts` (`viewerIsFollowing`), `index.ts`. Mọi thay đổi là **thêm trường** (additive).
  - `packages/domain`: không bắt buộc. Tech Lead cân nhắc đặt hằng/hàm tính cửa sổ chat (`startsAt - 48h`, `endsAt + 48h`) ở đây để mobile dùng chung và test thuần.
  - `packages/i18n`: `en.json`, `vi.json`, `src/message-keys.ts` (§14).
  - `packages/api-client`: sinh lại sau khi đổi contract (`.agent/rules/behaviors.md:116-117`).

## 11. Yêu cầu hợp đồng API/dữ liệu (ngôn ngữ nghiệp vụ, Tech Lead chốt thiết kế)

- **Người dùng tóm tắt (`UserSummary`)**: id, tên người dùng (handle), tên hiển thị, bậc tin cậy. Chỉ bốn trường này. Có thể rỗng (người đã rời).
- **Bài đăng và bình luận** trả thêm `author` (`UserSummary` hoặc rỗng). Các trường hiện có không đổi.
- **Bình luận**: tạo thêm bị giới hạn tần suất; đọc/ghi bình luận của sự kiện chỉ hợp lệ khi sự kiện đã đăng (đã huỷ chỉ đọc); xoá bình luận gốc xoá luôn các trả lời; ghim thất bại không được làm mất ghim cũ.
- **Phòng chat sự kiện**: "mở phòng" luôn trả phòng đã có nếu có; chỉ organizer và người đã đăng ký tham gia (đã xác nhận hoặc đã tham dự) được mở, vào, đọc, gửi; điều kiện kiểm mỗi lần; phòng mở trước giờ bắt đầu 48 giờ và đóng sau giờ kết thúc 48 giờ (đọc được, không gửi được). Người chưa đủ điều kiện nhận "không tìm thấy". Tin nhắn trả thêm người gửi (`UserSummary`), thành viên trả thêm `user`, phòng trả thêm tóm tắt sự kiện (id, tên, giờ bắt đầu). Có thao tác rời phòng. Tổng tin gửi bị giới hạn theo giờ và theo bậc tin cậy.
- **Theo dõi**: theo dõi một người (idempotent), bỏ theo dõi (idempotent), danh sách người mình đang theo dõi (mới nhất trước, phân trang), danh sách gợi ý (công khai, tất định, tối đa 10). Hồ sơ công khai trả thêm "người xem có đang theo dõi không" (rỗng với khách và với chính mình). Không có đầu ra nào cho biết ai theo dõi một người khác. Mọi thời điểm là UTC ISO; hiển thị do client.

## 12. Ảnh hưởng trust_level / kiểm duyệt / report

- **Trust**: đọc bình luận/chat/gợi ý: không yêu cầu (chat yêu cầu RSVP). Viết bình luận, reaction, follow, gửi tin: **T1** (khớp API). Hạn mức bình luận theo bậc (T1 5, T2 30, T3 100, T4 300/ngày). Chat T1 hay T2 là Q-2. Người chưa đạt thấy `errors.auth.trustLevelTooLow` kèm bậc yêu cầu và hướng dẫn nâng bậc. Follow và bình luận không đổi `trust_level`.
- **Kiểm duyệt**: nội dung mới của S2/S3 người lạ thấy được (bình luận công khai). Chưa có Report/Block/ẩn của moderator/xoá của host với người khác (X-1, X-2). **Cổng trước M6** (Coordinator ghi vào lộ trình, doc 08): Report cho bình luận và tin chat, Block, và công cụ ẩn trên web-admin. Chủ thread xoá bình luận của người khác chỉ mở sau khi có audit.
- **Report**: không thêm. Khi có, `target` là `comment` và `message`; chat cần đính kèm 20 tin gần nhất làm bằng chứng (doc 05 dòng 216).

## 13. Ảnh hưởng dữ liệu cá nhân

| Dữ liệu | Chạm ở đâu | Ai nhìn thấy | Xử lý |
|---|---|---|---|
| `handle`, `displayName`, `trustLevel` (người đăng/người gửi/người gợi ý) | Bài, bình luận, tin chat, gợi ý | Bài và bình luận: mọi người (đã công khai khi đăng). Tin chat: chỉ thành viên phòng. Gợi ý: chỉ hồ sơ `public` | Allow-list `UserSummary`; không email/SĐT; người đã rời thành "Former member" |
| Nội dung bình luận | S2 | Mọi người | Không vào log API; xoá mềm; `mentionedUserIds` để `[]` |
| Nội dung tin chat | S3 | Chỉ thành viên đủ điều kiện | Không vào log, không vào chỉ mục tìm kiếm chung; mất quyền khi huỷ RSVP |
| Quan hệ follow (ai theo dõi ai) | S4 | **Chỉ người theo dõi thấy chiều của mình** | Hard delete khi bỏ; xoá hai chiều khi xoá tài khoản; không audit, không log id; không công khai follower |
| Việc đã RSVP của người dùng (suy ra từ chat) | S3 | Thành viên khác của phòng thấy tên người trong phòng (tương đương danh sách attendee, vốn đã T2+ theo doc 01 UC-43) | Lưu ý lệch: chat T1 cho thấy tên attendee cho T1 trong khi danh sách attendee yêu cầu T2 (Q-2, R-9) |
| Vị trí, avatar | Không chạm | — | Không đổi |

Rút đồng ý/xoá: bình luận và tin của người dùng bị ẩn danh hoá theo job ẩn danh hiện có (doc 03 §xoá dữ liệu); follow xoá hẳn.

## 14. Thông báo cần gửi

Không có đợt này (X-3). Không push, không email. Chỉ trong app: dấu chấm chưa đọc ở side-nav và `/messages` (S3, tắt bằng cách đọc hoặc rời phòng), toast/`aria-live` cho kết quả thao tác. Follow-up F-1: notification cho "có người trả lời bình luận của bạn", "tin nhắn mới (chưa mở app)", "có người theo dõi bạn" (người bị theo dõi tắt được, doc 01 UC-50), giờ gửi theo `Asia/Ho_Chi_Minh`.

## 15. i18n key mới (EN | VI, theo cấu trúc lồng của `packages/i18n/messages/*.json`)

Quy ước: cùng một thay đổi phải cập nhật `en.json`, `vi.json`, `message-keys.ts`; kiểm tra VI trước khi báo xong. **Tái dùng:** `post.card.comments` ("{count} comments"), `post.card.posted`, `post.card.edited`, `common.retry`, `common.loading`, `common.seeAll`, `shell.rail.follow`, `shell.rail.suggestions`, `auth.action.signIn`, `errors.comment.*`, `errors.chat.*`, `errors.auth.trustLevelTooLow`, `errors.post.notFound`, `errors.event.notFound`, `errors.profile.notFound`, `rsvp.action.working`.

**S2 — Bình luận, reaction (`comments.*`, `reaction.*`, `post.author.*`)**

| Key | EN | VI |
|---|---|---|
| `comments.title` | Comments ({count}) | Bình luận ({count}) |
| `comments.composer.placeholder` | Ask a question or leave a comment… | Đặt câu hỏi hoặc để lại bình luận… |
| `comments.composer.aria` | Write a comment | Viết bình luận |
| `comments.composer.counter` | {count} left | Còn {count} ký tự |
| `comments.composer.post` | Post | Đăng |
| `comments.composer.replyingTo` | Replying to {name} | Đang trả lời {name} |
| `comments.composer.cancelReply` | Cancel reply | Huỷ trả lời |
| `comments.composer.locked` | Verify your account to join the conversation. | Hãy xác minh tài khoản để tham gia trò chuyện. |
| `comments.signInPrompt` | Sign in to ask a question or leave a comment. | Đăng nhập để đặt câu hỏi hoặc bình luận. |
| `comments.empty.title` | No questions yet | Chưa có câu hỏi nào |
| `comments.empty.body` | Ask the host anything — what to bring, how to find the spot, whether beginners are welcome. | Hỏi người tổ chức bất cứ điều gì: cần mang gì, tìm chỗ thế nào, người mới có tham gia được không. |
| `comments.empty.cta` | Ask a question | Đặt câu hỏi |
| `comments.pinned.host` | Pinned by the host | Được người tổ chức ghim |
| `comments.pinned.author` | Pinned by the author | Được tác giả ghim |
| `comments.action.pin` | Pin | Ghim |
| `comments.action.unpin` | Unpin | Bỏ ghim |
| `comments.action.reply` | Reply | Trả lời |
| `comments.action.edit` | Edit | Sửa |
| `comments.action.delete` | Delete | Xoá |
| `comments.action.save` | Save | Lưu |
| `comments.action.cancel` | Cancel | Huỷ |
| `comments.edited` | edited | đã sửa |
| `comments.replies.view` | View {count} replies | Xem {count} câu trả lời |
| `comments.replies.viewOne` | View 1 reply | Xem 1 câu trả lời |
| `comments.replies.hide` | Hide replies | Ẩn câu trả lời |
| `comments.showMore` | Show more comments | Xem thêm bình luận |
| `comments.showMoreReplies` | Show more replies | Xem thêm câu trả lời |
| `comments.delete.title` | Delete this comment? | Xoá bình luận này? |
| `comments.delete.body` | This cannot be undone. | Không thể hoàn tác. |
| `comments.delete.bodyWithReplies` | This cannot be undone. Replies will be removed too. | Không thể hoàn tác. Các câu trả lời cũng sẽ bị xoá. |
| `comments.status.posted` | Comment posted. | Đã đăng bình luận. |
| `comments.closed.cancelled` | Comments are closed because the event was cancelled. | Bình luận đã đóng vì sự kiện đã bị huỷ. |
| `comments.error.load.title` | We could not load comments | Không tải được bình luận |
| `comments.error.load.body` | Check your connection and try again. | Kiểm tra kết nối rồi thử lại. |
| `comments.error.post` | We could not post your comment. Check your connection and try again. | Chưa đăng được bình luận. Kiểm tra kết nối rồi thử lại. |
| `comments.error.tryAgain` | Try again | Thử lại |
| `comments.loading` | Loading comments | Đang tải bình luận |
| `reaction.like` | Like | Thích |
| `reaction.liked` | Liked | Đã thích |
| `reaction.count` | {count} likes | {count} lượt thích |
| `reaction.aria` | Like this {target} | Thích {target} này |
| `reaction.error` | Could not save your reaction. Try again. | Chưa lưu được cảm xúc của bạn. Hãy thử lại. |
| `post.author.former` | Former member | Thành viên cũ |
| `errors.rateLimit.exceeded` | You are doing that too often. Please wait a moment and try again. | Bạn thao tác quá nhanh. Hãy chờ một chút rồi thử lại. |

(`{target}` được truyền qua `t()` bằng các chuỗi `reaction.target.post/comment/event`: post | bài đăng, comment | bình luận, event | sự kiện.)

**S3 — Chat (`chat.*`, `messages.*`)**

| Key | EN | VI |
|---|---|---|
| `chat.card.title` | Group chat | Trò chuyện nhóm |
| `chat.card.open` | Open chat | Mở trò chuyện |
| `chat.card.opensAt` | Opens {time} | Mở lúc {time} |
| `chat.card.needRsvp` | RSVP to join the group chat. | Đăng ký tham gia để vào nhóm trò chuyện. |
| `chat.notYet.title` | This chat opens 48 hours before the event | Phòng chat mở trước sự kiện 48 giờ |
| `chat.notYet.body` | You will be able to coordinate with the other people going. | Bạn sẽ có thể trao đổi với những người cùng tham gia. |
| `chat.closed` | This chat is closed. | Phòng chat này đã đóng. |
| `chat.unavailable` | This chat is no longer available. | Phòng chat này không còn khả dụng. |
| `chat.composer.placeholder` | Write a message… | Viết tin nhắn… |
| `chat.composer.aria` | Message | Tin nhắn |
| `chat.composer.send` | Send | Gửi |
| `chat.rules` | Be kind. Hosts may remove people who break the rules. | Hãy tử tế. Người tổ chức có thể mời ra khỏi phòng những ai vi phạm. |
| `chat.message.sending` | Sending… | Đang gửi… |
| `chat.message.failed` | Not sent. Tap to retry. | Chưa gửi được. Chạm để thử lại. |
| `chat.message.removed` | Message removed | Tin nhắn đã bị xoá |
| `chat.message.delete` | Delete message | Xoá tin nhắn |
| `chat.status.reconnecting` | Reconnecting… | Đang kết nối lại… |
| `chat.status.offline` | You are offline. Messages will send when you are back. | Bạn đang ngoại tuyến. Tin nhắn sẽ được gửi khi có mạng. |
| `chat.typing` | {name} is typing… | {name} đang soạn tin… |
| `chat.newMessages` | New messages | Tin nhắn mới |
| `chat.beginning` | Beginning of the chat | Đầu cuộc trò chuyện |
| `chat.empty.title` | No messages yet | Chưa có tin nhắn nào |
| `chat.empty.body` | Say hi to the others going. | Hãy chào những người cùng tham gia. |
| `chat.leave` | Leave chat | Rời phòng chat |
| `chat.leave.confirm` | Leave this chat? You can join again while you are going. | Rời phòng chat này? Bạn có thể vào lại khi vẫn đang tham gia. |
| `chat.error.load` | We could not load this chat. | Không tải được phòng chat này. |
| `messages.title` | Messages | Tin nhắn |
| `messages.empty.title` | No chats yet | Chưa có cuộc trò chuyện nào |
| `messages.empty.body` | RSVP to an event to join its group chat. | Đăng ký một sự kiện để vào nhóm trò chuyện của sự kiện đó. |
| `messages.empty.cta` | Browse events | Xem sự kiện |
| `messages.unread` | {count} unread | {count} tin chưa đọc |
| `messages.participants` | {count} people | {count} người |
| `shell.nav.messages` | Messages | Tin nhắn |
| `errors.chat.notOpen` | This chat is not open yet. | Phòng chat này chưa mở. |
| `errors.chat.notAttending` | Only people going to this event can chat here. | Chỉ người tham gia sự kiện này mới nhắn được ở đây. |

**S4 — Follow (`follow.*`, mở rộng `shell.rail.*`, `profile.following.*`)**

| Key | EN | VI |
|---|---|---|
| `follow.action.follow` | Follow | Theo dõi |
| `follow.action.following` | Following | Đang theo dõi |
| `follow.action.unfollow` | Unfollow | Bỏ theo dõi |
| `follow.aria.follow` | Follow {name} | Theo dõi {name} |
| `follow.aria.following` | Following {name}. Activate to unfollow. | Đang theo dõi {name}. Kích hoạt để bỏ theo dõi. |
| `follow.error.generic` | Could not update. Check your connection and try again. | Chưa cập nhật được. Kiểm tra kết nối rồi thử lại. |
| `profile.following.title` | Following | Đang theo dõi |
| `profile.following.since` | Following since {date} | Theo dõi từ {date} |
| `profile.following.empty.title` | Follow hosts you like | Theo dõi người tổ chức bạn thích |
| `profile.following.empty.body` | Keep the people you want to hear from close by. | Giữ những người bạn muốn theo dõi ở gần bạn. |
| `profile.following.empty.cta` | Browse hosts | Xem người tổ chức |
| `profile.following.link` | Following ({count}) | Đang theo dõi ({count}) |
| `errors.follow.cannotFollowSelf` | You cannot follow yourself. | Bạn không thể tự theo dõi chính mình. |
| `errors.follow.limitReached` | You are following the maximum number of people. Unfollow someone to follow more. | Bạn đã theo dõi số người tối đa. Hãy bỏ theo dõi bớt để theo dõi thêm. |

Ghi chú: `profile.following.empty.body` cố ý **không** hứa thông báo (khác ES-26 gốc "You will get a ping…") vì notification chưa có (Q-5).

**Xoá/đổi:** không xoá key cũ. Cập nhật `post.card.comments` cho dạng số ít nếu Tech Lead muốn.

## 16. Rủi ro / trường hợp biên

- **R-1 (cao)** Bình luận và chat **không có Report/Block/ẩn của moderator** trước khi mở công khai (X-2). Cộng đồng nhỏ nhưng doc 05 liệt kê spam chat sự kiện, quấy rối, doxxing. Giảm: giới hạn tần suất, T1+, không link, **cổng trước M6**; nếu chủ dự án muốn, có thể bật UI bình luận/chat sau cờ môi trường để chỉ dev thấy.
- **R-2 (cao)** Lỗ hổng `join` phòng (S-11) cho T1 nào biết UUID vào được hội thoại riêng. Sửa **đầu S3**, trước khi nối UI. Nếu S3 chậm, cân nhắc vá riêng như sửa lỗi (nhỏ, 1–2 file, đi thẳng) và đưa vào test e2e.
- **R-3** Chặn T1 5 bình luận/ngày (doc 01) có thể làm người mới thấy bị bóp, trong khi T2 chưa ai đạt (X-4, T-10b). Q-2 mở. Chat T1 30 tin/giờ cũng chặt.
- **R-4** Không có idempotency phía server cho bình luận (S-6): dedupe phía client chỉ là giảm nhẹ, hai thiết bị cùng gửi vẫn có thể trùng.
- **R-5** Sửa bình luận không lưu lịch sử, không giới hạn thời gian: người dùng có thể đổi nghĩa bình luận sau khi bị trả lời. Cân nhắc cửa sổ sửa (ví dụ 15 phút) ở follow-up nếu có phản ánh.
- **R-6** Host **không xoá được** tin nhắn của người khác trong phòng chat và không ai (moderator) làm được qua UI; chỉ người gửi tự xoá. Mối nguy lớn nhất của S3 khi có người phá phòng.
- **R-7** Gợi ý follow: truy vấn xếp hạng trên `users`/`profiles` không có chỉ mục riêng; ổn ở quy mô beta, đo khi lớn.
- **R-8** Hai tài liệu mô tả điều kiện nhắn 1-1 khác nhau (doc 01 Đ29–Đ32 vs API chỉ T2); khi mở chat 1-1 cần đồng bộ.
- **R-9** Chat T1 lộ tên các attendee cho người mới (T1) trong khi danh sách attendee yêu cầu T2 (doc 01 UC-43). Là hệ quả của Q-2; nếu giữ doc 01, cả chat và attendee phải là T2.
- **R-10** Right rail hiện có nút "Follow" giả cho cả guest; trong lúc chờ S4, có thể ẩn khối để không đánh lừa người dùng (Coordinator chọn).
- **R-11** Socket.io qua Next `rewrites` ở dev không đáng tin cậy (WebSocket upgrade); S3b cần quyết định proxy trước khi hứa "dưới 1 giây".
- **R-12** Trigger đếm của reaction bỏ qua sự kiện: số like của sự kiện chỉ lấy được qua `summary` (một call thêm mỗi lần mở trang, và N call nếu sau này hiện số like trên mỗi thẻ ở feed).
- **R-13** Xoá root xoá luôn reply (D-S2-10) có thể gây phản đối từ người đã trả lời; chấp nhận ở v1, xem xét "tombstone" nếu cần.
- **R-14** `markRead` không kiểm tin thuộc cuộc trò chuyện (S-?): người dùng chỉ làm sai đồng hồ chưa đọc của chính mình, rủi ro thấp, sửa kèm S3.

## 17. Câu hỏi mở (không chặn; đã có mặc định)

- **Q-1 (chủ dự án)** Có chấp nhận ship bình luận và chat cho dev/beta nội bộ **không có Report/Block**, với cổng "bắt buộc trước M6"? Mặc định: có (X-2).
- **Q-2 (chủ dự án / Tech Lead)** Chat nhóm yêu cầu **T1 + RSVP `going`** (doc 05 §4.3, API hiện tại) hay **T2** (doc 01 UC-46)? Mặc định: T1 vì T2 chưa ai đạt được (T-10, T-10b). Câu hỏi đi kèm: hạn mức T1 30 tin/giờ (doc 05) có quá chặt không?
- **Q-3 (chủ dự án)** Guest đọc toàn bộ bình luận hay chỉ 3 bình luận đầu như doc 01 Đ1? Mặc định: toàn bộ (guest-first, API public).
- **Q-4 (chủ dự án)** Có cần danh sách/số "người theo dõi tôi" cho chính chủ (doc 01 UC-50 ghi "Người bị theo dõi tắt được")? Mặc định: không có, và không có công tắc tắt vì chưa có thông báo để tắt.
- **Q-5 (chủ dự án)** Câu empty state ES-26 hứa "ping" khi chưa có notification: đổi lời (mặc định) hay giữ?
- **Cho Tech Lead**: (a) tên bảng audit (`moderation_audit_log` vs `audit_log`) và việc X-1 có cùng đợt với S2 không; (b) phương án A hay B cho bảng follow (§9.2); (c) mã lỗi chính xác cho "đã huỷ, chỉ đọc" (403 hay 404) và "T0 vào phòng chat" (403 `TRUST_LEVEL_TOO_LOW` hay 404); (d) khoá idempotency server cho bình luận (cột + migration) hay dedupe phía client; (e) vị trí endpoint suggestions (module `follow` hay `profile`); (f) hàm kiểm RSVP dùng chung cho chat (tránh import chéo module); (g) tên và vị trí hàm tính cửa sổ chat (`packages/domain`); (h) quyết định proxy socket cho S3b; (i) `UserSummary` có thêm `avatarUrl` hay không (mặc định không).

## 18. Bàn giao

Bàn giao cho **Tech Lead** (chốt hợp đồng `UserSummary`/additive fields, quy tắc phân quyền chat, DDL follow, rate limit, cắt task) và **Coordinator** (lưu brief tại `.agent/specs/_changes/social-interactions/brief.md`, điều phối backend → web-client → Tester; **trình chủ dự án** migration 0010 và Q-1/Q-2). Không giao thẳng cho agent hiện thực.

**Gợi ý cắt story (đợt lớn, 3 pha, nhiều service; dùng `story-writer`):**
- S2: (S2-1) hợp đồng `UserSummary` + `author` + sửa "0" ở `CommunityPost` (nhỏ, giao được riêng); (S2-2) API: rate limit, trạng thái sự kiện, ghim, xoá cascade + e2e ma trận vai; (S2-3) web: thread + composer + phân trang trên `/events/[id]`; (S2-4) web: inline thread trên `CommunityPost` + reaction; (S2-5, sau X-1) nút Remove + audit.
- S3: (S3-0, **làm trước, có thể đi như sửa lỗi**) vá `join`/`create` + e2e lỗ hổng; (S3-1) API: cửa sổ, điều kiện, rời phòng, rate limit, `sender`/`user`/`event`; (S3-2) web: thẻ chat + thread REST + gửi idempotent; (S3-3) web: `/messages` + dấu chưa đọc; (S3-4, S3b) socket.
- S4: (S4-1) migration 0010 + module `follow` + e2e; (S4-2) suggestions + right rail; (S4-3) nút Follow trên hồ sơ (`viewerIsFollowing`) + `/following`.

Sau khi Tester xác minh, BA đối chiếu lại từng AC (S2-AC-1…25, S3-AC-1…22, S4-AC-1…18).