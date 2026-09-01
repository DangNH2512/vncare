# Nhật Ký Quyết Định — Da Nang Connect

Ghi các quyết định bền vững, có ảnh hưởng dài hạn. Mỗi quyết định một mục, không sửa
mục cũ — quyết định đổi thì thêm mục mới và trỏ ngược lại mục bị thay thế.

Khuôn: `## [YYYY-MM-DD] <Quyết định>` + **Bối cảnh** / **Lựa chọn** / **Hệ quả** / **Thay thế cho** (nếu có).

## [2026-08-31] Giai đoạn 1 làm Kết nối cộng đồng, không làm Nhà ở trước

**Bối cảnh:** Dữ liệu 3.504 bài đăng expat Đà Nẵng cho thấy nhà ở được nhắc nhiều
nhất, nhưng sự kiện + thể thao cộng lại (809 bài) vượt nhà ở (349 bài), và bài về
sự kiện tăng gấp 10 lần trong T5–6/2026.

**Lựa chọn:** Bắt đầu bằng sự kiện / thể thao / trao đổi ngôn ngữ.

**Hệ quả:** Rủi ro thấp nhất — không cần xác thực chuyên môn, không có bên thứ ba
trong giao dịch tiền. Đổi lại, giá trị mỗi giao dịch thấp nên phải đạt quy mô người
dùng mới có doanh thu. Nhà ở lùi sang giai đoạn 2, y tế giai đoạn 3.

## [2026-08-31] Không scraping tự động từ nền tảng nguồn

**Bối cảnh:** Cần nội dung mồi để app không trống ngày đầu.

**Lựa chọn:** Đội sáng lập curate thủ công, ghi rõ nguồn, có quy trình gỡ bỏ khi
người tổ chức gốc yêu cầu. Cột `collection_method` mặc định `manual_only` kèm ràng
buộc CHECK ở tầng database.

**Hệ quả:** Tránh rủi ro pháp lý và rủi ro app gãy đột ngột khi nền tảng nguồn đổi
chính sách. Đổi lại tốn công người trong giai đoạn đầu, nhưng chính việc tiếp cận
thủ công lại tạo cớ tự nhiên để chuyển đổi người tổ chức sang tự quản lý listing.

## [2026-08-31] Stack: NestJS + TypeORM + PostgreSQL/PostGIS, Next.js, Expo

**Bối cảnh:** Đội ngũ đã thành thạo bộ công cụ này; sản phẩm cần truy vấn theo khu
vực và bán kính ngay từ MVP.

**Lựa chọn:** Xem `docs/analysis/04-tech-stack-va-kien-truc.md`.

**Hệ quả:** PostGIS cho phép lọc theo `area_id` và theo bán kính trên cùng một bảng,
không cần dịch vụ tìm kiếm riêng ở giai đoạn đầu.

## [2026-08-31] Mọi module backend bắt buộc có layer DTO request/response

**Bối cảnh:** Trả entity TypeORM thẳng ra API làm rò trường nội bộ và khoá cứng lược
đồ database vào hợp đồng API.

**Lựa chọn:** 4 class lõi + `dto/request/` + `dto/response/` + mapper. DTO gần giống
nhau thì kế thừa bằng mapped type của `@nestjs/swagger`, không chép lại. Ở ranh giới
riêng tư dùng `PickType` (danh sách trắng) chứ không `OmitType`.

**Hệ quả:** Xem `.agent/rules/backend-module-structure.md` §2 và §2.1.

## [2026-09-01] Thêm hai thực thể mới ngoài tài liệu domain: `posts` và `reactions`

**Bối cảnh:** `docs/analysis/03-domain-va-du-lieu.md` §8 chỉ thiết kế `comments`,
`conversations`, `messages`. Chủ dự án yêu cầu CRUD cho "post" và "react".

**Lựa chọn:** `posts` là bài đăng cộng đồng — không có thời gian, sức chứa hay RSVP;
ranh giới với `events` được cưỡng chế bằng hình dạng bảng chứ không bằng quy ước.
`reactions` dùng ba FK thật (`post_id` / `comment_id` / `event_id`) kèm CHECK
`num_nonnulls = 1`, không dùng cặp `target_type`/`target_id` — §1.2 chỉ cho phép 5
bảng polymorphic và đây không nằm trong số đó. Un-react là hard delete, cùng lý do
với `follows`.

**Hệ quả:** Mở rộng phạm vi sản phẩm — nền tảng có thêm một luồng nội dung không phải
sự kiện. Migration `0004`/`0005`. Tài liệu 03 §8 cần cập nhật để phản ánh hai bảng này.

## [2026-09-01] Hợp đồng API dùng Zod + Standard Schema, không dùng DTO class

**Bối cảnh:** `.agent/rules/backend-module-structure.md` §2 và skill `security-review`
mô tả `class-validator` + DTO class + `@ApiProperty`. Code thật đã chuyển sang
NestJS 12 với `StandardSchemaValidationPipe` và schema Zod trong `@dnc/contracts`.

**Lựa chọn:** Theo code hiện tại. Ranh giới hợp đồng vẫn được giữ đúng tinh thần —
response được validate và cắt bớt bằng `@SerializeOptions({ schema })`, trường nội bộ
không lọt ra, OpenAPI sinh từ chính schema đó.

**Hệ quả:** Hai tài liệu trên đã lệch thực tế. Cần sửa lại chúng, hoặc ghi nhận độ
lệch này là có chủ đích. Xem `.agent/rules/skill-first.md` §S3.

## [2026-09-01] Bác bỏ "zone đỏ nở theo số người tham gia" trên bản đồ

**Bối cảnh:** Đề xuất của chủ dự án cho tính năng bản đồ.

**Lựa chọn:** Giữ mục tiêu (bản đồ thể hiện mật độ và sự sống), đổi cách mã hoá.
Lý do chặn: bán kính tính bằng mét đổi kích thước pixel theo zoom, nên zone bán kính
500 m chỉ 27 px ở zoom 12 nhưng 436 px ở zoom 16 — trong khi An Thượng chỉ rộng
1.177 m. Không có giá trị bán kính nào thoả mãn cả hai đầu. Cộng thêm xung đột với
`location_precision` và với thông điệp an toàn của màu đỏ.

**Hệ quả:** Phân tầng theo zoom (chip khu vực → cụm → pin), số người mã hoá bằng 3 bậc
pixel cố định, "ping" giữ lại nhưng mang nghĩa "đang diễn ra". Đầy đủ ở
`docs/analysis/13-ban-do-va-truc-quan-hoa-su-kien.md`.

## [2026-09-01] Area id chuyển về `packages/geo` làm nguồn duy nhất

**Bối cảnh:** `apps/web-client-side/app/_lib/areas.ts` giữ một bảng `AREA_IDS` viết tay,
trong khi bảng `areas` lẽ ra được materialize từ geodata. Hai nguồn, chắc chắn lệch.

**Lựa chọn:** Đưa `id` vào `da-nang-areas.v0.draft.json`, export qua `@dnc/geo`.
Seed `apps/api/src/database/seeds/seed-areas.ts` và web client cùng đọc từ đó.

**Hệ quả:** Đổi ranh giới khu vực là một PR dữ liệu cộng một lần chạy seed. `AREA_IDS`
đã bị xoá khỏi web client.

## [2026-09-01] Ảnh/video đi thẳng lên object storage bằng presigned URL

**Bối cảnh:** Composer cần đăng kèm tối đa 5 ảnh/video.

**Lựa chọn:** Bảng `media` + module `media` với hai bước — `POST /api/v1/media/uploads`
trả presigned PUT, client tải thẳng lên MinIO, rồi `PUT /api/v1/media/:id/complete`.
API không bao giờ đệm byte. Khoá lưu trữ sinh từ id phía server, không lấy từ tên file
client gửi. URL đọc là presigned GET ngắn hạn (1 giờ), không phải link công khai vĩnh
viễn — ảnh người dùng không phải object công khai và một URL bền sẽ sống lâu hơn mọi
quyết định kiểm duyệt về bài đăng mang nó.

**Hệ quả:** Cần `docker compose up -d minio` (cổng 9002) khi chạy local. Bucket tự tạo
lúc khởi động. Còn thiếu: job quét dọn `media` ở trạng thái `pending` quá hạn.

## [2026-09-01] `@dnc/contracts` cố ý KHÔNG khai báo `"type": "module"`

**Bối cảnh:** Thêm `.js` vào import nội bộ của `contracts` làm `tsc` (nodenext của
`apps/api`) hết lỗi nhưng **làm hỏng hoàn toàn web app** — Turbopack resolve `./common.js`
theo đúng chữ và không tìm ra `common.ts`. Metro của React Native cũng vậy.

**Lựa chọn:** Import nội bộ để **không đuôi** (đúng quy ước sẵn có của `@dnc/domain`,
`@dnc/i18n`), và bỏ `"type": "module"` khỏi `packages/contracts/package.json`. Package
này là source-only, luôn được bundler xử lý, không bao giờ được Node nạp như ESM thô —
nên khai báo nó không phải ESM là đúng sự thật, và `tsc` thôi đòi đuôi `.js`.

**Hệ quả:** Landmine tương tự vẫn còn ở `@dnc/domain`, `@dnc/geo`, `@dnc/i18n`,
`@dnc/tokens` — chúng là `"type": "module"` với import không đuôi, sẽ lỗi typecheck ngay
khi `apps/api` import tới. Đã ghi T-06 trong ACTIVE_TASKS.

## [2026-09-01] Gallery của bài đăng không giới hạn số mục; feed chỉ hiển thị 5

**Bối cảnh:** Yêu cầu ban đầu ghi "(xem được tối đa 5 chỉ mục)". Bản đầu tiên hiểu
thành trần cứng 5 và chặn upload thứ 6 — sai ý.

**Lựa chọn:** Hai con số tách biệt. Kho lưu trữ **không có trần**: `ck_posts_media_ids`
đã bị gỡ, `mediaIds` trong contract không `.max()`. `MAX_GALLERY_PREVIEW = 5` chỉ là
ngân sách hiển thị của thẻ trong feed — vượt quá thì gộp phần còn lại sau nút "+N",
bấm vào bung hết tại chỗ. Bộ đếm trên carousel luôn báo tổng thật (`1/7`), không báo
theo lát cắt.

**Hệ quả:** Giới hạn duy nhất còn lại là body size của HTTP (~100 kB, tương đương
~2.700 uuid) — xa hơn mọi gallery thật. Cần theo dõi chi phí ký URL khi gallery lớn;
hiện `GET /posts` vẫn ký toàn bộ, nên nếu xuất hiện bài vài trăm ảnh thì phải cắt về
đúng lát preview (đã ghi T-09).

## [2026-09-01] Đặt chỗ media phải nguyên tử trong một câu lệnh

**Bối cảnh:** Bản đầu `MediaRepository.create` INSERT `storage_key = ''` rồi UPDATE.
Qua mọi test tuần tự, và hỏng ngay khi người dùng chọn nhiều ảnh cùng lúc: hai bản ghi
cùng giữ khoá rỗng và đụng `uq_media_storage_key`.

**Lựa chọn:** Sinh id ngay trong câu lệnh (`WITH reserved AS (SELECT uuidv7() ...)`) và
dựng `storage_key` từ id đó trong cùng INSERT.

**Hệ quả:** Đã thêm test bắn 8 request đặt chỗ song song — test này sẽ bắt lại đúng lỗi
trên nếu ai đó quay về cách hai bước.

## [2026-09-01] Auth: JWT RS256 trong bộ nhớ + refresh token httpOnly, proxy qua Next

**Bối cảnh:** Yêu cầu "chỉ ai có tài khoản mới đăng post/react/comment".

**Lựa chọn:** Access token RS256 sống 15 phút, giữ trong **biến module** phía client,
không bao giờ vào `localStorage`. Refresh token 30 ngày là **cookie httpOnly**,
`Path=/api/v1/auth`, `SameSite=Lax`, chỉ lưu SHA-256 trong `auth_sessions`. Mật khẩu
băm bằng Argon2id (`@node-rs/argon2`). Đăng nhập sai và tài khoản không tồn tại trả về
**hoàn toàn giống nhau**, và cả hai đều trả giá một lượt verify Argon2 để không dò được
ai có tài khoản.

`apps/web-client-side` proxy `/api/*` sang API qua `rewrites()` của Next. Không phải
tiện lợi: cookie không set được cross-origin trên HTTP thường nếu thiếu
`SameSite=None; Secure`, mà localhost không có TLS. Cùng origin thì cookie là
first-party, và biến mất luôn preflight CORS.

**Hệ quả:** Guard `JwtAuthGuard` là `APP_GUARD` toàn cục, **deny-by-default** — endpoint
mới không truy cập được cho tới khi có `@Public()`. Guard tự bỏ qua context không phải
HTTP; `ChatGateway` tự xác thực từng message bằng chính token đó. Chưa có xác minh
email, nên đăng ký cấp thẳng T1 (hằng số `TRUST_LEVEL_ON_REGISTER`).

## [2026-09-01] Refresh token có cửa sổ ân hạn 10 giây khi xoay vòng

**Bối cảnh:** Reuse detection nghiêm ngặt đăng xuất người dùng thật. React Strict Mode
gọi effect hai lần → hai request refresh cùng token → cái sau bị coi là replay → thu hồi
cả họ. Hai tab khôi phục cùng lúc cũng vậy.

**Lựa chọn:** Token bị thu hồi **vì rotation** và trong vòng 10 giây được coi là cùng một
request đến hai lần, trả lời bình thường. Mọi trường hợp khác — thu hồi do logout, do
reuse trước đó, hoặc rotation cũ hơn 10 giây — vẫn thu hồi cả họ. Phía client thêm
single-flight cho `refresh()`.

**Hệ quả:** Đánh đổi có tên: token bị đánh cắp và replay trong 10 giây sẽ thành công.
Đó là lý do cửa sổ tính bằng giây. Test tách đôi: một test bắn hai refresh song song
(phải cùng 200), một test làm cũ `revoked_at` bằng SQL rồi replay (phải 401).

## [2026-09-01] Ngày giờ định dạng qua formatToParts, không dùng .format()

**Bối cảnh:** Node và trình duyệt dùng phiên bản ICU khác nhau và bất đồng về dấu phân
cách — Node ra `Tue 1 Sept`, Chrome ra `Tue, 1 Sept`. Server và client sinh chuỗi khác
nhau cho cùng một mốc thời gian → React báo hydration mismatch trên mọi thẻ có ngày.

**Lựa chọn:** `formatToParts()` rồi tự nối, chỉ giữ dấu hai chấm cho giờ. Locale vẫn
quyết định thứ tự trường, tên tháng và hệ chữ số.

**Hệ quả:** Đã gỡ luôn `suppressHydrationWarning` khỏi phần timestamp không còn cần.
Script bootstrap theme chuyển sang `next/script strategy="beforeInteractive"` — React
không bao giờ thực thi thẻ `<script>` nó tự render trên client và sẽ cảnh báo.

## [2026-09-01] Theme quyết định phía server bằng cookie, không dùng script pre-paint

**Bối cảnh:** Console báo *"Encountered a script tag while rendering React component"*.
Lần sửa đầu chuyển sang `next/script strategy="beforeInteractive"` — **không ăn**:
trong App Router nó không được hoist, mà nằm trong RSC payload nên React vẫn render
trên client và vẫn cảnh báo.

**Lựa chọn:** Bỏ hẳn script. `ThemeProvider` ghi cookie `dnc-theme` (đọc được bằng
script, không phải credential); `app/layout.tsx` là Server Component đọc cookie và ghi
thẳng `data-theme` vào thẻ `<html>`. Cookie vắng hoặc `system` thì không ghi thuộc tính
— đúng nhánh `prefers-color-scheme` đã có sẵn trong `globals.css`.

**Hệ quả:** Không còn script pre-paint, không còn flash, và `suppressHydrationWarning`
trên `<html>` đã gỡ được. localStorage không còn giữ theme.

## [2026-09-01] Tên thứ và tháng do dự án sở hữu, không lấy từ Intl

**Bối cảnh:** Hydration mismatch trên mọi thẻ có ngày. Lần sửa đầu chỉ chuẩn hoá **dấu
phân cách** qua `formatToParts` — không đủ, vì bất đồng nằm ở **giá trị**: `en-GB` cho
tháng 9, Node và Chromium ra `Sept` còn Safari ra `Sep`.

**Lựa chọn:** Bảng tên thứ/tháng EN+VI khai báo trong `app/_lib/datetime.ts`. `Intl`
chỉ còn dùng để bóc trường số (ngày, năm, giờ, phút) — những giá trị không phụ thuộc
engine.

**Hệ quả:** Vietnamese đọc đúng kiểu Việt (`T5 4 Th9`) thay vì kiểu Intl. **Bài học về
quy trình:** lần đầu tôi chỉ verify bằng Node và Chromium, cả hai đều ra `Sept`, nên
không thấy lỗi. Từ nay verify UI phải chạy **cả WebKit**, vì chủ dự án dùng Safari.

## [2026-09-01] Một màn hình hồ sơ duy nhất: /u/[handle]

**Bối cảnh:** Có hai màn hình cùng vẽ một con người — `/profile` và `/u/[handle]`.

**Lựa chọn:** Xoá `/profile`. Hồ sơ của chính mình là `/u/<handle của mình>`, thêm nút
Sửa và Đăng xuất khi người xem là chủ. Mục Profile trong nav có `href: null` và được
giải ra lúc render: đã đăng nhập thì trỏ tới handle của mình, chưa thì mở hộp thoại
đăng nhập.

**Hệ quả:** Hai bản gần giống nhau không còn cơ hội trôi dạt. Trang của chính mình gọi
`/me/profile` (có trường riêng tư), trang người khác gọi `/profiles/:handle`.

## [2026-09-01] Route được nav quảng cáo phải tồn tại

**Bối cảnh:** `/discover`, `/my-events`, `/notifications` và `/events/new` đều 404 —
trong đó `/events/new` là nút CTA to nhất màn hình.

**Lựa chọn:** `app/not-found.tsx` cho URL không khớp, cộng bốn trang giữ chỗ dùng chung
component `BlankScreen`. Một mục nav dẫn vào ngõ cụt tệ hơn một mục nói "chưa xong".

**Hệ quả:** Mọi đích trong nav trả 200. Khi màn hình thật xong thì thay nguyên file.

## [2026-09-01] Form trong dialog phải reset khi mở lại

**Bối cảnh:** Sau khi đăng xuất rồi đăng nhập lại, nút kẹt ở "Please wait..." và
**không có request HTTP nào** được gửi. Chủ dự án nghi logout không kết thúc session.

**Chẩn đoán:** Không liên quan tới token. `AuthForm` chỉ đặt `submitting = false`
trong nhánh `catch`; khi đăng nhập **thành công** thì cờ này ở lại `true` mãi. Một
`<dialog>` đã đóng vẫn còn mounted, nên lần mở sau `canSubmit` là false và `submit()`
return ngay dòng đầu — nút thì vẫn hiển thị "Please wait...". Lỗi thứ hai đi kèm:
`mode` của dialog cũng persist, nên ai từng bấm sang "Create account" thì lần sau mở ra
vẫn là form đăng ký.

**Lựa chọn:** `setSubmitting(false)` trong `finally`; `AuthForm` chỉ mount khi dialog
mở; `mode` reset về `signIn` mỗi lần mở.

**Bằng chứng logout vẫn đúng:** phát lại refresh token cũ sau khi đăng xuất trả về
**401** ở cả WebKit lẫn Chromium — session thật sự bị thu hồi phía server, cookie cũng
bị xoá khỏi trình duyệt.

**Bài học:** một `<dialog>` đóng **không** unmount. Mọi state cục bộ trong dialog phải
reset khi mở, hoặc component phải mount theo trạng thái mở.
