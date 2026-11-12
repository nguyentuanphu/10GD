# v1.7.19: a reply notification opens “Góp ý của tôi”; privacy rule 28

All times are in Sydney time. **Not approved for deploy.** Nothing is merged into main or built on hosting until Henry says DEPLOY.

## Owner decisions, 12 Nov 2026 (pop-up)
- **Privacy section 7a** (receipt text sent to improve reading, added in v1.7.18): **kept as it is.** Henry was not asked before it went live. That was the agent's mistake, and it led to the new rule 28.
- **Reply to a family's feedback:** tapping the notification opens the ladybug straight on **“Góp ý của tôi”**.

## 1. AGENTS.md rule 28: privacy changes need Henry first
These changes need Henry's answer, given through the pop-up, before they go on any release branch:
- the privacy policy;
- the terms;
- what personal or family data the app collects, sends, stores or shares.

The question must show him the exact VI and EN wording and the data change. Approving a feature does not approve its privacy text. Every release report must name each privacy or data change in plain words.

## 2. A reply notification opens “Góp ý của tôi”
**Before:** Studio replies to a report, and the person who sent it gets “Có trả lời góp ý của bạn — Chạm con bọ rùa → Góp ý của tôi.” Tapping it opened Hôm nay only, so they had to find the ladybug and the tab themselves.

**Now:**
- The notification links to `/#today?lb=mine`.
- The text reads “Chạm để đọc câu trả lời.” / “Tap to read the reply.” (rule 26).
- **Server (`push.mts`), service worker (`sw.ts`) and the in-app push handler (`household-ui.ts`):** these accept that one extra link. Any other unknown link is still not passed on.
- **App (`ladybug.ts`):** the app opens on Hôm nay, puts back a plain `#today`, and opens the ladybug on “Góp ý của tôi”. This works when the app was closed and when it is already open.
- If the ladybug is not shown for this person, only Hôm nay opens.

**Data:** none. No new data is collected, sent or stored, and the privacy text is unchanged.

**Tests:**
- `notifications.test` (in `npm test`) checks:
  - the reply link and its wording in VI and EN;
  - that other unknown links are not passed on.
- `test:ladybug:browser` checks:
  - from a closed app, the link opens the sheet with “Góp ý của tôi” selected and leaves `#today`;
  - the same with the app already open;
  - nothing opens for someone the ladybug is hidden from.

**Local results** (12 Nov 2026, Sydney time): check, typecheck, `npm test`, `test:ladybug:browser` and `test:offline:browser` all OK.

## 3. Evidence: the buying-unit sheet on the live site
Henry asked on 12 Nov 2026 why he could not see the new unit sheet. These screenshots were taken on the live 10gd.netlify.app (v1.7.18) at 390×844 in Chromium, with test data in device-only mode. They show where the sheet is:
- `unit-picker-prod/1-di-cho-nut-luong-mua.png`: the quantity button on Đi chợ.
- `2-bang-chon-don-vi.png`: suggestions shown straight away.
- `3-xem-tat-ca-don-vi.png`: “Xem tất cả đơn vị”.
- `4-them-don-vi-rieng.png`: “Tự thêm đơn vị”, with the optional conversion.

These are not screenshots from a physical phone.

## Audit fixes — amounts, validators, sync

Branch `agent-w2/fixes` (from 016f9ed), 12 Nov 2026 (Sydney time). Findings from `docs/reviews/audit-20261112/` (B- and C-findings). Every new test failed on the old code (checked against a build of 016f9ed) and passes now. No privacy or data-handling change: nothing new leaves the device.

| Finding | What changed | Test |
|---|---|---|
| C1, B3, B4, C7 | One per-dish formula in `core.ts` (`addDishIngredients`): portions (lunch-box dishes use the packers), `portionFactor`, recipe `yield` (4 when none), whole numbers for counted units. `mealIngredients` and `dishNeeds` (cook ahead) both use it; the family-menu override that skipped rounding and re-added cooked-ahead dishes is removed; `batchIngredients` rounds too. A rooster is 1 con on the list, when cooking and in the pantry. | `audit-data-fixes` (C1 ×4 settings, B3, B4/C7, lunch box); `audit-data-browser` (C1 VI/EN) |
| C4 | Validators (`core.ts`, `family-menu-core.ts`) accept meal servings up to `MEAL_SERVINGS_MAX` = 486 (12 members × 3 + 10 guest groups × 45), the most the app can store. Cooked portions are not clamped (that would rewrite the record). | `audit-data-fixes` C4 ×4 settings, with merge |
| C5 | Receipt currency may be any ISO code (`/^[A-Z]{3}$/`); the budget currency stays AUD/VND. GBP/EUR receipts still do not count in AUD/VND spending (different money). | C5 |
| C24 | Receipt line quantity limit 1e9 base units (what the form can enter: 1,000,000 kg). | C24 |
| C22 | `recipe.tags` must be an array of strings; pantry `expiry` must be `''` or a date. | C22 |
| C6 | `openReceipt`: a stored empty unit stays “Chưa rõ”; the recipe unit only when a base quantity was stored. | `audit-data-browser` C6 VI/EN |
| C10 | `takeFromPantry`: a pack lot without a factor shrinks its count in step with the estimate and leaves the pantry when used up; undo restores the count. | C10 |
| C11 | Receipt plan: a list row bought as a pack without a weight is covered by the weighed receipt line (“Đủ”), the row is ticked and the receipt amount goes to the pantry; `storeShoppingPurchases` skips rows already received by a receipt in the same range. Undo removes both. | C11 |
| C19 | Receipt plan: an amount already ticked on the list is “Đủ” (`ticked`), not “Dư”; nothing is stored twice. | C19 (week starts Mon/Sat/Sun) |
| C9 | Sync merge: when both devices changed a pantry lot only by cooking, the lot is recomputed from the merged cooked-meal records; a hand edit still merges by last writer. | C9 |
| C18 | Family unit id comes from its normalised name; the merge folds duplicates by name, keeping the conversion; lookup prefers the copy with a conversion. | C18 |
| C12 | `priceFor` returns null (not 0) for an unpriced built-in; buying sheet, meal editor and planning dish costs show “Chưa rõ giá” / “Price unknown” (`mealCostText`). | C12 AUD/VND; browser |
| C15 | Discount/adjustment lines (`lineKind` not item) are not counted as “chưa đối ứng” (total and receipt card). | browser C15 |
| C16 | `setPurchaseQuantity` and `setBuyingUnits` refuse fractions of counted units; the buying sheet input steps by 1 for them. | C16; browser |
| C17 | A used-up lot's details (checkedAt, storedOn, boughtOn, receiptId, forMeal, qtyEstimated) are kept on the meal record and restored by “Bỏ đánh dấu đã nấu”. | C17 |
| C20 | Entering or clearing a pack's total weight removes `qtyEstimated`. | browser C20 |
| C21 | `roundNeed` uses the unit registry: g/ml to 0.1, kg/l/lạng exact (0.001), spoons/chén up to ¼, counted units whole. | C21 |
| C23 | Extras added by notes import carry the family currency (and `costUnknown` when unpriced). Verified by code; the notes-import form has no browser check in this suite. | — |

Existing tests changed to the correct behaviour: `units-catalog` (a pack used by cooking now shrinks, and undo restores it — C10) and `pack-schedule` (packers' 1.15 eggs is bought as 2 — C1).

**Not changed (and why):** stored-data validators for `week.quantities` stay as before (only `quả` must be whole) so older states with fractional counted amounts still load; the whole-number rule is enforced where the app writes. The notes-import/receipt “mark bought” paths may now refuse a fractional pack amount with a message. C8 (receipt undo with a non-Monday week) belongs to the weeks area. Out of scope: the meal editor's other words are not translated to EN (wording area).

**Evidence:** `docs/reviews/v1.7.19/amounts-validators-sync/` — expenses, buying sheet and meal editor at 320×740, 375×812, 820×1100, 1280×800, light and dark (Chromium viewport simulation, not physical devices). Device time zones tested: Australia/Sydney and Asia/Ho_Chi_Minh.

New suites: `tests/audit-data-fixes.test.cjs` (in `npm test`), `npm run test:audit-data:browser` (in `test:all`).

## 4. Unit choice in Viết món and related places (rule 29)
**Owner decision** (Henry, 12 Nov 2026, Sydney time, pop-up): “Làm, gộp vào v1.7.19”. Rule 29: every place that does the same job changes in the same release. Henry also reported (12 Nov 2026, 16:19 Sydney time, phone screenshot) that the extra item “Gà trống” on Đi chợ › “Đồ dùng khác” showed “1 g” and that tapping it did nothing.

### Inventory: every place where a unit is picked or typed
| Place (code) | Same job as the buying-unit sheet? | This release |
|---|---|---|
| Đi chợ buying-unit sheet (`unit-picker.ts`, `openPurchasePicker`) | Source of the picker | Unchanged for the family. Its markup, search, keyboard and “keep the tapped control still” code is now shared; `test:unit-picker:browser` and `test:units:browser` pass unchanged. |
| Viết món ingredient rows (`recipe-community.ts`, `rcRowMarkup`) | Yes: unit of a recipe ingredient | **Changed.** The plain list is replaced by a unit button that opens the shared picker. |
| Family recipe editor (`family-menu-ui.ts`, `familyRecipeEditor`) | Yes, same form | **Changed** through the Viết món rows, which write its ingredient box. No other unit control in that editor. |
| Đi chợ “+ Mua thêm” extra item (`app.ts`, `add-extra`) | Yes: unit of an item to buy | **Changed.** Shared picker; no unit until one is picked (it silently saved “g” before). |
| Đi chợ extra item edit (`app.ts`, new `edit-extra`) | Yes | **New** (Henry, 12 Nov). Tap the name or the amount to open an edit sheet with the same fields. |
| “Chọn nhanh” in the add form (`shopping-planning.ts`, `extra-catalog-ing`) | Fills the same unit | **Changed** to fill the picker's field, with no invented amount (audit C3). |
| “Nhờ mua thêm” request (`push-ui.ts`, `errand-form`) | Yes: adds the same extra item | **Changed** (audit A5). Same amount + unit picker and the same extra record as “Mua thêm”; it had a free-text “Số lượng / cách mua”. |
| Ladybug self-test “Giấy bếp (thử)” (`ladybug-workflows.ts`) | Uses the add form | **Changed** to set the new field (cuộn). |
| Pantry add / edit (`app.ts`, `stockForm`; `unit-picker.ts`, `unit-stock-form`) | No unit is picked | **Not changed.** The amount is typed in the ingredient's own unit, shown as text. A lot bought in a buying unit keeps that unit from the purchase. Adding a unit choice would change how pantry amounts are stored, which is a data change for Henry to decide. |
| Receipt line unit (`family-features.ts`, `receiptLineRows` `.receipt-unit`; read by `receipt-list-ui.ts`, `receipt-match-ui.ts`, `receipt-match-picker.ts`) | Yes | **Changed** (Henry, 12 Nov: “Đổi cả 3 chỗ”). Shared picker with suggestions for the matched ingredient; “gói / hộp chưa rõ lượng” kept as its own choice. A family unit with a conversion is counted through it (`receipt-list.ts` `baseQuantity`). A unit without one becomes a bought lot in that unit (“Chưa quy đổi được · giữ theo 1 túi”), never grams. |
| Notes import (“Nhập danh sách ghi chú”, `family-features.ts` `.note-unit` → `shopping-planning.ts`) | Yes | **Changed** (“Đổi cả 3 chỗ”). Shared picker per row. A family unit's conversion, or a fixed one such as chục = 10 quả, is used as the buying-unit conversion; otherwise it stays unknown. |
| Receipt list “1 X = ? …” question (`receipt-list-ui.ts`, `.rl-per-unit`) | No | Not changed: it asks what one pack weighs in g / ml / quả (a conversion), not the item's unit. |
| Price Scout pack unit and basis (`price-scout-ui.ts`, `scout-pack-unit`, `scout-basis`) | No | Not changed: pack size of a store product (g, kg, mL, L, each, wash, roll, sheet) and the “per kg / per 100 g” price basis used to compare prices. A family unit has no pack size. |
| Voice recipe preview (`voice-recipe.ts`, `.vr-ing-unit`) | Yes | **Changed** (“Đổi cả 3 chỗ”). Shared picker with the recipe units group; the heard unit stays as written until the family changes it. |
| New ingredient from a receipt (`receipt-match-picker.ts`, `FAMILY_UNITS`) | No | Not changed: it sets the counting unit of a new family ingredient, limited to the units the recipe maths can count. |
| Voice “add to list”, products “add to list”, scan amount (`personal-core.ts`, `products-ui.ts`, `kitchen-extras.ts`) | No control | Not changed: the unit comes from speech, the product's pack size or the ingredient; nothing is picked. |

### What changed
- **One picker** (`unit-picker.ts`): `openUnitSheet` opens the v1.7.18 picker as a second sheet on top of the form that asked for it. The form, its scroll position and the focused field stay. It has:
  - suggestions for the matched ingredient (catalogue or family ingredient), with its own unit first (a rooster counted in con suggests con first), or sensible defaults when the name matches nothing;
  - “Xem tất cả đơn vị (N)” with groups and search;
  - “Tự thêm đơn vị”, saved in `state.customUnits` exactly as on Đi chợ (optional conversion);
  - the family's units, with “Ẩn khỏi gợi ý”;
  - X, Đóng and Lưu pills with their drawings (rule 25). Escape and X close only the picker.
- **Viết món:** each row's unit is a button that opens the picker. The recipe units (tép, củ, nhánh, lát, khoanh, cây, nắm, con, đòn, muỗng canh, muỗng cà phê, chén, hộp, lon, chai, vỉ, khay, túi) are their own group, “Đơn vị hay ghi trong công thức”. The amount stays a typed field; “Cộng vào đi chợ” and every other row behaviour are unchanged. The row keeps the exact text chosen; a unit no list knows (“muỗng súp”) shows and saves as written. Closing the picker returns focus to the row's unit, and the editor does not move (rule 24).
- **Extra items:** the add form has no unit until one is picked. A name that matches an ingredient fills in that ingredient's unit; otherwise “Thêm” shows “Chọn đơn vị trước khi lưu” beside the field and adds nothing. Tapping an item's name or amount opens “Sửa đồ cần mua” with name, amount + unit (shared picker), expected cost and store. “Lưu” saves in place, keeping the id, the bought tick and the store memory. The × delete is unchanged.

### Data implications
- **No new data and no privacy change.** No new field is stored or sent.
- `state.customUnits` (already family-wide since v1.7.18) can now also get a unit made from Viết món or an extra item. The record is the same. `ingredient` is set only when the name matched one.
- Recipes: the saved line is built exactly as before from the row's text. Units outside the counted list stay “kept as written, not added to shopping”, as with units typed before. Nothing is converted or rewritten.
- Extra items: editing changes only stored fields — name, amount text, cost, currency and store. Saving without changing the amount or unit keeps the stored text exactly (“1 g” stays “1 g” until the family changes it). When the name is changed, an older English copy of the name (`nameEn`, from voice) is dropped so it cannot show the old name. A store that has since been removed stays on the item.
- Existing extras and recipes are not changed by this release until the family edits them.

### Tests and screenshots
- New `test:recipe-units:browser` (added to `test:all`), at 320×740, 375×812, 820×1100 and 1280×800 in VI light and EN dark:
  - **Viết món:** opening from a row; con first; “Xem tất cả” with the recipe units group and search; choosing muỗng canh; an old unknown unit kept; Escape / X change nothing; “Tự thêm đơn vị” saved in `customUnits`; the recipe saved and reopened with the units as written.
  - **Extras:** no unit until picked, with the inline message; a matched name gets con; picking cuộn; editing from the name and from the amount; “Lưu” without changes keeps “1 g”; changing to con keeps id, tick and store; × still there.
  - **Every check:** tapped controls and the page stay still (rule 24); pills with drawings side by side (rule 25); chips and secondary buttons words only (rule 27); no emoji; ≥ 44 px targets; no sideways overflow.
- Updated to use the picker instead of the old list: `recipe-ingredients`, `recipe-community`, `v175-feedback` and `journey` (Viết món rows); `v176-fixes` (extra item unit). Each test still checks the same outcome.
- Screenshots: `recipe-units/` — `recipe-suggest-*`, `recipe-all-units-*`, `recipe-custom-unit-*`, `recipe-row-chosen-*`, `extra-edit-*`, `extra-edit-con-*`, `extra-needs-unit-*`, at the sizes above.
- **Limits:** Chromium viewport simulation with QA data in device-only mode. These are not physical phones, tablets or iOS Safari.

## Audit fixes — extras and units
Audit of 12 Nov 2026 (`docs/reviews/audit-20261112/`), findings about extra items (“Mua thêm”, “Đồ dùng khác”, “Nhờ mua thêm”) and the Viết món unit. Henry chose to fix every finding in v1.7.19 with no privacy change.

| Finding | What changed | Test |
|---|---|---|
| A2 / B7 | Tap an extra's name or amount → “Sửa đồ cần mua” (name, amount + unit, price, store); saved in place, keeping id, tick, store, errand link. | `recipe-units` |
| A3 / C3 | No unit until one is chosen or the name matches an ingredient (con for a rooster, ml for a sauce); quick pick no longer invents “2” / “500”. | `recipe-units`, `extras-audit` |
| A4 / C13 | The price starts empty and is optional; empty is saved as unknown (“Chưa rõ giá”, “≥” on the total). Notes import now marks an unknown price unknown instead of a known 0. | `extras-audit` |
| A5 | “Nhờ mua thêm” uses the same amount + unit fields and builds the same extra record as “Mua thêm” (shared code in `app.ts`: `EXTRA_FORMS`, `extraRecordFields`). It also added the request to the Monday week; it now goes into the family's own plan week. | `extras-audit` (week starting Saturday) |
| A6 / B5 | × asks “Bỏ … khỏi giỏ?” (Giữ lại first, pills), then “Hoàn tác” puts the item back at the same place. The × has the same drawing as a planned row's × and a 44 px target. | `extras-audit` |
| A8 | Shopping mode counts extras in “còn … món” and does not say “Đã mua đủ” while one is unticked; “Đi chợ xong” offers to put away ticked extras too. | `extras-audit` |
| A9 / B6 | New extras keep `ingredient` (when chosen or matched), `amount` and `unit` as data next to the text. “Cất đồ đã mua vào tủ” includes ticked extras that are ingredients. Old text-only extras are read (name match + “2 l”), never rewritten. A unit that converts (l → ml, kg → g) adds that amount. Any other unit (“2 gói”) is stored as a bought lot with no invented weight. Non-ingredients are named as not put away. Each extra is put away once (`storedOn`). | `extras-audit` |
| A10 | With nothing to put away, the aside link is disabled and says why. The toolbar button and the link appear for ticked extras too. | `extras-audit` |
| A11 | “Chọn nhanh từ danh sách nguyên liệu (tùy chọn)”: no hard-coded 58. | `extras-audit` |
| A12 | The skip sheet names the button as it reads on screen (“Đồ trong tủ” …). | `extras-audit` |
| B8 | An extra's “Mua … ở đâu?” sheet matches an ingredient's: chips, store list with “Chưa chọn” to clear, a note for this purchase, “Luôn nhớ …” choice, Thêm cửa hàng / Lưu nơi mua footer, VI / EN. | `extras-audit` |
| C2 | Picking a catalogue suggestion in Viết món keeps the unit the family chose; it fills the unit only when the row had none. | `extras-audit` |

**Data (internal, not privacy):**
- New fields on extra items: `ingredient`, `amount`, `unit`, `storedOn` and `storeNote`.
- Pantry lots can now come from extras.
- “Mua thêm” saves an empty price as `costUnknown`.
- Nothing new is sent off the device. Privacy pages are unchanged.
- Old states load unchanged; `extras-audit` ends each run with `validImport` and a sync-merge round trip.

**Tests:**
- New `test:extras-audit:browser` (in `test:all`): 320×740, 375×812, 820×1100, 1280×800, VI light / EN dark.
- EN runs use VND and a phone in Los Angeles time. Every run uses a week starting on Saturday.
- Screenshots in `docs/reviews/v1.7.19/extras/`.

**Limits and not fixed:**
- Chromium viewport simulation, not physical devices.
- (Decided by Henry later the same day; see the next section.)
- Recipes with a yield and guests are not part of these flows (extras and units), so they were not varied here.

## Henry's answers, 12 Nov 2026 (Sydney time): the last unit places, and bought extras on the list
**1. “Đổi cả 3 chỗ”.** The receipt line unit, the notes-import unit and the voice recipe preview use the shared unit picker (see the §4 inventory).
- A family unit **with** a conversion goes into the pantry through it. Example: 2 “túi QA” (1 túi ≈ 500 ml) become 1000 ml.
- A unit **without** one is kept as a bought lot in that unit. Example: “1 túi” of a rooster has no grams; the receipt sheet says “Chưa quy đổi được · giữ theo 1 túi”.
- Only “gói / hộp chưa rõ lượng” still asks for the amount.

**2. “Như recommend, nhưng nếu user cố tình mua dư thì hỏi để cất vào pantry”.**
- A ticked extra of an ingredient that is also on the menu list counts towards that row (`extraCoverPlan`):
  - when it covers the row, the row reads “Đủ — đã mua 1 con ở “Đồ dùng khác””; it counts as bought, and its tick is locked to the extra;
  - otherwise the row says what is still short.
- Nothing is bought or put away twice: “Cất đồ” stores the extra, not the row.
- Ticking an extra that is more than the list needs asks once, “Mua dư Gà trống?”, with two choices: “Không cất phần dư” or “Cất phần dư vào tủ”.
- The put-away sheet shows the split (“1 con cho thực đơn · dư 1 con”) with a “Cất cả phần dư … vào tủ” tick, set from that answer and still changeable.

**Data (internal, not privacy):**
- Extra items may carry `surplus` (`'pantry'` or `'skip'`).
- Receipt lines keep the unit as chosen.
- No new data leaves the device.

**Tests:** new `test:unit-places:browser` (in `test:all`).
- Sizes and looks: 320×740, 375×812, 820×1100 and 1280×800, in VI light and EN dark. Every run uses a week starting on Saturday; the EN runs also use VND and a phone in Los Angeles time.
- Receipt and notes import: the picker opens over the sheet, suggests con first, the family-unit conversion is used, and a no-conversion lot is kept.
- Voice preview: the heard unit is kept until the family picks one in the picker.
- Bought extras on the list: short, then “Đủ”, the surplus question, and the put-away amounts with and without the extra part.
- Every run ends with `validImport` and a sync-merge round trip.
- Updated to drive the picker instead of the old list or text box: `receipt-list`, `v1716` and `v1714` (receipt line unit); `voice-price` (voice preview unit). Each still checks the same result.
- Screenshots: `docs/reviews/v1.7.19/unit-places/`. Chromium viewport simulation, not physical devices.
