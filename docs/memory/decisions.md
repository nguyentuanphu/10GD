# Henry's decisions and standing instructions

Newest first. All times are Sydney time. Standing rules live in `AGENTS.md`; this file records product decisions and what they mean for the code.

## 12 Nov 2026 (later)
- **Dish sheet** (pop-up answers, Henry wrote in English): the same three buttons everywhere.
  - Main action: "Nấu món này" when opened from a meal, "Thêm vào bữa" when opened from the library.
  - "Sửa món" edits any dish directly. A catalogue dish becomes a family copy automatically. A dish typed into a meal is edited in place, with "Lưu vào kho món" NOT ticked by default.
  - "Xoá" means "Bỏ khỏi bữa này" from a meal and "Xoá khỏi kho" from the library, both with undo. Built-in catalogue dishes are hidden ("Ẩn khỏi kho") and can be shown again. "Xoá món" is also inside Viết món.
  - Ships in v1.7.19.
- **Reminder details** (pop-up answers):
  - The thaw-reminder time is chosen by the family in "Giờ ăn" (starting value 20:00).
  - Cooking and thaw reminders do not count towards the 2-per-day automatic limit.
  - New devices have "Nhắc giờ nấu" and "Nhắc rã đông" on; they can be turned off.
  - The earliest cooking-reminder time is a family setting, "Không nhắc trước …" (starting value 08:00).
  - The Studio reminder line and the guest-invitation calendar do not show meal times; that would be a privacy change.
- **Spoon and bowl amounts** (muỗng canh, muỗng cà phê, chén, cup) are notes only and are not added to the shopping list. The app still says whether that ingredient is in the pantry, and reminds the family to buy one bottle or pack when there is none. (Pop-up answer: "Như recommend, và vẫn báo là còn trong tủ hay không".)
- **Receipt lots** get a suggested use-by date, like every other way into the pantry. It is shown and editable in the receipt confirmation step and marked as an estimate. (Pop-up answer: "Gợi ý hạn dùng, cho sửa".)
- **Meal times and cooking reminders** (pop-up answer: "Làm đủ 4 ý, gộp v1.7.19"):
  1. "Bếp của nhà mình" gets a "Giờ ăn" section with a time for each meal the family uses (sáng, phụ sáng, trưa, phụ chiều, tối). A meal with no time shows "Chưa đặt" and gets no reminder.
  2. Every planned meal that has a time gets "Đến giờ nấu [bữa] — bắt đầu lúc …", not only dinner. The start is the meal time minus the longest dish's cooking time minus 15 minutes.
  3. A thaw reminder comes the evening before when a dish needs something from the freezer.
  4. Meal times are edited in one place only (Bếp của nhà mình). Nhắc nhở and the meal cards read from it (rule 29). Each device still chooses whether it receives reminders. The times are stored in the family's own data, like the dinner time today; nothing new is sent anywhere else.
- **Unit picker, remaining places (rule 29):** the receipt line unit, the notes-import unit and the voice recipe preview also use the shared unit picker. A family unit with a conversion is added to the pantry through that conversion. A unit without a conversion is stored as a bought lot in that unit, with no guessed grams. (Pop-up answer: "Đổi cả 3 chỗ".)
- **Bought extras that are on the menu list:** a bought extra's amount counts towards the planned list row for the same ingredient, so the row shows "Đủ" and nothing is bought twice. If the family deliberately bought more than the list needs, ask whether to put the extra in the pantry. (Pop-up answer: "Như recommend, nhưng nếu user cố tình mua dư thì hỏi để cất vào pantry".)
- **Product calls by the fix agents** (not yet confirmed by Henry):
  - measuring spoons and bowls (muỗng, chén) round up to ¼;
  - GBP/EUR receipts are kept and valid but not added to the AUD/VND spending totals.

## 12 Nov 2026
- **Audit fixes:** fix all 105 findings of the whole-app audit in ONE release, v1.7.19. No privacy change. (Pop-up answer: "Làm hết 1 lượt".)
- **Week start:** the week's start day is a family setting, because each family shops on a different day. Never assume Monday. Every place must read weeks by the family's start day (`planStartOf`, `weekStartDay`).
- **Ladybug feedback:** feedback stays filed as public GitHub issues on this repository for now. "Cứ làm, rồi sẽ chuyển chế độ sau". The feedback privacy page still says only the operator reads it. Henry will decide the mode later; do not change it without him.
- **"Đồ trong tủ" sheet on Đi chợ:** must show what its number counts. Top section: this week's needs the pantry already has (cần · có · Bỏ qua). Below: every other pantry lot (tap to edit). Shipped in v1.7.19.
- **Extras on Đi chợ:** must be editable (name, amount and unit, price, store). No silent "g" unit. If the name matches nothing, the family picks a unit.
- **Units in Viết món:** use the same buying-unit sheet as Đi chợ, plus the note units (nhúm, ít, vừa đủ). Saved recipes keep their unit text. Applies to every related place (rule 29).
- **Feedback reply notification:** tapping it opens the ladybug on "Góp ý của tôi".
- **Privacy section 7a** (sending receipt text to improve reading, v1.7.18): keep as is. It went live without asking first; that led to rule 28.
- **Unseen receipts:** do A (send the redacted receipt text and corrections, never the photo) and B (photo quality hints with "Chụp lại"). Do NOT do C (AI reading of the photo).
- **Receipt ↔ shopping list:** match the list first. Anything bought beyond the list goes to the pantry by default, changeable per line to "Dành cho bữa …" or "Không theo dõi". Buying less leaves "Còn thiếu".
- **Buying units:** show suggestions plus "Xem tất cả". Family custom units are allowed, with an optional conversion.
- **Counted ingredients** (con, cái, bó…): keep scaling by the number of people eating, and round up to whole numbers on the shopping list. The recipe view keeps the amount as written (decision #13, v1.7.5).

## Earlier (standing)
- **Grocery photos:** ingredient and grocery-product pictures use the supermarket's product photo, with the source named. Dish pictures stay drawn (5 Nov 2026, rule 19).
- **Local test runs:** a full local `test:all` run may be reported as ready; GitHub CI must be green on the exact head before merge (7 Nov 2026, rule 17a).
- **Hosting:** nothing is loaded on hosting before DEPLOY.

## Open questions for Henry
- Meal-group labels in English.
- Plate cropping on cards.

## Henry's to-dos (things only he can do)
- Update the henry-master skill on claude.ai with the FamTray row and the release lessons. Drafted 12 Nov; reminder set for 13 Nov 09:10.
- SCOUT_EXTENSION_IDS setting; the duplicate device; the Web Store link.
- Re-enter the Mỳ Quảng amounts; the iPhone voice self-check.
- Pinch / WhichGrocer terms e-mails. The integration plan is not yet approved.
