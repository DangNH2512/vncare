# Checklist M6 · Ra mắt công khai

**Dự án:** Da Nang Connect — Giai đoạn 1 (MVP) · **Trạng thái chụp:** 19/09/2026 · **Ngày chốt:** 01/04/2027

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
- ✂️ **Cắt / hoãn**: ra khỏi phạm vi kịch bản tinh gọn (cắt nhóm A + B, doc 08 §10.2); giữ lại để truy vết, không tính vào tỷ lệ xong.

**Tỷ lệ xong** = Xong / (Tổng − Cắt / hoãn).

**Người phụ trách (đội tinh gọn, doc 08 §9.2):**

- **Founder**: PO, Community Manager, curate, trực kiểm duyệt, quan hệ organizer, pháp lý, tài khoản cửa hàng và D-U-N-S, ký xác nhận người thứ hai (DoD-9). Không viết code.
- **Dev 1**: Backend & Platform, kiêm Tech Lead — `apps/api`, PostGIS, BullMQ, hạ tầng, CI/CD, deploy, trực sự cố.
- **Dev 2**: Product & Web — `apps/web-client-side`, `apps/web-admin-side`, i18n, SEO, PWA, test E2E web.
- **Thuê ngoài**: Designer (trọn gói 4 tuần), QA (2 đợt), dịch giả tiếng Việt.
- Hai tên nối bằng "+" là việc chạm hai bề mặt; người đứng đầu chịu trách nhiệm chính.

**Nhóm việc trong mỗi phase:** Việc chặn & cần chốt → Story → DoD bổ sung → Nghiệm thu → Demo → Việc ngoài SP → Bổ sung từ mockup → Bổ sung kịch bản tinh gọn.

**Nguồn trạng thái:** M0–M1 lấy từ đợt kiểm tra code chỉ đọc ngày 18/09/2026 (có đối chứng độc lập). Các mục "Một phần" của M2–M3 lấy từ ghi chú phiên làm việc 01–02/09, **chưa kiểm chứng lại bằng code**. Story, DoD, demo và tiêu chí nghiệm thu lấy nguyên văn từ `docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md` §6–§7. Nhóm "Bổ sung từ mockup" là việc mới lộ ra từ bộ mockup web ngày 18–19/09 và quyết định của chủ dự án ngày 19/09. **Kịch bản đội:** CH-06 chốt ngày 19/09/2026 theo phương án tinh gọn 2 dev + Founder, cắt nhóm A + B (QĐ-77). Ngày chốt M2–M6, cột Sprint (L0–L12) và người phụ trách theo `08` §9.2 và §10.4; chữ của story, DoD, demo, nghiệm thu giữ nguyên văn, phần điều chỉnh tinh gọn ghi ở cột Ghi chú.

<div class="pb"></div>

## 2. M6 · Ra mắt công khai — chốt 01/04/2027

**Sprint:** L11, L12 · **Tổng:** 54 mục · ✅ 0 · 🟡 0 · ⬜ 36 · ⛔ 0 · ❓ 0 · ⚪ 0 · ✂️ 18 · **Tỷ lệ xong:** 0%

**Mục tiêu:**

- L11 — 01/03 – 12/03/2027: Sửa lỗi beta P0/P1, nạp bản dịch tiếng Việt thuê ngoài, bịt hai chỗ rớt phễu lớn nhất
- L12 — 15/03 – 26/03/2027: SEO, diễn tập runbook, release candidate, đẩy curate lên 25 sự kiện/tuần

**Nếu trượt:** không ra mắt công khai đúng hạn. Lùi ra mắt 2–4 tuần và dồn toàn bộ nguồn lực vào curate + chuyển giao organizer. Ra mắt với một ứng dụng trông đầy nhưng không có dòng chảy là kịch bản hỏng tệ nhất: người dùng mở lần đầu, không thấy gì đáng đi, và không quay lại — không có lần ra mắt thứ hai với cùng một người. Tinh gọn: Không có đệm tiền để lùi lâu (08:1540: sai thì phải gọi vốn hoặc dừng) và ngưỡng dòng chảy không được làm mềm (08:1688), nên trượt gate nghĩa là giả thuyết sai chứ không phải do thiếu tính năng. L11–L12 chỉ xếp 18 SP story trên sức chứa 51; phần dư là đệm sửa lỗi beta, không dùng để thêm tính năng.

### 2.1. Story

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | E7-S5 | WebSocket đếm chỗ realtime (thay polling 30 giây) (13 SP) · SHOULD |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: cắt WebSocket (thu hồi 11 SP); số chỗ cập nhật bằng polling 30 giây khi màn hình đang mở (2 SP còn lại, đi cùng RSVP ở L5) |
| ☐ | E3-S5 | Xem & sửa hồ sơ ngay trong app (8 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn nhánh native; người dùng xem và sửa hồ sơ trên web/PWA |
| ☐ | E3-S4 | Hồ sơ công khai của organizer trên web (5 SP) · SHOULD | L11 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: nhóm C không cắt nên giữ đủ 5 SP |
| ☐ | E10-S2 | Bản dịch tiếng Việt do người dịch, không phải dịch máy (1 SP) · MUST | L11 | Thuê ngoài: Dịch giả | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: dịch giả freelance dịch toàn bộ chuỗi UI + 3 trang nội dung (12 triệu, trọn gói); Dev 2 chỉ nạp file vào packages/i18n; Founder ký hợp đồng và nghiệm thu |
| ☐ | E11-S2 | Tích hợp công cụ phân tích sản phẩm, dựng phễu thật (3 SP) · MUST | L11 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: dùng gói miễn phí của công cụ phân tích, tự động bắt sự kiện; Dev 2 gắn SDK trên web/PWA |
| ☐ | E4-S5 | Hoạt động lặp lại theo tuần (`recurrence_rule` sinh nhiều occurrence) (8 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn tới sau ra mắt; từ L8 Founder nhân bản các buổi lặp lại trong Admin Console, khoảng 20 phút/tuần (TG-M5-7; nút nhân bản ở TG-M5-6) |
| ☐ | E4-S10 | Trang quản lý hoạt động của tôi: sắp diễn ra / đã qua / nháp (4 SP) · MUST | L11 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nhóm B rút gọn 8 → 4 SP: chỉ là danh sách lọc theo `host_user_id`, không có tab nháp / đã qua riêng |
| ☐ | E5-S8 | Chuyển danh sách ↔ bản đồ trên mobile (8 SP) · SHOULD |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn nhánh native; web cũng hoãn bản đồ (E5-S6), thay bằng danh sách nhóm theo 6 khu vực MVP |
| ☐ | E6-S8 | Số chỗ còn lại cập nhật realtime trên mobile (8 SP) · SHOULD |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn nhánh native; trên web/PWA số chỗ cập nhật bằng polling 30 giây |
| ☐ | E11-S3 | Báo cáo tuần tự động (5 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: cắt; Founder đọc bảng BI 10 phút mỗi sáng Thứ Hai, bắt đầu từ L8 (TG-M5-12) |
| ☐ | E11-S4 | Link mời bạn có ghi nhận (5 SP) · SHOULD |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn tới sau ra mắt; không đo được kênh giới thiệu trong 2 tháng đầu |
| ☐ | E11-S5 | SEO cho truy vấn "things to do in Da Nang this week" (5 SP) · MUST | L12 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: nhóm C GIỮ NGUYÊN: kênh tăng trưởng gần như miễn phí duy nhất khi không có cửa hàng ứng dụng |
| ☐ | E12-S4 | Mô tả cửa hàng song ngữ + ảnh chụp màn hình (5 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn cùng toàn bộ E12; mô tả song ngữ + ảnh chụp màn hình chuyển sang bộ truyền thông ra mắt (TG-M6-6) |
| ☐ | E12-S6 | App được duyệt và có mặt trên cả hai cửa hàng đúng ngày (5 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: không có mặt trên App Store / Google Play ở M6; ra mắt bằng web/PWA |
| ☐ | E5-S10 | Lưu bộ lọc yêu thích, lưu hoạt động xem sau (5 SP) · COULD |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn; người dùng lọc lại mỗi lần vào |

### 2.2. DoD bổ sung

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S8-DoD-1 | Không còn P0 nào mở. P1 còn mở ≤ 3, mỗi cái có ngày hẹn | L11 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: không có QA thường trực: hai dev kiểm chéo, Founder ký người thứ hai (DoD-9) |
| ☐ | S8-DoD-2 | Hai chỗ rớt phễu lớn nhất đã có thay đổi cụ thể và đo lại được — ghi rõ "trước / sau" trong issue | L11 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Founder chọn hai điểm rớt từ phễu beta L10; Dev 2 sửa trên web/PWA và đo lại |
| ☐ | S8-DoD-3 | Bản dịch tiếng Việt được một người Việt không thuộc đội đọc lại toàn bộ, chấm ≥ 4/5 về độ tự nhiên | L11 | Founder | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: người đọc lại phải ngoài đội và khác dịch giả thuê ngoài; Dev 2 nạp bản đã sửa |
| ☐ | S8-DoD-4 | Thời gian tải danh sách khám phá trên 4G mô phỏng < 2,5 giây tới nội dung đầu tiên | L11 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: đo trên trang khám phá web/PWA (không có app native); phần tối ưu cho điện thoại đã làm ở L9 |
| ☐ | S8-DoD-5 | Realtime: nếu WebSocket rớt thì tự hạ cấp về polling 30 giây, không hiện lỗi cho người dùng |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: cắt cùng E7-S5; polling 30 giây là cơ chế duy nhất và vẫn không được hiện lỗi cho người dùng |
| ☐ | S9-DoD-1 | Sự kiện lặp lại: `recurrence_rule` sinh occurrence trước 12 tuần, sửa một buổi không ảnh hưởng các buổi khác, huỷ chuỗi hỏi rõ "buổi này hay tất cả buổi sau" |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: cắt cùng E4-S5; thay bằng Founder nhân bản thủ công trong Admin Console (TG-M5-7) |
| ☐ | S9-DoD-2 | Release candidate `v1.0.0-rc.1` đã dựng bằng profile `production`, đã chạy hồi quy đầy đủ, không có lỗi chặn | L12 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: RC là bản web/PWA + API dựng cho production (không có profile EAS); hồi quy do QA thuê ngoài đợt 2 (TG-M6-5) cùng Playwright của Dev 2 |
| ☐ | S9-DoD-3 | Trang chỉ mục theo khu vực và theo loại hình đã sinh sitemap, đã submit Search Console; Lighthouse SEO ≥ 95 trên 5 trang mẫu | L12 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Founder cấp quyền Search Console (tài khoản Google do Founder giữ) |
| ☐ | S9-DoD-4 | Diễn tập runbook sự cố thật: cố ý tắt Redis trên staging trong giờ làm việc → đo thời gian phát hiện (mục tiêu ≤ 5 phút) và thời gian khôi phục (mục tiêu ≤ 30 phút); biên bản diễn tập lưu lại | L12 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Dev 1 xử lý sự cố, Dev 2 bấm giờ và ghi biên bản, Founder ký chứng kiến |
| ☐ | S9-DoD-5 | Ảnh chụp màn hình cửa hàng dùng dữ liệu thật đã được phép, không dùng ảnh người không có đồng ý | L12 | Founder | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: không có cửa hàng; áp dụng cho ảnh chụp màn hình trong bộ truyền thông ra mắt và ảnh OG (nguyên tắc đồng ý theo Luật 91/2025) |
| ☐ | S9-DoD-6 | Tài khoản demo cho reviewer cửa hàng đã tạo, có sẵn dữ liệu, thông tin đăng nhập đã ghi vào App Review Notes |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: không nộp cửa hàng ở M6 nên không cần tài khoản cho reviewer |
| ☐ | S10-DoD-1 | Toàn bộ checklist §12 đã tích xanh, có tên người ký từng mục | L12 | Founder + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: các dòng §12 chỉ dành cho cửa hàng/native ghi N/A có chữ ký Founder; ký xong trước go/no-go cuối L12 (TG-M6-1) |
| ☐ | S10-DoD-2 | Chuông báo (alerting) đã bật cho: tỷ lệ lỗi 5xx > 1%, độ trễ p95 > 800 ms, hàng đợi BullMQ tồn > 500 job, Postgres kết nối > 80% | L12 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S10-DoD-3 | Có phương án lùi (rollback) đã thử: web lùi trong ≤ 5 phút, mobile vá bằng EAS Update trong ≤ 30 phút | L12 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: chỉ còn phần web + API (lùi bằng script deploy một lệnh); phần EAS Update không áp dụng vì không có app native |
| ☐ | S10-DoD-4 | War-room có kênh riêng, danh sách trực theo giờ, số điện thoại dự phòng | L12 | Founder | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: war-room chỉ có 3 người: Dev 1 (API/hạ tầng), Dev 2 (web/PWA), Founder (cộng đồng + report P0 SLA 2 giờ); mở trong tuần ra mắt 29/03 – 02/04/2027 |

### 2.3. Nghiệm thu

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | M6-1 | Sự kiện đang mở mỗi tuần — đếm số occurrence có `status = 'published'`, `starts_at` rơi trong tuần đó và còn nhận RSVP — ngưỡng: ≥ 25 mỗi tuần, trung bình 4 tuần liên tiếp 25/01 – 21/02/2027, và không tuần nào < 20 (sàn tuyệt đối) |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn tự động, báo cáo tuần. Tinh gọn: ngưỡng không làm mềm; báo cáo tuần tự động đã cắt nên số lấy từ bảng BI Founder đọc mỗi Thứ Hai (TG-M5-12); cửa sổ 4 tuần phải dời theo mốc 01/04/2027 (TG-M6-1) |
| ☐ | M6-2 | Phủ khu vực — không khu vực MVP nào có 0 sự kiện đang mở — ngưỡng: 6/6 khu vực (An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn) có ≥ 1 sự kiện trong mỗi tuần của 4 tuần đo |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng chéo tuần × khu vực. Tinh gọn: ngưỡng giữ nguyên; bảng chéo tuần × khu vực dựng trên công cụ BI (E9-S5); cửa sổ đo dời theo mốc 01/04/2027 |
| ☐ | M6-3 | WCA — Weekly Confirmed Attendances, số lượt tham dự đã xác nhận (`checked_in`) trong 7 ngày — ngưỡng: 220 – 280 lượt/tuần ở thời điểm M6. Ngưỡng cảnh báo đỏ: < 110 |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `rsvps.status = 'checked_in'`. Tinh gọn: ngưỡng không làm mềm; `checked_in` sinh từ việc organizer tick tay (E6-S5 rút gọn) |
| ☐ | M6-4 | Organizer tự quản lý listing của mình (`events.source = 'self_serve'` và `host_user_id` là người thật) — ngưỡng: ≥ 8 organizer |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `events` gộp theo `host_user_id`. Tinh gọn: organizer tự quản qua danh sách lọc theo `host_user_id` (E4-S10 rút gọn) |
| ☐ | M6-5 | Tỷ lệ sự kiện tự phục vụ trên tổng sự kiện đang mở — ngưỡng: ≥ 35% |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo tuần. Tinh gọn: báo cáo tuần tự động đã cắt; tỷ lệ tự phục vụ đọc trên bảng BI mỗi Thứ Hai (TG-M5-12, thêm chỉ số này vào bảng từ L11) |
| ☐ | M6-6 | App có mặt trên App Store và Google Play — ngưỡng: Cả hai, trạng thái `available` |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Bằng chứng: Link cửa hàng công khai. Tinh gọn: không phát hành trên cửa hàng ở M6; bù bằng SEO (E11-S5) và chia sẻ link web/PWA trong các nhóm expat (TG-M6-6) |
| ☐ | M6-7 | Web production sống trên tên miền chính, HTTPS, có giám sát — ngưỡng: Đạt |  | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng giám sát. Tinh gọn: đây là kênh ra mắt chính (PWA thay app native) |
| ☐ | M6-8 | Crash-free session, đo 7 ngày trước ra mắt — ngưỡng: ≥ 99,5% |  | Dev 2 + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Sentry. Tinh gọn: đo crash-free session của web/PWA bằng Sentry (không có app native); Dev 1 cấu hình Sentry, Dev 2 sửa lỗi phía client |
| ☐ | M6-9 | Beta user hoạt động chuyển tiếp sang bản công khai — ngưỡng: ≥ 100 |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng phân tích. Tinh gọn: beta tinh gọn chỉ có 60 user nên không thể đạt ngưỡng ≥ 100 từ beta; Founder chốt lại ngưỡng (TG-M6-1) |
| ☐ | M6-10 | Runbook sự cố đã diễn tập thật (không phải chỉ viết ra) — ngưỡng: 1 lần diễn tập có biên bản, thời gian phát hiện ≤ 5 phút, khôi phục ≤ 30 phút |  | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Biên bản diễn tập S9. Tinh gọn: diễn tập ở L12 thay vì S9 |
| ☐ | M6-11 | Toàn bộ checklist §12 tích xanh, có tên người ký từng mục — ngưỡng: 100% |  | Founder + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Checklist đã ký. Tinh gọn: các dòng §12 chỉ dành cho cửa hàng/native ghi N/A có chữ ký Founder; hạn ký dời theo ngày go/no-go tinh gọn (TG-M6-1) |

### 2.4. Demo

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S8-Demo-1 | Bảng lỗi beta: mở đầu sprint bao nhiêu, đóng bao nhiêu, còn lại bao nhiêu | L11 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-Demo-2 | Hai màn hình đã sửa, đặt cạnh ảnh chụp bản cũ, kèm số liệu phễu trước/sau | L11 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-Demo-3 | Mở hai thiết bị cạnh nhau: một máy RSVP → máy kia thấy số chỗ giảm ngay |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: cắt cùng E7-S5; với polling 30 giây, máy kia chỉ thấy số chỗ giảm sau tối đa 30 giây |
| ☐ | S8-Demo-4 | Duyệt toàn bộ app ở chế độ tiếng Việt, không còn chuỗi lai | L11 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: duyệt trên web/PWA (không có app native); chuỗi sai trả lại dịch giả thuê ngoài sửa |
| ☐ | S9-Demo-1 | Tạo một lớp trao đổi ngôn ngữ lặp mỗi Thứ Ba trong 12 tuần → 12 occurrence hiện ra, RSVP vào một buổi không ảnh hưởng buổi khác |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: cắt cùng E4-S5; thay bằng Founder nhân bản buổi học trong Admin Console (TG-M5-7) |
| ☐ | S9-Demo-2 | Trình bày trang cửa hàng giả lập với ảnh chụp màn hình và mô tả song ngữ |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: không có trang cửa hàng ở M6 |
| ☐ | S9-Demo-3 | Xem lại video diễn tập tắt Redis, đọc biên bản thời gian phát hiện / khôi phục | L12 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-Demo-4 | Báo cáo tuần tự động gửi vào email lúc 09:00 Thứ Hai |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: cắt cùng E11-S3; Founder đọc bảng BI mỗi sáng Thứ Hai (TG-M5-12) |

### 2.5. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | MK-GATE-01 | Nếu giữ cổng swipe: job đo G1 / G2 hằng ngày trên AD-10, bật điểm vào deck khi đạt 3 tuần liên tiếp. |  | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: nằm ngoài 359 SP của kịch bản tinh gọn; chỉ làm nếu còn đệm ở L11–L12, không chặn ra mắt |

### 2.6. Bổ sung kịch bản tinh gọn

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | TG-M6-1 | Chốt bản tinh gọn của checklist §12 và gate M6: ghi N/A có chữ ký cho các dòng chỉ dành cho cửa hàng/native hoặc thuộc story đã cắt (§12.2, phần EAS của P-11, phần mobile của M-01, M-03); P-08 đổi sang crash-free session của web/PWA (khớp M6-8); P-01 tính story MUST của L0 → L12 trừ mục Cắt / hoãn; M-06 còn một sự kiện ra mắt; đổi vai ký QA / Mobile / Frontend / Backend / Tech Lead / Community Manager / Designer sang Founder / Dev 1 / Dev 2, giữ nguyên chữ ký Luật sư ở §12.4; dời hạn ký, ngày go/no-go và cửa sổ đo 4 tuần theo mốc 01/04/2027 · MUST | L11 | Founder + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Founder chốt lại ngưỡng M6-9 vì beta chỉ có 60 user; các ngưỡng dòng chảy M6-1/-2/-3 giữ nguyên |
| ☐ | TG-M6-4 | Founder đẩy curate lên ≥ 25 sự kiện đang mở mỗi tuần, đủ 6 khu vực MVP, và lấp sẵn lịch 4 tuần sau ra mắt · MUST | L12 | Founder | <span class="nw">⬜ Chưa làm</span> | chỉ một mình Founder curate (không có Community Manager); phải đạt 25/tuần ngay từ đầu cửa sổ đo 4 tuần, không phải đến cuối L12 mới đạt |
| ☐ | TG-M6-5 | Thuê QA ngoài đợt 2 (1 tuần, 15 triệu) chạy hồi quy đầy đủ trên release candidate web/PWA trước ra mắt, gồm cài PWA và nhận Web Push trên Android Chrome và iPhone iOS ≥ 16.4 thật · MUST | L12 | Thuê ngoài: QA | <span class="nw">⬜ Chưa làm</span> | Dev 2 bàn giao bộ ca Playwright và tài khoản test, Dev 1 cấp môi trường RC; Founder ký hợp đồng và xác nhận kết quả (DoD-9) |
| ☐ | TG-M6-6 | Truyền thông ra mắt theo bản tinh gọn: chia sẻ link web/PWA trong các nhóm Facebook expat Đà Nẵng thay cho kênh cửa hàng ứng dụng, tổ chức một sự kiện ra mắt thay vì hai, không chạy quảng cáo trả tiền · MUST | L12 | Founder | <span class="nw">⬜ Chưa làm</span> | Dev 2 chụp ảnh màn hình cho bộ truyền thông (gói Designer trọn gói đã kết thúc từ GĐ A); chỉ dùng ảnh đã có đồng ý (S9-DoD-5) |

