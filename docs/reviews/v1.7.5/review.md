# v1.7.5 release record — owner feedback (4 Nov 2026) and language

Source: Henry's Notes “Note chỉnh sửa cho Bếp Nhà” (4 Nov 2026, items 1–16) and the request “Kiểm tra lại ngôn ngữ”.
Owner decisions (popup answers, 4 Nov 2026): Bữa phụ is always a daily slot; ăn vặt/tráng miệng fill it; school lunch box
Mon–Fri when switched on; “Main/Side dish” are dish types, not meals; new ingredient rows ticked “Cộng vào đi chợ”;
Lớn is the default text size; loanwords (offline, bill, Weekends feast, school lunch box) stay; reference-recipe English
is a separate release; 5 suggestions with “Xem thêm”; units may be added.

Branch `release/v1.7.5`, stacked on #12 (artwork fixes) which is stacked on #11 (v1.7.4). **Not deploy-approved.**

## Feedback → change

| # | Owner note | Change | Covered by |
|---|---|---|---|
| 1 | Photo buttons do nothing | The recipe form carried `data-rc`, so the `[data-rc]` click handler cancelled every tap inside it (also the paste box). Form flag renamed, forms ignored by the handler; 44 px buttons. | v175-feedback (real taps open the picker at 4 sizes) |
| 3 | Text too small | Every stylesheet size is `max(size × multiplier, floor)`. Lớn (default): body ≥15 px, ordinary text ≥14 px, former 8–9 px labels ≥12 px. Vừa = v1.7.4, Rất lớn ≥16 px. Per device, applied before first paint. | v175-feedback (no text <12 px; 3 levels without overflow) |
| 4, 8 | “Phân loại bữa ăn”; auto-ticks could not be removed | Bữa sáng/trưa/tối/phụ, Weekends feast; nothing auto-ticked; saved exactly as ticked. Empty = dish-type default (planning only). | v175-recipes, v175-feedback |
| 5 | “Phân loại món ăn” | Món chính, phụ, canh/soup, sợi, tráng miệng, ăn vặt, school lunch box (`veg` key shown as Món phụ). | v175-recipes, library-guide |
| 6 | Labels | “Công thức nấu cho bao nhiêu suất ăn”, “Thời gian nấu (phút)”. | v175-feedback |
| 7 | Method numbered | Shown as written (`.steps-text`), no filler “Nấu theo cách quen…”. | v175-feedback |
| 8 | Paste box unclear | “📋 Dán danh sách nguyên liệu” with an example; one help line about the tick. | v175-feedback |
| 9 | Unit “đòn” | Added with khoanh, vỉ, khay, túi. | v175-feedback |
| 10 | Shopping depends on a per-ingredient tick | “Cộng vào đi chợ” per row; kitchen units counted as written. | recipe-community, recipe-ingredients, v175-feedback |
| 11, 12 | Max suggestions | 5 + “Xem thêm” (5 more each tap) for reference and saved dishes. | recipe-community, catalog-filters, v175-feedback |
| 13 | ½ shown as 1 | `parseQty` reads 1/2, ½, 1 1/2, 0,5; recipe view no longer rounds counts up; `fmtQty` shows ½ / 1½. Pasted free text saved from what the row shows (it was re-read as “2 quả”). | v175-recipes, recipe-ingredients, v175-feedback |
| 14 | “Tự chia phần”? | “Tự tính theo số người”, “½ lượng (50%)”…“Gấp đôi (200%)” plus an explanation. | v175-feedback |
| 16 | Icon badge | Service worker counts urgent / attendance / calendar pushes while the app is not on screen; cleared on open. | npm test (service-worker suites) |
| — | Language | No half-translated sentences (whole-word name protection, leftover Vietnamese → whole Vietnamese sentence), new full-sentence translations, bilingual labels. | language-audit (VI/EN × 3 sizes) |

Items 2 and 15 were empty in the note.

## Data implications
- **Edition 6** (`APP_EDITION`): new meal `snack`, dish types `dessert/snack/lunchbox`, family ingredient units such as `tép`, `đòn`. Older apps receiving edition-6 family data show “Có bản cập nhật — tải lại” and do not overwrite it. The reference-catalogue edition stays 5 (`CATALOG_EDITION`), so deleted-reference tombstones keep working (caught by catalog-fixes).
- **No stored data is rewritten.** Legacy `purposes` (main/side/friday) are read as meals; an unchanged save keeps them exactly. Saved note lines with an amount open unticked (shopping lists unchanged); name-only lines open ticked so adding an amount counts them.
- `preferences.schoolLunchbox` (new, default off). Text size and badge count are per device (not synced).
- **At deploy:** set the Studio minimum app edition to 6 (`STUDIO_MIN_APP_EDITION=6`) so every family device updates.

## Verification (local, Chromium viewport simulation)
- `npm run check`, `npm run typecheck`, `npm test` (incl. new `v175-recipes`).
- Browser suites run locally: startup, kitchen-hub, recipe-ingredients, recipe-community, menu-reactions, library-guide, catalog-filters, voice-price, voice-ios-crash, authenticated-startup, offline, alerts-online, app-update, artwork, **language-audit** (new), **v175-feedback** (new).
- Test changes follow the owner's new rules and are listed in the commits (5 suggestions, counted kitchen units, dish-type order, exact ½). recipe-ingredients now runs in Australia/Sydney time like the app: in UTC it seeded yesterday's dinner between 13:00 and 24:00 UTC.
- GitHub CI: see the PR (rule 15 — only a green run on the exact head counts).

## Responsive evidence
`docs/reviews/v1.7.5/feedback/` — mobile 375×812 (iPhone 13 profile, touch), narrow 320×640 (iPhone SE profile, touch), tablet 820×1100 (touch), desktop 1280×800: recipe form (meal types, ingredient rows), recipe detail, meal editor, Today (Lớn and Rất lớn), settings → Cỡ chữ. `docs/reviews/v1.7.5/language/` — VI/EN mobile screens. Horizontal overflow is asserted on every screen; reduced motion is on.

## Limits
- Browser viewport simulation in Chromium only — not physical iPhone/iPad/Android, Safari/WebKit or Firefox. The photo-picker fix and the badge need a check on Henry's iPhone after deploy (badge: Home Screen app, notifications allowed, iOS 16.4+).
- Reference-recipe cooking steps remain Vietnamese in English mode (owner-approved separate release); they are excluded from the language audit by name.
- The language audit covers the guest/device-only state and the listed screens; Studio, voice sheets and the So Giá extension are not covered by it.
- Text at Rất lớn is checked for overflow on the listed screens only.
