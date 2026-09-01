# BA Templates — feature doc · screen spec · acceptance criteria

> Copy template, điền, **đăng ký vào `docs/README.md`** nếu là doc mới (tạo file
> index này nếu chưa có). Nền nghiệp vụ: [`domain.md`](domain.md). Canon chi tiết:
> [`docs/analysis/`](../../../../docs/analysis/).
>
> **Không dùng đường dẫn tuyệt đối** trong tài liệu — luôn dùng đường dẫn tương đối
> tính từ gốc repo (`apps/api/src/...`, `.agent/skills/...`).

---

## 1. Feature doc — `docs/features/<feature>.md`

Dùng khi ship/spec 1 tính năng. As-built viết NGẮN; plan viết dài hơn được.

```markdown
# Feature: <Tên>

## Status: 🟢 SHIPPED (YYYY-MM-DD) | 🟡 PLANNED (Giai đoạn X) | ✅ DONE (Basic)

> 1 dòng: commit liên quan · scope · giai đoạn (GĐ1 cộng đồng / GĐ2 nhà ở / GĐ3 y tế).

## Overview

2-4 câu mô tả. Nếu phức tạp, thêm **Mental model 1 câu:** *…*.

## Data Model

### `<Entity>` — [`apps/api/src/modules/<module>/entities/<entity>.entity.ts`](../../apps/api/src/modules/<module>/entities/<entity>.entity.ts)

| Field | Type | Ghi chú |
|---|---|---|
| … | … | … |

**Index:** … **CHECK:** … **Migration:** `apps/api/src/database/migrations/<timestamp>-<name>.ts`

## API Routes — prefix `/api/v1`

| Method | Route | Auth / Trust | Mô tả |
|---|---|---|---|
| POST | `/api/v1/events/{id}/rsvp` | Bearer · T2+ | … (rate limit? `Idempotency-Key`? notify ai?) |

Module: [`apps/api/src/modules/<module>/`](../../apps/api/src/modules/<module>/) —
controller · service · repository · module + `dto/`. Kiểu dùng chung:
[`packages/shared-types`](../../packages/shared-types/).

## Behavior / Semantics (edge cases)

- <quy tắc nghiệp vụ + edge case: idempotent? tranh chấp sức chứa? waitlist? huỷ?>

## Geo & Time

- Lọc theo `area_id` (bao gồm area con?) · bán kính `ST_DWithin` (mét) · sắp xếp & tie-break.
- Mốc thời gian lưu UTC (`timestamptz`), hiển thị `Asia/Ho_Chi_Minh`; biên bộ lọc tính theo giờ Đà Nẵng.

## i18n

| Key | en | vi |
|---|---|---|
| `event.rsvp.full.message` | This event is full | Sự kiện đã đủ chỗ |

## Notifications

| Trigger | Người nhận | Kênh | Locale | Khung giờ | Huỷ khi |
|---|---|---|---|---|---|
| … | … | Expo Push / in-app / email | tài khoản | 08:00–22:00 | sự kiện bị huỷ |

## Privacy & Moderation

- Ai thấy gì ở mỗi `trust_level` / `location_precision` / `status`.
- Đường report → hành động → `audit_log` → khiếu nại.
- Dữ liệu cá nhân thu thập: gì · vì sao · lưu bao lâu · xoá thế nào.

## UI Files

### Web client (người dùng cuối) — [`apps/web-client-side`](../../apps/web-client-side/) (Next.js 16 App Router + Tailwind)
| File | Vai trò |
|---|---|
| [`apps/web-client-side/src/components/.../X.tsx`](../../apps/web-client-side/src/components/.../X.tsx) | … |

### Web admin (đội ngũ vận hành) — [`apps/web-admin-side`](../../apps/web-admin-side/) (Next.js 16 App Router + Tailwind)
| File | Vai trò |
|---|---|
| [`apps/web-admin-side/src/components/.../X.tsx`](../../apps/web-admin-side/src/components/.../X.tsx) | … |

### Mobile — [`apps/mobile`](../../apps/mobile/) (Expo 54 + React Native)
| File | Vai trò |
|---|---|
| [`apps/mobile/src/components/.../X.tsx`](../../apps/mobile/src/components/.../X.tsx) | … |

## Cross-platform khác biệt

| Hạng mục | Web client | Web admin | Mobile | Lý do |
|---|---|---|---|---|
| SEO metadata | ✅ | ❌ | ❌ | Chỉ `apps/web-client-side` có trang public; admin đặt `robots: noindex` |
| Push nhắc lịch | ❌ | ❌ | ✅ | Expo Push chỉ có trên app |
| Hàng đợi kiểm duyệt | ❌ | ✅ | ❌ | Thao tác vận hành, cần bảng biểu + thao tác hàng loạt trên desktop |

## Acceptance Criteria

<Given/When/Then — xem mục 3 bên dưới>

## Tests

- API: [`apps/api/e2e/modules/<module>/...spec.ts`](../../apps/api/e2e/modules/<module>/)
- Web client E2E: [`apps/web-client-side/e2e/<feature>.spec.ts`](../../apps/web-client-side/e2e/)
- Web admin E2E: [`apps/web-admin-side/e2e/<feature>.spec.ts`](../../apps/web-admin-side/e2e/)
- Mobile: [`apps/mobile/__tests__/`](../../apps/mobile/__tests__/) + Maestro flow

## Known Gaps / Future

- <cái chưa làm + KHI NÀO nên làm + thuộc giai đoạn nào>

<!-- Khi gặp bug/quyết định kiến trúc không hiển nhiên: -->
> ⚠️ **Bài học:** <điều rút ra> — <lý do> (commit `<hash>`).
```

---

## 2. Screen spec — `docs/specs/screens/<screen>.md`

Mỗi file ≤ 200 dòng, single-purpose, `Last verified: <date>` ở đầu. Dùng khi mô tả
hành vi/UI 1 màn hình cho người build web/mobile.

```markdown
# Screen: <Tên> — `<route>`

> Last verified: YYYY-MM-DD · Source: [`apps/web-client-side/src/app/...`](../../../apps/web-client-side/src/app/) (web client) · [`apps/web-admin-side/src/app/...`](../../../apps/web-admin-side/src/app/) (web admin) · [`apps/mobile/src/app/...`](../../../apps/mobile/src/app/) (mobile)

## Mục đích
1 câu màn hình này để làm gì, ai dùng (member · organizer · curator · moderator · admin), ở trust level nào.

## Layout (top → bottom)
| Vùng | Nội dung | Component |
|---|---|---|

## Trạng thái (states)
| State | Khi nào | Hiển thị |
|---|---|---|
| loading | … | skeleton |
| empty | không có sự kiện khớp bộ lọc | empty-state + gợi ý nới bộ lọc (key i18n) |
| error | API lỗi / mất mạng | message có i18n key + nút Try again |
| data | … | … |
| restricted | trust level chưa đủ | giải thích cần làm gì để mở khoá |

## Tương tác (interactions)
| Action | Trigger | Kết quả | API |
|---|---|---|---|

## Bộ lọc & sắp xếp (nếu có)
| Trục lọc | Giá trị | Ghi chú |
|---|---|---|
| Area | An Thượng · Mỹ Khê · Mỹ An · Hải Châu · Sơn Trà · Ngũ Hành Sơn | có bao gồm area con? |
| Thời gian | Today · Tonight · This weekend | biên tính theo `Asia/Ho_Chi_Minh` |
| Loại hình | sports · language exchange · social · … | |
| Ngôn ngữ | English-friendly · Vietnamese · bilingual | |

## Cross-platform khác biệt
| Hạng mục | Web client | Web admin | Mobile | Lý do |
|---|---|---|---|---|

## i18n
| Key | en | vi |
|---|---|---|

## Acceptance Criteria
<Given/When/Then>
```

---

## 3. Acceptance Criteria — format chuẩn (cây cầu sang qa-tester)

Mỗi AC phải **quan sát/assert được**. Phủ: happy · boundary · negative ·
error/transient · concurrency · parity · privacy/trust · i18n · thời gian. Tiếng Việt.

### Ví dụ đã điền — RSVP một occurrence có sức chứa

```markdown
## Acceptance Criteria — RSVP sự kiện

| AC-ID | Loại | Given (tiền điều kiện) | When (hành động) | Then (kết quả quan sát được) | Web client | Web admin | Mobile |
|---|---|---|---|---|---|---|---|
| AC-1 | Happy | Đã đăng nhập (T2+), occurrence còn ≥1 chỗ | Bấm "Join" | Nút đổi sang "Going"; `POST /api/v1/events/{id}/rsvp` → `201 {status:"going", spotsLeft:n-1}`; `rsvp_going_count` tăng đúng 1 | ✅ | ➖ | ✅ |
| AC-2 | Idempotent | Đã RSVP occurrence này | Gửi lại cùng request với cùng `Idempotency-Key` | `200 {status:"going"}`, KHÔNG tạo bản ghi thứ hai, đếm không đổi | ✅ | ➖ | ✅ |
| AC-3 | Concurrency | Occurrence còn đúng 1 chỗ | 2 user gửi RSVP đồng thời | Đúng 1 request `201 going`; request kia `409 EVENT_FULL` kèm gợi ý vào waitlist | ✅ | ➖ | ✅ |
| AC-4 | Waitlist | Occurrence đã đầy, user chọn vào hàng chờ | `POST .../rsvp?waitlist=true` | `201 {status:"waitlisted", position:k}`; UI hiển thị vị trí k | ✅ | ➖ | ✅ |
| AC-5 | Promote | User A huỷ RSVP, B đứng đầu waitlist | A gọi `DELETE .../rsvp` | B chuyển `going` trong ≤60s; B nhận push đúng locale; `rsvp_going_count` không đổi tổng | ✅ | ➖ | ✅ |
| AC-6 | Negative | Chưa đăng nhập | Bấm "Join" | Điều hướng tới màn đăng nhập (`apps/web-client-side` `/login`, mobile modal auth); KHÔNG gọi endpoint RSVP | ✅ | ➖ | ✅ |
| AC-7 | Trust gate | User T1 (chỉ verify email), occurrence yêu cầu T2 | Bấm "Join" | `403 TRUST_LEVEL_REQUIRED`; UI giải thích "Verify your phone to join" + CTA verify | ✅ | ➖ | ✅ |
| AC-8 | Boundary | Occurrence bắt đầu sau 5 phút, hạn RSVP là 15 phút trước | Bấm "Join" | `409 RSVP_CLOSED`; nút hiển thị trạng thái disabled + lý do | ✅ | ➖ | ✅ |
| AC-9 | Error | Mất mạng giữa chừng | Bấm "Join" | Message có key `error.network.offline` (en: "You're offline — tap to retry"); có nút Try again; KHÔNG kẹt spinner vĩnh viễn; state không hiện "Going" giả | ✅ | ➖ | ✅ |
| AC-10 | Auth refresh | Access token hết hạn | Bấm "Join" | Client tự `POST /api/v1/auth/refresh` rồi retry; user không bị đá ra màn login | ✅ | ➖ | ✅ |
| AC-11 | Privacy | Viewer chưa RSVP, `location_precision = exact_after_rsvp` | `GET /api/v1/events/{id}` | Response trả toạ độ **đã làm mờ** + tên area; KHÔNG trả toạ độ chính xác (enforce ở API, không chỉ ẩn UI) | ✅ | ➖ | ✅ |
| AC-12 | Privacy | Viewer chưa RSVP | `GET /api/v1/events/{id}/rsvps` | `403` hoặc chỉ trả số đếm; không lộ danh sách tên/ảnh attendee | ✅ | ➖ | ✅ |
| AC-13 | Blocked | Organizer đã block viewer | Mở chi tiết sự kiện | Sự kiện không xuất hiện trong feed/search của viewer; truy cập trực tiếp → `404` | ✅ | ➖ | ✅ |
| AC-14 | i18n | Chuyển locale sang `vi` | Mở màn chi tiết | Mọi chuỗi chrome có bản dịch trong `vi.json`; KHÔNG hiện key thô; nội dung do organizer viết giữ nguyên `content_locale` | ✅ | ➖ | ✅ |
| AC-15 | Thời gian | Occurrence 20:00 giờ Đà Nẵng, thiết bị đặt múi giờ Berlin | Mở chi tiết | Hiển thị 20:00 kèm nhãn giờ Đà Nẵng (không đổi sang giờ thiết bị); bộ lọc "Tonight" vẫn chứa sự kiện này | ✅ | ➖ | ✅ |
| AC-16 | Notification | Đã RSVP, sự kiện bị organizer huỷ | Organizer huỷ occurrence | Attendee nhận thông báo huỷ; job nhắc lịch đã lên lịch **không** được gửi | ✅ | ➖ | ✅ |
| AC-17 | Parity | — | Cùng thao tác trên `apps/web-client-side` và mobile | Cùng trạng thái cuối, cùng số đếm, cùng thông báo lỗi (khác biệt duy nhất chính đáng: push chỉ mobile) | ✅ | ➖ | ✅ |
```

### Ví dụ đã điền — Tìm kiếm & lọc theo khu vực

```markdown
| AC-ID | Loại | Given | When | Then |
|---|---|---|---|---|
| AC-1 | Happy | Có 12 sự kiện sắp diễn ra ở An Thượng | Lọc `area=an-thuong` | `GET /api/v1/events?area=an-thuong` → chỉ trả sự kiện thuộc An Thượng **và các area con** của nó |
| AC-2 | Boundary | Sự kiện A cách vị trí user 1.9km, B cách 2.1km | Lọc bán kính 2km | A có trong kết quả, B không — dùng `ST_DWithin(geography, geography, 2000)`, đơn vị **mét** |
| AC-3 | Sort | Nhiều sự kiện cùng thời điểm bắt đầu | Phân trang trang 1 → trang 2 | Thứ tự deterministic (tie-break theo `id`); không có item lặp hoặc bị bỏ sót giữa hai trang |
| AC-4 | Edge | Sự kiện online, không có toạ độ | Lọc theo area | Không xuất hiện trong lọc theo area; xuất hiện khi chọn "Online"; hành vi này được ghi rõ trong spec |
| AC-5 | Thời gian | 23:30 giờ Đà Nẵng, có sự kiện lúc 23:45 cùng ngày | Lọc "Tonight" | Sự kiện 23:45 CÓ trong kết quả (biên tính theo `Asia/Ho_Chi_Minh`, không theo UTC) |
| AC-6 | Empty | Bộ lọc quá hẹp, 0 kết quả | Áp bộ lọc | Empty-state có i18n key + gợi ý nới bộ lọc (mở rộng bán kính / bỏ lọc ngôn ngữ); KHÔNG hiện spinner vô hạn |
| AC-7 | Perf | 10.000 sự kiện trong DB | Lọc area + bán kính | Query dùng index GIST (`EXPLAIN` cho thấy index scan), p95 < 300ms |
```

**Quy tắc viết AC tốt:**

- **Quan sát được, không cảm tính.** "Nút đổi text + API `201` + đếm tăng 1" ✅. "Hoạt động mượt" ❌.
- **Nêu status code + shape response** khi liên quan API (`201 {status:"going"}`, `409 EVENT_FULL`, `403 TRUST_LEVEL_REQUIRED`).
- **Error AC bắt buộc** cho mọi flow gọi network — người dùng thường ở ngoài đường bằng 4G (xem `behavior-smells.md` §3).
- **Concurrency AC bắt buộc** cho mọi mutation đụng sức chứa/đếm (§8).
- **Parity AC bắt buộc** — web + mobile cùng kết quả, hoặc ghi rõ khác biệt chính đáng.
- **Privacy/trust AC** cho mọi data của người khác — toạ độ chính xác, danh sách attendee, thông tin liên hệ (§4).
- **i18n AC** cho mọi màn hình có chuỗi mới (§5). **Time AC** cho mọi thứ có mốc thời gian (§6).
- Mỗi AC-ID nên map 1-1 tới ≥1 test case qa-tester sẽ sinh (TC-ID).

---

## 4. Options-with-trade-offs — khi đề xuất cải thiện

Khi user hỏi "nên làm thế nào", trình bày dạng này (rồi recommend 1):

```markdown
## Phương án cho <vấn đề>

### Option A — <tên> ⭐ (Recommend)
- **Cách làm:** …
- **Ưu:** … · **Nhược:** … · **Chi phí:** dev <S/M/L>, UX …, SEO …, parity …, vận hành …
- **Vì sao recommend:** <bám giá trị cho expat mới tới / an toàn khi gặp người lạ / ma sát tạo hoạt động thấp>

### Option B — <tên>
- … (tương tự)

### Option C — <không làm / hoãn sang giai đoạn sau>
- …

**Khuyến nghị:** Option A, vì … Quyết định cuối thuộc về bạn nếu đánh đổi <X> quan trọng.
```
