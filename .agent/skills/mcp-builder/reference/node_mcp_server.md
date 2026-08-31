# Hướng dẫn triển khai MCP Server bằng Node/TypeScript

## Tổng quan

Tài liệu này trình bày best practice và ví dụ dành riêng cho Node/TypeScript khi triển khai
MCP server bằng MCP TypeScript SDK. Nội dung bao gồm cấu trúc dự án, khởi tạo server, các mẫu
đăng ký tool, kiểm tra dữ liệu đầu vào bằng Zod, xử lý lỗi và ví dụ hoàn chỉnh chạy được.

---

## Tra cứu nhanh

### Các import chính
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import { z } from "zod";
```

### Khởi tạo server
```typescript
const server = new McpServer({
  name: "service-mcp-server",
  version: "1.0.0"
});
```

### Mẫu đăng ký tool
```typescript
server.registerTool(
  "tool_name",
  {
    title: "Tool Display Name",
    description: "What the tool does",
    inputSchema: { param: z.string() },
    outputSchema: { result: z.string() }
  },
  async ({ param }) => {
    const output = { result: `Processed: ${param}` };
    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
      structuredContent: output // Modern pattern for structured data
    };
  }
);
```

---

## MCP TypeScript SDK

SDK TypeScript chính thức của MCP cung cấp:
- Class `McpServer` để khởi tạo server
- Phương thức `registerTool` để đăng ký tool
- Tích hợp schema Zod để kiểm tra input lúc chạy
- Cài đặt handler cho tool an toàn về kiểu

**QUAN TRỌNG — chỉ dùng API đời mới:**
- **NÊN dùng**: `server.registerTool()`, `server.registerResource()`, `server.registerPrompt()`
- **KHÔNG dùng**: các API cũ đã lỗi thời như `server.tool()`, `server.setRequestHandler(ListToolsRequestSchema, ...)`, hay việc tự đăng ký handler thủ công
- Nhóm phương thức `register*` cho kiểu an toàn hơn, tự xử lý schema, và là cách tiếp cận được khuyến nghị

Xem tài liệu MCP SDK trong phần tham khảo để biết chi tiết đầy đủ.

## Quy ước đặt tên server

MCP server viết bằng Node/TypeScript phải theo khuôn mẫu tên sau:
- **Định dạng**: `{service}-mcp-server` (chữ thường, gạch nối)
- **Ví dụ**: `github-mcp-server`, `jira-mcp-server`, `stripe-mcp-server`

Tên nên:
- Tổng quát (không gắn với một tính năng cụ thể)
- Mô tả đúng dịch vụ/API được tích hợp
- Dễ suy ra từ mô tả công việc
- Không kèm số phiên bản hay ngày tháng

## Cấu trúc dự án

Tạo cấu trúc sau cho MCP server Node/TypeScript:

```
{service}-mcp-server/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts          # Main entry point with McpServer initialization
│   ├── types.ts          # TypeScript type definitions and interfaces
│   ├── tools/            # Tool implementations (one file per domain)
│   ├── services/         # API clients and shared utilities
│   ├── schemas/          # Zod validation schemas
│   └── constants.ts      # Shared constants (API_URL, CHARACTER_LIMIT, etc.)
└── dist/                 # Built JavaScript files (entry point: dist/index.js)
```

## Cài đặt tool

### Đặt tên tool

Dùng snake_case cho tên tool (ví dụ "search_users", "create_project", "get_channel_info"),
tên rõ ràng và hướng hành động.

**Tránh trùng tên**: thêm ngữ cảnh dịch vụ để không đụng nhau:
- Dùng "slack_send_message" thay vì chỉ "send_message"
- Dùng "github_create_issue" thay vì chỉ "create_issue"
- Dùng "asana_list_tasks" thay vì chỉ "list_tasks"

### Cấu trúc một tool

Tool được đăng ký bằng phương thức `registerTool` với các yêu cầu sau:
- Dùng schema Zod để kiểm tra input lúc chạy và bảo đảm an toàn kiểu
- Trường `description` phải được khai báo tường minh — comment JSDoc KHÔNG được tự động lấy ra
- Khai báo tường minh `title`, `description`, `inputSchema` và `annotations`
- `inputSchema` phải là một object schema Zod (không phải JSON schema)
- Khai báo kiểu tường minh cho mọi tham số và giá trị trả về

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({
  name: "example-mcp",
  version: "1.0.0"
});

// Zod schema for input validation
const UserSearchInputSchema = z.object({
  query: z.string()
    .min(2, "Query must be at least 2 characters")
    .max(200, "Query must not exceed 200 characters")
    .describe("Search string to match against names/emails"),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum results to return"),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip for pagination"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

// Type definition from Zod schema
type UserSearchInput = z.infer<typeof UserSearchInputSchema>;

server.registerTool(
  "example_search_users",
  {
    title: "Search Example Users",
    description: `Search for users in the Example system by name, email, or team.

This tool searches across all user profiles in the Example platform, supporting partial matches and various search filters. It does NOT create or modify users, only searches existing ones.

Args:
  - query (string): Search string to match against names/emails
  - limit (number): Maximum results to return, between 1-100 (default: 20)
  - offset (number): Number of results to skip for pagination (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format: Structured data with schema:
  {
    "total": number,           // Total number of matches found
    "count": number,           // Number of results in this response
    "offset": number,          // Current pagination offset
    "users": [
      {
        "id": string,          // User ID (e.g., "U123456789")
        "name": string,        // Full name (e.g., "John Doe")
        "email": string,       // Email address
        "team": string,        // Team name (optional)
        "active": boolean      // Whether user is active
      }
    ],
    "has_more": boolean,       // Whether more results are available
    "next_offset": number      // Offset for next page (if has_more is true)
  }

Examples:
  - Use when: "Find all marketing team members" -> params with query="team:marketing"
  - Use when: "Search for John's account" -> params with query="john"
  - Don't use when: You need to create a user (use example_create_user instead)

Error Handling:
  - Returns "Error: Rate limit exceeded" if too many requests (429 status)
  - Returns "No users found matching '<query>'" if search returns empty`,
    inputSchema: UserSearchInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: UserSearchInput) => {
    try {
      // Input validation is handled by Zod schema
      // Make API request using validated parameters
      const data = await makeApiRequest<any>(
        "users/search",
        "GET",
        undefined,
        {
          q: params.query,
          limit: params.limit,
          offset: params.offset
        }
      );

      const users = data.users || [];
      const total = data.total || 0;

      if (!users.length) {
        return {
          content: [{
            type: "text",
            text: `No users found matching '${params.query}'`
          }]
        };
      }

      // Prepare structured output
      const output = {
        total,
        count: users.length,
        offset: params.offset,
        users: users.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          ...(user.team ? { team: user.team } : {}),
          active: user.active ?? true
        })),
        has_more: total > params.offset + users.length,
        ...(total > params.offset + users.length ? {
          next_offset: params.offset + users.length
        } : {})
      };

      // Format text representation based on requested format
      let textContent: string;
      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines = [`# User Search Results: '${params.query}'`, "",
          `Found ${total} users (showing ${users.length})`, ""];
        for (const user of users) {
          lines.push(`## ${user.name} (${user.id})`);
          lines.push(`- **Email**: ${user.email}`);
          if (user.team) lines.push(`- **Team**: ${user.team}`);
          lines.push("");
        }
        textContent = lines.join("\n");
      } else {
        textContent = JSON.stringify(output, null, 2);
      }

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: output // Modern pattern for structured data
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: handleApiError(error)
        }]
      };
    }
  }
);
```

## Dùng schema Zod để kiểm tra input

Zod cung cấp cơ chế kiểm tra kiểu lúc chạy:

```typescript
import { z } from "zod";

// Basic schema with validation
const CreateUserSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must not exceed 100 characters"),
  email: z.string()
    .email("Invalid email format"),
  age: z.number()
    .int("Age must be a whole number")
    .min(0, "Age cannot be negative")
    .max(150, "Age cannot be greater than 150")
}).strict();  // Use .strict() to forbid extra fields

// Enums
enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

const SearchSchema = z.object({
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format")
});

// Optional fields with defaults
const PaginationSchema = z.object({
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum results to return"),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip")
});
```

## Tùy chọn định dạng response

Hỗ trợ nhiều định dạng đầu ra để linh hoạt hơn:

```typescript
enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

const inputSchema = z.object({
  query: z.string(),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
});
```

**Định dạng Markdown**:
- Dùng heading, danh sách và định dạng cho dễ đọc
- Chuyển timestamp sang dạng người đọc được
- Hiển thị tên hiển thị kèm ID trong ngoặc đơn
- Bỏ bớt metadata rườm rà
- Nhóm thông tin liên quan lại với nhau một cách hợp lý

**Định dạng JSON**:
- Trả dữ liệu đầy đủ, có cấu trúc, phù hợp để xử lý bằng chương trình
- Bao gồm mọi field và metadata sẵn có
- Dùng tên field và kiểu dữ liệu nhất quán

## Cài đặt phân trang

Với các tool liệt kê tài nguyên:

```typescript
const ListSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

async function listItems(params: z.infer<typeof ListSchema>) {
  const data = await apiRequest(params.limit, params.offset);

  const response = {
    total: data.total,
    count: data.items.length,
    offset: params.offset,
    items: data.items,
    has_more: data.total > params.offset + data.items.length,
    next_offset: data.total > params.offset + data.items.length
      ? params.offset + data.items.length
      : undefined
  };

  return JSON.stringify(response, null, 2);
}
```

## Giới hạn ký tự và cắt bớt

Thêm hằng số CHARACTER_LIMIT để tránh response quá lớn làm ngộp agent:

```typescript
// At module level in constants.ts
export const CHARACTER_LIMIT = 25000;  // Maximum response size in characters

async function searchTool(params: SearchInput) {
  let result = generateResponse(data);

  // Check character limit and truncate if needed
  if (result.length > CHARACTER_LIMIT) {
    const truncatedData = data.slice(0, Math.max(1, data.length / 2));
    response.data = truncatedData;
    response.truncated = true;
    response.truncation_message =
      `Response truncated from ${data.length} to ${truncatedData.length} items. ` +
      `Use 'offset' parameter or add filters to see more results.`;
    result = JSON.stringify(response, null, 2);
  }

  return result;
}
```

## Xử lý lỗi

Đưa ra thông báo lỗi rõ ràng, có tính hành động:

```typescript
import axios, { AxiosError } from "axios";

function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      switch (error.response.status) {
        case 404:
          return "Error: Resource not found. Please check the ID is correct.";
        case 403:
          return "Error: Permission denied. You don't have access to this resource.";
        case 429:
          return "Error: Rate limit exceeded. Please wait before making more requests.";
        default:
          return `Error: API request failed with status ${error.response.status}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. Please try again.";
    }
  }
  return `Error: Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
}
```

## Tiện ích dùng chung

Tách phần chức năng lặp lại thành hàm tái sử dụng được:

```typescript
// Shared API request function
async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: any,
  params?: any
): Promise<T> {
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}/${endpoint}`,
      data,
      params,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}
```

## Best practice về async/await

Luôn dùng async/await cho request mạng và thao tác I/O:

```typescript
// Good: Async network request
async function fetchData(resourceId: string): Promise<ResourceData> {
  const response = await axios.get(`${API_URL}/resource/${resourceId}`);
  return response.data;
}

// Bad: Promise chains
function fetchData(resourceId: string): Promise<ResourceData> {
  return axios.get(`${API_URL}/resource/${resourceId}`)
    .then(response => response.data);  // Harder to read and maintain
}
```

## Best practice TypeScript

1. **Bật strict mode**: bật `strict` trong tsconfig.json
2. **Định nghĩa interface**: khai báo interface rõ ràng cho mọi cấu trúc dữ liệu
3. **Tránh `any`**: dùng kiểu cụ thể hoặc `unknown` thay cho `any`
4. **Zod để kiểm tra lúc chạy**: dùng schema Zod để kiểm tra dữ liệu từ bên ngoài
5. **Type guard**: viết hàm type guard cho các trường hợp kiểm tra kiểu phức tạp
6. **Xử lý lỗi**: luôn dùng try-catch kèm kiểm tra kiểu của lỗi
7. **An toàn null**: dùng optional chaining (`?.`) và nullish coalescing (`??`)

```typescript
// Good: Type-safe with Zod and interfaces
interface UserResponse {
  id: string;
  name: string;
  email: string;
  team?: string;
  active: boolean;
}

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  team: z.string().optional(),
  active: z.boolean()
});

type User = z.infer<typeof UserSchema>;

async function getUser(id: string): Promise<User> {
  const data = await apiCall(`/users/${id}`);
  return UserSchema.parse(data);  // Runtime validation
}

// Bad: Using any
async function getUser(id: string): Promise<any> {
  return await apiCall(`/users/${id}`);  // No type safety
}
```

## Cấu hình package

### package.json

```json
{
  "name": "{service}-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for {Service} API integration",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.6.1",
    "axios": "^1.7.9",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Ví dụ hoàn chỉnh

```typescript
#!/usr/bin/env node
/**
 * MCP Server for Example Service.
 *
 * This server provides tools to interact with Example API, including user search,
 * project management, and data export capabilities.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios, { AxiosError } from "axios";

// Constants
const API_BASE_URL = "https://api.example.com/v1";
const CHARACTER_LIMIT = 25000;

// Enums
enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

// Zod schemas
const UserSearchInputSchema = z.object({
  query: z.string()
    .min(2, "Query must be at least 2 characters")
    .max(200, "Query must not exceed 200 characters")
    .describe("Search string to match against names/emails"),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum results to return"),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip for pagination"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

type UserSearchInput = z.infer<typeof UserSearchInputSchema>;

// Shared utility functions
async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: any,
  params?: any
): Promise<T> {
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}/${endpoint}`,
      data,
      params,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      switch (error.response.status) {
        case 404:
          return "Error: Resource not found. Please check the ID is correct.";
        case 403:
          return "Error: Permission denied. You don't have access to this resource.";
        case 429:
          return "Error: Rate limit exceeded. Please wait before making more requests.";
        default:
          return `Error: API request failed with status ${error.response.status}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. Please try again.";
    }
  }
  return `Error: Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
}

// Create MCP server instance
const server = new McpServer({
  name: "example-mcp",
  version: "1.0.0"
});

// Register tools
server.registerTool(
  "example_search_users",
  {
    title: "Search Example Users",
    description: `[Full description as shown above]`,
    inputSchema: UserSearchInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: UserSearchInput) => {
    // Implementation as shown above
  }
);

// Main function
// For stdio (local):
async function runStdio() {
  if (!process.env.EXAMPLE_API_KEY) {
    console.error("ERROR: EXAMPLE_API_KEY environment variable is required");
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running via stdio");
}

// For streamable HTTP (remote):
async function runHTTP() {
  if (!process.env.EXAMPLE_API_KEY) {
    console.error("ERROR: EXAMPLE_API_KEY environment variable is required");
    process.exit(1);
  }

  const app = express();
  app.use(express.json());

  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on('close', () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || '3000');
  app.listen(port, () => {
    console.error(`MCP server running on http://localhost:${port}/mcp`);
  });
}

// Choose transport based on environment
const transport = process.env.TRANSPORT || 'stdio';
if (transport === 'http') {
  runHTTP().catch(error => {
    console.error("Server error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch(error => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
```

---

## Tính năng MCP nâng cao

### Đăng ký resource

Phơi dữ liệu dưới dạng resource để truy cập hiệu quả qua URI:

```typescript
import { ResourceTemplate } from "@modelcontextprotocol/sdk/types.js";

// Register a resource with URI template
server.registerResource(
  {
    uri: "file://documents/{name}",
    name: "Document Resource",
    description: "Access documents by name",
    mimeType: "text/plain"
  },
  async (uri: string) => {
    // Extract parameter from URI
    const match = uri.match(/^file:\/\/documents\/(.+)$/);
    if (!match) {
      throw new Error("Invalid URI format");
    }

    const documentName = match[1];
    const content = await loadDocument(documentName);

    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: content
      }]
    };
  }
);

// List available resources dynamically
server.registerResourceList(async () => {
  const documents = await getAvailableDocuments();
  return {
    resources: documents.map(doc => ({
      uri: `file://documents/${doc.name}`,
      name: doc.name,
      mimeType: "text/plain",
      description: doc.description
    }))
  };
});
```

**Khi nào dùng resource thay vì tool:**
- **Resource**: truy cập dữ liệu với tham số đơn giản theo URI
- **Tool**: thao tác phức tạp cần kiểm tra dữ liệu và business logic
- **Resource**: khi dữ liệu tương đối tĩnh hoặc theo khuôn mẫu
- **Tool**: khi thao tác có tác dụng phụ hoặc workflow phức tạp

### Các lựa chọn transport

TypeScript SDK hỗ trợ hai cơ chế transport chính:

#### Streamable HTTP (khuyến nghị cho server từ xa)

```typescript
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  // Create new transport for each request (stateless, prevents request ID collisions)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  res.on('close', () => transport.close());

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(3000);
```

#### stdio (cho tích hợp cục bộ)

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Cách chọn transport:**
- **Streamable HTTP**: web service, truy cập từ xa, nhiều client
- **stdio**: công cụ dòng lệnh, phát triển cục bộ, tích hợp dạng tiến trình con

### Hỗ trợ notification

Báo cho client biết khi trạng thái server thay đổi:

```typescript
// Notify when tools list changes
server.notification({
  method: "notifications/tools/list_changed"
});

// Notify when resources change
server.notification({
  method: "notifications/resources/list_changed"
});
```

Dùng notification tiết chế — chỉ khi năng lực của server thực sự thay đổi.

---

## Best practice về code

### Khả năng kết hợp và tái sử dụng

Phần cài đặt của bạn BẮT BUỘC phải ưu tiên khả năng kết hợp và tái sử dụng code:

1. **Tách phần dùng chung**:
   - Viết hàm hỗ trợ tái sử dụng cho các thao tác xuất hiện ở nhiều tool
   - Xây một API client dùng chung cho request HTTP thay vì lặp code
   - Gom logic xử lý lỗi vào các hàm tiện ích
   - Tách business logic thành các hàm riêng có thể ghép lại
   - Tách phần chọn field và định dạng markdown/JSON dùng chung

2. **Tránh lặp code**:
   - TUYỆT ĐỐI không copy-paste code tương tự giữa các tool
   - Nếu thấy mình viết logic gần giống nhau lần thứ hai, hãy tách thành hàm
   - Các thao tác phổ biến như phân trang, lọc, chọn field và định dạng đều nên dùng chung
   - Logic xác thực/phân quyền phải được gom về một chỗ

## Build và chạy

Luôn build code TypeScript trước khi chạy:

```bash
# Build the project
npm run build

# Run the server
npm start

# Development with auto-reload
npm run dev
```

Luôn đảm bảo `npm run build` chạy xong không lỗi trước khi coi là đã hoàn thành.

## Checklist chất lượng

Trước khi chốt phần cài đặt MCP server Node/TypeScript, hãy kiểm tra:

### Thiết kế tổng thể
- [ ] Tool hỗ trợ trọn vẹn một workflow, không chỉ là lớp bọc mỏng quanh endpoint
- [ ] Tên tool phản ánh cách chia việc tự nhiên
- [ ] Định dạng response tối ưu cho context của agent
- [ ] Dùng định danh người đọc được ở những chỗ phù hợp
- [ ] Thông báo lỗi hướng agent tới cách dùng đúng

### Chất lượng cài đặt
- [ ] CÀI ĐẶT CÓ TRỌNG TÂM: đã làm những tool quan trọng và giá trị nhất
- [ ] Mọi tool đăng ký bằng `registerTool` với cấu hình đầy đủ
- [ ] Mọi tool đều có `title`, `description`, `inputSchema` và `annotations`
- [ ] Annotation đặt đúng (readOnlyHint, destructiveHint, idempotentHint, openWorldHint)
- [ ] Mọi tool dùng schema Zod để kiểm tra input lúc chạy, có bật `.strict()`
- [ ] Mọi schema Zod có ràng buộc phù hợp và thông báo lỗi rõ nghĩa
- [ ] Mọi tool có mô tả đầy đủ, nêu rõ kiểu input/output
- [ ] Mô tả có ví dụ giá trị trả về và tài liệu schema đầy đủ
- [ ] Thông báo lỗi rõ ràng, có tính hành động và mang tính hướng dẫn

### Chất lượng TypeScript
- [ ] Đã định nghĩa interface TypeScript cho mọi cấu trúc dữ liệu
- [ ] Đã bật strict mode trong tsconfig.json
- [ ] Không dùng kiểu `any` — dùng `unknown` hoặc kiểu cụ thể
- [ ] Mọi hàm async có kiểu trả về Promise<T> tường minh
- [ ] Xử lý lỗi dùng type guard đúng cách (ví dụ `axios.isAxiosError`, `z.ZodError`)

### Tính năng nâng cao (nếu áp dụng)
- [ ] Đã đăng ký resource cho những nguồn dữ liệu phù hợp
- [ ] Đã cấu hình transport phù hợp (stdio hoặc streamable HTTP)
- [ ] Đã cài notification cho các năng lực server thay đổi động
- [ ] An toàn kiểu với các interface của SDK

### Cấu hình dự án
- [ ] package.json có đủ dependency cần thiết
- [ ] Script build sinh ra JavaScript chạy được trong thư mục dist/
- [ ] Entry point chính được cấu hình đúng là dist/index.js
- [ ] Tên server theo định dạng `{service}-mcp-server`
- [ ] tsconfig.json cấu hình đúng, có strict mode

### Chất lượng code
- [ ] Đã cài phân trang ở những chỗ cần thiết
- [ ] Response lớn có kiểm tra hằng CHARACTER_LIMIT và cắt bớt kèm thông báo rõ ràng
- [ ] Có tùy chọn lọc cho những tập kết quả có thể rất lớn
- [ ] Mọi thao tác mạng xử lý timeout và lỗi kết nối một cách tử tế
- [ ] Phần chức năng dùng chung đã được tách thành hàm tái sử dụng
- [ ] Kiểu trả về nhất quán giữa các thao tác cùng loại

### Kiểm thử và build
- [ ] `npm run build` chạy xong không lỗi
- [ ] dist/index.js đã được tạo và thực thi được
- [ ] Server chạy được: `node dist/index.js --help`
- [ ] Mọi import phân giải đúng
- [ ] Các lượt gọi tool mẫu chạy đúng như kỳ vọng
