# `map-audit/` — kiểm thử bản đồ chủ quyền

Bằng chứng cho gate phát hành R6 / L-03 (doc 00 §6): bản đồ hiển thị đúng chủ quyền Việt Nam, có Hoàng Sa và Trường Sa, ở mọi mức zoom. Đường dẫn này do doc 00 đặt. **Lần phát hành nào có hiển thị bản đồ mà không có thư mục kiểm ở đây thì coi như chưa qua gate.**

**Khi nào phải kiểm:** trước mọi bản staging, beta hoặc production có hiển thị tile bản đồ. Màn chọn địa điểm của web (`apps/web-client-side/app/(shell)/_components/location-picker.tsx`) đang lấy tile từ `tile.openstreetmap.org`, nên gate áp dụng ngay từ bản đầu tiên có màn này, không chờ bản đồ web E5-S6.

**Mỗi lần kiểm một thư mục** `<YYYY-MM-DD>-<release-tag>/` (ví dụ `2026-10-30-v0-3-0/`), gồm:

- `z<NN>.webp` hoặc `z<NN>.png`: ảnh vùng Biển Đông ở từng mức zoom
- `result.md`: nhà cung cấp tile và phiên bản, các mức zoom đã kiểm, đạt hay không đạt, vai trò người kiểm, phương án xử lý nếu không đạt

**Cách chụp để ảnh không lộ dữ liệu:**

- Chụp ở phiên chưa đăng nhập, hoặc trên staging dùng seed data.
- Chỉ cắt vùng khung bản đồ, không lấy thanh trình duyệt hay avatar.
- Xoá metadata ảnh (`exiftool -all= <file>` hoặc `cwebp -metadata none`).
- Mỗi ảnh không quá 300 KB.
