---
name: verification-before-completion
description: Chạy skill này trước khi tuyên bố bất kỳ task nào đã xong. "Run the test. Read the output. THEN claim."
---

# Verification Before Completion

> **⚠️ KHÔNG BAO GIỜ tuyên bố task hoàn thành chỉ dựa trên việc đọc code.**
> Phải chạy verification thật và quan sát output thật trước khi mark done.

---

## The Core Rule — Reality Is Oracle

```
Write code → Run it → Read actual output → THEN claim it works

NOT:
Write code → "This should work" → Mark done  ← FORBIDDEN
NOT:
typecheck passes → "Must be working" → Mark done   ← ALSO FORBIDDEN
```

> **Spec / code reading là giả thuyết.** Sự thật là cái user thấy khi mở app.
> Mở browser, đi flow thật, đọc console/network. Chi tiết: `.agent/rules/observe-reality.md`.

### Screenshot discipline
1. Chụp screenshot → **Read file ngay** → verify nội dung thật.
2. File name = nhãn, **nội dung ảnh = sự thật**.
3. Ảnh ≠ expectation → report "evidence invalid", không claim "verified".

### Triangulate trước khi claim done
So 3 nguồn — phải khớp:
```
UI (browser / thiết bị — cái user thấy)
     ↕  khớp?
API response (DevTools Network / curl)
     ↕  khớp?
DB thật (psql — kể cả cột PostGIS)
```
Lệch bất kỳ đâu = chưa done.

### Behavior-smells sweep
Trước khi mark done, quét nhanh checklist (chi tiết ở
[behavior-smells/SKILL.md](../behavior-smells/SKILL.md)):
- [ ] Số/trạng thái UI từ server hay default state? (useState-lie)
- [ ] Giờ hiển thị đúng `Asia/Ho_Chi_Minh`, dữ liệu lưu UTC?
- [ ] RSVP đồng thời ở chỗ cuối có vượt `capacity` không?
- [ ] Huỷ RSVP có promote đúng 1 người từ hàng đợi chờ không?
- [ ] Truy vấn bán kính dùng `geography` + mét, thứ tự `(lng, lat)` đúng?
- [ ] Key i18n có đủ ở cả `en` và `vi`? Push dùng locale người nhận?
- [ ] Push có idempotency key — chạy lại job không gửi trùng?
- [ ] PII enforce ở tầng API (guard + DTO allow-list), không chỉ ẩn ở UI?
- [ ] Mutation có `AuditLogService.log()` đủ actor/action/entityId?
- [ ] Realtime reconcile-on-reconnect?

---

## Mobile / native — không có browser để mở

Checklist phía dưới giả định có browser. Với `apps/mobile` (Expo) thì không: mỗi
lần đổi UI là một vòng build 15–30 phút rồi phải nhờ user bấm hộ. Đọc code để kết
luận UI mobile đúng/sai **luôn thất bại** ở đúng một chỗ: vùng bấm và layout chỉ
lộ ra khi chạy thật. Đọc đúng route, đúng handler, đúng import mà nút vẫn không
bấm được là chuyện bình thường — vì vấn đề nằm ở thứ không đọc được từ code.

**Luật:**

1. **Không được kết luận UI mobile đúng/sai bằng cách đọc code.** Chỉ có 2 loại
   bằng chứng hợp lệ: (a) test component chạy được, (b) ảnh chụp/lời xác nhận từ
   thiết bị thật.
2. **Repo không có test harness thì dựng harness trước, đừng vá mò.** Một lần
   `jest-expo` + `@testing-library/react-native` đổi lấy vô số vòng build. Kiểm
   bằng:
   ```bash
   grep -E '"(jest|@testing-library/react-native)"' apps/mobile/package.json
   ```
   Rỗng thì đây là việc phải làm đầu tiên, không phải việc "để sau".
3. **Hỏi user phép thử tách đôi vấn đề TRƯỚC, không phải sau vài vòng đoán.**
   Ví dụ trong Da Nang Connect: nút "Join" và toàn bộ card sự kiện thường dùng
   chung một handler điều hướng — hỏi *"bấm vào thân card có mở được trang sự
   kiện không?"* tách ngay **lỗi vùng bấm** khỏi **lỗi điều hướng**. Câu hỏi đó
   mất 2 giây; bỏ qua nó tốn 2 vòng build.
4. **App phải hiện version + build number.** Không có thì mỗi lần user báo lỗi
   lại tốn một vòng chỉ để biết họ đang chạy bản nào.
5. **Xác minh bản vá thật sự nằm trong build, trước khi chờ 20 phút.**
   `eas build --local` đóng gói *thư mục làm việc* (kể cả thay đổi chưa commit)
   khi `cli.requireCommit` không bật — nhưng đừng tin suông, soi thẳng vào bản
   nó giải nén ra:

   ```bash
   W=$(ls -dt ${TMPDIR}eas-build-local-nodejs/*/build/mobile | head -1)
   grep -n "<đoạn code vừa sửa>" "$W/src/.../Screen.tsx"
   ```

   Rẻ hơn nhiều so với build xong, submit, chờ Apple, rồi mới phát hiện bản vá
   không có trong đó.
6. **Push notification phải test trên thiết bị thật.** Simulator/emulator không
   nhận Expo Push. Không có ảnh chụp thông báo trên máy thật thì chưa verify được
   luồng push — và nhớ kiểm cả *số lượng* thông báo nhận được, không chỉ nội dung
   (gửi trùng là lỗi hay gặp nhất, xem behavior-smells mục 7).

---

## Pipeline nhiều chặng — mỗi chặng cần bằng chứng riêng

Chặng N thành công **không phải** bằng chứng cho chặng N+1. Càng không phải bằng
chứng cho việc đã chọn đúng đích.

Bẫy điển hình: `eas submit` in ra *"successfully uploaded"* nên agent kết luận
"bundle khớp ⇒ đúng app" và **huỷ bước đối chiếu mà chính agent vừa yêu cầu user
làm**. Thực tế Apple tách 2 chặng — upload chỉ kiểm file/chữ ký, processing mới
kiểm bundle id. Kết luận sai, mất thêm nhiều vòng.

| Chặng | Bằng chứng hợp lệ |
|---|---|
| Build | file artifact tồn tại + đọc ngược nội dung ra |
| Upload | CLI báo uploaded |
| **Processing** | **trạng thái trên ASC/Play**, không suy từ upload |
| **Hiển thị cho tester** | **nhìn thấy build đúng số trong TestFlight** |

**Luật cứng:** đã yêu cầu user kiểm chứng thì **không được tự huỷ yêu cầu đó**
chỉ vì có tín hiệu yếu hơn nghe thuận tai. Tín hiệu yếu không thay thế được phép
kiểm đã đề ra.

---

## Đọc payload lỗi, đừng đọc bản tóm tắt

Công cụ hay nuốt nguyên nhân thật và in ra câu vô nghĩa.

`eas build` in `Unknown error` cho nhiều loại sự cố khác hẳn nhau. Nguyên nhân
thật nằm trong trường **`err`** của log (trường `msg` thường rỗng), và log **nén
brotli** — `curl` thường tải về ra rác, `gzip` không giải được:

```bash
URL=$(eas build:view <id> --json | python3 -c "import sys,json;print(json.load(sys.stdin)['logFiles'][0])")
curl -sS "$URL" -o /tmp/b.br && brotli -d -c /tmp/b.br | python3 -c "
import sys,json
for l in sys.stdin:
    d=json.loads(l)
    if d.get('level',0)>=40: print(d.get('err') or d.get('msg'))"
```

Lớp lỗi hay gặp nhất trong monorepo pnpm: `package.json does not exist in
.../build/mobile` — do `.easignore` ở gốc repo là allow-list và quên cho qua
`apps/mobile` cùng các `packages/*` mà nó phụ thuộc (`@dnc/api-client`,
`@dnc/i18n`).

**Luật:** gặp "Unknown error" thì đào tới payload máy đọc được. Đừng đổ cho hạ
tầng khi chưa đọc được nguyên nhân — lỗi hạ tầng không tái lập y hệt 2 lần liền.

---

## Kiểm quy ước sẵn có TRƯỚC khi chọn cách làm

Trước khi dựng một đường build/deploy mới, đọc `ops/` và app anh em trong repo.

Bẫy điển hình: agent đi đường `xcodebuild archive` (chết vì máy không có cert của
team), rồi đường EAS cloud (tốn credit) — trong khi script trong `ops/` đã chốt
`eas build --local` từ lâu, có comment ghi rõ lý do. `--local` giải cả hai vấn đề:
compile tại máy nhưng kéo chứng chỉ từ EAS.

```bash
grep -rn "eas build\|xcodebuild\|fastlane" ops/ 2>/dev/null | head
```

---

## Verification Checklist (chạy theo thứ tự)

### 1. Typecheck + lint
```bash
pnpm --filter @dnc/api typecheck
pnpm --filter @dnc/web-client typecheck
pnpm --filter @dnc/web-admin typecheck  # nếu có đụng apps/web-admin-side
pnpm --filter @dnc/mobile typecheck   # nếu có đụng apps/mobile
```
**Đọc output.** Có lỗi → sửa trước khi đi tiếp. Zero errors = ✅

### 2. Browser Verification (BẮT BUỘC với `apps/web-client-side` và `apps/web-admin-side`)
Mở browser (`apps/web-client-side` ở `http://localhost:3000`, `apps/web-admin-side` ở
cổng dev riêng của nó), đi tới page bị ảnh hưởng, mô phỏng đúng flow người dùng —
người dùng cuối với client, người vận hành với admin:

| Loại task | Verify gì trong browser |
|-----------|-------------------------|
| Feature mới | Đi trọn flow từ đầu đến cuối |
| Bug fix | Tái lập bug gốc → confirm không còn xảy ra |
| Đổi UI | Kiểm ở cả desktop 1280px và mobile 375px |
| Đổi trạng thái sự kiện | Trigger transition → verify mọi chỗ hiển thị đều đổi theo |
| RSVP / hàng đợi chờ | Join tới khi đầy → người tiếp theo phải vào hàng đợi chờ; huỷ 1 → đúng 1 người được promote |
| Realtime (socket.io) | Mở 2 tab → RSVP ở tab này → tab kia phải cập nhật số người |
| Tìm kiếm theo khu vực | Lọc theo từng khu vực và theo bán kính → đối chiếu với dữ liệu thật trong DB |

**Ghi lại cái thật sự nhìn thấy** — không phải cái mình kỳ vọng.

### 3. API Verification
```bash
# Verify dữ liệu đã thực sự được ghi
curl -s "http://localhost:3001/api/v1/events/<id>" | jq
curl -s "http://localhost:3001/api/v1/events?area=an-thuong" | jq '.items | length'
```
So response API với cái UI hiển thị. Phải khớp chính xác.

Với truy vấn địa lý, đối chiếu thẳng dưới DB — đừng tin con số trên UI:
```sql
SELECT id, title,
       ST_Distance(location, ST_MakePoint(:lng, :lat)::geography) AS meters
FROM events
WHERE ST_DWithin(location, ST_MakePoint(:lng, :lat)::geography, 2000)
ORDER BY meters;
```
Kiểm hai biên: điểm cách ~1999 m phải có, ~2001 m phải không có.

### 4. Cross-Screen Check
Nếu sửa component/hook dùng chung:
```bash
# Tìm mọi file import file vừa đổi:
grep -rn "from.*<ChangedFileName>" apps/web-client-side/src apps/web-admin-side/src --include="*.tsx" -l
```
Mở TỪNG màn hình consumer và confirm không regression.

Màn hình luôn phải spot-check:
- `/[locale]/events` — danh sách sự kiện
- `/[locale]/events/[id]` — chi tiết sự kiện + RSVP
- `/[locale]/discover?area=an-thuong` — tìm kiếm & lọc theo khu vực
- `/[locale]/me/rsvps` — RSVP của tôi

### 5. i18n Check
```bash
# Chuỗi hiển thị hardcode (phải trả về 0)
grep -rn "\"[A-Z][a-z]" apps/web-client-side/src/app apps/web-admin-side/src/app --include="*.tsx" | grep -v "//\|t(\|import\|className"

# Key lệch giữa 2 locale (phải trả về rỗng)
diff <(jq -r 'paths(scalars) | join(".")' packages/i18n/src/en.json | sort) \
     <(jq -r 'paths(scalars) | join(".")' packages/i18n/src/vi.json | sort)
```
Đổi ngôn ngữ UI sang tiếng Việt → confirm mọi text đều dịch (không còn raw key),
rồi đổi lại tiếng Anh → confirm không vỡ layout (chuỗi VI thường dài hơn EN).

### 6. E2E (nếu áp dụng)
```bash
pnpm --filter @dnc/web-client test:e2e -- <relevant-spec>  # Playwright, apps/web-client-side/e2e/**
pnpm --filter @dnc/web-admin test:e2e -- <relevant-spec>   # Playwright, apps/web-admin-side/e2e/**
pnpm --filter @dnc/api test:e2e -- <relevant-spec>   # apps/api/e2e/**
```
**Đọc output.** Đếm pass/fail. Phải pass hết trước khi mark done.

---

## Common "I Thought It Worked" Traps

| Trap | Cách tránh |
|------|-----------|
| "typecheck pass, chắc ổn" | Typecheck chỉ kiểm kiểu — phải chạy thật |
| "Đọc code thấy đúng mà" | Đọc ≠ chạy — execute nó |
| "Lần trước chạy được" | Code đã đổi từ đó — verify lại |
| "Chỉ sửa tí xíu" | Thay đổi nhỏ phá thứ lớn — vẫn phải verify |
| "Socket sẽ tự cập nhật UI" | Mở 2 tab và thật sự nhìn nó cập nhật |
| "E2E pass là xong" | Có kiểm thủ công trên UI chưa? E2E có điểm mù |
| "Đọc code thấy handler nối đúng rồi" | Vùng bấm / layout chỉ lộ khi chạy. Mobile: dựng component test hoặc xin ảnh từ thiết bị |
| "Giờ hiển thị đúng trên máy tôi" | Máy bạn đang ở `Asia/Ho_Chi_Minh`. Test với máy đặt múi giờ khác |
| "Capacity check có trong service rồi" | Chạy 2 request song song ở chỗ cuối cùng mới biết |
| "Bán kính lọc trông hợp lý" | Đối chiếu `ST_Distance` dưới DB. `geometry` + `2000` là 2000 **độ**, không phải mét |
| "Push gửi thành công" | Đếm số thông báo nhận được trên máy thật — retry hay tạo bản trùng |
| "UI đã ẩn field nhạy cảm" | `curl` thẳng endpoint. Ẩn ở UI không phải là enforce |
| "Upload thành công ⇒ đã lên TestFlight" | Upload ≠ processing ≠ hiện cho tester. Mỗi chặng một bằng chứng |
| "Có tín hiệu này rồi, khỏi cần kiểm bước kia" | Đã đề ra phép kiểm thì phải chạy. Tín hiệu yếu không thay thế được |
| "Unknown error ⇒ lỗi hạ tầng" | Đọc trường `err` trong log. Hạ tầng không hỏng tái lập y hệt 2 lần |
| "Cứ dựng đường build mới cho nhanh" | `grep -rn "eas build" ops/` trước — quy ước có thể đã tồn tại |
| "User bảo vẫn lỗi ⇒ bản vá sai" | Hỏi số build đang cài trước. Bản vá chỉ có trong build mới |

---

## Output Report Template (sau khi verify)

```
✅ [Task Name] — DONE

**Root Cause:** (chỉ với bug) Vì sao nó hỏng, 1-2 câu.

**Verified:**
- Typecheck: 0 errors ✅
- Browser: [page đã mở, flow đã đi, cái thật sự nhìn thấy]
- API: [endpoint đã gọi, response đã đối chiếu]
- DB: [truy vấn đã chạy — gồm cả kiểm biên PostGIS nếu có đụng truy vấn địa lý]
- Cross-screen: [màn hình đã kiểm hoặc "N/A — không đụng component dùng chung"]
- i18n: en + vi đồng bộ ✅ / "N/A — không thêm chuỗi hiển thị"
- E2E [spec]: X/Y passing ✅

**Watch out for:** [edge case hoặc chỗ khác có cùng pattern]
```
