# v1.7.10 — planned 7 Nov 2026 (Sydney time)

Branch `release/v1.7.10` from `main` at `94285a0` (Release v1.7.9, deployed 7 Nov 2026 10:37 Sydney time on Henry's DEPLOY). **Not deploy-approved.** It needs green GitHub CI on the exact head commit and Henry's explicit DEPLOY (AGENTS.md rules 1–5, 15, 18, 23).

Scope, from Henry's choices in the question dialog on 7 Nov 2026:

| # | Item | Status |
|---|------|--------|
| 1 | English for the reference recipes' prep and steps. Today the Vietnamese shows in English mode. Family-authored recipes are never rewritten (rule 6). | done (see below) |
| 2 | Online price estimate (“≈ $X theo giá online”) for items counted by the piece (eggs, lemons …). | done: rows in *quả / cái* use a per-each unit price × count, or whole packs of N pieces × the pack price (e.g. 14 eggs with packs of 12 at $7 = 2 packs, $14). A pack in grams never estimates a count, so nothing is guessed across units. Test: `v176-fixes:browser`. |
| 3 | Henry, 7 Nov: “Thêm 5–6 loại themes” — display themes (he chose **Biển, Lá sen, Gỗ ấm, Đất nung, Khoai môn, Hoa đào, Đêm xanh, Nắng vàng**, picked in Settings + the top-bar button, **each device on its own**) | done |

### Row 3 — colour themes

- **Where to pick:** *Cài đặt khác → Giao diện → Màu giao diện* shows 12 colour swatches: the default *Bếp xanh*, the eight new colours, and the existing *Tết*, *Trung Thu* and *Giáng Sinh*. Tapping one changes the colours at once. Each swatch is a 44 px radio button.
- **Light and dark:** every new colour has both versions. *Sáng / tối* (auto / light / dark) works as before.
- **Readability:** measured on the menu page at 375 px. Primary button text is at least 4.9:1, links at least 5.8:1, headings at least 11:1, in both light and dark.
- **Saved on this device only**, in the same setting the seasonal themes use. Nothing is synced or changed for the family.
- **Top-bar light / dark button:** now our own drawings (sun, crescent moon, half and half for auto), replacing ☀️ 🌙 🌤️ 🌌 and the seasonal emoji (rule 19).
- **Tests:** `v176-fixes:browser` (320 / 375 / 820 / 1280, VI and EN) checks the 12 swatches ≥ 44 px, that a tap changes the colours and the radio state, the dark version, and the drawn toggle with no emoji. `kitchen-hub` follows the swatch group.
- **Evidence:** `docs/reviews/v1.7.10/themes/{colour}-{light,dark}-375.png` and `picker-375.png`, plus the real Appearance sheet from the test, `docs/reviews/v1.7.8/{vi,en}-mobile-appearance-themes.png` (Chromium simulation).
- **Limitation:** some cards and the bottom bar in dark mode keep the shared dark surface colours, which are slightly green. Only the accents and the page background follow the theme there.

### Test fix

- `online-prices:browser`: before checking that *So Giá* sits above the list, the check now waits for the list to draw. On 7 Nov it failed locally on the v1.7.9 code too: the page re-draws once after the prices load, and the check landed in between (tablet in one run, desktop in another). No check removed.

### Row 1 — reference recipes in English

- **What:** all 731 distinct prep and step sentences of the 475 reference recipes are translated into English. The translation is faithful to the existing text: same dishes, amounts, times and temperatures (e.g. 71°C / 75°C / 63°C checks). No dish, ingredient or quantity was added or changed (Henry: “các món ăn với công thức là món ăn thật chứ không phải tự dựng bừa”).
- **How it ships:** the table (`RECIPE_TEXT_EN`) is in the lazy recipe data, so startup is unchanged (lite precache 817 KB). `translateRecipeViToEn` looks up exact sentences, so it works whichever file loads first.
- **Family recipes:** never translated (`data-user-content`). In English mode their sheet says *Family recipes are shown as your family wrote them.* The old note *Recipe names and cooking instructions remain in their original language* is gone.
- **Tests:** `language:browser` (EN) fails if any reference recipe's prep or step has no English. It opens a reference recipe and checks the steps show in English, and it checks that a family recipe stays in Vietnamese.
- **Evidence:** `docs/reviews/v1.7.10/recipe-bolognese-en-375.png`.

### Row 4 — recipe library audit: only real dishes stay

- **Henry (7 Nov 2026, giờ Sydney):** “Các món ăn trong kho… phải kiểm tra kỹ nguồn là món ăn và công thức thật chứ không phải là những món ăn tự dựng bậy lên.” Decision by pop-up: *Chỉ giữ món thật có nguồn*, folded into v1.7.10.
- **What the audit found:** 209 of the `family-v3` reference recipes were template combinations (same steps, swapped protein/vegetable), 243 recipes shared template step text, and the seed-salad and many plant bowls were invented mixes. None had a source.
- **Change:** 350 reference recipes retired (`RETIRED_REFERENCE_IDS`), 125 kept: 45 Western (Ý 25, Âu 18, Healthy 2), 17 plant (vegetarian 10, dressings 7, vegan 13 overall), the rest Vietnamese home dishes. `CATALOG_EDITION` 7.
- **Family data is safe (rule 6):** an existing family keeps any retired recipe it favourited, edited, photographed, planned or mentioned in a note; only untouched library samples leave. Family-authored recipes are never touched.
- **UI:** the *Salad hạt* filter chip is gone (no recipes left behind it); counts show 125.
- **Still open in this release:** adding a *Nguồn tham khảo* (source) line to each kept recipe after checking it against a published recipe. Amounts that differ from the source follow the source; missing amounts are never invented.
- **Tests updated to the 125-recipe catalogue, keeping every quality check:** western-catalog, plant-catalog, units-catalog, artwork (+browser), catalog-fixes, catalog-filters (+browser), v175-recipes, offline-downloads (+browser), catalog-browser, library-guide.

### Row 5 — colours change by themselves (Tự đổi mỗi ngày)

- **Henry (7 Nov 2026):** “Cho thêm auto option để màu tự chuyển giữa các theme.”
- **What:** a 13th swatch, *Tự đổi mỗi ngày / Changes every day* (rainbow dot), first in the list. When chosen, the colours move through Bếp xanh and the eight colours, one per Sydney day, and stay the same all day (no flicker while cooking). Light / dark still follows *Sáng / tối*. Saved on this device only.
- **Tests:** `v176-fixes:browser` checks 13 swatches ≥ 44 px and that the auto choice gives different colours on 7 and 8 Nov 2026 (`autoColorTheme`).
- **Evidence:** `docs/reviews/v1.7.8/{vi,en}-*-appearance-themes.png` (Chromium simulation).

### Row 6 — tapping a button does not move the page (new rule 24)

- **Henry (7 Nov 2026):** “Khi ấn nút bữa sáng bữa trưa bữa tối thì web nó nhảy. Cho thêm rules là ấn nút là không được nhảy lên xuống.”
- **Cause:** a tap redraws the screen; content above the tabs changes height, so the tapped tabs moved.
- **Fix:** after a button / tab / chip redraws the same screen, the app scrolls back by exactly the distance the tapped control moved, so it stays under the finger. Real navigation (new screen, hash change, opening a sheet) is left alone.
- **Rule:** AGENTS.md rule 24 records it for every future release.
- **Tests:** `v176-fixes:browser` taps Bữa trưa → Bữa sáng → Bữa trưa at 320 / 375 / 820 / 1280 in VI and EN and fails if the tab moves 3 px or more.
- **Evidence:** `docs/reviews/v1.7.8/{vi,en}-{size}-meal-tab-still.png` (Chromium simulation, not physical phones).

### Row 7 — colour picker folds away

- **Henry (7 Nov 2026):** “Chỗ màu giao diện này nên cho collapsable để save space.”
- **What:** *Màu giao diện* is now one row (≥ 44 px) showing the current colour's dot and name; tap it (or Enter/Space) to open the 13 swatches. Picking a colour keeps the list open and updates the row at once. The arrow does not animate under reduced motion.
- *Sáng / tối* now reads *Tự động / Luôn sáng / Luôn tối*; the hours (18:30–06:00) moved to a hint under it, because the long option was cut off at large text on phones.
- **Tests:** `v176-fixes:browser` checks it starts folded, swatches are hidden, the row is ≥ 44 px, it opens and closes with the keyboard, stays open after a tap and names the new colour.

### Row 8 — text-size audit (new suite `test:text-size:browser`)

- **Henry (7 Nov 2026):** “Bạn đã audit khi size chữ thay đổi thì có bị tràn, rớt etc chưa?” — Before this release, only *Hôm nay* at *Rất lớn* was checked.
- **New suite, in `test:all`:** 8 screens (Hôm nay, Thực đơn, Đi chợ, Kho món ăn, Thói quen ăn uống, a recipe sheet, Giao diện with colours open, Cài đặt) × 3 text sizes (Vừa / Lớn / Rất lớn) × 4 widths (320 / 375 / 820 / 1280) × VI and EN = 192 screens. Fails on sideways scroll, any text cut by its box or “…”, a drop-down whose choice does not fit, labels sticking out of buttons, words broken in half, one-word-per-line columns, and buttons under 44 px. All problems are listed together.
- **First run found 285 problems; all fixed:**
  - 320 px phone at *Rất lớn*: the top bar pushed the account button 11 px off screen → the app name keeps its normal size there.
  - Tablet: side-menu labels (*Thói quen ăn uống*, *Sản phẩm & giá*, *Hướng dẫn sử dụng*, *Products & prices*) and the app name ran out of the menu → they wrap to two lines. The top-bar page name was cut with “…” → the top bar no longer repeats the app name (the side menu shows it) and a long page name wraps.
  - *Ai nấu? / Ai đi chợ?* on phones: “Chưa phân công” was cut in its box → the two stack.
  - Buttons 31–43 px tall (*Kết nối gia đình*, *Chia sẻ hôm nay*, *Mở Thực đơn →*, *Lưu sở thích*, *Công cụ*…) → every button in the page and in sheets is at least 44 px.
- **Evidence:** `docs/reviews/v1.7.10/text-size/{vi,en}-{mobile,tablet,desktop}-xlarge-{today,shopping,recipe-sheet,appearance}.png` (Chromium simulation, not physical devices).
- **Not covered:** the browser's own zoom / iOS system text size (the app's own *Cỡ chữ* setting is what was tested); screens other than the eight above are covered by their own suites at the default size.
- **Seen, not changed here:** the side menu still uses a few text symbols as icons (◷ ▤ ▧ ◴ ⌂). Rule 21 replaces them screen by screen in a later release.

### Row 9 — snack meals in “Ai ăn bữa này?”

- **Henry (7 Nov 2026, iPhone screenshot):** “Ở phần bữa ở đây, nên bữa phụ được thêm vào thì có hiện lên không?” — Yes: when *Bữa phụ sáng* or *Bữa phụ chiều* is on for the day, its tab shows in meal order (sáng, phụ sáng, trưa, phụ chiều, tối). This already worked; checked and now tested.
- **Improved:** with five tabs on a phone they wrapped into ragged rows and were 40 px tall. On phones (≤ 560 px) four or more tabs now sit in a tidy grid of equal buttons, the chosen one outlined; every tab is ≥ 44 px. Three tabs keep the underline style.
- **No jump, stronger:** the keep-place rule (row 6) now also holds the tapped control for half a second while late parts of the screen redraw. It stops at once if the person scrolls or the app scrolls on purpose.
- **Tests:** `v176-fixes:browser` turns both snacks on and checks the five tabs in order, ≥ 44 px, and that tapping three of them does not move the page, at 320 / 375 / 820 / 1280 in VI and EN.
- **Evidence:** `docs/reviews/v1.7.8/{vi,en}-{size}-snack-tabs.png` (Chromium simulation).

### Row 10 — receipts photographed on a light speckled bench

- **Henry (7 Nov 2026, giờ Sydney):** four receipts (HP Meats, two Cuong Thien, Woolworths Metro) — “Không scan được”, with the text the app read. Three of the four came back as mostly junk (“Rl nh she Rl BEEF BALL…”), no total, no store.
- **Cause:** the receipts lay on a light stone bench nearly as bright as the paper. The paper finder works on brightness, so it took the whole photo as paper; after shadow flattening the bench's flecks looked like text and were read on both sides of every line.
- **Fix 1 — find the paper by texture** (`blankExtents`): paper has completely blank patches (margins, gaps between lines); a speckled bench has a fleck in every small patch. Used only when the brightness finder cannot find a narrower paper. On Henry's photos it now crops all three bench receipts (the Woolworths photo is all paper and is unchanged).
- **Fix 2 — reading the lines:** speck tokens before SUB TOTAL / TOTAL / BALANCE / card lines; weight lines where “@” is read as 0 / 8 / § or “kg” as “g”; count lines glued together by the OCR (“2082.20” = 2 @ $2.20, “204$1.80” = 2 @ $1.80), accepted **only** when count × price equals the line just read; count lines behind a speck (“Ene. 2 @ $3.15”); the second half of a wrapped name (“/ NGAN”, “RMAL”, “EACH”) stays with its product; “$76 30” = $76.30; local shops' “… PTY LTD” + “MARRICKVILLE NSW 2204” give the store (“HP Meats”, “Cuong Thien Marrickville”). Woolworths' own “11 SUBTOTAL” count is kept.
- **Result on Henry's photos (local only, on-device OCR):** HP Meats 9/9 lines with all 8 weights and the printed total $133.75; Cuong Thien A 9/9 lines, total $80.83; Cuong Thien B 18/18 lines, total $76.30; Woolworths 1/1, $5.50.
- **Not fixed, by design:** single digits the OCR misreads (e.g. $13.85 for $13.35, $0.21 for $30.21) stay as read and the sheet says “Thiếu $X — có thể đọc sót một dòng” so the family checks. A tried “weight × price per kg” correction was removed because the OCR also misreads weights and per-kg prices — it fixed as many as it broke. Nothing is guessed.
- **Privacy:** the photos are not committed. The test fixture `src/tests/fixtures/bench-receipts.cts` holds only the OCR text, cashier names removed.
- **Tests:** `receipt-parse` (unit, in `npm test`) — the three bench receipts (line counts, weights, count lines, totals, store, every kept price printed in the text), glued count lines must agree with the item price, and a synthetic speckled bench where the paper is found by texture (and a blank photo is not cropped). `receipt-ocr:browser` and `generic-receipts:browser` unchanged and passing.

### Row 11 — one look for sharing to someone

- **Henry (7 Nov 2026):** “Chia sẻ và sao chép tuần, they are also for sharing to another person so ensure you design same word with icon etc the same so they know it's sharing to sms or messenger.”
- **What:** every button that sends something to another person now has the same drawn picture (a chat bubble with an arrow going out, rule 19 style) and starts with **Chia sẻ** / **Share**: *Chia sẻ hôm nay* (Hôm nay), *Chia sẻ tuần* (Thực đơn — was “Sao chép tuần”), *Chia sẻ danh sách* (Đi chợ, top and bottom — the bottom pair “↗ Chia sẻ / Messenger” + “▢ Sao chép danh sách” is now one button), *Chia sẻ* on family alerts and on shopping requests.
- **Behaviour:** all of them open the phone's share sheet (Tin nhắn, Messenger, Zalo, Copy…). Where the browser has no share sheet (most computers), one **Chia sẻ** sheet offers *Tin nhắn (SMS)*, *Messenger* and *Sao chép*. The app never sends anything by itself.
- **Not changed:** “Chia sẻ với cộng đồng” / “Chia sẻ lên cộng đồng” (sharing prices or recipes to the community, not to a person) keep their own look so the two are not confused. The shared message text itself is unchanged.
- **Tests:** `v176-fixes:browser` at 320 / 375 / 820 / 1280, VI and EN: each share button has the share picture, starts with “Chia sẻ” / “Share”, no emoji, ≥ 44 px, opens the share sheet with the text; no copy-only buttons remain; without a share sheet the Chia sẻ sheet has the SMS link carrying the text, Messenger and Copy.
- **Evidence:** `docs/reviews/v1.7.8/{vi,en}-{size}-share-sheet.png` (Chromium simulation).
- **Follow-up (Henry, 7 Nov 2026: “nút chia sẻ danh sách phải đồng đều với nút khác để không bị nhìn lệch mắt”):** *Chia sẻ danh sách* was a filled button squeezed beside “Đi chợ”, out of line with the buttons below. It now has the same outlined style as *Chia sẻ hôm nay* / *Chia sẻ tuần*; on phones it sits under the title, lined up with it, like on Hôm nay; on tablet and desktop it stays top-right, lined up with the buttons under it. `v176-fixes:browser` checks the style and, on phones, the alignment with the title.

### CI fix — `online-prices:browser` (runs 305–308)

- **Failure:** “a photo that cannot load is removed” (1 ≠ 0). Product photos load lazily; after buttons became ≥ 44 px the rice row sat below the screen, so its broken photo was never tried. The app was right (the photo is removed when the row comes on screen); the check now scrolls the row on screen and waits for the photo to be removed. The check itself is unchanged.
- **Found while fixing:** when the family account starts up, the shopping list can draw before the picture file loads, and the new share button then stopped startup (“shareInner is not defined”). The share label now lives with the screen code and adds its picture once the picture file is there. `online-prices:browser` and `authenticated-startup` pass locally.

### Row 12 — put the shopping away: a place for each item

- **Henry (7 Nov 2026, iPhone screenshot of *Cất đồ đã mua vào tủ*):** “Mua đồ xong bị mặc định cất là ngăn mát, phải cho lựa chọn khác nữa, vì bỏ vào tủ đông hay tủ khô tuỳ vào món.”
- **Before:** one *Nơi cất mặc định* drop-down for everything (dry goods went to the shelf by themselves).
- **Now:** every bought item has its own three choices — *Ngăn mát / Ngăn đông / Tủ khô* (≥ 44 px each). Pre-picked: where the family put that item last time; otherwise dry goods on the shelf (eggs, tofu, dairy and cooked beans stay cold) and the rest in the fridge. *Đặt tất cả* sets one place for every item at once. The choices are remembered per ingredient for next time (family data, synced like other preferences).
- **Data:** only where new pantry entries go; nothing already in the pantry changes. Older callers without per-item places behave exactly as before.
- **Tests:** `units-catalog` (unit) — suggestions, each item stored where chosen, an unchosen item gets its suggestion, the choice is remembered. `v176-fixes:browser` at 320 / 375 / 820 / 1280, VI and EN — one row per item, no single drop-down, ≥ 44 px, *Đặt tất cả: Ngăn đông*, one item changed to the shelf, pantry entries land in those places, remembered next time.
- **Evidence:** `docs/reviews/v1.7.8/{vi,en}-{size}-put-away.png` (Chromium simulation).

### Row 13 — beef went to the shelf; clearer “cooked” wording; a keep-place conflict

- **Henry (7 Nov 2026, 14:53 iPhone screenshot of Tủ khô):** “Mới nãy chỉ có lựa chọn cất đồ vào ngăn mát, cất xong thì chỉ hiện trong tủ khô” — Sườn bò, Thịt bò gravy, Bò viên were listed under *Tủ khô*.
- **Cause (in the live v1.7.9 too):** an ingredient the family adds (by hand or when matching a receipt line) with no group was saved as group “dry”; both the put-away sheet and the receipt → pantry step send “dry” items to the shelf whatever was chosen.
- **Fix:** `guessFood(name)` gives a careful first guess from the name (Vietnamese and English, with or without accents): meat, fish and seafood, eggs, tofu, dairy, fresh noodles and greens → fridge; “đông lạnh / frozen / IQF” → freezer; noodles, rice, flour, sauces, fish sauce, seasoning, cans → shelf; no guess when the name says nothing. Used for new family ingredients' group, the put-away suggestion and receipt lines going to the pantry. The family's own choice (remembered per item, row 12) always wins.
- **Data safety (rule 6):** items already in the pantry are not moved; the family can move them with *Chỉnh sửa*.
- **“Hoàn tác bữa” (Henry: “đọc không hiểu, các ngôn ngữ dịch phải theo ngữ cảnh”):** the button on a cooked meal now says what it does — *Bỏ đánh dấu đã nấu* / *Mark as not cooked*; the batch button *Bỏ đánh dấu đã nấu cả mẻ*; the messages say “Bữa này đã đánh dấu nấu xong. Bấm “Bỏ đánh dấu đã nấu” trước khi sửa.” and, after undoing, “nguyên liệu đã trừ được cộng trả lại vào tủ”. The generic *Hoàn tác* on the undo bar (the usual phone word for Undo) stays.
- **Keep-place conflict found by the tests:** the round buttons (≈↓ ≈↑) already keep the *amount* still (v1.7.9); the app-wide keep-place hold added in this release then pinned the *button* instead, so on 320 px phones the amount slid 20 px when a “mua dư” note appeared. Round buttons now opt out of the app-wide hold; the existing check passes again.
- **Tests:** `units-catalog` (name guesses, a family “Sườn bò” suggested for the fridge); `v176-fixes:browser` (cooked meal button wording, no “Hoàn tác bữa”, at four sizes, VI and EN; rounding keeps the amount still).
