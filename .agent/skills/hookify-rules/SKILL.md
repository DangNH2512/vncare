---
name: hookify-rules
description: Biến một quy tắc của dự án hay bị vi phạm thành hook Claude Code cưỡng chế được. Dùng khi một quy tắc hành vi bị bỏ sót nhiều lần và nhắc nhở không còn đủ — chuyển "nhớ giùm nhé" thành cổng chặn tất định (PreToolUse/PostToolUse) hoặc grep gate.
allowed-tools: Read, Write, Bash
---

# Hookify Rules — From Reminders to Enforcement

> **Nguồn / Xuất xứ:** Phỏng theo plugin `hookify` của Anthropic
> `claude-plugins-official` (skill writing-rules + sinh hook):
> https://github.com/anthropics/claude-plugins-official/tree/main/plugins/hookify
> Quy tắc của repo hiện nằm dạng văn xuôi trong `.agent/rules/`; hook biến những
> quy tắc không thương lượng thành thứ không thể bỏ qua. Chạy song song với hook
> PreToolUse của RTK đã cấu hình sẵn trong `~/.claude/settings.json`.

## When to run

- Một quy tắc trong `.agent/rules/` hoặc `behaviors.md` bị vi phạm nhiều hơn một lần.
- Bạn muốn quy tắc được cưỡng chế tất định thay vì trông chờ vào trí nhớ.

## Ứng viên hookify tốt (của dự án này)

| Quy tắc | Cách cưỡng chế |
|---|---|
| Không truy vấn DB thô trong Service | grep gate: chặn `query(\`...\`)` nội suy chuỗi trong `apps/api/src/**/*.service.ts` |
| Truy vấn theo khu vực/bán kính phải dùng PostGIS | grep gate: chặn công thức Haversine tự viết (`Math.acos`, `6371`) trong `apps/api/src` — bắt dùng `ST_DWithin` |
| Thời gian lưu UTC | grep gate: chặn `timestamp without time zone` trong file migration; bắt dùng `timestamptz` |
| Khoá i18n phải đồng bộ `en`/`vi` | PostToolUse: sau khi sửa `en.json`, so số khoá với `vi.json`, lệch thì cảnh báo |
| Không hardcode chuỗi hiển thị | grep gate: chặn literal tiếng Việt/tiếng Anh trong JSX của `apps/web`/`apps/mobile` ngoài lời gọi `t()` |
| Bí mật không được commit | PreToolUse: chặn ghi vào `apps/mobile/keys/`, `*.p8`, `*.keystore`, `.env` (không phải `.env.example`) |
| Mọi mutation phải ghi audit log | review prompt: service có mutation mà không gọi hàm ghi audit log |
| Endpoint UGC phải có luồng report | review prompt: thêm controller tạo nội dung do người dùng tạo mà không có endpoint report tương ứng |
| File > 500 dòng phải tách | PostToolUse: cảnh báo khi file vừa sửa vượt 500 dòng |
| Done = đã xác nhận trên luồng thật | hook nhắc khi báo "done/complete" mà không có bằng chứng test |

## Quy trình

1. **Phát biểu quy tắc** thành một mệnh đề kiểm chứng được ("truy vấn theo bán
   kính trong `apps/api` phải dùng PostGIS, không tự tính khoảng cách bằng JS").
2. **Chọn trigger** — `PreToolUse` (chặn trước khi sửa sai), `PostToolUse` (cảnh
   báo sau), hoặc cổng Stop/finish (chặn báo "done" khi chưa có bằng chứng).
3. **Viết một kiểm tra tất định** — ưu tiên script/grep nhỏ trả exit khác 0 kèm
   thông điệp rõ ràng. Giữ cho nhanh (hook chạy ở mọi lượt gọi tool khớp điều kiện).
4. **Khoanh phạm vi chặt** — chỉ khớp đúng đường dẫn/lệnh cần thiết để tránh
   nhiễu; hook nổ liên tục sẽ bị tắt.
5. **Đăng ký** vào cấu hình hook của repo (theo đúng pattern `.claude/hooks` /
   `settings.json` đang có). Không được làm hỏng hook rewrite của RTK.
6. **Kiểm thử** — chạy một hành động ĐÁNG LẼ phải bị chặn và một hành động không
   được chặn; xác nhận đúng hành vi block/allow.

## Ví dụ cổng chặn (tự tính khoảng cách thay vì dùng PostGIS)

```bash
# exit 2 để chặn; in lý do ra stderr
if grep -rqnE "6371|Math\.acos\(|haversine" apps/api/src 2>/dev/null; then
  echo "BLOCKED: tự tính khoảng cách trong JS. Dùng PostGIS ST_DWithin trên cột geography để lọc sự kiện theo bán kính/khu vực." >&2
  exit 2
fi
```

## Ví dụ cổng chặn (khoá i18n lệch giữa en và vi)

```bash
# chạy ở PostToolUse sau khi sửa file locale
for app in apps/web apps/mobile; do
  en="$app/src/locales/en.json"; vi="$app/src/locales/vi.json"
  [ -f "$en" ] && [ -f "$vi" ] || continue
  diff <(python3 -c "import json,sys;print('\n'.join(sorted(json.load(open(sys.argv[1])))))" "$en") \
       <(python3 -c "import json,sys;print('\n'.join(sorted(json.load(open(sys.argv[1])))))" "$vi") \
    >/dev/null || { echo "WARN: khoá i18n lệch giữa en.json và vi.json trong $app" >&2; }
done
```

## Output

Một hook (hoặc grep gate) đã đăng ký và đã kiểm thử + một dòng ghi chú trong
`behaviors.md` rằng quy tắc đó nay được máy cưỡng chế. Báo cáo: loại trigger,
nó chặn cái gì, và kết quả test allow/block.
