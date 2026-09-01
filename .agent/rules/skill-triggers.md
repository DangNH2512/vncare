---
description: Quy tắc trigger — với mỗi loại task thì nạp tài liệu/skill nào.
---

# Skill Triggers — Nạp Cái Gì, Khi Nào

Chỉ nạp đúng tài liệu mà task hiện tại thật sự cần. Mặc định nạp lười.

> **Bước quét là bắt buộc.** [skill-first.md](skill-first.md) buộc mọi task phải
> đối chiếu bảng dưới đây và tuyên bố skill áp dụng trước khi sửa file. Nạp lười
> nói về *nạp ít*, không phải *bỏ qua*.

---

## Bảng trigger

| Loại task | Từ khoá / tín hiệu | Nạp file này |
|---|---|---|
| **Cổng lập kế hoạch** | Bất kỳ tính năng, bug, refactor nào trước khi sửa | [planning-and-agent-mode.md](planning-and-agent-mode.md) |
| **Bất kỳ thay đổi code/config/docs nào** | Build, fix, tinh chỉnh, refactor, setup, cấu hình | [skills/project-architecture/SKILL.md](../skills/project-architecture/SKILL.md) |
| **API / Backend (endpoint, module, service, repository)** | "new endpoint", "PATCH /...", "POST /...", "module mới", "repository" | [backend-module-structure.md](backend-module-structure.md) + [04-tech-stack-va-kien-truc.md](../../docs/analysis/04-tech-stack-va-kien-truc.md) |
| **Mô hình dữ liệu / bảng / quan hệ** | "entity", "bảng", "quan hệ", "field mới", "enum", "domain" | [03-domain-va-du-lieu.md](../../docs/analysis/03-domain-va-du-lieu.md) |
| **Vai trò, phân quyền, tier tin cậy** | "role", "permission", "moderator", "curator", "trust tier", "ai được làm gì" | [01-tac-nhan-va-phan-quyen.md](../../docs/analysis/01-tac-nhan-va-phan-quyen.md) |
| **Kiểm duyệt UGC / an toàn cộng đồng** | "report nội dung", "kiểm duyệt", "spam", "chặn user", "rate limit", "trust score", "no-show" | [05-trust-safety-va-kiem-duyet.md](../../docs/analysis/05-trust-safety-va-kiem-duyet.md) + [checklists.md](checklists.md) §UGC |
| **Quyền riêng tư** | "dữ liệu cá nhân", "PII", "đồng ý", "xoá tài khoản" | [checklists.md](checklists.md) §quyền riêng tư + [05-trust-safety-va-kiem-duyet.md](../../docs/analysis/05-trust-safety-va-kiem-duyet.md) |
| **Truy vấn địa lý / bản đồ / khu vực** | "PostGIS", "bán kính", "gần tôi", "khu vực", "An Thuong", "map", "marker" | [checklists.md](checklists.md) §PostGIS + [04-tech-stack-va-kien-truc.md](../../docs/analysis/04-tech-stack-va-kien-truc.md) §4.6 |
| **Component / page / UI web** | "page.tsx", "modal", "table", "form", "component", "UI", "design", "dashboard", "trông generic", "thẩm mỹ" | [skills/modern-ui-design/SKILL.md](../skills/modern-ui-design/SKILL.md) + [skills/frontend-design/SKILL.md](../skills/frontend-design/SKILL.md) |
| **Mockup / demo thiết kế (chưa code)** | "mockup", "xem mockup", "thiết kế màn hình", "demo giao diện", "phác thảo UI trước khi code" | [skills/mockup-builder/SKILL.md](../skills/mockup-builder/SKILL.md) — HTML tự chứa; **BẮT BUỘC mở và chụp lại để kiểm chứng sau khi tạo/sửa** |
| **Realtime / WebSocket / push** | "realtime", "socket", "socket.io", "push", "Expo push", "thông báo đẩy" | [04-tech-stack-va-kien-truc.md](../../docs/analysis/04-tech-stack-va-kien-truc.md) §4.8 + [checklists.md](checklists.md) §push |
| **Timezone / ngày giờ** | "timezone", "hôm nay", "giờ Đà Nẵng", "UTC", "lịch lặp" | [checklists.md](checklists.md) §Timezone |
| **i18n** | "dịch", "translation", "en.json", "vi.json", "t('key')" | [checklists.md](checklists.md) §i18n |
| **Màn dashboard / report / analytics** | "dashboard", "report", "analytics", "thông số", "metric", "KPI", "chart", "biểu đồ" | [dashboard-metric-tooltips.md](dashboard-metric-tooltips.md) — mọi số liệu/biểu đồ phải có tooltip giải thích ở cả hai locale |
| **E2E web (Playwright)** | "playwright", "spec", "e2e", "test luồng browser" | [test-file-placement.md](test-file-placement.md) + [skills/webapp-testing/SKILL.md](../skills/webapp-testing/SKILL.md) |
| **Viết/di chuyển BẤT KỲ file spec test nào** | `*.spec.ts` mới, "unit test", "viết test", chạm module có spec đặt lẫn trong `src/` | [test-file-placement.md](test-file-placement.md) — spec nằm ở `e2e/`, KHÔNG BAO GIỜ trong `src/` |
| **Đội test chuyên sâu** | việc web/mobile medium/large/rủi ro, "test kỹ", "UT", "unit test", "IT", "integration test", "test màn hình", "regression" | [workflows/multi-agent-task.md](../workflows/multi-agent-task.md) + [`.agent/agents/quality/tester-agent.md`](../agents/quality/tester-agent.md) |
| **Sheet bug từ feedback tester** | "tạo sheet bug", "log bug", "tổng hợp bug", "list bug từ ảnh/video", "bug tracker", một lô feedback tester cần biến thành việc theo dõi được | [skills/bug-report-sheet/SKILL.md](../skills/bug-report-sheet/SKILL.md) — ưu tiên bằng chứng; bám format tracker sẵn có của đội nếu đã có. **Không** dùng cho yêu cầu fix một lỗi đơn lẻ (→ `/debug`) |
| **Xác minh ba pha** | "test 3 phase", "cross-platform test", "build simulator test", "so sánh nhiều màn hình" (mọi kích thước); trên task **large**: luồng xuyên app (mobile+web/API), thay đổi chạm native, kiểm tra trước phát hành | [three-phase-verification.md](three-phase-verification.md) |
| **Schema DB / migration** | "migration", "schema", "alter table", "thêm cột", "index", "jsonb", "PostGIS", "đổi DB" | [skills/database-migrations/SKILL.md](../skills/database-migrations/SKILL.md) |
| **Tiền kiểm DB trước deploy (staging/prod)** | "deploy", "deploy staging", "deploy prod", "thiếu table trên server", "deploy lỗi DB" | [skills/database-migrations/SKILL.md](../skills/database-migrations/SKILL.md) §Deploy Pre-Flight |
| **Thay đổi nhạy cảm bảo mật** | "auth", "login", "token", "refresh", "secret", "upload", "user input", "endpoint" | [skills/security-review/SKILL.md](../skills/security-review/SKILL.md) |
| **Docker / deploy / hạ tầng** | "docker", "compose", "deploy", "nginx", "production" | [workflows/deploy.md](../workflows/deploy.md) + `ops/` |
| **Sửa bug** | "bug", "fix", "hỏng", "không hoạt động" | [behaviors.md](behaviors.md) §B1 + [skills/systematic-debugging/SKILL.md](../skills/systematic-debugging/SKILL.md) |
| **Refactor / tách file** | "refactor", "tách file", "split", "extract" | [behaviors.md](behaviors.md) §B4 |
| **Tổng quan kiến trúc** | "architecture", "cái này chạy thế nào", "tổng quan" | [skills/project-architecture/SKILL.md](../skills/project-architecture/SKILL.md) |
| **Trước khi báo done** | Bất kỳ task nào vừa xong | [skills/verification-before-completion/SKILL.md](../skills/verification-before-completion/SKILL.md) + [observe-reality.md](observe-reality.md) |
| **Radar hành vi lạ / phân tích lỗ hổng** | "hành vi kỳ lạ", "có gì đó sai", "gap analysis", "sao UI lại thế", mọi lượt quét của BA hoặc Tester | [skills/behavior-smells/SKILL.md](../skills/behavior-smells/SKILL.md) |
| **Xác minh bằng quan sát thật** | "mở browser", "verify UI", "test flow", mọi lần kiểm tra cổng Done | [observe-reality.md](observe-reality.md) |
| **Kết phiên** | Cuối phiên làm việc | [skills/session-end/SKILL.md](../skills/session-end/SKILL.md) |
| **Multi-agent / vòng lặp phòng ban dev L8** | "multi agent", "subagent", "chạy song song", "phòng ban dev", "chia task", yêu cầu mới mơ hồ, việc large/xuyên ranh giới/rủi ro, đổi hợp đồng web+API | [workflows/multi-agent-task.md](../workflows/multi-agent-task.md) |
| **Thêm hoặc học skill MỚI** | "thêm skill", "học skill mới", "tạo skill", "cải thiện skill", "adopt a skill" — **agent tự chạy skill này mỗi khi nhận một skill mới, người dùng không cần nhớ** | [skills/skill-creator/SKILL.md](../skills/skill-creator/SKILL.md) |
| **Review PR / tính năng trước khi merge** | "review", "PR", "code review", "merge", "review tính năng/refactor này" | [skills/specialized-code-review/SKILL.md](../skills/specialized-code-review/SKILL.md) |
| **Kiểm tra luồng UI (cổng Done)** | "đã kiểm tra trên browser", "test flow", "verify UI", "chạy được không", mọi thay đổi UI | [skills/webapp-testing/SKILL.md](../skills/webapp-testing/SKILL.md) |
| **Bằng chứng bằng hình ảnh** | "chụp màn hình", "screenshot", "cho tôi xem", mọi tính năng/bug UI trước khi báo done | [skills/screenshot-evidence/SKILL.md](../skills/screenshot-evidence/SKILL.md) |
| **Phát hành app store / OTA** | "submit App Store", "Google Play", "deploy mobile bản prod", "build 1.0.x", "eas build/submit/update", "OTA", "release notes" | [skills/app-store-deploy/SKILL.md](../skills/app-store-deploy/SKILL.md) |
| **Quét bảo mật chủ động** | "security scan", "tìm lỗ hổng", "threat model", "pen test", trước khi phát hành | [skills/autonomous-security-scan/SKILL.md](../skills/autonomous-security-scan/SKILL.md) |
| **Cưỡng chế một rule hay bị quên** | "rule cứ bị phá", "thêm hook", "enforce", "hookify" | [skills/hookify-rules/SKILL.md](../skills/hookify-rules/SKILL.md) |
| **Tìm thư viện / tài nguyên trước khi tự viết** | "có package nào không", "tìm npm", "search GitHub", "open source cho", "docs của", "trước khi tôi tự build" | [skills/resource-discovery/SKILL.md](../skills/resource-discovery/SKILL.md) |
| **Dựng / mở rộng MCP server** | "MCP tool mới", "mở rộng MCP", "nối API ngoài qua MCP" | [skills/mcp-builder/SKILL.md](../skills/mcp-builder/SKILL.md) |
| **Khám phá tính năng (mơ hồ hoặc hoàn toàn mới)** | "chưa hình dung", "research feature", "phân tích chức năng", "giúp tôi nghĩ", "sản phẩm tương tự", "lập PRD/MVP", tính năng mới chạm vai trò người dùng chưa khám phá | [skills/feature-discovery/SKILL.md](../skills/feature-discovery/SKILL.md) |
| **Báo cáo tuần / tiến độ cho stakeholder** | "báo cáo tuần", "báo cáo tiến độ", "weekly report", cuối tuần làm việc | [skills/weekly-report/SKILL.md](../skills/weekly-report/SKILL.md) |
| **Viết tài liệu / báo cáo / xuất PDF** | "viết doc", "report", "tài liệu", "export PDF", "căn lề", "format docs" | [skills/doc-formatting/SKILL.md](../skills/doc-formatting/SKILL.md) |
| **Hướng dẫn workflow / không biết làm gì tiếp** | "không biết làm gì tiếp", "bắt đầu từ đâu", "tôi đang ở bước nào", "hướng dẫn", "what do I do next" | [skills/project-help/SKILL.md](../skills/project-help/SKILL.md) |
| **Chia story / epic sau BA brief** | "tạo story", "create story", "viết story", "break into stories", "tạo epic", tính năng vừa-lớn sau khi BA brief được duyệt | [skills/story-writer/SKILL.md](../skills/story-writer/SKILL.md) |
| **Bàn hợp đồng xuyên service** | "round-table", "thống nhất API", "contract discussion", "các agent bàn nhau", tính năng xuyên app mà shape API còn chưa rõ | [skills/round-table/SKILL.md](../skills/round-table/SKILL.md) |
| **Viết spec / PRD** | "viết spec", "PRD", "feature spec", "acceptance criteria", "goals/non-goals", "scope tính năng" | [skills/write-spec/SKILL.md](../skills/write-spec/SKILL.md) |
| **Tạo / sắp lại roadmap** | "roadmap", "ưu tiên lại", "Now/Next/Later", "dời timeline", "thêm initiative", "giai đoạn 2 nhà ở" | [skills/roadmap-update/SKILL.md](../skills/roadmap-update/SKILL.md) + [08-roadmap-va-ke-hoach-trien-khai.md](../../docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md) |
| **Lập kế hoạch sprint** | "sprint", "plan sprint", "capacity", "backlog sizing", "P0 vs stretch", "carryover" | [skills/sprint-planning/SKILL.md](../skills/sprint-planning/SKILL.md) |
| **Cập nhật cho stakeholder** | "status update", "update cho sếp", "công bố ra mắt", "escalate rủi ro" | [skills/stakeholder-update/SKILL.md](../skills/stakeholder-update/SKILL.md) |
| **Tổng hợp nghiên cứu người dùng** | "tổng hợp feedback", "interview notes", "khảo sát", "support ticket", "insight", "theme" | [skills/synthesize-research/SKILL.md](../skills/synthesize-research/SKILL.md) |
| **Rà số liệu sản phẩm** | "metrics review", "số liệu tuần/tháng", "tăng vọt", "tụt", "KPI", "scorecard", "so với target" | [skills/metrics-review/SKILL.md](../skills/metrics-review/SKILL.md) |
| **Phân tích đối thủ** | "đối thủ", "competitor", "battle card", "so sánh tính năng", "positioning", "nhóm Facebook expat" | [skills/competitive-brief/SKILL.md](../skills/competitive-brief/SKILL.md) — nối tiếp vào [feature-discovery](../skills/feature-discovery/SKILL.md) |
| **Brainstorm sản phẩm / thử thách ý tưởng** | "brainstorm", "nghĩ ý tưởng", "explore problem", "stress-test", "sparring" | [skills/product-brainstorming/SKILL.md](../skills/product-brainstorming/SKILL.md) |
| **Go-to-market tại Đà Nẵng** | "kênh tiếp cận expat", "launch", "seeding sự kiện", "cộng đồng", "growth" | [07-go-to-market-da-nang.md](../../docs/analysis/07-go-to-market-da-nang.md) |

---

## Auto-trigger (không cần từ khoá)

| Tín hiệu | Hành động |
|---|---|
| **Sửa hoặc mở rộng code sẵn có / dùng chung (mọi tính năng mới chạm code đang chạy)** | Áp [no-regression.md](no-regression.md): lập bản đồ nơi gọi, giữ hợp đồng, ưu tiên bổ sung, chứng minh đường cũ vẫn chạy. Bật tự động — không cần từ khoá. |
| **Mọi task tính năng / bug / refactor / config / setup** | Áp vòng lặp lõi L1 và vòng lặp memory L5 trong [planning-and-agent-mode.md](planning-and-agent-mode.md). Bật vòng L2 spec cho việc medium/large/breaking. Agent tự quyết định bật luồng multi-agent BA-first L8 cho việc mới mơ hồ, lớn, xuyên ranh giới, rủi ro, hoặc đổi hợp đồng web+API; đừng bắt người dùng chọn giúp. **Thứ tự cho tính năng mơ hồ/hoàn toàn mới**: chạy [feature-discovery](../skills/feature-discovery/SKILL.md) TRƯỚC → người dùng duyệt Discovery Brief → RỒI BA agent mới viết acceptance criteria nếu L8 đang bật. |
| Sửa **component dùng chung** (3+ nơi tiêu thụ) hoặc `packages/**` | Áp [behaviors.md](behaviors.md) §B4 kiểm tra chéo bề mặt (web **và** mobile) |
| Mọi **hành động kiểm duyệt / cưỡng chế** (ẩn, gỡ, khoá, cảnh cáo) | Xác minh có ghi `moderation_audit_log` trong cùng transaction |
| Mọi **thay đổi UI** | Áp [checklists.md](checklists.md) §i18n + §Tooltip + §Timezone |
| Mọi **số liệu / biểu đồ dashboard** được thêm hoặc sửa | Áp [dashboard-metric-tooltips.md](dashboard-metric-tooltips.md): tooltip nêu tập hợp + cách tính + cạm bẫy, key có ở cả hai locale |
| Mọi **thay đổi UI / bug fix** (trước khi báo done) | Chụp screenshot thật theo [skills/screenshot-evidence/SKILL.md](../skills/screenshot-evidence/SKILL.md); bug fix cần cả trước và sau |
| **Đã commit / push** (người dùng xác nhận) | Xoá screenshot trong `_evidence/` và file tạm theo [skills/screenshot-evidence/SKILL.md](../skills/screenshot-evidence/SKILL.md) §5 |
| **wc -l > 500** | Áp [behaviors.md](behaviors.md) §B4 tách file |
| Mọi **truy vấn theo vị trí / bán kính** mới | Áp [checklists.md](checklists.md) §PostGIS: `ST_DWithin`, index GIST, `EXPLAIN ANALYZE` |
| **Task large** là luồng xuyên app hoặc chạm native mobile (realtime mobile+web/API, push, deep link, native module, `app.config.ts` / `eas.json`) | Áp [three-phase-verification.md](three-phase-verification.md): E2E → build thật đa nền tảng → đối chiếu nhiều bề mặt cùng lúc. KHÔNG bật với task small/medium trừ khi người dùng yêu cầu rõ. |
