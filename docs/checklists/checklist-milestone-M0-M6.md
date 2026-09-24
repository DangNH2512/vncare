# Checklist triển khai theo milestone M0 → M6

**Dự án:** Da Nang Connect — Giai đoạn 1 (MVP) · **Trạng thái chụp:** 19/09/2026 · **Phạm vi:** 7 milestone, từ Setup hạ tầng (18/09/2026) tới Ra mắt công khai (01/04/2027) · **Kịch bản:** tinh gọn, 3 thành viên code chia 60-20-20 + Founder · **Phân công:** 23/09/2026

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

**Người phụ trách (QĐ-78, 23/09/2026 — chia khối lượng 60-20-20 theo chức năng, xem §2.1):**

- **Founder**: PO, Community Manager, curate, trực kiểm duyệt, quan hệ organizer, pháp lý, tài khoản cửa hàng và D-U-N-S, ký xác nhận người thứ hai (DoD-9). Không viết code.
- **TV1** (dùng AI, ~60%): Nền tảng và vòng lặp lõi, kiêm Tech Lead — hạ tầng, CI/CD, deploy, trực sự cố, migration, design token, phân quyền và trust, sự kiện, khám phá, RSVP và waitlist, thông báo, đo lường sản phẩm.
- **TV2** (~20%): Tài khoản và hồ sơ — đăng ký, xác minh, đăng nhập, phiên, Google, đặt lại mật khẩu, hồ sơ và onboarding, ảnh và CDN, OTP, ngôn ngữ và i18n, tuỳ chọn thông báo, xuất/xoá dữ liệu, PWA, SEO toàn site.
- **TV3** (~20%): Vận hành — khu vực, kiểm duyệt (báo cáo, chặn, hàng đợi, xử lý, chống spam, Community Guidelines), Admin Console, curate và nhận quyền, tin tức do đội vận hành đăng, phễu phân tích.
- **Thuê ngoài**: Designer (trọn gói 4 tuần), QA (2 đợt), dịch giả tiếng Việt.
- Mỗi thành viên làm trọn chức năng của mình: API, dữ liệu, màn web hoặc Admin Console, và E2E. Hai tên nối bằng "+" là việc chạm hai chức năng; người đứng đầu chịu trách nhiệm chính và nhận SP.

**Nhóm việc trong mỗi phase:** Việc chặn & cần chốt → Story → DoD bổ sung → Nghiệm thu → Demo → Việc ngoài SP → Bổ sung từ mockup → Bổ sung kịch bản tinh gọn.

**Nguồn trạng thái:** M0–M1 lấy từ đợt kiểm tra code chỉ đọc ngày 18/09/2026 (có đối chứng độc lập). Các mục "Một phần" của M2–M3 lấy từ ghi chú phiên làm việc 01–02/09, **chưa kiểm chứng lại bằng code**. Story, DoD, demo và tiêu chí nghiệm thu lấy nguyên văn từ `docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md` §6–§7. Nhóm "Bổ sung từ mockup" là việc mới lộ ra từ bộ mockup web ngày 18–19/09 và quyết định của chủ dự án ngày 19/09. **Kịch bản đội:** CH-06 chốt ngày 19/09/2026 theo phương án tinh gọn, cắt nhóm A + B (QĐ-77); ngày 23/09/2026 đội code đổi thành 3 thành viên chia khối lượng 60-20-20 theo chức năng (QĐ-78). Ngày chốt M2–M6 và cột Sprint (L0–L12) theo `08` §10.4; người phụ trách theo QĐ-78; chữ của story, DoD, demo, nghiệm thu giữ nguyên văn, phần điều chỉnh tinh gọn ghi ở cột Ghi chú.

<div class="pb"></div>

## 2. Tổng quan tiến độ

| Phase | Tên | Ngày chốt | Sprint | Tổng | ✅ Xong | 🟡 Một phần | ⬜ Chưa làm | ⛔ Bị chặn | ❓ Cần chốt | ⚪ Chưa xác nhận | ✂️ Cắt / hoãn | Tỷ lệ xong |
|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **M0** | Setup hạ tầng | <span class="nw">18/09/2026</span> | L0 | 35 | 9 | 5 | 10 | 0 | 1 | 5 | 5 | 30% |
| **M1** | API nền + Auth | <span class="nw">02/10/2026</span> | L1 | 49 | 11 | 7 | 18 | 2 | 6 | 2 | 3 | 24% |
| **M2** | Tạo & khám phá sự kiện | <span class="nw">13/11/2026</span> | L2, L3, L4 | 72 | 0 | 11 | 45 | 0 | 5 | 1 | 10 | 0% |
| **M3** | RSVP + Waitlist + Thông báo | <span class="nw">11/12/2026</span> | L5, L6 | 40 | 0 | 4 | 33 | 0 | 1 | 0 | 2 | 0% |
| **M4** | Trust & Safety tối thiểu | <span class="nw">25/12/2026</span> | L7 | 40 | 0 | 0 | 35 | 0 | 2 | 0 | 3 | 0% |
| **M5** | Beta kín 60 user | <span class="nw">26/02/2027</span> | L8, L9, L10 | 64 | 0 | 0 | 58 | 0 | 0 | 0 | 6 | 0% |
| **M6** | Ra mắt công khai | <span class="nw">01/04/2027</span> | L11, L12 | 54 | 0 | 0 | 36 | 0 | 0 | 0 | 18 | 0% |
| **Tổng** | | | | **354** | **20** | **27** | **235** | **2** | **15** | **8** | **47** | **7%** |

### 2.1. Phân công 60-20-20 theo chức năng

Chia theo chức năng dọc (QĐ-78, 23/09/2026): mỗi thành viên sở hữu trọn chức năng của mình, gồm use case, API, dữ liệu, màn hình web hoặc Admin Console, và E2E. Tỉ lệ tính trên SP của story còn lại trong phạm vi (mục 🟡 Một phần tính đủ SP). Việc của Founder và Thuê ngoài không tính vào tỉ lệ.

| Thành viên | SP còn lại | Tỉ lệ | SP trong phạm vi | Mục đứng đầu | Mục mockup chưa có SP | Chức năng sở hữu |
| --- | --: | --: | --: | --: | --: | --- |
| **TV1** (dùng AI) | 198 | 60% | 213 | 161 | 12 | Nền tảng và Tech Lead (hạ tầng, CI/CD, deploy, Sentry, migration, design token) · Phân quyền RBAC và trust · Sự kiện · Khám phá · RSVP và waitlist · Thông báo · Đo lường sản phẩm |
| **TV2** | 67 | 20% | 78 | 46 | 3 | Tài khoản (đăng ký, xác minh email, đăng nhập, phiên, Google, đặt lại mật khẩu, rate limit) · Hồ sơ và onboarding, ảnh/CDN, OTP · Ngôn ngữ và i18n, tuỳ chọn thông báo, xuất/xoá dữ liệu · PWA và SEO toàn site |
| **TV3** | 65 | 20% | 65 | 31 | 3 | Khu vực (polygon 6 khu vực MVP) · Kiểm duyệt (báo cáo, chặn, hàng đợi, xử lý, chống spam, Community Guidelines) · Admin Console (curate, nhận quyền, người dùng/khu vực/loại hình, bảng điều khiển) · Tin tức do đội vận hành đăng · Phễu phân tích |
| **Tổng** | **330** | **100%** | **356** | **354** | **20** | **27** | **235** | **2** | **15** | **8** | **47** | **7%** |

- **SP trong phạm vi** gồm cả SP đã xong: TV1 đã xong E1-S1, E1-S2, E1-S5 (15 SP); TV2 đã xong E2-S2, E10-S1 (11 SP). 1 SP còn lại (E10-S2) thuộc Thuê ngoài: Dịch giả.
- **Mục đứng đầu** là số dòng thành viên đứng tên đầu ở cột Phụ trách, gồm cả DoD, nghiệm thu và demo của chức năng mình.
- **Mục mockup chưa có SP** (nhóm "Bổ sung từ mockup") chưa được ước lượng, nên chưa nằm trong tỉ lệ. Phần lớn thuộc TV1 (12/18; MK-AUTH-01 do Founder chốt), nên khi ước lượng xong thì tỉ lệ thật của TV1 sẽ nhỉnh hơn 60%. Cần ước lượng và cân lại ở buổi lập kế hoạch L2.
- Sửa `packages/**` dùng chung (contracts, i18n, tokens, geo) cần một thành viên khác review; TV1 chốt cuối vì kiêm Tech Lead. Mỗi PR cần 1 approve từ thành viên khác (TG-M0-2).

### 2.2. Tải theo sprint và chỗ giao nhau

SP còn lại theo cột Sprint **hiện tại** (chưa dời lịch). Lịch L0 → L12 và mức 28 SP/sprint vẫn lập cho 2 dev; cần đo velocity thật của 3 thành viên sau L1 rồi mới chỉnh mốc.

| Sprint | TV1 | TV2 | TV3 | Tổng |
|---|--:|--:|--:|--:|
| L0 (quá hạn 18/09) | 19 | 0 | 0 | 19 |
| L1 (đang chạy) | 8 | 24 | 0 | 32 |
| L2 | 13 | 16 | 5 | 34 |
| L3 | 29 | 0 | 0 | 29 |
| L4 | 35 | 0 | 0 | 35 |
| L5 | 31 | 0 | 0 | 31 |
| L6 | 21 | 0 | 0 | 21 |
| L7 | 8 | 0 | 26 | 34 |
| L8 | 2 | 2 | 23 | 27 |
| L9 | 10 | 13 | 5 | 28 |
| L10 | 18 | 2 | 3 | 23 |
| L11 | 4 | 5 | 3 | 12 |
| L12 | 0 | 5 | 0 | 5 |

**Điểm nóng cần xử lý ở buổi lập kế hoạch sprint:**

1. **L0–L1 (hạn M1 là 02/10):** TV2 gánh 24 SP auth trong khi TV3 chưa có việc. Nếu hết tuần đầu của L1 mà E2-S1 chưa xong, dùng phương án khẩn của M1: dời E2-S6 và E1-S9 sang L2, TV1 hỗ trợ E2-S1 khi xong phần L0 còn tồn. TV3 bắt đầu ngay E5-S1 (polygon khu vực), vì TV1 cần nó đầu L2.
2. **L3–L6:** chỉ TV1 có story theo lịch (21–35 SP/sprint), còn TV2 và TV3 trống. Hai người này nên làm sớm việc của mình trong khoảng này:
    - **TV2:** OTP (E3-S6), xuất/xoá dữ liệu (E8-S7), hồ sơ organizer (E3-S4), tuỳ chọn thông báo (E7-S7), SEO (E11-S5), và manifest + service worker của PWA (TG-M5-1, TG-M5-2) trước L6 để Web Push chạy được trên iPhone (E7-S3).
    - **TV3:** Admin Console + audit log (E9-S1) ngay khi có RBAC ở L1; tin tức cho Trang chủ (MK-NEWS-01, MK-NEWS-02) trong M2; API báo cáo, chặn, xử lý và hàng đợi (E8-S1 → E8-S4) sau khi có sự kiện ở L3.
3. **L7–L8:** nếu giữ lịch hiện tại, TV3 gánh 26 rồi 23 SP. Đây là lý do phải làm sớm ở mục 2. E9-S2, E9-S3 cần service tạo sự kiện của TV1 nên vẫn ở L8.
4. **Đỉnh của TV1 ở L3–L5 (29–35 SP/sprint).** Nếu velocity thật của TV1 sau L1 thấp hơn mức này thì M2 (13/11) có nguy cơ trượt. Khi đó chuyển E4-S8 (trang chi tiết, SEO + OG, 8 SP) sang TV2, vì TV2 đã giữ SEO toàn site.

**Chỗ giao nhau cần chốt sớm:**

| Giữa | Hạn | Cần thống nhất |
| --- | --- | --- |
| TV1 → TV2, TV3 | Trong L1 | Enum role, guard RBAC, `PERMISSION_MATRIX` (E2-S7, MT-17, PERM-MATRIX) |
| TV2 → TV1 | L1 (email), trước L7 (SĐT) | Tín hiệu trust từ xác minh email và SĐT ghi vào `trust_signals` cho job tính bậc (E3-S3) |
| TV3 → TV1 | Đầu L2 | Polygon 6 khu vực MVP (E5-S1) để tự gán khu vực khi tạo sự kiện (E4-S1) |
| TV2 → TV1 | L2 | Pipeline ảnh + CDN (E3-S2) cho ảnh bìa sự kiện (E4-S4) |
| TV1 → TV3 | Trước khi TV3 làm E8-S1 | Loại đối tượng bị báo cáo (sự kiện, bình luận, hồ sơ, review) trong `packages/contracts` |
| TV1 → TV3 | Trước L8 | Service tạo sự kiện + DTO event/occurrence cho curate, nhận quyền và nhân bản (E9-S2, E9-S3, TG-M5-6) |
| TV1 ↔ TV2 | Trước L6 | Một service worker dùng chung cho Web Push (E7-S3) và PWA (TG-M5-1), vì một scope chỉ có một service worker |


<div class="pb"></div>

## 3. M0 · Setup hạ tầng — chốt 18/09/2026

**Sprint:** L0 · **Tổng:** 35 mục · ✅ 9 · 🟡 5 · ⬜ 10 · ⛔ 0 · ❓ 1 · ⚪ 5 · ✂️ 5 · **Tỷ lệ xong:** 30%

**SP theo người (còn lại / trong phạm vi):** TV1 14 / 34 · TV2 0 / 3 · TV3 0 / 0

**Mục tiêu:**

- L0 — 07/09 – 18/09/2026: Monorepo, Docker Compose, NestJS, Next.js, CI, khung i18n

**Nếu trượt:** M0 trượt tối đa 3 ngày làm việc. Quá 3 ngày thì rút E1-S8 xuống mức script và đẩy phần còn lại vào S1 — không được để trượt lan sang M1 vì M1 nằm trên đường găng. Tinh gọn: Phương án script cho E1-S8 (còn 4 SP) đã được dùng sẵn, nên M0 không còn đòn bẩy hạ tải nào khác. Mọi phần trượt ăn thẳng vào L1, vốn đã xếp 32 SP story còn mở trên sức chứa 28.

### 3.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☑ | CH-06 | Chốt quy mô đội: đủ đội 5,5 FTE hay tinh gọn 2 dev + Founder. Git log hiện chỉ có 1 người commit; velocity 53 SP/sprint của S1 dựa trên đội đủ. | Founder | <span class="nw">✅ Xong</span> | Chốt 19/09/2026: tinh gọn 2 dev + Founder, cắt nhóm A + B, M6 dời sang 01/04/2027 (QĐ-77). Founder còn phải ký bảng "Những gì mất đi khi cắt" (doc 08 §10.5). Cập nhật 23/09/2026 (QĐ-78): đội code là 3 thành viên chia khối lượng 60-20-20 theo chức năng (TV1 dùng AI, TV2, TV3); Founder giữ việc không code; phạm vi cắt nhóm A + B và lịch L0 → L12 giữ nguyên. |
| ☑ | T-TL-01 | Tạo ops/legal/ + ops/legal/drafts/ cho bản nháp ToS / Privacy. | TV1 | <span class="nw">✅ Xong</span> | Xong 19/09/2026: ops/legal/ có README (quy tắc, cấu trúc, việc cấm commit), .gitignore dạng danh sách cho phép, drafts/, registers/, map-audit/. Repo đang public nên chưa tạo counsel/, filings/, procedures/, chờ Founder chốt (ops/legal/README.md §4). Tinh gọn: Founder soạn bản thảo ToS/Privacy, luật sư rà soát và ký. |
| ☐ | T-TL-02 | Secret scanning (gitleaks) + tách biến môi trường trong CI, trước khi nạp khoá JWT, OAuth, Apple .p8. | TV1 | <span class="nw">⬜ Chưa làm</span> | Rủi ro tăng ngay trong Sprint 1. Tinh gọn: Không còn khoá Apple .p8 vì E2-S4 bị cắt; thêm khoá riêng VAPID của Web Push (L6) vào danh sách secret |

### 3.2. Story

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

### 3.3. DoD bổ sung

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S0-DoD-1 | Người thứ hai trong đội làm theo `README` từ máy sạch, dựng xong toàn hệ thống trong ≤ 5 phút bấm đồng hồ, không hỏi ai | TV1 | <span class="nw">🟡 Một phần</span> | Lệnh pnpm dev tự động hoá đủ; chưa có lần bấm giờ thật trên máy sạch. Tinh gọn: TV2 hoặc TV3 là người thứ hai bấm giờ trên máy sạch |
| ☐ | S0-DoD-2 | `GET /health` trả 200 từ tên miền staging thật (không phải IP), có HTTPS hợp lệ | TV1 | <span class="nw">⬜ Chưa làm</span> | Chưa có staging (phụ thuộc E1-S8). Tinh gọn: Staging dựng bằng deploy một lệnh (E1-S8 rút gọn); tên miền do Founder đăng ký (S0-Ops-3) |
| ☐ | S0-DoD-3 | CI chạy < 8 phút; PR đỏ không merge được (branch protection đã bật) | TV1 | <span class="nw">⚪ Chưa xác nhận</span> | Cần người có quyền admin repo kiểm branch protection và đo thời gian CI thật. Tinh gọn: Không có QA thường trực: branch protection bắt buộc 1 approve từ dev còn lại (review chéo) |
| ☐ | S0-DoD-4 | Dev build cài được lên 1 iPhone thật + 1 Android thật, ảnh chụp màn hình lưu trong issue | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Chưa có project Expo (E1-S6). Tinh gọn: Không có dev build native (E1-S6 hoãn); việc kiểm tra cài PWA lên máy thật chuyển sang L9 |
| ☑ | S0-DoD-5 | Khung i18n có sẵn 2 locale `en`/`vi`, mặc định `en`; đã có 1 chuỗi mẫu chứng minh cả hai đường | TV2 | <span class="nw">✅ Xong</span> | — |
| ☐ | S0-DoD-6 | Sổ đăng ký hoạt động xử lý dữ liệu cá nhân đã tạo file rỗng có cấu trúc, chờ điền từ S1 | Founder + TV1 | <span class="nw">⬜ Chưa làm</span> | Chưa có file sổ đăng ký, chưa có thư mục ops/legal/. Tinh gọn: Founder soạn cấu trúc sổ theo Luật 91/2025 (luật sư chỉ rà soát ở gói pháp lý rút gọn); TV1 đặt file vào ops/legal/ |

### 3.4. Nghiệm thu

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | M0-1 | `GET /api/v1/health` trả 200 từ tên miền staging có HTTPS hợp lệ | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh chụp `curl -i` + chứng chỉ |
| ☐ | M0-2 | CI xanh trên `develop`, thời gian chạy < 8 phút, branch protection đã bật | TV1 | <span class="nw">🟡 Một phần</span> | CI chạy trên PR; thiếu build + branch protection chưa xác nhận. Bằng chứng: Link run CI + ảnh cấu hình |
| ☐ | M0-3 | Người thứ hai dựng local từ máy sạch trong ≤ 5 phút | TV1 | <span class="nw">🟡 Một phần</span> | Chưa bấm giờ thật. Bằng chứng: Video màn hình bấm đồng hồ. Tinh gọn: TV2 hoặc TV3 là người thứ hai quay video bấm giờ |
| ☐ | M0-4 | Dev build cài chạy trên 1 iPhone thật + 1 Android thật | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Bằng chứng: 2 ảnh chụp màn hình thiết bị. Tinh gọn: Không có app native trong 7 tháng; bằng chứng cài PWA trên máy thật chuyển sang L9 |
| ☐ | M0-5 | Merge `develop` → staging tự cập nhật ≤ 10 phút (hoặc script 1 lệnh, xem phương án hạ tải §6.3) | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Log deploy. Tinh gọn: Nghiệm thu theo nhánh script một lệnh (E1-S8 rút gọn); bằng chứng là log chạy script |
| ☑ | M0-6 | 2 locale `en`/`vi` hoạt động, mặc định `en` | TV2 | <span class="nw">✅ Xong</span> | Bằng chứng: Ảnh 2 trạng thái |
| ☐ | M0-7 | Hồ sơ D-U-N-S đã nộp, có mã hồ sơ | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Việc của Founder, chưa có bằng chứng trong repo. Bằng chứng: Email xác nhận. Tinh gọn: D-U-N-S chỉ dùng để mở tài khoản Apple Developer/Google Play cho app native; E12 hoãn và ngân sách tinh gọn bỏ Apple Developer nên không còn là tiêu chí M0 |

### 3.5. Demo

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S0-Demo-1 | Mở terminal máy sạch, `git clone` + `docker compose up`, gọi `curl localhost:3000/api/v1/health` → `{"status":"ok"}` | TV1 | <span class="nw">🟡 Một phần</span> | Chạy được trên localhost; staging chưa có. |
| ☐ | S0-Demo-2 | Mở trình duyệt vào tên miền staging → trang Next.js chào mừng, bấm nút đổi ngôn ngữ EN ↔ VI | TV2 + TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Staging cập nhật bằng deploy một lệnh của TV1 |
| ☐ | S0-Demo-3 | Cầm iPhone thật lên, mở app dev build, đi qua 3 màn hình khung | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Không có app native; demo tương đương là mở PWA trên điện thoại ở L9 |
| ☐ | S0-Demo-4 | Push 1 commit vô hại lên `develop` ngay trong buổi demo → mọi người xem CI chạy và staging tự cập nhật sau ~6 phút | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Không còn auto-deploy: sau khi CI xanh, TV1 chạy lệnh deploy ngay trong buổi demo |

### 3.6. Việc ngoài SP

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S0-Ops-1 | Nộp hồ sơ D-U-N-S Number (miễn phí, 5–14 ngày làm việc) — đây là việc chặn dài nhất của cả dự án, làm ngày đầu tiên | Founder | <span class="nw">⚪ Chưa xác nhận</span> | Tinh gọn: Không còn chặn lịch vì app native và phát hành cửa hàng đã hoãn; nộp vẫn miễn phí nếu muốn giữ đường cho bản native sau ra mắt |
| ☐ | S0-Ops-2 | Mở tài khoản Google Play Console (25 USD một lần) — làm ngay vì chính sách closed testing 14 ngày tính từ lúc có tester | Founder | <span class="nw">⚪ Chưa xác nhận</span> | Tinh gọn: Chỉ cần cho app native trên Google Play (E12 hoãn); không còn chặn M5/M6, Founder quyết mở sớm hay dời |
| ☐ | S0-Ops-3 | Đăng ký tên miền + email doanh nghiệp | Founder | <span class="nw">⚪ Chưa xác nhận</span> | — |
| ☐ | S0-Ops-4 | Chốt danh sách 20 organizer mục tiêu để tiếp cận từ S2 | Founder | <span class="nw">⚪ Chưa xác nhận</span> | Tinh gọn: Tiếp cận từ L2 (trùng lịch S2), giữ nguyên theo NT-1 |

### 3.7. Bổ sung kịch bản tinh gọn

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | TG-M0-1 | Ký gói Designer thuê ngoài trọn gói: design token + 20 màn hình, giao trong 4 tuần (45 triệu VND, GĐ A) · MUST | Founder | <span class="nw">⬜ Chưa làm</span> | Bên giao là Thuê ngoài: Designer; việc bàn giao theo dõi ở TG-M2-1 (khoảng 19/10, đầu L3). Doc 00 đặt hạn token trước 21/09 nên phải ký trong hạn trượt M0 (23/09). DEC-TOKENS (M2) phải chốt trước khi gửi brief vì @dnc/tokens đang lệch doc 10 §12 (E1-S5). Đề xuất đổi phần tài sản cửa hàng trong gói sang icon/splash PWA + ảnh OG vì E12 hoãn; TV1 nạp token vào @dnc/tokens |
| ☐ | TG-M0-2 | Chốt quy trình nghiệm thu tinh gọn: Founder ký DoD-9 (người thứ hai xác nhận), các thành viên code review chéo story của nhau · MUST | Founder + TV1 | <span class="nw">⬜ Chưa làm</span> | Không có QA thường trực (08:1526). TV1 bật yêu cầu 1 approve từ một thành viên khác trên develop (S0-DoD-3). Founder ký DoD-9 trên staging cho mọi story L0–L12 và cho từng gate M1–M6. Đây là mục duy nhất của quy trình này, đã gộp các bản lặp ở M1–M5. Chấp nhận tỷ lệ lỗi lọt ra staging cao hơn |


<div class="pb"></div>

## 4. M1 · API nền + Auth — chốt 02/10/2026

**Sprint:** L1 · **Tổng:** 49 mục · ✅ 11 · 🟡 7 · ⬜ 18 · ⛔ 2 · ❓ 6 · ⚪ 2 · ✂️ 3 · **Tỷ lệ xong:** 24%

**SP theo người (còn lại / trong phạm vi):** TV1 3 / 8 · TV2 24 / 32 · TV3 0 / 0

**Mục tiêu:**

- L1 — 21/09 – 02/10/2026: Auth email + Google, refresh rotation, RBAC enum 5 role, `trust_signals`

**Nếu trượt:** M1 không được trượt. Đây là mắt xích đường găng cứng nhất phía kỹ thuật — toàn bộ E3, E4, E6 đều chờ nó. Trượt M1 thì trượt hết. Phương án khẩn: cắt E2-S5 (Facebook) và E2-S6 (đặt lại mật khẩu) sang S2, dồn 2 người vào E2-S2 và E2-S9. Tinh gọn: E2-S4 và E2-S5 đã cắt, E2-S9 đã hoãn và E2-S2 đã xong, nên phương án khẩn là dời E1-S9 (Sentry chỉ cần trước khi staging có người dùng thật, tức beta L10) và E2-S6 sang L2, dồn TV2 vào E2-S1 và E2-S3 (Google trên web), TV1 hỗ trợ E2-S1 khi xong phần L0 còn tồn.

### 4.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | CH-01 | Nghĩa vụ xác thực SĐT Việt Nam theo NĐ 147/2024: mọi tài khoản hay chỉ tài khoản đăng nội dung công khai. | Founder + Luật sư | <span class="nw">❓ Cần chốt</span> | Hạn 21/09. Code đang ngầm chọn "không bắt buộc". Tinh gọn: Nếu bắt buộc cho mọi tài khoản thì dùng OTP của nhà cung cấp có sẵn (E3-S6 chỉ còn 2 SP, nhóm B) |
| ☑ | MT-17 | Chốt tên guard/decorator trust và RBAC (code: TrustLevelGuard/@MinTrustLevel; doc: TrustTierGuard/@MinTrust). | TV1 | <span class="nw">✅ Xong</span> | Hạn 21/09; chặn E2-S7. Chốt 24/09/2026: giữ tên code TrustLevelGuard/@MinTrustLevel; guard mới là RolesGuard/@Roles, thứ tự JwtAuthGuard → RolesGuard → TrustLevelGuard (D-07: role trước trust). Kế hoạch và nghiệm thu: .agent/specs/_changes/rbac-admin-shell/. |
| ☐ | MT-16 | user_status_enum 5 hay 8 giá trị (enum Postgres không xoá được giá trị). | TV2 | <span class="nw">❓ Cần chốt</span> | Hạn 02/10. |
| ☑ | PERM-MATRIX | Vị trí PERMISSION_MATRIX máy đọc được (doc 00: packages/shared-types; doc 01: apps/api/…/authz/) + test describe.each T-1→T-5. | TV1 | <span class="nw">✅ Xong</span> | Hạn 21/09. Chốt 24/09/2026: packages/domain/src/permission-matrix.ts (STAFF_ROLES, SYSTEM_HEALTH_ROLES, PERMISSION_MATRIX), dùng chung cho RolesGuard ở API và menu/chặn route ở web admin; có unit test. |
| ☐ | ADR-C9 | Có tách schema identity_secret cho bảng xác thực mới không (ADR-0000 mục C9). | Founder + TV1 | <span class="nw">❓ Cần chốt</span> | Hạn ký 07/09 đã qua. Tinh gọn: Founder ký ADR; TV1 đề xuất phương án và viết migration nếu chốt tách schema |
| ☐ | TOKEN-MOBILE | Một cơ chế trả refresh token dùng chung cho web (cookie), mobile (SecureStore) và social login; đổi hợp đồng packages/contracts. | TV2 | <span class="nw">❓ Cần chốt</span> | Chặn E2-S3, E2-S4, E2-S9. Cổng phê duyệt: đổi packages dùng chung. Tinh gọn: Nhánh mobile (SecureStore) hoãn cùng E2-S9; chỉ cần chốt cookie cho web/PWA + Google, để hợp đồng mở sẵn cho bản native sau này |
| ☐ | BR-30 | Nội dung Điều khoản / Chính sách quyền riêng tư và cơ chế consent_records (NĐ 13/2023 + Luật 91/2025). | Founder + Luật sư | <span class="nw">❓ Cần chốt</span> | Cần luật sư xác nhận. Tinh gọn: Founder soạn bản thảo mẫu, luật sư chỉ rà soát và ký xác nhận (gói pháp lý 55 triệu); vẫn phải theo Luật 91/2025 |
| ☐ | ACC-APPLE-GOOGLE | Xác nhận tài khoản Apple Developer tổ chức / D-U-N-S; tạo Google OAuth client (3 ID: web, iOS, Android). | Founder + TV2 | <span class="nw">⚪ Chưa xác nhận</span> | Tinh gọn: Chỉ cần Google OAuth client cho web/PWA; không mua Apple Developer, D-U-N-S và 2 client iOS/Android thôi chặn vì E2-S4 bị cắt, bản native hoãn |
| ☐ | OWNERS | Gán người phụ trách cho T-10, T-11, T-12, T-14 trong ACTIVE_TASKS. | TV1 | <span class="nw">⬜ Chưa làm</span> | Cột người phụ trách đang trống. Tinh gọn: Gán theo đội tinh gọn: T-10, T-11, T-12 cho TV2; T-14 cho TV1; T-11 chỉ còn Google |
| ☑ | INFRA-MAIL | Nối mail client (SMTP → Mailpit) dùng chung cho E2-S1 và E2-S6. | TV1 | <span class="nw">✅ Xong</span> | Xong 24/09/2026: MailModule gửi qua SMTP (mặc định Mailpit), chặn người nhận theo MAIL_ALLOWED_DOMAINS cho staging, không ghi địa chỉ email vào log (e2e mail.e2e.spec.ts gửi thật và đọc lại từ Mailpit). |
| ☑ | INFRA-REDIS | Nối Redis client (ioredis / BullMQ) cho rate limit E2-S10 và job trust:recompute (T-13). | TV1 | <span class="nw">✅ Xong</span> | Xong 24/09/2026: RedisModule có hai client (cache 6381, queue 6380 cấu hình sẵn cho BullMQ), kết nối lười, log khi mất và khi khôi phục kết nối, đóng sạch khi tắt app (enableShutdownHooks). Hàng đợi BullMQ tạo cùng E7-S1. |
| ☐ | SEC-JWT-LOG | Vá lỗi ghi khoá riêng JWT ra log debug khi thiếu JWT_PRIVATE_KEY (auth.service.ts:107), trước khi bật log tập trung. | TV2 | <span class="nw">⬜ Chưa làm</span> | Lỗi bảo mật. |
| ☐ | T-14 | Dựng Playwright ở apps/web-client-side/e2e/, chạy cả WebKit. | TV1 | <span class="nw">⬜ Chưa làm</span> | Ba bug chỉ-có-ở-client đã lọt lưới. Tinh gọn: Không có QA thường trực: TV1 dựng khung, mỗi thành viên viết E2E cho chức năng của mình; QA thuê ngoài chỉ chạy 2 đợt trước beta và trước ra mắt |

### 4.2. Story

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | E2-S1 | Đăng ký email + xác minh email (8 SP) · MUST | TV2 | <span class="nw">🟡 Một phần</span> | Đăng ký có nhưng cấp phiên + T1 ngay; chưa có token xác minh, endpoint verify, gửi mail (Mailpit đã chạy). Tinh gọn: Xác minh chỉ làm trên web/PWA; màn web do TV2 làm (MK-AUTH-02) |
| ☑ | E2-S2 | JWT access 15 phút + refresh 30 ngày xoay vòng, phát hiện tái sử dụng (8 SP) · MUST | TV2 | <span class="nw">✅ Xong</span> | Access 15 phút + refresh 30 ngày xoay vòng; test e2e "dùng lại token → thu hồi cả họ" (auth.e2e.spec.ts:323). |
| ☐ | E2-S3 | Đăng nhập Google (5 SP) · MUST | TV2 | <span class="nw">⛔ Bị chặn</span> | Chờ khung Expo (E1-S6), bảng social_accounts, endpoint /auth/social, Google OAuth client. Tinh gọn: Chỉ làm Google trên web/PWA, không còn chờ khung Expo (E1-S6 hoãn); vẫn chờ bảng social_accounts, endpoint /auth/social và OAuth client web |
| ☐ | E2-S4 | Đăng nhập Apple (Guideline 4.8) (5 SP) · MUST | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Như E2-S3, thêm tài khoản Apple Developer tổ chức / D-U-N-S. Tinh gọn: Cắt theo nhóm A: Guideline 4.8 chỉ áp dụng cho app trên App Store; giữ Google + email |
| ☐ | E2-S6 | Đặt lại mật khẩu qua email (3 SP) · MUST | TV2 | <span class="nw">⬜ Chưa làm</span> | Chưa có luồng quên / đặt lại mật khẩu. Tinh gọn: Màn quên/đặt lại mật khẩu trên web do TV2 làm (MK-AUTH-03); là việc dời đầu tiên nếu L1 quá tải |
| ☑ | E2-S7 | Enum role toàn cục 5 giá trị + guard RBAC (5 SP) · MUST | TV1 | <span class="nw">✅ Xong</span> | Enum 5 role đã đúng; chưa có RolesGuard/@Roles, chỉ có TrustLevelGuard. Tinh gọn: Thuộc danh sách không bao giờ cắt Xong 24/09/2026: thêm RolesGuard/@Roles và endpoint staff GET /api/v1/admin/system/health; 9 ca e2e admin-system-health.e2e.spec.ts. Kế hoạch và nghiệm thu: .agent/specs/_changes/rbac-admin-shell/. |
| ☐ | E2-S8 | Màn đăng nhập/đăng ký web, trạng thái lỗi rõ ràng (5 SP) · MUST | TV2 | <span class="nw">🟡 Một phần</span> | Màn đăng nhập/đăng ký web có; thiếu nhánh lỗi 429, locale đang viết cứng "en" (auth-form.tsx:85). Tinh gọn: Là màn đăng nhập duy nhất trên điện thoại (PWA thay app native), phải dùng tốt ở khổ màn hình mobile |
| ☐ | E2-S9 | Giữ phiên trên mobile, token trong secure storage (8 SP) · MUST | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Refresh token chỉ trả qua cookie httpOnly; phải chốt cơ chế cho mobile trước khi code. Tinh gọn: Hoãn theo nhóm A, 7 tháng đầu không có repo mobile; phiên trên web/PWA giữ bằng cookie httpOnly + refresh 30 ngày (E2-S2) |
| ☐ | E2-S10 | Rate limit endpoint xác thực, chặn dò mật khẩu (3 SP) · MUST | TV2 | <span class="nw">⬜ Chưa làm</span> | Chưa có rate limit; Redis đã chạy trong compose nhưng chưa nối client. |
| ☐ | E1-S9 | Sentry + log tập trung (3 SP) · MUST | TV1 | <span class="nw">⬜ Chưa làm</span> | Chưa có Sentry / log tập trung. Tinh gọn: Không có trong trọng tâm của 10.4 nhưng cũng không bị cắt; giữ ở L1 như §6.2 |

### 4.3. DoD bổ sung

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S1-DoD-1 | Migration tạo cột `users.role` kiểu enum đúng 5 giá trị chữ thường: `member`, `curator`, `moderator`, `admin`, `super_admin`. Mặc định `member`. Không có giá trị `guest`, `organizer`, `verified_member`, `support` trong enum — kiểm tra bằng một test đọc `pg_enum` và so khớp đúng 5 phần tử | TV1 | <span class="nw">🟡 Một phần</span> | Enum đúng 5 giá trị; chưa có test đọc pg_enum. |
| ☐ | S1-DoD-2 | Migration tạo cột `users.trust_level` kiểu `smallint`, `CHECK (trust_level BETWEEN 0 AND 5)`, mặc định `0` | TV1 | <span class="nw">🟡 Một phần</span> | Cột có; đăng ký đang cấp thẳng T1 (TRUST_LEVEL_ON_REGISTER), phải về 0 khi có xác minh email. |
| ☐ | S1-DoD-3 | Bảng `trust_signals` đã tạo (append-only), có `REVOKE UPDATE, DELETE` cho vai trò ứng dụng | TV1 | <span class="nw">⬜ Chưa làm</span> | DDL đầy đủ đã có ở doc 03 §4.5, chỉ còn viết migration. |
| ☑ | S1-DoD-4 | Test e2e luồng tái sử dụng refresh token: dùng lại token đã xoay → toàn bộ họ token của thiết bị đó bị thu hồi, trả 401 | TV2 | <span class="nw">✅ Xong</span> | auth.e2e.spec.ts:323. |
| ☑ | S1-DoD-5 | Test guard: `member` gọi endpoint chỉ dành cho `moderator` → 403, không phải 404 và không phải 500 | TV1 | <span class="nw">✅ Xong</span> | Chưa có RolesGuard. Xong 24/09/2026: member gọi endpoint chỉ dành cho admin → 403 ROLE_NOT_ALLOWED (không 404/500), body không liệt kê role hợp lệ (e2e ca #2). Chưa có endpoint chỉ dành cho moderator nên test dùng endpoint admin. |
| ☐ | S1-DoD-6 | Đăng nhập Apple chạy thật trên thiết bị iOS thật, không phải simulator | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Chờ khung Expo + tài khoản Apple Developer. Tinh gọn: Chỉ dùng để kiểm Apple trên iOS native, mà E2-S4 đã bị cắt |
| ☐ | S1-DoD-7 | Rate limit: 10 lần đăng nhập sai/IP/15 phút → 429 có header `Retry-After` | TV2 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S1-DoD-8 | Sổ đăng ký xử lý dữ liệu cá nhân đã có 3 dòng đầu: email, mật khẩu băm, định danh nhà cung cấp social | Founder + TV2 | <span class="nw">⬜ Chưa làm</span> | Phụ thuộc DoD S0 sổ đăng ký. Tinh gọn: Dòng định danh nhà cung cấp social chỉ còn Google (Apple, Facebook đã cắt); TV2 cung cấp danh sách trường dữ liệu |

### 4.4. Nghiệm thu

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | M1-1 | Đăng ký + xác minh email chạy end-to-end trên web và mobile | TV2 | <span class="nw">🟡 Một phần</span> | Web có đăng ký nhưng chưa có xác minh email; mobile chưa có. Bằng chứng: Video 2 nền tảng. Tinh gọn: Phần mobile nghiệm thu bằng trình duyệt điện thoại/PWA thay app native; quay video trên desktop + điện thoại |
| ☐ | M1-2 | Đăng nhập Google và Apple chạy trên thiết bị thật, không phải simulator | TV2 | <span class="nw">⛔ Bị chặn</span> | Bằng chứng: Video thiết bị. Tinh gọn: Chỉ còn Google trên Android và iPhone thật qua trình duyệt/PWA; phần Apple bị cắt theo E2-S4 |
| ☑ | M1-3 | Refresh token rotation có test e2e, gồm ca tái sử dụng token đã xoay → thu hồi cả họ | TV2 | <span class="nw">✅ Xong</span> | Bằng chứng: Báo cáo test |
| ☐ | M1-4 | `users.role` là enum đúng 5 giá trị `member`/`curator`/`moderator`/`admin`/`super_admin`; không có `guest`, `organizer`, `verified_member`, `support` | TV1 | <span class="nw">🟡 Một phần</span> | Thiếu test pg_enum. Bằng chứng: Test đọc `pg_enum` |
| ☑ | M1-5 | Guard RBAC chặn đúng: `member` gọi endpoint `moderator` → 403 | TV1 | <span class="nw">✅ Xong</span> | Bằng chứng: Test e2e Đạt 24/09/2026: curator/moderator/member → 403, admin/super_admin → 200 (e2e ca #2–6). |
| ☐ | M1-6 | `users.trust_level` `smallint` 0–5 đã có, mặc định 0; bảng `trust_signals` append-only đã có | TV1 | <span class="nw">🟡 Một phần</span> | trust_signals chưa có. Bằng chứng: Migration + kiểm tra quyền |
| ☐ | M1-7 | Rate limit endpoint xác thực hoạt động, trả 429 có `Retry-After` | TV2 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Kịch bản test |
| ☐ | M1-8 | Sổ đăng ký hoạt động xử lý dữ liệu cá nhân đã mở, có ≥ 3 mục | Founder + TV2 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: File sổ đăng ký |

### 4.5. Demo

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S1-Demo-1 | Trên web: đăng ký bằng email thật → nhận mail xác minh → bấm xác minh → vào được khu vực đã đăng nhập | TV2 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S1-Demo-2 | Trên iPhone thật: đăng nhập bằng Apple ID → đóng app hoàn toàn → mở lại sau 10 phút → vẫn đăng nhập | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Bỏ phần Apple ID vì E2-S4 đã cắt; vẫn demo trên iPhone thật qua Safari: đăng nhập email/Google → đóng hẳn trình duyệt → mở lại sau 10 phút → vẫn đăng nhập (cookie httpOnly + refresh 30 ngày của E2-S2, TV2 cấu hình cookie); bản thêm vào màn hình chính kiểm lại ở L9 |
| ☐ | S1-Demo-3 | Trên Android thật: đăng nhập Google một chạm | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Demo qua Chrome/PWA trên Android thật (Google một chạm trên web), không cần app native |
| ☐ | S1-Demo-4 | Demo bảo mật: lấy refresh token cũ trong Postman gọi lại → cả họ token bị thu hồi, thiết bị bị đá ra | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Bước 'thiết bị bị đá ra' minh hoạ bằng phiên trình duyệt/PWA |
| ☑ | S1-Demo-5 | Demo RBAC: đổi `role` của tài khoản demo trong DB từ `member` sang `moderator` → endpoint kiểm duyệt mở ra ngay lần gọi kế tiếp | TV1 | <span class="nw">✅ Xong</span> | Đạt 24/09/2026, cách demo đúng: đổi role trong DB → gọi bằng token cũ vẫn 403 (role nằm trong JWT) → refresh hoặc đăng nhập lại → 200. Dùng cặp member → admin qua GET /api/v1/admin/system/health (e2e ca #7–8). |

### 4.6. Việc ngoài SP

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S1-Ops-0 | theo dõi hồ sơ D-U-N-S; nếu quá 14 ngày chưa có kết quả thì mở ticket với Dun & Bradstreet — đây là ngưỡng cảnh báo đường găng đầu tiên. | Founder | <span class="nw">⚪ Chưa xác nhận</span> | Tinh gọn: Không còn là ngưỡng đường găng vì bỏ Apple Developer và hoãn E12; chỉ theo dõi để giữ đường cho bản native sau ra mắt |

### 4.7. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | MK-AUTH-01 | Chốt form đăng ký theo UC-01: 3 trường, mật khẩu ≥ 10 ký tự + 4 điều kiện, 2 ô đồng ý tách riêng không tích sẵn, không báo "email đã tồn tại". Code hiện có trường handle, mật khẩu ≥ 12, trả EMAIL_TAKEN. | Founder + TV2 | <span class="nw">❓ Cần chốt</span> | — |
| ☐ | MK-AUTH-02 | Màn "Check your inbox": mã 6 số, gửi lại sau 60 giây (tối đa 5 lần / 24 giờ), đổi email 1 lần, khoá 15 phút sau 5 lần sai; trang link thành công / hết hạn / đã dùng / mở trên máy khác. | TV2 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-AUTH-03 | Đặt lại mật khẩu: màn gửi mail trung tính (không lộ email), đăng xuất mọi phiên khác sau khi đổi. | TV2 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-AUTH-04 | Social login: màn "email này đã có tài khoản — đăng nhập để liên kết", không tự hợp nhất. | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Chỉ còn Google trên web/PWA; Apple và Facebook đã cắt nên không còn nhánh mobile native |


<div class="pb"></div>

## 5. M2 · Tạo & khám phá sự kiện — chốt 13/11/2026

**Sprint:** L2, L3, L4 · **Tổng:** 72 mục · ✅ 0 · 🟡 11 · ⬜ 45 · ⛔ 0 · ❓ 5 · ⚪ 1 · ✂️ 10 · **Tỷ lệ xong:** 0%

**SP theo người (còn lại / trong phạm vi):** TV1 77 / 77 · TV2 16 / 16 · TV3 5 / 5

**Mục tiêu:**

- L2 — 05/10 – 16/10/2026: Mô hình sự kiện + PostGIS + `areas` 6 khu vực MVP, hồ sơ cá nhân, ảnh qua dịch vụ có sẵn
- L3 — 19/10 – 30/10/2026: Tạo / sửa / huỷ sự kiện, form web một trang có tự lưu nháp, trang chi tiết + SEO/OG
- L4 — 02/11 – 13/11/2026: API lọc hyperlocal (khu vực · loại hình · thời gian · ngôn ngữ · phí), trang khám phá

**Nếu trượt:** M2 đã có sẵn cơ chế ba nấc (§6.7). Nếu nấc 1 (web) trượt quá 1 tuần thì đây là điều kiện dừng cấp 1 — dừng nhận story mới, họp lại phạm vi trong 48 giờ, cân nhắc đòn bẩy 1 (thuê Mobile hợp đồng) hoặc rơi sang §10. Tinh gọn: M2 chỉ còn nấc web (M2+/M2++ hoãn cùng nhánh native) và không còn đòn bẩy thuê Mobile hợp đồng. Nếu L2–L4 trượt quá 1 tuần thì đòn bẩy phạm vi còn lại là nhóm C §10.2 (08:1608), chỉ áp khi Founder ký. Trong M2, nhóm C chỉ chạm E5-S3, mục mà NT-2 (08:1554) ghi giữ nguyên, nên phải giải mâu thuẫn này khi ký.

### 5.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | DEC-HOME-DISCOVER | Tách Trang chủ (tin tức + sự kiện do staff đăng) và Discover (sự kiện do thành viên đăng). Cập nhật doc 10 §3 và doc 14 J2; quyết định số phận composer / bài đăng cộng đồng đang ở "/" (module post). | Founder + TV1 | <span class="nw">❓ Cần chốt</span> | Quyết định của chủ dự án 19/09; lệch tài liệu hiện hành. Tinh gọn: Tách Trang chủ + tin tức là phạm vi ngoài 359 SP tinh gọn; Founder phải chỉ ra phần bù trước khi nhận |
| ☐ | DEC-SWIPE | Chế độ lướt kiểu Tinder trong Discover: bật ngay từ MVP hay giữ cổng G1 (≥ 40 sự kiện mở / 7 ngày) + G2 (≥ 12 thẻ hợp lệ / người) theo doc 14 §8. | Founder | <span class="nw">❓ Cần chốt</span> | Doc 14 khuyến nghị sớm nhất M4–M5. Tinh gọn: Lịch L0–L12 không có SP cho swipe; nếu bật phải cắt phần khác |
| ☐ | DEC-ONBOARDING | Onboarding theo UC-05 (6 khu vực, bước 3 là ngôn ngữ) thay cho F-02 doc 10 (12 khu vực, bước 3 là expat_type). | Founder | <span class="nw">❓ Cần chốt</span> | — |
| ☐ | DEC-WEEKSTART | Ngày đầu tuần cho bộ lọc "Tuần này": Thứ Hai cho cả EN/VI hay theo ngôn ngữ. | Founder | <span class="nw">❓ Cần chốt</span> | Mockup Trang chủ dùng Thứ Hai; lịch Discover đổi theo ngôn ngữ. |
| ☐ | DEC-TOKENS | Design token: doc 10 §12 (teal #0E7C74 + Inter) hay code (xanh #0EA5E9 + Be Vietnam Pro). | TV1 | <span class="nw">❓ Cần chốt</span> | Mockup theo code. Tinh gọn: Phải chốt trước khi Founder gửi brief cho Designer thuê ngoài (TG-M0-1; doc 00 đặt hạn token trước 21/09), dù mục nằm ở checklist M2; @dnc/tokens hiện lệch doc 10 §12 (xem E1-S5); TV1 áp token vào web |

### 5.2. Story

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | E4-S1 | Mô hình dữ liệu sự kiện + PostGIS + `areas` (8 SP) · MUST | L2 | TV1 | <span class="nw">🟡 Một phần</span> | Module event + PostGIS + bảng areas đã có. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E4-S2 | API tạo hoạt động: nháp → đăng (8 SP) · MUST | L3 | TV1 | <span class="nw">🟡 Một phần</span> | Tạo và đăng sự kiện chạy end-to-end trên web. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E4-S3 | API sửa / huỷ hoạt động (5 SP) · MUST | L3 | TV1 | <span class="nw">🟡 Một phần</span> | API sự kiện CRUD đầy đủ. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E4-S4 | Ảnh bìa + ảnh minh hoạ (5 SP) · MUST | L2 | TV1 | <span class="nw">🟡 Một phần</span> | Module media + MinIO đã có. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. Tinh gọn: Ảnh đi qua dịch vụ lưu ảnh có sẵn của E3-S2 |
| ☐ | E4-S6 | Form tạo hoạt động nhiều bước trên web, tự lưu nháp, xem trước (8 SP) · MUST | L3 | TV1 | <span class="nw">🟡 Một phần</span> | Web đang dùng một form đơn; doc yêu cầu wizard 4 bước + tự lưu nháp + xem trước (mockup ③ create-1…4). Tinh gọn: Rút gọn còn 8 SP: một trang cuộn dài + tự lưu nháp, không chia bước, không xem trước đầy đủ; form một trang hiện có đã đúng hướng; tối ưu điện thoại (bù E4-S7) làm ở L9 (M5) |
| ☐ | E3-S1 | Tạo hồ sơ: ảnh, giới thiệu, ngôn ngữ, khu vực, sở thích (8 SP) · MUST | L2 | TV2 | <span class="nw">🟡 Một phần</span> | Module profile + profile-editor đã có; chưa có onboarding 3 bước. Tinh gọn: Hồ sơ chỉ sửa trên web (E3-S5 hoãn); TV2 làm onboarding/profile-editor |
| ☐ | E3-S2 | Tải ảnh nhanh + phục vụ qua CDN (3 SP) · MUST | L2 | TV2 | <span class="nw">🟡 Một phần</span> | Upload lên MinIO có tiến độ; chưa có CDN. Tinh gọn: Dùng dịch vụ lưu ảnh có sẵn thay pipeline tự dựng, còn 3 SP; phụ thuộc nhà cung cấp, chi phí theo lưu lượng |
| ☐ | E5-S1 | Từ điển khu vực Đà Nẵng có ranh giới thật (5 SP) · MUST | L2 | TV3 | <span class="nw">🟡 Một phần</span> | Seed 6 khu vực + polygon trong packages/geo; ranh giới thật chưa được Product ký duyệt. Tinh gọn: Phần còn lại chủ yếu là Founder ký duyệt ranh giới 6 khu vực (không viết code); TV3 sửa polygon trong packages/geo và seed; không bao giờ cắt (NT-2) |
| ☐ | E2-S5 | Đăng nhập Facebook (3 SP) · SHOULD |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Nhóm B CẮT, thu hồi 3 SP: chỉ giữ email + Google; mất một phần expat quen dùng Facebook |
| ☐ | E1-S10 | Công tắc đổi ngôn ngữ EN ↔ VI trên web + mobile (5 SP) · MUST | L2 | TV2 | <span class="nw">🟡 Một phần</span> | Web có công tắc EN/VI; mobile chưa có app. Tinh gọn: Không có app native: phần mobile là web trên trình duyệt điện thoại; chuỗi VI tạm tới khi nạp bản dịch thuê ngoài ở L11 |
| ☐ | E5-S2 | API lọc: loại hình, khu vực, thời gian, ngôn ngữ, mức phí (13 SP) · MUST | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Không bao giờ cắt (NT-2) |
| ☐ | E5-S3 | Truy vấn bán kính quanh vị trí người dùng (8 SP) · MUST | L4 | TV1 | <span class="nw">🟡 Một phần</span> | Truy vấn bán kính PostGIS có trong module event. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. Tinh gọn: Nhóm C nhưng vẫn giữ: quyết định 19/09 chỉ cắt A+B, và NT-2 (08:1554) cũng ghi giữ nguyên; chỉ hoãn khi Founder ký dùng nhóm C |
| ☐ | E5-S4 | Tìm theo từ khoá ("badminton") (5 SP) · MUST | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S5 | Trang khám phá web: chip lọc, sắp xếp, tải thêm (9 SP) · MUST | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Rút gọn còn 9 SP: chip lọc cơ bản + tải thêm; bỏ sắp xếp theo khoảng cách ở bản đầu |
| ☐ | E5-S6 | Bản đồ Đà Nẵng, gom cụm điểm theo khu vực (8 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Nhóm B HOÃN chỉ phần hiển thị bản đồ, KHÔNG hoãn lọc khu vực; thay bằng danh sách nhóm theo 6 khu vực (TG-M2-4) |
| ☐ | E4-S8 | Trang chi tiết sự kiện công khai, SEO + OG image (8 SP) · MUST | L3 | TV1 | <span class="nw">🟡 Một phần</span> | Trang /events/[id] có; chưa kiểm SEO/OG image. Tinh gọn: Giữ nguyên: thay màn chi tiết mobile (E4-S9 hoãn) và là cửa vào chính từ Facebook/Google khi không có cửa hàng ứng dụng |
| ☐ | E4-S9 | Màn chi tiết hoạt động trên mobile + deep link chia sẻ (8 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Nhóm A HOÃN: không có app native; trang chi tiết web E4-S8 thay thế |
| ☐ | E12-S1 | 3 profile EAS Build + versioning tự động (5 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Nhóm A HOÃN toàn bộ E12; không phát hành cửa hàng ở M6 |

### 5.3. DoD bổ sung

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S2-DoD-1 | Cột chủ sự kiện đặt tên đúng `events.host_user_id`. Chạy `grep -rn "creator_id\\|organizer_id" apps/api/src` phải trả về rỗng | L2 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-2 | `events.status` là enum chữ thường: `draft`, `published`, `cancelled`, `completed` | L2 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-3 | Mọi `events` được tạo đều sinh tối thiểu 1 dòng `event_occurrences` — kể cả sự kiện không lặp lại. Có test: tạo sự kiện đơn → `SELECT count() FROM event_occurrences WHERE event_id = ?` trả về đúng `1` | L2 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-4 | `starts_at` / `ends_at` lưu UTC; form nhập theo `Asia/Ho_Chi_Minh` và test có ca nhập 23:30 giờ Việt Nam để bắt lỗi lệch ngày | L3 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: TV1 viết ca Playwright nhập 23:30 trên form web (không có QA thường trực) |
| ☐ | S2-DoD-5 | Index `GIST` trên `events.location` đã có; `EXPLAIN` một truy vấn `ST_DWithin` cho thấy dùng index | L2 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-6 | Bảng `areas` seed phân cấp đầy đủ, nhưng bộ lọc chỉ phơi ra đúng 6 khu vực MVP: An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn. Có test kiểm tra endpoint `GET /api/v1/areas?mvp=true` trả đúng 6 phần tử | L2 | TV3 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-7 | `events.source` ∈ `self_serve` \| `curated`, bắt buộc, không null | L2 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-8 | Ảnh: giới hạn 8 MB/ảnh, tự nén, sinh 3 kích cỡ, trả qua CDN, thời gian tải ảnh bìa trên 4G mô phỏng < 1,5 giây | L2 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nén, 3 kích cỡ và CDN do dịch vụ lưu ảnh có sẵn đảm nhận; TV2 cấu hình và đo trên 4G mô phỏng |
| ☐ | S3-DoD-1 | `GET /api/v1/events` phân trang bằng cursor `(starts_at, id)`, không dùng `OFFSET` | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-2 | Kiểm thử hiệu năng: seed 10.000 sự kiện + 30.000 occurrence, `p95 < 200 ms` cho truy vấn có đủ 5 điều kiện lọc; kết quả đo dán vào issue | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-3 | Trả kèm `facets` đếm theo category và theo area; chip lọc hiển thị badge số thật, không phải số giả | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-4 | Cache Redis TTL 60 giây, có test chứng minh cache bị huỷ khi có sự kiện mới `published` trong cùng `area_id` | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-5 | Lọc "An Thượng" trả về đúng tập sự kiện nằm trong polygon `an-thuong`, đối chiếu thủ công 10 sự kiện mẫu | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Founder đối chiếu thủ công 10 mẫu với tư cách người thứ hai (DoD-9) |
| ☐ | S3-DoD-6 | Trang chi tiết đạt Lighthouse SEO ≥ 95, có `og:image` sinh động (tiêu đề + ngày + khu vực), đọc được không cần đăng nhập, không cần cài app | L3 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-7 | Deep link `danangconnect://events/{id}` và universal link HTTPS đều mở đúng màn hình trên iOS và Android thật |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Scheme danangconnect:// và universal link chỉ có nghĩa khi có app native (E4-S9 hoãn); link HTTPS mở trang web đã được kiểm ở S3-DoD-6 và M2-9 |
| ☐ | S3-DoD-8 | Bản đồ: 500 điểm không làm rớt khung hình dưới 45 fps trên máy tầm trung |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Chỉ kiểm bản đồ web đã hoãn (E5-S6) |

### 5.4. Nghiệm thu

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | M2-1 | Tạo, sửa, huỷ hoạt động trên web hoạt động đầy đủ, gồm tự lưu nháp và xem trước |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video. Tinh gọn: Xem trước chỉ ở mức rút gọn của E4-S6 (form một trang); Founder ký nghiệm thu theo tiêu chí đã rút |
| ☐ | M2-2 | Mỗi `events` sinh tối thiểu 1 `event_occurrences`, kể cả sự kiện không lặp lại |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test + truy vấn SQL |
| ☐ | M2-3 | Cột chủ sự kiện tên đúng `events.host_user_id`; grep `creator_id`/`organizer_id` rỗng |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Kết quả grep |
| ☐ | M2-4 | Bộ lọc phơi đúng 6 khu vực MVP: An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn |  | TV1 + TV3 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh giao diện + test API |
| ☐ | M2-5 | Lọc theo loại hình / khu vực / khoảng thời gian / ngôn ngữ / mức phí đều đúng, có `facets` đếm thật |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video + so khớp 10 mẫu |
| ☐ | M2-6 | Truy vấn bán kính `ST_DWithin` dùng index GIST; `p95 < 200 ms` với 10.000 sự kiện |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo đo + `EXPLAIN`. Tinh gọn: Giữ vì E5-S3 (nhóm C) không bị cắt |
| ☐ | M2-7 | Bản đồ Đà Nẵng hiển thị đúng khu vực, gom cụm, ≥ 45 fps với 500 điểm |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Bằng chứng: Video. Tinh gọn: Bản đồ web hoãn (E5-S6); nghiệm thu thay bằng danh sách nhóm theo 6 khu vực (TG-M2-4) |
| ☐ | M2-8 | Trang chi tiết công khai đọc được không cần đăng nhập, Lighthouse SEO ≥ 95, `og:image` sinh động |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo Lighthouse + preview Facebook |
| ☐ | M2-9 | Mobile: xem chi tiết + deep link chia sẻ hoạt động trên thiết bị thật |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video. Tinh gọn: Không có app native: nghiệm thu trang chi tiết web trên iPhone + Android thật và chia sẻ link HTTPS; deep link vào app hoãn cùng E4-S9 |
| ☐ | M2-10 | (nấc M2+, hạn 13/11) Feed khám phá mobile · (nấc M2++, hạn 27/11) Tạo sự kiện trên mobile |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Bằng chứng: Video từng nấc. Tinh gọn: Nấc M2+ (E5-S7) và M2++ (E4-S7) hoãn cùng nhánh native; bù bằng form web tối ưu điện thoại, dán được link Google Maps, và PWA ở L9 (M5) |

### 5.5. Demo

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S2-Demo-1 | Đăng nhập bằng tài khoản thật → hoàn thiện hồ sơ có ảnh, ngôn ngữ nói, khu vực "An Thượng" | L2 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Làm trên web; hồ sơ mobile (E3-S5) hoãn |
| ☐ | S2-Demo-2 | Tạo hoạt động "Sunday Beach Volleyball · My Khe" qua form 4 bước, thoát giữa chừng, quay lại → nháp còn nguyên | L3 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Form một trang thay form 4 bước (E4-S6 rút gọn); vẫn chứng minh nháp còn nguyên |
| ☐ | S2-Demo-3 | Đăng hoạt động → mở lại API `GET /api/v1/events/{id}` cho thấy `host_user_id`, `status: "published"`, `source: "self_serve"`, và đúng 1 occurrence | L3 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-Demo-4 | Chạy SQL trực tiếp trên staging chứng minh `location` rơi đúng trong polygon `my-khe` | L2 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-Demo-5 | Đổi ngôn ngữ sang tiếng Việt trên cả web và mobile, toàn bộ nhãn đổi theo | L2 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Phần mobile = web trên trình duyệt điện thoại; chuỗi VI tạm tới khi nạp bản dịch thuê ngoài ở L11 |
| ☐ | S3-Demo-1 | Trang khám phá web: bấm chip "My An" + "Language exchange" + "Weekend" → danh sách rút còn đúng những buổi phù hợp, badge số trên chip khớp | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-2 | Bật định vị trình duyệt tại văn phòng → "trong 2 km quanh tôi" trả kết quả hợp lý | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Chỉ lọc bán kính; không sắp xếp theo khoảng cách (E5-S5 rút gọn) |
| ☐ | S3-Demo-3 | Gõ "badminton" → kết quả hiện dưới 300 ms | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-4 | Chuyển sang chế độ bản đồ → cụm điểm theo khu vực, bấm cụm thì mở ra |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Chế độ bản đồ hoãn (E5-S6); demo thay bằng danh sách nhóm theo 6 khu vực (TG-M2-4) |
| ☐ | S3-Demo-5 | Copy link một sự kiện, dán vào ô soạn bài Facebook → preview hiện ảnh OG đúng | L3 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-6 | Quét deep link bằng iPhone thật → app mở thẳng màn chi tiết sự kiện đó |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Chỉ có ở app native: deep link mở thẳng app (E4-S9 hoãn, cùng lý do cắt S3-DoD-7); PWA trên iOS không bắt được link nên không thay thế được; việc mở link trên điện thoại thật đã được kiểm ở M2-9 |

### 5.6. Việc ngoài SP

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S2-Ops-0 | Community Manager bắt đầu playbook curate — mở sổ theo dõi 20 organizer mục tiêu, ghi nguồn công khai, chưa nhập vào hệ thống (chờ Admin Console ở S6, giai đoạn này nhập vào bảng tính). | L2 | Founder | <span class="nw">⚪ Chưa xác nhận</span> | Tinh gọn: Admin Curation Console dời sang L8 (04/01/2027); nhập bảng tính tới khi đó |

### 5.7. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | MK-NEWS-01 | Bảng news_articles (song ngữ, tag, related_event_id, published / relevant / evergreen) + GET /api/v1/news, /news/:id. |  | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Ngoài 359 SP tinh gọn; chỉ nhận khi DEC-HOME-DISCOVER chốt và Founder chỉ ra phần bù |
| ☐ | MK-NEWS-02 | Trang chủ biên tập: tin nổi bật + lưới tin, khối "Picked by our team" (SourceBadge + dòng nguồn + Interested), hàng Hướng dẫn, trang đọc bài. |  | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Ngoài 359 SP tinh gọn; chỉ nhận khi DEC-HOME-DISCOVER chốt và Founder chỉ ra phần bù |
| ☐ | MK-TIME-01 | Bộ lọc Hôm nay / Tuần này / Tháng này / Chọn ngày cho Trang chủ và Discover; from/to theo Asia/Ho_Chi_Minh, lưu UTC; giữ trên URL; sự kiện lặp hiện một thẻ. |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: API from/to đã nằm trong E5-S2 (L4); chip thời gian trên Discover có thể đi cùng chip lọc cơ bản của E5-S5; phần Trang chủ phụ thuộc DEC-HOME-DISCOVER, ngoài 359 SP |
| ☐ | MK-DISC-01 | Discover chỉ sự kiện events.source = self_serve; thẻ có ★ điểm host + 💬 số bình luận; sắp xếp Top rated; khối "What people say". |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Điểm host, bình luận, Top rated ngoài 359 SP tinh gọn; cần Founder chốt phần bù |
| ☐ | MK-DETAIL-01 | Trang chi tiết: bình luận trả lời 1 cấp, host ghim, sắp xếp Mới nhất / Nổi bật; "Xem bản dịch" chỉ khi khác ngôn ngữ giao diện (nối comment API có sẵn, T-05). |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Ngoài 359 SP tinh gọn; comment API đã có (T-05), cần Founder chốt phần bù trước khi nhận |
| ☐ | MK-SWIPE-01 | Swipe trong dòng (PA B): Lưu / Chia sẻ / Bỏ qua, toast hoàn tác 6 giây, nút ♡ và ⋯ luôn hiện; bảng occurrence_dismissals (hết hạn 14 ngày). |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Khoảng 11 ngày-người theo doc 14. Tinh gọn: Không có nhánh mobile: chỉ web/PWA; khoảng 11 ngày-người ngoài 359 SP, phụ thuộc DEC-SWIPE |
| ☐ | MK-SWIPE-02 | Deck "Plan your week" (tối đa 12 thẻ, vuốt phải = Lưu, kéo lên mở sheet xác nhận RSVP, màn tổng kết cảnh báo trùng giờ). |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Chỉ làm nếu DEC-SWIPE chốt bật. Tinh gọn: Chỉ web/PWA; ngoài 359 SP, chỉ làm nếu DEC-SWIPE chốt bật |

### 5.8. Bổ sung kịch bản tinh gọn

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | TG-M2-1 | Nhận bàn giao gói Designer thuê ngoài: design token + 20 màn hình + tài sản hình ảnh, trong 4 tuần kể từ ngày ký · MUST | L3 | Thuê ngoài: Designer | <span class="nw">⬜ Chưa làm</span> | Hợp đồng 45 triệu (GĐ A) do Founder ký ở TG-M0-1. Ký trong tuần 21/09 thì hạn giao khoảng 19/10 (đầu L3), kịp form E4-S6 và trang chi tiết E4-S8 ở L3, trang khám phá E5-S5 ở L4. Phần 'tài sản cửa hàng' của gói (08:1518) đổi sang icon/splash PWA + ảnh OG vì E12 hoãn, chờ Founder chốt. Founder duyệt bản giao; TV1 nạp token vào @dnc/tokens; mỗi thành viên dựng màn hình thuộc chức năng của mình. |
| ☐ | TG-M2-4 | Danh sách sự kiện nhóm theo 6 khu vực MVP, mỗi khu vực có ảnh đại diện — thay cho bản đồ web (E5-S6 hoãn); lọc theo khu vực giữ nguyên · MUST | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | Thay nghiệm thu M2-7 và demo S3-Demo-4; ảnh đại diện lấy từ gói Designer (TG-M2-1) hoặc TV1 tự làm; doc 08 chưa ước lượng SP |
| ☐ | TG-M2-5 | Playwright E2E cho luồng M2 trên web: tạo/sửa/huỷ + tự lưu nháp, lọc 6 khu vực + facets, trang chi tiết công khai không cần đăng nhập · MUST | L4 | TV1 | <span class="nw">⬜ Chưa làm</span> | Thay kiểm thử của QA thường trực; chạy trên hạ tầng Playwright của T-14 (M1); TV1 giữ e2e API theo DoD-3 |
| ☐ | TG-M2-6 | Điểm kiểm soát ngân sách tinh gọn tại M2: đã tiêu ≈ 255 triệu — sản phẩm đã chạy được trên staging chưa? Nếu không: dừng tuyển, rà soát lại đội · MUST | L4 | Founder | <span class="nw">⬜ Chưa làm</span> | §11.4 ghi 30/10/2026 theo lịch đủ đội; kịch bản tinh gọn đối chiếu tại gate 13/11/2026 |


<div class="pb"></div>

## 6. M3 · RSVP + Waitlist + Thông báo — chốt 11/12/2026

**Sprint:** L5, L6 · **Tổng:** 40 mục · ✅ 0 · 🟡 4 · ⬜ 33 · ⛔ 0 · ❓ 1 · ⚪ 0 · ✂️ 2 · **Tỷ lệ xong:** 0%

**SP theo người (còn lại / trong phạm vi):** TV1 52 / 52 · TV2 0 / 0 · TV3 0 / 0

**Mục tiêu:**

- L5 — 16/11 – 27/11/2026: RSVP + sức chứa + WAITLIST, hàng đợi BullMQ
- L6 — 30/11 – 11/12/2026: Dịch vụ thông báo, email, nhắc T‑24h và T‑2h, Web Push cho PWA

**Nếu trượt:** M3-3 (waitlist) là MUST của MVP, không được hoãn. Nếu tuần W09 kết thúc mà E6-S3 chưa xong, cắt ngay E5-S7 khỏi S4 và dồn toàn bộ nhánh backend vào RSVP. Nấc M2+ lùi sang S5. Tinh gọn: E5-S7 đã hoãn theo nhóm A nên không còn story mobile để cắt thay. Nếu hết L5 (27/11/2026) mà E6-S3 chưa xong thì dời MK-MY-01, MK-MY-02 và MK-MY-03 (đều là việc của TV1: GET /me/agenda, giữ chỗ 12 giờ, .ics feed) ra khỏi M3 để TV1 dồn sức vào waitlist; MK-RSVP-01 chỉ là việc web nên giữ lại. L6 còn trống khoảng 7 SP để nhận phần dời từ L5. Không dùng nhóm C để bù (chỉ dùng khi buộc giữ ngày 18/03/2027, 08:1558). Mốc M3 vẫn là 11/12/2026.

### 6.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | DEC-MYEVENTS | Gộp W-40 / W-44 / W-46 thành một màn "Sự kiện của tôi" dạng agenda; cập nhật doc 10. | Founder + TV1 | <span class="nw">❓ Cần chốt</span> | Tinh gọn: W-44 Đã lưu rơi khỏi phạm vi (E5-S10 hoãn); W-40 chỉ còn danh sách lọc theo host_user_id (E4-S10 rút gọn), nên màn gộp chủ yếu là W-46 cộng một danh sách tổ chức đơn giản |

### 6.2. Story

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | E6-S1 | Mô hình `rsvps` gắn vào `event_occurrences`, có sức chứa + danh sách chờ (8 SP) · MUST | L5 | TV1 | <span class="nw">🟡 Một phần</span> | Module rsvp + schema event_occurrences có. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E6-S2 | Đăng ký / rút đăng ký, không bao giờ vượt sức chứa (8 SP) · MUST | L5 | TV1 | <span class="nw">🟡 Một phần</span> | Giữ chỗ dưới row lock, không vượt sức chứa. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E6-S3 | Đôn tự động từ danh sách chờ khi có người rút — MUST của MVP (5 SP) · MUST | L5 | TV1 | <span class="nw">🟡 Một phần</span> | Huỷ chỗ đôn người đầu hàng chờ trong cùng transaction nhưng chuyển thẳng "confirmed", chưa giữ chỗ 12 giờ, chưa thông báo (T-16). Tinh gọn: mốc tinh gọn là xong trong L5, trước 27/11/2026 (thay mốc 06/11 của đủ đội); không bao giờ cắt |
| ☐ | E6-S7 | Nút đăng ký trên trang chi tiết web, hiện số chỗ còn lại (5 SP) · MUST | L5 | TV1 | <span class="nw">🟡 Một phần</span> | Nút Join/Waitlist trên card và /events/[id] có. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. Tinh gọn: số chỗ còn lại cập nhật bằng polling 30 giây khi trang đang mở. Đây là 2 SP còn lại của E7-S5 (CẮT WebSocket, 08:1597), nên tải thực của dòng này là 7 SP. Trang phải dùng tốt trên điện thoại vì không còn app native |
| ☐ | E7-S1 | Hàng đợi BullMQ + worker riêng + retry theo cấp số nhân (5 SP) · MUST | L5 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E7-S2 | Dịch vụ thông báo, template song ngữ EN/VI theo ngôn ngữ người nhận (8 SP) · MUST | L6 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: giữ song ngữ EN/VI 8 SP vì chỉ nhóm C mới rút gọn mục này. TV1 làm dịch vụ và chọn ngôn ngữ theo người nhận, TV1 đặt khoá template EN/VI trong packages/i18n. Bản VI viết tạm cùng lúc với bản EN, dịch giả thuê ngoài rà lại khi nạp bản dịch ở L11 |
| ☐ | E7-S3 | Expo Push tới thiết bị thật (3 SP) · MUST | L6 | TV1 + TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: thay Expo Push bằng Web Push (VAPID) cho PWA. TV1 lưu subscription và gửi, TV2 làm client trong service worker (dùng chung với PWA). iOS ≥ 16.4 chỉ nhận được khi người dùng đã thêm app vào màn hình chính, nên muốn kiểm trên iPhone thì cần manifest tối thiểu ngay ở L6 (chờ Founder + TV1 chốt; phần còn lại của gói PWA vẫn ở L9). Tỷ lệ nhận thấp hơn native |
| ☐ | E7-S4 | Email xác nhận RSVP + email nhắc (5 SP) · MUST | L6 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: email là kênh chủ lực vì push trên PWA yếu hơn native; chừa sẵn link huỷ đăng ký trong footer cho bản rút gọn của E7-S7 |
| ☐ | E7-S8 | Nhắc T‑24h và T‑2h (5 SP) · MUST | L6 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: không bao giờ cắt; nhắc T‑2h chỉ đi qua push nên trên PWA chỉ tới người đã bật Web Push, nhắc T‑24h qua email là chủ lực |
| ☐ | E5-S7 | Feed khám phá mobile + bảng lọc kéo lên (nấc M2+) (13 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn theo nhóm A, không có repo mobile trong 7 tháng đầu; trên điện thoại dùng trang khám phá web (L4) của TV1 và PWA (L9) của TV2; Founder giữ trong backlog sau ra mắt |

### 6.3. DoD bổ sung

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S4-DoD-1 | Bảng `rsvps` có cột `occurrence_id` tham chiếu `event_occurrences(id)`. Không có cột `event_id` trong `rsvps` — kiểm tra bằng test đọc `information_schema.columns` | L5 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-2 | `UNIQUE (occurrence_id, user_id)` | L5 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-3 | `rsvps.status` là enum chữ thường: `going`, `waitlisted`, `cancelled`, `checked_in`, `no_show` | L5 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-4 | Nhận chỗ dùng `SELECT ... FOR UPDATE` trên hàng `event_occurrences`, tính cả `guest_count`; `going_count` / `waitlist_count` cập nhật trong cùng transaction | L5 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-5 | Test tải bắt buộc: 200 request đồng thời vào occurrence có `capacity = 50` → đúng 50 `going`, 150 `waitlisted`, thứ tự `position` liên tục 1..150, không có lỗ. Chạy 3 lần liên tiếp đều cho kết quả như nhau | L5 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: không có QA thường trực nên TV1 tự viết và chạy k6; TV2 hoặc TV3 kiểm chéo kết quả |
| ☐ | S4-DoD-6 | Test đôn waitlist: người thứ 12 rút → người `position = 1` chuyển sang `going`, `position` của phần còn lại dồn lên, người được đôn nhận push + email + in-app trong ≤ 60 giây | L6 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: push là Web Push trên PWA; không còn trung tâm thông báo (E7-S6 hoãn) nên kênh in-app cần Founder + TV1 chốt cách hiểu |
| ☐ | S4-DoD-7 | Endpoint chính hoạt động: `POST /api/v1/occurrences/{occurrenceId}/rsvps`, `DELETE /api/v1/occurrences/{occurrenceId}/rsvps/me`, `GET /api/v1/occurrences/{occurrenceId}/attendees` | L5 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-8 | Đường tắt `POST /api/v1/events/{eventId}/rsvps` trỏ tới occurrence sắp diễn ra gần nhất; có test khẳng định trả 409 khi event có nhiều hơn một occurrence sắp tới | L5 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-9 | Nhắc T‑24h và T‑2h chạy đúng theo giờ địa phương `Asia/Ho_Chi_Minh` của sự kiện; có test cho sự kiện lúc 07:00 sáng (nhắc T‑24h rơi vào 07:00 hôm trước, T‑2h rơi vào 05:00 — kiểm tra không bị đẩy sang khung giờ cấm) | L6 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-10 | Job nhắc chống gửi trùng: chạy lại worker 3 lần không tạo thêm bản ghi gửi nào (khoá idempotency theo `rsvp_id + reminder_type`) | L6 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-DoD-11 | Không đăng ký được vào sự kiện đã bắt đầu hoặc đã `cancelled` → 422 có mã lỗi rõ | L5 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |

### 6.4. Nghiệm thu

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | M3-1 | `rsvps` gắn vào `occurrence_id`; bảng không có cột `event_id` |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test đọc `information_schema` |
| ☐ | M3-2 | 200 RSVP đồng thời vào 50 chỗ → đúng 50 `going`, 150 `waitlisted`, `position` liên tục, lặp 3 lần đều đúng |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo k6 |
| ☐ | M3-3 | Waitlist đôn tự động khi có người rút; người được đôn nhận push + email + in-app trong ≤ 60 giây. Story E6-S3 phải xong trước 06/11/2026 |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video + log job. Tinh gọn: mốc 06/11/2026 trong câu chữ là của đủ đội; theo tinh gọn, E6-S3 xong trong L5 (trước 27/11/2026); push là Web Push trên PWA; kênh in-app không còn trung tâm thông báo, chờ Founder + TV1 chốt |
| ☐ | M3-4 | `POST /api/v1/occurrences/{occurrenceId}/rsvps` là endpoint chính |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Swagger + test |
| ☐ | M3-5 | `POST /api/v1/events/{eventId}/rsvps` trỏ tới occurrence sắp tới gần nhất và trả 409 khi có nhiều occurrence sắp tới |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test e2e |
| ☐ | M3-6 | Push tới thiết bị thật (iOS + Android), không phải simulator |  | TV1 + TV2 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video 2 máy. Tinh gọn: giữ tiêu chí nhưng chuyển sang Web Push trên PWA: một máy Android Chrome và một iPhone iOS ≥ 16.4 đã thêm app vào màn hình chính, vẫn quay video trên 2 máy thật. Phần iPhone cần manifest tối thiểu từ L6 (xem E7-S3) |
| ☐ | M3-7 | Email xác nhận gửi đúng ngôn ngữ người nhận (EN mặc định, VI nếu chọn) |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: 2 ảnh hộp thư. Tinh gọn: email tiếng Việt dùng bản VI tạm viết trong E7-S2. Bản dịch thuê ngoài chỉ nạp ở L11, nên câu chữ VI ở gate M3 chưa qua dịch giả |
| ☐ | M3-8 | Nhắc T‑24h và T‑2h bắn đúng giờ địa phương `Asia/Ho_Chi_Minh`, chống gửi trùng khi chạy lại worker |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Log + test idempotency |
| ☐ | M3-9 | Enum `rsvps.status` chữ thường: `going`, `waitlisted`, `cancelled`, `checked_in`, `no_show` |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Migration |

### 6.5. Demo

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S4-Demo-1 | Chạy script k6 ngay trên màn hình: 200 RSVP đồng thời vào 50 chỗ → bảng kết quả 50/150 | L5 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: có thể chiếu lại trong buổi gate M3 ngày 11/12/2026 |
| ☐ | S4-Demo-2 | Trên iPhone thật: rút đăng ký của một người đang `going` → điện thoại người đứng đầu danh sách chờ rung ngay tại chỗ với thông báo "You're in!" | L6 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: chạy trên PWA đã thêm vào màn hình chính của iPhone (iOS ≥ 16.4) và nhận Web Push thay Expo Push. Cần manifest tối thiểu từ L6 (xem E7-S3) |
| ☐ | S4-Demo-3 | Kiểm tra hộp thư: email xác nhận tiếng Anh cho tài khoản `en`, tiếng Việt cho tài khoản `vi` | L6 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: hộp thư VI dùng bản template VI tạm của E7-S2; dịch giả thuê ngoài rà lại ở L11 |
| ☐ | S4-Demo-4 | Chỉnh giờ máy chủ staging để mô phỏng mốc T‑24h và T‑2h → hai đợt nhắc bắn đúng, không trùng | L6 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-Demo-5 | Feed khám phá trên mobile, kéo bảng lọc lên, lọc theo khu vực |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: bỏ theo E5-S7 (hoãn, nhóm A); khám phá trên điện thoại được demo qua trang khám phá web (M2) và PWA (L9) |

### 6.6. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | MK-MY-01 | "Sự kiện của tôi": thẻ Next up (đếm ngược, địa chỉ chính xác, chỉ đường, QR điểm danh, chat nhóm), dải tuần, chip lọc, timeline, khối Past nhắc review; GET /me/agenda. |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Route /my-events hiện là BlankScreen. Tinh gọn: chỉ làm trên web/PWA, không có native; bỏ QR điểm danh khỏi thẻ Next up vì E6-S5 rút gọn thành tick tay |
| ☐ | MK-MY-02 | Lời mời từ hàng chờ giữ chỗ 12 giờ (held + hold_expires_at) + thông báo (T-16). |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: lời mời giữ chỗ gửi qua email (kênh chính) cộng Web Push; không có trung tâm thông báo để xem lại |
| ☐ | MK-MY-03 | Đồng bộ lịch cá nhân (.ics feed) + cảnh báo huỷ muộn khi còn < 2 giờ (BR-10). |  | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-RSVP-01 | Sheet xác nhận RSVP bắt buộc với sự kiện có phí, ≤ 10 chỗ (cổng T2), bắt đầu trong < 2 giờ, nhận lời mời hàng chờ. |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: chỉ làm trên web/PWA; nhánh mobile native hoãn |


<div class="pb"></div>

## 7. M4 · Trust & Safety tối thiểu — chốt 25/12/2026

**Sprint:** L7 · **Tổng:** 40 mục · ✅ 0 · 🟡 0 · ⬜ 35 · ⛔ 0 · ❓ 2 · ⚪ 0 · ✂️ 3 · **Tỷ lệ xong:** 0%

**SP theo người (còn lại / trong phạm vi):** TV1 8 / 8 · TV2 0 / 0 · TV3 26 / 26

**Mục tiêu:**

- L7 — 14/12 – 25/12/2026: Trust & Safety: report, block, xử lý kiểm duyệt, trust level T0–T3 tự động

**Nếu trượt:** M4-8 và M4-9 là điều kiện chặn cứng để mở beta — không có chính sách đã thẩm định thì không được thu thập dữ liệu của 100 người thật. Nếu luật sư chưa xác nhận kịp, lùi ngày mời beta wave 1 chứ không mở beta bằng bản thảo chưa thẩm định. Tinh gọn: beta kín còn 60 người, mở ở L10 (15/02/2027); M4-8 và M4-9 vẫn là điều kiện chặn cứng, luật sư xác nhận trễ thì lùi mời beta wave 1 và M5 (26/02/2027) trượt theo. Story M4 trượt khỏi L7 thì không có chỗ đệm: sau 25/12 là tuần đóng băng 28/12 – 01/01, rồi L8 đã kín 28 SP cho Admin Curation Console (NT-1, không cắt).

### 7.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | DEC-REVIEWS | Reviews (UC-16, đang Should) có vào MVP không; cửa sổ đánh giá 7 ngày (doc 05) hay 14 ngày (doc 03). | Founder | <span class="nw">❓ Cần chốt</span> | Tinh gọn: Backlog tinh gọn 359 SP không có Reviews; nếu đưa vào MVP phải chỉ rõ story bị đẩy ra để giữ 28 SP/sprint |
| ☐ | DEC-TRUST-LABELS | Thống nhất nhãn trust T0–T5: code i18n (Restricted / New member / Verified / Regular / Trusted / Community host) với doc 05 §5.3 (New / Email verified / Phone verified / Active member / Trusted / Community leader); doc 10 §12.6 còn thang cũ. | Founder + TV1 | <span class="nw">❓ Cần chốt</span> | Liên quan nghiệm thu M4-5, M4-6. Tinh gọn: Thang T0–T5 không được đổi dù E3-S3 bị rút gọn |

### 7.2. Story

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | E8-S1 | Báo cáo hoạt động / người dùng (5 SP) · MUST | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: TV3 làm nút báo cáo và chọn lý do trên web/PWA, thay cho app native |
| ☐ | E8-S2 | Chặn người dùng (5 SP) · MUST | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: TV3 làm cả thao tác chặn trên web/PWA lẫn API chặn hai chiều |
| ☐ | E8-S3 | Hàng đợi kiểm duyệt xếp theo mức nghiêm trọng + thời gian chờ (3 SP) · MUST | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nhóm B rút gọn 8 → 3 SP: bảng report lọc theo mức, xử lý tay; SLA P0 = 2 giờ vẫn giữ, do Founder trực |
| ☐ | E8-S4 | Ẩn nội dung / gỡ hoạt động / khoá tài khoản, có ghi lý do & người thực hiện (5 SP) · MUST | TV3 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E8-S5 | Community Guidelines + màn đồng ý trước khi tham gia (3 SP) · MUST | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Founder soạn nội dung Guidelines; TV3 dựng màn đồng ý trên web/PWA |
| ☐ | E8-S8 | Nhãn "Verified organizer" (3 SP) · SHOULD | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nhóm C, vẫn trong phạm vi; chỉ hoãn nếu phải giữ ngày 18/03/2027 |
| ☐ | E3-S3 | Trust level T0–T5 trên hồ sơ, tính bằng job BullMQ (5 SP) · MUST | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Giữ nguyên thang T0–T5; job chỉ tự tính T0–T3, còn T4 và T5 do Founder gán tay hằng tuần |
| ☐ | E7-S6 | Trung tâm thông báo trong app và trên web (8 SP) · SHOULD | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Hoãn sau ra mắt; dùng email + Web Push, email là bản lưu thông báo cũ |
| ☐ | E9-S1 | Khu vực quản trị riêng, đăng nhập tách biệt, audit log (5 SP) · MUST | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: §10.4 tính E9-S1 vào L8 (E9 tinh gọn 5 + 8 + 8 + 5 + 2 = 28 SP, vừa khít L8), nhưng bảng report E8-S3 ở L7 cần khu admin có đăng nhập riêng + audit log; tạm giữ ở M4/L7, chờ Founder + TV3 chốt (xem conflicts) |
| ☐ | E4-S7 | Tạo hoạt động trên mobile dưới 90 giây (nấc M2++) (13 SP) · MUST | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Hoãn app native; mất thông điệp 90 giây, bù bằng form web tối ưu điện thoại (TV1) |

### 7.3. DoD bổ sung

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S5-DoD-1 | `users.trust_level` không bao giờ được ghi trực tiếp bởi luồng nghiệp vụ. Mọi thay đổi đều do job BullMQ `trust-level-recompute` thực hiện; có test khẳng định service RSVP và service auth không có quyền `UPDATE` cột này | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Việc Founder gán tay T4/T5 cũng phải ghi thành tín hiệu rồi để job ghi bậc, không UPDATE thẳng cột |
| ☐ | S5-DoD-2 | `trust-level-recompute` chạy mỗi giờ và chạy ngay sau mỗi `report_upheld`; đọc toàn bộ `trust_signals` của user rồi ghi lại bậc | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Job chỉ tự xét T0–T3; T4–T5 lấy từ tín hiệu gán tay hằng tuần của Founder |
| ☐ | S5-DoD-3 | Grep toàn repo không còn dấu vết thang cũ: `grep -rniE "trust_score\|reputation_score\|verified_member\|established\|ambassador"` phải rỗng. Không tồn tại bất kỳ thang điểm 0–100 nào | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-4 | Nhãn hiển thị đúng 6 chuỗi i18n: `T0 New`, `T1 Email verified`, `T2 Phone verified`, `T3 Active member`, `T4 Trusted`, `T5 Community leader` | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: TV1 nạp khoá en + vi; bản VI chuẩn do Thuê ngoài: Dịch giả, nạp ở L11 |
| ☐ | S5-DoD-5 | Tín hiệu âm (`no_show_recorded`, `report_upheld`) chỉ moderator thấy; người dùng thường gọi API hồ sơ người khác không nhận được các trường này — có test 2 vai trò | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-6 | Hàng đợi kiểm duyệt tính thời gian còn lại của SLA theo bảng ở §5.9: P0 = 2 giờ, P1 = 12 giờ, P2 = 48 giờ, P3 = 72 giờ. Ticket sắp quá hạn nhuộm màu cảnh báo | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Áp lên bảng report rút gọn của E8-S3; vẫn đủ 4 mức SLA, Founder trực P0 |
| ☐ | S5-DoD-7 | Mọi hành động moderator ghi vào `moderation_actions` bất biến: ai, lúc nào, đối tượng nào, lý do gì, hành động gì | TV3 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-8 | Chặn hai chiều: A chặn B thì B không thấy nội dung của A, không RSVP vào sự kiện của A, không nhắn được cho A — test cả hai chiều | TV3 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-DoD-9 | Community Guidelines song ngữ đã đăng ở URL công khai, có phiên bản và ngày hiệu lực | Founder + TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Founder soạn nội dung; bản VI lấy trước từ gói dịch giả thuê ngoài (TG-M4-3); TV3 đăng trang |

### 7.4. Nghiệm thu

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | M4-1 | Báo cáo hoạt động và báo cáo người dùng đều hoạt động, có phân loại lý do | TV3 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video. Tinh gọn: Quay video trên web/PWA; Founder là người thứ hai xác nhận thay QA (DoD-9 chung ở §6.1, không phải S5-DoD-9) |
| ☐ | M4-2 | Chặn người dùng có hiệu lực hai chiều | TV3 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test 2 tài khoản |
| ☐ | M4-3 | Hàng đợi kiểm duyệt xếp theo mức nghiêm trọng và thời gian chờ; SLA P0 = 2 giờ hiển thị đồng hồ đếm ngược | TV3 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh giao diện. Tinh gọn: Nghiệm thu trên bảng report rút gọn (E8-S3 còn 3 SP): vẫn xếp theo mức + thời gian chờ, đếm ngược P0 2 giờ |
| ☐ | M4-4 | Ẩn nội dung / gỡ hoạt động / khoá tài khoản đều ghi `moderation_actions` bất biến (ai, lúc nào, lý do) | TV3 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn SQL |
| ☐ | M4-5 | Trust level T0–T5 hiển thị trên hồ sơ với đúng 6 nhãn quy định; tính bằng job `trust-level-recompute` | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh 6 hồ sơ mẫu. Tinh gọn: T0–T3 do job tự tính; hai hồ sơ mẫu T4 và T5 dựng từ tín hiệu Founder gán tay |
| ☐ | M4-6 | Không tồn tại thang điểm 0–100 hay enum `new/verified/established/trusted/ambassador` trong repo | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Kết quả grep |
| ☐ | M4-7 | Tín hiệu âm chỉ moderator thấy; người dùng thường không đọc được qua API | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test 2 vai trò |
| ☐ | M4-8 | Community Guidelines và Privacy Policy đã công bố ở URL công khai, song ngữ, có phiên bản và ngày hiệu lực | Founder + TV3 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Link công khai. Tinh gọn: Vẫn là điều kiện chặn beta 60 người ở L10 (15/02/2027); bản VI Guidelines đặt dịch giả thuê ngoài làm trước (TG-M4-3); bản VI Privacy Policy không thuộc gói dịch giả (chuỗi UI + 3 trang nội dung) nên đi theo gói pháp lý M4-9 |
| ☐ | M4-9 | Privacy Policy soạn theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 (hiệu lực từ 01/01/2026), có tham chiếu Nghị định 13/2023/NĐ-CP ở phần lịch sử. CẦN LUẬT SƯ XÁC NHẬN trước khi công bố | Founder + Luật sư | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Thư xác nhận của luật sư. Tinh gọn: Gói pháp lý rút gọn 55 triệu: Founder soạn bản thảo mẫu, luật sư chỉ rà soát và ký xác nhận; vẫn theo Luật 91/2025 |

### 7.5. Demo

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S5-Demo-1 | Tài khoản A báo cáo sự kiện của B với lý do "lừa đảo" → ticket vào hàng đợi mức P0, đồng hồ SLA 2 giờ bắt đầu chạy | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Báo cáo gửi từ web/PWA; ticket P0 hiện trên bảng report rút gọn, Founder là người trực nhận |
| ☐ | S5-Demo-2 | Moderator gỡ sự kiện, ghi lý do → sự kiện biến khỏi khám phá ngay, người đã RSVP nhận thông báo huỷ | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Thông báo huỷ đi qua email + Web Push, không còn Expo Push hay trung tâm thông báo |
| ☐ | S5-Demo-3 | Chạy `report_upheld` cho B → job recompute chạy ngay, `trust_level` của B tụt về T2, nhãn trên hồ sơ đổi ngay | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-Demo-4 | Tài khoản C xác minh số điện thoại bằng OTP → lên T2 (tính năng OTP giao ở S6, demo bằng seed tín hiệu) | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: OTP dùng nhà cung cấp có sẵn (E3-S6 còn 2 SP), chưa có ở L7 nên vẫn demo bằng seed tín hiệu |
| ☐ | S5-Demo-5 | Trên iPhone thật, bấm đồng hồ: tạo một hoạt động từ màn hình chính tới lúc đăng — dưới 90 giây | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Hoãn cùng E4-S7 (không có app native); thông điệp 90 giây bị mất, bù bằng form web tối ưu điện thoại |

### 7.6. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | MK-REV-01 | Bảng reviews (chỉ người đã check-in, double-blind, kiểm duyệt qua hàng đợi) + POST /occurrences/{id}/reviews, GET /users/{handle}/reviews. | TV1 | <span class="nw">⬜ Chưa làm</span> | DDL đầy đủ ở doc 03 §8.5. Tinh gọn: Chờ DEC-REVIEWS; không có trong backlog tinh gọn 359 SP nên chưa xếp sprint L |
| ☐ | MK-REV-02 | Khối Reviews trên trang chi tiết (điểm, phân bố sao, "Verified attendee", Helpful, Report) + màn viết review. | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Chờ DEC-REVIEWS; không có trong backlog tinh gọn 359 SP nên chưa xếp sprint L |

### 7.7. Bổ sung kịch bản tinh gọn

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | TG-M4-1 | Founder gán tay T4 và T5 hằng tuần (T4: đã đạt T3 + host ≥ 3 occurrence hoàn tất + tỷ lệ no-show ≤ 15% trong 10 lần gần nhất; T5: đề cử thủ công, xét lại mỗi quý) bằng thao tác ghi tín hiệu, để job `trust-level-recompute` ghi bậc · MUST | Founder | <span class="nw">⬜ Chưa làm</span> | TV1 làm thao tác ghi tín hiệu trong E3-S3 (5 SP); Founder xét mỗi tuần khi đã có người dùng thật, §10.2 không đặt mốc dừng; cần chốt signal_type cho T4 (xem conflicts) |
| ☐ | TG-M4-2 | Founder nhận ca trực kiểm duyệt thay Community Manager (đủ đội: 09:00 và 17:00 hằng ngày, Founder ngoài giờ): chốt lịch trực và kênh nhận ticket P0 mới để giữ SLA P0 = 2 giờ, diễn tập cùng S5-Demo-1 · MUST | Founder | <span class="nw">⬜ Chưa làm</span> | Trực thật từ khi có người dùng beta (L10); trước đó chỉ có dữ liệu staging. Kênh báo ticket P0 mới tới Founder (email/Web Push) cần TV3 làm trong L7 |
| ☐ | TG-M4-3 | Đặt dịch giả thuê ngoài dịch trước bản tiếng Việt của trang Community Guidelines (thuộc gói 3 trang nội dung) để kịp S5-DoD-9 và M4-8 · MUST | Thuê ngoài: Dịch giả | <span class="nw">⬜ Chưa làm</span> | Founder ký hợp đồng dịch giả trọn gói 12 triệu ngay ở bước này (gói gồm cả chuỗi UI + About/FAQ gửi ở L10, TG-M5-10), đặt việc và duyệt nội dung. TV3 đăng trang song ngữ; chuỗi UI nạp ở L11 (E10-S2). Bản VI Privacy Policy không thuộc gói dịch giả mà đi theo M4-9 |


<div class="pb"></div>

## 8. M5 · Beta kín 60 user — chốt 26/02/2027

**Sprint:** L8, L9, L10 · **Tổng:** 64 mục · ✅ 0 · 🟡 0 · ⬜ 58 · ⛔ 0 · ❓ 0 · ⚪ 0 · ✂️ 6 · **Tỷ lệ xong:** 0%

**SP theo người (còn lại / trong phạm vi):** TV1 30 / 30 · TV2 17 / 17 · TV3 31 / 31

**Mục tiêu:**

- L8 — 04/01 – 15/01/2027: Admin Curation Console + luồng chuyển giao organizer (NT-1, không cắt)
- L9 — 18/01 – 29/01/2027: PWA: manifest, service worker, add-to-home, tối ưu điện thoại; xuất & xoá dữ liệu cá nhân
- L10 — 15/02 – 26/02/2027: Beta kín 60 user (giảm từ 100 vì không còn kênh cửa hàng ứng dụng), trực hotfix hằng ngày

**Nếu trượt:** M5 có 2 tuần đệm tự nhiên (đóng băng cuối năm + S8). Nếu M5-7 trượt vì Play closed testing bắt đầu muộn thì đây là rủi ro chặn M6 — xem §8.3. Tinh gọn: Không còn 2 tuần đệm, và M5-7 đã hoãn cùng E12. Đóng băng Tết 01–12/02/2027 nằm giữa L9 và L10 nên E8-S7, PWA và thư xác nhận Privacy Policy của luật sư (M4-9) phải xong trong L9. M5 trượt thì M6 01/04/2027 trượt theo, vì L11 bắt đầu ngay 01/03/2027.

### 8.1. Story

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | E9-S2 | Nhập sự kiện công khai vào hệ thống < 3 phút, có ghi nguồn (8 SP) · MUST | L8 | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Giữ nguyên 100% theo NT-1; Founder kiêm Community Manager là người nhập |
| ☐ | E9-S3 | Lời mời organizer gốc nhận quyền quản lý listing (8 SP) · MUST | L8 | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Giữ nguyên 100% theo NT-1; Founder gửi lời mời và giữ quan hệ organizer |
| ☐ | E9-S4 | Quản lý người dùng, khu vực, loại hình hoạt động (5 SP) · MUST | L8 | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Giữ nguyên 5 SP vì không cắt nhóm C (Founder không phải chạy SQL trực tiếp trên production); thao tác gán tay T4/T5 đã nằm ở E3-S3 (L7, TG-M4-1), không làm lại ở đây |
| ☐ | E9-S5 | Bảng điều khiển vận hành cho Founder (2 SP) · MUST | L8 | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nhóm B dịch vụ có sẵn 8 → 2 SP: nối công cụ BI vào bản sao đọc của DB (tài khoản chỉ đọc), Founder tự dựng biểu đồ; không tự code dashboard |
| ☐ | E6-S5 | Điểm danh tại chỗ bằng mã QR (2 SP) · MUST | L8 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nhóm B rút gọn 8 → 2 SP: bỏ mã QR, organizer tick tay trong danh sách người tham gia trên web/PWA; API vẫn ghi `checked_in` + `attendance_confirmed` (cả hai phần do TV1) |
| ☐ | E6-S6 | Ghi `no_show_recorded` vào `trust_signals` (5 SP) · MUST | L9 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Job chạy trên dữ liệu điểm danh tick tay của E6-S5; phải chạy trước ngày mở beta |
| ☐ | E3-S6 | Xác minh số điện thoại bằng OTP (2 SP) · MUST | L8 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nhóm B dịch vụ có sẵn 5 → 2 SP: dùng nhà cung cấp OTP (khoảng 400 đồng/tin); trần gửi, hạn mã và chống brute-force vẫn tự áp ở API. Nếu CH-01 (M1) chốt bắt buộc xác thực SĐT cho mọi tài khoản thì phải kéo story này lên luồng đăng ký ở L1–L2 |
| ☐ | E8-S6 | Chống spam: trần số hoạt động/ngày, lọc từ khoá, chặn link đáng ngờ (5 SP) · MUST | L9 | TV3 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E8-S7 | Xuất dữ liệu cá nhân + yêu cầu xoá tài khoản (5 SP) · MUST | L9 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Không bao giờ cắt (Luật 91/2025/QH15); phải xong trong L9, trước ngày mở beta 15/02/2027 |
| ☐ | E12-S2 | Icon, splash, ảnh cửa hàng (3 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Hoãn cùng toàn bộ E12 (không phát hành cửa hàng ở M6); icon/splash cho PWA lấy từ gói Designer thuê ngoài, xem TG-M5-1 |
| ☐ | E12-S3 | TestFlight + Play closed testing (5 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Hoãn tới sau ra mắt; beta phát qua link web/PWA (TG-M5-8); Founder giữ trong backlog hậu ra mắt |
| ☐ | E12-S5 | EAS Update để vá nhanh không cần chờ duyệt (3 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Không cần khi chỉ có PWA: deploy web bằng lệnh một bước là kênh vá nhanh; làm lại khi phát hành native sau ra mắt |
| ☐ | E11-S1 | Lược đồ sự kiện phân tích thống nhất web + mobile (5 SP) · MUST | L10 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Chỉ web/PWA + server, bỏ vế mobile native; phải bắn được trước khi mời đợt 1 beta |
| ☐ | E6-S4 | Xem danh sách người tham gia trong giới hạn quyền riêng tư (5 SP) · SHOULD | L10 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Giữ nguyên vì không cắt nhóm C (ảnh hưởng cảm giác an toàn) |
| ☐ | E5-S9 | "Tuần này có gì" ngay trên màn hình đầu (5 SP) · MUST | L10 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Chỉ làm trên web/PWA; phần mobile native hoãn theo nhóm A |
| ☐ | E7-S7 | Tắt riêng từng loại thông báo (2 SP) · SHOULD | L10 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nhóm B rút gọn 5 → 2 SP: một công tắc tổng trên web + link huỷ đăng ký trong email (TV1 thêm vào email); không được cắt hết vì Luật 91/2025 có quyền phản đối xử lý |
| ☐ | E6-S9 | Xuất danh sách người tham gia ra CSV (3 SP) · SHOULD | L10 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Giữ nguyên vì không cắt nhóm C |
| ☐ | E10-S3 | About / FAQ / Community Guidelines song ngữ (3 SP) · MUST | L10 | TV3 + Founder | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Giữ nguyên 3 SP vì không cắt nhóm C; Founder viết bản EN, Thuê ngoài: Dịch giả dịch bản VI, TV3 dựng trang; Guidelines song ngữ đã có từ M4 (M4-8, TG-M4-3), L10 còn About và FAQ |

### 8.2. DoD bổ sung

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S6-DoD-1 | Bấm đồng hồ: Community Manager nhập một sự kiện thật từ một bài đăng công khai → ≤ 3 phút, đo trên 5 sự kiện khác nhau, lấy trung vị | L8 | Founder + TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Founder kiêm Community Manager tự bấm đồng hồ; TV3 tối ưu form console |
| ☐ | S6-DoD-2 | Mọi listing curate bắt buộc có: `source = 'curated'`, trường nguồn gốc, nhãn hiển thị "Listed by Da Nang Connect from a public post — not managed by the organiser", và nút gỡ ngay trên trang công khai | L8 | TV3 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-3 | Không có chức năng scraping nào trong repo. `grep -rniE "puppeteer\|playwright-scrape\|cheerio\|scrape"` trong `apps/api` phải rỗng (trừ dev-dependency test) | L8 | TV3 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-4 | Luồng nhận quyền: mã mời một lần, hết hạn 14 ngày, dùng rồi vô hiệu; nhận quyền xong `source` đổi `curated` → `self_serve`, `host_user_id` chuyển sang organizer thật, người curate cũ chuyển thành `event_cohosts` với `role_in_event = 'listed_by'` | L8 | TV3 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-5 | Điểm danh QR: mã xoay theo thời gian, không dùng lại được; quét xong `rsvps.status` = `checked_in` và sinh tín hiệu `attendance_confirmed` | L8 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Theo E6-S5 rút gọn: bỏ vế mã QR xoay; kiểm tra thay bằng organizer tick tay → `checked_in` + `attendance_confirmed`, chỉ host của occurrence được tick, không tick lặp |
| ☐ | S6-DoD-6 | Job đóng occurrence chạy T+3h sau `ends_at`: ai `going` mà không `checked_in` → `no_show`, sinh `no_show_recorded` | L9 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-7 | Xuất & xoá dữ liệu (E8-S7) phải xong trước ngày mở beta. Xuất trả gói JSON + ảnh trong ≤ 72 giờ; xoá thực hiện xoá cứng dữ liệu định danh và giữ bản ghi ẩn danh cho thống kê, có mô tả trong Privacy Policy | L9 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Hạn trước ngày mở beta = hết L9 (29/01/2027); Founder bổ sung phần mô tả xuất & xoá vào Privacy Policy và luật sư xác nhận lại, nối tiếp M4-9 |
| ☐ | S6-DoD-8 | OTP: giới hạn 5 lần gửi/số/ngày, mã 6 số, hết hạn 5 phút, chống brute-force | L8 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Dùng nhà cung cấp OTP sẵn có (E3-S6); các giới hạn vẫn cưỡng chế ở API, không phó mặc nhà cung cấp |
| ☐ | S6-DoD-9 | Build `production` đã nộp TestFlight và đã tạo track closed testing trên Play với ≥ 12 tester — đồng hồ 14 ngày bắt đầu chạy chậm nhất 11/12/2026 |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Không nộp TestFlight/Play ở M6; làm lại khi phát hành native sau ra mắt |
| ☐ | S7-DoD-1 | 15 sự kiện phân tích ở §5.12 đều bắn được từ cả web lẫn mobile, cùng tên thuộc tính, kiểm tra bằng bảng đối chiếu | L10 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Đối chiếu web/PWA với server, bỏ vế mobile native; `app_open` tính là mở web/PWA |
| ☐ | S7-DoD-2 | Crash-free session ≥ 99% đo trên 7 ngày cuối sprint | L10 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Đo bằng Sentry release health cho phiên web/PWA, không còn app native |
| ☐ | S7-DoD-3 | Toàn bộ P0 và P1 phát hiện trong beta được ghi vào backlog S8 với mức ưu tiên và người nhận | L10 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Ghi vào backlog L11 (sửa lỗi beta P0/P1) thay cho S8 |
| ☐ | S7-DoD-4 | Bảng tổng hợp 15 cuộc phỏng vấn có ít nhất 5 phát hiện có hành động kèm story tương ứng | L10 | Founder | <span class="nw">⬜ Chưa làm</span> | — |

### 8.3. Nghiệm thu

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | M5-1 | Tài khoản beta thật đã kích hoạt — ngưỡng: ≥ 100 |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `users`. Tinh gọn: Beta tinh gọn chỉ 60 user nên ngưỡng 100 không thể đạt — Founder chốt lại ngưỡng; TV3 chạy truy vấn bằng chứng |
| ☐ | M5-2 | Beta user hoạt động (mở app ≥ 2 lần trong 14 ngày cuối) — ngưỡng: ≥ 70 |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng phân tích. Tinh gọn: Ngưỡng 70 vượt tổng 60 user beta — cần chốt lại; mở app tính là mở web/PWA |
| ☐ | M5-3 | Sự kiện đã curate trong hệ thống — ngưỡng: ≥ 60 |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `events` |
| ☐ | M5-4 | Dòng chảy trong beta: sự kiện đang mở mỗi tuần, đo 4 tuần liên tiếp — ngưỡng: ≥ 15/tuần, không tuần nào < 10 |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo tuần. Tinh gọn: Cửa sổ 4 tuần tới 26/02/2027 trùng đóng băng Tết 01–12/02 — Founder vẫn phải curate trong Tết |
| ☐ | M5-5 | Không khu vực MVP nào có 0 sự kiện đang mở trong 4 tuần liên tiếp — ngưỡng: 6/6 khu vực có mặt |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng theo khu vực |
| ☐ | M5-6 | RSVP thật (không phải tài khoản test) — ngưỡng: ≥ 200 |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `rsvps`. Tinh gọn: Với 60 user cần ≈ 3,3 RSVP thật mỗi người — chốt lại ngưỡng cùng M5-1 |
| ☐ | M5-7 | TestFlight chạy ổn định + Play closed testing đủ 14 ngày liên tục — ngưỡng: Đủ 14 ngày |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Bằng chứng: Ảnh Play Console. Tinh gọn: Không có TestFlight/Play closed testing ở M6; đồng hồ 14 ngày chạy lại khi phát hành native sau ra mắt |
| ☐ | M5-8 | Crash-free session, đo 7 ngày cuối — ngưỡng: ≥ 99% |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Sentry. Tinh gọn: Đo bằng Sentry release health cho phiên web/PWA |
| ☐ | M5-9 | Phỏng vấn sâu người dùng — ngưỡng: ≥ 15 cuộc |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bản ghi + tổng hợp |
| ☐ | M5-10 | Xuất & xoá dữ liệu cá nhân hoạt động thật (đã thử trên 1 tài khoản thật) — ngưỡng: Đạt |  | TV2 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Gói dữ liệu xuất ra. Tinh gọn: Founder thử trên tài khoản thật và ký xác nhận người thứ hai (DoD-9) |

### 8.4. Demo

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S6-Demo-1 | Community Manager nhập 3 sự kiện thật trên màn hình, bấm đồng hồ từng lần | L8 | Founder | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Founder làm thay Community Manager |
| ☐ | S6-Demo-2 | Gửi lời mời tới hộp thư của một organizer thật đang hợp tác → organizer bấm link, đăng nhập, nhận quyền → sự kiện đổi chủ ngay trước mắt | L8 | Founder + TV3 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-Demo-3 | In một mã QR, quét bằng app trên Android thật → điểm danh thành công, trust signal xuất hiện | L8 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Thay QR bằng organizer tick tay trên web/PWA ở Android thật → điểm danh thành công, `attendance_confirmed` xuất hiện |
| ☐ | S6-Demo-4 | Bảng điều khiển Founder: số hoạt động tuần này, RSVP, report đang chờ, tỷ lệ `curated → self_serve` | L8 | Founder + TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Biểu đồ dựng trên công cụ BI nối bản sao đọc (E9-S5 dịch vụ có sẵn) |
| ☐ | S6-Demo-5 | Yêu cầu xuất dữ liệu của tài khoản demo → tải về file JSON, mở ra đọc được | L9 | TV2 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-Demo-6 | Cài app từ TestFlight lên iPhone thật ngay trong buổi demo | L9 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Thay TestFlight bằng thêm PWA vào màn hình chính trên iPhone thật (iOS ≥ 16.4), mở ở chế độ standalone |
| ☐ | S7-Demo-1 | Bảng điều khiển: 100 tài khoản beta thật, biểu đồ kích hoạt theo ngày | L10 | Founder | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Còn 60 tài khoản beta; biểu đồ kích hoạt dựng trên công cụ BI |
| ☐ | S7-Demo-2 | Phễu thật đọc từ công cụ phân tích: `app_open` → `discover_viewed` → `event_viewed` → `rsvp_completed`, kèm tỷ lệ rớt từng bước | L10 | Founder + TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: `app_open` tính là mở web/PWA; cần công cụ phân tích E11-S2 chạy từ L10 |
| ☐ | S7-Demo-3 | Ba trích đoạn phỏng vấn video, mỗi đoạn 60 giây, kèm việc đội sẽ làm với nó | L10 | Founder | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-Demo-4 | Bảng Sentry: crash-free session của 7 ngày cuối | L10 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Crash-free của phiên web/PWA |
| ☐ | S7-Demo-5 | Xác nhận Play closed testing đã chạy đủ 14 ngày liên tục |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: Không có Play closed testing ở M6 |

### 8.5. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | MK-ADMIN-01 | Console quản trị tin tức song ngữ (soạn, hẹn giờ đăng, evergreen, gắn sự kiện liên quan) + gắn events.source khi curate. |  | TV3 | <span class="nw">⬜ Chưa làm</span> | apps/web-admin-side chưa khởi tạo. Tinh gọn: Không nằm trong 359 SP tinh gọn — Founder chốt có làm trước beta không; nếu làm thì đi cùng L8 |

### 8.6. Bổ sung kịch bản tinh gọn

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | TG-M5-1 | Hoàn thiện PWA cho apps/web-client-side: manifest đầy đủ (bộ icon, màu, splash iOS, chế độ standalone) và mở rộng service worker sẵn có của Web Push để cache khung ứng dụng + trang offline (5 SP) · MUST | L9 | TV2 | <span class="nw">⬜ Chưa làm</span> | Service worker nhận push đã có từ E7-S3 (L6); một scope chỉ có một service worker nên phải mở rộng cái đó, không đăng ký cái thứ hai. Nếu Founder + TV1 chọn kéo manifest tối thiểu vào E7-S3 ở L6 (xem note E7-S3 ở M3) thì L9 chỉ hoàn thiện, nếu không thì manifest làm trọn ở đây. Ước tính tách từ 13 SP PWA còn lại (16 SP trừ 3 SP Web Push); icon/splash lấy từ gói Designer (TG-M2-1); TV1 cấu hình header/cache phía hosting |
| ☐ | TG-M5-2 | Luồng thêm vào màn hình chính: gợi ý cài trên Chrome/Android và trang hướng dẫn Share → Add to Home Screen trên iOS ≥ 16.4 (điều kiện để Web Push chạy trên iPhone) (3 SP) · MUST | L9 | TV2 | <span class="nw">⬜ Chưa làm</span> | Ước tính trong 13 SP PWA; thay kênh cài TestFlight/Play closed testing cho beta vì E12 hoãn |
| ☐ | TG-M5-3 | Tối ưu web trên điện thoại cho các màn lõi: khám phá, chi tiết, RSVP, form tạo sự kiện một trang (dán được link Google Maps để lấy địa điểm), danh sách người tham gia để organizer tick điểm danh (5 SP) · MUST | L9 | TV1 | <span class="nw">⬜ Chưa làm</span> | Bù cho việc hoãn tạo sự kiện trên mobile (E4-S7; 08:1570, 08:1696) và rút gọn điểm danh QR (E6-S5). TV1 giải link rút gọn Google Maps ra toạ độ ở server. Ước tính 5 trong 13 SP PWA. Phần dán link Google Maps nằm trọn ở đây |
| ☐ | TG-M5-4 | Đợt kiểm thử QA thuê ngoài số 1 (1 tuần) trên staging trước khi mở beta: đăng ký, khám phá theo khu vực, RSVP + waitlist, curate + nhận quyền, xuất & xoá dữ liệu, PWA trên Android và iPhone thật · MUST | L9 | Thuê ngoài: QA | <span class="nw">⬜ Chưa làm</span> | 15 triệu/đợt; TV1, TV2, TV3 bàn giao kịch bản + bộ Playwright E2E của chức năng mình, TV1 giữ staging ổn định; Founder ký nghiệm thu thay QA thường trực (DoD-9) |
| ☐ | TG-M5-6 | Nút nhân bản sự kiện trong Admin Curation Console (sao chép sang ngày mới, giữ nguồn và khu vực) để thay sự kiện lặp lại E4-S5 đã hoãn · SHOULD | L8 | TV3 | <span class="nw">⬜ Chưa làm</span> | §10.2 không cho SP riêng — cần ước lượng khi lên kế hoạch L8; TV3 làm API sao chép |
| ☐ | TG-M5-7 | Founder nhân bản tay các sự kiện lặp lại hằng tuần (lớp học, nhóm thể thao...) trong Admin Console, ≈ 20 phút/tuần | L8 | Founder | <span class="nw">⬜ Chưa làm</span> | Việc vận hành lặp lại từ L8 cho tới khi làm lại E4-S5 sau ra mắt |
| ☐ | TG-M5-8 | Mời beta kín 60 user theo 2 đợt qua link web/PWA, kèm hướng dẫn thêm vào màn hình chính (thay TestFlight + Play closed testing) · MUST | L10 | Founder | <span class="nw">⬜ Chưa làm</span> | TV2 cung cấp trang hướng dẫn cài (TG-M5-2); Founder chốt cách chia đợt và chỉ tiêu kích hoạt |
| ☐ | TG-M5-9 | Trực hotfix hằng ngày trong beta: đọc Sentry mỗi sáng, P0 vá trong ngày bằng lệnh deploy một bước · MUST | L10 | TV1 | <span class="nw">⬜ Chưa làm</span> | Chủ chức năng (TV1, TV2 hoặc TV3) vá lỗi phía web của phần mình; không còn EAS Update nên deploy web là kênh vá nhanh duy nhất; chấp nhận lỗi lọt staging nhiều hơn vì không có QA thường trực |
| ☐ | TG-M5-10 | Đóng băng chuỗi UI EN và gửi gói chuỗi + 2 trang nội dung còn lại (About / FAQ) cho dịch giả thuê ngoài, để kịp nạp bản dịch ở L11 · MUST | L10 | Founder + TV2 | <span class="nw">⬜ Chưa làm</span> | Hợp đồng dịch giả trọn gói 12 triệu đã ký từ L7, khi đặt dịch trước Guidelines (TG-M4-3); không ký lại ở đây. Founder gửi gói chuỗi UI (gồm template thông báo của E7-S2) + About/FAQ; TV2 xuất file khoá từ packages/i18n; việc nạp bản dịch thuộc E10-S2 (L11). L10 đã sang GĐ C trong khi ngân sách dịch giả ghi ở GĐ B (08:1791) |
| ☐ | TG-M5-12 | Founder đọc bảng BI 10 phút mỗi sáng Thứ Hai và ghi số tuần (sự kiện đang mở, phủ 6 khu vực, tài khoản kích hoạt, RSVP thật; từ L11 thêm WCA và tỷ lệ tự phục vụ của gate M6), thay cho báo cáo tuần tự động E11-S3 đã cắt · MUST | L8 | Founder | <span class="nw">⬜ Chưa làm</span> | Bắt đầu khi E9-S5 nối xong BI ở L8 và chạy liên tục tới hết cửa sổ đo gate M6. Đây là bằng chứng 'Báo cáo tuần' của M5-4, M5-5 và của M6-1, M6-2, M6-3, M6-5, nên vẫn ghi cả hai tuần đóng băng Tết. |
| ☐ | TG-M5-13 | Điểm kiểm soát ngân sách tinh gọn tại M5: người thật có dùng không, có ≥ 15 sự kiện đang mở mỗi tuần không? Nếu không: không ra mắt · MUST | L10 | Founder | <span class="nw">⬜ Chưa làm</span> | §11.4 vẫn ghi 25/12/2026, ≈ 510 triệu và '100 người thật' cho cột tinh gọn; theo lịch tinh gọn phải xét ngày 26/02/2027 với beta 60 user và tính lại số đã tiêu. Phương án 'kéo dài beta thêm 6 tuần' không còn chỗ trước M6 01/04/2027, Founder chốt phương án thay thế. Tương ứng TG-M2-6 ở M2 |


<div class="pb"></div>

## 9. M6 · Ra mắt công khai — chốt 01/04/2027

**Sprint:** L11, L12 · **Tổng:** 54 mục · ✅ 0 · 🟡 0 · ⬜ 36 · ⛔ 0 · ❓ 0 · ⚪ 0 · ✂️ 18 · **Tỷ lệ xong:** 0%

**SP theo người (còn lại / trong phạm vi):** TV1 4 / 4 · TV2 10 / 10 · TV3 3 / 3

**Mục tiêu:**

- L11 — 01/03 – 12/03/2027: Sửa lỗi beta P0/P1, nạp bản dịch tiếng Việt thuê ngoài, bịt hai chỗ rớt phễu lớn nhất
- L12 — 15/03 – 26/03/2027: SEO, diễn tập runbook, release candidate, đẩy curate lên 25 sự kiện/tuần

**Nếu trượt:** không ra mắt công khai đúng hạn. Lùi ra mắt 2–4 tuần và dồn toàn bộ nguồn lực vào curate + chuyển giao organizer. Ra mắt với một ứng dụng trông đầy nhưng không có dòng chảy là kịch bản hỏng tệ nhất: người dùng mở lần đầu, không thấy gì đáng đi, và không quay lại — không có lần ra mắt thứ hai với cùng một người. Tinh gọn: Không có đệm tiền để lùi lâu (08:1540: sai thì phải gọi vốn hoặc dừng) và ngưỡng dòng chảy không được làm mềm (08:1688), nên trượt gate nghĩa là giả thuyết sai chứ không phải do thiếu tính năng. L11–L12 chỉ xếp 18 SP story trên sức chứa 51; phần dư là đệm sửa lỗi beta, không dùng để thêm tính năng.

### 9.1. Story

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | E7-S5 | WebSocket đếm chỗ realtime (thay polling 30 giây) (13 SP) · SHOULD |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: cắt WebSocket (thu hồi 11 SP); số chỗ cập nhật bằng polling 30 giây khi màn hình đang mở (2 SP còn lại, đi cùng RSVP ở L5) |
| ☐ | E3-S5 | Xem & sửa hồ sơ ngay trong app (8 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn nhánh native; người dùng xem và sửa hồ sơ trên web/PWA |
| ☐ | E3-S4 | Hồ sơ công khai của organizer trên web (5 SP) · SHOULD | L11 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: nhóm C không cắt nên giữ đủ 5 SP |
| ☐ | E10-S2 | Bản dịch tiếng Việt do người dịch, không phải dịch máy (1 SP) · MUST | L11 | Thuê ngoài: Dịch giả | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: dịch giả freelance dịch toàn bộ chuỗi UI + 3 trang nội dung (12 triệu, trọn gói); TV2 chỉ nạp file vào packages/i18n; Founder ký hợp đồng và nghiệm thu |
| ☐ | E11-S2 | Tích hợp công cụ phân tích sản phẩm, dựng phễu thật (3 SP) · MUST | L11 | TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: dùng gói miễn phí của công cụ phân tích, tự động bắt sự kiện; TV3 gắn SDK trên web/PWA |
| ☐ | E4-S5 | Hoạt động lặp lại theo tuần (`recurrence_rule` sinh nhiều occurrence) (8 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn tới sau ra mắt; từ L8 Founder nhân bản các buổi lặp lại trong Admin Console, khoảng 20 phút/tuần (TG-M5-7; nút nhân bản ở TG-M5-6) |
| ☐ | E4-S10 | Trang quản lý hoạt động của tôi: sắp diễn ra / đã qua / nháp (4 SP) · MUST | L11 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Nhóm B rút gọn 8 → 4 SP: chỉ là danh sách lọc theo `host_user_id`, không có tab nháp / đã qua riêng |
| ☐ | E5-S8 | Chuyển danh sách ↔ bản đồ trên mobile (8 SP) · SHOULD |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn nhánh native; web cũng hoãn bản đồ (E5-S6), thay bằng danh sách nhóm theo 6 khu vực MVP |
| ☐ | E6-S8 | Số chỗ còn lại cập nhật realtime trên mobile (8 SP) · SHOULD |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn nhánh native; trên web/PWA số chỗ cập nhật bằng polling 30 giây |
| ☐ | E11-S3 | Báo cáo tuần tự động (5 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: cắt; Founder đọc bảng BI 10 phút mỗi sáng Thứ Hai, bắt đầu từ L8 (TG-M5-12) |
| ☐ | E11-S4 | Link mời bạn có ghi nhận (5 SP) · SHOULD |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn tới sau ra mắt; không đo được kênh giới thiệu trong 2 tháng đầu |
| ☐ | E11-S5 | SEO cho truy vấn "things to do in Da Nang this week" (5 SP) · MUST | L12 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: nhóm C GIỮ NGUYÊN: kênh tăng trưởng gần như miễn phí duy nhất khi không có cửa hàng ứng dụng |
| ☐ | E12-S4 | Mô tả cửa hàng song ngữ + ảnh chụp màn hình (5 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn cùng toàn bộ E12; mô tả song ngữ + ảnh chụp màn hình chuyển sang bộ truyền thông ra mắt (TG-M6-6) |
| ☐ | E12-S6 | App được duyệt và có mặt trên cả hai cửa hàng đúng ngày (5 SP) · MUST |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: không có mặt trên App Store / Google Play ở M6; ra mắt bằng web/PWA |
| ☐ | E5-S10 | Lưu bộ lọc yêu thích, lưu hoạt động xem sau (5 SP) · COULD |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: hoãn; người dùng lọc lại mỗi lần vào |

### 9.2. DoD bổ sung

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S8-DoD-1 | Không còn P0 nào mở. P1 còn mở ≤ 3, mỗi cái có ngày hẹn | L11 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: không có QA thường trực: các thành viên kiểm chéo, Founder ký người thứ hai (DoD-9) |
| ☐ | S8-DoD-2 | Hai chỗ rớt phễu lớn nhất đã có thay đổi cụ thể và đo lại được — ghi rõ "trước / sau" trong issue | L11 | TV1 + TV3 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Founder chọn hai điểm rớt từ phễu beta L10; TV1 sửa trên web/PWA, TV3 đo lại phễu |
| ☐ | S8-DoD-3 | Bản dịch tiếng Việt được một người Việt không thuộc đội đọc lại toàn bộ, chấm ≥ 4/5 về độ tự nhiên | L11 | Founder | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: người đọc lại phải ngoài đội và khác dịch giả thuê ngoài; TV2 nạp bản đã sửa |
| ☐ | S8-DoD-4 | Thời gian tải danh sách khám phá trên 4G mô phỏng < 2,5 giây tới nội dung đầu tiên | L11 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: đo trên trang khám phá web/PWA (không có app native); phần tối ưu cho điện thoại đã làm ở L9 |
| ☐ | S8-DoD-5 | Realtime: nếu WebSocket rớt thì tự hạ cấp về polling 30 giây, không hiện lỗi cho người dùng |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: cắt cùng E7-S5; polling 30 giây là cơ chế duy nhất và vẫn không được hiện lỗi cho người dùng |
| ☐ | S9-DoD-1 | Sự kiện lặp lại: `recurrence_rule` sinh occurrence trước 12 tuần, sửa một buổi không ảnh hưởng các buổi khác, huỷ chuỗi hỏi rõ "buổi này hay tất cả buổi sau" |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: cắt cùng E4-S5; thay bằng Founder nhân bản thủ công trong Admin Console (TG-M5-7) |
| ☐ | S9-DoD-2 | Release candidate `v1.0.0-rc.1` đã dựng bằng profile `production`, đã chạy hồi quy đầy đủ, không có lỗi chặn | L12 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: RC là bản web/PWA + API dựng cho production (không có profile EAS); hồi quy do QA thuê ngoài đợt 2 (TG-M6-5) cùng Playwright của cả ba thành viên |
| ☐ | S9-DoD-3 | Trang chỉ mục theo khu vực và theo loại hình đã sinh sitemap, đã submit Search Console; Lighthouse SEO ≥ 95 trên 5 trang mẫu | L12 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: Founder cấp quyền Search Console (tài khoản Google do Founder giữ) |
| ☐ | S9-DoD-4 | Diễn tập runbook sự cố thật: cố ý tắt Redis trên staging trong giờ làm việc → đo thời gian phát hiện (mục tiêu ≤ 5 phút) và thời gian khôi phục (mục tiêu ≤ 30 phút); biên bản diễn tập lưu lại | L12 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: TV1 xử lý sự cố, TV2 bấm giờ và ghi biên bản, Founder ký chứng kiến |
| ☐ | S9-DoD-5 | Ảnh chụp màn hình cửa hàng dùng dữ liệu thật đã được phép, không dùng ảnh người không có đồng ý | L12 | Founder | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: không có cửa hàng; áp dụng cho ảnh chụp màn hình trong bộ truyền thông ra mắt và ảnh OG (nguyên tắc đồng ý theo Luật 91/2025) |
| ☐ | S9-DoD-6 | Tài khoản demo cho reviewer cửa hàng đã tạo, có sẵn dữ liệu, thông tin đăng nhập đã ghi vào App Review Notes |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: không nộp cửa hàng ở M6 nên không cần tài khoản cho reviewer |
| ☐ | S10-DoD-1 | Toàn bộ checklist §12 đã tích xanh, có tên người ký từng mục | L12 | Founder + TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: các dòng §12 chỉ dành cho cửa hàng/native ghi N/A có chữ ký Founder; ký xong trước go/no-go cuối L12 (TG-M6-1) |
| ☐ | S10-DoD-2 | Chuông báo (alerting) đã bật cho: tỷ lệ lỗi 5xx > 1%, độ trễ p95 > 800 ms, hàng đợi BullMQ tồn > 500 job, Postgres kết nối > 80% | L12 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S10-DoD-3 | Có phương án lùi (rollback) đã thử: web lùi trong ≤ 5 phút, mobile vá bằng EAS Update trong ≤ 30 phút | L12 | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: chỉ còn phần web + API (lùi bằng script deploy một lệnh); phần EAS Update không áp dụng vì không có app native |
| ☐ | S10-DoD-4 | War-room có kênh riêng, danh sách trực theo giờ, số điện thoại dự phòng | L12 | Founder | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: war-room có 4 người: TV1 (hạ tầng + vòng lặp lõi), TV2 (tài khoản + PWA), TV3 (kiểm duyệt + Admin Console), Founder (cộng đồng + report P0 SLA 2 giờ); mở trong tuần ra mắt 29/03 – 02/04/2027 |

### 9.3. Nghiệm thu

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | M6-1 | Sự kiện đang mở mỗi tuần — đếm số occurrence có `status = 'published'`, `starts_at` rơi trong tuần đó và còn nhận RSVP — ngưỡng: ≥ 25 mỗi tuần, trung bình 4 tuần liên tiếp 25/01 – 21/02/2027, và không tuần nào < 20 (sàn tuyệt đối) |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn tự động, báo cáo tuần. Tinh gọn: ngưỡng không làm mềm; báo cáo tuần tự động đã cắt nên số lấy từ bảng BI Founder đọc mỗi Thứ Hai (TG-M5-12); cửa sổ 4 tuần phải dời theo mốc 01/04/2027 (TG-M6-1) |
| ☐ | M6-2 | Phủ khu vực — không khu vực MVP nào có 0 sự kiện đang mở — ngưỡng: 6/6 khu vực (An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn) có ≥ 1 sự kiện trong mỗi tuần của 4 tuần đo |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng chéo tuần × khu vực. Tinh gọn: ngưỡng giữ nguyên; bảng chéo tuần × khu vực dựng trên công cụ BI (E9-S5); cửa sổ đo dời theo mốc 01/04/2027 |
| ☐ | M6-3 | WCA — Weekly Confirmed Attendances, số lượt tham dự đã xác nhận (`checked_in`) trong 7 ngày — ngưỡng: 220 – 280 lượt/tuần ở thời điểm M6. Ngưỡng cảnh báo đỏ: < 110 |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `rsvps.status = 'checked_in'`. Tinh gọn: ngưỡng không làm mềm; `checked_in` sinh từ việc organizer tick tay (E6-S5 rút gọn) |
| ☐ | M6-4 | Organizer tự quản lý listing của mình (`events.source = 'self_serve'` và `host_user_id` là người thật) — ngưỡng: ≥ 8 organizer |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `events` gộp theo `host_user_id`. Tinh gọn: organizer tự quản qua danh sách lọc theo `host_user_id` (E4-S10 rút gọn) |
| ☐ | M6-5 | Tỷ lệ sự kiện tự phục vụ trên tổng sự kiện đang mở — ngưỡng: ≥ 35% |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo tuần. Tinh gọn: báo cáo tuần tự động đã cắt; tỷ lệ tự phục vụ đọc trên bảng BI mỗi Thứ Hai (TG-M5-12, thêm chỉ số này vào bảng từ L11) |
| ☐ | M6-6 | App có mặt trên App Store và Google Play — ngưỡng: Cả hai, trạng thái `available` |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Bằng chứng: Link cửa hàng công khai. Tinh gọn: không phát hành trên cửa hàng ở M6; bù bằng SEO (E11-S5) và chia sẻ link web/PWA trong các nhóm expat (TG-M6-6) |
| ☐ | M6-7 | Web production sống trên tên miền chính, HTTPS, có giám sát — ngưỡng: Đạt |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng giám sát. Tinh gọn: đây là kênh ra mắt chính (PWA thay app native) |
| ☐ | M6-8 | Crash-free session, đo 7 ngày trước ra mắt — ngưỡng: ≥ 99,5% |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Sentry. Tinh gọn: đo crash-free session của web/PWA bằng Sentry (không có app native); TV1 cấu hình Sentry, chủ chức năng sửa lỗi phía client |
| ☐ | M6-9 | Beta user hoạt động chuyển tiếp sang bản công khai — ngưỡng: ≥ 100 |  | Founder | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng phân tích. Tinh gọn: beta tinh gọn chỉ có 60 user nên không thể đạt ngưỡng ≥ 100 từ beta; Founder chốt lại ngưỡng (TG-M6-1) |
| ☐ | M6-10 | Runbook sự cố đã diễn tập thật (không phải chỉ viết ra) — ngưỡng: 1 lần diễn tập có biên bản, thời gian phát hiện ≤ 5 phút, khôi phục ≤ 30 phút |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Biên bản diễn tập S9. Tinh gọn: diễn tập ở L12 thay vì S9 |
| ☐ | M6-11 | Toàn bộ checklist §12 tích xanh, có tên người ký từng mục — ngưỡng: 100% |  | Founder + TV1 | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Checklist đã ký. Tinh gọn: các dòng §12 chỉ dành cho cửa hàng/native ghi N/A có chữ ký Founder; hạn ký dời theo ngày go/no-go tinh gọn (TG-M6-1) |

### 9.4. Demo

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S8-Demo-1 | Bảng lỗi beta: mở đầu sprint bao nhiêu, đóng bao nhiêu, còn lại bao nhiêu | L11 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-Demo-2 | Hai màn hình đã sửa, đặt cạnh ảnh chụp bản cũ, kèm số liệu phễu trước/sau | L11 | TV1 + TV3 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-Demo-3 | Mở hai thiết bị cạnh nhau: một máy RSVP → máy kia thấy số chỗ giảm ngay |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: cắt cùng E7-S5; với polling 30 giây, máy kia chỉ thấy số chỗ giảm sau tối đa 30 giây |
| ☐ | S8-Demo-4 | Duyệt toàn bộ app ở chế độ tiếng Việt, không còn chuỗi lai | L11 | TV2 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: duyệt trên web/PWA (không có app native); chuỗi sai trả lại dịch giả thuê ngoài sửa |
| ☐ | S9-Demo-1 | Tạo một lớp trao đổi ngôn ngữ lặp mỗi Thứ Ba trong 12 tuần → 12 occurrence hiện ra, RSVP vào một buổi không ảnh hưởng buổi khác |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: cắt cùng E4-S5; thay bằng Founder nhân bản buổi học trong Admin Console (TG-M5-7) |
| ☐ | S9-Demo-2 | Trình bày trang cửa hàng giả lập với ảnh chụp màn hình và mô tả song ngữ |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: không có trang cửa hàng ở M6 |
| ☐ | S9-Demo-3 | Xem lại video diễn tập tắt Redis, đọc biên bản thời gian phát hiện / khôi phục | L12 | TV1 | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-Demo-4 | Báo cáo tuần tự động gửi vào email lúc 09:00 Thứ Hai |  | Founder | <span class="nw">✂️ Cắt / hoãn</span> | Tinh gọn: cắt cùng E11-S3; Founder đọc bảng BI mỗi sáng Thứ Hai (TG-M5-12) |

### 9.5. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | MK-GATE-01 | Nếu giữ cổng swipe: job đo G1 / G2 hằng ngày trên AD-10, bật điểm vào deck khi đạt 3 tuần liên tiếp. |  | TV1 | <span class="nw">⬜ Chưa làm</span> | Tinh gọn: nằm ngoài 359 SP của kịch bản tinh gọn; chỉ làm nếu còn đệm ở L11–L12, không chặn ra mắt |

### 9.6. Bổ sung kịch bản tinh gọn

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | TG-M6-1 | Chốt bản tinh gọn của checklist §12 và gate M6: ghi N/A có chữ ký cho các dòng chỉ dành cho cửa hàng/native hoặc thuộc story đã cắt (§12.2, phần EAS của P-11, phần mobile của M-01, M-03); P-08 đổi sang crash-free session của web/PWA (khớp M6-8); P-01 tính story MUST của L0 → L12 trừ mục Cắt / hoãn; M-06 còn một sự kiện ra mắt; đổi vai ký QA / Mobile / Frontend / Backend / Tech Lead / Community Manager / Designer sang Founder / TV1 / TV2 / TV3, giữ nguyên chữ ký Luật sư ở §12.4; dời hạn ký, ngày go/no-go và cửa sổ đo 4 tuần theo mốc 01/04/2027 · MUST | L11 | Founder + TV1 | <span class="nw">⬜ Chưa làm</span> | Founder chốt lại ngưỡng M6-9 vì beta chỉ có 60 user; các ngưỡng dòng chảy M6-1/-2/-3 giữ nguyên |
| ☐ | TG-M6-4 | Founder đẩy curate lên ≥ 25 sự kiện đang mở mỗi tuần, đủ 6 khu vực MVP, và lấp sẵn lịch 4 tuần sau ra mắt · MUST | L12 | Founder | <span class="nw">⬜ Chưa làm</span> | chỉ một mình Founder curate (không có Community Manager); phải đạt 25/tuần ngay từ đầu cửa sổ đo 4 tuần, không phải đến cuối L12 mới đạt |
| ☐ | TG-M6-5 | Thuê QA ngoài đợt 2 (1 tuần, 15 triệu) chạy hồi quy đầy đủ trên release candidate web/PWA trước ra mắt, gồm cài PWA và nhận Web Push trên Android Chrome và iPhone iOS ≥ 16.4 thật · MUST | L12 | Thuê ngoài: QA | <span class="nw">⬜ Chưa làm</span> | TV1, TV2, TV3 bàn giao bộ ca Playwright và tài khoản test của phần mình, TV1 cấp môi trường RC; Founder ký hợp đồng và xác nhận kết quả (DoD-9) |
| ☐ | TG-M6-6 | Truyền thông ra mắt theo bản tinh gọn: chia sẻ link web/PWA trong các nhóm Facebook expat Đà Nẵng thay cho kênh cửa hàng ứng dụng, tổ chức một sự kiện ra mắt thay vì hai, không chạy quảng cáo trả tiền · MUST | L12 | Founder | <span class="nw">⬜ Chưa làm</span> | TV2 chụp ảnh màn hình cho bộ truyền thông (gói Designer trọn gói đã kết thúc từ GĐ A); chỉ dùng ảnh đã có đồng ý (S9-DoD-5) |

