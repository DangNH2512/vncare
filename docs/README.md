# Tài Liệu Da Nang Connect

## Phân tích dự án

Bộ tài liệu phân tích đầy đủ cho giai đoạn 1 (Kết nối cộng đồng, phạm vi Đà Nẵng).
Bắt đầu từ [bản tổng hợp](analysis/00-TONG-HOP-DU-AN.md).

| # | Tài liệu | Nội dung |
|---|---|---|
| 00 | [Tổng hợp dự án](analysis/00-TONG-HOP-DU-AN.md) | Tóm tắt điều hành, decision log, câu hỏi còn mở, việc cần làm ngay |
| 01 | [Tác nhân & phân quyền](analysis/01-tac-nhan-va-phan-quyen.md) | Actor, persona, ma trận RBAC, trust level, vòng đời tài khoản |
| 02 | [Use case](analysis/02-use-case.md) | Đặc tả use case theo epic, ưu tiên MoSCoW, ranh giới MVP |
| 03 | [Domain & dữ liệu](analysis/03-domain-va-du-lieu.md) | Entity, ERD, state machine, chiến lược PostGIS và tìm kiếm |
| 04 | [Tech stack & kiến trúc](analysis/04-tech-stack-va-kien-truc.md) | Lựa chọn công nghệ, monorepo, hợp đồng API, CI/CD, chi phí hạ tầng |
| 05 | [Trust & safety](analysis/05-trust-safety-va-kiem-duyet.md) | Rủi ro, xác thực theo tầng, kiểm duyệt, an toàn khi gặp mặt |
| 07 | [Go-to-market Đà Nẵng](analysis/07-go-to-market-da-nang.md) | Bản đồ kênh, seed 100 user đầu, playbook curate, hệ thống chỉ số |
| 08 | [Roadmap & triển khai](analysis/08-roadmap-va-ke-hoach-trien-khai.md) | Epic, sprint, milestone, đội ngũ, ngân sách |
| 09 | [Cạnh tranh & rủi ro](analysis/09-canh-tranh-va-rui-ro.md) | Phân tích đối thủ, risk register, phân tích độ nhạy |
| 10 | [UX & i18n](analysis/10-ux-luong-man-hinh-va-i18n.md) | Sitemap, user flow, wireframe, empty state, design system, i18n |
| 13 | [Bản đồ & mật độ sự kiện](analysis/13-ban-do-va-truc-quan-hoa-su-kien.md) | Đánh giá ý tưởng "zone đỏ", thiết kế phân tầng theo zoom, truy vấn PostGIS, kế hoạch M0–M6 |

## Thư mục khác

- [`source/`](source/) — tài liệu gốc nhận từ chủ dự án.
- [`guides/`](guides/) — hướng dẫn xuất PDF cho chủ dự án, sinh bằng skill `owner-guide-pdf`.
- [`mockups/`](mockups/) — mockup và wireframe.

## Quy ước làm việc

Quy tắc kỹ thuật, định nghĩa agent và skill nằm ở [`../.agent/`](../.agent/).
Đáng đọc trước: [`../.agent/rules/backend-module-structure.md`](../.agent/rules/backend-module-structure.md)
và [`../.agent/rules/ownership.md`](../.agent/rules/ownership.md).
