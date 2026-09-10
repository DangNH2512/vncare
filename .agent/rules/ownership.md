---
description: Quy tắc sở hữu file và bàn giao giữa các agent trong monorepo Da Nang Connect.
---

# Quy Tắc Sở Hữu — Multi-Agent

Bộ quy tắc này ngăn các agent ghi đè lên nhau và phá vỡ quy ước sẵn có của
Da Nang Connect (nền tảng kết nối cộng đồng expat tại Đà Nẵng).

## Mô hình vận hành "phòng ban dev"

Mọi yêu cầu medium/large/mới tinh được xử lý như công việc chạy qua một công ty
phần mềm nhỏ. Chủ sản phẩm là người dùng; agent lo phần vận hành giao hàng.

```text
Business Intake
  -> BA: requirement brief + acceptance criteria
  -> Tech Lead: kiến trúc + task card nhỏ + DoD
  -> Coordinator: task board, chủ sở hữu, thứ tự, điểm bàn giao
  -> Engineering: Backend (apps/api) / Web Client (apps/web-client-side)
                  / Web Admin (apps/web-admin-side) / Mobile (apps/mobile)
  -> Code Review: đúng/sai, ranh giới module, khả năng bảo trì, lỗ hổng test
  -> QA: Tester Lead + các lane UT / IT / Screen / Regression
  -> Engineering: sửa lỗi
  -> BA: nghiệm thu nghiệp vụ lần cuối
  -> Coordinator: báo cáo tích hợp
```

### Nguyên tắc làm việc

- Agent tự quyết định yêu cầu có cần chạy full luồng phòng ban hay không.
- Chỉ hỏi người dùng khi thiếu dữ kiện nghiệp vụ, cần phê duyệt cổng rủi ro, hoặc
  cần quyết định liên quan production.
- Không bắt đầu code trước khi rõ: BA brief, task card, người sở hữu, danh sách
  file được sửa, phụ thuộc, và DoD.
- Mỗi task triển khai có đúng một người chịu trách nhiệm.
- File dùng chung phải sửa tuần tự; chỉ chạy song song khi phạm vi ghi rời nhau.
- Review và QA là cổng chặn, không phải bình luận cho vui.
- Bất đồng đi qua Debate Gate; tranh luận chưa ngã ngũ phải chốt được người quyết
  và quyết định cuối trước khi code tiếp.

### Trạng thái task

Dùng đúng các trạng thái này trong task card, handoff và báo cáo:

```text
todo -> in_progress -> needs_review -> needs_test -> blocked -> done
```

`blocked` phải ghi rõ đầu vào còn thiếu. `done` cần DoD của task card cộng bằng
chứng từ lane kiểm thử tương ứng.

## Quy tắc không thương lượng

1. `.agent/rules/behaviors.md` là hợp đồng luôn bật; `.agent/rules/skill-triggers.md`
   là router quyết định nạp thêm tài liệu nào.
2. Single-agent là mặc định; multi-agent chỉ chạy khi có trigger trong
   [planning-and-agent-mode.md](planning-and-agent-mode.md).
3. Một role chỉ được sửa file mà orchestrator giao.
4. Role review và verification mặc định chỉ đọc.
5. Không role nào được revert thay đổi của người dùng nằm ngoài phạm vi task.
6. Không role nào được xoá tài liệu trong `.agent/` nếu người dùng chưa đồng ý rõ ràng.
7. Task chạm cả backend lẫn frontend phải chia quyền sở hữu file trước khi sửa.
8. File dùng chung sửa tuần tự, không sửa song song.
9. Mọi role phải báo cáo file đã đổi và check nào bị bỏ qua.

## Bảng sở hữu

| Khu vực | Role chính | Ghi chú |
|---|---|---|
| Yêu cầu nghiệp vụ, acceptance criteria | BA | Mặc định chỉ đọc; sở hữu khâu nghiệm thu nghiệp vụ |
| Kiến trúc, chia task, DoD | Tech Lead | Mặc định chỉ đọc; sở hữu task card và thứ tự thực thi |
| `apps/api/**` | Backend | NestJS module, repository, migration TypeORM, truy vấn PostGIS, guard, Swagger, BullMQ job, socket gateway |
| `apps/web-client-side/**` | Web Client | Web cho người dùng cuối. Next.js 16 App Router (`(public)` / `(app)`), Tailwind, MapLibre, SEO/SSR, deep link `.well-known`, BFF route handler |
| `apps/web-admin-side/**` | Web Admin | Console vận hành. Next.js 16 App Router, Tailwind, bảng biểu + thao tác hàng loạt, `robots: noindex`, ưu tiên desktop |
| `apps/mobile/**` | Mobile | Expo Router, react-native-maps, Expo Push, `app.config.ts`, `eas.json` |
| `packages/shared-types/**` | Backend đề xuất, Tech Lead duyệt | Enum và kiểu miền dùng chung — đổi là breaking cho cả bốn app |
| `packages/api-client/**` | Sinh tự động | Sinh lại từ OpenAPI của `apps/api`; **không sửa tay** |
| `packages/i18n/**` | Role tạo key + reviewer | `en.json` và `vi.json` luôn đổi trong cùng một thay đổi |
| `packages/ui/**`, `packages/validation/**`, `packages/config/**` | Web Client (chủ trì) + consumer (`apps/web-admin-side`, `apps/mobile`) | Sửa là chạm nhiều app: bắt buộc cross-surface check |
| `ops/**`, `.github/workflows/**` | Backend/DevOps | Compose, nginx, script deploy, migration production, CI |
| `docs/analysis/**` | BA + Tech Lead | Tài liệu phân tích là nguồn sự thật nghiệp vụ; code theo tài liệu |
| `.agent/**` | Orchestrator | Ưu tiên sửa bổ sung; không tạo file backup trừ khi người dùng yêu cầu |
| `.agent/workflows/**` | Orchestrator | Có thể tham vấn reviewer |
| Bằng chứng test | Tester | Tạm thời, xoá sau khi báo cáo trừ khi được yêu cầu giữ |
| Nhận xét review | Reviewer | Chỉ đọc trừ khi được giao lại |

## Định dạng bàn giao

```md
## <YYYY-MM-DD HH:mm> - <from-role> to <to-role>

Task ID:
Task:
Files read:
Files changed:
Findings:
Blockers:
Next action:
Status:
```

## Hợp đồng đầu ra của worker

Mọi worker phải trả về đúng cấu trúc sau để orchestrator tích hợp mà không phải
đọc lại văn xuôi tự do:

```md
## Agent Output
Status: done | blocked | needs-review
Files changed: <danh sách, đường dẫn tương đối từ gốc repo>
Files read: <danh sách, đường dẫn tương đối — phục vụ audit chi phí>
Key decisions: <gạch đầu dòng, mỗi ý một dòng>
Risks: <gạch đầu dòng — để trống nếu không có>
Test evidence: <lệnh → exit code / kết quả quan sát được>
```

BA, Reviewer và Tester dùng chung cấu trúc này với `Status: needs-review` hoặc
`Status: blocked` khi phù hợp. Tester phải đặt quan sát thật (lệnh / browser /
API / simulator) vào `Test evidence`.

## Hợp đồng task card

Mỗi worker triển khai nhận một task card:

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

Worker không được mở rộng ngoài `Allowed files` nếu Coordinator chưa duyệt.

## RACI của phòng ban

| Hoạt động | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Phạm vi nghiệp vụ | BA | User/BA | Tech Lead, Coordinator | Các service agent |
| Kiến trúc / chia task | Tech Lead | Coordinator | Backend/Web/Mobile | BA |
| Sở hữu file / thứ tự | Coordinator | Coordinator | Tech Lead, service agent | BA, QA |
| Triển khai | Service agent | Chủ sở hữu service | Tech Lead | Coordinator |
| Code review | Code Review | Coordinator | Service agent, Tech Lead | BA, QA |
| Kiểm thử | Tester Lead + chuyên gia lane | Tester Lead | Service agent | Coordinator, BA |
| Nghiệm thu cuối | BA | BA | Tester Lead, Coordinator | User |

## Debate Gate

Dùng tranh luận có cấu trúc cho việc mới/lớn/rủi ro/xuyên ranh giới, hoặc khi các
agent bất đồng về phạm vi nghiệp vụ, kiến trúc, hợp đồng API, cách triển khai,
phát hiện review, hay kết quả test.

Debate không phải thảo luận mở. Nó phải kết thúc bằng một quyết định.

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
Decision owner: BA | Tech Lead | Coordinator | Service Owner | Tester Lead | User
Final decision:
Reason:
Follow-up task cards:
```

### Ai quyết định cái gì

| Loại quyết định | Người quyết |
|---|---|
| Ý đồ nghiệp vụ, phạm vi, luồng người dùng, acceptance criteria | BA, chỉ leo lên User khi thiếu dữ kiện nghiệp vụ |
| Kiến trúc, chia task, mức trừu tượng, thứ tự kỹ thuật | Tech Lead |
| Sở hữu file, chạy song song hay tuần tự, thứ tự bàn giao | Coordinator |
| Chi tiết triển khai hợp đồng API/dữ liệu | Backend + service tiêu thụ; Tech Lead phá thế hoà |
| Hành vi UI, trạng thái loading/error/empty, ergonomics màn admin | Web/Mobile + BA; Tech Lead phá thế hoà về kỹ thuật |
| Mức nghiêm trọng của finding review và mức bắt buộc sửa trước test | Code Review + Coordinator |
| Diễn giải kết quả test và mức tự tin phát hành | Tester Lead |
| Deploy production, thay đổi phá huỷ dữ liệu, chi phí, pháp lý, đánh đổi ảnh hưởng người dùng cuối | User |

Coordinator ghi quyết định cuối vào task board hoặc handoff. Quyết định kiến trúc
hoặc sản phẩm có tính lâu dài ghi vào `.agent/memory/DECISIONS.md`.

## Hợp đồng cổng BA

BA phải tạo tài liệu này trước khi bắt đầu triển khai task multi-agent:

```md
## Requirement Brief
Goal:
Users/Roles:            # member | curator | moderator | admin
In scope:
Out of scope:
Acceptance criteria:
- Given/When/Then ...
Affected services:
- apps/api:
- apps/web-client-side:
- apps/web-admin-side:
- apps/mobile:
- packages/*:
API/data contract notes:
Trust & Safety impact:  # tier tối thiểu, rate limit, hàng đợi kiểm duyệt
Privacy impact:         # dữ liệu cá nhân chạm tới, ai được nhìn thấy gì
Open questions:
```

## Hợp đồng báo lỗi của Tester

Tester trả lỗi về cho service agent sở hữu theo mẫu:

```md
## Bug / Optimization
Severity: P0 | P1 | P2 | P3
Owner: Backend | Web | Mobile | BA
Area:
Steps to reproduce:
Expected:
Actual:
Evidence:
Suggested direction:
```

## Xử lý xung đột

Khi hai role cần cùng một file:

1. Dừng mọi công việc song song trên file đó.
2. Orchestrator chọn đúng một người sở hữu.
3. Các role khác chỉ được gửi ghi chú.
4. Orchestrator tích hợp hoặc giao một task sửa tiếp theo.

## Chính sách thay đổi `.agent/` an toàn

Khi sửa `.agent/`:

- Không cần backup trong lúc làm task — git history là lưới an toàn.
- Ưu tiên thêm file mới hơn viết lại file cũ.
- Thêm liên kết chéo thay vì di chuyển các section sẵn có.
- Giữ nguyên tên command và tên workflow.
- Xoá hoặc viết lại rule/workflow/command/skill sẵn có vẫn cần người dùng đồng ý
  rõ ràng (quy tắc 6 ở trên).
