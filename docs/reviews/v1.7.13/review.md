# v1.7.13 — guest chips, meal buttons, Today order, tidy week tools, a way out of shopping mode

Henry's feedback on v1.7.12, 8 Nov 2026 (~09:50 Sydney time), with iPhone screenshots. Branch `release/v1.7.13`.

## 1. Guest sheet: days and meals like the rest of the app
- **Asked:** *“Khu này chọn ngày tháng và bữa phải consistent với cả app design.”*
- **Before:** the sheet used the phone's grey date box and a drop-down.
- **Now:** *Từ* and *Đến* each show:
  - a row of **day chips** like the week strip on Today: weekday, big day number, and the date or “Hôm nay”. The row scrolls sideways (14 days from today).
  - **meal chips** like the meal tabs: Bữa sáng / trưa / tối, only the meals the family has on that day.
- **Behaviour:** the chosen chip is filled green (`aria-pressed`). The last day never comes before the first. Chips are ≥ 44 px. The rest of the sheet is unchanged.

## 2. “Chưa nấu” pushed down; where “Còn dư?” goes
- **Asked:** *“Nút chưa nấu bị đẩy xuống, nút còn dư nên để đâu hợp lý hơn?”*
- **Now:**
  - The meal header keeps its words on the left and a button column on the right, so **Đã nấu / Chưa nấu** stays at the top right, level with the meal name, even with the “Đã nấu sẵn…” note.
  - **Còn dư?** sits right under it, same width, in the same column.
  - The column is at most 46% of the card, and long labels (“Đã dùng phần này”) wrap.

## 3. Greeting and “Giải phóng tủ lạnh” under the urgent notes
- **Asked:** *“2 phần chào buổi sáng và giải phóng tủ lạnh tôi vẫn muốn nó nằm phía dưới tin khẩn.”*
- **Today order:**
  1. day strip, Lịch tháng / Có khách;
  2. **Bữa tiếp theo**, then *Nhắn khẩn*;
  3. **Chào buổi sáng** and **Giải phóng tủ lạnh & gợi ý món ăn từ tủ** (one-line rows);
  4. the day's meals and *Ai ăn bữa này?*;
  5. the other extras (Ai nấu ai đi chợ, Gợi ý cho nhà, Weekends feast, leftovers).

## 4. Week tools on Thực đơn
- **Asked:** *“Các nút rời rạc và còn nhiều chỗ trống quá.”*
- **Before:** each item was on its own row (409 px tall at 375 px).
- **Now:**
  1. the week (‹ dates › Tuần này);
  2. **Kế hoạch tuần tới** and **Chia sẻ tuần** side by side, then **Tuần bắt đầu: Thứ 2 ▾** (shorter label);
  3. the plan actions (Lên thực đơn, Lặp tuần trước, Viết món, Khẩu vị).
- **Sizes:** on a desktop the three small items share one row. On a 320 px phone the two buttons share a row and “Tuần bắt đầu” takes the next.

## 5. Shopping mode: a way out, and “Đi chợ xong”
- **Asked:** *“Đã vào thì không có nút ra ngoài việc bấm xong đi chợ, phải có nút thoát ra… Nút ghi đúng phải là đi chợ xong. Làm 2 nút này bự và lấp lánh viền.”*
- **Now:** the bar has two big buttons side by side (≥ 56 px, 16 px bold), both with the app's **glowing border** (the same as *Bếp của nhà mình*):
  - **Thoát** (drawn left arrow) leaves shopping mode without opening anything; ticks stay as they are.
  - **Đi chợ xong** leaves and opens *Cất đồ* when something was bought.
- **Reduced motion:** the border moves only when motion is allowed and is still under *reduce motion* (rule 13).

## Tests
- **New suite `test:v1713:browser`** (in `test:all`), at 375×812, 320×740, 820×1100 (VI) and 1280×800 (EN). It checks:
  - guest chips: no date box / drop-down, ≥ 44 px, scrolling inside the box, picking a day, last day never before first;
  - the cook button top right and level with the name, “Còn dư?” under it with the same width and ≥ 44 px;
  - greeting and use-it-up rows right after the urgent notes, then the meals;
  - week tools order, small gap, short label, height above the plan actions;
  - Thoát / Đi chợ xong labels, ≥ 56 px, glowing, drawn, side by side, still under reduced motion and moving without it; *Thoát* leaves without a sheet;
  - no overflow, no page errors.
- **Updated:**
  - `v1712-fixes` (guest days are picked with chips; no date box / drop-down);
  - `v1712-flow` (Today order now has the row group under the urgent notes).

## Evidence (Chromium and WebKit viewport simulation, not physical devices)
- **Chromium:** `docs/reviews/v1.7.13/{guest-chips,meal-card-buttons,today-rows,week-tools,shopping-bar}-{vi,en}-{size}.png`.
- **WebKit, iPhone 15 Pro Max emulation:** `docs/reviews/v1.7.13/webkit-iphone15promax-{guest-chips,meal-card-buttons,today-rows,week-tools,shopping-bar}.png`.

## Limits
- Browser simulation only, not a physical iPhone.
