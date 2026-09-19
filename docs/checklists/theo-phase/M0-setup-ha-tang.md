# Checklist M0 · Setup hạ tầng

**Dự án:** Da Nang Connect — Giai đoạn 1 (MVP) · **Trạng thái chụp:** 19/09/2026 · **Ngày chốt:** 18/09/2026

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

## 2. M0 · Setup hạ tầng — chốt 18/09/2026

**Sprint:** S0 · **Tổng:** 33 mục · ✅ 6 · 🟡 6 · ⬜ 13 · ⛔ 0 · ❓ 2 · ⚪ 6 · **Tỷ lệ xong:** 18%

**Mục tiêu:**

- S0 — Nền móng (07/09 – 18/09/2026): Bất kỳ ai trong đội `git clone` xong chạy được toàn bộ hệ thống trong 5 phút, và mỗi lần merge vào `develop` là staging tự cập nhật.

**Nếu trượt:** M0 trượt tối đa 3 ngày làm việc. Quá 3 ngày thì rút E1-S8 xuống mức script và đẩy phần còn lại vào S1 — không được để trượt lan sang M1 vì M1 nằm trên đường găng.

### 2.1. Việc chặn & cần chốt

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | CH-06 | Chốt quy mô đội: đủ đội 5,5 FTE hay tinh gọn 2 dev + Founder. Git log hiện chỉ có 1 người commit; velocity 53 SP/sprint của S1 dựa trên đội đủ. | Founder | <span class="nw">❓ Cần chốt</span> | Hạn 03/09, đã quá hạn. |
| ☐ | T-TL-01 | Tạo ops/legal/ + ops/legal/drafts/ cho bản nháp ToS / Privacy. | Tech Lead | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | T-TL-02 | Secret scanning (gitleaks) + tách biến môi trường trong CI, trước khi nạp khoá JWT, OAuth, Apple .p8. | Tech Lead | <span class="nw">⬜ Chưa làm</span> | Rủi ro tăng ngay trong Sprint 1. |

### 2.2. Story

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

### 2.3. DoD bổ sung

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S0-DoD-1 | Người thứ hai trong đội làm theo `README` từ máy sạch, dựng xong toàn hệ thống trong ≤ 5 phút bấm đồng hồ, không hỏi ai | — | <span class="nw">🟡 Một phần</span> | Lệnh pnpm dev tự động hoá đủ; chưa có lần bấm giờ thật trên máy sạch. |
| ☐ | S0-DoD-2 | `GET /health` trả 200 từ tên miền staging thật (không phải IP), có HTTPS hợp lệ | — | <span class="nw">⬜ Chưa làm</span> | Chưa có staging (phụ thuộc E1-S8). |
| ☐ | S0-DoD-3 | CI chạy < 8 phút; PR đỏ không merge được (branch protection đã bật) | — | <span class="nw">⚪ Chưa xác nhận</span> | Cần người có quyền admin repo kiểm branch protection và đo thời gian CI thật. |
| ☐ | S0-DoD-4 | Dev build cài được lên 1 iPhone thật + 1 Android thật, ảnh chụp màn hình lưu trong issue | — | <span class="nw">⬜ Chưa làm</span> | Chưa có project Expo (E1-S6). |
| ☑ | S0-DoD-5 | Khung i18n có sẵn 2 locale `en`/`vi`, mặc định `en`; đã có 1 chuỗi mẫu chứng minh cả hai đường | — | <span class="nw">✅ Xong</span> | — |
| ☐ | S0-DoD-6 | Sổ đăng ký hoạt động xử lý dữ liệu cá nhân đã tạo file rỗng có cấu trúc, chờ điền từ S1 | — | <span class="nw">⬜ Chưa làm</span> | Chưa có file sổ đăng ký, chưa có thư mục ops/legal/. |

### 2.4. Nghiệm thu

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | M0-1 | `GET /api/v1/health` trả 200 từ tên miền staging có HTTPS hợp lệ | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Ảnh chụp `curl -i` + chứng chỉ |
| ☐ | M0-2 | CI xanh trên `develop`, thời gian chạy < 8 phút, branch protection đã bật | — | <span class="nw">🟡 Một phần</span> | CI chạy trên PR; thiếu build + branch protection chưa xác nhận. Bằng chứng: Link run CI + ảnh cấu hình |
| ☐ | M0-3 | Người thứ hai dựng local từ máy sạch trong ≤ 5 phút | — | <span class="nw">🟡 Một phần</span> | Chưa bấm giờ thật. Bằng chứng: Video màn hình bấm đồng hồ |
| ☐ | M0-4 | Dev build cài chạy trên 1 iPhone thật + 1 Android thật | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: 2 ảnh chụp màn hình thiết bị |
| ☐ | M0-5 | Merge `develop` → staging tự cập nhật ≤ 10 phút (hoặc script 1 lệnh, xem phương án hạ tải §6.3) | — | <span class="nw">⬜ Chưa làm</span> | Bằng chứng: Log deploy |
| ☑ | M0-6 | 2 locale `en`/`vi` hoạt động, mặc định `en` | — | <span class="nw">✅ Xong</span> | Bằng chứng: Ảnh 2 trạng thái |
| ☐ | M0-7 | Hồ sơ D-U-N-S đã nộp, có mã hồ sơ | — | <span class="nw">⚪ Chưa xác nhận</span> | Việc của Founder, chưa có bằng chứng trong repo. Bằng chứng: Email xác nhận |

### 2.5. Demo

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S0-Demo-1 | Mở terminal máy sạch, `git clone` + `docker compose up`, gọi `curl localhost:3000/api/v1/health` → `{"status":"ok"}` | — | <span class="nw">🟡 Một phần</span> | Chạy được trên localhost; staging chưa có. |
| ☐ | S0-Demo-2 | Mở trình duyệt vào tên miền staging → trang Next.js chào mừng, bấm nút đổi ngôn ngữ EN ↔ VI | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S0-Demo-3 | Cầm iPhone thật lên, mở app dev build, đi qua 3 màn hình khung | — | <span class="nw">⬜ Chưa làm</span> | — |
| ☐ | S0-Demo-4 | Push 1 commit vô hại lên `develop` ngay trong buổi demo → mọi người xem CI chạy và staging tự cập nhật sau ~6 phút | — | <span class="nw">⬜ Chưa làm</span> | — |

### 2.6. Việc ngoài SP

| ☐ | Mã | Nội dung | Phụ trách | Trạng thái | Ghi chú / bằng chứng |
|:-:|---|---|---|---|---|
| ☐ | S0-Ops-1 | Nộp hồ sơ D-U-N-S Number (miễn phí, 5–14 ngày làm việc) — đây là việc chặn dài nhất của cả dự án, làm ngày đầu tiên | Founder / Community Manager | <span class="nw">⚪ Chưa xác nhận</span> | — |
| ☐ | S0-Ops-2 | Mở tài khoản Google Play Console (25 USD một lần) — làm ngay vì chính sách closed testing 14 ngày tính từ lúc có tester | Founder / Community Manager | <span class="nw">⚪ Chưa xác nhận</span> | — |
| ☐ | S0-Ops-3 | Đăng ký tên miền + email doanh nghiệp | Founder / Community Manager | <span class="nw">⚪ Chưa xác nhận</span> | — |
| ☐ | S0-Ops-4 | Chốt danh sách 20 organizer mục tiêu để tiếp cận từ S2 | Founder / Community Manager | <span class="nw">⚪ Chưa xác nhận</span> | — |

