---
name: mockup-builder
description: Dựng mockup HTML tương tác, tự chứa cho Da Nang Connect (mobile + web) để demo/duyệt thiết kế TRƯỚC khi viết code production. Tái sử dụng design token đã chốt của dự án và bám đúng các màn hình lõi Giai đoạn 1 (event feed, event detail, bộ lọc khu vực, hồ sơ người dùng). LUẬT CỨNG — sau khi tạo hoặc sửa bất kỳ mockup nào BẮT BUỘC phải mở nó lên và xác nhận render được bằng ảnh chụp màn hình trước khi báo done.
---

# Mockup Builder

Dùng skill này khi người dùng yêu cầu **lên kế hoạch / trình bày / thiết kế một
màn hình hay tính năng dưới dạng mockup** (mobile và/hoặc web) để review trước khi
triển khai. Mockup là tài liệu demo nằm trong `docs/mockups/` — **không bao giờ là
code production**.

## 🔴 Luật bất di bất dịch — MỞ LÊN + XÁC MINH sau mỗi lần tạo/sửa

> Sau khi tạo HOẶC sửa một mockup, bạn **bắt buộc**:
> 1. **Mở cho người dùng xem**: `open "docs/mockups/<file>.html"` (trình duyệt mặc định macOS).
> 2. **Xác minh nó thực sự render** (thực tế là trọng tài — mockup mở ra trắng trơn hoặc vỡ là thất bại):
>    - Chụp headless:
>      `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=1280,1000 --screenshot=/tmp/mk.png "file://$PWD/docs/mockups/<file>.html"`
>    - **Đọc file PNG** và xác nhận hình ảnh khớp với ý đồ. PNG bé bất thường
>      (≈20–30KB) thường có nghĩa là trang trắng hoặc vỡ.
> 3. Chỉ khi đó mới báo done. Không bao giờ khẳng định mockup chạy được chỉ bằng cách đọc code.

Luật này tồn tại vì một lần va tên class đã khiến cả mockup web render thành một
hình chữ nhật đỏ khổng lồ, và nó vẫn được báo "done" mà không ai nhìn vào.

## Dùng khi nào và không dùng khi nào

- **Dùng:** "cho xem mockup", "thiết kế màn hình X", "lên plan + mockup", duyệt
  thiết kế với stakeholder, khám phá UX trước khi viết spec.
- **Không dùng:** triển khai tính năng thật (đi qua pipeline thường vào `apps/`),
  hoặc câu hỏi wireframe chỉ cần trả lời bằng chữ.

## Đầu ra

- Mockup mobile: `docs/mockups/<feature>-mobile-mockup.html`
- Mockup web: `docs/mockups/<feature>-web-mockup.html`
- Cập nhật `docs/mockups/README.md` (bảng file + mô tả một dòng).
- Nếu đây là một hướng sản phẩm thật, kèm theo bản plan trong `docs/product/`.

## Bộ mockup lõi của Giai đoạn 1

Bốn màn hình dưới đây là xương sống sản phẩm. Mockup mới nên bám hoặc mở rộng chúng:

| Màn hình | File | Nội dung phải có |
|----------|------|------------------|
| Event feed | `docs/mockups/event-feed-mobile-mockup.html` | Card sự kiện (ảnh/gradient, tiêu đề, ngày giờ theo `Asia/Ho_Chi_Minh`, tên khu vực, số chỗ còn lại, avatar host + badge trust level), chip lọc nhanh, pull-to-refresh giả lập |
| Event detail | `docs/mockups/event-detail-mobile-mockup.html` | Header ảnh tràn viền, mô tả, bản đồ mini + địa chỉ, danh sách người tham dự, nút RSVP đổi trạng thái (Going / Interested / Waitlisted), nút Report nội dung |
| Bộ lọc khu vực | `docs/mockups/area-filter-web-mockup.html` | Bản đồ Đà Nẵng + chip 6 khu vực (My Khe, An Thuong, My An, Hai Chau, Son Tra, Ngu Hanh Son), thanh trượt bán kính, lọc theo danh mục và khoảng thời gian, đồng bộ hai chiều giữa bản đồ và danh sách |
| Hồ sơ người dùng | `docs/mockups/user-profile-mobile-mockup.html` | Avatar, quốc tịch/ngôn ngữ, badge trust level (new / verified / trusted), tỉ lệ tham dự và no-show, sự kiện đã host, nút Verify identity |

Đọc mockup gần nhất đã có trước khi dựng cái mới và copy nguyên `:root` tokens +
component dùng chung. Nếu chưa có mockup nào, khối token dưới đây là nguồn chân lý.

## Design system — tái sử dụng, đừng bịa lại

**Token mobile** (soi gương theme của `apps/mobile`):
```
--brand:#0E7C86; --brand-dark:#0A5F67; --brand-light:#E6F4F5;
--sand:#F6F1E7; --text:#17222B; --textSec:#5C6B75; --textLight:#94A3AB;
--line:#E2E6E8; --grey0:#F5F6F6;
--going:#127A4B; --interested:#9A6B00; --waitlist:#6B5AA6; --pending:#8A8F98;
font: 'Be Vietnam Pro' (phủ đủ dấu tiếng Việt). Khung điện thoại 393×852,
bo góc 54px, notch, status bar, tab bar.
```

**Web — người dùng cuối:** nền sáng, cùng brand teal `#0E7C86`, `Be Vietnam Pro`,
bố cục 3 cột (nav trái · feed giữa · rail phải chứa bản đồ và bộ lọc).

**Web — bảng kiểm duyệt / vận hành:** vỏ tối, dày dữ liệu:
```
--bg:#0f1115; --panel:#171a21; --panel2:#1e222b; --line:#2a2f3a; --txt:#e7eaf0;
--mut:#9aa3b2; --brand:#0E7C86; --brand2:#0A5F67;  sidebar 262–268px + topbar.
```

## Luật dựng mockup

1. **Tự chứa & chạy offline.** Một file `.html` duy nhất. Phụ thuộc ngoài duy nhất
   được phép: Google Fonts. **Không dùng ảnh ngoài** — biểu diễn ảnh bằng gradient
   CSS + một emoji canh giữa + nhãn phủ lên (ví dụ danh mục sự kiện: 🏐 🍜 🗣️ 🏃 🎧).
2. **Có tương tác.** Tab/nav bấm được, toggle (RSVP/follow), bottom sheet, chuyển
   chế độ, toast phản hồi. Vanilla JS thuần, không build step.
3. **Panel ghi chú bên lề** (mobile) hoặc note trên topbar (web): giải thích các
   bước của luồng, và **ánh xạ sang code** (bảng/endpoint/component nào).
4. **Mặc định phải thể hiện được trust & safety.** Mọi nội dung do người dùng tạo
   đều kèm danh tính tác giả + badge trust level, và có lối vào hành động Report.
   Nội dung đang chờ duyệt hiển thị trạng thái `pending review` rõ ràng thay vì
   im lặng biến mất.
5. **Quy ước song ngữ:** nhãn UI bằng tiếng Anh (EN là ngôn ngữ mặc định của sản
   phẩm); ghi chú/giải thích bên lề bằng tiếng Việt; định danh kỹ thuật giữ tiếng Anh.
   Nếu mockup minh hoạ bộ chuyển ngôn ngữ, phải cho thấy cả EN và VI.
6. **Ngày giờ:** luôn hiển thị theo `Asia/Ho_Chi_Minh`, ghi chú rõ dữ liệu thật lưu UTC.
7. **Đánh dấu đây là mockup:** có ghi chú nhìn thấy được "Mockup tĩnh · chưa nối API".

## Bẫy đã trả giá để biết

- **Va tên class.** Đừng tái sử dụng một tên class layout (ví dụ `panel`) cho cả
  rule container lớn (`display:flex;min-height:100vh`) LẪN một phần tử nhỏ như
  cái nút — rule nặng sẽ rò sang nút và làm nổ layout. Thêm tiền tố cho class
  segment/utility (`seg-panel`, không phải `panel`).
- **Rò specificity của display.** Khi toggle chế độ, một rule nền như
  `.board{display:flex}` (specificity 0,1,0) sẽ đè `.mode{display:none}` (cũng
  0,1,0 nhưng đứng trước). Điều khiển hiển thị bằng **id**
  (`#mode-board.show{display:flex}`) hoặc `:not(.show){display:none}` để chế độ
  bị ẩn thực sự ẩn.
- **Screenshot bé tí = trang vỡ.** Nếu PNG headless chỉ ~20KB thì trang đang
  trắng hoặc sụp — sửa trước khi báo cáo.
- **Dấu tiếng Việt tràn dòng.** "Ngũ Hành Sơn" dài hơn "Son Tra" đáng kể; kiểm
  tra chip lọc và tiêu đề card ở cả hai ngôn ngữ trước khi chốt.

## Các bước

1. Đọc mockup tham chiếu gần nhất; copy `:root` + component dùng chung.
2. Dựng màn hình/section + tương tác bằng vanilla JS.
3. Cập nhật `docs/mockups/README.md`.
4. **Mở lên + xác minh (luật cứng ở trên).**
5. Báo cáo kèm đường dẫn file và ghi chú rằng đây là mockup tĩnh.
