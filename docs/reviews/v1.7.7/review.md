# v1.7.7 — online prices actually run (owner report 6 Nov 2026, 11:52 Sydney time)

Branch `release/v1.7.7` from `main` at `d366930` (Release v1.7.6). Waits for green PR CI and Henry's DEPLOY (AGENTS.md rules 1–3, 15, 23).

## What Henry reported
Studio → Giá online → **Chạy ngay** showed “Request failed” every time. “Lần chạy gần nhất” still read 06/11/2026 06:54 · skipped (switched off). The app showed no online prices: “Đã có giá: 0/6 món”.

## Why
1. **A full refresh never finished.**
   - It makes about 28 Pinch basket calls (136 catalogue items, 5 per call) and up to 6 WhichGrocer calls, which must be 5 s apart. That takes more than a minute.
   - A normal server request is cut off after a few seconds, so the request was stopped and Studio showed the generic “Request failed”.
   - The 06:xx Wednesday and Saturday schedule had the same limit, so no price was ever saved.
2. **Prices appear only after review.** Families see a price only for products the owner confirmed (✓) under **Duyệt sản phẩm**. With no finished run there was nothing to review, so the list showed 0.

## Changes
- **Refresh runs in the background:** new `online-prices-background` function, allowed up to 15 minutes.
  - **Chạy ngay** and the schedule only start it, with a one-time token kept in the price cache. A wrong or reused token is refused.
  - A second press while a run is going starts nothing new.
- **Studio → Giá online:**
  - While a run is going, the page shows “Đang chạy từ HH:MM (giờ Sydney) — thường mất 1–3 phút” and refreshes itself every 10 s.
  - A run that did not finish says so, and **Chạy ngay** tries again.
  - With both switches off, **Chạy ngay** says “Hãy bật Pinch hoặc WhichGrocer trước”.
- **Duyệt sản phẩm:** a new **✓ Đúng hết (N)** button. Skim the list, press ✗ on the wrong rows, then confirm the rest in one go. It is audited like the single ✓.
- Release 1.7.7.

## Tests
- `studio` (unit):
  - with the switches off, Run now gives a clear message;
  - Run now starts the background function once, with a one-time token;
  - the background function refuses a wrong or reused token, calls Pinch, and records the end of the run and its status.
- New `test:studio-online:browser` (in `test:all`), against the real Studio handler at 375×812 VI light, 820×1100 EN dark and 1280×800 VI light:
  - each switch sits on one line;
  - Run now shows “running since … (Sydney time)”;
  - ✗ on one row, then **Đúng hết** confirms the others and leaves the ✗ row rejected;
  - no horizontal overflow.
  It caught a real bug before release: after a ✗, “Đúng hết” confirmed the wrong rows.
- Local: `npm run check`, `npm run typecheck`, `npm test`, `studio-nav`, `online-prices` and `scout-studio` browser suites pass.

## Limits
- Pinch and WhichGrocer were not called for real here; the tests use synthetic responses.
- The real run, and how long it takes, will show in Studio after deploy.

## After deploy (owner)
1. Studio → Giá online → **Chạy ngay**. Wait 1–3 minutes; the page updates by itself.
2. Under **Duyệt sản phẩm**, press ✗ on wrong products, then **✓ Đúng hết**.
3. Open Đi chợ in the app and press **Làm mới giá**. Online prices show for the confirmed products.

## Second round (owner, 6 Nov 2026, 12:35–12:36 Sydney time)

| Owner | Change |
|---|---|
| “Thêm nút round up hay down ở đây, ấn lâu sẽ có option để round up hay down theo từng bước hoặc tự động” | Each shopping amount sold by weight, volume or count gets a **≈↑** button (44 px). A tap rounds one step in the chosen direction: 1.42 kg → 1.5 kg, and the next tap goes to the next step. Holding it (or right-click / Shift+click) opens the options. **Hướng:** lên / xuống. **Bước:** tự động by size (50 g under 250 g, 100 g under 1 kg, 250 g under 3 kg, then 500 g), or a fixed 50 g, 100 g, 250 g, 500 g or 1 kg (ml/L likewise; 1, 2, 5 or 10 for counted items). The choice is remembered for the family. It changes only the amount to buy for the dates shown. **Dùng lượng tự động** (in the options or the picker) undoes it. Items bought by pack are left alone. |
| “Khi tôi ấn vào trọng lượng thì lại có thêm 1 đống cân đo đong đếm… chỉ nên hiện tại bước tạo món ăn” | In the shopping amount picker the unit chips are folded under **Đơn vị mua: kg · Đổi**. The amount wheel comes first. The chips open when the family taps **Đổi**, or when the item is already bought by pack. Recipe writing is unchanged. |
| “Trong các thứ ở thực đơn nên để collapsable và mỗi thứ phải thể hiện rõ” | Each day of the weekly menu folds under one clear line: day, date, a **Hôm nay** tag, and what each meal has (“Bữa sáng: 2 món · Bữa trưa: — · Bữa tối: 3 món ✓”). Today and the selected day open by themselves. Days the family folds stay folded for the visit. |
| “Tại sao tôi không thấy bữa trưa? … Nên luôn có bữa sáng, trưa, và tối, bữa phụ optional và add/removable” | Breakfast, lunch and dinner always show; weekday lunch used to be hidden when empty. **Bữa phụ** is per day: **+ Thêm bữa phụ** / **Bỏ bữa phụ**, and removing a snack that has dishes asks first. A cooked snack cannot be removed. The auto-plan fills Bữa phụ only on days that have it. Stored meals are unchanged (`day.snack.on`). |
| “Ở phần duyệt sản phẩm vì nó là giá thật online của các cửa hàng thì nên để default On” | New Studio switch **Tự hiện sản phẩm đề xuất cho gia đình**, on by default. Proposed products show to families straight away and stay listed under **Kiểm tra sản phẩm đang hiện**. ✗ hides that price at once (it is taken out of the current week's prices) and the next run proposes another. Turning the switch off brings back review-first mode. |

### Tests (second round)
- **`online-prices` (unit):**
  - auto mode shows unrejected proposals and still lists them;
  - review-first mode shows nothing before ✓;
  - the earlier review-first assertions now set `onlineAutoConfirm:false` explicitly, so they still test that mode.
- **`v175-recipes`:** Bữa phụ is filled only on the three days that have it, and stays empty elsewhere. This replaces the v1.7.5 “every day”, which the owner reversed.
- **`v176-fixes` browser, now also covering v1.7.7:**
  - 7 day sections, with only today open at first;
  - breakfast, lunch and dinner are shown;
  - a folded day's line names the meals;
  - Bữa phụ can be added and removed;
  - the round button: a tap rounds up, and the options round down;
  - the round button is a 44 px target.
- **`authenticated-startup` and `menu-reactions`:** they edit or react on a meal of an open day, since the days now fold. Each check is unchanged.

## Third round (owner, 6 Nov 2026, Sydney time)

| Owner | Change |
|---|---|
| “Luôn có đủ 3 bữa và thêm bớt được” | Every day starts with breakfast, lunch and dinner. Each meal has **Bỏ bữa sáng / trưa / tối / phụ** under its card. A meal with dishes asks first; a cooked meal or a Weekends-feast meal cannot be removed. The day's **Thêm bữa** row brings back a removed meal or adds Bữa phụ. A removed meal is stored as `meal.off` (Bữa phụ as `meal.on`). The auto-plan leaves removed meals empty. A meal that still has dishes always shows, so nothing planned is hidden. |
| “Thịt được định lượng tự động… muốn mua dư thêm để làm chuyện khác thì làm thế nào?” | In the buying picker, **Mua dư thêm: +100 g · +250 g · +500 g · +1 kg** (+1/+2/+5 for counted items) adds on top of the amount. **Mua thêm để làm gì** takes a short reason, e.g. “làm chả”. The shopping row then reads **mua dư +500 g · làm chả** in orange, so the extra is clearly on purpose. The reason is kept for the dates shown (`week.buyNotes`). **Dùng lượng tự động** clears both. For weighed items, the absolute 250 g / 500 g / 1 kg / 2 kg buttons are hidden, because the + buttons replace them and two rows of amounts were confusing. |

Tests:
- **`v176-fixes`:**
  - breakfast is removed for the day, then added back;
  - Bữa phụ is added and removed;
  - +500 g with a reason shows on the row, and the automatic amount clears it.
- **`catalog-filters`, `recipe-community`, `authenticated-startup`, `menu-reactions`:** they act on a meal of an open day, since days now fold. Their checks are unchanged.
