---
name: stakeholder-update
description: Soạn bản cập nhật cho các bên liên quan, tuỳ biến theo đối tượng đọc và nhịp báo cáo. Dùng khi viết báo cáo tình hình theo tuần/tháng cho lãnh đạo, công bố một đợt ra mắt, leo thang một rủi ro hoặc điểm nghẽn, hoặc diễn đạt cùng một tiến độ thành bản cho lãnh đạo, bản chi tiết kỹ thuật và bản hướng tới người dùng.
---

# Cập nhật cho các bên liên quan

> Placeholder như **~~knowledge base**, **~~chat**, **~~project tracker** = connector/MCP tương ứng nếu được kết nối (Notion, Slack, Linear...). Nếu không có, bỏ qua bước đó.

Soạn bản cập nhật cho các bên liên quan, tuỳ biến theo đối tượng đọc và nhịp báo cáo.

## Tích hợp vào dự án — Da Nang Connect

- **Các nhóm người đọc ở dự án này:**
  1. **Chủ dự án / nhà đầu tư** — tiếng Việt, nói theo kết quả kinh doanh, không
     thuật ngữ. Bám bộ chỉ số của [metrics-review](../metrics-review/SKILL.md):
     sự kiện tạo mới, tỷ lệ RSVP trên lượt xem, tỷ lệ no-show, organizer chủ động,
     retention D1/D7/D30, tỷ lệ curate → self-serve.
  2. **Chi tiết kỹ thuật** — tiếng Anh, cho người trong team (`apps/api`,
     `apps/web`, `apps/mobile`, `packages/shared-types`, `ops/`).
  3. **Hướng tới người dùng** — cộng đồng expat và organizer. **Mặc định viết
     tiếng Anh**, bản tiếng Việt là bản thứ hai; giọng văn đơn giản, không thuật ngữ.
- **Nguồn sự thật:** `.agent/memory/ACTIVE_TASKS.md` (thứ đã ship), `HANDOFFS.md`,
  `DECISIONS.md`, `git log`, và các kế hoạch đang chạy trong
  `.agent/future-plans/*_PLAN.md` (trạng thái so với điểm nghẽn).
- **Xuất bản:** cần doc/PDF chia sẻ được thì áp dụng
  [doc-formatting](../doc-formatting/SKILL.md) + `.agent/templates/pdf-export.css`,
  lưu dưới `docs/`. Cần deck trình bày theo kỳ thì dùng
  [weekly-report](../weekly-report/SKILL.md), đừng tự dựng bố cục mới.
- **Việc phải leo thang (đưa vào mục "cần quyết định" của mọi bản cập nhật):**
  thay đổi schema DB, thay đổi API gây breaking, cổng deploy đang chờ duyệt, và
  **mọi thay đổi chạm dữ liệu cá nhân** (thu thập trường mới, chia sẻ cho bên thứ
  ba, đổi thời hạn lưu trữ) — vì chủ dự án phải chốt trước khi triển khai.
- **Sự cố cần báo ngay, không đợi kỳ:** sự kiện hiển thị sai khu vực/bán kính,
  push nhắc sự kiện không tới, nội dung bị báo cáo chưa được xử lý quá SLA, hoặc
  rò rỉ thông tin hồ sơ người dùng.

## Cách gọi

```
/stakeholder-update 
```

## Quy trình

### 1. Xác định loại bản cập nhật

Hỏi người dùng cần loại nào:
- **Hằng tuần**: cập nhật theo nhịp đều về tiến độ, điểm nghẽn và bước tiếp theo
- **Hằng tháng**: tóm tắt ở tầm cao hơn với xu hướng, cột mốc và mức phù hợp chiến lược
- **Ra mắt**: công bố một tính năng hoặc sản phẩm kèm chi tiết và tác động
- **Đột xuất**: bản cập nhật một lần cho tình huống cụ thể (leo thang, đổi hướng, quyết định lớn)

### 2. Xác định đối tượng đọc

Hỏi bản cập nhật này viết cho ai:
- **Ban lãnh đạo / chủ dự án**: tầm cao, tập trung vào kết quả, khung chiến lược, ngắn gọn
- **Đội kỹ thuật**: chi tiết kỹ thuật, bối cảnh triển khai, điểm nghẽn, quyết định cần chốt
- **Đối tác liên chức năng**: mức chi tiết vừa đủ theo bối cảnh, tập trung vào mục tiêu chung và phụ thuộc
- **Người dùng / bên ngoài**: nhấn vào lợi ích, mốc thời gian rõ ràng, không dùng biệt ngữ nội bộ
- **Hội đồng / nhà đầu tư**: dựa trên số liệu, mang tính chiến lược, tập trung vào rủi ro, cực kỳ súc tích

### 3. Kéo bối cảnh từ các công cụ đã kết nối

Nếu **~~project tracker** được kết nối:
- Kéo trạng thái các hạng mục roadmap và cột mốc
- Xác định hạng mục đã hoàn thành kể từ bản cập nhật trước
- Nêu ra hạng mục đang có rủi ro hoặc bị chặn
- Kéo tiến độ sprint hoặc iteration

Nếu **~~chat** được kết nối:
- Tìm các thảo luận và quyết định liên quan của đội
- Tìm điểm nghẽn hoặc vấn đề đã nêu trong các kênh
- Xác định các quyết định đã chốt bất đồng bộ

Nếu **~~meeting transcription** được kết nối:
- Kéo biên bản và tóm tắt thảo luận của các cuộc họp gần đây
- Tìm quyết định và đầu việc từ các cuộc họp liên quan

Nếu **~~knowledge base** được kết nối:
- Tìm biên bản họp gần đây
- Tìm tài liệu quyết định hoặc biên bản review thiết kế

Nếu không có công cụ nào được kết nối, đề nghị người dùng cung cấp:
- Những gì đã hoàn thành kể từ bản cập nhật trước
- Điểm nghẽn hoặc rủi ro hiện tại
- Quyết định đã chốt hoặc cần chốt
- Những gì sắp tới

### 4. Soạn bản cập nhật

Cấu trúc bản cập nhật theo đối tượng đọc, dùng các mẫu và khung bên dưới.

**Cho lãnh đạo**: TL;DR, màu trạng thái (G/Y/R), tiến độ chính gắn với mục tiêu, quyết định đã chốt, rủi ro kèm phương án, đề nghị cụ thể, và các cột mốc tiếp theo. Giữ dưới 300 từ.

**Cho kỹ thuật**: cái gì đã ship (kèm link), cái gì đang làm (kèm người phụ trách), điểm nghẽn, quyết định cần chốt (kèm phương án và khuyến nghị), và cái gì sắp tới.

**Cho đối tác liên chức năng**: cái gì sắp tới sẽ ảnh hưởng tới họ, ta cần gì ở họ (kèm hạn), quyết định nào tác động tới nhóm họ, và chỗ nào đang mở để lấy ý kiến.

**Cho người dùng**: cái gì mới (diễn đạt theo lợi ích), cái gì sắp có, lỗi đã biết kèm cách xử lý tạm, và cách gửi phản hồi. Không dùng biệt ngữ nội bộ.

**Cho thông báo ra mắt**: cái gì vừa ra mắt, vì sao nó quan trọng, chi tiết chính (phạm vi, ai dùng được, giới hạn), chỉ số đo thành công, kế hoạch triển khai, và kênh nhận phản hồi.

### 5. Rà lại và gửi đi

Sau khi soạn bản cập nhật:
- Hỏi người dùng có muốn chỉnh giọng văn, mức chi tiết hay trọng tâm không
- Đề nghị định dạng lại theo kênh gửi (email, tin nhắn nhóm, tài liệu, slide)
- Nếu **~~chat** được kết nối, đề nghị soạn sẵn tin nhắn để gửi

## Mẫu bản cập nhật theo đối tượng đọc

### Bản cho lãnh đạo / chủ dự án
Lãnh đạo cần: bối cảnh chiến lược, tiến độ so với mục tiêu, rủi ro cần họ can thiệp, quyết định cần họ chốt.

**Định dạng**:
```
Status: [Green / Yellow / Red]

TL;DR: [One sentence — the most important thing to know]

Progress:
- [Outcome achieved, tied to goal/OKR]
- [Milestone reached, with impact]
- [Key metric movement]

Risks:
- [Risk]: [Mitigation plan]. [Ask if needed].

Decisions needed:
- [Decision]: [Options with recommendation]. Need by [date].

Next milestones:
- [Milestone] — [Date]
```

**Mẹo cho bản gửi lãnh đạo**:
- Nói kết luận trước, đừng kể hành trình. Lãnh đạo muốn nghe "ta đã ship X và nó làm chỉ số Y dịch chuyển", không phải "ta đã họp 14 buổi standup và xử lý 23 ticket".
- Giữ dưới 200 từ. Nếu họ cần thêm, họ sẽ hỏi.
- Màu trạng thái phải phản ánh đánh giá thật của BẠN, không phải điều bạn nghĩ họ muốn nghe. Vàng không phải là thất bại — đó là quản trị rủi ro tốt.
- Chỉ đưa vào những rủi ro bạn cần họ trợ giúp. Đừng liệt kê rủi ro bạn đang tự xử lý được, trừ khi họ cần biết.
- Đề nghị phải cụ thể: "Cần chốt X trước thứ Sáu", không phải "cần hỗ trợ".

### Bản cho đội kỹ thuật
Kỹ sư cần: thứ tự ưu tiên rõ ràng, bối cảnh kỹ thuật, điểm nghẽn được gỡ, quyết định ảnh hưởng tới việc của họ.

**Định dạng**:
```
Shipped:
- [Feature/fix] — [Link to PR/ticket]. [Impact if notable].

In progress:
- [Item] — [Owner]. [Expected completion]. [Blockers if any].

Decisions:
- [Decision made]: [Rationale]. [Link to ADR if exists].
- [Decision needed]: [Context]. [Options]. [Recommendation].

Priority changes:
- [What changed and why]

Coming up:
- [Next items] — [Context on why these are next]
```

**Mẹo cho bản gửi kỹ thuật**:
- Dẫn link tới ticket, PR và tài liệu cụ thể. Kỹ sư muốn bấm vào để xem chi tiết.
- Khi thứ tự ưu tiên thay đổi, giải thích vì sao. Kỹ sư sẽ đồng thuận hơn khi hiểu lý do.
- Nói rõ cái gì đang chặn họ và bạn đang làm gì để gỡ.
- Đừng làm mất thời gian của họ bằng thông tin không ảnh hưởng tới việc họ làm.

### Bản cho đối tác liên chức năng
Đối tác (thiết kế, marketing, cộng đồng, hỗ trợ) cần: cái gì sắp tới ảnh hưởng tới họ, họ cần chuẩn bị gì, cách góp ý.

**Định dạng**:
```
What's coming:
- [Feature/launch] — [Date]. [What this means for your team].

What we need from you:
- [Specific ask] — [Context]. By [date].

Decisions made:
- [Decision] — [How it affects your team].

Open for input:
- [Topic we'd love feedback on] — [How to provide it].
```

### Bản cho người dùng / bên ngoài
Người dùng cần: cái gì mới, cái gì sắp có, nó có lợi gì cho họ, bắt đầu thế nào.

**Định dạng**:
```
What's new:
- [Feature] — [Benefit in user terms]. [How to use it / link].

Coming soon:
- [Feature] — [Expected timing]. [Why it matters to you].

Known issues:
- [Issue] — [Status]. [Workaround if available].

Feedback:
- [How to share feedback or request features]
```

**Mẹo cho bản gửi người dùng**:
- Không biệt ngữ nội bộ. Không số ticket. Không chi tiết triển khai kỹ thuật.
- Diễn đạt mọi thứ theo hướng người dùng NAY LÀM ĐƯỢC gì, không phải bạn đã xây gì.
- Trung thực về mốc thời gian nhưng đừng hứa quá. "Cuối quý này" tốt hơn một ngày cụ thể mà bạn có thể trượt.
- Chỉ nêu lỗi đã biết nếu nó ảnh hưởng tới người dùng và bạn đã có kế hoạch xử lý.

## Khung báo cáo trạng thái

### Trạng thái Green / Yellow / Red

**Green** (đúng hướng):
- Tiến triển đúng kế hoạch
- Không có rủi ro hay điểm nghẽn đáng kể
- Đúng lộ trình để đạt cam kết và hạn chót
- Chỉ dùng Green khi mọi thứ thật sự ổn — không dùng như mặc định

**Yellow** (có rủi ro):
- Tiến độ chậm hơn kế hoạch, hoặc một rủi ro đã thành hiện thực
- Đang xử lý nhưng kết quả chưa chắc chắn
- Có thể trượt cam kết nếu không can thiệp hoặc không điều chỉnh phạm vi
- Dùng Yellow chủ động — cảnh báo rủi ro càng sớm càng nhiều lựa chọn

**Red** (lệch hướng):
- Chậm đáng kể so với kế hoạch
- Có điểm nghẽn hoặc rủi ro lớn chưa có hướng xử lý rõ ràng
- Sẽ trượt cam kết nếu không có can thiệp lớn (cắt phạm vi, bổ sung nguồn lực, giãn tiến độ)
- Dùng Red khi bạn thật sự cần trợ giúp. Đừng đợi tới lúc quá muộn.

### Khi nào đổi trạng thái
- Chuyển sang Yellow ở dấu hiệu rủi ro ĐẦU TIÊN, không phải khi đã chắc chắn mọi thứ tệ
- Chuyển sang Red khi bạn đã dùng hết lựa chọn của mình và cần leo thang
- Chỉ quay lại Green khi rủi ro thật sự được giải quyết, không phải khi nó chỉ tạm lắng
- Ghi lại cái gì đã thay đổi khi bạn đổi trạng thái — "Chuyển sang Yellow vì [lý do]"

## Truyền đạt rủi ro

### Khung ROAM để quản trị rủi ro
- **Resolved (đã giải quyết)**: rủi ro không còn là mối lo. Ghi lại cách đã giải quyết.
- **Owned (có người phụ trách)**: rủi ro đã được ghi nhận và có người đang chủ động xử lý. Nêu rõ người phụ trách và phương án.
- **Accepted (chấp nhận)**: rủi ro đã biết nhưng ta chọn đi tiếp mà không xử lý. Ghi lại lý do.
- **Mitigated (đã giảm thiểu)**: đã có hành động đưa rủi ro về mức chấp nhận được. Ghi lại đã làm gì.

### Truyền đạt rủi ro hiệu quả
1. **Nêu rủi ro rõ ràng**: "Có rủi ro là [chuyện gì] xảy ra vì [lý do]"
2. **Định lượng tác động**: "Nếu nó xảy ra, hậu quả là [tác động]"
3. **Nêu khả năng xảy ra**: "Chuyện này [nhiều khả năng / có thể / khó] xảy ra vì [bằng chứng]"
4. **Trình bày phương án**: "Ta đang xử lý bằng cách [hành động]"
5. **Nêu đề nghị**: "Ta cần [trợ giúp cụ thể] để giảm rủi ro này thêm nữa"

### Lỗi thường gặp khi truyền đạt rủi ro
- Chôn rủi ro giữa tin tốt. Hãy nói rủi ro trước khi nó quan trọng.
- Nói chung chung: "có thể sẽ trễ chút" — hãy nói rõ trễ cái gì, bao lâu và vì sao.
- Nêu rủi ro mà không kèm phương án. Mọi rủi ro phải đi cùng một kế hoạch.
- Nói quá muộn. Rủi ro báo sớm là đầu vào cho kế hoạch. Rủi ro báo muộn là một đám cháy.

## Ghi lại quyết định (ADR)

### Định dạng Architecture Decision Record
Ghi lại các quyết định quan trọng để tham chiếu về sau:

```
# [Decision Title]

## Status
[Proposed / Accepted / Deprecated / Superseded by ADR-XXX]

## Context
What is the situation that requires a decision? What forces are at play?

## Decision
What did we decide? State the decision clearly and directly.

## Consequences
What are the implications of this decision?
- Positive consequences
- Negative consequences or tradeoffs accepted
- What this enables or prevents in the future

## Alternatives Considered
What other options were evaluated?
For each: what was it, why was it rejected?
```

### Khi nào cần viết ADR
- Quyết định sản phẩm mang tính chiến lược (nhắm vào phân khúc nào, hỗ trợ nền tảng nào)
- Quyết định kỹ thuật đáng kể (lựa chọn kiến trúc, chọn nhà cung cấp, tự xây hay mua)
- Quyết định gây tranh cãi, có người không đồng tình (ghi lại lý do để sau này tra cứu)
- Quyết định ràng buộc các lựa chọn tương lai (chọn một công nghệ, ký một hợp tác)
- Quyết định mà bạn đoán sau này sẽ có người hỏi lại (ghi lại bối cảnh khi nó còn tươi)

### Mẹo ghi lại quyết định
- Viết ADR ngay khi quyết định được đưa ra, không phải vài tuần sau
- Ghi rõ ai tham gia quyết định và ai là người chốt cuối
- Ghi bối cảnh thật rộng tay — người đọc sau này không có bối cảnh của hôm nay
- Ghi lại cả những quyết định về sau mới thấy là sai cũng không sao — thêm liên kết "superseded by"
- Giữ ngắn. Một trang tốt hơn năm trang.

## Điều phối cuộc họp

### Standup / đồng bộ hằng ngày
**Mục đích**: nêu điểm nghẽn, phối hợp công việc, giữ nhịp.
**Định dạng**: mỗi người chia sẻ:
- Đã làm được gì từ lần đồng bộ trước
- Sắp làm gì tiếp
- Đang bị chặn bởi cái gì

**Mẹo điều phối**:
- Giữ trong 15 phút. Nếu nảy ra thảo luận, đưa ra ngoài buổi họp.
- Tập trung vào điểm nghẽn — đây là phần giá trị nhất của standup
- Theo dõi điểm nghẽn và bám tới khi được gỡ
- Huỷ standup nếu không có gì cần đồng bộ. Tôn trọng thời gian của mọi người.

### Lập kế hoạch sprint / iteration
**Mục đích**: cam kết công việc cho sprint tới. Thống nhất ưu tiên và phạm vi.
**Định dạng**:
1. Rà lại: sprint trước ship được gì, gì bị đẩy sang, gì bị cắt
2. Ưu tiên: những việc quan trọng nhất cần hoàn thành trong sprint này là gì
3. Năng lực: đội gánh được bao nhiêu (tính cả nghỉ phép, on-call, họp)
4. Cam kết: chọn hạng mục từ backlog vừa với năng lực và ưu tiên
5. Phụ thuộc: đánh dấu mọi phụ thuộc liên nhóm hoặc bên ngoài

**Mẹo điều phối**:
- Đến họp với một thứ tự ưu tiên đề xuất sẵn. Đừng bắt cả đội ưu tiên từ con số không.
- Phản đối việc cam kết quá tay. Cam kết ít mà giao đúng hẹn thì tốt hơn.
- Đảm bảo mọi hạng mục đều có người phụ trách và tiêu chí nghiệm thu rõ ràng.
- Đánh dấu hạng mục bị ước lượng nhẹ tay hoặc có độ phức tạp ẩn.

### Retrospective
**Mục đích**: nhìn lại cái gì tốt, cái gì chưa tốt, và cần thay đổi gì.
**Định dạng**:
1. Mở đầu: nhắc lại mục tiêu và tạo cảm giác an toàn để nói thật
2. Thu thập dữ liệu: cái gì tốt, cái gì chưa tốt, cái gì gây khó hiểu
3. Rút ra hiểu biết: nhận diện khuôn mẫu và nguyên nhân gốc
4. Chốt hành động: chọn 1-3 cải tiến cụ thể để thử ở sprint tới
5. Kết: cảm ơn mọi người vì đã góp ý thẳng thắn

**Mẹo điều phối**:
- Tạo cảm giác an toàn. Mọi người phải thấy an toàn khi nói thật.
- Tập trung vào hệ thống và quy trình, không nhắm vào cá nhân.
- Giới hạn 1-3 đầu việc. Nhiều hơn thế thì chẳng thay đổi được gì.
- Bám theo các đầu việc của retro lần trước. Nếu không bao giờ bám, mọi người sẽ thôi tham gia.
- Thỉnh thoảng đổi định dạng retro để tránh nhàm.

### Buổi review / demo cho các bên liên quan
**Mục đích**: cho thấy tiến độ, thu phản hồi, tạo đồng thuận.
**Định dạng**:
1. Bối cảnh: nhắc lại mục tiêu và những gì họ đã xem lần trước
2. Demo: cho xem thứ đã xây. Dùng sản phẩm thật, không dùng slide.
3. Chỉ số: chia sẻ dữ liệu hoặc phản hồi ban đầu
4. Phản hồi: dành thời gian có cấu trúc cho câu hỏi và góp ý
5. Bước tiếp theo: cái gì sắp tới và khi nào có buổi review kế tiếp

**Mẹo điều phối**:
- Demo sản phẩm thật bất cứ khi nào có thể. Slide không phải demo.
- Định khung việc lấy phản hồi: "Bạn góp ý gì về X?" tốt hơn "Có ý kiến gì không?"
- Ghi lại phản hồi công khai và cam kết xử lý (hoặc giải thích vì sao không)
- Đặt kỳ vọng rõ ràng về loại phản hồi nào là hành động được ở giai đoạn này

## Định dạng đầu ra

Giữ bản cập nhật dễ quét. Dùng in đậm cho ý chính, gạch đầu dòng cho danh sách. Bản gửi lãnh đạo nên dưới 300 từ. Bản gửi kỹ thuật có thể dài hơn nhưng vẫn phải có cấu trúc để đọc lướt.

## Mẹo

- Lỗi phổ biến nhất trong các bản cập nhật là chôn mất ý chính. Hãy bắt đầu bằng điều quan trọng nhất.
- Màu trạng thái (Green/Yellow/Red) phải phản ánh thực tế, không phản ánh sự lạc quan. Vàng không phải thất bại — đó là truyền đạt rủi ro tốt.
- Đề nghị phải cụ thể và hành động được. "Cần hỗ trợ" không phải một đề nghị. "Cần chốt X trước thứ Sáu" mới là.
- Với lãnh đạo, diễn đạt mọi thứ theo kết quả và mục tiêu, không theo hoạt động và đầu việc.
- Nếu có tin xấu, nói trước. Đừng giấu nó sau tin tốt.
- Điều chỉnh độ dài theo mức chú ý của người đọc. Lãnh đạo nhận vài gạch đầu dòng. Kỹ thuật nhận đúng phần chi tiết họ cần.
