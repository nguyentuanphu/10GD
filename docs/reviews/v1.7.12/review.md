# v1.7.12 — after-deploy fixes, “cook once for several meals” and guests

Henry's feedback on v1.7.11, 8 Nov 2026 (~06:45 Sydney time), with iPhone screenshots. Branch `release/v1.7.12`.

## 1. Round up / down buttons “không đồng đều”
- **Cause:** the amount and its two round buttons shared a wrapping cell, so the buttons sat *beside* a short amount (“9 quả”) and *under* a long one (“0.4 hộp”). Each button also showed its drawn arrow plus a text arrow (↓ / ↑).
- **Now:** on every row and every screen size, the amount sits on top and the two round buttons sit under it, sharing its width (two equal halves, each ≥ 44 px). The text arrow is hidden when the drawing shows.

## 2–3. Pages jumping on pantry chips (Tất cả → Ngăn mát …) and on “Trừ đồ đang có trong Tủ”
- **Cause 1:** “Trừ đồ đang có trong Tủ” is a checkbox. The rule-24 keep-in-place code only held buttons, tabs and links.
- **Cause 2:** when a redraw makes the page shorter (a filter with few items, a list with stock taken off), the browser must scroll up, so the tapped control moved. Chrome's scroll anchoring hid this in most of our tests; iPhone Safari has none.
- **Now:** the checkbox is held like a button. When the page gets shorter, an empty spacer under the page keeps the tapped control where it was. The spacer shrinks as the person scrolls back up and goes when the screen changes.
- **Reproduced before the fix:** WebKit (iPhone 15 Pro Max emulation): chip 20 → 71 px. Chromium without scroll anchoring: “Trừ đồ” 20 → 46 px. The new browser suite fails on the old code and passes now.

## 4. “Xong” not centred
- **Cause:** a sheet footer with one button used `justify-content:end` with a button up to 320 px wide, so on phones wider than 375 px it sat to the right (29 px off on a 430 px phone).
- **Now:** a lone footer button is centred. This applies to every sheet with one footer button. Sheets with 2–3 buttons are unchanged (same size, side by side, rule 25).

## 5. “Giải phóng tủ lạnh” button hard to read and too long
- **Now:** the text uses the full card width. One short button, **Gợi ý món từ tủ** (*Dishes from the fridge*), and the **Mở tủ →** link sit on their own line underneath, both ≥ 44 px tall.

## 6. Cook once for several meals (owner decision, pop-up 8 Nov 2026: “Hỏi khi bấm Đã nấu”)
- **When it asks:** tapping **Đã nấu** on a meal whose dish is also in the next meals (same dish, up to 3 days on, not cooked yet, not part of a Weekends feast batch) opens **“Nấu luôn cho bữa sau?”**. Each of those meals is listed and ticked; the family can untick any.
  - **Nấu luôn** (drawn) takes the pantry **once**: this meal plus the later portions of that dish, worked out from each later meal's own people and portions. The dish in the later meal is marked **cooked ahead**: it is no longer taken from the pantry again and is not on the shopping list. A later meal whose every dish was cooked ahead counts as cooked. Its card says *“Đã nấu sẵn cùng bữa tối 8/11: …”*.
  - **Chỉ bữa này** keeps the old behaviour.
- **Undo:** “Bỏ đánh dấu đã nấu” on the first meal gives back everything that was taken and reopens the later meals. If a later meal was cooked on its own in the meantime, the app first asks to undo that meal.
- **Data:** new optional fields only: `meal.aheadFor`, `meal.cookedWith`, `dish.cookedAhead`. Older data and backups are unchanged and still valid. Family-authored recipes are untouched.
- The Weekends feast batch keeps working as before.

## 6b. Guests (owner, 8 Nov 2026, Sydney time)
- **Asked:** *“ăn nhiều người như kiểu bạn qua chơi… add thêm số lượng người để biết số lượng thực phẩm cần mua”*.
  - Pop-up 1: guests with a name.
  - After seeing the first version: *“nút thêm khách nên để gọn hơn, chỉ hiện khi cần… nhiều khi sẽ có nhiều gia đình hoặc cá nhân nữa”*.
  - Pop-up 2: as proposed, *“và khách có thể đến đột xuất trong ngày hay vài ngày tới nên cần làm cho hợp lý”*.
- **Before:** the only way was to type a total in **Sửa bữa → Khẩu phần bữa**. That needed adding up by hand, replaced the automatic count and said nothing about guests.
- **Where:** guests are added where people are already counted, so meal cards carry no extra button.
  - **Short notice (today):** Today → **Ai ăn bữa này?** → the **Khách** row at the end of the family list → **Thêm khách** (or **Sửa**). This works for the meal tab being looked at.
  - **A few days ahead:** Thực đơn → **Có khách** (one button in the week tools). It opens on the next meal that is not cooked yet, from the day being looked at.
  - **Meal cards:** only a meal that has guests shows one short line, *“Khách: 3 khách, 1 bé · Nhà anh Tuấn, Chị Lan”*. The line wraps inside the card, is a ≥ 44 px target and opens the same sheet.
- **One sheet:**
  - **Bữa nào?** — *Từ* (date + meal) and *Đến* (date + meal). It defaults to the meal it was opened from, and lists the meals it covers (e.g. *“4 bữa: CN 8/11 bữa sáng · … (bỏ qua 1 bữa đã nấu)”*). Cooked meals are skipped and left as they were.
  - **Guest groups** (up to 10): each has a name (optional, e.g. *Nhà anh Tuấn*), **Người lớn** (1 portion) and **Trẻ em** (½ portion) with drawn − / +, and a drawn remove. **Thêm nhóm khách** adds another family or person.
  - **Khách quen** (regular guests): named groups are remembered (newest first, up to 20) and offered as chips. One tap fills a group. A group already in the sheet is not offered again.
  - The running total reads *“Thêm 3,5 suất mỗi bữa”*.
  - **Đóng / Lưu**.
- **Counting:** guests are added on top of the family's own portions, which still follow attendance. The portion line reads *“4 người + 3 khách, 1 bé → 7 suất”*. The shopping list and the pantry deduction use the total. Sharing the day's menu adds *“(+3 khách, 1 bé · Nhà anh Tuấn, Chị Lan)”*.
  - **Portions set by hand** stay as typed. The sheet says so and points to *Sửa bữa*.
  - **Cooked meals** keep their guests unchanged.
- **Data:**
  - optional `meal.guests = [{name?, adults, kids}]` (whole numbers 0–30, name ≤ 60, ≤ 10 groups);
  - optional `state.guestBook = [{name, adults, kids}]` (≤ 20, a name required).
  - Both are validated on import and sync. With no guests the field is removed.
- **Drawings:** a new **minus** drawing in the shared style (circle with a bar) sits next to the existing **add**. The group remove uses **trash** (rule 20).

## 7. Tests that broke on Sundays (fixed during the v1.7.11 deploy, kept here for the record)
`journey`, `family-calendar` and `v176-fixes` now keep the day and its plan week together (see v1.7.11 record).

## Tests
- **Unit** (`core.test`): which meals are offered (later only, up to 3 days, only the shared dish); pantry taken once for both meals; the later meal drops off the shopping list and pantry deduction; undo gives everything back and clears the marks; undo waits while a later meal was cooked on its own; a fully cooked-ahead meal counts as cooked and reopens on undo; backups still validate.
- **Guests (unit):** groups with trimmed names, empty groups dropped; adult 1 / child ½ across groups; amounts to buy go up; backups validate; negative, fractional and non-list values rejected; portions set by hand stay; caps (30 per group, 10 groups); cleared when empty; regular guests remembered by name (newest first, no duplicates, unnamed not kept, name required, can be forgotten); meals from Saturday dinner to Sunday lunch in order; an empty range when the last meal is before the first.
- **New browser suite `test:v1712-fixes:browser`** (in `test:all`), at 320×740, 375×812, 430×932, 820×1100 (VI) and 1280×800 (EN). It runs with scroll anchoring off (as on iPhone Safari) and checks:
  - round buttons under the amount, same width, equal halves, ≥ 44 px, one arrow;
  - “Trừ đồ” tick on/off and pantry chips stay put (≤ 2 px), including when the page gets shorter, and the spacer goes after scrolling up;
  - “Xong” centred and visible;
  - the use-it-up button sits under the words, short label, ≥ 44 px;
  - cook-ahead sheet: tomorrow's lunch offered and ticked, two same-size footer buttons side by side, drawing on “Nấu luôn”; after **Nấu luôn** tomorrow is cooked ahead with nothing left to buy and shows the note; undo gives everything back; **Chỉ bữa này** cooks only tonight;
  - guests: no guest button on meal cards without guests; **Thêm khách** from “Ai ăn bữa này?” ≥ 44 px; − / + / × drawn, no leftover symbol, ≥ 44 px; two groups (Nhà anh Tuấn 2 + 1 bé, Chị Lan 1) from today to tomorrow breakfast; total *Thêm 3,5 suất mỗi bữa*; Đóng / Lưu side by side, same size, drawn; saved on every open meal in the range, cooked meals untouched, +3.5 portions, both remembered; the card line counts and names them, stays inside its card; **Có khách** on the week menu opens on a meal that can take guests and offers the regular guests in one tap;
  - no horizontal overflow, no page errors.

## Evidence (Chromium and WebKit viewport simulation, not physical devices)
- **Chromium:** `docs/reviews/v1.7.12/{round-buttons,done-centred,pantry-chips,use-it-up,cook-ahead-sheet,cooked-ahead-note,guests-sheet,guests-card,guests-regular}-{vi,en}-{size}.png`.
- **WebKit, iPhone 15 Pro Max emulation (430 px):**
  - after the fix: `webkit-iphone15promax-{round-buttons,done-centred,use-it-up}.png`;
  - before the fix: `before-webkit-iphone15promax-done-off-centre.png`.

## Limits
- Browser simulation only (Chromium 156 and WebKit 27.2 with iPhone emulation). Not tested on a physical iPhone; momentum scrolling and the Safari toolbar can still behave differently.
- The cook-ahead offer looks 3 days ahead and matches the same dish (same recipe). A different dish made from the same ingredients is not linked.
- Seen in the screenshots, not changed: meats such as *Sườn bò* are stored under **Tủ khô** in the family's pantry. That is family data; it is not moved automatically.
