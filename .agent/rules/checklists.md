---
description: Checklist tra nhanh — chạy trước khi đánh dấu bất kỳ task nào là done.
---

# Checklists — Chạy Trước Khi Báo Done

> Đây là các cổng BẮT BUỘC. Bỏ qua bất kỳ mục nào = task CHƯA done.

---

## ✅ Checklist Pre-Done (mọi task)

```
□ pnpm --filter @dnc/api typecheck      → 0 errors (apps/api)
□ pnpm --filter @dnc/web-client typecheck → 0 errors (apps/web-client-side)
□ pnpm --filter @dnc/web-admin typecheck  → 0 errors (apps/web-admin-side, nếu có chạm)
□ pnpm --filter @dnc/mobile typecheck   → 0 errors (apps/mobile, nếu có chạm)
□ Quan sát thật (REALITY)   → mở web/simulator thật, đi hết flow, mô tả cái THẤY
□ Triangulate               → UI ↔ API response ↔ DB khớp nhau (observe-reality.md §C)
□ Behavior-smells sweep     → quét nhanh checklist trong skills/behavior-smells
□ Cross-surface check       → nếu sửa file dùng chung (xem mục bên dưới)
□ i18n checklist            → chạy mục i18n bên dưới
□ Timezone checklist        → chạy mục timezone bên dưới
□ Audit log                 → mọi hành động kiểm duyệt/cưỡng chế ghi moderation_audit_log
□ DAILY_TASKS.md            → cập nhật trạng thái `done`
```

> ⚠️ "Quan sát thật" nghĩa là **mở app thật, đi flow thật, mô tả đúng cái nhìn thấy**.
> Không phải "code trông đúng nên chắc ổn". Xem `.agent/rules/observe-reality.md`.

---

## 🌐 Checklist i18n (EN mặc định, VI thứ hai)

Người dùng chính là expat nên **tiếng Anh là ngôn ngữ mặc định của UI**; tiếng
Việt là ngôn ngữ thứ hai. Chạy sau khi thêm/sửa BẤT KỲ màn hình nào (page, modal,
component, form, màn mobile):

```
□ Mọi text người dùng thấy đều đi qua t('key') — không hardcode chuỗi EN hay VI
□ Key mới thêm vào CẢ HAI: packages/i18n/en.json và packages/i18n/vi.json
□ Key đặt theo <namespace>.<screen>.<element> (vd: event.detail.rsvpButton)
□ Đổi ngôn ngữ UI sang Vietnamese → không còn raw key nào lộ ra
□ Giá trị động dùng interpolation t('key', { name }) — không nối chuỗi
□ Thông báo toast/alert/error, placeholder, aria-label đều dùng t()
□ Message của rule validation (Zod / class-validator) dùng key i18n
□ Web: route [locale] xử lý được cả /en/... và /vi/...
□ Không có tiếng Việt lọt vào source code (comment, JSDoc, tên biến, log string)
```

**Vị trí file locale:**
```
packages/i18n/en.json   ← English (mặc định)
packages/i18n/vi.json   ← Tiếng Việt
```

> Thêm key vào một locale thì BẮT BUỘC thêm vào locale còn lại trong cùng thay đổi.

---

## 🕐 Checklist Timezone (Asia/Ho_Chi_Minh)

Sự kiện gắn chặt với thời điểm nên đây là nguồn bug kinh điển:

```
□ DB lưu timestamptz theo UTC — không bao giờ lưu giờ local dạng chuỗi
□ API trả ISO-8601 có offset; không trả chuỗi đã format sẵn cho người dùng
□ Hiển thị quy đổi sang timezone của người xem, mặc định Asia/Ho_Chi_Minh
□ Bộ lọc "hôm nay / cuối tuần này" tính theo ngày local Đà Nẵng, không theo UTC
□ Sự kiện lặp (EventOccurrence) sinh theo giờ local, không cộng 24h máy móc
□ Job nhắc lịch (BullMQ) đặt theo mốc UTC đã quy đổi, kiểm tra qua mốc DST của
  các quốc gia khác nếu có người tham dự ở múi giờ khác
```

---

## 📍 Checklist truy vấn địa lý (PostGIS)

Chạy khi task chạm tới khu vực, bản đồ, bán kính, hay bộ lọc theo vị trí:

```
□ Cột toạ độ dùng geography(Point,4326) — không dùng cặp float rời rạc
□ Truy vấn bán kính dùng ST_DWithin (không dùng ST_Distance trong WHERE)
□ Có index GIST trên cột geography trước khi mở tính năng ra production
□ Khu vực Đà Nẵng lấy từ bảng areas đã seed: My Khe, An Thuong, My An,
  Hai Chau, Son Tra, Ngu Hanh Son — không hardcode danh sách trong FE
□ Tìm không dấu hoạt động: gõ "an thuong" ra "An Thượng" (extension unaccent)
□ EXPLAIN ANALYZE trên truy vấn mới → có dùng index, không seq scan bảng events
□ Sự kiện không có toạ độ vẫn hiển thị đúng (fallback theo area, không rơi khỏi list)
```

---

## 🎟️ Checklist RSVP / hàng chờ / no-show

```
□ Đếm chỗ trống nguyên tử (SELECT ... FOR UPDATE hoặc ràng buộc DB) — không đếm ở service
□ Vượt sức chứa → vào waitlist, không phải lỗi 500
□ Có người huỷ → job thăng hạng waitlist chạy và gửi thông báo
□ Bấm RSVP hai lần liên tiếp không tạo hai bản ghi (idempotent)
□ Huỷ sát giờ / không đến được ghi nhận thành tín hiệu no-show, có ngưỡng rõ ràng
□ No-show ảnh hưởng trust_score theo đúng công thức trong
  docs/analysis/05-trust-safety-va-kiem-duyet.md — không tự chế điểm phạt
□ Organizer thấy được danh sách người tham dự theo đúng quyền; member khác thì không
□ Sự kiện đã đóng/huỷ không cho RSVP mới, thông báo lý do rõ ràng
```

---

## 🛡️ Checklist kiểm duyệt nội dung người dùng tạo (UGC)

Mọi nội dung do người dùng tạo (sự kiện, ảnh, mô tả, bình luận, hồ sơ) đều đi qua
đây:

```
□ Tier tin cậy được kiểm ở API layer, không chỉ ẩn nút ở UI
□ Organizer T0/T1 → nội dung vào hàng đợi pre-publish review, không đăng thẳng
□ Có nút báo cáo (report) trên mọi bề mặt hiển thị nội dung người dùng
□ Rate limit theo tier áp ở backend (Redis sliding window), không ở client
□ Phát hiện trùng lặp chạy trước khi tạo sự kiện mới
□ Mọi hành động cưỡng chế (ẩn, gỡ, khoá, cảnh cáo) ghi moderation_audit_log
  kèm actor, lý do, bằng chứng — không có "xoá im lặng"
□ Người bị xử lý nhận được thông báo và đường kháng nghị
□ Ảnh upload đi qua presigned URL + kiểm tra kiểu/kích thước ở server
```

---

## 🔔 Checklist push notification (Expo)

```
□ Push token lưu vào push_tokens kèm platform, thu hồi khi logout/gỡ app
□ Tôn trọng notification_preferences — người tắt loại nào thì không gửi loại đó
□ Nội dung push đi qua i18n theo locale của người nhận, không hardcode tiếng Anh
□ Gửi qua BullMQ job, không gửi đồng bộ trong request HTTP
□ Xử lý phản hồi DeviceNotRegistered từ Expo → vô hiệu hoá token
□ Deep link trong push mở đúng màn hình (event/[id]) cả khi app đang đóng
□ Test thật trên simulator/thiết bị — Expo Push không chạy trên web preview
```

---

## 🗑️ Checklist soft delete

Khi triển khai bất kỳ thao tác xoá nào:

```
□ Dùng deleted_at (timestamptz) — KHÔNG hard-delete thực thể người dùng nhìn thấy
□ Truy vấn mặc định loại bỏ bản ghi có deleted_at IS NOT NULL
□ UI hỏi xác nhận với thông điệp rõ ràng về hệ quả
□ i18n: dùng "deactivate" / "vô hiệu hoá" thay vì "delete" / "xoá" khi thực chất
  là soft delete
□ Yêu cầu xoá tài khoản đi theo luồng ân hạn + ẩn danh, không xoá thẳng hàng users
```

---

## 📝 Checklist audit log kiểm duyệt

Mọi hành động của moderator/admin lên nội dung hoặc tài khoản người khác:

```
□ Ghi moderation_audit_log: actor_id, action, target_type, target_id, reason, evidence
□ Bảng là append-only — không update, không delete bản ghi cũ
□ Ghi trong cùng transaction với hành động thật, không ghi "best effort"
□ Trạng thái trước/sau đều được lưu để tái dựng lại vụ việc
```

```typescript
await this.moderationAuditLog.record({
  action: 'event_unpublished',   // hide | unpublish | suspend | warn | restore
  targetType: 'event',           // event | profile | comment | report
  targetId: id,
  reason: 'duplicate_listing',
  changes: { field: 'status', from: 'published', to: 'hidden' },
});
```

---

## 🖥️ Checklist kiểm tra chéo bề mặt

Chạy khi sửa BẤT KỲ component, hook, package dùng chung nào
(`packages/ui`, `packages/shared-types`, `packages/validation`, `packages/i18n`):

```
□ Web — danh sách sự kiện có lọc khu vực (/en/events?area=an-thuong)
□ Web — trang chi tiết sự kiện + nút RSVP (/en/events/[slug])
□ Web — bản đồ react-leaflet, marker và cụm marker
□ Web — console kiểm duyệt (/en/admin/reports)
□ Mobile — Discover feed và tab Map
□ Mobile — màn chi tiết sự kiện + RSVP + waitlist
□ API — GET /api/v1/events?areaId=...  và POST /api/v1/events/{id}/rsvps
```

---

## 📐 Checklist Swagger (backend)

Mỗi endpoint mới hoặc bị sửa:

```
□ Controller: @ApiTags, @ApiBearerAuth
□ Method: @ApiOperation({ summary: '...' })
□ Method: @ApiResponse({ status: 200, description: '...', type: DtoClass })
□ DTO: @ApiProperty trên TẤT CẢ field
□ Query param: @ApiQuery({ name: '...', required: false })
□ Kiểm tra: http://localhost:3001/api/docs render đúng
□ Chạy lại pnpm --filter @dnc/api openapi:emit và sinh lại packages/api-client
```

---

## 🧱 Checklist module NestJS mới

Khi thêm module backend mới, làm ĐỦ các bước theo thứ tự (xem
[backend-module-structure.md](backend-module-structure.md)):

```
□ 1. Tạo dto/ (validate bằng class-validator hoặc Zod pipe, @ApiProperty đầy đủ)
□ 2. Tạo <name>.repository.ts — toàn bộ truy cập dữ liệu, kể cả SQL PostGIS thô
□ 3. Tạo <name>.service.ts — logic nghiệp vụ, KHÔNG viết SQL
□ 4. Tạo <name>.controller.ts — route + Swagger, không chứa logic nghiệp vụ
□ 5. Tạo <name>.module.ts — nối dây providers / imports / exports
□ 6. Đăng ký vào app.module.ts
□ 7. Guard / decorator / enum dùng chung đặt ở src/common/, không nhét trong module
□ 8. Viết migration nếu có thay đổi schema (không sửa DB bằng tay)
□ 9. Viết spec ở apps/api/e2e/modules/<name>/ (không đặt cạnh src)
□ 10. Kiểm tra Swagger tại http://localhost:3001/api/docs
```

---

## 💬 Checklist tooltip / gợi ý (web)

Chạy sau bất kỳ task UI nào thêm hoặc sửa phần tử tương tác:

```
□ Nút chỉ có icon        → luôn kèm tooltip lấy từ t('...')
□ Nút bị disable         → tooltip giải thích TẠI SAO và cách mở khoá
  (vd: "Cần tier T2 mới tạo được sự kiện công khai")
□ Badge trạng thái mới   → tooltip nếu ý nghĩa không hiển nhiên
  (vd: waitlisted, pending review, hidden)
□ Cột hành động trong bảng → gợi ý ngắn về việc mà mỗi hành động làm
□ Banner cảnh báo        → tooltip hoặc icon (?) kèm giải thích
□ Key tooltip đặt theo <namespace>.<screen>.<element>Hint và có ở CẢ en.json + vi.json
```

---

## 🔐 Checklist quyền riêng tư

Chạy khi task chạm dữ liệu cá nhân:

```
□ Chỉ thu thập dữ liệu có mục đích rõ ràng đã nêu trong chính sách
□ Người dùng đồng ý rõ ràng trước khi xử lý, và rút lại đồng ý được
□ Vị trí chính xác không lộ cho người lạ — chỉ hiện khu vực cho tới khi RSVP được duyệt
□ Log và analytics không chứa PII thô (email, phone, toạ độ nhà riêng)
□ Dữ liệu nhạy cảm (ip, user_agent, raw_profile) có lịch purge đúng hạn
□ Xuất dữ liệu và xoá tài khoản chạy được đầu-cuối
```

---

## 📋 Quy tắc phân loại DAILY_TASKS

**Với MỌI tin nhắn giao việc, phân loại trước:**

| Loại tin nhắn | Hành động |
|---|---|
| Yêu cầu tính năng, cải tiến, setup | Thêm vào mục `📌 Task`, trạng thái `in progress` |
| Báo lỗi, lỗi runtime, chức năng hỏng | Thêm vào mục `🛠 Fix Bug`, trạng thái `in progress` |
| Chỉ hỏi / phân tích / giải thích | **Bỏ qua** — KHÔNG ghi vào DAILY_TASKS |
| Task đã xong | Cập nhật trạng thái → `done` |
| Người dùng huỷ task | Cập nhật trạng thái → `cancel` |

**Cái gì LÀ task:**
- Yêu cầu tính năng, màn hình, component mới
- Yêu cầu sửa bug hoặc xử lý lỗi
- Yêu cầu refactor, cải thiện, migrate code sẵn có
- Yêu cầu deploy, cấu hình, setup

**Cái gì KHÔNG phải task:**
- Câu hỏi hoặc yêu cầu giải thích/phân tích
- Trả lời xã giao, xác nhận, làm rõ

> Ví dụ: "phân tích bug" → KHÔNG phải task. "fix đi" (nói tiếp sau đó) → LÀ task fix bug.

**Quy tắc làm mới hằng ngày:** mỗi ngày lúc **15:00 giờ Đà Nẵng** → tạo section
`## 📅 YYYY-MM-DD` mới ở đầu file. Giữ nguyên các section cũ bên dưới.

**Định dạng `.agent/memory/ACTIVE_TASKS.md`:**
```markdown
## 📅 YYYY-MM-DD (DayName)

### 🛠 Fix Bug
| # | Description | Status |
|---|-------------|--------|
| Fix Bug 1 | Hỏng cái gì + sửa thế nào | `done` |

### 📌 Task
| # | Description | Status |
|---|-------------|--------|
| Task 1 | Yêu cầu là gì | `in progress` |
```

Số thứ tự reset mỗi ngày. Ngôn ngữ: theo ngôn ngữ người dùng (tiếng Việt là bình
thường). **Không bao giờ xoá section cũ.**
