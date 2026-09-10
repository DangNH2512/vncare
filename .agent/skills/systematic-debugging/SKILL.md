---
name: systematic-debugging
description: Quy trình debug 5 pha — recall → locate → root cause → fix → verify. Ngăn context bleed và ngăn sửa nhầm component.
---

# Systematic Debugging — Quy Trình 5 Pha

> **Dùng skill này mỗi khi có bug được báo.**
> Không bao giờ nhảy thẳng vào viết fix — đi đủ 5 pha.

---

## Pha 1 — RECALL (< 2 phút)

**Xoá sạch giả định.** KHÔNG dựa vào trí nhớ từ các session trước.

Trả lời các câu hỏi này bằng cách đọc code, không phải nhớ:
1. User đang cố làm gì?
2. Thực tế xảy ra chuyện gì thay vì thế?
3. Màn hình/component nào là điểm vào?
4. Bug xảy ra trên bề mặt nào — `apps/web-client-side`, `apps/web-admin-side`,
   `apps/mobile`, hay nhiều bề mặt? Ở ngôn ngữ nào
   (EN hay VI)? Với vai trò nào (khách vãng lai, người tham gia, host, moderator)?

```
❌ SAI: "Tôi nhớ component này render X" → viết fix
✅ ĐÚNG: đọc lại component FRESH → xác nhận hành vi hiện tại
```

---

## Pha 2 — LOCATE (đọc code thật)

Truy vết chuỗi gọi từ hành động của user → luồng dữ liệu → output:

```
User bấm [Join]
    ↓
Handler trong Component.tsx           ← đọc file này
    ↓
Gọi API / cập nhật state              ← thực sự nó gọi cái gì?
    ↓
Controller (apps/api)                 ← đọc controller
    ↓
Service method                        ← đọc service
    ↓
Repository query                      ← đọc repository
    ↓
PostgreSQL / PostGIS                  ← thực sự cái gì được ghi/đọc?
    ↓
Socket event + job BullMQ (push)      ← ai phát, ai tiêu thụ, chạy mấy lần?
```

**Với mỗi bước:** mở file, đọc code thật. Không đoán.

```bash
# Tìm kiếm hữu ích:
grep -rn "functionName\|handlerName" apps/api/src apps/web-client-side/src apps/web-admin-side/src --include="*.ts" --include="*.tsx" -l
grep -rn "<endpoint path>" apps/web-client-side/src apps/web-admin-side/src apps/mobile/src --include="*.ts" --include="*.tsx" -n
```

---

## Pha 3 — ROOT CAUSE (tìm TẠI SAO, không chỉ CÁI GÌ)

Trước khi viết bất kỳ fix nào, trả lời:
- **Nguyên nhân gốc thật sự là gì?** (không phải triệu chứng)
- **Tại sao nó xảy ra?** (race condition? thiếu `await`? sai state? sai đơn vị?)
- **Chính xác chỗ nào trong code đi sai?**

Các nguyên nhân gốc hay gặp trong dự án này:

| Triệu chứng | Nguyên nhân gốc thường gặp |
|-------------|---------------------------|
| UI không cập nhật sau khi lưu | Socket event không bắn, hoặc cache phía client không được invalidate sau mutation |
| Dữ liệu cũ sau khi điều hướng | Cache không invalidate; mobile thiếu refetch khi app quay lại foreground |
| Giờ sự kiện lệch đúng 7 tiếng | Lưu `timestamp` không timezone thay vì `timestamptz`, hoặc quy đổi hai lần |
| Sự kiện tối muộn rơi nhầm ngày trong bộ lọc | Biên "ngày" tính theo UTC/giờ máy thay vì `Asia/Ho_Chi_Minh` |
| Số người tham gia vượt `capacity` | Check-then-act không nằm trong transaction/lock — hai RSVP tranh chỗ cuối |
| Huỷ RSVP nhưng không ai được promote | Huỷ và promote nằm ở hai transaction; hoặc trạng thái `FULL` bị lưu cứng, không tính lại |
| Hai người cùng được promote cho một chỗ | Thiếu lock khi đọc hàng đợi chờ |
| Lọc bán kính trả kết quả vô lý | Dùng `geometry` thay vì `geography` (đơn vị thành độ), hoặc đảo thứ tự `(lng, lat)` |
| Truy vấn theo khu vực chậm dần | Thiếu index GIST trên cột vị trí |
| UI hiện raw key thay vì text | Key chỉ có ở một trong hai locale `en`/`vi`, hoặc sai key path |
| Push gửi trùng 2–3 lần | Job retry sau khi đã gửi; thiếu idempotency key; `deviceToken` trùng dòng |
| Push bắn cho sự kiện đã huỷ | Job cũ không bị huỷ khi sự kiện đổi trạng thái; điều kiện không được kiểm lại lúc gửi |
| Trạng thái sự kiện không nhất quán giữa các màn hình | Trạng thái dẫn xuất (`FULL`, `PAST`) bị lưu cứng thay vì tính lúc đọc |
| Nút không phản ứng | Handler chưa nối, điều kiện chặn, hoặc vùng bấm bị đè (mobile — chỉ lộ khi chạy thật) |
| Modal không đóng | Callback thành công không gọi `onClose()` / `onSuccess()` |
| "undefined" trong console | Thiếu optional chaining hoặc sai tên prop |
| Lỗi TypeScript sau khi đổi | Kiểu chưa cập nhật theo hợp đồng API mới sinh từ OpenAPI |
| Dữ liệu cá nhân xuất hiện chỗ không nên | Trả thẳng entity thay vì DTO allow-list |

---

## Pha 4 — FIX (đúng chỗ, thay đổi tối thiểu)

**Quy tắc cho bản fix:**
- Chỉ sửa nguyên nhân gốc — không refactor code không liên quan.
- Thay đổi nhỏ nhất giải quyết được vấn đề.
- Nếu fix đụng component/service dùng chung → ghi rõ những màn hình khác cần verify (Pha 5).
- Thêm comment giải thích vì sao fix này đúng (tiếng Anh, mô tả cái nó làm).

```typescript
// ✅ Comment fix tốt:
// Reserve the seat inside the same transaction as the capacity check so two
// concurrent RSVPs cannot both take the last seat
const seat = await manager.query(/* ... FOR UPDATE ... */);

// ❌ Comment fix tệ:
// Fixed bug as requested by user
```

---

## Pha 5 — VERIFY

Sau khi viết fix → chạy
[verification-before-completion/SKILL.md](../verification-before-completion/SKILL.md):

```
□ typecheck → 0 errors
□ Tái lập bug gốc → xác nhận không còn xảy ra
□ Đi trọn happy path
□ Cross-screen: nếu sửa file dùng chung → mở mọi màn hình consumer
□ Nếu đụng thời gian: kiểm với máy đặt múi giờ khác Asia/Ho_Chi_Minh
□ Nếu đụng RSVP/capacity: bắn 2 request song song ở chỗ cuối
□ Nếu đụng truy vấn địa lý: đối chiếu ST_Distance dưới DB ở hai biên bán kính
□ Nếu đụng push: đếm số thông báo nhận trên thiết bị thật, không chỉ nội dung
□ Nếu đụng chuỗi hiển thị: kiểm ở cả EN và VI
□ E2E: chạy spec liên quan (apps/web-client-side/e2e, apps/web-admin-side/e2e hoặc apps/api/e2e)
```

**Ghi lại trong Output Report:**
```
✅ [Tên bug] — FIXED

**Root Cause:** [câu trả lời Pha 3 — 1-2 câu]
**Fix:** [đã đổi gì và vì sao nó đúng]
**Verified:** [kết quả checklist Pha 5]
**Watch out for:** [chỗ khác có cùng pattern, có thể dính cùng bug]
```

---

## Quick Checklist

```
□ Pha 1: Đã xoá giả định, đọc lại vấn đề từ đầu
□ Pha 2: Đã truy vết trọn chuỗi gọi trong code thật (không dựa trí nhớ)
□ Pha 3: Đã xác định nguyên nhân gốc (không phải triệu chứng)
□ Pha 4: Fix tối thiểu, đúng chỗ, có comment giải thích
□ Pha 5: Đã verify bằng app thật + typecheck + cross-screen
```
