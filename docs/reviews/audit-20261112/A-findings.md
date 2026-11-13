# Audit A — controls that do nothing, open something empty or misleading, or show a number that does not match

- Code: read-only copy at commit `dd2e657` (`…/scratchpad/wt-audit`), `dist/` as built. Nothing in the repository was changed.
- Browser: Chromium viewport simulation at 375×812, VI, light theme, reduced motion, device-only mode (`bep-local-locked`), service workers blocked, `dist/` served through `context.route` on `https://kitchen.test`. All other origins were aborted and `/.netlify/*` returned 401. No live site or API was contacted.
- Data: seeded through the app globals. "Empty" means no meals, no pantry, no extras. "Full" means lunch and dinner planned for every day (2 dishes each, 54 ingredients), 9 pantry lots (3 needed by the plan, 6 not), and 2 extras ("Giấy ăn 2 cuộn $5", "Gà trống 1 g $0 ticked").
- Scripts and screenshots: `(audit scratch) A/` (`h.cjs` harness, `seed.cjs`, `crawl.cjs` click-crawler, `shop.cjs`, `p2.cjs`–`p9.cjs` probes, `crawl-empty.json` / `crawl-full.json` raw results).
- Paths below are relative to `src/frontend/`. Line numbers are physical lines. Many source lines are several kilobytes long, so search inside a line for the quoted text.
- Times are in Sydney time. The audit ran on 12 Nov 2026.

## Static handler check (task 1)

I extracted every literal `data-action`, `data-change`, `data-planning`, `data-fm`, `data-personal`, `data-feature`, `data-flow`, `data-scout`, `data-act`, `data-kx`, `data-house`, `data-community`, `data-push-action`, `data-mr`, `data-rm`, `data-rc`, `data-rui`, `data-ap`, `data-rci`, `data-vr`, `data-unit-action`, `data-rl`, `data-guide`, `data-shopact`, `data-rshare`, `data-insight` and `data-vc-f` value. I matched each one against `case`, `===`, `includes([...])` and `startsWith` handlers (`extract.cjs`).

- Result: every literal dispatcher value has a reachable handler. Values that looked missing at first are handled by prefix or list checks:
  - `invite-*` by `startsWith('invite-')` at personal-ui.ts:160;
  - `calendar-next` by `includes` at household-ui.ts:88;
  - `forget-unit` and `show-custom` at unit-picker.ts:46 and :79;
  - `shop-*` via `dataset.shopact` at studio.ts:271;
  - `pack-enough` and `invite-remind` by their own listeners at family-flow.ts:165 and :178.
- I found no dead `data-*` dispatchers and no unreachable `case` labels.
- The real problems are behavioural. A control has a handler, but the handler does the wrong thing, does nothing in some states, or shows a number unrelated to what it opens. These are listed below.

---

## Findings

### A1 — medium — Đi chợ: “Đồ trong tủ (n)” and “Đồ đã có (n)” open the same sheet with different numbers, and the sheet is empty without a plan (owner bug 1, confirmed)
- **Where:**
  - app.ts:66 (`renderShopping`): toolbar button `▧ Kiểm tra đồ trong tủ (${pantryMatched.length+otherPantry.length})`, short label “Đồ trong tủ (n)”;
  - app.ts:66: bottom button `▧ Kiểm tra đồ đã có / bỏ qua (${all.filter(r=>r.have>0||r.skip).length})`, short label “Đồ đã có (n)”;
  - app.ts:169: `case 'check-pantry'` lists only `shopping(...)` rows, which are this week's planned ingredients.
- **Repro, empty week with 2 pantry lots:**
  1. Go to Đi chợ.
  2. The buttons read “Đồ trong tủ (2)” and “Đồ đã có (0)”.
  3. Tap either one. The sheet “Kiểm tra trước khi đi chợ” contains only the help sentence and “Xong”. There are no rows and nothing to act on.
- **Repro, full plan:**
  1. The buttons read “Đồ trong tủ (9)” and “Đồ đã có (2)”.
  2. The inline note says “Đang trừ 2 món có trong tủ”.
  3. The sheet lists all 54 planned ingredients, most with “Có 0”.
- **Result:** one screen shows three different pantry numbers, and two buttons open the same sheet.
- **Expected:** one entry point, whose number equals the number of rows the sheet shows. When nothing is planned, show the pantry lots or hide or disable the button.
- **Screenshots:** `audit/A/shop-empty-pantry-sheet.png`, `audit/A/shop-full-pantry-sheet.png`, `audit/A/shop-full.png`
- **Fix:** Keep one button. Count `rows.filter(r=>r.have>0||r.skip)`, or list the pantry lots in the sheet. When the week is empty, show “Chưa có món trong thực đơn” and link to Tủ.

### A2 — high — Đi chợ: family-added extras cannot be edited; the name is not tappable (owner bug 2, confirmed)
- **Where:**
  - app.ts:66: the extra row renders `<span class="item-label">${esc(e.name)}…</span>` and `<span class="qty">${esc(e.qty)}</span>`, with no `data-action` on either;
  - there is no `edit-extra` handler anywhere (grep `edit-extra|editExtra` finds nothing);
  - the only row controls are tick, “Chọn nơi mua” and × delete (app.ts:160).
- **Repro:**
  1. Use the full seed and go to Đi chợ, group “Đồ dùng khác”.
  2. Tap “Gà trống”, “1 g” or “$0.00”. Nothing happens. The elements are `SPAN`s with no action.
- **Expected:** tapping the name or amount opens the same form, pre-filled, to fix the name, amount, unit, price and store.
- **Screenshot:** `audit/A/shop-full.png`
- **Fix:** Make the name and amount a button with `data-action="edit-extra"`. Reuse `extra-form` with a hidden id, and keep `errandId` when the extra came from “Nhờ mua thêm”.

### A3 — high — Mua thêm: the unit silently defaults to “g” and wrong amounts are saved (owner bug 3, confirmed and wider than reported)
- **Where:**
  - app.ts:44: `EXTRA_UNITS=['g','kg',…]` puts “g” first;
  - app.ts:159: the `extra-unit` select has no placeholder;
  - shopping-planning.ts:24: quick-pick sets the unit only `if([...unit.options].some(x=>x.value===u))` and pre-fills the amount with `'2'`;
  - app.ts:202 saves `qty` as typed.
- **Repro A, quick pick of a family ingredient counted in “con”:**
  1. Add the family ingredient Gà ta (unit con).
  2. Open Mua thêm and pick “Gà ta (con)” in “Chọn nhanh…”.
  3. The form shows amount `2` and unit `g`.
  4. Save. The stored value is `{"name":"Gà ta","qty":"2 g"}` and the row shows “Gà ta 2 g $0.00”.
- **Repro B, typed name of a catalog ingredient:**
  1. Type “Trứng gà”, which the catalog counts in quả, and amount 10, without touching the unit.
  2. The saved value is `"qty":"10 g"`.
- **Expected:** no unit preselected, so the user must pick one. Alternatively, the unit is inferred from the matching ingredient, and units outside the short list (con, củ, nắm…) are offered. The amount is not pre-filled.
- **Screenshots:** `audit/A/shop-add-extra-pick-unit.png`, `audit/A/shop-add-extra-form.png`
- **Fix:** Start the select on “— đơn vị” with `required`. Use the buying-unit sheet (`openPurchasePicker`/`suggestedBuyingUnits`) or the full unit registry. Infer the unit from `INGREDIENTS[k][1]` when the typed name matches.

### A4 — high — Mua thêm: price silently defaults to 0, so the extra shows “$0.00” and the budget is understated
- **Where:**
  - app.ts:159: `<input id="extra-cost" name="cost" … required value="0">`;
  - app.ts:202: `cost:+v.cost` with no `costUnknown`.
- **Contrast:** “Nhờ mua thêm” (push-ui.ts:32 and :35) uses an empty placeholder “Chưa biết — để trống” and stores `costUnknown:v.cost===''`, which renders “Chưa rõ giá” and puts “≥” on the total.
- **Repro:**
  1. Mua thêm → name “Gà ta”, leave the price untouched → Thêm.
  2. The row shows “$0.00”, not “Chưa rõ giá”.
  3. “DỰ KIẾN TẠI QUẦY” adds nothing for it and shows no “≥”, so the budget line claims more money is left than is true.
- **Screenshots:** `audit/A/shop-add-extra-pick-unit.png` (field shows 0), `audit/A/shop-full.png` (“Gà trống … $0.00”)
- **Fix:** Make the field optional with an empty default. Store `costUnknown:true` when it is left empty, the same as `errand-form`.

### A5 — medium — Two forms that add extras have drifted apart (Mua thêm vs Nhờ mua thêm)
- **Where:**
  - app.ts:159 and :202 (`extra-form`): structured amount plus a unit select that defaults to g, required price defaulting to 0, store chips;
  - push-ui.ts:32 and :35 (`errand-form`): free-text “Số lượng / cách mua”, optional price stored as unknown, store select.
- **Result:** both write to `week.extras`, but they produce different data shapes and different price semantics. A4 and A3 exist in one and not the other.
- **Fix:** Use one extra editor, shared by Mua thêm, Nhờ mua thêm and the edit flow from A2. The errand form adds only its recipients and push options.

### A6 — medium — Đi chợ: deleting an extra (×) has no confirmation and no undo, unlike planned rows
- **Where:**
  - app.ts:160: `case 'delete-extra':week.extras=week.extras.filter(...)` deletes at once;
  - compare app.ts:38–41 and :168: `skip-row` asks “Bỏ … khỏi giỏ?” and then shows an 8-second “Hoàn tác” bar (`undoBar`).
- **Repro:**
  1. Full seed → Đi chợ → tap × on “Giấy ăn”.
  2. `extras.length` goes from 2 to 1. No sheet opens and no undo bar appears. Text the family typed is lost.
- **Fix:** Use the same pattern as `skip-row`: either an undo bar via `undoBar(...)` that restores the extra at its index, or a confirmation.

### A7 — medium — Đi chợ: a week with no meals planned says “Nhà mình đã đủ nguyên liệu”
- **Where:** app.ts:66: `${!total?'<div class="card empty">…<h3>Nhà mình đã đủ nguyên liệu</h3>…'}`. The only condition is that the list is empty.
- **Repro:**
  1. Empty seed → Đi chợ.
  2. The card says the family has every ingredient it needs, with “0/0 đã mua” and “0% hoàn thành”, although nothing is planned.
- **Expected:** “Chưa có món nào trong thực đơn tuần này”, with a button to Thực đơn or Lên thực đơn. Keep “đã đủ” for the case where meals exist and the pantry covers them.
- **Screenshot:** `audit/A/shop-empty-full.png`
- **Fix:** Branch on whether any meal in the range has dishes.

### A8 — medium — Đi chợ, shopping mode: “Đã mua đủ” while extras are still unbought
- **Where:** family-flow.ts:25–27: `shopModeLeft()` and the total count only `input[data-change="bought"]`, which are planned ingredients. Extras use `data-change="extra-done"` and are ignored. The main progress pill at app.ts:66 counts extras, so the two counts disagree.
- **Repro:**
  1. Full seed, leave “Giấy ăn” unticked.
  2. Tap “Bắt đầu đi chợ”, then tick every ingredient row.
  3. The bar says “Đang đi chợ · Đã mua đủ”, while the pill says “55/56 đã mua” and Giấy ăn is still unbought.
- **Screenshot:** `audit/A/shop-mode-all-bought-extras-left.png`
- **Fix:** Count `[data-change="extra-done"]` in both `left` and `total`.

### A9 — medium — Đi chợ: ticked extras never go into the pantry; “Cất đồ đã mua vào tủ” says nothing is ticked
- **Where:** app.ts:170: `store-purchases` builds its rows only from `shopping(...)` ingredients, `filter(r=>…r.bought…)`. Ticked extras are never considered, even when the extra's name matches a catalog ingredient. The extra row already detects this match and shows a “Tủ có sẵn” badge at app.ts:66 (`matchIngId`).
- **Repro:**
  1. Full seed, tick only the extras.
  2. Tap “Cất đồ đã mua vào tủ →”.
  3. A toast says “Chưa có nguyên liệu được đánh dấu đã mua.” The extras are not offered.
- **Fix:** Include ticked extras whose name matches an ingredient, with an amount parsed from qty, in the store sheet. Otherwise, explain in the sheet that “đồ mua thêm” is not added to Tủ.

### A10 — low — Đi chợ: the “Cất đồ đã mua vào tủ →” link is always shown and only answers with an error toast
- **Where:**
  - app.ts:66: the aside `<button class="text-btn topspace" data-action="store-purchases">` has no condition;
  - the toolbar copy of the same action is guarded by `canStoreBought`.
- **Repro:**
  1. Empty or full seed with nothing ticked → open the folded “Ngân sách dự kiến, chia sẻ & cất đồ vào tủ” panel.
  2. Tap the link. Toast: “Chưa có nguyên liệu được đánh dấu đã mua.”
- **Screenshot:** `audit/A/shop-store-nothing.png`
- **Fix:** Use the same `canStoreBought` guard, or show the link disabled with the reason next to it.

### A11 — low — Mua thêm: the label says “Chọn nhanh từ 58 nguyên liệu” but the list has 106
- **Where:** app.ts:159 hard-codes “Chọn nhanh từ 58 nguyên liệu có sẵn (tùy chọn)”. The select contains every `INGREDIENTS` entry: 106 in this build, more with family ingredients.
- **Repro:** open Mua thêm and count the options: 106.
- **Screenshot:** `audit/A/shop-add-extra-form.png`
- **Fix:** Use `${Object.keys(INGREDIENTS).length}`, or drop the number.

### A12 — low — “Bỏ … khỏi giỏ?” points to a button label that no longer exists
- **Where:** app.ts:40, skip-row sheet: “lấy lại ở “Kiểm tra đồ đã có / bỏ qua””. The button now reads “Đồ đã có (n)” (ui-art.ts:169 short names, rule 27).
- **Repro:** Đi chợ → × on any row. The sheet tells the user to find “Kiểm tra đồ đã có / bỏ qua”, but no such label is on screen.
- **Fix:** Say “lấy lại ở nút “Đồ đã có””, or take the text from the same short name.

### A13 — medium — Hôm nay / Thực đơn: “Bỏ hết món” and the dish × remove dishes with no confirmation and no undo
- **Where:**
  - family-menu-ui.ts:152: `case'clear-meal'` sets `m.recipes=[]`;
  - family-menu-ui.ts:152: `'remove-dish'` uses `splice`;
  - the buttons are at family-menu-ui.ts:36.
- **Repro:**
  1. Add a typed dish (“Canh chua bà nội”, not saved to the library) to tonight's dinner.
  2. Tap “Bỏ hết món”. All 3 dishes are gone at once. A toast says “Đã bỏ hết món ăn trong Bữa tối.” There is no undo. The typed dish exists nowhere else.
  3. The × on a dish also removes it at once, with no undo.
- **Compare:** removing a shopping row (A6) asks first and offers undo.
- **Screenshot:** `audit/A/today-clear-meal-no-undo.png`
- **Fix:** Add `undoBar` to both actions, restoring `recipes` and `tasks`.

### A14 — medium — Dish sheet for a typed (meal-only) dish: “Xóa khỏi kho” claims success, “Chế độ nấu” does nothing, “Thêm vào bữa ăn” fails, and the dish cannot be edited
- **Where:**
  - app.ts:79: `showRecipe` always renders the footer `delete-recipe-dialog / start-cooking / add-to-meal`;
  - app.ts:153: `delete-recipe-confirm` filters `state.recipes`, so nothing changes, but it still says “Đã xóa món ăn khỏi kho.”;
  - app.ts:183: `start-cooking` looks the dish up in `state.recipes`, then in `week.days[editingDate]?.[editingType]`. `editingDate` and `editingType` are not set when the sheet is opened from a meal card, so it hits `if(!r)return` silently;
  - app.ts:201: `add-to-meal-form` gets `r=undefined`, which produces the generic error;
  - family-menu-ui.ts:36: the ✏️ edit button is shown only for dishes found in the library (`live&&ownRecipe(live)`).
- **Repro:**
  1. Hôm nay → Bữa tối → “+ Thêm món ăn”.
  2. Type “Canh chua bà nội” and untick “Lưu luôn vào Kho món ăn gia đình” → Thêm vào bữa.
  3. Tap the dish name. The sheet shows “Chưa có nguyên liệu” and offers no way to add ingredients or rename the dish.
  4. “Xóa khỏi kho” → Xóa: toast “Đã xóa món ăn khỏi kho.” Nothing was in the library.
  5. “Chế độ nấu”: nothing happens. There is no toast and the sheet does not change.
  6. “Thêm vào bữa ăn” → pick Bữa trưa → Thêm: toast “Dữ liệu chưa hợp lệ. Kiểm tra các ô rồi thử lại.” Nothing is added.
- **Screenshots:** `audit/A/typed-dish-snapshot.png`, `audit/A/typed-dish-delete-from-library.png`, `audit/A/typed-dish-cooking-mode.png`, `audit/A/typed-dish-add-to-meal-submit.png`
- **Fix:** In the meal-snapshot mode, hide library-only actions. Offer “Sửa món / thêm nguyên liệu”, which opens the recipe writer seeded from the meal dish, and “Lưu vào kho”. Pass the date and type to `start-cooking`.

### A15 — medium — Tủ: “Thêm thực phẩm” silently defaults to Thịt heo and Ngăn mát
- **Where:** app.ts:84 `stockForm`:
  - the `stock-ing` select has no placeholder, so the first entry, Thịt heo, is selected;
  - `stock-place` defaults to `fridge`.
- **Repro:**
  1. Tủ → “+ Thêm thực phẩm”.
  2. Type 2 in Số lượng → Lưu thực phẩm.
  3. The stored lot is `{"ingredient":"pork","qty":2,"place":"fridge"}`, that is “Thịt heo 2 g in Ngăn mát”, although nothing was chosen.
- **Fix:** Start the ingredient select with “— Chọn nguyên liệu” and `required`. Suggest the place from the ingredient with `suggestStorePlace`, as the store sheet does.

### A16 — low — Tủ: the stat cards count lots the list does not show
- **Where:** app.ts:70: `ĐANG CÓ TRONG TỦ ${state.pantry.length}`, `NGĂN ĐÔNG ${state.pantry.filter(p=>p.place==='freezer').length}` and `near`. None of these filter `qty>0`. The list does filter `(p.qty>0||p.purchase?.amount>0)`.
- **Repro:**
  1. Seed a used-up freezer lot with qty 0 and one fridge lot.
  2. The cards read “2 lô thực phẩm” and “NGĂN ĐÔNG 1”, but one card is listed and the freezer is empty.
- **How such lots arise:** `consume()` removes zero lots (core.ts:123). A barcode-scan lot can be created with `qty:0` (kitchen-extras.ts:85), which makes this reachable. That path is suspected; I did not drive it end to end.
- **Screenshot:** `audit/A/pantry-zero-lot-counts.png`
- **Fix:** Apply the list's filter to all three counts.

### A17 — medium — Hôm nay: “Báo khẩn” on a device-only install silently opens “Bếp của nhà mình” settings
- **Where:**
  - personal-ui.ts:155: `urgentForm=function(){if(!accountSession?.household){void accountsModal();return}…}`;
  - household-ui.ts:67 renders the button for everyone.
- **Repro:** Device-only → Hôm nay → “Báo khẩn”. The sheet titled “Bếp của nhà mình” opens, scrolled to “Kết nối gia đình”. Nothing says that urgent messages need a family account.
- **Screenshot:** `audit/A/urgent-new.png`
- **Fix:** Show a one-line reason (“Tin khẩn cần kết nối gia đình”) at the top of the sheet or in a toast. Alternatively, show the button disabled with that reason in device-only mode.

### A18 — low — “Kết nối gia đình” and “Đồng bộ gia đình” open a sheet titled “Bếp của nhà mình”
- **Where:** personal-ui.ts:160 (`accounts`), family-features.ts:6 (`cloud-settings` button on Chi tiêu).
- **Repro:** Tap either button. The sheet heading is “Bếp của nhà mình”, starting with members and portions. It is scrolled so that the “Kết nối gia đình” section is near the top. The family-connection entry works, but the title does not match the button (rule 12: easy to find).
- **Screenshot:** `audit/A/accounts-button-opens-settings.png`
- **Fix:** Pass a section title, or open a dedicated connection sheet.

### A19 — medium — Giá: “Lưu từ hóa đơn” opens an empty sheet with no way forward
- **Where:** products-ui.ts:9 `receiptProductPicker()`.
- **Repro:** No receipts → Giá → “Lưu từ hóa đơn”. The sheet “Chọn dòng hóa đơn đã xác nhận” shows its explanation and “Chưa có dòng hóa đơn.”, with no action except closing.
- **Screenshot:** `audit/A/products-receipt-empty.png`
- **Fix:** Add a “Chụp / nhập hóa đơn” button (`data-feature="receipt-new"`) to the empty state. Alternatively, disable the button with a hint when there are no confirmed lines.

### A20 — low — Chi tiêu: three buttons open the same receipt sheet under three labels
- **Where:** family-features.ts:6:
  - header “▧ Chụp / nhập hóa đơn”, short label “Hóa đơn”;
  - empty card “Thêm hóa đơn”;
  - aside “+ Ghi khoản mua”.
  - All three are `data-feature="receipt-new"` and open “Chụp / nhập hóa đơn”.
- **Repro:** empty week → Chi tiêu. All three are visible together on mobile.
- **Screenshot:** `audit/A/expenses-empty.png`
- **Fix:** Use one label everywhere, and drop the aside copy when the empty card is shown.

### A21 — low — “Thêm vào bữa ăn” always preselects Bữa tối and cannot reach the two snack meals
- **Where:** app.ts:154 `case 'add-to-meal'`: `<option value="dinner" selected>`, and the options are only breakfast, lunch and dinner. Family mode has `snackAm` and `snack` too.
- **Repro:** Món ăn → a breakfast-style dish (“Phở gà nhanh”) → Thêm vào bữa ăn. Bữa tối is preselected. Bữa phụ sáng and Bữa phụ chiều are missing.
- **Screenshot:** `audit/A/add-to-meal-defaults.png`
- **Fix:** Preselect from the dish's meal tags, or from the meal the user came from. List every `MEAL_TYPES` entry that is on that day.

### A22 — low — Quick-add dish: “Vai trò món” silently defaults to Món chính
- **Where:** family-menu-ui.ts:150 (`#quick-dish-cat`, default `main`).
- **Repro:** Thêm món ăn → type “Canh chua bà nội” → Thêm vào bữa. The dish is stored with `category:"main"`, and the sheet labels it “Món chính”. Auto-planning and portions then treat a soup as a main dish.
- **Fix:** No default, or guess from keywords already used elsewhere (canh, soup → soup). Show the chosen role next to the button.

### A23 — low — Hôm nay: “Gợi ý món từ tủ” opens an empty sheet when the fridge holds only staples
- **Where:**
  - family-menu-ui.ts:146: the card lists every lot that is not expired;
  - family-menu-ui.ts:152: `use-pantry` removes `PANTRY_STAPLE_IDS` (garlic, fish sauce, …) before matching.
- **Repro:** Pantry = Tỏi + Nước mắm → Hôm nay → “Gợi ý món từ tủ”. The sheet says only “Chưa tìm thấy món ăn khớp tủ.”
- **Screenshot:** `audit/A/today-use-pantry-staples-empty.png`
- **Fix:** Hide the card or the button when no lot outside the staples exists. Alternatively, say in the empty state that staples are not used for matching.

### A24 — low — Nhờ mua thêm: “Người nhờ mua” silently defaults to the first member (Bố)
- **Where:** push-ui.ts:32: `sender=profile.memberId||state.members[0].id`.
- **Result:** in device-only mode with no push profile, every request is recorded as from “Bố”, including in the log line “Nhờ mua thêm …”.
- **Fix:** Use the “Ai đang dùng máy này?” member (the menu-reactions viewer) when set. Otherwise leave the field unselected and make it required.

### A25 — medium — Viết món still uses the old plain unit `<select>`, not the new buying-unit sheet (owner bug 4, confirmed)
- **Where:**
  - recipe-community.ts:29 (`rcUnitOptions`) and :33: `<select class="rc-ing-unit">`;
  - compare unit-picker.ts: suggestions, “Xem tất cả”, family units with conversions.
- **Result:** the recipe writer has no suggestions, no search and no family-defined units. The two places that choose a unit behave differently (rule 29).
- **Fix:** Open the same unit sheet from the recipe ingredient row (`openPurchasePicker`-style API without the buying amount).

### A26 — low — Món ăn: “Nhập món từ link” is shown to device-only users and only opens an account wall
- **Where:** kitchen-extras.ts, around :44 (the `kx=import-open` sheet).
- **Repro:** Món ăn → “Nhập món từ link”. The whole sheet is “Cần tài khoản gia đình. Đăng nhập · Đóng”.
- **Fix:** Show the button with a “cần tài khoản” hint, or hide it in device-only mode.

### A27 — low — “Giữ bữa” adds phone emoji to the label after tapping
- **Where:** family-menu-ui.ts:36: `${m.locked?'📌 '+tr('Đã giữ bữa'…):'🔓 '+tr('Giữ bữa'…)}`.
- **Repro:** Hôm nay → “Giữ bữa” → it becomes “📌 Đã giữ bữa”. Rule 19/21 forbids phone emoji in the interface. This is outside area A and is noted only because the label changes on tap.
- **Fix:** Use words only, or a `uiArt` drawing.

---

## Checked and not a problem
- Tủ → “Tìm món ăn ↗” opens Món ăn already searched for the ingredient (“Sườn heo” → 1 dish) (`p9.cjs`).
- Chi tiêu → “Tuần sau”, Hôm nay → Bữa sáng / trưa / tối tabs and Thực đơn → “Giữ bữa” work. The crawler had flagged some of them because the change was small.
- The More sheet (“Các mục khác”) lists Hướng dẫn sử dụng and Cài app. The other screens are in the scrollable bottom navigation with a › chevron at 375 px.
- The planned-row “×” confirms and offers “Hoàn tác”, and ingredient names open the detail sheet. Its “n bữa sử dụng” matches the detail's “Dùng cho”.

## Limits
- Mobile 375×812 only, VI only, Chromium viewport simulation, device-only mode. No signed-in or shared-family state, so account-only sheets (So giá, Cộng đồng, invitations, urgent alerts) were seen only from the device-only side. No physical device.
- The click-crawler (`crawl-*.json`) is a coarse aid. Every finding above was re-checked with a targeted probe or by reading the code, as stated in its “Where”.
- A16's barcode path is suspected, not driven end to end.
