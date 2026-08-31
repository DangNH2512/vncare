# Radar "behavior chưa chuẩn chỉnh" — Da Nang Connect

> Catalog các lớp **hành vi-sai** mà domain (event · RSVP · địa lý · tin cậy) và
> kiến trúc (NestJS API + Next.js web + Expo mobile + PostGIS + BullMQ) này sinh ra
> một cách có hệ thống. Khi user nói "behavior chưa chuẩn" nhưng chưa gọi tên được,
> quét qua đây để chẩn đoán. Mỗi mục: **dấu hiệu → câu hỏi BA soi → cách chuẩn hoá**.
>
> Repo còn mới, nên phần lớn mục dưới là **rủi ro dự phòng** chứ chưa phải bug đã
> xảy ra. Khi một lớp lỗi thực sự xảy ra: bổ sung ví dụ thật + commit hash vào đúng
> mục, đó là cách file này lớn lên.

Nền nghiệp vụ: [`domain.md`](domain.md) · canon: [`docs/analysis/`](../../../../docs/analysis/).

---

## 1. Parity drift — hành vi lệch giữa API, web và mobile

**Dấu hiệu:** tính năng/behavior có ở `apps/web` nhưng thiếu/khác ở `apps/mobile`
(hoặc ngược lại). Hoặc rule chỉ sống ở một client, không sống ở `apps/api` — nên
client kia không có.

**Câu hỏi BA soi:**
- Hành vi này hiện diện ở cả `apps/web` lẫn `apps/mobile` chưa? Rule gốc nằm ở `apps/api` chứ?
- Cùng input → cùng output ở cả hai? Nếu khác, khác đó *chính đáng* (SEO chỉ web, push chỉ mobile) hay *bug*?
- Empty-state, error-state, loading-state có parity không (hay 1 phía thiếu)?
- Kiểu dữ liệu dùng chung đã nằm ở `packages/shared-types` chưa, hay mỗi client tự khai lại một enum?

**Chuẩn hoá:** Spec luôn có bảng "Cross-platform khác biệt". Khác biệt chính đáng
phải ghi lý do. Acceptance criteria có AC-Parity. Enum trạng thái (`RsvpStatus`,
`EventStatus`) chỉ được định nghĩa **một lần** ở `packages/shared-types`.

---

## 2. "Default state lie" — UI hiện số đẹp nhưng là default, không phải data thật

**Dấu hiệu:** UI hiển thị một con số/trạng thái trông hợp lý ("12 chỗ còn lại",
"0 người tham gia", badge count, "Joined") nhưng thực ra là **giá trị default của
`useState`** vì fetch fail âm thầm (response `{success:false}` hoặc 401 → setter
không chạy → state kẹt default). User tin UI, debug sai hướng.

Với sản phẩm này, lớp lỗi đó đặc biệt nguy hiểm ở **số chỗ còn lại**: user thấy
"còn chỗ" nên đi tới nơi, đến nơi mới biết đã đầy.

**Câu hỏi BA soi:**
- Con số này (`rsvp_going_count`, `spots_left`, số người trong waitlist) tới từ **server response** hay **default state**?
- Khi fetch fail, UI rơi về đâu? Có phân biệt "đang tải" / "lỗi" / "data thật = 0" không?
- Nút RSVP hiển thị trạng thái lạc quan (optimistic) rồi rollback thế nào khi server từ chối?
- Có cách nào user/QA phân biệt "thật sự hết chỗ" vs "fetch hỏng"?

**Chuẩn hoá:** Spec yêu cầu 3 state tách bạch: loading ≠ error ≠ empty(=0 thật).
Error state phải hiển thị (không im lặng nuốt). AC bắt buộc 1 case "fetch fail →
UI hiển thị lỗi, KHÔNG hiện số default". Optimistic update phải có AC rollback.

---

## 3. Error UX mù — transient bị coi là permanent / message vô dụng

**Dấu hiệu:** 1 blip mạng → màn hình đỏ "Authentication failed" / "Network request
failed", không nút thử lại, không tự recover, user phải force-quit. Hoặc message
kỹ thuật lọt ra UI. Người dùng thường ở ngoài đường bằng 4G — blip mạng là chuyện
thường ngày, không phải edge case.

**Câu hỏi BA soi:**
- Lỗi này là **transient** (mạng/server tạm) hay **permanent** (401/403 thật)? Có phân loại không?
- Access token hết hạn có tự `POST /api/v1/auth/refresh` rồi retry, hay đá thẳng user ra màn login?
- Transient có **auto-retry + backoff**? Permanent có **dừng** (không loop vô hạn)?
- Có nút "Try again" thủ công? App resume từ background có tự recover?
- Message có **key i18n** trong cả `en.json` lẫn `vi.json`, và có **actionable** ("You're offline — tap to retry") không?
- Mọi error response từ `apps/api` có `code` field (enum cứng) không, hay chỉ free-text?

**Chuẩn hoá:** Mọi flow gọi network → AC error bắt buộc, phân transient/permanent,
message có i18n key + actionable, `code` field ổn định để client map. Riêng luồng
auth: AC "token hết hạn giữa chừng → refresh trong suốt, user không thấy gì".

---

## 4. Privacy / trust enforce sai tầng — UI ẩn nhưng API vẫn lộ

**Dấu hiệu:** dữ liệu nhạy cảm bị ẩn ở UI/SSR nhưng gọi thẳng REST vẫn trả về.
`apps/mobile` gọi trực tiếp `apps/api` nên bypass được mọi thứ chỉ ẩn ở web.

Dữ liệu nhạy cảm cụ thể của sản phẩm này: **toạ độ chính xác của venue**, **danh
sách attendee**, **số điện thoại**, **email**, lịch sử tham gia, nội dung chat.

**Câu hỏi BA soi:**
- Rule visibility/trust enforce ở **tầng API** chưa, hay chỉ ẩn ở UI?
- `location_precision` áp dụng ở đâu — response DTO hay chỉ ở component bản đồ? Người chưa RSVP có lấy được toạ độ chính xác qua endpoint chi tiết không?
- Mọi surface đọc data người khác (profile, search, feed, attendee list, chat) dùng **cùng 1 visibility helper**?
- `blocks` có được tôn trọng ở *mọi* surface không (feed, attendee list, search, notification), hay chỉ ở chat?
- Token có scope đặc biệt (chat, media upload) thì lưu **riêng**, không lẫn vào slot access token chung?

**Chuẩn hoá:** AC-Privacy cho mọi data của người khác: "viewer không đủ trust
level → API trả `[]` / 403 / toạ độ đã làm mờ, không chỉ ẩn UI". Bàn giao qa-tester
để test **cả đường API trực tiếp**, không chỉ qua UI.

---

## 5. i18n drift — chuỗi hardcode, thiếu key, fallback im lặng

**Dấu hiệu:** UI mặc định tiếng Anh chạy ổn, chuyển sang `vi` thì hiện key thô
(`event.rsvp.full.message`), hiện tiếng Anh lẫn lộn, hoặc vỡ layout vì chuỗi Việt
dài hơn. Ngược lại: nội dung do organizer viết bị "dịch" nhầm bởi hệ thống.

**Câu hỏi BA soi:**
- Chuỗi mới có key trong **cả** `en.json` và `vi.json` chưa? Có test chặn key thiếu không?
- Fallback khi thiếu key là gì — hiện tiếng Anh (chấp nhận được) hay hiện key thô (bug)?
- Chuỗi này là **chrome hệ thống** (phải dịch) hay **nội dung user tạo** (giữ nguyên `content_locale`)? Đừng nhầm hai loại.
- Push notification gửi theo locale nào — locale thiết bị hay locale tài khoản?
- Định dạng ngày/giờ/số có theo locale không, hay hardcode `DD/MM/YYYY`?
- Chuỗi Việt dài hơn ~30% — có phá layout nút/badge không?

**Chuẩn hoá:** AC-i18n bắt buộc cho mọi màn hình có chuỗi mới: "mọi chuỗi hiển thị
có key ở `en.json` + `vi.json`; chuyển locale không hiện key thô, không vỡ layout".

---

## 6. Lệch múi giờ & lệch ngày

**Dấu hiệu:** sự kiện 20:00 giờ Đà Nẵng hiển thị 13:00; bộ lọc "tonight" bỏ sót sự
kiện lúc 23:30; nhắc lịch bắn sai giờ; sự kiện tối Chủ nhật rơi sang "tuần sau".
Gốc: trộn UTC với giờ địa phương, hoặc hardcode `+07`.

**Câu hỏi BA soi:**
- Mốc thời gian này lưu `timestamptz` (UTC) chứ? Chỗ hiển thị đổi sang `Asia/Ho_Chi_Minh` ở tầng nào — server hay client?
- Bộ lọc "today" / "tonight" / "this weekend" tính biên theo giờ địa phương của **ai**: thành phố (Đà Nẵng) hay thiết bị người dùng đang ở nước ngoài?
- Job nhắc lịch (BullMQ) tính "trước 3 giờ" từ mốc nào? Nếu worker chạy ở TZ khác thì sao?
- Sự kiện lặp lại sinh occurrence theo giờ địa phương hay theo khoảng UTC cố định?
- Hạn RSVP / hạn huỷ có bị lệch một ngày ở biên nửa đêm không?

**Chuẩn hoá:** Mọi spec có yếu tố thời gian ghi rõ: lưu UTC · hiển thị
`Asia/Ho_Chi_Minh` · biên bộ lọc tính theo giờ Đà Nẵng. AC có ít nhất 1 case biên
nửa đêm và 1 case người dùng đang ở múi giờ khác.

---

## 7. Truy vấn địa lý sai — đơn vị, SRID, cây phân cấp area

**Dấu hiệu:** "trong bán kính 2km" trả về cả thành phố hoặc trả về rỗng; lọc "An
Thượng" không ra sự kiện đã gán ward con; danh sách chậm dần khi dữ liệu tăng.

**Câu hỏi BA soi:**
- Cột là `geography(Point,4326)` hay `geometry`? Nếu `geometry`, `ST_Distance` trả **độ**, không phải mét — bán kính sẽ sai ~100.000 lần.
- Có index GIST trên cột vị trí chưa? Query dùng `ST_DWithin` (dùng được index) hay `ST_Distance(...) < x` (không dùng được)?
- Lọc theo `area_id` có bao gồm **area con** trong cây phân cấp không? Chọn "Sơn Trà" có ra sự kiện gán ở micro-area thuộc Sơn Trà không?
- `area_id` được gán **lúc ghi** chứ không tính lúc đọc? Nếu venue đổi toạ độ thì `area_id` có được cập nhật?
- Sự kiện online / chưa có địa điểm thì xuất hiện ở đâu trong bộ lọc theo khu vực?
- Sắp xếp kết quả theo gì: khoảng cách, thời gian, hay độ liên quan? Có deterministic không (tie-break) để phân trang không nhảy?

**Chuẩn hoá:** Spec tìm kiếm/lọc nêu rõ: đơn vị bán kính (mét), hành vi cây area,
tie-break khi sắp xếp, và hành vi với sự kiện không có toạ độ. AC có 1 case "sự
kiện cách 1.9km ở trong, cách 2.1km ở ngoài".

---

## 8. RSVP: tranh chấp sức chứa, double-action, waitlist

**Dấu hiệu:** hai người bấm RSVP cùng lúc vào chỗ cuối cùng → cả hai đều "going";
bấm RSVP hai lần tạo hai bản ghi hoặc đếm sai; huỷ RSVP nhưng waitlist không thăng
hạng; đếm hiển thị lệch với số bản ghi thật.

**Câu hỏi BA soi:**
- RSVP gắn vào `EventOccurrence` chứ không phải `Event` đúng không? (Sự kiện lặp lại là ca phổ biến nhất.)
- Sức chứa được kiểm dưới lock (`SELECT FOR UPDATE`) hay chỉ `SELECT` rồi `INSERT`?
- Mutation có nhận `Idempotency-Key`? Bấm 2 lần / retry sau timeout → kết quả giống hệt lần 1 chứ?
- Chuỗi RSVP → huỷ → RSVP lại có sạch không (không tạo bản ghi rác, đếm về đúng)?
- Huỷ RSVP → ai được thăng hạng từ waitlist, trong bao lâu, thông báo thế nào, và người đó có được từ chối không?
- Đếm phi chuẩn hoá (`rsvp_going_count`) do trigger duy trì — job đối soát chạy khi nào và làm gì khi phát hiện lệch?
- Đóng RSVP lúc nào: khi sự kiện bắt đầu, hay trước đó N giờ?

**Chuẩn hoá:** AC-Concurrency ("2 request đồng thời vào 1 chỗ cuối → đúng 1 thành
công, 1 nhận 409 + được mời vào waitlist"), AC-Idempotent, AC-Waitlist (thăng hạng
+ thông báo). Đây là lớp bug đắt nhất của sản phẩm — soi kỹ.

---

## 9. Vòng lặp kiểm duyệt chưa đóng

**Dấu hiệu:** user report xong không thấy gì xảy ra; nội dung bị xoá cứng nên mất
bằng chứng; moderator hành động nhưng không ai biết; người bị khoá không có đường
khiếu nại; nội dung đã ẩn vẫn lộ qua endpoint khác (search, feed, deep link, OG
image, sitemap).

**Câu hỏi BA soi:**
- Sau khi report: người report có nhận xác nhận không? SLA xử lý là bao lâu? Ai được biết kết quả?
- Hành động là **ẩn** (`status`) hay **xoá**? Có giữ được bằng chứng để khiếu nại không?
- Nội dung đã ẩn còn xuất hiện ở đâu: search index, feed cache, sitemap, OG preview, notification đã gửi?
- Mọi hành động của moderator/admin có ghi `audit_log` bất biến không?
- Người bị hạn chế/khoá thấy thông báo gì, và khiếu nại ở đâu?
- Tài khoản trust thấp bị đưa vào hàng đợi duyệt — hàng đợi có SLA không, hay listing nằm đó vô thời hạn?

**Chuẩn hoá:** Spec mọi surface UGC có mục "Moderation": trạng thái ẩn được, ai
thấy gì ở mỗi trạng thái, ghi audit, đường khiếu nại. AC-Moderation: "nội dung
`hidden` không xuất hiện ở BẤT KỲ surface public nào".

---

## 10. Thông báo & push — gửi trùng, gửi sai giờ, token chết

**Dấu hiệu:** user nhận 3 push giống nhau; push bắn 3h sáng; push tiếng Việt cho
người dùng tiếng Anh; bấm push không mở đúng màn hình; đã tắt notification vẫn
nhận; sự kiện huỷ nhưng nhắc lịch vẫn bắn.

**Câu hỏi BA soi:**
- Sự kiện nghiệp vụ này gửi cho **ai**, qua **kênh nào** (Expo Push · in-app · email · socket.io), và ở **locale nào**?
- Có khung giờ im lặng không? Nhắc lịch trước N giờ mà rơi vào 3h sáng thì sao?
- Job đã lên lịch có bị huỷ khi sự kiện bị huỷ / user huỷ RSVP / user block organizer không?
- Retry của BullMQ có gây gửi trùng không — có khoá idempotent theo `(user, event, kind)` chưa?
- `PushToken` hết hạn / bị thu hồi được dọn thế nào? Một user nhiều thiết bị thì sao?
- Deep link từ push mở đúng occurrence chứ không phải event cha?
- `NotificationPreference` được kiểm ở tầng nào — trước khi enqueue hay lúc gửi?

**Chuẩn hoá:** Spec có notification kèm bảng: trigger · người nhận · kênh · locale ·
khung giờ · điều kiện huỷ · khoá idempotent. AC: "huỷ sự kiện → nhắc lịch đã lên
lịch không được gửi".

---

## 11. Curated listing & claim — quyền sở hữu mập mờ

**Dấu hiệu:** curator đăng hộ, organizer gốc claim xong thì RSVP cũ biến mất; hai
bản ghi trùng cho cùng một sự kiện thật (một do curator, một do organizer tự
đăng); không rõ ai được sửa listing khi đang `unclaimed`.

**Câu hỏi BA soi:**
- Ở mỗi `claim_status`, ai được sửa/huỷ/nhắn tin cho attendee?
- Sau khi claim thành công, RSVP đã có **giữ nguyên** chứ? Người đã RSVP được thông báo đổi chủ không?
- Phát hiện trùng lặp: hai listing cùng venue + cùng khung giờ xử lý thế nào — merge, ẩn một cái, hay để cả hai?
- Listing curated có ghi rõ nguồn và "đã xin phép chưa" (`CuratedSource`) không? UI có nói rõ đây là listing đăng lại không?
- Nếu organizer gốc từ chối claim / yêu cầu gỡ thì luồng gỡ là gì và mất bao lâu?

**Chuẩn hoá:** Spec claim có state machine tường minh + ma trận quyền theo
`claim_status`. AC: "claim thành công → quyền chuyển giao, `rsvp_going_count` không đổi".

---

## 12. No-show, huỷ RSVP và trust level

**Dấu hiệu:** host đánh dấu no-show tuỳ tiện; user bị tụt trust mà không biết vì
sao; huỷ RSVP sát giờ bị phạt như không đến; trust score đổi nhưng UI không giải
thích.

**Câu hỏi BA soi:**
- Cửa sổ đánh dấu no-show là bao lâu sau khi sự kiện kết thúc? Sau đó khoá lại chứ?
- Huỷ RSVP **trước** hạn có bị tính là no-show không? Hạn đó là bao lâu trước giờ bắt đầu?
- User có thấy vì sao trust level của mình đổi không (`TrustSignal` hiển thị được)?
- Có đường khiếu nại no-show không? Ai xử?
- Host có bị giới hạn để không lạm dụng no-show làm vũ khí không?
- Trust level tụt thì mất quyền gì ngay lập tức, và user có được báo trước không?

**Chuẩn hoá:** Spec nêu rõ ngưỡng thời gian, ai hành động được trong cửa sổ nào,
tín hiệu hiển thị cho user, và đường khiếu nại. AC: "huỷ trước hạn → không sinh
`TrustSignal` âm".

---

## 13. Layout / overflow / tap target — vỡ chỉ ở mobile

**Dấu hiệu:** tên sự kiện dài tràn ngang đẩy layout; hàng badge (area · ngôn ngữ ·
giá) giãn cao bất thường; nút icon 32×32 khó bấm; chuỗi tiếng Việt dài hơn làm vỡ
nút. Gốc thường là thiếu `min-width: 0` trên flex child (web) hoặc phân bổ `flex`
sai chiều (mobile).

**Câu hỏi BA soi:**
- Field nào user nhập dài tuỳ ý (tên sự kiện, tên venue, bio, tag, tên hiển thị) được render trong flex row?
- Tên dài nhất hợp lệ render ra sao — truncate, wrap, hay tràn?
- Tap target ≥44×44 ở viewport 375×812 và 412×915 chứ? Media query mobile có vô tình ghi đè xuống nhỏ hơn không?
- Text < 16px trên iOS Safari gây focus-zoom khó chịu ở form tạo sự kiện?
- Behavior này quan trọng nhất ở mobile (RSVP nhanh khi đang đi đường) hay web (dashboard organizer)?

**Chuẩn hoá:** AC-Boundary với input dài nhất hợp lệ ở **cả `en` và `vi`**. AC
bắt buộc "tap target ≥44×44 ở viewport mobile 375×812 và 412×915".

⚠️ **BA + QA bài học:** mọi observation web phải làm ở viewport mobile **trước**.
Quan sát desktop chỉ để confirm parity sau khi mobile pass. Đảo ngược thứ tự = hide bug.

---

## 14. Seed vs Migration & vòng đời dữ liệu

**Dấu hiệu:** dữ liệu cấu hình hệ thống bị seed (mất khi reset), hoặc dữ liệu demo
bị đối xử như production. Xoá tài khoản làm mất luôn lịch sử tham gia của người khác.

**Câu hỏi BA soi:**
- Dữ liệu này khi launch prod có muốn tồn tại không? (Có → **migration**; Không → **seed**.) Cây `areas` Đà Nẵng và taxonomy hệ thống là migration.
- Xoá ở tầng nào: ẩn (`status`) → soft delete (`deleted_at`) → anonymize/hard delete? Xoá user thì RSVP cũ của họ hiển thị thế nào cho host?
- Dữ liệu cá nhân này có thật sự cần lưu không (Nghị định 13/2023/NĐ-CP)? Lưu bao lâu? Ai xoá được?
- Migration có đụng PostGIS / extension không — có cần bật extension trước khi chạy không?

**Chuẩn hoá:** Spec ghi rõ dữ liệu thuộc Seed hay Migration, chính sách lưu trữ và
đường xoá. Thay đổi schema → theo skill [`database-migrations`](../../database-migrations/SKILL.md).

---

## Checklist nhanh khi rà 1 luồng (in vào mọi gap analysis)

- [ ] Parity: API == web == mobile? (loading/empty/error/data đủ ở cả hai client?)
- [ ] Số/trạng thái UI từ server hay default state? Fetch-fail rơi về đâu?
- [ ] Error: phân transient/permanent? auto-refresh token? nút Try again? message có i18n key + actionable? có `code` field?
- [ ] Privacy/trust enforce tầng API? toạ độ chính xác & danh sách attendee lộ cho ai?
- [ ] i18n: key đủ ở `en.json` + `vi.json`? chuỗi Việt dài có vỡ layout?
- [ ] Thời gian: lưu UTC, hiển thị `Asia/Ho_Chi_Minh`? biên nửa đêm đúng chưa?
- [ ] Địa lý: `geography` + `ST_DWithin` (mét)? lọc area có bao gồm area con?
- [ ] RSVP: gắn vào occurrence? có lock sức chứa? idempotent? waitlist thăng hạng?
- [ ] Moderation: ẩn được mà không xoá? có `audit_log`? nội dung ẩn có lọt surface nào?
- [ ] Notification: đúng người · đúng kênh · đúng locale · đúng giờ · không trùng · huỷ được?
- [ ] Claim: quyền theo `claim_status` rõ chưa? RSVP giữ nguyên sau claim?
- [ ] No-show / huỷ: cửa sổ thời gian, khiếu nại, ảnh hưởng trust rõ chưa?
- [ ] Input dài nhất có phá layout? tap target ≥44×44?
- [ ] Dữ liệu mới: Seed hay Migration? chính sách lưu trữ & xoá theo Nghị định 13/2023/NĐ-CP?
