# v1.7.18 — counted ingredients, buying units, receipts, notification taps

Times are in Sydney time. **Not deploy-approved.** Nothing is merged or built on hosting until Henry says DEPLOY.

## Contents
1. Issue #38 — counted ingredients bought in whole numbers
2. Chọn đơn vị — buying units, all units, family units
3. Costco receipts
4. HP Meats butcher receipt
5. Receipt ↔ shopping list
6. Cuong Thien receipt
7. Receipts the app has not seen: send text (A) + photo hints (B)
8. Notification taps open the right screen and day
9. Usage stats paused during “Tự chạy thử”

## 1. Issue #38 — whole numbers for counted ingredients (ladybug, 11 Nov 2026, 16:20)
*“Thiếu mất "con" bên phần định lượng nguyên liệu rồi. Sao bị mất nhiều vậy?”* — route Đi chợ, phone 414×840, build 20261108T231601Z.

**Reproduced on main (v1.7.17):** a family dish with *Gà ta 1 con · Tôm sú 6 con · Mực ống 2 con · Hành lá 1 bó*, planned for tonight's dinner (test family, 3.2 servings against the recipe's 4), put **0.8 con gà, 4.8 con tôm, 1.6 con mực, 0.8 bó hành** on the shopping list.

**Cause:** after scaling a dish to the people eating, only `quả` was rounded up to a whole number (`core.ts` `mealIngredients`, `dishNeeds`, `shopping`). Every other counted unit — con, cái, củ, bó, hộp, gói, chai, lon, túi, tép… — kept the fraction, so the list asked for less than a whole animal, bunch or pack.

**Fix:** a counted unit (anything that is not weighed in g or measured in ml) is bought in whole numbers, **rounded up** so the list never comes up short — the same rule `quả` already had. Weighed and measured ingredients still scale exactly.

After the fix the same dish gives **1 con gà, 5 con tôm, 2 con mực, 1 bó hành**.

Not changed, on purpose:
- The recipe view still shows the exact written amount (owner decision #13 in v1.7.5: “ghi 1/2 hay 0.5 … vẫn là 1” — the recipe shows what was written; the shopping list does the purchase rounding). `recipe-ingredients.test` keeps that check.
- Scaling to the family's servings is unchanged: 6 con tôm for 4 portions still becomes 5 con for 3.2 portions. If the family wants counted items never scaled down, that is a product decision for Henry.
- A family's own typed amount in the “Lượng mua” picker is not rounded.

### Evidence
- `shopping-before-vi-414x840.png` (main) / `shopping-after-vi-414x840.png` (this branch) — Chromium simulation at Henry's reported size; layout unchanged, only the numbers.

### Tests
- New checks in `core.test` (in `npm test`): 1 con stays 1 after scaling to 0.8; 1.1 con buys 2 (always up); weighed units still scale exactly. The first check fails on main.
- Local, 12 Nov 2026: check, typecheck, `npm test`, test:browser, recipe-ingredients, units, catalog, family-calendar, sync-merge, menu-reactions browser suites — all OK. Full `test:all` local run and GitHub CI reported in the PR.

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

## 6. Cuong Thien Marrickville receipt (owner, 12 Nov 2026, 13:33: “This one still not reading correctly”)
The phone read 18 lines but named the shop “ERE RESILIENT” / “Cuong Thien PTY ©”. The app's OCR of the full photo (run locally, photo not kept) also turned the wrapped “… CAI THUONG HA / I / BIG BUNCH” + “2 @ $1.80” into an extra item, and “6 @ $1.20” (read “66 $1.20”) into an unnamed line.

**Fixes (`receipt-parse.ts`):**
- The company line is recognised without its “LTD” (“PTY LT ie”, “PTY ©” — the end lost at the paper's edge), so the store is “Cuong Thien Marrickville”, not header noise.
- “I / BIG BUNCH” read as “1 / 81g BUNCH” is the end of a wrapped name, not a new item.
- “66 $1.20” under a $7.20 item is 6 @ $1.20 (the @ read as 6), only when count × price equals the item above — as the existing “68 $1.20” rule.

**Result on the local OCR text:** 17 of 18 lines with names and prices, store Cuong Thien Marrickville, total $76.30; the KNORR line whose name and price OCR lost is reported as “Short by $5.65”, never invented (the phone's own OCR did read it).

**Tests:** new `receipt-parse.test` case from that OCR text (receipt number blanked); fails on main. 48 receipt cases, `receipt-ocr`, `generic-receipts` browser suites pass.

## 7. Receipts the app has not seen: send text + photo hints (owner, 12 Nov 2026: “Do everything in this round”)
Plan `docs/plans/receipts-v1.7.19-20261112.md` — A and B moved into v1.7.18 (no version bump). C (AI reading of the photo) is not wanted and not built.

### B. Photo quality hint (`src/frontend/receipt-quality.ts`) — nothing leaves the phone
Right after a photo is read, ONE card appears in the receipt sheet when any of these hold, with the specific reason(s):
- the lines read do not add up to the printed total / payment (difference ≥ $0.05) — “Các dòng đọc được còn thiếu $7.00 so với tổng in”;
- the printed item count differs from the lines read;
- reading confidence < 70% (“ảnh có thể mờ, tối hoặc nghiêng”);
- no TOTAL / payment line;
- the price column looks cut off (2+ item lines without a price, a clipped price filled from the total, or a priceless line with the crop frame ending before 90% of the photo width).

What to do: “Chụp lại: để hoá đơn thẳng, đủ sáng, thấy cả cột giá và dòng TOTAL.” — **Chụp lại** (main action, new “camera” drawing; opens the camera / photo picker like “Chụp hoá đơn”) and **Vẫn dùng bản này** (words only; the card shrinks to one line in place, the page does not move — rule 24). Never blocks saving. Uses only what the reader already measures (difference, printed count, OCR confidence, crop frame).

### A. “Gửi chữ hoá đơn để sửa cách đọc” (`src/frontend/receipt-share.ts`)
- Shown at the end of the receipt sheet (secondary, words only) once the family changed anything the reader produced — a line name, price, amount, a removed / added line, the store, date or total — right after a photo, and on a saved receipt (its reading kept on this phone at save time, or its saved item text read again). EN: “Send the text so the app reads it better”.
- Opens **Xem trước chữ sẽ gửi**: the text read from the photo with sensitive lines removed, the reader's lines next to the corrected lines (changes marked), store, retailer id, date, total, reading confidence, app build, language, and the exact JSON. No image. Offline: the send button is off and the sheet says so.
- Removed **on the phone** before the preview (same rules again on the server): card / PAN / AID / ARQC / TVR / terminal / approval / bank / account / reference lines (`ReceiptParse.isSensitive` + extra rules), membership / loyalty numbers (“Goldstar 79354396400”), receipt / transaction / invoice numbers (“No: P2611070038”), staff names, people's mobile numbers and e-mail, long card-length digit runs. Kept: items (item codes on priced lines), totals, the shop's ABN, address and the shop phone printed after “Ph / Tel”.
- **Gửi chữ đã che số** (main, new “send-text” drawing) posts only on the family's tap → toast “Đã gửi — cảm ơn, lần sau app đọc hoá đơn này tốt hơn. Mã: xxxxxx”; the sheet then says it was sent (also on the saved receipt).

**Server** (`src/netlify/lib/receipt-reports.mts`, ops in `functions/feedback.mts`, store `bep-receipt-reports`):
- `POST feedback?op=receipt-report` — account (session cookie) or device-only (the same random device token as in-app feedback); not tied to who sees the feedback ladybug. ≤ 40 KB (413), validated (400), 3 / minute and 20 / day per sender, 60 / day per network address (hashed) (429), same clientId stored once.
- Kept: the redacted text (re-checked), read and corrected lines, store, retailer id, dates, total, build, language, confidence, warning codes, a read-vs-corrected diff, status, and a one-way sender key + “account yes/no”. Never a username, family, e-mail, IP address or photo.
- Studio (owner / admin / moderator, CSRF on changes, audited): `studio-receipts` (list), `studio-receipt` (detail, no sender key), `studio-receipt-status` (mới / đã thêm test / bỏ qua), `studio-receipt-delete` (deletion on request — the family quotes the 6-character code).
- Retention: 180 days, removed by the existing daily `feedback-cleanup` run (dedupe keys 30 days, rate counters 2 days).

**Studio → Nội dung & cộng đồng → Hoá đơn gửi về** (`src/frontend/studio-receipts.ts`): list (received time in Sydney time, store, retailer id, receipt date, “đọc N dòng → sửa còn M · K dòng khác”, fields fixed), opening one shows the details, the read-vs-corrected diff (Sửa tên / Sửa giá / Sửa lượng / Gia đình thêm / Gia đình bỏ), the redacted text, status, **Tải chữ hoá đơn** (a ready fixture entry for `src/tests/fixtures/receipts.cts` with `expect` from the family's corrections) and delete.

**Privacy page** (`dist/privacy.html`, VI + EN): new section 7a — what is sent, never the photo, which numbers are removed on the phone, stored in Australia without account / IP, kept 180 days, how to ask for deletion (the code). The hosting vendor is not named.

### Evidence (Chromium viewport simulation — not physical devices)
`docs/reviews/v1.7.18/receipt-feedback/`: hint card, send button, preview, sent toast, offline preview, Studio list + diff — at 320×740, 375×812, 820×1100 and 1280×800, VI light and EN dark (25 screenshots). The reader in the browser suite is a stand-in returning synthetic text so the reasons are exact; the real on-device reader is covered by `test:receipt-ocr:browser`. All receipts and numbers in tests are synthetic.

### Tests
- `tests/receipt-feedback.test.mjs` (in `npm test`): phone and server redaction (and every receipt fixture still reads to the same items and total after redaction), preview body / diff, hint reasons (balanced none; short, over, count, low confidence, no total, cut-off), the server op (device-only + account, once per clientId, 400 / 413 / 429, nothing private stored), Studio owner-only + CSRF + audit, 180-day cleanup.
- `tests/receipt-feedback-browser.test.cjs` (new `test:receipt-feedback:browser`, in `test:all`): hint for a short receipt and none for a balanced one, “Chụp lại” opens the picker, “Vẫn dùng bản này” keeps the page still, correction → preview (no card / member / receipt / phone numbers, no image) → send to the real handler → toast, the preview's JSON equals what was posted, saved receipt, offline, Studio list / diff / status / fixture download; no overflow, ≥ 44 px, no emoji, drawings only on main buttons, sheet footer side by side, at 4 sizes VI / EN light / dark.
- `test:studio-nav:browser` updated: the content group now lists `receipts`.
- Local run, 12 Nov 2026 ~14:00–14:24 Sydney time, on this branch before commit: check, typecheck, `npm test` (incl. receipt-feedback: 8 groups), test:receipt-feedback:browser, test:receipt-ocr:browser, test:generic-receipts:browser, test:browser, test:studio-nav:browser, test:ladybug:browser, test:offline:browser, test:artwork:browser, test:emoji-art:browser — all OK. GitHub CI follows on push.

### Limits
- Browser viewport simulation only, not physical phones. The browser suite uses a stand-in reader; real photos were not used (none are committed).
- Redaction is rule-based: an unusual layout could still carry a number the rules do not recognise; the preview shows the family exactly what goes, and the server repeats the check. The shop phone printed after “Ph / Tel” is kept as public shop information.
- Turning a report into a fixture + test is still a developer step (download → add → run tests → mark “Đã thêm test”).

## 8. Notification taps open the right screen and day (owner, 12 Nov 2026: “Có thấy Notification báo nhưng khi ấn vào thì nó không đưa đến chỗ cần xem”)
**Cause:** the service worker only accepted bare screen links (`/#today`), so an alert about a family member's availability opened Hôm nay on today's date instead of the day that changed.

**Fix:** `sw.ts` accepts a screen link with a date (`/#today?d=YYYY-MM-DD`, also shopping/planner/expenses/pantry) and still falls back to `/#today` for anything else. Availability alerts (`availability-notify.mts`) link to the earliest changed day.

**Tests:** `offline-lite.test` §8 checks push → tap opens the dated link; `availability-notify.test` expects `/#today?d=2026-11-03`.

## 9. Usage stats paused during “Tự chạy thử” (CI fix)
`test:v1716:browser` failed once on GitHub because a usage report arrived while the self-test panel was running. `usage-analytics.ts` now sends nothing while the “Tự chạy thử” panel is open; the test itself was not changed (rule 16).
