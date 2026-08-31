---
name: skill-creator
description: Tạo, chỉnh sửa và đánh giá định lượng các skill của dự án. Dùng khi thêm một SKILL.md mới, cải thiện skill sẵn có, hoặc đo xem một skill có kích hoạt và chạy ổn định hay không. Biến chất lượng skill từ "cảm tính" thành eval đo được kèm phân tích độ dao động.
allowed-tools: Read, Write, Edit, Bash
---

# Skill Creator — Dựng và đo chất lượng skill

> **Nguồn / xuất xứ:** Phỏng theo Anthropic `skills/skill-creator`
> (https://github.com/anthropics/skills/tree/main/skills/skill-creator) và đặc tả
> Agent Skills chính thức (https://github.com/anthropics/skills/tree/main/spec).
> Đây là **đòn bẩy chất lượng** của dự án: một skill chỉ được coi là "xong" khi nó
> đã được đo, chứ không phải khi nó đọc thấy xuôi tai.

## Khi nào chạy

- Tạo mới `.agent/skills/<name>/SKILL.md`.
- Cải thiện độ chính xác khi kích hoạt của một skill sẵn có (nó nổ quá hiếm / quá thường).
- Trước khi đưa bất kỳ skill nào vào bảng trigger trong `skill-triggers.md`.

## Vòng lặp (không được bỏ bước đo)

1. **Khoanh phạm vi** — một câu: skill làm gì + đúng tín hiệu nào sẽ kích hoạt nó.
   Nếu phải viết hai câu, tách thành hai skill.
2. **Viết nháp** — soạn `SKILL.md`:
   - Frontmatter: `name` (kebab-case, trùng tên thư mục), `description`
     (mở đầu bằng động từ + mệnh đề "Dùng khi ..." nêu rõ trigger), tùy chọn `allowed-tools`.
   - Thân bài: các bước đánh số, ví dụ bám sát dự án (NestJS / Next.js / Expo),
     và một mục "Kết quả bàn giao" cụ thể.
3. **Prompt kiểm thử** — viết 5–8 prompt thực tế: một số PHẢI kích hoạt skill,
   một số gần giống nhưng KHÔNG được kích hoạt. Lưu tại
   `.agent/skills/<name>/evals/prompts.md`.
4. **Chạy + chấm** — chạy từng prompt; ghi đạt/không đạt theo tiêu chí nghiệm thu.
   Một skill nổ nhầm ở các prompt gần giống thì cũng hỏng ngang với skill không bao giờ nổ.
5. **Kiểm tra độ dao động** — chạy lại các prompt ranh giới 3 lần mỗi cái. Nếu kết quả
   lật qua lật lại giữa các lần chạy thì `description` hoặc phần các bước còn mơ hồ — siết lại.
6. **Tối ưu description** — `description` chính là trigger. Đưa động từ và mệnh đề
   "Dùng khi" lên đầu; bỏ chữ thừa. Chạy lại bước 4.
7. **Lặp** cho tới khi tỉ lệ đạt và hành vi kích hoạt ổn định, rồi đăng ký skill vào
   [`skill-triggers.md`](../../rules/skill-triggers.md) và danh sách skill trong AGENT.md.

## Ngưỡng chất lượng (định nghĩa "xong" cho một skill)

- [ ] `name` trùng khớp chính xác tên thư mục.
- [ ] `description` nêu một động từ + một điều kiện kích hoạt không nhập nhằng.
- [ ] Các bước tham chiếu đường dẫn/khuôn mẫu thật của dự án, không phải lời khuyên chung chung.
- [ ] Có mục "Kết quả bàn giao" / định nghĩa "xong".
- [ ] Đã có prompt eval và tỉ lệ đạt được ghi lại thành tài liệu.
- [ ] Kích hoạt đúng ở các prompt mục tiêu và KHÔNG kích hoạt ở các prompt gần giống.

## Kết quả bàn giao

Một skill đã đăng ký, đã được đo, kèm thư mục `evals/` ghi lại bộ prompt và tỉ lệ đạt
đo được. Báo cáo gồm: độ chính xác khi kích hoạt, tỉ lệ đạt, và mọi độ dao động phát hiện được.
