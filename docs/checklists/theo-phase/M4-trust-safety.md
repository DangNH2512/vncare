# Checklist M4 · Trust & Safety tối thiểu

**Dự án:** Da Nang Connect — Giai đoạn 1 (MVP) · **Trạng thái chụp:** 19/09/2026 · **Ngày chốt:** 27/11/2026

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

## 2. M4 · Trust & Safety tối thiểu — chốt 27/11/2026

**Sprint:** S5 · **Tổng:** 37 mục · ✅ 0 · 🟡 0 · ⬜ 35 · ⛔ 0 · ❓ 2 · ⚪ 0 · **Tỷ lệ xong:** 0%

**Mục tiêu:**

- S5 — Trust & Safety (16/11 – 27/11/2026): Một người dùng gặp nội dung xấu có đường báo cáo rõ ràng; moderator xử lý được trong SLA; và mọi hồ sơ đều hiển thị đúng bậc T0–T5.

**Nếu trượt:** M4-8 và M4-9 là điều kiện chặn cứng để mở beta — không có chính sách đã thẩm định thì không được thu thập dữ liệu của 100 người thật. Nếu luật sư chưa xác nhận kịp, lùi ngày mời beta wave 1 chứ không mở beta bằng bản thảo chưa thẩm định.

### 2.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | DEC-REVIEWS | Reviews (UC-16, đang Should) có vào MVP không; cửa sổ đánh giá 7 ngày (doc 05) hay 14 ngày (doc 03). | Product Owner | <span class="nw">❓ Cần chốt</span> | — |
| ☐ | DEC-TRUST-LABELS | Thống nhất nhãn trust T0–T5: code i18n (Restricted / New member / Verified / Regular / Trusted / Community host) với doc 05 §5.3 (New / Email verified / Phone verified / Active member / Trusted / Community leader); doc 10 §12.6 còn thang cũ. | BA + Tech Lead | <span class="nw">❓ Cần chốt</span> | Liên quan nghiệm thu M4-5, M4-6. |

### 2.2. Story

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | E8-S1 | Báo cáo hoạt động / người dùng (5 SP) · MUST | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E8-S2 | Chặn người dùng (5 SP) · MUST | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E8-S3 | Hàng đợi kiểm duyệt xếp theo mức nghiêm trọng + thời gian chờ (8 SP) · MUST | Backend + Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E8-S4 | Ẩn nội dung / gỡ hoạt động / khoá tài khoản, có ghi lý do & người thực hiện (5 SP) · MUST | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E8-S5 | Community Guidelines + màn đồng ý trước khi tham gia (3 SP) · MUST | Web + Product Owner | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E8-S8 | Nhãn "Verified organizer" (3 SP) · SHOULD | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E3-S3 | Trust level T0–T5 trên hồ sơ, tính bằng job BullMQ (8 SP) · MUST | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E7-S6 | Trung tâm thông báo trong app và trên web (8 SP) · SHOULD | Mobile + Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E9-S1 | Khu vực quản trị riêng, đăng nhập tách biệt, audit log (5 SP) · MUST | Web + Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E4-S7 | Tạo hoạt động trên mobile dưới 90 giây (nấc M2++) (13 SP) · MUST | Mobile | <span class="nw">⬜ Chưa làm</span> | — |

### 2.3. DoD bổ sung

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S5-DoD-1 | `users.trust_level` không bao giờ được ghi trực tiếp bởi luồng nghiệp vụ. Mọi thay đổi đều do job BullMQ `trust-level-recompute` thực hiện; có test khẳng định service RSVP và service auth không có quyền `UPDATE` cột này | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-2 | `trust-level-recompute` chạy mỗi giờ và chạy ngay sau mỗi `report_upheld`; đọc toàn bộ `trust_signals` của user rồi ghi lại bậc | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-3 | Grep toàn repo không còn dấu vết thang cũ: `grep -rniE "trust_score\|reputation_score\|verified_member\|established\|ambassador"` phải rỗng. Không tồn tại bất kỳ thang điểm 0–100 nào | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-4 | Nhãn hiển thị đúng 6 chuỗi i18n: `T0 New`, `T1 Email verified`, `T2 Phone verified`, `T3 Active member`, `T4 Trusted`, `T5 Community leader` | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-5 | Tín hiệu âm (`no_show_recorded`, `report_upheld`) chỉ moderator thấy; người dùng thường gọi API hồ sơ người khác không nhận được các trường này — có test 2 vai trò | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-6 | Hàng đợi kiểm duyệt tính thời gian còn lại của SLA theo bảng ở §5.9: P0 = 2 giờ, P1 = 12 giờ, P2 = 48 giờ, P3 = 72 giờ. Ticket sắp quá hạn nhuộm màu cảnh báo | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-7 | Mọi hành động moderator ghi vào `moderation_actions` bất biến: ai, lúc nào, đối tượng nào, lý do gì, hành động gì | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-8 | Chặn hai chiều: A chặn B thì B không thấy nội dung của A, không RSVP vào sự kiện của A, không nhắn được cho A — test cả hai chiều | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-9 | Community Guidelines song ngữ đã đăng ở URL công khai, có phiên bản và ngày hiệu lực | — | <span class="nw">⬜ Chưa làm</span> | — |

### 2.4. Nghiệm thu

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | M4-1 | Báo cáo hoạt động và báo cáo người dùng đều hoạt động, có phân loại lý do | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video |
| ☐ | M4-2 | Chặn người dùng có hiệu lực hai chiều | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test 2 tài khoản |
| ☐ | M4-3 | Hàng đợi kiểm duyệt xếp theo mức nghiêm trọng và thời gian chờ; SLA P0 = 2 giờ hiển thị đồng hồ đếm ngược | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh giao diện |
| ☐ | M4-4 | Ẩn nội dung / gỡ hoạt động / khoá tài khoản đều ghi `moderation_actions` bất biến (ai, lúc nào, lý do) | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn SQL |
| ☐ | M4-5 | Trust level T0–T5 hiển thị trên hồ sơ với đúng 6 nhãn quy định; tính bằng job `trust-level-recompute` | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh 6 hồ sơ mẫu |
| ☐ | M4-6 | Không tồn tại thang điểm 0–100 hay enum `new/verified/established/trusted/ambassador` trong repo | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Kết quả grep |
| ☐ | M4-7 | Tín hiệu âm chỉ moderator thấy; người dùng thường không đọc được qua API | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test 2 vai trò |
| ☐ | M4-8 | Community Guidelines và Privacy Policy đã công bố ở URL công khai, song ngữ, có phiên bản và ngày hiệu lực | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Link công khai |
| ☐ | M4-9 | Privacy Policy soạn theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 (hiệu lực từ 01/01/2026), có tham chiếu Nghị định 13/2023/NĐ-CP ở phần lịch sử. CẦN LUẬT SƯ XÁC NHẬN trước khi công bố | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Thư xác nhận của luật sư |

### 2.5. Demo

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S5-Demo-1 | Tài khoản A báo cáo sự kiện của B với lý do "lừa đảo" → ticket vào hàng đợi mức P0, đồng hồ SLA 2 giờ bắt đầu chạy | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-Demo-2 | Moderator gỡ sự kiện, ghi lý do → sự kiện biến khỏi khám phá ngay, người đã RSVP nhận thông báo huỷ | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-Demo-3 | Chạy `report_upheld` cho B → job recompute chạy ngay, `trust_level` của B tụt về T2, nhãn trên hồ sơ đổi ngay | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-Demo-4 | Tài khoản C xác minh số điện thoại bằng OTP → lên T2 (tính năng OTP giao ở S6, demo bằng seed tín hiệu) | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-Demo-5 | Trên iPhone thật, bấm đồng hồ: tạo một hoạt động từ màn hình chính tới lúc đăng — dưới 90 giây | — | <span class="nw">⬜ Chưa làm</span> | — |

### 2.6. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | MK-REV-01 | Bảng reviews (chỉ người đã check-in, double-blind, kiểm duyệt qua hàng đợi) + POST /occurrences/{id}/reviews, GET /users/{handle}/reviews. | Backend | <span class="nw">⬜ Chưa làm</span> | DDL đầy đủ ở doc 03 §8.5. |
| ☐ | MK-REV-02 | Khối Reviews trên trang chi tiết (điểm, phân bố sao, "Verified attendee", Helpful, Report) + màn viết review. | Web | <span class="nw">⬜ Chưa làm</span> | — |

