---
description: /review - Tự động soát code sau mỗi lần thực thi task
---

# /review — Auto Code Review

> Chạy tự động sau mỗi task hoàn thành (bước VERIFY trong pipeline).
> Cũng có thể trigger thủ công bằng `/review`.

// turbo-all

1. **TypeScript:**
```bash
pnpm --filter @dnc/api typecheck
pnpm --filter @dnc/web typecheck
pnpm --filter @dnc/mobile typecheck   # chỉ khi có chạm apps/mobile
```

2. **Kiểm tra kiến trúc:**
```bash
# Service không được chạm DataSource trực tiếp — mọi truy cập dữ liệu qua repository
grep -rn "dataSource\.\|DataSource" apps/api/src/modules --include="*.service.ts"
# Kỳ vọng: 0 kết quả

# Web/mobile không fetch thẳng lên API — phải đi qua @dnc/api-client
grep -rn "fetch(\`\?https\?://\|axios\.create" apps/web/src apps/mobile/src --include="*.ts" --include="*.tsx"
# Kỳ vọng: 0 kết quả (trừ chính lớp client và route handler BFF)

# Module nền tảng không được import ngược module miền
grep -rn "modules/\(event\|rsvp\|search\|chat\|report\)" apps/api/src/modules/auth apps/api/src/modules/user apps/api/src/modules/profile
# Kỳ vọng: 0 kết quả
```

3. **Kiểm tra chất lượng code:**
```bash
# Không để tiếng Việt lọt vào source (file locale nằm ở packages/i18n nên không bị quét)
grep -rn "[àáảãạăắằẳẵặâấầẩẫậ]" apps/api/src apps/web/src apps/mobile/src --include="*.ts" --include="*.tsx"
# Kỳ vọng: 0 kết quả

# Không còn dấu vết debug
grep -rn "console\.log\|debugger\|TODO\|FIXME" apps/api/src apps/web/src apps/mobile/src --include="*.ts" --include="*.tsx"
```

4. **Kiểm tra kích thước file** (đánh dấu nếu > 500 dòng):
```bash
find apps/web/src apps/mobile/src -name "*.tsx" | xargs wc -l | sort -rn | head -5
find apps/api/src -name "*.ts" | xargs wc -l | sort -rn | head -5
```

5. **Kiểm tra i18n:**
```bash
# Số key lá của en.json phải bằng vi.json
node -e "const f=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v?f(v,p+k+'.'):[p+k]); \
const en=f(require('./packages/i18n/en.json')), vi=f(require('./packages/i18n/vi.json')); \
console.log('EN:',en.length,'| VI:',vi.length,'| thiếu ở VI:',en.filter(k=>!vi.includes(k)).join(', ')||'none', \
'| thừa ở VI:',vi.filter(k=>!en.includes(k)).join(', ')||'none');"
```

6. **Kiểm tra audit log kiểm duyệt** — quét các service vừa sửa:
```bash
# Service có hành động cưỡng chế phải ghi moderation_audit_log
grep -rl "suspend\|unpublish\|hide\|warn\|restore" apps/api/src/modules --include="*.service.ts" \
  | xargs grep -L "moderationAuditLog\|moderation_audit_log"
# Kỳ vọng: rỗng (mọi service cưỡng chế đều ghi log)
```

7. **Báo cáo kết quả:**
```
📋 Auto Review — [Tên task]

TypeScript:      ✅ 0 errors / ❌ N errors
Repository rule: ✅ service không chạm DataSource / ❌ [file]
API client rule: ✅ không fetch thẳng / ❌ [file]
Debug code:      ✅ sạch / ❌ [file]
File sizes:      ✅ ổn / ⚠️ [file] N dòng (>500)
i18n sync:       ✅ EN=VI / ❌ thiếu key [danh sách]
Moderation log:  ✅ đủ / ❌ [service] thiếu

Overall: ✅ PASS — được phép báo done / ❌ FAIL — sửa trước khi báo done
```
