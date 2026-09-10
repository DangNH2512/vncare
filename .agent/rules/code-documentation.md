---
trigger: always_on
description: Quy tắc viết doc/comment trong code — tiếng Anh, phong cách chuyên nghiệp, mô tả hành vi chứ không kể chuyện.
---

# Quy Tắc Viết Doc Cho Code

## 0. Scan trước khi viết

Trước khi viết bất kỳ comment/JSDoc nào trong một task, **scan cách viết doc của
code hiện có** trong vùng sắp sửa (module, package lân cận) và bám theo mật độ,
giọng văn, format đang dùng. Không tự chế một phong cách mới giữa codebase.

## 1. Ngôn ngữ: TIẾNG ANH — không ngoại lệ

Mọi thứ nằm **trong file code** viết bằng tiếng Anh:

- Comment và JSDoc/TSDoc trong `.ts`, `.tsx`, `.js`, `.sql`, `.cjs`, `.mjs`.
- Comment trong file cấu hình (`.npmrc`, YAML, JSON5, Dockerfile, compose).
- Trường `description` trong `package.json`, mô tả rule trong config lint/dep-cruiser.
- Tên biến, hàm, class, migration, thông điệp lỗi kỹ thuật, log.

Tiếng Việt chỉ dành cho: tài liệu trong `docs/`, `.agent/`, nội dung i18n `vi.json`,
và trao đổi trong chat/PR.

## 2. Phong cách: mô tả API, không kể chuyện

Comment mô tả **đúng biến, hành vi, ràng buộc, đơn vị, invariant** của code —
thứ mà người đọc không suy ra được từ chính code. Cấm các dạng sau:

- ❌ Nhật ký sửa đổi: `// updated 2026-09-01, dev said X so changed to Y`
  (lịch sử nằm ở git log, không nằm trong comment).
- ❌ Kể lại quá trình thảo luận, tên người, tên phiên chat, "theo yêu cầu của anh A".
- ❌ Trích dẫn tài liệu lan man thay cho mô tả hành vi. Chỉ giữ **một** tham chiếu
  ngắn (vd `See ADR-0000.`) khi comment nêu một ràng buộc thật sự bắt nguồn từ đó.
- ❌ Comment thuật lại dòng lệnh ngay bên dưới (`// increment counter`).

Mẫu đúng:

```ts
/**
 * Decides the RSVP outcome for a viewer against one occurrence.
 *
 * Pure decision logic only — this function never opens a transaction.
 * Row locking and the capacity trigger live in the API repository layer;
 * the database remains the final guard (see ADR-0000).
 *
 * @param input.seatsTaken - Seats currently occupied, counted under row lock.
 */
```

## 3. Checklist trước khi kết thúc task

- [ ] Không còn comment/description tiếng Việt trong file code nào vừa tạo/sửa.
- [ ] Không còn comment dạng nhật ký / hội thoại / breadcrumb tài liệu dài.
- [ ] JSDoc cho hàm public: mô tả hành vi + tham số không hiển nhiên + invariant.
