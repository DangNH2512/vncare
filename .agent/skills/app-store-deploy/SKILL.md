---
name: app-store-deploy
description: Phát hành bản native iOS mới của apps/mobile (Da Nang Connect) lên App Store (build -> upload ASC -> version record -> release notes -> Submit for Review), và publish OTA an toàn. Dùng cho mọi yêu cầu "submit to App Store", "deploy mobile", "đẩy bản mới lên App Store", "build 1.0.x", hoặc publish OTA. Mã hoá sẵn các bẫy version-regression, OTA-env và ASC API.
allowed-tools: Read, Bash, Edit
---

# App Store Deploy — Runbook phát hành iOS (Da Nang Connect)

> **Trạng thái:** repo đang là greenfield — `apps/mobile/` và bản ghi App Store
> Connect có thể chưa tồn tại. Runbook này vừa là checklist **thiết lập lần đầu**
> vừa là quy trình cho mọi lần phát hành sau đó. Mọi giá trị trong ngoặc `<...>`
> phải đọc từ file thật (`apps/mobile/app.json`, `apps/mobile/eas.json`) hoặc từ
> App Store Connect, **không được bịa**.
>
> **Không bao giờ tự chạy** build/submit/OTA/commit/push khi chưa có phê duyệt rõ
> ràng của người dùng. Luôn báo cáo giữa các bước không thể hoàn tác.
>
> **Khoá version (quy tắc của chủ dự án):** marketing version (`expo.version`,
> dạng x.y.Z) **CHỈ chủ dự án quyết định**. Agent không bao giờ được đổi nếu người
> dùng chưa duyệt đúng con số — kể cả khi version hiện tại đã "cháy" (đã submit
> một build mang số đó); trường hợp đó phải DỪNG và hỏi. Chỉ **build number**
> (`ios.buildNumber`) được phép tăng, qua `autoIncrement` của profile. Không được
> lách cổng kiểm tra version bằng cách gọi thẳng `eas build` cho profile prod.

## Hằng số của dự án (đọc từ repo, đừng nhớ thuộc lòng)

| Hạng mục | Giá trị | Đọc ở đâu |
|---|---|---|
| Tên hiển thị | **Da Nang Connect** | `apps/mobile/app.json` -> `expo.name` |
| iOS bundle identifier | `app.danangconnect` | `apps/mobile/app.json` -> `expo.ios.bundleIdentifier` |
| Android package | `app.danangconnect` | `apps/mobile/app.json` -> `expo.android.package` |
| ASC app id | `<ascAppId>` | App Store Connect, hoặc `apps/mobile/eas.json` -> `submit.*.ios.ascAppId` |
| Apple Team ID | `<appleTeamId>` | Apple Developer -> Membership |
| EAS project | `@<eas-account>/danang-connect` | `apps/mobile/app.json` -> `expo.extra.eas.projectId` + `eas.json` |
| ASC API key | `apps/mobile/keys/AuthKey_<KEYID>.p8` | **không commit** — giữ ngoài git, khai qua biến môi trường |

```bash
# Lấy hằng số thật thay vì đoán
python3 -c "import json;d=json.load(open('apps/mobile/app.json'))['expo'];print(d['name'],d['version'],d['ios'])"
grep -n "ascAppId\|appleTeamId\|channel\|runtimeVersion" apps/mobile/eas.json
```

> Bí mật (`.p8`, service account Android, token EAS) **không bao giờ** nằm trong
> git. Thêm `apps/mobile/keys/` vào `.gitignore` và nạp qua EAS secrets / biến
> môi trường CI.

## Bước 0 — Pre-flight (LUÔN LUÔN, trước khi build)

1. **Đọc trạng thái thật từ ASC** (đừng tin bộ đếm của EAS hay tên của version record):
   - Version đang live + build thực sự đang gắn vào nó:
     `GET /v1/apps/<ascAppId>/appStoreVersions?filter[appStoreState]=READY_FOR_SALE&include=build`.
     Cảnh báo: **tên** của version record có thể khác chuỗi version trong binary
     (record ghi "1.0.0" nhưng binary là 1.0.2, runtime 1.0.1) — và chính runtime
     của binary đó mới quyết định OTA chạm tới ai.
   - Build number cao nhất + processingState:
     `GET /v1/builds?filter[app]=<ascAppId>&sort=-uploadedDate`.
2. **Chọn version (cổng chống tụt version):** `version` mới trong `app.json` phải
   **>= version cao nhất đã dùng trên TestFlight hoặc live** — KHÔNG BAO GIỜ thấp
   hơn (tụt version => tàu TestFlight đóng băng, cổng semver trong
   `ops/deploy-prod-mobile.sh` sẽ fail).
3. **Build number** tự tăng từ `app.json` (nguồn local) và phải `>` số cao nhất trên ASC.
4. **Quyền của app phải khớp tính năng đang có** — sự kiện gần bạn cần
   `NSLocationWhenInUseUsageDescription`, ảnh sự kiện cần
   `NSPhotoLibraryUsageDescription`, push cần capability Push Notifications.
   Thiếu chuỗi mô tả bằng tiếng Anh là lý do bị Apple từ chối phổ biến nhất.

## Bước 1 — Build binary

- **MẶC ĐỊNH = build LOCAL** (ưu tiên hơn cloud để tiết kiệm credit EAS). Chuẩn
  của team: compile IPA ngay trên máy Mac này, không đẩy lên server EAS:
  `eas build --profile production --platform ios --local --non-interactive --output ./build/dnc-prod-X.Y.Z.ipa`
  (hoặc chạy `ops/deploy-prod-mobile.sh --local`, script này bọc sẵn cổng kiểm
  tra version/build-number + compile `--local` + submit). Yêu cầu máy có Xcode +
  CocoaPods + Fastlane. IPA cũ nằm ở `apps/mobile/build/dnc-prod-*.ipa`.
  **Chỉ rơi về cloud** (`eas build …` không có `--local`) khi toolchain local
  không dùng được hoặc người dùng yêu cầu rõ — cloud tiêu tốn credit build EAS.
- Cloud dự phòng: `eas build --profile production --platform ios --non-interactive`
  (chạy nền, ~6–10 phút).
- Lệnh build tăng `ios.buildNumber` trong `app.json` **trên đĩa** -> **phải commit
  thay đổi đó** (`chore(mobile): prod build X.Y.Z (NNN)`), nếu không một checkout
  sạch sẽ build lại đúng số cũ -> "already submitted".
- Binary nhúng env từ build profile trong **eas.json** -> API URL đúng.
  (OTA mới là đường nguy hiểm — xem Bước 5.)
- Build từ code đã commit (EAS đóng gói git HEAD ở local). Commit tính năng trước.

## Bước 2 — Upload lên ASC (an toàn, chưa phải "review")

- `eas submit --platform ios --id <buildId> --profile testflight --non-interactive`.
- Bước này chỉ đưa binary vào ASC (Builds/TestFlight). Apple xử lý ~5–15 phút ->
  build chuyển sang `VALID`. Nó **không** submit for review.

## Bước 3 — Version record trên ASC (phải KHỚP version của binary)

- Một version record chỉ cho phép gắn build có `CFBundleShortVersionString` ==
  `versionString` của record. Build 1.0.3 => record phải là **1.0.3**.
- **Không thể xoá version không phải bản đầu tiên** (`DELETE` -> 409 "Only the
  first version of any platform can be deleted"; giao diện web cũng không có nút
  xoá). Muốn sửa draft sai số thì **PATCH**:
  `PATCH /v1/appStoreVersions/{id}` với body
  `{"data":{"type":"appStoreVersions","id":"…","attributes":{"versionString":"1.0.3"}}}`
  (chỉ khi đang ở trạng thái `PREPARE_FOR_SUBMISSION`).

## Bước 4 — Metadata + Submit for Review (người dùng thao tác trên ASC UI)

- Điền **"What's New in This Version"** (bắt buộc với bản cập nhật). Viết trung
  thực, an toàn khi review; không quảng cáo tính năng đã gỡ. Bản tiếng Anh là bắt
  buộc (người dùng chính là expat); bản tiếng Việt là localization thứ hai.
- **Export Compliance**: chỉ dùng HTTPS => chọn "None of the algorithms…" / No.
- **App Privacy / nhãn quyền riêng tư** phải khớp thực tế: vị trí gần đúng (lọc
  sự kiện theo khu vực), danh tính người dùng, ảnh do người dùng tải lên, định
  danh thiết bị cho push. Sai lệch với thực tế là lý do bị từ chối.
- **Nội dung do người dùng tạo (UGC)** — Apple Guideline 1.2 bắt buộc app có UGC
  phải có: bộ lọc nội dung, cơ chế báo cáo (report), cơ chế chặn người dùng, và
  kênh liên hệ để xử lý báo cáo trong 24 giờ. Đảm bảo cả bốn thứ này có trong
  build trước khi submit, nếu không sẽ bị reject.
- **Tài khoản demo cho reviewer**: app yêu cầu đăng nhập nên phải cung cấp
  tài khoản demo còn hoạt động + vài sự kiện mẫu đã seed, kèm hướng dẫn RSVP.
- Chọn build -> **Add for Review -> Submit for Review** -> Apple review ~24–48h.
- **Người dùng nhận bản mới thế nào:** qua **cập nhật App Store** (tự động nếu
  bật "Automatic App Updates", nếu không thì thủ công). Bản native submit
  **KHÔNG** kích hoạt popup "Restart now" trong app — popup đó chỉ có ở OTA.

## Bước 5 — OTA (`eas update`) — xử lý cẩn trọng

- OTA chỉ chạm tới binary có **cùng runtimeVersion + channel**. Xác minh người
  dùng thật đang ở runtime nào (Bước 0.1) trước khi giả định độ phủ.
- **BẪY ENV:** `eas update --environment production` đọc **EAS *environment***
  (biến trên server), KHÔNG phải env của build profile trong eas.json. Nếu
  environment đó thiếu `EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_SOCKET_URL`, bundle JS
  sẽ rơi về `localhost` -> **toàn bộ thiết bị thật mất dữ liệu**. Trước khi
  publish: `eas env:list production` phải chứa đủ mọi biến `EXPO_PUBLIC_*` có
  trong `build.production.env` của eas.json; thiếu thì thêm bằng
  `eas env:create --environment production --name … --value … --visibility plaintext`.
- **Thử OTA trên TestFlight trước**, rồi mới publish:
  `eas update --branch production --environment production --message "<ghi chú cho người dùng>"`.
- **Rollback khẩn cấp:**
  `eas update:roll-back-to-embedded --branch production --runtime-version <X.Y.Z> --platform all --message "…"`
  (cờ đúng là `--runtime-version`). Đưa client về bundle nhúng trong binary.

## Bước 6 — Push notification phải còn sống sau khi phát hành

Da Nang Connect dựa vào Expo Push cho nhắc sự kiện và cập nhật RSVP. Sau mỗi bản
native mới, kiểm tra ngay:

- APNs key trên ASC còn hạn và đúng team; `expo-notifications` vẫn xin quyền được.
- Đăng nhập trên thiết bị thật -> backend nhận `ExpoPushToken` mới (token đổi
  theo cài đặt lại app; token cũ phải được dọn để tránh lỗi `DeviceNotRegistered`).
- Bắn 1 push thử tới chính thiết bị đó và xác nhận deep link mở đúng màn hình sự kiện.

## Done = bằng chứng

- Build `VALID` trên ASC + version record khớp + (nếu OTA) một thiết bị TestFlight
  hiển thị dữ liệu thật và đúng bundle mới + push thử nhận được. Đi kèm skill
  `screenshot-evidence`. Báo cáo Status/Files/Risks theo Output Contract của worker.
