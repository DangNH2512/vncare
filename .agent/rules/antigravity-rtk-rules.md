# RTK — Rust Token Killer (Google Antigravity)

**Công dụng**: proxy CLI tối ưu token cho lệnh shell.

## Quy tắc

Luôn thêm tiền tố `rtk` vào lệnh shell để giảm token tiêu thụ.

Ví dụ trong monorepo Da Nang Connect:

```bash
rtk git status
rtk ls apps/api/src/modules
rtk grep "ST_DWithin" apps/api/src
rtk find "*.spec.ts" apps/api/e2e
rtk docker ps
rtk gh pr list
```

## Lệnh meta

```bash
rtk gain              # Xem token đã tiết kiệm
rtk gain --history    # Lịch sử lệnh kèm mức tiết kiệm
rtk discover          # Tìm cơ hội dùng RTK còn bỏ sót
rtk proxy <cmd>       # Chạy lệnh thô (không lọc, để debug)
```

## Vì sao

RTK lọc và nén output của lệnh trước khi nó vào context của LLM, tiết kiệm 60-90%
token trên các thao tác thường gặp. Luôn dùng `rtk <cmd>` thay cho lệnh thô.
