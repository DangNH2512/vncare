---
description: Bố cục module NestJS — 4 class lõi + layer DTO request/response bắt buộc cho mọi module backend.
---

# Cấu Trúc Module Backend

Khi thiết kế module backend MỚI dưới `apps/api/src/modules/<name>/`, module đó gồm
**4 class lõi** và **1 layer DTO bắt buộc**.

## 1. Bốn class lõi

| File | Class | Trách nhiệm |
|---|---|---|
| `<name>.controller.ts` | `<Name>Controller` | Route HTTP + Swagger decorator; nhận request DTO, trả response DTO; không có logic nghiệp vụ |
| `<name>.service.ts` | `<Name>Service` | Logic nghiệp vụ và điều phối; **không viết SQL thô**; nhận/trả DTO hoặc entity nội bộ |
| `<name>.repository.ts` | `<Name>Repository` | Toàn bộ truy cập dữ liệu (TypeORM repository hoặc SQL thô cho truy vấn PostGIS) |
| `<name>.module.ts` | `<Name>Module` | Nối dây (`controllers` / `providers` / `exports`) |

## 2. Layer DTO — bắt buộc ở mọi module

Đây là **ranh giới hợp đồng** giữa API và client (`apps/web-client-side`,
`apps/web-admin-side`, `apps/mobile`). Không
module nào được bỏ qua layer này.

```text
apps/api/src/modules/<name>/
├── <name>.controller.ts
├── <name>.service.ts
├── <name>.repository.ts
├── <name>.module.ts
├── <name>.mapper.ts              # entity/row → response DTO
└── dto/
    ├── request/
    │   ├── create-<name>.request.ts     → CreateXxxRequest
    │   ├── update-<name>.request.ts     → UpdateXxxRequest
    │   └── list-<name>.query.ts         → ListXxxQuery      (query string + phân trang)
    └── response/
        ├── <name>.response.ts           → XxxResponse       (dạng rút gọn, dùng trong danh sách)
        └── <name>-detail.response.ts    → XxxDetailResponse (dạng đầy đủ, dùng ở trang chi tiết)
```

### Quy ước đặt tên

- Request: hậu tố `Request` cho body, `Query` cho query string, `Param` cho path param phức tạp.
- Response: hậu tố `Response`. Không dùng `Dto` trần vì không nói lên chiều dữ liệu.
- Một file một class. Tên file `kebab-case`, khớp tên class.

### Luật cứng

1. **Controller không bao giờ trả entity TypeORM.** Mọi giá trị trả ra phải là
   response DTO đi qua `<name>.mapper.ts`. Trả entity trực tiếp làm rò trường nội
   bộ (`password_hash`, `email`, `phone`, `deleted_at`) và khoá cứng lược đồ DB vào
   hợp đồng API.
2. **Request DTO validate bằng `class-validator`**, bật global:
   `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
   Trường lạ bị loại, không âm thầm đi tiếp.
3. **Response DTO khai báo tường minh từng trường.** Không `...entity` spread,
   không `Object.assign`. Thêm trường vào response phải là hành động có chủ đích.
   Kế thừa qua mapped type (§2.1) không vi phạm luật này — tập trường vẫn tường
   minh vì suy ra được từ DTO gốc.
4. **Dữ liệu cá nhân đi qua bộ lọc.** Email và số điện thoại chỉ xuất hiện trong
   response của chính chủ thể dữ liệu, không bao giờ trong response danh sách công
   khai. Người khác chỉ thấy `displayName` và `avatarUrl`.
5. **Swagger sinh từ DTO.** Mọi trường có `@ApiProperty` kèm mô tả và ví dụ; đây là
   nguồn duy nhất để `apps/web-client-side`, `apps/web-admin-side` và
   `apps/mobile` sinh type client.
6. **Type dùng chung nằm ở `packages/shared-types`.** Enum (`RsvpStatus`,
   `EventStatus`, `UserRole`) khai báo một lần ở đó, DTO import vào — không nhân bản.
7. **Thời gian luôn là ISO-8601 UTC** trong DTO (`startAt`, `endAt`). Việc đổi sang
   `Asia/Ho_Chi_Minh` là trách nhiệm client. DTO không chứa chuỗi giờ đã định dạng.
8. **Toạ độ tách khỏi kiểu PostGIS.** Repository trả `geography(Point)`; mapper đổi
   thành `{ lat: number, lng: number }` trong response DTO. Client không bao giờ thấy WKB/WKT.
9. **Phân trang dùng một kiểu bọc chung**: `CursorPage<T>` khai báo ở
   `src/common/dto/cursor-page.response.ts`, gồm `items`, `nextCursor`, `hasMore`.
   Không module nào tự chế kiểu phân trang riêng.
10. **Message lỗi validate dùng key i18n**, không hardcode chuỗi tiếng Anh — UI mặc
    định tiếng Anh nhưng phải dịch được sang tiếng Việt.

### 2.1 Tái sử dụng DTO — kế thừa thay vì chép lại

Khi một DTO mới chỉ khác DTO đã có **vài trường**, không viết lại từ đầu. Dùng
mapped type của `@nestjs/swagger` — chúng giữ nguyên cả decorator `class-validator`
lẫn metadata `@ApiProperty`, nên Swagger và validation vẫn đúng:

| Tình huống | Cách làm |
|---|---|
| Bỏ bớt 4–5 trường | `class PublicEventResponse extends OmitType(EventResponse, ['ownerEmail', 'internalNote'] as const) {}` |
| Chỉ lấy vài trường | `class EventSummaryResponse extends PickType(EventDetailResponse, ['id', 'title', 'startAt'] as const) {}` |
| Thêm 1–2 trường | `class EventDetailResponse extends EventResponse { @ApiProperty() attendeeCount: number }` |
| Ghép hai nhóm trường | `class ListEventQuery extends IntersectionType(CursorPageQuery, EventFilterQuery) {}` |
| Update = Create nhưng optional | `class UpdateEventRequest extends PartialType(CreateEventRequest) {}` |
| Update một phần bắt buộc | `class UpdateEventRequest extends IntersectionType(PartialType(CreateEventRequest), PickType(CreateEventRequest, ['version'] as const)) {}` |

Luôn import mapped type từ `@nestjs/swagger`, **không phải** `@nestjs/mapped-types`
— bản trong `@nestjs/swagger` mới mang theo metadata cho tài liệu API.

#### Khi nào kế thừa, khi nào tách riêng

Kế thừa khi hai DTO **cùng một ý nghĩa nghiệp vụ**, chỉ khác tập trường hiển thị:
`EventResponse` (danh sách) và `EventDetailResponse` (chi tiết) mô tả cùng một sự kiện.

Tách riêng — chấp nhận trùng trường — khi ý nghĩa nghiệp vụ khác nhau, vì lúc đó
một thay đổi ở DTO gốc sẽ lan sang chỗ không mong muốn:

- `CreateEventRequest` và `CreateReportRequest` cùng có `title`, `description` nhưng
  không liên quan gì nhau về nghiệp vụ.
- Response cho organizer và response cho người xem lạ: đừng làm
  `PublicEventResponse extends OmitType(OrganizerEventResponse, [...])`. Thêm một
  trường nội bộ vào bản organizer là nó **tự động lọt** ra bản công khai nếu quên
  thêm vào danh sách `Omit`. Ở ranh giới riêng tư, dùng `PickType` (danh sách trắng)
  chứ không `OmitType` (danh sách đen).

**Nguyên tắc:** `PickType` cho ranh giới bảo mật, `OmitType` cho tiện lợi nội bộ.

#### Giới hạn

- Kế thừa **tối đa 2 tầng**. Sâu hơn thì không ai lần ra được DTO thực sự có trường
  gì — lúc đó khai báo phẳng lại.
- **Không** dùng `Partial<T>`, `Omit<T, K>`, `Pick<T, K>` của TypeScript thuần cho
  DTO. Chúng chỉ tồn tại lúc biên dịch; runtime mất sạch decorator nên
  `ValidationPipe` không validate gì và Swagger ra rỗng.
- DTO dùng chung từ 3 module trở lên thì chuyển lên `src/common/dto/`; nếu
  `apps/web-client-side`, `apps/web-admin-side` hoặc `apps/mobile` cũng cần hình
  dạng đó thì khai báo type ở
  `packages/shared-types` và để DTO implement nó.
- Kế thừa xuyên module chỉ theo chiều miền → nền tảng, giống luật phụ thuộc ở dưới.

### Mapper

`<name>.mapper.ts` chứa hàm thuần, không phụ thuộc — dễ test:

```ts
export function toEventResponse(e: Event): EventResponse { /* ... */ }
export function toEventDetailResponse(e: Event, viewerId?: string): EventDetailResponse { /* ... */ }
```

Mapper nhận thêm ngữ cảnh người xem khi response phụ thuộc quyền (ví dụ chỉ organizer
mới thấy danh sách người đăng ký kèm ghi chú).

## 3. File hỗ trợ

- Kiểu trả về của truy vấn khai báo **ngay trong repository** và export từ đó.
  **Không** tạo `<name>.entity.ts` chỉ để chứa kiểu thuần — file entity chỉ dành cho
  `@Entity` thật của TypeORM.

## Xuyên suốt → `src/common/`, không nhét trong module

Guard, decorator, interceptor, filter, pipe và enum là **xuyên suốt**, nằm dưới
`apps/api/src/common/`:

- Guard → `src/common/guards/` (vd `jwt-auth.guard.ts`, `roles.guard.ts`, `trust-tier.guard.ts`)
- Decorator → `src/common/decorators/` (vd `current-user.decorator.ts`, `public.decorator.ts`, `roles.decorator.ts`)
- DTO dùng chung → `src/common/dto/` (vd `cursor-page.response.ts`, `id-param.request.ts`)
- Enum / kiểu dùng chung → `src/common/enums/` (vd `user-role.enum.ts`, `rsvp-status.enum.ts`)
- Enum và kiểu mà **web/mobile cũng dùng** thì đặt ở `packages/shared-types`, không
  nhân bản trong `src/common/`.

**Không** tạo `-context.service.ts`, `-membership.repository.ts`, `-tier.guard.ts`
bên trong thư mục module.

## Nếu không vừa khuôn

- Service hoặc repository gánh nhiều hơn một trách nhiệm → nhiều khả năng đó là
  **module mới**, không phải thêm class tuỳ tiện vào thư mục cũ.
- Gộp logic tính năng con vào chính `Service` / `Repository` bằng private method,
  đừng tách thành class riêng.
- DTO thì ngược lại: **ưu tiên kế thừa hơn là chép lại** — xem §2.1.

## Quy tắc phụ thuộc giữa các module

Module miền (`event`, `rsvp`, `search`, `chat`, `report`) được phép phụ thuộc module
nền tảng (`auth`, `user`, `profile`, `media`, `notification`). Module nền tảng **không
bao giờ** import ngược lại module miền. Vi phạm bị ESLint rule
`import/no-restricted-paths` chặn.

DTO cũng theo luật này: module miền được import response DTO của module nền tảng
(ví dụ `EventDetailResponse` nhúng `UserSummaryResponse`), chiều ngược lại thì không.

## Ví dụ tham chiếu

```text
apps/api/src/modules/rsvp/
├── rsvp.controller.ts       # POST /events/:id/rsvps, DELETE, GET /events/:id/rsvps
├── rsvp.service.ts          # quy tắc hàng chờ, thăng hạng khi có người huỷ, giới hạn
├── rsvp.repository.ts       # SELECT ... FOR UPDATE, đếm nguyên tử, phân trang cursor
├── rsvp.module.ts
├── rsvp.mapper.ts
└── dto/
    ├── request/
    │   ├── create-rsvp.request.ts    # guestCount, note
    │   └── list-rsvp.query.ts        # status, cursor, limit
    └── response/
        ├── rsvp.response.ts          # id, status, joinedAt, user rút gọn
        └── rsvp-detail.response.ts   # thêm note, vị trí hàng chờ, lịch sử đổi trạng thái
```

Module `event` và `area` theo đúng khuôn này; truy vấn PostGIS (`ST_DWithin`) nằm
trong `area.repository.ts` / `event.repository.ts`, không leo lên service, và kết quả
đổi sang `{ lat, lng }` tại mapper.

## Checklist review module backend

- [ ] Đủ 4 class lõi, không thừa class rời rạc
- [ ] Có `dto/request/` và `dto/response/`, không có DTO nằm lạc ngoài `dto/`
- [ ] Controller không trả entity, mọi đường trả đều qua mapper
- [ ] `@ApiProperty` đầy đủ, Swagger sinh ra đọc được
- [ ] Không có trường dữ liệu cá nhân lọt vào response danh sách công khai
- [ ] Enum dùng chung lấy từ `packages/shared-types`
- [ ] Phân trang dùng `CursorPage<T>`, không tự chế
- [ ] DTO gần giống nhau đã kế thừa bằng mapped type, không chép lại thủ công
- [ ] Mapped type import từ `@nestjs/swagger`, không phải `@nestjs/mapped-types`
- [ ] Ranh giới riêng tư dùng `PickType` (danh sách trắng), không `OmitType`
- [ ] Kế thừa không quá 2 tầng
- [ ] Thời gian trả về là ISO-8601 UTC

Chi tiết đầy đủ: [04-tech-stack-va-kien-truc.md](../../docs/analysis/04-tech-stack-va-kien-truc.md) §5.4.
