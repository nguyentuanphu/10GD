# v1.7.8 — owner report of 6 Nov 2026, 14:13–14:15 Sydney time (iPhone, after the v1.7.7 deploy)

Branch `release/v1.7.8` from `main` at `f938dcc` (Release v1.7.7). **Not deploy-approved.** It needs green GitHub CI on the exact head commit and Henry's explicit DEPLOY (AGENTS.md rules 1–5, 15, 18, 23).

## What Henry reported and what changed

| # | Report | Cause | Change |
|---|--------|-------|--------|
| 1 | “Ở mỗi thứ không cần ghi lại sáng trưa tối nữa, tôi chỉ nói là tại chỗ đó cho thêm option để thêm và bỏ cho sáng trưa tối và các bữa phụ, và sáng trưa tối thì luôn hiện, ví dụ xoẹt qua trái hay phải để xoá” | v1.7.7 listed every meal and its dishes on the day line. Removing a meal was a text button under each card, and adding one was a row at the bottom of the day. | The day line now shows only the day, the date, a short count (*3 bữa · 2 món*) and a **Bữa ±** button. That button opens the day's five meals (Bữa sáng, Bữa phụ sáng, Bữa trưa, Bữa phụ chiều, Bữa tối) as ticks, so any meal is added or removed in that one spot. Breakfast, lunch and dinner still show by default. **Swiping a meal card left or right** past about a third of its width removes that meal. The card follows the finger and a red *Bỏ bữa …* shows underneath. A short swipe springs back, vertical scrolling is untouched, and a meal with dishes asks first. The old per-card remove buttons and the add row are gone. A removed meal comes back from **Bữa ±**, so the swipe is never the only way. Cooked and batch meals cannot be swiped. Motion stops under reduced motion. |
| 2 | “Giá online đã load nhưng nhìn không rõ cái nào là cái nào, và tại sao lại xác nhận thêm lần nữa?” | Studio showed one wide table row per product. On a phone the item, store, product and price columns were squeezed together, and every row had ✓ and ✗ even though auto-confirm (on by default since v1.7.7) already shows the products to families. | Studio now shows **one card per item** (e.g. *Quả bơ · Avocado*). Inside it there is one line per supermarket: the store name in its colour, the product photo, the product name, the price and the unit price. With auto-confirm on, the title reads **Sản phẩm đang hiện cho gia đình**, the note says nothing needs confirming, and the only button is **Sai món** (wrong product: hides that price at once; the next run finds another product). ✓ and **Đúng hết** only appear when Henry turns auto-confirm off. The switch's label now says the same thing. |
| 3 | “Đã thấy nút round up nhưng không có nút round down?” | v1.7.7 had one button. Rounding down was hidden in the long-press options. | **≈↓** and **≈↑** sit side by side next to the amount. Each tap moves one step down or up; a long press still opens the step choice (automatic, 50 g … 1 kg). The amount and the two buttons share one cell, so they wrap together. At 320 px the store button used to land on top of a second button. |
| 4 | “Giá online cũng chưa hiện luôn” (after the first real run) | Three causes. (a) The app only fetched prices when **Làm mới giá** was pressed, and nothing fetched them after a run. (b) The server only returned online prices when the family had given a postcode, but online supermarket prices are national. (c) The family's own items, such as **Sườn bò** and **Thịt bò gravy**, had no item in the price catalogue, so Pinch was never asked for them. The production photo list was updated today, which shows the first run did save prices. | (a) Opening **Đi chợ** fetches the prices quietly when the copy on the device is more than 3 hours old. This happens at most once every 10 minutes, only online and signed in. (b) A family without a postcode still gets the online prices; only the licensed state feed needs the state. The list shows online lines before a postcode is given. (c) 28 staples were added to the catalogue (164 items, up from 136). They cover beef short ribs (*Sườn bò*), gravy beef (*Thịt bò hầm / gravy beef*), brisket, steak, pork loin, pork chops, pork hock, lamb, chicken mince and drumsticks, plus app ingredients that had no catalogue item (udon, pasta, cooking cream, parmesan, mozzarella, feta, asparagus, almonds, walnuts, chickpeas, lentils, kidney beans, quinoa, couscous, miso, chia, sultanas, Dijon mustard). Every online item still fits one Pinch refresh (33 of the 40 allowed requests). |

## Also fixed

- `test:studio-online:browser` (added in v1.7.7) was **not in `test:all`**, so GitHub CI never ran it. It is now in `test:all` (rule 14).
- After a swipe, the next tap within 0.4 s was swallowed. The guard now ends at the next touch.

## Tests

- **`test:v176-fixes:browser`**, at 320, 375, 820 and 1280 px in VI and EN:
  - the day line has no meal names, shows *N bữa · N món*, and stays short;
  - **Bữa ±** is 44 px tall, lists all five meals, and adds or removes the afternoon snack, the morning snack and breakfast without folding the day;
  - a swipe left removes the morning snack, and a short swipe keeps lunch;
  - a swipe right removes breakfast (after asking when it has dishes), and **Bữa ±** brings it back;
  - no per-card remove buttons are left;
  - **≈↓** and **≈↑** sit on one line, are 44 px, and nothing covers them;
  - ≈↑ rounds up, ≈↓ rounds down, and the options still round down.
- **`test:studio-online:browser`**, at 375, 820 and 1280 px, VI and EN, light and dark:
  - one card per item, with the store named;
  - with auto-confirm on there is no ✓ and no **Đúng hết**;
  - **Sai món** is 44 px, sits inside its line, rejects the product and removes the card;
  - with auto-confirm off, ✗ and then **Đúng hết** confirm the rest.
- **`test:online-prices:browser`**:
  - with no postcode and a 5-hour-old copy, opening **Đi chợ** fetches the prices by itself (without a state, and quietly);
  - the family's **Sườn bò** shows *Coles $22.00*;
  - a fresh copy is not fetched again.
- **`grocery-api`**: with no state the online prices are returned; NSW gets the state feed plus online prices; QLD gets online only.
- **`price-scout` / `scout-scanlist`**: the catalogue count went from 136 to 164, and the size range from 120–150 to 120–200. The new ceiling is the Pinch budget of one refresh, and a new assertion checks that every online item fits it. No other assertion was removed or weakened.

## Local checks run

`npm run check`, `npm run typecheck` and `npm test` pass. The touched browser suites (`v176-fixes`, `studio-online`, `online-prices`) pass; the full local browser run is recorded below.

## Evidence (Chromium viewport simulation, not physical devices)

- **Weekly menu** (day line and **Bữa ±**): `docs/reviews/v1.7.8/{vi,en}-{narrow,mobile,tablet,desktop}-planner-days.png`
- **Swipe in progress**: `docs/reviews/v1.7.8/{vi,en}-mobile-swipe-meal.png`
- **≈↓ ≈↑**: `docs/reviews/v1.7.8/{vi,en}-{narrow,mobile,tablet,desktop}-round-buttons.png`
- **Studio products**: `docs/reviews/v1.7.8/online-products-{vi-light-mobile,en-dark-tablet,vi-light-desktop}.png`
- **Online price on the family's Sườn bò, no postcode**: `docs/reviews/v1.7.8/online-auto-suon-bo-375x812.png`

The swipe gesture was tested with Chromium pointer events. Henry should try it on the iPhone after deploy.

## After deploy (owner)

1. Studio → **Giá online** → **Chạy ngay** once, so Pinch is asked for the 28 new items (Sườn bò, gravy beef …).
2. In the app, open **Đi chợ**. Prices load by themselves within a few seconds; **Làm mới giá** still works.
3. In Studio, press **Sai món** on any wrong product. Nothing else needs confirming.
