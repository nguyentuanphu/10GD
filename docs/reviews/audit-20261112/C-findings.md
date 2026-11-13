# Audit area C — data correctness (FamTray · Bếp Gia Đình)

- Code: read-only copy `wt-audit` at commit **dd2e657** (built `dist/`). Nothing in the repository was changed.
- Date: 12 Nov 2026 (Sydney time).
- Probe scripts are in `(audit scratch) C/`:
  - `h.cjs` is the Node VM harness. It loads the compiled `dist/*.js` core files.
  - `bh.cjs` is the Playwright harness. It serves `dist/` with `page.route`, blocks all other hosts, and runs in device-only mode with timezone Australia/Sydney.
- How to run a probe:
  ```
  source …/scratchpad/env.sh
  NODE_PATH=/home/user/10GD/node_modules node <probe>
  ```
  The `LOADFAIL qty-round` line is expected: that file needs the DOM.
- What the labels mean:
  - **Verified (probe)**: reproduced by a script.
  - **Verified (code)**: the code path is unambiguous, but there is no script.
  - **Suspected**: not reproduced.

## Counts

| Severity | Count |
|---|---|
| High | 11 (C1–C11) |
| Medium | 9 (C12–C20) |
| Low | 5 (C21–C25) |

There are also 4 suspected items (S1–S4).

---

## High

### C1 — Counted units are not rounded for any dish that has a `yield` (every family recipe)
- **Where:** `src/frontend/family-menu-core.ts:34`. The `mealIngredients` override has no `roundNeed`. `batchIngredients` (line 33) is the same.
- **Why it happens:** `core.ts:87` rounds counted units up (Issue #38, v1.7.18). The override replaces it whenever a dish has `r.yield` or `r.batchId`. The family recipe editor always saves `yield` (`family-menu-ui.ts:153`).
- **Input:** a family recipe "Gà luộc" with 1 con "Gà trống" and yield 4, for 3.15 portions.
- **Actual:**
  - `mealIngredients` gives 0.7875 con.
  - The shopping row shows `needed` 0.7875, and the sheet reads "Cần 0.79 con".
  - Cooking takes 0.7875 con from a 1 con lot, so the pantry keeps **"0.21 con"** of a rooster that was cooked whole.
  - The same dish without `yield` gives 1 con.
- **Expected:** 1 con everywhere, including need, consumption and the pantry.
- **Repro:**
  - `C/p01-yield-count.cjs`
  - `C/p14-check-pantry-count.cjs` (browser): the sheet shows "Gà trống · Cần 0.79 con".
- **Fix:**
  - Apply `roundNeed(out[k], INGREDIENTS[k][1])` at the end of the override and in `batchIngredients`.
  - Or move rounding into one shared helper used by `mealIngredients`, `dishNeeds` and `batchIngredients`.
  - Add a test with `yield`.
- **Verified (probe).**

### C2 — Recipe ingredient row: picking a suggestion overwrites the chosen counted unit with grams (the "1 g rooster")
- **Where:** `src/frontend/recipe-community.ts:59` (`rcPick`). The condition `if(!RC_SHOP_UNITS[unit.value]||…) unit.value=opt.dataset.unit` replaces every non-shop unit (con, tép, củ, muỗng…). The amount is kept.
- **Input:** name "Gà", amount 1, unit "con". Then type "Thịt gà" and tap the suggestion "Thịt gà (g)".
- **Actual:** the unit becomes `g` and the amount stays 1. The saved line is **`Thịt gà | 1 | g`**.
- **Expected:**
  - Keep the family's unit.
  - Or, if the unit cannot be converted, keep the line as typed and show that it is not counted. Never pair the old amount with a new unit silently.
- **Repro:** `C/p10-forms.cjs` (browser), result `a`.
- **Fix:**
  - Only change the unit when it is empty.
  - When the units differ and cannot be converted, clear the amount and ask, or keep the family's unit and leave the line uncounted.
  - Add a browser check.
- **Verified (probe).**

### C3 — "Mua thêm" sheet: a family ingredient counted in "con" gets unit g and an invented amount
- **Where:**
  - `src/frontend/shopping-planning.ts:24` (the `extra-catalog-ing` change handler) pre-fills `amount = (u==='g'||u==='ml') ? '500' : '2'` and sets the unit only if it is in `EXTRA_UNITS`.
  - `src/frontend/app.ts:44`: `EXTRA_UNITS` has no `con`, `miếng`, `củ`, `tép`, …
- **Input:** pick "Gà trống (con)" from "Chọn nhanh".
- **Actual:**
  - The amount is set to **2**, which nobody typed.
  - The unit stays at the default **g**, so the list shows "Gà trống · 2 g · $0.00".
  - Typing a name by hand also defaults to g.
- **Expected:**
  - No amount until the family types one.
  - The unit is the ingredient's unit, with every family unit in the list.
  - No default to g.
- **Repro:** `C/p10-forms.cjs` (browser), result `b`.
- **Fix:**
  - Build the unit list from the registry plus `FAMILY_UNITS` plus custom units.
  - Leave the amount empty.
  - Make "— đơn vị" the default, and require a choice.
- **Verified (probe).**

### C4 — Cooking a meal with many guests stores `servings > 30`; `validImport` then rejects the whole state
- **Where:**
  - `src/frontend/availability-core.ts:77` stores `m.servings = portions` after cooking. The same happens in `app.ts:195` (members-form freezes cooked meals).
  - The validator in `core.ts:141` and `family-menu-core.ts:61` requires `m.servings <= 30`.
  - Guests allow up to 10 groups × 30 adults (`core.ts:39`).
- **Input:** a family of 4 (3.15 portions) plus one guest group of 28 adults and 2 kids, then tap "Đã nấu".
- **Actual:** `m.servings = 32.15` and `validImport(state) === false`.
  - On the next load, `app.ts:5` opens sample data with the recovery block.
  - Sync throws `merge-invalid` (`family-features.ts:47`).
  - Backup import is refused.
- **Expected:** a state the app itself produces always validates.
- **Repro:** `C/p02-guests-servings.cjs`
- **Fix:**
  - Raise the validator limit to the reachable maximum: members plus 10×30×1.
  - Or store the cooked portions in a separate field.
  - Add a test that every app write path passes `validImport`.
- **Verified (probe).**

### C5 — UK and EU receipts are saved with currency GBP or EUR, which `validImport` rejects
- **Where:**
  - `src/frontend/receipt-ui.ts:86`: `d.currency = parsed.currency` for non-AUD receipts.
  - `family-features.ts:19`: `record.currency = d.currency`.
  - `personal-core.ts:5`: `validPersonalState` allows only AUD and VND.
- **Input:** read a Woolworths UK receipt (`VAT No`, £) and save it. The existing test `receipt-ocr-browser` does exactly this.
- **Actual:** the receipt is stored with `currency: 'GBP'`, and `validImport` returns false. The consequences are the same as C4: load falls back to recovery, and sync and backup break.
  - The receipt is also hidden from "Chi tiêu", because of the currency filter.
- **Expected:** a valid state.
- **Repro:** `C/p03-gbp-receipt.cjs`
- **Fix:** do one of these, and add a validation test for the GBP fixture:
  - Allow any ISO currency code on receipts (`/^[A-Z]{3}$/`), and keep the budget currency limited to AUD and VND.
  - Or refuse to save, or convert, non-AUD/VND receipts.
- **Verified (probe).**

### C6 — Editing a saved receipt turns "2 (unit not known)" into 2 g, which sets a price of $6000/kg
- **Where:** `src/frontend/family-features.ts:20` (`openReceipt`). The line `unit: i.enteredUnit || INGREDIENTS[i.ingredient][1]` defaults an unknown unit to the base unit (g). `saveReceipt` then runs `canonicalQuantity(2,'g')`.
- **Input:** a saved line "CHICKEN THIGH $12" with `enteredQty: 2` and `enteredUnit: ''`. Open it and save without changes.
- **Actual:**
  - The unit select shows **g**.
  - The saved line has `quantity: 2`, `enteredUnit: 'g'`.
  - `priceFor('chicken')` goes from 0.013 $/g to **6 $/g**.
  - `activatePrices` then raises every chicken cost on the list.
- **Expected:** the unit stays "Chưa rõ", and the quantity stays null.
- **Repro:** `C/p18-receipt-edit-unit.cjs` (browser)
- **Fix:**
  - Use `unit: i.enteredUnit ?? (i.quantity != null ? base : '')`, so the base unit is used only when a base quantity was stored.
  - Consider capping price updates that jump more than 10× and asking first.
- **Verified (probe).**

### C7 — "Nấu luôn cho bữa sau" ignores the recipe yield, so the later meal takes the wrong amount from the pantry
- **Where:** `src/frontend/core.ts:133` (`dishNeeds`: `factor = mealServings/4`), used by `cookMealAhead` (`core.ts:134–136`). The shopping list (`family-menu-core.ts:34`) divides by `familyYield(r)`.
- **Input:** a family recipe with yield 2 and 1000 g pork, planned for 2 portions on two dinners. Cook the first and include the second.
- **Actual:** the pantry gives 1500 g in total. The later meal takes 500 g, but its list need is 1000 g. The pantry shows 500 g that was actually cooked.
  - `dishNeeds` also skips `packedServings` for lunch-box dishes.
- **Expected:** 2000 g in total.
- **Repro:** `C/p09-cookahead-yield.cjs`
- **Fix:** build `dishNeeds` on the same per-dish formula as `mealIngredients` (yield, lunchbox, `roundNeed`).
- **Verified (probe).**

### C8 — Receipt reconciliation "Hoàn tác" does not restore the bought marks when the menu week does not start on Monday
- **Where:**
  - `src/frontend/receipt-list.ts:120` stores `undo.week = start`, the menu-week start (for example Saturday 2026-11-07).
  - `receipt-list.ts:136` looks up `s.weeks[u.week]`, but weeks are keyed by Monday (`planWeek` proxy, `core.ts:186`).
- **Input:** `preferences.weekStartDay = 6`, then reconcile a receipt that covers chicken, then undo.
- **Actual:**
  - `undo()` returns true and removes the pantry lots.
  - `week.bought.chicken = 500` and `boughtAt` stay, so the row still shows as bought.
  - Undo of an extra line ("Kimchi") is lost the same way.
- **Expected:** everything is restored.
- **Repro:** `C/p04-receipt-reconcile.cjs`, result `b`.
- **Fix:** store `monday(start)` as well, and look up `s.weeks[monday(u.week)]`. Better, store the stored-week key directly.
- **Verified (probe).**

### C9 — Sync: two devices cooking from the same pantry lot lose one deduction
- **Where:** `src/frontend/sync-merge-core.ts:94–98`. `syncMergeObject` merges `pantry[].qty` field by field with last-writer-wins. Consumption is a delta, not a value.
- **Input:** a 1000 g chicken lot.
  - Device A cooks Tuesday (−500 g).
  - Device B cooks Wednesday (−500 g).
  - Both changes are merged.
- **Actual:** the lot is 500 g. Both meals are marked cooked, and their consumed records add up to 1000 g.
  - The pantry shows 500 g that does not exist.
  - Undoing one meal would bring it to 1000 g.
- **Expected:** 0 g, or a reported conflict.
- **Repro:** `C/p05-sync.cjs`, result `a`.
- **Fix:**
  - When both sides lowered `qty` from the base, merge to `base − (base−l) − (base−r)`, clamped at 0.
  - Or recompute lot quantities from the merged `consumed` records.
- **Verified (probe).**

### C10 — A pack bought without a weight ("1 túi") stays in the pantry as "1 túi" after it is fully cooked
- **Where:**
  - `src/frontend/core.ts:123`: `takeFromPantry` keeps lots with `purchase.amount > 0`, and only updates `amount` when `basePerUnit` is set.
  - `purchase-units.ts:36–37`: display and note.
- **Input:** spinach bought as 1 túi with no conversion, then "Cất đồ" (estimated 200 g), then the dinner is cooked and uses all 200 g.
- **Actual:**
  - The lot stays with qty 0 and displays **"1 túi"**.
  - The note says "Chưa rõ khối lượng · chưa trừ được khỏi nhu cầu", but it was taken off.
  - It appears in "Trong tủ đang có sẵn" and the pantry counts.
- **Expected:** the lot is used up (removed or marked empty), or the amount is reduced in proportion to the estimate.
- **Repro:** `C/p12-pack-lot-after-cook.cjs`
- **Fix:** when `qtyEstimated` (or the qty was known) and qty reaches 0, drop the lot. Otherwise scale `purchase.amount` by `qty/originalQty`.
- **Verified (probe).**

### C11 — Receipt vs a list row in a buying unit without a conversion: the whole receipt is marked "Dư", and storing duplicates the bag
- **Where:** `src/frontend/receipt-list.ts:90` (`weekNeed` uses `r.qty`, which is null for "1 túi", so the need is 0).
- **Input:** the list row shows "Rau bina · 1 túi" (no conversion). The receipt has "SPINACH 400G" (400 g).
- **Actual:**
  - The status is "Dư 400 g". The extra goes to the pantry, and the list row is not ticked.
  - After ticking the row and "Cất đồ", the pantry holds 400 g plus a second lot "1 túi" (qty 0) for the same bag.
- **Expected:** the receipt covers the list row, the row is ticked, and there is no second lot.
- **Repro:** `C/p13-reconcile-pack-row.cjs`
- **Fix:**
  - When the row has a purchase without a factor and the receipt amount is known in base units, treat the row as covered (or ask).
  - In `storeShoppingPurchases`, skip rows whose ingredient was already received from a receipt in the same scope.
- **Verified (probe).**

## Medium

### C12 — An unknown price is shown as $0.00 in the buying sheet (and understated in the meal editor)
- **Where:**
  - `src/frontend/personal-core.ts:8`: `priceFor` returns `seedPrices[id] ?? null`, which is 0 for 48 unpriced built-in ingredients, not null.
  - `unit-picker.ts:36` shows "Chưa rõ giá" only when `priceFor === null`.
  - `app.ts:81` (meal editor) and `shopping-planning.ts:12` print `aud(mealRecipeCost(...))` without the "prices incomplete" guard that `recipePriceText` (`app.ts:4`) has.
- **Input:** a meal using "Mì spaghetti khô" (no price).
- **Actual:** the list row shows "Chưa rõ giá", but the buying sheet's "DỰ KIẾN CHI PHÍ" shows **$0.00**. Dish costs in the meal editor leave unpriced items out without saying so.
- **Expected:** "Chưa rõ giá" everywhere.
- **Repro:** `C/p08-unknown-price.cjs` (sheet text computed with the sheet's own formula). The meal editor is verified (code).
- **Fix:** have `priceFor` return null for a seed price of 0, and reuse one `costKnown` helper in every place that prints a cost.

### C13 — "Mua thêm" cost defaults to 0 and is saved as a known $0
- **Where:**
  - `src/frontend/app.ts:159`: the `extra-cost` field is `required value="0"`.
  - `app.ts:202`: `cost: +v.cost`, with no `costUnknown`.
  - Same pattern in `family-features.ts:24` and `shopping-planning.ts:29` (notes import), which use `cost: qty*INGREDIENTS[id][3]` with a 0 price and no `costUnknown`.
- **Actual:** the extra shows "$0.00", and the list total is not marked "≥ … chưa rõ giá".
- **Repro:** `C/p10-forms.cjs`, result `c` (browser).
- **Fix:** make the cost field empty and optional, and set `costUnknown: true` when it is empty or the price is unknown.

### C14 — The "Đồ trong tủ (N)" button count does not match its sheet
- **Where:**
  - `src/frontend/app.ts:66`: `N = rows with stock + pantry LOTS not on the list`. This counts lots, not ingredients, and includes expired lots.
  - The sheet (`app.ts:169`) lists every shopping row, including ones with nothing in stock.
- **Input:** pork on the list with 200 g in stock, plus pantry salmon (2 lots, one expired) and tofu.
- **Actual:**
  - The button reads "(4)".
  - The sheet shows 2 rows: "Gà trống · Có 0 con" and "Thịt heo".
  - Salmon and tofu are not in the sheet.
- **Expected:** the count equals what the sheet shows.
- **Repro:** `C/p14-check-pantry-count.cjs` (browser)
- **Fix:** compute both from one function, for example the shopping rows with `have > 0` plus the distinct unexpired pantry ingredients.

### C15 — "CHƯA ĐỐI ỨNG / PHÂN BỔ" counts discount and adjustment lines as unmatched spend
- **Where:** `src/frontend/family-features.ts:6`. Non-item lines (lineKind `discount`, saved as `kind: 'pending'`) are added as `Math.abs(total)`. The receipt card counts them as "chưa đối ứng" too.
- **Input:** a Costco receipt (fixture) with "Redeem rewards −72.71", and every line matched.
- **Actual:** unallocated is **$72.71**.
- **Expected:** $0.
- **Repro:** `C/p07-unallocated.cjs` (replicates the save mapping and the render formula)
- **Fix:** exclude lines with `lineKind !== 'item'` from the unmatched count. Do not use `abs()` for discounts.

### C16 — Fractions of counted units are accepted as buying amounts and stored in the pantry
- **Where:**
  - `src/frontend/core.ts:97`: `setPurchaseQuantity` enforces integers only for `'quả'`. The validator in `core.ts:141` is the same.
  - `unit-picker.ts:32`: the input is `step="any"` unless the unit is quả.
- **Input:** 1.5 con Gà ta, 0.3 bó Hành lá.
- **Actual:** both are accepted. After ticking and storing, the pantry holds "Gà ta: 1½ con" and "Hành lá: 0.3 bó". The same input for egg is rejected.
- **Expected:** whole numbers for every `wholeCountUnit`, matching the v1.7.18 whole-count rule.
- **Repro:** `C/p16-fraction-counted-buy.cjs`
- **Fix:** use `wholeCountUnit(INGREDIENTS[id][1])` in `setPurchaseQuantity`, `setBuyingUnits`, the validator and the input `step`.

### C17 — "Bỏ đánh dấu đã nấu" re-creates a used-up lot without its metadata
- **Where:** `src/frontend/core.ts:124` (`undoCook`). A lot removed by `takeFromPantry` comes back with only `id`, `ingredient`, `qty`, `place`, `expiry` and `purchase`.
- **Lost fields:** `checkedAt`, `storedOn`, `boughtOn`, `receiptId`, `forMeal`, `qtyEstimated`.
- **Effects:** the "kiểm tra" prompt comes back, the receipt link is lost, and the reservation is lost.
- **Repro:** `C/p17-undo-cook-fields.cjs`
- **Fix:** store a full clone of the lot in `consumed` (or keep the qty-0 lot until the meal is no longer undoable), and restore it.

### C18 — Sync: the same custom unit added on two devices becomes two units, and the conversion can be ignored
- **Where:**
  - `src/frontend/purchase-units.ts:56–61` (`addCustomUnit`) generates a new id per device.
  - The merge keys on id.
  - `customUnitByName` (`:53`) returns the first match.
- **Input:** device A adds "Túi lưới to ≈ 2000 g". Device B adds "túi lưới to" with no conversion.
- **Actual:** two units remain. B's unit, which has no conversion, sorts first, so `customUnitFactor` returns null and A's conversion is never used.
- **Repro:** `C/p05-sync.cjs`, result `b`.
- **Fix:**
  - Derive the id from the normalized name (`cu-` + slug), or de-duplicate by name after the merge.
  - Prefer the record that has a conversion.

### C19 — Receipt reconciliation calls an item the family already ticked on the list "Dư" (extra)
- **Where:** `src/frontend/receipt-list.ts:90`. `weekNeed` subtracts `week.bought`, so a ticked row has a need of 0.
- **Input:** chicken ticked as bought (500 g) but not yet stored, then the receipt has 500 g chicken.
- **Actual:** the status is "extra". The sheet says "Dư 500 g → cất kho".
  - The pantry total ends up correct, because "Cất đồ" then finds a missing amount of 0.
  - The wording tells the family they over-bought.
- **Expected:** "Đủ" (already ticked).
- **Repro:** `C/p04-receipt-reconcile.cjs`, result `a`.
- **Fix:** when the receipt covers an amount that was already ticked, report it as covered and not as extra.

### C20 — Editing a pack lot's weight keeps the "ước tính" note
- **Where:** `src/frontend/unit-picker.ts:49`. The unit-stock-form sets `lot.qty` but never clears `qtyEstimated`. `pantryBuyingNote` (`purchase-units.ts:37`) checks `qtyEstimated` first.
- **Actual:** after the family weighs the bag and enters "Tổng lượng 350 g", the note still reads "≈ 350 g · ước tính đủ cho các bữa đã lên lịch".
- **Fix:** `delete lot.qtyEstimated` when the family enters a total.
- **Verified (code).**

## Low

### C21 — `roundNeed` rounds every non-g/ml unit up to a whole number
- **Where:** `src/frontend/core.ts:26–27`. The units affected include spoons, chén, lát and tép.
- **Effect:** 0.3 muỗng cà phê becomes 1 muỗng, and 1¼ muỗng becomes 2. This contradicts `fmtCount`'s fractions for muỗng (v1.7.5).
- **Fix:** this is a product decision. Keep whole numbers for bought units (con, quả, bó, gói…) and allow ¼ steps for measuring units (muỗng, chén).
- **Verified (code).**

### C22 — Validator gaps that can crash or mislead
- `validImport` accepts `recipe.tags` as a string, and `recipeCuisine` (`core.ts:113`) then throws `join is not a function`.
- It accepts pantry `expiry: 'soon'`, which `stock()` counts as usable.
- Neither is produced by the app today. Older or imported data could contain them.
- **Repro:** `C/p11-validator-gaps.cjs`
- **Fix:** validate `tags` as an array of strings, and `expiry` as `''` or an ISO date.

### C23 — Shopping extras without a currency are left out of VND totals
- **Where:** `src/frontend/family-features.ts:24` and `shopping-planning.ts:29` (notes import) push extras without `currency`. `renderShopping` (`app.ts:66`) treats a missing currency as AUD.
- **Effect:** for a VND family, imported extras with a known price are not added to the total.
- **Verified (code).** The impact was not reproduced in the browser.

### C24 — A receipt amount above 1e6 in base units makes the state invalid
- **Where:** `src/frontend/family-features.ts:19` stores `quantity = canonicalQuantity(qty,'kg')`. The receipt amount field allows up to 1,000,000, but the base-unit limit is 1e6 g, so 1500 kg (1.5e6 g) is rejected by `validSpending` (`spending-core.ts:15`).
- The values involved are unrealistic, but the result would be the recovery screen.
- **Fix:** validate the quantity in base units in the form.
- **Verified (code).**

### C25 — The pantry stock form has silent paths
- **Where:** `src/frontend/app.ts:194`.
  - An invalid quantity returns with no message.
  - `step 0.1` allows 2.5 quả trứng.
  - Editing a lot keeps `qtyEstimated`, `forMeal` and `receiptId` (this is acceptable).
- **Verified (code).**

## Suspected (not reproduced)

- **S1 — Cooking ignores pantry reservations.** `takeFromPantry` (`core.ts:123`) ignores `forMeal` reservations. Cooking an earlier meal can use the lot that was kept for a later meal. Only `shopping()` honours reservations (`receipt-list.ts:150–155`).
- **S2 — "Đánh dấu đã mua" on a receipt uses the range on screen.** `saveReceipt` (`family-features.ts:19`) applies it to the date range shown (`shopDates()` / `currentWeek()`), not to the receipt's date. It also overwrites that range's buying amount with the receipt amount.
- **S3 — Hard-coded Sydney time zone in receipt matching.** `receipt-list.ts:88` (`sydDay`) always uses Australia/Sydney, while the household may use Asia/Ho_Chi_Minh (`preferences.timezone`). This can cause off-by-one-day matching near midnight.
- **S4 — Bought ticks are not scoped by date range.** `week.bought` (and `boughtAt`) apply to the whole week, while amounts are scoped by date range (`week.quantities[start/end]`). Ticking "today" and then switching to "Cả tuần" can show rows as bought or not bought inconsistently.

## Checked and found correct

- **Date math** (`p06-dates.cjs`) under Sydney, UTC, São Paulo, Ho Chi Minh, Apia and Lord Howe device time zones:
  - `addDays`, `monday` and `planStartOf` across the DST changes (4 Oct 2026, 4 Apr 2027) and across year ends and leap days.
  - Everything is anchored at noon.
- **Use-by logic:** inclusive of the use-by day, consistent across the pantry, shopping and `stock()`.
- **Units and prices without a conversion stay unknown** (`applyBuyingUnits`: `qty` null, `costKnown` false). Family recipe lines without an amount are kept as `missingIngredients`, never invented.
- **Weekly spending boundaries** follow the menu week (`receiptsInWeek`). There is no monthly aggregation in the app.
