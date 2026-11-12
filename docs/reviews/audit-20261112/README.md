# Whole-app audit, 12 Nov 2026 (Sydney time)

Henry asked for this audit after reporting several bugs from his phone. In his words: "Audit lại toàn bộ code và function đi … chứng tỏ còn nhiều nơi có lỗi."

**How it was done**
- Four agents checked the app in parallel, read-only.
- They worked on commit dd2e657, which is v1.7.18 as deployed plus rule 29.
- Each agent seeded realistic data and checked it in a Chromium browser simulation. No live servers were called.
- Not tested: physical phones, Studio with a signed-in owner, and the family-account screens (only the device-only side was seen).

**The four reports** (each finding has `file:line`, steps, actual vs expected, and a suggested fix):

| Report | Area | Findings |
|---|---|---|
| [A-findings.md](A-findings.md) | Buttons and sheets that do nothing, show the wrong number, or have silent defaults | 27 (3 high, 11 medium, 13 low) |
| [B-findings.md](B-findings.md) | Places doing the same job differently (rule 29) | 23 (5 high, 12 medium, 6 low) |
| [C-findings.md](C-findings.md) | Data correctness | 25 (11 high, 9 medium, 5 low) + 4 suspected |
| [D-findings.md](D-findings.md) | Owner rules (emoji, drawings, sheets, language, Sydney time, tap size, privacy) | 30 (3 high, 17 medium, 8 low, 2 info) |

Some findings appear in more than one report. They are merged into the groups below.

## Merged groups and proposed batches

### Batch 1: wrong data, lost data, broken backup/sync (proposed for v1.7.19)
**1. Extra items ("Mua thêm" / "Đồ dùng khác")**
- Extras cannot be edited: A2, B7. Work in progress.
- Unit silently saved as "g", and an amount nobody typed: A3, C3. Work in progress.
- Price defaults to a known $0: A4, C13.
- Bought extras never reach the pantry: A9, B6.
- "Đã mua đủ" is shown while extras are still unticked: A8.
- Deleting an extra has no confirmation and no undo: A6, B5.
- The two add-extra forms have drifted apart: A5.
- The store sheet for extras is a cut-down copy: B8.

**2. Wrong amounts**
- Family recipes (dishes with a yield) skip whole-number rounding, so a rooster shows as 0.79 con: C1.
- In Viết món, picking a suggestion replaces the chosen "con" with g: C2.
- Re-opening a receipt line with no unit turns it into g and a price of $6000/kg: C6.
- Cooking ahead ignores the recipe yield (B4, C7), and a dish cooked ahead goes back on the list (B3).
- Packs with no known weight stay in the pantry after cooking, and a receipt counts them as "Dư": C10, C11.
- Fractions are accepted for counted units: C16.
- Un-cooking drops pantry lot details: C17.

**3. States the app writes that its own validator rejects**
- These open the recovery screen and stop sync or backup.
- Causes: more than 30 portions with guests (C4); GBP/EUR receipts (C5); very large amounts (C24); other validator gaps (C22).
- **Sync:** two devices cooking from one pantry lot lose a deduction (C9). The same custom unit added on two devices is duplicated (C18).

**4. Menu weeks that don't start on Monday**
- Guests are saved to a hidden copy of the week: B1.
- Search, receipt matching and voice undo read the wrong week: B2.
- Receipt undo misses the bought ticks: C8.

**5. Counts that don't match**
- "Đồ trong tủ": A1, C14. **Fixed in e348d20.**
- Pantry stat cards: A16.
- "Nhà mình đã đủ nguyên liệu" is shown when nothing is planned: A7.

### Batch 2: misleading, untranslated or wrong time (proposed v1.7.20)
**6. Money**
- An unknown price shows as $0.00: C12.
- "$" is written by hand, so VND appears as dollars: B13.
- Discounts are counted as unmatched: C15.
- Extras without a currency are left out of VND totals: C23.

**7. English mode**
- The store sheets are fully Vietnamese: D11.
- The pantry edit sheet is Vietnamese: D12.
- Shopping row details stay Vietnamese: D13.
- The shared list is Vietnamese: D14.
- 95 strings have no English: D15.
- Other places: B20, B22, D16, D17.

**8. Sydney time**
- The app (D19), Studio (D20) and the greeting (D21) use the device time zone instead: B21.

**9. Pantry entry**
- Five ways into the pantry, five sets of defaults: B10.
- Silent "Thịt heo / Ngăn mát" default when adding: A15, C25.
- Packs weighed later keep the "ước tính" note: C20.

**10. Dishes and recipes**
- A dish typed only into a meal is a dead end: A14.
- "Bỏ hết món" and the dish × have no undo: A13.
- Import from a link saves before the family reviews it: B23.
- The same recipe line gives different amounts depending on how it was entered: B11.
- Cooking mode drops the amounts: B14.

**11. Receipts**
- A receipt item the family already ticked is reported as "Dư": C19.
- "Lưu từ hoá đơn" opens an empty sheet: A19.

### Batch 3: owner-rule polish (proposed v1.7.21)
**12. Emoji**
- The shared list and the "Nhờ mua thêm" text: D1, D2, D3.
- "Giữ bữa": A27.

**13. Drawings and sheets (rules 25 and 27)**
- D4–D10 and B15.

**14. Tap targets under 44 px**
- D22–D24.

**15. Smaller items**
- A10–A12, A17, A18, A20–A24, A26.
- B9 (five store lists), B16–B19.
- D18.

### Needs Henry's wording first (rule 28), not changed
- **D25:** the feedback privacy page says only the operator reads feedback, but reports are filed as public GitHub issues. Owner, 12 Nov 2026 pop-up: "Cứ làm, rồi sẽ chuyển chế độ sau". It stays as it is for now, and the mismatch remains until Henry decides.
- **D26–D30:** sends that the privacy page does not describe:
  - device address seen by fonts, jsDelivr, Hugging Face and supermarket image hosts;
  - weather city;
  - "Tìm giá online" search words;
  - voice statistics details;
  - app-update events.
