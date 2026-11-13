# Audit sweep (`npm run test:audit:browser`): first run, 12 Nov 2026 (Sydney time)

AGENTS.md rule 35 requires a permanent audit sweep. This suite is it: `src/tests/audit-sweep-browser.test.cts`, which is part of `test:all`.

## What it checks

**Passes (10)**

| Data | Languages | Sizes |
|---|---|---|
| full | VI, EN | 375×812, 320×740 |
| empty | VI, EN | 375×812, 320×740 |
| full, menu week starting on **Saturday** | VI | 375×812 |
| full, phone in **Asia/Ho_Chi_Minh** | VI | 375×812 (compared with its Sydney twin, `full-vi-375`) |

**Seeded data**
- **Full set:**
  - a week from the library;
  - a family recipe with `yield: 6` and a family ingredient counted in “con”;
  - guests on tonight's dinner;
  - pantry lots, including one with no use-by date;
  - two extras: one named like an ingredient, one free text;
  - a receipt saved at a known instant (01:47 Sydney time);
  - the random sequence is fixed, so every run plans the same week.
- **Empty set:** no meals, an empty pantry, no extras and no receipts.

**Screens and taps**
- **Screens:** Hôm nay, Thực đơn, Đi chợ, Món ăn, Tủ, Chi tiêu, Thói quen and Giá / So Giá. Also the top bar, the “Thêm” (More) button and the account menu.
- **Level 1:** every visible control with a dispatcher is tapped once per kind, in a fresh state. Dispatchers include `data-action`, `data-change`, `data-planning`, `data-fm`, and others, plus buttons, links, `<summary>`, selects and checkboxes.
- **Level 2:** in the four 375 px passes, every control inside each sheet that opens is also tapped.

**Checks after each tap**
- page error;
- sheet content (rule 31);
- “(n)” equals the items in the sheet;
- page jump (rule 24);
- sheet footer (rule 25);
- drawings (rule 27);
- emoji (rule 19);
- English or Vietnamese in the wrong mode;
- targets ≥ 44 px;
- sideways overflow;
- Sydney time (rule 22), comparing the Ho Chi Minh phone with its Sydney twin;
- the round trip `validImport(state)`, then JSON → `validImport`, then sync merge → `validImport` (rule 33);
- new weeks keyed by the family's start day (rule 34);
- **forms (rule 32):** every sheet with a save button is saved without touching a field. The sweep flags:
  - a saved unit “g” that is not the item's own;
  - a price of 0;
  - an ingredient or person nobody chose;
  - a save that neither saves nor says why.

**Skips, and allowlist entries with reasons**
- **Skipped actions:** destructive or outward actions only. These are sign-in, account creation, share or send, export or download, the install prompt, app reload, the language toggle, and notification permission. They are printed at the end of each run; this run printed 39.
- **Language allowlist:**
  - the loanwords already approved in `test:language:browser`;
  - family content and reference-recipe text;
  - the voice hint's mixed example sentence;
  - the example Australian receipt placeholder.
- **Emoji:** text-presentation symbols (↗ ✓ ★) are allowed as font glyphs. Rule 27 checks icon-only symbols separately.
- **Tap size:** links inside running text are allowed (inline exception).
- **Page jumps not counted:** a row that moves to another list (a ticked item joining “đã mua”), and a wheel that centres its value.
- No real bug is allowlisted.

**Run time:** about 11–12 min with 4 passes at a time on a 4-core machine. That is 2,205 taps and 20,617 checks.

## Result on the current code

- **Branch:** `agent-w6/fixes`, with `claude/bold-pascal-riryi0` merged in: the W2 amounts and validators fixes, and the YY extras and unit-picker work. W4 (language, Sydney time and money) was **not** merged yet.
- **Result:** **FAIL**, with 195 distinct failures (606 over all passes).
- **Clean checks:** no page errors, no failed round trips, no silent defaults on an untouched save, no count mismatches, no phone emoji and no Sydney-time differences.

### Mapped to the 12 Nov audit

| Sweep check | Count | Audit finding | Note |
|---|---|---|---|
| tap size < 44 px | 99 | D22, D23, D24 | Dish × 32 px; bell 42 px; language toggle 40 px; selects 41–42 px; store pill 38 px; pantry chips 38 px; Món ăn tabs 40–42 px; `text-btn` 22 px (“Tuần này”, “Xem / sửa”, cooking-mode step links); day strip 37 px wide at 320 px; meal-type checkboxes 17 px; pack-schedule checkboxes 22 px; “✓” pack-all 33–41 px |
| drawings (rule 27) | 33 | D4, D5, D6, D7 | Món ăn tabs / filter chips with drawings (D4); `<summary>` with drawings: “Ai nấu, ai đi chợ”, “Nhắn khẩn”, “Giải phóng tủ lạnh”, “Ngân sách dự kiến”, “Dán danh sách nguyên liệu” (D5); text symbols × ✕ ‹ › − ✓ (D6); “Bắt đầu kiểm tra” has no drawing (D7) |
| language: Vietnamese in English mode | 19 | D11, D12, D13, D15, B22 | Store sheets “Mua … ở đâu?”, “Thêm nơi mua đồ”, “Cửa hàng & địa điểm” (D11); “Chỉnh thực phẩm / Xóa lô này” (D12); “Đã mua …” row label, “lần ghi nhận / Cần thêm 1 lần mua” (D13); notes import, member sheet, delete-recipe sheet, “Thêm món ăn vào bữa”, “Nhờ mua thêm” hint and VND/AUD label, cooking mode, unit options lát / nắm / cây / củ (D15, B22) |
| language: English in Vietnamese mode | 2 | D16 | “Nếu nhập từ receipt”, the placeholder “1 bottle 500 ml / 1 pack 2 kg”, and the CSV column names |
| sheet footer (rule 25) | 9 | D9 | “Lưu sở thích”, “Lưu khẩu phần”, “Lưu thực đơn” inside the sheet body |
| sheet has no content / only a hint (rule 31) | 4 + 4 | A19, A1 | “Lưu từ hóa đơn” with no receipt lines: “Chưa có dòng hóa đơn.” with no way forward (A19). “Đồ trong tủ (0)” on an empty week says “Tủ đang trống” but not what to do: a remainder of A1 after e348d20. |
| week start (rule 34) | 5 | B1, B2 (same family) | Saturday week: “Tuần trước” / “Tuần sau” on Thực đơn and Chi tiêu write Monday-keyed weeks (2026-10-26, 2026-11-16). Changing “Tuần bắt đầu” on Thực đơn writes a Monday-keyed week for the next week. |
| page jump (rule 24) | 16 | — | **New**; see below |
| horizontal overflow | 4 | — | **New**; D saw it once at 320 EN and could not reproduce it. See below. |

**Audit findings that would fail these checks but pass now:**
- A1: the count (e348d20);
- A3, A4, C3, C13: “g” and $0 on extras. Their untouched saves pass the silent-default check on the merged branch.

**Audit findings the sweep does not reach (limits):**
- **A15 / C25:** the “Thêm thực phẩm” default (Thịt heo / Ngăn mát). An untouched save is refused, because the amount is required, so the default ingredient never gets saved by the sweep.
- **D19–D21:** device-zone times. The seeded receipt time is not shown on any screen or sheet the sweep opens. The greeting matched at the time of the run. W4 will add the rendering; the comparison with the Sydney twin then covers it.
- **Data-logic findings that need specific steps:** B3, B4, C1, C6–C11 and others. These stay in their own targeted tests.
- **Other places the sweep does not open:**
  - shared text (D1, D2, D14), because sharing is skipped;
  - Studio (D18, D20);
  - privacy (D25–D30);
  - start-up errors (D16, `bootstrap.ts`).

### New findings (not in the audit)

1. **N1: page jump (rule 24), receipt sheet.** In “Chụp / nhập hóa đơn” and “Xem & sửa hóa đơn”, “Đọc các dòng hóa đơn” moves down about 137 px after the tap. Content is inserted above it. This happens in VI and EN, full and empty data.
2. **N2: page jump, family reactions sheet.** In “Cả nhà thấy món ăn này thế nào?”, tapping “Mẹ thích / không thích món này” moves the control up 39–53 px. Content above it shrinks.
3. **N3: page jump, add-row buttons.** “Thêm nhóm khách” (Khách sheet) and “Thêm nguyên liệu” (Viết món) move down 180–250 px. The new row is inserted above the button. Rule 24 says the tapped control stays put; Henry may decide that add-row buttons are an exception.
4. **N4: horizontal overflow at 320 px EN.** These Đi chợ sheets make the page 38 px wider:
   - the buying-unit sheet;
   - “Mua … ở đâu?”;
   - “Take … off the list?”.

   No single element sticks out, so the cause is probably the page behind the sheet. The sweep reproduces it every time.
5. **N5: “Đồ trong tủ (0)” on an empty week** (related to A1). The sheet opens with “Tủ đang trống” and no next step, and has no control to act on.
6. **N6: changing “Tuần bắt đầu”** on Thực đơn (empty week) writes the next week under its Monday key. This belongs with B1/B2 but is a different place.
7. **N7: unit options lát / nắm / cây / củ stay Vietnamese in English** in “View & edit receipt” (D15 family; a new place).

The full list follows. Each line gives screen › control › detail [number of passes]. Run `AUDIT_JSON=path npm run test:audit:browser` for the passes and skips as JSON.

### tap size < 44 px (99)

- today › (screen) — screen Hôm nay: button.icon.dish-remove-btn height 32 px [6 passes]
- today › (screen) — screen Hôm nay: select height 42 px [10 passes]
- today › (screen) — screen Hôm nay: button.day width 37 px [4 passes]
- today › (screen) — screen Hôm nay: button.day.today width 37 px [4 passes]
- today › “Kết nối gia đình” — sheet “Bếp của nhà mình”: input.check height 17 px [6 passes]
- today › “Nhập bằng lời nói” — sheet “Nói hoặc nhập nhanh (Việt + Anh)”: a “Xem chi tiết” height 19 px [6 passes]
- today › “Voice input” — sheet “Speak or type (Vietnamese + English)”: a “Details” height 19 px [4 passes]
- today › “Lịch tháng” — sheet “Lịch gia đình theo tháng”: select height 41 px [6 passes]
- today › “Calendar” — sheet “Family monthly calendar”: select height 41 px [4 passes]
- today › “Thời tiết” — sheet “Thời tiết & gợi ý”: select height 41 px [6 passes]
- today › “Weather” — sheet “Weather & suggestions”: select height 41 px [4 passes]
- today › “Súp gà bắp trứng” — sheet “Súp gà bắp trứng”: select height 41 px [3 passes]
- today › “Kết nối gia đình” › “Thiết lập lại từ đầu” — sheet “Thiết lập bếp · 1/5”: button.btn.small width 42 px [2 passes]
- today › “Cả nhà” — sheet “Cả nhà thấy món ăn này thế nào?”: select height 41 px [4 passes]
- today › “Thêm món ăn” — sheet “Thêm món ăn · Bữa sáng · 12/11”: select height 42 px [6 passes]
- today › “Chicken, sweetcorn & egg drop soup” — sheet “Chicken, sweetcorn & egg drop soup”: select height 41 px [2 passes]
- today › “Connect family” › “Guided setup” — sheet “Set up your kitchen · 1/5”: button.btn.small width 42 px [2 passes]
- today › “Sửa món Gà luộc lá chanh nhà Bà Tư” — sheet “Sửa món ăn gia đình”: input.check height 17 px [4 passes]
- today › “Lịch mang cơm” — sheet “Lịch mang cơm trưa”: button.pack-all-btn width 33 px [2 passes]
- today › “Lịch mang cơm” — sheet “Lịch mang cơm trưa”: input.check height 22 px [6 passes]
- today › “Family” — sheet “How does the family like this dish?”: select height 41 px [2 passes]
- today › “Add a dish” — sheet “Add a dish · Breakfast · 12/11”: select height 42 px [4 passes]
- today › “Edit Gà luộc lá chanh nhà Bà Tư” — sheet “Edit family recipe”: input.check height 17 px [2 passes]
- today › “Packed lunches” — sheet “Packed lunch schedule”: button.pack-all-btn width 33 px [2 passes]
- today › “Packed lunches” — sheet “Packed lunch schedule”: input.check height 22 px [4 passes]
- planner › (screen) — screen Thực đơn: button.icon.dish-remove-btn height 32 px [6 passes]
- planner › “Hủ tiếu thịt bằmMón sợi” — sheet “Hủ tiếu thịt bằm”: select height 41 px [4 passes]
- planner › “Thêm món ăn” — sheet “Thêm món ăn · Bữa sáng · 9/11”: select height 42 px [5 passes]
- shopping › (screen) — screen Đi chợ: button.store-pill height 38 px [6 passes]
- shopping › (screen) — screen Đi chợ: input.check height 17 px [8 passes]
- today › “Hôm nay bận” › “Dưa leo cà chua · 10 phút · 0/4 nguyên l” — sheet “Kiểm tra món ăn & bữa”: select height 41 px [2 passes]
- planner › “Minced pork hu tieu noodle soupNoodle di” — sheet “Minced pork hu tieu noodle soup”: select height 41 px [2 passes]
- planner › “Add a dish” — sheet “Add a dish · Breakfast · 9/11”: select height 42 px [4 passes]
- today › “Busy today” › “Fresh cucumber & tomato salad · 10 min ·” — sheet “Review dish & meal”: select height 41 px [2 passes]
- today › “Súp gà bắp trứng” › “Chép thành món nhà” — sheet “Viết món ăn của gia đình”: input.check height 17 px [1 pass]
- shopping › “Chọn nơi mua” — sheet “Mua Thịt heo ở đâu?”: select height 41 px [4 passes]
- today › “Chicken, sweetcorn & egg drop soup” › “Save as family dish” — sheet “Write a family recipe”: input.check height 17 px [1 pass]
- today › “Súp gà bắp trứng” › “Chế độ nấu” — sheet “Cùng nấu Súp gà bắp trứng”: button.text-btn height 22 px [1 pass]
- today › “Súp gà bắp trứng” › “Thêm vào bữa ăn” — sheet “Thêm món ăn vào bữa”: select height 41 px [1 pass]
- today › “Chicken, sweetcorn & egg drop soup” › “Cooking mode” — sheet “Cùng nấu Súp gà bắp trứng”: button.text-btn height 22 px [1 pass]
- today › “Chicken, sweetcorn & egg drop soup” › “Add to a meal” — sheet “Thêm món ăn vào bữa”: select height 41 px [1 pass]
- shopping › “Choose a store” — sheet “Mua Thịt heo ở đâu?”: select height 41 px [2 passes]
- today › “Lịch mang cơm” — sheet “Lịch mang cơm trưa”: button.pack-all-btn width 41 px [4 passes]
- recipes › (screen) — screen Món ăn: button “Tất cả (#)” height 42 px [6 passes]
- recipes › (screen) — screen Món ăn: button. height 42 px [10 passes]
- recipes › (screen) — screen Món ăn: button “Kho tham khảo (#)” height 40 px [6 passes]
- recipes › (screen) — screen Món ăn: button “Cộng đồng” height 40 px [6 passes]
- recipes › “Viết món ăn” — sheet “Viết món ăn của gia đình”: input.check height 17 px [5 passes]
- pantry › (screen) — screen Tủ: button.chip height 38 px [10 passes]
- pantry › (screen) — screen Tủ: button.text-btn height 22 px [6 passes]
- pantry › “Thêm thực phẩm” — sheet “Thêm thực phẩm”: select height 41 px [6 passes]
- pantry › “Chỉnh sửa” — sheet “Chỉnh thực phẩm”: select height 41 px [4 passes]
- expenses › (screen) — screen Chi tiêu: button.text-btn height 22 px [10 passes]
- expenses › “Hóa đơn” — sheet “Chụp / nhập hóa đơn”: select.input height 41 px [4 passes]
- expenses › “Hóa đơn” — sheet “Chụp / nhập hóa đơn”: button.text-btn height 22 px [4 passes]
- today › “Packed lunches” — sheet “Packed lunch schedule”: button.pack-all-btn width 41 px [2 passes]
- expenses › “Nhập ghi chú” — sheet “Nhập từ ghi chú điện thoại”: select height 41 px [4 passes]
- expenses › “Xem / sửa ↗” — sheet “Xem & sửa hóa đơn”: select.input height 41 px [4 passes]
- expenses › “Xem / sửa ↗” — sheet “Xem & sửa hóa đơn”: button.text-btn height 22 px [4 passes]
- insights › “Xem món ăn & thêm vào bữa ↗” — sheet “Gà luộc lá chanh nhà Bà Tư”: select height 41 px [4 passes]
- products › (screen) — screen Giá / So Giá: select.input height 41 px [10 passes]
- Thanh trên › (screen) — screen Thanh trên / Thêm / Tài khoản: button.language-toggle height 40 px [10 passes]
- Thanh trên › (screen) — screen Thanh trên / Thêm / Tài khoản: button.icon.notification height 42 px [10 passes]
- planner › “Hủ tiếu thịt bằmMón sợi” › “Chế độ nấu” — sheet “Cùng nấu Hủ tiếu thịt bằm”: button.text-btn height 22 px [1 pass]
- recipes › (screen) — screen Món ăn: button “All (#)” height 42 px [4 passes]
- recipes › (screen) — screen Món ăn: button “Reference library (#)” height 40 px [4 passes]
- recipes › (screen) — screen Món ăn: button “Community” height 40 px [4 passes]
- recipes › “Write recipe” — sheet “Write a family recipe”: input.check height 17 px [3 passes]
- pantry › “Add pantry food” — sheet “Add pantry food”: select height 41 px [4 passes]
- pantry › “Edit” — sheet “Chỉnh thực phẩm”: select height 41 px [2 passes]
- expenses › “Scan / enter a receipt” — sheet “Snap / type a receipt”: select.input height 41 px [2 passes]
- expenses › “Scan / enter a receipt” — sheet “Snap / type a receipt”: button.text-btn height 22 px [2 passes]
- expenses › “Import notes” — sheet “Nhập từ ghi chú điện thoại”: select height 41 px [2 passes]
- expenses › “View / edit ↗” — sheet “View & edit receipt”: select.input height 41 px [2 passes]
- expenses › “View / edit ↗” — sheet “View & edit receipt”: button.text-btn height 22 px [2 passes]
- insights › “View recipe & add to a meal ↗” — sheet “Gà luộc lá chanh nhà Bà Tư”: select height 41 px [2 passes]
- planner › “Minced pork hu tieu noodle soupNoodle di” › “Cooking mode” — sheet “Cùng nấu Hủ tiếu thịt bằm”: button.text-btn height 22 px [1 pass]
- shopping › “Mua thêm” — sheet “Mua thêm món / nguyên liệu ngoài thực đơn”: select height 41 px [2 passes]
- shopping › “Mua thêm” — sheet “Mua thêm món / nguyên liệu ngoài thực đơn”: select.topspace height 41 px [2 passes]
- shopping › “Nhập Notes” — sheet “Nhập từ ghi chú điện thoại”: select height 41 px [2 passes]
- shopping › “Nhờ mua” — sheet “Quên ghi đồ? Nhờ mua thêm ngay”: select height 41 px [2 passes]
- shopping › “Nhờ mua” — sheet “Quên ghi đồ? Nhờ mua thêm ngay”: input.check.errand-target height 17 px [2 passes]
- shopping › “Nhờ mua” — sheet “Quên ghi đồ? Nhờ mua thêm ngay”: input.check height 17 px [2 passes]
- shopping › “Cửa hàng” — sheet “Cửa hàng & địa điểm thường mua”: a.text-btn height 22 px [2 passes]
- shopping › “Chụp hóa đơn” — sheet “Chụp / nhập hóa đơn”: select.input height 41 px [2 passes]
- shopping › “Chụp hóa đơn” — sheet “Chụp / nhập hóa đơn”: button.text-btn height 22 px [2 passes]
- insights › “Xem món ăn & thêm vào bữa ↗” › “Chế độ nấu” — sheet “Cùng nấu Gà luộc lá chanh nhà Bà Tư”: button.text-btn height 22 px [1 pass]
- shopping › “Add item” — sheet “Buy items not on the menu”: select height 41 px [2 passes]
- shopping › “Add item” — sheet “Buy items not on the menu”: select.topspace height 41 px [2 passes]
- shopping › “Import Notes” — sheet “Nhập từ ghi chú điện thoại”: select height 41 px [2 passes]
- shopping › “Request item” — sheet “Forgot an item? Ask your shopper”: select height 41 px [2 passes]
- shopping › “Request item” — sheet “Forgot an item? Ask your shopper”: input.check.errand-target height 17 px [2 passes]
- shopping › “Request item” — sheet “Forgot an item? Ask your shopper”: input.check height 17 px [2 passes]
- shopping › “Stores” — sheet “Cửa hàng & địa điểm thường mua”: a.text-btn height 22 px [2 passes]
- today › “Bánh canh cá viên nhanh” — sheet “Bánh canh cá viên nhanh”: select height 41 px [1 pass]
- shopping › “Scan receipt” — sheet “Snap / type a receipt”: select.input height 41 px [2 passes]
- shopping › “Scan receipt” — sheet “Snap / type a receipt”: button.text-btn height 22 px [2 passes]
- planner › “Thêm món ăn” — sheet “Thêm món ăn · Bữa sáng · 7/11”: select height 42 px [1 pass]
- insights › “View recipe & add to a meal ↗” › “Cooking mode” — sheet “Cùng nấu Gà luộc lá chanh nhà Bà Tư”: button.text-btn height 22 px [1 pass]

### drawings (rule 27) (33)

- today › (screen) — screen Hôm nay: chip/tab/disclosure shows a drawing: “Nhắn khẩn Không có tin mới” [6 passes]
- today › (screen) — screen Hôm nay: chip/tab/disclosure shows a drawing: “Giải phóng tủ lạnh & gợi ý món ăn từ tủ” [4 passes]
- today › (screen) — screen Hôm nay: chip/tab/disclosure shows a drawing: “Ai nấu, ai đi chợ” [6 passes]
- today › (screen) — screen Hôm nay: chip/tab/disclosure shows a drawing: “Urgent messages No new messages” [4 passes]
- today › (screen) — screen Hôm nay: chip/tab/disclosure shows a drawing: “Clear the fridge & dishes from what you ” [2 passes]
- today › (screen) — screen Hôm nay: chip/tab/disclosure shows a drawing: “Who cooks, shops” [4 passes]
- today › “Lịch tháng” — sheet “Lịch gia đình theo tháng”: icon-only button uses a text symbol, no drawing: “‹” [6 passes]
- today › “Lịch tháng” — sheet “Lịch gia đình theo tháng”: icon-only button uses a text symbol, no drawing: “›” [6 passes]
- today › “Calendar” — sheet “Family monthly calendar”: icon-only button uses a text symbol, no drawing: “‹” [4 passes]
- today › “Calendar” — sheet “Family monthly calendar”: icon-only button uses a text symbol, no drawing: “›” [4 passes]
- today › “Kết nối gia đình” › “Thiết lập lại từ đầu” — sheet “Thiết lập bếp · 1/5”: icon-only button uses a text symbol, no drawing: “−” [2 passes]
- today › “Connect family” › “Guided setup” — sheet “Set up your kitchen · 1/5”: icon-only button uses a text symbol, no drawing: “−” [2 passes]
- today › “Sửa món Gà luộc lá chanh nhà Bà Tư” — sheet “Sửa món ăn gia đình”: chip/tab/disclosure shows a drawing: “Dán danh sách nguyên liệu” [4 passes]
- today › “Lịch mang cơm” — sheet “Lịch mang cơm trưa”: icon-only button uses a text symbol, no drawing: “✓” [6 passes]
- today › “Nhập bằng lời nói” › “Thử giọng nói” — sheet “Kiểm tra giọng chính xác trên máy này”: main button has no drawing: “Bắt đầu kiểm tra” [2 passes]
- today › “Edit Gà luộc lá chanh nhà Bà Tư” — sheet “Edit family recipe”: chip/tab/disclosure shows a drawing: “Paste an ingredient list” [2 passes]
- today › “Packed lunches” — sheet “Packed lunch schedule”: icon-only button uses a text symbol, no drawing: “✓” [4 passes]
- planner › (screen) — screen Thực đơn: icon-only button uses a text symbol, no drawing: “✕” [6 passes]
- today › “Voice input” › “Test voice” — sheet “Check accurate voice on this device”: main button has no drawing: “Start the check” [2 passes]
- shopping › (screen) — screen Đi chợ: chip/tab/disclosure shows a drawing: “$ Ngân sách dự kiến, chia sẻ & cất đồ và” [6 passes]
- today › “Súp gà bắp trứng” › “Chép thành món nhà” — sheet “Viết món ăn của gia đình”: chip/tab/disclosure shows a drawing: “Dán danh sách nguyên liệu” [1 pass]
- shopping › (screen) — screen Đi chợ: chip/tab/disclosure shows a drawing: “$ Estimated budget, sharing & storing it” [4 passes]
- today › “Chicken, sweetcorn & egg drop soup” › “Save as family dish” — sheet “Write a family recipe”: chip/tab/disclosure shows a drawing: “Paste an ingredient list” [1 pass]
- recipes › (screen) — screen Món ăn: chip/tab/disclosure shows a drawing: “Cộng đồng” [6 passes]
- recipes › (screen) — screen Món ăn: chip/tab/disclosure shows a drawing: “Món Âu & Ý 0” [6 passes]
- recipes › (screen) — screen Món ăn: chip/tab/disclosure shows a drawing: “Lọc” [6 passes]
- recipes › “Viết món ăn” — sheet “Viết món ăn của gia đình”: chip/tab/disclosure shows a drawing: “Dán danh sách nguyên liệu” [5 passes]
- expenses › “Xem / sửa ↗” — sheet “Xem & sửa hóa đơn”: icon-only button uses a text symbol, no drawing: “×” [4 passes]
- recipes › (screen) — screen Món ăn: chip/tab/disclosure shows a drawing: “Community” [4 passes]
- recipes › (screen) — screen Món ăn: chip/tab/disclosure shows a drawing: “Western & Italian 0” [4 passes]
- recipes › (screen) — screen Món ăn: chip/tab/disclosure shows a drawing: “Filters” [4 passes]
- recipes › “Write recipe” — sheet “Write a family recipe”: chip/tab/disclosure shows a drawing: “Paste an ingredient list” [3 passes]
- expenses › “View / edit ↗” — sheet “View & edit receipt”: icon-only button uses a text symbol, no drawing: “×” [2 passes]

### language: Vietnamese in English mode (19)

- today › “Connect family” › “Remove a member” — sheet “Thành viên nhà mình”: Thành viên nhà mình / Thêm người hoặc bớt đúng thành viên. Khẩu phần của các bữa chưa nấu sẽ tính lại; bữa đã nấu giữ lượng đã dùng. / 1 suất chuẩn / bữa / Bớt người này [2 passes]
- shopping › (screen) — screen Đi chợ: [title] Đã mua Giấy bếp cuộn lớn / [aria-label] Đã mua Giấy bếp cuộn lớn [2 passes]
- today › “Chicken, sweetcorn & egg drop soup” › “Remove from recipes” — sheet “Xóa công thức khỏi kho?”: Xóa công thức khỏi kho? / Công thức đã chọn cho thực đơn vẫn được giữ trong bữa ăn. Bạn có thể thêm lại món bằng cách tạo công thức mới. [1 pass]
- today › “Chicken, sweetcorn & egg drop soup” › “Cooking mode” — sheet “Cùng nấu Súp gà bắp trứng”: Cùng nấu Súp gà bắp trứng / Bước 1/4 / Giữ sáng màn hình · 25 phút / công thức / Tất cả các bước (chạm để đánh dấu) [1 pass]
- today › “Chicken, sweetcorn & egg drop soup” › “Add to a meal” — sheet “Thêm món ăn vào bữa”: Thêm món ăn vào bữa / Ngày trong tuần đang xem / Bữa ăn / Cách thêm [1 pass]
- shopping › “Choose a store” — sheet “Mua Thịt heo ở đâu?”: Mua Thịt heo ở đâu? / Chỗ thường dùng (chạm để chọn & tự nhớ cho lần tới) / Hoặc chọn từ danh sách cửa hàng / Ghi chú riêng cho lần mua này [2 passes]
- pantry › “Edit” — sheet “Chỉnh thực phẩm”: Chỉnh thực phẩm / Xóa lô này [2 passes]
- expenses › (screen) — screen Chi tiêu: Chợ Cabramatta QA · 12/11 · 1 lần ghi nhận / Cần thêm 1 lần mua [2 passes]
- expenses › “Import notes” — sheet “Nhập từ ghi chú điện thoại”: Nhập từ ghi chú điện thoại / iPhone Notes / Google Keep / Samsung Notes: sao chép nội dung và dán bên dưới, hoặc xuất tệp .txt / .md / .csv rồi chọn  / Bạn muốn nhập vào đâu? / [option [2 passes]
- expenses › “View / edit ↗” — sheet “View & edit receipt”: [option] lát / [option] nắm / [option] cây / [option] củ [2 passes]
- planner › “Minced pork hu tieu noodle soupNoodle di” › “Cooking mode” — sheet “Cùng nấu Hủ tiếu thịt bằm”: Cùng nấu Hủ tiếu thịt bằm / Bước 1/4 / Giữ sáng màn hình · 20 phút / công thức / Tất cả các bước (chạm để đánh dấu) [1 pass]
- shopping › “Choose a store” › “Add store” — sheet “Thêm nơi mua đồ”: Thêm nơi mua đồ / Tên cửa hàng / chợ / Địa chỉ / chi nhánh (tùy chọn) / Địa chỉ chỉ do bạn nhập. Nút bản đồ sẽ mở tìm kiếm địa chỉ đó để bạn kiểm tra. [1 pass]
- shopping › “Add item” › “Add store” — sheet “Thêm nơi mua đồ”: Thêm nơi mua đồ / Tên cửa hàng / chợ / Địa chỉ / chi nhánh (tùy chọn) / Địa chỉ chỉ do bạn nhập. Nút bản đồ sẽ mở tìm kiếm địa chỉ đó để bạn kiểm tra. [1 pass]
- shopping › “Import Notes” — sheet “Nhập từ ghi chú điện thoại”: Nhập từ ghi chú điện thoại / iPhone Notes / Google Keep / Samsung Notes: sao chép nội dung và dán bên dưới, hoặc xuất tệp .txt / .md / .csv rồi chọn  / Bạn muốn nhập vào đâu? / [option [2 passes]
- shopping › “Request item” — sheet “Forgot an item? Ask your shopper”: Nhập một yêu cầu rõ ràng. App thêm vào danh sách mua và giữ nội dung cho người mua; bạn chọn gửi push hoặc chia sẻ nếu c / Dự kiến tổng tiền AUD (tùy chọn) / [option] Tùy nơi / c [2 passes]
- shopping › “Stores” — sheet “Cửa hàng & địa điểm thường mua”: Cửa hàng & địa điểm thường mua / Các cửa hàng bạn thường đi sẽ hiện ngay khi chọn nơi mua trên danh sách Đi chợ và tự động ghi nhớ cho lần sau. / Bản đồ ↗ / Sửa [2 passes]
- shopping › “Stores” › “Sửa” — sheet “Sửa cửa hàng”: Sửa cửa hàng / Tên cửa hàng / chợ / Địa chỉ / chi nhánh (tùy chọn) / Địa chỉ chỉ do bạn nhập. Nút bản đồ sẽ mở tìm kiếm địa chỉ đó để bạn kiểm tra. [1 pass]
- pantry › “Edit” › “Xóa lô này” — sheet “Delete this pantry lot?”: Xóa lô [1 pass]
- insights › “View recipe & add to a meal ↗” › “Cooking mode” — sheet “Cùng nấu Gà luộc lá chanh nhà Bà Tư”: Cùng nấu Gà luộc lá chanh nhà Bà Tư / Bước 1/1 / Giữ sáng màn hình · 50 phút / công thức / Luộc gà nhà Bà Tư khoảng [1 pass]

### page jump (rule 24) (16)

- today › “Khách: 3 · sửa” › “Thêm nhóm khách” — the tapped control moved 610 → 864 px (scroll 0 → 0) [1 pass]
- today › “Guests: 3 · edit” › “Add a guest group” — the tapped control moved 610 → 864 px (scroll 0 → 0) [1 pass]
- today › “Cả nhà” › “Mẹ thích món này” — the tapped control moved 464 → 425 px (scroll 0 → 0) [1 pass]
- today › “Cả nhà” › “Mẹ không thích món này” — the tapped control moved 464 → 411 px (scroll 0 → 0) [1 pass]
- today › “Family” › “Mum likes this” — the tapped control moved 464 → 425 px (scroll 0 → 0) [1 pass]
- today › “Family” › “Mum dislikes this” — the tapped control moved 464 → 411 px (scroll 0 → 0) [1 pass]
- today › “Có khách” › “Thêm nhóm khách” — the tapped control moved 610 → 864 px (scroll 0 → 0) [1 pass]
- shopping › “Chụp hóa đơn” › “Đọc các dòng hóa đơn” — the tapped control moved 622 → 759 px (scroll 0 → 0) [1 pass]
- today › “Guests coming” › “Add a guest group” — the tapped control moved 610 → 864 px (scroll 0 → 0) [1 pass]
- recipes › “Viết món ăn” › “Thêm nguyên liệu” — the tapped control moved 329 → 510 px (scroll 0 → 0) [2 passes]
- expenses › “Hóa đơn” › “Đọc các dòng hóa đơn” — the tapped control moved 622 → 759 px (scroll 0 → 0) [1 pass]
- expenses › “Xem / sửa ↗” › “Đọc các dòng hóa đơn” — the tapped control moved 4314 → 759 px (scroll 0 → 0) [1 pass]
- shopping › “Scan receipt” › “Read the receipt lines” — the tapped control moved 647 → 784 px (scroll 0 → 0) [1 pass]
- recipes › “Write recipe” › “Add ingredient” — the tapped control moved 329 → 510 px (scroll 0 → 0) [2 passes]
- expenses › “Scan / enter a receipt” › “Read the receipt lines” — the tapped control moved 647 → 784 px (scroll 0 → 0) [1 pass]
- expenses › “View / edit ↗” › “Read the receipt lines” — the tapped control moved 4345 → 784 px (scroll 0 → 0) [1 pass]

### sheet footer (rule 25) (9)

- today › “Kết nối gia đình” — sheet “Bếp của nhà mình”: Lưu / Đóng inside the sheet body, not in the floating footer: Lưu khẩu phần, Lưu thực đơn [6 passes]
- today › “Connect family” — sheet “My kitchen”: Lưu / Đóng inside the sheet body, not in the floating footer: Save portions, Save menu [4 passes]
- today › “Súp gà bắp trứng” — sheet “Súp gà bắp trứng”: Lưu / Đóng inside the sheet body, not in the floating footer: Lưu sở thích [3 passes]
- today › “Chicken, sweetcorn & egg drop soup” — sheet “Chicken, sweetcorn & egg drop soup”: Lưu / Đóng inside the sheet body, not in the floating footer: Save preference [2 passes]
- planner › “Hủ tiếu thịt bằmMón sợi” — sheet “Hủ tiếu thịt bằm”: Lưu / Đóng inside the sheet body, not in the floating footer: Lưu sở thích [4 passes]
- planner › “Minced pork hu tieu noodle soupNoodle di” — sheet “Minced pork hu tieu noodle soup”: Lưu / Đóng inside the sheet body, not in the floating footer: Save preference [2 passes]
- insights › “Xem món ăn & thêm vào bữa ↗” — sheet “Gà luộc lá chanh nhà Bà Tư”: Lưu / Đóng inside the sheet body, not in the floating footer: Lưu sở thích [4 passes]
- insights › “View recipe & add to a meal ↗” — sheet “Gà luộc lá chanh nhà Bà Tư”: Lưu / Đóng inside the sheet body, not in the floating footer: Save preference [2 passes]
- today › “Bánh canh cá viên nhanh” — sheet “Bánh canh cá viên nhanh”: Lưu / Đóng inside the sheet body, not in the floating footer: Lưu sở thích [1 pass]

### week start (rule 34) (5)

- planner › “Tuần bắt đầu Thứ 2 Thứ 3 Thứ 4 Thứ 5 Thứ” — after the tap: wrote a week keyed 2026-11-16, which is not the family's start day [2 passes]
- planner › “Week starts Monday Tuesday Wednesday Thu” — after the tap: wrote a week keyed 2026-11-16, which is not the family's start day [2 passes]
- planner › “Tuần trước” — after the tap: wrote a week keyed 2026-10-26, which is not the family's start day [1 pass]
- planner › “Tuần sau” — after the tap: wrote a week keyed 2026-11-16, which is not the family's start day [1 pass]
- expenses › “Tuần trước” — after the tap: wrote a week keyed 2026-10-26, which is not the family's start day [1 pass]

### horizontal overflow (4)

- shopping › “392.8 g ⌃ ⌄” — sheet “Choose buying unit & quantity”: page 38px wider;  [1 pass]
- shopping › “Choose a store” — sheet “Mua Thịt heo ở đâu?”: page 38px wider;  [1 pass]
- shopping › “Remove Pork from the list” — sheet “Take Pork off the list?”: page 38px wider;  [1 pass]
- shopping › “Remove Pork ribs from the list” — sheet “Take Pork ribs off the list?”: page 38px wider;  [1 pass]

### sheet has no content (rule 31) (4)

- shopping › “Đồ trong tủ (0)” — sheet “Đồ trong tủ”: no control to act on and no empty-state message; body: “Danh sách tuần này, tủ đã có Tuần này chưa cần mua món nào tủ đã có. Còn trong tủ (0) Tủ đang trống.” [2 passes]
- products › “Lưu từ hóa đơn” — sheet “Chọn dòng hóa đơn đã xác nhận”: no control to act on and no empty-state message; body: “Lưu cả lượng của dòng và thành tiền như một quy cách. Kiểm tra và chỉnh lại trước khi lưu. Chưa có dòng hóa đơn.” [2 passes]
- shopping › “Pantry (0)” — sheet “In the pantry”: no control to act on and no empty-state message; body: “On this week’s list, already in the pantry Nothing on this week’s list is already in the pantry. Also in the pantry (0) The pantry is empty.” [2 passes]
- products › “Save from a receipt” — sheet “Choose a confirmed receipt line”: no control to act on and no empty-state message; body: “The line quantity and line total become one recorded pack/size. Review and correct before saving. No receipt lines yet.” [2 passes]

### sheet is only a hint (rule 31) (4)

- shopping › “Đồ trong tủ (0)” — sheet “Đồ trong tủ”: “Danh sách tuần này, tủ đã có Tuần này chưa cần mua món nào tủ đã có. Còn trong tủ (0) Tủ đang trống.” [2 passes]
- products › “Lưu từ hóa đơn” — sheet “Chọn dòng hóa đơn đã xác nhận”: “Lưu cả lượng của dòng và thành tiền như một quy cách. Kiểm tra và chỉnh lại trước khi lưu. Chưa có dòng hóa đơn.” [2 passes]
- shopping › “Pantry (0)” — sheet “In the pantry”: “On this week’s list, already in the pantry Nothing on this week’s list is already in the pantry. Also in the pantry (0) The pantry is empty.” [2 passes]
- products › “Save from a receipt” — sheet “Choose a confirmed receipt line”: “The line quantity and line total become one recorded pack/size. Review and correct before saving. No receipt lines yet.” [2 passes]

### language: English in Vietnamese mode (2)

- products › “Lưu sản phẩm” — sheet “Lưu sản phẩm và giá”: Giá chưa xác nhận tồn hàng và có thể khác theo chi nhánh, thành viên hoặc khuyến mãi. Nếu nhập từ receipt, kiểm tra số l / [placeholder] 1 bottle 500 ml / 1 pack 2 kg [6 passes]
- products › “Nhập bảng CSV” — sheet “Nhập sản phẩm từ CSV”: Cột bắt buộc: retailer,name,price,size,checkedAt. Tùy chọn: branch,barcode,url. retailer: coles / woolworths / chemist.  / [placeholder] retailer,name,price,size,checkedAt,branch [6 passes]
