---
name: frontend-design
description: Dựng giao diện frontend khác biệt, đạt chuẩn production với chất lượng thiết kế cao. Dùng khi người dùng yêu cầu xây component web, trang, artifact, poster hoặc ứng dụng (ví dụ website, landing page, dashboard, component React, layout HTML/CSS, hoặc khi cần style/làm đẹp bất kỳ UI web nào). Sinh ra code và thiết kế UI sáng tạo, chỉn chu, tránh thẩm mỹ "AI slop" chung chung.
license: Điều khoản đầy đủ trong LICENSE.txt
---

> **Ghi chú cho Da Nang Connect:** đây là skill gốc từ Anthropic, giữ nguyên bản
> chung. Khi làm UI thật cho `apps/web` hoặc `apps/mobile`, dùng
> [modern-ui-design](../modern-ui-design/SKILL.md) — nó bọc các nguyên tắc dưới đây
> bằng design token, ràng buộc stack và checklist i18n EN/VI của dự án. Skill này
> phù hợp cho artifact rời, landing page và bản thăm dò thẩm mỹ.

Skill này hướng dẫn tạo ra giao diện frontend khác biệt, đạt chuẩn production, tránh thứ thẩm mỹ "AI slop" chung chung. Hãy viết code chạy thật, với sự chú ý đặc biệt tới chi tiết thẩm mỹ và các lựa chọn sáng tạo.

Người dùng đưa ra yêu cầu frontend: một component, một trang, một ứng dụng hoặc một giao diện cần dựng. Họ có thể kèm theo bối cảnh về mục đích, đối tượng người dùng, hoặc ràng buộc kỹ thuật.

## Tư duy thiết kế

Trước khi code, hãy hiểu bối cảnh và chốt một hướng thẩm mỹ DỨT KHOÁT:
- **Mục đích**: Giao diện này giải quyết vấn đề gì? Ai dùng nó? (Với Da Nang Connect: expat tại Đà Nẵng, phần lớn mở app trên điện thoại khi đang di chuyển, ngôn ngữ mặc định là tiếng Anh.)
- **Tông (tone)**: Chọn một thái cực: tối giản đến khắc nghiệt, maximalism hỗn loạn, retro-futuristic, hữu cơ/tự nhiên, sang trọng/tinh tế, vui tươi/đồ chơi, kiểu tạp chí/editorial, brutalist/thô mộc, art deco/hình học, pastel/mềm mại, công nghiệp/thực dụng, v.v. Có rất nhiều hương vị để chọn. Dùng chúng làm nguồn cảm hứng nhưng hãy thiết kế một hướng trung thành với định hướng thẩm mỹ đã chọn.
- **Ràng buộc**: Yêu cầu kỹ thuật (framework, hiệu năng, khả năng tiếp cận).
- **Điểm khác biệt**: Điều gì khiến nó KHÔNG THỂ QUÊN? Một thứ duy nhất mà người ta sẽ nhớ là gì?

**QUAN TRỌNG**: Chọn một định hướng ý niệm rõ ràng và thực thi nó thật chính xác. Maximalism táo bạo và minimalism tinh tế đều dùng được — mấu chốt là sự chủ đích, không phải cường độ.

Sau đó viết code chạy thật (HTML/CSS/JS, React, Vue, v.v.) đạt các tiêu chí:
- Đạt chuẩn production và hoạt động thật
- Ấn tượng thị giác, đáng nhớ
- Đồng nhất, có quan điểm thẩm mỹ rõ ràng
- Trau chuốt tới từng chi tiết

## Nguyên tắc thẩm mỹ frontend

Tập trung vào:
- **Typography**: Chọn font đẹp, độc đáo, thú vị. Tránh các font chung chung như Arial và Inter; thay vào đó chọn những font có cá tính, nâng tầm thẩm mỹ của frontend; những lựa chọn font bất ngờ, có chất riêng. Ghép một display font khác biệt với một body font tinh tế.
- **Màu sắc & Theme**: Cam kết với một thẩm mỹ đồng nhất. Dùng CSS variable để giữ nhất quán. Màu chủ đạo mạnh kèm màu nhấn sắc bén luôn hiệu quả hơn bảng màu rụt rè, chia đều.
- **Chuyển động (motion)**: Dùng animation cho hiệu ứng và micro-interaction. Ưu tiên giải pháp thuần CSS cho HTML. Dùng thư viện Motion cho React khi có sẵn. Tập trung vào các khoảnh khắc có sức nặng: một lần page load được dàn dựng tốt với các lớp hiện dần so le (`animation-delay`) tạo cảm giác thích thú hơn nhiều micro-interaction rải rác. Dùng scroll-triggering và hover state gây bất ngờ.
- **Bố cục không gian**: Layout bất ngờ. Bất đối xứng. Chồng lớp. Dòng chảy chéo. Phần tử phá vỡ grid. Khoảng trắng hào phóng HOẶC mật độ dày có kiểm soát.
- **Nền & chi tiết thị giác**: Tạo không khí và chiều sâu thay vì mặc định dùng màu đặc. Thêm hiệu ứng và texture theo ngữ cảnh, khớp với thẩm mỹ tổng thể. Áp dụng các hình thức sáng tạo như gradient mesh, noise texture, hoa văn hình học, lớp trong suốt chồng nhau, đổ bóng mạnh, viền trang trí, con trỏ tuỳ biến và lớp phủ grain.

TUYỆT ĐỐI KHÔNG dùng thẩm mỹ kiểu AI sinh ra hàng loạt: các họ font bị lạm dụng (Inter, Roboto, Arial, system font), bảng màu sáo mòn (đặc biệt là gradient tím trên nền trắng), layout và pattern component đoán được trước, thiết kế rập khuôn thiếu cá tính riêng theo bối cảnh.

Hãy diễn giải một cách sáng tạo và đưa ra những lựa chọn bất ngờ, thực sự được thiết kế cho đúng bối cảnh đó. Không thiết kế nào được giống thiết kế nào. Luân phiên giữa theme sáng và tối, font khác nhau, thẩm mỹ khác nhau. TUYỆT ĐỐI KHÔNG hội tụ về những lựa chọn phổ biến (ví dụ Space Grotesk) qua các lần sinh khác nhau.

### Ví dụ neo theo Da Nang Connect

Khi thăm dò thẩm mỹ cho sản phẩm này, hãy lấy chính component thật làm bài tập
thay vì component giả định:

| Component | Vấn đề thiết kế thật cần giải |
| --- | --- |
| `EventCard` | Ảnh bìa, tiêu đề, giờ theo timezone người xem, badge khu vực, số chỗ còn lại / trạng thái waitlist — tất cả trong một thẻ đọc lướt được trên màn hình điện thoại. |
| `AreaFilter` | Sáu khu vực (An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn) chọn được nhanh bằng ngón cái, thấy rõ cái nào đang bật, không đẩy feed xuống quá sâu. |
| `RsvpButton` | Một nút mang bốn trạng thái — còn chỗ, đã RSVP, đã đầy (vào waitlist), đang xử lý — mà không cần đọc chữ mới hiểu. |

Ràng buộc luôn đúng cho mọi ví dụ của dự án: **viewport mobile là mặc định**, chữ
hiển thị mặc định là tiếng Anh (tiếng Việt là ngôn ngữ thứ hai, chuỗi VI dài hơn
~30% nên layout phải chịu được), thời gian lưu UTC và hiển thị theo timezone của
người xem.

**QUAN TRỌNG**: Khớp độ phức tạp của code với tầm nhìn thẩm mỹ. Thiết kế maximalist cần code công phu với nhiều animation và hiệu ứng. Thiết kế tối giản hoặc tinh tế cần sự kiềm chế, độ chính xác và chú ý kỹ tới khoảng cách, typography và các chi tiết nhỏ. Sự thanh lịch đến từ việc thực thi tầm nhìn cho tốt.

Nhớ rằng: Claude có khả năng làm những việc sáng tạo phi thường. Đừng giữ mình, hãy cho thấy thứ thật sự có thể tạo ra khi nghĩ ra ngoài khuôn khổ và cam kết trọn vẹn với một tầm nhìn khác biệt.
