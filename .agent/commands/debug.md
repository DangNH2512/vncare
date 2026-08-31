---
description: /debug — Bắt đầu quy trình debug hệ thống cho mọi bug được báo
---

# /debug — Systematic Debugging

> Kích hoạt quy trình debug 5 pha trong `.agent/skills/systematic-debugging/SKILL.md`.
> Trình tự thực thi đầy đủ: [workflows/debug.md](../workflows/debug.md).

## Các bước

1. Nạp [systematic-debugging/SKILL.md](../skills/systematic-debugging/SKILL.md)
2. **Phase 1 — RECALL:** Hỏi người dùng: đang làm gì? chuyện gì xảy ra? kỳ vọng là
   gì? Trên bề mặt nào (web / mobile / API), locale nào, tài khoản role và tier nào?
3. **Phase 2 — LOCATE:** Truy vết chuỗi gọi trong code thật (đọc file, không dựa vào
   trí nhớ): màn hình → `@dnc/api-client` → controller → service → repository.
4. **Phase 3 — ROOT CAUSE:** Xác định TẠI SAO nó xảy ra, không chỉ là CÁI GÌ xảy ra.
   Triangulate UI ↔ API ↔ DB theo [observe-reality.md](../rules/observe-reality.md) §C.
5. **Phase 4 — FIX:** Sửa tối thiểu, đúng chỗ, có comment tiếng Anh giải thích; tuân
   thủ [no-regression.md](../rules/no-regression.md).
6. **Phase 5 — VERIFY:** Chạy
   [verification-before-completion/SKILL.md](../skills/verification-before-completion/SKILL.md)

## Đầu ra

Báo cáo theo Output Contract, bắt buộc có trường Root Cause.
