# Nhật Ký Quyết Định — Da Nang Connect

Ghi các quyết định bền vững, có ảnh hưởng dài hạn. Mỗi quyết định một mục, không sửa
mục cũ — quyết định đổi thì thêm mục mới và trỏ ngược lại mục bị thay thế.

Khuôn: `## [YYYY-MM-DD] <Quyết định>` + **Bối cảnh** / **Lựa chọn** / **Hệ quả** / **Thay thế cho** (nếu có).

## [2026-08-31] Giai đoạn 1 làm Kết nối cộng đồng, không làm Nhà ở trước

**Bối cảnh:** Dữ liệu 3.504 bài đăng expat Đà Nẵng cho thấy nhà ở được nhắc nhiều
nhất, nhưng sự kiện + thể thao cộng lại (809 bài) vượt nhà ở (349 bài), và bài về
sự kiện tăng gấp 10 lần trong T5–6/2026.

**Lựa chọn:** Bắt đầu bằng sự kiện / thể thao / trao đổi ngôn ngữ.

**Hệ quả:** Rủi ro thấp nhất — không cần xác thực chuyên môn, không có bên thứ ba
trong giao dịch tiền. Đổi lại, giá trị mỗi giao dịch thấp nên phải đạt quy mô người
dùng mới có doanh thu. Nhà ở lùi sang giai đoạn 2, y tế giai đoạn 3.

## [2026-08-31] Không scraping tự động từ nền tảng nguồn

**Bối cảnh:** Cần nội dung mồi để app không trống ngày đầu.

**Lựa chọn:** Đội sáng lập curate thủ công, ghi rõ nguồn, có quy trình gỡ bỏ khi
người tổ chức gốc yêu cầu. Cột `collection_method` mặc định `manual_only` kèm ràng
buộc CHECK ở tầng database.

**Hệ quả:** Tránh rủi ro pháp lý và rủi ro app gãy đột ngột khi nền tảng nguồn đổi
chính sách. Đổi lại tốn công người trong giai đoạn đầu, nhưng chính việc tiếp cận
thủ công lại tạo cớ tự nhiên để chuyển đổi người tổ chức sang tự quản lý listing.

## [2026-08-31] Stack: NestJS + TypeORM + PostgreSQL/PostGIS, Next.js, Expo

**Bối cảnh:** Đội ngũ đã thành thạo bộ công cụ này; sản phẩm cần truy vấn theo khu
vực và bán kính ngay từ MVP.

**Lựa chọn:** Xem `docs/analysis/04-tech-stack-va-kien-truc.md`.

**Hệ quả:** PostGIS cho phép lọc theo `area_id` và theo bán kính trên cùng một bảng,
không cần dịch vụ tìm kiếm riêng ở giai đoạn đầu.

## [2026-08-31] Mọi module backend bắt buộc có layer DTO request/response

**Bối cảnh:** Trả entity TypeORM thẳng ra API làm rò trường nội bộ và khoá cứng lược
đồ database vào hợp đồng API.

**Lựa chọn:** 4 class lõi + `dto/request/` + `dto/response/` + mapper. DTO gần giống
nhau thì kế thừa bằng mapped type của `@nestjs/swagger`, không chép lại. Ở ranh giới
riêng tư dùng `PickType` (danh sách trắng) chứ không `OmitType`.

**Hệ quả:** Xem `.agent/rules/backend-module-structure.md` §2 và §2.1.
