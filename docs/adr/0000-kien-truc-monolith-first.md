# ADR-0000 — Kiến trúc Giai đoạn 1: Monolith module hoá; microservices là kiến trúc đích có điều kiện

> **Trạng thái:** ĐỀ XUẤT — chờ founder ký trước **07/09/2026** (ngày bắt đầu Sprint 0).
> **Ngày soạn:** 01/09/2026 · **Người soạn:** Claude Code · **Người quyết định:** founder.
> **Phạm vi:** toàn bộ Giai đoạn 1 (M0 18/09/2026 → M6 25/02/2027).
> **Tài liệu liên quan:** [11-danh-gia-stack-hien-dai.md](../analysis/11-danh-gia-stack-hien-dai.md) (viết tắt: **doc 11**), [12-kien-truc-microservices.md](../analysis/12-kien-truc-microservices.md) (viết tắt: **doc 12**), [04-tech-stack-va-kien-truc.md](../analysis/04-tech-stack-va-kien-truc.md).

---

## 1. Bối cảnh

Repo đang có **hai tài liệu cùng tự nhận "bản chốt", cùng đề ngày 01/09/2026, chọn hai kiến trúc ngược nhau**:

- **Doc 11** chốt: giữ **monolith module hoá** (NestJS 12 + TypeORM 1.1 + PostgreSQL 18 + Next 16 + Expo 57), hợp đồng Zod, 9 package dùng chung, ranh giới ép bằng `dependency-cruiser`. Mục 10 của nó viết: *"Monolith module hoá thay vì microservices là đúng."*
- **Doc 12** chốt: **3 microservices** (identity / event / comms) + Redis Streams bus + outbox/inbox + saga, trên 3 VPS.

Không thể thi công cả hai. ADR này ra quyết định duy nhất và ghi lại lý do, để 6–18 tháng nữa không ai mở lại cuộc tranh luận từ đầu.

**Ràng buộc quyết định** (không đổi so với hai tài liệu): đội 2 lập trình viên + 1 founder; 26 tuần tới M6; trần hạ tầng 250 USD/tháng ở 500 user; hai tiêu chí xếp trên tất cả là **TÁI SỬ DỤNG CODE** và **DỄ BẢO TRÌ**; bảy ràng buộc cứng ở doc 12 §1.5.

## 2. Quyết định

### 2.1 Giai đoạn 1 thi công theo doc 11 — monolith module hoá

**Doc 11 là kiến trúc ràng buộc cho Giai đoạn 1**: bảng stack §3.1, cấu trúc `packages/` §3.2, luật ranh giới B1–B7, kế hoạch Sprint 0 §8, tám ADR §8.4. Một tiến trình API (`apps/api`) + worker, một database, Docker Compose, topology chi phí theo doc 04 §13.3.

### 2.2 Doc 12 đổi trạng thái thành "kiến trúc đích, chưa thi công"

Doc 12 **không bị bác bỏ về kỹ thuật** — nó là bản thiết kế phân tán tốt. Nó bị **hoãn có điều kiện**, vì đo bằng chính số liệu nó tự khai thì nó thua trên cả hai tiêu chí đề bài ở quy mô Giai đoạn 1:

| Số liệu doc 12 tự khai | Giá trị | Hệ quả với 2 tiêu chí |
|---|---|---|
| Nền tảng trước dòng nghiệp vụ đầu tiên | 9–11 tuần-người = **18–21%** quỹ 52 tuần-người | Bảo trì: âm — đổi thời gian tính năng lấy hạ tầng |
| Tính năng cắt ngang | **7–12×** thời gian so với monolith | Bảo trì: âm |
| Tái sử dụng thêm ở web/mobile | **0 dòng** — tái sử dụng nằm ở `packages/*`, chạy y hệt trong monolith | Tái sử dụng: hoà |
| Ràng buộc 7 (2 người debug lúc 2h sáng) | Doc 12 §1.5 tự chấm: *"CHỊU ÁP LỰC NẶNG NHẤT"* | Bảo trì: âm |
| Ngân sách mốc A | 237/250 USD, biên 13 USD, giá VPS chưa kiểm chứng | Rủi ro thuần |
| Điểm hoàn vốn | Mốc C (5.000–50.000 user) và Giai đoạn 2–3 (doc 12 §8.4) | Chưa tới |

Lập luận then chốt về quyền chọn: doc 12 tự chứng minh **tách sau là rẻ nếu ranh giới được giữ** (cầu chì search-service: *"~2 tuần thêm một consumer, không phải viết lại"*). Monolith có ranh giới ép bằng máy trả ~1 ngày công hôm nay và giữ nguyên đường tách; microservices trả trước 9–11 tuần-người cho nhu cầu chưa đến. Chọn phương án giữ quyền chọn.

### 2.3 Những gì NHẶT TỪ DOC 12 áp dụng ngay trong monolith

Các kỷ luật sau của doc 12 rẻ, đúng, và không cần chạy phân tán. Chúng là **bắt buộc**, gắn vào sprint đã ghi:

| # | Nhặt từ doc 12 | Áp dụng trong monolith | Sprint |
|---|---|---|---|
| C1 | **5 miếng vá RSVP** (§4.3): từ vựng `RsvpStatus` + `SEAT_OCCUPYING` trong `@dnc/contracts`; trigger `assert_capacity` **đếm lại số dòng** (không tin cột đếm); `RsvpWriteService` là cửa ghi duy nhất (gộp `withRsvpLock()` của doc 11 vào đây, thêm luật dependency-cruiser **B8**: chỉ file này được import `RsvpRepository`/`WaitlistRepository`); `lock_timeout`/`statement_timeout` ở tầng role + `SET LOCAL` trên đường RSVP, `55P03` → HTTP 503 + `Retry-After`; bộ test đồng thời hợp nhất (25–50 request, idempotency, thăng hạng người bị khoá, property test) | Nguyên vẹn — không có phần nào cần bus | S0 (schema + trigger), S4 (test + service) |
| C2 | **`23505` → thành công idempotent** (§4.7): retry trên 4G trả lại đúng response cũ, không 409/500 | Nguyên vẹn | S4 |
| C3 | **Luật sức chứa** (§4.6): *mọi* thay đổi sức chứa — kể cả scheduler hết hạn suất `held` — nằm trong transaction giữ row lock trên `event_occurrence`, đi qua `RsvpWriteService` | Nguyên vẹn; ghi vào CLAUDE.md | S4 |
| C4 | **Timer nghiệp vụ sống trong PostgreSQL, không trong BullMQ delayed job** (§5.10): ân hạn xoá tài khoản 30 ngày, hết hạn suất giữ chỗ — dẫn xuất từ truy vấn DB; BullMQ chỉ là tối ưu độ trễ. Lý do pháp lý (Nghị định 13/2023) giữ nguyên | Nguyên vẹn | S1 (auth), S4 (hold) |
| C5 | **Hai instance Redis** (§5.4): `redis-queue` (`noeviction` + AOF everysec, named volume) cho BullMQ tách khỏi `redis-cache` (`allkeys-lru`). Xung đột eviction này tồn tại cả trong monolith; chi phí ~0 (2 × 30 MB) | Nguyên vẹn | S0 |
| C6 | **Bảng `outbox`** (§5.5): ghi sự kiện nghiệp vụ (`rsvp.*`, `event.*`, `user.*`) trong cùng transaction, worker poll → enqueue BullMQ. Đóng lỗ hổng mất thông báo giữa COMMIT và enqueue, **và là đường nối tách service sau này** — chính nó làm ước tính "~2 tuần/lần tách" thành sự thật | Relay = worker in-process poll, không cần Redis Streams | S4 (cùng luồng push) |
| C7 | **Sửa ràng buộc 1** (§7.6): DNS trỏ thẳng Caddy/nginx tại VN (grey-cloud, Cloudflare chỉ làm DNS); CDN trong nước cho ảnh; **gọi thẳng FCM HTTP v1 + APNs** thay Expo Push Service trên đường thông báo lõi (Expo SDK vẫn lấy device token); registry pull-through mirror cho CI; Sentry `shutdownTimeout: 2000` + transport không chặn + scrub PII. *Điểm này ghi đè dòng "Expo Push — giữ nguyên hoàn toàn" của doc 11 §3.1* | Nguyên vẹn; ~1 ngày công cho FCM/APNs | S0 (DNS/CDN/mirror), S4–S5 (push) |
| C8 | **Kỷ luật đồng hồ** (§6.9): mọi timestamp nghiệp vụ do PostgreSQL sinh (`DEFAULT now()`); client không bao giờ sinh khoá chính, chỉ sinh `Idempotency-Key`; cấm `new Date()` trong repository; chrony + `vn.pool.ntp.org` | Nguyên vẹn | S0 |
| C9 | **Schema con `identity_secret`** (§3.2): `credential`, `refresh_token` nằm schema riêng với GRANT hẹp — SQL injection ở đường hồ sơ không đọc được hash mật khẩu. Cộng role `analytics_ro` SELECT-only, credential không nạp vào container | Nguyên vẹn | S1 |
| C10 | **Quy tắc nghiệp vụ độc lập kiến trúc**: người xoá tài khoản là organizer (huỷ occurrence tương lai, chuyển co-host, ẩn danh quá khứ — §5.10); kiểm duyệt hai bước `SUSPENDED` 72h trước `TAKEN_DOWN`, không huỷ RSVP khi chưa hết cửa kháng nghị (§5.11) | Nguyên vẹn — đây là quyết định sản phẩm | Spec ở S3–S5 |
| C11 | **Cảnh báo phụ thuộc**: không dùng `typeorm-naming-strategies` (chết 4 năm, không tương thích TypeORM 1.1) — tự viết ~30 dòng kế thừa `DefaultNamingStrategy` (§6.12). Sửa luôn [03-domain-va-du-lieu.md](../analysis/03-domain-va-du-lieu.md) đang đề xuất gói này | Nguyên vẹn | S0 |

### 2.4 Những gì của doc 12 KHÔNG áp dụng ở Giai đoạn 1 — và vì sao

Đây là **cái giá của phân tán**, chỉ trả khi thật sự tách:

| Không áp dụng | Vì sao |
|---|---|
| `user_snapshot` / `user_state` + replication qua bus | Trong monolith, JOIN thẳng `profile` là đúng và rẻ hơn. Nuôi bản sao khi chưa phân tán là trả thuế phân tán mà không có phân tán |
| Cấm FK/JOIN xuyên bounded context | JOIN là siêu năng lực của monolith (doc 12 §1.3 tự liệt kê "Không JOIN được nữa" là *chi phí*). Ranh giới giữ ở tầng code (B1–B8), không ở tầng SQL. Khi tách một context, expand/contract gỡ JOIN **của riêng context đó** — nằm trong ước tính 2–3 tuần |
| 3 schema + 3 DB role LOGIN riêng | Đi kèm luật cấm JOIN ở trên. Giai đoạn 1 chỉ tách `identity_secret` (C9) |
| Redis Streams bus, envelope CloudEvents, dual-publish v1/v2, thứ tự deploy consumer-trước | Chưa có hai tiến trình để lệch nhau. Outbox (C6) giữ sẵn chỗ nối |
| Saga orchestration (xoá tài khoản, purge 2 participant) | Trong monolith là **một transaction + timer trong PG** (C4). Phần nghiệp vụ giữ ở C10 |
| PgBouncer từ ngày đầu | Một tiến trình → pool của TypeORM đủ. Đưa vào ở mốc B cùng read replica; khi đó áp nguyên danh mục cấm transaction-pooling của doc 12 §6.9 |
| 3 VPS (app-1/db-1/ops-1) | Topology chi phí theo doc 04 §13.3 (~196 USD có dự phòng, biên ~54 USD thay vì 13) |
| `DNC_MODE=mono`, bus-bootstrap, job `compat` main~1 vs HEAD | Chỉ có nghĩa khi đã có nhiều service |

### 2.5 Cầu chì tách service — điều kiện kích hoạt doc 12

Ghi sẵn hôm nay để lúc đó không tranh luận lại. **Tách khi chạm BẤT KỲ cầu chì nào**, và chỉ tách đúng context chạm ngưỡng:

| Cầu chì | Ngưỡng | Tách gì |
|---|---|---|
| F1 — Giai đoạn 2 (nhà ở) khởi động | Quyết định sản phẩm | `housing` dựng thành service/module mới ngay từ đầu theo doc 12; **không** dùng chung bảng `rsvp` (doc 12 §4.9) |
| F2 — Tìm kiếm | p95 > 300ms **hoặc** corpus > 200k tài liệu | `search` consumer đọc từ outbox (doc 12 §6.6) |
| F3 — Realtime/chat | > 2.000 WebSocket đồng thời, **hoặc** nhịp deploy làm gián đoạn chat thành phàn nàn thật của người dùng | `comms` theo doc 12 §3.4, kèm 3 cam kết §3.5 |
| F4 — Tải ghi RSVP | Row-lock contention đo được (p95 đường RSVP > 1s kéo dài) mà scale dọc DB đã hết đường | `event` theo doc 12 §3.3 |
| F5 — Con người | Có đội thứ hai (≥ 4 dev) làm việc song song trên các context khác nhau | Tách theo ranh giới sở hữu (Conway) |
| F6 — Quy mô | Chạm mốc C (≥ 5.000 user hoạt động) — điểm doc 12 §8.4 chứng minh microservices bắt đầu trả lại tiền | Rà toàn cục theo doc 12 |

Đường tách kỹ thuật: outbox đã có (C6) → thêm consumer → expand/contract gỡ JOIN của context bị tách → `pg_dump -n` + logical replication nếu cần cluster riêng (doc 12 §6.11). Ước tính 2–3 tuần-người mỗi lần tách, **với điều kiện B1–B8 chưa từng bị vi phạm** — đó là lý do luật ranh giới là CI đỏ chứ không phải warning.

## 3. Điều kiện tiên quyết trước 07/09/2026

ADR này chỉ có hiệu lực khi đủ ba việc — cả ba đều đã được hai tài liệu gọi tên nhưng chưa ai làm:

1. **Hỏi thẳng hai lập trình viên** (doc 11 §4): *"lần trước cụ thể chỗ nào đau, có phải do NestJS/TypeORM không?"* Nếu câu trả lời là một giới hạn kỹ thuật thật không có đường vòng → tiền đề "giữ framework" sai, mở lại doc 11 §2 trước khi ký.
2. **Báo giá VPS thật** từ Viettel IDC / AZDIGI / Vietnix cho topology doc 04, dán vào `docs/adr/0009-vps-quotes.md`. Đây là ẩn số lớn nhất của ràng buộc ngân sách theo cả hai tài liệu.
3. **Founder ký** — đổi Trạng thái ở đầu file này thành ĐÃ DUYỆT kèm ngày.

## 4. Hệ quả

**Được:**

- 9–11 tuần-người quay về làm tính năng; lịch M0–M6 giữ theo doc 11 §6.2 (rủi ro trượt duy nhất: 0–2 ngày ở M0).
- ~7 công nghệ vận hành lúc 2h sáng thay vì 12; ràng buộc 7 từ "chịu áp lực nặng nhất" về mức bình thường.
- Rẻ hơn ~28 USD/tháng ở mốc A; biên ngân sách ~54 USD thay vì 13.
- Toàn bộ lợi ích tái sử dụng (Zod contracts, `domain`, `policy`, `query`, `map-style`) giữ nguyên — chúng chưa bao giờ phụ thuộc microservices.
- Đường tách Giai đoạn 2–3 được giữ sống bằng máy (B1–B8 + outbox), không bằng lời hứa.

**Mất (nói thẳng):**

- Không có cách ly sự cố cấp tiến trình giữa các context — một bug memory leak ở module chat có thể ảnh hưởng đường RSVP. Giảm thiểu: worker tách tiến trình khỏi API từ đầu (đã có trong doc 04/11), alert theo module.
- Deploy là một đơn vị — không deploy riêng identity trong khi event đang đổi. Ở nhịp đội 2 người, đây là phi-vấn-đề cho tới F5.
- Nếu Giai đoạn 2 đến sớm hơn dự kiến, trả chi phí tách lúc đó (2–3 tuần/service) thay vì đã trả trước. Đây là đánh đổi có chủ đích: xác suất Giai đoạn 2 đúng hẹn thấp hơn xác suất M6 cần từng tuần.

## 5. Việc dọn tài liệu kéo theo (làm trong S0, ~0,5 ngày)

| # | Việc |
|---|---|
| D1 | Sửa header doc 12: trạng thái từ "bản chốt" → **"Kiến trúc đích cho mốc C / Giai đoạn 2+ — kích hoạt theo cầu chì ADR-0000 §2.5"**. Hoàn thiện các mục 9–13 đang thiếu (mục lục hứa 13 mục, file dừng ở 8.6; mọi tham chiếu 9.4, 12.2–12.6, 13 đang trỏ vào hư không) — làm khi kích hoạt, nhưng phải ghi chú ngay để người đọc biết file chưa trọn |
| D2 | **Gỡ trùng số ADR**: chuỗi 0001–0008 thuộc doc 11 §8.4 (giữ nguyên). Các ADR mà doc 12 tham chiếu (ngưỡng NATS, luật sức chứa, cấm xuyên schema, cầu chì search, rủi ro ops-1, báo giá VPS) đánh số lại **0009 trở đi**; sửa các tham chiếu trong doc 12 |
| D3 | Sửa doc 12 §7.3: `@nestjs/throttler` → guard tự viết trên Redis (doc 11 đã kiểm chứng throttler không hỗ trợ Nest 12) |
| D4 | Thống nhất PostGIS **3.6.4** (doc 12 đang ghi 3.6.3 ở hai chỗ); tạo `docs/adr/versions.md` làm nguồn phiên bản duy nhất như doc 12 đã tuyên bố, chép từ bảng doc 11 §3.1 |
| D5 | Sửa [03-domain-va-du-lieu.md](../analysis/03-domain-va-du-lieu.md) bỏ `typeorm-naming-strategies` (C11) |

---

*ADR này chọn giữa hai tài liệu tốt. Nếu sau này ai đó thấy quyết định sai, đường mở lại là các cầu chì §2.5 — không phải xoá file này đi.*
