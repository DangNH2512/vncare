# Việc Đang Làm

Danh sách việc đang mở. Xong thì xoá khỏi đây, kết quả đáng nhớ thì ghi sang
[DECISIONS.md](DECISIONS.md).

| ID | Việc | Người phụ trách | Trạng thái | Ghi chú |
|---|---|---|---|---|
| T-10 | Xác minh email (Mailpit đã có trong compose) | — | todo | Đăng ký đang cấp thẳng T1 qua `TRUST_LEVEL_ON_REGISTER`. Khi có verify thì hạ về 0 và verify mới thăng lên 1 |
| T-10b | OTP xác minh số điện thoại | — | todo | SĐT dùng đăng nhập được nhưng chưa xác minh; `users.phone_verified_at` luôn null |
| T-11 | Social login Google/Apple/Facebook | — | todo | Bảng `social_accounts` chưa tạo. iOS có Google/FB thì **bắt buộc** có Apple Sign-In |
| T-13 | Job `trust:recompute` ghi `users.trust_level` | — | todo | Bảng `trust_signals` (0009) đã có từ 01/10; trước khi viết job phải chốt cách biểu diễn `pending`/`expired`/`revoked` vì `status` không UPDATE được, và `revoked_at` + `revoked_reason` phải đặt trong cùng một UPDATE; `computeTrustLevel` đã có ở `@dnc/domain` nhưng chưa ai gọi |
| T-15 | Rà lại comment cũ theo `code-documentation.md` §2 | — | todo | Phiên 2026-09-01 đã dọn các comment kể-lại-bug do agent viết. Còn nên rà nốt phần comment cũ trong `apps/web-client-side/app/_components/` và `_lib/` |
| T-14 | Dựng Playwright thật ở `apps/web-client-side/e2e/` | — | todo | Ba bug chỉ-có-ở-client đã lọt lưới (script tag, hydration `Sep`/`Sept`, nút kẹt "Please wait"). Không có bộ test nào canh chúng. `test-file-placement.md` đã định sẵn chỗ. **Phải chạy cả WebKit**, không chỉ Chromium |
| T-02 | `moderation_audit_log` cho hành động ẩn/gỡ của chủ thread | — | todo | Có `TODO(moderation)` trong `comment.service.ts` `remove()` |
| T-03 | Bản đồ M0–M5 | — | todo | Kế hoạch: `docs/analysis/13-ban-do-va-truc-quan-hoa-su-kien.md` |
| T-04 | Chuyển `src/database/sql/*.sql` sang migration TypeORM | — | todo | Skill `database-migrations` mô tả migration là class TS; code đang dùng file SQL nạp qua initdb |
| T-05 | Nối comment + reaction + chat vào web client | — | todo | API đã sẵn sàng; event/RSVP/post/media/auth/profile đã nối. Chỗ tự nhiên cho comment + reaction là trang `/events/[id]` |
| T-16 | Thông báo khi được thăng hạng từ hàng chờ | — | todo | `RsvpService.cancel` có `TODO(notification)`. Khi có notification thì đổi thăng hạng sang `held` + `hold_expires_at` thay vì `confirmed` thẳng |
| T-17 | Sự kiện lặp lại (nhiều occurrence) | — | todo | Schema đã hỗ trợ; API mới tạo 1 occurrence/sự kiện và `EventResponse` phẳng hoá occurrence sớm nhất |
| T-06 | Bỏ `"type": "module"` khỏi `geo`/`i18n`/`tokens` | — | todo | `domain` đã xong (nổ khi `apps/api` import `normalizePhone`). Cùng lỗi đã sửa ở `contracts`; hiện chưa nổ vì `apps/api` chưa import tới. `geo` dùng import attribute `with { type: 'json' }`, cần kiểm tra kỹ |
| T-07 | Job dọn `media` treo ở trạng thái `pending` | — | todo | Index `idx_media_pending` đã sẵn; chưa có worker |
| T-08 | Chống lạm dụng upload: rate limit theo trust level | — | todo | Gallery không còn trần số mục, nên rate limit theo lượt/giờ là tuyến phòng thủ chính. Hiện mới chặn kiểu file và dung lượng từng tệp |
| T-09 | `GET /posts` chỉ ký URL cho lát preview | — | todo | Hiện ký toàn bộ gallery cho mỗi bài trong feed; với bài vài trăm ảnh sẽ chậm. Contract đã cho phép `media` ngắn hơn `mediaIds` |
| T-18 | Production: reverse proxy + env cho rate limit | — | todo | nginx trước Next phải append IP thật (`proxy_add_x_forwarded_for`); đặt `TRUST_PROXY` (loopback + hop proxy) và `RATE_LIMIT_HMAC_SECRET` (≥32 ký tự). Thiếu thì API từ chối khởi động; thiếu proxy thì mọi người dùng web chung một bucket IP. **Cổng trước M6:** smoke test staging với hai client khác IP và một client tự đổi XFF (đặt `TRUST_PROXY=1` mà chưa có nginx thì API vẫn lên nhưng đếm sai im lặng). Xem `.agent/specs/_changes/m1-auth-hardening/` |
| T-19 | Chuyển kết nối API sang vai trò Postgres `dnc_app` | — | todo | 0009 mới tạo `dnc_app NOLOGIN` và cấp quyền riêng `trust_signals`; API vẫn chạy bằng superuser `dnc` nên `REVOKE` chưa có tác dụng với app. Migration `CREATE ROLE` cần quyền CREATEROLE trên Postgres managed |
| T-20 | E2-S8: đếm ngược `Retry-After` trên form đăng nhập | — | todo | Hiện chỉ hiện chuỗi `errors.auth.rateLimited`; cần expose header và khoá nút trong thời gian chờ |
| T-21 | Cập nhật checklist M1 (md + xlsx + pdf) và doc 03/04/05 theo đợt m1-auth-hardening | — | todo | Đóng SEC-JWT-LOG, M1-4/S1-DoD-1, E2-S10/S1-DoD-7/M1-7, M1-6/S1-DoD-3. Doc: mã `RATE_LIMIT_EXCEEDED`, ngưỡng, bỏ khoá 30 phút, predicate `uq_trust_signals_unique_kind`, FK `issued_by_user_id RESTRICT` |
| T-22 | Theo dõi tỷ lệ 429 khi mở công khai (IP dùng chung/NAT) | — | todo | Coworking, hostel, quán cà phê chung một IP: ngưỡng 10 sai/IP/15 phút có thể khoá nhầm cả nhóm. Cân nhắc nâng `RATE_LIMIT_LOGIN_IP_MAX`, giữ ngưỡng identifier |
