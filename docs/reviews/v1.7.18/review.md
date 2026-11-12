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
