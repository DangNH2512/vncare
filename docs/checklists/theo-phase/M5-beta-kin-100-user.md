# Checklist M5 · Beta kín 100 user

**Dự án:** Da Nang Connect — Giai đoạn 1 (MVP) · **Trạng thái chụp:** 19/09/2026 · **Ngày chốt:** 25/12/2026

**Bản sửa được:** `docs/checklists/checklist-milestone-M0-M6.xlsx` (mỗi phase một sheet, cột Trạng thái có danh sách chọn, sheet Tổng quan tự tính lại).

---

## 1. Cách đọc

**Trạng thái:**

- ✅ **Xong**: đã làm và có bằng chứng (test, ảnh, link).
- 🟡 **Một phần**: đã có code hoặc cấu hình nhưng còn thiếu phần ghi ở cột Ghi chú.
- ⬜ **Chưa làm**: chưa bắt đầu. Đây là mặc định cho các mục M2–M6 chưa được kiểm tra chi tiết.
- ⛔ **Bị chặn**: phải chờ việc khác xong (ghi ở cột Ghi chú).
- ❓ **Cần chốt**: cần quyết định của Founder, Product Owner, Tech Lead, BA hoặc luật sư trước khi làm.
- ⚪ **Chưa xác nhận**: việc ngoài repo (pháp lý, tài khoản, vận hành) chưa có bằng chứng; người phụ trách tự xác nhận.

**Nhóm việc trong mỗi phase:** Việc chặn & cần chốt → Story → DoD bổ sung → Nghiệm thu → Demo → Việc ngoài SP → Bổ sung từ mockup.

**Nguồn trạng thái:** M0–M1 lấy từ đợt kiểm tra code chỉ đọc ngày 18/09/2026 (có đối chứng độc lập). Các mục "Một phần" của M2–M3 lấy từ ghi chú phiên làm việc 01–02/09, **chưa kiểm chứng lại bằng code**. Story, DoD, demo và tiêu chí nghiệm thu lấy nguyên văn từ `docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md` §6–§7. Nhóm "Bổ sung từ mockup" là việc mới lộ ra từ bộ mockup web ngày 18–19/09 và quyết định của chủ dự án ngày 19/09.

<div class="pb"></div>

## 2. M5 · Beta kín 100 user — chốt 25/12/2026

**Sprint:** S6, S7 · **Tổng:** 53 mục · ✅ 0 · 🟡 0 · ⬜ 53 · ⛔ 0 · ❓ 0 · ⚪ 0 · **Tỷ lệ xong:** 0%

**Mục tiêu:**

- S6 — Sẵn sàng beta & Curation Console (30/11 – 11/12/2026): Community Manager nhập được sự kiện thật vào hệ thống trong dưới 3 phút, organizer gốc nhận được lời mời tự quản lý listing, và bản build đã nộp lên TestFlight + Play closed testing.
- S7 — Vận hành beta kín 100 user (14/12 – 25/12/2026): Một trăm expat thật dùng sản phẩm trong đời thật, và đội nhìn thấy họ dùng như thế nào.

**Nếu trượt:** M5 có 2 tuần đệm tự nhiên (đóng băng cuối năm + S8). Nếu M5-7 trượt vì Play closed testing bắt đầu muộn thì đây là rủi ro chặn M6 — xem §8.3.

### 2.1. Story

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | E9-S2 | Nhập sự kiện công khai vào hệ thống < 3 phút, có ghi nguồn (8 SP) · MUST | S6 | Web + Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E9-S3 | Lời mời organizer gốc nhận quyền quản lý listing (8 SP) · MUST | S6 | Backend + Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E9-S4 | Quản lý người dùng, khu vực, loại hình hoạt động (5 SP) · MUST | S6 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E9-S5 | Bảng điều khiển vận hành cho Founder (8 SP) · MUST | S6 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E6-S5 | Điểm danh tại chỗ bằng mã QR (8 SP) · MUST | S6 | Backend + Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E6-S6 | Ghi `no_show_recorded` vào `trust_signals` (5 SP) · MUST | S6 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E3-S6 | Xác minh số điện thoại bằng OTP (5 SP) · MUST | S6 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E8-S6 | Chống spam: trần số hoạt động/ngày, lọc từ khoá, chặn link đáng ngờ (5 SP) · MUST | S6 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E8-S7 | Xuất dữ liệu cá nhân + yêu cầu xoá tài khoản (5 SP) · MUST | S6 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E12-S2 | Icon, splash, ảnh cửa hàng (3 SP) · MUST | S6 | Designer | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E12-S3 | TestFlight + Play closed testing (5 SP) · MUST | S6 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E12-S5 | EAS Update để vá nhanh không cần chờ duyệt (3 SP) · MUST | S6 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E11-S1 | Lược đồ sự kiện phân tích thống nhất web + mobile (5 SP) · MUST | S7 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E6-S4 | Xem danh sách người tham gia trong giới hạn quyền riêng tư (5 SP) · SHOULD | S7 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S9 | "Tuần này có gì" ngay trên màn hình đầu (5 SP) · MUST | S7 | Web + Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E7-S7 | Tắt riêng từng loại thông báo (5 SP) · SHOULD | S7 | Web + Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E6-S9 | Xuất danh sách người tham gia ra CSV (3 SP) · SHOULD | S7 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E10-S3 | About / FAQ / Community Guidelines song ngữ (3 SP) · MUST | S7 | Community Manager | <span class="nw">⬜ Chưa làm</span> | — |

### 2.2. DoD bổ sung

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S6-DoD-1 | Bấm đồng hồ: Community Manager nhập một sự kiện thật từ một bài đăng công khai → ≤ 3 phút, đo trên 5 sự kiện khác nhau, lấy trung vị | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-2 | Mọi listing curate bắt buộc có: `source = 'curated'`, trường nguồn gốc, nhãn hiển thị "Listed by Da Nang Connect from a public post — not managed by the organiser", và nút gỡ ngay trên trang công khai | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-3 | Không có chức năng scraping nào trong repo. `grep -rniE "puppeteer\|playwright-scrape\|cheerio\|scrape"` trong `apps/api` phải rỗng (trừ dev-dependency test) | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-4 | Luồng nhận quyền: mã mời một lần, hết hạn 14 ngày, dùng rồi vô hiệu; nhận quyền xong `source` đổi `curated` → `self_serve`, `host_user_id` chuyển sang organizer thật, người curate cũ chuyển thành `event_cohosts` với `role_in_event = 'listed_by'` | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-5 | Điểm danh QR: mã xoay theo thời gian, không dùng lại được; quét xong `rsvps.status` = `checked_in` và sinh tín hiệu `attendance_confirmed` | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-6 | Job đóng occurrence chạy T+3h sau `ends_at`: ai `going` mà không `checked_in` → `no_show`, sinh `no_show_recorded` | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-7 | Xuất & xoá dữ liệu (E8-S7) phải xong trước ngày mở beta. Xuất trả gói JSON + ảnh trong ≤ 72 giờ; xoá thực hiện xoá cứng dữ liệu định danh và giữ bản ghi ẩn danh cho thống kê, có mô tả trong Privacy Policy | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-8 | OTP: giới hạn 5 lần gửi/số/ngày, mã 6 số, hết hạn 5 phút, chống brute-force | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-9 | Build `production` đã nộp TestFlight và đã tạo track closed testing trên Play với ≥ 12 tester — đồng hồ 14 ngày bắt đầu chạy chậm nhất 11/12/2026 | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-DoD-1 | 15 sự kiện phân tích ở §5.12 đều bắn được từ cả web lẫn mobile, cùng tên thuộc tính, kiểm tra bằng bảng đối chiếu | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-DoD-2 | Crash-free session ≥ 99% đo trên 7 ngày cuối sprint | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-DoD-3 | Toàn bộ P0 và P1 phát hiện trong beta được ghi vào backlog S8 với mức ưu tiên và người nhận | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-DoD-4 | Bảng tổng hợp 15 cuộc phỏng vấn có ít nhất 5 phát hiện có hành động kèm story tương ứng | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |

### 2.3. Nghiệm thu

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | M5-1 | Tài khoản beta thật đã kích hoạt — ngưỡng: ≥ 100 |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `users` |
| ☐ | M5-2 | Beta user hoạt động (mở app ≥ 2 lần trong 14 ngày cuối) — ngưỡng: ≥ 70 |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng phân tích |
| ☐ | M5-3 | Sự kiện đã curate trong hệ thống — ngưỡng: ≥ 60 |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `events` |
| ☐ | M5-4 | Dòng chảy trong beta: sự kiện đang mở mỗi tuần, đo 4 tuần liên tiếp — ngưỡng: ≥ 15/tuần, không tuần nào < 10 |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo tuần |
| ☐ | M5-5 | Không khu vực MVP nào có 0 sự kiện đang mở trong 4 tuần liên tiếp — ngưỡng: 6/6 khu vực có mặt |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng theo khu vực |
| ☐ | M5-6 | RSVP thật (không phải tài khoản test) — ngưỡng: ≥ 200 |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `rsvps` |
| ☐ | M5-7 | TestFlight chạy ổn định + Play closed testing đủ 14 ngày liên tục — ngưỡng: Đủ 14 ngày |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh Play Console |
| ☐ | M5-8 | Crash-free session, đo 7 ngày cuối — ngưỡng: ≥ 99% |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Sentry |
| ☐ | M5-9 | Phỏng vấn sâu người dùng — ngưỡng: ≥ 15 cuộc |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bản ghi + tổng hợp |
| ☐ | M5-10 | Xuất & xoá dữ liệu cá nhân hoạt động thật (đã thử trên 1 tài khoản thật) — ngưỡng: Đạt |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Gói dữ liệu xuất ra |

### 2.4. Demo

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S6-Demo-1 | Community Manager nhập 3 sự kiện thật trên màn hình, bấm đồng hồ từng lần | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-Demo-2 | Gửi lời mời tới hộp thư của một organizer thật đang hợp tác → organizer bấm link, đăng nhập, nhận quyền → sự kiện đổi chủ ngay trước mắt | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-Demo-3 | In một mã QR, quét bằng app trên Android thật → điểm danh thành công, trust signal xuất hiện | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-Demo-4 | Bảng điều khiển Founder: số hoạt động tuần này, RSVP, report đang chờ, tỷ lệ `curated → self_serve` | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-Demo-5 | Yêu cầu xuất dữ liệu của tài khoản demo → tải về file JSON, mở ra đọc được | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-Demo-6 | Cài app từ TestFlight lên iPhone thật ngay trong buổi demo | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-Demo-1 | Bảng điều khiển: 100 tài khoản beta thật, biểu đồ kích hoạt theo ngày | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-Demo-2 | Phễu thật đọc từ công cụ phân tích: `app_open` → `discover_viewed` → `event_viewed` → `rsvp_completed`, kèm tỷ lệ rớt từng bước | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-Demo-3 | Ba trích đoạn phỏng vấn video, mỗi đoạn 60 giây, kèm việc đội sẽ làm với nó | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-Demo-4 | Bảng Sentry: crash-free session của 7 ngày cuối | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-Demo-5 | Xác nhận Play closed testing đã chạy đủ 14 ngày liên tục | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |

### 2.5. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | MK-ADMIN-01 | Console quản trị tin tức song ngữ (soạn, hẹn giờ đăng, evergreen, gắn sự kiện liên quan) + gắn events.source khi curate. |  | Web Admin | <span class="nw">⬜ Chưa làm</span> | apps/web-admin-side chưa khởi tạo. |

