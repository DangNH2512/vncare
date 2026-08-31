---
description: >
  Điều phối phiên thảo luận bàn tròn có cấu trúc giữa các agent BA, Backend,
  Frontend (web), Mobile và AdminPanel để chốt hợp đồng API/dữ liệu/UI trước khi
  triển khai. Lấy cảm hứng từ `bmad-party-mode` (bmad-code-org/bmad-method).
triggers:
  - "round-table"
  - "roundtable"
  - "thống nhất API"
  - "contract discussion"
  - "party mode"
  - "cần thảo luận"
  - "agents discuss"
  - trước khi triển khai tính năng xuyên nhiều service khi hợp đồng còn mơ hồ
---

# Round Table Skill — Chốt hợp đồng xuyên service

## Mục đích

Trước khi triển khai một tính năng chạm nhiều service, gom mọi góc nhìn agent
liên quan vào một phiên thảo luận có cấu trúc để:
- Thống nhất hình dạng endpoint, cấu trúc DTO và định dạng response.
- Phát hiện lệch hợp đồng trước khi bắt đầu code.
- Nêu sớm các lo ngại thiết kế SOLID (vi phạm SRP/DIP/ISP...).
- Gỡ bí các câu hỏi làm rõ của BA mà không phải dừng triển khai.

Skill này thay thế câu chữ mơ hồ "thảo luận trước khi làm" ở Phase 4 của quy
trình multi-agent bằng một protocol cụ thể, có kiểm chứng.

## Khi nào kích hoạt

- Tính năng trải trên `apps/api` + `apps/web`, hoặc `apps/api` + `apps/mobile`.
- Hình dạng API hoặc DTO không tầm thường (object lồng nhau, enum, phân trang,
  truy vấn địa lý PostGIS có tham số bán kính/khu vực).
- Các agent service đang có giả định mâu thuẫn về luồng dữ liệu.
- Người dùng nói "round-table", "thống nhất API", "party mode".
- Coordinator phát hiện hợp đồng còn nhập nhằng ở Phase 4.

**Bỏ qua khi:**
- Chỉ đổi backend, không ảnh hưởng UI.
- Chỉ đổi frontend, không cần API mới.
- Sửa bug mà hợp đồng đã chốt từ trước.

---

## Các bước thực thi

### Bước 1 — Nạp ngữ cảnh

Đọc (chỉ lấy phần cần thiết):
```
Requirement Brief của BA (trong phiên hiện tại hoặc file spec)
docs/analysis/04-tech-stack-va-kien-truc.md   # kiến trúc, quy ước API, tầng service
docs/analysis/03-domain-va-du-lieu.md         # thực thể miền: Event, RSVP, Profile, Area
docs/analysis/05-trust-safety-va-kiem-duyet.md # luật kiểm duyệt UGC, trust level, no-show
Endpoint hiện có (grep trong apps/api/src)
Kiểu dữ liệu dùng chung (packages/shared-types)
File story của tính năng này (nếu story-writer đã chạy)
```

### Bước 2 — Xác định người tham gia

Tùy service bị ảnh hưởng, đưa các góc nhìn sau vào bàn:

| Vai trò | Khi nào tham gia | Trọng tâm |
|---------|------------------|-----------|
| **BA** | Luôn luôn | Quy tắc nghiệp vụ, luồng người dùng, ca biên |
| **Backend** | Cần API/DB | Endpoint, DTO, validation, auth, PostGIS, ActivityLog |
| **Web** | UI trên `apps/web` | State, loading/error, realtime, i18n EN/VI, SEO |
| **Mobile** | UI trên `apps/mobile` | State, offline, deep link, Expo Push, quyền vị trí |
| **AdminPanel** | UI kiểm duyệt/vận hành | Bảng/form, phân quyền, hàng đợi moderation, báo cáo |

### Bước 3 — Chạy thảo luận có cấu trúc

Trình bày lần lượt góc nhìn từng agent. Khuôn mẫu:

```md
## 🔵 Góc nhìn BA
[Làm rõ yêu cầu nghiệp vụ, acceptance criteria ràng buộc API]
[Ca biên: empty state, error state, ranh giới quyền, sự kiện đã đầy chỗ,
 sự kiện đã qua giờ, host huỷ sát giờ, người dùng no-show nhiều lần]
[Câu hỏi mở còn treo trong Requirement Brief]

## 🟠 Góc nhìn Backend
[Endpoint đề xuất: METHOD /api/v1/path]
[Request DTO: { field: type, validation }]
[Response shape: { success, data: {...}, meta }]
[Auth: guard nào, role nào, có cần trust level tối thiểu không]
[Ảnh hưởng DB: bảng/cột/index mới; nếu có truy vấn địa lý thì nêu rõ
 kiểu geography(Point,4326) và index GIST]
[Múi giờ: lưu UTC, trả kèm timezone Asia/Ho_Chi_Minh khi cần hiển thị]
[ActivityLogService: log gì]
[Kiểm duyệt: nội dung do người dùng tạo có vào hàng đợi moderation không]
[Kiểm tra SOLID: SRP ổn? DIP ổn? Có dùng Repository không?]

## 🟢 Góc nhìn Web / Mobile
[Màn hình nào tiêu thụ endpoint này]
[State shape: dữ liệu nào cần cache/store]
[Loading state: skeleton/spinner]
[Error state: toast/inline/retry]
[Realtime: tên event socket.io nếu có]
[Push: có bắn Expo Push Notification không, payload gì, deep link tới đâu]
[Bản đồ: react-leaflet (web) / react-native-maps (mobile) cần field nào]
[i18n: key mới cần thêm, luôn có đủ cả EN và VI, EN là mặc định]
[Kiểm tra SOLID: hook có đúng SRP không?]

## 🟡 Góc nhìn AdminPanel (nếu áp dụng)
[Trang admin nào dùng]
[Cột bảng / trường form]
[Guard phân quyền phía admin]
[Đăng ký event realtime nếu có]
[i18n: key mới cần thêm]
```

### Bước 4 — Chỉ ra bất đồng

Nêu tường minh mọi xung đột hợp đồng:

```md
## ⚠️ Xung đột hợp đồng

| Xung đột | BA nói | Backend nói | Frontend nói | Chốt |
|----------|--------|-------------|--------------|------|
| Hình dạng `data` khi list event | mảng event | { items, total } | cần mảng phẳng | Dùng { items, total } — khớp quy ước API trong docs/analysis/04-tech-stack-va-kien-truc.md |
| Ai được RSVP? | mọi user đã xác thực email | mọi role | chỉ user đã đăng nhập | Guard: JwtAuthGuard + EmailVerifiedGuard |
| Lọc khu vực bằng gì? | tên khu vực | bán kính từ toạ độ | cả hai | Hỗ trợ cả hai: `areaSlug` (enum) hoặc `lat`+`lng`+`radiusKm` |
```

Mọi xung đột phải được giải quyết trước khi bắt đầu triển khai. Nếu một xung đột
không thể chốt trong bàn tròn (cần người dùng quyết), trả về `blocked` kèm đúng
câu hỏi cần hỏi.

### Bước 5 — Xuất bản hợp đồng đã chốt

Kết quả là một hợp đồng đã ký, đưa thẳng vào file Story:

```md
## ✅ Hợp đồng đã chốt — RSVP sự kiện

### API Contract
- Endpoint: POST /api/v1/events/:eventId/rsvp
- Request DTO: CreateRsvpDto { status: 'going' | 'interested', guestCount?: number (0-3), note?: string }
- Response: { success: true, data: { id, eventId, status, waitlisted, joinedAt }, meta: null }
- Auth: JwtAuthGuard + EmailVerifiedGuard
- Quy tắc: nếu `event.capacity` đã đầy → `waitlisted: true`, xếp hàng chờ FIFO
- Quy tắc: chặn RSVP nếu `event.startsAt` đã qua (so sánh theo UTC)
- Quy tắc: user có trust level `new` chỉ được giữ tối đa 3 RSVP đang mở
- ActivityLog: RsvpCreated { userId, eventId, status, waitlisted }

### Contract danh sách & lọc (liên quan)
- Endpoint: GET /api/v1/events?areaSlug=an-thuong&lat=&lng=&radiusKm=&category=&from=&to=
- `areaSlug` enum: my-khe | an-thuong | my-an | hai-chau | son-tra | ngu-hanh-son
- Truy vấn bán kính dùng PostGIS `ST_DWithin(location, ST_MakePoint(lng, lat)::geography, radiusKm * 1000)`
- Index: GIST trên `event.location`, B-tree trên `(starts_at, area_slug)`

### Frontend Contract (web + mobile)
- Hook: useCreateRsvp() — React Query mutation
- Thành công: cập nhật lạc quan nút RSVP, invalidate `['events', eventId]` và `['me','rsvps']`
- Thành công khi vào hàng chờ: hiển thị banner "You're on the waitlist"
- Lỗi: Toast lấy nội dung từ `error.message` của API
- Realtime: lắng nghe socket.io event `event.rsvp_changed` để cập nhật số chỗ còn lại
- Push: khi có chỗ trống, backend bắn Expo Push tới người đầu hàng chờ,
  deep link `dnconnect://events/:eventId`
- i18n keys: `event.rsvp.success`, `event.rsvp.waitlisted`, `event.rsvp.error`,
  `event.rsvp.full` — bổ sung đủ cả `en` và `vi`

### Admin Contract
- Realtime: useAdminEventFeed() — lắng nghe `event.rsvp_changed` và `moderation.flagged`
- Bảng: refresh khi có RSVP mới; cột "No-show rate" của host
- Phân quyền: chỉ role admin và moderator

### Ảnh hưởng DB
- Bảng mới: `event_rsvp` (unique `(event_id, user_id)`)
- `event_rsvp.status` enum: going | interested | waitlisted | cancelled | no_show
- Không đổi schema `event` ngoài cột đếm phi chuẩn hoá `going_count`
```

Hợp đồng này đi vào:
1. Dev Notes trong story của Backend Agent.
2. Dev Notes trong story của Web/Mobile/AdminPanel Agent.
3. File story tại `.agent/stories/<id>.md`.

---

## Luật của người điều phối

- **Mỗi lần một câu hỏi** — không hỏi dồn nhiều câu mở cùng lúc.
- **Chốt tại chỗ** — dùng `docs/analysis/04-tech-stack-va-kien-truc.md` và
  `docs/analysis/03-domain-va-du-lieu.md` làm trọng tài.
- **BA quyết nghiệp vụ** — xung đột về quy tắc nghiệp vụ thì BA thắng.
- **Tài liệu kiến trúc quyết kỹ thuật** — xung đột về pattern thì tài liệu kiến
  trúc thắng.
- **Coordinator quyết** — nếu vẫn bế tắc, Coordinator ra quyết định.
- **Giới hạn thời gian** — một câu hỏi con vượt quá 5 vòng qua lại thì gắn
  `blocked` và leo thang.

---

## Nguồn

Phỏng theo `bmad-party-mode` của BMAD Method
(https://github.com/bmad-code-org/bmad-method — giấy phép MIT).
Đã thiết kế lại về căn bản cho:
- Mục đích chốt hợp đồng (không phải giải trí chung chung).
- Protocol giải quyết xung đột có cấu trúc.
- Tích hợp với Phase 4 trong `.agent/workflows/multi-agent-task.md`.
- Đầu ra chảy vào file Story và bước BA validation.
