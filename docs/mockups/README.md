# Mockup

Nơi chứa mockup và wireframe. Đặc tả màn hình và luồng nằm ở
[`../analysis/10-ux-luong-man-hinh-va-i18n.md`](../analysis/10-ux-luong-man-hinh-va-i18n.md);
thư mục này chứa file hình ảnh đi kèm.

Đặt tên theo mã màn hình trong tài liệu UX, ví dụ `S-03-event-detail.png`.

## Bộ mockup web người dùng cuối (`apps/web-client-side`)

Bốn file dùng chung một khung (app shell, token, dữ liệu mẫu, thang trust T0–T5 theo
`05` §5.3, tên khu vực song ngữ theo `10` §13.6) và nối với nhau qua thanh điều hướng
trên cùng. Mở bất kỳ file nào rồi bấm sang file khác.

- `?screen=<id>` mở thẳng một màn, `?lang=vi` đổi sang tiếng Việt.
- Nút **Notes** mở ghi chú từng màn: route thật, endpoint, bảng, use case, story và
  các điểm lệch giữa tài liệu và code (drift) cần chốt.

| File | Mô tả |
|---|---|
| [auth-onboarding-web-mockup.html](auth-onboarding-web-mockup.html) | ① Đăng ký, đăng nhập, xác minh email, đặt lại mật khẩu, liên kết social, onboarding 3 bước, aha moment (W-01, W-02, W-03, W-06) — Sprint 1 |
| [web-discover-mockup.html](web-discover-mockup.html) | ② **Trang chủ** = tin tức Đà Nẵng do staff viết (song ngữ, có trang đọc bài) + sự kiện staff curate ("Picked by our team"). **Discover** = chỉ sự kiện do thành viên đăng, có ★ điểm host, 💬 bình luận, "What people say", chế độ `🃏 Swipe · List · Map`. Kèm bản đồ, lịch tháng, tìm kiếm, trang SEO (W-00, W-10…W-17) |
| [web-event-mockup.html](web-event-mockup.html) | ③ Chi tiết sự kiện với 8 trạng thái RSVP, **reviews** (điểm, phân bố sao, review của người đã check-in) và **bình luận** (trả lời, ghim, sắp xếp), viết review, listing curate, nhận quyền listing, báo cáo, wizard tạo sự kiện 4 bước, sửa sự kiện (W-20…W-55) |
| [web-myspace-mockup.html](web-myspace-mockup.html) | ④ **Sự kiện của tôi** gộp thành một màn liền mạch: thẻ "Next up" (đếm ngược, chỉ đường, QR check-in, chat nhóm), dải tuần, chip lọc All · Going · Hosting · Waitlist · Saved, timeline theo ngày, khối Past nhắc viết review. Kèm quản lý người tham dự, hồ sơ, trust center, thông báo, cài đặt (W-40…W-62) |
| [web-swipe-mockup.html](web-swipe-mockup.html) | ⑤ Chế độ **lướt kiểu Tinder** trong Discover cho người chưa biết mình muốn gì (quyết định 19/09/2026): deck chỉ gồm sự kiện do thành viên đăng, vuốt phải = Lưu (không phải RSVP), kéo lên mở sheet xác nhận, màn tổng kết cảnh báo trùng giờ. Kèm bản "swipe trong dòng" theo `14` §8 (PA B) |

## Mockup khác

| File | Mô tả |
|---|---|
| [event-feed-web-mockup.html](event-feed-web-mockup.html) | Bản thử đầu tiên của feed mạng xã hội (web, responsive cả mobile): khung 3 cột / bottom tab, composer, thẻ sự kiện, RSVP/waitlist/pending-review, lọc theo chip, song ngữ EN/VI (`?lang=vi`) |
