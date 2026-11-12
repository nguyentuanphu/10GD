# Henry's decisions and standing instructions

Newest first. All times are Sydney time. Standing rules live in `AGENTS.md`; this file records product decisions and what they mean for the code.

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
