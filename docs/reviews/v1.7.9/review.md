# v1.7.9 — owner report of 6 Nov 2026, 19:03–19:10 Sydney time (iPhone, after the v1.7.8 deploy)

Branch `release/v1.7.9` from `main` at `aec3270` (Release v1.7.8). **Not deploy-approved.** It needs green GitHub CI on the exact head commit and Henry's explicit DEPLOY (AGENTS.md rules 1–5, 15, 18, 23).

| # | Report | Cause | Change |
|---|--------|-------|--------|
| 1 | “Bị lỗi display, chữ chạy khắp nơi, audit toàn web” (the *Bữa ±* sheet and the *Trừ đồ trong Tủ* switch) | Both new labels carried the `check` class, which is the 17 px tick-box style, so every word sat on its own line. | They have their own classes now (`pm-row`, `pantry-deduct`). The screen audit in `test:v176-fixes:browser` gained a rule that catches this kind of bug: **one word per line**, meaning any text of 3 or more words with every word on its own line. It runs on every screen, sheet and size in VI and EN, including the *Bữa ±* sheet and the × confirmation. |
| 2 | “Khi tôi nhấn round up/down web nó nhảy khắp nơi” | The list is redrawn after a round, so the page lost its place on the iPhone. | The row's amount stays exactly where it was on screen (and the focus stays on the same button). Chrome's own scroll anchoring is paused for that redraw. |
| 3 | “Nút tick mua hàng nên di chuyển lên sát cái tên món” | The tick spanned two grid rows and sat beside the amount. | The tick sits on the name's line. |
| 4 | “Đã chạy lại giá online mà tại sao giỏ hàng còn thiếu quá nhiều món?” (Henry chose *Nhiều dòng chưa có giá*) | (a) The price column used only the family's own price, so a row with an online line (e.g. Sườn bò, Coles $12.80) still said *Chưa rõ giá*. (b) *Mỳ trứng* did not match *Mì trứng*. (c) *Bò viên* had no catalogue item. | (a) A row with an online price shows **≈ $X — theo giá online**: unit price × amount, else packs × shelf price. (b) *Mỳ* and *Mì* are the same word when matching. (c) Catalogue items *Bò viên* (beef balls) and *Chả cá* (fish cake) are added, so 166 items now. Other family items still use **Tìm giá online** (v1.7.8). |
| 5 | “Nếu món nào ấn xoá by accident nên có nút undo lại, và báo đây là ingredient của món gì và confirm muốn xoá” | — | **×** opens *Bỏ … khỏi giỏ?*, which names each dish that uses the ingredient and when (e.g. *Sườn rim mặn ngọt · Thứ 2 bữa tối, Thứ 3 bữa tối*). It has **Giữ lại** and **Bỏ khỏi giỏ**. After removing, a bar with **Hoàn tác** (44 px) shows for 8 seconds. |
| 6 | Four identical *Lịch vắng ngày mai* notifications at 19:03 | The phone was registered several times (or for several members) with the same push address, and each registration got a copy. | One send per push address. |
| 7 | “Notification cần có thông tin rõ hơn, ngày nào khi nào” | — | Every reminder names the day and date. The calendar one reads e.g. *Ngày mai (T7 7/11): Cậu Tí vắng bữa tối* — *Vắng (bỏ phần ăn): Cậu Tí – bữa tối. Bữa tối còn 3/4 người ăn. Chạm để xem thực đơn ngày mai.* — and opens the weekly menu. *Tối nay (T6 6/11): bạn ăn cơm ở nhà chứ?*, *Bữa tối nay (T6 6/11): chuẩn bị nấu*, *Chốt thực đơn tuần tới (từ T2 9/11)* and the expiry reminder also carry the date. |

## Tests

- `push`: one copy per push address. 4 registrations of the same phone plus one other phone give 2 sends.
- `access-calendar`: the calendar reminder's new wording is asserted:
  - day and date in the title;
  - who is away and who is busy but still counted;
  - how many are eating;
  - it opens the weekly menu.

  This replaces the old wording check.
- `v176-fixes:browser`:
  - the new *one word per line* audit runs on all screens and sheets;
  - × asks first and names the dishes, **Giữ lại** keeps the item, and **Hoàn tác** brings it back;
  - the tick sits on the name line;
  - the amount stays put after rounding.
- `scout-scanlist`: the catalogue count is now 166.

## Evidence (Chromium viewport simulation, not physical devices)

`docs/reviews/v1.7.8/{vi,en}-*-round-buttons.png`, `…-skip-confirm.png`, `…-undo-bar.png` and `…-planner-days.png` (written by `test:v176-fixes:browser`).
