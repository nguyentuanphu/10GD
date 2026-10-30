# Triển khai Bếp Gia Đình lên Netlify

Gói này gồm giao diện PWA trong `dist/`, backend trong `netlify/functions/`, cấu hình `netlify.toml` và dependency đã khóa trong `package-lock.json`.

## Cách triển khai đầy đủ

1. Giải nén gói, đưa các tệp/thư mục ở gốc gói vào repository Git của bạn. Giữ nguyên cấu trúc `dist/`, `netlify/`, `scripts/`, `package.json`, `package-lock.json`, `netlify.toml`.
2. Trong Netlify, Import an existing project → chọn repository. Netlify đọc `netlify.toml`: build `npm run check`, publish `dist`, functions `netlify/functions`. Node 22.
3. Trong cấu hình môi trường của Netlify, tạo `FAMILY_PASSWORD` với ít nhất 12 ký tự (nên là một mật khẩu dài, khó đoán). Phạm vi phải có Functions. Không ghi mật khẩu thật vào repository, HTML hay `netlify.toml`.
4. Deploy / redeploy sau khi đặt biến. Nếu dùng CLI, cài dependency tại gốc bằng `npm ci`, rồi dùng Netlify CLI deploy có build và functions. Chỉ kéo thư mục `dist` vào Netlify Drop sẽ KHÔNG triển khai backend lưu trữ.
5. Mở website → Gia đình / Cài đặt → Lưu trên Netlify (hoặc tab Chi tiêu → Đồng bộ Netlify) → nhập mật khẩu. Lần đầu sẽ tạo bản chung từ dữ liệu trên máy. Khi đã có bản chung, app cho chọn dùng bản Netlify hoặc bản trên máy.
6. Điện thoại khác mở cùng URL, nhập cùng mật khẩu. Dữ liệu được tải lại khi mở app và kiểm tra cập nhật khi app đang mở. Nếu hai máy sửa chồng nhau, app dừng ghi và cho đối chiếu; không âm thầm ghi đè.

Không cần Netlify personal access token trong trình duyệt. Functions dùng quyền Netlify cấp cho Blobs. Dữ liệu dùng site-wide store `bep-family-data`, strong consistency và region Sydney (`ap-southeast-2`), giữ qua các lần deploy. Ảnh receipt riêng tư được truy cập qua function có xác thực.

## Ghi chú iPhone / Android

- iPhone Notes, Google Keep, Samsung Notes: sao chép/dán văn bản vào “Nhập Notes”, hoặc xuất `.txt` / `.md` rồi chọn tệp. Không cấp quyền đọc toàn bộ Notes.
- Android có thể chia sẻ văn bản/tệp text sang PWA đã cài nếu hệ điều hành hỗ trợ Share Target. iPhone dùng dán hoặc chọn tệp. Tính năng Share Target chưa được thử trên điện thoại thật.
- Danh sách mua: xem trước từng dòng, đối ứng nguyên liệu, lượng và đơn vị; dòng khác được thêm riêng. Nhập áp dụng vào khoảng ngày đang xem.
- Thực đơn: `Thứ 2 tối: Gà kho gừng + Canh bí xanh`. Món không trùng kho chỉ nhập tên và hiện cảnh báo thiếu nguyên liệu.
- Công thức: mỗi lần một món, dòng đầu tên, phần `Nguyên liệu:` rồi từng dòng `Thịt gà 500g`, phần `Cách nấu:` rồi mỗi bước một dòng. Đối ứng và kiểm tra trước khi lưu, công thức mặc định 4 người và 30 phút cần kiểm tra lại.

## Hóa đơn và chi tiêu

- Chụp ảnh / chọn JPEG hoặc PNG. OCR chạy trên thiết bị bằng Tesseract.js, tải mã và model từ CDN lần đầu. Không cần API key trả phí. Việc tải model đầu tiên có thể lâu; độ rõ ảnh, tên viết tắt, ngôn ngữ, góc chụp ảnh hưởng kết quả.
- Kiểm tra tên cửa hàng, ngày mua, từng dòng, đơn vị, khối lượng và tổng tiền trước khi lưu. Không tự ghi chi tiêu chỉ vì đã chụp ảnh.
- App đề xuất ghép tên tiếng Anh/Việt và ghi nhớ đối ứng bạn xác nhận. Dòng không rõ ở trạng thái chưa đối ứng; danh sách gợi ý ưu tiên nguyên liệu đang cần mua, sau đó nguyên liệu khác và món trong thực đơn.
- Tổng hóa đơn là chi thực tế. Không cộng lại chi phí dự kiến đi chợ. Nếu lệch tổng các dòng, phải xác nhận để giữ phần chênh chưa phân bổ.
- Đơn giá chỉ được tính khi biết lượng và đơn vị thật. So sánh cùng nguyên liệu tại cùng cửa hàng, không suy ra đơn giá từ một “gói” chưa rõ lượng. Khác nhãn hàng, quy cách, khuyến mãi có thể tạo chênh lệch.
- Đánh dấu đã mua từ receipt là tùy chọn; chỉ nguyên liệu đã đối ứng, có lượng hợp lệ trong danh sách đang xem. Cất đồ vào tủ là thao tác riêng.
- Metadata hóa đơn và lịch sử chi tiêu nằm trong dữ liệu chung. Ảnh giữ trong IndexedDB và tải lên Blobs khi kết nối. JSON sao lưu không chứa ảnh. Giữ ảnh gốc trong Photos nếu cần bản sao độc lập.

## Khối lượng mua và thành viên

- Trong Đi chợ, bấm số lượng ⇅ để cuộn chọn, chọn nhanh hoặc nhập g/kg, ml/lít, quả. Lượng mua riêng với lượng cần nấu. Thay đổi lượng mua bỏ dấu đã mua của dòng để kiểm tra lại.
- Gia đình → Quản lý / bớt người: thêm thành viên hoặc bớt đúng người, tối thiểu 1 và tối đa 12 người. Khẩu phần bữa đã nấu được giữ.

## Giới hạn được công bố

Bản review tại ChatGPT Sites chỉ chạy giao diện và dữ liệu cục bộ; backend chỉ hoạt động trên Netlify sau khi triển khai và cấu hình. Backend đã kiểm tra với store giả lập, chưa được kiểm chứng trên tài khoản Netlify của bạn. OCR đã đọc một ảnh receipt thử nghiệm với dữ liệu giả; cần kiểm tra ảnh thực tế. Chưa kiểm thử iPhone/Android thật, thông báo push theo lịch nền chưa có dịch vụ gửi. Giá mẫu dự toán khác với giá thực mua từ receipt.

Giới hạn bản này: một gia đình / site, mọi người dùng cùng mật khẩu có quyền sửa, không có phân quyền tài khoản. Metadata tối đa 4 MB / lần lưu, ảnh JPEG tối đa 3,5 MB sau nén. Sử dụng Netlify có thể phát sinh chi phí theo gói của bạn. Không có tự động xóa hóa đơn cũ, vì vậy nên xuất JSON định kỳ và giữ ảnh gốc.

## Kiểm tra

`npm ci` rồi `npm test`. `npm run check` kiểm tra cú pháp toàn bộ JavaScript, backend và manifest. Tests gồm tính khẩu phần, tồn kho, lượng mua, món nước, phân tích Notes / receipt, đơn giá, xác thực phiên, nguồn request và ghi có điều kiện để phát hiện xung đột.

## Bữa ăn nhiều món

Mỗi bữa thêm được tối đa 12 món, gồm nhiều món cùng nhóm. Trong bữa ăn, chọn “Thêm / đổi từng món”: thêm giữ các món cũ; “Đổi món này” chỉ thay đúng món được chọn. Cỡ món mặc định tự chia trong nhóm (2 món mặn thì mỗi món dùng 50% công thức cho số suất của bữa); có thể chỉnh 25%, 50%, 75%, 100%, 150% hoặc 200%. Đây là quy tắc chia lượng, không phải khuyến nghị dinh dưỡng. Cơm trắng có lựa chọn tự động / có cơm / không thêm cơm.

Cài đặt gia đình có số món khi tự tạo: 1–3 món mặn, 0–2 canh, 0–3 rau; bữa món nước cuối tuần vẫn bắt đầu bằng một món chính, có thể thêm các món khác sau. Thực đơn tuần có dạng thẻ và dạng danh sách, hiển thị đầy đủ tên mọi món. Nguyên liệu, công việc chuẩn bị, trừ tồn khi nấu và chi phí đều dùng cỡ từng món.
