# Audit hình món ăn — 02/11/2026

Bản được kiểm tra: `d625b64` (main, v1.7.3). Đã xem trực quan toàn bộ 740 thumbnail, đối chiếu tên/thành phần và hình thức chế biến; mở ảnh nguồn lớn hơn cho các trường hợp nghi vấn. Mỗi bản ghi JSON giữ nguyên công thức và SHA-256 của hình đã kiểm tra.

| Kết quả | Số món |
|---|---:|
| Cần sửa hình hoặc mâu thuẫn công thức/tên | 19 |
| Phù hợp trực quan ở mức minh họa | 669 |
| Cần rà chi tiết còn mơ hồ | 27 |
| Dressing: hợp màu/độ sệt, chưa thể xác nhận thành phần từ hình | 25 |

740/740 có thumbnail và ảnh nguồn, không thiếu file. Việc có file và gán đúng ô ảnh không chứng minh hình đúng nội dung. Không kết luận toàn bộ catalog đã đúng hoàn toàn.

## Các món cần sửa

| Món / ID | Phát hiện | Hướng xử lý |
|---|---|---|
| Thịt kho trứng (`r4`) | Hình có hành lá xanh trong khi danh sách nguyên liệu không có hành lá. | Bỏ hành lá khỏi artwork; không tự thêm định lượng vào công thức. |
| Tôm rim tỏi (`r6`) | Hình có hành lá xanh trong khi danh sách nguyên liệu không có hành lá. | Bỏ hành lá khỏi artwork; không tự thêm định lượng vào công thức. |
| Đậu hũ sốt cà chua (`r7`) | Hình có lá rau mùi/ngò dạng lá xẻ bên trên, ngoài danh sách nguyên liệu (hành lá không phải ngò). | Bỏ lá ngò; giữ hành lá đã được ghi trong công thức. |
| Canh bí xanh (`r16`) | Hình có lá rau mùi/ngò dạng lá xẻ bên trên, ngoài danh sách nguyên liệu (hành lá không phải ngò). | Bỏ lá ngò; giữ hành lá đã được ghi trong công thức. |
| Thịt viên sốt nấm (`r11`) | Hình có hành lá xanh trong khi danh sách nguyên liệu không có hành lá. | Bỏ hành lá khỏi artwork; không tự thêm định lượng vào công thức. |
| Canh khoai tây cà rốt (`r20`) | Hình có lá rau mùi/ngò dạng lá xẻ bên trên, ngoài danh sách nguyên liệu (hành lá không phải ngò). | Bỏ lá ngò; giữ hành lá đã được ghi trong công thức. |
| Cá hồi áp chảo bơ tỏi kèm khoai tây & bông cải (`family-v3-4`) | Tên món ghi bơ tỏi nhưng công thức chỉ có dầu ăn, không có bơ. Hình không thể chứng minh loại chất béo. | Đổi tên thành cá hồi áp chảo tỏi hoặc bổ sung bơ theo định lượng được duyệt; không xác nhận ảnh là món bơ tỏi hiện tại. |
| Thịt heo xào đậu Hà Lan (`family-v3-37`) | Hình vẽ nhiều đậu nguyên quả/đậu que; công thức dùng peas (đậu Hà Lan hạt), thể hiện bằng hạt tròn ở các món cùng nguyên liệu. | Vẽ lại phần đậu thành hạt tròn; giữ đạm và cà rốt. |
| Thịt bò hấp sả (`family-v3-78`) | Hình có hành lá xanh trong khi danh sách nguyên liệu không có hành lá. | Bỏ hành lá khỏi artwork; không tự thêm định lượng vào công thức. |
| Thịt bò sốt gừng nấm (`family-v3-83`) | Hình có các múi hành tây rõ bên cạnh nấm/gừng, nhưng công thức không có hành tây. | Bỏ múi hành tây khỏi artwork. |
| Thịt bò xào đậu Hà Lan (`family-v3-85`) | Hình vẽ nhiều đậu nguyên quả/đậu que; công thức dùng peas (đậu Hà Lan hạt), thể hiện bằng hạt tròn ở các món cùng nguyên liệu. | Vẽ lại phần đậu thành hạt tròn; giữ đạm và cà rốt. |
| Cá hồi xào nấm (`family-v3-113`) | Hình có hành lá xanh trong khi danh sách nguyên liệu không có hành lá. | Bỏ hành lá khỏi artwork; không tự thêm định lượng vào công thức. |
| Cá hồi sốt gừng nấm (`family-v3-131`) | Hình có các múi hành tây rõ bên cạnh nấm/gừng, nhưng công thức không có hành tây. | Bỏ múi hành tây khỏi artwork. |
| Cá hồi xào đậu Hà Lan (`family-v3-133`) | Hình vẽ nhiều đậu nguyên quả/đậu que; công thức dùng peas (đậu Hà Lan hạt), thể hiện bằng hạt tròn ở các món cùng nguyên liệu. | Vẽ lại phần đậu thành hạt tròn; giữ đạm và cà rốt. |
| Tôm xào đậu Hà Lan (`family-v3-156`) | Hình vẽ nhiều đậu nguyên quả/đậu que; công thức dùng peas (đậu Hà Lan hạt), thể hiện bằng hạt tròn ở các món cùng nguyên liệu. | Vẽ lại phần đậu thành hạt tròn; giữ đạm và cà rốt. |
| Súp bí đỏ kem tươi kiểu Âu (`family-v3-7`) | Tên món ghi sốt/súp kem nhưng công thức không có kem hoặc sữa; hình thể hiện sốt/súp có vẻ kem. | Chốt tên và công thức trước khi duyệt ảnh; không tự suy ra kem từ màu trắng/vàng của hình. |
| Mì Ý Bolognese bò bằm sốt cà chua (`family-v3-1`) | Tên và hướng dẫn là mì Ý sợi; hình vẽ spaghetti nhưng ingredient id pasta hiện mang tên Nui. | Dùng ingredient spaghetti hiện có, rà lại định lượng/đơn vị; giữ hình nếu tiếp tục dùng tên mì Ý sợi. Không tự đổi số lượng. |
| Mì Ý cá hồi sốt kem nấm tỏi (`family-v3-2`) | Tên và hướng dẫn là mì Ý sợi; hình vẽ spaghetti nhưng ingredient id pasta hiện mang tên Nui. Tên món ghi sốt/súp kem nhưng công thức không có kem hoặc sữa; hình thể hiện sốt/súp có vẻ kem. | Dùng ingredient spaghetti hiện có, rà lại định lượng/đơn vị; giữ hình nếu tiếp tục dùng tên mì Ý sợi. Không tự đổi số lượng. Chốt tên và công thức trước khi duyệt ảnh; không tự suy ra kem từ màu trắng/vàng của hình. |
| Mì Ý ức gà áp chảo nấm sốt tỏi (`family-v3-3`) | Tên và hướng dẫn là mì Ý sợi; hình vẽ spaghetti nhưng ingredient id pasta hiện mang tên Nui. | Dùng ingredient spaghetti hiện có, rà lại định lượng/đơn vị; giữ hình nếu tiếp tục dùng tên mì Ý sợi. Không tự đổi số lượng. |

## Chi tiết cần xác minh

Các món có trạng thái `needs-detail-review` được liệt kê đầy đủ trong CSV/JSON và gallery. Đây là nghi vấn về hình dạng chi tiết nhỏ, chưa phải bằng chứng nguyên liệu sai.

## Giới hạn và bằng chứng

- Đã xem tất cả hình món; ảnh nguồn lớn hơn được dùng để xác minh nghi vấn. Không thể xác nhận định lượng, dị ứng, chất béo, nước dùng hoặc nhiệt độ chín bằng artwork.
- 25 dressing giữ trạng thái giới hạn thị giác, không được tính vào nhóm đã khớp thành phần.
- Không audit ảnh nguyên liệu độc lập, ảnh do gia đình tự tải, dữ liệu đồng bộ riêng hoặc giao diện trên thiết bị thật trong lượt này.
- Chỉ thêm hồ sơ audit; chưa thay hình, chưa đổi công thức, chưa triển khai sản phẩm.
- [Danh sách 740 món (CSV)](audit.csv) · [Dữ liệu và hash ảnh (JSON)](audit.json) · [Gallery có công thức và bộ lọc](gallery.html).
- [Ảnh phóng lớn các trường hợp đã kiểm tra](zoom-evidence.jpg); số thứ tự khớp cột ordinal trong CSV/JSON. Một số nghi vấn trong ảnh đã được loại bỏ sau phóng lớn, không phải mọi món trong ảnh đều sai.
- Gallery mở từ checkout repo để tải ảnh tương đối từ dist; GitHub không trực tiếp render trang HTML.
- `source.json` là snapshot công thức tại commit audit; `make-report.py` tái tạo báo cáo từ snapshot và ghi nhận trực quan.
