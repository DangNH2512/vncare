# Agents — sơ đồ phòng phát triển Da Nang Connect

Thư mục này tổ chức như một đội phần mềm nhỏ của **Da Nang Connect** — nền tảng
kết nối cộng đồng người nước ngoài (expat) tại Đà Nẵng. Dùng bảng chỉ mục dưới
đây khi một workflow cần gọi đúng vai trò.

Kho mã là monorepo: `apps/api` (NestJS 11 + TypeORM + PostgreSQL 16/PostGIS +
Redis/BullMQ), `apps/web-client-side` (Next.js 16 App Router + React 19 +
Tailwind, web cho người dùng cuối), `apps/web-admin-side` (Next.js 16, console
vận hành), `apps/mobile` (Expo 54 + React Native 0.81), `packages/*` dùng chung, và `ops/`
cho hạ tầng. Giai đoạn 1 làm kết nối cộng đồng (sự kiện, thể thao, trao đổi
ngôn ngữ); giai đoạn 2 là nhà ở; giai đoạn 3 là y tế và dịch vụ chuyên môn.

`.claude/agents` là symlink trỏ vào chính thư mục này, nên cùng một bộ định
nghĩa dùng được cho cả Claude Code và các công cụ khác.

## Product

- `product/ba-agent.md` — Business Analyst. Requirement brief, phạm vi,
  acceptance criteria quan sát được, kiểm chứng nghiệp vụ lần cuối.

## Orchestration

- `orchestration/multi-agent-coordinator.md` — Coordinator. Task board, phân
  quyền sở hữu file, thứ tự chạy song song/nối tiếp, Debate Gate, báo cáo cuối.

## Engineering

- `engineering/tech-lead-agent.md` — Engineering Lead. Kiến trúc, task card,
  bản đồ phụ thuộc, Definition of Done.
- `engineering/backend-agent.md` — sở hữu `apps/api`. NestJS, TypeORM, truy vấn
  PostGIS theo khu vực và bán kính, RSVP có sức chứa và hàng đợi chờ, trust
  level, kiểm duyệt, queue BullMQ, Swagger, audit log.
- `engineering/web-client-agent.md` — sở hữu `apps/web-client-side`. Next.js 16
  App Router, trang sự kiện công khai có SEO, feed và chi tiết sự kiện, RSVP,
  khám phá theo khu vực, hồ sơ, bản đồ `MapLibre`, i18n EN/VI, deep link
  `.well-known`.
- `engineering/web-admin-agent.md` — sở hữu `apps/web-admin-side`. Next.js 16
  App Router, console curate, hàng đợi kiểm duyệt, xử lý báo cáo, quản lý người
  dùng và role, quản lý khu vực và danh mục, analytics, audit log viewer.
  Không SEO, ưu tiên desktop.
- `engineering/mobile-agent.md` — sở hữu `apps/mobile`. Expo Router,
  `react-native-maps`, Expo Push Notifications, quyền hệ thống, EAS
  Build/Submit.

## Quality

- `quality/code-review-agent.md` — rà soát độc lập: tính đúng đắn, ranh giới sở
  hữu, bảo mật và riêng tư, mức độ đủ của test.
- `quality/tester-agent.md` — Tester Lead. Phân rã việc kiểm chứng và gộp kết
  quả của các chuyên gia thành một phán quyết duy nhất.
- `quality/unit-test-agent.md` — logic thuần, hook, helper, service, DTO
  validation, chính sách repository.
- `quality/integration-test-agent.md` — hợp đồng REST, hành vi PostgreSQL/
  PostGIS, auth và quyền, `AuditLog`, queue và realtime.
- `quality/screen-test-agent.md` — luồng trên trình duyệt và app thật, trạng
  thái hiển thị, i18n EN/VI, bản đồ, responsive, E2E.
- `quality/regression-test-agent.md` — luồng lân cận, package dùng chung, rủi
  ro chặn phát hành, rủi ro còn lại.

## Operations

- `operations/ops-monitor-agent.md` — giám sát vận hành: Sentry, log nginx và
  container, PostgreSQL, Redis/BullMQ, tỉ lệ gửi push, tín hiệu tấn công, nguy
  cơ rò rỉ dữ liệu cá nhân.

## Phân quyền sở hữu file

| Agent | Sở hữu | Không được chạm |
|---|---|---|
| `backend-agent` | `apps/api/**`, `packages/shared-types/**`, `packages/validation/**` khi hợp đồng đổi | `apps/web-client-side/**`, `apps/web-admin-side/**`, `apps/mobile/**` |
| `web-client-agent` | `apps/web-client-side/**`, `packages/ui/**`, `packages/i18n/**` khi được giao | `apps/api/**`, `apps/web-admin-side/**`, `apps/mobile/**` |
| `web-admin-agent` | `apps/web-admin-side/**`, `packages/ui/**`, `packages/i18n/**` khi được giao | `apps/api/**`, `apps/web-client-side/**`, `apps/mobile/**` |
| `mobile-agent` | `apps/mobile/**`, `packages/i18n/**` khi được giao | `apps/api/**`, `apps/web-client-side/**`, `apps/web-admin-side/**` |
| `ops-monitor-agent` | `ops/**` khi dựng giám sát | toàn bộ `apps/**` |
| `tech-lead-agent`, `ba-agent`, `code-review-agent`, các agent kiểm thử | chỉ đọc | mọi file hiện thực |

`packages/i18n/**` luôn phải sửa **nối tiếp**, không bao giờ song song — cả
`apps/web-client-side`, `apps/web-admin-side` lẫn `apps/mobile` đều đọc nó.
Không bao giờ để hai agent ghi vào cùng một file cùng lúc.

## Cấu trúc bắt buộc của mỗi file agent

Mỗi file trong thư mục này phải có đủ: **vai trò**, **nhiệm vụ**, **phạm vi sở
hữu file**, danh sách **Read First**, **nguyên tắc làm việc**, **checklist
trước khi bàn giao**, và **quy ước bàn giao**. Read First chỉ được trỏ tới file
có thật trong repo, bằng đường dẫn tương đối từ gốc repo.

## Luồng chuẩn

```text
BA
  -> Tech Lead
  -> Coordinator
  -> backend-agent / web-client-agent / web-admin-agent / mobile-agent
  -> Code Review
  -> Tester Lead
      -> Unit Test
      -> Integration Test
      -> Screen Test
      -> Regression Test
  -> agent sở hữu file sửa lỗi được trả về
  -> BA kiểm chứng nghiệp vụ lần cuối
  -> Coordinator báo cáo tích hợp
```

## Ràng buộc xuyên suốt mọi vai trò

- **i18n**: tiếng Anh là ngôn ngữ mặc định của UI, tiếng Việt là ngôn ngữ thứ
  hai. Không hardcode chuỗi hiển thị. Key mới phải có đủ cặp `en` + `vi`.
- **Thời gian**: lưu UTC (`timestamptz`), hiển thị theo `Asia/Ho_Chi_Minh`.
  Không hardcode `+07` trong logic nghiệp vụ.
- **Địa lý**: truy vấn theo khu vực và bán kính dùng PostGIS
  (`geography(Point,4326)`, `ST_DWithin`, index GIST). Khu vực v1: An Thượng,
  Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn.
- **Nội dung người dùng tạo**: mọi thứ hiển thị cho người lạ phải kiểm duyệt và
  report được, ẩn được mà không cần xoá.
- **Không thu thập tự động**: curate là thủ công (`manual_only`). Không viết
  scraper, không tích hợp API của nền tảng nguồn.
- **Riêng tư**: chỉ lưu dữ liệu thực sự dùng. Không lưu lịch sử vị trí. Không
  log token, OTP, số điện thoại đầy đủ.
- **Tài liệu**: dùng đường dẫn tương đối từ gốc repo, không dùng đường dẫn
  tuyệt đối của máy cá nhân.
