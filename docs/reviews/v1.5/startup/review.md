# v1.5 startup review — no more "Opening your kitchen…"

Status: implemented on a feature branch for preview testing. **Not deployed; deploy approval is still required.**

## What changed
- `src/frontend/bootstrap.ts`
  - The account check (`family?op=status`) and the startup pack download now run **in parallel** instead of one after the other.
  - When a verified offline identity (signed grant from an earlier launch) is present, the kitchen opens immediately with that identity; the live check runs in the background. A different family/role/member reloads once (new identity stored first, `bep-boot-confirm` makes the next launch wait for the live check, so no reload loop). A session that ended before confirmation reopens normally (no device-only lock); later expiry keeps the earlier behaviour.
  - The account check always runs when the `bep-account=1` marker cookie, `bep-account-present` or an offline grant is present (unless device-only is locked), so an iOS storage clear does not silently drop an account user into device mode.
  - The text "Đang mở bếp… / Opening your kitchen…" is gone. A quiet skeleton (no visible text, `role=status` with an accessible label) is shown; its pulse is disabled under `prefers-reduced-motion`.
  - The pack is requested as `/startup-scripts.json?v=<hash>` with HTTP revalidation (`cache: 'no-cache'`, ETag) instead of `no-store`. If the pack does not match this loader's script list it is re-requested with `&fresh=1` (network, `cache: 'reload'`). Retry (`?startup-retry`) always forces the network.
- `src/scripts/build.cts`: the pack now contains a content `hash` (second JSON key) and the build writes the same hash into `dist/bootstrap.js`.
- `src/frontend/sw.ts` (install/fetch caching only; push handlers untouched):
  - Startup pack: answered from cache instantly when the cached hash equals the requested `v`; otherwise the cached copy is returned and refreshed in the background (stale-while-revalidate — the next launch uses the new pack); `fresh=1` goes to the network. Background refresh allows 60 s instead of the previous 8 s deadline that made slow connections always wait 8 s.
  - Images/icons/manifest: cache first with background refresh (they no longer compete with the pack on every launch).
- `netlify.toml`: the edge function now runs only on `/login`. `gate.mts` no longer forces `no-cache` on images/fonts (documents, scripts and the pack still revalidate).
- `dist/index.html`: sidebar "Nhà mình · 4 thành viên · Sydney" replaced by a neutral skeleton filled at runtime (family name, member count, currency — no city).

## Throttled timings (account user with a family, 375×812)
Bench: `docs/reviews/v1.5/startup/startup-timing.cjs` (run from the repo root after `npm run build`). It serves `dist/` through the real gate and account/family handlers with in-memory stores, throttles **every response server-side** (150 ms latency, 1.6 Mbit/s — so service-worker fetches are throttled too) and also applies CDP `Network.emulateNetworkConditions` (150 ms, 1.6 Mbit/s) to the page. Time = navigation start → app content rendered and skeleton removed.

| Scenario | Before (8d7a7a7) | After |
|---|---|---|
| First visit, no service worker | 9.6 s | 9.7 s |
| Repeat visit, service worker active (3 runs) | 6.95 / 7.03 / 6.95 s | 0.57 / 0.53 / 0.53 s |
| Account check delayed 3 s — first visit | 11.3 s | 9.8 s |
| Account check delayed 3 s — repeat visit | 10.0 / 10.0 / 10.0 s | 0.55 / 0.51 / 0.51 s |

Limits: the bench server does not gzip; production compression makes the 1.2 MB pack much smaller, so absolute first-visit numbers are pessimistic. First visit is bandwidth-bound (pack + 430 KB `family-logo.png`); shrinking the logo is outside this change. Timings are from headless Chromium on a container, not a physical phone.

## Tests
- `npm run test:browser` now also runs `tests/kitchen-hub.test.cjs`, which covers: content visible before a pending account check when a cached identity exists, no visible loading text, no hardcoded sidebar summary, single reload (no loop) when the live check reports another family, and the scoped cross-tab storage listener.
- `npm test`, `npm run check`, `npm run typecheck`, `test:browser`, `test:artwork:browser` and `test:authenticated-startup` pass. In this sandbox the authenticated test needs a Node DNS preload mapping `kitchen.localhost` to 127.0.0.1 (environment limitation, no code change).

## Screenshots
`skeleton-375x812.png` (startup skeleton), `today-*.png` Today header/actions at 320×740, 375×812, 820×1100, 1280×800 (browser viewport simulation, not physical devices).
