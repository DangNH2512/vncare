# Checklist M2 · Tạo & khám phá sự kiện

**Dự án:** Da Nang Connect — Giai đoạn 1 (MVP) · **Trạng thái chụp:** 19/09/2026 · **Ngày chốt:** 30/10/2026

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

## 2. M2 · Tạo & khám phá sự kiện — chốt 30/10/2026

**Sprint:** S2, S3 · **Tổng:** 68 mục · ✅ 0 · 🟡 11 · ⬜ 51 · ⛔ 0 · ❓ 5 · ⚪ 1 · **Tỷ lệ xong:** 0%

**Mục tiêu:**

- S2 — Sự kiện lõi (05/10 – 16/10/2026): Một organizer thật đăng được một hoạt động thật lên staging, có ảnh bìa, có toạ độ đúng khu vực, và sự kiện đó sinh ra đúng một `event_occurrences`.
- S3 — Khám phá hyperlocal & Bản đồ (19/10 – 30/10/2026): Một expat mở web, chọn "An Thượng · cuối tuần này · thể thao" và thấy đúng những gì đang có; link sự kiện dán lên Facebook hiện ảnh và mô tả đẹp.

**Nếu trượt:** M2 đã có sẵn cơ chế ba nấc (§6.7). Nếu nấc 1 (web) trượt quá 1 tuần thì đây là điều kiện dừng cấp 1 — dừng nhận story mới, họp lại phạm vi trong 48 giờ, cân nhắc đòn bẩy 1 (thuê Mobile hợp đồng) hoặc rơi sang §10.

### 2.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | DEC-HOME-DISCOVER | Tách Trang chủ (tin tức + sự kiện do staff đăng) và Discover (sự kiện do thành viên đăng). Cập nhật doc 10 §3 và doc 14 J2; quyết định số phận composer / bài đăng cộng đồng đang ở "/" (module post). | BA + Tech Lead | <span class="nw">❓ Cần chốt</span> | Quyết định của chủ dự án 19/09; lệch tài liệu hiện hành. |
| ☐ | DEC-SWIPE | Chế độ lướt kiểu Tinder trong Discover: bật ngay từ MVP hay giữ cổng G1 (≥ 40 sự kiện mở / 7 ngày) + G2 (≥ 12 thẻ hợp lệ / người) theo doc 14 §8. | Product Owner | <span class="nw">❓ Cần chốt</span> | Doc 14 khuyến nghị sớm nhất M4–M5. |
| ☐ | DEC-ONBOARDING | Onboarding theo UC-05 (6 khu vực, bước 3 là ngôn ngữ) thay cho F-02 doc 10 (12 khu vực, bước 3 là expat_type). | BA | <span class="nw">❓ Cần chốt</span> | — |
| ☐ | DEC-WEEKSTART | Ngày đầu tuần cho bộ lọc "Tuần này": Thứ Hai cho cả EN/VI hay theo ngôn ngữ. | BA | <span class="nw">❓ Cần chốt</span> | Mockup Trang chủ dùng Thứ Hai; lịch Discover đổi theo ngôn ngữ. |
| ☐ | DEC-TOKENS | Design token: doc 10 §12 (teal #0E7C74 + Inter) hay code (xanh #0EA5E9 + Be Vietnam Pro). | Tech Lead + Designer | <span class="nw">❓ Cần chốt</span> | Mockup theo code. |

### 2.2. Story

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | E4-S1 | Mô hình dữ liệu sự kiện + PostGIS + `areas` (8 SP) · MUST | S2 | Backend | <span class="nw">🟡 Một phần</span> | Module event + PostGIS + bảng areas đã có. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E4-S2 | API tạo hoạt động: nháp → đăng (8 SP) · MUST | S2 | Backend | <span class="nw">🟡 Một phần</span> | Tạo và đăng sự kiện chạy end-to-end trên web. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E4-S3 | API sửa / huỷ hoạt động (5 SP) · MUST | S2 | Backend | <span class="nw">🟡 Một phần</span> | API sự kiện CRUD đầy đủ. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E4-S4 | Ảnh bìa + ảnh minh hoạ (5 SP) · MUST | S2 | Backend | <span class="nw">🟡 Một phần</span> | Module media + MinIO đã có. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E4-S6 | Form tạo hoạt động nhiều bước trên web, tự lưu nháp, xem trước (13 SP) · MUST | S2 | Web | <span class="nw">🟡 Một phần</span> | Web đang dùng một form đơn; doc yêu cầu wizard 4 bước + tự lưu nháp + xem trước (mockup ③ create-1…4). |
| ☐ | E3-S1 | Tạo hồ sơ: ảnh, giới thiệu, ngôn ngữ, khu vực, sở thích (8 SP) · MUST | S2 | Backend | <span class="nw">🟡 Một phần</span> | Module profile + profile-editor đã có; chưa có onboarding 3 bước. |
| ☐ | E3-S2 | Tải ảnh nhanh + phục vụ qua CDN (8 SP) · MUST | S2 | Backend | <span class="nw">🟡 Một phần</span> | Upload lên MinIO có tiến độ; chưa có CDN. |
| ☐ | E5-S1 | Từ điển khu vực Đà Nẵng có ranh giới thật (5 SP) · MUST | S2 | Backend + Product Owner | <span class="nw">🟡 Một phần</span> | Seed 6 khu vực + polygon trong packages/geo; ranh giới thật chưa được Product ký duyệt. |
| ☐ | E2-S5 | Đăng nhập Facebook (3 SP) · SHOULD | S2 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E1-S10 | Công tắc đổi ngôn ngữ EN ↔ VI trên web + mobile (5 SP) · MUST | S2 | Web + Mobile | <span class="nw">🟡 Một phần</span> | Web có công tắc EN/VI; mobile chưa có app. |
| ☐ | E5-S2 | API lọc: loại hình, khu vực, thời gian, ngôn ngữ, mức phí (13 SP) · MUST | S3 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S3 | Truy vấn bán kính quanh vị trí người dùng (8 SP) · MUST | S3 | Backend | <span class="nw">🟡 Một phần</span> | Truy vấn bán kính PostGIS có trong module event. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E5-S4 | Tìm theo từ khoá ("badminton") (5 SP) · MUST | S3 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S5 | Trang khám phá web: chip lọc, sắp xếp, tải thêm (13 SP) · MUST | S3 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S6 | Bản đồ Đà Nẵng, gom cụm điểm theo khu vực (8 SP) · MUST | S3 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E4-S8 | Trang chi tiết sự kiện công khai, SEO + OG image (8 SP) · MUST | S3 | Web | <span class="nw">🟡 Một phần</span> | Trang /events/[id] có; chưa kiểm SEO/OG image. |
| ☐ | E4-S9 | Màn chi tiết hoạt động trên mobile + deep link chia sẻ (8 SP) · MUST | S3 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E12-S1 | 3 profile EAS Build + versioning tự động (5 SP) · MUST | S3 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |

### 2.3. DoD bổ sung

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S2-DoD-1 | Cột chủ sự kiện đặt tên đúng `events.host_user_id`. Chạy `grep -rn "creator_id\\|organizer_id" apps/api/src` phải trả về rỗng | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-2 | `events.status` là enum chữ thường: `draft`, `published`, `cancelled`, `completed` | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-3 | Mọi `events` được tạo đều sinh tối thiểu 1 dòng `event_occurrences` — kể cả sự kiện không lặp lại. Có test: tạo sự kiện đơn → `SELECT count() FROM event_occurrences WHERE event_id = ?` trả về đúng `1` | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-4 | `starts_at` / `ends_at` lưu UTC; form nhập theo `Asia/Ho_Chi_Minh` và test có ca nhập 23:30 giờ Việt Nam để bắt lỗi lệch ngày | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-5 | Index `GIST` trên `events.location` đã có; `EXPLAIN` một truy vấn `ST_DWithin` cho thấy dùng index | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-6 | Bảng `areas` seed phân cấp đầy đủ, nhưng bộ lọc chỉ phơi ra đúng 6 khu vực MVP: An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn. Có test kiểm tra endpoint `GET /api/v1/areas?mvp=true` trả đúng 6 phần tử | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-7 | `events.source` ∈ `self_serve` \| `curated`, bắt buộc, không null | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-8 | Ảnh: giới hạn 8 MB/ảnh, tự nén, sinh 3 kích cỡ, trả qua CDN, thời gian tải ảnh bìa trên 4G mô phỏng < 1,5 giây | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-1 | `GET /api/v1/events` phân trang bằng cursor `(starts_at, id)`, không dùng `OFFSET` | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-2 | Kiểm thử hiệu năng: seed 10.000 sự kiện + 30.000 occurrence, `p95 < 200 ms` cho truy vấn có đủ 5 điều kiện lọc; kết quả đo dán vào issue | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-3 | Trả kèm `facets` đếm theo category và theo area; chip lọc hiển thị badge số thật, không phải số giả | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-4 | Cache Redis TTL 60 giây, có test chứng minh cache bị huỷ khi có sự kiện mới `published` trong cùng `area_id` | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-5 | Lọc "An Thượng" trả về đúng tập sự kiện nằm trong polygon `an-thuong`, đối chiếu thủ công 10 sự kiện mẫu | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-6 | Trang chi tiết đạt Lighthouse SEO ≥ 95, có `og:image` sinh động (tiêu đề + ngày + khu vực), đọc được không cần đăng nhập, không cần cài app | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-7 | Deep link `danangconnect://events/{id}` và universal link HTTPS đều mở đúng màn hình trên iOS và Android thật | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-8 | Bản đồ: 500 điểm không làm rớt khung hình dưới 45 fps trên máy tầm trung | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |

### 2.4. Nghiệm thu

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | M2-1 | Tạo, sửa, huỷ hoạt động trên web hoạt động đầy đủ, gồm tự lưu nháp và xem trước |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video |
| ☐ | M2-2 | Mỗi `events` sinh tối thiểu 1 `event_occurrences`, kể cả sự kiện không lặp lại |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test + truy vấn SQL |
| ☐ | M2-3 | Cột chủ sự kiện tên đúng `events.host_user_id`; grep `creator_id`/`organizer_id` rỗng |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Kết quả grep |
| ☐ | M2-4 | Bộ lọc phơi đúng 6 khu vực MVP: An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh giao diện + test API |
| ☐ | M2-5 | Lọc theo loại hình / khu vực / khoảng thời gian / ngôn ngữ / mức phí đều đúng, có `facets` đếm thật |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video + so khớp 10 mẫu |
| ☐ | M2-6 | Truy vấn bán kính `ST_DWithin` dùng index GIST; `p95 < 200 ms` với 10.000 sự kiện |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo đo + `EXPLAIN` |
| ☐ | M2-7 | Bản đồ Đà Nẵng hiển thị đúng khu vực, gom cụm, ≥ 45 fps với 500 điểm |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video |
| ☐ | M2-8 | Trang chi tiết công khai đọc được không cần đăng nhập, Lighthouse SEO ≥ 95, `og:image` sinh động |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo Lighthouse + preview Facebook |
| ☐ | M2-9 | Mobile: xem chi tiết + deep link chia sẻ hoạt động trên thiết bị thật |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video |
| ☐ | M2-10 | (nấc M2+, hạn 13/11) Feed khám phá mobile · (nấc M2++, hạn 27/11) Tạo sự kiện trên mobile |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video từng nấc |

### 2.5. Demo

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S2-Demo-1 | Đăng nhập bằng tài khoản thật → hoàn thiện hồ sơ có ảnh, ngôn ngữ nói, khu vực "An Thượng" | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-Demo-2 | Tạo hoạt động "Sunday Beach Volleyball · My Khe" qua form 4 bước, thoát giữa chừng, quay lại → nháp còn nguyên | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-Demo-3 | Đăng hoạt động → mở lại API `GET /api/v1/events/{id}` cho thấy `host_user_id`, `status: "published"`, `source: "self_serve"`, và đúng 1 occurrence | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-Demo-4 | Chạy SQL trực tiếp trên staging chứng minh `location` rơi đúng trong polygon `my-khe` | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-Demo-5 | Đổi ngôn ngữ sang tiếng Việt trên cả web và mobile, toàn bộ nhãn đổi theo | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-1 | Trang khám phá web: bấm chip "My An" + "Language exchange" + "Weekend" → danh sách rút còn đúng những buổi phù hợp, badge số trên chip khớp | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-2 | Bật định vị trình duyệt tại văn phòng → "trong 2 km quanh tôi" trả kết quả hợp lý | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-3 | Gõ "badminton" → kết quả hiện dưới 300 ms | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-4 | Chuyển sang chế độ bản đồ → cụm điểm theo khu vực, bấm cụm thì mở ra | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-5 | Copy link một sự kiện, dán vào ô soạn bài Facebook → preview hiện ảnh OG đúng | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-6 | Quét deep link bằng iPhone thật → app mở thẳng màn chi tiết sự kiện đó | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |

### 2.6. Việc ngoài SP

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S2-Ops-0 | Community Manager bắt đầu playbook curate — mở sổ theo dõi 20 organizer mục tiêu, ghi nguồn công khai, chưa nhập vào hệ thống (chờ Admin Console ở S6, giai đoạn này nhập vào bảng tính). | S2 | Founder / Community Manager | <span class="nw">⚪ Chưa xác nhận</span> | — |

### 2.7. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | MK-NEWS-01 | Bảng news_articles (song ngữ, tag, related_event_id, published / relevant / evergreen) + GET /api/v1/news, /news/:id. |  | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-NEWS-02 | Trang chủ biên tập: tin nổi bật + lưới tin, khối "Picked by our team" (SourceBadge + dòng nguồn + Interested), hàng Hướng dẫn, trang đọc bài. |  | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-TIME-01 | Bộ lọc Hôm nay / Tuần này / Tháng này / Chọn ngày cho Trang chủ và Discover; from/to theo Asia/Ho_Chi_Minh, lưu UTC; giữ trên URL; sự kiện lặp hiện một thẻ. |  | Web + Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-DISC-01 | Discover chỉ sự kiện events.source = self_serve; thẻ có ★ điểm host + 💬 số bình luận; sắp xếp Top rated; khối "What people say". |  | Web + Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-DETAIL-01 | Trang chi tiết: bình luận trả lời 1 cấp, host ghim, sắp xếp Mới nhất / Nổi bật; "Xem bản dịch" chỉ khi khác ngôn ngữ giao diện (nối comment API có sẵn, T-05). |  | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-SWIPE-01 | Swipe trong dòng (PA B): Lưu / Chia sẻ / Bỏ qua, toast hoàn tác 6 giây, nút ♡ và ⋯ luôn hiện; bảng occurrence_dismissals (hết hạn 14 ngày). |  | Web + Mobile + Backend | <span class="nw">⬜ Chưa làm</span> | Khoảng 11 ngày-người theo doc 14. |
| ☐ | MK-SWIPE-02 | Deck "Plan your week" (tối đa 12 thẻ, vuốt phải = Lưu, kéo lên mở sheet xác nhận RSVP, màn tổng kết cảnh báo trùng giờ). |  | Web + Mobile | <span class="nw">⬜ Chưa làm</span> | Chỉ làm nếu DEC-SWIPE chốt bật. |

