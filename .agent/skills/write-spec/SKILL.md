---
name: write-spec
description: Write a feature spec or PRD for Da Nang Connect from a problem statement or feature idea. Use when turning a vague idea or user request into a structured document, scoping a feature with goals and non-goals, defining success metrics and acceptance criteria, or breaking a big ask into a phased spec. Trigger on "viết spec", "làm PRD", "chốt scope", "định nghĩa success metrics".
---

# Write Spec

> Placeholder như **~~knowledge base**, **~~chat**, **~~project tracker** = connector/MCP tương ứng nếu được kết nối (Notion, Slack, Linear...). Nếu không có, bỏ qua bước đó.

Viết đặc tả tính năng (feature spec) hoặc tài liệu yêu cầu sản phẩm (PRD) cho
**Da Nang Connect** — nền tảng kết nối cộng đồng người nước ngoài tại Đà Nẵng.

## Tích hợp vào dự án — Da Nang Connect

- **Nơi lưu output:** lưu spec tại `.agent/specs/<capability>.md`. Frontmatter chuẩn:
  `capability`, `status: draft`, `owner-apps` (`api` · `web` · `mobile` · `shared-types`),
  `phase` (1 kết nối cộng đồng · 2 nhà ở · 3 y tế), `last-updated`. Nếu repo đã có
  `.agent/specs/_TEMPLATE.md` thì dùng nó; nếu chưa, tạo file template đó luôn.
  Spec là nguồn sự thật duy nhất — **sửa spec trước khi sửa code**. Đăng ký capability
  vào `.agent/specs/capability-map.md`.
- **Vị trí trong pipeline:** chạy TRƯỚC skill `business-analyst` trong luồng BA-first.
  Các mục BR/UC/FR/NFR của spec là đầu vào cho BA Requirement Brief; `business-analyst`
  suy ra acceptance criteria từ đó, rồi `story-writer` cắt thành Epic/Story. Feature
  lớn vẫn phải qua **cổng phê duyệt HARD STOP** trước khi implement.
- **Actor trong domain này:** expat member, event organizer (nghiệp dư & chuyên nghiệp),
  local bilingual host, content curator (đội sáng lập), community moderator, support,
  admin / super admin, và hệ thống (`apps/api` NestJS). Chi tiết:
  [`docs/analysis/01-tac-nhan-va-phan-quyen.md`](../../../docs/analysis/01-tac-nhan-va-phan-quyen.md).
- **Kiến trúc để bám:** `apps/api` (NestJS 11 + TypeORM + PostgreSQL 16/PostGIS + Redis/BullMQ)
  · `apps/web-client-side` (Next.js 16 App Router + React 19 + Tailwind, web người dùng cuối)
  · `apps/web-admin-side` (cùng stack Next.js 16, console vận hành — không SEO, ưu tiên desktop)
  · `apps/mobile` (Expo 54 + RN 0.81)
  · `packages/shared-types`. Client chỉ nói chuyện với API qua REST `/api/v1`.
- **NFR checklist bắt buộc cho mọi spec ở đây:**

  | NFR | Câu hỏi phải trả lời trong spec |
  |---|---|
  | **i18n** | Chuỗi mới có key ở cả `en.json` và `vi.json`? Đây là chrome hệ thống hay nội dung user tạo (`content_locale`)? |
  | **Thời gian** | Lưu UTC (`timestamptz`), hiển thị `Asia/Ho_Chi_Minh`. Biên bộ lọc ("tonight", "this weekend") tính theo giờ Đà Nẵng? |
  | **Địa lý** | Lọc theo cây `areas` (An Thượng · Mỹ Khê · Mỹ An · Hải Châu · Sơn Trà · Ngũ Hành Sơn) hay bán kính `ST_DWithin` (mét)? Có index GIST chưa? |
  | **Trust & quyền** | Role nào, `trust_level` (T0–T5) tối thiểu nào? Kiểm quyền sở hữu ở đâu? Enforce ở **tầng API**, không chỉ ẩn UI. |
  | **Đồng thời** | Có đụng sức chứa/đếm không → lock, đếm nguyên tử, waitlist, `Idempotency-Key`. |
  | **Realtime & push** | socket.io event nào? Expo Push gửi cho ai, lúc nào, locale nào, khung giờ nào? Job BullMQ nào? |
  | **Kiểm duyệt UGC** | Nội dung có report được không? Ẩn được mà không xoá? Hành động vận hành ghi `audit_log` bất biến? |
  | **Cross-platform parity** | Hành vi người dùng cuối tồn tại ở cả `apps/web-client-side` và `apps/mobile`? Phần vận hành đã đặt đúng chỗ ở `apps/web-admin-side` chưa? Khác biệt chính đáng đã ghi lý do? |
  | **SEO** | Trang public trên `apps/web-client-side` có SSR + `generateMetadata()` + JSON-LD `Event` + `notFound()` cho 404? (`apps/web-admin-side` KHÔNG index — `robots: noindex`.) |
  | **Dữ liệu cá nhân** | Thu thập gì, vì sao, lưu bao lâu, xoá thế nào — thu tối thiểu, trả về qua DTO allow-list. |
  | **Migration** | Có đổi schema không? Nếu có → DỪNG xin phê duyệt (skill [`database-migrations`](../database-migrations/SKILL.md)). |

- Với feature còn mơ hồ hoặc hoàn toàn mới, chạy [feature-discovery](../feature-discovery/SKILL.md)
  trước → Discovery Brief được duyệt → rồi mới tới skill này.

## Cách gọi

```
/write-spec
```

## Quy trình

### 1. Hiểu feature

Hỏi user họ muốn spec cái gì. Chấp nhận mọi dạng đầu vào:
- Tên tính năng ("recurring events")
- Phát biểu vấn đề ("expat cứ bỏ lỡ sự kiện vì nó chìm trong feed Facebook")
- Yêu cầu người dùng ("organizer muốn xuất danh sách người tham gia")
- Ý tưởng mơ hồ ("nên làm gì đó với chuyện no-show")

### 2. Thu thập ngữ cảnh

Hỏi user những điều sau. Nói chuyện tự nhiên — đừng dội hết câu hỏi một lúc. Hỏi
cái quan trọng nhất trước, lấp chỗ trống dần:

- **Vấn đề của người dùng**: giải quyết vấn đề gì? Ai gặp phải?
- **Người dùng mục tiêu**: phục vụ nhóm nào (member mới tới · organizer nghiệp dư · organizer chuyên nghiệp · local host · curator · moderator)?
- **Chỉ số thành công**: làm sao biết là đã thành công?
- **Ràng buộc**: kỹ thuật, thời gian, phụ thuộc.
- **Giai đoạn**: thuộc GĐ1 (kết nối cộng đồng), GĐ2 (nhà ở) hay GĐ3 (y tế/dịch vụ chuyên môn)?
- **Đã có gì trước đó**: đã từng thử chưa? Có giải pháp sẵn không (xem tài liệu phân tích trong `docs/analysis/`)?

### 3. Kéo ngữ cảnh từ công cụ đã kết nối

Nếu **~~project tracker** được kết nối:
- Tìm ticket, epic, feature liên quan
- Kéo về requirement hoặc acceptance criteria đã có
- Xác định phụ thuộc với công việc khác

Nếu **~~knowledge base** được kết nối:
- Tìm tài liệu nghiên cứu, spec cũ, design doc liên quan
- Kéo về kết quả nghiên cứu người dùng
- Tìm biên bản họp hoặc quyết định đã chốt

Nếu **~~design** được kết nối:
- Kéo về mockup, wireframe, bản khám phá thiết kế
- Tìm component design system liên quan

Nếu chưa kết nối công cụ nào, làm việc hoàn toàn với thông tin user cung cấp cộng
với `docs/analysis/`. Đừng yêu cầu user đi kết nối công cụ — cứ tiến hành.

### 4. Sinh PRD

Tạo PRD có cấu trúc gồm các mục sau. Xem **Cấu trúc PRD** bên dưới để biết chi
tiết từng mục:

- **Problem Statement**: vấn đề của người dùng, ai bị ảnh hưởng, hệ quả nếu không giải (2-3 câu)
- **Goals**: 3-5 kết quả cụ thể, đo được, gắn với chỉ số người dùng hoặc kinh doanh
- **Non-Goals**: 3-5 thứ tường minh nằm ngoài phạm vi, kèm lý do ngắn
- **User Stories**: format chuẩn ("As a [user type], I want [capability] so that [benefit]"), nhóm theo persona
- **Requirements**: phân loại Must-Have (P0), Nice-to-Have (P1), Future (P2), mỗi cái kèm acceptance criteria
- **NFR**: điền hết bảng NFR checklist ở phần "Tích hợp vào dự án" phía trên
- **Success Metrics**: chỉ số dẫn (đổi nhanh) và chỉ số trễ (đổi chậm), kèm mục tiêu cụ thể
- **Open Questions**: câu hỏi chưa có lời giải, gắn nhãn ai cần trả lời (engineering, design, data)
- **Timeline Considerations**: hạn cứng, phụ thuộc, và cách chia pha

### 5. Rà soát & lặp

Sau khi sinh PRD:
- Hỏi user mục nào cần chỉnh
- Đề nghị mở rộng mục cụ thể
- Đề nghị tạo artifact tiếp theo (BA Requirement Brief qua `business-analyst`, Epic/Story qua `story-writer`, design brief, bản trình bày cho stakeholder)

## Cấu trúc PRD

### Problem Statement
- Mô tả vấn đề của người dùng trong 2-3 câu
- Ai gặp phải và gặp thường xuyên thế nào
- Cái giá của việc không giải (nỗi đau người dùng, tác động kinh doanh, rủi ro cạnh tranh)
- Dựa trên bằng chứng: nghiên cứu người dùng, dữ liệu hỗ trợ, số liệu, phản hồi thực tế

### Goals
- 3-5 kết quả cụ thể, đo được mà feature này phải đạt
- Mỗi mục tiêu trả lời được: "Làm sao biết là đã thành công?"
- Tách mục tiêu người dùng (họ nhận được gì) và mục tiêu kinh doanh (sản phẩm nhận được gì)
- Mục tiêu là **kết quả**, không phải sản phẩm đầu ra ("giảm 50% thời gian từ mở app tới RSVP thành công", không phải "xây màn hình lọc")

### Non-Goals
- 3-5 thứ feature này tường minh KHÔNG làm
- Các năng lực kề cận nằm ngoài phạm vi phiên bản này
- Với mỗi non-goal, giải thích ngắn vì sao ngoài phạm vi (chưa đủ tác động, quá phức tạp, là sáng kiến riêng, còn sớm)
- Non-goal chặn scope creep khi triển khai và đặt kỳ vọng đúng với stakeholder
- Với dự án này, non-goal hay gặp: "chưa có thanh toán", "chưa mở ngoài Đà Nẵng", "chưa kích hoạt role `service_provider`"

### User Stories
Viết theo format chuẩn: "As a [user type], I want [capability] so that [benefit]"

Hướng dẫn:
- User type phải đủ cụ thể để có ý nghĩa ("first-week expat", không chỉ "user")
- Capability mô tả họ muốn *đạt được gì*, không phải làm bằng cách nào
- Benefit giải thích "vì sao" — giá trị mang lại
- Bao gồm cả edge case: trạng thái lỗi, trạng thái rỗng, điều kiện biên
- Bao gồm nhiều loại người dùng nếu feature phục vụ nhiều persona
- Sắp theo độ ưu tiên — story quan trọng nhất lên trước

Ví dụ:
- "As a first-week expat, I want to filter events by my neighbourhood so that I only see things I can actually walk to"
- "As an amateur organizer, I want to duplicate last week's badminton session so that I do not retype everything each time"
- "As an attendee, I want to see who else is going so that I feel safe showing up alone"
- "As a content curator, I want to invite the original organizer to claim a listing so that they take over without losing existing RSVPs"

### Requirements

**Must-Have (P0)**: không có thì không ship được. Đây là bản khả dụng tối thiểu. Hỏi: "Cắt cái này đi thì feature còn giải được vấn đề cốt lõi không?" Nếu không → P0.

**Nice-to-Have (P1)**: cải thiện đáng kể trải nghiệm nhưng use case cốt lõi vẫn chạy nếu thiếu. Thường thành fast-follow sau khi ra mắt.

**Future Considerations (P2)**: tường minh ngoài phạm vi v1 nhưng muốn thiết kế sao cho sau này làm được. Ghi ra để tránh quyết định kiến trúc vô tình làm khó về sau (ví dụ: schema `areas` phân cấp từ `city` để mở rộng đa thành phố ở giai đoạn sau).

Với mỗi requirement:
- Viết mô tả rõ ràng, không mơ hồ về hành vi mong đợi
- Kèm acceptance criteria (xem bên dưới)
- Ghi các cân nhắc/ràng buộc kỹ thuật
- Nêu cờ phụ thuộc vào nhóm hoặc hệ thống khác

### Open Questions
- Câu hỏi cần lời giải trước hoặc trong lúc triển khai
- Gắn nhãn ai nên trả lời (engineering, design, data, stakeholder)
- Phân biệt câu hỏi chặn (phải trả lời trước khi bắt đầu) và không chặn (giải quyết dần)

### Timeline Considerations
- Hạn cứng (cam kết hợp đồng, sự kiện, mốc tuân thủ)
- Phụ thuộc vào công việc hoặc bản phát hành của nhóm khác
- Đề xuất chia pha nếu feature quá lớn cho một lần phát hành
- Lưu ý riêng cho `apps/mobile`: app đã cài trên máy user không tự cập nhật ngay → đổi API phải tương thích ngược trong một khoảng thời gian

## Cách viết User Story

User story tốt phải:
- **Independent**: phát triển và giao được độc lập
- **Negotiable**: chi tiết còn thương lượng được, story không phải hợp đồng
- **Valuable**: mang giá trị cho người dùng (không chỉ cho đội làm)
- **Estimable**: đội ước lượng được công sức
- **Small**: xong được trong một sprint/vòng lặp
- **Testable**: có cách rõ ràng để xác minh

### Lỗi hay gặp trong user story
- Quá mơ hồ: "As a user, I want the app to be faster" — nhanh hơn ở chỗ nào?
- Áp đặt giải pháp: "As a user, I want a dropdown menu" — mô tả nhu cầu, đừng mô tả widget
- Thiếu benefit: "As a user, I want to tap a button" — để làm gì?
- Quá lớn: "As an organizer, I want to manage my events" — cắt thành các năng lực cụ thể
- Hướng nội bộ: "As the engineering team, we want to refactor the database" — đây là task, không phải user story

## Phân loại Requirement

### Khung MoSCoW
- **Must have**: thiếu thì feature không khả thi. Không thương lượng.
- **Should have**: quan trọng nhưng không chặn ra mắt. Fast-follow ưu tiên cao.
- **Could have**: có thì tốt nếu còn thời gian. Cắt đi không làm trễ.
- **Won't have (lần này)**: tường minh ngoài phạm vi. Có thể xem lại ở phiên bản sau.

### Mẹo phân loại
- Tàn nhẫn với P0. Danh sách must-have càng chặt, càng ship nhanh và học nhanh.
- Nếu mọi thứ đều P0 thì chẳng cái nào là P0. Chất vấn từng must-have: "Thực sự không ship nếu thiếu cái này à?"
- P1 nên là thứ bạn tự tin sẽ làm sớm, không phải danh sách ước.
- P2 là bảo hiểm kiến trúc — chúng định hướng quyết định thiết kế dù chưa build.

## Định nghĩa Success Metrics

### Chỉ số dẫn (leading)
Đổi nhanh sau khi ra mắt (vài ngày tới vài tuần):
- **Tỷ lệ tiếp nhận**: % người dùng đủ điều kiện có thử feature
- **Tỷ lệ kích hoạt**: % người dùng hoàn thành hành động cốt lõi (ví dụ: RSVP thành công đầu tiên)
- **Tỷ lệ hoàn thành tác vụ**: % người dùng đạt được mục tiêu của họ
- **Thời gian hoàn thành**: luồng cốt lõi mất bao lâu (mục tiêu: tạo event <90 giây trên mobile; RSVP trong 2 chạm)
- **Tỷ lệ lỗi**: người dùng gặp lỗi hoặc ngõ cụt bao thường xuyên
- **Tần suất quay lại**: bao lâu họ dùng lại feature

Chỉ số dẫn đặc thù của sản phẩm này: tỷ lệ RSVP/lượt xem chi tiết, tỷ lệ no-show,
tỷ lệ event bị huỷ vì thiếu người, tỷ lệ curated listing được claim.

### Chỉ số trễ (lagging)
Cần thời gian mới thấy (vài tuần tới vài tháng):
- **Tác động giữ chân**: feature có cải thiện retention không (W1 retention là chỉ số chủ đạo)
- **Tác động doanh thu**: có thúc đẩy nâng cấp/mở rộng/doanh thu mới không (giai đoạn sau)
- **Thay đổi NPS / mức hài lòng**
- **Giảm tải hỗ trợ**: có giảm số ticket không
- **Sức khoẻ cung**: số organizer hoạt động, số event/tuần, tỷ lệ organizer tạo event thứ hai trong 30 ngày

### Đặt mục tiêu
- Mục tiêu phải cụ thể: "35% W1 retention trong 30 ngày", không phải "retention cao"
- Dựa trên feature tương đương, benchmark ngành, hoặc giả thuyết tường minh
- Đặt ngưỡng "đạt" và ngưỡng "vượt kỳ vọng"
- Định nghĩa cách đo: công cụ nào, truy vấn nào, cửa sổ thời gian nào
- Nói rõ khi nào đánh giá: 1 tuần, 1 tháng, 1 quý sau ra mắt

## Acceptance Criteria

Viết theo Given/When/Then hoặc dạng checklist:

**Given/When/Then**:
- Given [tiền điều kiện hoặc ngữ cảnh]
- When [hành động người dùng thực hiện]
- Then [kết quả mong đợi]

Ví dụ:
- Given một occurrence đã đầy chỗ và người dùng đã xác thực số điện thoại (T2)
- When họ bấm "Join waitlist"
- Then API trả `201 {status:"waitlisted", position:k}` và UI hiển thị vị trí k trong hàng chờ

**Dạng checklist**:
- [ ] Member lọc được sự kiện theo area (An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn)
- [ ] Lọc theo area bao gồm cả area con trong cây phân cấp
- [ ] Bán kính dùng `ST_DWithin` với đơn vị mét, không phải độ
- [ ] Bộ lọc "Tonight" tính biên theo `Asia/Ho_Chi_Minh`, không theo UTC
- [ ] Trạng thái rỗng có key i18n ở cả `en.json` và `vi.json`, kèm gợi ý nới bộ lọc
- [ ] Người chưa RSVP không lấy được toạ độ chính xác qua API (không chỉ ẩn ở UI)

### Mẹo viết Acceptance Criteria
- Phủ happy path, trường hợp lỗi, và edge case
- Cụ thể về hành vi mong đợi, không phải về cách hiện thực
- Nêu cả điều **không** được xảy ra (negative test case)
- Mỗi tiêu chí phải kiểm thử được độc lập
- Tránh từ mơ hồ: "nhanh", "thân thiện", "trực quan" — định nghĩa cụ thể
- Với dự án này, luôn có ít nhất một AC cho: lỗi mạng, đồng thời (nếu đụng sức chứa), quyền riêng tư ở tầng API, i18n, và múi giờ

## Quản lý phạm vi

### Nhận diện scope creep
Scope creep xảy ra khi:
- Requirement tiếp tục được thêm sau khi spec đã duyệt
- Các bổ sung "nhỏ" dồn lại thành một dự án lớn hơn hẳn
- Đội đang build tính năng không ai yêu cầu ("tiện tay làm luôn...")
- Ngày ra mắt cứ lùi mà không ai tường minh chỉnh lại scope
- Stakeholder thêm yêu cầu mà không bỏ bớt gì

### Phòng scope creep
- Viết non-goal tường minh trong mọi spec
- Mọi bổ sung scope phải kèm một cắt bớt scope hoặc một gia hạn thời gian
- Tách "v1" và "v2" rõ ràng trong spec; với dự án này còn có trục **giai đoạn** (GĐ1/2/3)
- Đối chiếu spec với problem statement gốc — mọi thứ trong đó có phục vụ nó không?
- Giới hạn thời gian điều tra: "Nếu 2 ngày không tìm ra X thì cắt"
- Lập "bãi đỗ" cho ý tưởng hay nhưng ngoài phạm vi (`.agent/future-plans/`)

## Định dạng output

Dùng markdown với heading rõ ràng. Giữ tài liệu quét mắt được — stakeholder bận
chỉ đọc heading và chữ in đậm cũng nắm được ý chính.

**Không dùng đường dẫn tuyệt đối** — luôn dùng đường dẫn tương đối tính từ gốc repo
(`apps/api/src/...`, `.agent/specs/...`).

## Mẹo

- Có quan điểm rõ ràng về scope. Một spec chặt và rõ tốt hơn một spec rộng và mơ hồ.
- Nếu ý tưởng của user quá lớn cho một spec, đề xuất chia pha và spec pha đầu tiên.
- Success metrics phải cụ thể và đo được, không mơ hồ kiểu "cải thiện trải nghiệm".
- Non-goal quan trọng ngang goal. Chúng chặn scope creep khi triển khai.
- Open question phải thực sự mở — đừng đưa vào câu hỏi mà bạn tự trả lời được từ `docs/analysis/`.
- Luôn đặt feature vào đúng giai đoạn. Thứ thuộc GĐ2 (nhà ở) hay GĐ3 (y tế) thì viết vào roadmap, đừng nhét vào MVP của GĐ1.
