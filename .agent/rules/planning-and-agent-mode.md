---
description: Cổng lập kế hoạch và quy tắc chọn chế độ single-agent hay multi-agent.
---

# Quy Tắc Lập Kế Hoạch Và Chế Độ Agent

Bộ quy tắc này quyết định cần lập kế hoạch tới mức nào và khi nào tách công việc
thành nhiều role thay vì chạy một agent duy nhất.

> **Bước quét là bắt buộc.** [agent-first.md](agent-first.md) buộc mỗi phiên phải
> quét bộ agent trong `.agent/agents/`, ánh xạ task vào agent sở hữu và tuyên bố
> chế độ đã chọn **trước khi** bắt đầu task. File này chỉ quyết định *chế độ nào*;
> bước quét thì không được bỏ qua kể cả khi kết luận là single-agent.

## Chế độ mặc định

**Mặc định chạy vòng lặp lõi L1 cho mọi task.** Các vòng lặp nặng hơn chỉ thêm vào
khi có ích:

- **L1 Core Loop**: phân loại → nạp context có trọng tâm → tìm code tái sử dụng →
  thực thi → xác minh → báo cáo.
- **L2 Goal Loop**: việc medium/large/breaking phải cập nhật `.agent/specs/_changes/`
  trước khi code.
- **L3 Self-Improvement Loop**: sau task không tầm thường, ghi lại bài học tái dùng
  được vào skill, quyết định, ghi chú task, hoặc spec.
- **L5 Memory Loop**: dùng `.agent/memory/` và `.agent/specs/` theo kiểu lười; không
  nạp toàn bộ memory.
- **L7 Compression Loop**: tóm tắt khi task đi qua nhiều app, đọc nhiều file, hoặc
  context đang căng.
- **L8 Sub-Agent Loop**: dùng role BA/Coordinator/service/Tester khi kích thước,
  rủi ro, hoặc yêu cầu rõ ràng của người dùng đủ để bù chi phí điều phối.

Task nhỏ và cục bộ vẫn chạy single-agent. Agent phải tự quyết định khi nào cần L8,
như một team lead nhận yêu cầu từ chủ sản phẩm. Luồng multi-agent BA-first là bắt
buộc với task large/xuyên ranh giới, thay đổi phá vỡ, rủi ro auth/quyền riêng tư/
deploy, yêu cầu mới mà quy tắc nghiệp vụ còn mù mờ, hoặc khi người dùng yêu cầu rõ.

Khi L8 kích hoạt, trình tự chuẩn:
1. **BA Agent** → Requirement Brief + acceptance criteria kiểm thử được
   (`.agent/agents/product/ba-agent.md`).
2. **Tech Lead Agent** → kiến trúc, task card, phụ thuộc, Definition of Done
   (`.agent/agents/engineering/tech-lead-agent.md`).
3. **Coordinator** → chia quyền sở hữu + phạm vi ghi rời nhau
   (`.agent/agents/orchestration/multi-agent-coordinator.md`).
4. **Service agent** (Backend / Web / Mobile) → soát hợp đồng rồi mới triển khai.
5. **Code Review Agent** → review độc lập (`.agent/agents/quality/code-review-agent.md`).
6. **Tester Agent** → test lead, các lane chuyên biệt, kết luận độ tự tin cuối
   (`.agent/agents/quality/tester-agent.md`).
7. **Service agent** → sửa các phát hiện của review/test trong phạm vi được giao.
8. **BA Agent** → nghiệm thu nghiệp vụ cuối so với Requirement Brief.

Nếu yêu cầu còn mơ hồ, dừng lại và hỏi đúng câu chặn trước khi code.

## Cổng lập kế hoạch

| Loại công việc | Tín hiệu | Cần làm trước khi code | Cổng phê duyệt |
|---|---|---|---|
| Bug fix | Hành vi hỏng, lỗi console/API, regression | Nêu nguyên nhân gốc sau khi đọc code thật, nêu hướng sửa, rồi sửa | Không có cổng, trừ khi bản sửa thành breaking/large |
| Tính năng nhỏ | 1-2 file, một hành vi cục bộ, không đổi hợp đồng chung | Nói ngắn trong chat sẽ đổi gì, rồi làm | Không có cổng |
| Tính năng vừa | 3-8 file, một module/màn hình, tương thích ngược | Viết kế hoạch triển khai cô đọng trong chat | Làm tiếp sau khi nêu kế hoạch, trừ khi bị chặn hoặc dính cổng rủi ro |
| Tính năng lớn | >8 file, xuyên app, đổi hợp đồng DB/API, luồng dùng chung, hoặc đổi kiến trúc | Viết kế hoạch đầy đủ: file, giai đoạn, rủi ro, cách xác minh | Dừng hẳn; chờ người dùng phê duyệt rõ ràng |
| Kế hoạch tương lai | Người dùng nói để sau / tương lai / chưa làm, hoặc chỉ xin roadmap | Viết hoặc cập nhật file trong `.agent/future-plans/` | Không code cho tới khi người dùng duyệt triển khai |

## Cổng rủi ro thắng cổng kích thước

Kể cả khi task trông nhỏ, vẫn phải dừng xin phê duyệt khi có:

- Đổi schema PostgreSQL hoặc migration (kể cả thêm index trên bảng `events` lớn).
- Phá vỡ field hoặc shape response của public API.
- Rủi ro về xác thực, quyền riêng tư/dữ liệu cá nhân, deploy, hoặc dữ liệu production.
- Đổi component/hook dùng chung ở hơn 3 màn, hoặc đổi `packages/shared-types`.
- Đổi công thức trust score, ngưỡng rate limit, hoặc quy tắc kiểm duyệt.
- Xoá rule, workflow, command, hay skill sẵn có trong `.agent/`.
- Bất kỳ thay đổi nào làm đổi hành vi đang chạy tốt của code mà task chạm tới
  (xem [no-regression.md](no-regression.md)) — thiết kế theo hướng bổ sung và tương
  thích ngược; nếu buộc phải phá vỡ thì DỪNG và xin phê duyệt.

## Multi-Agent — L8 Sub-Agent Loop

Luồng BA-first **không** tự động cho mọi task code. Kích hoạt khi task lớn/xuyên
ranh giới/rủi ro, khi review độc lập giảm rủi ro đáng kể, hoặc khi người dùng yêu
cầu multi-agent/subagent/chạy song song. Không hỏi người dùng "có dùng multi-agent
không"; tự quyết định từ kích thước, rủi ro, ranh giới sở hữu và mức mơ hồ. Chỉ hỏi
người dùng khi thiếu dữ kiện nghiệp vụ hoặc cần phê duyệt theo cổng rủi ro.

Khi L8 hoạt động, nạp:
- [`.agent/agents/product/ba-agent.md`](../agents/product/ba-agent.md)
- [`.agent/agents/engineering/tech-lead-agent.md`](../agents/engineering/tech-lead-agent.md)
- [`.agent/agents/orchestration/multi-agent-coordinator.md`](../agents/orchestration/multi-agent-coordinator.md)
- [`.agent/agents/quality/code-review-agent.md`](../agents/quality/code-review-agent.md)
- [`.agent/agents/quality/tester-agent.md`](../agents/quality/tester-agent.md)
- [`.agent/workflows/multi-agent-task.md`](../workflows/multi-agent-task.md)
- [`.agent/rules/ownership.md`](ownership.md)
- File role khớp với app bị ảnh hưởng.

Coordinator phải giao việc như một công ty nhỏ:

- BA sở hữu khung nghiệp vụ và acceptance criteria.
- Tech Lead sở hữu kiến trúc, task card, phụ thuộc và DoD.
- Coordinator sở hữu việc chia nhỏ, xếp thứ tự và tích hợp.
- Web Client sở hữu `apps/web-client-side/**` (bề mặt người dùng cuối).
- Web Admin sở hữu `apps/web-admin-side/**` (console curate và kiểm duyệt).
- Mobile sở hữu `apps/mobile/**`.
- Backend sở hữu `apps/api/**`, và chỉ vào cuộc khi hợp đồng API/dữ liệu thay đổi.
- Đổi `packages/**` phải có Tech Lead chốt vì chạm cả bốn app.
- Tester sở hữu việc xác minh nghiệm thu/regression và báo cáo phát hiện.
- Với việc medium/large/rủi ro, Tester trở thành Test Lead và chia kiểm thử thành
  Unit Test, Integration Test, Screen Test và Regression Test trước khi đưa ra kết
  luận độ tự tin cuối.

## Nơi lưu kế hoạch tương lai

Kế hoạch để triển khai sau nằm ở `.agent/future-plans/`.

Đặt tên theo mẫu:

```text
<FEATURE_NAME>_PLAN.md
```

File kế hoạch tương lai nên có:

- Mục tiêu.
- Phạm vi.
- Các giai đoạn đề xuất.
- File/module nhiều khả năng bị ảnh hưởng.
- Rủi ro.
- Cách xác minh khi triển khai.

## Lớp spec — nguồn sự thật duy nhất

Lớp spec bền vững nằm ở `.agent/specs/`. Nó lưu lại Requirement Brief đã được BA
chốt cho từng năng lực, để các phiên và người khác dùng chung một trí nhớ — đây là
lớp *bộ nhớ của máy/đội*. Tài liệu phân tích sản phẩm gốc nằm ở `docs/analysis/`;
spec không mâu thuẫn với chúng mà chi tiết hoá phần sắp làm.

Quy tắc phạm vi (bổ sung, bật theo kích thước):

- **Bug / task nhỏ: miễn** — không cần file spec.
- **Medium / large / breaking / xuyên app: cập nhật spec trước**, rồi mới code.
  Viết hoặc cập nhật `_changes/<change-name>.md` từ `_TEMPLATE.md` trước khi sửa;
  sau khi ship, gộp vào `<capability>.md`, lưu trữ change đó và cập nhật
  `capability-map.md`.

Template spec phản chiếu hợp đồng đầu ra của BA Agent (Feature / BR / UC / Entity /
FR / NFR / AC). Spec là nguồn sự thật; code hiện thực hoá spec.

## Teach-Back — cổng học sau task (opt-in + chủ động)

Sau một task, cổng "hiểu bài" có thể bật từ ba nguồn (xem
[`.agent/skills/teach-back/SKILL.md`](../skills/teach-back/SKILL.md)):

1. Người dùng gõ `/teach`.
2. Người dùng xin được giải thích bằng ngôn ngữ tự nhiên (không cần lệnh).
3. **Claude tự phát hiện rủi ro hiểu sai** và chủ động bắt đầu — mở nhẹ trước, chỉ
   đi sâu nếu người dùng tham gia.

- Đây **KHÔNG** phải cổng "Done". Done vẫn là typecheck pass + xác minh
  web/mobile/API. Teach-Back không bao giờ chặn việc ship.
- **Không tự bật** với việc nhỏ/tầm thường/máy móc. Với trigger 3, dùng tín hiệu
  rủi ro hiểu sai trong skill (quyết định thiết kế không hiển nhiên, edge case tinh
  vi hoặc race condition, ảnh hưởng xuyên service/realtime, auth/quyền riêng tư,
  nguyên nhân gốc phức tạp, refactor lớn, đánh đổi không hiển nhiên).
- Nó dựng checklist từ hiện vật sẵn có (BA brief, phần Root Cause của báo cáo,
  diff) — đây là lớp *bộ nhớ của con người*.
