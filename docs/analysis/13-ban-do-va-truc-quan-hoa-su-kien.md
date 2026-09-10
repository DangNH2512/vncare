# Da Nang Connect — Bản đồ & Trực quan hoá mật độ sự kiện

> Tài liệu phân tích #13 · Phạm vi: Giai đoạn 1 · Ngày: 2026-09-01
> Đầu vào: đề xuất "zone đỏ nở theo số người tham gia" của chủ dự án.
> Số liệu trong tài liệu này được đo trên dữ liệu hình học thật trong
> `packages/geo/data/da-nang-areas.v0.draft.json` và kiểm chứng trên PostGIS 3.6.1
> đang chạy, không phải ước lượng.

---

## Mục lục

| § | Nội dung |
|---|---|
| [0](#0-kết-luận) | Kết luận: có nên làm không |
| [1](#1-ý-tưởng-gốc-và-phần-đúng-của-nó) | Ý tưởng gốc và phần đúng của nó |
| [2](#2-bảy-vấn-đề-của-zone-nở-theo-số-người) | Bảy vấn đề của "zone nở theo số người" |
| [3](#3-thiết-kế-thay-thế) | Thiết kế thay thế: phân tầng theo zoom |
| [4](#4-mô-hình-dữ-liệu--truy-vấn) | Mô hình dữ liệu & truy vấn |
| [5](#5-hợp-đồng-api) | Hợp đồng API |
| [6](#6-client-web--mobile) | Client web & mobile |
| [7](#7-hiệu-năng) | Ngân sách hiệu năng |
| [8](#8-quyền-riêng-tư--an-toàn) | Quyền riêng tư & an toàn |
| [9](#9-kế-hoạch-triển-khai) | Kế hoạch triển khai theo pha |
| [10](#10-acceptance-criteria) | Acceptance criteria |
| [11](#11-rủi-ro--câu-hỏi-còn-mở) | Rủi ro & câu hỏi còn mở |

---

## 0. Kết luận

**Bản đồ: rất đáng làm.** Đây là tính năng khớp trực tiếp với câu nói đại diện của
persona chính trong `01-tac-nhan-va-phan-quyen.md`: *"I just want to know what's
happening tonight within walking distance."* Danh sách trả lời được "cái gì", chỉ
bản đồ trả lời được "trong tầm đi bộ".

**"Zone đỏ nở theo số người": không nên làm đúng như mô tả.** Không phải vì ý tưởng
sai hướng — trực giác "bản đồ phải cho thấy chỗ nào đang *sống*" là đúng — mà vì
**cách mã hoá** chọn sai: dùng *bán kính địa lý* để biểu diễn một đại lượng *phi
không gian*. Bảy hệ quả cụ thể ở §2; hệ quả nghiêm trọng nhất (§2.3) là **không tồn
tại một bán kính nào hoạt động được ở mọi mức zoom** — đây là mâu thuẫn toán học,
không phải vấn đề tinh chỉnh tham số.

**Đề xuất:** giữ nguyên *mục tiêu* (bản đồ thể hiện mật độ và sự sống), đổi *cách mã
hoá* sang phân tầng theo zoom + marker theo bậc pixel cố định, và **giữ lại ý tưởng
"ping" cho đúng nghĩa của nó**: nhịp đập cho sự kiện *đang diễn ra ngay bây giờ*, kích
thước cố định theo pixel, không phải theo mét. Chi tiết ở §3.

---

## 1. Ý tưởng gốc và phần đúng của nó

Đề xuất ban đầu, diễn giải lại:

1. Một địa điểm đang có sự kiện → ping một vùng đỏ lên bản đồ.
2. Sự kiện càng đông (RSVP xác nhận + host xác nhận số người thật) → vùng càng to.
3. Ràng buộc tự đặt ra: vùng phải đủ nhỏ để không che các sự kiện lân cận.

Ba điều ý tưởng này làm đúng, và thiết kế thay thế phải giữ lại:

- **Mật độ là thông tin, không phải trang trí.** Với một thành phố ~15.000 expat,
  điều người dùng cần biết trước tiên không phải "sự kiện X ở đâu" mà "tối nay khu
  nào có gì". Bản đồ chỉ có pin rời rạc không trả lời được câu đó.
- **Số người tham gia là tín hiệu chất lượng.** Nó là thứ phân biệt một buổi có thật
  với một listing chết — đúng nỗi đau "15 người thả tim, 5 người xuất hiện" trong
  hồ sơ persona organizer.
- **Ràng buộc số 3 là ràng buộc đúng.** Chủ dự án đã tự nhận ra vấn đề che khuất.
  §2.3 chỉ chứng minh rằng nó không giải được trong khuôn khổ "bán kính địa lý".

---

## 2. Bảy vấn đề của "zone nở theo số người"

### 2.1 Bán kính mã hoá số người là một lỗi phạm trù

Một vòng tròn trên bản đồ được đọc là **phạm vi không gian** — "sự kiện này trải
rộng chừng này", hoặc "khu vực ảnh hưởng chừng này". Nó không được đọc là số lượng.

Một buổi cà phê 30 người ở Hải Châu **không** chiếm nhiều mét vuông hơn một trận cầu
lông 8 người. Người dùng sẽ đọc vòng tròn to thành "địa điểm to" hoặc "vùng phủ
rộng", rồi tự hỏi tại sao một quán cà phê lại rộng 500 m.

### 2.2 Diện tích tăng theo bình phương, còn cảm nhận thì không tuyến tính

Muốn vòng tròn "trông to gấp đôi" phải tăng diện tích 4 lần. Tệ hơn, cảm nhận thị
giác về diện tích không tuyến tính (luật số mũ Stevens, số mũ ~0,7 với diện tích):
diện tích gấp 4 chỉ *cảm thấy* to gấp ~2,6 lần.

Nghĩa là kênh mã hoá này vừa **không đọc được chính xác**, vừa **chiếm ưu thế thị
giác** — đúng tổ hợp tệ nhất: nó hét lên nhưng nói sai.

### 2.3 Không tồn tại bán kính nào đúng ở mọi zoom — đây là vấn đề chặn

Đây là lý do quyết định. Một vòng tròn neo theo mặt đất có kích thước **mét cố
định**, nên kích thước **pixel** của nó nhân đôi sau mỗi mức zoom. Đo tại vĩ độ Đà
Nẵng (16,04°N):

| Zoom | m/pixel | Đường kính pixel của zone bán kính 500 m | Đọc được không? |
|---:|---:|---:|---|
| 11 | 73,5 | 14 px | Quá nhỏ, thành một chấm |
| 12 | 36,7 | 27 px | Vừa thấy |
| 13 | 18,4 | 54 px | Tốt |
| 14 | 9,2 | 109 px | Bắt đầu lấn |
| 15 | 4,6 | 218 px | Chiếm hơn nửa bề ngang điện thoại |
| 16 | 2,3 | **436 px** | Phủ kín màn hình (iPhone rộng 390 px) |
| 17 | 1,1 | 871 px | Vô nghĩa |

Đặt cạnh kích thước thật của các khu vực MVP, đo từ dữ liệu geo đã commit:

| Khu vực | Rộng | Cao |
|---|---:|---:|
| **An Thượng** | **1.177 m** | **1.437 m** |
| Mỹ An | 2.140 m | 1.879 m |
| Mỹ Khê | 1.712 m | 3.316 m |
| Hải Châu | 2.247 m | 6.080 m |
| Ngũ Hành Sơn | 4.816 m | 4.974 m |
| Sơn Trà | 8.557 m | 6.632 m |

An Thượng — khu đậm đặc nhất, nơi mật độ sự kiện cao nhất và cũng là nơi tính năng
này có ý nghĩa nhất — chỉ rộng **1.177 m**. Một zone bán kính 500 m có đường kính
1.000 m, tức **phủ 85% bề ngang của cả khu**. Hai sự kiện cách nhau 300 m sẽ chồng
gần như hoàn toàn.

Thu bán kính xuống 150 m để cứu An Thượng thì ở zoom 12 (mức nhìn cả thành phố) nó
chỉ còn **4 pixel** — nhỏ hơn một pin thường.

> **Không có giá trị nào thoả mãn cả hai đầu.** Ràng buộc số 3 của chủ dự án
> ("đủ nhỏ để không che sự kiện khác") và mục tiêu số 1 ("thấy được ở mức thành phố")
> loại trừ nhau chừng nào kích thước còn tính bằng mét.

### 2.4 Màu đỏ nói sai thông điệp

Trên bản đồ, đỏ là quy ước gần như phổ quát cho **nguy hiểm / cảnh báo / tắc nghẽn**:
tắc đường trên Google Maps, cháy rừng, bản đồ tội phạm, bản đồ nhiệt.

Da Nang Connect bán **cảm giác an toàn khi gặp người lạ** cho người nước ngoài mới
đến, chưa quen thành phố. Phủ đỏ lên An Thượng vào tối thứ Sáu truyền đúng thông
điệp ngược lại. Một người mới đến sẽ đọc "nên tránh chỗ này", không phải "chỗ này
đang vui".

Đỏ nên được **giữ lại** cho thứ thật sự cần cảnh báo: sự kiện bị huỷ, đổi địa điểm
gấp — đúng như trang `X-04` trong `02-use-case.md` đã phủ dải đỏ "Cancelled".

### 2.5 Xung đột với chính sách vị trí đã chốt

`01-tac-nhan-va-phan-quyen.md` Đ1 quy định: `guest` **không** thấy địa chỉ chính xác;
khi `location_precision = area_only` thì chỉ thấy tâm khu vực với bán kính 500 m. Địa
chỉ thật mở khoá sau RSVP (`BR-15`).

Một zone tô đậm, tâm đặt đúng toạ độ thật, bán kính tỉ lệ với số người tham gia sẽ
công bố hai thứ cùng lúc:

1. **Địa điểm chính xác** — phá vỡ `location_precision`.
2. **Sẽ có bao nhiêu người ở đó** — thông tin biến một địa điểm thành mục tiêu.

Nói thẳng: một vòng tròn đỏ to nghĩa là *"40 người nước ngoài sẽ tập trung tại đúng
điểm này lúc 20 giờ"*, hiển thị công khai, không cần đăng nhập. Đó là rủi ro an toàn
thân thể, đúng loại rủi ro mà `05-trust-safety-va-kiem-duyet.md` §"một lỗi kiểm duyệt
ở đây có thể trở thành một sự cố an toàn thân thể" đã cảnh báo.

### 2.6 Hai nguồn số liệu tồn tại ở hai thời điểm khác nhau

Đề xuất định nghĩa độ lớn = "RSVP xác nhận **+** host xác nhận số người tham gia".
Nhưng theo Đ27, cửa sổ host gắn nhãn tham dự là **T+2h → T+48h**, tức **sau khi sự
kiện kết thúc**.

Hệ quả: khi zone đang ping (sự kiện *đang diễn ra*), số của host **chưa tồn tại**.
Khi số của host có, sự kiện **đã xong** và zone lẽ ra phải tắt. Hai đầu vào không bao
giờ cùng có mặt.

Điều dùng được lúc realtime là `event_occurrences.confirmed_count` — đã có sẵn, do
trigger duy trì. Con số của host thuộc về *phân tích sau sự kiện* và uy tín organizer,
không thuộc về lớp hiển thị bản đồ.

### 2.7 Chi phí render

MapLibre xử lý hàng nghìn symbol điểm mượt mà vì chúng là sprite trong một buffer duy
nhất. Vòng tròn neo mặt đất có blur là polygon: phải tessellate lại mỗi lần zoom, và
chồng alpha nhiều lớp là fill-rate. Vài trăm zone chồng nhau là chỗ khung hình sụp,
đặc biệt trên điện thoại tầm trung — thiết bị phổ biến nhất của nhóm người dùng này.

---

## 3. Thiết kế thay thế

Nguyên tắc: **thứ gì phải đọc được ở mọi zoom thì đo bằng pixel, không đo bằng mét.**

### 3.1 Phân tầng theo zoom — lời giải thật cho vấn đề che khuất

| Zoom | Người dùng đang hỏi | Hiển thị |
|---:|---|---|
| ≤ 12 | "Tối nay thành phố có gì?" | **Chip theo khu vực** đặt tại `areas.center`: tên khu + số sự kiện. `An Thượng · 7` |
| 13 – 15 | "Khu này có gì?" | **Cụm** gom phía server, nhãn là số sự kiện trong cụm |
| ≥ 16 | "Chính xác chỗ nào?" | **Pin từng sự kiện**, không gom cụm |

Che khuất biến mất vì ở mỗi mức zoom số đối tượng vẽ ra được giữ trong khoảng
**8–40**, bất kể mật độ thật. Đây là cách mọi bản đồ mật độ nghiêm túc giải bài toán
này; không có mẹo hình học nào thay thế được nó.

### 3.2 Số người tham gia mã hoá vào marker, theo bậc pixel cố định

| Bậc | `confirmed_count` | Đường kính marker | Ghi chú |
|---|---:|---:|---|
| S | 1 – 9 | 24 px | Mặc định |
| M | 10 – 29 | 32 px | |
| L | ≥ 30 | 40 px | **Chặn trên cứng** |

Ba bậc, không phải thang liên tục: mắt người không đọc được chênh lệch nhỏ hơn thế,
và thang liên tục chỉ tạo cảm giác chính xác giả. Vì đơn vị là pixel, marker **không
bao giờ** phình theo zoom, nên ràng buộc số 3 của chủ dự án được thoả mãn theo thiết
kế chứ không phải nhờ chỉnh tham số. Số chính xác nằm ở nhãn cạnh marker, nơi nó đọc
được thật.

### 3.3 "Ping" được giữ lại — nhưng nghĩa là *đang diễn ra*, không phải *to*

Đây là phần ý tưởng gốc đáng giữ nhất, chỉ cần đổi ý nghĩa:

- Sự kiện đang diễn ra (`now()` nằm giữa `starts_at` và `ends_at`) nhận một
  **quầng nhịp** đường kính **cố định 56 px**, chu kỳ 2 giây.
- Nhịp báo **thời gian**, không báo số lượng. "Đang diễn ra ngay bây giờ" là thông
  tin cấp bách duy nhất trên bản đồ sự kiện, và nó xứng đáng với kênh mã hoá mạnh
  nhất.
- **Chặn trên 5 nhịp cùng lúc** (5 sự kiện gần tâm màn hình nhất). Hơn 5 điểm nhấp
  nháy thì không còn điểm nào là điểm nhấn, và màn hình nhấp nháy là vấn đề tiếp cận
  thật với người nhạy cảm chuyển động — tôn trọng `prefers-reduced-motion`, khi bật
  thì thay nhịp bằng viền tĩnh.

### 3.4 Màu theo danh mục, không theo nhiệt

Dùng lại token danh mục đã có trong `apps/web-client-side` (`sports`, `language`,
`social`, `outdoors`, `wellness`). Một accent riêng cho "đang diễn ra". Đỏ để dành
cho huỷ / đổi địa điểm.

### 3.5 Lớp heatmap là tuỳ chọn bật/tắt, không phải mặc định

Nếu vẫn muốn cảm giác "vùng nóng", công cụ đúng là **một lớp heatmap tính trên toàn
bộ điểm trong viewport**, bật/tắt được, chứ không phải N vòng tròn cho N sự kiện.
Heatmap biểu diễn *mật độ của tập hợp*, đó chính là đại lượng mà ý tưởng gốc muốn
diễn đạt. MapLibre có `heatmap` layer sẵn, chạy trên GPU, chi phí gần như không đổi
theo số điểm.

Xếp sau MVP: nó chỉ có nghĩa khi đã đủ mật độ nội dung. Với sàn cứng 20 sự kiện mở
mỗi tuần (RK-01), heatmap sẽ trông thưa và phản tác dụng cho tới khi qua được ~150
sự kiện đang mở.

### 3.6 Bảng đối chiếu

| | Zone nở theo mét | Thiết kế đề xuất |
|---|---|---|
| Che khuất ở An Thượng | Không giải được (§2.3) | Giải bằng phân tầng zoom |
| Đọc được số người | Không (§2.2) | Nhãn số + 3 bậc marker |
| Ở zoom thành phố | 4–27 px, vô hình | Chip khu vực có số |
| Ở zoom đường phố | 436 px, phủ màn hình | Pin 24–40 px |
| Thông điệp màu | "Nguy hiểm" | Danh mục + accent "đang diễn ra" |
| Rò rỉ vị trí | Có (§2.5) | Tôn trọng `location_precision` |
| Chi phí render | Polygon, fill-rate cao | Symbol layer |
| Giữ được cảm giác "sống" | Có | Có — qua nhịp đập realtime |

---

## 4. Mô hình dữ liệu & truy vấn

### 4.1 Không cần bảng mới

Mọi thứ cần thiết đã có sau `0001` và `0002`:

- `events.location geography(Point,4326)` + `idx_events_location` (GIST)
- `areas.boundary geography(Polygon,4326)`, `areas.center geography(Point,4326)`
- `event_occurrences.starts_at` / `ends_at` / `confirmed_count`

### 4.2 Một index mới — đã kiểm chứng là cần

Truy vấn bản đồ lọc theo **viewport**, không theo `area_id`. Đo trên database đang
chạy, với `enable_seqscan = off` để buộc planner chọn index:

```text
-- Với index hiện có:
Index Scan using idx_events_area_status
  Index Cond: (status = 'published')
  Filter: (location && ...)        <-- bbox chỉ là filter, không phải index cond
```

Bộ lọc không gian bị hạ xuống thành filter sau khi quét index — GIST không được dùng.
Thêm một index GIST **partial** khớp đúng vị từ của truy vấn bản đồ:

```sql
CREATE INDEX idx_events_map_viewport ON events USING GIST (location)
  WHERE status = 'published' AND deleted_at IS NULL;
```

Kết quả sau khi thêm, đo lại trên cùng database:

```text
Index Scan using idx_events_map_viewport
  Index Cond: (location && ...)    <-- bbox thành index cond
```

> Ghi chú trung thực: bảng thử nghiệm chỉ có 7 hàng, nên planner tự nó vẫn chọn seq
> scan — đúng và hợp lý ở quy mô đó. Phép đo trên chỉ chứng minh **index dùng được
> cho vị từ này**. Phải `EXPLAIN ANALYZE` lại ở mức ~2.000 sự kiện trước khi mở
> production, theo `checklists.md` §PostGIS.

### 4.3 Truy vấn gom cụm — đã chạy thật

`ST_ClusterDBSCAN` nhận `eps` theo đơn vị của SRID, mà 4326 là **độ**, không phải
mét. Vì vậy phải chuyển sang 3857 (Web Mercator) trước khi gom — đúng hệ mà tile đang
render, và sai số do biến dạng Mercator tại vĩ độ 16° chỉ ~4%.

```sql
WITH viewport AS (
  SELECT e.id, e.title, e.category_slug,
         ST_Transform(e.location::geometry, 3857) AS geom,
         occ.starts_at, occ.ends_at, occ.confirmed_count
    FROM events e
    JOIN LATERAL (
      SELECT o.starts_at, o.ends_at, o.confirmed_count
        FROM event_occurrences o
       WHERE o.event_id = e.id
         AND o.deleted_at IS NULL
         AND o.ends_at > now()
       ORDER BY o.starts_at
       LIMIT 1
    ) occ ON true
   WHERE e.deleted_at IS NULL
     AND e.status = 'published'
     AND e.location && ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
),
clustered AS (
  SELECT *, ST_ClusterDBSCAN(geom, eps => $5, minpoints => 2) OVER () AS cluster_id
    FROM viewport
)
SELECT cluster_id,
       count(*)::int                        AS event_count,
       sum(confirmed_count)::int            AS attendee_count,
       bool_or(now() BETWEEN starts_at AND ends_at) AS is_live,
       ST_X(ST_Transform(ST_Centroid(ST_Collect(geom)), 4326)) AS lng,
       ST_Y(ST_Transform(ST_Centroid(ST_Collect(geom)), 4326)) AS lat
  FROM clustered
 GROUP BY cluster_id;
```

Kết quả chạy thật với 6 sự kiện rải trong bán kính ~400 m ở An Thượng cộng 1 sự kiện
cách đó 3 km, `eps => 250`:

```text
 cluster | events | attendees |    lng    |   lat
---------+--------+-----------+-----------+----------
 0       |      6 |       128 | 108.24580 | 16.04340
 solo:…  |      1 |        13 | 108.27000 | 16.07000
```

Đúng như thiết kế: cụm An Thượng gom lại thành **một** đối tượng thay vì 6 vòng tròn
chồng nhau, và sự kiện xa vẫn đứng riêng.

`eps` theo mức zoom — chọn sao cho khoảng cách gom luôn tương đương ~64 px trên màn
hình:

| Zoom | m/px | `eps` (m) |
|---:|---:|---:|
| 13 | 18,4 | 1.200 |
| 14 | 9,2 | 600 |
| 15 | 4,6 | 300 |

### 4.4 Tầng khu vực (zoom ≤ 12)

```sql
SELECT a.id, a.slug, a.name_en, a.name_vi,
       ST_X(a.center::geometry) AS lng,
       ST_Y(a.center::geometry) AS lat,
       count(e.id)::int AS event_count,
       count(*) FILTER (WHERE now() BETWEEN occ.starts_at AND occ.ends_at)::int AS live_count
  FROM areas a
  LEFT JOIN events e
    ON e.area_id = a.id AND e.status = 'published' AND e.deleted_at IS NULL
  LEFT JOIN LATERAL (
    SELECT o.starts_at, o.ends_at FROM event_occurrences o
     WHERE o.event_id = e.id AND o.deleted_at IS NULL AND o.ends_at > now()
     ORDER BY o.starts_at LIMIT 1
  ) occ ON true
 WHERE a.deleted_at IS NULL
 GROUP BY a.id;
```

Kết quả tầng này gần như tĩnh trong vài phút → **cache Redis TTL 60 s**. Sáu khu vực,
một khoá cache duy nhất.

---

## 5. Hợp đồng API

Một endpoint, hình dạng phản hồi do zoom quyết định. Client không phải biết ngưỡng
zoom — server trả về `level` để client biết mình đang cầm cái gì.

```
GET /api/v1/map/events
    ?bbox=108.20,16.02,108.28,16.08     (west,south,east,north — bắt buộc)
    &zoom=14                             (bắt buộc, 8–18)
    &categories=sports,social            (tuỳ chọn)
    &when=now|today|tonight|week         (tuỳ chọn, mặc định week)
```

Ràng buộc bắt buộc trên input, theo `security-review` §2:

- `bbox` phải hợp lệ và **diện tích ≤ 400 km²**. Viewport không chặn trên là một
  đường DoS rẻ tiền — không có nó, một request quét cả nước.
- `zoom` là số nguyên trong 8–18.
- Kết quả chặn trên **200 phần tử** mỗi phản hồi ở mọi tầng.

Phản hồi (Zod, đặt tại `packages/contracts/src/map.ts`):

```ts
export const MapLevel = z.enum(['area', 'cluster', 'event']);

export const MapAreaItem = z.object({
  kind: z.literal('area'),
  areaId: z.uuid(), slug: z.string(),
  lat: z.number(), lng: z.number(),
  eventCount: z.number().int(), liveCount: z.number().int(),
});

export const MapClusterItem = z.object({
  kind: z.literal('cluster'),
  /** Ổn định trong một viewport, KHÔNG ổn định giữa các lần zoom. */
  clusterId: z.string(),
  lat: z.number(), lng: z.number(),
  eventCount: z.number().int(),
  attendeeCount: z.number().int(),
  isLive: z.boolean(),
});

export const MapEventItem = z.object({
  kind: z.literal('event'),
  eventId: z.uuid(), slug: z.string(), title: z.string(),
  lat: z.number(), lng: z.number(),
  /** true khi toạ độ đã bị làm mờ về tâm khu vực — client PHẢI đổi nhãn tương ứng. */
  isApproximate: z.boolean(),
  category: z.string(),
  startsAt: z.iso.datetime(),
  isLive: z.boolean(),
  /** Bậc hiển thị, KHÔNG phải số thô: server quyết định ngưỡng, client chỉ vẽ. */
  attendeeTier: z.enum(['s', 'm', 'l']),
  attendeeCount: z.number().int(),
});

export const MapResponse = z.object({
  level: MapLevel,
  items: z.array(z.discriminatedUnion('kind', [MapAreaItem, MapClusterItem, MapEventItem])),
  /** Sự kiện bị cắt do chặn trên 200 — client hiện gợi ý "thu nhỏ bộ lọc". */
  truncated: z.boolean(),
});
```

Trả `attendeeTier` **cùng với** `attendeeCount` là có chủ đích: ngưỡng bậc là quyết
định sản phẩm, phải đổi được ở server mà không cần phát hành lại app mobile.

**Cache:** `Cache-Control: public, max-age=30` cho tầng area/cluster; `max-age=10`
cho tầng event. Khoá cache Redis gồm `bbox` đã bo tròn về lưới + `zoom` + bộ lọc, để
hai người dùng cạnh nhau dùng chung một mục cache.

---

## 6. Client web & mobile

### 6.1 Web — `apps/web-client-side`, MapLibre GL JS

- Nguồn dữ liệu: một `GeoJSONSource` được nạp lại khi `moveend` (debounce 250 ms).
- Ba layer, ẩn/hiện theo `level` server trả về; **không** dùng `cluster: true` của
  MapLibre — gom cụm phía client chỉ gom được những gì đã tải về, nên nó sai ngay khi
  kết quả bị cắt bởi chặn trên 200.
- Marker là `symbol` layer với `icon-size` rời rạc theo `attendeeTier`:

```js
'icon-size': ['match', ['get', 'attendeeTier'], 's', 0.6, 'm', 0.8, 'l', 1.0, 0.6]
```

- Nhịp "đang diễn ra": một `circle` layer riêng bên dưới lớp icon, `circle-radius`
  chạy theo `requestAnimationFrame`, lọc `['==', ['get','isLive'], true]`, chỉ nhận
  5 phần tử gần tâm nhất. Tắt hẳn khi `prefers-reduced-motion: reduce`.
- Tile: OSM raster ở MVP (không khoá nhà cung cấp, theo quyết định stack). Nâng lên
  vector tile khi cần đổi màu nền theo theme sáng/tối.
- SEO: bản đồ là client-side; trang khám phá vẫn phải render server-side một **danh
  sách** tương đương để bot đọc được. Bản đồ là lớp tăng cường, không phải nội dung
  duy nhất.

### 6.2 Mobile — `apps/mobile`, `react-native-maps`

Cùng endpoint, cùng ngưỡng. Ba khác biệt bắt buộc:

- Dùng `Marker` với `tracksViewChanges={false}` sau lần render đầu. Bỏ qua điều này
  là nguyên nhân số một khiến bản đồ React Native giật.
- Nhịp đập dùng `react-native-reanimated` trên UI thread, không dùng `setState`.
- Quyền vị trí: chỉ hỏi khi người dùng chạm "gần tôi", **không** hỏi lúc mở màn hình.
  Hỏi quyền quá sớm là cách nhanh nhất để bị từ chối vĩnh viễn, và bản đồ vẫn phải
  dùng được bình thường khi bị từ chối (mặc định về tâm An Thượng).

### 6.3 i18n

Chip khu vực dùng `name_en` / `name_vi` từ bảng `areas`, không hardcode. Nhãn số dùng
key i18n có dạng số nhiều (`map.cluster.eventCount`), không nối chuỗi. Nhãn
`isApproximate` phải có ở cả hai locale: *"Approximate location"* / *"Vị trí gần
đúng"*.

---

## 7. Hiệu năng

| Chỉ tiêu | Ngân sách | Cách đo |
|---|---|---|
| `GET /api/v1/map/events` p95 | < 150 ms | Không tính cache; đo ở 2.000 sự kiện |
| Tải viewport ban đầu | < 400 ms tới khung hình đầu | Lighthouse trên 4G giả lập |
| Pan / zoom | ≥ 50 fps trên iPhone 12 / Pixel 6a | Bảng ghi hiệu năng |
| Kích thước payload | < 40 KB cho 200 phần tử | Đã gzip |
| Cache hit khu vực | > 80% | Chỉ số Redis |

Ba việc phải làm mới đạt được:

1. Index partial GIST ở §4.2.
2. Chặn trên 200 phần tử — không có nó thì một viewport cả thành phố sau khi đủ nội
   dung sẽ trả về hàng nghìn điểm.
3. Bo `bbox` về lưới trước khi tạo khoá cache, nếu không tỉ lệ hit gần bằng 0 vì
   không có hai viewport nào giống hệt nhau.

---

## 8. Quyền riêng tư & an toàn

Đây là phần không được cắt giảm để kịp tiến độ.

| Quy tắc | Hiện thực |
|---|---|
| `location_precision = area_only` → không lộ toạ độ thật | Server trả về **tâm khu vực + nhiễu tất định** (seed = `event_id`, bán kính ≤ 300 m). Tất định để pin không nhảy giữa các lần tải; nhiễu để không suy ngược ra tâm chính xác |
| Client phải biết mình đang xem toạ độ gần đúng | Cờ `isApproximate` là trường bắt buộc trong contract, không phải suy đoán |
| Không lộ số người cho khách vãng lai | `attendeeCount` chỉ trả cho người đã đăng nhập; `guest` chỉ nhận `attendeeTier` |
| Không có bản đồ người dùng | Chỉ vẽ điểm hẹn của sự kiện. Không lưu, không vẽ vị trí cá nhân — schema cố ý không có bảng lịch sử vị trí |
| Sự kiện chưa publish không lên bản đồ | Vị từ `status = 'published'` nằm ngay trong index partial, không phải trong tầng ứng dụng |
| Sự kiện bị `suspended` / `taken_down` biến mất ngay | Cùng vị từ trên; TTL cache ≤ 30 s giới hạn cửa sổ hiển thị sót |

**Một quyết định cần chủ dự án chốt:** với sự kiện đặt địa chỉ chính xác công khai,
có nên vẫn làm mờ vị trí trên bản đồ **cho tới trước giờ bắt đầu 2 tiếng** hay không.
Đánh đổi là tiện lợi (tìm đường sớm) đổi lấy an toàn (không quảng cáo trước một điểm
tụ tập). Khuyến nghị: **có làm mờ**, và hiện địa chỉ chính xác cho người đã RSVP tại
mọi thời điểm — họ đã có thông tin đó qua trang chi tiết rồi.

---

## 9. Kế hoạch triển khai

Phụ thuộc: bản đồ đọc `events` + `event_occurrences` + `areas`. Sau đợt làm CRUD hiện
tại, cả ba đã sẵn sàng. Không phụ thuộc `auth`, nhưng làm mờ theo quyền
(§8) cần biết người xem đã đăng nhập chưa — nên **Pha 3 chặn sau module `auth`**.

| Pha | Phạm vi | Kết quả | Ước lượng |
|---|---|---|---|
| **M0 — Nền** | Index partial GIST; endpoint `GET /api/v1/map/events` tầng `event`; contract `map.ts`; seed 60 sự kiện thật của Đà Nẵng | API trả điểm trong viewport, có test | 2 ngày |
| **M1 — Bản đồ web** | MapLibre trong `apps/web-client-side`; pin theo bậc; bottom sheet chi tiết; đồng bộ hai chiều với danh sách | Khám phá bằng bản đồ dùng được | 3 ngày |
| **M2 — Phân tầng zoom** | Tầng area + cluster; chuyển tầng theo zoom; cache Redis | Không còn chồng lấn ở An Thượng | 2 ngày |
| **M3 — Nhịp "đang diễn ra"** | Cờ `isLive`; quầng nhịp; chặn 5; `prefers-reduced-motion` | Ý tưởng ping gốc, đúng nghĩa | 1 ngày |
| **M4 — Mobile** | `react-native-maps`, cùng contract | Ngang bằng web | 3 ngày |
| **M5 — Riêng tư** | Nhiễu tất định; `isApproximate`; chặn `attendeeCount` với guest | Cổng an toàn đóng | 1,5 ngày |
| **M6 — Heatmap (tuỳ chọn)** | Lớp heatmap bật/tắt | Chỉ mở khi > 150 sự kiện đang mở | 1 ngày |

**Tổng lõi (M0–M5): ~12,5 ngày công.** M6 để sau, có điều kiện kích hoạt rõ ràng.

Trình tự bắt buộc: M0 → M1 → M2. M3 làm được song song với M2. M5 **phải xong trước
khi bản đồ hiển thị cho người dùng ngoài đội**.

---

## 10. Acceptance criteria

Diễn đạt để kiểm chứng được, không phải để tán thành:

1. Ở zoom 12 với 60 sự kiện rải khắp 6 khu vực, bản đồ vẽ **6 chip**, mỗi chip có số
   đúng bằng số sự kiện `published` còn hiệu lực của khu đó.
2. Ở zoom 15 tại An Thượng với 6 sự kiện trong bán kính 400 m, bản đồ vẽ **1 cụm**,
   nhãn `6`. Không có hai đối tượng nào chồng lên nhau quá 20% diện tích.
3. Ở zoom 17, sáu sự kiện đó hiện thành **6 pin riêng biệt**, không cái nào che cái
   nào.
4. Marker của sự kiện 45 người và marker của sự kiện 8 người **chênh nhau đúng 16 px**
   đường kính, ở mọi mức zoom.
5. Sự kiện có `location_precision = area_only` trả về `isApproximate: true`, và toạ độ
   trả về **giống hệt nhau qua hai lần request liên tiếp** (nhiễu tất định).
6. Người dùng chưa đăng nhập nhận `attendeeTier` nhưng **không** nhận `attendeeCount`.
7. `bbox` có diện tích > 400 km² bị từ chối bằng `400` kèm `messageKey`, không phải
   bằng timeout.
8. Sự kiện đang diễn ra có `isLive: true`; nhiều nhất 5 quầng nhịp cùng lúc; bật
   `prefers-reduced-motion` thì không có phần tử nào chuyển động.
9. `EXPLAIN ANALYZE` truy vấn viewport ở 2.000 sự kiện cho **Index Scan** trên
   `idx_events_map_viewport`, không phải Seq Scan.
10. Sự kiện `draft`, `suspended`, `taken_down`, `cancelled` **không bao giờ** xuất
    hiện ở bất kỳ tầng nào.

---

## 11. Rủi ro & câu hỏi còn mở

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| R-1 | **Bản đồ trống lúc ra mắt.** Cùng vấn đề cold-start RK-01, nhưng bản đồ phơi bày nó tệ hơn danh sách: một danh sách 3 mục trông thưa, một bản đồ 3 pin trông chết | 🔴 Cao | Không mở bản đồ làm tab mặc định cho tới khi ≥ 40 sự kiện đang mở. Trước đó bản đồ là tuỳ chọn trong màn Khám phá |
| R-2 | Cụm nhấp nháy khi zoom vì `cluster_id` đổi giữa các mức zoom | TB | `clusterId` khai báo rõ trong contract là không ổn định giữa các zoom; client dùng chuyển cảnh mờ dần, không dùng animation theo id |
| R-3 | Tile OSM bị giới hạn tần suất ở giờ cao điểm | TB | Cache tile qua CDN có POP tại Việt Nam; chuẩn bị sẵn nhà cung cấp thay thế (đã tránh khoá nhà cung cấp từ đầu) |
| R-4 | Toạ độ curate thủ công sai chỗ | TB | Bước xác minh trong quy trình curate: mở toạ độ trên bản đồ trước khi publish. Sự kiện không có toạ độ vẫn phải hiện ở tầng area, không được rơi khỏi danh sách |
| R-5 | Người dùng đọc chip khu vực là "sự kiện ở đúng tâm khu" | Thấp | Chip có hình dạng khác hẳn pin, và chạm vào thì zoom vào khu chứ không mở trang sự kiện |

**Câu hỏi cần chủ dự án quyết:**

1. **§8** — Có làm mờ vị trí công khai cho tới T-2h không? (Khuyến nghị: có.)
2. **§3.2** — Ngưỡng bậc 10 / 30 người có khớp thực tế Đà Nẵng không? Cần đối chiếu
   với phân bố `capacity` thật sau 4 tuần curate; con số hiện tại là phỏng đoán.
3. **§9 R-1** — Ngưỡng 40 sự kiện đang mở để bật bản đồ làm tab mặc định: chấp nhận?
4. Bản đồ có cần chạy trên `apps/web-admin-side` (curator xem phân bố nội dung để tìm
   vùng trống) không? Nếu có thì dùng lại được endpoint, chỉ khác là admin thấy cả
   `draft` — nhưng đó là một quyền riêng, cần role check riêng.

---

## Phụ lục — Cách tái lập các phép đo

```bash
# Kích thước khu vực (§2.3)
node -e "const a=require('./packages/geo/data/da-nang-areas.v0.draft.json'); /* ... */"

# Bảng zoom → pixel (§2.3): m/px = 156543.03392 * cos(16.04°) / 2^zoom

# Kiểm chứng index và gom cụm (§4.2, §4.3)
docker compose -f docker-compose.local.yml up -d postgres
docker exec -i vncare-postgres-1 psql -U dnc -d dnc
```
