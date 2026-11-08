# v1.7.16 — the loading screen shows the app's own drawings

Times are in Sydney time (Australia/Sydney). **Not deploy-approved.** Nothing is merged or built on hosting until Henry says DEPLOY.

## Owner report, 8 Nov 2026
Henry sent a phone screenshot of the grey loading screen and asked: *“Tại sao vẫn hiện cái icon cũ này?”*

**Why it happened:** the page shell in `dist/index.html` appears before the app's scripts run. That shell still had the old text symbol ♧ on the reminders button. On a slow start, or while the app was updating, the family saw that symbol until the app replaced it with the drawn bell. The desktop sidebar in the same shell also still had two phone emoji (🏡 family, 🌿 note). These go against rule 19.

## Change
- **Reminders button:** the shell now has the same drawn bell the app shows, with the same size (32 × 42 px on phones, 42 × 42 px from tablet up). Nothing jumps when the app finishes loading. The small dot from the old symbol is gone, as it is in the app.
- **Sidebar:** the family badge and the sidebar note use the app's house and leaf drawings.
- **Footer:** the heart (♡) stays. It is ordinary text, and the app shows the same heart.
- **New `npm run check` step:** it fails if the loading shell shows any emoji or symbol icon. It also checks that the bell is a drawing. On the old shell it reports 🏡 🌿 ♧.


## 2. Removing an invited guest really removes them (owner, 8 Nov 2026, 20:25)
*“Cái có khách có vẻ như để huỷ buổi tiệc hay huỷ invite cho ai đó không được, ví dụ tôi có tesr là khách, vào xoá mà nó vẫn báo là có khách.”*

**Cause, reproduced in the browser:**
- An invitation puts the guest group on every meal it covers.
- “Xem” on Today opened the sheet for one meal only. Removing the group and saving cleared that meal, but the other meals of the invitation still had the guest, so Today kept saying “Khách sắp tới”.
- A second way back: the family sync kept a group removed on one device if another device had changed it meanwhile.

**Change:**
- **Sheet:** removing an invited group shows *“Bấm Lưu để bỏ Tesr khỏi mọi bữa của lời mời và huỷ link đã gửi.”*
- **Lưu:** takes the group off every uncooked meal of the invitation and withdraws the link on the server. The guest page then says the invitation was cancelled. The toast says *“Đã huỷ lời mời: Tesr.”* If the device is offline, it says the link could not be withdrawn yet.
- **Đóng:** changes nothing.
- **Cancelling a whole party:** remove every group and save.
- **Family sync:** a meal's guest list is now one value. Removing all guests is a change like any other, so the newer edit of the meal wins and an older edit on another device cannot bring the guests back. Covered by a new `sync-merge` test, which fails without the fix.

## 3. A bigger “Bắt đầu đi chợ” with a running colour ring (owner, 8 Nov 2026)
*“Nút bắt đầu đi chợ làm to ra và có viền màu flashing chạy viền ngoài.”*

- **Size:** 60 px tall (was 48), pill-shaped, bold, full width on phones. It keeps its cart drawing.
- **Ring:** a colour ring (the art kit's colours) runs around the edge, one turn every 2.4 s. It turns smoothly and does not flash on and off, to keep it comfortable for the eyes.
- **Reduced motion:** the ring stays still (rule 13). It also stays still on old browsers without `@property`.
- **Focus:** keyboard focus shows an orange outline outside the ring.

## 4. Receipt lines: the unit fits, and the match box finds or adds an ingredient (owner, 8 Nov 2026, 20:31)
*“Hình đơn vị bị chèn, nguyên liệu chưa đối ứng không có lựa chọn search hoặc thêm mà chỉ có dropdown.”*

- **Unit column:** wider (108 px on phones, 116 px on larger screens), so “Chưa rõ” / “Unknown” is no longer cut off. The quantity column, which only holds a short number, is narrower.
- **Match box:** the long “Đối ứng” dropdown is now a box to type in (`receipt-match-picker.ts`).
  - **With nothing typed:** it suggests what is on the shopping list and “Chi tiêu khác”.
  - **Typing:** finds ingredients and dishes on the menu without needing accents. For example, “tom” finds *Tôm*, and English names work in English.
  - **Name not found:** it offers **“Thêm nguyên liệu mới: “…””**. This adds the name to the family's own ingredient list (`state.ingredientCatalog`, the same list recipe import uses), in the line's unit: grams for g/kg, ml for ml/l, otherwise that unit. Next time the name is found, not added again.
  - **Suggestions and voice matches** still fill the box.
  - **Every option** is at least 44 px tall, with words only (no drawings, rule 27). Enter picks the first option, Escape closes the list.
  - **Unchanged:** the original select stays as the hidden value, so saving, suggestions and learning work as before.
- **Tests (`test:v1716:browser`):**
  - the unit text fits in its box;
  - the dropdown is replaced;
  - “tom” finds Tôm;
  - “Chả song” is added once, in grams, kept on the line, and found the next time without a second add.
- **Screenshots:** `receipt-match-search-*`.

## 5. Recipe import: “Tên: lượng” lines, and no wrong ingredients (owner, 8 Nov 2026, 20:42)
*“https://netspace.edu.vn/cach-nau-pho-bo-ngon-nhu-quan/ — Các nguyên liệu lấy gần đúng nhưng chỗ nào có : cũng bị mang vào, nhiều chỗ đọc định lượng không đúng.”*

The page's recipe data was read here with the app's own reader. It writes 24 lines such as “Xương ống bò: 0.5kg”, “Bò tái:1,2kg” and “Chanh: 1 quả”.

**Causes:**
1. **The colon:** the reader only understood “lượng đơn vị tên”. The editor split “name: amount” but left the colon in the name, and did not read “Bò tái:1,2kg” (no space, comma decimal) at all.
2. **Wrong ingredients:** a spoken alias was enough to pick an ingredient, so “Hành tím 25g” became **Hành tây**, and “Húng quế 50g” + “Ngò rí 20g” were added up as **Rau thơm 70g**.

**Change:**
- **Reading “Tên: lượng”:** these lines are now read in both places (`importCanon` in kitchen-extras, `rcParseLine` in the editor), with or without a space and with a comma or a dot. The colon never stays in the name, and `lạng` is understood (100 g).
- **Matching:** a line becomes an ingredient only when that ingredient's own name (VI or EN) is in the line. For example, “pork belly” → Thịt heo and “Thịt heo ba chỉ” → Thịt heo. A match the family taught the app still counts.
- **Other lines:** everything else stays as the page wrote it, for the family to match. Amounts are never guessed or added up.
- **On the phở page:**
  - Gừng 25 g, Hành lá 30 g, Chanh 1 quả and Muối 16 g become ingredients.
  - Hành tím 25 g, Húng quế 50 g, Ngò rí 20 g, Xương ống bò 0.5 kg, Bò tái 1,2 kg and the rest are kept as their own lines with their amounts.
  - Rễ ngò rí, Hành tây and Tương ớt / Tương đen have no amount on the page, so none is added.
- **Tests (`test:v1716:browser`):** the page's 24 lines are imported. The test checks that no colon is left in a name, the amounts above, and that Hành tím and the herbs are kept separate. `test:v1715:browser` (the import of English lines) still passes.
- **Screenshots:** `import-name-colon-*`.

## 6. The bottom bar slides sideways (owner, 8 Nov 2026, 20:44)
*“Phần bar ở dưới này nên làm chế độ trượt qua lại được như thế sẽ nhanh hơn là phải vào ‘thêm’.”*

- **What is in the bar:** on phones (≤ 760 px) the bar now holds every section and slides sideways: Hôm nay · Thực đơn · Đi chợ · Món ăn · Tủ · Chi tiêu · Thói quen · Giá · Thêm. Four fit on the screen, and a soft fade on the edge shows there is more. “Thêm” stays last, for settings, the guide and install.
- **Drawings:** each section has its own line drawing. The old text symbols ▤ ▧ ◷ ◴ and ⌂ are replaced (rule 27), and Giá's coloured bag became a line drawing like the rest.
- **Labels:**
  - Long names get a short one that fits: “Tủ”, “Thói quen”, “Giá”, and “Món ăn” instead of “Kho món ăn 125”.
  - The full name stays for screen readers.
  - English labels: Recipes, Pantry, Spending, Habits, Prices.
- **Position:** the bar keeps its sideways position when the page redraws. The open section is brought into view sideways only, and the page itself never moves (rule 24). Opening a section is real navigation.
- **Wider screens:** tablets and computers keep the sidebar as before.
- **Tests (`test:v1716:browser`):**
  - Phones (375, 320): all 9 items present, in order, with drawings, ≥ 44 px. Short names are checked, and the full name for screen readers. The bar slides and shows the fade. Tủ and then Chi tiêu each open in one tap and stay in view.
  - Tablet and desktop: the sidebar lists every section.
- **Screenshots:** `nav-slide-start-*`, `nav-slide-end-*`.

## Tests
- `npm run check`: the loading-shell step.
- `sync-merge` (in `npm test`): guests removed on one device are not brought back.
- **New suite `test:v1716:browser`** (in `test:all`), run at 375 / 320 / 820 / 1280 px in VI and EN:
  - an invited group on several meals: “Đóng” keeps it; removing and saving takes it off every meal, withdraws the link once and drops it from Today;
  - the start button is ≥ 56 px tall, full width on phones, and keeps its drawing;
  - the ring is present, still under reduced motion and running otherwise;
  - no sideways scroll.
- Screenshots: `guest-remove-note-*`, `guest-removed-today-*`, `shop-start-*`.

## Evidence (loading shell) (Chromium viewport simulation; the app's scripts are blocked to show the loading shell)
| Size | Loading shell | Loaded app |
|---|---|---|
| Phone 375×812 | `shell-mobile-375x812.png` | `app-mobile-375x812.png` |
| Narrow phone 320×740 | `shell-narrow-320x740.png` | `app-narrow-320x740.png` |
| Tablet 820×1100 | `shell-tablet-820x1100.png` | `app-tablet-820x1100.png` |
| Desktop 1280×800 | `shell-desktop-1280x800.png` | `app-desktop-1280x800.png` |

- At every size the bell is drawn, the same size in the shell and in the app, and the page has no sideways scroll.

## Limits
- **Old copies on phones:** phones that saved the old page keep showing it until the app updates itself. That happens on the next open after deploy.
- **Testing:** viewport simulation only, not physical devices.
