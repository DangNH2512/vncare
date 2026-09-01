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
