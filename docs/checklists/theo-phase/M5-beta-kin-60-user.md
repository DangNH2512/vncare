# Checklist M5 · Beta kín 60 user

**Dự án:** Da Nang Connect — Giai đoạn 1 (MVP) · **Trạng thái chụp:** 19/09/2026 · **Ngày chốt:** 26/02/2027

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

## 2. M5 · Beta kín 60 user — chốt 26/02/2027

**Sprint:** L8, L9, L10 · **Tổng:** 64 mục · ✅ 0 · 🟡 0 · ⬜ 58 · ⛔ 0 · ❓ 0 · ⚪ 0 · ✂️ 6 · **Tỷ lệ xong:** 0%

**Mục tiêu:**

- L8 — 04/01 – 15/01/2027: Admin Curation Console + luồng chuyển giao organizer (NT-1, không cắt)
- L9 — 18/01 – 29/01/2027: PWA: manifest, service worker, add-to-home, tối ưu điện thoại; xuất & xoá dữ liệu cá nhân
- L10 — 15/02 – 26/02/2027: Beta kín 60 user (giảm từ 100 vì không còn kênh cửa hàng ứng dụng), trực hotfix hằng ngày

**Nếu trượt:** M5 có 2 tuần đệm tự nhiên (đóng băng cuối năm + S8). Nếu M5-7 trượt vì Play closed testing bắt đầu muộn thì đây là rủi ro chặn M6 — xem §8.3. Tinh gọn: Không còn 2 tuần đệm, và M5-7 đã hoãn cùng E12. Đóng băng Tết 01–12/02/2027 nằm giữa L9 và L10 nên E8-S7, PWA và thư xác nhận Privacy Policy của luật sư (M4-9) phải xong trong L9. M5 trượt thì M6 01/04/2027 trượt theo, vì L11 bắt đầu ngay 01/03/2027.

### 2.1. Story

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | E9-S2 | Nhập sự kiện công khai vào hệ thống < 3 phút, có ghi nguồn (8 SP) · MUST | L8 | Dev 2 + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Giữ nguyên 100% theo NT-1; Founder kiêm Community Manager là người nhập |
| ☐ | E9-S3 | Lời mời organizer gốc nhận quyền quản lý listing (8 SP) · MUST | L8 | Dev 1 + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Giữ nguyên 100% theo NT-1; Founder gửi lời mời và giữ quan hệ organizer |
| ☐ | E9-S4 | Quản lý người dùng, khu vực, loại hình hoạt động (5 SP) · MUST | L8 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Giữ nguyên 5 SP vì không cắt nhóm C (Founder không phải chạy SQL trực tiếp trên production); thao tác gán tay T4/T5 đã nằm ở E3-S3 (L7, TG-M4-1), không làm lại ở đây |
| ☐ | E9-S5 | Bảng điều khiển vận hành cho Founder (2 SP) · MUST | L8 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nhóm B dịch vụ có sẵn 8 → 2 SP: nối công cụ BI vào bản sao đọc của DB (tài khoản chỉ đọc), Founder tự dựng biểu đồ; không tự code dashboard |
| ☐ | E6-S5 | Điểm danh tại chỗ bằng mã QR (2 SP) · MUST | L8 | Dev 1 + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nhóm B rút gọn 8 → 2 SP: bỏ mã QR, organizer tick tay trong danh sách người tham gia trên web/PWA (Dev 2); API vẫn ghi `checked_in` + `attendance_confirmed` (Dev 1) |
| ☐ | E6-S6 | Ghi `no_show_recorded` vào `trust_signals` (5 SP) · MUST | L9 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Job chạy trên dữ liệu điểm danh tick tay của E6-S5; phải chạy trước ngày mở beta |
| ☐ | E3-S6 | Xác minh số điện thoại bằng OTP (2 SP) · MUST | L8 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nhóm B dịch vụ có sẵn 5 → 2 SP: dùng nhà cung cấp OTP (khoảng 400 đồng/tin); trần gửi, hạn mã và chống brute-force vẫn tự áp ở API. Nếu CH-01 (M1) chốt bắt buộc xác thực SĐT cho mọi tài khoản thì phải kéo story này lên luồng đăng ký ở L1–L2 |
| ☐ | E8-S6 | Chống spam: trần số hoạt động/ngày, lọc từ khoá, chặn link đáng ngờ (5 SP) · MUST | L9 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E8-S7 | Xuất dữ liệu cá nhân + yêu cầu xoá tài khoản (5 SP) · MUST | L9 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Không bao giờ cắt (Luật 91/2025/QH15); phải xong trong L9, trước ngày mở beta 15/02/2027 |
| ☐ | E12-S2 | Icon, splash, ảnh cửa hàng (3 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Hoãn cùng toàn bộ E12 (không phát hành cửa hàng ở M6); icon/splash cho PWA lấy từ gói Designer thuê ngoài, xem TG-M5-1 |
| ☐ | E12-S3 | TestFlight + Play closed testing (5 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Hoãn tới sau ra mắt; beta phát qua link web/PWA (TG-M5-8); Founder giữ trong backlog hậu ra mắt |
| ☐ | E12-S5 | EAS Update để vá nhanh không cần chờ duyệt (3 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Không cần khi chỉ có PWA: deploy web bằng lệnh một bước là kênh vá nhanh; làm lại khi phát hành native sau ra mắt |
| ☐ | E11-S1 | Lược đồ sự kiện phân tích thống nhất web + mobile (5 SP) · MUST | L10 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Chỉ web/PWA + server, bỏ vế mobile native; phải bắn được trước khi mời đợt 1 beta |
| ☐ | E6-S4 | Xem danh sách người tham gia trong giới hạn quyền riêng tư (5 SP) · SHOULD | L10 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Giữ nguyên vì không cắt nhóm C (ảnh hưởng cảm giác an toàn) |
| ☐ | E5-S9 | "Tuần này có gì" ngay trên màn hình đầu (5 SP) · MUST | L10 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Chỉ làm trên web/PWA; phần mobile native hoãn theo nhóm A |
| ☐ | E7-S7 | Tắt riêng từng loại thông báo (2 SP) · SHOULD | L10 | Dev 2 + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nhóm B rút gọn 5 → 2 SP: một công tắc tổng trên web + link huỷ đăng ký trong email (Dev 1); không được cắt hết vì Luật 91/2025 có quyền phản đối xử lý |
| ☐ | E6-S9 | Xuất danh sách người tham gia ra CSV (3 SP) · SHOULD | L10 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Giữ nguyên vì không cắt nhóm C |
| ☐ | E10-S3 | About / FAQ / Community Guidelines song ngữ (3 SP) · MUST | L10 | Founder + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Giữ nguyên 3 SP vì không cắt nhóm C; Founder viết bản EN, Thuê ngoài: Dịch giả dịch bản VI, Dev 2 dựng trang; Guidelines song ngữ đã có từ M4 (M4-8, TG-M4-3), L10 còn About và FAQ |

### 2.2. DoD bổ sung

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S6-DoD-1 | Bấm đồng hồ: Community Manager nhập một sự kiện thật từ một bài đăng công khai → ≤ 3 phút, đo trên 5 sự kiện khác nhau, lấy trung vị | L8 | Founder + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Founder kiêm Community Manager tự bấm đồng hồ; Dev 2 tối ưu form console |
| ☐ | S6-DoD-2 | Mọi listing curate bắt buộc có: `source = 'curated'`, trường nguồn gốc, nhãn hiển thị "Listed by Da Nang Connect from a public post — not managed by the organiser", và nút gỡ ngay trên trang công khai | L8 | Dev 2 + Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-3 | Không có chức năng scraping nào trong repo. `grep -rniE "puppeteer\|playwright-scrape\|cheerio\|scrape"` trong `apps/api` phải rỗng (trừ dev-dependency test) | L8 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-4 | Luồng nhận quyền: mã mời một lần, hết hạn 14 ngày, dùng rồi vô hiệu; nhận quyền xong `source` đổi `curated` → `self_serve`, `host_user_id` chuyển sang organizer thật, người curate cũ chuyển thành `event_cohosts` với `role_in_event = 'listed_by'` | L8 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-5 | Điểm danh QR: mã xoay theo thời gian, không dùng lại được; quét xong `rsvps.status` = `checked_in` và sinh tín hiệu `attendance_confirmed` | L8 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Theo E6-S5 rút gọn: bỏ vế mã QR xoay; kiểm tra thay bằng organizer tick tay → `checked_in` + `attendance_confirmed`, chỉ host của occurrence được tick, không tick lặp |
| ☐ | S6-DoD-6 | Job đóng occurrence chạy T+3h sau `ends_at`: ai `going` mà không `checked_in` → `no_show`, sinh `no_show_recorded` | L9 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-7 | Xuất & xoá dữ liệu (E8-S7) phải xong trước ngày mở beta. Xuất trả gói JSON + ảnh trong ≤ 72 giờ; xoá thực hiện xoá cứng dữ liệu định danh và giữ bản ghi ẩn danh cho thống kê, có mô tả trong Privacy Policy | L9 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Hạn trước ngày mở beta = hết L9 (29/01/2027); Founder bổ sung phần mô tả xuất & xoá vào Privacy Policy và luật sư xác nhận lại, nối tiếp M4-9 |
| ☐ | S6-DoD-8 | OTP: giới hạn 5 lần gửi/số/ngày, mã 6 số, hết hạn 5 phút, chống brute-force | L8 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Dùng nhà cung cấp OTP sẵn có (E3-S6); các giới hạn vẫn cưỡng chế ở API, không phó mặc nhà cung cấp |
| ☐ | S6-DoD-9 | Build `production` đã nộp TestFlight và đã tạo track closed testing trên Play với ≥ 12 tester — đồng hồ 14 ngày bắt đầu chạy chậm nhất 11/12/2026 |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Không nộp TestFlight/Play ở M6; làm lại khi phát hành native sau ra mắt |
| ☐ | S7-DoD-1 | 15 sự kiện phân tích ở §5.12 đều bắn được từ cả web lẫn mobile, cùng tên thuộc tính, kiểm tra bằng bảng đối chiếu | L10 | Dev 1 + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Đối chiếu web/PWA với server, bỏ vế mobile native; `app_open` tính là mở web/PWA |
| ☐ | S7-DoD-2 | Crash-free session ≥ 99% đo trên 7 ngày cuối sprint | L10 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Đo bằng Sentry release health cho phiên web/PWA, không còn app native |
| ☐ | S7-DoD-3 | Toàn bộ P0 và P1 phát hiện trong beta được ghi vào backlog S8 với mức ưu tiên và người nhận | L10 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Ghi vào backlog L11 (sửa lỗi beta P0/P1) thay cho S8 |
| ☐ | S7-DoD-4 | Bảng tổng hợp 15 cuộc phỏng vấn có ít nhất 5 phát hiện có hành động kèm story tương ứng | L10 | Founder | <span class="nw">⬜ Chưa làm</span> | — |

### 2.3. Nghiệm thu

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | M5-1 | Tài khoản beta thật đã kích hoạt — ngưỡng: ≥ 100 |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `users`. Tinh gọn: Beta tinh gọn chỉ 60 user nên ngưỡng 100 không thể đạt — Founder chốt lại ngưỡng; Dev 1 chạy truy vấn bằng chứng |
| ☐ | M5-2 | Beta user hoạt động (mở app ≥ 2 lần trong 14 ngày cuối) — ngưỡng: ≥ 70 |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng phân tích. Tinh gọn: Ngưỡng 70 vượt tổng 60 user beta — cần chốt lại; mở app tính là mở web/PWA |
| ☐ | M5-3 | Sự kiện đã curate trong hệ thống — ngưỡng: ≥ 60 |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `events` |
| ☐ | M5-4 | Dòng chảy trong beta: sự kiện đang mở mỗi tuần, đo 4 tuần liên tiếp — ngưỡng: ≥ 15/tuần, không tuần nào < 10 |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo tuần. Tinh gọn: Cửa sổ 4 tuần tới 26/02/2027 trùng đóng băng Tết 01–12/02 — Founder vẫn phải curate trong Tết |
| ☐ | M5-5 | Không khu vực MVP nào có 0 sự kiện đang mở trong 4 tuần liên tiếp — ngưỡng: 6/6 khu vực có mặt |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng theo khu vực |
| ☐ | M5-6 | RSVP thật (không phải tài khoản test) — ngưỡng: ≥ 200 |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `rsvps`. Tinh gọn: Với 60 user cần ≈ 3,3 RSVP thật mỗi người — chốt lại ngưỡng cùng M5-1 |
| ☐ | M5-7 | TestFlight chạy ổn định + Play closed testing đủ 14 ngày liên tục — ngưỡng: Đủ 14 ngày |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Bằng chứng: Ảnh Play Console. Tinh gọn: Không có TestFlight/Play closed testing ở M6; đồng hồ 14 ngày chạy lại khi phát hành native sau ra mắt |
| ☐ | M5-8 | Crash-free session, đo 7 ngày cuối — ngưỡng: ≥ 99% |  | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Sentry. Tinh gọn: Đo bằng Sentry release health cho phiên web/PWA |
| ☐ | M5-9 | Phỏng vấn sâu người dùng — ngưỡng: ≥ 15 cuộc |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bản ghi + tổng hợp |
| ☐ | M5-10 | Xuất & xoá dữ liệu cá nhân hoạt động thật (đã thử trên 1 tài khoản thật) — ngưỡng: Đạt |  | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Gói dữ liệu xuất ra. Tinh gọn: Founder thử trên tài khoản thật và ký xác nhận người thứ hai (DoD-9) |

### 2.4. Demo

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S6-Demo-1 | Community Manager nhập 3 sự kiện thật trên màn hình, bấm đồng hồ từng lần | L8 | Founder | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Founder làm thay Community Manager |
| ☐ | S6-Demo-2 | Gửi lời mời tới hộp thư của một organizer thật đang hợp tác → organizer bấm link, đăng nhập, nhận quyền → sự kiện đổi chủ ngay trước mắt | L8 | Founder + Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-Demo-3 | In một mã QR, quét bằng app trên Android thật → điểm danh thành công, trust signal xuất hiện | L8 | Dev 2 + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Thay QR bằng organizer tick tay trên web/PWA ở Android thật → điểm danh thành công, `attendance_confirmed` xuất hiện |
| ☐ | S6-Demo-4 | Bảng điều khiển Founder: số hoạt động tuần này, RSVP, report đang chờ, tỷ lệ `curated → self_serve` | L8 | Founder + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Biểu đồ dựng trên công cụ BI nối bản sao đọc (E9-S5 dịch vụ có sẵn) |
| ☐ | S6-Demo-5 | Yêu cầu xuất dữ liệu của tài khoản demo → tải về file JSON, mở ra đọc được | L9 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-Demo-6 | Cài app từ TestFlight lên iPhone thật ngay trong buổi demo | L9 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Thay TestFlight bằng thêm PWA vào màn hình chính trên iPhone thật (iOS ≥ 16.4), mở ở chế độ standalone |
| ☐ | S7-Demo-1 | Bảng điều khiển: 100 tài khoản beta thật, biểu đồ kích hoạt theo ngày | L10 | Founder | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Còn 60 tài khoản beta; biểu đồ kích hoạt dựng trên công cụ BI |
| ☐ | S7-Demo-2 | Phễu thật đọc từ công cụ phân tích: `app_open` → `discover_viewed` → `event_viewed` → `rsvp_completed`, kèm tỷ lệ rớt từng bước | L10 | Founder + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: `app_open` tính là mở web/PWA; cần công cụ phân tích E11-S2 chạy từ L10 |
| ☐ | S7-Demo-3 | Ba trích đoạn phỏng vấn video, mỗi đoạn 60 giây, kèm việc đội sẽ làm với nó | L10 | Founder | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-Demo-4 | Bảng Sentry: crash-free session của 7 ngày cuối | L10 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Crash-free của phiên web/PWA |
| ☐ | S7-Demo-5 | Xác nhận Play closed testing đã chạy đủ 14 ngày liên tục |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Không có Play closed testing ở M6 |

### 2.5. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | MK-ADMIN-01 | Console quản trị tin tức song ngữ (soạn, hẹn giờ đăng, evergreen, gắn sự kiện liên quan) + gắn events.source khi curate. |  | Dev 2 | <span class="nw">⬜ Chưa làm</span> | apps/web-admin-side chưa khởi tạo. Tinh gọn: Không nằm trong 359 SP tinh gọn — Founder chốt có làm trước beta không; nếu làm thì đi cùng L8 |

### 2.6. Bổ sung kịch bản tinh gọn

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | TG-M5-1 | Hoàn thiện PWA cho apps/web-client-side: manifest đầy đủ (bộ icon, màu, splash iOS, chế độ standalone) và mở rộng service worker sẵn có của Web Push để cache khung ứng dụng + trang offline (5 SP) · MUST | L9 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Service worker nhận push đã có từ E7-S3 (L6); một scope chỉ có một service worker nên phải mở rộng cái đó, không đăng ký cái thứ hai. Nếu Founder + Dev 1 chọn kéo manifest tối thiểu vào E7-S3 ở L6 (xem note E7-S3 ở M3) thì L9 chỉ hoàn thiện, nếu không thì manifest làm trọn ở đây. Ước tính tách từ 13 SP PWA còn lại (16 SP trừ 3 SP Web Push); icon/splash lấy từ gói Designer (TG-M2-1); Dev 1 cấu hình header/cache phía hosting |
| ☐ | TG-M5-2 | Luồng thêm vào màn hình chính: gợi ý cài trên Chrome/Android và trang hướng dẫn Share → Add to Home Screen trên iOS ≥ 16.4 (điều kiện để Web Push chạy trên iPhone) (3 SP) · MUST | L9 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Ước tính trong 13 SP PWA; thay kênh cài TestFlight/Play closed testing cho beta vì E12 hoãn |
| ☐ | TG-M5-3 | Tối ưu web trên điện thoại cho các màn lõi: khám phá, chi tiết, RSVP, form tạo sự kiện một trang (dán được link Google Maps để lấy địa điểm), danh sách người tham gia để organizer tick điểm danh (5 SP) · MUST | L9 | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Bù cho việc hoãn tạo sự kiện trên mobile (E4-S7; 08:1570, 08:1696) và rút gọn điểm danh QR (E6-S5). Dev 1 giải link rút gọn Google Maps ra toạ độ ở server. Ước tính 5 trong 13 SP PWA. Phần dán link Google Maps nằm trọn ở đây |
| ☐ | TG-M5-4 | Đợt kiểm thử QA thuê ngoài số 1 (1 tuần) trên staging trước khi mở beta: đăng ký, khám phá theo khu vực, RSVP + waitlist, curate + nhận quyền, xuất & xoá dữ liệu, PWA trên Android và iPhone thật · MUST | L9 | Thuê ngoài: QA | <span class="nw">⬜ Chưa làm</span> | 15 triệu/đợt; Dev 2 bàn giao kịch bản + bộ Playwright E2E, Dev 1 giữ staging ổn định; Founder ký nghiệm thu thay QA thường trực (DoD-9) |
| ☐ | TG-M5-6 | Nút nhân bản sự kiện trong Admin Curation Console (sao chép sang ngày mới, giữ nguồn và khu vực) để thay sự kiện lặp lại E4-S5 đã hoãn · SHOULD | L8 | Dev 2 + Dev 1 | <span class="nw">⬜ Chưa làm</span> | §10.2 không cho SP riêng — cần ước lượng khi lên kế hoạch L8; Dev 1 làm API sao chép |
| ☐ | TG-M5-7 | Founder nhân bản tay các sự kiện lặp lại hằng tuần (lớp học, nhóm thể thao...) trong Admin Console, ≈ 20 phút/tuần | L8 | Founder | <span class="nw">⬜ Chưa làm</span> | Việc vận hành lặp lại từ L8 cho tới khi làm lại E4-S5 sau ra mắt |
| ☐ | TG-M5-8 | Mời beta kín 60 user theo 2 đợt qua link web/PWA, kèm hướng dẫn thêm vào màn hình chính (thay TestFlight + Play closed testing) · MUST | L10 | Founder | <span class="nw">⬜ Chưa làm</span> | Dev 2 cung cấp trang hướng dẫn cài (TG-M5-2); Founder chốt cách chia đợt và chỉ tiêu kích hoạt |
| ☐ | TG-M5-9 | Trực hotfix hằng ngày trong beta: đọc Sentry mỗi sáng, P0 vá trong ngày bằng lệnh deploy một bước · MUST | L10 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Dev 2 vá lỗi phía web; không còn EAS Update nên deploy web là kênh vá nhanh duy nhất; chấp nhận lỗi lọt staging nhiều hơn vì không có QA thường trực |
| ☐ | TG-M5-10 | Đóng băng chuỗi UI EN và gửi gói chuỗi + 2 trang nội dung còn lại (About / FAQ) cho dịch giả thuê ngoài, để kịp nạp bản dịch ở L11 · MUST | L10 | Founder + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Hợp đồng dịch giả trọn gói 12 triệu đã ký từ L7, khi đặt dịch trước Guidelines (TG-M4-3); không ký lại ở đây. Founder gửi gói chuỗi UI (gồm template thông báo của E7-S2) + About/FAQ; Dev 2 xuất file khoá từ packages/i18n; việc nạp bản dịch thuộc E10-S2 (L11). L10 đã sang GĐ C trong khi ngân sách dịch giả ghi ở GĐ B (08:1791) |
| ☐ | TG-M5-12 | Founder đọc bảng BI 10 phút mỗi sáng Thứ Hai và ghi số tuần (sự kiện đang mở, phủ 6 khu vực, tài khoản kích hoạt, RSVP thật; từ L11 thêm WCA và tỷ lệ tự phục vụ của gate M6), thay cho báo cáo tuần tự động E11-S3 đã cắt · MUST | L8 | Founder | <span class="nw">⬜ Chưa làm</span> | Bắt đầu khi E9-S5 nối xong BI ở L8 và chạy liên tục tới hết cửa sổ đo gate M6. Đây là bằng chứng 'Báo cáo tuần' của M5-4, M5-5 và của M6-1, M6-2, M6-3, M6-5, nên vẫn ghi cả hai tuần đóng băng Tết. |
| ☐ | TG-M5-13 | Điểm kiểm soát ngân sách tinh gọn tại M5: người thật có dùng không, có ≥ 15 sự kiện đang mở mỗi tuần không? Nếu không: không ra mắt · MUST | L10 | Founder | <span class="nw">⬜ Chưa làm</span> | §11.4 vẫn ghi 25/12/2026, ≈ 510 triệu và '100 người thật' cho cột tinh gọn; theo lịch tinh gọn phải xét ngày 26/02/2027 với beta 60 user và tính lại số đã tiêu. Phương án 'kéo dài beta thêm 6 tuần' không còn chỗ trước M6 01/04/2027, Founder chốt phương án thay thế. Tương ứng TG-M2-6 ở M2 |

