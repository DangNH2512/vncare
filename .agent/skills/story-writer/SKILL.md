---
name: story-writer
description: >
  Break a BA Requirement Brief for Da Nang Connect into structured Story files
  with full context, acceptance criteria, task checklists, and dev notes.
  Updates sprint-status.yaml. Inspired by BMAD's `bmad-create-epics-and-stories`
  + `bmad-create-story` (bmad-code-org/bmad-method).
triggers:
  - "story-writer"
  - "tạo story"
  - "create story"
  - "viết story"
  - "break into stories"
  - "tạo epic và story"
  - medium/large feature after BA brief is approved
---

# Story Writer Skill

## Mục đích

Biến một BA Requirement Brief thành một hoặc nhiều **Story file** chi tiết mà dev
(và agent chuyên trách từng app) thực thi độc lập được — đã nạp sẵn đầy đủ ngữ
cảnh, acceptance criteria, checklist công việc và dev note.

Việc này chống mất ngữ cảnh giữa các session và cho phép triển khai song song khi
phạm vi các app không giẫm chân nhau (`apps/api` · `apps/web-client-side` ·
`apps/web-admin-side` · `apps/mobile` · `packages/shared-types`).

## Khi nào kích hoạt

- Sau khi skill `business-analyst` cho ra Requirement Brief của một feature **vừa hoặc lớn**.
- Khi feature trải qua nhiều app (Backend + Web + Mobile + kiểu dùng chung).
- Khi việc triển khai dự kiến kéo dài hơn một session.
- User nói "tạo story", "create story", "story-writer".

**Bỏ qua skill này khi:**
- Sửa bug (dùng thẳng `systematic-debugging`).
- Feature nhỏ (1-2 file, một hành vi) — BA brief → implement luôn.

---

## Các bước thực thi

### Bước 1 — Đọc đầu vào

Đọc mọi thứ tồn tại trong danh sách sau:

```
.agent/memory/ACTIVE_TASKS.md                 # Ngữ cảnh công việc hiện tại
BA Requirement Brief                         # Từ hội thoại hiện tại hoặc file spec
.agent/specs/<capability>.md                 # Nếu đã có spec cho feature này
docs/analysis/01-tac-nhan-va-phan-quyen.md   # Actor, role, trust level
docs/analysis/03-domain-va-du-lieu.md        # Entity, quan hệ, ràng buộc DB
docs/analysis/04-tech-stack-va-kien-truc.md  # Cấu trúc module, quy ước API & test
```

### Bước 2 — Cắt thành Epic

Gom các acceptance criteria liên quan thành Epic theo **giá trị người dùng** hoặc
theo **lớp hệ thống**:

```
Epic 1: [Năng lực hướng người dùng]     — vd "Event Discovery & RSVP"
Epic 2: [Năng lực hướng organizer]      — vd "Organizer Event Management"
Epic 3: [Năng lực nền/hạ tầng]          — vd "Reminder Notifications (Expo Push + BullMQ)"
```

Quy tắc:
- Mỗi Epic = một kết quả người dùng mạch lạc, hoặc một lớp hệ thống.
- 1 feature thường có 1-3 Epic (nếu chỉ có một, bỏ tầng Epic, đi thẳng vào Story).
- Mỗi Epic chứa 1-5 Story.
- Mỗi Story = một lát cắt ship được độc lập của Epic đó.

### Bước 3 — Viết Story file

Với mỗi Story, tạo file tại:

```
.agent/stories/<epic-number>-<story-number>-<slug>.md
```

Ví dụ: `.agent/stories/1-1-event-list-area-filter.md`

Dùng [Story Template](../../templates/story-template.md) cho mọi story file.

Điền các mục sau:
- **Story header** — ID, epic, feature, status, ngày tạo, app sở hữu.
- **Business Context** — vì sao story này tồn tại (lấy từ BA Brief), phục vụ actor nào (member · organizer · curator · moderator · admin).
- **Acceptance Criteria** — Given/When/Then từ BA Brief (thu hẹp về đúng story này).
- **Tasks / Subtasks** — checklist triển khai cụ thể theo từng app.
- **Dev Notes** — ngữ cảnh kiến trúc, hợp đồng API, pattern TypeScript, ghi chú DB/migration.
- **File List** — dự đoán các file sẽ tạo/sửa.

**Dev Notes phải trả lời được các câu sau nếu story chạm tới:**

| Chủ đề | Phải ghi rõ |
|---|---|
| API | Endpoint dưới `/api/v1`, DTO vào/ra, status code lỗi + `code` enum, có cần `Idempotency-Key` không |
| Module NestJS | `apps/api/src/modules/<name>/` gồm controller · service · repository · module + `dto/` |
| DB | Entity/migration đụng gì; có cần PostGIS (`geography`, index GIST) không; **DỪNG xin phê duyệt trước khi chạy migration** |
| Trust & quyền | Role nào, `trust_level` tối thiểu nào, kiểm quyền sở hữu ở đâu |
| Đồng thời | Sức chứa/đếm có tranh chấp không → lock, đếm nguyên tử, waitlist |
| i18n | Key mới cần ở cả `en.json` và `vi.json` |
| Thời gian | Lưu UTC (`timestamptz`), hiển thị `Asia/Ho_Chi_Minh`, biên bộ lọc theo giờ Đà Nẵng |
| Realtime & job | socket.io event nào, BullMQ job nào, Expo Push gửi cho ai/lúc nào/locale nào |
| Audit | Hành động của moderator/admin ghi `audit_log` bất biến |
| Test | `apps/api/e2e/**` (phản chiếu `src/**`) · `apps/web-client-side/e2e/*.spec.ts` (Playwright, luồng người dùng cuối) · `apps/web-admin-side/e2e/*.spec.ts` (Playwright, luồng vận hành) · `apps/mobile/__tests__/` + Maestro. **Không để file test cạnh mã nguồn.** |

### Bước 4 — Sinh Sprint Status

Tạo hoặc cập nhật `.agent/memory/sprint-status.yaml`:

```yaml
# Sprint: <tên feature>
# Created: <ngày>
# BA Brief: <tham chiếu>

stories:
  - id: "1-1-event-list-area-filter"
    title: "Event List — lọc theo khu vực & thời gian"
    epic: "Event Discovery & RSVP"
    owner: "Web"                # Backend | Web | Mobile | Shared
    status: "ready-for-dev"     # draft | ready-for-dev | in-progress | done | blocked
    file: ".agent/stories/1-1-event-list-area-filter.md"
    ac_count: 6
    depends_on: ["1-2-events-search-api"]

  - id: "1-2-events-search-api"
    title: "Events Search API — GET /api/v1/events (area + bán kính + thời gian)"
    epic: "Event Discovery & RSVP"
    owner: "Backend"
    status: "ready-for-dev"
    file: ".agent/stories/1-2-events-search-api.md"
    ac_count: 7
    depends_on: []

  - id: "1-3-rsvp-api-capacity-waitlist"
    title: "RSVP API — sức chứa, waitlist, idempotency"
    epic: "Event Discovery & RSVP"
    owner: "Backend"
    status: "ready-for-dev"
    file: ".agent/stories/1-3-rsvp-api-capacity-waitlist.md"
    ac_count: 8
    depends_on: ["1-2-events-search-api"]
```

### Bước 5 — Tóm tắt output

```md
## Story Writer Output

Feature: <tên feature>
Tham chiếu BA Brief: <ngày hoặc file spec>

### Story đã tạo:

| ID | Tiêu đề | Owner | Status | File |
|----|---------|-------|--------|------|
| 1-1 | Event List — lọc theo khu vực | Web | ready-for-dev | .agent/stories/1-1-*.md |
| 1-2 | Events Search API | Backend | ready-for-dev | .agent/stories/1-2-*.md |
| 1-3 | RSVP API — sức chứa & waitlist | Backend | ready-for-dev | .agent/stories/1-3-*.md |

Sprint status: .agent/memory/sprint-status.yaml ✅

### Bước tiếp theo:
1. Rà lại story file — kiểm tra AC và Dev Notes đã đủ chưa.
2. Chỉnh `depends_on` nếu story B cần API của story A tồn tại trước.
3. Gọi skill `round-table` nếu hợp đồng giữa các app cần cả nhóm thống nhất.
4. Giao từng story cho agent sở hữu app tương ứng để triển khai.
5. Gọi skill `project-help` bất cứ lúc nào để xem tiến độ hiện tại.
```

---

## Quy tắc kích thước Story

| Kích thước | Dấu hiệu | Quy tắc |
|---|---|---|
| Nhỏ | 1-2 task, 1 app, <3 AC | Bắt đầu ngay được |
| Vừa | 3-6 task, 1-2 app, 3-8 AC | Đọc kỹ dev note trước khi bắt đầu |
| Lớn | >6 task, xuyên nhiều app, >8 AC | DỪNG — cắt nhỏ tiếp |

Nếu một story rơi vào mức Lớn, cắt nhỏ trước khi lưu.

**Ranh giới cắt story tốt cho dự án này:** cắt theo *lớp* (API trước, client sau)
hoặc theo *lát cắt dọc mỏng* (một trục lọc, một trạng thái RSVP). Không cắt theo
kiểu "backend làm hết rồi frontend làm hết" cho một feature lớn — parity web/mobile
sẽ trôi.

---

## Nguồn

Phỏng theo BMAD Method `bmad-create-epics-and-stories` + `bmad-create-story` +
`bmad-dev-story` (https://github.com/bmad-code-org/bmad-method — MIT License).
Tuỳ biến cho Da Nang Connect:
- Stack NestJS 11 / Next.js 16 (cả `apps/web-client-side` lẫn `apps/web-admin-side`) /
  Expo 54, monorepo `apps/*` + `packages/*`.
- Luồng tuần tự BA-first (không dùng TOML).
- Quy ước dự án: module NestJS 4 file + `dto/`, OpenAPI/Swagger, repository pattern,
  `audit_log` cho hành động vận hành, i18n `en.json`/`vi.json`, test không nằm cạnh mã nguồn.
- Lưu ở `.agent/stories/` (không dùng `_bmad/implementation-artifacts/`).
