# Eval prompts — `bug-report-sheet`

Trigger accuracy matters more than prose quality here: the skill must fire on
"a batch of feedback → make it trackable", and must NOT fire on "fix this bug".

## SHOULD trigger (positive)

| # | Prompt | Kỳ vọng |
|---|--------|---------|
| P1 | "tạo sheet log toàn bộ bug được báo cáo trên hình, từ các file t tải về vào mục download" | Đọc ảnh + video + PDF trong `~/Downloads`, xuất md+csv+xlsx |
| P2 | "tổng hợp feedback tester tuần này thành bug tracker giúp anh" | Sheet + phân biệt `Loại` Bug/Đề xuất |
| P3 | "log lại mấy lỗi mấy bạn trong group expat báo vào file excel" | Sheet, giữ nguyên văn của người báo (kể cả tiếng Anh) |
| P4 | "làm bảng bug từ 3 video quay màn hình app này" | ffmpeg contact sheet trước, mỗi lỗi 1 dòng, cột Proof ghi tên file thật |
| P5 | "sau buổi test hôm nay, chia việc fix cho từng dev" | Sheet + bảng task card theo owner apps/api · apps/web-client-side · apps/web-admin-side · apps/mobile (Rule 7) |
| P6 | "gom lỗi tester báo trên cả web lẫn app thành một sheet" | Một dòng/lỗi với `Platform = "Web Client, iOS"`, không nhân đôi dòng |

## Should NOT trigger (near-miss)

| # | Prompt | Kỳ vọng |
|---|--------|---------|
| N1 | "fix lỗi bàn phím che ô nhập bình luận trên Android" | → `/debug` + systematic-debugging, KHÔNG tạo sheet |
| N2 | "viết test case cho màn hình RSVP" | → qa-tester, không phải bug log |
| N3 | "báo cáo tuần cho chủ dự án" | → weekly-report (deck PDF), không phải bug sheet |
| N4 | "review PR này giúp tôi" | → specialized-code-review |
| N5 | "tổng hợp feedback user để làm roadmap" | → synthesize-research (theme/insight), không phải defect log |

## Acceptance criteria per run

1. Mọi artifact được nêu trong prompt đã thực sự được mở (có log `Read`/`ffmpeg`/`pdftotext`).
2. Không có dòng nào thiếu `Proof`.
3. `Loại` phân biệt rõ Bug và Đề xuất — không thổi phồng số bug bằng feature request.
4. Không có dòng nào ghi `Đã fix - đã verify` mà không kèm bằng chứng chạy thật.
5. Cột `Environment` ghi đủ build + thiết bị + **locale (EN/VI)** cho mọi lỗi liên
   quan tới chữ hiển thị.
6. Ảnh bằng chứng lưu vào repo đã che dữ liệu cá nhân.
7. Đủ 3 file output; xlsx mở được, header freeze + auto-filter + 5 dropdown hoạt động.

## Kết quả đo

Chưa chạy eval lần nào trên dự án này (skill vừa được chỉnh lại cho Da Nang Connect).
Chạy P1 và N1 trước ở đợt feedback tester đầu tiên, rồi điền bảng dưới đây.

| Prompt | Kết quả | Ghi chú |
|--------|---------|---------|
| P1 | ⏳ | |
| N1 | ⏳ | |
