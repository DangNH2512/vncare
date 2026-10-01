# Requirement Brief — discover-and-admin-overview (Giai đoạn 1)

**Chủ:** chưa gán (Coordinator gắn) · **Nguồn:** BA Agent, 01/10/2026 (Thứ Năm, giờ Đà Nẵng) · **Trạng thái:** phạm vi đã được chủ dự án chọn, brief chờ Tech Lead chốt hợp đồng. Chạy L8, đợt đổi lớn (4 package, 3 service).
**Giai đoạn:** 1 kết nối cộng đồng. Phần A là lõi của M2 "tạo và khám phá sự kiện" (`docs/checklists/theo-phase/M2-tao-kham-pha-su-kien.md`). Phần B là nền console vận hành, chưa đối chiếu mục checklist (Coordinator gắn). Không chuẩn bị gì cho giai đoạn 2/3.


## 0. Quyết định của Coordinator (01/10/2026)

Chủ dự án đã chọn phạm vi: Discover = List + Map + bộ lọc (khu vực, Near me, Today/Weekend/This week qua `from`/`to` mới ở API); Admin = Overview dashboard số liệu thật (endpoint mới `GET /admin/overview`). Đã duyệt đổi API và `packages/contracts`.

| Câu hỏi | Quyết định |
|---|---|
| Q-1 Near me sắp theo khoảng cách | Không, giữ theo giờ bắt đầu (D-9) |
| Q-2 Hiện sự kiện đang diễn ra | Không ở v1 (D-1); ghi R-1 |
| Q-3 Curator/moderator thấy một phần Overview | Không (D-14) |
| Q-4 Cột `is_test` | Không đợt này (D-20); follow-up |

Thứ tự: đợt này chỉ bắt đầu sửa code sau khi đợt `m1-auth-hardening` đã test và commit.

## 1. Mục tiêu nghiệp vụ

**A. Discover.** Expat mới đến Đà Nẵng mở `/discover`, không cần đăng nhập, thấy danh sách sự kiện sắp diễn ra thật. Họ thu hẹp theo khu vực, theo ngày (Today / Weekend / This week) hoặc theo "gần tôi", rồi chuyển qua bản đồ. Họ bấm vào sự kiện hoặc RSVP ngay trên thẻ. Không bao giờ thấy sự kiện đã qua, bản nháp hay một màn hình trắng.

**B. Admin Overview.** Admin/super_admin mở console và trong một màn hình biết: cộng đồng có đang lớn lên không (người dùng, sự kiện, RSVP, bài đăng), hệ thống có khoẻ không, ai vừa vào và sự kiện nào vừa được tạo. Không lộ dữ liệu liên lạc cá nhân.

## 2. Tác nhân

| Tác nhân | Dùng gì | Ghi chú |
|---|---|---|
| **Guest** (chưa đăng nhập) | Xem Discover, lọc, bản đồ | Guest-first, không có tường đăng nhập (doc 10 Q-01). Bấm RSVP thì mở đăng ký rồi quay lại (doc 01 Đ14). |
| **Member** | Như guest, thêm RSVP/huỷ RSVP ngay trên thẻ | Thấy `viewerRsvpStatus` của mình. |
| **Persona P1** (expat mới đến) | Lọc cuối tuần + khu vực + gần tôi | Bộ lọc thời gian là công dân hạng nhất (doc 10 Q-03). |
| **Admin / super_admin** | Toàn bộ Overview | Có quyền `analytics.platform.view` (doc 01 §9.2 dòng 19). |
| **Curator, moderator** | Chỉ thấy lời chào hiện tại, không có số liệu | Curator chỉ được "phễu curate", moderator ❌ analytics toàn hệ thống. |
| **Member mở nhầm web-admin** | Bị từ chối như cũ | |

Không có Event Organizer hay Local Host trong đợt này (chỉ hiển thị tên host trên thẻ sẵn có).

## 3. Phạm vi

**Trong phạm vi**
- A1. `/discover` thay `BlankScreen`: danh sách sự kiện từ `GET /api/v1/events`, chuyển List ↔ Map (MapLibre), "Load more" bằng cursor.
- A2. Bộ lọc: chip 6 khu vực + "All areas"; "Near me" với bán kính; chip ngày Upcoming (mặc định) / Today / Weekend / This week.
- A3. API: thêm `from`/`to` vào `ListEventQuery` (`packages/contracts/src/event.ts`) và vào truy vấn `EventRepository.list`.
- A4. Trạng thái đang tải / lỗi / rỗng (3 biến thể), EN/VI, responsive mobile + desktop, giờ hiển thị `Asia/Ho_Chi_Minh`.
- A5. Thẻ sự kiện dùng lại `EventCard`, bổ sung rule "đã bắt đầu thì không RSVP" (ảnh hưởng cả Home).
- B1. `GET /api/v1/admin/overview` (admin/super_admin): 5 KPI + 5 thành viên mới nhất + 5 sự kiện mới nhất.
- B2. Trang `/` của web-admin: lưới KPI, khối tình trạng hệ thống (gọi `GET /admin/system/health` sẵn có), hai bảng; trạng thái tải/lỗi/rỗng; EN/VI.
- B3. Khoá quyền mới `analytics.platform.view` trong `PERMISSION_MATRIX`.

**Ngoài phạm vi (không mở rộng):** Swipe; review/điểm host; "What people say"; lịch tháng; tìm kiếm chữ; trang SEO `/areas/[slug]`; facet count; lọc category/ngôn ngữ/giá/audience; `sort` khác ngoài giờ bắt đầu; "Pick a date"; trang quản lý người dùng; hàng đợi kiểm duyệt; biểu đồ; trang chi tiết sự kiện phía admin; cột `source`/curated; lọc "ES-03 khu vực lân cận".

## 4. Hành vi as-is [đọc code; Tester xác nhận bằng chạy thật]

**Discover (web-client)**
- `app/(shell)/discover/page.tsx` chỉ render `BlankScreen` với key `blank.discover.*` ("Discover is being built").
- `GET /api/v1/events` là `@Public()`. Repository `list` (event.repository.ts:176-210) lọc `deleted_at IS NULL AND (status='published' OR organizer_id=viewer)`, sắp theo `occ.starts_at ASC, e.id ASC`, cursor keyset. **Không có điều kiện thời gian**: sự kiện đã qua vẫn trả. Sự kiện `draft` của chính người xem vẫn trả nếu không truyền `status`.
- `ListEventQuery` có `areaId` (một khu), `status`, `organizerId`, `lat`/`lng`/`radiusMeters` (100–50.000 m, phải đủ cả ba), `cursor`, `limit` (≤50, mặc định 20). **Chưa có** `from`/`to`, `sort`, `source`.
- Response mỗi sự kiện có lat/lng chính xác cho cả người ẩn danh, `seatsTaken`, `capacity`, `viewerRsvpStatus`, `organizer.{handle,displayName,trustLevel}`. Phân trang trả `{ items, nextCursor }`.
- Home (`feed-stream.tsx`) gọi `listEvents(50)` không tham số. Lọc "Today/Weekend" ở client; `isWeekend` (dòng 20-25) dùng `getDay()` theo **múi giờ trình duyệt**, và chấp nhận mọi ngày thứ 7/CN trong tương lai xa, không chỉ tuần này.
- `EventCard` luôn hiện nút RSVP/Join waitlist khi chưa RSVP, không kiểm tra sự kiện đã bắt đầu. `joinOccurrence` lỗi thì hiện `messageKey` của server (event-card.tsx:54-60).
- `location-picker.tsx` đã khởi tạo MapLibre (`setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')`, raster OSM, marker `#0369A1`), tái dùng được.
- `_lib/areas.ts` có 6 khu theo thứ tự An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn, mỗi khu có `id` UUID, `center`; `DA_NANG_CENTER`. `_lib/datetime.ts` có `APP_TIME_ZONE='Asia/Ho_Chi_Minh'`, `dayOffsetFrom`, `isPast`.
- i18n đã có sẵn nhánh `discover.*` (title, areas.aria, view.list/map, results.count, map.*, empty.*, filters.*) và `feed.*`. Phần lớn chưa dùng.
- Bảng `events` không có cột `source`/curated (chỉ `is_featured`). Mockup W-10 ghi `source_type='member'` nhưng DB không phân biệt. Mọi sự kiện hiện do `organizer_id` tạo.

**Admin (web-admin)**
- `app/(console)/page.tsx` chỉ có `<h1>` + một đoạn mô tả (`admin.overview.title/body`). Mọi role staff đều vào được và thấy mục "Overview" ở sidebar.
- `AdminController` chỉ có `GET admin/system/health` với `@Roles(...allowedRolesFor('system.health.view'))` = admin, super_admin. `RolesGuard` trả 403 `{ code: 'ROLE_NOT_ALLOWED', messageKey: 'errors.auth.roleNotAllowed' }`.
- `PermissionKey` hiện chỉ có `admin_console.access` và `system.health.view`. Chưa có `analytics.platform.view`.
- `users` có `email`, `phone`, `role`, `trust_level`, `status`, `deleted_at`, `anonymized_at`; `profiles` có `handle`, `display_name`. Không có cột đánh dấu tài khoản test. Tài khoản e2e dùng `@example.test`.
- Chưa có bảng `audit_log` (m1-auth-hardening brief để ngoài phạm vi).

## 5. Behavior smell

| # | Smell | Xử lý |
|---|---|---|
| S-1 | `list` không có sàn thời gian, trả cả sự kiện đã qua; trả cả bản nháp của chính viewer nếu không truyền `status` | Discover luôn gửi `status=published` + `from`. API không đổi mặc định cho Home. |
| S-2 | Chip "Weekend" của Home dùng múi giờ trình duyệt, tính cả cuối tuần xa | Discover không dùng lại. Ghi nhận cho Home (follow-up, ngoài đợt). |
| S-3 | Mockup nói "chỉ sự kiện thành viên đăng" nhưng DB không có `source` | Quyết định D-1. |
| S-4 | `EventCard` cho RSVP sự kiện đã bắt đầu, trái doc 01 Đ15 ("occurrence chưa `starts_at`") | Sửa trong thẻ dùng chung (D-12). |
| S-5 | Lat/lng chính xác trả cho guest, trái doc 01 Đ1 và doc 10 §9.3 (vòng 300 m) | Ngoài phạm vi, ghi rủi ro R-3. Không có `location_precision` trong schema. |
| S-6 | Doc 10 dùng `radiusKm`, `areas[]`, `sort=distance`; hợp đồng thật là `radiusMeters`, `areaId` đơn, không `sort` | Hợp đồng thật thắng. Doc 10 lệch, ghi lại. |
| S-7 | Doc 10 §9.1:1171 "bán kính loại trừ lẫn nhau với areas[]" khác với phát biểu phạm vi "kết hợp" | Quyết định D-6. |
| S-8 | Doc 10 §7.3 mặc định `sort=distance` khi có vị trí, nhưng cursor hiện là keyset theo giờ | Giữ sắp theo giờ (D-9). |
| S-9 | `OCCURRENCE_JOIN` lấy occurrence sớm nhất kể cả đã qua. Hiện an toàn vì mỗi sự kiện có đúng 1 occurrence | Ghi rủi ro R-5 khi có sự kiện lặp (giai đoạn sau). |
| S-10 | Home và Discover cùng liệt kê toàn bộ sự kiện, trong khi mockup đã tách "Home = curated, Discover = member" | Trùng lặp tạm thời, R-4. |
| S-11 | Mọi staff thấy "Overview" nhưng KPI chỉ dành admin | Quyết định D-14. |
| S-12 | `blank.discover.*` mồ côi sau khi thay trang | Xoá key, cập nhật `message-keys.ts`. |

## 6. Quyết định nghiệp vụ — Discover

Nguồn ghi `file:dòng`; không có nguồn thì là **Mặc định BA đề xuất**.

| ID | Câu hỏi | Quyết định | Nguồn |
|---|---|---|---|
| D-1 | Hiển thị sự kiện nào | Chỉ `status='published'`, `deleted_at IS NULL`, **chưa bắt đầu** (`starts_at >= from`, client luôn gửi `from ≥ now`). Sự kiện đang diễn ra (đã bắt đầu, chưa kết thúc) **không** hiện trong v1. Phân biệt curated/member: **chưa làm**. Không có cột `source`, hiện mọi sự kiện đã đăng đều do thành viên tạo, nên Discover = toàn bộ sự kiện published. Khi có curation (`curation.create`, doc 01:752), thêm tham số `source` rồi mới lọc | event.repository.ts:184; 0002_rsvp_core.sql:23-39; doc 10:542 ("đã qua không có giá trị"); mockup W-10 notes. Phần "ongoing" là mặc định BA |
| D-2 | Ai tính biên ngày | **Client tính**, API chỉ nhận ISO UTC và validate | doc 10 Q-03 (dòng 39), §9.1:1169 |
| D-3 | Múi giờ | Mọi biên là nửa đêm `Asia/Ho_Chi_Minh` (UTC+7, không DST), đổi sang ISO UTC (`toISOString()`) trước khi gửi. Tính lại **mỗi lần gọi** (tab mở qua nửa đêm vẫn đúng). Các trang sau của "Load more" dùng lại đúng `from`/`to` của trang đầu | datetime.ts:9; luật dự án "lưu UTC, hiển thị VN" |
| D-4 | Biên | `from` **inclusive**, `to` **exclusive**, áp lên `starts_at` của occurrence hiển thị: `starts_at >= from AND starts_at < to`. Cả hai tuỳ chọn, độc lập. | Mặc định BA |
| D-5 | Định nghĩa preset | Tuần = Thứ Hai–Chủ Nhật theo giờ VN. **Upcoming** = `from=now`, không `to`. **Today** = `from=now`, `to`=00:00 ngày mai. **Weekend** = `from=max(now, 00:00 Thứ Bảy)`, `to`=00:00 Thứ Hai kế tiếp. Hôm nay là Thứ Bảy hoặc CN thì from=now. **This week** = `from=now`, `to`=00:00 Thứ Hai kế tiếp (hôm nay là CN thì chỉ phần còn lại của CN). Ví dụ hôm nay Thứ Năm 01/10/2026 10:00 ICT: Weekend = `2026-10-02T17:00:00Z` → `2026-10-04T17:00:00Z`; This week = now → `2026-10-04T17:00:00Z` | Mặc định BA (doc 10 chỉ có "Tonight/This weekend/Next 7 days", chủ dự án chọn Today/Weekend/This week) |
| D-6 | Kết hợp bộ lọc | Khu vực + ngày kết hợp được. **Near me và chip khu vực loại trừ nhau**: bật Near me thì bỏ chip khu vực về "All areas", chọn chip khu vực thì tắt Near me. Ngày kết hợp với cả hai | doc 10 §9.1:1171 |
| D-7 | Khu vực | Chip đơn chọn (`areaId`), thêm chip "All areas" (đang chọn mặc định). Thứ tự theo `AREA_SLUGS`. Tên theo locale (`areaName`). Không đếm số trên chip (facet ngoài phạm vi) | areas.ts:10-17; event.ts:91 |
| D-8 | Near me | Chỉ xin quyền vị trí **khi người dùng bấm** (không xin lúc mở trang). Bán kính mặc định **2 km**, chọn 1–15 km (slider hoặc chip 1/2/5/10/15), gửi `radiusMeters = km*1000`. Từ chối/hết hạn 10 s/không hỗ trợ: Near me **không bật**, danh sách giữ nguyên, hiện thông báo inline có hướng dẫn, không mở popup chặn. Toạ độ **làm tròn 3 chữ số thập phân** trước khi gửi và **không** đưa vào URL, không lưu, không ghi log | doc 10 §9.1:1171 (1–15 km), §7.3:539 (2 km). Làm tròn/không vào URL là mặc định BA |
| D-9 | Sắp xếp | Duy nhất "soonest" (`starts_at ASC, id ASC`), không có control sort. Near me cũng giữ thứ tự giờ, không hiện khoảng cách (nằm ngoài hợp đồng `EventResponse`) | event.repository.ts:194; S-8 |
| D-10 | Phân trang | 20 mỗi trang, nút "Show more events" bằng `nextCursor`; ghép trang, **khử trùng theo `id`**. Không cuộn vô hạn | event.ts:90; mockup `discover.loadMore` |
| D-11 | Map | Dùng **chung một state bộ lọc** với List; hiển thị **các sự kiện đã tải** (các trang đã bấm "Load more"), không gọi truy vấn riêng. MapLibre lazy-load khi chuyển sang Map. Khung nhìn đầu = `DA_NANG_CENTER`, fit tất cả marker. Bấm marker mở popup nhỏ (tiêu đề, giờ, khu, chỗ còn) + liên kết `/events/{id}`. Kéo bản đồ **không** tự tìm lại. Nhiều sự kiện cùng toạ độ: popup liệt kê. Map rỗng: phủ thẻ "No events to show on the map" + nút "Show list". Map lỗi tải: thông báo + nút "Show list" | mockup W-13; doc 10 §9.3:1207-1216 |
| D-12 | Thẻ sự kiện | Dùng lại `EventCard`. Bổ sung: `startsAt <= now` (so lúc render) thì ẩn nút RSVP, hiện badge "Already started". Nút RSVP, waitlist, huỷ giữ nguyên hành vi. Guest bấm RSVP thì `requireAuth`. Thay đổi này áp dụng luôn cho Home | doc 01 Đ14, Đ15; event-card.tsx:137-162 |
| D-13 | Trạng thái và URL | Bộ lọc đồng bộ vào URL: `?area=<slug>&when=today\|weekend\|week&near=1&r=<km>&view=map`. Tải lại giữ nguyên. Không chứa toạ độ. Mặc định (`all`, không near, list) thì bỏ param. "Clear filters" xoá area/near/when, giữ `view` | doc 10 §8.2:977; mockup notes |

## 7. Quyết định nghiệp vụ — Admin Overview

| ID | Câu hỏi | Quyết định | Nguồn |
|---|---|---|---|
| D-14 | Ai thấy gì | `GET /api/v1/admin/overview` chỉ **admin, super_admin**: khoá mới `analytics.platform.view` trong `PERMISSION_MATRIX`, `@Roles(...allowedRolesFor('analytics.platform.view'))`. Curator/moderator vào `/` vẫn thấy tiêu đề + lời chào hiện tại, **không** gọi endpoint, không thấy KPI/bảng. API vẫn trả 403 nếu họ gọi trực tiếp | doc 01 §9.2 dòng 19; permission-matrix.ts |
| D-15 | Khối tình trạng hệ thống | Trang gọi **song song và độc lập** `GET /admin/system/health` (cùng role). Hỏng một khối không làm sập khối kia. Overview chỉ tóm tắt: badge trạng thái + tên dịch vụ down + liên kết sang `/system-health` | admin.controller.ts:22-27 |
| D-16 | Định nghĩa KPI | Mốc "7 ngày" = **cửa sổ trượt 7×24 giờ** tính từ `now()` của DB (không theo ngày lịch). (1) **Tổng người dùng**: `users` có `deleted_at IS NULL AND anonymized_at IS NULL`, mọi role/status. (2) **Người dùng mới 7 ngày**: như (1) và `created_at >= now()-7d`. (3) **Sự kiện sắp tới**: `status='published'`, `deleted_at IS NULL`, occurrence sớm nhất `starts_at > now()` (cùng định nghĩa với Discover). (4) **RSVP 7 ngày**: `rsvps.created_at >= now()-7d`, `deleted_at IS NULL`, `status <> 'cancelled'`. (5) **Bài đăng 7 ngày**: `posts.created_at >= now()-7d`, `deleted_at IS NULL`, `status='visible'` | Mặc định BA. Cùng schema 0002/0004/0008 |
| D-17 | Thành viên mới nhất | 5 dòng, sắp `created_at DESC`, chỉ users chưa xoá/ẩn danh. Trường trả về: `id`, `handle`, `displayName`, `trustLevel`, `createdAt`. **KHÔNG** `email`, `phone`, `role`, `status`, `locale`, IP. Hiển thị `displayName` dạng text thuần (không HTML) | Data minimization; doc 05 Q-01 (PII và người ngoài). Mặc định BA |
| D-18 | Sự kiện mới nhất | 5 dòng, sắp `events.created_at DESC`, `deleted_at IS NULL`, **loại `draft`** (bản nháp là nội dung riêng của người tạo). Trường: `id`, `title`, `areaId`, `startsAt`, `status`, `organizer.handle`, `organizer.displayName`. Không mô tả, không toạ độ. Không có liên kết ra (chưa có trang chi tiết phía admin) | Mặc định BA |
| D-19 | Cache | **Không cache** ở v1, mỗi lần mở trang là truy vấn mới (5 COUNT + 2 danh sách LIMIT 5, quy mô giai đoạn 1 nhỏ). Có nút "Retry" khi lỗi. Response có `generatedAt` (ISO UTC) để hiển thị "Updated …". Xét cache khi số hàng lớn | Mặc định BA |
| D-20 | Tài khoản `@example.test` | **Đếm tất cả**, không loại trừ. Lý do: harness e2e dùng chính tên miền này, loại trừ sẽ làm e2e của tính năng này không quan sát được; lọc theo mẫu email là phụ thuộc ngầm vào PII. Môi trường local sẽ có số lớn (hiển thị `environment` ở khối hệ thống giúp phân biệt). E2E assert theo **chênh lệch** trước/sau, không assert số tuyệt đối. Giải pháp bền vững (cột `is_test`) là follow-up | Mặc định BA |
| D-21 | Giờ hiển thị | Mọi thời điểm trong Overview hiển thị theo `Asia/Ho_Chi_Minh`; API trả UTC ISO | luật dự án |
| D-22 | Audit | Chỉ đọc, **không** ghi `audit_log` (bảng chưa tồn tại, đồng nhất với `system/health`). Không dữ liệu nhạy cảm vào log | Mặc định BA |

## 8. Acceptance criteria

### A. Discover (`apps/web-client-side`, `apps/api`)

- **A-AC-1 (Happy):** GIVEN DB có 3 sự kiện `published` sắp diễn ra ở các khu khác nhau WHEN guest mở `/discover` THEN trang gọi `GET /api/v1/events?status=published&from=<ISO≥now>&limit=20`, hiện 3 thẻ theo thứ tự giờ bắt đầu tăng dần, hiện "3 events found", chip "All areas" và "Upcoming" ở trạng thái chọn, nút "List" đang chọn.
- **A-AC-2 (Happy, khu vực):** GIVEN danh sách ở A-AC-1 WHEN bấm chip "My Khe" THEN request thêm `areaId=<id My Khe từ @dnc/geo>`, chỉ còn thẻ thuộc Mỹ Khê, URL có `?area=my-khe`; chip "All areas" bỏ chọn.
- **A-AC-3 (Happy, ngày):** GIVEN hôm nay Thứ Năm 2026-10-01 10:00 ICT WHEN bấm "Weekend" THEN request có `from=2026-10-02T17:00:00.000Z` và `to=2026-10-04T17:00:00.000Z`; sự kiện lúc `2026-10-03T09:00+07:00` hiện, sự kiện lúc `2026-10-05T00:00+07:00` (đúng biên `to`) **không** hiện, sự kiện lúc `2026-10-02T17:00:00Z` (đúng biên `from`) hiện.
- **A-AC-4 (Happy, map):** GIVEN danh sách có sự kiện WHEN bấm "Map" THEN MapLibre được nạp lazy, hiện một marker cho mỗi sự kiện đã tải với cùng bộ lọc; URL có `view=map`; bấm marker mở popup có tiêu đề + giờ + liên kết `/events/{id}`; chuyển về "List" giữ nguyên bộ lọc.
- **A-AC-5 (Happy, near me):** GIVEN trình duyệt cho phép vị trí WHEN bấm "Near me" THEN request có `lat`, `lng` (3 chữ số thập phân), `radiusMeters=2000`, chip khu vực về "All areas"; chip ngày và Near me cùng áp được; URL có `near=1&r=2` và **không** chứa toạ độ.
- **A-AC-6 (Edge, ngày):** GIVEN hôm nay là Chủ Nhật 2026-10-04 15:00 ICT WHEN bấm "This week" và "Weekend" THEN cả hai gửi `from=now` và `to=2026-10-04T17:00:00.000Z` (00:00 Thứ Hai); sự kiện ngày 04/10 18:00 hiện, sự kiện Thứ Hai 05/10 00:30 không hiện. GIVEN Thứ Bảy WHEN bấm "Weekend" THEN `from=now` (không lùi về 00:00 Thứ Bảy).
- **A-AC-7 (Edge, sàn thời gian):** GIVEN DB có sự kiện `published` đã bắt đầu 1 giờ trước, một `draft` của chính viewer và một sự kiện `cancelled` WHEN mở `/discover` đã đăng nhập THEN không thẻ nào trong ba sự kiện đó xuất hiện.
- **A-AC-8 (Edge, load more):** GIVEN 45 sự kiện khớp WHEN mở trang rồi bấm "Show more events" hai lần THEN trang 1 có 20, trang 2 cộng thành 40, trang 3 thành 45 và nút biến mất; không thẻ trùng `id`; mỗi lần dùng đúng `cursor` từ `nextCursor` trước và cùng `from`/`to`.
- **A-AC-9 (Edge, đã bắt đầu):** GIVEN một thẻ đang hiển thị mà `startsAt` đã trôi qua trong lúc tab mở WHEN thẻ render lại THEN nút RSVP/Join waitlist biến mất, hiện badge "Already started"; liên kết "Details" vẫn dùng được. Sự kiện đầy chỗ vẫn hiện "Join waitlist" khi chưa bắt đầu.
- **A-AC-10 (Edge, near me bị từ chối):** GIVEN người dùng chặn quyền vị trí (hoặc `getCurrentPosition` quá 10 s, hoặc không hỗ trợ) WHEN bấm "Near me" THEN không có request lọc bán kính, danh sách không đổi, Near me không ở trạng thái bật, hiện thông báo inline "Location access is blocked…" với hướng dẫn bật lại, không hiện popup chặn; chip khu vực vẫn dùng được.
- **A-AC-11 (Edge, rỗng 3 biến thể):** (a) GIVEN không có sự kiện upcoming nào trong DB và không bộ lọc WHEN mở trang THEN hiện empty "No upcoming events yet" + nút "Create an event". (b) GIVEN có sự kiện nhưng bộ lọc khu vực/ngày cho 0 kết quả THEN hiện "No events match your filters" + nút "Clear all filters", bấm nút xoá area/near/when, danh sách quay về đầy đủ. (c) GIVEN Near me bật cho 0 kết quả THEN hiện "No events within 2 km" + nút "Widen to 5 km", bấm thì gửi `radiusMeters=5000`. Ba biến thể có chuỗi khác nhau.
- **A-AC-12 (Edge, đua phản hồi):** GIVEN người dùng bấm "Weekend" rồi nhanh chóng bấm "Today" WHEN phản hồi của "Weekend" về sau "Today" THEN danh sách và nhãn đếm phản ánh "Today", phản hồi cũ bị bỏ.
- **A-AC-13 (Error):** GIVEN API trả 5xx hoặc mất mạng WHEN mở `/discover` THEN skeleton biến thành thẻ lỗi "We could not load events" + "Check your connection and try again." + nút "Retry"; bấm Retry gọi lại cùng bộ lọc. GIVEN lỗi xảy ra ở "Show more events" THEN các thẻ đã tải được giữ nguyên, hiện thông báo "Could not load more events." kèm nút thử lại. GIVEN MapLibre không tải được THEN hiện "The map could not load…" + nút "Show list", không trắng trang.
- **A-AC-14 (Error, tham số API):** GIVEN request `GET /api/v1/events?from=2026-10-05T00:00:00Z&to=2026-10-04T00:00:00Z` (to ≤ from), hoặc cửa sổ `to - from` > 92 ngày, hoặc `from` không phải ISO datetime WHEN gọi API THEN từ chối bằng mã validation hiện có của pipe với `messageKey: 'errors.event.dateRangeInvalid'` (body phẳng); không trả danh sách. Request thiếu `from`/`to` vẫn chạy như hiện tại (Home không bị ảnh hưởng).
- **A-AC-15 (Quyền):** GIVEN guest WHEN `GET /api/v1/events` (kèm từ/đến) THEN 200 (public, không cần token). GIVEN guest WHEN bấm RSVP trên thẻ THEN mở luồng đăng nhập/đăng ký, không gọi `POST …/rsvps` nặc danh, sau đăng nhập quay lại đúng bộ lọc (URL). GIVEN member `trust_level` thấp hơn `requiredTrustLevel` WHEN RSVP THEN thẻ hiện `messageKey` actionable của server (không "generic error" khi server đã trả key). Không có trường nào của bản nháp người khác lọt vào kết quả (assert qua API với `status=published` của user khác).
- **A-AC-16 (Audit):** GIVEN các thao tác lọc/xem Discover THEN không phát sinh mutation và không ghi audit. GIVEN RSVP từ thẻ THEN giữ nguyên hành vi/audit hiện có của `POST /api/v1/occurrences/{id}/rsvps` (không đổi đợt này). Log API không chứa toạ độ chính xác của người dùng (chỉ giá trị đã làm tròn trong query).
- **A-AC-17 (i18n):** GIVEN locale `en` rồi `vi` WHEN mở `/discover` ở cả 4 trạng thái (đang tải, có dữ liệu, rỗng, lỗi) và cả Map THEN mọi chuỗi (chip, aria-label, thông báo vị trí, empty, lỗi, popup, badge "Already started", dòng múi giờ) hiển thị đúng ngôn ngữ, không lộ key thô dạng `discover.xxx`; ngày giờ trên thẻ theo `Asia/Ho_Chi_Minh`; tên khu theo locale; dòng "Times shown in Da Nang time (GMT+7)" hiện. Tên/mô tả sự kiện do người tạo nhập hiển thị nguyên văn, không dịch.
- **A-AC-18 (Responsive):** GIVEN viewport 390 px và 1280 px WHEN mở `/discover` THEN chip cuộn ngang không tràn trang, thẻ không bị cắt chữ với chuỗi VI dài nhất, danh sách 1 cột ở mobile và có chỗ cho bộ lọc ở desktop, vùng bấm ≥ 44 px, Map có chiều cao dùng được ở mobile.

### B. Admin Overview (`apps/web-admin-side`, `apps/api`)

- **B-AC-1 (Happy):** GIVEN admin đăng nhập, DB có dữ liệu WHEN mở `/` THEN gọi `GET /api/v1/admin/overview` (200, envelope `{ success: true, data }`), hiện 5 thẻ KPI với số khớp truy vấn đếm trực tiếp theo D-16, bảng "Newest members" tối đa 5 dòng (name, handle, trust level, joined) và bảng "Newest events" tối đa 5 dòng (title, area, starts, host, status), dòng "Updated {time}" giờ VN, và khối "System status" hiện badge theo `GET /admin/system/health`.
- **B-AC-2 (Happy, cửa sổ 7 ngày):** GIVEN một user tạo cách đây 6 ngày 23 giờ và một user tạo cách đây 7 ngày 1 giờ WHEN gọi overview THEN chỉ user thứ nhất vào "người dùng mới 7 ngày"; cả hai vào "tổng người dùng". Tương tự cho RSVP (không tính `cancelled`) và bài đăng (chỉ `visible`).
- **B-AC-3 (Edge, rỗng):** GIVEN DB không có sự kiện upcoming, không RSVP, không bài đăng WHEN gọi overview THEN 200, KPI tương ứng là `0` (không `null`, không thiếu trường), hai bảng rỗng hiện "No members yet"/"No events yet" thay vì bảng trắng.
- **B-AC-4 (Edge, loại trừ dữ liệu):** GIVEN user đã xoá (`deleted_at`) hoặc ẩn danh, sự kiện `draft` hoặc đã xoá mềm, bài đăng `hidden`/`removed` WHEN gọi overview THEN không xuất hiện trong bảng và không được đếm theo D-16/D-17/D-18. Tài khoản `@example.test` **được đếm** (D-20); test e2e assert theo chênh lệch.
- **B-AC-5 (Edge, một khối hỏng):** GIVEN Redis cache down WHEN mở `/` THEN khối KPI/bảng vẫn hiện, khối hệ thống hiện "Degraded" kèm tên dịch vụ down. GIVEN endpoint overview lỗi 5xx nhưng health ổn THEN khối KPI/bảng hiện thẻ lỗi "Could not load the overview" + nút "Retry" còn khối hệ thống vẫn hiện bình thường.
- **B-AC-6 (Error):** GIVEN mất mạng WHEN mở `/` THEN thẻ lỗi có nút "Retry" gọi lại cả hai nguồn; trang không trắng, không vòng lặp tải. GIVEN trong lúc dùng, session hết hạn THEN client refresh một lần rồi thử lại (hành vi `call()` hiện có) và nếu refresh thất bại thì về màn đăng nhập.
- **B-AC-7 (Quyền):** GIVEN không token WHEN `GET /api/v1/admin/overview` THEN 401. GIVEN token `member` THEN 403 `{ code: 'ROLE_NOT_ALLOWED', messageKey: 'errors.auth.roleNotAllowed' }`. GIVEN token `curator` hoặc `moderator` THEN 403 (cùng body). GIVEN `admin` và `super_admin` THEN 200. GIVEN curator/moderator mở `/` trên web-admin THEN thấy tiêu đề + lời chào hiện có, không có KPI/bảng, và trình duyệt **không** gọi `/admin/overview` (assert network). Phải có test API cho đủ 5 vai (không chỉ ẩn UI).
- **B-AC-8 (Dữ liệu cá nhân):** GIVEN response của overview WHEN kiểm tra JSON THEN không có khoá `email`, `phone`, `role`, `status`, `passwordHash`, `ip` ở bất cứ đâu; `latestMembers[]` chỉ có `id, handle, displayName, trustLevel, createdAt`; `latestEvents[]` không có `description`, `lat`, `lng`, `viewerRsvpStatus`. Schema `AdminOverviewResponse` (zod, `@SerializeOptions`) loại mọi trường thừa. `displayName` có chứa `<script>` được hiển thị dưới dạng văn bản, không thực thi.
- **B-AC-9 (Audit):** GIVEN `GET /admin/overview` THEN không có bản ghi nào trong `users`, `events`, `rsvps`, `posts` bị thay đổi và log API không chứa `handle`/`displayName` (đồng nhất với D-22, AC-5 của đợt này là "không mutation, không PII trong log").
- **B-AC-10 (i18n):** GIVEN `en` và `vi` WHEN mở `/` ở cả 4 trạng thái (đang tải, dữ liệu, rỗng, lỗi) THEN mọi chuỗi (tiêu đề KPI, cột bảng, nhãn trạng thái sự kiện, "Updated {time}", empty, lỗi) đúng ngôn ngữ, không lộ key thô; giờ theo `Asia/Ho_Chi_Minh`; trạng thái sự kiện dùng `event.status.*` hiện có (không hiện giá trị enum thô như `pending_review`).
- **B-AC-11 (Responsive):** GIVEN viewport 390 px và 1280 px WHEN mở `/` THEN lưới KPI 1 cột (mobile) và nhiều cột (desktop), hai bảng không làm trang cuộn ngang ngoài vùng bảng (cuộn trong khung), vùng bấm ≥ 44 px.

## 9. Service bị ảnh hưởng

- **apps/api**:
  - `modules/event`: `EventRepository.list` thêm `($11 IS NULL OR occ.starts_at >= $11) AND ($12 IS NULL OR occ.starts_at < $12)`; controller không đổi route.
  - `modules/admin`: thêm `GET overview` (controller, service, repository chứa các truy vấn đếm và hai danh sách LIMIT 5; mapper).
  - Test e2e cho `from`/`to`, đủ 5 vai ở overview, loại trừ dữ liệu.
- **apps/web-client-side**: `app/(shell)/discover/page.tsx` + thành phần Discover (thanh lọc, danh sách, map lazy-load, empty/error/skeleton); `_lib/api.ts` mở rộng `listEvents` nhận bộ lọc; `_lib/datetime.ts` thêm hàm tính preset (Today/Weekend/This week) nhận `now` để test; `EventCard` (rule đã bắt đầu); tái dùng `location-picker` setup MapLibre (worker URL, style OSM).
- **apps/web-admin-side**: `app/(console)/page.tsx` + thành phần (KPI, bảng, khối hệ thống); `_lib/api.ts` thêm `getAdminOverview`; `Sidebar` giữ mục Overview cho mọi staff (không đổi).
- **apps/mobile**: không đổi. Hợp đồng `from`/`to` và hàm preset nên dùng lại được ở mobile về sau.
- **packages dùng chung**:
  - `packages/contracts`: `event.ts` (`from`, `to`, refine `to > from`, cửa sổ ≤ 92 ngày, key `errors.event.dateRangeInvalid`); `admin.ts` (`AdminOverviewResponse`, `AdminOverviewKpis`, `AdminLatestMember`, `AdminLatestEvent`).
  - `packages/domain`: khoá `analytics.platform.view` + `PERMISSION_MATRIX` (admin, super_admin). Tech Lead cân nhắc đặt hàm preset ngày ở đây để mobile dùng chung.
  - `packages/i18n`: `en.json`, `vi.json`, `src/message-keys.ts` (thêm key mới, xoá `blank.discover.*`).

## 10. Yêu cầu hợp đồng API/dữ liệu (ngôn ngữ nghiệp vụ, Tech Lead chốt thiết kế)

- **Danh sách sự kiện** nhận thêm hai mốc thời gian tuỳ chọn `from` (bao gồm) và `to` (không bao gồm), ISO-8601 UTC. Hai mốc lọc theo giờ bắt đầu của buổi diễn ra hiển thị. Nếu có cả hai thì `to` phải sau `from` và khoảng cách tối đa 92 ngày; vi phạm thì từ chối với key `errors.event.dateRangeInvalid`. Không truyền thì hành vi cũ. Khi kết hợp với `areaId` hoặc vị trí/bán kính thì áp đồng thời (AND). Việc "area và near me loại trừ nhau" là rule của UI, API vẫn chấp nhận cả hai (lọc AND) để không phá hợp đồng.
- **Tổng quan admin** là một lần đọc, cho admin/super_admin, trả: 5 số đếm (tổng người dùng, người dùng mới 7 ngày, sự kiện sắp tới, RSVP 7 ngày, bài đăng 7 ngày), `windowDays: 7`, `generatedAt`, 5 thành viên mới nhất và 5 sự kiện mới nhất với đúng các trường ở D-17/D-18. Không nhúng tình trạng hệ thống (client gọi riêng).
- Mọi thời điểm là UTC ISO; hiển thị do client.

## 11. Ảnh hưởng trust_level / kiểm duyệt / report

- **Trust:** Discover không đổi ngưỡng. `EventResponse.requiredTrustLevel` có sẵn; v1 không thêm huy hiệu ngưỡng trên thẻ (người chưa đạt thấy lỗi `messageKey` của server khi bấm RSVP, đúng hành vi hiện có). Overview hiển thị `trustLevel` thành viên (số, không đổi quy tắc).
- **Kiểm duyệt:** Discover chỉ hiện `published`; sự kiện `suspended`/`taken_down`/`cancelled`/`pending_review`/`draft` không lộ. Không thêm nút report/ẩn trên thẻ trong đợt này (theo phạm vi). Overview là nơi chỉ để xem, chưa có hành động kiểm duyệt.
- **Report:** không thêm.

## 12. Ảnh hưởng dữ liệu cá nhân

| Dữ liệu | Chạm ở đâu | Ai nhìn thấy | Xử lý |
|---|---|---|---|
| Vị trí thiết bị (lat/lng) | Near me (Discover) | Không ai: chỉ nằm trong query để lọc | Xin quyền khi bấm; làm tròn 3 chữ số; không đưa vào URL, localStorage, log; người dùng tắt Near me hoặc rút quyền trình duyệt thì ngưng gửi |
| `handle`, `displayName`, `trustLevel`, `createdAt` | Overview | Chỉ admin/super_admin | Đã là hồ sơ công khai; không email/phone |
| Tên host trên thẻ | Discover | Mọi người (sẵn có) | Không đổi |
| Vị trí chính xác sự kiện | Map | Mọi người (as-is) | Rủi ro R-3 |

## 13. Thông báo cần gửi

Không có (không push, không email). Thông báo chỉ trong giao diện (lỗi, xin quyền vị trí).

## 14. i18n key mới (đủ EN/VI, theo cấu trúc lồng của `packages/i18n/messages/*.json`)

**Tái dùng key sẵn có:** `discover.title`, `discover.areas.aria`, `discover.view.label/list/map`, `discover.results.count`, `discover.empty.title/description/clear` (biến thể noMatch), `discover.map.title`, `area.all`, `common.retry`, `common.loading`, `datetime.timeZoneNote`, `feed.rsvp/going/joinWaitlist/onWaitlist/seatsOf`, `event.card.details`, `event.status.*`, `admin.overview.title/body`, `admin.health.state.*`, `admin.health.dependency.*`. **Xoá:** `blank.discover.title`, `blank.discover.body`, `discover.map.placeholderNote` (không còn dùng).

**Discover (en / vi)**

| Key | EN | VI |
|---|---|---|
| `discover.subtitle` | Events posted by people in Da Nang | Sự kiện do cộng đồng Đà Nẵng đăng |
| `discover.when.label` | When | Thời gian |
| `discover.when.aria` | Filter by date | Lọc theo ngày |
| `discover.when.upcoming` | Upcoming | Sắp diễn ra |
| `discover.when.today` | Today | Hôm nay |
| `discover.when.weekend` | Weekend | Cuối tuần |
| `discover.when.week` | This week | Tuần này |
| `discover.nearMe.label` | Near me | Gần tôi |
| `discover.nearMe.radius` | Within {km} km | Trong {km} km |
| `discover.nearMe.radiusAria` | Search radius | Bán kính tìm kiếm |
| `discover.nearMe.locating` | Finding your location… | Đang xác định vị trí của bạn… |
| `discover.nearMe.denied` | Location access is blocked. Allow it in your browser settings to see events near you, or pick an area instead. | Quyền vị trí đang bị chặn. Hãy cho phép trong cài đặt trình duyệt để xem sự kiện gần bạn, hoặc chọn một khu vực. |
| `discover.nearMe.unavailable` | We could not find your location. Try again or pick an area instead. | Không xác định được vị trí của bạn. Hãy thử lại hoặc chọn một khu vực. |
| `discover.results.countOne` | 1 event found | Tìm thấy 1 sự kiện |
| `discover.loadMore` | Show more events | Xem thêm sự kiện |
| `discover.loadingMore` | Loading more events | Đang tải thêm sự kiện |
| `discover.loadMoreError` | Could not load more events. | Không tải thêm được sự kiện. |
| `discover.state.loading` | Loading events | Đang tải sự kiện |
| `discover.state.error.title` | We could not load events | Không tải được sự kiện |
| `discover.state.error.body` | Check your connection and try again. | Kiểm tra kết nối rồi thử lại. |
| `discover.empty.noData.title` | No upcoming events yet | Chưa có sự kiện sắp diễn ra |
| `discover.empty.noData.body` | Be the first to post one. It takes two minutes. | Hãy là người đầu tiên đăng một sự kiện. Chỉ mất hai phút. |
| `discover.empty.noData.cta` | Create an event | Tạo sự kiện |
| `discover.empty.nearMe.title` | No events within {km} km | Không có sự kiện nào trong {km} km |
| `discover.empty.nearMe.body` | Try a wider radius or another area. | Hãy thử bán kính rộng hơn hoặc khu vực khác. |
| `discover.empty.nearMe.cta` | Widen to {km} km | Mở rộng tới {km} km |
| `discover.map.aria` (sửa nội dung) | Map of {count} events | Bản đồ {count} sự kiện |
| `discover.map.unavailable` | The map could not load. Show the list to keep browsing. | Không tải được bản đồ. Hãy chuyển sang danh sách để tiếp tục xem. |
| `discover.map.empty` | No events to show on the map | Không có sự kiện nào để hiển thị trên bản đồ |
| `discover.map.showList` | Show list | Xem danh sách |
| `discover.map.popupOpen` | View event | Xem sự kiện |
| `event.card.started` | Already started | Đã bắt đầu |
| `errors.event.dateRangeInvalid` | The date range is not valid. | Khoảng ngày không hợp lệ. |

**Admin (en / vi)**

| Key | EN | VI |
|---|---|---|
| `admin.overview.generatedAt` | Updated {time} | Cập nhật lúc {time} |
| `admin.overview.kpi.heading` | Key numbers | Số liệu chính |
| `admin.overview.kpi.windowHint` | Rolling 7 days | 7 ngày gần nhất |
| `admin.overview.kpi.totalUsers` | Total users | Tổng người dùng |
| `admin.overview.kpi.newUsers` | New users (7 days) | Người dùng mới (7 ngày) |
| `admin.overview.kpi.upcomingEvents` | Upcoming events | Sự kiện sắp tới |
| `admin.overview.kpi.rsvps` | RSVPs (7 days) | Lượt RSVP (7 ngày) |
| `admin.overview.kpi.posts` | Posts (7 days) | Bài đăng (7 ngày) |
| `admin.overview.system.heading` | System status | Tình trạng hệ thống |
| `admin.overview.system.open` | Open system health | Mở trang tình trạng hệ thống |
| `admin.overview.system.unavailable` | System status is unavailable right now. | Hiện không lấy được tình trạng hệ thống. |
| `admin.overview.members.heading` | Newest members | Thành viên mới nhất |
| `admin.overview.members.empty` | No members yet | Chưa có thành viên nào |
| `admin.overview.members.col.name` | Name | Tên |
| `admin.overview.members.col.handle` | Username | Tên người dùng |
| `admin.overview.members.col.trust` | Trust level | Cấp tin cậy |
| `admin.overview.members.col.joined` | Joined | Ngày tham gia |
| `admin.overview.events.heading` | Newest events | Sự kiện mới nhất |
| `admin.overview.events.empty` | No events yet | Chưa có sự kiện nào |
| `admin.overview.events.col.title` | Event | Sự kiện |
| `admin.overview.events.col.area` | Area | Khu vực |
| `admin.overview.events.col.starts` | Starts | Bắt đầu |
| `admin.overview.events.col.host` | Host | Người tổ chức |
| `admin.overview.events.col.status` | Status | Trạng thái |
| `admin.overview.state.error.title` | Could not load the overview | Không tải được trang tổng quan |
| `admin.overview.state.error.body` | Check your connection and try again. | Kiểm tra kết nối rồi thử lại. |
| `admin.overview.state.noAccess` | Your role cannot see these numbers. | Vai trò của bạn không xem được các số liệu này. |

Quy ước: nhánh `discover.*`/`admin.overview.*` lồng như hiện có; cùng một thay đổi phải cập nhật `en.json`, `vi.json`, `message-keys.ts`; kiểm tra cả hai locale không còn key thiếu trước khi báo xong.

## 15. Rủi ro / trường hợp biên

- **R-1** Sự kiện bắt đầu 06:00 sẽ biến mất khỏi Discover lúc 06:00 dù đang diễn ra (D-1). Chấp nhận ở v1, có thể làm phiền người đến muộn (câu hỏi mở Q-2).
- **R-2** Tab mở lâu: danh sách đã tải không tự cập nhật; thẻ chỉ ẩn RSVP khi render lại (A-AC-9). Chưa có làm mới tự động.
- **R-3** Vị trí chính xác của mọi sự kiện đang hiển thị cho guest trên Map, trái doc 01 Đ1. Schema chưa có `location_precision`. Đề xuất đưa vào backlog trước khi mở public (M6).
- **R-4** Home và Discover trùng nội dung cho tới khi có curated/`source`. Mockup coi Home là nội dung staff. Đây là khoảng trống sản phẩm, không phải lỗi của đợt này.
- **R-5** Khi sự kiện lặp ra đời, `OCCURRENCE_JOIN` lấy buổi sớm nhất kể cả đã qua, kết hợp `from` sẽ ẩn cả sự kiện. Cần thiết kế lại truy vấn khi làm lặp.
- **R-6** Overview đếm tài khoản test ở môi trường dev, KPI local không phản ánh thực tế (D-20).
- **R-7** Số liệu không cache: 5 COUNT mỗi lần mở trang; với quy mô beta 60 user là không đáng kể, cần đo khi lớn hơn.
- **R-8** Near me gửi toạ độ làm tròn 3 chữ số (~110 m) vào query và có thể vào access log của proxy. Đã giảm bằng làm tròn, vẫn là dữ liệu vị trí tương đối chính xác.
- **R-9** Chip "Weekend" của Home vẫn sai múi giờ (S-2). Người dùng sẽ thấy hai định nghĩa "Weekend" khác nhau giữa Home và Discover cho tới khi sửa Home.

## 16. Câu hỏi mở (không chặn; đã có mặc định, chờ chủ dự án xác nhận nếu muốn đổi)

- **Q-1** Near me nên sắp theo khoảng cách thay vì theo giờ (doc 10 §7.3)? Mặc định: giữ theo giờ, vì cần thêm `sort`/khoảng cách vào hợp đồng.
- **Q-2** Có hiển thị sự kiện đang diễn ra (đã bắt đầu, chưa kết thúc) không? Mặc định: không (D-1). Cần cho người đến muộn thì đổi sang so `ends_at`.
- **Q-3** Curator/moderator có cần thấy một phần Overview (ví dụ chỉ khối sự kiện)? Mặc định: không (D-14), vì ma trận doc 01 không cấp.
- **Q-4** Có muốn cột đánh dấu tài khoản test (`is_test`) để loại khỏi KPI? Mặc định: không trong đợt này (D-20).
- Cho Tech Lead: mã HTTP của lỗi validation (400 hay 422) của pipe hiện có để Tester assert đúng ở A-AC-14; nơi đặt hàm preset ngày (`packages/domain` hay `_lib/datetime.ts`); web-admin dịch `areaId` ra tên khu bằng `@dnc/geo` hay API trả sẵn tên.

## 17. Bàn giao

Bàn giao cho **Tech Lead** (chốt hợp đồng `from`/`to`, `AdminOverviewResponse`, khoá quyền, cắt task) và **Coordinator** (lưu brief, điều phối backend → web-client/web-admin → tester). Không giao thẳng cho agent hiện thực. Gợi ý cắt story (đợt lớn, nhiều service): (1) hợp đồng + API `from`/`to`; (2) Discover danh sách + lọc; (3) Discover map; (4) API overview + quyền; (5) trang Overview. Sau khi Tester xác minh, BA đối chiếu lại từng AC ở mục 8.


## Phụ lục S — Swipe (mở rộng phạm vi 01/10/2026)

**Nguồn:** BA Agent, 01/10/2026 (Thứ Năm, giờ Đà Nẵng). **Trạng thái:** chờ Tech Lead chốt hợp đồng, Coordinator cắt card. **Giai đoạn:** 1 (kết nối cộng đồng), cùng mốc M2 với Phần A. Không chuẩn bị gì cho giai đoạn 2/3. **Thay thế** mục "Swipe" trong "Ngoài phạm vi" của §3.

### S.1 Mục tiêu nghiệp vụ

Một expat vừa đến Đà Nẵng, chưa biết mình muốn đi đâu, mở `/discover` trên điện thoại, chuyển sang chế độ **Swipe** và lướt qua từng sự kiện sắp diễn ra như một chồng thẻ. Vuốt phải để **Lưu**, vuốt trái để **Bỏ qua**, kéo lên hoặc chạm để mở chi tiết và (nếu muốn) **Tham gia**. Hết một lượt, họ thấy màn tổng kết: các sự kiện đã lưu, cảnh báo trùng giờ, và nút Tham gia cho từng sự kiện. Swipe không bao giờ tự đăng ký thay người dùng. Để chủ dự án xem được tính năng, có bộ dữ liệu mẫu trong môi trường dev.

### S.2 Tác nhân

| Tác nhân | Dùng gì | Ghi chú |
|---|---|---|
| **Guest** | Vuốt, Lưu, Bỏ qua, xem tổng kết | Lưu được (lưu trên thiết bị, khoá `guest`). Bấm Tham gia thì `requireAuth`, quay lại đúng URL. Không có tường đăng nhập sau N thẻ (R-never, mockup dòng 522). |
| **Member** | Như guest, thêm Tham gia/huỷ trong sheet | Lưu gắn với `userId` trên thiết bị này. |
| **P1** (expat mới đến) | Vuốt trên điện thoại 390 px | Persona chính. |
| **Người dùng bàn phím / trình đọc màn hình / không vuốt được** | Dùng nút và phím tắt thay cử chỉ | Đường chính, không phải đường phụ (doc 14 §1.6). |
| Organizer / Host | Chỉ là chủ của thẻ | Sự kiện của chính viewer không vào deck (Mặc định BA). |
| Đội vận hành | Không có thay đổi | Moderator vẫn ẩn sự kiện theo luồng hiện có; sự kiện không còn `published` biến khỏi deck ở lần tải kế. |

### S.3 Phạm vi

**Trong phạm vi**
- SW1. Chế độ thứ ba `view=swipe` của Discover, thêm vào bộ chuyển List | Map | **Swipe**. Dùng chung bộ lọc khu vực / ngày / Near me và cùng nguồn `GET /api/v1/events` (đã có `status=published`, `from`, `to`, cursor, `limit`).
- SW2. Chồng thẻ, vuốt phải/trái, kéo lên/chạm mở sheet chi tiết, nút và phím tắt tương đương, hoàn tác 1 bước, huỷ chuyển động khi `prefers-reduced-motion`.
- SW3. "Lưu" và "Bỏ qua" **lưu trên thiết bị** (localStorage), không API, không migration.
- SW4. Màn tổng kết sau mỗi lượt tối đa 12 thẻ: danh sách đã lưu, đã bỏ qua (Hiện lại), cảnh báo trùng giờ (giữa các sự kiện đã lưu, và với sự kiện đã Tham gia).
- SW5. Trạng thái đang tải / lỗi / rỗng (4 biến thể), EN/VI, responsive 390 px và 1280 px.
- SW6. Sheet chi tiết có nút Tham gia / Join waitlist / huỷ (dùng lại hành vi `EventCard`: `joinOccurrence`, `cancelRsvp`, rule "đã bắt đầu").
- SW7. **Dữ liệu mẫu cho dev/local**: script seed idempotent, không đổi schema (S.9).
- SW8. Hàm thuần tính trùng giờ có test đơn vị (Tech Lead chọn `packages/domain` hay `_lib`).

**Ngoài phạm vi (ghi rõ)**
- API/bảng "saved events" và "dismissals" phía server (cần migration, duyệt riêng; follow-up F-S1).
- Đồng bộ danh sách đã lưu giữa các thiết bị; trang "Đã lưu" riêng; thêm vào lịch `.ics`; chia sẻ kế hoạch (có trong mockup, để follow-up).
- Cá nhân hoá/xếp hạng theo hành vi (UC-36 là `Won't` GĐ1); ghi nhận impression/sự kiện hành vi lên server; analytics về vuốt.
- Thẻ "Not sure what you want?" trong feed, vuốt-trong-dòng PA B trên danh sách, menu ⋯ Chia sẻ/Báo cáo, sheet xác nhận biến thể theo giá/≤ 10 chỗ/< 2 giờ (contract hiện chưa có giá, ngôn ngữ, điểm host, bình luận).
- Điểm host ★ và số bình luận trên thẻ (chưa có trong `EventResponse`); vị trí địa chỉ chính xác trên thẻ.
- Cổng bật G1/G2 của doc 14 (xem Q-S1); app `apps/mobile` (hàm trùng giờ nên dùng lại được).
- Thư viện cử chỉ/animation mới: mặc định dùng Pointer Events của trình duyệt, **không thêm dependency** (tránh đổi `pnpm-lock.yaml`). Cần thư viện thì Tech Lead xin duyệt.

### S.4 Hành vi as-is (đã đọc code; Tester xác nhận bằng chạy thật)

- `DiscoverView` chỉ có `'list' | 'map'`; `parseDiscoverUrl` coi mọi giá trị khác `map` là `list` (`discover-url.ts:9,46`), nên `?view=swipe` hiện rơi về List.
- Không có API lưu/bookmark sự kiện trong `apps/api/src` hay `packages/contracts` (đã grep). `api.ts` có `listEvents`, `getEvent`, `joinOccurrence`, `cancelRsvp`; **không** có "RSVP của tôi".
- `EventResponse` có `startsAt`, `endsAt` (nullable, `event.ts:44`), `seatsTaken`, `capacity`, `viewerRsvpStatus`, `organizer.{handle,displayName,trustLevel}`, lat/lng, `areaId`. Không có giá, ngôn ngữ, điểm host.
- Seed hiện chỉ có `apps/api/src/database/seeds/seed-areas.ts`. DB dev trống thì Discover hiện empty-state, không thấy được swipe.
- Mockup swipe có sẵn: ngưỡng 28% chiều rộng / 800 dp/s, kéo lên ≥ 22% chiều cao, xoay ±8°, bay ra 220 ms, phím ← → ↑ U Enter, tối đa 12 thẻ, màn tổng kết cảnh báo trùng giờ (dòng 476-484, 464-466, 516-518).

### S.5 Behavior smell (bổ sung)

| # | Smell | Xử lý |
|---|---|---|
| S-S1 | Doc 14 §7 khuyến nghị không làm deck, và khoá sau cổng G1/G2; chủ dự án ghi đè | Làm, giữ rào R-never; ghi R-S1 và Q-S1 |
| S-S2 | Mockup lưu server (`saved_occurrences`, `POST /occurrences/{id}/save`), brief này ràng buộc không đổi schema | Lưu thiết bị ở v1 (D-S4), API là F-S1. Mockup/doc 14 cần ghi chú lệch |
| S-S3 | Mockup dùng sự kiện UGC + xếp hạng cá nhân hoá, nhưng UC-36 `Won't` | Thứ tự deck = theo giờ bắt đầu (D-S9), cùng D-9 |
| S-S4 | Mockup `Skip` hạ hạng 72 giờ **trên server** và ẩn khỏi feed | v1: Bỏ qua chỉ ảnh hưởng deck, local 72 giờ; List/Map không bị ảnh hưởng (D-S6) |
| S-S5 | `endsAt` có thể null nhưng cần so trùng giờ | D-S11 |
| S-S6 | Không có "RSVP của tôi" nên trùng giờ với RSVP chỉ phát hiện được một phần | D-S11, giới hạn L-S2 |
| S-S7 | `view` chỉ nhận list/map; `view=swipe` từ link cũ rơi về List | Mở rộng parse, ghi AC |
| S-S8 | Kéo lên (cử chỉ) xung đột cuộn dọc của trang | Vùng deck không cuộn; chỉ thẻ bắt cử chỉ, khoá trục sau 10 px (D-S2) |

### S.6 Quyết định nghiệp vụ

Nguồn ghi `file:dòng`; không nguồn thì là **Mặc định BA đề xuất**.

| ID | Câu hỏi | Quyết định | Nguồn |
|---|---|---|---|
| **D-S1** | Vị trí trong Discover, URL | Chế độ thứ ba `view=swipe` (`?view=swipe`), dùng **chung** state bộ lọc `area`/`when`/`near`/`r` và serialize như D-13. Mặc định vẫn là list. Bộ chuyển hiển thị 3 mục List \| Map \| Swipe (EN "Swipe", VI "Vuốt"). Đổi bộ lọc thì deck nạp lại từ đầu, **giữ nguyên** danh sách đã lưu và đã bỏ qua | web-swipe-mockup.html:470; discover-url.ts:9,46 |
| **D-S2** | Cử chỉ và ngưỡng | Phải = Lưu. Trái = Bỏ qua. Lên hoặc chạm thẻ = mở sheet chi tiết. **Chốt** khi thả: |dx| ≥ **28% chiều rộng thẻ** hoặc vận tốc ngang ≥ **800 px/s** (trái và phải đối xứng); dy lên ≥ **22% chiều cao thẻ**. Dưới ngưỡng thì thẻ trượt về chỗ cũ, không thao tác. Khoá trục sau khi di chuyển 10 px (ngang hoặc dọc, không chéo). Thẻ xoay tối đa ±8°, bay ra 220 ms. Chạm = di chuyển < 10 px. Vuốt xuống không làm gì. Chỉ thẻ trên cùng bắt cử chỉ; vùng deck không cuộn trang. Vuốt phải **không** gọi `joinOccurrence` | mockup:478-483 (ngưỡng và phím); mockup:507 (R-never RSVP). Trái đối xứng là mặc định BA |
| **D-S3** | Nút/phím thay thế (a11y) | Ba nút luôn hiện dưới deck: **Bỏ qua**, **Chi tiết**, **Lưu**, cộng **Hoàn tác** và **Đã lưu (n)**. Mỗi nút là `<button>` thật, `aria-label` có tên sự kiện, vùng bấm ≥ 44×44 px. Phím khi deck có focus: `←` bỏ qua, `→` lưu, `↑` hoặc `Enter` chi tiết, `U` hoàn tác; không bắn phím khi gõ trong ô nhập hay khi sheet đang mở. Thẻ trên cùng là `role="group"` + `aria-roledescription` + `aria-label` đủ tiêu đề, giờ, khu, chỗ, host. Chỉ 2 thẻ đầu có trong cây a11y, các thẻ sau `aria-hidden`. Mỗi thao tác phát một thông báo `aria-live="polite"` ("Đã lưu X. Còn n sự kiện."). Sau thao tác, focus chuyển sang thẻ kế tiếp (hoặc màn tổng kết). Sheet là `role="dialog"` `aria-modal`, bẫy focus, `Esc` đóng, trả focus về nút gọi | mockup:482, 1084 (`aria-live`), 1521; doc 14 §1.6 (dòng 8107-8122) |
| **D-S4** | "Lưu" lưu ở đâu | **Trên thiết bị** (localStorage), khoá theo người dùng: `guest` khi chưa đăng nhập, `userId` khi đã đăng nhập. Mỗi mục: `id`, `savedAt`, ảnh chụp nhỏ (`title`, `startsAt`, `endsAt`, `areaId`) để hiển thị khi mất mạng. Tối đa **50** mục; đầy thì chặn thêm và báo (không xoá ngầm mục cũ). Mục đã **kết thúc** (hoặc đã bắt đầu quá hạn theo D-S11) tự bị dọn khi đọc. Khi mở tổng kết, làm mới từng mục bằng `getEvent(id)`: 404, không còn `published` hoặc đã huỷ thì dòng hiện "Sự kiện này không còn khả dụng" + nút Bỏ lưu. Khi guest đăng nhập, mục của khoá `guest` được **gộp** vào khoá `userId` rồi xoá khoá `guest`. API "saved events" phía server: follow-up F-S1 cần migration, duyệt riêng | Ràng buộc Coordinator. Mockup:478 và doc 14 (UC-35 server) bị hoãn |
| **D-S5** | "Bỏ qua" lưu ở đâu, hết hạn | Cũng local, cùng khoá D-S4: `id` + `until = now + 72 giờ` (đúng mockup:518). Hết hạn thì thẻ quay lại deck. Bỏ qua **chỉ** ảnh hưởng deck; List và Map vẫn hiện sự kiện đó, không có "ẩn" ở nơi khác | mockup:479, 518. Local thay vì server là mặc định BA |
| **D-S6** | Thẻ đã bỏ qua có quay lại không | Có hai đường: (a) "Hiện lại" từng sự kiện ở màn tổng kết (khôi phục vào cuối hàng đợi deck); (b) tự quay lại sau 72 giờ. Hoàn tác 1 bước cũng khôi phục. Không có "xoá vĩnh viễn" | mockup:518 |
| **D-S7** | Hoàn tác | Hoàn tác **đúng 1 thao tác gần nhất** (Lưu hoặc Bỏ qua): thẻ quay lại đầu deck, và bản ghi lưu/bỏ qua tương ứng bị xoá. Chạy bằng nút, phím `U`. Không có hạn giờ. Nút bị vô hiệu (`disabled`) khi không có gì để hoàn tác. Vẫn dùng được ngay sau thẻ cuối (màn tổng kết có nút Hoàn tác, bấm thì quay về deck). Hoàn tác không áp cho RSVP (muốn huỷ thì dùng huỷ RSVP). Miễn phí, không giới hạn số lần (undo trả phí là R-never) | mockup:481, 522 |
| **D-S8** | Thứ tự thẻ | Giống List: `startsAt ASC, id ASC` (D-9), không xáo, không xếp hạng cá nhân. Loại khỏi deck: sự kiện đã **Lưu**, đã **Bỏ qua** còn hạn, sự kiện viewer **đã Tham gia** (`viewerRsvpStatus` còn hiệu lực), sự kiện của chính viewer, sự kiện `startsAt ≤ now` khi thẻ đến lượt (so lúc render, cùng D-12). **Không** loại sự kiện đầy chỗ (vẫn hiện để Join waitlist) | event.repository.ts:194; mockup:522 (không lọc đầy) |
| **D-S9** | Tải thêm, lượt, điểm dừng | Mỗi **lượt** tối đa **12** thẻ rồi hiện tổng kết (deck hữu hạn, không vô hạn). Nạp 20 sự kiện mỗi trang (như D-10); khi hàng đợi còn ≤ 3 thẻ và còn `nextCursor` thì tự tải trang kế **ngầm** (cùng `from`/`to` của trang đầu, khử trùng theo `id`). Tổng kết có "Tiếp tục vuốt" nếu còn thẻ, nếu không hiện trạng thái "xem hết" (D-S12c). Lỗi tải trang kế: giữ nguyên deck, hiện dòng "Không tải thêm được sự kiện" + thử lại, không chặn thẻ đang có | mockup:465; D-10; mockup:522 |
| **D-S10** | Sheet chi tiết và RSVP | Chạm hoặc kéo lên mở sheet (bottom sheet ở mobile, hộp thoại giữa màn ở desktop): tiêu đề, giờ (`Asia/Ho_Chi_Minh`), tên khu (không địa chỉ chính xác), chỗ `n/m`, host + trust, nút **Tham gia / Join waitlist** (hoặc **Đang tham gia / Huỷ** nếu đã RSVP), nút **Lưu**, liên kết "Mở trang đầy đủ" tới `/events/{id}`. Dòng nhắc cố định: "Lưu không phải là đăng ký. Hãy bấm Tham gia để giữ chỗ." RSVP chỉ xảy ra khi bấm nút Tham gia trong sheet (1 cử chỉ + 1 xác nhận = đúng 2 chạm). Tái dùng hành vi `EventCard`: guest → `requireAuth` rồi quay lại URL hiện tại (bộ lọc giữ nguyên); lỗi server hiện `messageKey`; sự kiện đã bắt đầu thì ẩn nút Tham gia, hiện "Đã bắt đầu" (D-12), còn người đã RSVP vẫn thấy nút huỷ (L-4). RSVP thành công thì thẻ rời deck và vào nhóm "Đã tham gia" của tổng kết | mockup:480, 502, 507; D-12; L-4 |
| **D-S11** | Định nghĩa **trùng giờ** | Mỗi sự kiện có khoảng `[startsAt, end)` với `end = endsAt` nếu có, ngược lại `end = startsAt + 120 phút` (hằng số `DEFAULT_EVENT_DURATION_MINUTES = 120`). Hai sự kiện A, B **trùng** khi `A.start < B.end` **và** `B.start < A.end` (so sánh chặt: A kết thúc đúng lúc B bắt đầu thì **không** trùng). Phạm vi: (1) mọi cặp trong danh sách **Đã lưu**; (2) mỗi sự kiện đã lưu với mỗi sự kiện viewer **đã Tham gia hoặc đang chờ** (`viewerRsvpStatus` không rỗng và chưa huỷ) có trong dữ liệu đã tải. Sự kiện đã RSVP **không** vào danh sách Lưu; dòng cảnh báo ghi tên sự kiện đã RSVP. Khi ít nhất một bên dùng giờ kết thúc giả định thì dòng cảnh báo kèm chú thích "Chưa có giờ kết thúc, tạm tính 2 giờ". Cảnh báo chỉ **nhắc**, không chặn Lưu hay Tham gia | mockup:1300-1308 (công thức), mockup:517 (ví dụ); 120 phút là mặc định BA |
| **D-S12** | Trạng thái | (a) **Đang tải**: skeleton thẻ + chuỗi `discover.state.loading`. (b) **Lỗi**: dùng lại thẻ lỗi A-AC-13 + Retry (gọi lại cùng bộ lọc). (c) **Xem hết** (có sự kiện nhưng mọi thẻ đã lưu/bỏ qua/đã tham gia): "Bạn đã xem hết rồi" + nút Xem đã lưu, "Hiện lại các thẻ đã bỏ qua", Xoá bộ lọc nếu đang lọc. (d) **Rỗng thật**: tái dùng ba biến thể A-AC-11 (không có dữ liệu / bộ lọc không khớp / Near me không có kết quả) với nút tương ứng | brief §8 A-AC-11, A-AC-13; mockup:530-539 (copy trạng thái hết) |
| **D-S13** | Guest vs member | Guest **lưu và bỏ qua được** (khoá `guest`), xem tổng kết, mở sheet. RSVP thì `requireAuth`. Không có tường đăng nhập, không ép cài app. Sau đăng nhập, D-S4 gộp dữ liệu guest | brief §2; mockup:522 |
| **D-S14** | Giảm chuyển động | `prefers-reduced-motion: reduce`: **không** xoay, không bay ra, không trượt về, không animation lật thẻ; thẻ vẫn bám theo tay khi kéo (thao tác trực tiếp) nhưng chốt bằng thay thế tức thì; "tem" Lưu/Bỏ qua hiện tĩnh, sheet hiện không hiệu ứng. Mọi chức năng giữ nguyên | mockup:483, 1059 |
| **D-S15** | Dữ liệu cá nhân phía thiết bị | localStorage chứa: `version`, `saved[]`, `skipped[]`, cờ `coachDismissed`. **Không** chứa email, handle, toạ độ người dùng, token, `viewerRsvpStatus`, lat/lng sự kiện. **Đăng xuất chủ động** xoá khoá `userId` (không xoá `guest`, vốn chỉ chứa id sự kiện công khai); hết phiên tự nhiên thì **không** xoá. Không gửi bất kỳ sự kiện vuốt/Lưu/Bỏ qua nào lên server hay công cụ analytics (không bảng impression: doc 14 G-15, Luật 91/2025). Màn tổng kết ghi chú "Chỉ lưu trên thiết bị này. Đăng xuất sẽ xoá danh sách." | doc 14 dòng 1403, 1964-1965; Mặc định BA |
| **D-S16** | Không có localStorage | Safari riêng tư, quota, bị chặn: chuyển sang bộ nhớ **tạm** của tab, hiện dòng cảnh báo "Trình duyệt không cho lưu…", chức năng vẫn chạy. Không để lỗi `setItem` làm trắng trang | Mặc định BA |
| **D-S17** | Điểm vào, cổng | Điểm vào ở v1 là mục **Swipe** trong bộ chuyển chế độ, luôn hiện (không áp cổng G1/G2 theo yêu cầu chủ dự án; Q-S1). Đa tab: nghe sự kiện `storage` để làm mới danh sách đã lưu | mockup:470, 475; yêu cầu chủ dự án 01/10 |
| **D-S18** | Thông tin trên thẻ | Giờ bắt đầu + thời gian còn lại (dùng `useNow`), tên khu theo locale, chỗ còn (`feed.seatsOf`), host + `trustLevel`, tiêu đề (nguyên văn người tạo, không dịch). Không hiện địa chỉ chính xác, danh sách người tham dự. Không hiện giá/ngôn ngữ/★/💬 vì contract chưa có | mockup:486; contract |
| **D-S19** | Sample data | Xem S.9. Chỉ chạy được ở môi trường local/dev, idempotent, không đổi schema, không chạy khi `NODE_ENV=production` | Mặc định BA |

### S.7 Acceptance criteria

Giả định ngày mẫu: **Thứ Năm 2026-10-01 10:00 ICT** trừ khi ghi khác.

**Happy**
- **S-AC-1:** GIVEN guest, DB có ≥ 3 sự kiện `published` chưa bắt đầu WHEN mở `/discover?view=swipe` ở 390 px THEN bộ chuyển hiện List \| Map \| Swipe với Swipe đang chọn; request là `GET /api/v1/events?status=published&from=<ISO≥now>&limit=20`; thẻ trên cùng là sự kiện sớm nhất; hiện bộ đếm "1 of N"; có đủ nút Bỏ qua, Chi tiết, Lưu, Hoàn tác (đang `disabled`), Đã lưu (0).
- **S-AC-2:** GIVEN deck đang mở WHEN kéo thẻ trên cùng sang phải quá 28% chiều rộng rồi thả (hoặc bấm nút Lưu, hoặc phím `→`) THEN thẻ rời deck, thẻ kế tiếp lên đầu, nút "Đã lưu" thành (1), localStorage khoá `guest` có đúng 1 mục `saved` với `id` sự kiện đó, và **không** có request `POST …/rsvps` hay request ghi nào khác.
- **S-AC-3:** GIVEN deck đang mở WHEN vuốt trái vượt ngưỡng (hoặc nút Bỏ qua, hoặc `←`) THEN thẻ rời deck, có mục `skipped` với `until = now + 72 giờ`; chuyển sang List cùng bộ lọc thì sự kiện đó **vẫn hiện**.
- **S-AC-4:** GIVEN thẻ trên cùng WHEN chạm thẻ hoặc kéo lên quá 22% chiều cao hoặc bấm Chi tiết THEN mở sheet có tiêu đề, giờ theo `Asia/Ho_Chi_Minh`, khu, chỗ, host, nút Tham gia, nút Lưu, liên kết `/events/{id}`, dòng "Lưu không phải là đăng ký…"; chưa có request RSVP nào; đóng sheet thì thẻ vẫn ở đầu deck, không bị lưu/bỏ qua.
- **S-AC-5:** GIVEN member đăng nhập, sheet đang mở, sự kiện còn chỗ WHEN bấm Tham gia THEN đúng một `POST /api/v1/occurrences/{id}/rsvps`, sheet hiện trạng thái Đang tham gia + nút Huỷ, thẻ rời deck và xuất hiện trong nhóm "Đã tham gia" ở tổng kết.
- **S-AC-6 (Hoàn tác):** GIVEN vừa vuốt phải một thẻ WHEN bấm Hoàn tác (hoặc `U`) THEN thẻ đó quay về đầu deck, mục `saved` tương ứng bị xoá, "Đã lưu" giảm 1, nút Hoàn tác `disabled` lại; bấm thêm lần nữa không làm gì. Tương tự với Bỏ qua (mục `skipped` bị xoá).
- **S-AC-7 (Tổng kết):** GIVEN đã xử lý đủ 12 thẻ (hoặc hết thẻ) WHEN thẻ cuối rời deck THEN hiện màn tổng kết gồm: số đã lưu, danh sách đã lưu theo giờ tăng dần (mỗi dòng có Tham gia và Bỏ lưu), danh sách đã bỏ qua với "Hiện lại", ghi chú "Chỉ lưu trên thiết bị này…", và "Tiếp tục vuốt" nếu còn thẻ chưa xem. Hiện lại một thẻ thì thẻ đó vào cuối hàng đợi và biến khỏi nhóm bỏ qua.
- **S-AC-8 (Tải thêm):** GIVEN 45 sự kiện khớp, người dùng vuốt dần WHEN hàng đợi còn ≤ 3 thẻ THEN trang kế được tải ngầm với đúng `cursor` và cùng `from`/`to` của trang đầu; không thẻ trùng `id`; không vượt 12 thẻ mỗi lượt trước khi hiện tổng kết; không có nút "Load more" thấy được trong deck.

**Edge**
- **S-AC-9 (Trùng giờ, có giờ kết thúc):** GIVEN đã lưu A (Thứ Bảy 03/10 19:00–21:00) và B (20:00–22:30) WHEN mở tổng kết THEN cả hai dòng có viền cảnh báo và dòng "Trùng giờ ngày Thứ Bảy: A trùng với B". GIVEN C 21:00–22:00 thì **không** trùng với A (chạm biên), nhưng trùng với B.
- **S-AC-10 (Trùng giờ, `endsAt` null):** GIVEN đã lưu D bắt đầu 19:00 không có `endsAt` và E bắt đầu 20:30 WHEN mở tổng kết THEN D và E được báo trùng (D tạm tính kết thúc 21:00), kèm chú thích "Chưa có giờ kết thúc, tạm tính 2 giờ". GIVEN F bắt đầu đúng 21:00 thì **không** trùng với D.
- **S-AC-11 (Trùng với RSVP):** GIVEN member đã RSVP sự kiện G (có `viewerRsvpStatus`, nằm trong dữ liệu đã tải) 19:00–21:00, và đã lưu H 20:00 WHEN mở tổng kết THEN H bị cảnh báo trùng với G, câu cảnh báo nêu tên G; G không nằm trong danh sách Đã lưu. Sự kiện RSVP đã `cancelled` thì không gây cảnh báo.
- **S-AC-12 (Deck loại trừ):** GIVEN các sự kiện: đã lưu, đã bỏ qua còn hạn, đã RSVP, của chính viewer, đã bắt đầu 1 giờ trước, `draft` của viewer, đầy chỗ chưa RSVP WHEN mở deck THEN 5 loại đầu **không** có thẻ; sự kiện đầy chỗ **có** thẻ và sheet của nó hiện "Join waitlist". Bỏ qua hết hạn (`until` ≤ now) thì thẻ quay lại.
- **S-AC-13 (Đã bắt đầu giữa chừng):** GIVEN thẻ đang ở hàng đợi và `startsAt` trôi qua khi tab mở WHEN thẻ đó đến lượt thì deck bỏ qua nó (không ghi vào Bỏ qua); mở sheet của một thẻ đã bắt đầu thì không có nút Tham gia, hiện "Đã bắt đầu"; người đã RSVP vẫn thấy nút Huỷ.
- **S-AC-14 (Ngưỡng cử chỉ):** GIVEN thẻ rộng 350 px WHEN kéo 90 px rồi thả chậm THEN thẻ trượt về, không thao tác (90 < 28% = 98); kéo 90 px nhanh ≥ 800 px/s THEN chốt Lưu; kéo chéo mà dọc trội thì chỉ xét ngưỡng dọc; cuộn trang bằng một ngón ngoài vùng deck vẫn cuộn bình thường.
- **S-AC-15 (Đổi bộ lọc):** GIVEN đã lưu 2 sự kiện WHEN chọn chip "Weekend" hoặc "Near me" THEN deck nạp lại theo bộ lọc mới; "Đã lưu (2)" giữ nguyên; URL cập nhật theo D-13 và vẫn có `view=swipe`; phản hồi cũ về muộn bị bỏ (như A-AC-12).
- **S-AC-16 (Xem hết / rỗng):** GIVEN mọi sự kiện đã lưu hoặc bỏ qua WHEN deck cạn THEN hiện trạng thái "Bạn đã xem hết rồi" với ba nút (Xem đã lưu, Hiện lại đã bỏ qua, Xoá bộ lọc khi có lọc). GIVEN DB không có sự kiện upcoming THEN hiện "Chưa có sự kiện sắp diễn ra" + "Tạo sự kiện" (không phải màn trắng); bộ lọc 0 kết quả hiện biến thể "No events match your filters".
- **S-AC-17 (Đầy 50):** GIVEN đã lưu 50 WHEN Lưu thêm THEN không thêm, thẻ ở lại đầu deck, hiện "Danh sách đã lưu đã đầy (50)…" và không mục nào bị xoá.
- **S-AC-18 (Mục lưu hết hạn):** GIVEN mục đã lưu có sự kiện kết thúc hôm qua WHEN mở tổng kết THEN mục đó bị dọn khỏi localStorage; GIVEN `getEvent` trả 404 hoặc sự kiện không còn `published` THEN dòng "Sự kiện này không còn khả dụng" + Bỏ lưu, và dòng đó **không** tham gia cảnh báo trùng giờ.
- **S-AC-19 (Đa tab, guest → member):** GIVEN lưu thẻ ở tab 1 WHEN mở tab 2 THEN "Đã lưu" cập nhật sau sự kiện `storage`. GIVEN guest đã lưu 3 WHEN đăng nhập thì 3 mục xuất hiện dưới khoá `userId`, khoá `guest` bị xoá, không trùng lặp.

**Error**
- **S-AC-20:** GIVEN API 5xx hoặc mất mạng WHEN mở `?view=swipe` THEN skeleton thành thẻ lỗi "We could not load events" + nút Retry gọi lại cùng bộ lọc. GIVEN lỗi khi tải trang kế THEN các thẻ đang có dùng được, hiện "Could not load more events." + thử lại. GIVEN bấm Tham gia mà server trả lỗi (ví dụ thiếu `trust_level`) THEN sheet hiện `messageKey` actionable của server, thẻ **ở lại** deck, không ghi nhận Lưu/Bỏ qua. GIVEN localStorage ném lỗi quota hoặc bị chặn THEN hiện cảnh báo D-S16, thao tác Lưu/Bỏ qua vẫn chạy trong tab, không trắng trang.

**Quyền / trust**
- **S-AC-21:** GIVEN guest WHEN bấm Tham gia trong sheet THEN mở luồng đăng nhập/đăng ký, không có `POST …/rsvps` ẩn danh, sau đăng nhập quay lại đúng URL `?view=swipe&…` (bộ lọc giữ nguyên) và dữ liệu đã lưu của guest còn nguyên (đã gộp). GIVEN `trust_level` thấp hơn `requiredTrustLevel` WHEN Tham gia THEN 403 từ server và sheet hiện `messageKey` của server (quyền kiểm ở API, không chỉ ẩn nút). `GET /events` vẫn public (200 cho guest).
- **S-AC-22 (Audit):** GIVEN Lưu, Bỏ qua, Hoàn tác, Hiện lại, mở sheet, mở tổng kết THEN **không** có request ghi nào và không bản ghi nào trong `AuditLog`. GIVEN RSVP từ sheet THEN dùng đúng endpoint và audit hiện có của `POST /api/v1/occurrences/{id}/rsvps` (không đổi), có đủ actor/action/entityId theo hành vi hiện tại.

**A11y**
- **S-AC-23:** GIVEN trình đọc màn hình bật và thẻ trên cùng WHEN focus vào deck THEN đọc được tiêu đề, giờ, khu, chỗ, host; ba nút có tên chứa tiêu đề sự kiện; sau Lưu hoặc Bỏ qua có thông báo `aria-live` ("Đã lưu X. Còn n sự kiện."); focus rơi vào thẻ kế tiếp; chỉ 2 thẻ đầu nằm trong cây a11y. GIVEN chỉ dùng bàn phím WHEN `←` `→` `↑` `Enter` `U` THEN tương ứng Bỏ qua, Lưu, Chi tiết, Chi tiết, Hoàn tác; gõ phím trong ô nhập hoặc khi sheet mở thì **không** kích hoạt. Sheet bẫy focus, `Esc` đóng và trả focus về nút gọi. Mọi nút ≥ 44×44 px.
- **S-AC-24 (Giảm chuyển động):** GIVEN `prefers-reduced-motion: reduce` WHEN vuốt hoặc bấm nút THEN thẻ không xoay, không bay ra, không trượt về (đổi tức thì), sheet mở không hiệu ứng, mọi chức năng như bình thường.

**i18n**
- **S-AC-25:** GIVEN locale `en` rồi `vi` WHEN đi qua mọi trạng thái (đang tải, thẻ, sheet, tổng kết, xem hết, rỗng ×3, lỗi, đầy 50, không có storage, cảnh báo trùng giờ, thông báo `aria-live`) THEN mọi chuỗi và `aria-label` đúng ngôn ngữ, không lộ key thô `discover.swipe.*`; thời gian theo `Asia/Ho_Chi_Minh`, có dòng "Times shown in Da Nang time (GMT+7)"; tên khu theo locale; tiêu đề sự kiện nguyên văn; chuỗi VI dài nhất không bị cắt trên 390 px.

**Responsive**
- **S-AC-26:** GIVEN viewport 390 px (cả chiều cao 667 px) và 1280 px WHEN mở `?view=swipe` THEN ở 390 px thẻ + ba nút + Hoàn tác thấy trọn không cuộn ngang, không bị thanh điều hướng/safe-area che, bộ lọc cuộn ngang trong khung; ở 1280 px deck đặt giữa (rộng tối đa khoảng 420 px), nút và phím tắt dùng được, có dòng gợi ý phím tắt, sheet là hộp thoại giữa màn. Lần đầu có dòng hướng dẫn "Vuốt phải để lưu…" với nút "Đã hiểu"; bấm thì không hiện lại sau khi tải lại (`coachDismissed`).

**Privacy**
- **S-AC-27 (Riêng tư):** GIVEN dùng swipe đầy đủ WHEN kiểm tra localStorage và network THEN localStorage chỉ có `version`, `saved[]` (`id`, `savedAt`, `title`, `startsAt`, `endsAt`, `areaId`), `skipped[]` (`id`, `until`), `coachDismissed`; **không** có email, handle, toạ độ, token, `viewerRsvpStatus`; không request nào gửi sự kiện Lưu/Bỏ qua/vuốt lên server hay analytics. GIVEN member đăng xuất chủ động THEN khoá `userId` bị xoá, khoá `guest` giữ nguyên; GIVEN session hết hạn tự nhiên THEN khoá `userId` **không** bị xoá. GIVEN Near me bật THEN toạ độ chỉ có trong query đã làm tròn như D-8, không vào localStorage hay URL.

**Dữ liệu mẫu (xem S.9)**
- **S-AC-28:** GIVEN DB local đã có `areas` WHEN chạy script seed sự kiện mẫu THEN DB có ≥ 16 sự kiện `published` bắt đầu trong 14 ngày tới, phủ cả 6 khu, đủ các ca ở S.9 (hai cặp trùng giờ, một ca `endsAt` null, một sự kiện đầy chỗ, một sự kiện bắt đầu < 2 giờ, một sự kiện của member mẫu đã RSVP, tiêu đề dài VI/EN); mở `/discover?view=swipe` thấy ≥ 12 thẻ. Chạy lần hai **không** tạo bản trùng (idempotent) và dời mốc thời gian về tương đối với `now`. GIVEN `NODE_ENV=production` hoặc môi trường không phải local THEN script từ chối chạy, thoát mã khác 0, không ghi gì.
- **S-AC-29:** GIVEN script seed WHEN kiểm tra schema/migrations THEN không có migration mới, không đổi bảng; dữ liệu mẫu gắn với tài khoản host mẫu có thể xoá một lệnh (`--remove`), không để lại sự kiện mồ côi.

### S.8 i18n key mới (EN | VI) — cùng một thay đổi cập nhật `en.json`, `vi.json`, `message-keys.ts`

Tái dùng: `discover.state.loading`, `discover.state.error.title/body`, `discover.loadMoreError`, `discover.empty.noData.*`, `discover.empty.title/description/clear` (không khớp bộ lọc), `discover.empty.nearMe.*`, `feed.rsvp`, `feed.joinWaitlist`, `feed.going`, `feed.seatsOf`, `event.card.started`, `event.card.details`, `common.retry`, `datetime.timeZoneNote`, `area.all`.

| Key | EN | VI |
|---|---|---|
| `discover.view.swipe` | Swipe | Vuốt |
| `discover.swipe.title` | Swipe through events | Vuốt xem sự kiện |
| `discover.swipe.counter` | {i} of {n} | {i}/{n} |
| `discover.swipe.card.aria` | {title}. Starts {time}. {area}. {seats}. Hosted by {host}. | {title}. Bắt đầu {time}. {area}. {seats}. Người tổ chức: {host}. |
| `discover.swipe.action.save` | Save | Lưu |
| `discover.swipe.action.saveAria` | Save {title} | Lưu {title} |
| `discover.swipe.action.skip` | Skip | Bỏ qua |
| `discover.swipe.action.skipAria` | Skip {title} | Bỏ qua {title} |
| `discover.swipe.action.details` | Details | Chi tiết |
| `discover.swipe.action.detailsAria` | Open details for {title} | Mở chi tiết {title} |
| `discover.swipe.action.undo` | Undo | Hoàn tác |
| `discover.swipe.action.undoAria` | Undo the last action | Hoàn tác thao tác vừa rồi |
| `discover.swipe.savedButton` | Saved ({n}) | Đã lưu ({n}) |
| `discover.swipe.savedButtonAria` | Open saved events, {n} saved | Mở danh sách đã lưu, đã lưu {n} |
| `discover.swipe.coach` | Swipe right to save, left to skip, up for details | Vuốt phải để lưu, trái để bỏ qua, lên để xem chi tiết |
| `discover.swipe.coachOk` | Got it | Đã hiểu |
| `discover.swipe.keysHint` | Keyboard: ← skip, → save, ↑ details, U undo | Bàn phím: ← bỏ qua, → lưu, ↑ chi tiết, U hoàn tác |
| `discover.swipe.stack.aria` | Event cards, swipe to choose | Chồng thẻ sự kiện, vuốt để chọn |
| `discover.swipe.announce.saved` | Saved {title}. {left} left. | Đã lưu {title}. Còn {left} sự kiện. |
| `discover.swipe.announce.skipped` | Skipped {title}. {left} left. | Đã bỏ qua {title}. Còn {left} sự kiện. |
| `discover.swipe.announce.undone` | Undid the last action. {title} is back. | Đã hoàn tác. {title} đã quay lại. |
| `discover.swipe.sheet.aria` | Event details | Chi tiết sự kiện |
| `discover.swipe.sheet.close` | Close | Đóng |
| `discover.swipe.sheet.openFull` | Open full page | Mở trang đầy đủ |
| `discover.swipe.sheet.saved` | Saved | Đã lưu |
| `discover.swipe.sheet.rsvpNote` | Saving is not signing up. Press Join to reserve a spot. | Lưu không phải là đăng ký. Hãy bấm Tham gia để giữ chỗ. |
| `discover.swipe.summary.title` | Your plan | Kế hoạch của bạn |
| `discover.swipe.summary.round` | You have seen {n} events | Bạn đã xem {n} sự kiện |
| `discover.swipe.summary.savedHeading` | Saved ({n}) | Đã lưu ({n}) |
| `discover.swipe.summary.joinedHeading` | You joined ({n}) | Bạn đã tham gia ({n}) |
| `discover.swipe.summary.skippedHeading` | Skipped ({n}) | Đã bỏ qua ({n}) |
| `discover.swipe.summary.empty` | You have not saved any events yet. | Bạn chưa lưu sự kiện nào. |
| `discover.swipe.summary.showAgain` | Show again | Hiện lại |
| `discover.swipe.summary.remove` | Remove | Bỏ lưu |
| `discover.swipe.summary.keepSwiping` | Keep swiping | Tiếp tục vuốt |
| `discover.swipe.summary.backToDeck` | Back to cards | Quay lại thẻ |
| `discover.swipe.summary.clash` | Time clash on {day}: {a} overlaps {b}. | Trùng giờ ngày {day}: {a} trùng với {b}. |
| `discover.swipe.summary.clashJoined` | Time clash: {a} overlaps {b}, an event you joined. | Trùng giờ: {a} trùng với {b}, sự kiện bạn đã tham gia. |
| `discover.swipe.summary.endAssumed` | No end time set, so we assumed {hours} hours. | Chưa có giờ kết thúc nên tạm tính {hours} giờ. |
| `discover.swipe.summary.unavailable` | This event is no longer available. | Sự kiện này không còn khả dụng. |
| `discover.swipe.summary.deviceNote` | Saved on this device only. Signing out removes the list. | Chỉ lưu trên thiết bị này. Đăng xuất sẽ xoá danh sách. |
| `discover.swipe.done.title` | You have seen everything for now | Bạn đã xem hết rồi |
| `discover.swipe.done.body` | New events appear every day. See your saved events or bring back the ones you skipped. | Mỗi ngày đều có sự kiện mới. Hãy xem các sự kiện đã lưu hoặc hiện lại những sự kiện đã bỏ qua. |
| `discover.swipe.done.showSkipped` | Show skipped events again | Hiện lại các sự kiện đã bỏ qua |
| `discover.swipe.storage.unavailable` | This browser will not let us save, so your list is lost when you close the tab. | Trình duyệt không cho lưu nên danh sách sẽ mất khi bạn đóng tab. |
| `discover.swipe.storage.full` | Your saved list is full (50). Remove one to save another. | Danh sách đã lưu đã đầy (50). Hãy bỏ lưu một sự kiện để lưu thêm. |

Ghi chú: các chuỗi có tham số `{title}` phải truyền qua i18n (không nối chuỗi). Chuỗi mẫu cũng cần cho dữ liệu seed (S.9): tiêu đề sự kiện mẫu không phải key i18n, là nội dung người tạo.

### S.9 Dữ liệu mẫu (SW7)

- **Mục tiêu:** chủ dự án mở điện thoại hoặc giả lập 390 px, vào `/discover?view=swipe` và thấy ngay một deck có nội dung thật, đủ để thử Lưu, Bỏ qua, hoàn tác, tổng kết, cảnh báo trùng giờ.
- **Hình thức:** script seed idempotent (đặt cạnh `apps/api/src/database/seeds/`, lệnh gọi do Tech Lead chốt). Không đổi schema (không thêm `source`). Chạy trên local/dev sau `seed-areas`; **từ chối chạy** khi `NODE_ENV=production`.
- **Nhân vật mẫu:** 2 host (`@example.test`, ví dụ handle `sample_host_a`, `sample_host_b`, một người `trustLevel` cao) và 1 member `sample_member` (mật khẩu dev lấy từ biến môi trường, không hard-code trong repo, hướng dẫn trong README ops). Lưu ý: tài khoản này sẽ bị tính vào KPI Overview theo D-20.
- **Sự kiện** (tất cả `published`, thời gian **tương đối với `now` lúc seed**, nên chạy lại để làm mới; giờ hiển thị theo ICT):

| # | Ca | Nội dung gợi ý |
|---|---|---|
| 1 | Bắt đầu trong ~90 phút (< 2 giờ) | Morning Beach Yoga, Mỹ Khê |
| 2 | Tối nay, có `endsAt` | Vietnamese ⇄ English Language Exchange, 19:00–21:00 (Hải Châu) |
| 3 | **Trùng giờ với #2** (cặp 1) | Pub Quiz Night, 20:00–22:30 (An Thượng) |
| 4 | **Chạm biên** với #2 (không trùng) | Late Coffee Meetup, 21:00–22:00 |
| 5 | `endsAt` = null, bắt đầu 19:00 Thứ Bảy | Sunset Football Pickup (Sơn Trà) |
| 6 | **Trùng với #5 nhờ giờ giả định** (cặp 2), 20:30 Thứ Bảy | Salsa Social Night (Ngũ Hành Sơn) |
| 7 | **Đầy chỗ** (`capacity` = số đã RSVP) | Beginner Surf Session |
| 8 | Member mẫu đã RSVP (để thử trùng với RSVP) | Sunday Hike, Son Tra Peninsula |
| 9-14 | Rải đều 6 khu trong 14 ngày tới, giờ khác nhau, một số ít chỗ (≤ 8), một số nhiều | Board Games, Photo Walk, Brunch Club… |
| 15 | Tiêu đề rất dài tiếng Việt (kiểm tra cắt chữ) | "Giao lưu ngôn ngữ và ẩm thực đường phố Đà Nẵng dành cho người mới đến" |
| 16 | Tiêu đề và mô tả hỗn hợp EN/VI | "Cà phê sáng · Morning Coffee & Chill" |

- **Toạ độ** nằm trong từng khu để Map và Near me cũng có dữ liệu. Chủ dự án có thể chạy `--remove` để xoá toàn bộ dữ liệu mẫu theo tài khoản host mẫu.
- Dữ liệu mẫu **không** thay đổi hành vi nghiệp vụ nào; chỉ phục vụ xem và kiểm thử. Không đưa vào môi trường production.

### S.10 Service bị ảnh hưởng

- **apps/web-client-side** (chính): `discover-url.ts` (thêm `'swipe'` vào `DiscoverView`, parse/serialize), `discover-screen.tsx` (bộ chuyển 3 chế độ), thành phần swipe mới trong `discover/_components/` (deck, thẻ, sheet, tổng kết, trạng thái), kho localStorage (`saved`/`skipped`, gộp guest→user, xoá khi đăng xuất, nghe `storage`), hàm tính trùng giờ có test, tái dùng `useNow`, `joinOccurrence`, `cancelRsvp`, `requireAuth`. Nhắc: `apps/web-client-side/AGENTS.md` bắt buộc đọc tài liệu Next.js trong `node_modules/next/dist/docs/` trước khi viết code.
- **apps/api:** **không đổi API/schema/migration**. Chỉ thêm script seed dev trong `src/database/seeds/` (SW7).
- **apps/web-admin-side:** không đổi.
- **apps/mobile:** không đổi (hàm trùng giờ nên đặt chỗ dùng lại được).
- **packages dùng chung:** `packages/i18n` (`en.json`, `vi.json`, `src/message-keys.ts`, các key ở S.8); `packages/domain` (tuỳ chọn, Tech Lead quyết: hàm `findTimeClashes` + hằng `DEFAULT_EVENT_DURATION_MINUTES`); `packages/contracts` **không đổi**.

### S.11 Rủi ro / giới hạn đã biết

- **R-S1** Doc 14 §7 dự báo deck kéo tăng no-show và thiếu nhiên liệu (tồn kho mỏng). Giảm bằng: Lưu ≠ RSVP, nhắc rõ trong sheet, RSVP đúng 2 chạm, deck hữu hạn 12 thẻ, không streak/giới hạn. Số sự kiện thật ở Đà Nẵng ít thì deck cạn nhanh (trạng thái "xem hết" là một phần thiết kế). Cần đo no-show khi mở public.
- **L-S1** Lưu chỉ nằm trên một thiết bị: xoá dữ liệu trình duyệt, đổi máy, đăng xuất đều mất danh sách. Có ghi chú trên màn tổng kết. Follow-up F-S1 (API + migration).
- **L-S2** Không có "RSVP của tôi": cảnh báo trùng giờ với RSVP chỉ phủ các RSVP đã có trong dữ liệu đã tải (`viewerRsvpStatus` của sự kiện trong cửa sổ lọc hiện tại và các mục đã lưu). Tham gia sự kiện ngoài cửa sổ lọc thì không phát hiện. Follow-up F-S2 (`GET /me/rsvps`).
- **L-S3** Giờ kết thúc giả định 2 giờ có thể báo trùng sai hoặc bỏ sót; đã gắn chú thích khi dùng giả định.
- **L-S4** Bỏ qua local 72 giờ không đồng nhất với mockup (server hạ hạng và vô hiệu khi host đổi giờ/địa điểm/giá, BR-12). Sự kiện bị đổi giờ vẫn bị ẩn khỏi deck tới 72 giờ; chấp nhận ở v1.
- **L-S5** Đăng xuất chủ động xoá danh sách đã lưu (an toàn cho máy dùng chung nhưng mất dữ liệu người dùng). Xem Q-S2.
- **L-S6** Vị trí chính xác sự kiện vẫn lộ cho guest (R-3 gốc); thẻ swipe không hiện địa chỉ.
- **L-S7** Cử chỉ viết tay bằng Pointer Events cần test trên iOS Safari và Android Chrome thật (cuộn trang, bounce, cử chỉ hệ thống). Tester phải có ca trên thiết bị thật hoặc giả lập cảm ứng, không chỉ chuột.
- **L-S8** Sample data tạo tài khoản `@example.test` bị tính vào KPI Overview ở local (R-6, D-20).

### S.12 Ảnh hưởng trust_level / kiểm duyệt / report

- **Trust:** không đổi ngưỡng. Lưu/Bỏ qua không yêu cầu `trust_level`. RSVP trong sheet chịu đúng ngưỡng hiện có của server (người thiếu trust thấy `messageKey` actionable, như hiện tại).
- **Kiểm duyệt:** deck chỉ lấy `published`. Sự kiện bị `suspended`/`taken_down`/`cancelled` biến khỏi deck ở lần tải kế, và dòng đã lưu hiển thị "không còn khả dụng" khi làm mới (S-AC-18). Không có nút báo cáo/ẩn trên thẻ ở v1.
- **Report:** không thêm (menu ⋯ Báo cáo nằm ngoài phạm vi).

### S.13 Ảnh hưởng dữ liệu cá nhân

| Dữ liệu | Chạm ở đâu | Ai nhìn thấy | Xử lý |
|---|---|---|---|
| Danh sách sự kiện đã Lưu/Bỏ qua (id, tiêu đề, giờ, khu) | localStorage của thiết bị | Chỉ người dùng của thiết bị đó; không gửi server/analytics | Khoá theo `guest`/`userId`; xoá khoá `userId` khi đăng xuất chủ động; gộp guest→user khi đăng nhập; tối đa 50 mục |
| Sở thích suy ra từ hành vi vuốt | Không thu thập | Không ai | Không bảng impression, không analytics (doc 14 G-15; Luật 91/2025) |
| Vị trí (Near me) | Như D-8 | Không ai | Không lưu, không vào URL/localStorage |
| Dữ liệu seed | DB dev | Dev | Tài khoản `@example.test`, mật khẩu qua env, `--remove` để xoá |

### S.14 Thông báo cần gửi

Không có (không push, không email). Chỉ thông báo trong giao diện (cảnh báo trùng giờ, đầy 50, không có storage, `aria-live`). Không có kênh nào để tắt.

### S.15 Câu hỏi mở (không BLOCKING, đã có mặc định)

- **Q-S1** Có giữ cổng G1/G2 (≥ 40 sự kiện mở/7 ngày, mỗi khu ≥ 4) trước khi hiển thị mục Swipe cho **người dùng thật** không? Mặc định: không áp cổng ở dev/beta nội bộ (theo yêu cầu chủ dự án); cần chủ dự án quyết lại trước khi mở public (M6). Nếu giữ cổng, mục Swipe ẩn khi dưới ngưỡng.
- **Q-S2** Đăng xuất có nên xoá danh sách đã lưu? Mặc định: có (máy dùng chung, an toàn riêng tư), kèm ghi chú trên tổng kết. Nếu chủ dự án muốn giữ lại thì đổi thành "giữ, và có nút Xoá dữ liệu trên thiết bị này".
- **Q-S3** Giờ kết thúc giả định 2 giờ có hợp lý với loại sự kiện chủ yếu (language exchange, thể thao, cà phê)? Mặc định 2 giờ.
- **Q-S4** Sự kiện của chính viewer có nên hiện trong deck không? Mặc định: không (không tự tham gia sự kiện của mình). Cần xác nhận cách nhận biết "của mình" (so `organizer.handle` với hồ sơ của tôi) với Tech Lead.
- **Q-S5 (Tech Lead)** Đặt hàm trùng giờ ở `packages/domain` hay `_lib`; script seed gọi qua service hay ghi trực tiếp; có chấp nhận không thêm thư viện cử chỉ (Pointer Events thuần).
- **Q-S6 (follow-up)** F-S1: `saved_occurrences` + dismissals phía server (cần migration và duyệt rủi ro dữ liệu); F-S2: `GET /me/rsvps` cho cảnh báo trùng giờ đầy đủ; F-S3: `.ics` và chia sẻ kế hoạch; F-S4: sheet xác nhận theo giá/ít chỗ/< 2 giờ khi contract có giá.

### S.16 Bàn giao

Bàn giao cho **Tech Lead** (chốt: hợp đồng kho localStorage, vị trí hàm trùng giờ, seed, cách làm cử chỉ không thêm dependency) và **Coordinator** (nối phụ lục vào `brief.md`, cắt card). Gợi ý cắt card cho đợt thêm này: (S1) hàm trùng giờ + kho localStorage + test đơn vị; (S2) khung deck, cử chỉ, nút/phím, a11y; (S3) sheet chi tiết + RSVP; (S4) tổng kết + trùng giờ + trạng thái rỗng/lỗi; (S5) i18n S.8; (S6) seed dev; (S7) Screen lane + thiết bị thật. Sau khi Tester xác minh, BA đối chiếu lại từng S-AC.

### S.0 Quyết định Coordinator (01/10/2026)

- Chấp nhận mọi mặc định BA. Q-S1 (cổng G1/G2) và Q-S2 (đăng xuất xoá danh sách đã lưu) giữ mặc định, báo chủ dự án xem lại trước M6.
- **S.9 dữ liệu mẫu:** đã có script `seed-demo.ts` (card DM-1: `pnpm db:seed:demo`, tài khoản `*@demo.danangconnect.test`, cờ `--reset`/`--purge`). Bổ sung các ca S.9 (cặp trùng giờ, chạm biên, `endsAt` null, bắt đầu < 2 giờ, member mẫu đã RSVP, tiêu đề dài) và chặn chạy khi `NODE_ENV=production` vào chính script đó; thay `--remove` bằng `--purge`; mật khẩu dev cố định chấp nhận được vì script từ chối chạy ở production.
