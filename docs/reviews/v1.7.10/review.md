# v1.7.10 — planned 7 Nov 2026 (Sydney time)

Branch `release/v1.7.10` from `main` at `94285a0` (Release v1.7.9, deployed 7 Nov 2026 10:37 Sydney time on Henry's DEPLOY). **Not deploy-approved.** It needs green GitHub CI on the exact head commit and Henry's explicit DEPLOY (AGENTS.md rules 1–5, 15, 18, 23).

Scope, from Henry's choices in the question dialog on 7 Nov 2026:

| # | Item | Status |
|---|------|--------|
| 1 | English for the reference recipes' prep and steps. Today the Vietnamese shows in English mode. Family-authored recipes are never rewritten (rule 6). | planned |
| 2 | Online price estimate (“≈ $X theo giá online”) for items counted by the piece (eggs, lemons …). | done: rows in *quả / cái* use a per-each unit price × count, or whole packs of N pieces × the pack price (e.g. 14 eggs with packs of 12 at $7 = 2 packs, $14). A pack in grams never estimates a count, so nothing is guessed across units. Test: `v176-fixes:browser`. |
| 3 | Henry, 7 Nov: “Thêm 5–6 loại themes” — display themes (he chose **Biển, Lá sen, Gỗ ấm, Đất nung, Khoai môn, Hoa đào, Đêm xanh, Nắng vàng**, picked in Settings + the top-bar button, **each device on its own**) | done |

### Row 3 — colour themes

- **Where to pick:** *Cài đặt khác → Giao diện → Màu giao diện* shows 12 colour swatches: the default *Bếp xanh*, the eight new colours, and the existing *Tết*, *Trung Thu* and *Giáng Sinh*. Tapping one changes the colours at once. Each swatch is a 44 px radio button.
- **Light and dark:** every new colour has both versions. *Sáng / tối* (auto / light / dark) works as before.
- **Readability:** measured on the menu page at 375 px. Primary button text is at least 4.9:1, links at least 5.8:1, headings at least 11:1, in both light and dark.
- **Saved on this device only**, in the same setting the seasonal themes use. Nothing is synced or changed for the family.
- **Top-bar light / dark button:** now our own drawings (sun, crescent moon, half and half for auto), replacing ☀️ 🌙 🌤️ 🌌 and the seasonal emoji (rule 19).
- **Tests:** `v176-fixes:browser` (320 / 375 / 820 / 1280, VI and EN) checks the 12 swatches ≥ 44 px, that a tap changes the colours and the radio state, the dark version, and the drawn toggle with no emoji. `kitchen-hub` follows the swatch group.
- **Evidence:** `docs/reviews/v1.7.10/themes/{colour}-{light,dark}-375.png` and `picker-375.png` (Chromium simulation).
- **Limitation:** some cards and the bottom bar in dark mode keep the shared dark surface colours, which are slightly green. Only the accents and the page background follow the theme there.

### Test fix

- `online-prices:browser`: before checking that *So Giá* sits above the list, the check now waits for the list to draw. On 7 Nov it failed locally on the v1.7.9 code too: the page re-draws once after the prices load, and the check landed in between (tablet in one run, desktop in another). No check removed.
