# Da Nang Connect — luật phiên cho Claude

**Bắt buộc, mọi phiên:** trước khi bắt đầu task đầu tiên, quét bộ agent trong
`.agent/agents/`, ánh xạ task vào agent sở hữu, chốt chế độ single/multi-agent
và tuyên bố cho người dùng — theo rule dưới đây (nạp nguyên văn):

@.agent/rules/agent-first.md

Các luật luôn bật còn lại của dự án nằm ở `.agent/rules/` (`behaviors.md`,
`skill-first.md`, `planning-and-agent-mode.md`...) — nạp qua skill
`project-architecture` và bảng `skill-triggers.md`, không đọc ồ ạt.
