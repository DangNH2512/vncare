# Bản Đồ Năng Lực

Đối chiếu năng lực sản phẩm với nơi hiện thực. Cập nhật khi thêm module mới.

| Năng lực | Trạng thái | apps/api | apps/web-client-side | apps/web-admin-side | apps/mobile | Tài liệu |
|---|---|---|---|---|---|---|
| Đăng ký / đăng nhập | **API + web xong** (email/mật khẩu) | `modules/auth` | /login, /register, dialog gate | — | — | `docs/analysis/01-tac-nhan-va-phan-quyen.md` |
| Hồ sơ & trust level | **API + web xong** | `modules/profile` | /profile, /u/[handle] | — | — | `docs/analysis/01-tac-nhan-va-phan-quyen.md` |
| Tạo & quản lý sự kiện | **CRUD xong (Postgres)** | `modules/event` | — | — | — | `docs/analysis/02-use-case.md` |
| RSVP & waitlist | chưa làm | `modules/rsvp` | — | — | — | `docs/analysis/02-use-case.md` |
| Khu vực & truy vấn địa lý | chưa làm | `modules/area` | — | — | — | `docs/analysis/03-domain-va-du-lieu.md` |
| Tìm kiếm & lọc | chưa làm | `modules/search` | — | — | — | `docs/analysis/10-ux-luong-man-hinh-va-i18n.md` |
| Báo cáo vi phạm & kiểm duyệt | chưa làm | `modules/report` | — | — | — | `docs/analysis/05-trust-safety-va-kiem-duyet.md` |
| Thông báo & push | chưa làm | `modules/notification` | — | — | — | `docs/analysis/04-tech-stack-va-kien-truc.md` |
| Curate nội dung thủ công | chưa làm | `modules/curation` | — | — | — | `docs/analysis/07-go-to-market-da-nang.md` |
| Bài đăng cộng đồng | **API xong + web đăng được** | `modules/post` | composer 2 bước + card có gallery | — | — | — |
| Ảnh / video đính kèm | **API xong + web upload được** | `modules/media` | drop zone, upload có tiến độ, carousel tối đa 5 | — | — | `docs/analysis/04-tech-stack-va-kien-truc.md` (presigned URL) |
| Địa điểm gắn vào bài đăng | **API xong + web ghim được** | `posts.location` (PostGIS) | MapLibre picker | — | — | `docs/analysis/13-ban-do-va-truc-quan-hoa-su-kien.md` |
| Bình luận (post + event) | **API xong** | `modules/comment` | — | — | — | `docs/analysis/03-domain-va-du-lieu.md` §8.1 |
| Reaction (post/comment/event) | **API xong** | `modules/reaction` | — | — | — | — |
| Chat (REST + socket.io) | **API xong** | `modules/chat` | — | — | — | `docs/analysis/03-domain-va-du-lieu.md` §8.2–8.3 |
| Bản đồ & mật độ sự kiện | đã lên kế hoạch | `modules/map` | MapLibre | — | `react-native-maps` | `docs/analysis/13-ban-do-va-truc-quan-hoa-su-kien.md` |

Ghi chú trạng thái web (2026-09-01): `apps/web-client-side` đang dựng UI cơ bản
với Next.js 16 — bốn màn hình feed, chi tiết sự kiện, khám phá, hồ sơ; chưa nối
API thật. `apps/web-admin-side` còn rỗng, chưa bắt đầu.
