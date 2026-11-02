# v1.7.2 · Studio navigation, speed, Price Check device cards — review record

Branch `agent-ll/studio-nav` (from v1.7.1 production `25d13f7`). Local QA only; **not deployed, no preview, no deploy approval requested**. GitHub CI on the PR head commit is still required (AGENTS.md rules 14–17).

## What Henry asked for, and what changed

| Feedback | Change |
|---|---|
| "Menu category quá nhiều, chạy quá chậm" | 19 top-level items → **6 collapsible groups**: Tổng quan (overview, urgent, notifications, health) · Người dùng & gia đình (accounts, families, invites) · Nội dung & cộng đồng (community prices, community recipes, feedback) · So Giá (Price Check network, unplaced prices, catalog) · Phân tích (usage, voice) · Cài đặt & phát hành (settings, broadcast, rollout, logs). The current page is highlighted and its group opens. Collapsed groups are remembered (this browser only). **Badges** show counts only: failed urgent messages, community prices awaiting moderation, community recipes pending or reported, new feedback, unplaced Price Check prices when the Price Check library offers a count (new `studio?op=nav-badges`, kept 60 s on the server, refreshed after any Studio change). **Ctrl+K / ⌘K** page finder works without accents (e.g. "gop y"). Phones and tablets (≤960 px) get a compact top bar (brand, online/offline status, current page + total badge) and the menu opens as a sheet from the left (Escape or backdrop closes it, choosing a page closes it). |
| Two urgent pages with similar names | "Tin nhắn khẩn" (daily counts) and "Tin khẩn" (delivery problems) are one page `#urgent` with two tabs: *Lý do không gửi được* (default) and *Số lượng theo ngày* (`#urgent/daily`). |
| Old links | `#messages` → `#urgent/daily`; `#urgentReasons`, `#urgent-reasons`, `#alerts` → `#urgent`; unknown hashes → `#overview` (replaceState, no extra history entry). Every other hash is unchanged. |
| Speed | Page scripts (`studio-scout/voice/usage/urgent/recipes/feedback/update.js`) are no longer loaded up front: each loads when its page opens, or earlier when the pointer/keyboard focus rests on its link. Settings loads its two card scripts. Saved copies + background refresh ("Bản đã lưu · đang làm mới…") now apply to page-script requests too (Price Check, usage, voice, feedback inbox, recipes list, urgent list), not only core pages; a reload always re-checks saved copies. Page scripts reuse Studio's account check instead of fetching `me` again; the App-updates card reuses the settings answer. On a first visit, the landing page's data is requested together with the account check. Skeletons show while a page with no saved copy loads. |
| Bug: "Price Check is off…" shown while on | Cause: `.scout-states-off{display:block}` beat the `hidden` attribute, so the note always showed. Fixed in CSS (`[hidden]` wins) and the script also sets the display; the note and the greyed states follow the checkbox live. |
| Run now disabled with no explanation | Each device card now shows **"Tự động cho máy này: Chưa cho phép · [Cho phép tự động]"** (owner, audited `scout_device_allow_auto`), the stores per retailer (or "Chưa có cửa hàng nào — máy sẽ không có việc để chạy"), extension version vs latest with **"Cần cập nhật"**, and a list of reasons; Run now points to it with `aria-describedby`. Blocking reasons: Auto off network-wide, network paused, account no longer allowed, device paused/blocked, auto not allowed for this computer, no stores. Information only: old extension (blocks only if the server marks it), the person has not switched Auto on in the extension, computer offline, and after an empty run the server's `planInfo.reasonIfEmpty` in plain words with the fix (rendered when KK's field is present). Latest version: the server's `latestVersion`/`outdated` field when present, otherwise `dist/build.json → extension` (now written by the build from `extension/manifest.json`). |
| Page too long / cut at the right | Order is now Switches → device cards → **"Quyền & ghép máy"** (collapsed: accounts allowlist + the advanced pairing code) → parser health → devices table → coverage → … Overflow hardening for cards, inputs, long codes; no horizontal overflow on any Studio page at 320/375/820/1280 in the tests. |
| Same computer counted twice after re-installing the extension | The pairing answer lists earlier pairings of the same account + label as `replaceCandidates` (id, short id, pairing date, last check-in). The extension asks the person (KK's popup) and calls device op `replace` (or pairs with `replace:'all'`): the old device is revoked (token refused), its stores, pace, auto permission, schedule and owner-given name move to the new device, totals and timeline stay attached (`replaces`), audited `device_replaced`. Declining keeps both. Studio shows, on an older pairing with a newer twin, "Trùng tên với một máy ghép sau" or, after 24 h silent, "Có thể là máy cũ" with **[Gộp vào máy mới]** (audited `scout_device_replaced`) and **[Thu hồi]**; every card shows pairing date + short id and **[Đổi tên]** (audited). "Run now on all" skips a stale old pairing of the same computer. Henry can clean up his current duplicate with these buttons after deploy. |
| Unplaced captured prices (requested with KK's work) | New lazy page **"Giá chưa gắn món"** in the So Giá group (`studio-unplaced.js`): batch review list with product name, retailer · store, price and unit price, capture time, suggested item with confidence, **[Gắn] [Món khác…] [Bỏ qua]**, select-all / multi-select bulk attach or skip, nav badge. Built against the documented shape (`scout?op=studio-unplaced` → `{items:[{factId,name,retailer,storeLabel,price,unitPrice,unitBasis,capturedAt,suggestions:[{itemId,name,confidence}]}]}`, POST `studio-unplaced-confirm {items:[{factId,itemId}]}` / `studio-unplaced-reject {factIds}`); auditing is the server's (KK). "Món khác…" picks from the shipped master catalogue. Until the server op exists the page says the list is not available yet. The nav-badges op counts it if `lib/scout.mjs` exports `unplacedCount`. |

## Timing (simulation only)

Real handlers with in-memory stores behind a simulated network in Chromium (`src/tests/helpers/studio-nav-harness.mts`); every API answer also waits a simulated server time. Profiles: **typical** = 100 ms round trip, 1.5 MB/s, +350 ms server; **slow** = 300 ms, 200 KB/s, +700 ms server. Not a measurement of production or of physical devices. Raw data: `perf-before.json` (v1.7.1 code) and `perf-after.json`.

| | v1.7.1 typical | v1.7.2 typical | v1.7.1 slow | v1.7.2 slow |
|---|---|---|---|---|
| Scripts at start | 8 files, 258 KB | 1 file, 144 KB | 8, 258 KB | 1, 144 KB |
| Static requests at start | 10 | 3 | 10 | 3 |
| First paint | 280 ms | 260 ms | 760 ms | ~816 ms |
| First Studio content (new tab) | 1,292 ms | **813 ms** | 3,321 ms | 2,438 ms |
| Reload (same tab) | 1,249 ms | **487 ms** | 3,300 ms | 1,791 ms |
| Page switch, page seen before (median / max) | 468 / 486 ms | **40 / 57 ms** | 1,022 / 1,080 ms | **40 / 42 ms** |
| Page switch, first visit (median) | 481 ms | 598 ms | 1,052 ms | 1,434 ms |

Requests on a revisit: v1.7.1 re-fetched Price Check (2), urgent (1), feedback (1), voice (1) and settings (3 incl. a second `me`) every time; v1.7.2 shows the saved copy (0 requests before content) and refreshes in the background. First visits to a page-script page cost one extra script download (≈0.1 s typical) unless the link was hovered or focused first (the measurement does not hover). Targets: page switch with saved data < 300 ms ✔ (all pages); first Studio content < 1 s on the typical profile ✔ (813 ms new tab, 487 ms reload); on the slow profile it is 2.4 s (download-bound).

## Verification

- New `npm run test:studio-nav:browser` (added to `test:all`): groups/pages, only `studio.js` before a page opens, hover prefetch, badges + spoken labels, collapse remembered, old-hash redirects, merged urgent tabs, overview tile link, Ctrl+K, saved copies for page scripts (shown < 300 ms then refreshed), settings note follows the checkbox, settings fetched once, device readiness / allow auto (audited) / reasons / version / no stores, duplicate pairing → merge (audited) → settings carried, rename (audited), unplaced prices (lazy, badge, attach / other item / bulk attach / skip), menu sheet (Escape, closes on choice), reduced motion (no slide), ≥44 px targets on touch sizes, no overflow on 11 pages per size, offline state in the top bar; timing assertions on the typical profile.
- New `tests/scout-replace.test.mjs` (in `npm test`): replacement offered, old token refused, settings + history kept, audit, decline keeps both, stale hint after 24 h, rename, Studio merge (never across accounts), Run-now-all dedupe, `replace:'all'`, different label never offered.
- Updated (behaviour, not weakened): `scout-studio`, `urgent-reasons`, `usage`, `ladybug`, `recipe-community`, `voice-local` browser tests read menu labels with `textContent` (the menu is in a closed sheet on phones), open the sheet before pressing the language button on tablets, and open "Quyền & ghép máy" before the pairing code; scout-studio additionally asserts the new order and that the section starts collapsed.
- Local runs: see the final report for the exact suite list and results. GitHub CI on the PR head commit is the release evidence (not yet run — not pushed).

## Screenshots (browser viewport simulation)

33 PNGs in this folder: overview, menu open, Price Check (device cards), settings, offline, at 320×740, 375×812, 820×1100 and 1280×800 in VI light and EN dark; collapsed menu, merged urgent page, Ctrl+K, readiness, duplicate pairing, unplaced prices at 1280×800.

## Limits and open points

- Viewport simulation in Chromium only; no physical phone/tablet, Safari or Firefox testing.
- Timing is simulated (synthetic data, in-memory storage); production storage latency differs.
- Badges for community prices / recipes / feedback are owner-only (null for the support role); they can be up to 60 s old (fresh after any Studio change).
- "Giá chưa gắn món" was tested against a stand-in for the documented server shape (the real op and its audit come with KK's work).
- The replacement prompt in the extension popup/app is KK's (extension/ files); this branch provides the server contract (`replaceCandidates`, op `replace`, `replace:'all'`). `planInfo` reasons render only once KK's server field is merged; "no stores" is derived from the device's stores now.
- The menu group-collapse state and remembered page-script URLs are per browser tab/browser (convenience only).
