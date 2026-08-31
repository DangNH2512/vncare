---
name: project-help
description: >
  Skill định hướng "làm gì tiếp theo" cho Da Nang Connect — đọc trạng thái hiện
  tại của dự án rồi chỉ ra bước kế tiếp trong quy trình BA-first multi-agent.
  Lấy cảm hứng từ `bmad-help` của BMAD Method (bmad-code-org/bmad-method).
triggers:
  - "project-help"
  - "không biết làm gì tiếp"
  - "what do I do next"
  - "hướng dẫn"
  - "bắt đầu từ đâu"
  - "tôi đang ở bước nào"
---

# Project Help — Định hướng bước kế tiếp

## Mục đích

Xác định người dùng đang đứng ở đâu trong vòng đời tính năng của Da Nang Connect
rồi đề xuất hành động cụ thể tiếp theo. Cũng dùng để trả lời câu hỏi về cách hệ
thống agent/skill của repo này vận hành.

## Khi nào kích hoạt

- Người dùng hỏi "làm gì tiếp?", "project-help", "bắt đầu từ đâu", hoặc tương tự.
- Người dùng phân vân nên gọi role/skill/workflow nào.
- Vừa xong một pha và chưa rõ pha kế tiếp.
- Bất cứ lúc nào người dùng hỏi hệ thống hoạt động thế nào.

---

## Bối cảnh sản phẩm (đọc trước khi tư vấn)

**Da Nang Connect** — nền tảng kết nối cộng đồng người nước ngoài (expat) tại
Đà Nẵng, triển khai theo 3 giai đoạn:

| Giai đoạn | Phạm vi | Trạng thái |
|-----------|---------|-----------|
| **1 — Kết nối cộng đồng** | Sự kiện, thể thao, trao đổi ngôn ngữ (event, RSVP, tìm kiếm & lọc theo khu vực, hồ sơ cá nhân có độ tin cậy, kiểm duyệt UGC) | **Đang làm — MVP** |
| 2 — Nhà ở | Listing, tìm phòng/căn hộ | Chưa mở |
| 3 — Y tế / dịch vụ chuyên môn | Đặt lịch khám, danh bạ dịch vụ | Chưa mở |

Khu vực (area) chuẩn của giai đoạn 1: **My Khe, An Thuong, My An, Hai Chau,
Son Tra, Ngu Hanh Son**. Nếu một đề xuất tính năng không phục vụ giai đoạn 1 thì
mặc định đẩy vào `.agent/future-plans/`, không đưa vào sprint hiện tại.

---

## Các bước thực thi

### Bước 1 — Đọc trạng thái hiện tại

Quét các file sau (chỉ đọc cái nào đang tồn tại):

```
.agent/memory/ACTIVE_TASKS.md           # Việc hôm nay + tiến độ
.agent/stories/                        # Story đang có + status
.agent/specs/capability-map.md         # Độ phủ đặc tả tính năng
.agent/future-plans/                   # Tính năng đang xếp hàng
```

Vì repo đang là **greenfield** (chưa có code trong `apps/`), hãy kiểm tra thêm
mức độ hoàn thiện của bộ khung trước khi khuyên viết tính năng:

```bash
ls apps/api apps/web apps/mobile packages/shared-types ops 2>/dev/null
```

Nếu các thư mục này chưa tồn tại thì bước kế tiếp gần như luôn là **dựng khung
monorepo + hạ tầng Docker Compose (PostgreSQL 16 + PostGIS, Redis)**, chứ không
phải viết story tính năng.

### Bước 2 — Phân loại pha của dự án

| Pha | Dấu hiệu | Bước kế tiếp đề xuất |
|-----|----------|----------------------|
| **0 — Chưa có bộ khung** | `apps/` trống, chưa có docker-compose | Dựng monorepo + hạ tầng local (Postgres/PostGIS, Redis), rồi mới tới tính năng |
| **1 — Chưa định nghĩa tính năng** | Không có task đang chạy, không có BA brief | Chạy `feature-discovery` hoặc `write-spec` trước |
| **2 — Ý tưởng còn mơ hồ** | Có ý tưởng thô, chưa có Brief | BA Agent → Requirement Brief |
| **3 — Đã có BA Brief** | Có Requirement Brief, chưa có story | Skill `story-writer` → tạo file story |
| **4 — Story sẵn sàng** | Story ở trạng thái `ready-for-dev` | Backend/Web/Mobile agent → triển khai |
| **5 — Đang triển khai** | Story ở trạng thái `in-progress` | Tiếp tục với agent đang phụ trách |
| **6 — Code xong** | Task trong story đã tick hết | Tester Agent → đối chiếu Acceptance Criteria |
| **7 — Tester trả lỗi** | Tester tìm thấy vấn đề | Agent sở hữu phần đó → sửa lỗi |
| **8 — Tester pass** | Toàn bộ AC xanh | BA Agent → nghiệm thu cuối |
| **9 — BA duyệt** | BA đã xác nhận | Coordinator → báo cáo tích hợp |

### Bước 3 — Xuất khuyến nghị

Trình bày câu trả lời theo khuôn:

```
## Project Help — Bạn đang ở đâu

**Pha hiện tại:** [Pha N — Tên]

**Đã xong tới đâu:**
- [gạch đầu dòng các bước đã hoàn tất]

**Bước kế tiếp nên làm:**
-> [hành động cụ thể, ví dụ: "Chạy BA Agent với mô tả tính năng RSVP"]

**Role/Skill nên dùng:**
- Role: [BA Agent | Backend Agent | Web Agent | Mobile Agent | Tester Agent | ...]
- Skill: [tên skill nếu có]
- Gợi ý lệnh: [hướng dẫn ngắn]

**Vì sao là bước này:**
[giải thích 1-2 câu]

**Tuỳ chọn / có thể làm song song:**
- [phương án thay thế nếu người dùng muốn làm việc khác]

**Tham chiếu nhanh — toàn bộ quy trình:**
1. feature-discovery (tính năng còn mơ hồ) -> Discovery Brief
2. BA Agent -> Requirement Brief + Acceptance Criteria
3. story-writer -> file story (tính năng vừa/lớn)
4. round-table -> chốt hợp đồng giữa các service (tính năng xuyên app)
5. Backend / Web / Mobile -> triển khai phần được giao
6. Tester Agent -> đối chiếu AC
7. Agent sở hữu -> sửa lỗi
8. BA Agent -> nghiệm thu cuối
9. Coordinator -> báo cáo tích hợp
```

### Bước 4 — Trả lời câu hỏi phụ

Nếu người dùng hỏi cụ thể về quy trình ("BA agent làm gì?", "khi nào dùng
story-writer?"), trả lời trực tiếp gồm: role/skill đó làm gì, khi nào kích hoạt,
và output kỳ vọng.

---

## Ngữ cảnh riêng của dự án

Monorepo có **bốn bề mặt code** chính:

- **Backend** — `apps/api/` (NestJS 11 + TypeScript + TypeORM + PostgreSQL 16 với
  PostGIS + Redis cho cache/BullMQ)
- **Web** — `apps/web/` (Next.js 15 App Router + React 19 + Tailwind CSS,
  bản đồ bằng react-leaflet)
- **Mobile** — `apps/mobile/` (Expo 54 + React Native 0.81, bản đồ bằng
  react-native-maps, build/submit qua EAS)
- **Shared types** — `packages/shared-types/` (DTO/enum dùng chung cho cả ba app)
- Hạ tầng vận hành ở `ops/` (Docker Compose, script deploy, GitHub Actions).

Quy tắc cần nhắc khi liên quan:

- **Backend:** không truy vấn DB trực tiếp trong Service — đi qua Repository.
  Mọi mutation phải ghi audit log. Truy vấn theo khu vực/bán kính dùng PostGIS
  (`ST_DWithin`, `geography`), không tự tính khoảng cách trong JavaScript.
- **Thời gian:** lưu UTC trong DB, hiển thị theo `Asia/Ho_Chi_Minh`. Sự kiện có
  giờ bắt đầu/kết thúc nên mọi so sánh "sắp diễn ra / đã qua" phải quy về UTC trước.
- **i18n:** tiếng Anh là ngôn ngữ mặc định của UI (người dùng là expat), tiếng
  Việt là ngôn ngữ thứ hai. Không hardcode chuỗi — luôn `t('key')` và bổ sung
  đồng thời `en.json` + `vi.json`.
- **UGC:** mọi nội dung do người dùng tạo (sự kiện, ảnh, bình luận, hồ sơ) phải
  đi qua luồng kiểm duyệt — report, ẩn tạm, duyệt/từ chối.
- **Quyền riêng tư:** tuân thủ Nghị định 13/2023/ND-CP — có cơ sở pháp lý cho mỗi
  loại dữ liệu cá nhân, cho phép người dùng tự xoá tài khoản/dữ liệu.
- **Done = `tsc` pass + luồng thật đã xác nhận** (API/trình duyệt/thiết bị), chứ
  không chỉ compile.
- Tính năng lớn (>8 file): DỪNG -> lập kế hoạch đầy đủ -> chờ duyệt.

---

## Nguồn

Phỏng theo skill `bmad-help` của BMAD Method
(https://github.com/bmad-code-org/bmad-method — giấy phép MIT).
Đã tuỳ biến cho stack của Da Nang Connect và luồng tuần tự BA-first.
