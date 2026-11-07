# v1.7.11 — FamTray · Bếp Nhà: name, tagline, English-first language

Owner decisions (Henry, 7 Nov 2026, Sydney time). Branch `release/v1.7.11`, built on `release/v1.7.10` (PR #30, not yet deployed); merge #30 first.

## 1. Name
- English **FamTray**, Vietnamese **Bếp Nhà**, combined **FamTray · Bếp Nhà**, short name **FamTray**. Replaces “Bếp Gia Đình” in all user-facing copy: manifest (name, short_name, description), `<title>` of index / Studio / privacy / sign-in pages, app header and side menu, welcome guide (“Bắt đầu với Bếp Nhà”), page eyebrow “BẾP NHÀ”, startup error, push and test notifications, password-reset email subject, backup-file message, shared shopping-list signature, privacy & terms, README title, NETLIFY-SETUP title, Price Check store listing (`docs/scout-store/listing.md`), and the extension (manifest description, options, popup, update steps: “Mở Bếp Nhà …”; English: “Open FamTray to pair”).
- **Not changed:** internal ids, package name `bep-gia-dinh`, storage keys (`bep-gia-dinh-v1`, `bep-language`), API paths, extension id/key, env vars, the AGENTS.md title, test fixtures that are snapshots of earlier deployed code, and family-authored data (recipe names, notes, family names).
- The extension stays **FamTray So Giá · Price Check**.

## 2. Tagline
- **One table, the whole family** / **Một mâm, cả nhà** replaces “Bữa cơm, nhẹ lo” (and its English “Less worry, more family”) wherever it was the app's tagline: side-menu brand line, manifest description, sign-in page, shared shopping-list signature. It was not used anywhere else.

## 3. Default language — English main, Vietnamese fully supported
Decided in `storage-context.ts`, the first script, before any script builds default data (so a new device's first data cannot make it look “in use”), and saved for the current scope (device or signed-in family):
1. a language saved for this scope wins (a VI │ EN tap is saved the same way and clears the “guessed” mark);
2. else a language **chosen** on this device in another scope (guest first), e.g. on the sign-in page — a language the app only guessed does not count;
3. else a device or account **already in use** — family data in any scope, the pre-account cache, or a signed-in family — keeps **Vietnamese**, the old default, and it is saved; no device in use flips to English after the update;
4. else (a new device) the phone/browser language: **Vietnamese if “vi” comes first among VI/EN** in `navigator.languages`, otherwise **English**; saved with a “guessed” mark.
- A new account created on a new device keeps the language it was created in (the sign-in page saves it at registration, so step 3 does not turn it Vietnamese).
- The **sign-in / sign-up / invitation page** (first screen) follows the same rule, is fully bilingual (every label, placeholder, button, message and the server messages it can show) and has its own VI │ EN switch (≥ 44 px) that is saved for the app too.
- `<html lang>` is set by the first script; the privacy page follows the same phone rule; manifest `"lang": "en"`. Voice recognition defaults and date/number formats already follow the app language.

## 4. Reference recipes without English cooking steps — decision
- **Count:** 125 reference recipes, 625 prep/step sentences, **0** without English (all translated and checked in v1.7.10; `language:browser` fails if any reference recipe step has no English).
- **Decision:** nothing to translate or postpone in this release; no “English steps coming soon” note is needed. Family-authored recipes are never translated (shown exactly as written; rule 6/21).

## 5b. What needs an account (owner decisions by pop-up, 7 Nov 2026, Sydney time: folded into v1.7.11)
Principle: what only serves one person on one device stays account-free (rule 12); an account is needed when the server keeps the data, it costs money, or other people see it. An account with no family works as a family of one.
- **So Giá — account only** (first decision by pop-up was “5 tries, then an account”; Henry then decided, 7 Nov 2026: “So giá bây giờ chỉ nên có tài khoản đi cho chắc”). Without an account So Giá is one short card — “So Giá cần tài khoản … Giá đã ghi trên máy này vẫn được giữ” with *Tạo tài khoản* — and makes no price requests; no online-price lines or “Tìm giá online” buttons on the list. The server answers 401 to every So Giá request without a session (no guest path). Prices a device saved earlier without an account stay stored on the device (rule 6), just not shown; they are never merged into a family by themselves (rule 12).
- **Phone reminders (push) — account needed** (already required by the server). The *Push & người nhận* sheet now says so first, with *Tạo tài khoản* (or “create a family under Family — just you is fine” when signed in without one), instead of only greyed-out buttons.
- **Already account-only, unchanged:** sync and online backup, sharing prices / recipes with the community, pairing the Price Check extension, reading replies to feedback.
- **Stays account-free:** menus, shopping list, pantry, family recipes, receipt reading (on the device), spending, voice input, appearance and language, reference library, weather, sharing by Messages / Messenger.
- **Tests:** `grocery-api` (unit) — prices, find online price and saving all answer 401 without a session, even with a device header. `default-language:browser` — without an account So Giá is the account card with *Tạo tài khoản*, no So Giá controls, no price requests; the reminders sheet asks for an account; ≥ 44 px, no sideways scroll, at 375 / 1280 / 320, VI and EN. Evidence: `docs/reviews/v1.7.11/{vi,en}-{size}-{scout-account,reminders-account}.png`. `price-scout`, `community` and `voice-price` (browser) now run their So Giá checks as a signed-in family (mocked), with the sample prices as family prices; `price-scout` and `community` also check that without an account So Giá is only the account card, with no So Giá controls, no saved prices shown and no price or community requests.

## 5c. Drawings on the main buttons; short names for long labels (owner, 7 Nov 2026; in v1.7.11)
- **Decisions:** first “Thiết kế các nút phải có emoji artwork…” (pop-up: every button, chip and tab; short names). After seeing it, Henry: **“Nhiều emoji quá, giảm bớt thôi”** — pop-up: drawings on the **main buttons only**, keep the short names.
- **Where a drawing shows:** the main action of a screen or sheet (`.primary`, plus Lên thực đơn, Thêm món, Đã nấu / Chưa nấu, Bắt đầu nấu, Thêm vào bữa, Thêm vào danh sách / tủ, Cất đồ), icon-only buttons (the drawing replaces a text symbol such as × − +), the sheet X / Đóng / Lưu (rule 25), the bottom navigation and the share buttons.
- **Words only:** chips (meal type, dish type, tags, places), tabs (Bữa sáng / trưa / tối…), disclosures and secondary buttons. Their old phone emoji stay removed.
- **Art kit:** 63 drawings were added to `ui-art.ts` (one per meaning); the ones not used on buttons now stay available for later screens.
- **Short names** (full wording kept in `aria-label` and the tooltip): Bỏ đánh dấu đã nấu → **Chưa nấu** (Not cooked); Bỏ qua lần mua này → **Bỏ qua**; Chọn lượng mua → **Lượng mua**; Viết / phân loại món ăn → **Viết món**; Lên thực đơn cả tuần → **Lên thực đơn** (Plan week); Lặp lại tuần trước → **Lặp tuần trước**; Khẩu vị gia đình → **Khẩu vị**; Kiểm tra đồ trong tủ → **Đồ trong tủ**; Kiểm tra đồ đã có / bỏ qua → **Đồ đã có**; Chụp / nhập hóa đơn → **Hóa đơn**; Đổi tiền tệ & giá nguyên liệu → **Tiền tệ & giá** (Currency & prices); Kiểm tra giọng chính xác trên máy này → **Thử giọng nói**; Bật / lưu nhận push → **Bật thông báo**; Thử thiết bị này → **Thử thông báo**; Gợi ý từ thói quen của nhà mình → **Gợi ý cho nhà**; Phân công ai nấu & ai đi chợ → **Ai nấu, ai đi chợ**; Thêm ngay vào bữa → **Thêm vào bữa**; Xem thống kê & sở thích → **Thống kê & sở thích** (View history & preferences → **History & tastes**); Tạo liên kết tìm kiếm → **Link tìm kiếm**; Write your first recipe → **Write a recipe**.
- **Rule:** AGENTS.md rule 27 (updated to the main-buttons-only decision).
- **Fix found by the full local run (7 Nov 2026, Sydney time):** once short names were applied inside `render()` (564eca3) they ran before the English translation, so the English shopping screen showed “Đồ trong tủ (0)” / “Đồ đã có (0)” and a Vietnamese tooltip. `render()` now puts the page in the chosen language first, then applies drawings and short names (“Pantry (0)”, “In stock (0)”). Caught by `journey:browser` and `language:browser`.
- **Fix found by GitHub CI (7 Nov 2026, Sydney time):** on a device whose system font is wider (the CI runner uses DejaVu Sans), rounding an amount on a tablet moved the row 28 px: the ≈↓ / ≈↑ round buttons were added after the redraw and only got their drawing a moment later, after the row had been measured. They are now decorated in the same redraw. Reproduced locally by hiding the Inter font (`v176-fixes:browser`, vi tablet 529 → 558 px before, steady after); local runs now use the CI font and Chromium 156.
- **Tests:** `default-language:browser` scans Hôm nay, Thực đơn, Đi chợ, Kho món ăn, Tủ thực phẩm, Chi tiêu, Thói quen ăn uống, Sản phẩm & giá and the settings, recipe, edit-meal and reminders sheets in VI and EN: fails when a main or icon-only button has no drawing, when a chip / tab / disclosure / secondary button has one, and on any label over 22 letters in a button narrower than its row. `voice-ios-memory` and `v176-fixes` check the short name and the full wording for screen readers. Evidence: `docs/reviews/v1.7.11/{vi,en}-mobile-button-art.png`.

## 5. TypeScript only (Henry: “Rules là tất cả viết bằng ts, tại sao tôi vẫn thấy viết bằng js?”)
- The JavaScript files seen in `dist/`, `tests/`, `netlify/` and `scripts/` are **build output** from TypeScript and are not tracked in git.
- Hand-written JavaScript that was still tracked is gone: the two inline scripts in `privacy.html` and one in `studio.html` are now `src/frontend/privacy-head.ts`, `privacy-page.ts` and `studio-theme.ts`; three archived review tools (`docs/reviews/…/make-report`, `startup-timing`, `studio-shots`) are renamed to `.cts` / `.mts`.
- `npm run check` (in CI) now fails if any hand-written `.js/.cjs/.mjs` file is tracked or a page carries an inline `<script>`.
- Cost: Studio and the privacy page load one extra tiny file (0.4 KB) that used to be inline; `studio-nav:browser` now counts two scripts at start (studio-theme.js + studio.js); its timing targets are unchanged and pass.

## 6. Tests
- New suite **`test:default-language:browser`** (in `test:all`): new device with a Vietnamese phone → Vietnamese; English phone → English, and it stays English after the device has data and reloads; other phone languages (fr+vi → VI, de+en → EN, fr+ja → EN); devices in use (guest data, pre-account cache, family cache) with an English phone → Vietnamese, saved, still Vietnamese after reload; saved choice wins both ways and on a device in use; the VI │ EN switch is saved as a choice; sign-in page in English / Vietnamese / device in use, its switch saved for the app; manifest name, short name, lang, description; header name and tagline, welcome card and switch at 320 / 375 / 820 / 1280, VI and EN, online and offline; sign-in and sign-up pages at each size.
- The voice suites set their own UI language in the test data and include an “English-only device” case, so their browsers keep the default locale (first CI run failed when they were given a Vietnamese phone).
- Existing browser suites describe their family's phone explicitly: every test browser now opens with `locale: 'vi-VN'` (they were written for a Vietnamese family's device and assumed the old default). Their checks are unchanged; English is covered where those suites already switch language, and the new default rules are covered by the new suite.

## 7. Evidence (Chromium viewport simulation, not physical devices)
- `docs/reviews/v1.7.11/{vi,en}-{narrow,mobile,tablet,desktop}-{online,offline}-today.png` — header name / tagline, welcome card, VI │ EN switch.
- `docs/reviews/v1.7.11/{vi,en}-{size}-signin.png`, `…-signup.png` — sign-in and sign-up (invitation field) pages.
- Sizes: narrow 320×640, mobile 375×812, tablet 820×1100, desktop 1280×800.

## Limits
- Server messages outside the sign-in page (family, Studio) stay as the server writes them; the app translates the ones it shows through its English table.
- The installed app's name on a phone home screen changes only when the phone refreshes the manifest (or the app is re-added).
