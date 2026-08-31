---
description: "Reality is oracle — mở web/mobile/API thật trước khi kết luận 'ổn'"
trigger: always_on
---

# Observe Reality — Nhìn App Bằng Mắt Người Dùng

> **Nguyên tắc cứng:** Spec / code / acceptance criteria là *giả thuyết* về hành vi
> đúng — KHÔNG phải sự thật. Sự thật là cái **người dùng thật sự thấy** khi mở app.
> *"typecheck pass, code trông đúng"* ≠ *"hoạt động đúng"*. Luôn xác minh bằng
> app/API thật trước khi kết luận "done" hoặc "hết bug".

---

## Luật cốt lõi

```
Viết code → Chạy thật → Đọc output thật → Rồi mới kết luận

KHÔNG:
Viết code → "Code này logic đúng rồi" → Mark done  ← FORBIDDEN
```

---

## A. Verify web (Next.js — http://localhost:3000)

Dùng browser hoặc `curl` để xác minh — không chỉ đọc code.

### Workflow chuẩn
1. **Mở browser** → vào page bị ảnh hưởng (nhớ prefix locale: `/en/...` hoặc `/vi/...`).
2. **Đi flow người dùng thật**: đi hết bước, submit form, xem response.
3. **Xem DevTools Console** → lỗi JS? request fail? 4xx/5xx?
4. **Xem Network tab** → request có thật sự được gửi? Data trả về có đúng không?
5. **So sánh UI ↔ API response ↔ DB** — 3 nguồn phải khớp (xem mục C).

### Verify ở nhiều viewport
- **Mobile 375px**: expat dùng web trên điện thoại rất nhiều → test ở mobile width trước.
- **Desktop 1280px**: confirm không regression.
- Nhớ: bug layout flex thường chỉ lộ ở mobile width, desktop trông "ổn".

### Bề mặt bắt buộc quét khi chạm tính năng sự kiện
- Danh sách sự kiện có bộ lọc khu vực (`/en/events?area=an-thuong`).
- Chi tiết sự kiện + nút RSVP (`/en/events/[slug]`).
- Bản đồ react-leaflet: marker, cụm marker, popup.
- Console kiểm duyệt (`/en/admin/...`) nếu task chạm UGC.

---

## B. Verify API (NestJS — http://localhost:3001)

```bash
# Happy path
curl -s -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/v1/<endpoint> | jq .

# Chưa đăng nhập (phải 401)
curl -s http://localhost:3001/api/v1/<endpoint>

# Sai role (phải 403)
curl -s -H "Authorization: Bearer <member-token>" \
  http://localhost:3001/api/v1/admin/<endpoint>

# Truy vấn theo khu vực / bán kính — kiểm tra cả trường hợp không có toạ độ
curl -s "http://localhost:3001/api/v1/events?areaId=<uuid>&radiusKm=3" | jq '.items | length'
```

**Verify cả negative path** — không chỉ happy path. Quyền riêng tư và giới hạn theo
tier tin cậy phải được cưỡng chế ở API layer, không chỉ ẩn nút trên UI.

---

## C. Triangulate — bắt "default useState lie"

**Đừng tin con số/trạng thái trên UI.** Nó có thể là giá trị mặc định của
`useState` vì fetch fail âm thầm. Khi UI hiển thị số/trạng thái lấy từ fetch, so
**3 nguồn**:

```
   UI (browser hoặc simulator — cái người dùng thấy)
        ↕  khớp?
   API response (DevTools Network / curl kèm token)
        ↕  khớp?
   DB thật (psql query)
```

Lệch bất kỳ đâu = bug. Ví dụ thực tế:
- Màn chi tiết sự kiện hiện "0 người tham dự" → API `GET /api/v1/events/{id}/rsvps`
  trả 12 bản ghi `going` → nguyên nhân: socket.io fail im lặng, state kẹt ở giá trị
  mặc định. Chỉ nhìn UI thì miss hoàn toàn.
- Bộ lọc khu vực "An Thuong" ra 0 kết quả → API đúng, nhưng DB thiếu index GIST nên
  truy vấn timeout và service nuốt lỗi trả mảng rỗng.

---

## D. Kỷ luật screenshot — Read ngay sau khi chụp

**Quy tắc cứng:**
1. Chụp screenshot → **Read file ngay** → verify nội dung thật khớp kỳ vọng.
2. Tên file = nhãn, **nội dung ảnh = sự thật**.
3. Nếu screenshot không khớp (trắng trơn / màn login / trang lỗi) → đánh dấu
   "evidence invalid", không báo "đã verify" dựa trên tên file.
4. Trước khi quét nhiều page → verify trạng thái đăng nhập bằng 1 ảnh tham chiếu.

---

## E. Checklist thăm dò — cái spec KHÔNG nói

Sau khi mở app, quét những thứ assertion thường bỏ sót:

- [ ] **Loading → Error → Empty**: phân biệt được không? (feed sự kiện rỗng khác với lỗi mạng)
- [ ] **Fetch fail im lặng**: console có lỗi 401/403/500 ẩn không?
- [ ] **Tên/mô tả dài** (50+ ký tự, có dấu tiếng Việt): tràn layout, đẩy nút ra ngoài?
- [ ] **Realtime**: ngắt mạng 5 giây → reconnect → số người RSVP có tự cập nhật không?
- [ ] **Double-click**: bấm RSVP hai lần có tạo hai bản ghi không?
- [ ] **Hết chỗ**: sự kiện đầy → có vào waitlist đúng không, hay hiện lỗi lạ?
- [ ] **i18n**: đổi sang tiếng Việt → có raw key nào hiện ra không? Ngược lại từ VI về EN?
- [ ] **Timezone**: sự kiện 20:00 giờ Đà Nẵng hiển thị đúng cho người đặt timezone khác?
- [ ] **Mobile width 375px**: layout vỡ không? Nút đủ to để bấm không (≥44px)?
- [ ] **Đi lạc flow**: bấm Back giữa chừng, refresh, mở tab mới → app có crash không?
- [ ] **Quyền**: tài khoản `member` mở URL của `moderator` → bị chặn ở API chứ không
      chỉ bị ẩn nút?

---

## F. Khi quan sát ≠ spec / ≠ test xanh

- **App ≠ spec** → spec sai HOẶC app drift. Báo ra, KHÔNG viết test codify cái sai.
  Để BA chốt hành vi đúng trước.
- **typecheck xanh nhưng app hỏng** → typecheck chỉ kiểm kiểu, không kiểm hành vi
  runtime. Chạy thật → đọc output thật.
- **Test pass nhưng flow thật fail** → test đang assert shape thay vì hành vi người
  dùng thấy. Sửa test để assert output quan sát được.
- **Mọi kết luận "done"/"pass" phải kèm bằng chứng** — mô tả cụ thể thấy gì, không
  "chắc là ổn".

---

## G. Phân biệt "quan sát thật" vs "chạy full suite"

| Việc | Được phép mặc định? |
|---|---|
| Mở browser → navigate → xem UI thật | ✅ LUÔN — đây KHÔNG phải "chạy test suite" |
| Mở simulator iOS/Android đang chạy để xem màn mobile | ✅ LUÔN |
| `curl` API endpoint để verify response | ✅ LUÔN |
| `psql` để xem DB | ✅ LUÔN |
| Chạy 1 spec Playwright/Jest có mục tiêu để verify | ✅ khi cần |
| Chạy full suite Playwright/Jest (chậm) | ⚠️ chỉ khi người dùng nói rõ |
| Build native đầy đủ (`expo run:ios` / EAS) | ⚠️ chỉ khi task chạm phần native |
| Deploy lên staging/production | ❌ chỉ khi người dùng phê duyệt rõ ràng |

Quan sát reality rẻ + giá trị cao → làm thường xuyên.
