# Community prices / Giá cộng đồng + rewards: v1.5 review record

Status: implemented on the feature branch `agent-i/community-rewards` (on top of `628300b`, `claude/bold-pascal-riryi0`), for the preview build.

- **Not deploy-approved.** Responsive QA and green tests do not grant deployment approval (AGENTS.md rules 1–5, 10, 15–16). GitHub CI on the PR head commit is still required.
- This record replaces the earlier pilot record. The owner (Henry) tested the preview and decided on 1 Nov 2026 the changes below.

## Owner decisions implemented (1 Nov 2026)

| # | Decision | Implementation |
|---|---|---|
| 1 | **On by default** | `SETTINGS_DEFAULTS.flags.communityPrices=true`; `pilotConfig` treats anything except an explicit `false` as on. Studio can still turn it off (confirm dialog, audited `save_settings`); `STUDIO_FLAG_COMMUNITY_PRICES=false` still overrides. |
| 2 | **Everyone can read** | `GET prices`, `GET leaderboard` and `GET products` need no account (device-only users included). No personal data; `Cache-Control: public, max-age=60, stale-while-revalidate=60`; a per-process ~60 s cache cleared on every write; per-IP-hash limit 240/hour (`rate/<hour>/read-<hash>`, pruned after 2 days). Contributing still needs an eligible account (unchanged gates). Device-only users see “Đăng nhập để chia sẻ giá và nhận điểm” with a sign-in link and no report/share controls. |
| 3 | **Screenshots / bookmarks as facts** | Evidence `screenshot` (image SHA-256 + OCR price within $0.01, else 422 `ocr-mismatch`) and `bookmark` (page price within $0.01) are accepted. Only facts are sent: item, label, price, unit price, pack, retailer, branch or “online”, state, promo, validUntil, capturedAt, hash, OCR match. Never the image, raw OCR text, page URL (in the price facts), notes or names (browser-asserted). They are **“Giá online”**, grouped per retailer + state (`<retailer>:online:<STATE>`; a store branch is optional). Any cluster that contains a screenshot/bookmark always needs **≥2 independent families**; the single trusted-receipt shortcut never applies. Manual/pasted entries stay family-only. Confirm-sheet and terms copy updated. |
| 4 | **Sharing UX** | First share still shows the consent sheet (box unticked). After consent `shareDefault` is stored per account and the “Chia sẻ với cộng đồng” box starts **ticked**; the user can untick per price or switch the default off (“Cách nhận điểm” → toggle, `POST share-default`). The share fieldset moved up beside the price fields with a “⭐ +10 điểm” pill; screenshots/bookmarks offer “🌐 Giá online” (default) or “🏬 Giá của một cửa hàng”. |
| 5 | **Empty state** | “Chưa có giá nào…” is gone. (a) With community data: “👥 N giá cộng đồng ở NSW tuần này” (confirmed, ≤7 days) + “already used to compare your list”. (b) Otherwise: “🌟 Hãy là người đầu tiên chia sẻ giá ở NSW”, points incentive and a 3-step how-to. (c) If the community status is unknown/off: a short 3-step how-to. One-stop/split use confirmed community prices, so comparisons work for users with no own prices (unit + browser tested). |
| 6 | **Rewards (points + badges + leaderboard, no money)** | See below. Reward **redemption is not built** (owner chose points + badges + leaderboard only). |
| 7 | **Storage** | See “Storage and concurrency”. |
| 8 | **Legal draft** | `docs/legal/community-prices-terms-draft.md` (still **DRAFT**) covers screenshots-as-facts, public read, points/badges (no monetary value, no purchase necessary, revocable), leaderboard nicknames, product links, and new privacy notes. The owner should decide whether to bump `TERMS_VERSION` so existing contributors re-consent (not done). |
| + | **“Cần săn giá tuần này / Prices wanted this week”** | Items on the user's own shopping list without a confirmed Woolworths/Coles community price, ordered by how many families in the state need them. Signed-in families send their list item ids (`POST wanted`, once a day or when the list changes); the server keeps hashed family refs per state+week and returns **counts only**. Device-only users never write; they see their own list's gaps ordered by the public counts. Each row: missing retailers, “🔎 Woolworths/Coles” (retailer's public search URL, opened in the user's browser, no server fetch), “📷 Chụp giá” (opens the screenshot capture with the item preselected). 3 rows visible, the rest folded. Filling a gap that ≥3 families needed earns **+5** when confirmed (within the daily cap). |
| + | **Product link memory (“Mở đúng sản phẩm”)** | When a shared “Lưu giá” capture has a retailer product URL, a separate fact is saved (`POST product`): item, retailer, cleaned product URL (retailer's own https page only, query/hash/tracking stripped; Amazon normalised to `/dp/<ASIN>`), product id from the URL path, name, pack. Confirmed after **2 distinct families** or Studio approval. The wanted list links straight to a confirmed product page (“🛒 Woolworths”, title “Mở đúng sản phẩm”); “⚑ Link hỏng/sản phẩm khác” marks it stale and the app falls back to search. `GET products[&retailer=&item=]` is public (no prices, images or family refs) for a future browser extension. Studio “Link sản phẩm” tab: approve / reject / edit link, reason required, audited. |

## Rewards

Rules (defaults; editable in Studio → Cộng đồng giá → Điểm thưởng, audited `save_settings` with the values):

- **+10** when another *independent* family's matching report confirms your price (the first family in the cluster); **+5** extra for a special/half-price; **+5** for filling a ≥3-family “wanted” gap.
- **+3** for corroborating a price another family reported first (only once it becomes confirmed).
- **+10 (+5 special)** when a moderator approves your held item.
- **−20** when a moderator rejects it or ≥2 other families contradict it.
- **Daily cap 100** positive points per Sydney day (ledger stores requested vs granted). Penalties and Studio adjustments are not capped.
- **No points**: from members of your own family, for pending/held/flagged/low-trust/banned reports, or for duplicate captures (refused with 409). One award per family per matching cluster.
- **Levels**: Người đi chợ (0), Thợ săn giá (100), Chuyên gia giá (500), Đại sứ chợ Việt (1500). **Badges**: “Săn deal 1/2 giá” (3 confirmed half-price), “Chợ Việt” (3 confirmed Vietnamese-grocer prices), “Người đầu tiên ở <suburb>” (first confirmed in-store price in that suburb + postcode; online prices don't count).
- **Trust is separate**: points never change trust and trust cannot be bought (tested).
- **App**: “⭐ Điểm của bạn” card (total, level, progress bar to the next level, badges, “Cách nhận điểm” rules, share-default toggle) and a “🎉 +N điểm …” toast on the next refresh when the total went up (compared with the last total seen on this device).
- **Leaderboard** per state, weekly (Monday, Sydney) and all-time: rank, points, level, badge count, and **“Ẩn danh #1234” by default** (number derived from a hash of the username). A nickname shows only after the user opts in; nicknames equal to/containing the username, the family name, an email or a URL are refused. Studio can clear a nickname (audited). Never usernames, emails or family names.
- **Studio**: leaderboard by state/period (shows the account to the owner), contributors table (total, week/today, level, badges, trust shown separately), per-contributor **ledger drawer** (view audited `view_rewards_ledger`), **Adjust ±points** and **Revoke entry** (reason required; audited `community_points_adjust` / `community_points_revoke` with actor, reason, points; revoke appends a reversing entry), and the points settings form.

## Storage and concurrency (store `bep-community`, strong consistency)

- `points/<username>`: **append-only** ledger — entries are never edited; revokes and adjustments are new entries. Written with the same conditional read-modify-write as the item shards (`onlyIfMatch`/`onlyIfNew`, 12 jittered retries). The award *decision* is made inside the item-shard write (submissions are marked `awarded`), and the ledger entry id is `award:<submissionId>` / `penalty:<submissionId>`, so retries never double-award. Concurrent awards to many ledgers are tested.
- Leaderboards are **recomputed** from the ledgers and cached per process for ~60 s (cleared on any write in that process). Fine for the pilot; a stored per-state aggregate is the next step at scale (each recompute lists every ledger).
- `wanted/<STATE>/<weekStart>` (hashed family refs → counts), `firsts/<STATE>/<postcode>-<suburb>` (badge claim, `onlyIfNew`), `products/<retailer>/<itemId>` (link candidates, conditional RMW).
- Ledgers grow without compaction (pilot scale). Account deletion does not yet delete `points/<username>` or `contributors/<username>` (TODO, noted in the legal draft).

## API changes (`/.netlify/functions/community`)

Public: `GET status`, `GET prices&state=` (now also `wanted.counts`), `GET leaderboard&state=`, `GET products[&retailer=&item=]`.
Signed-in: `GET rewards`, `POST rewards-profile`, `POST share-default`, `POST wanted`, `POST product`, `POST product-report`, plus the existing `accept-terms`, `contribute`, `photo`, `report`, `shop-apply`, `shop-price`.
Public shop ids are now an opaque hash (the shop account username is no longer exposed); reports use that id.
Studio: `community` also returns `rewards` and `products`; new `community-ledger&account=`; `community-action` gains `points-adjust`, `points-revoke`, `nickname-clear`, `product-approve`, `product-reject`, `product-edit`.

## Tests

- **New `tests/community-rewards.test.mjs`** (added to `npm test`, so `test:all`/CI run it): default-on flag; device-only status + public read with no personal data (usernames, family name/id, familyRef, ipHash, image hashes); per-IP read limit; share-default; screenshot/bookmark OCR mismatch, missing fingerprint, manual family-only; high-trust screenshot alone stays pending; online label/branch; own-family member never confirms or earns; +10/+3; duplicate bookmark refused; special +5 and first-in-suburb badge; wanted counts (one family counts once; device-only can't write) and the +5 gap bonus; daily cap with requested/granted and next-day reset; Studio rewards settings validation; moderator approve +10, reject −20, contradiction −20; levels; leaderboard anonymity, nickname refusal rules and opt-in, `me` row, per state; Studio adjust needs a reason, is audited, doesn't change trust; revoke appends and can't repeat; ledger view audited and owner-only; concurrent ledgers; product-link URL cleaning, 2-family confirmation, stale on report, Studio approve/edit/reject audited, rejected never re-confirms; Studio can still turn the feature off.
- **Updated existing tests (intentional behaviour changes only):**
  - `community-prices.test.mts`: “flag off” now sets `STUDIO_FLAG_COMMUNITY_PRICES=false` explicitly (the default is on) and a default-on assertion was added; “prices without session → 401” became “→ 200, public, cacheable” plus “contribute without session → 401”; the evidence list no longer expects screenshot/bookmark to be `family-only` (manual still is; a screenshot OCR mismatch case was added); “disabled account → 401 on prices” became “→ 200 public data” (its session is revoked, so it reads like a device-only user; it still cannot contribute); the shop report uses the new opaque public shop id and asserts the username isn't exposed.
  - `price-scout.test.cts`: shareability now expects screenshot (fingerprint + matching OCR) and bookmark (matching page price) to be shareable, manual not; added a community-only comparison case and the `online` flag.
  - `price-scout-browser.test.cts`: the device-only empty state assertion now expects the short 3-step state instead of “Chưa có giá”.
  - `community-browser.test.cts`: rewritten for the new flows (below). Its touch-target check now also covers `a.btn` links and `.scout-check` rows; radio inputs are excluded like checkboxes (their ≥44 px label row is checked instead). The held-photo and leaderboard checks target the sheet body/footer rather than the whole modal, because the shared modal close “×” (in `app.ts`, not owned here) is under 44 px.
- `npm run test:all` passes locally in the sandbox (supporting evidence only; CI on GitHub is the gate).

## Responsive QA (69 screenshots in this folder; outdated ones deleted)

Method: Chromium 1243 headless (Playwright 1.64.1), `reducedMotion: reduce`, service workers blocked, mocked community/grocery/account/Studio APIs, synthetic prices and accounts. **Browser viewport simulation, not physical-device testing.**

| Screen | Mobile 375×812 | Tablet 820×1100 | Desktop 1280×800 |
|---|---|---|---|
| Device-only, community prices exist (`empty-community-*`, `guest-compare-*`) | VI light, EN dark | VI light | EN light, VI dark |
| First contributor (`empty-first-*`, incl. device-only `empty-first-guest-*`) | VI light, EN dark, guest VI dark | VI light | EN light |
| Prices wanted this week (`wanted-*`) | VI light, EN dark, guest VI dark | VI light | EN light |
| Capture sheet, share ticked by default (`capture-share-default-*`) | VI light, EN dark | VI light | EN light |
| First-time consent (`consent-*`), held photo ask | VI light | EN dark | EN light |
| Points widget + toast (`points-toast-*`), community card (`community-badges-*`) | VI light, EN dark | VI light, EN dark | VI dark, EN light |
| Leaderboard (`leaderboard-*`, nickname opt-in, all-time) | VI light | VI light, EN dark | VI dark, EN light |
| Report dialog | VI light | EN dark | VI dark |
| Studio overview/queue | VI light, EN dark | VI light | EN light, VI dark |
| Studio rewards, ledger, adjust dialog | VI light, EN dark | VI light, EN dark | EN light, VI dark |
| Studio product links | EN dark | — | VI dark |
| Manual stays family-only, ineligible, offline | VI light, EN light, EN light (mobile) | — | — |

Checked automatically in each scenario: no horizontal overflow; ≥44 px targets for buttons, links, selects, inputs, summaries and checkbox/radio rows in the panel, sheets and Studio (Studio on mobile/tablet); no page errors; no vendor names; facts-only payloads; device-only makes only GET requests; flag-off shows nothing; offline keeps the cached copy. Animations: none added; the progress bar has no transition under reduced motion. Header/navigation unchanged, so no 320 px check.

## Limits and open items

- Not tested on physical iPhone/Android hardware; real screenshot OCR accuracy not measured.
- The rewards toast compares with the last total seen **on this device** (a new device shows no toast for earlier points).
- Leaderboard/public read caches are per process (~60 s); totals across instances can lag by about a minute.
- Product ids come from the URL path only; JSON-LD SKU is not captured by the bookmarklet yet. Retailer URL patterns may change (unmatched URLs are simply not saved).
- “Prices wanted” covers Woolworths/Coles only; ALDI/Chợ Việt gaps are not listed.
- No reward redemption (by owner decision). No contributor/ledger deletion on account deletion yet. No bulk “remove my contributions” tool.
- `TERMS_VERSION` not bumped (owner decision needed). Legal draft still needs owner and legal review; privacy policy and APP 5 notice still required before public launch.

## Files outside the stated ownership

None beyond the listed files. `src/netlify/lib/studio.mts` changes are limited to the flag default, the `rewards` settings default and its validation.
