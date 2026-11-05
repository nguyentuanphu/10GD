# FamTray · Bếp Gia Đình · v1.7.5

## What's new in v1.7.5 (owner feedback, 4 Nov 2026)
- **Photo buttons work again:** “Chụp ảnh” / “Chọn ảnh” and “Dán danh sách nguyên liệu” did nothing when tapped — the recipe form itself matched a click handler that cancelled every tap inside it. Fixed; 44 px buttons.
- **Phân loại bữa ăn:** Bữa sáng, Bữa trưa, Bữa tối, Bữa phụ, Weekends feast. Nothing is ticked automatically and every tick can be removed; an empty choice means “use the dish type”. Older “Main/Side dish” recipes are read as lunch + dinner and “Friday night” as dinner, without rewriting stored data.
- **Phân loại món ăn:** Món chính, Món phụ, Món canh / soup, Món sợi, Món tráng miệng, Món ăn vặt, Món school lunch box. Protein shown in words. Labels “Công thức nấu cho bao nhiêu suất ăn” and “Thời gian nấu”.
- **Bữa phụ every day** in the weekly menu (filled from snack/dessert dishes); **school lunch boxes** Mon–Fri when “Lên hộp cơm đi học” is switched on in the menu preview.
- **Ingredients:** each row has a **“Cộng vào đi chợ”** tick (ticked for new rows); kitchen units (tép, muỗng, **đòn**, khoanh, vỉ…) are counted as written, never converted to grams; unticked rows are kept as notes. Saved note lines with an amount open unticked, so existing shopping lists do not change. Amounts accept 2, 0,5, 1/2, ½, 1 1/2 and show as ½ / 1½ (they were rounded up to 1).
- **Cách nấu** is shown exactly as written — no automatic numbering, no filler step.
- **Meal editor:** 5 suggestions from the reference library and 5 saved family dishes, each with “Xem thêm”; portion choices in plain words (“Tự tính theo số người”, “½ lượng”, “Gấp đôi”) with a one-line explanation.
- **Larger text** everywhere by default (body ≥15 px, nothing below 12 px) with **Cỡ chữ** (Vừa / Lớn / Rất lớn) in Tài khoản & cài đặt → Giao diện, per device.
- **App icon badge** for urgent messages, “không ăn / báo cơm” and absence notices (iPhone/iPad 16.4+ Home Screen app with notifications on, Android, desktop); cleared when the app opens.
- **Language:** English mode no longer shows half-translated sentences; missing English for Shopping, Pantry, Spending and notices added; hardcoded English labels in Vietnamese mode fixed. A language audit runs in CI. Reference-recipe cooking steps in English follow in a separate release.
- **Studio roles in Studio:** Owner (hosting setting `STUDIO_ADMINS`, cannot be changed from Studio) assigns **Admin**, **Kiểm duyệt** (moderator) and **Hỗ trợ** (read-only) in Studio → Cài đặt & phát hành → Quyền Studio; enforced on the server, audited. A **Studio** button appears in the app's top bar for these accounts.
- **Studio → Góp ý → “Sao chép cho dev”:** open bug reports as Markdown (text, technical context, page errors; never the reporter).
- **National online prices (Pinch + WhichGrocer):** Studio → So Giá → Giá online. Switched **off** until the owner turns them on. Pinch prices Woolworths/Coles/ALDI for the catalogue (Wed/Sat); WhichGrocer cross-checks a few items within its credit budget; sources more than 15% apart are held. **Only products the owner confirms (✓) in Studio are shown to families**, dated and credited (“Price data by Pinch” / “Product data by WhichGrocer”). Keys stay in the hosting environment.
- **Packed-lunch schedule, compact “Tuần này ai bận”, “Chưa báo” counted** (see the review record).
- **Data edition 6:** older app versions show “Có bản cập nhật — tải lại” instead of reading the new meal and units. Set Studio minimum edition to 6 at deploy.

Evidence: `docs/reviews/v1.7.5/review.md`.

## What's new in v1.7.4
- **On-device “More accurate” voice uses less memory on iPhone (same model, same accuracy):** each weight file is read once into one buffer and freed as soon as the speech engine has copied it, the larger decoder is prepared first, and iPhone/iPad use the smaller engine build (one thread, no WebGPU). Measured in a desktop browser simulation (not an iPhone): the memory peak is about 16–20 % lower (≈1.40 → 1.16 GB) — the real check is the self-check page on the phone.
- **Kiểm tra giọng chính xác trên máy này / Check accurate voice on this device** (Account & settings → Giọng nói trên máy, or the voice sheet's settings): runs the pack once and shows the device, pass/fail, load and recognition time, model memory and the phase reached; if the phone closes the page, the next start shows the phase it stopped in. “Sao chép kết quả” copies the result; nothing is sent.
- **After a memory crash nothing reloads the pack by itself.** “Thử lại” is one guarded try (it may reload the page once); a second crash switches accurate voice off on that device until an update. The notice is short: “Giọng chính xác tạm tắt vì máy thiếu bộ nhớ — đang dùng giọng nói thường của máy.”
- **iPhone tip in every voice sheet** while accurate voice is not in use: “Trên iPhone: chạm vào ô chữ rồi bấm 🎤 trên bàn phím để đọc chính tả (tiếng Việt rất tốt).” with **Mở bàn phím để nói**. **Gỡ gói** says how much space it freed.
- Fixed: a load without a progress callback was reported finished at the first progress message (the crash marker said “loaded” while the model was still being built).
- App and Price Check extension version 1.7.4 (no extension changes).

## What's new in v1.7.3
- **So Giá finds the store by itself on the real sites (extension 1.7.3):** the store shown in the site's header is read again after the page finishes rendering and whenever it changes — Woolworths “Direct to boot / Pick up / Click & Collect: Wolli Creek”, ALDI “Current store: 2205, Wolli Creek”, Coles' store button next to “When”. Patterns live in the price-reading settings sent from the app, so they can be corrected without an extension update; “Send this page's structure” now includes where the store name is shown. A delivery address (“Delivery to …”, “Deliver to …”) is never read.
- **Amazon AU and Chemist Warehouse need no store:** their online prices are national, shown as **“Trực tuyến / Online”** and placed by the computer's postcode area. Step ④ “At least one store” is done as soon as one of them is switched on.
- **Typing a store name works again:** in Settings every click re-drew the page, so a typed name vanished before “Save”. Fixed; each retailer without a store now has its own **“Nhập tên cửa hàng”** box with **Lưu**, the popup offers the same box on a supermarket tab, and typed text and focus survive updates.
- **Studio → So Giá → device card → “Sửa cửa hàng”:** the owner can set a computer's stores (audited); the computer picks them up at its next check-in (about a minute).
- **No false “signed in” warning:** “My Account · Login or Sign up” on Chemist Warehouse is now read as signed out, and a warning only shows on its own retailer's tab.
- The update banner appears for computers on extension 1.7.2.


## What's new in v1.7.2
- **Local-grocer receipts (“Ghép giá với giỏ đi chợ”):** Asian grocers, butchers and greengrocers that print only “GROCERY 4.50”, “VEG 3.20”, “MEAT 12.80”, “DEPT 01”, a PLU or just a price. These lines are marked **“Chưa rõ món”** and are never matched automatically. In the receipt form, tap a price, then the item(s) in this week’s shopping list (items ticked “đã mua” come first, in tick order); one price may cover several items, and splitting the money is the family’s choice. Undo for every step. Voice / typed: “dòng 3 là thịt ba chỉ” / “line 3 is pork belly” (hold to talk). Works offline (typing; voice offline needs the on-device pack).
- **Suggestions to confirm, each with a one-line reason:** the family’s own prices at that store (and nearby stores in the same suburb), So Giá community prices (verified first), $/kg for weighed lines (e.g. 0.85 kg @ $12.99/kg looks like meat), the “đã mua” tick order vs the receipt order, and the printed total (combinations that don’t add up rank lower). Deterministic and unit-tested.
- **Learns per store:** “store + label/PLU + price band → item”, kept in family data (synced); “Quên” forgets a mapping.
- **Nothing is lost:** unmatched lines are saved in spending as **“Đồ khác (chưa rõ)”** (own card on Chi tiêu) and stay out of the shopping/pantry reconciliation.
- **“Báo giá cho cộng đồng”** for an unmatched line of a saved receipt: the family names/picks the catalogue item; never sent without that tap. So Giá shows it as **“Chưa xác minh · 1 người báo”** with the capture time — visible, not used as the comparison price, no points — until another family reports a matching price at the same store/area; then the first reporter gets the points. New one-tap **“Tôi cũng thấy giá này / I saw this price too”** (counts as that family’s report, fresh capture time, own family refused, once per family). Outlier hold, moderation and Studio removal unchanged; Studio lists unverified single reports separately. Privacy page updated.

Evidence: `docs/reviews/v1.7.2/generic-receipts/review.md` (synthetic receipts only; real local-grocer receipts from Henry still to come).

## What's new in v1.7.1
- **Voice:** one-tap VI │ EN toggle next to every mic; hold-to-talk is the default (tap mode optional); unclear results ("các bạn") ask to repeat instead of adding junk; "5x" asks "trứng (eggs)?"; iPhone fixes for words lost at session restart and after Stop.
- **On-device "More accurate" speech** available on every iPhone/iPad (warning on older devices, automatic fallback); the Light pack is removed; honest reasons instead of "Not available on this server".
- **Settings:** "Cài đặt khác" now sits under the avatar's "Tài khoản & cài đặt".
- **Renamed "Scout" to "So Giá" (Price Check):** the shopping panel, the computer extension ("FamTray So Giá" / "FamTray Price Check"), automatic mode, the Studio "Mạng So Giá" page and the "🔎 Máy So Giá" price source label. Wording only: settings, stored prices and installed extensions keep working unchanged.
- **So Giá access is assigned in Studio:** Studio → Mạng So Giá → "Tài khoản được dùng tiện ích" lists the accounts allowed to pair and run the extension (Henry always). Being a family owner no longer grants it; the server refuses everyone else (`not_assigned`). Existing trusted price checkers and accounts with paired computers were added automatically (audited). Removing an account stops its computers at once; adding it back re-enables them. Unassigned accounts see nothing about the extension in the app. A newly assigned account gets a one-time notice on Today and a push (if enabled).
- **One-tap pairing:** with the extension installed, Today shows "Đã thấy FamTray So Giá trên máy này · Ghép ngay"; one tap pairs (never without it). The popup's "Ghép ngay" opens the app (`#pair-extension`) for the same confirming tap. Store names are asked once per supermarket in the popup; the postcode comes from the family. Codes from Studio / My kitchen are now under "Nâng cao / Advanced". "So Giá trên máy tính" in Tài khoản & cài đặt opens the install guide (phones: copy/share the link to open on a computer).
- **Extension popup** is a fixed 360 px wide (no more narrow column on Windows), one-line title, VI │ EN toggle, small Pause (only when paired), and Pair now / Enter code in the popup. The package is bundled into **8 files** (one script per context, CSS inlined, one icon).

Evidence: `docs/reviews/v1.7.1/voice-settings/review.md`, `docs/reviews/v1.7.1/rename/review.md`.


## What's new in v1.7 (ships together with v1.6 in one deploy)
- **Usage statistics:** anonymous, on by default with an opt-out in Cài đặt khác; postcode or network (country/state only, no IP stored) location; Studio "Mức sử dụng" tab (DAU/WAU/MAU, minutes, sessions, peak hours, features, retention, inactive families, locations); 13-month retention; audited drill-downs. Studio switch `usageAnalytics`.
- **Privacy & terms:** final `privacy.html` (VI/EN); community/voice terms no longer drafts; one-time "terms updated" notice.
- **Connection & alerts:** no more false "Offline" (health check + retries, automatic recovery); urgent alerts appear instantly and push in the background with high urgency.
- **Library:** one row of category chips + Filters panel, show 10/20/50/100 with "Xem thêm", compact image + name cards (tap to expand, tap image to open).
- **Get-started guide** on Today, re-openable from More → Hướng dẫn sử dụng.
- **FamTray Scout:** production build ships the extension download; guided install and one-click "Ghép ngay" pairing; phones/tablets get screenshot/voice alternatives; Web Store pack in `docs/scout-store/`; pace presets (≥3 s/page) with auto back-off; Run now; remote status/commands and owner notifications in Studio; every referenced price shows its capture time (older than 7 days marked "cũ").

Evidence: `docs/reviews/v1.7/*/review.md`.

## What's new in v1.6
- **Voice:** Auto language by default (no VI/EN choice needed), Vietlish understanding ("1kg salmon", "sa mơn"), spoken lists split into items, did-you-mean confirmation, commands (bought / remove / change meal / not eating tonight / pantry / urgent message / questions), read-back and spoken confirmation, regional words and per-family learned corrections, mic level meter and push-to-talk. Optional on-device recognition (download, off by default) and opt-in text-only voice statistics in Studio.
- **Price Scout:** say a price ("rau muống hai đô rưỡi một bó, chợ Cabramatta"), recipe dictation for family recipes, and Studio's Price Scout switch/states now really control the app (off hides everything; states greyed out in Studio).
- **FamTray Scout (Auto Scout):** desktop extension (semi-auto by default, Auto behind Studio + device switches), multi-computer network managed in Studio, "Ghép máy tính này" pairing in My kitchen, results flow into community prices.
- **Bandwidth & offline:** lite first install (~0.4 MB precache instead of ~17.7 MB), lazy 740-recipe catalogue, thumbnails, "Tải về để dùng offline" with sizes (Wi-Fi only by default), offline readiness card, self-hosted receipt OCR.
- **Force update:** idle devices update automatically; busy devices see a notice; Studio can require a minimum build (blocking screen after data is saved).
- **Fixes:** Today invite button no longer flashes; startup setup prompt is an inline notice instead of a popup.
- **Release process:** full suite on GitHub CI in parallel (AGENTS.md 14–17); no hosting builds before DEPLOY (rule 18).

Hosting variable needed for the extension: `SCOUT_EXTENSION_IDS=mjeoekikdicoojgoppnfibjbfpcfngja` (not secret). Evidence: `docs/reviews/v1.6/*/review.md`.

---

## v1.5

## What's new in v1.5

- **Startup:** the app opens straight from a cached, verified identity, and the startup pack is cached by content hash and refreshed in the background. There is no "Opening your kitchen" screen.
- **My kitchen** is the single settings hub. It shows members & portions first, then one family access area (invite, join, switch). Use device-only and Sign out ask for confirmation. Every section is bilingual.
- **Notifications:**
  - A device belongs to the member it was registered for, and shared family phones are supported.
  - When a send fails, the app shows the precise reason.
  - Urgent messages come through during quiet hours by default.
  - The urgent message panel is collapsible.
- **Voice input:** fillers are removed and long speech is split into clauses. More Vietnamese and English numbers and units are understood. Listening stops after a pause, and there is a slow-speech mode.
- **Recipes:** 740 recipes, each with its own artwork.
  - Vietnamese-first menus by default. Rice is decided by the main dish, and dressings are never planned.
  - Deleted recipes stay deleted.
  - Recipe search works with Vietnamese input methods.
  - Dark mode meets WCAG AA contrast.
- **Price Scout / So giá:** NSW/QLD postcode check and a 136-item master catalog without prices.
  - Prices come from family captures: screenshot OCR, the "Lưu giá" bookmark, receipts and catalogue deals.
  - The optimizer compares one-stop shopping with a smart split, applies the $5/$15 threshold and orders stops for food safety. It includes a Vietnamese-grocer benchmark and shopper personas.
  - No retailer scraping. A licensed-feed slot is used only when `GROCERY_FEED_URL` is set.
  - **Community prices** is a pilot, off by default and moderated in Studio. Only shelf photos and receipts can be shared, behind consensus, trust and outlier gates.
- **Studio** (`/studio.html`) is the owner console. Access requires `STUDIO_ADMINS` (comma-separated usernames).
  - It covers metrics, accounts, families, invitations, notification and system health, platform settings, banners, and the audit and event logs.
  - It shows counts and metadata by default; family content stays private.
- **CI:** GitHub Actions runs `npm run test:all` on every PR and push (AGENTS.md rules 14–16).

Release evidence and limits are in `docs/reviews/v1.5/*/review.md`. Contributor terms for community prices are a draft that needs owner and legal review: `docs/legal/community-prices-terms-draft.md`.

### Environment variables (v1.5)

| Variable | Purpose | Secret? |
|---|---|---|
| `STUDIO_ADMINS` | Usernames allowed into Studio | No |
| `STUDIO_SUPPORT` | Read-only Studio usernames (optional) | No |
| `GROCERY_FEED_URL` (+ token) | Licensed price feed (optional; nothing runs without it) | Yes |
| `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `AUTH_PUBLIC_URL` | Optional password-reset email | Key: yes |

---

# Earlier releases

## Bếp Gia Đình · v1.4

Family meal planning, shopping and receipts, built with HTML/CSS, TypeScript sources and a Netlify backend. JavaScript files in deployment directories are generated build outputs.

## What is included

- Saved retailer products with manually confirmed/receipt/CSV prices, branch, pack size, barcode and checked date. Search links to Coles, Woolworths and Chemist Warehouse; adding a product updates the family list, not a retailer account/cart. Live retailer catalog APIs are not connected.
- Cooking insights count only meals marked Cooked, exclude future dates, and update on undo. Repeat intervals, likes and paused suggestions affect recommendations and weekly generation.
- Vietnamese/English core interface, product and insights workflows, and push settings. Device-local language does not translate or replace user content or original Vietnamese recipe instructions.
- Mobile navigation keeps Today / Weekly Menu / Shopping and moves secondary tools into More.

- **Simple screens by default** for Today, Weekly Planner and Shopping, with a remembered Full view per device. Shopping uses 18px item names on phones, 44–48px checkbox touch targets, collapsible tools and an optional remaining-items filter.
- **740 reference recipes**, including 40 additional vegetarian dishes, 35 seed/grain/legume salads and 25 dressings. Each entry has quantities, preparation, steps and matching artwork; dressings are separate from automatically planned meals.
- Multi-dish family meals, individual dish replacement, portion scales, per-person attendance and optional rice. Weekend soup selector and weekday meal suggestions respect configured constraints and meal locks.
- Purchase quantity wheel with g/kg, ml/litres, pieces, slices, bunches, packs, boxes, trays, bags, bottles and custom unit names. Remember a preferred buying unit, size estimate, price and note per ingredient.
- Pantry tracks measured quantities and unweighed counts separately. Unknown weights never silently become grams. Budget estimates identify unknown prices.
- Stores with user-entered branch addresses, remembered ingredient/store choices, and shopping views by aisle or store.
- Phone Notes imports with preview, image receipt OCR, manual ingredient matching, weekly spending and unit-price history. Price per bunch is compared with bunches, not kilograms.
- Immediate **“Nhờ mua thêm”** requests containing item, quantity, store/address, sender and note. Requests remain in the shopping list even if push is unavailable.
- Authenticated Netlify Blobs family storage, receipt images and conflict detection; Web Push device registration and scheduled reminders.

## Deploy to Netlify

Build command: `npm run check`; publish directory: `dist`; Functions: `netlify/functions`. The build generates application JavaScript and the authenticated startup source pack from TypeScript. Deploy the full site with Functions and Edge, not `dist` alone.

The site is public: device-only tools require no account. Use individual accounts only to create or join a cloud/family workspace, sync across devices or connect members. Shared family-password login and legacy migration have been retired; `FAMILY_PASSWORD` is ignored. Existing stored records are retained.

For optional password-reset email, follow [Resend setup](docs/RESEND-SETUP.md): configure `RESEND_API_KEY`, `AUTH_EMAIL_FROM` and production `AUTH_PUBLIC_URL` in Netlify. A verified sender is required for real delivery. No sign-up verification or second factor is required; recovery email is optional.

## Run checks

```sh
npm ci
npm run check  # builds TypeScript, checks scripts and offline assets
npm test
npx playwright install chromium
npm run test:browser
```

Tests cover meal quantities, inventory and undo, recipe variants, remembered sale units, unknown weights/prices, store preferences, weekday ranking, receipt matching/prices, authentication, conditional writes, push recipients, Sydney daylight saving and reminder deduplication. Push transport is mocked in tests; delivery to real phones must be verified after Netlify deployment.

## Data and behavior

After one successful online sign-in and complete app download, cached pages and device data work offline with a signed, unexpired offline grant. The app reports offline readiness in My kitchen. A normal session lasts up to 8 hours and requires the same browser session for offline reopening; explicitly trusted devices can reopen for up to 30 days. Known online sign-out or membership changes override cached access. Changes made by an administrator cannot be discovered while the device has no network. Localhost and the internal terminal.local review server allow local development. Cloud synchronization uses a shared family password and detects overlapping edits rather than silently overwriting them. Metadata backups are JSON; receipt photos are separate.

Suggested portions, recipe times and sample prices are editable. Quick noodle/porridge times assume the prepared broth or cooked ingredients stated in the recipe. A weight estimate per bunch/piece is explicitly approximate. A receipt may record actual cost per sale unit without knowing its gram weight.

Scheduled Functions check due reminders every 15 minutes. Roles and selected recipients filter delivery; each device chooses notification language, quiet hours and whether urgent requests can bypass quiet hours. Two automatic sends per device/day are enforced with conditional slot claims. Direct requests are normal by default; urgent requires an explicit choice. Ignored or capped notifications are not queued. Notification display, timing and sound depend on browser/OS permission, connectivity and Focus settings. No background push is claimed before a device has successfully registered.

## Artwork

The built-in catalog has 106 ingredient illustrations and 740 recipe-specific illustrations, explicitly mapped to the matching ingredient IDs and recipe signatures. The existing gouache artwork is extended with companion sheets; all built-in recipes have painted artwork. Family-authored or edited recipes retain an ingredient-led fallback. See [ARTWORK.md](ARTWORK.md) and [the audit and review](docs/reviews/artwork/review.md). Illustrations are not exact recipe photographs, and family data is preserved.

## Family-authored menu

The family planner uses categorised family-authored recipes. The reference catalog remains available separately. Mon–Thu breakfast/dinner, Friday night, Saturday breakfast/lunch and the five-meal weekend batch have explicit rules; the batch includes next Monday breakfast. Recipe quantities support a custom original yield, unknown-quantity lines are preserved, and new ingredients can be entered with their own units. New ingredient prices remain unknown rather than guessed.

Batch cooking deducts pantry once; subsequent meals record portions served. Undoing batch cooking is blocked until served meals are undone. Recorded batch cooks and served meals are counted separately. Existing menus, recipes and historical records are retained; regeneration previews changes and respects cooked/locked meals.

See `AGENTS.md`: each release requires explicit owner DEPLOY approval before updating main or production. The owner approved the previous family-menu release on 31 October 2026. The mobile/access/calendar/alerts changes are a new review-only release and have no deploy approval.


## Mobile access, availability and urgent messages (review release)

- Short mobile actions (Chia sẻ / Tạo tuần / Thực đơn), system font for Vietnamese and SVG bell/cart icons. Touch targets remain generous.
- Netlify Edge protects pages and private assets. The shared password is read only from FAMILY_PASSWORD; it is never embedded in browser code. Legacy family login uses an 8-hour server session and a session cookie. Explicit trusted-browser login uses a 30-day HttpOnly/Secure/SameSite cookie. Logout clears the cookie and private service-worker caches. Failed logins are limited to eight attempts per 15-minute IP window (best-effort shared counter).
- Monthly availability supports member, multiple dates, breakfast/lunch/dinner, away/busy, note, optional deduction and optional reminder. Automatic portions deduct only affected meals. Manually fixed/cooked portions remain fixed and show a reason; undo restores automatic behavior. Existing cooked portions are frozen before availability changes. A meal attendance override clears that occurrence's calendar deduction.
- Availability reminders run at 19:00 Australia/Sydney the day before, subject to each device's calendar subscription, quiet hours and the existing two automatic reminders/day cap.
- Homepage urgent messages persist separately in Blobs with conflict-safe updates and per-name read acknowledgements. Push acceptance is not a read receipt. Names are selected within the shared-password family, not separately authenticated accounts. SMS opens the device composer; the user chooses recipients and sends. No SMS gateway is connected.
- Tests use synthetic passwords and mock push transport. Production Edge behavior, existing Netlify environment configuration, physical phone delivery and airplane-mode installation still require verification after an approved deployment. No real family messages were sent during QA.


## Combined accounts / setup / currency / voice / offline release

Status: local review only. This includes the previous mobile/calendar/urgent-message commit and does not have owner Deploy approval.

- Accounts use a username, display name, scrypt password hash (random salt, N=131072/r=8/p=1) and a one-time recovery code. Email, email verification and email reset are not connected. Recovery rotates the code and invalidates existing account sessions. Opaque random session tokens are stored only as hashes, in HttpOnly/Secure/SameSite cookies with server expiry (8 hours or explicitly trusted 30 days). Signup can be disabled with ALLOW_ACCOUNT_SIGNUP=false.
- Each account creates or joins a household. Targeted invitations are single-use, seven-day codes; owners can revoke invitations and manage editor/viewer access. Every API read/write resolves live membership before choosing a household storage prefix. Photos, state, push keys, announcements and device browser caches are scoped by household. Viewers cannot write family state. Push ignores removed/unlinked account recipients; a browser uses one active household push subscription at a time and must enable it again after switching.
- New families use a saveable five-step walkthrough: people/portions; meals/days; exclusions/allergy notes; currency/time zone/budget/time; cooking routine/favourites and first-week preview. Only explicitly selected reference recipes become family recipes. New kitchens start without sample pantry stock. Existing kitchens retain their recipes, records and planned meals when preferences change.
- Migration requires both a signed-in account that owns an empty destination family and legacy family authentication. Preview one source, download its JSON backup, then confirm. Server migration copies a reviewed snapshot and available receipt photos, retains the source and a server backup, checks the source revision, and refuses overwrites. Local migration can include legacy IndexedDB photos by explicit choice. Push registrations are not copied; enable them again. Conflicting sources are not silently merged.
- Each receipt/product/purchase-price record retains its currency. AUD and VND have separate budgets and explicit price profiles; actual receipt prices can inform estimates only in the same currency and with known quantities. No exchange rates are guessed. VND unknown prices remain unknown. Price history compares matching units/store/currency. Vietnam and Sydney household time zones are supported.
- Voice input uses the browser SpeechRecognition API only after Start mic. It may send audio to the browser/OS recognition service; app audio is not stored. Browser recognition needs internet in this implementation. Typed text and OS keyboard dictation are alternatives. VI/EN amount parsing, known recipe matching, unclear quantities and duplicates lead to an editable preview. Only confirmation adds items/dishes, with a guarded undo. Unknown recipes never receive invented ingredients.
- Personal greetings use account/member name, local household time and planned meals. Optional city weather uses Open-Meteo (Sydney/Hanoi/Ho Chi Minh City), without GPS; only fresh weather is used. A manual hot/cool marker is clearly identified as user input. Busy-today suggestions use saved quick recipes and pantry stock. Assignments and portion feedback are recorded without silently changing portions.

### Offline behavior

Meal plans, family recipes, portions, monthly availability, pantry, shopping ticks/quantities, Notes text import, manual receipts/photos and statistics work on already-downloaded device data. Device edits are persisted and retain a pending-sync marker across closing/reopening. When the server revision is unchanged, reconnect uploads normally with a conditional write; concurrent changes stop for review. Export/restore remains local.

Registration, fresh login/recovery, invitations, live sync, new push subscriptions/test/sending/receipt acknowledgement, urgent delivery, browser speech recognition, fetching weather and retailer/Messenger websites need internet and report that at use. Previously fetched weather expires instead of pretending to be current. Offline receipt photos can be saved and entered manually; OCR model loading needs internet. Push cannot be delivered to a disconnected phone, and the app does not promise background scheduled local notifications.

Offline grants are signed with an ECDSA server key held in private Blobs storage, contain no password/private key, and expire with the authenticated session. Offline cache access rejects expired/tampered grants. Logout clears device grants/private caches even offline and requires explicit sign-in on that browser before reopening. Browser storage is device storage, not encrypted account vault storage: use trusted personal devices and keep backups.

Tests include household isolation, recovery/revocation, concurrent invite acceptance, migration/photo copying without overwrite, currency separation, voice parsing, actual service-worker offline fetch logic, offline edit persistence and reconnect conflict handling. All network transport in tests is mocked; no family notifications/SMS were sent. Browser evidence covers the walkthrough, VI/EN UI, voice preview/confirm/undo and offline-mode shopping/manual VND spending. Physical iPhone mic/push/airplane-mode verification is pending an approved Netlify release.

The header now shows an animated, labelled Online/Offline icon and a direct VI↔EN language button. Motion respects prefers-reduced-motion. AGENTS.md requires mobile/tablet/PC review and saved evidence for every UI release. This review checked 375×828, 820×1100 and 1363×936 browser viewports and corrected overlapping English day labels. Simulated tablet pointer automation had a coordinate limitation; keyboard activation and DOM hit-target checks were used there. Physical device testing is not claimed.

## TypeScript development

Edit only `src/frontend/*.ts`, `src/netlify/**/*.mts` (and Edge `.ts`), `src/tests/*.{cts,mts}` and `src/scripts/*.cts` for application, test and tooling code. HTML/CSS, artwork and recipe data are retained. `npm run build` generates the public JS in `dist`, backend JS in `netlify`, and executable tests/scripts; these outputs are ignored by Git. The compiler does not bundle the legacy browser scripts: global scope and load order remain compatible with the application and service worker. Netlify's existing `npm run check` command performs this build before publication. Run the build before running tests or a static local server.

`npm run typecheck` strictly checks the new startup entry point. **The migration is not a claim of full-project type safety:** legacy dynamic globals, backend, tests and tooling are currently transpiled with `noCheck` in the other configurations. They need explicit domain types and module boundaries before full type checking can be enabled. No `any` annotations or disabled test assertions were added to hide type errors.

For local development after `npm run build`, serve `dist` with `python3 -m http.server 8000 --bind 127.0.0.1 --directory dist`. Backend integration tests use synthetic storage and mock transports. The browser startup regression test uses an intercepted synthetic origin and never signs into the live site or sends real family notifications.

### Startup transport

The build generates `dist/startup-scripts.json` from the startup allowlist. Bootstrap downloads that pack once as a public static asset, validates its structure, then inserts its classic scripts individually and in order. This preserves shared lexical globals and existing function overrides while removing the waterfall of 25 separately authenticated script downloads. It does not use `eval` or `new Function`. The current deployment has no CSP restriction on inline scripts; a future CSP must explicitly support this execution mode before enabling it.

The service worker caches the pack for public device-only offline startup rather than prefetching all 25 individual files. Retry unregisters only the app's root service worker before a fresh navigation and retains localStorage, IndexedDB and caches. The recovery sign-in link uses `/login?locked=1` so a valid existing session cannot immediately redirect it back into the failed app.

For the latest expanded release and verification limits, see [the startup/account/email review](docs/reviews/public-device/review.md). Historical release notes in this document may describe the retired legacy flow.

`npm test` includes the existing suites and the mocked email-security suite. After installing Chromium with `npx playwright install chromium`, run `npm run test:all` for build/type checks, unit tests and both browser suites. No real email or family notifications are sent by these tests.

## Public device mode

No account is needed for local planning, recipes, shopping/pantry, portions, manual receipts/spending/photos, insights, voice/Notes input, weather, timers, exports/imports or native sharing. Server-based family data, multi-device sync and family notifications require an account and selected family workspace. Sign-up/email are optional for the public website; there is no verification email at account creation.

Public offline assets are separate from private account/family state. Guest data uses `guest/`; selected family data uses `account/<household-id>/`. Logging in without a family keeps the same guest work. Cloud workspaces are separate and are not silently populated from guest data. The latest review above supersedes historical mandatory-login and email-verification descriptions.

## Family invitations and device connection

The latest local revision is described in [the family hub review](docs/reviews/family-hub/review.md). Owners can use **Mời người nhà** directly beside the kitchen controls or inside **Bếp của tôi → Tài khoản & gia đình**. Create an invitation and open Email, SMS or Messenger to choose the recipient and send its code/link. Invitations are single-use and expire after seven days. Recipients can register from the link and join immediately, without email verification.

New sessions restore a remembered family only while membership is valid; accounts with exactly one family select it automatically. Multiple-family accounts without a remembered selection choose explicitly. Device-only data remains separate.
