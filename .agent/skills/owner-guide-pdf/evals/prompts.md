# owner-guide-pdf — Eval Prompts

Tiêu chí nghiệm thu: skill phải kích hoạt và cho ra một owner guide gãy gọn,
không icon, mỗi bước có URL, xuất PDF (Producer `Skia/PDF`, A4), với các ID lấy
thật từ codebase. Các câu gần giống phải được định tuyến sang skill khác.

## PHẢI kích hoạt

1. "Xuất file hướng dẫn để bàn giao tài khoản Sentry và Expo/EAS cho chủ dự án,
   rồi uỷ quyền lại cho team kỹ thuật."
2. "Tạo guide PDF cho chủ dự án tự bật đăng nhập Facebook/Google/Apple cho
   Da Nang Connect."
3. "Export a step-by-step PDF the project owner follows to grant us Google Ads access."
4. "Làm file hướng dẫn bàn giao tài khoản Apple Developer cho chủ dự án."
5. "Owner guide: chủ dự án xác minh Meta Business cho fanpage Da Nang Connect,
   không thuật ngữ, xuất PDF."

## KHÔNG được kích hoạt (câu gần giống)

6. "Format lại báo cáo kỹ thuật này và export PDF cho đẹp." → `doc-formatting`
   (báo cáo nội bộ, không phải hướng dẫn cho chủ dự án).
7. "Viết spec/PRD cho tính năng đăng nhập social." → `write-spec`.
8. "Code phần Sign in with Apple trong `apps/mobile`." → triển khai mobile, không
   phải viết guide.
9. "Tổng hợp feedback người dùng expat thành PDF." → `synthesize-research` +
   `doc-formatting`.

## Tiêu chí chấm mỗi lượt chạy

- [ ] Output là `docs/guides/*.md` + file `.pdf` đã export.
- [ ] Không có icon/emoji (grep sạch).
- [ ] Mỗi bước mở website đều có bullet URL trần + URL trang trợ giúp chính thức.
- [ ] Ranh giới "chủ dự án vs team kỹ thuật" được nêu ngay đầu file.
- [ ] Mọi ID là giá trị thật đọc từ repo (ví dụ bundle `app.danangconnect` trong
      `apps/mobile/app.json`), không phải placeholder. Giá trị chưa tồn tại thì
      ghi rõ "chưa có — tạo ở bước N", không bịa số.
- [ ] `pdfinfo` cho thấy Producer `Skia/PDF`.

## Ghi chú vận hành

- Repo đang greenfield: phần lớn tài khoản bên thứ ba chưa được tạo. Guide đầu
  tiên nhiều khả năng là **hướng dẫn tạo mới và đứng tên sở hữu** (Apple
  Developer, Google Cloud, Meta Business, Expo/EAS, Sentry), không phải bàn giao.
- Ghi lại kết quả từng lần chạy thật vào đây (ngày, prompt, pass/fail, lý do)
  để tinh chỉnh phần `description` khi cần.
