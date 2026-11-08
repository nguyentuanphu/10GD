# v1.7.15 — search, a “Tính năng” tab, “Cài app”, old devices, recipe import from a link, barcodes into the pantry, step timers

**Owner, 8 Nov 2026 (Sydney time):** *“Làm một cái magnify glass trên góc phải của mỗi trang làm tìm kiếm những thứ mà người ta cần, theo bạn sẽ tìm kiếm được gì? Với cả trong how to use thì cần có 1 tab để cho người ta biết mình có features gì và nó là như thế nào.”*

**Plan approved by pop-up (8 Nov 2026):**
- Search: dishes, pantry, shopping, menu, receipts / spending / prices, guests and invitations, features and settings.
- **Not** offered by the search: the switches that turn off usage or voice statistics.
- No voice search (*“Chưa cần”*).
- *“Duyệt, làm luôn.”*

## 1. Search (magnifier)
- **Where:** a drawn magnifier (≥ 44 px) at the top right of every screen, before VI │ EN. It opens *Tìm kiếm*: full screen on phones, a sheet on larger screens. The cursor is in the box.
- **What it finds:**
  - **Món ăn:** the library and the family's own dishes; opens the recipe.
  - **Trong tủ:** amount, fridge / freezer / cupboard, use-by; opens the pantry on that item, marked for a moment.
  - **Đi chợ:** the list in view, *Cần mua X* or *Đã mua*; opens the row.
  - **Thực đơn:** dishes from 2 weeks back to 4 weeks ahead, *“Bữa tối · T3 10/11”*; opens that day on that meal.
  - **Hoá đơn & giá:** shops, receipt lines with price and date; opens the receipt.
  - **Khách:** guest groups on coming meals, with their answer; opens the guest sheet for that meal.
  - **Tính năng & cài đặt:** 23 features (shared with the guide tab); opens the screen or setting.
- **How it matches:**
  - Accents are optional (*bun bo*, *thit heo*). Vietnamese and English ingredient names both match (*pork* finds *Thịt heo*).
  - Results are grouped, at most 6 per group. **Enter** opens the first result.
- **Privacy:** everything is searched on the device, so it works offline. The words typed are not sent anywhere.
- **Not offered:** *tắt thống kê*, *usage statistics*, *voice statistics* and *voice sharing* find nothing about those switches (owner pop-up).
- **Narrow phones (≤ 360 px):** the top bar's gaps are smaller so the magnifier fits at 320 px. Every button is still ≥ 44 px, and the app name stays.

## 2. Hướng dẫn sử dụng: *Bắt đầu* │ *Tính năng*
- Two tabs: **Bắt đầu** (the steps, as before) and **Tính năng**.
- **Tính năng** lists every feature with its drawing, its name, what it does in one or two sentences, and **Mở** (words only, ≥ 44 px), which opens it.
- The features: Hôm nay, Thực đơn tuần, Đi chợ, Tủ đồ, Món ăn, Hoá đơn, Chi tiêu, Thống kê & sở thích, So Giá, Có khách, Mời khách qua link, Lịch tháng, Nhắn khẩn, Giọng nói, Nhắc nhở, Thành viên & khẩu phần, Kết nối gia đình, Tiền tệ & giá, Giao diện, Sao lưu, Dùng khi mất mạng, Hướng dẫn, Điều khoản & quyền riêng tư.
- The guide keeps one height, so switching tabs never moves the tabs (rule 24).

## 3. “Cài app” — add to home screen (same approach as `nguyentuanphu/tpn`)
- **Asked:** *“Thêm option add to homescreen function, check my repo/tpn để làm theo.”* Pop-up: as recommended, with a small reminder.
- **Same approach as tpn's `js/install.ts`:**
  - **Android / Chrome / Edge:** one tap opens the browser's own install prompt.
  - **iPhone / iPad:** Apple does not let a page install itself, so a three-step picture guide: *Chia sẻ → Thêm vào MH chính → Thêm*. The pictures are new drawings in our kit (share box, plus square, menu dots, phone with +).
  - **Other computers:** a two-step guide.
- **Where:**
  - a one-line reminder on Today with **Cài app** (drawn) and **Để sau** (hidden for 14 days);
  - a row in the More sheet and a link in the sidebar;
  - *Tài khoản & cài đặt*;
  - the search (*“cài app”*, *“add to home screen”*).
- **Once installed:** opened from the home screen, or after the browser's “installed” event, every entry and the reminder go away.
- **Shortcuts:** long-pressing the home-screen icon offers **Đi chợ · Thực đơn · Hoá đơn** (manifest shortcuts).
- **iPhone note:** the guide says that notifications on iPhone need the app opened from the home screen.
- **Not done:** Studio does not count installs. That would add a feature to the usage list, which the privacy page names one by one.

## 4. Old devices (iPad Air 1 / Safari 12 and other browsers without ES2022)
- **Asked:** *“Làm app cho máy cũ hoạt động luôn được chứ.”* Pop-up: in v1.7.15; missing parts hidden with a short note.
- **Why it failed:** the app is ES2022 and uses `Object.hasOwn` (23 files), `.at()`, `structuredClone`, regex look-behind and more. Safari 12 showed a blank page.
- **The build now also writes `dist/legacy/`:**
  - the same startup pack (same hash and order) translated to ES2017;
  - the loader, which reads `/legacy/startup-scripts.json`;
  - `polyfills.js` (plain ES5).
- **Choosing the copy:** a tiny ES5 check at the top of `index.html` loads the legacy copy only when the browser lacks ES2022 syntax, `Object.hasOwn`, `.at()` or `structuredClone`. Newer browsers load exactly what they loaded before.
- **What the polyfills fill in:**
  - `Object.hasOwn`, `.at()`, `flat` / `flatMap`, `replaceAll`, `matchAll`, `structuredClone`, `Promise.allSettled`, `crypto.randomUUID`, `replaceChildren`, `toggleAttribute`;
  - `matchMedia(...).addEventListener`;
  - pointer events from touch / mouse (for the drag handles);
  - regex look-behind: dropped on browsers that lack it. These patterns only mark word edges, so matches get slightly looser.
- **Emoji detection:** `\p{Extended_Pictographic}` is now built with a fallback range, so an old browser does not stop on it.
- **Hidden with a short note:** reading receipt photos (*“Máy này chưa đọc được ảnh hoá đơn. Bạn dán hoặc gõ các dòng hàng ở dưới.”*).
- **Not available on such devices:** push notifications (iOS 16.4+), the on-device voice pack, and offline use (the service worker is ES2022). The app reports these as not supported, as before.
- **Layout:** spacing fallbacks where flex `gap` is missing (chips, toolbars, the top bar, sheet footers). Some newer layouts (the receipt table, `:has()` rules) look plainer.
- **Top bar:** the network label is hidden under 440 px (the icon and its spoken label stay), so the magnifier fits at 390 px. The magnifier sits on a light chip so the drawing stays clear on the dark theme.

## 5. Learned from other family kitchen apps
- **Asked:** *“Check các app khác giống của tôi là có app nào, và họ có chức năng nào nên làm theo?”*
  - Looked at AnyList, Plan to Eat, Paprika, Samsung Food (recipe import), and Pantryfy, Pantrium, Pantri (AU) and NoWaste (pantry, barcodes, expiry).
  - Henry chose import from a link, barcode scanning, and cooking timers with the screen kept awake. Then: *“Tất cả làm trong bản này luôn nhé.”*
- **Pop-ups (8 Nov 2026):**
  - links for family accounts only;
  - ingredients the app cannot match are kept for the family to match;
  - barcodes are looked up on Open Food Facts through the app's server.

**Nhập món từ link** (Recipes → *Nhập món từ link*; also in the search and the *Tính năng* list)
- **On the server** (`lib/recipe-import`, family op `recipe-import`):
  - family account only (not view-only, not paused); at most 30 links per family per Sydney day;
  - public web pages only: no local, private or metadata addresses, checked again after each of at most 3 redirects and against the address the name resolves to;
  - 8 s, 2 MB, HTML only;
  - reads the page's schema.org Recipe (JSON-LD): name, ingredient lines, steps (sections too), servings and time;
  - nothing is stored, and no pictures are taken.
- **In the app:**
  - a line becomes an ingredient only when its name or alias matches exactly and its amount converts to that ingredient's unit (g / kg → g; ml / l / tbsp 15 / tsp 5 / cup 250 → ml; a count → each);
  - every other line stays **as written** in *missingIngredients* (shown as *Định lượng chưa đầy đủ*) for the family to match, so no amount is guessed;
  - the dish is a family dish and opens in **Viết món** to check.

**Quét mã vạch vào tủ** (Pantry → *Quét mã vạch*, drawn; also in the search and *Tính năng*)
- **Reading the code:** the camera with the browser's barcode reader, or the self-hosted ZXing reader (`dist/vendor/zxing`, Apache-2.0, loaded only when scanning). A photo of the code or the number typed also work.
- **Looking it up:**
  - a code the family matched before is used straight away (`barcodeMap`, at most 500, in the family's data);
  - otherwise only the number goes through the server (family op `barcode`, 200 a day) to Open Food Facts;
  - name, brand and pack size come back, with no photo.
- **Saving:**
  - the family confirms the ingredient (suggested from the name), the amount and where it is kept;
  - the pack size is filled in only when it is in the ingredient's own unit (*700 g* is not *700 eggs*); left empty, it is kept as 1 pack.

**Chế độ nấu**
- *“45 phút / 45 minutes”* in a step is a button (≥ 44 px) that starts the timer.
- When it ends: the phone vibrates, a short tone plays, and a notification shows if allowed and the app is in the background.
- The screen is kept awake again when you come back to the app.

**Privacy page:** new part *5a. Nhập món từ link và quét mã vạch / Importing a recipe from a link and scanning barcodes*.

## Tests
- **New suite `test:v1715:browser`** (in `test:all`), at 375×812, 320×740, 820×1100 (VI) and 1280×800 (EN). It checks:
  - **The magnifier:** drawn, at the top right, ≥ 44 px, labelled, on Today, Menu, Shopping, Pantry and Recipes.
  - **Searching:**
    - pantry + receipt (*pork*), no accents (*thit heo*), a shop, a guest, a dish on the menu and in the library, a feature;
    - the statistics switches are not offered (6 phrasings).
  - **Results and opening them:**
    - rows ≥ 44 px, words only;
    - a pantry result shows the card;
    - Enter opens the first result;
    - works offline.
  - **Guide tabs:** two tabs; tapping does not move the tab; ≥ 20 features, each with a drawing, a name, what it does and *Mở*; no statistics switch listed; *Mở* opens the screen.
  - No overflow, no page errors.
- **Also in `test:v1715:browser`:**
  - **Cài app:** reminder (drawn, ≥ 44 px), *Để sau* hides it; Account & settings; sidebar; the browser prompt (one tap) then nothing left to install; the search finds it.
  - **iPhone:** a three-step guide with drawings that fits at 390 px.
  - **Already installed:** opened from the home screen, nothing is offered.
  - **Manifest:** the shortcuts.
  - **Old devices:**
    - all 63 legacy files parse as ES2018 at most, with no look-behind literal, and share the pack hash;
    - in Chromium at 1024×768 with `Object.hasOwn`, `.at`, `structuredClone`, `Promise.allSettled`, `replaceChildren` and `PointerEvent` removed and look-behind throwing, the legacy copy loads (and only it);
    - Today, Menu, Shopping, Pantry, Recipes and Spending show; search works; the receipt sheet shows the note; no page errors.
- **Kitchen extras** (in `test:v1715:browser`, at 375 VI and 1280 EN):
  - **Import:** no import without an account; the link is sent; 3 lines matched with converted amounts, 2 kept as written; servings, time and steps kept; the editor opens.
  - **Barcode:** typed code looked up, ingredient suggested, 700 g not filled in for eggs but filled for pork; saved with the code; the family's match remembered and used without a second lookup.
  - **Cooking:** *45 minutes* is a ≥ 44 px button starting the timer; the end vibrates.
- **`kitchen-import.test`** (in `npm test`):
  - public pages only (files, localhost, private, metadata, bare names, passwords, ports, redirects to private, names resolving to private);
  - the Recipe read from `@graph` with sections; nothing guessed from pages without recipe data;
  - HTML only, 2 MB;
  - Open Food Facts gives name / brand / size only;
  - account required, 30 links a day, bad codes refused.
- **Also run:**
  - `default-language` (rule 27, name at 320);
  - `browser` (account menu, top bar);
  - `language` (no mixed languages);
  - `artwork`, `emoji-art`, `ladybug`, `library-guide`, `scout-pair`, `authenticated-startup`.

## Evidence
- `docs/reviews/v1.7.15/{search-results,guide-features}-{vi,en}-{size}.png`, `install-guide-iphone-vi-390x844.png`, `old-device-ipad-1024x768.png`, `{import-link,import-editor,barcode-confirm,cooking-step-timer}-{vi-375x812,en-1280x800}.png`. Chromium viewport simulation (with an iPhone user agent and with newer features removed), not physical devices.

## Limits
- The camera scan was not run here (no camera). Typed codes, the lookup and saving were tested; ZXing decoding is the library's own.
- Open Food Facts does not know every Australian product. An unknown code is matched by the family once, then remembered.
- **Old devices:** no real iPad Air 1 or Safari 12 was available here. The legacy copy was checked by parsing it, and by running it in Chromium with the newer pieces removed. Henry's iPad Air should be tried after deploy.
- The search covers what is on this device. A family member's changes appear after sync.
- The menu is searched from 2 weeks back to 4 weeks ahead.
