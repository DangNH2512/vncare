---
description: /teach — Cổng học sau task. Claude đóng vai người dạy và kiểm tra bạn đã thật sự hiểu thứ vừa xây (checklist + active recall + quiz). Opt-in; không bao giờ chặn việc ship.
---

# /teach — Teach-Back

Chạy skill Teach-Back: [`.agent/skills/teach-back/SKILL.md`](../skills/teach-back/SKILL.md).

Đây là cổng *hiểu bài của con người*, tách khỏi cổng "Done" của code (typecheck +
xác minh web/mobile/API). Nó không bao giờ chặn việc ship. Ngoài lệnh này, nó còn có
thể tự khởi động — khi bạn xin giải thích bằng ngôn ngữ tự nhiên, hoặc khi Claude
phát hiện task có rủi ro hiểu sai cao và chủ động đề nghị (xem quy tắc trigger trong
skill).

## Cách dùng

- `/teach` — dạy lại task vừa xong.
- `/teach <chủ đề>` — dạy một năng lực cụ thể hoặc một thay đổi trong quá khứ.

## Nó làm gì

1. Dựng checklist từ BA Requirement Brief + phần "Root Cause" của báo cáo + diff.
2. Yêu cầu bạn tự phát biểu lại cách hiểu trước (active recall).
3. Dạy từng bước — xác nhận bạn nắm rồi mới đi tiếp.
4. Ra câu hỏi bằng `AskUserQuestion` (đáp án ẩn cho tới khi bạn nộp; vị trí phương án
   đúng được xáo trộn).
5. Kết thúc khi bạn đã chứng minh hiểu mọi mục trong checklist.
