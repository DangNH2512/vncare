---
name: synthesize-research
description: Synthesize user research from interviews, surveys, and feedback into structured insights. Use when you have a pile of interview notes, survey responses, or support tickets to make sense of, need to extract themes and rank findings by frequency and impact, or want to turn raw feedback into roadmap recommendations.
---

# Synthesize Research

> Placeholders như **~~knowledge base**, **~~chat**, **~~project tracker** = connector/MCP tương ứng nếu được kết nối (Notion, Slack, Linear...). Nếu không có, bỏ qua bước đó.

Synthesize user research from multiple sources into structured insights and recommendations.

## Tích hợp vào dự án — Da Nang Connect

- **Nguồn đầu vào ở đây:** phản hồi của host tổ chức sự kiện, review app của người
  tham dự (App Store / Play Store), hội thoại hỗ trợ, báo cáo vi phạm trong hàng đợi
  kiểm duyệt, và bất thường trong hành vi RSVP (tỉ lệ no-show, RSVP rồi huỷ sát giờ,
  sự kiện không ai đăng ký).
- **Song ngữ là mặc định:** người dùng là expat nói tiếng Anh và người Việt bản địa.
  Trích dẫn nguyên văn bằng ngôn ngữ gốc, kèm bản dịch sang ngôn ngữ còn lại. Đừng
  gộp phản hồi EN và VI thành một chủ đề khi hai nhóm đang than phiền về hai việc khác nhau.
- **Chia nhóm theo tác nhân:** host vs người tham dự vs moderator vs đối tác địa
  phương (quán cà phê, phòng gym, trung tâm ngôn ngữ). Cùng một lời than phiền
  mang ý nghĩa khác nhau theo từng nhóm, và chúng chảy về những phần khác nhau của
  sản phẩm (`apps/web`, `apps/mobile`, bảng kiểm duyệt).
- **Chia nhóm theo thâm niên ở Đà Nẵng:** người mới tới dưới 3 tháng, người ở dài
  hạn, khách ngắn ngày. Nhu cầu kết nối của ba nhóm này lệch nhau rất xa.
- **Chia nhóm theo khu vực:** An Thượng / Mỹ Khê hành xử khác Hải Châu. Nếu một
  chủ đề chỉ xuất hiện ở một khu vực, hãy nói rõ điều đó thay vì báo cáo mức toàn thành phố.
- **Ưu tiên chủ đề liên quan an toàn:** mọi phát hiện chạm tới quấy rối, danh tính
  giả, hoặc rủi ro khi gặp mặt trực tiếp được nâng mức nghiêm trọng bất kể tần suất.
- **Quyền riêng tư:** khi trích dẫn, ẩn danh người dùng theo Nghị định 13/2023/NĐ-CP —
  không đưa họ tên đầy đủ, số điện thoại, email hay ảnh nhận diện vào báo cáo.
- **Đường đi của đầu ra:** chủ đề → [feature-discovery](../feature-discovery/SKILL.md)
  (năng lực mới) hoặc [write-spec](../write-spec/SKILL.md) (thay đổi có phạm vi rõ);
  khuyến nghị đã xếp ưu tiên → [roadmap-update](../roadmap-update/SKILL.md) /
  `.agent/future-plans/`. Lưu báo cáo tổng hợp trong `docs/product/` hoặc kèm spec liên quan.
- Ghi lại các quyết định sản phẩm bền vững phát sinh từ nghiên cứu vào
  `.agent/memory/DECISIONS.md`.

## Cách gọi

```
/synthesize-research
```

## Quy trình

### 1. Thu thập đầu vào nghiên cứu

Nhận dữ liệu từ bất kỳ tổ hợp nào sau đây:
- **Văn bản dán trực tiếp**: ghi chú phỏng vấn, bản gỡ băng, câu trả lời khảo sát, phản hồi.
- **File tải lên**: tài liệu nghiên cứu, bảng tính, bản tóm tắt ghi âm.
- **~~knowledge base** (nếu có kết nối): tìm tài liệu nghiên cứu, ghi chú phỏng vấn, kết quả khảo sát.
- **~~user feedback** (nếu có kết nối): lấy ticket hỗ trợ, yêu cầu tính năng, báo lỗi gần đây.
- **~~product analytics** (nếu có kết nối): lấy dữ liệu sử dụng, chỉ số phễu, dữ liệu hành vi.
- **~~meeting transcription** (nếu có kết nối): lấy bản ghi phỏng vấn, tóm tắt cuộc họp, ghi chú thảo luận.

Hỏi người dùng đang có gì trong tay:
- Loại nghiên cứu nào? (phỏng vấn, khảo sát, kiểm thử khả dụng, analytics, ticket hỗ trợ, ghi chú cuộc gọi với đối tác)
- Bao nhiêu nguồn / bao nhiêu người tham gia?
- Có câu hỏi hay giả thuyết cụ thể nào đang cần kiểm chứng không?
- Kết quả này sẽ phục vụ quyết định nào?

### 2. Xử lý từng nguồn

Với mỗi nguồn, rút ra:
- **Quan sát chính**: người dùng đã nói gì, làm gì, trải nghiệm ra sao?
- **Trích dẫn**: câu nói nguyên văn minh hoạ được điểm quan trọng.
- **Hành vi**: người dùng thực sự đã làm gì (khác với điều họ nói là mình làm).
- **Điểm đau**: bực bội, cách lách, nhu cầu chưa được đáp ứng.
- **Tín hiệu tích cực**: chỗ nào đang chạy tốt, khoảnh khắc người dùng thấy thích.
- **Bối cảnh**: nhóm người dùng, tình huống sử dụng, mức độ thành thạo.

### 3. Tìm chủ đề và quy luật

Áp dụng phân tích chủ đề — xem mục **Phương pháp tổng hợp nghiên cứu** bên dưới để
biết chi tiết về thematic analysis, affinity mapping và triangulation.

Gom các quan sát thành chủ đề, đếm tần suất xuất hiện trên số người tham gia, và
đánh giá mức độ nghiêm trọng của tác động. Ghi lại cả những chỗ mâu thuẫn và bất ngờ.

Lập ma trận ưu tiên:
- **Tần suất cao + Tác động lớn**: phát hiện ưu tiên hàng đầu.
- **Tần suất thấp + Tác động lớn**: quan trọng với một nhóm cụ thể.
- **Tần suất cao + Tác động nhỏ**: cải thiện chất lượng trải nghiệm.
- **Tần suất thấp + Tác động nhỏ**: ghi nhận nhưng hạ ưu tiên.

### 4. Viết bản tổng hợp

Tạo một bản tổng hợp nghiên cứu có cấu trúc:

#### Tổng quan nghiên cứu
- Phương pháp: dùng những loại nghiên cứu nào, bao nhiêu người tham gia / nguồn.
- Câu hỏi nghiên cứu: chúng ta đặt ra tìm hiểu điều gì.
- Khoảng thời gian: nghiên cứu được thực hiện khi nào.

#### Phát hiện chính
Với mỗi phát hiện lớn (nhắm 5–8 phát hiện):
- **Phát biểu phát hiện**: một câu rõ ràng mô tả insight.
- **Bằng chứng**: trích dẫn, số liệu hoặc quan sát hỗ trợ (ghi rõ nguồn).
- **Tần suất**: bao nhiêu người tham gia / nguồn ủng hộ phát hiện này.
- **Tác động**: ảnh hưởng tới trải nghiệm người dùng hoặc tới việc kinh doanh mạnh tới đâu.
- **Mức độ tin cậy**: Cao (bằng chứng mạnh), Trung bình (mang tính gợi ý), Thấp (mới là tín hiệu sớm).

Sắp xếp phát hiện theo độ ưu tiên (tần suất × tác động).

#### Nhóm người dùng / Persona
Nếu nghiên cứu cho thấy các nhóm người dùng khác biệt rõ:
- Tên nhóm và mô tả.
- Đặc điểm và hành vi chính.
- Nhu cầu và điểm đau riêng.
- Ước lượng quy mô nếu có dữ liệu.

#### Vùng cơ hội
Dựa trên các phát hiện, chỉ ra vùng cơ hội:
- Nhu cầu nào của người dùng chưa được đáp ứng hoặc phục vụ chưa tới.
- Giải pháp hiện tại hụt ở đâu.
- Năng lực mới nào sẽ mở ra giá trị.
- Xếp theo tác động tiềm năng.

#### Khuyến nghị
Khuyến nghị cụ thể, hành động được:
- Nên xây gì, đổi gì, hay điều tra thêm điều gì.
- Gắn ngược lại với phát hiện cụ thể nào.
- Xếp theo tác động và tính khả thi.

#### Câu hỏi còn mở
Những gì nghiên cứu này chưa trả lời được:
- Chỗ hiểu biết còn thiếu.
- Vùng cần điều tra thêm.
- Đề xuất phương pháp nghiên cứu tiếp theo.

### 5. Rà lại và mở rộng

Sau khi có bản tổng hợp:
- Hỏi xem phát hiện nào cần chi tiết hơn hoặc cần diễn đạt theo góc khác.
- Đề nghị tạo thêm sản phẩm cụ thể: tài liệu persona, bản đồ cơ hội, bản trình bày nghiên cứu.
- Đề nghị lập kế hoạch nghiên cứu tiếp theo cho các câu hỏi còn mở.
- Đề nghị viết phần hàm ý sản phẩm (các phát hiện nên tác động tới roadmap ra sao).

## Phương pháp tổng hợp nghiên cứu

### Thematic analysis (phân tích chủ đề)
Phương pháp cốt lõi để tổng hợp nghiên cứu định tính:

1. **Làm quen dữ liệu**: đọc hết một lượt. Cảm nhận bức tranh tổng thể trước khi gán mã cho bất cứ thứ gì.
2. **Gán mã ban đầu**: đi qua dữ liệu một cách hệ thống. Gắn cho mỗi quan sát, trích dẫn hay số liệu một mã mô tả. Cứ gán mã thoải mái — gộp lại dễ hơn tách ra về sau.
3. **Dựng chủ đề**: gom các mã liên quan thành chủ đề ứng viên. Một chủ đề phải nắm bắt được điều gì đó quan trọng, không chỉ là "có nhiều người nhắc tới".
4. **Rà chủ đề**: đối chiếu chủ đề với dữ liệu. Mỗi chủ đề đã đủ bằng chứng chưa? Các chủ đề có tách bạch với nhau không?
5. **Tinh chỉnh chủ đề**: định nghĩa và đặt tên rõ cho từng chủ đề. Viết 1–2 câu mô tả chủ đề đó nói lên điều gì.
6. **Báo cáo**: viết các chủ đề thành phát hiện, kèm bằng chứng.

### Affinity mapping (gom nhóm theo tương đồng)
Phương pháp gom quan sát, làm theo nhóm được:

1. **Ghi lại quan sát**: mỗi quan sát, trích dẫn hay số liệu riêng biệt viết thành một mẩu ghi chú riêng.
2. **Gom cụm**: đặt các mẩu liên quan cạnh nhau theo mức độ tương đồng. Không định sẵn danh mục — để cụm tự hiện ra.
3. **Đặt tên cụm**: đặt cho mỗi cụm một cái tên mô tả đúng sợi dây chung.
4. **Sắp xếp cụm**: nếu thấy quy luật thì xếp các cụm vào nhóm lớn hơn.
5. **Rút chủ đề**: chính các cụm và quan hệ giữa chúng để lộ ra chủ đề chính.

**Mẹo khi affinity mapping**:
- Mỗi mẩu ghi chú một quan sát. Đừng gộp nhiều insight vào một mẩu.
- Cứ chuyển mẩu qua lại giữa các cụm. Lần gom đầu tiên hiếm khi là lần tốt nhất.
- Cụm nào phình quá to thì nhiều khả năng đang chứa nhiều chủ đề. Tách ra.
- Các điểm lạc loài rất đáng chú ý. Đừng ép mọi quan sát phải vào một cụm nào đó.
- Bản thân quá trình gom nhóm có giá trị ngang kết quả. Nó tạo ra hiểu biết chung cho cả đội.

### Triangulation (đối chiếu chéo nguồn)
Củng cố phát hiện bằng cách kết hợp nhiều nguồn dữ liệu:

- **Đối chiếu theo phương pháp**: cùng một câu hỏi, khác phương pháp (phỏng vấn + khảo sát + analytics).
- **Đối chiếu theo nguồn**: cùng phương pháp, khác người tham gia hoặc khác nhóm.
- **Đối chiếu theo thời gian**: cùng một quan sát ở những thời điểm khác nhau.

Một phát hiện được nhiều nguồn và nhiều phương pháp cùng ủng hộ thì mạnh hơn hẳn
phát hiện chỉ dựa vào một nguồn. Khi các nguồn không khớp nhau, hãy nói thẳng điều
đó ra và tìm hiểu tiếp.

## Phân tích ghi chú phỏng vấn

### Rút insight từ ghi chú phỏng vấn
Với mỗi cuộc phỏng vấn, xác định:

**Quan sát**: người tham gia mô tả họ đã làm gì, trải qua gì, cảm thấy gì?
- Phân biệt hành vi (họ làm gì) với thái độ (họ nghĩ/cảm thấy gì).
- Ghi bối cảnh: khi nào, ở đâu, với ai, tần suất ra sao.
- Đánh dấu các cách lách — đó là nhu cầu chưa được đáp ứng đang trá hình.

**Trích dẫn trực tiếp**: câu nói nguyên văn minh hoạ mạnh cho một điểm.
- Trích dẫn tốt là trích dẫn cụ thể và sống động, không chung chung.
- Ghi nguồn theo kiểu người tham gia, không theo tên: "Host tổ chức language exchange hằng tuần, An Thượng" chứ không phải một cái tên.
- Trích dẫn là bằng chứng, không phải phát hiện. Phát hiện là cách bạn diễn giải trích dẫn đó.

**Hành vi so với sở thích tự khai**: điều người ta LÀM thường khác điều người ta NÓI là mình muốn.
- Quan sát hành vi là bằng chứng mạnh hơn sở thích tự khai.
- Nếu người tham gia nói "tôi muốn tính năng X" nhưng luồng làm việc cho thấy họ chưa từng dùng tính năng tương tự, hãy ghi lại độ vênh đó.
- Tìm sở thích bộc lộ qua hành vi thật.

**Tín hiệu về cường độ**: chuyện này quan trọng tới mức nào với người tham gia?
- Ngôn ngữ cảm xúc: bực bội, hào hứng, cam chịu.
- Tần suất: họ gặp vấn đề này thường xuyên tới đâu.
- Cách lách: họ bỏ ra bao nhiêu công sức để đi vòng qua vấn đề.
- Hậu quả: khi hỏng thì hệ quả là gì.

### Sau khi xử lý từng cuộc phỏng vấn
- Tìm quy luật: quan sát nào xuất hiện ở nhiều người tham gia?
- Ghi tần suất: bao nhiêu người nhắc tới mỗi chủ đề?
- Nhận diện nhóm: các kiểu người dùng khác nhau có quy luật khác nhau không?
- Nêu mâu thuẫn: chỗ nào người tham gia không đồng ý với nhau? Đây thường là dấu hiệu tồn tại các nhóm khác biệt thật sự.
- Tìm điều bất ngờ: điều gì đi ngược lại giả định trước đó của bạn?

## Diễn giải dữ liệu khảo sát

### Phân tích định lượng
- **Tỉ lệ trả lời**: mẫu có đại diện không? Tỉ lệ trả lời thấp có thể gây thiên lệch.
- **Phân bố**: nhìn hình dạng phân bố, đừng chỉ nhìn giá trị trung bình. Phân bố hai đỉnh (nhiều điểm 1 và nhiều điểm 5) kể một câu chuyện khác hẳn so với mọi người đều cho 3.
- **Chia nhóm**: bóc tách câu trả lời theo nhóm người dùng. Số tổng hợp có thể che mất khác biệt quan trọng.
- **Ý nghĩa thống kê**: với mẫu nhỏ, hãy dè dặt khi kết luận từ những chênh lệch nhỏ.
- **So với chuẩn tham chiếu**: điểm số so với chuẩn ngành hoặc so với khảo sát trước ra sao?

### Phân tích câu trả lời mở
- Coi câu trả lời mở như một ghi chú phỏng vấn thu nhỏ.
- Gán mã chủ đề cho từng câu trả lời.
- Đếm tần suất chủ đề trên toàn bộ câu trả lời.
- Rút trích dẫn tiêu biểu cho từng chủ đề.
- Chú ý các chủ đề chỉ xuất hiện ở câu hỏi mở mà không có ở câu hỏi đóng — đó là những thứ bạn đã không nghĩ tới khi thiết kế khảo sát.

### Lỗi thường gặp khi phân tích khảo sát
- Báo cáo giá trị trung bình mà không kèm phân bố. Trung bình 3.5 có thể là ai cũng thấy bình thường, mà cũng có thể là một nửa rất thích và một nửa rất ghét.
- Bỏ qua thiên lệch do người không trả lời. Những người không trả lời có thể khác biệt một cách hệ thống.
- Diễn giải quá đà những chênh lệch nhỏ. NPS đổi 0.1 điểm là nhiễu, không phải tín hiệu.
- Coi thang Likert như dữ liệu khoảng. Khoảng cách giữa "Rất đồng ý" và "Đồng ý" không nhất thiết bằng khoảng cách giữa "Đồng ý" và "Trung lập".
- Nhầm tương quan với nhân quả khi đọc bảng chéo.

## Kết hợp insight định tính và định lượng

### Vòng lặp định tính — định lượng
- **Định tính trước**: phỏng vấn và quan sát cho biết CHUYỆN GÌ đang xảy ra và TẠI SAO. Chúng sinh ra giả thuyết.
- **Định lượng kiểm chứng**: khảo sát và analytics cho biết BAO NHIÊU và BAO NHIÊU NGƯỜI. Chúng kiểm định giả thuyết ở quy mô lớn.
- **Quay lại định tính đào sâu**: dùng lại phương pháp định tính để hiểu những con số bất thường.

### Cách kết hợp
- Dùng dữ liệu định lượng để xếp ưu tiên phát hiện định tính. Một chủ đề từ phỏng vấn quan trọng hơn nếu số liệu sử dụng cho thấy nó chạm tới nhiều người.
- Dùng dữ liệu định tính để giải thích bất thường định lượng. Retention tụt là một con số; phỏng vấn mới cho biết vì sao.
- Trình bày bằng chứng kết hợp: "47% người được khảo sát báo gặp khó ở X (khảo sát), và phỏng vấn cho thấy nguyên nhân là Y (định tính)".

### Khi các nguồn mâu thuẫn nhau
- Nguồn định lượng và định tính có thể kể hai câu chuyện khác nhau. Đó là tín hiệu, không phải lỗi.
- Kiểm tra xem mâu thuẫn có phải do đang đo hai tập người khác nhau không.
- Kiểm tra xem sở thích tự khai (khảo sát) có khác hành vi thật (analytics) không.
- Kiểm tra xem câu hỏi định lượng có thực sự đo đúng thứ bạn nghĩ nó đo không.
- Báo cáo mâu thuẫn một cách trung thực và điều tra tiếp, thay vì chọn bừa một nguồn.

## Dựng persona từ nghiên cứu

### Persona dựa trên bằng chứng
Persona phải nổi lên từ dữ liệu nghiên cứu, không phải từ trí tưởng tượng:

1. **Tìm quy luật hành vi**: tìm các cụm hành vi, mục tiêu và bối cảnh tương tự nhau giữa những người tham gia.
2. **Xác định biến phân biệt**: chiều nào tách cụm này khỏi cụm kia? (ví dụ: thâm niên ở Đà Nẵng, tần suất tham gia sự kiện, vai trò host hay người tham dự, khu vực sinh sống)
3. **Dựng hồ sơ persona**: với mỗi cụm hành vi:
   - Tên và mô tả ngắn
   - Hành vi và mục tiêu chính
   - Điểm đau và nhu cầu
   - Bối cảnh (vai trò, thời gian ở Đà Nẵng, công cụ đang dùng)
   - Trích dẫn tiêu biểu
4. **Đối chiếu với dữ liệu**: có ước lượng được quy mô từng nhóm bằng dữ liệu định lượng không?

### Khuôn persona
```
[Tên persona] — [Mô tả một dòng]

Họ là ai:
- Vai trò, thời gian ở Đà Nẵng, mức độ hoà nhập cộng đồng
- Họ biết tới và bắt đầu dùng sản phẩm như thế nào

Họ đang cố đạt được điều gì:
- Mục tiêu chính và việc cần hoàn thành
- Họ đo thành công bằng gì

Họ dùng sản phẩm ra sao:
- Tần suất và mức độ sâu
- Luồng và tính năng chính họ dùng
- Công cụ khác họ dùng song song

Điểm đau chính:
- 3 bực bội hoặc nhu cầu chưa được đáp ứng lớn nhất
- Cách lách mà họ đã tự nghĩ ra

Họ coi trọng điều gì:
- Điều gì quan trọng nhất ở một giải pháp
- Điều gì khiến họ bỏ đi hoặc chuyển sang chỗ khác

Trích dẫn tiêu biểu:
- 2–3 câu nguyên văn nắm bắt được góc nhìn của persona này
```

### Lỗi thường gặp khi làm persona
- Persona theo nhân khẩu học: định nghĩa bằng tuổi/giới tính/quốc tịch thay vì bằng hành vi. Hành vi dự đoán nhu cầu sản phẩm tốt hơn nhân khẩu học.
- Quá nhiều persona: 3–5 là vừa. Nhiều hơn thì không dùng được để ra quyết định.
- Persona hư cấu: bịa ra từ giả định thay vì dựng từ dữ liệu nghiên cứu.
- Persona đóng băng: không bao giờ cập nhật lại khi sản phẩm và thị trường đã đổi.
- Persona không kéo theo hàm ý: một persona không làm thay đổi quyết định sản phẩm nào thì vô dụng.

## Ước lượng quy mô cơ hội

### Cách ước lượng
Với mỗi phát hiện hoặc vùng cơ hội, ước lượng:

- **Số người dùng liên quan**: bao nhiêu người sẽ hưởng lợi nếu giải quyết? Dùng product analytics, dữ liệu khảo sát, hoặc suy ra từ tỉ lệ nhóm.
- **Tần suất**: người bị ảnh hưởng gặp vấn đề này bao lâu một lần? (hằng ngày, hằng tuần, hằng tháng, một lần duy nhất)
- **Mức nghiêm trọng**: khi xảy ra thì ảnh hưởng tới người dùng tới đâu? (chặn hẳn, cản trở đáng kể, khó chịu nhẹ)
- **Sẵn sàng trả tiền**: giải quyết việc này có kéo theo nâng cấp, giữ chân, hay thu hút người dùng mới không?

### Chấm điểm cơ hội
Chấm theo một ma trận đơn giản:

- **Tác động**: (số người bị ảnh hưởng) × (tần suất) × (mức nghiêm trọng) = điểm tác động
- **Độ mạnh bằng chứng**: mức tin cậy vào phát hiện? (nhiều nguồn > một nguồn, dữ liệu hành vi > sở thích tự khai)
- **Phù hợp chiến lược**: cơ hội này có ăn khớp với chiến lược và tầm nhìn sản phẩm không?
- **Khả thi**: có làm được thật không? (khả thi kỹ thuật, nguồn lực sẵn có, thời gian tới khi có tác động)

### Cách trình bày ước lượng
- Minh bạch về giả định và mức độ tin cậy.
- Cho thấy phép tính: "Dựa trên số ticket hỗ trợ, khoảng 2.000 người mỗi tháng gặp vấn đề này. Phỏng vấn cho thấy nó khiến họ mất trung bình 15 phút mỗi lần."
- Dùng khoảng thay vì con số chính xác giả tạo: "Ảnh hưởng 1.500–2.500 người mỗi tháng" chứ không phải "ảnh hưởng đúng 2.137 người".
- So các cơ hội với nhau để xếp hạng tương đối, đừng chỉ đưa điểm tuyệt đối.

## Định dạng đầu ra

Dùng heading rõ ràng và bố cục có cấu trúc. Mỗi phát hiện phải đứng độc lập được —
người đọc bốc ra một phát hiện bất kỳ vẫn hiểu được mà không cần đọc phần còn lại.

## Mẹo

- Để dữ liệu tự lên tiếng. Đừng ép phát hiện khớp vào một câu chuyện đã định sẵn.
- Phân biệt điều người dùng nói với điều họ làm. Dữ liệu hành vi mạnh hơn sở thích tự khai.
- Trích dẫn là bằng chứng mạnh. Dùng thoải mái, kèm ghi nguồn theo kiểu người tham gia (không phải tên).
- Nói rõ mức độ tin cậy. Một phát hiện từ 2 cuộc phỏng vấn là giả thuyết, không phải kết luận.
- Mâu thuẫn trong dữ liệu là điều thú vị, không phải phiền phức. Nó thường để lộ những nhóm người dùng khác biệt.
- Khuyến nghị phải cụ thể tới mức làm được ngay. "Cải thiện onboarding" là không hành động được. "Thêm thanh tiến trình vào luồng thiết lập ban đầu" thì được.
- Kìm lại đừng tổng hợp quá nhiều chủ đề. 5–8 phát hiện chắc còn hơn 20 phát hiện yếu.
