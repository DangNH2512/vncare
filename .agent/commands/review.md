---
description: /review — Soát code trước khi merge hoặc bàn giao
---

# /review — Checklist Code Review

> Chạy trước khi merge nhánh tính năng hoặc bàn giao code cho người khác.
> Trình tự lệnh đầy đủ: [workflows/review.md](../workflows/review.md).

## Kiến trúc và tuân thủ pattern
```
□ Repository pattern: service không chạm DataSource trực tiếp
□ Module đúng 4 class theo rules/backend-module-structure.md
□ Module nền tảng không import ngược module miền
□ Web/mobile gọi API qua @dnc/api-client, không fetch thẳng rải rác
□ Mọi hành động kiểm duyệt ghi moderation_audit_log trong cùng transaction
□ Mọi endpoint có Swagger decorator (@ApiOperation, @ApiResponse, @ApiProperty)
□ SOLID: function ≤ 30 dòng, class ≤ 200 dòng (kiểm bằng wc -l trên file đã sửa)
```

## Chất lượng code
```
□ Không có tiếng Việt trong comment, tên biến, hay log string
□ Không hardcode chuỗi trong JSX — tất cả đi qua t('key')
□ Không hardcode credential, URL, hay secret
□ Không còn console.log / debugger sót lại
□ Xử lý lỗi: dùng exception filter của NestJS, không try/catch rỗng
□ Thời gian lưu timestamptz UTC, không lưu chuỗi giờ local
```

## UI/UX
```
□ Mọi nút chỉ có icon đều có tooltip
□ Mọi trạng thái disabled đều có tooltip giải thích lý do (vd cần tier T2)
□ Layout mobile đã kiểm (responsive 375px)
□ Cả en.json lẫn vi.json đều được cập nhật (không lệch locale)
□ Trạng thái loading / error / empty phân biệt được
```

## Test
```
□ typecheck → 0 errors trên mọi app bị chạm
□ Spec Playwright tồn tại cho tính năng web mới
□ Spec Jest tồn tại cho endpoint/service mới, đặt trong apps/api/e2e/**
□ Test data được dọn trong hook after()
```

## Kiểm tra kích thước file
```bash
wc -l <file-đã-sửa.tsx>
# Component > 500 dòng → đánh dấu cần tách trước khi merge
# Service > 300 dòng → đánh dấu cần soát lại trách nhiệm
```

## Grep nhanh
```bash
# Service không được chạm DataSource
grep -rn "dataSource\.\|DataSource" apps/api/src/modules --include="*.service.ts"
# Kỳ vọng: 0 kết quả

# Không có tiếng Việt trong source (trừ file locale)
grep -rn "[àáảãạăắằẳẵặâấầẩẫậ]" apps/api/src apps/web-client-side/src apps/web-admin-side/src apps/mobile/src --include="*.ts" --include="*.tsx"
# Kỳ vọng: 0 kết quả

# Không hardcode chuỗi hiển thị trong JSX
grep -rn ">[A-Z][a-z]" apps/web-client-side/src/app apps/web-admin-side/src/app --include="*.tsx" | grep -v "//\|t(\|import\|className\|href"
# Soát từng kết quả khớp
```
