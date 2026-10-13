# Da Nang Connect — Phân tích nhu cầu khách hàng (10/2026)

- **Mục đích**: rút ra mong muốn và requirement của khách hàng từ 3 video phỏng vấn đường phố, đối chiếu với nghiên cứu thứ cấp và hiện trạng sản phẩm, làm đầu vào cho kế hoạch điều chỉnh tại [17-dieu-chinh-lo-trinh-du-an.md](17-dieu-chinh-lo-trinh-du-an.md)
- **Ngày lập**: 12/10/2026
- **Thực hiện**: BA Agent (phân tích), điều phối viên (chép lời, gắn mốc thời gian, đối chiếu nghiên cứu thứ cấp)
- **Trạng thái**: chờ PO duyệt — có 1 quyết định định vị cần chốt (mục 10.1)
- **Liên quan**: persona P1–P6 (`01` §7), giả định GD-01 → GD-12 (`02` §13.2), phân khúc S1–S5 (`07` §3), bộ câu hỏi khảo sát (`15`)

---

## 1. Tóm tắt điều hành

- **Cả hai người có tiếng đều là du khách ngắn ngày**: 3 ngày (V2) và khoảng 2 tuần (V1). Không ai thuộc S1/P1 (nomad ở 1–6 tháng), nên video **không kiểm chứng được** giả định lõi GD-01 và phân khúc seed S1. Dữ liệu thứ cấp lại cho thấy du khách ngắn ngày chiếm áp đảo về lượng khách (lưu trú trung bình 1,45 ngày/cơ sở).
- **Kênh khám phá thực tế là GetYourGuide, Instagram, TikTok và hỏi tài xế Grab**: "I look at GetYourGuide and that's it, and then we ask the Grab driver" (V2 02:38). Không ai nhắc Facebook Groups, Meetup hay Luma, khác với kênh mặc định của P1 trong repo.
- **Với du khách, "social activity" nghĩa là lễ hội, nhạc, tham quan, trekking, không phải gặp người lạ.** Tín hiệu ngược rõ nhất: "Actually no. We just went yesterday — there was a festival on the beach" (V2 02:15). Chỉ V1 nói muốn "meeting people in the streets", và câu hỏi đó có dẫn dắt.
- **Xuất hiện một nhóm mới chưa có persona: travel creator gia đình.** V1 chạy kênh TikTok chia sẻ "family-friendly finds in Vietnam". Họ vừa là người dùng vừa là kênh phân phối. Dữ liệu thứ cấp ủng hộ: Agoda xếp Đà Nẵng thứ 2 về điểm đến gia đình quốc tế, lượt tìm kiếm +42%.
- **Phản hồi tích cực về ý tưởng app không phải bằng chứng nhu cầu.** Pitch đặt giữa phỏng vấn, khung "dạy tiếng Anh", đã hứa đăng TikTok nên dễ có đồng tình lịch sự. Video 3 mất tiếng nên không dùng được.
- **Khuyến nghị:**
  - (a) Không đổi hướng và không nới phạm vi lớn chỉ dựa trên 2 cuộc phỏng vấn.
  - (b) Thêm ngay các hạng mục rẻ phục vụ nhiều phân khúc cùng lúc:
    - loại hình sự kiện, nhãn đối tượng và ngôn ngữ;
    - preset thời gian;
    - trang sự kiện công khai kèm link chia sẻ có preview;
    - đo nguồn truy cập;
    - seed có lễ hội, nhạc, trekking.
  - (c) Chạy nghiên cứu vòng 2 có cấu trúc **trước M2 (13/11/2026)**.
  - (d) PO chốt định vị "expat-first, visitor-friendly" (mục 10.1).

## 2. Phương pháp và độ tin cậy

**Nguồn sơ cấp**: 3 video dọc khoảng 4 phút, quay ở bãi biển Mỹ Khê và công viên Biển Đông lúc cuối chiều. Lời thoại chép bằng Whisper large-v3-turbo, tên riêng được chuẩn hoá thủ công (Bà Nà Hills, Sơn Trà, GetYourGuide). Mốc thời gian mm:ss tính theo file gốc.

**Cỡ mẫu**: 2 phỏng vấn có tiếng (V1, V2). V3 chỉ có hình: track âm thanh là im lặng tuyệt đối ngay trong file gốc (-91 dB) và không có phụ đề, nên **không suy diễn lời nói của V3**.

**Nguồn thứ cấp**: desk research ngày 12/10/2026 (mục 5), dùng để đối chiếu, không thay cho bằng chứng sơ cấp.

**Thiên lệch:**

| Thiên lệch | Ảnh hưởng |
|---|---|
| Câu hỏi dẫn dắt ("Like running or meet new people or trekking?", "TikTok or Facebook?") | Câu trả lời của V1 về trekking và gặp người bị định hướng |
| Khung "phỏng vấn để dạy tiếng Anh, làm nội dung mạng xã hội" | Người trả lời nói cho máy quay |
| Pitch sản phẩm giữa chừng | Câu trả lời sau pitch có thể chỉ là đồng tình lịch sự |
| Chỉ khách phương Tây, khu biển, cuối chiều | Không có khách Hàn/Trung/Việt, nomad ở lâu hay organizer |
| Mẫu thuận tiện, đầu mùa mưa (tháng 10) | Không đại diện; hoạt động ngoài trời có thể thấp hơn mùa khô |
| Đã xin đăng TikTok và trao đổi ID ngay tại chỗ | Quan hệ xã giao, dễ nói tốt |

**Mức tự tin chung: Thấp.** Coi đây là tín hiệu định tính, không phải kết luận.

## 3. Hồ sơ người được phỏng vấn (chỉ theo bằng chứng)

| | V1 — Melissa (New Zealand) | V2 — Miriam (Pháp) | V3 |
|---|---|---|---|
| Lưu trú | Đã ở vài ngày; dự kiến **2 tuần** (00:39–00:46). Whisper nghe số ngày là "40", nhưng ngay trước đó cô xác nhận "two weeks", nên nhiều khả năng là "fourteen" | **3 ngày** rồi đi Bali (00:40–00:50); trước đó đi miền Bắc và Hội An 2 ngày (01:16) | Không biết |
| Đi cùng | Bạn đời và một bé trai khoảng 5–6 tuổi (hình ảnh) | Một bạn nữ đi cùng, xuất hiện ở cuối (hình ảnh) | 2 người, nữ trả lời chính, nam góp lời ở cuối (hình ảnh) |
| Kênh khám phá | "GetYourGuide or Instagram" (01:24), có dùng TikTok (01:33) | "GetYourGuide… and we ask the Grab driver" (02:38–02:44); "More Instagram, I don't have TikTok" (02:53) | Không biết |
| Đã làm | "We went to the festival and social activity" (00:53) | Lễ hội nhạc trên biển hôm trước; lễ hội nhạc ở Hà Nội (02:15–02:29) | Không biết |
| Sắp làm | Bà Nà Hills, trekking, "exploring and meeting people in the streets" (01:03–01:12) | Bà Nà, trung tâm, biển; chưa biết Sơn Trà, được gợi ý thì "Perfect, we'll try to go there" (01:45–02:08) | Không biết |
| Với ý tưởng app | "Oh yes, that's good" (01:45), muốn biết thêm | "Yeah, of course, you're right. We can check also" (03:09) | Không biết |
| Khác | Có kênh TikTok du lịch gia đình nhiều follower: "family-friendly finds in Vietnam… to bring more families to Vietnam" (03:10–03:41) | "Really beautiful country" (03:58) | Không biết |

## 4. Fact → Diễn giải → Hàm ý sản phẩm

| # | Fact (quan sát) | Diễn giải (suy luận) | Hàm ý sản phẩm | Tin cậy |
|---|---|---|---|---|
| F1 | "GetYourGuide or Instagram" (V1 01:24); "I look at GetYourGuide and that's it" (V2 02:38) | Du khách ngắn ngày dùng marketplace tour, không dùng nhóm cộng đồng | Không cạnh tranh với GetYourGuide; định vị bổ sung bằng hoạt động cộng đồng, miễn phí, của người địa phương | Trung bình |
| F2 | "We ask the Grab driver if there is something to see" (V2 02:44) | Gợi ý truyền miệng tại chỗ vẫn là kênh quan trọng | Nội dung phải hiểu được trong một màn hình, không bắt đăng ký | Thấp |
| F3 | V2 không biết Sơn Trà cho tới khi được gợi ý (01:45–02:08) | Du khách thiếu thông tin về địa điểm | Giả thuyết "gợi ý địa điểm"; chưa đủ bằng chứng để làm | Thấp |
| F4 | "Actually no" khi được hỏi có thích social activity không; chỉ "enjoy the music" (V2 02:15) | Không phải ai cũng muốn giao lưu; nhiều người chỉ muốn trải nghiệm | Không ép đăng ký, RSVP hay chat trong luồng xem; cho xem trước | Trung bình |
| F5 | Cả hai nhắc lễ hội đã tham dự (V1 00:53, V2 02:15) | Sự kiện công cộng lớn có cầu thật, chưa rõ họ tìm ra bằng cách nào | Seed phải có lễ hội và nhạc, không chỉ thể thao hay language exchange | Trung bình |
| F6 | V1 trả lời "trekking, yes" sau câu hỏi dẫn dắt (01:03) | Có thể chỉ đồng ý theo gợi ý | Không dùng làm bằng chứng cho nhu cầu trekking | Thấp |
| F7 | "Family-friendly finds in Vietnam, to bring more families" (V1 03:33–03:41) | Creator gia đình cần nội dung phù hợp trẻ em và có tiềm năng lan truyền | Nhãn `audience` có `family_friendly`; chia sẻ được lên TikTok/Instagram | Trung bình về nhu cầu, thấp về quy mô |
| F8 | Cuối V1 và V2, hai bên đổi TikTok/Instagram ID | Mạng xã hội là đích chia sẻ tự nhiên | Link chia sẻ có preview đẹp (Open Graph), đa ngôn ngữ | Trung bình |
| F9 | V2: "I don't have TikTok" (02:53) | Không thể giả định mọi du khách dùng TikTok | Chia sẻ đa kênh, không phụ thuộc một nền tảng | Thấp |
| F10 | Lưu trú 3 ngày và khoảng 2 tuần | Quá ngắn so với P1 (6 tuần) và S1 (1–6 tháng) | Phải có giá trị ngay lần mở đầu tiên; cơ chế trust/RSVP dài hạn không phải giá trị đầu với nhóm này | Trung bình |
| F11 | Pitch đặt giữa phỏng vấn (V1 01:36, V2 02:56) | Phản hồi tích cực sau đó không phải bằng chứng | Không dùng để cập nhật GD-01 | Cao (về thiên lệch) |

## 5. Đối chiếu với nghiên cứu thứ cấp

Nguồn đầy đủ (có link) nằm ở bản desk research của phiên. Dưới đây chỉ ghi các điểm làm **thay đổi mức tin cậy** của phát hiện sơ cấp.

| Phát hiện sơ cấp | Bằng chứng thứ cấp | Tác động |
|---|---|---|
| Du khách ngắn ngày (F10) | Khoảng 7,73 triệu lượt khách quốc tế lưu trú trong 9 tháng 2026 (+28,7%); lưu trú trung bình 1,45 ngày/cơ sở (H1/2024) | Du khách là nhóm **đông nhất về lượng**. Nomad chỉ ước 7.600–10.550 người (độ tin cậy thấp), nhưng ở lâu và quay lại nhiều |
| Kênh khám phá là TikTok/Instagram (F1, F8) | Khảo sát TUI Musement: 48% Gen Z tìm cảm hứng du lịch trên TikTok, 43% từng đặt hoạt động sau một video viral | Củng cố FR-04 (chia sẻ) và FR-05 (trang công khai) |
| Gia đình, creator (F7) | Agoda 12/2025: Đà Nẵng đứng thứ 2 cho gia đình quốc tế, tìm kiếm +42% | Nâng FR-03 (`family_friendly`) lên Must vì cùng migration với FR-01, chi phí gần như bằng 0 |
| Expat dùng Facebook (GD-01) | "Expats in Da Nang" khoảng 122.700 thành viên, do Danang 365 quản lý; WhatsApp qua QR ở coworking | Củng cố tiền đề "expat đang ở Facebook" và nỗi đau "thông tin rời rạc"; **chưa** chứng minh họ sẽ rời Facebook |
| Thiếu thông tin địa điểm (F3) | Người hỏi "an EVENTS LISTING, nothing else" trên forum expat; nhiều du khách lạc hoặc bị thương ở Sơn Trà vì đi đường mòn trái phép | Củng cố nhu cầu "một chỗ xem tất cả"; FR-10 vẫn dời |
| Lễ hội (F5) | Lịch sự kiện lớn: Christmas Market 4–6/12/2026, New Year Festival 12/2026–1/2027, Nomad Fest 19–28/3/2027, Marathon khoảng 21/3/2027, DIFF khoảng cuối tháng 5 đến tháng 7/2027 | Seed theo lịch sự kiện; ra mắt bám mùa nomad cao điểm (giữa tháng 2 đến giữa tháng 5) |
| Rủi ro thời tiết | Mưa bão tháng 10–11 làm gián đoạn hoạt động ngoài trời | Thêm FR-12: trạng thái "đã đổi / đã huỷ" hiển thị rõ cho người đã RSVP |
| Đối thủ | Nomax chỉ xác minh qua đăng nhập mạng xã hội; Da Nang Social Club thu 14 USD/tháng, 513 thành viên; Danang 365 vừa là truyền thông vừa tổ chức sự kiện | Lớp trust/kiểm duyệt đã xây là điểm khác biệt; Danang 365 nên là **đối tác seed nội dung** (BR-05) |

Giới hạn: không truy cập được Reddit; số thành viên nhóm Facebook do bên thứ ba công bố và có thể trùng nhau; ngày DIFF, Marathon, IRONMAN 2027 chưa chính thức.

## 6. Nhu cầu, pain point và JTBD

**Jobs-to-be-done:**

- **J1 — du khách ngắn ngày** *(Trung bình)*: Khi mới đến Đà Nẵng 3–14 ngày, tôi muốn thấy ngay hôm nay hoặc cuối tuần có lễ hội, nhạc, hoạt động gì gần mình, để không bỏ lỡ và không phải hỏi tài xế hay lướt nhiều app.
- **J2 — gia đình** *(Trung bình, có hỗ trợ thứ cấp)*: Khi đi cùng trẻ nhỏ, tôi muốn biết hoạt động có phù hợp trẻ em không, để yên tâm đưa con đi.
- **J3 — travel creator** *(Thấp)*: Khi làm nội dung du lịch gia đình, tôi muốn có sự kiện và địa điểm đáng quay, dễ chia sẻ lại, để có nội dung và kéo thêm gia đình đến Việt Nam.
- **J4 — người muốn gặp người** *(Thấp, V1 bị dẫn dắt; thứ cấp: nomad coi cô đơn là thách thức lớn nhất)*: Khi ở thành phố lạ, tôi muốn gặp người địa phương và khách khác, để có trải nghiệm thật hơn.
- **J5 — người chỉ muốn trải nghiệm** *(Trung bình, tín hiệu ngược từ V2)*: Khi đã có kế hoạch, tôi muốn đi nghe nhạc, xem lễ hội mà không bị bắt đăng ký hay giao lưu.

**Pain point quan sát được**: không biết địa điểm (Sơn Trà); phải tìm ở nhiều nơi (GetYourGuide, Instagram, hỏi tài xế).

**Tín hiệu ngược**: V2 trả lời "Actually no"; V1 gật đầu theo gợi ý; cả hai trả lời rất ngắn về ý tưởng app; gần như không ai chủ động nói "tôi muốn gặp người lạ".

## 7. Bản đồ phân khúc mở rộng

| Phân khúc | Nguồn | Khớp persona/segment | Bằng chứng video | Quy mô (thứ cấp) |
|---|---|---|---|---|
| A. Du khách ≤ 1 tuần | V2 | Chưa có persona | 1 nhóm | Rất lớn |
| B. Gia đình du lịch có trẻ nhỏ | V1 | Gần P2 (nhưng P2 là cư dân dài hạn) | 1 gia đình | Đang tăng (Agoda +42%) |
| C. Travel creator | V1 | Chưa có persona | 1 gia đình | Không rõ |
| D. Nomad/expat ở lâu | — | P1, S1, S2 | Không | 7.600–10.550 (ước, tin cậy thấp) |
| E. Expat định cư có gia đình | — | P2, S3 | Không | Không rõ |
| F. Organizer, người địa phương | — | P3, P4, S5 | Không | Không rõ |
| G. Khách Hàn/Nhật/Trung | — | S4 | Không | Hàn vẫn đứng đầu nhưng giảm từ 40,55% (2024) xuống khoảng 18–22% (2026) |

- **Persona được củng cố**: không persona nào được củng cố vững. P2 được ủng hộ yếu về nhu cầu family-friendly.
- **Persona còn thiếu**: A (du khách ngắn ngày) và C (creator). Quyết định có mở P7/P8 hay không sau vòng 2.
- **S1**: không được củng cố, cũng không bị bác bỏ, vì hai người được hỏi không thuộc S1.

**Giả định GD:**

| GD | Trạng thái | Lý do |
|---|---|---|
| GD-01 (rời Facebook) | Chưa đủ dữ liệu | Không ai dùng Facebook Groups; thứ cấp chỉ xác nhận expat đang ở Facebook |
| GD-04 (lọc khu vực) | Chưa đủ dữ liệu | Không được hỏi |
| GD-07 (UI mặc định tiếng Anh) | Ủng hộ yếu | Cả hai nói tiếng Anh; chưa có người Việt/Hàn/Trung |
| GD-12 (deep link từ mạng xã hội là kênh tăng trưởng) | Ủng hộ yếu, có thứ cấp đi kèm | Instagram/TikTok xuất hiện, nhưng không phải nhóm Facebook như giả định |
| GD-08 (6 khu vực MVP là đủ) | **Có tín hiệu thách thức** (với du khách) | Điểm đến chính của cả hai là Bà Nà Hills và Hội An, đều nằm ngoài 6 khu MVP |
| GD-04 (lọc theo khu vực là lý do số 1) | Chưa đủ dữ liệu, có tín hiệu thách thức | Du khách nghĩ theo địa danh (Sơn Trà, Bà Nà), không theo tên khu; V2 còn không biết Sơn Trà |
| GD-02, 03, 05, 06, 09–11 | Chưa đủ dữ liệu | Không chạm tới |

## 8. Gap analysis so với hiện trạng sản phẩm

Hiện trạng theo snapshot ngày 12/10/2026. Các mục "cần xác minh" được Tech Lead kiểm trong code ở doc 17.

| Khách cần (bằng chứng) | Hiện trạng | Gap |
|---|---|---|
| Loại hình sự kiện: lễ hội, nhạc, trekking, thể thao (F5) | Bảng `events` không có category | **Thiếu** |
| Lọc `family_friendly` / `alcohol_served` (P2, F7) | Không có field `audience` | **Thiếu** |
| Ngôn ngữ của sự kiện | Không có trường language | **Thiếu** |
| Xem không cần đăng ký (P1 §7.1, F4) | UC-09 chế độ khách — chưa xác nhận đã chạy | **Cần xác minh** |
| Chia sẻ lên Instagram/TikTok/WhatsApp có preview (F8) | Chưa thấy trong snapshot | **Cần xác minh** |
| Preset "Tonight / Tomorrow / This weekend" | Có lọc ngày, chưa rõ có preset | **Cần xác minh** |
| Huỷ hoặc đổi sự kiện, báo người đã RSVP (thời tiết) | Web chỉ có tạo và publish; chưa có UI sửa/huỷ; chưa có thông báo | **Thiếu** |
| PWA (du khách không muốn cài app) | Chưa có manifest/service worker | **Thiếu** (đã trong kế hoạch TV2) |
| Nhắc lịch, thông báo | `/notifications` là BlankScreen, chưa có module | **Thiếu** (đã trong kế hoạch M3) |
| Giá, link vé (F1) | Không có price | Thiếu, bằng chứng yếu |
| Gợi ý địa điểm (F3) | Không có | Thiếu, bằng chứng yếu |

**Đã xây nhưng video chưa cho thấy nhu cầu**: bản đồ/swipe (thuộc nhóm cắt B), post/like/comment, chat, follow. Video cũng không nhắc waitlist hay trust level. Chưa kết luận là thừa, nhưng **không đầu tư thêm** cho tới khi vòng 2 có dữ liệu.

## 9. Requirement có ưu tiên

**Công thức điểm**: Score = Reach × Impact × Confidence ÷ Effort.

- **Reach**: số phân khúc phục vụ trong A–F (G chưa tính).
- **Impact**: 1–3.
- **Confidence**: 0,3 (chỉ video, yếu) · 0,6 (video + repo hoặc thứ cấp) · 0,9 (đã xác nhận).
- **Effort** (T-shirt): S = 1 · M = 2 · L = 4 · XL = 8. Tech Lead ước lượng SP ở doc 17.
- Cột "Đổi" đánh dấu chỗ điều phối viên điều chỉnh sau khi đối chiếu thứ cấp.

| ID | Mô tả | Bằng chứng | Reach | Imp | Conf | Eff | Score | MoSCoW | Đổi |
|---|---|---|---|---|---|---|---|---|---|
| NFR-05 | Đo nguồn truy cập (`guest_view`, `deep_link_source`) và nhãn phân khúc tự khai | GD-12; `07` §11 | 6 | 2 | 0,9 | S | 10,8 | Must | |
| FR-06 | Seed/curate gồm lễ hội, nhạc, trekking, không chỉ thể thao và language exchange | V1 00:53, V2 02:15; lịch sự kiện | 4 | 3 | 0,6 | S | 7,2 | Must | |
| FR-02 | Preset thời gian Tonight / Tomorrow / This weekend | P1 §7.1; J1 | 4 | 2 | 0,6 | S | 4,8 | Must | |
| FR-04 | Link chia sẻ sự kiện có preview Open Graph, dùng được trên Instagram, TikTok, WhatsApp | V1 03:10, F8; TUI 48% | 4 | 2 | 0,6 | S | 4,8 | Must | |
| FR-01 | Trường loại hình sự kiện (category) và bộ lọc | Brief §3; F5 | 5 | 3 | 0,6 | M | 4,5 | Must | |
| FR-05 | Trang sự kiện công khai, xem không cần đăng ký; chỉ hỏi đăng nhập khi RSVP | P1 §7.1; F4; thứ cấp | 5 | 3 | 0,6 | M | 4,5 | Must | |
| FR-03 | `audience` (`family_friendly`, `solo_friendly`) và `alcohol_served` | P2 §7.2; F7; Agoda | 3 | 2 | 0,6 | S | 3,6 | **Must** | Should → Must: chung migration với FR-01 |
| FR-12 | Trạng thái "đã đổi / đã huỷ" hiển thị trên trang sự kiện; người đã RSVP được báo | Thứ cấp (mùa mưa); snapshot thiếu UI huỷ | 5 | 2 | 0,6 | M | 3,0 | **Must** | Mới |
| NFR-06 | Quyền riêng tư với khách chưa đăng nhập: không lộ tên đầy đủ hay liên hệ của người tham dự; xin đồng ý trước khi ghi analytics | Quy tắc privacy của dự án; FR-05 mở trang cho khách | 5 | 2 | 0,6 | S | 6,0 | **Must** | Mới — điều kiện đi kèm FR-05 |
| FR-07 | Trường ngôn ngữ của sự kiện | Brief §1 (English-speaking) | 3 | 2 | 0,6 | S | 3,6 | Should | |
| FR-13 | Ảnh bìa sự kiện (dùng cho card và ảnh preview Open Graph) | F8; snapshot: `events` chưa có cover image | 5 | 2 | 0,6 | S | 6,0 | Should | Mới — có thể dùng ảnh mặc định theo category ở bản đầu |
| NFR-02 | Trang công khai tải nhanh trên di động, mặc định tiếng Anh, đủ EN/VI | GD-07 | 5 | 2 | 0,6 | M | 3,0 | Should | |
| FR-08 | Giá và link vé bên ngoài | F1 (suy luận) | 4 | 2 | 0,3 | S | 2,4 | Could | |
| NFR-01 | PWA cài được | Snapshot §1 | 5 | 3 | 0,6 | L | 2,3 | Should | Đã trong kế hoạch TV2 |
| FR-09 | Thêm vào lịch (calendar) | Giả thuyết | 3 | 1 | 0,3 | S | 0,9 | Could | |
| FR-10 | Gợi ý địa điểm (kiểu Sơn Trà) | F3 | 3 | 2 | 0,3 | M | 0,9 | Won't (giờ) | |
| BR-02 | Chương trình creator/ambassador | F7 | 2 | 2 | 0,3 | M | 0,6 | Won't (giờ) | |
| FR-11 | Giao diện tiếng Hàn/Trung | Chỉ giả thuyết S4 | 1 | 2 | 0,3 | XL | 0,1 | Won't | |

NFR-05 có điểm cao vì là hạ tầng đo lường, không phải tính năng người dùng thấy, và là điều kiện để kiểm chứng GD-12. Nếu UC-09 đã chạy thật thì Effort của FR-05 giảm từ M xuống S.

**Business requirement** (không chấm điểm):

- **BR-01**: Định vị Da Nang Connect bổ sung cho GetYourGuide (hoạt động cộng đồng, miễn phí hoặc giá thấp), không cạnh tranh trực tiếp.
- **BR-03**: Giữ phân khúc seed S1 cho tới khi vòng 2 có kết quả.
- **BR-04**: Định vị đối tượng — **cần PO quyết** (mục 10.1).
- **BR-05** *(mới)*: Hợp tác seed nội dung với Danang 365 và lịch chính thức Danang FantastiCity. Không tốn code; Founder phụ trách.
- **BR-06** *(mới, Should)*: Thông điệp marketing cho lớp khám phá nói "What's on in Da Nang", không rao "social activities" (F4: "Actually no"). Lớp cộng đồng vẫn giữ thông điệp kết nối cho người ở lâu.

## 10. Acceptance criteria cho các Must chính

**FR-01 — category**

- AC-1: GIVEN host tạo sự kiện WHEN chọn category "festival" và lưu THEN trang chi tiết hiển thị category, và lọc `category=festival` trả về sự kiện đó.
- AC-2: GIVEN sự kiện cũ chưa có category WHEN mở THEN hiển thị "Other" (EN) / "Khác" (VI), không lỗi.
- AC-3: GIVEN người dùng chưa đăng nhập WHEN gọi API tạo sự kiện THEN trả 401.
- AC-4: GIVEN host sửa category THEN AuditLog ghi actor, action, entityId.
- AC-5: GIVEN giao diện EN và VI THEN nhãn category đúng ngôn ngữ, không lộ key i18n.

**FR-03 — audience**

- AC-1: GIVEN sự kiện được gắn `family_friendly` WHEN khách bật lọc "Family-friendly" THEN sự kiện xuất hiện; sự kiện không gắn nhãn thì không.
- AC-2: GIVEN sự kiện có `alcohol_served = true` WHEN bật lọc "Family-friendly" THEN sự kiện không xuất hiện, kể cả khi host gắn nhầm `family_friendly`.

**FR-05 — xem không cần đăng ký**

- AC-1: GIVEN khách chưa đăng nhập WHEN mở link sự kiện công khai THEN thấy tên, giờ, khu vực, host, số chỗ còn.
- AC-2: GIVEN sự kiện đã diễn ra WHEN mở THEN có nhãn "Ended" và không có nút RSVP.
- AC-3: GIVEN mạng yếu WHEN tải lỗi THEN hiện thông báo kèm nút Retry.
- AC-4: GIVEN khách WHEN bấm RSVP THEN chuyển sang đăng nhập, sau đăng nhập quay về đúng sự kiện.

**FR-04 — chia sẻ**

- AC-1: GIVEN sự kiện công khai WHEN bấm Share THEN có link; dán vào ứng dụng hỗ trợ preview thì thấy tiêu đề, ảnh (hoặc ảnh mặc định) và giờ.
- AC-2: GIVEN sự kiện đã bị moderator ẩn WHEN mở link THEN trả 404/410, không lộ nội dung.
- AC-3: GIVEN link có tham số nguồn WHEN được mở THEN ghi `deep_link_source` (NFR-05).

**FR-02 — preset thời gian**

- AC-1: GIVEN 17:30 giờ Asia/Ho_Chi_Minh WHEN chọn "Tonight" THEN chỉ hiển thị sự kiện bắt đầu từ thời điểm hiện tại tới 23:59 cùng ngày.
- AC-2: GIVEN không có sự kiện nào WHEN chọn preset THEN hiện trạng thái rỗng kèm gợi ý chuyển sang "Tomorrow".

**FR-12 — đổi/huỷ sự kiện**

- AC-1: GIVEN host huỷ sự kiện có người đã RSVP WHEN xác nhận huỷ THEN trang sự kiện hiển thị nhãn "Cancelled" và mọi người đã RSVP hoặc đang ở waitlist nhận thông báo (email ở giai đoạn đầu).
- AC-2: GIVEN host đổi giờ hoặc địa điểm WHEN lưu THEN trang hiển thị "Updated" kèm thông tin thay đổi, và AuditLog ghi lại.

**FR-06 — seed**

- AC-1: GIVEN bất kỳ tuần nào trước M5 WHEN kiểm tra danh sách sự kiện THEN có ít nhất 5 sự kiện thuộc lễ hội, nhạc hoặc trekking (ngưỡng đề xuất, PO chốt).
- AC-2: GIVEN mỗi listing được curate THEN có nguồn gốc, người curate và thời điểm curate.

**NFR-05 — đo lường**

- AC-1: GIVEN khách mở link THEN ghi sự kiện `guest_view` kèm `deep_link_source`, không lưu dữ liệu định danh.
- AC-2: GIVEN người dùng từ chối theo dõi THEN không ghi sự kiện định danh.

**NFR-06 — quyền riêng tư của khách**

- AC-1: GIVEN khách chưa đăng nhập WHEN mở trang sự kiện THEN chỉ thấy số người tham dự, không thấy tên đầy đủ, ảnh đại diện hay liên hệ của từng người.
- AC-2: GIVEN khách chưa đăng nhập WHEN gọi API danh sách người tham dự hoặc hồ sơ chi tiết THEN trả 401.
- AC-3: GIVEN khách từ chối chia sẻ vị trí THEN danh sách vẫn hiển thị theo thời gian và khu vực.

## 11. Câu hỏi mở, giả thuyết và nghiên cứu vòng 2

### 11.1 Quyết định cần PO chốt

1. **Định vị đối tượng.** Brief §4 ghi "dành riêng expat", trong khi dữ liệu cho thấy du khách là nhóm đông nhất. Đề xuất của điều phối viên là **"expat-first, visitor-friendly"**:
   - Lớp cộng đồng giữ nguyên cho người ở lâu: RSVP, trust, chat, organizer.
   - Lớp khám phá mở cho du khách: trang công khai, chia sẻ, lọc. Du khách chỉ đọc nên không làm thay đổi mô hình trust; cần đăng ký khi RSVP.

   Đề xuất này phục vụ được nhiều khách nhất mà không đổi phân khúc seed S1.
2. **Ngưỡng seed FR-06** (đề xuất 5 sự kiện lễ hội/nhạc/trekking mỗi tuần).
3. **Hợp tác Danang 365 (BR-05)**: liên hệ trước Christmas Market 4–6/12/2026.

### 11.2 Câu hỏi còn mở

1. UC-09 (khách xem không đăng nhập) đã chạy thật chưa? Tech Lead kiểm trong code (doc 17).
2. Có tải lại được bản có tiếng của video 3 không?
3. Lễ hội trên biển mà V2 đi do ai tổ chức, và họ biết đến bằng cách nào?
4. Hoạt động ở Bà Nà Hills, Hội An (ngoài 6 khu MVP) có nằm trong phạm vi nội dung không? Liên quan GD-08.
5. Nội dung do creator hoặc du khách tạo ra thì ai kiểm duyệt, theo luật nào?
6. Du khách có thật sự cần một app riêng, hay trang sự kiện công khai cộng link chia sẻ là đủ? Câu trả lời quyết định mức đầu tư PWA.

### 11.3 Giả thuyết cần kiểm chứng

- **H1**: Du khách ngắn ngày đông nhưng không phải nguồn tạo sự kiện và RSVP lặp lại; nomad ở lâu mới là nhóm giữ chân (GD-01).
- **H2**: Nhu cầu family-friendly đủ lớn để đặt bộ lọc ở vị trí ưu tiên.
- **H3**: Creator giúp tăng trưởng qua link chia sẻ (GD-12).
- **H4**: Khách Hàn/Trung không dùng các nhóm Facebook tiếng Anh (S4).

### 11.4 Kế hoạch nghiên cứu vòng 2

- **Cỡ mẫu**: 24–30 phỏng vấn có cấu trúc. Với nhóm dưới 30 người chỉ báo số đếm, không báo phần trăm (`15` §4.1).
  - Nomad ở từ 1 tháng trở lên: 8
  - Khách Hàn: 4
  - Người Việt (S5): 4
  - Gia đình có trẻ nhỏ: 4
  - Organizer: 4
  - Du khách ≤ 1 tuần: 4
- **Địa điểm**: coworking An Thượng/Mỹ An, quán cà phê nomad, sân cầu lông, cổng trường quốc tế (khi được phép), bãi biển vào khung giờ khác, sự kiện của organizer.
- **Thời gian**: 19/10 – 13/11/2026, phải xong trước khi tuyển beta M5. **Đọc kết quả giữa kỳ ngày 30/10** (sau khoảng 12 cuộc, ưu tiên nomad và gia đình trước) để chốt các trường schema của FR-01/03/07 trước khi viết migration ở L4.
- **Kịch bản không dẫn dắt:**
  1. Hãy kể lần gần nhất bạn đi chơi hay làm gì đó ở Đà Nẵng. Bạn tìm ra nó thế nào?
  2. Tối hôm qua và tối tuần trước bạn đã làm gì?
  3. Khi muốn biết "hôm nay có gì", bạn mở cái gì đầu tiên?
  4. Lần gần nhất bạn gặp một người mới ở đây là khi nào? Chuyện diễn ra thế nào?
  5. Điều gì khó nhất khi tìm hoạt động ở đây?
  6. Bạn ở lại bao lâu? Nếu ở lâu hơn, bạn sẽ làm gì khác?
  7. Bạn đã từng thử cách nào để giải quyết chuyện đó?
  8. (Cuối cùng, tách riêng) Nếu có một nơi như thế này, nó có giúp bạn không? Cho một ví dụ gần nhất.
- **Quy tắc phỏng vấn**:
  - Bỏ khung "dạy tiếng Anh".
  - Chỉ giới thiệu sản phẩm ở cuối buổi.
  - Không gợi ý đáp án.
  - Ghi âm bằng mic riêng; kiểm tra file có tiếng ngay sau buổi, rút kinh nghiệm từ video 3.
- **Chỉ số thành công**:
  - Ít nhất 70% người trả lời kể được một ví dụ cụ thể trong 30 ngày gần nhất.
  - Xác định được kênh chính của từng phân khúc.
  - Ít nhất 3 phân khúc có từ 4 mẫu trở lên.
  - Có kết luận rõ cho H1–H4.

## 12. Khuyến nghị phạm vi gửi Tech Lead

Ràng buộc:
- Đội 3 người, TV1 gánh khoảng 60%.
- Velocity 28 SP/sprint, backlog còn 330 SP.
- M6 ngày 01/04/2027; freeze 28/12–01/01 và nghỉ Tết 01–12/02.
- Bus factor bằng 1.
- M1 đang quá hạn.

| Hành động | Hạng mục | Lý do |
|---|---|---|
| **Thêm** (rẻ, nhiều phân khúc) | FR-01, FR-03, FR-07, FR-13 (gộp một migration); FR-02; FR-04; NFR-05; NFR-06; FR-12 | Điểm cao, Effort S–M; gộp vào M2 (13/11); thêm field sớm tránh backfill sau khi đã seed nhiều dữ liệu |
| **Thêm** (không tốn code) | FR-06, BR-05, BR-06 | Việc curate, đối tác và thông điệp, do PO/Founder làm |
| **Cân nhắc** | Mốc "public read-only" trước Nomad Fest 19–28/3/2027 | Không bỏ lỡ đỉnh mùa nomad (giữa tháng 2 – giữa tháng 5); Tech Lead đánh giá khả thi |
| **Giữ** | FR-05 (xác minh trước), PWA (TV2), RSVP/waitlist, trust, moderation | Đã trong kế hoạch |
| **Giữ, không mở rộng** | Bản đồ/swipe, post, chat | Đã xây, chưa có bằng chứng nhu cầu |
| **Dời** | FR-08, FR-09, FR-10, BR-02 | Bằng chứng yếu; xem lại sau vòng 2 |
| **Không làm** | FR-11 | Chỉ là giả thuyết; chờ dữ liệu S4 |
| **Không đổi** | Seed S1 (BR-03) | Video không bác bỏ cũng không củng cố S1 |

**Cảnh báo**: đừng nới phạm vi vì 2 cuộc phỏng vấn có thiên lệch. Hai việc ưu tiên nhất tuần này là **khởi động nghiên cứu vòng 2** và **đóng M1 đang quá hạn** (xác minh email, Google login, đặt lại mật khẩu).
