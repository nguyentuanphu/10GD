# v1.7.19: a reply notification opens “Góp ý của tôi”; privacy rule 28

All times are in Sydney time. **Not approved for deploy.** Nothing is merged into main or built on hosting until Henry says DEPLOY.

## Owner decisions, 12 Nov 2026 (pop-up)
- **Privacy section 7a** (receipt text sent to improve reading, added in v1.7.18): **kept as it is.** Henry was not asked before it went live. That was the agent's mistake, and it led to the new rule 28.
- **Reply to a family's feedback:** tapping the notification opens the ladybug straight on **“Góp ý của tôi”**.

## 1. AGENTS.md rule 28: privacy changes need Henry first
These changes need Henry's answer, given through the pop-up, before they go on any release branch:
- the privacy policy;
- the terms;
- what personal or family data the app collects, sends, stores or shares.

The question must show him the exact VI and EN wording and the data change. Approving a feature does not approve its privacy text. Every release report must name each privacy or data change in plain words.

## 2. A reply notification opens “Góp ý của tôi”
**Before:** Studio replies to a report, and the person who sent it gets “Có trả lời góp ý của bạn — Chạm con bọ rùa → Góp ý của tôi.” Tapping it opened Hôm nay only, so they had to find the ladybug and the tab themselves.

**Now:**
- The notification links to `/#today?lb=mine`.
- The text reads “Chạm để đọc câu trả lời.” / “Tap to read the reply.” (rule 26).
- **Server (`push.mts`), service worker (`sw.ts`) and the in-app push handler (`household-ui.ts`):** these accept that one extra link. Any other unknown link is still not passed on.
- **App (`ladybug.ts`):** the app opens on Hôm nay, puts back a plain `#today`, and opens the ladybug on “Góp ý của tôi”. This works when the app was closed and when it is already open.
- If the ladybug is not shown for this person, only Hôm nay opens.

**Data:** none. No new data is collected, sent or stored, and the privacy text is unchanged.

**Tests:**
- `notifications.test` (in `npm test`) checks:
  - the reply link and its wording in VI and EN;
  - that other unknown links are not passed on.
- `test:ladybug:browser` checks:
  - from a closed app, the link opens the sheet with “Góp ý của tôi” selected and leaves `#today`;
  - the same with the app already open;
  - nothing opens for someone the ladybug is hidden from.

**Local results** (12 Nov 2026, Sydney time): check, typecheck, `npm test`, `test:ladybug:browser` and `test:offline:browser` all OK.

## 3. Evidence: the buying-unit sheet on the live site
Henry asked on 12 Nov 2026 why he could not see the new unit sheet. These screenshots were taken on the live 10gd.netlify.app (v1.7.18) at 390×844 in Chromium, with test data in device-only mode. They show where the sheet is:
- `unit-picker-prod/1-di-cho-nut-luong-mua.png`: the quantity button on Đi chợ.
- `2-bang-chon-don-vi.png`: suggestions shown straight away.
- `3-xem-tat-ca-don-vi.png`: “Xem tất cả đơn vị”.
- `4-them-don-vi-rieng.png`: “Tự thêm đơn vị”, with the optional conversion.

These are not screenshots from a physical phone.

## Audit fixes — owner rules polish (rules 8, 19–27) and small UI items

Branch `agent-w5/fixes`, 12 Nov 2026 (Sydney time). New suite `test:owner-rules:browser` (`src/tests/owner-rules-browser.test.cts`, in `test:all`): it opens all 8 screens (with every disclosure closed and then open), taps every non-destructive control on each screen, opens 22 more sheets from the app's functions and every account-menu item, in VI and EN at 320×740 and 375×812, and checks each screen and sheet. On the base commit it reported 751 problems; on this branch the only one left is the extras × (see below). Screens are also captured at 820×1100 and 1280×800, and in light and dark mode. Screenshots are in `docs/reviews/v1.7.19/owner-rules/`. This is Chromium viewport simulation, not a physical phone.

| Finding | What changed | Test |
|---|---|---|
| D1 | The shared and copied shopping list no longer has 🧺🥩🥬🧂🛍️🏪. Only the emoji characters were removed; the wording is left for W4. | owner-rules: shared `textShopping` has no emoji |
| D2 | The “Nhờ mua thêm” push and share text now uses words: “Ở:”, “Ghi chú:”. | owner-rules: `requestText` |
| D3 | The legacy `textWeek` and `share-day` text no longer has 🍲 ☀ ☾. | owner-rules: `textWeek` |
| A27 | “Giữ bữa” / “Đã giữ bữa” and its toast are words only. | owner-rules: tap “Giữ bữa” |
| D4, D5 | Chips, tabs and `<summary>` are words only. `emoji-art` now drops an app emoji inside `.chip`, `[role=tab]` and `summary` instead of drawing it; family text is untouched. The inline drawings were removed from “Lọc”, “Cộng đồng”, “Nhắn khẩn”, “Dán danh sách nguyên liệu” and the ⚡ time chip. The simple-view headings keep their source text because they are W4 dictionary keys; the runtime rule removes the emoji. | owner-rules: no drawing on a chip, tab or disclosure |
| D6 | These icon-only buttons now get drawings through explicit `BTN_BY_DATA` markers: month ‹ ›, “Chọn cả nhà” ✓, reasons ✕, old recipe-row ×, receipt line ×, price ×, So Giá tray ×, voice-recipe row ×, sync and notice dismiss ×. ✕, ↻ and ⟳ were added to the symbols that get removed next to a drawing. | owner-rules: icon-only buttons have a drawing |
| D7, B15 | These main buttons now have drawings: “Bắt đầu kiểm tra” (mic), “Xác nhận” (tick), “Xem trước” / “Xem trước, chưa nhập” (search), “Bỏ khỏi giỏ” (skip, now a main action), “Kiểm tra & lưu khoản chi” (tick), and the CSV “Kiểm tra & xem trước” (now `.primary`). | owner-rules: main buttons have a drawing, including footers |
| D8 | ↻ was removed from “Đổi gợi ý khác” (both buttons) and from So Giá “Đọc lại”. | owner-rules: no text symbol next to a drawing |
| D9, B15 | Sheet footer buttons can now declare their role with `data-sheet-role="save\|close\|cancel\|none"`; button text is only the fallback (`app.ts` `sheetButtonKind`). My kitchen has one footer “Lưu” that saves portions and menu together, keeping what was typed even when the first save closes the sheet. Currency & prices has a footer “Lưu giá”. The “how the family likes this dish” setting and the family reminder times now save as soon as they change, so there is no Lưu in the sheet body and no redraw. | owner-rules: no Lưu/Đóng in the body; footer pills drawn, side by side, same size; saves both forms |
| D10 | While a sheet with a floating footer is open, the toast shows at the top of the screen. | owner-rules: the toast does not cover the footer |
| D22–D24 | Tap targets are now at least 44 px: the dish ×, the top-bar bell and the language toggle (the globe is hidden at ≤ 340 px so the bar still fits 320 px), chips, tabs, text buttons, the store pill, dish links, selects and inputs, pack-schedule cells (the table scrolls), the old recipe amount field, and the day strip (it scrolls sideways at 320 px). | owner-rules: targets ≥ 44 px at 320 and 375 |
| A17 | “Báo khẩn” on a device-only install opens the family connection with a line explaining that urgent messages go to the family's phones, so the family must be connected first. | owner-rules |
| A18 | “Kết nối gia đình” / “Đồng bộ gia đình” (`accountsModal`) open a sheet titled “Kết nối gia đình / Family connection” that holds only that card. My kitchen keeps its title. | owner-rules |
| A26 | “Nhập món từ link” shows “Cần tài khoản gia đình…” under the button on a device-only install. | owner-rules |
| B9 (part) | Adds one shared list of store names: the family's stores first, then Coles, Woolworths, ALDI, Harris Farm, IGA and Costco (`storeChoiceNames()` in `insights-core.ts`). The receipt store field offers it as choices and is still free text. | owner-rules |
| B16 (part) | Adds one in-app confirmation sheet (`confirmAsk`) with a drawn main button. It replaces the browser `confirm()` for deleting a price. | owner-rules |
| B18 | Any ingredient `<select>` with more than 15 ingredients gets the same search box. Search ignores accents (“tom” finds “Tôm”) and picks the first match. The saved value is unchanged. This covers pantry, barcode, price, So Giá and the add-extra form. | owner-rules: search box picks the match |

**Not fixed, and why**
- **Extras × (D6/D22):** agent YY owns it and has already given it a drawing and a 44 px target. The owner-rules suite still reports it on this branch alone, and should pass once YY's branch is merged.
- **B9 (rest):** adding ALDI and Harris Farm to the products page `RETAILERS` changes the validator (`insights-core.ts:39`, W2's area). A device on an older version would then reject synced data. This needs coordination with W2 and a sync-compatibility check. The optimiser, voice and receipt-parser lists are internal and were left as they are.
- **B16 (rest):** the Xóa/Xoá and Hủy/Huỷ spelling is unchanged. In non-Studio code the counts are Xóa 29 vs Xoá 38, and Hủy 19 vs Huỷ 18. Many of these strings are W4's translation keys, so changing them now would break the English lookups during the merge. The same applies to the native `confirm()` calls that remain: removing a meal is W3's area, and clearing a transcript happens inside a sheet, where a second sheet cannot be opened.
- **B18:** the hard-coded “58 nguyên liệu” label is in the add-extra form (YY).
- **Not changed:** Studio (owner-only) still has ✕, ✓ and ↻ text buttons. `community-prices.mts` keeps its badge-icon emoji; they are data and are drawn in the app.
