# v1.7.17 — the sliding bar shows it slides; tonight's start-cooking time

Times are in Sydney time. **Not deploy-approved.** Nothing is merged or built on hosting until Henry says DEPLOY.

## 1. Bottom bar on phones (owner, 9 Nov 2026, 07:19)
*“Phần menu ở dưới không có sign để biết là có thêm menu và cần quẹt trái phải, khi ấn vào nút thêm 1 mớ menu đã ra ngoài bar nhưng vẫn liệt kê. Với cả để khoảng vài giây bạn suggest đi nếu không làm gì thì nó sẽ trở lại hôm nay.”*

Pop-ups chose arrows at both ends, and the bar sliding back after 5 seconds without a touch. The page itself does not change.

- **Arrows:** a drawn arrow **‹ ›** sits over each end that still has sections. Each is a 44 px target with a name for screen readers. Tapping an arrow slides the bar; it does not change the screen or move the page (rule 24).
- **Peek and first nudge:**
  - Tabs are a little narrower, so the next one peeks out.
  - The first time on a device, the bar nudges sideways once to show that it moves. It does not nudge under reduced motion.
- **Sliding back:** 5 seconds after the family last slid the bar without choosing, it slides back to the start. If the open section is further along, the bar stops where that section stays in view, clear of the arrow.
- **More (Thêm):** it no longer repeats sections that are already in the bar. It now holds Hướng dẫn sử dụng and Cài app, and is never shown as the open section.
- **Tablet and desktop:** they keep the sidebar, with no arrows.
- **Tests changed with this request:**
  - `startup` now expects at least 2 rows in More, not 5. Its row-alignment check is unchanged.
  - `v176-fixes` now checks the English “Chi tiêu” → “Spending” on the bar instead of in More.

## 2. Tonight's start-cooking time (owner, 9 Nov 2026)
*“Mình có chức năng báo là ví dụ hôm nay tổng nấu bao nhiêu món thì thời gian nấu và thời gian chuẩn bị hết bao lâu thì trước đó báo noti là sẽ cần bao lâu để chuẩn bị và nấu cho bữa tối chưa?”*

**Before this release:** a fixed 17:00 reminder named the dishes, with no times.

Pop-ups chose two things: the reminder time comes from the dishes, and family dishes get an optional **“Chuẩn bị (phút)”** field.

- **The sum** (`cookTiming`; the same code on the device and on the server, checked by a test):
  - each dish takes preparation + cooking minutes, from the family's current recipe;
  - the start time is dinner time (Settings → Nhắc việc, 18:30 by default) − the longest dish − 15 minutes;
  - it is rounded down to the quarter hour (reminders are checked every 15 minutes) and is never before 08:00.
- **Notification** (family accounts with notifications on): *“Tối nay T2 9/11: bắt đầu nấu lúc 16:15 — 3 món · lâu nhất Phở bò 120 phút (chuẩn bị 30 + nấu 90) · tổng 130 phút · 1 món chưa ghi thời gian.”* It is sent once.
- **No times at all:** if no dish has a time, the old 17:00 reminder with the dish names is sent, as before.
- **Today:** tonight's dinner card shows *“Bắt đầu nấu khoảng 16:15 · 2 món, lâu nhất … (chuẩn bị 30 + nấu 90)”*. A dish without a time is named, never guessed.
- **Recipe editor:** family dishes have **“Chuẩn bị (phút, không bắt buộc)”** next to the cooking time. It is saved only when written, and removed when emptied. Old dishes get no invented number (rule 6).
- **Tests:**
  - New `cook-timing.test.mjs` (in `npm test`) covers:
    - the sum and the rounding;
    - the 08:00 floor, and no start time without times;
    - the family's current recipe being used;
    - the device and the server giving the same answers;
    - the notification at 16:15 with the numbers, sent once;
    - the 17:00 fallback.
  - The existing `alerts-online` prep reminder (a dish without a time) is unchanged.

## 3. “Tự chạy thử” plays whole workflows (owner, 9 Nov 2026)
*“auto play quá sơ sài chỉ hiện tại đang bấm nút, phải làm cả workflow, ví dụ viết món, chụp ảnh etc sau đó lên món cho các bữa, nấu, đi chợ, đi chợ về cất đồ check stock… Cho tôi thêm workflow đi, nhớ là mọi thứ phải hoạt động như dự tính.”*

Henry chose all eight proposed workflows, asked for more, and wanted them in v1.7.17. A failed step must not stop the workflow: every later step still runs.

`ladybug-workflows.ts` adds **15 workflows**, listed first under “Workflow trọn vẹn”. They do each job through the screens and check what the job must change in the family's data:

| # | Workflow | Checked |
|---|---|---|
| 1 | Món mới → ảnh → lên bữa → đi chợ | dish written with amounts, cooking/preparation minutes, steps and a **pretend photo**; amounts and times saved; photo on the dish; found in Recipes; on tomorrow's dinner; the shopping list needs each ingredient at amount × portions ÷ yield |
| 2 | Lên kế hoạch tuần → đi chợ → cất đồ → kiểm tủ | wizard: someone away one day, plan applied; every day has dishes; the calendar shows them away and that dinner counts one portion less; shop and tick everything, “Đi chợ xong”, put away; the pantry holds at least what was bought, nothing is left to buy, the pantry page lists it |
| 3 | Nấu bữa tối → trừ tủ → bỏ đánh dấu | everyone home; tonight's ingredients stocked through “Thêm thực phẩm”; cooking mode, next step, timer; “Đã nấu” takes exactly what the meal needs; undo puts the pantry back |
| 4 | Đi chợ về → hoá đơn → chi tiêu | items ticked; a pretend receipt (text in place of a photo) read; lines matched by typing; saved with total 21.40 and ingredients linked; the Spending page shows 21.40 |
| 5 | Mã vạch → tủ → dùng → quét lại | pretend scan, match Eggs, 12 stored; 2 used; the second scan is remembered with no second lookup |
| 6 | Có khách → suất & đi chợ → lời mời → bỏ khách | 2 adults for tomorrow's dinner: portions +2 and the day's list rises by exactly the dinner's extra share; invitation link (pretend server); a pretend reply of 3 updates portions; removing withdraws the link and puts everything back |
| 7 | Nhập món từ link → ghép dòng → lên bữa → đi chợ | pretend page; “Bò tái” matched to Beef 1,200 g and added to shopping; saved; on tomorrow's lunch; the list has the beef |
| 8 | Đồ sắp hết hạn → gợi ý → lên bữa | stock expiring tomorrow; Today's use-it-up card; a suggested dish with it goes on the meal |
| 9 | Báo vắng → suất & đi chợ giảm → về nhà | everyone home; one person away: dinner portions −1 and the list drops by exactly their share; back home restores both |
| 10 | Mua thêm | “Mua thêm” with name, amount and unit; on the list; ticked and unticked |
| 11 | Sửa món đã lên bữa | a family dish on tomorrow's dinner: 400 → 800 g; the meal's copy and the list follow |
| 12 | Không thích món → lên thực đơn sau tránh | each family member taps “Không thích” in “Cả nhà thấy món này thế nào?”; planning the week again leaves it out; one person changes their mind |
| 13 | Nấu một lần cho hai bữa | tonight's dish also on tomorrow's meal; “Nấu luôn cho bữa sau”; the later meal counts as cooked ahead and needs nothing more |
| 14 | Mang cơm đi | a packed meal still counts its portion; back to eating at home |
| 15 | Thêm người vào nhà | Settings → add “Bà nội (thử)” at 1.2 portions. Uncooked meals show **“chưa báo” and still count her**: the app cooks enough until someone answers, which is the existing rule in `mealServings`. Eating at home keeps the portions; away takes them off. The day's list changes by exactly the whole day's share. |

- **Fresh data:** each scenario starts from a fresh sample family, or a fresh copy of the family's data. Saving, sync, server calls, sharing, beacons and **dish photos** (kept in memory only) stay inside the run, and everything is restored afterwards.
- **Failures:** a failed step is written down and the next steps still run. The list shows every failed step, and **one** feedback report lists them all.
- **Results so far:** while building, the workflows caught mistakes in the workflows themselves (wrong field names, a preview that needed “Áp dụng”, the guest sheet opening another meal, expectations that ignored other meals of the day). All are fixed. **No app defect was found.**
  - **Mobile VI, desktop EN, real copy:** all 27 scenarios (15 workflows + 12 quick checks) pass on the sample family at mobile VI and at desktop EN, and on a copy of a family's data.
- **Tests (`test:v1717:browser`, phone and desktop):**
  - the workflows come first (15);
  - all pass, with ≥ 3 checked steps each;
  - the quick checks pass;
  - the family's own data is untouched;
  - a deliberately broken step (“Thêm thực phẩm” hidden) is caught while later steps still run, the failed step is named, and one report lists every failed step.
- **v1.7.16 suite:** `test:v1716:browser` still passes. Its search check now looks for a dish that is on the menu, so it also works on a family's own data.

## Tests
- **New suite `test:v1717:browser`** (in `test:all`), at 375 / 320 / 820 / 1280 in VI and EN:
  - arrows: drawn, ≥ 44 px and named; a tap slides the bar without moving the page or changing the screen;
  - sliding back after 5 seconds, including keeping an open section further along in view (320 px);
  - More without bar sections;
  - no arrows on larger screens;
  - the Today line with preparation + cooking, a dish without a time named;
  - the preparation field saved and removed.
- Full local `test:all` and GitHub CI: in the report to Henry.

## Evidence
`nav-arrow-start-*`, `nav-arrow-slid-*`, `more-menu-*`, `cook-timing-today-*`, `prep-field-*` (Chromium viewport simulation).

## Limits
- The notification needs a family account with notifications allowed. Device-only use shows the start time on Today only.
- Dishes from the reference library keep their single time. Only family dishes get the preparation field.
- Tested with Chromium viewport simulation only, not physical devices.
