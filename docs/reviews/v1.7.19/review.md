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

## Audit fixes — weeks, dishes and recipes, pantry entry, empty states

Branch `agent-w3/fixes` (from 016f9ed). Henry, 12 Nov 2026: the first day of the week is a family choice; never assume Monday.
Weeks stay stored under their Monday. New accessors in `core.ts`: `dayAt(state,date)` (a day, always in its Monday-keyed week) and
`menuWeekKey(state,date)` (the stored week that holds the bought marks / extras of the family's menu week, as `planWeek` uses).
`planStartOf` only places the 7-day window. `mealAt` now reads the Monday-keyed day first. `mergeGhostWeeks` (run in
`upgradeReferenceCatalog`, i.e. on every load and sync load) folds the hidden copies earlier releases wrote back into the real days
(guests, served leftovers, plans made only in the copy, list lines), then removes them; running it again changes nothing.

| Finding | What changed | Test |
|---|---|---|
| B1 | Guest sheet, guest save loop, next meal, guest meal types, upcoming guests (`family-menu-ui.ts`), next meal, RSVP guests, leftover serve, upcoming (`family-flow.ts`) use `dayAt`. Ghost weeks merged on load. | week-start.test (Sat/Sun/Mon), v1719 browser (guest sheet, Sat and Sun) |
| B2 + sweep | Search reads `weeks[monday(d)]`; receipt matching / receipt weeks use `menuWeekKey` / `planWeek` (deduped by stored week); voice undo (`voice-commands.ts`, `personal-ui.ts`) stores the stored key. Sweep also fixed: “Nấu mỗi bữa” planning wrote into a hidden Saturday copy (`personal-core.ts` → `planWeek`); sync load created a ghost (`family-features.ts:47`); “Nhờ mua thêm” put the line in the wrong menu week for Mon–Fri dates of a Sat-start week (`push-ui.ts`); after voice / errand the view jumped to a Monday week; setup preview; ladybug workflow `weekOf`; “Tuần này ai bận” labels use the family week. | week-start.test, v1719 (search Sat/Sun, voice undo EN) |
| C8 | Reconcile undo record keeps `weekKey` (Monday of the menu-week start); older records are read through their Monday. | week-start.test (Sat/Sun/Mon, old record) |
| A7 | Đi chợ with no dish planned in the range: “Chưa có món nào trong thực đơn những ngày này” + “Mở Thực đơn tuần”. “Đã đủ” only when meals exist. | v1719 |
| A16 | Tủ stat cards and the “cần dùng sớm” count use the lots the list shows. | v1719 |
| A13 | Dish × and “Bỏ hết món” show an undo bar (dish back in its place, typed dishes included); the page stays still (these buttons opt out of the generic hold, whose selector cannot tell one meal's dishes apart). | v1719 (scroll checked) |
| A14 | Dish sheet: library-only buttons only for library dishes; a typed meal-only dish gets “Sửa và lưu vào kho món” (saves it with the same id, opens Viết món); “Chế độ nấu” only when the dish has steps; “Xóa khỏi kho” no longer claims success when nothing was deleted; add-to-meal errors are specific. | v1719 |
| B14 | “Chế độ nấu” gets the meal (date/type), uses the meal's dish and shows the same scaled ingredient list and portions as the dish sheet. | v1719 (text equal to the sheet) |
| A15 / B10 / C25 | One rule `pantryLotDefaults(state,id)` (place from `suggestStorePlace`, use-by from `suggestUseBy`). Tủ “Thêm thực phẩm”: no ingredient or place preselected; choosing one fills place and use-by (editable); counted units step by ¼; wrong amount / no ingredient says why; `storedOn` set. Voice “còn N …” adjusts existing lots (use first reduced first, more → a new lot with the shared suggestion), keeps use-by and buying units; lots in another unit → asks to edit in Tủ; undo restores the lots. | v1719 |
| A21 | “Thêm vào bữa ăn” lists every meal (incl. Bữa phụ sáng / chiều); preselects the meal it came from, else the dish's own meal tags, else “— Chọn bữa”. | v1719 |
| A22 | “Vai trò món” starts empty; suggested only from the typed name (canh/soup, phở/bún/mì, rau/gỏi, chè) or a known dish; asks when empty. | v1719 |
| A23 | Staples-only pantry: the card explains instead of offering an empty sheet; an empty suggestion sheet explains and links to Tủ / Kho món (links close the sheet). | v1719 |
| A24 | “Người nhờ mua” uses the linked member, “Ai đang dùng máy này?” or the reminder profile; otherwise “— Chọn người nhờ mua”, required. | v1719 (helper) |
| A19 | Giá → “Lưu từ hóa đơn” with no lines explains and offers “Chụp / nhập hóa đơn”. | v1719 |
| A20 | One label “Chụp / nhập hóa đơn”; the aside button only shows when receipts exist. | v1719 |
| B23 | Import from a link opens Viết món as an unsaved draft (title “Xem lại món trước khi lưu”); dish type, protein and servings the page does not give are left to choose; saved only on Lưu, with its source. | v1719, v1715 and v1716 updated |
| B11 | One rule = the Viết món save. Import writes lines as the family would type them; tbsp / tsp become “muỗng canh / muỗng cà phê” as written (never 15 / 5 ml; cup is kept as words); dictation writes Viết món units (muỗng canh, tép, củ…) as structured lines instead of notes. No quantity is invented. | v1719, v1715 |

Quick add in journey, v176-fixes and authenticated-startup now chooses the dish role (A22). Tests that asserted the old behaviour and were changed to the correct one: v1715 (import saved before review, “2 tbsp” → 30 ml fish sauce), v1716 (read the auto-saved import), and the ladybug import workflow now picks the dish type / protein as the family would.

Not changed: receipt lots keep an empty use-by (v1.7.18 rule asserted by three suites; the receipt flow does not show the date for review). Whether spoon amounts should be added to the shopping list as written (Viết món's existing v1.7.5 rule, now used by every path) is a product decision for Henry.

Evidence: `docs/reviews/v1.7.19/weeks-dishes/` — 320×740, 375×812, 820×1100, 1280×800, light and dark, VI and EN, Sat and Sun week starts, phone time zones Sydney, Ho Chi Minh, Los Angeles. Chromium viewport simulation, not physical devices. Every run ends with `validImport(state)` true.

Local runs, 12 Nov 2026 about 18:35 Sydney time: check, typecheck, `npm test` (incl. week-start), browser suites v1719-weeks, v1715, v1716, v1717, v1714, v1712-fixes, v1712-flow, voice-commands, receipt-list, recipe-ingredients, pantry-check, journey, language, emoji-art, v176-fixes, ladybug, rsvp, menu-reactions, authenticated-startup — all OK. An app.ts first draw before the language helper loaded crashed `#shopping` start-up during this work; new app.ts render strings use a load-safe helper.
