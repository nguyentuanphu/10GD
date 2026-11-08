# v1.7.14 — nothing left to buy after putting away, Today order, guests coming up, receipts that read, crop, short invite links, English pantry

**Owner, 8 Nov 2026 (Sydney time):** *“Bạn kiểm tra giỏ đồ của tôi, hôm qua vừa mới đi chợ rồi, cất đồ rồi mà tại sao vẫn hiện đồ để đi mua?”*

The family's own list is on the production server and was not read. The same steps were repeated in the browser on the released code (v1.7.13): plan a week, tick everything bought, **Cất đồ**. Two causes came up.

## 1. Boxes / packs without a known weight came back in full
- **Before:** an item bought by the box or pack (e.g. *Mọc 0.4 hộp*, *Mỳ trứng 1 gói*) with no gram conversion was put away as **0 g + “1 hộp”**. The list subtracts by weight, so after putting away it asked for the item again in full. Reproduced: 1 hộp nấm put away → the list still asked for 125 g nấm.
- **Now:**
  - When put away, such a box / pack **covers what the list asked for at that moment**. The lot is marked as an estimate, and the pantry shows *“≈ 125 g · ước tính đủ cho các bữa đã lên lịch”*. It leaves the list and is used when cooking. The family can change it in the pantry.
  - **Boxes / packs already put away before this fix (0 g)** are not guessed. Their list row shows *“Đã cất 1 hộp trong tủ (chưa rõ g). Đủ cho các bữa chưa?”* with **Đủ rồi** (counts the lot as covering what the list still needs, marked as an estimate) or **Vẫn cần mua** (keeps the row and stops asking).
- The toast after putting away and the put-away sheet's note now say this, instead of “không tự trừ nhu cầu gram”.

## 2. Rounding leftovers
- **Before:** 996.9 g needed and 996.9 g kept could leave a tiny difference that the list rounded up to **0.1 g to buy**.
- **Now:** a difference under 0.05 (g / ml / pieces) is not something to buy. Items counted in pieces are rounded up only for a real shortfall.

## Not changed
- *Trừ đồ đang có trong Tủ* still decides whether stock is taken off the list. When it is off, the list shows full amounts on purpose.
- An amount picked by hand (*“Bạn chọn · Mua ít hơn cần”*) that is less than the meals need still leaves the rest on the list.

## Owner decision (pop-up, 8 Nov 2026)
- *“Tự tính là đủ (ước tính)”*. Boxes / packs without a weight count as covering what the list asked for when put away.
- This replaces the first version's rule (31 Oct 2026) that a box was kept with no weight at all, which is what left the item on the list.
- `units-catalog.test` follows the new decision. The count is still kept, and the mass is marked as an estimate.

## Data
- New optional fields on pantry lots: `qtyEstimated` and `coverAsked`.
- Existing lots are not changed until the family answers.

## 3. Today: urgent notes, greeting and use-it-up first; meals in their usual order
- **Asked (screenshot, ~12:53 Sydney):** *“Bị lỗi display, nhiều bữa random bị hiện lên trước alert, welcome và clear fridge.”* Then *“Các bữa vẫn nên hiện như thường, không nên đẩy bữa tiếp theo lên trước.”*
- **Now:** under the day strip come **Nhắn khẩn**, then **Chào…** and **Giải phóng tủ lạnh** as one-line rows, then the notices (guests, plan next week), then the day's meals **in their usual order**. Nothing is pulled out as “Bữa tiếp theo”; leftovers are offered on the next meal's own card.

## 4. Guests who answered were “not there”
- **Asked:** *“Đã invite khách đã confirmed, nhận được notification rồi mà khi vào có khách không thấy thông tin gì và không thấy hiện trên menu hay shopping.”*
- **Checked end to end** against the real account, family and invitation handlers (in memory, synthetic data): invite → guest answers *Sẽ đến · 3 lớn* → the app is opened again → the answer is on the meal (*“Khách: 3 khách · Nhà anh Tuấn (sẽ đến)”*). On a Sunday the guests' meal is **next week**, while Today, *Có khách*, the menu and the list all show this week, so nothing showed.
- **Now:**
  - Today lists **Khách sắp tới**: name, answer, meal and day, and which week's menu and shopping count them (*“(thực đơn & đi chợ tuần 9/11–15/11)”*), with **Xem** to open that meal.
  - **Có khách** on a day without guests lists **Khách đã hẹn** with **Xem**.
- **Owner's question:** opening the link himself in Messenger and answering counts as the guest's answer; it changes nothing else. *Đổi câu trả lời* or removing the group in the guest sheet undoes it.

## 5. Short invitation link, and who it is from
- **Asked:** *“Link invite dài quá, với cả 10gd là nhóm gia đình riêng, nên có option để ghi tên của tôi hay của gia đình mời.”*
- **Now:**
  - The link is `…/m#<token>`, e.g. `10gd.netlify.app/m#Ab3dE5fG7hJ9kL1mN3pQ5r` (was `…/rsvp.html#t=<32 characters>`).
  - New tokens are 16 random bytes (22 characters, 128 bits), still unguessable. Links already sent (24 bytes) keep working.
  - The token stays after `#`, so it is not sent to the server log.
  - `netlify.toml` serves `/m` with the guest page (status 200).
- **“Lời mời từ”** in the invite options: the family group's name, the person's own name, or **Tên khác** (typed, ≤ 60 characters). It is used on the guest page (*“… mời bạn”*), in the message and in *Gửi lại / Nhắc lại*.

## 6. Receipts read again (“Read 0 item line(s)”)
- **Asked (two cropped photos):** *“Tôi đã cropped hình receipts hôm nọ, mà vẫn không đọc đúng được.”*
- **Cause:** a **“Cashier: …”** line was read as the payment part (*cash*), so every item after it was dropped.
- **Also fixed on the same photos:**
  - `0.884ko @` (g read as o);
  - `$65.71` read for $5.71 — corrected only when weight × price per kg says so;
  - `2 6 $2.50` and `68 $1.20` (@ misread) — only when count × price equals the item;
  - `SUB bi $60.83` (SUB TOTAL misread) with the total on the next line.
- **Result on the owner's four photos (local only, not committed):**
  - butcher: 9 / 9 items with the right prices and total;
  - grocer A: 18 / 18 lines;
  - grocer B: 9 / 9 lines with total $80.83;
  - Woolworths: 1 / 1.
- **Text box:** shows **only the item lines**. No shop header, address, card or payment lines. Reading it again gives the same items and keeps the total.
- **Suggestions:** after putting away, the list has nothing left to buy. The receipt suggestions now come from the items ticked as bought this week and in the receipt's week, not the whole catalogue.

## 7. Crop the receipt photo before reading
- **Asked:** *“For scanning receipt you should also have functions to crop the receipt so the OCR can read easier.”*
- **Now:** a photo opens **Cắt hóa đơn** first:
  - a frame with four edges to drag (≥ 44 px), or move with the arrow keys (Shift for bigger steps);
  - **Đọc phần đã cắt** (drawn) reads only that part, and that is the photo kept;
  - **Đọc cả ảnh** reads the whole photo as before;
  - **Cắt lại ảnh** under the photo opens it again.
- On the owner's grocer photo, cropping the top off gave 19 lines at 83 % OCR confidence (whole photo: 75 %).

## 8. A receipt scanned after putting away is not “bought again”
- **Asked:** *“Nếu đã cho vào kho sau đó mới scan receipt thì sẽ báo là mua thêm thành ra không đúng.”*
- **Now:** lots put away from the list around the receipt's date (from 1 day before to 3 days after) are linked to the receipt. Check against shopping & pantry shows *“Đã cất vào tủ lúc đi chợ · không cộng thêm”*, and nothing is added. Undo unlinks them.
- **Data:** put-away lots now record `storedOn`. Older lots are matched by the day they were ticked bought.

## 9. Pantry in English
- **Asked:** *“Có nhiều món trong pantry dù đã chọn tiếng anh mà không dịch.”*
- **Now:** names the family added are shown in English when their meaning is known for sure: *Rau cải ngọt → Choy sum*, *Tôm (còn đuôi) → Prawns (tail on)*, *Bún khô → Dried rice vermicelli*, *Bột chiên giòn → Crispy batter mix*. A name the app does not know stays as written, and the data is not changed.
- Also translated: buying units (*1 bag*, *2 packs*), the weight note, *Use by*, and the use-soon notice.

## 10. Like / dislike buttons
- In the owner's screenshot they showed only “0”: the old emoji had been removed and nothing replaced it. They now show the drawn thumbs (rule 27).
- The rule-27 check's list of main / icon buttons now matches the app's list, so these two must have a drawing.

## Tests
- `core.test`: a rounding leftover is not on the list; a real shortfall still is.
- `receipt-parse.test`: OCR text in the shape of the owner's two photos (store, numbers and staff synthetic):
  - the Cashier line;
  - all items and prices, and the $5.71 fix;
  - `0.884ko`, the multi-buys with a misread @, and the total under a misread SUB TOTAL;
  - “68 $1.20” is not guessed under another price.
- `rsvp.test`: new tokens 22 characters, old 32-character links still valid, wrong links of either length not found.
- **Browser suite `test:v1714:browser`** (in `test:all`), at 375×812, 320×740, 820×1100 (VI) and 1280×800 (EN). It checks:
  - a week bought and put away → nothing left to buy, box estimate, old box question;
  - Today order (urgent → rows → notices → meals) and *Khách sắp tới* with the answer; *Xem* opens the meal; *Có khách* lists planned guests;
  - drawn 👍 / 👎;
  - receipt after put-away linked and nothing added, undo unlinks;
  - suggestions from what was bought;
  - text box item lines only;
  - crop sheet: edges ≥ 44 px, pointer and keyboard; buttons side by side and the same size, *Đọc phần đã cắt* drawn; only the cropped part read and kept; *Cắt lại ảnh*;
  - English pantry names and words; an unknown name kept;
  - no overflow, no page errors.
- **Updated:**
  - `v1712-flow`: the meals in their usual order, no “Bữa tiếp theo”.
  - `rsvp-browser`: the short link `/m#…` opens the guest page and is in the shared message; the “Lời mời từ” choices, with a typed name kept.
  - `default-language`: its main-button list matches the app.
  - `receipt-ocr` / `generic-receipts`: tap *Đọc cả ảnh* on the new crop step.

## Evidence
- `docs/reviews/v1.7.14/{pack-cover-ask,today-guests,guest-sheet-planned,receipt-crop}-{vi,en}-{size}.png`, `pantry-english-en-1280x800.png`. Chromium viewport simulation, not physical devices.

## Limits
- Receipt reading was checked on the owner's four photos locally; other shops' layouts may still need work. The photos are not in the repository.
- The short `/m` link needs the `netlify.toml` rule, which takes effect on deploy.
- The family's real list was not inspected. If something still shows after this release, a screenshot of the row (and of *Đồ trong tủ*) will show which case it is.
