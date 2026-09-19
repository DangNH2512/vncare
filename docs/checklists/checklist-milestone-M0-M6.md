# Checklist triển khai theo milestone M0 → M6

**Dự án:** Da Nang Connect — Giai đoạn 1 (MVP) · **Trạng thái chụp:** 19/09/2026 · **Phạm vi:** 7 milestone, từ Setup hạ tầng (18/09/2026) tới Ra mắt công khai (25/02/2027)

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

## 2. Tổng quan tiến độ

| Phase | Tên | Ngày chốt | Sprint | Tổng | ✅ Xong | 🟡 Một phần | ⬜ Chưa làm | ⛔ Bị chặn | ❓ Cần chốt | ⚪ Chưa xác nhận | Tỷ lệ xong |
|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|
| **M0** | Setup hạ tầng | <span class="nw">18/09/2026</span> | S0 | 33 | 6 | 6 | 13 | 0 | 2 | 6 | 18% |
| **M1** | API nền + Auth | <span class="nw">02/10/2026</span> | S1 | 49 | 3 | 8 | 23 | 5 | 8 | 2 | 6% |
| **M2** | Tạo & khám phá sự kiện | <span class="nw">30/10/2026</span> | S2, S3 | 68 | 0 | 11 | 51 | 0 | 5 | 1 | 0% |
| **M3** | RSVP + Waitlist + Thông báo | <span class="nw">13/11/2026</span> | S4 | 40 | 0 | 4 | 35 | 0 | 1 | 0 | 0% |
| **M4** | Trust & Safety tối thiểu | <span class="nw">27/11/2026</span> | S5 | 37 | 0 | 0 | 35 | 0 | 2 | 0 | 0% |
| **M5** | Beta kín 100 user | <span class="nw">25/12/2026</span> | S6, S7 | 53 | 0 | 0 | 53 | 0 | 0 | 0 | 0% |
| **M6** | Ra mắt công khai | <span class="nw">25/02/2027</span> | S8, S9, S10 | 50 | 0 | 0 | 50 | 0 | 0 | 0 | 0% |
| **Tổng** | | | | **330** | **9** | **29** | **260** | **5** | **18** | **9** | **3%** |

<div class="pb"></div>

## 3. M0 · Setup hạ tầng — chốt 18/09/2026

**Sprint:** S0 · **Tổng:** 33 mục · ✅ 6 · 🟡 6 · ⬜ 13 · ⛔ 0 · ❓ 2 · ⚪ 6 · **Tỷ lệ xong:** 18%

**Mục tiêu:**

- S0 — Nền móng (07/09 – 18/09/2026): Bất kỳ ai trong đội `git clone` xong chạy được toàn bộ hệ thống trong 5 phút, và mỗi lần merge vào `develop` là staging tự cập nhật.

**Nếu trượt:** M0 trượt tối đa 3 ngày làm việc. Quá 3 ngày thì rút E1-S8 xuống mức script và đẩy phần còn lại vào S1 — không được để trượt lan sang M1 vì M1 nằm trên đường găng.

### 3.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | CH-06 | Chốt quy mô đội: đủ đội 5,5 FTE hay tinh gọn 2 dev + Founder. Git log hiện chỉ có 1 người commit; velocity 53 SP/sprint của S1 dựa trên đội đủ. | Founder | <span class="nw">❓ Cần chốt</span> | Hạn 03/09, đã quá hạn. |
| ☐ | T-TL-01 | Tạo ops/legal/ + ops/legal/drafts/ cho bản nháp ToS / Privacy. | Tech Lead | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | T-TL-02 | Secret scanning (gitleaks) + tách biến môi trường trong CI, trước khi nạp khoá JWT, OAuth, Apple .p8. | Tech Lead | <span class="nw">⬜ Chưa làm</span> | Rủi ro tăng ngay trong Sprint 1. |

### 3.2. Story

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☑ | E1-S1 | Monorepo + chuẩn code thống nhất (5 SP) · MUST | Tech Lead | <span class="nw">✅ Xong</span> | Monorepo pnpm + Turborepo + oxlint chạy được. |
| ☑ | E1-S2 | `docker compose up` = Postgres 16 + PostGIS 3.4 + Redis (5 SP) · MUST | Tech Lead | <span class="nw">✅ Xong</span> | PostgreSQL 18 + PostGIS 3.6 + Redis 7.4 (nâng phiên bản đã quyết, khác số ghi trong doc 08). |
| ☐ | E1-S3 | Khung NestJS 11 + config theo môi trường + `GET /health` (5 SP) · MUST | Backend | <span class="nw">🟡 Một phần</span> | Có /health; thiếu readiness kiểm tra DB và Redis. |
| ☐ | E1-S4 | TypeORM migration + seed data (5 SP) · MUST | Backend | <span class="nw">❓ Cần chốt</span> | Không dùng TypeORM: schema là file SQL nạp qua initdb, không tự áp cho DB đang chạy. Chốt cơ chế migration (T-04) trước bảng mới đầu tiên. |
| ☑ | E1-S5 | Khung Next.js 15 App Router + Tailwind + design token (5 SP) · MUST | Web | <span class="nw">✅ Xong</span> | Next.js 16 App Router + Tailwind 4 + token từ @dnc/tokens. |
| ☐ | E1-S6 | Khung Expo 54 + RN 0.81 + điều hướng + dev build máy thật (8 SP) · MUST | Mobile | <span class="nw">⬜ Chưa làm</span> | apps/mobile-client-side chỉ có README. Chặn cứng 18 SP mobile của Sprint 1 (E2-S3, E2-S4, E2-S9). |
| ☐ | E1-S7 | CI GitHub Actions: lint + test + build mỗi PR (5 SP) · MUST | Tech Lead | <span class="nw">🟡 Một phần</span> | CI có lint + typecheck + test + smoke RSVP; thiếu bước build; branch protection chưa xác nhận. |
| ☐ | E1-S8 | Merge `develop` → tự động deploy staging (8 SP) · MUST | Tech Lead | <span class="nw">⬜ Chưa làm</span> | Chưa có auto-deploy staging, cũng chưa có script deploy.sh dự phòng. |
| ☑ | E10-S1 | Khoá i18n theo namespace, dùng chung web + mobile (3 SP) · MUST | Web | <span class="nw">✅ Xong</span> | packages/i18n en/vi + sinh kiểu khoá; 2 file phẳng thay vì 14 namespace (vẫn đạt DoD). |

### 3.3. DoD bổ sung

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S0-DoD-1 | Người thứ hai trong đội làm theo `README` từ máy sạch, dựng xong toàn hệ thống trong ≤ 5 phút bấm đồng hồ, không hỏi ai | — | <span class="nw">🟡 Một phần</span> | Lệnh pnpm dev tự động hoá đủ; chưa có lần bấm giờ thật trên máy sạch. |
| ☐ | S0-DoD-2 | `GET /health` trả 200 từ tên miền staging thật (không phải IP), có HTTPS hợp lệ | — | <span class="nw">⬜ Chưa làm</span> | Chưa có staging (phụ thuộc E1-S8). |
| ☐ | S0-DoD-3 | CI chạy < 8 phút; PR đỏ không merge được (branch protection đã bật) | — | <span class="nw">⚪ Chưa xác nhận</span> | Cần người có quyền admin repo kiểm branch protection và đo thời gian CI thật. |
| ☐ | S0-DoD-4 | Dev build cài được lên 1 iPhone thật + 1 Android thật, ảnh chụp màn hình lưu trong issue | — | <span class="nw">⬜ Chưa làm</span> | Chưa có project Expo (E1-S6). |
| ☑ | S0-DoD-5 | Khung i18n có sẵn 2 locale `en`/`vi`, mặc định `en`; đã có 1 chuỗi mẫu chứng minh cả hai đường | — | <span class="nw">✅ Xong</span> | — |
| ☐ | S0-DoD-6 | Sổ đăng ký hoạt động xử lý dữ liệu cá nhân đã tạo file rỗng có cấu trúc, chờ điền từ S1 | — | <span class="nw">⬜ Chưa làm</span> | Chưa có file sổ đăng ký, chưa có thư mục ops/legal/. |

### 3.4. Nghiệm thu

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | M0-1 | `GET /api/v1/health` trả 200 từ tên miền staging có HTTPS hợp lệ | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh chụp `curl -i` + chứng chỉ |
| ☐ | M0-2 | CI xanh trên `develop`, thời gian chạy < 8 phút, branch protection đã bật | — | <span class="nw">🟡 Một phần</span> | CI chạy trên PR; thiếu build + branch protection chưa xác nhận. Bằng chứng: Link run CI + ảnh cấu hình |
| ☐ | M0-3 | Người thứ hai dựng local từ máy sạch trong ≤ 5 phút | — | <span class="nw">🟡 Một phần</span> | Chưa bấm giờ thật. Bằng chứng: Video màn hình bấm đồng hồ |
| ☐ | M0-4 | Dev build cài chạy trên 1 iPhone thật + 1 Android thật | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: 2 ảnh chụp màn hình thiết bị |
| ☐ | M0-5 | Merge `develop` → staging tự cập nhật ≤ 10 phút (hoặc script 1 lệnh, xem phương án hạ tải §6.3) | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Log deploy |
| ☑ | M0-6 | 2 locale `en`/`vi` hoạt động, mặc định `en` | — | <span class="nw">✅ Xong</span> | Bằng chứng: Ảnh 2 trạng thái |
| ☐ | M0-7 | Hồ sơ D-U-N-S đã nộp, có mã hồ sơ | — | <span class="nw">⚪ Chưa xác nhận</span> | Việc của Founder, chưa có bằng chứng trong repo. Bằng chứng: Email xác nhận |

### 3.5. Demo

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S0-Demo-1 | Mở terminal máy sạch, `git clone` + `docker compose up`, gọi `curl localhost:3000/api/v1/health` → `{"status":"ok"}` | — | <span class="nw">🟡 Một phần</span> | Chạy được trên localhost; staging chưa có. |
| ☐ | S0-Demo-2 | Mở trình duyệt vào tên miền staging → trang Next.js chào mừng, bấm nút đổi ngôn ngữ EN ↔ VI | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S0-Demo-3 | Cầm iPhone thật lên, mở app dev build, đi qua 3 màn hình khung | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S0-Demo-4 | Push 1 commit vô hại lên `develop` ngay trong buổi demo → mọi người xem CI chạy và staging tự cập nhật sau ~6 phút | — | <span class="nw">⬜ Chưa làm</span> | — |

### 3.6. Việc ngoài SP

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S0-Ops-1 | Nộp hồ sơ D-U-N-S Number (miễn phí, 5–14 ngày làm việc) — đây là việc chặn dài nhất của cả dự án, làm ngày đầu tiên | Founder / Community Manager | <span class="nw">⚪ Chưa xác nhận</span> | — |
| ☐ | S0-Ops-2 | Mở tài khoản Google Play Console (25 USD một lần) — làm ngay vì chính sách closed testing 14 ngày tính từ lúc có tester | Founder / Community Manager | <span class="nw">⚪ Chưa xác nhận</span> | — |
| ☐ | S0-Ops-3 | Đăng ký tên miền + email doanh nghiệp | Founder / Community Manager | <span class="nw">⚪ Chưa xác nhận</span> | — |
| ☐ | S0-Ops-4 | Chốt danh sách 20 organizer mục tiêu để tiếp cận từ S2 | Founder / Community Manager | <span class="nw">⚪ Chưa xác nhận</span> | — |


<div class="pb"></div>

## 4. M1 · API nền + Auth — chốt 02/10/2026

**Sprint:** S1 · **Tổng:** 49 mục · ✅ 3 · 🟡 8 · ⬜ 23 · ⛔ 5 · ❓ 8 · ⚪ 2 · **Tỷ lệ xong:** 6%

**Mục tiêu:**

- S1 — Định danh & Xác thực (21/09 – 02/10/2026): Một người thật tạo được tài khoản, đăng nhập trên cả web lẫn điện thoại, và phiên đăng nhập giữ được qua nhiều ngày mà không tự đăng xuất.

**Nếu trượt:** M1 không được trượt. Đây là mắt xích đường găng cứng nhất phía kỹ thuật — toàn bộ E3, E4, E6 đều chờ nó. Trượt M1 thì trượt hết. Phương án khẩn: cắt E2-S5 (Facebook) và E2-S6 (đặt lại mật khẩu) sang S2, dồn 2 người vào E2-S2 và E2-S9.

### 4.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | CH-01 | Nghĩa vụ xác thực SĐT Việt Nam theo NĐ 147/2024: mọi tài khoản hay chỉ tài khoản đăng nội dung công khai. | Founder + Luật sư | <span class="nw">❓ Cần chốt</span> | Hạn 21/09. Code đang ngầm chọn "không bắt buộc". |
| ☐ | MT-17 | Chốt tên guard/decorator trust và RBAC (code: TrustLevelGuard/@MinTrustLevel; doc: TrustTierGuard/@MinTrust). | Tech Lead | <span class="nw">❓ Cần chốt</span> | Hạn 21/09; chặn E2-S7. |
| ☐ | MT-16 | user_status_enum 5 hay 8 giá trị (enum Postgres không xoá được giá trị). | Tech Lead | <span class="nw">❓ Cần chốt</span> | Hạn 02/10. |
| ☐ | PERM-MATRIX | Vị trí PERMISSION_MATRIX máy đọc được (doc 00: packages/shared-types; doc 01: apps/api/…/authz/) + test describe.each T-1→T-5. | Tech Lead | <span class="nw">❓ Cần chốt</span> | Hạn 21/09. |
| ☐ | ADR-C9 | Có tách schema identity_secret cho bảng xác thực mới không (ADR-0000 mục C9). | Founder | <span class="nw">❓ Cần chốt</span> | Hạn ký 07/09 đã qua. |
| ☐ | TOKEN-MOBILE | Một cơ chế trả refresh token dùng chung cho web (cookie), mobile (SecureStore) và social login; đổi hợp đồng packages/contracts. | Tech Lead + Backend | <span class="nw">❓ Cần chốt</span> | Chặn E2-S3, E2-S4, E2-S9. Cổng phê duyệt: đổi packages dùng chung. |
| ☐ | BR-30 | Nội dung Điều khoản / Chính sách quyền riêng tư và cơ chế consent_records (NĐ 13/2023 + Luật 91/2025). | Founder + Luật sư | <span class="nw">❓ Cần chốt</span> | Cần luật sư xác nhận. |
| ☐ | ACC-APPLE-GOOGLE | Xác nhận tài khoản Apple Developer tổ chức / D-U-N-S; tạo Google OAuth client (3 ID: web, iOS, Android). | Founder + Tech Lead | <span class="nw">⚪ Chưa xác nhận</span> | — |
| ☐ | OWNERS | Gán người phụ trách cho T-10, T-11, T-12, T-14 trong ACTIVE_TASKS. | Coordinator | <span class="nw">⬜ Chưa làm</span> | Cột người phụ trách đang trống. |
| ☐ | INFRA-MAIL | Nối mail client (SMTP → Mailpit) dùng chung cho E2-S1 và E2-S6. | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | INFRA-REDIS | Nối Redis client (ioredis / BullMQ) cho rate limit E2-S10 và job trust:recompute (T-13). | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | SEC-JWT-LOG | Vá lỗi ghi khoá riêng JWT ra log debug khi thiếu JWT_PRIVATE_KEY (auth.service.ts:107), trước khi bật log tập trung. | Backend | <span class="nw">⬜ Chưa làm</span> | Lỗi bảo mật. |
| ☐ | T-14 | Dựng Playwright ở apps/web-client-side/e2e/, chạy cả WebKit. | Tester | <span class="nw">⬜ Chưa làm</span> | Ba bug chỉ-có-ở-client đã lọt lưới. |

### 4.2. Story

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | E2-S1 | Đăng ký email + xác minh email (8 SP) · MUST | Backend | <span class="nw">🟡 Một phần</span> | Đăng ký có nhưng cấp phiên + T1 ngay; chưa có token xác minh, endpoint verify, gửi mail (Mailpit đã chạy). |
| ☑ | E2-S2 | JWT access 15 phút + refresh 30 ngày xoay vòng, phát hiện tái sử dụng (8 SP) · MUST | Backend | <span class="nw">✅ Xong</span> | Access 15 phút + refresh 30 ngày xoay vòng; test e2e "dùng lại token → thu hồi cả họ" (auth.e2e.spec.ts:323). |
| ☐ | E2-S3 | Đăng nhập Google (5 SP) · MUST | Backend + Mobile | <span class="nw">⛔ Bị chặn</span> | Chờ khung Expo (E1-S6), bảng social_accounts, endpoint /auth/social, Google OAuth client. |
| ☐ | E2-S4 | Đăng nhập Apple (Guideline 4.8) (5 SP) · MUST | Mobile + Backend | <span class="nw">⛔ Bị chặn</span> | Như E2-S3, thêm tài khoản Apple Developer tổ chức / D-U-N-S. |
| ☐ | E2-S6 | Đặt lại mật khẩu qua email (3 SP) · MUST | Backend | <span class="nw">⬜ Chưa làm</span> | Chưa có luồng quên / đặt lại mật khẩu. |
| ☐ | E2-S7 | Enum role toàn cục 5 giá trị + guard RBAC (5 SP) · MUST | Backend | <span class="nw">🟡 Một phần</span> | Enum 5 role đã đúng; chưa có RolesGuard/@Roles, chỉ có TrustLevelGuard. |
| ☐ | E2-S8 | Màn đăng nhập/đăng ký web, trạng thái lỗi rõ ràng (5 SP) · MUST | Web | <span class="nw">🟡 Một phần</span> | Màn đăng nhập/đăng ký web có; thiếu nhánh lỗi 429, locale đang viết cứng "en" (auth-form.tsx:85). |
| ☐ | E2-S9 | Giữ phiên trên mobile, token trong secure storage (8 SP) · MUST | Mobile | <span class="nw">⛔ Bị chặn</span> | Refresh token chỉ trả qua cookie httpOnly; phải chốt cơ chế cho mobile trước khi code. |
| ☐ | E2-S10 | Rate limit endpoint xác thực, chặn dò mật khẩu (3 SP) · MUST | Backend | <span class="nw">⬜ Chưa làm</span> | Chưa có rate limit; Redis đã chạy trong compose nhưng chưa nối client. |
| ☐ | E1-S9 | Sentry + log tập trung (3 SP) · MUST | Backend | <span class="nw">⬜ Chưa làm</span> | Chưa có Sentry / log tập trung. |

### 4.3. DoD bổ sung

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S1-DoD-1 | Migration tạo cột `users.role` kiểu enum đúng 5 giá trị chữ thường: `member`, `curator`, `moderator`, `admin`, `super_admin`. Mặc định `member`. Không có giá trị `guest`, `organizer`, `verified_member`, `support` trong enum — kiểm tra bằng một test đọc `pg_enum` và so khớp đúng 5 phần tử | — | <span class="nw">🟡 Một phần</span> | Enum đúng 5 giá trị; chưa có test đọc pg_enum. |
| ☐ | S1-DoD-2 | Migration tạo cột `users.trust_level` kiểu `smallint`, `CHECK (trust_level BETWEEN 0 AND 5)`, mặc định `0` | — | <span class="nw">🟡 Một phần</span> | Cột có; đăng ký đang cấp thẳng T1 (TRUST_LEVEL_ON_REGISTER), phải về 0 khi có xác minh email. |
| ☐ | S1-DoD-3 | Bảng `trust_signals` đã tạo (append-only), có `REVOKE UPDATE, DELETE` cho vai trò ứng dụng | — | <span class="nw">⬜ Chưa làm</span> | DDL đầy đủ đã có ở doc 03 §4.5, chỉ còn viết migration. |
| ☑ | S1-DoD-4 | Test e2e luồng tái sử dụng refresh token: dùng lại token đã xoay → toàn bộ họ token của thiết bị đó bị thu hồi, trả 401 | — | <span class="nw">✅ Xong</span> | auth.e2e.spec.ts:323. |
| ☐ | S1-DoD-5 | Test guard: `member` gọi endpoint chỉ dành cho `moderator` → 403, không phải 404 và không phải 500 | — | <span class="nw">⬜ Chưa làm</span> | Chưa có RolesGuard. |
| ☐ | S1-DoD-6 | Đăng nhập Apple chạy thật trên thiết bị iOS thật, không phải simulator | — | <span class="nw">⛔ Bị chặn</span> | Chờ khung Expo + tài khoản Apple Developer. |
| ☐ | S1-DoD-7 | Rate limit: 10 lần đăng nhập sai/IP/15 phút → 429 có header `Retry-After` | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S1-DoD-8 | Sổ đăng ký xử lý dữ liệu cá nhân đã có 3 dòng đầu: email, mật khẩu băm, định danh nhà cung cấp social | — | <span class="nw">⬜ Chưa làm</span> | Phụ thuộc DoD S0 sổ đăng ký. |

### 4.4. Nghiệm thu

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | M1-1 | Đăng ký + xác minh email chạy end-to-end trên web và mobile | — | <span class="nw">🟡 Một phần</span> | Web có đăng ký nhưng chưa có xác minh email; mobile chưa có. Bằng chứng: Video 2 nền tảng |
| ☐ | M1-2 | Đăng nhập Google và Apple chạy trên thiết bị thật, không phải simulator | — | <span class="nw">⛔ Bị chặn</span> | Bằng chứng: Video thiết bị |
| ☑ | M1-3 | Refresh token rotation có test e2e, gồm ca tái sử dụng token đã xoay → thu hồi cả họ | — | <span class="nw">✅ Xong</span> | Bằng chứng: Báo cáo test |
| ☐ | M1-4 | `users.role` là enum đúng 5 giá trị `member`/`curator`/`moderator`/`admin`/`super_admin`; không có `guest`, `organizer`, `verified_member`, `support` | — | <span class="nw">🟡 Một phần</span> | Thiếu test pg_enum. Bằng chứng: Test đọc `pg_enum` |
| ☐ | M1-5 | Guard RBAC chặn đúng: `member` gọi endpoint `moderator` → 403 | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test e2e |
| ☐ | M1-6 | `users.trust_level` `smallint` 0–5 đã có, mặc định 0; bảng `trust_signals` append-only đã có | — | <span class="nw">🟡 Một phần</span> | trust_signals chưa có. Bằng chứng: Migration + kiểm tra quyền |
| ☐ | M1-7 | Rate limit endpoint xác thực hoạt động, trả 429 có `Retry-After` | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Kịch bản test |
| ☐ | M1-8 | Sổ đăng ký hoạt động xử lý dữ liệu cá nhân đã mở, có ≥ 3 mục | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: File sổ đăng ký |

### 4.5. Demo

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S1-Demo-1 | Trên web: đăng ký bằng email thật → nhận mail xác minh → bấm xác minh → vào được khu vực đã đăng nhập | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S1-Demo-2 | Trên iPhone thật: đăng nhập bằng Apple ID → đóng app hoàn toàn → mở lại sau 10 phút → vẫn đăng nhập | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S1-Demo-3 | Trên Android thật: đăng nhập Google một chạm | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S1-Demo-4 | Demo bảo mật: lấy refresh token cũ trong Postman gọi lại → cả họ token bị thu hồi, thiết bị bị đá ra | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S1-Demo-5 | Demo RBAC: đổi `role` của tài khoản demo trong DB từ `member` sang `moderator` → endpoint kiểm duyệt mở ra ngay lần gọi kế tiếp | — | <span class="nw">⬜ Chưa làm</span> | — |

### 4.6. Việc ngoài SP

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S1-Ops-0 | theo dõi hồ sơ D-U-N-S; nếu quá 14 ngày chưa có kết quả thì mở ticket với Dun & Bradstreet — đây là ngưỡng cảnh báo đường găng đầu tiên. | Founder / Community Manager | <span class="nw">⚪ Chưa xác nhận</span> | — |

### 4.7. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | MK-AUTH-01 | Chốt form đăng ký theo UC-01: 3 trường, mật khẩu ≥ 10 ký tự + 4 điều kiện, 2 ô đồng ý tách riêng không tích sẵn, không báo "email đã tồn tại". Code hiện có trường handle, mật khẩu ≥ 12, trả EMAIL_TAKEN. | BA | <span class="nw">❓ Cần chốt</span> | — |
| ☐ | MK-AUTH-02 | Màn "Check your inbox": mã 6 số, gửi lại sau 60 giây (tối đa 5 lần / 24 giờ), đổi email 1 lần, khoá 15 phút sau 5 lần sai; trang link thành công / hết hạn / đã dùng / mở trên máy khác. | Web + Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-AUTH-03 | Đặt lại mật khẩu: màn gửi mail trung tính (không lộ email), đăng xuất mọi phiên khác sau khi đổi. | Web + Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-AUTH-04 | Social login: màn "email này đã có tài khoản — đăng nhập để liên kết", không tự hợp nhất. | Web + Mobile + Backend | <span class="nw">⬜ Chưa làm</span> | — |


<div class="pb"></div>

## 5. M2 · Tạo & khám phá sự kiện — chốt 30/10/2026

**Sprint:** S2, S3 · **Tổng:** 68 mục · ✅ 0 · 🟡 11 · ⬜ 51 · ⛔ 0 · ❓ 5 · ⚪ 1 · **Tỷ lệ xong:** 0%

**Mục tiêu:**

- S2 — Sự kiện lõi (05/10 – 16/10/2026): Một organizer thật đăng được một hoạt động thật lên staging, có ảnh bìa, có toạ độ đúng khu vực, và sự kiện đó sinh ra đúng một `event_occurrences`.
- S3 — Khám phá hyperlocal & Bản đồ (19/10 – 30/10/2026): Một expat mở web, chọn "An Thượng · cuối tuần này · thể thao" và thấy đúng những gì đang có; link sự kiện dán lên Facebook hiện ảnh và mô tả đẹp.

**Nếu trượt:** M2 đã có sẵn cơ chế ba nấc (§6.7). Nếu nấc 1 (web) trượt quá 1 tuần thì đây là điều kiện dừng cấp 1 — dừng nhận story mới, họp lại phạm vi trong 48 giờ, cân nhắc đòn bẩy 1 (thuê Mobile hợp đồng) hoặc rơi sang §10.

### 5.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | DEC-HOME-DISCOVER | Tách Trang chủ (tin tức + sự kiện do staff đăng) và Discover (sự kiện do thành viên đăng). Cập nhật doc 10 §3 và doc 14 J2; quyết định số phận composer / bài đăng cộng đồng đang ở "/" (module post). | BA + Tech Lead | <span class="nw">❓ Cần chốt</span> | Quyết định của chủ dự án 19/09; lệch tài liệu hiện hành. |
| ☐ | DEC-SWIPE | Chế độ lướt kiểu Tinder trong Discover: bật ngay từ MVP hay giữ cổng G1 (≥ 40 sự kiện mở / 7 ngày) + G2 (≥ 12 thẻ hợp lệ / người) theo doc 14 §8. | Product Owner | <span class="nw">❓ Cần chốt</span> | Doc 14 khuyến nghị sớm nhất M4–M5. |
| ☐ | DEC-ONBOARDING | Onboarding theo UC-05 (6 khu vực, bước 3 là ngôn ngữ) thay cho F-02 doc 10 (12 khu vực, bước 3 là expat_type). | BA | <span class="nw">❓ Cần chốt</span> | — |
| ☐ | DEC-WEEKSTART | Ngày đầu tuần cho bộ lọc "Tuần này": Thứ Hai cho cả EN/VI hay theo ngôn ngữ. | BA | <span class="nw">❓ Cần chốt</span> | Mockup Trang chủ dùng Thứ Hai; lịch Discover đổi theo ngôn ngữ. |
| ☐ | DEC-TOKENS | Design token: doc 10 §12 (teal #0E7C74 + Inter) hay code (xanh #0EA5E9 + Be Vietnam Pro). | Tech Lead + Designer | <span class="nw">❓ Cần chốt</span> | Mockup theo code. |

### 5.2. Story

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | E4-S1 | Mô hình dữ liệu sự kiện + PostGIS + `areas` (8 SP) · MUST | S2 | Backend | <span class="nw">🟡 Một phần</span> | Module event + PostGIS + bảng areas đã có. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E4-S2 | API tạo hoạt động: nháp → đăng (8 SP) · MUST | S2 | Backend | <span class="nw">🟡 Một phần</span> | Tạo và đăng sự kiện chạy end-to-end trên web. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E4-S3 | API sửa / huỷ hoạt động (5 SP) · MUST | S2 | Backend | <span class="nw">🟡 Một phần</span> | API sự kiện CRUD đầy đủ. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E4-S4 | Ảnh bìa + ảnh minh hoạ (5 SP) · MUST | S2 | Backend | <span class="nw">🟡 Một phần</span> | Module media + MinIO đã có. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E4-S6 | Form tạo hoạt động nhiều bước trên web, tự lưu nháp, xem trước (13 SP) · MUST | S2 | Web | <span class="nw">🟡 Một phần</span> | Web đang dùng một form đơn; doc yêu cầu wizard 4 bước + tự lưu nháp + xem trước (mockup ③ create-1…4). |
| ☐ | E3-S1 | Tạo hồ sơ: ảnh, giới thiệu, ngôn ngữ, khu vực, sở thích (8 SP) · MUST | S2 | Backend | <span class="nw">🟡 Một phần</span> | Module profile + profile-editor đã có; chưa có onboarding 3 bước. |
| ☐ | E3-S2 | Tải ảnh nhanh + phục vụ qua CDN (8 SP) · MUST | S2 | Backend | <span class="nw">🟡 Một phần</span> | Upload lên MinIO có tiến độ; chưa có CDN. |
| ☐ | E5-S1 | Từ điển khu vực Đà Nẵng có ranh giới thật (5 SP) · MUST | S2 | Backend + Product Owner | <span class="nw">🟡 Một phần</span> | Seed 6 khu vực + polygon trong packages/geo; ranh giới thật chưa được Product ký duyệt. |
| ☐ | E2-S5 | Đăng nhập Facebook (3 SP) · SHOULD | S2 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E1-S10 | Công tắc đổi ngôn ngữ EN ↔ VI trên web + mobile (5 SP) · MUST | S2 | Web + Mobile | <span class="nw">🟡 Một phần</span> | Web có công tắc EN/VI; mobile chưa có app. |
| ☐ | E5-S2 | API lọc: loại hình, khu vực, thời gian, ngôn ngữ, mức phí (13 SP) · MUST | S3 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S3 | Truy vấn bán kính quanh vị trí người dùng (8 SP) · MUST | S3 | Backend | <span class="nw">🟡 Một phần</span> | Truy vấn bán kính PostGIS có trong module event. Theo ghi chú phiên 01–02/09, chưa kiểm chứng lại bằng code. |
| ☐ | E5-S4 | Tìm theo từ khoá ("badminton") (5 SP) · MUST | S3 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S5 | Trang khám phá web: chip lọc, sắp xếp, tải thêm (13 SP) · MUST | S3 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S6 | Bản đồ Đà Nẵng, gom cụm điểm theo khu vực (8 SP) · MUST | S3 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E4-S8 | Trang chi tiết sự kiện công khai, SEO + OG image (8 SP) · MUST | S3 | Web | <span class="nw">🟡 Một phần</span> | Trang /events/[id] có; chưa kiểm SEO/OG image. |
| ☐ | E4-S9 | Màn chi tiết hoạt động trên mobile + deep link chia sẻ (8 SP) · MUST | S3 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E12-S1 | 3 profile EAS Build + versioning tự động (5 SP) · MUST | S3 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |

### 5.3. DoD bổ sung

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S2-DoD-1 | Cột chủ sự kiện đặt tên đúng `events.host_user_id`. Chạy `grep -rn "creator_id\\|organizer_id" apps/api/src` phải trả về rỗng | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-2 | `events.status` là enum chữ thường: `draft`, `published`, `cancelled`, `completed` | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-3 | Mọi `events` được tạo đều sinh tối thiểu 1 dòng `event_occurrences` — kể cả sự kiện không lặp lại. Có test: tạo sự kiện đơn → `SELECT count() FROM event_occurrences WHERE event_id = ?` trả về đúng `1` | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-4 | `starts_at` / `ends_at` lưu UTC; form nhập theo `Asia/Ho_Chi_Minh` và test có ca nhập 23:30 giờ Việt Nam để bắt lỗi lệch ngày | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-5 | Index `GIST` trên `events.location` đã có; `EXPLAIN` một truy vấn `ST_DWithin` cho thấy dùng index | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-6 | Bảng `areas` seed phân cấp đầy đủ, nhưng bộ lọc chỉ phơi ra đúng 6 khu vực MVP: An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn. Có test kiểm tra endpoint `GET /api/v1/areas?mvp=true` trả đúng 6 phần tử | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-7 | `events.source` ∈ `self_serve` \| `curated`, bắt buộc, không null | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-DoD-8 | Ảnh: giới hạn 8 MB/ảnh, tự nén, sinh 3 kích cỡ, trả qua CDN, thời gian tải ảnh bìa trên 4G mô phỏng < 1,5 giây | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-1 | `GET /api/v1/events` phân trang bằng cursor `(starts_at, id)`, không dùng `OFFSET` | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-2 | Kiểm thử hiệu năng: seed 10.000 sự kiện + 30.000 occurrence, `p95 < 200 ms` cho truy vấn có đủ 5 điều kiện lọc; kết quả đo dán vào issue | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-3 | Trả kèm `facets` đếm theo category và theo area; chip lọc hiển thị badge số thật, không phải số giả | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-4 | Cache Redis TTL 60 giây, có test chứng minh cache bị huỷ khi có sự kiện mới `published` trong cùng `area_id` | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-5 | Lọc "An Thượng" trả về đúng tập sự kiện nằm trong polygon `an-thuong`, đối chiếu thủ công 10 sự kiện mẫu | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-6 | Trang chi tiết đạt Lighthouse SEO ≥ 95, có `og:image` sinh động (tiêu đề + ngày + khu vực), đọc được không cần đăng nhập, không cần cài app | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-7 | Deep link `danangconnect://events/{id}` và universal link HTTPS đều mở đúng màn hình trên iOS và Android thật | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-DoD-8 | Bản đồ: 500 điểm không làm rớt khung hình dưới 45 fps trên máy tầm trung | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |

### 5.4. Nghiệm thu

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | M2-1 | Tạo, sửa, huỷ hoạt động trên web hoạt động đầy đủ, gồm tự lưu nháp và xem trước |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video |
| ☐ | M2-2 | Mỗi `events` sinh tối thiểu 1 `event_occurrences`, kể cả sự kiện không lặp lại |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Test + truy vấn SQL |
| ☐ | M2-3 | Cột chủ sự kiện tên đúng `events.host_user_id`; grep `creator_id`/`organizer_id` rỗng |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Kết quả grep |
| ☐ | M2-4 | Bộ lọc phơi đúng 6 khu vực MVP: An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh giao diện + test API |
| ☐ | M2-5 | Lọc theo loại hình / khu vực / khoảng thời gian / ngôn ngữ / mức phí đều đúng, có `facets` đếm thật |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video + so khớp 10 mẫu |
| ☐ | M2-6 | Truy vấn bán kính `ST_DWithin` dùng index GIST; `p95 < 200 ms` với 10.000 sự kiện |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo đo + `EXPLAIN` |
| ☐ | M2-7 | Bản đồ Đà Nẵng hiển thị đúng khu vực, gom cụm, ≥ 45 fps với 500 điểm |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video |
| ☐ | M2-8 | Trang chi tiết công khai đọc được không cần đăng nhập, Lighthouse SEO ≥ 95, `og:image` sinh động |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo Lighthouse + preview Facebook |
| ☐ | M2-9 | Mobile: xem chi tiết + deep link chia sẻ hoạt động trên thiết bị thật |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video |
| ☐ | M2-10 | (nấc M2+, hạn 13/11) Feed khám phá mobile · (nấc M2++, hạn 27/11) Tạo sự kiện trên mobile |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Video từng nấc |

### 5.5. Demo

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S2-Demo-1 | Đăng nhập bằng tài khoản thật → hoàn thiện hồ sơ có ảnh, ngôn ngữ nói, khu vực "An Thượng" | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-Demo-2 | Tạo hoạt động "Sunday Beach Volleyball · My Khe" qua form 4 bước, thoát giữa chừng, quay lại → nháp còn nguyên | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-Demo-3 | Đăng hoạt động → mở lại API `GET /api/v1/events/{id}` cho thấy `host_user_id`, `status: "published"`, `source: "self_serve"`, và đúng 1 occurrence | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-Demo-4 | Chạy SQL trực tiếp trên staging chứng minh `location` rơi đúng trong polygon `my-khe` | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S2-Demo-5 | Đổi ngôn ngữ sang tiếng Việt trên cả web và mobile, toàn bộ nhãn đổi theo | S2 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-1 | Trang khám phá web: bấm chip "My An" + "Language exchange" + "Weekend" → danh sách rút còn đúng những buổi phù hợp, badge số trên chip khớp | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-2 | Bật định vị trình duyệt tại văn phòng → "trong 2 km quanh tôi" trả kết quả hợp lý | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-3 | Gõ "badminton" → kết quả hiện dưới 300 ms | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-4 | Chuyển sang chế độ bản đồ → cụm điểm theo khu vực, bấm cụm thì mở ra | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-5 | Copy link một sự kiện, dán vào ô soạn bài Facebook → preview hiện ảnh OG đúng | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S3-Demo-6 | Quét deep link bằng iPhone thật → app mở thẳng màn chi tiết sự kiện đó | S3 | — | <span class="nw">⬜ Chưa làm</span> | — |

### 5.6. Việc ngoài SP

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S2-Ops-0 | Community Manager bắt đầu playbook curate — mở sổ theo dõi 20 organizer mục tiêu, ghi nguồn công khai, chưa nhập vào hệ thống (chờ Admin Console ở S6, giai đoạn này nhập vào bảng tính). | S2 | Founder / Community Manager | <span class="nw">⚪ Chưa xác nhận</span> | — |

### 5.7. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | MK-NEWS-01 | Bảng news_articles (song ngữ, tag, related_event_id, published / relevant / evergreen) + GET /api/v1/news, /news/:id. |  | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-NEWS-02 | Trang chủ biên tập: tin nổi bật + lưới tin, khối "Picked by our team" (SourceBadge + dòng nguồn + Interested), hàng Hướng dẫn, trang đọc bài. |  | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-TIME-01 | Bộ lọc Hôm nay / Tuần này / Tháng này / Chọn ngày cho Trang chủ và Discover; from/to theo Asia/Ho_Chi_Minh, lưu UTC; giữ trên URL; sự kiện lặp hiện một thẻ. |  | Web + Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-DISC-01 | Discover chỉ sự kiện events.source = self_serve; thẻ có ★ điểm host + 💬 số bình luận; sắp xếp Top rated; khối "What people say". |  | Web + Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-DETAIL-01 | Trang chi tiết: bình luận trả lời 1 cấp, host ghim, sắp xếp Mới nhất / Nổi bật; "Xem bản dịch" chỉ khi khác ngôn ngữ giao diện (nối comment API có sẵn, T-05). |  | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-SWIPE-01 | Swipe trong dòng (PA B): Lưu / Chia sẻ / Bỏ qua, toast hoàn tác 6 giây, nút ♡ và ⋯ luôn hiện; bảng occurrence_dismissals (hết hạn 14 ngày). |  | Web + Mobile + Backend | <span class="nw">⬜ Chưa làm</span> | Khoảng 11 ngày-người theo doc 14. |
| ☐ | MK-SWIPE-02 | Deck "Plan your week" (tối đa 12 thẻ, vuốt phải = Lưu, kéo lên mở sheet xác nhận RSVP, màn tổng kết cảnh báo trùng giờ). |  | Web + Mobile | <span class="nw">⬜ Chưa làm</span> | Chỉ làm nếu DEC-SWIPE chốt bật. |


<div class="pb"></div>

## 6. M3 · RSVP + Waitlist + Thông báo — chốt 13/11/2026

**Sprint:** S4 · **Tổng:** 40 mục · ✅ 0 · 🟡 4 · ⬜ 35 · ⛔ 0 · ❓ 1 · ⚪ 0 · **Tỷ lệ xong:** 0%

**Mục tiêu:**

- S4 — RSVP, Waitlist & Thông báo (02/11 – 13/11/2026): Hai trăm người bấm đăng ký cùng lúc vào một buổi có 50 chỗ thì đúng 50 người vào `going`, phần còn lại vào `waitlisted` theo thứ tự, và ai cũng nhận được thông báo đúng.

**Nếu trượt:** M3-3 (waitlist) là MUST của MVP, không được hoãn. Nếu tuần W09 kết thúc mà E6-S3 chưa xong, cắt ngay E5-S7 khỏi S4 và dồn toàn bộ nhánh backend vào RSVP. Nấc M2+ lùi sang S5.

### 6.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | DEC-MYEVENTS | Gộp W-40 / W-44 / W-46 thành một màn "Sự kiện của tôi" dạng agenda; cập nhật doc 10. | BA + Tech Lead | <span class="nw">❓ Cần chốt</span> | — |

### 6.2. Story

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

### 6.3. DoD bổ sung

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

### 6.4. Nghiệm thu

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

### 6.5. Demo

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S4-Demo-1 | Chạy script k6 ngay trên màn hình: 200 RSVP đồng thời vào 50 chỗ → bảng kết quả 50/150 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-Demo-2 | Trên iPhone thật: rút đăng ký của một người đang `going` → điện thoại người đứng đầu danh sách chờ rung ngay tại chỗ với thông báo "You're in!" | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-Demo-3 | Kiểm tra hộp thư: email xác nhận tiếng Anh cho tài khoản `en`, tiếng Việt cho tài khoản `vi` | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-Demo-4 | Chỉnh giờ máy chủ staging để mô phỏng mốc T‑24h và T‑2h → hai đợt nhắc bắn đúng, không trùng | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S4-Demo-5 | Feed khám phá trên mobile, kéo bảng lọc lên, lọc theo khu vực | — | <span class="nw">⬜ Chưa làm</span> | — |

### 6.6. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | MK-MY-01 | "Sự kiện của tôi": thẻ Next up (đếm ngược, địa chỉ chính xác, chỉ đường, QR điểm danh, chat nhóm), dải tuần, chip lọc, timeline, khối Past nhắc review; GET /me/agenda. | Web + Backend | <span class="nw">⬜ Chưa làm</span> | Route /my-events hiện là BlankScreen. |
| ☐ | MK-MY-02 | Lời mời từ hàng chờ giữ chỗ 12 giờ (held + hold_expires_at) + thông báo (T-16). | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-MY-03 | Đồng bộ lịch cá nhân (.ics feed) + cảnh báo huỷ muộn khi còn < 2 giờ (BR-10). | Web + Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | MK-RSVP-01 | Sheet xác nhận RSVP bắt buộc với sự kiện có phí, ≤ 10 chỗ (cổng T2), bắt đầu trong < 2 giờ, nhận lời mời hàng chờ. | Web + Mobile | <span class="nw">⬜ Chưa làm</span> | — |


<div class="pb"></div>

## 7. M4 · Trust & Safety tối thiểu — chốt 27/11/2026

**Sprint:** S5 · **Tổng:** 37 mục · ✅ 0 · 🟡 0 · ⬜ 35 · ⛔ 0 · ❓ 2 · ⚪ 0 · **Tỷ lệ xong:** 0%

**Mục tiêu:**

- S5 — Trust & Safety (16/11 – 27/11/2026): Một người dùng gặp nội dung xấu có đường báo cáo rõ ràng; moderator xử lý được trong SLA; và mọi hồ sơ đều hiển thị đúng bậc T0–T5.

**Nếu trượt:** M4-8 và M4-9 là điều kiện chặn cứng để mở beta — không có chính sách đã thẩm định thì không được thu thập dữ liệu của 100 người thật. Nếu luật sư chưa xác nhận kịp, lùi ngày mời beta wave 1 chứ không mở beta bằng bản thảo chưa thẩm định.

### 7.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | DEC-REVIEWS | Reviews (UC-16, đang Should) có vào MVP không; cửa sổ đánh giá 7 ngày (doc 05) hay 14 ngày (doc 03). | Product Owner | <span class="nw">❓ Cần chốt</span> | — |
| ☐ | DEC-TRUST-LABELS | Thống nhất nhãn trust T0–T5: code i18n (Restricted / New member / Verified / Regular / Trusted / Community host) với doc 05 §5.3 (New / Email verified / Phone verified / Active member / Trusted / Community leader); doc 10 §12.6 còn thang cũ. | BA + Tech Lead | <span class="nw">❓ Cần chốt</span> | Liên quan nghiệm thu M4-5, M4-6. |

### 7.2. Story

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

### 7.3. DoD bổ sung

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

### 7.4. Nghiệm thu

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

### 7.5. Demo

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S5-Demo-1 | Tài khoản A báo cáo sự kiện của B với lý do "lừa đảo" → ticket vào hàng đợi mức P0, đồng hồ SLA 2 giờ bắt đầu chạy | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-Demo-2 | Moderator gỡ sự kiện, ghi lý do → sự kiện biến khỏi khám phá ngay, người đã RSVP nhận thông báo huỷ | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-Demo-3 | Chạy `report_upheld` cho B → job recompute chạy ngay, `trust_level` của B tụt về T2, nhãn trên hồ sơ đổi ngay | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-Demo-4 | Tài khoản C xác minh số điện thoại bằng OTP → lên T2 (tính năng OTP giao ở S6, demo bằng seed tín hiệu) | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S5-Demo-5 | Trên iPhone thật, bấm đồng hồ: tạo một hoạt động từ màn hình chính tới lúc đăng — dưới 90 giây | — | <span class="nw">⬜ Chưa làm</span> | — |

### 7.6. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | MK-REV-01 | Bảng reviews (chỉ người đã check-in, double-blind, kiểm duyệt qua hàng đợi) + POST /occurrences/{id}/reviews, GET /users/{handle}/reviews. | Backend | <span class="nw">⬜ Chưa làm</span> | DDL đầy đủ ở doc 03 §8.5. |
| ☐ | MK-REV-02 | Khối Reviews trên trang chi tiết (điểm, phân bố sao, "Verified attendee", Helpful, Report) + màn viết review. | Web | <span class="nw">⬜ Chưa làm</span> | — |


<div class="pb"></div>

## 8. M5 · Beta kín 100 user — chốt 25/12/2026

**Sprint:** S6, S7 · **Tổng:** 53 mục · ✅ 0 · 🟡 0 · ⬜ 53 · ⛔ 0 · ❓ 0 · ⚪ 0 · **Tỷ lệ xong:** 0%

**Mục tiêu:**

- S6 — Sẵn sàng beta & Curation Console (30/11 – 11/12/2026): Community Manager nhập được sự kiện thật vào hệ thống trong dưới 3 phút, organizer gốc nhận được lời mời tự quản lý listing, và bản build đã nộp lên TestFlight + Play closed testing.
- S7 — Vận hành beta kín 100 user (14/12 – 25/12/2026): Một trăm expat thật dùng sản phẩm trong đời thật, và đội nhìn thấy họ dùng như thế nào.

**Nếu trượt:** M5 có 2 tuần đệm tự nhiên (đóng băng cuối năm + S8). Nếu M5-7 trượt vì Play closed testing bắt đầu muộn thì đây là rủi ro chặn M6 — xem §8.3.

### 8.1. Story

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | E9-S2 | Nhập sự kiện công khai vào hệ thống < 3 phút, có ghi nguồn (8 SP) · MUST | S6 | Web + Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E9-S3 | Lời mời organizer gốc nhận quyền quản lý listing (8 SP) · MUST | S6 | Backend + Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E9-S4 | Quản lý người dùng, khu vực, loại hình hoạt động (5 SP) · MUST | S6 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E9-S5 | Bảng điều khiển vận hành cho Founder (8 SP) · MUST | S6 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E6-S5 | Điểm danh tại chỗ bằng mã QR (8 SP) · MUST | S6 | Backend + Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E6-S6 | Ghi `no_show_recorded` vào `trust_signals` (5 SP) · MUST | S6 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E3-S6 | Xác minh số điện thoại bằng OTP (5 SP) · MUST | S6 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E8-S6 | Chống spam: trần số hoạt động/ngày, lọc từ khoá, chặn link đáng ngờ (5 SP) · MUST | S6 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E8-S7 | Xuất dữ liệu cá nhân + yêu cầu xoá tài khoản (5 SP) · MUST | S6 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E12-S2 | Icon, splash, ảnh cửa hàng (3 SP) · MUST | S6 | Designer | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E12-S3 | TestFlight + Play closed testing (5 SP) · MUST | S6 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E12-S5 | EAS Update để vá nhanh không cần chờ duyệt (3 SP) · MUST | S6 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E11-S1 | Lược đồ sự kiện phân tích thống nhất web + mobile (5 SP) · MUST | S7 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E6-S4 | Xem danh sách người tham gia trong giới hạn quyền riêng tư (5 SP) · SHOULD | S7 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S9 | "Tuần này có gì" ngay trên màn hình đầu (5 SP) · MUST | S7 | Web + Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E7-S7 | Tắt riêng từng loại thông báo (5 SP) · SHOULD | S7 | Web + Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E6-S9 | Xuất danh sách người tham gia ra CSV (3 SP) · SHOULD | S7 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E10-S3 | About / FAQ / Community Guidelines song ngữ (3 SP) · MUST | S7 | Community Manager | <span class="nw">⬜ Chưa làm</span> | — |

### 8.2. DoD bổ sung

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S6-DoD-1 | Bấm đồng hồ: Community Manager nhập một sự kiện thật từ một bài đăng công khai → ≤ 3 phút, đo trên 5 sự kiện khác nhau, lấy trung vị | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-2 | Mọi listing curate bắt buộc có: `source = 'curated'`, trường nguồn gốc, nhãn hiển thị "Listed by Da Nang Connect from a public post — not managed by the organiser", và nút gỡ ngay trên trang công khai | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-3 | Không có chức năng scraping nào trong repo. `grep -rniE "puppeteer\|playwright-scrape\|cheerio\|scrape"` trong `apps/api` phải rỗng (trừ dev-dependency test) | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-4 | Luồng nhận quyền: mã mời một lần, hết hạn 14 ngày, dùng rồi vô hiệu; nhận quyền xong `source` đổi `curated` → `self_serve`, `host_user_id` chuyển sang organizer thật, người curate cũ chuyển thành `event_cohosts` với `role_in_event = 'listed_by'` | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-5 | Điểm danh QR: mã xoay theo thời gian, không dùng lại được; quét xong `rsvps.status` = `checked_in` và sinh tín hiệu `attendance_confirmed` | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-6 | Job đóng occurrence chạy T+3h sau `ends_at`: ai `going` mà không `checked_in` → `no_show`, sinh `no_show_recorded` | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-7 | Xuất & xoá dữ liệu (E8-S7) phải xong trước ngày mở beta. Xuất trả gói JSON + ảnh trong ≤ 72 giờ; xoá thực hiện xoá cứng dữ liệu định danh và giữ bản ghi ẩn danh cho thống kê, có mô tả trong Privacy Policy | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-8 | OTP: giới hạn 5 lần gửi/số/ngày, mã 6 số, hết hạn 5 phút, chống brute-force | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-DoD-9 | Build `production` đã nộp TestFlight và đã tạo track closed testing trên Play với ≥ 12 tester — đồng hồ 14 ngày bắt đầu chạy chậm nhất 11/12/2026 | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-DoD-1 | 15 sự kiện phân tích ở §5.12 đều bắn được từ cả web lẫn mobile, cùng tên thuộc tính, kiểm tra bằng bảng đối chiếu | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-DoD-2 | Crash-free session ≥ 99% đo trên 7 ngày cuối sprint | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-DoD-3 | Toàn bộ P0 và P1 phát hiện trong beta được ghi vào backlog S8 với mức ưu tiên và người nhận | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-DoD-4 | Bảng tổng hợp 15 cuộc phỏng vấn có ít nhất 5 phát hiện có hành động kèm story tương ứng | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |

### 8.3. Nghiệm thu

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | M5-1 | Tài khoản beta thật đã kích hoạt — ngưỡng: ≥ 100 |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `users` |
| ☐ | M5-2 | Beta user hoạt động (mở app ≥ 2 lần trong 14 ngày cuối) — ngưỡng: ≥ 70 |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng phân tích |
| ☐ | M5-3 | Sự kiện đã curate trong hệ thống — ngưỡng: ≥ 60 |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `events` |
| ☐ | M5-4 | Dòng chảy trong beta: sự kiện đang mở mỗi tuần, đo 4 tuần liên tiếp — ngưỡng: ≥ 15/tuần, không tuần nào < 10 |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo tuần |
| ☐ | M5-5 | Không khu vực MVP nào có 0 sự kiện đang mở trong 4 tuần liên tiếp — ngưỡng: 6/6 khu vực có mặt |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng theo khu vực |
| ☐ | M5-6 | RSVP thật (không phải tài khoản test) — ngưỡng: ≥ 200 |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `rsvps` |
| ☐ | M5-7 | TestFlight chạy ổn định + Play closed testing đủ 14 ngày liên tục — ngưỡng: Đủ 14 ngày |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh Play Console |
| ☐ | M5-8 | Crash-free session, đo 7 ngày cuối — ngưỡng: ≥ 99% |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Sentry |
| ☐ | M5-9 | Phỏng vấn sâu người dùng — ngưỡng: ≥ 15 cuộc |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bản ghi + tổng hợp |
| ☐ | M5-10 | Xuất & xoá dữ liệu cá nhân hoạt động thật (đã thử trên 1 tài khoản thật) — ngưỡng: Đạt |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Gói dữ liệu xuất ra |

### 8.4. Demo

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S6-Demo-1 | Community Manager nhập 3 sự kiện thật trên màn hình, bấm đồng hồ từng lần | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-Demo-2 | Gửi lời mời tới hộp thư của một organizer thật đang hợp tác → organizer bấm link, đăng nhập, nhận quyền → sự kiện đổi chủ ngay trước mắt | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-Demo-3 | In một mã QR, quét bằng app trên Android thật → điểm danh thành công, trust signal xuất hiện | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-Demo-4 | Bảng điều khiển Founder: số hoạt động tuần này, RSVP, report đang chờ, tỷ lệ `curated → self_serve` | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-Demo-5 | Yêu cầu xuất dữ liệu của tài khoản demo → tải về file JSON, mở ra đọc được | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S6-Demo-6 | Cài app từ TestFlight lên iPhone thật ngay trong buổi demo | S6 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-Demo-1 | Bảng điều khiển: 100 tài khoản beta thật, biểu đồ kích hoạt theo ngày | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-Demo-2 | Phễu thật đọc từ công cụ phân tích: `app_open` → `discover_viewed` → `event_viewed` → `rsvp_completed`, kèm tỷ lệ rớt từng bước | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-Demo-3 | Ba trích đoạn phỏng vấn video, mỗi đoạn 60 giây, kèm việc đội sẽ làm với nó | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-Demo-4 | Bảng Sentry: crash-free session của 7 ngày cuối | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S7-Demo-5 | Xác nhận Play closed testing đã chạy đủ 14 ngày liên tục | S7 | — | <span class="nw">⬜ Chưa làm</span> | — |

### 8.5. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | MK-ADMIN-01 | Console quản trị tin tức song ngữ (soạn, hẹn giờ đăng, evergreen, gắn sự kiện liên quan) + gắn events.source khi curate. |  | Web Admin | <span class="nw">⬜ Chưa làm</span> | apps/web-admin-side chưa khởi tạo. |


<div class="pb"></div>

## 9. M6 · Ra mắt công khai — chốt 25/02/2027

**Sprint:** S8, S9, S10 · **Tổng:** 50 mục · ✅ 0 · 🟡 0 · ⬜ 50 · ⛔ 0 · ❓ 0 · ⚪ 0 · **Tỷ lệ xong:** 0%

**Mục tiêu:**

- S8 — Sửa lỗi beta & Hoàn thiện (04/01 – 15/01/2027): Đóng toàn bộ P0/P1 của beta, và bịt hai chỗ rớt phễu lớn nhất tìm được ở S7.
- S9 — Chuẩn bị ra mắt (18/01 – 29/01/2027): Có một release candidate đóng gói xong, tài sản cửa hàng xong, và runbook sự cố đã được diễn tập thật.
- S10 — Ra mắt công khai (15/02 – 26/02/2027): App có mặt trên cả hai kho ứng dụng, web production sống, và cộng đồng Đà Nẵng biết chuyện đó.

**Nếu trượt:** không ra mắt công khai đúng hạn. Lùi ra mắt 2–4 tuần và dồn toàn bộ nguồn lực vào curate + chuyển giao organizer. Ra mắt với một ứng dụng trông đầy nhưng không có dòng chảy là kịch bản hỏng tệ nhất: người dùng mở lần đầu, không thấy gì đáng đi, và không quay lại — không có lần ra mắt thứ hai với cùng một người.

### 9.1. Story

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | E7-S5 | WebSocket đếm chỗ realtime (thay polling 30 giây) (13 SP) · SHOULD | S8 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E3-S5 | Xem & sửa hồ sơ ngay trong app (8 SP) · MUST | S8 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E3-S4 | Hồ sơ công khai của organizer trên web (5 SP) · SHOULD | S8 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E10-S2 | Bản dịch tiếng Việt do người dịch, không phải dịch máy (5 SP) · MUST | S8 | Product Owner + Community Manager | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E11-S2 | Tích hợp công cụ phân tích sản phẩm, dựng phễu thật (5 SP) · MUST | S8 | Tech Lead | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E4-S5 | Hoạt động lặp lại theo tuần (`recurrence_rule` sinh nhiều occurrence) (8 SP) · MUST | S9 | Backend | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E4-S10 | Trang quản lý hoạt động của tôi: sắp diễn ra / đã qua / nháp (8 SP) · MUST | S9 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S8 | Chuyển danh sách ↔ bản đồ trên mobile (8 SP) · SHOULD | S9 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E6-S8 | Số chỗ còn lại cập nhật realtime trên mobile (8 SP) · SHOULD | S9 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E11-S3 | Báo cáo tuần tự động (5 SP) · MUST | S9 | Tech Lead + Product Owner | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E11-S4 | Link mời bạn có ghi nhận (5 SP) · SHOULD | S9 | Backend + Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E11-S5 | SEO cho truy vấn "things to do in Da Nang this week" (5 SP) · MUST | S9 | Web | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E12-S4 | Mô tả cửa hàng song ngữ + ảnh chụp màn hình (5 SP) · MUST | S9 | Mobile + Product Owner | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E12-S6 | App được duyệt và có mặt trên cả hai cửa hàng đúng ngày (5 SP) · MUST | S10 | Mobile | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | E5-S10 | Lưu bộ lọc yêu thích, lưu hoạt động xem sau (5 SP) · COULD | S10 | Backend + Web | <span class="nw">⬜ Chưa làm</span> | — |

### 9.2. DoD bổ sung

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S8-DoD-1 | Không còn P0 nào mở. P1 còn mở ≤ 3, mỗi cái có ngày hẹn | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-DoD-2 | Hai chỗ rớt phễu lớn nhất đã có thay đổi cụ thể và đo lại được — ghi rõ "trước / sau" trong issue | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-DoD-3 | Bản dịch tiếng Việt được một người Việt không thuộc đội đọc lại toàn bộ, chấm ≥ 4/5 về độ tự nhiên | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-DoD-4 | Thời gian tải danh sách khám phá trên 4G mô phỏng < 2,5 giây tới nội dung đầu tiên | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-DoD-5 | Realtime: nếu WebSocket rớt thì tự hạ cấp về polling 30 giây, không hiện lỗi cho người dùng | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-DoD-1 | Sự kiện lặp lại: `recurrence_rule` sinh occurrence trước 12 tuần, sửa một buổi không ảnh hưởng các buổi khác, huỷ chuỗi hỏi rõ "buổi này hay tất cả buổi sau" | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-DoD-2 | Release candidate `v1.0.0-rc.1` đã dựng bằng profile `production`, đã chạy hồi quy đầy đủ, không có lỗi chặn | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-DoD-3 | Trang chỉ mục theo khu vực và theo loại hình đã sinh sitemap, đã submit Search Console; Lighthouse SEO ≥ 95 trên 5 trang mẫu | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-DoD-4 | Diễn tập runbook sự cố thật: cố ý tắt Redis trên staging trong giờ làm việc → đo thời gian phát hiện (mục tiêu ≤ 5 phút) và thời gian khôi phục (mục tiêu ≤ 30 phút); biên bản diễn tập lưu lại | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-DoD-5 | Ảnh chụp màn hình cửa hàng dùng dữ liệu thật đã được phép, không dùng ảnh người không có đồng ý | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-DoD-6 | Tài khoản demo cho reviewer cửa hàng đã tạo, có sẵn dữ liệu, thông tin đăng nhập đã ghi vào App Review Notes | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S10-DoD-1 | Toàn bộ checklist §12 đã tích xanh, có tên người ký từng mục | S10 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S10-DoD-2 | Chuông báo (alerting) đã bật cho: tỷ lệ lỗi 5xx > 1%, độ trễ p95 > 800 ms, hàng đợi BullMQ tồn > 500 job, Postgres kết nối > 80% | S10 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S10-DoD-3 | Có phương án lùi (rollback) đã thử: web lùi trong ≤ 5 phút, mobile vá bằng EAS Update trong ≤ 30 phút | S10 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S10-DoD-4 | War-room có kênh riêng, danh sách trực theo giờ, số điện thoại dự phòng | S10 | — | <span class="nw">⬜ Chưa làm</span> | — |

### 9.3. Nghiệm thu

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | M6-1 | Sự kiện đang mở mỗi tuần — đếm số occurrence có `status = 'published'`, `starts_at` rơi trong tuần đó và còn nhận RSVP — ngưỡng: ≥ 25 mỗi tuần, trung bình 4 tuần liên tiếp 25/01 – 21/02/2027, và không tuần nào < 20 (sàn tuyệt đối) |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn tự động, báo cáo tuần |
| ☐ | M6-2 | Phủ khu vực — không khu vực MVP nào có 0 sự kiện đang mở — ngưỡng: 6/6 khu vực (An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn) có ≥ 1 sự kiện trong mỗi tuần của 4 tuần đo |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng chéo tuần × khu vực |
| ☐ | M6-3 | WCA — Weekly Confirmed Attendances, số lượt tham dự đã xác nhận (`checked_in`) trong 7 ngày — ngưỡng: 220 – 280 lượt/tuần ở thời điểm M6. Ngưỡng cảnh báo đỏ: < 110 |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `rsvps.status = 'checked_in'` |
| ☐ | M6-4 | Organizer tự quản lý listing của mình (`events.source = 'self_serve'` và `host_user_id` là người thật) — ngưỡng: ≥ 8 organizer |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Truy vấn `events` gộp theo `host_user_id` |
| ☐ | M6-5 | Tỷ lệ sự kiện tự phục vụ trên tổng sự kiện đang mở — ngưỡng: ≥ 35% |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Báo cáo tuần |
| ☐ | M6-6 | App có mặt trên App Store và Google Play — ngưỡng: Cả hai, trạng thái `available` |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Link cửa hàng công khai |
| ☐ | M6-7 | Web production sống trên tên miền chính, HTTPS, có giám sát — ngưỡng: Đạt |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng giám sát |
| ☐ | M6-8 | Crash-free session, đo 7 ngày trước ra mắt — ngưỡng: ≥ 99,5% |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Sentry |
| ☐ | M6-9 | Beta user hoạt động chuyển tiếp sang bản công khai — ngưỡng: ≥ 100 |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Bảng phân tích |
| ☐ | M6-10 | Runbook sự cố đã diễn tập thật (không phải chỉ viết ra) — ngưỡng: 1 lần diễn tập có biên bản, thời gian phát hiện ≤ 5 phút, khôi phục ≤ 30 phút |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Biên bản diễn tập S9 |
| ☐ | M6-11 | Toàn bộ checklist §12 tích xanh, có tên người ký từng mục — ngưỡng: 100% |  | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Checklist đã ký |

### 9.4. Demo

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | S8-Demo-1 | Bảng lỗi beta: mở đầu sprint bao nhiêu, đóng bao nhiêu, còn lại bao nhiêu | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-Demo-2 | Hai màn hình đã sửa, đặt cạnh ảnh chụp bản cũ, kèm số liệu phễu trước/sau | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-Demo-3 | Mở hai thiết bị cạnh nhau: một máy RSVP → máy kia thấy số chỗ giảm ngay | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S8-Demo-4 | Duyệt toàn bộ app ở chế độ tiếng Việt, không còn chuỗi lai | S8 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-Demo-1 | Tạo một lớp trao đổi ngôn ngữ lặp mỗi Thứ Ba trong 12 tuần → 12 occurrence hiện ra, RSVP vào một buổi không ảnh hưởng buổi khác | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-Demo-2 | Trình bày trang cửa hàng giả lập với ảnh chụp màn hình và mô tả song ngữ | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-Demo-3 | Xem lại video diễn tập tắt Redis, đọc biên bản thời gian phát hiện / khôi phục | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S9-Demo-4 | Báo cáo tuần tự động gửi vào email lúc 09:00 Thứ Hai | S9 | — | <span class="nw">⬜ Chưa làm</span> | — |

### 9.5. Bổ sung từ mockup

| ☐ | Mã | Nội dung | Sprint | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|---|
| ☐ | MK-GATE-01 | Nếu giữ cổng swipe: job đo G1 / G2 hằng ngày trên AD-10, bật điểm vào deck khi đạt 3 tuần liên tiếp. |  | Tech Lead | <span class="nw">⬜ Chưa làm</span> | — |

