---
trigger: always_on
description: Quy tắc hành vi lõi — luôn nạp cho mọi phiên làm việc trên Da Nang Connect.
---

# Quy Tắc Hành Vi Của Agent

Hợp đồng thực thi luôn bật. Tối ưu cho việc làm đúng với ít context nhất: đọc file
này, rút ra hợp đồng của yêu cầu, rồi chỉ nạp đúng tài liệu/code mà task cần. Ví
dụ và mẫu được nhúng ngay tại chỗ khi đủ ngắn.

---

## B0 — Nhận yêu cầu và nạp context

- Trước hết rút ra hợp đồng của yêu cầu: mục tiêu, bề mặt đích, file/lỗi/ảnh chụp
  được nhắc, môi trường, ràng buộc, đầu ra mong đợi, và chỉ thị mới nhất.
- Thứ tự ưu tiên nguồn: yêu cầu mới nhất > code/config/env hiện tại > tài liệu
  hiện tại > memory của phiên. Coi tài liệu cũ và memory là gợi ý, không phải sự thật.
- Nếu người dùng chỉ hỏi, trả lời thẳng. Nếu sẽ sửa file, cập nhật
  `.agent/memory/ACTIVE_TASKS.md`, đọc `planning-and-agent-mode.md`, rồi áp
  `skill-triggers.md`.
- Quét kho skill là bắt buộc ở mọi task, không chỉ khi có từ khoá: `skill-first.md`
  §S1 — đọc `SKILL.md` của mọi skill khớp và tuyên bố danh sách áp dụng trước khi
  chạm file đầu tiên.
- Nạp context tối thiểu: file được nhắc đích danh trước, rồi phụ thuộc trực tiếp,
  rồi tài liệu riêng cho task. Không đọc ồ ạt tài liệu không liên quan.
- Với ảnh chụp / lỗi / log, mở đúng file, route, lệnh hoặc log path trước khi đi
  tìm rộng.
- Phân loại công việc: `bug | small | medium | large | future plan`. Mặc định
  single-agent; chỉ dùng multi-agent khi người dùng yêu cầu rõ hoặc thật sự cần
  vượt ranh giới service.
- Ưu tiên `rg` / `rg --files` để tìm kiếm. Chỉ dừng lại hỏi khi thông tin bắt buộc
  không thể tìm được tại chỗ và đoán bừa là rủi ro.

Mẫu hợp đồng yêu cầu (rút ra trong đầu, không cần viết ra):

```text
Goal:
Target surface: apps/api | apps/web-client-side | apps/web-admin-side | apps/mobile | packages/* | ops | docs | .agent
Mentioned files/routes/errors/screens:
Environment: local | Docker | staging | production | unknown
Constraints:
Expected output: code change | giải thích | tài liệu | khuyến nghị | verification
Newest instruction override:
```

---

## B1 — Đọc trước khi chẩn đoán

Trước khi debug hay sửa:

- Không dựa vào trí nhớ từ phiên trước.
- Đọc lại tươi component/controller/service/repository/hook bị ảnh hưởng.
- Truy vết chuỗi gọi thật trong code trước khi kết luận nguyên nhân gốc.
- Với bug, tái hiện hoặc soi đúng đường thất bại được quan sát trước khi sửa.

Sai: "Tôi nhớ endpoint này trả về X."
Đúng: đọc controller -> service -> repository/client -> rồi mới sửa.

---

## B2 — Phạm vi và cổng phê duyệt

- Bug: nêu nguyên nhân gốc + hướng sửa sau khi đọc code, rồi sửa, trừ khi rủi ro leo thang.
- Small: nói ngắn gọn định sửa gì, rồi làm.
- Medium: đưa kế hoạch cô đọng, rồi làm tiếp trừ khi người dùng chặn.
- Large, phá vỡ public API, đổi schema DB, hoặc chạm component dùng chung ở nhiều
  màn: dừng chờ phê duyệt rõ ràng.
- Nếu phạm vi phình thêm 2+ file hoặc vượt ranh giới api/web/mobile/DB giữa chừng,
  báo người dùng trước khi đi tiếp.
- Việc "để sau" thì viết vào tài liệu kế hoạch tương lai; không code.

---

## B3 — Tái sử dụng trước khi tạo mới

Trước khi thêm bất kỳ function, hook, component, service, DTO hay lớp trừu tượng nào:

- Tìm pattern hoặc helper sẵn có trong repo — kể cả trong `packages/ui`,
  `packages/validation`, `packages/shared-types`.
- Mở rộng code sẵn có khi vẫn giữ được hành vi và quyền sở hữu.
- Chỉ thêm trừu tượng mới khi nó loại bỏ trùng lặp thật, cô lập một phụ thuộc bên
  ngoài, hỗ trợ các biến thể đã biết, hoặc khớp với pattern đã có.
- Backend: dùng DI/interface/strategy/policy object cho các biến thể hành vi thật.
- Frontend: dùng composition, hook, provider, adapter có kiểu, config map. Không
  dùng kế thừa component.
- **Không tự viết lại client HTTP**: web và mobile gọi API qua `packages/api-client`
  sinh từ OpenAPI.

---

## B4 — Cổng kích thước file và bề mặt dùng chung

Trước khi sửa, kiểm tra kích thước bằng `wc -l`.

- File component/page > 500 dòng: tạo task tách file trước.
- File service > 300 dòng: đánh giá tách trách nhiệm trước.
- Có sửa component/hook/utility dùng chung: tìm mọi nơi tiêu thụ bằng `rg`, rồi
  kiểm tra từng bề mặt bị ảnh hưởng (web + mobile, không chỉ một bên).
- Refactor phải giữ nguyên hành vi vào/ra, trừ khi người dùng yêu cầu đổi hành vi.

---

## B5 — Backend: không thương lượng

- Service không được truy vấn PostgreSQL trực tiếp. Mọi truy cập dữ liệu đi qua
  repository, kể cả SQL PostGIS thô.
- Đổi schema phải có migration, không sửa DB bằng tay.
- Mọi hành động kiểm duyệt/cưỡng chế (ẩn, gỡ, khoá, cảnh cáo, khôi phục) phải ghi
  `moderation_audit_log` trong cùng transaction.
- Endpoint mới/đổi phải có DTO validation và Swagger decorator; sinh lại
  `packages/api-client` sau khi đổi contract.
- Giữ hợp đồng REST ổn định; báo trước khi đổi phá vỡ field request/response.
- Dùng soft delete (`deleted_at`) cho thực thể người dùng nhìn thấy.
- Giữ ranh giới module: controller -> service -> repository/infra; module nền tảng
  không import ngược module miền.
- Thời gian lưu `timestamptz` theo UTC; quy đổi hiển thị ở tầng trình bày.
- Kiểm tra tier tin cậy và rate limit ở API layer, không dựa vào việc UI ẩn nút.

---

## B6 — Frontend: không thương lượng

- Mọi text người dùng thấy đi qua i18n (`t('key')`); `packages/i18n/en.json` và
  `packages/i18n/vi.json` luôn đổi cùng nhau. **Tiếng Anh là ngôn ngữ mặc định**,
  tiếng Việt là ngôn ngữ thứ hai.
- Nút chỉ có icon hoặc điều khiển không rõ nghĩa phải có tooltip.
- Ngày giờ dùng tiện ích chung của dự án, không tự format ad hoc; mặc định hiển
  thị theo `Asia/Ho_Chi_Minh` và tôn trọng timezone người dùng đã đặt.
- Gọi API qua `packages/api-client`, không `fetch` thẳng rải rác.
- Web dùng react-leaflet, mobile dùng react-native-maps — không nhân bản logic bản
  đồ, đẩy phần dùng chung xuống `packages/`.
- Thay đổi UI phải được xác minh bằng luồng thật (browser cho web, simulator cho
  mobile) khi khả thi.
- Sửa UI dùng chung phải kiểm tra chéo các bề mặt tiêu thụ.

---

## B7 — Bảo mật và bí mật

- Không nới lỏng auth để local chạy cho qua.
- Giữ nguyên luồng: JWT access + refresh có xoay vòng và phát hiện tái sử dụng
  token, social login Google/Apple/Facebook.
- Giữ guard theo role (`member` | `curator` | `moderator` | `admin`), theo quyền
  sở hữu tài nguyên, và theo tier tin cậy trên các tài nguyên được bảo vệ.
- Không bao giờ commit hay ghi vào tài liệu secret thật, mật khẩu, token, private
  key, hoặc thông tin DB production.
- Thay đổi chạm auth, thanh toán (giai đoạn sau), RSVP, kiểm duyệt, hoặc dữ liệu
  cá nhân phải xác minh trọn đường request.
- Dữ liệu cá nhân chỉ xử lý khi có mục đích rõ ràng và có đồng ý của người dùng:
  không log PII thô, tôn trọng yêu cầu xoá và rút lại đồng ý.

---

## B8 — Đồng bộ tài liệu

Nếu thay đổi code làm lệch kiến trúc hoặc hợp đồng, cập nhật tài liệu ngay trong
cùng task.

| Thay đổi | Cập nhật |
|---|---|
| Endpoint / hợp đồng API | `README.md`, `docs/analysis/04-tech-stack-va-kien-truc.md` |
| Schema DB | `docs/analysis/03-domain-va-du-lieu.md` |
| Vai trò, phân quyền, tier tin cậy | `docs/analysis/01-tac-nhan-va-phan-quyen.md` |
| Kiểm duyệt, an toàn cộng đồng | `docs/analysis/05-trust-safety-va-kiem-duyet.md` |
| Docker / deploy / topology server | `ops/**` + `docs/analysis/04-tech-stack-va-kien-truc.md` |
| Tech stack / runtime | `README.md` |

Không thêm nhiễu kiểu changelog. Thay thẳng nội dung đã cũ.

---

## B9 — Xác minh trước khi báo done

Chạy bộ kiểm tra nhỏ nhất mà có ý nghĩa cho bề mặt vừa chạm, và **đọc output**.

- `apps/api`: `pnpm --filter @dnc/api typecheck`, thêm test/build khi rủi ro đáng.
- `apps/web-client-side`: `pnpm --filter @dnc/web-client typecheck` + lint/build,
  Playwright cho luồng browser vừa chạm khi khả thi.
- `apps/web-admin-side`: `pnpm --filter @dnc/web-admin typecheck` + lint/build,
  Playwright cho luồng vận hành vừa chạm khi khả thi.
- `apps/mobile`: chỉ chạy script Expo/EAS/typecheck nếu thực sự có trong
  `package.json`; kiểm tra trên simulator khi đổi hành vi.
- `packages/*`: build package và ít nhất một app tiêu thụ.
- Docker/deploy: kiểm tra cú pháp/cấu hình cộng health check/request thật khi được.
- Nếu không chạy được một check nào đó, nói rõ vì sao.

Không bao giờ báo done chỉ dựa trên đọc code khi hành vi runtime đã thay đổi.

---

## B11 — Kiểm chứng trước khi khuyến nghị

Khi context trước đó (memory, tài liệu, comment, tin nhắn cũ) nhắc tên một file,
function, type, biến môi trường, cờ, hay endpoint:

- Grep đúng tên đó trước khi khuyến nghị, gọi, hoặc khẳng định nó tồn tại.
- Nếu grep ra 0 kết quả, coi tham chiếu đó là cũ — điều tra hoặc hỏi, đừng bịa chữ ký.
- Áp dụng đặc biệt khi làm việc từ memory, khi nhận lại task đang dở, hoặc sau khi
  context đã dài.
- Không xâu chuỗi các lời gọi dựa trên một mắt xích giữa chưa được kiểm chứng.

Sai: "Tôi sẽ gọi `moderationAuditLog.record()`" mà không kiểm tra method có tồn tại.
Đúng: `rg "record\(" apps/api/src/modules/moderation/` → xác nhận chữ ký → rồi gọi.

---

## B12 — Sửa tối thiểu đủ dùng

Đổi đơn vị nhỏ nhất giải quyết được yêu cầu.

- Chỉ chạm file và dòng mà yêu cầu bắt buộc phải chạm.
- Không đổi tên, format lại, hay refactor tiện tay. Không "dọn dẹp" nếu người dùng
  không yêu cầu.
- Nếu cần dọn rộng hơn, nêu thành việc theo sau khi bản sửa tối thiểu đã vào — không gộp.
- Để yên import, comment, header và khoảng trắng không liên quan.
- Giữ pattern sẵn có kể cả khi ngay bên cạnh có pattern "đẹp hơn" — refactor là task riêng.

Sai: sửa bug trong `rsvp.service.ts` nhưng tiện tay đổi tên 3 biến và sắp xếp lại
toàn bộ import của file.
Đúng: chỉ sửa nhánh đang hỏng; ghi chú ý tưởng đổi tên như một việc theo sau.

---

## B10 — Báo cáo cuối

Giữ câu trả lời cuối ngắn và cụ thể:

- Đã đổi gì.
- Nguyên nhân gốc (với bug).
- Đã xác minh thế nào và kết quả ra sao.
- Rủi ro còn lại hoặc việc theo sau.

Mẫu báo cáo cuối:

```text
[Tên task] done.

Root cause: [chỉ với bug]

Changed:
- file-a: đổi gì và vì sao
- file-b: đổi gì và vì sao

Verification:
- lệnh/check: kết quả

Watch out: [rủi ro còn lại hoặc việc theo sau, nếu có]
```

Ngoài ra cập nhật `.agent/memory/ACTIVE_TASKS.md` sang `done` và chạy cập nhật
context cuối phiên trước khi kết thúc việc triển khai.

---

## Checklist nhanh

Trước khi sửa:

- [ ] Đã rút ra hợp đồng yêu cầu và tôn trọng chỉ thị mới nhất.
- [ ] Đã theo thứ tự ưu tiên nguồn: yêu cầu > code/config/env > tài liệu > memory.
- [ ] Đã mở đúng file/lỗi/ảnh chụp được nhắc trước tiên.
- [ ] Chỉ nạp tài liệu trigger liên quan.
- [ ] Đã phân loại task và nạp rule/skill cần thiết.
- [ ] Đã đọc lại file thật, tươi.
- [ ] Đã tìm code tái sử dụng được.
- [ ] Đã kiểm tra kích thước file và rủi ro với nơi tiêu thụ dùng chung.
- [ ] Đã qua cổng phê duyệt nếu large/breaking/schema/dùng chung.

Trước khi kết thúc:

- [ ] Đã chạy verification liên quan và đọc output.
- [ ] Đã kiểm tra luồng thật khi hành vi UI thay đổi.
- [ ] Đã xử lý audit log, i18n, timezone, Swagger, migration và đồng bộ tài liệu ở
      những chỗ áp dụng.
- [ ] Đã cập nhật `.agent/memory/ACTIVE_TASKS.md` và context phiên.
