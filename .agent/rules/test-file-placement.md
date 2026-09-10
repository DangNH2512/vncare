---
description: File spec test nằm ở thư mục test riêng của từng app, không bao giờ nằm trong src.
---

# Quy Tắc Đặt File Test

> Quyết định của chủ sản phẩm: file spec phục vụ việc test phải nằm trong thư mục
> test riêng của app, không đặt cạnh mã nguồn production.

## Quy tắc

1. **Không bao giờ để file test cạnh mã nguồn trong `src/`.** Mọi spec tự động
   (unit, integration, e2e) của `apps/api` nằm dưới `apps/api/e2e/**`, phản chiếu
   đúng đường dẫn `src/**` của code được test:

   ```text
   src/modules/rsvp/rsvp.service.ts
   e2e/modules/rsvp/rsvp.service.waitlist.spec.ts   ← test nằm ở đây
   ```

2. **Import** từ spec trỏ ngược vào source bằng đường dẫn tương đối, ví dụ
   `../../../src/modules/rsvp/rsvp.service`.

3. **Cấu hình Jest** (`apps/api/jest.config.ts`): `rootDir: "."` +
   `roots: ["<rootDir>/e2e"]`. Không sửa `testRegex` để quét `src/`.

4. **tsconfig**: `e2e` nằm trong `exclude`; `ts-jest` type-check spec lúc chạy
   test, còn `tsc --noEmit` và bản build production không bao giờ biên dịch spec.

5. **Các app khác** giữ thư mục test riêng:
   `apps/web-client-side` → `apps/web-client-side/e2e/**` (Playwright, luồng
   người dùng cuối: feed, chi tiết sự kiện, RSVP, khám phá, hồ sơ);
   `apps/web-admin-side` → `apps/web-admin-side/e2e/**` (Playwright, luồng vận
   hành: curate, kiểm duyệt, quản lý người dùng, analytics);
   `apps/mobile` → `apps/mobile/__tests__/**` (không đặt trong `app/`).
   Bất biến chung ở mọi nơi: file test không nằm cạnh file production.
   Kịch bản kiểm thử **thủ công** của mobile là tài liệu, không phải spec chạy được
   — chúng nằm ở `apps/mobile/testcase/<module>/testcases.md` cùng thư mục
   `evidence/` đi kèm, tách hẳn khỏi `__tests__/`
   (xem [three-phase-verification.md](three-phase-verification.md) Pha 1).

6. **Dọn dẹp khi gặp**: nếu thấy `*.spec.ts` đặt lẫn trong `src/`, chuyển sang
   đường dẫn `e2e/` tương ứng (và sửa import) ngay trong task đang chạm module đó.

## Kiểm tra sau khi thêm/di chuyển spec

```bash
pnpm --filter @dnc/api test        # mọi suite vẫn được phát hiện và xanh
pnpm --filter @dnc/api typecheck   # build source không bị ảnh hưởng
```
