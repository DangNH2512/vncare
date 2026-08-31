---
name: owner-guide-pdf
description: Soạn và xuất PDF hướng dẫn từng bước để chủ dự án (người không rành kỹ thuật) tự làm các việc sở hữu tài khoản / xác minh doanh nghiệp / cấp quyền truy cập (Google, Meta/Facebook, Apple Developer, Sentry, Expo/EAS...). Dùng khi người dùng yêu cầu "xuất file hướng dẫn cho chủ dự án/owner", "export PDF guide", "guide for the business owner to do X", hoặc khi bàn giao một tài khoản bên thứ ba cho một người cụ thể. Kết quả là PDF gãy gọn, không icon, mỗi bước có URL, dùng stylesheet dùng chung của repo.
allowed-tools: Read, Write, Edit, Bash
---

# Owner Guide PDF — Hướng Dẫn Gãy Gọn Xuất Ra PDF

> **Nguồn / Xuất xứ:** Chuẩn nội bộ của Da Nang Connect. Kế thừa
> [`doc-formatting`](../doc-formatting/SKILL.md) (căn đều hai lề, link bấm được)
> và bổ sung hợp đồng nội dung của owner guide cùng pipeline xuất PDF tái lập
> được. Guide sinh ra nằm ở `docs/guides/`.

## Khi nào dùng

- Người dùng cần một hướng dẫn mà **chủ dự án / người không rành kỹ thuật** sẽ
  tự làm theo ("hướng dẫn cho chủ dự án", "guide cho anh/chị X", "owner guide").
- Bàn giao một tài khoản/dịch vụ bên thứ ba cho một người cụ thể, rồi để người đó
  cấp quyền truy cập ngược lại cho đội kỹ thuật.
- Bất cứ việc gì phải kết thúc bằng một **file PDF** mà chủ dự án tự đọc.

Nếu việc cần làm là báo cáo kỹ thuật nội bộ (không phải cho chủ dự án đọc), dùng
thẳng [`doc-formatting`](../doc-formatting/SKILL.md).

---

## Hợp đồng nội dung (bốn điều không thương lượng)

Bốn quy tắc này là lý do skill này tồn tại. Vi phạm một điều là phải làm lại.

1. **Gãy gọn.** Mỗi bước một hành động. Câu ngắn. Không viết đoạn văn nền. Chủ dự
   án *quét* chứ không đọc. Ưu tiên một dòng `**Mục tiêu:**` rồi tới hành động.
2. **Mỗi bước có URL cụ thể.** Mọi bước phải mở website đều liệt kê đúng trang đó
   dưới dạng **bullet URL trần** (bấm được, tự xuống dòng trong PDF). Thêm một URL
   trang trợ giúp chính thức làm phương án dự phòng, vì giao diện nhà cung cấp hay
   đổi tên nút — chủ dự án đi theo *mục tiêu*, không theo nhãn nút cố định.
3. **Bước phải cụ thể.** Đánh số phần (`## 1.`, `### 1.1.`). Mỗi bước con là một
   hành động có đánh số, kèm tên trường/menu nguyên văn (ví dụ "Access and
   security", "Bundle ID `app.danangconnect`").
4. **Không icon. Không emoji. Tuyệt đối.** Không ✅ ❌ 🔴 ⚠️ 📌 💳 📨 🔗, không dấu
   tích/dấu chéo, không ký hiệu trang trí ở bất kỳ đâu trong nội dung, bảng biểu
   hay checklist. Dùng chữ thường ("Bắt buộc", "Không cần", "Xong bước A:") và
   `- [ ]` cho checklist. Đây chính là quy tắc mà các guide cũ hay phá; đừng lặp lại.

### Ranh giới chủ dự án và đội kỹ thuật (nói một lần, đặt gần đầu tài liệu)

Chủ dự án chỉ lo **quyền sở hữu, thanh toán, xác minh và cấp quyền truy cập**. Đội
kỹ thuật làm phần cấu hình trong app / trong code sau khi đã được cấp quyền. Phải
nói rõ điều này để chủ dự án không bao giờ phải sửa code hay cấu hình ứng dụng.

### Khuôn chuẩn của một owner guide

```markdown
# <Tiêu đề — dành cho ai, đạt được điều gì>

<1–3 dòng mở đầu: mục tiêu + ranh giới chủ dự án / đội kỹ thuật.>

Điền trước khi bắt đầu — Email đội kỹ thuật (để cấp quyền): ______

## 1. <Dịch vụ, ví dụ Sentry>
### 1.1. <Việc con, ví dụ Trở thành chủ tài khoản>
**Mục tiêu:** <một câu>.
1. <hành động có đánh số, kèm tên menu/trường nguyên văn>
- https://exact.page/to/open
Trợ giúp chính thức (mở ra rồi tìm "<cụm từ>"):
- https://vendor.help/center

## N. Gửi lại cho đội kỹ thuật
<danh sách chính xác các ID / xác nhận cần gửi về>

## N+1. Lưu ý quan trọng
<quyền sở hữu vẫn thuộc chủ dự án; đội kỹ thuật chỉ được cấp quyền truy cập>
```

---

## Quy trình

1. **Lấy giá trị thật từ codebase — tuyệt đối không bịa ID.** Grep repo để lấy
   đúng định danh mà guide phải chứa, ví dụ:
   - Sentry: `grep -rniE "organization|project" apps/mobile/app.json` → org +
     project của Da Nang Connect; `apps/api` đọc `SENTRY_DSN` từ biến môi trường.
   - Apple Team ID / bundle / package: `apps/mobile/app.json`,
     `apps/mobile/eas.json` (bundle `app.danangconnect`).
   - Social login (Google / Apple / Facebook) client id và các biến
     `EXPO_PUBLIC_*` cho Expo Push: `apps/mobile/.env.example`,
     `apps/api/.env.example`.
   - Nếu một giá trị **chưa tồn tại** (repo đang greenfield) thì ghi rõ
     "chưa có — chủ dự án tạo ở bước N", đừng điền số giả.
   Đưa các giá trị đã xác nhận vào một bảng nhỏ "đối chiếu, KHÔNG đổi".
2. **Viết file `.md`** trong `docs/guides/` theo khuôn ở trên và hợp đồng nội
   dung. Văn xuôi tiếng Việt nếu chủ dự án đọc tiếng Việt; giữ nguyên tiếng Anh
   cho định danh/URL/lệnh terminal. Nếu người nhận là đối tác nước ngoài thì viết
   bản tiếng Anh — mặc định UI của sản phẩm là tiếng Anh.
3. **Nối stylesheet (chỉ làm một lần).** `.vscode/settings.json` đặt
   `"markdown-pdf.styles": [".agent/templates/pdf-export.css"]`, khổ `A4`, không
   header/footer. **Không** nhét thẻ `<style>` vào trong file `.md`.
4. **Xuất ra PDF** (chọn một cách):
   - **VS Code (cách chuẩn):** Command Palette →
     `Markdown PDF: Export (pdf)`. Dùng đúng cấu hình ở trên → headless Chromium,
     khổ A4. File PDF nằm cạnh file `.md`.
   - **CLI (tái lập được, agent chạy được):** pandoc dựng HTML standalone có nhúng
     sẵn CSS, rồi Google Chrome headless in ra. Xem lệnh bên dưới.
5. **Kiểm tra lại PDF** (cổng Done): mở ra, nhìn kỹ trang 1–2 — lề đều, URL không
   tràn ra ngoài trang, và xác nhận không có icon/emoji nào lọt vào.

### Lệnh xuất PDF bằng CLI (không cần giao diện VS Code)

```bash
SRC="docs/guides/your-owner-guide.md"
OUT="${SRC%.md}.pdf"
# Khung trang A4 (pdf-export.css lo phần nội dung; @page đặt khổ giấy)
printf '@page { size: A4; margin: 16mm; }\n' | cat .agent/templates/pdf-export.css - > /tmp/owner-pdf.css
pandoc "$SRC" -f gfm -t html5 --standalone --embed-resources \
  --metadata title="$(head -1 "$SRC" | sed 's/^# //')" \
  -c /tmp/owner-pdf.css -o /tmp/owner-guide.html
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$OUT" /tmp/owner-guide.html
# Bằng chứng: Producer phải là Skia/PDF (Chromium), khớp với các guide đã xuất trước
pdfinfo "$OUT" 2>/dev/null | grep -iE "Producer|Pages" || true
```

Lưu ý:
- pandoc 3.x: dùng `--embed-resources --standalone` (bản cũ là `--self-contained`).
- Repo **không có LaTeX engine**, nên chạy thẳng `pandoc -o x.pdf` sẽ lỗi — luôn
  đi vòng qua Chrome/Chromium để tạo PDF (đó là lý do guide xuất ra báo Producer
  `Skia/PDF`, Creator `HeadlessChrome`).
- Giữ file `.md` làm nguồn chuẩn; sửa lần nào thì tạo lại PDF lần đó.

---

## Giao file qua Downloads + dọn dẹp hằng ngày (bắt buộc)

File `.pdf` trong repo là bản gốc; bản gửi cho chủ dự án được đặt vào `~/Downloads`.
Một file manifest ghi lại chính xác những file mà skill này đã bỏ vào đó, để khi
dọn dẹp không bao giờ đụng vào các PDF khác của người dùng.

- Manifest: `~/Downloads/.dnc-pdf-exports.log`, mỗi lần xuất một dòng:
  `YYYY-MM-DD<TAB>/đường/dẫn/tuyệt/đối/trong/Downloads.pdf`.

### Quy tắc 1 — Sau mỗi lần xuất, chép PDF vào `~/Downloads` và ghi log

Chạy ngay sau khi PDF được tạo (liền sau lệnh xuất bằng CLI):

```bash
DL="$HOME/Downloads"
cp "$OUT" "$DL/"
printf '%s\t%s\n' "$(date +%F)" "$DL/$(basename "$OUT")" >> "$DL/.dnc-pdf-exports.log"
```

### Quy tắc 2 — Việc đầu tiên của ngày mới: xoá PDF đã xuất của những ngày trước

Trước khi làm bất cứ việc gì khác trong một ngày mới hơn ngày gần nhất trong
manifest, hãy dọn các PDF mà skill này đã xuất vào **những ngày trước** (giữ lại
của hôm nay). Chỉ những file có trong manifest với ngày `< hôm nay` mới bị xoá, nên
các PDF khác trong `~/Downloads` không bao giờ bị đụng tới.

```bash
DL="$HOME/Downloads"; LOG="$DL/.dnc-pdf-exports.log"; TODAY="$(date +%F)"
if [ -f "$LOG" ]; then
  awk -F'\t' -v today="$TODAY" '$1 < today {print $2}' "$LOG" | while IFS= read -r f; do
    [ -n "$f" ] && rm -f "$f" && echo "removed $f"
  done
  tmp="$(mktemp)"; awk -F'\t' -v today="$TODAY" '$1 == today' "$LOG" > "$tmp" && mv "$tmp" "$LOG"
fi
```

Đây là bước có tính phá huỷ, nhưng phạm vi chỉ gói trong các file do skill này xuất
ra (có manifest chốt, ngày `< hôm nay`). Nó không bao giờ xoá file `.md`/`.pdf`
trong repo, chỉ xoá các bản đã giao vào Downloads từ những ngày trước.

---

## Checklist trước khi xuất (Definition of Done)

- [ ] Mọi bước có mở website đều có bullet URL trần cụ thể (kèm URL trợ giúp chính thức).
- [ ] Các bước đã đánh số; mỗi bước là một hành động cụ thể có tên trường/menu nguyên văn.
- [ ] Ranh giới chủ dự án và đội kỹ thuật đã nêu gần đầu tài liệu.
- [ ] Có phần "gửi lại cho đội kỹ thuật" liệt kê chính xác các ID / xác nhận cần trả về.
- [ ] Không icon, không emoji, không dấu tích/dấu chéo ở bất kỳ đâu (grep cho chắc):
      `! grep -nP "[\x{1F000}-\x{1FAFF}\x{2190}-\x{27BF}\x{2705}\x{274C}]" docs/guides/your-owner-guide.md`
- [ ] Mọi ID đều là giá trị thật lấy từ codebase, không phải chỗ trống điền tạm.
- [ ] Đã mở PDF ra nhìn tận mắt: khổ A4, lề đều, URL không tràn trang.
- [ ] Đã chép PDF vào `~/Downloads` và ghi vào manifest (Quy tắc 1).
- [ ] Sang ngày mới, đã dọn PDF của những ngày trước trong `~/Downloads` trước tiên (Quy tắc 2).

## Kết quả bàn giao

Một owner guide `docs/guides/*.md` cùng file `.pdf` xuất ra từ nó (Producer
`Skia/PDF`, khổ A4), gãy gọn và không icon, mỗi bước có URL cụ thể, **đã giao vào
`~/Downloads`** và ghi vào manifest — sẵn sàng gửi cho người nhận đã nêu tên.
Báo cáo lại: đường dẫn các file, lệnh xuất đã chạy, bằng chứng `pdfinfo`/Producer,
và bản chép vào Downloads kèm dòng manifest.
