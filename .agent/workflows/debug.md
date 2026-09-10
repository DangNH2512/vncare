---
description: /debug - Bắt đầu quy trình debug hệ thống cho mọi bug được báo
---

# /debug — Systematic Debugging

Khi nhận lệnh `/debug`, thực hiện theo đúng thứ tự:

// turbo
1. Đọc skill file:
```
.agent/skills/systematic-debugging/SKILL.md
```

2. **Phase 1 — RECALL:** Hỏi người dùng (nếu chưa rõ): "Bạn đang làm gì? Chuyện gì
   xảy ra? Kỳ vọng là gì?" Kèm: bề mặt nào (web / mobile / API), locale nào, tài
   khoản ở role và tier nào.

3. **Phase 2 — LOCATE:** Truy vết chuỗi gọi trong code thật (đọc từng bước — không
   dùng trí nhớ)
   - Đọc component/màn hình bị ảnh hưởng (`apps/web-client-side/src/...`,
     `apps/web-admin-side/src/...` hoặc `apps/mobile/...`)
   - Đọc controller → service → repository trong `apps/api/src/modules/...`
   - Nếu là bug realtime: đọc luôn socket gateway và query key đang được invalidate

4. **Phase 3 — ROOT CAUSE:** Tìm nguyên nhân gốc (không chỉ triệu chứng). Triangulate
   UI ↔ API ↔ DB theo [observe-reality.md](../rules/observe-reality.md) §C trước khi
   kết luận.

5. **Phase 4 — FIX:** Sửa tối thiểu, đúng chỗ, kèm comment tiếng Anh giải thích.
   Tuân thủ [no-regression.md](../rules/no-regression.md) nếu chạm code đang chạy.

6. **Phase 5 — VERIFY:** Chạy checklist xác minh:
   - `pnpm --filter @dnc/api typecheck` → 0 errors (và app tương ứng nếu có chạm)
   - Quan sát thật: tái hiện bug cũ → xác nhận nó đã hết
   - Kiểm tra chéo bề mặt nếu file dùng chung bị đổi (web **và** mobile)

7. **Output Report** bắt buộc có trường **Root Cause**.
