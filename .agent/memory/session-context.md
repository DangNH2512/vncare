# Bối Cảnh Phiên Làm Việc

Ghi nhanh trạng thái cuối mỗi phiên để phiên sau vào việc được ngay. Ghi đè, không
tích luỹ — lịch sử dài hạn thuộc về [DECISIONS.md](DECISIONS.md).

## Trạng thái hiện tại (2026-09-01)

### apps/api — không còn là spike, đã nối Postgres thật

- `DatabaseModule` cấp `PG_POOL` (`pg`), đọc `DATABASE_URL`.
- Năm module theo khuôn controller / service / repository / mapper / module:
  `event` (CRUD đầy đủ, PostGIS radius), `post`, `comment`, `reaction`,
  `chat` (REST + `ChatGateway` socket.io namespace `/chat`).
- Migration `0004_community_interaction.sql` + `0005_interaction_counters.sql`
  đã áp lên container local. Counter do trigger duy trì.
- Xuyên suốt ở `src/common/`: `AuthenticatedGuard` (**stub đọc header
  `x-user-id`, tự throw nếu `NODE_ENV=production`**), `TrustLevelGuard` +
  `@MinTrustLevel`, `translatePostgresError`, cursor phân trang, `withTransaction`.
- 65 test e2e chạy thật với database, gồm 6 test socket gateway.
- **Chạy:** `pnpm --filter @dnc/api dev` (vite-node). Máy này port 3001 đã bị Docker
  chiếm nên dùng `PORT=3101`.

### apps/web-client-side

- Composer kiểu Instagram, hai bước (chọn media → soạn nội dung):
  `post-composer.tsx`, `media-picker.tsx`, `media-carousel.tsx`,
  `location-picker.tsx` (MapLibre + tile OSM), `community-post.tsx`.
  Upload chạy ngay lúc chọn file, có tiến độ; đăng bài là tức thì.
  Hướng thẩm mỹ giữ nguyên `coastal-bright`, không hardcode màu (trừ màu marker
  MapLibre, đã chú thích lý do tại chỗ).
- Đã kiểm chứng bằng Chromium thật, 13 bước: 2 ảnh upload xong → ghim An Thượng
  trên bản đồ → POST 201 → gallery 1/2 + chip địa điểm hiện trong feed → ảnh tải
  được từ MinIO sau reload → dark mode không vỡ.
- Sự kiện trong feed **vẫn là mock** (`MOCK_EVENTS`). Chỉ bài đăng là dữ liệu thật.
- `.env.local` đặt `NEXT_PUBLIC_API_URL=http://localhost:3101` (không commit).

### Cần biết trước khi làm tiếp

- Chưa có auth thật. Danh tính dev đi bằng header; web client tự sinh uuid lưu
  `localStorage`. Xem T-01 trong ACTIVE_TASKS.
- `areas` phải seed trước khi tạo post/event: `pnpm --filter @dnc/api seed:areas`.
- **MinIO phải chạy** để đăng ảnh/video: `docker compose -f docker-compose.local.yml up -d minio`
  (cổng 9002; 9000 trên máy này đã bị project khác chiếm). Bucket `dnc-media` tự tạo.
- CORS allow-list ở `main.ts`, mặc định `localhost:3000` và `localhost:3002`.
- `apps/web-admin-side` và `apps/mobile`: vẫn rỗng.
- Kế hoạch bản đồ đã viết xong, chưa code: `docs/analysis/13-...`.
