# Artwork hoàn thiện — 58 nguyên liệu, 540 món

Phạm vi là catalog có sẵn trong `nguyentuanphu/10GD`, đối chiếu với baseline `0bcef706f1b01260b4c0a5980aa67ad09fc63c95`. Không truy cập hoặc thay đổi dữ liệu gia đình trực tuyến.

| Hạng mục | Trước | Sau |
|---|---|---|
| 58 nguyên liệu | 48 ô artwork dùng chung | 58 vị trí hình riêng, gồm 16 hình bổ sung để phân biệt nguyên liệu/dạng sử dụng |
| 540 món | 16 hình chung theo nhóm đạm/loại món | 540 minh họa được gán riêng theo mã và nội dung công thức |
| SVG sơ bộ trong catalog | 513 trong bản nháp trước | **0** |

172 món mặn, 110 canh, 88 rau, 170 món nước/súp/cháo. 27 tranh phù hợp được tái sử dụng; tạo thêm artwork cho 513 món còn lại theo màu sắc, nền ngà, bát đĩa và phong cách gouache gốc. Bộ cuối dùng 35 sheet và hai ảnh sửa riêng: 538 món lấy từ ô sprite, hai món lấy từ ảnh riêng. Những ô sprite đã bị thay bằng ảnh sửa không được hiển thị.

## Độ phù hợp của hình

Đã xem toàn bộ các sheet, đối chiếu thứ tự ô với tên món, nguyên liệu chính và cách chế biến. Các lỗi rõ trước đây như mì Ý dùng phở bò, trứng chiên dùng canh trứng, sườn dùng cốt lết, rau muống dùng cải thìa đã được xử lý. Món luộc/hấp, xào/kho, cháo và các loại sợi được chỉ định trong từng brief.

Review ảnh đã dẫn đến sửa bổ sung: bỏ thịt bằm không có trong canh bí xanh đậu hũ; đổi cải thìa bị vẽ nhầm thành rau cải; bỏ dứa ở các canh chỉ có cà chua; bỏ thịt bằm thừa ở một số món cá viên/đậu hũ/gà; tạo ảnh riêng bún thịt bằm rau củ để tránh nhầm sang gà xé. Các lần sửa và checksum asset được ghi trong [generation.json](generation.json).

Đây là **minh họa**, không phải ảnh chụp hay bằng chứng định lượng/thành phần thực tế khi nấu. Hình có thể đơn giản hóa miếng cắt, tỷ lệ và trang trí nhỏ. Văn bản công thức vẫn là nguồn thông tin chính; không dùng hình để quyết định dị ứng hoặc độ chín.

[Gallery đủ 58 nguyên liệu và 540 món](gallery.html) · [Kiểm kê và brief từng mục](catalog.json). Tạo lại gallery bằng `npm run artwork:audit`.

## Tích hợp và bảo toàn dữ liệu

- Mỗi mã công thức có một artwork xác định. Chữ ký tên, nhóm món, đạm, nguyên liệu, chuẩn bị và bước nấu phải khớp trước khi dùng lại tranh.
- Món gia đình tự nhập/đã sửa vẫn dùng minh họa thành phần, tránh gán nhầm tranh catalog. Nguyên liệu lạ có biểu tượng trung tính. Không suy diễn nguyên liệu mới từ nhóm thịt/rau.
- Không thay đổi seed/catalog công thức, định lượng, giá, schema, lịch ăn hoặc dữ liệu gia đình.
- Sheet mới và hai ảnh sửa được cache offline; cache version được đổi để cập nhật. Tổng WebP 11.7 MB; nén từ ảnh nguồn, không đổi bố cục.
- Test thông báo được đặt giờ giả lập cố định để không phụ thuộc quiet hours tại thời điểm chạy. Không thay đổi hành vi gửi thông báo của sản phẩm.

## Kiểm tra

`npm run test:all` gồm build/check, typecheck, toàn bộ unit/integration suites, browser startup, authenticated startup/service worker và kiểm tra artwork trên trình duyệt. Đã đạt; xem [test-results.txt](test-results.txt).

Kiểm tra bổ sung bao gồm:

- 58 ánh xạ nguyên liệu khác nhau; 540 ánh xạ món khác nhau; mọi asset cuối tồn tại; không còn SVG sơ bộ trong catalog.
- Công thức đổi nguyên liệu hoặc cách nấu không được dùng lại tranh cũ; nhãn ingredient tiếng Việt khớp mã; tên lạ không đoán ảnh thịt/rau.
- Mobile **375×812**, tablet **820×1100**, PC **1280×800**, reduced motion: mở kho tham khảo, tìm món, mở/đóng chi tiết, shopping, chuyển VI/EN, tìm gallery; không lỗi runtime, yêu cầu artwork thiếu hoặc horizontal overflow trong các luồng này.
- Service worker thực: chờ cache đủ mọi sheet và hai ảnh sửa, chuyển offline, reload, mở kho món và tải artwork khi không có mạng, giữ nguyên dữ liệu thiết bị. Có ảnh `*-offline.png`; ảnh catalog, detail, shopping, English và gallery cũng nằm trong thư mục này.
- Bộ startup còn kiểm tra màn hình hẹp **320×740**, các biểu mẫu, lời mời và khôi phục phiên. Đây là giả lập viewport Chromium, không phải kiểm tra thiết bị vật lý.

## GitHub

Nhánh `artwork/catalog-audit`, dành để review. Chưa merge vào `main`, không bật auto-merge và không triển khai production. Quy định phê duyệt deploy riêng trong `AGENTS.md` vẫn giữ nguyên.
