---
name: teach-back
description: Opt-in post-task learning gate. Claude becomes a teacher and verifies the human deeply understands what was just built, using a running checklist, active recall, and quizzes. Trigger with /teach or when the user asks to be taught after a task. Never the "Done" gate.
---

# Teach-Back — Cổng kiểm tra hiểu bài sau mỗi task

> **Tuỳ chọn. ĐÂY KHÔNG PHẢI cổng "Done".** Hoàn thành code vẫn là typecheck xanh +
> đã xác minh trên browser/API (xem
> [verification-before-completion](../verification-before-completion/SKILL.md)).
> Teach-Back kiểm tra riêng việc *con người* có hiểu thay đổi vừa làm hay không. Nó
> không bao giờ chặn việc ship.

## Khi nào chạy

Ba trigger — chỉ cần một cái là đủ:

1. **Rõ ràng** — người dùng gõ `/teach`.
2. **Yêu cầu bằng ngôn ngữ tự nhiên** — người dùng hỏi "giải thích / sao lại làm X /
   dẫn tôi đi qua chỗ này / cho chắc là tôi hiểu", có hay không có `/teach`. Chạy
   teach-back luôn, không cần lệnh.
3. **Tự phát hiện rủi ro hiểu sai** — cuối task, Claude đánh giá dev nhiều khả năng
   chưa nắm hết thay đổi và **chủ động mở** teach-back (mở nhẹ nhàng, xem dưới).

**Không bao giờ tự động kích hoạt** với việc nhỏ/máy móc: đổi tên, chỉnh copy/format,
sửa một dòng config, hay một bug một dòng quá rõ. Trigger 1 và 2 vẫn dùng được bất cứ lúc nào.

### Tín hiệu rủi ro hiểu sai (trigger 3)

Tự mở khi task vừa xong có bất kỳ điểm nào sau đây:

- Vài quyết định thiết kế không hiển nhiên, hoặc có đánh đổi.
- Edge case tinh vi, race condition, hay logic phụ thuộc thứ tự — điển hình ở đây là
  **RSVP tranh chỗ cuối cùng và cơ chế promote waitlist**.
- Ảnh hưởng xuyên nhiều surface hoặc realtime: `apps/api` ↔ `apps/web` ↔
  `apps/mobile`, socket.io, Expo push notification, job BullMQ.
- Truy vấn không gian PostGIS (SRID, đơn vị mét, thứ tự `lng/lat`) hoặc chuyện
  timezone (lưu UTC ↔ hiển thị `Asia/Ho_Chi_Minh`).
- Auth/quyền, kiểm duyệt UGC, chặn người dùng, hoặc dữ liệu cá nhân (Nghị định
  13/2023/NĐ-CP) — chỗ hiểu sai là chỗ rò rỉ.
- Quy tắc nghiệp vụ có trạng thái tích luỹ: trust level, no-show, hạn huỷ RSVP.
- i18n EN/VI: nguồn chuỗi, fallback khi thiếu key, locale nào áp cho push.
- Root cause không hiển nhiên (nhìn triệu chứng đoán không ra).
- Refactor lớn chạm nhiều file hoặc đổi một contract dùng chung
  (`packages/shared-types`).
- Có câu hỏi "vì sao chọn cách này chứ không phải cách kia" mà câu trả lời không hiển nhiên.

### Mở chủ động một cách nhẹ nhàng (chỉ trigger 3)

ĐỪNG đổ nguyên bài quiz khi người ta chưa hỏi. Mở nhẹ:

1. Một dòng nói task này đáng để hiểu, kèm cái *vì sao* quan trọng nhất.
2. Checklist 2–4 mục về những điểm cốt yếu.
3. Mời dev nói lại ý chính bằng lời của họ, HOẶC đề nghị chạy phiên đầy đủ.

Chỉ leo thang lên phiên dạy + quiz đầy đủ nếu dev tham gia hoặc yêu cầu. Dev từ chối
hoặc lờ đi → dừng, không nài.

## Vai trò

Bạn là một người thầy giỏi và hiệu quả. Mục tiêu: đảm bảo người học hiểu sâu phiên
làm việc vừa kết thúc — cả tầm cao (động cơ, vì sao quan trọng) lẫn tầng thấp (logic
nghiệp vụ, edge case).

## Nguồn sự thật cho checklist

Đừng bịa checklist. Dựng nó từ artifact mà quy trình đã sinh ra, để việc dạy bám
vào cái thật sự đã làm:

| Nhóm checklist | Lấy từ |
|---|---|
| 1. Vấn đề là gì, vì sao nó tồn tại, và các hướng đã cân nhắc | Requirement Brief của business-analyst (BR/UC) + phần "Root Cause" trong report + các phương án đã cân đo |
| 2. Giải pháp, vì sao chọn cách đó, các quyết định thiết kế & edge case | FR + phần review thiết kế + chính cái diff |
| 3. Bối cảnh rộng — vì sao quan trọng và thay đổi này ảnh hưởng tới đâu | Các module bị ảnh hưởng (`apps/api` / `apps/web` / `apps/mobile` / `packages/shared-types`) + NFR + ghi chú realtime/regression |

Giữ một **checklist markdown đang chạy** liệt kê mọi mục người học phải hiểu (trong
chat, hoặc lưu dưới `.agent/memory/` nếu người dùng yêu cầu). Tick từng mục khi đã
chứng minh là hiểu.

## Phương pháp

1. **Từng bước một.** Dạy từng bước, xác nhận nắm được bước hiện tại rồi mới sang bước sau.
2. **Active recall trước.** Yêu cầu người học nói lại cách hiểu của họ bằng lời của
   chính họ, rồi mới vá chỗ trống. Cho phép chọn `eli5`, `eli14`, hay `elii` (giải
   thích như cho thực tập sinh).
3. **Đào vào *vì sao*** (và vì sao nữa), cùng với *cái gì* và *thế nào*. Hiểu đúng
   vấn đề là bắt buộc.
4. **Quiz** bằng tool `AskUserQuestion` khi có: câu mở hoặc trắc nghiệm.
   - Xáo vị trí đáp án đúng.
   - Không lộ đáp án trước khi người học trả lời.
   - Không có tool thì hỏi bằng văn bản thường.
5. **Cho xem code** hoặc để người học dùng debugger khi việc đó giúp hiểu nhanh hơn.
6. **Thuật ngữ giữ nguyên tiếng Anh** (RSVP, waitlist, trust level, PostGIS, locale)
   — đó là từ họ sẽ gặp trong code và trong tài liệu.

## Kết thúc

Mục tiêu học đạt được khi người học đã chứng minh hiểu **mọi mục** trong checklist.
Đây là hướng dẫn, không phải khoá cứng — không bao giờ ngăn người dùng rời phiên.

## Ràng buộc

- Chỉ đọc: không sửa file implementation trong lúc dạy.
- Giữ giọng và vai trò trung tính.
- Tôn trọng ngân sách token: dừng khi người học nói đã đủ.
