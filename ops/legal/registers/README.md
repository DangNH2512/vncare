# `registers/` — sổ đăng ký xử lý dữ liệu cá nhân

Sổ đăng ký sống, **chỉ mô tả hoạt động xử lý**, không chứa dữ liệu người dùng.

**Dự kiến chứa:**

- `processing-activities.md` — sổ đăng ký hoạt động xử lý dữ liệu cá nhân (S0-DoD-6, S1-DoD-8, M1-8; bản đầy đủ là L-04 ở doc 08 §12.4)
- `foreign-processors.md` — các bên xử lý ở nước ngoài và luồng dữ liệu ra nước ngoài: dữ liệu gì, đi đâu, để làm gì. Nhật ký từng lần chuyển do hệ thống ghi, không ghi tay ở đây
- `retention-schedule.md` — lịch lưu giữ, xoá và ẩn danh hợp nhất từ các tài liệu phân tích

**Cột tối thiểu của sổ đăng ký** (doc 07 §15.7): dữ liệu gì · mục đích · lưu ở đâu · giữ bao lâu · ai truy cập. Nên thêm: cơ sở pháp lý · có chuyển ra nước ngoài không.

**Cách ghi:** nơi lưu ghi mô tả chung ("PostgreSQL, hosting tại Việt Nam"), người truy cập ghi tên role (`super_admin`, `moderator`). Không ghi hostname, tên bucket, IP, tên người, email hay số điện thoại.

**Khi nào cập nhật:** story nào chạm dữ liệu cá nhân thì sửa sổ ngay trong PR đó (DoD-12, doc 08 §6.1).
