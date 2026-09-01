# Observe reality — nhìn app bằng mắt user (web + simulator)

> Reference dùng chung cho **qa-tester** và **business-analyst**.
>
> **Nguyên tắc cứng:** Spec / scope / acceptance criteria là *giả thuyết* về hành
> vi đúng — KHÔNG phải sự thật. Sự thật là cái **user thật sự thấy** khi mở app.
> *"Test pass nhưng thực tế chưa pass"* xảy ra khi ta tin màu xanh / tin doc thay
> vì mở app lên nhìn. Luôn xác minh bằng app thật trước khi kết luận "ổn".

Nhớ user thật là **expat ở Đà Nẵng**: UI mặc định tiếng Anh, phần lớn dùng điện
thoại, hay ở các khu My Khe / An Thuong / My An / Hai Chau / Son Tra / Ngu Hanh Son.
Quan sát bằng đôi mắt đó, không phải mắt dev ngồi máy bàn với locale VI.

---

## A. Web (`apps/web`) — drive bằng `preview_*` tools (canonical)

Harness ưu tiên `preview_*` cho dev server + verify. **KHÔNG dùng Bash hay
trình duyệt ngoài** cho việc này.

| Mục đích | Tool |
|---|---|
| Khởi/đảm bảo dev server (Next.js `apps/web`, mặc định :3000) | `preview_start` · `preview_list` |
| Reload (nếu không HMR) | `preview_eval` → `window.location.reload()` |
| Đọc **nội dung + cấu trúc thật** (text, có/không phần tử) | `preview_snapshot` |
| **Bằng chứng visual** (gửi user) | `preview_screenshot` |
| **Lỗi ngầm**: console error, fetch fail, 401/403/500 | `preview_console_logs` · `preview_logs` · `preview_network` |
| Giá trị CSS (overflow, layout vỡ khi chuỗi VI dài) | `preview_inspect` |
| Đi qua flow như user | `preview_click` · `preview_fill` |
| Responsive / dark / viewport mobile | `preview_resize` |

**Workflow quan sát web:**
1. `preview_start` (nếu chưa chạy). API `apps/api` phải chạy trước (mặc định :3001)
   cùng Postgres+Redis từ `ops/docker-compose.yml`, nếu không web sẽ chỉ hiện skeleton.
2. **`preview_resize { preset: "mobile" }` NGAY** — phần lớn user mở bằng điện thoại.
   Đo tap-target / layout ở desktop là **sai oracle**. Mobile 390×844 trước; tablet
   (768) + desktop (1280) test sau, không thay thế.
3. **Xác nhận locale = EN** (mặc định của sản phẩm). Chạy hết flow ở EN, rồi đổi sang
   VI và lặp lại các màn có chữ — chuỗi VI dài hơn ~20-30%, dễ tràn.
4. `preview_console_logs` + `preview_network` → bắt lỗi/fetch fail (KEY cho mục C).
5. `preview_snapshot` → xem content thật render ra.
6. `preview_click`/`preview_fill` → đi flow → `preview_snapshot` lại để xác nhận.
7. `preview_screenshot` → lưu evidence.
8. (Optional) lặp 4-7 ở `preset: "tablet"` rồi `"desktop"`.

⚠️ **Cẩn thận với DOM measurement** (`getBoundingClientRect`): nếu page vừa
navigate, element có thể chưa visible (width/height = 0). Scroll into view +
chờ 500-800ms trước khi đo. Element ngoài viewport → measurement = 0×0, dễ
nhầm với "bug đã fix".

⚠️ **Bản đồ (react-leaflet)** load tile bất đồng bộ. `preview_snapshot` có thể chụp
lúc bản đồ còn trắng. Chờ marker xuất hiện (hoặc assert qua danh sách kết quả bên
cạnh bản đồ) rồi mới kết luận "không có sự kiện nào ở khu này".

---

## B. Mobile (`apps/mobile`) — drive simulator bằng idb + simctl

Mobile không có preview tool → dùng Bash + `idb` + `xcrun simctl`.

- **App + sim:** dev-client build ở `apps/mobile/build-sim/`, chạy trên simulator
  iPhone (**iPhone 16** — bản Pro hay treo trên máy này).
- ⚠️ **App trỏ API theo `EXPO_PUBLIC_API_URL`.** Muốn test dữ liệu local phải có
  `apps/mobile/.env.local` trỏ về API localhost trước khi build/chạy — nếu không
  bạn đang test dữ liệu môi trường khác mà không biết.
- **Screenshot:** `xcrun simctl io booted screenshot /tmp/dnc-sim.png` → rồi `Read` ảnh đó.
- **Gesture/đăng nhập/nhập text:** `idb ui tap|swipe|text …`
  (text **chunk ≤4 ký tự** — idb rớt đuôi nếu dài).
- **Confirm code path chạy:** `console.log('[marker]')` → grep log Metro
  (`/tmp/dnc-metro.log`). Marker in = code chạy; không in = Fast Refresh chưa ăn
  (force reload `curl -X POST http://localhost:8081/reload`).
- **Permission là một phần của flow**, không phải nhiễu: Da Nang Connect xin
  **location** (lọc sự kiện quanh đây) và **notification** (nhắc sự kiện, đổi trạng
  thái waitlist). Test cả 2 nhánh allow/deny — deny KHÔNG được làm app kẹt.
- ⚠️ **Maestro XCUITest hay chết trên máy này** → idb là đường tin cậy để *nhìn*.

**Verify-before-claim:** chỉ nói "đã pass / fix đã apply" khi có **evidence**:
marker trong log Metro, HOẶC screenshot thấy visual mới, HOẶC idb test behavior.
"Code đã save, sẽ apply qua Fast Refresh" = OK nói. "Đã pass" = cần bằng chứng.

### ⚠️ Screenshot trustability — Read NGAY sau chụp

Đừng trust file name. Sim có thể đổi trạng thái giữa các thao tác (token hết hạn,
logout, app crash, deep-link route không tồn tại).

**Quy tắc cứng:**
1. Chụp → `Read <path>.png` ngay → verify visual content khớp expectation.
2. File name = label, **visual content = fact**. Nếu lệch → mark invalid evidence,
   re-test hoặc note rõ trong report (KHÔNG bury).
3. Trước khi sweep nhiều màn, **verify auth state** bằng 1 screenshot reference
   (ví dụ tab Events). Nếu ra màn đăng nhập → đăng nhập lại trước khi sweep tiếp.
4. **Che dữ liệu cá nhân** trước khi đưa ảnh vào doc/report: thông tin liên hệ, toạ
   độ nhà, danh sách người tham gia.

Áp dụng cho cả web `preview_screenshot` — nếu trang chưa load xong, screenshot có
thể chỉ là white screen / loading state. Tốt nhất `snapshot` trước (accessibility
tree text-based) để confirm content rồi mới screenshot làm bằng chứng visual.

---

## C. Triangulate — bắt "default useState lie"

**Đừng tin con số/trạng thái trên UI.** Nó có thể là **default state** vì fetch fail
âm thầm (response lỗi → setter không chạy → state kẹt default trông-như-thật).

Khi UI hiển thị số/trạng thái từ fetch, so **3 nguồn**:

```
   UI (preview_snapshot / screenshot)
        ↕  khớp?
   API response (preview_network / curl endpoint với Bearer)
        ↕  khớp?
   DB / env thật (psql: SELECT count(*) FROM ...; docker compose exec api env | grep X)
```

Lệch bất kỳ đâu = bug. Ví dụ điển hình của sản phẩm này: màn chi tiết sự kiện hiện
**"12 spots left"** trong khi `GET /events/:id` trả 403 (token hết hạn) → "12" là số
mặc định trong component, không phải số thật. Nếu chỉ assert "có hiện số" → test
XANH nhưng app SAI. Tương tự với danh sách waitlist, badge trust level, số người đã
RSVP.

Kiểm chứng phía DB cho truy vấn khu vực:

```sql
-- Sự kiện trong bán kính 2km quanh một điểm ở An Thuong (SRID 4326, đo bằng mét)
SELECT id, title FROM events
WHERE ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, 2000);
```

Số dòng ở đây phải khớp số kết quả API và số thẻ hiện trên UI. Lệch = sai SRID, sai
đơn vị, hoặc filter khu vực đang lọc bằng chuỗi tên thay vì hình học.

---

## D. Nhìn bằng mắt user — exploratory checklist (cái spec KHÔNG nói)

Sau khi mở app, quét những thứ assertion thường bỏ sót. Hỏi: *"Một expat mới đến Đà
Nẵng 2 tuần nhìn màn này có hiểu / có bực không?"*

- [ ] **Ngôn ngữ:** UI mở lên có đúng EN mặc định không? Có chỗ nào lòi tiếng Việt
      cứng (hoặc lòi i18n key thô) không?
- [ ] **Ảnh/avatar:** placeholder giả? Ảnh sự kiện HTTP 200 nhưng rỗng → `onError`
      không fire → kẹt.
- [ ] **Overflow:** tên sự kiện / bio / tên khu vực dài (và bản dịch VI) có tràn
      ngang, đẩy layout, chip khu vực giãn cao?
- [ ] **Error wall:** full-screen "Authentication error" / "Network request failed"
      KHÔNG có nút thoát?
- [ ] **Số "trông hợp lý nhưng sai"** — spots left, số người trong waitlist, trust
      level (default state — xem mục C)?
- [ ] **3 state lẫn lộn:** loading vs empty (thật sự 0 sự kiện ở khu này) vs error —
      nhìn có phân biệt được không?
- [ ] **Ngày giờ:** giờ sự kiện có đúng `Asia/Ho_Chi_Minh` không? Sự kiện 00:30 có bị
      lệch sang ngày hôm trước?
- [ ] **Tap target ≥44px?** Nút RSVP / Cancel / Report có đủ to để bấm một tay?
- [ ] **Parity:** mở cùng màn trên web vs mobile — nhìn có khác bất thường?
- [ ] **Quyền:** từ chối location/notification → app vẫn dùng được (fallback: chọn
      khu vực bằng tay), hay kẹt màn trắng?
- [ ] **Riêng tư:** màn công khai có lộ thông tin liên hệ / toạ độ chính xác của
      người tổ chức hoặc người tham gia không?
- [ ] **Kiểm duyệt:** sự kiện/bài đang `pending` có lọt ra feed công khai không?
- [ ] **Cảm giác:** chậm, giật, nhấp nháy, nhảy layout khi load danh sách sự kiện?
- [ ] **Đi LẠC flow** như user vụng: bấm RSVP hai lần thật nhanh, back giữa chừng,
      refresh lúc đang trong waitlist, bật/tắt mạng giữa chừng — app có vỡ không?

Cái tìm thấy ở đây thường KHÔNG có trong spec → đó chính là "behavior chưa chuẩn".

---

## E. Khi quan sát ≠ spec / ≠ test xanh

- **App ≠ spec** → spec sai HOẶC app drift. **Báo ra, KHÔNG viết test codify cái
  sai.** Nếu hành vi đúng còn mơ hồ → bàn `business-analyst` chốt trước.
- **Test xanh nhưng app hỏng** → test đang assert *shape/implementation* thay vì
  *behavior user thấy*. Sửa test để assert cái quan sát được (nội dung hiển thị, ảnh
  render, response code), không phải sự tồn tại của 1 selector.
- **Mọi kết luận pass/fail kèm evidence** (screenshot/log). Không "chắc là ổn".

---

## F. Reconcile với GENERATE-ONLY

| Việc | Được? |
|---|---|
| **Mở browser/sim quan sát** (preview_*, snapshot, screenshot, idb, 1 `preview_eval`) | ✅ LUÔN — đây KHÔNG phải "chạy test suite" |
| Chạy 1 targeted spec để verify rồi NHÌN kết quả | ✅ khi cần / user OK |
| Chạy full Playwright suite, toàn bộ `maestro test`, test cả monorepo | ❌ chỉ khi user nói rõ "chạy full" |
| Build lại sim / deploy / chạy migration trên DB thật | ❌ chỉ khi user yêu cầu |

"Sinh test, không tự chạy" = nói về **regression suite nặng**, KHÔNG cấm nhìn app.
Quan sát reality là rẻ + giá trị cao → làm thường xuyên.
