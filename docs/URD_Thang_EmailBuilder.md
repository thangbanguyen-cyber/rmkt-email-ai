# URD — Tạo & thiết kế email trên web (phần Thắng)

## 1. Thông tin tài liệu

| Trường | Nội dung |
|---|---|
| Tài liệu | URD — Module Tạo & thiết kế email + Drag-and-drop builder |
| Dự án | RMKT AI Automation — Crossian |
| Phần phụ trách | Thắng (mục 1 & 2) |
| Phiên bản | 1.0 |
| Ngày | <điền ngày> |
| Trạng thái | Draft — chờ duyệt |

## 2. Bối cảnh & mục đích

**Hiện trạng — làm 1 email phải qua 3 công cụ rời:**

```
[1] Web tạo HTML email  →  [2] Đẩy SendGrid lấy template_id  →  [3] Điền template_id vào Google Sheet (auto-gửi 7PM)
```

Cách này rời rạc: HTML copy tay sang SendGrid, template_id gõ tay vào Sheet, không xem trước được end-to-end, dựng layout & nội dung theo từng nhóm khách còn thủ công lặp lại.

**Mục tiêu:** gộp cả 3 bước về **1 web app duy nhất**, tự động hóa và thêm **AI**.

**Phần Thắng phụ trách:** khâu đầu — **tạo & thiết kế ra email hoàn chỉnh trên web** (đến lúc có email sẵn sàng, chưa gửi).

## 3. Phạm vi

### 3.1 Trong phạm vi
1. Tạo & thiết kế email
2. Drag-and-drop email builder, gồm: thư viện template, dynamic content, product blocks từ catalog, AI viết subject & nội dung.

### 3.2 Ngoài phạm vi (team khác lo)

| Hạng mục | Chủ sở hữu |
|---|---|
| Đẩy HTML lên SendGrid, tạo `template_id`, hẹn giờ gửi 7PM | Ly (xác nhận trigger với Hưng) |
| Hệ thống gửi email đi | Huy / Ly |
| Phân khúc khách (segment), gợi ý sản phẩm, dự đoán hành vi | Tiến (lớp AI phân tích) |
| A/B testing, tối ưu giờ gửi, gửi hàng loạt | Tiến (Campaign management) |
| Báo cáo hiệu quả (open/click/doanh thu), quản lý danh sách | Chưa phân công |

### 3.3 Điểm bàn giao
- **Nhận vào:** nhóm khách (segment) + sản phẩm gợi ý (từ team phân tích của Tiến); dữ liệu sản phẩm (catalog); ảnh (designer).
- **Giao ra:** email HTML hoàn chỉnh, chuẩn email → sang bước đẩy SendGrid/gửi của Ly.

## 4. Người dùng

| Người dùng | Vai trò | Cần gì ở tool |
|---|---|---|
| Marketer | Người dựng & gửi chiến dịch | Tạo email nhanh, đúng brand, không cần code |
| Designer | Cung cấp hình ảnh | Nơi để ảnh (logo/banner/sản phẩm) được dùng đúng chỗ trong email |

## 5. Yêu cầu chi tiết

### 5.1 Tạo & thiết kế email
*(chạy trên Vercel; người dùng tự nhập nội dung; hình ảnh lấy từ designer)*

Marketer tự tạo 1 email trên web từ đầu đến khi hoàn chỉnh, không cần lập trình.

| Mã | Yêu cầu | Xong khi (nghiệm thu) |
|---|---|---|
| UR-1.1 | Tạo chiến dịch: chọn brand, nhóm khách (segment), sản phẩm | Chọn xong vào được màn thiết kế; segment & sản phẩm hợp lệ theo brand |
| UR-1.2 | Nhập & chỉnh nội dung trực tiếp trên web | Sửa tiêu đề / đoạn văn / nút → thấy đổi ngay trên preview |
| UR-1.3 | Dùng ảnh từ designer (logo, banner, ảnh sản phẩm) | Tải lên hoặc dán link ảnh, gán vào đúng vị trí, ảnh hiện trong preview |
| UR-1.4 | Xem trước email trên desktop + mobile | Preview khớp email thật ở cả 2 khổ, không vỡ layout |
| UR-1.5 | Xuất email hoàn chỉnh (HTML chuẩn email) để bàn giao | HTML mở đúng trên Gmail/Outlook; giữ nguyên merge tag (vd `{{first_name}}`) |

### 5.2 Drag-and-drop email builder

Dựng layout email bằng **kéo-thả các khối** (banner, chữ, sản phẩm, nút CTA) trên web, không đụng code.

| Mã | Yêu cầu | Xong khi (nghiệm thu) |
|---|---|---|
| UR-2.1 | Kéo-thả để thêm / xóa / sắp xếp khối | Thao tác kéo-thả mượt; thứ tự khối đổi đúng; preview cập nhật |
| UR-2.2 | Hoàn tác (undo/redo) & tự lưu nháp | Undo về trạng thái trước; thoát ra vào lại không mất bài đang làm |

#### 5.2.1 Thư viện template theo ngành/mục đích
Bộ mẫu email dựng sẵn theo mục đích (winback, bỏ giỏ hàng, sale, giới thiệu sản phẩm mới…). Marketer chọn 1 mẫu để bắt đầu thay vì làm từ trang trắng — rút ngắn thời gian và giữ chuẩn brand.
- **Xong khi:** duyệt/lọc mẫu theo mục đích → 1 click áp vào builder → sửa lại được → lưu thành mẫu riêng để tái dùng.

#### 5.2.2 Dynamic content (nội dung động theo từng người nhận)
Hiện tại nội dung theo từng nhóm khách phải làm tay lặp lại. Cần **1 email tự đổi nội dung theo người nhận / nhóm khách** (xưng tên, sản phẩm gợi ý, ưu đãi riêng) qua merge tag và khối hiển thị theo điều kiện.
- **Xong khi:** chèn được merge tag (`{{first_name}}`…); đặt khối hiển thị theo segment; có nội dung dự phòng (fallback) khi thiếu dữ liệu.

#### 5.2.3 Product blocks tự động kéo sản phẩm từ catalog
Thay vì gõ tay ảnh/giá/mô tả, marketer chọn sản phẩm và khối tự đổ dữ liệu (ảnh, giá, USP, review) từ catalog vào email.
- **Xong khi:** chọn sản phẩm là tự đổ đủ thông tin; chọn được layout (1 cột / 2 cột / lưới); chỉnh lại nội dung được.

#### 5.2.4 AI hỗ trợ viết subject line & nội dung
AI gợi ý **nhiều lựa chọn subject/preheader** và **viết / viết lại nội dung body** đúng giọng brand, phù hợp từng nhóm khách — để marketer đỡ nghĩ câu chữ.
- **Xong khi:** 1 click ra nhiều lựa chọn subject + nội dung; chỉnh sửa được; đúng giới hạn độ dài và tránh từ dễ vào spam.

## 6. Luồng người dùng (end-to-end)
1. Chọn brand + nhóm khách (segment) + sản phẩm — *nhận gợi ý từ team phân tích*
2. Chọn template có sẵn **hoặc** tự dựng bằng kéo-thả
3. AI viết subject + nội dung body
4. Product block tự đổ sản phẩm; đặt nội dung động theo segment
5. Xem trước (desktop + mobile) & kiểm tra
6. Xuất email hoàn chỉnh → bàn giao sang bước gửi — *hết phần Thắng*

## 7. Phụ thuộc & giao diện

| Nguồn | Cần gì | Chiều |
|---|---|---|
| Team phân tích (Tiến) | Danh sách segment + sản phẩm gợi ý | Đầu vào |
| Catalog sản phẩm | Ảnh, giá, USP, review theo sản phẩm | Đầu vào |
| Designer | Ảnh: logo, banner, ảnh sản phẩm | Đầu vào |
| Bước gửi (Ly) | Email HTML hoàn chỉnh, chuẩn email | Đầu ra (bàn giao) |

## 8. Ràng buộc & giả định
- Email phải là **HTML an toàn cho email** (bảng + CSS nội tuyến) để hiển thị đúng trên Gmail/Outlook/Apple Mail.
- **Merge tag giữ nguyên dạng** (`{{paramurl}}`, `{{unsubscribe}}`, `{{first_name}}`) — không thay bằng giá trị cứng.
- Mỗi email tối đa ~6 sản phẩm; sản phẩm chủ lực (hero) khóa ở vị trí đầu.
- Giao diện tool bằng **tiếng Việt**.
- Nội dung/segment/sản phẩm gợi ý là **đầu vào từ lớp phân tích**, module này không tự sinh ra.

## 9. Câu hỏi mở (cần chốt)

| Câu hỏi | Chốt với |
|---|---|
| Thư viện template lưu ở đâu, ai cập nhật mẫu? | Thắng + PM |
| Ngoài tên, những trường cá nhân hóa nào (nhóm, lần mua gần nhất…) team phân tích sẽ cấp? | Tiến |
| Catalog sản phẩm lấy từ nguồn nào, cập nhật ra sao? | Tiến / team data |
| Ảnh từ designer bàn giao theo cách nào (link/kho ảnh)? | Designer |
| Nội dung động tính lúc dựng hay lúc gửi (qua merge tag của hệ gửi)? | Tiến + Ly |

## 10. Thuật ngữ
- **Segment:** nhóm khách hàng (vd theo hành vi/lịch sử mua).
- **Merge tag:** biến chèn động lúc gửi, vd `{{first_name}}` → tên người nhận.
- **template_id:** mã template SendGrid dùng để gửi (thuộc bước sau, không phải phần Thắng).
- **Product block:** khối sản phẩm trong email (ảnh + giá + mô tả + nút).
- **Dynamic content:** nội dung đổi theo người nhận/segment trong cùng 1 email.
- **Email-safe HTML:** HTML dựng bằng bảng + style nội tuyến để hiển thị đúng trên trình email.
- **Preheader:** dòng xem trước hiện cạnh subject trong hộp thư.
