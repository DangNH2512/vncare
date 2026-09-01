---
name: bug-report-sheet
description: Turn raw bug reports (chat screenshots, screen recordings, tester PDFs, verbal complaints) into a professional QA bug-log sheet — triaged, de-duplicated, root-cause investigated, exported to CSV + XLSX + Markdown. Use when asked to "log bug", "tạo sheet bug", "sheet báo bug", "tổng hợp bug", "list bug từ ảnh/video", "bug tracker", or when a batch of tester feedback arrives and needs to become trackable work items.
allowed-tools: Read, Write, Edit, Bash
---

# Bug Report Sheet — Raw Feedback → Trackable Bug Log

> **Bối cảnh:** Da Nang Connect có 3 surface (`apps/api`, `apps/web`, `apps/mobile`)
> và tester là người dùng thật trong cộng đồng expat — họ báo lỗi bằng ảnh chụp màn
> hình, video quay điện thoại, tin nhắn tiếng Anh lẫn tiếng Việt. Skill này biến
> mớ đó thành một sổ theo dõi mà chủ dự án gõ vào được hằng ngày.

## When to run

- "tạo sheet bug", "log bug", "sheet báo bug", "tổng hợp bug", "bug tracker".
- Một đợt feedback tester/khách hàng đổ về (chat cộng đồng, Zalo, e-mail, PDF).
- Sau một buổi test, để biến findings thành task card giao được cho dev.

**Do NOT** run for a single bug the user wants fixed right now — that is
[`/debug`](../../commands/debug.md) + [systematic-debugging](../systematic-debugging/SKILL.md).
This skill produces a **log**, not a fix.

---

## Rule 0 — Có tracker sẵn thì bám theo, không có thì dùng bộ cột ở Rule 5

Trước khi thiết kế cột: **kiểm tra xem đã có tracker nào đang chạy chưa**.

```bash
ls docs/test-cases/                                    # bản đã lưu trong repo
mdfind -onlyin ~/Downloads -onlyin ~/Documents 'kMDItemFSName == "*bug*tracker*"'
```

- **Có file của một đội QC bên ngoài gửi sang** → sao chép nguyên xi thứ tự cột, tên
  cột, thang Severity, bộ Dev Status, cấu trúc sheet tóm tắt, màu header. Log của ta
  phải **ghép được** vào quy trình họ đang chạy, không bắt họ học format thứ hai.
  Chỉ được lệch khi sửa một lỗi thật trong file gốc — và phải **ghi rõ lệch chỗ nào,
  vì sao**.
- **Không có (mặc định của dự án này)** → dùng bộ 20 cột ở Rule 5, sinh bằng
  `scripts/make_sheet.py`.

🚫 **Tracker của dự án khác chỉ dùng làm KHUÔN — tuyệt đối không lấy dữ liệu của nó.**
Không copy dòng bug của dự án khác sang, không sửa/ghi đè file gốc, không tạo file
phái sinh từ nó trừ khi người dùng **nói rõ ràng bằng câu đầy đủ**. Câu ngắn kiểu
"viết file xlsx ấy" luôn hiểu là **file của Da Nang Connect** — mơ hồ thì HỎI LẠI,
đừng suy diễn.

## Rule 1 — Evidence first, never paraphrase from memory

Mỗi dòng phải truy được về một artifact thật. Đọc artifact TRƯỚC khi viết dòng đầu tiên:

| Artifact | How to read it |
|----------|----------------|
| Ảnh chụp màn hình trong chat | `Read` ảnh; chép **nguyên văn** caption của người báo vào field `Nguyên văn` (giữ nguyên tiếng Anh/tiếng Việt và cả lỗi chính tả) |
| Video quay màn hình (`.mov`/`.mp4`) | `ffmpeg` contact sheet trước, rồi trích key frame phóng to: <br>`ffmpeg -i V.mov -vf "fps=2,scale=300:-1,tile=8x4" -frames:v 1 sheet.png` <br>`ffmpeg -ss 21 -i V.mp4 -frames:v 1 -vf "scale=1696:-1:flags=lanczos" f21.png` |
| Báo cáo PDF | `pdftotext -layout file.pdf -` |
| Batch vừa tải về | `mdfind -onlyin ~/Downloads 'kMDItemDateAdded >= $time.today(-3)'` |

Artifact mơ hồ → status dòng đó là `Cần làm rõ` — **không bao giờ bịa bước tái hiện**.

⚠️ **Che dữ liệu cá nhân trước khi lưu ảnh vào repo**: thông tin liên hệ, toạ độ nhà,
danh sách người tham gia sự kiện. Ảnh bằng chứng vẫn phải
đọc được chỗ lỗi, nhưng PII thì bôi.

## Rule 2 — One row = one defect (split and de-duplicate)

- Một tin nhắn thường chứa 2–3 lỗi → tách thành các dòng riêng.
- Cùng một lỗi do 2 người báo → một dòng, cả hai tên trong `Người báo cáo`.
- Yêu cầu không phải lỗi ("đổi nhãn nút", "cho lọc theo khung giờ") vẫn log, nhưng
  gắn `Loại = Đề xuất`. **Không thổi phồng số bug bằng feature request.**
- **Cùng triệu chứng ở Web và Mobile = một dòng** với `Platform = "Web, iOS"` — trừ
  khi nguyên nhân khác nhau (vd web sai format ngày, mobile sai timezone) thì tách.

## Rule 3 — Investigate before assigning status (đây là điểm khác biệt)

Với mỗi dòng, bỏ một lượng công sức có giới hạn để tìm nguyên nhân khả dĩ trong repo
và ghi lại `file:line`.

**Ownership map:**

| Thư mục | Owner |
|---|---|
| `apps/api` | Backend (NestJS, TypeORM, PostGIS, BullMQ) |
| `apps/web` | Web (Next.js App Router) |
| `apps/mobile` | Mobile (Expo / React Native) |
| `packages/shared-types` | Shared — sửa ở đây ảnh hưởng cả 3 |
| `ops/` | DevOps (Docker Compose, CI/CD, Sentry) |

```bash
grep -rn "<từ khoá triệu chứng>" apps/api/src apps/web/src apps/mobile/src | head
git log --format="%h %ad %s" --date=short -5 -- <file nghi ngờ>   # đã fix rồi chưa?
```

Trước khi kết luận "lỗi phía UI", kiểm nhanh mấy nghi phạm quen của sản phẩm này:

- Số/trạng thái sai (spots left, waitlist, trust level) → request có 401/403 không?
  (state mặc định trông-như-thật khi fetch fail âm thầm)
- Lệch ngày 1 hôm → lưu UTC nhưng render không đổi sang `Asia/Ho_Chi_Minh`.
- "Không thấy sự kiện nào quanh đây" → truy vấn PostGIS sai SRID / sai đơn vị /
  đảo thứ tự `(lng, lat)`.
- Chữ lạ hoặc lòi khoá thô → thiếu key i18n ở locale EN hoặc VI.
- Thông báo trùng/gửi nhầm người → job Expo push không idempotent.
- "Vẫn thấy người tôi đã chặn" → block chỉ ẩn ở UI, chưa enforce ở API.

Status vocabulary (chỉ dùng những giá trị này):

| Status | Điều kiện |
|--------|-----------|
| `Mới` | Ghi nhận, chưa ai đụng |
| `Đã xác định nguyên nhân` | Có `file:line` + hướng fix, chưa code |
| `Đang xử lý` | Có branch/commit đang chạy |
| `Đã fix - chờ verify build` | Code trong repo đã sửa nhưng build tester dùng còn cũ (**phải dẫn commit + ngày**) |
| `Đã fix - đã verify` | Có bằng chứng chạy thật (screenshot/log) |
| `Cần làm rõ` | Thiếu bước tái hiện hoặc thiếu thông tin môi trường |
| `Không phải bug` | Đúng theo thiết kế — ghi lý do |
| `Tạm hoãn` | Có chủ đích, ghi ai quyết định |

Never write `Đã fix` from code reading alone — that violates
[verification-before-completion](../verification-before-completion/SKILL.md).

## Rule 4 — Severity vs Priority là hai cột khác nhau

| Severity | Nghĩa |
|----------|-------|
| `Blocker` | Mất dữ liệu / crash / không đăng nhập được / lộ dữ liệu cá nhân / chặn không có hiệu lực |
| `Major` | Luồng nghiệp vụ chính sai hoặc không dùng được, chưa có workaround (RSVP, waitlist, tạo sự kiện, lọc khu vực) |
| `Minor` | Sai/khó dùng nhưng có workaround; thẩm mỹ, chính tả, nhãn |

Priority `P1/P2/P3` phản ánh **thứ tự làm**, do người quyết định nghiệp vụ chốt —
severity cao vẫn có thể P3 nếu nằm ở màn hình chưa phát hành.

## Rule 5 — Bộ cột chuẩn của dự án (20 cột, khớp `scripts/make_sheet.py`)

```
  (STT) | Xong chưa? | Loại | Revision/Build | Platform | Thời điểm test |
Màn hình | Content | Pre-condition | Expected | Actual | Environment | Severity |
Proof (ảnh tester) | Dev Status | Fix commit | Proof-of-fix (ảnh sau fix) |
Verify | Phản hồi Dev (chi tiết) | Phản hồi QC (chi tiết)
```

| Quy ước | Nội dung |
|---------|----------|
| `Loại` | `Bug` / `Đề xuất` / `Không phải bug` / `Cảnh báo` — nói ngay dòng này là loại gì |
| `Platform` | `All` / `Web` / `Android` / `iOS`; nhiều nền tảng ghi `Web, iOS` |
| `Màn hình` | dạng `Màn-Chức năng`, vd `Events-Detail`, `RSVP-Waitlist`, `Onboarding-Chọn khu vực`, `Moderation-Báo cáo` |
| `Content` | 1 câu mô tả lỗi. Tiền tố `[Đề xuất]` nếu là yêu cầu cải tiến, `[FB by <tên>]` nếu do stakeholder báo, `[Role ...]` nếu chỉ xảy ra với 1 vai trò (member / organizer / moderator) |
| `Expected` / `Actual` | gạch đầu dòng `- `, mỗi ý một dòng |
| `Environment` | build + thiết bị + **locale**, vd `Web Chrome 129 - locale EN`, `iPhone 15 iOS 18.2 - locale VI`. Lỗi i18n mà thiếu locale là không tái hiện được |
| `Severity` | **Blocker / Major / Minor** |
| `Proof (ảnh tester)` | `NN-<platform>-<màn>-<chucnang>.png\|mp4` + tên file gốc trong ngoặc nếu có |
| `Dev Status` | New · Fixed · Wont-fix · Cannot-repro · Đã trả lời · In progress · Cần PO xác nhận · Chấp nhận tạm - làm sau |
| `Phản hồi Dev` | `[YYYY-MM-DD] Nguyên nhân: <file:line> … \| Hướng fix: …`, nối nhiều lần trả lời bằng ` \| ` |
| `Verify` | OK / Fail — **để trống** cho tới khi QC verify trên build mới |

Bug và đề xuất nằm **cùng một sheet**, phân biệt bằng cột `Loại` (+ tiền tố
`[Đề xuất]` trong `Content`) — không tách sheet riêng.

Giữ nguyên văn lời người báo trong `Phản hồi QC` hoặc trong `Content` (kể cả sai
chính tả, kể cả tiếng Anh) để chống diễn giải sai. `Proof` ghi **tên file thật**,
không mô tả chung chung.

## Rule 5b — LUÔN LUÔN xuất ra file `.xlsx`. Không có ngoại lệ.

Deliverable của skill này **là file Excel**. Markdown và CSV chỉ là phụ kiện.

- ❌ Không được dừng ở bảng Markdown trong câu trả lời chat.
- ❌ Không được giao mỗi CSV rồi bảo "anh tự mở bằng Excel".
- ❌ Không được coi là xong khi chưa `python make_sheet.py … --out <file>.xlsx`.
- ✅ Mỗi lần chạy skill (kể cả khi chỉ **sửa/bổ sung vài dòng**) đều phải sinh
  lại `.xlsx` và copy sang `~/Downloads/`.
- ✅ Đọc lại file `.xlsx` vừa ghi bằng openpyxl để xác nhận trước khi báo xong.

Nếu người dùng chỉ nói "cập nhật lại bug X" → vẫn xuất `.xlsx` mới. File Excel là
thứ họ mở, không phải câu trả lời trong chat.

## Rule 5c — Sửa workbook của người khác: vá XML, TUYỆT ĐỐI không round-trip openpyxl

Khi phải sửa một file Excel do người khác tạo (vd sửa công thức trong tracker của đội
QC thuê ngoài), **kiểm tra file có gì trước đã**:

```bash
unzip -l file.xlsx | grep -E "comments|threadedComments|media/|drawings|_rels/sheet"
```

Có `comments*.xml`, `threadedComments`, `media/*.png`, `drawings/`, hoặc file `_rels`
lớn ⇒ **openpyxl load+save sẽ xoá sạch** (comment, ảnh nhúng, hyperlink, pivot, chart).

Cách đúng — vá phẫu thuật bằng `zipfile`:

1. Mở file gốc bằng `zipfile`, chỉ **thay đúng part cần sửa** (thường là
   `xl/worksheets/sheetN.xml` của sheet tổng hợp).
2. Giữ nguyên prolog/epilog của sheet (đặc biệt `<drawing r:id=…/>`), tái dùng đúng
   `s="…"` style id sẵn có ⇒ giao diện không đổi.
3. Dùng `t="inlineStr"` để **không phải đụng `sharedStrings.xml`**.
4. Ghi công thức **không kèm `<v>` cache** + set `fullCalcOnLoad="1"` trong
   `xl/workbook.xml` ⇒ Excel tự tính lại khi mở.
5. Ghi ra **file mới** (`…-fixed.xlsx`), không đè bản gốc.
6. Chứng minh: so byte-for-byte mọi part KHÔNG sửa giữa file cũ và file mới, và
   khẳng định sheet dữ liệu không đổi.

Xác định đúng chỉ số cột trước khi viết công thức (đừng đoán `$C$`/`$M$` — vị trí cột
khác nhau giữa các tracker).

## Rule 6 — Ba artifact, và file Excel phải ĐIỀN ĐƯỢC

Deliverable không phải bảng tĩnh để đọc — nó là **sổ theo dõi chủ dự án gõ vào
hằng ngày**. Bản xuất tĩnh coi như chưa xong.

1. `docs/test-cases/bug-log-<YYYY-MM-DD>.md` — bản đọc cho người, có phần
   **Tóm tắt điều hành** (đếm theo platform/severity/status) đặt TRƯỚC bảng.
2. `docs/test-cases/bug-log-<YYYY-MM-DD>.csv` — UTF-8 **có BOM** (Excel/Google
   Sheets tiếng Việt không vỡ font); cột theo dõi để trống sẵn.
3. `~/Downloads/bug-tracker-<scope>.xlsx` — workbook 2 sheet
   (`bug-tracker-<scope>` + `Tóm tắt`) do
   [`scripts/make_sheet.py`](scripts/make_sheet.py) sinh ra.

Bắt buộc có trong workbook:

| Yêu cầu | Vì sao |
|---------|--------|
| 20 cột + header xanh `2E7D32` + `freeze_panes` qua cột `Loại` | STT / Xong / Loại luôn nhìn thấy khi cuộn ngang |
| **Dropdown** ở `Loại` / `Platform` / `Severity` / `Dev Status` / `Verify`, phủ tới dòng 1000 | Dòng thêm sau này đã có sẵn dropdown |
| `errorStyle="warning"` cho dropdown | Vẫn gõ được `Web, iOS` (có dấu phẩy) khi lỗi gặp cả hai — không được chặn |
| `Proof-of-fix` và `Verify` **để trống** | Đó là phần QC điền sau khi verify build mới |
| `Tóm tắt` dùng **COUNTIFS** trên vùng tới dòng 1000 | Dashboard tự cập nhật khi thêm/sửa dòng |
| ≥60 **dòng trống đã kẻ sẵn** ở cuối | Thêm bug mới là gõ thẳng, không phải copy định dạng |

```bash
python3 -m venv /tmp/bugsheet-venv && /tmp/bugsheet-venv/bin/pip install -q openpyxl
/tmp/bugsheet-venv/bin/python .agent/skills/bug-report-sheet/scripts/make_sheet.py \
  --rows  docs/test-cases/bug-tracker-<scope>-<date>.csv \
  --out   ~/Downloads/bug-tracker-<scope>.xlsx \
  --sheet bug-tracker-<scope> --blank-rows 60
```

Verify trước khi báo xong: mở lại file vừa ghi, so header đủ 20 cột, đúng
`freeze_panes`, đủ 5 data-validation, và đếm lại Severity/Dev Status/Platform từ chính
file đó.

## Rule 7 — Hand off, don't dead-end

Kết thúc phải đề xuất **gom nhóm thành task card** theo owner (Backend / Web / Mobile /
Shared / DevOps) để [multi-agent-task](../../workflows/multi-agent-task.md) nhận việc
ngay, và nêu rõ mục nào cần chủ dự án quyết định nghiệp vụ (vd: huỷ RSVP sau deadline
thì tính no-show hay không).

---

## Output (definition of done)

- [ ] Đã kiểm tra có tracker sẵn hay không và chọn đúng format (Rule 0).
- [ ] Mọi artifact trong nguồn đã được mở và đọc (ảnh + video frame + PDF).
- [ ] Mỗi dòng có: nguyên văn, Actual, Expected, Proof có thật, `Environment` ghi rõ
      build + thiết bị + locale.
- [ ] ≥80% dòng có nguyên nhân kèm `file:line` trong "Phản hồi Dev", hoặc nêu rõ
      vì sao chưa điều tra được.
- [ ] `Verify` để trống — không tự đánh OK khi chưa chạy thật trên build mới.
- [ ] Ảnh bằng chứng đã che dữ liệu cá nhân trước khi lưu vào repo.
- [ ] **Đã xuất `.xlsx`** và copy sang `~/Downloads/` (Rule 5b — bắt buộc, mọi lần).
- [ ] Đã đọc lại chính file `.xlsx` vừa ghi để verify (header/format/đếm lại
      Severity + Dev Status), không chỉ tin vào log của script.
- [ ] Nếu có sửa workbook của người khác: chứng minh các part khác giữ nguyên
      byte-for-byte (Rule 5c).
- [ ] Có bảng đề xuất task card theo owner + danh sách mục cần chủ dự án quyết.
