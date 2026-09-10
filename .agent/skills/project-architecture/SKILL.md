---
name: project-architecture
description: Kiến trúc, tech stack, quy ước code và luật phát triển của Da Nang Connect — nền tảng kết nối cộng đồng expat tại Đà Nẵng (sự kiện, RSVP, thể thao, trao đổi ngôn ngữ). MỌI agent PHẢI đọc file này trước khi thay đổi bất cứ thứ gì trong repo.
---

# Da Nang Connect — Kiến trúc & Hướng dẫn phát triển

> **⚠️ Đây là tài liệu tham chiếu chi tiết.** Nạp từng mục theo nhu cầu, đừng đọc
> hết mỗi lần. Bảng "cần nạp gì, khi nào" nằm ở
> [`.agent/rules/skill-triggers.md`](../../rules/skill-triggers.md).
>
> Nguồn sự thật đầy đủ về sản phẩm và schema nằm ở `docs/analysis/`. File này chỉ
> là bản rút gọn để thực thi hằng ngày — khi hai bên mâu thuẫn, `docs/analysis/`
> thắng.

---

## 🔴 BẮT BUỘC TRƯỚC KHI LÀM BẤT CỨ VIỆC GÌ

### Bước 0.1 — Qua cổng lập kế hoạch

Đọc [`.agent/rules/planning-and-agent-mode.md`](../../rules/planning-and-agent-mode.md) trước khi thực thi.

| Loại việc | Bắt buộc trước khi viết code |
|---|---|
| Sửa lỗi | Đọc code thật, nêu nguyên nhân gốc + hướng sửa, rồi mới sửa |
| Thay đổi nhỏ | Nói ngắn gọn sẽ sửa gì, rồi làm |
| Thay đổi vừa | Viết kế hoạch triển khai ngắn trong chat, làm tiếp nếu người dùng không chặn |
| Thay đổi lớn | Viết kế hoạch đầy đủ và **chờ người dùng duyệt rõ ràng** |
| Việc để sau | Ghi vào `docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md`, không code |

**Chế độ agent:** mặc định một agent để tiết kiệm token. Chỉ dùng nhiều agent khi
người dùng yêu cầu, khi việc lớn/cắt ngang nhiều ranh giới, hoặc khi cần một lượt
rà soát độc lập đáng công điều phối. Trước task đầu tiên của mỗi phiên, **bắt buộc
quét bộ agent** trong `.agent/agents/`, ánh xạ task vào agent sở hữu và tuyên bố
chế độ đã chọn theo
[`.agent/rules/agent-first.md`](../../rules/agent-first.md).

### Bước 0.2 — Cổng STOP khi đổi schema

Mọi thay đổi bảng/cột/enum/index đều phải qua
[`.agent/skills/database-migrations/SKILL.md`](../database-migrations/SKILL.md)
và cần người dùng duyệt **trước khi** viết migration. `synchronize` luôn `false`.

### Bước 0.3 — Cổng dữ liệu nhạy cảm

Tính năng nào chạm vào dữ liệu nhạy cảm (hồ sơ, số điện thoại, vị trí, ảnh, lịch sử
tham gia sự kiện) phải đối chiếu
`docs/analysis/05-trust-safety-va-kiem-duyet.md`: chỉ lưu trường thật sự dùng tới,
mặc định ẩn, có đường xoá, không đẩy ra response công khai và không ghi vào log.

---

## 1. Sản phẩm và giai đoạn

Da Nang Connect là nền tảng kết nối cộng đồng người nước ngoài đang sống tại Đà Nẵng.

| Giai đoạn | Phạm vi | Trạng thái |
|---|---|---|
| **Giai đoạn 1** | Kết nối cộng đồng: sự kiện, thể thao, trao đổi ngôn ngữ | **Đang làm** |
| Giai đoạn 2 | Nhà ở | Chừa chỗ trong schema, chưa code |
| Giai đoạn 3 | Y tế / dịch vụ chuyên môn | Chừa chỗ trong schema, chưa code |

**Phạm vi MVP Giai đoạn 1** — mọi quyết định kỹ thuật phải phục vụ đúng năm việc này:

1. Tạo sự kiện (có sự kiện lặp lại, bản dịch EN/VI, ảnh, sức chứa).
2. RSVP — ghi danh, hàng chờ (waitlist), huỷ, thăng hạng tự động khi có chỗ trống.
3. Tìm kiếm & lọc theo khu vực: My Khe, An Thuong, My An, Hai Chau, Son Tra,
   Ngu Hanh Son — truy vấn bằng PostGIS (theo vùng và theo bán kính).
4. Hồ sơ cá nhân có **độ tin cậy** (trust level) tính từ tín hiệu tích luỹ.
5. Kiểm duyệt nội dung người dùng tạo (UGC) — báo cáo, chặn, hành động kiểm duyệt.

**Người dùng chính là expat** → ngôn ngữ mặc định của UI là **English**, tiếng Việt
là ngôn ngữ thứ hai.

---

## 2. Cấu trúc monorepo

Một repo, quản lý bằng **pnpm workspace + Turborepo**. Package nội bộ đặt tên `@dnc/<kebab-case>`.

| Thành phần | Công nghệ | Đường dẫn | Package |
|---|---|---|---|
| **API backend** | NestJS 11 + TypeScript + TypeORM | `apps/api/` | `@dnc/api` |
| **Web (người dùng cuối)** | Next.js 16 App Router + React 19 + Tailwind CSS | `apps/web-client-side/` | `@dnc/web-client` |
| **Web (vận hành)** | Next.js 16 App Router + React 19 + Tailwind CSS | `apps/web-admin-side/` | `@dnc/web-admin` |
| **Mobile** | Expo 54 + React Native 0.81 + Expo Router | `apps/mobile/` | `@dnc/mobile` |
| Kiểu dùng chung | enum, hằng số, kiểu miền | `packages/shared-types/` | `@dnc/shared-types` |
| API client | sinh từ OpenAPI + hook TanStack Query | `packages/api-client/` | `@dnc/api-client` |
| i18n | `en.json`, `vi.json` — nguồn duy nhất | `packages/i18n/` | `@dnc/i18n` |
| Zod schema | dùng chung client + server | `packages/validation/` | `@dnc/validation` |
| Preset cấu hình | tsconfig, eslint, prettier | `packages/config/` | `@dnc/config` |
| Design token + component web | | `packages/ui/` | `@dnc/ui` |
| Hạ tầng | compose, nginx, script, grafana | `ops/` | — |
| Tài liệu | phân tích, ADR, nguồn | `docs/` | — |

> **🔴 Luật chia sẻ code:** cả hai app web (`apps/web-client-side`, `apps/web-admin-side`)
> và mobile **không** import trực tiếp từ `apps/api`.
> Kiểu dữ liệu đi qua `@dnc/shared-types` và `@dnc/api-client` (sinh từ OpenAPI của
> backend). Không gõ tay interface hai lần.

> **🔴 Bẫy số một của monorepo pnpm + React Native:** `.npmrc` ở gốc phải có
> `node-linker=hoisted`, nếu không Metro bundler không đi được theo symlink lồng nhau.

Cây thư mục đầy đủ → `docs/analysis/04-tech-stack-va-kien-truc.md` mục 5.2.

---

## 3. Tech stack đã chốt

| Lớp | Chốt | Ghi chú ngắn |
|---|---|---|
| Runtime | Node.js 22.x LTS | |
| Backend | NestJS 11 | Monolith **modul hoá**, không microservices |
| ORM | TypeORM 0.3.2x | `synchronize: false`, `SnakeNamingStrategy` |
| CSDL | PostgreSQL 16 | Nguồn sự thật duy nhất |
| Địa lý | PostGIS 3.4 | `geography(Point,4326)`, `ST_DWithin`, index GIST |
| Cache / queue | Redis 7.4 + BullMQ 5 | Cache, rate limit, pub/sub cho socket, job nền |
| Realtime | Socket.IO 4.8 + `@socket.io/redis-adapter` | |
| Web client | Next.js 16 + React 19 + Tailwind CSS 4 | App Router, RSC, SEO cho trang sự kiện công khai |
| Web admin | Next.js 16 + React 19 + Tailwind CSS 4 | Cùng stack với client để dùng chung `packages/*`; KHÔNG cần SEO (`robots: noindex`), ưu tiên bảng biểu đầy đủ chức năng + thao tác hàng loạt, responsive nhưng ưu tiên desktop |
| Mobile | Expo 54 + React Native 0.81 + Expo Router 6 | EAS Build/Submit, OTA update |
| Bản đồ | MapLibre (`apps/web-client-side`) · `react-native-maps` (mobile) | tile OSM, không khoá nhà cung cấp |
| Auth | JWT RS256 access 15 phút + refresh 30 ngày xoay vòng | Social login Google / Apple / Facebook |
| Push | Expo Push Service → APNs + FCM | Một API cho cả hai nền tảng |
| Lưu trữ | S3-compatible + CDN có POP tại Việt Nam | Presigned upload |
| Hạ tầng | Docker + Docker Compose | Cùng một image cho staging và production |
| CI/CD | GitHub Actions + EAS | |
| Theo dõi lỗi | Sentry | Backend + cả hai app web + mobile, có source map |

Giải trình lựa chọn từng lớp → `docs/analysis/04-tech-stack-va-kien-truc.md` mục 4.

---

## 4. Quyết định kiến trúc then chốt

- **Monolith modul hoá** — một API, một database, một Redis. Chỉ tách service khi có
  số đo chứng minh nút thắt.
- **Repository pattern** — Service **không bao giờ** chạm database trực tiếp. Mọi truy
  cập dữ liệu nằm trong `<name>.repository.ts` (TypeORM repository, hoặc SQL thô khi
  cần PostGIS).
- **Phụ thuộc module một chiều** — module miền (`event`, `rsvp`, `area`, `search`,
  `chat`, `report`) được import module nền tảng (`auth`, `user`, `profile`, `media`,
  `notification`); module nền tảng **không bao giờ** import ngược. Chặn bằng ESLint
  `import/no-restricted-paths`.
- **Ảnh không đi qua API** — client xin presigned URL rồi tải thẳng lên object
  storage; API chỉ nhận và xác thực khoá file.
- **Việc chậm đẩy vào hàng đợi** — gửi push, resize ảnh, gửi email, digest hàng tuần,
  tính lại điểm tin cậy đều là job BullMQ. Request HTTP giữ p95 < 300ms.
- **i18n từ commit đầu tiên** — không hardcode chuỗi, mọi text đi qua key i18n.
- **Ưu tiên chuẩn mở** — S3 API, PostgreSQL, Redis, OSM. Tránh khoá cứng vào dịch vụ
  độc quyền.
- **Swagger BẮT BUỘC trên mọi endpoint** (`@ApiOperation`, `@ApiResponse`,
  `@ApiProperty`) — OpenAPI là đầu vào để sinh `@dnc/api-client`. Thiếu decorator là
  client sai kiểu.

---

## 5. Bản đồ module backend (`apps/api/src/modules/`)

| Nhóm | Module | Trách nhiệm |
|---|---|---|
| Nền tảng | `auth` | JWT, refresh xoay vòng, OIDC, OTP |
| Nền tảng | `user` | Tài khoản, thiết bị |
| Nền tảng | `profile` | Hồ sơ, điểm và mức độ tin cậy |
| Nền tảng | `media` | Presigned upload, biến thể ảnh |
| Nền tảng | `notification` | Ưa thích, lịch sử, fan-out push/email |
| Miền GĐ1 | `event` | CRUD sự kiện, trạng thái, slug, bản dịch |
| Miền GĐ1 | `rsvp` | Ghi danh, waitlist, huỷ, thăng hạng |
| Miền GĐ1 | `area` | Khu vực Đà Nẵng, truy vấn PostGIS |
| Miền GĐ1 | `category` | Loại hình, thẻ, ngôn ngữ của sự kiện |
| Miền GĐ1 | `search` | Lọc nâng cao, sắp xếp, feed khám phá |
| Miền GĐ1 | `chat` | Thảo luận theo sự kiện |
| Miền GĐ1 | `report` | Báo cáo nội dung, chặn người dùng |
| Vận hành | `curation` | Nhập tay sự kiện, cấp quyền organizer |
| Vận hành | `admin` | Kiểm duyệt, thống kê |
| Vận hành | `health` | liveness / readiness |
| Chừa chỗ | `housing` (GĐ2), `pro-services` (GĐ3) | Chưa code |

### Cấu trúc một module — đúng **bốn class**

| File | Class | Trách nhiệm |
|---|---|---|
| `<name>.controller.ts` | `<Name>Controller` | Route HTTP + Swagger decorator. Không chứa logic nghiệp vụ. |
| `<name>.service.ts` | `<Name>Service` | Logic nghiệp vụ và điều phối. **Không viết SQL thô.** |
| `<name>.repository.ts` | `<Name>Repository` | Toàn bộ truy cập dữ liệu, kể cả SQL thô cho PostGIS. |
| `<name>.module.ts` | `<Name>Module` | Nối dây `controllers`, `providers`, `exports`. |

`dto/` và `entities/` là file hỗ trợ, không tính là class thêm. **Không vừa bốn
class = cần module mới**, không phải nhét thêm class vào thư mục cũ.

Chi tiết → [`.agent/rules/backend-module-structure.md`](../../rules/backend-module-structure.md).

---

## 6. Quy ước đặt tên (rút gọn)

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| Thư mục / file | `kebab-case` | `event-detail.tsx`, `rsvp.service.ts` |
| Class | `PascalCase` | `EventService`, `RsvpRepository` |
| Interface / type | `PascalCase`, **không** tiền tố `I` | `EventSummary` |
| Enum TS | `PascalCase` số ít, giá trị `SCREAMING_SNAKE` | `RsvpStatus.WAITLISTED` |
| Bảng DB | `snake_case` số nhiều | `events`, `rsvps`, `areas` |
| Cột DB | `snake_case` | `starts_at`, `area_id`, `rsvp_going_count` |
| Cột thời gian | `timestamptz`, hậu tố `_at` | `created_at`, `starts_at`, `deleted_at` |
| Cột boolean | tiền tố `is_` / `has_` | `is_published`, `has_waitlist` |
| Enum Postgres | `snake_case` + hậu tố `_enum` | `event_status_enum`, `rsvp_status_enum` |
| Index / unique / check | `idx_` · `uq_` · `ck_` | `idx_events_area_status`, `uq_rsvps_occurrence_user` |
| Migration | `<epoch_ms>-<PascalCase>.ts` | `1756598400000-CreateEventTable.ts` |
| Key i18n | `<namespace>.<screen>.<element>` | `event.detail.rsvpButton` |
| Endpoint REST | số nhiều, kebab-case, có version | `/api/v1/events/{id}/rsvps` |
| Nhánh git | `<type>/<mô-tả-ngắn>` | `feat/event-waitlist` |
| Commit | Conventional Commits | `feat(rsvp): add waitlist promotion job` |
| Biến môi trường | `SCREAMING_SNAKE_CASE` | `DB_HOST`, `REDIS_URL` |

---

## 7. Thời gian và i18n — hai chỗ dễ sai nhất

**Thời gian:**
- Database lưu **UTC** (`timestamptz`). Không có ngoại lệ.
- Timezone hiển thị mặc định: `Asia/Ho_Chi_Minh`, nhưng phải đọc từ `users.timezone`
  vì expat có thể đặt múi giờ khác.
- Client **không** gọi `new Date()` trực tiếp để hiển thị — đi qua helper format dùng
  chung để mọi màn hình đổi múi giờ giống nhau.
- Cột `date` (không có giờ) chỉ dùng khi gom nhóm theo *ngày Đà Nẵng*, không dùng cho
  mốc thời gian.

**i18n:**
- Ngôn ngữ mặc định **`en`**, thứ hai **`vi`**. Cả hai file nằm ở `packages/i18n/`.
- Chuỗi hiển thị cho người dùng — web và mobile — đều qua `t('key')`. Không hardcode.
- Nội dung do người dùng nhập (tên/mô tả sự kiện) **không** đi qua i18n mà lưu ở bảng
  bản dịch riêng, kèm cột ngôn ngữ gốc.
- Thêm key mới là thêm vào **cả** `en.json` và `vi.json` trong cùng một commit.

---

## 8. Nhật ký kiểm toán (BẮT BUỘC cho mọi mutation)

```typescript
await this.auditLog.log({
  action: 'status_change',        // create|update|delete|status_change|moderate|promote
  entityType: 'rsvp',             // event|rsvp|profile|report|comment|...
  entityId: id,
  actorUserId: user.id,
  changes: { field: 'status', from: 'waitlisted', to: 'going' },
});
```

Mọi `create`, `update`, `delete`, `status_change`, hành động kiểm duyệt và mọi thao
tác thăng hạng waitlist đều phải có lời gọi này. Với hành động kiểm duyệt còn phải
ghi thêm bản ghi vào `moderation_actions` (lý do + người thực hiện) để người bị ảnh
hưởng có thể khiếu nại.

---

## 9. Quy ước xoá mềm

Không bao giờ hard-delete nội dung người dùng tạo. Dùng `@DeleteDateColumn` /
`deleted_at`:

```sql
UPDATE events
SET deleted_at = now(),
    updated_at = now()
WHERE id = $1 AND deleted_at IS NULL;
-- Mọi truy vấn đọc mặc định lọc: WHERE deleted_at IS NULL
```

> **🔴 Bẫy bắt buộc nhớ:** khi có xoá mềm, **mọi UNIQUE phải là partial unique index**
> `... WHERE deleted_at IS NULL`. Nếu không, người dùng sẽ không tạo lại được bản ghi
> đã xoá (ví dụ RSVP lại một sự kiện đã huỷ trước đó).

---

## 10. Luật phát triển (bảng tóm tắt)

Luật đầy đủ ở [`.agent/rules/behaviors.md`](../../rules/behaviors.md) và
[`.agent/rules/checklists.md`](../../rules/checklists.md).

| # | Luật |
|---|---|
| 1 | KHÔNG viết truy vấn DB trong Service — dùng Repository |
| 2 | Truy vấn theo khu vực/bán kính dùng PostGIS (`ST_DWithin`, `ST_Contains`) trên cột `geography(Point,4326)` — KHÔNG tự tính khoảng cách bằng công thức Haversine trong TypeScript |
| 3 | Toạ độ GeoJSON là `[lng, lat]` — ngược với thói quen đọc "lat, lng". Kiểm tra kỹ mọi chỗ dựng point |
| 4 | Mọi thay đổi schema đi qua migration TypeORM — `synchronize` luôn `false` |
| 5 | Mọi endpoint trả đúng envelope `{ success, data, meta }` và nằm dưới `/api/v1/` |
| 6 | Mọi DTO có validate (`class-validator` hoặc Zod pipe) — không tin input client |
| 7 | Mọi mutation gọi `AuditLogService.log()` |
| 8 | Mọi endpoint có decorator Swagger đầy đủ — OpenAPI là nguồn sinh `@dnc/api-client` |
| 9 | Mọi chuỗi hiển thị (web & mobile) dùng `t('key')`, có mặt ở **cả** `en.json` và `vi.json` |
| 10 | Thay đổi số lượng RSVP phải nguyên tử (`SELECT ... FOR UPDATE` hoặc `UPDATE ... RETURNING`) — sức chứa và waitlist là chỗ dễ race condition nhất |
| 11 | Đường dẫn ghi danh, huỷ, thăng hạng waitlist đều phải bắn notification qua BullMQ, không gửi push đồng bộ trong request |
| 12 | Push đi qua Expo Push Service; token `DeviceNotRegistered` 3 lần → `is_active = false`, không gửi tiếp |
| 13 | Mọi nội dung người dùng tạo (sự kiện, bình luận, ảnh, hồ sơ) phải có đường báo cáo (`report`) và chịu được hành động kiểm duyệt |
| 14 | Điểm tin cậy tính từ `trust_signals` append-only qua job nền — KHÔNG cộng/trừ trực tiếp vào cột tổng trong request |
| 15 | Đánh dấu no-show là tín hiệu tin cậy có hệ quả — phải có cửa sổ khiếu nại, không tự động phạt vĩnh viễn |
| 16 | File test KHÔNG nằm cạnh mã nguồn (`apps/api/e2e/**`, `apps/web-client-side/e2e/**`, `apps/web-admin-side/e2e/**`, `apps/mobile/__tests__/**`) |
| 17 | Xong = `tsc --noEmit` pass + test liên quan pass + luồng thật đã chạy + i18n đủ hai ngôn ngữ |
| 18 | File > 500 dòng → DỪNG, tạo task tách file trước |
| 19 | Sửa component/hook dùng chung → kiểm tra TẤT CẢ màn hình tiêu thụ |
| 20 | Sửa bug → đọc controller/service thật trước khi sửa, không đoán |
| 21 | Đổi phạm vi giữa chừng → cập nhật kế hoạch + báo người dùng |
| 22 | KHÔNG commit, KHÔNG deploy khi chưa được người dùng cho phép |
| 23 | Dùng OOP có chọn lọc: backend ưu tiên DI/interface/strategy; frontend ưu tiên composition/hook; kế thừa chỉ khi thật sự "is-a" hoặc mở rộng framework |

---

## 11. Checklist module backend mới

```
□ Entity TypeORM + migration đã duyệt qua cổng STOP (skill database-migrations)
□ DTO có @ApiProperty và validate đầy đủ
□ <name>.repository.ts — toàn bộ truy cập dữ liệu, PostGIS bằng SQL thô nếu cần
□ <name>.service.ts — logic nghiệp vụ, không SQL
□ <name>.controller.ts — @ApiTags, @ApiOperation, @ApiResponse trên mọi method
□ <name>.module.ts — khai báo controllers/providers/exports
□ Inject AuditLogService, gọi log() trên mọi mutation
□ Đăng ký module vào app.module.ts
□ Kiểm tra chiều phụ thuộc: module miền không bị module nền tảng import ngược
□ Key i18n cho mọi thông báo lỗi trả ra client — có ở en.json và vi.json
□ Test đặt tại apps/api/e2e/modules/<name>/
□ Kiểm tra Swagger tại /api/docs, rồi sinh lại @dnc/api-client
```

---

## 12. Bảng dữ liệu chính

Schema đầy đủ (cột, index, ràng buộc) → `docs/analysis/03-domain-va-du-lieu.md`.

| Nhóm | Bảng |
|---|---|
| Danh tính & tin cậy | `users`, `social_accounts`, `auth_sessions`, `profiles`, `trust_signals` |
| Địa lý | `areas` (khu vực Đà Nẵng, có ranh giới PostGIS), `venues` |
| Sự kiện | `events`, `event_occurrences`, `event_translations`, `event_categories`, `tags` |
| Tham dự | `rsvps`, `waitlist_entries` |
| Cộng đồng & an toàn | `comments`, `reviews`, `follows`, `blocks`, `reports`, `moderation_actions` |
| Nhắn tin | `conversations`, `messages` |
| Thông báo | `notifications`, `notification_deliveries`, `notification_preferences`, `push_tokens` |
| Curation & vận hành | `curated_sources`, `curation_tasks`, `saved_searches`, `audit_logs`, `outbox_events` |

**Extension PostgreSQL bắt buộc ở v1:** `postgis`, `pgcrypto`, `citext`, `unaccent`,
`pg_trgm`. (`unaccent` để gõ "an thuong" vẫn ra "An Thượng".)

---

## 13. Chỉ mục tham chiếu

| Chủ đề | File |
|---|---|
| **Luật hành vi luôn bật** | [`.agent/rules/behaviors.md`](../../rules/behaviors.md) |
| **Cổng lập kế hoạch + chế độ agent** | [`.agent/rules/planning-and-agent-mode.md`](../../rules/planning-and-agent-mode.md) |
| **Quét bộ agent đầu phiên** | [`.agent/rules/agent-first.md`](../../rules/agent-first.md) |
| **Cần nạp gì, khi nào** | [`.agent/rules/skill-triggers.md`](../../rules/skill-triggers.md) |
| **Checklist i18n, tooltip, xoá mềm** | [`.agent/rules/checklists.md`](../../rules/checklists.md) |
| **Cấu trúc module backend bốn class** | [`.agent/rules/backend-module-structure.md`](../../rules/backend-module-structure.md) |
| **Nơi đặt file test** | [`.agent/rules/test-file-placement.md`](../../rules/test-file-placement.md) |
| **Chống hồi quy** | [`.agent/rules/no-regression.md`](../../rules/no-regression.md) |
| **Quan sát thực tế trước khi kết luận** | [`.agent/rules/observe-reality.md`](../../rules/observe-reality.md) |
| **Xác minh ba pha** | [`.agent/rules/three-phase-verification.md`](../../rules/three-phase-verification.md) |
| **Migration TypeORM + PostGIS** | [`.agent/skills/database-migrations/SKILL.md`](../database-migrations/SKILL.md) |
| **Xác minh trước khi báo xong** | [`.agent/skills/verification-before-completion/SKILL.md`](../verification-before-completion/SKILL.md) |
| **Tác nhân & phân quyền** | `docs/analysis/01-tac-nhan-va-phan-quyen.md` |
| **Use case** | `docs/analysis/02-use-case.md` |
| **Domain model & schema** | `docs/analysis/03-domain-va-du-lieu.md` |
| **Tech stack & kiến trúc (đầy đủ)** | `docs/analysis/04-tech-stack-va-kien-truc.md` |
| **Trust & safety, kiểm duyệt** | `docs/analysis/05-trust-safety-va-kiem-duyet.md` |
| **Go-to-market Đà Nẵng** | `docs/analysis/07-go-to-market-da-nang.md` |
| **Roadmap & kế hoạch triển khai** | `docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md` |
