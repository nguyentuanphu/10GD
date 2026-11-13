# Audit area B: places that do the same job but behave differently

- Repo: nguyentuanphu/10GD, read-only built copy `wt-audit` at commit dd2e657 (`dist/` as built; nothing rebuilt or edited).
- Date: Thursday 12 Nov 2026, Sydney time.
- Method: code reading of `src/frontend/*.ts`, plus Chromium browser checks.
  - Serving: `dist/` served through `page.route` at `https://kitchen.test`, service workers blocked, device-only mode, `timezoneId: Australia/Sydney`, reduced motion. No live APIs: every request outside the origin is blocked and `/.netlify/*` returns 401.
  - Scripts: `(audit scratch) B/` (`h.cjs` harness, `t0`–`t8*.cjs`).
  - Screenshots: the same folder. Screenshot paths below are relative to it.
  - Sizes: mobile 375×812, tablet 820×1100, desktop 1280×800. Each finding says which sizes were used.
  - Limits: viewport simulation only, not physical devices. Some flows were driven by calling app functions directly (for example `guestSheet()` or `stockForm()`) rather than by tapping through every screen.
- Line numbers: many source files are minified one-liners, so `file:line` points at a long line. The quoted function or attribute names identify the exact spot.
- Status labels:
  - **Verified (browser)**: reproduced in the browser.
  - **Verified (code)**: read in the code; the logic is unambiguous.
  - **Suspected**: not reproduced, or not proven to be reachable.
- Fixes already in progress (v1.7.19) are marked **in progress (v1.7.19)** as asked: the unit picker for Viết món, pantry, extras, receipts and price scout, and editing extras.

## Summary

| Severity | Count |
|---|---|
| High | 5 |
| Medium | 12 (2 of them in progress v1.7.19) |
| Low | 6 |
| **Total** | **23** |

---

## B1 · High · Dates & weeks / People & portions: guests saved to a hidden copy of the week when the menu week does not start on Monday
Status: **Verified (browser)**.

**Where it happens**
- Storage keeps weeks keyed by their Monday. `core.ts:12` has the comment "Storage is unchanged — weeks stay keyed by their Monday". `planWeek` (`core.ts:186`) builds the 7-day window over the Monday-keyed weeks.
- The guest flows instead call `ensureWeek(state, planStartOf(state, date))`:
  - `family-menu-ui.ts:71` (`guestSheet`)
  - `family-menu-ui.ts:121` (guest save loop `const mm=ensureWeek(state,planStartOf(state,x.date))…setMealGuests`)
  - `family-menu-ui.ts:61` (`guestNextMeal`), `:62` (`guestMealTypes`), `:63`, `:109` (`upcomingGuests`)
  - `family-flow.ts:93` (next meal), `:118` (guests from an RSVP), `:129` (`leftover-serve`), `:156`
- When `preferences.weekStartDay` is not 1 (the family can choose, for example, Saturday), `ensureWeek` creates a second stored week keyed by that Saturday, with its own default copy of each day.

**What happens**
- With Saturday as the week start, `state.weeks` gains the keys `2026-11-07` and `2026-11-14` next to `2026-11-09`.
- Adding "Cô Lan QA" in the guest sheet shows the toast "Đã thêm khách cho 1 bữa."
- But the Monday copy that Thực đơn, Hôm nay and Đi chợ read has no guest (`mondayCopy: []`), and the meal portions stay at 3.15. With a Monday start, the same steps give 4.15 portions.

**Why it matters to the family**
- The app says the guest is added, but portions and the shopping list do not change, so they buy too little.
- Two stored copies of the same day can drift apart. This is a data problem, not only a display problem.

**Common behaviour to aim for**
- Every reader and writer of a day uses one accessor that keys by Monday (`ensureWeek(state, monday(date))` or `mealAt`).
- `planStartOf` is used only for the display window.
- Clean up the ghost weeks that were already created. Merge them carefully: they may hold guests the family entered.

**Screenshots:** `guests-weekstart6-375x812.png` (Saturday start: toast shown, nothing counted), `guests-weekstart1-375x812.png` (Monday start, for comparison).

## B2 · High · Dates & weeks: search, receipts and voice undo read the week by the menu start day, not by Monday
**Where it happens**
- `app-search.ts:61`: `state.weeks?.[planStartOf(state,d)]`. Global search for planned dishes.
- `receipt-match-ui.ts:40`: `state.weeks?.[planStartOf(state,rd)]`. Extras offered when matching a receipt.
- `receipt-ui.ts:25`: `add(state.weeks?.[k],k,…)` with `k=planStartOf(…)`. Candidate rows for a receipt's week.
- `personal-ui.ts:173`: `voiceUndo={kind:'shopping',week:weekStart,…}`, read back at `:175` as `state.weeks[u.week]`.
- `voice-commands.ts`: `wk=weekStart` saved in every undo entry and read back at `:272` as `state.weeks[u.week]`.
- Other screens use the correct key: `monday(date)` (for example `family-menu-ui.ts:237` `fmSetMeal`, `personal-ui.ts:174`).

**What happens**
- With Saturday as the week start, global search for a dish planned tonight finds nothing ("Không thấy gì khớp."). With Monday as the week start it finds "Món QA thứ bảy · Bữa tối · T5 12/11 · hôm nay". Verified (browser).
- Receipts and voice undo look in the ghost copy from B1 (or in nothing). Receipt matching would miss that week's extras. Voice "Hoàn tác" for shopping items would not find the items to undo. Verified (code); the voice-undo effect in the browser is **suspected**.

**Why it matters to the family**
- Search, receipt matching and undo quietly fail for families who start their week on Saturday or Sunday. That option was added for Henry's family (v1.7.6).

**Common behaviour to aim for**
- The same single accessor as in B1. Undo entries store the Monday key of the date they changed.

**Screenshot:** `week-sat-search-375x812.png`.

## B3 · High · People & portions / Shopping: a dish already cooked ahead goes back on the shopping list
Status: **Verified (browser)**.

**Where it happens**
- `core.ts:87` (`mealIngredients`) skips dishes with `r.cookedAhead || r.fromLeftover` (comment "v1.7.12").
- `family-menu-core.ts:34` replaces `mealIngredients` whenever any dish has `batchId` or `yield`. Every family recipe has `yield`. This replacement has no `cookedAhead` / `fromLeftover` check.

**What happens**
- A later meal holds one dish that was already cooked ahead (`cookedAhead` set by `cookMealAhead`, `core.ts:136`). The other dish on that meal is not cooked yet, so the meal is not closed.
- Without `yield`, the cooked-ahead dish gives no shopping rows.
- With `yield` (every family recipe), the dish's ingredients come back on Đi chợ (`ribs:473, garlic:12, fishSauce:20 …`).
- In the meal-ingredient check, the amount for the first ingredient went from 945 g to 1,417.5 g once the cooked-ahead dish was added.

**Why it matters to the family**
- They buy the ingredients for a dish that is already cooked.

**Common behaviour to aim for**
- One `mealIngredients` that applies every rule: skip cooked-ahead and leftover dishes, scale by recipe yield, handle batch and lunchbox. The cook-ahead (B4), cost and recipe-view code should all use it.

**Screenshot:** `cookahead-still-on-list-375x812.png`.

## B4 · High · People & portions / Pantry: cooking ahead takes a different amount from the pantry than the list bought
Status: **Verified (browser)**.

**Where it happens**
- `core.ts:133` (`dishNeeds`, used by `cookMealAhead`) scales by `mealServings/4`, which assumes every recipe serves 4.
- `family-menu-core.ts:34` (`mealIngredients`, used by the list) scales by `servings × dishFactor / familyYield(r)`.

**What happens**
- For a family recipe that serves 2, with 3.15 portions planned:
  - the list buys 945 g of sườn;
  - cooking ahead takes 472.5 g out of the pantry.
- The recipe view (`app.ts:79`) also uses `familyYield` and shows 945 g.

**Why it matters to the family**
- After cooking ahead, the pantry shows sườn that was already used. The next list then buys too little.

**Common behaviour to aim for**
- Take from the pantry with the same function and scale the list uses (see B3).

## B5 · Medium · Undo & delete / Extras: extra items vanish on one tap; ingredient rows ask first
Status: **Verified (browser)** at 375×812, 820×1100 and 1280×800.

**Where it happens**
- Extra row: `app.ts:160` (`case 'delete-extra'`) removes the item straight away.
  - No confirmation and no undo.
  - The button is a text "×" glyph, not a drawing (rule 27).
- Ingredient row: `skip-row` opens the sheet "Bỏ Sườn heo khỏi giỏ?" with *Giữ lại* / *Bỏ khỏi giỏ*. Skipped rows can be brought back.
- Other deletes: voice "remove" of an extra does keep an undo (`voice-commands.ts`, `t:'extra-del'`).

**What happens**
- Tapping × on "Giấy bếp (QA)" removes it at once. No sheet opens, no undo toast appears, and `extras.length` drops to 0.

**Why it matters to the family**
- Items they typed in themselves can be lost to one mistaken tap, with no way back. Items the app works out from the menu are protected.

**Common behaviour to aim for**
- Same pattern for both: "Bỏ khỏi giỏ?" sheet or an undo toast, the same wording, and the same drawn icon button.

**Screenshots:** `rows-extra-vs-ingredient-375x812.png`, `-820x1100.png`, `-1280x800.png`.

## B6 · High · Adding to the pantry / Extras: bought extras never reach the pantry, even when chosen from the ingredient list
Status: **Verified (browser)**.

**Where it happens**
- `app.ts:159`: the add-extra sheet offers "Chọn nhanh từ 58 nguyên liệu có sẵn". Picking Sữa tươi fills only the name.
- `app.ts:202` (`case'extra-form'`) saves `{name, qty:"2 l" (text), cost, storeId}`:
  - no ingredient id;
  - the amount is kept as free text, so it cannot be added to an ingredient row or converted.
- `app.ts:170` (`store-purchases`, "Cất đồ đã mua vào tủ") takes rows only from `shopping()`, so extras are never included.
- Ingredient rows ticked "đã mua" go through the put-away sheet into the pantry (`purchase-units.ts:33`).

**What happens**
- Adding Sữa tươi 2 l from the catalogue and ticking it shows the toast "Chưa có nguyên liệu được đánh dấu đã mua." The pantry has 0 milk.
- The "Cất" button is still shown.

**Why it matters to the family**
- Milk bought as an extra is not in the pantry, so next week's list asks for it again.
- If milk is also on the menu, the same item can appear twice: once as an extra and once as an ingredient row.

**Common behaviour to aim for**
- An extra chosen from the catalogue keeps its ingredient id and a numeric amount with a unit (this ties in with the v1.7.19 unit picker).
- When ticked, it goes into the same put-away sheet.
- It merges with the matching ingredient row.

**Screenshot:** `extra-bought-not-to-pantry-375x812.png`.

## B7 · Medium · Extras: extras cannot be changed; ingredient rows can — in progress (v1.7.19)
Status: **Verified (browser)**.

- Extra row controls: done checkbox, `extra-store`, `delete-extra`. Nothing else.
- Ingredient row controls: done checkbox, `ingredient-detail`, `purchase-quantity` (buying-unit sheet), round down and round up, `item-store`, `skip-row`.
- The extra's amount ("2 cuộn") is plain text. The ingredient's amount is a tappable chip.
- Listed here for completeness: **in progress (v1.7.19)**.

**Screenshot:** `rows-extra-vs-ingredient-375x812.png`.

## B8 · Medium · Choosing a store: the store sheet for an extra is a cut-down copy of the one for an ingredient
Status: **Verified (browser)**.

**Where it happens**
- `shopping-planning.ts:20` (`itemStoreModal`, ingredient row). It has:
  - store chips;
  - "Hoặc chọn từ danh sách cửa hàng" select;
  - "Ghi chú riêng cho lần mua này";
  - "Luôn nhớ nơi mua này…" checkbox;
  - footer *Thêm cửa hàng* + *Lưu nơi mua*.
- `shopping-planning.ts:21` (`extraStoreModal`, extra). It has:
  - chips only;
  - a tap saves and remembers straight away (`quick-pick-extra-store`);
  - no note, no "remember" choice, no way to clear the store, and no footer at all.
- The add-extra sheet (`app.ts:159`) has a third layout: chips plus a separate `<select>` for the same choice.

**Why it matters to the family**
- They cannot add a note ("quầy thịt") for an extra.
- An extra's store is always remembered for next time, with no choice.
- They cannot remove a store they picked by mistake.
- The sheets look and save differently for the same job.

**Common behaviour to aim for**
- One "Mua ở đâu?" sheet for both kinds of row, with the same fields and the footer from rule 25.

**Screenshots:** `sheet-extra-store-375x812.png`, `sheet-item-store-375x812.png`, `sheet-extra-store-1280x800.png`, `sheet-item-store-1280x800.png`.

## B9 · Medium · Choosing a store: five different store and retailer lists that do not know about each other
**Where it happens**
- The family's stores (`state.stores`: Coles, Woolworths, ALDI, Chợ Việt / Á Châu). Used by extras and ingredient rows (`shopping-planning.ts`).
- Receipt store (`family-features.ts:9`, `#receipt-store`): free text, not linked to `state.stores`.
- Price scout observation form (`price-scout-ui.ts:250`): fixed list woolworths, coles, aldi, chemist, amazon, viet-grocer, other. No Harris Farm, IGA or Costco.
- Products page (`products-ui.ts:5`) uses the global `RETAILERS` from `insights-core.ts:36`. In the browser `Object.keys(RETAILERS)` is `['coles','woolworths','chemist']`, so there is no ALDI and no Harris Farm. Verified (browser).
- Receipt reading (`receipt-parse.ts:28`): aldi, woolworths, coles, woolworths-uk, iga, costco, harris-farm.
- Optimiser (`shopping-optimizer.ts:8`) and voice (`voice-price.ts:85`): their own lists again.

**Why it matters to the family**
- A store chosen for an item is never linked to the receipt or to prices from that store.
- ALDI and Harris Farm exist in some screens and not others. Rule 19 names Coles, ALDI, Woolworths and Harris Farm as photo sources.

**Common behaviour to aim for**
- One store registry, with retailer ids for the chains and the family's own places on top. Every picker reads it, including receipts as a choice plus "khác".

## B10 · Medium · Adding to the pantry: five ways in, five sets of defaults
**Where it happens**

| Path | Place | Use-by | Other |
|---|---|---|---|
| Manual "Thêm thực phẩm" (`app.ts:84`, save `app.ts:194`) | Always Ngăn mát (first option) | Blank | Base unit only, `step=0.1` even for quả |
| Put-away after "đã mua" (`purchase-units.ts:33`) | `suggestStorePlace` | `suggestUseBy` | Keeps the buying unit; `storedOn` set |
| Barcode scan (`kitchen-extras.ts:76`, `:85`) | `suggestStorePlace` | `suggestUseBy` | `storedOn` set |
| Receipt (`receipt-list.ts:128`) | `placeFor` → `suggestStorePlace` (frozen labels → freezer) | `''` | `boughtOn` set |
| Voice pantry card (`voice-commands.ts:261`) | Existing lot's place, else `INGREDIENTS[id][2]==='dry'?'dry':'fridge'` | `''` | Replaces every lot of that ingredient with one lot, dropping their use-by dates and buying units |

**What happens**
- Manual form, choosing Gạo: place `fridge`, but the app's own suggestion is `dry`. Verified (browser).
- Manual form, choosing Trứng: no use-by, but put-away would suggest 2026-12-03. Verified (browser).
- Voice: eggs and tofu have group `dry` in `seed.ts`, so a voice pantry card for eggs with no existing lot files them in Tủ khô. `suggestStorePlace` keeps them cold (`STORE_COLD_DRY`). Verified (code).

**Why it matters to the family**
- Rice ends up "in the fridge" and eggs "in the cupboard".
- Use-by reminders only work for some of the ways in.
- Saying "còn 6 quả trứng" wipes the use-by dates already entered.

**Common behaviour to aim for**
- One "add lot" helper: place from `suggestStorePlace`, use-by from `suggestUseBy` (editable), `storedOn` / `boughtOn`, and the buying unit kept.
- Voice adjusts lots instead of replacing them.

**Screenshot:** `pantry-manual-egg-375x812.png`.

## B11 · Medium · Recipe editing / Units: the same recipe line means different amounts depending on how it was entered
**Where it happens**
- Viết món / family recipe editor (`recipe-community.ts:18`, `:29`; this is the enhanced `familyRecipeEditor` in `family-menu-ui.ts:8`):
  - "real" units come from `RC_SHOP_UNITS` (g, kg, lạng = 100 g, ml, l, quả, cái, bó, gói, miếng);
  - `muỗng canh`, `muỗng cà phê`, `chén`, `lon` and others are in `RC_NOTE_UNITS`: "kept as written, not added up".
- Voice recipe (`voice-recipe.ts:12`, `:217`, `:234`):
  - free-text unit box with a 14-item datalist;
  - `vrUnitInfo('tbsp')`, `('muỗng canh')` and `('cup')` return `form:null` (note only);
  - `lạng` returns g ×100. Verified (browser).
- Import from a link (`kitchen-extras.ts:18`, `UNIT` map; `recipeFromImport` at `:37`):
  - `tbsp → 15 ml`, `tsp → 5 ml`, `cup → 250 ml`;
  - these are converted and added up, so they reach the shopping list. Verified (code; `recipeFromImport` is module-scoped and could not be called from the page).
- Import saves the recipe before review: `kitchen-extras.ts:50` does `state.recipes.unshift(rec); save(…)` before opening Viết món. It also forces `category:'main'` and `protein:'mixed'` (`:38`). Viết món and voice save only when *Lưu* is tapped. See B23.

**Why it matters to the family**
- "Nước mắm 2 tbsp" from a website adds 30 ml of fish sauce to the list.
- The same line typed in Viết món, or dictated, adds nothing (note only).
- Shopping amounts depend on how the recipe was entered.

**Common behaviour to aim for**
- One unit table (`unit-registry.ts`) and one rule for spoon/cup units, used by all three paths.
- The unit choice in Viết món is **in progress (v1.7.19)**. The conversion rule for spoons and cups is not part of that work and needs a product decision.

## B12 · Medium · Units & amounts: each place offers its own unit list — in progress (v1.7.19)
These are listed under rule 29.

| Place | File | Unit choice |
|---|---|---|
| Đi chợ buying-unit sheet | `unit-picker.ts`, `unit-registry.ts` | Suggestions, "Xem tất cả", family units, conversions |
| Extras | `app.ts:44`, `:159` | `EXTRA_UNITS` (14 fixed); saved as text "2 cuộn" |
| Pantry manual | `app.ts:84` | Base unit only, no choice. Pantry form for a lot with a purchase: `unit-picker.ts:48` |
| Receipt line | `family-features.ts:10` | g, kg, ml, l, quả, `BUYING_UNITS`, remembered units, `pack`. No family custom units. In English the options stay Vietnamese ("lát, nắm, cây, củ, tép, nhánh") — verified (browser), `en-receipt-new-820x1100.png` |
| Receipt "1 unit ≈" | `receipt-list-ui.ts:46` | Typed amount only |
| Price scout | `price-scout-ui.ts:256` | `g, kg, mL, L, each, wash, roll, sheet`: different case (mL/L against ml/l elsewhere) and English words in the Vietnamese screen |
| Barcode scan | `kitchen-extras.ts:79` | Base unit only |
| Viết món | `recipe-community.ts:29` | `<select>` (see B11) |
| Voice recipe | `voice-recipe.ts:217` | Free text plus datalist |
| Voice pantry card | `voice-commands.ts:261` | Free-text unit |

Status: **in progress (v1.7.19)**, except voice recipe and voice pantry, which were not named in the v1.7.19 scope and should be confirmed with Henry under rule 29.

## B13 · Medium · Money: "$" written by hand in several places; VND shown as dollars
**Where it happens**
- Currency-aware formatter: `aud()` (`core.ts:29`) gives "125.000 ₫" for VND and "$12.50" for AUD. Receipt sheet (`receipt-ui.ts:19`) and receipt share (`receipt-share.ts:87`) use it.
- Hand-written "$" + `toFixed(2)`:
  - `app-search.ts:67–68` (receipts and receipt lines in global search);
  - `receipt-match-ui.ts:22` and `receipt-match.ts:21` (also `Math.abs`, so a discount line shows as a positive amount);
  - `receipt-quality.ts:15`.
- Always AUD: `price-scout-ui.ts:19` (`scoutMoney` → `aud(n,'AUD')`), `voice-price.ts:393`, `voice-commands.ts:226`.

**What happens**
- A VND receipt of 125,000 shows in global search as "12/11 · $125000.00". The receipt formatter would show "125.000 ₫". Verified (browser).

**Why it matters to the family**
- Wrong currency symbol, and amounts with no thousands separators.
- Discounts look like charges on the receipt-matching screen.

**Common behaviour to aim for**
- Every amount goes through `aud(n, currency)` with the record's currency, and keeps its sign.

**Screenshot:** `money-vnd-search-375x812.png`.

## B14 · Medium · People & portions: cooking mode drops the amounts the recipe view shows
Status: **Verified (browser)** at 375×812, 820×1100 and 1280×800.

**Where it happens**
- Recipe view opened from a meal (`app.ts:79`, `showRecipe` with meal context) shows "8 suất chuẩn" and the scaled amounts (Sườn heo 1.2 kg, Tỏi 30 g …).
- Cooking mode (`app.ts:104`, `renderCooking`; opened at `app.ts:183`, `start-cooking`) shows only the steps and the timer. It has no ingredient list, no amounts and no portions.
- `start-cooking` loads `state.recipes.find(id)` first, so it uses the library copy, not the meal's dish. A dish that is only on the meal (custom, or deleted from the library) needs `editingDate`; without it the button does nothing.

**Why it matters to the family**
- While cooking for 8 people, they must leave cooking mode to see how much of each ingredient to use.

**Common behaviour to aim for**
- Cooking mode receives the meal context and shows the same scaled list as the recipe view (from the shared function in B3).

**Screenshots:** `cooking-mode-no-amounts-375x812.png`, `-820x1100.png`, `-1280x800.png`, `portions-recipe-view-375x812.png`.

## B15 · Medium · Sheet chrome (rules 25 / 27): footers differ from sheet to sheet
Status: **Verified (browser)**: 30 sheets opened at 375×812 and 1280×800; data in `sheets-375.json` and `sheets-1280.json`.

**Cause:** `decorateSheet` / `sheetButtonKind` (`app.ts:294–303`) decide the drawing from the button text. It only matches text starting with "Lưu/Save" or exactly "Đóng/Xong/Close/Done".

**Main action has no drawing**
- Receipt: "Kiểm tra & lưu khoản chi" (`sheet-receipt-new-*`).
- Voice: "Xem trước" (`sheet-voice-*`).
- Notes import: "Xem trước, chưa nhập" (`sheet-notes-*`).
- Rule 27 asks for a drawing on these. Other primaries have one, for example "Thêm vào danh sách đi chợ", "Cất 1 nguyên liệu" and "Đăng giá".

**Danger and secondary buttons in the same footer have no drawing**
- "Xóa lô này", "Xóa khỏi kho", "Bỏ khỏi giỏ", "Dùng lượng tự động". The *Lưu* or *Hủy* beside them has one, for example in `sheet-stock-edit-*` and `sheet-skip-row-*`.

**Save sits inside the body instead of the floating footer**
- Currency: "Lưu giá".
- Kitchen settings: "Lưu khẩu phần", "Lưu thực đơn".
- Reminders: "Lưu giờ chung".
- Recipe view: "Lưu sở thích".

**No footer at all**
- Extra-store sheet, Weather sheet.

**Three buttons in one footer**
- Recipe view: *Xóa khỏi kho*, *Chế độ nấu*, *Thêm vào bữa ăn*.
- Reminders: *Kết nối gia đình*, *Thử thông báo*, *Bật thông báo*.
- On phones these grow to 67 px tall in the recipe view. Allowed by rule 25, but it differs from the other sheets.

**Why it matters to the family**
- *Lưu*, *Xóa* and *Đóng* look different from one sheet to the next.
- Some saves are hidden halfway down a scrolling sheet.

**Common behaviour to aim for**
- Each footer button declares its role (`data-sheet-role="save|close|cancel|danger|primary"`) instead of relying on text matching.
- Every sheet that saves has a floating footer.
- A browser check covers all sheets, not only the purchase sheet.

## B16 · Low · Undo & delete: different confirmation styles and spellings
**Confirmation style**
- Native browser `confirm()`:
  - remove a meal (`family-menu-ui.ts:237`, `fmSetMeal`);
  - delete a price (`price-scout-ui.ts:315`);
  - clear a dictated transcript (`voice-recipe.ts:277`).
- In-app sheet (`confirmModal` or a sheet): empty a meal (`app.ts:132`), delete a recipe (`app.ts:152`), delete a pantry lot (`app.ts:157`), remove a member (`app.ts:180`).

**Wording**
- Cancel buttons: "Hủy" in most sheets, "Giữ lại" in skip-row.
- Spellings across non-Studio sources:
  - "Xóa" 19, "Xoá" 13, "xóa" 10, "xoá" 25;
  - "Hủy" 14, "Huỷ" 6.

**Undo exists for:** Đã nấu, voice adds, notes import, receipt reconcile, voice commands.

**Undo does not exist for:** deleting an extra (B5), deleting a pantry lot, deleting a recipe, removing a dish (each of the last three has a confirmation only).

**Common behaviour to aim for:** one in-app confirm sheet with drawn buttons (rule 25), one spelling, and an undo toast for every delete.

Status: **Verified (code)**.

## B17 · Low · Search boxes: some older searches need the exact accents
- Accent-insensitive (`normalizeText`): recipe library (`family-menu-ui.ts:12`), global search (`app-search.ts:10`), products (`products-ui.ts:5`), setup favourites (`personal-ui.ts:195`), unit search (`unit-picker.ts:66`), receipt match picker (`receipt-match-picker.ts:8`), community (`recipe-community.ts:24`).
- Accent-sensitive (`toLocaleLowerCase('vi').includes`):
  - `pickerItems` (`app.ts:83`): `pickerItems('pho')` does not find "Phở bò QA", but `pickerItems('phở')` does. Verified (browser).
  - `soupItems` (`app.ts:229`) and `filteredRecipes` (`app.ts:67`) work the same way.
- Whether these older pickers can still be reached in family mode is **suspected**. The weekend soup buttons were not on screen.

**Common behaviour to aim for:** one search helper that ignores accents and ranks results the same way (`recipeSearchScore`).

## B18 · Medium · Choosing an ingredient: some forms use a long plain list, others a search
**Plain `<select>` of every ingredient, with no search**
- Add extra (`app.ts:159`). Its label hard-codes "Chọn nhanh từ 58 nguyên liệu có sẵn"; the real count grows with family ingredients.
- Pantry manual (`app.ts:84`).
- Barcode scan (`kitchen-extras.ts:78`).
- Price entry in Tiền tệ & giá (`personal-ui.ts:135`).
- Price scout "Món trong danh mục" (`price-scout-ui.ts:248`).

**Search or typeahead**
- Viết món ingredient name (`recipe-community.ts:59`).
- Receipt match (`receipt-match-picker.ts`).

**Why it matters to the family:** scrolling a list of 58 or more ingredients on a phone is slow, and the hard-coded "58" is wrong.

**Common behaviour to aim for:** one ingredient picker with accent-insensitive search, used everywhere.

Status: **Verified (code)**; the add-extra label is visible in `sheet-add-extra-375x812.png`.

## B19 · Low · Amounts & portions shown with different number styles
- Guest total uses a decimal comma in Vietnamese: "Thêm 1,5 suất mỗi bữa" (`family-menu-ui.ts:68`).
- Other portion text uses a dot: "3.15 suất chuẩn" (`app.ts:57`, `:61`, `:81`; `family-menu-ui.ts:32`, `:36`).
- Some places say "suất", others "suất chuẩn" (`app.ts:63` against `app.ts:61`).
- Amounts:
  - `fmtQty` (`core.ts:28`): 1 decimal for g/ml, kg or l above 1000, fractions for counts;
  - `pantryBuyingDisplay` (`purchase-units.ts:36`): 2 decimals;
  - shopping rows show amounts like "11.8 ml" and "472.5 g" (`rows-extra-vs-ingredient-375x812.png`).

**Common behaviour to aim for:** one formatter for numbers and portions, with the decimal separator decided by language.

Status: **Verified (code / browser text)**.

## B20 · Low · Pantry place names differ in English
- "Tủ khô" is "Pantry shelf" in put-away (`app.ts:170`) and family-flow (`family-flow.ts`), but "Cupboard" in global search (`app-search.ts:56`).
- The manual pantry form writes "Ngăn mát / Ngăn đông / Tủ khô" as Vietnamese literals (`app.ts:84`) and relies on `language.ts`.

Status: **Verified (code)**.

## B21 · Low · Dates & time: some places use the device clock or zone instead of Sydney
- Greeting uses `new Date().getHours()`, the device's hour (`personal-core.ts:239`).
- Automatic dark theme also uses the device hour (`personal-ui.ts:27`).
- `toLocaleDateString` with no `timeZone`, giving a dd/mm/yyyy format unlike `dateLabel`'s dd/mm:
  - receipt created date (`receipt-ui.ts:258`);
  - trusted-device expiry (`personal-ui.ts:70`);
  - Ladybug replies (`ladybug.ts:215`).
- `familyPersonSummary` (`availability-core.ts:50`) always groups weeks from Monday, while the menu follows `weekStartDay`.

**Common behaviour to aim for:** Sydney-time helpers for the hour and the date (rule 22) and one date formatter.

Status: **Verified (code)**. User impact is **suspected**: it only shows when the device is not set to Sydney time.

## B22 · Low · Same-job sheets translated to different degrees in English
**English mode at 820×1100**
- Fully English: add extra, pantry add, put-away, purchase quantity, Viết món.
- Partly Vietnamese:
  - item store: "Hoặc chọn từ danh sách cửa hàng", "Ghi chú riêng cho lần mua này", "Lưu nơi mua";
  - extra store: "Mua Kitchen paper ở đâu?";
  - receipt unit options (see B12).

**Common behaviour to aim for:** every same-job sheet passes the same English check.

Status: **Verified (browser)**.

**Screenshots:** `en-item-store-820x1100.png`, `en-extra-store-820x1100.png`, `en-receipt-new-820x1100.png`, plus the clean ones `en-add-extra-…`, `en-put-away-…`.

## B23 · Medium · Recipe editing: import from a link saves before the family reviews it
**Where it happens**
- Import from a link: `kitchen-extras.ts:50` (`importGo`) puts the recipe into `state.recipes` and calls `save()` before opening Viết món.
- Viet món (`family-menu-ui.ts:153`, submit) and voice recipe (`voice-recipe.ts:247`, which fills the same form) save only on *Lưu món ăn gia đình*.
- Import also fixes `category:'main'`, `protein:'mixed'` and a 4-portion default (`kitchen-extras.ts:37–38`). Viết món asks for all three.

**Why it matters to the family**
- If they close the editor, an unchecked recipe stays in "Món ăn gia đình" with the wrong category. This affects which meals the planner offers it for.

**Common behaviour to aim for**
- Import fills a draft in Viết món like voice recipe does, and nothing is saved until *Lưu*.

Status: **Verified (code)**. The import flow needs an online account and the network, so it was not run.

---

### Not verified / left out
- Voice pantry and voice "đã mua" were checked in code only. `vcApply` is module-scoped and the voice sheet needs speech input.
- `importSheet`, `scanSheet` and `cookAheadSheet` could not be opened from the page. They are module-scoped, or need context (`cookAheadSheet` threw without a meal argument).
- Photo handling:
  - only Viết món has a photo (`recipe-community.ts:80`);
  - voice recipe and import end in the same Viết món form, so their photos are the same;
  - the old `recipeForm` (`app.ts:88`) has no photo, but `add-recipe` is redirected to `familyRecipeEditor` (`family-menu-ui.ts:152`).
  - No difference was found here.
- Rule 19 emoji in the same-job controls was noted but belongs to another audit area: 🏪 / 🌱 in the add-extra sheet, 🎙 in Viết món, 📷 / 🖼 photo buttons, ⚡ / 🍝 chips, and `INGREDIENTS[id][4]` emoji in the purchase sheet heading.
