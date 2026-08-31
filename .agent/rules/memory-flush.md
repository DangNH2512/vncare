---
description: Trigger tự lưu — không bao giờ mất tiến độ giữa phiên.
---

# Memory Flush — Trigger Tự Lưu

> Các trigger này bật tự động. Khi bất kỳ điều kiện nào bên dưới xảy ra, lưu tiến
> độ ngay.

---

## Điều kiện tự flush

| Trigger | Hành động |
|---|---|
| Độ phức tạp task tăng lên mức 🔴 cao | Lưu kế hoạch vào `.agent/memory/session-context.md` trước khi làm tiếp |
| Phạm vi phình thêm ≥ 2 file mới | Cập nhật `.agent/memory/ACTIVE_TASKS.md` + báo người dùng |
| Có lỗi chặn tiến độ | Ghi blocker vào `session-context.md`, không âm thầm thử lại mãi |
| Quan sát thật (web/simulator) lộ hành vi ngoài dự kiến | Dừng, ghi lại phát hiện, lập lại kế hoạch |
| 10+ lần gọi tool mà chưa có checkpoint | Tóm tắt tiến độ vào `session-context.md` |
| Task kéo qua cuối phiên | Chạy checklist `.agent/skills/session-end/SKILL.md` |

---

## Lưu cái gì

Khi flush, ghi vào `.agent/memory/session-context.md`:

```markdown
## Mid-Session Checkpoint — HH:MM

**Current task:** [đang làm gì]
**Progress so far:** [file đã sửa, cái gì đã chạy]
**Blocked on:** [cái gì đang chặn]
**Next step:** [chính xác bước kế tiếp]
**Files open:** [danh sách file liên quan, đường dẫn tương đối từ gốc repo]
```

---

## Vì sao cần

Không có memory flush:
- Phiên dài mất tiến độ khi context window đầy
- Gián đoạn (người dùng đóng chat, lỗi mạng) làm mất trạng thái công việc
- Phiên sau bắt đầu mà không biết phiên trước dừng ở đâu

Có memory flush:
- Phiên nào cũng nối tiếp được từ `.agent/memory/session-context.md`
- `active-tasks.json` cho thấy mọi task đang dở qua các phiên
- Không phải hỏi lại "hôm trước mình đang làm gì?"
