---
name: roadmap-update
description: Cập nhật, tạo mới hoặc sắp xếp lại thứ tự ưu tiên cho roadmap sản phẩm. Dùng khi thêm một sáng kiến mới và phải quyết định cái gì bị đẩy xuống để nhường chỗ, đổi thứ tự ưu tiên sau khi có thông tin mới, dời mốc thời gian do một phụ thuộc bị trễ, hoặc dựng bảng Now/Next/Later từ đầu.
---

# Cập nhật roadmap

> Placeholder như **~~knowledge base**, **~~chat**, **~~project tracker** = connector/MCP tương ứng nếu được kết nối (Notion, Slack, Linear...). Nếu không có, bỏ qua bước đó.

Cập nhật, tạo mới hoặc sắp xếp lại thứ tự ưu tiên cho roadmap sản phẩm.

## Tích hợp vào dự án — Da Nang Connect

- **Nhà của roadmap:** `.agent/future-plans/` — mỗi sáng kiến một file
  `UPPER_SNAKE_PLAN.md`. Bản tổng quan Now/Next/Later nằm ở
  `docs/analysis/08-roadmap-va-ke-hoach-trien-khai.md` và trỏ tới từng plan.
- **Khung 3 giai đoạn của sản phẩm là ràng buộc cứng của roadmap:**
  | Giai đoạn | Phạm vi | Vị trí mặc định trên roadmap |
  |---|---|---|
  | 1 — Kết nối cộng đồng | Sự kiện, thể thao, trao đổi ngôn ngữ; tạo sự kiện, RSVP có sức chứa và waitlist, tìm kiếm & lọc theo khu vực, hồ sơ có trust level, kiểm duyệt UGC | **Now** |
  | 2 — Nhà ở | Listing chỗ ở cho expat | **Later** (không kéo lên Now khi giai đoạn 1 chưa có người dùng thật) |
  | 3 — Y tế / dịch vụ chuyên môn | Danh bạ và đặt lịch dịch vụ | **Later** |
  Muốn đưa một hạng mục giai đoạn 2/3 lên "Now" thì phải ghi rõ lý do và cái gì
  của giai đoạn 1 bị đẩy xuống để nhường chỗ.
- **Phân loại "future plan":** việc roadmap chỉ ghi/cập nhật file kế hoạch —
  **không viết code**. Khi một hạng mục chuyển sang "Now", nó vào pipeline bình
  thường (feature-discovery / write-spec → luồng BA-first).
- **Đổi thứ tự ưu tiên:** ghi quyết định + lý do vào `.agent/memory/DECISIONS.md`
  và phản ánh trạng thái ở `DAILY_TASKS.md` §Planning.
- **Lăng kính đánh đổi của sản phẩm này:** ba bề mặt cùng tranh một nguồn lực
  (`apps/api` NestJS · `apps/web` Next.js · `apps/mobile` Expo). Đánh dấu là
  **chi phí cao** mọi sáng kiến chạm vào:
  - schema DB (cổng STOP cho migration) hoặc mở rộng PostGIS,
  - API công khai (cổng breaking-change) và `packages/shared-types`,
  - dữ liệu cá nhân (phải rà Nghị định 13/2023/ND-CP trước khi làm),
  - luồng kiểm duyệt UGC hoặc trust level (chạm cả sản phẩm lẫn vận hành),
  - phát hành store (App Store/Play Store review chặn ngày ra mắt, không rút ngắn được).

## Cách gọi

```
/roadmap-update 
```

## Quy trình

### 1. Nắm hiện trạng

Nếu **~~project tracker** được kết nối:
- Kéo các hạng mục roadmap hiện có kèm trạng thái, người phụ trách và mốc thời gian
- Xác định hạng mục quá hạn, có rủi ro, hoặc vừa hoàn thành
- Nêu ra hạng mục chưa có người phụ trách hoặc chưa có mốc thời gian rõ ràng

Nếu không có công cụ quản lý dự án nào được kết nối:
- Đề nghị người dùng mô tả roadmap hiện tại hoặc dán/tải nó lên
- Chấp nhận mọi định dạng: danh sách, bảng, bảng tính, ảnh chụp màn hình, hoặc mô tả bằng lời

### 2. Xác định thao tác cần làm

Hỏi người dùng muốn làm gì:

**Thêm hạng mục**: tính năng, sáng kiến hoặc đầu việc mới đưa vào roadmap
- Thu thập: tên, mô tả, mức ưu tiên, ước lượng công sức, khung thời gian mục tiêu, người phụ trách, phụ thuộc
- Đề xuất vị trí phù hợp dựa trên thứ tự ưu tiên và năng lực hiện tại

**Cập nhật trạng thái**: đổi trạng thái của hạng mục đang có
- Các lựa chọn: chưa bắt đầu, đang làm, có rủi ro, bị chặn, đã xong, đã cắt
- Với "có rủi ro" hoặc "bị chặn": hỏi điểm nghẽn và phương án xử lý

**Đổi thứ tự ưu tiên**: thay đổi thứ tự hoặc mức ưu tiên của các hạng mục
- Hỏi cái gì đã thay đổi (thông tin mới, đổi chiến lược, thay đổi nguồn lực, phản hồi người dùng)
- Áp dụng một khung ưu tiên nếu hữu ích — xem **Các khung ưu tiên** bên dưới cho RICE, MoSCoW, ICE và ma trận giá trị/công sức
- Cho thấy so sánh trước/sau

**Dời mốc thời gian**: dịch chuyển ngày của các hạng mục
- Hỏi vì sao (thay đổi phạm vi, phụ thuộc bị trễ, thiếu nguồn lực)
- Xác định tác động dây chuyền lên các hạng mục phụ thuộc
- Đánh dấu hạng mục bị đẩy qua các hạn chót cứng

**Tạo roadmap mới**: dựng roadmap từ đầu
- Hỏi khung thời gian (quý, nửa năm, năm)
- Hỏi định dạng mong muốn (Now/Next/Later, cột theo quý, gắn với OKR) — xem **Các khung roadmap** bên dưới
- Thu thập danh sách sáng kiến cần đưa vào

### 3. Tạo bản tổng hợp roadmap

Tạo một bảng roadmap gồm:

#### Tổng quan trạng thái
Tóm tắt nhanh: X hạng mục đang làm, Y hạng mục hoàn thành trong kỳ, Z hạng mục có rủi ro.

#### Các hạng mục roadmap
Với mỗi hạng mục, thể hiện:
- Tên và mô tả một dòng
- Chỉ báo trạng thái (đúng hướng / có rủi ro / bị chặn / đã xong / chưa bắt đầu)
- Khung thời gian hoặc ngày mục tiêu
- Người phụ trách
- Các phụ thuộc chính

Nhóm hạng mục theo:
- Khung thời gian (Now / Next / Later) hoặc theo quý, tuỳ định dạng
- Hoặc theo chủ đề/mục tiêu nếu người dùng muốn vậy

#### Rủi ro và phụ thuộc
- Hạng mục bị chặn hoặc có rủi ro, kèm chi tiết
- Phụ thuộc liên nhóm và trạng thái của chúng
- Hạng mục đang tiến sát hạn chót cứng

#### Thay đổi trong lần cập nhật này
Nếu đây là bản cập nhật cho roadmap đã có, tóm tắt những gì đã đổi:
- Hạng mục được thêm, gỡ hoặc đổi ưu tiên
- Các mốc thời gian bị dịch chuyển
- Các thay đổi trạng thái

### 4. Việc tiếp theo

Sau khi tạo roadmap:
- Đề nghị định dạng lại cho một nhóm người đọc cụ thể (bản tóm tắt cho lãnh đạo, bản chi tiết kỹ thuật, bản hướng tới người dùng)
- Đề nghị soạn thông báo về các thay đổi trên roadmap
- Nếu công cụ quản lý dự án được kết nối, đề nghị cập nhật trạng thái ticket

## Các khung roadmap

### Now / Next / Later
Định dạng roadmap đơn giản nhất và thường là hiệu quả nhất:

- **Now** (sprint/tháng hiện tại): công việc đã cam kết. Tự tin cao về phạm vi và thời gian. Đây là những thứ đội đang xây.
- **Next** (1-3 tháng tới): công việc đã lên kế hoạch. Khá chắc về "làm gì", kém chắc hơn về "khi nào". Đã xác định phạm vi và ưu tiên nhưng chưa bắt đầu.
- **Later** (3-6 tháng trở lên): mang tính định hướng. Đây là các cược chiến lược và cơ hội ta có ý định theo đuổi, nhưng phạm vi và thời điểm còn linh hoạt.

Khi nào dùng: hầu hết các đội, hầu hết thời gian. Đặc biệt tốt khi truyền đạt ra bên ngoài hoặc cho lãnh đạo vì nó tránh sự chính xác giả tạo về ngày tháng.

### Chủ đề theo quý
Tổ chức roadmap quanh 2-3 chủ đề mỗi quý:

- Mỗi chủ đề đại diện cho một mảng đầu tư chiến lược (ví dụ: "Nguồn cung sự kiện", "Cải thiện kích hoạt", "Niềm tin và an toàn")
- Dưới mỗi chủ đề, liệt kê các sáng kiến cụ thể đã lên kế hoạch
- Chủ đề nên gắn với OKR của công ty hoặc của đội
- Định dạng này giúp giải thích dễ dàng VÌ SAO ta xây thứ ta đang xây

Khi nào dùng: khi cần cho thấy sự phù hợp về mặt chiến lược. Tốt cho các buổi họp kế hoạch và trao đổi với lãnh đạo.

### Roadmap gắn với OKR
Ánh xạ trực tiếp các hạng mục roadmap vào Objectives và Key Results:

- Bắt đầu từ OKR của đội trong kỳ
- Dưới mỗi Key Result, liệt kê các sáng kiến sẽ dịch chuyển chỉ số đó
- Nêu tác động kỳ vọng của từng sáng kiến lên Key Result
- Cách này tạo trách nhiệm rõ ràng giữa cái bạn xây và cái bạn đo

Khi nào dùng: các tổ chức vận hành theo OKR. Tốt để đảm bảo mọi sáng kiến đều có một "vì sao" gắn với kết quả đo được.

### Bảng thời gian / Gantt
Góc nhìn theo lịch với các hạng mục đặt trên trục thời gian:

- Cho thấy ngày bắt đầu, ngày kết thúc và thời lượng
- Trực quan hoá phần chạy song song và phần chạy tuần tự
- Tốt để phát hiện xung đột nguồn lực
- Cho thấy phụ thuộc giữa các hạng mục

Khi nào dùng: lập kế hoạch thực thi cùng đội kỹ thuật. Phát hiện xung đột lịch. KHÔNG tốt để truyền đạt ra bên ngoài (tạo kỳ vọng chính xác giả tạo).

## Các khung ưu tiên

### Điểm RICE
Chấm điểm mỗi sáng kiến trên bốn chiều, rồi tính RICE = (Reach x Impact x Confidence) / Effort

- **Reach (độ phủ)**: sáng kiến này tác động tới bao nhiêu người dùng trong một khoảng thời gian? Dùng con số cụ thể (ví dụ: "500 người dùng mỗi quý").
- **Impact (tác động)**: với mỗi người được tiếp cận, nó tạo khác biệt tới đâu? Chấm theo thang: 3 = rất lớn, 2 = cao, 1 = trung bình, 0,5 = thấp, 0,25 = không đáng kể.
- **Confidence (mức tự tin)**: ta tự tin đến đâu vào ước lượng reach và impact? 100% = tự tin cao (có dữ liệu), 80% = trung bình (có ít bằng chứng), 50% = thấp (cảm tính).
- **Effort (công sức)**: bao nhiêu person-month? Tính cả kỹ thuật, thiết kế và các vai trò khác.

Khi nào dùng: khi cần một cách ưu tiên định lượng, bảo vệ được. Tốt để so sánh một backlog lớn. Kém phù hợp với các cược chiến lược mà tác động khó ước lượng.

### MoSCoW
Xếp các hạng mục vào Must have, Should have, Could have, Won't have:

- **Must have**: thiếu chúng thì roadmap coi như thất bại. Cam kết không thương lượng.
- **Should have**: quan trọng và được kỳ vọng, nhưng vẫn giao được nếu thiếu.
- **Could have**: đáng có nhưng rõ ràng ưu tiên thấp hơn. Chỉ đưa vào nếu còn dư năng lực.
- **Won't have**: nói rõ là ngoài phạm vi kỳ này. Cần liệt kê ra cho minh bạch.

Khi nào dùng: xác định phạm vi cho một bản phát hành hoặc một quý. Thương lượng với các bên liên quan về cái gì lọt vào. Tốt để ép ra cuộc trò chuyện về ưu tiên.

### Điểm ICE
Đơn giản hơn RICE. Chấm mỗi hạng mục từ 1-10 trên ba chiều:

- **Impact**: nó dịch chuyển chỉ số mục tiêu tới mức nào?
- **Confidence**: ta tự tin đến đâu vào ước lượng tác động?
- **Ease**: triển khai dễ tới mức nào? (nghịch đảo của công sức — cao hơn = dễ hơn)

Điểm ICE = Impact x Confidence x Ease

Khi nào dùng: ưu tiên nhanh một backlog tính năng. Tốt cho sản phẩm giai đoạn sớm hoặc khi chưa đủ dữ liệu để dùng RICE.

### Ma trận Giá trị / Công sức
Đặt các sáng kiến lên ma trận 2x2:

- **Giá trị cao, công sức thấp** (thắng nhanh): làm trước.
- **Giá trị cao, công sức cao** (cược lớn): lên kế hoạch cẩn thận. Đáng đầu tư nhưng cần xác định phạm vi tử tế.
- **Giá trị thấp, công sức thấp** (lấp chỗ trống): làm khi còn dư năng lực.
- **Giá trị thấp, công sức cao** (hố tiền): đừng làm. Gỡ khỏi backlog.

Khi nào dùng: ưu tiên trực quan trong các buổi lập kế hoạch nhóm. Tốt để xây dựng hiểu biết chung về đánh đổi.

## Vẽ bản đồ phụ thuộc

### Nhận diện phụ thuộc
Tìm phụ thuộc theo các nhóm sau:

- **Phụ thuộc kỹ thuật**: tính năng B cần phần hạ tầng do tính năng A tạo ra
- **Phụ thuộc giữa các nhóm**: tính năng cần công việc từ nhóm khác (thiết kế, nền tảng, dữ liệu)
- **Phụ thuộc bên ngoài**: chờ nhà cung cấp, đối tác hoặc tích hợp bên thứ ba
- **Phụ thuộc tri thức**: cần kết quả nghiên cứu hoặc điều tra trước khi bắt đầu
- **Phụ thuộc tuần tự**: phải ship tính năng A trước khi bắt đầu tính năng B (dùng chung code, chung luồng người dùng)

### Quản lý phụ thuộc
- Liệt kê mọi phụ thuộc một cách tường minh trên roadmap
- Gán người chịu trách nhiệm cho từng phụ thuộc (ai lo giải quyết nó)
- Đặt ngày "cần có": khi nào hạng mục phụ thuộc cần nó được giải quyết
- Chừa đệm quanh các phụ thuộc — chúng là hạng mục rủi ro nhất trên bất kỳ roadmap nào
- Đánh dấu sớm những phụ thuộc vượt ranh giới nhóm — chúng cần phối hợp
- Có phương án dự phòng: làm gì nếu phụ thuộc bị trễ?

### Giảm phụ thuộc
- Có thể xây bản đơn giản hơn để né phụ thuộc không?
- Có thể chạy song song bằng cách chốt hợp đồng interface hoặc dùng mock không?
- Có thể sắp xếp lại thứ tự để phụ thuộc được làm sớm hơn không?
- Có thể kéo phần việc đó về đội mình để bỏ khâu phối hợp liên nhóm không?

## Lập kế hoạch năng lực

### Ước lượng năng lực
- Bắt đầu từ số lượng kỹ sư và khoảng thời gian
- Trừ đi phần chi phí đã biết: họp, trực on-call, phỏng vấn, ngày lễ, nghỉ phép
- Một quy tắc kinh nghiệm phổ biến: kỹ sư dành 60-70% thời gian cho công việc tính năng đã lên kế hoạch
- Tính cả thời gian làm quen của thành viên mới

### Phân bổ năng lực
Một cách phân bổ lành mạnh cho phần lớn đội sản phẩm:

- **70% tính năng đã lên kế hoạch**: các hạng mục roadmap phục vụ mục tiêu chiến lược
- **20% sức khoẻ kỹ thuật**: nợ kỹ thuật, độ tin cậy, hiệu năng, trải nghiệm lập trình viên
- **10% ngoài kế hoạch**: đệm cho việc gấp, thắng nhanh và yêu cầu từ nhóm khác

Điều chỉnh tỷ lệ theo bối cảnh đội:
- Sản phẩm mới: nhiều việc tính năng hơn, ít nợ kỹ thuật hơn
- Sản phẩm trưởng thành: đầu tư nhiều hơn vào nợ kỹ thuật và độ tin cậy
- Sau sự cố: nhiều độ tin cậy hơn, ít tính năng hơn
- Tăng trưởng nhanh: nhiều khả năng mở rộng và hiệu năng hơn

### Năng lực so với tham vọng
- Nếu cam kết trên roadmap vượt năng lực, phải có thứ gì đó bị bỏ
- Đừng giải bài toán năng lực bằng cách giả vờ rằng người ta làm được nhiều hơn — hãy giải bằng cách cắt phạm vi
- Khi thêm việc vào roadmap, luôn hỏi: "Cái gì rời khỏi roadmap?"
- Cam kết ít thứ và giao đúng hẹn tốt hơn là cam kết quá tay rồi làm mọi người thất vọng

## Truyền đạt thay đổi roadmap

### Khi roadmap thay đổi
Các nguyên nhân thường gặp khiến roadmap thay đổi:
- Ưu tiên chiến lược mới từ ban lãnh đạo
- Phản hồi hoặc nghiên cứu người dùng làm đổi thứ tự ưu tiên
- Phát hiện kỹ thuật làm đổi ước lượng
- Phụ thuộc từ nhóm khác bị trễ
- Thay đổi nguồn lực (đội mở rộng hoặc thu hẹp, người chủ chốt rời đi)
- Động thái cạnh tranh buộc phải phản ứng

### Truyền đạt thay đổi thế nào
1. **Nói rõ có thay đổi**: thẳng thắn về cái gì đang đổi và vì sao
2. **Giải thích lý do**: thông tin mới nào dẫn tới quyết định này?
3. **Cho thấy đánh đổi**: cái gì bị hạ ưu tiên để nhường chỗ? Hoặc cái gì bị trễ?
4. **Cho thấy kế hoạch mới**: roadmap đã cập nhật với các thay đổi
5. **Thừa nhận tác động**: ai bị ảnh hưởng và ảnh hưởng thế nào? Những bên đang trông đợi hạng mục bị hạ ưu tiên cần được nghe trực tiếp.

### Tránh "roadmap whiplash"
- Đừng đổi roadmap theo từng mẩu thông tin mới. Hãy đặt một ngưỡng để thay đổi.
- Gom các cập nhật roadmap vào những nhịp tự nhiên (hằng tháng, hằng quý) trừ khi thật sự khẩn cấp.
- Phân biệt "thay đổi roadmap" (đổi ưu tiên chiến lược) với "điều chỉnh phạm vi" (tinh chỉnh thực thi bình thường).
- Theo dõi tần suất roadmap thay đổi. Thay đổi liên tục có thể là dấu hiệu chiến lược chưa rõ, chứ không phải sự nhạy bén.

## Định dạng đầu ra

Dùng định dạng rõ ràng, dễ quét. Bảng rất hợp cho các hạng mục roadmap. Dùng nhãn trạng thái dạng chữ: **Done**, **On Track**, **At Risk**, **Blocked**, **Not Started**.

## Mẹo

- Roadmap là công cụ truyền đạt, không phải kế hoạch dự án. Giữ nó ở đúng độ cao — chủ đề và kết quả, không phải danh sách task.
- Khi đổi ưu tiên, luôn hỏi cái gì đã thay đổi. Dịch chuyển ưu tiên phải xuất phát từ thông tin mới, không phải từ hứng.
- Cảnh báo sớm vấn đề năng lực. Nếu roadmap chứa nhiều việc hơn sức đội, hãy nói ra.
- Phụ thuộc là rủi ro lớn nhất của roadmap. Nêu chúng ra một cách tường minh.
- Nếu người dùng đề nghị thêm một thứ, luôn hỏi cái gì rời đi hoặc bị dời. Roadmap là bài toán tổng bằng không so với năng lực.
