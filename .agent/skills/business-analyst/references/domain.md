# Da Nang Connect — Domain context cho BA

> Nền nghiệp vụ để phân tích đúng. Đây là bản cô đọng để BA cầm tay; canon đầy đủ
> nằm ở [`docs/analysis/`](../../../../docs/analysis/):
> [01 — Tác nhân & phân quyền](../../../../docs/analysis/01-tac-nhan-va-phan-quyen.md) ·
> [02 — Use case](../../../../docs/analysis/02-use-case.md) ·
> [03 — Domain & dữ liệu](../../../../docs/analysis/03-domain-va-du-lieu.md) ·
> [04 — Tech stack & kiến trúc](../../../../docs/analysis/04-tech-stack-va-kien-truc.md) ·
> [05 — Trust & safety](../../../../docs/analysis/05-trust-safety-va-kiem-duyet.md) ·
> [08 — Roadmap](../../../../docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md).
> Khi bản này lệch canon → canon thắng, và sửa lại bản này.

---

## Sản phẩm 1 câu

Nền tảng kết nối **cộng đồng người nước ngoài (expat) tại Đà Nẵng**: biết "tuần
này ở Đà Nẵng có gì diễn ra" trong dưới 60 giây, đăng ký tham gia trong 2 chạm, và
thấy đủ tín hiệu tin cậy để dám đi gặp người lạ ngoài đời.

**Người dùng cốt lõi:** digital nomad, expat định cư dài hạn, du học sinh, người
đi làm hợp đồng nước ngoài — **~80% dùng điện thoại**, UI mặc định **tiếng Anh**.
→ Mọi quyết định BA lọc qua: *"expat mới tới 3 ngày, không đọc được tiếng Việt,
đang dùng 4G ngoài đường — làm được không?"*

**Địa lý:** chỉ Đà Nẵng ở v1. Người dùng nói chuyện bằng **tên khu** ("An Thượng",
"Mỹ Khê"), không nói bằng bán kính.

---

## Actors (vai trò)

User **đa vai trò** (mảng `roles[]`, không phải 1 string). Role là **nhãn đạt
được**, không phải cổng chặn — tạo hoạt động gần như không ma sát.

### Primary — tạo giá trị trực tiếp

| Role | Là ai | Quyền nổi bật |
|---|---|---|
| `member` / `verified_member` | Expat tham gia hoạt động | Tìm kiếm, lọc theo area, RSVP, huỷ RSVP, comment, report |
| `organizer` | Người tổ chức (nghiệp dư → chuyên nghiệp) | Tạo/sửa `Event`, nhân bản, lịch lặp lại, xem & xuất danh sách attendee, đánh dấu no-show, nhắn tin toàn bộ người đã RSVP |
| `local_host` (badge) | Người Việt nói tiếng Anh dẫn hoạt động | Như organizer + badge "người bản địa"; `is_local` là tự khai + xác minh nhẹ, **không** dùng để hạn chế quyền |
| `service_provider` | Nhà cung cấp dịch vụ (GĐ2–3) | ❌ **Chưa kích hoạt ở GĐ1** — chỉ giữ chỗ trong enum để migration sau không phá vỡ |

### Secondary — vận hành & kiểm duyệt

| Role | Là ai | Quyền nổi bật |
|---|---|---|
| `curator` | Đội sáng lập | Đăng **curated listing** thay mặt bên thứ ba, mời organizer gốc **claim** listing |
| `moderator` | Kiểm duyệt cộng đồng | Xử lý `Report`, ẩn nội dung, cảnh cáo / hạn chế tài khoản |
| `support` | Hỗ trợ người dùng | Xem ticket, tra cứu trạng thái tài khoản (không đổi role) |
| `admin` | Vận hành | Cấu hình hệ thống, analytics, seed `Area` |
| `super_admin` | Quyền huỷ hoại | Đổi role, xoá vĩnh viễn, đọc `audit_log` |

> Mọi hành động của `moderator` / `admin` / `super_admin` ghi `audit_log` **bất biến**.

### System & External

- **System:** Expo Push, email/SMS, map tiles + geocoding, S3-compatible + CDN,
  BullMQ scheduler, socket.io gateway, Sentry.
- **External (KHÔNG tích hợp API):** Facebook Groups, Meetup.com, WhatsApp
  Groups, Luma. Đây là **nguồn curate thủ công**, không phải nguồn crawl —
  `collection_method` mặc định `manual_only` và có CHECK constraint chặn từ gốc.

---

## Entities chính

| Entity | Là gì | Đặc thù nghiệp vụ |
|---|---|---|
| **User** | Tài khoản | JWT access + refresh (`AuthSession`); social login Google/Apple/Facebook (`SocialAccount`); Apple Sign-In bắt buộc trên iOS nếu có social login |
| **Profile** | Hồ sơ 1–1 với User | `trust_score` (0–100, cache) + `trust_level`; `visibility`; `is_local`; số điện thoại **luôn** private |
| **TrustSignal** | Bằng chứng tin cậy (append-only) | `trust_score` **suy ra từ bằng chứng**, không phải số gõ tay. Nguồn: verify email/phone, check-in, review, community vouch |
| **Area** | Khu vực Đà Nẵng | Cây phân cấp `city → district → ward → micro_area`; gán `area_id` **lúc ghi**, không tính lúc đọc |
| **Venue** | Địa điểm cụ thể | `geography(Point,4326)` + index GIST; `location_precision` quyết định lộ toạ độ chính xác cho ai |
| **Event** | Hoạt động | `source` (tự đăng / curated), `claim_status`, `content_locale`, `price_amount`+`price_currency` (chưa có giao dịch ở v1) |
| **EventOccurrence** | Một lần diễn ra | **Đơn vị nghiệp vụ nhỏ nhất.** 1 event một-lần vẫn có 1 occurrence. RSVP · check-in · nhắc lịch · review · waitlist đều móc vào đây |
| **EventTranslation** | Bản dịch nội dung | Phụ trợ; không ép organizer viết hai lần |
| **Rsvp** | Đăng ký tham gia | Unique `(occurrence_id, user_id)`; đếm phi chuẩn hoá `rsvp_going_count` do trigger DB duy trì + job đối soát đêm |
| **WaitlistEntry** | Hàng chờ khi hết chỗ | Thăng hạng tự động khi có người huỷ |
| **Comment / Review / Follow / Block** | Tương tác cộng đồng | Review gắn vào occurrence đã diễn ra; `Block` là ràng buộc an toàn, không phải tính năng phụ |
| **Report** | Tố cáo nội dung/người | Polymorphic `target_type` + `target_id`; đầu vào của vòng lặp hậu kiểm |
| **ModerationAction** | Hành động kiểm duyệt | Ẩn / cảnh cáo / hạn chế / khoá — **ẩn được mà không xoá** |
| **Conversation / Message** | Chat 1-1 | `request_status` — người lạ phải được chấp nhận trước khi nhắn tự do |
| **Notification / NotificationDelivery / PushToken** | Thông báo | Đa kênh; token hết hạn phải dọn; tôn trọng locale và khung giờ |
| **CuratedSource / CurationTask** | Curate thủ công | Công dân hạng nhất trong schema; ghi vết "nguồn này đã xin phép chưa" |
| **SavedSearch** | Bộ lọc đã lưu | Nguồn của push "có hoạt động mới khớp bộ lọc của bạn" |
| **AuditLog / OutboxEvent** | Vết & phát sự kiện | `audit_log` bất biến; outbox đảm bảo phát sự kiện đúng-một-lần |

> Chỉ 4 nhóm bảng dùng polymorphic (`reports`, `follows`, `reviews`,
> `notifications`) vì tập đối tượng thật sự mở. **Mọi chỗ khác dùng FK thật.**

---

## Trust level — T0 → T5

| Tier | Tên | Điều kiện đạt |
|---|---|---|
| **T0** | Guest | Chưa đăng nhập |
| **T1** | Email verified | Xác thực email hoặc social login |
| **T2** | Phone verified | OTP SMS thành công (`phone_hash` HMAC + pepper) |
| **T3** | Established | ≥3 sự kiện đã check-in · tài khoản ≥30 ngày · 0 strike · ≥1 review ≥4★ |
| **T4** | ID verified | KYC bên thứ ba + liveness. **Không lưu ảnh giấy tờ** — chỉ lưu `verification_ref` |
| **T5** | Trusted organizer | ≥5 sự kiện đã diễn ra ≥5 người thật · rating ≥4.5 · ops phê duyệt thủ công |

Suy giảm: strike ≥2 → tụt tier; strike ≥3 → `restricted`; tái phạm nặng → `banned`.

Quyền gắn với tier (không phải chỉ với role): xem danh sách attendee, xem toạ độ
chính xác, chat 1-1, rate limit tạo sự kiện. **Enforce ở tầng API.**

---

## Business rules cốt lõi (BA hay đụng)

1. **RSVP gắn vào `EventOccurrence`, không gắn vào `Event`.** Sự kiện lặp lại (lớp
   tiếng Anh thứ Ba hàng tuần, cầu lông chiều thứ Năm) là ca phổ biến nhất.
2. **Sức chứa + hàng chờ là nghiệp vụ tranh chấp.** Đếm phải chính xác dưới truy
   cập đồng thời (`SELECT FOR UPDATE` / đếm nguyên tử), mutation nhận
   `Idempotency-Key`. Huỷ RSVP → thăng hạng người đầu waitlist + thông báo.
3. **No-show do host đánh dấu**, có cửa sổ thời gian và cơ chế khiếu nại. No-show
   là `TrustSignal` âm, không phải "phạt tiền".
4. **Kiểm duyệt là hậu kiểm.** Mặc định publish ngay; chỉ trust thấp mới vào hàng
   đợi duyệt. Report → SLA xử lý → `ModerationAction` → `audit_log`.
5. **Curated listing → claim.** `Event` phải biết mình đến từ đâu (`source`), đang
   *chưa có chủ* (`claim_status`), và ai đang liên hệ với chủ thật (`CurationTask`).
   Khi organizer gốc claim: quyền quản lý chuyển giao, RSVP đã có **giữ nguyên**.
6. **Không tự động thu thập dữ liệu.** `collection_method = manual_only` + CHECK
   constraint. Rủi ro được chặn ngay từ tầng schema.
7. **Địa lý:** lọc theo `area_id` (cây phân cấp) **và/hoặc** bán kính
   `ST_DWithin(geography, geography, mét)`. Đừng dùng `geometry` rồi so sánh bằng
   độ — sai đơn vị là bug âm thầm.
8. **Thời gian:** `timestamptz`, lưu UTC, connection ép `timezone = 'UTC'`; IANA
   zone lưu riêng. **Không bao giờ hardcode `+07`** trong logic nghiệp vụ. Bộ lọc
   "tối nay" / "cuối tuần này" tính theo `Asia/Ho_Chi_Minh`.
9. **Xoá 3 tầng:** `status` (ẩn) → `deleted_at` (soft delete) → anonymize/hard
   delete theo lịch. Giữ được toàn vẹn lịch sử tham gia và hồ sơ an toàn.
10. **Tối thiểu hoá dữ liệu cá nhân:** không lưu cái không dùng
    (không lưu lịch sử vị trí, không lưu ảnh giấy tờ). Có quyền truy cập, chỉnh
    sửa, rút đồng ý, xoá tài khoản.
11. **i18n:** UI tiếng Anh mặc định, tiếng Việt thứ hai (`en.json` / `vi.json`).
    Nội dung user tạo lưu 1 bản theo `content_locale` + `event_translations` phụ.
    Từ vựng hệ thống dùng cột `name_en` / `name_vi`.
12. **Seed ≠ Migration.** `Area` Đà Nẵng và taxonomy hệ thống là **migration**
    (vĩnh viễn). Dữ liệu demo là **seed** (xoá khi launch). Đừng nhầm.

---

## Vocabulary (EN code ↔ VN)

UI mặc định tiếng Anh; code/DB tiếng Anh; tài liệu nội bộ tiếng Việt.

| Code / DB | UI (en) | Nghĩa trong sản phẩm |
|---|---|---|
| `event` | Event | Hoạt động có thời gian & địa điểm: buổi thể thao, meetup ngôn ngữ, sự kiện cộng đồng |
| `event_occurrence` | — | Một lần diễn ra cụ thể của event |
| `rsvp` | RSVP / Join | Hành động đăng ký tham gia một occurrence |
| `attendee` | Attendee | Người đã RSVP và được ghi nhận |
| `waitlist` | Waitlist | Hàng chờ khi hết chỗ |
| `host` / `organizer` | Host / Organizer | Người chịu trách nhiệm tổ chức |
| `curated listing` | — | Event do đội sáng lập đăng lại từ nguồn công khai, chưa có organizer gốc |
| `claim` | Claim this event | Quy trình organizer gốc nhận quyền quản lý curated listing |
| `area` | Area | Khu vực Đà Nẵng: An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn |
| `venue` | Venue | Địa điểm cụ thể có toạ độ |
| `trust_level` | Trust level | Bậc tin cậy T0–T5 |
| `no_show` | No-show | Đã RSVP nhưng không có mặt, bị host đánh dấu |
| `report` | Report | Tố cáo nội dung / người dùng |
| `local_host` | Local host | Người Việt nói tiếng Anh dẫn hoạt động |
| `language_exchange` | Language exchange | Hoạt động trao đổi ngôn ngữ |

Key i18n theo dạng `role.verified_member.label`, `badge.reliable_attendee.name`,
`event.rsvp.full.message`.

---

## Phases (biết feature thuộc giai đoạn nào)

- **Giai đoạn 1** (đang làm) — **Kết nối cộng đồng.** Tạo event, RSVP + waitlist,
  tìm kiếm & lọc theo area/loại hình/thời gian/ngôn ngữ, hồ sơ có trust level,
  kiểm duyệt UGC, curated listing + claim, push nhắc lịch.
- **Giai đoạn 2** — **Nhà ở.** Bounded context `listings` riêng, dùng chung
  `users`, `areas`, `venues`, `reviews`, `reports`, `conversations`. Thanh toán
  bắt đầu có nghĩa.
- **Giai đoạn 3** — **Y tế / dịch vụ chuyên môn.** Bounded context `providers`;
  kích hoạt role `service_provider`; xác minh chuyên môn.

Ngoài phạm vi v1 (nhưng schema chừa chỗ): giao dịch thanh toán, đa thành phố
(`areas` đã phân cấp từ `city` nên chỉ cần thêm cây con — nhưng v1 **chỉ seed Đà Nẵng**).

Khi đề xuất feature mới: đặt đúng giai đoạn, hỏi "có hợp giai đoạn hiện tại không,
hay là roadmap" → roadmap thì viết vào `docs/future-features/`.

---

## Nguyên tắc thiết kế (ràng buộc BA phải tôn trọng)

- **Mobile-first**, tap target ≥44×44, form tạo event chạy tốt trên điện thoại
  bằng 4G. Tạo hoạt động dưới 90 giây trên mobile là mục tiêu sản phẩm.
- **English-first UI**, tiếng Việt là ngôn ngữ thứ hai — không hardcode chuỗi.
- **SEO #1 cho trang public của `apps/web-client-side`** (Next.js 16 App Router): SSR +
  `generateMetadata()` + JSON-LD `Event` + `notFound()` cho 404. `apps/web-admin-side`
  KHÔNG index (`robots: noindex`).
- **Cross-platform parity** mặc định cho người dùng cuối: `apps/web-client-side` +
  `apps/mobile`; luồng vận hành sống ở `apps/web-admin-side`. Mọi app chỉ nói
  chuyện với `apps/api` qua REST `/api/v1`. Kiểu dùng chung ở `packages/shared-types`.
- **An toàn cá nhân là ràng buộc dữ liệu**, không phải tính năng phụ:
  `location_precision`, `blocks`, `conversations.request_status`,
  `profiles.visibility` nằm ngay trong lược đồ v1.
- **Ma sát tạo nội dung thấp, ma sát gặp người lạ cao.** Đây là hai chiều ngược
  nhau và mọi trade-off UX đều nằm giữa chúng.
