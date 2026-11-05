# v1.7.5 release record — owner feedback (4 Nov 2026) and language

Source: Henry's Notes “Note chỉnh sửa cho Bếp Nhà” (4 Nov 2026, items 1–16) and the request “Kiểm tra lại ngôn ngữ”.
Owner decisions (popup answers, 4 Nov 2026): Bữa phụ is always a daily slot; ăn vặt/tráng miệng fill it; school lunch box
Mon–Fri when switched on; “Main/Side dish” are dish types, not meals; new ingredient rows ticked “Cộng vào đi chợ”;
Lớn is the default text size; loanwords (offline, bill, Weekends feast, school lunch box) stay; reference-recipe English
is a separate release; 5 suggestions with “Xem thêm”; units may be added.

Branch `release/v1.7.5`, stacked on #12 (artwork fixes) which is stacked on #11 (v1.7.4). **Not deploy-approved.**

## Feedback → change

| # | Owner note | Change | Covered by |
|---|---|---|---|
| 1 | Photo buttons do nothing | The recipe form carried `data-rc`, so the `[data-rc]` click handler cancelled every tap inside it (also the paste box). Form flag renamed, forms ignored by the handler; 44 px buttons. | v175-feedback (real taps open the picker at 4 sizes) |
| 3 | Text too small | Every stylesheet size is `max(size × multiplier, floor)`. Lớn (default): body ≥15 px, ordinary text ≥14 px, former 8–9 px labels ≥12 px. Vừa = v1.7.4, Rất lớn ≥16 px. Per device, applied before first paint. | v175-feedback (no text <12 px; 3 levels without overflow) |
| 4, 8 | “Phân loại bữa ăn”; auto-ticks could not be removed | Bữa sáng/trưa/tối/phụ, Weekends feast; nothing auto-ticked; saved exactly as ticked. Empty = dish-type default (planning only). | v175-recipes, v175-feedback |
| 5 | “Phân loại món ăn” | Món chính, phụ, canh/soup, sợi, tráng miệng, ăn vặt, school lunch box (`veg` key shown as Món phụ). | v175-recipes, library-guide |
| 6 | Labels | “Công thức nấu cho bao nhiêu suất ăn”, “Thời gian nấu (phút)”. | v175-feedback |
| 7 | Method numbered | Shown as written (`.steps-text`), no filler “Nấu theo cách quen…”. | v175-feedback |
| 8 | Paste box unclear | “📋 Dán danh sách nguyên liệu” with an example; one help line about the tick. | v175-feedback |
| 9 | Unit “đòn” | Added with khoanh, vỉ, khay, túi. | v175-feedback |
| 10 | Shopping depends on a per-ingredient tick | “Cộng vào đi chợ” per row; kitchen units counted as written. | recipe-community, recipe-ingredients, v175-feedback |
| 11, 12 | Max suggestions | 5 + “Xem thêm” (5 more each tap) for reference and saved dishes. | recipe-community, catalog-filters, v175-feedback |
| 13 | ½ shown as 1 | `parseQty` reads 1/2, ½, 1 1/2, 0,5; recipe view no longer rounds counts up; `fmtQty` shows ½ / 1½. Pasted free text saved from what the row shows (it was re-read as “2 quả”). | v175-recipes, recipe-ingredients, v175-feedback |
| 14 | “Tự chia phần”? | “Tự tính theo số người”, “½ lượng (50%)”…“Gấp đôi (200%)” plus an explanation. | v175-feedback |
| 16 | Icon badge | Service worker counts urgent / attendance / calendar pushes while the app is not on screen; cleared on open. | npm test (service-worker suites) |
| — | Language, second report (5 Nov, photo of the protein list) | The first audit read only visible page text; dropdown options and dialogs were never opened. A deep audit now opens every screen, every dialog one click away and every action inside it (312 in total, VI/EN × 375/1280 px, with a generated week), including option lists. It found and fixed: Shopping/Pantry/Menu dialogs, ingredient names in lists and patterns (“Đã mua Tôm”, “Cần 3 quả · Có 0 quả”), the shared shopping list, purchase-amount messages, and Vietnamese-mode English (“Nhớ nhập receipt”, “Library”, “Tick”). The missing-slot list said “Bữa tối: Bữa trưa · Món canh” (fixed). New households started in English get English default member and store names; existing family data is never renamed. | language-audit (deep, in CI) |
| — | Language | No half-translated sentences (whole-word name protection, leftover Vietnamese → whole Vietnamese sentence), new full-sentence translations, bilingual labels. | language-audit (VI/EN × 3 sizes) |

Items 2 and 15 were empty in the note.

### Second request (5 Nov 2026): attendance, packed lunches, “Tuần này ai bận”
Owner decisions (popup): compact busy box grouped by person; packed-lunch schedule per person plus an everyone row; “Chưa báo” counted like eating at home; in v1.7.5.

| Request | Change | Covered by |
|---|---|---|
| “Có lịch báo ngày nào mang đồ ăn trưa theo?” | **Lịch mang cơm** (Today → “Ai ăn bữa này?” → 🍱 Lịch mang cơm): people × weekdays with a “Cả nhà” row. Upcoming lunches of a scheduled person become “Mang đi” unless cooked/locked, the calendar has them away, or the family chose otherwise; removing a day reverts only what the schedule set (`meal.autoPacked`). Lunch-box dishes are cooked for the people packing only and planned on days someone packs. | pack-schedule (unit), v175-feedback (4 sizes) |
| Busy box grows too large | One line per person in date order (“Ba Phú vắng T5 trưa · T6 trưa · T4 11/11 trưa”), at most 3 lines, “Xem cả tuần ›”, 🍱 line for packed lunches. A day in another week shows its date (the old list ended with an unexplained “T4 trưa”); Bữa phụ has a word (it would have read “undefined”). | pack-schedule, family-calendar |
| “Chưa báo” | Counted in portions like “Ăn ở nhà”. | pack-schedule |

Data: `state.packSchedule` (`{members:{id:[weekday…]}}`, validated) and `meal.autoPacked`; both edition 6.


## Data implications
- **Edition 6** (`APP_EDITION`): new meal `snack`, dish types `dessert/snack/lunchbox`, family ingredient units such as `tép`, `đòn`. Older apps receiving edition-6 family data show “Có bản cập nhật — tải lại” and do not overwrite it. The reference-catalogue edition stays 5 (`CATALOG_EDITION`), so deleted-reference tombstones keep working (caught by catalog-fixes).
- **No stored data is rewritten.** Legacy `purposes` (main/side/friday) are read as meals; an unchanged save keeps them exactly. Saved note lines with an amount open unticked (shopping lists unchanged); name-only lines open ticked so adding an amount counts them.
- `preferences.schoolLunchbox` (new, default off). Text size and badge count are per device (not synced).
- **At deploy:** set the Studio minimum app edition to 6 (`STUDIO_MIN_APP_EDITION=6`) so every family device updates.

## Verification (local, Chromium viewport simulation)
- `npm run check`, `npm run typecheck`, `npm test` (incl. new `v175-recipes`).
- Browser suites run locally: startup, kitchen-hub, recipe-ingredients, recipe-community, menu-reactions, library-guide, catalog-filters, voice-price, voice-ios-crash, authenticated-startup, offline, alerts-online, app-update, artwork, **language-audit** (new), **v175-feedback** (new).
- Test changes follow the owner's new rules and are listed in the commits (5 suggestions, counted kitchen units, dish-type order, exact ½). recipe-ingredients now runs in Australia/Sydney time like the app: in UTC it seeded yesterday's dinner between 13:00 and 24:00 UTC.
- GitHub CI: see the PR (rule 15 — only a green run on the exact head counts).

## Responsive evidence
`docs/reviews/v1.7.5/feedback/` — mobile 375×812 (iPhone 13 profile, touch), narrow 320×640 (iPhone SE profile, touch), tablet 820×1100 (touch), desktop 1280×800: recipe form (meal types, ingredient rows), recipe detail, meal editor, Today (Lớn and Rất lớn), settings → Cỡ chữ. `docs/reviews/v1.7.5/language/` — VI/EN mobile screens. Horizontal overflow is asserted on every screen; reduced motion is on.

## Limits
- Browser viewport simulation in Chromium only — not physical iPhone/iPad/Android, Safari/WebKit or Firefox. The photo-picker fix and the badge need a check on Henry's iPhone after deploy (badge: Home Screen app, notifications allowed, iOS 16.4+).
- Reference-recipe cooking steps remain Vietnamese in English mode (owner-approved separate release); they are excluded from the language audit by name.
- The language audit covers the device-only state with a generated week: 8 screens, every dialog one click away and the actions inside them (two levels). Not covered: deeper dialogs, signed-in-only sheets, Studio and the So Giá extension.
- Reference-recipe names, preparation notes and steps are excluded from the audit by rule (separate English release).
- Text at Rất lớn is checked for overflow on the listed screens only.

### Third request (5 Nov 2026): Studio button, Studio roles, bug-report export, Pinch + WhichGrocer
Owner decisions (popup): four levels; “Sao chép cho dev”; everything in v1.7.5.
- **Studio roles** — Owner (STUDIO_ADMINS) assigns Admin / Kiểm duyệt / Hỗ trợ in Studio → Quyền Studio. Server permission matrix (`studioCan`) for Studio, feedback, So Giá, community recipes and usage; owner-only: roles, deleting/transferring accounts or families, minimum build. Audited (`studio_role_set`). Test: `studio-roles`.
- **Studio shortcut** for any Studio role: “Mở Studio / Open Studio” is the first item of the account menu (avatar) at every size, and a “Studio” button in the top bar on desktop (≥1024 px). Below 1024 px the top bar has no room (CI found 87 px horizontal overflow at 320 px; at 820 px the brand wrapped), so the button is hidden there. `op=access` answers without writing audit entries for ordinary users. Test: `ladybug:browser` section 6; screenshots `docs/reviews/v1.7.1/ladybug/studio-shortcut-*` (320×740, 375×812, 820×1100, 1280×800; browser viewport simulation, not physical devices).
- **Bug reports → developer**: `op=studio-export` (open reports: text, context, errors; never the reporter, notes or replies; audited). Test: `feedback`.
- **Online prices** (`lib/online-prices.mts`): Pinch basket compare (≤5 items/request) for catalogue items with Woolworths/Coles/ALDI channels; WhichGrocer search for a rotating few (budget 6/run, 1 request per 5 s); cross-check holds sources > 15 % apart; reviewed matcher (shared with So Giá, extended with variant words found in the live run); implausible unit prices dropped; **only owner-confirmed products are saved for families**; failure keeps the last prices with their dates. Prices join the existing official-price path (So Giá, cheapest-shop planner) with attribution. Switches `onlinePinch` / `onlineWhichGrocer` default **off**. Test: `online-prices` (mocked providers; CI needs no keys).
- **Live dry run (5 Nov 2026, local, nothing written to hosting):** 133 eligible items; Pinch 27 requests, WhichGrocer 2 credits (195 left on the trial plan). First run with a simple name guard: 113 items priced but many wrong products (coriander → rice cups, squid → fish sauce). With the reviewed matcher + new variant words: 118 items with a proposal, 3 held, 15 without a match (Vietnamese specialities such as rau muống, bún khô). Remaining wrong proposals (lime → lime & chilli tuna, beef bones → T-bone) are why the review step exists.
- **Owner steps to switch on:** keys are already in the hosting environment; after DEPLOY open Studio → So Giá → Giá online, turn on Pinch (and WhichGrocer), press “Chạy ngay”, then confirm ✓ / reject ✗ the proposals once. WhichGrocer's trial plan (200 credits/month, personal use) is not enough for a public app — their Starter plan is needed for commercial use. **Owner decision (5 Nov 2026): FamTray is private, used by Henry's family and friends only (not public, not commercial).** Whether friends' use counts as “personal use” under WhichGrocer's trial terms is for Henry to confirm with WhichGrocer; WhichGrocer uses 6 credits per run by default (Studio setting, at most 20).

### Fourth request (5 Nov 2026): price history, real / fake specials, online price on the shopping list, version number
- **Price history** (`online/history.json`): every refresh (Wed + Sat 06:xx Sydney, or “Chạy ngay”) adds one point per day for each item and retailer, owner-confirmed products only. A different product starts a new line. Kept 26 weeks / 60 points.
- **Deal check** (`dealSignal`, computed on the server at refresh and sent with each online price): usual price = median of non-special prices over the last 12 weeks (≥ 3 earlier prices needed).
  - **KM thật / Real deal**: marked special and ≥ 10 % below the usual price.
  - **KM ảo / Not a real deal**: marked special but not ≥ 10 % below usual; “giá ‘trước’ bị đẩy lên / ‘was’ price inflated” when the was-price is > 5 % above anything seen.
  - **KM · chưa đủ lịch sử / unverified**: special without enough history — never called real.
  - **Thấp nhất N tuần / Lowest in N weeks** (no special, below every earlier price); **Đắt hơn thường lệ / above usual** (≥ 10 %).
  - Limits: pack (shelf) price of the same product is compared; online prices may differ in store; first useful checks need about 1.5 weeks of runs after switching on.
- **Shopping list**: each row with a catalogue item shows the cheapest online price (by unit price when all retailers have one), the unit price, the struck-through “was” price, how many stores were compared, the deal chip and a 📈 Lịch sử button (≥ 44 px). The history sheet shows each retailer: price, product name, usual / low / high, and a chart (specials as orange dots, dashed usual line, text description for screen readers), with the provider credit. So Giá has a “Khuyến mãi tuần này / Deals this week” card (real deals and lowest prices; separate warning list for not-real specials).
- **Version number**: “FamTray · Phiên bản 1.7.5 · bản dựng dd/mm/yyyy” at the end of Account & settings (from the build, `window.BEP_VERSION`), under the Studio name (“FamTray · Bếp Gia Đình · v1.7.5”) and in full in Studio's side panel (from `/build.json`, which now carries `version`). Test: `studio-nav:browser`.
- Tests: `online-prices` (history, one point per day, product change, 26-week window, each signal, sanitising, carried to So Giá); new browser suite `test:online-prices:browser` (in `test:all`) at 320×740, 375×812, 820×1100, 1280×800, VI/EN, light/dark: chips, card, sheet + chart, ≥ 44 px, no overflow, version line. Screenshots: `docs/reviews/v1.7.5/online-prices/` (synthetic prices). Browser viewport simulation, not physical devices.

### Fifth request (5 Nov 2026): shorter online price line; own artwork rule
- Owner: the row was too busy. Each shopping row now has ONE tappable line (≥ 44 px): store mark · store · price · short chip (“KM thật −16%”, “KM ảo”, “KM”, “Thấp nhất”, “+18%”) · open arrow. Unit price, was-price, store count and the full explanation moved to the history sheet; the line's spoken label carries the full sentence. One line on tablet/desktop, at most two short lines on a phone (tested).
- History sheet: a price meter infographic per store (low → high band, today's price dot coloured by the check, usual-price tick, text description), then the chart.
- Owner rule 19–21 added to AGENTS.md: own drawings instead of emoji, one style shared with the `tpn` art kit. New kit `src/frontend/ui-art.ts` (cart, flame, warning, tag, arrows, chart, chevron, store marks), used by every new online-price element; motion stops under reduced motion. The rest of the app still has 170 distinct emoji (663 uses in 39 files, recipe catalogue excluded) — to be replaced screen by screen in a planned release.
- Owner (5 Nov): item names fell onto a second line next to the amount. In the shopping list (simple view) the name now has the whole first line; amount and cost sit on the line under it; the amount stepper never wraps. Tested at 320/375/820/1280 (`online-prices:browser`: name on one line, amount below it); price-scout, units, v175-feedback, recipe-ingredients and kitchen-hub browser suites re-run locally and pass.

### Sixth request (5 Nov 2026): shop by distance — trip plans
Owner decisions (popup): the family writes travel minutes per store; choose a plan each trip; in v1.7.5.
- **So Giá → “Đi chợ thế nào? / How to shop this week”** (first card): three plans, each with total, approximate trip minutes, number of stops and how many items get a price:
  - **Gần nhất / Nearest**: fewest minutes that still prices ≥ 80 % of the items that have a price anywhere.
  - **Cân bằng / Balanced** (default): owner (5 Nov): time is never turned into money. The cheapest plan with ≥ 80 % of the items whose trip is no longer than halfway between the nearest and the cheapest plan. Each plan shows how much longer it takes and how much cheaper it is than the nearest one.
  - **Rẻ nhất / Cheapest**: every priced item, lowest total, then fewest minutes.
  - The chosen plan lists its stops nearest first, with minutes, subtotal and the items to buy there (gom hàng theo nơi); “Giống phương án …” when two plans are the same.
- **Thời gian đi tới từng nơi**: one-way minutes from home to the branch the family uses, per store (0–240). Not filled in = 10 min, shown as “tạm tính / estimate”. Trip minutes ≈ each store's one-way minutes + the farthest store's way home. Saved on this device only (with the family's other So Giá settings); not shared with anyone. Delivery (Amazon) is not part of a trip.
- Limits: minutes are what the family writes (no maps or location); the route estimate assumes stores lie roughly on one loop; plans cover in-person stores with a price (family, online or community).
- Layout: three columns where there is room, three stacked rows on phones (container query); new drawings: clock, route, shop. Tests: `price-scout` (nearest / balanced with time value / cheapest, estimate flag, coverage, minutes), `online-prices:browser` (tabs, default, minutes saved, plan switch, stops grouped, ≥ 44 px, no overflow / nothing cut off at 320/375/820/1280, VI/EN, light/dark). Screenshots: `docs/reviews/v1.7.5/online-prices/trip-plans-*`.

### Seventh request (5 Nov 2026): smaller recipe library; trip plans without money per minute
- **Trip plans**: owner: time is never turned into money. “Cân bằng / Balanced” = the cheapest plan with ≥ 80 % of the items whose trip is no longer than halfway between the nearest and the cheapest plan. Each plan shows “lâu hơn N phút · rẻ hơn $X” compared with the nearest. The $-per-10-minutes setting is gone.
- **Recipe library 740 → 475** (owner chose from the ranking page): every Western, healthy, seed-salad and dressing recipe (206) and the 54 original recipes stay; the Vietnamese expanded recipes are halved evenly within main / soup / veg / noodle (534 → 269), near-duplicates, long and ingredient-heavy recipes first. 265 retired ids are listed in `recipe-catalog.ts` (`RETIRED_REFERENCE_IDS`).
- **Existing families** (catalogue edition 6): a retired recipe leaves a family's library only if the family never touched it — not edited, not a favourite, no photo, and its id appears nowhere else in their data (menus, history, reactions, shopping). Removed ids are tombstoned so an older copy or another device cannot bring them back. Kept copies keep their painting. Retiring runs only after the lazy catalogue data has loaded. Family-authored recipes are never touched (rule 6).
- Tests: unit suites updated to 475; new `v175-recipes` case (untouched removed + tombstoned; favourite / edited / photo / planned / mentioned kept; family recipe untouched); `offline-downloads` and `artwork` browser suites updated (the static artwork audit gallery still documents all 740 paintings).

### Eighth request (5 Nov 2026): product photos for ingredients; drawings for the rest
- Owner decision: ingredient and product pictures use the supermarket product photo (Coles / ALDI / Woolworths / Harris Farm via Pinch or WhichGrocer) of the **owner-confirmed** product; recorded in AGENTS.md rule 19. Photos only from the supermarkets' https image hosts (or WhichGrocer's copy); `grocery?op=photos` serves the list (no family data); the app keeps it on the device and refreshes it every 12 h.
- The photo sits over our drawing: offline or a broken photo shows the drawing, never an emoji. Studio's ✓/✗ review shows a thumbnail of each proposed product.
- Live probe (5 Nov, local, nothing written to hosting): 105 of 136 catalogue items have a product photo. Of the 31 without, 18 already have an ingredient drawing; 14 new drawings in the shared style (`ui-art.ts` `item:*`): giá đỗ, hành tím, thịt heo xay, bò tái, chả lụa, lạp xưởng, cá thu, mực, đường phèn, bột ngọt, bún khô, rong biển, Finish, nước lau sàn (sheet: `online-prices/new-item-drawings.png`).
- Until the owner confirms products in Studio, items show their drawing (ingredient drawings, the 14 new ones, or the plain basket for the rest).
