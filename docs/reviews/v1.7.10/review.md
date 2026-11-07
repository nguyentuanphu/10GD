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
