# Checklist M6 · Ra mắt công khai

**Dự án:** Da Nang Connect — Giai đoạn 1 (MVP) · **Trạng thái chụp:** 19/09/2026 · **Ngày chốt:** 25/02/2027

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

## 2. M6 · Ra mắt công khai — chốt 25/02/2027

**Sprint:** S8, S9, S10 · **Tổng:** 50 mục · ✅ 0 · 🟡 0 · ⬜ 50 · ⛔ 0 · ❓ 0 · ⚪ 0 · **Tỷ lệ xong:** 0%

**Mục tiêu:**

- S8 — Sửa lỗi beta & Hoàn thiện (04/01 – 15/01/2027): Đóng toàn bộ P0/P1 của beta, và bịt hai chỗ rớt phễu lớn nhất tìm được ở S7.
- S9 — Chuẩn bị ra mắt (18/01 – 29/01/2027): Có một release candidate đóng gói xong, tài sản cửa hàng xong, và runbook sự cố đã được diễn tập thật.
- S10 — Ra mắt công khai (15/02 – 26/02/2027): App có mặt trên cả hai kho ứng dụng, web production sống, và cộng đồng Đà Nẵng biết chuyện đó.

**Nếu trượt:** không ra mắt công khai đúng hạn. Lùi ra mắt 2–4 tuần và dồn toàn bộ nguồn lực vào curate + chuyển giao organizer. Ra mắt với một ứng dụng trông đầy nhưng không có dòng chảy là kịch bản hỏng tệ nhất: người dùng mở lần đầu, không thấy gì đáng đi, và không quay lại — không có lần ra mắt thứ hai với cùng một người.

### 2.1. Story

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | E7-S5 | WebSocket đếm chỗ realtime (thay polling 30 giây) (13 SP) · SHOULD | S8 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E3-S5 | Xem & sửa hồ sơ ngay trong app (8 SP) · MUST | S8 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E3-S4 | Hồ sơ công khai của organizer trên web (5 SP) · SHOULD | S8 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E10-S2 | Bản dịch tiếng Việt do người dịch, không phải dịch máy (5 SP) · MUST | S8 | Product Owner + Community Manager | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E11-S2 | Tích hợp công cụ phân tích sản phẩm, dựng phễu thật (5 SP) · MUST | S8 | Tech Lead | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E4-S5 | Hoạt động lặp lại theo tuần (`recurrence_rule` sinh nhiều occurrence) (8 SP) · MUST | S9 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E4-S10 | Trang quản lý hoạt động của tôi: sắp diễn ra / đã qua / nháp (8 SP) · MUST | S9 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S8 | Chuyển danh sách ↔ bản đồ trên mobile (8 SP) · SHOULD | S9 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E6-S8 | Số chỗ còn lại cập nhật realtime trên mobile (8 SP) · SHOULD | S9 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E11-S3 | Báo cáo tuần tự động (5 SP) · MUST | S9 | Tech Lead + Product Owner | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E11-S4 | Link mời bạn có ghi nhận (5 SP) · SHOULD | S9 | Backend + Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E11-S5 | SEO cho truy vấn "things to do in Da Nang this week" (5 SP) · MUST | S9 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E12-S4 | Mô tả cửa hàng song ngữ + ảnh chụp màn hình (5 SP) · MUST | S9 | Mobile + Product Owner | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E12-S6 | App được duyệt và có mặt trên cả hai cửa hàng đúng ngày (5 SP) · MUST | S10 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S10 | Lưu bộ lọc yêu thích, lưu hoạt động xem sau (5 SP) · COULD | S10 | Backend + Web | <span class="nw">⬜ Chưa làm</span> | — |

### 2.2. DoD bổ sung

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S8-DoD-1 | Không còn P0 nào mở. P1 còn mở ≤ 3, mỗi cái có ngày hẹn | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-DoD-2 | Hai chỗ rớt phễu lớn nhất đã có thay đổi cụ thể và đo lại được — ghi rõ "trước / sau" trong issue | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-DoD-3 | Bản dịch tiếng Việt được một người Việt không thuộc đội đọc lại toàn bộ, chấm ≥ 4/5 về độ tự nhiên | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-DoD-4 | Thời gian tải danh sách khám phá trên 4G mô phỏng < 2,5 giây tới nội dung đầu tiên | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-DoD-5 | Realtime: nếu WebSocket rớt thì tự hạ cấp về polling 30 giây, không hiện lỗi cho người dùng | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-DoD-1 | Sự kiện lặp lại: `recurrence_rule` sinh occurrence trước 12 tuần, sửa một buổi không ảnh hưởng các buổi khác, huỷ chuỗi hỏi rõ "buổi này hay tất cả buổi sau" | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-DoD-2 | Release candidate `v1.0.0-rc.1` đã dựng bằng profile `production`, đã chạy hồi quy đầy đủ, không có lỗi chặn | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-DoD-3 | Trang chỉ mục theo khu vực và theo loại hình đã sinh sitemap, đã submit Search Console; Lighthouse SEO ≥ 95 trên 5 trang mẫu | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-DoD-4 | Diễn tập runbook sự cố thật: cố ý tắt Redis trên staging trong giờ làm việc → đo thời gian phát hiện (mục tiêu ≤ 5 phút) và thời gian khôi phục (mục tiêu ≤ 30 phút); biên bản diễn tập lưu lại | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-DoD-5 | Ảnh chụp màn hình cửa hàng dùng dữ liệu thật đã được phép, không dùng ảnh người không có đồng ý | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-DoD-6 | Tài khoản demo cho reviewer cửa hàng đã tạo, có sẵn dữ liệu, thông tin đăng nhập đã ghi vào App Review Notes | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S10-DoD-1 | Toàn bộ checklist §12 đã tích xanh, có tên người ký từng mục | S10 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S10-DoD-2 | Chuông báo (alerting) đã bật cho: tỷ lệ lỗi 5xx > 1%, độ trễ p95 > 800 ms, hàng đợi BullMQ tồn > 500 job, Postgres kết nối > 80% | S10 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S10-DoD-3 | Có phương án lùi (rollback) đã thử: web lùi trong ≤ 5 phút, mobile vá bằng EAS Update trong ≤ 30 phút | S10 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S10-DoD-4 | War-room có kênh riêng, danh sách trực theo giờ, số điện thoại dự phòng | S10 | — | <span class="nw">⬜ Chưa làm</span> | — |

### 2.3. Nghiệm thu

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | M6-1 | Sự kiện đang mở mỗi tuần — đếm số occurrence có `status = 'published'`, `starts_at` rơi trong tuần đó và còn nhận RSVP — ngưỡng: ≥ 25 mỗi tuần, trung bình 4 tuần liên tiếp 25/01 – 21/02/2027, và không tuần nào < 20 (sàn tuyệt đối) |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn tự động, báo cáo tuần |
| ☐ | M6-2 | Phủ khu vực — không khu vực MVP nào có 0 sự kiện đang mở — ngưỡng: 6/6 khu vực (An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn) có ≥ 1 sự kiện trong mỗi tuần của 4 tuần đo |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng chéo tuần × khu vực |
| ☐ | M6-3 | WCA — Weekly Confirmed Attendances, số lượt tham dự đã xác nhận (`checked_in`) trong 7 ngày — ngưỡng: 220 – 280 lượt/tuần ở thời điểm M6. Ngưỡng cảnh báo đỏ: < 110 |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `rsvps.status = 'checked_in'` |
| ☐ | M6-4 | Organizer tự quản lý listing của mình (`events.source = 'self_serve'` và `host_user_id` là người thật) — ngưỡng: ≥ 8 organizer |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `events` gộp theo `host_user_id` |
| ☐ | M6-5 | Tỷ lệ sự kiện tự phục vụ trên tổng sự kiện đang mở — ngưỡng: ≥ 35% |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo tuần |
| ☐ | M6-6 | App có mặt trên App Store và Google Play — ngưỡng: Cả hai, trạng thái `available` |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Link cửa hàng công khai |
| ☐ | M6-7 | Web production sống trên tên miền chính, HTTPS, có giám sát — ngưỡng: Đạt |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng giám sát |
| ☐ | M6-8 | Crash-free session, đo 7 ngày trước ra mắt — ngưỡng: ≥ 99,5% |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Sentry |
| ☐ | M6-9 | Beta user hoạt động chuyển tiếp sang bản công khai — ngưỡng: ≥ 100 |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng phân tích |
| ☐ | M6-10 | Runbook sự cố đã diễn tập thật (không phải chỉ viết ra) — ngưỡng: 1 lần diễn tập có biên bản, thời gian phát hiện ≤ 5 phút, khôi phục ≤ 30 phút |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Biên bản diễn tập S9 |
| ☐ | M6-11 | Toàn bộ checklist §12 tích xanh, có tên người ký từng mục — ngưỡng: 100% |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Checklist đã ký |

### 2.4. Demo

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S8-Demo-1 | Bảng lỗi beta: mở đầu sprint bao nhiêu, đóng bao nhiêu, còn lại bao nhiêu | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-Demo-2 | Hai màn hình đã sửa, đặt cạnh ảnh chụp bản cũ, kèm số liệu phễu trước/sau | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-Demo-3 | Mở hai thiết bị cạnh nhau: một máy RSVP → máy kia thấy số chỗ giảm ngay | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-Demo-4 | Duyệt toàn bộ app ở chế độ tiếng Việt, không còn chuỗi lai | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-Demo-1 | Tạo một lớp trao đổi ngôn ngữ lặp mỗi Thứ Ba trong 12 tuần → 12 occurrence hiện ra, RSVP vào một buổi không ảnh hưởng buổi khác | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-Demo-2 | Trình bày trang cửa hàng giả lập với ảnh chụp màn hình và mô tả song ngữ | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-Demo-3 | Xem lại video diễn tập tắt Redis, đọc biên bản thời gian phát hiện / khôi phục | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-Demo-4 | Báo cáo tuần tự động gửi vào email lúc 09:00 Thứ Hai | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |

### 2.5. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | MK-GATE-01 | Nếu giữ cổng swipe: job đo G1 / G2 hằng ngày trên AD-10, bật điểm vào deck khi đạt 3 tuần liên tiếp. |  | Tech Lead | <span class="nw">⬜ Chưa làm</span> | — |

