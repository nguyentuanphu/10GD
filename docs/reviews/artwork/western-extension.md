# Bổ sung 100 món Âu, Ý và Healthy

Bổ sung đúng **100 công thức** vào catalog, từ 540 lên **640 món**; thêm **32 nguyên liệu**, từ 58 lên **90 nguyên liệu**. Các mã và nội dung của 540 công thức cũ được giữ nguyên.

| Bộ sưu tập mới | Số món | Ví dụ |
|---|---:|---|
| Ý | 40 | Spaghetti, penne, risotto, lasagna, pizza bánh mì, Caprese, bruschetta, minestrone |
| Âu | 30 | Gà/cá nướng, bò hầm, súp rau/đậu, frittata, omelette, pancake mặn, toast, chả áp chảo, salad |
| Healthy | 30 | Bowl quinoa/gạo lứt, salad đậu và đạm, cá/gà/đậu hũ nướng, súp đậu, yến mạch, toast nguyên cám |

Mỗi món có định lượng cho **4 suất**, chuẩn bị, thời gian, bước nấu và brief hình riêng. Đây là công thức tham khảo mới do ứng dụng cung cấp; không sửa hoặc tự bổ sung định lượng vào món gia đình. Nhóm Healthy tập trung rau, đạm và ngũ cốc; không gắn số calo, cam kết giảm cân hoặc tuyên bố điều trị. Món Ý cách tân được đặt tên theo nguyên liệu/phương pháp thực tế, ví dụ pizza dùng bánh mì, pesto không hạt và Carbonara kiểu thịt heo.

[Danh sách và công thức 100 món](western-recipes.json) · [Gallery toàn bộ](gallery.html) · [Brief và checksum artwork mới](western-generation.json).

## Artwork

Tạo 7 sheet món (`dishes-v36.webp`–`dishes-v42.webp`) cho 100 món và hai sheet nguyên liệu (`ingredients-v5.webp`, `ingredients-v6.webp`) cho 32 nguyên liệu. Đã xem trực tiếp từng tấm, đối chiếu thứ tự với danh sách nguyên liệu và cách nấu; hình phân biệt spaghetti, penne, lá lasagna, gạo risotto, quinoa và gạo lứt. Sửa riêng topping hành lá bị thêm nhầm vào yến mạch qua đêm quả bơ.

Giữ phong cách gouache nền ngà, bát đĩa và màu sắc của bộ gốc. Các vị trí hình mới gán theo ID và chữ ký công thức; 640 món và 90 nguyên liệu đều có hình. Hình là minh họa, không phải ảnh chụp hoặc bằng chứng dị ứng, khối lượng hay độ chín; văn bản công thức là nguồn chính.

## Tích hợp và giữ dữ liệu

- Nâng edition từ 3 lên 4: chỉ thêm mã mới chưa có, không thay công thức đã sửa/trùng mã, không đổi pantry, lịch ăn hoặc tùy chọn. Chạy lại không nhân đôi và không khôi phục các món đã chủ động xóa sau khi nâng edition. Áp dụng khi mở dữ liệu thiết bị và khi nhận dữ liệu đồng bộ.
- Món đã có mì, bánh mì, gạo arborio/gạo lứt, quinoa hoặc yến mạch không tự cộng thêm cơm trắng; lựa chọn cơm trắng rõ ràng của người dùng vẫn được tôn trọng. Món tự sao chép giữ nguyên nguyên liệu ngũ cốc cũng được nhận diện.
- Giá và quy cách gói của 32 nguyên liệu mới chưa được đoán. Shopping ghi chưa biết giá nếu chưa nhập; chi tiết công thức báo chưa đủ giá nguyên liệu. Đơn giá người dùng nhập vẫn được dùng.
- Sữa, sữa chua, kem, bơ, phô mai và đậu chín không tự bị đưa vào khu đồ khô khi người dùng chọn lưu ngăn mát.
- Giữ schema dữ liệu, mã công thức và artwork cũ. Cache offline được nâng version và chứa đủ 42 sheet món, 6 sheet nguyên liệu cùng hai ảnh sửa của bộ trước.

## Kiểm tra

`npm run test:all` đã đạt: build/check, typecheck, toàn bộ unit/integration tests, startup, authenticated startup/service worker và artwork browser. Có thêm test 100 tên/mã khác nhau, nguyên liệu hợp lệ, định lượng dương, nâng edition an toàn/idempotent, giữ món gia đình và món đã xóa, không cộng cơm sai, giá chưa biết/giá nhập tay và lưu sữa đúng chỗ. Sau sửa ảnh cuối, chạy lại audit, test artwork/catalog và artwork browser.

Chromium viewport **375×812**, **820×1100**, **1280×800**: tìm/mở risotto và bowl quinoa mới, kiểm tra hình nguyên liệu và nhãn giá chưa đủ, chuyển VI/EN, modal, shopping, gallery và không có horizontal overflow/runtime error/artwork 404. Test service worker thực chờ cache đủ toàn bộ sheet, tắt mạng, reload và mở artwork risotto mới; có ảnh `*-offline.png`. Bộ startup còn kiểm tra màn hình hẹp 320px. Đây là viewport giả lập, không phải thiết bị vật lý.

Bằng chứng: `*-western-new.png`, `*-healthy-new.png`, `*-offline.png`, `western-test-results.txt` và `western-final-browser.txt` trong cùng thư mục.

## GitHub

Nhánh `artwork/catalog-audit`, cập nhật cùng PR #5 để bộ 100 món dùng được với artwork trước đó. Không merge `main`, không bật auto-merge và không triển khai production.
