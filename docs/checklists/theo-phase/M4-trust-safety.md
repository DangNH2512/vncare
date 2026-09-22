# Checklist M4 · Trust & Safety tối thiểu

**Dự án:** Da Nang Connect — Giai đoạn 1 (MVP) · **Trạng thái chụp:** 19/09/2026 · **Ngày chốt:** 25/12/2026

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

## 2. M4 · Trust & Safety tối thiểu — chốt 25/12/2026

**Sprint:** L7 · **Tổng:** 40 mục · ✅ 0 · 🟡 0 · ⬜ 35 · ⛔ 0 · ❓ 2 · ⚪ 0 · ✂️ 3 · **Tỷ lệ xong:** 0%

**Mục tiêu:**

- L7 — 14/12 – 25/12/2026: Trust & Safety: report, block, xử lý kiểm duyệt, trust level T0–T3 tự động

**Nếu trượt:** M4-8 và M4-9 là điều kiện chặn cứng để mở beta — không có chính sách đã thẩm định thì không được thu thập dữ liệu của 100 người thật. Nếu luật sư chưa xác nhận kịp, lùi ngày mời beta wave 1 chứ không mở beta bằng bản thảo chưa thẩm định. Tinh gọn: beta kín còn 60 người, mở ở L10 (15/02/2027); M4-8 và M4-9 vẫn là điều kiện chặn cứng, luật sư xác nhận trễ thì lùi mời beta wave 1 và M5 (26/02/2027) trượt theo. Story M4 trượt khỏi L7 thì không có chỗ đệm: sau 25/12 là tuần đóng băng 28/12 – 01/01, rồi L8 đã kín 28 SP cho Admin Curation Console (NT-1, không cắt).

### 2.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | DEC-REVIEWS | Reviews (UC-16, đang Should) có vào MVP không; cửa sổ đánh giá 7 ngày (doc 05) hay 14 ngày (doc 03). | Founder | <span class="nw">❓ Cần chốt</span> | Tinh gọn: Backlog tinh gọn 359 SP không có Reviews; nếu đưa vào MVP phải chỉ rõ story bị đẩy ra để giữ 28 SP/sprint |
| ☐ | DEC-TRUST-LABELS | Thống nhất nhãn trust T0–T5: code i18n (Restricted / New member / Verified / Regular / Trusted / Community host) với doc 05 §5.3 (New / Email verified / Phone verified / Active member / Trusted / Community leader); doc 10 §12.6 còn thang cũ. | Founder + Dev 1 | <span class="nw">❓ Cần chốt</span> | Liên quan nghiệm thu M4-5, M4-6. Tinh gọn: Thang T0–T5 không được đổi dù E3-S3 bị rút gọn |

### 2.2. Story

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | E8-S1 | Báo cáo hoạt động / người dùng (5 SP) · MUST | Dev 1 + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Dev 2 làm nút báo cáo và chọn lý do trên web/PWA, thay cho app native |
| ☐ | E8-S2 | Chặn người dùng (5 SP) · MUST | Dev 1 + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Dev 2 làm thao tác chặn trên web/PWA; API chặn hai chiều do Dev 1 |
| ☐ | E8-S3 | Hàng đợi kiểm duyệt xếp theo mức nghiêm trọng + thời gian chờ (3 SP) · MUST | Dev 2 + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nhóm B rút gọn 8 → 3 SP: bảng report lọc theo mức, xử lý tay; SLA P0 = 2 giờ vẫn giữ, do Founder trực |
| ☐ | E8-S4 | Ẩn nội dung / gỡ hoạt động / khoá tài khoản, có ghi lý do & người thực hiện (5 SP) · MUST | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E8-S5 | Community Guidelines + màn đồng ý trước khi tham gia (3 SP) · MUST | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Founder soạn nội dung Guidelines; Dev 2 dựng màn đồng ý trên web/PWA |
| ☐ | E8-S8 | Nhãn "Verified organizer" (3 SP) · SHOULD | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nhóm C, vẫn trong phạm vi; chỉ hoãn nếu phải giữ ngày 18/03/2027 |
| ☐ | E3-S3 | Trust level T0–T5 trên hồ sơ, tính bằng job BullMQ (5 SP) · MUST | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Giữ nguyên thang T0–T5; job chỉ tự tính T0–T3, còn T4 và T5 do Founder gán tay hằng tuần |
| ☐ | E7-S6 | Trung tâm thông báo trong app và trên web (8 SP) · SHOULD | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Hoãn sau ra mắt; dùng email + Web Push, email là bản lưu thông báo cũ |
| ☐ | E9-S1 | Khu vực quản trị riêng, đăng nhập tách biệt, audit log (5 SP) · MUST | Dev 2 + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: §10.4 tính E9-S1 vào L8 (E9 tinh gọn 5 + 8 + 8 + 5 + 2 = 28 SP, vừa khít L8), nhưng bảng report E8-S3 ở L7 cần khu admin có đăng nhập riêng + audit log; tạm giữ ở M4/L7, chờ Founder + Dev 1 chốt (xem conflicts) |
| ☐ | E4-S7 | Tạo hoạt động trên mobile dưới 90 giây (nấc M2++) (13 SP) · MUST | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Hoãn app native; mất thông điệp 90 giây, bù bằng form web tối ưu điện thoại (Dev 2) |

### 2.3. DoD bổ sung

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S5-DoD-1 | `users.trust_level` không bao giờ được ghi trực tiếp bởi luồng nghiệp vụ. Mọi thay đổi đều do job BullMQ `trust-level-recompute` thực hiện; có test khẳng định service RSVP và service auth không có quyền `UPDATE` cột này | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Việc Founder gán tay T4/T5 cũng phải ghi thành tín hiệu rồi để job ghi bậc, không UPDATE thẳng cột |
| ☐ | S5-DoD-2 | `trust-level-recompute` chạy mỗi giờ và chạy ngay sau mỗi `report_upheld`; đọc toàn bộ `trust_signals` của user rồi ghi lại bậc | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Job chỉ tự xét T0–T3; T4–T5 lấy từ tín hiệu gán tay hằng tuần của Founder |
| ☐ | S5-DoD-3 | Grep toàn repo không còn dấu vết thang cũ: `grep -rniE "trust_score\|reputation_score\|verified_member\|established\|ambassador"` phải rỗng. Không tồn tại bất kỳ thang điểm 0–100 nào | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-4 | Nhãn hiển thị đúng 6 chuỗi i18n: `T0 New`, `T1 Email verified`, `T2 Phone verified`, `T3 Active member`, `T4 Trusted`, `T5 Community leader` | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Dev 2 nạp khoá en + vi; bản VI chuẩn do Thuê ngoài: Dịch giả, nạp ở L11 |
| ☐ | S5-DoD-5 | Tín hiệu âm (`no_show_recorded`, `report_upheld`) chỉ moderator thấy; người dùng thường gọi API hồ sơ người khác không nhận được các trường này — có test 2 vai trò | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-6 | Hàng đợi kiểm duyệt tính thời gian còn lại của SLA theo bảng ở §5.9: P0 = 2 giờ, P1 = 12 giờ, P2 = 48 giờ, P3 = 72 giờ. Ticket sắp quá hạn nhuộm màu cảnh báo | Dev 2 + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Áp lên bảng report rút gọn của E8-S3; vẫn đủ 4 mức SLA, Founder trực P0 |
| ☐ | S5-DoD-7 | Mọi hành động moderator ghi vào `moderation_actions` bất biến: ai, lúc nào, đối tượng nào, lý do gì, hành động gì | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-8 | Chặn hai chiều: A chặn B thì B không thấy nội dung của A, không RSVP vào sự kiện của A, không nhắn được cho A — test cả hai chiều | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-9 | Community Guidelines song ngữ đã đăng ở URL công khai, có phiên bản và ngày hiệu lực | Founder + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Founder soạn nội dung; bản VI lấy trước từ gói dịch giả thuê ngoài (TG-M4-3); Dev 2 đăng trang |

### 2.4. Nghiệm thu

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | M4-1 | Báo cáo hoạt động và báo cáo người dùng đều hoạt động, có phân loại lý do | Dev 1 + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video. Tinh gọn: Quay video trên web/PWA; Founder là người thứ hai xác nhận thay QA (DoD-9 chung ở §6.1, không phải S5-DoD-9) |
| ☐ | M4-2 | Chặn người dùng có hiệu lực hai chiều | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test 2 tài khoản |
| ☐ | M4-3 | Hàng đợi kiểm duyệt xếp theo mức nghiêm trọng và thời gian chờ; SLA P0 = 2 giờ hiển thị đồng hồ đếm ngược | Dev 2 + Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh giao diện. Tinh gọn: Nghiệm thu trên bảng report rút gọn (E8-S3 còn 3 SP): vẫn xếp theo mức + thời gian chờ, đếm ngược P0 2 giờ |
| ☐ | M4-4 | Ẩn nội dung / gỡ hoạt động / khoá tài khoản đều ghi `moderation_actions` bất biến (ai, lúc nào, lý do) | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn SQL |
| ☐ | M4-5 | Trust level T0–T5 hiển thị trên hồ sơ với đúng 6 nhãn quy định; tính bằng job `trust-level-recompute` | Dev 1 + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh 6 hồ sơ mẫu. Tinh gọn: T0–T3 do job tự tính; hai hồ sơ mẫu T4 và T5 dựng từ tín hiệu Founder gán tay |
| ☐ | M4-6 | Không tồn tại thang điểm 0–100 hay enum `new/verified/established/trusted/ambassador` trong repo | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Kết quả grep |
| ☐ | M4-7 | Tín hiệu âm chỉ moderator thấy; người dùng thường không đọc được qua API | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test 2 vai trò |
| ☐ | M4-8 | Community Guidelines và Privacy Policy đã công bố ở URL công khai, song ngữ, có phiên bản và ngày hiệu lực | Founder + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Link công khai. Tinh gọn: Vẫn là điều kiện chặn beta 60 người ở L10 (15/02/2027); bản VI Guidelines đặt dịch giả thuê ngoài làm trước (TG-M4-3); bản VI Privacy Policy không thuộc gói dịch giả (chuỗi UI + 3 trang nội dung) nên đi theo gói pháp lý M4-9 |
| ☐ | M4-9 | Privacy Policy soạn theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 (hiệu lực từ 01/01/2026), có tham chiếu Nghị định 13/2023/NĐ-CP ở phần lịch sử. CẦN LUẬT SƯ XÁC NHẬN trước khi công bố | Founder + Luật sư | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Thư xác nhận của luật sư. Tinh gọn: Gói pháp lý rút gọn 55 triệu: Founder soạn bản thảo mẫu, luật sư chỉ rà soát và ký xác nhận; vẫn theo Luật 91/2025 |

### 2.5. Demo

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S5-Demo-1 | Tài khoản A báo cáo sự kiện của B với lý do "lừa đảo" → ticket vào hàng đợi mức P0, đồng hồ SLA 2 giờ bắt đầu chạy | Dev 1 + Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Báo cáo gửi từ web/PWA; ticket P0 hiện trên bảng report rút gọn, Founder là người trực nhận |
| ☐ | S5-Demo-2 | Moderator gỡ sự kiện, ghi lý do → sự kiện biến khỏi khám phá ngay, người đã RSVP nhận thông báo huỷ | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Thông báo huỷ đi qua email + Web Push, không còn Expo Push hay trung tâm thông báo |
| ☐ | S5-Demo-3 | Chạy `report_upheld` cho B → job recompute chạy ngay, `trust_level` của B tụt về T2, nhãn trên hồ sơ đổi ngay | Dev 1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-Demo-4 | Tài khoản C xác minh số điện thoại bằng OTP → lên T2 (tính năng OTP giao ở S6, demo bằng seed tín hiệu) | Dev 1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: OTP dùng nhà cung cấp có sẵn (E3-S6 còn 2 SP), chưa có ở L7 nên vẫn demo bằng seed tín hiệu |
| ☐ | S5-Demo-5 | Trên iPhone thật, bấm đồng hồ: tạo một hoạt động từ màn hình chính tới lúc đăng — dưới 90 giây | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Hoãn cùng E4-S7 (không có app native); thông điệp 90 giây bị mất, bù bằng form web tối ưu điện thoại |

### 2.6. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | MK-REV-01 | Bảng reviews (chỉ người đã check-in, double-blind, kiểm duyệt qua hàng đợi) + POST /occurrences/{id}/reviews, GET /users/{handle}/reviews. | Dev 1 | <span class="nw">⬜ Chưa làm</span> | DDL đầy đủ ở doc 03 §8.5. Tinh gọn: Chờ DEC-REVIEWS; không có trong backlog tinh gọn 359 SP nên chưa xếp sprint L |
| ☐ | MK-REV-02 | Khối Reviews trên trang chi tiết (điểm, phân bố sao, "Verified attendee", Helpful, Report) + màn viết review. | Dev 2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Chờ DEC-REVIEWS; không có trong backlog tinh gọn 359 SP nên chưa xếp sprint L |

### 2.7. Bổ sung kịch bản tinh gọn

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | TG-M4-1 | Founder gán tay T4 và T5 hằng tuần (T4: đã đạt T3 + host ≥ 3 occurrence hoàn tất + tỷ lệ no-show ≤ 15% trong 10 lần gần nhất; T5: đề cử thủ công, xét lại mỗi quý) bằng thao tác ghi tín hiệu, để job `trust-level-recompute` ghi bậc · MUST | Founder | <span class="nw">⬜ Chưa làm</span> | Dev 1 làm thao tác ghi tín hiệu trong E3-S3 (5 SP); Founder xét mỗi tuần khi đã có người dùng thật, §10.2 không đặt mốc dừng; cần chốt signal_type cho T4 (xem conflicts) |
| ☐ | TG-M4-2 | Founder nhận ca trực kiểm duyệt thay Community Manager (đủ đội: 09:00 và 17:00 hằng ngày, Founder ngoài giờ): chốt lịch trực và kênh nhận ticket P0 mới để giữ SLA P0 = 2 giờ, diễn tập cùng S5-Demo-1 · MUST | Founder | <span class="nw">⬜ Chưa làm</span> | Trực thật từ khi có người dùng beta (L10); trước đó chỉ có dữ liệu staging. Kênh báo ticket P0 mới tới Founder (email/Web Push) cần Dev 1 làm trong L7 |
| ☐ | TG-M4-3 | Đặt dịch giả thuê ngoài dịch trước bản tiếng Việt của trang Community Guidelines (thuộc gói 3 trang nội dung) để kịp S5-DoD-9 và M4-8 · MUST | Thuê ngoài: Dịch giả | <span class="nw">⬜ Chưa làm</span> | Founder ký hợp đồng dịch giả trọn gói 12 triệu ngay ở bước này (gói gồm cả chuỗi UI + About/FAQ gửi ở L10, TG-M5-10), đặt việc và duyệt nội dung. Dev 2 đăng trang song ngữ; chuỗi UI nạp ở L11 (E10-S2). Bản VI Privacy Policy không thuộc gói dịch giả mà đi theo M4-9 |

