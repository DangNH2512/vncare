# Bối Cảnh Phiên Làm Việc

Ghi nhanh trạng thái cuối mỗi phiên để phiên sau vào việc được ngay. Ghi đè, không
tích luỹ — lịch sử dài hạn thuộc về [DECISIONS.md](DECISIONS.md).

## Cập nhật 2026-10-01

- **Chạy stack:** `ADMIN_PORT=3012 pnpm dev` (máy này: 3002 bị `nail-booking-admin` chiếm). `ops/dev.sh` giờ bật đủ `postgres redis-cache redis-queue mailpit minio` và kiểm Docker daemon trước. Web :3000, Admin :3012, API :3101, Mailpit :8025.
- **Sau khi sửa `apps/api/src/main.ts` phải restart API**: `vite-node --watch` không chạy lại `bootstrap()` (ví dụ `trust proxy`).
- **Đợt `m1-auth-hardening`** (`.agent/specs/_changes/m1-auth-hardening/`): rate limit login/register (Redis cache, HMAC key, fail-open 750ms, env `RATE_LIMIT_*`, `TRUST_PROXY`), bỏ log khoá JWT, bảng `trust_signals` append-only (0009, đã áp tay vào DB local), test `pg_enum`, web-client đọc body lỗi phẳng + helper `translateApiError`, admin login một ô identifier. `apps/api/.env` local có ngưỡng 1000 để dev/Playwright không tự khoá.
- **Next 16 không tự điền `X-Forwarded-For`**: không có reverse proxy thì mọi người dùng web chung một bucket IP (T-18).
- `apps/web-admin-side` đã có: đăng nhập staff, Overview (mới tiêu đề), System health; Playwright 18 ca.
- Đợt kế tiếp đã chốt brief + task board: `.agent/specs/_changes/discover-and-admin-overview/`.

## Trạng thái trước đó (2026-09-01)

### apps/api — không còn là spike, đã nối Postgres thật

- `DatabaseModule` cấp `PG_POOL` (`pg`), đọc `DATABASE_URL`.
- Năm module theo khuôn controller / service / repository / mapper / module:
  `event` (CRUD đầy đủ, PostGIS radius), `post`, `comment`, `reaction`,
  `chat` (REST + `ChatGateway` socket.io namespace `/chat`).
- Migration `0004_community_interaction.sql` + `0005_interaction_counters.sql`
  đã áp lên container local. Counter do trigger duy trì.
- Auth thật đã xong: `modules/auth` (JWT RS256 + Argon2id + refresh xoay vòng có
  ân hạn 10s), `modules/profile`. `JwtAuthGuard` là `APP_GUARD` **deny-by-default**;
  route đọc công khai phải gắn `@Public()`. Guard bỏ qua context không phải HTTP.
- Xuyên suốt ở `src/common/`: `JwtAuthGuard`, `TrustLevelGuard` + `@MinTrustLevel`,
  `@Public`, `@CurrentUser` / `@OptionalUser`, `translatePostgresError`,
  cursor phân trang, `withTransaction`.
- 101 test e2e chạy thật với database, gồm socket gateway và auth. Chạy 12 lần
  liên tiếp không flaky (pool test giới hạn 4 connection/spec — 9 spec × 10 sẽ
  chạm trần `max_connections=100`).
- **Chạy:** `pnpm --filter @dnc/api dev`. Cấu hình đọc từ `apps/api/.env`
  (không commit; mẫu ở `.env.example`) — không cần truyền biến trên dòng lệnh.

### apps/web-client-side

- Composer kiểu Instagram, hai bước (chọn media → soạn nội dung):
  `post-composer.tsx`, `media-picker.tsx`, `media-carousel.tsx`,
  `location-picker.tsx` (MapLibre + tile OSM), `community-post.tsx`.
  Upload chạy ngay lúc chọn file, có tiến độ; đăng bài là tức thì.
  Hướng thẩm mỹ giữ nguyên `coastal-bright`, không hardcode màu (trừ màu marker
  MapLibre, đã chú thích lý do tại chỗ).
- Đã kiểm chứng bằng **cả WebKit (engine Safari) và Chromium**, 13 bước: 2 ảnh upload xong → ghim An Thượng
  trên bản đồ → POST 201 → gallery 1/2 + chip địa điểm hiện trong feed → ảnh tải
  được từ MinIO sau reload → dark mode không vỡ.
- Sự kiện trong feed **vẫn là mock** (`MOCK_EVENTS`). Chỉ bài đăng là dữ liệu thật.
- `.env.local` đặt `NEXT_PUBLIC_API_URL=http://localhost:3101` (không commit).

### Vòng lặp sự kiện đã chạy end-to-end (2026-09-02)

Tạo sự kiện `/events/new` → publish → hiện trong feed thật → Join/Waitlist ngay trên
card hoặc ở `/events/[id]` → danh sách người tham gia. `MOCK_EVENTS` đã bị xoá; feed
và right-rail đọc API thật. `modules/rsvp` giữ chỗ dưới row lock, huỷ chỗ thăng hạng
người đầu hàng chờ trong cùng transaction.

### Route hiện có

`/` · `/events/[id]` · `/events/new` · `/u/[handle]` · `/login` · `/register` ·
`/discover`, `/my-events`, `/notifications` (giữ chỗ bằng `BlankScreen`) ·
`not-found.tsx`. **Không còn `/profile`.**

### Cần biết trước khi làm tiếp

- **Verify UI phải chạy WebKit**, không chỉ Chromium: Safari khác Node/Chromium ở
  định dạng locale và đã từng che mất một lỗi hydration thật.

- Auth đã thật. Chưa có: xác minh email (đăng ký cấp thẳng T1), social login,
  (rate limit đã có từ 01/10). Xem T-10, T-11, T-13.
- `apps/web-client-side` proxy `/api/*` sang API qua `rewrites()` trong
  `next.config.ts` (biến `API_ORIGIN`). Đây là điều kiện để cookie httpOnly hoạt
  động — đừng gọi thẳng cross-origin.
- `areas` phải seed trước khi tạo post/event: `pnpm --filter @dnc/api seed:areas`.
- **MinIO phải chạy** để đăng ảnh/video: `docker compose -f docker-compose.local.yml up -d minio`
  (cổng 9002; 9000 trên máy này đã bị project khác chiếm). Bucket `dnc-media` tự tạo.
- **Dọn dữ liệu test:** `pnpm db:clean-test` — CHỈ xoá tài khoản `@example.test`.
  Không bao giờ chạy `DELETE FROM users` không giới hạn: nó xoá luôn tài khoản
  chủ dự án đăng ký tay và trông y hệt như đăng nhập bị hỏng.
- CORS allow-list ở `main.ts`, mặc định `localhost:3000` và `localhost:3002` (hai web gọi API qua rewrite cùng origin nên không phụ thuộc CORS).
- `apps/mobile`: vẫn rỗng.
- Kế hoạch bản đồ đã viết xong, chưa code: `docs/analysis/13-...`.
