# Kết nối Kho câu hỏi

Bridge.gs đã được thêm vào dự án Kho câu hỏi - samlequynh, bản triển khai 3 ngày 22/11/2026.

Hàm doGet(e) cần giữ nhánh sau trước khi trả giao diện Index:

```js
if (e && e.parameter && e.parameter.bridge === '1') return khoBridge_(e.parameter.nonce);
```

Giữ chế độ thực thi theo người truy cập và quyền truy cập bằng tài khoản Google. Hàm xuLyTaiLen tiếp tục kiểm tra quản trị ở máy chủ. Không lưu API key hoặc dữ liệu kho trong repository. Bridge chỉ trả dữ liệu cho https://hoidapngoaitinh.pages.dev và kiểm tra mã phiên.

Giao diện nằm ở index.html, kho.js, kho.css và portal.css. release/index.html là bản gộp tương ứng để tải trực tiếp lên Cloudflare (chỉ tải tệp index.html này, không tải cả thư mục release).

Kiểm tra đã chạy: cú pháp JavaScript; mô phỏng nạp dữ liệu, phân trang, tìm kiếm không dấu, lọc nguồn, mở/đóng chi tiết, hiển thị dữ liệu dưới dạng văn bản, từ chối sai nguồn/sai mã phiên. Chưa kiểm thử thao tác tải tài liệu thật để tránh thêm dữ liệu thử vào kho.
