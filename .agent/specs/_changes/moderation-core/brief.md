# Requirement Brief — Lõi kiểm duyệt: báo cáo, chặn, hàng đợi, xử lý, audit log (M4)

**Chủ:** TV3 · **Nguồn:** BA Agent, 25/09/2026 · **Trạng thái:** chờ Tech Lead + Coordinator (PO đã duyệt làm ngay, trước lịch L7)
**Checklist:** E8-S1, E8-S2, E8-S3 (bản rút gọn 3 SP), E8-S4, E9-S1 · S5-DoD-6, S5-DoD-7, S5-DoD-8 · M4-1..M4-4 · S5-Demo-1, S5-Demo-2
**Giai đoạn:** 1 (kết nối cộng đồng). Không chuẩn bị gì riêng cho giai đoạn 2/3.
**Kích thước:** Lớn (> 8 file, `apps/api` + hai web + `packages/*`) → sau khi duyệt dùng `story-writer` cắt story, round-table chốt hợp đồng.

Nguồn nghiệp vụ: doc 05 §6.1, §7.2, §7.3, §7.5–7.7, §7.9, §8.1, §13.3–13.7, §13.10, §16.1; doc 08 §5.9, §5.10; doc 01 §9.2–9.3 (Đ33–Đ41, Đ48–Đ51, INV-2); doc 03 §10.4.

---

## 1. Mục tiêu nghiệp vụ

1. Người dùng gặp nội dung hoặc người có vấn đề (sự kiện, bài đăng, bình luận, hồ sơ) báo cáo được trong vài giây, ẩn danh, chọn lý do có sẵn.
2. Người dùng tự bảo vệ mình bằng cách chặn một người: hai bên không còn thấy nhau, không nhắn được cho nhau, bên bị chặn không RSVP được sự kiện của người chặn. Chặn là im lặng.
3. Moderator có một bảng report xếp theo mức nghiêm trọng và thời gian chờ, thấy đồng hồ SLA (P0 = 2 giờ) và xử lý tay.
4. Mọi quyết định kiểm duyệt (ẩn/khôi phục nội dung, tạm gỡ/gỡ/khôi phục sự kiện, khoá/mở khoá tài khoản, bác report) có lý do bắt buộc, người thực hiện, thời điểm, và nằm trong bản ghi không sửa được — đủ để trả lời "ai đã làm gì, vì sao" khi bị chất vấn (NT-3, doc 08: không có phiên bản rút gọn của trách nhiệm này).
5. Khu admin có audit log cho mọi hành động của nhân sự vận hành trên dữ liệu người khác (INV-2).

## 2. Tác nhân và quyền

| Tác nhân | Được làm | Không được làm |
|---|---|---|
| `guest` | — | Báo cáo (form guest + CAPTCHA của Đ33 **ngoài phạm vi**), chặn |
| `member` (mọi trust level, kể cả T0) | Báo cáo sự kiện/bài đăng/bình luận/người dùng; chặn/bỏ chặn; xem danh sách chặn của mình | Vào console; xem hàng đợi; biết ai báo cáo mình hay ai chặn mình |
| Organizer (member host sự kiện) | Như member. Thấy sự kiện của mình bị tạm gỡ/gỡ kèm nhãn trạng thái | Tự đưa sự kiện bị gỡ về `published` (API đã chặn — xem as-is) |
| `curator` | Báo cáo, chặn như member; vào console (đã có) | **Không** vào hàng đợi trong v1 (Đ40 chỉ cho xem report gắn listing curate — listing curate chưa tồn tại) → 403, không có mục menu. Không xem audit log (Đ48) |
| `moderator` | Xem hàng đợi (trừ ticket dính xung đột lợi ích, Đ41); xem chi tiết ticket kể cả danh tính người báo cáo; đổi mức nghiêm trọng; bác report; ẩn/khôi phục bài đăng, bình luận; tạm gỡ / gỡ sự kiện; khôi phục sự kiện `suspended`; khoá tài khoản **role = member** tối đa **30 ngày**, mở khoá sớm; xem audit log **hành động của chính mình** (Đ49) | Khoá tài khoản staff (Đ37); khoá > 30 ngày; khôi phục sự kiện `taken_down`; xử lý ticket mà mình là người báo cáo / chủ nội dung / organizer của sự kiện liên quan (Đ34, INV-4); thấy tên moderator khác trên hành động |
| `admin` | Mọi quyền của moderator; khoá tài khoản member/curator/moderator không giới hạn 30 ngày (vẫn phải có ngày hết hạn, Giả định BA #9); khôi phục sự kiện `taken_down`; xem audit log toàn bộ **trừ** bản ghi có actor là `super_admin` (Đ50); thấy danh tính người thực hiện trên mọi hành động | Khoá `admin`/`super_admin` khác (Đ38) |
| `super_admin` | Mọi quyền của admin; khoá được mọi tài khoản trừ chính mình (Đ39); xem toàn bộ audit log (Đ51) | Khoá chính mình |

Quy tắc chung: không ai hành động kiểm duyệt lên nội dung/tài khoản của chính mình. `PERMISSION_MATRIX` ở `packages/domain` là nguồn duy nhất cho API và console (tiếp nối rbac-admin-shell) — cần thêm các khoá tương ứng `report.create`, `block.manage`, `moderation.queue.view`, `content.hide`, `event.moderate`, `user.suspend`, `audit_log.view` (tên cuối do Tech Lead chốt).

## 3. Trong phạm vi

**E8-S1 — Báo cáo (web client + API)**
1. Nút "Report" ở: chi tiết sự kiện (`/events/[id]`), thẻ bài đăng trong feed, từng bình luận, trang hồ sơ công khai (`/u/[handle]`). Không hiện trên nội dung của chính mình.
2. Sheet báo cáo theo doc 05 §7.6: tiêu đề, câu trấn an ẩn danh, 12 lý do (§16.1), mô tả tuỳ chọn ≤ 2000 ký tự, tuỳ chọn "Chặn người này luôn", nút gửi, màn xác nhận. Chọn "Someone is in danger" → khối 113/115 hiện ngay đầu sheet.
3. API tạo report: bắt buộc `Idempotency-Key` (BR-23); mức nghiêm trọng khởi tạo suy từ lý do theo §5; chụp lại nội dung đối tượng tại thời điểm báo cáo (snapshot bằng chứng — nội dung có thể bị sửa sau đó).
4. Rate limit theo trust level (§8).

**E8-S2 — Chặn (web client + API)**
5. Chặn / bỏ chặn từ trang hồ sơ công khai và từ menu của thẻ bài đăng/bình luận/chi tiết sự kiện (chặn tác giả/organizer); màn "Người đã chặn" trong cài đặt để bỏ chặn.
6. Hiệu lực hai chiều trên mọi bề mặt hiện có theo bảng §6.

**E8-S3 rút gọn — Bảng report (web admin + API)**
7. Trang "Moderation queue" trong `apps/web-admin-side`: danh sách ticket đang mở, xếp mức (P0 trước) rồi thời gian chờ (lâu nhất trước); lọc theo mức; lọc trạng thái Đang mở / Đã xử lý; đồng hồ SLA đếm ngược, nhuộm màu sắp quá hạn / quá hạn.
8. Gộp report: một đối tượng đang có ticket mở thì report mới gắn vào ticket đó (§7).
9. Trang chi tiết ticket: snapshot nội dung lúc báo cáo + liên kết trạng thái hiện tại, lý do, các mô tả, số người báo cáo, danh tính người báo cáo (chỉ staff có quyền hàng đợi), lịch sử hành động.
10. Đổi mức nghiêm trọng có lý do (ghi `severity_changed`).
11. Chặn xung đột lợi ích khi xem/xử lý ticket.

**E8-S4 — Hành động moderator (API + web admin)**
12. Các hành động ở §9, mỗi hành động bắt buộc mã lý do + ghi chú ≥ 20 ký tự; thực hiện từ trang chi tiết ticket, và khôi phục/mở khoá từ lịch sử hành động.
13. Bảng `moderation_actions` append-only (S5-DoD-7, M4-4).

**E9-S1 — Audit log (API + web admin)**
14. Bảng `audit_logs` append-only, ghi mọi hành động staff ở §10, ghi cùng giao dịch với hành động.
15. Trang "Audit log" trong console: chỉ đọc, lọc theo thời gian / hành động / người thực hiện / đối tượng, phân trang cursor, mới nhất trước; phạm vi xem theo role (§2).

**Chung**: toàn bộ chuỗi mới có EN + VI; đổi `packages/contracts` (loại đối tượng bị báo cáo, lý do, mức, trạng thái ticket, loại hành động, DTO) và `packages/domain` (PERMISSION_MATRIX, bảng lý do→mức, bảng SLA).

## 4. Ngoài phạm vi (ghi rõ để không ai làm thừa)

- **Thông báo** mọi loại: báo người bị xử lý, báo người báo cáo kết quả, báo người đã RSVP khi sự kiện bị gỡ (S5-Demo-2 nửa sau), báo on-call khi có ticket P0 (TG-M4-2 cần kênh này) — hệ thống thông báo E7 chưa có → **phụ thuộc E7**, không làm giả bằng cách khác.
- Khiếu nại (appeals, doc 05 §8.5).
- Cưỡng chế bậc `reminder`, `warning`, `feature_restricted`, `banned`, strike, ma trận tái phạm, tác động lên `trust_level` / `trust_signals` (`report_upheld` thuộc S5-DoD-5 của TV1). Lưu ý: `user_status_enum` hiện **không có** `banned`/`restricted`.
- Hệ quả dây chuyền khi khoá tài khoản (ẩn mọi sự kiện đang mở, huỷ RSVP tương lai, đôn waitlist — doc 05 E5). v1 khoá = chặn đăng nhập/refresh; nội dung xử lý riêng từng cái.
- Tự ẩn nội dung khi nhận report `critical` (fail closed doc 05 §7.3) — xem Giả định BA #3 và câu hỏi mở Q1.
- `moderation_cases` đầy đủ: `priority_score`, corroboration 3 người không quen, phát hiện brigading/trả đũa, `awaiting_info` + tạm dừng SLA, assign/nhận ca, leo thang tự động, auto-close `low`.
- Nguồn report tự động (N2), rà soát chủ động có lịch (N3), yêu cầu ngoài (N4), báo cáo của guest.
- Báo cáo **tin nhắn chat**, **review** (chưa tồn tại), **ảnh**, **occurrence** riêng lẻ; đính kèm ảnh chụp màn hình làm bằng chứng.
- `GET /reports/mine` (người báo cáo xem tiến độ) — follow-up.
- Ẩn tin nhắn của bên bị chặn trong **group chat sự kiện**; UI chat trên web (web chưa có chat — chặn DM chỉ kiểm ở API).
- Community Guidelines (E8-S5), chống spam tự động (E8-S6), mobile app, 2FA staff, `AccountStatusGuard` per-request, purge IP 90 ngày, audit `pii_access` khi mở chi tiết ticket.

## 5. Bảng lý do báo cáo → mức nghiêm trọng

Người dùng thấy 12 lý do (doc 05 §16.1). Mỗi lý do UI gom nhiều giá trị `report_reason_enum` với mức khác nhau (doc 05 §7.2). **Giả định BA #1:** v1 lưu trên report **mã lý do cấp UI** (12 giá trị, key i18n `safety.report.reason.*`) và mức khởi tạo = **mức cao nhất** trong các enum mà lý do đó gom (đúng tinh thần "gộp làm tăng mức, không bao giờ giảm" §7.5; an toàn hơn chọn mức thấp). Moderator hạ/nâng mức khi xem xét, có lý do (§9). Bảng 30 enum chi tiết để Tech Lead quyết có dùng làm mã lý do trên hành động moderator hay không.

| Lý do UI (EN / VI) | Key | Enum doc 05 gom vào (mức theo §7.2) | Mức khởi tạo | SLA |
|---|---|---|---|---|
| Someone is in danger / Có người đang gặp nguy hiểm | `danger` | physical_threat, sexual_assault_report, minor_safety (critical) | **P0 critical** | 2 giờ |
| Harassment or bullying / Quấy rối hoặc bắt nạt | `harassment` | harassment (high), stalking (critical) | **P0 critical** | 2 giờ |
| Unwanted sexual content or contact / Nội dung hoặc tiếp cận tình dục không mong muốn | `sexual` | sexual_harassment, sexual_services (critical), nsfw_content (high) | **P0 critical** | 2 giờ |
| Hate speech or discrimination / Ngôn từ thù ghét hoặc phân biệt đối xử | `hate` | hate_speech (high) | **P1 high** | 12 giờ |
| Scam or someone asking for money / Lừa đảo hoặc xin tiền | `scam` | financial_scam (critical), fake_job_or_fee, investment_pitch (high) | **P0 critical** | 2 giờ |
| This event isn't real / Sự kiện này không có thật | `ghost_event` | ghost_event, event_clone (high) | **P1 high** | 12 giờ |
| Pretending to be someone else / Giả mạo người khác | `impersonation` | impersonation (high; critical nếu mạo danh nhân sự), ban_evasion (high) | **P1 high** | 12 giờ |
| Spam or advertising / Spam hoặc quảng cáo | `spam` | spam_advertising, cross_post_spam (normal) | **P2 normal** | 48 giờ |
| Shared someone's private information / Chia sẻ thông tin riêng tư của người khác | `privacy` | doxxing (critical) | **P0 critical** | 2 giờ |
| Illegal activity / Hoạt động vi phạm pháp luật | `illegal` | illegal_substance, political_or_state_sensitive, unauthorized_religious_activity (critical) | **P0 critical** | 2 giờ |
| Unsafe event setup / Sự kiện tổ chức thiếu an toàn | `unsafe_setup` | unsafe_activity_setup, private_residence_unverified (high) | **P1 high** | 12 giờ |
| Something else / Vấn đề khác | `other` | other, off_topic_or_miscategorized (low), no_show_abuse, curation_attribution_error (normal) | **P3 low** | 72 giờ |

Ghi chú đối chiếu:
- `impersonation`: nhóm chứa ca `critical` (mạo danh nhân sự nền tảng) nhưng điều kiện đó chỉ con người xác định được → khởi tạo P1, moderator nâng P0 khi thấy mạo danh staff. `other`: `other` không có dòng ở §7.2; lấy `low` vì doc 08 §5.9 xếp "thông tin sai" P3 (Giả định BA).
- Lệch doc 08 §5.9 đã biết: doc 08 xếp "khiêu dâm" P1, bảng này xếp nhóm `sexual` P0 vì nhóm gom cả quấy rối tình dục/mại dâm trá hình (critical ở doc 05). Doc 05 là nguồn chi tiết hơn và là nguồn DB → theo doc 05.
- Ký hiệu P0–P3 chỉ để hiển thị; giá trị lưu là `critical/high/normal/low` (doc 05 §7 quy ước).
- **SLA** theo S5-DoD-6 / doc 08 §5.9: P0 2 giờ · P1 12 giờ · P2 48 giờ · P3 **72 giờ** (doc 05 §7.3 ghi `low` = 7 ngày — checklist thắng vì là DoD nghiệm thu). **Giả định BA #2:** v1 tính SLA theo **đồng hồ thật 24/7 cho cả bốn mức** (doc 05 tính giờ hành chính cho P1–P3); đơn giản và chặt hơn, không sai cam kết.

## 6. Quy tắc chặn hai chiều theo từng bề mặt

Một dòng chặn là **một chiều** về dữ liệu (A là người chặn, B bị chặn — chỉ A bỏ chặn được), nhưng **hiệu lực là hai chiều**: tồn tại chặn giữa A và B theo bất kỳ chiều nào thì cả A lẫn B đều chịu mọi quy tắc dưới đây với nhau (S5-DoD-8, doc 01 UC-18 "chặn hai chiều"). "Bên kia" = người còn lại trong cặp.

| Bề mặt hiện có | Endpoint / màn hình | Quy tắc | Phản hồi khi vi phạm |
|---|---|---|---|
| Khám phá / danh sách sự kiện | `GET /api/v1/events`, `/discover`, trang chủ | Không trả sự kiện do bên kia tổ chức | Bỏ khỏi danh sách, không báo gì |
| Chi tiết sự kiện | `GET /api/v1/events/:id`, `/events/[id]` | Sự kiện do bên kia tổ chức coi như không tồn tại | **404** y hệt sự kiện không tồn tại |
| RSVP mới / vào waitlist | `POST /api/v1/occurrences/:id/rsvps` | Không RSVP/không vào waitlist được occurrence của sự kiện do bên kia tổ chức | **404** như occurrence không tồn tại |
| RSVP có sẵn trước khi chặn | — | **Giữ nguyên**, hệ thống không tự huỷ (doc 05 §13.7). Gợi ý riêng tư cho người chặn — ngoài phạm vi v1 | — |
| Danh sách người tham gia | `GET /api/v1/occurrences/:id/rsvps` | Hai bên không thấy nhau trong danh sách | Bỏ khỏi danh sách; số đếm tổng không đổi (Giả định BA #4: không lộ qua chênh lệch con số) |
| Feed bài đăng + chi tiết | `GET /api/v1/posts`, `GET /api/v1/posts/:id` | Không thấy bài của bên kia | Bỏ khỏi feed; chi tiết **404** |
| Bình luận | `GET .../comments` trên post/event, `GET /comments/:id` | Bình luận (và trả lời) của bên kia ẩn với mình, **vẫn hiện với người thứ ba** — chặn là bộ lọc cá nhân | Bỏ khỏi danh sách; chi tiết 404 |
| Viết bình luận / reaction | `POST .../comments`, reactions | Không bình luận/react được vào bài hoặc sự kiện của bên kia (vì đối tượng đã 404). Trên bài của người thứ ba vẫn bình luận bình thường | 404 |
| Danh sách reaction | `GET .../reactions` | Bỏ bên kia khỏi danh sách người react | Bỏ khỏi danh sách |
| Nhắn tin 1-1 | `POST /api/v1/conversations` (direct), `POST /conversations/:id/messages` | Không mở được hội thoại mới, không gửi được tin trong hội thoại direct cũ — **cả hai chiều**. Lịch sử cũ vẫn đọc được | **403 `CONVERSATION_REQUEST_REFUSED`** (mã đã có, trùng với ca bị từ chối lời mời → không phân biệt được là bị chặn) |
| Hồ sơ công khai | `GET /api/v1/profiles/:handle`, `/u/[handle]` | Coi như không tồn tại với bên kia | **404** (không 403 — 403 lộ việc chặn, doc 05 §13.7) |
| Nhắc tên (mention) | bình luận | Không phát sinh thông báo cho bên kia (khi E7 có) | — |
| Báo cáo | `POST /api/v1/reports` | Người chặn **vẫn** báo cáo được người đã chặn (target `user`) — chặn không được cản kênh an toàn | — |
| Console staff | web admin | Chặn **không** áp dụng cho góc nhìn kiểm duyệt: moderator thấy nội dung của cả hai bên khi xử lý ticket | — |

Quy tắc bổ trợ:
- Chặn/bỏ chặn không gửi thông báo, không đổi gì trên giao diện của bên bị chặn, không có endpoint nào cho biết "ai đã chặn tôi".
- Tự chặn mình → 400/422. Chặn user không tồn tại → 404. Chặn lại người đã chặn → 204, vẫn một dòng. Bỏ chặn người chưa chặn → 204.
- Member chặn được cả tài khoản staff; hiệu lực chỉ trên các bề mặt cá nhân ở trên, không cản hành động kiểm duyệt.
- **Giả định BA #5:** mọi tài khoản đăng nhập đang `active` chặn được, **không** đặt ngưỡng trust (doc 05 §13.10 ghi T1+; hạ xuống T0 vì chặn là công cụ an toàn, đồng lý do UC-60 không đặt ngưỡng cho báo cáo). Không giới hạn số người chặn.
- Hội thoại direct đã có `request_status = 'blocked'` theo từng hội thoại; nguồn sự thật mới là bảng chặn toàn cục — Tech Lead chốt quan hệ giữa hai thứ (behavior smell #2).

## 7. Ticket, gộp report và SLA

- **Ticket** = đơn vị hiển thị trên bảng report: một đối tượng (loại + id) có tối đa **một ticket đang mở**. Report mới lên một đối tượng đang có ticket mở → gắn vào ticket đó (mỗi report vẫn là một dòng riêng, giữ mô tả riêng).
- Mức của ticket = **max** mức các report trong ticket; không bao giờ tự giảm.
- Hạn SLA: ticket mới → `thời điểm report đầu + SLA(mức)`. Report mới nâng mức → hạn = `min(hạn hiện tại, thời điểm report mới + SLA(mức mới))`. Moderator đổi mức → hạn = `thời điểm report đầu + SLA(mức mới)` (hạ mức không được làm hạn đã quá trở thành chưa quá — hiển thị theo tính toán mới nhưng hành động đổi mức luôn ghi lại, doc 05 §7.2 "không hạ mức để né SLA").
- Cùng một người báo cáo cùng một đối tượng khi report cũ của họ còn mở → **không** tạo dòng mới, trả lại report cũ (không tính vào rate limit).
- Trạng thái ticket (Giả định BA #6): `open` → `resolved` (đã có hành động) hoặc `dismissed` (không vi phạm). Đồng hồ SLA dừng khi ticket rời `open`. Ticket đóng thì mọi report đang mở của nó đóng theo.
- **Màu cảnh báo** (Giả định BA #7): *Bình thường* khi còn > 25% thời lượng SLA; *Sắp quá hạn* khi còn ≤ 25% (P0: ≤ 30 phút · P1: ≤ 3 giờ · P2: ≤ 12 giờ · P3: ≤ 18 giờ); *Quá hạn* khi hết giờ, hiển thị "quá hạn X". Mỗi trạng thái có nhãn chữ i18n riêng, không chỉ dựa vào màu.
- Report lên đối tượng đã bị ẩn/gỡ mà vẫn còn truy cập được với người báo cáo (vd tác giả) — không xảy ra vì đối tượng đã 404 với người khác; report lên đối tượng sau này bị tác giả xoá vẫn giữ ticket, moderator xem snapshot.

## 8. Chống lạm dụng báo cáo

- Rate limit theo trust level (doc 05 §6.1), cửa sổ trượt 24 giờ: **T0–T1: 5 · T2: 10 · T3–T5: 20** report. T0 không có trong bảng doc 05 → dùng mức T1 (Giả định BA #8). Vượt → **429 `RATE_LIMITED`** kèm `Retry-After`, UI hiển thị thông báo i18n.
- Không bao giờ tước hẳn quyền báo cáo (doc 05 §7.9).
- Idempotency-Key bắt buộc: bấm gửi hai lần / retry mạng không tạo hai report.
- Gắn cờ trả đũa, brigading, đánh dấu báo cáo sai — ngoài phạm vi v1 (moderator tự đánh giá trong ghi chú).

## 9. Hành động moderator và trạng thái đích

Mọi hành động: bắt buộc **mã lý do** (một trong 12 key ở §5) + **ghi chú ≥ 20 ký tự** (doc 05 §13.5, Đ35); thiếu → 400 validation, không có gì thay đổi. Mỗi hành động thành công sinh **đúng một** dòng `moderation_actions` và **đúng một** dòng `audit_logs`, trong cùng giao dịch với thay đổi trạng thái.

| Hành động | Đối tượng | Trạng thái trước → sau | Ai | Hiệu lực quan sát được |
|---|---|---|---|---|
| Ẩn nội dung | bài đăng, bình luận | `status: visible → hidden`, `moderation_state → actioned` | moderator+ | Biến khỏi feed/danh sách, chi tiết 404 với mọi người trừ tác giả và staff. Tác giả thấy nội dung kèm nhãn "Đã bị ẩn do vi phạm Quy tắc cộng đồng" + nhãn lý do (không thấy ghi chú, không thấy ai làm). Tác giả sửa nội dung bị ẩn → 409 (giữ nguyên bằng chứng) — Giả định BA #10. **Không xoá** khỏi DB (Đ35) |
| Khôi phục nội dung | bài đăng, bình luận đang `hidden` | `hidden → visible` | moderator+ | Hiện lại ngay. Dòng hành động cũ không bị sửa; ghi một dòng mới |
| Tạm gỡ sự kiện | sự kiện | `* → suspended` | moderator+ | Biến khỏi khám phá ngay, chi tiết 404 với mọi người trừ organizer (thấy nhãn "Tạm gỡ để xem xét") và staff; RSVP mới bị từ chối (API đã chỉ nhận `published`); organizer không tự sửa trạng thái được |
| Gỡ sự kiện | sự kiện | `* → taken_down` | moderator+ | Như trên, nhãn "Đã bị gỡ do vi phạm". **S5-Demo-2**. RSVP có sẵn **giữ nguyên dòng** (để khôi phục không mất dữ liệu); người đã RSVP thấy sự kiện trong "Sự kiện của tôi" với nhãn trung tính "Sự kiện này không còn khả dụng" (Giả định BA #11). Thông báo huỷ → phụ thuộc E7 |
| Khôi phục sự kiện | `suspended` / `taken_down` | `→ published` | `suspended`: moderator+ · `taken_down`: **admin+** | Hiện lại trên khám phá |
| Khoá tài khoản | user | `active → suspended`, đặt `suspended_until`, `suspension_reason` | moderator (target role = member, 1–30 ngày) · admin (target ≠ admin/super_admin) · super_admin (mọi người trừ mình) | Đăng nhập và refresh bị từ chối với `errors.auth.accountSuspended` (mã đã có); mọi refresh session bị thu hồi; access token cũ còn sống tối đa 15 phút (rủi ro đã biết từ rbac-admin-shell). Nội dung của người đó **không** tự ẩn |
| Mở khoá tài khoản | user `suspended` | `suspended → active` | cùng quy tắc với khoá | Đăng nhập lại được ngay |
| Hết hạn khoá | user | `suspended → active` khi qua `suspended_until` | hệ thống (actor rỗng) | Người dùng đăng nhập lại được mà không cần staff; có dòng hành động + audit do hệ thống. Cơ chế (job hay kiểm lúc đăng nhập) Tech Lead chọn — hiện `assertUsable` từ chối mọi `suspended` bất kể hạn |
| Bác report (không vi phạm) | ticket | `open → dismissed` | moderator+ | Nội dung giữ nguyên; ghi hành động `no_action` (doc 05 §8.1 bắt buộc, để đo tỷ lệ báo cáo sai) |
| Đổi mức | ticket | mức cũ → mức mới | moderator+ | Hạn SLA tính lại; ghi `severity_changed` với mức cũ/mới |

- Hành động từ ticket (ẩn/gỡ/khoá) chuyển ticket sang `resolved`. Một ticket có thể kèm nhiều hành động (vd gỡ sự kiện **và** khoá organizer) — hành động đầu tiên đóng ticket, hành động sau vẫn gắn được vào ticket đã đóng.
- Hành động lên nội dung/tài khoản của staff: nội dung/tài khoản của `moderator` cần `admin+`; của `admin`/`super_admin` cần `super_admin` (Giả định BA #12, suy từ Đ37–Đ39, Đ9).
- Sự kiện `cancelled` bởi organizer vẫn gỡ được (`cancelled → taken_down`) để nó không quay lại được.

## 10. Audit log (E9-S1)

Ghi vào `audit_logs` (doc 03 §10.4), append-only, không có endpoint sửa/xoá, DB thu hồi UPDATE/DELETE của role ứng dụng (Đ51).

| Cột nghiệp vụ | Nội dung |
|---|---|
| Ai | `actor_user_id` (rỗng = hệ thống), `actor_type` (staff/system), role tại thời điểm hành động |
| Làm gì | `action` dạng `nhóm.hành_động`, vd `moderation.content_hidden`, `moderation.content_restored`, `moderation.event_suspended`, `moderation.event_taken_down`, `moderation.event_restored`, `moderation.user_suspended`, `moderation.user_unsuspended`, `moderation.report_dismissed`, `moderation.severity_changed` |
| Lên cái gì | `entity_type` + `entity_id` (bài đăng/bình luận/sự kiện/user/ticket) |
| Thay đổi | `before` / `after` chỉ gồm trường đổi (vd `status`, `suspended_until`, `severity`), **không** chứa email/SĐT/nội dung bài |
| Vì sao | mã lý do + ghi chú |
| Khi nào / truy vết | `created_at`, `request_id`, `severity` (info/notice/warning/critical — khoá tài khoản và gỡ sự kiện ≥ `warning`) |

- Bắt buộc ghi: mọi hành động ở §9 (kể cả hệ thống tự mở khoá). **Không** ghi thao tác của member (báo cáo, chặn — đó là dữ liệu riêng tư của họ, không phải hành động quản trị).
- **Giả định BA #13:** v1 **không** lưu IP/user agent vào audit (tối thiểu hoá dữ liệu, chưa có job purge 90 ngày).
- **Giả định BA #14:** hành động bị từ chối (400/403/409) không ghi audit ở v1; nằm ở log ứng dụng.
- Ghi audit thất bại → cả hành động rollback. Không tồn tại hành động kiểm duyệt không có audit.
- `moderation_actions` (bản ghi nghiệp vụ, S5-DoD-7) và `audit_logs` (nhật ký chung, E9-S1) là hai thứ khác nhau; v1 cần cả hai. Nếu Tech Lead muốn gộp → round-table, nhưng phải giữ đủ trường S5-DoD-7.

## 11. Hành vi hiện tại (as-is)

Quan sát bằng đọc code + schema ngày 25/09/2026; **chưa chạy app thật** — Tester/Tech Lead xác nhận lại trên môi trường chạy.

- Không có bảng `reports`, `blocks`, `moderation_actions`, `audit_logs`; không có module report/moderation.
- `event_status_enum` đã có `suspended`, `taken_down`, `cancelled`. `GET /events` và `/events/:id` chỉ trả `published` **hoặc** sự kiện của chính organizer. `updateStatus` của organizer không đổi được sự kiện đang `suspended`/`taken_down`. RSVP chỉ nhận khi sự kiện `published`.
- `posts`, `comments`, `messages` có `status` (`visible/pending_review/hidden/removed`) và `moderation_state` (`clean/flagged/under_review/actioned`), cột `report_count`. Danh sách/chi tiết chỉ trả `visible` hoặc nội dung của chính tác giả. Contract post cố ý không trả `reportCount`/`moderationState`.
- `users` có `status` (`pending/active/suspended/deactivated/deleted`), `suspended_until`, `suspension_reason`. Đăng nhập/refresh từ chối mọi `status ≠ active` (`ACCOUNT_NOT_ACTIVE` + `errors.auth.accountSuspended`), không xét `suspended_until`.
- Chat: hội thoại direct có `request_status` gồm `blocked`; gửi tin khi `declined/blocked` → 403 `CONVERSATION_REQUEST_REFUSED`.
- Web client có: `/discover`, `/events/[id]`, `/my-events`, `/u/[handle]`, feed bài đăng có bình luận. **Không có** UI chat.
- Web admin có: đăng nhập staff, shell, landing, System health; `STAFF_ROLES` + `PERMISSION_MATRIX` (2 khoá) ở `packages/domain`.

## 12. Behavior smell phát hiện

1. **Hai nguồn sự thật về chặn:** `conversations.request_status = 'blocked'` (từng hội thoại) vs bảng chặn toàn cục sắp thêm → dễ lệch.
2. **Rò rỉ qua đếm/404 khác thường** (smell #4 PII): số người tham gia, `comment_count`/`reaction_count` có thể lộ việc bị chặn hoặc nội dung bị ẩn; mã lỗi khác nhau giữa "bị chặn" và "không tồn tại" lộ quan hệ chặn.
3. **Khoá tài khoản không có hạn tự mở:** `assertUsable` bỏ qua `suspended_until` → người bị khoá 7 ngày sẽ bị khoá vĩnh viễn trên thực tế.
4. **Access token còn sống 15 phút sau khi khoá** — người bị khoá vì đe doạ vẫn ghi dữ liệu được trong cửa sổ đó.
5. **Mâu thuẫn tài liệu:** SLA `low` (doc 05: 7 ngày / checklist: 72 giờ); "quấy rối" (doc 05 high / doc 08 P0); "khiêu dâm" (doc 05 critical-high / doc 08 P1); ngưỡng trust báo cáo/chặn (doc 05 §13.10 T1+ / doc 01 UC-60 T0); `user_status_enum` thiếu `banned`/`restricted`.
6. **Đồng hồ SLA theo múi giờ:** hạn lưu UTC, hiển thị `Asia/Ho_Chi_Minh`; đếm ngược tính ở client phải dựa vào giờ server trả về, không tin đồng hồ máy.

## 13. Acceptance criteria

Người dùng mẫu: **A**, **B** là member `active`; **M** moderator; **M2** moderator khác; **AD** admin; **SA** super_admin; **C** curator.

### E8-S1 — Báo cáo
- **AC-1 (Happy, S5-Demo-1):** GIVEN A đăng nhập web, B tổ chức sự kiện E `published` WHEN A mở `/events/E` → "Report" → chọn "Scam or someone asking for money" → Gửi THEN API trả **201**; màn xác nhận hiện đúng chuỗi `safety.report.submitted`; trong console, M thấy ticket mới mức **P0**, hạn = thời điểm gửi + 2 giờ, đồng hồ đếm ngược đang chạy.
- **AC-2 (Happy):** GIVEN A xem bài đăng, bình luận, hồ sơ `/u/[handle]` của B WHEN A báo cáo từng cái THEN mỗi lần tạo một report với loại đối tượng đúng (`post`, `comment`, `user`) và chủ đối tượng là B; nút Report **không** hiện trên nội dung/hồ sơ của chính A.
- **AC-3 (Happy):** GIVEN sheet báo cáo mở THEN có đúng 12 lý do theo §5; WHEN chọn "Someone is in danger" THEN khối 113/115 (`safety.report.emergency_first`) hiện ở đầu sheet trước ô mô tả.
- **AC-4 (Happy):** GIVEN A chọn lý do "Harassment or bullying" THEN ô "Also block this person" mặc định **bật**; lý do khác mặc định tắt. WHEN gửi với ô bật THEN report được tạo **và** A đã chặn B (kiểm ở §6).
- **AC-5 (Edge):** GIVEN A đã có report đang mở lên E WHEN A báo cáo E lần nữa (hoặc retry cùng `Idempotency-Key`) THEN không có dòng report mới, trả lại report cũ, số report của ticket không đổi, không trừ hạn mức.
- **AC-6 (Edge):** GIVEN A tự báo cáo nội dung/hồ sơ của mình THEN **422** (mã đề xuất `REPORT_SELF_NOT_ALLOWED`). GIVEN đối tượng không tồn tại hoặc A không thấy được THEN **404**. GIVEN mô tả > 2000 ký tự THEN **400** kèm `messageKey`.
- **AC-7 (Edge):** GIVEN A đã chặn B WHEN A gửi report với đối tượng `user` = B THEN **201** (chặn không cản báo cáo).
- **AC-8 (Error):** GIVEN mạng rớt khi bấm Gửi THEN hiện lỗi i18n có nút Thử lại, lý do và mô tả đã nhập vẫn còn; WHEN thử lại thành công THEN chỉ có **một** report.
- **AC-9 (Rate limit):** GIVEN A ở T1 đã gửi 5 report trong 24 giờ WHEN gửi report thứ 6 THEN **429 `RATE_LIMITED`** có header `Retry-After`, UI hiện thông báo i18n; T2 bị chặn ở report thứ 11, T3+ ở thứ 21.
- **AC-10 (Quyền):** GIVEN không có token WHEN `POST /api/v1/reports` THEN **401**. GIVEN thiếu `Idempotency-Key` THEN **400**.
- **AC-11 (Riêng tư):** GIVEN B bị báo cáo WHEN B gọi mọi API B có quyền (chi tiết sự kiện của mình, my-events, bài của mình, hồ sơ mình) THEN không response nào có số report, trạng thái kiểm duyệt, hay bất kỳ trường nào về người báo cáo; UI của B không đổi.

### E8-S2 — Chặn
- **AC-12 (Happy):** GIVEN A xem `/u/B` WHEN A bấm Chặn và xác nhận THEN API **204**; B xuất hiện trong "Người đã chặn" của A; B không nhận thông báo nào.
- **AC-13 (Hai chiều — S5-DoD-8, M4-2):** GIVEN A đã chặn B THEN với **cả hai** góc nhìn (B xem đồ của A, **và** A xem đồ của B), mọi dòng bảng §6 đúng: sự kiện của bên kia vắng khỏi `GET /events`; `GET /events/:id` → **404**; `POST .../rsvps` vào occurrence của bên kia → **404**; bài đăng vắng khỏi feed, chi tiết **404**; bình luận của bên kia vắng khỏi danh sách; `GET /profiles/:handle` → **404**; mở hội thoại direct hoặc gửi tin trong hội thoại direct cũ → **403 `CONVERSATION_REQUEST_REFUSED`**; hai bên vắng khỏi danh sách người tham gia của nhau. Test tự động phải có đủ hai chiều cho từng dòng.
- **AC-14 (Edge — người thứ ba):** GIVEN A chặn B, C (không liên quan) xem một bài có bình luận của cả A và B THEN C thấy cả hai bình luận.
- **AC-15 (Edge — RSVP cũ):** GIVEN B đã RSVP `confirmed` sự kiện của A trước khi bị chặn THEN RSVP của B vẫn `confirmed`, không bị huỷ tự động.
- **AC-16 (Edge):** Tự chặn → **400/422**; chặn user không tồn tại → **404**; chặn lại → **204** và vẫn đúng một dòng; bỏ chặn → **204**, mọi bề mặt ở AC-13 hiện lại ngay ở request kế tiếp; bỏ chặn người chưa chặn → **204**.
- **AC-17 (Edge — không lộ):** GIVEN A chặn B THEN không endpoint nào cho B biết A chặn B; response 404 cho B giống byte-for-byte (code, messageKey) với 404 của đối tượng không tồn tại.
- **AC-18 (Edge — staff):** GIVEN A chặn moderator M THEN M vẫn thấy nội dung của A trong console khi xử lý ticket và vẫn xử lý được.
- **AC-19 (Error):** GIVEN mạng rớt khi bấm Chặn THEN hiện lỗi i18n + Thử lại, trạng thái nút không đổi sang "Đã chặn" cho tới khi API xác nhận.
- **AC-20 (Quyền):** Không token → **401** trên `POST/DELETE /users/:id/block` và `GET /me/blocks`; `GET /me/blocks` chỉ trả danh sách của chính người gọi.

### E8-S3 — Bảng report
- **AC-21 (Quyền):** `GET /api/v1/admin/moderation/queue` — không token **401**; A (member) **403**; C (curator) **403** và sidebar của C không có mục "Moderation queue"; M, AD, SA **200**.
- **AC-22 (Happy — M4-3):** GIVEN ticket P2 tạo lúc 08:00, P0 lúc 09:00, P0 lúc 08:30, P3 lúc 07:00 THEN thứ tự hiển thị: P0 08:30, P0 09:00, P2 08:00, P3 07:00. Lọc "P0" chỉ trả hai ticket P0.
- **AC-23 (SLA — S5-DoD-6):** Ticket P0/P1/P2/P3 có hạn đúng +2 h / +12 h / +48 h / +72 h tính từ report đầu (đồng hồ thật). Ticket P0 còn 29 phút → nhãn + màu "Sắp quá hạn"; còn 31 phút → "Bình thường"; quá hạn → "Quá hạn" kèm thời gian đã quá. Tương tự ngưỡng 25% cho P1–P3 theo §7.
- **AC-24 (Gộp):** GIVEN ticket mở P2 (spam) lên bài X tạo lúc T WHEN người khác báo cáo X lý do "Harassment" lúc T+1h THEN vẫn một ticket, số report = 2, mức = **P0**, hạn = T+3h (min(T+48h, T+1h+2h)).
- **AC-25 (Đổi mức):** GIVEN ticket P2 WHEN M đổi sang P1 với ghi chú ≥ 20 ký tự THEN mức P1, hạn = report đầu + 12 h, có dòng `severity_changed` ghi mức cũ/mới + actor; ghi chú < 20 ký tự → **400**, không thay đổi.
- **AC-26 (Xung đột lợi ích):** GIVEN M là người báo cáo, hoặc chủ nội dung, hoặc organizer của sự kiện liên quan THEN ticket không hiện trong hàng đợi của M; M gọi thẳng API xử lý ticket → **403** (mã đề xuất `CONFLICT_OF_INTEREST`); M2 thấy và xử lý bình thường.
- **AC-27 (Chi tiết):** GIVEN M mở ticket THEN thấy snapshot nội dung lúc báo cáo (kể cả khi tác giả đã sửa/xoá sau đó), lý do dạng nhãn i18n, các mô tả, số report, danh tính người báo cáo, lịch sử hành động.
- **AC-28 (Error):** GIVEN API không phản hồi THEN trang hàng đợi hiện trạng thái lỗi i18n + Thử lại, không màn trắng; đồng hồ không tiếp tục đếm trên dữ liệu cũ mà không báo.
- **AC-29 (Đã xử lý):** Ticket `resolved`/`dismissed` rời danh sách "Đang mở", hiện trong lọc "Đã xử lý" với kết quả và thời điểm đóng.

### E8-S4 — Hành động moderator
- **AC-30 (Happy — S5-Demo-2):** GIVEN ticket P0 về sự kiện E của B, E có 3 người RSVP WHEN M chọn "Gỡ sự kiện", lý do `scam`, ghi chú ≥ 20 ký tự THEN E `status = taken_down`; request kế tiếp của người thứ ba: E vắng khỏi `GET /events`, `GET /events/E` → **404**, `POST .../rsvps` → từ chối; B vẫn thấy E với nhãn "Đã bị gỡ"; 3 RSVP giữ nguyên dòng và người RSVP thấy "Sự kiện này không còn khả dụng" trong my-events; ticket `resolved`.
- **AC-31 (Happy):** M ẩn bài đăng / bình luận → `status = hidden`; biến khỏi feed/danh sách của mọi người trừ tác giả (thấy nhãn đã bị ẩn) và staff; tác giả `PATCH` nội dung đó → **409**. M khôi phục → `visible`, hiện lại; bản ghi hành động ẩn ban đầu **không** bị sửa, có thêm một dòng khôi phục.
- **AC-32 (Happy):** M tạm gỡ sự kiện → `suspended`, hiệu lực hiển thị như AC-30; M khôi phục → `published`. Với sự kiện `taken_down`: M khôi phục → **403**; AD khôi phục → **200**, `published`.
- **AC-33 (Happy):** M khoá B 7 ngày → B `status = suspended`, `suspended_until` = +7 ngày; B đăng nhập hoặc refresh → **403 `ACCOUNT_NOT_ACTIVE`** / `errors.auth.accountSuspended`; mọi phiên refresh của B bị thu hồi. M mở khoá sớm → B đăng nhập lại được ngay.
- **AC-34 (Edge — hết hạn):** GIVEN B bị khoá tới T WHEN sau T B đăng nhập THEN thành công, không cần staff; có dòng hành động + audit với actor = hệ thống.
- **AC-35 (Quyền khoá):** M khoá > 30 ngày → **400/403**; M khoá tài khoản `curator`/`moderator`/`admin` → **403**; AD khoá `admin`/`super_admin` → **403**; bất kỳ ai tự khoá mình → **403**; SA khoá AD → **200**.
- **AC-36 (Error — lý do):** Thiếu mã lý do hoặc ghi chú < 20 ký tự trên bất kỳ hành động nào → **400** kèm `messageKey`, trạng thái đối tượng không đổi, không có dòng `moderation_actions`/`audit_logs` mới.
- **AC-37 (Edge — đồng thời):** GIVEN M và M2 cùng xử lý một ticket đang mở THEN đúng một người thành công; người kia **409** (mã đề xuất `TICKET_ALREADY_CLOSED`); chỉ một hành động đóng ticket được ghi.
- **AC-38 (Bác report):** M bác ticket → `dismissed`, nội dung giữ nguyên, có dòng `no_action` với lý do + ghi chú.
- **AC-39 (Quyền):** Mọi endpoint `/api/v1/admin/moderation/*`: không token **401**, member **403**, curator **403** — chặn ở API, không chỉ ẩn nút.
- **AC-40 (Bất biến — S5-DoD-7, M4-4):** Truy vấn SQL `moderation_actions` sau AC-30..AC-38 cho mỗi hành động: actor, role actor, thời điểm, loại + id đối tượng, user bị áp dụng (nếu có), loại hành động, mã lý do, ghi chú. Không có endpoint sửa/xoá; `UPDATE`/`DELETE` bằng role ứng dụng trên bảng bị DB từ chối.
- **AC-41 (Riêng tư moderator):** GIVEN M xem lịch sử ticket có hành động của M2 THEN M không thấy danh tính M2 (hiện "Moderator"); AD/SA thấy đầy đủ.

### E9-S1 — Audit log
- **AC-42 (Audit):** Mỗi hành động thành công ở AC-25, AC-30..AC-34, AC-38 sinh **đúng một** dòng `audit_logs` có actor, role tại thời điểm, `action`, `entity_type`/`entity_id`, `before`/`after` chỉ gồm trường thay đổi và không chứa email/SĐT/nội dung, lý do, `request_id`, thời điểm (INV-2).
- **AC-43 (Nguyên tử):** GIVEN ghi audit lỗi (giả lập) WHEN M gỡ sự kiện THEN sự kiện **không** đổi trạng thái, không có dòng `moderation_actions`, M nhận lỗi có thể thử lại.
- **AC-44 (Quyền xem):** `GET /api/v1/admin/audit-logs`: không token **401**; member/curator **403** (không có mục menu); M chỉ nhận bản ghi có actor = M; AD nhận mọi bản ghi **trừ** actor role `super_admin`; SA nhận tất cả.
- **AC-45 (Viewer):** Trang Audit log lọc được theo khoảng thời gian, loại hành động, người thực hiện, loại đối tượng; mới nhất trước; phân trang cursor; không có nút sửa/xoá; API không có route PATCH/PUT/DELETE.
- **AC-46 (Phạm vi):** Member báo cáo hoặc chặn **không** sinh dòng `audit_logs`.

### Chung
- **AC-47 (i18n):** GIVEN UI ở `en` và `vi` WHEN mở sheet báo cáo (12 lý do, trấn an, khẩn cấp, xác nhận), luồng chặn, danh sách chặn, hàng đợi (ba trạng thái SLA, P0–P3), chi tiết ticket, các hộp thoại hành động, nhãn trạng thái nội dung/sự kiện bị ẩn/gỡ, trang Audit log, mọi lỗi mới THEN mọi chuỗi đúng ngôn ngữ, không lộ key thô; API trả lý do dạng key i18n; `en.json`/`vi.json` cập nhật cùng lúc.
- **AC-48 (Giờ):** Thời điểm trên hàng đợi/audit hiển thị theo `Asia/Ho_Chi_Minh`; đồng hồ đếm ngược tính từ hạn do server trả, không từ giờ máy client (đổi giờ máy client không đổi hạn).

## 14. Service bị ảnh hưởng

- **apps/api:** module report (tạo report, rate limit, idempotency, snapshot, gộp ticket), block (thuộc `modules/user`/profile theo doc 05 §13.8), moderation (hàng đợi, chi tiết, hành động, đổi mức), audit log (ghi + đọc); sửa event/post/comment/rsvp/chat/profile để áp bộ lọc chặn; sửa auth để xử lý hết hạn khoá + thu hồi phiên khi khoá; migration SQL mới cho `reports`, `blocks`, `moderation_actions`, `audit_logs` (+ bảng ticket nếu Tech Lead tách).
- **apps/web-client-side:** nút + sheet báo cáo ở 4 bề mặt; nút chặn; trang danh sách chặn; nhãn "đã bị ẩn/gỡ/không còn khả dụng" ở my-events, bài của tác giả, trang sự kiện của organizer.
- **apps/web-admin-side:** trang Moderation queue, chi tiết ticket + hộp thoại hành động, trang Audit log; sidebar theo `PERMISSION_MATRIX`.
- **apps/mobile:** không đổi.
- **packages/contracts:** loại đối tượng báo cáo (`event`, `post`, `comment`, `user`), 12 lý do, mức, trạng thái ticket, loại hành động, DTO request/response (không có trường người báo cáo ngoài DTO chi tiết ticket cho staff). Đây cũng là handoff "TV1 → TV3 loại đối tượng bị báo cáo" trong checklist — review vẫn ngoài phạm vi.
- **packages/domain:** khoá quyền mới trong `PERMISSION_MATRIX`; bảng lý do → mức; bảng SLA + ngưỡng cảnh báo (framework-free, có test, như `trust.ts`).
- **packages/i18n:** namespace `safety.report.*`, `safety.block.*`, `moderation.*`, `admin.audit.*`, `errors.report.*`, `errors.moderation.*`.

## 15. Hợp đồng API/dữ liệu (ngôn ngữ nghiệp vụ — Tech Lead chốt tên)

- Tạo report: người gọi, loại + id đối tượng, lý do (12 key), mô tả tuỳ chọn, cờ "chặn luôn"; bắt buộc Idempotency-Key. Response cho người báo cáo chỉ gồm id report, trạng thái "đã nhận", thời điểm — không có mức, không có thông tin ticket.
- Chặn / bỏ chặn: `POST` / `DELETE /api/v1/users/{userId}/block` → 204; `GET /api/v1/me/blocks` trả tên hiển thị + avatar + thời điểm chặn (doc 05 §13.10).
- Hàng đợi: danh sách ticket có mức, hạn SLA (thời điểm tuyệt đối từ server), thời điểm report đầu, số report, loại đối tượng, tóm tắt đối tượng, trạng thái; lọc mức/trạng thái; cursor (BR-24).
- Hành động: loại hành động, đối tượng, ticket liên quan (tuỳ chọn), mã lý do, ghi chú ≥ 20 ký tự, ngày hết hạn (bắt buộc với khoá tài khoản).
- Lỗi dùng chung envelope `code` + `messageKey` + `details` như `ROLE_NOT_ALLOWED`/`TRUST_LEVEL_TOO_LOW`.

## 16. Ảnh hưởng trust_level / kiểm duyệt / report

- Báo cáo và chặn không có ngưỡng trust (Giả định BA #5, #8); rate limit báo cáo theo trust.
- v1 không đổi `trust_level` hay ghi `trust_signals` khi report được xác nhận (ngoài phạm vi; S5-DoD-5 của TV1 phụ thuộc bảng `moderation_actions` này).
- Nội dung mới do tính năng này tạo (mô tả report) không công khai, không bị báo cáo được.

## 17. Ảnh hưởng dữ liệu cá nhân

- **Dữ liệu mới thu thập:** mô tả report (có thể chứa thông tin nhạy cảm về người khác), snapshot nội dung bị báo cáo, danh sách chặn, ghi chú moderator.
- **Người báo cáo ẩn danh tuyệt đối:** danh tính người báo cáo chỉ staff có quyền hàng đợi (moderator/admin/super_admin) thấy; không bao giờ có trong response gửi cho người bị báo cáo hay người thứ ba; không có số report công khai.
- **Chặn là im lặng:** danh sách chặn chỉ chủ tài khoản thấy; không staff UI nào hiển thị danh sách chặn của member ở v1 (Giả định BA #15).
- **Danh tính moderator:** người bị xử lý và người báo cáo không bao giờ thấy ai xử lý (Đ31); moderator không thấy danh tính moderator khác; admin/super_admin thấy.
- **Audit:** không chứa email/SĐT/nội dung bài; không lưu IP/user agent ở v1.
- **Lưu trữ / xoá tài khoản:** report giữ nội dung case, ẩn danh người báo cáo khi họ xoá tài khoản; `moderation_actions`/`audit_logs` giữ vĩnh viễn dạng ẩn danh; chặn xoá cứng theo tài khoản (doc 05 §13.11). Thời hạn lưu cần luật sư xác nhận theo Luật 91/2025 (doc 05 §13.11) — không chặn v1 vì chưa có job xoá.

## 18. Thông báo

Không gửi thông báo nào ở v1 (E7 chưa có). Các điểm phải nối khi E7 xong: báo người đã RSVP khi sự kiện bị gỡ (`safety.notice.event_cancelled_safety`, push + email), báo người bị xử lý (`safety.notice.*`), báo người báo cáo (`safety.notice.report_resolved`), báo on-call khi có ticket P0 mới (TG-M4-2). Giờ gửi theo `Asia/Ho_Chi_Minh`; thông báo an toàn không tắt được.

## 19. Giả định BA (tổng hợp)

1. Lưu mã lý do cấp UI (12) trên report; mức khởi tạo = mức cao nhất trong nhóm enum doc 05.
2. SLA đồng hồ thật 24/7 cho cả 4 mức; P3 = 72 giờ theo checklist.
3. **Không** tự ẩn nội dung khi nhận report P0 (xử lý tay; tránh một report T0 bất kỳ gỡ được sự kiện của người khác) — lệch doc 05 §7.3, xem Q1.
4. Số đếm tổng (người tham gia, bình luận) không trừ phần bị chặn.
5. Chặn không cần trust level; không giới hạn số lượng.
6. Ticket có 3 trạng thái `open/resolved/dismissed`; SLA dừng khi rời `open`.
7. Ngưỡng "sắp quá hạn" = còn ≤ 25% thời lượng SLA.
8. Rate limit T0 = T1 (5 report/24 giờ).
9. Khoá tài khoản luôn có ngày hết hạn (kể cả admin); vĩnh viễn = `banned`, ngoài phạm vi.
10. Tác giả không sửa được nội dung đang bị ẩn (409); vẫn xoá mềm được.
11. RSVP của sự kiện bị gỡ giữ nguyên dòng; người RSVP thấy nhãn trung tính "không còn khả dụng".
12. Hành động lên nội dung/tài khoản của staff cần role cao hơn role của staff đó.
13. Audit không lưu IP/user agent ở v1.
14. Hành động bị từ chối không ghi audit ở v1.
15. Không có UI staff xem danh sách chặn của member.

## 20. Câu hỏi mở

Không có câu hỏi **chặn** việc bắt đầu — mọi điểm đã có mặc định ở §19. Cần Founder/Tech Lead xác nhận trước khi đóng M4:

- **Q1 (Founder, an toàn):** Giữ Giả định #3 (không tự ẩn khi P0) hay theo doc 05 "fail closed" (tự ẩn ngay khi có report `critical`)? Nếu tự ẩn, cần chống lạm dụng tối thiểu (vd chỉ tự ẩn khi ≥ 2 người báo cáo độc lập). Ảnh hưởng S5-Demo-1 không đổi.
- **Q2 (Founder):** Không có kênh báo P0 cho người trực (E7 chưa có) thì SLA 2 giờ chỉ giữ được nếu Founder mở console định kỳ. Chấp nhận tới khi có E7, hay TV3 làm tạm một email đơn giản cho P0 (TG-M4-2 ghi "cần TV3 làm trong L7")?
- **Q3 (Tech Lead):** `moderation_actions` + `audit_logs` là hai bảng riêng (BA đề xuất, theo doc 05 + doc 03) hay gộp? Có tách bảng ticket (`moderation_cases` tối giản) hay suy ticket từ `reports`?
- **Q4 (Tech Lead):** Cơ chế hết hạn khoá (job BullMQ `moderation:expire` hay kiểm khi đăng nhập/refresh), và có thêm kiểm trạng thái tài khoản per-request cho thao tác ghi không (cửa sổ 15 phút).
- **Q5 (Tech Lead):** Quan hệ giữa `conversations.request_status = 'blocked'` và bảng chặn mới — một nguồn sự thật.
- **Q6 (Tech Lead):** Mã lỗi đề xuất: `REPORT_SELF_NOT_ALLOWED` (422), `CONFLICT_OF_INTEREST` (403), `TICKET_ALREADY_CLOSED` (409), `CONTENT_UNDER_MODERATION` (409 khi sửa nội dung bị ẩn), `RATE_LIMITED` (429).
- **Q7 (PO):** Organizer có được huỷ RSVP của người mình đã chặn khỏi sự kiện của mình không? v1 giữ nguyên (doc 05 §13.7); host hiện không có thao tác gỡ attendee.
- **Q8 (Founder):** Chốt mâu thuẫn tài liệu ở smell #5 để cập nhật doc 05/doc 08 cho khớp bảng §5.

## Rủi ro BA ghi nhận

- Không tự ẩn P0 + không có kênh báo on-call → nội dung lừa đảo/đe doạ có thể còn hiển thị tới 2 giờ hoặc lâu hơn nếu không ai mở console.
- Access token 15 phút sau khi khoá; người bị khoá vì đe doạ còn ghi được dữ liệu trong cửa sổ đó.
- Bộ lọc chặn phải áp ở **mọi** truy vấn đọc (event, post, comment, reaction, rsvp, profile, chat) — sót một chỗ là lộ; Tester cần ma trận test hai chiều đầy đủ (AC-13).
- 3 SP cho E8-S3 là chặt nếu hàng đợi gồm cả gộp ticket + đổi mức + xung đột lợi ích; nếu phải cắt, cắt đổi mức (AC-25) trước, giữ SLA + sắp xếp + lọc.
