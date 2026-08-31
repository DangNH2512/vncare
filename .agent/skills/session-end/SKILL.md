---
name: session-end
description: Checklist kết phiên tự động — chạy vào cuối mỗi phiên làm việc để lưu tiến độ và tránh mất ngữ cảnh.
---

# Kết phiên — Checklist gói ghém

> Chạy trước khi kết thúc bất kỳ phiên làm việc nào. Mất chưa tới 3 phút.
> Giúp không mất ngữ cảnh giữa các phiên và bàn giao sạch sẽ.

---

## Checklist gói ghém

### 1. Trạng thái công việc
```
□ Mọi task đang làm dở đã được cập nhật trong DAILY_TASKS.md
  - Đã xong → status: done
  - Chưa xong → status: in progress (kèm ghi chú còn lại những gì)
  - Đã huỷ → status: cancel
```

### 2. Trạng thái mã nguồn
```
□ npm run typecheck --workspaces → 0 lỗi trên apps/api, apps/web,
  apps/mobile, packages/shared-types
□ Không còn code debug tạm (console.log, debugger, comment TODO)
□ Không còn dữ liệu test hay ID giả trong code chạy thật
□ Không lỡ tay commit secret nào (.env, *.p8, keystore, service-account JSON)
□ Chuỗi hiển thị mới phải có trong CẢ en.json và vi.json (EN là ngôn ngữ giao
  diện mặc định) — không được có key chỉ tồn tại ở một file
□ Migration DB mới có thể revert được và đã chạy một lần trên database local
  sạch (docker compose up postgres → migration:run) — extension PostGIS vẫn nạp được
□ Đã dọn ảnh chụp màn hình làm bằng chứng — nếu thay đổi đã commit/push thì xoá
  _evidence/ và các file tạm /tmp/*.png (xem skills/screenshot-evidence §5);
  gỡ mọi route *-preview tạm còn nằm trên đĩa
```

### 3. Đồng bộ tài liệu
```
□ Có REST endpoint mới → cập nhật docs/analysis/04-tech-stack-va-kien-truc.md
□ Có module/entity/migration mới → cập nhật docs/analysis/04-tech-stack-va-kien-truc.md
□ Có DTO/enum dùng chung mới → export ở packages/shared-types và ghi tài liệu
□ Có hook/component mới (apps/web hoặc apps/mobile) → cập nhật docs/analysis/10-ux-luong-man-hinh-va-i18n.md
□ Có lệnh/fixture E2E mới → cập nhật .agent/rules/test-file-placement.md
□ Có trường dữ liệu cá nhân mới được thu thập → cập nhật docs/analysis/06-phap-ly-va-tuan-thu-viet-nam.md (Nghị
  định 13/2023/ND-CP: mục đích, cơ sở pháp lý, thời hạn lưu trữ)
```

### 4. Ảnh chụp ngữ cảnh (cho phiên sau)
Cập nhật `.agent/memory/session-context.md` với:
```
- Đang làm gì
- Trạng thái hiện tại (xong / xong một phần / bị chặn)
- Các quyết định đã đưa ra và lý do
- Các file đã sửa trong phiên này
- Phiên TIẾP THEO nên bắt đầu từ đâu
```

### 5. active-tasks.json (nếu task kéo dài qua nhiều phiên)
Cập nhật `.agent/memory/ACTIVE_TASKS.md`:
```json
{
  "lastUpdated": "YYYY-MM-DD HH:MM",
  "activeTasks": [
    {
      "id": "task-1",
      "title": "Task description",
      "status": "in_progress",
      "filesModified": ["apps/api/src/events/events.service.ts", "apps/web/src/app/events/page.tsx"],
      "nextStep": "What to do when resuming"
    }
  ]
}
```

---

## Mẫu tóm tắt phiên nhanh

Ở cuối phiên, đăng bản tóm tắt theo mẫu này:

```
Tóm tắt phiên — YYYY-MM-DD

Đã hoàn thành:
- [Tên task 1] — đã làm được gì

Đang làm dở:
- [Tên task 2] — đã xong phần nào / còn lại phần nào

Phiên sau nên:
- Bắt đầu bằng [hành động cụ thể]
- Kiểm tra [file hoặc hành vi cụ thể]
- Lưu ý [trường hợp biên hoặc rủi ro]
```
