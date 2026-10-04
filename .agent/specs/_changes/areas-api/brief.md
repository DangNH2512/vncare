# Spec: API khu vực (E5-S1 / S2-DoD-6)

| Trường | Giá trị |
|---|---|
| Mã spec | E5-S1 · S2-DoD-6 · M2-4 (phần API) |
| Trạng thái | đã triển khai — chờ chạy e2e trên máy có Docker + review của TV1 cho `packages/**` |
| Ngày | 2026-09-25 |
| Người viết | TV3 |
| Use case liên quan | Khám phá theo khu vực; tự gán khu vực khi tạo sự kiện (E4-S1, của TV1) |

## Vấn đề

Bảng `areas` và polygon 6 khu vực MVP (`@dnc/geo`) đã có, nhưng `apps/api` chưa
có endpoint nào đọc chúng. Bộ lọc khám phá (M2-4) và form tạo sự kiện (E4-S1, đầu
L2) cần danh sách khu vực và phép tra điểm → khu vực.

## Phạm vi

**Trong phạm vi:** module `area` chỉ đọc; contract Zod; key lỗi i18n; spec e2e.

**Ngoài phạm vi:** migration (cột `parent_id` / `is_mvp` cho seed phân cấp), sửa
polygon (chờ Founder ký ranh giới thật), giao diện bộ lọc trên web.

## Hợp đồng API

| Method | Endpoint | Request | Response | Quyền |
|---|---|---|---|---|
| GET | `/api/v1/areas?mvp=true\|false` | `ListAreaQuery` | `envelope(AreaResponse[])` | Public |
| GET | `/api/v1/areas/resolve?lat&lng` | `AreaResolveQuery` | `envelope(AreaResponse)` | Public |
| GET | `/api/v1/areas/:id` | uuid | `envelope(AreaDetailResponse)` (có `boundary` GeoJSON) | Public |

`isMvp` = id nằm trong `daNangAreas` của `@dnc/geo` — một nguồn sự thật, không có
danh sách thứ hai viết tay. Khi có seed phân cấp, các dòng khác tự có `isMvp=false`.

## Thay đổi dữ liệu

Không có. Logic upsert của seed tách ra `src/database/seeds/areas.ts`
(`upsertAreas`) để spec e2e dùng lại; hành vi `pnpm db:seed` giữ nguyên.

## Trạng thái rỗng và lỗi

- `AREA_NOT_FOUND` → `errors.area.notFound` (404)
- `AREA_OUTSIDE_COVERAGE` → `errors.area.outsideCoverage` (404, điểm nằm ngoài mọi khu vực)
- `?mvp=` khác `true/false` → 400

## Tiêu chí nghiệm thu

- [x] Contract + module + i18n typecheck sạch
- [ ] `apps/api/e2e/modules/area/area.e2e.spec.ts` chạy xanh trên Postgres/PostGIS local (máy hiện tại không có Docker, Node 18)
- [ ] TV1 review phần thêm vào `packages/contracts` và `packages/i18n`
- [ ] Founder ký ranh giới 6 khu vực (phần còn lại của E5-S1)

## Câu hỏi còn mở

- Seed "phân cấp đầy đủ" của S2-DoD-6 cần cột mới (`parent_id`, cấp hành chính) →
  migration, phải xin duyệt riêng.
