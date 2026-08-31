---
description: Cổng xác minh ba pha — E2E tự động, build thật trên simulator/emulator đa nền tảng, và đối chiếu nhiều bề mặt cùng lúc. Nạp trước khi báo "done" cho việc xuyên app, đa nền tảng, hoặc chạm phần native của mobile.
---

# Xác Minh Ba Pha — E2E → Build Thật → Đối Chiếu Nhiều Bề Mặt

> Với việc UI xuyên app/đa nền tảng, xác minh phải đi qua 3 pha theo thứ tự. Đây là
> **biến thể nặng** của cổng Done trong [checklists.md](checklists.md) — nó không
> thay thế [observe-reality.md](observe-reality.md), `webapp-testing`, hay
> `screenshot-evidence`; nó xâu chuỗi chúng lại, cộng thêm một build native thật và
> một lần đối chiếu nhiều bề mặt cùng lúc mà các skill kia không tự ép.

## Khi nào rule này bật

**Cổng chính: kích thước task = large.** Phân loại kích thước trước theo
[planning-and-agent-mode.md](planning-and-agent-mode.md) (>8 file, xuyên app, hợp
đồng DB/API, luồng dùng chung, hoặc đổi kiến trúc). Chuỗi 3 pha đầy đủ chỉ chạy
**trên task large** — đừng tự bật cho việc bug/small/medium chỉ vì nó tình cờ chạm
app thứ hai hay chạm code native; dùng cổng Done nhẹ hơn (checklists.md +
observe-reality.md + webapp-testing + screenshot-evidence).

Tự bật trên task đã phân loại **large** khi kèm thêm một trong các dấu hiệu:

- **Xuyên app**: một luồng đi qua 2+ trong số `apps/mobile`, `apps/web`, `apps/api`
  và một bề mặt phải phản ánh việc vừa xảy ra ở bề mặt kia (realtime RSVP, hàng chờ
  thăng hạng, chat theo sự kiện, thông báo, đồng bộ console kiểm duyệt ↔ app).
- **Code mobile chạm phần native**: push notification, deep link, permission (vị trí,
  camera quét QR check-in), native module, `app.config.ts` / `eas.json`, kết nối lại
  socket.
- **Bản dựng phát hành mobile** (đi kèm
  [app-store-deploy](../skills/app-store-deploy/SKILL.md) — bản release luôn được
  coi là large bất kể diff to nhỏ).

Thắng cả cổng kích thước (bật bất kể task to nhỏ):

- Người dùng yêu cầu rõ: "test kỹ", "cross-platform test", "test 3 phase",
  "build simulator test", "so sánh nhiều màn hình".

Bỏ qua với task bug/small/medium — kể cả loại xuyên app hoặc chạm native — trừ khi
người dùng yêu cầu rõ; nói thẳng pha nào bị bỏ và vì sao (cùng kỷ luật với
observe-reality.md §G). Bỏ hoàn toàn với thay đổi chỉ backend, không có bề mặt render.

---

## Pha 1 — E2E tự động

Mục tiêu: chứng minh luồng đã được mã hoá và lặp lại được, không phải "thử tay một
lần thấy chạy".

| App | Cơ chế E2E | Lệnh |
|---|---|---|
| `apps/web` | Spec Playwright dưới `apps/web/e2e/**` (theo luồng, so sánh chặt, dọn dữ liệu bắt buộc) | `pnpm --filter @dnc/web exec playwright test e2e/<spec>.spec.ts` |
| `apps/api` | Spec Jest dưới `apps/api/e2e/**` theo [test-file-placement.md](test-file-placement.md) | `pnpm --filter @dnc/api exec jest e2e/modules/<module>/<name>.spec.ts` |
| `apps/mobile` | **Chưa có harness Detox/Maestro** — E2E là luồng thủ công có kịch bản, ghi trong `apps/mobile/testcase/<module>/testcases.md` (Test ID `<MODULE>-<GROUP>-<NN>`; luồng smoke xuyên app là `SM-*` trong `testcase/cross-feature/testcases.md`). Chạy/mở rộng đúng Test ID và lưu bằng chứng theo quy ước đặt tên (`testcase/<module>/evidence/<TestID>-pass.png`). | Thủ công, chạy qua simulator — nối tiếp vào Pha 2 |

Quy tắc:

- Viết/mở rộng spec hoặc Test ID TRƯỚC, dựa trên hành vi quan sát được thật (không
  bao giờ assert theo phỏng đoán).
- Báo đúng lệnh và exit code, hoặc Test ID + pass/fail, trong `Test evidence`.
  Thiếu hiện vật E2E cho một tính năng UI/endpoint mới là một lỗ hổng phải nêu ra,
  không phải mặc nhiên coi là pass.
- Mobile: khi nào có harness Detox/Maestro thì thay dòng mobile trong bảng — trước
  đó đừng ngầm giả định đã có coverage tự động cho mobile.

## Pha 2 — Build thật trên simulator/emulator, đa nền tảng

Mục tiêu: bắt những thứ Metro/dev-client hot reload không bắt được — cấu hình build
native, hành vi riêng theo nền tảng, permission, push token.

1. **Chọn độ nặng của build theo rủi ro:**
   - Thay đổi chạm native (push, deep link, native module, `app.config.ts` /
     `eas.json`, permission, khoá auth) → build native thật tại máy:
     `pnpm --filter @dnc/mobile run ios` (`expo run:ios`) và/hoặc
     `pnpm --filter @dnc/mobile run android` (`expo run:android`). Với bản release,
     dùng luồng đầy đủ của [app-store-deploy](../skills/app-store-deploy/SKILL.md)
     (`eas build --profile production`).
   - Thay đổi thuần JS/RN hoặc chỉ layout, không chạm native → boot simulator/
     dev-client đang chạy là đủ (`xcrun simctl list devices booted` +
     `simctl openurl` cho deep link, theo
     [screenshot-evidence](../skills/screenshot-evidence/SKILL.md) Bước 1). Nói rõ
     đây là đường nhẹ và vì sao chọn nó.
2. **Đa nền tảng**: chạy luồng trên **iOS simulator VÀ Android emulator** khi thay
   đổi có thể lệch theo nền tảng (native module, safe-area/bàn phím, permission,
   push token, cử chỉ/nút back). Với thay đổi JS thuần, chạy iOS thôi cũng chấp
   nhận được nhưng phải nói rõ ("Android coi là an toàn — thay đổi thuần JS, không
   chạm code native/nền tảng") — không bao giờ âm thầm bỏ Android.
3. Các bẫy khi chạy local cần loại trừ trước khi kết luận build "fail":
   - Monorepo pnpm cần `node-linker=hoisted` trong `.npmrc` gốc; thiếu nó Metro
     không đi theo symlink và báo lỗi không tìm thấy module — đó là lỗi môi trường,
     không phải lỗi code.
   - `npx expo start` có thể bị hook proxy lệnh local viết lại sai — dùng
     `./node_modules/.bin/expo start --ios`, hoặc script `run ios` / `run android`
     để tránh bẫy.
   - Đăng nhập cần API local chạy và biến môi trường `EXPO_PUBLIC_API_URL` trỏ
     đúng, nếu không mọi request đều 401 — cũng là lỗ hổng môi trường, không phải bug.
4. Bằng chứng: build thành công (không red screen / crash native), app khởi động,
   và đến được màn hình đích trên từng nền tảng đã test.

## Pha 3 — Đối chiếu nhiều bề mặt cùng lúc

Mục tiêu: bắt bug nhất quán xuyên bề mặt mà test một màn không thấy — đây là chỗ
regression realtime/xuyên app hay ẩn nấp.

1. Mở **2+ bề mặt thật cùng lúc** cho CÙNG một thực thể/luồng — ví dụ simulator
   mobile + tab browser web, iOS simulator + Android emulator cạnh nhau, hoặc
   `apps/mobile` + màn chi tiết sự kiện trên `apps/web` cho cùng một occurrence.
2. Thực hiện hành động kích hoạt trên MỘT bề mặt, rồi quan sát bề mặt CÒN LẠI mà
   không dùng mẹo refetch thủ công — socket.io phải phản ánh nó, hoặc phải có hợp
   đồng pull-to-refresh/mở lại đã ghi rõ (nêu hợp đồng nào áp dụng trước khi phán
   pass/fail).
3. Chụp screenshot **đồng thời** theo
   [screenshot-evidence](../skills/screenshot-evidence/SKILL.md) (đặt tên để thấy rõ
   cặp đôi, ví dụ `02-mobile-after-rsvp.png` + `03-web-after-rsvp.png`), mở tất cả
   cùng lúc để so bằng mắt — không bao giờ mô tả lại từ trí nhớ.
4. Triangulate trên TẤT CẢ bề mặt đang mở cộng backend, không chỉ một cặp UI ↔ API
   (observe-reality.md §C, mở rộng ra N màn): `UI-A ↔ UI-B ↔ API response ↔ DB`.
   Lệch ở bất kỳ cặp nào = bug.
5. Các lớp lỗi giá trị cao cần kiểm riêng khi thay đổi là realtime/xuyên app:
   - Console kiểm duyệt chỉ lắng nghe topic của phòng `moderators`, còn app người
     dùng lắng nghe phòng theo `event:<id>`. Xác nhận bề mặt kia refresh nhờ CHÍNH
     kênh của nó, chứ không phải vì chỉ nhìn mỗi phía mobile.
   - Query key của TanStack Query dùng trong invalidate realtime phải trùng khít
     từng byte với key mà màn đang đọc dùng — lệch key thì việc refresh im lặng
     không xảy ra, và nhìn từng màn riêng vẫn thấy "ổn".
   - Số chỗ trống và trạng thái waitlist phải khớp giữa mobile, web và DB sau khi
     một người huỷ RSVP.
6. Định dạng kết luận — nêu theo từng bề mặt, không bao giờ viết "cả hai đều ổn":
   ```
   Mobile (iOS sim):  <thấy gì, vd "RSVP chuyển sang Going, còn 3 chỗ">
   Web (Chrome):      <thấy gì, vd "trang sự kiện hiện 17/20 sau khi socket đẩy">
   Match: yes/no — <lý do>
   ```

---

## Đầu ra

Báo cả 3 pha trong trường `Test evidence` của hợp đồng đầu ra, mỗi pha một dòng:

```
Test evidence:
- Phase 1 (E2E): <lệnh/Test ID -> exit code / pass-fail>
- Phase 2 (build/cross-platform): <ios: pass/fail, android: pass/fail/bỏ-qua-và-vì-sao>
- Phase 3 (multi-surface): <các bề mặt đã so -> khớp/lệch, link screenshot>
```

Task thuộc phạm vi rule này chưa "done" cho tới khi cả 3 dòng đều có bằng chứng
thật — "chắc là chạy" hay một screenshot của một màn duy nhất là không đủ.
