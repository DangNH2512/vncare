---
name: sprint-planning
description: Plan a sprint — scope work, estimate capacity, set goals, and draft a sprint plan. Use when kicking off a new sprint, sizing a backlog against team availability (accounting for PTO and meetings), deciding what's P0 vs. stretch, or handling carryover from the last sprint.
---

# /sprint-planning

> Placeholders như **~~knowledge base**, **~~chat**, **~~project tracker** = connector/MCP tương ứng nếu được kết nối (Notion, Slack, Linear...). Nếu không có, bỏ qua bước đó.

Plan a sprint by scoping work, estimating capacity, and setting clear goals.

## Project Integration — Da Nang Connect

- **Nơi lưu task:** `.agent/memory/ACTIVE_TASKS.md` (mục §Planning + bảng §Task có
  ghi ngày) và `ACTIVE_TASKS.md` / `active-tasks.json`. Sprint plan = mục có ngày
  kế tiếp; việc tồn đọng = quét các mục trước đó tìm dòng chưa `done`.
- **Phạm vi sprint bị khoá theo giai đoạn 1:** sự kiện & RSVP, tìm kiếm/lọc theo
  khu vực (My Khe, An Thuong, My An, Hai Chau, Son Tra, Ngu Hanh Son), hồ sơ cá
  nhân có trust level, kiểm duyệt UGC. Việc thuộc **giai đoạn 2 (nhà ở)** hay
  **giai đoạn 3 (y tế / dịch vụ chuyên môn)** không được kéo vào sprint hiện tại —
  đẩy sang `.agent/future-plans/`.
- **Năng lực thực tế:** đội nhỏ / một người sáng lập — lập kế hoạch theo số giờ
  thật sự có, không theo velocity lý tưởng. Trừ hao cho việc vận hành (deploy,
  submit App Store/Play Store) vì nó cạnh tranh trực tiếp với giờ làm tính năng.
- **Chi phí ẩn hay bị quên khi ước lượng — cộng vào ngay từ đầu:**
  - Một tính năng chạm cả 3 bề mặt (`apps/api` + `apps/web` + `apps/mobile`) tốn
    khoảng gấp đôi ước lượng ban đầu; tách DTO dùng chung vào
    `packages/shared-types` trước để tránh lệch hợp đồng.
  - Truy vấn địa lý cần migration PostGIS + index GIST + dữ liệu seed cho từng
    khu vực; không ước lượng như một câu `WHERE` thường.
  - Mọi chuỗi hiển thị cần đồng thời `en.json` và `vi.json` (EN là mặc định).
  - Mọi tính năng UGC kéo theo phần kiểm duyệt: report, ẩn tạm, hàng đợi duyệt.
  - Push qua Expo cần cả job nền (BullMQ) lẫn kiểm thử trên thiết bị thật.
- **Definition of Done (không thương lượng):** `tsc` pass + luồng thật đã xác nhận
  (trình duyệt cho web, thiết bị/simulator cho mobile) + test E2E cho luồng UI mới
  + khoá i18n `en`/`vi` đồng bộ. Ước lượng task phải bao gồm phần chi phí này.
- **Chọn P0:** bất kỳ việc nào đang chặn một kế hoạch go-live trong
  `.agent/future-plans/` xếp trên tính năng mới. Kế đó là việc chặn nguồn cung sự
  kiện (tạo sự kiện, RSVP) — không có sự kiện thì mọi tính năng khác vô nghĩa.

## Usage

```
/sprint-planning 
```

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPRINT PLANNING                                 │
├─────────────────────────────────────────────────────────────────┤
│  STANDALONE (always works)                                       │
│  ✓ Define sprint goals and success criteria                     │
│  ✓ Estimate team capacity (accounting for PTO, meetings)        │
│  ✓ Scope and prioritize backlog items                           │
│  ✓ Identify dependencies and risks                              │
│  ✓ Generate sprint plan document                                │
├─────────────────────────────────────────────────────────────────┤
│  SUPERCHARGED (when you connect your tools)                      │
│  + Project tracker: Pull backlog, create sprint, assign items   │
│  + Calendar: Account for PTO and meetings in capacity           │
│  + Chat: Share sprint plan with the team                        │
└─────────────────────────────────────────────────────────────────┘
```

## What I Need From You

- **Team**: Who's on the team and their availability this sprint?
- **Sprint length**: How many days/weeks?
- **Backlog**: What's prioritized? (Pull from tracker, paste, or describe)
- **Carryover**: Anything unfinished from last sprint?
- **Dependencies**: Anything blocked on other teams?

## Output

```markdown
## Sprint Plan: [Sprint Name]
**Dates:** [Start] — [End] | **Team:** [X] engineers
**Sprint Goal:** [One clear sentence about what success looks like]

### Capacity
| Person | Available Days | Allocation | Notes |
|--------|---------------|------------|-------|
| [Name] | [X] of [Y] | [X] points/hours | [PTO, on-call, etc.] |
| **Total** | **[X]** | **[X] points** | |

### Sprint Backlog
| Priority | Item | Estimate | Owner | Dependencies |
|----------|------|----------|-------|--------------|
| P0 | [Must ship] | [X] pts | [Person] | [None / Blocked by X] |
| P1 | [Should ship] | [X] pts | [Person] | [None] |
| P2 | [Stretch] | [X] pts | [Person] | [None] |

### Planned Capacity: [X] points | Sprint Load: [X] points ([X]% of capacity)

### Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [What happens] | [What to do] |

### Definition of Done
- [ ] Code reviewed and merged
- [ ] Tests passing
- [ ] Documentation updated (if applicable)
- [ ] Product sign-off

### Key Dates
| Date | Event |
|------|-------|
| [Date] | Sprint start |
| [Date] | Mid-sprint check-in |
| [Date] | Sprint end / Demo |
| [Date] | Retro |
```

## Tips

1. **Leave buffer** — Plan to 70-80% capacity. You will get interrupts.
2. **One clear sprint goal** — If you can't state it in one sentence, the sprint is unfocused.
3. **Identify stretch items** — Know what to cut if things take longer than expected.
4. **Carry over honestly** — If something didn't ship, understand why before re-committing.
