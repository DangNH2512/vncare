---
name: weekly-report
description: Dựng deck báo cáo tiến độ tuần/hai tuần cho Da Nang Connect (PDF A4 ngang, template thương hiệu) mỗi khi người dùng yêu cầu — "báo cáo tuần", "báo cáo tiến độ", "report tuần qua", "weekly report". Ép đúng thứ tự slide (danh sách task của tuần được báo cáo TRƯỚC, rồi nhìn lại hai tuần), chấm trạng thái trung thực có đối chiếu hệ thống thật, ngôn ngữ kinh doanh dễ hiểu, mỗi slide TÍNH NĂNG MỚI có khung ảnh + hướng dẫn chụp (lỗi đã sửa giữ dạng bảng), xuất ra docs/weekly-tasks/ + ~/Downloads.
allowed-tools: Read, Write, Edit, Bash
---

# Weekly Report — Stakeholder Progress Deck

> **Xuất xứ:** chuẩn nội bộ của Da Nang Connect. Nguồn deck là
> `.agent/templates/weekly-deck.html`; deck của mỗi kỳ được sinh vào
> `docs/weekly-tasks/`. Mục tiêu: mọi kỳ báo cáo trông giống nhau và người đọc
> (chủ dự án, nhà đầu tư, đối tác) hiểu ngay mà không cần biết kỹ thuật.

## When to run

Bất kỳ câu nào: "báo cáo tuần", "báo cáo tiến độ", "report tuần qua",
"weekly report", "tiến độ tuần", "làm report cho chủ dự án", hoặc khi kết thúc
một tuần làm việc.

**Do NOT** produce a plain Markdown document as the deliverable. The stakeholder
deliverable is a **deck PDF**. A `.md` companion is optional supporting detail;
the PDF is what gets presented.

---

## Rule 1 — Fixed slide order (non-negotiable)

| # | Slide | Bắt buộc? | Nội dung |
|---|-------|-----------|----------|
| 01 | Cover (dark) | ✅ | Tên dự án · dải ngày · ngày trình bày |
| 02 | **Task tổng thể của tuần được báo cáo + trạng thái từng mục + scoreline** | ✅ **PHẢI Ở ĐẦU** | Toàn bộ đầu việc đã chốt, mỗi mục 1 dòng + icon trạng thái. Kết bằng `X hoàn thành · Y đang chạy · Z chưa khởi động` |
| 03 | **Hai tuần — nhìn nhanh** | ✅ | 2 thẻ: **Tuần trước nữa** (navy) và **Tuần trước** (rose), mỗi thẻ 3–4 gạch đầu dòng + tổng số cập nhật |
| 04… | Slide chi tiết theo tuần | ✅ | Chia "Tính năng & trải nghiệm khách hàng" / "Vận hành, giám sát & ổn định" / "Lỗi đã khắc phục" |
| … | **Slide minh bạch cho mục CHƯA XONG** | ✅ nếu có ◐ hoặc ✗ | Mỗi hạng mục dở dang được 1 slide riêng: hiện trạng → vướng ở đâu → kế hoạch → cam kết |
| cuối | Closing (dark) | ✅ | "Cảm ơn quý khách" |

Slide 02 tồn tại để người đọc **thấy ngay bức tranh tổng thể** trước khi vào chi
tiết. Không được đẩy xuống dưới, không được thay bằng đoạn văn.

## Rule 2 — Chấm điểm phải TRUNG THỰC, có đối chiếu

Trước khi gán trạng thái cho bất kỳ mục nào, phải xác minh bằng hệ thống thật —
**không copy trạng thái tự khai trong `#daily-report`**:

```bash
git log --since="<start>" --until="<end>" --date=format:"%d/%m %H:%M" \
        --pretty=format:"%ad | %h | %s"      # việc thật sự đã làm
git diff --name-only <base>..HEAD | cut -d/ -f2 | sort | uniq -c   # phân bổ theo app (apps/api, apps/web-client-side, apps/web-admin-side, apps/mobile)
npm run typecheck --workspaces && npm test --workspaces   # trạng thái build/test thật
curl -s <prod>/api/v1/health                  # API có sống không
ssh <server> 'psql ... "select * from migrations order by timestamp desc limit 5"'  # DB migrate tới đâu
psql ... "select postgis_version()"           # PostGIS đã bật trên môi trường đó chưa
```

Ba mức trạng thái, dùng đúng ký hiệu của template:

| Icon | Class | Nghĩa | Điều kiện |
|------|-------|-------|-----------|
| ✓ | `st ok` (vàng) | Hoàn thành | Có bằng chứng chạy được trên môi trường thật |
| ◐ | `st mid` (đồng) | Đang chạy | Có code/hạ tầng nhưng **chưa** nghiệm thu được |
| ✗ | `st no` (đỏ) | Chưa khởi động | Không có dấu vết trong repo |

Việc không kiểm chứng được từ repo (thao tác trên Play Console, Meta Business,
Sentry dashboard…) thì ghi **"cần xác nhận"** — tuyệt đối không tự nhận là done.

## Rule 3 — Ngôn ngữ: người đọc là CHỦ DỰ ÁN, không phải kỹ sư

Deck này trình bày cho chủ dự án / nhà đầu tư. Viết theo **giá trị nhận được**,
không theo tên kỹ thuật.

| Đừng viết | Viết thế này |
|---|---|
| "Thêm cột `location geography(Point,4326)` + index GIST" | "Người dùng lọc được sự kiện quanh mình theo bán kính, kết quả trả về tức thì" |
| "Thêm bảng `event_rsvp` với unique (event_id, user_id)" | "Một người chỉ đăng ký được một lần cho mỗi sự kiện, không còn trùng chỗ" |
| "Tích hợp Expo Push + BullMQ job nhắc lịch" | "Người tham gia được nhắc trước sự kiện 24 giờ, giảm tỷ lệ vắng mặt" |
| "Thêm bảng `content_report` + trạng thái `hidden`" | "Nội dung không phù hợp bị ẩn ngay khi có người báo cáo, đội ngũ duyệt sau" |
| "Đồng bộ khoá i18n en/vi" | "Toàn bộ màn hình có đủ tiếng Anh và tiếng Việt, không còn chữ thiếu" |

Vẫn giữ **số liệu thật** (số sự kiện tạo mới, số RSVP, số organizer chủ động,
số cập nhật hệ thống) — số liệu tạo niềm tin. Chỉ bỏ thuật ngữ, không bỏ sự thật.

Khi báo cáo có nhắc tới chỉ số sản phẩm, lấy đúng bộ chỉ số của nền tảng sự kiện
theo [metrics-review](../metrics-review/SKILL.md): số sự kiện tạo mới, tỷ lệ RSVP,
tỷ lệ no-show, số organizer chủ động, retention D7. Không tự chế chỉ số mới.

## Rule 4 — Dựng file từ template, không tự chế CSS

```bash
cp .agent/templates/weekly-deck.html docs/weekly-tasks/_deck-<start>_to_<end>.html
# rồi thay {{PLACEHOLDER}} + nhân bản <section class="slide"> theo Rule 1
```

Bảng màu bị khoá để mọi kỳ báo cáo trông giống nhau: navy `#1b1f2e` ·
gold `#c9a227` · cream `#faf7f2` · rose `#b76e79` · bronze `#b8752e`.
Trang A4 **ngang** (297×210mm). Pill navy = tuần trước nữa, pill rose = tuần
trước, pill bronze = hạng mục chưa xong.

Đánh số chân trang `NN / TOTAL` cho **mọi** slide và sửa lại `TOTAL` sau khi
chốt số slide.

## Rule 5 — Xuất PDF + kiểm tra bằng mắt (bắt buộc)

```bash
# 1) HTML deck -> PDF (KHÔNG dùng pandoc: nó đi qua LaTeX và bỏ CSS)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="docs/weekly-tasks/<start>_to_<end>_bao-cao-tuan.pdf" \
  docs/weekly-tasks/_deck-<start>_to_<end>.html

# 2) Giao cho người dùng
cp docs/weekly-tasks/<start>_to_<end>_bao-cao-tuan.pdf ~/Downloads/

# 3) KIỂM TRA THẬT — không được claim done chỉ từ dung lượng file
pdfinfo <pdf> | grep -E "Pages|Page size"    # phải là A4 landscape 841.92 x 594.96 pts
pdftoppm -png -r 70 -f 1 -l 4 <pdf> /tmp/deckcheck/pg   # rồi Read từng ảnh
```

Soi ảnh để bắt: chữ tràn khỏi slide, slide trống, icon trạng thái sai màu, số
trang sai, tiêu đề bị cắt.

## Rule 6 — Lưu ở đâu

- `docs/weekly-tasks/_deck-<start>_to_<end>.html` — nguồn, để kỳ sau sửa lại.
- `docs/weekly-tasks/<start>_to_<end>_bao-cao-tuan.pdf` — bản lưu trong repo.
- `~/Downloads/<start>_to_<end>_bao-cao-tuan.pdf` — **bản giao cho người dùng**
  (mặc định luôn copy sang đây, không cần đợi nhắc).
- Ghi 1 dòng vào `.agent/memory/ACTIVE_TASKS.md`.

## Rule 7 — Mỗi TÍNH NĂNG mới bắt buộc có vùng minh hoạ ảnh chụp màn hình

Người đọc cần "nhìn thấy" tính năng thay vì chỉ đọc chữ. Áp dụng cho **mọi tính
năng mới** (feature) trong slide chi tiết —
**KHÔNG áp dụng cho lỗi đã sửa / hạng mục vận hành** (những mục đó ở nguyên
dạng bảng `.fixcols` 2 cột, không cần ảnh).

1. Mỗi tính năng mới dùng slide riêng theo khối `SLIDE TÍNH NĂNG MỚI` trong
   `.agent/templates/weekly-deck.html` (có sẵn `.shotwrap`/`.shotbox`/
   `.shotcap` — không tự chế CSS khác). Vẫn giữ nguyên `.points` mô tả lợi ích
   bằng ngôn ngữ kinh doanh (Rule 3) ở phía trên khung ảnh.
2. Khung `.shotbox` là **placeholder** (viền đứt nét + biểu tượng máy ảnh) khi
   agent build deck lần đầu — agent không tự dựng simulator/browser để chụp,
   trừ khi máy đang có sẵn server local/staging chạy được và việc chụp không
   tốn quá nhiều thời gian. Việc **thay placeholder bằng ảnh thật** có thể do
   người dùng làm sau khi nhận file `.html` nguồn, hoặc do agent làm nếu được
   giao rõ ràng và có môi trường sẵn sàng.
3. Dưới mỗi khung ảnh phải có dòng `.shotcap` **"Chụp màn hình tại: …"** ghi cụ
   thể: bề mặt nào (`apps/web-client-side`, `apps/web-admin-side` hoặc
   `apps/mobile`), route/URL/tên màn hình, và bước điều hướng ngắn gọn (vd:
   "apps/web-client-side → /events?area=an-thuong → thẻ sự kiện → nút RSVP",
   "apps/web-admin-side → /moderation/queue → duyệt hàng loạt", hoặc
   "apps/mobile → tab Explore → bản đồ My Khe"). Không ghi
   chung chung kiểu "chụp màn hình tính năng".
4. Tính năng cần so sánh 2 trạng thái (trước/sau) hoặc 2 bước liền nhau thì
   nhân bản `.shotbox` thứ 2 trong cùng `.shotwrap` (side-by-side), vẫn 1 dòng
   `.shotcap` mô tả cả 2 khung nếu ngắn, hoặc 2 dòng nếu cần tách riêng.
4b. **Chọn bố cục theo hướng của ảnh:**
   - **Mặc định cho slide CHỈ CÓ 1 ảnh: dùng `.splitwrap` — chữ trái, ảnh
     phải.** Ảnh dọc (điện thoại, `apps/mobile`) → `.splitshot`; ảnh ngang
     (`apps/web-client-side` hoặc `apps/web-admin-side`) → `.splitwrap land` +
     `.splitshot land` (cột ảnh rộng 142mm để ảnh web vẫn đọc được).
   - Chỉ dùng `.shotwrap` + `.shotbox` full-width khi slide có **2 ảnh cạnh
     nhau** (before/after, hoặc 2 bề mặt khác nhau). Ảnh ngang cần thấy trọn
     thì thêm class `wide` để `object-fit:contain` thay vì bị crop.
   - Ảnh **dọc** (ảnh chụp điện thoại) → dùng `.splitwrap`: **chữ ở nửa
     trái, màn hình điện thoại ở nửa phải**. Tuyệt đối không nhét ảnh dọc
     vào khung ngang full-width — ~70% khung là nền trống và màn hình co lại
     nhỏ tới mức không đọc được chữ trong ảnh.
5. Cuối deck, thêm 1 slide phụ lục **"Danh sách ảnh cần chụp"** gom lại toàn bộ
   dòng `.shotcap` của các slide tính năng thành 1 checklist — để người trình
   bày chụp gọn 1 lượt trước khi gửi cho sếp, không phải lật từng trang tìm.
6. Không dùng `.shotbox` cho các slide đã dùng `.fixcols` (lỗi đã sửa) hay
   slide minh bạch (`◐`/`✗`) — những slide đó là chữ, không phải demo tính
   năng.

## Checklist trước khi báo "xong"

- [ ] Slide 02 là danh sách **toàn bộ** đầu việc của tuần + scoreline.
- [ ] Slide 03 có **cả tuần trước nữa lẫn tuần trước**.
- [ ] Mọi mục ◐/✗ đều có slide riêng giải thích + kế hoạch.
- [ ] Mọi trạng thái ✓ đều có bằng chứng thật (git/test/probe/DB).
- [ ] Mọi **tính năng mới** có slide riêng kèm `.shotbox` + dòng "Chụp màn hình
      tại: …" cụ thể (Rule 7); lỗi đã sửa/vận hành vẫn ở dạng bảng, không ảnh.
- [ ] Có slide phụ lục "Danh sách ảnh cần chụp" gom hết các dòng `.shotcap`.
- [ ] Không còn thuật ngữ kỹ thuật thô trong deck.
- [ ] Số trang chân slide khớp tổng số slide.
- [ ] PDF A4 landscape, đã render ảnh và **đọc bằng mắt** ít nhất 4 trang.
- [ ] Đã copy sang `~/Downloads/`.
