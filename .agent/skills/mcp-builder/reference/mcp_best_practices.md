# Best Practices cho MCP Server

## Tra cứu nhanh

### Đặt tên server
- **Python**: `{service}_mcp` (ví dụ `slack_mcp`)
- **Node/TypeScript**: `{service}-mcp-server` (ví dụ `slack-mcp-server`)

### Đặt tên tool
- Dùng snake_case kèm tiền tố tên dịch vụ
- Định dạng: `{service}_{action}_{resource}`
- Ví dụ: `slack_send_message`, `github_create_issue`

### Định dạng response
- Hỗ trợ cả JSON lẫn Markdown
- JSON để xử lý bằng chương trình
- Markdown để người đọc

### Phân trang
- Luôn tôn trọng tham số `limit`
- Trả về `has_more`, `next_offset`, `total_count`
- Mặc định 20–50 phần tử

### Transport
- **Streamable HTTP**: cho server từ xa, tình huống nhiều client
- **stdio**: cho tích hợp cục bộ, công cụ dòng lệnh
- Tránh SSE (đã bị thay thế bởi streamable HTTP)

---

## Quy ước đặt tên server

Bám theo các khuôn mẫu chuẩn hóa sau:

**Python**: dùng định dạng `{service}_mcp` (chữ thường, gạch dưới)
- Ví dụ: `slack_mcp`, `github_mcp`, `jira_mcp`

**Node/TypeScript**: dùng định dạng `{service}-mcp-server` (chữ thường, gạch nối)
- Ví dụ: `slack-mcp-server`, `github-mcp-server`, `jira-mcp-server`

Tên nên mang tính tổng quát, mô tả đúng dịch vụ được tích hợp, dễ suy ra từ mô tả công việc,
và không kèm số phiên bản.

---

## Đặt tên và thiết kế tool

### Đặt tên tool

1. **Dùng snake_case**: `search_users`, `create_project`, `get_channel_info`
2. **Thêm tiền tố tên dịch vụ**: hãy lường trước rằng MCP server của bạn có thể chạy cùng lúc với các MCP server khác
   - Dùng `slack_send_message` thay vì chỉ `send_message`
   - Dùng `github_create_issue` thay vì chỉ `create_issue`
3. **Hướng hành động**: mở đầu bằng động từ (get, list, search, create, ...)
4. **Cụ thể**: tránh những cái tên chung chung dễ đụng với server khác

### Thiết kế tool

- Mô tả tool phải khoanh vùng chức năng thật hẹp và không gây nhập nhằng
- Mô tả phải khớp chính xác với chức năng thực tế
- Cung cấp annotation cho tool (readOnlyHint, destructiveHint, idempotentHint, openWorldHint)
- Giữ mỗi thao tác của tool gọn và nguyên tử

---

## Định dạng response

Mọi tool trả dữ liệu đều nên hỗ trợ nhiều định dạng:

### Định dạng JSON (`response_format="json"`)
- Dữ liệu có cấu trúc, máy đọc được
- Bao gồm mọi field và metadata sẵn có
- Tên field và kiểu dữ liệu nhất quán
- Dùng khi cần xử lý bằng chương trình

### Định dạng Markdown (`response_format="markdown"`, thường là mặc định)
- Văn bản đã định dạng, dễ đọc với người
- Dùng heading, danh sách và định dạng để rõ ràng
- Chuyển mốc thời gian sang dạng người đọc được
- Hiển thị tên hiển thị kèm ID trong ngoặc đơn
- Bỏ bớt metadata rườm rà

---

## Phân trang

Với các tool liệt kê tài nguyên:

- **Luôn tôn trọng tham số `limit`**
- **Cài đặt phân trang**: dùng `offset` hoặc phân trang theo cursor
- **Trả metadata phân trang**: gồm `has_more`, `next_offset`/`next_cursor`, `total_count`
- **Không bao giờ nạp toàn bộ kết quả vào bộ nhớ**: đặc biệt quan trọng với tập dữ liệu lớn
- **Đặt giới hạn mặc định hợp lý**: 20–50 phần tử là phổ biến

Ví dụ response có phân trang:
```json
{
  "total": 150,
  "count": 20,
  "offset": 0,
  "items": [...],
  "has_more": true,
  "next_offset": 20
}
```

---

## Các lựa chọn transport

### Streamable HTTP

**Phù hợp nhất cho**: server từ xa, web service, tình huống nhiều client

**Đặc điểm**:
- Giao tiếp hai chiều qua HTTP
- Hỗ trợ nhiều client đồng thời
- Có thể triển khai như một web service
- Cho phép server gửi thông báo tới client

**Dùng khi**:
- Phục vụ nhiều client cùng lúc
- Triển khai như một dịch vụ trên cloud
- Tích hợp với ứng dụng web

### stdio

**Phù hợp nhất cho**: tích hợp cục bộ, công cụ dòng lệnh

**Đặc điểm**:
- Giao tiếp qua luồng standard input/output
- Cài đặt đơn giản, không cần cấu hình mạng
- Chạy như một tiến trình con của client

**Dùng khi**:
- Xây công cụ cho môi trường phát triển cục bộ
- Tích hợp với ứng dụng desktop
- Tình huống một người dùng, một phiên

**Lưu ý**: server stdio KHÔNG được ghi log ra stdout (dùng stderr để ghi log)

### Cách chọn transport

| Tiêu chí | stdio | Streamable HTTP |
|-----------|-------|-----------------|
| **Triển khai** | Cục bộ | Từ xa |
| **Số client** | Một | Nhiều |
| **Độ phức tạp** | Thấp | Trung bình |
| **Thời gian thực** | Không | Có |

---

## Best practice về bảo mật

### Xác thực và phân quyền

**OAuth 2.1**:
- Dùng OAuth 2.1 an toàn với chứng chỉ từ tổ chức phát hành đáng tin cậy
- Kiểm tra access token trước khi xử lý request
- Chỉ chấp nhận token được cấp riêng cho server của bạn

**API key**:
- Lưu API key trong biến môi trường, không bao giờ để trong code
- Kiểm tra key ngay khi server khởi động
- Trả thông báo lỗi rõ ràng khi xác thực thất bại

### Kiểm tra dữ liệu đầu vào

- Làm sạch đường dẫn file để chặn directory traversal
- Kiểm tra URL và định danh từ bên ngoài
- Kiểm tra kích thước và khoảng giá trị của tham số
- Ngăn command injection khi gọi lệnh hệ thống
- Dùng schema validation (Pydantic/Zod) cho mọi input

### Xử lý lỗi

- Không phơi lỗi nội bộ ra cho client
- Ghi log các lỗi liên quan tới bảo mật ở phía server
- Thông báo lỗi hữu ích nhưng không tiết lộ chi tiết nội bộ
- Dọn dẹp tài nguyên sau khi lỗi xảy ra

### Chống DNS rebinding

Với server streamable HTTP chạy cục bộ:
- Bật cơ chế chống DNS rebinding
- Kiểm tra header `Origin` trên mọi kết nối đến
- Bind vào `127.0.0.1` thay vì `0.0.0.0`

---

## Annotation cho tool

Cung cấp annotation để client hiểu hành vi của tool:

| Annotation | Kiểu | Mặc định | Mô tả |
|-----------|------|---------|-------------|
| `readOnlyHint` | boolean | false | Tool không thay đổi môi trường |
| `destructiveHint` | boolean | true | Tool có thể thực hiện cập nhật phá hủy dữ liệu |
| `idempotentHint` | boolean | false | Gọi lặp lại với cùng tham số không gây thêm tác động |
| `openWorldHint` | boolean | true | Tool tương tác với thực thể bên ngoài |

**Quan trọng**: annotation chỉ là gợi ý, không phải bảo đảm về bảo mật. Client không nên ra
quyết định mang tính bảo mật chỉ dựa vào annotation.

---

## Xử lý lỗi

- Dùng mã lỗi JSON-RPC chuẩn
- Báo lỗi của tool bên trong object kết quả (không đẩy thành lỗi ở tầng giao thức)
- Đưa ra thông báo lỗi cụ thể, hữu ích, kèm gợi ý bước tiếp theo
- Không phơi chi tiết cài đặt bên trong
- Dọn dẹp tài nguyên đúng cách khi có lỗi

Ví dụ xử lý lỗi:
```typescript
try {
  const result = performOperation();
  return { content: [{ type: "text", text: result }] };
} catch (error) {
  return {
    isError: true,
    content: [{
      type: "text",
      text: `Error: ${error.message}. Try using filter='active_only' to reduce results.`
    }]
  };
}
```

---

## Yêu cầu kiểm thử

Bộ kiểm thử đầy đủ cần phủ:

- **Kiểm thử chức năng**: xác nhận chạy đúng với input hợp lệ và không hợp lệ
- **Kiểm thử tích hợp**: kiểm tra tương tác với hệ thống bên ngoài
- **Kiểm thử bảo mật**: xác thực, làm sạch input, giới hạn tần suất
- **Kiểm thử hiệu năng**: hành vi khi tải cao, khi timeout
- **Xử lý lỗi**: đảm bảo báo lỗi và dọn dẹp đúng cách

---

## Yêu cầu về tài liệu

- Ghi tài liệu rõ ràng cho mọi tool và năng lực của server
- Kèm ví dụ chạy được (ít nhất 3 ví dụ cho mỗi nhóm tính năng lớn)
- Ghi rõ các vấn đề bảo mật cần lưu ý
- Nêu rõ quyền và mức truy cập cần thiết
- Ghi rõ giới hạn tần suất và đặc tính hiệu năng
