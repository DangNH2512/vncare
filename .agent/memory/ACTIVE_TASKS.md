# Việc Đang Làm

Danh sách việc đang mở. Xong thì xoá khỏi đây, kết quả đáng nhớ thì ghi sang
[DECISIONS.md](DECISIONS.md).

| ID | Việc | Người phụ trách | Trạng thái | Ghi chú |
|---|---|---|---|---|
| T-10 | Xác minh email (Mailpit đã có trong compose) | — | todo | Đăng ký đang cấp thẳng T1 qua `TRUST_LEVEL_ON_REGISTER`. Khi có verify thì hạ về 0 và verify mới thăng lên 1 |
| T-10b | OTP xác minh số điện thoại | — | todo | SĐT dùng đăng nhập được nhưng chưa xác minh; `users.phone_verified_at` luôn null |
| T-11 | Social login Google/Apple/Facebook | — | todo | Bảng `social_accounts` chưa tạo. iOS có Google/FB thì **bắt buộc** có Apple Sign-In |
| T-12 | Rate limit đăng nhập và đăng ký | — | todo | Chưa có Redis sliding window; hiện chỉ chống dò tài khoản bằng thời gian phản hồi đều nhau |
| T-13 | Job `trust:recompute` ghi `users.trust_level` | — | todo | `computeTrustLevel` đã có ở `@dnc/domain` nhưng chưa ai gọi |
| T-15 | Rà lại comment cũ theo `code-documentation.md` §2 | — | todo | Phiên 2026-09-01 đã dọn các comment kể-lại-bug do agent viết. Còn nên rà nốt phần comment cũ trong `apps/web-client-side/app/_components/` và `_lib/` |
| T-14 | Dựng Playwright thật ở `apps/web-client-side/e2e/` | — | todo | Ba bug chỉ-có-ở-client đã lọt lưới (script tag, hydration `Sep`/`Sept`, nút kẹt "Please wait"). Không có bộ test nào canh chúng. `test-file-placement.md` đã định sẵn chỗ. **Phải chạy cả WebKit**, không chỉ Chromium |
| T-02 | `moderation_audit_log` cho hành động ẩn/gỡ của chủ thread | — | todo | Có `TODO(moderation)` trong `comment.service.ts` `remove()` |
| T-03 | Bản đồ M0–M5 | — | todo | Kế hoạch: `docs/analysis/13-ban-do-va-truc-quan-hoa-su-kien.md` |
| T-04 | Chuyển `src/database/sql/*.sql` sang migration TypeORM | — | todo | Skill `database-migrations` mô tả migration là class TS; code đang dùng file SQL nạp qua initdb |
| T-05 | Nối comment + reaction + chat vào web client | — | todo | API đã sẵn sàng; mới chỉ post + media + auth + profile được nối. Dùng `requireAuth()` để gate |
| T-06 | Bỏ `"type": "module"` khỏi `geo`/`i18n`/`tokens` | — | todo | `domain` đã xong (nổ khi `apps/api` import `normalizePhone`). Cùng lỗi đã sửa ở `contracts`; hiện chưa nổ vì `apps/api` chưa import tới. `geo` dùng import attribute `with { type: 'json' }`, cần kiểm tra kỹ |
| T-07 | Job dọn `media` treo ở trạng thái `pending` | — | todo | Index `idx_media_pending` đã sẵn; chưa có worker |
| T-08 | Chống lạm dụng upload: rate limit theo trust level | — | todo | Gallery không còn trần số mục, nên rate limit theo lượt/giờ là tuyến phòng thủ chính. Hiện mới chặn kiểu file và dung lượng từng tệp |
| T-09 | `GET /posts` chỉ ký URL cho lát preview | — | todo | Hiện ký toàn bộ gallery cho mỗi bài trong feed; với bài vài trăm ảnh sẽ chậm. Contract đã cho phép `media` ngắn hơn `mediaIds` |
