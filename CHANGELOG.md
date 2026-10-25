# Nhật ký thay đổi

## 1.1.0 – 2026-10-25

- Thêm 2 tài liệu vào nhóm Tóm tắt guideline (tổng 12 guideline, 22 tài liệu):
  - EAU 2026 – Nhiễm khuẩn niệu khoa (UTI 3.3–3.9): `EAU-2026-UTI-3.3-3.9-tom-tat.html`.
  - KDIGO AKI/AKD (dự thảo 03/2026) – Chương 3 và 4: `KDIGO-AKI-AKD-2026-Ch3-4-tom-tat.html` (giống từng byte bản trong nhánh cũ trước khi ghi đè).
- Hai trang giữ nguyên nội dung gốc, chỉ tải phông chữ từ Google Fonts; nội dung chuyên môn **chưa được thẩm định lại**. Trang KDIGO tóm tắt **bản dự thảo lấy ý kiến**, không phải bản chính thức.
- Danh mục 1.1.0; `CACHE_VERSION` v1.1.0 để máy người dùng nhận bản mới.

## 1.0.0 – 2026-10-25

- Phiên bản đầu: cổng tài liệu có sidebar trái, tìm kiếm không dấu, yêu thích, gần đây, lọc chuyên khoa, giao diện sáng/tối, theme theo đơn vị, PWA ngoại tuyến.
- 20 trang gốc đưa vào `pages/`, nội dung giữ nguyên (đối chiếu SHA-256). Đổi tên một tệp: `Guideline đái tháo đường 2023 2026.html` → `guideline-dai-thao-duong-2023-2026.html`.
- Không có công thức tính toán lâm sàng trong cổng; nội dung chuyên môn nằm trong từng trang gốc và **chưa được thẩm định lại**.
- Kiểm tra đã chạy: `node tests/lib.test.js` (31/31 đạt), `node tools/check-catalog.js` (đạt), `validate_cdss.py` (đạt), mở thật trên trình duyệt ở 375 px và 1280 px, chế độ tối, ngoại tuyến khi tắt máy chủ.
