# Kiểm kê và bản nháp thiết kế artwork — 10GD

Phạm vi: mã nguồn `nguyentuanphu/10GD`, baseline `0bcef706f1b01260b4c0a5980aa67ad09fc63c95`. Không truy cập dữ liệu gia đình trực tuyến, vì vậy số lượng dưới đây **chỉ là catalog có sẵn trong repo**, chưa gồm nguyên liệu/công thức gia đình đã tự nhập.

## Kết quả ban đầu

| Hạng mục | Số mục | Có hình hiển thị | Artwork thực tế |
|---|---:|---:|---|
| Nguyên liệu | 58 | 58 | 48 ô trong 3 sheet; có dùng chung ô |
| Món ăn | 540 | 540 | 16 ô dùng chung theo nhóm, không có 540 tranh riêng |

Phân loại món: 172 món mặn, 110 canh, 88 rau, 170 món nước/súp/cháo.

Đã xem trực tiếp cả bốn sheet gốc và đọc logic gán ảnh. Các lỗi rõ: sườn → cốt lết; rau muống/rau cải → cải thìa; miến → bún; udon/bánh canh/bánh phở chung một hình; nui/cơm chín chung ô chứa cả hai; trứng chiên → canh cà chua trứng; mì Ý bò → phở bò; rau luộc có thể thành cải thìa hoặc đậu que xào nấm. Có hình không đồng nghĩa hình đúng công thức.

16 nguyên liệu được thay representation để phân biệt hoặc làm rõ dạng nguyên liệu. Không khẳng định 42 mục còn lại đã được chứng nhận chính xác về giống, cách cắt hoặc bao bì. Cũng không coi 513 món chưa có tranh được duyệt là 513 ảnh đã xác nhận sai: một số ảnh cũ chỉ gần đúng nhóm món.

## Bản nháp đã làm

- Thêm 16 ô nguyên liệu và 16 ô món theo artwork gốc, giữ toàn bộ sheet cũ.
- Gán 27 công thức tham khảo vào tranh có thành phần chính phù hợp. Chi tiết trang trí vẫn có thể khác công thức.
- 513 món còn lại có SVG sơ bộ dựa trên thành phần và dạng món; mỗi món có brief riêng chứa nguyên liệu, prep và bước nấu. **Chưa hoàn tất tranh gouache riêng và duyệt mắt từng món.** SVG có hạn chế về hình dáng thịt bằm, cách cắt, kỹ thuật nấu và độ đồng nhất với tranh gốc; không coi là artwork thành phẩm.
- Không gán tranh tham khảo theo protein một cách rộng rãi nữa. Công thức tự nhập/đã sửa dùng minh họa thành phần; nguyên liệu lạ có biểu tượng trung tính.
- Không thay đổi công thức, số lượng, giá hay dữ liệu gia đình.

[Gallery đủ 58 nguyên liệu và 540 món](gallery.html) · [Kiểm kê và brief từng mục](catalog.json). Tạo lại bằng `npm run artwork:audit`.

## Cấu trúc dự án liên quan

Ứng dụng TypeScript build ra thư mục `dist`; seed/catalog cấp công thức tham khảo, core tính khẩu phần/tồn kho/đi chợ, các module family-menu quản lý món gia đình và lịch ăn. Artwork được gọi chung từ kho món, chi tiết, lịch, shopping và pantry. Bootstrap tải theo thứ tự qua startup pack; service worker giữ shell và sheet offline. Backend xử lý tài khoản, gia đình, đồng bộ, ảnh hóa đơn và thông báo. Thay đổi chỉ tác động phần artwork, thứ tự tải phụ thuộc và cache, không đụng schema lưu trữ.

## Kiểm tra và giới hạn

- `npm run check`, `npm run typecheck`, test artwork và `npm run test:browser`: đạt.
- Các test core, spending, backend, units/catalog, insights/products, family-menu, access/calendar, accounts, personal, offline, email recovery và invitations: đạt khi chạy đến/riêng từng suite.
- `npm test` chưa xanh: `push.test.mjs` kỳ vọng accepted=1 nhưng nhận 0 ở lần gửi urgent mặc định. Test dùng giờ thực mặc định; thời điểm kiểm tra ở Sydney nằm trong quiet hours. Không sửa module push/test ngoài phạm vi. Không có thay đổi vào hai file này.
- Review Chromium bằng viewport giả lập: mobile 375×812, tablet 820×1100, PC 1280×800; reduced motion. Đã thử chuyển sang kho tham khảo, tìm món, mở/đóng chi tiết, chuyển shopping và tìm trong gallery; không phát hiện horizontal overflow hoặc page runtime error. Bằng chứng: `*-catalog.png`, `*-detail.png`, `*-shopping.png`, `*-composition.png`.
- Chưa kiểm tra thiết bị thật, luồng tài khoản/dữ liệu live, offline end-to-end, chuyển ngôn ngữ qua UI trong lượt review này. Kiểm tra cache là kiểm tra tĩnh và test offline hiện có. Chưa chứng nhận responsive QA đầy đủ theo checklist phát hành.
- Đây là **bản nháp để review, chưa sẵn sàng phát hành**. Nhánh `artwork/catalog-audit`; chưa merge, push main hoặc deploy.
