# Hướng dẫn triển khai MCP Server bằng Python

## Tổng quan

Tài liệu này trình bày best practice và ví dụ dành riêng cho Python khi triển khai MCP server
bằng MCP Python SDK. Nội dung bao gồm khởi tạo server, các mẫu đăng ký tool, kiểm tra dữ liệu
đầu vào bằng Pydantic, xử lý lỗi và ví dụ hoàn chỉnh chạy được.

---

## Tra cứu nhanh

### Các import chính
```python
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from enum import Enum
import httpx
```

### Khởi tạo server
```python
mcp = FastMCP("service_mcp")
```

### Mẫu đăng ký tool
```python
@mcp.tool(name="tool_name", annotations={...})
async def tool_function(params: InputModel) -> str:
    # Implementation
    pass
```

---

## MCP Python SDK và FastMCP

SDK Python chính thức của MCP cung cấp FastMCP — một framework mức cao để dựng MCP server. Nó cho:
- Tự sinh description và inputSchema từ chữ ký hàm và docstring
- Tích hợp model Pydantic để kiểm tra dữ liệu đầu vào
- Đăng ký tool bằng decorator `@mcp.tool`

**Để xem tài liệu SDK đầy đủ, dùng WebFetch nạp:**
`https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md`

## Quy ước đặt tên server

MCP server viết bằng Python phải theo khuôn mẫu tên sau:
- **Định dạng**: `{service}_mcp` (chữ thường, gạch dưới)
- **Ví dụ**: `github_mcp`, `jira_mcp`, `stripe_mcp`

Tên nên:
- Tổng quát (không gắn với một tính năng cụ thể)
- Mô tả đúng dịch vụ/API được tích hợp
- Dễ suy ra từ mô tả công việc
- Không kèm số phiên bản hay ngày tháng

## Cài đặt tool

### Đặt tên tool

Dùng snake_case cho tên tool (ví dụ "search_users", "create_project", "get_channel_info"),
tên rõ ràng và hướng hành động.

**Tránh trùng tên**: thêm ngữ cảnh dịch vụ để không đụng nhau:
- Dùng "slack_send_message" thay vì chỉ "send_message"
- Dùng "github_create_issue" thay vì chỉ "create_issue"
- Dùng "asana_list_tasks" thay vì chỉ "list_tasks"

### Cấu trúc tool với FastMCP

Tool được định nghĩa bằng decorator `@mcp.tool` cùng model Pydantic để kiểm tra input:

```python
from pydantic import BaseModel, Field, ConfigDict
from mcp.server.fastmcp import FastMCP

# Initialize the MCP server
mcp = FastMCP("example_mcp")

# Define Pydantic model for input validation
class ServiceToolInput(BaseModel):
    '''Input model for service tool operation.'''
    model_config = ConfigDict(
        str_strip_whitespace=True,  # Auto-strip whitespace from strings
        validate_assignment=True,    # Validate on assignment
        extra='forbid'              # Forbid extra fields
    )

    param1: str = Field(..., description="First parameter description (e.g., 'user123', 'project-abc')", min_length=1, max_length=100)
    param2: Optional[int] = Field(default=None, description="Optional integer parameter with constraints", ge=0, le=1000)
    tags: Optional[List[str]] = Field(default_factory=list, description="List of tags to apply", max_items=10)

@mcp.tool(
    name="service_tool_name",
    annotations={
        "title": "Human-Readable Tool Title",
        "readOnlyHint": True,     # Tool does not modify environment
        "destructiveHint": False,  # Tool does not perform destructive operations
        "idempotentHint": True,    # Repeated calls have no additional effect
        "openWorldHint": False     # Tool does not interact with external entities
    }
)
async def service_tool_name(params: ServiceToolInput) -> str:
    '''Tool description automatically becomes the 'description' field.

    This tool performs a specific operation on the service. It validates all inputs
    using the ServiceToolInput Pydantic model before processing.

    Args:
        params (ServiceToolInput): Validated input parameters containing:
            - param1 (str): First parameter description
            - param2 (Optional[int]): Optional parameter with default
            - tags (Optional[List[str]]): List of tags

    Returns:
        str: JSON-formatted response containing operation results
    '''
    # Implementation here
    pass
```

## Những điểm chính của Pydantic v2

- Dùng `model_config` thay cho class `Config` lồng bên trong
- Dùng `field_validator` thay cho `validator` đã lỗi thời
- Dùng `model_dump()` thay cho `dict()` đã lỗi thời
- Validator phải có decorator `@classmethod`
- Bắt buộc khai báo type hint cho các phương thức validator

```python
from pydantic import BaseModel, Field, field_validator, ConfigDict

class CreateUserInput(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True
    )

    name: str = Field(..., description="User's full name", min_length=1, max_length=100)
    email: str = Field(..., description="User's email address", pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    age: int = Field(..., description="User's age", ge=0, le=150)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Email cannot be empty")
        return v.lower()
```

## Tùy chọn định dạng response

Hỗ trợ nhiều định dạng đầu ra để linh hoạt hơn:

```python
from enum import Enum

class ResponseFormat(str, Enum):
    '''Output format for tool responses.'''
    MARKDOWN = "markdown"
    JSON = "json"

class UserSearchInput(BaseModel):
    query: str = Field(..., description="Search query")
    response_format: ResponseFormat = Field(
        default=ResponseFormat.MARKDOWN,
        description="Output format: 'markdown' for human-readable or 'json' for machine-readable"
    )
```

**Định dạng Markdown**:
- Dùng heading, danh sách và định dạng cho dễ đọc
- Chuyển timestamp sang dạng người đọc được (ví dụ "2024-01-15 10:30:00 UTC" thay vì epoch)
- Hiển thị tên hiển thị kèm ID trong ngoặc đơn (ví dụ "@john.doe (U123456)")
- Bỏ bớt metadata rườm rà (ví dụ chỉ hiện một URL ảnh đại diện, không liệt kê mọi kích thước)
- Nhóm thông tin liên quan lại với nhau một cách hợp lý

**Định dạng JSON**:
- Trả dữ liệu đầy đủ, có cấu trúc, phù hợp để xử lý bằng chương trình
- Bao gồm mọi field và metadata sẵn có
- Dùng tên field và kiểu dữ liệu nhất quán

## Cài đặt phân trang

Với các tool liệt kê tài nguyên:

```python
class ListInput(BaseModel):
    limit: Optional[int] = Field(default=20, description="Maximum results to return", ge=1, le=100)
    offset: Optional[int] = Field(default=0, description="Number of results to skip for pagination", ge=0)

async def list_items(params: ListInput) -> str:
    # Make API request with pagination
    data = await api_request(limit=params.limit, offset=params.offset)

    # Return pagination info
    response = {
        "total": data["total"],
        "count": len(data["items"]),
        "offset": params.offset,
        "items": data["items"],
        "has_more": data["total"] > params.offset + len(data["items"]),
        "next_offset": params.offset + len(data["items"]) if data["total"] > params.offset + len(data["items"]) else None
    }
    return json.dumps(response, indent=2)
```

## Xử lý lỗi

Đưa ra thông báo lỗi rõ ràng, có tính hành động:

```python
def _handle_api_error(e: Exception) -> str:
    '''Consistent error formatting across all tools.'''
    if isinstance(e, httpx.HTTPStatusError):
        if e.response.status_code == 404:
            return "Error: Resource not found. Please check the ID is correct."
        elif e.response.status_code == 403:
            return "Error: Permission denied. You don't have access to this resource."
        elif e.response.status_code == 429:
            return "Error: Rate limit exceeded. Please wait before making more requests."
        return f"Error: API request failed with status {e.response.status_code}"
    elif isinstance(e, httpx.TimeoutException):
        return "Error: Request timed out. Please try again."
    return f"Error: Unexpected error occurred: {type(e).__name__}"
```

## Tiện ích dùng chung

Tách phần chức năng lặp lại thành hàm tái sử dụng được:

```python
# Shared API request function
async def _make_api_request(endpoint: str, method: str = "GET", **kwargs) -> dict:
    '''Reusable function for all API calls.'''
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method,
            f"{API_BASE_URL}/{endpoint}",
            timeout=30.0,
            **kwargs
        )
        response.raise_for_status()
        return response.json()
```

## Best practice về async/await

Luôn dùng async/await cho request mạng và thao tác I/O:

```python
# Good: Async network request
async def fetch_data(resource_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/resource/{resource_id}")
        response.raise_for_status()
        return response.json()

# Bad: Synchronous request
def fetch_data(resource_id: str) -> dict:
    response = requests.get(f"{API_URL}/resource/{resource_id}")  # Blocks
    return response.json()
```

## Type hint

Dùng type hint xuyên suốt:

```python
from typing import Optional, List, Dict, Any

async def get_user(user_id: str) -> Dict[str, Any]:
    data = await fetch_user(user_id)
    return {"id": data["id"], "name": data["name"]}
```

## Docstring cho tool

Mọi tool đều phải có docstring đầy đủ, nêu rõ thông tin kiểu:

```python
async def search_users(params: UserSearchInput) -> str:
    '''
    Search for users in the Example system by name, email, or team.

    This tool searches across all user profiles in the Example platform,
    supporting partial matches and various search filters. It does NOT
    create or modify users, only searches existing ones.

    Args:
        params (UserSearchInput): Validated input parameters containing:
            - query (str): Search string to match against names/emails (e.g., "john", "@example.com", "team:marketing")
            - limit (Optional[int]): Maximum results to return, between 1-100 (default: 20)
            - offset (Optional[int]): Number of results to skip for pagination (default: 0)

    Returns:
        str: JSON-formatted string containing search results with the following schema:

        Success response:
        {
            "total": int,           # Total number of matches found
            "count": int,           # Number of results in this response
            "offset": int,          # Current pagination offset
            "users": [
                {
                    "id": str,      # User ID (e.g., "U123456789")
                    "name": str,    # Full name (e.g., "John Doe")
                    "email": str,   # Email address (e.g., "john@example.com")
                    "team": str     # Team name (e.g., "Marketing") - optional
                }
            ]
        }

        Error response:
        "Error: <error message>" or "No users found matching '<query>'"

    Examples:
        - Use when: "Find all marketing team members" -> params with query="team:marketing"
        - Use when: "Search for John's account" -> params with query="john"
        - Don't use when: You need to create a user (use example_create_user instead)
        - Don't use when: You have a user ID and need full details (use example_get_user instead)

    Error Handling:
        - Input validation errors are handled by Pydantic model
        - Returns "Error: Rate limit exceeded" if too many requests (429 status)
        - Returns "Error: Invalid API authentication" if API key is invalid (401 status)
        - Returns formatted list of results or "No users found matching 'query'"
    '''
```

## Ví dụ hoàn chỉnh

Dưới đây là một MCP server Python hoàn chỉnh:

```python
#!/usr/bin/env python3
'''
MCP Server for Example Service.

This server provides tools to interact with Example API, including user search,
project management, and data export capabilities.
'''

from typing import Optional, List, Dict, Any
from enum import Enum
import httpx
from pydantic import BaseModel, Field, field_validator, ConfigDict
from mcp.server.fastmcp import FastMCP

# Initialize the MCP server
mcp = FastMCP("example_mcp")

# Constants
API_BASE_URL = "https://api.example.com/v1"

# Enums
class ResponseFormat(str, Enum):
    '''Output format for tool responses.'''
    MARKDOWN = "markdown"
    JSON = "json"

# Pydantic Models for Input Validation
class UserSearchInput(BaseModel):
    '''Input model for user search operations.'''
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True
    )

    query: str = Field(..., description="Search string to match against names/emails", min_length=2, max_length=200)
    limit: Optional[int] = Field(default=20, description="Maximum results to return", ge=1, le=100)
    offset: Optional[int] = Field(default=0, description="Number of results to skip for pagination", ge=0)
    response_format: ResponseFormat = Field(default=ResponseFormat.MARKDOWN, description="Output format")

    @field_validator('query')
    @classmethod
    def validate_query(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Query cannot be empty or whitespace only")
        return v.strip()

# Shared utility functions
async def _make_api_request(endpoint: str, method: str = "GET", **kwargs) -> dict:
    '''Reusable function for all API calls.'''
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method,
            f"{API_BASE_URL}/{endpoint}",
            timeout=30.0,
            **kwargs
        )
        response.raise_for_status()
        return response.json()

def _handle_api_error(e: Exception) -> str:
    '''Consistent error formatting across all tools.'''
    if isinstance(e, httpx.HTTPStatusError):
        if e.response.status_code == 404:
            return "Error: Resource not found. Please check the ID is correct."
        elif e.response.status_code == 403:
            return "Error: Permission denied. You don't have access to this resource."
        elif e.response.status_code == 429:
            return "Error: Rate limit exceeded. Please wait before making more requests."
        return f"Error: API request failed with status {e.response.status_code}"
    elif isinstance(e, httpx.TimeoutException):
        return "Error: Request timed out. Please try again."
    return f"Error: Unexpected error occurred: {type(e).__name__}"

# Tool definitions
@mcp.tool(
    name="example_search_users",
    annotations={
        "title": "Search Example Users",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True
    }
)
async def example_search_users(params: UserSearchInput) -> str:
    '''Search for users in the Example system by name, email, or team.

    [Full docstring as shown above]
    '''
    try:
        # Make API request using validated parameters
        data = await _make_api_request(
            "users/search",
            params={
                "q": params.query,
                "limit": params.limit,
                "offset": params.offset
            }
        )

        users = data.get("users", [])
        total = data.get("total", 0)

        if not users:
            return f"No users found matching '{params.query}'"

        # Format response based on requested format
        if params.response_format == ResponseFormat.MARKDOWN:
            lines = [f"# User Search Results: '{params.query}'", ""]
            lines.append(f"Found {total} users (showing {len(users)})")
            lines.append("")

            for user in users:
                lines.append(f"## {user['name']} ({user['id']})")
                lines.append(f"- **Email**: {user['email']}")
                if user.get('team'):
                    lines.append(f"- **Team**: {user['team']}")
                lines.append("")

            return "\n".join(lines)

        else:
            # Machine-readable JSON format
            import json
            response = {
                "total": total,
                "count": len(users),
                "offset": params.offset,
                "users": users
            }
            return json.dumps(response, indent=2)

    except Exception as e:
        return _handle_api_error(e)

if __name__ == "__main__":
    mcp.run()
```

---

## Tính năng FastMCP nâng cao

### Tiêm tham số Context

FastMCP có thể tự động tiêm tham số `Context` vào tool để mở khóa các khả năng nâng cao như ghi log,
báo tiến độ, đọc resource và tương tác với người dùng:

```python
from mcp.server.fastmcp import FastMCP, Context

mcp = FastMCP("example_mcp")

@mcp.tool()
async def advanced_search(query: str, ctx: Context) -> str:
    '''Advanced tool with context access for logging and progress.'''

    # Report progress for long operations
    await ctx.report_progress(0.25, "Starting search...")

    # Log information for debugging
    await ctx.log_info("Processing query", {"query": query, "timestamp": datetime.now()})

    # Perform search
    results = await search_api(query)
    await ctx.report_progress(0.75, "Formatting results...")

    # Access server configuration
    server_name = ctx.fastmcp.name

    return format_results(results)

@mcp.tool()
async def interactive_tool(resource_id: str, ctx: Context) -> str:
    '''Tool that can request additional input from users.'''

    # Request sensitive information when needed
    api_key = await ctx.elicit(
        prompt="Please provide your API key:",
        input_type="password"
    )

    # Use the provided key
    return await api_call(resource_id, api_key)
```

**Các khả năng của Context:**
- `ctx.report_progress(progress, message)` — báo tiến độ cho thao tác chạy lâu
- `ctx.log_info(message, data)` / `ctx.log_error()` / `ctx.log_debug()` — ghi log
- `ctx.elicit(prompt, input_type)` — hỏi thêm thông tin từ người dùng
- `ctx.fastmcp.name` — truy cập cấu hình server
- `ctx.read_resource(uri)` — đọc resource MCP

### Đăng ký resource

Phơi dữ liệu dưới dạng resource để truy cập hiệu quả theo khuôn mẫu URI:

```python
@mcp.resource("file://documents/{name}")
async def get_document(name: str) -> str:
    '''Expose documents as MCP resources.

    Resources are useful for static or semi-static data that doesn't
    require complex parameters. They use URI templates for flexible access.
    '''
    document_path = f"./docs/{name}"
    with open(document_path, "r") as f:
        return f.read()

@mcp.resource("config://settings/{key}")
async def get_setting(key: str, ctx: Context) -> str:
    '''Expose configuration as resources with context.'''
    settings = await load_settings()
    return json.dumps(settings.get(key, {}))
```

**Khi nào dùng resource thay vì tool:**
- **Resource**: truy cập dữ liệu với tham số đơn giản (khuôn mẫu URI)
- **Tool**: thao tác phức tạp cần kiểm tra dữ liệu và business logic

### Kiểu output có cấu trúc

FastMCP hỗ trợ nhiều kiểu trả về ngoài chuỗi:

```python
from typing import TypedDict
from dataclasses import dataclass
from pydantic import BaseModel

# TypedDict for structured returns
class UserData(TypedDict):
    id: str
    name: str
    email: str

@mcp.tool()
async def get_user_typed(user_id: str) -> UserData:
    '''Returns structured data - FastMCP handles serialization.'''
    return {"id": user_id, "name": "John Doe", "email": "john@example.com"}

# Pydantic models for complex validation
class DetailedUser(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime
    metadata: Dict[str, Any]

@mcp.tool()
async def get_user_detailed(user_id: str) -> DetailedUser:
    '''Returns Pydantic model - automatically generates schema.'''
    user = await fetch_user(user_id)
    return DetailedUser(**user)
```

### Quản lý vòng đời (lifespan)

Khởi tạo những tài nguyên tồn tại xuyên suốt nhiều request:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def app_lifespan():
    '''Manage resources that live for the server's lifetime.'''
    # Initialize connections, load config, etc.
    db = await connect_to_database()
    config = load_configuration()

    # Make available to all tools
    yield {"db": db, "config": config}

    # Cleanup on shutdown
    await db.close()

mcp = FastMCP("example_mcp", lifespan=app_lifespan)

@mcp.tool()
async def query_data(query: str, ctx: Context) -> str:
    '''Access lifespan resources through context.'''
    db = ctx.request_context.lifespan_state["db"]
    results = await db.query(query)
    return format_results(results)
```

### Các lựa chọn transport

FastMCP hỗ trợ hai cơ chế transport chính:

```python
# stdio transport (for local tools) - default
if __name__ == "__main__":
    mcp.run()

# Streamable HTTP transport (for remote servers)
if __name__ == "__main__":
    mcp.run(transport="streamable_http", port=8000)
```

**Cách chọn transport:**
- **stdio**: công cụ dòng lệnh, tích hợp cục bộ, chạy dạng tiến trình con
- **Streamable HTTP**: web service, truy cập từ xa, nhiều client

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

### Best practice riêng của Python

1. **Dùng type hint**: luôn khai báo kiểu cho tham số và giá trị trả về
2. **Model Pydantic**: định nghĩa model Pydantic rõ ràng cho mọi input cần kiểm tra
3. **Không kiểm tra thủ công**: để Pydantic lo phần kiểm tra input bằng các ràng buộc
4. **Import gọn gàng**: nhóm import theo thứ tự (thư viện chuẩn, bên thứ ba, nội bộ)
5. **Xử lý lỗi**: dùng kiểu exception cụ thể (httpx.HTTPStatusError, không dùng Exception chung chung)
6. **Async context manager**: dùng `async with` cho tài nguyên cần dọn dẹp
7. **Hằng số**: khai báo hằng ở mức module, viết UPPER_CASE

## Checklist chất lượng

Trước khi chốt phần cài đặt MCP server Python, hãy kiểm tra:

### Thiết kế tổng thể
- [ ] Tool hỗ trợ trọn vẹn một workflow, không chỉ là lớp bọc mỏng quanh endpoint
- [ ] Tên tool phản ánh cách chia việc tự nhiên
- [ ] Định dạng response tối ưu cho context của agent
- [ ] Dùng định danh người đọc được ở những chỗ phù hợp
- [ ] Thông báo lỗi hướng agent tới cách dùng đúng

### Chất lượng cài đặt
- [ ] CÀI ĐẶT CÓ TRỌNG TÂM: đã làm những tool quan trọng và giá trị nhất
- [ ] Mọi tool có tên và tài liệu mô tả rõ ràng
- [ ] Kiểu trả về nhất quán giữa các thao tác cùng loại
- [ ] Đã xử lý lỗi cho mọi lời gọi ra bên ngoài
- [ ] Tên server theo định dạng `{service}_mcp`
- [ ] Mọi thao tác mạng dùng async/await
- [ ] Phần chức năng dùng chung đã được tách thành hàm tái sử dụng
- [ ] Thông báo lỗi rõ ràng, có tính hành động và mang tính hướng dẫn
- [ ] Output được kiểm tra và định dạng đúng cách

### Cấu hình tool
- [ ] Mọi tool khai báo 'name' và 'annotations' trong decorator
- [ ] Annotation đặt đúng (readOnlyHint, destructiveHint, idempotentHint, openWorldHint)
- [ ] Mọi tool dùng Pydantic BaseModel để kiểm tra input, có khai báo Field()
- [ ] Mọi Field của Pydantic có kiểu tường minh, mô tả và ràng buộc
- [ ] Mọi tool có docstring đầy đủ, nêu rõ kiểu input/output
- [ ] Docstring mô tả đầy đủ cấu trúc schema cho các giá trị trả về dạng dict/JSON
- [ ] Model Pydantic đảm nhiệm việc kiểm tra input (không cần kiểm tra thủ công)

### Tính năng nâng cao (nếu áp dụng)
- [ ] Dùng Context injection cho ghi log, báo tiến độ hoặc hỏi thêm thông tin
- [ ] Đã đăng ký resource cho những nguồn dữ liệu phù hợp
- [ ] Đã quản lý lifespan cho các kết nối tồn tại lâu dài
- [ ] Dùng kiểu output có cấu trúc (TypedDict, model Pydantic)
- [ ] Đã cấu hình transport phù hợp (stdio hoặc streamable HTTP)

### Chất lượng code
- [ ] File có đủ import, kể cả import từ Pydantic
- [ ] Đã cài phân trang ở những chỗ cần thiết
- [ ] Có tùy chọn lọc cho những tập kết quả có thể rất lớn
- [ ] Mọi hàm async được khai báo đúng bằng `async def`
- [ ] HTTP client dùng theo mẫu async với context manager đúng cách
- [ ] Type hint được dùng xuyên suốt
- [ ] Hằng số khai báo ở mức module, viết UPPER_CASE

### Kiểm thử
- [ ] Server chạy được: `python your_server.py --help`
- [ ] Mọi import phân giải đúng
- [ ] Các lượt gọi tool mẫu chạy đúng như kỳ vọng
- [ ] Các tình huống lỗi được xử lý tử tế
