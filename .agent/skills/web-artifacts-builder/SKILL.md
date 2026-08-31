---
name: web-artifacts-builder
description: Bộ công cụ dựng artifact HTML nhiều component, phức tạp cho claude.ai bằng công nghệ frontend hiện đại (React, Tailwind CSS, shadcn/ui). Dùng cho artifact phức tạp cần quản lý state, routing hoặc component shadcn/ui — không dùng cho artifact HTML/JSX đơn giản một file.
license: Điều khoản đầy đủ trong LICENSE.txt
---

# Web Artifacts Builder

> **Ghi chú cho Da Nang Connect:** skill này dựng **artifact demo** — bản dựng để
> trình bày, lấy ý kiến, chốt hướng trước khi code thật. Nó **không** sinh code
> production cho `apps/web`. Muốn dựng màn hình thật, dùng
> [modern-ui-design](../modern-ui-design/SKILL.md); muốn mockup nằm trong
> `docs/mockups/`, dùng [mockup-builder](../mockup-builder/SKILL.md).

Để dựng artifact frontend mạnh cho claude.ai, làm theo các bước sau:
1. Khởi tạo repo frontend bằng `scripts/init-artifact.sh`
2. Phát triển artifact bằng cách sửa code vừa sinh ra
3. Gộp toàn bộ code vào một file HTML duy nhất bằng `scripts/bundle-artifact.sh`
4. Đưa artifact cho người dùng xem
5. (Tuỳ chọn) Test artifact

**Stack**: React 18 + TypeScript + Vite + Parcel (bundling) + Tailwind CSS + shadcn/ui

## Nguyên tắc thiết kế & style

RẤT QUAN TRỌNG: Để tránh thứ thường được gọi là "AI slop", đừng lạm dụng layout căn giữa, gradient tím, bo góc đều tăm tắp và font Inter.

Với artifact của Da Nang Connect, thêm ba ràng buộc của sản phẩm:
- **Viewport mobile là mặc định** — expat phần lớn mở app trên điện thoại khi đang di chuyển; desktop là biến thể.
- **Chữ hiển thị mặc định tiếng Anh**, tiếng Việt là ngôn ngữ thứ hai. Chuỗi VI dài hơn khoảng 30%, layout phải chịu được mà không vỡ.
- **Thời gian lưu UTC**, hiển thị theo timezone người xem; giờ địa phương là `Asia/Ho_Chi_Minh`.

## Bắt đầu nhanh

### Bước 1: Khởi tạo project

Chạy script khởi tạo để tạo project React mới:
```bash
bash scripts/init-artifact.sh <project-name>
cd <project-name>
```

Lệnh này tạo ra một project đã cấu hình đầy đủ:
- ✅ React + TypeScript (qua Vite)
- ✅ Tailwind CSS 3.4.1 kèm hệ thống theming của shadcn/ui
- ✅ Path alias (`@/`) đã cấu hình sẵn
- ✅ Hơn 40 component shadcn/ui cài sẵn
- ✅ Đầy đủ dependency của Radix UI
- ✅ Parcel đã cấu hình để bundle (qua `.parcelrc`)
- ✅ Tương thích Node 18+ (tự phát hiện và ghim phiên bản Vite)

### Bước 2: Phát triển artifact

Để dựng artifact, sửa các file vừa được sinh ra. Bảng dưới đây chốt sẵn các
component nên dựng trước.

Với Da Nang Connect, hãy dựng đúng component thật của sản phẩm thay vì component
giả định — đó là cách artifact demo có giá trị khi đem đi lấy ý kiến:

| Component | Nội dung cần dựng |
| --- | --- |
| `EventCard` | Ảnh bìa, tiêu đề, thời gian theo timezone người xem, badge khu vực, số chỗ còn lại hoặc trạng thái waitlist. |
| `AreaFilter` | Chọn nhiều trong sáu khu vực: An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn. |
| `RsvpButton` | Bốn trạng thái: còn chỗ · đã RSVP · đã đầy (vào waitlist) · đang xử lý. |

Artifact demo dùng dữ liệu mẫu ngay trong file, không gọi API thật — mục tiêu là
xem được luồng và thẩm mỹ, không phải kết nối `apps/api`.

### Bước 3: Gộp thành một file HTML duy nhất

Để gộp app React thành một artifact HTML duy nhất:
```bash
bash scripts/bundle-artifact.sh
```

Lệnh này tạo ra `bundle.html` — một artifact tự chứa, đã inline toàn bộ JavaScript, CSS và dependency. File này có thể chia sẻ trực tiếp trong hội thoại Claude dưới dạng artifact.

**Yêu cầu**: project phải có `index.html` ở thư mục gốc.

**Script làm những gì**:
- Cài dependency dùng để bundle (parcel, @parcel/config-default, parcel-resolver-tspaths, html-inline)
- Tạo file cấu hình `.parcelrc` có hỗ trợ path alias
- Build bằng Parcel (không sinh source map)
- Inline toàn bộ asset vào một file HTML duy nhất bằng html-inline

### Bước 4: Chia sẻ artifact với người dùng

Cuối cùng, chia sẻ file HTML đã bundle trong hội thoại để người dùng xem được dưới dạng artifact.

### Bước 5: Test / xem trực quan artifact (tuỳ chọn)

Lưu ý: đây là bước hoàn toàn tuỳ chọn. Chỉ làm khi cần thiết hoặc khi được yêu cầu.

Để test hoặc xem trực quan artifact, dùng các công cụ có sẵn (kể cả Skill khác hoặc công cụ tích hợp như Playwright hay Puppeteer). Nhìn chung, tránh test ngay từ đầu vì nó làm chậm khoảng cách giữa lúc nhận yêu cầu và lúc nhìn thấy artifact hoàn chỉnh. Hãy test sau, khi đã trình bày artifact, nếu được yêu cầu hoặc khi có vấn đề phát sinh.

## Tham chiếu

- **Component shadcn/ui**: https://ui.shadcn.com/docs/components
