---
name: brand-guidelines
description: Áp dụng bảng màu và kiểu chữ thương hiệu chính thức của Da Nang Connect cho mọi artifact cần đúng nhận diện sản phẩm. Dùng khi có yêu cầu về màu thương hiệu, quy chuẩn phong cách, định dạng hình ảnh hoặc tiêu chuẩn thiết kế của dự án.
license: Điều khoản đầy đủ trong LICENSE.txt
---

# Nhận diện thương hiệu Da Nang Connect

## Tổng quan

Dùng skill này để truy cập bản sắc thương hiệu chính thức và các tài nguyên phong cách của Da Nang Connect.

**Từ khóa**: branding, nhận diện sản phẩm, bản sắc thị giác, hậu xử lý, tạo phong cách, màu thương hiệu, kiểu chữ, thương hiệu Da Nang Connect, định dạng hình ảnh, thiết kế thị giác

## Tinh thần thương hiệu

Da Nang Connect là nền tảng kết nối cộng đồng người nước ngoài đang sống tại Đà Nẵng. Nhận diện phải phản ánh đúng bốn giá trị sau:

- **Cộng đồng trước tiên**: hình ảnh nói về người thật, hoạt động thật (sự kiện, thể thao, trao đổi ngôn ngữ), không phải về nền tảng.
- **Thực dụng**: ưu tiên thông tin người dùng cần ngay - thời gian, địa điểm, số chỗ còn trống, khoảng cách. Trang trí không được lấn át dữ liệu.
- **Thân thiện, dễ tiếp cận**: giọng điệu ấm và rõ ràng, viết cho người mới đến thành phố và có thể chưa thạo tiếng Việt.
- **Không hào nhoáng**: không gradient lòe loẹt, không hiệu ứng cầu kỳ, không hứa hẹn phóng đại. Sự tin cậy đến từ tính nhất quán, không đến từ độ bóng bẩy.

## Quy chuẩn thương hiệu

### Màu sắc

**Màu nền tảng:**

- Ink: `#1b2a33` - Chữ chính và nền tối
- Paper: `#fbfaf7` - Nền sáng và chữ trên nền tối
- Mid Gray: `#6b7a82` - Chữ phụ, nhãn meta, chú thích
- Line Gray: `#e3e6e4` - Đường viền, đường phân cách, nền nhạt

**Màu nhấn:**

- Ocean Teal: `#1f7a72` - Nhấn chính (nút hành động chính, liên kết, trạng thái đang hoạt động)
- Sand: `#e8a44a` - Nhấn phụ (làm nổi bật, huy hiệu, trạng thái waitlist)
- Coral: `#d4634f` - Nhấn thứ ba (điểm nhấn thị giác, biểu đồ, minh họa)

**Màu ngữ nghĩa:**

- Success: `#2f7d4f` - RSVP thành công, đã xác minh
- Warning: `#b8791c` - Sắp hết chỗ, chờ kiểm duyệt
- Danger: `#c0442f` - Hủy, no-show, lỗi
- Info: `#2e6fa6` - Thông báo trung tính, gợi ý

**Nguyên tắc dùng màu:**

- Ocean Teal chỉ dành cho hành động chính; mỗi màn hình không nên có quá một nút nhấn chính.
- Coral không được dùng cho thông báo lỗi, tránh nhầm với Danger.
- Mọi cặp chữ/nền phải đạt tương phản tối thiểu WCAG AA (4.5:1 cho chữ thường, 3:1 cho chữ lớn).
- Không dùng màu làm phương tiện truyền tin duy nhất; luôn kèm nhãn chữ hoặc biểu tượng (quan trọng với trust level và trạng thái RSVP).

### Kiểu chữ

- **Tiêu đề**: Plus Jakarta Sans (dự phòng: system-ui, Segoe UI, Arial)
- **Nội dung**: Inter (dự phòng: system-ui, Segoe UI, Arial)
- **Số liệu / mã**: JetBrains Mono (dự phòng: ui-monospace, Menlo, Consolas)
- **Lưu ý**: Cả hai font chính đều phủ đủ dấu tiếng Việt, phục vụ giao diện song ngữ (mặc định tiếng Anh, tiếng Việt là ngôn ngữ thứ hai). Nên cài sẵn font trong môi trường để có kết quả tốt nhất.

## Tính năng

### Áp dụng font thông minh

- Áp dụng Plus Jakarta Sans cho tiêu đề (từ 24pt trở lên)
- Áp dụng Inter cho phần nội dung
- Tự động lùi về system-ui/Arial khi font tùy chỉnh không có sẵn
- Giữ khả năng đọc trên mọi hệ thống, kể cả khi hiển thị chữ có dấu tiếng Việt

### Tạo phong cách cho chữ

- Tiêu đề (từ 24pt): font Plus Jakarta Sans
- Nội dung: font Inter
- Ngày giờ, số chỗ, khoảng cách: JetBrains Mono để các con số thẳng cột
- Chọn màu chữ thông minh dựa trên nền
- Giữ nguyên phân cấp và định dạng của chữ

### Màu cho hình khối và chi tiết nhấn

- Các hình khối không chứa chữ dùng màu nhấn
- Luân phiên qua Ocean Teal, Sand và Coral
- Giữ được sự thú vị về mặt thị giác mà vẫn đúng nhận diện

## Chi tiết kỹ thuật

### Quản lý font

- Ưu tiên dùng font Plus Jakarta Sans và Inter đã cài trong hệ thống
- Có sẵn cơ chế lùi tự động về system-ui (tiêu đề) và Arial (nội dung)
- Không bắt buộc cài font - vẫn chạy được với font sẵn có của hệ thống
- Để có kết quả tốt nhất, cài sẵn Plus Jakarta Sans và Inter trong môi trường

### Áp dụng màu

- Trên web và mobile: khai báo màu bằng CSS custom properties và token của Tailwind, không viết mã hex rải rác trong component
- Trên slide và tài liệu: dùng giá trị màu RGB để khớp thương hiệu chính xác, áp dụng qua lớp RGBColor của python-pptx
- Giữ độ trung thực màu nhất quán giữa các hệ thống và giữa chế độ sáng/tối
