# Task board: discover-and-admin-overview (Tech Lead, 01/10/2026)

Brief: [brief.md](brief.md). Coordinator giữ bảng này. Khuôn: [m1-auth-hardening/task-board.md](../m1-auth-hardening/task-board.md).

**Cổng G0 (chặn toàn bộ):** chỉ bắt đầu card đầu tiên sau khi `m1-auth-hardening` đã test xong và commit. Các card dưới đây sửa lại file mà đợt đó đang để dở: `apps/web-client-side/app/_lib/api.ts` (card WC-2) và `packages/i18n/**` (card SH-3). Mọi card phải đọc file ở trạng thái đã commit của đợt kia, không đọc bản working tree hiện tại.

## 1. Quyết định kỹ thuật đã chốt (dẫn code thật)

### 1.0 Điểm lệch/bổ sung so với brief (Coordinator xác nhận)

| # | Brief nói | Code thật / quyết định | Hệ quả |
|---|---|---|---|
| L-1 | A-AC-14: validation trả "body phẳng" có `messageKey` | **Sai.** Chạy thật `curl 'localhost:3101/api/v1/events?radiusMeters=500'` trả HTTP **400** với body `{"message":["radiusMeters: errors.event.radiusRequiresCoordinates"],"error":"Bad Request","statusCode":400}`. `StandardSchemaValidationPipe` gom lỗi zod thành mảng chuỗi `"<path>: <error>"`. Chỉ guard/service mới ném body phẳng `{code,messageKey}`. Lỗi `limit=abc` cũng cùng dạng. | Giữ nguyên hành vi pipe (không thêm exception filter: đổi toàn bộ response validation là breaking cho mọi client). A-AC-14 sửa thành: HTTP **400**, `body.message` là mảng chứa đúng chuỗi `"to: errors.event.dateRangeInvalid"`. BA sửa AC. Client web không đọc được `messageKey` từ lỗi này (hàm `pick` chỉ lấy `messageKey` phẳng), nhưng Discover luôn tự tính `from`/`to` hợp lệ nên không bao giờ gặp. |
| L-2 | Map là phạm vi đợt này | Checklist M2 ghi E5-S6 (bản đồ) và S3-Demo-4 là "✂️ Cắt / hoãn" (Nhóm B hoãn phần hiển thị bản đồ). Chủ dự án đã duyệt thêm lại map, nên **không chặn**. | Coordinator cập nhật trạng thái E5-S6 và nhắc Founder (mục 8). Chỉ làm map đơn giản như brief D-11, không gom cụm. |
| L-3 | D-13 URL giữ `near=1&r=2`, D-8 không xin quyền khi mở trang, không lưu toạ độ | Hai điều này mâu thuẫn khi tải lại trang: có `near=1` nhưng không có toạ độ. **Chốt:** khi mount mà URL có `near=1` và chưa có toạ độ, hỏi `navigator.permissions.query({name:'geolocation'})`. Nếu `granted` thì lấy vị trí im lặng, không popup. Nếu không (`prompt`, `denied`, API không hỗ trợ) thì `router.replace` bỏ `near`/`r` khỏi URL, chip Near me tắt, không xin quyền. | Hành vi mới, BA xác nhận. Cần thêm một ca vào Screen lane. |
| L-4 | D-12 sự kiện đã bắt đầu thì ẩn RSVP | Với `startsAt <= now` mà người xem **đã có RSVP** (`viewerRsvpStatus !== null`): giữ nút Going/On waitlist (là lối huỷ) và vẫn hiện badge "Already started". Chỉ ẩn nút RSVP/Join waitlist khi chưa có RSVP. | BA xác nhận (doc 01 Đ15 chỉ cấm RSVP mới, không cấm huỷ). |
| L-5 | Admin dịch `areaId` bằng `@dnc/geo` hoặc API trả tên | Chọn **`@dnc/geo`** (một nguồn, đúng mẫu `apps/web-client-side/app/_lib/areas.ts`). `apps/web-admin-side/package.json` hiện chưa có `@dnc/geo` và `next.config.ts` `transpilePackages` chưa liệt kê nó, nên cần card riêng WA-0 (sửa package.json, `transpilePackages`, `pnpm-lock.yaml`). `areaId` không có trong `@dnc/geo` (ví dụ khu `seedArea()` của e2e) hiển thị `—`, không bao giờ in UUID. | Một card riêng sửa lockfile, chạy một mình trên `pnpm-lock.yaml`. |

### 1.1 `ListEventQuery` thêm `from`/`to` (`packages/contracts/src/event.ts:85-104`)
- Khai báo giống `startsAt` (`event.ts:25`) và `checkedAt` (`admin.ts`): `from: z.iso.datetime().optional()`, `to: z.iso.datetime().optional()`. `z.iso.datetime()` mặc định chỉ nhận hậu tố `Z` (không nhận offset `+07:00`), đúng với hợp đồng "ISO UTC" của D-2. Client luôn gửi `toISOString()`.
- Không dùng `z.coerce.date()`: sẽ chấp nhận chuỗi tuỳ ý (`"1"`) và làm lệch giữa API và OpenAPI.
- Thêm refine thứ hai, **chỉ khi có cả hai mốc**: `Date.parse(to) > Date.parse(from)` và `Date.parse(to) - Date.parse(from) <= EVENT_LIST_MAX_WINDOW_DAYS * 86_400_000`, với `export const EVENT_LIST_MAX_WINDOW_DAYS = 92`. `{ error: 'errors.event.dateRangeInvalid', path: ['to'] }`. Chỉ có `from` hoặc chỉ có `to` thì không bị chặn (D-4 hai mốc độc lập). Refine chồng sau refine `radiusRequiresCoordinates` có sẵn, không đụng refine cũ.
- **Mã HTTP và body khi từ chối:** 400, `{"message":["to: errors.event.dateRangeInvalid"],"error":"Bad Request","statusCode":400}` (xem L-1). `from` không phải ISO: `"from: Invalid ISO datetime"` (chuỗi mặc định của zod, không phải i18n key), cũng 400. Tester assert `status === 400` và `message` là mảng có `to: errors.event.dateRangeInvalid` cho trường hợp `to <= from` và `> 92 ngày`.
- `from`/`to` lặp (`?from=a&from=b`) thành mảng nên zod từ chối 400, đúng.

### 1.2 SQL trong `EventRepository.list` (`apps/api/src/modules/event/event.repository.ts:176-210`)
- Thêm hai điều kiện ngay sau điều kiện cursor, **giữ nguyên số thứ tự `$1..$10`**, thêm `$11`, `$12` vào cuối mảng tham số (sau `query.limit + 1`):
  `AND ($11::timestamptz IS NULL OR occ.starts_at >= $11) AND ($12::timestamptz IS NULL OR occ.starts_at < $12)`; mảng tham số thêm `query.from ?? null, query.to ?? null`. Tham số hoá, không nội suy chuỗi. `from` inclusive, `to` exclusive (D-4).
- Lọc trên `occ.starts_at` (cột của LATERAL `OCCURRENCE_JOIN`, `event.repository.ts:~55-66`), **không** đưa vào bên trong LATERAL. Lý do: `OCCURRENCE_JOIN` là hằng dùng chung cho `findOne`/`create`/`update`; sửa nó rộng hơn phạm vi. Đúng cho v1 vì mỗi sự kiện có đúng một occurrence (S-9/R-5). Khi làm sự kiện lặp, cách sửa đúng là đưa `starts_at >= $from` vào trong LATERAL (đồng thời giải quyết R-5 và cho phép index range scan). Ghi vào rủi ro, không làm đợt này, không cần Debate.
- **Index:** `EXPLAIN` trên DB dev (2 hàng) chỉ cho Seq Scan, không có ý nghĩa. Cấu trúc kế hoạch: LATERAL dò `idx_event_occurrences_event_starts (event_id, starts_at) WHERE deleted_at IS NULL`; điều kiện thời gian là Filter trên Subquery Scan, không dùng index mới. `idx_events_location` (GIST) chỉ dùng khi có `radiusMeters`, đường này không đổi (`ST_DWithin` vẫn là điều kiện duy nhất chạm cột `location`). `idx_events_area_status (area_id, status) WHERE deleted_at IS NULL` phục vụ `areaId`+`status`. **Không tạo migration, không tạo index mới** ở quy mô giai đoạn 1; ghi ngưỡng cần đo lại là mốc S3-DoD-2 (10.000 sự kiện, p95 < 200 ms). BE-1 DoD có phần đo tuỳ chọn trong `BEGIN … ROLLBACK`.
- **Cursor keyset:** `(occ.starts_at, e.id) > ($8, $9)` (`event.repository.ts:~190`) độc lập với `from`/`to`: cả ba điều kiện cùng AND. Cursor không mã hoá `from`/`to`; đúng vì client gửi lại cùng `from`/`to` của trang đầu (D-3). Không đổi `EventCursor`, không đổi `encodeCursor`/`decodeCursor`. Rủi ro: client đổi `from` giữa các trang sẽ bỏ sót/lặp hàng, và đây là trách nhiệm client (WC-2 giữ snapshot cửa sổ ở trang đầu).
- Response, controller, service, mapper của `list`: **không đổi** (`event.controller.ts:~52`, `@Public()`).

### 1.3 `GET /api/v1/admin/overview`
- **Contract** (`packages/contracts/src/admin.ts`, thêm, không đổi `AdminSystemHealth*`):
  - `ADMIN_OVERVIEW_WINDOW_DAYS = 7` (const export).
  - `AdminOverviewKpis = z.object({ totalUsers, newUsers, upcomingEvents, rsvps, posts })`, mỗi trường `z.number().int().nonnegative()` (không `nullable`, B-AC-3).
  - `AdminLatestMember = z.object({ id: z.uuid(), handle: z.string(), displayName: z.string(), trustLevel: z.number().int().min(0).max(5), createdAt: z.iso.datetime() })`.
  - `AdminLatestEvent = z.object({ id: z.uuid(), title: z.string(), areaId: z.uuid(), startsAt: z.iso.datetime(), status: EventStatus, organizer: z.object({ handle: z.string(), displayName: z.string() }) })`, với `EventStatus` import từ `./event` (một nguồn, không khai báo lại enum).
  - `AdminOverviewResponse = z.object({ windowDays: z.literal(7), generatedAt: z.iso.datetime(), kpis: AdminOverviewKpis, latestMembers: z.array(AdminLatestMember).max(5), latestEvents: z.array(AdminLatestEvent).max(5) })`, cùng các type `...T` và export qua `packages/contracts/src/index.ts` (khối `./admin` ở dòng ~14). Tên nhóm `kpis` do Tech Lead đặt (brief §10 chỉ nói "5 số đếm").
  - Không có trường `email`, `phone`, `role`, `status`, `locale`, `lat`, `lng`, `description` trong schema nào: danh sách trắng, không `.omit()`.
- **Quyền** (`packages/domain/src/permission-matrix.ts`): thêm `'analytics.platform.view'` vào union `PermissionKey` (dòng 32), thêm hằng `ANALYTICS_PLATFORM_ROLES: readonly UserRoleT[] = ['admin','super_admin']` (cùng mẫu `SYSTEM_HEALTH_ROLES`, dòng 18), thêm một phần tử `PERMISSION_MATRIX` với `docRef: 'docs/analysis/01-tac-nhan-va-phan-quyen.md §9.2'`, export hằng qua `packages/domain/src/index.ts` (dòng 14-22). Thêm vào `packages/domain/test/permission-matrix.spec.ts` (đã có `allowedRolesFor`, "never grants to member", "one entry per key", sẽ tự bao phủ khoá mới): thêm ca `allowedRolesFor('analytics.platform.view')` bằng `ANALYTICS_PLATFORM_ROLES`, không chứa `curator`/`moderator`/`member`.
- **Controller** (`apps/api/src/modules/admin/admin.controller.ts`): thêm `@Get('overview') @Roles(...allowedRolesFor('analytics.platform.view')) @SerializeOptions({ schema: envelope(AdminOverviewResponse) })`. Cùng mẫu `systemHealth` (`admin.controller.ts:22-27`); `RolesGuard` trả 403 phẳng `{code:'ROLE_NOT_ALLOWED', messageKey:'errors.auth.roleNotAllowed'}` (mẫu có sẵn ở `roles.guard.ts:41-44`). Không đổi guard toàn cục; 401 do guard JWT toàn cục.
- **Repository** (`admin.repository.ts`, `AdminRepository` hiện không nhận `PG_POOL`, cần inject `@Inject(PG_POOL) pool: Pool` theo `event.repository.ts`; `AdminModule` đã nằm trong app nên `DatabaseModule` đang global, BE-2 xác nhận trước khi thêm import): **ba truy vấn, chạy song song bằng `Promise.all`**:
  1. KPI: **một** `SELECT` gồm `now() AS generated_at` và năm scalar sub-select `(SELECT count(*) ...)::int` (cast `::int` vì `pg` trả `count` là chuỗi bigint). Cùng một `now()` làm gốc cho cả cửa sổ 7 ngày lẫn `generatedAt`, nên các KPI nhất quán với nhau. Tham số: `$1::int * interval '1 day'` với `ADMIN_OVERVIEW_WINDOW_DAYS` (không hardcode 7 trong SQL). Vị từ đúng D-16: users `deleted_at IS NULL AND anonymized_at IS NULL`; upcoming events = `events` (`deleted_at IS NULL AND status='published'`) JOIN LATERAL occurrence sớm nhất chưa xoá, `starts_at > now()`; rsvps `created_at >= now()-window AND deleted_at IS NULL AND status <> 'cancelled'` (enum có `confirmed, held, waitlisted, cancelled, attended, no_show`: `attended`/`no_show` được tính, theo đúng chữ của D-16); posts `status='visible' AND deleted_at IS NULL AND created_at >= now()-window`.
  2. Thành viên mới nhất: `users u JOIN profiles p ON p.user_id=u.id WHERE u.deleted_at IS NULL AND u.anonymized_at IS NULL ORDER BY u.created_at DESC, u.id DESC LIMIT 5`. Chọn tường minh `u.id, p.handle, p.display_name, u.trust_level, u.created_at`; **không `SELECT *`**.
  3. Sự kiện mới nhất: `events e JOIN LATERAL (occurrence sớm nhất) occ JOIN users/profiles organizer WHERE e.deleted_at IS NULL AND e.status <> 'draft' ORDER BY e.created_at DESC, e.id DESC LIMIT 5`. Chọn `e.id, e.title, e.area_id, occ.starts_at, e.status, op.handle, op.display_name`.
  - Lý do một-KPI-query-và-chạy-song-song: dùng tối đa **3** kết nối pool mỗi request (pool mặc định 10; chạy 7 truy vấn song song sẽ chiếm 7 kết nối chỉ vì vài admin mở trang). Không bọc transaction REPEATABLE READ: lệch vài ms giữa ba truy vấn là chấp nhận được cho số liệu hiển thị (D-19 không cache).
  - **Trùng SQL "occurrence sớm nhất":** SQL LATERAL phải được lặp trong `AdminRepository`, vì `OCCURRENCE_JOIN` là hằng riêng của module `event` và module không import repository của nhau. Ghi comment trỏ về `event.repository.ts` ("same predicate as Discover's upcoming set"). Không export hằng từ `event` (giữ biên module).
  - Không index mới: bảng nhỏ ở beta (R-7). Ngưỡng xem lại: khoảng 50.000 users thì thêm `users (created_at DESC) WHERE deleted_at IS NULL`. Ghi follow-up, không làm đợt này.
- **Service:** `AdminService.overview()` gọi `repo.overview()` (Promise.all nằm trong repository để service không viết SQL) rồi mapper. Không log, không ghi `audit_log` (D-22, bảng chưa có).
- **Mapper** (`admin.mapper.ts`, hàm thuần, liệt kê từng trường, không spread): `toAdminOverviewResponse(rows)`; `Date` thành `.toISOString()`; `windowDays` lấy từ hằng.
- **`@SerializeOptions`:** `StandardSchemaSerializerInterceptor` cắt theo `envelope(AdminOverviewResponse)` (cùng cách `systemHealth`) là lớp phòng thủ thứ hai; mapper đã liệt kê từng trường là lớp thứ nhất. e2e kiểm cấm khoá (mục 5).

### 1.4 Hàm preset ngày: đặt ở `packages/domain`
- File mới `packages/domain/src/event-window.ts`, export qua `packages/domain/src/index.ts`. Lý do chọn domain, không chọn `apps/web-client-side/app/_lib/datetime.ts`: hàm thuần, không phụ thuộc framework, mobile sẽ dùng lại (brief §9), và web-client đã phụ thuộc `@dnc/domain`. Web-client chưa có vitest (`apps/web-client-side/package.json` không có script `test`), còn domain đã có (`packages/domain/test/*.spec.ts`, `vitest run`), nên unit test chỉ chạy được ở domain.
- Chữ ký: `export type DiscoverWhen = 'upcoming'|'today'|'weekend'|'week'; export interface EventWindow { from: string; to: string | null }; export function resolveEventWindow(when: DiscoverWhen, now: Date): EventWindow`. Trả ISO UTC bằng `toISOString()`.
- **Cài đặt bằng số học cố định, không dùng `Intl`:** `APP_UTC_OFFSET_MS = 7*3_600_000` (Đà Nẵng không có DST). `local = now + offset`; `localMidnight = Math.floor(local / DAY) * DAY` (xử lý bằng các trường UTC); `dow = new Date(local).getUTCDay()` (0=CN). `daysToNextMonday = ((8 - dow) % 7) || 7` (CN→1, Thứ Hai→7, Thứ Bảy→2). `weekEnd = localMidnight + daysToNextMonday*DAY - offset`. `upcoming`: `{from: now, to: null}`. `today`: `{from: now, to: localMidnight + DAY - offset}`. `week`: `{from: now, to: weekEnd}`. `weekend`: `from = (dow===0||dow===6) ? now : localMidnight + (6-dow)*DAY - offset`, `to = weekEnd`. Kiểm ví dụ brief D-5: Thứ Năm 2026-10-01 10:00 ICT cho weekend `2026-10-02T17:00:00.000Z` đến `2026-10-04T17:00:00.000Z`. Cửa sổ luôn < 92 ngày nên không bao giờ vi phạm refine của API.
- Không dùng `datetime.ts` hiện có của web-client cho việc này: `isWeekend` ở Home (`feed-stream.tsx:20-25`) dùng `getDay()` theo múi giờ trình duyệt (S-2, R-9), không được tái sử dụng.
- **Unit test** `packages/domain/test/event-window.spec.ts` (xem DoD SH-2): Thứ Năm, Thứ Bảy, Chủ Nhật, Thứ Hai 00:00:00.000 ICT, Thứ Sáu 23:59:59.999 ICT, đúng nửa đêm `2026-10-03T17:00:00.000Z`, giờ máy ở múi khác (`TZ` đặt trong test không được ảnh hưởng kết quả).

### 1.5 Web-client Discover
- **Vị trí và cấu trúc** (`apps/web-client-side/app/(shell)/discover/`; `(shell)/_components/` đã chứa `event-card.tsx`, `feed-stream.tsx`, `location-picker.tsx`, EventCard tái dùng bằng import tương đối):
  - `page.tsx` (server component mỏng): bọc `<Suspense fallback={<DiscoverSkeleton/>}><DiscoverScreen/></Suspense>`. **Bắt buộc có Suspense** vì `useSearchParams` ở client component trong App Router sẽ làm cả trang bailout CSR nếu thiếu.
  - `_components/discover-screen.tsx` (client): đọc/ghi URL, sở hữu toàn bộ trạng thái nghiệp vụ.
  - `_components/discover-filters.tsx` (chip khu vực, chip ngày, Near me + bán kính, nút List/Map).
  - `_components/discover-list.tsx` (thẻ, "Show more", lỗi tải thêm).
  - `_components/discover-states.tsx` (skeleton, lỗi, 3 biến thể rỗng).
  - `_components/discover-map.tsx` (client, MapLibre; **WC-2 tạo bản gốc tối thiểu để import biên dịch được, WC-3 thay thế**; hai card nối tiếp, không song song).
  - `_components/use-discover-query.ts` (hook: fetch, huỷ phản hồi cũ, phân trang, khử trùng).
  - `_components/use-near-me.ts` (hook: geolocation).
  - `_components/discover-url.ts` (hàm thuần: parse và serialize query URL).
- **Trạng thái ↔ URL:** URL là **nguồn sự thật duy nhất** của bộ lọc (`area`, `when`, `near`, `r`, `view`); không giữ bản sao `useState` của các giá trị này. Ghi bằng `router.replace(\`${pathname}${qs}\`, { scroll: false })` (replace, không push, để mỗi chip bấm không làm bẩn lịch sử Back). Tham số mặc định thì bỏ khỏi URL (D-13). **Phân tích URL phải chịu rác:** `area` không thuộc `AREA_SLUGS` thành `all`; `when` ngoài `today|weekend|week` thành `upcoming`; `r` ngoài `{1,2,5,10,15}` thành 2 (kẹp, không throw); `view` khác `map` thành `list`. Toạ độ chỉ nằm trong `useState`/ref của `use-near-me`, **không vào URL, storage, log**.
- **Fetch và huỷ phản hồi cũ (A-AC-12):** mỗi lần bộ lọc đổi: `abort()` controller cũ, tạo `AbortController` mới, tăng `requestSeq` ref; khi phản hồi về, nếu `seq` không còn là mới nhất thì bỏ. Hai lớp song song (abort tiết kiệm mạng; `requestSeq` bảo vệ khi `abort` không kịp). Lỗi `AbortError` không bao giờ vào trạng thái lỗi. Cửa sổ `{from,to}` tính **một lần ở trang đầu** bằng `resolveEventWindow(when, new Date())` rồi giữ trong state của đợt tải đó; "Show more events" tái dùng đúng snapshot (D-3, đồng thời đảm bảo cursor đúng). Mỗi lần **bộ lọc đổi hoặc Retry** thì tính lại cửa sổ mới. Tab mở qua nửa đêm nên vẫn đúng ở lần lọc kế tiếp.
- **`listEvents` trong `_lib/api.ts`:** đổi chữ ký thành `listEvents(arg: number | ListEventsParams = 20, signal?: AbortSignal)`; `number` giữ hành vi cũ cho Home (`feed-stream.tsx:~44`, `listEvents(50)`) nên **Home không phải sửa**. `ListEventsParams = { limit?, cursor?, areaId?, status?, from?, to?, lat?, lng?, radiusMeters? }`, dựng bằng `URLSearchParams`, bỏ tham số `undefined`. `call()` và `CallInit` thêm `signal?: AbortSignal`, truyền vào `fetch`, và khi `fetch` ném lỗi mà `init?.signal?.aborted` thì **ném lại lỗi abort** (không bọc thành `ApiError(0,'OFFLINE')`, nếu không Retry sẽ hiện nhầm "mất mạng"). Lần replay sau refresh token giữ nguyên `signal`. Discover luôn gửi `status=published`, `limit=20`, `from`.
- **Rule "đã bắt đầu" trong `EventCard`** (`event-card.tsx:137-162`): thêm `const now = useNow()` (hook mới `app/_lib/use-now.ts`, `useState(Date.now)` + `setInterval` 30 s, dọn interval khi unmount; không gọi `Date.now()` trực tiếp trong render để tránh nhấp nháy hydration). `started = Date.parse(event.startsAt) <= now`. Theo L-4: `started && mine === null` thì thay nút RSVP/Join waitlist bằng `<Badge tone="neutral">{t('event.card.started')}</Badge>`; `started && mine !== null` thì giữ nút Going/On waitlist và cũng hiện badge. Link "Details" luôn giữ. Thay đổi này áp dụng cho cả Home (đã chấp nhận, D-12), nên card WC-1 phải có kiểm hồi quy Home.
- **Map (WC-3):** `discover-screen.tsx` dùng `const DiscoverMap = dynamic(() => import('./discover-map').catch(() => ({ default: MapUnavailable })), { ssr: false, loading: () => <MapSkeleton/> })`; `.catch` trên import bắt lỗi tải chunk (A-AC-13: "MapLibre không tải được thì thông báo + nút Show list, không trắng trang"). Chỉ nạp khi `view=map`. Tái dùng thiết lập MapLibre từ `location-picker.tsx` bằng cách **trích** sang file mới `(shell)/_components/maplibre-setup.ts`: export `OSM_STYLE`, `MARKER_COLOR`, `initMapLibreWorker()` (gọi `setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')` một lần, idempotent). `location-picker.tsx` đổi sang import từ file này (không còn bản sao thứ hai của style/màu/worker; card WC-3 là chủ của cả hai file và phải kiểm lại composer bài đăng, vì `location-picker` dùng trong `post-composer.tsx`). `MARKER_COLOR` vẫn là literal duy nhất được phép (đã có comment lý do trong file gốc; chuyển comment theo). Bản đồ: khung đầu `DA_NANG_CENTER`, `fitBounds` mọi marker đã tải (kể cả sau "Show more"), không tự tìm lại khi kéo. Không dùng sự kiện `error` chung của MapLibre để chuyển sang trạng thái hỏng (lỗi tile lẻ sẽ làm trắng bản đồ đang tốt); chỉ coi là hỏng khi `new Map(...)` ném lỗi (WebGL không có) hoặc style không nạp được. Nhiều sự kiện cùng toạ độ: gom trong một popup. Popup dựng bằng DOM node `textContent` (không `setHTML` với chuỗi người dùng nhập, tránh XSS từ `title`).
- **Geolocation (`use-near-me.ts`):** chỉ gọi khi bấm. `navigator.geolocation.getCurrentPosition(ok, fail, { timeout: 10_000, maximumAge: 60_000, enableHighAccuracy: false })`. `PERMISSION_DENIED` thành key `discover.nearMe.denied`; `POSITION_UNAVAILABLE`/`TIMEOUT`/không hỗ trợ thành `discover.nearMe.unavailable`; cả hai: Near me không bật, danh sách không đổi, thông báo inline `role="status"`, không popup chặn. Toạ độ làm tròn `Math.round(v*1000)/1000` ngay trong callback, trước khi vào state. Khôi phục khi tải lại theo L-3.
- **Yêu cầu thiết kế (ghi vào DoD WC-2/WC-3, theo `modern-ui-design`):**
  - Chốt một hướng thẩm mỹ: `warm-community`, nhịp thoáng, đọc được một tay ngoài nắng, vì Discover là màn lõi của Giai đoạn 1; chiều bám theo token sẵn có của `@dnc/tokens` qua class ngữ nghĩa (`bg-surface`, `text-fg`, `text-fg-muted`, `border-line`, `bg-accent`, `text-on-accent`, `bg-danger-subtle`...), tái dùng `Chip`/`ChipRow`, `Badge`, `Button`, `Card`, `EmptyState`, `Skeleton` trong `app/_components/ui/`. **Cấm hex/màu tự đặt** (ngoại lệ duy nhất `MARKER_COLOR` của MapLibre).
  - Đối chiếu mockup `docs/mockups/web-discover-mockup.html`: W-10 (`/discover`), W-12 (bộ lọc), W-13 (map). Layout: chip cuộn ngang trong chính hàng chip (`ChipRow`, không cuộn ngang trang); desktop có chỗ cho bộ lọc, mobile 1 cột; vùng bấm tối thiểu 44 px (`Chip` đã có `min-h-11`); Map cao dùng được ở 390 px.
  - Loading bằng `Skeleton` có hình dạng thẻ (không chữ "Loading..." trơ); lỗi và rỗng bằng `EmptyState` có hành động; ba biến thể rỗng có chuỗi khác nhau (A-AC-11).
  - Mọi chuỗi (kể cả `aria-label`, popup, thông báo vị trí) qua `t()`; chuỗi VI dài nhất không bị cắt; dòng `datetime.timeZoneNote` hiện.
  - Một chuyển động có chủ ý (ví dụ reveal danh sách lần tải đầu) tốt hơn nhiều hiệu ứng hover; tôn trọng `prefers-reduced-motion`.

### 1.6 Web-admin Overview
- **Cấu trúc** (`apps/web-admin-side/app/(console)/`): `page.tsx` (giữ `OverviewPage`, gọi `OverviewScreen`), `_components/overview/overview-screen.tsx` (client, điều phối), `kpi-grid.tsx`, `overview-table.tsx` (bảng dùng chung cho hai danh sách, cuộn trong khung `overflow-x-auto`, không cuộn cả trang, B-AC-11), `system-status-card.tsx`. Thêm `app/_lib/areas.ts` (nhỏ: `findAreaName(areaId, locale)` dựa `@dnc/geo`, trả `undefined` nếu không có, caller hiện `—`). Tái dùng `Card`, `Badge`, `Button`, `EmptyState`, `Skeleton` (`app/_components/ui/index.ts`).
- **Ẩn khối theo role:** **không** dùng `RequireRole` (nó `router.replace('/')` khi bị từ chối, còn đây vốn là `/`, và curator/moderator phải vẫn thấy tiêu đề + lời chào). Dùng `useAuth().user.role` và `allowedRolesFor('analytics.platform.view').includes(role)` (cùng `@dnc/domain` làm nguồn, không giữ danh sách vai riêng). Nếu không có quyền: render tiêu đề + `admin.overview.body` + dòng nhỏ `admin.overview.state.noAccess`, và **không gọi** `/admin/overview` lẫn `/admin/system/health` (hai endpoint cùng giới hạn admin/super_admin; gọi sẽ ra 403 thừa). Chờ `loading` của auth xong mới quyết định (tránh gọi API khi chưa biết vai).
- **Gọi song song, độc lập:** hai state riêng (`overview`, `health`), mỗi cái `loading|error|ready`, khởi động bằng hai promise song song; hỏng một khối không làm sập khối kia (B-AC-5). Retry của thẻ lỗi KPI chỉ gọi lại overview; khi mất mạng toàn bộ (B-AC-6) hiển thị hai thẻ lỗi, mỗi thẻ có Retry riêng (không có nút "retry cả hai" để tránh vòng lặp tải). `_lib/api.ts` thêm `getAdminOverview(): Promise<AdminOverviewResponseT>` (mẫu `getSystemHealth`, `api.ts:~196`).
- **Khối hệ thống:** tóm tắt, tái dùng key `admin.health.state.allUp/degraded`, `admin.health.dependency.*` có sẵn: badge + tên dịch vụ down + link `/system-health` (key `admin.overview.system.open`). Hỏng riêng thì `admin.overview.system.unavailable`.
- **Giờ VN (D-21):** tái dùng `formatCheckedAt` (`app/_lib/datetime.ts`, `DD/MM/YYYY, HH:mm (UTC+7)`) cho `generatedAt`, `startsAt`, `createdAt`; không viết lại hàm định dạng. Trạng thái sự kiện dùng `event.status.*`: **lưu ý** catalog có cả `pendingReview` (camelCase) và `pending_review` (snake) và `taken_down`/`takenDown`; enum API trả snake_case, nên map `status` sang key bằng bảng tường minh `Record<EventStatusT, MessageKey>` (dùng `event.status.pending_review`, `taken_down`, `published`, `suspended`, `cancelled`, `draft`), không nội suy chuỗi động (sẽ gãy `MessageKey` và hiện key thô).
- **XSS:** `displayName`, `handle`, `title` hiển thị bằng React text node, không `dangerouslySetInnerHTML` (B-AC-8).
- **Yêu cầu thiết kế:** hướng `clean-operational` (mật độ dày, một màu nhấn), bám token sẵn có của admin (`bg-surface`, `text-fg`, `text-fg-muted`...) và `Card`/`Badge`; lưới KPI 1 cột mobile, 2-3 cột `sm`/`lg`; số KPI to đậm, nhãn nhẹ (tương phản độ đậm); không hex.

### 1.7 i18n
- **Một owner duy nhất cho `packages/i18n/**`: card SH-3** (web-client-agent, reviewer web-admin-agent), chạy **trước** mọi card UI. Thêm toàn bộ key của brief §14 vào `en.json`, `vi.json`; chạy `pnpm --filter @dnc/i18n gen` để sinh `src/message-keys.ts` (không sửa tay); `pnpm --filter @dnc/i18n test` (`catalog.spec.ts` kiểm en/vi cùng tập key, union khớp, không chuỗi rỗng).
- **Va chạm key cần xử lý (đọc `en.json` thật):** (a) `discover.map.aria` hiện là "Map of the six launch areas": **sửa nội dung** thành "Map of {count} events" / "Bản đồ {count} sự kiện" (brief ghi "sửa nội dung"); (b) `discover.map.placeholderNote` xoá; (c) `blank.discover.title/body` xoá. `blank.*` khác **giữ** (my-events, notifications, not-found vẫn dùng `BlankScreen`: `grep` xác nhận `blank-screen.tsx` còn 3 nơi gọi khác), nên **không** xoá `blank-screen.tsx`; (d) `discover.empty.title/description/clear` (leaf có sẵn) tiếp tục là biến thể "không khớp bộ lọc"; thêm `discover.empty.noData.*` và `discover.empty.nearMe.*` làm nhánh con của `discover.empty` (không đụng tên leaf cũ); (e) `discover.results.countOne` là anh em của `discover.results.count`.
- **Xoá `blank.discover.*` an toàn:** `grep -rl "blank.discover"` ngoài `node_modules` chỉ trả `packages/i18n/src/message-keys.ts` và `apps/web-client-side/app/(shell)/discover/page.tsx`. Thứ tự đúng: SH-3 **chỉ thêm** key, **chưa xoá** `blank.discover.*`/`placeholderNote` (nếu xoá trước, `discover/page.tsx` hiện tại sẽ lỗi type vì còn tham chiếu key đã mất). WC-2 (thay trang) xong thì card **SH-4** (cùng owner SH-3, chạy ngay sau WC-2) mới xoá ba key đó, regenerate, chạy catalog test. Hai card i18n tách nhau chỉ để giữ typecheck xanh ở từng bước.
- Chuỗi mới `admin.overview.*` là của admin nhưng cũng nằm trong SH-3 (cùng owner); WA-1 tuyệt đối không sửa `packages/i18n`. Nếu WA-1/WC-2/WC-3 cần thêm key phát sinh, phải xin owner SH-3 (chạy một card i18n nối tiếp), không tự sửa.

### 1.8 Test
- **e2e API (vitest, thật Postgres; `createActor(app, {role})` đã nhận `UserRoleT` đủ `curator`/`moderator`/`admin`/`super_admin`, `harness.ts:86`)**: tệp mới để tránh va chạm với `event.e2e.spec.ts`: `apps/api/e2e/modules/event/event-list-window.e2e.spec.ts` và `apps/api/e2e/modules/admin/admin-overview.e2e.spec.ts`.
- **Quy tắc cô lập:** các spec chạy song song theo từng file nên DB dùng chung; mọi sự kiện seed dùng `seedArea()` riêng và **truy vấn kèm `areaId`** để không lẫn dữ liệu spec khác, đặt thời điểm cố định ở cửa sổ tương lai xa (ví dụ 2031) để không phụ thuộc "bây giờ". Muốn có sự kiện đã bắt đầu thì tạo bình thường rồi `UPDATE event_occurrences SET starts_at` về quá khứ bằng pool riêng.
- **Overview đếm toàn hệ thống nên không thể assert số tuyệt đối** (D-20, và các spec khác đang tạo user song song). Quy tắc: (a) so khớp với **truy vấn đếm độc lập viết ngay trong spec** (vị từ D-16 viết lại bằng SQL thẳng, đóng vai oracle) bằng `expect.poll(..., { timeout: 5000, interval: 200 })` để chịu được spec khác ghi xen vào; (b) ca đúng-sai biên (6 ngày 23 giờ so với 7 ngày 1 giờ, xoá mềm, ẩn danh, draft, `hidden`/`removed`) seed bằng actor của chính spec rồi `UPDATE users SET created_at = now() - interval ...`/`deleted_at`, kiểm ở **danh sách mới nhất** (thấy hay không thấy đúng hàng seed, vì danh sách là dữ liệu tất định) và ở KPI bằng oracle (a); (c) dùng bất đẳng thức `>=` cho phần chênh lệch "đã thêm" khi cần. Dọn dẹp qua `seedArea().cleanup` đã xoá theo actor.
- **Playwright admin** (`apps/web-admin-side/e2e/overview.spec.ts`, dùng `loginAs` và `ACCOUNTS` có sẵn: `member`/`curator`/`admin`): không số tuyệt đối. Bắt response `/api/v1/admin/overview` bằng `page.waitForResponse` rồi so các số trên màn hình với JSON vừa trả. Giả lập 500 bằng `page.route` (đúng cách `system-health.spec.ts` đang làm), giả lập mất mạng bằng `route.abort('connectionrefused')`. Assert `curator`: không có request tới `/admin/overview` (đếm bằng `page.on('request')`). Kiểm VI, kiểm không có chuỗi `admin.overview` thô trong `body.innerText`. Cổng mặc định của config là 3002 (`PW_BASE_URL`); môi trường này chạy `PW_BASE_URL=http://localhost:3012`.
- **Web-client:** chưa có Playwright (không có thư mục `e2e`, không có script test): Screen lane chạy tay, Chromium + WebKit, bám bảng ca ở mục 5. Việc dựng Playwright cho web-client nằm ngoài đợt này (checklist TG-M2-5, đã có mục riêng).
- **Unit:** `packages/domain/test/event-window.spec.ts` và `permission-matrix.spec.ts` (mục 1.3/1.4); `packages/contracts/test/event-list-query.spec.ts` (refine `from`/`to`, đúng các biên).

## 2. Hợp đồng

### 2.1 API
| Endpoint | Auth | Request | Response | Lỗi |
|---|---|---|---|---|
| `GET /api/v1/events` (đổi) | `@Public()` | thêm `from?`, `to?` (ISO UTC dạng `Z`, `from` inclusive, `to` exclusive, lọc trên `starts_at` của occurrence hiển thị). Có cả hai thì `to > from` và `to - from <= 92 ngày`. Kết hợp AND với `areaId`, `status`, `lat/lng/radiusMeters`, `cursor`. | không đổi (`{success,data:{items,nextCursor}}`) | HTTP **400**, `message: ["to: errors.event.dateRangeInvalid"]` (L-1). `from` sai định dạng: 400 `message: ["from: ..."]`. |
| `GET /api/v1/admin/overview` (mới) | JWT + `@Roles(...allowedRolesFor('analytics.platform.view'))` = `admin`, `super_admin` | không có tham số | `{success:true, data: AdminOverviewResponse}` | 401 không token; 403 `{code:'ROLE_NOT_ALLOWED', messageKey:'errors.auth.roleNotAllowed'}` cho `member`/`curator`/`moderator` |

### 2.2 Dữ liệu
Không có migration, không đổi schema, không tạo index (mục 1.2, 1.3). Kế hoạch quay lui = revert commit (không có thay đổi trạng thái DB để hoàn tác). Bảng và cột chạm đọc: `users` (`deleted_at`, `anonymized_at`, `created_at`, `trust_level`), `profiles` (`handle`, `display_name`), `events`, `event_occurrences`, `rsvps`, `posts`.

### 2.3 UI và i18n
Key theo brief §14 (một owner: SH-3, xoá ở SH-4). Trạng thái UI Discover: `loading` (skeleton), `ready`, `empty` (3 biến thể: `noData`, `noMatch`, `nearMe`), `error` (trang đầu), `loadMoreError` (giữ thẻ đã tải), `mapUnavailable`, `mapEmpty`, `nearMe.locating/denied/unavailable`. Trạng thái Overview: mỗi khối (KPI+bảng, hệ thống) độc lập `loading|ready|empty|error`; vai không đủ quyền: `noAccess`.

## 3. Task card

> Quy ước chung mọi card: đọc file ở trạng thái đã commit của đợt `m1-auth-hardening` (G0). Comment trong code bằng tiếng Anh theo `.agent/rules/code-documentation.md`. Không sửa file ngoài `Allowed files`. Lệnh xác minh chạy từ gốc repo.

### SH-1: Hợp đồng `packages/contracts`
ID: SH-1 · Title: `from`/`to` cho `ListEventQuery` và `AdminOverviewResponse`
Owner Agent: backend-agent (Tech Lead đã duyệt hợp đồng)
Goal: Chốt hai hợp đồng trên zod trước mọi card dùng chúng.
Scope: mục 1.1 (phần contracts) và 1.3 (phần Contract).
Allowed files: `packages/contracts/src/event.ts`, `packages/contracts/src/admin.ts`, `packages/contracts/src/index.ts`, `packages/contracts/test/event-list-query.spec.ts` (mới)
Do not edit: mọi file khác, đặc biệt `packages/domain/**`, `packages/i18n/**`, `apps/**`.
Inputs: mục 1.1, 1.3, 2.1.
Dependencies: G0.
Acceptance slice: `ListEventQuery.parse` chấp nhận `from`/`to` hợp lệ, từ chối `to <= from`, cửa sổ 93 ngày, `from` không ISO, `from` có offset `+07:00`; chấp nhận cửa sổ đúng 92 ngày; chỉ `from` hoặc chỉ `to` thì hợp lệ; lỗi `to <= from` có `issues[].message === 'errors.event.dateRangeInvalid'` và `path` là `['to']`. Refine `radiusRequiresCoordinates` vẫn hoạt động. `AdminOverviewResponse` parse được một mẫu đầy đủ, từ chối `kpis.totalUsers` âm, `latestMembers` > 5 phần tử, `windowDays !== 7`, và khoá thừa `email` bị **bỏ** khi parse (zod object mặc định strip) trong `latestMembers[0]`.
Test lane: unit (zod thuần, không cần DB). Bỏ integration vì chưa có endpoint.
Definition of Done: code + test: `pnpm --filter @dnc/contracts test` xanh; `pnpm --filter @dnc/contracts typecheck` xanh; `pnpm -r typecheck` xanh (kiểm không làm hỏng app/mobile nào dùng contracts). Export `EVENT_LIST_MAX_WINDOW_DAYS`, `ADMIN_OVERVIEW_WINDOW_DAYS`, các schema và type `...T` qua `index.ts`. Không có `import` mới ngoài `zod`. Docs: comment tiếng Anh giải thích vì sao `from` inclusive, `to` exclusive, vì sao giới hạn 92 ngày.
Risk: đổi `ListEventQuery` ảnh hưởng OpenAPI và mọi client; `from`/`to` đều tuỳ chọn nên không breaking. Mobile không bị EAS rebuild (chỉ thêm kiểu).

### SH-2: `packages/domain` (preset ngày và khoá quyền)
ID: SH-2 · Title: `resolveEventWindow` và `analytics.platform.view`
Owner Agent: backend-agent
Goal: Hàm preset ngày dùng chung web/mobile; khoá quyền mới.
Scope: mục 1.3 (Quyền) và 1.4.
Allowed files: `packages/domain/src/event-window.ts` (mới), `packages/domain/src/permission-matrix.ts`, `packages/domain/src/index.ts`, `packages/domain/test/event-window.spec.ts` (mới), `packages/domain/test/permission-matrix.spec.ts`
Do not edit: `packages/contracts/**`, `packages/i18n/**`, `apps/**`.
Inputs: mục 1.3, 1.4; ví dụ D-5 và A-AC-3/A-AC-6 của brief.
Dependencies: SH-1 (nối tiếp, cùng nhóm "package dùng chung": contracts trước domain).
Acceptance slice: bảng ca bắt buộc của `resolveEventWindow` (now là ICT, so ISO UTC): Thứ Năm 2026-10-01 10:00 → weekend `2026-10-02T17:00:00.000Z`→`2026-10-04T17:00:00.000Z`, week `now`→`2026-10-04T17:00:00.000Z`, today `now`→`2026-10-01T17:00:00.000Z`; Chủ Nhật 2026-10-04 15:00 → week và weekend cùng `from=now`, `to=2026-10-04T17:00:00.000Z`; Thứ Bảy 2026-10-03 09:00 → weekend `from=now`; Thứ Hai 2026-10-05 00:00:00.000 ICT (= `2026-10-04T17:00:00.000Z`) → week kết thúc `2026-10-11T17:00:00.000Z` (không lùi về tuần cũ); Thứ Sáu 23:59:59.999 ICT → today `to` đúng nửa đêm kế; đúng `2026-10-03T17:00:00.000Z` (Thứ Bảy 00:00 ICT) → weekend `from=now`; `upcoming` luôn `to=null`. Kết quả không đổi khi `process.env.TZ` đặt khác (`America/New_York`, `Pacific/Auckland`). `allowedRolesFor('analytics.platform.view')` bằng `['admin','super_admin']`, không chứa `member`, `curator`, `moderator`.
Test lane: unit. Bỏ integration/screen vì là hàm thuần.
Definition of Done: `pnpm --filter @dnc/domain test` xanh (gồm test `PERMISSION_MATRIX` hiện có: không trùng khoá, không cấp cho `member`, có `docRef`); `pnpm --filter @dnc/domain typecheck` và `pnpm -r typecheck` xanh. Hàm không import `Intl`/`Date.prototype.toLocale*`. Hằng `ANALYTICS_PLATFORM_ROLES` được export. Comment tiếng Anh nêu "no DST, fixed UTC+7".
Risk: sai biên Thứ Hai/Chủ Nhật là lỗi lệch múi giờ nửa đêm (đúng rủi ro của dự án); mitigation là bảng ca ở trên.

### SH-3: `packages/i18n` thêm key
ID: SH-3 · Title: key Discover, Admin Overview, lỗi, badge
Owner Agent: web-client-agent (owner duy nhất `packages/i18n/**`; reviewer: web-admin-agent đọc nhóm `admin.overview.*`)
Goal: Mọi chuỗi mới có mặt EN+VI trước khi card UI chạy.
Scope: mục 1.7.
Allowed files: `packages/i18n/messages/en.json`, `packages/i18n/messages/vi.json`, `packages/i18n/src/message-keys.ts` (sinh bằng script)
Do not edit: mọi file khác. **Chưa xoá** `blank.discover.*` (SH-4 làm).
Inputs: brief §14 + va chạm key ở 1.7.
Dependencies: G0 (card này sửa lại file mà đợt `m1-auth-hardening` đang để dở: `packages/i18n/**`); chạy song song được với SH-1/SH-2 (tập file rời nhau).
Acceptance slice: toàn bộ key bảng brief §14 có trong cả hai file; `discover.map.aria` đã đổi nội dung thành có `{count}`; VI viết có dấu đầy đủ.
Test lane: unit (catalog test). Screen bỏ vì không có UI.
Definition of Done: `pnpm --filter @dnc/i18n gen && pnpm --filter @dnc/i18n test` xanh (en/vi cùng khoá, union khớp, không chuỗi rỗng); `pnpm --filter @dnc/web-client typecheck` và `pnpm --filter @dnc/web-admin typecheck` xanh (chưa dùng key mới nhưng không được làm gãy chỗ cũ: `discover.map.aria` đổi nội dung nên grep chỗ dùng `discover.map.aria`, kết quả phải là không có chỗ dùng hoặc chỗ dùng không phụ thuộc nội dung). Báo cáo danh sách khoá thêm và danh sách khoá sửa.
Risk: thiếu bản dịch EN/VI (test bắt); `{km}`, `{count}`, `{time}` phải khớp tên placeholder ở card UI.

### BE-1: API `from`/`to` trong `GET /events`
ID: BE-1 · Title: Lọc thời gian cho khám phá sự kiện
Owner Agent: backend-agent
Goal: `EventRepository.list` hỗ trợ `from`/`to` (mục 1.2).
Scope: chỉ nhánh `list`; controller/service/mapper không đổi.
Allowed files: `apps/api/src/modules/event/event.repository.ts`, `apps/api/e2e/modules/event/event-list-window.e2e.spec.ts` (mới)
Do not edit: `packages/**`, `apps/api/src/modules/event/event.controller.ts`, `event.service.ts`, `event.mapper.ts`, `event.e2e.spec.ts`, `findOne`/`create`/`update` trong repository (chỉ thêm điều kiện ở `list`), `OCCURRENCE_JOIN`.
Inputs: mục 1.1, 1.2, 2.1; `ListEventQueryT` từ SH-1.
Dependencies: SH-1, G0.
Acceptance slice (e2e, mỗi ca là một `it`): (1) `from` inclusive: sự kiện đúng `starts_at = from` có mặt; (2) `to` exclusive: sự kiện đúng `starts_at = to` vắng; (3) chỉ `from`, chỉ `to`; (4) kết hợp `areaId` + `from`/`to` và kết hợp `lat/lng/radiusMeters` + `from`/`to` (AND); (5) phân trang `limit=2` trên 3 sự kiện khớp: hai trang, không trùng `id`, `nextCursor` cuối là `null`, cùng `from`/`to` ở cả hai lần gọi; (6) không truyền `from`/`to` thì hành vi cũ (sự kiện quá khứ vẫn trả; mô phỏng Home); (7) `status=published` loại `draft` của chính viewer, loại sự kiện `cancelled`, loại sự kiện đã bắt đầu 1 giờ trước khi gửi `from=now` (A-AC-7); (8) guest không token vẫn 200 (A-AC-15) và không thấy `draft` của người khác; (9) từ chối đúng 400 với `message` chứa `to: errors.event.dateRangeInvalid` cho `to < from`, `to == from`, cửa sổ 93 ngày; chấp nhận đúng 92 ngày; `from` không ISO (có offset `+07:00`, chuỗi `abc`) 400; (10) OpenAPI document (`createOpenApiDocument`) mô tả `from`/`to` trong tham số query của `GET /api/v1/events`.
Test lane: integration (thật Postgres). Unit bỏ vì không có logic thuần mới ngoài SQL. Screen bỏ vì chưa có UI.
Definition of Done: `pnpm --filter @dnc/api exec vitest run e2e/modules/event/event-list-window.e2e.spec.ts` xanh; `pnpm --filter @dnc/api test` toàn bộ xanh (hồi quy `event`, `rsvp`, `post`...); `pnpm --filter @dnc/api typecheck` xanh. Tham số SQL vẫn là `$n` (không nội suy). Phần đo hiệu năng (tuỳ chọn, không chặn): trong `BEGIN … ROLLBACK` seed 5.000 sự kiện + occurrence rồi `EXPLAIN (ANALYZE, BUFFERS)` truy vấn `list` có `areaId`+`from`+`to` và có `radiusMeters`; dán kết quả vào báo cáo, ghi rõ có dùng `idx_events_location` (GIST) cho nhánh bán kính hay không. Tài liệu: comment ở `list` cập nhật tiếng Anh về `from`/`to` và về R-5.
Risk: truy vấn địa lý GIST không đổi (kiểm bằng EXPLAIN tuỳ chọn); đồng thời RSVP/capacity không chạm; múi giờ: API chỉ nhận UTC; sự kiện lặp: nêu R-5 trong comment; lỗi thường gặp là đổi nhầm số thứ tự `$n` (giữ `$1..$10`, thêm `$11`, `$12`).

### BE-2: API `GET /admin/overview`
ID: BE-2 · Title: Tổng quan quản trị: endpoint, repository, mapper
Owner Agent: backend-agent
Goal: Endpoint mục 1.3.
Scope: module `admin`.
Allowed files: `apps/api/src/modules/admin/admin.controller.ts`, `admin.service.ts`, `admin.repository.ts`, `admin.mapper.ts`, `admin.module.ts` (chỉ nếu cần thêm import), `apps/api/e2e/modules/admin/admin-overview.e2e.spec.ts` (mới)
Do not edit: `packages/**`, `apps/api/src/modules/event/**` (không import hằng của event), `admin-system-health.e2e.spec.ts`, guard toàn cục.
Inputs: mục 1.3, 2.1; `AdminOverviewResponse` (SH-1), khoá `analytics.platform.view` (SH-2).
Dependencies: SH-1, SH-2, G0.
Acceptance slice (e2e): (1) 401 không token; (2) 403 body phẳng `{code:'ROLE_NOT_ALLOWED', messageKey:'errors.auth.roleNotAllowed'}` cho `member`, `curator`, `moderator`; (3) 200 cho `admin` và `super_admin` với `{success:true,data}` và `data` parse được bằng `AdminOverviewResponse` (B-AC-7, đủ 5 vai); (4) không khoá cấm ở bất cứ độ sâu nào: duyệt đệ quy JSON, không có khoá `email`, `phone`, `role`, `status` (trong `latestMembers`), `passwordHash`, `ip`, `locale`, và `latestEvents[]` không có `description`, `lat`, `lng`, `viewerRsvpStatus` (B-AC-8); khoá của mỗi phần tử `latestMembers` đúng là `{id,handle,displayName,trustLevel,createdAt}`; (5) cửa sổ 7 ngày: user tạo 6 ngày 23 giờ trước vào `newUsers`, user 7 ngày 1 giờ trước thì không (theo oracle SQL của mục 1.8); RSVP `cancelled` không đếm; bài `hidden`/`removed` không đếm (B-AC-2); (6) loại trừ: user `deleted_at`/`anonymized_at`, sự kiện `draft` và xoá mềm không vào danh sách và không vào đếm (B-AC-4); `latestEvents` không có `draft` nhưng có `pending_review`/`published`; (7) rỗng: các KPI là số `0` (không `null`, không thiếu trường), hai mảng rỗng hợp lệ (B-AC-3; ca này kiểm trên DB cô lập hoặc bằng cách kiểm kiểu/nonnegative và hợp lệ khi các điều kiện cụ thể bằng 0 ở oracle, vì DB dev dùng chung có dữ liệu; BE-2 chọn cách khả thi và ghi lại); (8) `generatedAt` là ISO UTC hợp lệ, `windowDays === 7`; (9) `displayName` chứa `<script>` đi qua nguyên văn (không escape phía API) vì hiển thị an toàn là việc của UI (WA-1); (10) endpoint không thay đổi hàng nào của `users`, `events`, `rsvps`, `posts` (so `count(*)` và `max(updated_at)` của các hàng seed trước và sau, B-AC-9).
Test lane: integration. Unit mapper bỏ riêng vì mapper được bao phủ bởi (4) và (8); nếu mapper có logic nhánh thì BE-2 thêm unit.
Definition of Done: `pnpm --filter @dnc/api exec vitest run e2e/modules/admin/admin-overview.e2e.spec.ts` xanh; `pnpm --filter @dnc/api test` toàn bộ xanh; `pnpm --filter @dnc/api typecheck` xanh. Code: ba truy vấn qua `Promise.all`, KPI một `SELECT`, không `SELECT *`, không spread trong mapper, không `Logger` gọi trong đường overview (grep `grep -n "Logger\|console\." apps/api/src/modules/admin/` không có dòng mới). `curl` thử thủ công bằng token admin: `curl -s localhost:3101/api/v1/admin/overview -H "authorization: Bearer <token>"` trả JSON khớp contract (dán vào báo cáo, **che** mọi `handle`/`displayName` thật nếu có).
Risk: rò rỉ dữ liệu cá nhân qua response (kiểm bằng (4) cộng serializer); quyền (5 vai); hiệu năng (R-7, ghi nhận); số liệu KPI trùng định nghĩa "upcoming" với Discover (bình luận trỏ về `event.repository.ts`); không đụng RSVP/capacity, không đụng queue BullMQ.

### WC-1: `EventCard` rule "đã bắt đầu" và hook `useNow`
ID: WC-1 · Title: Ẩn RSVP khi sự kiện đã bắt đầu
Owner Agent: web-client-agent
Goal: Mục 1.5 (rule thẻ), L-4; áp dụng cả Home.
Scope: một component và một hook.
Allowed files: `apps/web-client-side/app/(shell)/_components/event-card.tsx`, `apps/web-client-side/app/_lib/use-now.ts` (mới)
Do not edit: `feed-stream.tsx`, `_lib/api.ts`, `packages/**`.
Inputs: mục 1.5, key `event.card.started` (SH-3).
Dependencies: SH-3 (đã gồm `event.card.started`).
Acceptance slice: thẻ có `startsAt` trong quá khứ và `viewerRsvpStatus === null` không còn nút RSVP/Join waitlist, có badge "Already started" (VI: "Đã bắt đầu"); có `viewerRsvpStatus` khác `null` thì nút Going/On waitlist còn nguyên và badge cũng hiện; link "Details" luôn có; sự kiện chưa bắt đầu và đầy chỗ vẫn hiện "Join waitlist"; thẻ đang hiển thị mà `startsAt` trôi qua trong lúc tab mở (đo bằng `useNow` 30 s) tự chuyển trạng thái không cần tải lại (A-AC-9).
Test lane: screen (chạy tay Chromium + WebKit, ca: thẻ tương lai, thẻ quá khứ, thẻ quá khứ đã RSVP, thẻ sắp bắt đầu trong 1 phút chờ qua mốc) + regression Home. Unit bỏ vì chưa có vitest ở web-client và logic chỉ là so sánh thời gian (phần hàm tính đã ở domain). Integration bỏ vì không đổi API.
Definition of Done: `pnpm --filter @dnc/web-client typecheck` xanh; `pnpm --filter @dnc/web-client build` xanh; Home (`/`) tải bình thường và EventCard vẫn RSVP/huỷ được trên một sự kiện tương lai (chạy tay, ghi bằng chứng). Không có `Date.now()` gọi trực tiếp trong thân render (grep). Không hex, không chuỗi cứng.
Risk: Home cũng bị ảnh hưởng (sự kiện quá khứ trên Home mất nút RSVP: đúng yêu cầu, ghi vào báo cáo hồi quy); hydration không phải vấn đề vì thẻ chỉ render sau khi fetch phía client.

### WA-0: `@dnc/geo` cho web-admin
ID: WA-0 · Title: Thêm phụ thuộc `@dnc/geo` vào web-admin
Owner Agent: web-admin-agent
Goal: L-5.
Scope: package.json, next.config, lockfile.
Allowed files: `apps/web-admin-side/package.json`, `apps/web-admin-side/next.config.ts`, `pnpm-lock.yaml`
Do not edit: mọi file khác. **Card duy nhất được phép sửa `pnpm-lock.yaml` trong đợt này.**
Inputs: `apps/web-client-side/package.json` (mẫu `"@dnc/geo": "workspace:*"`), `apps/web-client-side/next.config.ts` (`transpilePackages`).
Dependencies: G0.
Acceptance slice: web-admin import được `daNangAreas` từ `@dnc/geo` và build.
Test lane: regression (build + login e2e cũ vẫn xanh). Unit/screen bỏ vì chưa có UI dùng.
Definition of Done: `pnpm install` cập nhật lock mà không đổi phiên bản gói nào khác (xem `git diff pnpm-lock.yaml` chỉ thêm liên kết workspace); `pnpm --filter @dnc/web-admin typecheck` và `build` xanh; `cd apps/web-admin-side && PW_BASE_URL=http://localhost:3012 pnpm test:e2e` (cần stack đang chạy) cho các spec cũ vẫn xanh.
Risk: lockfile conflict nếu card khác cũng chạy `pnpm install` song song (vì thế card này chạy riêng một nhóm với quy tắc "không card nào khác chạy `pnpm install`/đổi dependency trong lúc nó chạy").

### WC-2: Discover danh sách và bộ lọc
ID: WC-2 · Title: Trang `/discover` (List, bộ lọc, trạng thái)
Owner Agent: web-client-agent
Goal: Mục 1.5 trừ map.
Scope: thay `BlankScreen`, thêm thành phần, mở rộng `listEvents`, tạo `discover-map.tsx` bản gốc tối thiểu.
Allowed files: `apps/web-client-side/app/(shell)/discover/page.tsx`, `apps/web-client-side/app/(shell)/discover/_components/*` (mới: `discover-screen.tsx`, `discover-filters.tsx`, `discover-list.tsx`, `discover-states.tsx`, `discover-map.tsx` (bản gốc tối thiểu), `use-discover-query.ts`, `use-near-me.ts`, `discover-url.ts`), `apps/web-client-side/app/_lib/api.ts`
Do not edit: `event-card.tsx`, `feed-stream.tsx`, `location-picker.tsx`, `packages/**`, `app/_components/ui/*` (nếu thiếu primitive thì dùng Tailwind + token trong file mới; cần sửa primitive thì dừng và báo).
Inputs: mục 1.5, 1.1; `resolveEventWindow` (SH-2); key SH-3; mockup W-10/W-12; `modern-ui-design`.
Dependencies: BE-1 (API thật để kiểm), SH-2, SH-3, WC-1 (EventCard đã có rule), G0 (**card này sửa lại `_lib/api.ts` mà đợt `m1-auth-hardening` đã sửa**).
Acceptance slice: A-AC-1, 2, 3, 5, 6, 7, 8, 9, 10, 11 (a, b, c), 12, 13 (trang đầu, tải thêm), 15, 17, 18 (phần List), cộng L-3 (khôi phục `near=1` khi tải lại) và URL bền (`?area=…&when=…&near=1&r=…&view=map` giữ khi tải lại; rác trong URL không làm hỏng trang). `listEvents(50)` của Home vẫn chạy như cũ.
Test lane: screen (bảng ca Section 5, chạy tay Chromium + WebKit, 390 px và 1280 px, EN và VI) + regression Home. Unit bỏ: logic thời gian đã có unit ở SH-2, web-client chưa có vitest. Integration bỏ: API đã có IT ở BE-1.
Definition of Done: `pnpm --filter @dnc/web-client typecheck` và `build` xanh; chạy tay toàn bộ ca bảng Section 5 (ghi ảnh chụp/log mạng, che toạ độ thật); `grep -rn "console\.\|localStorage\|sessionStorage" apps/web-client-side/app/\(shell\)/discover` không thấy toạ độ ghi ra đâu; Network tab: request lọc theo `from`/`to` đúng ISO UTC `Z`, `status=published`, `limit=20`; không `lat`/`lng` trong URL trang; không màu hex tự đặt (`grep -nE "#[0-9a-fA-F]{3,8}" discover/_components` rỗng); không chuỗi người dùng nhìn thấy bị hardcode (grep chuỗi tiếng Anh trong JSX); `page.tsx` có `<Suspense>`. Trang `BlankScreen` import trong `discover/page.tsx` đã gỡ (các trang khác dùng `BlankScreen` thì giữ nguyên).
Risk: đua phản hồi (A-AC-12) và `useSearchParams` + Suspense bailout; abort lỗi thành `OFFLINE` nếu `call()` không phân biệt (mục 1.5); lệch múi giờ nửa đêm (cửa sổ tính lại mỗi lần lọc, trang sau dùng snapshot); rò toạ độ qua URL/log; sửa `api.ts` đụng đợt auth đã commit (chạy lại luồng đăng nhập/đăng ký web-client sau khi sửa); i18n thiếu key (chạy VI trước khi báo xong); `useNow` không áp dụng ở đây (thuộc thẻ).

### SH-4: Xoá key mồ côi
ID: SH-4 · Title: Xoá `blank.discover.*` và `discover.map.placeholderNote`
Owner Agent: web-client-agent (cùng owner SH-3)
Goal: Mục 1.7.
Scope: chỉ xoá khoá.
Allowed files: `packages/i18n/messages/en.json`, `packages/i18n/messages/vi.json`, `packages/i18n/src/message-keys.ts`
Do not edit: mọi file khác; giữ `blank.myEvents`, `blank.notifications`, `blank.notFound` (và mọi `blank.*` khác).
Inputs: mục 1.7.
Dependencies: WC-2 (hết tham chiếu `blank.discover.*`); WC-3 cũng phải xong nếu nó còn dùng `discover.map.placeholderNote` (không dùng: chỉ xoá ở đây).
Acceptance slice: `grep -rn "blank.discover\|discover.map.placeholderNote" apps packages --include=*.ts --include=*.tsx --include=*.json` (loại `node_modules`, `.next`) không còn kết quả; catalog test xanh.
Test lane: unit (catalog) + regression typecheck.
Definition of Done: `pnpm --filter @dnc/i18n gen && pnpm --filter @dnc/i18n test` xanh; `pnpm -r typecheck` xanh; `pnpm --filter @dnc/web-client build` xanh.
Risk: xoá nhầm `blank.*` đang dùng (`my-events`, `notifications`, `not-found` vẫn gọi `BlankScreen`).

### WC-3: Discover bản đồ
ID: WC-3 · Title: Map MapLibre lazy cho Discover
Owner Agent: web-client-agent
Goal: Mục 1.5 (Map).
Scope: thay bản gốc `discover-map.tsx`, nối `dynamic` ở màn hình, trích thiết lập MapLibre dùng chung.
Allowed files: `apps/web-client-side/app/(shell)/discover/_components/discover-map.tsx`, `apps/web-client-side/app/(shell)/discover/_components/discover-screen.tsx` (chỉ phần nối `next/dynamic`, `view=map`, nút "Show list"), `apps/web-client-side/app/(shell)/_components/maplibre-setup.ts` (mới), `apps/web-client-side/app/(shell)/_components/location-picker.tsx`
Do not edit: `discover-filters.tsx`, `discover-list.tsx`, `use-discover-query.ts`, `api.ts`, `event-card.tsx`, `packages/**`.
Inputs: mục 1.5 (Map), mockup W-13, `location-picker.tsx` hiện tại.
Dependencies: WC-2 (nối tiếp, cùng file `discover-map.tsx`/`discover-screen.tsx`).
Acceptance slice: A-AC-4, A-AC-13 (phần map), A-AC-17 (map), A-AC-18 (map ở 390 px); popup nhiều sự kiện cùng toạ độ; map rỗng ra thẻ "No events to show on the map" + "Show list"; chunk MapLibre chỉ tải khi chuyển sang Map (kiểm Network: không có tải maplibre ở lần mở `/discover?view=list`); `location-picker` vẫn dùng được trong composer bài đăng và form tạo sự kiện (nếu có).
Test lane: screen (tay) + regression composer/tạo sự kiện. Unit bỏ (không có logic thuần).
Definition of Done: `pnpm --filter @dnc/web-client typecheck` và `build` xanh; chạy tay A-AC-4 và các ca map ở Section 5, kể cả chặn `/maplibre/*` hoặc tắt WebGL để thấy thông báo thay vì trang trắng; popup dùng `textContent` (không HTML từ chuỗi người dùng, thử một tiêu đề có `<img onerror>`); `location-picker.tsx` không còn bản sao `OSM_STYLE`/`MARKER_COLOR`/`setWorkerUrl` (grep chỉ còn ở `maplibre-setup.ts`).
Risk: `setWorkerUrl` bị gọi ở hai nơi (đã giải bằng trích xuất); đập vỡ `location-picker` (hồi quy composer); build lại EAS: **không** (web).

### WA-1: Admin Overview UI
ID: WA-1 · Title: Trang Overview của console
Owner Agent: web-admin-agent
Goal: Mục 1.6.
Scope: trang `/`, thành phần, `getAdminOverview`.
Allowed files: `apps/web-admin-side/app/(console)/page.tsx`, `apps/web-admin-side/app/(console)/_components/overview/*` (mới: `overview-screen.tsx`, `kpi-grid.tsx`, `overview-table.tsx`, `system-status-card.tsx`), `apps/web-admin-side/app/_lib/api.ts`, `apps/web-admin-side/app/_lib/areas.ts` (mới)
Do not edit: `packages/**` (kể cả `packages/i18n`), `app/_components/ui/*`, `require-role.tsx`, `sidebar.tsx`, `system-health/page.tsx`, `e2e/**`.
Inputs: mục 1.6; `AdminOverviewResponse` (SH-1); `ANALYTICS_PLATFORM_ROLES`/`allowedRolesFor` (SH-2); key `admin.overview.*` (SH-3); `@dnc/geo` (WA-0); `modern-ui-design`.
Dependencies: BE-2, SH-1, SH-2, SH-3, WA-0.
Acceptance slice: B-AC-1, 3, 5, 6, 7 (phần UI), 8 (hiển thị text thuần), 10, 11; curator/moderator thấy tiêu đề + lời chào + dòng noAccess, không thấy KPI/bảng, trình duyệt không gọi `/admin/overview` lẫn `/admin/system/health`; admin thấy KPI + hai bảng + khối hệ thống; `—` cho `areaId` không có trong `@dnc/geo`; trạng thái sự kiện hiển thị dịch (không enum thô như `pending_review`).
Test lane: screen (Playwright ở WA-2, và chạy tay 390 px/1280 px) + regression (spec admin cũ). Unit bỏ: không có hàm thuần mới đáng kể (nếu `overview-table` có logic map trạng thái thì giữ nó là bảng `Record` tường minh).
Definition of Done: `pnpm --filter @dnc/web-admin typecheck` và `build` xanh; chạy tay trên admin thật với từng vai: `admin` (đủ khối), `curator` (không khối, Network không có request tới hai endpoint), VI và EN; thử `displayName` chứa `<script>` hiển thị thành chữ; `grep -rnE "#[0-9a-fA-F]{3,8}" apps/web-admin-side/app/\(console\)/_components/overview` rỗng; không `dangerouslySetInnerHTML`.
Risk: rò dữ liệu cá nhân (UI chỉ render các trường API trả); `useAuth` đang `loading` thì không được gọi API; nhầm key trạng thái `pendingReview`/`pending_review`; XSS qua `displayName`.

### WA-2: Playwright admin Overview
ID: WA-2 · Title: e2e cho Overview
Owner Agent: web-admin-agent
Goal: Mục 1.8 (Playwright).
Allowed files: `apps/web-admin-side/e2e/overview.spec.ts` (mới)
Do not edit: `global-setup.ts`, `global-teardown.ts`, `support/*`, các spec cũ, mọi file `app/**`.
Inputs: `loginAs`, `ACCOUNTS`, mẫu `system-health.spec.ts`.
Dependencies: WA-1.
Acceptance slice: (1) admin: bắt response overview, các số KPI trên màn bằng đúng JSON (không số tuyệt đối); (2) một khối hỏng: `page.route` trả 500 cho `/admin/overview` thì thẻ lỗi + "Retry" hiện, khối hệ thống vẫn hiện; bỏ route rồi Retry thì phục hồi; (3) `page.route` abort cho `/admin/system/health` thì khối KPI vẫn hiện và khối hệ thống hiện `unavailable`; (4) curator: không có request tới `/admin/overview` và `/admin/system/health`, thấy tiêu đề và dòng noAccess; (5) VI: tiêu đề và nhãn dịch, `body.innerText` không chứa `admin.overview`; (6) 390 px: không cuộn ngang trang (`document.documentElement.scrollWidth <= innerWidth`).
Test lane: screen (Playwright). Unit/integration bỏ vì ở card khác.
Definition of Done: `cd apps/web-admin-side && PW_BASE_URL=http://localhost:3012 pnpm test:e2e` xanh toàn bộ (gồm các spec cũ); chạy hai lần liên tiếp vẫn xanh (không dựa trạng thái còn lại).
Risk: `global-setup.ts` đăng ký tài khoản mỗi lần chạy và dính rate limit đăng ký nếu `apps/api/.env` chưa nâng ngưỡng (xem mục 7 của task-board `m1-auth-hardening`); không thêm đăng ký nào trong spec này.

### TS-1, TS-2, TS-3: Kiểm thử độc lập (Tester)
Owner Agent: tester-agent (lane unit/integration/screen/regression); không sửa file production.
- **TS-1 (sau BE-1, BE-2, SH-1, SH-2):** chạy IT API và xác nhận tay bằng `curl`: HTTP 400 và shape body (L-1); `from`/`to` biên; 5 vai cho overview; 1 request sai kèm `messageKey`.
- **TS-2 (sau WC-3, SH-4):** Screen lane cho web-client theo bảng Section 5, Chromium + WebKit, 390/1280, EN/VI.
- **TS-3 (sau WA-2):** Regression: `pnpm -r typecheck`, `pnpm --filter @dnc/api test`, `pnpm --filter @dnc/domain test`, `pnpm --filter @dnc/contracts test`, `pnpm --filter @dnc/i18n test`, Playwright admin toàn bộ, Home và composer chạy tay.
- Sau đó: code-review-agent review độc lập; BA đối chiếu A-AC-1..18, B-AC-1..11.

## 4. Thứ tự và nhóm chạy song song

```
G0 (m1-auth-hardening đã commit)
 │
 ├─ Nhóm P1 (3 worker, tập file rời nhau):
 │    SH-1 (contracts) ─▶ SH-2 (domain)        [tuần tự, cùng backend-agent]
 │    SH-3 (i18n, thêm key)                    [song song với dòng SH-1→SH-2]
 │    WA-0 (@dnc/geo + lockfile)               [song song; không ai khác chạy pnpm install]
 │
 ├─ Nhóm P2 (4 worker; sau SH-1, SH-2, SH-3 xong):
 │    BE-1 (event list)    BE-2 (admin overview)    WC-1 (EventCard)    [WA-0 phải xong, nhưng WA-1 chưa bắt đầu]
 │
 ├─ Nhóm P3 (2 worker):
 │    WC-2 (cần BE-1, WC-1)        WA-1 (cần BE-2, WA-0)
 │
 ├─ Nhóm P4 (2 worker, tuần tự trong từng dòng):
 │    WC-3 (sau WC-2) ─▶ SH-4 (sau WC-2/WC-3)      WA-2 (sau WA-1)
 │
 └─ P5: TS-1 (có thể bắt đầu ngay sau BE-1+BE-2), TS-2, TS-3, review, BA đối chiếu
```
Ghi chú: tối đa 4 worker song song (P2 đúng 4: BE-1, BE-2, WC-1 và một dòng nối tiếp tiếp từ P1 nếu còn chạy; Coordinator không xếp thêm). BE-1 và BE-2 cùng nằm trong `apps/api` nhưng tập file rời nhau (`event/` so với `admin/`, e2e ở hai thư mục khác nhau), nên song song an toàn. Tester TS-1 được phép chạy song song với P3/P4 vì chỉ đọc.

**Tuần tự bắt buộc (đường chính):** SH-1 → SH-2 → {BE-1, BE-2}; SH-3 → mọi card UI; WA-0 → WA-1; WC-1 → WC-2 → WC-3 → SH-4.

## 5. Test lane và bảng ca Screen web-client (chạy tay)

| Lane | Phạm vi | Lý do bỏ lane khác |
|---|---|---|
| Unit | contracts `from`/`to`, domain `resolveEventWindow` + matrix | UI web-client chưa có vitest; thêm vitest là ngoài phạm vi |
| Integration/API | BE-1, BE-2 (thật Postgres) | — |
| Screen | Playwright admin (WA-2); tay cho web-client | Web-client chưa có Playwright (TG-M2-5) |
| Regression | `pnpm -r typecheck`, toàn bộ API e2e, Playwright admin, Home, composer | — |

**Bảng ca Screen web-client** (mỗi ca: EN và VI; 390 px và 1280 px; Chromium và WebKit): A-AC-1 (3 sự kiện); A-AC-2 (chip Mỹ Khê, URL `?area=my-khe`); A-AC-3 (Weekend, kiểm `from`/`to` trong Network; để có "hôm nay là Thứ Năm" thì dùng Playwright MCP/DevTools ghi đè đồng hồ hoặc seed sự kiện tương ứng); A-AC-4; A-AC-5; A-AC-6 (đổi đồng hồ sang Thứ Bảy/Chủ Nhật); A-AC-7 (đăng nhập, seed ba loại sự kiện); A-AC-8 (45 sự kiện, hai lần "Show more"); A-AC-9 (tab mở qua mốc bắt đầu); A-AC-10 (chặn vị trí, hết 10 s, không hỗ trợ); A-AC-11 a/b/c; A-AC-12 (bấm Weekend rồi Today, làm chậm phản hồi đầu bằng throttling); A-AC-13 (offline, 5xx, tải thêm lỗi, MapLibre không tải); A-AC-15 (guest bấm RSVP rồi quay lại đúng URL lọc); A-AC-17; A-AC-18; **L-3** (tải lại `?near=1` khi quyền `granted` thì tự bật; khi `prompt`/`denied` thì URL bị bỏ `near`/`r`); URL rác (`?area=zzz&when=foo&r=999`) không hỏng trang; Safari: `navigator.permissions.query` có thể thiếu, đường L-3 phải rơi về "bỏ `near`".

## 6. Rủi ro (theo đặc thù dự án)

- **Múi giờ nửa đêm:** biên preset là số học cố định UTC+7; unit test bảng ca; cửa sổ tính lại mỗi lần lọc, trang "Show more" dùng snapshot (cursor đúng). Backend chỉ nhận UTC.
- **RSVP/capacity:** không đụng. `EventCard` chỉ ẩn nút phía client (chống nhầm); ràng buộc thật (đồng thời, trigger `assert_capacity`, tồn kho) giữ nguyên ở server. Ghi chú: rule "không RSVP sau khi bắt đầu" **chưa được server cưỡng chế** (`POST /occurrences/{id}/rsvps` không đổi đợt này). Gọi API trực tiếp vẫn RSVP được sau giờ bắt đầu. Đề xuất backlog riêng, ngoài phạm vi đã duyệt.
- **PostGIS/GIST:** đường `ST_DWithin` không đổi; `from`/`to` không chạm cột `location`. EXPLAIN tuỳ chọn trong BE-1.
- **Quy mô:** bộ lọc thời gian là Filter trên Subquery Scan (không index), đủ cho giai đoạn 1; cần đo lại ở mốc S3-DoD-2 (10.000 sự kiện). Overview: 5 COUNT quét tuần tự, ngưỡng xem lại khoảng 50.000 users.
- **Sự kiện lặp (R-5):** `OCCURRENCE_JOIN` lấy occurrence sớm nhất kể cả đã qua; kết hợp `from` sẽ ẩn cả sự kiện có buổi sớm đã qua và buổi sau còn tương lai. Chốt: ngoài phạm vi, remedy nằm ở 1.2.
- **Dữ liệu cá nhân:** (a) vị trí thiết bị: làm tròn 3 chữ số, không URL/storage/log, chỉ vào query; Next dev log URL có toạ độ đã làm tròn (chỉ môi trường dev, R-8); (b) overview: danh sách trắng, không email/phone/role/status; kiểm đệ quy ở e2e; (c) lat/lng chính xác của sự kiện vẫn lộ cho guest (R-3, S-5, ngoài phạm vi).
- **Quyền / trust_level:** 5 vai test ở API (không chỉ ẩn UI); không đổi ngưỡng trust.
- **Kiểm duyệt / report:** Discover chỉ `published`; không nội dung mới của người dùng được tạo; không thêm report. `title` sự kiện hiển thị lại ở popup map và bảng admin (chuỗi người dùng nhập): phải là text node/`textContent`, không HTML.
- **Lệch i18n EN/VI:** SH-3 một owner, catalog test; `pendingReview` so với `pending_review` (1.6).
- **Build EAS:** **Không có thay đổi nào buộc `apps/mobile` build lại EAS.** `packages/contracts` và `packages/domain` chỉ thêm export/kiểu thuần (JS), mobile chưa dùng. `pnpm -r typecheck` ở TS-3 bao phủ mobile. Không đổi dependency native, `app.config.ts`, `eas.json`.
- **BullMQ:** không đụng hàng đợi hay job. Không việc chậm mới (overview chạy trong request, 3 truy vấn nhẹ).
- **Hai nguồn sự thật:** (a) hằng `EVENT_LIST_MAX_WINDOW_DAYS` và `ADMIN_OVERVIEW_WINDOW_DAYS` chỉ định nghĩa ở contracts; (b) vai được xem overview chỉ ở `PERMISSION_MATRIX`; (c) style/màu/worker MapLibre chỉ ở `maplibre-setup.ts` sau WC-3; (d) tên khu chỉ từ `@dnc/geo` (web-admin và web-client dùng cùng); (e) SQL "upcoming" lặp ở `admin.repository` và `event.repository` (cố ý, có comment, cùng định nghĩa).
- **Thay đổi đợt khác chưa commit:** G0. Card WC-2 và SH-3/SH-4 sửa `api.ts` và `packages/i18n` đã bị `m1-auth-hardening` chạm: nếu đợt kia chưa commit mà đợt này đã chạy sẽ xung đột. Không xếp các card đó trước G0.

## 7. Debate Gate

**Không mở.** Không có đánh đổi kiến trúc thật sự: mọi quyết định đi theo phương án đơn giản nhất và đã có tiền lệ trong code. Năm điểm lệch/bổ sung ở mục 1.0 cần **xác nhận** (không phải tranh luận): L-1 (400 và body `message[]`, BA sửa A-AC-14), L-2 (map vs checklist đã hoãn), L-3 (hành vi khôi phục `near=1`), L-4 (đã RSVP rồi vẫn thấy nút Going khi sự kiện đã bắt đầu), L-5 (thêm `@dnc/geo` cho web-admin). Nếu chủ dự án không đồng ý L-5, phương án thay thế duy nhất là thêm `areaNameEn`/`areaNameVi` vào `AdminLatestEvent` (đổi hợp đồng SH-1, join `areas` ở BE-2, bỏ WA-0); chọn phương án nào thì xác nhận **trước** SH-1.

## 8. Việc tài liệu

- **Checklist `docs/checklists/theo-phase/M2-tao-kham-pha-su-kien.md` (sau khi Tester xác minh, không tự đóng trước):**
  - **E5-S5** (trang khám phá web: chip lọc cơ bản + tải thêm, bản rút gọn 9 SP): đóng (đủ: chip khu vực + chip thời gian + "Show more events"; đã bỏ sắp xếp theo khoảng cách).
  - **E5-S2** (API lọc): **chưa đóng**, ghi tiến độ "đã có `from`/`to` + `areaId` + bán kính; còn loại hình, ngôn ngữ, mức phí".
  - **E5-S6** (bản đồ, hiện "✂️ Cắt / hoãn"): ghi nhận map **được thêm lại** theo duyệt chủ dự án đợt này (map danh sách đã tải, không gom cụm); nhắc Founder (L-2). Không đóng phần "gom cụm điểm theo khu vực".
  - **M2-4** (bộ lọc 6 khu vực): đóng khi có ảnh giao diện (Screen lane) và test API `areaId` (BE-1 case 4).
  - **MK-TIME-01**: ghi tiến độ một phần (Today/Weekend/This week + `from`/`to` theo `Asia/Ho_Chi_Minh` + giữ trên URL); còn "Tháng này / Chọn ngày" và phần Home.
  - **S3-Demo-1**: một phần (có chip khu vực + chip ngày; không có category/ngôn ngữ/badge số). **S3-Demo-2** (trong 2 km quanh tôi): đóng khi Screen lane A-AC-5 đạt. **S3-Demo-4**: không đóng (khác định nghĩa: không gom cụm).
  - **DEC-WEEKSTART**: ghi "D-5 đã dùng Thứ Hai cho EN/VI"; nhắc Founder chốt chính thức.
  - **Phần B (Overview):** không có mục M2 khớp; Coordinator gắn vào mục vận hành/analytics của phase phù hợp hoặc tạo mục mới.
- **Tài liệu khác:** doc 10 lệch hợp đồng thật (`radiusKm`, `areas[]`, `sort=distance` so với `radiusMeters`, `areaId` đơn, không `sort`; S-6/S-7/S-8): BA ghi chú. Doc 01 §9.2 thêm dòng `analytics.platform.view` khi ma trận 22 quyền được đồng bộ. A-AC-14 của brief sửa theo L-1. OpenAPI sinh từ zod nên không có tài liệu API viết tay.
- **Follow-up (ngoài phạm vi, đã ghi):** cưỡng chế "không RSVP sau khi bắt đầu" ở server; Home dùng cùng định nghĩa Weekend (S-2, R-9); cột `is_test` (Q-4); index `users(created_at)` khi lớn; đưa điều kiện thời gian vào LATERAL khi có sự kiện lặp (R-5); Playwright cho web-client (TG-M2-5); `Retry-After`/lỗi validation phẳng (nếu muốn `messageKey` thật cho client).

## Engineering Plan (tóm tắt theo khuôn bàn giao)
Quyết định kiến trúc: không thêm hạ tầng; 1 endpoint mới; 1 sửa SQL; preset ngày ở `packages/domain`; một owner i18n; không migration.
Service & module bị ảnh hưởng: `apps/api` (`modules/event` nhánh `list`, `modules/admin`), `apps/web-client-side` (`(shell)/discover`, `event-card`, `location-picker`, `_lib/api.ts`, `_lib/use-now.ts`), `apps/web-admin-side` (`(console)/page`, `_lib/api.ts`, `_lib/areas.ts`, package.json, next.config), `packages/contracts`, `packages/domain`, `packages/i18n`, `pnpm-lock.yaml` (chỉ WA-0). `apps/mobile`: không đổi.
File dùng chung phải nối tiếp: `packages/contracts` (SH-1) → `packages/domain` (SH-2); `packages/i18n` (SH-3 → SH-4, một owner); `pnpm-lock.yaml` (WA-0 duy nhất); `discover-map.tsx`/`discover-screen.tsx` (WC-2 → WC-3); `_lib/api.ts` của hai web (mỗi cái một card).
Câu hỏi kỹ thuật còn mở: không chặn. Chờ xác nhận L-1..L-5 trước khi giao SH-1.
Cần Debate Gate: không (không có đánh đổi kiến trúc thật; chỉ cần xác nhận 5 điểm lệch ở mục 1.0).
## 9. Quyết định Coordinator (01/10/2026)

Chấp nhận cả năm điểm ở mục 1.0, không mở Debate Gate:

- **L-1:** A-AC-14 sửa thành HTTP 400, `body.message` là mảng chứa `"to: errors.event.dateRangeInvalid"`. Không đổi pipe validation (breaking cho mọi client).
- **L-2:** Map nằm trong phạm vi theo lựa chọn của chủ dự án ngày 01/10; cập nhật trạng thái E5-S6 trong checklist M2 ở bước tài liệu.
- **L-3:** URL có `near=1` khi tải lại: chỉ lấy vị trí im lặng nếu quyền đã `granted`, ngược lại bỏ `near`/`r` khỏi URL. Thêm ca vào Screen lane.
- **L-4:** Sự kiện đã bắt đầu mà người xem đã RSVP thì vẫn giữ nút Going/On waitlist để huỷ, kèm badge "Already started".
- **L-5:** Web-admin thêm phụ thuộc workspace `@dnc/geo` (card WA-0, một mình sửa `pnpm-lock.yaml`).

Điều kiện bắt đầu: G0 = đợt `m1-auth-hardening` đã commit.

## 10. Quyết định Coordinator trong lúc triển khai (01/10/2026)

- **WA-3 (card mới): tooltip KPI** theo `.agent/rules/dashboard-metric-tooltips.md` (bắt buộc). Năm key `admin.overview.kpi.<metric>Hint` EN/VI; component dùng chung đặt ở `apps/web-admin-side/app/_components/ui/` vì `packages/ui` chưa tồn tại. Owner web-admin-agent, tạm giữ quyền `packages/i18n` cho năm key này; SH-4 chạy sau WA-3.
- **Locator Playwright cũ:** link mới "Open system health" làm bốn locator `/system health/i` mơ hồ. WA-2 được thu hẹp bốn locator đó vào `navigation`; chỉ đổi test, không đổi hành vi.
- **Code Review lượt 1:** minor-1/2 (EventCard, `useNow`) giao web-client-agent; minor-3 (định dạng JSON i18n) gộp vào SH-4; minor-4 giữ INNER JOIN vì register/create ghi trong một transaction và contract không nhận null (đã ghi JSDoc).
- **Dev API** chạy riêng ngoài `ops/dev.sh` sau khi restart để nạp route `GET /admin/overview` (`vite-node --watch` không đăng ký lại route Nest).


## 11. Swipe (Tech Lead, 01/10/2026)

Nguồn: brief Phụ lục S + S.0. Không đổi API, schema, `packages/contracts`, dependency hay `pnpm-lock.yaml`. Không build lại EAS (mobile không dùng gì mới; `packages/domain` chỉ thêm export thuần).

### 11.0 Quyết định đã chốt

**Phát hiện từ code thật**
- `seed-demo.ts` **đã có** ca overlap (`s9-overlap-a/b/c`, ABC_DAY) và open-ended (`s9-open-*`, OPEN_DAY, `mins: null`), kèm tiêu đề dài VI và EN/VI trộn. **Còn thiếu:** (a) chặn `NODE_ENV=production` (grep không thấy `NODE_ENV` trong file này lẫn `load-env.ts`); (b) ca bắt đầu < 2 giờ (hiện chỉ có `NOW_EVENTS` đã bắt đầu, không có ca "sắp bắt đầu ~90 phút"); (c) xác nhận có một sự kiện mà member demo đã RSVP không có trong `EVENTS` nào khác (`s9-overlap-b` đã `include: [0]` = demo_anna: dùng lại, không thêm). Do đó SW-SEED rút xuống còn vài dòng, gộp vào card SW-BE.
- Web-client không có vitest và không có Playwright. Logic thuần cần test nên đặt ở `packages/domain` (có vitest sẵn). Playwright dùng bản đã cài ở `apps/web-admin-side` (`@playwright/test` 1.63.0) chạy bằng script ở scratchpad: không thêm dependency vào web-client, không chạm lockfile.

**1) Kho localStorage** (file mới `apps/web-client-side/app/_lib/swipe-store.ts`, module thuần không React, ngoại trừ một hook ở cuối)
- Khoá: `dnc.swipe.v1:<ownerKey>`, `ownerKey = 'guest' | userId`.
- Giá trị JSON: `{ version: 1, saved: SavedItem[], skipped: SkippedItem[], coachDismissed: boolean }`; `SavedItem = { id, savedAt (ISO), title, startsAt, endsAt: string|null, areaId }`; `SkippedItem = { id, until (ISO) }`. Không thêm trường nào khác (S-AC-27 so khớp bằng khoá).
- Đọc phòng thủ: parse lỗi, `version` lạ, sai kiểu thì coi như rỗng (không ném). Khi đọc, dọn `saved` đã kết thúc (end theo D-S11, dùng `eventEndMs` của domain) và `skipped.until <= now`, ghi lại nếu có thay đổi.
- Tối đa 50 `saved`: `addSaved` trả `'full'` và không ghi gì. `skipped` không giới hạn cứng nhưng dọn theo hạn.
- Fallback D-S16: mọi `getItem/setItem/removeItem` bọc try/catch; lỗi thì chuyển sang `Map` trong bộ nhớ của module và bật cờ `degraded` (hiện chuỗi `discover.swipe.storage.unavailable`). Truy cập `window.localStorage` cũng nằm trong try (Safari riêng tư ném ngay khi truy cập).
- Hook `useSwipeStore(ownerKey)` dùng `useSyncExternalStore` với snapshot cache ổn định (không tạo object mới mỗi lần gọi); `getServerSnapshot` trả rỗng (tránh hydration mismatch). Nghe `window 'storage'` (lọc theo tiền tố khoá) cộng một bộ phát nội bộ cho cùng tab.
- Gộp guest→user: trong hook, khi `useAuth().loading === false` và `ownerKey` là userId: đọc `guest`, hợp `saved` (khử trùng `id`, giữ `savedAt` cũ hơn, cắt còn 50 theo `savedAt` mới nhất), hợp `skipped` (giữ `until` lớn hơn), `coachDismissed = a || b`, ghi vào khoá userId rồi `removeItem('…:guest')`. Chạy một lần mỗi lần `ownerKey` đổi. Chờ `loading === false` để không gộp nhầm lúc phiên chưa nạp.
- Đăng xuất chủ động: điểm móc duy nhất là `signOut` ở `apps/web-client-side/app/_components/auth-provider.tsx:92-95` (`await api.logout(); setUser(null)`). Export `clearSwipeData(userId)` từ `swipe-store.ts`; `signOut` đọc user hiện tại qua `useRef` (callback đang `[]` deps) và gọi `clearSwipeData` sau `api.logout()` thành công, trước `setUser(null)`. Phiên hết hạn tự nhiên đi qua `getSession` (dòng 63) nên không bị xoá, đúng D-S15. Khoá `guest` không đụng tới.

**2) Hàm trùng giờ** đặt ở `packages/domain` (mobile dùng lại; `main` trỏ `src/index.ts`, web-client đã `transpilePackages` và đã dùng `@dnc/domain`). File mới `packages/domain/src/time-clash.ts`, export qua `index.ts`:
```ts
export const DEFAULT_EVENT_DURATION_MINUTES = 120;
export interface ClashInput { id: string; startsAt: string; endsAt: string | null }
export interface TimeClash { aId: string; bId: string; assumedEnd: boolean } // assumedEnd: ít nhất một bên dùng giờ giả định
export function eventEndMs(e: ClashInput): number; // endsAt hợp lệ và > startsAt thì dùng, ngược lại start + 120 phút
export function findTimeClashes(items: readonly ClashInput[]): TimeClash[]; // mọi cặp trong items, a trước b theo (start, id)
export function findTimeClashesAgainst(items: readonly ClashInput[], fixed: readonly ClashInput[]): TimeClash[]; // mỗi item x mỗi fixed, bỏ cặp cùng id
```
So sánh chặt `a.start < b.end && b.start < a.end`, làm trên số mili-giây (`Date.parse`); chuỗi không parse được thì bỏ qua cặp đó. Kết quả có thứ tự xác định (start, id).
Cùng file/PR: `selectSwipeCandidates(input)` thuần cho deck (lọc D-S8, giữ nguyên thứ tự server):
```ts
export interface DeckEvent { id: string; startsAt: string; viewerRsvpStatus: string | null; organizerHandle: string }
export function selectSwipeCandidates<T>(events: readonly T[], pick: (e: T) => DeckEvent, ctx: { now: Date; viewerHandle: string | null; savedIds: ReadonlySet<string>; skippedActiveIds: ReadonlySet<string> }): T[];
```
Loại: đã lưu, bỏ qua còn hạn, `viewerRsvpStatus !== null`, `organizerHandle === viewerHandle`, `startsAt <= now`. Không loại sự kiện đầy chỗ. Đặt ở domain để có test vitest (web-client không có lane unit).

**5) "Sự kiện của tôi" (Q-S4):** `user?.handle === event.organizer.handle`, đúng cách `event-card.tsx:44` đang làm (`isOwn`). Không cần dữ liệu mới. `viewerRsvpStatus` đã `null` khi RSVP bị huỷ (enum chỉ có `confirmed|held|waitlisted`, `event.ts:56`), nên S-AC-11 "cancelled" tự đúng.

**3) Cử chỉ (Pointer Events thuần, không dependency)** — thư mục mới `apps/web-client-side/app/(shell)/discover/_components/swipe/`
- Cấu trúc file: `swipe-deck.tsx` (điều phối: hàng đợi, vòng 12 thẻ, nút, phím, `aria-live`, tải ngầm), `swipe-card.tsx` (thẻ + tem), `use-swipe-gesture.ts` (hook cử chỉ), `swipe-sheet.tsx`, `swipe-summary.tsx`, `swipe-states.tsx` (xem hết, rỗng dùng lại `DiscoverEmpty`/`DiscoverError`).
- Vùng sân khấu (stage) chứa deck có `touch-action: none` và `overscroll-behavior: contain`; ngoài stage trang cuộn bình thường (S-AC-14). Chỉ thẻ trên cùng gắn handler: `pointerdown` (`setPointerCapture`), `pointermove`, `pointerup`, `pointercancel` (hủy = trượt về, không thao tác). Chỉ chấp nhận `isPrimary`; bỏ qua nút chuột phụ.
- Khoá trục: sau khi di chuyển ≥ 10 px, `|dx| > |dy|` thì khoá `x`, ngược lại khoá `y` (chỉ xét hướng lên; kéo xuống kẹp về 0). Trục `y` không bao giờ chốt Lưu/Bỏ qua và ngược lại.
- Ngưỡng D-S2 khi thả: trục x chốt nếu `|dx| >= 0.28 * cardWidth` **hoặc** `|vx| >= 800 px/s` cùng dấu với `dx`; trục y chốt mở sheet nếu `-dy >= 0.22 * cardHeight`. Vận tốc tính từ các mẫu trong 100 ms cuối (`performance.now()`). Chạm = tổng di chuyển < 10 px (và < 500 ms) thì mở sheet. Đo kích thước bằng `getBoundingClientRect()` lúc `pointerdown`.
- Hiệu ứng: cập nhật `style.transform` qua ref + `requestAnimationFrame`, không `setState` mỗi `pointermove`. Xoay `clamp(dx / width * 8, -8, 8)` độ. Bay ra 220 ms (`transitionend` + timeout dự phòng 260 ms). Chỉ animate `transform`/`opacity`.
- Reduced motion (D-S14): hook đọc `matchMedia('(prefers-reduced-motion: reduce)')` (có lắng nghe `change`); khi bật, thẻ vẫn bám tay nhưng không xoay, chốt tức thì (không bay ra, không trượt về), tem tĩnh, sheet không transition.
- A11y D-S3: stage `role="group"` + `aria-label` `discover.swipe.stack.aria`, `tabIndex={0}`, `onKeyDown` (`←` bỏ qua, `→` lưu, `↑`/`Enter` chi tiết, `U` hoàn tác; bỏ qua khi `event.target` là `input|textarea|select|[contenteditable]`, khi sheet mở, hoặc có modifier). Thẻ trên cùng `role="group"` + `aria-roledescription="card"` + `aria-label` từ `discover.swipe.card.aria`; chỉ 2 thẻ đầu render, thẻ thứ hai `aria-hidden`. Sau thao tác, focus về stage (thẻ kế tiếp), chuỗi thông báo ghi vào một vùng `role="status" aria-live="polite"`. Nút `min-h-11 min-w-11` (≥ 44 px), mỗi nút `<button>` thật với `aria-label` `*Aria` có `{title}`.
- Sheet: dùng phần tử `<dialog>` gốc với `showModal()` (bẫy focus, `Esc` đóng, nền inert miễn phí, trả focus nút gọi; sau `close` gọi `opener.focus()` dự phòng). Mobile: neo đáy, bo góc trên, `max-h-[85dvh]`, cuộn nội dung; desktop (`md:`) hộp thoại giữa màn. Ngăn cuộn nền khi mở bằng `overflow-hidden` trên `body` cho tới khi đóng.
- Tổng kết: thay deck ngay trong màn (không đổi route); khi vào, focus chuyển tới tiêu đề (`tabIndex={-1}`).
- Thiết kế: bám `.claude/skills/modern-ui-design/SKILL.md` và token Tailwind sẵn có (`bg-surface`, `text-fg`, `shadow-card`...), dùng `cn` từ `_lib/cn.ts`, không màu cứng.

**4) Tích hợp URL/query**
- `discover-url.ts`: `DiscoverView = 'list' | 'map' | 'swipe'`; parse `view` nhận `'map'|'swipe'` còn lại `'list'` (S-AC-S7); serialize ghi `view=map|swipe`, bỏ khi `list`. Giữ `onClear` hiện có (`{...DEFAULT_URL_STATE, view: state.view}`) nên Xoá bộ lọc không rời Swipe.
- `discover-filters.tsx` (`ViewToggle`): thêm giá trị `swipe`, nhãn `discover.view.swipe`; vẫn `aria-pressed` từng nút.
- `discover-screen.tsx`: thêm nhánh `state.view === 'swipe'` render `<SwipeDeck …>` giữa `error` và `map`; dùng **chung một** `useDiscoverQuery` (không tạo hook thứ hai, không đổi chữ ký hook). Truyền xuống: `items`, `hasMore`, `loadingMore`, `loadMoreFailed`, `loadMore`, `replaceItem`, `emptyVariant`, `onClear`, `onWiden`, `viewer`. Khi ở Swipe ẩn dòng đếm kết quả (deck có bộ đếm "i of n" riêng); giữ dòng `datetime.timeZoneNote`.
- Tải ngầm: effect trong `SwipeDeck`: khi `candidates.length <= 3 && hasMore && !loadingMore && !loadMoreFailed` thì `loadMore()` (hook đã giữ nguyên `from`/`to` và `cursor` của trang đầu, khử trùng `id`, PAGE_SIZE 20). Vì deck lọc bớt thẻ đã lưu/bỏ qua nên effect lặp tới khi đủ thẻ hoặc hết trang; `loadMoreFailed` chặn vòng lặp và hiện `discover.loadMoreError` + `common.retry` (gọi `loadMore`). Một lượt = 12 thẻ đã xử lý (lưu/bỏ qua/tham gia), rồi hiện tổng kết; đổi bộ lọc thì reset lượt, **không** reset kho.
- `now` của deck lấy từ `useNow()` (tick 30 s) để thẻ đã bắt đầu tự bị bỏ qua khi đến lượt (S-AC-13) mà không ghi vào `skipped`.
- LAN trên điện thoại: web-client dùng rewrite `/api/*` đến `API_ORIGIN` (`next.config.ts:37`) nên không cần CORS. Next dev có thể chặn tài nguyên dev từ origin LAN: SW-UI-1 thêm `allowedDevOrigins` vào `next.config.ts` đọc từ biến môi trường `DEV_ALLOWED_ORIGINS` (chuỗi phân cách dấu phẩy, rỗng thì bỏ), chỉ dùng cho dev.

**6) Seed** — chỉ sửa `apps/api/src/database/seeds/seed-demo.ts` (không script mới, `seed:demo` đã có ở `apps/api/package.json:11`): (a) đầu `main()` ném lỗi và `process.exit(1)` nếu `process.env.NODE_ENV === 'production'`, trước khi mở `Pool` (không ghi gì); (b) thêm một `Spec` "bắt đầu trong ~90 phút" (tiêu đề `Morning Beach Yoga`, My Khe, `mins: 60`, có `endsAt`) bằng cơ chế tính thời điểm tương đối `now` giống `NOW_EVENTS` nhưng ở phía tương lai (đọc cách `day`/`time` và `startedMinsAgo` được chuyển thành `starts_at` rồi làm tương tự với `+90 phút`); chỉ thêm mã vào đúng chỗ đã sinh `NOW_EVENTS`; (c) cập nhật phần chú thích đầu file nêu cờ chặn production và ghi các ca swipe. Không đổi `--reset`/`--purge`. Đã đủ ≥ 16 sự kiện published phủ 6 khu; không thêm sự kiện nào khác ngoài ca (b).

### 11.1 Task card

#### SW-BE: hàm thuần trùng giờ + chọn thẻ deck, và bổ sung seed
ID: SW-BE
Owner Agent: backend-agent
Goal: Cung cấp `findTimeClashes`, `findTimeClashesAgainst`, `eventEndMs`, `DEFAULT_EVENT_DURATION_MINUTES`, `selectSwipeCandidates` (domain, có test) và hoàn thiện seed demo cho các ca S.9 còn thiếu.
Scope: mục 11.0 điểm 2 và 6.
Allowed files: `packages/domain/src/time-clash.ts` (mới), `packages/domain/src/index.ts` (chỉ thêm export), `packages/domain/test/time-clash.spec.ts` (mới), `apps/api/src/database/seeds/seed-demo.ts`.
Do not edit: mọi file khác, đặc biệt `packages/contracts`, `packages/i18n`, `apps/web-client-side/**`, `pnpm-lock.yaml`, migration.
Inputs: 11.0 điểm 2 (chữ ký), 5 và 6; D-S8, D-S11; S-AC-9..13, 28, 29.
Dependencies: không (chạy ngay, không phụ thuộc SH-4).
Acceptance slice: S-AC-9, S-AC-10, S-AC-11, S-AC-12 (phần chọn thẻ), S-AC-13 (phần `startsAt <= now`), S-AC-28, S-AC-29.
Test lane: unit (domain vitest) + chạy tay seed. Không cần integration API: không đổi endpoint. Screen do SW-T.
Definition of Done:
- Test bảng ca trong `time-clash.spec.ts`: A 19-21 vs B 20-22:30 trùng; C 21-22 không trùng A (chạm biên) nhưng trùng B; D 19:00 `endsAt` null vs E 20:30 trùng, `assumedEnd = true`; F đúng 21:00 không trùng D; `endsAt <= startsAt` coi như null; chuỗi ngày hỏng bị bỏ qua; `findTimeClashesAgainst` bỏ cặp cùng `id`; thứ tự kết quả xác định. `selectSwipeCandidates`: 6 loại loại trừ (đã lưu, bỏ qua còn hạn, đã RSVP, của chính viewer, `startsAt <= now`, và `until <= now` thì **không** loại), giữ nguyên thứ tự đầu vào, đầy chỗ không bị loại (không có trường chỗ trong `DeckEvent`). `TZ` đặt khác nhau không đổi kết quả (số học epoch).
- `pnpm --filter @dnc/domain test` và `pnpm --filter @dnc/domain typecheck` xanh; `pnpm -r typecheck` xanh.
- Seed: `NODE_ENV=production pnpm --filter @dnc/api seed:demo` thoát mã khác 0 và không kết nối DB; chạy bình thường hai lần liên tiếp không tạo bản trùng (đếm `events` có `slug LIKE 'demo-%'` giống nhau, in ra trong báo cáo); sự kiện "~90 phút" có `starts_at` trong khoảng `now + 60..120 phút`; `pnpm --filter @dnc/api seed:demo -- --purge` xoá sạch; không có file migration mới (`git status` chỉ hiện file Allowed).
- Comment tiếng Anh theo `.agent/rules/code-documentation.md`; JSDoc nêu giả định 120 phút.
Risk: giờ giả định 120 phút báo trùng sai/bỏ sót (L-S3, đã có cờ `assumedEnd` để UI chú thích). Seed ghi vào DB dev dùng chung: chặn production, chỉ đụng dòng `@demo.danangconnect.test` / `demo-` như thiết kế sẵn; kiểm tra `DATABASE_URL` không trỏ vào DB không phải local trước khi chạy. Không ảnh hưởng đồng thời RSVP/GIST/BullMQ.

#### SW-I: i18n S.8 vào `packages/i18n`
ID: SW-I
Owner Agent: web-client-agent (cùng owner SH-3/SH-4, một owner i18n duy nhất)
Goal: Thêm toàn bộ key `discover.view.swipe` và `discover.swipe.*` ở S.8 (EN + VI) để SW-UI-1/2 tiêu thụ.
Scope: đúng bảng S.8, nguyên văn EN/VI; không đổi key cũ.
Allowed files: `packages/i18n/messages/en.json`, `packages/i18n/messages/vi.json`, `packages/i18n/src/message-keys.ts`.
Do not edit: mọi file khác; không xoá hay đổi `blank.discover.*` (SH-4 xử lý).
Inputs: brief S.8 (bảng key); quy ước định dạng JSON của SH-4 (minor-3).
Dependencies: **SH-4 xong** (cùng ba file; chạy nối tiếp, không song song).
Acceptance slice: S-AC-25 (không lộ key thô, đủ EN/VI).
Test lane: unit (catalog test sẵn có của `packages/i18n` nếu có) + typecheck. Screen do SW-T.
Definition of Done:
- `pnpm --filter @dnc/i18n test` (nếu package có script test; nếu không, ghi rõ trong báo cáo) và `pnpm -r typecheck` xanh.
- Đếm khoá: mọi key S.8 có mặt ở `en.json`, `vi.json` và `message-keys.ts`, đếm bằng lệnh `grep -c "discover.swipe" ` ở ba file cho kết quả bằng nhau; tham số `{title}`, `{i}`, `{n}`, `{day}`, `{a}`, `{b}`, `{left}`, `{hours}` giống nhau giữa EN và VI.
- Không dịch tiêu đề sự kiện; VI có dấu đầy đủ.
Risk: lệch EN/VI (đã kiểm bằng đếm). Chạm file dùng chung nên **phải nối tiếp** sau SH-4 và **trước** SW-UI-1/2.

#### SW-UI-1: kho, deck, cử chỉ, tích hợp URL, đăng xuất
ID: SW-UI-1
Owner Agent: web-client-agent
Goal: Chế độ `view=swipe` dùng được: kho localStorage, hàng đợi 12 thẻ, cử chỉ + nút + phím, hoàn tác, tải ngầm, trạng thái, tích hợp URL/bộ chuyển, xoá khi đăng xuất.
Scope: 11.0 điểm 1, 3, 4, 5. Sheet và tổng kết là của SW-UI-2; SW-UI-1 chỉ gắn chúng qua giao diện cố định ở dưới.
Allowed files:
- `apps/web-client-side/app/_lib/swipe-store.ts` (mới)
- `apps/web-client-side/app/_components/auth-provider.tsx` (chỉ phần `signOut` và `useRef` user)
- `apps/web-client-side/app/(shell)/discover/_components/discover-url.ts`
- `apps/web-client-side/app/(shell)/discover/_components/discover-filters.tsx` (chỉ `ViewToggle`)
- `apps/web-client-side/app/(shell)/discover/_components/discover-screen.tsx`
- `apps/web-client-side/app/(shell)/discover/_components/swipe/swipe-deck.tsx`, `swipe-card.tsx`, `use-swipe-gesture.ts`, `swipe-states.tsx` (mới)
- `apps/web-client-side/next.config.ts` (chỉ thêm `allowedDevOrigins` từ env)
Do not edit: `swipe-sheet.tsx`, `swipe-summary.tsx` (SW-UI-2), `use-discover-query.ts`, `event-card.tsx`, `_lib/api.ts`, `packages/**`, `apps/api/**`, `pnpm-lock.yaml`.
Inputs (giao diện cố định để SW-UI-2 làm song song, SW-UI-1 tạo bản stub rỗng cùng tên file nếu SW-UI-2 chưa xong; SW-UI-2 thay thế nội dung stub):
- `SwipeSheet`: `{ event: EventResponseT | null; open: boolean; saved: boolean; onClose(): void; onToggleSave(): void; onChanged(e: EventResponseT): void; returnFocusTo: React.RefObject<HTMLElement | null> }`
- `SwipeSummary`: `{ saved: SavedItem[]; skipped: SkippedItem[]; loaded: EventResponseT[]; joinedThisRound: string[]; roundSeen: number; canUndo: boolean; hasMoreCards: boolean; storageDegraded: boolean; onKeepSwiping(): void; onBackToDeck(): void; onUndo(): void; onRemoveSaved(id: string): void; onShowAgain(id: string): void; onChanged(e: EventResponseT): void }`
- `SavedItem`/`SkippedItem` export từ `swipe-store.ts` (SW-UI-1 là chủ).
Dependencies: SW-I (key i18n + type `MessageKey`), SW-BE (`selectSwipeCandidates`, `DEFAULT_EVENT_DURATION_MINUTES`).
Acceptance slice: S-AC-1, 2, 3, 4 (mở sheet từ chạm/kéo/nút), 6, 8, 12, 13, 14, 15, 16, 17, 19, 20 (lỗi tải + tải thêm), 23, 24, 26, 27 (khoá và dữ liệu cá nhân), 22 (không request ghi). Phải đọc `node_modules/next/dist/docs/` liên quan trước khi viết (theo `apps/web-client-side/AGENTS.md`).
Test lane: screen (Playwright script chạy bởi SW-T); web-client chưa có lane unit, logic thuần đã có test ở SW-BE. Typecheck + build là lane bắt buộc.
Definition of Done:
- `pnpm --filter @dnc/web-client typecheck` và `pnpm --filter @dnc/web-client build` xanh; `pnpm -r typecheck` xanh; `git diff` không có thay đổi ở `package.json`/`pnpm-lock.yaml`.
- Tự kiểm bằng Playwright 390x844 với `hasTouch: true, isMobile: true` (Chromium; WebKit nếu có sẵn) chạy script ở scratchpad (import `@playwright/test` từ `apps/web-admin-side`): mở `/discover?view=swipe`, vuốt phải/trái bằng `page.touchscreen`/CDP `Input.dispatchTouchEvent` (hoặc `locator.dispatchEvent('pointerdown'...)` với `pointerType: 'touch'`), kiểm `localStorage` chỉ có đúng các khoá S-AC-27, request không có ghi. Chụp ảnh thẻ, tem, tổng kết, trạng thái storage hỏng (chặn `localStorage` bằng `addInitScript`) vào thư mục scratchpad của phiên (không commit ảnh).
- Cuộn trang bằng một ngón ngoài stage vẫn cuộn; kéo ngang trong stage không cuộn trang.
- `?view=swipe` rồi tải lại giữ nguyên chế độ; đổi chip khu vực vẫn giữ `view=swipe` và "Đã lưu (n)".
- Comment tiếng Anh; không `console.log`; không `any`.
Risk: (1) cử chỉ tự viết khác nhau giữa iOS Safari/Android Chrome (L-S7): vì thế `touch-action: none` ở stage, `pointercancel` về chỗ cũ, và SW-T bắt buộc giả lập cảm ứng + chủ dự án thử máy thật qua LAN. (2) Hydration: `getServerSnapshot` rỗng; mọi truy cập `window` nằm trong effect/snapshot. (3) Vòng lặp tải ngầm khi lọc hết thẻ (đã có `loadMoreFailed`/`hasMore` chặn). (4) `signOut` đổi hành vi dùng chung: chỉ thêm một lệnh xoá có try/catch, không đổi luồng gọi. (5) Phản hồi cũ về muộn sau đổi bộ lọc đã được `useDiscoverQuery` xử lý (sequence), không viết lại.

#### SW-UI-2: sheet chi tiết + RSVP và tổng kết trùng giờ
ID: SW-UI-2
Owner Agent: web-client-agent (worker thứ hai; file hoàn toàn rời SW-UI-1)
Goal: `SwipeSheet` (dialog gốc + RSVP tái dùng `joinOccurrence`/`cancelRsvp`/`requireAuth`) và `SwipeSummary` (nhóm đã lưu/đã tham gia/đã bỏ qua, cảnh báo trùng giờ, làm mới bằng `getEvent`).
Scope: D-S4 (làm mới/dọn mục), D-S10, D-S11 (hiển thị), D-S12c phần nội dung tổng kết, D-S15 ghi chú thiết bị.
Allowed files: `apps/web-client-side/app/(shell)/discover/_components/swipe/swipe-sheet.tsx`, `swipe-summary.tsx` (mới; thay stub của SW-UI-1).
Do not edit: mọi file khác (kể cả `swipe-store.ts`, `swipe-deck.tsx`, `event-card.tsx`, `_lib/api.ts`). Nếu cần hàm bổ sung ở store hay `api.ts`, báo Coordinator thay vì tự sửa.
Inputs: giao diện cố định ở SW-UI-1; hành vi RSVP đúng `event-card.tsx:36-72` (kể cả L-4: đã bắt đầu thì ẩn nút Tham gia, giữ nút Huỷ nếu đã RSVP; `translateApiError` ở `_lib/api-error.ts` cho `messageKey` của server; guest bấm Tham gia thì `requireAuth(() => void join())` rồi quay lại đúng URL hiện tại, `login-prompt.tsx` hiện đã lo). Làm mới `getEvent(id)` với tối đa 5 yêu cầu đồng thời, huỷ bằng `AbortController` khi rời tổng kết; 404/không còn `published`/đã huỷ thì dòng `discover.swipe.summary.unavailable` + nút Bỏ lưu và loại khỏi tính trùng giờ; mục đã kết thúc thì gọi `onRemoveSaved`. Trùng giờ: `findTimeClashes(savedAvailable)` cộng `findTimeClashesAgainst(savedAvailable, joined)` với `joined` = các sự kiện trong `loaded` có `viewerRsvpStatus !== null` (không nằm trong `saved`); câu cảnh báo qua `discover.swipe.summary.clash`/`clashJoined`, `{day}` dạng thứ theo `Asia/Ho_Chi_Minh` bằng helper có sẵn trong `_lib/datetime.ts`, thêm `endAssumed` khi `assumedEnd`.
Dependencies: SW-I, SW-BE. Chạy song song với SW-UI-1 (khác file); chỉ typecheck đầy đủ được sau khi SW-UI-1 đã đưa `SavedItem`/`SkippedItem` lên (thứ tự merge: SW-UI-1 trước, SW-UI-2 sau).
Acceptance slice: S-AC-4 (nội dung sheet), 5, 7, 9, 10, 11, 18, 20 (lỗi Tham gia), 21, 22 (RSVP dùng endpoint hiện có), 23 (sheet: bẫy focus, `Esc`, trả focus), 24 (sheet không hiệu ứng), 25.
Test lane: screen (SW-T). Unit không áp dụng cho UI; phần thuần đã có test ở SW-BE.
Definition of Done:
- `pnpm --filter @dnc/web-client typecheck` và `build` xanh; `pnpm -r typecheck` xanh.
- Tự kiểm bằng Playwright 390px `hasTouch`: sheet có đủ trường (tiêu đề, giờ ICT, khu, chỗ, host, Tham gia/Join waitlist, Lưu, liên kết `/events/{id}`, dòng `rsvpNote`); `Esc` đóng và focus về nút gọi; Tab không thoát khỏi sheet; guest bấm Tham gia mở luồng đăng nhập, không có `POST /rsvps`; tổng kết hiện cảnh báo cho cặp seed (overlap A/B/C, open-ended D/E/F, RSVP demo_anna) khớp S-AC-9/10/11. Ảnh vào scratchpad.
- Chuỗi hiển thị đủ EN và VI, không lộ key thô.
Risk: RSVP đồng thời/sức chứa không đổi (ràng buộc thật ở server, `EventCard` cũng chỉ ẩn nút phía client); "đã bắt đầu" chưa được server cưỡng chế (đã ghi ở mục 6). `<dialog>` cần Safari ≥ 15.4 (chấp nhận). `title` sự kiện là chuỗi người dùng nhập: chỉ render dạng text node.

#### SW-T: Screen lane (Chromium + WebKit + giả lập cảm ứng) và thử thiết bị thật
ID: SW-T
Owner Agent: tester-agent (không sửa file nguồn; ảnh và script ở scratchpad)
Goal: Nghiệm thu S-AC-1..29 trên giả lập cảm ứng, và chuẩn bị đường thử trên điện thoại thật cho chủ dự án.
Scope: bảng ca dưới.
Allowed files: không sửa file repo. Script và ảnh ở thư mục scratchpad của phiên. Playwright import từ `apps/web-admin-side/node_modules` (`@playwright/test` 1.63.0; `pnpm --filter @dnc/web-admin exec playwright install webkit chromium` chỉ tải trình duyệt, không đổi repo).
Do not edit: mọi file trong repo.
Inputs: seed demo (`pnpm --filter @dnc/api seed:demo`), DB dev, API chạy riêng như mục 10.
Dependencies: SW-BE, SW-I, SW-UI-1, SW-UI-2 đều đã merge.
Acceptance slice: toàn bộ S-AC (đối chiếu từng ca, BA đối chiếu lại sau).
Test lane: screen (Chromium 390x844 + 390x667 + 1280x800; WebKit 390x844; `hasTouch: true, isMobile: true` ở mobile), regression, một lượt EN và một lượt VI.
Definition of Done:
- Lệnh nền: `pnpm -r typecheck`, `pnpm --filter @dnc/domain test`, `pnpm --filter @dnc/web-client build`, toàn bộ API e2e và Playwright admin hiện có vẫn xanh (regression).
- Ca bắt buộc (mỗi ca ghi Chromium và WebKit): S-AC-1/2/3/6 (vuốt thật bằng cảm ứng + nút + phím trên 1280), S-AC-4/5/21 (sheet, đăng nhập `demo_anna`), S-AC-7/8 (đủ 12 thẻ, tải ngầm khi còn ≤ 3), S-AC-9/10/11 (cảnh báo từ seed), S-AC-12/13/14 (ngưỡng 28%/22%/800 px/s, kéo chéo, cuộn ngoài stage), S-AC-17/18/19 (đầy 50 qua script điền localStorage, hết hạn, hai tab bằng hai page cùng context, gộp guest→user, đăng xuất xoá khoá userId nhưng giữ `guest`), S-AC-20 (chặn `/api/v1/events` bằng `route.abort`, chặn storage bằng `addInitScript`), S-AC-23 (bàn phím + `aria-live` + focus), S-AC-24 (`reducedMotion: 'reduce'`), S-AC-25 (EN/VI, không lộ `discover.swipe.`), S-AC-26 (390 và 1280, không cuộn ngang, nút ≥ 44 px bằng `boundingBox`), S-AC-27/22 (đọc `localStorage`, ghi lại mọi request, assert không có ghi ngoài RSVP), S-AC-28/29 (chạy seed hai lần, `NODE_ENV=production` bị từ chối).
- Ảnh (scratchpad): thẻ, kéo qua ngưỡng, sheet, tổng kết có cảnh báo, xem hết, lỗi, storage hỏng, VI 390px, 1280px.
- Thử thiết bị thật (chủ dự án): chạy `DEV_ALLOWED_ORIGINS=http://<LAN-IP>:3000 pnpm --filter @dnc/web-client exec next dev -H 0.0.0.0` (hoặc lệnh dev hiện dùng) cùng API; mở `http://<LAN-IP>:3000/discover?view=swipe` trên iPhone Safari và Android Chrome. Báo rõ trong báo cáo nếu đăng nhập qua HTTP LAN bị chặn (xem rủi ro).
- Báo cáo ghi ca đạt/không đạt, lỗi mới (nếu có) kèm S-AC tương ứng.
Risk: Playwright `touchscreen` chỉ có `tap`; kéo cần CDP `Input.dispatchTouchEvent` (Chromium) hoặc `dispatchEvent` `PointerEvent` với `pointerType: 'touch'` (WebKit): ghi rõ cách đã dùng; giả lập không thay máy thật (L-S7). Cookie phiên có thể gắn `Secure` hoặc `SameSite` khiến đăng nhập trên `http://<LAN-IP>` thất bại: kiểm lúc thử LAN, nếu có thì chủ dự án chỉ xem được chế độ guest (Lưu/Bỏ qua/tổng kết) trên điện thoại, RSVP kiểm bằng giả lập; ghi nhận, không sửa cookie trong đợt này.

### 11.2 Thứ tự và song song (tối đa 4 worker; thực tế 3)

```
Cổng: SH-4 xong (i18n cùng owner)  -- SW-BE không phụ thuộc, bắt đầu ngay
Pha 1 (song song): SW-BE (backend-agent)  |  SW-I (web-client-agent, sau SH-4)
Pha 2 (song song, sau SW-I và SW-BE): SW-UI-1  |  SW-UI-2
Pha 3: SW-T
```
- SW-UI-1 và SW-UI-2 khác file nên song song được; SW-UI-1 tạo stub `swipe-sheet.tsx`/`swipe-summary.tsx` đúng giao diện ở 11.1 để build không vỡ, SW-UI-2 ghi đè nội dung stub (đây là điểm giao duy nhất; hai agent không sửa cùng file ở cùng lúc vì SW-UI-1 chỉ tạo file nếu chưa tồn tại và không chạm lại).
- Nếu muốn có bản xem sớm cho chủ dự án: sau SW-UI-1 (kèm stub) đã có Lưu/Bỏ qua/Hoàn tác/phím, thử qua LAN ngay; sheet và tổng kết đến sau với SW-UI-2.

### 11.3 File dùng chung phải nối tiếp
- `packages/i18n/{messages/en.json,messages/vi.json,src/message-keys.ts}`: SH-3 → SH-4 → SW-I (một owner, không ai khác sửa; nếu SW-UI-1/2 cần key mới, xin owner SW-I chạy lại, không tự thêm).
- `packages/domain/src/index.ts`: SH-2 đã xong; SW-BE chỉ thêm export, chạy khi không có card nào khác sửa file này.
- `apps/web-client-side/app/(shell)/discover/_components/discover-screen.tsx` và `discover-url.ts`: chỉ SW-UI-1 trong đợt Swipe; các card WC-2/WC-3 trước đó phải đã xong (đang chờ commit). `_lib/api.ts` không bị chạm.
- `apps/web-client-side/app/_components/auth-provider.tsx`: chỉ SW-UI-1.
- Không có thay đổi `pnpm-lock.yaml` trong phần Swipe.

### 11.4 Rủi ro tổng hợp (đặc thù dự án)
- **Đồng thời RSVP/sức chứa:** không đổi; RSVP chỉ từ sheet qua `joinOccurrence` hiện có; server giữ ràng buộc thật. Vuốt không bao giờ gọi API ghi (S-AC-22, DoD của SW-T kiểm bằng ghi lại request).
- **Múi giờ:** giờ hiển thị và `{day}` theo `Asia/Ho_Chi_Minh` (helper `_lib/datetime.ts`); so sánh trùng giờ và hết hạn làm trên epoch mili-giây, nên không lệch múi giờ máy. Cần lưu ý vùng nửa đêm: cặp ví dụ 21:00 chạm biên đã nằm trong test.
- **PostGIS/GIST, BullMQ, migration:** không chạm (cùng `GET /events` đã có `from`/`to`; không schema; không job).
- **Dữ liệu cá nhân:** chỉ id sự kiện công khai, tiêu đề, giờ, khu, ghi trên thiết bị; không toạ độ/email/handle/token/`viewerRsvpStatus`; không gửi lên server/analytics; xoá khoá userId khi đăng xuất chủ động; ghi chú thiết bị ở tổng kết (D-S15). Q-S1 (cổng G1/G2) và Q-S2 (xoá khi đăng xuất) giữ mặc định BA, báo chủ dự án xem lại trước M6.
- **Trust/kiểm duyệt/report:** không đổi ngưỡng; deck chỉ `published`; không nội dung mới của người dùng nên không cần đường kiểm duyệt/report mới; tiêu đề sự kiện chỉ render text node.
- **EAS:** không thay đổi nào buộc build lại.
- **Hai nguồn sự thật:** `DEFAULT_EVENT_DURATION_MINUTES` và định nghĩa trùng giờ chỉ ở `packages/domain/src/time-clash.ts`; khoá/schema localStorage chỉ ở `swipe-store.ts`; không viết lại ngưỡng cử chỉ ở hai nơi (hằng số nằm trong `use-swipe-gesture.ts`, nút/phím gọi cùng hàm `commit`).

### 11.5 Câu hỏi còn mở
Không chặn. Hai câu cần chủ dự án biết: (1) Q-S1/Q-S2 giữ mặc định tới M6; (2) đăng nhập qua HTTP LAN trên điện thoại có thể bị cookie chặn (SW-T sẽ xác nhận khi thử), khi đó thử máy thật chỉ xem được phần guest.

Cần Debate Gate: không. Các lựa chọn (kho localStorage, Pointer Events thuần, hàm ở `packages/domain`, `<dialog>` gốc) đều theo phương án đơn giản nhất, không thêm dependency, có tiền lệ trong code.

### 11.6 Ghi chú Coordinator (01/10/2026)

- Seed đã được DM-1 cập nhật trước khi card này chốt: đã có chặn `NODE_ENV=production` (và `DATABASE_URL` không phải localhost), ca "sắp bắt đầu" (dời 06:00 sáng mai khi chạy sau 21:00 giờ VN), bộ ca trùng giờ A/B/C và không `endsAt`. SW-BE chỉ còn phần `packages/domain` và xác minh seed.
- Tên package đúng là `@dnc/web-client` / `@dnc/web-admin` (đã sửa trong card).
- Phân công: SW-BE → backend-agent (W-1); SH-4 → SW-I → SW-UI-2 → web-client-agent W-4; SW-UI-1 → web-client-agent W-2 sau khi xong WC-3.

## 12. Tester SW-T và BA nghiệm thu web-client (01/10/2026)

- **SW-T: GO-with-risks.**
  - List/Map 204 PASS (Chromium/WebKit × EN/VI × 390/1280).
  - Swipe: S-AC PASS 4/4 trừ các bug dưới.
  - LAN qua WebKit iPhone hydrate được.
  - Bug: B1 (P2, `useFreshSaved` bỏ sót khi effect bị huỷ), B2 (P2, race giữa RSVP chờ sau đăng nhập và reload deck), B3 (P3, viền trùng giờ ở dòng đã lưu), B4 (P3, Esc không trả focus), B5 (P3, nút < 44px ở 1280), B6 (UX, deck dưới màn đầu ở 390×844, coach che thông tin).
- **BA: chấp nhận có điều kiện.** B1 và B2 phải xong trước commit; B6 nên xong trước commit. Card **SW-F** sửa cả 6 bug, sau đó Tester kiểm lại hẹp (B1, B2, B6, S-AC-21 chạy nhiều lần), rồi commit.
- **Follow-up có tên:**
  - FU-S-SEED: chạy seed với `--reset`/`--purge` và `NODE_ENV=production` (S-AC-28/29).
  - FU-S-DEVICE: cử chỉ và cuộn một ngón trên iPhone thật (S-AC-14, L-S7). Chủ dự án thử theo danh sách 11 bước của BA.
  - FU-S-12: ca draft và ca đã bắt đầu 1 giờ ở lane integration.
  - FU-S-AUDIT: xác nhận Lưu/Bỏ qua không ghi AuditLog.
  - FU-S-NEARME: near-me rỗng riêng cho swipe.
  - Nếu SW-F chưa sửa thì B4/B5 phải xong trước M6.
- Câu hỏi mở cho chủ dự án trước M6: Q-S1 (cổng G1/G2), Q-S2 (đăng xuất có xoá danh sách đã lưu không). Không chặn commit.
- **SW-T2 (kiểm lại hẹp sau SW-F): GO-with-risks.**
  - B1–B5 PASS (Chromium/WebKit × EN/VI). B2 chạy 20/20 lần sạch. Không có hồi quy mới.
  - Đăng nhập làm mới danh sách tại chỗ ở List/Map: 28/28 PASS.
  - B6 còn lỗi: VI + bộ lọc đang bật thì tràn ngang ở 360–390px. Sửa ở **SW-F2** trước khi commit.
  - Fail còn lại là lỗi assertion của script: trust403 VI, popup "đủ người" của wc3.
  - Dữ liệu dev: lượt test làm lệch RSVP seed của `demo_anna`/`demo_minh`/`demo_linh` (nhiều `waitlisted` hơn baseline). Chạy lại seed demo khi chủ dự án muốn trạng thái chuẩn.
- **SW-F2 xong:** VI kèm bộ lọc không còn tràn ngang ở 320–390 (`swf2.cjs` BAD 0 trên Chromium và WebKit). Sheet của sự kiện đã tham gia ẩn dòng `rsvpNote`. `sw1..sw5` không có fail mới. Đủ điều kiện BA (B1, B2, B6), nên **commit web-client, cổng G0 mở** cho các card Social web (S2-3, S2-4, S3-2, S3-3, S4-2, S4-3) và AD-17/AD-18.
- Follow-up: top bar trên phone cắt tên thương hiệu ("Da Nan…") là hành vi có từ trước của `shell/top-bar.tsx`; xử lý ở lượt thiết kế lại.
