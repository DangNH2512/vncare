---
name: resource-discovery
description: Tìm giải pháp mã nguồn mở, thư viện và tài liệu đã có trước khi tự viết từ đầu. Dùng bất cứ khi nào một tính năng cần thư viện, tích hợp hoặc khuôn mẫu mà bạn chưa từng dùng — tìm tài nguyên tốt nhất đang có, đánh giá nó, rồi mới quyết định tự viết / dùng luôn / sửa lại mà dùng. Tránh phát minh lại bánh xe và bắt sớm các API do mô hình bịa ra.
allowed-tools: Read, Bash, WebFetch
---

# Resource Discovery — Tìm trước khi tự viết

> **Nguồn / xuất xứ:**
> - Khuôn mẫu GitHub MCP Server (tìm repo, phân tích code) → https://github.com/github/github-mcp-server
> - Exa MCP Server (tìm code/tài liệu theo ngữ nghĩa) → https://github.com/exa-labs/exa-mcp-server
> - Firecrawl MCP Server (scrape/trích xuất tài liệu) → https://github.com/firecrawl/firecrawl-mcp-server
> - modelcontextprotocol/servers (danh mục MCP server tham chiếu) → https://github.com/modelcontextprotocol/servers

## Khi nào chạy

- Trước khi với tay lấy một thư viện: "Có package npm nào được bảo trì tốt cho X không?"
- Trước khi cài đặt một khuôn mẫu: "Các dự án NestJS khác xử lý Y thế nào?"
- Những điểm dự án này hay đụng phải: hàm hỗ trợ PostGIS/geography cho
  TypeORM, xử lý iCalendar/lặp lại cho sự kiện, mức độ tương đồng tính năng giữa
  `react-leaflet` và `react-native-maps`, vòng đời Expo Push token, và các thư viện
  i18n giữ cho hai bộ `en`/`vi` đồng bộ.
- Khi gặp một API không có tài liệu hoặc một trường hợp biên của thư viện.
- Trước khi thêm một MCP server mới: kiểm tra xem đã có sẵn cái nào chưa.
- Trước khi tự viết một tiện ích từ đầu: tìm trên GitHub/npm trước đã.

## Vì sao việc này quan trọng

LLM hay bịa API và nhớ nhầm cách dùng package. Kiểm tra **nguồn thật, phiên bản hiện hành**
(README trên GitHub, changelog, chính source code) mất 2 phút nhưng tiết kiệm hàng giờ gỡ lỗi.

---

## Bước 1 — Xác định rõ bạn đang tìm gì

Nói chính xác trước khi tìm:
1. **Vấn đề:** một câu ("định dạng giờ bắt đầu sự kiện theo `Asia/Ho_Chi_Minh`
   từ một cột lưu UTC, bên trong một service của NestJS").
2. **Ràng buộc:** ngôn ngữ/runtime, license cần có, mức "cũ" chấp nhận được của lần bảo trì gần nhất.
3. **Kết quả mong muốn:** chọn thư viện để dùng / khuôn mẫu để sao chép / tài liệu để đọc.

---

## Bước 2 — Tìm trên GitHub (kênh chính)

```bash
# Search repos by keyword + language
curl -s "https://api.github.com/search/repositories?q=<keyword>+language:typescript&sort=stars&per_page=5" \
  | python3 -c "import json,sys; [print(r['full_name'], r['stargazers_count'], r['pushed_at'][:10], r.get('archived')) for r in json.load(sys.stdin)['items']]"

# Search code inside a known org
curl -s "https://api.github.com/search/code?q=<pattern>+org:nestjs" \
  | python3 -c "import json,sys; [print(r['repository']['full_name'], r['path']) for r in json.load(sys.stdin).get('items',[])]"

# Fetch a specific file (README, source)
curl -s "https://raw.githubusercontent.com/<owner>/<repo>/main/README.md" | head -60

# Get package.json to check peer dependencies / version
curl -s "https://raw.githubusercontent.com/<owner>/<repo>/main/package.json" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('version'), list(d.get('dependencies',{}).keys()))"
```

---

## Bước 3 — Soi npm / kiểm tra package

```bash
# Check if package exists and its latest version
npm info <package-name> version description homepage | head -5

# Inspect if compatible with current stack
npm info <package-name> peerDependencies

# Check bundle size via bundlephobia
curl -s "https://bundlephobia.com/api/size?package=<package-name>@latest" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('gzip:', d.get('gzip'), 'size:', d.get('size'))"
```

---

## Bước 4 — Đánh giá trước khi dùng

Chấm điểm từng ứng viên theo:

| Tiêu chí | Kiểm tra gì |
|-----------|-------|
| **Còn được bảo trì** | Commit gần nhất dưới 6 tháng, issue mở có người trả lời |
| **Tương thích** | Chạy được với Node 20+, NestJS 11, TypeORM, Next.js 15 / React 19, Expo SDK 54 / React Native 0.81, TypeScript strict |
| **License phù hợp** | MIT / Apache-2.0 / BSD (mở file `LICENSE` ra xem, đừng tin mỗi dòng ghi trong README) |
| **Kích thước hợp lý** | Không lấy dependency 200KB cho một tiện ích 3 dòng; ưu tiên loại tree-shakable |
| **Không dính CVE đã biết** | Chạy `npm audit` sau khi cài; hoặc tra tại `https://snyk.io/vuln/npm:<pkg>` |
| **Có kiểu TypeScript** | Có `@types/<pkg>` hoặc tự kèm `.d.ts` |

**Ma trận quyết định:**
- Đạt ≥ 4 tiêu chí → dùng luôn
- Đạt 2–3 tiêu chí → sửa lại mà dùng (copy + cắt gọn + tự chịu trách nhiệm bảo trì)
- Đạt < 2 tiêu chí → tự viết từ đầu, và ghi rõ lý do

---

## Bước 5 — Lấy tài liệu thật

Với tài liệu của nhà cung cấp, hãy tải đúng trang thật thay vì dựa vào trí nhớ của mô hình:

```bash
# Fetch raw markdown docs (faster, no JS render needed)
curl -s "https://raw.githubusercontent.com/typeorm/typeorm/master/docs/analysis/03-domain-va-du-lieu.md" | head -80

# For rendered pages, use WebFetch tool
# WebFetch: https://docs.nestjs.com/techniques/configuration
```

Đọc **changelog** của đúng phiên bản bạn sẽ cài — đừng đọc tài liệu mới nhất nếu bạn đang
dùng một phiên bản cũ hơn.

---

## Bước 6 — Tìm MCP server sẵn có (khi mở rộng năng lực của agent)

Trước khi dựng một MCP connector mới, kiểm tra xem đã có sẵn cái nào chưa:

```bash
# Check official MCP catalog
curl -s "https://api.github.com/repos/modelcontextprotocol/servers/git/trees/main?recursive=1" \
  | python3 -c "import json,sys; t=json.load(sys.stdin)['tree']; [print(e['path']) for e in t if 'src/' in e['path'] and e['path'].endswith('/README.md')]"

# Check what this repo already registered
cat .agent/mcp/README.md 2>/dev/null | head -20
```

Nếu vẫn cần tự dựng, chuyển sang skill [`mcp-builder`](../mcp-builder/SKILL.md).

---

## Kết quả bàn giao

Một **kết luận về tài nguyên** cho từng ứng viên:
- Tài nguyên được chọn (tên, URL, phiên bản, license)
- Vì sao chọn (đạt những tiêu chí nào)
- Cách dùng nó trong stack của dự án
- Nếu không có gì phù hợp: "tự viết từ đầu — lý do là..."

Không bao giờ bỏ qua bước này với bất kỳ quyết định thư viện nào không tầm thường.
