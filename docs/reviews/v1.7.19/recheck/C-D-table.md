# Verification of audit C, D and the v1.7.19 lead bugs (HEAD 3507cfa, 13 Nov 2026, Sydney time)

How I checked: I read the source in src/frontend and checked that dist/ was built after the last source change (dist 00:23 UTC, newer than app.ts 23:53 UTC). I ran the VM tests audit-data-fixes, week-start, receipt-list, sync-merge, spending and core; all passed, and none of them writes files. I wrote my own probes in this folder (h.cjs is the VM harness, bh.cjs the Chromium harness, and p*.cjs the probes). They ran in device-only Chromium with dist served on kitchen.test, in VI and EN, at 320 and 375 px, with phone time zones Sydney and Ho Chi Minh. I ran no repo browser test, because those write screenshots into docs/.

Status key: FIXED, PARTIAL, NOT FIXED, LEFT (left by an owner decision).

## C findings

| ID | Sev | Status | Evidence (file:line) | Test | Note |
|---|---|---|---|---|---|
| C1 | H | FIXED | core.ts:117-119 `addDishIngredients`, `roundNeeds`; family-menu-core.ts:33,36 (override removed, batch rounds) | audit-data-fixes C1 ×4; audit-data-browser | My probe pC1, with the week starting Saturday: 3.15 portions gives 1 con on the list and "Cần 1 con" in the sheet; cooking leaves no 0.21 con |
| C2 | H | FIXED | recipe-community.ts:71 `rcPick` fills the unit only when it is empty | extras-audit-browser | The family's unit is kept |
| C3 | H | FIXED | shopping-planning.ts:26 (no invented amount); app.ts:50,54-61 (shared unit picker, no default g) | recipe-units-browser, extras-audit-browser | Probe pC: the unit is empty until chosen. Quick pick gives the ingredient's unit and no amount |
| C4 | H | FIXED | core.ts:60 `MEAL_SERVINGS_MAX`=486, used at core.ts:179 and family-menu-core.ts:62 | audit-data-fixes C4 ×4 | |
| C5 | H | FIXED | personal-core (any `/^[A-Z]{3}$/` receipt currency) | audit-data-fixes C5 | Leaving GBP/EUR out of the totals is a fix agents' call; decisions.md says Henry has not confirmed it |
| C6 | H | FIXED | family-features.ts:29 (an empty enteredUnit stays '') | audit-data-browser C6 VI/EN | |
| C7 | H | FIXED | core.ts:171 `dishNeeds` uses the shared formula | audit-data-fixes B4/C7, lunch box | |
| C8 | H | FIXED | receipt-list.ts:135 `weekKey:mondayKey(start)`, :154 | week-start.test (Sat/Sun/Mon, old record) | |
| C9 | H | FIXED | sync-merge-core.ts:70-91 `syncPantryConsumption` | audit-data-fixes C9 | A lot edited by hand still merges last-writer-wins (documented) |
| C10 | H | FIXED | core.ts:161 (pack shrinks in step and leaves when used up) | audit-data-fixes C10; units-catalog | |
| C11 | H | FIXED | receipt-list plan (pack row covered); storeShoppingPurchases skip | audit-data-fixes C11 | |
| C12 | M | FIXED | personal-core.ts:10 `priceFor` gives null for seed 0; core.ts `mealCostText`; app.ts:241 ingredient sheet | audit-data-fixes C12 AUD/VND | Probe pC: the buying sheet shows "DỰ KIẾN CHI PHÍ Chưa rõ giá" / "Price unknown". app.ts:341 still has `aud(p.qty*INGREDIENTS[..][3])`, but that is dead code: unit-picker.ts:40 overrides it |
| C13 | M | FIXED | app.ts:50 (empty optional cost), app.ts:61 `costUnknown`; family-features.ts:33, shopping-planning.ts:31 | extras-audit-browser | Probe pC: saved with cost 0 and costUnknown true; the row shows "Chưa rõ giá" |
| C14 | M | FIXED | app.ts:244 (sheet lists exactly what the button counts) | v1719-weeks-dishes, autoplay au-counts | Probe pC: "(4)" is 1 list row plus 3 other lots. It counts lots, expired ones included, as Henry decided |
| C15 | M | FIXED | family-features.ts:7-8 `receiptLineOpen` excludes non-item lines (total and card) | audit-data-browser C15 | |
| C16 | M | FIXED | core.ts:128-129 `wholeCountUnit` check; purchase-units.ts:10; buying sheet step 1 | audit-data-fixes C16; audit-data-browser | Probe: 1.5 con is refused. Side risk (code): in saveReceipt (family-features.ts:28) the receipt is pushed into state before the mark-bought loop, so a refusal thrown there leaves the receipt unsaved in memory (see S2) |
| C17 | M | FIXED | core.ts:158-162 `lotDetails`, undoCook restores them | audit-data-fixes C17 | |
| C18 | M | FIXED | sync-merge-core.ts:93-101 `syncDedupeCustomUnits`; id from the name | audit-data-fixes C18 | |
| C19 | M | FIXED | receipt-list plan `ticked` status | audit-data-fixes C19 (Mon/Sat/Sun) | |
| C20 | M | FIXED | unit-picker.ts:53 `delete lot.qtyEstimated` | audit-data-browser C20 | |
| C21 | L | FIXED (product call) | core.ts roundNeed by unit registry (spoons ¼) | audit-data-fixes C21 | Rounding spoons up to ¼ is a fix agents' call that Henry has not confirmed. Spoon units are notes only (decision of 12 Nov), so they never reach the list |
| C22 | L | FIXED | validators (tags is a string array; expiry is '' or a date) | audit-data-fixes C22 | |
| C23 | L | FIXED | family-features.ts:33, shopping-planning.ts:31, app.ts:287 set `currency` | no test (code only) | Old extras with no currency are still left out of VND totals (app.ts:161) |
| C24 | L | FIXED | receipt line limit 1e9 base units | audit-data-fixes C24 | |
| C25 | L | PARTIAL | app.ts:274 (toasts "Chọn nguyên liệu" / "Nhập số lượng…"); app.ts:154 stock form | v1719-weeks-dishes | The silent paths are fixed: nothing is preselected and a bad amount gets a message. But eggs now step by 0.25, and probe pC saved 2.5 quả trứng; validImport accepts it. The audit named exactly this as a problem; ¼ steps are an agent choice, not a Henry decision |
| S1 | susp. | NOT FIXED | core.ts:161 `takeFromPantry` still ignores `forMeal` reservations | none | |
| S2 | susp. | NOT FIXED | family-features.ts:28 `if(mark){const[start,end]=shopDates(),week=currentWeek()…` | none | Rule 29 twin: the lead moved the reconcile sheet onto the receipt's own week (receipt-ui.ts:282-284 `receiptWeekStart`), but this mark-bought path did not get the same fix |
| S3 | susp. | NOT FIXED | receipt-list.ts:89 `sydDay` is hard-coded to Australia/Sydney | none | The rest of the app now follows `familyTimeZone()` (core.ts:12, BEP_TIMEZONE) |
| S4 | susp. | NOT FIXED | core.ts:126 `bought:(week.bought[id]||0)>=qty` is per week, not per range | none | Not reproduced, here or in the audit |

## D findings

| ID | Sev | Status | Evidence | Test | Note |
|---|---|---|---|---|---|
| D1 | M | FIXED | app.ts:161 `textShopping` | owner-rules-browser | Runtime VI and EN: no Extended_Pictographic. The □ and ✓ marks stay; no Henry approval for them is recorded |
| D2 | M | FIXED | push-ui.ts:36 `requestText` uses words | owner-rules | |
| D3 | Info | FIXED | app.ts:162, app.ts:248 (emoji gone) | owner-rules | The dead code was not removed; it is harmless |
| D4 | M | FIXED | emoji-art chip/tab/summary rule; svg removed | owner-rules | Probe pD3: 0 drawings in chips, tabs or summary on any screen |
| D5 | M | FIXED | same | owner-rules | |
| D6 | M | FIXED | ui-art.ts:153-162 BTN_BY_DATA | owner-rules | Probe pD8: calendar ‹ ›, pack-all and close all have drawings |
| D7 | M | FIXED | ui-art.ts mappings; csv `.primary` | owner-rules | Probe pD8: confirm, confirmAsk, CSV, preview and pack all have drawings |
| D8 | L | FIXED | family-menu-ui.ts:148 | owner-rules | No ↻ found |
| D9 | M | FIXED | personal-ui footer save, data-sheet-role | owner-rules | Probe pD4: no Lưu/Save in the body of My kitchen, Push, the recipe sheet or Settings |
| D10 | L | FIXED (test only) | toast moves while a floating footer is open | owner-rules | Not checked independently |
| D11 | H | FIXED | shopping-planning.ts:17-23 | v1719-language-browser | Probe pD: EN titles and labels translated. Only family stores and names stay Vietnamese |
| D12 | H | FIXED | app.ts:154 | v1719-language | "Edit pantry food" / "Delete this pantry lot?" |
| D13 | M | FIXED (twin gap) | app.ts shopping rows | v1719-language | Row labels are in EN. The twin gap is in the table below |
| D14 | M | FIXED | app.ts:161, family-menu-ui week share, push-ui.ts:44 `requestShareText` | v1719-language | Runtime EN share is English. Plant-v5 / n17 catalogue dishes have no English name, so they show in Vietnamese both in the app and in the share (a catalogue data gap, outside this audit) |
| D15 | M | FIXED (twin gap) | language.ts dictionary | v1719-language literal scan | Probe pD5: of the 94 appendix literals, the 14 still Vietnamese no longer exist in source or are built through tr/uiText. A few new or uncovered strings are in the table below |
| D16 | L | FIXED | family-menu-ui.ts:148; products-ui; bootstrap.ts `bt()` | v1719-language; startup.test | |
| D17 | L | FIXED | push-ui wording | v1719-language | |
| D18 | L | FIXED | studio-feedback.ts:62,80 | source check | Only the env name FEEDBACK_GITHUB_TOKEN remains |
| D19 | M | FIXED | core.ts:12-21 `appTimeLabel`; sync-merge-ui.ts:26 and the listed places | v1719-language TZ | Probe pT (Ho Chi Minh phone): 11:30 Sydney shows as "11:30 giờ Sydney", not 07:30 |
| D20 | M | FIXED | studio-scout.ts:96, studio.ts:17,73,204, studio-usage.ts:77 | source scan | |
| D21 | L | FIXED | personal-core.ts:241 `sydneyHour()`; personal-ui.ts:27 `sydneyParts()` | v1719-language | |
| D22 | M | FIXED | dish × 44×44 | owner-rules | Probe pD3 at 375 VI and 320 EN |
| D23 | M | FIXED | bell 44×44, language toggle 44–50×44 | owner-rules | |
| D24 | L | FIXED | chips, tabs, selects, store pill, day strip, text buttons all ≥ 44 | owner-rules | Probes pD3, pD4, pG: nothing under 44 px on 10 screens or 9 sheets at 320 and 375 |
| D25 | H | LEFT | dist/feedback-privacy.html is unchanged from main | — | Owner, 12 Nov: "Cứ làm, rồi sẽ chuyển chế độ sau" |
| D26 | M | LEFT | dist/privacy.html unchanged from main (`git diff main` is empty) | — | Rule 28: needs Henry |
| D27 | M | LEFT | weather code unchanged | — | |
| D28 | M | LEFT | online-want unchanged | — | |
| D29 | L | LEFT | voice-stats.ts unchanged from main | — | |
| D30 | L | LEFT | app-update.ts unchanged from main | — | src/netlify differs from main only in feedback reply url/body (owner decision) and push meal reminders (owner decision); nothing new is sent |

## Lead sections of docs/reviews/v1.7.19/review.md

| ID | Bug | Status | Evidence | Test | Note |
|---|---|---|---|---|---|
| L1 | EN strings: price history, add-to-meal, delete lot, cooking mode; 🔆 emoji | FIXED | app.ts:176 `w3T`; emoji-art.ts:8 | audit-sweep-browser | Probe pF EN: the add-to-meal, dish and delete-lot sheets have no Vietnamese |
| L2 | "Lưu sản phẩm" size placeholder | FIXED (code) | products-ui | audit-sweep | |
| L3 | Re-reading a receipt wiped confirmed lines | FIXED | receipt-ui.ts:79-83 `fillDraft` keeps the lines | receipt-list-browser 1b | |
| L4 | Dish-split wording (dishFactor) | FIXED (code) | | | Not re-checked in depth |
| L5 | W5 keep-in-place regression | FIXED (per lead) | | unit-picker, receipt-list browser | Not re-run (those suites write screenshots) |
| L6 | Receipt prices of 5–7 digits | PARTIAL | receipt-parse.ts:174,296 item lines read up to 7 digits; **receipt-parse.ts:193 `amountIn` still `\d{1,5}`** | receipt-list-browser 1c (items only) | Probe pR2: "TONG CONG 160000.00" gives printedTotal 60000, and "1394567.00" gives 94567, so the receipt shows a false "Các dòng vượt tổng in" warning. A VN receipt is also detected as AUD |
| L7 | Receipt check against the receipt's own week | FIXED (sheet only) | receipt-ui.ts:282-284 | receipt-list 1c | The twin in saveReceipt mark-bought was not fixed (see S2) |
| L8 | Emoji in dropdown options | FIXED | src option scan: no emoji left except voice-commands.ts "★ " (not Extended_Pictographic) | emoji-art, autoplay-audit | Probe pE: no pictographic emoji in options of 5 sheets |
| L9 | Ingredient sheet price 0 | FIXED | app.ts:241 | autoplay au-currency | |

## Twin gaps found while verifying (rule 29)

| Where | What | Severity |
|---|---|---|
| shopping-planning.ts:26 (the extra-catalog-ing change handler) | In EN, picking a quick-pick item that is in the pantry shows "Trong tủ đang có sẵn 1 g Bánh phở. Kiểm tra xem có cần mua thêm không nhé!" in Vietnamese, and fills the name field with the Vietnamese name "Bánh phở", although the option reads "Pho noodles". Probe pD7 | Medium (an EN D13/D15 twin) |
| push-ui.ts:37 | Fallback error "Đồng bộ chưa gửi được push." has no English, and "push" is the jargon D17 removed elsewhere | Low |
| family-features.ts:28 | Mark-bought on save uses the on-screen range (S2), and the receipt is pushed into state before a possible throw from setPurchaseQuantity/setBuyingUnits | Medium |
| receipt-parse.ts:193 | The total regex was not widened with the item regex (L6) | Medium for VND families |
