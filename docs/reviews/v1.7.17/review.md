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
