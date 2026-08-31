---
description: Workflow thực thi multi-agent cho Da Nang Connect.
---

# Multi-Agent Task Workflow

Workflow này là lớp phủ lên các rule trong `.agent/rules/`. Nó không thay thế
pipeline bắt buộc của dự án. Không vào workflow này theo mặc định: trước hết áp
`.agent/rules/planning-and-agent-mode.md` và xác nhận chế độ multi-agent đáng với
chi phí token và điều phối.

Định nghĩa subagent nằm ở `.agent/agents/`, gom theo phòng ban. Bắt đầu từ
[`.agent/agents/README.md`](../agents/README.md). Dùng các file đó khi môi trường
hỗ trợ subagent gốc. Nếu không có subagent gốc, chạy tuần tự đúng các role đó trong
cuộc hội thoại chính.

## Luồng chuẩn BA-first

```text
User
  -> BA Agent: Requirement Brief + acceptance criteria
  -> Debate Gate khi phạm vi nghiệp vụ còn tranh cãi
  -> Tech Lead Agent: kiến trúc + task card + DoD
  -> Debate Gate khi hợp đồng kiến trúc/API/UI còn tranh cãi
  -> Coordinator: chia quyền sở hữu + phân công
  -> Backend / Web / Mobile Agent: soát hợp đồng + phương án theo SOLID
  -> Backend / Web / Mobile Agent: triển khai
  -> Code Review Agent: soát tính đúng + khả năng bảo trì
  -> Debate Gate khi phát hiện review còn tranh cãi
  -> Tester Agent: test lead chia nhỏ việc kiểm thử
      -> Unit Test Agent: coverage đơn vị có trọng tâm
      -> Integration Test Agent: hợp đồng API/DB/service/realtime
      -> Screen Test Agent: luồng browser/app và trạng thái hiển thị
      -> Regression Test Agent: rủi ro với các luồng lân cận
  -> Service agent sở hữu: sửa bug/tối ưu
  -> Debate Gate khi còn cãi nhau "đây là bug hay đúng thiết kế"
  -> BA Agent: nghiệm thu nghiệp vụ cuối
  -> Coordinator: báo cáo tích hợp
```

BA và Tester là cổng trung tâm, không phải người bình luận tuỳ chọn:

- BA phải định nghĩa acceptance criteria kiểm thử được trước khi service agent code.
- Tech Lead phải chia yêu cầu thành task card nhỏ có owner, file được phép sửa,
  phụ thuộc, lát cắt nghiệm thu, lane kiểm thử và DoD.
- Coordinator phải phân công như một phòng ban thật: mỗi task một owner, file dùng
  chung sửa tuần tự, và điểm bàn giao rõ ràng.
- Backend, Web và Mobile phải thống nhất hợp đồng API/dữ liệu/UI trước khi sửa khi
  task vượt ranh giới app.
- Code Review phải soát trước khâu xác minh cuối với việc medium/large/rủi ro.
- Tester phải kiểm theo acceptance criteria của BA. Với việc medium/large/rủi ro,
  Tester đóng vai Test Lead và chia kiểm thử cho các chuyên gia UT, integration,
  screen/browser và regression trước khi trả bug hoặc đề xuất tối ưu về service agent.
- BA nghiệm thu lần cuối sau khi Tester pass.
- Debate Gate dùng cho bất đồng chưa ngã ngũ; nó phải kết thúc bằng người quyết,
  quyết định cuối, và các task card tiếp theo.

## Phase 0 — Bảo toàn

1. Đọc `.agent/rules/behaviors.md`.
2. Đọc `.agent/rules/planning-and-agent-mode.md`.
3. Cập nhật `.agent/memory/ACTIVE_TASKS.md`.
4. Nếu sửa `.agent/`, không tạo file backup trừ khi người dùng yêu cầu. Xoá tài liệu
   sẵn có vẫn cần người dùng phê duyệt rõ ràng.
5. Xác nhận task thuộc loại bổ sung, refactor, hay phá vỡ.
6. Xác nhận vì sao chế độ single-agent không đủ cho task này.

## Phase 1 — BA khám phá

BA Agent viết Requirement Brief gồm:

- Mục tiêu nghiệp vụ.
- Người dùng và vai trò (`member` | `curator` | `moderator` | `admin`) cùng tier tin
  cậy tối thiểu nếu có.
- Trong phạm vi và ngoài phạm vi.
- Acceptance criteria dạng Given/When/Then kiểm thử được khi khả thi.
- App bị ảnh hưởng (`apps/api`, `apps/web`, `apps/mobile`, `packages/*`).
- Kỳ vọng về hợp đồng API/dữ liệu.
- Ảnh hưởng Trust & Safety: hàng đợi kiểm duyệt, rate limit, tín hiệu no-show.
- Ảnh hưởng quyền riêng tư theo Nghị định 13/2023/NĐ-CP.
- Edge case và câu hỏi còn mở.

Nếu BA không thể viết acceptance criteria mà không đoán hành vi nghiệp vụ, dừng lại
và hỏi người dùng đúng câu đang chặn.

## Phase 2 — Chia nhỏ

Orchestrator viết một kế hoạch ngắn gồm:

- Ranh giới task.
- Lý do dùng chế độ multi-agent.
- Các role cần thiết.
- Task card.
- File từng role được sửa.
- File từng role không được sửa.
- Phụ thuộc giữa các role.
- Ai sở hữu khâu xác minh.
- Tham chiếu tới acceptance criteria của BA.

Kế hoạch phải hành xử như một task board, không phải bài văn.
Mỗi task card có ID và trạng thái, và mọi lần bàn giao đều tham chiếu ID đó.

## Phase 2.5 — Tech Lead chia việc kỹ thuật

Tech Lead biến BA brief thành task card:

```md
## Task Card
ID:
Title:
Owner Agent:
Goal:
Scope:
Allowed files:
Do not edit:
Inputs:
Dependencies:
Acceptance slice:
Test lane:
Definition of Done:
Risk:
```

Coordinator sau đó gom task card thành:

- **Đường tuần tự**: các task dùng chung file/hợp đồng hoặc phụ thuộc output trước đó.
- **Đường song song an toàn**: các task có phạm vi ghi rời nhau.
- **Đường xác minh**: lane UT, integration/API, screen/browser, regression.

Không bắt đầu triển khai cho tới khi task card và quyền sở hữu file đã rõ.

## Phase 2.6 — Task board

Coordinator duy trì bảng giao hàng ngay trong chat, hoặc ở
`.agent/memory/ACTIVE_TASKS.md` khi việc kéo qua nhiều phiên:

```md
| ID | Task | Owner | Status | Depends on | Test lane |
|----|------|-------|--------|------------|-----------|
```

Trạng thái hợp lệ: `todo`, `in_progress`, `needs_review`, `needs_test`, `blocked`,
`done`.

Mỗi lần đổi trạng thái phải có bằng chứng: bàn giao, diff, phát hiện review, kết quả
test, hoặc nghiệm thu của BA.

## Phase 3 — Phân công

Dùng format phân công sau:

```md
Task ID:
Role:
Goal:
Context scope:        # Chỉ được đọc trong các path/file này
  - <path hoặc file>
Read first:           # File cụ thể phải mở trước khi đi tìm rộng
  - <file>
Allowed write scope:
  - <file hoặc thư mục>
Do not edit:
  - <file hoặc thư mục>
Expected output:      # Theo đúng Worker Output Contract trong ownership.md
```

Phân công phải nhỏ đủ để mỗi role hoàn thành mà không phải đụng vào file của role
khác. `Context scope` là ranh giới cứng — worker không đọc file ngoài phạm vi đó trừ
khi orchestrator đồng ý.

### Giới hạn số role

| Kích thước task | Số role tối đa | Cách chia khuyến nghị |
|---|---|---|
| Medium | 7 | BA + Tech Lead + Coordinator + 1 worker + Code Review + Tester Lead + 1-2 chuyên gia test |
| Large | 10 | BA + Tech Lead + Coordinator + 1-2 service worker + Code Review + Tester Lead + 2-4 chuyên gia test |
| XL (xuyên app) | 12 | BA + Tech Lead + Coordinator + Backend + Web + Mobile + Code Review + Tester Lead + đội test |

Không bao giờ chạy quá 4 worker triển khai cùng lúc. Chuyên gia test có thể chạy
song song sau khi triển khai xong, chỉ khi phạm vi đọc của họ đủ rời nhau để không
làm trùng việc. Worker chỉ được chạy song song khi tập `Allowed write scope` hoàn
toàn rời nhau.

## Phase 4 — Soát hợp đồng và SOLID

Trước khi triển khai với task xuyên service:

- Backend nêu endpoint, DTO, validation, auth/tier, ghi audit log, và ảnh hưởng dữ liệu.
- Web/Mobile nêu màn hình, phụ thuộc API, state/loading/error, i18n, realtime, và
  hành vi theo quyền.
- Service agent kiểm tra rõ độ khớp SOLID:
  - SRP: không có class/component/hook gánh nhiều trách nhiệm lẫn lộn.
  - OCP: đường mở rộng không đòi viết lại logic đang ổn định.
  - LSP: hợp đồng dùng chung vẫn thay thế được cho nhau.
  - ISP: không phình interface/prop/hook contract.
  - DIP: phụ thuộc đi qua provider được inject, API client, hook, hoặc repository —
    không phải lời gọi cứng rải rác.

Nếu còn bất đồng về hợp đồng hoặc SOLID, chạy Debate Gate trước khi code.

## Phase 4.5 — Debate Gate

Dùng cổng này khi các agent bất đồng, hoặc khi hai phương án khả thi có đánh đổi
đáng kể:

```md
## Debate Gate
Decision needed:
Context:
Options:
- Option A:
  Owner:
  Claim:
  Evidence:
  Trade-off:
  Risk:
  Recommendation:
- Option B:
  Owner:
  Claim:
  Evidence:
  Trade-off:
  Risk:
  Recommendation:
Decision owner:
Final decision:
Reason:
Follow-up task cards:
```

Chỉ leo lên người dùng với dữ kiện nghiệp vụ, phê duyệt phạm vi/rủi ro, quyết định
production/deploy, đánh đổi pháp lý/chi phí, hoặc thay đổi phá huỷ dữ liệu. Còn lại,
đúng role sở hữu quyết định và Coordinator ghi lại.

### Round Table (cho tính năng xuyên service phức tạp)

Khi hợp đồng API/dữ liệu/UI không tầm thường hoặc có khả năng xung đột, trigger skill
`round-table` (`.agent/skills/round-table/SKILL.md`):

```
Tín hiệu cần round-table:
- Shape response API lồng nhau hoặc có phân trang cursor
- Hơn 2 bề mặt cùng tiêu thụ một endpoint (web + mobile + console kiểm duyệt)
- Tổ hợp guard chưa rõ (JWT + role + tier tin cậy?)
- Sự kiện realtime cần đồng bộ giữa các bề mặt
- Một agent có giả định mâu thuẫn với agent khác
```

Round table tạo ra một tài liệu **Contract Agreement** được:
1. Nhúng vào phần Dev Notes của từng story.
2. Dùng làm nguồn sự thật cho mọi agent trong lúc triển khai.
3. Tester Agent tham chiếu khi kiểm acceptance criteria.

Nếu round table trả `blocked`, Coordinator leo câu hỏi lên người dùng trước khi bắt
đầu triển khai.

## Phase 5 — Thực thi

- Worker chỉ sửa trong phạm vi được giao.
- Worker làm từng task card một.
- Debugger và reviewer chỉ đọc trừ khi được giao lại.
- Verifier chỉ đọc, trừ file bằng chứng tạm đã được orchestrator duyệt.
- Nếu phạm vi phình ra, dừng lại và cập nhật kế hoạch.
- Nếu hai role cần cùng một file, orchestrator xếp cho làm tuần tự.

## Phase 5.5 — Code Review

Với việc medium/large/rủi ro, Code Review kiểm:

- Độ phủ acceptance criteria của BA.
- Task card của Tech Lead đã xong chưa.
- Ranh giới sở hữu giữa các app.
- SOLID và độ phức tạp phát sinh không cần thiết.
- Rủi ro nhạy cảm bảo mật và quyền riêng tư.
- Mức đầy đủ của test trước khi Tester Lead xác minh cuối.

Code Review trả phát hiện về service agent sở hữu trước Phase 6.

## Phase 6 — Tester xác minh

Tester Lead trước hết lập kế hoạch chia nhỏ việc kiểm thử. Với việc medium/large/rủi
ro, chia thành các lane chuyên biệt:

- **Unit Test Agent**: function, hook, utility, service, validation DTO/Zod, logic
  component cô lập vừa thay đổi.
- **Integration Test Agent**: hợp đồng REST, side effect DB/repository, truy vấn
  PostGIS, auth và guard theo role/tier, `moderation_audit_log`, ranh giới
  realtime/BullMQ job.
- **Screen Test Agent**: luồng browser và app thật, trạng thái loading/error/empty/
  success, i18n EN↔VI, tooltip, layout responsive, spec Playwright hoặc Test ID thủ
  công cho mobile.
- **Regression Test Agent**: nơi tiêu thụ component dùng chung, và các luồng lân cận:
  tạo sự kiện, RSVP và hàng chờ, tìm kiếm/lọc theo khu vực, thông báo đẩy, hàng đợi
  kiểm duyệt, hồ sơ và điểm tin cậy.

Tester Lead xác minh:

- Acceptance criteria của BA.
- Hợp đồng request/response của API.
- Luồng UI, loading, lỗi, quyền, và hành vi realtime ở chỗ liên quan.
- Lệnh typecheck/build/test cho app bị ảnh hưởng khi khả thi.
- Ảnh hưởng regression lên các luồng sự kiện, RSVP, thông báo, kiểm duyệt và hồ sơ.
- Kết quả của các lane được hợp nhất thành một kết luận duy nhất kèm mức tự tin:
  cao, trung bình, hay thấp.

Tester trả bug hoặc đề xuất tối ưu về service agent sở hữu theo mẫu báo lỗi trong
`.agent/agents/quality/tester-agent.md`.

## Phase 7 — Tích hợp

Orchestrator soát diff và gộp các output thành một trạng thái mạch lạc.

Kiểm tra khi tích hợp:

- Không revert nhầm thay đổi của người dùng.
- Không tạo ra trừu tượng trùng lặp.
- Tài liệu trong `.agent/` vẫn còn đúng.
- Bàn giao và quyết định được ghi lại khi có ích.

## Phase 8 — BA kiểm cuối và báo cáo

BA đối chiếu kết quả cuối với Requirement Brief ban đầu. Báo cáo cuối gồm:

- Đã đổi gì.
- Nguyên nhân gốc với các bug.
- File đã đổi (đường dẫn tương đối từ gốc repo).
- Việc xác minh đã thực sự chạy.
- Check nào bị bỏ và vì sao.
- File trong `.agent/` đã đổi, nếu có.
- Kết quả nghiệm thu nghiệp vụ của BA.
