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

## 6. Cuong Thien Marrickville receipt (owner, 12 Nov 2026, 13:33: “This one still not reading correctly”)
The phone read 18 lines but named the shop “ERE RESILIENT” / “Cuong Thien PTY ©”. The app's OCR of the full photo (run locally, photo not kept) also turned the wrapped “… CAI THUONG HA / I / BIG BUNCH” + “2 @ $1.80” into an extra item, and “6 @ $1.20” (read “66 $1.20”) into an unnamed line.

**Fixes (`receipt-parse.ts`):**
- The company line is recognised without its “LTD” (“PTY LT ie”, “PTY ©” — the end lost at the paper's edge), so the store is “Cuong Thien Marrickville”, not header noise.
- “I / BIG BUNCH” read as “1 / 81g BUNCH” is the end of a wrapped name, not a new item.
- “66 $1.20” under a $7.20 item is 6 @ $1.20 (the @ read as 6), only when count × price equals the item above — as the existing “68 $1.20” rule.

**Result on the local OCR text:** 17 of 18 lines with names and prices, store Cuong Thien Marrickville, total $76.30; the KNORR line whose name and price OCR lost is reported as “Short by $5.65”, never invented (the phone's own OCR did read it).

**Tests:** new `receipt-parse.test` case from that OCR text (receipt number blanked); fails on main. 48 receipt cases, `receipt-ocr`, `generic-receipts` browser suites pass.

## 2. Chọn đơn vị (buying units in the shopping sheet)
Henry, 12 Nov 2026: *“Tôi nhớ lần trước rất nhiều loại lượng được đưa ra để chọn mà bây giờ không thấy … lượng có rất nhiều nên cần thể hiện màn hình để chọn và show ra cách hợp lý nhất … Có nên cho lựa chọn tự cho thêm lượng vào không?”* Pop-up choices: **“Gợi ý + Xem tất cả”**, **custom units: yes, with an optional conversion**, and counted items keep scaling with the people eating, rounded up (section 1, unchanged).

**What was wrong (v1.7.17):** in *Đi chợ → tap the amount → “Chọn cách mua & số lượng”* the whole unit list was folded inside “Đơn vị mua: con · Đổi”, so families thought the units were gone. For an ingredient counted in `con` (Gà ta), kg / g could not be chosen at all, `con` itself sat under “Cân/đo”, the `nắm` chip read “nắmước chừng”, and the `con` wheel jumped 0 → 1 → 50.

**What changed**
- **Suggestions straight away:** under the amounts, *“Mua Gà ta theo”* shows 6–8 unit chips for this ingredient: the unit in use, the family's remembered unit, units it was bought in before, the recipe unit, kg / g when it is sold by weight, the family's own units, units that suit its kind (meat → kg, g, con, miếng, khay; vegetables → bó, kg, củ, cây; eggs → quả, vỉ, chục; drinks → chai, lon, lốc, thùng; dry goods → gói, hộp, túi, kg, bao; sauces → chai, lọ, ml), then units recently used on the device. The order is fixed while the sheet is open, so a tap never reshuffles the row.
- **kg for counted things, no invented numbers (rule 6):** Gà ta can be bought as *1.6 kg*. The purchase is kept in kg; the sheet says it does not know how many kg make 1 con and offers an optional *“1 con ≈ ? kg”*. Without it the shopping/pantry maths treat the amount as unknown (existing behaviour, `basePerUnit` = null). Eggs are not offered by the kilo; sauces in ml get no weight units (no density invented).
- **“Xem tất cả đơn vị (N)”** (secondary button, words only) opens the full grouped list with the search box and arrow-key moves. `con`/`quả` are listed under Đếm / Rau củ, not Cân/đo; `nắm (ước chừng)` is separated; the list fits 320 px.
- **“+ Tự thêm đơn vị”:** name (≤ 40 characters) and an optional *“1 [đơn vị] ≈ [số] [con | g | ml]”*. Saved for the whole family in `state.customUnits` and suggested next time; listed in “Xem tất cả” under **“Đơn vị của nhà mình”** with its conversion. *“Ẩn khỏi gợi ý”* / *“Hiện lại”* only hides it from suggestions — records are never deleted and stored purchases are never rewritten. A name the app already knows (e.g. “túi lưới” = túi) uses that unit instead of making a new one.
- **Wheel:** counted recipe units (con, quả, miếng …) step 0, 1, 2, 3; weighed packs step 0.1 kg / 50 g. A redraw that only re-centres the wheel no longer overwrites an amount being typed (found by the new browser check).
- **Recipe editor:** the unit list also offers the family's units in a group *“Đơn vị của nhà mình (ghi theo chữ, không cộng)”*. A line written with one is saved as typed and not counted — the same as a unit typed by hand. Recipe counting is otherwise unchanged.
- **Rule 24:** a tap on a chip, “Xem tất cả” or “Ẩn khỏi gợi ý” keeps the tapped control where it was (the sheet scroll is corrected after the redraw). Rule 25 footer (Dùng lượng tự động / Lưu lựa chọn pills, drawn X and tick) unchanged; rule 27: the new buttons are words only.

**Data:** new optional `state.customUnits = [{id:'cu-…', name, base?, perBase?, ingredient?, createdAt, hidden?}]`. Validated in `validUnitState` (→ `validImport`): list ≤ 200, unique `cu-` ids, name 1–40 characters, `base` and `perBase` together or not at all (`perBase` 0 < x ≤ 1 000 000), sync stamps allowed. States without it stay valid; the released client (main) ignores the list. It is an id-keyed list, so the family sync merge and the server's sync guard handle it like other lists (nothing is ever removed from it). The server's state check (`family.mts` `validState`) has no purchase-unit validation, so nothing server-side needed changing.

**Evidence** (`unit-picker/`, Chromium viewport simulation — not physical devices): suggestions, kg without a conversion and the full list at 320×740, 375×812, 820×1100 and 1280×800 in VI light and EN dark; the custom-unit form and the family-units list at 375×812 in VI/EN, light/dark.

**Tests**
- `unit-suggest.test` (in `npm test`, 101 checks): kinds and suggestions per kind, kg / g for `con` ingredients without a conversion, preference / history first, family units suggested, hidden, never overwritten, validation of good/bad records, older states valid, released client still accepts the state.
- `test:unit-picker:browser` (new, in `test:all`): suggestions visible without a tap, kg for Gà ta, counted wheel steps, “Xem tất cả” groups + search + keyboard, `nắm (ước chừng)`, family unit with conversion saved → kept after reload → suggested → hidden, recipe editor option, chip taps keep their place (rule 24), footer pills (rule 25), words-only buttons (rule 27), no emoji, ≥ 44 px targets, no sideways overflow — 4 sizes, VI/EN, light/dark.
- `test:units:browser`: the full grouped list now opens with “Xem tất cả đơn vị” before the existing group / search / keyboard / custom-unit checks (it used to be open inside the folded section). No check was removed.

**Limits / open points**
- Unit chips keep the v1.5 unit line icons (not the shared art-kit style, and rule 27 says chips are words only). They were not changed in this release; replacing or dropping them is a separate screen-by-screen decision for Henry.
- A family unit can be hidden but not renamed; a typed conversion is not edited from the sheet afterwards (a later purchase can still enter its own conversion).
- Local runs, 12 Nov 2026 (Sydney, ~13:30–14:30 AEDT), commit on branch `agent-vv/unit-picker`: check, typecheck, `npm test`, test:unit-picker (3 consecutive passes), units, browser, recipe-ingredients, catalog, sync-merge, offline, journey, v176-fixes, v1712-fixes, v1712-flow, language, emoji-art, recipe-community, text-size browser suites — all OK. Full `test:all` and GitHub CI not run here.
