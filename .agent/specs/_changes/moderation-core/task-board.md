# Task board — Lõi kiểm duyệt M4: báo cáo, chặn, hàng đợi, hành động, audit log (Tech Lead, 25/09/2026)

Brief: [brief.md](brief.md) (48 AC). Coordinator: orchestrator (phiên chính) giữ bảng này.
Chế độ: **L8 multi-agent** (xuyên 3 app + 3 package, đổi schema, rủi ro auth/privacy).
Debate Gate: **không** — Q3–Q6 có một phương án rõ ràng rẻ nhất vừa đủ AC; lý do ghi ở từng quyết định.

---

## 1. Quyết định đã chốt

**D1 — Cách áp migration (phát hiện as-is).** Không có TypeORM, không có bảng theo dõi migration.
`apps/api/src/database/sql/*.sql` được mount vào `/docker-entrypoint-initdb.d`
(`docker-compose.local.yml`) → **chỉ tự chạy khi volume Postgres mới tinh**. DB dev đang có dữ
liệu phải **áp tay một lần**:

```bash
docker exec -i vncare-postgres-1 psql -U dnc -d dnc -v ON_ERROR_STOP=1 --single-transaction \
  < apps/api/src/database/sql/0009_moderation_core.sql
```

File theo đúng phong cách 0000–0008 (không `IF NOT EXISTS`); chạy lần hai sẽ lỗi ở `CREATE TYPE`
và `--single-transaction` rollback sạch → an toàn. Skill `database-migrations` mô tả TypeORM — lệch
code, đã có ACTIVE_TASKS T-04; task này **theo as-is**, không chuyển ORM. Chưa có pipeline
staging/prod → không có cổng deploy trong phạm vi này.

**D2 — Q3: tách bảng.** `moderation_actions` (bản ghi nghiệp vụ S5-DoD-7) và `audit_logs` (nhật ký
chung INV-2, sau này ghi cả hành động staff ngoài kiểm duyệt) là **hai bảng**, cùng được ghi trong
**một transaction** (`withTransaction`). Mỗi hành động thành công = đúng 1 dòng mỗi bảng;
`audit_logs.moderation_action_id` trỏ về dòng hành động. Có **bảng `moderation_tickets` riêng**
(không suy từ `reports`): cần nó cho (a) gộp nguyên tử bằng partial unique `WHERE status='open'` +
`INSERT … ON CONFLICT DO UPDATE`, (b) hạn SLA lưu sẵn để sort/lọc có index, (c) khoá hàng
`FOR UPDATE` cho AC-37. Bảng tối giản: không `priority_score`, không assign, không `in_review`.

**D3 — Bất biến ở DB.** Trigger `forbid_append_only_mutation()` BEFORE UPDATE/DELETE (row) +
BEFORE TRUNCATE (statement) trên `moderation_actions` và `audit_logs`, `RAISE … ERRCODE 42501`.
Không dựa vào REVOKE: app kết nối bằng role `dnc` là owner (local còn là superuser), owner tự cấp
lại được. FK trỏ **vào** hai bảng này đều `ON DELETE RESTRICT` (không có `SET NULL` nào tự sinh
UPDATE). Teardown e2e là ngoại lệ duy nhất, dùng `SET LOCAL session_replication_role = replica`
(chỉ superuser làm được — role app production **không** được là superuser; ghi vào rủi ro).

**D4 — Q4: hết hạn khoá = kiểm lười lúc đăng nhập, bằng hàm DB.** Không thêm job BullMQ.
Hàm `lift_expired_suspension(user_id)` trong 0009: khoá hàng user, nếu `status='suspended' AND
suspended_until <= now()` thì đưa về `active`, xoá `suspended_until/suspension_reason`, ghi 1 dòng
`moderation_actions` (actor `system`, `user_unsuspended`) + 1 dòng `audit_logs`, trả `true`.
`AuthService.assertUsable` gọi hàm này trước khi từ chối. Lý do: auth là module nền tảng, không
được import module moderation; hàm DB giữ tính nguyên tử mà không đảo chiều phụ thuộc.
**Không phá hành vi cũ:** `suspended` với `suspended_until IS NULL` vẫn bị từ chối như hiện nay.
Khoá tài khoản thu hồi mọi refresh session với `revoked_reason='account_suspended'`;
`AuthService.refresh` gặp lý do này thì trả **403 `ACCOUNT_NOT_ACTIVE`** khi còn khoá (AC-33),
**401 `INVALID_REFRESH`** khi đã mở (phải đăng nhập lại), và **không** kích hoạt reuse-detection.
**Cửa sổ access token 15 phút: hoãn** (brief §4 loại `AccountStatusGuard` per-request) — rủi ro
chấp nhận, ghi ở §8. User bị khoá không bao giờ đăng nhập lại sẽ nằm `suspended` quá hạn trong DB
(console hiển thị `suspendedUntil` đã qua) — chấp nhận, sweeper job là follow-up.

**D5 — Q5: một nguồn sự thật cho chặn = bảng `blocks`.** Mọi bề mặt (event/post/comment/reaction/
rsvp/profile/chat) kiểm `blocks` hai chiều bằng một fragment SQL chung
`apps/api/src/common/db/block-filter.ts`. `conversations.request_status='blocked'` **giữ nguyên
nghĩa cũ** (câu trả lời cho một lời mời, đóng hội thoại đó) — không đọc nó để quyết "có chặn không";
`respondToRequest(decision='blocked')` ghi **thêm** dòng `blocks(recipient → creator)` trong cùng
transaction để "chặn" ở chat và "chặn" toàn cục là một. Bỏ chặn không mở lại hội thoại đã `closed`.
Block nằm trong **module `profile`** (brief §14, doc 05 §13.8) → không đụng `app.module.ts`.
`blocks` xoá cứng, không `deleted_at` (brief §17), FK `ON DELETE CASCADE` về `users`.

**D6 — Q6: mã lỗi.** Bảng đầy đủ ở §4. Giữ đúng 5 mã BA đề xuất; thêm `MODERATION_*` cho quyền
theo vai trò đối tượng. Lỗi validate Zod mang messageKey qua `{ error: '<key>' }` (mẫu đã có ở
`auth.ts`, `event.ts`); e2e khẳng định key xuất hiện trong body 400 — không đổi pipe toàn cục.

**D7 — Lý do báo cáo.** Lưu **12 mã lý do UI** (`report_reason_enum`) cho cả report lẫn hành động
moderator. Bảng 30 enum doc 05 **không** dùng ở v1. Mức khởi tạo = bảng §5 brief
(`REPORT_REASON_SEVERITY` ở `packages/domain`). Enum mức khai báo **thấp → cao**
(`low, normal, high, critical`) để `GREATEST()` và `ORDER BY severity DESC` đúng không cần CASE.

**D8 — Gộp + SLA.** `sla_due_at` do DB tính: `now() + make_interval(hours => SLA_HOURS[sev])`.
Upsert ticket: `severity = GREATEST(cũ, mới)`, `sla_due_at = LEAST(cũ, mới)`, `report_count+1`
— đúng công thức §7 cho mọi ca (kể cả sau khi moderator hạ mức). Đổi mức bởi moderator:
`sla_due_at = first_reported_at + SLA(mức mới)`. Trạng thái ticket/report: `open → resolved |
dismissed`; đóng ticket đóng mọi report `open` của nó.

**D9 — Report: idempotency, dedupe, rate limit.** Header `Idempotency-Key` (8–128 ký tự) bắt buộc,
lưu ở cột `reports.idempotency_key` (unique theo reporter) — không dùng bảng `idempotency_keys`
(bảng đó không lưu được response). Luồng trong 1 transaction, mở đầu bằng
`pg_advisory_xact_lock(hashtextextended('report:' || reporter_id, 0))` để đếm hạn mức không bị
race: (1) replay theo key → trả report cũ; (2) reporter đã có report `open` trên cùng target → trả
report đó, không dòng mới, không tính hạn mức (AC-5); (3) resolve target (tồn tại + công khai với
người thường; **bỏ qua bộ lọc chặn** — kênh an toàn, AC-7) → 404; chủ = reporter → 422;
(4) đếm report 24 giờ ≥ `reportDailyLimit(trustLevel)` → 429 + `Retry-After` (giây, tới lúc report
cũ nhất trong cửa sổ hết 24 giờ); (5) upsert ticket, insert report + snapshot; `alsoBlock` →
`INSERT INTO blocks … ON CONFLICT DO NOTHING` (chặn **chủ đối tượng**). Luôn trả **201**.
Không cập nhật `posts/comments.report_count`/`moderation_state='flagged'` (không AC nào đọc).

**D10 — Xung đột lợi ích (INV-4).** Ticket COI với staff X khi X là reporter của bất kỳ report nào
trong ticket, hoặc `target_owner_user_id = X`, hoặc `related_event_organizer_id = X` (comment trên
sự kiện của X). COI: ẩn khỏi hàng đợi; `GET` chi tiết, mọi hành động/dismiss/severity gắn ticket →
403 `CONFLICT_OF_INTEREST`. Cưỡng chế ở service (không trigger — tối giản).

**D11 — Hành động.** Một endpoint `POST /admin/moderation/actions`, body discriminated union theo
`action`. Hành động cưỡng chế (`hide_content`, `suspend_event`, `take_down_event`, `suspend_user`)
**bắt buộc `ticketId`**; đảo ngược (`restore_content`, `restore_event`, `unsuspend_user`)
`ticketId` tuỳ chọn (khôi phục từ lịch sử). Target phải là target của ticket, riêng `suspend_user`
được phép là chủ của target. Ticket `open` → hành động đóng ticket (`resolved`). Ticket đã đóng →
409 `TICKET_ALREADY_CLOSED` **trừ khi `followUp: true`** (UI "thêm hành động" gửi cờ này) — thoả
đồng thời AC-37 và quy tắc "hành động sau vẫn gắn được vào ticket đã đóng". Ticket được khoá
`SELECT … FOR UPDATE` đầu transaction. Dismiss và đổi mức có endpoint riêng, chỉ trên ticket `open`.
Khoá tài khoản nhận `durationDays` (1–365), không nhận ngày tuyệt đối (tránh lệch múi giờ);
`restore_event` luôn → `published` (theo brief).

**D12 — Quyền theo vai trò đối tượng** (`packages/domain/src/moderation.ts`):
- Nội dung/sự kiện: chủ `member|curator` → moderator+; chủ `moderator` → admin+; chủ
  `admin|super_admin` → super_admin. Không ai hành động lên nội dung/tài khoản của chính mình.
- Khoá/mở khoá: moderator → chỉ target `member`, ≤ 30 ngày; admin → target
  `member|curator|moderator`, ≤ 365 ngày; super_admin → mọi người trừ mình, ≤ 365 ngày.
- Khôi phục `taken_down` → admin+; `suspended` → moderator+.

**D13 — Ghi chép.** Moderation repository ghi trực tiếp lên `posts/comments/events/users/
auth_sessions` trong transaction của hành động (bắt buộc để nguyên tử với audit) — ngoại lệ có chủ
đích với ranh giới module, ghi trong docblock repository. `request_id` = header `x-request-id` nếu
khớp `^[A-Za-z0-9-]{8,64}$`, không thì `randomUUID()`. `audit_logs` không lưu IP/UA (BA #13), không
partition ở v1 (hoãn — lưu lượng thấp). `audit_logs.subject_user_id` = chủ của đối tượng (phục vụ
lọc về sau + teardown e2e). Hành động bị từ chối không ghi audit (BA #14).

**D14 — Ẩn danh trong console.** `ModerationActionResponse.actor.user` = `null` khi người xem là
moderator và actor là người khác (UI hiện nhãn role "Kiểm duyệt viên"); admin/super_admin thấy đủ
(AC-41). Danh tính reporter chỉ có trong DTO chi tiết ticket (staff hàng đợi).

**D15 — Đồng hồ SLA.** Response hàng đợi/chi tiết có `serverTime`. Web admin tính
`nowServer = serverTime + (performance.now() − mốc nhận)` — đồng hồ đơn điệu, đổi giờ máy không ảnh
hưởng (AC-48). Lỗi tải lại → dừng đếm, hiện trạng thái lỗi (AC-28). Hàng đợi tự tải lại mỗi 60 giây.

**D16 — Hoãn (ghi rõ lý do, không làm trong task này):**
| Hạng mục | Lý do |
|---|---|
| Nút Report/Chặn trên **bình luận** ở web client (một phần AC-2) | Web client chưa có UI bình luận. API hỗ trợ đủ `comment`, e2e phủ. |
| Nhãn "Sự kiện này không còn khả dụng" ở **my-events** (một phần AC-30, BA #11) | `/my-events` đang là placeholder, chưa có API "RSVP của tôi". Key i18n `safety.label.eventUnavailable` đã tạo sẵn. |
| Nhãn **lý do** cho tác giả nội dung bị ẩn (§9) | Không có bề mặt web nào liệt kê bài bị ẩn của tác giả; thêm trường lý do vào `PostResponse` là đổi hợp đồng công khai không có người dùng. Nhãn "đã bị ẩn" làm ở `community-post.tsx` khi `status='hidden'`; kiểm qua API. |
| Cửa sổ access token 15 phút | Brief §4 ngoài phạm vi. |
| Sweeper job hết hạn khoá, partition `audit_logs`, IP/UA | Kiểm lười đủ AC-34; lưu lượng thấp. |
| Ghi audit khi organizer xoá bình luận trên trang của mình (ghi chú trong `comment.service.ts`) | Không phải hành động staff (§10). |

---

## 2. Migration — `apps/api/src/database/sql/0009_moderation_core.sql` (nguyên văn)

Một file là đủ (không có `ALTER TYPE … ADD VALUE`, không backfill). Không cần 0010.

```sql
-- Moderation core (M4): reports, tickets, blocks, moderation actions, audit log.
--
-- Brief and decisions: .agent/specs/_changes/moderation-core/{brief,task-board}.md.
--
-- Two tables are append-only and that is enforced here rather than trusted to
-- application code: moderation_actions and audit_logs reject UPDATE, DELETE and
-- TRUNCATE from every role through a trigger. REVOKE alone would not do — the
-- application connects as the table owner, and an owner can grant itself back
-- anything it was denied.
--
-- The vocabularies below are cross-checked against @dnc/contracts by
-- packages/contracts/test/moderation-vocabulary.spec.ts.

CREATE TYPE report_target_type_enum AS ENUM ('event', 'post', 'comment', 'user');

-- The twelve reasons a member picks from (doc 05 §16.1), stored as the UI code.
CREATE TYPE report_reason_enum AS ENUM (
  'danger', 'harassment', 'sexual', 'hate', 'scam', 'ghost_event',
  'impersonation', 'spam', 'privacy', 'illegal', 'unsafe_setup', 'other'
);

-- Declared lowest first on purpose: enum comparison follows declaration order,
-- so GREATEST(severity, ...) raises a ticket and ORDER BY severity DESC puts
-- critical first, both without a CASE.
CREATE TYPE moderation_severity_enum AS ENUM ('low', 'normal', 'high', 'critical');

-- Shared by tickets and the reports inside them: closing a ticket closes its
-- open reports with the same outcome.
CREATE TYPE report_status_enum AS ENUM ('open', 'resolved', 'dismissed');

CREATE TYPE moderation_actor_type_enum AS ENUM ('staff', 'system');

CREATE TYPE moderation_action_type_enum AS ENUM (
  'content_hidden', 'content_restored',
  'event_suspended', 'event_taken_down', 'event_restored',
  'user_suspended', 'user_unsuspended',
  'no_action', 'severity_changed'
);

CREATE TYPE audit_entity_type_enum AS ENUM (
  'post', 'comment', 'event', 'user', 'moderation_ticket'
);

CREATE TYPE audit_severity_enum AS ENUM ('info', 'notice', 'warning', 'critical');

-- ---------------------------------------------------------------------------
-- blocks — one row per (blocker, blocked); the effect is applied both ways
-- ---------------------------------------------------------------------------
-- Hard deleted on unblock and cascaded on account deletion: a block list is
-- personal data with no evidential value once either side is gone (doc 05
-- §13.11). No deleted_at, so no partial index is needed.

CREATE TABLE blocks (
  blocker_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_user_id, blocked_user_id),
  CONSTRAINT ck_blocks_not_self CHECK (blocker_user_id <> blocked_user_id)
);

-- The primary key answers "did A block B"; this answers "did anyone block A",
-- which is the other half of every two-way visibility check.
CREATE INDEX idx_blocks_blocked ON blocks (blocked_user_id, blocker_user_id);

-- The blocker's own list, newest first (GET /me/blocks).
CREATE INDEX idx_blocks_blocker_recent ON blocks (blocker_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- moderation_tickets — the unit a moderator works; at most one open per target
-- ---------------------------------------------------------------------------

CREATE TABLE moderation_tickets (
  id                         uuid PRIMARY KEY DEFAULT uuidv7(),
  target_type                report_target_type_enum NOT NULL,
  -- Polymorphic, so no FK: the target may be soft deleted by its author and
  -- the ticket must outlive it (the snapshot on each report is the evidence).
  target_id                  uuid NOT NULL,
  target_owner_user_id       uuid REFERENCES users (id) ON DELETE SET NULL,
  -- Organizer of the event a reported comment sits on. Drives the
  -- conflict-of-interest rule (INV-4); null for every other target.
  related_event_organizer_id uuid REFERENCES users (id) ON DELETE SET NULL,
  -- Max over the reports in the ticket; a new report never lowers it.
  severity                   moderation_severity_enum NOT NULL,
  status                     report_status_enum NOT NULL DEFAULT 'open',
  report_count               integer NOT NULL DEFAULT 1 CHECK (report_count >= 1),
  first_reported_at          timestamptz NOT NULL,
  last_reported_at           timestamptz NOT NULL,
  -- Absolute deadline, computed by the database clock (see task board D8).
  sla_due_at                 timestamptz NOT NULL,
  closed_at                  timestamptz,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_moderation_tickets_closed
    CHECK ((status = 'open') = (closed_at IS NULL)),
  CONSTRAINT ck_moderation_tickets_report_order
    CHECK (last_reported_at >= first_reported_at)
);

-- The merge rule: a second report on a target with an open ticket joins it.
-- Also the conflict target of the upsert, so two simultaneous first reports on
-- the same post converge on one ticket instead of racing.
CREATE UNIQUE INDEX uq_moderation_tickets_open_target
  ON moderation_tickets (target_type, target_id) WHERE status = 'open';

-- The queue: critical first, then longest waiting.
CREATE INDEX idx_moderation_tickets_queue
  ON moderation_tickets (severity DESC, first_reported_at ASC, id ASC)
  WHERE status = 'open';

-- The "handled" tab: most recently closed first.
CREATE INDEX idx_moderation_tickets_closed
  ON moderation_tickets (closed_at DESC, id DESC) WHERE status <> 'open';

CREATE INDEX idx_moderation_tickets_owner
  ON moderation_tickets (target_owner_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- reports — one row per voice; never soft deleted (safety evidence)
-- ---------------------------------------------------------------------------
-- content_snapshot shape, by target_type (camelCase, as the API returns it):
--   event:   { title, description, status, startsAt }
--   post:    { body, kind, mediaIds, status }
--   comment: { body, postId, eventId, status }
--   user:    { handle, displayName, headline, bio }
-- Taken at report time because the author can edit or delete afterwards.

CREATE TABLE reports (
  id                   uuid PRIMARY KEY DEFAULT uuidv7(),
  ticket_id            uuid NOT NULL REFERENCES moderation_tickets (id) ON DELETE CASCADE,
  -- SET NULL: a report survives its reporter deleting the account, anonymized.
  reporter_user_id     uuid REFERENCES users (id) ON DELETE SET NULL,
  target_type          report_target_type_enum NOT NULL,
  target_id            uuid NOT NULL,
  target_owner_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  reason               report_reason_enum NOT NULL,
  severity             moderation_severity_enum NOT NULL,
  description          text CHECK (description IS NULL OR length(description) BETWEEN 1 AND 2000),
  also_blocked         boolean NOT NULL DEFAULT false,
  content_snapshot     jsonb NOT NULL,
  status               report_status_enum NOT NULL DEFAULT 'open',
  idempotency_key      varchar(128) NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  closed_at            timestamptz,
  CONSTRAINT ck_reports_closed CHECK ((status = 'open') = (closed_at IS NULL))
);

-- A retried submit resolves to the report the first attempt created.
CREATE UNIQUE INDEX uq_reports_idempotency
  ON reports (reporter_user_id, idempotency_key) WHERE reporter_user_id IS NOT NULL;

-- One open report per reporter per target: reporting the same thing twice
-- returns the first report instead of inflating the ticket (AC-5).
CREATE UNIQUE INDEX uq_reports_open_per_reporter
  ON reports (reporter_user_id, target_type, target_id)
  WHERE status = 'open' AND reporter_user_id IS NOT NULL;

-- Ticket detail, and the conflict-of-interest check "is X a reporter here".
CREATE INDEX idx_reports_ticket ON reports (ticket_id, reporter_user_id);

-- Sliding 24-hour rate limit per reporter.
CREATE INDEX idx_reports_reporter_recent
  ON reports (reporter_user_id, created_at DESC) WHERE reporter_user_id IS NOT NULL;

CREATE INDEX idx_reports_target_owner ON reports (target_owner_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- moderation_actions — append-only; who did what to whom, and why (S5-DoD-7)
-- ---------------------------------------------------------------------------

CREATE TABLE moderation_actions (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  ticket_id       uuid REFERENCES moderation_tickets (id) ON DELETE RESTRICT,
  actor_type      moderation_actor_type_enum NOT NULL,
  -- RESTRICT throughout: the trail must never lose an actor or a subject.
  actor_user_id   uuid REFERENCES users (id) ON DELETE RESTRICT,
  -- Role at the time of the action; a later promotion must not rewrite history.
  actor_role      user_role_enum,
  action_type     moderation_action_type_enum NOT NULL,
  target_type     report_target_type_enum NOT NULL,
  target_id       uuid NOT NULL,
  -- The person the action lands on: author, organizer, or the account itself.
  target_user_id  uuid REFERENCES users (id) ON DELETE RESTRICT,
  reason_code     report_reason_enum,
  note            text NOT NULL CHECK (length(btrim(note)) BETWEEN 20 AND 2000),
  severity_before moderation_severity_enum,
  severity_after  moderation_severity_enum,
  suspended_until timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_moderation_actions_actor CHECK (
    (actor_type = 'staff'  AND actor_user_id IS NOT NULL AND actor_role IS NOT NULL
                           AND reason_code IS NOT NULL)
    OR
    (actor_type = 'system' AND actor_user_id IS NULL AND actor_role IS NULL)
  ),
  -- A suspension without an end is a ban, and bans are out of scope (BA #9).
  CONSTRAINT ck_moderation_actions_suspension_has_end
    CHECK (action_type <> 'user_suspended' OR suspended_until IS NOT NULL),
  CONSTRAINT ck_moderation_actions_severity_pair CHECK (
    action_type <> 'severity_changed'
    OR (severity_before IS NOT NULL AND severity_after IS NOT NULL)
  ),
  CONSTRAINT ck_moderation_actions_ticket_bound CHECK (
    action_type NOT IN ('no_action', 'severity_changed') OR ticket_id IS NOT NULL
  )
);

CREATE INDEX idx_moderation_actions_ticket
  ON moderation_actions (ticket_id, created_at) WHERE ticket_id IS NOT NULL;
CREATE INDEX idx_moderation_actions_target
  ON moderation_actions (target_type, target_id, created_at DESC);
CREATE INDEX idx_moderation_actions_target_user
  ON moderation_actions (target_user_id, created_at DESC);
CREATE INDEX idx_moderation_actions_actor
  ON moderation_actions (actor_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- audit_logs — append-only journal of staff actions on other people's data (INV-2)
-- ---------------------------------------------------------------------------
-- actor_user_id and subject_user_id carry no FK on purpose (doc 03 §10.4): the
-- journal must stay writable and readable whatever happens to the accounts.
-- before/after hold only the fields that changed, camelCase, never email,
-- phone or content bodies. No IP or user agent in v1 (BA #13).

CREATE TABLE audit_logs (
  id                   uuid PRIMARY KEY DEFAULT uuidv7(),
  actor_type           moderation_actor_type_enum NOT NULL,
  actor_user_id        uuid,
  actor_role           user_role_enum,
  action               varchar(64) NOT NULL CHECK (action ~ '^[a-z_]+\.[a-z_0-9]+$'),
  entity_type          audit_entity_type_enum NOT NULL,
  entity_id            uuid NOT NULL,
  subject_user_id      uuid,
  before               jsonb NOT NULL DEFAULT '{}'::jsonb,
  after                jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason_code          varchar(32),
  note                 text,
  severity             audit_severity_enum NOT NULL DEFAULT 'info',
  request_id           varchar(64),
  moderation_action_id uuid REFERENCES moderation_actions (id) ON DELETE RESTRICT,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_audit_logs_actor CHECK (
    (actor_type = 'staff'  AND actor_user_id IS NOT NULL AND actor_role IS NOT NULL)
    OR
    (actor_type = 'system' AND actor_user_id IS NULL AND actor_role IS NULL)
  )
);

-- UUIDv7 sorts by time, so `id DESC` is "newest first" and doubles as the cursor.
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_user_id, id DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs (action, id DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id, id DESC);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_subject ON audit_logs (subject_user_id, id DESC);

-- ---------------------------------------------------------------------------
-- Append-only enforcement
-- ---------------------------------------------------------------------------
-- 42501 (insufficient_privilege): the API maps nothing onto it, so an attempt
-- surfaces as a 500 with a stack trace — the correct response to code that
-- tries to rewrite history.

CREATE OR REPLACE FUNCTION forbid_append_only_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'DNC_APPEND_ONLY table=% op=%', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

CREATE TRIGGER trg_moderation_actions_append_only
  BEFORE UPDATE OR DELETE ON moderation_actions
  FOR EACH ROW EXECUTE FUNCTION forbid_append_only_mutation();
CREATE TRIGGER trg_moderation_actions_no_truncate
  BEFORE TRUNCATE ON moderation_actions
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_append_only_mutation();

CREATE TRIGGER trg_audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION forbid_append_only_mutation();
CREATE TRIGGER trg_audit_logs_no_truncate
  BEFORE TRUNCATE ON audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_append_only_mutation();

-- ---------------------------------------------------------------------------
-- Suspension expiry, applied lazily at sign-in (task board D4)
-- ---------------------------------------------------------------------------
-- Lives in the database so the auth module can lift an expired suspension
-- atomically with its action and audit rows without depending on the
-- moderation module. The row lock makes two simultaneous sign-ins produce one
-- lift, not two. Returns true only when this call lifted it.

CREATE OR REPLACE FUNCTION lift_expired_suspension(p_user_id uuid) RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE
  v_until     timestamptz;
  v_action_id uuid;
  v_note      constant text := 'Suspension period ended; lifted automatically.';
BEGIN
  SELECT suspended_until INTO v_until
    FROM users
   WHERE id = p_user_id
     AND status = 'suspended'
     AND suspended_until IS NOT NULL
     AND suspended_until <= now()
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE users
     SET status = 'active', suspended_until = NULL, suspension_reason = NULL,
         updated_at = now()
   WHERE id = p_user_id;

  INSERT INTO moderation_actions
    (actor_type, action_type, target_type, target_id, target_user_id, note)
  VALUES ('system', 'user_unsuspended', 'user', p_user_id, p_user_id, v_note)
  RETURNING id INTO v_action_id;

  INSERT INTO audit_logs
    (actor_type, action, entity_type, entity_id, subject_user_id,
     before, after, note, severity, moderation_action_id)
  VALUES ('system', 'moderation.user_unsuspended', 'user', p_user_id, p_user_id,
          jsonb_build_object('status', 'suspended', 'suspendedUntil', v_until),
          jsonb_build_object('status', 'active', 'suspendedUntil', NULL),
          v_note, 'notice', v_action_id);

  RETURN true;
END $$;
```

**Kế hoạch quay lui** (chỉ local; bảng mới chưa có dữ liệu thật — không đụng bảng cũ nào):

```sql
BEGIN;
DROP FUNCTION IF EXISTS lift_expired_suspension(uuid);
DROP TABLE IF EXISTS audit_logs, moderation_actions, reports, moderation_tickets, blocks;
DROP FUNCTION IF EXISTS forbid_append_only_mutation();
DROP TYPE IF EXISTS audit_severity_enum, audit_entity_type_enum, moderation_action_type_enum,
  moderation_actor_type_enum, report_status_enum, moderation_severity_enum,
  report_reason_enum, report_target_type_enum;
COMMIT;
```

Chi phí migration: chỉ `CREATE`, không `ALTER` bảng có dữ liệu → không khoá bảng cũ.
Code cũ chạy được trên schema mới (tương thích ngược một bước).

---

## 3. Hợp đồng

### 3.1 `packages/contracts/src/safety.ts` (member-facing: report + block)

```ts
import { z } from 'zod';
import { CursorQuery } from './content';

/** What a member can report in v1. Chat messages, reviews and media are out of scope. */
export const ReportTargetType = z.enum(['event', 'post', 'comment', 'user']);
export type ReportTargetTypeT = z.infer<typeof ReportTargetType>;

/**
 * The twelve reasons a member picks from (doc 05 §16.1), in display order.
 * Also the reason code a moderator must give on every action. Labels live in
 * i18n at `safety.report.reason.<code>`.
 */
export const ReportReason = z.enum([
  'danger',
  'harassment',
  'sexual',
  'hate',
  'scam',
  'ghost_event',
  'impersonation',
  'spam',
  'privacy',
  'illegal',
  'unsafe_setup',
  'other',
]);
export type ReportReasonT = z.infer<typeof ReportReason>;

/**
 * Filing a report. The `Idempotency-Key` header is mandatory (BR-23): a double
 * tap or a network retry resolves to the report the first attempt created.
 * `alsoBlock` blocks the owner of the target in the same transaction.
 */
export const ReportCreateRequest = z.object({
  targetType: ReportTargetType,
  targetId: z.uuid(),
  reason: ReportReason,
  description: z
    .string()
    .trim()
    .max(2000, { error: 'errors.report.descriptionTooLong' })
    .optional(),
  alsoBlock: z.boolean().default(false),
});
export type ReportCreateRequestT = z.infer<typeof ReportCreateRequest>;

/**
 * What the reporter gets back — deliberately nothing about severity, the
 * ticket, or how many others reported the same thing.
 */
export const ReportResponse = z.object({
  id: z.uuid(),
  status: z.literal('received'),
  createdAt: z.iso.datetime(),
});
export type ReportResponseT = z.infer<typeof ReportResponse>;

/** One entry of the caller's own block list. Visible to nobody else. */
export const BlockedUserResponse = z.object({
  userId: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.url().nullable(),
  blockedAt: z.iso.datetime(),
});
export type BlockedUserResponseT = z.infer<typeof BlockedUserResponse>;

export const ListBlockQuery = CursorQuery;
export type ListBlockQueryT = z.infer<typeof ListBlockQuery>;
```

### 3.2 `packages/contracts/src/moderation.ts` (staff console)

```ts
import { z } from 'zod';
import { UserRole, UserStatus } from './auth';
import { ContentStatus, CursorQuery } from './content';
import { EventStatus } from './event';
import { PostKind } from './post';
import { ReportReason, ReportTargetType } from './safety';

/** Stored values; P0–P3 are display labels only (critical = P0 … low = P3). */
export const ModerationSeverity = z.enum(['low', 'normal', 'high', 'critical']);
export type ModerationSeverityT = z.infer<typeof ModerationSeverity>;

export const TicketStatus = z.enum(['open', 'resolved', 'dismissed']);
export type TicketStatusT = z.infer<typeof TicketStatus>;

export const ModerationActionType = z.enum([
  'content_hidden',
  'content_restored',
  'event_suspended',
  'event_taken_down',
  'event_restored',
  'user_suspended',
  'user_unsuspended',
  'no_action',
  'severity_changed',
]);
export type ModerationActionTypeT = z.infer<typeof ModerationActionType>;

export const ModerationActorType = z.enum(['staff', 'system']);
export type ModerationActorTypeT = z.infer<typeof ModerationActorType>;

/** Minimal identity of a person as staff see it. Never carries email or phone. */
export const UserRef = z.object({
  userId: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
});
export type UserRefT = z.infer<typeof UserRef>;

/** Mandatory on every moderator decision (doc 05 §13.5, Đ35). */
export const ModerationNote = z
  .string({ error: 'errors.moderation.noteTooShort' })
  .trim()
  .min(20, { error: 'errors.moderation.noteTooShort' })
  .max(2000, { error: 'errors.moderation.noteTooLong' });

export const ModerationReasonCode = z.enum(ReportReason.options, {
  error: 'errors.moderation.reasonRequired',
});

/** Content of the target as it was when this report was filed. */
export const ReportSnapshot = z.discriminatedUnion('targetType', [
  z.object({
    targetType: z.literal('event'),
    title: z.string(),
    description: z.string().nullable(),
    status: EventStatus,
    startsAt: z.iso.datetime().nullable(),
  }),
  z.object({
    targetType: z.literal('post'),
    body: z.string(),
    kind: PostKind,
    mediaIds: z.array(z.uuid()),
    status: ContentStatus,
  }),
  z.object({
    targetType: z.literal('comment'),
    body: z.string(),
    postId: z.uuid().nullable(),
    eventId: z.uuid().nullable(),
    status: ContentStatus,
  }),
  z.object({
    targetType: z.literal('user'),
    handle: z.string(),
    displayName: z.string(),
    headline: z.string().nullable(),
    bio: z.string().nullable(),
  }),
]);
export type ReportSnapshotT = z.infer<typeof ReportSnapshot>;

/* ---------------------------------------------------------------- queue */

export const ModerationQueueQuery = CursorQuery.extend({
  /** `closed` = resolved + dismissed ("Đã xử lý" tab). */
  status: z.enum(['open', 'closed']).default('open'),
  severity: ModerationSeverity.optional(),
});
export type ModerationQueueQueryT = z.infer<typeof ModerationQueueQuery>;

export const ModerationTicketSummaryResponse = z.object({
  id: z.uuid(),
  targetType: ReportTargetType,
  targetId: z.uuid(),
  /** Up to 140 chars from the first snapshot: event title, post/comment body, or "Name (@handle)". */
  targetPreview: z.string(),
  severity: ModerationSeverity,
  status: TicketStatus,
  reportCount: z.number().int().positive(),
  /** Distinct reasons across the ticket's reports, in ReportReason order. */
  reasons: z.array(ReportReason),
  firstReportedAt: z.iso.datetime(),
  lastReportedAt: z.iso.datetime(),
  /** Absolute deadline from the server. Clients count down from this, never from their own clock. */
  slaDueAt: z.iso.datetime(),
  closedAt: z.iso.datetime().nullable(),
  /** Action type that closed the ticket; null while open. */
  outcome: ModerationActionType.nullable(),
});
export type ModerationTicketSummaryResponseT = z.infer<typeof ModerationTicketSummaryResponse>;

export const ModerationQueueResponse = z.object({
  items: z.array(ModerationTicketSummaryResponse),
  nextCursor: z.string().nullable(),
  /** Server clock at response time, for a drift-free countdown (AC-48). */
  serverTime: z.iso.datetime(),
});
export type ModerationQueueResponseT = z.infer<typeof ModerationQueueResponse>;

/* --------------------------------------------------------------- detail */

export const ModerationReportItem = z.object({
  id: z.uuid(),
  reason: ReportReason,
  description: z.string().nullable(),
  createdAt: z.iso.datetime(),
  /** Null when the reporter has since deleted their account. */
  reporter: UserRef.nullable(),
  snapshot: ReportSnapshot,
});
export type ModerationReportItemT = z.infer<typeof ModerationReportItem>;

export const ModerationActionResponse = z.object({
  id: z.uuid(),
  ticketId: z.uuid().nullable(),
  actionType: ModerationActionType,
  targetType: ReportTargetType,
  targetId: z.uuid(),
  targetUserId: z.uuid().nullable(),
  reasonCode: ReportReason.nullable(),
  note: z.string(),
  severityBefore: ModerationSeverity.nullable(),
  severityAfter: ModerationSeverity.nullable(),
  suspendedUntil: z.iso.datetime().nullable(),
  actor: z.object({
    type: ModerationActorType,
    /** Role at the time of the action; null for the system. */
    role: UserRole.nullable(),
    /**
     * Null for the system, and for another staff member's action when the
     * viewer is a moderator (Đ31, AC-41). Admin and super_admin see everyone.
     */
    user: UserRef.nullable(),
  }),
  createdAt: z.iso.datetime(),
});
export type ModerationActionResponseT = z.infer<typeof ModerationActionResponse>;

export const ModerationTicketDetailResponse = ModerationTicketSummaryResponse.extend({
  targetOwner: z
    .object({
      userId: z.uuid(),
      handle: z.string(),
      displayName: z.string(),
      role: UserRole,
      status: UserStatus,
      suspendedUntil: z.iso.datetime().nullable(),
    })
    .nullable(),
  /** Live state of the target now, next to the snapshot of what was reported. */
  currentTarget: z.object({
    deleted: z.boolean(),
    status: z.union([EventStatus, ContentStatus, UserStatus]).nullable(),
  }),
  reports: z.array(ModerationReportItem),
  /** Actions on this ticket, on its target, or on the target's owner — oldest first. */
  actions: z.array(ModerationActionResponse),
  serverTime: z.iso.datetime(),
});
export type ModerationTicketDetailResponseT = z.infer<typeof ModerationTicketDetailResponse>;

/* -------------------------------------------------------------- actions */

export const ModerationActionKind = z.enum([
  'hide_content',
  'restore_content',
  'suspend_event',
  'take_down_event',
  'restore_event',
  'suspend_user',
  'unsuspend_user',
]);
export type ModerationActionKindT = z.infer<typeof ModerationActionKind>;

const ActionBase = z.object({
  reasonCode: ModerationReasonCode,
  note: ModerationNote,
  /**
   * Required to act on a ticket that is already closed (e.g. taking down an
   * event and then suspending its organizer). Without it a closed ticket
   * answers 409 TICKET_ALREADY_CLOSED — the "someone beat you to it" case.
   */
  followUp: z.boolean().default(false),
});

/** Enforcement always comes from a ticket; reversal may come from the action history. */
const Enforcement = ActionBase.extend({ ticketId: z.uuid() });
const Reversal = ActionBase.extend({ ticketId: z.uuid().optional() });

export const ModerationActionRequest = z.discriminatedUnion('action', [
  Enforcement.extend({
    action: z.literal('hide_content'),
    targetType: z.enum(['post', 'comment']),
    targetId: z.uuid(),
  }),
  Reversal.extend({
    action: z.literal('restore_content'),
    targetType: z.enum(['post', 'comment']),
    targetId: z.uuid(),
  }),
  Enforcement.extend({
    action: z.literal('suspend_event'),
    targetType: z.literal('event'),
    targetId: z.uuid(),
  }),
  Enforcement.extend({
    action: z.literal('take_down_event'),
    targetType: z.literal('event'),
    targetId: z.uuid(),
  }),
  Reversal.extend({
    action: z.literal('restore_event'),
    targetType: z.literal('event'),
    targetId: z.uuid(),
  }),
  Enforcement.extend({
    action: z.literal('suspend_user'),
    targetType: z.literal('user'),
    targetId: z.uuid(),
    /** Whole days from now. Role caps apply server-side (moderator 30, admin 365). */
    durationDays: z.number().int().min(1).max(365),
  }),
  Reversal.extend({
    action: z.literal('unsuspend_user'),
    targetType: z.literal('user'),
    targetId: z.uuid(),
  }),
]);
export type ModerationActionRequestT = z.infer<typeof ModerationActionRequest>;

/** Closing a ticket as "no violation" — recorded as a `no_action` row (doc 05 §8.1). */
export const TicketDismissRequest = z.object({
  reasonCode: ModerationReasonCode,
  note: ModerationNote,
});
export type TicketDismissRequestT = z.infer<typeof TicketDismissRequest>;

export const TicketSeverityRequest = z.object({
  severity: ModerationSeverity,
  reasonCode: ModerationReasonCode,
  note: ModerationNote,
});
export type TicketSeverityRequestT = z.infer<typeof TicketSeverityRequest>;
```

### 3.3 `packages/contracts/src/audit.ts`

```ts
import { z } from 'zod';
import { UserRole } from './auth';
import { CursorQuery } from './content';
import { ModerationActorType, UserRef } from './moderation';

/** `group.action`. Grows as non-moderation staff actions start writing here. */
export const AuditAction = z.enum([
  'moderation.content_hidden',
  'moderation.content_restored',
  'moderation.event_suspended',
  'moderation.event_taken_down',
  'moderation.event_restored',
  'moderation.user_suspended',
  'moderation.user_unsuspended',
  'moderation.report_dismissed',
  'moderation.severity_changed',
]);
export type AuditActionT = z.infer<typeof AuditAction>;

export const AuditEntityType = z.enum(['post', 'comment', 'event', 'user', 'moderation_ticket']);
export type AuditEntityTypeT = z.infer<typeof AuditEntityType>;

export const AuditSeverity = z.enum(['info', 'notice', 'warning', 'critical']);
export type AuditSeverityT = z.infer<typeof AuditSeverity>;

/**
 * Filters. The caller's role narrows the result further server-side:
 * moderator → own entries only; admin → all but super_admin actors; super_admin → all.
 */
export const AuditLogQuery = CursorQuery.extend({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  action: AuditAction.optional(),
  actorUserId: z.uuid().optional(),
  entityType: AuditEntityType.optional(),
});
export type AuditLogQueryT = z.infer<typeof AuditLogQuery>;

export const AuditLogResponse = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  actorType: ModerationActorType,
  /** Null for the system. */
  actor: UserRef.nullable(),
  actorRole: UserRole.nullable(),
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: z.uuid(),
  /** Changed fields only; never email, phone or content bodies. */
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
  reasonCode: z.string().nullable(),
  note: z.string().nullable(),
  severity: AuditSeverity,
  requestId: z.string().nullable(),
});
export type AuditLogResponseT = z.infer<typeof AuditLogResponse>;
```

### 3.4 Dòng export thêm vào `packages/contracts/src/index.ts`

```ts
export {
  BlockedUserResponse,
  ListBlockQuery,
  ReportCreateRequest,
  ReportReason,
  ReportResponse,
  ReportTargetType,
  type BlockedUserResponseT,
  type ListBlockQueryT,
  type ReportCreateRequestT,
  type ReportReasonT,
  type ReportResponseT,
  type ReportTargetTypeT,
} from './safety';
export {
  ModerationActionKind,
  ModerationActionRequest,
  ModerationActionResponse,
  ModerationActionType,
  ModerationActorType,
  ModerationNote,
  ModerationQueueQuery,
  ModerationQueueResponse,
  ModerationReasonCode,
  ModerationReportItem,
  ModerationSeverity,
  ModerationTicketDetailResponse,
  ModerationTicketSummaryResponse,
  ReportSnapshot,
  TicketDismissRequest,
  TicketSeverityRequest,
  TicketStatus,
  UserRef,
  type ModerationActionKindT,
  type ModerationActionRequestT,
  type ModerationActionResponseT,
  type ModerationActionTypeT,
  type ModerationActorTypeT,
  type ModerationQueueQueryT,
  type ModerationQueueResponseT,
  type ModerationReportItemT,
  type ModerationSeverityT,
  type ModerationTicketDetailResponseT,
  type ModerationTicketSummaryResponseT,
  type ReportSnapshotT,
  type TicketDismissRequestT,
  type TicketSeverityRequestT,
  type TicketStatusT,
  type UserRefT,
} from './moderation';
export {
  AuditAction,
  AuditEntityType,
  AuditLogQuery,
  AuditLogResponse,
  AuditSeverity,
  type AuditActionT,
  type AuditEntityTypeT,
  type AuditLogQueryT,
  type AuditLogResponseT,
  type AuditSeverityT,
} from './audit';
```

Test mới `packages/contracts/test/moderation-vocabulary.spec.ts` (mẫu `rsvp-vocabulary.spec.ts`): đọc
`0009_moderation_core.sql`, khẳng định giá trị của `report_target_type_enum`, `report_reason_enum`,
`moderation_severity_enum`, `report_status_enum`, `moderation_action_type_enum`,
`audit_entity_type_enum`, `audit_severity_enum` **trùng thứ tự** với Zod tương ứng.

### 3.5 `packages/domain/src/permission-matrix.ts` — bổ sung

```ts
/** Every global role; for actions any signed-in account may take. */
export const ALL_ROLES: readonly UserRoleT[] = ['member', 'curator', 'moderator', 'admin', 'super_admin'];

/** Staff who work the report queue and take moderation actions (Đ33–Đ41). Curator is excluded in v1 (Đ40). */
export const MODERATION_ROLES: readonly UserRoleT[] = ['moderator', 'admin', 'super_admin'];

/** Roles above moderator: restore a taken-down event, see other moderators' identity. */
export const ADMIN_ROLES: readonly UserRoleT[] = ['admin', 'super_admin'];

export type PermissionKey =
  | 'admin_console.access'
  | 'system.health.view'
  | 'report.create'
  | 'block.manage'
  | 'moderation.queue.view'
  | 'moderation.action.take'
  | 'moderation.event.restore_taken_down'
  | 'audit_log.view';

// PERMISSION_MATRIX — thêm 6 entry:
//   report.create                         ALL_ROLES          docRef 'docs/analysis/05-trust-safety-va-kiem-duyet.md §6.1; brief moderation-core §2'
//   block.manage                          ALL_ROLES          docRef 'docs/analysis/05-trust-safety-va-kiem-duyet.md §13.10'
//   moderation.queue.view                 MODERATION_ROLES   docRef 'docs/analysis/01-tac-nhan-va-phan-quyen.md §9.2 (Đ33–Đ41)'
//   moderation.action.take                MODERATION_ROLES   docRef 'docs/analysis/01-tac-nhan-va-phan-quyen.md §9.2 (Đ35–Đ39)'
//   moderation.event.restore_taken_down   ADMIN_ROLES        docRef 'brief moderation-core §9'
//   audit_log.view                        MODERATION_ROLES   docRef 'docs/analysis/01-tac-nhan-va-phan-quyen.md §9.3 (Đ48–Đ51)' — phạm vi theo auditLogScope()
```

`index.ts` export thêm `ALL_ROLES`, `MODERATION_ROLES`, `ADMIN_ROLES`. Cập nhật
`packages/domain/test/permission-matrix.spec.ts`: curator/member không có trong
`moderation.queue.view`/`audit_log.view`; `restore_taken_down` chỉ admin+.

### 3.6 `packages/domain/src/moderation.ts` (mới, framework-free, có test)

```ts
import type {
  AuditActionT, AuditSeverityT, EventStatusT, ModerationActionTypeT,
  ModerationSeverityT, ReportReasonT, UserRoleT,
} from '@dnc/contracts';

/** Initial severity per UI reason = highest severity of the doc 05 enums it groups (brief §5, BA #1). */
export const REPORT_REASON_SEVERITY: Readonly<Record<ReportReasonT, ModerationSeverityT>> = {
  danger: 'critical', harassment: 'critical', sexual: 'critical', hate: 'high',
  scam: 'critical', ghost_event: 'high', impersonation: 'high', spam: 'normal',
  privacy: 'critical', illegal: 'critical', unsafe_setup: 'high', other: 'low',
};

/** Wall-clock hours, 24/7, all four levels (S5-DoD-6, BA #2). */
export const SLA_HOURS: Readonly<Record<ModerationSeverityT, number>> = {
  critical: 2, high: 12, normal: 48, low: 72,
};
/** "Due soon" once remaining time is at or below this share of the SLA (BA #7). */
export const SLA_DUE_SOON_FRACTION = 0.25;
export type SlaState = 'normal' | 'due_soon' | 'overdue';
export function slaDueAt(severity: ModerationSeverityT, from: Date): Date;
/** remaining <= 0 → overdue; remaining <= 25% of SLA_HOURS[severity] → due_soon; else normal. */
export function slaState(severity: ModerationSeverityT, dueAt: Date, now: Date): SlaState;

export const SEVERITY_RANK: Readonly<Record<ModerationSeverityT, number>> = { low: 0, normal: 1, high: 2, critical: 3 };
export function maxSeverity(a: ModerationSeverityT, b: ModerationSeverityT): ModerationSeverityT;
/** P0..P3 display label index: critical → 0 … low → 3. */
export function severityPriority(severity: ModerationSeverityT): 0 | 1 | 2 | 3;

/** "Also block this person" starts ticked for these reasons (AC-4). */
export const ALSO_BLOCK_DEFAULT_REASONS: readonly ReportReasonT[] = ['harassment'];

export const REPORT_RATE_WINDOW_HOURS = 24;
/** T0–T1: 5 · T2: 10 · T3–T5: 20 per sliding 24 h (doc 05 §6.1, BA #8). */
export function reportDailyLimit(trustLevel: number): number;

export const MODERATION_NOTE_MIN_LENGTH = 20;
export const MODERATION_NOTE_MAX_LENGTH = 2000;
export const REPORT_DESCRIPTION_MAX_LENGTH = 2000;

export const ROLE_RANK: Readonly<Record<UserRoleT, number>> = {
  member: 0, curator: 1, moderator: 2, admin: 3, super_admin: 4,
};
/** Content/event of `ownerRole`: member|curator → moderator+; moderator → admin+; admin|super_admin → super_admin. */
export function canModerateOwner(actorRole: UserRoleT, ownerRole: UserRoleT): boolean;
/** moderator → member only; admin → member|curator|moderator; super_admin → any. Self is checked by the caller. */
export function canSuspendRole(actorRole: UserRoleT, targetRole: UserRoleT): boolean;
/** moderator 30, admin 365, super_admin 365, others 0. */
export function maxSuspensionDays(actorRole: UserRoleT): number;
/** suspended → moderator+; taken_down → admin+; anything else → false. */
export function canRestoreEvent(actorRole: UserRoleT, status: EventStatusT): boolean;
/** Admin and super_admin see other staff members' identity on actions (Đ31, AC-41). */
export function canSeeOtherModerators(role: UserRoleT): boolean;

export const AUDIT_ACTION_BY_TYPE: Readonly<Record<ModerationActionTypeT, AuditActionT>> = {
  content_hidden: 'moderation.content_hidden',
  content_restored: 'moderation.content_restored',
  event_suspended: 'moderation.event_suspended',
  event_taken_down: 'moderation.event_taken_down',
  event_restored: 'moderation.event_restored',
  user_suspended: 'moderation.user_suspended',
  user_unsuspended: 'moderation.user_unsuspended',
  no_action: 'moderation.report_dismissed',
  severity_changed: 'moderation.severity_changed',
};
/** Suspensions and event removals are ≥ warning (brief §10). */
export const AUDIT_SEVERITY_BY_TYPE: Readonly<Record<ModerationActionTypeT, AuditSeverityT>> = {
  content_hidden: 'notice', content_restored: 'notice',
  event_suspended: 'warning', event_taken_down: 'warning', event_restored: 'notice',
  user_suspended: 'warning', user_unsuspended: 'notice',
  no_action: 'info', severity_changed: 'info',
};

export type AuditLogScope = 'own' | 'all_except_super_admin' | 'all';
/** moderator → own; admin → all_except_super_admin; super_admin → all; others → null (Đ48–Đ51). */
export function auditLogScope(role: UserRoleT): AuditLogScope | null;
```

Test `packages/domain/test/moderation.spec.ts`: bảng lý do→mức đủ 12; `slaDueAt` +2/+12/+48/+72 h;
ranh giới `slaState` P0 còn 30 phút → `due_soon`, 31 phút → `normal`, 0 → `overdue`, và 25% cho
P1 (3 h)/P2 (12 h)/P3 (18 h) (AC-23); `reportDailyLimit` 0,1→5 · 2→10 · 3,4,5→20; ma trận
`canModerateOwner`/`canSuspendRole`/`maxSuspensionDays`/`canRestoreEvent` theo AC-32, AC-35.

---

## 4. Endpoint

Mọi route dưới `/api/v1`. Envelope `{ success, data }`. Lỗi `{ code, messageKey, details? }`.
Role check bằng `@Roles(...allowedRolesFor(key))` (RolesGuard → 403 `ROLE_NOT_ALLOWED`).

| # | Method + path | Request | Response | Role | Lỗi |
|---|---|---|---|---|---|
| E1 | `POST /reports` | header `Idempotency-Key`; body `ReportCreateRequest` | 201 `envelope(ReportResponse)` (cả replay/dedupe) | mọi account đăng nhập (`report.create`) | 401 `UNAUTHENTICATED` · 400 `IDEMPOTENCY_KEY_REQUIRED` · 400 Zod (`errors.report.descriptionTooLong`) · 404 `REPORT_TARGET_NOT_FOUND` · 422 `REPORT_SELF_NOT_ALLOWED` · 429 `RATE_LIMITED` + `Retry-After` |
| E2 | `POST /users/:userId/block` | — | 204 (chặn lại cũng 204, vẫn 1 dòng) | mọi account (`block.manage`) | 401 · 404 `PROFILE_NOT_FOUND` (user không tồn tại/không `active`/đã xoá) · 422 `BLOCK_SELF_NOT_ALLOWED` |
| E3 | `DELETE /users/:userId/block` | — | 204 (kể cả chưa chặn) | mọi account | 401 |
| E4 | `GET /me/blocks` | `ListBlockQuery` | 200 `envelope(cursorPage(BlockedUserResponse))`, mới nhất trước | mọi account | 401 |
| E5 | `GET /admin/moderation/queue` | `ModerationQueueQuery` | 200 `envelope(ModerationQueueResponse)`; open: severity DESC, first_reported_at ASC; closed: closed_at DESC; loại ticket COI | `moderation.queue.view` | 401 · 403 `ROLE_NOT_ALLOWED` |
| E6 | `GET /admin/moderation/tickets/:ticketId` | — | 200 `envelope(ModerationTicketDetailResponse)` | `moderation.queue.view` | 401 · 403 `ROLE_NOT_ALLOWED` · 403 `CONFLICT_OF_INTEREST` · 404 `MODERATION_TICKET_NOT_FOUND` |
| E7 | `POST /admin/moderation/actions` | `ModerationActionRequest` | 201 `envelope(ModerationActionResponse)` | `moderation.action.take` (+ `restore_taken_down` cho `restore_event` từ `taken_down`) | 400 Zod (`noteTooShort`/`noteTooLong`/`reasonRequired`) · 401 · 403 `ROLE_NOT_ALLOWED` · 403 `CONFLICT_OF_INTEREST` · 403 `MODERATION_SELF_NOT_ALLOWED` · 403 `MODERATION_TARGET_PROTECTED` · 403 `SUSPENSION_TOO_LONG` (`details.maxDays`) · 404 `MODERATION_TICKET_NOT_FOUND` / `MODERATION_TARGET_NOT_FOUND` · 409 `TICKET_ALREADY_CLOSED` · 409 `MODERATION_INVALID_STATE` · 422 `TARGET_NOT_IN_TICKET` |
| E8 | `POST /admin/moderation/tickets/:ticketId/dismiss` | `TicketDismissRequest` | 201 `envelope(ModerationActionResponse)` (`no_action`) | `moderation.action.take` | 400 Zod · 401 · 403 `ROLE_NOT_ALLOWED`/`CONFLICT_OF_INTEREST` · 404 · 409 `TICKET_ALREADY_CLOSED` |
| E9 | `POST /admin/moderation/tickets/:ticketId/severity` | `TicketSeverityRequest` | 201 `envelope(ModerationActionResponse)` (`severity_changed`) | `moderation.action.take` | như E8; cùng mức hiện tại → 409 `MODERATION_INVALID_STATE` |
| E10 | `GET /admin/audit-logs` | `AuditLogQuery` | 200 `envelope(cursorPage(AuditLogResponse))`, `id DESC` | `audit_log.view`, phạm vi `auditLogScope` | 401 · 403 `ROLE_NOT_ALLOWED` |

Không có PATCH/PUT/DELETE nào cho report, ticket, action, audit (AC-45).

**Thay đổi hành vi endpoint hiện có** (BE-2):

| Endpoint | Thay đổi khi A–B có chặn (bất kỳ chiều) | Phản hồi |
|---|---|---|
| `GET /events`, `GET /events/:id` | loại sự kiện có `organizer_id` = bên kia | bỏ khỏi list / 404 `EVENT_NOT_FOUND` |
| `POST /occurrences/:id/rsvps` | organizer là bên kia | 404 `rsvp.error.occurrenceNotFound` (y hệt không tồn tại) |
| `GET /occurrences/:id/rsvps` | bỏ bên kia khỏi danh sách; số đếm trên event không đổi | — |
| `GET /posts`, `GET /posts/:id` | loại bài của bên kia | bỏ / 404 `POST_NOT_FOUND` |
| `GET/POST /posts/:id/comments`, `/events/:id/comments` | target của bên kia → 404; bình luận (gốc + trả lời) của bên kia bị lọc; `parentId` của bên kia → 404 parent | 404 như cũ |
| `GET /comments/:id` | tác giả là bên kia | 404 |
| `PUT/DELETE/GET …/reactions` (post/comment/event) | chủ target là bên kia | 404 như cũ |
| `GET /profiles/:handle` | là bên kia | 404 `PROFILE_NOT_FOUND` |
| `POST /conversations` (direct) | người nhận là bên kia (kiểm **sau** self-check và trust-check, để không lộ chặn qua thứ tự lỗi) | 403 `CONVERSATION_REQUEST_REFUSED` |
| `POST /conversations/:id/messages` (direct) | người kia trong hội thoại là bên kia | 403 `CONVERSATION_REQUEST_REFUSED` |
| `POST /conversations/:id/respond` `blocked` | ghi thêm `blocks(recipient → creator)` cùng transaction | như cũ |
| `PATCH /posts/:id`, `PATCH /comments/:id` (tác giả) | nội dung đang `hidden`/`removed` | 409 `CONTENT_UNDER_MODERATION`, không đổi gì |

Guest (không token) không bị lọc. Console staff đọc bằng SQL riêng của moderation → không lọc chặn (AC-18).

---

## 5. Key i18n mới (T-CONTRACT ghi hết, EN + VI cùng lúc, rồi `pnpm gen:i18n-keys`)

### 5.1 Lỗi backend

| key | en | vi |
|---|---|---|
| `errors.common.idempotencyKeyRequired` | This request is missing its retry key. Please try again. | Yêu cầu thiếu khoá chống gửi trùng. Vui lòng thử lại. |
| `errors.report.targetNotFound` | We couldn't find what you're trying to report. | Không tìm thấy nội dung bạn muốn báo cáo. |
| `errors.report.selfNotAllowed` | You can't report your own content or profile. | Bạn không thể báo cáo nội dung hoặc hồ sơ của chính mình. |
| `errors.report.descriptionTooLong` | Please keep the description under 2,000 characters. | Mô tả tối đa 2.000 ký tự. |
| `errors.report.rateLimited` | You've sent a lot of reports today. Please try again later. | Hôm nay bạn đã gửi nhiều báo cáo. Vui lòng thử lại sau. |
| `errors.block.selfNotAllowed` | You can't block yourself. | Bạn không thể tự chặn chính mình. |
| `errors.content.underModeration` | This content is under moderation and can't be edited. | Nội dung này đang bị kiểm duyệt nên không sửa được. |
| `errors.moderation.noteTooShort` | Write a note of at least 20 characters explaining the decision. | Hãy ghi chú ít nhất 20 ký tự giải thích quyết định. |
| `errors.moderation.noteTooLong` | Keep the note under 2,000 characters. | Ghi chú tối đa 2.000 ký tự. |
| `errors.moderation.reasonRequired` | Choose a reason. | Hãy chọn lý do. |
| `errors.moderation.ticketNotFound` | This ticket doesn't exist. | Không tìm thấy ticket này. |
| `errors.moderation.targetNotFound` | The content or account no longer exists. | Nội dung hoặc tài khoản không còn tồn tại. |
| `errors.moderation.ticketAlreadyClosed` | Someone has already handled this ticket. Reload to see the latest. | Ticket này đã được người khác xử lý. Tải lại để xem trạng thái mới nhất. |
| `errors.moderation.conflictOfInterest` | You can't handle this ticket because you're involved in it. | Bạn không thể xử lý ticket này vì bạn có liên quan. |
| `errors.moderation.selfNotAllowed` | You can't take moderation action on your own content or account. | Bạn không thể kiểm duyệt nội dung hoặc tài khoản của chính mình. |
| `errors.moderation.targetProtected` | This account's role needs a more senior staff member. | Vai trò của tài khoản này cần nhân sự cấp cao hơn xử lý. |
| `errors.moderation.suspensionTooLong` | Your role can suspend for at most {maxDays} days. | Vai trò của bạn chỉ được khoá tối đa {maxDays} ngày. |
| `errors.moderation.invalidState` | This action doesn't apply to the current state. Reload and try again. | Hành động này không áp dụng được với trạng thái hiện tại. Tải lại và thử lại. |
| `errors.moderation.targetNotInTicket` | This target doesn't belong to the ticket. | Đối tượng này không thuộc ticket. |

Dùng lại: `errors.auth.accountSuspended`, `errors.auth.roleNotAllowed`, `errors.auth.unauthenticated`,
`errors.chat.requestRefused`, `errors.event.notFound`, `errors.post.notFound`, `errors.comment.notFound`,
`errors.profile.notFound`, `rsvp.error.occurrenceNotFound`.

### 5.2 Web client (`safety.*`)

| key | en | vi |
|---|---|---|
| `safety.menu.more` | More options | Thêm tuỳ chọn |
| `safety.report.action` | Report | Báo cáo |
| `safety.report.title.event` | Report this event | Báo cáo sự kiện này |
| `safety.report.title.post` | Report this post | Báo cáo bài đăng này |
| `safety.report.title.comment` | Report this comment | Báo cáo bình luận này |
| `safety.report.title.user` | Report this person | Báo cáo người này |
| `safety.report.reassurance` | Reports are anonymous. The person you report won't know it was you. | Báo cáo là ẩn danh. Người bị báo cáo sẽ không biết đó là bạn. |
| `safety.report.emergency_first` | If someone is in immediate danger, call the police (113) or an ambulance (115) first. | Nếu có người đang gặp nguy hiểm ngay lúc này, hãy gọi Công an (113) hoặc Cấp cứu (115) trước. |
| `safety.report.reasonLabel` | Why are you reporting this? | Vì sao bạn báo cáo? |
| `safety.report.reason.danger` | Someone is in danger | Có người đang gặp nguy hiểm |
| `safety.report.reason.harassment` | Harassment or bullying | Quấy rối hoặc bắt nạt |
| `safety.report.reason.sexual` | Unwanted sexual content or contact | Nội dung hoặc tiếp cận tình dục không mong muốn |
| `safety.report.reason.hate` | Hate speech or discrimination | Ngôn từ thù ghét hoặc phân biệt đối xử |
| `safety.report.reason.scam` | Scam or someone asking for money | Lừa đảo hoặc xin tiền |
| `safety.report.reason.ghost_event` | This event isn't real | Sự kiện này không có thật |
| `safety.report.reason.impersonation` | Pretending to be someone else | Giả mạo người khác |
| `safety.report.reason.spam` | Spam or advertising | Spam hoặc quảng cáo |
| `safety.report.reason.privacy` | Shared someone's private information | Chia sẻ thông tin riêng tư của người khác |
| `safety.report.reason.illegal` | Illegal activity | Hoạt động vi phạm pháp luật |
| `safety.report.reason.unsafe_setup` | Unsafe event setup | Sự kiện tổ chức thiếu an toàn |
| `safety.report.reason.other` | Something else | Vấn đề khác |
| `safety.report.descriptionLabel` | Tell us more (optional) | Mô tả thêm (không bắt buộc) |
| `safety.report.descriptionCounter` | {count} / 2,000 | {count} / 2.000 |
| `safety.report.alsoBlock` | Also block this person | Chặn luôn người này |
| `safety.report.submit` | Send report | Gửi báo cáo |
| `safety.report.submitting` | Sending… | Đang gửi… |
| `safety.report.submitted` | Thanks — we've received your report. | Cảm ơn bạn — chúng tôi đã nhận được báo cáo. |
| `safety.report.submittedBody` | Our moderators will review it. We never tell anyone who reported. | Đội kiểm duyệt sẽ xem xét. Chúng tôi không bao giờ tiết lộ ai là người báo cáo. |
| `safety.report.close` | Close | Đóng |
| `safety.report.errorGeneric` | We couldn't send your report. Please try again. | Chưa gửi được báo cáo. Vui lòng thử lại. |
| `safety.report.errorOffline` | You seem to be offline. Check your connection and try again. | Có vẻ bạn đang mất kết nối. Kiểm tra mạng và thử lại. |
| `safety.block.action` | Block this person | Chặn người này |
| `safety.block.actionAuthor` | Block author | Chặn tác giả |
| `safety.block.actionOrganizer` | Block organizer | Chặn người tổ chức |
| `safety.block.confirmTitle` | Block this person? | Chặn người này? |
| `safety.block.confirmBody` | You won't see each other's events, posts, comments or profile, and neither of you can message the other. They won't be notified. | Hai bạn sẽ không thấy sự kiện, bài đăng, bình luận hay hồ sơ của nhau và không nhắn tin được cho nhau. Người này sẽ không nhận được thông báo. |
| `safety.block.confirm` | Block | Chặn |
| `safety.block.cancel` | Cancel | Huỷ |
| `safety.block.working` | Blocking… | Đang chặn… |
| `safety.block.blocked` | Blocked | Đã chặn |
| `safety.block.unblock` | Unblock | Bỏ chặn |
| `safety.block.error` | We couldn't update this block. Please try again. | Chưa cập nhật được việc chặn. Vui lòng thử lại. |
| `safety.block.list.title` | Blocked people | Người đã chặn |
| `safety.block.list.empty` | You haven't blocked anyone. | Bạn chưa chặn ai. |
| `safety.block.list.blockedAt` | Blocked {time} | Đã chặn {time} |
| `safety.label.contentHidden` | Hidden for breaking the Community Guidelines | Đã bị ẩn do vi phạm Quy tắc cộng đồng |
| `safety.label.eventSuspended` | Temporarily removed for review | Tạm gỡ để xem xét |
| `safety.label.eventTakenDown` | Removed for breaking the Community Guidelines | Đã bị gỡ do vi phạm Quy tắc cộng đồng |
| `safety.label.eventUnavailable` | This event is no longer available | Sự kiện này không còn khả dụng |

Dùng lại: `common.retry`, `common.loading`, `event.status.*`.

### 5.3 Web admin (`admin.*`)

| key | en | vi |
|---|---|---|
| `admin.nav.moderationQueue` | Moderation queue | Hàng đợi kiểm duyệt |
| `admin.nav.auditLog` | Audit log | Nhật ký kiểm toán |
| `admin.moderation.queue.title` | Moderation queue | Hàng đợi kiểm duyệt |
| `admin.moderation.queue.filter.open` | Open | Đang mở |
| `admin.moderation.queue.filter.closed` | Handled | Đã xử lý |
| `admin.moderation.queue.filter.allSeverities` | All severities | Mọi mức |
| `admin.moderation.queue.column.severity` | Severity | Mức |
| `admin.moderation.queue.column.target` | Reported item | Đối tượng |
| `admin.moderation.queue.column.reasons` | Reasons | Lý do |
| `admin.moderation.queue.column.reports` | Reports | Số báo cáo |
| `admin.moderation.queue.column.firstReported` | First reported | Báo cáo đầu |
| `admin.moderation.queue.column.sla` | SLA | SLA |
| `admin.moderation.queue.column.outcome` | Outcome | Kết quả |
| `admin.moderation.queue.column.closedAt` | Closed | Đóng lúc |
| `admin.moderation.queue.empty.open` | No open tickets. | Không có ticket nào đang mở. |
| `admin.moderation.queue.empty.closed` | No handled tickets yet. | Chưa có ticket nào được xử lý. |
| `admin.moderation.queue.loadMore` | Load more | Tải thêm |
| `admin.moderation.queue.error.title` | Couldn't load the queue | Không tải được hàng đợi |
| `admin.moderation.queue.error.body` | Timers are paused until the data is refreshed. | Đồng hồ tạm dừng cho tới khi tải lại được dữ liệu. |
| `admin.moderation.severity.critical` | P0 · Critical | P0 · Khẩn cấp |
| `admin.moderation.severity.high` | P1 · High | P1 · Cao |
| `admin.moderation.severity.normal` | P2 · Normal | P2 · Thường |
| `admin.moderation.severity.low` | P3 · Low | P3 · Thấp |
| `admin.moderation.sla.normal` | On track · {remaining} left | Trong hạn · còn {remaining} |
| `admin.moderation.sla.dueSoon` | Due soon · {remaining} left | Sắp quá hạn · còn {remaining} |
| `admin.moderation.sla.overdue` | Overdue by {overdue} | Quá hạn {overdue} |
| `admin.moderation.sla.stopped` | Stopped | Đã dừng |
| `admin.moderation.targetType.event` | Event | Sự kiện |
| `admin.moderation.targetType.post` | Post | Bài đăng |
| `admin.moderation.targetType.comment` | Comment | Bình luận |
| `admin.moderation.targetType.user` | Account | Tài khoản |
| `admin.moderation.ticketStatus.open` | Open | Đang mở |
| `admin.moderation.ticketStatus.resolved` | Resolved | Đã xử lý |
| `admin.moderation.ticketStatus.dismissed` | Dismissed | Đã bác |
| `admin.moderation.ticket.back` | Back to queue | Về hàng đợi |
| `admin.moderation.ticket.snapshotTitle` | Content at the time of the report | Nội dung lúc báo cáo |
| `admin.moderation.ticket.currentStatus` | Current status: {status} | Trạng thái hiện tại: {status} |
| `admin.moderation.ticket.targetDeleted` | Deleted by its author | Đã bị tác giả xoá |
| `admin.moderation.ticket.owner` | Owner | Chủ sở hữu |
| `admin.moderation.ticket.suspendedUntil` | Suspended until {time} | Bị khoá đến {time} |
| `admin.moderation.ticket.reportsTitle` | Reports ({count}) | Báo cáo ({count}) |
| `admin.moderation.ticket.reporter` | Reported by {name} | Người báo cáo: {name} |
| `admin.moderation.ticket.reporterDeleted` | Reporter account deleted | Tài khoản người báo cáo đã xoá |
| `admin.moderation.ticket.noDescription` | No description | Không có mô tả |
| `admin.moderation.ticket.historyTitle` | Action history | Lịch sử xử lý |
| `admin.moderation.ticket.historyEmpty` | No actions yet. | Chưa có hành động nào. |
| `admin.moderation.ticket.actorSystem` | System | Hệ thống |
| `admin.moderation.ticket.addAction` | Add another action | Thêm hành động khác |
| `admin.moderation.ticket.error.title` | Couldn't load this ticket | Không tải được ticket |
| `admin.moderation.action.hide_content` | Hide content | Ẩn nội dung |
| `admin.moderation.action.restore_content` | Restore content | Khôi phục nội dung |
| `admin.moderation.action.suspend_event` | Suspend event | Tạm gỡ sự kiện |
| `admin.moderation.action.take_down_event` | Take down event | Gỡ sự kiện |
| `admin.moderation.action.restore_event` | Restore event | Khôi phục sự kiện |
| `admin.moderation.action.suspend_user` | Suspend account | Khoá tài khoản |
| `admin.moderation.action.unsuspend_user` | Lift suspension | Mở khoá tài khoản |
| `admin.moderation.action.dismiss` | Dismiss (no violation) | Bác báo cáo (không vi phạm) |
| `admin.moderation.action.changeSeverity` | Change severity | Đổi mức |
| `admin.moderation.actionType.content_hidden` | Content hidden | Đã ẩn nội dung |
| `admin.moderation.actionType.content_restored` | Content restored | Đã khôi phục nội dung |
| `admin.moderation.actionType.event_suspended` | Event suspended | Đã tạm gỡ sự kiện |
| `admin.moderation.actionType.event_taken_down` | Event taken down | Đã gỡ sự kiện |
| `admin.moderation.actionType.event_restored` | Event restored | Đã khôi phục sự kiện |
| `admin.moderation.actionType.user_suspended` | Account suspended | Đã khoá tài khoản |
| `admin.moderation.actionType.user_unsuspended` | Suspension lifted | Đã mở khoá tài khoản |
| `admin.moderation.actionType.no_action` | No violation (dismissed) | Không vi phạm (đã bác) |
| `admin.moderation.actionType.severity_changed` | Severity {from} → {to} | Đổi mức {from} → {to} |
| `admin.moderation.form.reason` | Reason | Lý do |
| `admin.moderation.form.note` | Note (at least 20 characters) | Ghi chú (ít nhất 20 ký tự) |
| `admin.moderation.form.noteCounter` | {count} / 20 minimum | {count} / tối thiểu 20 |
| `admin.moderation.form.duration` | Duration (days) | Thời hạn (ngày) |
| `admin.moderation.form.durationHint` | Up to {maxDays} days for your role | Tối đa {maxDays} ngày với vai trò của bạn |
| `admin.moderation.form.severity` | New severity | Mức mới |
| `admin.moderation.form.submit` | Confirm | Xác nhận |
| `admin.moderation.form.submitting` | Saving… | Đang lưu… |
| `admin.moderation.form.cancel` | Cancel | Huỷ |
| `admin.moderation.form.errorGeneric` | Couldn't save the action. Try again. | Chưa lưu được hành động. Hãy thử lại. |
| `admin.audit.title` | Audit log | Nhật ký kiểm toán |
| `admin.audit.readOnly` | Read-only. Entries can't be edited or deleted. | Chỉ đọc. Không thể sửa hay xoá bản ghi. |
| `admin.audit.filter.from` | From | Từ |
| `admin.audit.filter.to` | To | Đến |
| `admin.audit.filter.action` | Action | Hành động |
| `admin.audit.filter.actor` | Performed by (user ID) | Người thực hiện (ID) |
| `admin.audit.filter.entityType` | Object type | Loại đối tượng |
| `admin.audit.filter.any` | Any | Tất cả |
| `admin.audit.filter.apply` | Apply | Áp dụng |
| `admin.audit.filter.reset` | Reset | Đặt lại |
| `admin.audit.column.time` | Time | Thời điểm |
| `admin.audit.column.actor` | Performed by | Người thực hiện |
| `admin.audit.column.action` | Action | Hành động |
| `admin.audit.column.entity` | Object | Đối tượng |
| `admin.audit.column.change` | Change | Thay đổi |
| `admin.audit.column.reason` | Reason | Lý do |
| `admin.audit.system` | System | Hệ thống |
| `admin.audit.empty` | No entries match these filters. | Không có bản ghi nào khớp bộ lọc. |
| `admin.audit.loadMore` | Load more | Tải thêm |
| `admin.audit.error.title` | Couldn't load the audit log | Không tải được nhật ký kiểm toán |
| `admin.audit.action.content_hidden` | Content hidden | Ẩn nội dung |
| `admin.audit.action.content_restored` | Content restored | Khôi phục nội dung |
| `admin.audit.action.event_suspended` | Event suspended | Tạm gỡ sự kiện |
| `admin.audit.action.event_taken_down` | Event taken down | Gỡ sự kiện |
| `admin.audit.action.event_restored` | Event restored | Khôi phục sự kiện |
| `admin.audit.action.user_suspended` | Account suspended | Khoá tài khoản |
| `admin.audit.action.user_unsuspended` | Suspension lifted | Mở khoá tài khoản |
| `admin.audit.action.report_dismissed` | Report dismissed | Bác báo cáo |
| `admin.audit.action.severity_changed` | Severity changed | Đổi mức |
| `admin.audit.entityType.post` | Post | Bài đăng |
| `admin.audit.entityType.comment` | Comment | Bình luận |
| `admin.audit.entityType.event` | Event | Sự kiện |
| `admin.audit.entityType.user` | Account | Tài khoản |
| `admin.audit.entityType.moderation_ticket` | Ticket | Ticket |
| `admin.audit.severity.info` | Info | Thông tin |
| `admin.audit.severity.notice` | Notice | Lưu ý |
| `admin.audit.severity.warning` | Warning | Cảnh báo |
| `admin.audit.severity.critical` | Critical | Nghiêm trọng |

Key audit action = hậu tố sau `moderation.` (UI: `t(\`admin.audit.action.${action.split('.')[1]}\`)`).
Lý do trong console dùng lại `safety.report.reason.*`; tên role dùng lại `role.*.label`.

---

## 6. Task cards

### T-CONTRACT — Hợp đồng, domain, i18n, migration
```md
ID: T-CONTRACT
Title: Chốt hợp đồng dùng chung + migration 0009
Owner Agent: orchestrator (vai Tech Lead) — tuần tự, TRƯỚC mọi task khác
Goal: Mọi agent sau chỉ đọc hợp đồng, không ai đoán.
Allowed files:
  apps/api/src/database/sql/0009_moderation_core.sql (mới, nguyên văn §2)
  packages/contracts/src/safety.ts, moderation.ts, audit.ts (mới, nguyên văn §3.1–3.3)
  packages/contracts/src/index.ts (§3.4)
  packages/contracts/test/moderation-vocabulary.spec.ts (mới)
  packages/domain/src/moderation.ts (mới), permission-matrix.ts, index.ts
  packages/domain/test/moderation.spec.ts (mới), permission-matrix.spec.ts
  packages/i18n/messages/en.json, vi.json, src/message-keys.ts (sinh lại)
Do not edit: apps/**
Inputs: brief.md, §1–§5 của board này
Dependencies: —
Acceptance slice: nền cho mọi AC; AC-23 (unit), AC-40 (trigger), AC-47 (catalog)
Test lane: unit (domain, contracts, i18n) + áp migration local
Definition of Done:
  - `pnpm --filter @dnc/contracts test && pnpm --filter @dnc/domain test && pnpm --filter @dnc/i18n test` xanh
  - `pnpm typecheck` xanh toàn repo (không app nào vỡ vì export mới)
  - Áp 0009 vào DB local bằng lệnh D1; `psql -c "UPDATE moderation_actions SET note=note"` → lỗi 42501;
    `SELECT lift_expired_suspension(gen_random_uuid())` → false
  - `pnpm gen:i18n-keys` đã chạy; en/vi cùng tập key
Risk: đổi thứ tự enum Zod vs SQL → test vocabulary chặn
```

**Trạng thái T-CONTRACT: `needs_test`** (25/09/2026). Đã xong phần code; còn thiếu bằng chứng
chạy test và áp migration, vì máy làm việc không có Docker/pnpm và chỉ có Node 18.
- Đã ghi đúng nguyên văn §2 và §3.1–3.4: file SQL và ba file contracts được **trích tự động từ board**,
  nên không lệch hợp đồng. `domain/moderation.ts` hiện thực đúng các chữ ký §3.6. `permission-matrix.ts`
  thêm đủ 3 hằng role và 6 key theo §3.5. i18n thêm đủ 183 key của §5, cả en và vi (tổng 577), rồi sinh
  lại `message-keys.ts`.
- Lệch duy nhất: test có sẵn `never grants a permission to member` trong `domain/test/permission-matrix.spec.ts`
  được thu hẹp thành danh sách trắng tường minh `['report.create', 'block.manage']`. Nếu giữ nguyên, test
  mâu thuẫn với §3.5. Đồng thời thêm test cho curator/queue/audit, restore_taken_down và report/block.
- Bằng chứng đã có:
  - `tsc --noEmit` (binary native) cho contracts, domain, i18n, web-client-side: exit 0.
  - web-admin-side và api cũng báo lỗi, nhưng chỉ là TS2307/TS6053/TS2304 do thiếu `node_modules` trên máy
    này (chưa cài `web-admin-side`; api thiếu nodemailer/ioredis). Không lỗi nào liên quan file mới.
  - Kiểm tra runtime trên Node 18, bằng bản transpile trong scratchpad: vocabulary SQL↔Zod đủ 8 enum đúng
    thứ tự; lỗi Zod mang messageKey; discriminated union của action; toàn bộ bảng/ngưỡng domain. Tất cả qua.
- Còn nợ, người xác minh là BE-1 trên máy có Docker, Node 24 và pnpm:
  - `pnpm --filter @dnc/{contracts,domain,i18n} test`
  - áp 0009 bằng lệnh D1
  - chạy `UPDATE moderation_actions …`, kỳ vọng lỗi 42501

### T-API-1 — Report + ticket (Backend #1)
```md
ID: T-API-1
Title: POST /reports — idempotency, dedupe, rate limit, snapshot, gộp ticket, alsoBlock
Owner Agent: backend-agent (#1)
Goal: E1 theo D8, D9.
Scope: module mới `report` (controller/service/repository/module/mapper/index); đăng ký trong app.module.ts
Allowed files:
  apps/api/src/modules/report/** (mới)
  apps/api/src/app.module.ts  (chỉ BE-1 sửa file này trong đợt này)
  apps/api/e2e/support/harness.ts (cleanup, xem DoD)
  ops/db/clean-test-data.sh
  apps/api/e2e/modules/report/report.e2e.spec.ts (mới)
Do not edit: packages/**, apps/api/src/database/sql/**, module event/post/comment/reaction/rsvp/profile/chat (BE-2), apps/web-*
Inputs: §3.1, E1, D8, D9, REPORT_REASON_SEVERITY, SLA_HOURS, reportDailyLimit
Dependencies: T-CONTRACT
Acceptance slice: AC-1 (API), AC-2 (API cả 4 target), AC-5, AC-6, AC-7, AC-9, AC-10, AC-11, AC-24, AC-46
Test lane: integration (e2e thật trên Postgres) + regression toàn API
Definition of Done:
  - Upsert ticket bằng `INSERT … ON CONFLICT (target_type, target_id) WHERE status='open' DO UPDATE
    SET severity=GREATEST(..), sla_due_at=LEAST(..), report_count=+1, last_reported_at=..`;
    `sla_due_at = now() + make_interval(hours => $n)`
  - Visibility target: event `published`, post/comment `visible`, user `active` + có profile; tất cả `deleted_at IS NULL`; KHÔNG áp bộ lọc chặn
  - `related_event_organizer_id` = organizer khi comment có `event_id`
  - Mô tả rỗng sau trim → lưu NULL (CHECK DB đòi độ dài 1–2000)
  - harness.ts: cleanup mới chạy ĐẦU TIÊN — một client riêng, `BEGIN; SET LOCAL session_replication_role = replica;
    DELETE FROM audit_logs WHERE actor_user_id = ANY($1) OR subject_user_id = ANY($1);
    DELETE FROM moderation_actions WHERE actor_user_id = ANY($1) OR target_user_id = ANY($1); COMMIT;`
    rồi (chế độ thường) `DELETE FROM reports WHERE reporter_user_id = ANY($1) OR target_owner_user_id = ANY($1);
    DELETE FROM moderation_tickets WHERE target_owner_user_id = ANY($1);` (`blocks` tự CASCADE khi xoá users)
  - clean-test-data.sh: cùng các lệnh trên với bảng `doomed`, bật `replica` chỉ quanh 2 lệnh append-only
    rồi `SET LOCAL session_replication_role = origin`
  - e2e: 201 + shape; replay cùng key → cùng id, không dòng mới; report lần 2 cùng target → report cũ;
    422 self (post/event/comment/user); 404 target lạ; 400 thiếu key; 400 mô tả 2001 ký tự (body chứa
    `errors.report.descriptionTooLong`); 401; 429 + `Retry-After` ở report thứ 6 (T1), 11 (T2), 21 (T3)
    — được phép chèn sẵn report bằng SQL để đạt ngưỡng; AC-24 (P2 rồi harassment → P0, hạn T+3h ±5s);
    `alsoBlock` tạo dòng `blocks`; SQL: `audit_logs` không có dòng nào do report/block (AC-46);
    B đọc event/post/profile của mình không có trường report nào (AC-11)
  - `pnpm --filter @dnc/api test` toàn bộ xanh
Risk: rate limit race (đã khoá advisory); snapshot chứa PII của bên thứ ba — chỉ staff đọc
```

### T-API-2 — Hàng đợi + chi tiết ticket (Backend #1)
```md
ID: T-API-2
Title: GET queue + ticket detail, COI, ẩn danh moderator
Owner Agent: backend-agent (#1)
Goal: E5, E6 theo D10, D14, D15.
Allowed files:
  apps/api/src/modules/moderation/** (mới: controller/service/repository/module/mapper/index)
  apps/api/src/app.module.ts
  apps/api/e2e/modules/moderation/moderation-queue.e2e.spec.ts (mới)
Do not edit: như T-API-1
Dependencies: T-API-1
Acceptance slice: AC-18, AC-21, AC-22, AC-23 (API: hạn đúng), AC-26 (ẩn + 403 detail), AC-27, AC-29, AC-39 (GET), AC-41
Test lane: integration
Definition of Done:
  - `@Roles(...allowedRolesFor('moderation.queue.view'))`; curator 403; member 403; không token 401
  - Keyset open: `(severity < $s) OR (severity = $s AND (first_reported_at, id) > ($f, $id))`, ORDER BY severity DESC, first_reported_at ASC, id ASC; closed: `(closed_at, id) < (..)` DESC
  - Lọc COI trong SQL (reporter trong ticket / owner / related organizer)
  - `outcome` = action_type của hành động đầu tiên có ticket_id; `targetPreview` ≤ 140 ký tự từ snapshot report đầu
  - `actor.user` null khi viewer là moderator và actor ≠ viewer; admin/SA thấy đủ
  - e2e: thứ tự AC-22 (chỉnh `first_reported_at` bằng SQL), lọc P0; closed tab; A chặn M → M vẫn xem được ticket + snapshot (AC-18); M là reporter → không thấy + 403
Risk: rò danh tính reporter nếu dùng chung mapper cho member — mapper riêng, chỉ ở module moderation
```

### T-API-3 — Hành động + audit (Backend #1)
```md
ID: T-API-3
Title: POST actions / dismiss / severity + module audit (ghi + đọc)
Owner Agent: backend-agent (#1)
Goal: E7–E10; đúng 1 moderation_actions + 1 audit_logs mỗi hành động, cùng transaction.
Allowed files:
  apps/api/src/modules/moderation/**
  apps/api/src/modules/audit/** (mới: AuditService.record(tx, entry) export + GET /admin/audit-logs)
  apps/api/src/app.module.ts
  apps/api/e2e/modules/moderation/moderation-actions.e2e.spec.ts (mới)
  apps/api/e2e/modules/audit/audit-log.e2e.spec.ts (mới)
Do not edit: như T-API-1
Dependencies: T-API-2
Acceptance slice: AC-25, AC-26 (403 action), AC-30, AC-31 (API ẩn/khôi phục; 409 sửa do T-API-6), AC-32, AC-33 (khoá + thu hồi phiên), AC-35, AC-36, AC-37, AC-38, AC-39, AC-40, AC-42, AC-43, AC-44, AC-45
Test lane: integration + regression
Definition of Done:
  - Trình tự trong `withTransaction`: `SELECT … FROM moderation_tickets WHERE id=$1 FOR UPDATE` → COI →
    trạng thái ticket/followUp → khoá + đọc target & owner role → kiểm D12 → UPDATE target có điều kiện
    trạng thái nguồn (0 dòng → 409 MODERATION_INVALID_STATE) → INSERT moderation_actions → AuditService.record(tx)
    → đóng ticket + report (nếu cưỡng chế/dismiss). Lỗi ở bất kỳ bước nào → rollback tất cả
  - Nguồn hợp lệ: hide `visible→hidden` (+ `moderation_state='actioned'`); restore_content `hidden→visible` (+ `clean`);
    suspend_event từ draft|pending_review|published|cancelled; take_down từ mọi trạng thái ≠ taken_down;
    restore_event từ suspended|taken_down → published; suspend_user `active→suspended`
    (`suspended_until = now() + durationDays`, `suspension_reason = reasonCode`) + `UPDATE auth_sessions SET revoked_at=now(),
    revoked_reason='account_suspended' WHERE user_id=$1 AND revoked_at IS NULL`; unsuspend `suspended→active`, xoá 2 cột
  - before/after chỉ gồm trường đổi (camelCase): status, moderationState, suspendedUntil, severity, slaDueAt
  - Audit đọc: scope theo `auditLogScope`; moderator lọc actorUserId ≠ mình → rỗng (không 403); cursor `id DESC`
  - e2e AC-43: tạo tạm `CREATE TRIGGER … BEFORE INSERT ON audit_logs … WHEN (NEW.note LIKE '%E2E_FAIL_AUDIT%')`
    raise lỗi → gỡ sự kiện với note chứa marker → sự kiện không đổi, không dòng action; DROP trigger trong finally
  - e2e AC-37: `Promise.all` 2 moderator cùng hành động → một 201, một 409 `TICKET_ALREADY_CLOSED`, đúng 1 action đóng
  - e2e AC-40: UPDATE và DELETE trên moderation_actions/audit_logs qua Pool → lỗi code `42501`
  - e2e AC-44: M chỉ thấy của M; AD không thấy dòng actor_role=super_admin; SA thấy hết
Risk: quên điều kiện trạng thái nguồn → mất bất biến; ghi chéo bảng module khác (D13, có docblock)
```

### T-API-4 — Hết hạn khoá trong auth (Backend #1)
```md
ID: T-API-4
Title: assertUsable tôn trọng suspended_until + refresh của phiên bị thu hồi do khoá
Owner Agent: backend-agent (#1)
Goal: D4.
Allowed files:
  apps/api/src/modules/auth/auth.service.ts, auth.repository.ts
  apps/api/e2e/modules/moderation/suspension.e2e.spec.ts (mới)
Do not edit: jwt-auth.guard.ts, auth.controller.ts, contracts
Dependencies: T-API-3 (dùng endpoint khoá trong e2e)
Acceptance slice: AC-33 (403 login + refresh), AC-34
Test lane: integration + regression (`e2e/modules/auth/auth.e2e.spec.ts` phải xanh không sửa)
Definition of Done:
  - `UserRow` thêm `suspended_until`; `assertUsable` async: nếu `suspended` + `suspended_until <= now` →
    `SELECT lift_expired_suspension($1)`; true → đọc lại user rồi tiếp tục; còn lại giữ nguyên hành vi cũ
  - `refresh()`: session có `revoked_reason='account_suspended'` → đọc user, `assertUsable` (403 khi còn khoá),
    nếu đã hết khoá → 401 INVALID_REFRESH; không `revokeFamily`
  - e2e: khoá 7 ngày → login 403 `ACCOUNT_NOT_ACTIVE` + `errors.auth.accountSuspended`, refresh 403;
    đẩy `suspended_until` về quá khứ bằng SQL → login 200, có 1 action `user_unsuspended` actor system + 1 audit;
    mở khoá sớm → login 200 ngay; `suspended` + `suspended_until NULL` → vẫn 403 (không hồi quy)
Risk: chạm luồng đăng nhập — regression auth bắt buộc
```

### T-API-5 — Block CRUD + bộ lọc chung (Backend #2, song song BE-1)
```md
ID: T-API-5
Title: POST/DELETE /users/:userId/block, GET /me/blocks, fragment SQL chặn hai chiều
Owner Agent: backend-agent (#2)
Goal: E2–E4 trong module profile (D5).
Allowed files:
  apps/api/src/common/db/block-filter.ts (mới)
  apps/api/src/modules/profile/profile.controller.ts, profile.service.ts, profile.repository.ts, profile.mapper.ts
  apps/api/e2e/modules/profile/block.e2e.spec.ts (mới)
Do not edit: app.module.ts, harness.ts, packages/**, sql/**, module report/moderation/audit/auth
Dependencies: T-CONTRACT
Acceptance slice: AC-12 (API), AC-16, AC-17 (profile), AC-20
Test lane: integration
Definition of Done:
  - `block-filter.ts` export `notBlockedBetween(viewerParam: string, otherColumn: string): string` sinh
    `($v::uuid IS NULL OR NOT EXISTS (SELECT 1 FROM blocks bl WHERE (bl.blocker_user_id=$v::uuid AND bl.blocked_user_id=<col>)
     OR (bl.blocker_user_id=<col> AND bl.blocked_user_id=$v::uuid)))` — chỉ nhận tên tham số/cột hằng, không nội suy dữ liệu
  - Block: `INSERT … ON CONFLICT DO NOTHING` → 204; target không tồn tại/không active/đã xoá → 404 PROFILE_NOT_FOUND;
    tự chặn → 422 BLOCK_SELF_NOT_ALLOWED; unblock `DELETE` → 204 luôn
  - `ProfileService.findByHandle`: viewer có chặn với chủ hồ sơ → cùng `notFound()` (body y hệt byte-for-byte)
  - e2e AC-16, AC-20, AC-17 (so sánh `code`+`messageKey` 404 bị chặn với handle không tồn tại)
Risk: lộ chặn qua mã lỗi khác nhau — dùng đúng exception đã có
```

**Trạng thái T-API-5: `needs_test`** (BE-2, 25/09/2026). Code xong. `tsc --noEmit` apps/api sạch, chỉ còn 5 lỗi
TS2307 nodemailer/ioredis đã có từ trước. Chưa chạy e2e vì máy không có Docker/pnpm.
- `block-filter.ts` export `notBlockedBetween` như DoD, thêm `blockedBetween` (bản đảo, dạng giá trị, cho RSVP/chat).
  Cả hai kiểm hình dạng tham số/cột bằng regex, sai thì throw.
- E2/E3/E4 nằm trong `ProfileController`. `block` là một câu `WITH target … INSERT … ON CONFLICT DO NOTHING`.
  404 `PROFILE_NOT_FOUND` khi target không `active`/đã xoá. `@Roles(allowedRolesFor('block.manage'))`.
- `findByHandle(handle, viewerId)` lọc chặn ngay trong SQL, nên vẫn là đúng `notFound()` cũ.

### T-API-6 — Áp bộ lọc chặn lên bề mặt hiện có + 409 sửa nội dung bị ẩn (Backend #2)
```md
ID: T-API-6
Title: Lọc chặn hai chiều ở event/post/comment/reaction/rsvp/chat
Owner Agent: backend-agent (#2)
Goal: bảng "Thay đổi hành vi endpoint hiện có" §4.
Allowed files (đúng các hàm):
  apps/api/src/modules/event/event.repository.ts — findById, list (predicate trên e.organizer_id)
  apps/api/src/modules/post/post.repository.ts — findById, list (p.author_user_id); findOwner trả thêm status
  apps/api/src/modules/post/post.service.ts — update/assertOwner: hidden|removed → 409 CONTENT_UNDER_MODERATION
  apps/api/src/modules/comment/comment.repository.ts — targetExists(target, viewerId), findParent(.., viewerId),
      findById, list (cả nhánh root lẫn reply, trên c.user_id); findAuthor trả thêm status
  apps/api/src/modules/comment/comment.service.ts — truyền viewer; update → 409 CONTENT_UNDER_MODERATION
  apps/api/src/modules/reaction/reaction.repository.ts — targetExists(target, viewerId) (EXISTS_SQL theo chủ target)
  apps/api/src/modules/reaction/reaction.service.ts — assertTarget truyền viewer
  apps/api/src/modules/rsvp/rsvp.repository.ts — lockOccurrence thêm cột `blocked_with_organizer`; listAttendees(occurrenceId, viewerId)
  apps/api/src/modules/rsvp/rsvp.service.ts — join: blocked → notFound(); attendees(occurrenceId, viewer)
  apps/api/src/modules/rsvp/rsvp.controller.ts — attendees truyền viewer
  apps/api/src/modules/chat/chat.repository.ts — isBlockedBetween(a,b); respondToRequest: withTransaction + upsert blocks khi 'blocked'
  apps/api/src/modules/chat/chat.service.ts — openDirect (sau trust check), assertRequestQuota (direct) → 403 CONVERSATION_REQUEST_REFUSED
  apps/api/e2e/modules/profile/block.e2e.spec.ts (bổ sung ma trận)
Do not edit: như T-API-5; không sửa assertion e2e cũ (nếu buộc phải sửa → dừng, báo Coordinator)
Dependencies: T-API-5
Acceptance slice: AC-13 (đủ hai chiều mỗi dòng), AC-14, AC-15, AC-16 (hiện lại ngay sau bỏ chặn), AC-17, AC-31 (409)
Test lane: integration + regression toàn API (event/post/comment/reaction/rsvp/chat spec cũ xanh nguyên)
Definition of Done:
  - Ma trận e2e: với mỗi dòng bảng §4 chạy 2 chiều (A chặn B: B→đồ của A và A→đồ của B); C thấy bình luận của cả A lẫn B;
    RSVP có sẵn của B vẫn `confirmed`; bỏ chặn → request kế tiếp thấy lại
  - `EXPLAIN` của `GET /events?lat&lng&radiusMeters` vẫn dùng `idx_events_location` (dán vào handoff)
  - Guest không đổi hành vi
Risk: sót một truy vấn là lộ — Reviewer đối chiếu danh sách hàm ở trên
```

**Trạng thái T-API-6: `needs_test`** (BE-2, 25/09/2026). Đã sửa đủ các hàm card liệt kê, không đụng hàm nào ngoài
danh sách. Không sửa assertion e2e cũ nào. Typecheck: xem T-API-5. Ma trận e2e nằm ở `e2e/modules/profile/block.e2e.spec.ts`:
chạy hai chiều cho từng dòng §4, so body 404 với id không tồn tại, có C, guest, bỏ chặn, `respond blocked` và 409.
- Lệch board: route thật là `PUT /conversations/:id/request`, không phải `POST …/respond`. `GET …/reactions` chỉ trả
  số đếm, không có danh sách người react, nên dòng "Danh sách reaction" của brief không có gì để lọc.
- Nợ, người xác minh là tester integration-lane:
  - chạy `pnpm --filter @dnc/api test`: spec mới + event/post/comment/reaction/rsvp/chat cũ
  - `EXPLAIN` của `GET /events?lat&lng&radiusMeters` (DoD) chưa có. Predicate chặn là `NOT EXISTS` theo từng
    dòng, dự kiến không đổi `idx_events_location`.
- Hệ quả cần PO/BA biết: khi đang chặn, organizer không thấy được bình luận cũ của bên kia trên trang của mình,
  nên cũng không xoá hay ghim được (`findById` bị lọc). Kênh báo cáo vẫn dùng được. Tương tự, `DELETE` reaction cũ
  lên đồ của bên kia trả 404, theo đúng board.

### T-ADM-1 — Sidebar + API client admin (Web Admin)
```md
ID: T-ADM-1
Title: Mục menu theo PERMISSION_MATRIX + hàm gọi API
Owner Agent: web-admin-agent
Allowed files:
  apps/web-admin-side/app/_lib/api.ts (getModerationQueue, getModerationTicket, takeModerationAction,
      dismissTicket, changeTicketSeverity, listAuditLogs)
  apps/web-admin-side/app/_lib/datetime.ts (formatDateTime Asia/Ho_Chi_Minh, formatDuration)
  apps/web-admin-side/app/_lib/server-clock.ts (mới: đồng hồ server đơn điệu theo D15)
  apps/web-admin-side/app/_components/shell/sidebar.tsx
  apps/web-admin-side/app/_components/ui/** (thêm select, textarea, dialog, table nếu cần + index.ts)
Do not edit: packages/**, apps/api/**, apps/web-client-side/**
Dependencies: T-CONTRACT (không chờ backend — gọi theo hợp đồng Zod)
Acceptance slice: AC-21 (UI: curator không có mục), AC-44 (UI: member/curator không có mục), AC-48 (clock)
Test lane: screen + typecheck/lint
Definition of Done: mục "Moderation queue" và "Audit log" chỉ hiện với MODERATION_ROLES; `pnpm --filter @dnc/web-admin typecheck` + lint xanh
```

### T-ADM-2 — Trang hàng đợi (Web Admin)
```md
ID: T-ADM-2
Title: (console)/moderation — danh sách, lọc, đồng hồ SLA
Owner Agent: web-admin-agent
Allowed files:
  apps/web-admin-side/app/(console)/moderation/page.tsx (mới)
  apps/web-admin-side/app/_components/moderation/severity-badge.tsx, sla-countdown.tsx, queue-table.tsx (mới)
Dependencies: T-ADM-1
Acceptance slice: AC-1 (UI), AC-22, AC-23 (màu + nhãn chữ theo `slaState` domain), AC-28, AC-29, AC-47, AC-48
Test lane: screen (en + vi, 3 trạng thái SLA, lỗi API)
Definition of Done:
  - `RequireRole allowedRoles={MODERATION_ROLES}`; tab Đang mở/Đã xử lý; lọc mức; "Tải thêm" theo cursor; poll 60 s
  - Countdown dùng server-clock; lỗi tải → trạng thái lỗi + Thử lại, countdown hiện `admin.moderation.sla.stopped`
  - Mỗi trạng thái SLA có nhãn chữ, không chỉ màu; giờ hiển thị Asia/Ho_Chi_Minh
Risk: tính hạn từ giờ máy — cấm, chỉ từ `slaDueAt` + `serverTime`
```

### T-ADM-3 — Chi tiết ticket + hành động + audit log (Web Admin)
```md
ID: T-ADM-3
Title: (console)/moderation/[ticketId] và (console)/audit-logs
Owner Agent: web-admin-agent
Allowed files:
  apps/web-admin-side/app/(console)/moderation/[ticketId]/page.tsx (mới)
  apps/web-admin-side/app/(console)/audit-logs/page.tsx (mới)
  apps/web-admin-side/app/_components/moderation/snapshot-view.tsx, action-dialog.tsx, ticket-history.tsx (mới)
Dependencies: T-ADM-2
Acceptance slice: AC-25, AC-27, AC-30..AC-38 (UI), AC-41, AC-45, AC-47
Test lane: screen
Definition of Done:
  - Nút hành động chỉ hiện khi hợp lệ theo domain (`canModerateOwner`, `canSuspendRole`, `maxSuspensionDays`,
    `canRestoreEvent`) và trạng thái target; nút submit khoá tới khi note ≥ 20 ký tự trim + có lý do
  - 409 TICKET_ALREADY_CLOSED → thông báo + tải lại; sau hành động đầu, "Thêm hành động khác" gửi `followUp: true`
  - Khôi phục/mở khoá ngay trên dòng lịch sử; actor ẩn danh hiện nhãn role; system → "Hệ thống"
  - Audit: lọc from/to/action/actor/entityType, mới nhất trước, "Tải thêm", không có nút sửa/xoá
Risk: hiển thị ghi chú moderator cho người không phải staff — chỉ console
```

### T-WEB-1 — Sheet báo cáo + nút (Web Client)
```md
ID: T-WEB-1
Title: Report sheet + menu an toàn trên sự kiện, bài đăng, hồ sơ
Owner Agent: web-client-agent
Allowed files:
  apps/web-client-side/app/_lib/api.ts (createReport(body, idempotencyKey), blockUser, unblockUser, listMyBlocks)
  apps/web-client-side/app/_components/ui/dialog.tsx, textarea.tsx (mới) + ui/index.ts
  apps/web-client-side/app/(shell)/_components/safety/report-sheet.tsx, safety-menu.tsx, block-dialog.tsx (mới)
  apps/web-client-side/app/(shell)/_components/community-post.tsx
  apps/web-client-side/app/(shell)/_components/feed-stream.tsx (gỡ bài khỏi feed sau khi chặn tác giả)
  apps/web-client-side/app/(shell)/events/[id]/page.tsx
  apps/web-client-side/app/(shell)/_components/profile-view.tsx, app/(shell)/u/[handle]/page.tsx
Do not edit: packages/**, apps/api/**, apps/web-admin-side/**
Dependencies: T-CONTRACT (không chờ backend)
Acceptance slice: AC-1, AC-2 (event/post/user; comment hoãn D16), AC-3, AC-4, AC-8, AC-9 (UI), AC-12, AC-19, AC-47
Test lane: screen (en + vi, offline, 429)
Definition of Done:
  - Không hiện Report/Chặn trên nội dung/hồ sơ của chính mình (post.authorUserId vs user.id; organizer.handle vs user.handle; isOwner)
  - 12 lý do theo `ReportReason.options`; `danger` → khối `safety.report.emergency_first` ở đầu sheet;
    "Chặn luôn" mặc định theo `ALSO_BLOCK_DEFAULT_REASONS`; mô tả ≤ 2000
  - Idempotency-Key sinh MỘT lần khi mở sheet, giữ qua các lần Thử lại; lỗi giữ nguyên input
  - Chặn organizer: lấy userId qua `publicProfile(organizer.handle)` (EventResponse không có userId — không đổi hợp đồng)
  - Nút Chặn chỉ đổi sang "Đã chặn" sau khi API 204
  - Nhãn `safety.label.eventSuspended/eventTakenDown` trên trang sự kiện cho organizer; `safety.label.contentHidden` khi post.status='hidden'
Risk: key i18n thô — mọi chuỗi qua `t()`
```

**Trạng thái T-WEB-1: `needs_test`** (25/09/2026, web-client-agent). Code xong theo hợp đồng Zod, chưa chạy với API thật.
- Có mới: `ui/dialog.tsx` (bọc `<dialog>` native, chỉ mount con khi mở), `ui/textarea.tsx`, `safety/{report-sheet,block-dialog,safety-menu}.tsx`.
  Thêm hàm `createReport`/`blockUser`/`unblockUser`/`listMyBlocks` vào `api.ts`.
- Menu "⋯" (có `aria-label` và tooltip) được gắn ở 3 chỗ, và không hiện với nội dung của chính mình:
  `community-post.tsx` (post, so `authorUserId` với `user.id`), `events/[id]/page.tsx` (event, so `organizer.handle`),
  `profile-view.tsx` (user, dựa `isOwner`). Khách chưa đăng nhập vẫn thấy menu, bấm vào thì qua `requireAuth`.
- Sheet báo cáo:
  - 12 lý do theo `ReportReason.options`. Chọn `danger` thì khối `emergency_first` (kèm link `tel:113`/`tel:115`) hiện ở đầu sheet.
  - Ô "Chặn luôn" đặt lại theo `ALSO_BLOCK_DEFAULT_REASONS` mỗi lần đổi lý do. Mô tả tối đa 2000 ký tự.
  - Idempotency-Key sinh một lần mỗi lần mở sheet và giữ qua mọi lần Thử lại. Lỗi không xoá input.
  - Lỗi map theo status: 0 → offline + Thử lại; 429 → `errors.report.rateLimited`; 404 → `targetNotFound`; 422 → `selfNotAllowed`;
    401 → `errors.auth.unauthenticated`; 400 → `descriptionTooLong`; còn lại → generic + Thử lại.
- Chặn:
  - Chỉ đổi sang "Đã chặn" và hiện nút Bỏ chặn sau khi API trả 204. Lỗi thì hiện `safety.block.error`, nút xác nhận thành "Thử lại".
  - Với organizer, `userId` lấy qua `publicProfile(handle)` và gọi sẵn ngay khi mở menu. Lý do: sau khi chặn, profile trả 404, nên phải có id từ trước mới bỏ chặn được.
  - Feed gỡ bài của tác giả vừa bị chặn bằng một tập `blockedAuthors`, rồi tải lại list event.
- Nhãn: `safety.label.eventSuspended/eventTakenDown` thay chữ trạng thái trên trang sự kiện. `safety.label.contentHidden` hiện khi `post.status='hidden'`.
- Bằng chứng: `tsc --noEmit --incremental false` (binary native) trong `apps/web-client-side` exit 0, có `--listFiles` chứa các file mới.
  Script kiểm 62 key i18n dùng trong UI: đủ cả en lẫn vi.
- Lệch board:
  - `u/[handle]/page.tsx` không phải sửa, vì menu nằm trong `profile-view.tsx`.
  - `EventCard` trong feed không có menu, vì file ngoài phạm vi card. Lối report cho event nằm ở trang chi tiết.
- Nợ:
  - Chưa có Playwright: app chưa có `e2e/` và chưa cài Playwright.
  - Chưa chạy lint/build/dev server trên máy này.
  - Screen test (en/vi, offline, 429) chờ screen-test-agent khi BE-1/BE-2 đã merge.
  - Bình luận vẫn hoãn theo D16.

### T-WEB-2 — Trang người đã chặn (Web Client)
```md
ID: T-WEB-2
Title: /settings/blocked + lối vào từ hồ sơ của chính mình
Owner Agent: web-client-agent
Allowed files:
  apps/web-client-side/app/(shell)/settings/blocked/page.tsx (mới)
  apps/web-client-side/app/(shell)/_components/profile-view.tsx (link khi isOwner — cùng agent với T-WEB-1, làm nối tiếp)
Dependencies: T-WEB-1
Acceptance slice: AC-12 (danh sách), AC-16 (bỏ chặn), AC-19, AC-20 (UI)
Test lane: screen
Definition of Done: danh sách cursor, rỗng, lỗi + Thử lại, bỏ chặn xoá dòng sau 204; chưa đăng nhập → LoginPrompt
```

**Trạng thái T-WEB-2: `needs_test`** (25/09/2026, web-client-agent).
- Trang `/settings/blocked` có đủ các trạng thái:
  - chưa đăng nhập → EmptyState và nút Đăng nhập, bấm vào mở `LoginPrompt` qua `requireAuth()`;
  - đang tải → skeleton;
  - lỗi → thông báo `auth.error.*` + Thử lại;
  - rỗng → `safety.block.list.empty`.
- Danh sách hiện người bị chặn mới nhất trước, kèm ngày chặn theo `Asia/Ho_Chi_Minh` (`formatEventDate`).
- Trang sau tải tự động khi cuộn tới cuối (IntersectionObserver), nên không cần key "Tải thêm". Web client chưa có key đó, và card cấm sửa `packages/**`.
- Bỏ chặn chỉ xoá dòng sau khi API trả 204. Lỗi thì hiện ngay trên dòng đó, kèm Thử lại.
- Lối vào: `profile-view.tsx` có link "Người đã chặn", chỉ hiện khi `isOwner`.
- Bằng chứng: typecheck exit 0, xem T-WEB-1. Nợ giống T-WEB-1.

---

## 7. Thứ tự, song song, xác minh

```
T-CONTRACT (orchestrator, tuần tự)
   ├─► BE-1: T-API-1 → T-API-2 → T-API-3 → T-API-4      (nối tiếp, một agent)
   ├─► BE-2: T-API-5 → T-API-6                          (song song với BE-1)
   ├─► ADM:  T-ADM-1 → T-ADM-2 → T-ADM-3                (song song, theo hợp đồng Zod)
   └─► WEB:  T-WEB-1 → T-WEB-2                          (song song, theo hợp đồng Zod)
          ▼
Code review (code-review-agent) — đối chiếu danh sách hàm T-API-6, D3/D13
          ▼
Tester lead + lanes: integration (toàn bộ `pnpm --filter @dnc/api test` 2 lần liên tiếp, không flaky),
screen (admin + client, en/vi), regression (auth/event/rsvp/chat) → BA nghiệm thu 48 AC (trừ phần hoãn D16)
```

**Phạm vi ghi rời nhau:** BE-1 = `modules/{report,moderation,audit}/**`, `modules/auth/auth.{service,repository}.ts`,
`app.module.ts`, `e2e/support/harness.ts`, `ops/db/clean-test-data.sh`, `e2e/modules/{report,moderation,audit}/**`.
BE-2 = `common/db/block-filter.ts`, `modules/{profile,event,post,comment,reaction,rsvp,chat}/*` (đúng file ở card),
`e2e/modules/profile/block.e2e.spec.ts`. ADM = `apps/web-admin-side/**`. WEB = `apps/web-client-side/**`.
**File dùng chung nối tiếp:** `packages/**` (chỉ T-CONTRACT); `app.module.ts` (chỉ BE-1).

**Ai xác minh:** T-CONTRACT → orchestrator chạy lệnh DoD + BE-1 xác nhận migration áp được trước khi bắt đầu;
T-API-* → tester integration-lane; T-ADM/T-WEB → screen-test-agent (cần API BE-1/BE-2 đã merge để chạy thật);
tổng → BA.

**Ảnh hưởng EAS:** không (mobile không đổi; export contracts chỉ thêm).
**Dữ liệu cá nhân chạm tới:** mô tả report, snapshot, danh sách chặn, ghi chú moderator, danh tính reporter
(chỉ DTO chi tiết ticket, chỉ MODERATION_ROLES). Cơ sở: an toàn nền tảng (doc 05); thời hạn lưu chờ luật sư (§17 brief).
**Nội dung mới cần đường kiểm duyệt:** không — mô tả report không công khai.

---

## 8. Rủi ro

1. **Sót truy vấn đọc khi lọc chặn** → lộ quan hệ chặn. Giảm: một fragment chung, danh sách hàm cố định ở
   T-API-6, ma trận e2e hai chiều bắt buộc, reviewer đối chiếu.
2. **Access token 15 phút sau khi khoá** (hoãn, D4): người bị khoá vì đe doạ vẫn ghi được trong cửa sổ đó.
   Follow-up: kiểm `users.status` per-request cho route ghi.
3. **Migration áp tay trên DB dev có sẵn** (D1): quên áp → API 500 khi chạm bảng mới. Không có bảng theo dõi →
   chạy lại lỗi nhưng rollback sạch. Staging/prod chưa có pipeline — khi dựng phải thêm bước áp 0009.
4. **Bất biến dựa trên trigger:** owner có thể `ALTER TABLE … DISABLE TRIGGER`; superuser dùng `replica`.
   Production phải chạy app bằng role **không** owner, **không** superuser (ops follow-up, ghi DECISIONS).
5. **Teardown e2e cần superuser** (`session_replication_role`). Local `dnc` là superuser; môi trường test khác
   không có quyền này → cleanup lỗi. Ghi trong docblock harness.
6. **`restore_event` luôn về `published`** — sự kiện từng `cancelled` rồi bị gỡ, khi khôi phục sẽ thành published.
   Moderator phải chọn đúng; follow-up: khôi phục về trạng thái trước (đọc `before` của hành động gỡ).
7. **Snapshot + mô tả chứa PII bên thứ ba**, giữ vĩnh viễn ở v1 (chưa có job xoá). Chờ luật sư (Luật 91/2025).
8. **SLA 2 giờ P0 không có kênh báo on-call** (Q2 brief, phụ thuộc E7) — ngoài phạm vi kỹ thuật task này.
9. Skill `database-migrations` lệch thực tế (TypeORM) — đã ghi ACTIVE_TASKS T-04; agent làm theo D1, không theo skill.

## Câu hỏi kỹ thuật còn mở

Không có câu hỏi chặn. Q1, Q2, Q7, Q8 của brief là quyết định Founder/PO, không ảnh hưởng hợp đồng trên
(nếu Q1 chọn "tự ẩn khi P0" → thêm bước trong T-API-1 sau, không đổi schema).
