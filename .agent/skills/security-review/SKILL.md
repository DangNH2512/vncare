---
name: security-review
description: Checklist bảo mật tại thời điểm code review cho Da Nang Connect. Dùng khi làm auth, xử lý input người dùng, đụng secrets/env, tạo endpoint mới, xử lý dữ liệu cá nhân, upload ảnh, truy vấn vị trí, hoặc luồng kiểm duyệt UGC. Bổ trợ cho agent giám sát runtime.
---

# Security Review — Checklist Tại Thời Điểm Code

> Đây là **cổng chặn ở code review** (trước khi merge). Nó không thay thế phần bảo
> mật **runtime** — Sentry, log tập trung, cảnh báo tín hiệu tấn công. Cần một lượt
> rà chủ động thì chạy [`autonomous-security-scan`](../autonomous-security-scan/SKILL.md).

**Ngữ cảnh:** `apps/api` (NestJS + TypeORM + PostgreSQL/PostGIS + Redis/BullMQ),
`apps/web-client-side` (Next.js, web người dùng cuối), `apps/web-admin-side` (Next.js,
console vận hành), `apps/mobile` (Expo). Người dùng là expat tại Đà Nẵng, dữ liệu
xử lý gồm hồ sơ cá nhân, vị trí và nội dung do người dùng tạo — đều là **dữ liệu nhạy
cảm**, áp nguyên tắc thu tối thiểu và lộ tối thiểu.

## Khi nào chạy

- Hiện thực authentication hoặc authorization (JWT access/refresh, social login).
- Xử lý input người dùng, query param, hoặc upload file.
- Tạo endpoint API mới.
- Đụng secrets, credentials, hoặc `.env`.
- Làm việc với dữ liệu cá nhân, vị trí, hoặc luồng kiểm duyệt UGC.
- Tích hợp API bên thứ ba (Expo Push, S3-compatible storage, OAuth provider).

---

## 1. Quản lý secrets

```typescript
// ❌ Secret hardcode
const apiKey = 'sk-proj-xxxxx';

// ✅ Đọc từ env, validate lúc khởi động
const apiKey = process.env.SOME_API_KEY;
if (!apiKey) throw new Error('SOME_API_KEY is not configured');
```

- [ ] Không có API key, token, hay password hardcode trong source.
- [ ] Mọi secret đọc từ `process.env`; `.env*` nằm trong `.gitignore`.
- [ ] Không có secret nào bị commit vào git history.
- [ ] Credentials ký app (iOS/Android) và secret build nằm trên EAS hoặc trong env
      của CI, không nằm trong repo.
- [ ] Chỉ biến an toàn để công khai mới được đặt tiền tố `EXPO_PUBLIC_*` /
      `NEXT_PUBLIC_*` — mọi thứ có tiền tố này đều nằm trong bundle client. Biến
      `NEXT_PUBLIC_*` của `apps/web-client-side` lộ ra trình duyệt người dùng cuối;
      `CSRF_SECRET` của phiên người dùng cuối cũng thuộc app này và **không** được
      đặt tiền tố public. `apps/web-admin-side` có bộ env riêng, không dùng chung
      secret với app client.

## 2. Validate input (NestJS)

```typescript
// ✅ DTO + class-validator + global ValidationPipe (whitelist: true)
export class CreateRsvpDto {
  @IsUUID() occurrenceId: string;
  @IsOptional() @IsInt() @Min(0) @Max(2) guestCount?: number;
}

export class SearchEventsDto {
  @IsOptional() @IsNumber() @Min(-180) @Max(180) lng?: number;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) lat?: number;
  // Bán kính PHẢI có chặn trên, nếu không một request quét cả nước
  @IsOptional() @IsInt() @Min(100) @Max(50_000) radiusMeters?: number;
  @IsOptional() @IsEnum(Area) area?: Area;
}
```

- [ ] Mọi body/query của endpoint có DTO được validate (`class-validator`).
- [ ] `ValidationPipe` với `whitelist: true` cắt bỏ field lạ.
- [ ] Có chặn biên số/độ dài/enum (không có chuỗi hay mảng vô hạn).
- [ ] Tham số phân trang (`limit`, `offset`) có chặn trên.
- [ ] **Bán kính tìm kiếm và bounding box có chặn trên** — tham số địa lý không giới
      hạn là một đường DoS rẻ tiền.
- [ ] Upload ảnh: validate MIME type thật (không tin phần mở rộng), kích thước tối đa,
      và đường dẫn lưu trữ; strip EXIF (ảnh điện thoại nhúng toạ độ GPS).

## 3. Auth & phân quyền

- [ ] Mọi endpoint đều được guard — không có route public do sơ ý.
- [ ] Kiểm tra ở cấp đối tượng: user chỉ thao tác được trên tài nguyên của mình
      (không IDOR — phải verify quyền sở hữu, không chỉ verify đã đăng nhập).
- [ ] Route dành cho moderator/admin được chặn theo role ở phía server, không chỉ ẩn ở UI.
- [ ] Token được validate ở mọi request; hết hạn/refresh xử lý đúng; refresh token có
      cơ chế thu hồi (đăng xuất, đổi mật khẩu, gỡ thiết bị).
- [ ] Social login (Google/Apple/Facebook): verify token phía server với provider,
      không tin `email` hay `sub` do client gửi lên.
- [ ] Hạn mức theo `trust_level` (tạo sự kiện, nhắn tin, đăng ảnh) enforce ở server.
- [ ] Có rate limit cho các hành vi bị lạm dụng: đăng nhập, tạo sự kiện, RSVP, report.

## 4. SQL & truy cập dữ liệu

- [ ] Không nối chuỗi SQL thô — dùng query builder / tham số hoá của TypeORM.
- [ ] **Truy vấn PostGIS cũng phải tham số hoá.** Toạ độ và bán kính lấy từ người dùng
      đi vào `ST_DWithin` phải là parameter, không phải chuỗi nội suy.
- [ ] Chỉ dùng repository pattern (theo Top-6 rule: không query DB trong Service).
- [ ] Không lộ cột nhạy cảm trong response API (password hash, token, `providerId`,
      device token, email của người tham gia khác).
- [ ] Xoá tài khoản/nội dung thực sự xoá hoặc ẩn danh dữ liệu liên quan, không để lại
      bản sao trong cache/index/S3.

## 5. Dữ liệu cá nhân & vị trí

- [ ] Thu thập tối thiểu: mỗi field cá nhân phải có lý do rõ ràng cho tính năng đang làm.
- [ ] Response đi qua **DTO allow-list**, không `return entity` nguyên cục.
- [ ] Danh sách người tham gia chỉ lộ tên hiển thị + avatar; email/số điện thoại không
      bao giờ nằm trong response công khai.
- [ ] **Vị trí:** trả về điểm hẹn công khai của sự kiện, không phải toạ độ thật của cá
      nhân. Sự kiện đặt `location_precision` mờ thì API phải trả vùng gần đúng — làm mờ
      ở server, không làm mờ ở client.
- [ ] Người dùng kiểm soát được mức hiển thị hồ sơ và rút lại được sự đồng ý.
- [ ] Không ghi PII (email, toạ độ, token) vào log, audit log, hay breadcrumb của Sentry.

## 6. Phía frontend (quy tắc cứng)

- [ ] Realtime đi qua **socket.io**, push đi qua **Expo Push Notifications** — không kéo
      SDK realtime/push của bên thứ ba khác vào client.
- [ ] Không có secret trong bundle client (chỉ các giá trị `EXPO_PUBLIC_*` /
      `NEXT_PUBLIC_*` an toàn để lộ).
- [ ] Nội dung do người dùng tạo được escape khi render (không `dangerouslySetInnerHTML`
      với input thô) — mô tả sự kiện và bình luận là bề mặt XSS chính.
- [ ] Link do người dùng nhập được kiểm scheme (chặn `javascript:`) và gắn
      `rel="noopener noreferrer"`.
- [ ] CORS origin cấu hình đúng cho cả web và mobile — client socket.io native gửi
      `Origin` là host của API, dễ bị chặn nhầm nếu chỉ allow origin của web.
- [ ] Token lưu ở nơi an toàn trên mobile (`expo-secure-store`), không phải
      `AsyncStorage` thường.

## 7. Kiểm duyệt UGC

- [ ] Mọi đường ghi nội dung (web, mobile, gọi API trực tiếp) đi qua **cùng một** pipeline
      kiểm duyệt — không có cửa sau nào bỏ qua trạng thái chờ duyệt.
- [ ] Nội dung `PENDING_REVIEW` hoặc đã gỡ không xuất hiện trong feed, tìm kiếm, hay
      response API — kiểm cả khi gọi thẳng endpoint.
- [ ] Ảnh đã gỡ cũng bị vô hiệu ở storage/CDN, không chỉ ẩn khỏi UI.
- [ ] Quan hệ chặn (block) enforce ở server ở cả hai chiều.
- [ ] Hành động của moderator ghi kèm lý do, và có đường khiếu nại.

## 8. Khả năng truy vết (auditability)

- [ ] Mọi mutation (create/update/delete/đổi trạng thái/hành động kiểm duyệt) gọi
      `AuditLogService.log()` — đây cũng là một Top-6 rule.
- [ ] Bản ghi audit đủ `actor`, `action`, `entityType`, `entityId`, `reason`.
- [ ] Không ghi secret/PII vào audit log hay console.

---

## Quick Grep Scan

```bash
# Literal trông giống secret (soi từng hit)
grep -rn "sk-\|api[_-]\?key\s*=\s*['\"]" apps/api/src --include="*.ts" | grep -v process.env

# Nội suy chuỗi vào SQL thô, gồm cả truy vấn PostGIS (soi từng hit)
grep -rn "query(\`.*\${" apps/api/src --include="*.ts"
grep -rn "ST_DWithin\|ST_MakePoint\|ST_Contains" apps/api/src --include="*.ts"

# Trả thẳng entity thay vì DTO allow-list (soi từng hit)
grep -rn "return .*Repository.find\|return entity" apps/api/src --include="*.ts"

# Render HTML thô từ nội dung người dùng (phải trả về 0)
grep -rn "dangerouslySetInnerHTML" apps/web-client-side/src apps/web-admin-side/src apps/mobile/src

# Token lưu sai chỗ trên mobile (phải trả về 0)
grep -rn "AsyncStorage" apps/mobile/src | grep -i "token\|secret"
```

## Output

Báo cáo theo mức nghiêm trọng: **CRITICAL** (lộ secret, injection, bypass auth, IDOR,
rò rỉ dữ liệu cá nhân hoặc vị trí thật) → chặn merge. **HIGH** (thiếu validate, route
không guard, thiếu chặn trên cho tham số địa lý, thiếu rate limit) → sửa trước khi merge.
**MEDIUM/LOW** → ghi chú theo dõi.
