---
name: screenshot-evidence
description: Capture a real screenshot of the running app/UI and open it as a VS Code tab as visual proof for every feature/bug/refactor task. Then delete the screenshots once the change is committed/pushed, to avoid disk/memory bloat. Use after any UI-affecting change, especially bug fixes (always show before + after).
allowed-tools: Read, Bash
---

# Screenshot Evidence — Chụp màn thật, mở trong VS Code, rồi dọn

> **Vì sao:** "Done" của dự án này là *typecheck xanh + luồng thật trên browser/app đã
> xác nhận* — đọc code và `tsc` xanh **không phải bằng chứng**. Cả một lớp lỗi của Da
> Nang Connect chỉ lộ ra khi nhìn ảnh chụp thật: ảnh bìa sự kiện bị cắt, chuỗi tiếng
> Việt tràn nút RSVP, bản đồ trắng vì tile chưa load, badge trust level đè lên avatar.
> Đi kèm [webapp-testing](../webapp-testing/SKILL.md),
> [observe-reality](../../rules/observe-reality.md) và
> [verification-before-completion](../verification-before-completion/SKILL.md).

## Khi nào chạy

- Sau BẤT KỲ thay đổi nào người dùng nhìn thấy (màn mobile, trang web, modal, popup,
  chuỗi i18n, layout).
- Sau MỌI bug fix trên luồng người dùng thấy — chụp **before** (lỗi) và **after**
  (đã sửa) để cái diff không cãi được.
- Trước khi báo một task UI là xong.
- **Feature có chữ → chụp cả hai locale**: EN (mặc định) và VI. Bản dịch VI dài hơn
  ~20-30%, tràn layout là lớp lỗi thường gặp nhất và chỉ ảnh mới chứng minh được.

Chỉ bỏ qua với việc thuần backend không có surface hiển thị.

## Quy trình

### 1. Chạy surface thật (đừng mock)

- **Mobile (`apps/mobile`)** — tái dùng cái đang chạy sẵn:
  - Kiểm simulator đang boot + dev client đã cài:
    `xcrun simctl list devices booted` và `xcrun simctl listapps booted | grep danangconnect`.
  - Metro thường đã chạy ở `:8081` (`curl -s localhost:8081/status` →
    `packager-status:running`). Kết nối dev client:
    `xcrun simctl openurl booted "danangconnect://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"`.
  - Điều hướng bằng deep link:
    `xcrun simctl openurl booted "danangconnect://events/<id>"`.
  - Component khó tới (popup xác nhận huỷ RSVP, modal báo cáo vi phạm) → thêm **route
    preview tạm** ở `apps/mobile/app/<name>-preview.tsx` render đúng component thật,
    chụp, rồi **xoá route tạm đi**.
  - Chụp: `xcrun simctl io booted screenshot /tmp/<name>.png`.
  - **Tương tác (tap/gõ chữ), không chỉ chụp** — `simctl` không có lệnh tap; điều
    khiển chuột/bàn phím của máy host lên cửa sổ Simulator:
    1. **Tắt device bezel** trước (`Window > Show Device Bezels` qua
       `osascript ... click menu item "Show Device Bezels" of menu "Window"`) — bật
       bezel thì cửa sổ có khung điện thoại với padding khó đoán; tắt đi thì nội dung
       lấp đầy cửa sổ, chỉ chừa thanh tiêu đề macOS.
    2. Lấy bounds cửa sổ: `osascript -e 'tell application "System Events" to
       tell process "Simulator" to return {position, size} of front window'`
       → `(winX, winY, winW, winH)`.
    3. Đo chiều cao thanh tiêu đề MỘT LẦN mỗi phiên bằng ảnh chụp desktop thật
       (`screencapture -x -R winX,winY,winW,winH out.png`, rồi Read) — đừng giả định
       hằng số, nó thay đổi. Nội dung bắt đầu ở `winY + titleBarPt`.
    4. Quy đổi toạ độ đọc từ ảnh `simctl` (`deviceW × deviceH`) sang điểm click trên
       host: `screenX = winX + (deviceX/deviceW)*winW`,
       `screenY = winY + titleBarPt + (deviceY/deviceH)*(winH - titleBarPt)`.
    5. Tap: `osascript -e 'tell application "Simulator" to activate'` rồi
       `cliclick c:screenX,screenY`.
    6. **Gõ chữ — đừng dùng `System Events keystroke` trực tiếp**: nó đi qua bộ gõ
       đang bật của host, và bộ gõ tiếng Việt (Telex) sẽ âm thầm làm hỏng/cụt chuỗi.
       Thay vào đó chép thẳng vào pasteboard của simulator rồi dán:
       `echo -n "text" | xcrun simctl pbcopy booted`, tap vào ô nhập, rồi
       `osascript -e 'tell application "System Events" to keystroke "v" using {command down}'`.
       Ổn định 100% bất kể layout bàn phím host. Đặc biệt quan trọng khi test chuỗi
       có dấu tiếng Việt và tên có dấu của người dùng expat.
    7. **`Escape` không phải phím "đóng overlay" an toàn** — màn hình có thể có
       handler Escape riêng (đóng cả view, quay về Home) chẳng liên quan tới popup
       bạn định tắt. Đóng overlay bằng cách tap vào phần tử trung tính (header, ô đã
       biết là an toàn) và verify bằng screenshot trước khi tin.
  - **Phần tử re-render theo realtime (socket.io)** — số người đã RSVP, trạng thái
    waitlist, thông báo mới — sẽ **detach node DOM/native đã query trước đó** dù
    locator API vẫn báo "resolved"; hover/click lên tham chiếu cũ thỉnh thoảng lỗi
    "element is not visible". Cách sửa: dùng hàm trả về locator gọi lại ở **mỗi bước**,
    không cache vào biến.
- **Web (`apps/web`)** — lái browser thật (hoặc headless Chrome) tới màn cần chụp rồi
  chụp. Chụp ở **viewport mobile trước** (390×844) rồi desktop, vì phần lớn người dùng
  mở bằng điện thoại.
  - Bản đồ `react-leaflet` load tile bất đồng bộ → chờ marker xuất hiện rồi mới chụp,
    nếu không bạn có bằng chứng của một ô vuông trắng.

### 2. Lưu BÊN TRONG workspace (link phải bấm được)

- Luôn ghi bằng chứng vào `_evidence/` ở gốc repo — đừng chỉ để ở `~/Desktop` hay
  `/tmp`. Link markdown trong chat được resolve **tương đối với gốc workspace**, file
  nằm ngoài repo sẽ thành link hỏng.
- Đảm bảo `_evidence/` đã gitignore (thêm dòng `_evidence/` vào `.gitignore` gốc nếu
  chưa) để bằng chứng không lọt vào commit.
- Đặt tên tự giải thích và có thứ tự, before/after nói rõ, kèm locale khi liên quan:
  `00-rsvp-bug-before.png`, `01-rsvp-fix-after.png`,
  `02-event-detail-vi-overflow.png`. Tên mơ hồ khiến người đọc mở nhầm tab.

### 3. Mở thành tab VS Code

```bash
open -a "Visual Studio Code" _evidence/*.png   # hoặc: code -r _evidence/*.png
```

### 4. Báo cáo

- Trong field `Test evidence` của Output Contract, liệt kê từng ảnh kèm **một câu
  khẳng định mà nó chứng minh**, link bằng đường dẫn tương đối từ gốc repo:
  `[_evidence/01-rsvp-fix-after.png](_evidence/01-rsvp-fix-after.png)`.
- Nói thẳng đây là ảnh chụp thật từ `simctl`/browser, và agent **không** chụp được
  cửa sổ VS Code của người dùng.
- **Che dữ liệu cá nhân** trước khi đưa ảnh vào doc hay chia sẻ: thông tin liên hệ,
  toạ độ nhà, danh sách người tham gia sự kiện (Nghị định 13/2023/NĐ-CP).

### 4b. Surface cần đăng nhập mà không có tài khoản — bằng chứng an toàn

Đôi khi surface thật cần đăng nhập mà bạn không có (tài khoản moderator, endpoint đã
xác thực) và dự án cố tình không để mật khẩu trong source control. **Đừng giả mạo hay
phá cửa** — không lấy JWT secret để tự ký token, không đoán/dò mật khẩu, không reset
credential của người khác chỉ để chụp màn. Harness sẽ (đúng) chặn, và đó không phải
bằng chứng trung thực.

Thay vào đó, chụp bằng chứng ở **đúng tầng đã sinh ra lỗi**, dùng code thật và dữ
liệu thật:

1. **Tái hiện ở tầng lỗi, không mock.** Nếu thủ phạm là DTO/serializer của
   `apps/api`, chạy *đúng* DTO đó qua *đúng* transform options
   (`plainToInstance(RealDto, dbRow, { …interceptor opts })`). Lấy bản DTO trước khi
   sửa thẳng từ git (`git show HEAD:<path>`) để cặp before/after là code thật, không
   phải diễn giải.
2. **Neo vào nguồn sự thật.** Cho thấy dòng trong Postgres (hoặc payload gốc) vẫn
   nguyên vẹn, chứng minh đường ghi không có lỗi và cô lập lỗi ở đường đọc/serialize.
3. **Render evidence card bằng dữ liệu thật.** Ghi JSON before/after *đã bắt được* vào
   một card HTML nhỏ rồi chụp headless
   (`/Applications/Google Chrome.app/... --headless --screenshot`) vào `_evidence/`.
   Đây là bằng chứng trung thực (hiển thị output thật đã bắt), không phải app mock —
   ghi nhãn rõ đây là proof tầng serialization, KHÔNG phải UI thật.
4. **Nói thẳng phần còn thiếu và giao lại cho người dùng.** Nói rõ ảnh UI thật cần
   đăng nhập của họ, và đề nghị: (a) họ đăng nhập để bạn chụp headless, hoặc (b) họ tự
   mở lại 30 giây. Để con người quyết.

Cách này giữ được độ nghiêm của Done-gate (thực tế, không phải đọc code) mà không vượt
qua ranh giới bảo mật.

### 5. Dọn sau khi commit/push (vệ sinh bộ nhớ)

- **Trigger:** khi người dùng xác nhận thay đổi đã commit hoặc push (commit và push
  luôn cần người dùng duyệt — không bao giờ tự chạy).
- **Hành động:** xoá ảnh để không phình đĩa:
  ```bash
  rm -rf _evidence/        # xoá ảnh đã chụp
  rm -f /tmp/*.png         # xoá ảnh nháp của lượt chạy này
  ```
- Xoá luôn route preview tạm còn sót trên đĩa. Giữ dòng `_evidence/` trong
  `.gitignore` (vô hại) trừ khi người dùng yêu cầu bỏ.
- Việc dọn này cũng thuộc [session-end](../session-end/SKILL.md): không để artifact
  bằng chứng sống lâu hơn thay đổi đã commit.

## Output

Một kết luận pass/fail kèm ảnh mở được trong VS Code ở `_evidence/`, cộng xác nhận
artifact sẽ (hoặc đã) bị xoá sau commit/push. Nếu ảnh lộ ra một lỗi, báo đó là bug và
sửa — đừng đánh dấu xong chỉ vì `tsc` xanh.
