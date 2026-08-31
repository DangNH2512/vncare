---
name: webapp-testing
description: Bộ công cụ tương tác và kiểm thử ứng dụng web chạy local bằng Playwright. Hỗ trợ xác minh chức năng frontend, debug hành vi UI, chụp ảnh màn hình trình duyệt và xem log console.
license: Điều khoản đầy đủ trong LICENSE.txt
---

# Web Application Testing

Để test ứng dụng web chạy local, viết script Playwright bằng Python thuần.

> **Ghi chú cho Da Nang Connect:** skill này dùng để **thăm dò và debug bằng
> trình duyệt** (chụp màn hình, dò selector, đọc console). Test hồi quy chính
> thức của `apps/web` là spec TypeScript trong `apps/web/e2e/` — xem
> [qa-tester](../qa-tester/SKILL.md). Đừng dùng script Python ở đây để thay thế
> bộ e2e đó.
>
> Cổng mặc định của dự án: **web `http://localhost:3000`** (Next.js App Router,
> `apps/web`) và **API `http://localhost:3001`** (NestJS, `apps/api`). Locale mặc
> định là `en`, nên URL thật có dạng `/en/events`.

**Script hỗ trợ có sẵn**:
- `scripts/with_server.py` — quản lý vòng đời server (hỗ trợ nhiều server cùng lúc)

**Luôn chạy script với `--help` trước** để xem cách dùng. ĐỪNG đọc source cho tới khi đã thử chạy script và thấy rằng bắt buộc phải có giải pháp tuỳ biến. Các script này có thể rất dài, đọc vào sẽ làm ô nhiễm context window. Chúng tồn tại để được gọi trực tiếp như hộp đen, không phải để nạp vào context.

## Cây quyết định: chọn cách tiếp cận

```
Task của user → Có phải HTML tĩnh không?
    ├─ Có → Đọc thẳng file HTML để xác định selector
    │         ├─ Được → Viết script Playwright dùng selector đó
    │         └─ Hỏng / thiếu → Xử lý như app động (bên dưới)
    │
    └─ Không (webapp động) → Server đã chạy sẵn chưa?
        ├─ Chưa → Chạy: python scripts/with_server.py --help
        │          Rồi dùng helper + viết script Playwright rút gọn
        │
        └─ Rồi → Trinh sát rồi mới hành động:
            1. Điều hướng và chờ networkidle
            2. Chụp màn hình hoặc soi DOM
            3. Xác định selector từ trạng thái đã render
            4. Thực thi hành động với selector vừa tìm được
```

## Ví dụ: dùng with_server.py

Để khởi động server, chạy `--help` trước, rồi dùng helper:

**Một server (chỉ web):**
```bash
python scripts/with_server.py --server "pnpm --filter @dnc/web dev" --port 3000 -- python your_automation.py
```

**Nhiều server (API + web — trường hợp thường gặp của Da Nang Connect):**
```bash
python scripts/with_server.py \
  --server "pnpm --filter @dnc/api dev" --port 3001 \
  --server "pnpm --filter @dnc/web dev" --port 3000 \
  -- python your_automation.py
```

Khi viết script tự động hoá, chỉ đưa vào phần logic Playwright (server đã được quản lý tự động):
```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)  # Always launch chromium in headless mode
    # Mobile viewport is the default for this product: most expats browse on a phone.
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.goto('http://localhost:3000/en/events')  # Server already running and ready
    page.wait_for_load_state('networkidle')  # CRITICAL: Wait for JS to execute
    # ... your automation logic
    browser.close()
```

## Pattern trinh sát rồi hành động

1. **Soi DOM đã render**:
   ```python
   page.screenshot(path='/tmp/inspect.png', full_page=True)
   content = page.content()
   page.locator('[data-testid="event-card"]').all()
   ```

2. **Xác định selector** từ kết quả vừa soi

3. **Thực thi hành động** bằng selector đã tìm được

## Luồng thật của Da Nang Connect để bám theo

Bốn luồng dưới đây là bề mặt hay phải debug nhất ở Giai đoạn 1. Dùng chúng làm
kịch bản mẫu thay vì ví dụ chung chung.

**Feed sự kiện → lọc theo khu vực.** Feed mặc định trả về sự kiện sắp diễn ra;
bật một khu vực phải thu hẹp danh sách và giữ được trạng thái khi tải lại trang.
```python
page.goto('http://localhost:3000/en/events')
page.wait_for_load_state('networkidle')
before = page.locator('[data-testid="event-card"]').count()

# Six areas ship in phase 1: an-thuong, my-khe, my-an, hai-chau, son-tra, ngu-hanh-son.
page.get_by_test_id('area-filter-an-thuong').click()
page.wait_for_load_state('networkidle')
after = page.locator('[data-testid="event-card"]').count()
print(f'events before filter: {before}, after An Thuong filter: {after}')

# The active filter must survive a reload (it lives in the URL, not only in state).
page.reload()
page.wait_for_load_state('networkidle')
assert 'area=an-thuong' in page.url
```

**Chi tiết sự kiện.** Mở thẻ đầu tiên trong feed và kiểm tra các phần thông tin
bắt buộc đã render: thời gian, khu vực, sức chứa.
```python
page.get_by_test_id('event-card').first.click()
page.wait_for_load_state('networkidle')
page.wait_for_selector('[data-testid="event-detail-title"]')
page.screenshot(path='/tmp/event-detail.png', full_page=True)
```

**RSVP khi chưa đăng nhập.** Khách bấm RSVP phải bị đưa sang trang đăng nhập, không
phải im lặng không làm gì.
```python
cta = page.get_by_test_id('event-rsvp-cta')
cta.click()
page.wait_for_url(lambda url: '/login' in url, timeout=5000)
```

**RSVP khi đã đầy chỗ → waitlist.** Với sự kiện hết chỗ, nút phải chuyển sang trạng
thái waitlist thay vì báo lỗi. Đây là chỗ hay lỗi nhất, luôn chụp màn hình để đối
chiếu bằng mắt.
```python
page.goto('http://localhost:3000/en/events/<slug-of-a-full-event>')
page.wait_for_load_state('networkidle')
state = page.get_by_test_id('event-rsvp-cta').get_attribute('data-state')
print(f'RSVP button state: {state}')  # expect: waitlist
page.screenshot(path='/tmp/rsvp-waitlist.png')
```

> ⚠️ **Đừng assert bằng chuỗi hiển thị.** Locale mặc định là EN nhưng có cả VI —
> assert theo `data-testid` / `role`, còn khi cần kiểm tra bản dịch thì mở thẳng
> `/vi/events` và so với file message tương ứng.

## Cạm bẫy thường gặp

❌ **Đừng** soi DOM trước khi chờ `networkidle` trên app động
✅ **Nên** chờ `page.wait_for_load_state('networkidle')` rồi mới soi

## Thực hành tốt

- **Dùng script đóng gói như hộp đen** — trước khi làm gì, cân nhắc xem script nào trong `scripts/` đã giải quyết được việc đó. Các script này xử lý những luồng phức tạp, thường gặp một cách đáng tin cậy mà không làm rối context window. Dùng `--help` để xem cách dùng, rồi gọi trực tiếp.
- Dùng `sync_playwright()` cho script đồng bộ
- Luôn đóng browser khi xong
- Dùng selector mô tả rõ: `text=`, `role=`, CSS selector, hoặc ID — với `apps/web` thì ưu tiên `data-testid` vì nó không đổi theo locale
- Thêm wait phù hợp: `page.wait_for_selector()` hoặc `page.wait_for_timeout()`
- Chạy với viewport mobile (390×844) trước; desktop chỉ là biến thể
- Dữ liệu test phải là seed rõ ràng (prefix `qa_`), không đụng vào dữ liệu người dùng thật

## File tham chiếu

- **examples/** — ví dụ các pattern thường gặp:
  - `element_discovery.py` — dò button, link và input trên một trang
  - `static_html_automation.py` — dùng URL `file://` cho HTML local
  - `console_logging.py` — bắt log console trong lúc chạy tự động hoá
