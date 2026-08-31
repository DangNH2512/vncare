# Hướng dẫn tạo evaluation cho MCP Server

## Tổng quan

Tài liệu này hướng dẫn cách tạo bộ evaluation đầy đủ cho một MCP server. Evaluation dùng để
kiểm tra xem LLM có thể dùng MCP server của bạn để trả lời những câu hỏi thực tế, phức tạp
mà chỉ dựa vào các tool được cung cấp hay không.

---

## Tra cứu nhanh

### Yêu cầu của bộ evaluation
- Tạo 10 câu hỏi người đọc hiểu được
- Câu hỏi phải CHỈ ĐỌC, ĐỘC LẬP, KHÔNG PHÁ HỦY DỮ LIỆU
- Mỗi câu hỏi cần nhiều lượt gọi tool (có thể tới hàng chục lượt)
- Đáp án phải là một giá trị duy nhất, kiểm chứng được
- Đáp án phải ỔN ĐỊNH (không thay đổi theo thời gian)

### Định dạng output
```xml
<evaluation>
   <qa_pair>
      <question>Your question here</question>
      <answer>Single verifiable answer</answer>
   </qa_pair>
</evaluation>
```

---

## Mục đích của evaluation

Thước đo chất lượng của một MCP server KHÔNG phải là server đó cài đặt tool đầy đủ hay
hoành tráng đến đâu, mà là các cài đặt ấy (input/output schema, docstring/mô tả, chức năng)
giúp một LLM — không có bất kỳ context nào khác và CHỈ được truy cập MCP server — trả lời
những câu hỏi thực tế và khó đến mức nào.

## Tổng quan quy trình evaluation

Tạo 10 câu hỏi người đọc hiểu được, chỉ cần các thao tác CHỈ ĐỌC, ĐỘC LẬP, KHÔNG PHÁ HỦY
và IDEMPOTENT để trả lời. Mỗi câu hỏi cần:
- Thực tế
- Rõ ràng và súc tích
- Không nhập nhằng
- Phức tạp, có thể cần hàng chục lượt gọi tool hoặc nhiều bước
- Trả lời được bằng một giá trị duy nhất, kiểm chứng được, mà bạn đã xác định trước

## Quy tắc đặt câu hỏi

### Yêu cầu cốt lõi

1. **Câu hỏi PHẢI độc lập**
   - Mỗi câu KHÔNG được phụ thuộc vào đáp án của câu khác
   - Không được giả định là đã có thao tác ghi từ việc xử lý một câu hỏi khác

2. **Câu hỏi PHẢI chỉ cần thao tác KHÔNG PHÁ HỦY và IDEMPOTENT**
   - Không được yêu cầu thay đổi trạng thái hệ thống để tìm ra đáp án

3. **Câu hỏi phải THỰC TẾ, RÕ RÀNG, SÚC TÍCH và PHỨC TẠP**
   - Phải buộc một LLM khác dùng nhiều tool hoặc nhiều bước (có thể hàng chục) mới trả lời được

### Độ phức tạp và chiều sâu

4. **Câu hỏi phải đòi hỏi khảo sát sâu**
   - Cân nhắc câu hỏi nhiều chặng (multi-hop), phải tách thành nhiều câu hỏi con và gọi tool tuần tự
   - Mỗi bước nên tận dụng thông tin tìm được ở bước trước

5. **Câu hỏi có thể đòi hỏi phân trang nhiều**
   - Có thể phải lật qua nhiều trang kết quả
   - Có thể phải truy vấn dữ liệu cũ (1–2 năm trước) để tìm thông tin ít người biết
   - Câu hỏi phải KHÓ

6. **Câu hỏi phải đòi hỏi hiểu sâu**
   - Chứ không phải kiến thức bề mặt
   - Có thể đặt ý phức tạp dưới dạng câu hỏi Đúng/Sai và yêu cầu dẫn chứng
   - Có thể dùng dạng trắc nghiệm, buộc LLM phải tìm kiếm để kiểm chứng nhiều giả thuyết

7. **Câu hỏi không được giải xong chỉ bằng một lần tìm kiếm từ khóa**
   - Không đưa vào những từ khóa lấy nguyên từ nội dung đích
   - Dùng từ đồng nghĩa, khái niệm liên quan hoặc diễn giải lại
   - Buộc phải tìm nhiều lần, phân tích nhiều mục liên quan, rút bối cảnh rồi mới suy ra đáp án

### Kiểm thử tool

8. **Câu hỏi nên thử sức chịu tải của giá trị tool trả về**
   - Có thể khiến tool trả về object hoặc danh sách JSON lớn, làm ngộp LLM
   - Nên đòi hỏi hiểu nhiều dạng dữ liệu khác nhau:
     - ID và tên
     - Timestamp và datetime (tháng, ngày, năm, giây)
     - ID file, tên file, phần mở rộng và mimetype
     - URL, GID, ...
   - Nên dò xem tool có trả về đủ các dạng dữ liệu hữu ích hay không

9. **Câu hỏi PHẦN LỚN nên phản ánh tình huống thật của người dùng**
   - Đúng kiểu nhu cầu tra cứu thông tin mà CON NGƯỜI có LLM hỗ trợ thực sự quan tâm

10. **Câu hỏi có thể cần hàng chục lượt gọi tool**
    - Điều này thử thách LLM có context hạn chế
    - Đồng thời thúc đẩy tool của MCP server giảm bớt lượng thông tin trả về

11. **Có cả câu hỏi nhập nhằng**
    - Có thể mơ hồ HOẶC buộc phải quyết định khó về việc gọi tool nào
    - Buộc LLM có khả năng mắc lỗi hoặc hiểu sai
    - Nhưng dù NHẬP NHẰNG, vẫn phải CHỈ CÓ MỘT ĐÁP ÁN KIỂM CHỨNG ĐƯỢC

### Tính ổn định

12. **Câu hỏi phải được thiết kế sao cho đáp án KHÔNG THAY ĐỔI**
    - Đừng hỏi những thứ dựa trên "trạng thái hiện tại" vốn luôn biến động
    - Ví dụ, đừng đếm:
      - Số lượt phản ứng (reaction) của một bài đăng
      - Số phản hồi trong một chủ đề
      - Số thành viên của một kênh

13. **ĐỪNG để MCP server GIỚI HẠN loại câu hỏi bạn tạo ra**
    - Cứ tạo câu hỏi khó và phức tạp
    - Một số câu có thể không giải được bằng bộ tool hiện có
    - Câu hỏi có thể yêu cầu định dạng đầu ra cụ thể (datetime hay epoch time, JSON hay MARKDOWN)
    - Câu hỏi có thể cần hàng chục lượt gọi tool mới xong

## Quy tắc về đáp án

### Kiểm chứng

1. **Đáp án phải KIỂM CHỨNG ĐƯỢC bằng so khớp chuỗi trực tiếp**
   - Nếu đáp án có thể viết theo nhiều định dạng, hãy nêu rõ định dạng đầu ra ngay TRONG CÂU HỎI
   - Ví dụ: "Use YYYY/MM/DD.", "Respond True or False.", "Answer A, B, C, or D and nothing else."
   - Đáp án nên là một giá trị KIỂM CHỨNG ĐƯỢC duy nhất, chẳng hạn:
     - ID người dùng, tên đăng nhập, tên hiển thị, tên, họ
     - ID kênh, tên kênh
     - ID tin nhắn, chuỗi ký tự
     - URL, tiêu đề
     - Một đại lượng số
     - Timestamp, datetime
     - Boolean (cho câu hỏi Đúng/Sai)
     - Địa chỉ email, số điện thoại
     - ID file, tên file, phần mở rộng file
     - Đáp án trắc nghiệm
   - Đáp án không được đòi hỏi định dạng đặc biệt hay cấu trúc phức tạp
   - Đáp án sẽ được chấm bằng SO KHỚP CHUỖI TRỰC TIẾP

### Dễ đọc

2. **Đáp án nên ưu tiên định dạng NGƯỜI ĐỌC ĐƯỢC**
   - Ví dụ: tên, tên riêng, họ, datetime, tên file, nội dung tin nhắn, URL, yes/no, true/false, a/b/c/d
   - Thay vì các ID khó hiểu (dù ID vẫn chấp nhận được)
   - ĐẠI ĐA SỐ đáp án nên ở dạng người đọc được

### Tính ổn định

3. **Đáp án phải ỔN ĐỊNH / TĨNH**
   - Hãy nhìn vào nội dung cũ (ví dụ hội thoại đã kết thúc, dự án đã ra mắt, câu hỏi đã được trả lời)
   - Tạo CÂU HỎI dựa trên các khái niệm đã "đóng", luôn cho cùng một đáp án
   - Câu hỏi có thể yêu cầu xét một khung thời gian cố định để cách ly khỏi phần dữ liệu biến động
   - Dựa vào bối cảnh KHÓ thay đổi
   - Ví dụ: nếu cần tìm tên một bài báo, hãy đủ CỤ THỂ để đáp án không lẫn với các bài công bố sau đó

4. **Đáp án phải RÕ RÀNG và KHÔNG NHẬP NHẰNG**
   - Câu hỏi phải được thiết kế sao cho chỉ có một đáp án duy nhất, rõ ràng
   - Đáp án phải suy ra được từ chính các tool của MCP server

### Tính đa dạng

5. **Đáp án phải ĐA DẠNG**
   - Đáp án là một giá trị KIỂM CHỨNG ĐƯỢC duy nhất nhưng thuộc nhiều dạng và định dạng khác nhau
   - Khái niệm người dùng: ID người dùng, tên đăng nhập, tên hiển thị, tên, họ, địa chỉ email, số điện thoại
   - Khái niệm kênh: ID kênh, tên kênh, chủ đề kênh
   - Khái niệm tin nhắn: ID tin nhắn, nội dung tin nhắn, timestamp, tháng, ngày, năm

6. **Đáp án KHÔNG được là cấu trúc phức tạp**
   - Không phải một danh sách giá trị
   - Không phải một object phức tạp
   - Không phải một danh sách ID hay chuỗi
   - Không phải văn bản tự nhiên
   - TRỪ KHI đáp án vẫn kiểm chứng được dễ dàng bằng SO KHỚP CHUỖI TRỰC TIẾP
   - Và có thể tái tạo lại một cách thực tế
   - Khả năng một LLM trả về đúng danh sách đó theo một thứ tự hay định dạng khác phải rất thấp

## Quy trình tạo evaluation

### Bước 1: Soi tài liệu

Đọc tài liệu của API đích để hiểu:
- Các endpoint và chức năng sẵn có
- Nếu còn điểm mơ hồ, tìm thêm thông tin trên web
- Song song hóa bước này TỐI ĐA
- Đảm bảo mỗi subagent CHỈ đọc tài liệu từ hệ thống file hoặc trên web

### Bước 2: Soi tool

Liệt kê các tool mà MCP server cung cấp:
- Kiểm tra trực tiếp trên MCP server
- Hiểu input/output schema, docstring và mô tả
- CHƯA gọi các tool đó ở giai đoạn này

### Bước 3: Xây dựng hiểu biết

Lặp lại bước 1 và 2 cho tới khi bạn thực sự hiểu:
- Lặp nhiều vòng
- Nghĩ về loại tác vụ bạn muốn tạo
- Tinh chỉnh dần hiểu biết của mình
- KHÔNG được ĐỌC code cài đặt của chính MCP server ở bất kỳ giai đoạn nào
- Dùng trực giác và hiểu biết của bạn để tạo ra các tác vụ hợp lý, thực tế, nhưng RẤT khó

### Bước 4: Khảo sát nội dung ở chế độ chỉ đọc

Sau khi đã hiểu API và bộ tool, hãy DÙNG các tool của MCP server:
- Chỉ khảo sát nội dung bằng thao tác CHỈ ĐỌC và KHÔNG PHÁ HỦY
- Mục tiêu: xác định nội dung cụ thể (người dùng, kênh, tin nhắn, dự án, task...) để tạo câu hỏi thực tế
- KHÔNG được gọi bất kỳ tool nào thay đổi trạng thái
- KHÔNG đọc code cài đặt của chính MCP server
- Song song hóa bước này bằng các subagent khảo sát độc lập
- Đảm bảo mỗi subagent chỉ thực hiện thao tác CHỈ ĐỌC, KHÔNG PHÁ HỦY và IDEMPOTENT
- CẨN THẬN: MỘT SỐ TOOL có thể trả về RẤT NHIỀU DỮ LIỆU khiến bạn cạn CONTEXT
- Gọi tool theo kiểu TỪNG BƯỚC NHỎ, CÓ TRỌNG TÂM để khảo sát
- Trong mọi lượt gọi tool, dùng tham số `limit` để giới hạn kết quả (<10)
- Dùng phân trang

### Bước 5: Sinh tác vụ

Sau khi khảo sát nội dung, tạo 10 câu hỏi người đọc hiểu được:
- Một LLM phải trả lời được chúng bằng MCP server
- Tuân thủ toàn bộ quy tắc về câu hỏi và đáp án ở trên

## Định dạng output

Mỗi cặp QA gồm một câu hỏi và một đáp án. Output là một file XML theo cấu trúc sau:

```xml
<evaluation>
   <qa_pair>
      <question>Find the project created in Q2 2024 with the highest number of completed tasks. What is the project name?</question>
      <answer>Website Redesign</answer>
   </qa_pair>
   <qa_pair>
      <question>Search for issues labeled as "bug" that were closed in March 2024. Which user closed the most issues? Provide their username.</question>
      <answer>sarah_dev</answer>
   </qa_pair>
   <qa_pair>
      <question>Look for pull requests that modified files in the /api directory and were merged between January 1 and January 31, 2024. How many different contributors worked on these PRs?</question>
      <answer>7</answer>
   </qa_pair>
   <qa_pair>
      <question>Find the repository with the most stars that was created before 2023. What is the repository name?</question>
      <answer>data-pipeline</answer>
   </qa_pair>
</evaluation>
```

## Ví dụ evaluation

### Câu hỏi tốt

**Ví dụ 1: câu hỏi nhiều chặng, đòi hỏi khảo sát sâu (GitHub MCP)**
```xml
<qa_pair>
   <question>Find the repository that was archived in Q3 2023 and had previously been the most forked project in the organization. What was the primary programming language used in that repository?</question>
   <answer>Python</answer>
</qa_pair>
```

Câu này tốt vì:
- Cần tìm kiếm nhiều lần mới ra danh sách repository đã archive
- Phải xác định repository nào có nhiều fork nhất trước khi bị archive
- Phải xem chi tiết repository để biết ngôn ngữ
- Đáp án là một giá trị đơn giản, kiểm chứng được
- Dựa trên dữ liệu lịch sử (đã "đóng") nên không đổi

**Ví dụ 2: đòi hỏi hiểu bối cảnh chứ không so khớp từ khóa (MCP quản lý dự án)**
```xml
<qa_pair>
   <question>Locate the initiative focused on improving customer onboarding that was completed in late 2023. The project lead created a retrospective document after completion. What was the lead's role title at that time?</question>
   <answer>Product Manager</answer>
</qa_pair>
```

Câu này tốt vì:
- Không nêu tên dự án cụ thể ("sáng kiến tập trung cải thiện onboarding khách hàng")
- Phải tìm các dự án đã hoàn thành trong một khung thời gian cụ thể
- Phải xác định người dẫn dắt dự án và vai trò của họ
- Phải hiểu bối cảnh từ tài liệu retrospective
- Đáp án dễ đọc với người và ổn định
- Dựa trên công việc đã hoàn tất (sẽ không đổi)

**Ví dụ 3: tổng hợp phức tạp qua nhiều bước (MCP theo dõi issue)**
```xml
<qa_pair>
   <question>Among all bugs reported in January 2024 that were marked as critical priority, which assignee resolved the highest percentage of their assigned bugs within 48 hours? Provide the assignee's username.</question>
   <answer>alex_eng</answer>
</qa_pair>
```

Câu này tốt vì:
- Phải lọc bug theo ngày, mức ưu tiên và trạng thái
- Phải nhóm theo người được giao và tính tỉ lệ xử lý xong
- Phải hiểu timestamp để xác định mốc 48 giờ
- Kiểm tra khả năng phân trang (có thể phải xử lý rất nhiều bug)
- Đáp án là một tên đăng nhập duy nhất
- Dựa trên dữ liệu lịch sử của một giai đoạn cụ thể

**Ví dụ 4: đòi hỏi tổng hợp nhiều loại dữ liệu (CRM MCP)**
```xml
<qa_pair>
   <question>Find the account that upgraded from the Starter to Enterprise plan in Q4 2023 and had the highest annual contract value. What industry does this account operate in?</question>
   <answer>Healthcare</answer>
</qa_pair>
```

Câu này tốt vì:
- Phải hiểu việc thay đổi gói thuê bao
- Phải xác định các sự kiện nâng cấp trong một khung thời gian
- Phải so sánh giá trị hợp đồng
- Phải truy cập thông tin ngành nghề của tài khoản
- Đáp án đơn giản và kiểm chứng được
- Dựa trên giao dịch lịch sử đã hoàn tất

### Câu hỏi kém

**Ví dụ 1: đáp án thay đổi theo thời gian**
```xml
<qa_pair>
   <question>How many open issues are currently assigned to the engineering team?</question>
   <answer>47</answer>
</qa_pair>
```

Câu này kém vì:
- Đáp án sẽ đổi khi issue được tạo, đóng hoặc giao lại
- Không dựa trên dữ liệu ổn định/tĩnh
- Phụ thuộc vào "trạng thái hiện tại" vốn biến động

**Ví dụ 2: quá dễ, chỉ cần tìm từ khóa**
```xml
<qa_pair>
   <question>Find the pull request with title "Add authentication feature" and tell me who created it.</question>
   <answer>developer123</answer>
</qa_pair>
```

Câu này kém vì:
- Giải được bằng một lần tìm kiếm từ khóa theo đúng tiêu đề
- Không đòi hỏi khảo sát sâu hay hiểu bối cảnh
- Không cần tổng hợp hay phân tích gì

**Ví dụ 3: định dạng đáp án nhập nhằng**
```xml
<qa_pair>
   <question>List all the repositories that have Python as their primary language.</question>
   <answer>repo1, repo2, repo3, data-pipeline, ml-tools</answer>
</qa_pair>
```

Câu này kém vì:
- Đáp án là một danh sách có thể trả về theo thứ tự bất kỳ
- Khó chấm bằng so khớp chuỗi trực tiếp
- LLM có thể định dạng khác đi (mảng JSON, phân tách bằng dấu phẩy, xuống dòng)
- Nên hỏi một đại lượng tổng hợp (số đếm) hoặc dạng so sánh nhất (nhiều sao nhất)

## Quy trình xác minh

Sau khi tạo xong bộ evaluation:

1. **Xem file XML** để nắm cấu trúc
2. **Nạp từng tác vụ** và song song dùng MCP server cùng các tool để TỰ giải và xác định đáp án đúng
3. **Đánh dấu mọi thao tác** cần quyền GHI hoặc mang tính PHÁ HỦY
4. **Gom toàn bộ đáp án ĐÚNG** và thay các đáp án sai trong tài liệu
5. **Xóa mọi `<qa_pair>`** đòi hỏi thao tác GHI hoặc PHÁ HỦY

Nhớ song song hóa việc giải tác vụ để khỏi cạn context, sau đó gom hết đáp án rồi mới sửa file một lần ở cuối.

## Mẹo tạo evaluation chất lượng

1. **Nghĩ kỹ và lên kế hoạch trước** khi sinh tác vụ
2. **Song song hóa khi có cơ hội** để tăng tốc và tiết kiệm context
3. **Bám vào tình huống thực tế** mà người dùng thật sự muốn làm
4. **Tạo câu hỏi thử thách** để kiểm tra giới hạn năng lực của MCP server
5. **Đảm bảo tính ổn định** bằng cách dùng dữ liệu lịch sử và khái niệm đã "đóng"
6. **Xác minh đáp án** bằng cách tự giải câu hỏi với chính các tool của MCP server
7. **Lặp và tinh chỉnh** dựa trên những gì bạn học được trong quá trình

---

# Chạy evaluation

Sau khi tạo file evaluation, bạn có thể dùng bộ chạy evaluation kèm theo để kiểm thử MCP server.

## Chuẩn bị

1. **Cài dependency**

   ```bash
   pip install -r scripts/requirements.txt
   ```

   Hoặc cài thủ công:
   ```bash
   pip install anthropic mcp
   ```

2. **Đặt API key**

   ```bash
   export ANTHROPIC_API_KEY=your_api_key_here
   ```

## Định dạng file evaluation

File evaluation dùng định dạng XML với các phần tử `<qa_pair>`:

```xml
<evaluation>
   <qa_pair>
      <question>Find the project created in Q2 2024 with the highest number of completed tasks. What is the project name?</question>
      <answer>Website Redesign</answer>
   </qa_pair>
   <qa_pair>
      <question>Search for issues labeled as "bug" that were closed in March 2024. Which user closed the most issues? Provide their username.</question>
      <answer>sarah_dev</answer>
   </qa_pair>
</evaluation>
```

## Cách chạy evaluation

Script evaluation (`scripts/evaluation.py`) hỗ trợ ba loại transport:

**Quan trọng:**
- **Transport stdio**: script tự khởi chạy và quản lý tiến trình MCP server giúp bạn. Đừng tự chạy server bằng tay.
- **Transport sse/http**: bạn phải khởi chạy MCP server riêng trước khi chạy evaluation. Script sẽ kết nối tới server đang chạy ở URL bạn cung cấp.

### 1. Server STDIO cục bộ

Cho MCP server chạy cục bộ (script tự khởi chạy server):

```bash
python scripts/evaluation.py \
  -t stdio \
  -c python \
  -a my_mcp_server.py \
  evaluation.xml
```

Kèm biến môi trường:
```bash
python scripts/evaluation.py \
  -t stdio \
  -c python \
  -a my_mcp_server.py \
  -e API_KEY=abc123 \
  -e DEBUG=true \
  evaluation.xml
```

### 2. Server-Sent Events (SSE)

Cho MCP server dùng SSE (phải khởi chạy server trước):

```bash
python scripts/evaluation.py \
  -t sse \
  -u https://example.com/mcp \
  -H "Authorization: Bearer token123" \
  -H "X-Custom-Header: value" \
  evaluation.xml
```

### 3. HTTP (Streamable HTTP)

Cho MCP server dùng HTTP (phải khởi chạy server trước):

```bash
python scripts/evaluation.py \
  -t http \
  -u https://example.com/mcp \
  -H "Authorization: Bearer token123" \
  evaluation.xml
```

## Tùy chọn dòng lệnh

```
usage: evaluation.py [-h] [-t {stdio,sse,http}] [-m MODEL] [-c COMMAND]
                     [-a ARGS [ARGS ...]] [-e ENV [ENV ...]] [-u URL]
                     [-H HEADERS [HEADERS ...]] [-o OUTPUT]
                     eval_file

positional arguments:
  eval_file             Path to evaluation XML file

optional arguments:
  -h, --help            Show help message
  -t, --transport       Transport type: stdio, sse, or http (default: stdio)
  -m, --model           Claude model to use (default: claude-sonnet-5)
  -o, --output          Output file for report (default: print to stdout)

stdio options:
  -c, --command         Command to run MCP server (e.g., python, node)
  -a, --args            Arguments for the command (e.g., server.py)
  -e, --env             Environment variables in KEY=VALUE format

sse/http options:
  -u, --url             MCP server URL
  -H, --header          HTTP headers in 'Key: Value' format
```

> **Lưu ý về model**: mặc định trong `scripts/evaluation.py` là một model đời cũ. Với repo này,
> hãy truyền model hiện hành qua cờ `-m` (ví dụ `-m claude-opus-5`) để kết quả evaluation phản ánh
> đúng năng lực agent mà Da Nang Connect thực sự dùng.

## Kết quả

Script evaluation sinh ra một báo cáo chi tiết gồm:

- **Thống kê tổng hợp**:
  - Độ chính xác (số câu đúng / tổng số câu)
  - Thời lượng trung bình mỗi tác vụ
  - Số lượt gọi tool trung bình mỗi tác vụ
  - Tổng số lượt gọi tool

- **Kết quả từng tác vụ**:
  - Prompt và đáp án kỳ vọng
  - Câu trả lời thực tế của agent
  - Đúng hay sai (✅/❌)
  - Thời lượng và chi tiết các lượt gọi tool
  - Tóm tắt cách agent tiếp cận vấn đề
  - Nhận xét của agent về bộ tool

### Ghi báo cáo ra file

```bash
python scripts/evaluation.py \
  -t stdio \
  -c python \
  -a my_server.py \
  -o evaluation_report.md \
  evaluation.xml
```

## Ví dụ quy trình đầy đủ

Dưới đây là một ví dụ đầy đủ về việc tạo và chạy evaluation:

1. **Tạo file evaluation** (`my_evaluation.xml`):

```xml
<evaluation>
   <qa_pair>
      <question>Find the user who created the most issues in January 2024. What is their username?</question>
      <answer>alice_developer</answer>
   </qa_pair>
   <qa_pair>
      <question>Among all pull requests merged in Q1 2024, which repository had the highest number? Provide the repository name.</question>
      <answer>backend-api</answer>
   </qa_pair>
   <qa_pair>
      <question>Find the project that was completed in December 2023 and had the longest duration from start to finish. How many days did it take?</question>
      <answer>127</answer>
   </qa_pair>
</evaluation>
```

2. **Cài dependency**:

```bash
pip install -r scripts/requirements.txt
export ANTHROPIC_API_KEY=your_api_key
```

3. **Chạy evaluation**:

```bash
python scripts/evaluation.py \
  -t stdio \
  -c python \
  -a github_mcp_server.py \
  -e GITHUB_TOKEN=ghp_xxx \
  -o github_eval_report.md \
  my_evaluation.xml
```

4. **Đọc báo cáo** trong `github_eval_report.md` để:
   - Xem câu nào đạt / không đạt
   - Đọc nhận xét của agent về bộ tool của bạn
   - Xác định chỗ cần cải thiện
   - Lặp lại và tinh chỉnh thiết kế MCP server

## Xử lý sự cố

### Lỗi kết nối

Nếu gặp lỗi kết nối:
- **STDIO**: kiểm tra lại lệnh và tham số
- **SSE/HTTP**: kiểm tra URL có truy cập được không và header có đúng không
- Đảm bảo mọi API key cần thiết đã được đặt trong biến môi trường hoặc header

### Độ chính xác thấp

Nếu nhiều câu evaluation trượt:
- Đọc nhận xét của agent ở từng tác vụ
- Kiểm tra xem mô tả tool đã rõ ràng và đầy đủ chưa
- Xác nhận các tham số đầu vào đã được ghi tài liệu tốt chưa
- Cân nhắc xem tool có trả về quá nhiều hoặc quá ít dữ liệu không
- Đảm bảo thông báo lỗi có tính hành động

### Bị timeout

Nếu tác vụ chạy quá lâu:
- Dùng model mạnh hơn qua cờ `-m` (ví dụ `-m claude-opus-5`)
- Kiểm tra xem tool có trả về quá nhiều dữ liệu không
- Xác nhận phân trang đang hoạt động đúng
- Cân nhắc đơn giản hóa những câu hỏi quá phức tạp
