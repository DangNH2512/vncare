---
trigger: always_on
description: Luôn quét kho skill của dự án và tuyên bố skill áp dụng TRƯỚC khi bắt tay vào bất kỳ task nào.
---

# Skill-First — Quét Skill Trước, Làm Sau

Kho skill trong `.agent/skills/` (symlink `.claude/skills/`) là kiến thức đã được
chốt của dự án. Bỏ qua nó nghĩa là làm lại từ đầu một quy trình đã có, theo cách
tệ hơn. Rule này siết mặc định "nạp lười" của
[skill-triggers.md](skill-triggers.md): router vẫn quyết định nạp *file nào*, còn
rule này bắt buộc **bước quét phải xảy ra**, mọi task, không cần từ khoá.

## S1 — Bắt buộc ở mỗi task

Trước tool call đầu tiên có tính thay đổi (`Edit` / `Write` / `Bash` ghi file):

1. Đối chiếu yêu cầu với bảng trigger trong [skill-triggers.md](skill-triggers.md).
   Không nhớ chắc kho skill có gì thì `ls .agent/skills/` — rẻ hơn nhiều so với
   làm sai một quy trình.
2. Đọc `SKILL.md` của **mọi** skill khớp, không chỉ skill khớp rõ nhất. Một task
   thường khớp 3–5 skill (ví dụ: thêm endpoint = `project-architecture` +
   `database-migrations` + `security-review` + `verification-before-completion`).
3. **Tuyên bố ra ngoài** cho người dùng: liệt kê skill đang áp dụng và lý do,
   một dòng mỗi skill. Đây là cam kết kiểm chứng được, không phải lời chào.
4. Skill nào khớp nhưng cố ý bỏ qua thì nói rõ vì sao. Im lặng bỏ qua là vi phạm.

## S2 — Ba skill gần như luôn khớp

| Skill | Khi nào KHÔNG khớp |
|---|---|
| [project-architecture](../skills/project-architecture/SKILL.md) | Chỉ khi task không chạm file nào trong repo |
| [verification-before-completion](../skills/verification-before-completion/SKILL.md) | Không bao giờ — mọi tuyên bố "xong" đều đi qua đây |
| [skill-creator](../skills/skill-creator/SKILL.md) | Chỉ khi task không tạo/sửa skill nào |

## S3 — Skill hết đúng thì sửa skill, đừng lách

Khi `SKILL.md` mâu thuẫn với code đang chạy, code hiện tại thắng (theo
[behaviors.md](behaviors.md) §B0), nhưng độ lệch đó **phải được báo cáo** và
xử lý bằng một trong hai đường:

- Sửa `SKILL.md` cho khớp thực tế, qua [skill-creator](../skills/skill-creator/SKILL.md).
- Hoặc ghi độ lệch vào [DECISIONS.md](../memory/DECISIONS.md) nếu đó là quyết định
  có chủ đích chưa kịp phản ánh vào skill.

Lặng lẽ làm khác skill rồi không nói gì là cách kho skill mục ruỗng.

## S4 — Thiếu skill thì tạo skill

Task chạm một quy trình lặp lại mà chưa skill nào phủ → sau khi giao xong việc,
đề xuất tạo skill mới bằng [skill-creator](../skills/skill-creator/SKILL.md).
Không tự ý tạo giữa chừng làm loãng task đang chạy.

## Checklist

- [ ] Đã quét bảng trigger `skill-triggers.md` (hoặc `ls .agent/skills/`)
- [ ] Đã đọc `SKILL.md` của mọi skill khớp
- [ ] Đã tuyên bố danh sách skill áp dụng cho người dùng
- [ ] Skill khớp mà bỏ qua đều có lý do nêu rõ
- [ ] Độ lệch skill ↔ code đã được báo cáo, không nuốt im
