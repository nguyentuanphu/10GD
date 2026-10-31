# Hoàn tất 100 công thức vegetarian, salad hạt và dressing

Đây là **đợt bổ sung riêng**, không tính lại 100 món Âu/Ý/Healthy đã làm trước đó. Catalog tăng từ 640 lên **740 công thức**, nguyên liệu từ 90 lên **106**.

| Nhóm mới | Số công thức | Nội dung |
|---|---:|---|
| Vegetarian | 40 | Đậu hũ/đậu/hạt, món nhồi/nướng, chả đậu, ngũ cốc, món trứng và sữa chua ghi riêng |
| Salad hạt/ngũ cốc/đậu | 35 | Quinoa, bulgur, couscous, gạo lứt, các loại đậu, hạt, táo và cam |
| Salad dressing | 25 | Chanh/giấm/mù tạt, tahini, đậu phộng/mè, hạt xay, quả bơ, sữa chua |

Trong 100 công thức có **82 công thức thuần chay theo danh sách nguyên liệu** và 18 công thức chay có trứng/sữa. Không suy diễn ăn chay từ trường `protein: plant`: bộ lọc kiểm tra metadata đã gán và các ID nguyên liệu; thêm nước mắm/thịt/nước dùng thịt sẽ không còn được nhận diện vegetarian, thêm sữa/trứng sẽ mất nhãn vegan. Nguyên liệu gia đình tự nhập chưa xác minh không được tự chứng nhận thuần chay. Người dùng vẫn cần kiểm tra nhãn thực phẩm, đặc biệt miso không dashi, mù tạt không mật ong và dị ứng hạt/đậu/mè/gluten/sữa/trứng.

Món ăn/salad ghi định lượng cho bốn suất; dressing ghi một mẻ cho **bốn phần sốt salad**, không phải bốn bữa chính. Dressing có gợi ý món phù hợp và hướng dẫn giữ lạnh/dùng trong ngày. Giá và quy cách đóng gói của 16 nguyên liệu mới chưa bị đoán.

[100 công thức đầy đủ](plant-recipes.json) · [Gallery hiện tại](gallery.html) · [Brief/checksum artwork](plant-generation.json) · [Kết quả kiểm tra](plant-test-results.txt).

## Artwork và giao diện

- Thêm `ingredients-v7.webp`: mè, tahini, đậu phộng, hạnh nhân, óc chó, hạt bí, hướng dương, chia, hạt lanh xay, bulgur, couscous, táo, cam, nho khô, Dijon và giấm táo.
- Thêm `dishes-v43.webp`–`dishes-v49.webp` cho đúng 100 công thức. Đã xem từng tấm và đối chiếu thứ tự/nguyên liệu; dressing được minh họa bằng bát sốt nhỏ, không dùng ảnh salad hoặc bữa chính. Giữ phong cách gouache và nền ngà của bộ cũ.
- Có chip Vegetarian, Thuần chay, Salad hạt, Dressing. Nhãn khẩu phần dressing, loại món và nhãn chế độ ăn được hiển thị theo nội dung đã kiểm tra.
- Khi chép dressing thành món gia đình vẫn giữ loại dressing, tránh biến sốt thành một món rau được tự lên lịch. Nếu sửa nội dung, artwork chuyển sang minh họa thành phần; dressing tự sửa dùng hình sốt, không dùng hình đĩa cơm.

## Thực đơn và dữ liệu

Dressing bị loại khỏi tự sinh thực đơn gia đình, thực đơn cũ và gợi ý món; người dùng vẫn có thể thêm sốt thủ công vào bữa. Thêm dressing không làm giảm một nửa khẩu phần salad do trùng nhóm `veg`, và một bát sốt riêng không tự cộng cơm trắng. Ngũ cốc bulgur/couscous được nhận diện tương tự quinoa/gạo lứt để tránh thêm cơm hai lần.

Nâng edition 4→5 chỉ thêm ID mới chưa có. Nâng trực tiếp edition 3→5 bổ sung hai bộ 100 đúng một lần; không ghi đè công thức gia đình, không đổi pantry/lịch/tùy chọn, không hồi sinh công thức đã chủ động xóa sau nâng edition. Giữ schema hiện tại và các 640 công thức trước. Khi xem định lượng nấu, chanh vàng/chanh xanh có thể hiện phần quả; shopping vẫn có thể làm tròn số quả cần mua.

## Kiểm tra

`npm run test:all` đạt: build/check, typecheck, unit/integration, startup và authenticated service worker, artwork browser. Test mới kiểm tra 100 công thức/16 nguyên liệu, 82 vegan, từ chối thành phần động vật/nguyên liệu lạ, bảo toàn dữ liệu khi nâng edition, không tự lên lịch sốt và không chia sai lượng salad/sốt.

Chromium giả lập **375×812**, **820×1100**, **1280×800**: thử các chip lọc, tìm salad quinoa và dressing tahini, mở/đóng modal, xác nhận hình nguyên liệu mới và nhãn bốn phần sốt, chép dressing thành món gia đình và xác nhận không được tự lên lịch; chuyển VI/EN, shopping và gallery; không có lỗi runtime/artwork 404/horizontal overflow trong các luồng này. Bộ startup còn kiểm tra 320px. Có ảnh `*-vegetarian.png`, `*-seed-salad.png`, `*-dressing.png` và `*-dressing-light.png`. Đã sửa vùng tóm tắt công thức và nút thêm vào bữa dùng màu theo theme để giữ độ tương phản ở giao diện tối.

Service worker thực chờ cache đủ **49 sheet món, 7 sheet nguyên liệu và hai ảnh sửa cũ**, tắt mạng/reload và mở artwork dressing tahini mới. Có ảnh `*-offline.png`. Đây là kiểm tra viewport Chromium, không phải thiết bị vật lý. Hình là minh họa, không phải ảnh chụp, bằng chứng dị ứng hay định lượng chính xác.

## Gợi ý phát triển tiếp

Nên ưu tiên bộ bữa sáng/ăn nhẹ, món đủ bữa 15–20 phút hoặc chia phần/cấp đông, sốt chấm đặc như hummus/baba ganoush và các nhóm ẩm thực Ấn/Trung Đông/Mexico. Các nhóm này là gợi ý cho đợt sau, không được tính là đã thêm trong 100 công thức hiện tại.

Nhánh `artwork/catalog-audit`, cùng PR #5. Chưa merge `main`, chưa bật auto-merge hoặc triển khai production.
