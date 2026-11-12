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
