---
name: mcp-builder
description: Hướng dẫn dựng và mở rộng MCP server (Model Context Protocol) chất lượng cao để agent tương tác với dịch vụ bên ngoài qua các tool được thiết kế tốt. Dùng khi cần thêm tool MCP mới cho Da Nang Connect (thống kê sự kiện/RSVP, hàng đợi kiểm duyệt, tra cứu khu vực bằng PostGIS, trạng thái Expo Push) hoặc khi nối một API/dịch vụ bên ngoài, bằng TypeScript (MCP SDK) hoặc Python (FastMCP).
license: Toàn văn điều khoản nằm trong LICENSE.txt
allowed-tools: Read, Write, Edit, Bash, WebFetch
---

# Hướng dẫn phát triển MCP Server

> **Nguồn / xuất xứ:**
> - Anthropic `skills/mcp-builder` → https://github.com/anthropics/skills/tree/main/skills/mcp-builder
> - Đặc tả MCP → https://modelcontextprotocol.io
> - Danh mục MCP server tham chiếu → https://github.com/modelcontextprotocol/servers
> - MCP server của repo (nếu đã dựng) → `.agent/mcp/server.mjs`
>
> Skill này đã **gộp skill `mcp-server-builder` cũ**: quy trình chuẩn của Anthropic và
> phần khuôn mẫu riêng của Da Nang Connect nay nằm chung một chỗ, không còn hai skill
> tranh nhau cùng một trigger.

## Tổng quan

Dựng MCP server để LLM tương tác với dịch vụ bên ngoài thông qua các tool được thiết kế tốt.
Chất lượng của một MCP server được đo bằng mức độ nó giúp LLM hoàn thành công việc thực tế,
chứ không phải bằng số lượng tool đã viết.

## Khi nào chạy skill này

- Thêm một "tool" mới cho agent: thống kê sự kiện/RSVP, độ sâu hàng đợi kiểm duyệt,
  tra cứu khu vực bằng PostGIS, trạng thái gửi push notification qua Expo.
- Nối một dịch vụ bên ngoài mới (nhà cung cấp bản đồ/geocoding, storage S3-compatible,
  Expo Push API, Sentry, dịch vụ email/SMS).
- Agent cần *làm* một việc ngoài đời thực, không chỉ đọc file.
- Trước khi dựng: **chạy skill `resource-discovery` trước** để kiểm tra xem đã có sẵn
  MCP server cho dịch vụ đích hay chưa.

> Chỉ cần thêm một tool vào server sẵn có của repo? Nhảy thẳng xuống mục
> [Áp dụng vào repo Da Nang Connect](#áp-dụng-vào-repo-da-nang-connect).

---

# Quy trình

## 🚀 Luồng công việc tổng thể

Dựng một MCP server chất lượng cao gồm bốn giai đoạn chính:

### Giai đoạn 1: Nghiên cứu sâu và lập kế hoạch

#### 1.1 Hiểu tư duy thiết kế MCP hiện đại

**Phủ hết API so với tool theo workflow:**
Cân bằng giữa việc phủ toàn bộ endpoint của API và việc tạo tool chuyên biệt theo workflow.
Tool theo workflow tiện hơn cho một số tác vụ cụ thể, còn phủ toàn diện thì cho agent
sự linh hoạt để tự ghép các thao tác lại. Hiệu quả thay đổi tùy client — một số client
hưởng lợi từ việc chạy code để kết hợp các tool cơ bản, số khác hợp với workflow ở mức
trừu tượng cao hơn. Khi chưa chắc chắn, ưu tiên phủ toàn diện API.

**Đặt tên tool và khả năng được tìm thấy:**
Tên tool rõ ràng, mô tả đúng chức năng giúp agent tìm đúng tool nhanh hơn. Dùng tiền tố
nhất quán (ví dụ `github_create_issue`, `github_list_repos`) và đặt tên theo hành động.

**Quản lý context:**
Agent hưởng lợi từ mô tả tool ngắn gọn và khả năng lọc/phân trang kết quả. Hãy thiết kế
tool trả về dữ liệu gọn và đúng trọng tâm. Một số client hỗ trợ chạy code, giúp agent lọc
và xử lý dữ liệu hiệu quả hơn.

**Thông báo lỗi có tính hành động:**
Thông báo lỗi phải dẫn agent tới cách xử lý, kèm gợi ý cụ thể và bước tiếp theo.

#### 1.2 Đọc tài liệu giao thức MCP

**Cách tra cứu đặc tả MCP:**

Bắt đầu từ sitemap để tìm trang cần đọc: `https://modelcontextprotocol.io/sitemap.xml`

Sau đó lấy từng trang cụ thể kèm hậu tố `.md` để nhận bản markdown
(ví dụ `https://modelcontextprotocol.io/specification/draft.md`).

Các trang nên đọc:
- Tổng quan đặc tả và kiến trúc
- Cơ chế transport (streamable HTTP, stdio)
- Định nghĩa tool, resource và prompt

#### 1.3 Đọc tài liệu framework

**Stack khuyến nghị:**
- **Ngôn ngữ**: TypeScript (SDK chất lượng cao, tương thích tốt với nhiều môi trường thực thi
  ví dụ MCPB. Ngoài ra mô hình AI sinh code TypeScript rất tốt nhờ ngôn ngữ này phổ biến,
  có kiểu tĩnh và bộ công cụ lint tốt) — cũng là ngôn ngữ chính của Da Nang Connect.
- **Transport**: Streamable HTTP cho server từ xa, dùng JSON không trạng thái (dễ mở rộng và
  bảo trì hơn so với session có trạng thái và response dạng streaming). Dùng stdio cho server chạy cục bộ.

**Nạp tài liệu framework:**

- **MCP Best Practices**: [📋 Xem best practices](./reference/mcp_best_practices.md) — nguyên tắc cốt lõi

**Với TypeScript (khuyến nghị):**
- **TypeScript SDK**: dùng WebFetch nạp `https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md`
- [⚡ Hướng dẫn TypeScript](./reference/node_mcp_server.md) — mẫu code và ví dụ TypeScript

**Với Python:**
- **Python SDK**: dùng WebFetch nạp `https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md`
- [🐍 Hướng dẫn Python](./reference/python_mcp_server.md) — mẫu code và ví dụ Python

#### 1.4 Lập kế hoạch triển khai

**Hiểu API cần tích hợp:**
Đọc tài liệu API của dịch vụ để xác định các endpoint chính, yêu cầu xác thực và mô hình dữ liệu.
Dùng tìm kiếm web và WebFetch khi cần.

**Chọn tool:**
Ưu tiên phủ toàn diện API. Liệt kê các endpoint sẽ triển khai, bắt đầu từ những thao tác phổ biến nhất.

---

### Giai đoạn 2: Triển khai

#### 2.1 Dựng cấu trúc dự án

Xem hướng dẫn theo từng ngôn ngữ để biết cách khởi tạo dự án:
- [⚡ Hướng dẫn TypeScript](./reference/node_mcp_server.md) — cấu trúc dự án, package.json, tsconfig.json
- [🐍 Hướng dẫn Python](./reference/python_mcp_server.md) — tổ chức module, dependency

#### 2.2 Triển khai hạ tầng lõi

Tạo các tiện ích dùng chung:
- API client kèm xác thực
- Hàm hỗ trợ xử lý lỗi
- Định dạng response (JSON/Markdown)
- Hỗ trợ phân trang

#### 2.3 Triển khai các tool

Với mỗi tool:

**Input schema:**
- Dùng Zod (TypeScript) hoặc Pydantic (Python)
- Kèm ràng buộc và mô tả rõ ràng
- Thêm ví dụ vào phần mô tả của từng field

**Output schema:**
- Định nghĩa `outputSchema` bất cứ khi nào có thể, cho dữ liệu có cấu trúc
- Dùng `structuredContent` trong response của tool (tính năng của TypeScript SDK)
- Giúp client hiểu và xử lý output của tool

**Mô tả tool:**
- Tóm tắt ngắn gọn chức năng
- Mô tả từng tham số
- Schema của giá trị trả về

**Phần cài đặt:**
- Dùng async/await cho các thao tác I/O
- Xử lý lỗi tử tế, thông báo có tính hành động
- Hỗ trợ phân trang khi phù hợp
- Trả về cả nội dung text lẫn dữ liệu có cấu trúc khi dùng SDK đời mới

**Annotation:**
- `readOnlyHint`: true/false
- `destructiveHint`: true/false
- `idempotentHint`: true/false
- `openWorldHint`: true/false

---

### Giai đoạn 3: Rà soát và kiểm thử

#### 3.1 Chất lượng code

Rà soát các điểm:
- Không lặp code (nguyên tắc DRY)
- Xử lý lỗi nhất quán
- Phủ kiểu đầy đủ
- Mô tả tool rõ ràng

#### 3.2 Build và test

**TypeScript:**
- Chạy `npm run build` để chắc chắn biên dịch được
- Test bằng MCP Inspector: `npx @modelcontextprotocol/inspector`

**Python:**
- Kiểm tra cú pháp: `python -m py_compile your_server.py`
- Test bằng MCP Inspector

Xem hướng dẫn theo ngôn ngữ để biết cách kiểm thử chi tiết và checklist chất lượng.

---

### Giai đoạn 4: Tạo bộ evaluation

Sau khi triển khai xong MCP server, hãy tạo bộ evaluation đầy đủ để đo hiệu quả thực tế.

**Nạp [✅ Hướng dẫn evaluation](./reference/evaluation.md) để xem toàn bộ quy tắc.**

#### 4.1 Hiểu mục đích của evaluation

Dùng evaluation để kiểm tra xem LLM có dùng được MCP server của bạn để trả lời những câu hỏi
thực tế, phức tạp hay không.

#### 4.2 Tạo 10 câu hỏi evaluation

Để có bộ evaluation tốt, làm theo quy trình trong hướng dẫn evaluation:

1. **Soi tool**: liệt kê các tool sẵn có và hiểu chúng làm được gì
2. **Khám phá nội dung**: dùng thao tác CHỈ ĐỌC để khảo sát dữ liệu hiện có
3. **Sinh câu hỏi**: tạo 10 câu hỏi phức tạp, sát thực tế
4. **Xác minh đáp án**: tự giải từng câu để kiểm chứng đáp án

#### 4.3 Yêu cầu với bộ evaluation

Mỗi câu hỏi phải:
- **Độc lập**: không phụ thuộc vào câu hỏi khác
- **Chỉ đọc**: chỉ cần thao tác không phá hủy dữ liệu
- **Phức tạp**: cần nhiều lượt gọi tool và khảo sát sâu
- **Thực tế**: xuất phát từ tình huống người dùng thật quan tâm
- **Kiểm chứng được**: có một đáp án duy nhất, rõ ràng, so khớp được bằng chuỗi
- **Ổn định**: đáp án không đổi theo thời gian

#### 4.4 Định dạng output

Tạo một file XML theo cấu trúc sau:

```xml
<evaluation>
  <qa_pair>
    <question>Find discussions about AI model launches with animal codenames. One model needed a specific safety designation that uses the format ASL-X. What number X was being determined for the model named after a spotted wild cat?</question>
    <answer>3</answer>
  </qa_pair>
<!-- More qa_pairs... -->
</evaluation>
```

---

# Áp dụng vào repo Da Nang Connect

## Bước 1 — Kiểm tra thứ đã có

```bash
# Project's existing MCP server
cat .agent/mcp/server.mjs | head -60

# What tools does it currently expose?
grep -n "registerTool\|server.tool\|tools.push\|name:" .agent/mcp/server.mjs | head -20

# modelcontextprotocol/servers catalog: does it cover what you need?
curl -s "https://api.github.com/repos/modelcontextprotocol/servers/contents/src" \
  | python3 -c "import json,sys; [print(d['name']) for d in json.load(sys.stdin)]"
```

## Bước 2 — Thiết kế bộ tool (quyết định quan trọng nhất)

Mỗi MCP server là một tập hợp **tool**. Trước khi viết code:

1. **Đặt tên tool theo dạng động từ + đối tượng** → `get_event_stats`, `list_events_by_area`, `search_events`.
2. **Một tool = một hành động rõ ràng** — không có tool kiểu "làm mọi thứ".
3. **Trả dữ liệu đúng trọng tâm** — chỉ những gì agent cần; lọc/phân trang ngay tại server.
4. **Viết thông báo lỗi trước** — "Unknown area 'Da Nang Bay'. Valid areas:
   my-khe, an-thuong, my-an, hai-chau, son-tra, ngu-hanh-son." Lỗi tốt = agent phục hồi nhanh.
5. **Tuyệt đối không lộ dữ liệu cá nhân qua tool.** Chỉ trả số liệu tổng hợp và các trường công khai
   của sự kiện — không địa chỉ email, không số điện thoại, không vị trí chính xác của người dùng
   (Nghị định 13/2023/ND-CP).

```typescript
// Tool schema pattern (MCP TypeScript SDK, modern registerTool API)
server.registerTool(
  "get_event_stats",
  {
    title: "Event Stats by Area",
    description:
      "Return event counts, RSVP rate and no-show rate for a date range, optionally scoped to one Da Nang area.",
    inputSchema: {
      from: z.string().describe("ISO date YYYY-MM-DD, start of the range (inclusive)"),
      to: z.string().describe("ISO date YYYY-MM-DD, end of the range (inclusive)"),
      area: z
        .enum(["my-khe", "an-thuong", "my-an", "hai-chau", "son-tra", "ngu-hanh-son"])
        .optional()
        .describe("Da Nang area slug; omit for the whole city"),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ from, to, area }) => {
    // Call apps/api (read-only endpoint) or query PostgreSQL directly.
    // Dates are stored in UTC — convert the range using Asia/Ho_Chi_Minh first.
    return {
      content: [{ type: "text", text: JSON.stringify(stats) }],
      structuredContent: stats,
    };
  }
);
```

## Bước 3 — Khuôn mẫu MCP của repo (mở rộng `server.mjs`)

Chuẩn của repo là một MCP server Node.js chạy qua stdio tại `.agent/mcp/server.mjs`.
Repo đang greenfield nên file này có thể **chưa tồn tại** — nếu vậy, dựng nó theo
Bước 4 rồi mới thêm tool. Nếu đã có, bám theo khuôn mẫu sẵn có:

```bash
# Understand current structure
cat .agent/mcp/server.mjs

# Check Claude Code settings — is it registered?
cat .claude/settings.json | python3 -m json.tool | grep -A5 "mcpServers"
```

Để **thêm tool mới** vào server sẵn có (ưu tiên hơn là tạo server mới):
1. Thêm định nghĩa tool bằng `server.registerTool(name, config, handler)`.
2. Giữ handler mỏng — gọi một service hoặc một API; không nhét business logic vào đây.
3. Thêm xử lý lỗi trả về thông báo hữu ích (không trả nguyên stack trace).
4. Cập nhật `.agent/mcp/README.md` với tên tool mới và mục đích của nó.

## Bước 4 — Dựng server mới (khi cần)

```bash
mkdir -p .agent/mcp/servers/<server-name>
cd .agent/mcp/servers/<server-name>

# Minimal TypeScript MCP server scaffold
cat > server.ts << 'EOF'
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "<server-name>", version: "1.0.0" });

server.registerTool(
  "example_tool",
  {
    title: "Example Tool",
    description: "Describe what this tool does for the agent.",
    inputSchema: { input: z.string().describe("Free-text input") },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  async ({ input }) => ({
    content: [{ type: "text", text: `Result: ${input}` }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
EOF

npm init -y
npm install @modelcontextprotocol/sdk zod
```

Đăng ký trong Claude Code settings (`.claude/settings.json`):
```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "node",
      "args": [".agent/mcp/servers/<server-name>/server.js"]
    }
  }
}
```

## Bước 5 — Ngưỡng chất lượng cho tool MCP

- [ ] Tên tool dạng `snake_case`, động từ + đối tượng, tự giải thích.
- [ ] Schema có `z.describe()` trên mọi tham số.
- [ ] Trả JSON có cấu trúc, không trả HTML thô.
- [ ] Response lỗi kèm gợi ý khắc phục, không chỉ có mã lỗi.
- [ ] Không hardcode secret — đọc từ `process.env`.
- [ ] Không để dữ liệu cá nhân (email, số điện thoại, tọa độ chính xác của người dùng) rời khỏi tool.
- [ ] Mốc thời gian trả về theo UTC ISO-8601; bên tiêu thụ tự hiển thị theo `Asia/Ho_Chi_Minh`.
- [ ] Test bằng một lượt gọi thật từ Claude Code: yêu cầu Claude dùng tool và xác nhận dữ liệu trả về đúng.
- [ ] README đã cập nhật tên tool, mục đích và một ví dụ gọi.

## Kết quả bàn giao

Một tool MCP chạy được, đã đăng ký trong dự án, đã test bằng một lượt gọi thật từ Claude,
và đã ghi tài liệu trong `.agent/mcp/README.md`.

---

# Tài liệu tham khảo

## 📚 Thư viện tài liệu

Nạp các tài nguyên sau khi cần trong lúc phát triển:

### Tài liệu MCP cốt lõi (nạp trước tiên)
- **Giao thức MCP**: bắt đầu từ sitemap `https://modelcontextprotocol.io/sitemap.xml`, sau đó lấy từng trang kèm hậu tố `.md`
- [📋 MCP Best Practices](./reference/mcp_best_practices.md) — nguyên tắc chung cho mọi MCP server:
  - Quy ước đặt tên server và tool
  - Hướng dẫn định dạng response (JSON hay Markdown)
  - Best practice về phân trang
  - Chọn transport (streamable HTTP hay stdio)
  - Chuẩn về bảo mật và xử lý lỗi

### Tài liệu SDK (nạp ở giai đoạn 1/2)
- **Python SDK**: lấy từ `https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md`
- **TypeScript SDK**: lấy từ `https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md`

### Hướng dẫn triển khai theo ngôn ngữ (nạp ở giai đoạn 2)
- [🐍 Hướng dẫn triển khai Python](./reference/python_mcp_server.md) — hướng dẫn Python/FastMCP đầy đủ:
  - Mẫu khởi tạo server
  - Ví dụ model Pydantic
  - Đăng ký tool bằng `@mcp.tool`
  - Ví dụ hoàn chỉnh chạy được
  - Checklist chất lượng

- [⚡ Hướng dẫn triển khai TypeScript](./reference/node_mcp_server.md) — hướng dẫn TypeScript đầy đủ:
  - Cấu trúc dự án
  - Mẫu schema Zod
  - Đăng ký tool bằng `server.registerTool`
  - Ví dụ hoàn chỉnh chạy được
  - Checklist chất lượng

### Hướng dẫn evaluation (nạp ở giai đoạn 4)
- [✅ Hướng dẫn evaluation](./reference/evaluation.md) — hướng dẫn tạo bộ evaluation đầy đủ:
  - Quy tắc đặt câu hỏi
  - Chiến lược xác minh đáp án
  - Đặc tả định dạng XML
  - Ví dụ câu hỏi và đáp án
  - Cách chạy evaluation bằng bộ script kèm theo
