---
name: autonomous-security-scan
description: Chủ động săn và vá lỗ hổng bằng vòng lặp nhiều chặng (threat-model → scan → triage → patch). Dùng cho một lượt rà bảo mật trên apps/api, trước khi release, hoặc sau khi đụng auth, dữ liệu cá nhân, upload, hay truy vấn vị trí. Mở rộng checklist tĩnh security-review thành một workflow tìm-và-sửa chủ động.
allowed-tools: Read, Bash, Edit
---

# Autonomous Security Scan — Vòng Lặp Find & Fix

> **Nguồn / Provenance:** Phỏng theo Anthropic
> `defending-code-reference-harness` (recon → find → verify → report → patch,
> các skill `/threat-model`, `/vuln-scan`, `/triage`, `/patch`):
> https://github.com/anthropics/defending-code-reference-harness
> Đi kèm checklist tại thời điểm code [`security-review`](../security-review/SKILL.md).
> Phần bảo mật runtime (Sentry, log tập trung, cảnh báo) nằm ngoài phạm vi skill này.

> ⚠️ **An toàn:** threat-model / scan / triage là read-only. Chặng PATCH có sửa code —
> không bao giờ tự commit hay tự deploy; đề xuất diff và để user duyệt.

**Ngữ cảnh:** Da Nang Connect — `apps/api` (NestJS + TypeORM + PostgreSQL/PostGIS +
Redis/BullMQ + socket.io), `apps/web` (Next.js), `apps/mobile` (Expo). Dữ liệu nhạy cảm
chính là **hồ sơ cá nhân, vị trí, và nội dung do người dùng tạo**.

## Chặng 1 — Threat Model (read-only)

Vẽ bề mặt tấn công cho phạm vi đang rà:
- **Điểm vào:** mọi route controller, upload ảnh, gateway socket.io, job BullMQ, webhook
  của OAuth provider, callback trạng thái từ Expo Push.
- **Ranh giới tin cậy:** chưa đăng nhập → đã đăng nhập → chủ sự kiện (host) → moderator;
  và ranh giới `trust_level` T0–T5 quyết định hạn mức hành động.
- **Tài sản cần bảo vệ:** token & secret, dữ liệu cá nhân (email, số điện thoại, hồ sơ),
  **dữ liệu vị trí** (toạ độ thật của người dùng, điểm hẹn riêng tư), danh sách người
  tham gia sự kiện, hàng chờ kiểm duyệt và bản ghi audit.
- Xuất ra danh sách mối đe doạ ngắn theo kiểu `STRIDE-ish` (spoofing / tampering / IDOR /
  injection / rò rỉ thông tin / DoS), xếp theo mức tác động.

## Chặng 2 — Scan (read-only)

Với mỗi mối đe doạ, grep rồi đọc code liên quan:
```bash
# Nội suy chuỗi vào SQL thô
grep -rn "query(\`.*\${" apps/api/src --include="*.ts"

# Truy vấn địa lý: tham số hoá chưa, bán kính có chặn trên chưa
grep -rn "ST_DWithin\|ST_MakePoint\|ST_Contains" apps/api/src --include="*.ts"

# Route không được guard
grep -rn "@Public\|skipAuth\|@SetMetadata" apps/api/src --include="*.ts"

# Cách xử lý secret
grep -rn "process.env" apps/api/src --include="*.ts" | grep -i "secret\|key\|token"

# Trả thẳng entity thay vì DTO allow-list → nguy cơ rò PII
grep -rn "return .*Repository.find" apps/api/src --include="*.ts"

# Render HTML thô từ nội dung người dùng
grep -rn "dangerouslySetInnerHTML" apps/web/src apps/mobile/src

# Rate limit trên các hành vi bị lạm dụng
grep -rn "Throttle\|RateLimit" apps/api/src --include="*.ts"
```
Tìm: thiếu DTO validate, IDOR (không check quyền sở hữu), SQL/PostGIS thô, tham số địa
lý không chặn trên, secret hoặc PII lọt vào response/log, thiếu `AuditLogService.log()`
trên mutation, đường ghi UGC bỏ qua pipeline kiểm duyệt, thiếu rate limit.

## Chặng 3 — Triage

Với mỗi phát hiện, ghi lại: vị trí (`file:line`), lớp lỗ hổng, kịch bản khai thác, và
mức tin cậy / khả năng là dương tính giả. Bỏ nhiễu, giữ những cái thật sự khai thác được.
Xếp hạng: **CRITICAL** (bypass auth, injection, lộ secret, IDOR trên dữ liệu cá nhân hoặc
RSVP, lộ vị trí thật của người dùng) → **HIGH** → **MEDIUM/LOW**.

## Chặng 4 — Patch (có ghi — đề xuất, không deploy)

Với mỗi phát hiện được giữ lại, đề xuất bản vá tối thiểu:
- IDOR → thêm kiểm tra quyền sở hữu/role ở phía server.
- Injection → tham số hoá qua query builder / repository của TypeORM, gồm cả tham số
  toạ độ và bán kính của PostGIS.
- Thiếu validate → thêm DTO `class-validator` + `ValidationPipe whitelist`, và chặn trên
  cho `radiusMeters` / `limit`.
- Rò PII → chuyển response sang DTO allow-list, bỏ field nhạy cảm khỏi log và Sentry.
- Lộ vị trí → làm mờ toạ độ ở server theo `location_precision`, không ở client.
- Lộ secret → chuyển sang env + strip khỏi response/log.
- Thiếu rate limit → thêm guard giới hạn tần suất theo user cho hành vi bị lạm dụng.

Chạy lại đúng grep/scan tương ứng để xác nhận phát hiện đã biến mất, rồi trình diff xin
duyệt.

## Output

Một báo cáo triage (phát hiện × mức nghiêm trọng × `file:line` × cách sửa) và, với các
mục đã được duyệt, diff bản vá đã verify. Phát hiện CRITICAL chặn release.
