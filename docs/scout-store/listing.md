# FamTray Price Compare (FamTray So sánh giá): store listing pack (Chrome Web Store / Edge Add-ons)

Copy the text below into the store forms. Everything here matches what the extension does in v1.7.0 (`extension/`). Please check it again if the extension changes.

## Name and summary

- **Name:** FamTray So sánh giá · Price Compare (EN listing: FamTray Price Compare; VI listing: FamTray So sánh giá)
- **Short description / summary (max 132 characters)**
  - EN: `Saves the shelf prices you view on Woolworths, Coles, ALDI, Chemist Warehouse and Amazon AU for your family kitchen app.` (117)
  - VI: `Ghi lại giá kệ bạn xem trên Woolworths, Coles, ALDI, Chemist Warehouse và Amazon AU cho ứng dụng bếp gia đình.` (112)
- **Category:** Shopping (Chrome) / Shopping (Edge)
- **Language:** Vietnamese and English (the extension switches between them)

## Long description

### English

FamTray Price Compare is the price helper for the FamTray / Bếp Gia Đình family kitchen app.

When you open a product or specials page on a supported Australian supermarket site, Price Compare reads the shelf facts on that page: product name, price, unit price, was-price, promotion, pack size, product id and the store name. It then saves them to your family's kitchen app, where they help compare prices for your shopping list and are shared with Community prices.

- Works only on woolworths.com.au, coles.com.au, aldi.com.au, chemistwarehouse.com.au and amazon.com.au.
- Records price facts only. It never takes images, descriptions, reviews, cookies, account details or anything you type.
- One-click pairing from the family app (My kitchen → Family connection → Pair now). No account details are entered in the extension.
- Optional scheduled mode, off by default. It must be switched on by the family owner and by you. It opens one page at a time in its own window at a set pace, follows each site's robots.txt, and only runs inside your schedule, unless the owner asks for a single "Run now". It stops straight away and pauses for 24 hours if a site shows a check page or blocks access. It never tries to solve or get around those checks.
- A big Pause button is always in the toolbar popup.

### Tiếng Việt

FamTray So sánh giá là trợ lý ghi giá cho ứng dụng bếp gia đình FamTray / Bếp Gia Đình.

Khi bạn mở trang sản phẩm hoặc trang khuyến mãi trên các siêu thị Úc được hỗ trợ, tiện ích đọc thông tin giá trên trang đó: tên sản phẩm, giá, giá theo đơn vị, giá cũ, khuyến mãi, quy cách, mã sản phẩm và tên cửa hàng. Sau đó tiện ích lưu chúng vào ứng dụng bếp của gia đình. Ở đó, giá giúp so giá cho danh sách đi chợ và được chia sẻ với Giá cộng đồng.

- Chỉ chạy trên woolworths.com.au, coles.com.au, aldi.com.au, chemistwarehouse.com.au và amazon.com.au.
- Chỉ ghi thông tin giá. Không bao giờ lấy hình ảnh, mô tả, đánh giá, cookie, thông tin tài khoản hay nội dung bạn gõ.
- Ghép một chạm từ ứng dụng gia đình (Bếp của tôi → Kết nối gia đình → Ghép ngay). Không cần nhập tài khoản vào tiện ích.
- Chế độ chạy theo lịch là tùy chọn và mặc định tắt. Chủ gia đình và bạn đều phải bật. Khi chạy, tiện ích mở từng trang một trong cửa sổ riêng theo nhịp đã đặt, tôn trọng robots.txt của từng trang, và chỉ chạy trong khung giờ của bạn, trừ khi chủ nhà bấm "Chạy ngay" cho một lần chạy. Nếu trang hiện màn hình xác minh hoặc chặn truy cập, tiện ích dừng ngay và tạm dừng 24 giờ. Tiện ích không bao giờ giải hay vượt qua các bước xác minh đó.
- Nút Tạm dừng lớn luôn có trong cửa sổ nhỏ của tiện ích.

## Single purpose statement

EN: FamTray Price Compare has one purpose: to record the shelf prices of products on five Australian supermarket and pharmacy websites and save them to the user's own family kitchen app for price comparison.

VI: FamTray So sánh giá chỉ có một mục đích: ghi lại giá trên kệ của sản phẩm trên năm trang siêu thị và nhà thuốc ở Úc, rồi lưu vào ứng dụng bếp gia đình của chính người dùng để so giá.

## Permission justifications

| Permission / host | Why it is needed |
|---|---|
| `storage` | Saves the pairing token for the family app, the user's settings (language, pause, sites, schedule), the latest parser rules and a short queue of prices waiting to be sent. Nothing leaves the browser except the price facts and device status sent to the user's own family app. |
| `alarms` | Wakes the extension once a minute. It sends saved prices, checks in with the family app (status and any owner command such as Run now or Stop), and checks whether a scheduled run may start. |
| `idle` | Scheduled mode waits until the person has stepped away from the computer so it never interrupts them. The status (in use, idle or locked) is shown to the family owner. |
| `tabs` | Opens the one dedicated window and tab that scheduled mode reads pages in, and closes it afterwards. Also finds the open family-app tab to reload after install, and reads the active tab's address so the popup can offer "pause on this site". |
| `notifications` | Tells the user when a run has finished, or when a site showed a check page and the extension paused itself for 24 hours. |
| Host: `https://www.woolworths.com.au/*`, `https://www.coles.com.au/*`, `https://www.aldi.com.au/*`, `https://www.chemistwarehouse.com.au/*`, `https://www.amazon.com.au/*` | The content script reads the price facts on these five sites only. It also uses these hosts to read each site's robots.txt before scheduled visits. |
| `externally_connectable` (the family app's own address only) | Lets the family app page check that the extension is installed and hand it a one-time pairing code ("Pair now"). The extension checks the sender's address against its allow-list. It pairs only with that same address and never gives its token to the page. |
| Remote code | None. All code is in the package. Parser rules are downloaded as data (JSON selectors and patterns) from the user's family app, never as code. |

## Data usage disclosure (Chrome Web Store "Privacy practices")

Tick these categories:

- **Website content.** Price facts from the five supported sites: product name, price, unit price, was-price, promotion and end date, pack size, product id, product page address (on those five sites only), the store name shown on the page, and the time the page was read.
- **Location.** The postcode and suburb the user types when pairing, and the supermarket store name shown on the site. They are used to place prices at the right store.
- **Web history.** Only the addresses of the product and specials pages on the five supported sites that prices were read from. These are sent with the price so it can be checked. No other browsing is recorded.
- **User activity.** Whether the computer is in use, idle or locked, whether Chrome has a window open, and whether it is charging. This is used only to decide when a scheduled run may start and to show the device status to the family owner.

Do **not** tick: personally identifiable information, health, financial and payment information, authentication information (the extension never reads site logins; the pairing token is created by the family app, not by the user), or personal communications.

Certify:

- The data is not sold to third parties.
- The data is not used or transferred for purposes unrelated to the single purpose.
- The data is not used or transferred to decide creditworthiness or for lending.

Where the data goes: only to the family kitchen app the user paired with (the app address shown in the extension's settings). Prices may then be shared with other families in Community prices without saying who captured them.

## Privacy policy URL

`https://<the app address>/privacy.html`. This is the family app's privacy page (agent W is adding it in v1.7). Use the same address that the production app opens at.

## Assets

- **Icon 128×128:** `docs/scout-store/icon-128.png` (the same icon as in the package).
- **Screenshots 1280×800:** `docs/scout-store/screenshots/1-popup-vi-1280x800.png`, `2-popup-en-1280x800.png`, `3-settings-vi-1280x800.png`, `4-settings-en-1280x800.png`, `5-pair-now-vi-1280x800.png`. These come from the automated browser test with the test build and synthetic data. The test build is labelled "(test build)" only in the extension name and not in these images. Refresh them with `SCOUT_STORE_SCREENSHOTS=1 npm run test:scout:browser`.
- **Small promo tile 440×280:** `docs/scout-store/screenshots/promo-small-440x280.png`.
