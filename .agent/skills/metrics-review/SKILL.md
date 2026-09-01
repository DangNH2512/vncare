---
name: metrics-review
description: Rà soát và phân tích chỉ số sản phẩm kèm phân tích xu hướng và khuyến nghị hành động. Dùng khi chạy phiên rà soát chỉ số theo tuần/tháng/quý, điều tra một cú tăng vọt hoặc tụt bất thường, so sánh kết quả với mục tiêu, hoặc biến số liệu thô thành scorecard kèm hành động đề xuất.
---

# Rà soát chỉ số (Metrics Review)

> Placeholder như **~~knowledge base**, **~~chat**, **~~project tracker** = connector/MCP tương ứng nếu được kết nối (Notion, Slack, Linear...). Nếu không có, bỏ qua bước đó.

Rà soát và phân tích chỉ số sản phẩm, nhận diện xu hướng, và rút ra hành động cụ thể.

## Tích hợp vào dự án — Da Nang Connect

Giai đoạn 1 của sản phẩm là **nền tảng kết nối cộng đồng expat qua sự kiện**, nên
scorecard mặc định là chỉ số của một nền tảng sự kiện, không phải thương mại điện tử.

- **Bộ chỉ số lõi (scorecard mặc định):**
  | Chỉ số | Định nghĩa | Vì sao quan trọng |
  |---|---|---|
  | **Sự kiện tạo mới / tuần** | Số event được publish (không tính draft, không tính event bị gỡ do kiểm duyệt) | Nguồn cung của nền tảng — cạn nguồn cung là chết trước cả cầu |
  | **Tỷ lệ RSVP / lượt xem** | RSVP `going` / lượt xem trang chi tiết sự kiện | Sự kiện có đủ hấp dẫn để người ta cam kết hay không |
  | **Tỷ lệ no-show** | (RSVP `going` − check-in thực tế) / RSVP `going` | Chỉ số niềm tin; no-show cao làm organizer bỏ nền tảng |
  | **Organizer chủ động** | Số tài khoản tạo >= 1 sự kiện trong 28 ngày qua | Nguồn cung có lặp lại không, hay chỉ một vài người gánh |
  | **Retention D1 / D7 / D30** | % người dùng đăng ký ở kỳ N còn hoạt động sau 1 / 7 / 30 ngày | Sản phẩm có giữ chân expat mới tới Đà Nẵng không |
  | **Tỷ lệ curate → self-serve** | % sự kiện do đội sáng lập curate thủ công sau đó được organizer gốc nhận về tự quản lý | Kiểm chứng cửa chuyển đổi organizer từ bị động sang chủ động — điều kiện để nền tảng tự chạy |
- **Chỉ số phụ (drill-down):** phân bố sự kiện theo khu vực (My Khe, An Thuong,
  My An, Hai Chau, Son Tra, Ngu Hanh Son); phân bố theo loại (thể thao / trao đổi
  ngôn ngữ / gặp mặt); thời gian từ lúc tạo tới lúc sự kiện diễn ra (lead time);
  tỷ lệ lấp đầy sức chứa và tỷ lệ waitlist được đôn lên; tỷ lệ huỷ RSVP sát giờ;
  tỷ lệ hồ sơ đạt từng mức **trust level**; số nội dung bị báo cáo và thời gian xử
  lý kiểm duyệt UGC; tỷ lệ gửi thành công của Expo Push (và tỷ lệ token
  `DeviceNotRegistered` cần dọn); tỷ trọng web (`apps/web`) so với mobile
  (`apps/mobile`); tỷ lệ người dùng chọn `en` so với `vi`.
- **Nguồn dữ liệu:** PostgreSQL qua `psql` **chỉ đọc** (điều tra read-only luôn
  được phép theo cổng của `database-migrations` — không bao giờ ghi), cộng bảng
  audit log cho các sự kiện hành vi. Truy vấn theo khu vực/bán kính dùng PostGIS
  (`ST_DWithin` trên cột `geography`), đừng lọc theo tên khu vực dạng chuỗi tự do.
  Chưa nối connector product-analytics ngoài (Amplitude/Pendo); nếu thêm thì đăng
  ký vào `_pm-plugin-CONNECTORS.md`.
- **Múi giờ:** toàn bộ người dùng ở Đà Nẵng. Lưu UTC trong DB, **gom chỉ số theo
  ngày ở `Asia/Ho_Chi_Minh`** (`AT TIME ZONE 'Asia/Ho_Chi_Minh'`), nếu không con
  số "hôm nay" sẽ lệch — đặc biệt với sự kiện buổi tối gần mốc 00:00 UTC (07:00 giờ VN).
- **Quyền riêng tư khi phân tích:** báo cáo ở mức tổng hợp. Không xuất email, số
  điện thoại hay toạ độ chính xác của người dùng ra scorecard; nhóm nhỏ hơn 5
  người thì gộp lại để không định danh ngược.
- **Output:** scorecard + hành động đề xuất; đầu việc rơi vào `DAILY_TASKS.md`
  hoặc `.agent/future-plans/` qua [roadmap-update](../roadmap-update/SKILL.md).

## Cách gọi

```
/metrics-review 
```

## Quy trình

### 1. Thu thập dữ liệu chỉ số

Nếu **~~product analytics** được kết nối:
- Kéo các chỉ số sản phẩm chính cho khoảng thời gian đang xét
- Lấy dữ liệu đối chiếu (kỳ trước, cùng kỳ năm ngoái, mục tiêu)
- Kéo phân rã theo phân khúc (segment) nếu có

Nếu không có công cụ analytics nào được kết nối, đề nghị người dùng cung cấp:
- Các chỉ số và giá trị (dán bảng, ảnh chụp màn hình, hoặc mô tả)
- Dữ liệu đối chiếu (kỳ trước, mục tiêu)
- Bối cảnh về các thay đổi gần đây (ra mắt tính năng, sự cố, tính mùa vụ)

Hỏi người dùng:
- Rà soát khoảng thời gian nào? (tuần trước, tháng trước, quý trước)
- Tập trung vào chỉ số nào? Hay rà soát toàn bộ bộ chỉ số sản phẩm?
- Có mục tiêu cụ thể nào để đối chiếu không?
- Có sự kiện đã biết nào giải thích được biến động không (ra mắt, downtime, chiến dịch marketing, mùa cao điểm du lịch Đà Nẵng)?

### 2. Sắp xếp các chỉ số

Cấu trúc phần rà soát theo phân tầng chỉ số: North Star ở trên cùng, chỉ số sức khoẻ L1 (thu hút, kích hoạt, gắn kết, giữ chân, doanh thu, mức độ hài lòng), và chỉ số chẩn đoán L2 để đào sâu. Xem **Phân tầng chỉ số sản phẩm** bên dưới để có định nghĩa đầy đủ.

Nếu người dùng chưa định nghĩa phân tầng chỉ số của họ, giúp họ xác định North Star và các chỉ số L1 chính trước khi đi tiếp.

### 3. Phân tích xu hướng

Với mỗi chỉ số chính:
- **Giá trị hiện tại**: hôm nay chỉ số đang ở mức nào?
- **Xu hướng**: tăng, giảm hay đi ngang so với kỳ trước? Trên khung thời gian nào?
- **So với mục tiêu**: cách mục tiêu bao xa?
- **Tốc độ thay đổi**: xu hướng đang tăng tốc hay chậm lại?
- **Bất thường**: có cú nhảy, tăng vọt hay tụt đột ngột nào không?

Tìm tương quan:
- Biến động của chỉ số này có đi cùng biến động của chỉ số kia không?
- Có chỉ số dẫn dắt (leading) nào dự báo được chỉ số theo sau (lagging) không?
- Phân rã theo phân khúc có cho thấy xu hướng tổng thể thực ra do một nhóm nhỏ chi phối không? (ví dụ: toàn bộ mức tăng RSVP chỉ đến từ khu An Thượng)

### 4. Tạo bản rà soát

#### Tóm tắt
2-3 câu: sức khoẻ tổng thể của sản phẩm, thay đổi đáng chú ý nhất, điểm cần nhấn.

#### Scorecard chỉ số
Dạng bảng để quét nhanh:

| Chỉ số | Hiện tại | Kỳ trước | Thay đổi | Mục tiêu | Trạng thái |
|--------|---------|----------|--------|--------|--------|
| [Chỉ số] | [Giá trị] | [Giá trị] | [+/- %] | [Mục tiêu] | [Đúng hướng / Có rủi ro / Trượt] |

#### Phân tích xu hướng
Với mỗi chỉ số đáng bàn:
- Chuyện gì đã xảy ra và mức độ đáng kể của thay đổi
- Vì sao nhiều khả năng nó xảy ra (quy nguyên nhân dựa trên sự kiện đã biết, chỉ số tương quan, phân tích phân khúc)
- Đây là biến động nhất thời hay xu hướng kéo dài

#### Điểm sáng
Cái gì đang chạy tốt:
- Chỉ số vượt mục tiêu
- Xu hướng tích cực cần duy trì
- Phân khúc, khu vực hoặc tính năng đang cho kết quả mạnh

#### Điểm đáng lo
Cái gì cần chú ý:
- Chỉ số trượt mục tiêu hoặc đang xấu đi
- Tín hiệu cảnh báo sớm trước khi thành vấn đề lớn
- Chỗ chúng ta chưa nhìn thấy hoặc chưa hiểu được số liệu

#### Hành động đề xuất
Bước tiếp theo cụ thể, dựa trên phân tích:
- Việc cần điều tra thêm (đào sâu một xu hướng đáng lo)
- Thử nghiệm cần chạy (kiểm chứng giả thuyết về cách cải thiện chỉ số)
- Chỗ cần đầu tư thêm (nhân đôi thứ đang hiệu quả)
- Cảnh báo cần đặt (theo dõi một chỉ số sát hơn)

#### Bối cảnh và lưu ý
- Vấn đề chất lượng dữ liệu đã biết
- Sự kiện làm số liệu khó so sánh (sự cố, ngày lễ, mưa bão Đà Nẵng, đợt ra mắt)
- Chỉ số lẽ ra nên đo nhưng chưa đo được

### 5. Việc tiếp theo

Sau khi tạo bản rà soát:
- Hỏi xem chỉ số nào cần điều tra sâu hơn
- Đề nghị viết spec cho một dashboard theo dõi thường xuyên
- Đề nghị soạn đề xuất thử nghiệm cho các điểm đáng lo
- Đề nghị dựng một template rà soát chỉ số để dùng lặp lại

## Phân tầng chỉ số sản phẩm

### North Star Metric
Chỉ số duy nhất phản ánh rõ nhất giá trị cốt lõi mà sản phẩm mang lại cho người dùng. Nó phải:

- **Gắn với giá trị**: dịch chuyển khi người dùng nhận được nhiều giá trị hơn
- **Dẫn dắt**: dự báo được thành công dài hạn (doanh thu, giữ chân)
- **Có thể tác động**: đội sản phẩm ảnh hưởng được bằng công việc của mình
- **Dễ hiểu**: ai trong đội cũng hiểu nó nghĩa là gì và vì sao quan trọng

**Ví dụ theo loại sản phẩm**:
- Công cụ cộng tác: số nhóm hoạt động hằng tuần có từ 3 thành viên đóng góp trở lên
- Marketplace: số giao dịch hoàn tất mỗi tuần
- Nền tảng SaaS: số người dùng hoạt động hằng tuần hoàn tất luồng chính
- Nền tảng nội dung: thời lượng đọc/xem có tương tác mỗi tuần
- Công cụ cho lập trình viên: số lần deploy mỗi tuần thông qua công cụ
- **Da Nang Connect (đề xuất)**: số lượt tham dự sự kiện thực tế mỗi tuần (RSVP `going` có check-in) — đo cả nguồn cung, nguồn cầu lẫn niềm tin trong một con số

### Chỉ số L1 (chỉ báo sức khoẻ)
5-7 chỉ số cùng nhau vẽ nên bức tranh đầy đủ về sức khoẻ sản phẩm. Chúng bám theo các giai đoạn trong vòng đời người dùng:

**Thu hút (Acquisition)**: người dùng mới có tìm thấy sản phẩm không?
- Số tài khoản đăng ký mới (khối lượng và xu hướng)
- Tỷ lệ chuyển đổi đăng ký (khách truy cập thành người đăng ký)
- Cơ cấu kênh (người dùng mới đến từ đâu — Facebook Group, truyền miệng, coworking space)
- Chi phí trên mỗi người dùng (với kênh trả phí)

**Kích hoạt (Activation)**: người dùng mới có chạm tới khoảnh khắc giá trị không?
- Tỷ lệ kích hoạt: % người dùng mới hoàn tất hành động dự báo được việc giữ chân (với sản phẩm này: RSVP sự kiện đầu tiên)
- Thời gian tới lúc kích hoạt: từ đăng ký tới lúc kích hoạt mất bao lâu
- Tỷ lệ hoàn tất thiết lập: % người hoàn tất các bước onboarding (chọn khu vực, chọn sở thích)
- Khoảnh khắc giá trị đầu tiên: lúc người dùng lần đầu cảm nhận giá trị cốt lõi

**Gắn kết (Engagement)**: người dùng đang hoạt động có nhận được giá trị không?
- DAU / WAU / MAU: người dùng hoạt động ở các khung thời gian khác nhau
- Tỷ lệ DAU/MAU (độ dính): bao nhiêu phần người dùng tháng quay lại hằng ngày
- Tần suất hành động cốt lõi: người dùng xem/RSVP/tạo sự kiện thường xuyên ra sao
- Độ sâu phiên: mỗi phiên người dùng làm được bao nhiêu việc
- Mức độ dùng tính năng: % người dùng dùng các tính năng chính (lọc theo khu vực, bản đồ, waitlist)

**Giữ chân (Retention)**: người dùng có quay lại không?
- Retention D1, D7, D30: % người dùng quay lại sau 1, 7, 30 ngày
- Đường cong retention theo cohort: retention thay đổi ra sao với từng cohort đăng ký
- Tỷ lệ rời bỏ (churn): % người dùng hoặc doanh thu mất đi mỗi kỳ
- Tỷ lệ hồi sinh: % người đã rời bỏ quay lại

**Kiếm tiền (Monetization)**: giá trị có chuyển thành doanh thu không?
- Tỷ lệ chuyển đổi: miễn phí sang trả phí (mô hình freemium — bộ lọc nâng cao)
- MRR / ARR: doanh thu định kỳ theo tháng hoặc năm
- ARPU / ARPA: doanh thu bình quân trên mỗi người dùng hoặc mỗi tài khoản
- Doanh thu mở rộng: tăng trưởng doanh thu từ khách hàng hiện hữu
- Net revenue retention: giữ chân doanh thu tính cả mở rộng và thu hẹp

**Mức độ hài lòng (Satisfaction)**: người dùng cảm thấy thế nào về sản phẩm?
- NPS: Net Promoter Score
- CSAT: điểm hài lòng của người dùng
- Số lượng yêu cầu hỗ trợ và thời gian xử lý
- Điểm đánh giá trên App Store / Play Store và sắc thái review

### Chỉ số L2 (chẩn đoán)
Chỉ số chi tiết dùng để điều tra biến động của chỉ số L1:

- Tỷ lệ chuyển đổi ở từng bước phễu
- Mức độ sử dụng và độ phủ ở cấp tính năng
- Phân rã theo phân khúc (theo khu vực, loại sự kiện, trust level, thời gian ở Đà Nẵng, vai trò organizer / người tham dự)
- Chỉ số hiệu năng (thời gian tải trang, tỷ lệ lỗi, độ trễ API)
- Gắn kết theo từng loại nội dung (loại sự kiện, khu vực nào kéo tương tác nhiều nhất)

## Các chỉ số sản phẩm thường dùng

### DAU / WAU / MAU
**Đo cái gì**: số người dùng duy nhất thực hiện một hành động đủ điều kiện trong một ngày, một tuần hoặc một tháng.

**Quyết định then chốt**:
- Thế nào là "hoạt động"? Đăng nhập? Xem trang? Một hành động cốt lõi? Định nghĩa cho kỹ — định nghĩa khác nhau kể câu chuyện khác nhau.
- Khung thời gian nào quan trọng nhất? DAU cho sản phẩm dùng hằng ngày (nhắn tin, email). WAU cho sản phẩm dùng hằng tuần (quản lý dự án, và nền tảng này — expat lướt xem sự kiện khoảng một lần mỗi tuần). MAU cho sản phẩm dùng thưa hơn (phần mềm khai thuế, dịch vụ chuyển nơi ở).

**Dùng thế nào**:
- Tỷ lệ DAU/MAU (độ dính): trên 0,5 là đã thành thói quen hằng ngày. Dưới 0,2 nghĩa là dùng thưa thớt.
- Xu hướng quan trọng hơn con số tuyệt đối. Mức sử dụng đang tăng, đi ngang hay giảm?
- Tách theo nhóm người dùng. Organizer và người chỉ đi tham dự hành xử rất khác nhau.

### Retention
**Đo cái gì**: trong số người dùng bắt đầu ở kỳ X, bao nhiêu % còn hoạt động ở kỳ Y?

**Các mốc retention thường dùng**:
- D1 (hôm sau): trải nghiệm đầu tiên có đủ tốt để họ quay lại không?
- D7 (một tuần): người dùng đã hình thành thói quen chưa?
- D30 (một tháng): người dùng có được giữ lại dài hạn không?
- D90 (ba tháng): đây có phải người dùng bền không? (với cộng đồng expat, D90 còn phản ánh cả việc họ còn ở Đà Nẵng hay đã rời đi)

**Dùng retention thế nào**:
- Vẽ đường cong retention theo cohort. Chú ý: tụt mạnh ngay đầu (vấn đề kích hoạt), giảm đều (vấn đề gắn kết), hoặc phẳng dần (tốt — đã có tệp người dùng ổn định).
- So sánh các cohort theo thời gian. Cohort mới có giữ chân tốt hơn cohort cũ không? Nếu có, tức là các cải tiến sản phẩm đang phát huy tác dụng.
- Tách retention theo hành vi kích hoạt: người đã RSVP sự kiện đầu tiên so với người chưa; người đã tham dự thật so với người no-show.

### Chuyển đổi (Conversion)
**Đo cái gì**: % người dùng đi từ bước này sang bước tiếp theo.

**Các phễu chuyển đổi thường gặp**:
- Khách truy cập thành người đăng ký
- Đăng ký thành kích hoạt (khoảnh khắc giá trị chính)
- Xem chi tiết sự kiện thành RSVP
- RSVP thành check-in thực tế (mặt trái của phễu này chính là no-show)
- Người tham dự thành organizer (lần đầu tự tạo sự kiện)
- Sự kiện do đội curate thành listing được organizer gốc nhận về tự quản lý (curate → self-serve)

**Dùng chuyển đổi thế nào**:
- Vẽ toàn bộ phễu và đo chuyển đổi ở từng bước
- Tìm điểm rơi lớn nhất — đó là chỗ cải thiện có đòn bẩy cao nhất
- Tách chuyển đổi theo nguồn, theo khu vực, theo loại sự kiện. Các phân khúc chuyển đổi rất khác nhau.
- Theo dõi chuyển đổi theo thời gian. Nó có tốt lên khi ta lặp lại và cải tiến trải nghiệm không?

### Kích hoạt (Activation)
**Đo cái gì**: % người dùng mới chạm tới khoảnh khắc lần đầu cảm nhận giá trị cốt lõi của sản phẩm.

**Định nghĩa kích hoạt**:
- Nhìn vào người được giữ lại so với người rời bỏ. Người ở lại đã làm gì mà người rời bỏ không làm?
- Sự kiện kích hoạt phải dự báo mạnh cho việc giữ chân dài hạn
- Nó phải đạt được ngay trong phiên đầu hoặc vài ngày đầu
- Ví dụ cho sản phẩm này: RSVP sự kiện đầu tiên, tham dự thật một sự kiện, tạo sự kiện đầu tiên, hoặc lưu bộ lọc theo khu vực mình đang ở

**Dùng kích hoạt thế nào**:
- Theo dõi tỷ lệ kích hoạt cho từng cohort đăng ký
- Đo thời gian tới lúc kích hoạt — nhanh hơn gần như luôn tốt hơn
- Thiết kế onboarding dẫn người dùng tới khoảnh khắc kích hoạt
- A/B test luồng kích hoạt và đo tác động lên retention, không chỉ lên tỷ lệ kích hoạt

## Khung thiết lập mục tiêu

### OKR (Objectives and Key Results)

**Objective**: mục tiêu định tính, mang tính khát vọng, mô tả điều bạn muốn đạt được.
- Truyền cảm hứng và dễ nhớ
- Có mốc thời gian (theo quý hoặc theo năm)
- Chỉ hướng, không gắn chỉ số cụ thể

**Key Result**: thước đo định lượng cho biết bạn có đạt objective hay không.
- Cụ thể và đo được
- Có mốc thời gian và mục tiêu rõ ràng
- Dựa trên kết quả, không dựa trên khối lượng công việc
- 2-4 Key Result cho mỗi Objective

**Ví dụ**:
```
Objective: Make Da Nang Connect the first place expats check for what is on this week

Key Results:
- Grow weekly published events from 12 to 40
- Increase detail-view to RSVP rate from 18% to 30%
- Cut no-show rate from 45% to below 25%
- Reach 15 active organizers who created an event in the last 28 days
```

### Thực hành tốt với OKR
- Đặt OKR tham vọng nhưng khả thi. Với OKR kiểu stretch, hoàn thành 70% là mức mục tiêu.
- Key Result phải đo kết quả (hành vi người dùng, kết quả kinh doanh), không đo đầu ra công việc (số tính năng ship, số task xong).
- Đừng đặt quá nhiều OKR. 2-3 objective, mỗi cái 2-4 KR là đủ.
- OKR nên khiến bạn thấy hơi khó chịu. Nếu bạn chắc chắn đạt hết thì nó chưa đủ tham vọng.
- Rà lại OKR giữa kỳ. Điều chỉnh phân bổ công sức nếu có KR đang trượt rõ rệt.
- Chấm điểm OKR trung thực vào cuối kỳ. 0,0-0,3 = trượt, 0,4-0,6 = có tiến triển, 0,7-1,0 = đạt.

### Đặt mục tiêu cho từng chỉ số
- **Đường cơ sở (baseline)**: hiện tại đang ở mức nào? Cần một baseline đáng tin trước khi đặt mục tiêu.
- **Chuẩn tham chiếu (benchmark)**: các sản phẩm tương đương đạt mức nào? Benchmark ngành cho ta bối cảnh.
- **Quỹ đạo**: xu hướng hiện tại ra sao? Nếu chỉ số vốn đã tăng 5%/tháng thì mục tiêu 6% không phải là tham vọng.
- **Nguồn lực**: bạn đầu tư bao nhiêu vào việc này? Cược lớn thì mục tiêu cũng phải lớn tương xứng.
- **Mức tự tin**: bạn tự tin đến đâu vào việc đạt mục tiêu? Đặt một mức "cam kết" (tự tin cao) và một mức "stretch" (tham vọng).

## Nhịp rà soát chỉ số

### Kiểm tra chỉ số hằng tuần
**Mục đích**: phát hiện vấn đề sớm, theo dõi thử nghiệm, giữ cảm nhận về sức khoẻ sản phẩm.
**Thời lượng**: 15-30 phút.
**Thành phần**: quản lý sản phẩm, có thể thêm trưởng nhóm kỹ thuật.

**Rà soát cái gì**:
- North Star: giá trị hiện tại, thay đổi so với tuần trước
- Các chỉ số L1 chính: có biến động đáng chú ý nào không
- Thử nghiệm đang chạy: kết quả và ý nghĩa thống kê
- Bất thường: có cú tăng vọt hoặc tụt bất ngờ nào không
- Cảnh báo: có cảnh báo giám sát nào đã kích hoạt không

**Hành động**: nếu có gì bất ổn thì điều tra. Nếu không, ghi nhận và đi tiếp.

### Rà soát chỉ số hằng tháng
**Mục đích**: phân tích xu hướng sâu hơn, tiến độ so với mục tiêu, hàm ý chiến lược.
**Thời lượng**: 30-60 phút.
**Thành phần**: đội sản phẩm, các bên liên quan chính.

**Rà soát cái gì**:
- Scorecard L1 đầy đủ với xu hướng so với tháng trước
- Tiến độ so với mục tiêu OKR của quý
- Phân tích cohort: cohort mới có tốt hơn cohort cũ không?
- Mức độ dùng tính năng: các tính năng mới ra mắt đang chạy thế nào?
- Phân tích phân khúc: có sự phân hoá nào giữa các nhóm người dùng hoặc giữa các khu vực không?

**Hành động**: chọn 1-3 chỗ để điều tra hoặc đầu tư. Cập nhật thứ tự ưu tiên nếu số liệu hé lộ thông tin mới.

### Rà soát kinh doanh hằng quý
**Mục đích**: đánh giá chiến lược về kết quả sản phẩm, đặt mục tiêu cho quý tới.
**Thời lượng**: 60-90 phút.
**Thành phần**: sản phẩm, kỹ thuật, thiết kế, ban lãnh đạo.

**Rà soát cái gì**:
- Chấm điểm OKR của quý
- Phân tích xu hướng toàn bộ chỉ số L1 trong quý
- So sánh cùng kỳ năm trước
- Bối cảnh cạnh tranh: thay đổi thị trường và động thái của đối thủ (Meetup, Facebook Groups, Luma)
- Cái gì hiệu quả và cái gì không

**Hành động**: đặt OKR cho quý tới. Điều chỉnh chiến lược sản phẩm dựa trên những gì dữ liệu cho thấy.

## Nguyên tắc thiết kế dashboard

### Dashboard sản phẩm hiệu quả
Một dashboard tốt trả lời được câu hỏi "sản phẩm đang chạy thế nào?" chỉ trong một cái liếc.

**Nguyên tắc**:

1. **Bắt đầu từ câu hỏi, không phải từ dữ liệu**. Dashboard này phục vụ quyết định nào? Thiết kế ngược từ quyết định đó.

2. **Phân tầng thông tin**. Chỉ số quan trọng nhất phải nổi bật nhất về mặt thị giác. North Star ở trên cùng, chỉ số L1 tiếp theo, chỉ số L2 để ở lớp drill-down.

3. **Bối cảnh quan trọng hơn con số**. Một con số không có bối cảnh là vô nghĩa. Luôn hiển thị: giá trị hiện tại, mốc đối chiếu (kỳ trước, mục tiêu, benchmark), hướng xu hướng.

4. **Ít chỉ số hơn, hiểu biết nhiều hơn**. Dashboard 50 chỉ số không giúp được ai. Tập trung 5-10 chỉ số thực sự quan trọng. Phần còn lại đưa vào báo cáo chi tiết.

5. **Khung thời gian nhất quán**. Dùng cùng một khung thời gian cho mọi chỉ số trên dashboard. Trộn chỉ số theo ngày với theo tháng gây rối.

6. **Chỉ báo trạng thái bằng màu**. Dùng màu để thấy sức khoẻ ngay lập tức:
   - Xanh lá: đúng hướng hoặc đang cải thiện
   - Vàng: cần chú ý hoặc đi ngang
   - Đỏ: lệch hướng hoặc đang xấu đi

7. **Tính hành động được**. Mọi chỉ số trên dashboard phải là thứ đội ngũ tác động được. Nếu không hành động được thì nó không thuộc về dashboard sản phẩm.

### Bố cục dashboard

**Hàng trên cùng**: North Star kèm đường xu hướng và mục tiêu.

**Hàng thứ hai**: scorecard chỉ số L1 — giá trị hiện tại, thay đổi, mục tiêu, trạng thái cho từng chỉ số chính.

**Hàng thứ ba**: các phễu chính — phễu trực quan cho thấy điểm rơi ở từng bước (xem chi tiết → RSVP → check-in).

**Hàng thứ tư**: thử nghiệm và đợt ra mắt gần đây — A/B test đang chạy, tính năng mới kèm số liệu ban đầu.

**Dưới cùng / drill-down**: chỉ số L2, phân rã theo phân khúc và khu vực, chuỗi thời gian chi tiết để điều tra.

### Những kiểu dashboard nên tránh
- **Chỉ số phù phiếm**: chỉ số chỉ có tăng nhưng không nói lên sức khoẻ (tổng số đăng ký từ trước tới nay, tổng lượt xem trang)
- **Quá nhiều chỉ số**: dashboard phải cuộn mới xem hết. Không vừa một màn hình thì cắt bớt chỉ số.
- **Không có đối chiếu**: con số trần trụi không có kỳ trước hay mục tiêu
- **Dashboard ôi thiu**: chỉ số nhiều tháng không được cập nhật hay nhìn tới
- **Dashboard đo đầu ra**: đo hoạt động của đội (số ticket đóng, số PR merge) thay vì kết quả với người dùng và kinh doanh
- **Một dashboard cho mọi đối tượng**: lãnh đạo, PM và kỹ sư cần các góc nhìn khác nhau. Không có cỡ nào vừa cho tất cả.

### Cảnh báo
Đặt cảnh báo cho những chỉ số cần xử lý ngay:

- **Cảnh báo ngưỡng**: chỉ số vượt hoặc tụt qua một ngưỡng nguy hiểm (tỷ lệ lỗi > 1%, tỷ lệ RSVP < 5%, tỷ lệ gửi Expo Push thất bại > 10%)
- **Cảnh báo xu hướng**: chỉ số giảm liên tục nhiều ngày/nhiều tuần
- **Cảnh báo bất thường**: chỉ số lệch đáng kể khỏi khoảng kỳ vọng

**Vệ sinh cảnh báo**:
- Mọi cảnh báo phải hành động được. Nếu không làm gì được thì đừng đặt cảnh báo.
- Rà và tinh chỉnh cảnh báo định kỳ. Quá nhiều báo động giả thì người ta bỏ qua tất cả.
- Mỗi cảnh báo phải có người chịu trách nhiệm. Ai xử lý khi nó kêu?
- Đặt mức độ nghiêm trọng phù hợp. Không phải chuyện gì cũng là P0.

## Định dạng đầu ra

Dùng bảng cho scorecard. Dùng nhãn trạng thái rõ ràng. Giữ phần tóm tắt thật gọn — người đọc phải nắm được câu chuyện cốt lõi trong 30 giây.

## Mẹo

- Bắt đầu bằng "vậy thì sao" — điều quan trọng nhất trong bản rà soát này là gì? Nói nó trước tiên.
- Con số tuyệt đối không kèm bối cảnh thì vô dụng. Luôn có đối chiếu (so với kỳ trước, so với mục tiêu, so với benchmark).
- Cẩn thận khi quy nguyên nhân. Tương quan không phải nhân quả. Nếu một chỉ số dịch chuyển, hãy thừa nhận phần chưa chắc chắn về lý do.
- Phân tích phân khúc thường hé lộ rằng một chỉ số tổng thể đang che giấu khác biệt quan trọng. Con số đi ngang có thể đang giấu một khu vực tăng và một khu vực giảm.
- Không phải biến động nào cũng đáng bận tâm. Dao động nhỏ là nhiễu. Tập trung vào thay đổi có ý nghĩa.
- Nếu một chỉ số trượt mục tiêu, đừng chỉ báo cáo là trượt — hãy đề xuất phải làm gì.
- Rà soát chỉ số phải dẫn tới quyết định. Nếu buổi rà soát không dẫn tới ít nhất một hành động thì nó vô ích.
