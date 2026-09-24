# Checklist M2 · Tạo & khám phá sự kiện

**Dự án:** Da Nang Connect — Giai đoạn 1 (MVP) · **Trạng thái chụp:** 19/09/2026 · **Ngày chốt:** 13/11/2026 · **Phân công:** 23/09/2026 (60-20-20)

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

**Người phụ trách (QĐ-78, 23/09/2026 — chia khối lượng 60-20-20 theo chức năng, xem `checklist-milestone-M0-M6.md` §2.1):**

- **Founder**: PO, Community Manager, curate, trực kiểm duyệt, quan hệ organizer, pháp lý, tài khoản cửa hàng và D-U-N-S, ký xác nhận người thứ hai (DoD-9). Không viết code.
- **TV1** (dùng AI, ~60%): Nền tảng và vòng lặp lõi, kiêm Tech Lead — hạ tầng, CI/CD, deploy, trực sự cố, migration, design token, phân quyền và trust, sự kiện, khám phá, RSVP và waitlist, thông báo, đo lường sản phẩm.
- **TV2** (~20%): Tài khoản và hồ sơ — đăng ký, xác minh, đăng nhập, phiên, Google, đặt lại mật khẩu, hồ sơ và onboarding, ảnh và CDN, OTP, ngôn ngữ và i18n, tuỳ chọn thông báo, xuất/xoá dữ liệu, PWA, SEO toàn site.
- **TV3** (~20%): Vận hành — khu vực, kiểm duyệt (báo cáo, chặn, hàng đợi, xử lý, chống spam, Community Guidelines), Admin Console, curate và nhận quyền, tin tức do đội vận hành đăng, phễu phân tích.
- **Thuê ngoài**: Designer (trọn gói 4 tuần), QA (2 đợt), dịch giả tiếng Việt.
- Mỗi thành viên làm trọn chức năng của mình: API, dữ liệu, màn web hoặc Admin Console, và E2E. Hai tên nối bằng "+" là việc chạm hai chức năng; người đứng đầu chịu trách nhiệm chính và nhận SP.

**Nhóm việc trong mỗi phase:** Việc chặn & cần chốt → Story → DoD bổ sung → Nghiệm thu → Demo → Việc ngoài SP → Bổ sung từ mockup → Bổ sung kịch bản tinh gọn.

**Nguồn trạng thái:** M0–M1 lấy từ đợt kiểm tra code chỉ đọc ngày 18/09/2026 (có đối chứng độc lập). Các mục "Một phần" của M2–M3 lấy từ ghi chú phiên làm việc 01–02/09, **chưa kiểm chứng lại bằng code**. Story, DoD, demo và tiêu chí nghiệm thu lấy nguyên văn từ `docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md` §6–§7. Nhóm "Bổ sung từ mockup" là việc mới lộ ra từ bộ mockup web ngày 18–19/09 và quyết định của chủ dự án ngày 19/09. **Kịch bản đội:** CH-06 chốt ngày 19/09/2026 theo phương án tinh gọn, cắt nhóm A + B (QĐ-77); ngày 23/09/2026 đội code đổi thành 3 thành viên chia khối lượng 60-20-20 theo chức năng (QĐ-78). Ngày chốt M2–M6 và cột Sprint (L0–L12) theo `08` §10.4; người phụ trách theo QĐ-78; chữ của story, DoD, demo, nghiệm thu giữ nguyên văn, phần điều chỉnh tinh gọn ghi ở cột Ghi chú.

<div class="pb"></div>

## 2. M2 · Tạo & khám phá sự kiện — chốt 13/11/2026

**Sprint:** L2, L3, L4 · **Tổng:** 72 mục · ✅ 0 · 🟡 11 · ⬜ 45 · ⛔ 0 · ❓ 5 · ⚪ 1 · ✂️ 10 · **Tỷ lệ xong:** 0%

**SP theo người (còn lại / trong phạm vi):** TV1 77 / 77 · TV2 16 / 16 · TV3 5 / 5

**Mục tiêu:**

- L2 — 05/10 – 16/10/2026: Mô hình sự kiện + PostGIS + `areas` 6 khu vực MVP, hồ sơ cá nhân, ảnh qua dịch vụ có sẵn
- L3 — 19/10 – 30/10/2026: Tạo / sửa / huỷ sự kiện, form web một trang có tự lưu nháp, trang chi tiết + SEO/OG
- L4 — 02/11 – 13/11/2026: API lọc hyperlocal (khu vực · loại hình · thời gian · ngôn ngữ · phí), trang khám phá

**Nếu trượt:** M2 đã có sẵn cơ chế ba nấc (§6.7). Nếu nấc 1 (web) trượt quá 1 tuần thì đây là điều kiện dừng cấp 1 — dừng nhận story mới, họp lại phạm vi trong 48 giờ, cân nhắc đòn bẩy 1 (thuê Mobile hợp đồng) hoặc rơi sang §10. Tinh gọn: M2 chỉ còn nấc web (M2+/M2++ hoãn cùng nhánh native) và không còn đòn bẩy thuê Mobile hợp đồng. Nếu L2–L4 trượt quá 1 tuần thì đòn bẩy phạm vi còn lại là nhóm C §10.2 (08:1608), chỉ áp khi Founder ký. Trong M2, nhóm C chỉ chạm E5-S3, mục mà NT-2 (08:1554) ghi giữ nguyên, nên phải giải mâu thuẫn này khi ký.

### 2.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | DEC-HOME-DISCOVER | Tách Trang chủ (tin tức + sự kiện do staff đăng) và Discover (sự kiện do thành viên đăng). Cập nhật doc 10 §3 và doc 14 J2; quyết định số phận composer / bài đăng cộng đồng đang ở "/" (module post). | Founder + TV1 | <span class="nw">❓ Cần chốt</span> | Quyết định của chủ dự án 19/09; lệch tài liệu hiện hành. Tinh gọn: Tách Trang chủ + tin tức là phạm vi ngoài 359 SP tinh gọn; Founder phải chỉ ra phần bù trước khi nhận |
| ☐ | DEC-SWIPE | Chế độ lướt kiểu Tinder trong Discover: bật ngay từ MVP hay giữ cổng G1 (≥ 40 sự kiện mở / 7 ngày) + G2 (≥ 12 thẻ hợp lệ / người) theo doc 14 §8. | Founder | <span class="nw">❓ Cần chốt</span> | Doc 14 khuyến nghị sớm nhất M4–M5. Tinh gọn: Lịch L0–L12 không có SP cho swipe; nếu bật phải cắt phần khác |
| ☐ | DEC-ONBOARDING | Onboarding theo UC-05 (6 khu vực, bước 3 là ngôn ngữ) thay cho F-02 doc 10 (12 khu vực, bước 3 là expat_type). | Founder | <span class="nw">❓ Cần chốt</span> | — |
| ☐ | DEC-WEEKSTART | Ngày đầu tuần cho bộ lọc "Tuần này": Thứ Hai cho cả EN/VI hay theo ngôn ngữ. | Founder | <span class="nw">❓ Cần chốt</span> | Mockup Trang chủ dùng Thứ Hai; lịch Discover đổi theo ngôn ngữ. |
| ☐ | DEC-TOKENS | Design token: doc 10 §12 (teal #0E7C74 + Inter) hay code (xanh #0EA5E9 + Be Vietnam Pro). | TV1 | <span class="nw">❓ Cần chốt</span> | Mockup theo code. Tinh gọn: Phải chốt trước khi Founder gửi brief cho Designer thuê ngoài (TG-M0-1; doc 00 đặt hạn token trước 21/09), dù mục nằm ở checklist M2; @dnc/tokens hiện lệch doc 10 §12 (xem E1-S5); TV1 áp token vào web |

### 2.2. Story

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | E4-S1 | Mô hình dữ liệu sự kiện + PostGIS + `areas` (8 SP) · MUST | L2 | TV1 | <span class="nw">🟡 Một phần</span> | Module event + PostGIS + bảng areas đã có. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E4-S2 | API tạo hoạt động: nháp → đăng (8 SP) · MUST | L3 | TV1 | <span class="nw">🟡 Một phần</span> | Tạo và đăng sự kiện chạy end-to-end trên web. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E4-S3 | API sửa / huỷ hoạt động (5 SP) · MUST | L3 | TV1 | <span class="nw">🟡 Một phần</span> | API sự kiện CRUD đầy đủ. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E4-S4 | Ảnh bìa + ảnh minh hoạ (5 SP) · MUST | L2 | TV1 | <span class="nw">🟡 Một phần</span> | Module media + MinIO đã có. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. Tinh gọn: Ảnh đi qua dịch vụ lưu ảnh có sẵn của E3-S2 |
| ☐ | E4-S6 | Form tạo hoạt động nhiều bước trên web, tự lưu nháp, xem trước (8 SP) · MUST | L3 | TV1 | <span class="nw">🟡 Một phần</span> | Web đang dùng một form đơn; doc yêu cầu wizard 4 bước + tự lưu nháp + xem trước (mockup ③ create-1…4). Tinh gọn: Rút gọn còn 8 SP: một trang cuộn dài + tự lưu nháp, không chia bước, không xem trước đầy đủ; form một trang hiện có đã đúng hướng; tối ưu điện thoại (bù E4-S7) làm ở L9 (M5) |
| ☐ | E3-S1 | Tạo hồ sơ: ảnh, giới thiệu, ngôn ngữ, khu vực, sở thích (8 SP) · MUST | L2 | TV2 | <span class="nw">🟡 Một phần</span> | Module profile + profile-editor đã có; chưa có onboarding 3 bước. Tinh gọn: Hồ sơ chỉ sửa trên web (E3-S5 hoãn); TV2 làm onboarding/profile-editor |
| ☐ | E3-S2 | Tải ảnh nhanh + phục vụ qua CDN (3 SP) · MUST | L2 | TV2 | <span class="nw">🟡 Một phần</span> | Upload lên MinIO có tiến độ; chưa có CDN. Tinh gọn: Dùng dịch vụ lưu ảnh có sẵn thay pipeline tự dựng, còn 3 SP; phụ thuộc nhà cung cấp, chi phí theo lưu lượng |
| ☐ | E5-S1 | Từ điển khu vực Đà Nẵng có ranh giới thật (5 SP) · MUST | L2 | TV3 | <span class="nw">🟡 Một phần</span> | Seed 6 khu vực + polygon trong packages/geo; ranh giới thật chưa được Product ký duyệt. Tinh gọn: Phần còn lại chủ yếu là Founder ký duyệt ranh giới 6 khu vực (không viết code); TV3 sửa polygon trong packages/geo và seed; không bao giờ cắt (NT-2) |
| ☐ | E2-S5 | Đăng nhập Facebook (3 SP) · SHOULD |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Nhóm B CẮT, thu hồi 3 SP: chỉ giữ email + Google; mất một phần expat quen dùng Facebook |
| ☐ | E1-S10 | Công tắc đổi ngôn ngữ EN ↔ VI trên web + mobile (5 SP) · MUST | L2 | TV2 | <span class="nw">🟡 Một phần</span> | Web có công tắc EN/VI; mobile chưa có app. Tinh gọn: Không có app native: phần mobile là web trên trình duyệt điện thoại; chuỗi VI tạm tới khi nạp bản dịch thuê ngoài ở L11 |
| ☐ | E5-S2 | API lọc: loại hình, khu vực, thời gian, ngôn ngữ, mức phí (13 SP) · MUST | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Không bao giờ cắt (NT-2) |
| ☐ | E5-S3 | Truy vấn bán kính quanh vị trí người dùng (8 SP) · MUST | L4 | TV1 | <span class="nw">🟡 Một phần</span> | Truy vấn bán kính PostGIS có trong module event. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. Tinh gọn: Nhóm C nhưng vẫn giữ: quyết định 19/09 chỉ cắt A+B, và NT-2 (08:1554) cũng ghi giữ nguyên; chỉ hoãn khi Founder ký dùng nhóm C |
| ☐ | E5-S4 | Tìm theo từ khoá ("badminton") (5 SP) · MUST | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S5 | Trang khám phá web: chip lọc, sắp xếp, tải thêm (9 SP) · MUST | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Rút gọn còn 9 SP: chip lọc cơ bản + tải thêm; bỏ sắp xếp theo khoảng cách ở bản đầu |
| ☐ | E5-S6 | Bản đồ Đà Nẵng, gom cụm điểm theo khu vực (8 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Nhóm B HOÃN chỉ phần hiển thị bản đồ, KHÔNG hoãn lọc khu vực; thay bằng danh sách nhóm theo 6 khu vực (TG-M2-4) |
| ☐ | E4-S8 | Trang chi tiết sự kiện công khai, SEO + OG image (8 SP) · MUST | L3 | TV1 | <span class="nw">🟡 Một phần</span> | Trang /events/[id] có; chưa kiểm SEO/OG image. Tinh gọn: Giữ nguyên: thay màn chi tiết mobile (E4-S9 hoãn) và là cửa vào chính từ Facebook/Google khi không có cửa hàng ứng dụng |
| ☐ | E4-S9 | Màn chi tiết hoạt động trên mobile + deep link chia sẻ (8 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Nhóm A HOÃN: không có app native; trang chi tiết web E4-S8 thay thế |
| ☐ | E12-S1 | 3 profile EAS Build + versioning tự động (5 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Nhóm A HOÃN toàn bộ E12; không phát hành cửa hàng ở M6 |

### 2.3. DoD bổ sung

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S2-DoD-1 | Cột chủ sự kiện đặt tên đúng `events.host_user_id`. Chạy `grep -rn "creator_id\\|organizer_id" apps/api/src` phải trả về rỗng | L2 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-2 | `events.status` là enum chữ thường: `draft`, `published`, `cancelled`, `completed` | L2 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-3 | Mọi `events` được tạo đều sinh tối thiểu 1 dòng `event_occurrences` — kể cả sự kiện không lặp lại. Có test: tạo sự kiện đơn → `SELECT count() FROM event_occurrences WHERE event_id = ?` trả về đúng `1` | L2 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-4 | `starts_at` / `ends_at` lưu UTC; form nhập theo `Asia/Ho_Chi_Minh` và test có ca nhập 23:30 giờ Việt Nam để bắt lỗi lệch ngày | L3 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: TV1 viết ca Playwright nhập 23:30 trên form web (không có QA thường trực) |
| ☐ | S2-DoD-5 | Index `GIST` trên `events.location` đã có; `EXPLAIN` một truy vấn `ST_DWithin` cho thấy dùng index | L2 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-6 | Bảng `areas` seed phân cấp đầy đủ, nhưng bộ lọc chỉ phơi ra đúng 6 khu vực MVP: An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn. Có test kiểm tra endpoint `GET /api/v1/areas?mvp=true` trả đúng 6 phần tử | L2 | TV3 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-7 | `events.source` ∈ `self_serve` \| `curated`, bắt buộc, không null | L2 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-8 | Ảnh: giới hạn 8 MB/ảnh, tự nén, sinh 3 kích cỡ, trả qua CDN, thời gian tải ảnh bìa trên 4G mô phỏng < 1,5 giây | L2 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nén, 3 kích cỡ và CDN do dịch vụ lưu ảnh có sẵn đảm nhận; TV2 cấu hình và đo trên 4G mô phỏng |
| ☐ | S3-DoD-1 | `GET /api/v1/events` phân trang bằng cursor `(starts_at, id)`, không dùng `OFFSET` | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-2 | Kiểm thử hiệu năng: seed 10.000 sự kiện + 30.000 occurrence, `p95 < 200 ms` cho truy vấn có đủ 5 điều kiện lọc; kết quả đo dán vào issue | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-3 | Trả kèm `facets` đếm theo category và theo area; chip lọc hiển thị badge số thật, không phải số giả | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-4 | Cache Redis TTL 60 giây, có test chứng minh cache bị huỷ khi có sự kiện mới `published` trong cùng `area_id` | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-5 | Lọc "An Thượng" trả về đúng tập sự kiện nằm trong polygon `an-thuong`, đối chiếu thủ công 10 sự kiện mẫu | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Founder đối chiếu thủ công 10 mẫu với tư cách người thứ hai (DoD-9) |
| ☐ | S3-DoD-6 | Trang chi tiết đạt Lighthouse SEO ≥ 95, có `og:image` sinh động (tiêu đề + ngày + khu vực), đọc được không cần đăng nhập, không cần cài app | L3 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-7 | Deep link `danangconnect://events/{id}` và universal link HTTPS đều mở đúng màn hình trên iOS và Android thật |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Scheme danangconnect:// và universal link chỉ có nghĩa khi có app native (E4-S9 hoãn); link HTTPS mở trang web đã được kiểm ở S3-DoD-6 và M2-9 |
| ☐ | S3-DoD-8 | Bản đồ: 500 điểm không làm rớt khung hình dưới 45 fps trên máy tầm trung |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Chỉ kiểm bản đồ web đã hoãn (E5-S6) |

### 2.4. Nghiệm thu

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | M2-1 | Tạo, sửa, huỷ hoạt động trên web hoạt động đầy đủ, gồm tự lưu nháp và xem trước |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video. Tinh gọn: Xem trước chỉ ở mức rút gọn của E4-S6 (form một trang); Founder ký nghiệm thu theo tiêu chí đã rút |
| ☐ | M2-2 | Mỗi `events` sinh tối thiểu 1 `event_occurrences`, kể cả sự kiện không lặp lại |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test + truy vấn SQL |
| ☐ | M2-3 | Cột chủ sự kiện tên đúng `events.host_user_id`; grep `creator_id`/`organizer_id` rỗng |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Kết quả grep |
| ☐ | M2-4 | Bộ lọc phơi đúng 6 khu vực MVP: An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn |  | TV1 + TV3 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh giao diện + test API |
| ☐ | M2-5 | Lọc theo loại hình / khu vực / khoảng thời gian / ngôn ngữ / mức phí đều đúng, có `facets` đếm thật |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video + so khớp 10 mẫu |
| ☐ | M2-6 | Truy vấn bán kính `ST_DWithin` dùng index GIST; `p95 < 200 ms` với 10.000 sự kiện |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo đo + `EXPLAIN`. Tinh gọn: Giữ vì E5-S3 (nhóm C) không bị cắt |
| ☐ | M2-7 | Bản đồ Đà Nẵng hiển thị đúng khu vực, gom cụm, ≥ 45 fps với 500 điểm |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Bằng chứng: Video. Tinh gọn: Bản đồ web hoãn (E5-S6); nghiệm thu thay bằng danh sách nhóm theo 6 khu vực (TG-M2-4) |
| ☐ | M2-8 | Trang chi tiết công khai đọc được không cần đăng nhập, Lighthouse SEO ≥ 95, `og:image` sinh động |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo Lighthouse + preview Facebook |
| ☐ | M2-9 | Mobile: xem chi tiết + deep link chia sẻ hoạt động trên thiết bị thật |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video. Tinh gọn: Không có app native: nghiệm thu trang chi tiết web trên iPhone + Android thật và chia sẻ link HTTPS; deep link vào app hoãn cùng E4-S9 |
| ☐ | M2-10 | (nấc M2+, hạn 13/11) Feed khám phá mobile · (nấc M2++, hạn 27/11) Tạo sự kiện trên mobile |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Bằng chứng: Video từng nấc. Tinh gọn: Nấc M2+ (E5-S7) và M2++ (E4-S7) hoãn cùng nhánh native; bù bằng form web tối ưu điện thoại, dán được link Google Maps, và PWA ở L9 (M5) |

### 2.5. Demo

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S2-Demo-1 | Đăng nhập bằng tài khoản thật → hoàn thiện hồ sơ có ảnh, ngôn ngữ nói, khu vực "An Thượng" | L2 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Làm trên web; hồ sơ mobile (E3-S5) hoãn |
| ☐ | S2-Demo-2 | Tạo hoạt động "Sunday Beach Volleyball · My Khe" qua form 4 bước, thoát giữa chừng, quay lại → nháp còn nguyên | L3 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Form một trang thay form 4 bước (E4-S6 rút gọn); vẫn chứng minh nháp còn nguyên |
| ☐ | S2-Demo-3 | Đăng hoạt động → mở lại API `GET /api/v1/events/{id}` cho thấy `host_user_id`, `status: "published"`, `source: "self_serve"`, và đúng 1 occurrence | L3 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-Demo-4 | Chạy SQL trực tiếp trên staging chứng minh `location` rơi đúng trong polygon `my-khe` | L2 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-Demo-5 | Đổi ngôn ngữ sang tiếng Việt trên cả web và mobile, toàn bộ nhãn đổi theo | L2 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Phần mobile = web trên trình duyệt điện thoại; chuỗi VI tạm tới khi nạp bản dịch thuê ngoài ở L11 |
| ☐ | S3-Demo-1 | Trang khám phá web: bấm chip "My An" + "Language exchange" + "Weekend" → danh sách rút còn đúng những buổi phù hợp, badge số trên chip khớp | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-2 | Bật định vị trình duyệt tại văn phòng → "trong 2 km quanh tôi" trả kết quả hợp lý | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Chỉ lọc bán kính; không sắp xếp theo khoảng cách (E5-S5 rút gọn) |
| ☐ | S3-Demo-3 | Gõ "badminton" → kết quả hiện dưới 300 ms | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-4 | Chuyển sang chế độ bản đồ → cụm điểm theo khu vực, bấm cụm thì mở ra |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Chế độ bản đồ hoãn (E5-S6); demo thay bằng danh sách nhóm theo 6 khu vực (TG-M2-4) |
| ☐ | S3-Demo-5 | Copy link một sự kiện, dán vào ô soạn bài Facebook → preview hiện ảnh OG đúng | L3 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-6 | Quét deep link bằng iPhone thật → app mở thẳng màn chi tiết sự kiện đó |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Chỉ có ở app native: deep link mở thẳng app (E4-S9 hoãn, cùng lý do cắt S3-DoD-7); PWA trên iOS không bắt được link nên không thay thế được; việc mở link trên điện thoại thật đã được kiểm ở M2-9 |

### 2.6. Việc ngoài SP

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S2-Ops-0 | Community Manager bắt đầu playbook curate — mở sổ theo dõi 20 organizer mục tiêu, ghi nguồn công khai, chưa nhập vào hệ thống (chờ Admin Console ở S6, giai đoạn này nhập vào bảng tính). | L2 | Founder | <span class="nw">⚪ Chưa xác nhận</span> | Tinh gọn: Admin Curation Console dời sang L8 (04/01/2027); nhập bảng tính tới khi đó |

### 2.7. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | MK-NEWS-01 | Bảng news_articles (song ngữ, tag, related_event_id, published / relevant / evergreen) + GET /api/v1/news, /news/:id. |  | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Ngoài 359 SP tinh gọn; chỉ nhận khi DEC-HOME-DISCOVER chốt và Founder chỉ ra phần bù |
| ☐ | MK-NEWS-02 | Trang chủ biên tập: tin nổi bật + lưới tin, khối "Picked by our team" (SourceBadge + dòng nguồn + Interested), hàng Hướng dẫn, trang đọc bài. |  | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Ngoài 359 SP tinh gọn; chỉ nhận khi DEC-HOME-DISCOVER chốt và Founder chỉ ra phần bù |
| ☐ | MK-TIME-01 | Bộ lọc Hôm nay / Tuần này / Tháng này / Chọn ngày cho Trang chủ và Discover; from/to theo Asia/Ho_Chi_Minh, lưu UTC; giữ trên URL; sự kiện lặp hiện một thẻ. |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: API from/to đã nằm trong E5-S2 (L4); chip thời gian trên Discover có thể đi cùng chip lọc cơ bản của E5-S5; phần Trang chủ phụ thuộc DEC-HOME-DISCOVER, ngoài 359 SP |
| ☐ | MK-DISC-01 | Discover chỉ sự kiện events.source = self_serve; thẻ có ★ điểm host + 💬 số bình luận; sắp xếp Top rated; khối "What people say". |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Điểm host, bình luận, Top rated ngoài 359 SP tinh gọn; cần Founder chốt phần bù |
| ☐ | MK-DETAIL-01 | Trang chi tiết: bình luận trả lời 1 cấp, host ghim, sắp xếp Mới nhất / Nổi bật; "Xem bản dịch" chỉ khi khác ngôn ngữ giao diện (nối comment API có sẵn, T-05). |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Ngoài 359 SP tinh gọn; comment API đã có (T-05), cần Founder chốt phần bù trước khi nhận |
| ☐ | MK-SWIPE-01 | Swipe trong dòng (PA B): Lưu / Chia sẻ / Bỏ qua, toast hoàn tác 6 giây, nút ♡ và ⋯ luôn hiện; bảng occurrence_dismissals (hết hạn 14 ngày). |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Khoảng 11 ngày-người theo doc 14. Tinh gọn: Không có nhánh mobile: chỉ web/PWA; khoảng 11 ngày-người ngoài 359 SP, phụ thuộc DEC-SWIPE |
| ☐ | MK-SWIPE-02 | Deck "Plan your week" (tối đa 12 thẻ, vuốt phải = Lưu, kéo lên mở sheet xác nhận RSVP, màn tổng kết cảnh báo trùng giờ). |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Chỉ làm nếu DEC-SWIPE chốt bật. Tinh gọn: Chỉ web/PWA; ngoài 359 SP, chỉ làm nếu DEC-SWIPE chốt bật |

### 2.8. Bổ sung kịch bản tinh gọn

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | TG-M2-1 | Nhận bàn giao gói Designer thuê ngoài: design token + 20 màn hình + tài sản hình ảnh, trong 4 tuần kể từ ngày ký · MUST | L3 | Thuê ngoài: Designer | <span class="nw">⬜ Chưa làm</span> | Hợp đồng 45 triệu (GĐ A) do Founder ký ở TG-M0-1. Ký trong tuần 21/09 thì hạn giao khoảng 19/10 (đầu L3), kịp form E4-S6 và trang chi tiết E4-S8 ở L3, trang khám phá E5-S5 ở L4. Phần 'tài sản cửa hàng' của gói (08:1518) đổi sang icon/splash PWA + ảnh OG vì E12 hoãn, chờ Founder chốt. Founder duyệt bản giao; TV1 nạp token vào @dnc/tokens; mỗi thành viên dựng màn hình thuộc chức năng của mình. |
| ☐ | TG-M2-4 | Danh sách sự kiện nhóm theo 6 khu vực MVP, mỗi khu vực có ảnh đại diện — thay cho bản đồ web (E5-S6 hoãn); lọc theo khu vực giữ nguyên · MUST | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | Thay nghiệm thu M2-7 và demo S3-Demo-4; ảnh đại diện lấy từ gói Designer (TG-M2-1) hoặc TV1 tự làm; doc 08 chưa ước lượng SP |
| ☐ | TG-M2-5 | Playwright E2E cho luồng M2 trên web: tạo/sửa/huỷ + tự lưu nháp, lọc 6 khu vực + facets, trang chi tiết công khai không cần đăng nhập · MUST | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | Thay kiểm thử của QA thường trực; chạy trên hạ tầng Playwright của T-14 (M1); TV1 giữ e2e API theo DoD-3 |
| ☐ | TG-M2-6 | Điểm kiểm soát ngân sách tinh gọn tại M2: đã tiêu ≈ 255 triệu — sản phẩm đã chạy được trên staging chưa? Nếu không: dừng tuyển, rà soát lại đội · MUST | L4 | Founder | <span class="nw">⬜ Chưa làm</span> | §11.4 ghi 30/10/2026 theo lịch đủ đội; kịch bản tinh gọn đối chiếu tại gate 13/11/2026 |

