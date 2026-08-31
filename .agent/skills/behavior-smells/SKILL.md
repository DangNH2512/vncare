---
name: behavior-smells
description: >-
  Radar "behavior chưa chuẩn chỉnh" cho Da Nang Connect (nền tảng sự kiện &
  kết nối cộng đồng expat tại Đà Nẵng). Dùng khi user nói behavior có gì đó sai
  nhưng chưa gọi tên được, khi BA đang gap-analysis một luồng, hoặc khi Tester
  cần biết class bug nào hay lặp lại. Quét checklist này TRƯỚC khi kết luận
  "không còn bug". Trigger: "behavior kỳ lạ", "có gì đó sai", "bug lạ",
  "gap analysis", "tại sao UI lại thế này", bất kỳ lúc nào sau khi implement
  feature mới (event, RSVP, tìm kiếm theo khu vực, push, kiểm duyệt UGC).
---

# Radar "Behavior Chưa Chuẩn Chỉnh" — Da Nang Connect

> Catalog các lớp **hành vi-sai lặp lại** trong một nền tảng sự kiện cộng đồng:
> giới hạn chỗ, múi giờ, truy vấn địa lý, đa ngôn ngữ, push, kiểm duyệt nội dung.
> Khi user nói "có gì đó sai" nhưng chưa gọi tên được, quét qua đây để chẩn đoán.
> Mỗi mục: **dấu hiệu → câu hỏi BA/Tester soi → cách chuẩn hoá**.

**Ngữ cảnh kỹ thuật:** `apps/api` (NestJS + TypeORM + PostgreSQL/PostGIS + Redis/BullMQ),
`apps/web` (Next.js App Router), `apps/mobile` (Expo). UI mặc định tiếng Anh, tiếng Việt
là ngôn ngữ thứ hai. Mọi mốc thời gian **lưu UTC**, hiển thị theo `Asia/Ho_Chi_Minh`.

---

## 1. Sai múi giờ — giờ sự kiện lệch so với giờ Đà Nẵng

**Dấu hiệu:** Sự kiện tạo lúc 19:00 hiển thị thành 12:00 (lệch đúng 7 tiếng), hoặc
sự kiện tối muộn bị xếp nhầm sang ngày hôm sau trong bộ lọc "Today". Bộ lọc
"This weekend" bỏ sót sự kiện tối thứ Sáu. Reminder push bắn sai giờ.

**Ví dụ trong Da Nang Connect:**
- `startAt` lưu là local string thay vì UTC `timestamptz` → mỗi lần đọc lại lệch 7h.
- Filter theo ngày cắt biên bằng `new Date().toISOString().slice(0,10)` (biên UTC),
  nên sự kiện 21:00 giờ Đà Nẵng rơi vào "ngày mai".
- Người dùng expat đặt máy ở múi giờ quê nhà → app hiển thị giờ theo máy chứ không
  theo giờ sự kiện diễn ra tại Đà Nẵng.
- Job nhắc "sự kiện bắt đầu sau 1 giờ" tính bằng giờ server → sai khi server chạy UTC.

**Câu hỏi soi:**
- Cột thời gian có phải `timestamptz` không, hay `timestamp` không timezone?
- Biên "ngày" của bộ lọc tính theo `Asia/Ho_Chi_Minh` hay theo UTC/giờ máy client?
- Giờ hiển thị cho user là **giờ nơi sự kiện diễn ra** (luôn là Đà Nẵng) — đã ghi rõ
  timezone cạnh giờ chưa?
- Sự kiện kéo dài qua nửa đêm được đếm vào ngày nào?

**Chuẩn hoá:** Lưu UTC, quy đổi ở tầng hiển thị bằng một helper duy nhất
(`formatEventTime`), không tự `new Date()` rải rác. AC bắt buộc có case biên:
"sự kiện 23:30 ngày X → vẫn thuộc bộ lọc ngày X", và một case user ở múi giờ khác.

---

## 2. RSVP quá chỗ — số người tham gia vượt `capacity`

**Dấu hiệu:** Sự kiện `capacity: 20` nhưng danh sách có 23 người `GOING`. Hai người
bấm "Join" cùng lúc ở chỗ cuối → cả hai đều thành công.

**Ví dụ trong Da Nang Connect:**
- Service làm `count()` rồi mới `insert()` — hai request xen kẽ giữa hai câu lệnh
  (check-then-act không có transaction/lock).
- Đếm chỗ trống bằng biến `attendeeCount` denormalized nhưng quên cập nhật khi có
  RSVP đến từ mobile.
- Giữ chỗ cho khách mời (+1 guest) nhưng chỉ trừ 1 slot.
- UI ẩn nút Join khi đầy, nhưng `POST /events/:id/rsvps` vẫn nhận.

**Câu hỏi soi:**
- Kiểm tra sức chứa nằm trong **cùng một transaction** với lệnh ghi RSVP chưa?
- Có `SELECT ... FOR UPDATE` trên hàng event, hoặc unique/partial index + đếm
  bằng câu lệnh atomic không?
- Có ràng buộc DB chặn RSVP trùng của cùng một user trên cùng một event không?
- Vượt sức chứa thì rơi vào `WAITLISTED` hay bị từ chối — spec nói gì?

**Chuẩn hoá:** Quy tắc sức chứa enforce ở tầng DB (transaction + lock hoặc constraint),
không chỉ ở service. AC: "GIVEN còn 1 chỗ WHEN 2 request Join đồng thời
THEN 1 thành công (`GOING`), 1 nhận `WAITLISTED` hoặc 409, tổng `GOING` ≤ capacity".
Test tải nhẹ bằng cách bắn song song nhiều request để tái lập.

---

## 3. Race khi huỷ RSVP — waitlist promote sai hoặc mất chỗ

**Dấu hiệu:** Một người huỷ, hai người trong waitlist cùng được đẩy lên `GOING`.
Hoặc ngược lại: có người huỷ nhưng waitlist không ai được lên, sự kiện còn chỗ trống
mà vẫn hiện "Full". Huỷ rồi Join lại ngay lập tức thì mất suất.

**Ví dụ trong Da Nang Connect:**
- Huỷ RSVP và promote người đầu waitlist nằm ở 2 transaction khác nhau → crash ở giữa
  làm chỗ bị "bốc hơi".
- Hai người huỷ gần như đồng thời → cùng đọc waitlist và cùng promote một người
  (người đó nhận 2 push "You're in!").
- Người huỷ vẫn nằm trong danh sách gửi reminder vì job đã enqueue trước đó.
- `attendeeCount` giảm nhưng trạng thái event vẫn kẹt ở `FULL`.

**Câu hỏi soi:**
- Huỷ + promote có nằm trong **một transaction duy nhất** không?
- Thứ tự waitlist xác định bằng gì (`createdAt` + tie-break ổn định)? Có bị đổi thứ tự
  khi hai người cùng thời điểm không?
- Sau khi huỷ, trạng thái dẫn xuất (`FULL` / số chỗ còn lại) có được tính lại không?
- Job/notification đã enqueue cho người vừa huỷ có bị huỷ hoặc bỏ qua khi chạy không?

**Chuẩn hoá:** Huỷ RSVP là một thao tác atomic gồm: đổi trạng thái → tính lại số chỗ →
promote waitlist → phát event realtime → enqueue push. AC: "2 lượt huỷ đồng thời trên
sự kiện có waitlist 5 người → đúng 2 người được promote, đúng 2 push được gửi".

---

## 4. Rò rỉ dữ liệu cá nhân — enforce sai tầng, lộ PII

**Dấu hiệu:** Thông tin cá nhân bị ẩn trên UI nhưng gọi thẳng API vẫn trả về. Danh sách
người tham gia lộ email/số điện thoại cho người chưa RSVP. Hồ sơ ẩn vẫn xuất hiện trong
kết quả tìm kiếm.

**Ví dụ trong Da Nang Connect:**
- `GET /events/:id` trả kèm `attendees[].email` và `attendees[].phone` cho mọi người xem.
- Endpoint hồ sơ trả `passwordHash`, `providerId`, `deviceTokens`, `lastKnownLocation`.
- Toạ độ chính xác nhà riêng của host bị trả về thay vì điểm hẹn công khai đã làm mờ.
- Người dùng đã chặn/bị chặn vẫn thấy nhau trong danh sách tham gia.
- Log/Sentry ghi nguyên payload chứa email và toạ độ.

**Câu hỏi soi:**
- Quyền enforce ở **controller/guard** hay chỉ ẩn ở UI?
- Response DTO là **allow-list các trường** hay `return entity` nguyên cục?
- Dữ liệu cá nhân nào thực sự cần cho tính năng này? (nguyên tắc tối thiểu hoá theo
  Nghị định 13/2023/NĐ-CP)
- Người dùng có kiểm soát được mức hiển thị hồ sơ (public / attendees-only / private) không?
- Toạ độ trả về là điểm hẹn công khai hay vị trí thật của cá nhân?

**Chuẩn hoá:** Mỗi endpoint có AC-Privacy: "người không đủ quyền → API trả 401/403 hoặc
bản rút gọn, không chỉ ẩn ở UI". Response luôn đi qua DTO allow-list. Tester phải test
thẳng đường API (`curl` / `cy.request`), không chỉ qua giao diện.

---

## 5. i18n thiếu key — hiện raw key thay vì text

**Dấu hiệu:** UI hiển thị `event.status.cancelled` hoặc `rsvp.waitlist.promoted`
thay vì câu dịch. Thường do thêm key vào `en.json` mà quên `vi.json` (hoặc ngược lại),
hoặc sai key path.

**Ví dụ trong Da Nang Connect:**
- Thêm trạng thái `WAITLISTED` → có bản EN → thiếu bản VI → chuyển sang tiếng Việt hiện key thô.
- Tên khu vực (My Khe, An Thuong, My An, Hai Chau, Son Tra, Ngu Hanh Son) hardcode
  tiếng Anh trong component thay vì lấy từ locale file.
- Nội dung push notification build bằng chuỗi cứng → luôn tiếng Anh dù user chọn tiếng Việt.
- Chuỗi có biến (`{{count}} people going`) thiếu dạng số nhiều ở một trong hai locale.
- Nội dung do người dùng tạo (mô tả sự kiện) bị đem đi dịch máy nhầm — UGC không dịch.

**Câu hỏi soi:**
- Key có mặt trong **cả hai** `en.json` và `vi.json` không?
- Key path có khớp đúng hierarchy với cách gọi `t('...')` không?
- Push/email có dùng locale của **người nhận** không, hay locale của server?
- Đã chuyển UI sang tiếng Việt và đi lại toàn bộ flow chưa?

**Chuẩn hoá:** Chạy checklist i18n sau mọi thay đổi UI: diff key giữa hai locale file
phải rỗng. Không hardcode chuỗi hiển thị. Tester luôn đổi ngôn ngữ khi verify.

---

## 6. Truy vấn địa lý sai bán kính — PostGIS trả kết quả vô lý

**Dấu hiệu:** Lọc "trong bán kính 2 km quanh An Thuong" trả về sự kiện ở Hội An, hoặc
trả về rỗng dù có sự kiện ngay cạnh. Khoảng cách hiển thị là số lạ (0.018 "km").

**Ví dụ trong Da Nang Connect:**
- Dùng `geometry` với SRID 4326 rồi `ST_DWithin(..., 2000)` → 2000 **độ**, không phải mét.
  Muốn tính bằng mét phải cast sang `geography` (hoặc chiếu về hệ mét).
- Đảo thứ tự toạ độ: `ST_MakePoint(lat, lng)` thay vì `ST_MakePoint(lng, lat)`.
- Bán kính nhận từ client không giới hạn trên → `radius=100000` quét cả nước (DoS nhẹ).
- Thiếu GIST index trên cột vị trí → truy vấn chậm dần khi dữ liệu tăng.
- Trộn hai cách lọc: lọc theo enum khu vực và lọc theo bán kính cho kết quả mâu thuẫn
  (một sự kiện thuộc `SON_TRA` nhưng nằm ngoài bán kính đang chọn).
- Sự kiện online / chưa có địa điểm bị loại khỏi mọi kết quả vì `location IS NULL`.

**Câu hỏi soi:**
- Cột là `geography(Point,4326)` hay `geometry`? Đơn vị của `ST_DWithin` ở đây là gì?
- Thứ tự tham số có đúng `(longitude, latitude)` không?
- Bán kính có bị clamp (ví dụ tối đa 50 km) và validate ở DTO chưa?
- Có GIST index chưa? `EXPLAIN ANALYZE` cho thấy index được dùng không?
- Sự kiện không có toạ độ được xử lý thế nào — ẩn hay hiển thị ở nhóm riêng?

**Chuẩn hoá:** Một helper duy nhất dựng truy vấn không gian; đơn vị luôn là mét trên
`geography`. AC-Boundary: "điểm cách đúng 1999 m → có trong kết quả bán kính 2 km;
điểm cách 2001 m → không". Test bằng toạ độ thật của các khu vực (My Khe ↔ Hai Chau).

---

## 7. Push notification gửi trùng — user nhận 2–3 lần cùng một thông báo

**Dấu hiệu:** Người dùng nhận 3 push "Event starts in 1 hour" cho cùng một sự kiện.
Hoặc nhận push cho sự kiện đã huỷ. Hoặc nhận trên 4 thiết bị cũ đã đăng xuất.

**Ví dụ trong Da Nang Connect:**
- Job BullMQ retry sau khi Expo trả lỗi mạng, nhưng push **đã gửi rồi** → gửi lại.
- Job reminder được enqueue lại mỗi lần host sửa sự kiện, không huỷ job cũ.
- Cùng một `deviceToken` lưu nhiều dòng cho cùng user (không unique) → mỗi dòng một push.
- Cả API và socket handler cùng bắn notification cho một hành động RSVP.
- Token `ExponentPushToken[...]` không còn hợp lệ (`DeviceNotRegistered`) nhưng không
  bị dọn khỏi DB → hàng đợi phình ra, tỉ lệ lỗi tăng.
- Push đã enqueue vẫn bắn sau khi sự kiện bị huỷ hoặc user đã huỷ RSVP.

**Câu hỏi soi:**
- Job có **idempotency key** (ví dụ `eventId:userId:reminder-1h`) và `jobId` cố định để
  BullMQ tự khử trùng không?
- Sửa/huỷ sự kiện có **huỷ job cũ** trước khi enqueue job mới không?
- `deviceToken` có unique constraint theo `(userId, token)` không?
- Trước khi gửi, có kiểm tra lại điều kiện hiện tại (event còn `PUBLISHED`, RSVP còn
  `GOING`) không, hay tin vào payload lúc enqueue?
- Phản hồi lỗi từ Expo (`DeviceNotRegistered`, `MessageTooBig`) có được xử lý và dọn token không?

**Chuẩn hoá:** Mọi push đi qua một service duy nhất có bảng khử trùng (đã gửi
`eventId + userId + kind` thì không gửi lại). Retry chỉ được phép khi biết chắc chưa gửi.
AC: "chạy lại job reminder 3 lần → user vẫn chỉ nhận 1 thông báo".

---

## 8. Trạng thái sự kiện không đồng bộ — transition sai hoặc dẫn xuất lệch

**Dấu hiệu:** Sự kiện `CANCELLED` vẫn cho RSVP. Sự kiện đã qua giờ kết thúc vẫn hiện
"Join now". Badge "Full" trong khi còn 3 chỗ. Danh sách của host và của người tham gia
hiển thị hai trạng thái khác nhau.

**Ví dụ trong Da Nang Connect:**
- Không có state machine: `DRAFT → PUBLISHED → COMPLETED / CANCELLED` không được validate,
  API cho phép `CANCELLED → PUBLISHED`.
- `FULL` là trạng thái lưu cứng trong DB thay vì suy ra từ `capacity` và số `GOING`
  → lệch sau khi có người huỷ.
- Sự kiện quá giờ không tự chuyển `COMPLETED` (không có job), nên vẫn nằm trong tab
  "Upcoming".
- Host huỷ sự kiện nhưng RSVP vẫn ở `GOING` → thống kê no-show tính nhầm.
- Đánh dấu `NO_SHOW` cho sự kiện chưa diễn ra → trust level của user bị trừ oan.

**Câu hỏi soi:**
- Có enum `EventStatus` / `RsvpStatus` với bảng transition hợp lệ rõ ràng không?
- Service có validate `currentStatus → nextStatus` trước khi ghi không?
- Trạng thái nào là **dẫn xuất** (`FULL`, `PAST`) — có đang bị lưu cứng và tự lệch không?
- Huỷ sự kiện có lan xuống RSVP, waitlist, job push và trust level không?
- Transition bị từ chối có được ghi AuditLog để audit không?

**Chuẩn hoá:** Vẽ state machine trong spec. AC liệt kê cả transition **không hợp lệ**:
"GIVEN event CANCELLED WHEN RSVP → THEN 422 Unprocessable". Trạng thái dẫn xuất luôn
tính tại thời điểm đọc, không lưu cứng.

---

## 9. Kiểm duyệt UGC bị bỏ qua — nội dung xấu lọt hoặc chặn nhầm

**Dấu hiệu:** Sự kiện spam/lừa đảo hiển thị công khai ngay. Báo cáo (report) của người
dùng không đi tới đâu. Nội dung bị gỡ vẫn còn trong cache/feed/kết quả tìm kiếm.

**Ví dụ trong Da Nang Connect:**
- Mobile tạo sự kiện qua endpoint khác, bỏ qua bước `PENDING_REVIEW` mà web có.
- Ảnh sự kiện upload thẳng lên S3 và trả public URL trước khi được duyệt.
- Nội dung bị gỡ vẫn còn trong feed do cache Redis không bị invalidate.
- Người bị chặn vẫn bình luận được vì kiểm tra block chỉ nằm ở tầng UI.
- Không có giới hạn tần suất → một tài khoản tạo 50 sự kiện trong 1 phút.

**Câu hỏi soi:**
- **Mọi** đường ghi UGC (web, mobile, API trực tiếp) có đi qua cùng một pipeline
  kiểm duyệt không?
- Nội dung chờ duyệt hiển thị cho ai (chỉ tác giả? host?) trước khi được duyệt?
- Gỡ nội dung có invalidate cache, feed, kết quả tìm kiếm và ảnh đã upload không?
- Có rate limit theo user cho hành vi tạo sự kiện / bình luận / report không?
- Hành động của moderator có ghi AuditLog kèm lý do không?

**Chuẩn hoá:** Kiểm duyệt là quy tắc ở tầng service/domain, không phải ở từng controller.
AC bắt buộc: "nội dung `PENDING_REVIEW` không xuất hiện trong feed công khai / tìm kiếm /
API list, kể cả gọi trực tiếp".

---

## 10. "Default useState lie" — UI hiện số đẹp nhưng là default, không phải data thật

**Dấu hiệu:** UI hiển thị số/trạng thái trông hợp lý ("0 events", "0 going", badge count)
nhưng thực ra là **giá trị default của `useState`** vì fetch fail âm thầm. Setter không
chạy → state kẹt ở default. User tin UI, debug sai hướng.

**Ví dụ trong Da Nang Connect:**
- Trang khám phá hiện "No events in An Thuong" vì request lỗi 401 âm thầm, thực tế có 8 sự kiện.
- Số người tham gia hiện `0` vì socket chưa kết nối, không phải vì chưa ai RSVP.
- Badge thông báo `0` do token hết hạn, silent 403.

**Câu hỏi soi:**
- Con số này tới từ **server response** hay **default state**?
- Khi fetch fail, UI rơi về đâu? Có phân biệt "đang tải" / "lỗi" / "thật sự rỗng" không?
- QA có cách nào phân biệt "khu vực này thật sự chưa có sự kiện" vs "query hỏng"?

**Chuẩn hoá:** Ba trạng thái tách bạch: `loading` ≠ `error` ≠ `empty (= 0 thật)`.
Lỗi phải hiển thị, không im lặng nuốt. AC bắt buộc 1 case "fetch fail → UI hiện lỗi,
KHÔNG hiện số/trạng thái mặc định".

---

## 11. Error UX mù — transient bị coi là permanent / message vô dụng

**Dấu hiệu:** Một blip mạng → màn hình lỗi vĩnh viễn, không nút thử lại, không tự recover.
Hoặc message kỹ thuật ("Network request failed", "500 Internal Server Error") hiện thẳng
cho người dùng cuối.

**Ví dụ trong Da Nang Connect:**
- Socket ngắt kết nối → danh sách người tham gia đóng băng, không báo gì.
- Join sự kiện fail do mạng → báo lỗi chung chung, không biết đã RSVP thành công hay chưa
  (người dùng bấm lại → nguy cơ trùng, xem mục 13).
- Upload ảnh sự kiện fail → mất toàn bộ form đã nhập.
- Mobile mất mạng khi đang ở màn hình sự kiện → trắng màn hình thay vì dùng dữ liệu cache.

**Câu hỏi soi:**
- Lỗi này **transient** (mạng/server tạm) hay **permanent** (auth/validation thật)?
- Transient có auto-retry + backoff? Permanent có dừng hẳn (không loop vô hạn)?
- Message có **actionable** và có bản EN lẫn VI không? ("Connection lost — Retry")
- Sau reconnect có reconcile lại dữ liệu không?

**Chuẩn hoá:** Mọi flow gọi network có AC lỗi bắt buộc: phân transient/permanent,
message actionable ở cả hai ngôn ngữ, đường retry rõ ràng, form không mất dữ liệu.

---

## 12. Realtime không reconcile sau reconnect

**Dấu hiệu:** Socket đứt rồi kết nối lại → UI kẹt dữ liệu cũ vì các event trong khoảng
mất kết nối bị miss và không có bước reconcile.

**Ví dụ trong Da Nang Connect:**
- Đóng tab 2 phút → mở lại → số người tham gia vẫn là con số cũ.
- Mobile foreground → background → foreground: danh sách sự kiện không refresh.
- Host huỷ sự kiện lúc client mất mạng → client vẫn thấy nút "Join".

**Câu hỏi soi:**
- Listener có `on('connect')` → fetch lại toàn bộ dữ liệu (reconcile-on-reconnect)?
- Mobile có `AppState` listener → refetch khi quay lại `active`?
- Dữ liệu realtime có nguồn sự thật duy nhất (server) khi hai bên lệch không?

**Chuẩn hoá:** Mọi realtime listener phải reconcile-on-reconnect và on-foreground.
AC có case "mất kết nối X giây rồi reconnect → dữ liệu tươi".

---

## 13. Idempotency — bấm 2 lần tạo bản ghi trùng

**Dấu hiệu:** Người dùng bấm "Join" hai lần khi mạng chậm → 2 RSVP. Host bấm "Publish"
hai lần → 2 sự kiện. Endpoint không idempotent.

**Ví dụ trong Da Nang Connect:**
- `POST /events/:id/rsvps` gọi lần 2 phải trả về RSVP hiện có (200/409), không tạo mới.
- Tạo sự kiện từ mobile khi mạng chập chờn → 2 sự kiện trùng tên, trùng giờ.
- Report cùng một nội dung 5 lần → 5 report cho moderator xử lý.

**Câu hỏi soi:**
- Lặp lại cùng một action có an toàn không?
- Nút có disabled + loading state sau click đầu không?
- DB có unique constraint (`eventId + userId` cho RSVP) không, hay chỉ chặn ở service?

**Chuẩn hoá:** Spec của mọi mutation phải nêu hành vi idempotent. AC: "gửi request 2 lần
trong 5 giây → request thứ 2 trả 409 hoặc 200 với bản ghi cũ, không tạo bản ghi mới".

---

## 14. AuditLog missing — mutation không được ghi log

**Dấu hiệu:** Create/Update/Delete thành công nhưng không có bản ghi trong activity log
→ audit trail trống → không trace được ai làm gì.

**Ví dụ trong Da Nang Connect:**
- Moderator gỡ một sự kiện → không log → không biết ai gỡ, vì lý do gì.
- Đánh dấu `NO_SHOW` làm giảm trust level → không log → không giải trình được với user.
- Host sửa giờ/địa điểm sát giờ diễn ra → không log → không đối chiếu được khiếu nại.

**Câu hỏi soi:**
- Service method có gọi `AuditLogService.log()` chưa?
- Log có đủ context: `actor`, `action`, `entityType`, `entityId`, `payload`, `reason`?
- Log có ở cả happy path lẫn edge case (bulk update, huỷ hàng loạt khi huỷ sự kiện)?
- Log có vô tình chứa PII không cần thiết không (xem mục 4)?

**Chuẩn hoá:** Rule cứng: **mọi mutation phải có AuditLog**. Review checklist grep
`AuditLogService` trong các service file có mutation.

---

## 15. Layout/overflow — nội dung dài phá vỡ flex

**Dấu hiệu:** Tên sự kiện hoặc tên người dài tràn ngang, đẩy nút ra ngoài viewport;
badge 3 chữ số phá layout hàng. Gốc thường là thiếu `min-width: 0` trên flex child.

**Ví dụ trong Da Nang Connect:**
- Tiêu đề "Sunday Morning Vietnamese–English Language Exchange at An Thuong" tràn card
  → che nút Join.
- Tên hiển thị có dấu tiếng Việt dài ("Nguyễn Thị Thanh Hương") phá hàng trong danh sách
  người tham gia.
- Số người tham gia 3 chữ số (`120/150`) phá chiều rộng cột.
- Tên khu vực dịch sang tiếng Việt dài hơn bản tiếng Anh → vỡ chip filter.

**Câu hỏi soi:**
- Input dài nhất thực tế (tiêu đề, tên, mô tả) render ra sao trong flex row?
- Có `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` và `min-width: 0` chưa?
- Đã test ở viewport mobile 375px chưa hay chỉ desktop?
- Đã test ở **cả hai** ngôn ngữ chưa (chuỗi VI thường dài hơn EN)?

**Chuẩn hoá:** AC-Boundary với input dài nhất hợp lệ, kiểm ở mobile 375px và ở cả EN lẫn VI.

---

## 16. Screenshot evidence discipline — đừng tin filename

**Dấu hiệu:** Screenshot được chụp và báo "đã verify" nhưng không ai đọc nội dung ảnh.
Ảnh thực ra là màn hình lỗi / màn login / trắng trơn.

**Quy tắc cứng:**
- Chụp screenshot → **Read file ngay** → verify nội dung thật.
- File name = nhãn, **nội dung ảnh = sự thật**.
- Ảnh không khớp expectation → **report rõ "evidence invalid"**, không giấu.
- Trước khi claim "đã verify flow" → phải có mô tả bằng chữ về cái thật sự nhìn thấy.

---

## Checklist nhanh khi rà 1 luồng (BA gap analysis + Tester sweep)

```
□ Timezone: lưu UTC, hiển thị Asia/Ho_Chi_Minh? Biên ngày của filter đúng chưa?
□ Capacity: 2 request Join đồng thời ở chỗ cuối → tổng GOING có vượt capacity không?
□ Cancel RSVP: huỷ + promote waitlist có atomic? Có promote trùng người không?
□ Privacy: PII enforce ở API (guard + DTO allow-list)? Toạ độ cá nhân có bị lộ?
□ i18n: key có đủ trong en.json + vi.json? Push dùng locale người nhận?
□ Geo: geography + mét? (lng, lat) đúng thứ tự? radius có clamp? có GIST index?
□ Push: có idempotency key? Sửa/huỷ event có huỷ job cũ? Token có unique?
□ Event status: transition invalid bị reject ở service? FULL/PAST là dẫn xuất?
□ UGC: mọi đường ghi đều qua pipeline kiểm duyệt? Gỡ có invalidate cache?
□ Số/trạng thái UI từ server hay default state? Fetch-fail rơi về đâu?
□ Error: phân transient/permanent? có retry? message actionable EN+VI?
□ Realtime: reconcile-on-reconnect + on-foreground?
□ Idempotent: bấm 2 lần có tạo bản ghi trùng không?
□ AuditLog: mutation có log đủ actor/action/entityId/reason?
□ Layout: input dài nhất có phá flex row ở mobile 375px, ở cả EN và VI?
□ Screenshot evidence: đã Read ảnh và mô tả thật sự thấy gì chưa?
```
