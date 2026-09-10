---
name: modern-ui-design
description: Thiết kế và triển khai UI khác biệt, đạt chuẩn production cho Da Nang Connect — tránh thẩm mỹ "AI slop" chung chung. Dùng khi xây bất kỳ trang, component, dashboard hay màn hình mobile nào mà chất lượng thiết kế có ý nghĩa. Áp dụng cho apps/web-client-side và apps/web-admin-side (Next.js 16 + React 19 + Tailwind CSS) và apps/mobile (Expo 54 + React Native 0.81). Chốt một hướng thẩm mỹ dứt khoát trước khi động vào code.
allowed-tools: Read, Write, Edit, Bash, WebFetch
---

# Modern UI Design — Giao diện khác biệt, đạt chuẩn production

> **Nguồn / xuất xứ:**
> - Anthropic `skills/frontend-design` → https://github.com/anthropics/skills/tree/main/skills/frontend-design
> - Anthropic `claude-plugins-official/frontend-design` → https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design
> - Koomook/claude-frontend-skills (cách tiếp cận 4 chiều) → https://github.com/Koomook/claude-frontend-skills
> - nexu-io/open-design (pattern hợp đồng DESIGN.md) → https://github.com/nexu-io/open-design

## Khi nào chạy

- Xây trang, màn hình, modal, dashboard hoặc section marketing mới.
- Style lại component đang trông "generic/nhạt".
- Review UI của một tính năng trước khi đánh dấu Done.
- Tạo màn hình mobile trong `apps/mobile`.

**Màn hình lõi của Giai đoạn 1 cần chất lượng cao nhất:** event feed, event
detail, bộ lọc theo khu vực (có bản đồ), hồ sơ người dùng có độ tin cậy.

---

## Bước 1 — Chốt hướng thẩm mỹ TRƯỚC khi code

Trả lời những câu này trước khi viết dòng CSS/JSX đầu tiên:

1. **Ai dùng?** (expat mới tới Đà Nẵng dùng điện thoại ngoài đường, host tổ chức
   sự kiện, moderator ngồi desktop duyệt nội dung)
2. **Mục tiêu cảm xúc?** (đáng tin + an toàn, thân thiện + dễ bắt chuyện, nhanh +
   hiệu quả)
3. **Chọn ĐÚNG MỘT hướng** và đặt tên cho nó — ví dụ:
   - `coastal-bright` — sáng, thoáng, tông biển/cát của Đà Nẵng, ảnh phủ tràn viền
   - `clean-operational` — mật độ dày, nền đơn sắc, điểm nhấn là một màu thương hiệu
     duy nhất (phù hợp màn hình kiểm duyệt và vận hành)
   - `warm-community` — bo tròn, tông ấm, chi tiết thủ công, ưu tiên avatar và
     khuôn mặt người thật để tạo cảm giác cộng đồng
   - `editorial` — chữ lớn, lưới bất đối xứng, tương phản mạnh, khung ảnh kiểu tạp chí

**LUẬT:** Do dự sinh ra mặc định nhạt nhoà. Chốt rồi thực thi chính xác.

---

## Bước 2 — Ngữ cảnh design system của Da Nang Connect

Luôn kiểm tra và bám token đang có trước khi tự bịa token mới:

```bash
# Web tokens — client (người dùng cuối)
sed -n '1,60p' apps/web-client-side/src/app/globals.css 2>/dev/null
cat apps/web-client-side/tailwind.config.ts 2>/dev/null
grep -rn "--color-\|theme(" apps/web-client-side/src/styles 2>/dev/null | head -20

# Web tokens — admin (đội ngũ vận hành)
sed -n '1,60p' apps/web-admin-side/src/app/globals.css 2>/dev/null
cat apps/web-admin-side/tailwind.config.ts 2>/dev/null

# Mobile theme
cat apps/mobile/constants/Colors.ts 2>/dev/null
cat apps/mobile/constants/theme.ts 2>/dev/null
```

**Ràng buộc stack:**
- **Web** — cả `apps/web-client-side` lẫn `apps/web-admin-side` đều dùng Next.js 16
  App Router, React 19, Tailwind CSS. Khai báo màu/khoảng cách/bo góc dưới dạng CSS
  custom properties trong `globals.css` rồi map vào `tailwind.config.ts`; tránh style
  inline và tránh rải hex khắp nơi. Hai app dùng chung token qua `packages/ui`.
- **Khác biệt client vs admin** — `apps/web-client-side` cần SEO/SSR và tối ưu đọc
  trên di động ngoài nắng; `apps/web-admin-side` KHÔNG cần SEO (đặt `robots: noindex`),
  ưu tiên bảng biểu đầy đủ chức năng và thao tác hàng loạt, vẫn responsive nhưng ưu
  tiên desktop vì người vận hành dùng máy tính.
- **Mobile** — Expo 54 + React Native 0.81; dùng `StyleSheet.create`, tôn trọng
  safe-area insets, hỗ trợ cả light/dark (`useColorScheme`).
- **Bản đồ** — MapLibre trên `apps/web-client-side`, `react-native-maps` trên mobile. Marker,
  cluster và popup phải dùng chung token màu với phần còn lại của app.

---

## Bước 3 — Checklist chống "AI slop" (TUYỆT ĐỐI không làm)

- ❌ Chỉ dùng Inter / Roboto / Arial làm font duy nhất
- ❌ Gradient tím-trên-trắng và gọi đó là "modern"
- ❌ Mọi card đều cùng một border-radius và shadow
- ❌ Bố cục hero canh giữa → 3 cột card → CTA footer
- ❌ "Loading..." mà không có skeleton hay progressive reveal
- ❌ Mọi nút đều là `primary` màu xanh
- ❌ Icon đồng kích thước, khoảng cách đều tăm tắp = lưới buồn tẻ
- ❌ Ảnh sự kiện dùng placeholder stock vô hồn — dùng ảnh thật hoặc gradient có
  chủ đích kèm nhãn danh mục

---

## Bước 4 — 4 chiều thiết kế (áp cho mọi màn hình)

### Typography
- Dùng **tương phản độ đậm**: ghép nhãn siêu nhẹ (100–200) với giá trị rất đậm (700–900).
- Web: chọn cặp Google Font có cá tính (ví dụ `DM Serif Display` cho tiêu đề +
  `DM Sans` cho body) và nạp qua `next/font`.
- Mobile: dùng `expo-font` để nạp font thương hiệu; số liệu đậm, metadata nhẹ.
- **Bẫy song ngữ:** font phải phủ đủ dấu tiếng Việt. Kiểm tra chuỗi
  "Ngũ Hành Sơn · Mỹ Khê" ở mọi weight trước khi chốt font.

### Color
- Một tông trung tính chủ đạo + **đúng một màu nhấn có chủ ý** (màu thương hiệu).
- Token ngữ nghĩa: `--color-surface`, `--color-on-surface`, `--color-accent-subtle`.
- Trạng thái miền cũng phải có token riêng, không hardcode: RSVP going / interested /
  waitlisted, nội dung đang chờ kiểm duyệt, badge trust level (new / verified / trusted).
- Không bao giờ rải mã hex trong component.

### Motion (khi có ý nghĩa)
- Web: chuyển trang và reveal biểu đồ bằng Framer Motion; `view-transition` cho
  điều hướng từ feed sang chi tiết sự kiện.
- Mobile: `react-native-reanimated` với `FadeIn`/`SlideInDown` khi mount màn hình.
- **Luật:** một animation lúc tải trang có chủ đích > mười hiệu ứng hover rải rác.

### Bố cục không gian
- Phá lưới một cách có chủ ý: ảnh header tràn viền, stat card lệch trục, CTA bất đối xứng.
- Mật độ theo ngữ cảnh: bảng kiểm duyệt trong `apps/web-admin-side` = dày (nhiều dữ
  liệu, thao tác hàng loạt); feed sự kiện và trang chi tiết trong
  `apps/web-client-side` = thoáng (dễ đọc ngoài nắng, một tay).
- Dùng khoảng trắng như một yếu tố thiết kế, không phải chỗ độn.

---

## Bước 5 — Pattern triển khai (Web client, Next.js + Tailwind)

> Các màn hình ví dụ dưới đây (feed sự kiện, thẻ sự kiện, bộ lọc khu vực) thuộc
> `apps/web-client-side`. Với `apps/web-admin-side`, xem ghi chú mật độ ở Bước 4.

```tsx
// ✅ Token-driven, không ad-hoc — apps/web-client-side/src/app/globals.css
// :root {
//   --color-surface: #FFFFFF;
//   --color-on-surface: #17222B;
//   --color-accent: #0E7C86;         /* teal biển — màu thương hiệu */
//   --color-accent-subtle: #E6F4F5;
//   --radius-card: 0.75rem;
// }

// ✅ Skeleton trước khi có dữ liệu
{isLoading ? <EventCardSkeleton count={4} /> : <EventFeed events={events} />}

// ✅ Tương phản độ đậm trên thẻ sự kiện
<article className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
  <p className="text-[11px] font-light uppercase tracking-[0.14em] text-[var(--color-on-surface)]/60">
    {t('event.card.area', { area: areaName })}
  </p>
  <h3 className="mt-1 text-2xl font-bold text-[var(--color-on-surface)]">{event.title}</h3>
  <RsvpBadge status={event.myRsvpStatus} spotsLeft={event.spotsLeft} />
</article>

// ✅ Bộ lọc khu vực: chip + bản đồ dùng chung một nguồn state
<AreaFilterChips
  areas={['my-khe', 'an-thuong', 'my-an', 'hai-chau', 'son-tra', 'ngu-hanh-son']}
  value={areaSlug}
  onChange={setAreaSlug}
/>
```

---

## Bước 6 — Pattern triển khai (Mobile, Expo + React Native)

```tsx
// ✅ Hiệu ứng vào màn bằng Reanimated
import Animated, { FadeInDown } from 'react-native-reanimated';
<Animated.View entering={FadeInDown.delay(100).springify()}>
  <EventCard event={event} />
</Animated.View>

// ✅ Tương phản độ đậm trong React Native
<Text style={{ fontSize: 11, fontWeight: '300', letterSpacing: 1.5, textTransform: 'uppercase' }}>
  {t('event.detail.startsAt')}
</Text>
<Text style={{ fontSize: 24, fontWeight: '700' }}>
  {formatInTimeZone(event.startsAt, 'Asia/Ho_Chi_Minh', 'EEE d MMM · HH:mm')}
</Text>
```

---

## Bước 7 — Tự review trước khi Done

- [ ] Hướng thẩm mỹ đã được đặt tên và nhất quán trên mọi màn hình trong PR này.
- [ ] Không hardcode màu ngoài file token/theme.
- [ ] Có ít nhất một khoảnh khắc chuyển động có chủ đích.
- [ ] Responsive (hoặc layout native đúng chuẩn nếu là mobile).
- [ ] i18n: mọi chuỗi hiển thị đều qua `t('key')`, có đủ bản `en` và `vi`;
      EN là ngôn ngữ mặc định, VI là ngôn ngữ thứ hai.
- [ ] Ngày giờ hiển thị theo `Asia/Ho_Chi_Minh` dù dữ liệu lưu UTC.
- [ ] Chuỗi tiếng Việt có dấu không bị vỡ layout hay tràn dòng ở mọi breakpoint.
- [ ] Dark mode không làm hỏng thiết kế (web: token dark; mobile: `useColorScheme`).
- [ ] Trạng thái rỗng có nội dung thật: "Chưa có sự kiện nào ở An Thượng tuần này"
      kèm CTA tạo sự kiện, không phải một ô xám trống.
- [ ] Chạy skill webapp-testing để xác nhận luồng UI trên trình duyệt thật.

## Đầu ra

Tên hướng thẩm mỹ + code chạy được + một câu lý do cho từng quyết định thiết kế
lớn (chọn token, chuyển động, cách phá lưới). Không chỉ nói "trông đẹp" — phải nói TẠI SAO.
