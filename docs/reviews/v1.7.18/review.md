# v1.7.18 — whole numbers for counted ingredients on the shopping list

Times are in Sydney time. **Not deploy-approved.** Nothing is merged or built on hosting until Henry says DEPLOY.

## Issue #38 (ladybug, 11 Nov 2026, 16:20)
*“Thiếu mất "con" bên phần định lượng nguyên liệu rồi. Sao bị mất nhiều vậy?”* — route Đi chợ, phone 414×840, build 20261108T231601Z.

**Reproduced on main (v1.7.17):** a family dish with *Gà ta 1 con · Tôm sú 6 con · Mực ống 2 con · Hành lá 1 bó*, planned for tonight's dinner (test family, 3.2 servings against the recipe's 4), put **0.8 con gà, 4.8 con tôm, 1.6 con mực, 0.8 bó hành** on the shopping list.

**Cause:** after scaling a dish to the people eating, only `quả` was rounded up to a whole number (`core.ts` `mealIngredients`, `dishNeeds`, `shopping`). Every other counted unit — con, cái, củ, bó, hộp, gói, chai, lon, túi, tép… — kept the fraction, so the list asked for less than a whole animal, bunch or pack.

**Fix:** a counted unit (anything that is not weighed in g or measured in ml) is bought in whole numbers, **rounded up** so the list never comes up short — the same rule `quả` already had. Weighed and measured ingredients still scale exactly.

After the fix the same dish gives **1 con gà, 5 con tôm, 2 con mực, 1 bó hành**.

Not changed, on purpose:
- The recipe view still shows the exact written amount (owner decision #13 in v1.7.5: “ghi 1/2 hay 0.5 … vẫn là 1” — the recipe shows what was written; the shopping list does the purchase rounding). `recipe-ingredients.test` keeps that check.
- Scaling to the family's servings is unchanged: 6 con tôm for 4 portions still becomes 5 con for 3.2 portions. If the family wants counted items never scaled down, that is a product decision for Henry.
- A family's own typed amount in the “Lượng mua” picker is not rounded.

## Evidence
- `shopping-before-vi-414x840.png` (main) / `shopping-after-vi-414x840.png` (this branch) — Chromium simulation at Henry's reported size; layout unchanged, only the numbers.

## Tests
- New checks in `core.test` (in `npm test`): 1 con stays 1 after scaling to 0.8; 1.1 con buys 2 (always up); weighed units still scale exactly. The first check fails on main.
- Local, 12 Nov 2026: check, typecheck, `npm test`, test:browser, recipe-ingredients, units, catalog, family-calendar, sync-merge, menu-reactions browser suites — all OK. Full `test:all` local run and GitHub CI reported in the PR.

## 3. Costco receipts (owner, 12 Nov 2026, 13:17: “Unable to read this receipt from Costco at all”)
**Cause:** Costco prints each item on two lines — the name, then `item code · 1x · unit price · line price · &`. The reader took the second line as the item ("lx 21.4", "Unknown" unit, no name), lost every product name, and read “TOTAL NUMBER OF ITEMS SOLD” as a total.

**Fix (`receipt-parse.ts`, Costco only):**
- The two lines are joined into one item with its name and price. A line price that OCR clipped (“10.4”) uses the unit price when the quantity is 1; an unreadable price stays empty (never guessed).
- **TPD** instant savings (“TPD PRAWN HARGOW 4.00-”) reduce the item right above them.
- “TOTAL NUMBER OF ITEMS SOLD = 29” is the item count used to check the reading; “Bottom of Basket” / “BOB Count” markers are skipped.
- **REDEEM REWARDS 72.71-** is a reduction of 72.71, not an item.
- A lone digit far right of a name (the clipped price column) is dropped; the word “OIL” is no longer read as “01 L”.

**Result on the owner's photo (the app's own OCR, run locally, photo not kept):** 29 of 29 items with their names, 7 TPD savings on the right items, the reward, 1 line (Strawberries 1.2 kg) whose price OCR could not read left for the family to type. This receipt prints no grand total, so the app still asks for the amount paid.

**Tests:** new `receipt-parse.test` case from that OCR text (membership number blanked). It fails on main and passes here; the 45 earlier receipt cases, `receipt-ocr` and `generic-receipts` browser suites pass.

## 4. HP Meats butcher receipt (owner, 12 Nov 2026, 13:19: “This is the previous one I shared and it still can't read”)
On the phone the app read the 9 items but took **SUB TOTAL $133.77** as the amount paid, and names ended in a speck (“BEEF BALL i”). The local OCR of the full photo also lost PORK MINCE (“$5.71” read as “6571”) and read “-$0.02” rounding as “~$0.02”.

**Causes and fixes (`receipt-parse.ts`):**
- **SUB TOTAL read as TOTAL:** specks before a total word are removed at the start of a line, and that rule also removed the word “SUB”. “SUB” is now kept.
- **Amount paid:** when no TOTAL line was read (the large “TOTAL: $133.75” is often lost), the **CASH** (or card) amount is used as the total paid when it differs from the subtotal by less than 5 cents (cash rounding). A TOTAL that was read is never replaced.
- **Speck letters:** a lone lower-case letter or bar after an all-capitals name is dropped.
- **Rounding “~$0.02”** is a minus.
- **Unreadable price on a weighed line:** when OCR read the price as garbage digits (“6571”), weight × price per kg (0.572 kg × $9.99) gives $5.71, flagged “please check”. When the price column is missing altogether (torn receipt) the price stays empty, as before (owner rule: nothing invented). “$9.989/kg” (a doubled digit) still reads as $9.98–9.99.
- A price that OCR misread by one digit (“$13.95” for $13.35) is **not** changed: it stays as read and the difference with the total is reported, so every kept price is one printed on the receipt.

**Tests:** new `receipt-parse.test` case with the phone's text and the local OCR text (no photo kept): 9 items, total $133.75, difference $0 on the phone text; it fails on main. All 47 receipt cases, `receipt-ocr` and `generic-receipts` browser suites pass.

## 5. Receipt ↔ shopping list (owner, 12 Nov 2026: “Make sure the lượng will reflect where it needs to be even when scanning the receipt …”)
Plan approved by Henry on 12 Nov 2026 (Sydney). Owner default: what was bought beyond the list goes to the pantry, changeable per line.

**What was wrong on the owner's Costco text:** OMO TRIPLE **CAPS** → Ớt chuông (the Coles abbreviation “caps”), APPLE **JUICE** → Táo, PRAWN **HARGOW** → Tôm, S/ONION **PANCAKE** → Hành tây, ICHIBAN **ROAST BEEF** → Thịt bò; “CAGE FREE **30PK**” had no amount; “JONGGA KIMCHI **1.5K**” was not 1.5 kg; OMO / Colgate / Finish were not seen as household goods.

**Matching (`receipt-parse.ts`, new `receipt-list.ts`):**
- Order: the family's memory for this store (code / name) → **this week's shopping list** (ingredients to buy or already ticked, in the receipt's week and the week in view, plus the family's own list lines such as “Kimchi”) → the whole ingredient list → none. Whole words only.
- Ready-made products (juice, dumplings / hargow / gyoza, pancake, roast beef / chicken, deli, cooked, smoked, sauce, spread, dippers, rolls, nuggets, pies, mayo, kimchi, flavoured milk …) are never matched by themselves to the raw ingredient they name; an ingredient that *is* that product (“roast chicken” → Gà chín có sẵn, “fish sauce” → Nước mắm) still matches, a lone generic word (“rolls”) only as a suggestion.
- Household goods (OMO / laundry capsules, Colgate / toothpaste, Finish / rinse aid / dishwasher, cleaners, tissues …) are “Không phải đồ nấu” — spending only.
- Amounts: a pack count is pieces only for an ingredient counted in pieces (30PK eggs → 30 quả, never a weight); “1.5K” at the end of a line is 1.5 kg; no printed size → unknown (never guessed).

**Receipt form — every item line says how sure it is:** “Chắc chắn” (with why: on this week's list / matched before at this store / your choice), “Gợi ý — kiểm tra” or “Chưa ghép”, and a count at the top. A line that is not sure has one-tap choices (words only — secondary buttons, rule 27): **Chọn từ danh sách đi chợ** (nearest name first), **Tìm món khác** (the line's search box), **Thêm món mới vào kho** (a family ingredient named as on the receipt, in the line's unit), **Không phải đồ nấu**, **Để sau**; a suggestion also has **Đúng, giữ gợi ý**. Choices are remembered per store when the receipt is saved (existing `state.aliases`), so the next receipt from that store maps by itself. Only the line's own box redraws; the tapped line stays where it is (rule 24).

**Amount asked once:** a line matched to an ingredient with no printed amount asks for amount + unit (the existing unit list) and, for a bottle / pack, “1 chai ≈ … L” (optional). It is saved in the ingredient's base unit and remembered for this store item in **`state.receiptQty`** (new, family data): `{ "receipt <store> n <name>": {qty, unit, per?, at} }`, at most 600 entries (oldest dropped). It is validated with the spending data (`validSpending`); older states without it stay valid. The server does not validate receipt memory (it never did for `aliases`), so nothing changed there. The next Costco receipt fills the amount and conversion by itself (“lượng nhớ từ lần mua trước”).

**“Đối chiếu đi chợ & tủ thực phẩm” after saving:** list rows first (“Đủ”), then items not on the list (“Ngoài danh sách · … ”). The part on the list is ticked bought; the extra has three choices, **Cất kho** ticked by default, **Dành cho bữa …** (later planned meals that use it, from today on; the pantry lot carries `forMeal: {date, type}` and is not counted against the list of a week that ends before that meal) and **Không theo dõi** (spending only). Bought less → “Còn thiếu …” and the rest stays on the list. An amount known only in a buying unit (“3 chai”, no size) is compared with the list's own buying unit and ticks it in that unit; an extra bottle goes to the pantry as “1 chai”, weight unknown. The family's own list lines matched on the receipt (“Kimchi”) are ticked done. Undo restores the list, the extras, the buying-unit ticks and the pantry for every choice. The pantry card says “Dành cho bữa tối T4, 18/11”. Lines still not matched are listed in the sheet (“17 dòng chưa ghép · vẫn tính vào chi tiêu”) with **Mở hoá đơn để ghép**, which opens the receipt with the same one-tap choices; a choice made there is remembered for the store too.

**Quantities everywhere:** shopping list bought amounts in the ingredient's base unit (g / ml / quả / the family's unit; counted units are whole numbers, rounded up), buying-unit rows by their own unit and signature, pantry lots in base units with the purchase date (no invented expiry), the kept-for-a-meal reservation. Expenses always keep the whole receipt; lines left unmatched stay in spending (“Để sau” lines are saved as not yet matched so they can be matched later).

**Data / state additions:** `state.receiptQty` (above); pantry lot `forMeal` (optional, validated: date `YYYY-MM-DD`, meal type ≤ 20 chars); receipt line `per` (base units per 1 of the entered unit, from the family's conversion); `receipt.reconciled.choices` and the undo fields for buying-unit ticks and list lines. All optional; existing data is unchanged and no family data is rewritten.

**Responsive review (Chromium viewport simulation, not physical devices):** 320×740 (VI light), 375×812 (VI light full flow, EN dark), 820×1100 (VI light, EN dark), 1280×800 (VI dark, EN light): no horizontal overflow on the form, the open list, the reconciliation sheet and the meal choice; choices and option buttons ≥ 44 px; no emoji, no drawings on chips / secondary buttons; the tapped line and the tapped choice do not move (rule 24 — the destination text sits under the choices so the row above keeps its height). Pantry and shopping list checked after applying at 375. Screenshots: `docs/reviews/v1.7.18/receipt-list/` (20). Sheet footers are unchanged (rule 25).

**Limits:** a kept-for-a-meal lot inside the same week is counted like any pantry lot for that week (the reservation only keeps it away from earlier weeks' lists). The meal list for “Dành cho bữa …” shows meals from today over the next 4 weeks that use that ingredient. The quantity asked once is per store item name / code; a store that prints different names for the same product is learned per name. A new family ingredient starts in the line's unit (cái when the line has none). and in the cupboard group (the family can change it). Matching looks at the receipt's week and the week in view; the reconciliation itself compares with the week in view, as before.

**Tests:**
- `npm test` gains `receipt-list.test` (12 cases): Costco text — juice / hargow / pancake / roast beef / flavoured milk not matched to the raw ingredient, OMO / Colgate / Finish non-food (never capsicum; “CAPS RED” still capsicum), eggs 30PK = 30 quả (never a weight), kimchi 1.5K = 1500 g, no size → unknown; HP Meats weights unchanged; list first beats a closer catalogue name and memory beats both; nearest-first list and the family's list lines; amount memory (remember / recall / limit / validation, older states valid); base quantity (registry units, dozens, “1 chai ≈ 1.5 L”, buying-unit preference, never a guess); reconciliation with extra → pantry / kept for a later meal / not tracked, bought less → still on the list, not-on-list → pantry, buying-unit rows, list lines, undo exactly restoring the week and pantry.
- New `test:receipt-list:browser` (in `test:all`): the flow above at 375×812, then form + reconciliation at 320/375/820/1280 in VI/EN light/dark (20 screenshots).
- Existing receipt expectations were not changed: `matchIngredient` still returns `{match, confidence}` (list / memory source and the ready-made reason ride along as non-enumerable facts), all 47 `receipt-parse` cases and 17 `receipt-match` cases pass.
- Local, 12 Nov 2026 (Sydney): check, typecheck, `npm test`, test:receipt-list, receipt-ocr, generic-receipts, test:browser, offline, sync-merge, v1714 (reconciliation), ladybug (pretend receipt), language audit, emoji-art, v1717, units browser suites — all pass. GitHub CI on the PR head is the release evidence (rule 15).
