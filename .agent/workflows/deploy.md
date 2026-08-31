---
description: /deploy - Checklist tiền triển khai trước khi đẩy lên production
---

# /deploy — Checklist Tiền Triển Khai

Khi nhận lệnh `/deploy`, thực hiện tuần tự:

1. **TypeScript check:**
```bash
pnpm --filter @dnc/api typecheck
pnpm --filter @dnc/web typecheck
pnpm --filter @dnc/mobile typecheck
```
Dừng nếu có lỗi. Fix trước khi tiếp tục.

2. **Grep chất lượng code:**
```bash
# Không còn dấu vết debug
grep -rn "console\.log\|debugger" apps/api/src apps/web/src apps/mobile/src --include="*.ts" --include="*.tsx"

# Không hardcode localhost trong code production
grep -rn "localhost:300" apps/api/src apps/web/src apps/mobile/src --include="*.ts" --include="*.tsx"

# Không lộ secret
grep -rniE "(secret|password|private_key)\s*[:=]\s*['\"][^'\"]{8,}" apps/ packages/ ops/
```

3. **Tiền kiểm schema DB (BẮT BUỘC — mọi môi trường):**
```bash
# Migration nào đã áp trên target
psql "$TARGET_DATABASE_URL" -c "SELECT name FROM migrations ORDER BY timestamp DESC LIMIT 10;"

# Extension bắt buộc phải có trên target
psql "$TARGET_DATABASE_URL" -c "SELECT extname FROM pg_extension;"   # cần postgis, pgcrypto, citext, unaccent, pg_trgm
```
Mọi bảng/cột định nghĩa ở local phải đã tồn tại trên target HOẶC có migration được
đánh số mà lần deploy này sẽ áp. Không dùng `CREATE INDEX CONCURRENTLY` bên trong
file migration. Chi tiết: [skills/database-migrations/SKILL.md](../skills/database-migrations/SKILL.md).

4. **Docker build:**
```bash
docker compose -f ops/compose/docker-compose.local.yml up --build -d
docker compose -f ops/compose/docker-compose.local.yml logs -f api   # theo dõi 20 giây xem lỗi khởi động
```

5. **Smoke test** (browser thật):
   - `http://localhost:3000/en` tải được
   - Đăng nhập chạy (email/password và ít nhất một social provider)
   - Danh sách sự kiện + bộ lọc khu vực trả kết quả
   - Bản đồ hiện marker
   - Tạo một sự kiện nháp → RSVP → huỷ RSVP chạy trọn vòng
   - Console kiểm duyệt mở được hàng đợi report
   - `http://localhost:3001/api/docs` render Swagger

6. **Kiểm tra nhanh i18n** — đổi UI sang tiếng Việt → không còn raw key; đổi lại EN.

7. **Kiểm tra mobile** (nếu bản phát hành có chạm `apps/mobile`) — theo
   [three-phase-verification.md](../rules/three-phase-verification.md) và
   [skills/app-store-deploy/SKILL.md](../skills/app-store-deploy/SKILL.md).

8. **Báo cáo theo format:**
```
🚀 Deploy Check — [PASS/FAIL]
TypeScript:  ✅/❌
DB pre-flight: ✅/❌
Docker:      ✅/❌
Smoke test:  ✅/❌
i18n:        ✅/❌
Ready to deploy: YES/NO
```

> Deploy thật lên staging/production chỉ chạy khi người dùng phê duyệt rõ ràng.
