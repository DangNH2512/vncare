# Checklist M3 · RSVP + Waitlist + Thông báo

**Dự án:** Da Nang Connect — Giai đoạn 1 (MVP) · **Trạng thái chụp:** 19/09/2026 · **Ngày chốt:** 13/11/2026

**Bản sửa được:** `docs/checklists/checklist-milestone-M0-M6.xlsx` (mỗi phase một sheet, cột Trạng thái có danh sách chọn, sheet Tổng quan tự tính lại).

---

## 1. Cách đọc

**Trạng thái:**

- ✅ **Xong**: đã làm và có bằng chứng (test, ảnh, link).
- 🟡 **Một phần**: đã có code hoặc cấu hình nhưng còn thiếu phần ghi ở cột Ghi chú.
- ⬜ **Chưa làm**: chưa bắt đầu. Đây là mặc định cho các mục M2–M6 chưa được kiểm tra chi tiết.
- ⛔ **Bị chặn**: phải chờ việc khác xong (ghi ở cột Ghi chú).
- ❓ **Cần chốt**: cần quyết định của Founder, Product Owner, Tech Lead, BA hoặc luật sư trước khi làm.
- ⚪ **Chưa xác nhận**: việc ngoài repo (pháp lý, tài khoản, vận hành) chưa có bằng chứng; người phụ trách tự xác nhận.

**Nhóm việc trong mỗi phase:** Việc chặn & cần chốt → Story → DoD bổ sung → Nghiệm thu → Demo → Việc ngoài SP → Bổ sung từ mockup.

**Nguồn trạng thái:** M0–M1 lấy từ đợt kiểm tra code chỉ đọc ngày 18/09/2026 (có đối chứng độc lập). Các mục "Một phần" của M2–M3 lấy từ ghi chú phiên làm việc 01–02/09, **chưa kiểm chứng lại bằng code**. Story, DoD, demo và tiêu chí nghiệm thu lấy nguyên văn từ `docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md` §6–§7. Nhóm "Bổ sung từ mockup" là việc mới lộ ra từ bộ mockup web ngày 18–19/09 và quyết định của chủ dự án ngày 19/09.

<div class="pb"></div>

## 2. M3 · RSVP + Waitlist + Thông báo — chốt 13/11/2026

**Sprint:** S4 · **Tổng:** 40 mục · ✅ 0 · 🟡 4 · ⬜ 35 · ⛔ 0 · ❓ 1 · ⚪ 0 · **Tỷ lệ xong:** 0%

**Mục tiêu:**

- S4 — RSVP, Waitlist & Thông báo (02/11 – 13/11/2026): Hai trăm người bấm đăng ký cùng lúc vào một buổi có 50 chỗ thì đúng 50 người vào `going`, phần còn lại vào `waitlisted` theo thứ tự, và ai cũng nhận được thông báo đúng.

**Nếu trượt:** M3-3 (waitlist) là MUST của MVP, không được hoãn. Nếu tuần W09 kết thúc mà E6-S3 chưa xong, cắt ngay E5-S7 khỏi S4 và dồn toàn bộ nhánh backend vào RSVP. Nấc M2+ lùi sang S5.

### 2.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | DEC-MYEVENTS | Gộp W-40 / W-44 / W-46 thành một màn "Sự kiện của tôi" dạng agenda; cập nhật doc 10. | BA + Tech Lead | <span class="nw">❓ Cần chốt</span> | — |

### 2.2. Story

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | E6-S1 | Mô hình `rsvps` gắn vào `event_occurrences`, có sức chứa + danh sách chờ (8 SP) · MUST | Backend | <span class="nw">🟡 Một phần</span> | Module rsvp + schema event_occurrences có. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E6-S2 | Đăng ký / rút đăng ký, không bao giờ vượt sức chứa (8 SP) · MUST | Backend | <span class="nw">🟡 Một phần</span> | Giữ chỗ dưới row lock, không vượt sức chứa. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E6-S3 | Đôn tự động từ danh sách chờ khi có người rút — MUST của MVP (5 SP) · MUST | Backend | <span class="nw">🟡 Một phần</span> | Huỷ chỗ đôn người đầu hàng chờ trong cùng transaction nhưng chuyển thẳng "confirmed", chưa giữ chỗ 12 giờ, chưa thông báo (T-16). |
| ☐ | E6-S7 | Nút đăng ký trên trang chi tiết web, hiện số chỗ còn lại (5 SP) · MUST | Web | <span class="nw">🟡 Một phần</span> | Nút Join/Waitlist trên card và /events/[id] có. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E7-S1 | Hàng đợi BullMQ + worker riêng + retry theo cấp số nhân (5 SP) · MUST | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E7-S2 | Dịch vụ thông báo, template song ngữ EN/VI theo ngôn ngữ người nhận (8 SP) · MUST | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E7-S3 | Expo Push tới thiết bị thật (8 SP) · MUST | Backend + Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E7-S4 | Email xác nhận RSVP + email nhắc (5 SP) · MUST | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E7-S8 | Nhắc T‑24h và T‑2h (5 SP) · MUST | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S7 | Feed khám phá mobile + bảng lọc kéo lên (nấc M2+) (13 SP) · MUST | Mobile | <span class="nw">⬜ Chưa làm</span> | — |

### 2.3. DoD bổ sung

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S4-DoD-1 | Bảng `rsvps` có cột `occurrence_id` tham chiếu `event_occurrences(id)`. Không có cột `event_id` trong `rsvps` — kiểm tra bằng test đọc `information_schema.columns` | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-2 | `UNIQUE (occurrence_id, user_id)` | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-3 | `rsvps.status` là enum chữ thường: `going`, `waitlisted`, `cancelled`, `checked_in`, `no_show` | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-4 | Nhận chỗ dùng `SELECT ... FOR UPDATE` trên hàng `event_occurrences`, tính cả `guest_count`; `going_count` / `waitlist_count` cập nhật trong cùng transaction | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-5 | Test tải bắt buộc: 200 request đồng thời vào occurrence có `capacity = 50` → đúng 50 `going`, 150 `waitlisted`, thứ tự `position` liên tục 1..150, không có lỗ. Chạy 3 lần liên tiếp đều cho kết quả như nhau | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-6 | Test đôn waitlist: người thứ 12 rút → người `position = 1` chuyển sang `going`, `position` của phần còn lại dồn lên, người được đôn nhận push + email + in-app trong ≤ 60 giây | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-7 | Endpoint chính hoạt động: `POST /api/v1/occurrences/{occurrenceId}/rsvps`, `DELETE /api/v1/occurrences/{occurrenceId}/rsvps/me`, `GET /api/v1/occurrences/{occurrenceId}/attendees` | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-8 | Đường tắt `POST /api/v1/events/{eventId}/rsvps` trỏ tới occurrence sắp diễn ra gần nhất; có test khẳng định trả 409 khi event có nhiều hơn một occurrence sắp tới | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-9 | Nhắc T‑24h và T‑2h chạy đúng theo giờ địa phương `Asia/Ho_Chi_Minh` của sự kiện; có test cho sự kiện lúc 07:00 sáng (nhắc T‑24h rơi vào 07:00 hôm trước, T‑2h rơi vào 05:00 — kiểm tra không bị đẩy sang khung giờ cấm) | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-10 | Job nhắc chống gửi trùng: chạy lại worker 3 lần không tạo thêm bản ghi gửi nào (khoá idempotency theo `rsvp_id + reminder_type`) | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-11 | Không đăng ký được vào sự kiện đã bắt đầu hoặc đã `cancelled` → 422 có mã lỗi rõ | — | <span class="nw">⬜ Chưa làm</span> | — |

### 2.4. Nghiệm thu

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | M3-1 | `rsvps` gắn vào `occurrence_id`; bảng không có cột `event_id` | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test đọc `information_schema` |
| ☐ | M3-2 | 200 RSVP đồng thời vào 50 chỗ → đúng 50 `going`, 150 `waitlisted`, `position` liên tục, lặp 3 lần đều đúng | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo k6 |
| ☐ | M3-3 | Waitlist đôn tự động khi có người rút; người được đôn nhận push + email + in-app trong ≤ 60 giây. Story E6-S3 phải xong trước 06/11/2026 | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video + log job |
| ☐ | M3-4 | `POST /api/v1/occurrences/{occurrenceId}/rsvps` là endpoint chính | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Swagger + test |
| ☐ | M3-5 | `POST /api/v1/events/{eventId}/rsvps` trỏ tới occurrence sắp tới gần nhất và trả 409 khi có nhiều occurrence sắp tới | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test e2e |
| ☐ | M3-6 | Push tới thiết bị thật (iOS + Android), không phải simulator | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video 2 máy |
| ☐ | M3-7 | Email xác nhận gửi đúng ngôn ngữ người nhận (EN mặc định, VI nếu chọn) | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: 2 ảnh hộp thư |
| ☐ | M3-8 | Nhắc T‑24h và T‑2h bắn đúng giờ địa phương `Asia/Ho_Chi_Minh`, chống gửi trùng khi chạy lại worker | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Log + test idempotency |
| ☐ | M3-9 | Enum `rsvps.status` chữ thường: `going`, `waitlisted`, `cancelled`, `checked_in`, `no_show` | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Migration |

### 2.5. Demo

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S4-Demo-1 | Chạy script k6 ngay trên màn hình: 200 RSVP đồng thời vào 50 chỗ → bảng kết quả 50/150 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-Demo-2 | Trên iPhone thật: rút đăng ký của một người đang `going` → điện thoại người đứng đầu danh sách chờ rung ngay tại chỗ với thông báo "You're in!" | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-Demo-3 | Kiểm tra hộp thư: email xác nhận tiếng Anh cho tài khoản `en`, tiếng Việt cho tài khoản `vi` | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-Demo-4 | Chỉnh giờ máy chủ staging để mô phỏng mốc T‑24h và T‑2h → hai đợt nhắc bắn đúng, không trùng | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-Demo-5 | Feed khám phá trên mobile, kéo bảng lọc lên, lọc theo khu vực | — | <span class="nw">⬜ Chưa làm</span> | — |

### 2.6. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | MK-MY-01 | "Sự kiện của tôi": thẻ Next up (đếm ngược, địa chỉ chính xác, chỉ đường, QR điểm danh, chat nhóm), dải tuần, chip lọc, timeline, khối Past nhắc review; GET /me/agenda. | Web + Backend | <span class="nw">⬜ Chưa làm</span> | Route /my-events hiện là BlankScreen. |
| ☐ | MK-MY-02 | Lời mời từ hàng chờ giữ chỗ 12 giờ (held + hold_expires_at) + thông báo (T-16). | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-MY-03 | Đồng bộ lịch cá nhân (.ics feed) + cảnh báo huỷ muộn khi còn < 2 giờ (BR-10). | Web + Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-RSVP-01 | Sheet xác nhận RSVP bắt buộc với sự kiện có phí, ≤ 10 chỗ (cổng T2), bắt đầu trong < 2 giờ, nhận lời mời hàng chờ. | Web + Mobile | <span class="nw">⬜ Chưa làm</span> | — |

