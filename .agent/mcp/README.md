# MCP Server Của Repo

**Trạng thái: chưa dựng.** Thư mục này là chỗ dành sẵn cho một MCP server nội bộ
chạy qua stdio tại `.agent/mcp/server.mjs`, nếu dự án cần tới.

## Khi nào nên dựng

Chỉ dựng khi có việc lặp lại mà agent phải làm qua nhiều bước thủ công, ví dụ:

- Tra cứu nhanh lược đồ dữ liệu và quan hệ giữa các bảng mà không phải đọc hết
  `docs/analysis/03-domain-va-du-lieu.md`.
- Truy vấn danh sách khu vực Đà Nẵng và toạ độ trung tâm để sinh dữ liệu mẫu.
- Gọi API nội bộ ở môi trường local để kiểm chứng hành vi RSVP mà không cần mở
  Postman.

Chưa có việc nào trong số đó lặp đủ nhiều để bù chi phí bảo trì. Đừng dựng server
chỉ vì thư mục này tồn tại.

## Nếu dựng

Làm theo [`../skills/mcp-builder/SKILL.md`](../skills/mcp-builder/SKILL.md). Server
phải là Node.js, chạy qua stdio, và khai báo trong `.mcp.json` ở gốc repo. Cập nhật
lại file này khi server đã chạy được.
