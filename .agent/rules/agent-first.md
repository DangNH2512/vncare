---
trigger: always_on
description: Bắt buộc quét bộ agent trong .agent/agents/ ở đầu mỗi phiên, ánh xạ task vào agent sở hữu và tuyên bố chế độ trước khi bắt đầu task.
---

# Agent-First — Quét Bộ Agent Trước, Bắt Đầu Task Sau

Bộ agent trong `.agent/agents/` (symlink `.claude/agents/`) là sơ đồ phòng phát
triển của dự án: ai sở hữu bề mặt nào, ai chốt hợp đồng, ai kiểm thử. Nhảy thẳng
vào code mà không quét sơ đồ này nghĩa là một agent tự làm việc của cả đội — sai
ranh giới sở hữu, bỏ qua review/test lane đã được thiết kế sẵn.
[planning-and-agent-mode.md](planning-and-agent-mode.md) quyết định *chạy chế độ
nào* (single-agent hay L8 multi-agent); rule này bắt buộc **bước quét và tuyên bố
phải xảy ra**, ngay từ đầu phiên, trước khi task đầu tiên bắt đầu.

## A1 — Bắt buộc ở đầu mỗi phiên

Trước khi bắt đầu task đầu tiên của phiên (và luôn trước tool call đầu tiên có
tính thay đổi — `Edit` / `Write` / `Bash` ghi file):

1. **Quét bộ agent.** Không nhớ chắc roster có gì thì `ls .agent/agents/` hoặc
   đọc [`.agent/agents/README.md`](../agents/README.md) — rẻ hơn nhiều so với
   làm sai vai. Quét đầy đủ một lần mỗi phiên là đủ.
2. **Ánh xạ task vào agent sở hữu** theo bảng §A2 và
   [ownership.md](ownership.md), dựa trên hợp đồng yêu cầu đã rút ra ở
   [behaviors.md](behaviors.md) §B0 (mục tiêu, bề mặt đích, rủi ro).
3. **Chốt chế độ** theo [planning-and-agent-mode.md](planning-and-agent-mode.md):
   single-agent L1 hay multi-agent L8 BA-first.
4. **Tuyên bố ra ngoài** cho người dùng trước khi chạm file: chế độ đã chọn và
   các agent/vai trò áp dụng, một dòng mỗi agent. Chạy single-agent cũng phải
   nêu một dòng lý do (task nhỏ/cục bộ, một bề mặt, không đổi hợp đồng chung).
5. Im lặng bỏ qua bước quét là vi phạm — cùng tinh thần với
   [skill-first.md](skill-first.md) §S1. Hai bước quét (skill + agent) đi cùng
   nhau ở đầu task.

Các task tiếp theo trong cùng phiên không cần quét lại toàn bộ roster — chỉ cần
ánh xạ lại (bước 2–4) khi bề mặt đích hoặc mức rủi ro thay đổi.

## A2 — Bảng ánh xạ nhanh

| Bề mặt / tình huống | Agent sở hữu |
|---|---|
| `apps/api/**` | [`engineering/backend-agent.md`](../agents/engineering/backend-agent.md) |
| `apps/web-client-side/**` | [`engineering/web-client-agent.md`](../agents/engineering/web-client-agent.md) |
| `apps/web-admin-side/**` | [`engineering/web-admin-agent.md`](../agents/engineering/web-admin-agent.md) |
| `apps/mobile/**` | [`engineering/mobile-agent.md`](../agents/engineering/mobile-agent.md) |
| `packages/**` (chạm cả bốn app) | [`engineering/tech-lead-agent.md`](../agents/engineering/tech-lead-agent.md) chốt |
| Yêu cầu mơ hồ, quy tắc nghiệp vụ mới | [`product/ba-agent.md`](../agents/product/ba-agent.md) |
| Kiến trúc, cắt task, hợp đồng API/dữ liệu | [`engineering/tech-lead-agent.md`](../agents/engineering/tech-lead-agent.md) |
| Điều phối nhiều role, task board | [`orchestration/multi-agent-coordinator.md`](../agents/orchestration/multi-agent-coordinator.md) |
| Review độc lập trước merge | [`quality/code-review-agent.md`](../agents/quality/code-review-agent.md) |
| Kiểm thử, nghiệm thu, regression | [`quality/tester-agent.md`](../agents/quality/tester-agent.md) + các lane unit/integration/screen/regression |
| Sức khoẻ hệ thống, log, Sentry, queue | [`operations/ops-monitor-agent.md`](../agents/operations/ops-monitor-agent.md) |

## A3 — Quét không đồng nghĩa với kích hoạt

- Quét là bắt buộc; **kích hoạt L8 thì không**. Task nhỏ/cục bộ vẫn chạy
  single-agent sau khi đã quét và tuyên bố — đúng mặc định tiết kiệm token của
  [planning-and-agent-mode.md](planning-and-agent-mode.md).
- Quét xong mà thấy task khớp điều kiện L8 (large/xuyên ranh giới/breaking/rủi
  ro auth-privacy-deploy, hoặc người dùng yêu cầu rõ) thì đi theo trình tự
  BA-first chuẩn, không tự rút gọn.
- Không hỏi người dùng "có dùng multi-agent không" — tự quyết từ kết quả quét,
  chỉ dừng hỏi khi dính cổng rủi ro hoặc thiếu dữ kiện nghiệp vụ.

## Checklist

- [ ] Đầu phiên đã quét roster `.agent/agents/` (hoặc đọc `README.md` của nó)
- [ ] Task đã được ánh xạ vào agent sở hữu theo §A2 + `ownership.md`
- [ ] Chế độ single/multi-agent đã chốt theo `planning-and-agent-mode.md`
- [ ] Đã tuyên bố chế độ + danh sách agent áp dụng cho người dùng trước khi chạm file
- [ ] Bề mặt/rủi ro đổi giữa phiên → đã ánh xạ lại
