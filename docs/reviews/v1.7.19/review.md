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
| Receipt line unit (`family-features.ts`, `receiptLineRows` `.receipt-unit`; read by `receipt-list-ui.ts`, `receipt-match-ui.ts`, `receipt-match-picker.ts`) | Close (unit of a bought line) | **Not changed — question for Henry.** The value goes into pantry amounts and price maths, which only understand g, kg, ml, l, quả and the buying units. A family unit has no path there, so converting it changes what a receipt puts into the pantry. |
| Notes import (“Nhập danh sách ghi chú”, `family-features.ts` `.note-unit` → `shopping-planning.ts`) | Close (writes buying-unit records) | **Not changed — question for Henry.** Same reason as receipts: it writes buying-unit records and pantry amounts without the conversion step the Đi chợ sheet asks for. |
| Receipt list “1 X = ? …” question (`receipt-list-ui.ts`, `.rl-per-unit`) | No | Not changed: it asks what one pack weighs in g / ml / quả (a conversion), not the item's unit. |
| Price Scout pack unit and basis (`price-scout-ui.ts`, `scout-pack-unit`, `scout-basis`) | No | Not changed: pack size of a store product (g, kg, mL, L, each, wash, roll, sheet) and the “per kg / per 100 g” price basis used to compare prices. A family unit has no pack size. |
| Voice recipe preview (`voice-recipe.ts`, `.vr-ing-unit`) | Close | **Not changed — question for Henry.** It is the check of what was heard (typed text with suggestions, read back by the dictation parser). The rows then open in Viết món, where the shared picker is used. |
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
- A bought extra is not merged into a matching planned ingredient row on the list. It goes into the pantry as its own lot, and the pantry adds lots together. Merging the two rows on the list would change how the list is worked out, so it is left for Henry to decide.
- Recipes with a yield and guests are not part of these flows (extras and units), so they were not varied here.

## Audit fixes — language, Sydney time and money (W4)
This section was merged with the release branch at a27f771 (YY's extras and unit-picker work, and W2's fixes). The literal scan and the EN sweep were re-run on the merged code.

Audit of 12 Nov 2026 (Sydney time), findings D11–D21 and B13, B17, B19–B22. Branch `agent-w4/fixes`. **Privacy / data change: none.** What is sent off the device is unchanged. The errand push body is untouched; only the text the family shares or copies follows the app language. `dist/privacy.html`, `dist/feedback-privacy.html` and the ladybug filing are not touched.

**Test:** `test:v1719-language:browser` (`src/tests/v1719-language-browser.test.cts`, added to `test:all`). It covers the following:
- EN sweep of every screen and of every reachable sheet the audit named.
- A check of every hard-coded sheet title, error, placeholder and accessible label in the code (115 literals).
- Share text in EN and VI.
- VI developer words.
- Sydney time on `Asia/Ho_Chi_Minh` and `America/New_York` devices, with the clock fixed at 12:00 Sydney.
- VND in global search.
- Accent-insensitive search.
- `validImport` round trip.

Before the fixes, the first run of this suite listed more than 600 problems. It now passes. Screenshots are in `language-time-money/`: EN pantry edit, where to buy and stores, at 320×740, 375×812, 820×1100 and 1280×800, light and dark. This is Chromium viewport simulation, not physical phones.

| Finding | What changed | Test |
|---|---|---|
| D12 (Henry) | Pantry edit sheet: "Edit pantry food", "Delete this batch"; the buying-unit lot sheet is translated too (`unit-picker.ts`) | EN sheet sweep |
| D11, B22 | Stores, add/edit store, "Where to buy X?" for items and extras: every title, label, placeholder and button in English; dynamic titles use `uiText` with the English ingredient name | EN sheet sweep |
| D13 | Shopping rows: "Used in N meals · Your amount · Less than the recipes need"; "Bought/Remove X" labels; the family's purchase note is marked as family content | EN screen sweep, with a custom amount seeded |
| D14 (language part) | `textShopping` and the family week share are in the app's language (English day and dish names; family dishes and notes stay as written). The errand share and copy use `requestShareText`. The emoji lines keep their structure for W5. | EN/VI share check |
| D15 | All 95 literals have English (dictionary block in `language.ts`, plus `uiText` where names are built in); the suite now scans every `modal(` title, `throw Error(` message, placeholder and aria-label in the code | literal check |
| D16 | "Gợi ý thực đơn khác" replaces "/ Generate mới"; "hóa đơn" replaces "receipt"; the CSV sheet explains each column name in Vietnamese | VI sheet check |
| D17 | Errand result sheets: "Đã lưu yêu cầu, nhưng chưa gửi được thông báo tới điện thoại người nhận" (+ EN) | literal check |
| D18 | Studio → Góp ý says "kho lỗi của nhóm làm app" / "the app team's issue list" and "cài đặt máy chủ". Only the wording changed; nothing sent changes. | source check |
| D16 (start-up page) | Decided by the lead on 12 Nov 2026. The start-up failure page uses the saved language. It shows “VI / EN” only when no language is saved yet, or only a guessed one. | `startup.test`: a new saved-language case for EN and VI; the existing “Thử lại / Retry” check for the no-language case still holds |
| D19, D20, D21, B21 | One helper, `appTimeLabel` / `sydneyParts` / `sydneyHour` (`core.ts`), in the family's zone (Sydney by default, the same zone as `sydneyDate`). It is used by the sync-conflict sheet, So Giá "Updated", receipt tick/capture/created times, extension last seen, trusted-device expiry, ladybug times, the voice check, the greeting's default hour and the automatic dark theme. Studio sign-up labels, capture times and "Computed" are in Sydney time with "giờ Sydney". | TZ check + source scan for device-zone formatting |
| B13 | Global search receipts, receipt matching and receipt quality use `aud(n, currency)`. VND shows "125.000 ₫". Receipt matching keeps a discount's minus sign. | VND check |
| B17 | `searchHit` (same `normalizeText` as global search) for the meal picker, the recipe list and the weekend soup search | accent check |
| B19 | The guest total no longer switches to a decimal comma; portions use one style | source check |
| B20 | The dry place is "Pantry shelf" everywhere (dictionary and global search) | pantry places check |

**Not fixed, and why**
- **Legacy sheets that cannot be opened in family mode:** week advice, day suggestion, the weekend soup picker, the old meal editor and the old recipe form. Their titles, labels and messages are translated. Their long body text is not, because no screen opens them any more (checked in the browser: no control for them on any screen). The code is kept.
- **Usage statistics' hour buckets (`usage-analytics.ts`):** these use the device hour. That is stored and sent data, so it is left alone under the no-data-change rule.
- **So Giá / voice price amounts:** these stay in AUD on purpose, because they are Australian supermarket prices.
- **Week-start uses near the greeting (`monday(date)`):** these belong to the week-start group (W2/W3).
- **B19 amount precision:** the precision in `pantryBuyingDisplay` and the "suất" / "suất chuẩn" wording are left to the amounts and maths group.

## Audit fixes — owner rules polish (rules 8, 19–27) and small UI items

Branch `agent-w5/fixes`, 12 Nov 2026 (Sydney time). New suite `test:owner-rules:browser` (`src/tests/owner-rules-browser.test.cts`, in `test:all`): it opens all 8 screens (with every disclosure closed and then open), taps every non-destructive control on each screen, opens 22 more sheets from the app's functions and every account-menu item, in VI and EN at 320×740 and 375×812, and checks each screen and sheet. On the base commit it reported 751 problems; on this branch the only one left is the extras × (see below). Screens are also captured at 820×1100 and 1280×800, and in light and dark mode. Screenshots are in `docs/reviews/v1.7.19/owner-rules/`. This is Chromium viewport simulation, not a physical phone.

| Finding | What changed | Test |
|---|---|---|
| D1 | The shared and copied shopping list no longer has 🧺🥩🥬🧂🛍️🏪. Only the emoji characters were removed; the wording is left for W4. | owner-rules: shared `textShopping` has no emoji |
| D2 | The “Nhờ mua thêm” push and share text now uses words: “Ở:”, “Ghi chú:”. | owner-rules: `requestText` |
| D3 | The legacy `textWeek` and `share-day` text no longer has 🍲 ☀ ☾. | owner-rules: `textWeek` |
| A27 | “Giữ bữa” / “Đã giữ bữa” and its toast are words only. | owner-rules: tap “Giữ bữa” |
| D4, D5 | Chips, tabs and `<summary>` are words only. `emoji-art` now drops an app emoji inside `.chip`, `[role=tab]` and `summary` instead of drawing it; family text is untouched. The inline drawings were removed from “Lọc”, “Cộng đồng”, “Nhắn khẩn”, “Dán danh sách nguyên liệu” and the ⚡ time chip. The simple-view headings keep their source text because they are W4 dictionary keys; the runtime rule removes the emoji. | owner-rules: no drawing on a chip, tab or disclosure |
| D6 | These icon-only buttons now get drawings through explicit `BTN_BY_DATA` markers: month ‹ ›, “Chọn cả nhà” ✓, reasons ✕, old recipe-row ×, receipt line ×, price ×, So Giá tray ×, voice-recipe row ×, sync and notice dismiss ×. ✕, ↻ and ⟳ were added to the symbols that get removed next to a drawing. | owner-rules: icon-only buttons have a drawing |
| D7, B15 | These main buttons now have drawings: “Bắt đầu kiểm tra” (mic), “Xác nhận” (tick), “Xem trước” / “Xem trước, chưa nhập” (search), “Bỏ khỏi giỏ” (skip, now a main action), “Kiểm tra & lưu khoản chi” (tick), and the CSV “Kiểm tra & xem trước” (now `.primary`). | owner-rules: main buttons have a drawing, including footers |
| D8 | ↻ was removed from “Đổi gợi ý khác” (both buttons) and from So Giá “Đọc lại”. | owner-rules: no text symbol next to a drawing |
| D9, B15 | Sheet footer buttons can now declare their role with `data-sheet-role="save\|close\|cancel\|none"`; button text is only the fallback (`app.ts` `sheetButtonKind`). My kitchen has one footer “Lưu” that saves portions and menu together, keeping what was typed even when the first save closes the sheet. Currency & prices has a footer “Lưu giá”. The “how the family likes this dish” setting and the family reminder times now save as soon as they change, so there is no Lưu in the sheet body and no redraw. | owner-rules: no Lưu/Đóng in the body; footer pills drawn, side by side, same size; saves both forms |
| D10 | While a sheet with a floating footer is open, the toast shows at the top of the screen. | owner-rules: the toast does not cover the footer |
| D22–D24 | Tap targets are now at least 44 px: the dish ×, the top-bar bell and the language toggle (the globe is hidden at ≤ 340 px so the bar still fits 320 px), chips, tabs, text buttons, the store pill, dish links, selects and inputs, pack-schedule cells (the table scrolls), the old recipe amount field, and the day strip (it scrolls sideways at 320 px). | owner-rules: targets ≥ 44 px at 320 and 375 |
| A17 | “Báo khẩn” on a device-only install opens the family connection with a line explaining that urgent messages go to the family's phones, so the family must be connected first. | owner-rules |
| A18 | “Kết nối gia đình” / “Đồng bộ gia đình” (`accountsModal`) open a sheet titled “Kết nối gia đình / Family connection” that holds only that card. My kitchen keeps its title. | owner-rules |
| A26 | “Nhập món từ link” shows “Cần tài khoản gia đình…” under the button on a device-only install. | owner-rules |
| B9 (part) | Adds one shared list of store names: the family's stores first, then Coles, Woolworths, ALDI, Harris Farm, IGA and Costco (`storeChoiceNames()` in `insights-core.ts`). The receipt store field offers it as choices and is still free text. | owner-rules |
| B16 (part) | Adds one in-app confirmation sheet (`confirmAsk`) with a drawn main button. It replaces the browser `confirm()` for deleting a price. | owner-rules |
| B18 | Any ingredient `<select>` with more than 15 ingredients gets the same search box. Search ignores accents (“tom” finds “Tôm”) and picks the first match. The saved value is unchanged. This covers pantry, barcode, price, So Giá and the add-extra form. | owner-rules: search box picks the match |

**Not fixed, and why**
- **Extras × (D6/D22):** agent YY owns it and has already given it a drawing and a 44 px target. The owner-rules suite still reports it on this branch alone, and should pass once YY's branch is merged.
- **B9 (rest):** adding ALDI and Harris Farm to the products page `RETAILERS` changes the validator (`insights-core.ts:39`, W2's area). A device on an older version would then reject synced data. This needs coordination with W2 and a sync-compatibility check. The optimiser, voice and receipt-parser lists are internal and were left as they are.
- **B16 (rest):** the Xóa/Xoá and Hủy/Huỷ spelling is unchanged. In non-Studio code the counts are Xóa 29 vs Xoá 38, and Hủy 19 vs Huỷ 18. Many of these strings are W4's translation keys, so changing them now would break the English lookups during the merge. The same applies to the native `confirm()` calls that remain: removing a meal is W3's area, and clearing a transcript happens inside a sheet, where a second sheet cannot be opened.
- **B18:** the hard-coded “58 nguyên liệu” label is in the add-extra form (YY).
- **Not changed:** Studio (owner-only) still has ✕, ✓ and ↻ text buttons. `community-prices.mts` keeps its badge-icon emoji; they are data and are drawn in the app.
