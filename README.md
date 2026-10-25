# Cẩm nang Dược lâm sàng

<img src="icons/icon.svg" width="72" height="72" alt="Logo Cẩm nang Dược lâm sàng">

Cổng tra cứu tài liệu dược lâm sàng của **Khoa Dược – BV X**: gom 22 trang HTML (tóm tắt guideline, tài liệu thông tin thuốc, so sánh dược lý, thẩm định EBM) vào một ứng dụng web có **thanh điều hướng bên trái**, tìm kiếm không dấu và dùng được **ngoại tuyến** (PWA).

> **Lưu ý chuyên môn.** Cổng không sửa nội dung các trang gốc. Nội dung chuyên môn trong từng trang **chưa được thẩm định lại** khi đưa vào cổng; đối chiếu nguồn gốc ở cuối mỗi trang trước khi áp dụng cho người bệnh.
>
> **Dữ liệu cá nhân.** Cổng không nhập, không lưu, không gửi dữ liệu người bệnh. Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm (Nghị định 13/2023/NĐ-CP); đơn vị triển khai chịu trách nhiệm pháp lý và nên đối chiếu với bộ phận pháp chế.

## Tính năng

Giao diện theo mẫu **A. Tĩnh & Tập trung** (duyệt 25/10/2026; bản xem trước 3 mẫu ở `design/de-xuat-ui-ux.html`).

- **Sidebar trái dạng cây:** Trang chủ, Gần đây, Yêu thích; mục Thư viện có 4 nhóm (chấm màu riêng, số lượng), mỗi nhóm mở ra danh sách tài liệu. Máy tính thu gọn thành thanh biểu tượng (`Ctrl+B`); điện thoại là ngăn kéo trượt.
- **Trang chủ tìm trước:** ô tìm lớn lọc thư viện tức thì, không phân biệt dấu, tô sáng từ khoá; gợi ý nhanh; "Đọc tiếp" 3 tài liệu gần nhất; thư viện dạng bảng (tài liệu, nhóm, chuyên khoa, nguồn, ghim).
- **Tìm nhanh `Ctrl+K`** ở mọi màn hình: chọn bằng `↑ ↓`, `Enter` mở, `Esc` đóng; trên điện thoại mở toàn màn hình.
- **Điện thoại:** thanh dưới 4 mục (Trang chủ, Thư viện, Tìm, Yêu thích).
- **Khung đọc:** thanh trạng thái luôn hiện "Chưa thẩm định lại", "Dự thảo" (nếu có) và nguồn; tài liệu trước/sau trong nhóm (`Alt+←/→`), ghim, mở tab mới.
- Giao diện sáng/tối/theo hệ thống; màu nhấn theo đơn vị đặt trong `css/themes.css` (hiện là BV X).
- PWA: cài như ứng dụng, lưu sẵn các trang để đọc khi mất mạng, báo khi có bản cập nhật.

## Logo

Cuốn sách mở (cẩm nang, kiến thức có nguồn) và viên nang nghiêng phía trên (dược), trên nền chuyển màu xanh dương → xanh ngọc (tin cậy, chăm sóc lâm sàng). Logo vẽ bằng mã trong `tools/make-icons.js`; sửa hình học ở đó rồi chạy `node tools/make-icons.js` để sinh lại SVG và PNG.

## Cấu trúc

```
index.html               khung ứng dụng (sidebar + vùng nội dung)
css/base.css             token, màu nhóm và bố cục (mẫu A)
css/themes.css           màu nhấn theo đơn vị
js/lib.js                hàm thuần (tìm kiếm, định tuyến...) – có ca kiểm thử
js/app.js                giao diện, sự kiện, service worker
data/catalog.json        danh mục tài liệu (version, updated, source, status, records)
pages/*.html             20 trang tài liệu gốc (giữ nguyên từng byte)
sw.js                    service worker (ngoại tuyến)
manifest.webmanifest     thông tin cài đặt PWA
icons/                   biểu tượng (sinh bằng tools/make-icons.js)
tests/lib.test.js        ca kiểm thử hàm thuần
tools/check-catalog.js   đối chiếu danh mục với pages/
```

## Chạy thử trên máy

Cần mở qua máy chủ web (không mở trực tiếp `file://` vì trình duyệt chặn đọc JSON và service worker):

```bash
python -m http.server 8765
```

Rồi mở <http://localhost:8765>.

## Kiểm tra trước khi phát hành

```bash
node tests/lib.test.js
node tools/check-catalog.js
```

## Thêm hoặc sửa tài liệu

1. Chép tệp `.html` vào `pages/` (tên không dấu, không dấu cách).
2. Thêm một bản ghi vào `data/catalog.json`; `title` phải trùng nguyên văn thẻ `<title>` của trang. Tăng `version` và sửa `updated`.
3. Tăng `CACHE_VERSION` trong `sw.js` để máy người dùng nhận bản mới.
4. Chạy hai lệnh kiểm tra ở trên, rồi commit.

## Triển khai GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → Branch `main`, thư mục `/ (root)`. Mọi đường dẫn trong ứng dụng là tương đối nên chạy được ở `https://<tài-khoản>.github.io/<repo>/`.
