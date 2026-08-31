---
name: doc-formatting
description: Chuẩn trình bày cho mọi tài liệu hoặc báo cáo dành cho người đọc (đặc biệt là Markdown xuất PDF gửi bên liên quan). Dùng khi tạo báo cáo, brief hoặc tài liệu để đọc hay để xuất bản. Cưỡng chế phần thân căn đều hai bên (không căn giữa, không so le mép phải), cấu trúc PDF sạch, và link nguồn dạng gạch đầu dòng bấm được — để bản xuất không bao giờ vỡ layout.
allowed-tools: Read, Write, Edit, Bash
---

# Doc Formatting — Tài liệu sạch, sẵn sàng xuất PDF

> **Nguồn / xuất xứ:** Chuẩn nội bộ, rút ra từ chính các sự cố xuất PDF của dự án
> này (chữ căn giữa, mép lề so le, URL dài inline tràn ra ngoài trang) cộng với kỷ
> luật typography của `modern-ui-design`. Không lấy từ repo bên ngoài.

## Khi nào chạy

- Viết báo cáo/brief/bản tóm tắt cho người đọc (ví dụ `docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md`).
- Bất kỳ file Markdown nào định xuất ra PDF.
- Bất cứ khi nào người dùng nhắc "căn lề", "format docs", "export PDF", hoặc layout nhìn lệch.

---

## Rule 1 — Căn lề: thân căn đều hai bên, heading căn trái (không bao giờ căn giữa)

Phần thân bắt buộc **căn đều hai bên (justify)** — thẳng mép ở CẢ hai bên trái và
phải, không để mép phải so le. Heading và danh sách giữ **căn trái**. Không bao giờ
căn giữa phần thân.

**ĐỪNG nhét `<style>` vào file .md** — linter sẽ tước nó đi, GitHub bỏ qua nó, và nó
làm bẩn source. Thay vào đó, nối stylesheet dùng chung MỘT LẦN:

- CSS dùng chung: [`.agent/templates/pdf-export.css`](../../templates/pdf-export.css)
- VS Code "Markdown PDF" (yzane.markdown-pdf), trong settings.json:
  `"markdown-pdf.styles": [".agent/templates/pdf-export.css"]`
- Pandoc: `pandoc doc.md -o doc.pdf --css .agent/templates/pdf-export.css`

File CSS này đặt `text-align: justify` cho `p/li/blockquote/td`, và căn trái cho heading.

## Rule 2 — Link: bấm được, liệt kê dạng gạch đầu dòng, không để URL dài inline

URL dài nằm inline giữa câu sẽ làm vỡ layout PDF (nó render thành "text (https://…dài)"
rồi tràn ra ngoài). Thay vào đó, liệt kê nguồn thành **gạch đầu dòng URL dưới một
nhãn** để chúng bấm được và xuống dòng gọn gàng:

```markdown
**Repo:**

- https://github.com/owner/repo
- https://github.com/owner/repo2
```

- Dùng **URL trần** (tự động thành link, bấm được trong PDF), không dùng dạng `[label](url)`
  — dạng có label bị in đúp URL trên nhiều bộ render PDF.
- Đặt link ngay tại chỗ liên quan (dưới từng mục), đừng dồn hết xuống footer.
- File CSS dùng chung áp `word-break: break-all` cho `a` nên URL dài không bao giờ tràn.

## Rule 3 — Cấu trúc: mục có đánh số, khối nội dung đọc lướt được

- Đánh số mục cấp một (`## 1.`, `## 2.`) và mục con (`### 2.1.`).
- Cắt đoạn dài bằng nhãn in đậm inline (ví dụ `**Trước:**` / `**Sau:**`).
- Một tiêu đề `# H1` duy nhất, một khối metadata, rồi dùng `---` ngăn giữa các mục.
- Đoạn ngắn thay vì bức tường chữ — tốt cho cả việc đọc lẫn việc ngắt trang.

## Rule 4 — Không trùng lặp

Đừng liệt kê nguồn hai lần (ví dụ vừa để inline theo từng mục VỪA có thêm mục
Tài liệu tham khảo riêng). Chọn một kiểu. Nếu muốn nguồn gắn đúng ngữ cảnh từng mục,
ưu tiên danh sách gạch đầu dòng inline.

---

## Rule 5 — Lệnh xuất bản thật sự chạy được

⚠️ `pandoc doc.md -o doc.pdf --css style.css` **không áp dụng CSS** — pandoc đẩy
đường xuất PDF qua LaTeX, nơi `--css` bị bỏ qua. Mọi PDF đang có trong repo này đều
được tạo bằng **headless Chrome** (`pdfinfo` → `Producer: Skia/PDF`), nên hãy tái
lập đúng đường đó: Markdown → HTML standalone (đã inline CSS) → Chrome print.

```bash
# 1) Markdown -> self-contained HTML with the project stylesheet(s) embedded.
#    Use --metadata pagetitle (NOT --metadata title): `title` makes pandoc render
#    a second <h1>, duplicating the doc's own H1 on page 1.
pandoc docs/<doc>.md \
  -f gfm -t html5 --standalone --embed-resources \
  --metadata pagetitle="<Doc title>" \
  --css .agent/templates/pdf-export.css \
  --css .agent/templates/pdf-export-tables.css \
  -o /tmp/doc.html

# 2) HTML -> PDF.
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="docs/<doc>.pdf" /tmp/doc.html

# 3) MANDATORY visual check — never claim done from the byte count alone.
pdfinfo docs/<doc>.pdf | grep -E "Pages|Page size"
pdftoppm -png -r 70 -f 1 -l 3 docs/<doc>.pdf /tmp/pdfcheck/pg   # then Read the PNGs
```

**Stylesheet:** luôn nạp [`pdf-export.css`](../../templates/pdf-export.css). Thêm
[`pdf-export-tables.css`](../../templates/pdf-export-tables.css) *chồng lên trên nó*
cho tài liệu nhiều bảng (báo cáo tuần / báo cáo audit) — file này chuyển ô bảng sang
khổ A4, căn trái nội dung ô (căn đều sẽ băm nát một ô rộng 120px), và chặn header
bảng bị ngắt giữa từ. Luôn xếp chồng, không bao giờ thay thế stylesheet dùng chung.

## Checklist trước khi xuất bản

- [ ] Thân căn đều, heading căn trái, không có gì bị căn giữa (đã nối CSS, không có `<style>` inline).
- [ ] Mọi link nguồn đều là URL trần dạng gạch đầu dòng (bấm được, không tràn).
- [ ] Các mục đã đánh số; đoạn dài đã được cắt bằng nhãn.
- [ ] Không có danh sách link bị lặp.
- [ ] Đã xuất PDF theo đúng pipeline ở Rule 5 (một báo cáo gửi bên liên quan chưa
      coi là xong nếu mới có `.md` — mọi tài liệu bàn giao trong `docs/` đều ship kèm `.md` + `.pdf`).
- [ ] Mở PDF đã xuất và soi trang 1–2 bằng mắt: mép lề đều, không có URL nào lòi ra ngoài trang.
- [ ] Không bị lặp H1 ở trang 1 (dùng `pagetitle`, không dùng `title`).
- [ ] Header bảng không bị ngắt (không có kiểu "Kh / ai / bá / o"), không cột nào bị bóp còn 1 chữ.
- [ ] Tên riêng và dấu tiếng Việt hiển thị đúng trong PDF: các khu vực (An Thượng,
      Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn) và tên sản phẩm "Da Nang Connect"
      không bị mất dấu hay vỡ font.

## Kết quả

Một tài liệu Markdown xuất ra PDF sạch: chữ căn đều, mép lề đều nhau, link nguồn bấm
được, không vỡ layout.
