---
description: Quy tắc tương thích ngược và không gây regression — không bao giờ phá logic đang chạy tốt khi thêm hoặc sửa code chạm tới nó.
---

# Quy Tắc No-Regression / Tương Thích Ngược

> **🔴 QUY TẮC HÀNH VI ƯU TIÊN CAO NHẤT.** Khi code mới hoặc code sửa chạm vào code
> sẵn có, hành vi đang chạy tốt PHẢI tiếp tục chạy y như cũ, trừ khi người dùng yêu
> cầu đổi rõ ràng. Phá logic đang chạy như tác dụng phụ của một tính năng mới là
> kiểu hỏng gây thiệt hại nhất, và được xử lý như defect P0, không phải "tai nạn".

Quy tắc này mã hoá cách các đội kỹ thuật lớn ship an toàn: **thay đổi bổ sung,
tương thích ngược, có hàng rào chống regression**, kèm phân tích bán kính ảnh hưởng
trước khi chạm bất cứ thứ gì dùng chung hoặc đã tồn tại.

---

## Chỉ thị tối thượng

**Thêm năng lực mà không trừ đi bảo đảm.** Một thay đổi chỉ "done" khi:

1. Yêu cầu mới chạy được, VÀ
2. Mọi đường đang chạy tốt mà thay đổi chạm tới vẫn hành xử y hệt (cùng input →
   cùng output/side effect quan sát được).

Nếu không bảo đảm được điều 2, không ship — DỪNG và nêu ra.

---

## Khi nào quy tắc này bật

Bất cứ khi nào task **thêm vào hoặc sửa code đã tồn tại và đang chạy**, gồm:

- Sửa function, hook, component, service, repository, hay endpoint dùng chung.
- Thêm field/param/nhánh vào logic sẵn có.
- Đổi bảng DB, enum, shape response, chữ ký function, hoặc key i18n.
- Refactor, di chuyển, hay đổi tên bất cứ thứ gì đã có nơi gọi.
- Chạm auth, RSVP/hàng chờ, realtime socket, push, refresh token, hoặc migration.
- Đổi công thức trust score, ngưỡng rate limit, hoặc luật kiểm duyệt đang áp dụng.

File hoàn toàn mới, chưa ai gọi thì rủi ro thấp hơn, nhưng vẫn phải tuân thủ quy
tắc giữ hợp đồng với mọi thứ nó import.

---

## Bước bắt buộc trước khi sửa (bán kính ảnh hưởng trước)

Trước khi sửa code sẵn có, làm các bước này và nêu trong kế hoạch:

1. **Lập bản đồ nơi gọi.** Grep mọi nơi tiêu thụ symbol/file/endpoint/cột sắp
   chạm — nhớ grep cả `apps/web`, `apps/mobile` và `packages/`. Liệt kê ra. Không
   thể bảo vệ thứ mình chưa tìm thấy.
2. **Chụp lại hành vi hiện tại.** Mỗi đường một dòng: hiện tại nó bảo đảm gì
   (input, output, side effect, ca lỗi). Đây là baseline không được làm tệ đi.
3. **Chọn thiết kế bổ sung.** Ưu tiên mở rộng hơn là sửa đổi (xem bảng bên dưới).
   Nếu buộc phải sửa đổi, thiết kế sao cho hành vi cũ là mặc định.
4. **Viết ghi chú tương thích.** Một đoạn ngắn: "Thay đổi này có thể phá hành vi nào,
   và vì sao nó sẽ không phá."

Với việc medium/large/dùng chung/auth, các bước này trở thành **Change Impact
Checklist** bên dưới và là phần người dùng nhìn thấy trong kế hoạch.

---

## Kỹ thuật ưu tiên bổ sung (bộ đồ nghề mặc định)

| Tình huống | Kỹ thuật an toàn |
|---|---|
| Cần hành vi mới trong function sẵn có | Thêm tham số **optional** với default tái tạo hành vi cũ; hoặc thêm function mới và giữ nguyên function cũ |
| Cần field mới trong response API | **Thêm** field; không bao giờ đổi tên/xoá/tái dụng field cũ |
| Cần dữ liệu mới trong DB | Cột nullable mới / bảng mới (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN ... NULL`); `NULL`/vắng mặt phải mang nghĩa "y như cũ" |
| Cần thêm giá trị enum/role/trạng thái | **Thêm** giá trị; không đổi nghĩa giá trị cũ (vd thêm `RsvpStatus.WAITLISTED`, không tái dụng `PENDING`) |
| Cần logic khác cho ca mới | Rẽ nhánh cho ca mới; giữ nhánh cũ nguyên xi |
| Cần đổi output của component dùng chung | Gói hành vi mới sau một prop optional mới; nơi gọi cũ render không đổi |
| Cần thay implementation | Giữ đường code cũ còn chạy được (flag/fallback) tới khi đường mới được xác minh ở mọi nơi gọi |
| Cần đổi truy vấn PostGIS | Thêm truy vấn mới song song, so kết quả với truy vấn cũ trên dữ liệu thật trước khi cắt |

**Bài test vàng:** một nơi gọi sẵn có truyền input *cũ* và đọc output *cũ* phải cần
**0 thay đổi** và quan sát được kết quả **y hệt**.

---

## Giữ hợp đồng (không bao giờ đổi âm thầm)

Coi những thứ sau là hợp đồng đã công bố. Chỉ được thay đổi theo hướng bổ sung;
xoá hoặc tái dụng cần người dùng phê duyệt rõ ràng và một cổng DỪNG:

- **API**: đường dẫn endpoint, field request, shape response, status code, mã lỗi.
- **Chữ ký function/method** và shape trả về ở nơi đã có người gọi.
- **DB**: tên/kiểu/ý nghĩa cột, giá trị enum, NOT NULL/default, index mà truy vấn phụ thuộc.
- **Auth/session**: field trong payload token, ngữ nghĩa role và tier, hành vi
  refresh, thời hạn.
- **Key i18n**, tên prop component, tên event/topic socket, query key của TanStack Query.
- **Kiểu trong `packages/shared-types`** — một thay đổi ở đây chạm cả ba app cùng lúc.

Khi buộc phải đọc một giá trị sẵn có theo cách khác (ví dụ refresh token đọc role
từ nguồn mới), giữ **fallback** để bản ghi/token cũ vẫn hành xử như hôm nay.

---

## Cấm nếu chưa được phê duyệt

- Âm thầm đổi hành vi của logic sẵn có như tác dụng phụ của một tính năng.
- Xoá/đổi tên/tái dụng field, param, cột, enum, hay key đã tồn tại.
- Siết validation trên input trước đó vẫn đi qua được.
- Trộn refactor (di chuyển/đổi tên/format) với đổi hành vi trong cùng một bước —
  làm refactor giữ nguyên hành vi trước, xác minh, rồi mới đổi hành vi ở bước riêng.
- Xoá đường code cũ trước khi đường mới được xác minh ở mọi nơi gọi.
- "Cải thiện" code lân cận mà task không yêu cầu.

Nếu thật sự cần một thay đổi phá vỡ, **DỪNG** và theo cổng phê duyệt trong
[planning-and-agent-mode.md](planning-and-agent-mode.md) §Cổng rủi ro: nêu rõ cái gì
bị phá, ai bị ảnh hưởng, kế hoạch migration/rollback, rồi chờ phê duyệt.

---

## Change Impact Checklist (điền trước khi sửa code dùng chung/cũ/auth)

```md
## Change Impact
Touching: <symbol / file / endpoint / cột>
Existing callers/consumers: <danh sách — từ grep, không từ trí nhớ>
Current behavior (baseline contract): <hôm nay chạy thế nào, theo từng đường>
New behavior added: <đổi gì>
Why existing paths are unaffected: <lý luận về default/null/fallback/flag>
Breaking? : no | yes (DỪNG — liệt kê phần phá vỡ + migration + rollback, xin phê duyệt)
Regression verification: <test/flow nào chứng minh đường cũ vẫn chạy>
```

---

## Cổng xác minh (Done = chứng minh cả cũ lẫn mới)

Task có chạm code sẵn có **chưa done** cho tới khi:

1. Hành vi mới đã được xác minh (bằng chứng web/mobile/API/typecheck theo cổng Done).
2. **Bằng chứng regression** cho các đường cũ mà thay đổi chạm tới: chạy test sẵn
   có, và đi lại ít nhất luồng đang chạy tốt dùng chung phần code vừa sửa. Báo cáo
   rõ ràng.
3. Với component/hook dùng chung (3+ nơi tiêu thụ): kiểm tra chéo bề mặt theo
   [behaviors.md](behaviors.md) §B4 — cả web lẫn mobile nếu cả hai đều tiêu thụ.
4. Ghi chú tương thích ở bước trước được xác nhận là đúng, không phải giả định.

Nêu cả hai trong báo cáo: "New: … / Regression (đường cũ vẫn OK): …".

---

## Vì sao có quy tắc này

Phá tính năng đang chạy như tác dụng phụ của tính năng mới gây thiệt hại thật và
tốn công làm lại. Quy tắc này biến việc bảo vệ code đang chạy thành một deliverable
hạng nhất, không thương lượng — đúng chuẩn mà một đội kỹ thuật trưởng thành cưỡng
chế qua code review, regression test và hợp đồng tương thích ngược.
