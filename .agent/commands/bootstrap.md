---
description: Lệnh khởi động thủ công cho AI assistant chưa tự nạp được hướng dẫn của dự án.
---

# /bootstrap

Nạp bối cảnh tối thiểu của Da Nang Connect — nền tảng kết nối cộng đồng người nước
ngoài tại Đà Nẵng (Giai đoạn 1: sự kiện, RSVP, tìm kiếm theo khu vực, hồ sơ có độ
tin cậy, kiểm duyệt nội dung người dùng tạo).

Đọc theo thứ tự:

1. `.agent/rules/behaviors.md` — hợp đồng thực thi luôn bật.
2. `.agent/rules/planning-and-agent-mode.md` — cổng lập kế hoạch và chọn chế độ agent.
3. `.agent/rules/skill-triggers.md` — router quyết định nạp thêm tài liệu/skill nào.
4. `.agent/rules/ownership.md` — quyền sở hữu file và quy tắc bàn giao.
5. `.agent/skills/project-architecture/SKILL.md` — kiến trúc, tech stack, quy ước code.
6. `.agent/agents/README.md` — chỉ khi cần chế độ phòng ban dev L8 (multi-agent).

Tài liệu nghiệp vụ gốc (đọc theo nhu cầu, không nạp hết):

- `docs/analysis/01-tac-nhan-va-phan-quyen.md` — vai trò và phân quyền.
- `docs/analysis/03-domain-va-du-lieu.md` — mô hình dữ liệu.
- `docs/analysis/04-tech-stack-va-kien-truc.md` — tech stack và kiến trúc monorepo.
- `docs/analysis/05-trust-safety-va-kiem-duyet.md` — trust score và kiểm duyệt.
- `docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md` — roadmap ba giai đoạn.

Sau khi nạp, báo lại đã đọc những file nào và chế độ phòng ban dev L8 có sẵn sàng
cho task hiện tại hay không.
