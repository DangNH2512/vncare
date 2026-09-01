# 11 — Đánh giá stack "hiện đại hơn": có nên đổi không, và đổi cái gì

> **Trạng thái:** Khuyến nghị chốt, thay thế mục 1 của `04-tech-stack-va-kien-truc.md`.
> **Ngày:** 2026-09-01. Repo greenfield — chưa có một dòng code nào, nên chi phí đổi lúc này bằng 0.
> **Câu hỏi được hỏi:** "phân tích xem có thể dùng techstack nào hiện đại hơn mà dễ tái sử dụng, bảo trì code hơn không".
> **Hai tiêu chí xếp trên tất cả:** TÁI SỬ DỤNG CODE và DỄ BẢO TRÌ. "Hiện đại" chỉ có giá trị khi phục vụ hai điều đó.
> **Đối tượng đọc:** chủ dự án (đọc mục 1 là đủ ra quyết định), hai lập trình viên (đọc mục 3, 8), người rà soát kỹ thuật (đọc mục 9).

---

## 1. Trả lời thẳng câu hỏi

**Một.** Không đổi stack — giữ nguyên NestJS + TypeORM + PostgreSQL/PostGIS + Redis/BullMQ + Next.js + Expo, tức là giữ toàn bộ phần đội đã thạo và toàn bộ phần đang thoả sáu ràng buộc cứng; không có bằng chứng nào cho thấy bộ khung này là nguyên nhân của "khó tái sử dụng, khó bảo trì".

**Hai.** Đổi đúng bốn thứ: (a) nâng mọi thành phần lên bản hiện hành ngay commit đầu tiên — Node 24, NestJS 12, TypeORM 1.1, PostgreSQL 18.6, PostGIS 3.6.4, Next 16, Expo 57, TypeScript 7 — vì greenfield nên giá bằng 0, còn hoãn lại thì trong 12 tháng tới phải trả sáu đợt nâng cấp lúc đã có người dùng thật; (b) thay `class-validator` + `class-transformer` + decorator `@ApiProperty` bằng **một schema Zod duy nhất** chạy qua `StandardSchemaValidationPipe` chính chủ của NestJS 12; (c) thay Leaflet (web) + react-native-maps (mobile) bằng **MapLibre ở cả hai đầu** để cấu hình bản đồ chỉ viết một lần; (d) thêm bốn package dùng chung — `contracts`, `domain`, `policy`, `query` — chứa đúng những quy tắc mà bản kiến trúc hiện tại đang buộc phải viết ba lần.

**Ba.** Thêm một bộ công cụ ép ranh giới chạy trong CI (`dependency-cruiser`, `type-coverage` ≥98%, `knip`) tốn khoảng một ngày viết luật; đây là khoản đầu tư rẻ nhất trên đơn vị rủi ro trong toàn bộ phân tích, và nó là thứ quyết định Giai đoạn 2 (nhà ở) và Giai đoạn 3 (y tế) có tách ra được hay không.

**Bốn.** Không đổi ORM sang Drizzle (bản ổn định `0.45.2` đóng băng từ 27/03/2026, `v1` vẫn ở RC không có ngày GA — tôi đã tự tra registry), không bỏ NestJS sang Hono (mất DI/module là mất đúng thứ giữ codebase sạch khi thay người), không dùng Better Auth ở Giai đoạn 1 (nó **không có adapter TypeORM**, và cầu nối NestJS chỉ khai báo hỗ trợ tới Nest 11 + TypeScript 6 — tôi đã giải nén gói ra kiểm), không dùng BaaS/Supabase (bảng RSVP buộc phải cấm client ghi thẳng, tức là tắt đúng tính năng bán hàng chính ở đúng bảng quan trọng nhất mà vẫn trả toàn bộ chi phí vận hành).

**Năm.** Chi phí chuyển đổi khoảng **3–4 tuần-người** chia cho hai lập trình viên và dàn qua Sprint 0 → Sprint 3, trong đó chỉ MapLibre là chi phí học thật sự; **M0 (18/09/2026) có rủi ro trượt 0–2 ngày**, còn M1→M6 không bị ảnh hưởng nếu MapLibre nằm ở S2–S3 và CASL nằm ở S1 — đúng nơi các tính năng đó vốn đã nằm trong roadmap.

---

## 2. Bốn phương án đã cân nhắc — bảng so sánh

Ba giám khảo độc lập chấm theo ba lăng kính khác nhau: (1) thực tế của đội 2 người và xác suất kịp M6; (2) khả năng bảo trì sau 24 tháng khi đã có người mới; (3) rủi ro kỹ thuật và mức thoả 6 ràng buộc cứng.

| # | Triết lý | Thay đổi chính | LK1 | LK2 | LK3 | **TB** | Rủi ro lớn nhất |
|---|---|---|---:|---:|---:|---:|---|
| **P3** | Giữ bộ khung, nâng phiên bản, thay đúng 2 mảnh, đầu tư vào công cụ ép ranh giới | NestJS 12 · TypeORM 1.1 · Zod native · MapLibre · dependency-cruiser + knip + type-coverage | 8,8 | 8,8 | 9,0 | **8,87** | Vẫn tự viết và tự bảo trì lớp JWT + refresh rotation; không có nơi chứa quy tắc nghiệp vụ dùng chung |
| **P4** | Hợp đồng Zod ở giữa, `packages/domain` chứa quy tắc nghiệp vụ, KHÔNG chia sẻ component | NestJS 12 · Zod contracts · `packages/domain` + `packages/query` · Better Auth · giữ Leaflet | 8,2 | 7,7 | 8,2 | **8,03** | Rủi ro CON NGƯỜI: `packages/domain` thành bãi rác nếu không ai gác cổng; chỉ có một luật lint để chống |
| **P1** | Một schema, không sinh code — type-safety bằng suy luận | Drizzle + Hono RPC + Zod + Better Auth, bỏ NestJS và bỏ codegen | 4,9 | 5,8 | 8,3 | **6,33** | Đặt tầng dữ liệu lên nhánh Drizzle đóng băng 5 tháng chắc chắn phải di trú, đồng thời bỏ framework duy nhất đội có kinh nghiệm vận hành |
| **P2** | Lõi giao dịch tự chủ, vành đai mua sẵn | Better Auth + CASL + Directus + Centrifugo + MapLibre | 6,0 | 5,5 | 6,8 | **6,10** | Bề mặt vận hành lớn nhất (5 khoản cược + 2 container + 1 tiến trình Go); sai ở đúng mắt xích tích hợp của khoản mua lớn nhất |

**Ba điều đáng chú ý về bảng này.**

Khoảng cách giữa P3 và P4 chỉ 0,84 điểm và cả ba giám khảo đều xếp chúng ở hai vị trí đầu. Hai phương án này dùng **chung một lõi công nghệ** (NestJS 12 + TypeORM 1.1 + Zod native + Next + Expo); chúng khác nhau ở chỗ P3 mang bộ công cụ **ÉP** ranh giới bằng máy, còn P4 mang tầng **CHỨA** quy tắc nghiệp vụ dùng chung. Hai thứ đó không loại trừ nhau — chúng vá đúng điểm yếu của nhau. Đó là lý do khuyến nghị ở mục 3 là hợp nhất, không phải chọn một.

P1 được lăng kính rủi ro kỹ thuật chấm 8,3 nhưng lăng kính đội-2-người chấm 4,9. Đó không phải mâu thuẫn: P1 là câu trả lời đúng cho câu hỏi "stack nào tinh khiết nhất về kiểu dữ liệu", không phải câu hỏi "đội 2 người nào ra mắt kịp M6 rồi vẫn sửa được". Chính tài liệu P1 cũng viết ra bản án của mình.

P2 chứa hai ý tưởng xuất sắc được giữ lại trong khuyến nghị (CASL, và bộ lọc ngân sách định lượng), nhưng bảng stack của nó có một tổ hợp phiên bản **không cài được** — chi tiết ở mục 9.

---

## 3. Khuyến nghị chính — bảng stack chốt duy nhất

**Xương sống là Phương án 3.** Ghép vào đó: `packages/domain` + `packages/query` + nguyên tắc "chia sẻ logic, không chia sẻ markup" + union type khoá i18n **từ P4**; `packages/policy` bằng CASL + bộ lọc ngân sách + Directus hoãn sang cuối **từ P2**; ràng buộc `satisfies` giữa entity và hợp đồng + đưa payload BullMQ/Socket.IO vào cùng hệ thống kiểu + RSC gọi thẳng tầng truy vấn cho trang SEO **từ P1**.

Bảng dưới đây thay thế bảng ở mục 1 của `04-tech-stack-va-kien-truc.md`. Cột cuối ghi rõ **giữ nguyên** hay **thay cho X**.

### 3.1 Bảng chốt

| Lớp | Công nghệ chốt | Phiên bản (ghim chính xác) | Thay đổi so với bản cơ sở |
|---|---|---|---|
| Runtime | Node.js "Krypton" | 24.x LTS (≥ 24.20) | **thay cho Node 22 LTS** — Node 22 đã vào maintenance từ 21/10/2025 và EOL 30/04/2027, tức chỉ 2 tháng sau ngày ra mắt M6 |
| Backend framework | NestJS | 12.0.1 | **thay cho NestJS 11** — mở khoá Standard Schema trong lõi; giữ nguyên framework, chỉ nâng major |
| Hợp đồng dữ liệu | Zod trong `packages/contracts` | 4.5.4 | **thay cho** `class-validator` + `class-transformer` + decorator `@ApiProperty` thủ công |
| Pipe validate | `StandardSchemaValidationPipe` (chính chủ `@nestjs/common` 12) | đi kèm Nest 12 | **thay cho** `ValidationPipe({whitelist, forbidNonWhitelisted, transform})`. **KHÔNG dùng `nestjs-zod`** — thừa, và bản 5.5.0 chưa hỗ trợ Nest 12 |
| Validate chiều ra | `StandardSchemaSerializerInterceptor` + `@SerializeOptions({ schema })` | đi kèm Nest 12 | **thay cho** response DTO khai báo tay từng trường |
| OpenAPI | `@nestjs/swagger` (standard-schema converter) | 12.0.1 | **giữ nguyên vai trò, đổi nguồn** — OpenAPI nay sinh từ chính schema Zod, không từ decorator |
| API client | `packages/api-client` sinh từ OpenAPI | — | **giữ nguyên** — xem mục 4, lý do là binary trên store không rút về được |
| ORM | TypeORM | 1.1.0 | **thay cho TypeORM 0.3.2x** — cùng công nghệ, nhảy thẳng major trên greenfield thay vì nợ một đợt codemod |
| CSDL chính | PostgreSQL | 18.6 | **thay cho PostgreSQL 16** — có `uuidv7()` native (bỏ được thư viện sinh UUID) và async I/O; EOL 2030-11-14 |
| Mở rộng địa lý | PostGIS | 3.6.4 | **thay cho PostGIS 3.4** — chỉ nâng bản, giữ nguyên công nghệ. **Không dùng 3.7.0**: nó mới ở `rc1`, chưa GA |
| Cache / rate limit / pub-sub | Redis | 7.4.x | **giữ nguyên** |
| Job queue | BullMQ | 6.3.4 | **giữ nguyên công nghệ, nâng major.** Payload job định nghĩa bằng Zod schema của `packages/contracts`, parse ở đầu worker |
| Rate limit | Guard tự viết trên Redis (sliding window + Lua) | — | **thay cho `@nestjs/throttler`** — bản 6.5.0 khai peer tối đa `^11`, chưa hỗ trợ Nest 12. Bản cơ sở (§6.5) vốn đã đặc tả guard tuỳ biến nên đây gần như không phải việc mới |
| Realtime | Socket.IO | 4.8.3 | **giữ nguyên.** Server khai báo `Server<ClientToServerEvents, ServerToClientEvents>` với interface suy từ Zod |
| Scale ngang WebSocket | `@socket.io/redis-adapter` — **TRÌ HOÃN, ghi vào sổ rủi ro** | 8.3.0 | **thay đổi về thời điểm, không về công nghệ** — gói này đứng yên từ 13/03/2024. Ở mốc 500–5.000 user một tiến trình gateway là đủ; đừng đưa adapter vào kiến trúc ngày một |
| Web | Next.js + React + Tailwind | 16.3.4 / 19.x / 4.x | **thay cho Next.js 15** — App Router + RSC giữ nguyên, ràng buộc SEO đã thoả. Lưu ý breaking: `middleware` → `proxy.ts` |
| Mobile | Expo + React Native + Expo Router | SDK 57.0.18 / RN 0.87.1 / router 57 | **thay cho Expo 54 / RN 0.81 / Router 6** — không đổi nền tảng, chỉ bắt kịp 3 SDK |
| Bản đồ (web) | MapLibre GL JS | 6.6.0 | **thay cho Leaflet 1.9 + react-leaflet 5** — leaflet chưa ra bản mới từ 18/05/2023, react-leaflet từ 14/12/2024 |
| Bản đồ (mobile) | `@maplibre/maplibre-react-native` | 11.3.8 | **thay cho react-native-maps** — không phải vì nó chết (1.29.0 ra 28/06/2026, vẫn sống) mà vì **dùng chung style spec với web** |
| Style bản đồ | `packages/map-style` — 1 style JSON + 1 bộ GeoJSON/MVT layer | — | **thêm mới** — thay cho việc cấu hình marker/cluster/polygon hai lần bằng hai API khác nhau |
| Vector tile ranh giới | PostGIS `ST_AsMVT` phục vụ thẳng 6 khu vực | — | **thêm mới** — cùng một layer definition tiêu thụ ở cả web lẫn mobile |
| Xác thực — lõi | JWT RS256 + refresh xoay vòng + phát hiện tái sử dụng, **tự viết** | — | **giữ nguyên** — xem mục 4 và mục 7 để biết lý do và điều kiện đảo ngược |
| Xác thực — OIDC | `openid-client` | 6.8.7 | **thay cho** tự nối luồng Google/Apple/Facebook. Đây là chỗ code tự viết dễ thủng nhất (JWKS caching, nonce/state, xoay khoá) |
| Phân quyền | CASL trong `packages/policy` | `@casl/ability` 7.0.1 | **thêm mới** — ma trận role × host/co-host × trust T0–T5 viết một lần, chạy ở Nest guard + Next server component + màn hình Expo |
| Postgres RLS | Chỉ làm **lưới chắn cuối** trên 2–3 bảng nhạy cảm nhất | — | **quyết định có chủ đích** — không làm engine phân quyền chính; xem ADR-0003 |
| Quy tắc nghiệp vụ | `packages/domain` — TypeScript thuần, **0 phụ thuộc framework** | — | **thêm mới** — `decideRsvpOutcome()`, `computeTrustLevel()`, `nextTrustRequirement()`. Bản cơ sở không có nơi nào chứa thứ này |
| Lớp truy vấn client | `packages/query` — TanStack Query | 5.102.8 | **thêm mới** — query key convention, chính sách invalidate, optimistic update + rollback của RSVP, dùng chung web và mobile |
| Design token | `packages/tokens` — **chỉ object TS thuần, 0 dòng JSX** | — | **thay cho `packages/ui`** ("design token dùng chung + component web") — đóng cửa sau rò rỉ component |
| i18n | `packages/i18n` + union type `MessageKey` sinh từ `en.json`; `next-intl` ở web, `i18next` ở mobile | next-intl 4.14.1 | **giữ nguyên, bổ sung union type** — gõ sai khoá thì cả ba app đỏ lúc compile thay vì hiện `[missing]` trên production |
| Ngôn ngữ | TypeScript | 7.0.2 | **thay cho TypeScript 5.6+** — đã tự kiểm chứng `emitDecoratorMetadata` hoạt động đúng (mục 9) |
| Lint + format | `oxlint` + `oxlint-tsgolint` (type-aware) | 1.80.0 / 7.0.2001 | **thay cho ESLint + typescript-eslint + Prettier** — `typescript-eslint` 8.69.0 khai peer `typescript >=4.8.4 <6.1.0`, tức **không chạy được trên TS 7** |
| Test | Vitest + `unplugin-swc` + `@swc/core` | 4.1.11 / 1.5.11 / 1.16.1 | **thay cho Jest + ts-jest** — `ts-jest` khai peer `typescript >=4.3 <7`. SWC cần thiết vì esbuild không hỗ trợ `emitDecoratorMetadata` |
| Ràng buộc kiến trúc | `dependency-cruiser` (CI **đỏ**, không phải warning) | 18.2.0 | **thêm mới** — biến bản đồ module ở §3.2 của tài liệu 04 từ nguyện vọng thành trạng thái được kiểm mỗi lần push |
| Chất lượng kiểu | `type-coverage` ngưỡng ≥98%, chỉ tăng không giảm | 2.30.1 | **thêm mới** — vá đúng điểm yếu typing còn lại của TypeORM (`DeepPartial` trong `save()`) |
| Dọn code chết | `knip` | 6.34.0 | **thêm mới** |
| Ràng buộc entity ↔ hợp đồng | `satisfies` giữa kiểu entity TypeORM và `z.infer<typeof XxxResponse>` | — | **thêm mới (từ P1)** — đổi một cột là hợp đồng API vỡ build ngay tại chỗ sai |
| Truy vấn trang SEO | React Server Component gọi thẳng hàm repository dùng chung, bỏ qua HTTP | — | **thêm mới (từ P1)** — `getEventBySlug` viết một lần, dùng cho cả route API mobile lẫn server component |
| Đếm RSVP đồng thời | `SELECT … FOR NO KEY UPDATE` + unique partial index + trigger, gói trong **một** hàm `withRsvpLock()` | — | **giữ nguyên thiết kế, thêm quy ước và bài test** — xem mục 4 |
| Admin & kiểm duyệt | Directus, trỏ vào chính Postgres — **hoãn tới S6–S7, có điều kiện** | 12.3.1 | **thêm mới, có điều kiện** — với 3–5 người dùng nhân viên, bỏ 4–6 tuần tự dựng CRUD nội bộ là sai ưu tiên |
| Monorepo | pnpm workspace + Turborepo + TypeScript project references | pnpm 11.25.0 / turbo 2.10.12 | **giữ nguyên, bổ sung project references** |
| Push · Lưu trữ · CDN | Expo Push → APNs/FCM · S3-compatible + presigned URL · CDN có POP tại VN | — | **giữ nguyên hoàn toàn** |
| Đóng gói · CI/CD | Docker Compose v2 · GitHub Actions + EAS | — | **giữ nguyên hoàn toàn** |
| Theo dõi lỗi | Sentry | SDK 10.73.0 | **giữ nguyên, nâng từ SDK 9.x** |

### 3.2 Cấu trúc `packages/` sau khi ghép

Bản cơ sở có 6 package: `shared-types`, `api-client`, `i18n`, `config`, `ui`, `validation`. Bản chốt cũng có 9 nhưng **bản chất khác hẳn** — ba package cùng mô tả một hình dạng được gộp làm một, và bốn package mới chứa thứ trước đây không tồn tại ở đâu cả.

| Package | Chứa gì | Nguồn gốc |
|---|---|---|
| `@dnc/contracts` | Zod schema cho mọi thứ đi qua ranh giới mạng + enum miền | **gộp** `shared-types` + `validation` |
| `@dnc/domain` | Hàm thuần: `decideRsvpOutcome`, `computeTrustLevel`, `nextTrustRequirement`, `formatEventTime`. **0 phụ thuộc framework** | mới (P4) |
| `@dnc/policy` | CASL ability builder: ma trận role × ngữ cảnh × trust tier | mới (P2) |
| `@dnc/query` | TanStack Query options factory, query key, invalidate policy, optimistic RSVP + rollback | mới (P4) |
| `@dnc/api-client` | Sinh từ `openapi.json`, có hook TanStack Query | **giữ nguyên** từ bản cơ sở |
| `@dnc/map-style` | MapLibre style JSON, GeoJSON/MVT layer definition, cấu hình cluster | mới (P3) |
| `@dnc/i18n` | `en.json`, `vi.json` + union type `MessageKey` sinh tự động | giữ nguyên, bổ sung |
| `@dnc/config` | tsconfig, oxlint, dependency-cruiser preset | giữ nguyên |
| `@dnc/tokens` | Design token thuần TS. **Không một dòng JSX** | **thay cho** `@dnc/ui` |

**Luật ranh giới do `dependency-cruiser` ép, CI đỏ nếu vi phạm:**

| Luật | Nội dung |
|---|---|
| B1 | `@dnc/domain` **không được** import `react`, `react-native`, `@nestjs/*`, `typeorm`, `@dnc/api-client` |
| B2 | `@dnc/policy` **không được** import `react`, `react-native`, `@nestjs/*`, `typeorm` |
| B3 | `@dnc/contracts` **chỉ** chứa hình dạng đi qua ranh giới mạng. Kiểu nội bộ của `apps/api` ở lại `apps/api` |
| B4 | `@dnc/tokens` **không được** export bất kỳ file `.tsx` nào |
| B5 | `packages/*` **không được** import ngược từ `apps/*` |
| B6 | Module backend chỉ lộ ra qua `index.ts`; cấm import xuyên vào ruột module khác (`modules/event/entities/...` từ `modules/rsvp`) |
| B7 | Không phụ thuộc vòng, không file mồ côi |

**Ranh giới sống còn, viết vào README ngay ngày đầu:** `@dnc/domain` quyết định **NÊN LÀM GÌ**, nó **TUYỆT ĐỐI KHÔNG cầm transaction**. Khoá `SELECT … FOR NO KEY UPDATE` và trigger `RAISE EXCEPTION 'occurrence_full'` nằm nguyên trong repository của `apps/api`. Domain đọc số ghế đã khoá rồi trả quyết định; **database vẫn là chốt chặn cuối**. Ràng buộc cứng số 5 không bị đụng tới một milimet.

### 3.3 Những gì bị TỪ CHỐI, và lý do ngắn gọn

| Bị từ chối | Lý do đã kiểm chứng |
|---|---|
| **Drizzle ORM** | Bản ổn định `0.45.2` publish 27/03/2026, đóng băng hơn 5 tháng; tag `rc` đứng ở `1.0.0-rc.4` từ 27/06/2026, không có ngày GA. Đặt tầng dữ liệu của greenfield lên nhánh chắc chắn phải di trú là đánh cược không cần thiết. Quan trọng hơn: **đổi ORM không tái sử dụng thêm một dòng nào ở web hay mobile**, vì client không bao giờ chạm ORM |
| **`drizzle-zod`** | `0.8.3` publish 06/08/2025 — đứng yên 13 tháng |
| **Hono + RPC (`hc<AppType>`)** | Bỏ NestJS là mất DI/module/guard — đúng thứ tan rã đầu tiên khi người viết ra quy ước rời đi. Thêm nữa `hc<AppType>` ghép kiểu client vào kiểu TypeScript của server, mà binary iOS/Android đã lên store **không rút về được** |
| **tRPC** | Rất khoẻ (11.18.0), không có vấn đề kỹ thuật với React Native hay RSC. Loại vì cùng lý do binary-trên-store, và vì dự án cần REST công khai cho trang sự kiện cache được ở CDN |
| **ts-rest** | `@ts-rest/core` mới nhất `3.52.1` — đúng trường hợp "đang hấp hối" mà đề bài cấm đề xuất |
| **`nestjs-zod`** | `5.5.0` khai peer `@nestjs/common ^10 \|\| ^11` và `@nestjs/swagger ^7.4.2 \|\| ^8 \|\| ^11` — **chưa hỗ trợ Nest 12**. Và nay là lớp trung gian thừa vì Nest 12 có API chính chủ |
| **Better Auth (Giai đoạn 1)** | Hai rào chắn cứng đã kiểm chứng: (a) tarball `better-auth@1.7.2` chỉ có adapter `drizzle`, `kysely`, `mongodb`, `prisma` — **không có TypeORM**, nên phải chấp nhận hai hệ migration trong một database; (b) `@thallesp/nestjs-better-auth@2.7.0` khai peer `@nestjs/core ^11.1.6` **và** `typescript ^5.9.2 \|\| ^6.0.0` — chặn cả Nest 12 lẫn TS 7. Điều kiện đảo ngược ở mục 7 |
| **MikroORM** | Sức khoẻ dự án tốt hơn TypeORM về nhiều mặt và tôi không giả vờ ngược lại. Loại vì Unit of Work + Identity Map là mô hình tư duy khác hẳn (2–4 tuần ramp-up), và vì với PostGIS phải tự viết custom `Type` |
| **Centrifugo** | Một tiến trình Go mà chính phương án đề xuất nó cũng thừa nhận "2 giờ sáng thì không ai đọc được source". Sai hình dạng cho đội 2 người |
| **Supabase / Firebase / mọi BaaS** | Xem ADR-0002 |
| **Novu, Trigger.dev, UploadThing** | Xem ADR-0004 (bộ lọc ngân sách) |
| **`@socket.io/redis-adapter` ngay từ đầu** | Không loại, chỉ **hoãn** — xem bảng chốt |

---

## 4. Những gì KHÔNG đổi, và vì sao

Phần này quan trọng ngang phần đổi. Đội đã thạo NestJS/TypeORM/Next/Expo và đã từng xây, từng vận hành sản phẩm thật bằng bộ công cụ này. **Mỗi lần đổi là một lần trả chi phí học bằng thời gian ra mắt**, và trong bài toán 26 tuần tới M6 thì đó là loại tiền không mua lại được.

| Giữ nguyên | Vì sao — nói thẳng |
|---|---|
| **NestJS** | Cấu trúc do framework áp đặt là tài sản lớn nhất của đội, không phải gánh nặng. DI + module + guard/interceptor là thứ giữ ranh giới khi có người mới vào ở tháng thứ 18. Đổi sang Hono/Fastify mua tốc độ mà dự án 5.000 user không cần, và mất cấu trúc mà dự án ba giai đoạn rất cần |
| **TypeORM** | "TypeORM đang hấp hối" là **SAI** vào tháng 9/2026 — `1.1.0` publish 13/07/2026 và tag `dev` có bản nightly ra đúng hôm nay 01/09/2026. Lý do chính đáng duy nhất để rời TypeORM là chất lượng suy luận kiểu, không phải tình trạng bảo trì; và chất lượng suy luận kiểu vá được bằng `type-coverage` + `satisfies` với chi phí một ngày thay vì một tháng |
| **PostgreSQL + PostGIS** | Ràng buộc cứng số 2. `ST_DWithin` cho bán kính, `ST_Contains` cho 6 khu vực Đà Nẵng, `pg_trgm` + `unaccent` cho tìm "Mỹ Khê" bằng "my khe". Không có phương án thay thế nào đáng bàn khi tự host tại Việt Nam |
| **Next.js App Router + RSC** | Ràng buộc cứng số 3 đã được giải quyết, không có lý do gì đổi. `next start` trong Docker là self-host được, không cần Vercel |
| **Expo + React Native + EAS** | Ràng buộc cứng số 4 đã được giải quyết. EAS Build là dịch vụ nước ngoài nhưng chỉ chạy **lúc build**, không có dữ liệu người dùng đi qua — không vi phạm ràng buộc 1 |
| **Redis + BullMQ** | Dùng lại Redis vốn đã cần cho cache và rate limit, 0 USD hạ tầng thêm. BullMQ ra `6.3.4` đúng hôm nay, cực kỳ sống |
| **Socket.IO** | Lõi vẫn được vá (`engine.io` 6.6.9 ra 16/06/2026). Ở quy mô dự án, một tiến trình gateway là đủ. Không đổi sang Centrifugo |
| **`packages/api-client` sinh từ OpenAPI** | Đây là chỗ tôi đứng về phía bản cơ sở và chống lại cả P1 lẫn P4. **Binary iOS/Android đã lên store thì không rút về được** — người dùng có thể xài bản app 6 tháng tuổi trong khi server đã đổi. Hợp đồng API vì thế cần versioning HTTP thật và một artifact OpenAPI **có phiên bản** làm hợp đồng. Cái thay đổi chỉ là **NGUỒN** của OpenAPI (Zod thay decorator), tức xoá được mối nối tay mà vẫn giữ artifact có phiên bản |
| **Cơ chế chống race của RSVP** | `SELECT … FOR NO KEY UPDATE` khoá đúng một hàng occurrence + unique partial index trên `(event_id, user_id)` + trigger kiểm `seats_taken > capacity`. Thiết kế này **ĐÚNG** và không lựa chọn stack nào mua được gì ở đây. Thứ mua được là **QUY ƯỚC**: mọi thao tác ghi chạm sức chứa đi qua đúng **một** hàm `withRsvpLock()`, một chỗ, một lần review, **và một bài test tích hợp bắn 50 request đồng thời chạy trong CI**. Nếu chủ dự án chỉ đọc một dòng trong toàn bộ báo cáo này thì nên là dòng đó |
| **Xác thực lõi tự viết** | Tôi thừa nhận đây là nhược điểm thật của khuyến nghị này, không giấu. Nhưng phương án thay thế duy nhất đáng cân nhắc (Better Auth) hôm nay **không cài được** cùng Nest 12 + TS 7, và không có adapter TypeORM. Phần nguy hiểm nhất — OIDC client — đã được giao cho `openid-client`. Điều kiện đảo ngược ở mục 7 |
| **Hosting tại Việt Nam, monolith module hoá, Docker Compose** | Ràng buộc cứng số 1 và số 6. Kubernetes ở quy mô 5.000 user là chi phí thuần |
| **Ảnh không đi qua API, presigned URL, strip EXIF GPS** | Nguyên tắc 4 của tài liệu gốc. Strip EXIF là yêu cầu **an toàn người dùng**, không phải tối ưu |
| **i18n runtime tách riêng** (`next-intl` ở web, `i18next` ở mobile) | Cố tình **không** chia sẻ. Thứ đáng chia sẻ là **dữ liệu** (file JSON) và **kiểu** (union type khoá), không phải runtime. Ép chung sẽ phải viết lớp adapter cho cả hai — thêm trừu tượng để giảm trừu tượng |
| **Không chia sẻ component web ↔ mobile** | Viết thành luật ngày đầu. Web là trang SEO server-render có JSON-LD `schema.org/Event` cho người lạ từ Google; mobile là app có tab bar, safe area, quyền push, bản đồ native. Ép chung một component chỉ đẻ ra `Platform.select` lồng nhau. **Chia sẻ LOGIC và TOKEN, không chia sẻ MARKUP** |

**Một câu hỏi phải hỏi đội trước khi chốt.** Khuyến nghị này giả định rằng phần lớn nỗi đau "khó bảo trì" đến từ **quy ước code** chứ không phải framework. Hãy hỏi thẳng hai lập trình viên: *"lần trước cụ thể là chỗ nào đau, và có phải do NestJS/TypeORM không?"*. Nếu câu trả lời là đã đâm vào một giới hạn **kỹ thuật** thật của TypeORM không có đường vòng, thì tiền đề này sai và phải tính lại. Nếu câu trả lời là "thiếu kỷ luật, ranh giới module trôi dần" — nguyên nhân phổ biến hơn nhiều — thì khuyến nghị này đúng và bộ công cụ ép ranh giới chính là thuốc.

---

## 5. Lợi ích cụ thể — bảng đối chiếu trước / sau

### 5.1 Mỗi dòng một việc cụ thể

| Việc | TRƯỚC (bản cơ sở) | SAU (bản chốt) | Số nơi đồng bộ tay |
|---|---|---|---|
| Luật validate của một trường (vd "tiêu đề 3–120 ký tự") | `@Length(3,120)` trên DTO class ở api **+** `@ApiProperty` mô tả **+** `z.string().min(3).max(120)` ở `packages/validation` cho form client | **1** `z.object()` trong `@dnc/contracts` chạy cả 4 vai | **3 → 1** |
| Kiểu dữ liệu response của một endpoint | Response DTO khai báo tay + mapper + `@ApiProperty` từng trường | 1 Zod response schema; kiểu suy ra bằng `z.infer`; ép khớp entity bằng `satisfies` | **3 → 1 (tsc kiểm)** |
| Tài liệu OpenAPI | Decorator `@ApiProperty` gõ tay — quên một trường thì nó **biến mất khỏi OpenAPI trong im lặng** | Sinh tự động từ chính schema đã validate; không thể lệch vì chỉ có một định nghĩa | **1 → 0** |
| Luật RSVP: hiện nút "RSVP" hay "Join waitlist" hay "cần T2" | `RsvpService` ở api **+** web đoán lại **+** mobile đoán lại | `decideRsvpOutcome()` trong `@dnc/domain`, cả ba gọi chung | **3 → 1** |
| Thang tin cậy T0–T5 và "còn thiếu gì để lên bậc" | api tính **+** web diễn giải lại **+** mobile diễn giải lại | `computeTrustLevel()` + `nextTrustRequirement()` trong `@dnc/domain` | **3 → 1** |
| Ma trận phân quyền 5 role × host/co-host × T0–T5 | Nest guard chặn **+** web ẩn nút **+** mobile ẩn nút, ba bản trôi dạt khỏi nhau | `@dnc/policy` (CASL), unit-test được như hàm thường | **3 → 1** |
| Marker, cluster, polygon 6 khu vực, vòng tròn bán kính, fit-bounds | Leaflet API (web) **+** react-native-maps API (mobile) — hai API không liên quan gì nhau, sửa bug hai lần vĩnh viễn | `@dnc/map-style`: 1 style JSON + 1 bộ GeoJSON/MVT layer, MapLibre tiêu thụ ở cả hai đầu | **2 → 1** |
| Optimistic update + rollback của RSVP | Viết ở web, viết lại ở mobile với hai kiểu rollback khác nhau | `@dnc/query` | **2 → 1** |
| Truy vấn `getEventBySlug` cho trang SEO | RSC gọi HTTP tới API, tự khai lại kiểu | RSC gọi thẳng hàm repository dùng chung, nguyên kiểu, không qua HTTP | **2 → 1** |
| Khoá i18n | Chuỗi tự do; gõ sai thì hiện `[missing]` trên production | Union type `MessageKey` sinh từ `en.json`; gõ sai thì cả ba app **đỏ lúc compile** | **runtime → compile-time** |
| Payload job BullMQ | Interface gõ tay, vùng không kiểu tách biệt | Zod schema từ `@dnc/contracts`, parse ở đầu worker | **vùng không kiểu → có kiểu** |
| Sự kiện Socket.IO | `any` | `Server<ClientToServerEvents, ServerToClientEvents>` suy từ Zod | **vùng không kiểu → có kiểu** |
| Đổi tên / xoá một cột database | Migration chạy, entity đổi, nhưng DTO/OpenAPI/client **không biết** — lỗi chỉ lộ ra lúc chạy | `satisfies` giữa entity và `z.infer<Response>` báo lỗi ngay; `turbo typecheck` đỏ ở cả api, web, mobile trong một lần chạy | **0 điểm kiểm → tsc kiểm** |
| Ranh giới module (`event` không được thò vào ruột `rsvp`) | Vẽ đẹp trong tài liệu §3.2, **không có gì kiểm tra** | `dependency-cruiser` chạy trong CI, vi phạm là **build đỏ** | **lời hứa → luật máy** |
| OIDC Google / Apple / Facebook | Tự viết 3 luồng: JWKS caching, nonce/state, xoay khoá, ký `client_secret` ES256 cho Apple | `openid-client` 6.8.7 | **~500 dòng bảo mật → ~80 dòng cấu hình** |
| Sinh UUID khoá chính | Thư viện `uuid` ở tầng app, UUIDv4 (index locality kém) | `uuidv7()` native của PostgreSQL 18 — có thứ tự theo thời gian | **1 dependency → 0** |
| Chạy typecheck toàn monorepo | TypeScript 5.x | TypeScript 7 (bản viết lại bằng Go) | vòng lặp sửa–kiểm nhanh hơn một bậc độ lớn |

### 5.2 Ước lượng số dòng code tiết kiệm

Tính trên phạm vi MVP Giai đoạn 1: **~52 endpoint** (đếm từ danh mục §6.8 của tài liệu 04), 15 module backend, ba app.

| Hạng mục | Ước lượng | Cách tính |
|---|---|---|
| Xoá tầng DTO `class-validator` + `@ApiProperty` + response DTO | **~1.100 – 1.400 dòng** | ~52 endpoint × ~20–27 dòng tiết kiệm. Schema Zod ở bản cơ sở **cũng đã phải viết** ở `packages/validation` cho form client, nên đây là dòng biến mất thật, không phải chuyển chỗ |
| Gộp bản đồ hai đầu thành `@dnc/map-style` | **~350 – 450 dòng** | ~400–600 dòng glue viết hai lần → một `map-style` ~150–250 dòng + hai wrapper mỏng ~80 dòng |
| `openid-client` thay OIDC tự viết | **~400 – 600 dòng** | Ba luồng provider, JWKS cache, nonce/state, xoay khoá |
| `@dnc/domain` — luật RSVP + thang T0–T5 viết một lần thay ba | **~200 – 250 dòng** | Thang 6 bậc điều kiện lồng nhau ~120 dòng × 2 bản dư + luật RSVP ~80 dòng × 1 bản dư |
| `@dnc/policy` — ma trận phân quyền viết một lần thay ba | **~250 – 400 dòng** | Ma trận role × ngữ cảnh × trust tier, hai bản dư ở web và mobile |
| `@dnc/query` — optimistic RSVP + rollback viết một lần thay hai | **~300 – 350 dòng** | Đoạn logic dài và dễ sai nhất ở tầng client |
| `uuidv7()` native PG18 | **~20 – 30 dòng** + 1 dependency | |
| **Cộng dồn** | **~2.620 – 3.480 dòng viết tay không phải viết** | |
| *Trừ đi phía chi phí* | **~150 – 200 dòng** | Luật `dependency-cruiser` + cấu hình `knip` + cổng `type-coverage` + script CI lọc diff PostGIS (~40 dòng) + guard rate-limit trên Redis (~80 dòng, thay `@nestjs/throttler`) |
| **RÒNG** | **≈ 2.400 – 3.300 dòng** | |

### 5.3 Con số quan trọng hơn số dòng

Số dòng là chỉ báo **yếu** cho chi phí bảo trì. Ba con số dưới đây mới là thứ quyết định 18–24 tháng tới:

| Chỉ số | Trước | Sau |
|---|---|---|
| **Số nhóm phải đồng bộ tay** | 8 (DTO↔OpenAPI, DTO↔Zod client, luật RSVP ×3, thang trust ×3, phân quyền ×3, bản đồ ×2, optimistic RSVP ×2, entity↔hợp đồng) | **1** (entity ↔ Zod response, và nó do `tsc` kiểm qua `satisfies`) |
| **Ranh giới kiến trúc được kiểm bằng máy** | 0 | **7 luật** chạy CI đỏ mỗi lần push |
| **Vùng không kiểu còn lại** | 3 (BullMQ payload, Socket.IO event, form client) | **0** |
| **Số dependency bỏ được** | — | `class-validator`, `class-transformer`, `nestjs-zod` (không bao giờ thêm), `leaflet`, `react-leaflet`, `leaflet.markercluster`, `react-native-maps`, `@nestjs/throttler`, thư viện sinh UUID, `eslint` + `typescript-eslint` + `prettier`, `jest` + `ts-jest` |
| **Số lớp trừu tượng biến mất** | — | 3: cầu nối `nestjs-zod` (không cần), đường ống `class-validator`/`class-transformer`, hai lớp adapter bản đồ riêng biệt |

**Cảnh báo trung thực về chính những con số này:** mọi ước lượng ở mục 5.2 suy ra từ phạm vi mô tả trong `docs/analysis`, **không phải đo trên mã thật**, vì repo chưa có dòng nào. Sai số ±30% là hợp lý. Con số ở mục 5.3 thì chắc chắn hơn vì nó đếm cấu trúc, không đếm ký tự.

---

## 6. Chi phí chuyển đổi và ảnh hưởng tới lịch M0–M6

### 6.1 Chi phí học, bóc tách theo hạng mục

Tính cho một lập trình viên đã thạo NestJS/TypeORM/Next/Expo, đo bằng thời gian tới khi năng suất trở lại mức cũ.

| Hạng mục | Chi phí | Ghi chú |
|---|---|---|
| **MapLibre** | **2–3 ngày** | **Đây là chi phí học THẬT duy nhất.** Style JSON + GeoJSON source/layer là mô hình tư duy khác hẳn API marker mệnh lệnh của Leaflet |
| CASL (`@dnc/policy`) | 2–3 ngày | API nhỏ; phần khó là **thiết kế ma trận**, không phải thư viện |
| TanStack Query dùng chung (`@dnc/query`) | 2 ngày | Đội gần như chắc chắn đã biết TanStack Query. Cái mới là pattern `queryOptions` factory + optimistic RSVP có rollback — dành riêng 1 ngày cho đoạn RSVP |
| NestJS 11 → 12 + Standard Schema | 2–3 ngày | Không phải học framework mới, là học một API mới trong framework đã biết. ESM là **tuỳ chọn** — ở lại CommonJS được |
| Zod contract-first (thói quen, không phải cú pháp) | 2–3 ngày | Đội đã dùng Zod cho `env.schema.ts`. Cái mới là phản xạ "quy tắc này thuộc `contracts`, `domain` hay `service`?" |
| TypeORM 0.3 → 1.1 | 0,5–1 ngày | Trên greenfield gần như bằng 0; chỉ đọc migration guide để không mang thói quen cũ vào |
| Next 15 → 16 | 1–2 ngày | Cache Components / PPR, `middleware` → `proxy.ts`. Không phải migrate, chỉ đọc |
| Expo 54 → 57 | ~0 | Chỉ là chọn số khác lúc `create-expo-app` |
| `dependency-cruiser` + `knip` + `type-coverage` | 1 ngày | Viết một lần, dùng mãi |
| `oxlint` + Vitest thay ESLint + Jest | 1 ngày | Kèm cấu hình `unplugin-swc` cho decorator metadata |
| TypeScript 7 | 2 giờ | Corsa port từng file giữ nguyên thuật toán nên ngữ nghĩa type không đổi |
| **TỔNG** | **~14–19 ngày-người** ≈ **3–4 tuần-người** | Chia cho 2 lập trình viên ≈ **7–10 ngày lịch**, dàn qua S0 → S3 |

**Đối chiếu để thấy rõ độ chênh.** Chỉ riêng đổi sang MikroORM đã tốn 2–4 tuần mới lấy lại năng suất cũ; đổi sang Drizzle + Hono thì phải học lại toàn bộ cách nghĩ về truy vấn **cộng** tự thiết kế thay thế cho DI dưới deadline — ước tính 2–3 tháng. Khuyến nghị này tốn khoảng **1/4 đến 1/3** chi phí đó, mà vẫn lấy được phần lớn lợi ích về tái sử dụng, **bởi vì phần lợi ích đó không đến từ ORM**.

### 6.2 Ảnh hưởng tới lịch — nói thẳng

Sprint 0 chạy 07/09 → 18/09/2026 (12 ngày). Gate M0 là: staging chạy được, CI xanh, `GET /health` trả 200 từ tên miền staging, dev build cài được trên máy thật iOS + Android.

| Việc thêm so với bản cơ sở, nằm trong S0 | Chi phí |
|---|---|
| Spike NestJS 12 (chứng minh chuỗi Zod → validate → OpenAPI → api-client → dùng ở web + mobile) | ~1,5 ngày |
| `oxlint` + Vitest + `unplugin-swc` thay ESLint + Jest | ~1 ngày |
| Luật `dependency-cruiser` + `knip` + cổng `type-coverage` | ~1 ngày |
| Script CI lọc diff PostGIS + viết migration không gian bằng tay | ~0,5 ngày |
| **Cộng** | **~4 ngày-người ≈ 2 ngày lịch với 2 dev** |

**Kết luận về lịch, không tô hồng:**

- **M0 (18/09) — RỦI RO TRƯỢT 0–2 NGÀY.** S0 vốn đã là sprint ramp-up với velocity thấp nhất (40 SP theo giả định A2 của tài liệu 08). Thêm ~2 ngày lịch vào một sprint 12 ngày là căng. **Hai cách xử lý, chọn một trước ngày 07/09:** (a) chấp nhận M0 trượt sang 21–22/09 và ép lại ở S1 — ảnh hưởng bằng 0 vì M1 cách M0 tới 14 ngày; hoặc (b) giữ nguyên ngày M0 và đẩy `knip` + cổng `type-coverage` sang S1 (chúng không phải gate của M0).
- **M1 (02/10) — KHÔNG ẢNH HƯỞNG.** CASL và `openid-client` nằm ở S1, nhưng cả hai **thay thế** việc phải làm chứ không cộng thêm: `openid-client` rẻ hơn tự viết OIDC, CASL rẻ hơn viết ma trận guard ba lần. Guard rate-limit tự viết thay `@nestjs/throttler` là ~80 dòng, và §6.5 của tài liệu 04 vốn đã đặc tả guard tuỳ biến.
- **M2 (30/10) — KHÔNG ẢNH HƯỞNG, có đệm.** MapLibre (2–3 ngày học) nằm ở S2–S3, đúng nơi tính năng bản đồ vốn đã nằm. S2–S3 là 4 tuần, đủ đệm.
- **M3 (13/11) — KHÔNG ẢNH HƯỞNG.** `withRsvpLock()` + test 50 request đồng thời và `@dnc/query` nằm ở S4, và cơ chế khoá không đổi so với bản cơ sở.
- **M4 → M6 — KHÔNG ẢNH HƯỞNG.** Directus (nếu làm) nằm ở S6–S7 và là tuỳ chọn.

**Tóm lại: mất tối đa 2 ngày ở M0, không mất ngày nào từ M1 trở đi.** Lý do con số nhỏ như vậy là vì khuyến nghị này **không lấy đi thứ gì đội đang thạo** — nó chỉ nâng phiên bản và đổi hai mảnh ngoại vi. Nếu khuyến nghị là Drizzle + Hono, con số sẽ là 6–8 tuần và M6 gần như chắc chắn trượt.

---

## 7. Rủi ro của khuyến nghị này và điều kiện quay đầu

| # | Rủi ro | Mức | Giảm thiểu | **Điều kiện quay đầu** |
|---|---|---|---|---|
| R1 | **NestJS 12 mới 5 ngày tuổi** (`12.0.1` publish 27/08/2026). Toàn bộ tầng hợp đồng treo trên `StandardSchemaValidationPipe` — API mới, chưa có Stack Overflow, chưa có blog gỡ rối | **Cao** | Greenfield nên không có mã cũ để vỡ. Toàn họ `@nestjs/*` lên 12.x đồng loạt trong 2 ngày → đợt phát hành có phối hợp. ESM là tuỳ chọn, ở lại CommonJS | **Nếu spike W01 (kết thúc 11/09) không chạy được chuỗi Zod → OpenAPI → api-client:** lùi về **NestJS 11 + `@nestjs/swagger` 11 + `nestjs-zod` 5.5.0**. Chi phí ~1 ngày. Đã kiểm chứng đường lùi này an toàn: `@nestjs/typeorm@12.0.1` khai peer `@nestjs/core ^10 \|\| ^11 \|\| ^12`, và `@nestjs/throttler` 6.5.0 chạy được với `^11`. Bản lùi vẫn giữ ~80% lợi ích chia sẻ schema Zod |
| R2 | `@nestjs/throttler` 6.5.0 **không hỗ trợ Nest 12** (đã kiểm chứng: peer tối đa `^11`). Rate limit là bắt buộc cho OTP và RSVP | Trung bình | Viết guard trên Redis (~80 dòng, sliding window + Lua). Bản cơ sở §6.5 vốn đã đặc tả guard tuỳ biến nên gần như không phải việc mới | Không cần quay đầu. Nếu `@nestjs/throttler` ra bản hỗ trợ `^12` trong 6 tháng thì cân nhắc đổi lại, nhưng guard tự viết ~80 dòng cũng không phải nợ đáng lo |
| R3 | **TypeORM `migration:generate` sinh diff giả `ALTER COLUMN … TYPE geometry`** cho cột PostGIS ở mọi lần chạy (issue #10870). Sau 3 tháng sẽ không ai tin `migration:generate` nữa, và đó là lúc schema bắt đầu trôi | Trung bình | **Bắt buộc, không phải tuỳ chọn:** toàn bộ DDL không gian viết migration tay + script CI ~40 dòng kiểm rằng output của `migration:generate` là rỗng sau khi lọc bỏ các `ALTER … geometry`. Chi phí: viết một lần | Không quay đầu — chi phí giảm thiểu là 0,5 ngày và mọi hướng ORM khác cũng có ma sát riêng ở tầng sinh migration không gian (Drizzle: SRID bị bỏ qua, không sinh được migration cho kiểu khác `point`) |
| R4 | **Hệ sinh thái TypeScript 7 chưa đầy đủ.** `typescript-eslint@8.69.0` khai peer `typescript >=4.8.4 <6.1.0`; `ts-jest@29.4.12` khai `>=4.3 <7` | Trung bình | Thay thế **đã kiểm chứng có sẵn**: `oxlint@1.80.0` + `oxlint-tsgolint@7.0.2001` cho lint type-aware; Vitest 4.1.11 + `unplugin-swc` + `@swc/core` cho test (SWC cần thiết vì esbuild không hỗ trợ `emitDecoratorMetadata`) | **Nếu tới hết W02 mà `oxlint-tsgolint` không cover được `no-floating-promises` và `no-misused-promises`:** ghim **TypeScript 6.0.3** (bản stable, ra 16/04/2026) cho toàn monorepo — nó nằm trong peer range của cả `typescript-eslint` lẫn `ts-jest`, nên quay về ESLint + Jest được nguyên vẹn. Mất tốc độ typecheck, giữ được mọi thứ khác |
| R5 | **Chín package cho hai lập trình viên là rủi ro over-abstraction thật.** `@dnc/domain` sẽ thành bãi rác nếu không ai gác cổng, và khi đó kết quả **TỆ HƠN** bản cơ sở vì có thêm lớp indirection | **Cao — đây là rủi ro CON NGƯỜI, nguy hiểm nhất về dài hạn** | Ba lớp phòng thủ: (a) `dependency-cruiser` ép luật B1–B7 thành **CI đỏ**, không phải warning; (b) mỗi package có README một trang nói nó chứa gì và **không** chứa gì, viết ở S0; (c) đưa package vào **theo sprint**, không đưa hết ngày một (xem mục 8) | **Nếu sau S3 mà `@dnc/domain` đã có import bị cấm bị merge nhầm hai lần trở lên:** dừng thêm package mới, gộp `policy` vào `domain`, và cân nhắc bỏ `query` (viết trong app). Đây là quyết định rà lại ở ranh giới M2 |
| R6 | **MapLibre là khoản đầu tư có điều kiện.** Nếu sản phẩm hoá ra "nhẹ bản đồ" — danh sách + tìm kiếm là chính, bản đồ chỉ là màn hình phụ — thì 2–3 ngày học không hoàn vốn | Thấp–Trung bình | Kiểm chứng giả định bằng mockup **TRƯỚC** khi bỏ 3 ngày học (tài liệu 10 đã có luồng màn hình) | **Nếu mockup ở cuối S1 cho thấy bản đồ là màn hình phụ:** dùng **MapLibre GL JS chỉ ở web** (Leaflet đã 3 năm không phát hành, phải thay dù thế nào) và **giữ `react-native-maps` 1.29.0 ở mobile** (vẫn sống, ra 28/06/2026). Mất lợi ích style dùng chung, nhưng chi phí học mobile về 0 |
| R7 | **Vẫn tự viết và tự bảo trì lớp JWT + refresh rotation + phát hiện tái sử dụng + quản lý thiết bị.** Đây là loại code mà bug không hiện ra như lỗi — nó hiện ra như sự cố bảo mật 6 tháng sau | **Cao, và tôi không giấu** | Phần nguy hiểm nhất (OIDC client) đã giao cho `openid-client`. Phần còn lại đặt sau ranh giới module `auth` do `dependency-cruiser` ép, nên đổi sau là thay đổi **có kiểm soát** | **Xem lại ở ranh giới Giai đoạn 2** khi hội đủ **cả ba**: (a) có adapter Better Auth chính thức cho Nest 12; (b) có adapter TypeORM, **hoặc** đội chấp nhận đưa Kysely vào chỉ để quản riêng nhóm bảng auth trong một schema Postgres riêng; (c) `@thallesp/nestjs-better-auth` (hoặc gói kế nhiệm) khai báo hỗ trợ TypeScript 7. Nếu Giai đoạn 3 (y tế) mang theo yêu cầu audit trail được chứng nhận, một IdP thương mại có chứng chỉ sẽ thắng cả hai — cần lên kế hoạch di trú từ trước chứ không chữa cháy |
| R8 | **Nâng đồng loạt 7 major** (Node 22→24, Nest 11→12, TypeORM 0.3→1.1, PG 16→18, Next 15→16, Expo 54→57, TS 5→7) | Thấp **vì greenfield** | Với repo đã có code thì đây là rủi ro nghiêm trọng. Với repo trống thì chi phí bằng 0 — và đó chính là lý do phải làm **NGAY BÂY GIỜ** chứ không phải sau 6 tháng | Nếu bất kỳ major nào lộ vấn đề trong 2 tuần đầu, lùi từng cái một là thao tác gần như miễn phí vì chưa có mã phụ thuộc |
| R9 | **Directus (nếu làm ở S6–S7) có thể đi vòng qua bất biến của domain** — ví dụ sửa tay `capacity` của event đang có waitlist. Cộng rủi ro giấy phép MSCL-1.0 (Monospace đã đổi giấy phép hai lần) | Trung bình, **có điều kiện** | **Hai guardrail bắt buộc, viết vào tài liệu ngày đầu tiên dùng:** (a) cấp cho Directus một DB role **đọc nhiều – ghi ít** (read mọi bảng, write chỉ trên cột kiểm duyệt); (b) mọi hành động đổi trạng thái nghiệp vụ (ban, đổi trust tier, huỷ event) đi qua Directus Flows **GỌI API của mình**, không ghi bảng trực tiếp | **Nếu Directus bắt đầu được dùng để ghi trạng thái nghiệp vụ:** nó đã thành đường ghi thứ hai không kiểm soát — bỏ nó và tự build admin panel. **Nếu tổ chức vượt 5 triệu USD doanh thu hoặc 50 nhân sự:** cần giấy phép thương mại, tính lại. Sản phẩm không suy suyển khi bỏ Directus — mất công cụ nội bộ chứ không mất tính năng người dùng |

### 7.1 Ba lằn ranh không được vượt qua

1. **`@dnc/domain` không cầm transaction.** Nếu có PR nào đưa `DataSource`, repository, hay `queryRunner` vào `packages/domain`, PR đó bị từ chối. Khoá và trigger ở lại `apps/api`.
2. **Không thêm kho dữ liệu thứ hai.** Xem ADR-0004.
3. **`packages/tokens` không export JSX.** Nếu cần một component dùng chung, câu trả lời là "không" — viết hai lần ở hai app.

---

## 8. Kế hoạch áp dụng — repo greenfield, dựng khung theo stack mới

### 8.1 Tuần 1 (07/09 – 11/09, Sprint 0)

| Ngày | Việc | Ai | Gate |
|---|---|---|---|
| T2 | Khung monorepo: `pnpm@11` workspace + `turbo@2.10` + TypeScript project references + `.npmrc` với `node-linker=hoisted` (bắt buộc cho Metro). Dựng `@dnc/config` | Dev A | `pnpm install` chạy sạch |
| T2–T4 | **SPIKE NESTJS 12 — việc quan trọng nhất của tuần.** Dựng đúng **một** endpoint thật (`POST /events` rút gọn) chứng minh trọn chuỗi: `z.object()` trong `@dnc/contracts` → `@Body({ schema })` + `StandardSchemaValidationPipe` → `@nestjs/swagger` 12 sinh `openapi.json` có đủ trường → sinh `@dnc/api-client` → gọi có kiểu từ một trang Next **và** một màn hình Expo | Dev A | **GO / NO-GO ngày 11/09.** NO-GO → lùi Nest 11 + `nestjs-zod` (R1) |
| T2–T3 | `docker-compose.local.yml`: `postgres:18` + PostGIS 3.6.4, Redis 7.4, MinIO, Mailpit. Viết **bằng tay** migration không gian đầu tiên: bảng `areas` (polygon 6 khu vực + `ST_Contains`) và `events` (`geography(Point,4326)` + `ST_DWithin`), kèm chỉ mục GiST | Dev B | `CREATE EXTENSION postgis` chạy; một truy vấn `ST_DWithin` trả đúng kết quả trên dữ liệu seed |
| T3–T4 | `@dnc/contracts` khung: schema `Event`, `Rsvp`, `CursorPage`. Dựng ràng buộc `satisfies` giữa entity TypeORM đầu tiên và `z.infer<typeof EventResponse>` | Dev B | Đổi tên một cột → `turbo typecheck` đỏ đúng chỗ |
| T4–T5 | Bộ công cụ: `oxlint` + `oxlint-tsgolint`, Vitest + `unplugin-swc` + `@swc/core`, `dependency-cruiser` luật B1–B7 phiên bản đầu | Dev A | `turbo lint` và `turbo test` xanh; cố tình vi phạm B1 → CI đỏ |
| T5 | **Kiểm chứng bắt buộc:** `oxlint-tsgolint` có cover `no-floating-promises` và `no-misused-promises` không? | Dev A | Nếu KHÔNG → kích hoạt đường lùi TS 6.0.3 (R4) ngay, đừng để tới S2 |

### 8.2 Tuần 2 (14/09 – 18/09, Sprint 0) — chốt M0

| Việc | Gate M0 |
|---|---|
| CI GitHub Actions: `lint` → `typecheck` → `test` → `build` → **`migration-drift`** (có script lọc `ALTER … geometry`) → `docker build` → push registry | CI xanh |
| Deploy staging bằng Docker Compose, nginx TLS | `GET /health` trả 200 từ tên miền staging |
| Khung Next 16 App Router + Tailwind 4 + `@dnc/tokens` | Trang chủ render SSR |
| Khung Expo 57 + Expo Router 57, EAS dev build | Cài được trên iPhone thật **và** Android thật |
| `@dnc/domain` khung + hàm thuần đầu tiên (`decideRsvpOutcome` stub) + unit test | Test chạy dưới 1 giây, **không cần Docker** |
| `@dnc/i18n` + script sinh union type `MessageKey` từ `en.json` | Gõ sai khoá → cả ba app đỏ lúc compile |
| **Viết 8 ADR** (mục 8.4) | Có file trong `docs/adr/` |

### 8.3 Thứ tự đưa package vào theo sprint

Không đưa hết chín package vào S0. Mỗi package xuất hiện đúng lúc tính năng cần nó — đó là cách duy nhất biết nó có thật sự cần thiết hay không.

| Sprint | Package mới | Kèm theo |
|---|---|---|
| **S0** | `config`, `contracts`, `domain`, `tokens`, `i18n` | Luật `dependency-cruiser` B1–B7 |
| **S1** (M1 auth) | `policy` (CASL), `api-client` (sinh từ OpenAPI) | `openid-client` cho OIDC; guard rate-limit trên Redis |
| **S2–S3** (M2 sự kiện + bản đồ) | `map-style` | MapLibre hai đầu; `ST_AsMVT` phục vụ 6 khu vực |
| **S4** (M3 RSVP) | `query` | `withRsvpLock()` + **test tích hợp 50 request đồng thời trong CI** |
| **S6–S7** (M5 beta) | — | Directus (tuỳ chọn, kèm hai guardrail ở R9) |

### 8.4 Tám ADR phải viết ở Sprint 0

Mục đích: 6–18 tháng nữa không ai mở lại những cuộc tranh luận này từ đầu.

| ADR | Nội dung |
|---|---|
| **0001** | **Giữ NestJS + TypeORM.** Ghi rõ: *"TypeORM đang hấp hối" là SAI vào tháng 9/2026* (đã kiểm chứng: `1.1.0` là latest, nightly ra 01/09/2026). Lý do chính đáng **duy nhất** để rời TypeORM là chất lượng suy luận kiểu, không phải tình trạng bảo trì |
| **0002** | **Không dùng BaaS.** Lý do quyết định: nghiệp vụ waitlist tự thăng hạng là một transaction phải khoá dòng event; trên Supabase nó chỉ có hai chỗ đặt — một Postgres function (mất type dùng chung, không unit-test được trong CI TypeScript, debug bằng `RAISE NOTICE`) hoặc một Edge Function Deno (deploy riêng, log riêng, **vẫn** cần đúng cái khoá đó). Tệ hơn: vì client ghi thẳng được vào `rsvps` qua PostgREST, RLS **bắt buộc** phải cấm insert trực tiếp để giữ bất biến — tức là **tắt đúng tính năng bán hàng chính của BaaS ở đúng bảng quan trọng nhất sản phẩm**, mà vẫn trả toàn bộ chi phí vận hành 11 container |
| **0003** | **RLS chỉ làm lưới chắn cuối trên 2–3 bảng nhạy cảm, CASL là engine chính.** Trả lời trung thực: **CÓ**, RLS diễn đạt được ma trận về lý thuyết. Nhưng ~5 bảng × 4 thao tác × nhánh theo role ra **40–80 policy**, là chuỗi SQL **không có type checking**, không nhảy được vào định nghĩa trong IDE, và **bug thì IM LẶNG** — nó không ném lỗi, nó chỉ trả về sai số dòng. Cuối cùng vẫn phải viết lại luật đó ở UI để ẩn nút |
| **0004** | **Bộ lọc ngân sách.** Tổng có dự phòng ở mốc A là **≈196 USD** trên trần **250 USD** (§13.3 tài liệu 04), tức dư **~54 USD**. **Luật thường trực: bất cứ thứ gì mang theo một kho dữ liệu thứ hai đều bị loại tự động.** Điều này giết vĩnh viễn Supabase self-hosted (11 service, khuyến nghị 8GB/4 core, staging phải nhân đôi nguyên bộ), Novu (bắt buộc MongoDB) và Trigger.dev (webapp + PG + Redis + ElectricSQL + ClickHouse + registry + MinIO) |
| **0005** | **Chia sẻ LOGIC và TOKEN, không chia sẻ MARKUP.** `@dnc/tokens` export 0 dòng JSX. Bằng chứng thị trường: thư viện chia sẻ logic lớn hơn thư viện component universal 2–3 bậc độ lớn |
| **0006** | **Giữ artifact OpenAPI có phiên bản.** Lý do: binary iOS/Android đã lên store **không rút về được** — người dùng có thể xài bản app 6 tháng tuổi trong khi server đã đổi. Đây là lý do loại **cả tRPC lẫn Hono RPC**, không phải vì chúng yếu |
| **0007** | **Không dùng Better Auth ở Giai đoạn 1** + ba điều kiện đảo ngược (R7) |
| **0008** | **Mọi DDL không gian viết migration tay** + script CI kiểm drift (R3) |

---

## 9. Những gì đã kiểm chứng và những gì chưa chắc

Phần này tách bạch để chủ dự án biết trọng số nào đặt vào đâu.

### 9.1 ĐÃ KIỂM CHỨNG TRỰC TIẾP trong phiên này (01/09/2026) — độ tin cậy CAO

**Phiên bản và ngày phát hành** — truy vấn trực tiếp `registry.npmjs.org` (dist-tags + trường `time`):

| Gói | Phiên bản latest | Ngày | Ý nghĩa |
|---|---|---|---|
| `typeorm` | 1.1.0 | 13/07/2026 | tag `dev` = `1.1.0-nightly.20260901` **ra đúng hôm nay** → dự án rất sống |
| `@nestjs/core` | 12.0.1 | 27/08/2026 | **mới 5 ngày** |
| `@nestjs/swagger` · `@nestjs/typeorm` · `@nestjs/schedule` · `@nestjs/websockets` | 12.0.1 | 27–28/08/2026 | toàn họ lên 12.x đồng loạt |
| `@nestjs/bullmq` | 12.0.0 | 08/2026 | sẵn sàng Nest 12 |
| `drizzle-orm` | **0.45.2** | **27/03/2026** | tag `rc` = `1.0.0-rc.4` @ 27/06/2026, snapshot `rc.5` @ 12/08/2026 — **CHƯA GA** |
| `drizzle-zod` | 0.8.3 | 06/08/2025 | đứng yên **13 tháng** |
| `zod` | 4.5.4 | 29/08/2026 | |
| `next` | 16.3.4 | 31/08/2026 | |
| `expo` | 57.0.18 | 28/08/2026 | `react-native` latest 0.87.1 @ 26/08/2026 |
| `leaflet` | **1.9.4** | **18/05/2023** | tag `alpha` = `2.0.0-alpha.1` @ 16/08/2025 |
| `react-leaflet` | 5.0.0 | 14/12/2024 | ~21 tháng |
| `maplibre-gl` | 6.6.0 | 24/08/2026 | |
| `@maplibre/maplibre-react-native` | 11.3.8 | **01/09/2026** | publish đúng hôm nay; peer: `expo >=54`, `react-native >=0.80`, `react >=19.1` → **tương thích Expo 57** |
| `react-native-maps` | 1.29.0 | 28/06/2026 | **VẪN SỐNG** — lập luận MapLibre dựa trên tái sử dụng, không dựa trên gói này chết |
| `socket.io` | 4.8.3 | 23/12/2025 | `engine.io` 6.6.9 @ 16/06/2026 → vẫn được vá |
| `@socket.io/redis-adapter` | **8.3.0** | **13/03/2024** | ~2,5 năm không bản mới |
| `bullmq` | 6.3.4 | 01/09/2026 | nhánh v5 vẫn được vá (`5.81.4` @ 27/08/2026) → đường lùi an toàn |
| `better-auth` | 1.7.2 | 26/08/2026 | |
| `typescript` | 7.0.2 | 08/07/2026 | **6.0.3 stable tồn tại** @ 16/04/2026 → đây là đường lùi, không phải 5.9 |
| `@casl/ability` | 7.0.1 | 06/07/2026 | |
| `openid-client` | 6.8.7 | 20/08/2026 | |
| `@tanstack/react-query` | 5.102.8 | 27/08/2026 | |
| `dependency-cruiser` / `knip` / `type-coverage` / `oxlint` | 18.2.0 / 6.34.0 / 2.30.1 / 1.80.0 | 10/08 · 31/08 · 26/07 · 24/08/2026 | tất cả đang hoạt động |
| `vitest` / `unplugin-swc` / `@swc/core` | 4.1.11 / 1.5.11 / 1.16.1 | 18/08 · 13/08 · 19/08/2026 | |
| `directus` | 12.3.1 | 25/08/2026 | |

**`peerDependencies` — đọc trực tiếp từ metadata gói:**

| Khẳng định | Bằng chứng | Hệ quả |
|---|---|---|
| `@nestjs/throttler@6.5.0` **không hỗ trợ Nest 12** | peer `@nestjs/core: ^7 \|\| ^8 \|\| ^9 \|\| ^10 \|\| ^11` | Phải tự viết guard rate-limit (R2) |
| `nestjs-zod@5.5.0` **không hỗ trợ Nest 12** | peer `@nestjs/common ^10 \|\| ^11`, `@nestjs/swagger ^7.4.2 \|\| ^8 \|\| ^11` | Loại `nestjs-zod` là quyết định đúng, không phải sở thích |
| `@thallesp/nestjs-better-auth@2.7.0` **chặn kép** | peer `@nestjs/core ^11.1.6` **và** `typescript ^5.9.2 \|\| ^6.0.0` | Không cài được cùng Nest 12 **lẫn** TS 7 → lý do cứng để hoãn Better Auth |
| **Đường lùi về Nest 11 là an toàn** | `@nestjs/typeorm@12.0.1` peer `@nestjs/core ^10 \|\| ^11 \|\| ^12` và `typeorm ^0.3.0 \|\| ^1.0.0-dev` | Lùi Nest không kéo theo phải lùi ORM (R1) |
| `typescript-eslint@8.69.0` **không chạy trên TS 7** | peer `typescript >=4.8.4 <6.1.0` | Phải dùng `oxlint` + `oxlint-tsgolint` |
| `ts-jest@29.4.12` **không chạy trên TS 7** | peer `typescript >=4.3 <7` | Phải dùng Vitest + SWC |
| `oxlint@1.80.0` có đường lint type-aware cho TS 7 | peer khai `oxlint-tsgolint >=7.0.2001`; gói `oxlint-tsgolint@7.0.2001` publish 21/07/2026 | Đây là thứ giải quyết mâu thuẫn TS 7 ↔ lint |
| `@nestjs/swagger@12.0.1` **giữ đường cũ** | peer vẫn khai `class-validator: "*"`, `class-transformer: "*"` | Quay về class-validator vẫn được nếu cần |

**Kiểm chứng bằng cách giải nén tarball — bằng chứng mạnh nhất có thể:**

| Khẳng định | Bằng chứng |
|---|---|
| **NestJS 12 hỗ trợ Standard Schema là THẬT, chính chủ** | Tarball `@nestjs/common@12.0.1` chứa `pipes/standard-schema-validation.pipe.js` và `serializer/standard-schema-serializer.interceptor.js` |
| **Đường Zod → OpenAPI là THẬT, chính chủ** | Tarball `@nestjs/swagger@12.0.1` chứa `services/standard-schema-openapi.converter.js`, và gói khai `dependencies` gồm `@standard-schema/spec` |
| **`better-auth` KHÔNG có adapter TypeORM** | Tarball `better-auth@1.7.2` chỉ có `dist/adapters/{drizzle,kysely,mongodb,prisma}-adapter/` |

**Kiểm chứng bằng cách chạy thật — đây là điều không giám khảo nào làm được:**

> Tôi cài `typescript@7.0.2`, biên dịch một file có hình dạng NestJS (`experimentalDecorators: true`, `emitDecoratorMetadata: true`, một class decorator và một constructor có tham số kiểu class). **Output chứa đúng `__metadata("design:paramtypes", [Repo])`.**
>
> **Kết luận: TypeScript 7 xử lý decorator metadata y hệt TS 5.x.** Điều này gỡ bỏ mối nghi mà Phương án 4 tự khai là không xác minh được và Phương án 3 đi lướt qua. NestJS DI và TypeORM entity **chạy đúng trên TS 7**; rào cản duy nhất còn lại nằm ở các công cụ dùng programmatic API của TypeScript (đã có thay thế).

**Kiểm chứng từ nguồn chính thức không phải npm:**

| Khẳng định | Nguồn | Kết quả |
|---|---|---|
| Lịch LTS Node.js | `nodejs/Release` → `schedule.json` | **v22**: maintenance từ 21/10/2025, EOL **30/04/2027** (chỉ 2 tháng sau M6). **v24**: LTS từ 28/10/2025, maintenance từ 20/10/2026, EOL **30/04/2028**. **v26**: LTS từ 28/10/2026 |
| Phiên bản PostgreSQL | `postgresql.org/versions.json` | **18** là bản current, latest minor **18.6**, EOL 14/11/2030. PG 16 latest minor 16.15, EOL 09/11/2028 |
| Phiên bản PostGIS | `download.osgeo.org/postgis/source/` | **3.6.4** phát hành **08/06/2026** là bản stable mới nhất. **3.7.0 mới chỉ có `alpha1`, `beta1`, `beta2`, `rc1` — CHƯA GA.** (Cả bốn phương án đều ghi 3.6.2 hoặc 3.6.3, tức đều hơi cũ) |

### 9.2 CHƯA CHẮC CHẮN — nói rõ để không ai dùng làm căn cứ

| Khẳng định | Vì sao chưa chắc | Ảnh hưởng tới khuyến nghị |
|---|---|---|
| **Mọi con số GitHub**: số issue mở, số sao, số maintainer, nhịp commit | `api.github.com` trả **403 rate limit** từ máy này (IP `116.110.153.211`), không có `gh` CLI đã xác thực. Bốn phương án đưa bốn con số khác nhau cho cùng một repo (TypeORM 619 vs 440; Drizzle 2.004 vs 1.396) — **ít nhất một nửa phải sai** | **Không có con số issue nào được dùng làm căn cứ trong khuyến nghị này.** Mọi kết luận về sức khoẻ thư viện đều dựa trên ngày phát hành npm và metadata gói, là thứ tôi tra được trực tiếp |
| **Trạng thái issue TypeORM #10870** ("closed as not planned") | Cùng lý do rate limit. Tôi **không xác minh được** | Không đổi gì: giảm thiểu ở R3 tốn 0,5 ngày và nên làm dù issue ở trạng thái nào, vì hậu quả (không ai tin `migration:generate` nữa) đắt hơn nhiều |
| **Vercel mua Better Auth ngày 07/07/2026** | Không tự xác minh trong phiên này | Không ảnh hưởng: Better Auth bị hoãn vì hai lý do **khác** đã kiểm chứng cứng (không có adapter TypeORM; cầu nối Nest chặn ở `^11` + TS `^6`) |
| **Ước lượng ~2.400–3.300 dòng tiết kiệm** (mục 5.2) | Suy ra từ phạm vi trong `docs/analysis`, **không đo trên mã thật** vì repo trống. Sai số ±30% | Con số ở mục 5.3 (8 nhóm đồng bộ tay → 1) chắc chắn hơn vì nó đếm cấu trúc |
| **Chi phí học 3–4 tuần-người** (mục 6.1) | Phán đoán kỹ thuật, không phải số đo | Nếu đội chậm hơn dự kiến ở tuần 1, dùng đường lùi R1 sớm |
| **TypeScript 7 nhanh hơn 8–12 lần** | Số liệu do bên thứ ba công bố, tôi **không tự đo** | Không phải lý do chính để chọn TS 7; lý do chính là greenfield thì không có lý do khởi động ở bản cũ hơn 2 major |
| **NestJS 12 CLI mặc định scaffold `oxlint`/Vitest/Rspack** | Tôi xác minh được `@nestjs/cli@12.0.0` khai peer gồm `@swc/core`, `@rspack/core`, `webpack` — **nhất quán** với khẳng định đó, nhưng tôi **không chạy `nest new`** | Không ảnh hưởng: lựa chọn `oxlint`/Vitest được biện minh độc lập bằng ràng buộc peer của TS 7 |
| **`oxlint-tsgolint` có cover `no-floating-promises` và `no-misused-promises` không** | **KHÔNG kiểm chứng được.** Tôi chỉ xác minh gói tồn tại và được `oxlint` khai làm peer | **Đây là hạng mục phải spike trong tuần 1** (mục 8.1, ngày T5). Nếu không, kích hoạt đường lùi TS 6.0.3 (R4) |
| **Hai lập trình viên "thạo" đến mức nào** | Giả định lấy từ đề bài | Toàn bộ ước tính chi phí học phụ thuộc giả định này. Nếu thực tế là 1 người backend thạo + 1 người mới, cộng thêm 50% |

### 9.3 Một cải chính đối với chính tài liệu nền

Bản `04-tech-stack-va-kien-truc.md` **tự mâu thuẫn** ở đúng chỗ mà khuyến nghị này vá, và điều này đúng bất kể chọn phương án nào:

- **§5.4.3 luật 2** bắt "Request DTO validate bằng `class-validator`" và **luật 5** bắt "mọi trường có `@ApiProperty`".
- **§5.6** lại liệt kê `packages/validation` — "Zod schema **dùng chung client + server**".

Nghĩa là quy tắc *"tiêu đề sự kiện 3–120 ký tự"* bị viết **hai lần** bằng hai cơ chế khác nhau, và **không có gì ép chúng khớp nhau**. Đó là một lỗ hổng thật, và nó là lý do cụ thể nhất giải thích vì sao khuyến nghị "hợp nhất tầng hợp đồng bằng Zod" là thay đổi có tỷ lệ lợi ích trên rủi ro cao nhất trong toàn bộ phân tích này.

---

## 10. Một đoạn kết trung thực

Bản kiến trúc hiện tại **không sai**. Cơ chế chống race của RSVP bằng `FOR NO KEY UPDATE` cộng trigger là **đúng**. Quyết định hosting tại Việt Nam là **đúng**. Việc loại NativeWind và chỉ chia sẻ design token là **đúng**. Monolith module hoá thay vì microservices là **đúng**. Nguyên tắc "ảnh không đi qua API" và "strip EXIF GPS" là **đúng**.

Khuyến nghị này **không đề xuất thay nó**. Nó sửa ba khuyết điểm cụ thể:

1. Bản cơ sở nghĩ về tái sử dụng như **"chia sẻ KIỂU DỮ LIỆU"** (`shared-types`, `api-client` sinh từ OpenAPI), trong khi thứ thực sự bị viết ba lần và thực sự gây bug là **QUY TẮC NGHIỆP VỤ**. Kiểu dữ liệu lệch nhau thì TypeScript bắt được; quy tắc lệch nhau thì **chỉ người dùng phát hiện** — bằng cách bấm nút RSVP xanh rồi nhận 409, hoặc bằng cách được app nói rằng cần làm X để lên T4 trong khi server nghĩ là Y.
2. Bản cơ sở vẽ ranh giới module rất đẹp và **không có gì kiểm tra** nó. Sáu tháng nữa, dưới áp lực deadline, sẽ có người import thẳng `event/entities/event.entity` từ trong `rsvp`, và "monolith có ranh giới" trở thành lời nói suông — lúc đó Giai đoạn 2 và Giai đoạn 3 không tách ra được nữa.
3. Bản cơ sở chọn phiên bản khởi động **trễ 1–3 major ở gần như mọi lớp**, trong khi repo đang trống. Hôm nay giá bằng 0; sau sáu tháng là năm đợt migration lúc đã có người dùng thật.

Và một điều cuối, quan trọng nhất. Nếu chủ dự án đọc toàn bộ tài liệu này rồi vẫn thấy không yên tâm với bất kỳ thay đổi nào ở trên, thì **đừng làm nửa vời**: hãy giữ nguyên toàn bộ bản kiến trúc cũ và đổi **duy nhất một thứ** — thay `class-validator` + `@ApiProperty` bằng một schema Zod. Riêng thay đổi đó đã xoá **3 trong 8** nhóm đồng bộ tay với chi phí học 2–3 ngày, và nó là đề xuất có tỷ lệ lợi ích trên rủi ro cao nhất trong toàn bộ phân tích này. Mọi thứ còn lại là tối ưu hoá bên trên nó.
