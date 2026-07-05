# rmkt-email-ai

**RMKT AI Automation — Email HTML Create module (phần Thắng).**

Dự án gộp luồng email remarketing từ 3 công cụ rời (tạo HTML → SendGrid tạo `template_id`
→ Google Sheet auto-send 7PM) về **một web app duy nhất**, kèm AI. Repo này chứa tài liệu
yêu cầu + prototype UX + tài liệu thi công cho **module tạo & thiết kế email** (tab 1 —
Email HTML Create). Các module Template_ID Create / Auto Send / Segmentation thuộc PIC khác.

## Cấu trúc

| File | Là gì | Dành cho ai |
|---|---|---|
| [`prototype/EmailBuilder_UX_Prototype.html`](prototype/EmailBuilder_UX_Prototype.html) | **Prototype tương tác** (mở thẳng bằng Chrome, cần internet để load ảnh CDN). Full flow S0 Empty → S2 Generating (streaming fill, cancel/retry) → S3 Ready (edit/regenerate theo scope SEG/ALL, versions, layout, images, quality chip) → Create Template_ID → tab 2 | Mọi người — đây là hợp đồng UX |
| [`docs/URD_Thang_EmailBuilder.md`](docs/URD_Thang_EmailBuilder.md) (+ [.docx](docs/URD_Thang_EmailBuilder.docx)) | **URD** — yêu cầu người dùng: phạm vi/ranh giới với module khác, yêu cầu chi tiết kèm tiêu chí nghiệm thu, luồng, phụ thuộc, câu hỏi mở | Team + stakeholder |
| [`docs/2026-07-04-emailauto-onescreen-specs.md`](docs/2026-07-04-emailauto-onescreen-specs.md) | **Specs** — thiết kế hành vi cho dev: state machine S0→S3, map block UI ↔ dữ liệu AI, API contracts, validation, kiến trúc. Tái dùng engine EmailAuto Studio hiện có (không viết lại) | Dev |
| [`docs/2026-07-04-emailauto-onescreen-plans.md`](docs/2026-07-04-emailauto-onescreen-plans.md) | **Plans** — kế hoạch thi công 9 task có checkbox, lệnh verify và commit từng bước | Dev / AI agent |

## Bắt đầu dev thế nào

Mở repo code EmailAuto Studio (engine gốc) rồi chạy theo plans:

> Implement `docs/2026-07-04-emailauto-onescreen-plans.md` task-by-task, starting from Task 0.

Specs là tài liệu tra cứu trong lúc làm; plans là việc cần làm theo thứ tự. Xong task nào
tick checkbox task đó.

## Nguyên tắc đã chốt

- **1 màn hình**: brief bên trái → email tự lắp ráp bên phải (config đổ phần cứng,
  catalog đổ sản phẩm, AI rót chữ theo từng segment).
- **Không A/B** — regenerate theo block + version history thay thế.
- Chữ do AI sinh; **ảnh do designer** (dán URL) — AI chỉ viết gợi ý ảnh.
- Merge tag SendGrid (`{{first_name}}`, `{{paramurl}}`, `{{unsubscribe}}`) giữ nguyên văn.
- UI tiếng Anh; màu khung theo tông xanh Crossian, màu brand chỉ nằm trong nội dung email.
