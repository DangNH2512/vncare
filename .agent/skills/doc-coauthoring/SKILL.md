---
name: doc-coauthoring
description: Dẫn người dùng đi qua một quy trình có cấu trúc để cùng viết tài liệu. Dùng khi người dùng muốn viết tài liệu, đề xuất, spec kỹ thuật, decision doc hoặc nội dung có cấu trúc tương tự. Quy trình này giúp truyền đạt bối cảnh hiệu quả, tinh chỉnh nội dung qua nhiều vòng, và kiểm chứng tài liệu có thật sự dùng được với người đọc. Kích hoạt khi người dùng nhắc đến viết tài liệu, tạo đề xuất, soạn spec hoặc các tác vụ tài liệu tương tự.
---

# Doc Co-Authoring Workflow

Skill này cung cấp một quy trình có cấu trúc để dẫn người dùng cùng tạo tài liệu. Hãy đóng vai người dẫn chủ động, đưa người dùng qua ba giai đoạn: Thu thập bối cảnh, Tinh chỉnh & Cấu trúc, và Kiểm chứng với người đọc.

> **Ghi chú cho Da Nang Connect:** tài liệu bàn giao của dự án nằm trong `docs/`
> (ví dụ `docs/analysis/`), viết bằng tiếng Việt. Khi tài liệu hoàn tất và cần
> gửi cho người ngoài đội, chuyển sang [doc-formatting](../doc-formatting/SKILL.md)
> để căn lề, gắn stylesheet và xuất PDF — mọi tài liệu bàn giao trong `docs/` đều
> ship kèm cả `.md` lẫn `.pdf`.

## Khi nào đề xuất quy trình này

**Điều kiện kích hoạt:**
- Người dùng nhắc đến việc viết tài liệu: "viết doc", "soạn đề xuất", "tạo spec", "viết lại cho tử tế"
- Người dùng nhắc đến loại tài liệu cụ thể: "PRD", "design doc", "decision doc", "RFC"
- Người dùng có vẻ đang bắt đầu một việc viết lách đáng kể

**Lời đề xuất ban đầu:**
Đề xuất với người dùng một quy trình có cấu trúc để cùng viết tài liệu. Giải thích ba giai đoạn:

1. **Thu thập bối cảnh**: Người dùng cung cấp toàn bộ bối cảnh liên quan trong khi Claude đặt câu hỏi làm rõ
2. **Tinh chỉnh & Cấu trúc**: Xây từng phần một qua brainstorm và biên tập lặp
3. **Kiểm chứng với người đọc**: Test tài liệu bằng một Claude hoàn toàn mới (không có bối cảnh) để bắt điểm mù trước khi người khác đọc

Giải thích rằng cách làm này giúp đảm bảo tài liệu vẫn hoạt động tốt khi người khác đọc (kể cả khi họ dán nó vào Claude). Hỏi xem họ muốn thử quy trình này hay thích làm tự do.

Nếu người dùng từ chối, làm tự do. Nếu người dùng đồng ý, chuyển sang Giai đoạn 1.

## Giai đoạn 1: Thu thập bối cảnh

**Mục tiêu:** Thu hẹp khoảng cách giữa những gì người dùng biết và những gì Claude biết, để về sau có thể tư vấn thông minh.

### Câu hỏi mở đầu

Bắt đầu bằng việc hỏi người dùng về bối cảnh tổng thể của tài liệu:

1. Đây là loại tài liệu gì? (ví dụ spec kỹ thuật, decision doc, đề xuất)
2. Người đọc chính là ai?
3. Tác động mong muốn khi ai đó đọc xong là gì?
4. Có template hay định dạng cụ thể nào phải theo không?
5. Còn ràng buộc hoặc bối cảnh nào cần biết không?

Nói cho họ biết có thể trả lời bằng cách viết tắt hoặc trút thông tin ra theo cách nào tiện nhất với họ.

**Nếu người dùng đưa template hoặc nhắc đến một loại tài liệu:**
- Hỏi xem họ có template mẫu để chia sẻ không
- Nếu họ đưa link tới một tài liệu dùng chung, dùng integration phù hợp để lấy về
- Nếu họ đưa file, đọc file đó

**Nếu người dùng nhắc đến việc sửa một tài liệu dùng chung đã có:**
- Dùng integration phù hợp để đọc trạng thái hiện tại
- Kiểm tra xem có ảnh nào thiếu alt-text không
- Nếu có ảnh thiếu alt-text, giải thích rằng khi người khác dùng Claude để hiểu tài liệu, Claude sẽ không nhìn thấy ảnh đó. Hỏi xem họ có muốn sinh alt-text không. Nếu có, đề nghị họ dán từng ảnh vào chat để sinh alt-text mô tả.

### Trút thông tin

Sau khi các câu hỏi mở đầu đã được trả lời, khuyến khích người dùng trút hết bối cảnh họ đang có. Đề nghị các thông tin như:
- Bối cảnh nền của dự án/vấn đề
- Các thảo luận trong đội hoặc tài liệu dùng chung liên quan
- Vì sao các phương án thay thế không được chọn
- Bối cảnh tổ chức (động lực trong đội, sự cố trong quá khứ, chính trị nội bộ)
- Áp lực thời hạn hoặc ràng buộc
- Kiến trúc kỹ thuật hoặc phụ thuộc
- Mối bận tâm của các bên liên quan

Dặn họ đừng lo việc sắp xếp — cứ trút ra hết đã. Đưa ra nhiều cách để cung cấp bối cảnh:
- Trút thông tin theo dòng ý thức
- Chỉ tới các kênh chat hoặc thread của đội để đọc
- Đưa link tới tài liệu dùng chung

**Nếu có integration** (ví dụ Slack, Teams, Google Drive, SharePoint, hoặc MCP server khác), nói rằng có thể dùng chúng để kéo bối cảnh về trực tiếp.

**Nếu không phát hiện integration nào và đang ở Claude.ai hoặc app Claude:** Gợi ý họ có thể bật connector trong phần cài đặt Claude để kéo bối cảnh trực tiếp từ ứng dụng nhắn tin và nơi lưu trữ tài liệu.

Cho họ biết các câu hỏi làm rõ sẽ được đặt ra sau khi họ trút xong đợt đầu.

**Trong lúc thu thập bối cảnh:**

- Nếu người dùng nhắc đến kênh chat của đội hoặc tài liệu dùng chung:
  - Nếu có integration: báo cho họ biết nội dung sẽ được đọc ngay bây giờ, rồi dùng integration phù hợp
  - Nếu không có integration: giải thích là không truy cập được. Gợi ý họ bật connector trong cài đặt Claude, hoặc dán thẳng nội dung liên quan vào.

- Nếu người dùng nhắc đến thực thể/dự án chưa biết:
  - Hỏi xem có nên tìm trong các công cụ đã kết nối để tìm hiểu thêm không
  - Chờ người dùng xác nhận rồi mới tìm

- Trong lúc người dùng cung cấp bối cảnh, theo dõi xem đã học được gì và còn gì chưa rõ

**Đặt câu hỏi làm rõ:**

Khi người dùng báo hiệu đã trút xong đợt đầu (hoặc sau khi đã có lượng bối cảnh đáng kể), đặt câu hỏi làm rõ để chắc chắn đã hiểu đúng:

Sinh 5–10 câu hỏi có đánh số dựa trên những chỗ còn thiếu trong bối cảnh.

Cho họ biết có thể trả lời tắt (ví dụ "1: có, 2: xem #channel, 3: không vì backwards compat"), đưa link tới tài liệu khác, chỉ kênh để đọc, hoặc cứ tiếp tục trút thông tin. Cách nào hiệu quả nhất với họ thì làm.

**Điều kiện thoát:**
Bối cảnh đã đủ khi các câu hỏi cho thấy sự hiểu — khi đã có thể hỏi về trường hợp biên và đánh đổi mà không cần ai giải thích lại những điều cơ bản.

**Chuyển tiếp:**
Hỏi xem còn bối cảnh nào họ muốn cung cấp ở giai đoạn này không, hay đã đến lúc bắt tay soạn tài liệu.

Nếu người dùng muốn bổ sung, cứ để họ bổ sung. Khi sẵn sàng, chuyển sang Giai đoạn 2.

## Giai đoạn 2: Tinh chỉnh & Cấu trúc

**Mục tiêu:** Xây tài liệu theo từng phần thông qua brainstorm, chọn lọc và tinh chỉnh lặp.

**Hướng dẫn cho người dùng:**
Giải thích rằng tài liệu sẽ được xây theo từng phần. Với mỗi phần:
1. Sẽ có câu hỏi làm rõ về những gì cần đưa vào
2. Sẽ brainstorm 5–20 phương án
3. Người dùng chỉ ra cái nào giữ/bỏ/gộp
4. Phần đó được soạn thành bản nháp
5. Bản nháp được tinh chỉnh bằng các chỉnh sửa chính xác từng điểm

Bắt đầu từ phần nào còn nhiều ẩn số nhất (thường là quyết định/đề xuất cốt lõi), rồi đi tiếp các phần còn lại.

**Thứ tự các phần:**

Nếu cấu trúc tài liệu đã rõ:
Hỏi họ muốn bắt đầu từ phần nào.

Gợi ý bắt đầu từ phần nhiều ẩn số nhất. Với decision doc, thường là đề xuất cốt lõi. Với spec, thường là hướng tiếp cận kỹ thuật. Các phần tóm tắt nên để lại làm sau cùng.

Nếu người dùng chưa biết mình cần những phần nào:
Dựa trên loại tài liệu và template, gợi ý 3–5 phần phù hợp với loại tài liệu đó.

Hỏi xem cấu trúc này có ổn không, hay họ muốn điều chỉnh.

**Sau khi chốt được cấu trúc:**

Tạo bộ khung tài liệu ban đầu với chữ giữ chỗ cho tất cả các phần.

**Nếu có quyền dùng artifact:**
Dùng `create_file` để tạo artifact. Việc này cho cả Claude lẫn người dùng một bộ khung để làm việc.

Cho họ biết bộ khung ban đầu kèm chữ giữ chỗ cho tất cả các phần sẽ được tạo.

Tạo artifact với đầy đủ tiêu đề các phần và chữ giữ chỗ ngắn gọn kiểu "[Sẽ viết sau]" hoặc "[Nội dung ở đây]".

Đưa link tới bộ khung và báo rằng đã đến lúc điền từng phần.

**Nếu không dùng được artifact:**
Tạo một file Markdown trong thư mục làm việc. Đặt tên phù hợp (ví dụ `decision-doc.md`, `technical-spec.md`). Với Da Nang Connect, tài liệu bàn giao đặt trong `docs/` và tên file không dấu, dùng gạch nối (ví dụ `docs/analysis/09-ten-tai-lieu.md`).

Cho họ biết bộ khung ban đầu kèm chữ giữ chỗ cho tất cả các phần sẽ được tạo.

Tạo file với đầy đủ tiêu đề các phần và chữ giữ chỗ.

Xác nhận tên file đã được tạo và báo rằng đã đến lúc điền từng phần.

**Với mỗi phần:**

### Bước 1: Câu hỏi làm rõ

Thông báo sẽ bắt đầu làm phần [TÊN PHẦN]. Đặt 5–10 câu hỏi làm rõ về những gì nên đưa vào:

Sinh 5–10 câu hỏi cụ thể dựa trên bối cảnh và mục đích của phần đó.

Cho họ biết có thể trả lời tắt hoặc chỉ cần nêu điều gì là quan trọng cần đề cập.

### Bước 2: Brainstorm

Với phần [TÊN PHẦN], brainstorm [5–20] thứ có thể đưa vào, tuỳ độ phức tạp của phần đó. Chú ý tìm:
- Bối cảnh họ từng chia sẻ mà có thể đã quên mất
- Những góc nhìn hoặc điểm cần cân nhắc chưa được nhắc tới

Sinh 5–20 phương án có đánh số tuỳ độ phức tạp của phần. Cuối cùng, đề nghị brainstorm thêm nếu họ muốn có thêm phương án.

### Bước 3: Chọn lọc

Hỏi xem nên giữ, bỏ, hay gộp những ý nào. Đề nghị họ nêu lý do ngắn gọn để học được thứ tự ưu tiên của họ cho các phần sau.

Đưa ví dụ:
- "Giữ 1,4,7,9"
- "Bỏ 3 (trùng với 1)"
- "Bỏ 6 (người đọc đã biết rồi)"
- "Gộp 11 và 12"

**Nếu người dùng phản hồi tự do** (ví dụ "ổn đấy" hoặc "tôi thích phần lớn nhưng...") thay vì chọn theo số, hãy rút ra ý muốn của họ rồi làm tiếp. Phân tích xem họ muốn giữ/bỏ/đổi gì và áp dụng.

### Bước 4: Kiểm tra chỗ thiếu

Dựa trên những gì họ đã chọn, hỏi xem còn thiếu điều gì quan trọng cho phần [TÊN PHẦN] không.

### Bước 5: Soạn nháp

Dùng `str_replace` để thay chữ giữ chỗ của phần này bằng nội dung thật.

Thông báo phần [TÊN PHẦN] sẽ được soạn ngay bây giờ dựa trên những gì họ đã chọn.

**Nếu dùng artifact:**
Sau khi soạn xong, đưa link tới artifact.

Đề nghị họ đọc qua và cho biết cần đổi gì. Lưu ý rằng nói cụ thể sẽ giúp học được phong cách của họ cho các phần sau.

**Nếu dùng file (không có artifact):**
Sau khi soạn xong, xác nhận đã hoàn tất.

Cho họ biết phần [TÊN PHẦN] đã được soạn trong [tên file]. Đề nghị họ đọc qua và cho biết cần đổi gì. Lưu ý rằng nói cụ thể sẽ giúp học được phong cách của họ cho các phần sau.

**Chỉ dẫn quan trọng cho người dùng (nói kèm khi soạn phần đầu tiên):**
Ghi chú lại: thay vì tự sửa thẳng vào tài liệu, hãy đề nghị họ nói ra cần đổi gì. Điều này giúp học được phong cách của họ cho các phần sau. Ví dụ: "Bỏ gạch đầu dòng X — đã nằm trong Y rồi" hoặc "Viết đoạn thứ ba cô đọng hơn".

### Bước 6: Tinh chỉnh lặp

Khi người dùng đưa phản hồi:
- Dùng `str_replace` để sửa (không bao giờ in lại toàn bộ tài liệu)
- **Nếu dùng artifact:** đưa link tới artifact sau mỗi lần sửa
- **Nếu dùng file:** chỉ cần xác nhận đã sửa xong
- Nếu người dùng tự sửa thẳng vào tài liệu rồi bảo đọc lại: ghi nhận những thay đổi họ đã làm và giữ trong đầu cho các phần sau (đó là biểu hiện thị hiếu của họ)

**Tiếp tục lặp** cho tới khi người dùng hài lòng với phần đó.

### Kiểm tra chất lượng

Sau 3 vòng lặp liên tiếp mà không có thay đổi đáng kể, hỏi xem có thể bỏ bớt gì mà không mất thông tin quan trọng không.

Khi phần đó xong, xác nhận [TÊN PHẦN] đã hoàn tất. Hỏi xem đã sẵn sàng chuyển sang phần tiếp theo chưa.

**Lặp lại cho tất cả các phần.**

### Gần hoàn tất

Khi sắp xong (đã làm được 80%+ số phần), thông báo ý định đọc lại toàn bộ tài liệu và kiểm tra:
- Mạch văn và tính nhất quán giữa các phần
- Trùng lặp hoặc mâu thuẫn
- Bất kỳ chỗ nào nghe như "slop" hoặc nội dung độn chung chung
- Từng câu có thật sự mang sức nặng không

Đọc toàn bộ tài liệu và đưa nhận xét.

**Khi tất cả các phần đã soạn và tinh chỉnh xong:**
Thông báo tất cả các phần đã hoàn tất. Nêu ý định rà lại toàn bộ tài liệu thêm một lượt.

Rà lại tính mạch lạc, mạch văn, độ đầy đủ tổng thể.

Đưa ra các đề xuất cuối cùng.

Hỏi xem đã sẵn sàng chuyển sang Kiểm chứng với người đọc chưa, hay còn muốn tinh chỉnh gì nữa.

## Giai đoạn 3: Kiểm chứng với người đọc

**Mục tiêu:** Test tài liệu bằng một Claude hoàn toàn mới (không bị dính bối cảnh cũ) để xác nhận nó dùng được với người đọc.

**Hướng dẫn cho người dùng:**
Giải thích rằng bây giờ sẽ test xem tài liệu có thật sự dùng được với người đọc không. Việc này bắt được điểm mù — những thứ hiển nhiên với người viết nhưng có thể làm người khác bối rối.

### Cách test

**Nếu có quyền dùng sub-agent (ví dụ trong Claude Code):**

Tự thực hiện việc test mà không cần người dùng tham gia.

### Bước 1: Dự đoán câu hỏi của người đọc

Thông báo ý định dự đoán những câu hỏi mà người đọc có thể đặt ra khi tìm tới tài liệu này.

Sinh 5–10 câu hỏi mà người đọc thực tế sẽ hỏi.

### Bước 2: Test bằng sub-agent

Thông báo rằng các câu hỏi này sẽ được test bằng một phiên Claude hoàn toàn mới (không có bối cảnh từ cuộc hội thoại hiện tại).

Với mỗi câu hỏi, gọi một sub-agent chỉ với nội dung tài liệu và câu hỏi đó.

Tóm tắt lại Claude-người-đọc trả lời đúng/sai chỗ nào cho từng câu.

### Bước 3: Chạy các kiểm tra bổ sung

Thông báo sẽ chạy thêm các kiểm tra bổ sung.

Gọi sub-agent để kiểm tra chỗ mơ hồ, giả định sai, mâu thuẫn.

Tóm tắt các vấn đề tìm được.

### Bước 4: Báo cáo và sửa

Nếu tìm thấy vấn đề:
Báo rằng Claude-người-đọc vướng ở những chỗ cụ thể nào.

Liệt kê các vấn đề cụ thể.

Nêu ý định sửa những chỗ hổng này.

Quay lại bước tinh chỉnh cho các phần có vấn đề.

---

**Nếu không dùng được sub-agent (ví dụ giao diện web claude.ai):**

Người dùng sẽ phải tự test thủ công.

### Bước 1: Dự đoán câu hỏi của người đọc

Hỏi xem người ta có thể đặt câu hỏi gì khi tìm tới tài liệu này. Họ sẽ gõ gì vào Claude.ai?

Sinh 5–10 câu hỏi mà người đọc thực tế sẽ hỏi.

### Bước 2: Chuẩn bị test

Đưa hướng dẫn test:
1. Mở một cuộc hội thoại Claude hoàn toàn mới: https://claude.ai
2. Dán hoặc chia sẻ nội dung tài liệu (nếu dùng nền tảng tài liệu dùng chung có bật connector, đưa link)
3. Hỏi Claude-người-đọc những câu hỏi vừa sinh ra

Với mỗi câu hỏi, yêu cầu Claude-người-đọc đưa ra:
- Câu trả lời
- Có chỗ nào mơ hồ hoặc không rõ không
- Tài liệu đang giả định người đọc phải biết sẵn kiến thức/bối cảnh gì

Kiểm tra xem Claude-người-đọc trả lời đúng hay hiểu sai chỗ nào.

### Bước 3: Kiểm tra bổ sung

Hỏi thêm Claude-người-đọc:
- "Chỗ nào trong tài liệu này có thể mơ hồ hoặc khó hiểu với người đọc?"
- "Tài liệu này giả định người đọc đã biết sẵn kiến thức hay bối cảnh gì?"
- "Có mâu thuẫn hay điểm không nhất quán nào bên trong tài liệu không?"

### Bước 4: Lặp lại dựa trên kết quả

Hỏi xem Claude-người-đọc sai hoặc vướng ở đâu. Nêu ý định sửa những chỗ hổng đó.

Quay lại bước tinh chỉnh cho các phần có vấn đề.

---

### Điều kiện thoát (cho cả hai cách)

Khi Claude-người-đọc trả lời đúng một cách ổn định và không còn phát hiện chỗ hổng hay chỗ mơ hồ mới, tài liệu đã sẵn sàng.

## Rà soát cuối

Khi đã qua được Kiểm chứng với người đọc:
Thông báo tài liệu đã vượt qua vòng test với Claude-người-đọc. Trước khi kết thúc:

1. Khuyến nghị họ tự đọc lại một lượt cuối — tài liệu là của họ và họ chịu trách nhiệm về chất lượng
2. Gợi ý kiểm tra lại các dữ kiện, link, chi tiết kỹ thuật
3. Đề nghị họ xác nhận tài liệu đạt được tác động mà họ mong muốn

Hỏi xem họ muốn rà thêm một lượt nữa không, hay đã xong việc.

**Nếu người dùng muốn rà lượt cuối, hãy làm. Nếu không:**
Thông báo tài liệu đã hoàn tất. Đưa vài lời khuyên cuối:
- Cân nhắc đính link cuộc hội thoại này vào phụ lục để người đọc thấy được tài liệu đã hình thành thế nào
- Dùng phụ lục để bổ sung chiều sâu mà không làm phình phần thân
- Cập nhật tài liệu khi nhận được phản hồi từ người đọc thật

**Với tài liệu bàn giao của Da Nang Connect:** trước khi coi là xong, chạy tiếp
[doc-formatting](../doc-formatting/SKILL.md) — căn lề justify, link nguồn dạng
gạch đầu dòng, đánh số mục, rồi xuất `.pdf` đặt cạnh file `.md`.

## Mẹo dẫn dắt hiệu quả

**Giọng điệu:**
- Trực tiếp và theo quy trình
- Giải thích ngắn gọn lý do khi nó ảnh hưởng tới hành vi của người dùng
- Đừng cố "bán" cách làm này — cứ thực thi thôi

**Xử lý khi đi chệch:**
- Nếu người dùng muốn bỏ qua một giai đoạn: hỏi xem họ có muốn bỏ qua và viết tự do không
- Nếu người dùng có vẻ bực: thừa nhận rằng việc này đang lâu hơn dự kiến. Gợi ý cách làm nhanh hơn
- Luôn để người dùng có quyền điều chỉnh quy trình

**Quản lý bối cảnh:**
- Xuyên suốt quá trình, nếu thiếu bối cảnh về điều gì được nhắc tới, chủ động hỏi
- Đừng để các chỗ hổng dồn lại — xử lý ngay khi chúng xuất hiện

**Quản lý artifact:**
- Dùng `create_file` để soạn trọn một phần
- Dùng `str_replace` cho mọi chỉnh sửa
- Đưa link artifact sau mỗi lần thay đổi
- Không bao giờ dùng artifact cho danh sách brainstorm — đó chỉ là hội thoại

**Chất lượng hơn tốc độ:**
- Đừng vội vàng lướt qua các giai đoạn
- Mỗi vòng lặp phải tạo ra cải thiện có ý nghĩa
- Mục tiêu là một tài liệu thật sự dùng được với người đọc
