# Hồ sơ pháp lý — `ops/legal/`

**Dự án:** Da Nang Connect · **Tạo bởi:** T-TL-01 (checklist M0) · **Ngày:** 19/09/2026 · **Sở hữu:** Dev 1 (cấu trúc), Founder (nội dung)

Nơi đặt các hồ sơ pháp lý và tuân thủ **được phép nằm trong repo**. Mọi hồ sơ khác có chỗ ghi ở §3.

---

## 1. Quy tắc số một: repo này đang public

Repo `DangNH2512/vncare` đang để **công khai** (kiểm ngày 19/09/2026). Thứ gì đã commit coi như đã công bố vĩnh viễn: xoá bằng một commit sau không gỡ được nó khỏi lịch sử.

Vì vậy thư mục này **chỉ chứa thứ đằng nào cũng công bố**:

- Bản nháp văn bản chính sách sẽ đăng công khai: Điều khoản, Chính sách quyền riêng tư, Quy tắc cộng đồng, thông báo xin đồng ý, disclaimer.
- Sổ đăng ký xử lý dữ liệu viết ở mức mô tả chung (loại dữ liệu, mục đích, tên role), không có dữ liệu người dùng.
- Ảnh kiểm thử bản đồ chủ quyền.

File `.gitignore` ở đây là **danh sách cho phép**: chỉ `.md`, `.gitkeep` và ảnh `.png` / `.webp` trong `map-audit/` được theo dõi. Mọi đuôi khác (PDF, Word, Excel, ảnh scan, email, file nén, khoá) đều bị bỏ qua. Lệnh `git add -f` vẫn vượt qua được lớp này, và **hiện chưa có gì trong CI chặn lại**: bước quét secret chỉ có khi T-TL-02 xong. Tới lúc đó, người commit tự chịu trách nhiệm kiểm tra.

---

## 2. Cấu trúc

| Đường dẫn | Chứa gì | Được điền bởi |
|---|---|---|
| `drafts/` | Bản nháp văn bản chính sách song ngữ EN/VI, qua luật sư rà rồi mới công bố | BR-30, MK-AUTH-01, E8-S5, E10-S3, S5-DoD-9, M4-8, M4-9, UC-32 |
| `registers/` | Sổ đăng ký hoạt động xử lý dữ liệu cá nhân, danh mục bên xử lý ở nước ngoài, lịch lưu giữ và xoá | S0-DoD-6, S1-DoD-8, M1-8, DoD-12 |
| `map-audit/` | Bằng chứng kiểm thử bản đồ chủ quyền (Hoàng Sa, Trường Sa) cho từng lần phát hành | Gate R6 / L-03 (doc 00 §6) |

**Chỗ dành sẵn, chưa tạo.** Ba thư mục dưới đây chứa thông tin không nên công khai, nên chỉ tạo sau khi Founder chốt câu hỏi 1 ở §4:

| Đường dẫn dự kiến | Sẽ chứa (chỉ metadata, không có bản gốc) |
|---|---|
| `counsel/` | Sổ câu hỏi luật sư hợp nhất (bộ 30 câu, CH-01, CH-05...) và chỉ mục các ý kiến luật sư |
| `filings/` | Sổ theo dõi hồ sơ đã nộp: pháp nhân, tên miền `.vn`, Thông báo mạng xã hội theo NĐ 147/2024, hợp đồng với nhà cung cấp và bên thuê ngoài |
| `procedures/` | Quy trình pháp lý: yêu cầu của chủ thể dữ liệu, yêu cầu của cơ quan chức năng, thông báo vi phạm dữ liệu cá nhân, báo cơ quan khi có sự cố an toàn tại sự kiện (PL-06) |

---

## 3. Không bao giờ commit

| Loại | Ví dụ | Nằm ở đâu |
|---|---|---|
| Bản gốc có chữ ký hoặc con dấu | Giấy chứng nhận đăng ký doanh nghiệp, hợp đồng luật sư, hợp đồng Designer / QA / dịch giả, thoả thuận xử lý dữ liệu với nhà cung cấp | Kho tài liệu ngoài repo (chờ chốt, §4) |
| Ý kiến và thư xác nhận của luật sư | Câu trả lời bộ 30 câu, thư xác nhận Chính sách quyền riêng tư (M4-9) | Kho ngoài repo, chỉ người cần biết được xem |
| Dữ liệu người dùng và bằng chứng đồng ý | `consent_records`, `audit_logs`, hồ sơ kiểm duyệt, yêu cầu xuất / xoá dữ liệu | Database. Phần lớn các bảng này mới là thiết kế, chưa có trong schema |
| Chi tiết sự cố, văn bản của cơ quan chức năng | Báo cáo vi phạm dữ liệu, yêu cầu gỡ nội dung | Kho ngoài repo, có legal hold |
| Giấy tờ tuỳ thân, kết quả KYC | Ảnh CCCD, hộ chiếu | Không lưu, hoặc để ở nhà cung cấp KYC (giai đoạn 2) |
| Secret | Khoá JWT, OAuth client secret, khoá riêng VAPID của Web Push, mật khẩu tài khoản cửa hàng | Secret manager và biến môi trường CI (T-TL-02) |
| Thư từ | File `.eml`, `.msg`, email xác nhận D-U-N-S | Hộp thư. Chỉ ghi mã hồ sơ và ngày |
| Dữ liệu cá nhân của người ngoài | Bảng khảo sát địa điểm, ghi âm phỏng vấn, danh sách liên hệ khẩn | Kho có kiểm soát truy cập |

Trong `registers/` và mọi chỉ mục: chỉ ghi mô tả chung (ví dụ "PostgreSQL, hosting tại Việt Nam", "object storage private") và tên role (`super_admin`, `moderator`). Không ghi hostname, tên bucket, IP, tên người, email hay số điện thoại.

---

## 4. Câu hỏi mở

1. **Founder:** giữ repo public hay chuyển private? Kho tài liệu ngoài repo cho bản gốc, ý kiến luật sư và hồ sơ sự cố là công cụ nào, ai có quyền truy cập, lưu bao lâu? Câu này chặn việc tạo `counsel/`, `filings/`, `procedures/`.
2. **Founder + Luật sư:** trích căn cứ bảo vệ dữ liệu cá nhân thế nào cho thống nhất? QĐ-73 xếp Luật 91/2025/QH15 trên NĐ 13/2023/NĐ-CP, trong khi MT-04 đang tạm gác và doc 04 nhắc NĐ 356/2025. Trong lúc chờ, dùng cách trích ở §5.
3. **Luật sư:** bản ngôn ngữ nào của văn bản xin đồng ý có giá trị pháp lý với người nước ngoài (L-13, doc 14)? Tạm coi bản VI là bản gốc pháp lý, bản EN là bản để đọc.
4. **Dev 1 + Dev 2:** nguồn sự thật cho văn bản đã công bố là `drafts/` hay bảng `legal_documents` (doc 02)? Phải chốt trước khi có cột `consent_records.document_version`.

---

## 5. Quy ước

- **Tên:** tên file và thư mục viết tiếng Anh, kebab-case. Văn bản chính sách có hậu tố ngôn ngữ `.vi.md` / `.en.md`.
- **Soạn thảo:** soạn trên một file cố định `<slug>.<lang>.md`, để PR hiện đúng điều khoản vừa đổi. Đầu file có front matter gồm `id`, `version`, `lang`, `status` (`draft` · `counsel-review` · `approved` · `published` · `superseded`), `effective_date`, `legal_basis`.
- **Công bố:** khi công bố, đóng băng bằng một bản sao `<slug>.v<X.Y>.<lang>.md`. Bản đã công bố không bao giờ sửa; muốn đổi thì ra version mới.
- **Căn cứ pháp lý:** nêu cả Luật 91/2025/QH15 và NĐ 13/2023/NĐ-CP, ghi rõ Luật 91/2025 có hiệu lực cao hơn từ 01/01/2026 (QĐ-73). Gắn nhãn **CẦN LUẬT SƯ XÁC NHẬN**.
- **Trích nguồn:** trích theo mã (T-TL-01, BR-30, R6 / L-03) và số mục (§), không theo số dòng vì số dòng trôi sau mỗi lần sửa tài liệu. Mã `L-xx` trùng nghĩa giữa doc 00, 05, 08 và 14, nên luôn ghi kèm tên tài liệu.
- **DoD-12 (doc 08 §6.1):** story nào chạm dữ liệu cá nhân thì thêm hoặc sửa dòng trong `registers/` ngay trong PR đó.
- **Không xuất PDF vào đây.** Bản gửi luật sư xuất ra ngoài repo.

---

## 6. Vai trò

- **Dev 1** (kiêm Tech Lead): giữ cấu trúc thư mục và `.gitignore`, review mọi PR chạm `ops/legal/`.
- **Founder:** soạn và công bố văn bản trong `drafts/`, soạn nội dung sổ đăng ký.
- **Luật sư:** rà soát và ký xác nhận; bản ký nằm ngoài repo.

Phân vai theo QĐ-77 (doc 00 §8.7). Repo chưa có `CODEOWNERS` và branch protection chưa được xác nhận, nên quy tắc duyệt này chưa được cưỡng chế bằng công cụ.

---

## 7. Nếu lỡ commit thứ không được commit

1. Nếu là secret: thu hồi hoặc xoay vòng ngay, coi như đã lộ.
2. Viết lại lịch sử bằng `git filter-repo`, force-push, rồi báo mọi người clone lại.
3. Nhờ GitHub Support xoá cache và ref của các PR liên quan.
4. Nếu là dữ liệu cá nhân của người khác: cùng luật sư đánh giá nghĩa vụ thông báo vi phạm.

---

## 8. Việc tiếp theo

| Mã | Việc | Phụ trách |
|---|---|---|
| S0-DoD-6 | Tạo `registers/processing-activities.md` có đủ cột (danh sách cột ở `registers/README.md`), chưa cần dòng dữ liệu | Founder + Dev 1 |
| S1-DoD-8, M1-8 | Ghi ba dòng đầu (email, mật khẩu băm, định danh Google), rồi bổ sung dòng cho mọi cột dữ liệu cá nhân đã có trong schema | Founder + Dev 1 |
| BR-30, M4-8, M4-9 | Soạn Điều khoản, Chính sách quyền riêng tư, Quy tắc cộng đồng trong `drafts/`, qua luật sư, công bố trước M4 (25/12/2026) | Founder |
| T-TL-02 | Gitleaks trong CI, chặn file nhị phân trong `ops/legal/` (trừ `map-audit/`), thêm mẫu khoá (`*.p8`, `*.pem`, `*.key`...) vào `.gitignore` gốc, bật GitHub secret scanning và push protection | Dev 1 |
| R6 / L-03 | Lần kiểm bản đồ đầu tiên, trước bản staging hoặc beta đầu tiên có màn chọn địa điểm (đang lấy tile từ OpenStreetMap). Không chờ bản đồ web E5-S6, vì E5-S6 đã hoãn | Dev 2 |
| — | Thêm `ops/legal/` vào `docs/architecture/source-tree.md` và `.agent/rules/ownership.md` | Dev 1 |
