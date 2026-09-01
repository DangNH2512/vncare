# 01 — Tác nhân & Phân quyền — Da Nang Connect (Giai đoạn 1)

| Thuộc tính | Giá trị |
|---|---|
| Tài liệu | Phân tích tác nhân (actor) & mô hình phân quyền (RBAC) |
| Sản phẩm | **Da Nang Connect** |
| Phạm vi | Giai đoạn 1 — Kết nối cộng đồng (event, thể thao, trao đổi ngôn ngữ). Địa lý: **chỉ Đà Nẵng** |
| Phiên bản | 1.0 |
| Ngày | 2026-08-31 |
| Trạng thái | Draft để review với đội sáng lập |
| Tài liệu nguồn | `docs/source/Da_Nang_Connect_Brief.txt` |
| Đối tượng đọc | Product owner, backend/mobile/web engineer, community ops |

---

## Mục lục

1. [Phạm vi & nguyên tắc thiết kế](#1-phạm-vi--nguyên-tắc-thiết-kế)
2. [Bản đồ tác nhân tổng quan](#2-bản-đồ-tác-nhân-tổng-quan)
3. [Primary actor — người dùng trực tiếp tạo giá trị](#3-primary-actor--người-dùng-trực-tiếp-tạo-giá-trị)
4. [Secondary actor — vận hành & kiểm duyệt](#4-secondary-actor--vận-hành--kiểm-duyệt)
5. [System actor — dịch vụ nội bộ & tích hợp](#5-system-actor--dịch-vụ-nội-bộ--tích-hợp)
6. [External actor — nguồn ngoài, không tích hợp API](#6-external-actor--nguồn-ngoài-không-tích-hợp-api)
7. [Persona chi tiết](#7-persona-chi-tiết)
8. [Hệ thống role](#8-hệ-thống-role)
9. [Ma trận phân quyền RBAC](#9-ma-trận-phân-quyền-rbac)
10. [Vòng đời tài khoản (state machine)](#10-vòng-đời-tài-khoản-state-machine)
11. [Trust level & badge](#11-trust-level--badge)
12. [Mapping role → use case](#12-mapping-role--use-case)
13. [Ghi chú triển khai kỹ thuật](#13-ghi-chú-triển-khai-kỹ-thuật)
14. [Rủi ro phân quyền & câu hỏi mở](#14-rủi-ro-phân-quyền--câu-hỏi-mở)
15. [Quyết định đã chốt](#15-quyết-định-đã-chốt)

---

## 1. Phạm vi & nguyên tắc thiết kế

### 1.1 Điều gì thuộc giai đoạn 1

Giai đoạn 1 chỉ phục vụ **kết nối cộng đồng**: tạo hoạt động, RSVP, tìm kiếm/lọc theo khu vực, hồ sơ cá nhân có độ tin cậy. Không có dòng tiền giữa hai người dùng, không có xác thực chuyên môn, không có tranh chấp hợp đồng. Đây là lý do mô hình phân quyền ở giai đoạn 1 có thể **nhẹ và mở**, ưu tiên giảm ma sát cho người tạo nội dung.

Các actor thuộc giai đoạn 2 (nhà ở) và giai đoạn 3 (y tế/dịch vụ chuyên môn) vẫn được liệt kê trong tài liệu này ở dạng **thiết kế trước, chưa kích hoạt** — mục đích là để schema `roles`, `permissions`, `trust_level` không phải migrate phá vỡ khi mở rộng.

### 1.2 Năm nguyên tắc chi phối toàn bộ mô hình phân quyền

| # | Nguyên tắc | Hệ quả thiết kế |
|---|---|---|
| P1 | **Tạo hoạt động phải gần như không ma sát** | Bất kỳ `member` nào (chỉ cần verified email) đều tạo được hoạt động. Không có "đơn xin làm organizer". `organizer` **không phải role toàn cục** mà là **quan hệ theo sự kiện** (`events.host_user_id` / `event_cohosts`) — xem §8.4. |
| P2 | **Độ tin cậy thay cho kiểm duyệt trước** | Mặc định hoạt động publish ngay (`auto-approve`). Kiểm duyệt là **hậu kiểm** dựa trên report + tín hiệu rủi ro. Chỉ tài khoản trust thấp mới bị đưa vào hàng đợi duyệt. |
| P3 | **Curate thủ công là công dân hạng nhất** | `curator` là role có thật trong hệ thống ngay từ MVP, có quyền tạo listing thay mặt bên thứ ba và quyền bàn giao (claim) listing đó cho organizer gốc. |
| P4 | **An toàn khi gặp người lạ ngoài đời** | Mọi quyền liên quan đến gặp mặt trực tiếp (xem danh sách người tham gia, chat 1-1, xem địa điểm chính xác) đều gắn với trust level, không mở cho `guest`. |
| P5 | **Least privilege + audit** | Mọi hành động của `moderator`/`admin`/`super_admin` ghi `audit_log` bất biến. Quyền huỷ hoại (xoá vĩnh viễn, đổi role) chỉ nằm ở `super_admin`. |

### 1.3 Từ vựng thống nhất

| Thuật ngữ (EN — dùng trong code) | Nghĩa trong sản phẩm |
|---|---|
| `event` | Một hoạt động có thời gian & địa điểm: buổi thể thao, meetup ngôn ngữ, sự kiện cộng đồng |
| `rsvp` | Hành động đăng ký tham gia một `event` |
| `attendee` | Người đã RSVP và được ghi nhận |
| `host` / `organizer` | Người chịu trách nhiệm tổ chức một `event`. **Là quan hệ theo sự kiện, không phải role toàn cục** — xem §8.4 |
| `curated listing` | `event` do đội sáng lập đăng lại từ nguồn công khai, chưa có organizer gốc trên hệ thống |
| `claim` | Quy trình organizer gốc nhận quyền quản lý một `curated listing` |
| `area` | Khu vực trong Đà Nẵng (An Thượng, Mỹ Khê, Mỹ An, Hải Châu…) |
| `trust_level` | Bậc tin cậy T0–T5 của một tài khoản |
| `no_show` | Đã RSVP nhưng không có mặt, bị host đánh dấu |

**Ngôn ngữ UI**: tiếng Anh là mặc định, tiếng Việt là ngôn ngữ thứ hai. Mọi nhãn role/badge/trạng thái trong tài liệu này đều có key i18n dạng `role.curator.label`, `trust.level.t2.label`, `badge.reliable_attendee.name`.

---

## 2. Bản đồ tác nhân tổng quan

```mermaid
graph TB
    subgraph PRIMARY["PRIMARY — tạo giá trị trực tiếp"]
        A1["Expat / Member<br/>(người tham gia)"]
        A2["Event Organizer<br/>(nghiệp dư → chuyên nghiệp)"]
        A3["Local Bilingual Host<br/>(người Việt nói tiếng Anh)"]
        A4["Local Service Provider<br/>(GĐ 2-3, chưa kích hoạt)"]
    end

    subgraph SECONDARY["SECONDARY — vận hành nội bộ"]
        B1["Content Curator<br/>(đội sáng lập)"]
        B2["Community Moderator"]
        B3["Support Agent"]
        B4["Admin"]
        B5["Super Admin"]
    end

    subgraph SYSTEM["SYSTEM — dịch vụ tự động"]
        C1["Push Notification Service<br/>(Expo Push)"]
        C2["Email / SMS Service"]
        C3["Map Service<br/>(Leaflet tiles + geocoding)"]
        C4["Object Storage + CDN"]
        C5["Scheduler / Queue<br/>(BullMQ)"]
        C6["Realtime Gateway<br/>(socket.io)"]
        C7["Error Tracking (Sentry)"]
        C8["Payment Gateway<br/>(GĐ 2, chưa kích hoạt)"]
    end

    subgraph EXTERNAL["EXTERNAL — nguồn ngoài, KHÔNG tích hợp API"]
        D1["Facebook Groups"]
        D2["Meetup.com"]
        D3["WhatsApp Groups"]
        D4["Luma / trang sự kiện độc lập"]
    end

    A1 -->|"RSVP, tìm kiếm, chat"| CORE(("Da Nang<br/>Connect"))
    A2 -->|"tạo & quản lý event"| CORE
    A3 -->|"tạo event song ngữ"| CORE
    A4 -.->|"GĐ 2-3"| CORE

    B1 -->|"đăng curated listing,<br/>mời claim"| CORE
    B2 -->|"xử lý report, ẩn/khoá"| CORE
    B3 -->|"hỗ trợ user"| CORE
    B4 -->|"cấu hình, analytics"| CORE
    B5 -->|"role, audit, xoá dữ liệu"| CORE

    CORE --> C1
    CORE --> C2
    CORE --> C3
    CORE --> C4
    CORE --> C5
    CORE --> C6
    CORE --> C7
    CORE -.-> C8

    D1 -.->|"đọc thủ công bởi con người"| B1
    D2 -.->|"đọc thủ công bởi con người"| B1
    D3 -.->|"đọc thủ công bởi con người"| B1
    D4 -.->|"đọc thủ công bởi con người"| B1

    style CORE fill:#1f6feb,color:#fff,stroke:#0b4bb3
    style EXTERNAL stroke-dasharray: 6 4
    style A4 stroke-dasharray: 4 3
    style C8 stroke-dasharray: 4 3
```

> **Đọc sơ đồ**: mũi tên nét đứt từ khối EXTERNAL đi vào **con người** (`Content Curator`), không đi vào hệ thống. Đây là biểu diễn trực quan của quyết định "không scraping, không tích hợp API Facebook/Meetup" trong brief.

---

## 3. Primary actor — người dùng trực tiếp tạo giá trị

### 3.1 A1 — Expat / Member (người tham gia)

Actor đông nhất và là lý do tồn tại của sản phẩm. Bao gồm digital nomad ngắn hạn, expat định cư dài hạn, du học sinh, người đi làm theo hợp đồng nước ngoài, và người nước ngoài đã lập gia đình tại Đà Nẵng.

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu chính** | Biết "tuần này ở Đà Nẵng có gì diễn ra" trong dưới 60 giây, và đăng ký tham gia mà không cần vào 5 kênh khác nhau |
| **Mục tiêu phụ** | Tìm bạn cùng chơi thể thao gần chỗ ở; luyện tiếng Việt/tiếng Anh; mở rộng mạng lưới xã hội khi vừa tới thành phố |
| **Động lực** | Cô đơn khi mới đến; nhu cầu thuộc về một cộng đồng; sợ bỏ lỡ (FOMO) các hoạt động; muốn gặp người "cùng tần số" nói được tiếng Anh |
| **Pain point** | (1) Sự kiện chìm trong feed Facebook, không lọc được theo khu vực/thời gian; (2) phải theo dõi song song Facebook + Meetup + WhatsApp + Luma; (3) đến nơi mới biết sự kiện đã huỷ hoặc hết chỗ; (4) không biết người tổ chức là ai, có đáng tin không; (5) sự kiện ghi tiếng Việt, không rõ có nói tiếng Anh không |
| **Tần suất sử dụng** | Chủ động 2–4 lần/tuần (thường tối thứ Tư → sáng thứ Bảy khi lên kế hoạch cuối tuần); thụ động hằng ngày qua push notification |
| **Thiết bị chính** | **Mobile (Expo app) ~80%** — iOS chiếm ưu thế ở nhóm nomad phương Tây, Android ở nhóm Đông Á/Nga. Web (Next.js) dùng khi đọc chi tiết dài hoặc từ coworking space |
| **Kỳ vọng** | UI tiếng Anh mặc định; lọc theo khu vực **cấp phường/khu**, không phải cấp thành phố; thấy rõ ai đã tham gia; RSVP trong 2 chạm; nhắc trước sự kiện ở mốc T-24h và T-2h; huỷ RSVP không bị phán xét |
| **Anti-goal (điều họ *không* muốn)** | Bị spam quảng cáo dịch vụ; bị lộ số điện thoại; phải điền form dài khi đăng ký; nhận thông báo về sự kiện cách chỗ ở 15km |
| **Role hệ thống tương ứng** | Role toàn cục `member`; trust level đi từ **T0 → T2** sau khi verify email + phone (xem §11) |
| **Chỉ số thành công** | Tỷ lệ RSVP/lượt xem chi tiết ≥ 12%; tỷ lệ quay lại tuần kế tiếp (W1 retention) ≥ 35% |

### 3.2 A2 — Event Organizer

Chia làm hai nhánh rất khác nhau về hành vi, được mô tả kỹ ở phần persona (§7.3, §7.4). Ở đây mô tả đặc điểm chung.

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu chính** | Có đủ người tham gia hoạt động mình tổ chức, đúng đối tượng, không phải tự đi mời từng người trong inbox |
| **Mục tiêu phụ** | Dự đoán được số lượng để đặt chỗ/mua vật tư; xây dựng danh tiếng cá nhân trong cộng đồng; giữ liên lạc với người tham gia cũ |
| **Động lực** | Nghiệp dư: nhu cầu xã hội thuần tuý, muốn có đủ người để hoạt động diễn ra. Chuyên nghiệp: dòng khách ổn định cho quán bar / phòng gym / trung tâm ngôn ngữ / studio yoga |
| **Pain point** | (1) Đăng bài Facebook thì 30 phút sau đã trôi mất; (2) Meetup thu phí duy trì nhóm — quá đắt cho một buổi cầu lông ngẫu hứng; (3) không biết bao nhiêu người thực sự đến (comment "interested" ≠ đến); (4) no-show phá hỏng kế hoạch; (5) phải trả lời cùng một câu hỏi (địa chỉ ở đâu, có nói tiếng Anh không) hàng chục lần |
| **Tần suất sử dụng** | Nghiệp dư: theo đợt, 1–4 lần/tháng, tập trung quanh ngày tạo và ngày diễn ra. Chuyên nghiệp: 3–7 lần/tuần, có thói quen kiểm tra dashboard |
| **Thiết bị chính** | Nghiệp dư: mobile gần như 100%. Chuyên nghiệp: **web cho tạo & phân tích** (nhập mô tả dài, upload ảnh chất lượng cao, xem analytics), mobile cho check-in tại chỗ |
| **Kỳ vọng** | Tạo hoạt động dưới 90 giây trên mobile; nhân bản (duplicate) hoạt động tuần trước; lặp lại theo lịch (recurring); danh sách người tham gia xuất được; nhắn tin cho toàn bộ người đã RSVP một lần; số liệu lượt xem — RSVP — có mặt |
| **Anti-goal** | Phải trả phí ở giai đoạn 1; bị bắt xác minh danh tính trước khi đăng bài đầu tiên; giao diện phức tạp kiểu CRM |
| **Role hệ thống tương ứng** | Role toàn cục `member`; trở thành **host theo sự kiện** ngay khi hoạt động đầu tiên được publish (§8.4) |
| **Chỉ số thành công** | ≥ 40% organizer tạo hoạt động thứ hai trong vòng 30 ngày; tỷ lệ hoạt động bị huỷ vì thiếu người < 15% |

### 3.3 A3 — Local Bilingual Host (người Việt nói tiếng Anh)

Actor này **không có trong brief một cách tường minh** nhưng suy ra trực tiếp từ insight "gần như mọi nhu cầu đều kèm điều kiện English-speaking". Đây là nguồn cung quý và là cầu nối văn hoá — cần được thiết kế đường vào riêng, không ép họ tự nhận mình là "expat".

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu chính** | Tổ chức/dẫn dắt hoạt động cho người nước ngoài: language exchange, dẫn tour ẩm thực địa phương, lớp nấu ăn, nhóm chạy bộ |
| **Động lực** | Luyện tiếng Anh miễn phí; mở rộng quan hệ quốc tế; một số có động cơ nghề nghiệp (giáo viên, hướng dẫn viên, chủ quán nhỏ) |
| **Pain point** | Bị nhóm Facebook expat coi là "người ngoài" hoặc nghi ngờ động cơ thương mại; không biết đăng ở đâu để tới đúng đối tượng; rào cản viết mô tả bằng tiếng Anh |
| **Tần suất sử dụng** | 1–3 lần/tuần |
| **Thiết bị chính** | Mobile (Android chiếm ưu thế) |
| **Kỳ vọng** | UI có thể chuyển sang tiếng Việt; gợi ý mẫu mô tả song ngữ; badge thể hiện "người bản địa" để tạo tin cậy chứ không bị nghi ngờ |
| **Role hệ thống tương ứng** | Role toàn cục `member` (thường kiêm host theo sự kiện) + badge `local_host` |
| **Ghi chú thiết kế** | Trường `is_local` trên profile là **tự khai + xác minh nhẹ** (số điện thoại đầu số Việt Nam + verify). Không dùng để hạn chế quyền, chỉ để hiển thị badge và phục vụ bộ lọc "hoạt động có người bản địa dẫn". |

### 3.4 A4 — Local Service Provider *(giai đoạn 2–3, thiết kế trước — chưa kích hoạt)*

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu** | Tiếp cận khách hàng expat cho dịch vụ nhà ở (GĐ2) hoặc y tế/chuyên môn (GĐ3) |
| **Động lực** | Khoảng trống cung 11:1 (chung) và 90× (y tế/wellness) — nhu cầu có sẵn, không phải tạo mới |
| **Pain point** | Không nói tiếng Anh đủ tốt để tự tiếp thị; không có kênh tiếp cận tập trung; khó chứng minh uy tín với người lạ nước ngoài |
| **Tần suất** | Hằng ngày (khi đã kích hoạt) |
| **Kỳ vọng** | Hồ sơ doanh nghiệp có xác minh; nhận yêu cầu trực tiếp; thống kê lượt xem |
| **Role dự kiến** | Ở GĐ1 **không thêm giá trị nào vào `user_role_enum`** (enum chốt đúng 5 giá trị — §8.1). GĐ2–3 mô hình hoá nhà cung cấp bằng bảng riêng `service_providers` + quan hệ `provider_members`, không đụng vào enum role |
| **Quyết định GĐ1** | ❌ Không kích hoạt. Không có UI đăng ký. Không có endpoint. Chỉ có giá trị enum dự trữ trong DB. |

---

## 4. Secondary actor — vận hành & kiểm duyệt

### 4.1 B1 — Content Curator (đội sáng lập)

Actor **quan trọng bậc nhất ở tháng 1–6** vì là lời giải trực tiếp cho rủi ro cold-start trong brief. Người thật, thuộc đội sáng lập, làm việc chủ yếu trên web.

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu chính** | Làm app "có sự sống" ngay ngày đầu: mỗi tuần có ≥ 25 hoạt động thật, trải đều các khu vực và loại hình |
| **Mục tiêu phụ** | Chuyển đổi organizer gốc từ bị động sang chủ động — mời họ claim listing |
| **Động lực** | Sống còn của sản phẩm; mỗi listing được claim là một tín hiệu product-market fit |
| **Pain point** | (1) Nhập liệu thủ công lặp đi lặp lại từ Facebook/Meetup/WhatsApp rất tốn công; (2) khó theo dõi listing nào đã liên hệ organizer, đã gửi lời mời claim lần mấy; (3) sợ đăng nhầm thông tin sai (sai giờ, sai địa chỉ) làm mất uy tín |
| **Tần suất sử dụng** | **Hằng ngày**, tập trung 2 phiên: sáng thứ Hai (gom sự kiện tuần) và chiều thứ Năm (chốt cuối tuần) |
| **Thiết bị chính** | **Web/desktop 95%** — cần nhiều tab, copy-paste, upload ảnh |
| **Kỳ vọng công cụ** | Form tạo nhanh có nhớ giá trị lần trước; trường `source_url` + `source_platform` bắt buộc; nhãn "Curated by Da Nang Connect" hiển thị công khai; hàng đợi "chưa liên hệ / đã mời claim / đã claim"; template email mời claim; nhân bản listing hằng tuần chỉ đổi ngày |
| **Ranh giới đạo đức (bắt buộc)** | Chỉ đăng lại **sự kiện công khai**; ghi rõ nguồn; **không copy ảnh có bản quyền cá nhân**; gỡ ngay khi organizer gốc yêu cầu; **tuyệt đối không dùng script tự động thu thập dữ liệu** — đây là điều kiện pháp lý đã chốt trong brief |
| **Role hệ thống** | `curator` |

### 4.2 B2 — Community Moderator

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu chính** | Giữ không gian an toàn, đặc biệt cho phụ nữ đi một mình và người mới đến; xử lý report trong SLA |
| **Động lực** | Trách nhiệm cộng đồng; ở giai đoạn đầu là thành viên đội sáng lập kiêm nhiệm, sau đó tuyển từ chính cộng đồng (trusted member tình nguyện) |
| **Pain point** | Report đến rải rác ngoài giờ hành chính; khó phân biệt hiểu lầm văn hoá với quấy rối thật; sợ ra quyết định sai làm mất thành viên tích cực |
| **Tần suất sử dụng** | Hằng ngày, phiên ngắn 15–30 phút; tăng vọt cuối tuần |
| **Thiết bị chính** | Web (hàng đợi xử lý), mobile cho cảnh báo khẩn |
| **Kỳ vọng công cụ** | Hàng đợi report ưu tiên theo mức độ; xem toàn bộ ngữ cảnh (nội dung, lịch sử user, report trước đó); hành động phân bậc (cảnh báo → ẩn nội dung → hạn chế → khoá tạm → cấm); mọi hành động đều ghi lý do; **không có quyền xoá vĩnh viễn** |
| **Role hệ thống** | `moderator` |
| **SLA đề xuất** | Mức `critical` (an toàn thân thể, quấy rối tình dục): 2 giờ. `high` (lừa đảo, spam hàng loạt): 12 giờ. `normal`: 48 giờ |

### 4.3 B3 — Support Agent

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu** | Giải quyết vấn đề tài khoản: không nhận được email xác minh, quên mật khẩu, RSVP không hiện, yêu cầu xoá dữ liệu |
| **Động lực** | Giảm churn do sự cố kỹ thuật; ở tháng đầu, mỗi user đều quý |
| **Pain point** | Không thấy được điều user thấy; user mô tả sự cố mơ hồ; lệch múi giờ với user vừa rời Đà Nẵng |
| **Tần suất** | Hằng ngày, phản ứng theo ticket |
| **Thiết bị** | Web |
| **Kỳ vọng công cụ** | Tra cứu user theo email/phone; xem trạng thái tài khoản + lịch sử verify; **gửi lại** email/SMS xác minh; xem log RSVP; **impersonate ở chế độ chỉ đọc** (bắt buộc ghi audit + thông báo cho user) |
| **Role hệ thống** | Gộp vào `moderator` — **không có role `support` riêng** (quyết định MT-02, §8.1). Quyền hỗ trợ tài khoản được cấp cho `moderator` qua permission `user.support.*` |

### 4.4 B4 — Admin

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu** | Vận hành nền tảng: quản lý taxonomy khu vực & danh mục, cấu hình feature flag, xem analytics toàn hệ thống, gửi thông báo broadcast |
| **Động lực** | Ra quyết định sản phẩm dựa trên số liệu thật, không phải cảm tính |
| **Pain point** | Số liệu rời rạc; không biết khu vực nào đang thiếu hoạt động; không đo được hiệu quả của từng đợt curate |
| **Tần suất** | 2–5 lần/tuần |
| **Thiết bị** | Web/desktop |
| **Kỳ vọng công cụ** | Dashboard: hoạt động mới/tuần theo khu vực, tỷ lệ RSVP, tỷ lệ no-show, tỷ lệ claim thành công, phễu đăng ký, top khu vực thiếu cung |
| **Role hệ thống** | `admin` |

### 4.5 B5 — Super Admin

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu** | Giữ quyền huỷ hoại ở một chỗ duy nhất; đảm bảo tuân thủ và khả năng phục hồi |
| **Quyền độc quyền** | Gán/thu hồi role; xoá vĩnh viễn dữ liệu; ẩn danh hoá tài khoản theo yêu cầu; truy cập audit log đầy đủ; đổi cấu hình bảo mật; khôi phục tài khoản bị cấm |
| **Tần suất** | Hiếm — chỉ khi cần |
| **Thiết bị** | Web, bắt buộc bật 2FA |
| **Ràng buộc** | Tối thiểu 2 tài khoản (tránh khoá chính mình), tối đa 3 ở giai đoạn 1. Mọi hành động ghi audit log **không thể sửa/xoá**. Không được tự hạ role của chính mình khi chỉ còn 1 super admin hoạt động. |
| **Role hệ thống** | `super_admin` |

---

## 5. System actor — dịch vụ nội bộ & tích hợp

System actor là các tác nhân **không phải người**, kích hoạt use case hoặc bị use case kích hoạt. Chúng cần được liệt kê vì ảnh hưởng trực tiếp tới thiết kế queue, retry và trạng thái dữ liệu.

| ID | System Actor | Vai trò trong hệ thống | Kích hoạt bởi | Kỳ vọng / SLA nội bộ | Xử lý khi lỗi |
|---|---|---|---|---|---|
| C1 | **Push Notification Service** (Expo Push) | Nhắc trước sự kiện (T-24h, T-2h), báo có người RSVP, tin nhắn mới, hoạt động mới trong khu vực đã lưu | Job BullMQ theo lịch; sự kiện domain | Gửi < 30s kể từ khi enqueue; tỷ lệ giao thành công > 95% | Retry backoff 3 lần; token hỏng (`DeviceNotRegistered`) → gỡ token khỏi DB; fallback sang email cho nhắc T-2h |
| C2 | **Email / SMS Service** | Email xác minh, khôi phục mật khẩu, thư mời claim listing, thông báo hành động kiểm duyệt; SMS OTP xác minh số điện thoại | Đăng ký, curator, moderator | Email < 60s; OTP SMS < 20s, hiệu lực 5 phút, tối đa 5 lần/số/giờ | Hàng đợi riêng, retry 5 lần; cảnh báo Sentry khi tỷ lệ lỗi > 5% |
| C3 | **Map Service** (Leaflet/react-leaflet trên web, react-native-maps trên mobile + nguồn tile & geocoding) | Hiển thị bản đồ, chọn điểm khi tạo hoạt động, geocode địa chỉ → toạ độ, gợi ý khu vực từ toạ độ | Tạo/sửa hoạt động; màn hình khám phá | Tile tải < 2s; geocoding < 1s | Bản đồ lỗi → vẫn cho nhập địa chỉ dạng chữ + chọn `area` thủ công; **không chặn việc tạo hoạt động** |
| C4 | **Object Storage + CDN** (S3-compatible) | Lưu ảnh bìa hoạt động, avatar, ảnh giấy tờ khi verify ID | Upload từ web/mobile | Upload qua pre-signed URL; ảnh phục vụ qua CDN; ảnh giấy tờ nằm ở bucket **private**, có thời hạn lưu | Upload lỗi → hoạt động vẫn tạo được với ảnh mặc định theo danh mục |
| C5 | **Scheduler / Queue** (BullMQ trên Redis) | Job định kỳ: chuyển hoạt động sang `completed` sau giờ kết thúc, nhắc host đánh dấu điểm danh, tính lại `users.trust_level` (T0–T5) từ `trust_signals` hằng đêm, dọn RSVP mồ côi | Cron nội bộ | Job trễ < 5 phút | Job idempotent; dead-letter queue + cảnh báo |
| C6 | **Realtime Gateway** (socket.io) | Chat trong hoạt động, chat 1-1, cập nhật số chỗ còn lại theo thời gian thực, chỉ báo đang gõ | Client kết nối sau khi xác thực JWT | Độ trễ < 500ms | Mất kết nối → tự kết nối lại; tin nhắn vẫn lưu qua REST, realtime chỉ là lớp tăng tốc |
| C7 | **Error Tracking** (Sentry) | Thu thập lỗi backend/web/mobile, gắn `user_id` đã ẩn danh và `release` | Runtime | — | Không được chứa PII thô; lọc token/OTP khỏi payload |
| C8 | **Payment Gateway** *(GĐ 2 — chưa kích hoạt)* | Thanh toán gói premium (bộ lọc nâng cao), sau đó là hoa hồng/phí niêm yết | — | — | Ở GĐ1: **không có endpoint thanh toán**. Chỉ thiết kế trước quyền `billing.*` trong enum permission |

### 5.1 Sơ đồ tương tác system actor cho luồng nhắc sự kiện

```mermaid
sequenceDiagram
    autonumber
    participant ORG as Organizer
    participant API as NestJS API
    participant PG as PostgreSQL + PostGIS
    participant Q as BullMQ (Redis)
    participant PUSH as Expo Push (C1)
    participant MAIL as Email/SMS (C2)
    participant MEM as Member (attendee)

    ORG->>API: POST /events (tạo hoạt động)
    API->>PG: INSERT event + geography(Point)
    API->>Q: enqueue reminder T-24h, T-2h (delayed)
    API-->>ORG: 201 Created

    MEM->>API: POST /api/v1/occurrences/:occurrenceId/rsvps
    API->>PG: INSERT rsvp (occurrence_id, kiem tra capacity)
    API->>PUSH: notify organizer "có người mới tham gia"
    API-->>MEM: 201 Created

    Note over Q: đến mốc T-2h
    Q->>API: xử lý job reminder
    API->>PG: SELECT attendee đang ở trạng thái going
    API->>PUSH: gửi hàng loạt push nhắc
    alt push thất bại / token không hợp lệ
        PUSH-->>API: DeviceNotRegistered
        API->>PG: gỡ token hỏng
        API->>MAIL: gửi email nhắc thay thế
    end
    PUSH-->>MEM: "Badminton at My An starts in 2 hours"
```

---

## 6. External actor — nguồn ngoài, không tích hợp API

| ID | External Actor | Quan hệ với hệ thống | Cách tương tác **duy nhất được phép** | Điều bị cấm tuyệt đối |
|---|---|---|---|---|
| D1 | **Facebook Groups** ("Expats in Da Nang", "Expats in Da Nang City") | Nguồn phát hiện sự kiện công khai; kênh seed 100 user đầu | Curator **đọc bằng mắt**, nhập tay vào form tạo listing, ghi `source_platform=facebook` + `source_url` | Scraping tự động, crawler, headless browser, dùng API không chính thức, lưu trữ hàng loạt nội dung nhóm |
| D2 | **Meetup.com** | Nguồn sự kiện có lịch cố định; đối thủ trực tiếp | Curator đọc thủ công, nhập tay, ghi nguồn | Đồng bộ tự động, nhập khẩu hàng loạt |
| D3 | **WhatsApp Groups** | Nguồn nhu cầu ad-hoc; kênh liên hệ organizer để mời claim | Curator là **thành viên thật** của nhóm, đọc và nhập tay | Bot đọc tin nhắn, export chat hàng loạt |
| D4 | **Luma, Da Nang Leisure, What's Up Da Nang** | Nguồn sự kiện quy mô lớn hơn | Đọc thủ công, nhập tay, ghi nguồn | Crawl định kỳ |
| D5 | **Nhà cung cấp OAuth** (Google, Apple, Facebook Login) | Đăng nhập xã hội | OAuth 2.0 / OIDC chuẩn, chỉ xin scope tối thiểu (`email`, `profile`) | Xin quyền đọc danh sách bạn bè, nhóm, hay bất kỳ scope nào ngoài đăng nhập |

> **Ràng buộc bắt buộc trên iOS**: nếu có bất kỳ social login nào (Google/Facebook), **phải** có Apple Sign-In. Đây là điều kiện duyệt App Store, không phải lựa chọn.

### 6.1 Ranh giới curate — biểu diễn dạng sơ đồ

```mermaid
flowchart LR
    subgraph OUTSIDE["Bên ngoài — không có kết nối máy-tới-máy"]
        FB["Facebook Group<br/>bài đăng công khai"]
        MU["Meetup.com"]
        WA["WhatsApp Group"]
    end

    HUMAN["👤 Content Curator<br/>đọc, đánh giá, gõ tay"]

    subgraph INSIDE["Da Nang Connect"]
        FORM["Form tạo curated listing<br/>(bắt buộc source_url,<br/>source_platform, is_curated)"]
        LST["Event: status=published<br/>ownership=unclaimed<br/>badge 'Curated'"]
        INVITE["Luồng mời claim<br/>gửi qua email/tin nhắn thủ công"]
        CLAIMED["Event: ownership=claimed<br/>host_user_id = user that"]
    end

    FB --> HUMAN
    MU --> HUMAN
    WA --> HUMAN
    HUMAN --> FORM --> LST
    LST --> INVITE --> CLAIMED

    BOT["🤖 Scraper / crawler / API bên thứ ba"]
    BOT -.->|"CẤM"| INSIDE

    style BOT fill:#ffe5e5,stroke:#d63a3a,stroke-dasharray: 5 5
    style HUMAN fill:#fff4d6,stroke:#c99a2e
```

---

## 7. Persona chi tiết

Sáu persona, trong đó bốn persona bắt buộc theo yêu cầu phân tích (§7.1–§7.4) và hai persona vận hành (§7.5–§7.6) vì họ là người dùng thật của phần admin.

### 7.1 Persona P1 — "Marco, digital nomad ngắn hạn"

| | |
|---|---|
| **Ảnh chân dung** | Nam, 29 tuổi, người Ý, product designer freelance |
| **Thời gian ở Đà Nẵng** | 6 tuần (đã đi Chiang Mai, Bali, Lisbon trước đó) |
| **Nơi ở** | Căn hộ ngắn hạn ở **An Thượng**, đi bộ ra biển Mỹ Khê 8 phút |
| **Thu nhập** | ~4.000 USD/tháng, khách hàng châu Âu, làm theo múi giờ CET |
| **Ngôn ngữ** | Tiếng Anh (thành thạo), tiếng Ý (mẹ đẻ), tiếng Việt gần như không |
| **Thiết bị** | iPhone 15, MacBook Air. Dùng app khi nằm dài; dùng web ở coworking |
| **Kênh hiện tại** | 3 nhóm WhatsApp nomad, 2 nhóm Facebook expat, Meetup (ít khi mở), Luma |

**Một ngày điển hình liên quan tới sản phẩm**
> 17:30 xong việc → mở điện thoại → "tối nay có gì?" → lướt Facebook 8 phút, thấy 4 bài trùng nhau, 2 bài không rõ giờ, 1 bài bằng tiếng Việt → bỏ cuộc → ăn một mình → cảm thấy tiếc.

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu** | Trong 6 tuần, có được 3–5 người quen đủ thân để đi ăn/leo núi/lướt sóng cùng; giữ nhịp thể thao (bóng rổ, chạy bộ, lướt sóng) |
| **Động lực sâu** | Sợ 6 tuần trôi qua mà chỉ có laptop và biển; muốn có "cảm giác thuộc về" nhanh chóng vì thời gian ngắn |
| **Pain point (xếp theo mức đau)** | 1. **Thời gian ngắn** — không đủ kiên nhẫn theo dõi 5 kênh, cần biết ngay hôm nay/tối nay có gì<br/>2. **Ad-hoc không có chỗ** — "ai chơi bóng rổ tối nay 19h ở Mỹ An?" không hợp cơ chế sự kiện có lịch của Meetup<br/>3. **Không biết ai sẽ đến** — ngại đến một mình chỗ toàn người lạ<br/>4. **Bán kính quan trọng** — không đi sự kiện cách hơn 4km bằng xe máy thuê |
| **Tần suất** | Mở app **hằng ngày**, cao điểm 17:00–20:00; RSVP 2–4 lần/tuần |
| **Kỳ vọng với Da Nang Connect** | Bộ lọc "Tonight" + "Within 3km of me"; xem avatar & trust badge của người đã tham gia; RSVP 2 chạm; nhắc T-2h; chat nhóm sự kiện để hỏi "vẫn diễn ra chứ?" |
| **Điều làm anh ta bỏ app** | Đăng ký bắt buộc trước khi được xem gì; app trống trơn tuần đầu; push notification về sự kiện ở Hoà Vang |
| **Trust level thực tế đạt được** | T2–T3 (verify email + phone). Hiếm khi lên T4 vì rời thành phố trước khi đủ số hoạt động |
| **Role** | `member` (toàn cục), trust level T2–T3 |
| **Câu nói đại diện** | *"I don't want to join another group chat. I just want to know what's happening tonight within walking distance."* |
| **Hệ quả thiết kế bắt buộc** | (a) Cho phép **browse không cần đăng nhập** (guest xem được danh sách + chi tiết cơ bản); (b) bộ lọc thời gian ưu tiên **Tonight / Tomorrow / This weekend**; (c) sắp xếp mặc định theo khoảng cách khi đã cấp quyền vị trí; (d) chuẩn bị sẵn kiểu hoạt động ad-hoc cho GĐ2 nhưng GĐ1 hỗ trợ tối thiểu bằng cách cho tạo hoạt động **trong ngày** |

---

### 7.2 Persona P2 — "Sarah, expat định cư dài hạn có gia đình"

| | |
|---|---|
| **Ảnh chân dung** | Nữ, 41 tuổi, người Anh, quản lý marketing từ xa cho công ty Singapore |
| **Thời gian ở Đà Nẵng** | Năm thứ 4, có ý định ở lâu dài |
| **Gia đình** | Chồng (người Úc, dạy tiếng Anh), 2 con 6 và 9 tuổi học trường quốc tế |
| **Nơi ở** | Nhà thuê ở **Mỹ An**, gần trường quốc tế khu Ngũ Hành Sơn |
| **Ngôn ngữ** | Tiếng Anh (mẹ đẻ), tiếng Việt giao tiếp cơ bản (đi chợ, taxi) |
| **Thiết bị** | iPhone 13, iPad (dùng buổi tối), laptop công việc. Ưu tiên mobile nhưng đọc kỹ hơn trên iPad |
| **Kênh hiện tại** | Nhóm Facebook phụ huynh trường quốc tế, nhóm WhatsApp hàng xóm, nhóm "Expats in Da Nang" (đọc nhiều, ít đăng) |

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu** | Tìm hoạt động **cả gia đình tham gia được** (dã ngoại, dọn rác bãi biển, hội chợ); giữ vòng bạn bè ổn định; thỉnh thoảng có buổi riêng cho bản thân (yoga, book club) |
| **Động lực sâu** | Con cái cần bạn; bản thân cần cộng đồng bền vững chứ không phải người quen 2 tuần rồi biến mất; muốn đóng góp lại cho cộng đồng |
| **Pain point** | 1. **An toàn & phù hợp** — cần biết hoạt động có phù hợp trẻ em không, có rượu bia không<br/>2. **Nhiễu từ nhóm nomad** — 80% nội dung là party, pub crawl, không liên quan<br/>3. **Lên kế hoạch trước** — cần biết trước 1–2 tuần để sắp lịch gia đình; sự kiện đăng trước 3 giờ là vô dụng<br/>4. **Người lạ** — không cho con đến chỗ không rõ ai tổ chức<br/>5. **Vòng lặp mất người** — kết bạn rồi người ta rời đi, mệt mỏi |
| **Tần suất** | 1–2 lần/tuần, thường tối Chủ nhật khi lên lịch tuần; hiếm khi mở app lúc gấp |
| **Kỳ vọng** | Bộ lọc `family_friendly`, `alcohol_free`, độ tuổi phù hợp; xem lịch dạng calendar 2 tuần tới; thấy rõ organizer là ai, đã tổ chức bao nhiêu buổi, đánh giá thế nào; lưu bộ lọc + nhận thông báo hằng tuần thay vì realtime; kiểm soát quyền riêng tư chặt (không hiện họ tên đầy đủ, không cho người lạ nhắn tin) |
| **Điều làm cô ấy bỏ app** | Nhận tin nhắn quấy rối từ tài khoản lạ; không có cách báo cáo; app đầy sự kiện nhậu |
| **Trust level thực tế** | T4–T5 — sẵn sàng verify ID nếu điều đó giúp cô ấy và con an toàn hơn |
| **Role** | `member` (toàn cục), trust level T4–T5; trở thành host theo sự kiện khi tự tổ chức picnic gia đình |
| **Câu nói đại diện** | *"I need to know who's running it and whether I can bring my kids. Everything else is secondary."* |
| **Hệ quả thiết kế bắt buộc** | (a) Thuộc tính `audience` trên event: `adults_only` / `family_friendly` / `all_ages`;<br/>(b) `alcohol_served: boolean`;<br/>(c) cài đặt riêng tư: `who_can_message_me = everyone / verified_only / attendees_of_my_events`, mặc định **verified_only**;<br/>(d) hiển thị hồ sơ organizer nổi bật ngay trên card sự kiện, không giấu ở màn hình phụ;<br/>(e) digest email/push hằng tuần cho người dùng ít mở app |

---

### 7.3 Persona P3 — "Tom, organizer nghiệp dư"

| | |
|---|---|
| **Ảnh chân dung** | Nam, 34 tuổi, người Mỹ, kỹ sư phần mềm làm từ xa |
| **Thời gian ở Đà Nẵng** | 1,5 năm |
| **Nơi ở** | **Sơn Trà**, gần biển Mỹ Khê |
| **Vai trò cộng đồng** | Tự phát tổ chức cầu lông tối thứ Ba & thứ Năm, thỉnh thoảng leo Bán đảo Sơn Trà sáng Chủ nhật |
| **Không kiếm tiền từ việc này** | Chia đều tiền sân, đôi khi tự bù |
| **Thiết bị** | Android (Pixel), gần như 100% mobile — tạo hoạt động khi đang ngồi quán cà phê |

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu** | Đủ 8 người cho 2 sân cầu lông; không phải nhắn từng người trong 3 nhóm chat mỗi tuần |
| **Động lực sâu** | Muốn chơi thể thao, không muốn làm "quản lý sự kiện"; việc tổ chức chỉ là chi phí phải trả để được chơi |
| **Pain point** | 1. **Bài đăng chìm** — đăng Facebook lúc 10h sáng, 12h trưa đã trôi<br/>2. **"Interested" ≠ đến** — 15 người thả tim, 5 người xuất hiện<br/>3. **No-show phá kế hoạch** — đã đặt 2 sân, đến nơi có 5 người<br/>4. **Trả lời lặp lại** — "sân ở đâu?", "bao nhiêu tiền?", "có vợt cho mượn không?" × 20 lần/tuần<br/>5. **Chi phí Meetup** — phí duy trì nhóm không đáng cho việc phi lợi nhuận |
| **Tần suất** | 2–3 lần/tuần tạo/nhân bản hoạt động; kiểm tra danh sách người tham gia mỗi ngày trước buổi chơi |
| **Kỳ vọng** | Nhân bản buổi tuần trước chỉ đổi ngày (< 30 giây); recurring weekly; đặt `capacity` cứng + danh sách chờ tự động; ô "thông tin thường gặp" hiển thị ngay trên trang chi tiết; nhắn một lần tới tất cả người đã RSVP; **đánh dấu no-show bằng 1 chạm** sau buổi chơi; xem ai hay bỏ hẹn |
| **Điều làm anh ta bỏ app** | Bắt trả phí; form tạo hoạt động dài quá 1 màn hình; phải dùng web mới tạo được |
| **Trust level** | T4 (trusted) sau ~8 buổi tổ chức |
| **Role** | `member` (toàn cục) + host của các buổi cầu lông mình tạo |
| **Câu nói đại diện** | *"I'm not an event manager. I just want to play badminton and I need seven other people to show up."* |
| **Hệ quả thiết kế bắt buộc** | (a) `POST /events` phải làm được **hoàn toàn trên mobile trong ≤ 90 giây**, tối đa 6 trường bắt buộc;<br/>(b) `duplicate` và `recurrence_rule` là tính năng MVP, không phải "để sau";<br/>(c) `waitlist` tự động đôn lên khi có người huỷ;<br/>(d) màn hình check-in kiểu danh sách, chạm để đổi `attended` / `no_show`;<br/>(e) thông báo đẩy cho host khi có người huỷ trong vòng 6 giờ trước giờ bắt đầu |

---

### 7.4 Persona P4 — "Linh, organizer chuyên nghiệp / business"

| | |
|---|---|
| **Ảnh chân dung** | Nữ, 33 tuổi, người Việt, đồng sở hữu một studio yoga & không gian cộng đồng ở **An Thượng**; nói tiếng Anh tốt |
| **Bối cảnh kinh doanh** | Studio sống nhờ khách expat và khách lưu trú dài ngày; tổ chức 5–8 hoạt động/tuần (yoga, thiền, sound healing, language exchange tối thứ Sáu) |
| **Đội ngũ** | Bản thân + 1 nhân viên marketing bán thời gian |
| **Thiết bị** | **Laptop cho việc tạo & phân tích**, iPhone cho check-in tại quầy lễ tân |
| **Kênh hiện tại** | Instagram (chính), Facebook Page, Google Business, một số nhóm WhatsApp |

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu** | Dòng người tham gia ổn định và **dự đoán được**; đo được kênh nào mang khách; xây thương hiệu studio trong cộng đồng expat |
| **Động lực sâu** | Doanh thu. Mỗi ghế trống là tiền mất. Nhưng cũng thật lòng muốn tạo cộng đồng — đó là điểm khác biệt của studio |
| **Pain point** | 1. **Instagram không đo được** — không biết ai thực sự sẽ đến<br/>2. **Không có lịch tập trung** — khách hỏi lịch tuần qua DM, phải trả lời tay<br/>3. **Bị coi là spam** — đăng vào nhóm Facebook expat hay bị gỡ vì "quảng cáo"<br/>4. **Rào cản ngôn ngữ ngược** — cần mô tả tiếng Anh tự nhiên, không phải dịch máy<br/>5. **Không có hồ sơ thương hiệu** — mọi thứ gắn với tài khoản cá nhân |
| **Tần suất** | Hằng ngày; tạo hàng loạt vào thứ Hai cho cả tuần; xem analytics thứ Hai và thứ Sáu |
| **Kỳ vọng** | Hồ sơ tổ chức (organization profile) tách khỏi hồ sơ cá nhân; tạo hàng loạt / lịch lặp; **nhiều người cùng quản lý một hồ sơ** (co-host); analytics: lượt xem → RSVP → có mặt, theo từng loại hoạt động; xuất danh sách người tham gia; badge xác minh doanh nghiệp; **sẵn sàng trả phí** cho nổi bật/ưu tiên khu vực (mô hình freemium GĐ sau) |
| **Điều làm cô ấy bỏ app** | Bị đối xử như spammer; không có analytics; không thể để nhân viên cùng quản lý |
| **Trust level** | T5 (ID/business verified) — chủ động muốn có badge để tạo tin cậy |
| **Role** | `member` (toàn cục) + host/co-host các buổi của studio + badge `verified_business` (+ `local_host` vì là người Việt) |
| **Câu nói đại diện** | *"I need to know which of my classes actually fill up, and I need my assistant to be able to post without using my account."* |
| **Hệ quả thiết kế bắt buộc** | (a) Khái niệm **organization** (nhiều `user` ↔ một `organization`, vai trò `owner`/`editor`) — dù MVP có thể làm tối giản, schema phải chừa chỗ;<br/>(b) `events.host_type = individual \| organization` (cột đi kèm `events.host_user_id`);<br/>(c) analytics cấp organizer là tính năng MVP, không để GĐ sau;<br/>(d) badge `verified_business` cần quy trình duyệt thủ công bởi `admin`;<br/>(e) ranh giới nội dung thương mại: cho phép quảng bá hoạt động **có thu phí** nhưng phải khai `price` minh bạch — cấm bài đăng thuần quảng cáo dịch vụ không phải hoạt động |

---

### 7.5 Persona P5 — "Minh, Content Curator (nội bộ)"

| | |
|---|---|
| **Ảnh chân dung** | Nam, 27 tuổi, người Việt, thành viên đội sáng lập, phụ trách community ops |
| **Bối cảnh** | Là thành viên thật của 6 nhóm Facebook/WhatsApp expat; biết mặt nhiều organizer ngoài đời |
| **Thiết bị** | Laptop, 2 màn hình. Mở song song app admin + trình duyệt nhóm |

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu tuần** | 25 listing mới/tuần, phủ ≥ 5 khu vực và ≥ 4 loại hình; 3 lời mời claim gửi đi; ≥ 1 claim thành công |
| **Pain point** | Nhập tay lặp lại; mất dấu listing nào đã liên hệ; sợ sai giờ/địa chỉ; không có cách nhanh để "tuần này giống tuần trước" |
| **Tần suất** | Hằng ngày, 2 phiên/ngày |
| **Kỳ vọng công cụ (rất cụ thể)** | Form curate có: dán URL nguồn → tự điền `source_platform`; ghi nhớ khu vực & danh mục dùng gần nhất; nút "nhân bản sang tuần sau"; bảng theo dõi vòng đời claim (`not_contacted` → `contacted` → `claim_sent` → `claimed` / `declined`); template thư mời claim có chèn số liệu thật ("X người quan tâm") |
| **Trust level** | T5, role `curator` |
| **Câu nói đại diện** | *"Every listing I type by hand is a bet that the original organizer will take it over. I need to know which bets are paying off."* |
| **Hệ quả thiết kế bắt buộc** | Bảng `curated_listing_pipeline` với `claim_status`, `contact_attempts`, `last_contacted_at`, `original_organizer_contact` (lưu tối thiểu, mã hoá); dashboard tỷ lệ claim |

---

### 7.6 Persona P6 — "Anna, Community Moderator (tình nguyện từ cộng đồng)"

| | |
|---|---|
| **Ảnh chân dung** | Nữ, 38 tuổi, người Đức, sống ở Đà Nẵng 5 năm, thành viên tích cực, được đội sáng lập mời làm moderator |
| **Thời gian dành ra** | 3–5 giờ/tuần, không lương (được ghi nhận bằng badge + quyền truy cập sớm tính năng) |
| **Thiết bị** | Laptop cho xử lý hàng đợi, mobile cho cảnh báo `critical` |

| Khía cạnh | Nội dung |
|---|---|
| **Mục tiêu** | Không để một sự cố an toàn nào rơi qua kẽ hở; giữ tông cộng đồng thân thiện, không độc hại |
| **Pain point** | Report đến lúc 23h; khó phân biệt hiểu lầm văn hoá với hành vi xấu thật; áp lực khi phải khoá một người quen ngoài đời; lo bị trả đũa cá nhân |
| **Tần suất** | Hằng ngày, phiên ngắn |
| **Kỳ vọng công cụ** | Hàng đợi ưu tiên; toàn bộ ngữ cảnh trong một màn hình; hành động phân bậc có gợi ý; **ẩn danh người báo cáo**; hành động của moderator hiển thị dưới danh nghĩa "Da Nang Connect Moderation Team", **không lộ tên cá nhân**; leo thang lên `admin` bằng 1 chạm |
| **Trust level** | T5, role `moderator` |
| **Câu nói đại diện** | *"I'll do this because I care about this community — but my name must never appear on a ban notice."* |
| **Hệ quả thiết kế bắt buộc** | (a) Bút danh vận hành: thông báo kiểm duyệt gửi đi luôn ký tên tổ chức;<br/>(b) `moderation_action.actor_id` chỉ hiển thị cho `admin`/`super_admin`;<br/>(c) báo cáo luôn ẩn danh với người bị báo cáo;<br/>(d) moderator **không được** xử lý report liên quan đến chính mình hoặc hoạt động mình tổ chức — hệ thống chặn cứng (conflict-of-interest guard) |

### 7.7 So sánh nhanh sáu persona

| Tiêu chí | P1 Marco (nomad) | P2 Sarah (gia đình) | P3 Tom (nghiệp dư) | P4 Linh (business) | P5 Minh (curator) | P6 Anna (moderator) |
|---|---|---|---|---|---|---|
| Thiết bị chính | Mobile iOS | Mobile iOS + iPad | Mobile Android | **Web** + mobile | **Web** | Web + mobile |
| Tần suất | Hằng ngày | 1–2×/tuần | 2–3×/tuần | Hằng ngày | Hằng ngày | Hằng ngày |
| Tầm nhìn thời gian | Hôm nay – 3 ngày | 1–2 tuần | Tuần này | Cả tháng | Tuần tới | Thời gian thực |
| Bán kính quan tâm | ≤ 3 km | ≤ 8 km, ưu tiên gần trường | ≤ 5 km | Cố định 1 địa điểm | Toàn thành phố | Toàn thành phố |
| Nhạy cảm giá | Cao (miễn phí) | Trung bình | Rất cao (miễn phí) | Thấp (sẵn sàng trả) | — | — |
| Trust level đạt tới | T2–T3 | T4–T5 | T4 | T5 | T5 | T5 |
| Role toàn cục | `member` | `member` | `member` | `member` | `curator` | `moderator` |
| Quan hệ theo sự kiện | attendee | attendee → host | host | host + co-host (nhân viên) | — | — |
| Rủi ro lớn nhất khiến rời bỏ | App trống | Vấn đề an toàn | Có ma sát/phí | Không có analytics | Công cụ nhập liệu tệ | Kiệt sức, lộ danh tính |

---

## 8. Hệ thống role

### 8.1 Quyết định nền tảng — role toàn cục là một enum đúng 5 giá trị

Trước bản 1.0, tài liệu phân tích tồn tại mâu thuẫn **MT-02**: có chỗ nói tới `guest`, `organizer`,
`verified_member`, `support`, `service_provider` như thể chúng là role trong DB, trong khi lược đồ ở
`03-domain-va-du-lieu.md` chỉ có 4 giá trị. Bản này **chốt dứt điểm**:

> Cột `users.role` kiểu `user_role_enum` có **đúng 5 giá trị**:
> `member` | `curator` | `moderator` | `admin` | `super_admin`.
> Không có giá trị nào khác, không có giá trị "dự trữ cho giai đoạn sau".

```sql
CREATE TYPE user_role_enum AS ENUM (
  'member',       -- mặc định cho mọi tài khoản
  'curator',      -- đội sáng lập, nhập listing từ nguồn ngoài
  'moderator',    -- kiểm duyệt + hỗ trợ tài khoản (đã gộp 'support')
  'admin',        -- vận hành nền tảng, taxonomy, analytics
  'super_admin'   -- gán role, xoá vĩnh viễn, audit đầy đủ
);

ALTER TABLE users
  ADD COLUMN role user_role_enum NOT NULL DEFAULT 'member';
```

**Bốn thứ trông giống role nhưng KHÔNG phải role** — đây là nguồn gốc của MT-02:

| Khái niệm | Bản chất thật | Lưu ở đâu | Kiểm tra bằng gì |
|---|---|---|---|
| `guest` | **Trạng thái phiên**, không phải hàng trong `users`. Là "chưa có JWT hợp lệ" | Không lưu ở đâu cả | `@Public()` decorator + `request.user === undefined` |
| `organizer` | **Quan hệ theo sự kiện** — một user là organizer *của những sự kiện mình tạo*, không phải của toàn hệ thống | `events.host_user_id` và bảng `event_cohosts` | `EventOwnershipGuard` truy vấn quan hệ với `eventId`/`occurrenceId` trong route param |
| `verified_member` | **Trust level**, một bậc trên thang T0–T5 | `users.trust_level` (smallint 0–5) | `@MinTrust(2)` decorator |
| `support` | **Đã gộp vào `moderator`.** Không tồn tại như role riêng | — | Permission `user.support.*` gán cho `moderator` |

Và `service_provider` (giai đoạn 2–3) **không** được thêm vào enum. Khi tới giai đoạn đó, nhà cung cấp
dịch vụ được mô hình hoá bằng bảng `service_providers` + bảng nối `provider_members(user_id, provider_id, role)`
— tức là cùng một khuôn "quan hệ theo thực thể" như `event_cohosts`, không làm phình enum toàn cục.

### 8.2 Ba trục phân quyền — mô hình chính thức

Mọi quyết định cho phép/từ chối trong hệ thống là hàm của **ba trục độc lập**, cộng thêm một cổng chặn
trạng thái tài khoản:

```mermaid
flowchart TB
    REQ["Request<br/>userId · action · resource"]

    G0{"Trục 0 — Trạng thái tài khoản<br/>users.status"}
    G1{"Truc 1 — Role toan cuc<br/>users.role"}
    G2{"Truc 2 — Quan he theo su kien<br/>events.host_user_id / event_cohosts"}
    G3{"Truc 3 — Trust level<br/>users.trust_level (T0-T5)"}

    DENY["403 Forbidden<br/>+ ly do i18n"]
    ALLOW["Cho phep<br/>+ ghi audit_log neu la hanh dong quan tri"]

    REQ --> G0
    G0 -->|"restricted / suspended / banned / deleted"| DENY
    G0 -->|"active"| G1
    G1 -->|"role co quyen tinh"| ALLOW
    G1 -->|"role khong du"| G2
    G2 -->|"la host hoac co-host cua chinh resource"| G3
    G2 -->|"khong co quan he"| DENY
    G3 -->|"trust_level >= nguong + con han muc"| ALLOW
    G3 -->|"duoi nguong hoac het han muc"| DENY

    style DENY fill:#ffe5e5,stroke:#d63a3a
    style ALLOW fill:#e6f7e6,stroke:#2e9e4f
```

**Thứ tự đánh giá là bắt buộc và không đổi**: trạng thái → role → quan hệ → trust. Lý do: một `admin`
đang bị `suspended` phải bị chặn trước khi hệ thống kịp nghĩ tới role của họ; và một `member` ở T0 không
được vượt rào bằng cách trở thành host của chính event mình vừa tạo.

### 8.3 Chi tiết từng role toàn cục

| Role | Ai được cấp | Cách cấp | Ai cấp được | Số lượng dự kiến GĐ1 | Thu hồi | 2FA |
|---|---|---|---|---|---|---|
| `member` | Mọi tài khoản | Mặc định khi `INSERT users` | Hệ thống | ~100 (M1) → ~2.000 (M6) | Không áp dụng (là sàn) | Tuỳ chọn |
| `curator` | Thành viên đội sáng lập phụ trách community ops | Gán tay | `super_admin` | 2–3 | `super_admin` hạ về `member`; listing đã tạo giữ nguyên, chuyển `owned_by_team = true` | **Bắt buộc** |
| `moderator` | Nhân sự nội bộ kiêm nhiệm (M1–M3) → thành viên cộng đồng T5 tình nguyện (từ M4) | Gán tay sau khi ký cam kết bảo mật | `super_admin` (`admin` chỉ **đề xuất**) | 1–2 (M1) → 4–6 (M6) | `super_admin`; tự động hạ nếu 30 ngày không xử lý report nào | **Bắt buộc** |
| `admin` | Founder kỹ thuật / product owner | Gán tay | `super_admin` | 2 | `super_admin` | **Bắt buộc** |
| `super_admin` | CTO + một founder dự phòng | Gán tay, bắt buộc 2 người xác nhận (four-eyes) | `super_admin` khác | **Tối thiểu 2, tối đa 3** | Chỉ bởi `super_admin` khác; **hệ thống chặn cứng** thao tác làm số `super_admin` đang `active` xuống dưới 2 | **Bắt buộc + khoá bảo mật phần cứng khuyến nghị** |

**Quy tắc cứng về nâng/hạ role** (áp dụng ở tầng service, không chỉ ở UI):

1. Không role nào tự nâng chính mình. `actor_id != target_user_id` là ràng buộc kiểm tra ở `UsersService.changeRole()`.
2. Không ai gán được role **cao hơn hoặc bằng** role của chính mình, trừ `super_admin` (được gán `super_admin`).
3. Mọi lần đổi role ghi `audit_log` với `before_role`, `after_role`, `reason` (bắt buộc, tối thiểu 20 ký tự).
4. Đổi role làm **thu hồi toàn bộ refresh token** của người bị đổi → buộc đăng nhập lại, tránh giữ quyền cũ trong access token còn hạn.
5. Nâng lên `moderator`/`admin`/`super_admin` yêu cầu tài khoản đích đang ở `status = active` và `trust_level >= 3`.

### 8.4 Quan hệ theo sự kiện — `host` và `co-host`

Đây là trục thay thế cho "role `organizer`" đã bị loại bỏ.

```sql
-- Chủ sở hữu chính: đúng một người, nằm ngay trên bảng events
ALTER TABLE events
  ADD COLUMN host_user_id uuid NOT NULL REFERENCES users(id),
  ADD COLUMN host_type    event_host_type_enum NOT NULL DEFAULT 'individual'; -- individual | organization

-- Đồng tổ chức: nhiều người, quyền hạn cấu hình được
CREATE TABLE event_cohosts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id),
  can_edit      boolean NOT NULL DEFAULT true,
  can_cancel    boolean NOT NULL DEFAULT false,  -- mặc định KHÔNG cho huỷ
  can_message   boolean NOT NULL DEFAULT true,
  can_check_in  boolean NOT NULL DEFAULT true,
  invited_by    uuid NOT NULL REFERENCES users(id),
  accepted_at   timestamptz,                     -- NULL = lời mời chưa được nhận
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_event_cohosts UNIQUE (event_id, user_id)
);
CREATE INDEX idx_event_cohosts_user ON event_cohosts (user_id) WHERE accepted_at IS NOT NULL;
```

| Đặc tính | `host` | `co-host` |
|---|---|---|
| Số lượng trên một event | Đúng 1 | 0–5 (GĐ1 giới hạn 5) |
| Cách đạt được | Tạo event (UC-19), hoặc nhận quyền sở hữu listing curated (UC-68) | Được host mời và **đã bấm chấp nhận** (UC-26) — `accepted_at IS NOT NULL` |
| Trust tối thiểu | T1 để tạo, T2 để publish event có `location_precision = exact` | T2 |
| Chuyển quyền sở hữu | Chỉ host chuyển được cho một co-host đã chấp nhận | Không |
| Huỷ event | Có, luôn có | Chỉ khi `can_cancel = true` |
| Xoá event | Không ai — event đã publish chỉ chuyển sang `cancelled` | Không |
| Áp dụng ở cấp nào | Cấp `event` (áp xuống mọi `event_occurrences` con) | Cấp `event` |
| Gỡ bỏ | — | Host gỡ bất cứ lúc nào; co-host tự rời |

> **Lưu ý phạm vi**: quan hệ host/co-host gắn ở cấp **`events`**, còn RSVP và điểm danh gắn ở cấp
> **`event_occurrences`** (quyết định MT-03). Guard vì vậy phải giải `occurrenceId → event_id` trước khi
> kiểm tra quan hệ. Xem §13.3.

### 8.5 Sơ đồ quan hệ ba trục

```mermaid
erDiagram
    USERS ||--o{ EVENTS : "host_user_id (1 host)"
    USERS ||--o{ EVENT_COHOSTS : "duoc moi lam co-host"
    EVENTS ||--o{ EVENT_COHOSTS : "co toi da 5 co-host"
    EVENTS ||--|{ EVENT_OCCURRENCES : "1..n buoi"
    EVENT_OCCURRENCES ||--o{ RSVPS : "cho ngoi"
    USERS ||--o{ RSVPS : "dang ky"
    USERS ||--o{ TRUST_SIGNALS : "bang chung tin cay"
    USERS ||--o{ AUDIT_LOG : "actor"

    USERS {
        uuid id PK
        user_role_enum role "5 gia tri"
        user_status_enum status "vong doi §10"
        smallint trust_level "0-5, §11"
    }
    EVENTS {
        uuid id PK
        uuid host_user_id FK
        event_host_type_enum host_type
    }
    EVENT_COHOSTS {
        uuid event_id FK
        uuid user_id FK
        boolean can_cancel
        timestamptz accepted_at
    }
    EVENT_OCCURRENCES {
        uuid id PK
        uuid event_id FK
        timestamptz starts_at
        integer capacity
    }
    RSVPS {
        uuid id PK
        uuid occurrence_id FK
        uuid user_id FK
        rsvp_status_enum status
        smallint guest_count
    }
```

---

## 9. Ma trận phân quyền RBAC

### 9.1 Cách đọc ma trận

- **Sáu cột role** (`guest` → `super_admin`) trả lời: *chỉ dựa vào role toàn cục*, user có quyền này không —
  **chưa** tính quan hệ với sự kiện cụ thể.
- **Hai cột ngữ cảnh** (`host của sự kiện đó`, `co-host`) là **lớp cộng thêm**: quyền mở ra khi user có
  quan hệ đó với chính resource đang thao tác, bất kể role toàn cục là gì.
- Ký hiệu: **✅ Có** · **❌ Không** · **⚠️ Đn** = có điều kiện, tra mã `Đn` ở §9.3 · **—** = không áp dụng.
- Mọi ô ✅/⚠️ đều ngầm định điều kiện nền **Đ0**: `users.status = 'active'` (hoặc `guest` với các quyền công khai).

### 9.2 Ma trận chính — 22 quyền × 8 cột

| # | Quyền | Permission key | guest | member | curator | moderator | admin | super_admin | **host của sự kiện đó** | **co-host** |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Xem sự kiện công khai | `event.view_public` | ⚠️ Đ1 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (kể cả `draft` của mình) | ✅ (kể cả `draft`) |
| 2 | Tạo sự kiện | `event.create` | ❌ | ⚠️ Đ2 | ✅ | ⚠️ Đ2 | ⚠️ Đ2 | ⚠️ Đ2 | — | — |
| 3 | Sửa sự kiện của mình | `event.update.own` | ❌ | ⚠️ Đ6 | ⚠️ Đ6 | ⚠️ Đ6 | ⚠️ Đ6 | ⚠️ Đ6 | ✅ Đ4 | ⚠️ Đ5 |
| 4 | Sửa sự kiện người khác | `event.update.any` | ❌ | ❌ | ⚠️ Đ7 | ⚠️ Đ8 | ⚠️ Đ9 | ⚠️ Đ9 | ❌ | ❌ |
| 5 | Huỷ sự kiện | `event.cancel` | ❌ | ⚠️ Đ6 | ⚠️ Đ7 | ⚠️ Đ11 | ⚠️ Đ9 | ⚠️ Đ9 | ✅ Đ12 | ⚠️ Đ13 |
| 6 | RSVP (đăng ký tham gia) | `rsvp.create` | ❌ Đ14 | ⚠️ Đ15 | ⚠️ Đ15 | ⚠️ Đ15 | ⚠️ Đ15 | ⚠️ Đ15 | ❌ Đ16 | ❌ Đ16 |
| 7 | Huỷ RSVP | `rsvp.cancel.own` | ❌ | ✅ Đ17 | ✅ Đ17 | ✅ Đ17 | ✅ Đ17 | ✅ Đ17 | ⚠️ Đ18 | ⚠️ Đ18 |
| 8 | Xem danh sách người tham gia | `attendee.list` | ❌ Đ19 | ⚠️ Đ20 | ⚠️ Đ7 | ⚠️ Đ21 | ⚠️ Đ21 | ⚠️ Đ21 | ✅ Đ22 | ✅ Đ22 |
| 9 | Đánh dấu check-in | `attendance.check_in` | ❌ | ❌ | ⚠️ Đ7 | ❌ | ⚠️ Đ23 | ⚠️ Đ23 | ✅ Đ24 | ⚠️ Đ25 |
| 10 | Đánh dấu no-show | `attendance.no_show` | ❌ | ❌ | ⚠️ Đ7 | ⚠️ Đ26 | ⚠️ Đ26 | ⚠️ Đ26 | ✅ Đ27 | ⚠️ Đ25 |
| 11 | Bình luận | `comment.create` | ❌ | ⚠️ Đ28 | ✅ | ✅ | ✅ | ✅ | ✅ + ghim được 1 comment | ✅ |
| 12 | Nhắn tin 1-1 | `dm.send` | ❌ | ⚠️ Đ29 | ⚠️ Đ30 | ⚠️ Đ31 | ⚠️ Đ31 | ⚠️ Đ31 | ⚠️ Đ32 | ⚠️ Đ32 |
| 13 | Báo cáo vi phạm | `report.create` | ⚠️ Đ33 | ✅ | ✅ | ⚠️ Đ34 | ⚠️ Đ34 | ⚠️ Đ34 | ✅ | ✅ |
| 14 | Ẩn nội dung | `content.hide` | ❌ | ❌ | ⚠️ Đ7 | ✅ Đ35 | ✅ Đ35 | ✅ Đ35 | ⚠️ Đ36 | ⚠️ Đ36 |
| 15 | Khoá tài khoản | `user.suspend` | ❌ | ❌ | ❌ | ⚠️ Đ37 | ⚠️ Đ38 | ✅ Đ39 | ❌ | ❌ |
| 16 | Xem hàng đợi kiểm duyệt | `moderation.queue.view` | ❌ | ❌ | ⚠️ Đ40 | ✅ Đ41 | ✅ | ✅ | ❌ | ❌ |
| 17 | Curate sự kiện từ nguồn ngoài | `curation.create` | ❌ | ❌ | ✅ Đ42 | ❌ | ✅ Đ42 | ✅ Đ42 | — | — |
| 18 | Xem analytics cấp sự kiện | `analytics.event.view` | ❌ | ❌ | ⚠️ Đ7 | ❌ | ✅ | ✅ | ✅ Đ43 | ✅ Đ43 |
| 19 | Xem analytics toàn hệ thống | `analytics.platform.view` | ❌ | ❌ | ⚠️ Đ44 | ❌ | ✅ | ✅ | ❌ | ❌ |
| 20 | Quản lý khu vực | `area.manage` | ❌ | ❌ | ❌ Đ45 | ❌ | ⚠️ Đ46 | ⚠️ Đ46 | ❌ | ❌ |
| 21 | Quản lý danh mục | `category.manage` | ❌ | ❌ | ❌ Đ45 | ❌ | ⚠️ Đ47 | ⚠️ Đ47 | ❌ | ❌ |
| 22 | Xem audit log | `audit_log.view` | ❌ | ⚠️ Đ48 | ⚠️ Đ48 | ⚠️ Đ49 | ⚠️ Đ50 | ✅ Đ51 | ❌ | ❌ |

### 9.3 Bảng điều kiện — giải thích từng mã `Đn`

| Mã | Điều kiện đầy đủ (là đặc tả để viết guard, không phải mô tả chung chung) |
|---|---|
| **Đ0** | Điều kiện nền cho mọi ô: `users.status = 'active'`. Trạng thái `restricted` chỉ giữ lại quyền đọc + `report.create` + `rsvp.cancel.own`; `suspended`/`banned`/`deleted` mất toàn bộ quyền ghi và không đăng nhập được. |
| **Đ1** | `guest` thấy: tiêu đề, mô tả, ảnh bìa, danh mục, `area`, ngày giờ, tên hiển thị + badge của host, số chỗ còn lại. **Bị che**: địa chỉ chính xác (chỉ thấy tâm khu vực với bán kính 500 m khi `location_precision = area_only`), danh sách người tham gia, bình luận (chỉ thấy 3 comment đầu rồi chặn), link liên hệ. Sự kiện `draft` / `pending_review` / `cancelled` không nằm trong feed công khai. |
| **Đ2** | `trust_level >= 1` (email đã verify) **và** còn hạn mức tạo theo bậc (§11.2) **và** `status = 'active'`. Với `trust_level = 1`, event tạo ra vào `pending_review` nếu mô tả chứa link ngoài allowlist hoặc số điện thoại. `moderator`/`admin`/`super_admin` tạo event **với tư cách member bình thường** — role vận hành không cho đặc quyền tạo. |
| **Đ4** | Host sửa được mọi trường. Nếu là **thay đổi trọng yếu** (`starts_at`, `ends_at`, `venue`, `price`, `capacity` giảm) thì: bắt buộc nhập `change_reason`, hệ thống gửi thông báo tới toàn bộ RSVP `going` + `waitlisted`, và huỷ/đặt lại job nhắc T-24h & T-2h. Sau khi occurrence đã `completed` thì chỉ sửa được `summary` và ảnh tổng kết. |
| **Đ5** | Co-host cần `event_cohosts.can_edit = true` và `accepted_at IS NOT NULL`. **Không** sửa được: `host_user_id`, `host_type`, danh sách co-host, và không xoá được occurrence đã có RSVP. |
| **Đ6** | Không có quyền nhờ role. Chỉ có quyền khi chính user là `events.host_user_id` hoặc co-host của **chính** event đó — tức là rơi về hai cột ngữ cảnh. Ghi ⚠️ ở đây để nhắc rằng nhãn "của mình" trong tên quyền là quan hệ, không phải role. |
| **Đ7** | `curator` chỉ thao tác trên event có `source_type != 'self_serve'` **và** `claim_status != 'claimed'` **và** `created_by = <chính curator đó>` (hoặc `owned_by_team = true`). Ngay khi organizer gốc claim thành công (UC-68), quyền này tắt tự động. |
| **Đ8** | `moderator` **không** sửa nội dung nghiệp vụ. Chỉ được: che/xoá ảnh bìa vi phạm, che đoạn mô tả vi phạm (thay bằng placeholder i18n `moderation.content_removed`), gỡ link. Mọi thao tác ghi `audit_log` + `moderation_actions` với `reason` bắt buộc và thông báo tới host. |
| **Đ9** | `admin`/`super_admin` sửa/huỷ được event bất kỳ nhưng **chỉ qua màn hình admin có ô lý do bắt buộc**, không qua endpoint công khai. Ghi `audit_log` mức `high`. `admin` không sửa được event mà `host_user_id` là `super_admin`. |
| **Đ11** | `moderator` huỷ event chỉ với lý do thuộc nhóm an toàn (`safety_risk`, `illegal_content`, `impersonation`, `scam`). Không huỷ được vì lý do chất lượng nội dung. Bắt buộc thông báo host + toàn bộ attendee, và mở đường khiếu nại UC-63. |
| **Đ12** | Host huỷ bất cứ lúc nào, **bắt buộc** `cancellation_reason`. Nếu huỷ trong vòng 24 h trước `starts_at` **và** occurrence đã có ≥ 3 RSVP `going`: phải chọn lý do từ danh sách cố định, và hệ thống ghi `trust_signal` loại `late_cancel_as_host` (trọng số âm). Event chuyển `cancelled`, **không xoá** — trang vẫn truy cập được để attendee hiểu chuyện gì xảy ra. |
| **Đ13** | Co-host chỉ huỷ được khi `event_cohosts.can_cancel = true` (mặc định `false`). Khi huỷ, thông báo gửi đi vẫn ký tên host chính; host nhận push riêng "co-host X đã huỷ buổi Y". |
| **Đ14** | `guest` bị chặn có chủ đích tại đây — đây là "cổng giá trị" của sản phẩm. UI không ẩn nút RSVP mà hiện nó rồi mở màn hình đăng ký, giữ nguyên ngữ cảnh event để quay lại sau khi đăng nhập (UC-09). |
| **Đ15** | Endpoint chuẩn: `POST /api/v1/occurrences/{occurrenceId}/rsvps`. Điều kiện: `trust_level >= 1`; nếu `trust_level = 0` thì chỉ RSVP được occurrence có `trust_gate = 'none'`. Thêm: occurrence chưa `starts_at`, chưa `cancelled`, chưa bị host chặn user này, và `guest_count <= max_guests_per_rsvp`. Hết chỗ → `status = 'waitlisted'` (waitlist là **MUST** của MVP). Đường tắt `POST /api/v1/events/{eventId}/rsvps` tự trỏ tới occurrence sắp diễn ra gần nhất và trả **409** nếu event có nhiều occurrence sắp tới. |
| **Đ16** | Host/co-host **không** tạo RSVP cho chính occurrence mình tổ chức — hệ thống mặc định tính họ là có mặt và đếm vào `capacity` nếu `host_occupies_slot = true`. Trả `409 HOST_CANNOT_RSVP`. |
| **Đ17** | Huỷ RSVP của chính mình bất cứ lúc nào, không cần lý do (nguyên tắc P4 — không phán xét). Nếu huỷ trong vòng 6 h trước `starts_at`: ghi `trust_signal` `late_cancel` (âm nhẹ), và đôn người đầu waitlist lên ngay với cửa sổ xác nhận 12 h (UC-40). |
| **Đ18** | Host/co-host không "huỷ RSVP" của người khác mà dùng hành động riêng `attendee.remove` — cần lý do, gửi thông báo cho người bị gỡ, và người đó không RSVP lại được occurrence này. Co-host cần `can_edit = true`. |
| **Đ19** | `guest` chỉ thấy **số đếm** ("12 người sẽ tham gia") và tối đa 3 avatar mờ, không thấy tên. Đây là ràng buộc an toàn P4, không phải giới hạn kỹ thuật. |
| **Đ20** | `member` thấy danh sách khi **đã RSVP** occurrence đó (`going` hoặc `waitlisted`) **và** `trust_level >= 2`. Chỉ hiển thị những attendee bật `profiles.show_in_attendee_list = true`; số còn lại gộp thành "và N người khác". Không bao giờ lộ email/phone. |
| **Đ21** | `moderator`/`admin`/`super_admin` xem đầy đủ **chỉ khi đang xử lý một report gắn với occurrence đó** (`moderation_case_id` bắt buộc trên request). Mỗi lần xem ghi `audit_log` loại `pii_access`. Không có màn hình duyệt danh sách attendee tự do. |
| **Đ22** | Host/co-host thấy đầy đủ tên hiển thị, avatar, badge, trust level, câu trả lời câu hỏi đăng ký (UC-41). Email/phone **chỉ** hiển thị khi attendee bật `share_contact_with_host`. Xuất CSV yêu cầu `trust_level >= 3` của host và ghi `audit_log`. |
| **Đ23** | `admin`/`super_admin` chỉ **sửa lỗi** điểm danh khi có ticket hỗ trợ, kèm `reason`; không dùng cho vận hành thường ngày. |
| **Đ24** | Cửa sổ điểm danh mở từ **T-2h** trước `starts_at` đến **T+48h** sau `ends_at`. Ngoài cửa sổ trả `409 CHECK_IN_WINDOW_CLOSED`. Chỉ điểm danh được người có RSVP `going`. |
| **Đ25** | Co-host cần `event_cohosts.can_check_in = true`. |
| **Đ26** | Vai trò vận hành chỉ **gỡ** nhãn `no_show` khi xử lý khiếu nại (UC-63), không tự gắn nhãn. Gỡ nhãn sẽ hoàn lại `trust_signal` âm tương ứng. |
| **Đ27** | Chỉ gắn được trong cửa sổ **T+2h → T+48h** sau `ends_at`. Nếu host đánh dấu `no_show` cho **hơn 50 %** attendee của một occurrence, bản ghi vào hàng đợi kiểm duyệt để chống lạm dụng. Attendee được khiếu nại trong 7 ngày. |
| **Đ28** | `trust_level >= 1`. T0 không bình luận. Hạn mức và quyền chèn link/ảnh theo bậc — xem §11.2. Comment đầu tiên của tài khoản < 48 h tuổi đi qua bộ lọc tự động UC-64. |
| **Đ29** | Cần **đồng thời**: (a) `trust_level >= 2` của người gửi; (b) hai bên đã từng cùng có mặt trong ít nhất một `event_occurrence` (một bên là host cũng tính); (c) cài đặt `who_can_message_me` của người nhận cho phép (mặc định `verified_only`); (d) không có bản ghi `blocks` giữa hai bên; (e) còn hạn mức hội thoại mới trong ngày. Không thoả (b) → chỉ gửi được **1 tin nhắn yêu cầu kết nối**, người nhận chấp nhận thì mở luồng. |
| **Đ30** | `curator` **không** DM tự do. Thư mời claim (UC-67) gửi qua kênh hệ thống `claim_invitation`, có template cố định, token hết hạn 14 ngày, tối đa 3 lần liên hệ cho một listing. |
| **Đ31** | Vai trò vận hành chỉ gửi **tin nhắn hệ thống** dưới danh nghĩa "Da Nang Connect Team". Người nhận không trả lời trực tiếp vào luồng đó mà mở ticket. Danh tính cá nhân moderator không bao giờ lộ (yêu cầu của persona P6). |
| **Đ32** | Host/co-host nhắn được attendee của mình **bỏ qua** điều kiện (b) của Đ29, nhưng vẫn tôn trọng `blocks` và vẫn bị giới hạn tần suất. Ưu tiên dùng "broadcast tới toàn bộ attendee" (1 lượt/occurrence/ngày) thay vì DM từng người. |
| **Đ33** | `guest` báo cáo được nội dung công khai qua form không cần đăng nhập, có captcha, giới hạn 3 báo cáo/IP/ngày, mặc định xếp mức `normal`. Không báo cáo được người dùng (chỉ nội dung). |
| **Đ34** | Vai trò vận hành báo cáo được, nhưng hệ thống **chặn cứng** việc chính người đó xử lý report do mình tạo, hoặc report liên quan tới sự kiện mình host — conflict-of-interest guard (persona P6, hệ quả (d)). |
| **Đ35** | Ẩn là `status = 'hidden'` + `hidden_reason` + `hidden_by`, **không phải xoá**. Nội dung vẫn nằm trong DB phục vụ khiếu nại và nghĩa vụ lưu trữ. Xoá vĩnh viễn chỉ `super_admin` (§9.4). Bắt buộc `reason` ≥ 20 ký tự và ghi `audit_log`. |
| **Đ36** | Host/co-host ẩn được **comment trong chính event của mình**. Hành động này tự sinh một report `auto_generated` đưa vào hàng đợi moderator để chống lạm dụng bịt miệng. Không ẩn được comment của `moderator`/`admin`. |
| **Đ37** | `moderator` được: cảnh cáo, chuyển sang `restricted` **tối đa 7 ngày**, chuyển sang `suspended` **tối đa 30 ngày**. **Không** được `banned` vĩnh viễn, không khoá được tài khoản có `role != 'member'`. |
| **Đ38** | `admin` được `suspended` không giới hạn thời gian và `banned`. Không khoá được `admin` khác hay `super_admin`. |
| **Đ39** | `super_admin` khoá được mọi tài khoản trừ chính mình, và là người duy nhất **khôi phục** được tài khoản `banned`. |
| **Đ40** | `curator` chỉ thấy tab "Curated content" — các report gắn với listing do đội tạo — để tự sửa thông tin sai. Không thấy report về người dùng, không thấy nội dung nhạy cảm. |
| **Đ41** | `moderator` thấy toàn bộ hàng đợi **trừ** các case bị conflict-of-interest guard lọc ra (report do chính mình tạo, về chính mình, hoặc về event mình host/co-host). |
| **Đ42** | Bắt buộc điền `source_url`, `source_platform`, `source_verified_at`, `is_curated = true`, và listing hiển thị công khai nhãn "Curated by Da Nang Connect". **Cấm tuyệt đối** nhập bằng script/crawler — endpoint curate có rate limit 30 listing/giờ/tài khoản và chặn user-agent không phải trình duyệt. |
| **Đ43** | Analytics cấp sự kiện gồm: lượt xem, lượt xem → RSVP, RSVP → có mặt, tỉ lệ no-show, nguồn truy cập, phân bố khu vực của attendee. Số liệu **tổng hợp**, không cho khoan xuống danh tính cá nhân ngoài danh sách attendee đã có ở quyền #8. Cần `trust_level >= 2`. |
| **Đ44** | `curator` chỉ xem dashboard phễu curate (UC-69): nhập → được quan tâm → gửi lời mời → claim → tự đăng buổi kế. Không xem được số liệu doanh thu, giữ chân, hay dữ liệu toàn hệ thống. |
| **Đ45** | `curator`/`moderator` **đề xuất** thêm khu vực/danh mục qua ticket nội bộ, `admin` là người thực thi. Ghi ❌ vì không có quyền ghi trực tiếp. |
| **Đ46** | `admin` thêm/sửa được `areas` (nhãn EN/VI, `parent_id`, polygon PostGIS, thứ tự hiển thị). **Sáu khu vực MVP** — An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn — bị đánh dấu `is_mvp_filter = true` và **không được xoá hay ẩn**; đổi polygon của chúng cần xác nhận hai bước. Xoá một `area` đang có event trả `409`. |
| **Đ47** | Tương tự Đ46 cho `categories`. Danh mục đang được dùng bởi ≥ 1 event chỉ được **đổi tên/ẩn**, không xoá. Mọi danh mục bắt buộc có bản dịch EN **và** VI trước khi bật hiển thị. |
| **Đ48** | `member`/`curator` chỉ xem được các bản ghi audit **liên quan trực tiếp tới chính tài khoản mình** và chỉ qua bản xuất dữ liệu cá nhân (UC-10) — không có màn hình duyệt log. |
| **Đ49** | `moderator` xem được log **hành động của chính mình** (để tự kiểm tra và bảo vệ khi bị chất vấn), không xem được log của moderator khác. |
| **Đ50** | `admin` xem toàn bộ `audit_log` **trừ** các bản ghi có `actor_role = 'super_admin'` và trừ các bản ghi loại `pii_access` do super_admin thực hiện. Không sửa, không xoá. |
| **Đ51** | `super_admin` xem toàn bộ. `audit_log` là **append-only**: không có endpoint UPDATE/DELETE, và ở tầng DB thu hồi quyền `UPDATE, DELETE` của role ứng dụng trên bảng này. |

### 9.4 Ma trận bổ sung — các quyền quản trị nhạy cảm

Những quyền dưới đây không nằm trong 22 dòng chính nhưng bắt buộc phải khai báo tường minh vì chúng là
"quyền huỷ hoại" theo nguyên tắc P5.

| Quyền | Permission key | guest | member | curator | moderator | admin | super_admin | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| Gán / thu hồi role | `user.role.assign` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Four-eyes; không tự đổi role mình; giữ ≥ 2 `super_admin` active |
| Xoá vĩnh viễn nội dung | `content.purge` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Chỉ khi có yêu cầu pháp lý hoặc nội dung bất hợp pháp |
| Ẩn danh hoá tài khoản | `user.anonymize` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Thực thi quyền được xoá dữ liệu; giữ lại bản ghi tham gia dạng ẩn danh |
| Xuất dữ liệu cá nhân của mình | `user.export.self` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | UC-10; gửi qua link có hạn 24 h |
| Xoá tài khoản của mình | `user.delete.self` | ❌ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Tài khoản có role ≠ `member` phải hạ role trước khi xoá được |
| Impersonate chỉ đọc | `user.impersonate.readonly` | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ✅ | Tối đa 30 phút/phiên; **bắt buộc** gửi thông báo cho user; banner đỏ trên toàn UI; ghi `audit_log` mức `critical` |
| Gửi thông báo broadcast | `notification.broadcast` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | Tối đa 2 lượt/tuần; bắt buộc có bản EN và VI; user tắt được trong UC-53 |
| Bật/tắt feature flag | `feature_flag.manage` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | UC-74; flag ảnh hưởng bảo mật chỉ `super_admin` |
| Mời & gỡ co-host | `event.cohost.manage` | ❌ | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | Chỉ host của chính event đó; tối đa 5 co-host |
| Đôn waitlist thủ công | `waitlist.promote` | ❌ | ❌ | ⚠️ | ❌ | ⚠️ | ⚠️ | Host/co-host (`can_edit`) đôn được; hệ thống tự đôn theo FIFO là mặc định |
| Gửi lời mời claim listing | `curation.claim_invite` | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | Tối đa 3 lần/listing; token 14 ngày (UC-67) |
| Nhận quyền sở hữu listing | `event.claim` | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | Cần token hợp lệ + `trust_level >= 2` + email khớp domain nguồn hoặc xác minh thủ công (UC-68) |

### 9.5 Bốn bất biến phải có test tự động

| # | Bất biến | Kiểm bằng |
|---|---|---|
| INV-1 | Không tồn tại đường đi nào cho `guest` tới một endpoint ghi dữ liệu, trừ `report.create` (Đ33) | Test quét toàn bộ route, mọi route không có `@Public()` phải qua `JwtAuthGuard` |
| INV-2 | Mọi hành động của `curator`/`moderator`/`admin`/`super_admin` trên dữ liệu người khác đều sinh đúng 1 bản ghi `audit_log` | Test tích hợp cho từng permission quản trị |
| INV-3 | Số `super_admin` có `status = 'active'` luôn ≥ 2 | Ràng buộc kiểm tra ở service + test cố hạ xuống 1 phải trả `409` |
| INV-4 | Conflict-of-interest: `moderation_cases.resolved_by != moderation_cases.reported_by` và người xử lý không phải host của event liên quan | Test tích hợp EP-09 |

---

## 10. Vòng đời tài khoản (state machine)

### 10.1 Sơ đồ trạng thái

`guest` là **trạng thái phiên**, không phải hàng trong bảng `users` — nó được vẽ trong sơ đồ để thể hiện
điểm vào, nhưng không bao giờ là giá trị của `users.status`.

```mermaid
stateDiagram-v2
    direction TB

    [*] --> guest : mo app / mo web lan dau

    state "guest (chua co hang trong users)" as guest
    state "registered" as registered
    state "email_verified" as email_verified
    state "phone_verified" as phone_verified
    state "active" as active
    state "restricted" as restricted
    state "suspended" as suspended
    state "banned" as banned
    state "deleted" as deleted

    guest --> registered : UC-01 dang ky email\nUC-04 social login\n[he thong tao user, trust_level=0]
    guest --> guest : UC-09 duyet noi dung cong khai

    registered --> email_verified : UC-02 bam link / nhap ma 6 so\n[token 24h, user tu thuc hien]\ntrust_level 0 -> 1
    registered --> deleted : 30 ngay khong verify\n[job BullMQ purge:unverified]

    email_verified --> phone_verified : UC-13 OTP SMS\n[5 phut, toi da 5 lan/so/gio]\ntrust_level 1 -> 2
    email_verified --> active : UC-05 hoan tat onboarding\n[chon area + so thich + ngon ngu]
    phone_verified --> active : UC-05 hoan tat onboarding

    active --> restricted : moderator (Do37) hoac\nUC-64 bo loc tu dong\n[<= 7 ngay, bat buoc ly do]
    restricted --> active : het han (job) hoac\nmoderator/admin go som
    restricted --> suspended : leo thang\n[moderator <= 30 ngay | admin khong gioi han]

    active --> suspended : vi pham nghiem trong\n[moderator <= 30 ngay | admin]
    suspended --> active : het han hoac\nUC-63 khieu nai thanh cong\n[moderator KHAC nguoi ra quyet dinh]
    suspended --> banned : tai pham / vi pham critical\n[admin hoac super_admin]

    active --> banned : vi pham critical ve an toan than the\n[chi super_admin, bo qua cac buoc]
    banned --> active : khoi phuc\n[CHI super_admin, four-eyes, bat buoc ly do]

    active --> deleted : UC-10 user tu yeu cau\n[an han 14 ngay]
    restricted --> deleted : UC-10
    suspended --> deleted : UC-10 (van cho xoa du lieu)
    banned --> deleted : super_admin an danh hoa
    deleted --> active : dang nhap lai trong 14 ngay an han\n[user tu khoi phuc]

    deleted --> [*] : sau 14 ngay -> an danh hoa\nsau 90 ngay -> hard purge backup

    note right of active
      Chi o trang thai nay user moi
      co day du quyen ghi (§9).
      Truc trust level (§11) van
      chay doc lap ben tren.
    end note

    note right of banned
      Email + so dien thoai vao
      danh sach chan; dang ky lai
      bi tu choi o buoc tao tai khoan.
    end note
```

### 10.2 Bảng chuyển trạng thái đầy đủ

| # | Từ | Đến | Sự kiện kích hoạt | **Ai được phép chuyển** | Điều kiện bắt buộc | Tác dụng phụ | UC |
|---|---|---|---|---|---|---|---|
| S1 | `guest` | `registered` | Đăng ký email/mật khẩu hoặc social login | Chính người dùng | Email chưa tồn tại (không phân biệt hoa thường); mật khẩu ≥ 10 ký tự; chấp nhận ToS + Chính sách quyền riêng tư (ghi `consents`) | Tạo `users` với `role='member'`, `status='registered'`, `trust_level=0`; gửi email xác minh; ghi `consent_log` | UC-01, UC-04 |
| S2 | `registered` | `email_verified` | Bấm link hoặc nhập mã 6 số | Chính người dùng | Token còn hạn 24 h; tối đa 5 lần gửi lại/ngày | `trust_level = 1`; ghi `trust_signals(email_verified)`; mở quyền tạo event & bình luận (Đ2, Đ28) | UC-02 |
| S2b | `guest` | `email_verified` | Social login Google/Apple với email đã được nhà cung cấp xác minh | Hệ thống | Provider trả `email_verified = true` | Bỏ qua bước S2; vẫn phải qua S4 để `active` | UC-04 |
| S3 | `email_verified` | `phone_verified` | Nhập OTP SMS | Chính người dùng | OTP hiệu lực 5 phút; tối đa 5 lần/số/giờ; một số điện thoại chỉ gắn được một tài khoản `active` | `trust_level = 2`; mở DM (Đ29), xem attendee list (Đ20) | UC-13 |
| S4 | `email_verified` / `phone_verified` | `active` | Hoàn tất onboarding | Chính người dùng | Đã chọn `home_area` (trong 6 khu vực MVP hoặc khác), ≥ 1 sở thích, ngôn ngữ nói | Xuất hiện trong tìm kiếm hồ sơ; nhận digest hằng tuần | UC-05 |
| S5 | `active` | `restricted` | Quyết định kiểm duyệt hoặc luật tự động | `moderator` (≤ 7 ngày), `admin`, `super_admin`, hoặc **hệ thống** qua UC-64 | Bắt buộc `reason` ≥ 20 ký tự + `restricted_until`; không áp dụng được cho tài khoản `role != 'member'` bởi `moderator` | Mất quyền ghi (còn đọc, huỷ RSVP của mình, báo cáo, xoá tài khoản); thông báo cho user kèm đường khiếu nại; ghi `audit_log` | UC-62 |
| S6 | `restricted` | `active` | Hết hạn hoặc gỡ sớm | Job BullMQ `moderation:expire`, hoặc `moderator`/`admin` | — | Khôi phục quyền; ghi `audit_log`; **không** tự khôi phục trust level đã bị trừ | UC-62, UC-63 |
| S7 | `restricted` / `active` | `suspended` | Vi phạm nghiêm trọng hoặc tái phạm | `moderator` (≤ 30 ngày), `admin` (không giới hạn), `super_admin` | Bắt buộc `reason` + case kiểm duyệt liên kết | Đăng xuất mọi phiên, thu hồi refresh token; ẩn toàn bộ event đang mở của user khỏi feed (không huỷ, để host có thể khiếu nại); huỷ mọi RSVP tương lai và đôn waitlist | UC-62 |
| S8 | `suspended` | `active` | Hết hạn hoặc khiếu nại thành công | Job BullMQ, hoặc **một `moderator` khác** người ra quyết định gốc, hoặc `admin` | Conflict-of-interest guard (INV-4) | Khôi phục event đã ẩn; thông báo cho user | UC-63 |
| S9 | `suspended` / `active` | `banned` | Vi phạm critical (an toàn thân thể, quấy rối tình dục, lừa đảo có tổ chức) hoặc tái phạm sau `suspended` | `admin` (từ `suspended`), `super_admin` (từ bất kỳ trạng thái nào) | Bắt buộc `reason` + phê duyệt của người thứ hai khi đi thẳng từ `active` | Thêm hash email + hash số điện thoại vào `ban_list`; huỷ toàn bộ event tương lai kèm thông báo cho attendee; chặn đăng ký lại | UC-62 |
| S10 | `banned` | `active` | Khôi phục sau rà soát | **Chỉ `super_admin`** | Four-eyes; `reason` bắt buộc; gỡ khỏi `ban_list` | Trust level đặt lại về mức T1 bất kể trước đó là bao nhiêu | — |
| S11 | mọi trạng thái | `deleted` | Người dùng yêu cầu xoá | Chính người dùng; hoặc `super_admin` khi có yêu cầu pháp lý | Tài khoản `role != 'member'` phải được hạ về `member` trước; nhập lại mật khẩu hoặc OTP để xác nhận | Đặt `deleted_at = now()`; ẩn hồ sơ và toàn bộ nội dung khỏi công khai ngay; **ân hạn 14 ngày**; gửi email xác nhận có link huỷ yêu cầu | UC-10 |
| S12 | `deleted` | `active` | Đăng nhập lại trong ân hạn | Chính người dùng | `now() - deleted_at < 14 ngày` | Khôi phục hồ sơ và nội dung; ghi `audit_log` | UC-10 |
| S13 | `deleted` | *(kết thúc)* | Hết ân hạn | Job BullMQ `user:anonymize` | 14 ngày | Ẩn danh hoá: xoá `email`, `phone`, `avatar`, `bio`, `password_hash`; thay tên hiển thị bằng "Deleted user"; **giữ** `rsvps` và `attendance` ở dạng ẩn danh để không phá vỡ số liệu lịch sử và hồ sơ an toàn của người khác; sau 90 ngày xoá khỏi backup | UC-10 |
| S14 | `registered` | `deleted` | Không xác minh email sau 30 ngày | Job BullMQ `purge:unverified` | Không có hoạt động nào | Xoá thẳng (chưa có dữ liệu liên quan), không cần ân hạn | — |

### 10.3 Ràng buộc kỹ thuật của state machine

```sql
CREATE TYPE user_status_enum AS ENUM (
  'registered', 'email_verified', 'phone_verified',
  'active', 'restricted', 'suspended', 'banned', 'deleted'
);

ALTER TABLE users
  ADD COLUMN status           user_status_enum NOT NULL DEFAULT 'registered',
  ADD COLUMN restricted_until timestamptz,
  ADD COLUMN suspended_until  timestamptz,
  ADD COLUMN status_reason    text,
  ADD COLUMN status_changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN status_changed_by uuid REFERENCES users(id);

-- Trang thai co thoi han bat buoc phai co moc het han
ALTER TABLE users ADD CONSTRAINT ck_users_restricted_until
  CHECK (status <> 'restricted' OR restricted_until IS NOT NULL);

-- Moi lan roi khoi 'active' bang quyet dinh kiem duyet deu phai co ly do
ALTER TABLE users ADD CONSTRAINT ck_users_status_reason
  CHECK (status NOT IN ('restricted','suspended','banned') OR length(coalesce(status_reason,'')) >= 20);

CREATE INDEX idx_users_status_expiry ON users (status, restricted_until, suspended_until)
  WHERE status IN ('restricted','suspended');
```

- **Chuyển trạng thái chỉ đi qua một chỗ**: `UserLifecycleService.transition(userId, toStatus, ctx)`. Không
  service nào khác được `UPDATE users SET status`. Bảng chuyển hợp lệ khai báo dạng hằng số và có unit test
  phủ toàn bộ 8 × 8 ô (các ô không hợp lệ phải ném `InvalidStateTransitionException`).
- **Job hết hạn** chạy mỗi 5 phút (`moderation:expire`), idempotent, có dead-letter queue.
- **`status` khác `trust_level`**: một tài khoản `active` vẫn có thể ở T0. Đừng suy diễn cái này từ cái kia.
- **Khôi phục ≠ xoá lịch sử**: rời `restricted`/`suspended` không hoàn lại các `trust_signals` âm đã ghi.

---

## 11. Trust level & badge

### 11.1 Định nghĩa T0–T5 — điều kiện đạt bậc

Thang **T0–T5** trong tài liệu này là **thang duy nhất** của sản phẩm (quyết định MT-12, §15.2). Cột lưu:
`users.trust_level smallint NOT NULL DEFAULT 0 CHECK (trust_level BETWEEN 0 AND 5)`.

| Bậc | Nhãn hiển thị (EN / VI) | Key i18n | Điều kiện đạt — phải thoả **tất cả** | Cách xác nhận |
|---|---|---|---|---|
| **T0** | *New* / Mới | `trust.level.t0.label` | Mặc định khi tạo tài khoản | Tự động |
| **T1** | *Email verified* / Đã xác minh email | `trust.level.t1.label` | Email đã xác minh (UC-02) hoặc social login trả `email_verified = true` | Tự động, tức thì |
| **T2** | *Phone verified* / Đã xác minh số điện thoại | `trust.level.t2.label` | T1 **+** số điện thoại đã xác minh bằng OTP (UC-13); một số chỉ gắn một tài khoản `active` | Tự động, tức thì |
| **T3** | *Active member* / Thành viên tích cực | `trust.level.t3.label` | T2 **+** tài khoản ≥ **14 ngày** **+** ( ≥ **3 occurrence** có `attendance = 'checked_in'` trong 90 ngày **HOẶC** host ≥ **1 occurrence** hoàn tất có ≥ 3 người `checked_in` ) **+** `no_show_rate < 25 %` **+** 0 case kiểm duyệt `confirmed` trong 90 ngày | Job `trust:recompute` |
| **T4** | *Trusted* / Đáng tin cậy | `trust.level.t4.label` | T3 **+** tài khoản ≥ **60 ngày** **+** ( ≥ **8 occurrence** `checked_in` trong 180 ngày **HOẶC** host ≥ **4 occurrence** hoàn tất ) **+** điểm đánh giá trung bình ≥ **4,5/5** với ≥ **5 lượt** (UC-16) **+** `no_show_rate < 10 %` **+** 0 case kiểm duyệt `confirmed` trong 180 ngày | Job `trust:recompute` |
| **T5** | *Community leader* / Người dẫn dắt cộng đồng | `trust.level.t5.label` | T4 **+ một trong**: (a) `admin` cấp `trust_signal` loại `staff_endorsement` (thủ công, có lý do); (b) đang giữ role `curator` hoặc `moderator` và còn hoạt động; (c) host ≥ **20 occurrence** hoàn tất với `no_show_rate < 8 %` **và** được `admin` duyệt | **Không bao giờ tự động hoàn toàn** — luôn cần một hành động thủ công của `admin` |

> **Vì sao T5 không tự động**: T5 mở ra hạn mức gần như không giới hạn và badge "Community leader" mang trọng
> lượng xã hội thật. Một cổng thủ công là hàng rào rẻ nhất chống lại việc nuôi tài khoản để lạm dụng.

`no_show_rate` = `no_show_count / (checked_in_count + no_show_count)`, chỉ tính occurrence trong cửa sổ thời
gian tương ứng và chỉ khi mẫu ≥ 4 lượt; mẫu nhỏ hơn coi như đạt điều kiện.

### 11.2 Quyền lợi mở ra ở từng bậc

| Quyền lợi | T0 | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|---|
| **Tạo sự kiện / ngày** | 0 | **1** | **3** | **5** | **10** | 20 (mềm) |
| Sự kiện đang mở tối đa cùng lúc | 0 | 3 | 10 | 20 | 50 | 200 |
| Sự kiện tạo ra vào trạng thái nào | — | `pending_review` nếu có link/số điện thoại, ngược lại `published` | `published` | `published` | `published`, bỏ qua bộ lọc tự động | `published` |
| Chuỗi sự kiện lặp (recurring, UC-24) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **RSVP** | Chỉ occurrence có `trust_gate = 'none'` | ✅ | ✅ | ✅ | ✅ | ✅ |
| RSVP kèm người đi cùng (`guest_count`) | 0 | 0 | 1 | 2 | 3 | 5 |
| **Nhắn tin 1-1 — hội thoại mới/ngày** | 0 | 0 | **10** | **30** | **100** | Không giới hạn mềm |
| Nhắn cho người **chưa** từng chung occurrence | ❌ | ❌ | ❌ (chỉ 1 yêu cầu kết nối) | ❌ (chỉ 1 yêu cầu kết nối) | ✅ nếu người nhận để `everyone` | ✅ |
| **Đăng ảnh** | ❌ (avatar chữ cái mặc định) | 1 ảnh bìa/sự kiện, qua kiểm duyệt | 5 ảnh/sự kiện | 10 ảnh | 20 ảnh + album tổng kết (UC-49) | 20 ảnh + album |
| Đăng avatar thật | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Link trong mô tả / bình luận** | Bị gỡ | Chỉ domain trong allowlist | Tự do trừ blocklist | Tự do trừ blocklist | Tự do | Tự do |
| **Bình luận / ngày** | 0 | 5 | 30 | 100 | 300 | Không giới hạn mềm |
| Xem danh sách người tham gia | ❌ | ❌ | ✅ (đã RSVP) | ✅ | ✅ | ✅ |
| Xem địa chỉ chính xác của sự kiện `location_precision = exact` | ❌ | ❌ | ✅ sau khi RSVP | ✅ | ✅ | ✅ |
| Xuất danh sách attendee CSV (khi là host) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Được mời làm co-host | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Bảo lãnh người khác (`community_vouch`) | ❌ | ❌ | ❌ | ❌ | ✅ (3 lượt/tháng) | ✅ (10 lượt/tháng) |
| Sự kiện được ưu tiên trong dải "Featured" theo khu vực | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Được mời làm `moderator` | ❌ | ❌ | ❌ | ✅ (đủ điều kiện tối thiểu) | ✅ | ✅ |
| **Rate limit API chung (req/phút/tài khoản)** | 30 | 60 | 120 | 180 | 300 | 600 |
| Rate limit ghi (POST/PATCH, req/phút) | 5 | 10 | 20 | 40 | 60 | 100 |
| Rate limit tìm kiếm (req/phút) | 20 | 40 | 60 | 90 | 120 | 120 |

> Hạn mức tính theo **cửa sổ trượt 24 h** lưu ở Redis với key `ratelimit:{scope}:{userId}`, không reset theo
> nửa đêm. Khi vượt, API trả `429` kèm header `Retry-After` và mã lỗi i18n `error.rate_limit.<scope>`.

### 11.3 Bảng tín hiệu tin cậy — `trust_signals` (append-only)

Bậc T0–T5 **không** được lưu bằng cách cộng điểm rời rạc trong code; nó được tính lại từ bảng bằng chứng.

```sql
CREATE TABLE trust_signals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        trust_signal_type_enum NOT NULL,
  direction   smallint NOT NULL,          -- +1 tich cuc, -1 tieu cuc
  weight      smallint NOT NULL,          -- do lon, dung de xep hang trong cung mot bac
  evidence_id uuid,                       -- occurrence_id / moderation_case_id / review_id
  status      trust_signal_status_enum NOT NULL DEFAULT 'verified',
  expires_at  timestamptz,
  revoked_at  timestamptz,
  revoked_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trust_signals_user_live ON trust_signals (user_id, type)
  WHERE status = 'verified' AND revoked_at IS NULL;
```

| `type` | Hướng | Ý nghĩa & cách sinh | Hết hạn |
|---|---|---|---|
| `email_verified` | + | UC-02 hoặc social login | Không (mất khi email bounce cứng) |
| `phone_verified` | + | UC-13 OTP | 24 tháng, phải xác minh lại |
| `event_attended` | + | Host đánh dấu `checked_in` (Đ24) | Tính trong cửa sổ 90/180 ngày |
| `event_hosted_completed` | + | Occurrence do user host chuyển `completed` và có ≥ 3 người `checked_in` | 180 ngày |
| `review_received` | + | UC-16, điểm ≥ 4 | 180 ngày |
| `community_vouch` | + | Người T4/T5 bảo lãnh; trần 3 lượt nhận/người | 12 tháng |
| `staff_endorsement` | + | `admin` cấp thủ công — điều kiện cần của T5 | Không, nhưng thu hồi được |
| `no_show` | − | Host đánh dấu `no_show` (Đ27) và attendee không khiếu nại thành công | 180 ngày |
| `late_cancel` | − | Huỷ RSVP trong 6 h trước giờ bắt đầu (Đ17) | 90 ngày |
| `late_cancel_as_host` | − | Host huỷ occurrence trong 24 h khi đã có ≥ 3 RSVP (Đ12) | 180 ngày |
| `moderation_confirmed` | − | Case kiểm duyệt kết luận vi phạm | 90 ngày (`normal`) / 180 (`high`) / vĩnh viễn (`critical`) |
| `report_abuse` | − | Người dùng báo cáo sai sự thật lặp lại ≥ 3 lần | 180 ngày |

Job `trust:recompute` (BullMQ) chạy: (a) ngay sau mỗi sự kiện domain sinh signal; (b) quét toàn bộ hằng đêm
02:00 giờ Asia/Ho_Chi_Minh để xử lý signal hết hạn. Job **chỉ ghi** `users.trust_level` và
`users.trust_recomputed_at`; không có nơi nào khác được ghi hai cột này.

### 11.4 Điều kiện bị tụt bậc

Nguyên tắc: **bằng chứng xác minh** (email, phone) chỉ mất khi chính bằng chứng bị thu hồi; **bậc hành vi**
(T3–T5) mất được do hành vi.

| Sự kiện | Hệ quả | Sàn không tụt dưới | Thời gian chờ trước khi được lên lại |
|---|---|---|---|
| `no_show_rate ≥ 30 %` trong 90 ngày (mẫu ≥ 4) | Tụt **1 bậc** | T2 | 30 ngày |
| 1 case kiểm duyệt `confirmed` mức `high` | Tụt **1 bậc** | T2 | 60 ngày |
| 1 case kiểm duyệt `confirmed` mức `critical` | Về **T1** + chuyển `restricted` | T1 | 180 ngày, cần `admin` duyệt |
| Host huỷ ≥ 3 occurrence trong 30 ngày, mỗi occurrence đã có ≥ 3 RSVP | Tụt **1 bậc** | T2 | 30 ngày |
| Điểm đánh giá trung bình tụt dưới 4,0 với ≥ 5 lượt | Không giữ được T4/T5 → về T3 | T3 | 30 ngày |
| Không hoạt động 180 ngày (không RSVP, không host, không đăng nhập) | T4/T5 → **T3** | T3 | Lên lại ngay khi đủ điều kiện T4 |
| Số điện thoại bị gỡ, hết hạn 24 tháng, hoặc có khiếu nại chủ sở hữu số | Về **T1** | T1 | Xác minh lại là lên ngay |
| Email bounce cứng hoặc bị chủ sở hữu khiếu nại | Về **T0** + chuyển `registered` | T0 | Xác minh lại là lên ngay |
| `staff_endorsement` bị `admin` thu hồi | T5 → **T4** | T4 | Cần endorsement mới |
| Bị `banned` rồi được `super_admin` khôi phục (S10) | Về **T1** bất kể bậc cũ | T1 | 90 ngày |

Ràng buộc chống dao động: **một tài khoản không tụt quá 1 bậc trong 7 ngày** trừ hai trường hợp `critical` và
mất bằng chứng xác minh. Mỗi lần tụt bậc gửi thông báo in-app giải thích lý do bằng ngôn ngữ trung tính và
kèm đường dẫn tới trang "Cách hoạt động của trust level" — không dùng từ trừng phạt.

### 11.5 Badge hiển thị

Badge là **lớp hiển thị**, không cấp quyền. Một user có nhiều badge; UI hiển thị tối đa 3 badge ưu tiên cao
nhất cạnh tên, phần còn lại nằm trong hồ sơ.

| Badge | Key i18n | Điều kiện đạt | Nơi hiển thị | Mất khi nào |
|---|---|---|---|---|
| **Email verified** | `badge.email_verified` | `trust_level >= 1` | Hồ sơ (biểu tượng nhỏ) | Email bị thu hồi |
| **Phone verified** | `badge.phone_verified` | `trust_level >= 2` | Hồ sơ; card attendee | Hết hạn 24 tháng |
| **Trusted** | `badge.trusted` | `trust_level >= 4` | Cạnh tên ở mọi nơi: card sự kiện, danh sách attendee, bình luận, hồ sơ | Tụt dưới T4 |
| **Community leader** | `badge.community_leader` | `trust_level = 5` | Cạnh tên ở mọi nơi; dải "Trusted organizers" ở trang khám phá | Tụt dưới T5 |
| **Local host** | `badge.local_host` | `profiles.is_local = true` **và** `trust_level >= 2` (số điện thoại đầu số Việt Nam đã xác minh) | Card sự kiện, hồ sơ; là điều kiện của bộ lọc "có người bản địa dẫn" | Gỡ xác minh số điện thoại |
| **Verified business** | `badge.verified_business` | `admin` duyệt hồ sơ doanh nghiệp thủ công (giấy phép + địa chỉ + đối chiếu) | Card sự kiện, hồ sơ tổ chức | `admin` thu hồi; tự hết hạn sau 12 tháng nếu không gia hạn |
| **Reliable attendee** | `badge.reliable_attendee` | ≥ 10 lượt `checked_in` **và** `no_show_rate < 5 %` trong 180 ngày | Danh sách attendee, hồ sơ | Rơi khỏi ngưỡng |
| **Reliable host** | `badge.reliable_host` | ≥ 5 occurrence host hoàn tất, tỉ lệ huỷ muộn = 0, đánh giá ≥ 4,5 | Card sự kiện, hồ sơ | Rơi khỏi ngưỡng |
| **Bilingual host** | `badge.bilingual_host` | Hồ sơ khai ≥ 2 ngôn ngữ trong đó có Tiếng Việt và English, **và** đã host ≥ 2 occurrence gắn nhãn `language = bilingual` | Card sự kiện | Tự khai lại |
| **Curator team** | `badge.curator_team` | `role = 'curator'` | Chỉ trên các listing curated, dạng nhãn "Curated by Da Nang Connect" — **không** hiển thị tên cá nhân | Mất role |
| **Moderation team** | `badge.moderation_team` | `role = 'moderator'` | **Chỉ trong khu vực admin.** Không hiển thị công khai — yêu cầu bảo vệ danh tính của persona P6 | Mất role |
| **Founding member** | `badge.founding_member` | Nằm trong 500 tài khoản `active` đầu tiên | Hồ sơ | Vĩnh viễn |
| **New in town** | `badge.new_in_town` | Tài khoản < 30 ngày tuổi **và** `trust_level >= 1` | Danh sách attendee, hồ sơ — nhằm khuyến khích cộng đồng chào đón, **không** phải cảnh báo | Tự hết sau 30 ngày |

**Quy tắc hiển thị bắt buộc**: không có badge nào mang nghĩa tiêu cực. Số `no_show`, số lần bị báo cáo, và
điểm thành phần trust **không bao giờ** hiển thị công khai — chỉ ảnh hưởng gián tiếp qua bậc và badge. Đây là
quyết định an toàn tâm lý: nhãn tiêu cực công khai đẩy người dùng rời nền tảng thay vì sửa hành vi.

```mermaid
flowchart LR
    subgraph EV["Su kien nghiep vu"]
        E1["email verified"]
        E2["phone verified"]
        E3["checked_in"]
        E4["occurrence completed"]
        E5["review >= 4"]
        E6["no_show"]
        E7["late_cancel"]
        E8["moderation confirmed"]
    end

    TS[("trust_signals<br/>append-only")]
    JOB["Job BullMQ<br/>trust:recompute"]
    LVL["users.trust_level<br/>T0 - T5"]
    QUOTA["Han muc + rate limit<br/>§11.2"]
    BADGE["Badge hien thi<br/>§11.5"]
    GUARD["TrustTierGuard<br/>@MinTrust(n)"]

    E1 --> TS
    E2 --> TS
    E3 --> TS
    E4 --> TS
    E5 --> TS
    E6 --> TS
    E7 --> TS
    E8 --> TS

    TS --> JOB --> LVL
    LVL --> QUOTA
    LVL --> BADGE
    LVL --> GUARD

    style TS fill:#eef4ff,stroke:#1f6feb
    style LVL fill:#e6f7e6,stroke:#2e9e4f
```

---

## 12. Mapping role → use case

### 12.1 Cách đọc bảng

Bảng dưới đối chiếu **toàn bộ 76 use case** trong `02-use-case.md` (EP-01 → EP-11) với **5 role toàn cục** cộng
**2 ngữ cảnh theo sự kiện**. Đây là bảng bắc cầu giữa §9 (quyền nguyên tử) và tài liệu use case — khi hai bên
lệch nhau, **§9 + §12 của tài liệu này là nguồn sự thật**, `02-use-case.md` mô tả luồng.

| Cột | Ý nghĩa |
|---|---|
| `guest` | Chưa đăng nhập. Không phải giá trị của `users.role`, chỉ là trạng thái phiên (§8.1) |
| `member` · `curator` · `mod` · `admin` · `s.admin` | Năm giá trị của `users.role` |
| `host` | Người dùng **là `events.host_user_id` của chính resource đang thao tác** |
| `co-host` | Người dùng có bản ghi `event_cohosts` với `accepted_at IS NOT NULL` trên **chính** event đó |
| `Trust min` | Bậc T0–T5 **tối thiểu** để gọi được UC. `—` = không phụ thuộc trust; `sys` = actor là system, không có trust |

Ký hiệu: **✅** dùng được · **❌** không · **⚠️** có điều kiện (tra mã `Đn` ở §9.3) · **—** không áp dụng ·
**🕓** thuộc giai đoạn sau, chỉ thiết kế trước.

> **Quy tắc bao trùm**: `moderator`, `admin`, `super_admin` khi tạo hoặc tham gia sự kiện thì hành xử **đúng như
> một `member`** — role vận hành không cấp đặc quyền nghiệp vụ (Đ2). Vì vậy ở EP-03/EP-05, cột của ba role này
> lặp lại cột `member` chứ không "mở rộng hơn". Điều ngược lại cũng đúng: `member` không bao giờ chạm được
> EP-09/EP-10/EP-11 chỉ nhờ trust level cao.

### 12.2 EP-01 — Onboarding & Auth

| UC | Tên rút gọn | guest | member | curator | mod | admin | s.admin | host | co-host | Trust min | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UC-01 | Đăng ký email + mật khẩu | ✅ | — | — | — | — | — | — | — | — | Tạo `role='member'`, `status='registered'`, `trust_level=0` (S1) |
| UC-02 | Xác minh email | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | T0 | Chỉ chính chủ; nâng T0→T1 (S2) |
| UC-03 | Đăng nhập email | ✅ | — | — | — | — | — | — | — | — | Bị chặn nếu `status ∈ {suspended, banned}` |
| UC-04 | Social login | ✅ | — | — | — | — | — | — | — | — | Apple Sign-In bắt buộc trên iOS; chỉ tin `email_verified = true` |
| UC-05 | Onboarding lần đầu | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | T1 | Cần `status ∈ {email_verified, phone_verified}` (S4) |
| UC-06 | Quên mật khẩu | ✅ | — | — | — | — | — | — | — | — | Đặt lại thành công ⇒ thu hồi mọi refresh token |
| UC-07 | Refresh & đăng xuất | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | T0 | Đổi role ⇒ thu hồi toàn bộ refresh token (§8.3 quy tắc 4) |
| UC-08 | Đổi ngôn ngữ UI | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | EN mặc định, VI thứ hai; guest lưu ở cookie/AsyncStorage |
| UC-09 | Duyệt ở chế độ khách | ✅ Đ1 | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | Cổng giá trị: chặn tại RSVP (Đ14), không ẩn nút |
| UC-10 | Xoá tài khoản & xuất dữ liệu | ❌ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | — | — | T0 | `role != 'member'` phải hạ về `member` trước khi xoá (S11) |

### 12.3 EP-02 — Hồ sơ & Trust

| UC | Tên rút gọn | guest | member | curator | mod | admin | s.admin | host | co-host | Trust min | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UC-11 | Sửa hồ sơ cá nhân | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | T0 | **Avatar ảnh thật cần T1**; T0 chỉ dùng avatar chữ cái (§11.2) |
| UC-12 | Xem hồ sơ công khai | ⚠️ Đ1 | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | Tôn trọng UC-17; guest không thấy lịch sử tham gia |
| UC-13 | Xác minh email & phone | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | T0 | OTP 5 phút, ≤ 5 lần/số/giờ; nâng T1→T2 (S3) |
| UC-14 | Xác minh giấy tờ | 🕓 | 🕓 | 🕓 | 🕓 | 🕓 | 🕓 | — | — | 🕓 | **Won't** ở GĐ1 — hoãn sang GĐ2 |
| UC-15 | Tính & hiển thị bậc tin cậy | — | — | — | — | — | — | — | — | sys | Job `trust:recompute` là **nơi duy nhất** ghi `users.trust_level` |
| UC-16 | Đánh giá sau hoạt động | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | T1 | Chỉ người có `attendance = 'checked_in'` và host của occurrence đó; cửa sổ 7 ngày |
| UC-17 | Cấu hình riêng tư hồ sơ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | T0 | Điều khiển `show_in_attendee_list`, `share_contact_with_host` (Đ20, Đ22) |
| UC-18 | Chặn người dùng khác | ❌ | ✅ | ✅ | ⚠️ Đ34 | ⚠️ Đ34 | ⚠️ Đ34 | ✅ | ✅ | T1 | Chặn hai chiều, không lộ trạng thái; `blocks` thắng mọi quyền DM (Đ29, Đ32) |

### 12.4 EP-03 — Tạo & quản lý sự kiện

| UC | Tên rút gọn | guest | member | curator | mod | admin | s.admin | host | co-host | Trust min | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UC-19 | Tạo hoạt động mới | ❌ | ⚠️ Đ2 | ✅ Đ42 | ⚠️ Đ2 | ⚠️ Đ2 | ⚠️ Đ2 | — | — | **T1** | T1 ⇒ vào `pending_review` nếu mô tả có link ngoài allowlist / số điện thoại; hạn mức theo bậc (§11.2) |
| UC-20 | Ghim địa điểm & gán khu vực | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ Đ5 | T1 / **T2** | T1 chỉ đặt được `location_precision = area_only`; **`exact` cần T2** |
| UC-21 | Nháp & xuất bản | ❌ | ⚠️ Đ2 | ✅ | ⚠️ Đ2 | ⚠️ Đ2 | ⚠️ Đ2 | ✅ | ⚠️ Đ5 | T1 | Nháp không vào feed công khai, không đếm vào hạn mức "đang mở" |
| UC-22 | Sửa sự kiện đã xuất bản | ❌ | ⚠️ Đ6 | ⚠️ Đ7 | ⚠️ Đ8 | ⚠️ Đ9 | ⚠️ Đ9 | ✅ Đ4 | ⚠️ Đ5 | — | Thay đổi trọng yếu ⇒ bắt buộc `change_reason` + thông báo + đặt lại job T-24h/T-2h |
| UC-23 | Huỷ hoạt động | ❌ | ⚠️ Đ6 | ⚠️ Đ7 | ⚠️ Đ11 | ⚠️ Đ9 | ⚠️ Đ9 | ✅ Đ12 | ⚠️ Đ13 | — | Co-host cần `can_cancel = true` (mặc định `false`) |
| UC-24 | Chuỗi hoạt động lặp lại | ❌ | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ Đ5 | **T3** | Ngưỡng cao có chủ đích: recurring nhân bản rủi ro nội dung lên nhiều occurrence |
| UC-25 | Quản lý danh sách tham dự | ❌ | ❌ | ⚠️ Đ7 | ⚠️ Đ21 | ⚠️ Đ21 | ⚠️ Đ21 | ✅ Đ22 | ⚠️ Đ5 | T2 / **T3** | Xem cần T2; **xuất CSV cần host ở T3** và ghi `audit_log` |
| UC-26 | Thêm / gỡ co-host | ❌ | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | ✅ | ❌ | T2 | Chỉ host mời; **người được mời phải ≥ T2**; tối đa 5 co-host; cần `accepted_at` |
| UC-27 | Điểm danh QR | ❌ | ❌ | ⚠️ Đ7 | ❌ | ⚠️ Đ23 | ⚠️ Đ23 | ✅ Đ24 | ⚠️ Đ25 | — | Cửa sổ **T-2h → T+48h**; co-host cần `can_check_in = true` |
| UC-28 | Nhân bản hoạt động cũ | ❌ | ⚠️ Đ2 | ✅ | ⚠️ Đ2 | ⚠️ Đ2 | ⚠️ Đ2 | ✅ | ❌ | T1 | Bản sao vẫn tính vào hạn mức tạo/ngày của bậc |

### 12.5 EP-04 — Khám phá & tìm kiếm/lọc

| UC | Tên rút gọn | guest | member | curator | mod | admin | s.admin | host | co-host | Trust min | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UC-29 | Feed "Tuần này ở Đà Nẵng" | ⚠️ Đ1 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | Host/co-host thấy thêm `draft` của chính mình |
| UC-30 | Tìm kiếm toàn văn | ⚠️ Đ1 | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | Rate limit tìm kiếm theo bậc (§11.2); guest theo IP |
| UC-31 | Lọc nâng cao | ⚠️ Đ1 | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | Bộ lọc khu vực dùng đúng **6 khu vực MVP** (Đ46) |
| UC-32 | Tìm quanh vị trí hiện tại | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | T0 | Cần quyền định vị của OS; toạ độ **không** lưu lịch sử |
| UC-33 | Bản đồ | ⚠️ Đ1 | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | Guest và T0/T1 thấy ghim ở tâm khu vực, bán kính 500 m |
| UC-34 | Lưu bộ lọc & cảnh báo | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | T1 | Tối đa 5 bộ lọc có cảnh báo/tài khoản; tôn trọng khung giờ yên tĩnh (UC-53) |
| UC-35 | Lưu vào quan tâm | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | T0 | Riêng tư, không hiện cho host |
| UC-36 | Gợi ý cá nhân hoá | 🕓 | 🕓 | 🕓 | 🕓 | 🕓 | 🕓 | — | — | 🕓 | **Won't** ở GĐ1 |
| UC-37 | Lịch tháng | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | T0 | Hiển thị theo Asia/Ho_Chi_Minh, dữ liệu lưu UTC |

### 12.6 EP-05 — RSVP & tham gia

| UC | Tên rút gọn | guest | member | curator | mod | admin | s.admin | host | co-host | Trust min | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UC-38 | Đăng ký tham gia | ❌ Đ14 | ⚠️ Đ15 | ⚠️ Đ15 | ⚠️ Đ15 | ⚠️ Đ15 | ⚠️ Đ15 | ❌ Đ16 | ❌ Đ16 | **T1** | Gắn vào `occurrence_id`. T0 chỉ RSVP occurrence có `trust_gate = 'none'` |
| UC-39 | Huỷ đăng ký | ❌ | ✅ Đ17 | ✅ Đ17 | ✅ Đ17 | ✅ Đ17 | ✅ Đ17 | ⚠️ Đ18 | ⚠️ Đ18 | T0 | Huỷ trong 6 h ⇒ `trust_signal` `late_cancel` |
| UC-40 | Waitlist & tự thăng hạng | ❌ | ⚠️ Đ15 | ⚠️ Đ15 | ⚠️ Đ15 | ⚠️ Đ15 | ⚠️ Đ15 | ⚠️ | ⚠️ Đ5 | T1 | **MUST của MVP.** FIFO, cửa sổ xác nhận 12 h; host/co-host đôn tay được (`waitlist.promote`) |
| UC-41 | Trả lời câu hỏi khi đăng ký | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ đặt câu hỏi | ⚠️ Đ5 | T1 | Tối đa 3 câu; câu trả lời chỉ host/co-host xem (Đ22) |
| UC-42 | Thêm vào lịch cá nhân | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | T0 | ICS sinh theo UTC + `TZID=Asia/Ho_Chi_Minh` |
| UC-43 | Xem danh sách người tham dự | ❌ Đ19 | ⚠️ Đ20 | ⚠️ Đ7 | ⚠️ Đ21 | ⚠️ Đ21 | ⚠️ Đ21 | ✅ Đ22 | ✅ Đ22 | **T2** | Member cần **vừa T2 vừa đã RSVP**; guest chỉ thấy số đếm |
| UC-44 | Mời người khác cùng tham gia | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | **T2** | Link mời có gắn nguồn; hạn mức lời mời/ngày theo bậc để chống spam |

### 12.7 EP-06 — Tương tác

| UC | Tên rút gọn | guest | member | curator | mod | admin | s.admin | host | co-host | Trust min | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UC-45 | Bình luận trong trang hoạt động | ❌ | ⚠️ Đ28 | ✅ | ✅ | ✅ | ✅ | ✅ + ghim 1 comment | ✅ | **T1** | Quyền chèn link theo bậc; comment đầu của tài khoản < 48 h qua bộ lọc UC-64 |
| UC-46 | Chat nhóm của hoạt động | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | **T2** | Chỉ người có RSVP `going`; phòng mở từ T-48h, đóng T+48h |
| UC-47 | Nhắn tin riêng 1-1 | ❌ | ⚠️ Đ29 | ⚠️ Đ30 | ⚠️ Đ31 | ⚠️ Đ31 | ⚠️ Đ31 | ⚠️ Đ32 | ⚠️ Đ32 | **T2** | Cần từng chung ≥ 1 occurrence; host/co-host được miễn điều kiện đó |
| UC-48 | Chia sẻ ra ngoài | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | Ảnh xem trước **không** chứa địa chỉ chính xác |
| UC-49 | Ảnh tổng kết sau hoạt động | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | **T4** mở album / T2 thêm ảnh | Album mở 72 h sau khi kết thúc; chỉ người `checked_in` thêm ảnh được |
| UC-50 | Theo dõi organizer | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | T1 | Người bị theo dõi tắt được; không lộ danh sách người theo dõi |

### 12.8 EP-07 — Thông báo

| UC | Tên rút gọn | guest | member | curator | mod | admin | s.admin | host | co-host | Trust min | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UC-51 | Đăng ký & hiển thị push | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | T0 | Xin quyền đúng thời điểm (sau RSVP đầu tiên), không xin ở màn hình mở app |
| UC-52 | Nhắc lịch trước giờ diễn ra | — | — | — | — | — | — | — | — | sys | Hai mốc **T-24h** và **T-2h**; huỷ & đặt lại job khi có thay đổi trọng yếu |
| UC-53 | Cấu hình nhận thông báo | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | T0 | Khung giờ yên tĩnh theo Asia/Ho_Chi_Minh; nhắc T-2h **không** bị chặn bởi giờ yên tĩnh |
| UC-54 | Trung tâm thông báo trong app | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | T0 | Hợp nhất push + in-app; deep link về đúng occurrence |
| UC-55 | Bản tin tổng hợp hằng tuần | — | — | — | — | — | — | — | — | sys | Gửi sáng thứ Năm; nội dung theo `home_area` + sở thích |

### 12.9 EP-08 — Nhu cầu ad-hoc *(Won't ở GĐ1 — thiết kế trước)*

| UC | Tên rút gọn | Trạng thái GĐ1 | Trust min dự kiến | Ghi chú phân quyền cần chừa chỗ |
|---|---|---|---|---|
| UC-56 | Đăng nhu cầu tức thời | 🕓 Won't | T2 | Ngưỡng cao hơn tạo event vì nội dung ngắn, khó kiểm duyệt, dễ thành kênh rao vặt |
| UC-57 | Phản hồi một nhu cầu | 🕓 Won't | T2 | Mở luồng nhắn tin nhẹ ⇒ chịu cùng ràng buộc `blocks` như Đ29 |
| UC-58 | Tự hết hạn sau 24 h | 🕓 Won't | sys | Job BullMQ, cùng khuôn với `moderation:expire` |
| UC-59 | Nâng thành hoạt động chính thức | 🕓 Won't | T2 | Khi chuyển thành `event`, người đăng trở thành `host_user_id` và chịu Đ2 |

### 12.10 EP-09 — Báo cáo vi phạm & kiểm duyệt

| UC | Tên rút gọn | guest | member | curator | mod | admin | s.admin | host | co-host | Trust min | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UC-60 | Báo cáo nội dung / người dùng | ⚠️ Đ33 | ✅ | ✅ | ⚠️ Đ34 | ⚠️ Đ34 | ⚠️ Đ34 | ✅ | ✅ | **T0** | Cố ý **không** đặt ngưỡng trust — chặn báo cáo là chặn kênh an toàn |
| UC-61 | Xử lý hàng đợi báo cáo | ❌ | ❌ | ⚠️ Đ40 | ✅ Đ41 | ✅ | ✅ | ❌ | ❌ | T3¹ | ¹Không kiểm ở guard mà ở **điều kiện gán role** (§8.3 quy tắc 5): chỉ tài khoản ≥ T3 mới được nâng lên `moderator` |
| UC-62 | Gỡ nội dung & đình chỉ tài khoản | ❌ | ❌ | ❌ | ✅ Đ35 Đ37 | ✅ Đ38 | ✅ Đ39 | ⚠️ Đ36 | ⚠️ Đ36 | T3¹ | `moderator` ≤ 7 ngày `restricted` / ≤ 30 ngày `suspended`, **không** `banned` |
| UC-63 | Khiếu nại quyết định kiểm duyệt | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | T0 | Một lần/quyết định; **bắt buộc người xử lý khác** người ra quyết định gốc (INV-4) |
| UC-64 | Lọc tự động spam & nội dung nhạy cảm | — | — | — | — | — | — | — | — | sys | Ngưỡng lọc **nới dần theo trust level** (§11.2), không phải một ngưỡng chung |

### 12.11 EP-10 — Curate nội dung của đội sáng lập

| UC | Tên rút gọn | guest | member | curator | mod | admin | s.admin | host | co-host | Trust min | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UC-65 | Nhập hoạt động curate thủ công | ❌ | ❌ | ✅ Đ42 | ❌ | ✅ Đ42 | ✅ Đ42 | — | — | T5² | ²`curator` thực tế luôn ở T5 (§11.1 điều kiện (b)), nhưng guard kiểm **role**, không kiểm trust |
| UC-66 | Gắn nhãn nguồn & trạng thái chưa có chủ | ❌ | ❌ | ✅ Đ42 | ❌ | ✅ | ✅ | — | — | — | Nhãn công khai "Curated by Da Nang Connect", **không** hiện tên cá nhân curator |
| UC-67 | Mời organizer gốc nhận listing | ❌ | ❌ | ✅ Đ30 | ❌ | ✅ | ✅ | — | — | — | Tối đa 3 lần liên hệ/listing; token 14 ngày; template cố định, không DM tự do |
| UC-68 | Organizer nhận quyền sở hữu listing | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | — | — | **T2** | Cần token hợp lệ **+** T2 **+** email khớp domain nguồn hoặc `admin` xác minh tay. Claim xong ⇒ Đ7 tắt, curator mất quyền sửa |
| UC-69 | Theo dõi hiệu quả chuyển đổi curate | ❌ | ❌ | ⚠️ Đ44 | ❌ | ✅ | ✅ | — | — | — | Curator chỉ thấy phễu curate, không thấy dữ liệu toàn hệ thống |

### 12.12 EP-11 — Quản trị & analytics

| UC | Tên rút gọn | guest | member | curator | mod | admin | s.admin | host | co-host | Trust min | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UC-70 | Quản lý khu vực & loại hình | ❌ | ❌ | ❌ Đ45 | ❌ Đ45 | ⚠️ Đ46 Đ47 | ⚠️ Đ46 Đ47 | — | — | — | **6 khu vực MVP** có `is_mvp_filter = true`, không xoá/ẩn được |
| UC-71 | Dashboard analytics sản phẩm | ❌ | ❌ | ⚠️ Đ44 | ❌ | ✅ | ✅ | — | — | — | Chỉ số gate M6 đọc ở đây: **≥ 25 sự kiện đang mở mới mỗi tuần**, không khu vực MVP nào bằng 0 |
| UC-72 | Analytics cho organizer | ❌ | ❌ | ⚠️ Đ7 | ❌ | ✅ | ✅ | ✅ Đ43 | ✅ Đ43 | **T2** | Số liệu tổng hợp; không khoan xuống danh tính ngoài phạm vi quyền #8 (§9.2) |
| UC-73 | Quản lý người dùng & phân quyền | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ | — | — | — | **Tách đôi**: `admin` tìm user, xem lịch sử xử lý vi phạm, đình chỉ (Đ38); **gán/thu hồi role chỉ `super_admin`** (`user.role.assign`, §9.4) |
| UC-74 | Cấu hình feature flag | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | — | — | — | Flag ảnh hưởng bảo mật/phân quyền chỉ `super_admin` bật được |
| UC-75 | Nhật ký audit hành động quản trị | ❌ | ⚠️ Đ48 | ⚠️ Đ48 | ⚠️ Đ49 | ⚠️ Đ50 | ✅ Đ51 | ❌ | ❌ | — | Append-only; thu hồi quyền `UPDATE/DELETE` của DB role ứng dụng |
| UC-76 | Giám sát sức khoẻ hệ thống | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | — | — | — | SLA báo cáo mức `critical`: **2 giờ** — cảnh báo đẩy thẳng vào kênh trực |

### 12.13 Tổng hợp ngưỡng trust theo use case

Đây là danh sách **duy nhất** các UC có gắn ngưỡng trust. Mọi UC không nằm trong bảng này thì **không** được
thêm `@MinTrust()` — thêm ngưỡng ngoài danh sách là lỗi review.

| Ngưỡng | Use case | Vì sao đặt ở đây |
|---|---|---|
| **T0** (mọi tài khoản đăng nhập) | UC-07, UC-10, UC-11 (trừ avatar ảnh), UC-13, UC-17, UC-32, UC-35, UC-37, UC-39, UC-42, UC-51, UC-53, UC-54, UC-60, UC-63 | Đọc, tự quản lý dữ liệu của mình, và **kênh an toàn** — không bao giờ chặn |
| **T1** (email verified) | UC-05, UC-11 (avatar ảnh), UC-16, UC-18, UC-19, UC-20 (`area_only`), UC-21, UC-28, UC-34, UC-38, UC-40, UC-41, UC-45, UC-50 | Ngưỡng chống tài khoản dùng một lần; đủ thấp để không cản nguồn cung |
| **T2** (phone verified) | UC-20 (`exact`), UC-25 (xem), UC-26 (được mời co-host), UC-43, UC-44, UC-46, UC-47, UC-49 (thêm ảnh), UC-68, UC-72 | Mọi thứ dẫn tới **gặp mặt ngoài đời** hoặc **liên hệ riêng tư** (nguyên tắc P4) |
| **T3** (active member) | UC-24, UC-25 (xuất CSV), điều kiện được nâng lên `moderator` (§8.3 quy tắc 5) | Rủi ro nhân bản (recurring) và rủi ro dữ liệu cá nhân hàng loạt (CSV) |
| **T4** (trusted) | UC-49 (mở album), `community_vouch` (§11.2) | Quyền tác động tới trust của người khác phải nằm ở tay người đã có trust |
| **T5** (community leader) | Không có UC nào **bắt buộc** T5 | T5 chỉ mở **hạn mức** và badge, không mở thêm bề mặt chức năng — có chủ đích |

### 12.14 Bề mặt use case theo role — sơ đồ

```mermaid
flowchart LR
    G["guest<br/>(trang thai phien)"]
    M["member<br/>(mac dinh)"]
    HOST["ngu canh: host<br/>events.host_user_id"]
    CH["ngu canh: co-host<br/>event_cohosts"]
    CU["curator"]
    MO["moderator"]
    AD["admin"]
    SA["super_admin"]

    EP1["EP-01 Onboarding"]
    EP2["EP-02 Ho so & Trust"]
    EP3["EP-03 Tao & quan ly su kien"]
    EP4["EP-04 Kham pha"]
    EP5["EP-05 RSVP"]
    EP6["EP-06 Tuong tac"]
    EP7["EP-07 Thong bao"]
    EP9["EP-09 Kiem duyet"]
    EP10["EP-10 Curate"]
    EP11["EP-11 Quan tri"]

    G --> EP1
    G --> EP4
    G -.->|"chi UC-60 (Do33)"| EP9

    M --> EP1
    M --> EP2
    M --> EP4
    M --> EP5
    M --> EP6
    M --> EP7
    M -->|"UC-19 can T1"| EP3
    M -->|"chi UC-60, UC-63"| EP9
    M -->|"chi UC-68 claim"| EP10

    M -.->|"tao event / claim listing"| HOST
    HOST -->|"UC-22,23,25,27,41,72"| EP3
    HOST --> CH
    CH -->|"theo co-host flags"| EP3

    CU -->|"UC-65..69"| EP10
    CU -.->|"chi tab curated (Do40)"| EP9
    CU -.->|"chi phieu curate (Do44)"| EP11

    MO -->|"UC-61,62,63"| EP9
    AD -->|"UC-70,71,73*,74,75,76"| EP11
    AD --> EP9
    SA -->|"toan bo + user.role.assign"| EP11
    SA --> EP9

    style G fill:#f5f5f5,stroke:#999
    style M fill:#e6f7e6,stroke:#2e9e4f
    style HOST fill:#fff4e5,stroke:#d98d00
    style CH fill:#fff9ee,stroke:#d9b26f
    style SA fill:#ffe5e5,stroke:#d63a3a
```

> `*` UC-73 chỉ mở một phần cho `admin` — xem ghi chú ở §12.12.

### 12.15 Ba mâu thuẫn giữa `02-use-case.md` và mô hình phân quyền — đã xử lý

| # | Chỗ lệch trong `02-use-case.md` | Xử lý trong tài liệu này |
|---|---|---|
| L-1 | Cột "Actor" của EP-03 và UC-72 ghi `Organizer` như thể là role | Đọc là **ngữ cảnh theo sự kiện** (cột `host` / `co-host`), không phải `users.role`. Không có `UserRole.ORGANIZER` |
| L-2 | UC-73 "Quản lý người dùng và phân quyền — Actor: Admin" | Tách đôi: quản lý user thuộc `admin`; **gán/thu hồi role chỉ `super_admin`** (§9.4). Màn hình admin ẩn nút đổi role với `admin` |
| L-3 | UC-38/UC-39/UC-40 mô tả RSVP gắn với "hoạt động" | RSVP gắn `occurrence_id`. Endpoint chuẩn `POST /api/v1/occurrences/{occurrenceId}/rsvps`; `POST /api/v1/events/{eventId}/rsvps` là đường tắt, trả **409** khi event có nhiều occurrence sắp tới (Đ15) |

---

## 13. Ghi chú triển khai kỹ thuật

### 13.1 Sáu lớp kiểm tra và thứ tự chạy bắt buộc

Ba trục ở §8.2 được hiện thực bằng **bốn guard lõi** cộng hai lớp phụ trợ. Thứ tự **không được đổi**: nó phản
ánh đúng thứ tự "trạng thái → role → quan hệ → trust" và cả chi phí (rẻ trước, truy vấn DB sau).

| # | Lớp | Loại | Trục | Nguồn dữ liệu | Có chạm DB? | Lỗi trả về |
|---|---|---|---|---|---|---|
| 0 | `ThrottlerGuard` | Global | — | Redis `rl:{action}:{scope}` | Không (Redis) | `429 RATE_LIMIT_EXCEEDED` + `Retry-After` |
| 1 | `JwtAuthGuard` | Global | — | Chữ ký JWT (RS256) + `revoked:sid:{sid}` | Không (Redis) | `401 AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED` |
| 2 | `AccountStatusGuard` | Global | **Trục 0** | Claim `st` + `usr:{id}:status` (Redis, TTL 60 s) | Chỉ khi cache miss | `403 ACCOUNT_RESTRICTED` / `ACCOUNT_SUSPENDED` / `ACCOUNT_BANNED` |
| 3 | `RolesGuard` | Global | **Trục 1** | Claim `role` | Không | `403 PERM_ROLE_REQUIRED` |
| 4 | `EventOwnershipGuard` | Route | **Trục 2** | `events` / `event_cohosts` (1 truy vấn, có cache request-scope) | **Có** | `403 PERM_NOT_EVENT_HOST` / `404 EVENT_NOT_FOUND` |
| 5 | `TrustTierGuard` | Global | **Trục 3** | Claim `tier` | Không | `403 PERM_TRUST_TIER_TOO_LOW` + `requiredTier` |
| 6 | Hạn mức nghiệp vụ (`QuotaService`) | Service | Trục 3 (mở rộng) | Redis cửa sổ trượt 24 h | Không (Redis) | `429 QUOTA_EXCEEDED` + `resetAt` |

**Vì sao `EventOwnershipGuard` chạy TRƯỚC `TrustTierGuard`** — đây là điểm dễ làm sai nhất: ngưỡng trust của
một endpoint **phụ thuộc vào quan hệ đã giải được**. Ví dụ `GET /occurrences/:id/attendees` cần **T2** nếu người
gọi là attendee (Đ20) nhưng **không cần ngưỡng nào** nếu người gọi là host (Đ22), và cần **T3** nếu là host xin
xuất CSV. `TrustTierGuard` vì vậy phải đọc được `request.eventContext` do `EventOwnershipGuard` gắn vào.

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant TH as ThrottlerGuard
    participant JW as JwtAuthGuard
    participant ST as AccountStatusGuard
    participant RO as RolesGuard
    participant EO as EventOwnershipGuard
    participant TT as TrustTierGuard
    participant SV as Service + QuotaService

    C->>TH: POST /api/v1/occurrences/{id}/rsvps
    TH-->>C: 429 neu vuot rate limit
    TH->>JW: pass
    JW->>JW: verify RS256 + EXISTS revoked:sid
    JW-->>C: 401 neu token hong/thu hoi
    JW->>ST: request.user = { sub, role, tier, st, sid }
    ST->>ST: status != 'active' -> chan
    ST-->>C: 403 ACCOUNT_SUSPENDED
    ST->>RO: pass
    RO->>RO: doc @Roles() metadata
    RO-->>C: 403 PERM_ROLE_REQUIRED
    RO->>EO: pass
    EO->>EO: giai occurrenceId -> eventId -> quan he
    EO->>EO: request.eventContext = { eventId, isHost, isCoHost, flags }
    EO-->>C: 403 PERM_NOT_EVENT_HOST (neu route doi quan he)
    EO->>TT: pass
    TT->>TT: tier >= @MinTrust() (co the phu thuoc eventContext)
    TT-->>C: 403 PERM_TRUST_TIER_TOO_LOW + requiredTier
    TT->>SV: pass
    SV->>SV: QuotaService.consume(...) + logic nghiep vu
    SV-->>C: 201 Created | 409 | 429 QUOTA_EXCEEDED
```

> **Cạm bẫy NestJS**: guard khai báo ở `APP_GUARD` chạy **trước** guard khai báo bằng `@UseGuards()` ở
> controller/handler. Do đó `EventOwnershipGuard` (route-scoped) mặc định sẽ chạy **sau** `TrustTierGuard`
> (global) — **ngược với thứ tự ta cần**. Cách xử lý đã chốt: đăng ký **cả sáu lớp ở `APP_GUARD`** theo đúng
> thứ tự trên; `EventOwnershipGuard` và `TrustTierGuard` tự no-op khi handler không có metadata tương ứng.

### 13.2 Vị trí file trong monorepo

Theo quy ước ở `04-tech-stack-va-kien-truc.md` §5.4.6 — mối quan tâm xuyên suốt **không** nằm trong thư mục
module:

```text
apps/api/src/common/
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── account-status.guard.ts
│   ├── roles.guard.ts
│   ├── event-ownership.guard.ts
│   └── trust-tier.guard.ts
├── decorators/
│   ├── public.decorator.ts          # @Public()
│   ├── current-user.decorator.ts    # @CurrentUser()
│   ├── roles.decorator.ts           # @Roles()
│   ├── min-trust.decorator.ts       # @MinTrust()
│   └── event-context.decorator.ts   # @EventContext() + @RequireEventRole()
├── authz/
│   ├── authz.module.ts
│   ├── event-context.resolver.ts    # occurrenceId|rsvpId|commentId -> eventId
│   ├── quota.service.ts             # han muc §11.2, cua so truot Redis
│   └── permission-matrix.const.ts   # ban sao may doc duoc cua §9.2 + §12
└── enums/                            # enum CHI dung o backend

packages/shared-types/src/
├── enums/
│   ├── user-role.enum.ts            # 5 gia tri
│   ├── trust-level.enum.ts          # T0-T5
│   ├── user-status.enum.ts          # 8 trang thai §10
│   ├── rsvp-status.enum.ts
│   └── event-status.enum.ts
├── authz/
│   ├── permission.const.ts          # 22 permission key §9.2 + §9.4
│   └── event-role.enum.ts           # HOST | CO_HOST | NONE
└── index.ts
```

**Quy tắc**: enum nào web/mobile cũng cần đọc (hiển thị badge, ẩn nút, sinh nhãn i18n) thì nằm ở
`packages/shared-types`. Enum thuần backend (ví dụ `TrustSignalType` dùng cho job) ở `apps/api/src/common/enums/`.
Không nhân bản.

### 13.3 Enum & hằng số dùng chung — `packages/shared-types`

```ts
// packages/shared-types/src/enums/user-role.enum.ts
// Gia tri PHAI trung tuyet doi voi DB enum user_role_enum (chu thuong, snake_case).
export const UserRole = {
  MEMBER: 'member',
  CURATOR: 'curator',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Thu tu de so sanh "cao hon hoac bang". KHONG dung de suy ra quyen —
// chi dung cho quy tac "khong ai gan role >= role cua chinh minh" (§8.3).
export const ROLE_RANK: Record<UserRole, number> = {
  member: 0,
  curator: 1,
  moderator: 2,
  admin: 3,
  super_admin: 4,
};
```

```ts
// packages/shared-types/src/enums/trust-level.enum.ts
// Thang DUY NHAT cua san pham. Khong ton tai thang 0-100,
// khong ton tai enum new/verified/established/trusted/ambassador.
export const TrustLevel = { T0: 0, T1: 1, T2: 2, T3: 3, T4: 4, T5: 5 } as const;
export type TrustLevel = (typeof TrustLevel)[keyof typeof TrustLevel];

export const TRUST_LEVEL_I18N_KEY: Record<TrustLevel, string> = {
  0: 'trust.level.t0.label', // New
  1: 'trust.level.t1.label', // Email verified
  2: 'trust.level.t2.label', // Phone verified
  3: 'trust.level.t3.label', // Active member
  4: 'trust.level.t4.label', // Trusted
  5: 'trust.level.t5.label', // Community leader
};
```

```ts
// packages/shared-types/src/authz/event-role.enum.ts
export const EventRole = { HOST: 'host', CO_HOST: 'co_host', NONE: 'none' } as const;
export type EventRole = (typeof EventRole)[keyof typeof EventRole];

export interface EventContext {
  eventId: string;
  occurrenceId?: string;
  eventRole: EventRole;
  canEdit: boolean;      // host = true; co-host = event_cohosts.can_edit
  canCancel: boolean;    // host = true; co-host mac dinh FALSE (Do13)
  canMessage: boolean;
  canCheckIn: boolean;
}
```

**Test đồng bộ enum DB ↔ TS** (chạy trong CI, chặn merge):

```ts
it('user_role_enum trong DB trung khop UserRole trong shared-types', async () => {
  const rows = await ds.query(
    `SELECT e.enumlabel FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'user_role_enum' ORDER BY e.enumsortorder`,
  );
  expect(rows.map((r) => r.enumlabel)).toEqual([
    'member', 'curator', 'moderator', 'admin', 'super_admin',
  ]);
});
```

Test tương tự cho `user_status_enum` (8 giá trị), `rsvp_status_enum`, `event_status_enum`. Mọi nhãn enum trong
DB viết **chữ thường snake_case** (`published`, `checked_in`, `no_show`) — có một test regex quét toàn bộ
`pg_enum` để chặn nhãn viết hoa hoặc camelCase lọt vào migration.

### 13.4 Decorator `@Roles()` và `@MinTrust()`

```ts
// apps/api/src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@dnc/shared-types';

export const ROLES_KEY = 'authz:roles';
/** Cho phep NEU role toan cuc nam trong danh sach. Khong truyen = khong kiem tra truc 1. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

```ts
// apps/api/src/common/decorators/min-trust.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { TrustLevel } from '@dnc/shared-types';

export const MIN_TRUST_KEY = 'authz:minTrust';

export interface MinTrustOptions {
  /** Nguong ap dung khi nguoi goi KHONG phai host/co-host cua resource. */
  default: TrustLevel;
  /** Nguong rieng khi la host — thuong thap hon hoac bang. */
  asHost?: TrustLevel;
  /** Nguong rieng khi la co-host. */
  asCoHost?: TrustLevel;
}

export const MinTrust = (opts: TrustLevel | MinTrustOptions) =>
  SetMetadata(MIN_TRUST_KEY, typeof opts === 'number' ? { default: opts } : opts);
```

Ví dụ dùng thật — đúng ba trường hợp khó của §12:

```ts
// 1) Tao su kien: chi can truc 1 (moi role deu la "member" ve nghiep vu) + truc 3
@Post('/events')
@MinTrust(TrustLevel.T1)                       // Do2
create(@CurrentUser() u: AuthUser, @Body() dto: CreateEventRequest) {}

// 2) Xem danh sach attendee: nguong KHAC nhau theo quan he (Do20 vs Do22)
@Get('/occurrences/:occurrenceId/attendees')
@EventContext({ param: 'occurrenceId', source: 'occurrence' })
@MinTrust({ default: TrustLevel.T2, asHost: TrustLevel.T0, asCoHost: TrustLevel.T0 })
listAttendees() {}

// 3) Xuat CSV: bat buoc la host/co-host VA host phai >= T3 (Do22)
@Get('/occurrences/:occurrenceId/attendees.csv')
@EventContext({ param: 'occurrenceId', source: 'occurrence' })
@RequireEventRole(EventRole.HOST, EventRole.CO_HOST)
@MinTrust({ default: TrustLevel.T3, asHost: TrustLevel.T3, asCoHost: TrustLevel.T3 })
@Audit('pii_access')                            // Do22: bat buoc ghi audit_log
exportCsv() {}

// 4) Hang doi kiem duyet: chi truc 1
@Get('/admin/moderation/queue')
@Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
queue() {}
```

> **Quy tắc review**: một handler **không** được vừa có `@Roles(UserRole.MEMBER)` vừa có `@RequireEventRole()`
> — `member` là sàn, khai báo nó ở `@Roles()` là thừa và che mất ý định thật. Có test lint chặn tổ hợp này.

### 13.5 Truyền ngữ cảnh sự kiện vào guard — vấn đề khó nhất

Quan hệ host/co-host gắn ở cấp **`events`**, nhưng phần lớn endpoint nhận **`occurrenceId`** (RSVP, check-in),
và một số nhận `rsvpId` / `commentId`. Guard vì vậy phải **giải ngược** về `event_id` trước khi kiểm tra
quan hệ (§8.4). Ba nguyên tắc:

1. **Không đọc param bằng tay trong guard.** Route khai báo tường minh nguồn ngữ cảnh bằng `@EventContext()`.
2. **Đúng một truy vấn**, kết quả gắn vào `request.eventContext` và **tái dùng** ở service — service không
   truy vấn lại quan hệ.
3. **Không tìm thấy resource ⇒ `404`, không phải `403`** — tránh dò tồn tại (enumeration).

```ts
// apps/api/src/common/decorators/event-context.decorator.ts
export const EVENT_CONTEXT_KEY = 'authz:eventContext';
export const REQUIRE_EVENT_ROLE_KEY = 'authz:requireEventRole';

export type EventContextSource = 'event' | 'occurrence' | 'rsvp' | 'comment';

export interface EventContextOptions {
  param: string;                 // ten route param, vd 'occurrenceId'
  source: EventContextSource;    // quyet dinh cau SQL giai nguoc
  optional?: boolean;            // true = khong tim thay thi eventRole = NONE thay vi 404
}

export const EventContext = (opts: EventContextOptions) =>
  SetMetadata(EVENT_CONTEXT_KEY, opts);

/** Bat buoc nguoi goi phai co MOT trong cac quan he liet ke. */
export const RequireEventRole = (...roles: EventRole[]) =>
  SetMetadata(REQUIRE_EVENT_ROLE_KEY, roles);
```

`EventContextResolver` gom bốn câu truy vấn, mỗi câu trả về **một dòng** và đã bao gồm cờ quyền của co-host —
không có N+1, không cần load entity:

```sql
-- source = 'occurrence' (dung cho RSVP, check-in, attendee list, chat nhom)
SELECT
  o.id                                   AS occurrence_id,
  e.id                                   AS event_id,
  e.host_user_id,
  (e.host_user_id = $2)                  AS is_host,
  (ch.user_id IS NOT NULL)               AS is_cohost,
  COALESCE(ch.can_edit,     false)       AS can_edit,
  COALESCE(ch.can_cancel,   false)       AS can_cancel,
  COALESCE(ch.can_message,  false)       AS can_message,
  COALESCE(ch.can_check_in, false)       AS can_check_in
FROM event_occurrences o
JOIN events e ON e.id = o.event_id
LEFT JOIN event_cohosts ch
       ON ch.event_id = e.id
      AND ch.user_id  = $2
      AND ch.accepted_at IS NOT NULL      -- loi moi chua chap nhan KHONG tinh
WHERE o.id = $1;
```

| `source` | Bảng gốc | Đường giải ngược | Dùng cho UC |
|---|---|---|---|
| `event` | `events` | trực tiếp | UC-22, UC-23, UC-26, UC-28, UC-72 |
| `occurrence` | `event_occurrences` | `→ events` | UC-25, UC-27, UC-38, UC-40, UC-41, UC-43, UC-46, UC-49 |
| `rsvp` | `rsvps` | `→ event_occurrences → events` | UC-25 (gỡ attendee, Đ18), UC-39 |
| `comment` | `comments` | `→ events` (comment gắn `event_id`) | UC-45, Đ36 (host ẩn comment) |

```ts
// apps/api/src/common/guards/event-ownership.guard.ts (rut gon)
@Injectable()
export class EventOwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resolver: EventContextResolver,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.getAllAndOverride<EventContextOptions>(
      EVENT_CONTEXT_KEY, [ctx.getHandler(), ctx.getClass()],
    );
    if (!opts) return true;                        // route khong can truc 2 -> no-op

    const req = ctx.switchToHttp().getRequest();
    const resourceId = req.params[opts.param];
    const userId = req.user?.sub ?? null;

    const row = await this.resolver.resolve(opts.source, resourceId, userId);
    if (!row) {
      if (opts.optional) { req.eventContext = null; return true; }
      throw new NotFoundException(ErrorCode.EVENT_NOT_FOUND);   // 404, khong phai 403
    }

    req.eventContext = {
      eventId: row.event_id,
      occurrenceId: row.occurrence_id ?? undefined,
      eventRole: row.is_host ? EventRole.HOST
               : row.is_cohost ? EventRole.CO_HOST
               : EventRole.NONE,
      canEdit:    row.is_host || row.can_edit,
      canCancel:  row.is_host || row.can_cancel,     // Do13: co-host mac dinh false
      canMessage: row.is_host || row.can_message,
      canCheckIn: row.is_host || row.can_check_in,
    } satisfies EventContext;

    const required = this.reflector.getAllAndOverride<EventRole[]>(
      REQUIRE_EVENT_ROLE_KEY, [ctx.getHandler(), ctx.getClass()],
    );
    if (!required) return true;                    // chi gan ngu canh, khong bat buoc quan he

    // Loi thoat cho vai tro van hanh: admin/super_admin di duong rieng (Do9),
    // nhung PHAI qua header ly do + ghi audit_log muc high.
    const role: UserRole = req.user?.role;
    if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) {
      if (!req.headers['x-admin-reason']) {
        throw new ForbiddenException(ErrorCode.ADMIN_REASON_REQUIRED);
      }
      req.eventContext.adminOverride = true;
      return true;
    }

    if (!required.includes(req.eventContext.eventRole)) {
      throw new ForbiddenException(ErrorCode.PERM_NOT_EVENT_HOST);
    }
    return true;
  }
}
```

**Cờ chi tiết của co-host** (`can_edit`, `can_cancel`, `can_check_in`) **không** kiểm ở guard mà ở service —
guard chỉ trả lời "có phải co-host không". Lý do: một endpoint như `PATCH /events/:id` có thể chấp nhận nhiều
loại thay đổi với yêu cầu khác nhau (Đ5: co-host không đổi được `host_user_id`), guard không nhìn thấy body.

```ts
// Trong service — dung lai ngu canh, khong truy van lai
if (ctx.eventRole === EventRole.CO_HOST && dto.cancel && !ctx.canCancel) {
  throw new ForbiddenException(ErrorCode.PERM_COHOST_CANNOT_CANCEL);   // Do13
}
```

### 13.6 `TrustTierGuard` — đọc ngưỡng phụ thuộc ngữ cảnh

```ts
@Injectable()
export class TrustTierGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const opts = this.reflector.getAllAndOverride<MinTrustOptions>(
      MIN_TRUST_KEY, [ctx.getHandler(), ctx.getClass()],
    );
    if (!opts) return true;

    const req = ctx.switchToHttp().getRequest();
    const evCtx: EventContext | null = req.eventContext ?? null;   // do lop 4 gan

    const required =
      evCtx?.eventRole === EventRole.HOST    ? (opts.asHost   ?? opts.default) :
      evCtx?.eventRole === EventRole.CO_HOST ? (opts.asCoHost ?? opts.default) :
      opts.default;

    const tier: number = req.user?.tier ?? 0;
    if (tier < required) {
      throw new ForbiddenException({
        code: ErrorCode.PERM_TRUST_TIER_TOO_LOW,
        requiredTier: `T${required}`,
        currentTier: `T${tier}`,
        // UI dung key nay de hien dung buoc nang cap tiep theo
        nextStepI18nKey: `trust.upgrade.t${required}.cta`,
      });
    }
    return true;
  }
}
```

**Vấn đề trust cũ trong token** (đã nêu ở `04-tech-stack-va-kien-truc.md` §7.7): `tier` nằm trong access token
TTL 15 phút, nên người vừa xác minh số điện thoại chưa thấy quyền mới ngay. Ba chỗ phải xử lý:

| Tình huống | Xử lý |
|---|---|
| Vừa xác minh email/phone (T tăng) | Endpoint `/auth/email/verify` và `/auth/phone/otp/verify` **trả luôn cặp token mới** với `tier` cập nhật; client thay tại chỗ |
| Job `trust:recompute` nâng bậc (T2→T3…) | Không phát token mới. Người dùng thấy quyền mới ở lần refresh kế tiếp (≤ 15 phút). Chấp nhận được vì đây là nâng quyền, không phải hạ quyền |
| Job **hạ** bậc hoặc đổi role / khoá tài khoản | **Phải có hiệu lực ngay**: ghi `revoked:sid:{sid}` cho mọi phiên của user (TTL = TTL còn lại của token) và thu hồi refresh token. Đây là lý do `JwtAuthGuard` tra Redis mỗi request |

### 13.7 Mã lỗi phân quyền

Định dạng SCREAMING_SNAKE_CASE, khai báo tập trung, mỗi mã có key i18n EN + VI. Response `403` **luôn** nói rõ
"cần gì để đủ điều kiện", không bao giờ chỉ trả chuỗi rỗng.

| Mã | HTTP | Khi nào | Thông điệp UI hướng tới |
|---|---|---|---|
| `AUTH_TOKEN_MISSING` | 401 | Guest chạm endpoint cần đăng nhập | Mở màn hình đăng nhập, **giữ nguyên ngữ cảnh** để quay lại (Đ14) |
| `ACCOUNT_RESTRICTED` | 403 | `status = 'restricted'` | Nêu ngày hết hạn + link khiếu nại (UC-63) |
| `ACCOUNT_SUSPENDED` / `ACCOUNT_BANNED` | 403 | Trục 0 | Không nêu chi tiết case; chỉ link khiếu nại |
| `PERM_ROLE_REQUIRED` | 403 | Trục 1 | Thông điệp trung tính, **không** tiết lộ role nào mới đủ |
| `PERM_NOT_EVENT_HOST` | 403 | Trục 2 | "Chỉ người tổ chức buổi này mới làm được" |
| `PERM_COHOST_CANNOT_CANCEL` | 403 | Đ13 | "Người tổ chức chính chưa bật quyền huỷ cho bạn" |
| `PERM_TRUST_TIER_TOO_LOW` | 403 | Trục 3 | Kèm `requiredTier` + CTA đúng bước tiếp theo (xác minh phone…) |
| `QUOTA_EXCEEDED` | 429 | Hạn mức §11.2 | Kèm `resetAt` và bậc hiện tại |
| `HOST_CANNOT_RSVP` | 409 | Đ16 | "Bạn là người tổ chức, đã được tính là có mặt" |
| `CHECK_IN_WINDOW_CLOSED` | 409 | Đ24 | Nêu cửa sổ T-2h → T+48h |
| `AMBIGUOUS_OCCURRENCE` | 409 | Đường tắt `/events/{id}/rsvps` khi có nhiều occurrence sắp tới | Hiện danh sách buổi để người dùng chọn |
| `ADMIN_REASON_REQUIRED` | 403 | Đ9 — admin thao tác không kèm lý do | Bắt buộc ô lý do trong màn hình admin |

### 13.8 Cách test phân quyền — test bằng bảng ma trận

Nguyên tắc: **ma trận §9.2 + §12 được mã hoá thành dữ liệu**, và test sinh ra từ dữ liệu đó. Không viết tay
từng `it()` cho từng ô — 22 quyền × 8 cột đã là 176 ô, cộng 76 UC thì không ai bảo trì nổi bằng tay.

#### 13.8.1 Bộ fixture người dùng chuẩn — 14 tài khoản

Seed một lần cho toàn bộ test tích hợp. Tên biến là **hợp đồng**: mọi test tham chiếu đúng các tên này.

| Fixture | `role` | `trust_level` | `status` | Quan hệ với event mẫu | Dùng để kiểm |
|---|---|---|---|---|---|
| `guestClient` | — | — | — | — | INV-1, Đ1, Đ14, Đ19, Đ33 |
| `memberT0` | `member` | 0 | `active` | không | Đ2, Đ15 (`trust_gate`), Đ28 |
| `memberT1` | `member` | 1 | `active` | không | Ngưỡng T1: tạo event, RSVP, bình luận |
| `memberT2` | `member` | 2 | `active` | attendee (`going`) | Đ20, Đ29, UC-43, UC-46 |
| `memberT2NotAttending` | `member` | 2 | `active` | không | Chốt chặn "T2 nhưng chưa RSVP" của Đ20 |
| `memberT3` | `member` | 3 | `active` | host | UC-24 recurring, xuất CSV |
| `memberT4` | `member` | 4 | `active` | không | `community_vouch`, UC-49 mở album |
| `hostUser` | `member` | 2 | `active` | **host** của `EVENT_A` | Đ4, Đ12, Đ22, Đ24, Đ27 |
| `coHostEdit` | `member` | 2 | `active` | co-host `can_edit=true`, `can_cancel=false` | Đ5, Đ13, Đ25 |
| `coHostPending` | `member` | 2 | `active` | co-host **`accepted_at IS NULL`** | Bẫy: lời mời chưa nhận **không** cho quyền gì |
| `restrictedUser` | `member` | 3 | `restricted` | host của `EVENT_B` | Đ0 — mất quyền ghi dù trust cao |
| `curatorUser` | `curator` | 5 | `active` | tạo `EVENT_CURATED` | Đ7, Đ30, Đ40, Đ42, Đ44 |
| `moderatorUser` | `moderator` | 5 | `active` | **host của `EVENT_C`** | Đ34, Đ41, INV-4 (xung đột lợi ích) |
| `adminUser` / `superAdminUser` | `admin` / `super_admin` | 5 | `active` | không | Đ9, Đ38, Đ39, §9.4 |

Ba event mẫu: `EVENT_A` (self-serve, `hostUser`), `EVENT_B` (của `restrictedUser`), `EVENT_CURATED`
(`source_type='curated'`, `claim_status='not_claimed'`), cộng `EVENT_C` do `moderatorUser` host. Mỗi event có
đúng 1 occurrence trừ `EVENT_A` có 2 occurrence sắp tới — để kiểm `409 AMBIGUOUS_OCCURRENCE`.

#### 13.8.2 Ma trận máy đọc được

```ts
// apps/api/src/common/authz/permission-matrix.const.ts
// Ban sao may doc duoc cua §9.2. Doi bang trong tai lieu -> PHAI doi file nay.
export type Expectation = 'allow' | 'deny' | 'conditional';

export interface MatrixRow {
  permission: string;                       // 'rsvp.create'
  ucRefs: string[];                         // ['UC-38']
  route: { method: 'GET'|'POST'|'PATCH'|'DELETE'; path: string };
  expect: Record<FixtureName, Expectation>;
  minTrust?: TrustLevel;
  conditionRefs?: string[];                 // ['D15','D16']
}

export const PERMISSION_MATRIX: MatrixRow[] = [
  {
    permission: 'rsvp.create',
    ucRefs: ['UC-38'],
    route: { method: 'POST', path: '/api/v1/occurrences/:occurrenceId/rsvps' },
    minTrust: TrustLevel.T1,
    conditionRefs: ['D15', 'D16'],
    expect: {
      guestClient: 'deny', memberT0: 'conditional', memberT1: 'allow',
      memberT2: 'allow', memberT3: 'allow', memberT4: 'allow',
      hostUser: 'deny',            // Do16 HOST_CANNOT_RSVP
      coHostEdit: 'deny',          // Do16
      coHostPending: 'allow',      // chua chap nhan loi moi -> van la member thuong
      restrictedUser: 'deny',      // Do0
      curatorUser: 'allow', moderatorUser: 'allow',
      adminUser: 'allow', superAdminUser: 'allow',
    },
  },
  // ... 21 dong con lai cua §9.2 + 12 dong cua §9.4
];
```

#### 13.8.3 Test sinh tự động từ ma trận

```ts
describe.each(PERMISSION_MATRIX)('$permission ($ucRefs)', (row) => {
  it.each(Object.entries(row.expect))('%s -> %s', async (fixture, expectation) => {
    const res = await callAs(fixture as FixtureName, row.route);

    if (expectation === 'allow') {
      expect(res.status).toBeLessThan(400);
    } else if (expectation === 'deny') {
      expect([401, 403, 404, 409]).toContain(res.status);
      expect(res.body.code).toMatch(/^(AUTH_|PERM_|ACCOUNT_|HOST_)/);
    } else {
      // 'conditional' phai co it nhat mot test rieng vien dan dieu kien
      expect(CONDITIONAL_CASES).toHaveProperty(`${row.permission}.${fixture}`);
    }
  });
});
```

#### 13.8.4 Năm nhóm test bắt buộc

| Nhóm | Nội dung | Chặn merge? |
|---|---|---|
| **T-1 Ma trận** | Toàn bộ `PERMISSION_MATRIX` × 14 fixture, chạy thật qua HTTP (`supertest`) chứ không gọi service trực tiếp | ✅ |
| **T-2 Bất biến** | INV-1 → INV-4 (§9.5). INV-1 quét `router.stack`: mọi route thiếu `@Public()` phải nằm sau `JwtAuthGuard` | ✅ |
| **T-3 Thứ tự guard** | Giả lập user `suspended` + `super_admin` + thiếu trust ⇒ **phải** trả `ACCOUNT_SUSPENDED`, không phải `PERM_TRUST_TIER_TOO_LOW`. Chứng minh thứ tự §13.1 | ✅ |
| **T-4 Trôi ma trận (drift)** | Quét mọi handler có `@Roles` / `@MinTrust` / `@RequireEventRole`; route nào **không** xuất hiện trong `PERMISSION_MATRIX` ⇒ **fail**. Ngăn thêm endpoint mà quên khai báo kỳ vọng | ✅ |
| **T-5 State machine** | 8 × 8 ô chuyển trạng thái (§10.3); ô không hợp lệ phải ném `InvalidStateTransitionException` | ✅ |

```ts
// T-3: bang chung ve thu tu guard — test de doc, gia tri rat cao
it('trang thai tai khoan duoc kiem TRUOC role va trust', async () => {
  const res = await callAs('suspendedSuperAdmin', {
    method: 'POST', path: '/api/v1/events',
  });
  expect(res.status).toBe(403);
  expect(res.body.code).toBe('ACCOUNT_SUSPENDED');   // KHONG phai PERM_*
});
```

```ts
// T-4: chan endpoint moi khong khai bao ky vong phan quyen
it('moi route co metadata phan quyen deu co dong trong PERMISSION_MATRIX', () => {
  const declared = new Set(
    PERMISSION_MATRIX.map((r) => `${r.route.method} ${r.route.path}`),
  );
  const missing = collectGuardedRoutes(app).filter((r) => !declared.has(r));
  expect(missing).toEqual([]);   // thong bao loi in ra danh sach route thieu
});
```

#### 13.8.5 Test phân quyền ở tầng web & mobile

Frontend **không** được tự suy luận quyền bằng cách so sánh chuỗi role rải rác trong component. Một hàm duy
nhất ở `packages/shared-types` trả lời, và cả `apps/web` lẫn `apps/mobile` cùng dùng:

```ts
// packages/shared-types/src/authz/can.ts
export function can(
  viewer: { role: UserRole; trustLevel: TrustLevel; status: UserStatus } | null,
  action: PermissionKey,
  ctx?: { eventRole?: EventRole; hasRsvp?: boolean },
): boolean { /* ... */ }
```

- Test snapshot: `can()` chạy trên **cùng** `PERMISSION_MATRIX` và phải khớp kết quả backend cho mọi ô `allow`/`deny`.
- Quy tắc UI: `can()` sai lệch chỉ làm **ẩn/hiện nút**, không bao giờ là lớp bảo vệ. Backend luôn kiểm lại.
- Ngoại lệ có chủ đích: nút RSVP **vẫn hiện** với `guest` (Đ14) — đây là quyết định sản phẩm, không phải lỗ hổng.

### 13.9 Checklist review PR chạm vào phân quyền

- [ ] Route mới có đúng một trong: `@Public()`, `@Roles()`, `@MinTrust()`, `@RequireEventRole()` — không để trống mặc định
- [ ] Ngưỡng trust dùng **chỉ** các giá trị có trong §12.13; không phát minh ngưỡng mới
- [ ] Endpoint chạm dữ liệu của event dùng `@EventContext()`, **không** tự đọc `req.params` trong service để kiểm quyền
- [ ] Service **tái dùng** `request.eventContext`, không truy vấn lại `event_cohosts`
- [ ] Hành động của `curator`/`moderator`/`admin`/`super_admin` trên dữ liệu người khác có `@Audit(...)` (INV-2)
- [ ] Không tìm thấy resource ⇒ `404`, thiếu quyền ⇒ `403`; không lẫn lộn
- [ ] Có dòng mới trong `PERMISSION_MATRIX` và test T-1 xanh
- [ ] Enum mới (nếu có) đặt đúng chỗ (`packages/shared-types` vs `src/common/enums`) và có test đồng bộ với `pg_enum`
- [ ] Thông điệp lỗi có key i18n **cả EN và VI**, không hard-code chuỗi tiếng Anh

---

## 14. Rủi ro phân quyền & câu hỏi mở

### 14.1 Cách xếp hạng

`Khả năng` × `Tác động`, mỗi trục 3 mức (Thấp / TB / Cao). Ưu tiên xử lý = ô có ít nhất một trục ở mức Cao.
Mỗi rủi ro có **hai** loại biện pháp tách bạch: **Ngăn** (chặn trước, ở guard/DB) và **Phát hiện** (nhận ra sau,
ở job/dashboard) — chỉ có "ngăn" mà không có "phát hiện" thì không đủ, vì kẻ lạm dụng luôn tìm được đường vòng.

### 14.2 Bảng rủi ro

| Mã | Rủi ro | Kịch bản khai thác cụ thể | KN | TĐ | Ngăn | Phát hiện | Chủ sở hữu | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| **R-01** | **Leo thang đặc quyền qua co-host** | Kẻ xấu tạo event rác, mời chính tài khoản phụ của mình làm co-host với `can_edit=true`, rồi dùng tài khoản phụ đó để nhắn tin cho attendee của event (bỏ qua điều kiện "từng chung occurrence" của Đ29) | TB | **Cao** | (a) Người được mời phải **≥ T2**; (b) `accepted_at IS NOT NULL` mới có quyền; (c) `can_cancel` mặc định `false`; (d) co-host **không** sửa được `host_user_id`, `host_type` và danh sách co-host (Đ5); (e) tối đa 5 co-host/event; (f) broadcast tới attendee giới hạn **1 lượt/occurrence/ngày** (Đ32) | Cảnh báo khi một user được mời làm co-host ở **> 5 event trong 7 ngày**; cảnh báo khi cụm host–co-host dùng chung thiết bị/IP; tỉ lệ DM của co-host trên số attendee > 80 % | Backend lead | **Đã thiết kế** |
| **R-02** | **Moderator tự kiểm duyệt nội dung của chính mình** | `moderatorUser` đồng thời là host của `EVENT_C`. Có report về `EVENT_C`; moderator tự vào hàng đợi và đóng case "không vi phạm" | TB | **Cao** | Conflict-of-interest guard **chặn cứng** ở tầng service: lọc khỏi hàng đợi các case mà `reported_by = actor` **hoặc** `target_user_id = actor` **hoặc** event liên quan có `host_user_id = actor` hoặc actor là co-host (Đ34, Đ41). Bất biến INV-4 có test | Job hằng đêm đối chiếu `moderation_cases.resolved_by` với quan hệ host/co-host tại **thời điểm xử lý** (không phải hiện tại); mọi vi phạm gửi cảnh báo tới `super_admin` | Trust & Safety | **Đã thiết kế** |
| **R-03** | **Admin xem dữ liệu cá nhân không để lại dấu vết** | `admin` mở màn hình quản lý user, xem email/số điện thoại/danh sách attendee của nhiều người mà không gắn với case nào — tò mò, hoặc rò rỉ cho bên thứ ba | **Cao** | **Cao** | (a) **Không có** màn hình duyệt danh sách attendee tự do (Đ21); (b) mọi truy cập PII bắt buộc kèm `moderation_case_id` hoặc `support_ticket_id`; (c) decorator `@Audit('pii_access')` là **bắt buộc** trên mọi endpoint trả PII, có test T-4 chặn thiếu; (d) `audit_log` append-only, DB role ứng dụng bị thu hồi `UPDATE/DELETE` | Dashboard "PII access" hiển thị số lượt/người/tuần; ngưỡng cảnh báo **> 20 lượt/tuần/người**; `super_admin` nhận báo cáo tuần; `admin` **không** xem được log của `super_admin` nhưng `super_admin` xem được tất cả (Đ50, Đ51) | Super admin | **Đã thiết kế — cần rà lại khi có màn hình admin thật** |
| **R-04** | **Farm trust level bằng sự kiện ảo** | Tạo 5 tài khoản, lần lượt host các "buổi cà phê" không có thật ở An Thượng, RSVP chéo cho nhau và bấm `checked_in` lẫn nhau. Sau ~3 tuần cả 5 đạt T3, một tài khoản lên T4 rồi dùng `community_vouch` kéo tài khoản thứ 6 lên | **Cao** | **Cao** | (a) `event_hosted_completed` chỉ tính khi occurrence có **≥ 3 người `checked_in`**; (b) T3 cần tài khoản ≥ 14 ngày, T4 ≥ 60 ngày; (c) **T5 không bao giờ tự động** — luôn cần `staff_endorsement` của `admin`; (d) `community_vouch` trần **3 lượt nhận/người**, chỉ T4/T5 cấp được, hết hạn 12 tháng; (e) đánh giá UC-16 chỉ tính khi hai bên **không** cùng cụm | Job `trust:fraud_scan` hằng đêm chấm điểm cụm: đồ thị attendee–host, phát hiện **thành phần liên thông nhỏ, dày, khép kín** (≥ 80 % lượt tham gia chỉ diễn ra trong cụm ≤ 8 người, lặp ≥ 3 lần); cờ vàng đưa vào hàng đợi kiểm duyệt, **không** tự hạ bậc | Trust & Safety | ⚠️ **Còn hở — thuật toán chấm cụm chưa chốt, xem Q-04** |
| **R-05** | **Chiếm listing bằng claim giả mạo** | Kẻ xấu bắt được link mời claim (UC-67) chuyển tiếp trong nhóm chat, dùng token nhận một listing đông người quan tâm rồi đổi địa điểm/nội dung | TB | **Cao** | Token 14 ngày, **một lần dùng**, gắn `listing_id` + email đích; cần đồng thời **T2** + email khớp domain nguồn, hoặc `admin` xác minh tay; sau khi claim, thay đổi trọng yếu trong 7 ngày đầu đưa vào `pending_review` | Cảnh báo khi listing vừa claim bị đổi `venue`/`starts_at` trong 48 h; curator nhận thông báo và có nút "thu hồi claim" trong 7 ngày | Curator lead | **Đã thiết kế** |
| **R-06** | **Host lạm dụng `no_show` để trả đũa** | Host bực vì bị chê trong bình luận, đánh dấu `no_show` cho toàn bộ attendee, kéo trust của họ xuống | TB | TB | Cửa sổ gắn nhãn **T+2h → T+48h** (Đ27); nếu host đánh dấu `no_show` cho **> 50 %** attendee của một occurrence thì bản ghi tự vào hàng đợi kiểm duyệt; attendee khiếu nại trong 7 ngày, gỡ nhãn **hoàn lại** `trust_signal` âm | Thống kê `no_show_rate` do host gắn so với trung vị toàn nền tảng; host lệch > 3σ bị rà | Trust & Safety | **Đã thiết kế** |
| **R-07** | **Impersonate bị dùng như cửa hậu** | `admin` dùng `user.impersonate.readonly` để đọc tin nhắn riêng của một user, viện cớ hỗ trợ | Thấp | **Cao** | Chỉ đọc, tối đa **30 phút/phiên**; **bắt buộc** gửi thông báo cho chính user đó; banner đỏ hiện trên toàn UI trong phiên; `audit_log` mức `critical`; **không** đọc được nội dung DM (chỉ metadata) | Báo cáo tuần gửi `super_admin`; user nhận thông báo nên tự phát hiện được và khiếu nại | Super admin | ⚠️ **Cần chốt: có bật ở MVP không — xem Q-06** |
| **R-08** | **Đổi role nhưng token cũ còn hiệu lực** | Hạ một `moderator` về `member` lúc 10:00; access token cũ còn hạn tới 10:14 vẫn gọi được API kiểm duyệt | TB | **Cao** | Đổi role ⇒ **thu hồi toàn bộ refresh token** (§8.3 quy tắc 4) **và** ghi `revoked:sid:{sid}` cho mọi phiên; `JwtAuthGuard` tra Redis mỗi request | Test T-3 có ca "đổi role rồi gọi lại bằng token cũ ⇒ 401"; cảnh báo nếu có request mang `role` khác `users.role` hiện tại | Backend lead | **Đã thiết kế** |
| **R-09** | **Khoá chết `super_admin`** | Hai `super_admin`, một người mất thiết bị 2FA, người kia vô tình bị `suspended` ⇒ không ai gán được role, không ai gỡ khoá | Thấp | **Cao** | Hệ thống **chặn cứng** thao tác làm số `super_admin` đang `active` xuống dưới **2** (INV-3); `super_admin` không tự khoá được chính mình; quy trình khôi phục ngoài băng (break-glass) có tài liệu riêng, dùng khoá dự phòng cất offline | Health check hằng ngày đếm `super_admin` active; cảnh báo nếu = 2 (không còn dư) | CTO | ⚠️ **Quy trình break-glass chưa viết — Q-07** |
| **R-10** | **Curator dùng kênh mời claim như kênh spam** | Curator gửi thư mời claim tới hàng loạt organizer chỉ để kéo họ vào app, không thực sự có listing | Thấp | TB | `curator` **không** DM tự do (Đ30); chỉ template cố định `claim_invitation`; **tối đa 3 lần liên hệ/listing**; rate limit **30 listing/giờ/tài khoản** (Đ42); cấm crawler | Dashboard phễu curate (UC-69): tỉ lệ mời → claim tụt dưới 10 % thì rà lại chất lượng nguồn | Curator lead | **Đã thiết kế** |
| **R-11** | **`guest` báo cáo hàng loạt để dìm đối thủ** | Đối thủ tạo 50 báo cáo ẩn danh vào các sự kiện của một studio để đẩy chúng vào hàng đợi và ẩn tạm | TB | TB | Guest báo cáo có captcha, **3 báo cáo/IP/ngày**, mặc định mức `normal`, **không** báo cáo được người dùng (chỉ nội dung, Đ33); báo cáo từ guest **không bao giờ** tự động ẩn nội dung — luôn cần moderator | Gộp báo cáo trùng đối tượng; `trust_signal` `report_abuse` cho tài khoản báo cáo sai ≥ 3 lần; theo dõi cụm IP/ASN | Trust & Safety | **Đã thiết kế** |
| **R-12** | **Rò rỉ danh sách attendee qua analytics** | Host ở T2 dùng UC-72 khoan xuống "phân bố khu vực của attendee" trên một occurrence chỉ có 2 người ⇒ suy ra danh tính và nơi ở | TB | **Cao** | Analytics là **số liệu tổng hợp**; **k-anonymity**: không hiển thị chiều phân rã nào có nhóm < **5** người, thay bằng "không đủ dữ liệu"; xuất CSV cần host ở **T3** + ghi `audit_log` | Rà các truy vấn analytics trả về nhóm nhỏ; đếm lượt xuất CSV/host/tuần | Data / Backend | ⚠️ **Ngưỡng k = 5 cần xác nhận — Q-08** |
| **R-13** | **Hạ bậc trust dùng như hình phạt lộ ra ngoài** | Người dùng bị tụt bậc, badge "Trusted" biến mất khỏi hồ sơ công khai, cộng đồng suy ra người đó vừa bị kỷ luật | TB | TB | **Không badge nào mang nghĩa tiêu cực**; số `no_show`, số lần bị báo cáo, điểm thành phần **không bao giờ** hiển thị công khai; thông báo tụt bậc dùng ngôn ngữ trung tính, gửi riêng; ràng buộc không tụt quá **1 bậc/7 ngày** | Rà nội dung mẫu thông báo mỗi lần thay đổi; đo tỉ lệ rời bỏ sau sự kiện tụt bậc | Product | **Đã thiết kế** |
| **R-14** | **Quyền phình theo thời gian (permission creep)** | Mỗi lần thêm tính năng lại nới thêm cho `moderator` một chút; sau 6 tháng `moderator` gần bằng `admin` mà không ai nhận ra | **Cao** | TB | Ma trận §9.2 là **nguồn sự thật duy nhất**, được mã hoá thành `PERMISSION_MATRIX`; test **T-4 drift** chặn merge route không khai báo; thêm ô ✅ mới cho role vận hành phải có PR riêng gắn nhãn `authz` và cần 2 người duyệt | Rà soát ma trận định kỳ ở mốc **M3** và **M6**; báo cáo "số ô ✅ theo role" so với bản trước | Backend lead | **Đã thiết kế** |

### 14.3 Chuỗi tấn công R-04 — farm trust bằng sự kiện ảo

Vẽ ra để thấy **điểm chặn rẻ nhất** không nằm ở cuối chuỗi mà ở hai chỗ: điều kiện `≥ 3 người checked_in` và
cổng thủ công của T5.

```mermaid
flowchart LR
    A1["Tao 5 tai khoan<br/>email khac nhau"] --> A2["Xac minh email<br/>-> T1"]
    A2 --> A3{"Xac minh phone<br/>-> T2"}
    A3 -->|"chan 1: can 5 SIM that<br/>1 so = 1 tai khoan active"| B1["Chi phi that tang"]
    A3 --> A4["Tao su kien ao<br/>o An Thuong"]
    A4 --> A5["RSVP cheo"]
    A5 --> A6{"Host bam checked_in"}
    A6 -->|"chan 2: event_hosted_completed<br/>can >= 3 nguoi checked_in"| B2["Phai duy tri >= 3 tai khoan/buoi"]
    A6 --> A7["Lap 3 buoi + cho 14 ngay"]
    A7 --> A8["Dat T3"]
    A8 --> A9["Lap 8 buoi + cho 60 ngay<br/>+ danh gia >= 4,5"]
    A9 --> A10{"Dat T4"}
    A10 -->|"chan 3: job trust:fraud_scan<br/>phat hien cum khep kin"| B3["Co vang -> hang doi kiem duyet"]
    A10 --> A11["Dung community_vouch<br/>keo tai khoan thu 6"]
    A11 --> A12{"Muon len T5"}
    A12 -->|"CHAN CUNG: T5 luon can<br/>staff_endorsement cua admin"| B4["Khong bao gio tu dong"]

    style B1 fill:#fff4e5,stroke:#d98d00
    style B2 fill:#fff4e5,stroke:#d98d00
    style B3 fill:#fff4e5,stroke:#d98d00
    style B4 fill:#ffe5e5,stroke:#d63a3a
```

**Kết luận thiết kế**: chi phí tấn công tăng tuyến tính theo số SIM và theo thời gian chờ (14 → 60 ngày), trong
khi phần thưởng cao nhất (T5) bị khoá sau một hành động người thật. Đây là lý do **không** cần thuật toán phát
hiện gian lận phức tạp ở MVP — nhưng vẫn phải có job cờ vàng, vì T4 đã đủ để `community_vouch` và để được ưu
tiên trong dải "Featured".

### 14.4 Câu hỏi mở cần chủ dự án trả lời

| Mã | Câu hỏi | Vì sao phải trả lời | Ảnh hưởng nếu không trả lời | Người quyết | Hạn |
|---|---|---|---|---|---|
| **Q-01** | Moderator tình nguyện từ cộng đồng (từ M4) có được ký **thoả thuận bảo mật** riêng và có được xem PII của người dùng không? | Người ngoài tổ chức chạm dữ liệu cá nhân là nghĩa vụ theo **Luật 91/2025/QH15** — cần cơ sở pháp lý và hợp đồng xử lý dữ liệu. **CẦN LUẬT SƯ XÁC NHẬN** | Không dám mở role cho cộng đồng ⇒ đội nội bộ gánh toàn bộ hàng đợi, không đạt SLA `critical` 2 giờ | Founder + luật sư | **Trước M4** |
| **Q-02** | `curator` có được xem địa chỉ email của organizer gốc mà mình liên hệ không, hay chỉ thấy "đã gửi"? | Persona P5 cần theo dõi phễu claim; nhưng email lấy từ nguồn công khai vẫn là dữ liệu cá nhân theo Luật 91/2025. **CẦN LUẬT SƯ XÁC NHẬN** | Hoặc curator làm việc mù, hoặc lưu PII không có cơ sở pháp lý | Founder + luật sư | **Trước M1** |
| **Q-03** | Có làm **organization profile** (nhiều user ↔ một tổ chức) ở GĐ1 không, hay chỉ dùng co-host? | Persona P4 (Linh) cần nhân viên đăng bài mà không dùng tài khoản cá nhân. Co-host giải quyết được 80 % nhưng gắn theo **từng event**, không theo thương hiệu | Nếu quyết muộn thì phải migrate `events.host_type` và sinh trục phân quyền thứ tư | Product owner | **Trước M2** |
| **Q-04** | Ngưỡng cờ vàng của `trust:fraud_scan` (R-04) đặt ở đâu: kích thước cụm, độ khép kín, số lần lặp? | Quá nhạy ⇒ đội kiểm duyệt ngập cờ giả; quá lỏng ⇒ farm trust trót lọt | Job ra đời không có ngưỡng ⇒ hoặc tắt, hoặc gây phiền | Trust & Safety + Data | **Trước M3** |
| **Q-05** | Người dùng bị `banned` rồi được khôi phục về **T1** — có công bằng không khi họ từng ở T5 sau 2 năm đóng góp? | Quy tắc hiện tại (S10) cứng và có thể đẩy người tốt bị oan rời hẳn | Rủi ro mất người dùng có giá trị nhất sau một sai sót kiểm duyệt | Product owner | Trước M4 |
| **Q-06** | Có bật `user.impersonate.readonly` ở MVP không? | Rất hữu ích cho hỗ trợ, nhưng là quyền nguy hiểm nhất trong hệ thống (R-07) | Nếu bật mà chưa có audit + thông báo đầy đủ thì tạo rủi ro pháp lý và niềm tin | CTO | **Trước M1** |
| **Q-07** | Quy trình **break-glass** khi mất cả hai `super_admin` là gì, ai giữ khoá dự phòng, cất ở đâu? | R-09 khoá chết toàn bộ khả năng quản trị | Sự cố hiếm nhưng không có đường thoát | CTO | **Trước M1** |
| **Q-08** | Ngưỡng k-anonymity cho analytics organizer là **5** hay con số khác? | R-12 — Đà Nẵng ở giai đoạn đầu có nhiều sự kiện chỉ 3–6 người; k = 5 có thể làm analytics trống rỗng | Hoặc lộ danh tính, hoặc tính năng vô dụng với host nhỏ | Product + Data | Trước M3 |
| **Q-09** | Host có được **chặn** một user cụ thể RSVP vào sự kiện của mình không, và có phải nêu lý do không? | Nhu cầu an toàn thật (đuổi người quấy rối), nhưng dễ thành công cụ loại trừ theo quốc tịch/giới | Thiếu công cụ ⇒ host bỏ nền tảng sau một sự cố; có công cụ mà không kiểm soát ⇒ rủi ro phân biệt đối xử | Product + Trust & Safety | Trước M3 |
| **Q-10** | Sự kiện **có thu phí** ở GĐ1 được phép tới đâu (chỉ khai `price`, thu tiền ngoài app)? Ai kiểm chứng? | Persona P4 sẵn sàng trả phí và tổ chức lớp có thu tiền; ranh giới nội dung thương mại chưa rõ | `moderator` không có tiêu chí để phân biệt "hoạt động có phí" với "quảng cáo dịch vụ" | Product owner | **Trước M1** |
| **Q-11** | `admin` có được **đề xuất** nâng role và `super_admin` chỉ bấm duyệt, hay `admin` hoàn toàn không chạm? | Quy trình hiện tại (§8.3) cho `admin` chỉ **đề xuất** — cần xác nhận có xây luồng đề xuất/duyệt hay bỏ hẳn | Nếu bỏ, `super_admin` thành nút thắt cổ chai vận hành | CTO | Trước M2 |
| **Q-12** | Có cho phép **hạ trust level thủ công** bởi `admin` (ngoài các quy tắc tự động ở §11.4) không? | Có trường hợp con người biết rõ hơn dữ liệu; nhưng mở ra là mở cửa cho quyết định tuỳ tiện | Hoặc thiếu công cụ xử lý ca đặc biệt, hoặc mất tính nhất quán của thang trust | Trust & Safety | Trước M4 |

> Mọi câu hỏi gắn nhãn **CẦN LUẬT SƯ XÁC NHẬN** (Q-01, Q-02) phải được rà theo **Luật Bảo vệ dữ liệu cá nhân
> 91/2025/QH15** — từ **01/01/2026** đây là văn bản hiệu lực cao hơn Nghị định 13/2023/NĐ-CP, và **mọi mẫu biểu,
> thông báo, văn bản đồng ý phải theo Luật 91/2025**. Chi tiết ở `06-phap-ly-va-tuan-thu-viet-nam.md`.

---

## 15. Quyết định đã chốt

### 15.1 Quyết định về role toàn cục

Mã `MT-xx` là số hiệu mâu thuẫn đã tồn tại giữa các bản phân tích trước; mã `D-xx` là quyết định của bản 1.0.
**Những quyết định dưới đây là ràng buộc, không phải đề xuất** — mọi tài liệu, migration và PR sau ngày
2026-08-31 phải tuân theo, và mọi phương án thay thế đã được cân nhắc rồi loại bỏ.

| Mã | Quyết định | Lý do | Phương án bị loại | Ảnh hưởng phải thực hiện | Tham chiếu |
|---|---|---|---|---|---|
| **D-01** (MT-02) | `users.role` là enum **đúng 5 giá trị**: `member`, `curator`, `moderator`, `admin`, `super_admin` | Một trục role duy nhất, kiểm được bằng một claim JWT, không cần bảng nối `user_roles`. Năm giá trị phủ hết nhu cầu GĐ1 mà vẫn đọc được bằng mắt | (a) RBAC đầy đủ với bảng `roles`/`permissions`/`role_permissions` — quá nặng cho quy mô 2.000 user; (b) enum 8–10 giá trị gộp cả `organizer`, `verified_member`, `support`, `service_provider` — chính là nguồn gốc MT-02 | Migration `CREATE TYPE user_role_enum`; `packages/shared-types/src/enums/user-role.enum.ts`; test đồng bộ `pg_enum` (§13.3) | §8.1, §13.3 |
| **D-02** | `guest` **không** là giá trị DB — chỉ là trạng thái phiên "chưa có JWT hợp lệ" | Không tồn tại hàng `users` cho người chưa đăng ký; tạo giá trị enum cho nó buộc mọi truy vấn phải lọc thêm | Thêm `'guest'` vào enum và tạo một tài khoản ẩn danh dùng chung — phá vỡ khoá ngoại và làm sai mọi thống kê | `@Public()` + `request.user === undefined`; cột `guest` trong ma trận §9.2 là cột **kiểm thử**, không phải cột dữ liệu | §8.1, §12.1 |
| **D-03** | `organizer` **không** là role toàn cục — là **quan hệ theo sự kiện** qua `events.host_user_id` và bảng `event_cohosts` | Một người là organizer *của những sự kiện của mình*, không phải của cả nền tảng. Nguyên tắc P1: tạo hoạt động không được có "đơn xin làm organizer" | (a) Role `organizer` cấp sau khi duyệt — thêm ma sát, giết nguồn cung ở giai đoạn cold-start; (b) role `organizer` tự động khi tạo event đầu tiên — vẫn sai ngữ nghĩa vì quyền không thu hồi được theo từng sự kiện | Cột `events.host_user_id` (**tên chốt**, không dùng `organizer_id`); bảng `event_cohosts`; `EventOwnershipGuard` + `@EventContext()` | §8.4, §13.5 |
| **D-04** | `verified_member` **không** là role — là **trust level** | Xác minh là thuộc tính liên tục có thể lên/xuống, không phải tư cách rời rạc | Role `verified_member` cấp khi verify email — sẽ phải thêm `verified_phone_member`, `established_member`… phình vô hạn | Kiểm bằng `@MinTrust()` đọc `users.trust_level`, không bao giờ bằng `@Roles()` | §8.1, §11 |
| **D-05** | `support` **gộp vào `moderator`** — không tồn tại role riêng | Ở quy mô GĐ1 cùng một người vừa xử lý report vừa trả lời hỗ trợ. Hai role riêng tạo hai hàng đợi mà không thêm an toàn | Role `support` chỉ đọc — sẽ phải nhân đôi mọi ô trong ma trận §9.2 mà không thay đổi kết quả | Permission `user.support.*` gán cho `moderator`; UI admin gộp hai tab | §8.1, §9.2 |
| **D-06** | `service_provider` (GĐ 2–3) **không** được thêm vào enum. Khi tới lúc, dùng `service_providers` + `provider_members(user_id, provider_id, role)` | Cùng khuôn "quan hệ theo thực thể" như `event_cohosts` — mở rộng mà không migrate phá vỡ | Chừa sẵn giá trị `service_provider` trong enum ngay từ GĐ1 — giá trị chết trong DB, mọi `switch` phải xử lý nhánh không dùng | Không có việc phải làm ở GĐ1; ghi lại để GĐ2 không tự ý mở enum | §8.1 |
| **D-07** | Thứ tự đánh giá quyền **bất biến**: trạng thái → role → quan hệ → trust | Một `admin` đang `suspended` phải bị chặn trước khi hệ thống kịp xét role; ngưỡng trust lại phụ thuộc quan hệ đã giải được (host cần T3 để xuất CSV, attendee cần T2 để xem danh sách) | Kiểm trust trước quan hệ — làm sai Đ20/Đ22 và trả sai mã lỗi cho UI | Đăng ký **cả sáu lớp ở `APP_GUARD`** theo đúng thứ tự (§13.1); test **T-3** chứng minh thứ tự | §8.2, §13.1 |
| **D-08** | Số `super_admin` đang `active` **luôn ≥ 2**; gán role chỉ `super_admin` làm được, four-eyes | Chống khoá chết (R-09) và chống một người tự nâng quyền | Cho `admin` gán role — mở đường leo thang đặc quyền nội bộ | Ràng buộc ở `UsersService.changeRole()`; bất biến **INV-3** có test; UC-73 tách đôi (§12.12, L-2) | §8.3, §9.4, §12.12 |

### 15.2 Quyết định về trust level *(MT-12)*

| Mã | Quyết định | Lý do | Phương án bị loại | Ảnh hưởng phải thực hiện |
|---|---|---|---|---|
| **D-09** (MT-12) | Thang tin cậy **duy nhất** của sản phẩm là **T0–T5**, lưu ở `users.trust_level smallint CHECK (0..5)` | Một thang, một cột, một nơi ghi. Đọc được bằng mắt trong log và trong claim JWT; ánh xạ thẳng sang badge và hạn mức | (a) **Thang điểm 0–100** — không giải thích được cho người dùng "vì sao tôi 63 điểm", và mọi ngưỡng thành con số tuỳ tiện; (b) **Enum `new`/`verified`/`established`/`trusted`/`ambassador`** — trùng lặp với thang số, tạo mâu thuẫn MT-12; (c) **Cả hai song song** — chính là hiện trạng sai đang phải sửa | Xoá mọi tham chiếu tới thang 0–100 và enum 5 nhãn khỏi toàn bộ tài liệu và code; `TrustLevel` ở `packages/shared-types` |
| **D-10** | Nhãn hiển thị cố định: **T0 New · T1 Email verified · T2 Phone verified · T3 Active member · T4 Trusted · T5 Community leader** | Nhãn mô tả **bằng chứng**, không mô tả phán xét. "Email verified" nói rõ người dùng cần làm gì tiếp; "Level 2" thì không | Nhãn cảm tính (`Bronze`/`Silver`/`Gold`) — gợi ý game hoá và tạo áp lực xã hội sai chỗ | Key i18n `trust.level.t0..t5.label`, có bản EN **và** VI; hằng số `TRUST_LEVEL_I18N_KEY` (§13.3) |
| **D-11** | Tín hiệu lưu ở **`trust_signals` (append-only)**; bậc tính lại bằng **job BullMQ `trust:recompute`**; job là **nơi duy nhất** ghi `users.trust_level` | Bậc luôn truy nguyên được về bằng chứng; sửa công thức là chạy lại job, không phải migrate dữ liệu. Tránh mọi service tự cộng trừ điểm rải rác | Cộng điểm trực tiếp vào cột mỗi khi có sự kiện — không hoàn tác được, không giải thích được, và chạy đua khi hai sự kiện đồng thời | Bảng `trust_signals` + index `(user_id, type) WHERE status='verified' AND revoked_at IS NULL`; job chạy sau mỗi domain event **và** quét toàn bộ 02:00 Asia/Ho_Chi_Minh |
| **D-12** | **T5 không bao giờ đạt được hoàn toàn tự động** — luôn cần một hành động thủ công của `admin` (`staff_endorsement`) | T5 mở hạn mức gần như không giới hạn và badge có trọng lượng xã hội thật. Cổng thủ công là hàng rào rẻ nhất chống farm trust (R-04) | Tự động hoá T5 theo ngưỡng số — biến T5 thành mục tiêu để nuôi tài khoản | Màn hình admin cấp/thu hồi `staff_endorsement` kèm lý do bắt buộc |
| **D-13** | Badge là **lớp hiển thị**, **không cấp quyền**; **không badge nào mang nghĩa tiêu cực**; số `no_show`, số lần bị báo cáo, điểm thành phần **không hiển thị công khai** | Nhãn tiêu cực công khai đẩy người dùng rời nền tảng thay vì sửa hành vi (R-13) | Hiển thị "tỉ lệ vắng mặt" trên hồ sơ như một chỉ số minh bạch — gây hiệu ứng bêu tên | Guard **không bao giờ** đọc badge; badge sinh từ `trust_level` + điều kiện phụ ở tầng hiển thị |
| **D-14** | Ngưỡng trust chỉ dùng các giá trị liệt kê ở **§12.13**; không phát minh ngưỡng mới trong PR | Ngăn permission creep theo trục trust (R-14) và giữ thông điệp nâng cấp trong UI nhất quán | Để mỗi đội tự chọn ngưỡng theo cảm tính | Test **T-4 drift** + checklist review §13.9 |

### 15.3 Quyết định về mô hình dữ liệu và phạm vi

| Mã | Quyết định | Lý do | Ảnh hưởng phải thực hiện |
|---|---|---|---|
| **D-15** (MT-03) | **RSVP gắn vào `event_occurrences`**, không gắn vào `events`. Bảng `rsvps(id, occurrence_id, user_id, status, guest_count, …)`. Sự kiện không lặp lại vẫn có **đúng 1 occurrence** | Sức chứa, waitlist, nhắc lịch và điểm danh đều là thuộc tính của **một buổi cụ thể**. Không có ngoại lệ "sự kiện đơn thì gắn vào events" — ngoại lệ đó sinh ra hai đường code cho cùng một nghiệp vụ | Endpoint chính `POST /api/v1/occurrences/{occurrenceId}/rsvps`; `EventContextResolver` phải giải `occurrenceId → event_id` trước khi kiểm quan hệ (§13.5) |
| **D-16** | `POST /api/v1/events/{eventId}/rsvps` là **đường tắt** trỏ tới occurrence sắp diễn ra gần nhất; trả **409 `AMBIGUOUS_OCCURRENCE`** nếu event có nhiều occurrence sắp tới | Giữ trải nghiệm một chạm cho sự kiện đơn mà không che giấu sự mơ hồ ở sự kiện lặp | Client bắt `409` và hiện danh sách buổi để người dùng chọn; fixture test có `EVENT_A` với 2 occurrence sắp tới |
| **D-17** | **Waitlist là MUST của MVP** — không hoãn sang bản sau | Sự kiện đông chỗ là tín hiệu tốt nhất của product-market fit; mất người ở đúng lúc đông là mất người vĩnh viễn. Waitlist còn là nguồn dữ liệu cầu vượt cung theo khu vực | UC-40 vào phạm vi M1; FIFO, cửa sổ xác nhận **12 giờ**; huỷ RSVP kích hoạt thăng hạng ngay (Đ17) |
| **D-18** | **6 khu vực MVP**: An Thượng, Mỹ Khê, Mỹ An, Hải Châu, Sơn Trà, Ngũ Hành Sơn | Đủ phủ nơi expat thực sự sống và sinh hoạt, đủ ít để bộ lọc dùng được bằng một tay trên điện thoại | `areas.is_mvp_filter = true` cho đúng 6 hàng; **không xoá, không ẩn** được (Đ46); đổi polygon cần xác nhận hai bước |
| **D-19** | Tên cột chốt là **`events.host_user_id`**; mọi nhãn enum trong DB viết **chữ thường snake_case** (`published`, `checked_in`, `no_show`) | Một quy ước duy nhất, khớp giữa DB, TypeORM entity và `packages/shared-types`; tránh sai lệch hoa/thường giữa môi trường | Test regex quét toàn bộ `pg_enum` chặn nhãn viết hoa/camelCase (§13.3) |
| **D-20** | Thời gian **lưu UTC**, hiển thị theo **Asia/Ho_Chi_Minh** | Sự kiện chỉ diễn ra ở Đà Nẵng nhưng người dùng đến từ nhiều múi giờ và hay đặt lịch khi còn ở nước ngoài | Cột `timestamptz`; ICS sinh kèm `TZID=Asia/Ho_Chi_Minh` (UC-42); cửa sổ check-in và job nhắc tính theo UTC |

### 15.4 Quyết định vận hành và đo lường

| Mã | Quyết định | Lý do | Ảnh hưởng phải thực hiện |
|---|---|---|---|
| **D-21** | Nhắc lịch đúng **hai mốc: T-24h và T-2h** | T-24h để sắp xếp lịch, T-2h để nhớ đi. Thêm mốc nữa làm phiền và làm tăng tỉ lệ tắt push | Job BullMQ đặt/huỷ theo `starts_at`; thay đổi trọng yếu ⇒ huỷ và đặt lại (Đ4); nhắc **T-2h không bị chặn** bởi khung giờ yên tĩnh (UC-53) |
| **D-22** | **SLA cho báo cáo mức `critical`: 2 giờ** | An toàn thân thể không chờ được. Đây cũng là ngưỡng khả thi với 1–2 moderator ở M1 nếu có cảnh báo đẩy | Cảnh báo `critical` vào kênh trực, không chỉ nằm trong hàng đợi; UC-76 giám sát độ trễ hàng đợi; là lý do `moderator` phải bắt buộc 2FA |
| **D-23** | Mục tiêu **WCA tại M6: 220–280 lượt/tuần** | Con số phản ánh quy mô thực tế của cộng đồng expat Đà Nẵng ở giai đoạn đầu và kiểm chứng được bằng dữ liệu tham dự thật | Dashboard UC-71 theo dõi theo tuần; **không** dùng con số 550 ở bất kỳ tài liệu hay báo cáo nào |
| **D-24** | Gate M6 đo bằng **dòng chảy**, không đo tồn kho: **≥ 25 sự kiện đang mở mới mỗi tuần** và **không khu vực MVP nào bằng 0** | Tồn kho lớn có thể toàn sự kiện cũ hoặc dồn vào một khu vực; dòng chảy đo đúng sức sống nguồn cung và độ phủ địa lý | Truy vấn dashboard tính theo tuần và theo `area`; **không** dùng chỉ tiêu "≥ 80 sự kiện" |
| **D-25** | Mọi hành động của `curator`/`moderator`/`admin`/`super_admin` trên dữ liệu người khác ghi **`audit_log` bất biến**; truy cập PII bắt buộc kèm `moderation_case_id` hoặc `support_ticket_id` | Nguyên tắc P5 và là điều kiện để mở role cho tình nguyện viên cộng đồng từ M4 (R-03) | Decorator `@Audit()`; DB role ứng dụng bị thu hồi `UPDATE, DELETE` trên `audit_log`; bất biến **INV-2** có test |
| **D-26** | Danh tính cá nhân của `moderator` **không bao giờ** hiển thị công khai — mọi thông báo kiểm duyệt ký tên "Da Nang Connect Moderation Team" | Yêu cầu bắt buộc của persona P6; không có nó thì không tuyển được moderator tình nguyện | `moderation_action.actor_id` chỉ `admin`/`super_admin` xem được; badge `moderation_team` chỉ hiện trong khu vực admin |

### 15.5 Quyết định pháp lý liên quan phân quyền

| Mã | Quyết định | Ghi chú |
|---|---|---|
| **D-27** | Nêu **cả** Nghị định 13/2023/NĐ-CP **và** Luật Bảo vệ dữ liệu cá nhân **91/2025/QH15** trong mọi tài liệu tuân thủ; ghi rõ **từ 01/01/2026 Luật 91/2025 là văn bản hiệu lực cao hơn**, và **mọi mẫu biểu phải theo Luật 91/2025** | **CẦN LUẬT SƯ XÁC NHẬN** — chi tiết ở `06-phap-ly-va-tuan-thu-viet-nam.md` |
| **D-28** | Quyền `user.anonymize`, `content.purge` và mọi thao tác thực thi quyền của chủ thể dữ liệu chỉ nằm ở **`super_admin`** | Gắn với nghĩa vụ theo Luật 91/2025; ẩn danh hoá giữ lại bản ghi tham gia ở dạng không định danh để không phá vỡ số liệu lịch sử và hồ sơ an toàn của người khác. **CẦN LUẬT SƯ XÁC NHẬN** |
| **D-29** | Người ngoài tổ chức (moderator tình nguyện từ M4) **chưa được** chạm PII cho tới khi có thoả thuận xử lý dữ liệu theo Luật 91/2025 | Chốt tạm thời cho tới khi Q-01 được trả lời; hàng đợi kiểm duyệt cho tình nguyện viên **che PII mặc định**. **CẦN LUẬT SƯ XÁC NHẬN** |

### 15.6 Những gì **chưa** chốt

Danh sách này tồn tại để không ai nhầm "chưa nói tới" thành "đã đồng ý ngầm". Mỗi mục trỏ tới câu hỏi ở §14.4.

| Chủ đề | Trạng thái | Câu hỏi | Ai chặn ai |
|---|---|---|---|
| Organization profile (nhiều user ↔ một tổ chức) | Chỉ chừa chỗ ở `events.host_type`, **chưa xây** | Q-03 | Chặn thiết kế màn hình tạo sự kiện cho persona P4 |
| Ngưỡng cờ vàng `trust:fraud_scan` | Job có trong kế hoạch, **ngưỡng chưa có** | Q-04 | Chặn bật job ở production |
| `user.impersonate.readonly` ở MVP | **Chưa quyết bật hay tắt** | Q-06 | Chặn ước lượng công việc màn hình admin |
| Quy trình break-glass `super_admin` | **Chưa viết** | Q-07 | Chặn go-live M1 |
| Ngưỡng k-anonymity analytics | Đề xuất k = 5, **chưa xác nhận** | Q-08 | Chặn phát hành UC-72 |
| Host chặn user cụ thể RSVP | **Chưa có trong ma trận §9.2** | Q-09 | Chặn xử lý sự cố an toàn kiểu "người quấy rối quay lại" |
| Ranh giới sự kiện có thu phí | **Chưa có tiêu chí kiểm duyệt** | Q-10 | Chặn viết hướng dẫn cho moderator |
| Luồng `admin` đề xuất → `super_admin` duyệt role | **Chưa quyết xây hay bỏ** | Q-11 | Chặn thiết kế UC-73 |
| Hạ trust level thủ công bởi `admin` | **Chưa cho phép** (mặc định là không) | Q-12 | — |

### 15.7 Nhật ký quyết định

| Ngày | Bản | Nội dung |
|---|---|---|
| 2026-08-31 | 1.0 | Chốt D-01 → D-29. Giải quyết MT-02 (enum role 5 giá trị), MT-03 (RSVP gắn `event_occurrences`), MT-12 (thang trust duy nhất T0–T5). Thống nhất tên guard/decorator: `JwtAuthGuard`, `AccountStatusGuard`, `RolesGuard`, `EventOwnershipGuard`, `TrustTierGuard`, `@Roles()`, `@MinTrust()`, `@EventContext()`, `@RequireEventRole()` |

---

*Hết tài liệu 01. Tài liệu tiếp theo: `02-use-case.md` (đặc tả luồng use case) và `03-domain-va-du-lieu.md` (lược đồ dữ liệu chi tiết).*
