# Maestro (mobile) — patterns Da Nang Connect

> Flow mobile sống ở `apps/mobile/.maestro/flows/<area>/*.yaml`. App Expo 54 /
> React Native 0.81. `appId` và URL scheme lấy từ `apps/mobile/app.json`
> (quy ước: `com.danangconnect.mobile`, scheme `danangconnect://`) — **kiểm tra
> app.json trước khi viết flow**, đừng chép giá trị trong tài liệu này một cách mù quáng.
> Env dùng chung khai báo ở `apps/mobile/.maestro/config.yaml`.

---

## Cấu trúc 1 flow

```yaml
appId: com.danangconnect.mobile
name: <area>-<case>            # vd events-rsvp-success
tags:
  - smoke
  - <area>
---
# 1) (nếu cần data) provision user + sự kiện qua API — idempotent
- runScript:
    file: ../../scripts/api-seed.js
    env:
      MAESTRO_API_URL: ${API_URL}
      MAESTRO_TEST_IDENTIFIER: ${TEST_USER_IDENTIFIER}
      MAESTRO_TEST_PASSWORD: ${TEST_USER_PASSWORD}
      MAESTRO_TEST_DISPLAY_NAME: ${TEST_USER_DISPLAY_NAME}
      MAESTRO_TEST_AREA: an-thuong

# 2) đăng nhập qua sub-flow dùng chung
- runFlow:
    file: ../_shared/login.yaml
    env:
      IDENTIFIER: ${TEST_USER_IDENTIFIER}
      PASSWORD: ${TEST_USER_PASSWORD}

# 3) assert bằng testID (KHÔNG assert bằng chuỗi hiển thị — locale EN/VI đổi được)
- assertVisible:
    id: "tab-events"
- assertNotVisible:
    id: "auth-screen"
```

---

## Sub-flow dùng chung (`_shared/`)

- **`_shared/login.yaml`** — `launchApp clearState:true` + grant permissions +
  dismiss dialog iOS + nhập thông tin đăng nhập + submit. Tái dùng mọi flow cần đăng nhập.
- **`_shared/grant-permissions.yaml`** — launch với `permissions: all: allow`.
- **`_shared/deny-permissions.yaml`** — launch với location/notification bị từ chối,
  để test nhánh fallback (chọn khu vực bằng tay, không có push).
- **`_shared/set-locale.yaml`** — đổi ngôn ngữ EN↔VI trong Settings, dùng cho các
  flow parity i18n.

Reuse, đừng copy các bước đăng nhập vào từng flow.

---

## Quy tắc cứng (mobile-specific)

1. **Tab navigation KHÔNG dùng `tapOn id: tab-*`.** Expo Router không fire `onPress`
   trong ngữ cảnh này. Dùng **deep link**:
   ```yaml
   - openLink: danangconnect://events
   ```
   Cùng cơ chế đó test được deep-link từ push notification:
   `danangconnect://events/<id>`.

2. **iOS hay popup dialog** (permission, Dictation, "Not Now") chen giữa flow →
   dismiss optional:
   ```yaml
   - tapOn:
       text: "Not Now"
       optional: true
   ```
   Đặt sau launch và sau `inputText` đầu tiên.

3. **Permission là một phần của test, không phải nhiễu.** App xin **location** (lọc
   sự kiện quanh đây) và **notification** (nhắc sự kiện, waitlist được promote). Mỗi
   feature dùng 2 quyền này cần **2 flow**: allow và deny. Deny KHÔNG được làm app kẹt.

4. **Assert bằng `testID`**, không bằng toạ độ và không bằng chuỗi hiển thị (locale
   đổi được). Thiếu testID ở component → thêm vào source hoặc ghi "cần testID" trong
   test-case doc.

5. **`extendedWaitUntil`** cho phần tử load chậm (danh sách sự kiện, bản đồ, ảnh):
   ```yaml
   - extendedWaitUntil:
       visible:
         id: "event-card-0"
       timeout: 15000
   ```
   Bản đồ `react-native-maps` load tile bất đồng bộ → đừng assert ngay sau khi mở màn.

6. **`clearState: true`** ở flow đăng nhập để test session sạch; flow test
   session-persist thì KHÔNG clear.

7. **App trỏ API theo `EXPO_PUBLIC_API_URL`.** Để test với backend local cần
   `apps/mobile/.env.local` trỏ localhost + `API_URL` tương ứng trong `config.yaml`.
   Ghi rõ pre-req này trong test-case doc — nếu không bạn đang test môi trường khác.

8. **Ngôn ngữ:** flow mặc định chạy locale **EN**. Feature có chữ thì thêm một flow
   `<case>-vi.yaml` dùng `_shared/set-locale.yaml` để bắt thiếu key + tràn layout.

---

## Chạy / verify trên simulator — ⚠️ Maestro XCUITest hay chết → dùng idb

- **Syntax-validate flow** (không cần sim): `maestro test --dry-run <file>`, hoặc chỉ
  commit flow đã viết để user chạy. (Generate-only: mặc định KHÔNG tự chạy.)
- **"Test nhanh bằng mắt" = idb**, KHÔNG rebuild: đăng nhập + scroll +
  screenshot/quay video bằng `idb`. Maestro XCUITest driver hay chết trên máy này →
  idb là đường tin cậy.
- **Screenshot sim:** `xcrun simctl io booted screenshot /tmp/dnc-sim.png` → `Read` ngay.
- **idb gotcha:** text gõ rớt đuôi → chunk ≤4 ký tự; bản "iPhone 16 Pro" hay treo,
  dùng "iPhone 16".
- **Verify trước khi claim "fix đã apply":** `console.log('[marker]')` thấy trong log
  Metro (`/tmp/dnc-metro.log`) HOẶC screenshot thấy visual mới HOẶC idb test behavior.
  "Code đã save, sẽ apply qua Fast Refresh" = OK nói. "Fix đã apply" = cần evidence.
- **Worklet edits** (reanimated/gesture-handler) cần force reload
  (`curl -X POST http://localhost:8081/reload`) — Fast Refresh KHÔNG đủ.

---

## Coverage map (parity với web)

Mỗi feature test web (Playwright) **nên** có flow Maestro tương ứng. Theo dõi trong
`apps/mobile/.maestro/README.md` (bảng Coverage). Khi sinh flow mới: cập nhật bảng +
đánh dấu ✅/⏳.

Thư mục area theo giai đoạn 1 (kết nối cộng đồng):

```
auth/            đăng ký, đăng nhập, social login, refresh token, đăng xuất
onboarding/      chọn khu vực + sở thích, cấp/từ chối quyền vị trí
events/          feed, tìm kiếm, lọc theo khu vực & bán kính, chi tiết sự kiện
event-creation/  tạo sự kiện, chờ duyệt, sửa, huỷ
rsvp/            RSVP, huỷ RSVP, waitlist, được promote, no-show
profile/         hồ sơ, trust level, chỉnh sửa, quyền riêng tư
moderation/      báo cáo vi phạm, chặn/bỏ chặn người dùng
notifications/   push nhắc sự kiện, deep-link từ push
settings/        đổi ngôn ngữ EN/VI, thông báo, xoá tài khoản
```

Thêm flow vào đúng area (tạo area mới khi sang giai đoạn nhà ở / y tế).
