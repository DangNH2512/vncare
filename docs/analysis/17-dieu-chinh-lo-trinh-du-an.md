# Da Nang Connect — Điều chỉnh lộ trình dự án (10/2026)

- **Mục đích**: điều chỉnh plan và schedule tới M6 (01/04/2027) và giai đoạn sau ra mắt, để sản phẩm phục vụ được nhiều phân khúc khách hàng nhất trong giới hạn năng lực đội 3 người
- **Đầu vào**: phân tích khách hàng [16-phan-tich-nhu-cau-khach-hang.md](16-phan-tich-nhu-cau-khach-hang.md); kế hoạch lean QĐ-77 (`08` §10); phân vai QĐ-78; kiểm chứng code ngày 12/10/2026
- **Ngày lập**: 12/10/2026
- **Thực hiện**: Tech Lead Agent (kế hoạch, kiểm chứng code); điều phối viên (đối chiếu baseline, sửa bài toán năng lực ở mục 3)
- **Trạng thái**: **chờ PO duyệt** 7 quyết định ở mục 9 trước khi code. Có 2 cổng STOP đổi schema
- **Quy ước ngày sprint**: theo `08` §10.4 (đã trừ freeze 28/12–01/01 và Tết 01–12/02)

---

## 1. Tóm tắt điều hành

- **Giữ M6 ngày 01/04/2027** (QĐ-77). Chèn thêm một chuỗi "khách xem trước và chia sẻ được", gồm:
  - trang sự kiện render phía server, có Open Graph;
  - category, audience, ngôn ngữ, ảnh bìa;
  - preset thời gian;
  - huỷ sự kiện có báo cho người đã RSVP;
  - đo lường có xin đồng ý;
  - quyền riêng tư cho khách chưa đăng nhập.

  Tổng khoảng **29 SP gộp, khoảng 21 SP ròng** sau khi trừ phần trùng với story có sẵn (E4-S2/S3/S8, E5-S2, E11-S1/S2/S5).
- **Ba thay đổi cấu trúc lịch:**
  1. Đóng M1 đang quá hạn trước tiên, **hạn cứng 30/10**.
  2. Nghiên cứu vòng 2 từ 19/10 đến 13/11; đọc giữa kỳ 30/10 để chốt field schema; họp Go/Pivot ngày 18/11.
  3. Thêm mốc **M5a "public read-only" ngày 15/02/2027**, trùng đầu mùa nomad cao điểm.
- **Không đầu tư thêm** vào map, swipe, post, chat, follow vì chưa có bằng chứng nhu cầu. Riêng lỗ hổng bảo mật T-23 vẫn phải vá.
- **Năng lực đang thiếu khoảng 46 SP**, chưa tính bước re-baseline (mục 3). Kế hoạch đứng hay đổ phụ thuộc vào **re-baseline ở L2**: checklist dừng ở 7% từ 24/09, trong khi nhiều story M2/M4 đã được xây. Dự phòng là dời gate M6 tối đa tới 15/04.
- **Rủi ro lớn nhất**: bus factor bằng 1 nằm đúng trên đường găng (TV1), cộng với M1 đang trễ. Vì vậy 3 card mới được giao cho TV2 và TV3.

## 2. Kết quả kiểm chứng trong code

Các mốc path:line do Tech Lead ghi; điều phối viên đã kiểm lại các dòng đánh dấu ✓.

| Hạng mục | Trạng thái thật | Bằng chứng | Effort điều chỉnh |
|---|---|---|---|
| FR-05 / UC-09 — khách xem không đăng nhập | **Đã chạy.** `GET /events` và `/events/:id` có `@Public` + `@OptionalUser` ✓; trang chi tiết không có guard, RSVP gọi `requireAuth(callback)`. Nhưng trang là `'use client'` ✓ nên crawler và ứng dụng chat không đọc được nội dung | `apps/api/src/modules/event/event.controller.ts:62-80`; `apps/web-client-side/app/(shell)/events/[id]/page.tsx:1` | Từ M xuống **1 SP**: chỉ còn xác minh nhãn Ended, nút Retry và luồng quay lại sau đăng nhập |
| FR-04 — Open Graph, nút Share | **Chưa có.** Không có `generateMetadata`, `openGraph`, `navigator.share` trong `app/` ✓; chỉ có metadata tĩnh toàn site | `apps/web-client-side/app/layout.tsx:32-39` | 5 SP (tách server wrapper, metadata, ảnh OG mặc định, Share, tham số `?src=`); ròng khoảng 2–3 vì trùng E4-S8, E11-S5 |
| FR-02 — preset thời gian | **Có một phần**: chip `upcoming / today / weekend / week` ✓. Thiếu Tomorrow và nghĩa "Tonight" (từ giờ hiện tại đến 23:59 Asia/Ho_Chi_Minh); `feed-stream` còn lọc phía client | `discover/_components/discover-filters.tsx:14-19`; `discover-url.ts:28`; `feed-stream.tsx:16` | 2 SP |
| FR-12 — huỷ/đổi sự kiện | API có `PUT /events/:id/status` nhận `cancelled`; web chỉ có `publishEvent`, **không có UI sửa/huỷ**. `MailService.send()` có nhưng chưa ai gọi; chưa có module notification; chưa kiểm cascade sang RSVP | `event.controller.ts:93-103`; `event.service.ts:80-95`; `apps/api/src/mail/mail.service.ts:35-47`; `rsvp.service.ts:98-113` | 8 SP gộp; ròng khoảng 3–5 vì trùng E4-S3 |
| FR-01/03/07/13 — schema | Bảng `events` chưa có category, audience, alcohol, language, cover. Migration mới nhất là `0013_blocks.sql` ✓, nên migration tiếp theo là `0014`. `event_status_enum` đã có `cancelled`. Media đã có `POST /api/v1/media/uploads` nhưng chưa liên kết làm ảnh bìa | `apps/api/src/database/sql/0002_rsvp_core.sql:23-43`; `media.controller.ts:37-41` | 8 SP; ròng khoảng 3–5 (E4-S2/E5-S2 đã có loại hình và ngôn ngữ). **Đổi schema: cổng STOP** |
| NFR-05 — đo lường | **Chưa có** SDK hay bảng tracking; chỉ có quyền `analytics.platform.view` cho admin overview | `packages/domain/src/permission-matrix.ts:57,97` | 4 SP; ròng khoảng 1 (gộp E11-S1/S2) |
| NFR-06 — quyền riêng tư cho khách | API `GET .../rsvps` không `@Public`, nằm dưới `JwtAuthGuard` toàn cục nên khách nhận 401; web chỉ gọi `listAttendees` khi đã đăng nhập, khách chỉ thấy `seatsTaken`. **Chưa kiểm** `/u/[handle]`, nội dung `EventResponse` và `jwt-auth.guard.ts` | `rsvp.controller.ts:82-89`; `events/[id]/page.tsx:93-96`; `apps/api/src/app.module.ts:55-57` | 1 SP (test integration + rà `EventResponse` và profile) |

## 3. Bài toán năng lực

### 3.1 Dung lượng và nhu cầu

- **Dung lượng**: L2 còn nửa sprint (14 SP), cộng 10 sprint L3–L12 × 28 SP, thành khoảng **294 SP**. Velocity 28 là số kế hoạch; chưa có số đo thật và chưa có `sprint-status.yaml`.
- **Nhu cầu**: 330 SP còn lại theo checklist, cộng khoảng 21 SP hạng mục mới, thành khoảng **351 SP**.
- **Thiếu hụt ban đầu**: khoảng **57 SP**.

### 3.2 Sửa lỗi tính trùng trong danh sách cắt

Bản nháp của Tech Lead đề xuất cắt 12 dòng, tổng 38 SP. Đối chiếu với bảng cắt giảm của QĐ-77 (`08` §10) thì **27 SP trong đó đã được trừ sẵn** khỏi baseline 330 SP:

| Story | Bản nháp tính là "cắt mới" | Thực tế trong QĐ-77 |
|---|---|---|
| E7-S2 template chỉ tiếng Anh | 4 | Đã rút gọn 8 → 4 |
| E6-S9 xuất CSV | 3 | Đã hoãn |
| E8-S8 nhãn Verified | 3 | Đã hoãn |
| E3-S4 hồ sơ organizer | 3 | Đã rút gọn 5 → 2 |
| E10-S3 About/FAQ | 2 | Đã rút gọn 3 → 1 |
| E9-S4 quản lý user/khu vực | 4 | Đã rút gọn 5 → 1 |
| E5-S3 truy vấn bán kính | 8 | Đã hoãn (near-me đã được xây ngoài kế hoạch) |
| **Cộng** | **27** | Không được tính lại |

**Cắt mới thật sự (khoảng 11 SP):**

| # | Hạng mục | SP | Lý do gắn với bằng chứng |
|---|---|---|---|
| 1 | E7-S3 Web Push (phần 3 SP còn lại của QĐ-77) | 3 | Trên iOS chỉ nhận được push khi đã thêm app vào màn hình chính; du khách không cài (F10); email là kênh chính |
| 2 | E3-S6 OTP số điện thoại (phần 2 SP còn lại) | 2 | Không phân khúc nào trong video cần; trust level đã gánh |
| 3 | E9-S5 dashboard vận hành (phần 2 SP còn lại) | 2 | Bảng số liệu NFR-05 thay thế |
| 4 | Phần "Updated + diff" của FR-12 (chỉ giữ Cancelled) | 3 | Huỷ là việc quan trọng nhất mùa mưa; hiển thị diff để sau |
| 5 | UI lọc theo ngôn ngữ của FR-07 (vẫn giữ cột trong migration) | 1 | Bằng chứng yếu; giữ dữ liệu để bật sau |

**Thiếu hụt sau khi cắt: khoảng 46 SP**, tương đương khoảng 1,6 sprint.

### 3.3 Cách đóng khoảng thiếu

1. **Re-baseline trong L2 (quyết định).**
   - Checklist được commit lần cuối ngày 24/09 ở mức 7%.
   - Từ đó tới nay đã có 50 commit đưa vào Discover (list, map, near-me, lọc ngày), API khu vực, moderation (report, block, hết hạn đình chỉ), hồ sơ, admin overview, users và audit log.
   - Mọi story thuộc các mảng này đã xong cần được trừ khỏi con số 330.
   - Nếu re-baseline thu hồi được **ít nhất 36 SP**, kế hoạch đứng vững và còn 10 SP buffer.
2. **Đo velocity thật** của L1 và L2. Số commit cho thấy TV1 làm cùng AI có thể đạt trên 28 SP/sprint, nhưng phải đo trước khi dựa vào.
3. **Giữ 5 SP buffer ở L12.**
4. **Checkpoint 08/03:** nếu còn thiếu hơn 10 SP thì dời gate M6 tối đa tới **15/04** (PO chấp nhận trước, mục 9).
5. **Phương án cắt tiếp nếu vẫn thiếu:**
   - Bảng số liệu NFR-05 dùng công cụ BI có sẵn thay vì tự dựng (khoảng 2 SP).
   - FR-13 chỉ dùng ảnh mặc định theo category, không cho upload ảnh bìa (khoảng 2 SP).

**Không cắt**: E6-S4 (an toàn), E11-S5 (SEO), NT-3. **Không đầu tư thêm**: map, swipe, post, chat, follow, DM, T-05; chỉ vá T-23.

## 4. Task card

Quy ước chung:
- Mọi card đi qua test lane unit, integration và screen, rồi regression trước khi merge.
- `packages/contracts`, `packages/i18n`, `packages/domain` sửa nối tiếp, không làm song song.
- Key i18n mới (EN và VI) do TV2 sở hữu.
- Chưa có `apps/mobile` thật nên không buộc build EAS.

### M1-CLOSE — đóng M1 quá hạn
- **Owner**:
  - TV1: xác minh email T-10, T-21.
  - TV2: Google login T-11, đặt lại mật khẩu, T-20.
- **App**: `apps/api` (auth), `apps/web-client-side`
- **SP**: đã nằm trong 330
- **Phụ thuộc**: không
- **DoD**: M1-1, 2, 4, 6, 7, 8 đạt (M1-3 và M1-5 đã xong). Đăng ký mới cấp T0; xác minh email xong mới lên T1.
- **Cổng**: schema (`social_accounts`), PII

### BASELINE — đối chiếu lại checklist
- **Owner**: TV1, 0,5 ngày trong L2
- **Việc**: đối chiếu checklist với repo, tính lại SP còn lại và velocity thật
- **DoD**: Founder xác nhận con số mới; mục 3 của tài liệu này được cập nhật

### EV-SCHEMA — FR-01 + FR-03 + FR-07 + FR-13, migration `0014`
- **Owner**: TV1
- **App**: `apps/api` (event, media), `packages/contracts`, `packages/domain`
- **SP**: 8 (ròng khoảng 5)
- **Phụ thuộc**: M1-CLOSE; danh sách field chốt sau buổi đọc giữa kỳ 30/10; PO duyệt
- **Hợp đồng dữ liệu (dự thảo)**:
  - `category` enum, mặc định `other`: `festival, music, outdoor, sports, language_exchange, family, food_drink, wellness, professional, other`
  - `audience text[]`: `family_friendly, solo_friendly`
  - `alcohol_served boolean NOT NULL DEFAULT false`
  - `language_codes text[]` mặc định `{en}`
  - `cover_media_id uuid NULL`; bản đầu dùng ảnh mặc định theo category
  - Index `(category, status)`; GIN cho `audience` khi cần; không đụng index GIST
  - Backfill: các cột đều có DEFAULT; sự kiện cũ nhận `other` và `{en}`
  - Rollback: `DROP COLUMN` theo thứ tự ngược, diễn tập trên staging
- **Hợp đồng API**:
  - Thêm field vào Create, Update và Response.
  - `ListEventQuery` thêm `category` và `audience`.
  - Lọc `family_friendly` luôn loại các sự kiện có `alcohol_served = true`.
  - Mã lỗi `EVENT_CATEGORY_INVALID` (400).
- **DoD**: FR-01 AC-1..5; FR-03 AC-1..2; AuditLog khi sửa category; test lọc kết hợp
- **Cổng**: **STOP đổi schema**

### EV-FORM-UI — form tạo/sửa có field mới
- **Owner**: TV1 · **App**: web-client `events/new` và trang sửa · **SP**: gộp vào EV-SCHEMA · **Phụ thuộc**: EV-SCHEMA

### EV-MANAGE — UI sửa và huỷ sự kiện
- **Owner**: TV1 · **App**: web-client `my-events`, `events/[id]` · **SP**: 3 (ròng 0, nằm trong E4-S3) · **Phụ thuộc**: M1-CLOSE

### FR12-NOTIFY — báo huỷ cho người đã RSVP
- **Owner**: TV1
- **App**: `apps/api` (event, rsvp, mail, BullMQ)
- **SP**: 5
- **Phụ thuộc**: EV-MANAGE; hạ tầng hàng đợi của M3. Phải kiểm cascade `cancelled` sang RSVP trước
- **Hợp đồng**:
  - Khi sự kiện chuyển sang `cancelled`, một job BullMQ gửi email (tiếng Anh) qua `MailService.send()` cho mọi RSVP `confirmed / held / waitlisted`.
  - AuditLog ghi actor và entityId.
  - Trang sự kiện hiện nhãn Cancelled và ẩn nút RSVP.
- **DoD**: FR-12 AC-1 (AC-2 phần diff đã dời). Deploy khi còn job trong hàng đợi không làm hỏng hàng đợi
- **Cổng**: PII (email, không ghi vào log)

### DISC-PRESET — FR-02
- **Owner**: TV1 · **App**: `packages/domain` (`DiscoverWhen`), web-client discover/feed, i18n · **SP**: 2
- **DoD**: FR-02 AC-1..2; test quanh nửa đêm (23:59 → 00:01) và lúc 17:30 Asia/Ho_Chi_Minh; trạng thái rỗng gợi ý Tomorrow

### PUBLIC-EVENT — FR-04 + FR-05 + hiển thị FR-13
- **Owner**: TV2
- **App**: web-client `events/[id]`, tách thành server page + client component
- **SP**: 7 (ròng khoảng 2–3)
- **Phụ thuộc**: NFR06-PRIVACY; EV-SCHEMA (ảnh OG mặc định có thể làm trước)
- **Hợp đồng**:
  - `generateMetadata` gọi `GET /events/:id` công khai.
  - Sự kiện bị ẩn hoặc gỡ trả 404/410.
  - Link nhận tham số `?src=`.
- **DoD**: FR-05 AC-1..4; FR-04 AC-1..3; kiểm preview thật trên WhatsApp, Instagram, TikTok; nhãn Ended và nút Retry có test screen
- **Cổng**: PII (`EventResponse` công khai không chứa email hay số điện thoại)

### NFR06-PRIVACY — quyền riêng tư cho khách
- **Owner**: TV2; TV1 hỗ trợ test API · **SP**: 1 · **Làm trước** PUBLIC-EVENT
- **DoD**:
  - Test integration: `GET .../rsvps` trả 401 cho khách.
  - `/u/[handle]` trả 401 hoặc chỉ dữ liệu tối thiểu (PO chốt, mục 9).
  - `EventResponse` chỉ chứa tên host và trust level.
  - HTML trả cho khách không chứa avatar hay tên người tham dự.
  - Có banner xin đồng ý trước khi ghi analytics.
- **Cổng**: PII

### NFR05-MEASURE — đo nguồn truy cập
- **Owner**: TV3 (phễu phân tích theo QĐ-78); TV2 review phần consent
- **App**: `apps/api` (module tracking mới), web-client, một bảng số liệu trong web-admin
- **SP**: 4 (ròng khoảng 1)
- **Phụ thuộc**: PUBLIC-EVENT, NFR06-PRIVACY
- **DoD**: NFR-05 AC-1..2 (`guest_view` + `deep_link_source`, không định danh; người dùng từ chối thì không ghi); Founder xem được số lượt theo nguồn
- **Cổng**: PII; cơ sở xử lý là sự đồng ý (Luật 91/2025). Bảng mới là migration `0015` riêng, **cần PO duyệt**

### Việc không code

| Card | Owner | Nội dung | Hạn |
|---|---|---|---|
| SEED-FR06 | Founder; TV3 làm công cụ curate | Ít nhất 5 sự kiện lễ hội/nhạc/trekking mỗi tuần trước M5 (PO chốt ngưỡng); mỗi listing ghi nguồn, người curate, thời điểm. Cần category từ EV-SCHEMA để thống kê | Bắt đầu L3 |
| BR05-PARTNER | Founder | Liên hệ Danang 365 để seed nội dung | **Trước 20/11**, kịp Christmas Market 4–6/12 |
| BR-06 | Founder | Thông điệp "What's on in Da Nang" trên trang chủ và About | L4 |
| RESEARCH-R2 | Founder (PO); TV1 hỗ trợ tổng hợp | 24–30 buổi theo doc 16 §11.4, ghi âm có tiếng | Bắt đầu 19/10 · đọc giữa kỳ 30/10 · báo cáo 13/11 · Go/Pivot 18/11 |

## 5. Lịch theo sprint

Tối đa 28 SP mỗi sprint; phân bổ chi tiết sau BASELINE.

| Sprint | Ngày | Mục tiêu | TV1 | TV2 | TV3 | Founder | Mốc / thị trường |
|---|---|---|---|---|---|---|---|
| **L2** | 05–16/10 (còn 12–16/10) | Đóng M1, re-baseline, PO duyệt | T-10, T-21, BASELINE | Google login, reset mật khẩu, T-20 | Rà admin; chốt danh sách category để seed | Duyệt mục 9; tuyển người phỏng vấn | Mùa mưa: ưu tiên việc trong nhà |
| **L3** | 19–30/10 | Hoàn tất M1; sửa/huỷ; trang công khai | EV-MANAGE, test NFR-06 | NFR06-PRIVACY, PUBLIC-EVENT (server wrapper, OG mặc định) | Curate đợt 1 | Bắt đầu vòng 2 (19/10); đọc giữa kỳ 30/10 | **M1 đóng 30/10** |
| **L4** | 02–13/11 | Migration `0014`; lọc category/audience; preset | EV-SCHEMA, EV-FORM-UI, DISC-PRESET | i18n EN+VI | Khung NFR-05; curate | Vòng 2; thông điệp BR-06 | **M2 13/11** |
| **L5** | 16–27/11 | RSVP, sức chứa, waitlist | RSVP + waitlist | PUBLIC-EVENT hoàn thiện (ảnh bìa, Share) | NFR-05 hoàn thiện | **Go/Pivot 18/11**; hẹn Danang 365 trước 20/11 | Chuẩn bị seed Christmas Market |
| **L6** | 30/11–11/12 | Thông báo, nhắc T-24h/T-2h | Notification, FR12-NOTIFY | Tuỳ chọn thông báo; bắt đầu PWA | Hoàn thiện moderation | Christmas Market 4–6/12: đăng sự kiện thật | **M3 11/12** |
| **L7** | 14–25/12 | Trust & Safety, trust T0–T3 | `trust:recompute` (T-13) | Xuất/xoá dữ liệu | Hàng đợi report | Curate New Year Festival | **M4 25/12** |
| Freeze | 28/12–01/01 | Chỉ trực P0 | | | | | New Year Festival |
| **L8** | 04–15/01 | Admin Curation Console | Hỗ trợ curation API | PWA (manifest, service worker) | E9-S2/S3 curate và chuyển giao organizer | Seed nội dung mùa nomad | |
| **L9** | 18–29/01 | PWA, sitemap, kiểm tra trang công khai | Sửa lỗi, hiệu năng | PWA add-to-home, SEO sitemap | Chuyển giao organizer | **Go/No-go M5a ngày 29/01** | |
| Freeze Tết | 01–12/02 | Chỉ trực P0 | | | | Tuyển 60 user beta | Tết 06/02; mùa nomad cao điểm bắt đầu giữa tháng 2 |
| **L10** | 15–26/02 | Public read-only; beta kín 60 user | Hotfix hằng ngày | Hotfix, i18n | Moderation | Vận hành beta | **M5a 15/02 · M5 26/02** |
| **L11** | 01–12/03 | Sửa lỗi P0/P1, nạp bản dịch VI, bịt lỗ phễu | Phễu RSVP | Nạp bản VI | Bảng số liệu NFR-05 | **Checkpoint 08/03** | |
| **L12** | 15–26/03 | Release candidate, diễn tập runbook, curate 25 sự kiện/tuần | RC | RC, SEO | Runbook | **Soft-launch tại Nomad Fest 19–28/3** (mời chọn lọc + public read-only); Marathon khoảng 21/3 | Buffer 5 SP |
| Tuần ra mắt | 29/03–02/04 | War-room | | | | | **M6 01/04** |
| Sau ra mắt | 04–08/2027 | Ổn định; thông báo tiếng Việt; đọc số NFR-05; xét FR-08/09/10 nếu vòng 2 ủng hộ | | | | Chuẩn bị DIFF (ước cuối tháng 5 – tháng 7, chưa công bố; lập kế hoạch cứng khi có lịch chính thức); IRONMAN 70.3 khoảng 9/5 (chưa chính thức) | Mùa nomad kéo dài tới giữa tháng 5 |

**Vì sao soft-launch tại Nomad Fest thay vì mở đại trà**: Nomad Fest rơi đúng giữa L12 (release candidate, diễn tập runbook). Gate M6 cần 4 tuần số liệu liên tục, và mở đại trà giữa lúc chạy RC làm tăng rủi ro hotfix. Vì vậy chỉ mời chọn lọc, kèm trang công khai read-only.

### Đánh giá mốc M5a "public read-only"

**Khả thi, rủi ro thấp**, vì API và trang chi tiết cho khách đã chạy. Phần còn thiếu là server render + Open Graph (PUBLIC-EVENT), NFR-06, PWA (L8–L9), sitemap và SEO. Moderation đã xong từ M4.

**Điều kiện vào M5a** (kiểm ngày 29/01):
- NFR-06 và consent đạt.
- Moderation và report chạy ổn.
- Ít nhất 15 sự kiện curated đang mở, trong đó ít nhất 5 thuộc lễ hội/nhạc/trekking.
- Không còn lỗi P0 mở.

Không nên kéo sớm về 02/02 vì 01–12/02 là freeze Tết, chỉ trực P0.

## 6. Milestone cập nhật

| Mốc | Cũ | Mới | Gate thay đổi | Lý do |
|---|---|---|---|---|
| M1 | 02/10 | **30/10** | Giữ M1-1..8; thêm test NFR-06 (API trả 401 cho khách) | Quá hạn; ưu tiên số một, không được trượt quá L3 |
| M2 | 13/11 | 13/11 | Thêm lọc category/audience, preset Tonight/Tomorrow/Weekend, trang chi tiết có Open Graph | Gộp FR-01..04 |
| M3 | 11/12 | 11/12 | Thêm huỷ sự kiện có email báo người đã RSVP | FR-12 phụ thuộc hạ tầng thông báo |
| M4 | 25/12 | 25/12 | Giữ nguyên | |
| **M5a** (mới) | — | **15/02/2027** | Điều kiện ở mục 5 | Khai thác đầu mùa nomad; đo `guest_view` thật |
| M5 | 26/02 | 26/02 | Thêm số liệu nguồn truy cập từ NFR-05; ít nhất 70% người trả lời vòng 2 kể được một ví dụ cụ thể | Cần dữ liệu thật để quyết GD-01 |
| M6 | 01/04 | 01/04 (dự phòng tối đa 15/04) | Giữ gate dòng chảy: trung bình 4 tuần ít nhất 25 sự kiện/tuần, không tuần nào dưới 20. Thêm: ít nhất 5 sự kiện lễ hội/nhạc/trekking mỗi tuần (FR-06, PO chốt) và báo cáo tỷ trọng `deep_link_source` | Gate dùng để kiểm giả thuyết, không hạ chuẩn vì đội nhỏ |

## 7. Phụ thuộc và đường găng

```
M1-CLOSE ──► EV-SCHEMA (field chốt 30/10 + PO duyệt) ──► EV-FORM-UI ──► M2
M1-CLOSE ──► RSVP (L5) ──► Notification (L6) ──► FR12-NOTIFY ──► M3
NFR06-PRIVACY ──► PUBLIC-EVENT ──► M5a
EV-SCHEMA ──► PUBLIC-EVENT (ảnh bìa, category) ; EV-SCHEMA ──► SEED-FR06
NFR06-PRIVACY ──► NFR05-MEASURE ──► M5 (số liệu)
RESEARCH-R2 ──► Go/Pivot 18/11 ──► ưu tiên backlog từ L5
DISC-PRESET: độc lập, chỉ cần lượt sửa packages/domain sau EV-SCHEMA
```

**Đường găng**: M1-CLOSE → EV-SCHEMA → RSVP → Notification + FR12-NOTIFY → Trust & Safety → Curation → PWA → M5a/M5 → M6.

Gần như toàn bộ đường găng nằm ở TV1, nên bus factor bằng 1 nằm đúng trên đường găng. Đó là lý do PUBLIC-EVENT, NFR-05 và NFR-06 được giao cho TV2 và TV3.

## 8. Rủi ro

| Rủi ro | Xác suất | Tác động | Giảm thiểu | Chủ |
|---|---|---|---|---|
| Bus factor bằng 1 trên đường găng | Cao | Cao | Chuyển 3 card sang TV2/TV3; viết hợp đồng trước; review chéo | TV1 + Founder |
| Re-baseline không thu hồi đủ 36 SP | TB | Cao | Đo velocity thật; phương án cắt tiếp ở mục 3.3; checkpoint 08/03; dự phòng M6 15/04 | TV1 + PO |
| M1 trễ thêm | TB | Cao | Không nhận feature mới cho tới khi M1 xong; hạn cứng 30/10 | TV1 |
| Thiếu dữ liệu vòng 2 | TB | TB | Kịch bản không dẫn dắt; kiểm file ghi âm ngay sau buổi; chỉ số ở doc 16 §11.4 | Founder |
| Mưa bão tháng 10–11 | Cao | TB | Phỏng vấn trong nhà; FR-12 báo huỷ | Founder + TV1 |
| Phải đổi schema sau khi đã mở | TB | Cao | Chốt field 30/10; cột có DEFAULT; có rollback; PO duyệt | TV1 + PO |
| Cold-start nội dung | TB | Cao | Seed theo Christmas Market và New Year Festival; hợp tác Danang 365; curate theo category | Founder + TV3 |
| Lộ PII ở trang công khai hoặc analytics | Thấp | Cao | Test NFR-06; consent; rà `EventResponse` | TV2 |
| GD-08: điểm đến của du khách nằm ngoài 6 khu MVP | TB | TB | Chưa mở rộng khu vực; đánh giá lại sau 18/11; tạm dùng phạm vi toàn thành phố | PO + TV3 |
| Định vị lệch giữa expat và du khách | TB | TB | PO chốt định vị; theo dõi tỷ lệ khách xem / đăng ký qua NFR-05 | PO |

## 9. Quyết định cần PO duyệt trước khi code

1. **Định vị "expat-first, visitor-friendly"** (doc 16 §11.1). Cần trước khi PUBLIC-EVENT bắt đầu.
2. **Migration `0014`** (category, audience, alcohol_served, language_codes, cover_media_id). Đây là cổng STOP; danh sách field chốt sau buổi đọc giữa kỳ 30/10.
3. **Migration `0015`**: bảng tracking của NFR-05. Cổng STOP.
4. **Phạm vi cắt mới khoảng 11 SP** ở mục 3.2, và nguyên tắc không đầu tư thêm vào map/swipe/post/chat/follow.
5. **Ngưỡng gate**:
   - ít nhất 5 sự kiện lễ hội/nhạc/trekking mỗi tuần;
   - ít nhất 70% người trả lời vòng 2 kể được ví dụ cụ thể;
   - điều kiện vào M5a.
6. **Dự phòng lịch**: chấp nhận dời gate M6 tới 15/04 nếu tới 08/03 vẫn thiếu hơn 10 SP; soft-launch tại Nomad Fest theo kiểu mời chọn lọc + public read-only.
7. **Hồ sơ `/u/[handle]` với khách**: chặn hoàn toàn (401) hay trả dữ liệu công khai tối thiểu.

## 10. Ghi chú kỹ thuật

- **Kiến trúc**:
  - Giữ một backend, một DB, một Redis.
  - Trang sự kiện tách thành server wrapper + client component, để crawler đọc được Open Graph mà không phải viết lại logic RSVP.
  - Email báo huỷ chạy qua BullMQ, không chạy trong request.
- **Module bị ảnh hưởng**:
  - `apps/api`: event, rsvp, mail, media, queue, tracking (mới).
  - `apps/web-client-side`: `events/[id]`, discover, feed, `events/new`, `my-events`.
  - `apps/web-admin-side`: bảng số liệu NFR-05.
  - `packages`: contracts, domain, i18n.
- **Việc làm song song an toàn**:
  - L2: M1-CLOSE ∥ BASELINE
  - L3: EV-MANAGE ∥ PUBLIC-EVENT ∥ NFR06-PRIVACY
  - L4: EV-SCHEMA rồi EV-FORM-UI ∥ DISC-PRESET
- **Test lane**:
  - Unit: preset theo múi giờ; lọc audience/alcohol.
  - Integration: khách nhận 401; cascade khi huỷ; lọc kết hợp.
  - Screen: Open Graph; nhãn Ended/Cancelled.
  - Regression: RSVP đồng thời khi sự kiện bị huỷ; truy vấn lọc vẫn dùng index GIST.
- **Câu hỏi kỹ thuật mở**:
  - Cascade `cancelled` sang RSVP và occurrence xử lý thế nào?
  - `jwt-auth.guard.ts` có trả 401 đúng cho mọi route không `@Public` không?
  - Sự kiện lặp lại (T-17) ảnh hưởng email báo huỷ ra sao?
