---
name: feature-discovery
description: Research and map a feature completely before writing a single line of code for Da Nang Connect (expat community platform in Da Nang — events, RSVP, area discovery, trust levels). Use when a feature is vague, when the user says "I want something like X but not sure what exactly", or before any medium/large feature to avoid building the wrong thing. Trigger on "phân tích chức năng", "research sản phẩm tương tự", "lập PRD/MVP", "giúp tôi nghĩ feature". Produces a Discovery Brief with competitor patterns, jobs-to-be-done, feature map, MVP scope, and acceptance criteria. STOPS before implementation.
allowed-tools: Read, WebFetch, Bash
---

# Feature Discovery — Nghiên cứu trước khi build

> **Nguồn / Provenance:**
> - BMAD Method (analyst/PM/PO/story-first workflow) — https://github.com/bmad-at-claude
> - anthropics/claude-plugins-official · feature-dev (code-explorer, code-architect) — https://github.com/anthropics/claude-plugins-official/tree/main/plugins/feature-dev
> - dsifry/metaswarm (parallel design review: PM/Architect/Designer/Security) — https://github.com/dsifry/metaswarm
> - Jobs-to-be-done framework (Christensen / Intercom)

## Khi nào chạy skill này

- User nói: "tôi muốn build X nhưng chưa hình dung rõ", "phân tích chức năng", "giúp tôi nghĩ feature", "research sản phẩm tương tự", "lập PRD/MVP".
- Bất kỳ feature vừa hoặc lớn nào, **trước khi** skill `business-analyst` viết acceptance criteria.
- Khi feature chạm tới một actor chưa từng được thiết kế cho (ví dụ `curator`, `moderator`, hoặc actor giai đoạn 2–3).

## Luật cứng

**Skill này kết thúc bằng một Discovery Brief, KHÔNG phải bằng code.** Không
implement bất cứ thứ gì. Trình bày brief, nêu rõ câu hỏi mở, rồi DỪNG.
Implementation chỉ bắt đầu sau khi user phê duyệt tường minh và bàn giao sang
`business-analyst`.

---

## Bước 1 — Làm rõ người dùng mục tiêu & mục tiêu kinh doanh

Xác định feature này thực sự phục vụ ai. Với Da Nang Connect, các actor ứng viên là:

- **Expat / member** — mới tới Đà Nẵng, cô đơn, muốn biết "tuần này có gì diễn ra" và dám đi gặp người lạ
- **Event organizer (nghiệp dư)** — tổ chức buổi cầu lông, nhóm chạy, cà phê ngôn ngữ; cần đủ người, sợ no-show
- **Event organizer (chuyên nghiệp)** — quán bar, phòng gym, trung tâm ngôn ngữ, studio yoga; cần dòng khách ổn định + số liệu
- **Local bilingual host** — người Việt nói tiếng Anh dẫn hoạt động; cần được tin, không bị nghi động cơ thương mại
- **Content curator (đội sáng lập)** — đăng lại hoạt động từ nguồn công khai, mời organizer gốc claim listing
- **Community moderator** — xử lý report, ẩn nội dung, hạn chế tài khoản
- **Admin / super admin** — cấu hình, analytics, phân quyền, audit
- **Service provider (GĐ2 nhà ở / GĐ3 y tế)** — thiết kế trước, **chưa kích hoạt** ở giai đoạn 1

Chi tiết persona: [`../../../docs/analysis/01-tac-nhan-va-phan-quyen.md`](../../../docs/analysis/01-tac-nhan-va-phan-quyen.md).

Với mỗi actor liên quan, trả lời:
1. Họ đang cố hoàn thành công việc gì? (một câu, bắt đầu bằng động từ)
2. Hôm nay họ mắc kẹt hoặc làm sai ở đâu?
3. Feature này giúp họ ra quyết định gì?
4. Nếu không có feature này, họ đang xoay xở bằng cách nào (Facebook Group? WhatsApp? hỏi bạn?)
5. Sai sót nào trong luồng hiện tại làm mất tiền, mất thời gian, hoặc mất niềm tin?

**Bộ lọc bắt buộc:** *"Một expat mới tới Đà Nẵng 3 ngày, không đọc được tiếng
Việt, đang dùng 4G ngoài đường — có hiểu và làm xong việc này trong dưới 60 giây
không?"*

---

## Bước 2 — Nghiên cứu sản phẩm tương tự

**Với domain cộng đồng expat / sự kiện / gặp gỡ ngoài đời**, xem các sản phẩm sau
trước (họ đã giải nhiều bài toán này rồi — đọc help docs, review trên app store,
và demo trên YouTube):

| Sản phẩm | URL | Mạnh ở |
|---|---|---|
| **InterNations** | https://www.internations.org | Cộng đồng expat theo thành phố — analogue gần nhất |
| **Meetup** | https://www.meetup.com | Nhóm sở thích, sự kiện lặp lại, RSVP + waitlist |
| **Luma** | https://lu.ma | Tạo sự kiện siêu nhanh, trang sự kiện đẹp, nhắc lịch |
| **Eventbrite** | https://www.eventbrite.com | Khám phá sự kiện theo khu vực, SEO trang sự kiện |
| **Couchsurfing Hangouts** | https://www.couchsurfing.com | Gặp người lạ ngay hôm nay, mô hình tin cậy/vouch |
| **Timeleft** | https://timeleft.com | An toàn khi gặp người lạ, ghép nhóm, chống no-show |
| **Spond** | https://www.spond.com | Nhóm thể thao nghiệp dư, điểm danh, sự kiện định kỳ |
| **Playtomic** | https://playtomic.com | Đặt sân + tìm người chơi cùng theo trình độ |
| **Tandem / HelloTalk** | https://tandem.net · https://www.hellotalk.com | Trao đổi ngôn ngữ, ghép cặp theo cặp ngôn ngữ |
| **Bumble BFF** | https://bumble.com/bff | Kết bạn mới, an toàn cho nữ, báo cáo/chặn |
| **Nomads.com** | https://nomads.com | Cộng đồng digital nomad theo thành phố |
| **Expat.com** | https://www.expat.com | Forum + directory cho người nước ngoài |

Với mỗi sản phẩm liên quan, fetch help docs hoặc trang tính năng:

```bash
# Fetch help doc hoặc trang tính năng (đổi URL theo từng sản phẩm)
# WebFetch: https://www.meetup.com/help/
# WebFetch: https://help.lu.ma/
# WebFetch: https://www.internations.org/faq
```

Tìm thêm:
```bash
# Review trên app store (pain point thật từ người dùng thật)
# WebFetch: https://apps.apple.com/us/app/meetup/id<id>?see-all=reviews
# Thảo luận trên Reddit
# WebFetch: https://www.reddit.com/r/digitalnomad/search/?q=<feature-keyword>+app
# WebFetch: https://www.reddit.com/r/expats/search/?q=<feature-keyword>
# WebFetch: https://www.reddit.com/r/VietNam/search/?q=danang+<feature-keyword>
```

Rút ra cho mỗi sản phẩm: họ làm tốt cái gì, người dùng phàn nàn cái gì, và luồng
làm việc của họ cho feature này ra sao.

> ⚠️ **Ranh giới nghiên cứu:** nghiên cứu = đọc và học. **Không** thu thập tự động dữ
> liệu sự kiện từ các nền tảng này. Chiến lược nội dung của Da Nang Connect là
> **curate thủ công có xin phép** (`collection_method = manual_only`).

---

## Bước 3 — Dựng Feature Map

Chưa nhảy sang màn hình hay data model. Vẽ luồng làm việc trước.

Cấu trúc:

```
Luồng chính (core workflows)
  - [hành động] → [kết quả]

Edge case
  - Nếu [tình huống bất thường] thì sao?

Phân quyền (role × trust level)
  - [role/tier] được [hành động]
  - [role/tier] KHÔNG được [hành động]

Thông báo / sự kiện phát ra
  - Khi [event], báo cho [ai] qua [Expo Push / in-app / email / socket.io], ở locale nào, khung giờ nào

Dữ liệu phải lưu
  - [entity]: [các field]  ← có dữ liệu cá nhân không? lưu bao lâu?

Địa lý & thời gian
  - Lọc theo area nào, bán kính bao nhiêu, mốc thời gian tính theo múi giờ nào
```

---

## Bước 4 — Chia MVP / V1 / Later

Kỷ luật scope tàn nhẫn. Phép thử: MVP phải deploy được và hữu ích khi đứng một mình.

**MVP** — thứ nhỏ nhất xoá được nỗi đau mô tả ở Bước 1.
**V1** — feature đầy đủ như dự định.
**Later** — có giá trị nhưng không chặn V1.

Nếu không giải thích được trong một câu vì sao thứ đó là MVP, nó thuộc về V1.

Thêm một trục nữa: **giai đoạn**. GĐ1 = kết nối cộng đồng (đang làm) · GĐ2 = nhà ở
· GĐ3 = y tế / dịch vụ chuyên môn. Feature thuộc GĐ2–3 → ghi vào roadmap, **không**
nhét vào MVP.

---

## Bước 5 — Chỉ ra hệ quả kỹ thuật (chỉ nêu cờ, chưa thiết kế)

**Hệ quả data model** — bảng mới, cột mới, quan hệ mới? Có đụng PostGIS
(`geography`, index GIST) không? Nêu rủi ro **TypeORM migration** (cổng dự án: DỪNG
để xin phê duyệt migration — xem skill [`database-migrations`](../database-migrations/SKILL.md)).

**Hệ quả API** — endpoint mới dưới `/api/v1`? Sửa endpoint cũ? Có breaking change
cho `apps/mobile` (app đã cài trên máy user không tự cập nhật ngay) không? Mutation
có cần `Idempotency-Key` không?

**Màn hình UI** — chỉ liệt kê tên màn hình, chưa thiết kế. Tách riêng
`apps/web-client-side` (trang public + dashboard organizer), `apps/web-admin-side`
(màn hình vận hành: curate, kiểm duyệt, quản lý người dùng, analytics) và
`apps/mobile`.

**Realtime & thông báo** — có cần cập nhật trực tiếp qua socket.io không? Có gửi
Expo Push không? Job nền qua BullMQ (nhắc lịch, thăng hạng waitlist, đối soát đếm)?

**Auth & phân quyền** — route mới gắn role nào? Gắn `trust_level` tối thiểu nào?
Có kiểm quyền sở hữu (organizer của chính event đó) không?

**i18n** — chuỗi mới cần key ở cả `en.json` và `vi.json`. Đây là nội dung hệ thống
hay nội dung do user tạo (giữ nguyên `content_locale`)?

**Thời gian & địa lý** — mốc thời gian lưu UTC, hiển thị `Asia/Ho_Chi_Minh`. Bộ
lọc theo khu vực dùng cây `areas` (An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà,
Ngũ Hành Sơn) hay bán kính `ST_DWithin` (mét)?

**Trust & safety** — feature này có tạo bề mặt mới cho spam/quấy rối/lừa đảo không?
Có cần report được không? Có cần audit log không?

**Dữ liệu cá nhân** — thu thập gì, vì sao, lưu bao lâu, xoá thế nào? Chỉ lưu
trường thật sự dùng cho feature này.

---

## Bước 6 — Viết Discovery Brief

Lưu output vào `.agent/specs/<feature-slug>.md` hoặc `.agent/future-plans/<feature-slug>.md`
tuỳ theo feature thuộc sprint hiện tại hay để sau.

Dùng template này:

```markdown
# Feature Discovery: <Tên feature>

**Ngày:** <hôm nay>
**Người yêu cầu:** <user/stakeholder>
**Giai đoạn:** GĐ1 kết nối cộng đồng | GĐ2 nhà ở | GĐ3 y tế
**Trạng thái:** Discovery — chưa được duyệt để implement

## Mục tiêu kinh doanh
<Một đoạn: giải quyết vấn đề gì, cho ai>

## Người dùng mục tiêu
<Từng actor + job-to-be-done cụ thể của họ>

## Nỗi đau hiện tại / cách xoay xở
<Hôm nay họ đang làm gì thay vì dùng feature này — Facebook Group? WhatsApp? hỏi bạn?>

## Mẫu hình từ sản phẩm tương tự
<InterNations / Meetup / Luma / Timeleft / Spond… giải bài này thế nào — kèm URL nguồn>

## Luồng chính
<Các bước bắt đầu bằng động từ, theo từng actor>

## Feature Map
<Luồng chính, edge case, phân quyền theo role × trust level, thông báo>

## Phạm vi MVP
<Tập tối thiểu deploy được — mỗi mục phải biện minh được trong một câu>

## Phạm vi V1
<Feature đầy đủ như dự định>

## Later
<Có giá trị nhưng hoãn>

## Edge case
<Tình huống bất thường nhưng có thật: hết chỗ, huỷ sát giờ, no-show, mưa bão, organizer biến mất>

## Ma trận phân quyền
<Role × trust level → hành động được phép>

## Hệ quả data model
<Entity / field / quan hệ mới — nêu cờ rủi ro migration, cờ PostGIS nếu có yếu tố vị trí>

## Hệ quả API
<Endpoint mới hoặc đổi dưới /api/v1 — nêu cờ breaking change cho app mobile đã cài>

## Màn hình UI
<Chỉ liệt kê tên: apps/web-client-side (public · dashboard organizer) / apps/web-admin-side (curate · kiểm duyệt · quản lý người dùng · analytics) / apps/mobile>

## Thông báo & realtime
<Trigger · người nhận · kênh · locale · khung giờ · điều kiện huỷ>

## i18n
<Nhóm key mới cần ở en.json + vi.json>

## Thời gian & địa lý
<Múi giờ, biên bộ lọc, cây area, bán kính>

## Trust & safety
<Bề mặt lạm dụng mới, cơ chế report, audit>

## Dữ liệu cá nhân
<Thu thập gì · vì sao · lưu bao lâu · xoá thế nào>

## Acceptance Criteria
<Given/When/Then — testable, không mơ hồ>

## Câu hỏi mở
<Quyết định chưa chốt đang chặn thiết kế>

## Khuyến nghị
<Chuyển sang business-analyst / Cần nghiên cứu thêm / Cắt bớt scope / Hoãn sang giai đoạn sau>
```

---

## Output

Discovery Brief hoàn chỉnh lưu ở `.agent/specs/` hoặc `.agent/future-plans/`, kèm
một đoạn khuyến nghị và danh sách câu hỏi mở tường minh.
**Không chuyển sang giai đoạn viết requirement (`business-analyst`) hay implement
nếu user chưa phê duyệt.**
