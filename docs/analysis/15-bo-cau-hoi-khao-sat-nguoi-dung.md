# Da Nang Connect — Bộ câu hỏi khảo sát người dùng

- **Mục đích**: hiểu người dùng muốn trải nghiệm gì và đang gặp vấn đề gì với những việc app sẽ giải quyết, để thiết kế đúng trước khi xây
- **Dựa trên**: tài liệu phân tích `docs/analysis/14-stakeholder-flow-kiem-duyet-va-swipe-ui.md`, bảng giả định GD-01 → GD-12 (`02-use-case.md` §13.2), năm phân khúc S1–S5 (`07-go-to-market-da-nang.md` §3)
- **Ngày lập**: 13/09/2026
- **Phiên bản**: 1.0
- **Trạng thái**: sẵn sàng chạy thử (pilot) — ngưỡng quyết định ở mục 12 cần chủ dự án duyệt **trước** khi mở form

---

## 1. Bộ công cụ gồm những gì

Bảy bộ, mỗi bộ cho một nhóm stakeholder. Bộ A là phần sàng lọc đặt ở đầu mọi form online và tự chuyển người trả lời sang đúng bộ.

| Bộ | Đối tượng | Hình thức | Thời lượng | Cỡ mẫu | Ngôn ngữ |
|---|---|---|---|---|---|
| **A** | Mọi người trả lời online | Sàng lọc đầu form | 1 phút | — | EN |
| **B** | Expat: S1 nomad, S2 giáo viên, S3 định cư, S4 Hàn/Nhật/Trung | Form online | 10–12 phút | 150–200 | EN |
| **C** | Expat S1, S2, S3 | Phỏng vấn 1-1 + thử 3 mockup | 40 phút | 12–15 | EN |
| **D** | Organizer nghiệp dư, organizer chuyên nghiệp, venue | Form online + phỏng vấn | 8 phút + 40 phút | 30 form + 10 phỏng vấn | EN / VI |
| **E** | Expert (có chứng chỉ hành nghề) và service provider | Phỏng vấn khám phá | 30 phút | 6–8 | EN / VI |
| **F** | Người Việt nói tiếng Anh (S5) | Form online ngắn | 5 phút | 40–60 | VI |
| **G** | Admin nhóm Facebook/Telegram, người đang kiểm duyệt | Phỏng vấn | 30 phút | 3–5 | EN / VI |

**Vì sao cần cả form lẫn phỏng vấn:** form cho biết *bao nhiêu người* gặp một vấn đề; phỏng vấn cho biết *vì sao* và *họ thực sự làm gì*. Riêng câu hỏi về UI swipe chỉ trả lời được bằng quan sát người dùng thao tác trên mockup (bộ C mục 7.7) — hỏi "bạn có thích vuốt không" trên form cho câu trả lời không dùng được.

---

## 2. Giả định cần kiểm chứng

Mỗi câu hỏi trong tài liệu gắn với ít nhất một giả định dưới đây. Giả định có mã GD là giả định đã nằm trong canon; mã H là giả định mới rút ra từ tài liệu phân tích 14.

| Mã | Giả định | Nguồn | Quyết định bị ảnh hưởng | Câu hỏi |
|---|---|---|---|---|
| H-01 | Expat phải gom thông tin từ ≥ 3 kênh để tìm hoạt động | Brief | Định vị "điểm tổng hợp duy nhất" | B6, B7 |
| H-02 | "Khó tìm" là vấn đề lớn hơn "thiếu hoạt động" | Brief | Tập trung curate hay tự tạo nguồn cung | B9, B10 |
| GD-01 | Expat sẵn sàng rời nhóm mạng xã hội để dùng app chuyên biệt | 02 §13.2 | Toàn bộ sản phẩm | B30, C mục 7.3 |
| GD-04 | Lọc theo khu vực là lý do chuyển đổi số 1 | 02 §13.2 | Đầu tư PostGIS và bản đồ | B12, B15 |
| GD-08 | 6 khu vực MVP phủ đủ nơi expat sống và sinh hoạt | 02 §13.2 | Danh sách khu vực trong bộ lọc | B3, B4 |
| H-03 | Nhu cầu tức thời ("chiều nay", "tối nay") đủ lớn | Brief | Có kéo tính năng ad-hoc lên sớm không | B8 |
| GD-03 | Tín hiệu tin cậy đủ để người lạ dám gặp nhau | 02 §13.2 | Tín hiệu nào hiện trên thẻ sự kiện | B17, B18, B19 |
| H-04 | Bắt xác thực số điện thoại sẽ làm mất người dùng | 14 · QĐ-8 | OTP bắt buộc hay tuỳ chọn | B20, B21 |
| H-05 | Ẩn địa chỉ chính xác tới khi RSVP được chấp nhận | 14 · QĐ-11 | Phạm vi ẩn địa chỉ | B22 |
| H-06 | Người dùng chịu được độ trễ duyệt bài để đổi lấy feed sạch | 14 · chương 6 | Duyệt trước hay duyệt sau | B25 |
| H-07 | Loại nội dung người dùng thấy khó chịu nhất khớp bảng vi phạm | 14 · chương 5 | Thứ tự ưu tiên bộ lọc tự động | B24, G mục 11 |
| H-08 | Người dùng thích so sánh và tra lại hơn là quyết định từng thẻ một | 14 · chương 7–8 | Swipe trong dòng hay swipe deck | B14, B15, B16, C mục 7.7 |
| GD-07 | Giao diện mặc định tiếng Anh là chấp nhận được | 02 §13.2 | Tự nhận ngôn ngữ thiết bị | B27 |
| GD-06 | Nhắc T-24h và T-2h đủ giảm vắng mặt | 02 §13.2 | Số mốc nhắc | B28, B29 |
| H-09 | Người dùng đang trả tiền cho việc kết nối — có chỗ cho freemium | Brief | Mô hình kiếm tiền | B31 |
| H-10 | Thứ tự mở rộng GĐ2 nhà ở rồi GĐ3 y tế là đúng | Brief | Roadmap sau GĐ1 | B32 |
| GD-10 | Organizer chấp nhận tự thu tiền ngoài app ở GĐ1 | 02 §13.2 | Làm thanh toán sớm hay không | D12 |
| GD-09 | Organizer gốc phản ứng tích cực khi được mời nhận listing đã curate | 02 §13.2 | Đăng trước rồi mời, hay xin phép trước | D14, D15 |
| H-11 | Expert chấp nhận nộp chứng chỉ để được huy hiệu năng lực riêng | 14 · QĐ-5 | Thiết kế trục `credential_level` | E mục 9 |
| S5-cap | Trần 40% người Việt ở sự kiện trao đổi ngôn ngữ là chấp nhận được | 07 §3.3 | Giữ hay bỏ trần | F6 |

---

## 3. Nguyên tắc đặt câu hỏi

Các nguyên tắc này giải thích vì sao câu hỏi được viết như bên dưới. Người sửa bộ câu hỏi sau này phải giữ chúng.

1. **Hỏi việc đã xảy ra, không hỏi dự đoán.** "Lần gần nhất bạn tìm việc gì đó để làm…" cho dữ liệu thật. "Bạn có dùng app như vậy không?" cho câu trả lời lịch sự và vô dụng.
2. **Không nhắc tới giải pháp trước khi hỏi xong vấn đề.** Phần hành vi và vấn đề (B1–B11) không nói gì về app. Khái niệm app chỉ xuất hiện từ B14.
3. **Không gọi tên "kiểu Tinder".** Câu B15 mô tả trung tính bốn cách duyệt và xáo thứ tự; nêu tên một app nổi tiếng làm người trả lời chọn theo cảm tình với app đó.
4. **Không hỏi "bạn có sẵn sàng trả tiền không".** Hỏi hiện đang trả tiền cho cái gì (B31). Sẵn sàng trả phí thật chỉ đo được bằng thử nghiệm freemium ở sprint S12.
5. **Thứ tự: hành vi → vấn đề → nhu cầu → khái niệm → thông tin nhạy cảm.** Câu về trải nghiệm không an toàn (B19) để tuỳ chọn và có "Prefer not to say".
6. **Tiếng Anh đơn giản.** Câu ≤ 20 từ, không thành ngữ; phần lớn expat tại Đà Nẵng không nói tiếng Anh bản ngữ. Tên khu vực viết không dấu ("An Thuong") theo đúng quy ước locale `en` của sản phẩm.
7. **Mỗi câu có mức ưu tiên.** P1 bắt buộc giữ. P2 cắt được nếu pilot cho thấy form dài hơn 12 phút.
8. **Ngưỡng quyết định chốt trước khi mở form** (mục 12). Chốt sau khi thấy số liệu thì luôn tìm được cách diễn giải cho vừa ý mình.

**Ký hiệu trong tài liệu:** ` · ` chọn một · ` · ` chọn nhiều · **Thang 1–5** có nhãn ở hai đầu · dòng *VI* là bản dịch cho đội ngũ, **không** đưa vào form tiếng Anh.

---

## 4. Kế hoạch thực địa

### 4.1. Cỡ mẫu và hạn ngạch

Với 150 người trả lời, sai số tối đa của một tỷ lệ là khoảng ±8 điểm phần trăm (độ tin cậy 95%). Chỉ báo cáo tỷ lệ phần trăm cho phân khúc có **ít nhất 30 người**; phân khúc nhỏ hơn chỉ báo cáo số đếm.

| Phân khúc | Hạn ngạch form B | Phỏng vấn C | Ghi chú |
|---|---|---|---|
| S1 — Remote worker / nomad, 1–6 tháng | 60–80 | 6 | Phân khúc seed duy nhất, cần nhiều nhất |
| S2 — Giáo viên tiếng Anh, 1–3 năm | 30–40 | 4 | Nguồn organizer từ M3 |
| S3 — Expat định cư có gia đình | 30–40 | 3 | Khó tiếp cận qua Facebook, cần kênh trường quốc tế |
| S4 — Cộng đồng Hàn / Nhật / Trung | ≥ 15 | 0 | Chỉ đo được người đọc được tiếng Anh — xem hạn chế ở 12.3 |
| S5 — Người Việt nói tiếng Anh | Form F: 40–60 | 0 | Form riêng, không trộn vào form B |

### 4.2. Kênh phân phối

| Kênh (mã theo `07`) | Bộ | Cách làm | Quy tắc bắt buộc |
|---|---|---|---|
| CH-01 Nhóm Facebook expat | B, F | Một bài đăng giải thích mục đích nghiên cứu, kèm link | **Xin phép admin trước.** Không đăng lặp, không đăng vào comment người khác |
| CH-02 Coworking An Thượng – Mỹ An | B, C | Standee QR tại quầy, mời phỏng vấn tại chỗ | Được quản lý coworking đồng ý |
| CH-03 Nhóm Telegram/WhatsApp nomad và thể thao | B | Nhờ admin đăng | Chỉ nhóm mà đội đã tham gia thật |
| CH-05 Sự kiện do đội tự tổ chức | B, C, F | Mời điền form cuối buổi, xin hẹn phỏng vấn | Không mời trước khi buổi kết thúc |
| CH-08 Trung tâm ngoại ngữ | B (S2), F | Nhờ quản lý chuyển cho giáo viên và học viên | — |
| CH-09 Trường quốc tế, hội phụ huynh | B (S3) | Qua ban đại diện phụ huynh | Không tiếp cận trẻ vị thành niên |
| Danh sách 20–25 địa điểm khảo sát tuần 0 | D, E | Gặp trực tiếp người quyết định | Dùng lại bảng địa điểm ở `07` §15 |
| Organizer đang đăng sự kiện công khai | D | Nhắn riêng, giới thiệu là nghiên cứu | Không nói là đã đăng lại sự kiện của họ nếu chưa đăng |

### 4.3. Lịch

| Mốc | Ngày | Việc | Đầu ra |
|---|---|---|---|
| Chuẩn bị | 14–15/09 | Dựng form có logic nhảy câu; dựng 3 mockup cho bộ C bằng skill `mockup-builder` | Link form, 3 mockup chạy được trên điện thoại |
| Pilot | 16–17/09 | 5 expat + 2 organizer điền form và nói to suy nghĩ khi điền | Danh sách câu gây hiểu nhầm, thời gian điền thật |
| Sửa | 18/09 | Sửa câu, cắt P2 nếu quá 12 phút, **chủ dự án duyệt ngưỡng mục 12** | Form bản chính thức |
| Thực địa | 19/09 – 04/10 | Mở form, chạy phỏng vấn song song | Dữ liệu thô, bản ghi phỏng vấn |
| Đọc sơ bộ | 29/09 | Chỉ nhóm câu về xác thực và quyền riêng tư (B20–B23) | Kịp đưa vào thiết kế auth trước M1 (02/10) |
| Tổng hợp | 05–09/10 | Phân tích theo phân khúc, mã hoá câu mở, tổng hợp phỏng vấn | Báo cáo kết quả + quyết định theo mục 12 |

### 4.4. Công cụ

- **Form**: Tally hoặc Google Forms — cả hai có logic nhảy câu. Bật xáo thứ tự đáp án cho B15 và B18.
- **Phỏng vấn**: gọi video hoặc gặp trực tiếp; ghi âm **chỉ khi** người được phỏng vấn đồng ý bằng lời ở đầu bản ghi.
- **Lưu ý nơi lưu dữ liệu**: cả Tally và Google Forms lưu dữ liệu ở máy chủ nước ngoài. Đây có thể là chuyển dữ liệu cá nhân ra nước ngoài theo Luật 91/2025/QH15 — **cần luật sư xác nhận** trước khi mở form, cùng nhóm câu hỏi PL-01 và PL-07 đã có trong canon.

### 4.5. Quà cảm ơn

- **Form B, D, F**: không bắt buộc. Nếu có, dùng quà chắc chắn nhận được (voucher cà phê tại coworking đối tác, huy hiệu "Founding member" khi app ra mắt).
- **Phỏng vấn C, D, E, G**: voucher khoảng 100.000–150.000 VND hoặc mời một đồ uống khi gặp trực tiếp.
- **Tránh hình thức bốc thăm trúng thưởng**: khuyến mại mang tính may rủi có thể phải làm thủ tục với cơ quan quản lý — cần kiểm tra trước nếu muốn dùng.

### 4.6. Lời đồng ý đặt ở đầu form (bản dùng thật)

> This survey is run by the Da Nang Connect team. We are building a community app for foreigners living in Da Nang, and we want to build it around real needs. It takes about 10 minutes.
>
> Your answers are anonymous — we do not ask for your name. If you choose to leave contact details for a follow-up interview, they are stored separately from your answers and deleted when the research ends, no later than 12 months from today. You can stop at any time. We use your answers only to design the app. We never sell or share them.
>
> By continuing, you confirm that you are 18 or older and agree to take part.

*VI: Khảo sát do đội Da Nang Connect thực hiện để thiết kế app theo nhu cầu thật. Ẩn danh, không hỏi tên. Thông tin liên hệ (nếu để lại) lưu tách riêng và xoá khi kết thúc nghiên cứu, tối đa 12 tháng. Có thể dừng bất cứ lúc nào. Chỉ dùng để thiết kế app, không bán hay chia sẻ. Tiếp tục nghĩa là xác nhận đủ 18 tuổi và đồng ý tham gia.*

Nội dung thông báo này **cần luật sư rà lại** theo PL-01.

---

## 5. Bộ A — Sàng lọc

Đặt ở đầu mọi form online. Mục tiêu: loại người không thuộc đối tượng (khách du lịch ngắn ngày, người dưới 18 tuổi) và gán phân khúc để chuyển sang đúng bộ.

**A1 · Chọn một · P1**

Do you currently live in or stay in Da Nang?

*VI: Hiện bạn đang sống hoặc lưu trú tại Đà Nẵng?*

- Yes, I live here
- Yes, I am staying here for a while (more than 2 weeks)
- I am visiting for 2 weeks or less → **kết thúc form**
- No → **kết thúc form**

**A2 · Chọn một · P1**

How long have you been in Da Nang this time?

*VI: Lần này bạn đã ở Đà Nẵng bao lâu?*

- Less than 1 month
- 1–3 months
- 3–6 months
- 6–12 months
- 1–3 years
- More than 3 years

**A3 · Chọn một · P1**

How much longer do you plan to stay?

*VI: Bạn dự định ở thêm bao lâu?*

- Less than 1 month
- 1–3 months
- 3–6 months
- 6–12 months
- More than 1 year
- Not sure

**A4 · Chọn một · P1**

What best describes what you do here?

*VI: Điều nào mô tả đúng nhất công việc/hoạt động chính của bạn ở đây?*

- Remote work or freelancing for clients outside Vietnam
- Teaching (English or another subject)
- Working for a company in Vietnam
- Running my own business in Vietnam
- Retired
- Studying
- Travelling without work
- Other: ____

**A5 · Chọn một · P1**

Which region are you from?

*VI: Bạn đến từ khu vực nào?*

- Vietnam → **chuyển sang form F**
- South Korea, Japan, China, Taiwan or Hong Kong
- Other Asia
- Europe
- North America
- Australia or New Zealand
- Africa, Middle East or Latin America
- Prefer not to say

**A6 · Chọn một · P1**

Your age

*VI: Độ tuổi*

- Under 18 → **kết thúc form**
- 18–24
- 25–34
- 35–44
- 45–54
- 55–64
- 65 or older

**A7 · Chọn một · P1**

Do you organize or host activities for other people (events, sports games, language exchange, classes)?

*VI: Bạn có tổ chức hoạt động cho người khác không?*

- Yes, regularly → **sau form B, mời điền thêm form D**
- Sometimes
- No

### 5.1. Quy tắc gán phân khúc

| Phân khúc | Điều kiện |
|---|---|
| S1 | A4 = remote work/freelancing **và** A3 ≤ 6 tháng hoặc "Not sure" |
| S2 | A4 = teaching |
| S3 | A2 ≥ 1 năm **và** A4 ∈ {working for a company, running a business, retired} |
| S4 | A5 = South Korea, Japan, China, Taiwan or Hong Kong (gán chồng lên nhãn S1–S3) |
| S5 | A5 = Vietnam — đi form F |
| Khác | Không khớp dòng nào ở trên — vẫn giữ trong mẫu, báo cáo riêng nhóm "Other" |

---

## 6. Bộ B — Khảo sát expat

Bảy phần, 34 câu, trong đó câu P2 cắt được nếu pilot quá 12 phút. Thời gian mục tiêu 10–12 phút.

### 6.1. Phần I — Hành vi hiện tại

**B1 · Chọn một · P1** — kiểm chứng GD-01

In the past 4 weeks, how many times did you join a social activity with people you did not know before? (events, sports, language exchange, meetups)

*VI: Trong 4 tuần qua, bạn tham gia hoạt động có người lạ bao nhiêu lần?*

- 0
- 1
- 2–3
- 4–7
- 8 or more

**B2 · Chọn nhiều, tối đa 5 · P1** — kiểm chứng phạm vi loại hình GĐ1

Which kinds of activities did you join, or want to join, in Da Nang?

*VI: Bạn đã tham gia hoặc muốn tham gia loại hoạt động nào?*

- [ ] Language exchange
- [ ] Team sports (football, volleyball, basketball)
- [ ] Racket sports (badminton, pickleball, tennis)
- [ ] Running, cycling or hiking
- [ ] Fitness, yoga or martial arts
- [ ] Surfing or other water sports
- [ ] Board games, quiz nights or trivia
- [ ] Bars, nightlife or watching sports
- [ ] Workshops, talks or networking
- [ ] Cooking, culture or local festivals
- [ ] Volunteering
- [ ] Activities for families and kids
- [ ] Other: ____

**B3 · Chọn một · P1** — kiểm chứng GD-08

Which area do you live in?

*VI: Bạn sống ở khu vực nào?*

- An Thuong
- My An (outside An Thuong)
- My Khe beach area
- Son Tra / An Hai
- Hai Chau (city center)
- Ngu Hanh Son (outside My An and An Thuong)
- Thanh Khe
- Lien Chieu
- Cam Le
- Hoi An
- Other: ____

**B4 · Chọn nhiều · P1** — kiểm chứng GD-08

Where do you usually spend your free time?

*VI: Bạn thường dành thời gian rảnh ở khu vực nào?*

Cùng danh sách đáp án với B3.

**B5 · Chọn một · P2** — kiểm chứng bán kính mặc định của bộ lọc

What is the longest you would usually travel to join an activity?

*VI: Bạn thường sẵn sàng di chuyển tối đa bao lâu để tới một hoạt động?*

- Up to 10 minutes
- Up to 20 minutes
- Up to 30 minutes
- More than 30 minutes if the activity is worth it

**B6 · Chọn nhiều · P1** — kiểm chứng H-01

Where did you find out about the activities you joined in the past 3 months?

*VI: Trong 3 tháng qua bạn biết tới các hoạt động mình tham gia qua đâu?*

- [ ] Facebook groups
- [ ] Facebook events or pages
- [ ] Meetup
- [ ] Luma or Eventbrite
- [ ] WhatsApp groups
- [ ] Telegram groups
- [ ] Zalo groups
- [ ] Instagram or TikTok
- [ ] The venue's own page or website
- [ ] Posters or flyers at cafes, gyms or coworking spaces
- [ ] Friends or people I met
- [ ] My coworking space's community
- [ ] Google search
- [ ] Other: ____

**B7 · Chọn một · P1** — kiểm chứng H-01

Think about the last time you looked for something to do with other people. How long did it take from starting to look until you decided?

*VI: Lần gần nhất bạn tìm hoạt động để tham gia, từ lúc bắt đầu tìm tới lúc quyết định mất bao lâu?*

- Less than 5 minutes
- 5–15 minutes
- 15–30 minutes
- More than 30 minutes
- I gave up without finding anything

**B8 · Hai câu nối nhau · P1** — kiểm chứng H-03

In the past month, how often did you want to do something with others at short notice — for example, find a badminton partner for this afternoon?

*VI: Tháng qua, bạn có bao nhiêu lần muốn làm gì đó với người khác ngay trong ngày?*

- Never
- Once
- 2–3 times
- About once a week
- Several times a week

Nếu không chọn "Never" thì hỏi tiếp: *When that happened, did you find someone?*

**Đáp án:** Always · Sometimes · Rarely · Never

### 6.2. Phần II — Vấn đề

**B9 · Thang 1–5 cho từng dòng · P1** — kiểm chứng H-02

When you look for activities in Da Nang, how much of a problem is each of these?

*VI: Khi tìm hoạt động ở Đà Nẵng, mỗi điều sau là vấn đề lớn tới mức nào?*

Thang: 1 = Not a problem · 2 · 3 · 4 · 5 = A big problem · N/A

| Vấn đề (hiển thị bằng tiếng Anh trong form) | Kiểm chứng |
|---|---|
| Information is spread across too many places | H-01 |
| Posts get buried in group feeds | H-01 |
| I can't filter by area, time or type | GD-04 |
| I'm not sure if the activity is still happening | Chất lượng curate |
| I'm not sure if it is English-friendly | GD-07 |
| I don't know who else is going | GD-03 |
| I worry about safety when meeting strangers | GD-03 |
| Activities are full, or there is no info about spots left | Waitlist |
| Too many sales or promo posts disguised as events | H-07 |
| It's hard to find people at my level (sport or language) | Bộ lọc trình độ |

**B10 · Chọn một · P1** — kiểm chứng H-02

Which ONE of those is the biggest problem for you?

*VI: Trong các vấn đề trên, vấn đề nào lớn nhất?*

Hiển thị lại 10 dòng của B9.

**B11 · Câu mở, tuỳ chọn · P1** — ngữ cảnh cho H-02 và H-07

Tell us about the last time an activity in Da Nang disappointed you or went wrong. What happened?

*VI: Kể lại lần gần nhất một hoạt động ở Đà Nẵng làm bạn thất vọng hoặc có chuyện không ổn.*

### 6.3. Phần III — Khám phá và quyết định

**B12 · Chọn đúng 3 · P1** — kiểm chứng GD-04

When you choose an activity, which 3 things matter most?

*VI: Khi chọn hoạt động, 3 điều quan trọng nhất là gì?*

- [ ] Area or distance from me
- [ ] Date and time
- [ ] Type of activity
- [ ] Language spoken
- [ ] Price
- [ ] Who is organizing it
- [ ] How many people are going
- [ ] Photos of the place or past sessions
- [ ] Reviews from past attendees
- [ ] Skill level
- [ ] Group size
- [ ] Whether it is easy to come alone

**B13 · Chọn nhiều, tối đa 4 · P1** — quyết định nội dung thẻ sự kiện (chương 8)

What do you need to see about an activity before you decide to open its details?

*VI: Bạn cần thấy thông tin gì trước khi quyết định mở chi tiết một hoạt động?*

- [ ] Title
- [ ] Photo
- [ ] Day and time
- [ ] Area
- [ ] Distance from me
- [ ] Spots left
- [ ] Faces or names of people going
- [ ] Price, or "free"
- [ ] Language
- [ ] Organizer name and rating

**B14 · Chọn một · P1** — kiểm chứng H-08

Which sentence best describes how you usually decide what to join?

*VI: Câu nào mô tả đúng nhất cách bạn thường quyết định tham gia gì?*

- I look through many options, then compare 2 or 3 before choosing
- I pick the first one that looks good
- I plan my week ahead and save a few options
- I decide on the day, based on my mood
- I mostly go where friends are going

**B15 · Chọn một, xáo thứ tự · P1** — kiểm chứng H-08 và GD-04

Imagine an app showing this week's activities in Da Nang. Which way of browsing would you most likely use?

*VI: Hình dung một app hiển thị hoạt động tuần này ở Đà Nẵng. Bạn nhiều khả năng dùng cách duyệt nào nhất?*

- A list you scroll through and filter by area, time and type
- A map showing activities near you
- One activity at a time on the full screen — you swipe to skip it or save it
- A weekly calendar
- I don't know

Form nên kèm một hình minh hoạ nhỏ, cùng kích thước và cùng mức hoàn thiện cho cả bốn cách. **Không** ghi tên app nào.

**B16 · Hai câu · P1** — kiểm chứng rủi ro "deck phá huỷ thẻ" (chương 7)

Why did you choose that way? (câu mở, tuỳ chọn)

Have you ever skipped or dismissed an activity and later wished you had saved it?

*VI: Bạn đã bao giờ bỏ qua một hoạt động rồi sau đó tiếc vì không lưu lại chưa?*

- Often
- Sometimes
- Rarely
- Never

### 6.4. Phần IV — Tin cậy và an toàn

**B17 · Thang 1–5 · P1** — kiểm chứng GD-03

How comfortable are you joining an activity where you don't know anyone?

*VI: Bạn thoải mái tới mức nào khi tham gia hoạt động không quen ai?*

Thang: 1 = Very uncomfortable · 5 = Very comfortable

**B18 · Chọn đúng 3, xáo thứ tự · P1** — kiểm chứng GD-03, quyết định tín hiệu trên thẻ

Which 3 things would make you most comfortable joining an activity hosted by someone you don't know?

*VI: 3 điều nào làm bạn yên tâm nhất khi tham gia hoạt động do người lạ tổ chức?*

- [ ] The host has verified their phone number
- [ ] The host has verified their ID (checked privately, not shown)
- [ ] The number of activities the host has run before
- [ ] Ratings from people who attended before
- [ ] Seeing who else is going
- [ ] It takes place at a public venue
- [ ] Photos from past sessions
- [ ] The host's profile with a short bio
- [ ] A friend of mine is going
- [ ] It is listed by a venue I know

**B19 · Tuỳ chọn · P2** — kiểm chứng bảng vi phạm chương 5

Have you ever felt unsafe or uncomfortable at a meetup or activity in Da Nang?

*VI: Bạn đã bao giờ thấy không an toàn hoặc khó chịu tại một hoạt động ở Đà Nẵng chưa?*

- Yes
- No
- Prefer not to say

Nếu "Yes" thì hỏi tiếp, chọn nhiều, tuỳ chọn:

**Đáp án:** Unwanted romantic or sexual attention · Someone asked for money or tried to scam me · It turned into a sales pitch · The activity did not exist or was very different · Pressure to drink · Aggressive or discriminatory behavior · Other: ____

**B20 · Mỗi dòng chọn một · P1** — kiểm chứng H-04

To use a community activity app, what would you be willing to verify?

*VI: Để dùng app hoạt động cộng đồng, bạn sẵn sàng xác minh những gì?*

| Hình thức xác minh | Yes, to join activities | Only if I want to host | No |
|---|---|---|---|
| Email | ○ | ○ | ○ |
| Phone number with an SMS code | ○ | ○ | ○ |
| Sign in with Google or Apple | ○ | ○ | ○ |
| Photo of ID or passport, checked privately and never shown | ○ | ○ | ○ |
| A selfie to confirm it's really you | ○ | ○ | ○ |

**B21 · Chọn một · P1** — kiểm chứng H-04 (QĐ-8)

If an app asked for a Vietnamese phone number before you could join an activity, what would you do?

*VI: Nếu app đòi số điện thoại Việt Nam trước khi cho tham gia, bạn sẽ làm gì?*

- Fine — I already have a Vietnamese number
- I would use it only if my foreign number or eSIM also works
- I would probably stop using the app

**B22 · Chọn một · P1** — kiểm chứng H-05 (QĐ-11)

Some hosts share the exact address only after your spot is confirmed. Before that, you see the area only. How do you feel about this?

*VI: Một số host chỉ gửi địa chỉ chính xác sau khi xác nhận chỗ, trước đó chỉ thấy khu vực. Bạn thấy thế nào?*

- Good — it feels safer
- Fine either way
- A bit annoying, but I would still join
- It would stop me from joining

**B23 · Mỗi dòng chọn một · P2** — quyết định quyền riêng tư hồ sơ (chương 4)

Who should be able to see this on your profile?

*VI: Ai được phép thấy các thông tin sau trên hồ sơ của bạn?*

| Thông tin | Everyone on the app | Only people at the same activity | Nobody |
|---|---|---|---|
| Profile photo | ○ | ○ | ○ |
| First name | ○ | ○ | ○ |
| Nationality | ○ | ○ | ○ |
| Activities I attended | ○ | ○ | ○ |
| The area I live in | ○ | ○ | ○ |

### 6.5. Phần V — Nội dung và kiểm duyệt

**B24 · Chọn nhiều · P1** — kiểm chứng H-07

Which of these should NOT be allowed on a community activity app?

*VI: Những nội dung nào KHÔNG nên được phép trên app hoạt động cộng đồng?*

- [ ] Sales or promotion posts disguised as community events
- [ ] "Business opportunity" or MLM meetings
- [ ] Events mainly for dating or hookups
- [ ] Events built around heavy drinking games
- [ ] Paid tours by unlicensed guides
- [ ] Job offers that ask for a fee
- [ ] Businesses (gyms, bars, restaurants) promoting their own events
- [ ] Ticket reselling
- [ ] Political discussion events
- [ ] Religious gatherings
- [ ] None of these should be banned

Ghi chú cho đội: hai dòng cuối là vùng xám pháp lý (chương 5 §2.5). Kết quả câu này **chỉ dùng để hiểu kỳ vọng người dùng**, không thay thế ý kiến luật sư.

**B25 · Chọn một · P1** — kiểm chứng H-06

Some apps check new posts before they go public to keep out spam and scams. How long a wait would be OK when you post an activity?

*VI: Một số app duyệt bài trước khi hiển thị để chặn spam và lừa đảo. Bạn chấp nhận chờ bao lâu khi đăng hoạt động?*

- No wait — it should go live immediately
- Up to 1 hour
- Up to 6 hours
- Up to 24 hours
- Any wait is fine if it keeps the app clean
- I don't plan to post activities

**B26 · Chọn một · P2** — kiểm chứng giả định người dùng sẽ báo cáo (chương 6)

If you saw a scam or harassment on the app, what would you most likely do first?

*VI: Nếu thấy lừa đảo hoặc quấy rối trên app, việc đầu tiên bạn làm là gì?*

- Report it with the button in the app
- Message the app team directly
- Warn others in a public comment
- Ignore it
- Stop using the app

### 6.6. Phần VI — Ngôn ngữ, cam kết, nhắc lịch

**B27 · Chọn một · P1** — kiểm chứng GD-07

Which language would you prefer the app to be in?

*VI: Bạn muốn app hiển thị bằng ngôn ngữ nào?*

- English
- Vietnamese
- Korean
- Japanese
- Chinese
- Other: ____

**B28 · Hai câu nối nhau · P1** — kiểm chứng GD-06

In the past 3 months, how many times did you say you would go to an activity and then didn't go?

*VI: 3 tháng qua, bao nhiêu lần bạn đã nhận lời tham gia rồi không đi?*

- Never
- Once
- 2–3 times
- 4 or more

Nếu không chọn "Never" thì hỏi tiếp, chọn nhiều: *What were the main reasons?*

**Đáp án:** I forgot · My plans changed · Weather · I felt unsure about going alone · It looked less interesting later · Too far · Nobody would notice if I didn't come · Other: ____

**B29 · Chọn nhiều · P2** — kiểm chứng GD-06

Which reminders would you want for an activity you signed up for?

*VI: Bạn muốn được nhắc vào những lúc nào?*

- [ ] The day before
- [ ] 2 hours before
- [ ] 15 minutes before
- [ ] No reminders

### 6.7. Phần VII — Giá trị và nhu cầu mở rộng

**B30 · Chọn một · P1** — kiểm chứng GD-01 (tín hiệu yếu, xem 12.3)

If one app listed community activities in Da Nang with good filters, how would it fit with the groups you use now?

*VI: Nếu có một app liệt kê hoạt động cộng đồng ở Đà Nẵng với bộ lọc tốt, nó sẽ đứng ở đâu so với các nhóm bạn đang dùng?*

- I would use it instead of groups for finding activities
- I would use both
- I would still mainly use groups
- I would not use it

**B31 · Chọn nhiều · P2** — kiểm chứng H-09

Which of these do you currently pay for?

*VI: Hiện bạn đang trả tiền cho những thứ nào?*

- [ ] Tickets or entry fees for social events
- [ ] Coworking membership (partly for the community)
- [ ] Gym, club or class membership
- [ ] Meetup membership or organizer fees
- [ ] A dating or friend-finding app subscription
- [ ] None of these

**B32 · Xếp hạng 3 mục đầu · P1** — kiểm chứng H-10

Beyond activities, what is hardest to find in English in Da Nang? Choose and rank your top 3.

*VI: Ngoài hoạt động, điều gì khó tìm bằng tiếng Anh nhất ở Đà Nẵng? Chọn và xếp hạng 3 mục.*

- Housing or apartments
- Doctors or clinics
- Dentists
- Mental health support
- Legal, visa or paperwork help
- Motorbike or car repair
- Home services (cleaning, repairs)
- Schools or childcare
- Vietnamese language classes
- Pet care

**B33 · Câu mở, tuỳ chọn · P2**

Is there anything else you want to tell us about finding activities or meeting people in Da Nang?

**B34 · Tuỳ chọn · P1** — tuyển người cho bộ C

Would you do a 40-minute conversation with us (online or over coffee)? If yes, leave an email, WhatsApp or Telegram. This is stored separately from your answers.

---

## 7. Bộ C — Phỏng vấn sâu expat

**Thời lượng**: 40 phút. **Người phỏng vấn**: một người hỏi, một người ghi (nếu có). **Chọn người**: lấy từ B34, ưu tiên đủ hạn ngạch mục 4.1, và **cố ý chọn cả người trả lời B30 "would not use it"**.

**Luật cho người phỏng vấn**: không giới thiệu app trước mục 7.7 · không gật đầu khi người được phỏng vấn khen ý tưởng · im lặng 3 giây sau mỗi câu trả lời trước khi hỏi tiếp · câu hỏi đào sâu mặc định là "Tell me more about that" và "What happened next?" · không hỏi "Would you use…?".

### 7.1. Mở đầu — 3 phút

- Giới thiệu mục đích: "We are trying to understand how people find things to do and meet people in Da Nang. There are no right answers."
- Xin phép ghi âm, bật ghi âm, **hỏi lại để có lời đồng ý trong bản ghi**.

### 7.2. Bối cảnh — 5 phút

1. How did you end up in Da Nang?
2. What does a typical week look like for you here?
3. Who do you spend time with? How did you meet them?

### 7.3. Câu chuyện gần nhất — 10 phút

Phần quan trọng nhất của buổi phỏng vấn. Đi theo trình tự thời gian, đừng nhảy.

4. Walk me through the last time you looked for something to do with other people. Where did you start?
5. What did you open next? *(đào sâu: mỗi kênh, vì sao mở kênh đó)*
6. What made you choose that one? What almost made you skip it?
7. Did you go? What happened when you got there?
8. Tell me about the best activity you've joined here. And the worst.

### 7.4. Kênh và thói quen — 5 phút

9. Could you show me on your phone the groups or apps you use for this? *(chỉ xem, không chụp nội dung của người khác)*
10. What do you like about them? What annoys you?
11. Has anything made you leave or mute a group?

### 7.5. Tin cậy và an toàn — 7 phút

12. Think about the first time you joined an activity here where you knew nobody. What went through your mind before going?
13. What do you check about a host or an activity before going?
14. Has anything ever made you feel unsafe or uncomfortable? *(tuỳ chọn — nói rõ họ có thể bỏ qua)*
15. How would you feel if an app asked for your phone number? Your passport?
16. What do you think about seeing the exact address only after your spot is confirmed?

### 7.6. Nội dung và kiểm duyệt — 4 phút

17. What kind of posts in groups annoy you the most?
18. Have you ever reported a post or a person? What happened?
19. What should a community app never allow?

### 7.7. Thử ba cách duyệt — 8 phút

**Chuẩn bị**: 3 mockup chạy trên điện thoại, cùng dữ liệu 20 hoạt động giả lập tuần này:

- **M1** — danh sách có bộ lọc khu vực, thời gian, loại hình
- **M2** — danh sách giống M1, mỗi thẻ vuốt ngang để hiện nút Save / Not interested (phương án được chọn ở chương 8)
- **M3** — một hoạt động mỗi màn hình, vuốt phải để lưu, vuốt trái để bỏ qua

Xoay vòng thứ tự giữa các người được phỏng vấn (M1-M2-M3, M2-M3-M1, M3-M1-M2). Không nói phương án nào là của đội.

**Nhiệm vụ** cho mỗi mockup: *"Find something to do this Saturday evening near An Thuong, and save two options."*

| Quan sát ghi lại | M1 | M2 | M3 |
|---|---|---|---|
| Thời gian hoàn thành nhiệm vụ (giây) | | | |
| Có hoàn thành không (có / có trợ giúp / không) | | | |
| Số lần muốn quay lại mục đã bỏ qua | | | |
| Có tự phát hiện ra cử chỉ vuốt không | | | |
| Nhận xét nguyên văn đáng chú ý | | | |

Sau cả ba: *"Which one would you actually use this weekend? Why?"* rồi *"Which one felt fastest? Which one made you most confident you didn't miss something good?"*

### 7.8. Kết thúc — 3 phút

20. If you could change one thing about how you find activities in Da Nang, what would it be?
21. Is there anyone else we should talk to? *(xin giới thiệu thêm người, ưu tiên phân khúc còn thiếu)*

### 7.9. Mẫu ghi chép sau mỗi buổi

Điền trong vòng 1 giờ sau buổi phỏng vấn, khi còn nhớ rõ.

| Mục | Nội dung |
|---|---|
| Mã người được phỏng vấn / phân khúc | C-07 / S1 |
| Ba câu nói nguyên văn đáng giá nhất | |
| Vấn đề lớn nhất họ gặp (lời của họ) | |
| Hành vi làm ta bất ngờ | |
| Giả định bị củng cố (mã H/GD) | |
| Giả định bị lung lay (mã H/GD) | |
| Kết quả thử mockup — phương án họ chọn và lý do | |

---

## 8. Bộ D — Organizer và venue

Form online 8 phút, sau đó mời phỏng vấn 40 phút. Có bản tiếng Việt cho chủ venue người Việt; dòng *VI* dưới mỗi câu dùng làm bản đó.

### 8.1. Form online

**D1 · Chọn một · P1**

Which best describes you as an organizer?

*VI: Điều nào mô tả đúng nhất vai trò tổ chức của bạn?*

- I host activities as a hobby
- I run a community group (sports, language, interest)
- I organize events professionally
- I own or manage a venue (bar, cafe, gym, studio)
- I work at a coworking space
- I work at a language center or school
- Other: ____

**D2 · Chọn nhiều · P1** — loại hoạt động tổ chức. Cùng danh sách đáp án với B2.


**D3 · Chọn một · P1**

How often do you host?

*VI: Bạn tổ chức thường xuyên thế nào?*

- Less than once a month
- 1–3 times a month
- Weekly
- Several times a week

**D4 · Chọn một · P1**

How many people usually join one of your activities?

*VI: Mỗi buổi thường có bao nhiêu người tham gia?*

**Đáp án:** Under 10 · 10–20 · 21–50 · More than 50

**D5 · Chọn một · P1**

Do people pay to join?

*VI: Người tham gia có trả phí không?*

**Đáp án:** Always free · Free, but they buy drinks or food at the venue · Paid, under 100,000 VND · Paid, 100,000–300,000 VND · Paid, over 300,000 VND

**D6 · Chọn nhiều · P1** — kiểm chứng H-01 từ phía cung

Where do you promote your activities? Cùng danh sách đáp án với B6.

**D7 · Chọn một · P1**

For one activity, how much time do you spend on promotion and managing sign-ups?

*VI: Mỗi buổi bạn mất bao nhiêu thời gian cho quảng bá và quản lý đăng ký?*

**Đáp án:** Under 30 minutes · 30–60 minutes · 1–3 hours · More than 3 hours

**D8 · Thang 1–5 cho từng dòng · P1**

How much of a problem is each of these for you?

*VI: Mỗi điều sau là vấn đề lớn tới mức nào với bạn?*

Thang: 1 = Not a problem · 5 = A big problem · N/A

| Vấn đề |
|---|
| Reaching new people outside my usual group |
| People who say they will come and don't show up |
| Last-minute cancellations |
| Managing sign-ups and waitlists in chat groups |
| Collecting payments |
| Fake or spam sign-ups |
| People not reading the details (time, place, what to bring) |
| Low turnout in the rainy season |
| My posts get low reach on Facebook |
| Dealing with a difficult or unsafe attendee |

**D9 · Chọn một · P1** — kiểm chứng GD-06 từ phía host

Out of 10 people who say they are coming, how many usually don't show up?

*VI: Trong 10 người nhận lời, thường bao nhiêu người không tới?*

**Đáp án:** 0–1 · 2–3 · 4–5 · More than 5

**D10 · Câu mở · P2**

What do you do today to reduce no-shows?

**D11 · Chọn nhiều · P1**

Which tools do you use to run your activities?

*VI: Bạn dùng công cụ nào để vận hành hoạt động?*

**Đáp án:** Facebook events · Meetup · Luma or Eventbrite · Google Forms · WhatsApp, Telegram or Zalo groups · A spreadsheet · Nothing, I just post · Other: ____

**D12 · Chọn một · P1** — kiểm chứng GD-10

Imagine an app that handles sign-ups and waitlists, but NOT payments — you would still collect money yourself (cash or bank transfer). Would that work for you?

*VI: Hình dung app lo đăng ký và danh sách chờ nhưng KHÔNG thu tiền — bạn vẫn tự thu. Như vậy có ổn không?*

- Yes, that works
- OK for now, but I will need payments later
- No — I need payments inside the app
- Not relevant, my activities are free

**D13 · Chọn đúng 3 · P1**

What would make you move your listings to a new app? Choose 3.

*VI: Điều gì khiến bạn chuyển sang đăng trên app mới? Chọn 3.*

- [ ] It brings me new attendees I can't reach now
- [ ] Fewer no-shows
- [ ] Sign-ups and waitlist handled automatically
- [ ] It is free for organizers
- [ ] Attendees are verified
- [ ] I can see who is coming before the day
- [ ] Automatic reminders to attendees
- [ ] Simple statistics about my attendees
- [ ] My community is already there
- [ ] Nothing — I am happy with what I use

**D14 · Chọn một · P1** — kiểm chứng GD-09

Imagine this: a community app listed your public event, with credit to you and a link to your page. Then they invite you to take over the listing. How would you react?

*VI: Một app cộng đồng đã đăng sự kiện công khai của bạn, ghi nguồn và dẫn link về trang của bạn, rồi mời bạn nhận quản lý listing đó. Bạn phản ứng thế nào?*

- Happy — I would take it over
- Fine, but I would prefer to be asked first
- I would want it removed
- It depends: ____

**D15 · Chọn nhiều · P1** — kiểm chứng GD-09

If a listing of your event is posted by someone else, what must it always show?

*VI: Nếu người khác đăng sự kiện của bạn, listing đó bắt buộc phải có gì?*

**Đáp án:** My name or group name · A link to my original post · My contact · A note that it was listed by the app team · Nothing, as long as details are correct

**D16 · Chọn một · P2** — kiểm chứng H-09 từ phía cung

How much do you spend per month to promote your activities (Facebook boosts, Meetup fees, printing)?

*VI: Mỗi tháng bạn chi bao nhiêu cho quảng bá?*

**Đáp án:** Nothing · Under 500,000 VND · 500,000–2,000,000 VND · More than 2,000,000 VND

**D17 · Mỗi dòng chọn một · P2** — kiểm chứng H-04 từ phía host

To host on an app, what would you be willing to verify? Bảng giống B20, thêm dòng *"Business registration (for venues and companies)"*.

**D18 · Tuỳ chọn · P1** — mời phỏng vấn, giống B34.


### 8.2. Hướng dẫn phỏng vấn organizer — 40 phút

1. Kể lại buổi gần nhất bạn tổ chức, từ lúc nảy ra ý tưởng tới lúc buổi kết thúc.
2. Bạn tìm người tham gia bằng cách nào? Kênh nào đem lại người thật sự tới?
3. Bạn quản lý danh sách đăng ký và danh sách chờ ra sao? Cho xem nếu được.
4. Lần gần nhất nhiều người không tới — chuyện gì xảy ra, bạn đã làm gì?
5. Đã bao giờ gặp người tham gia gây rối hoặc không an toàn chưa? Bạn xử lý thế nào?
6. **Kịch bản curate** — cho xem mẫu tin nhắn MSG-08 (`07` §6): *"Sự kiện của bạn đã có X người quan tâm trên Da Nang Connect — bạn có muốn tự quản lý listing này không?"* Phản ứng đầu tiên là gì? Điều gì làm bạn khó chịu? Điều gì làm bạn đồng ý?
7. Bạn thu tiền thế nào? Nếu app không thu tiền hộ thì có vấn đề gì không?
8. Một tháng tổ chức thành công với bạn trông như thế nào? Đo bằng gì?
9. Nếu có một công cụ giải quyết đúng một việc cho bạn, đó là việc gì?

---

## 9. Bộ E — Expert và service provider

Phỏng vấn khám phá cho Giai đoạn 2–3. **Mục tiêu không phải tuyển họ lên app ngay**, mà là hiểu điều kiện để họ tham gia và rủi ro pháp lý khi nền tảng giới thiệu họ. Tách rõ hai nhóm ngay từ đầu buổi:

| Nhóm | Ví dụ | Điểm khác biệt cần đào sâu |
|---|---|---|
| **Expert** — có chứng chỉ hành nghề | Bác sĩ, nha sĩ, nhà trị liệu tâm lý, luật sư, dược sĩ | Xác thực chuyên môn, trách nhiệm pháp lý khi tư vấn sai |
| **Service provider** — dịch vụ thương mại | Studio yoga, trung tâm ngoại ngữ, môi giới nhà, thợ sửa xe, dịch vụ visa | Xác thực doanh nghiệp, quy tắc quảng cáo, tranh chấp đặt cọc |

### 9.1. Câu hỏi — 30 phút

1. Hiện khách nước ngoài tìm tới bạn qua đâu? Chiếm khoảng bao nhiêu phần trăm khách của bạn?
2. Bạn có từ chối khách nước ngoài không? Vì sao — ngôn ngữ, không phù hợp, thủ tục?
3. Nhân viên của bạn giao tiếp tiếng Anh ở mức nào?
4. Bạn từng đăng bài vào nhóm Facebook expat chưa? Có bị xoá hoặc bị gọi là spam không?
5. Để có huy hiệu "đã xác minh", bạn sẵn sàng cung cấp giấy tờ gì? Giấy tờ nào bạn **không** muốn đưa, vì sao?
6. Bạn lo gì về đánh giá từ khách hàng trên một nền tảng? Bạn cần quyền phản hồi như thế nào?
7. *(Expert)* Có loại câu hỏi hay yêu cầu nào bạn không bao giờ trả lời qua mạng không? Vì sao?
8. *(Service provider)* Tranh chấp phổ biến nhất với khách nước ngoài là gì? Bạn xử lý đặt cọc thế nào?
9. **Huy hiệu danh tính và huy hiệu chuyên môn** — giải thích: nền tảng sẽ tách "đã xác minh danh tính" với "đã xác minh chứng chỉ hành nghề". Bạn thấy sự phân biệt này có cần không? Khách có hiểu không?
10. Hiện bạn chi bao nhiêu mỗi tháng để có khách (quảng cáo, hoa hồng môi giới, phí niêm yết)?
11. Mô hình nào bạn thấy công bằng: phí niêm yết cố định, phí theo lượt liên hệ, hay hoa hồng khi thành giao dịch?
12. *(Expert)* Bạn có sẵn sàng tham gia miễn phí các buổi hỏi đáp hay workshop cho cộng đồng không? Đổi lại bạn cần gì?
13. Điều gì sẽ khiến bạn rời khỏi nền tảng?

---

## 10. Bộ F — Người Việt nói tiếng Anh (S5)

Form tiếng Việt, 5 phút. Trả lời chung các câu A2–A6 của bộ A trước (bỏ A5).

**F1 · Chọn nhiều · P1**

Bạn tham gia hoạt động cùng người nước ngoài vì mục đích gì?

- [ ] Luyện tiếng Anh hoặc ngoại ngữ khác
- [ ] Kết bạn quốc tế
- [ ] Mở rộng quan hệ công việc
- [ ] Giới thiệu văn hoá Việt Nam
- [ ] Tìm hiểu cơ hội học tập hoặc làm việc ở nước ngoài
- [ ] Tìm người yêu
- [ ] Khác: ____

**F2 · Chọn một · P1**

Trong 3 tháng qua bạn tham gia hoạt động như vậy bao nhiêu lần?

**Đáp án:** 0 · 1–2 · 3–5 · Hơn 5

**F3 · Chọn nhiều · P1**

Bạn biết tới các hoạt động đó qua đâu? Cùng danh sách đáp án với B6 (bản dịch tiếng Việt).

**F4 · Chọn một · P1**

Bạn tự đánh giá khả năng giao tiếp tiếng Anh?

**Đáp án:** Cơ bản · Giao tiếp được chủ đề quen thuộc · Trôi chảy · Gần như người bản ngữ

**F5 · Thang 1–5 cho từng dòng · P1**

Mỗi điều sau là vấn đề lớn tới mức nào với bạn? (1 = không phải vấn đề · 5 = vấn đề lớn)

| Vấn đề |
|---|
| Không biết sự kiện có chào đón người Việt không |
| Sự kiện quá đông người Việt, ít người nước ngoài |
| Bị đối xử khác vì là người Việt |
| Lo về an toàn khi gặp người lạ |
| Không theo kịp tốc độ nói chuyện |
| Sự kiện thu phí cao so với thu nhập |

**F6 · Chọn một · P1** — kiểm chứng S5-cap

Một số buổi trao đổi ngôn ngữ giới hạn người Việt tối đa 40% số người tham gia, để giữ tỷ lệ cân bằng với người nước ngoài. Bạn thấy thế nào?

- Hợp lý — buổi sẽ có ích hơn cho cả hai bên
- Chấp nhận được
- Không công bằng
- Không có ý kiến

**F7 · Chọn nhiều · P2**

Bạn có sẵn sàng làm những việc sau không?

**Đáp án:** Đồng tổ chức một buổi trao đổi ngôn ngữ · Hướng dẫn người mới tới tìm chỗ, gọi món, đi lại · Dịch hộ trong một buổi sự kiện · Không

**F8 · Tuỳ chọn · P2** — để lại liên hệ nếu muốn được mời tham gia thử app.


---

## 11. Bộ G — Admin nhóm cộng đồng và người kiểm duyệt

Phỏng vấn 30 phút với admin các nhóm Facebook, Telegram, WhatsApp expat tại Đà Nẵng. Họ vừa là nguồn hiểu biết lớn nhất về nội dung xấu, vừa là bên có thể coi Da Nang Connect là đối thủ — mở đầu bằng việc **hỏi để học**, không chào mời hợp tác trong buổi này.

1. Nhóm được lập khi nào, vì sao? Hiện có bao nhiêu thành viên hoạt động thật?
2. Mỗi tuần bạn dành bao nhiêu thời gian cho việc duyệt bài và xử lý thành viên?
3. Năm loại bài bạn xoá nhiều nhất là gì? Cho một ví dụ cụ thể mỗi loại.
4. Trường hợp nào khó quyết định nhất? *(đào sâu: bài tự quảng cáo của doanh nghiệp, chủ đề chính trị hoặc tôn giáo, tranh cãi giữa expat và người địa phương)*
5. Bạn phát hiện lừa đảo bằng cách nào? Có dấu hiệu nào lặp lại không?
6. Khi thành viên báo cáo một bài, quy trình của bạn là gì? Có ai khiếu nại quyết định của bạn chưa?
7. Bạn có luật nhóm viết thành văn không? Có sẵn lòng chia sẻ không?
8. Bạn đã bao giờ phải xử lý chuyện xảy ra ngoài đời tại một buổi gặp mặt đăng trong nhóm chưa? *(tuỳ chọn)*
9. Nếu một app có công cụ kiểm duyệt tốt hơn, bạn muốn nó làm được việc gì mà Facebook không làm được?
10. Bạn nghĩ gì về một nền tảng tổng hợp hoạt động dành riêng cho expat Đà Nẵng? Nó giúp nhóm của bạn hay cạnh tranh với nhóm?
11. Bạn có muốn được mời làm người báo cáo đáng tin cậy (trusted flagger) — báo cáo của bạn được ưu tiên xử lý — không? Điều kiện của bạn là gì?

---

## 12. Phân tích kết quả và ra quyết định

### 12.1. Bảng quyết định

Ngưỡng dưới đây là **đề xuất**, chủ dự án duyệt trước ngày 18/09. Sau khi mở form thì không đổi ngưỡng.

| Câu hỏi | Chỉ số | Ngưỡng | Nếu đạt | Nếu không đạt |
|---|---|---|---|---|
| B6 | Tỷ lệ dùng ≥ 3 kênh | ≥ 60% | Giữ định vị "điểm tổng hợp duy nhất" | Định vị lại quanh tin cậy hoặc hoạt động tức thời |
| B9, B10 | Tỷ lệ chọn vấn đề tìm kiếm (3 dòng đầu B9) là lớn nhất | ≥ 50% | Dồn sức vào curate và bộ lọc | Dồn sức vào tạo nguồn cung (sự kiện signature) |
| B3, B4 | Tỷ lệ sống hoặc sinh hoạt chủ yếu ngoài 6 khu vực MVP | ≤ 10% | Giữ 6 khu vực (GD-08) | Thêm khu vực thứ 7 qua `AD-50` |
| B8 | Muốn làm gì đó ngay trong ngày ≥ 1 lần/tuần **và** hiếm khi/không tìm được người | ≥ 30% và ≥ 50% trong nhóm đó | Đưa khám phá hoạt động tức thời vào roadmap sớm hơn | Giữ ở Giai đoạn 2 |
| B18 | Ba tín hiệu được chọn nhiều nhất | — | Ba tín hiệu đó lên thẻ sự kiện (GD-03) | — |
| B21 | Tỷ lệ "would probably stop using" | ≥ 15% | Giữ OTP điện thoại **tuỳ chọn** (QĐ-8) | Có thể cân nhắc OTP khi RSVP lần đầu |
| B22 | Tỷ lệ "would stop me from joining" | ≤ 15% | Áp dụng ẩn địa chỉ cho 3 lớp sự kiện (QĐ-11) | > 30%: chỉ làm mờ toạ độ, không ẩn địa chỉ |
| B25 | Tỷ lệ chấp nhận chờ ≥ 6 giờ, trong người có ý định đăng | ≥ 50% | Duyệt trước cho bài của T0–T1 | Duyệt sau có lọc tự động, duyệt trước chỉ cho nội dung rủi ro cao |
| B14, B15, B16, C mục 7.7 | S1 chọn "one at a time" ở B15 **và** M3 thắng ở phỏng vấn **và** tỷ lệ tiếc "often/sometimes" ở B16 | ≥ 35% · ≥ 7/12 · ≤ 30% | Xét lại swipe deck sớm hơn mốc tồn kho | Giữ phương án swipe trong dòng (chương 8) |
| B27 | Tỷ lệ muốn ngôn ngữ khác tiếng Anh | > 30% | Tự chọn ngôn ngữ theo thiết bị (GD-07) | Giữ tiếng Anh mặc định |
| B28 | Lý do vắng mặt hàng đầu là "I forgot" | Đứng đầu | Nhắc T-24h và T-2h là đúng hướng | Lý do khác đứng đầu: thiết kế lại cam kết thay vì thêm nhắc |
| B32 | Mục xếp hạng 1 nhiều nhất | — | Đầu vào thứ tự GĐ2 / GĐ3 | — |
| D12 | Tỷ lệ "Yes" + "OK for now", trong organizer có sự kiện thu phí | ≥ 70% | Không làm thanh toán ở GĐ1 (GD-10) | Đẩy bounded context `payments` lên sớm |
| D14 | Tỷ lệ "I would want it removed" | ≤ 15% | Giữ quy trình đăng trước rồi mời nhận (GD-09) | Xin phép **trước** khi đăng |
| F6 | Tỷ lệ "Không công bằng" | ≤ 25% | Giữ trần 40% | Bỏ trần cứng, thay bằng hiển thị tỷ lệ cho người đăng ký |

### 12.2. Cách phân tích

- **Luôn tách theo phân khúc** S1, S2, S3, S4. Không gộp chung rồi báo một con số — S1 và S3 có nhu cầu gần như ngược nhau.
- **Không gia quyền** mẫu: mẫu thu qua kênh không ngẫu nhiên, gia quyền tạo cảm giác chính xác giả.
- **Câu mở** (B11, B16, B33) và **bản ghi phỏng vấn**: mã hoá theo chủ đề bằng skill `synthesize-research`; mỗi chủ đề ghi số người nhắc và một trích dẫn nguyên văn.
- **Phỏng vấn**: dừng tuyển thêm một phân khúc khi ba buổi liên tiếp không có chủ đề mới.
- **Báo cáo kết quả** đi theo bảng 12.1: mỗi dòng ghi chỉ số thật, đạt hay không đạt, và quyết định đi kèm.

### 12.3. Hạn chế đã biết

| Hạn chế | Ảnh hưởng | Cách giảm |
|---|---|---|
| Người trả lời tự chọn tham gia, chủ yếu từ nhóm Facebook | Người tích cực hoạt động cộng đồng bị đại diện quá mức | Tuyển thêm qua coworking và trường quốc tế; phỏng vấn cả người trả lời B30 "would not use it" |
| Ý định nói ra khác hành vi thật | B30 và B15 dễ lạc quan | Không dùng B30 một mình để kết luận GD-01; GD-01 chỉ kết luận được bằng WCA sau khi ra mắt |
| Form chỉ có tiếng Anh | S4 chỉ đo được người đọc tiếng Anh | Ghi rõ trong báo cáo; cân nhắc bản tiếng Hàn nếu S4 nổi lên trong B27 |
| Khảo sát vào đầu mùa mưa | Tần suất tham gia hoạt động ngoài trời thấp hơn cả năm | Ghi chú mùa vụ khi đọc B1, B2 |
| Cỡ mẫu phỏng vấn nhỏ | Kết quả thử mockup mang tính định hướng | Ngưỡng ở 12.1 yêu cầu cả form và phỏng vấn cùng đồng thuận |

---

## 13. Checklist trước khi mở form

- [ ] Chủ dự án duyệt ngưỡng ở mục 12.1
- [ ] Luật sư rà lời đồng ý (mục 4.6) và vấn đề lưu dữ liệu ở máy chủ nước ngoài (mục 4.4)
- [ ] Form có logic nhảy câu đúng cho A1, A5, A6, A7, B8, B19, B28
- [ ] B15 và B18 bật xáo thứ tự đáp án; bốn hình minh hoạ B15 cùng mức hoàn thiện
- [ ] Thông tin liên hệ ở B34, D18, F8 lưu ở bảng tách riêng khỏi câu trả lời
- [ ] Pilot xong với 5 expat và 2 organizer; thời gian điền trung vị ≤ 12 phút
- [ ] 3 mockup cho mục 7.7 chạy được trên điện thoại, cùng bộ 20 hoạt động giả lập
- [ ] Admin các nhóm Facebook, Telegram đã đồng ý cho đăng
- [ ] Người phỏng vấn đã đọc luật phỏng vấn ở đầu mục 7 và thử một buổi với người trong đội
