---
# Story Metadata (YAML frontmatter — KHÔNG được xoá)
story_id: ""                # ví dụ: "1-2-event-rsvp-api"
epic: ""                    # Tên epic mà story này thuộc về
feature: ""                 # Tên feature cha
owner: ""                   # Backend (apps/api) | Web (apps/web) | Mobile (apps/mobile) | Shared (packages/shared-types)
status: "draft"             # draft | ready-for-dev | in-progress | done | blocked
created: ""                 # Ngày theo ISO, ví dụ: 2026-09-01
baseline_commit: ""         # Git commit SHA lúc bắt đầu story (agent điền)
---

# Story: <Title>

> **Tóm tắt một dòng:** <Story này mang lại gì cho người dùng hoặc cho hệ thống>

---

## Bối cảnh nghiệp vụ

<!--
Vì sao story này tồn tại? Nó giải quyết vấn đề gì của người dùng hoặc của nghiệp vụ?
Lấy từ BA Requirement Brief — viết ngắn (2-4 câu).
-->

**Mục tiêu:** ...
**Người dùng / vai trò:** ...
**Giá trị nghiệp vụ:** ...

**Ví dụ (điền theo dạng này):**
> Là một expat vừa chuyển tới An Thượng, tôi muốn RSVP một buổi bóng đá tối nay
> và được đưa vào waitlist nếu đã hết chỗ, để tôi biết chắc mình có suất hay không
> thay vì phải hỏi trong nhóm Facebook.

---

## Tiêu chí nghiệm thu

<!--
Viết theo dạng Given/When/Then. Mỗi tiêu chí phải kiểm chứng được độc lập.
Chép từ BA Requirement Brief, chỉ lấy phần thuộc story này.
-->

- [ ] **AC-1:** Given... When... Then...
- [ ] **AC-2:** Given... When... Then...
- [ ] **AC-3:** Given... When... Then...

**Ví dụ (điền theo dạng này):**

- [ ] **AC-1:** Given một sự kiện còn chỗ trống, When người dùng đã đăng nhập bấm RSVP, Then trạng thái của họ là `going` và số chỗ còn lại giảm đi 1.
- [ ] **AC-2:** Given một sự kiện đã đủ sức chứa, When người dùng bấm RSVP, Then họ vào waitlist với vị trí xếp hàng hiển thị rõ ràng.
- [ ] **AC-3:** Given một người đang ở trạng thái `going` huỷ RSVP, When còn người trong waitlist, Then người đầu waitlist được đôn lên `going` và nhận push notification.
- [ ] **AC-4:** Given người dùng lọc sự kiện theo khu vực My An trong bán kính 3 km, When danh sách trả về, Then chỉ có sự kiện nằm trong bán kính đó, sắp xếp theo thời gian bắt đầu.

---

## Việc cần làm

<!--
Checklist triển khai cụ thể. Dùng tiền tố theo service cho rõ ràng.
Agent tự tick từng ô khi hoàn thành.
-->

### Backend (`apps/api/`)
- [ ] Tạo/cập nhật TypeORM entity + migration: `...`
- [ ] Tạo/cập nhật DTO: `...Dto` (mirror sang `packages/shared-types` nếu client
      web/mobile có dùng)
- [ ] Tạo/cập nhật method ở Repository: `...` (không viết raw DB query trong Service)
- [ ] Tạo/cập nhật method ở Service: `...`
- [ ] Tạo/cập nhật endpoint ở Controller: `METHOD /api/v1/...`
- [ ] Truy vấn geo dùng PostGIS (`ST_DWithin` trên cột `geography`) khi lọc theo
      khu vực hoặc bán kính — không tự viết công thức tính khoảng cách
- [ ] Mốc thời gian lưu dạng `timestamptz` theo UTC
- [ ] Thêm Swagger decorator
- [ ] Thêm lời gọi audit-log ở mọi thao tác ghi
- [ ] Phát socket.io event / đẩy job BullMQ (Expo Push) nếu luồng có thông báo cho người dùng
- [ ] Có unit test

### Web (`apps/web/`) — Next.js 15 App Router + React 19
- [ ] Tạo/cập nhật route hoặc server component: `app/...`
- [ ] Tạo/cập nhật data hook: `use...()`
- [ ] Hiển thị bản đồ bằng `react-leaflet` nếu story có hiển thị vị trí
- [ ] Có trạng thái loading (skeleton/spinner)
- [ ] Có trạng thái rỗng (không có sự kiện nào trong khu vực này / chưa có RSVP nào)
- [ ] Có trạng thái lỗi (toast/inline)
- [ ] Thêm key i18n vào `en.json` + `vi.json` (EN là ngôn ngữ giao diện mặc định)

### Mobile (`apps/mobile/`) — Expo 54 + React Native 0.81
- [ ] Tạo/cập nhật màn hình: `...`
- [ ] Hiển thị bản đồ bằng `react-native-maps` nếu story có hiển thị vị trí
- [ ] Xử lý hộp thoại xin quyền (vị trí / thông báo) kèm nhánh xử lý khi người dùng từ chối
- [ ] Đăng ký/làm mới Expo Push token nếu luồng có thông báo cho người dùng
- [ ] Thêm key i18n vào `en.json` + `vi.json`

### Shared (`packages/shared-types/`)
- [ ] Export DTO/enum được dùng ở nhiều hơn một app
- [ ] Kiểm/nâng phiên bản hợp đồng kiểu dữ liệu mà `apps/web` và `apps/mobile` đang dùng

### Việc xuyên suốt
- [ ] Đã viết migration DB VÀ đã revert thử một lần ở local (nếu có đổi schema)
- [ ] Đã phủ nhánh kiểm duyệt nếu story tạo ra nội dung do người dùng đăng
      (endpoint báo cáo, trạng thái ẩn, hàng đợi duyệt)
- [ ] Đã rà quyền riêng tư nếu lưu thêm trường dữ liệu cá nhân mới (Nghị định 13/2023/ND-CP)
- [ ] Có E2E spec cho luồng UI mới
- [ ] `tsc --noEmit` chạy sạch ở mọi workspace bị đụng tới

---

## Ghi chú cho dev

<!--
Bối cảnh nạp sẵn cho agent triển khai. Điền trong lúc chạy skill story-writer.
Agent triển khai đọc phần này TRƯỚC khi chạm vào code.
Tránh mất thời gian "đi tìm ngữ cảnh" ở mỗi phiên làm việc.
-->

### Bối cảnh kiến trúc
- Module: ...
- Mẫu service: ...
- Code sẵn có liên quan: ...
- Giai đoạn: 1 (cộng đồng/sự kiện) | 2 (nhà ở) | 3 (y tế & dịch vụ chuyên môn)
- Khu vực liên quan: My Khe | An Thuong | My An | Hai Chau | Son Tra | Ngu Hanh Son | tất cả

### Hợp đồng API
```
Method + Path: POST /api/v1/...
Request DTO: { fieldName: type }
Response: { success: true, data: { ... }, meta: null }
Auth guard: JwtAuthGuard | OrganizerGuard | ModeratorGuard
Audit log: { action: '...', entity: '...', entityId: '...' }
Timestamps: UTC ISO-8601 on the wire; client renders in Asia/Ho_Chi_Minh
```

### Ghi chú DB
- Cần migration mới: có/không
- Bảng bị ảnh hưởng: ...
- Giá trị enum: ...
- Ảnh hưởng tới index: ... (cột `geography` mới nào cũng cần index GIST)
- Có cần PostGIS không: có/không — dùng hàm nào (`ST_DWithin`, `ST_Distance`, ...)

### Ghi chú frontend
- Data hook: useQuery / useMutation
- Cache key: ['...', params]
- Realtime: tên socket.io event `...` (nếu có)
- Push: tiêu đề/nội dung Expo Push notification + đích deep link (nếu có)
- Điều hướng: route (web) / tên screen (mobile) sau khi thành công
- Key i18n đã thêm: `...` — phải có ở CẢ `en.json` và `vi.json`

### Cạm bẫy đã biết / quyết định trước đó
<!--
Chép các mục liên quan từ memory vào đây để agent khỏi phải tự khám phá lại.
Ví dụ cho sản phẩm này: "lệch một ngày giữa UTC và Asia/Ho_Chi_Minh với sự kiện buổi tối",
"PostGIS SRID 4326 và đơn vị mét trong ST_DWithin (phải cast sang geography)",
"Expo Push token đổi sau khi cài lại app — cần dọn token DeviceNotRegistered", v.v.
-->
- ...

---

## Nhật ký của agent triển khai

<!--
Do agent triển khai điền trong lúc chạy. KHÔNG sửa tay.
-->

### Nhật ký debug
<!-- Ghi lại vấn đề gặp phải và cách đã xử lý -->

| Vấn đề | Nguyên nhân gốc | Cách sửa |
|-------|-----------|-----|
| | | |

### Ghi chú khi hoàn thành
<!-- Ghi ngắn gọn các quyết định triển khai không hiển nhiên -->

### Bằng chứng kiểm chứng
<!-- Output của tsc + kết quả test trên trình duyệt/API -->

```
tsc --noEmit: exit code ... (per workspace)
API test: ...
Web flow (apps/web): ...
Mobile flow (apps/mobile, device/simulator): ...
i18n: en.json / vi.json key counts match
```

---

## Danh sách file

<!--
Các file được tạo hoặc sửa trong lúc triển khai.
Agent điền sau khi hoàn thành các đầu việc.
-->

**Đã tạo:**
- `path/to/new-file.ts`

**Đã sửa:**
- `path/to/existing-file.ts`

---

## Lịch sử thay đổi

<!--
Lịch sử thay đổi ngắn gọn để theo dõi qua nhiều phiên làm việc.
-->

| Ngày | Người thực hiện | Thay đổi |
|------|--------|--------|
| | | Story được tạo bởi skill story-writer |
