# Da Nang Connect — Kế hoạch triển khai theo tuần (12/10/2026 – 01/04/2027)

- **Giai đoạn**: 12/10/2026 → ra mắt 01/04/2027, kèm định hướng sau ra mắt
- **Ngày lập**: 12/10/2026
- **Dành cho**: TV1, TV2, TV3 và Founder (PO)
- **Căn cứ**: phân tích phỏng vấn khách hàng (doc 16), kế hoạch và lịch điều chỉnh (doc 17), kế hoạch lean QĐ-77, phân vai 60-20-20 QĐ-78, checklist M0–M6
- **Trạng thái**: bản đề xuất, **chờ Founder duyệt 7 quyết định ở mục 7 trước thứ Sáu 16/10**

---

## 1. Vì sao phải điều chỉnh

Ba video phỏng vấn ở Mỹ Khê và công viên Biển Đông, đối chiếu với số liệu thị trường, cho thấy:

- **Người hỏi đều là du khách ngắn ngày** (3 ngày, khoảng 2 tuần), không phải nomad ở lâu như phân khúc seed S1. Du khách cũng là nhóm đông nhất về lượng (khoảng 7,7 triệu lượt khách quốc tế trong 9 tháng 2026).
- **Họ tìm hoạt động qua GetYourGuide, Instagram, TikTok và hỏi tài xế Grab.** Không ai dùng nhóm Facebook.
- **Với họ, "hoạt động" là lễ hội, nhạc, tham quan, trekking.** Một người nói thẳng "Actually no" khi được hỏi có muốn giao lưu không.
- **Có nhu cầu "family-friendly"** từ một gia đình làm TikTok du lịch; Agoda xếp Đà Nẵng thứ 2 về điểm đến gia đình quốc tế.
- **Mẫu còn nhỏ và có thiên lệch**, nên chưa đổi hướng sản phẩm. Thay vào đó, đội thêm các hạng mục **rẻ nhưng phục vụ được nhiều nhóm khách cùng lúc**, và chạy nghiên cứu vòng 2 có cấu trúc.

**Định vị đề xuất: "expat-first, visitor-friendly".** Lớp cộng đồng (RSVP, trust, organizer) giữ nguyên cho người ở lâu. Lớp khám phá (trang sự kiện công khai, chia sẻ, bộ lọc) mở cho cả du khách mà không cần đăng ký.

---

## 2. Danh sách việc cần làm

### 2.1. Việc gấp trong tuần này (12–16/10)

| # | Việc | Người làm | Hạn |
|---|---|---|---|
| 1 | Founder duyệt 7 quyết định ở mục 7 | Founder | Thứ Sáu 16/10 |
| 2 | Re-baseline checklist: đối chiếu repo, trừ các story đã làm sau 24/09, đo velocity thật L1–L2 | TV1 (TV2, TV3 tự rà phần mình) | Thứ Sáu 16/10 |
| 3 | Bắt đầu đóng M1: xác minh email, đặt lại mật khẩu | TV1, TV2 | Xong toàn bộ M1 trước 30/10 |
| 4 | Vá bảo mật chat T-23 (người đã huỷ RSVP vẫn đọc/gửi được) | TV1 | Thứ Sáu 16/10 |
| 5 | Chuẩn bị nghiên cứu vòng 2: kịch bản, mic thu âm riêng, lịch hẹn ở coworking | Founder | Thứ Sáu 16/10 |
| 6 | Lập danh sách nguồn sự kiện để curate (lịch Danang FantastiCity, Danang 365, organizer quen) | TV3 | Thứ Sáu 16/10 |

### 2.2. Hạng mục mới rút ra từ phỏng vấn

| Mã | Việc | Người làm | SP | Tuần làm | Mốc |
|---|---|---|---|---|---|
| EV-SCHEMA | Thêm loại hình (category), nhãn đối tượng (`family_friendly`, `solo_friendly`), `alcohol_served`, ngôn ngữ, ảnh bìa vào sự kiện — migration `0014` | TV1 | 8 | Tuần 4–5 | M2 13/11 |
| EV-MANAGE | Màn sửa và huỷ sự kiện trên web | TV1 | 3 | Tuần 2–3 | M1 30/10 |
| DISC-PRESET | Lọc nhanh Tonight / Tomorrow / This weekend theo giờ Đà Nẵng | TV1 | 2 | Tuần 5 | M2 13/11 |
| FR12-NOTIFY | Huỷ sự kiện thì email báo cho mọi người đã RSVP hoặc đang chờ | TV1 | 5 | Tuần 9 | M3 11/12 |
| NFR06-PRIVACY | Khách chưa đăng nhập không thấy tên, ảnh, liên hệ người tham dự | TV1 (test API) + TV2 (kiểm giao diện) | 1 | Tuần 3–4 | M2 13/11 |
| PUBLIC-EVENT | Trang sự kiện render phía server, có ảnh preview khi dán link vào WhatsApp/Instagram/TikTok, nút Share | TV2 | 7 | Tuần 4–7 | M2 (bản đầu), hoàn thiện L5 |
| NFR05-MEASURE | Đo lượt xem của khách và nguồn link (có xin đồng ý, không lưu định danh) | TV3 (TV2 review consent) | 4 | Tuần 4–6 | L5 |

### 2.3. Việc không cần code

| Mã | Việc | Người làm | Hạn |
|---|---|---|---|
| RESEARCH-R2 | Nghiên cứu vòng 2: 24–30 buổi phỏng vấn (nomad 8, khách Hàn 4, người Việt 4, gia đình 4, organizer 4, du khách ngắn ngày 4) | Founder; TV1 hỗ trợ tổng hợp | 19/10 → 13/11 |
| SEED-FR06 | Curate ít nhất 5 sự kiện lễ hội/nhạc/trekking mỗi tuần | Founder + TV3 | Từ tuần 2, liên tục |
| BR05-PARTNER | Hợp tác Danang 365 seed nội dung | Founder | Hẹn trước 20/11, kịp Christmas Market 4–6/12 |
| BR-06 | Thông điệp "What's on in Da Nang" trên trang chủ và About | Founder | Tuần 4 |

### 2.4. Việc không làm thêm

- **Không đầu tư thêm** vào bản đồ, swipe, post, chat, follow, DM: đã xây nhưng chưa có bằng chứng khách cần. Riêng lỗ hổng T-23 vẫn phải vá.
- **Cắt mới khoảng 11 SP**: Web Push E7-S3 (email là kênh chính), OTP số điện thoại E3-S6, dashboard vận hành E9-S5 (thay bằng bảng số liệu NFR-05), phần "hiển thị thay đổi" khi sửa sự kiện, giao diện lọc theo ngôn ngữ (vẫn giữ dữ liệu).
- **Dời sau vòng 2**: giá và link vé, thêm vào lịch, gợi ý địa điểm, chương trình creator, giao diện tiếng Hàn/Trung.

---

## 3. Phân vai thành viên

Theo QĐ-78: mỗi người sở hữu trọn chức năng của mình (API, dữ liệu, màn hình, E2E). TV1 dùng AI nhận khoảng 60% khối lượng, TV2 và TV3 mỗi người khoảng 20%. Với 28 SP/sprint, mỗi sprint tương ứng khoảng **17 SP cho TV1, 5–6 SP cho TV2, 5–6 SP cho TV3**.

### 3.1. TV1 — Nền tảng, sự kiện, khám phá, RSVP, thông báo (kiêm Tech Lead)

- **Sở hữu**: hạ tầng, CI/CD, deploy, migration, RBAC và trust, sự kiện, khám phá, RSVP và waitlist, thông báo.
- **Việc mới**: EV-SCHEMA, EV-MANAGE, DISC-PRESET, FR12-NOTIFY, phần test API của NFR06-PRIVACY.
- **Ngoại lệ đề xuất**: TV1 nhận **xác minh email T-10** (vốn thuộc TV2) để M1 đóng kịp 30/10, vì TV2 đã kín việc với Google login và đặt lại mật khẩu.
- **Trách nhiệm Tech Lead**: chạy BASELINE, giữ hợp đồng API và dữ liệu, review chéo code của TV2 và TV3, giữ đường găng.
- **Rủi ro**: gần như cả đường găng nằm ở TV1 (bus factor bằng 1). Mọi việc không nằm trên đường găng đều đẩy sang TV2/TV3.

### 3.2. TV2 — Tài khoản, hồ sơ, i18n, PWA, SEO

- **Sở hữu**: đăng nhập, Google, đặt lại mật khẩu, phiên, hồ sơ và ảnh, ngôn ngữ EN/VI, tuỳ chọn thông báo, xuất/xoá dữ liệu, PWA, SEO.
- **Việc mới**: PUBLIC-EVENT (trang công khai + preview + Share), phần giao diện của NFR06-PRIVACY, review consent của NFR-05, toàn bộ key i18n mới (EN + VI).
- **Thứ tự**: xong phần M1 của mình (Google login, đặt lại mật khẩu, đếm ngược Retry-After) **trước** khi nhận PUBLIC-EVENT.

### 3.3. TV3 — Khu vực, kiểm duyệt, Admin Console, phễu phân tích

- **Sở hữu**: 6 khu vực MVP, báo cáo/chặn/hàng đợi kiểm duyệt, chống spam, Community Guidelines, Admin Console (curate, nhận quyền listing), phễu phân tích.
- **Việc mới**: NFR05-MEASURE (đo nguồn truy cập, bảng số liệu cho Founder), công cụ curate theo category, hỗ trợ seed nội dung.

### 3.4. Founder (PO) — không code, không tính vào tỉ lệ

- Duyệt quyết định; chạy nghiên cứu vòng 2; curate nội dung; làm đối tác Danang 365; tuyển 60 user beta; truyền thông ra mắt.

---

## 4. Các mốc chính

| Mốc | Ngày | Nội dung | Thay đổi so với kế hoạch cũ |
|---|---|---|---|
| M1 | **Thứ Sáu 30/10/2026** | API nền + Auth hoàn chỉnh | Dời từ 02/10 (đang quá hạn) |
| Đọc giữa kỳ vòng 2 | Thứ Sáu 30/10 | Chốt field cho migration `0014` | Mới |
| M2 | Thứ Sáu 13/11 | Tạo và khám phá sự kiện, có category/audience, preset thời gian, trang có preview | Thêm hạng mục mới |
| Báo cáo vòng 2 | Thứ Sáu 13/11 | 24–30 buổi phỏng vấn | Mới |
| Go/Pivot | Thứ Tư 18/11 | Quyết định phân khúc và persona dựa trên vòng 2 | Mới |
| M3 | Thứ Sáu 11/12 | RSVP + waitlist + thông báo, có email báo huỷ | Thêm FR-12 |
| M4 | Thứ Sáu 25/12 | Trust & Safety | Giữ nguyên |
| Go/No-go M5a | Thứ Sáu 29/01/2027 | Kiểm điều kiện mở trang công khai | Mới |
| **M5a** | **Thứ Hai 15/02/2027** | Mở trang sự kiện công khai (chỉ xem), đầu mùa nomad | Mới |
| M5 | Thứ Sáu 26/02 | Beta kín 60 user | Thêm số liệu nguồn truy cập |
| Checkpoint SP | Thứ Hai 08/03 | Thiếu hơn 10 SP thì dời M6 tối đa tới 15/04 | Mới |
| Soft-launch | Thứ Sáu 19/03 | Mời chọn lọc tại Da Nang Nomad Fest (19–28/3) | Mới |
| **M6** | **Thứ Năm 01/04/2027** | Ra mắt công khai | Giữ nguyên |

**Lịch nghỉ**: đóng băng cuối năm 28/12–01/01; đóng băng Tết 01–12/02 (mùng 1 Tết là 06/02). Trong hai đợt này chỉ trực lỗi P0.

---

## 5. Lịch theo tuần

### 5.1. Tổng quan

| Tuần | Ngày | Sprint | Mốc trong tuần |
|---|---|---|---|
| 1 | 12–16/10 | L2 (nửa sau) | Founder duyệt quyết định; re-baseline |
| 2 | 19–23/10 | L3 | Bắt đầu vòng 2 (19/10) |
| 3 | 26–30/10 | L3 | **M1** và đọc giữa kỳ (30/10) |
| 4 | 02–06/11 | L4 | Migration `0014` (cần PO duyệt) |
| 5 | 09–13/11 | L4 | **M2** và báo cáo vòng 2 (13/11) |
| 6 | 16–20/11 | L5 | **Go/Pivot** (18/11); hẹn Danang 365 (trước 20/11) |
| 7 | 23–27/11 | L5 | Seed sự kiện cho Christmas Market |
| 8 | 30/11–04/12 | L6 | Christmas Market (4–6/12) |
| 9 | 07–11/12 | L6 | **M3** (11/12) |
| 10 | 14–18/12 | L7 | Trust level tự động |
| 11 | 21–25/12 | L7 | **M4** (25/12) |
| — | 28/12–01/01 | Đóng băng | Trực P0; New Year Festival |
| 12 | 04–08/01 | L8 | Curation Console |
| 13 | 11–15/01 | L8 | Chuyển giao organizer |
| 14 | 18–22/01 | L9 | PWA, SEO sitemap |
| 15 | 25–29/01 | L9 | **Go/No-go M5a** (29/01) |
| — | 01–12/02 | Đóng băng Tết | Trực P0; tuyển 60 user beta |
| 16 | 15–19/02 | L10 | **M5a** (15/02); beta bắt đầu |
| 17 | 22–26/02 | L10 | **M5** (26/02) |
| 18 | 01–05/03 | L11 | Sửa lỗi beta, nạp bản dịch VI |
| 19 | 08–12/03 | L11 | **Checkpoint SP** (08/03) |
| 20 | 15–19/03 | L12 | **Soft-launch Nomad Fest** (19/03) |
| 21 | 22–26/03 | L12 | Chốt release candidate (26/03) |
| 22 | 29/03–02/04 | Tuần ra mắt | **M6** (01/04) |

### 5.2. Chi tiết từng tuần

#### Tuần 1 · 12–16/10 · L2 (nửa sau)

**Mốc**: Thứ Sáu 16/10 — Founder duyệt mục 7; re-baseline xong; T-23 vá xong.

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Re-baseline checklist và đo velocity; vá T-23; bắt đầu xác minh email T-10 (đăng ký cấp T0, xác minh xong lên T1); cập nhật checklist M1 (T-21) | Founder xác nhận con số SP mới; test T-23 xanh |
| TV2 | Đặt lại mật khẩu qua email (E2-S6); chuẩn bị bảng `social_accounts` cho Google login (cần PO duyệt schema) | Luồng quên mật khẩu chạy trên local |
| TV3 | Rà phần kiểm duyệt và admin đã làm so với checklist; chốt danh sách category dùng để seed; lập danh sách nguồn sự kiện | Danh sách category và nguồn gửi Founder |
| Founder | Duyệt 7 quyết định; chuẩn bị kịch bản vòng 2, mic, lịch hẹn | Quyết định ghi vào DECISIONS.md |

#### Tuần 2 · 19–23/10 · L3

**Mốc**: Thứ Hai 19/10 — bắt đầu phỏng vấn vòng 2.

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Hoàn tất T-10; bắt đầu EV-MANAGE (màn sửa và huỷ sự kiện) | Đăng ký mới nhận T0, xác minh lên T1, có test |
| TV2 | Google login (E2-S3); đếm ngược Retry-After trên form đăng nhập (T-20) | Đăng nhập Google chạy trên staging |
| TV3 | Curate đợt 1 (khoảng 10 sự kiện, có ghi nguồn) | Sự kiện hiển thị trên Discover |
| Founder | Phỏng vấn khoảng 6 buổi, ưu tiên nomad và gia đình | File ghi âm có tiếng, kiểm ngay sau buổi |

#### Tuần 3 · 26–30/10 · L3

**Mốc**: Thứ Sáu 30/10 — **đóng M1**; đọc kết quả giữa kỳ, chốt field cho migration `0014`.

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Hoàn tất EV-MANAGE; test API NFR-06 (khách gọi danh sách người tham dự nhận 401); soạn bản nháp migration `0014` | M1-1..8 đạt; test 401 xanh |
| TV2 | Hoàn thiện trạng thái lỗi màn đăng nhập/đăng ký (E2-S8); key i18n M1 đủ EN/VI | Nghiệm thu M1 phần tài khoản |
| TV3 | Curate tiếp; phác thảo danh sách sự kiện đo lường cho NFR-05 | Bản nháp sự kiện đo lường gửi TV1 và TV2 |
| Founder | Phỏng vấn khoảng 6 buổi; đọc giữa kỳ (khoảng 12 buổi) | Danh sách field schema được chốt |

#### Tuần 4 · 02–06/11 · L4

**Mốc**: Thứ Hai 02/11 — PO duyệt migration `0014` trước khi chạy.

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | EV-SCHEMA: migration `0014`, thêm field vào API tạo/sửa/trả về, lọc theo category và audience (gộp E5-S2) | Migration chạy và rollback được trên staging |
| TV2 | Kiểm giao diện NFR-06; bắt đầu PUBLIC-EVENT (tách trang thành server + client, metadata, ảnh preview mặc định) | Trang chi tiết có thẻ Open Graph |
| TV3 | Khung NFR-05; bảng tracking là migration `0015` (cần PO duyệt) | Thiết kế bảng được duyệt |
| Founder | Phỏng vấn khoảng 6 buổi; viết thông điệp "What's on in Da Nang" (BR-06) | Bản thông điệp gửi TV2 |

#### Tuần 5 · 09–13/11 · L4

**Mốc**: Thứ Sáu 13/11 — **M2**; báo cáo nghiên cứu vòng 2.

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Form tạo/sửa có field mới (EV-FORM-UI); DISC-PRESET (Tonight/Tomorrow/Weekend); chip lọc category/audience trên Discover | Test quanh nửa đêm và 17:30 giờ Đà Nẵng xanh |
| TV2 | Key i18n EN+VI cho category, audience, preset; tiếp PUBLIC-EVENT | Không còn key thiếu giữa `en.json` và `vi.json` |
| TV3 | Curate theo category; tiếp NFR-05 | Mỗi tuần ít nhất 5 sự kiện lễ hội/nhạc/trekking |
| Founder | Hoàn tất vòng 2 (24–30 buổi); viết báo cáo | Báo cáo vòng 2 gửi cả đội |

#### Tuần 6 · 16–20/11 · L5

**Mốc**: Thứ Tư 18/11 — **họp Go/Pivot**; Thứ Sáu 20/11 — hạn hẹn Danang 365.

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | RSVP + sức chứa + waitlist (phần còn lại E6-S1..S3, E6-S7); hàng đợi BullMQ (E7-S1) | RSVP đồng thời không vượt sức chứa |
| TV2 | Hoàn thiện PUBLIC-EVENT: ảnh bìa, nút Share, tham số `?src=` | Link dán vào WhatsApp hiện tiêu đề, ảnh, giờ |
| TV3 | Hoàn thiện NFR-05: ghi `guest_view` và nguồn link, banner xin đồng ý (TV2 review) | Từ chối theo dõi thì không ghi gì |
| Founder | Chủ trì Go/Pivot; hẹn Danang 365 | Biên bản Go/Pivot, ưu tiên backlog từ L5 |

#### Tuần 7 · 23–27/11 · L5

**Mốc**: Thứ Sáu 27/11 — đủ sự kiện seed cho Christmas Market.

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Hoàn tất RSVP/waitlist; chuẩn bị giữ chỗ 12 giờ khi được đôn từ hàng chờ (T-16) | Nghiệm thu RSVP phần lõi |
| TV2 | Kiểm preview thật trên WhatsApp, Instagram, TikTok; nhãn "Ended" và nút Retry | Có ảnh chụp bằng chứng từng kênh |
| TV3 | Curate các sự kiện Christmas Market và lân cận | Sự kiện đã lên Discover kèm category |
| Founder | Làm việc với Danang 365 về nội dung tháng 12 | Danh sách sự kiện tháng 12 |

#### Tuần 8 · 30/11–04/12 · L6

**Mốc**: Thứ Sáu 04/12 — Christmas Market bắt đầu (4–6/12).

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Dịch vụ thông báo (template tiếng Anh, E7-S2 rút gọn); email xác nhận RSVP (E7-S4) | Email xác nhận gửi qua hàng đợi |
| TV2 | Tuỳ chọn tắt từng loại thông báo (E7-S7); bắt đầu PWA | Màn tuỳ chọn lưu được |
| TV3 | Phần kiểm duyệt còn thiếu sau re-baseline; Community Guidelines + màn đồng ý (E8-S5) | Người dùng mới phải đồng ý Guidelines |
| Founder | Có mặt tại Christmas Market: giới thiệu, quan sát người dùng thật | Ghi chú phản hồi gửi đội |

#### Tuần 9 · 07–11/12 · L6

**Mốc**: Thứ Sáu 11/12 — **M3**.

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Nhắc T-24h và T-2h (E7-S8); FR12-NOTIFY (huỷ sự kiện thì email báo qua BullMQ); báo người được đôn từ hàng chờ (T-16) | Huỷ sự kiện thì mọi người đã RSVP nhận email |
| TV2 | PWA: manifest | Cài được trên Android |
| TV3 | Hoàn tất kiểm duyệt; test regression báo cáo/chặn | Nghiệm thu phần kiểm duyệt của M3/M4 |
| Founder | Nghiệm thu M3 | Biên bản nghiệm thu |

#### Tuần 10 · 14–18/12 · L7

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Job `trust:recompute` (T-13, E3-S3); trust T0–T3 tự động | Job chạy định kỳ, có test |
| TV2 | Xuất và xoá dữ liệu cá nhân (E8-S7) | Người dùng tải được file dữ liệu của mình |
| TV3 | Hàng đợi kiểm duyệt theo mức nghiêm trọng (E8-S3); ẩn/gỡ/khoá có ghi lý do (E8-S4) | Mọi thao tác có AuditLog |
| Founder | Curate New Year Festival | Sự kiện tháng 1 đã lên |

#### Tuần 11 · 21–25/12 · L7

**Mốc**: Thứ Sáu 25/12 — **M4**.

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Regression: RSVP đồng thời khi sự kiện bị huỷ; truy vấn lọc vẫn dùng index | Regression xanh |
| TV2 | Hoàn tất xuất/xoá dữ liệu; rà i18n | Nghiệm thu quyền riêng tư |
| TV3 | Hoàn tất kiểm duyệt cho M4 | Nghiệm thu M4 |
| Founder | Nghiệm thu M4; lên lịch trực P0 cho tuần đóng băng | Lịch trực gửi cả đội |

**Đóng băng 28/12–01/01**: trực P0 luân phiên; Founder đăng sự kiện New Year Festival.

#### Tuần 12 · 04–08/01 · L8

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Điểm danh bằng mã QR (E6-S5); hỗ trợ API cho Curation Console | Check-in ghi vào `trust_signals` |
| TV2 | PWA: service worker, chạy offline cơ bản | Lighthouse PWA đạt |
| TV3 | Nhập sự kiện công khai dưới 3 phút, có ghi nguồn (E9-S2) | Founder tự nhập được một sự kiện |
| Founder | Seed nội dung đầu mùa nomad | Ít nhất 15 sự kiện đang mở |

#### Tuần 13 · 11–15/01 · L8

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Ghi `no_show_recorded` vào `trust_signals` (E6-S6) | Có test |
| TV2 | PWA: thêm vào màn hình chính, tối ưu điện thoại | Cài được trên iOS và Android |
| TV3 | Lời mời organizer nhận quyền quản lý listing (E9-S3) | Một organizer thật nhận được listing |
| Founder | Liên hệ organizer để chuyển giao listing | Danh sách organizer đồng ý |

#### Tuần 14 · 18–22/01 · L9

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Sửa lỗi, tối ưu hiệu năng trang công khai | Không còn lỗi P1 trên trang công khai |
| TV2 | SEO: sitemap, hoàn tất PWA | Sitemap gửi được lên Google Search Console |
| TV3 | Chống spam: trần số sự kiện mỗi ngày, lọc từ khoá, chặn link đáng ngờ (E8-S6) | Có test |
| Founder | Chuẩn bị danh sách tuyển beta | Danh sách ứng viên |

#### Tuần 15 · 25–29/01 · L9

**Mốc**: Thứ Sáu 29/01 — **Go/No-go M5a**. Điều kiện: NFR-06 và consent đạt; kiểm duyệt chạy ổn; ít nhất 15 sự kiện curated đang mở, trong đó ít nhất 5 lễ hội/nhạc/trekking; không còn lỗi P0.

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Kiểm toàn bộ điều kiện M5a phía hệ thống | Bảng điều kiện đánh dấu đủ |
| TV2 | Rà trang công khai: preview, i18n, nhãn Ended/Cancelled | Ảnh chụp bằng chứng EN và VI |
| TV3 | Hoàn tất chuyển giao organizer; sẵn sàng kiểm duyệt cho beta | Hàng đợi kiểm duyệt trống |
| Founder | Chủ trì Go/No-go | Quyết định ghi vào DECISIONS.md |

**Đóng băng Tết 01–12/02**: trực P0 luân phiên; Founder tuyển 60 user beta.

#### Tuần 16 · 15–19/02 · L10

**Mốc**: Thứ Hai 15/02 — **M5a**: mở trang công khai (chỉ xem) và bắt đầu beta kín.

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Trực hotfix hằng ngày; mục "Tuần này có gì" trên màn hình đầu (E5-S9) | Không có P0 mở quá 24 giờ |
| TV2 | Hotfix giao diện và i18n | Không có P0 mở quá 24 giờ |
| TV3 | Kiểm duyệt cho beta; About/FAQ/Guidelines song ngữ cùng Founder (E10-S3) | Report được xử lý trong 24 giờ |
| Founder | Vận hành beta, thu phản hồi | Nhật ký phản hồi hằng ngày |

#### Tuần 17 · 22–26/02 · L10

**Mốc**: Thứ Sáu 26/02 — **M5**.

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Danh sách người tham gia trong giới hạn quyền riêng tư (E6-S4); hotfix | Nghiệm thu M5 |
| TV2 | Hotfix; rà PWA trên máy thật | Nghiệm thu M5 |
| TV3 | Đọc số liệu nguồn truy cập từ NFR-05 | Báo cáo tỷ trọng nguồn link |
| Founder | Nghiệm thu M5 | Biên bản nghiệm thu |

#### Tuần 18 · 01–05/03 · L11

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Bịt chỗ rớt phễu RSVP lớn nhất; trang "Sự kiện của tôi" (E4-S10) | Tỷ lệ hoàn tất RSVP cải thiện |
| TV2 | Nạp bản dịch tiếng Việt từ dịch giả (E10-S2); hồ sơ organizer rút gọn (E3-S4) | Không còn chuỗi dịch máy |
| TV3 | Bảng số liệu phễu cho Founder (E11-S2) | Founder tự xem được phễu |
| Founder | Phỏng vấn sâu 5–8 user beta | Ghi chú gửi đội |

#### Tuần 19 · 08–12/03 · L11

**Mốc**: Thứ Hai 08/03 — **checkpoint SP**. Còn thiếu hơn 10 SP thì kích hoạt dự phòng dời M6 tối đa tới 15/04.

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Sửa lỗi P0/P1 của beta; chỗ rớt phễu thứ hai | Không còn P0 |
| TV2 | Rà bản tiếng Việt; bắt đầu SEO "things to do in Da Nang this week" (E11-S5) | Trang có meta đúng |
| TV3 | Viết runbook vận hành và kiểm duyệt khi ra mắt | Bản nháp runbook |
| Founder | Chốt chương trình soft-launch tại Nomad Fest | Danh sách khách mời |

#### Tuần 20 · 15–19/03 · L12

**Mốc**: Thứ Sáu 19/03 — **soft-launch tại Da Nang Nomad Fest** (mời chọn lọc + trang công khai chỉ xem).

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Release candidate; kiểm tải cơ bản | Bản RC trên staging |
| TV2 | Hoàn tất SEO E11-S5; test RC phần giao diện | Không lỗi giao diện P1 |
| TV3 | Diễn tập runbook lần 1; đẩy curate lên 25 sự kiện/tuần | Biên bản diễn tập |
| Founder | Có mặt tại Nomad Fest; mời người dùng | Số đăng ký mới từ Nomad Fest |

#### Tuần 21 · 22–26/03 · L12

**Mốc**: Thứ Sáu 26/03 — chốt release candidate. (Danang International Marathon dự kiến Chủ nhật 21/03, chưa chính thức.)

| Người | Việc | Xong khi |
|---|---|---|
| TV1 | Chốt RC; chuẩn bị deploy và rollback | Bản RC được ký duyệt |
| TV2 | Test RC phần i18n, PWA, SEO | Checklist RC đủ |
| TV3 | Diễn tập runbook lần 2; xếp lịch trực kiểm duyệt tuần ra mắt | Lịch trực rõ người, rõ giờ |
| Founder | Chuẩn bị chiến dịch truyền thông | Bài đăng lên lịch sẵn |

#### Tuần 22 · 29/03–02/04 · Tuần ra mắt

**Mốc**: Thứ Năm 01/04 — **M6 ra mắt công khai**.

| Người | Việc |
|---|---|
| TV1 | War-room: backend, deploy, giám sát Sentry và log |
| TV2 | War-room: giao diện, i18n, PWA |
| TV3 | Kiểm duyệt và Admin Console, xử lý report trong ngày |
| Founder | Truyền thông, cộng đồng, theo dõi phản hồi |

### 5.3. Sau ra mắt (04–08/2027)

- **Tháng 4–5**: ổn định hệ thống; template thông báo tiếng Việt; đọc số NFR-05 (tỷ trọng khách xem, nguồn link). Nếu vòng 2 ủng hộ thì xét giá và link vé, thêm vào lịch, gợi ý địa điểm. Mùa nomad kéo dài tới giữa tháng 5; IRONMAN 70.3 dự kiến 09/05 (chưa chính thức).
- **Tháng 5–7**: chuẩn bị cho DIFF 2027 (dự kiến cuối tháng 5 đến tháng 7, chưa công bố). Lập kế hoạch cứng khi có lịch chính thức. Đây là đợt tăng trưởng lớn nhất trong năm cho lớp khám phá dành cho du khách.

---

## 6. Nhịp làm việc mỗi tuần

| Thời điểm | Việc | Ai |
|---|---|---|
| Thứ Hai, 30 phút | Chốt việc của tuần theo mục 5.2; cập nhật task board | Cả đội |
| Thứ Tư, 15 phút | Đồng bộ nhanh; gỡ việc đang bị chặn | Cả đội |
| Thứ Sáu, 45 phút | Demo việc đã xong; cập nhật checklist (md + pdf); kiểm mốc của tuần; ghi SP thực tế để đo velocity | Cả đội + Founder |
| Cuối mỗi sprint | Nghiệm thu theo DoD; quyết định chuyển việc sang sprint sau nếu trễ | TV1 (Tech Lead) + Founder |

**Quy tắc chung**:

- Việc nằm trên đường găng của TV1 luôn được ưu tiên. Ai bị chặn quá nửa ngày phải báo ngay trong nhóm.
- `packages/contracts`, `packages/i18n`, `packages/domain` chỉ sửa nối tiếp, không hai người sửa cùng lúc.
- Mọi đổi schema dừng lại chờ Founder duyệt trước khi chạy.
- Mọi việc phải qua test unit, integration, screen và regression trước khi merge.

---

## 7. Quyết định Founder cần duyệt trước 16/10

1. **Định vị "expat-first, visitor-friendly"**: lớp khám phá mở cho du khách, lớp cộng đồng giữ cho người ở lâu.
2. **Migration `0014`**: category, audience, alcohol_served, language_codes, cover_media_id. Field chốt lần cuối ngày 30/10.
3. **Migration `0015`**: bảng đo lường của NFR-05.
4. **Phạm vi cắt mới khoảng 11 SP** ở mục 2.4, và nguyên tắc không đầu tư thêm vào bản đồ, swipe, post, chat, follow.
5. **Ngưỡng nghiệm thu**: ít nhất 5 sự kiện lễ hội/nhạc/trekking mỗi tuần; ít nhất 70% người trả lời vòng 2 kể được ví dụ cụ thể; điều kiện vào M5a.
6. **Dự phòng lịch**: dời M6 tối đa tới 15/04 nếu tới 08/03 còn thiếu hơn 10 SP; soft-launch tại Nomad Fest theo kiểu mời chọn lọc.
7. **Hồ sơ người dùng với khách chưa đăng nhập**: chặn hoàn toàn, hay chỉ hiện dữ liệu công khai tối thiểu.

**Đề xuất kèm theo**: TV1 nhận xác minh email (T-10) thay TV2 để M1 đóng kịp 30/10.

---

## 8. Rủi ro cần theo dõi hằng tuần

| Rủi ro | Dấu hiệu cảnh báo | Cách xử lý | Người theo dõi |
|---|---|---|---|
| Thiếu năng lực (thiếu khoảng 46 SP trước re-baseline) | Re-baseline thu hồi dưới 36 SP; velocity thật dưới 28 | Cắt tiếp theo doc 17 §3.3; checkpoint 08/03 | TV1 + Founder |
| TV1 là điểm nghẽn duy nhất | TV1 trễ việc đường găng 2 tuần liên tiếp | Chuyển thêm việc ngoài đường găng sang TV2/TV3; review chéo | Founder |
| M1 trễ thêm | Chưa xong M1 vào thứ Sáu 30/10 | Dừng nhận việc mới cho tới khi M1 xong | TV1 |
| Nghiên cứu vòng 2 thiếu mẫu | Dưới 12 buổi vào 30/10 | Thêm buổi ở coworking và quán cà phê nomad | Founder |
| Mưa bão tháng 10–11 | Sự kiện ngoài trời bị huỷ | Phỏng vấn trong nhà; FR-12 báo huỷ | Founder |
| Thiếu nội dung khi mở | Dưới 15 sự kiện mở vào 29/01 | Tăng curate; dựa vào Danang 365 | Founder + TV3 |
| Lộ dữ liệu cá nhân trên trang công khai | Test NFR-06 đỏ | Chặn merge cho tới khi xanh | TV2 |
