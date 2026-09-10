---
description: /deploy — Checklist tiền triển khai trước khi đẩy lên production
---

# /deploy — Checklist Tiền Triển Khai

> Chạy hết checklist này trước mọi lần deploy production.
> Trình tự lệnh đầy đủ: [workflows/deploy.md](../workflows/deploy.md).

## Chất lượng code
```
□ pnpm --filter @dnc/api typecheck    → 0 errors
□ pnpm --filter @dnc/web-client typecheck → 0 errors
□ pnpm --filter @dnc/web-admin typecheck  → 0 errors
□ pnpm --filter @dnc/mobile typecheck → 0 errors
□ Không còn console.log / debugger trong code
□ Không hardcode URL localhost trong code production
□ Mọi biến môi trường production đã được set (đối chiếu .env.example)
```

## Chức năng
```
□ Docker build thành công: docker compose -f ops/compose/docker-compose.local.yml up --build
□ API health: curl http://localhost:3001/api/docs → render Swagger
□ Web tải được: http://localhost:3000/en
□ Đăng nhập chạy (email/password + ít nhất một social provider)
□ Danh sách sự kiện + lọc theo khu vực trả đúng kết quả
□ Bản đồ hiện marker và popup
□ Luồng lõi: tạo sự kiện → RSVP → hết chỗ vào waitlist → huỷ → thăng hạng waitlist
□ Console kiểm duyệt mở được hàng đợi report
□ Push notification gửi được tới ít nhất một thiết bị test
```

## i18n & UX
```
□ Đổi ngôn ngữ sang tiếng Việt → không còn raw key nào lộ ra; đổi ngược lại EN
□ Mọi nút chỉ có icon đều có tooltip
□ Layout mobile render đúng (thu browser về 375px)
□ Giờ sự kiện hiển thị đúng theo Asia/Ho_Chi_Minh
```

## E2E (nếu còn thời gian)
```bash
pnpm --filter @dnc/web-client exec playwright test
pnpm --filter @dnc/web-admin exec playwright test
pnpm --filter @dnc/api test
```

## Tiền kiểm schema DB (BẮT BUỘC — mọi môi trường)
> Trước khi deploy lên staging HOẶC prod, đối chiếu schema của server đích với local
> để lần deploy không chết vì thiếu bảng. Quy trình đầy đủ:
> [skills/database-migrations](../skills/database-migrations/SKILL.md) §Deploy Pre-Flight.
```
□ Liệt kê migration đã áp trên target: SELECT name FROM migrations ORDER BY timestamp DESC
□ Extension đã bật đủ trên target: postgis, pgcrypto, citext, unaccent, pg_trgm
□ Diff bảng target vs local — mọi bảng định nghĩa ở local đều tồn tại trên target
  HOẶC có migration mà lần deploy này sẽ áp
□ File migration mới/sửa là idempotent (CREATE TABLE / ADD COLUMN IF NOT EXISTS)
□ Không có CREATE INDEX CONCURRENTLY bên trong file migration
□ prod: chạy script trong ops/scripts/ ở chế độ dry-run → soát → mới áp (sau khi được duyệt)
□ Xác nhận bảng/cột mới đã có trên target TRƯỚC khi deploy code
```

## Mobile (nếu bản phát hành chạm apps/mobile)
```
□ Đã qua ba pha của rules/three-phase-verification.md
□ eas.json và app.config.ts đúng cho profile phát hành
□ Quy trình theo skills/app-store-deploy/SKILL.md
```

> Deploy thật lên staging/production chỉ chạy sau khi người dùng phê duyệt rõ ràng.
