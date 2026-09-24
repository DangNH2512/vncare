# Task board — RBAC + khung web admin (Tech Lead, 23/09/2026)

Brief: [brief.md](brief.md). Coordinator: orchestrator (phiên chính) giữ bảng này.

## Quyết định đã chốt

1. Admin health info: `environment`, `uptimeSeconds`, `checkedAt`.
2. `GET /api/v1/admin/system/health` luôn trả **200**, `data.status` = `ok` | `degraded` (khác `/health/ready` public trả 503).
3. Mã lỗi 403: `ROLE_NOT_ALLOWED`, messageKey `errors.auth.roleNotAllowed`, **không** có `details` (không liệt kê role hợp lệ). Hình dạng lỗi giữ như `TRUST_LEVEL_TOO_LOW`: body phẳng `{ code, messageKey }` (đã kiểm bằng app thật; Nest dùng thẳng object truyền vào exception).
4. 2FA cho staff: nợ, chờ Founder.
5. `PERMISSION_MATRIX` ở `packages/domain/src/permission-matrix.ts` (shape bên dưới).
6. Thứ tự guard: `JwtAuthGuard → RolesGuard → TrustLevelGuard` (D-07: role trước trust). `RolesGuard` trả `true` khi route không có metadata và khi `context.getType() !== 'http'` (như TrustLevelGuard).
7. Endpoint ở module mới `apps/api/src/modules/admin` (controller/service/repository/module + mapper + index), dùng lại `HealthService` qua `HealthModule.exports` và `health/index.ts` (rule B6).
8. Web admin mirror `apps/web-client-side/app/_lib/api.ts` (token trong biến module, refresh qua rewrite). Staff/member quyết bằng `user.role` trong response login/refresh. `AuthProvider` refresh khi mount; layout console redirect `/login` khi chưa có user; `middleware.ts` đặt `Cache-Control: no-store`. Locale client-side (localStorage) như web client.
9. MT-17: giữ tên code `TrustLevelGuard` / `@MinTrustLevel`.

## Hợp đồng

`packages/contracts/src/admin.ts`:

```ts
export const AdminDependencyStatus = z.enum(['up', 'down']);
export const AdminSystemHealthStatus = z.enum(['ok', 'degraded']);
export const AdminSystemHealthResponse = z.object({
  status: AdminSystemHealthStatus,
  checks: z.object({ database: AdminDependencyStatus, redisCache: AdminDependencyStatus, redisQueue: AdminDependencyStatus }),
  environment: z.string(),
  uptimeSeconds: z.number().int().nonnegative(),
  checkedAt: z.iso.datetime(),
});
export type AdminSystemHealthResponseT = z.infer<typeof AdminSystemHealthResponse>;
```

`packages/domain/src/permission-matrix.ts`:

```ts
export const STAFF_ROLES: readonly UserRoleT[] = ['curator', 'moderator', 'admin', 'super_admin'];
export function isStaffRole(role: UserRoleT): boolean;
export const SYSTEM_HEALTH_ROLES: readonly UserRoleT[] = ['admin', 'super_admin'];
export type PermissionKey = 'admin_console.access' | 'system.health.view';
export interface PermissionRule { key: PermissionKey; docRef: string; allowedRoles: readonly UserRoleT[] }
export const PERMISSION_MATRIX: readonly PermissionRule[];
export function allowedRolesFor(key: PermissionKey): readonly UserRoleT[];
```

(`UserRoleT` lấy từ `@dnc/contracts`; nếu `@dnc/domain` không được phép phụ thuộc `@dnc/contracts`, khai báo union role cục bộ và thêm test đối chiếu.)

## Key i18n

Backend (RBAC-2): `errors.auth.roleNotAllowed` — "You do not have permission to do this." / "Bạn không có quyền thực hiện việc này."

Web admin (ADM-4):

| key | en | vi |
|---|---|---|
| `role.curator.label` | Curator | Người phụ trách nội dung |
| `role.moderator.label` | Moderator | Kiểm duyệt viên |
| `role.admin.label` | Admin | Quản trị viên |
| `role.superAdmin.label` | Super admin | Quản trị viên cấp cao |
| `admin.login.title` | Staff sign-in | Đăng nhập nhân sự |
| `admin.login.body` | Sign in with your Da Nang Connect staff account. | Đăng nhập bằng tài khoản nhân sự của Da Nang Connect. |
| `admin.login.rejected` | This account does not have access to the operations console. | Tài khoản này không có quyền truy cập bảng điều khiển vận hành. |
| `admin.nav.overview` | Overview | Tổng quan |
| `admin.nav.systemHealth` | System health | Tình trạng hệ thống |
| `admin.overview.title` | Overview | Tổng quan |
| `admin.overview.body` | Operations console for Da Nang Connect. | Bảng điều khiển vận hành của Da Nang Connect. |
| `admin.header.signedInAs` | Signed in as {name} | Đang đăng nhập: {name} |
| `admin.health.title` | System health | Tình trạng hệ thống |
| `admin.health.checkedAt` | Checked at {time} | Kiểm tra lúc {time} |
| `admin.health.environmentLabel` | Environment | Môi trường |
| `admin.health.uptimeLabel` | Uptime | Thời gian hoạt động |
| `admin.health.dependency.database` | Database | Cơ sở dữ liệu |
| `admin.health.dependency.redisCache` | Cache | Bộ nhớ đệm |
| `admin.health.dependency.redisQueue` | Job queue | Hàng đợi tác vụ |
| `admin.health.state.allUp.title` | All systems operational | Mọi hệ thống hoạt động bình thường |
| `admin.health.state.allUp.body` | Database and both Redis instances are responding. | Cơ sở dữ liệu và cả hai Redis đều phản hồi tốt. |
| `admin.health.state.degraded.title` | Degraded | Đang suy giảm |
| `admin.health.state.degraded.body` | {dependency} is not responding. Everything else is fine. | {dependency} không phản hồi. Các phần khác vẫn bình thường. |
| `admin.health.state.unreachable.title` | Cannot reach the API | Không kết nối được API |
| `admin.health.state.unreachable.body` | Check your connection and try again. | Kiểm tra kết nối mạng và thử lại. |

Dùng lại: `common.retry`, `common.appName`, `common.language`, `auth.action.signIn`, `auth.action.signOut`, `auth.action.working`, `auth.field.email`, `auth.field.password`, `auth.error.generic`, `auth.error.offline`, `errors.auth.invalidCredentials`, `errors.auth.unauthenticated`. Sau khi sửa JSON chạy `node packages/i18n/scripts/generate-keys.mjs`.

## Task cards

| ID | Owner | Việc | Phụ thuộc | AC | Trạng thái |
|---|---|---|---|---|---|
| RBAC-1 | backend-agent | `roles.decorator.ts`, `roles.guard.ts`, thứ tự guard trong `app.module.ts` | — | nền AC-2/5 | ✅ |
| RBAC-2 | backend-agent | `permission-matrix.ts` + test ở `packages/domain/test/`; key `errors.auth.roleNotAllowed`; regenerate keys | — | nền | ✅ |
| RBAC-3 | backend-agent | `packages/contracts/src/admin.ts`; module `admin`; export `HealthService` | RBAC-1, RBAC-2 | AC-1..7 | ✅ |
| RBAC-4 | backend-agent | `harness.ts` thêm `setRole()` / role cho `createActor`; `e2e/modules/admin/admin-system-health.e2e.spec.ts` 9 ca; chạy toàn bộ test API | RBAC-3 | AC-1..7 | ✅ |
| RBAC-5 | backend-agent | `ops/dev.sh` khởi động thêm web admin :3002 | ADM-1 | — | ✅ |
| ADM-1 | web-admin-agent | scaffold `apps/web-admin-side` (package `@dnc/web-admin`, `next dev -p 3002`, rewrite, transpilePackages, `robots.ts`, metadata noindex) | — | AC-15 | ✅ |
| ADM-2 | web-admin-agent | `app/_lib/api.ts` | ADM-1 | nền | ✅ |
| ADM-3 | web-admin-agent | `_lib/i18n.ts`, `locale-provider.tsx`, `language-toggle.tsx` | ADM-1 | AC-14 | ✅ |
| ADM-4 | web-admin-agent | key `admin.*` / `role.*` vào `packages/i18n` (**sau RBAC-2**) | RBAC-2 | AC-14 | ✅ |
| ADM-5 | web-admin-agent | `auth-provider.tsx`, `(auth)/login/page.tsx`, `middleware.ts` | ADM-2,3,4, RBAC-2 | AC-10 | ✅ |
| ADM-6 | web-admin-agent | `(console)/layout.tsx`, `(console)/page.tsx`, `sidebar.tsx`, `header.tsx`; chặn thật URL `/system-health` với role không đủ | ADM-5 | AC-5 (UI), AC-11, AC-12 | ✅ |
| ADM-7 | web-admin-agent | `(console)/system-health/page.tsx` 3 trạng thái; `getSystemHealth()` | ADM-6, RBAC-3 | AC-3/4 (UI), AC-8, AC-9 | ✅ |

File dùng chung sửa tuần tự: `app.module.ts` (RBAC-1 → RBAC-3), `packages/i18n/**` (RBAC-2 → ADM-4).

## E2E RBAC (RBAC-4)

1. Không token → 401 `UNAUTHENTICATED` · 2. member → 403 `ROLE_NOT_ALLOWED`, không `details` · 3. admin → 200 đủ shape · 4. super_admin → 200 · 5. curator → 403 · 6. moderator → 403 · 7. `setRole` sang admin, token cũ → 403 · 8. refresh rồi gọi → 200 · 9. `REDIS_QUEUE_URL` hỏng, token admin → 200, `status: degraded`, `redisQueue: down`.

## Việc tài liệu sau khi xong

Đóng MT-17, PERM-MATRIX, E2-S7, S1-DoD-5, M1-5, S1-Demo-5 (ghi rõ demo dùng `member → admin` qua refresh); doc 04 §6.3 thêm `ROLE_NOT_ALLOWED`.
