---
description: Mọi số liệu và biểu đồ trên dashboard/report của console kiểm duyệt phải có tooltip giải thích (đếm cái gì, tính thế nào, cạm bẫy đã biết) ở CẢ hai locale.
---

# Tooltip Cho Số Liệu Dashboard — Mỗi Con Số Tự Giải Thích

> Quyết định của chủ sản phẩm: dashboard phải "biểu thị chi tiết từng thông số",
> và điều đó được ghi thành rule để mọi màn hình dashboard/report dựng sau đều
> theo cùng một chuẩn mà không cần nhắc lại.

## Quy tắc

Khi dựng hoặc sửa BẤT KỲ bề mặt dashboard / report / analytics nào của console
vận hành (`apps/web-admin-side/src/app/[locale]/**` — stat tile, thẻ biểu đồ, con số
KPI, badge phần trăm, phễu chuyển đổi), mỗi số liệu hiển thị BẮT BUỘC có tooltip
giải thích:

1. **Đếm cái gì** — đúng tập hợp được đếm ("người dùng RSVP rồi thực sự check-in",
   không phải "người tham dự").
2. **Tính thế nào** — bảng/tín hiệu nguồn, cách chia khung ngày (theo ngày local
   `Asia/Ho_Chi_Minh`, dữ liệu lưu UTC), mẫu số của mọi giá trị `%`.
3. **Cạm bẫy đã biết** — chỗ nào là ước lượng, mốc bắt đầu đo ("chỉ tính từ ngày
   tính năng check-in lên production"), phần bị loại trừ (sự kiện do curator nhập
   tay, tài khoản test), giới hạn của số liệu ẩn danh.

## Ví dụ đúng cho các số liệu Giai đoạn 1

| Số liệu | Tooltip phải nói rõ |
|---|---|
| Sự kiện tạo mới | Chỉ tính occurrence đã publish; loại sự kiện do curator nhập tay nếu có cờ riêng |
| Tỉ lệ RSVP → tham dự | Mẫu số là RSVP `going` tại thời điểm sự kiện bắt đầu, không phải tổng RSVP từng có |
| Tỉ lệ no-show | Chỉ đo được ở sự kiện có organizer quét check-in; sự kiện không check-in bị loại khỏi mẫu số |
| Hàng đợi kiểm duyệt | Đếm report `open`, không tính report đã gộp trùng |
| Phân bố theo khu vực | Sự kiện thiếu toạ độ được gán theo `area_id` khai báo, có thể lệch với vị trí thực |
| Phân bố tier tin cậy | Snapshot tại thời điểm truy vấn; `trust_score` được tính lại theo job nên có độ trễ |

## Khuôn triển khai (React 19 + Tailwind + i18n)

```tsx
<StatTile
  label={t('admin.metrics.rsvpConversion')}
  hint={t('admin.metrics.rsvpConversionHint')}
  value={formatPercent(data.rsvpConversion)}
/>
```

- Đặt tên key: `<namespace>.<screen>.<metricName>Hint` nằm ngay cạnh key nhãn
  `<namespace>.<screen>.<metricName>` (vd `admin.metrics.noShowRate` +
  `admin.metrics.noShowRateHint`).
- Thẻ biểu đồ: bọc phần `title` của card bằng đúng cơ chế tooltip đó.
- Cập nhật `packages/i18n/en.json` VÀ `packages/i18n/vi.json` trong cùng một thay
  đổi (quy tắc i18n chuẩn).
- Tooltip phải trung thực về chất lượng dữ liệu — nếu một con số là ước lượng thì
  nói thẳng là ước lượng và vì sao.
- Tooltip phải truy cập được bằng bàn phím (`aria-describedby`), không chỉ hiện
  khi hover.

## Bổ sung vào Definition of Done

Task dashboard/report CHƯA done nếu còn số liệu hoặc biểu đồ nào thiếu tooltip.
Mục checklist cho reviewer/tester:

```
□ Mọi stat tile / tiêu đề biểu đồ trên màn vừa sửa đều có tooltip giải thích
□ Key hint tồn tại ở CẢ en.json và vi.json
□ Nội dung hint nêu tập hợp + cách tính + cạm bẫy (không chỉ chép lại nhãn)
```

## Nơi đặt code tham chiếu

Component tooltip dùng chung đặt tại `packages/ui` để cả các màn report sau này
tái sử dụng; màn dashboard đầu tiên đặt tại
`apps/web-admin-side/src/features/analytics/components/`. Khi dựng màn đầu tiên, làm chuẩn luôn
để các màn sau chỉ việc sao khuôn.
