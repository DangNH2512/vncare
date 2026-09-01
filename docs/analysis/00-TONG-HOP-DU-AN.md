# 00 — Tổng hợp dự án Da Nang Connect

| Thuộc tính | Giá trị |
|---|---|
| Tài liệu | Bản tổng hợp chủ (master synthesis) của 9 tài liệu phân tích |
| Sản phẩm | **Da Nang Connect** — nền tảng kết nối cộng đồng người nước ngoài tại Đà Nẵng |
| Phạm vi | Giai đoạn 1 — Kết nối cộng đồng (sự kiện, thể thao, trao đổi ngôn ngữ). Địa lý: **chỉ Đà Nẵng** |
| Ngày lập | 2026-08-31 · **Phiên bản 1.1** — cập nhật sau khi sáu tài liệu `01`, `02`, `03`, `05`, `07`, `08` được viết tiếp cho đủ mục lục |
| Trạng thái | **Draft để chủ dự án ra quyết định.** **Cả 9 tài liệu nguồn nay đã đầy đủ theo đúng mục lục của chính chúng — không còn tài liệu nào bị cắt cụt** (MT-13 đã giải). Trong 15 mâu thuẫn ghi ở bản 1.0: **11 đã giải · 2 còn mở** (MT-06, MT-08) · **2 tạm gác** (MT-04, MT-14 — mảng pháp lý hoãn sang giai đoạn sau); phát hiện thêm **5 mâu thuẫn mới** khi viết tiếp (MT-16 → MT-20). Trong 16 câu hỏi: **8 đã có câu trả lời chốt · 8 còn mở** |
| Nguồn | `docs/analysis/01` → `docs/analysis/10`, `docs/source/Da_Nang_Connect_Brief.txt` |
| Đối tượng đọc | Chủ dự án / Founder, Tech Lead, Product Owner, nhà đầu tư, luật sư |

> **Cách dùng tài liệu này.** Đây là bản rút gọn có thẩm quyền để ra quyết định. Mọi chi tiết triển khai vẫn nằm ở 9 tài liệu gốc (xem [§11 Mục lục](#11-mục-lục-liên-kết-tới-9-tài-liệu-chi-tiết)). Khi bản tổng hợp này mâu thuẫn với tài liệu con, **[§12 Mâu thuẫn cần giải quyết](#12-mâu-thuẫn-cần-giải-quyết)** là nơi ghi nhận, không phải chỗ để lờ đi.

---

## Mục lục

1. [Tóm tắt điều hành](#1-tóm-tắt-điều-hành)
2. [Tác nhân & role](#2-tác-nhân--role) — *role enum 5 giá trị · ma trận RBAC · trust T0–T5, đã chốt*
3. [Use case MVP theo MoSCoW](#3-use-case-mvp-theo-moscow) — *45 Must (waitlist đã lên Must) · L1→L7 điều kiện ra mắt*
4. [Kiến trúc & tech stack đã chốt](#4-kiến-trúc--tech-stack-đã-chốt)
5. [Roadmap & milestone](#5-roadmap--milestone) — *13 sprint lập lịch, 11 trước M6 · kịch bản tinh gọn 2 dev*
6. [Top 10 rủi ro và cách xử lý](#6-top-10-rủi-ro-và-cách-xử-lý)
7. [Mảng pháp lý — tạm gác, chưa xong](#7-mảng-pháp-lý--tạm-gác-chưa-xong) — *hoãn sang giai đoạn sau; phải làm xong trước khi ra mắt công khai*
8. [Decision log](#8-decision-log) — *QĐ-01 → QĐ-76, trong đó QĐ-54 → QĐ-76 chốt ngày 31/08/2026*
9. [Câu hỏi còn mở cần chủ dự án trả lời](#9-câu-hỏi-còn-mở-cần-chủ-dự-án-trả-lời) — *8/16 đã có câu trả lời chốt*
10. [Việc cần làm ngay: 01/09 → 14/09/2026](#10-việc-cần-làm-ngay-0109--14092026)
11. [Mục lục liên kết tới 9 tài liệu chi tiết](#11-mục-lục-liên-kết-tới-9-tài-liệu-chi-tiết)
12. [Mâu thuẫn cần giải quyết](#12-mâu-thuẫn-cần-giải-quyết) — *11 đã giải · 2 còn mở · 2 tạm gác · 5 mới (MT-16 → MT-20)*

---

## 1. Tóm tắt điều hành

### Dự án là gì

Da Nang Connect là nền tảng web + ứng dụng di động giúp người nước ngoài đang sống tại Đà Nẵng trả lời một câu hỏi duy nhất trong dưới 60 giây: **"tuần này ở khu tôi có gì diễn ra, ai sẽ đi, và còn chỗ không?"**. Giai đoạn 1 tập trung vào sự kiện cộng đồng, thể thao và trao đổi ngôn ngữ, với bốn năng lực lõi: tạo hoạt động không ma sát, RSVP có sức chứa kèm waitlist, tìm kiếm/lọc theo khu vực cấp phường, và hồ sơ có trust level để người lạ dám gặp nhau ngoài đời. Giai đoạn 2 (Nhà ở) và Giai đoạn 3 (Y tế / dịch vụ chuyên môn) đã được thiết kế chừa chỗ trong lược đồ dữ liệu nhưng **không kích hoạt** ở giai đoạn 1.

### Tại sao là bây giờ

Nhu cầu đã tồn tại và đang bị phân mảnh trên ít nhất 5 kênh (Facebook Groups, Meetup, WhatsApp/Telegram, Luma, truyền miệng). Phân tích 3.504 bài đăng cộng đồng cho thấy tỷ lệ **cầu/cung là 11:1** — cứ 11 người hỏi mới có 1 người chào — và số bài đăng về sự kiện tăng gấp 10 lần trong T5–T6/2026. Không đối thủ nào (Meetup, Luma, Eventbrite, InterNations) có động cơ kinh tế để phục vụ riêng một thành phố 15.000 người nước ngoài; điểm khả năng phản ứng của tất cả đều ≤ 3/5. Rào cản gia nhập bằng công nghệ gần bằng 0 — **rào cản thật là mật độ nội dung sống trong bán kính 1,5 km, quan hệ với ~25 organizer, và pháp nhân + giấy phép mạng xã hội tại Việt Nam**. Cửa sổ cơ hội mở, nhưng không rộng.

### Làm gì trong 6 tháng tới (09/2026 → 02/2027)

| Mốc | Ngày | Nội dung |
|---|---|---|
| M0 | 18/09/2026 | Hạ tầng, CI/CD, staging, dev build trên máy thật |
| M1 | 02/10/2026 | API nền + Auth (email, Google, Apple, Facebook), refresh token xoay vòng |
| M2 | 30/10/2026 | Tạo & khám phá sự kiện, PostGIS, bản đồ, SEO trang chi tiết |
| M3 | 13/11/2026 | RSVP + waitlist + push notification + nhắc lịch |
| M4 | 27/11/2026 | Trust & Safety tối thiểu + toàn bộ tài liệu pháp lý đã công bố |
| M5 | 25/12/2026 | Beta kín 100 user thật, ≥ 60 sự kiện đã curate |
| M6 | 25/02/2027 | Ra mắt công khai trên App Store + Google Play + web |

Song song và **quan trọng ngang phần kỹ thuật**: đội sáng lập tự tay curate lịch sự kiện đầy đủ nhất Đà Nẵng (nhập tay, ghi nguồn, tuyệt đối không scraping), rồi dùng chính lưu lượng RSVP làm đòn bẩy mời organizer gốc nhận quyền quản lý listing của họ.

### Cần bao nhiêu tiền và người

| Hạng mục | Kịch bản đủ đội | Kịch bản tinh gọn |
|---|---|---|
| Nhân sự | **5,5 FTE** (Tech Lead, Backend, Frontend, Mobile, Designer 0.5, QA 0.5, Community Manager 0.5) | **2 lập trình viên** + Founder kiêm PO/Community |
| Ngân sách 7 tháng | **≈ 2,04 tỷ VND ≈ 78.500 USD** | **≈ 0,91 tỷ VND ≈ 35.000 USD** |
| Hạ tầng | ≈ 196 USD/tháng ở mốc A (≤ 500 user), ≈ 1.127 USD/tháng ở mốc B (5.000 user) | như trên |
| Pháp lý tới M6 | **130 – 350 triệu VND** (+30% dự phòng) — chiếm 7–17% ngân sách tổng | không được cắt tư vấn pháp lý M0 và ToS/Privacy M4 |
| Khối lượng | ≈ 563 story point (chưa gồm 15% dự phòng), 11 sprint 2 tuần | phải cắt scope, kéo dài thêm 2–4 sprint |

Tỷ giá quy đổi thống nhất: **1 USD = 26.000 VND**.

### Chỉ số nào quyết định thành bại

**North Star Metric: Weekly Confirmed Attendances (WCA)** — số lượt tham dự sự kiện được xác nhận trong 7 ngày gần nhất. Đây là đơn vị nhỏ nhất của "giá trị đã giao": một người thật đã gặp người thật vì Da Nang Connect.

Hai chỉ số trả lời câu hỏi duy nhất thực sự quan trọng — *sản phẩm có tự chạy được không, hay chỉ chạy khi founder đẩy?*

| Chỉ số | Ngưỡng xanh tại M6 + 8 tuần (22/04/2027) | Ngưỡng đỏ |
|---|---|---|
| **Tỷ lệ sự kiện tự phục vụ** (organizer tự đăng, không do đội curate) | ≥ 25% | < 15% |
| **Tỷ trọng user từ vòng lặp giới thiệu + tự nhiên** | ≥ 35% | < 20% |
| Số sự kiện đang mở mỗi tuần | ≥ 25, không khu vực MVP nào bằng 0 | < 15 |
| WCA/tuần (mục tiêu đã hiệu chỉnh) | ≥ 220 | < 110 |
| MAU | ≥ 700 | < 350 |
| `retention_in_city` D30 (đã loại cohort đã rời thành phố) | ≥ 22% | < 15% |

> **Ngưỡng chặn tuyệt đối:** không ra mắt công khai khi chưa có đường xử lý pháp lý cho yêu cầu xác thực số điện thoại theo Nghị định 147/2024/NĐ-CP — bất kể mọi chỉ số khác đẹp đến đâu.

---

## 2. Tác nhân & role

*Rút gọn từ `docs/analysis/01-tac-nhan-va-phan-quyen.md`.*

### 2.1 Tác nhân

| Nhóm | Mã | Tác nhân | Vai trò trong sản phẩm | Thiết bị chính | Trạng thái GĐ1 |
|---|---|---|---|---|---|
| Primary | A1 | **Expat / Member** | Tìm hoạt động, RSVP, gặp người. Actor đông nhất, là lý do tồn tại của sản phẩm | Mobile ~80% | ✅ Kích hoạt |
| Primary | A2 | **Event Organizer** | Tạo & quản lý hoạt động. Hai nhánh: nghiệp dư (mobile 100%) và chuyên nghiệp (web cho tạo & phân tích) | Mobile / Web | ✅ Kích hoạt — nhưng **không phải role toàn cục** (D-03): là **quan hệ theo sự kiện** qua `events.host_user_id` + `event_cohosts` |
| Primary | A3 | **Local Bilingual Host** | Người Việt nói tiếng Anh dẫn dắt hoạt động — nguồn cung quý, cầu nối văn hoá | Mobile (Android) | ✅ Kích hoạt, có badge `local_host` |
| Primary | A4 | **Local Service Provider** | Nhà cung cấp dịch vụ nhà ở / y tế | — | ❌ GĐ2–3. **Không** thêm giá trị `service_provider` vào `user_role_enum` (D-06); khi tới lúc dùng bảng `service_providers` + `provider_members` |
| Secondary | B1 | **Content Curator** | Nhập tay sự kiện công khai, mời organizer gốc nhận listing. **Quan trọng bậc nhất tháng 1–6** | Web/desktop 95% | ✅ Kích hoạt |
| Secondary | B2 | **Community Moderator** | Xử lý hàng đợi báo cáo, gỡ nội dung, đình chỉ tài khoản | Web + mobile | ✅ Kích hoạt |
| Secondary | B3 | **Support Agent** | Sự cố tài khoản, gửi lại xác minh, impersonate chỉ đọc | Web | ✅ **Đã chốt gộp vào `moderator`** (D-05) — không tồn tại role `support` riêng; permission `user.support.*` gán cho `moderator` |
| Secondary | B4 | **Admin** | Taxonomy khu vực & danh mục, feature flag, analytics toàn hệ thống | Web/desktop | ✅ Kích hoạt |
| Secondary | B5 | **Super Admin** | Gán/thu hồi role, xoá vĩnh viễn, ẩn danh hoá, audit log đầy đủ | Web, bắt buộc 2FA | ✅ 2–3 tài khoản |
| System | C1–C7 | Push (Expo), Email/SMS, Map/geocoding, Object Storage + CDN, BullMQ scheduler, Socket.IO gateway, Sentry | Dịch vụ tự động | ✅ Kích hoạt |
| System | C8 | Payment Gateway | Thanh toán | ❌ GĐ2, chỉ có quyền `billing.*` dự trữ |
| External | D1–D4 | Facebook Groups, Meetup.com, WhatsApp Groups, Luma / trang sự kiện độc lập | **Nguồn phát hiện sự kiện — con người đọc bằng mắt, gõ tay** | 🚫 Cấm tuyệt đối scraping, crawler, headless browser, API không chính thức |
| External | D5 | Nhà cung cấp OAuth (Google, Apple, Facebook) | Đăng nhập xã hội, scope tối thiểu `email` + `profile` | ✅ Kích hoạt |

### 2.2 Persona chốt

| Persona | Chân dung | Điều họ cần nhất | Điều làm họ bỏ app |
|---|---|---|---|
| **P1 Marco** | Nam 29, Ý, nomad 6 tuần, ở An Thượng | Bộ lọc `Tonight` + trong 3 km; RSVP 2 chạm | Bắt đăng ký trước khi được xem gì; app trống |
| **P2 Sarah** | Nữ 41, Anh, năm thứ 4, có 2 con, ở Mỹ An | Bộ lọc `family_friendly` / `alcohol_free`; biết rõ ai tổ chức | Nhận tin nhắn quấy rối, không có cách báo cáo |
| **P3 Tom** | Nam 34, Mỹ, tổ chức cầu lông tối T3 & T5, Sơn Trà | Nhân bản buổi tuần trước < 30 giây; waitlist tự đôn; đánh dấu no-show 1 chạm | Bắt trả phí; form dài quá 1 màn hình; phải dùng web |
| **P4 Linh** | Nữ 33, Việt, đồng sở hữu studio yoga ở An Thượng | Hồ sơ tổ chức tách khỏi cá nhân; co-host; analytics lượt xem → RSVP → có mặt | Bị đối xử như spammer; không có analytics |
| **P5 Minh** | Nam 27, Việt, Content Curator nội bộ | Form curate nhớ giá trị cũ; bảng theo dõi vòng đời claim | Công cụ nhập liệu tệ |
| **P6 Anna** | Nữ 38, Đức, Moderator tình nguyện | Hàng đợi ưu tiên; **tên cá nhân không bao giờ xuất hiện trên thông báo cấm** | Kiệt sức, lộ danh tính |

### 2.3 Hệ thống role — ✅ **ĐÃ CHỐT** (giải MT-02)

> **Cột `users.role` kiểu `user_role_enum` có đúng 5 giá trị: `member` | `curator` | `moderator` | `admin` | `super_admin`.**
> Không có giá trị nào khác, không có giá trị "dự trữ cho giai đoạn sau".
> Nguồn có thẩm quyền: `01-tac-nhan-va-phan-quyen.md` §8.1 và §15.1 (D-01 → D-08). Bốn tập role cũ ở bảng lịch sử bên dưới **hết hiệu lực** kể từ 31/08/2026.

```sql
CREATE TYPE user_role_enum AS ENUM (
  'member',       -- mặc định cho mọi tài khoản
  'curator',      -- đội sáng lập, nhập listing từ nguồn ngoài
  'moderator',    -- kiểm duyệt + hỗ trợ tài khoản (đã gộp 'support')
  'admin',        -- vận hành nền tảng, taxonomy, analytics
  'super_admin'   -- gán role, xoá vĩnh viễn, audit đầy đủ
);
```

**Bốn thứ trông giống role nhưng KHÔNG phải role** — đây chính là nguồn gốc của MT-02:

| Khái niệm | Bản chất thật | Lưu ở đâu | Kiểm bằng gì | Quyết định |
|---|---|---|---|---|
| `guest` | **Trạng thái phiên** — "chưa có JWT hợp lệ", không phải hàng trong `users` | Không lưu ở đâu cả | `@Public()` + `request.user === undefined` | D-02 |
| `organizer` | **Quan hệ theo sự kiện** — organizer *của những sự kiện của mình*, không phải của cả nền tảng | `events.host_user_id`, bảng `event_cohosts` | `EventOwnershipGuard` + `@EventContext()` | D-03 |
| `verified_member` | **Trust level** — một bậc trên thang T0–T5 | `users.trust_level` smallint 0–5 | `@MinTrust(2)` | D-04 |
| `support` | **Đã gộp vào `moderator`** — không tồn tại role riêng | — | Permission `user.support.*` gán cho `moderator` | D-05 |

**Bốn trục phân quyền — thứ tự đánh giá là BẤT BIẾN** (D-07, `01` §8.2 và §13.1). Cả sáu lớp guard đăng ký ở `APP_GUARD` theo đúng thứ tự này; hai guard cuối tự no-op khi thiếu metadata:

```mermaid
flowchart LR
    REQ["Request"] --> G0["Truc 0 - Trang thai tai khoan<br/>AccountStatusGuard"]
    G0 --> G1["Truc 1 - Role toan cuc<br/>RolesGuard - @Roles()"]
    G1 --> G2["Truc 2 - Quan he theo su kien<br/>EventOwnershipGuard - @EventContext()"]
    G2 --> G3["Truc 3 - Trust level<br/>TrustTierGuard - @MinTrust()"]
    G3 --> OK["Cho phep + ghi audit_log neu la hanh dong quan tri"]
    G0 -.->|"restricted / suspended / banned"| NO["403 + ly do i18n"]
    G1 -.-> G2
    G3 -.-> NO
```

**Bộ tên chuẩn duy nhất** (nhật ký `01` §15.7): `JwtAuthGuard` · `AccountStatusGuard` · `RolesGuard` · `EventOwnershipGuard` · `TrustTierGuard` · `@Roles()` · `@MinTrust()` · `@EventContext()` · `@RequireEventRole()`. **Không** dùng `EventRoleGuard`, `TrustLevelGuard`, `@RequireTrust()`, `@MinTrustTier()` — xem MT-17.

#### Ma trận RBAC rút gọn — 12 quyền tiêu biểu

Bản đầy đủ **22 quyền × 8 cột** cùng 51 mã điều kiện `Đn` nằm ở `01-tac-nhan-va-phan-quyen.md` §9.2 – §9.3. Hai cột cuối là **lớp cộng thêm theo ngữ cảnh**, mở ra bất kể role toàn cục là gì.

| Quyền | Permission key | guest | member | curator | moderator | admin | super_admin | host | co-host |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Xem sự kiện công khai | `event.view_public` | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tạo sự kiện | `event.create` | ❌ | ⚠️ T1 | ✅ | ⚠️ | ⚠️ | ⚠️ | — | — |
| Sửa sự kiện của mình | `event.update.own` | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| Sửa sự kiện người khác | `event.update.any` | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ |
| RSVP | `rsvp.create` | ❌ | ⚠️ T1 | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ |
| Xem danh sách người tham gia | `attendee.list` | ❌ | ⚠️ T2 | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ |
| Đánh dấu check-in | `attendance.check_in` | ❌ | ❌ | ⚠️ | ❌ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| Nhắn tin 1-1 | `dm.send` | ❌ | ⚠️ T2 | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| Ẩn nội dung | `content.hide` | ❌ | ❌ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| Khoá tài khoản | `user.suspend` | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ✅ | ❌ | ❌ |
| **Gán / thu hồi role** | `user.role.assign` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ four-eyes | ❌ | ❌ |
| Curate sự kiện từ nguồn ngoài | `curation.create` | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | — | — |

> **Hai bất biến phải có test** (`01` §13.8): **INV-2** — `audit_log` bị thu hồi `UPDATE`/`DELETE` ở tầng DB role ứng dụng. **INV-3** — số `super_admin` đang `active` luôn ≥ 2, và **chỉ `super_admin`** gán được role (D-08). Vì thế UC-73 bị **tách đôi**: `admin` tìm user / xem lịch sử / đình chỉ; `user.role.assign` chỉ `super_admin`.

### 2.4 Trust level T0–T5 — ✅ **ĐÃ CHỐT** (giải MT-12)

Thang **T0–T5** là **thang duy nhất** của sản phẩm. Cột `users.trust_level smallint NOT NULL DEFAULT 0 CHECK (trust_level BETWEEN 0 AND 5)`. Mọi thang điểm 0–100 và enum `new`/`verified`/`established`/`trusted`/`ambassador` **bị xoá khỏi tài liệu và code** (D-09).

| Bậc | Nhãn hiển thị EN / VI | Điều kiện cốt lõi | Mở ra điều gì (rút gọn) |
|---|---|---|---|
| **T0** | *New* / Mới | Mặc định khi tạo tài khoản | Chỉ xem; không tạo sự kiện, không RSVP sự kiện có `trust_gate` |
| **T1** | *Email verified* / Đã xác minh email | Email đã xác minh (UC-02) hoặc social login trả `email_verified` | RSVP · 1 sự kiện/ngày · bình luận 5/ngày |
| **T2** | *Phone verified* / Đã xác minh SĐT | T1 + OTP số điện thoại (UC-13) | 3 sự kiện/ngày · xem danh sách attendee · nhắn tin 1-1 · được mời co-host |
| **T3** | *Active member* / Thành viên tích cực | T2 + tài khoản ≥ 14 ngày + ≥ 3 occurrence `checked_in`/90 ngày (hoặc host 1 buổi có ≥ 3 người) + `no_show_rate` < 25% | 5 sự kiện/ngày · chuỗi lặp lại (UC-24) · xuất CSV attendee · đủ điều kiện được mời `moderator` |
| **T4** | *Trusted* / Đáng tin cậy | T3 + ≥ 60 ngày + ≥ 8 occurrence `checked_in`/180 ngày + đánh giá ≥ 4,5/5 với ≥ 5 lượt + `no_show_rate` < 10% | 10 sự kiện/ngày · bảo lãnh 3 lượt/tháng · vào dải Featured |
| **T5** | *Community leader* / Người dẫn dắt cộng đồng | T4 + **một hành động thủ công của `admin`** (`staff_endorsement`) — **không bao giờ tự động hoàn toàn** (D-12) | Hạn mức gần như không giới hạn · bảo lãnh 10 lượt/tháng |

Ba ràng buộc đi kèm: tín hiệu lưu ở **`trust_signals` append-only**; bậc do **job BullMQ `trust:recompute`** ghi và đó là **nơi duy nhất** ghi `users.trust_level` (D-11); **badge là lớp hiển thị, không cấp quyền**, và **không badge nào mang nghĩa tiêu cực** — số `no_show`, số lần bị báo cáo, điểm thành phần **không hiển thị công khai** (D-13). Ngưỡng trust chỉ được lấy từ danh sách ở `01` §12.13, cấm phát minh ngưỡng mới trong PR (D-14).

### 2.5 Bảng lịch sử — bốn tập role của bản 1.0 (đã hết hiệu lực)

Giữ lại để truy vết vì sao MT-02 tồn tại, **không dùng để triển khai**.

| Nguồn | Tập role (bản cũ) | Đã xử lý thế nào |
|---|---|---|
| `01` (§3–§5) | `member` → `verified_member` → `organizer`, `curator`, `support`, `moderator`, `admin`, `super_admin` | `verified_member` → trust level (D-04); `organizer` → quan hệ theo sự kiện (D-03); `support` → gộp `moderator` (D-05) |
| `02` (§3) | Guest, Member, Organizer, **Co-host**, Curator, Moderator, Admin | `Guest` → trạng thái phiên (D-02); `Co-host` → bảng `event_cohosts`; bổ sung `super_admin` |
| `03` (§4.1 enum) | `member` \| `curator` \| `moderator` \| `admin` | Lấy làm nền, **bổ sung `super_admin`** thành đủ 5 giá trị |
| `08` (E2-S7) | `user` \| `organizer` \| `moderator` \| `admin` | `user` → `member`; `organizer` bỏ khỏi enum. `08` M1-4 nay nghiệm thu đúng 5 giá trị bằng test đọc `pg_enum` |

---

## 3. Use case MVP theo MoSCoW

*Rút gọn từ `docs/analysis/02-use-case.md` — 76 use case, 11 epic.*

### 3.1 Phân bổ tổng

> **Cập nhật bản 1.1:** `02` §10 (Ranh giới MVP) đã được viết đầy đủ. **UC-40 waitlist chuyển từ `Should` lên `Must`** theo quyết định chốt D-17 — vì thế `Must` tăng từ 44 lên **45** và `Should` giảm từ 18 xuống **17**. Đây là lời giải của MT-05.

| MoSCoW | Số UC | Ước lượng | Ghi chú |
|---|---:|---:|---|
| **Must** | **45** | ~190 ngày-người | Thiếu thì không ra mắt được |
| **Should** | **17** | ~76 ngày-người | Đợt 2, ngay sau MVP (M6 → M9) |
| **Could** | 8 | ~35 ngày-người | Đợt 3, củng cố (M9 → M12). Cắt được không ảnh hưởng giả thuyết lõi |
| **Won't (GĐ1)** | 6 | — | Đã thiết kế trước để không phải đập đi làm lại |
| **Tổng** | **76** | **~301 ngày-người** | |

Quy đổi: `S ≈ 1,5 ngày-người` · `M ≈ 4` · `L ≈ 9` (đã gồm API + web + mobile + test). Với 2 backend + 1 web + 1 mobile chạy song song, phần **Must** rơi vào **10–12 tuần lịch**.

### 3.2 Danh mục Must — bắt buộc có để ra mắt

| Epic | Use case Must | Ghi chú |
|---|---|---|
| **EP-01 Onboarding & Auth** | UC-01 đăng ký email · UC-02 xác minh email · UC-03 đăng nhập · UC-04 social login (Google/Apple/Facebook) · UC-05 onboarding lần đầu · UC-06 đặt lại mật khẩu · UC-07 refresh & đăng xuất · UC-08 đổi ngôn ngữ · UC-09 **duyệt ở chế độ khách** · UC-10 xoá tài khoản & xuất dữ liệu | UC-09 và UC-10 là điều kiện sống còn: một là ràng buộc persona P1, một là chính sách store |
| **EP-02 Hồ sơ & Trust** | UC-11 sửa hồ sơ · UC-12 xem hồ sơ công khai · UC-13 xác minh email + SĐT · UC-15 tính & hiển thị chỉ số tin cậy | UC-14 xác minh giấy tờ = **Won't** ở GĐ1 |
| **EP-03 Tạo & quản lý sự kiện** | UC-19 tạo hoạt động · UC-20 chọn địa điểm trên bản đồ + gán khu vực · UC-21 nháp & xuất bản · UC-22 sửa đã xuất bản · UC-23 huỷ · UC-25 quản lý người tham dự | UC-24 lặp lại = Should; UC-26 co-host = Could; UC-27 QR check-in = Should; UC-28 nhân bản = Could |
| **EP-04 Khám phá & tìm kiếm** | UC-29 feed "Tuần này ở Đà Nẵng" · UC-30 tìm kiếm toàn văn · UC-31 lọc nâng cao · UC-32 quanh vị trí hiện tại · UC-33 bản đồ · UC-35 lưu quan tâm | Khác biệt cạnh tranh số 1 |
| **EP-05 RSVP & tham gia** | UC-38 đăng ký tham gia · UC-39 huỷ đăng ký · **UC-40 waitlist + tự động thăng hạng** · UC-43 xem danh sách người tham dự | ✅ **UC-40 nay là `Must`** (D-17, `02` §10.2). RSVP gắn `occurrence_id`; FIFO, cửa sổ xác nhận **12 giờ** (rút còn 30 phút khi sắp tới giờ); huỷ RSVP kích hoạt thăng hạng ngay |
| **EP-06 Tương tác** | UC-45 bình luận · UC-48 chia sẻ ra ngoài (deep link + OG image) | UC-46 chat nhóm = Should; UC-47 DM = Could |
| **EP-07 Thông báo** | UC-51 đăng ký push · UC-52 nhắc lịch trước giờ · UC-54 trung tâm thông báo | UC-53 tuỳ chọn thông báo = Should; UC-55 digest tuần = Should |
| **EP-09 Kiểm duyệt** | UC-60 báo cáo vi phạm · UC-61 xử lý hàng đợi · UC-62 gỡ nội dung & đình chỉ | UC-63 khiếu nại vẫn xếp **Could** ở `02` §10.3, trong khi `05` §8.5 nay đã có **quy trình khiếu nại đầy đủ** kèm sequenceDiagram và cam kết công khai. ⚠️ **MT-08 vẫn mở** |
| **EP-10 Curate** | UC-65 nhập curate thủ công · UC-66 gắn nhãn nguồn · UC-67 mời organizer nhận listing · UC-68 organizer nhận quyền sở hữu | Chiến lược ra mắt, không phải tính năng phụ |
| **EP-11 Quản trị** | UC-70 quản lý khu vực & loại hình · UC-73 quản lý người dùng & phân quyền · UC-76 giám sát sức khoẻ hệ thống | **UC-73 đã tách đôi** (D-08): `admin` tìm user / xem lịch sử / đình chỉ; `user.role.assign` **chỉ `super_admin`**. UC-71 analytics sản phẩm = Should; UC-72 analytics organizer = Could ⚠️ (MT-06 vẫn mở) |

### 3.3 Won't trong GĐ1 — đã thiết kế trước

`UC-14` xác minh danh tính bằng giấy tờ · `UC-36` gợi ý cá nhân hoá · `UC-56` → `UC-59` toàn bộ EP-08 nhu cầu ad-hoc.

`02` §11 nay ghi rõ **những gì đã chừa chỗ trong thiết kế nhưng không kích hoạt ở GĐ1**: ad-hoc UC-56 → UC-59, nhà ở UC-201 → UC-208 (GĐ2), y tế UC-301 → UC-306 (GĐ3). Chừa chỗ nghĩa là lược đồ và enum không phải migrate phá vỡ khi bật — **không** có endpoint, **không** có UI, **không** có giá trị enum chết trong DB.

> **Kiểm chứng độ phủ:** `10-ux-luong-man-hinh-va-i18n.md` §15 xác nhận từng use case `Must` đều có ít nhất một màn hình chịu trách nhiệm; UC-40 có `M-26` (Waitlist status) và `W-20`. ⚠️ Câu kết luận của `10` §15 vẫn ghi con số cũ **44** — cần sửa thành **45** (xem MT-19).

### 3.4 Bốn thứ **không được cắt** dù bị áp lực tiến độ

Rút từ `02` §10.4. Cắt bốn thứ này không tiết kiệm được gì vì phải làm lại từ đầu, và ba trong bốn là nghĩa vụ pháp lý.

| Hạng mục | Nếu cắt thì phải làm lại từ đâu |
|---|---|
| Tách `events` / `event_occurrences`, RSVP gắn vào occurrence (`BR-05`) | Viết lại toàn bộ module RSVP, waitlist, nhắc lịch, check-in — **25–35 ngày-người** |
| `trust_signals` append-only + thang T0–T5 (`BR-03`) | Mất toàn bộ lịch sử tín hiệu; không tái dựng được bậc trong quá khứ |
| `curated_sources` + `claim_tokens` (`BR-18`) | Không chứng minh được nguồn gốc nội dung mồi — rủi ro pháp lý không vá sau được |
| `audit_logs` bất biến (`BR-25`) + `consent_records` (`BR-30`) | Không tái tạo được bằng chứng đồng ý đã thu thập. **CẦN LUẬT SƯ XÁC NHẬN** |

### 3.5 Điều kiện ra mắt — definition of launch-ready (L1 → L7)

MVP chỉ được coi là sẵn sàng khi **cả bảy** điều kiện đạt trên staging với dữ liệu thật (`02` §10.5). Bảng này là bản rút gọn của checklist chi tiết ở `08` §12.

| # | Điều kiện | Cách kiểm |
|---|---|---|
| **L1** | 45 UC `Must` đã xong và qua test tích hợp | Bảng `02` §10.2 tick đủ |
| **L2** | Vòng lặp cốt lõi chạy hết trong một phiên: đăng ký → onboarding → tìm → RSVP → nhắc → check-in | Kịch bản E2E trên **cả** web và mobile |
| **L3** | Waitlist đúng dưới tải: 1 chỗ trống / 20 người chờ → **đúng 1** lời mời | Test tải theo tiêu chí `02` §8.15 |
| **L4** | Đủ nội dung mồi: **≥ 25 sự kiện đang mở mỗi tuần** và **không khu vực MVP nào bằng 0** | Truy vấn kiểm tra dòng chảy theo gate M6 |
| **L5** | Đội kiểm duyệt trực được 24/7 cho mức `critical` với **SLA 2 giờ** | Diễn tập xử lý case giả |
| **L6** | Mọi biểu mẫu thu thập dữ liệu cá nhân nêu đủ **Nghị định 13/2023/NĐ-CP và Luật 91/2025/QH15** | Rà soát theo `BR-30`. **CẦN LUẬT SƯ XÁC NHẬN** |
| **L7** | **Sign in with Apple** hoạt động và đứng ngang hàng Google/Facebook trên iOS | Kiểm trên thiết bị thật trước khi nộp store |

---

## 4. Kiến trúc & tech stack đã chốt

*Rút gọn từ `docs/analysis/03-domain-va-du-lieu.md` và `docs/analysis/04-tech-stack-va-kien-truc.md`.*

### 4.1 Sơ đồ kiến trúc

```mermaid
flowchart TB
    subgraph clients["Lớp client"]
        MOB["Mobile · Expo 54 · RN 0.81<br/>iOS + Android"]
        WEB["Web · Next.js 15 App Router · React 19<br/>SSR trang sự kiện công khai"]
        ADM["Admin Curation Console<br/>route group trong Next.js"]
    end

    subgraph edge["Lớp biên"]
        CDN["CDN · POP tại Việt Nam"]
        LB["Nginx · TLS · reverse proxy<br/>sticky cho WebSocket"]
    end

    subgraph app["Lớp ứng dụng · Docker Compose"]
        API["NestJS 11 API<br/>REST /api/v1 · OpenAPI"]
        WS["Socket.IO gateway<br/>Redis adapter"]
        WRK["BullMQ workers<br/>push · email · ảnh · digest"]
        SCH["Scheduler<br/>nhắc lịch · tính trust score"]
    end

    subgraph data["Lớp dữ liệu — đặt tại Việt Nam"]
        PG[("PostgreSQL 16 + PostGIS 3.4")]
        PGR[("Read replica · bật từ mốc B")]
        RED[("Redis 7.4<br/>cache · queue · pub/sub · rate limit")]
        OBJ[("S3-compatible object storage")]
    end

    subgraph ext["SaaS nước ngoài — danh sách tối thiểu, đầu vào cho hồ sơ TIA"]
        PUSH["Expo Push → APNs + FCM"]
        OIDC["Google · Apple · Facebook OIDC"]
        OTP["OTP gateway · VN + quốc tế"]
        MAIL["Transactional email"]
        TILE["Map tiles · OSM / MapTiler"]
        SEN["Sentry"]
    end

    MOB --> LB
    WEB --> LB
    ADM --> LB
    MOB --> CDN
    WEB --> CDN
    MOB --> TILE
    WEB --> TILE
    CDN -->|"origin pull"| OBJ

    LB --> API
    LB -->|"upgrade WebSocket"| WS

    API --> PG
    API --> PGR
    API --> RED
    API -->|"presigned URL"| OBJ
    API --> OIDC
    API --> OTP
    WS --> RED
    WRK --> RED
    WRK --> PG
    WRK --> PUSH
    WRK --> MAIL
    SCH --> RED
    API --> SEN
    PG -.->|"streaming replication"| PGR

    HUMAN["👤 Content Curator<br/>đọc bằng mắt, gõ tay"] --> ADM
    SRC["Facebook · Meetup · WhatsApp · Luma"] --> HUMAN
    BOT["🤖 Scraper / crawler"] -.->|"CẤM TUYỆT ĐỐI"| app

    style BOT fill:#ffe5e5,stroke:#d63a3a,stroke-dasharray: 5 5
    style HUMAN fill:#fff4d6,stroke:#c99a2e
    style data fill:#e8f4ff,stroke:#3b82f6
```

### 4.2 Bảng tech stack chốt

| Lớp | Công nghệ | Phiên bản | Lý do một dòng |
|---|---|---|---|
| Runtime | Node.js | 22.x LTS | LTS tới 04/2027 |
| Backend | NestJS | 11.x | Module + DI + Swagger sinh OpenAPI làm nguồn sinh typed client |
| ORM | TypeORM | 0.3.2x | DataSource API, migration CLI, chạy raw SQL khi cần PostGIS |
| CSDL | PostgreSQL | 16.x | Nguồn sự thật duy nhất |
| Địa lý | PostGIS | 3.4.x | `geography(Point,4326)` + GIST, `ST_DWithin` tính bằng mét |
| Cache / queue | Redis | 7.4.x | Cache, rate limit, pub/sub socket, backend BullMQ |
| Job queue | BullMQ | 5.x | Push, resize ảnh, email, digest, tính trust score |
| Realtime | Socket.IO | 4.8.x | `@socket.io/redis-adapter` để scale ngang |
| Web | Next.js + React | 15.x / 19.x | App Router, RSC, SEO cho trang sự kiện công khai |
| CSS | Tailwind CSS | 4.x | Design token chia sẻ qua `@theme` |
| Mobile | Expo + React Native | 54 / 0.81 | Một codebase, EAS Build/Submit, OTA update |
| Điều hướng mobile | Expo Router | 6.x | File-based routing, universal link gọn |
| Bản đồ web | Leaflet + react-leaflet | 1.9.x / 5.x | Nhẹ, tile đổi nhà cung cấp được |
| Bản đồ mobile | react-native-maps | 1.2x | Native map, cluster tốt |
| Xác thực | JWT RS256 + refresh xoay vòng | — | Access 15 phút, refresh 30 ngày, phát hiện tái sử dụng → thu hồi cả `family_id` |
| Social login | Google, Apple, Facebook | — | **Apple Sign-In bắt buộc trên iOS** khi có social login khác |
| Push | Expo Push → APNs/FCM | — | Một API cho cả hai nền tảng |
| Lưu trữ | S3-compatible + CDN có POP tại VN | — | Presigned upload, ảnh không đi qua API |
| Đóng gói | Docker + Docker Compose | 27.x / v2 | Không Kubernetes ở GĐ1 |
| CI/CD | GitHub Actions + EAS | — | Lint/test/build/migrate/deploy |
| Theo dõi lỗi | Sentry | SDK 9.x | `beforeSend` scrub PII bắt buộc |
| Monorepo | pnpm workspace + Turborepo | pnpm 10.x / turbo 2.x | **`node-linker=hoisted` bắt buộc** để Metro chạy được |

**Monorepo:** `apps/api` (`@dnc/api`) · `apps/web` (`@dnc/web`) · `apps/mobile` (`@dnc/mobile`) · `packages/shared-types` · `packages/api-client` · `packages/i18n` · `packages/config` · `packages/ui` · `packages/validation` · `ops/` (runbook, hồ sơ pháp lý, migration script).

### 4.3 Ba quyết định kiến trúc lớn nhất

1. **Monolith module hoá, không microservices.** Một đội nhỏ, một miền nghiệp vụ. Ranh giới module vẽ đủ sạch (`import/no-restricted-paths` chặn ở ESLint) để tách sau nếu cần.
2. **Hosting trọng tâm tại Việt Nam.** Toàn bộ dữ liệu cá nhân và nghiệp vụ (Postgres, Redis, object storage, sao lưu, log) đặt tại hạ tầng trong nước có hoá đơn VAT Việt Nam. Lý do chính không phải giá mà là **phương sai độ trễ khi đứt cáp quang biển** (RTT Singapore 30–55 ms bình thường → 120–300 ms khi sự cố) và nghĩa vụ lưu trữ dữ liệu trong nước.
3. **Xác thực SĐT dùng định tuyến lai theo mã quốc gia.** Số `+84` qua nhà cung cấp Việt Nam (rẻ 3–5 lần), số quốc tế qua nhà cung cấp toàn cầu. Cộng đồng expat có cả hai loại.

### 4.4 Domain model — 12 quyết định dữ liệu

| # | Quyết định | Lựa chọn |
|---|---|---|
| D-01 | Khoá chính | `uuid` (UUIDv7 sinh ở tầng ứng dụng) |
| D-02 | Tách `Event` / `EventOccurrence` | **Bắt buộc**, kể cả sự kiện một lần. RSVP gắn vào **occurrence** ⚠️ (xem MT-03) |
| D-03 | Vị trí | `geography(Point,4326)` + index GIST |
| D-04 | Khu vực | Bảng `areas` phân cấp city → district → ward → micro_area, gán `area_id` lúc ghi |
| D-05 | Tìm kiếm | Postgres FTS (`tsvector`) + `unaccent` + `pg_trgm` |
| D-06 | Trạng thái | Native PostgreSQL `ENUM` cho state machine đóng, `varchar` + CHECK cho taxonomy còn biến động |
| D-07 | Ngôn ngữ nội dung | 1 bản theo `content_locale` + bảng `event_translations` phụ; từ vựng hệ thống dùng `name_en`/`name_vi` |
| D-08 | Thời gian | `timestamptz`, lưu UTC, connection ép `timezone = 'UTC'`, IANA zone lưu riêng |
| D-09 | Xoá | 3 tầng: `status` (ẩn) → `deleted_at` (soft delete) → anonymize/hard delete theo lịch |
| D-10 | Đếm | Cột phi chuẩn hoá (`rsvp_going_count`…) do trigger DB duy trì + job đối soát hằng đêm |
| D-11 | Curate thủ công | `curated_sources` + `curation_tasks` là công dân hạng nhất trong schema |
| D-12 | Không thu thập tự động | `collection_method` mặc định `manual_only`, có ràng buộc CHECK — **chặn từ gốc ở tầng dữ liệu** |

**Bounded context:** Identity & Trust · Geo · Events · Attendance · Community & Safety · Messaging · Notifications · Curation & Ops.

### 4.5 SLO Giai đoạn 1

Khả dụng 99,5%/tháng · p95 API đọc < 300 ms · p95 tạo RSVP < 500 ms · push tới thiết bị < 30 giây · crash-free session ≥ 99,5%.

---

## 5. Roadmap & milestone

*Rút gọn từ `docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md`.*

> ✅ **Số sprint đã chốt (giải MT-01).** `08` §6.1 nay ghi rõ: **13 sprint được lập lịch, trong đó đúng 11 sprint (S0 → S10) nằm trước mốc ra mắt M6.** S11 và S12 là hai sprint **sau** ra mắt (ổn định + khám phá GĐ2) và **không chứa story nào** của backlog MVP 563 SP. Con số "6 sprint" trong yêu cầu tổng hợp ban đầu là hiểu nhầm: 6 sprint (S0 → S5) chỉ đủ tới M4.
>
> **Ba con số cần thuộc:** backlog **563 SP** · sức chứa nền của đội 5,5 FTE chỉ **545 SP** trên 11 sprint · vì thế **bắt buộc thuê 1 Backend hợp đồng toàn thời gian 10 tuần (05/10 → 11/12/2026, tức S2 → S6, +70 SP, 150 triệu VND)**. Nhánh backend gánh ≈ 289 SP trong khi sức chứa backend nội bộ chỉ 242 SP — thiếu ≈ 47 SP, tất cả nằm gọn trong S2 → S6. Đệm còn lại **52 SP (9%)**, thấp hơn mức 15% mà `08` §1 nêu; phần thiếu được hấp thụ bằng 33 SP đệm ở S7/S8, 20 SP đệm ở S10 và **danh sách 44 SP được phép cắt không cần họp** (`08` §6.16).
>
> Bảng §5.1 dưới đây trình bày 6 sprint xây dựng lõi (S0 → S5, đủ M0 → M4), §5.2 liệt kê phần còn lại tới ra mắt. **Bản có hiệu lực để lập kế hoạch tuần là `08` §6 (bản san tải cuối cùng), không phải §5 của `08`.**

### 5.1 Sáu sprint xây dựng lõi

| Sprint | Thời gian | Trọng tâm | Đầu ra nghiệm thu | Mốc chạm |
|---|---|---|---|---|
| **S0 · Nền móng** | 07/09 → 18/09/2026 | Monorepo pnpm + Turborepo, Docker Compose (Postgres 16 + PostGIS + Redis), khung NestJS 11, khung Next.js 15, dev build Expo trên máy thật, CI GitHub Actions, deploy staging tự động, Sentry, khung i18n | `docker compose up` chạy trong 5 phút; CI xanh; `GET /health` trả 200 từ tên miền staging | **M0 · 18/09** |
| **S1 · Auth & Hồ sơ** | 21/09 → 02/10/2026 | Đăng ký email + xác minh, JWT RS256 + refresh xoay vòng có phát hiện tái sử dụng, Google/Apple/Facebook Sign-In, RBAC guard, hồ sơ cá nhân, màn đăng nhập web + mobile, secure storage | Đăng ký/đăng nhập end-to-end trên web và mobile; test luồng phát hiện tái sử dụng token; RBAC chặn đúng | **M1 · 02/10** |
| **S2 · Sự kiện lõi** | 05/10 → 16/10/2026 | Data model sự kiện + PostGIS + seed khu vực Đà Nẵng, API tạo/sửa/huỷ, upload ảnh qua presigned URL + CDN, form tạo nhiều bước trên web, trang chi tiết sự kiện, hồ sơ công khai organizer | Tạo được sự kiện từ web; ảnh phục vụ qua CDN; trang chi tiết có SEO/OG | |
| **S3 · Khám phá & Bản đồ** | 19/10 → 30/10/2026 | API search/filter + cursor pagination + facet count, truy vấn bán kính `ST_DWithin`, trang khám phá web, feed + bottom sheet lọc trên mobile, bản đồ gom cụm, sự kiện lặp lại, tạo sự kiện trên mobile < 90 giây, Admin Console khung | Lọc theo loại hình/khu vực/thời gian/ngôn ngữ cho kết quả đúng; p95 `GET /events` < 200 ms với 10.000 sự kiện giả lập | **M2 · 30/10** |
| **S4 · RSVP & Thông báo** | 02/11 → 13/11/2026 | RSVP có sức chứa + waitlist + `SELECT … FOR UPDATE`, BullMQ + worker + retry, Expo Push, email giao dịch, Socket.IO đếm chỗ realtime, nhắc lịch T‑24h và T‑2h, chuyển chế độ danh sách ↔ bản đồ | 200 request RSVP đồng thời vào sự kiện 50 chỗ → đúng 50 `going`, phần còn lại `waitlisted`; push tới thiết bị thật | **M3 · 13/11** |
| **S5 · Trust & Safety** | 16/11 → 27/11/2026 | Report + block, hàng đợi kiểm duyệt theo mức nghiêm trọng, gỡ nội dung & đình chỉ có audit log, trust score v1, xác minh SĐT bằng OTP, Community Guidelines + Privacy Policy công bố, trung tâm thông báo, tuỳ chọn thông báo | Toàn bộ tài liệu pháp lý EN + VI đã qua luật sư và đã công bố; điểm tin cậy hiển thị trên hồ sơ | **M4 · 27/11** |

### 5.2 Năm sprint còn lại tới ra mắt

| Sprint | Thời gian | Trọng tâm | Mốc |
|---|---|---|---|
| S6 · Sẵn sàng beta | 30/11 → 11/12/2026 | Admin Curation Console đầy đủ, luồng organizer nhận quyền listing, QR check-in, xuất dữ liệu / xoá tài khoản, EAS production build, nộp TestFlight + Play closed testing | |
| S7 · Vận hành beta | 14/12 → 25/12/2026 | Beta wave 1 (40 user) → wave 2 (60 user), phỏng vấn 15 user, hotfix hằng ngày | **M5 · 25/12** |
| — | 28/12/2026 → 01/01/2027 | **Đóng băng cuối năm** — chỉ trực sự cố | |
| S8 · Sửa lỗi beta | 04/01 → 15/01/2027 | Lỗi P0/P1, tinh chỉnh onboarding, tối ưu danh sách/bản đồ, giảm rớt phễu RSVP, bản dịch tiếng Việt do người bản ngữ viết | |
| S9 · Chuẩn bị ra mắt | 18/01 → 29/01/2027 | Analytics funnel, SEO, referral link, release candidate, tài sản cửa hàng, diễn tập runbook | |
| — | 01/02 → 12/02/2027 | **Đóng băng Tết Đinh Mùi** (mùng 1 rơi vào 06/02/2027) — chỉ trực sự cố P0 | |
| S10 · Ra mắt | 15/02 → 26/02/2027 | Nộp store review, soft launch nội bộ, hồi quy đầy đủ, ra mắt công khai, war-room | **M6 · 25/02**, sự kiện ra mắt 27–28/02 |

### 5.3 Bảng milestone

| Mốc | Tên | Ngày chốt | Sprint | Gate nghiệm thu |
|---|---|---|---|---|
| **M0** | Setup hạ tầng | **18/09/2026** | S0 | Staging chạy; CI xanh; dev build cài được trên iOS + Android thật |
| **M1** | API nền + Auth | **02/10/2026** | S1 | Auth end-to-end web + mobile; refresh rotation có test; RBAC chặn đúng |
| **M2** | Tạo & khám phá sự kiện | **30/10/2026** | S2–S3 | Tạo từ web và mobile; lọc 4 trục hoạt động; bản đồ đúng khu vực; SEO/OG |
| **M3** | **RSVP + Waitlist + Thông báo** | **13/11/2026** | S4 | RSVP/huỷ/**waitlist** đúng khi tranh chấp chỗ (200 request đồng thời vào 50 chỗ → đúng 50 `going`); push thiết bị thật; nhắc **T‑24h và T‑2h** (D-21) |
| **M4** | Trust & Safety tối thiểu | **27/11/2026** | S5 | Report/block/kiểm duyệt/ban; Guidelines + Privacy đã công bố; trust score hiển thị |
| **M5** | Beta kín 100 user | **25/12/2026** | S6–S7 | 100 tài khoản beta thật; ≥ 60 sự kiện curate; TestFlight + Play closed testing 14 ngày; crash-free ≥ 99% |
| **M6** | Ra mắt công khai | **25/02/2027** | S9–S10 | App trên cả hai cửa hàng; web production; ✅ **gate đo bằng DÒNG CHẢY** (D-24, `08` §7.8): **≥ 25 sự kiện đang mở mỗi tuần** trung bình 4 tuần 25/01 – 21/02/2027, **không tuần nào < 20**, và **6/6 khu vực MVP** đều ≥ 1 sự kiện mỗi tuần; **WCA 220–280 lượt/tuần** (D-23); ≥ 8 organizer tự quản lý listing; tỷ lệ tự phục vụ ≥ 35%; crash-free ≥ 99,5%; runbook **đã diễn tập thật** |

> **Ba mốc phụ mới xuất hiện ở `08` §7.1** vì M2 được nghiệm thu theo **ba nấc**, không phải một lần: **M2** 30/10 (web) · **M2+** 13/11 (feed khám phá mobile) · **M2++** 27/11 (tạo sự kiện trên mobile). Đây là cảnh báo đường găng của `08` §6.7 — đừng coi M2 là "xong sự kiện".
>
> **M1 không được trượt.** `08` §7.3 gọi đây là mắt xích đường găng cứng nhất phía kỹ thuật: toàn bộ E3, E4, E6 đều chờ nó. Phương án khẩn nếu chậm: cắt E2-S5 (Facebook login) và E2-S6 (đặt lại mật khẩu) sang S2. M0 được phép trượt tối đa **3 ngày làm việc**.
>
> **Bốn tiêu chí nghiệm thu M1 chốt cứng quy ước dữ liệu** (`08` §7.3): `users.role` đúng **5 giá trị** kiểm bằng test đọc `pg_enum`; guard RBAC chặn đúng (`member` gọi endpoint `moderator` → 403); `users.trust_level` smallint 0–5 mặc định 0 và bảng `trust_signals` append-only đã có; sổ đăng ký hoạt động xử lý dữ liệu cá nhân đã mở với ≥ 3 mục. M2 thêm: **`events.host_user_id`** đúng tên, `grep "creator_id\|organizer_id"` phải **rỗng**; mỗi `events` sinh **tối thiểu 1 `event_occurrences`** kể cả sự kiện không lặp; bộ lọc phơi đúng **6 khu vực MVP**.

### 5.4 Phân bổ story point theo epic

| Epic | Tên | SP | Mốc |
|---|---|---:|---|
| E1 | Nền tảng & Hạ tầng | 54 | M0 |
| E2 | Định danh & Xác thực | 53 | M1 |
| E3 | Hồ sơ cá nhân & Tín hiệu tin cậy | 42 | M1 / M4 |
| E4 | Quản lý sự kiện | 84 | M2 |
| E5 | Khám phá & Tìm kiếm hyperlocal | 83 | M2 |
| E6 | RSVP & Điểm danh | 55 | M3 |
| E7 | Thông báo & Realtime | 57 | M3 |
| E8 | Trust & Safety | 39 | M4 |
| E9 | Admin & Curation Console | 34 | M2 → M5 |
| E10 | i18n & Nội dung | 11 | xuyên suốt |
| E11 | Analytics & Tăng trưởng | 25 | M5 / M6 |
| E12 | Phát hành ứng dụng di động | 26 | M5 / M6 |
| | **Tổng** | **563** | |

### 5.5 Ba việc chặn phải khởi động ngay tuần đầu

| Việc | Thời gian chờ | Nếu trễ |
|---|---|---|
| Tài khoản Apple Developer (tổ chức) + mã D‑U‑N‑S | **2–4 tuần** | Trượt M5, không có TestFlight |
| Tài khoản Google Play Console (tổ chức) + closed testing 14 ngày liên tục | 14 ngày bắt buộc | Trượt M5 |
| Ký hợp đồng luật sư CNTT/dữ liệu | 2–3 tuần | Khoá cứng thiết kế luồng auth ở S1 |

### 5.6 Kịch bản tinh gọn — nếu chỉ có 2 lập trình viên

`08` §10 nay có bảng cắt scope chi tiết theo ba nhóm A/B/C. Đây là **lời giải bằng số** cho [CH-06], không còn là lời hứa suông.

| Kịch bản cắt | Backlog còn lại | Số sprint *(28 SP/sprint)* | Ngày M6 khả thi |
|---|---:|---:|---|
| Không cắt gì | 563 SP | 21 sprint | ~22/07/2027 — **không khả thi về tiền** |
| Chỉ cắt nhóm A | 466 SP | 17 sprint | ~27/05/2027 |
| **Cắt A + B** | **359 SP** | **13 sprint** | **~01/04/2027** ✅ *(khuyến nghị dứt khoát của `08` §10.3)* |
| Cắt A + B + C | 327 SP | 12 sprint | ~18/03/2027 — sản phẩm đã bị moi ruột |

**Vì sao không cố ép về 25/02/2027:** kể cả cắt cả nhóm C cũng chỉ về được 18/03/2027, và tới lúc đó đã mất danh sách người tham gia, mất truy vấn bán kính và mất thông báo tiếng Việt — tức mất đúng những thứ tạo cảm giác an toàn và cảm giác "chỗ này dành cho mình". **Năm tuần chậm rẻ hơn rất nhiều so với một lần ra mắt hỏng, vì không có lần ra mắt thứ hai với cùng một người.**

| | Kịch bản đủ đội | Kịch bản tinh gọn |
|---|---|---|
| Nhân sự | 5,5 FTE (đỉnh 6,5 FTE khi có BE hợp đồng) | 2 dev + Founder kiêm PO/Community |
| Velocity | 50–69 SP/sprint | **28 SP/sprint** |
| Backlog | 563 SP | 359 SP (đã cắt A + B) |
| Số sprint tới M6 | 11 (S0 → S10) | 13 (L0 → L12) |
| Ngày M6 | **25/02/2027** | **~01/04/2027** |
| Ngân sách 7 tháng | ≈ **2,04 tỷ VND ≈ 78.462 USD** | ≈ **0,91 tỷ VND ≈ 35.000 USD** |
| Bus factor | 2–3 | **1** — RK-09 chuyển sang đỏ đậm |

**Không bao giờ cắt, kể cả kịch bản tinh gọn:** tách `event_occurrences` · `trust_signals` append-only · `curated_sources` + `claim_tokens` · `audit_logs` bất biến · `consent_records` · Report/Block/Contact us · Sign in with Apple · xoá tài khoản + xuất dữ liệu · tư vấn pháp lý M0 và ToS/Privacy M4.

---

## 6. Top 10 rủi ro và cách xử lý

*Hợp nhất từ `docs/analysis/09-canh-tranh-va-rui-ro.md` (RK-xx, cấp doanh nghiệp) và `docs/analysis/04` (R1–R12, kỹ thuật).*

| # | Mã | Rủi ro | Điểm | Chủ sở hữu | Biện pháp chính | Dấu hiệu sớm |
|---|---|---|:--:|---|---|---|
| 1 | **RK-01** | **Cold-start hai phía** — không đủ sự kiện thì không có người dùng; không có người dùng thì organizer không đăng. Cung vốn chỉ chiếm ~6% bài đăng | 🔴 20 | Founder + Community Manager | Curate là hạng mục sprint có Definition of Done, không phải việc làm thêm · **sàn cứng: không bao giờ dưới 20 sự kiện đang mở trong một tuần** trải đều **6 khu vực MVP**, cảnh báo tự động *(đây là chỉ tiêu dòng chảy theo D-24, không phải tồn kho tích luỹ)* · 2 sự kiện signature/tuần do đội đứng tên · nạp 60 sự kiện **trước khi mời một người lạ nào** · mời organizer bằng số liệu của chính họ | Sự kiện đang mở < 20 trong 2 tuần liên tiếp; bất kỳ khu vực MVP nào = 0 trong 7 ngày; `search_zero_result_rate` > 15% |
| 2 | **RK-07 / L-01** | **Pháp lý** — yêu cầu xác thực tài khoản bằng **số điện thoại di động Việt Nam** theo NĐ 147/2024 xung đột trực tiếp với tệp người dùng expat; thêm giấy phép mạng xã hội, DPIA/TIA, bản đồ chủ quyền | 🔴 20 | Founder + Luật sư | Hỏi luật sư **trước khi code luồng đăng ký** · kiến trúc adapter tách rời cho OTP · cờ `FEATURE_PHONE_OTP_REQUIRED` đổi chính sách không cần deploy · mặc định chọn phương án hạn chế hơn | Luật sư chưa có kết luận bằng văn bản sau Sprint 3 |
| 3 | **RK-06** | **Churn địa lý** — phân khúc seed (nomad) thay máu 6–10 lần/năm; kết bạn rồi người ta rời đi | 🔴 20 | Product | Tách chỉ số `retention_in_city` (loại cohort `left_city`) khỏi retention thô — **không kết luận thất bại trước khi loại cohort này** · onboarding hỏi `arrival_date` + `planned_stay_length` · hồ sơ ngủ đông thay vì xoá khi rời thành phố · badge "Community Passer" khi giới thiệu người thay thế | Retention thô giảm mà `retention_in_city` không giảm |
| 4 | **RK-04** | **CAC cao hơn khả năng chi trả** | 🔴 16 | Founder | Không mua user trong 6 tuần đầu — quảng cáo che mất tín hiệu sản phẩm có tự nhiên hấp dẫn hay không · đo CAC biên theo `channel_code` · ngưỡng đỏ 600k VND/user | CAC biên vượt 400k VND |
| 5 | **RK-09** | **Đội ngũ mỏng** — Founder giữ 5/7 vai, bus factor = 1 | 🔴 16 | Founder | ADR bắt buộc cho mọi quyết định kiến trúc · runbook viết trước M5 · luân phiên trực · tuyển Community Manager 0.5 FTE sớm | Chỉ một người deploy được |
| 6 | **RK-05** | **Tính mùa vụ** — mùa mưa T10–T12, Tết, mùa du lịch cao điểm | 🟠 15 | Community Manager | **Không ra quyết định xoay trục trong tháng 12/2026 và tháng 02/2027** · so sánh với sự kiện trong nhà để loại yếu tố thời tiết · đóng băng phát triển đã tính vào lịch | Nhầm sụt giảm mùa vụ thành thất bại sản phẩm |
| 7 | **RK-11** | **Hết runway trước khi đạt tín hiệu** | 🟠 15 | Founder | Giữ đủ 20 ngày dự phòng cho quy trình quyết định xoay trục ở mỗi cửa sổ · ngưỡng đóng dự án SD-1 viết trước · kịch bản tinh gọn 0,91 tỷ VND sẵn sàng kích hoạt | Runway < 5 tháng tại cửa sổ 3 |
| 8 | **R6 / L-03** | **Bản đồ hiển thị sai chủ quyền Việt Nam** (thiếu Hoàng Sa/Trường Sa) — Leaflet + tile bên thứ ba | 🟠 15 | Tech Lead | **Kiểm thử vùng Biển Đông là gate phát hành bắt buộc, mỗi lần** · ảnh chụp có ngày tháng lưu ở `ops/legal/map-audit/` · giới hạn `maxBounds` trong phạm vi Đà Nẵng · sẵn phương án tự host tile | Chưa ai kiểm tra tới tuần trước ra mắt |
| 9 | **R2 / R5** | **Kỹ thuật:** tranh chấp chỗ RSVP làm vượt sức chứa; và **gian lận cước SMS** (SMS pumping) làm hoá đơn tăng gấp mười trong một đêm | 🟠 12–16 | Backend + Tech Lead | RSVP: `SELECT … FOR UPDATE` + ràng buộc CHECK ở DB + test tải 200 request đồng thời trong CI · SMS: `OTP_ALLOWED_COUNTRY_CODES`, `OTP_DAILY_SPEND_LIMIT_USD`, CAPTCHA khi vượt ngưỡng, cảnh báo chi tiêu phía nhà cung cấp | Test tranh chấp bị bỏ qua khi vội; tỷ lệ yêu cầu OTP tăng đột biến kèm tỷ lệ xác minh thành công giảm |
| 10 | **RK-08 / RK-15** | **Sự cố an toàn khi gặp mặt ngoài đời** trong một cộng đồng nhỏ truyền miệng cực nhanh | 🟠 10–12 | Community Ops + Founder | An toàn là tính năng MVP, không phải backlog · **số điện thoại không bao giờ hiển thị công khai** · fail closed cho rủi ro thân thể (nghi ngờ nguy hiểm → ẩn trước, xem xét sau) · người ra quyết định ≠ người xử lý khiếu nại từ ngày đầu · Điều 7 & 8 của ToS + Event Safety Disclaimer | Một report `critical` vượt SLA |

**Ba cửa sổ ra quyết định lớn** (không quyết ngoài ba thời điểm này): cuối Tuần 6 — **19/10/2026**; cuối M5 — **25/12/2026**; M6 + 8 tuần — **22/04/2027**.

**Phương án xoay trục đã xếp hạng:** PV-1 thu hẹp địa lý còn 2 khu vực (**luôn thử đầu tiên**, chi phí gần 0) → PV-2 công cụ vận hành cho organizer (B2B nhỏ, dùng lại 80% backend) → PV-3 đổi phân khúc → PV-5 sản phẩm truyền thông (digest + SEO) → PV-6 mở thành phố thứ hai. **PV-4 nhảy sớm sang Giai đoạn 2 (Nhà ở) bị gắn nhãn không khuyến nghị trong mọi kịch bản thất bại.**

---

## 7. Mảng pháp lý — tạm gác, chưa xong

> ⚠️ **Ghi chú trạng thái — 01/09/2026.** Chủ dự án quyết định **chưa làm mảng pháp lý ở giai đoạn này** để dồn nguồn lực cho MVP, và tài liệu phân tích pháp lý đã được gỡ khỏi bộ tài liệu. Mục này giữ lại **để không mất dấu một rủi ro có thật**: đây là việc đã hoãn, không phải việc đã xong.

**Ranh giới của quyết định hoãn.** Không đầu việc nào dưới đây chặn giai đoạn dựng MVP. Nhưng tất cả **phải hoàn tất trước khi ra mắt công khai** — tức trước khi mở đăng ký cho người dùng thật và trước khi nộp app lên hai cửa hàng.

| # | Việc còn nợ | Vì sao không bỏ được |
|---|---|---|
| 1 | **Đăng ký pháp nhân** | Tài khoản Apple Developer và Google Play Console dạng tổ chức, hợp đồng nhà cung cấp và tài khoản thanh toán đều đòi có pháp nhân — đây là việc có thời gian chờ dài |
| 2 | **Terms of Service + Privacy Policy song ngữ EN/VI** | Cả hai cửa hàng đều bắt buộc có URL chính sách quyền riêng tư công khai trước khi duyệt; ToS còn là lá chắn trách nhiệm cho sự kiện gặp mặt ngoài đời |
| 3 | **Xoá tài khoản ngay trong app + xuất dữ liệu** | Yêu cầu bắt buộc của App Store và Google Play. Thiếu là **bị từ chối duyệt**, không phải góp ý |
| 4 | **Ngưỡng giấy phép mạng xã hội** | Ngưỡng chính xác chưa được xác nhận (xem **MT-14**). Thủ tục có thời gian chờ dài nên phải khởi động **trước** khi chạm ngưỡng, không xử lý sau |
| 5 | **Một vòng rà soát của người có chuyên môn pháp lý** | Bốn mục trên đều cần xác nhận từ ngoài đội. Tài liệu này **không phải ý kiến pháp lý** |

**Khi mở lại mảng này, ba việc phải làm:** (1) chốt thời điểm bắt đầu — đề xuất chậm nhất là lúc khởi động beta kín; (2) dựng lại tài liệu phân tích pháp lý đã gỡ; (3) mở lại **MT-04** và **MT-14** ở [§12](#12-mâu-thuẫn-cần-giải-quyết), hiện đang ở trạng thái *tạm gác*.

---

## 8. Decision log

Danh sách quyết định **đã chốt** qua 9 tài liệu phân tích. Một quyết định đã ghi ở đây chỉ được đảo ngược bằng một quyết định mới ghi rõ điều gì đã thay đổi, ai quyết và ngày nào — không sửa dòng cũ.

### 8.1 Phạm vi & sản phẩm

| # | Quyết định | Nguồn |
|---|---|---|
| **QĐ-01** | Giai đoạn 1 **chỉ** làm kết nối cộng đồng (sự kiện, thể thao, trao đổi ngôn ngữ). Nhà ở là GĐ2, y tế/dịch vụ chuyên môn là GĐ3 | brief, `01`, `02` |
| **QĐ-02** | Phạm vi địa lý **chỉ Đà Nẵng**. Không xây đa thành phố, nhưng data model có `city_id` để không phải migrate đau đớn | `08` A8 |
| **QĐ-03** | **Không xử lý tiền giữa hai người dùng ở GĐ1.** Trường `price` chỉ là thông tin hiển thị; organizer tự thu ngoài ứng dụng | `02` G4, `05` R-01 |
| **QĐ-04** | **Tuyệt đối không scraping.** Mọi nội dung mồi đến từ curate thủ công có ghi nguồn. Chặn từ gốc bằng `collection_method = manual_only` + ràng buộc CHECK | brief, `03` D-12, ADR-0019 |
| **QĐ-05** | **Ngôn ngữ UI mặc định là tiếng Anh**, tiếng Việt là ngôn ngữ thứ hai. i18n từ commit đầu tiên, ESLint chặn literal string trong JSX | `04` NT6, `10` Q-10 |
| **QĐ-06** | Thời gian lưu UTC (`timestamptz`), hiển thị theo `Asia/Ho_Chi_Minh`, kèm cảnh báo khi thiết bị lệch múi giờ | `03` D-08, `10` Q-08 |
| **QĐ-07** | **North Star Metric = Weekly Confirmed Attendances (WCA)** | `07` §1.3 |
| **QĐ-08** | ~~Bốn khu vực MVP~~ → **ĐÃ ĐẢO NGƯỢC bởi QĐ-58 ngày 31/08/2026**: chốt **6 khu vực MVP** — An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn. Giữ dòng này để truy vết, không dùng để seed | `07` §5.3 (bản cũ) → `01` D-18, `07` T3, `08` M2-4 |

### 8.2 Kiến trúc & kỹ thuật

| # | Quyết định | Nguồn |
|---|---|---|
| **QĐ-09** | **Monolith module hoá**, không microservices ở GĐ1 | ADR-0001 |
| **QĐ-10** | **PostgreSQL 16 + PostGIS** là nguồn sự thật duy nhất | ADR-0002 |
| **QĐ-11** | NestJS 11 trên Node.js 22 LTS, **Express adapter** (không Fastify) | ADR-0003 |
| **QĐ-12** | pnpm workspace + Turborepo, **`node-linker=hoisted`** bắt buộc cho Metro | ADR-0004 |
| **QĐ-13** | Envelope response + danh mục mã lỗi tập trung; **phân trang cursor có chữ ký, không dùng OFFSET** | ADR-0006, ADR-0007 |
| **QĐ-14** | **JWT RS256 + refresh token xoay vòng** có phát hiện tái sử dụng (access 15 phút, refresh 30 ngày). Mobile lưu ở SecureStore, web dùng BFF với cookie `httpOnly` | ADR-0008, ADR-0009 |
| **QĐ-15** | **Định tuyến OTP lai theo mã quốc gia** — chấp thuận nhưng **phụ thuộc kết luận pháp lý** | ADR-0010 |
| **QĐ-16** | Socket.IO cho realtime, Expo Push cho thông báo nền; **Universal Link / App Link là cơ chế deep link duy nhất** | ADR-0011, ADR-0012 |
| **QĐ-17** | Leaflet ở web, `react-native-maps` ở mobile; tile phải đổi được nhà cung cấp | ADR-0013 |
| **QĐ-18** | **Ảnh đi thẳng lên object storage bằng presigned URL, strip EXIF.** Ảnh không bao giờ đi qua API | ADR-0014, `04` NT4 |
| **QĐ-19** | **Docker Compose thay vì Kubernetes** ở GĐ1 | ADR-0015 |
| **QĐ-20** | Migration **expand–contract**, `synchronize: false` ở **mọi** môi trường kể cả dev | ADR-0016, `03` §3.2 |
| **QĐ-21** | **Hosting trọng tâm tại Việt Nam** (phương án lai có kiểm soát), danh sách SaaS nước ngoài tối thiểu và liệt kê tường minh làm đầu vào TIA | ADR-0017, `04` §14.4 |
| **QĐ-22** | **Không dùng NativeWind**; chia sẻ design token thay vì chia sẻ class | ADR-0018 |
| **QĐ-23** | Toàn bộ file test nằm **ngoài** `src/`, phản chiếu cây thư mục nguồn | ADR-0020 |
| **QĐ-24** | Khoá chính là **UUIDv7** sinh ở tầng ứng dụng; mọi UNIQUE là partial index `WHERE deleted_at IS NULL` | `03` D-01, §3.3 |
| **QĐ-25** | Xoá theo **3 tầng**: `status` (ẩn) → `deleted_at` (soft delete) → anonymize/hard delete theo lịch | `03` D-09 |

### 8.3 Trust, an toàn & vận hành

| # | Quyết định | Nguồn |
|---|---|---|
| **QĐ-26** | **Tạo hoạt động gần như không ma sát** — bất kỳ member nào cũng tạo được, không có "đơn xin làm organizer" | `01` P1, `02` G1 |
| **QĐ-27** | **Độ tin cậy thay cho kiểm duyệt trước.** Mặc định publish ngay; kiểm duyệt là hậu kiểm. Chỉ tài khoản trust thấp mới vào hàng đợi duyệt | `01` P2 |
| **QĐ-28** | **Số điện thoại và email KHÔNG BAO GIỜ hiển thị công khai** cho người dùng khác | `05` §1 |
| **QĐ-29** | **Không bao giờ hiển thị điểm tin cậy dạng số trần trụi** — chỉ hiển thị nhãn + bằng chứng cụ thể | `05` §5.3 |
| **QĐ-30** | **Ma sát tỷ lệ thuận với rủi ro** — không KYC ở bước đăng ký, nhưng có yêu cầu xác thực cao hơn khi tạo sự kiện lớn/thu phí | `05` P1 |
| **QĐ-31** | **Người ra quyết định ≠ người xử lý khiếu nại**, bắt buộc từ ngày đầu kể cả khi đội chỉ có 2 người | `05` P4 |
| **QĐ-32** | **Người báo cáo được bảo vệ tuyệt đối** — danh tính không bao giờ lộ. Hành động kiểm duyệt ký tên "Da Nang Connect Moderation Team", không lộ tên moderator | `05` P7, `01` §7.6 |
| **QĐ-33** | **Fail closed cho rủi ro thân thể, fail open cho rủi ro nội dung** | `05` P9 |
| **QĐ-34** | Moderator **không được** xử lý report liên quan đến chính mình hoặc hoạt động mình tổ chức — hệ thống chặn cứng | `01` §7.6 |
| **QĐ-35** | Nội dung curate **luôn dán nhãn rõ ràng**, không bao giờ đăng dưới danh nghĩa organizer gốc; gỡ ngay khi organizer yêu cầu; không copy ảnh có bản quyền cá nhân | `05` P8, `01` §4.1 |
| **QĐ-36** | **Quyền huỷ hoại chỉ nằm ở `super_admin`.** Mọi hành động của moderator/admin/super_admin ghi `audit_log` **bất biến** | `01` P5 |

### 8.4 UX

| # | Quyết định | Nguồn |
|---|---|---|
| **QĐ-37** | **Guest-first** — khách chưa đăng nhập xem được feed, chi tiết sự kiện, bản đồ, hồ sơ công khai. Chỉ chặn ở hành động tạo cam kết | `10` Q-01 |
| **QĐ-38** | **Onboarding đặt sau hành động**, không đặt trước. Lưu `pending_intent`, phát lại sau khi đăng nhập | `10` Q-02 |
| **QĐ-39** | Bộ lọc thời gian là công dân hạng nhất: hàng chip đầu tiên luôn là `Tonight · Tomorrow · This weekend · Next 7 days` | `10` Q-03 |
| **QĐ-40** | **Bản đồ là chế độ xem thứ hai, không phải mặc định.** Lazy import bundle bản đồ | `10` Q-04 |
| **QĐ-41** | **Trạng thái phải là số, không phải tính từ** — `7 of 20 spots left`, `4 people waiting`, không dùng "sắp hết chỗ" | `10` Q-05, N-4 |
| **QĐ-42** | **RSVP tối đa 2 chạm** với người đã đăng nhập | `10` Q-06 |
| **QĐ-43** | **Giảm ma sát theo tier, không chặn theo tier** — người tier thấp vẫn thấy hành động và thấy rõ đường mở khoá | `10` N-7 |
| **QĐ-44** | Form tạo sự kiện **tự lưu nháp mỗi 5 giây** và khi rời màn hình. Ngân sách 90 giây để tạo sự kiện trên mobile | `10` N-6, `01` §7.3 |
| **QĐ-45** | **Empty state là tính năng, không phải trạng thái lỗi** — mỗi màn hình có ≥ 2 biến thể với CTA có ích | `10` Q-09 |

### 8.5 Pháp lý & vận hành công ty

| # | Quyết định | Nguồn |
|---|---|---|
| **QĐ-46** | Loại hình pháp nhân là **Công ty TNHH**, không đi đường vòng qua hộ kinh doanh (điều kiện cấp phép mạng xã hội yêu cầu tổ chức có trụ sở, bộ phận quản lý nội dung, tên miền `.vn`, máy chủ tại Việt Nam) | *nguồn: tài liệu pháp lý đã gỡ* |
| **QĐ-47** | Chấp nhận sản phẩm **là dịch vụ mạng xã hội** theo NĐ 147/2024 và làm thủ tục Thông báo trước ngày ra mắt | *nguồn: tài liệu pháp lý đã gỡ* |
| **QĐ-48** | **Không mua user trong 6 tuần đầu.** Không quảng cáo trả tiền — quảng cáo che mất tín hiệu sản phẩm có tự nhiên hấp dẫn hay không | `07` §5.5 |
| **QĐ-49** | **Mọi RSVP đi qua app**, không có ngoại lệ kể cả với bạn bè | `07` §5.5 |
| **QĐ-50** | **Không mở phân khúc thứ hai và không mở khu vực thứ hai** trước khi chạm mốc 100 seed user | `07` §5.5 |
| **QĐ-51** | Ngưỡng thất bại được viết **trước** ngày 07/09/2026 và **không được sửa sau khi biết kết quả** | `09` N1 |
| **QĐ-52** | **PV-4 (nhảy sớm sang Giai đoạn 2 Nhà ở) bị loại** khỏi mọi kịch bản phản ứng với thất bại | `09` §8.4 |
| **QĐ-53** | Tỷ giá quy đổi thống nhất toàn bộ tài liệu: **1 USD = 26.000 VND** | `08` A6, `04` G1 |

### 8.6 Quyết định chốt ngày 31/08/2026 — bản 1.1

Đây là **lời giải chính thức** cho 12 trong 15 mâu thuẫn của bản 1.0. Nguồn có thẩm quyền là `01` §15 (D-01 → D-29), được `02`, `03`, `05`, `07`, `08` áp dụng đồng loạt. **Ràng buộc, không phải đề xuất** — mọi tài liệu, migration và PR sau 31/08/2026 phải tuân theo.

**Phân quyền và danh tính**

| # | Quyết định | Giải | Nguồn |
|---|---|---|---|
| **QĐ-54** | `users.role` là **enum đúng 5 giá trị** `member` / `curator` / `moderator` / `admin` / `super_admin`. Không có giá trị nào khác, không có giá trị dự trữ | **MT-02** | `01` D-01, §8.1 |
| **QĐ-55** | `guest` là **trạng thái phiên**, không phải giá trị DB · `organizer` là **quan hệ theo sự kiện** (`events.host_user_id` + `event_cohosts`) · `verified_member` là **trust level** · `support` **gộp vào `moderator`** · `service_provider` **không** vào enum ở GĐ1 | **MT-02** | `01` D-02 → D-06 |
| **QĐ-56** | Thứ tự đánh giá quyền **bất biến**: trạng thái → role → quan hệ → trust. Cả sáu lớp guard đăng ký ở `APP_GUARD` theo đúng thứ tự; hai guard cuối no-op khi thiếu metadata. Bộ tên chuẩn: `JwtAuthGuard`, `AccountStatusGuard`, `RolesGuard`, `EventOwnershipGuard`, `TrustTierGuard`, `@Roles()`, `@MinTrust()`, `@EventContext()`, `@RequireEventRole()` | **MT-02** | `01` D-07, §13.1, §15.7 |
| **QĐ-57** | Số `super_admin` đang `active` **luôn ≥ 2**; **chỉ `super_admin`** gán/thu hồi được role, cơ chế four-eyes. UC-73 **tách đôi**: `admin` tìm user / xem lịch sử / đình chỉ · `user.role.assign` chỉ `super_admin` | **MT-02** | `01` D-08, §12.12 |
| **QĐ-58** | Thang tin cậy **duy nhất** là **T0–T5**, lưu ở `users.trust_level smallint CHECK (0..5)`. Nhãn cố định: **T0 New · T1 Email verified · T2 Phone verified · T3 Active member · T4 Trusted · T5 Community leader**. Xoá mọi thang 0–100 và enum `new`/`verified`/`established`/`trusted`/`ambassador` khỏi tài liệu và code | **MT-12** | `01` D-09, D-10 |
| **QĐ-59** | Tín hiệu lưu ở **`trust_signals` append-only**; bậc do **job BullMQ `trust:recompute`** tính lại và đó là **nơi duy nhất** ghi `users.trust_level`. **T5 không bao giờ tự động hoàn toàn** — luôn cần `staff_endorsement` thủ công của `admin`. **Badge là lớp hiển thị, không cấp quyền**; không badge nào mang nghĩa tiêu cực; `no_show`, số lần bị báo cáo, điểm thành phần **không hiển thị công khai** | **MT-12** | `01` D-11 → D-14 |

**Mô hình dữ liệu và phạm vi**

| # | Quyết định | Giải | Nguồn |
|---|---|---|---|
| **QĐ-60** | **RSVP gắn vào `event_occurrences`**, không gắn vào `events`. Bảng `rsvps(id, occurrence_id, user_id, status, guest_count, …)`. **Sự kiện không lặp lại vẫn có đúng 1 occurrence** — không có ngoại lệ | **MT-03** | `01` D-15, `03` §6.1 |
| **QĐ-61** | Endpoint chính **`POST /api/v1/occurrences/{occurrenceId}/rsvps`**. `POST /api/v1/events/{eventId}/rsvps` là **đường tắt** trỏ tới occurrence sắp diễn ra gần nhất, trả **409 `AMBIGUOUS_OCCURRENCE`** nếu event có nhiều occurrence sắp tới | **MT-03** | `01` D-16, `02` §12 |
| **QĐ-62** | **Waitlist là MUST của MVP** — UC-40 chuyển từ `Should` lên `Must`. FIFO theo `queued_at`, cửa sổ xác nhận **12 giờ** (rút còn 30 phút khi occurrence sắp bắt đầu); huỷ RSVP kích hoạt thăng hạng **ngay** | **MT-05** | `01` D-17, `02` §10.2 |
| **QĐ-63** | **6 khu vực MVP**: An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn. `areas.is_mvp_filter = true` cho đúng 6 hàng, **không xoá, không ẩn được**; đổi polygon cần xác nhận hai bước. *(Đảo ngược QĐ-08)* | **MT-11** | `01` D-18, `03` §7.1, `07` T3 |
| **QĐ-64** | Tên cột chốt là **`events.host_user_id`** — cấm `creator_id` và `organizer_id`. Mọi nhãn enum trong DB viết **chữ thường snake_case** (`published`, `checked_in`, `no_show`). Có test regex quét `pg_enum` chặn nhãn viết hoa/camelCase | **MT-15 (c)** | `01` D-19, `08` M2-3, DoD-8 |
| **QĐ-65** | Quy ước viết `area_slug` là **kebab-case** (`an-thuong`, `my-khe`) vì đây là URL slug, **không** phải giá trị enum DB. Tên event tracking và tên thuộc tính luôn **snake_case** | quy ước | `07` §11.2 |

**Vận hành và đo lường**

| # | Quyết định | Giải | Nguồn |
|---|---|---|---|
| **QĐ-66** | Nhắc lịch đúng **hai mốc: T‑24h và T‑2h**. Thay đổi trọng yếu ⇒ huỷ và đặt lại job; nhắc **T‑2h không bị chặn** bởi khung giờ yên tĩnh | **MT-15 (a)** | `01` D-21, `02` UC-52 |
| **QĐ-67** | **SLA báo cáo mức `critical` là 2 giờ**, tính 24/7 (`high` 12 giờ · `normal` 48 giờ). Cảnh báo `critical` phải đẩy vào kênh trực, không chỉ nằm trong hàng đợi. Đây là lý do `moderator` **bắt buộc 2FA** | **MT-15 (b)** | `01` D-22, `02` BR-19, `05` §7.3 |
| **QĐ-68** | Mục tiêu **WCA tại M6 là 220–280 lượt/tuần** (ngưỡng đỏ < 110). **Không** dùng con số 550 ở bất kỳ tài liệu hay báo cáo nào trong cửa sổ 6 tháng | **MT-10** | `01` D-23, `08` M6-3 |
| **QĐ-69** | Gate M6 đo bằng **DÒNG CHẢY, không đo TỒN KHO**: **≥ 25 sự kiện đang mở mỗi tuần** (trung bình 4 tuần 25/01 – 21/02/2027, không tuần nào < 20) và **6/6 khu vực MVP** đều ≥ 1 sự kiện mỗi tuần. **Không** dùng chỉ tiêu "≥ 80 sự kiện". Trượt M6-1 hoặc M6-2 ⇒ **không ra mắt đúng hạn**, lùi 2–4 tuần | **MT-09** | `01` D-24, `08` §7.8 |
| **QĐ-70** | Hàng đợi waitlist hiện thực bằng `rsvps.status = 'waitlisted'` + `position` + `promotion_expires_at` theo `02` §9.1 — ⚠️ **`03` §6.2 lại thiết kế bảng sổ cái `waitlist_entries` riêng. Chưa hợp nhất — xem MT-20** | *(một phần)* | `02` §9.1 vs `03` §6.2 |
| **QĐ-71** | **13 sprint được lập lịch, đúng 11 sprint (S0 → S10) trước M6**; S11–S12 là sau ra mắt. Bản có hiệu lực để lập kế hoạch tuần là **`08` §6 (bản san tải)**, không phải `08` §5. Bắt buộc **1 Backend hợp đồng 10 tuần (S2 → S6, +70 SP, 150 triệu VND)** | **MT-01** | `08` §6.1 |
| **QĐ-72** | Mọi con số GTM **trước 13/11/2026 là số tiền-app** và phải ghi rõ giai đoạn đo (P‑A tiền-app · P‑B RSVP live · P‑C beta kín · P‑D công khai). Hai hệ đánh số mốc **không được lẫn**: `M1`–`M6` là **tháng GTM**, `KT‑M0`–`KT‑M6` là **mốc kỹ thuật** của `08` | **MT-07** | `07` §12.1, §10.2 |

**Pháp lý**

| # | Quyết định | Giải | Nguồn |
|---|---|---|---|
| **QĐ-73** | Nêu **cả** Nghị định 13/2023/NĐ-CP **và** Luật Bảo vệ dữ liệu cá nhân **91/2025/QH15** trong mọi tài liệu tuân thủ; ghi rõ **từ 01/01/2026 Luật 91/2025 là văn bản hiệu lực cao hơn** và **mọi mẫu biểu phải theo Luật 91/2025**. **CẦN LUẬT SƯ XÁC NHẬN** | **MT-04** | `01` D-27, `02` PL-01 |
| **QĐ-74** | Quyền `user.anonymize`, `content.purge` và mọi thao tác thực thi quyền của chủ thể dữ liệu **chỉ nằm ở `super_admin`**. **CẦN LUẬT SƯ XÁC NHẬN** | — | `01` D-28 |
| **QĐ-75** | Moderator tình nguyện ngoài tổ chức (từ M4) **chưa được chạm PII** cho tới khi có thoả thuận xử lý dữ liệu theo Luật 91/2025; hàng đợi kiểm duyệt cho tình nguyện viên **che PII mặc định**. **CẦN LUẬT SƯ XÁC NHẬN** | — | `01` D-29 |
| **QĐ-76** | Mọi hành động của `curator`/`moderator`/`admin`/`super_admin` trên dữ liệu người khác ghi **`audit_log` bất biến**; truy cập PII **bắt buộc kèm** `moderation_case_id` hoặc `support_ticket_id`. DB role ứng dụng bị thu hồi `UPDATE`/`DELETE` trên `audit_log` (bất biến INV-2, có test). Không tạo bảng audit thứ hai cho kiểm duyệt — `moderation_audit_log` chỉ là **view** `v_moderation_audit_log` lọc trên `audit_logs` | — | `01` D-25, `05` §13 |

---

## 9. Câu hỏi còn mở cần chủ dự án trả lời

Mỗi câu ghi rõ **ảnh hưởng nếu trả lời khác nhau** và **deadline cần chốt**. Câu 🔴 là câu khoá cứng thiết kế — trả lời sai hoặc trả lời muộn đều tốn kém.

> ✅ **Cập nhật bản 1.1 — 8 trong 16 câu đã có câu trả lời chốt.** Bảng đầy đủ giữ nguyên bên dưới để truy vết lập luận; bảng này ghi câu trả lời đã chốt.
>
> | Câu | Đã chốt phương án nào | Quyết định |
> |---|---|---|
> | **CH-02** | *(A)* Enum 5 giá trị `member`/`curator`/`moderator`/`admin`/`super_admin`; organizer là ngữ cảnh | QĐ-54, QĐ-55 |
> | **CH-03** | Không chọn A cũng không chọn B — chốt **thang T0–T5 duy nhất** với điều kiện đạt bậc bằng bằng chứng, `trust_signals` append-only + job `trust:recompute` | QĐ-58, QĐ-59 |
> | **CH-04** | *(A)* **Occurrence.** Endpoint chính theo `occurrenceId`; đường tắt theo `eventId` trả 409 `AMBIGUOUS_OCCURRENCE` | QĐ-60, QĐ-61 |
> | **CH-07** | *(A)* **Waitlist là `Must`** | QĐ-62 |
> | **CH-09** | *(B)* **SLA `critical` = 2 giờ** — cam kết công khai ở `05` đã sửa theo | QĐ-67 |
> | **CH-10** | **T‑2h** (cùng T‑24h) | QĐ-66 |
> | **CH-12** | *(B)* **Hiệu chỉnh về 220–280 WCA/tuần** ở M6 | QĐ-68 |
> | **CH-13** | *(B)* **Dòng chảy** — ≥ 25 sự kiện đang mở/tuần, không khu vực nào bằng 0 | QĐ-69 |
>
> **Tám câu còn mở:** CH-01 🔴 (xác thực SĐT theo NĐ 147/2024) · CH-05 🔴 (ngưỡng giấy phép mạng xã hội) · CH-06 🔴 (kịch bản ngân sách — nay đã có bảng số ở [§5.6](#56-kịch-bản-tinh-gọn--nếu-chỉ-có-2-lập-trình-viên)) · CH-08 🟡 (analytics organizer) · CH-11 🟡 (UC-14 xác minh giấy tờ) · CH-14 🟢 · CH-15 🟢 · CH-16 🟢. **Thêm 12 câu hỏi phân quyền Q-01 → Q-12** ở `01` §14.4 và **14 câu Q-01 → Q-14** ở `02` §13 — cả hai đều có người quyết và hạn riêng, cần gộp vào lịch quyết định của Founder.

| # | Câu hỏi | Nếu trả lời A | Nếu trả lời B | Deadline | Ai quyết |
|---|---|---|---|---|---|
| **CH-01** 🔴 | **Xác thực số điện thoại Việt Nam:** nghĩa vụ theo NĐ 147/2024 áp dụng cho mọi tài khoản hay chỉ tài khoản đăng nội dung công khai? Số nước ngoài đã xác minh OTP có được chấp nhận? | *Chỉ tài khoản đăng nội dung* → phân tầng: guest và người chỉ RSVP không cần SĐT VN. Giữ nguyên phễu onboarding, CAC thấp | *Mọi tài khoản* → **phải cắt bỏ phần lớn tệp expat không có số VN**, hoặc buộc dùng số định danh cá nhân. Conversion sụt mạnh, có thể phải đổi mô hình sản phẩm | **21/09/2026** (trước Sprint 1) | Founder + Luật sư |
| **CH-02** 🔴 | **Chốt tập role hệ thống nào?** Bốn tài liệu định nghĩa bốn tập khác nhau | *Enum tối giản của `03`* (`member`/`curator`/`moderator`/`admin`/`super_admin`, organizer là ngữ cảnh) → migration đơn giản, guard gọn | *Tập đầy đủ của `01`* (thêm `verified_member`, `support`, `organizer` là bậc tài khoản) → RBAC phức tạp hơn, nhưng khớp persona P4 (organization profile) | **14/09/2026** (trước Sprint 0 kết thúc) | Tech Lead + PO |
| **CH-03** 🔴 | **Chốt một mô hình trust score duy nhất.** Hiện có **ba** thang điểm mâu thuẫn ở `03`, `05` và `08` | *Mô hình `05` (T1–T5 + 5 thành phần)* → giàu ngữ nghĩa, gắn với rate limit theo tier, nhưng nặng để triển khai ở M4 | *Mô hình `08` E3-S3 (9 tín hiệu cộng/trừ)* → làm được trong 8 SP, nhưng không đủ để lái rate limit theo tier | **02/10/2026** (trước Sprint 2) | Tech Lead + PO |
| **CH-04** 🔴 | **RSVP gắn vào `Event` hay `EventOccurrence`?** `03` D-02 bắt buộc tách; `08` E6 và mọi endpoint trong `02`/`04` lại dùng `POST /events/:id/rsvp` | *Occurrence* → sự kiện lặp lại đúng ngay từ đầu, nhưng API phức tạp hơn và phải sửa toàn bộ endpoint đã đặc tả | *Event phẳng* → API đơn giản, nhưng UC-24 (chuỗi lặp lại) phải làm lại schema ở GĐ2 — nợ kỹ thuật đắt | **05/10/2026** (trước Sprint 2, là quyết định migration) | Tech Lead |
| **CH-05** 🔴 | **Ngưỡng chuyển từ Thông báo sang Giấy phép mạng xã hội là bao nhiêu?** tài liệu pháp lý (nay đã gỡ) ghi ~10.000 lượt/tháng; `09` ghi > 1.000 người dùng thường xuyên/tháng — lệch 10 lần | *10.000* → chạm ngưỡng sau M6 6–12 tháng, khởi động hồ sơ giấy phép ở M6 | *1.000* → **chạm ngưỡng trước cả mục tiêu MAU M6 (700–820)**, phải khởi động hồ sơ giấy phép ngay ở M4 (11/2026) và dự phòng 40–120 triệu VND sớm hơn | **30/09/2026** | Founder + Luật sư |
| **CH-06** 🔴 | **Ngân sách: kịch bản đủ đội (2,04 tỷ) hay tinh gọn (0,91 tỷ)?** | *Đủ đội (5,5 FTE)* → giữ được lịch 11 sprint, ra mắt 25/02/2027 | *Tinh gọn (2 dev + Founder)* → velocity 24–28 SP/sprint thay vì 55, **kéo dài 2–4 sprint**, ra mắt trượt sang 04–05/2027, và bus factor = 1 (RK-09 thành đỏ đậm) | **07/09/2026** (ngày khởi động) | Founder |
| **CH-07** 🟡 | **Waitlist là Must hay Should?** Brief liệt kê waitlist trong MVP; `02` xếp UC-40 là **Should** | *Must* → +4 ngày-người ở S4, nhưng giữ đúng lời hứa với persona P3 (Tom) — waitlist tự đôn là lý do anh ta bỏ Facebook | *Should* → tiết kiệm S4, nhưng sự kiện hết chỗ trở thành ngõ cụt, giảm giá trị RSVP | **02/11/2026** (đầu Sprint 4) | PO |
| **CH-08** 🟡 | **Analytics cho organizer là MVP hay không?** `01` §7.4 nói "là tính năng MVP, không để GĐ sau"; `02` xếp UC-72 là **Could** | *MVP* → giữ được persona P4 (Linh, business) — nhóm duy nhất sẵn sàng trả phí sau này | *Could* → tiết kiệm ~4 ngày-người, nhưng mất nhóm organizer chuyên nghiệp, tức mất nguồn cung ổn định nhất | **30/11/2026** (đầu Sprint 6) | PO |
| **CH-09** 🟡 | **SLA cho report `critical` là 1 giờ hay 2 giờ?** `05` cam kết công khai 1 giờ; `01` và `08` đều ghi 2 giờ | *1 giờ* → cần người trực 24/7 hoặc luân phiên chặt, chi phí vận hành cao hơn nhiều với đội 5,5 FTE | *2 giờ* → khả thi với đội hiện tại, nhưng **phải sửa cam kết công khai** trước khi công bố trang Safety | **27/11/2026** (M4, trước khi công bố Guidelines) | Founder + Community Manager |
| **CH-10** 🟡 | **Nhắc lịch trước sự kiện: T‑2h hay T‑3h?** `01` và `07` ghi T‑3h; `02`, `08`, `10` ghi T‑2h | Chênh lệch nhỏ về kỹ thuật, nhưng **ảnh hưởng trực tiếp tỷ lệ no-show** — chỉ số đầu vào của trust score | Phải chọn một và ghi vào `notification_preferences`, template i18n và job BullMQ | **02/11/2026** (Sprint 4) | PO |
| **CH-11** 🟡 | **Xác minh danh tính bằng giấy tờ (UC-14): Won't ở GĐ1, nhưng `03` có `id_document +25` và `05` yêu cầu KYC khi tạo sự kiện thu phí 100 người. Chốt thế nào?** | *Giữ Won't hoàn toàn* → phải bỏ `id_document` khỏi bảng trọng số và bỏ điều kiện KYC trong `05` P1; trust ceiling thấp hơn | *Làm phiên bản thủ công tối thiểu* (admin duyệt tay, không tự động) → +9 ngày-người nhưng giữ được ma sát-theo-rủi-ro | **16/11/2026** (Sprint 5) | PO + Tech Lead |
| **CH-12** 🟡 | **Mục tiêu WCA ở M6: giữ 550 hay hiệu chỉnh về 220–280?** `09` §7.1 chứng minh 550 đòi hỏi 7,5 RSVP/tháng/người có hoạt động — mức hợp lý chỉ 2–4 | *Giữ 550* → cần ~2.050 MAU, gấp 2,5 lần SOM M6; mục tiêu không đạt được sẽ làm hỏng niềm tin nội bộ và với nhà đầu tư | *Hiệu chỉnh 220–280* → giữ tham vọng ở đúng chỗ đo được; **khuyến nghị chọn phương án này** | **19/10/2026** (cửa sổ quyết định 1) | Founder |
| **CH-13** 🟡 | **Gate M6 dùng chỉ tiêu tồn kho (≥ 80 sự kiện tích luỹ) hay dòng chảy (≥ 25 sự kiện đang mở/tuần)?** | *Tồn kho* → đạt được bằng cách nạp dồn một lần, không chứng minh sản phẩm sống | *Dòng chảy* → khó hơn nhưng là chỉ số thật; **khuyến nghị chọn phương án này** | **25/12/2026** (M5) | Founder + Community Manager |
| **CH-14** 🟢 | **Tab thứ hai trên mobile nên là Map hay Saved?** | *Map* → củng cố định vị hyperlocal | *Saved* → nếu dưới 15% phiên mở tab Map trong 4 tuần đầu, đổi và đưa Map thành chế độ xem của Discover | **Sau 4 tuần beta (22/01/2027)** | PO |
| **CH-15** 🟢 | **Có hiển thị sự kiện đã đầy trong feed mặc định không?** | *Có* → người dùng biết đường vào waitlist | *Không* → feed sạch hơn, nhưng giấu mất tín hiệu "chỗ này đông" | **Sau 6 tuần beta** | PO |
| **CH-16** 🟢 | **Ngưỡng nào để tự động mở rộng sang khu vực lân cận khi feed trống?** Đề xuất tạm: 3 km đường chim bay hoặc chung ranh giới quận | Quá hẹp → empty state xuất hiện nhiều, phá ấn tượng đầu tiên (UX-R1) | Quá rộng → mất định vị hyperlocal, đẩy người dùng tới sự kiện cách 15 km (anti-goal của persona P1) | **Sprint 3 (30/10/2026)** | PO + Tech Lead |

---

## 10. Việc cần làm ngay: 01/09 → 14/09/2026

Hai tuần này quyết định việc có kịp mốc M0 (18/09) hay không. **Ba việc có thời gian chờ dài (Apple D‑U‑N‑S, luật sư, thành lập công ty) phải khởi động trong ngày đầu tiên, không phải tuần thứ hai.**

### Tuần 1 — 01/09 → 07/09/2026 (Tuần 0 vận hành, chưa có sprint kỹ thuật)

#### Pháp lý & pháp nhân — *Founder*
- [ ] **01/09** Khởi động thủ tục thành lập **Công ty TNHH** qua đơn vị dịch vụ, với đủ mã ngành *(bằng chứng: hồ sơ đã nộp)*
- [ ] **01/09** Bắt đầu chọn và **ký hợp đồng luật sư CNTT/dữ liệu** — ưu tiên hãng đã từng làm hồ sơ giấy phép mạng xã hội *(hạn hoàn tất: 21/09)*
- [ ] **02/09** Đăng ký **tên miền `.vn`** và tên miền quốc tế — *Tech Lead*
- [ ] **02/09** Mở **tài khoản Apple Developer (tổ chức) + đăng ký mã D‑U‑N‑S** — ⏱️ thời gian chờ 2–4 tuần, đây là việc chặn M5
- [ ] **02/09** Mở **tài khoản Google Play Console (tổ chức)** — ⏱️ 14 ngày

#### Quyết định khoá cứng — *Founder + Tech Lead*
- [ ] **03/09** Chốt **[CH-06] kịch bản ngân sách và quy mô đội** (đủ đội 5,5 FTE hay tinh gọn 2 dev) — mọi việc còn lại phụ thuộc câu này
- [ ] **04/09** Chốt **ADR data residency** (hosting trong nước) và ghi vào `docs/adr/` — *Tech Lead*
- [ ] **05/09** Chốt và **đóng băng bảng ngưỡng thất bại** ở `docs/analysis/09` §8.2 — theo nguyên tắc N1, sau ngày 07/09 mọi thay đổi ngưỡng phải ghi lại lý do và người quyết

#### Vận hành cộng đồng — *Founder + Community Manager*
- [ ] **01–02/09** **Khảo sát thực địa** toàn cụm An Thượng – Mỹ An, ghi nhận 20 địa điểm kèm tên người quyết định và số liên lạc *(đầu ra: bảng 20 địa điểm)*
- [ ] **01–05/09** **Dựng curation board và thu thập 60 sự kiện thật** trải trong 3 tuần tới. ⚠️ App chưa tồn tại — làm trên bảng tính/Notion theo đúng cấu trúc trường của `curated_sources`, để nhập thẳng vào Admin Console khi có (xem MT-07)
- [ ] **03/09** ~~Chốt 4 `area_slug`~~ → ✅ **đã chốt 6 khu vực MVP** (QĐ-63): `an-thuong`, `my-khe`, `my-an`, `hai-chau`, `son-tra`, `ngu-hanh-son` — **kebab-case** vì là URL slug (QĐ-65). Việc còn lại: **vẽ ranh giới thực tế của cả 6 khu vực trên bản đồ** và để Product ký duyệt trước khi seed bảng `areas`
- [ ] **04/09** Thiết kế & in POSM: 20 standee A5, 200 thẻ A6, 15 poster A3 — **mỗi địa điểm một `channel_code` riêng**
- [ ] **06/09** Chốt lịch 8 tuần sự kiện signature, giờ cố định không đổi
- [ ] **07/09** Chụp lại số thành viên 6 nhóm Facebook + 4 nhóm Telegram làm mốc gốc *(nâng độ tin cậy dữ liệu thị trường từ `C` lên `B`)*

> **Nguyên tắc Tuần 0 (bắt buộc):** không mời một người lạ nào. *Một người mở app thấy trống là một người mất vĩnh viễn.*

### Tuần 2 — 08/09 → 14/09/2026 (Sprint 0 tuần 1, khởi động 07/09)

#### Kỹ thuật — Sprint 0
- [ ] **E1-S1** Dựng **monorepo pnpm + Turborepo** với `node-linker=hoisted`, chuẩn lint/format thống nhất — *Tech Lead* · 5 SP
- [ ] **E1-S2** `docker-compose.yml` với `postgis/postgis:16-3.4` + `redis:7-alpine`, script bật extension `postgis`/`pgcrypto`/`citext`/`unaccent`/`pg_trgm`, healthcheck, `.env.example` — *Tech Lead* · 5 SP · **DoD: người thứ hai chạy được trong 5 phút theo README**
- [ ] **E1-S3** Khung **NestJS 11** với config theo môi trường validate bằng Zod + `GET /health/live` và `/health/ready` — *Backend* · 5 SP
- [ ] **E1-S4** **TypeORM DataSource** với `SnakeNamingStrategy`, `synchronize: false`, khung migration + seed — *Backend* · 5 SP
- [ ] **E1-S5** Khung **Next.js 15 App Router** + Tailwind 4 + design token — *Frontend* · 5 SP
- [ ] **E1-S6** Khung **Expo 54 + RN 0.81** + Expo Router, **dev build cài được lên máy iOS và Android thật** — *Mobile* · 8 SP
- [ ] **E1-S10 / E10-S1** Khung `packages/i18n` với 14 file namespace, `en` đầy đủ, `vi` là bản sao chờ dịch; ESLint chặn literal string trong JSX — *Frontend* · 5+3 SP
- [ ] **E12-S1** Ba profile EAS Build (`development`, `preview`, `production`) + versioning tự động — *Mobile* · 5 SP
- [ ] Tạo thư mục `ops/legal/` với cấu trúc hồ sơ, và `ops/legal/drafts/` cho bản nháp ToS/Privacy — *Tech Lead*
- [ ] Cấu hình **secret scanning (`gitleaks`)**, TLS, phân tách môi trường trong CI — *Tech Lead*

#### Vận hành cộng đồng — Tuần 1 seed
- [ ] Gặp trực tiếp community manager của **6 coworking**, mục tiêu ký miệng ≥ 4 — *Founder + CM*
- [ ] Gia nhập 6 nhóm Telegram/WhatsApp, **chỉ quan sát, chưa đăng gì** — *Community Manager*
- [ ] Trả lời 25 câu hỏi trên nhóm Facebook theo chiến thuật answer-first, tỷ lệ đóng góp/quảng bá 10:1 — *Community Manager*
- [ ] Tổ chức `Language Exchange` số 1 (≥ 15 người) và `Newcomers Coffee` số 1 (≥ 8 người) — ⚠️ RSVP thu thủ công vì app chưa có, ghi lại để nhập sau — *Community Manager*

#### Thiết kế — chuẩn bị cho Sprint 1
- [ ] Dựng `packages/ui/tokens.ts` từ `docs/analysis/10` §12 và cắm vào Tailwind 4 `@theme` — *Designer + FE* · **hạn: trước Sprint S1 (21/09)**

#### Quyết định cần chốt trong tuần
- [ ] ~~**14/09** Chốt [CH-02] tập role hệ thống~~ → ✅ **đã chốt 31/08/2026** (QĐ-54 → QĐ-57). Việc còn lại: dựng **`PERMISSION_MATRIX` máy đọc được** ở `packages/shared-types` từ `01` §9.2, cùng bộ test `describe.each` T-1 → T-5 — *Tech Lead, hạn 21/09*
- [ ] **14/09** Xác nhận với luật sư đã nhận bộ 30 câu hỏi và có lịch trả lời trước 21/09 — chặn **[CH-01]**

### Tổng hợp người chịu trách nhiệm

| Vai | Việc chính trong 2 tuần |
|---|---|
| **Founder / PO** | Pháp nhân, luật sư, tài khoản Apple/Google, chốt CH-06, khảo sát thực địa, quan hệ coworking |
| **Tech Lead** | Monorepo, Docker Compose, CI, ADR data residency, `ops/legal/`, secret scanning |
| **Backend** | Khung NestJS, TypeORM + migration, health check |
| **Frontend** | Khung Next.js + Tailwind, `packages/i18n`, ESLint i18n rule |
| **Mobile** | Khung Expo + Expo Router, dev build trên máy thật, 3 profile EAS |
| **Community Manager** | Curation board 60 sự kiện, POSM + `channel_code`, 6 nhóm Telegram, 25 câu trả lời Facebook, 2 sự kiện signature |
| **Designer (0.5)** | `packages/ui/tokens.ts` trước 21/09 |

---

## 11. Mục lục liên kết tới 9 tài liệu chi tiết

> ✅ **Cập nhật bản 1.1 — MT-13 đã giải.** Cả 9 tài liệu nay **đầy đủ theo đúng mục lục của chính chúng**. Tổng cộng **21.790 dòng** (đã trừ tài liệu pháp lý được gỡ khỏi bộ). Sáu tài liệu được viết tiếp trong đợt này (`01`, `02`, `03`, `05`, `07`, `08`) tăng từ ~4.900 lên **15.295 dòng**. Cột "Trạng thái" ghi phần **mới bổ sung**, không lặp lại phần đã có.

| # | Tài liệu | Dòng | Nội dung chính | Trạng thái |
|---|---|---:|---|---|
| 01 | [`01-tac-nhan-va-phan-quyen.md`](./01-tac-nhan-va-phan-quyen.md) | 2.154 | 5 nguyên tắc phân quyền · bản đồ tác nhân · 4 nhóm actor · 6 persona · ranh giới curate · **§8 hệ thống role (enum 5 giá trị, 3 trục phân quyền)** · **§9 ma trận RBAC 22 quyền × 8 cột + 51 mã điều kiện** · **§10 vòng đời tài khoản** · **§11 trust level T0–T5 & badge** · **§12 mapping role → 76 UC** · **§13 ghi chú triển khai (6 lớp guard, decorator, test ma trận)** · **§14 rủi ro R-01→R-14 + 12 câu hỏi mở** · **§15 quyết định D-01→D-29** | ✅ **Đầy đủ** — bổ sung §12 → §15 |
| 02 | [`02-use-case.md`](./02-use-case.md) | 3.393 | 76 use case / 11 epic · MoSCoW · 13 actor · 10 sơ đồ Mermaid · 30 business rule · **§8 đặc tả đủ 19 use case trọng yếu** · **§9 ma trận truy vết UC → endpoint → màn hình → bảng** · **§10 ranh giới MVP (45 Must / 17 Should / 8 Could / 6 Won't) + L1→L7** · **§11 chừa chỗ GĐ2–3** · **§12 phụ lục endpoint** · **§13 câu hỏi mở Q-01→Q-14, PL-01→PL-10** | ✅ **Đầy đủ** — bổ sung 20 mục |
| 03 | [`03-domain-va-du-lieu.md`](./03-domain-va-du-lieu.md) | 3.231 | 12 quyết định dữ liệu · 8 bounded context · quy ước đặt tên & kiểu · **Nhóm A→G đủ 30 bảng** (`events`, `event_occurrences`, `rsvps`, `waitlist_entries`, `areas`, `reports`, `conversations`, `audit_logs`…) · **§11 ERD đầy đủ** · **§12 state machine** · **§13 DDL SQL mẫu + trigger** · **§14 truy vấn bán kính 1500 m + EXPLAIN** · **§15 FTS tiếng Việt (mục 15.2 đã có)** · **§16 chính sách xoá 3 tầng** · **§17 extension bắt buộc** | ✅ **Đầy đủ** — bổ sung §5 → §17 |
| 04 | [`04-tech-stack-va-kien-truc.md`](./04-tech-stack-va-kien-truc.md) | 2.202 | Bảng chốt stack · 7 nguyên tắc kiến trúc · sơ đồ triển khai & ranh giới module · monorepo · quy ước API · auth · realtime & push · PostGIS · migration · CI/CD · chi phí hạ tầng 3 mốc · hosting · bảo mật · quan sát · 12 rủi ro kỹ thuật · **20 ADR** | ⚠️ Đầy đủ, **cần 2 sửa nhỏ**: `@MinTrustTier()` → `@MinTrust()`, và 3 chỗ `status = 'PUBLISHED'` chữ hoa → chữ thường (xem MT-17) |
| 05 | [`05-trust-safety-va-kiem-duyet.md`](./05-trust-safety-va-kiem-duyet.md) | 2.215 | 10 nguyên tắc T&S · 3 cam kết công khai · 14 loại rủi ro R-01→R-14 · xác thực theo tầng · trust score & quyền hạn · rate limit theo tier · **§7 quy trình báo cáo & hàng đợi (28 mã vi phạm, 4 mức SLA)** · **§8 thang cưỡng chế E1→E6 + khiếu nại** · **§9 đánh giá hai chiều** · **§10 an toàn khi gặp mặt** · **§11 chuẩn đạo đức curate + takedown** · **§12 checklist an toàn sự kiện** · **§13 data model + 3 module NestJS + 9 job BullMQ** · **§14 14 chỉ số MQ-01→MQ-14** · **§15 lộ trình** · **§16 phụ lục** | ✅ **Đầy đủ** — bổ sung §7 → §16 |
| 07 | [`07-go-to-market-da-nang.md`](./07-go-to-market-da-nang.md) | 2.362 | North Star WCA · TAM/SAM/SOM · 5 phân khúc · bản đồ kênh · chiến lược seed 100 user · thư viện tin nhắn mẫu · **§7 playbook curate** · **§8 kịch bản chuyển đổi organizer** · **§9 growth loop + 12 luật chống lạm dụng** · **§10 hệ thống chỉ số (NSM + 20 chỉ số × 6 tháng)** · **§11 54 event tracking + 6 phễu** · **§12 tính mùa vụ, Tết Đinh Mùi, mùa mưa bão + đồng bộ lịch GTM ↔ kỹ thuật** · **§13 ngân sách & 13 công cụ** · **§14 16 rủi ro GR-01→GR-16 + 6 cổng quyết định** · **§15 checklist khảo sát tuần 0** | ✅ **Đầy đủ** — bổ sung §9 → §15 |
| 08 | [`08-roadmap-va-ke-hoach-trien-khai.md`](./08-roadmap-va-ke-hoach-trien-khai.md) | 1.940 | Tóm tắt điều hành · 8 giả định · milestone M0→M6 · Gantt 26 tuần · 12 epic / 563 SP · **§6 sprint S0→S12 (bản san tải + DoD 12 điều + van an toàn 44 SP)** · **§7 tiêu chí nghiệm thu từng mốc** · **§8 đường găng + 22 phụ thuộc chặn** · **§9 cấu trúc đội (5,5 FTE / tinh gọn)** · **§10 kịch bản cắt scope 2 dev** · **§11 ngân sách 3 giai đoạn** · **§12 launch readiness 50 mục** · **§13 cửa go/no-go 17:00 24/02/2027** | ✅ **Đầy đủ** — bổ sung §6 → §13 |
| 09 | [`09-canh-tranh-va-rui-ro.md`](./09-canh-tranh-va-rui-ro.md) | 1.547 | 9 kết luận · khung chấm điểm · 11 đối thủ · bảng so sánh tính năng · rào cản gia nhập thật · risk register RK-01→RK-17 · phân tích độ nhạy · ngưỡng thất bại & 6 phương án xoay trục · theo dõi cạnh tranh | ⚠️ Đầy đủ, **cần rà lại số liệu**: vài chỗ còn "4 khu vực MVP" và mục tiêu 550 WCA như mốc sống (xem MT-18). Phần **lập luận** dẫn tới 220–280 thì giữ nguyên vì chính nó là căn cứ của QĐ-68 |
| 10 | [`10-ux-luong-man-hinh-va-i18n.md`](./10-ux-luong-man-hinh-va-i18n.md) | 2.049 | 10 quyết định UX · 7 nguyên tắc · ràng buộc từ persona · sitemap & mã màn hình · màn hình mobile/web/console · 10 user flow Mermaid · 6 wireframe · thiết kế bộ lọc & bản đồ · onboarding & aha moment · 37 empty state · hệ thống thiết kế · i18n · accessibility · **ma trận truy vết UC ↔ màn hình** · rủi ro UX | ⚠️ Đầy đủ, **cần 2 sửa nhỏ**: §15 ghi "44 use case Must" → **45**; sơ đồ dòng 823 dùng `organizer_id` → `host_user_id` (xem MT-19) |

**Kiểm tra liên kết:** cả 9 đường dẫn tương đối ở trên đều trỏ tới file có thật trong `docs/analysis/`. Không có liên kết hỏng.

---

## 12. Mâu thuẫn cần giải quyết

Bảng này ghi nhận **mọi chỗ tài liệu này nói khác tài liệu kia**. Không lờ đi mâu thuẫn nào. Mỗi dòng có mức nghiêm trọng, ảnh hưởng và người phải giải quyết.

### 12.1 Bảng trạng thái — cập nhật 31/08/2026 (bản 1.1)

**Đây là bảng có thẩm quyền.** Bảng gốc bản 1.0 giữ nguyên ở [§12.4](#124-bảng-gốc-bản-10--giữ-nguyên-để-truy-vết) để truy vết lập luận.

| Mã | Mâu thuẫn | Mức | Trạng thái | Giải bằng cách nào | Ở tài liệu nào |
|---|---|:--:|:--:|---|---|
| **MT-01** | Số sprint: 6 hay 11? | 🟡 | ✅ **ĐÃ GIẢI** | **13 sprint lập lịch, đúng 11 sprint (S0 → S10) trước M6**; S11–S12 là sau ra mắt và không chứa story MVP. Bản có hiệu lực để lập kế hoạch tuần là bản san tải, không phải bảng epic. Kèm kết luận bắt buộc: thuê 1 BE hợp đồng 10 tuần S2 → S6 | `08` §6.1 · QĐ-71 |
| **MT-02** | Bốn tập role khác nhau | 🔴 | ✅ **ĐÃ GIẢI** | `users.role` là enum **đúng 5 giá trị** `member`/`curator`/`moderator`/`admin`/`super_admin`. `guest` = trạng thái phiên · `organizer` = quan hệ theo sự kiện (`events.host_user_id` + `event_cohosts`) · `verified_member` = trust level · `support` gộp `moderator` · `service_provider` không vào enum. Thứ tự guard bất biến trạng thái → role → quan hệ → trust; bộ tên guard/decorator thống nhất | `01` §8.1, §9, §13.1, D-01→D-08 · `08` M1-4, M1-5 · [§2.3](#23-hệ-thống-role--đã-chốt-giải-mt-02) · QĐ-54→57 |
| **MT-03** | RSVP gắn vào `Event` hay `EventOccurrence`? | 🔴 | ✅ **ĐÃ GIẢI** | **Occurrence.** Bảng `rsvps(occurrence_id, …)`, sự kiện không lặp vẫn có đúng 1 occurrence. Endpoint chính `POST /api/v1/occurrences/{occurrenceId}/rsvps`; đường tắt theo `eventId` trả **409 `AMBIGUOUS_OCCURRENCE`**. Ràng buộc migration: `rsvps` **không có** cột `event_id` | `01` D-15, D-16 · `02` §12, §13.5 · `03` §6.1 · `08` M2-2 · QĐ-60, QĐ-61 |
| **MT-04** | Căn cứ pháp lý cho việc xử lý dữ liệu người dùng | 🔴 | ⏸️ **TẠM GÁC — mảng pháp lý hoãn sang giai đoạn sau** | Chủ dự án gác toàn bộ mảng pháp lý ở giai đoạn này, nên kết luận cũ (nêu cả hai văn bản, ưu tiên văn bản mới hơn) **tạm ngưng hiệu lực** thay vì được coi là đã giải. Phải chọn lại căn cứ và cho người có chuyên môn pháp lý xác nhận **trước khi công bố bất kỳ trang chính sách nào** — xem [§7](#7-mảng-pháp-lý--tạm-gác-chưa-xong) | `01` D-27 · `02` §13.4 mục 3, PL-01, L6 · QĐ-73 |
| **MT-05** | Waitlist: Must hay Should? | 🟡 | ✅ **ĐÃ GIẢI** | **`Must`.** UC-40 lên `Must` ⇒ `Must` 44 → **45**, `Should` 18 → **17**. FIFO theo `queued_at`, cửa sổ xác nhận **12 giờ** (30 phút khi sắp tới giờ), huỷ RSVP thăng hạng ngay. Điều kiện ra mắt **L3**: 1 chỗ trống / 20 người chờ → đúng 1 lời mời | `01` D-17 · `02` §8.15, §10.2, §10.5 · `08` M3 · QĐ-62 |
| **MT-06** | Analytics organizer + nhân bản/lặp lại: MVP hay không? | 🟡 | 🔶 **CÒN MỞ** | `02` §10.3 vẫn xếp UC-24 = `Should`, UC-28 = `Could`, UC-72 = `Could`, và đã ghi rõ chi phí của việc hoãn. `01` §7.3–§7.4 vẫn nói là MVP. Chưa ai chốt | xem [§12.2](#122-ba-mâu-thuẫn-còn-mở--chi-tiết-và-hạn-xử-lý) |
| **MT-07** | Lịch GTM đi trước lịch kỹ thuật ~3 tháng | 🔴 | ✅ **ĐÃ GIẢI** | Chọn phương án **định nghĩa lại "seed user" cho giai đoạn tiền-app** (không dời cửa sổ 1). Bốn giai đoạn đo lường **P‑A tiền-app** (01/09 → 12/11/2026) · **P‑B RSVP live** (từ 13/11) · **P‑C beta kín** · **P‑D công khai**, mỗi giai đoạn có đơn vị đo riêng (`WCA-proxy` sổ check-in giấy ↔ `WCA` từ `rsvps`). Hai hệ mốc tách bạch: `M1`–`M6` = tháng GTM, `KT‑M0`–`KT‑M6` = mốc kỹ thuật. Có **tuần chạy song song 13–19/11** để đo hệ số lệch giữa hai đơn vị | `07` §12.1, §10.2 · QĐ-72 |
| **MT-08** | Khiếu nại kiểm duyệt: Could hay bắt buộc? | 🟡 | 🔶 **CÒN MỞ** *(đã thu hẹp)* | `05` §8.5 nay **đã có quy trình khiếu nại đầy đủ** (sequenceDiagram, chống mồi neo, tách người quyết ≠ người xử lý) và §8.6 có cam kết công khai + báo cáo minh bạch hằng quý. Nhưng `02` §10.3 vẫn xếp UC-63 = `Could` với giải pháp tạm "xử lý qua email hỗ trợ". **Chưa hợp nhất** | xem [§12.2](#122-ba-mâu-thuẫn-còn-mở--chi-tiết-và-hạn-xử-lý) |
| **MT-09** | Gate M6: tồn kho hay dòng chảy | 🟡 | ✅ **ĐÃ GIẢI** | **Dòng chảy.** ≥ 25 sự kiện đang mở mỗi tuần (trung bình 4 tuần 25/01 – 21/02/2027, **không tuần nào < 20**) và **6/6 khu vực MVP** ≥ 1 sự kiện mỗi tuần. Bỏ hẳn chỉ tiêu "≥ 80 sự kiện". Trượt M6-1 hoặc M6-2 ⇒ **không ra mắt đúng hạn**, lùi 2–4 tuần | `01` D-24 · `08` §1, §3, §7.8 (M6-1, M6-2) · `02` §10.5 L4 · `07` §1.2 · QĐ-69 |
| **MT-10** | Mục tiêu WCA M6: 550 hay 220–280 | 🟡 | ✅ **ĐÃ GIẢI** | **220–280 lượt/tuần**, ngưỡng đỏ < 110. Suy ra từ 25 sự kiện/tuần × 12–14 người × `show_rate` 70%. Cấm dùng con số 550 trong cửa sổ 6 tháng; con số 550 chỉ còn là mốc M9/gate GĐ2 và **phải lập lại nền** bằng số thật của M6 vào tuần đầu 03/2027 | `01` D-23 · `08` M6-3 · `07` §10.1.3 · `02` GD-01 · QĐ-68 |
| **MT-11** | Số khu vực MVP: 4, 6 hay 12? | 🟢 | ✅ **ĐÃ GIẢI** | **6 khu vực**: An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn. `areas.is_mvp_filter = true` cho đúng 6 hàng, **không xoá, không ẩn được**; đổi polygon cần xác nhận hai bước. `area_slug` viết **kebab-case** vì là URL slug | `01` D-18 · `03` §7.1 seed · `07` T3, §15 · `08` M2-4 · `02` UC-70 · QĐ-63, QĐ-65 |
| **MT-12** | Ba mô hình trust score không tương thích | 🔴 | ✅ **ĐÃ GIẢI** | **Thang T0–T5 duy nhất**, `users.trust_level smallint CHECK (0..5)`. Xoá thang 0–100 và enum `new`/`verified`/`established`/`trusted`/`ambassador`. Tín hiệu ở `trust_signals` append-only; **job `trust:recompute` là nơi duy nhất ghi cột**. T5 luôn cần `staff_endorsement` thủ công. Badge không cấp quyền, không badge tiêu cực | `01` §11, D-09→D-14 · `03` §4 · `05` §5 · `08` M1-6 · [§2.4](#24-trust-level-t0t5--đã-chốt-giải-mt-12) · QĐ-58, QĐ-59 |
| **MT-13** | Sáu tài liệu bị cắt cụt so với mục lục của chúng | 🔴 | ✅ **ĐÃ GIẢI** | Cả 6 đã viết xong: `01` +1.010 dòng (§12→§15) · `02` +2.215 (§7→§13) · `03` +2.768 (§5→§17) · `05` +1.640 (§7→§16) · `07` +1.349 (§9→§15) · `08` +1.422 (§6→§13). Tổng bộ tài liệu **21.790 dòng** sau khi tài liệu pháp lý được gỡ. Mọi tham chiếu treo trước đây đã có đích thật: `03` mục 15.2, `08` §10.2, `02` đặc tả 19 UC, `01` ma trận RBAC | [§11](#11-mục-lục-liên-kết-tới-9-tài-liệu-chi-tiết) |
| **MT-14** | Ngưỡng cấp giấy phép mạng xã hội lệch 10 lần | 🔴 | ⏸️ **TẠM GÁC — mảng pháp lý hoãn sang giai đoạn sau** | Hai nguồn từng ghi hai ngưỡng lệch nhau 10 lần; nguồn ghi mức cao nằm trong tài liệu pháp lý đã gỡ, còn `09` #8 ghi > 1.000 người dùng thường xuyên/tháng. Không đội nào tự chốt được, nên câu hỏi này chỉ mở lại cùng lúc với mảng pháp lý — xem [§7](#7-mảng-pháp-lý--tạm-gác-chưa-xong) và [§12.2](#122-ba-mâu-thuẫn-còn-mở--chi-tiết-và-hạn-xử-lý) |
| **MT-15** | Ba mốc thời gian nhỏ không khớp | 🟢 | ✅ **ĐÃ GIẢI** | **(a) Nhắc lịch: T‑24h và T‑2h** — `T‑3h` không còn xuất hiện ở tài liệu nào. **(b) SLA `critical`: 2 giờ** — `05` đã sửa cam kết công khai theo, kèm `high` 12 giờ · `normal` 48 giờ. **(c) Tên cột: `events.host_user_id`**, cấm `creator_id`/`organizer_id`; mọi enum DB **chữ thường snake_case**, có test regex quét `pg_enum` và tiêu chí nghiệm thu M2-3 yêu cầu `grep` trả về rỗng. *Còn 2 vết sót ở `04` và `10` — theo dõi bằng MT-17 và MT-19* | `01` D-19, D-21, D-22 · `02` BR-19, §6.8 · `05` §7.3 · `08` M2-3, DoD-8 · QĐ-64, QĐ-66, QĐ-67 |

### 12.2 Ba mâu thuẫn **CÒN MỞ** — chi tiết và hạn xử lý

| Mã | Mức | Vì sao chưa giải được | Hai phương án | Ảnh hưởng nếu để trôi | Người giải · **Hạn** |
|---|:--:|---|---|---|---|
| **MT-06** | 🟡 | Đây là đánh đổi phạm vi, không phải mâu thuẫn dữ kiện. `01` §7.3–§7.4 nói `duplicate`, `recurrence_rule` và analytics cấp organizer "là tính năng MVP, không phải để sau"; `02` §10.3 vẫn xếp UC-24 `Should`, UC-28 `Could`, UC-72 `Could` | **(A)** Kéo UC-24 (chuỗi lặp lại) lên `Must` — lược đồ `event_occurrences` đã sẵn sàng nên chi phí chỉ là API + UI. **(B)** Giữ nguyên và chấp nhận organizer lớp học hằng tuần phải tạo tay từng buổi trong 3 tháng đầu | Mất hai persona nguồn cung: P3 Tom (cầu lông T3 & T5 hằng tuần) và P4 Linh (studio yoga, nhóm duy nhất sẵn sàng trả phí sau này). Nguồn cung là bên yếu của thị trường hai phía — mất nó là mất RK-01 | PO · **30/11/2026** (đầu S6) — [CH-08] |
| **MT-08** | 🟡 | `05` đã viết xong quy trình nhưng `02` chưa nâng UC-63 lên tương ứng. Nếu công bố cam kết ở `05` §8.6 mà UC-63 vẫn là `Could` thì **công bố một quyền không có đường thực hiện trong sản phẩm** | **(A)** Nâng UC-63 lên `Should` sớm nhất trong đợt 2 và **công bố đường email khiếu nại có SLA** ngay trong Community Guidelines ở M4. **(B)** Hạ cam kết ở `05` §8.6 xuống mức "khiếu nại qua email hỗ trợ" — rẻ hơn nhưng phải sửa cả trang Safety trước khi công bố | Rủi ro danh tiếng và có thể là rủi ro pháp lý: cam kết công khai mà không có tính năng thực hiện. `05` §8.5 còn bắt buộc **người ra quyết định ≠ người xử lý khiếu nại từ ngày đầu** — quy trình email cũng phải thoả điều này | PO + Founder · **27/11/2026** (M4, **trước khi công bố Guidelines**) |
| **MT-14** | 🔴 | Không đội nào tự trả lời được — phụ thuộc cách cơ quan quản lý diễn giải NĐ 147/2024. Đã nằm trong bộ 30 câu hỏi gửi luật sư | **(A)** 10.000 lượt/tháng → khởi động hồ sơ giấy phép ở M6. **(B)** > 1.000 người dùng thường xuyên/tháng → **chạm ngưỡng trước cả mục tiêu MAU M6 (700–820)**, phải khởi động hồ sơ ở **M4 · 11/2026** | Lệch **4 tháng** trên đường găng pháp lý và một khoản **40–120 triệu VND** chưa có trong dòng tiền. Nếu (B) đúng mà phát hiện muộn thì phải hoãn ra mắt | Founder · ⏸️ **tạm gác cùng mảng pháp lý** — đặt lại hạn khi mở lại, chậm nhất trước beta kín — [CH-05] |

### 12.3 Năm mâu thuẫn **MỚI** phát hiện khi viết tiếp (MT-16 → MT-20)

Xuất hiện vì các tài liệu nay đi sâu tới mức lược đồ và tên định danh — độ chi tiết mà bản 1.0 chưa chạm tới.

| Mã | Mâu thuẫn | Mức | Chi tiết | Ảnh hưởng nếu không giải | Người giải · **Hạn** |
|---|---|:--:|---|---|---|
| **MT-16** | **`user_status_enum`: 8 giá trị hay 5?** | 🔴 | `01` §10.3 khai enum **8 giá trị** có `restricted` và `banned`; `03` §4.1 khai **5 giá trị** **không** có hai giá trị đó. Thang cưỡng chế E1 → E6 ở `05` §8.1 **cần cả `restricted` lẫn `banned`** để biểu diễn bậc 4 và bậc 6, và `05` đã chèn hộp cảnh báo yêu cầu hợp nhất trước khi viết migration | Trục 0 của mô hình phân quyền (`AccountStatusGuard`) không chặn được đúng bậc cưỡng chế; migration `user_status_enum` sai ngay ở M1 và enum Postgres **không xoá được giá trị** — sửa sau phải tạo type mới và ép kiểu toàn bảng | Tech Lead · **02/10/2026** (**trước migration M1**) |
| **MT-17** | **Tên decorator và chữ hoa/thường enum ở `04`** | 🟡 | `04` §7.7 dùng `@MinTrustTier()` trong khi tên chốt ở `01` §13.4 và §15.7 là **`@MinTrust()`**. `04` còn 3 chỗ viết `status = 'PUBLISHED'` **chữ hoa**, trái QĐ-64 và DoD-8 (mọi enum DB chữ thường snake_case). `01` đã tự sửa 3 chỗ của mình sang bộ tên chuẩn và ghi rõ "để `04` chỉnh theo, không sửa file `04`" | Hai tên decorator cùng tồn tại ⇒ hai guard, hai đường kiểm trust. Chữ hoa trong ví dụ SQL bị sao chép vào migration ⇒ index partial `WHERE status = 'PUBLISHED'` **không bao giờ khớp** dữ liệu thật, truy vấn feed rơi về seq scan mà không ai nhận ra | Tech Lead · **21/09/2026** (trước S1) |
| **MT-18** | **`09` còn dùng số liệu bản cũ** | 🟢 | `09` vẫn ghi "4 khu vực MVP" ở §6, §8.4 (PV-1) và giữ 550 WCA như mốc sống ở vài chỗ. Đây là tài liệu **đã khuyến nghị** đổi sang 220–280 và sang gate dòng chảy — phần lập luận §7.1 phải giữ nguyên vì nó chính là căn cứ của QĐ-68 và QĐ-69 | PV-1 ("thu hẹp địa lý còn 2 khu vực") tính sai điểm xuất phát nếu nền là 6 chứ không phải 4. Người đọc nhanh lấy nhầm 550 làm mục tiêu M6 | PO · **19/10/2026** (cửa sổ quyết định 1) |
| **MT-19** | **`10` còn số cũ và một tên cột cũ** | 🟢 | `10` §15 kết luận "toàn bộ **44** use case `Must`" trong khi nay là **45**; sơ đồ chuyển giao listing (dòng 823) dùng `organizer_id` thay vì `host_user_id`. **Độ phủ thực tế vẫn đủ** — UC-40 đã có màn hình `M-26` (Waitlist status) và `W-20`, chỉ sai con số tổng | Ma trận truy vết là công cụ kiểm độ phủ trước ra mắt (điều kiện **L1**); sai số tổng làm checklist tick thiếu một dòng. `organizer_id` trong sơ đồ bị lập trình viên chép vào code, vi phạm M2-3 | Designer + PO · **30/09/2026** |
| **MT-20** | **Waitlist: một bảng hay hai?** | 🔴 | `02` §9.1 và §13.4 mục 2 quy định **KHÔNG tạo bảng `waitlist_entries`** — hàng đợi hiện thực bằng `rsvps.status = 'waitlisted'` + `position` + `promotion_expires_at`. Nhưng `03` §6.2 **đã thiết kế bảng `waitlist_entries` đầy đủ** như một sổ cái có thứ tự (`queued_at` là nguồn sự thật FIFO, `offer_attempt`, `resolution_reason`, `waitlist_state_enum`), với lập luận: `rsvps.status` chỉ nói *đang* xếp hàng, không tra được "ai đợi trước mà người ta được vào trước" | **Waitlist là `Must` (QĐ-62) và nằm trên đường găng M3.** Hai thiết kế ⇒ hai bộ migration, hai thuật toán thăng hạng, hai cách đo `waitlist_conversion_rate`. Test tải L3 (1 chỗ / 20 người chờ → đúng 1 lời mời) không viết được khi chưa biết nguồn sự thật của thứ tự nằm ở đâu | Tech Lead + PO · **02/11/2026** (**trước S4**) |

> **Khuyến nghị cho MT-20** (chờ Tech Lead xác nhận): giữ **cả hai nhưng phân vai rõ** — `rsvps.status = 'waitlisted'` là **trạng thái hiện tại** dùng cho mọi truy vấn hiển thị và ràng buộc sức chứa; `waitlist_entries` là **sổ cái append-oriented** dùng cho thứ tự FIFO, lịch sử lời mời và giải quyết khiếu nại. Điều kiện bắt buộc nếu chọn phương án này: đúng **một** nguồn sự thật cho thứ tự (`waitlist_entries.queued_at`), `rsvps.position` chỉ là giá trị hiển thị tính lại theo lô, và có test bất biến chứng minh hai bảng không bao giờ lệch trạng thái.

### 12.4 Bảng gốc bản 1.0 — giữ nguyên để truy vết

Không sửa dòng nào. Cột "Người giải · Hạn" của các dòng **ĐÃ GIẢI** nay chỉ còn giá trị lịch sử.

| Mã | Mâu thuẫn | Mức | Chi tiết | Ảnh hưởng nếu không giải | Người giải · Hạn |
|---|---|:--:|---|---|---|
| **MT-01** | **Số sprint: 6 hay 11?** | 🟡 | Yêu cầu tổng hợp nói "roadmap 6 sprint"; `08` lập kế hoạch **11 sprint (S0→S10) + S11, S12**. 6 sprint (S0→S5) chỉ đủ tới M4, chưa có beta, chưa phát hành | Kỳ vọng sai về ngày ra mắt giữa đội kỹ thuật và nhà đầu tư | Founder · 07/09/2026 |
| **MT-02** | **Bốn tập role khác nhau** | 🔴 | `01`: 8 role có `verified_member`/`support`/`super_admin` · `02`: 7 actor có `Co-host`, không có Support/Super Admin · `03` enum: chỉ 4 giá trị và **nói rõ không có role `organizer`** · `08` E2-S7: `user`/`organizer`/`moderator`/`admin` | Migration `user_role_enum` sai ngay từ Sprint 1; guard RBAC viết lại; audit log không truy vết được | Tech Lead + PO · **14/09/2026** — [CH-02] |
| **MT-03** | **RSVP gắn vào `Event` hay `EventOccurrence`?** | 🔴 | `03` D-02 tuyên bố "RSVP luôn gắn vào **occurrence**, không gắn vào event" và coi việc tách là **bắt buộc**. Nhưng `08` E4/E6 định nghĩa bảng `event_rsvps(event_id, user_id)` phẳng, và mọi endpoint ở `02` §6.9, `04` §3.3, `10` Q-06 đều là `POST /events/:id/rsvp` | Migration đắt nếu đổi sau; sự kiện lặp lại (UC-24) là ca phổ biến nhất của cộng đồng expat sẽ sai ngữ nghĩa | Tech Lead · **05/10/2026** — [CH-04] |
| **MT-04** | **Căn cứ pháp lý bảo vệ dữ liệu: NĐ 13/2023 hay Luật 91/2025?** | 🔴 | Brief gốc và yêu cầu dự án ghi "tuân thủ **Nghị định 13/2023/NĐ-CP**". tài liệu pháp lý (nay đã gỡ) kết luận #1 và `04` §14.1 khẳng định từ 01/01/2026 vai trò trung tâm thuộc về **Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15** và nghị định hướng dẫn, và cảnh báo mọi mẫu dựa trên NĐ 13 đều **lỗi thời** | Privacy Policy trích sai văn bản; hồ sơ DPIA/TIA dùng sai biểu mẫu; mức phạt có thể tính theo % doanh thu | Founder + Luật sư · **30/09/2026** (nằm trong câu hỏi số 12 gửi luật sư) |
| **MT-05** | **Waitlist: Must hay Should?** | 🟡 | Brief liệt kê "RSVP có sức chứa + waitlist" là năng lực MVP. `02` xếp UC-40 (danh sách chờ và tự động thăng hạng) là **Should**. `08` E6-S3 lại xếp vào Sprint 4 cùng M3 | Nếu cắt, sự kiện hết chỗ thành ngõ cụt; mất ràng buộc thiết kế bắt buộc của persona P3 | PO · 02/11/2026 — [CH-07] |
| **MT-06** | **Analytics organizer và tính năng nhân bản/lặp lại: MVP hay không?** | 🟡 | `01` §7.3 ghi "`duplicate` và `recurrence_rule` là tính năng MVP, **không phải để sau**" và §7.4 ghi "analytics cấp organizer là tính năng MVP". `02` xếp UC-28 nhân bản = **Could**, UC-24 lặp lại = **Should**, UC-72 analytics organizer = **Could** | Mất hai persona organizer (P3 nghiệp dư và P4 chuyên nghiệp) — tức mất nguồn cung | PO · 30/11/2026 — [CH-08] |
| **MT-07** | **Lịch GTM đi trước lịch kỹ thuật ~3 tháng** | 🔴 | `07` §5.3 đặt mốc **100 seed user vào 12/10/2026** và yêu cầu "nạp 60 sự kiện vào app" trong tuần 01–07/09, "RSVP chỉ qua app" từ tuần 1. Nhưng `08` cho biết RSVP chỉ hoạt động từ **M3 · 13/11/2026** và beta kín 100 user là **M5 · 25/12/2026**. `09` FT-1 đo seed user tại **19/10/2026** khi app chưa có RSVP | Toàn bộ ngưỡng thất bại của cửa sổ 1 (FT-1 → FT-6) không đo được; đội community làm việc không có công cụ; nguy cơ kết luận sai là "thất bại sản phẩm" | Founder + PO · **07/09/2026** — phải hoặc dời cửa sổ 1 về sau M3, hoặc định nghĩa lại "seed user" cho giai đoạn tiền-app |
| **MT-08** | **Khiếu nại quyết định kiểm duyệt: Could hay bắt buộc?** | 🟡 | `05` cam kết công khai #3: "Mọi quyết định hạn chế tài khoản đều có lý do cụ thể **và có quyền khiếu nại**", và nguyên tắc P4 bắt buộc tách người quyết/người xử lý khiếu nại từ ngày đầu. `02` xếp UC-63 (khiếu nại) là **Could** | Công bố cam kết mà không có tính năng thực hiện là rủi ro danh tiếng và có thể là rủi ro pháp lý | PO + Founder · 27/11/2026 (M4) |
| **MT-09** | **Gate M6: tồn kho hay dòng chảy** | 🟡 | `08` M6 yêu cầu "≥ 80 sự kiện". `09` §7.1 chứng minh chỉ tiêu tồn kho đạt được bằng cách nạp dồn một lần và khuyến nghị đổi sang "**≥ 25 sự kiện đang mở/tuần**, không khu vực MVP nào bằng 0" | Ra mắt với app trông đầy nhưng thực chất chết — đúng kịch bản RK-01 | Founder · 25/12/2026 — [CH-13] |
| **MT-10** | **Mục tiêu WCA M6: 550 hay 220–280** | 🟡 | `07` §1.2 cam kết 550 lượt tham dự xác nhận/tuần ở M6. `09` §7.1 tính ngược ra rằng con số này đòi hỏi 7,5 RSVP/tháng trên mỗi người có hoạt động, trong khi mức hợp lý là 2–4, và khuyến nghị hiệu chỉnh về **220–280** | Đặt mục tiêu bất khả thi làm hỏng niềm tin nội bộ và làm sai lệch quyết định xoay trục ở cửa sổ 3 | Founder · 19/10/2026 — [CH-12] |
| **MT-11** | **Số khu vực MVP: 4, 6 hay 12?** | 🟢 | Brief liệt kê 6 khu vực (An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn). `07` §5.3 chốt **4** (`an-thuong`, `my-an`, `my-khe`, `hai-chau`). `08` E5-S1 seed **12** khu vực. `09` RK-01 nói "4 khu vực MVP" | Seed data không khớp bộ lọc; chỉ tiêu "không khu vực nào bằng 0" đo trên tập nào? | PO · 19/10/2026 (Sprint 3, khi seed `areas`) |
| **MT-12** | **Ba mô hình trust score không tương thích** | 🔴 | `01` dùng thang **T0–T5**. `03` §4.5 dùng enum `new`/`verified`/`established`/`trusted`/`ambassador` với ngưỡng <10/10–29/30–54/55–79/≥80 và trọng số riêng (email +8, phone +12, social +6, id_document +25…). `05` §5 dùng công thức 5 thành phần với `base_tier_points` T1=5…T5=50 và dải hiển thị 0–19/20–39/40–64/65–84/85–100. `08` E3-S3 dùng 9 tín hiệu khác hẳn (email +15, social +15, phone +15, avatar +10, ≥3 sự kiện +20…) | Trust level là đầu vào của rate limit theo tier (`05` §6.1), của quyền chat 1-1, của badge hiển thị. Bốn cách tính khác nhau nghĩa là hệ thống hạn chế hoạt động sai | Tech Lead + PO · **02/10/2026** — [CH-03] |
| **MT-13** | **Bốn tài liệu bị cắt cụt so với chính mục lục của chúng** | 🔴 | `01` có mục lục 14 mục nhưng dừng ở §7 — **thiếu toàn bộ ma trận RBAC, vòng đời tài khoản, định nghĩa trust level & badge, mapping role→use case**. `02` hứa đặc tả chi tiết 19 use case trọng yếu nhưng dừng ở §6. `03` chỉ có Nhóm A — **thiếu toàn bộ lược đồ `events`, `rsvps`, `areas`, `reports`, `conversations`**. `05` dừng ở §6 — **thiếu quy trình kiểm duyệt, thang cưỡng chế, data model**. `07` dừng ở §6 — **thiếu hệ thống chỉ số và ngân sách GTM**. `08` dừng ở §5 — **thiếu §10.2 kịch bản cắt scope** mà chính §1 tham chiếu | Đội không có đặc tả để implement `events`/`rsvps` — tức toàn bộ M2 và M3. Không có ma trận RBAC để viết guard. Không có kịch bản cắt scope nếu chọn đội tinh gọn | Tác giả tài liệu · **hoàn thiện trước 21/09/2026** (trước Sprint 1) |
| **MT-14** | **Ngưỡng cấp giấy phép mạng xã hội lệch 10 lần** | 🔴 | Tài liệu pháp lý (nay đã gỡ) kết luận #4: "khoảng **10.000 lượt truy cập thường xuyên/tháng**". `09` kết luận #8: "**> 1.000 người dùng thường xuyên/tháng**", và kết luận rằng ngưỡng sẽ bị chạm khoảng M6–M7 | Nếu `09` đúng, hồ sơ giấy phép (40–120 triệu VND, thời gian xử lý chưa rõ) phải khởi động ở **M4 · 11/2026** chứ không phải sau M6 — lệch 4 tháng và một khoản ngân sách lớn | Founder + Luật sư · **30/09/2026** — [CH-05] |
| **MT-15** | **Ba mốc thời gian nhỏ không khớp** | 🟢 | (a) **Nhắc lịch**: `01` §5 và `07` tuần 4 ghi T‑24h và **T‑3h**; `02` UC-52, `08` E7-S8, `10` đều ghi T‑24h và **T‑2h**. (b) **SLA report critical**: `05` cam kết công khai **1 giờ**; `01` §4.2 và `08` E8-S3 ghi **2 giờ**. (c) **Đặt tên cột**: `03` dùng `host_user_id`, `05` dùng `creator_id`, `08` dùng `organizer_id` cho cùng một khái niệm; `03` dùng enum chữ thường, `05` dùng `status = 'PUBLISHED'` chữ hoa | (a) và (b) ảnh hưởng trực tiếp tỷ lệ no-show và cam kết công khai. (c) gây lỗi migration và code review lặp lại | PO + Tech Lead · 02/11/2026 — [CH-09], [CH-10] |

### 12.5 Tổng kết mức nghiêm trọng — cập nhật bản 1.1

| Trạng thái | Số lượng | Mã |
|---|---:|---|
| ✅ **ĐÃ GIẢI** — có quyết định chốt, đã áp dụng đồng loạt vào các tài liệu con | **11** | MT-01, MT-02, MT-03, MT-05, MT-07, MT-09, MT-10, MT-11, MT-12, MT-13, MT-15 |
| ⏸️ **TẠM GÁC** — mảng pháp lý hoãn sang giai đoạn sau, phải mở lại trước khi ra mắt công khai ([§7](#7-mảng-pháp-lý--tạm-gác-chưa-xong)) | **2** | MT-04 🔴, MT-14 🔴 |
| 🔶 **CÒN MỞ** từ bản 1.0 | **2** | MT-06 🟡, MT-08 🟡 |
| 🆕 **MỚI phát hiện** khi viết tiếp | **5** | MT-16 🔴, MT-17 🟡, MT-18 🟢, MT-19 🟢, MT-20 🔴 |
| | **Tổng còn phải xử lý ngay: 7** (chưa kể 2 mục tạm gác) | |

**Bảy mâu thuẫn phải xử lý ngay, xếp theo hạn:**

| Hạn | Mã | Mức | Người giải | Chặn cái gì |
|---|---|:--:|---|---|
| **21/09/2026** | MT-17 | 🟡 | Tech Lead | Sprint 1 — tên guard/decorator và chữ hoa/thường enum trong migration |
| **30/09/2026** | MT-19 | 🟢 | Designer + PO | Ma trận truy vết UC ↔ màn hình, điều kiện ra mắt L1 |
| **02/10/2026** | MT-16 | 🔴 | Tech Lead | **Migration M1** — enum Postgres không xoá được giá trị, sai là phải tạo type mới |
| **19/10/2026** | MT-18 | 🟢 | PO | Cửa sổ quyết định 1 — điểm xuất phát của phương án xoay trục PV-1 |
| **02/11/2026** | MT-20 | 🔴 | Tech Lead + PO | **Sprint 4 / M3** — waitlist là `Must` và nằm trên đường găng |
| **27/11/2026** | MT-08 | 🟡 | PO + Founder | M4 — trước khi công bố Community Guidelines |
| **30/11/2026** | MT-06 | 🟡 | PO | Sprint 6 — nguồn cung, hai persona organizer |

> **Hai mâu thuẫn 🔴 phải xử lý ngay đều có hạn trước 03/11/2026, và cả hai đều chặn một artefact không sửa lại được rẻ:** MT-16 chặn migration enum, MT-20 chặn thiết kế bảng waitlist. Đặt cả hai vào lịch quyết định của Founder ngay tuần đầu tiên. **MT-04 và MT-14 cũng ở mức 🔴 nhưng đang tạm gác** cùng mảng pháp lý — chúng không có hạn cho tới khi mảng đó được mở lại, và phải xong trước khi ra mắt công khai.

---

*Tài liệu 00 — Tổng hợp dự án Da Nang Connect. Lập ngày 31/08/2026, **phiên bản 1.1** (cập nhật sau khi `01`, `02`, `03`, `05`, `07`, `08` được viết tiếp; 11/15 mâu thuẫn bản 1.0 đã giải, 2 tạm gác cùng mảng pháp lý, 5 mâu thuẫn mới ghi nhận). Đây là bản tổng hợp có thẩm quyền để ra quyết định; mọi chi tiết triển khai nằm ở 9 tài liệu phân tích gốc. Khi một tài liệu con được cập nhật, tài liệu này phải được đối chiếu lại, đặc biệt là §8 Decision log và §12 Mâu thuẫn cần giải quyết.*
