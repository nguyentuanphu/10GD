# Triển khai Bếp Gia Đình lên Netlify

Gói này gồm giao diện PWA trong `dist/`, backend trong `netlify/functions/`, cấu hình `netlify.toml` và dependency đã khóa trong `package-lock.json`.

## Cách triển khai đầy đủ

1. Giải nén gói, đưa các tệp/thư mục ở gốc gói vào repository Git của bạn. Giữ nguyên cấu trúc `dist/`, `netlify/`, `scripts/`, `package.json`, `package-lock.json`, `netlify.toml`.
2. Trong Netlify, Import an existing project → chọn repository. Netlify đọc `netlify.toml`: build `npm run check`, publish `dist`, functions `netlify/functions`. Node 22.
3. Trong cấu hình môi trường của Netlify, tạo `FAMILY_PASSWORD` với ít nhất 5 ký tự (app dùng giá trị đã cấu hình; không nhúng mật khẩu trong mã). Phạm vi phải có Functions. Không ghi mật khẩu thật vào repository, HTML hay `netlify.toml`.
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
- Đơn giá chỉ được tính khi biết lượng và đơn vị thật. So sánh cùng nguyên liệu tại cùng cửa hàng, có thể so giá theo cái/bó/gói nếu biết số lượng thật; không tự quy đổi ra /kg khi chưa rõ khối lượng. Khác nhãn hàng, quy cách, khuyến mãi có thể tạo chênh lệch.
- Đánh dấu đã mua từ receipt là tùy chọn; chỉ nguyên liệu đã đối ứng, có lượng hợp lệ trong danh sách đang xem. Cất đồ vào tủ là thao tác riêng.
- Metadata hóa đơn và lịch sử chi tiêu nằm trong dữ liệu chung. Ảnh giữ trong IndexedDB và tải lên Blobs khi kết nối. JSON sao lưu không chứa ảnh. Giữ ảnh gốc trong Photos nếu cần bản sao độc lập.

## Khối lượng mua và thành viên

- Trong Đi chợ, bấm số lượng ⇅ để cuộn chọn, chọn nhanh hoặc nhập g/kg, ml/lít, quả. Lượng mua riêng với lượng cần nấu. Thay đổi lượng mua bỏ dấu đã mua của dòng để kiểm tra lại.
- Gia đình → Quản lý / bớt người: thêm thành viên hoặc bớt đúng người, tối thiểu 1 và tối đa 12 người. Khẩu phần bữa đã nấu được giữ.

## Giới hạn được công bố

Bản review tại ChatGPT Sites chỉ chạy giao diện và dữ liệu cục bộ; backend chỉ hoạt động trên Netlify sau khi triển khai và cấu hình. Backend đã kiểm tra với store giả lập, chưa được kiểm chứng trên tài khoản Netlify của bạn. OCR đã đọc một ảnh receipt thử nghiệm với dữ liệu giả; cần kiểm tra ảnh thực tế. Chưa kiểm thử iPhone/Android thật; backend push và lịch nền đã có, cần xác nhận giao nhận trên Netlify sau deploy. Giá mẫu dự toán khác với giá thực mua từ receipt.

Giới hạn bản này: một gia đình / site, mọi người dùng cùng mật khẩu có quyền sửa, không có phân quyền tài khoản. Metadata tối đa 4 MB / lần lưu, ảnh JPEG tối đa 3,5 MB sau nén. Sử dụng Netlify có thể phát sinh chi phí theo gói của bạn. Không có tự động xóa hóa đơn cũ, vì vậy nên xuất JSON định kỳ và giữ ảnh gốc.

## Kiểm tra

`npm ci` rồi `npm test`. `npm run check` kiểm tra cú pháp toàn bộ JavaScript, backend và manifest. Tests gồm tính khẩu phần, tồn kho, lượng mua, món nước, phân tích Notes / receipt, đơn giá, xác thực phiên, nguồn request và ghi có điều kiện để phát hiện xung đột.

## Bữa ăn nhiều món

Mỗi bữa thêm được tối đa 12 món, gồm nhiều món cùng nhóm. Trong bữa ăn, chọn “Thêm / đổi từng món”: thêm giữ các món cũ; “Đổi món này” chỉ thay đúng món được chọn. Cỡ món mặc định tự chia trong nhóm (2 món mặn thì mỗi món dùng 50% công thức cho số suất của bữa); có thể chỉnh 25%, 50%, 75%, 100%, 150% hoặc 200%. Đây là quy tắc chia lượng, không phải khuyến nghị dinh dưỡng. Cơm trắng có lựa chọn tự động / có cơm / không thêm cơm.

Cài đặt gia đình có số món khi tự tạo: 1–3 món mặn, 0–2 canh, 0–3 rau; bữa món nước cuối tuần vẫn bắt đầu bằng một món chính, có thể thêm các món khác sau. Thực đơn tuần có dạng thẻ và dạng danh sách, hiển thị đầy đủ tên mọi món. Nguyên liệu, công việc chuẩn bị, trừ tồn khi nấu và chi phí đều dùng cỡ từng món.

## Cập nhật v1.3 — đơn vị mua, 540 công thức, cửa hàng và push

### Đơn vị ngoài gram

Bấm lượng mua rồi chọn cái / miếng / bó / gói / hộp / khay / túi / chai / con, hoặc tự đặt đơn vị. Ví dụ: nguyên liệu “Thịt gà”, số lượng “2 cái”, ghi chú “đùi gà”. Tick “Nhớ…” để lưu cách mua cho nguyên liệu đó. Có thể nhập số gram/ml/quả ước tính mỗi đơn vị và giá AUD mỗi đơn vị; cả hai đều không bắt buộc.

Nếu chưa biết gram, app không trừ một số gram đoán vào nhu cầu thực đơn và không tạo giá/kg giả. Vẫn tick mua và cất 2 cái / 1 bó vào tủ được. Lô chưa có quy đổi được giữ theo số cái/bó; bạn bổ sung tổng lượng cân được sau, hoặc xóa khi đã dùng hết. Khi có quy đổi ước tính, lượng còn lại sau nấu cũng là ước tính. Hóa đơn có thể ghi đơn giá thật theo bó/cái; so sánh giá chỉ cùng đơn vị tại cùng cửa hàng.

### Kho 540 món & biến thể

172 món mặn, 110 canh, 88 rau, 170 món nước/cháo. Các biến thể có nguyên liệu và cách nấu cụ thể. Kho được chia trang 24 thẻ, có tìm kiếm, nhóm món và thời gian. Nâng cấp dữ liệu cũ chỉ thêm các công thức mở rộng, không tạo lại những món cũ gia đình đã xóa.

### Gợi ý theo ngày

Mặc định: thứ Hai nhanh gọn; thứ Ba món cá; thứ Tư đậu hũ/trứng đổi vị; thứ Năm món yêu thích; thứ Sáu tận dụng tủ; thứ Bảy món nước; Chủ Nhật nấu thong thả/chuẩn bị tuần mới. Trong “Gợi ý theo ngày” có thể đổi ưu tiên từng ngày. App đề xuất riêng từng bữa để bạn xem trước rồi áp dụng, không tự sửa bữa đã nấu/khóa. Quy tắc này giúp đổi món và sắp xếp thời gian, không thay thế nhu cầu ăn uống riêng của từng người.

### Cửa hàng và địa chỉ

Tab Đi chợ → Cửa hàng: tự nhập tên và địa chỉ/chi nhánh. Nút bản đồ mở tìm kiếm địa chỉ đã nhập, không phải địa điểm app đã xác minh. Từng nguyên liệu có nút “Chọn nơi mua”, ghi chú và tùy chọn nhớ cho lần sau. Danh sách có thể gom theo quầy hoặc cửa hàng, lọc cửa hàng; tiến độ và ngân sách vẫn tính toàn bộ danh sách. Đồ mua thêm và yêu cầu mua gấp cũng có cửa hàng.

### Push: ai gửi, ai nhận?

- **Server Netlify gửi** tới Web Push service của trình duyệt. Điện thoại hiển thị theo quyền và cài đặt của người nhận.
- **Người trong gia đình tạo yêu cầu tức thời** bằng “Nhờ mua thêm”; chọn người nhận, món, lượng, cửa hàng và ghi chú. Yêu cầu được thêm vào danh sách cả khi chưa gửi được push. Trạng thái “dịch vụ push đã nhận” không đồng nghĩa người mua đã đọc.
- Mỗi điện thoại phải mở website, kết nối bằng mật khẩu gia đình, vào “Push & người nhận”, chọn thành viên và bật push. Trên iPhone cần cài ra Màn hình chính và mở từ biểu tượng. Các loại thông báo chọn riêng được.
- Không cần đặt VAPID keys trong HTML hay biến môi trường: lần bấm bật push sẽ tạo keys riêng trong Netlify Blobs. Private key chỉ ở server. Không xóa/đổi khóa khi đang có thiết bị đăng ký nếu không muốn đăng ký lại.
- Lịch tại `netlify/functions/reminders.mjs`, cấu hình `*/15 * * * *` trong `netlify.toml`. Netlify chỉ chạy lịch ở deploy production; lịch dùng UTC, code đổi sang Australia/Sydney và tính giờ mùa hè. Lần gửi có thể trễ trong cửa sổ 15 phút.
- Lịch mặc định: báo cơm theo giờ cài khi còn người pending; chuẩn bị tối khoảng 17:00; yêu cầu đi chợ chưa xong khoảng 09:00; kiểm tra hạn dùng 08:30; nhắc receipt 19:30 nếu tick mua hôm đó mà chưa ghi hóa đơn; vượt ngân sách thông báo một lần/tuần; Chủ Nhật 18:00 gợi ý lên tuần mới. Lịch chỉ gửi các mục người nhận đã bật, và tôn trọng giờ yên lặng của thiết bị. Yêu cầu mua gấp do thành viên chủ động gửi không bị lịch yên lặng của app giữ lại; OS vẫn có thể làm im thông báo.
- Người gửi trong app là tên thành viên được chọn trong gia đình dùng chung mật khẩu, không phải xác thực danh tính cá nhân.

### Kiểm tra sau deploy

1. Redeploy từ commit v1.3 để có dependency `web-push`, backend và scheduled function mới.
2. Trên hai điện thoại, kết nối cùng website; từng máy chọn thành viên và bật push.
3. Máy A chọn “Nhờ mua thêm”: “1 bó” + “rau mùi”, chọn cửa hàng, ghi “cần cho bữa tối”, chọn người ở máy B.
4. Kiểm tra thông báo máy B khi app mở, đóng và màn hình khóa; bấm thông báo phải mở danh sách có nguyên yêu cầu và địa chỉ.
5. Nếu không có thiết bị phù hợp, app phải báo chưa gửi được, giữ yêu cầu và cho chia sẻ nội dung. Không coi thao tác lưu yêu cầu là gửi push thành công.

Backend push/schedule đã có kiểm tra bằng transport giả lập, chưa xác nhận gửi tới điện thoại thật hoặc lịch chạy trên tài khoản Netlify của bạn. App không cam kết chuông/báo đúng giây vì phụ thuộc hệ điều hành và mạng.



## Chế độ đơn giản mặc định

Hôm Nay, Thực Đơn Tuần và Đi Chợ mở ở chế độ Đơn giản. Nút Đầy đủ hiện mọi chi tiết; lựa chọn nhớ riêng trên từng thiết bị, không đổi giao diện của người khác. Các mục mở rộng vẫn giữ nguyên chức năng.

Đi Chợ có tên món cỡ lớn, ô tick với vùng chạm 44–48 px, lượng mua và cửa hàng/địa chỉ ngay tại dòng. Chỉ hiện đồ chưa mua là tùy chọn; bỏ chọn để xem và bỏ tick lại. Tiến độ luôn tính trên toàn danh sách kể cả khi lọc theo cửa hàng.

## v1.4 — sản phẩm, lịch sử món, tiếng Anh và thông báo gọn hơn

- Sản phẩm & giá: nhập tay, lưu từ hóa đơn đã kiểm tra hoặc dán CSV. Giá kèm ngày kiểm tra, quy cách và chi nhánh; quá 7 ngày sẽ nhắc kiểm tra lại. Không có giá trực tiếp/API của Coles, Woolworths hoặc Chemist Warehouse trong bản này. Link tìm kiếm mở website chính thức để bạn xem và xác nhận. Thêm giỏ chỉ thêm vào danh sách của app, không mua hàng và không thay giỏ tài khoản retailer. Giá dự tính không được cộng vào chi thực tế cho đến khi lưu receipt.
- CSV có header `retailer,name,price,size,checkedAt` và tùy chọn `branch,barcode,url`. retailer là `coles`, `woolworths`, `chemist`; ngày `YYYY-MM-DD`; price trống là chưa rõ, số 0 là giá bằng 0. Có kiểm tra/xem trước rồi mới xác nhận thêm; tối đa 2000 sản phẩm. URL phải thuộc đúng website chính thức đã chọn. Dữ liệu CSV do người dùng cung cấp.
- Thống kê chỉ tính bữa đã bấm Đã nấu tới hôm nay. Mỗi món tối đa một lượt/bữa; một bữa nhiều món có nhiều lượt. Hoàn tác sẽ bỏ lượt đó. Bữa chưa nấu, bữa tương lai và bữa 0 suất không được tính. Chỉ là nhật ký nấu, không xác nhận từng người đã ăn.
- Gợi ý dùng lịch sử, số lần 30 ngày, lần gần nhất, sở thích, khoảng gợi ý lại 7/14/21/30 ngày, cài đặt thời gian/nguyên liệu tránh và tủ đã ghi. Có ưu tiên đa dạng nhóm món/đạm. Không dùng dịch vụ AI ngoài, không phải tư vấn dinh dưỡng.
- Tiếng Việt/English ở góc trên, nhớ riêng từng thiết bị. Màn hình chính, sản phẩm, thống kê và cài push có tiếng Anh. Tên món, hướng dẫn công thức và nội dung người dùng giữ ngôn ngữ gốc; một số trợ giúp/cài đặt cũ vẫn còn tiếng Việt.
- Thông báo: từng máy chọn vai trò nấu/đi chợ/cả hai và ngôn ngữ riêng; thiết bị cũ cần mở Push & người nhận và lưu lại lựa chọn. Nhắc báo cơm chỉ tới người còn pending. Nhắc tự động tối đa 2/thiết bị/ngày, có conditional writes để tránh vượt do chạy đồng thời.
- Nhờ mua thêm mặc định thường (`shopping`); gửi khẩn (`urgent`) cần chọn riêng. Yên lặng chặn cả hai trừ khi người nhận cho phép khẩn đi qua. Không gửi bù các nhắc bị yên lặng, tắt hoặc vượt giới hạn; yêu cầu vẫn trong app. Nút thử chỉ gửi tới ID thiết bị hiện tại, không gửi cả gia đình.
- Test kiểm tra bằng transport giả lập; chưa kiểm tra giao nhận thực trên iPhone/Android. Không có email hay tin nhắn Messenger nào được gửi tự động trong kiểm tra.


## Bản review: khóa web, lịch tháng và nhắn khẩn

Bản thay đổi này chưa được deploy. Cần chủ nhà duyệt bằng “Deploy” theo AGENTS.md.

Edge Function `family-gate` chặn toàn bộ trang và tài nguyên riêng trước đăng nhập; chỉ endpoint đăng nhập/trạng thái và tài nguyên PWA công khai được miễn. FAMILY_PASSWORD phải có Functions scope. Nếu không có mật khẩu cũ, người dùng vẫn có thể đăng nhập tài khoản riêng; khách chỉ thấy trang đăng nhập. Chưa kiểm tra hoặc thay đổi giá trị môi trường Netlify trong đợt này.

“Tin cậy trình duyệt” lưu cookie phiên tối đa 30 ngày; không chọn thì phiên máy chủ 8 giờ, cookie theo phiên trình duyệt. Cookie HttpOnly, Secure, SameSite=Strict. Trang riêng không được CDN cache công khai. Service Worker kiểm tra phiên khi có mạng; bản tổng hợp mới cho phép mở cache offline bằng quyền đã ký còn hạn, sau lần đăng nhập/tải đủ đầu tiên. Đăng xuất xóa cookie và cache riêng.

Trong Ai về ăn cơm → Lịch tháng, chọn thành viên, ngày và bữa, đánh dấu Vắng/Bận, chọn có trừ khẩu phần và nhắc 19:00 hôm trước hay không. Bữa tự tính sẽ cập nhật nguyên liệu; bữa đã nấu hoặc nhập số suất cố định giữ nguyên và có chú thích. Chọn trạng thái Xóa để bỏ lịch đã chọn. Thiết bị nhận nhắc cần bật “Lịch vắng & khẩu phần”; vẫn áp dụng giờ yên lặng và giới hạn 2 nhắc tự động/ngày.

Nhắn khẩn lưu độc lập trong Netlify Blobs, gửi push đến thiết bị phù hợp đã đăng ký. Dịch vụ nhận push không có nghĩa người nhận đã đọc; trạng thái đã đọc do người nhà đánh dấu trong app. Tên thành viên được chọn trên thiết bị dùng chung mật khẩu. SMS/chia sẻ chỉ mở ứng dụng để người dùng tự chọn người nhận và gửi; chưa có dịch vụ SMS tự động. Cần kiểm tra push/SMS trên điện thoại thật sau khi deploy được duyệt.


## Bản tổng hợp tiếp theo — tài khoản, thiết lập, VND/AUD, giọng nói và offline

Chưa deploy. Giữ nguyên biến FAMILY_PASSWORD để gia đình cũ dùng như trước. Backend accounts độc lập với mật khẩu chung. Có thể đặt ALLOW_ACCOUNT_SIGNUP=false (Functions scope) để tắt đăng ký mới. Cần deploy đầy đủ Functions + Edge, không chỉ kéo thả dist.

Kho bep-accounts giữ hash mật khẩu, phiên, vai trò và mã mời. Mỗi gia đình dùng tiền tố households/<id>/ trong bep-family-data. Kho bep-family-auth giữ khóa ký quyền offline (private key không gửi ra trình duyệt). Mọi tài nguyên gia đình vẫn cần xác thực ở API. Đăng ký dùng username, không gửi email; người dùng phải tự giữ mã khôi phục một lần.

Người mới: đăng ký → lưu mã khôi phục → tạo/tham gia gia đình → thiết lập 5 bước hoặc giữ/chuyển dữ liệu cũ. Người đang dùng mật khẩu chung không bị ép chuyển. Chuyển bản cũ chỉ vào gia đình trống, xác thực cả tài khoản và mật khẩu cũ, tải backup rồi xác nhận; không ghi đè nguồn hay đích đã có dữ liệu. Bật push lại sau khi chuyển. Trình duyệt dùng một đăng ký push cho gia đình bật gần nhất.

Tiền tệ giữ riêng AUD/VND; không quy đổi hóa đơn cũ. Giá dự toán lấy từ giá nhập hoặc receipt đã xác nhận cùng currency/đơn vị. Việt Nam dùng Asia/Ho_Chi_Minh; lịch nhắc Sydney vẫn giữ Australia/Sydney cho gia đình chưa đổi.

Offline: đăng nhập và để tải đủ một lần; vào Bếp của tôi để kiểm tra trạng thái sẵn sàng offline. Phiên thường tối đa 8 giờ (mở lại offline trong cùng phiên trình duyệt); tin cậy tối đa 30 ngày. Thực đơn, món riêng, lịch, tủ thực phẩm, tick đi chợ, Notes, ghi receipt/ảnh thủ công và thống kê trên dữ liệu đã tải hoạt động trên máy. Thay đổi còn chờ đồng bộ được giữ qua tải lại; đồng bộ dùng etag và dừng nếu người khác đã thay đổi. Hết hạn quyền hoặc logout thì phải đăng nhập online lại. Thu hồi từ máy khác chỉ được biết khi thiết bị kết nối lại.

Tài khoản/lời mời/khôi phục, gửi và nhận push/tin khẩn, thời tiết, mic nhận dạng trình duyệt, tải OCR và website cửa hàng/Messenger cần mạng. App báo lúc dùng. Ảnh receipt offline vẫn giữ được và nhập dòng bằng tay. Không hứa gửi thông báo lịch khi máy hoàn toàn offline. Voice chỉ nghe khi bấm bật và luôn có bản xem lại; có thể dùng bàn phím/đọc chính tả của hệ điều hành thay thế.

QA hiện tại là test backend/service worker với network và push được mock cùng review giao diện offline mô phỏng. Chưa mở đăng ký trên production, chưa thay cấu hình Netlify, chưa thử mic/push/chế độ máy bay trên iPhone thật. Sau khi chủ nhà nói Deploy cho bản này, cần kiểm tra các bước đó trên deployment trước khi giới thiệu dùng rộng.
