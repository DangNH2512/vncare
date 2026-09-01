# Bối Cảnh Phiên Làm Việc

Ghi nhanh trạng thái cuối mỗi phiên để phiên sau vào việc được ngay. Ghi đè, không
tích luỹ — lịch sử dài hạn thuộc về [DECISIONS.md](DECISIONS.md).

## Trạng thái hiện tại (2026-09-01)

- App web đã tách làm đôi theo quyết định của chủ dự án:
  `apps/web-client-side` (`@dnc/web-client`) cho người dùng cuối và
  `apps/web-admin-side` (`@dnc/web-admin`) cho đội ngũ vận hành. Thư mục web
  gộp chung trước đây không còn được dùng ở bất kỳ tài liệu nào.
- `apps/web-client-side`: đang dựng UI cơ bản bằng Next.js 16 — bốn màn hình
  feed sự kiện, chi tiết sự kiện, khám phá, hồ sơ. Chưa nối API thật.
- `apps/web-admin-side`: còn **rỗng**, chưa bắt đầu. Stack đã chốt là Next.js 16
  App Router giống client để dùng chung `packages/*`.
- `apps/api` và `apps/mobile`: chưa có code.
- Đã có bộ tài liệu phân tích đầy đủ trong `docs/analysis/` (10 tài liệu + bản tổng hợp).
- Đã có bộ skill, rule, agent định nghĩa trong `.agent/`, đã tinh chỉnh theo dự án này.
  Agent sở hữu web đã tách thành `web-client-agent` và `web-admin-agent`.
- Việc tiếp theo: dựng khung monorepo còn thiếu (`apps/api`, `apps/web-admin-side`,
  `apps/mobile`, `packages/shared-types`, `ops/`) theo
  `docs/analysis/04-tech-stack-va-kien-truc.md`.
