# Test design — kỹ thuật + ma trận Da Nang Connect + risk-class sweep

> Đây là phần "nghĩ" trước khi "code". Mục tiêu: từ 1 feature/acceptance-criteria
> sinh ra **bộ case đủ rộng nhưng không thừa**, rồi sweep các lớp rủi ro đặc thù của
> Da Nang Connect. Output = bảng TC-ID (xem template ở `run-and-report.md`).

---

## A. Suy test case từ acceptance criteria

Nếu business-analyst đã chốt AC (bảng Given/When/Then) → **mỗi AC-ID đẻ ra ≥1 TC-ID**:

- AC-Happy → TC happy path (assert kết quả quan sát được trong "Then").
- AC-Edge/Boundary → TC biên (sự kiện đầy chỗ, waitlist rỗng, hạn huỷ sát giờ).
- AC-Error → TC transient/lỗi (assert message + recovery).
- AC-Parity → cùng TC chạy cả web (Playwright) + mobile (Maestro).
- AC-Privacy → TC gọi thẳng API với viewer không đủ quyền (người bị chặn, người
  ngoài sự kiện riêng tư).
- AC-i18n → cùng TC chạy locale EN rồi VI.

Giữ truy vết `AC-ID ↔ TC-ID` trong test-case doc (cột hoặc note) để ai cũng biết
test nào chứng minh AC nào.

Chưa có AC? Suy hành vi đúng từ `docs/features/<feature>.md` + source + test cũ —
nhưng nếu hành vi mơ hồ, **nhờ business-analyst chốt trước** (đừng tự bịa oracle).

---

## B. Các chiều sinh case (techniques)

Áp cho mỗi hành vi:

| Chiều | Hỏi gì | Ví dụ Da Nang Connect |
|---|---|---|
| **Happy path** | Luồng đúng phổ biến nhất | Đăng ký → onboarding chọn khu vực + sở thích → thấy feed sự kiện gần đó; tạo sự kiện → chờ duyệt → hiển thị |
| **Equivalence partitions** | Nhóm input cho cùng kết quả, test 1 đại diện/nhóm | vai trò `member` vs `organizer` vs `moderator` vs khách chưa đăng nhập |
| **Boundary** | Min/max/rỗng/1/nhiều | capacity 1 chỗ cuối cùng; waitlist 0 vs 1 vs nhiều; mô tả sự kiện 0 vs độ dài tối đa; bán kính 0.1km vs 50km; sự kiện bắt đầu đúng lúc này |
| **Negative** | Input sai/thiếu/sai quyền | thiếu field → 400; chưa đăng nhập → 401; RSVP sự kiện đã kết thúc → 409; tự báo cáo chính mình → 400 |
| **Error / Transient** | Mạng/server hỏng tạm | mất Wi-Fi giữa lúc RSVP; API 5xx; timeout; app wake từ background; tile bản đồ không load |
| **State transitions** | loading → empty → error → data; toggle | `going → cancelled → going`; `waitlist → promoted → going`; sự kiện `draft → pending → published → cancelled` |
| **Idempotency** | Lặp action / đảo chiều | bấm RSVP 2 lần thật nhanh; huỷ 2 lần; báo cáo cùng một nội dung 2 lần |
| **Parity** | web == mobile? | cùng input → cùng output ở `apps/web` và `apps/mobile` |
| **i18n EN/VI** | Đổi locale có vỡ gì không | thiếu key; chuỗi VI tràn nút; định dạng ngày/số theo locale; locale giữ sau reload |
| **Geo / PostGIS** | Truy vấn không gian đúng chưa | lọc theo khu vực vs lọc theo bán kính; điểm nằm đúng biên; SRID 4326; đơn vị mét |
| **Security/Privacy** | Quyền, scope, lộ data | người bị chặn gọi thẳng API vẫn xem được profile? danh sách người tham gia lộ liên hệ? |
| **SEO** (web public only) | SSR, metadata, 404 | `/events/[slug]` với slug giả → `notFound()` (HTTP 404, không soft-200); OG image + metadata theo locale |

Không cần mọi chiều cho mọi feature — chọn chiều **liên quan**. Nhưng **Happy +
Negative + Error + Parity + i18n** gần như luôn cần.

---

## C. Risk-class sweep — checklist BẮT BUỘC mỗi feature

Đây là các lớp lỗi mà kiến trúc + nghiệp vụ của Da Nang Connect dễ sinh ra nhất. Mỗi
feature mới phải có case quét những cái **áp dụng được**. Khi phát hiện lớp mới →
bổ sung vào đây.

### 1. RSVP · capacity · waitlist
- [ ] **Race chỗ cuối:** 2 request RSVP đồng thời vào sự kiện còn 1 chỗ → đúng 1
      thành công, người kia vào waitlist. Test ở tầng API (song song thật), không
      chỉ ở UI.
- [ ] **Huỷ → tự động promote** người đầu waitlist; người được promote nhận push +
      thấy trạng thái đổi ở cả web và mobile.
- [ ] **Idempotent:** RSVP 2 lần không tạo 2 bản ghi, `attendeeCount` không nhảy đôi.
- [ ] **Huỷ rồi RSVP lại:** không tạo dòng trùng, không tụt xuống cuối waitlist một
      cách bất ngờ (hành vi đúng phải do business-analyst chốt và test đúng theo đó).
- [ ] **Hạn huỷ:** huỷ sau deadline → chặn hoặc tính no-show, đúng theo AC.
- [ ] **Sự kiện bị huỷ/đổi giờ:** mọi người đã RSVP (kể cả waitlist) được thông báo.
- [ ] **Capacity giảm xuống dưới số người đang going** → xử lý xác định, không im lặng.

### 2. Truy vấn địa lý (PostGIS)
- [ ] Bán kính đo bằng **mét** trên `geography`, không phải độ trên `geometry`
      (`ST_DWithin(location::geography, point::geography, 2000)`).
- [ ] **SRID 4326** nhất quán ở migration, entity TypeORM và query.
- [ ] Thứ tự **(lng, lat)** trong `ST_MakePoint` — đảo là ra giữa biển, test bằng một
      toạ độ thật ở Đà Nẵng.
- [ ] Điểm **đúng trên biên** bán kính → quyết định bao gồm/loại trừ nhất quán.
- [ ] Lọc theo **khu vực** (My Khe, An Thuong, My An, Hai Chau, Son Tra, Ngu Hanh Son)
      cho kết quả nhất quán với lọc theo bán kính quanh cùng điểm — không được lệch
      kiểu "khu này có 3 sự kiện nhưng bán kính 1km ra 0".
- [ ] Sự kiện **không có toạ độ** (online / chưa chốt địa điểm) không làm vỡ query.
- [ ] **Index không gian** có được dùng không (`EXPLAIN` thấy index scan) — thiếu
      index thì feed sẽ chậm dần theo dữ liệu.

### 3. Timezone & vòng đời dữ liệu
- [ ] Lưu **UTC**, hiển thị **`Asia/Ho_Chi_Minh`**. Sự kiện 00:30 giờ VN không được
      hiển thị lùi 1 ngày.
- [ ] Bộ lọc "hôm nay / cuối tuần này" tính theo ngày **giờ VN**, không theo UTC.
- [ ] Sự kiện đã qua rơi khỏi feed đúng mốc, không sớm/muộn 7 tiếng.
- [ ] Dữ liệu test là seed (`isSeedData` / prefix `qa_`) — không đụng dữ liệu thật.

### 4. i18n EN/VI
- [ ] Mọi chuỗi hiển thị đi qua i18n, **không hard-code**.
- [ ] Không thiếu key ở cả 2 locale (thiếu → hiện khoá thô = P1).
- [ ] Đổi locale giữa chừng flow: UI đổi ngay, state/RSVP không mất, reload vẫn giữ.
- [ ] Chuỗi VI dài hơn → assert layout ở locale VI (nút, tab, chip khu vực, badge).
- [ ] Ngày/giờ/số nhiều format theo locale (`1 spot left` vs `còn 1 chỗ`).
- [ ] Nội dung do người dùng nhập (tên sự kiện, mô tả) **không bị dịch** — chỉ chrome
      của app đổi ngôn ngữ.

### 5. Push notification (Expo)
- [ ] Đăng ký token khi cấp quyền; **từ chối quyền không làm app kẹt**.
- [ ] Không gửi **trùng** (nhắc sự kiện gửi 2 lần), không gửi cho người **đã huỷ** RSVP.
- [ ] Token hết hạn / `DeviceNotRegistered` → dọn token, không retry vô hạn.
- [ ] Nội dung push theo **locale của người nhận**, không theo locale của người tạo.
- [ ] Tap vào push → deep-link đúng màn sự kiện (kể cả khi app đang bị kill).
- [ ] Job gửi (BullMQ) idempotent: chạy lại job không gửi lại cho người đã nhận.

### 6. Kiểm duyệt UGC & an toàn cộng đồng
- [ ] Nội dung `pending`/`rejected` **không lọt** ra bất kỳ endpoint công khai nào
      (feed, tìm kiếm, sitemap, OG metadata).
- [ ] **Báo cáo vi phạm**: tạo được, không tự báo cáo mình, báo cáo trùng gộp lại,
      người báo cáo không bị lộ cho người bị báo cáo.
- [ ] **Chặn người dùng (block)** enforce ở **tầng API**, không chỉ ẩn trên UI: người
      bị chặn gọi thẳng endpoint vẫn phải bị từ chối; không thấy sự kiện, không RSVP
      vào sự kiện của người đã chặn mình, không gửi được tin nhắn/bình luận.
- [ ] Chặn là **hai chiều** theo AC đã chốt, và có hiệu lực ngay (kể cả socket đang mở).
- [ ] Hành động của moderator có **audit trail**, và không moderator nào tự duyệt nội
      dung của chính mình.

### 7. Trust level & no-show
- [ ] Quy tắc cộng/trừ điểm chạy **đúng một lần** cho mỗi sự kiện (không cộng trùng
      khi huỷ rồi RSVP lại).
- [ ] No-show chỉ tính sau khi sự kiện kết thúc, và chỉ cho người ở trạng thái going.
- [ ] Trust level ảnh hưởng quyền (ví dụ được tạo sự kiện, được bỏ qua duyệt) → test
      cả biên dưới và biên trên.
- [ ] Trust level hiển thị nhất quán ở web, mobile và trong API response.

### 8. Privacy (Nghị định 13/2023/NĐ-CP)
- [ ] Response công khai **không lộ** thông tin liên hệ, ngày sinh, toạ độ chính xác
      nhà ở; chỉ lộ khu vực ở mức đã đồng ý.
- [ ] Danh sách người tham gia chỉ hiện với người có quyền theo AC.
- [ ] Có luồng **xoá tài khoản / xuất dữ liệu**, và xoá thật sự gỡ dữ liệu cá nhân
      khỏi các surface công khai.
- [ ] Log/analytics/Sentry không nuốt PII (tên, liên hệ, toạ độ) vào payload.

### 9. Transient bị misclassify thành lỗi vĩnh viễn
- [ ] Flow có gọi network? → ngắt mạng giữa chừng → **phải** có retry/backoff hoặc
      nút "Try again", KHÔNG full-screen "Authentication error" vĩnh viễn.
- [ ] Error response có `code` field (enum), không chỉ free-text.
- [ ] Transient (`NETWORK_FAIL`/`TIMEOUT`/`SERVER_ERROR`) retry; permanent
      (`AUTH_FAILED`/`FORBIDDEN`) KHÔNG retry (tránh loop).
- [ ] Message hiển thị user là **tiếng Anh actionable** ở locale mặc định
      ("You're offline — tap to retry"), có bản VI tương ứng.
- [ ] (mobile) app resume từ background + state=error → tự recover; refresh token
      hết hạn được đổi mới im lặng, không đá user ra màn đăng nhập.

### 10. "default useState lie"
- [ ] Số/trạng thái trên UI lấy từ **API response** hay **default state**?
- [ ] Ép fetch fail (401/403/500) → UI **phải** hiện trạng thái lỗi, KHÔNG hiện số
      mặc định trông-như-thật (vd "12 spots left" khi thật ra request hỏng).
- [ ] Cách test API-level: gọi endpoint với Bearer → so số UI vs số API vs số trong DB.

### 11. Render-text nhân bản nhiều surface
- [ ] Trạng thái/nhãn mới (waitlist, promoted, no-show, pending review) hiển thị đúng
      ở **tất cả** surface: web list + web detail + mobile + push + email nhắc lịch,
      không fallback về chuỗi chung chung.

### 12. Layout overflow & tap target
- [ ] Input dài nhất hợp lệ (tên sự kiện, bio, tên địa điểm, URL) render không phá
      layout — test ở **cả EN và VI**, ở viewport mobile.
- [ ] Mọi phần tử tương tác `getBoundingClientRect()` ≥ 44×44 ở viewport mobile
      (390×844). Anchor inline trong đoạn văn có thể exempt (note rõ).
- [ ] Media query mobile không downsize nút xuống dưới 44px.

### 13. Cross-platform parity
- [ ] Mọi case happy/error/empty có bản web **và** mobile? Khác biệt → chính đáng +
      ghi rõ lý do trong test-case doc.

---

## D. Priority (gắn cho mỗi TC)

| P | Nghĩa | Ví dụ |
|---|---|---|
| **P0** | Chặn dùng / mất data / lộ dữ liệu cá nhân / bypass an toàn | không đăng nhập được; block không có hiệu lực ở API; lộ liên hệ người tham gia; RSVP quá capacity |
| **P1** | Sai chức năng chính, user khó chịu | waitlist không promote; thiếu i18n key; push gửi trùng; lệch timezone 1 ngày |
| **P2** | Edge hiếm / cosmetic | overflow tên cực dài; copy empty-state; thứ tự chip khu vực |

Sinh P0+P1 trước. P2 khi có thời gian / user yêu cầu kỹ.

---

## E. Khi UI thiếu hook để assert

Playwright assert qua `getByRole`/`getByTestId`; Maestro assert qua `testID`.
Nếu thiếu → **đừng assert mò**. Ghi trong test-case doc: *"cần thêm
`data-testid="x"` ở `<file>` để test TC-Y"*, và (nếu nhỏ + rõ) thêm luôn vào source.

Hai lưu ý riêng của sản phẩm này:
- **Đừng assert bằng chuỗi hiển thị** — đổi locale EN↔VI là đỏ giả. Dùng testID, hoặc
  resolve i18n key trong test.
- Mobile tab nav phải dùng **deep-link** (`danangconnect://events`) vì Expo Router
  không fire `onPress` cho `tapOn id: tab-*`.
