# Sửa hình món ăn sau audit — 02/11/2026

Đối chiếu catalog 740 món và 106 ảnh nguyên liệu từ `main d625b643221cdfc9109fba71fd291d932f9203fb`. Đã làm lại **42 hình** sai hoặc còn mơ hồ theo phong cách artwork hiện có, kiểm tra lại thumbnail và ảnh nguồn sau sửa. **5 công thức** được sửa tên, loại mì hoặc hướng dẫn cho nhất quán, không thêm hay đổi định lượng.

- Đậu Hà Lan ở bốn món xào được vẽ thành hạt tròn; bỏ đậu nguyên quả/đậu que.
- Bỏ hành lá, ngò và hành tây ngoài công thức; làm rõ gừng sợi ở nhóm rau xào, nấm và đạm ở các hình mơ hồ.
- Phở gà rau củ chỉ thể hiện gà đã nấu, không còn cụm giống thịt băm khác loại.
- Bỏ rau thơm ngoài công thức ở risotto tôm, súp nấm và súp khoai tây bắp.
- Ba món mì Ý dùng ingredient spaghetti thay vì Nui, xếp nhóm món chính và đánh dấu đã có tinh bột. Mì Ý cá hồi dùng sốt nước dùng tỏi, không vẽ sốt kem. Tên món cá hồi áp chảo bỏ “bơ”; súp bí đỏ bỏ “kem tươi” vì công thức không có hai nguyên liệu đó. Có bản dịch tiếng Anh cho tên mới.

## Kết quả và giới hạn

**715 hình phù hợp trực quan ở mức minh họa; 25 dressing phù hợp màu/độ sệt nhưng không thể xác thực thành phần đã xay chỉ từ hình.** Không còn lỗi rõ ràng được ghi nhận trong audit này chưa xử lý. Đây không phải chứng nhận hình chính xác tuyệt đối: artwork không xác nhận được định lượng, dị ứng, loại nước dùng, chất béo hoặc nhiệt độ chín. 106 ảnh nguyên liệu phù hợp loại nguyên liệu ở mức nhận diện; không cần thay ảnh nguyên liệu trong lượt sửa này.

Các bản công thức gốc còn nguyên được cập nhật cả trong thư viện và bản sao thực đơn. Điều kiện là khớp đầy đủ tên, nhóm món, đạm, nguyên liệu/định lượng, sơ chế và các bước nấu của mẫu cũ. Món custom, origin family, món đã sửa các trường này hoặc đã tự chọn stapleIncluded đều được giữ nguyên. Không khôi phục món gia đình đã xóa. Món đã chỉnh sửa tiếp tục dùng minh họa thành phần khi không còn khớp catalog.

## Bằng chứng

- [Gallery 740 món, có trước/sau và bộ lọc](gallery.html) — mở từ checkout repo để ảnh tương đối được tải. GitHub không trực tiếp render HTML.
- [Kiểm kê từng món và SHA-256 ảnh cuối](verification.json).
- [Danh sách 42 hình thay](replaced-ids.json), [5 bản sửa dữ liệu và chữ ký mẫu cũ](catalog-repairs.json).
- [Tinh chỉnh nhóm xào gừng](ginger-refinement.txt): bỏ toàn bộ hạt gia vị băm gây nhầm tỏi, giữ gừng sợi và đúng rau/đậu của từng công thức.
- Bộ ảnh sau sửa: [1](after-1.jpg), [2](after-2.jpg), [3](after-3.jpg).
- Giao diện: [mobile 375×812](mobile-corrected-family-v3-37.png), [tablet 820×1100](tablet-corrected-family-v3-37.png), [PC 1280×800](desktop-corrected-family-v3-2.png).
- Gừng sợi trên giao diện: [mobile](mobile-corrected-family-v3-330.png), [tablet](tablet-corrected-family-v3-330.png), [PC](desktop-corrected-family-v3-330.png).
- [Audit trước sửa](../artwork-audit-20261102/README.md) được giữ nguyên làm hồ sơ lịch sử; trạng thái hiện tại nằm trong verification.json.

## Kiểm tra

Local: build/check, typecheck, artwork, catalog-fixes, units-catalog, western-catalog và plant-catalog. Browser kiểm tra danh sách/chi tiết món sửa, điều hướng modal, tiếng Việt/Anh, sáng/tối, shopping, gallery và không tràn ngang ở 375×812, 820×1100, 1280×800; không lỗi JavaScript hoặc ảnh 404. Đây là mô phỏng viewport, không phải kiểm tra thiết bị vật lý.

Toàn bộ suite tiếp tục chạy trên GitHub CI theo đúng head PR. Không merge main, không triển khai và không tạo hosting preview trong lượt này.
