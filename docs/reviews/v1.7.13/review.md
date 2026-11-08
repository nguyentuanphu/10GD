# v1.7.13 — guest chips, meal buttons, Today order, tidy week tools, a way out of shopping mode, guest invitations

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

## 6. Guest invitations — guests answer by link, without an account
- **Asked (8 Nov 2026, Sydney time):** *“Link invite để tôi gửi đến gia đình đó để họ tự chọn bao nhiêu lớn bao nhiêu trẻ con, màn hình đơn giản để họ chọn và submit, sau đó có reminder… nếu họ không dùng app thì reminder như thế nào, và có option cho họ báo bận… chủ yếu khi gửi link vầy là 1 cách để giới thiệu app.”*
- **Plan approved by pop-up:**
  - “chưa chắc” counted as the family chooses;
  - reminders by the guest's own calendar plus the family re-sending;
  - a light intro at the bottom;
  - busy = removed from the meal and the family is told at once;
  - the family chooses the answer deadline and when the link ends;
  - *“mình có tài khoản là tất nhiên”*: the family has an account, guests answer without one;
  - *“làm luôn ở nhánh này”*.
- **Family side** (guest sheet, each named group): **Mời qua link — khách tự báo số người**.
  - **Options:**
    - *Khách trả lời trước*: 2 ngày trước / 1 ngày trước (21:00 Sydney) / sáng hôm đó (09:00);
    - *Link hết hạn*: sau hạn trả lời / sau bữa (23:59 of the last meal day) / sau 7 ngày;
    - *Khách “chưa chắc” thì giỏ đi chợ*: tính đủ / tính một nửa / không tính.
  - **Gửi lời mời** (drawn) saves the guests on the chosen meals, creates the link and opens the share sheet with a ready message: *“Nhà Phú mời Nhà anh Tuấn bữa tối T7 14/11. Bấm để báo bao nhiêu người đến (không cần tài khoản): …/rsvp.html#t=…”*.
  - After sending, the group shows the answer (or *“chưa trả lời · hạn …”*) and **Gửi lại link**.
  - Without a family account the sheet says so, with a sign-in link.
- **Guest page** (`rsvp.html`; VI │ EN, follows the phone's language):
  - *“Nhà Phú mời bạn”*, the meals, the deadline in Sydney time;
  - **Sẽ đến / Chưa chắc / Không đến được**, then adults / children with drawn − / + (the family's estimate first) and an optional message → **Gửi** → thank you;
  - **Thêm vào lịch** (a calendar file with every meal and two reminders: a day before and 2 hours before), **Đổi câu trả lời**, **Báo bận đột xuất**;
  - after the deadline only “không đến được / báo bận”; an ended or withdrawn link shows a short note;
  - at the bottom a light *“Bếp Nhà giúp nhà bạn… · Dùng thử Bếp Nhà →”* and a privacy link. No tracking.
- **Answers back:**
  - The family's phones get a notification. “Bận đột xuất” is sent as urgent.
  - The app picks up answers (at most once a minute, when back online and when the app is opened again) and writes them into every meal of that group.
  - Counting: yes as answered; not sure as chosen; no / busy 0; no answer yet the family's estimate.
  - The meal card shows *“Khách: … · Nhà anh Tuấn (sẽ đến)”*.
- **Today:**
  - *“Hôm nay có khách: …”* on a day with guests;
  - *“Chị Lan chưa trả lời lời mời (bữa sáng 8/11). — Nhắc lại”* once the deadline has passed. *Nhắc lại* opens the share sheet with a reminder and the same link.
- **Server:**
  - new store `bep-rsvp`, keyed by an unguessable token (24 random bytes);
  - family operations `invite-create` / `invites` / `invite-cancel` (account, not viewer, not paused);
  - public function `rsvp` that only reads the invitation's public part and takes answers: same origin; deadline, expiry and withdrawal enforced; at most 20 changes a day; `noindex`, `no-store`;
  - records deleted 30 days after the link ends.
- **Privacy page:** new section *6a. Lời mời khách / Guest invitations*.
- **Data:** optional `guest.invite {id, token, deadline, expiresAt}`, `guest.rsvp {status, note, at}`, `guest.maybe`, all validated. No phone numbers or e-mail stored.
- **Not done (as planned):** automatic SMS / e-mail to guests (costs per message, needs a provider key and guests' contact details).

## Tests
- **New suite `test:v1713:browser`** (in `test:all`), at 375×812, 320×740, 820×1100 (VI) and 1280×800 (EN). It checks:
  - guest chips: no date box / drop-down, ≥ 44 px, scrolling inside the box, picking a day, last day never before first;
  - the cook button top right and level with the name, “Còn dư?” under it with the same width and ≥ 44 px;
  - greeting and use-it-up rows right after the urgent notes, then the meals;
  - week tools order, small gap, short label, height above the plan actions;
  - Thoát / Đi chợ xong labels, ≥ 56 px, glowing, drawn, side by side, still under reduced motion and moving without it; *Thoát* leaves without a sheet;
  - no overflow, no page errors.
- **Invitations:**
  - `rsvp.test` (server): token, what a guest sees, answers and rules, deadline, end, withdrawal, daily limit, family notified, deletion after 30 days;
  - `core.test`: counting by answer and choice, answers applied once to every meal, validation;
  - new browser suite `test:rsvp:browser`: guest page at 375 / 320 / 820 / 1280, VI and EN, answer, change, busy, calendar file (18:30 Sydney, two reminders), deadline, ended, wrong link, language, ≥ 44 px, no overflow; family side at 375 and 1280: no account → note; invite options; link shared; answer back on the card; Today notices and “Nhắc lại”.
- **Updated:**
  - `v1712-fixes` (guest days are picked with chips; no date box / drop-down);
  - `v1712-flow` (Today order now has the row group under the urgent notes).

## Evidence (Chromium and WebKit viewport simulation, not physical devices)
- **Chromium:** `docs/reviews/v1.7.13/{guest-chips,meal-card-buttons,today-rows,week-tools,shopping-bar}-{vi,en}-{size}.png`.
- **Invitations:** `docs/reviews/v1.7.13/invite/{guest-open,guest-answer,guest-thanks,guest-busy,guest-ended}-{vi,en}-{size}.png`, `invite/{family-invite-options,family-answer,family-today-notices}-{vi,en}-{size}.png`.
- **WebKit, iPhone 15 Pro Max emulation:** `docs/reviews/v1.7.13/webkit-iphone15promax-{guest-chips,meal-card-buttons,today-rows,week-tools,shopping-bar}.png`.

## Limits
- Browser simulation only, not a physical iPhone.
