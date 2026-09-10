---
name: specialized-code-review
description: >
  Code review đa lăng kính, có lớp đối kháng, sâu hơn một lượt review thông thường.
  Dùng khi review PR, một feature không tầm thường, hoặc một refactor trước khi
  merge. Chạy bốn lăng kính trọng tâm (silent failure, thiết kế kiểu, độ phủ test,
  độ phức tạp thừa) CỘNG một lượt đối kháng Blind Hunter lấy cảm hứng từ workflow
  code-review của BMAD.
allowed-tools: Read, Bash
---

# Specialized Code Review — Bốn Lăng Kính + Lượt Đối Kháng

> **Nguồn / Provenance:**
> - Cấu trúc 4 lăng kính gốc: Anthropic `claude-plugins-official` `pr-review-toolkit`
>   https://github.com/anthropics/claude-plugins-official/tree/main/plugins/pr-review-toolkit
> - Lớp đối kháng (Lens 0): phỏng theo BMAD Method `bmad-code-review` —
>   pattern Blind Hunter + Edge Case Hunter
>   https://github.com/bmad-code-org/bmad-method (MIT License)

**Ngữ cảnh:** Da Nang Connect — `apps/api` (NestJS + TypeORM + PostgreSQL/PostGIS +
Redis/BullMQ + socket.io), `apps/web-client-side` (Next.js App Router, web người dùng
cuối), `apps/web-admin-side` (Next.js App Router, console vận hành), `apps/mobile` (Expo).
Miền nghiệp vụ: sự kiện, RSVP & hàng đợi chờ, tìm kiếm theo khu vực/bán kính, hồ sơ
có `trust_level`, kiểm duyệt UGC, push notification.

## Khi nào chạy

- Review bất kỳ PR hoặc feature/refactor nào đụng vào logic nghiệp vụ.
- Trước khi merge, sau khi typecheck pass — code compile sạch vẫn có thể sai.
- Tester Agent tự động đề xuất chạy sau khi implement xong.

## Các pha review

Chạy **Phase A** (đối kháng) trước với mắt sạch, rồi mới tới **Phase B** (lăng kính
có mục tiêu).

---

## Phase A — Lượt Đối Kháng (BMAD-Inspired)

Chạy hai lăng kính đối kháng này **trước khi** đọc mô tả PR hay ngữ cảnh của tác giả.
Mục tiêu: tìm cái gì vỡ khi có người cố tình lạm dụng, ép tải, hoặc dùng sai feature.

### Lens 0a — Blind Hunter

Đóng vai attacker hoặc một QA engineer thù địch chưa từng đọc requirement. Chỉ đọc
code, không đọc ticket/brief.

Tự hỏi:
- Code này giả định điều gì mà có thể bị vi phạm?
- Chỗ nào tin vào input không đáng tin (userId lấy từ request body, thiếu check quyền)?
- Nếu hai người gọi đồng thời thì sao? (hai RSVP tranh chỗ cuối cùng)
- Nếu database hoặc dịch vụ ngoài (S3, Expo Push) chậm/chết thì sao?
- Với dữ liệu rỗng, số 0, số âm, chuỗi rất dài, emoji, chữ có dấu tiếng Việt thì sao?
- Nếu một socket event / job BullMQ chạy hai lần thì sao (idempotency)?
- Có đường nào trả status thành công nhưng để dữ liệu ở trạng thái không nhất quán không?
- Có tham số nào người dùng điều khiển được mà không bị chặn trên (bán kính tìm kiếm,
  `limit` phân trang, kích thước upload)?

Định dạng output: `[BLIND-HUNT] file:line — <phát hiện>` cho mỗi vấn đề.

### Lens 0b — Edge Case Hunter (bám Acceptance Criteria)

Giờ mới đọc Acceptance Criteria của BA. Với mỗi AC, chủ động dựng một kịch bản mà
implementation pass happy path nhưng trượt AC ở điều kiện biên.

Ưu tiên:
- **Biên múi giờ:** mọi mốc thời gian lưu UTC và hiển thị theo `Asia/Ho_Chi_Minh`
  chưa? Sự kiện 23:30 có bị filter "hôm nay" bỏ sót không? User ở múi giờ khác thì sao?
- **Biên sức chứa:** hai RSVP đồng thời ở chỗ cuối → tổng `GOING` có vượt `capacity`?
- **Hàng đợi chờ:** huỷ RSVP → đúng một người được promote, không trùng, không sót?
- **Biên địa lý:** điểm cách đúng bán kính ± 1 m rơi vào bên nào? Sự kiện không có
  toạ độ thì sao? Bán kính có bị clamp không?
- Rỗng, `null`, `undefined` ở mọi field của response API.
- **Biên quyền:** user A có xem/sửa được RSVP, hồ sơ, hay sự kiện của user B không?
- **Biên vai trò:** người dùng thường có gọi được endpoint moderator không?
  `trust_level` thấp có vượt được hạn mức không?
- **Race realtime:** socket event bắn trước khi transaction commit?
- **Rollback migration:** code cũ còn chạy được nếu migration mới chạy dở?
- **i18n:** chuỗi mới có đủ cả `en` và `vi` không? Push dùng locale người nhận chưa?

Định dạng output: `[EDGE-CASE] AC-N — <điều kiện biên> — <phát hiện>`.

---

## Phase B — Các Lăng Kính Có Mục Tiêu

### Lens 1 — Silent Failure Hunter

Tìm chỗ lỗi bị nuốt hoặc thành công bị làm giả.

- [ ] Không có `catch {}` / `catch (e) {}` rỗng làm rơi lỗi.
- [ ] Không có `catch` log xong rồi trả về giá trị giả-thành-công.
- [ ] Có `await` ở mọi promise mà kết quả/exception của nó có ý nghĩa.
- [ ] Optional chaining (`?.`) không đang che một bug "lẽ ra không bao giờ null".
- [ ] Mọi đường mutation vẫn đi tới `AuditLogService.log()` — lỗi bị nuốt không được
      phép làm mất bản ghi audit.
- [ ] Lỗi gửi push (Expo trả `DeviceNotRegistered`, `MessageTooBig`) được xử lý,
      không im lặng bỏ qua và cũng không retry mù dẫn tới gửi trùng.
- [ ] UI phân biệt được `loading` / `error` / `empty thật` — không hiện `0` khi fetch hỏng.

### Lens 2 — Type Design Analyzer

Làm cho trạng thái bất hợp lệ không biểu diễn được.

- [ ] Không có `any` / cast không kiểm tra vượt qua ranh giới module hay ranh giới API.
- [ ] DTO (`class-validator`) khớp hợp đồng thật; không dùng `string` lỏng ở chỗ đáng
      lẽ là enum/union (`EventStatus`, `RsvpStatus`, khu vực).
- [ ] Discriminated union thay cho cờ boolean khi dữ liệu có nhiều trạng thái.
- [ ] Nullability là chủ ý, không phải tai nạn (`field?: T` vs `field: T | null`).
- [ ] Kiểu response không lộ thẳng entity — có DTO allow-list, không rò PII.
- [ ] Đơn vị được mã hoá trong kiểu hoặc tên (`radiusMeters`, `startAtUtc`), không để
      một số trần trụi rồi đoán đơn vị.

### Lens 3 — Test Coverage Analyzer

- [ ] Endpoint mới → có spec e2e (`apps/api/e2e/**`; `apps/web-client-side/e2e/**` hoặc `apps/web-admin-side/e2e/**` cho Playwright).
- [ ] Test khẳng định hành vi + đường không-vui, không chỉ "render được".
- [ ] Edge case đã phủ: danh sách rỗng, biên múi giờ, biên bán kính PostGIS,
      RSVP đồng thời ở chỗ cuối, bị từ chối quyền, thao tác lên tài nguyên người khác.
- [ ] Có test cho transition trạng thái **không hợp lệ**, không chỉ transition hợp lệ.
- [ ] Không có test pass bất kể code thế nào (assertion tautology).

### Lens 4 — Complexity / Simplifier

- [ ] File nào bị đẩy quá 500 dòng → flag để tách (quy tắc dự án).
- [ ] Logic trùng lặp đáng lẽ nên là hook/util/service dùng chung — nhất là dựng truy
      vấn PostGIS và quy đổi múi giờ, phải có đúng một chỗ.
- [ ] Code chết, export không dùng, khối comment-out, tàn dư debug.
- [ ] Không dùng kế thừa ở chỗ composition/hook (FE) hoặc DI/strategy (BE) hợp hơn.

---

## Output Format

```md
## Code Review Report — <Tên feature/PR>

### Phase A — Phát hiện đối kháng
[BLIND-HUNT] path/to/file.ts:42 — <phát hiện>
[EDGE-CASE] AC-2 — <điều kiện biên> — <phát hiện>

### Phase B — Phát hiện theo lăng kính
[L1-SILENT] apps/api/src/modules/rsvp/rsvp.service.ts:88 — catch rỗng nuốt lỗi promote hàng đợi chờ
[L2-TYPE] apps/api/src/modules/event/dto/create-event.dto.ts:15 — status: string nên là enum EventStatus
[L3-TEST] apps/api/src/modules/rsvp/rsvp.controller.ts — chưa có spec e2e cho POST /api/v1/events/{id}/rsvps
[L4-COMPLEX] apps/api/src/modules/event/event.service.ts:300 — file 512 dòng, phải tách

### Severity Summary
| ID | Severity | Lens | Mô tả |
|----|----------|------|-------|
| R1 | BLOCK | Blind Hunt | ... |
| R2 | FIX | L2-Type | ... |
| R3 | NOTE | L4-Complex | ... |

### Verdict
BLOCK (phải sửa trước khi merge) | APPROVE (chỉ còn ghi chú nhỏ)
```

Mức độ nghiêm trọng:
- **BLOCK** — Silent failure trên đường RSVP/kiểm duyệt, rò rỉ dữ liệu cá nhân, `any`
  vượt ranh giới API, thiếu check quyền, có thể thao tác lên tài nguyên người khác
  (IDOR), vượt `capacity` do race, thiếu test cho endpoint mới. Phải sửa.
- **FIX** — Sửa trước khi merge.
- **NOTE** — Theo dõi ở sprint sau.
