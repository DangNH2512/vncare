# Nghiệm thu nghiệp vụ — moderation-core (BA Agent, 26/09/2026, bước 8 L8)

**Đầu vào:** `brief.md` (AC-1…AC-48), `task-board.md` (D1–D16, §5.5, T-API-6), `code-review.md` (CR-1…CR-12),
`test-report.md` (TR-1…TR-6, ma trận 43/48).
**Hiện trạng coordinator báo:** mọi lane code xong; CR major/minor đã sửa; TR-1, TR-3 đã đóng; typecheck sạch;
79/79 unit xanh; 43/48 AC có test (5 AC còn lại chỉ có UI); **chưa chạy e2e nào** (không có Docker), **chưa mở trình duyệt**.
**BA đã tự kiểm:** TR-1 (`ticket-actions.ts:130-132` coi hạn khoá đã qua như `active`), TR-3 (`ModerationNote` đếm
code point), nhánh dedupe của CR-6 (`report.service.ts:55-60`). Các kết luận khác lấy từ tài liệu review/test,
**không** phải từ quan sát app thật (observe-reality) → mọi verdict dưới đây là có điều kiện.

---

## 1. Quyết định nghiệp vụ

### Q-A1 — CR-7 / TR-2: mở hội thoại direct khi có chặn
**Quyết định:** chọn **phương án (c)**, kết hợp (a) với luật "bên kia coi như không tồn tại" ở §6 brief:
- Cặp có chặn và **đã có** hội thoại direct → `POST /conversations` trả **201** với hội thoại cũ, giống cặp đã bị
  từ chối. Gửi tin → **403 `CONVERSATION_REQUEST_REFUSED`**, giống cặp declined (giữ nguyên như hiện nay).
- Cặp có chặn và **chưa có** hội thoại → trả **đúng response của việc mở hội thoại với một user id không tồn tại /
  đã xoá** (cùng status, `code`, `messageKey`, từng byte). Không tạo dòng `conversations` nào.
- Trình tự lỗi giữ như cũ: tự nhắn mình → trust thấp → chặn.

**Lý do:**
- AC-17 là bất biến riêng tư: chặn phải im lặng (doc 05 §13.7 "không lỗi khác thường"). AC-13 chỉ cần chặn được
  việc nhắn tin, và bước gửi đã chặn cả hai chiều.
- Phương án (a) nguyên bản buộc phải tạo hội thoại "ảo" cho cặp bị chặn. Khi đó người chặn sẽ thấy một lời mời
  từ người mình đã chặn, tức là đúng thứ mà chặn phải ngăn.
- Phương án (b) vẫn lộ: một cặp chưa từng nói chuyện mà bị 403 thì chỉ có thể là do chặn.
- Phương án (c) nhất quán với hồ sơ công khai: B đã thấy `/profiles/A` trả 404, nên mở DM cũng "không tìm thấy"
  không cho B thêm thông tin gì.

**Sửa brief:** AC-13 phần DM đổi thành "mở hội thoại theo (c); gửi tin trong hội thoại direct → 403
`CONVERSATION_REQUEST_REFUSED`, cả hai chiều".

**Task card FU-1 (trước merge):**
- Owner: backend-agent #2.
- File: `chat.service.ts` (`openDirect`), `block.e2e.spec.ts` (sửa ca "direct messages: no new thread…" theo
  quyết định này).
- Nếu hiện nay user id không tồn tại chưa trả một 404 ổn định (lỗi FK bị dịch thành mã khác) thì chuẩn hoá luôn
  thành một 404 cố định.
- Test: hai chiều × {có hội thoại, chưa có hội thoại}. So body với id không tồn tại. Kiểm người chặn **không**
  thấy hội thoại hay lời mời mới nào.

### Q-A2 — TR-6: chat nhóm của sự kiện bị tạm gỡ / gỡ vẫn dùng được
**Quyết định:** **yêu cầu sửa**. Không chặn merge, nhưng **chặn việc đóng M4** và phải xong **trước khi có người
dùng thật (beta L10)**.

**Lý do:**
- Brief §4 chỉ loại *lọc chặn* trong group chat. Hiệu lực của việc gỡ sự kiện thì nằm trong §9: sự kiện gỡ phải
  "biến mất với mọi người trừ organizer và staff".
- Kẻ lừa đảo (thường chính là organizer) vẫn nhắn được cho nạn nhân trong phòng. Như vậy S5-Demo-2 mất tác dụng
  thật.
- Chấp nhận tạm cho merge vì web chưa có UI chat, chưa có người dùng thật, và phải đi qua API mới khai thác được.

**Task card FU-2:**
- Owner: backend-agent (chat), test lane integration.
- Với phòng `event_group` của sự kiện **không `published`** theo luật `eventVisibleTo`:
  - tham gia → 404 như phòng không tồn tại;
  - gửi tin → từ chối với **mọi người, kể cả organizer** (chỉ đọc);
  - người đã vào phòng vẫn đọc được lịch sử (giữ bằng chứng).
- Khôi phục sự kiện → phòng mở lại.
- e2e: gỡ → join/gửi bị từ chối; khôi phục → gửi được.

### Q-A3 — CR-1: người bị chặn báo cáo đồ của người đã chặn mình
**Quyết định:** **xác nhận** hành vi hiện tại.
- A chặn B → B báo cáo nội dung hoặc tài khoản của A nhận **404** giống hệt id không tồn tại.
- A vẫn báo cáo được B (AC-7 giữ nguyên).
- Đây là biên bản Debate Gate mà test-report §4 còn thiếu.

**Lý do:**
- Trong đa số ca, người chặn là bên dễ tổn thương. Lộ cho người bị chặn biết mình bị chặn có thể đẩy quấy rối
  sang ngoài đời (V-04 đeo bám).
- B vốn không thấy đồ nào của A sau khi bị chặn, nên không mất kênh báo cáo cho nội dung B đang nhìn thấy.

**Rủi ro còn lại (ghi nhận):** kẻ quấy rối chặn nạn nhân trước để nạn nhân không báo cáo được mình. Brief không có
kênh thay thế.

**Task card FU-3 (backlog, sau M4):**
- Owner: ba-agent viết story → tech-lead.
- Story: "báo cáo người tôi không còn thấy được". Form nhận handle hoặc mô tả tự do, **luôn trả 201** bất kể
  đối tượng có tồn tại hay không (không thành oracle), vào hàng đợi để moderator tra tay.
- Có thể gộp với trang hỗ trợ trong Community Guidelines (E8-S5).

### Q-A4 — CR-6: báo cáo lại với lý do nặng hơn
**Quyết định:** hành vi hiện tại **chưa chấp nhận được**. Phải sửa **trước khi đóng M4**.

**Lý do:**
- Code chỉ nâng mức ticket (`raiseTicket`). Lý do mới **và** mô tả mới của người báo cáo bị bỏ, không có dòng nào
  giải thích vì sao ticket lên P0.
- Moderator thấy một ticket P0 ghi lý do "spam", rất dễ hạ mức vì tưởng xếp nhầm. Chi tiết đe doạ, đúng thứ
  cần xử lý trong 2 giờ, thì đã mất.
- Tinh thần AC-5 là chống trùng lặp, không phải nuốt thông tin mới.

**Luật mới (sửa AC-5):**
- Cùng người báo cáo, cùng đối tượng, lý do **cùng mức hoặc nhẹ hơn** report đang mở → giữ nguyên AC-5 (trả report
  cũ, không tạo dòng mới, không trừ hạn mức).
- Lý do **nặng hơn hẳn** → tạo **report mới** trong cùng ticket, với lý do, mô tả và snapshot riêng. Report này
  tính vào hạn mức như bình thường. Ticket nâng mức và rút hạn theo §7. Console hiện cả hai lý do (AC-27 đã hiển
  thị danh sách lý do). Số *người* báo cáo không tăng.

**Task card FU-4:**
- Owner: backend-agent #1.
- File: `report.service.ts`, `report.e2e.spec.ts` (sửa ca "a graver reason… (CR-6)").
- Kiểm: 2 dòng report, ticket P0, hạn T+3h, detail có hai lý do, `reporters` không lặp người.

### Q-A5 — BE-2: bình luận trên bài bị ẩn; organizer không quản lý được bình luận cũ của người bị chặn
**(a) `GET /comments/:id` đọc được bình luận trên bài đã bị ẩn**
- **Quyết định:** **yêu cầu sửa**, ưu tiên P3, **trước khi đóng M4**.
- **Lý do:** bài lừa đảo bị ẩn, nhưng bình luận bên dưới có thể chứa số tài khoản hoặc liên hệ. CR-2 đã sửa đúng
  lỗ này cho sự kiện, còn luồng bài đăng thì chưa. Mức độ thấp vì phải biết id (UUIDv7, không đoán được).
- **FU-5:**
  - Owner: backend-agent #2.
  - `commentThreadVisibleTo` phía bài đăng áp cùng luật hiển thị bài: `visible`, hoặc viewer là tác giả bài;
    cộng thêm luật chặn.
  - Thêm assert vào AC-31: bài ẩn → `GET /comments/:id` của người thứ ba trả 404 như id không tồn tại.

**(b) Khi đang chặn, organizer không xoá/ghim được bình luận cũ của bên kia trên sự kiện của mình**
- **Quyết định:** **chấp nhận cho v1.**
- **Lý do:**
  - Đó là hệ quả trực tiếp của "chặn là bộ lọc cá nhân hai chiều" (§6).
  - Organizer vẫn còn hai đường: báo cáo tài khoản B (AC-7) để moderator ẩn bình luận, hoặc tạm bỏ chặn để tự xoá.
  - Quyền ẩn bình luận của host (Đ36) cũng chưa có trong phạm vi.
- **FU-6 (backlog):**
  - Owner: ba-agent → tech-lead.
  - Story "host quản lý luồng bình luận của sự kiện mình" (Đ36). Trong story đó, luật chặn không che bình luận
    khỏi **công cụ quản lý** của host; nó chỉ che trong phần hiển thị.

### Q-A6 — CR-3: chặn / báo cáo tài khoản đang bị khoá
**Quyết định:** **xác nhận**, không mâu thuẫn brief.

**Lý do:**
- Brief §17 và §9: kết quả kiểm duyệt không công khai, và hồ sơ người bị khoá vẫn hiển thị. Vì vậy chặn → 204 và
  báo cáo → 201 là đúng. Trả 404 mới là lộ trạng thái.
- AC-16 "user không tồn tại → 404" được hiểu là không tồn tại **hoặc đã xoá**. Tài khoản `suspended`,
  `deactivated`, `pending` vẫn là user tồn tại.
- Có thêm lợi ích an toàn: nạn nhân chặn được kẻ quấy rối trong lúc kẻ đó đang bị khoá, trước khi hết hạn khoá.

Không cần task card. Chỉ cần sửa câu chữ dòng E2 ở task board §4 cho khớp (orchestrator).

---

## 2. Verdict theo story

| Story | Verdict | Căn cứ | Điều kiện riêng |
|---|---|---|---|
| **E8-S1** Báo cáo | **Pass có điều kiện** | AC-1, 2, 4–7, 9–11 có e2e với assert đúng AC (đọc code). Chấp nhận hoãn nút trên bình luận ở web (D16, web chưa có UI bình luận; API đã phủ). | FU-4 (CR-6). Screen EN/VI cho AC-3 (12 lý do, khối 113/115), AC-4 (ô chặn mặc định), AC-8 (offline + Thử lại), thông báo 429. Video M4-1. |
| **E8-S2** Chặn | **Pass có điều kiện** | Ma trận hai chiều AC-13 đủ mọi dòng §6; AC-14–18, AC-20 có test. | **FU-1 trước merge** (CR-7). Screen AC-19. Bổ sung nhỏ: kiểm lại feed `GET /posts` sau khi bỏ chặn (test-report AC-16). Bằng chứng M4-2 (test 2 tài khoản chạy xanh). |
| **E8-S3** Bảng report | **Pass có điều kiện** | AC-21–27, 29 có test API + domain; TR-1 đã đóng (BA đã kiểm). | Screen: ba trạng thái SLA có nhãn chữ và màu (AC-23 UI), AC-28 (lỗi + Thử lại), AC-48 (đổi giờ máy không đổi hạn), curator không có menu. Ảnh giao diện M4-3. Founder xác nhận Q2 (chưa có kênh báo P0: Founder trực tay, TG-M4-2). |
| **E8-S4** Hành động moderator | **Pass có điều kiện** | AC-30–41 có test; nguyên tử action + moderation_actions + audit (AC-43); trigger bất biến (AC-40). Chấp nhận hoãn nhãn my-events (D16) và thông báo huỷ (E7). | FU-2 (TR-6), FU-5 (BE-2a) trước khi đóng M4. Bằng chứng SQL M4-4 (test-report §6 bước 8). Rủi ro chấp nhận: access token 15 phút sau khi khoá; `restore_event` luôn về `published`. |
| **E9-S1** Audit log | **Pass có điều kiện** | AC-42–46 có test; phạm vi xem theo role (Đ49–Đ51); không route sửa/xoá. | `next build` web-admin (CR-9). Screen trang Audit log (lọc, phân trang, không nút sửa/xoá, moderator chỉ thấy của mình). |

Không story nào **fail**, cũng không story nào **pass** trọn: chưa có hành vi nào được quan sát chạy thật.

## 3. Điều kiện còn treo

**Trước merge:**
1. FU-1 (CR-7) xong, e2e mới xanh.
2. Chạy đủ test-report §6 bước 0–7 trên máy có Docker, Node ≥ 24, pnpm: áp 0009, kiểm superuser, clean-test,
   unit thật, typecheck, **e2e toàn API xanh hai lần liên tiếp**, teardown về 0. Nếu gặp 40P01 thì chạy riêng nhóm
   moderation (TR-4).
3. `next build` + typecheck cho web-admin và web-client, `pnpm lint` (bước 10). Dán `EXPLAIN` của T-API-6 (bước 9).
4. TV1 review các thay đổi ở `packages/**`.

**Trước khi đóng M4 (sign-off):**

5. Làm xong FU-2 (TR-6), FU-4 (CR-6), FU-5 (BE-2a), mỗi cái có e2e xanh.
6. Lane screen EN + VI cho hai web (test-report §6 bước 11), gồm 5 AC chỉ có UI: AC-3, 8, 19, 28, 48, cùng phần
   UI của 14 AC chỉ có test API. Có ảnh hoặc video hợp lệ.
7. Bằng chứng checklist:
   - video M4-1 (Founder là người thứ hai xác nhận);
   - test 2 tài khoản M4-2;
   - ảnh M4-3 (đồng hồ đếm ngược P0);
   - truy vấn SQL M4-4;
   - diễn tập S5-Demo-1 và S5-Demo-2 trên web. Phần thông báo cho người đã RSVP được ghi là phụ thuộc E7.
8. **Founder ký:**
   - Q1: giữ quy tắc "không tự ẩn khi P0";
   - Q2: trực P0 thủ công tới khi có E7 hoặc email tạm (TG-M4-2);
   - Q8: mâu thuẫn tài liệu (doc 05, doc 08, checklist);
   - chấp nhận các rủi ro còn lại: access token 15 phút, FU-3 (kẻ quấy rối chặn trước), `restore_event` về
     `published`, snapshot chứa PII chờ luật sư.
9. BA đối chiếu lần cuối sau bước 5–7: mở app thật, đi luồng A báo cáo → M gỡ → B bị chặn.

**Backlog (không chặn M4):**
- FU-3 (báo cáo người không còn thấy được).
- FU-6 (host quản lý bình luận, Đ36).
- CR-11 (cursor `me/blocks`), CR-12 (định dạng thời gian trong audit hệ thống).
- Sweeper job hết hạn khoá; `AccountStatusGuard` per-request.

## Agent Output
Status: needs-review
Files changed: `.agent/specs/_changes/moderation-core/acceptance.md` (file này). Không sửa code.
Files read: `brief.md`, `task-board.md` (§1, §5.5, T-API-6, §7–8), `code-review.md`, `test-report.md`,
`apps/api/src/modules/chat/{chat.service,chat.repository}.ts`, `apps/api/src/modules/report/report.service.ts`,
`apps/web-admin-side/app/_components/moderation/ticket-actions.ts`, `packages/contracts/src/moderation.ts`.
Test evidence: chỉ rà soát nghiệp vụ và đọc code; không chạy app, không chạy e2e.
