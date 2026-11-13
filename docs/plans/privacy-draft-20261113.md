# Draft for Henry: privacy page section 9 (D26–D30), 13 Nov 2026 (Sydney time)

Not on any release branch's privacy page until Henry approves (rule 28). It only describes what the app already does; nothing new is sent.

## Tiếng Việt

**9. Những lần app gọi ra ngoài**

- **Thời tiết:** khi gia đình chọn thành phố trong "Thời tiết", app gửi tên thành phố đó tới máy chủ của app. Máy chủ hỏi nhiệt độ ở Open-Meteo và giữ nhiệt độ mới nhất theo thành phố, không kèm gia đình hay tài khoản.
- **Tìm giá online:** từ tìm kiếm tiếng Anh bạn gõ hoặc xác nhận (ví dụ "gravy beef") được lưu trong một danh sách chung, không kèm tên gia đình, tài khoản hay tên món của bạn. App dùng từ đó để hỏi giá ở các siêu thị trực tuyến. Giá tìm được hiện cho mọi gia đình đã tìm cùng từ, và người vận hành thấy danh sách từ này.
- **Thống kê giọng nói** (thêm cho mục 3): cùng với chữ đã xác nhận, app gửi một mã gia đình đã mã hoá một chiều (không đọc ngược ra tên hay tài khoản, nhưng giống nhau mỗi lần, nên các lần gửi của một gia đình nối được với nhau) và một mã ngẫu nhiên của máy, dùng để xoá dữ liệu khi bạn tắt.
- **Cập nhật app:** mọi máy, kể cả khi dùng không tài khoản, gửi một ghi chú kỹ thuật khi app tự cập nhật: loại sự kiện, lý do, kết quả và số phiên bản. Không kèm dữ liệu gia đình.
- **Thư viện và hình ảnh tải từ bên ngoài:** máy bạn tải trực tiếp phông chữ từ Google Fonts (mỗi lần mở app), thư viện đọc hoá đơn và nhận giọng nói từ jsDelivr, gói giọng nói từ Hugging Face, và ảnh sản phẩm từ trang của siêu thị (Coles, Woolworths, ALDI, Harris Farm, WhichGrocer). Những nơi này thấy địa chỉ IP, loại trình duyệt và thời điểm tải, như khi bạn mở bất kỳ trang web nào. Không gửi dữ liệu gia đình, ảnh hoá đơn hay âm thanh.

## English

**9. When the app reaches outside**

- **Weather:** when the family picks a city in "Weather", the app sends that city to the app's server, which asks Open-Meteo for the temperature and keeps the latest reading per city, with no family or account attached.
- **Find prices online:** the English search word you type or confirm (e.g. "gravy beef") is kept in one shared list, without your family, account or dish name. The app uses it to ask online supermarkets for prices; the prices found show for every family that searched the same word, and the operator can see the list of words.
- **Voice statistics** (adds to section 3): with the confirmed words the app sends a one-way coded family code (it cannot be turned back into a name or account, but it is the same each time, so one family's reports can be linked) and a random code for the device, used to delete the data when you turn it off.
- **App updates:** every device, including device-only use, sends a technical note when the app updates itself: the event, the reason, the result and the version. No family data.
- **Libraries and pictures loaded from elsewhere:** your device loads fonts from Google Fonts (each time the app opens), the receipt-reading and voice libraries from jsDelivr, voice packs from Hugging Face, and product photos from supermarket sites (Coles, Woolworths, ALDI, Harris Farm, WhichGrocer). These sites see your IP address, browser type and the time, as with any web page. No family data, receipt photos or sound are sent.

## Not changed
- D25 (feedback page): Henry, 13 Nov: "Để nguyên như cũ".
