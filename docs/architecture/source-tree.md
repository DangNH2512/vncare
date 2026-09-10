# Cây thư mục nguồn

> Quyết định kiến trúc nền: [ADR-0000](../adr/0000-kien-truc-monolith-first.md).
> Quy ước viết doc trong code: [.agent/rules/code-documentation.md](../../.agent/rules/code-documentation.md) — comment tiếng Anh, phong cách mô tả API.

## Toàn cảnh

```
apps/                       # Thứ DEPLOY được
  api/                      # NestJS 12 — monolith module hoá (ESM)
    src/
      main.ts               # bootstrap: global pipe + serializer + OpenAPI
      app.module.ts
      common/               # guards, pipes, interceptors, filters, openapi
      config/               # env schema (Zod) — thêm ở S0 khi có biến env thật
      database/
        sql/                # SQL tay: extensions, bảng lõi, trigger assert_capacity
        migrations/         # TypeORM migrations (khi ORM vào, S0 tuần 2)
      modules/<name>/       # module 4-class: controller / service / repository / module
                            # + dto/, entities/; chỉ lộ ra qua index.ts (luật B6)
    e2e/                    # test đặt ngoài src (luật 16): e2e/modules/<name>/
  web/                      # Next.js 16 — scaffold bằng create-next-app (S0 tuần 2)
  mobile/                   # Expo 57 — scaffold bằng create-expo-app (S0 tuần 2)

packages/                   # Thư viện DÙNG CHUNG (không deploy trực tiếp)
  config/                   # preset tsconfig (base / lib / nest)
  contracts/                # Zod schema qua ranh giới mạng + từ vựng RSVP khoá cứng
  domain/                   # quy tắc nghiệp vụ thuần — 0 framework (luật B1)
  tokens/                   # design token thuần TS — 0 JSX (luật B4)
  i18n/                     # en.json / vi.json + union type MessageKey sinh tự động
  geo/                      # GeoJSON 6 khu vực Đà Nẵng, có version

ops/                        # hạ tầng local/CI: redis conf, db smoke test
docs/                       # phân tích, ADR, kiến trúc
.agent/                     # rules + skills cho agent
```

## Vì sao `apps/*` + `packages/*` (khác Booking2025)

Booking2025 đặt các app phẳng ở gốc vì mỗi app là một project độc lập, không
chia sẻ code. Vncare là pnpm workspace với 6 package dùng chung, nên tách hai
nhóm theo chuẩn Turborepo: `apps/*` = deploy được, `packages/*` = thư viện.
Bên trong `apps/api/src/` cấu trúc giống `nail-booking-api/src/` (modules/,
common/, database/) nhưng gộp ba thùng chồng lấn `common`/`shared`/`core` của
booking thành một `common/` duy nhất.

## Luật ranh giới (CI đỏ khi vi phạm)

`.dependency-cruiser.cjs` cưỡng chế B1–B8; đã kiểm chứng luật nổ đúng bằng vi
phạm cố ý. Lưu ý vận hành: dependency-cruiser 18.2.0 chưa hỗ trợ API
TypeScript 7, đang chạy qua parser fallback — import type-only có thể lọt lưới
cho tới khi bản hỗ trợ TS7 phát hành (theo dõi ở mỗi lần nâng version).

## Lệnh hằng ngày

| Lệnh | Việc |
|---|---|
| `pnpm typecheck` | typecheck toàn workspace (turbo) |
| `pnpm test` | unit + e2e toàn workspace |
| `pnpm lint` | oxlint type-aware (gồm no-floating-promises) |
| `pnpm dep-check` | luật ranh giới B1–B8 |
| `pnpm db:up` / `pnpm db:smoke` | PostgreSQL 18 + PostGIS local, smoke bất biến RSVP |
| `pnpm gen:i18n-keys` | sinh lại union type MessageKey từ en.json |
