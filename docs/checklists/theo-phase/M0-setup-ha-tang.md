# Checklist M0 · Setup hạ tầng

**Dự án:** Da Nang Connect — Giai đoạn 1 (MVP) · **Trạng thái chụp:** 19/09/2026 · **Ngày chốt:** 18/09/2026 · **Phân công:** 23/09/2026 (60-20-20)

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

**Người phụ trách (QĐ-78, 23/09/2026 — chia khối lượng 60-20-20 theo chức năng, xem `checklist-milestone-M0-M6.md` §2.1):**

- **Founder**: PO, Community Manager, curate, trực kiểm duyệt, quan hệ organizer, pháp lý, tài khoản cửa hàng và D-U-N-S, ký xác nhận người thứ hai (DoD-9). Không viết code.
- **TV1** (dùng AI, ~60%): Nền tảng và vòng lặp lõi, kiêm Tech Lead — hạ tầng, CI/CD, deploy, trực sự cố, migration, design token, phân quyền và trust, sự kiện, khám phá, RSVP và waitlist, thông báo, đo lường sản phẩm.
- **TV2** (~20%): Tài khoản và hồ sơ — đăng ký, xác minh, đăng nhập, phiên, Google, đặt lại mật khẩu, hồ sơ và onboarding, ảnh và CDN, OTP, ngôn ngữ và i18n, tuỳ chọn thông báo, xuất/xoá dữ liệu, PWA, SEO toàn site.
- **TV3** (~20%): Vận hành — khu vực, kiểm duyệt (báo cáo, chặn, hàng đợi, xử lý, chống spam, Community Guidelines), Admin Console, curate và nhận quyền, tin tức do đội vận hành đăng, phễu phân tích.
- **Thuê ngoài**: Designer (trọn gói 4 tuần), QA (2 đợt), dịch giả tiếng Việt.
- Mỗi thành viên làm trọn chức năng của mình: API, dữ liệu, màn web hoặc Admin Console, và E2E. Hai tên nối bằng "+" là việc chạm hai chức năng; người đứng đầu chịu trách nhiệm chính và nhận SP.

**Nhóm việc trong mỗi phase:** Việc chặn & cần chốt → Story → DoD bổ sung → Nghiệm thu → Demo → Việc ngoài SP → Bổ sung từ mockup → Bổ sung kịch bản tinh gọn.

**Nguồn trạng thái:** M0–M1 lấy từ đợt kiểm tra code chỉ đọc ngày 18/09/2026 (có đối chứng độc lập). Các mục "Một phần" của M2–M3 lấy từ ghi chú phiên làm việc 01–02/09, **chưa kiểm chứng lại bằng code**. Story, DoD, demo và tiêu chí nghiệm thu lấy nguyên văn từ `docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md` §6–§7. Nhóm "Bổ sung từ mockup" là việc mới lộ ra từ bộ mockup web ngày 18–19/09 và quyết định của chủ dự án ngày 19/09. **Kịch bản đội:** CH-06 chốt ngày 19/09/2026 theo phương án tinh gọn, cắt nhóm A + B (QĐ-77); ngày 23/09/2026 đội code đổi thành 3 thành viên chia khối lượng 60-20-20 theo chức năng (QĐ-78). Ngày chốt M2–M6 và cột Sprint (L0–L12) theo `08` §10.4; người phụ trách theo QĐ-78; chữ của story, DoD, demo, nghiệm thu giữ nguyên văn, phần điều chỉnh tinh gọn ghi ở cột Ghi chú.

<div class="pb"></div>

## 2. M0 · Setup hạ tầng — chốt 18/09/2026

**Sprint:** L0 · **Tổng:** 35 mục · ✅ 9 · 🟡 5 · ⬜ 10 · ⛔ 0 · ❓ 1 · ⚪ 5 · ✂️ 5 · **Tỷ lệ xong:** 30%

**SP theo người (còn lại / trong phạm vi):** TV1 14 / 34 · TV2 0 / 3 · TV3 0 / 0

**Mục tiêu:**

- L0 — 07/09 – 18/09/2026: Monorepo, Docker Compose, NestJS, Next.js, CI, khung i18n

**Nếu trượt:** M0 trượt tối đa 3 ngày làm việc. Quá 3 ngày thì rút E1-S8 xuống mức script và đẩy phần còn lại vào S1 — không được để trượt lan sang M1 vì M1 nằm trên đường găng. Tinh gọn: Phương án script cho E1-S8 (còn 4 SP) đã được dùng sẵn, nên M0 không còn đòn bẩy hạ tải nào khác. Mọi phần trượt ăn thẳng vào L1, vốn đã xếp 32 SP story còn mở trên sức chứa 28.

### 2.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☑ | CH-06 | Chốt quy mô đội: đủ đội 5,5 FTE hay tinh gọn 2 dev + Founder. Git log hiện chỉ có 1 người commit; velocity 53 SP/sprint của S1 dựa trên đội đủ. | Founder | <span class="nw">✅ Xong</span> | Chốt 19/09/2026: tinh gọn 2 dev + Founder, cắt nhóm A + B, M6 dời sang 01/04/2027 (QĐ-77). Founder còn phải ký bảng "Những gì mất đi khi cắt" (doc 08 §10.5). Cập nhật 23/09/2026 (QĐ-78): đội code là 3 thành viên chia khối lượng 60-20-20 theo chức năng (TV1 dùng AI, TV2, TV3); Founder giữ việc không code; phạm vi cắt nhóm A + B và lịch L0 → L12 giữ nguyên. |
| ☑ | T-TL-01 | Tạo ops/legal/ + ops/legal/drafts/ cho bản nháp ToS / Privacy. | TV1 | <span class="nw">✅ Xong</span> | Xong 19/09/2026: ops/legal/ có README (quy tắc, cấu trúc, việc cấm commit), .gitignore dạng danh sách cho phép, drafts/, registers/, map-audit/. Repo đang public nên chưa tạo counsel/, filings/, procedures/, chờ Founder chốt (ops/legal/README.md §4). Tinh gọn: Founder soạn bản thảo ToS/Privacy, luật sư rà soát và ký. |
| ☐ | T-TL-02 | Secret scanning (gitleaks) + tách biến môi trường trong CI, trước khi nạp khoá JWT, OAuth, Apple .p8. | TV1 | <span class="nw">⬜ Chưa làm</span> | Rủi ro tăng ngay trong Sprint 1. Tinh gọn: Không còn khoá Apple .p8 vì E2-S4 bị cắt; thêm khoá riêng VAPID của Web Push (L6) vào danh sách secret |

### 2.2. Story

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☑ | E1-S1 | Monorepo + chuẩn code thống nhất (5 SP) · MUST | TV1 | <span class="nw">✅ Xong</span> | Monorepo pnpm + Turborepo + oxlint chạy được. |
| ☑ | E1-S2 | `docker compose up` = Postgres 16 + PostGIS 3.4 + Redis (5 SP) · MUST | TV1 | <span class="nw">✅ Xong</span> | PostgreSQL 18 + PostGIS 3.6 + Redis 7.4 (nâng phiên bản đã quyết, khác số ghi trong doc 08). |
| ☑ | E1-S3 | Khung NestJS 11 + config theo môi trường + `GET /health` (5 SP) · MUST | TV1 | <span class="nw">✅ Xong</span> | Có /health; thiếu readiness kiểm tra DB và Redis. Xong 24/09/2026: thêm GET /api/v1/health/ready kiểm PostgreSQL + Redis cache + Redis queue, trả 200 hoặc 503 kèm tên dịch vụ đang hỏng (e2e health.e2e.spec.ts; chạy thật: tắt Redis cache → 503, bật lại → 200). |
| ☐ | E1-S4 | TypeORM migration + seed data (5 SP) · MUST | TV1 | <span class="nw">❓ Cần chốt</span> | Không dùng TypeORM: schema là file SQL nạp qua initdb, không tự áp cho DB đang chạy. Chốt cơ chế migration (T-04) trước bảng mới đầu tiên. Tinh gọn: Không nằm trong 28 SP của L0; phải chốt cơ chế migration trước khi TV1 tạo users.role và trust_signals ở L1 |
| ☑ | E1-S5 | Khung Next.js 15 App Router + Tailwind + design token (5 SP) · MUST | TV1 | <span class="nw">✅ Xong</span> | Next.js 16 App Router + Tailwind 4 + token từ @dnc/tokens. Tinh gọn: @dnc/tokens chưa khớp doc 10 §12 (primary #0EA5E9, doc 10 dùng teal-500 #0E7C74); Designer thuê ngoài giao design token trong gói 4 tuần (TG-M0-1), TV1 thay vào @dnc/tokens |
| ☐ | E1-S6 | Khung Expo 54 + RN 0.81 + điều hướng + dev build máy thật (8 SP) · MUST | Founder | <span class="nw">✂️ Cắt / hoãn</span> | apps/mobile-client-side chỉ có README. Chặn cứng 18 SP mobile của Sprint 1 (E2-S3, E2-S4, E2-S9). Tinh gọn: Hoãn nhánh native sang sau ra mắt, không có repo mobile trong 7 tháng đầu; thay bằng PWA (manifest, service worker, add-to-home) do TV2 làm (TG-M5-1, TG-M5-2) |
| ☐ | E1-S7 | CI GitHub Actions: lint + test + build mỗi PR (5 SP) · MUST | TV1 | <span class="nw">🟡 Một phần</span> | CI có lint + typecheck + test + smoke RSVP; thiếu bước build; branch protection chưa xác nhận. |
| ☐ | E1-S8 | Merge `develop` → tự động deploy staging (4 SP) · MUST | TV1 | <span class="nw">⬜ Chưa làm</span> | Chưa có auto-deploy staging, cũng chưa có script deploy.sh dự phòng. Tinh gọn: Nhóm B rút gọn 8 → 4 SP: deploy staging bằng một lệnh chạy tay (deploy.sh), bỏ auto-deploy, mỗi lần mất thêm khoảng 2 phút; vẫn đạt gate vì M0-5 chấp nhận script một lệnh |
| ☑ | E10-S1 | Khoá i18n theo namespace, dùng chung web + mobile (3 SP) · MUST | TV2 | <span class="nw">✅ Xong</span> | packages/i18n en/vi + sinh kiểu khoá; 2 file phẳng thay vì 14 namespace (vẫn đạt DoD). Tinh gọn: Không có app mobile trong kịch bản tinh gọn: khoá chỉ dùng cho web client + Admin Console; bản dịch VI do dịch giả thuê ngoài, TV2 nạp file ở L11 |

### 2.3. DoD bổ sung

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S0-DoD-1 | Người thứ hai trong đội làm theo `README` từ máy sạch, dựng xong toàn hệ thống trong ≤ 5 phút bấm đồng hồ, không hỏi ai | TV1 | <span class="nw">🟡 Một phần</span> | Lệnh pnpm dev tự động hoá đủ; chưa có lần bấm giờ thật trên máy sạch. Tinh gọn: TV2 hoặc TV3 là người thứ hai bấm giờ trên máy sạch |
| ☐ | S0-DoD-2 | `GET /health` trả 200 từ tên miền staging thật (không phải IP), có HTTPS hợp lệ | TV1 | <span class="nw">⬜ Chưa làm</span> | Chưa có staging (phụ thuộc E1-S8). Tinh gọn: Staging dựng bằng deploy một lệnh (E1-S8 rút gọn); tên miền do Founder đăng ký (S0-Ops-3) |
| ☐ | S0-DoD-3 | CI chạy < 8 phút; PR đỏ không merge được (branch protection đã bật) | TV1 | <span class="nw">⚪ Chưa xác nhận</span> | Cần người có quyền admin repo kiểm branch protection và đo thời gian CI thật. Tinh gọn: Không có QA thường trực: branch protection bắt buộc 1 approve từ dev còn lại (review chéo) |
| ☐ | S0-DoD-4 | Dev build cài được lên 1 iPhone thật + 1 Android thật, ảnh chụp màn hình lưu trong issue | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Chưa có project Expo (E1-S6). Tinh gọn: Không có dev build native (E1-S6 hoãn); việc kiểm tra cài PWA lên máy thật chuyển sang L9 |
| ☑ | S0-DoD-5 | Khung i18n có sẵn 2 locale `en`/`vi`, mặc định `en`; đã có 1 chuỗi mẫu chứng minh cả hai đường | TV2 | <span class="nw">✅ Xong</span> | — |
| ☐ | S0-DoD-6 | Sổ đăng ký hoạt động xử lý dữ liệu cá nhân đã tạo file rỗng có cấu trúc, chờ điền từ S1 | Founder + TV1 | <span class="nw">⬜ Chưa làm</span> | Chưa có file sổ đăng ký, chưa có thư mục ops/legal/. Tinh gọn: Founder soạn cấu trúc sổ theo Luật 91/2025 (luật sư chỉ rà soát ở gói pháp lý rút gọn); TV1 đặt file vào ops/legal/ |

### 2.4. Nghiệm thu

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | M0-1 | `GET /api/v1/health` trả 200 từ tên miền staging có HTTPS hợp lệ | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh chụp `curl -i` + chứng chỉ |
| ☐ | M0-2 | CI xanh trên `develop`, thời gian chạy < 8 phút, branch protection đã bật | TV1 | <span class="nw">🟡 Một phần</span> | CI chạy trên PR; thiếu build + branch protection chưa xác nhận. Bằng chứng: Link run CI + ảnh cấu hình |
| ☐ | M0-3 | Người thứ hai dựng local từ máy sạch trong ≤ 5 phút | TV1 | <span class="nw">🟡 Một phần</span> | Chưa bấm giờ thật. Bằng chứng: Video màn hình bấm đồng hồ. Tinh gọn: TV2 hoặc TV3 là người thứ hai quay video bấm giờ |
| ☐ | M0-4 | Dev build cài chạy trên 1 iPhone thật + 1 Android thật | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Bằng chứng: 2 ảnh chụp màn hình thiết bị. Tinh gọn: Không có app native trong 7 tháng; bằng chứng cài PWA trên máy thật chuyển sang L9 |
| ☐ | M0-5 | Merge `develop` → staging tự cập nhật ≤ 10 phút (hoặc script 1 lệnh, xem phương án hạ tải §6.3) | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Log deploy. Tinh gọn: Nghiệm thu theo nhánh script một lệnh (E1-S8 rút gọn); bằng chứng là log chạy script |
| ☑ | M0-6 | 2 locale `en`/`vi` hoạt động, mặc định `en` | TV2 | <span class="nw">✅ Xong</span> | Bằng chứng: Ảnh 2 trạng thái |
| ☐ | M0-7 | Hồ sơ D-U-N-S đã nộp, có mã hồ sơ | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Việc của Founder, chưa có bằng chứng trong repo. Bằng chứng: Email xác nhận. Tinh gọn: D-U-N-S chỉ dùng để mở tài khoản Apple Developer/Google Play cho app native; E12 hoãn và ngân sách tinh gọn bỏ Apple Developer nên không còn là tiêu chí M0 |

### 2.5. Demo

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S0-Demo-1 | Mở terminal máy sạch, `git clone` + `docker compose up`, gọi `curl localhost:3000/api/v1/health` → `{"status":"ok"}` | TV1 | <span class="nw">🟡 Một phần</span> | Chạy được trên localhost; staging chưa có. |
| ☐ | S0-Demo-2 | Mở trình duyệt vào tên miền staging → trang Next.js chào mừng, bấm nút đổi ngôn ngữ EN ↔ VI | TV2 + TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Staging cập nhật bằng deploy một lệnh của TV1 |
| ☐ | S0-Demo-3 | Cầm iPhone thật lên, mở app dev build, đi qua 3 màn hình khung | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Không có app native; demo tương đương là mở PWA trên điện thoại ở L9 |
| ☐ | S0-Demo-4 | Push 1 commit vô hại lên `develop` ngay trong buổi demo → mọi người xem CI chạy và staging tự cập nhật sau ~6 phút | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Không còn auto-deploy: sau khi CI xanh, TV1 chạy lệnh deploy ngay trong buổi demo |

### 2.6. Việc ngoài SP

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S0-Ops-1 | Nộp hồ sơ D-U-N-S Number (miễn phí, 5–14 ngày làm việc) — đây là việc chặn dài nhất của cả dự án, làm ngày đầu tiên | Founder | <span class="nw">⚪ Chưa xác nhận</span> | Tinh gọn: Không còn chặn lịch vì app native và phát hành cửa hàng đã hoãn; nộp vẫn miễn phí nếu muốn giữ đường cho bản native sau ra mắt |
| ☐ | S0-Ops-2 | Mở tài khoản Google Play Console (25 USD một lần) — làm ngay vì chính sách closed testing 14 ngày tính từ lúc có tester | Founder | <span class="nw">⚪ Chưa xác nhận</span> | Tinh gọn: Chỉ cần cho app native trên Google Play (E12 hoãn); không còn chặn M5/M6, Founder quyết mở sớm hay dời |
| ☐ | S0-Ops-3 | Đăng ký tên miền + email doanh nghiệp | Founder | <span class="nw">⚪ Chưa xác nhận</span> | — |
| ☐ | S0-Ops-4 | Chốt danh sách 20 organizer mục tiêu để tiếp cận từ S2 | Founder | <span class="nw">⚪ Chưa xác nhận</span> | Tinh gọn: Tiếp cận từ L2 (trùng lịch S2), giữ nguyên theo NT-1 |

### 2.7. Bổ sung kịch bản tinh gọn

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | TG-M0-1 | Ký gói Designer thuê ngoài trọn gói: design token + 20 màn hình, giao trong 4 tuần (45 triệu VND, GĐ A) · MUST | Founder | <span class="nw">⬜ Chưa làm</span> | Bên giao là Thuê ngoài: Designer; việc bàn giao theo dõi ở TG-M2-1 (khoảng 19/10, đầu L3). Doc 00 đặt hạn token trước 21/09 nên phải ký trong hạn trượt M0 (23/09). DEC-TOKENS (M2) phải chốt trước khi gửi brief vì @dnc/tokens đang lệch doc 10 §12 (E1-S5). Đề xuất đổi phần tài sản cửa hàng trong gói sang icon/splash PWA + ảnh OG vì E12 hoãn; TV1 nạp token vào @dnc/tokens |
| ☐ | TG-M0-2 | Chốt quy trình nghiệm thu tinh gọn: Founder ký DoD-9 (người thứ hai xác nhận), các thành viên code review chéo story của nhau · MUST | Founder + TV1 | <span class="nw">⬜ Chưa làm</span> | Không có QA thường trực (08:1526). TV1 bật yêu cầu 1 approve từ một thành viên khác trên develop (S0-DoD-3). Founder ký DoD-9 trên staging cho mọi story L0–L12 và cho từng gate M1–M6. Đây là mục duy nhất của quy trình này, đã gộp các bản lặp ở M1–M5. Chấp nhận tỷ lệ lỗi lọt ra staging cao hơn |

