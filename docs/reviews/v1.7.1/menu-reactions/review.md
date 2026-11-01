# v1.7.1 — Menu reactions & Family tastes (review record)

Owner request: "Ở phần thực đơn nên cho option người nhà có thể like hay dislike để phân tích người dùng để sau này suggest và cho thông tin để người nhà xem."

Branch `agent-gg/menu-reactions` (local only, not pushed, not deployed). Deploy approval is **not** requested by this record (AGENTS rules 1–5, 10, 15–18): GitHub CI on the PR head commit is still required.

## What changed
- **Reactions** under every planned dish in Menu and Today (decorates the existing dish rows; the Menu markup is unchanged), and a per-member panel in the recipe view. 👍 / 👎 toggle with one tap (`aria-pressed`, labels name the dish and the person), counts, member initials; optional reason chips (👎: Cay quá / Too spicy, Không thích nguyên liệu, Ăn nhiều rồi, Khó ăn; 👍: Ngon, Muốn ăn lại).
- **On behalf**: the “Cả nhà / Who?” button opens a panel listing every member — a parent can record for children or members without an account; the row shows “ghi bởi …/recorded by …”. Identity = the account-linked member; in device-only mode the existing “who is using this device” choice (`bep-active-member`), selectable in the panel.
- **Storage/sync**: `state.menuReactions` keyed `member|recipe` (value, reasons, timestamp, meal date, recorder, change history ≤12). Synced with the family state like other family data, offline-first. Last-write-wins per (member, dish) with a union of history; a sync conflict that only differs in reactions merges automatically; for other conflicts the existing dialog stays and the kept copy also gets the other copy’s reactions. Connecting/switching a family never merges device-only reactions into shared data (rule 12). Malformed rows are dropped, never block loading. Recipe content is never modified (only id + a name copy for display).
- **Model → suggestions** (`menu-reactions-core.ts`, deterministic): recency-weighted per-recipe score (half-life 60 days), per-member feature affinity (dish group, protein, spicy, ingredients; reasons strengthen spicy/ingredient), fatigue (a liked dish planned/cooked ≥2× in 14 days or marked “Ăn nhiều rồi” rests), “lâu rồi chưa ăn” bonus. Added through `historyRecipeAdjustment`, so the weekly auto-plan, Today “Gợi ý” and Insights all use it; the auto-plan uses **the people eating each meal** (attendance + calendar absences). One-line explanations on suggestion cards and under planned dishes (e.g. “Cả nhà thích · lâu rồi chưa ăn”, “Bé nhỏ không thích cay — món này không cay”, “Bố và Bé lớn không thích món này”). No quantities are created or changed.
- **Family tastes** (Insights, linked from Menu “👍 Khẩu vị gia đình”): weekly summary, family favourites, loved-but-not-had, dishes to avoid, ingredient/category patterns, each member’s likes/dislikes; empty state explains how to react. Family-only data, no new exposure.

Files: `src/frontend/menu-reactions-core.ts`, `src/frontend/menu-reactions-ui.ts` (new); `src/frontend/bootstrap.ts` (2 names appended to the script list); `src/frontend/family-menu-core.ts` (auto-plan passes the slot `date,type` to `pickSlotRecipe`, one token); CSS block appended to `dist/styles.css`; tests below; `package.json`.

## Verification
- Unit `tests/menu-reactions.test.cjs` (in `npm test`): toggle/history/reasons/on-behalf, two-device offline merge (LWW, tombstone, commutative, idempotent, junk rows), recency weighting, eaters (absent member ignored), spicy aversion + similar-dish affinity + VI/EN explanations, fatigue, auto-plan avoids a dish disliked by someone eating and allows it when she is away, favourite first, suggestion ranking with the existing “pause” rule still winning, weekly summary.
- Browser `npm run test:menu-reactions:browser` (appended to `test:all`): device-only Chromium at **320×740, 375×812, 820×1100, 1280×800** (touch for phone/tablet): react on Menu, Today and recipe view, toggle, reasons, on-behalf panel, device member switch, aggregate counts/initials, explanations on the plan, suggestions reflect reactions, offline save, Family tastes in VI then EN + dark, reduced motion (no transition), ≥44 px targets, no horizontal overflow, no page errors.

Screenshots (JPEG): `narrow-menu-vi-light`, `narrow-today-vi-light`, `narrow-tastes-en-dark`, `mobile-menu-vi-light`, `mobile-family-panel-vi-light`, `mobile-today-vi-light`, `mobile-tastes-en-dark`, `mobile-menu-en-dark`, `mobile-tastes-empty-vi-light`, `tablet-menu-vi-light`, `tablet-recipe-view-vi-light`, `tablet-tastes-en-dark`, `tablet-menu-en-dark`, `desktop-menu-vi-light`, `desktop-family-panel-vi-light`, `desktop-tastes-en-dark`, `desktop-menu-en-dark`.

## Limits
- Browser viewport simulation only — not tested on physical phones/tablets.
- Signed-in two-device sync is covered by unit merge tests and the conflict hook logic, not by a two-browser test against the real family handler.
- The legacy (non-family) planner and Simple view’s other screens are not decorated; the desktop “simple” Menu layout puts 2–3 narrow meal cards per day, so the bar uses a compact layout there (pre-existing narrow cards).
- Usage statistics: no `menu-reaction` counter added (the feature list is whitelisted on both client and server; not trivial).
- Test recipes in the browser suite are synthetic “QA …” dishes created only inside the test browser.
