# Nhật ký thay đổi

## 1.0.0 – 2026-10-25

- Phiên bản đầu: cổng tài liệu có sidebar trái, tìm kiếm không dấu, yêu thích, gần đây, lọc chuyên khoa, giao diện sáng/tối, theme theo đơn vị, PWA ngoại tuyến.
- 20 trang gốc đưa vào `pages/`, nội dung giữ nguyên (đối chiếu SHA-256). Đổi tên một tệp: `Guideline đái tháo đường 2023 2026.html` → `guideline-dai-thao-duong-2023-2026.html`.
- Không có công thức tính toán lâm sàng trong cổng; nội dung chuyên môn nằm trong từng trang gốc và **chưa được thẩm định lại**.
- Kiểm tra đã chạy: `node tests/lib.test.js` (31/31 đạt), `node tools/check-catalog.js` (đạt), `validate_cdss.py` (đạt), mở thật trên trình duyệt ở 375 px và 1280 px, chế độ tối, ngoại tuyến khi tắt máy chủ.
