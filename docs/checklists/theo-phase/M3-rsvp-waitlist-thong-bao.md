# Checklist M3 · RSVP + Waitlist + Thông báo

**Dự án:** Da Nang Connect — Giai đoạn 1 (MVP) · **Trạng thái chụp:** 19/09/2026 · **Ngày chốt:** 11/12/2026

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
- ✂️ **Cắt / hoãn**: ra khỏi phạm vi kịch bản tinh gọn (cắt nhóm A + B, doc 08 §10.2); giữ lại để truy vết, không tính vào tỷ lệ xong.

**Tỷ lệ xong** = Xong / (Tổng − Cắt / hoãn).

**Người phụ trách (đội tinh gọn, doc 08 §9.2):**

- **Founder**: PO, Community Manager, curate, trực kiểm duyệt, quan hệ organizer, pháp lý, tài khoản cửa hàng và D-U-N-S, ký xác nhận người thứ hai (DoD-9). Không viết code.
- **Dev 1**: Backend & Platform, kiêm Tech Lead — `apps/api`, PostGIS, BullMQ, hạ tầng, CI/CD, deploy, trực sự cố.
- **Dev 2**: Product & Web — `apps/web-client-side`, `apps/web-admin-side`, i18n, SEO, PWA, test E2E web.
- **Thuê ngoài**: Designer (trọn gói 4 tuần), QA (2 đợt), dịch giả tiếng Việt.
- Hai tên nối bằng "+" là việc chạm hai bề mặt; người đứng đầu chịu trách nhiệm chính.

**Nhóm việc trong mỗi phase:** Việc chặn & cần chốt → Story → DoD bổ sung → Nghiệm thu → Demo → Việc ngoài SP → Bổ sung từ mockup → Bổ sung kịch bản tinh gọn.

**Nguồn trạng thái:** M0–M1 lấy từ đợt kiểm tra code chỉ đọc ngày 18/09/2026 (có đối chứng độc lập). Các mục "Một phần" của M2–M3 lấy từ ghi chú phiên làm việc 01–02/09, **chưa kiểm chứng lại bằng code**. Story, DoD, demo và tiêu chí nghiệm thu lấy nguyên văn từ `docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md` §6–§7. Nhóm "Bổ sung từ mockup" là việc mới lộ ra từ bộ mockup web ngày 18–19/09 và quyết định của chủ dự án ngày 19/09. **Kịch bản đội:** CH-06 chốt ngày 19/09/2026 theo phương án tinh gọn 2 dev + Founder, cắt nhóm A + B (QĐ-77). Ngày chốt M2–M6, cột Sprint (L0–L12) và người phụ trách theo `08` §9.2 và §10.4; chữ của story, DoD, demo, nghiệm thu giữ nguyên văn, phần điều chỉnh tinh gọn ghi ở cột Ghi chú.

<div class="pb"></div>

## 2. M3 · RSVP + Waitlist + Thông báo — chốt 11/12/2026

**Sprint:** L5, L6 · **Tổng:** 40 mục · ✅ 0 · 🟡 4 · ⬜ 33 · ⛔ 0 · ❓ 1 · ⚪ 0 · ✂️ 2 · **Tỷ lệ xong:** 0%

**Mục tiêu:**

- L5 — 16/11 – 27/11/2026: RSVP + sức chứa + WAITLIST, hàng đợi BullMQ
- L6 — 30/11 – 11/12/2026: Dịch vụ thông báo, email, nhắc T‑24h và T‑2h, Web Push cho PWA

**Nếu trượt:** M3-3 (waitlist) là MUST của MVP, không được hoãn. Nếu tuần W09 kết thúc mà E6-S3 chưa xong, cắt ngay E5-S7 khỏi S4 và dồn toàn bộ nhánh backend vào RSVP. Nấc M2+ lùi sang S5. Tinh gọn: E5-S7 đã hoãn theo nhóm A nên không còn story mobile để cắt thay. Nếu hết L5 (27/11/2026) mà E6-S3 chưa xong thì dời MK-MY-01, MK-MY-02 và MK-MY-03 (đều cần backend của Dev 1: GET /me/agenda, giữ chỗ 12 giờ, .ics feed) ra khỏi M3 để Dev 1 dồn sức vào waitlist; MK-RSVP-01 chỉ là việc web của Dev 2 nên giữ lại. L6 còn trống khoảng 7 SP để nhận phần dời từ L5. Không dùng nhóm C để bù (chỉ dùng khi buộc giữ ngày 18/03/2027, 08:1558). Mốc M3 vẫn là 11/12/2026.

### 2.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | DEC-MYEVENTS | Gộp W-40 / W-44 / W-46 thành một màn "Sự kiện của tôi" dạng agenda; cập nhật doc 10. | Founder + Dev 1 | <span class="nw">❓ Cần chốt</span> | Tinh gọn: W-44 Đã lưu rơi khỏi phạm vi (E5-S10 hoãn); W-40 chỉ còn danh sách lọc theo host_user_id (E4-S10 rút gọn), nên màn gộp chủ yếu là W-46 cộng một danh sách tổ chức đơn giản |

### 2.2. Story

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | E6-S1 | Mô hình `rsvps` gắn vào `event_occurrences`, có sức chứa + danh sách chờ (8 SP) · MUST | L5 | Dev 1 | <span class="nw">🟡 Một phần</span> | Module rsvp + schema event_occurrences có. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E6-S2 | Đăng ký / rút đăng ký, không bao giờ vượt sức chứa (8 SP) · MUST | L5 | Dev 1 | <span class="nw">🟡 Một phần</span> | Giữ chỗ dưới row lock, không vượt sức chứa. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E6-S3 | Đôn tự động từ danh sách chờ khi có người rút — MUST của MVP (5 SP) · MUST | L5 | Dev 1 | <span class="nw">🟡 Một phần</span> | Huỷ chỗ đôn người đầu hàng chờ trong cùng transaction nhưng chuyển thẳng "confirmed", chưa giữ chỗ 12 giờ, chưa thông báo (T-16). Tinh gọn: mốc tinh gọn là xong trong L5, trước 27/11/2026 (thay mốc 06/11 của đủ đội); không bao giờ cắt |
| ☐ | E6-S7 | Nút đăng ký trên trang chi tiết web, hiện số chỗ còn lại (5 SP) · MUST | L5 | Dev 2 | <span class="nw">🟡 Một phần</span> | Nút Join/Waitlist trên card và /events/[id] có. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. Tinh gọn: số chỗ còn lại cập nhật bằng polling 30 giây khi trang đang mở. Đây là 2 SP còn lại của E7-S5 (CẮT WebSocket, 08:1597), nên tải thực của dòng này là 7 SP. Trang phải dùng tốt trên điện thoại vì không còn app native |
| ☐ | E7-S1 | Hàng đợi BullMQ + worker riêng + retry theo cấp số nhân (5 SP) · MUST | L5 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E7-S2 | Dịch vụ thông báo, template song ngữ EN/VI theo ngôn ngữ người nhận (8 SP) · MUST | L6 | Dev 1 + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: giữ song ngữ EN/VI 8 SP vì chỉ nhóm C mới rút gọn mục này. Dev 1 làm dịch vụ và chọn ngôn ngữ theo người nhận, Dev 2 đặt khoá template EN/VI trong packages/i18n. Bản VI viết tạm cùng lúc với bản EN, dịch giả thuê ngoài rà lại khi nạp bản dịch ở L11 |
| ☐ | E7-S3 | Expo Push tới thiết bị thật (3 SP) · MUST | L6 | Dev 1 + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: thay Expo Push bằng Web Push (VAPID) cho PWA. Dev 1 lưu subscription và gửi, Dev 2 làm client trong service worker. iOS ≥ 16.4 chỉ nhận được khi người dùng đã thêm app vào màn hình chính, nên muốn kiểm trên iPhone thì cần manifest tối thiểu ngay ở L6 (chờ Founder + Dev 1 chốt; phần còn lại của gói PWA vẫn ở L9). Tỷ lệ nhận thấp hơn native |
| ☐ | E7-S4 | Email xác nhận RSVP + email nhắc (5 SP) · MUST | L6 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: email là kênh chủ lực vì push trên PWA yếu hơn native; chừa sẵn link huỷ đăng ký trong footer cho bản rút gọn của E7-S7 |
| ☐ | E7-S8 | Nhắc T‑24h và T‑2h (5 SP) · MUST | L6 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: không bao giờ cắt; nhắc T‑2h chỉ đi qua push nên trên PWA chỉ tới người đã bật Web Push, nhắc T‑24h qua email là chủ lực |
| ☐ | E5-S7 | Feed khám phá mobile + bảng lọc kéo lên (nấc M2+) (13 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn theo nhóm A, không có repo mobile trong 7 tháng đầu; trên điện thoại dùng trang khám phá web (L4) và PWA (L9) của Dev 2; Founder giữ trong backlog sau ra mắt |

### 2.3. DoD bổ sung

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S4-DoD-1 | Bảng `rsvps` có cột `occurrence_id` tham chiếu `event_occurrences(id)`. Không có cột `event_id` trong `rsvps` — kiểm tra bằng test đọc `information_schema.columns` | L5 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-2 | `UNIQUE (occurrence_id, user_id)` | L5 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-3 | `rsvps.status` là enum chữ thường: `going`, `waitlisted`, `cancelled`, `checked_in`, `no_show` | L5 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-4 | Nhận chỗ dùng `SELECT ... FOR UPDATE` trên hàng `event_occurrences`, tính cả `guest_count`; `going_count` / `waitlist_count` cập nhật trong cùng transaction | L5 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-5 | Test tải bắt buộc: 200 request đồng thời vào occurrence có `capacity = 50` → đúng 50 `going`, 150 `waitlisted`, thứ tự `position` liên tục 1..150, không có lỗ. Chạy 3 lần liên tiếp đều cho kết quả như nhau | L5 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: không có QA thường trực nên Dev 1 tự viết và chạy k6; Dev 2 kiểm chéo kết quả |
| ☐ | S4-DoD-6 | Test đôn waitlist: người thứ 12 rút → người `position = 1` chuyển sang `going`, `position` của phần còn lại dồn lên, người được đôn nhận push + email + in-app trong ≤ 60 giây | L6 | Dev 1 + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: push là Web Push trên PWA; không còn trung tâm thông báo (E7-S6 hoãn) nên kênh in-app cần Founder + Dev 1 chốt cách hiểu |
| ☐ | S4-DoD-7 | Endpoint chính hoạt động: `POST /api/v1/occurrences/{occurrenceId}/rsvps`, `DELETE /api/v1/occurrences/{occurrenceId}/rsvps/me`, `GET /api/v1/occurrences/{occurrenceId}/attendees` | L5 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-8 | Đường tắt `POST /api/v1/events/{eventId}/rsvps` trỏ tới occurrence sắp diễn ra gần nhất; có test khẳng định trả 409 khi event có nhiều hơn một occurrence sắp tới | L5 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-9 | Nhắc T‑24h và T‑2h chạy đúng theo giờ địa phương `Asia/Ho_Chi_Minh` của sự kiện; có test cho sự kiện lúc 07:00 sáng (nhắc T‑24h rơi vào 07:00 hôm trước, T‑2h rơi vào 05:00 — kiểm tra không bị đẩy sang khung giờ cấm) | L6 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-10 | Job nhắc chống gửi trùng: chạy lại worker 3 lần không tạo thêm bản ghi gửi nào (khoá idempotency theo `rsvp_id + reminder_type`) | L6 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-11 | Không đăng ký được vào sự kiện đã bắt đầu hoặc đã `cancelled` → 422 có mã lỗi rõ | L5 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |

### 2.4. Nghiệm thu

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | M3-1 | `rsvps` gắn vào `occurrence_id`; bảng không có cột `event_id` |  | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test đọc `information_schema` |
| ☐ | M3-2 | 200 RSVP đồng thời vào 50 chỗ → đúng 50 `going`, 150 `waitlisted`, `position` liên tục, lặp 3 lần đều đúng |  | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo k6 |
| ☐ | M3-3 | Waitlist đôn tự động khi có người rút; người được đôn nhận push + email + in-app trong ≤ 60 giây. Story E6-S3 phải xong trước 06/11/2026 |  | Dev 1 + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video + log job. Tinh gọn: mốc 06/11/2026 trong câu chữ là của đủ đội; theo tinh gọn, E6-S3 xong trong L5 (trước 27/11/2026); push là Web Push trên PWA; kênh in-app không còn trung tâm thông báo, chờ Founder + Dev 1 chốt |
| ☐ | M3-4 | `POST /api/v1/occurrences/{occurrenceId}/rsvps` là endpoint chính |  | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Swagger + test |
| ☐ | M3-5 | `POST /api/v1/events/{eventId}/rsvps` trỏ tới occurrence sắp tới gần nhất và trả 409 khi có nhiều occurrence sắp tới |  | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test e2e |
| ☐ | M3-6 | Push tới thiết bị thật (iOS + Android), không phải simulator |  | Dev 2 + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video 2 máy. Tinh gọn: giữ tiêu chí nhưng chuyển sang Web Push trên PWA: một máy Android Chrome và một iPhone iOS ≥ 16.4 đã thêm app vào màn hình chính, vẫn quay video trên 2 máy thật. Phần iPhone cần manifest tối thiểu từ L6 (xem E7-S3) |
| ☐ | M3-7 | Email xác nhận gửi đúng ngôn ngữ người nhận (EN mặc định, VI nếu chọn) |  | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: 2 ảnh hộp thư. Tinh gọn: email tiếng Việt dùng bản VI tạm viết trong E7-S2. Bản dịch thuê ngoài chỉ nạp ở L11, nên câu chữ VI ở gate M3 chưa qua dịch giả |
| ☐ | M3-8 | Nhắc T‑24h và T‑2h bắn đúng giờ địa phương `Asia/Ho_Chi_Minh`, chống gửi trùng khi chạy lại worker |  | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Log + test idempotency |
| ☐ | M3-9 | Enum `rsvps.status` chữ thường: `going`, `waitlisted`, `cancelled`, `checked_in`, `no_show` |  | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Migration |

### 2.5. Demo

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S4-Demo-1 | Chạy script k6 ngay trên màn hình: 200 RSVP đồng thời vào 50 chỗ → bảng kết quả 50/150 | L5 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: có thể chiếu lại trong buổi gate M3 ngày 11/12/2026 |
| ☐ | S4-Demo-2 | Trên iPhone thật: rút đăng ký của một người đang `going` → điện thoại người đứng đầu danh sách chờ rung ngay tại chỗ với thông báo "You're in!" | L6 | Dev 2 + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: chạy trên PWA đã thêm vào màn hình chính của iPhone (iOS ≥ 16.4) và nhận Web Push thay Expo Push. Cần manifest tối thiểu từ L6 (xem E7-S3) |
| ☐ | S4-Demo-3 | Kiểm tra hộp thư: email xác nhận tiếng Anh cho tài khoản `en`, tiếng Việt cho tài khoản `vi` | L6 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: hộp thư VI dùng bản template VI tạm của E7-S2; dịch giả thuê ngoài rà lại ở L11 |
| ☐ | S4-Demo-4 | Chỉnh giờ máy chủ staging để mô phỏng mốc T‑24h và T‑2h → hai đợt nhắc bắn đúng, không trùng | L6 | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-Demo-5 | Feed khám phá trên mobile, kéo bảng lọc lên, lọc theo khu vực |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: bỏ theo E5-S7 (hoãn, nhóm A); khám phá trên điện thoại được demo qua trang khám phá web (M2) và PWA (L9) |

### 2.6. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | MK-MY-01 | "Sự kiện của tôi": thẻ Next up (đếm ngược, địa chỉ chính xác, chỉ đường, QR điểm danh, chat nhóm), dải tuần, chip lọc, timeline, khối Past nhắc review; GET /me/agenda. |  | Dev 2 + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Route /my-events hiện là BlankScreen. Tinh gọn: chỉ làm trên web/PWA, không có native; bỏ QR điểm danh khỏi thẻ Next up vì E6-S5 rút gọn thành tick tay |
| ☐ | MK-MY-02 | Lời mời từ hàng chờ giữ chỗ 12 giờ (held + hold_expires_at) + thông báo (T-16). |  | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: lời mời giữ chỗ gửi qua email (kênh chính) cộng Web Push; không có trung tâm thông báo để xem lại |
| ☐ | MK-MY-03 | Đồng bộ lịch cá nhân (.ics feed) + cảnh báo huỷ muộn khi còn < 2 giờ (BR-10). |  | Dev 2 + Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-RSVP-01 | Sheet xác nhận RSVP bắt buộc với sự kiện có phí, ≤ 10 chỗ (cổng T2), bắt đầu trong < 2 giờ, nhận lời mời hàng chờ. |  | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: chỉ làm trên web/PWA; nhánh mobile native hoãn |

