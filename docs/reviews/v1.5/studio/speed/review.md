# Studio speed (v1.5): review record

**Owner report:** "All tabs in Studio load too slowly. Can they load faster?" This was seen on the deploy preview, which has few real accounts.

**Branch:** `agent-p/studio-speed`, based on `claude/bold-pascal-riryi0` at 7876ca5. It is not pushed or merged, and deploy is not approved. GitHub CI has not run on this branch yet. Rule 15 requires a green CI run before this release counts as ready.

## 1. How it was measured

`src/tests/studio-bench.mts` measures the real Studio handler against in-memory stores. Run it with `npm run bench:studio`.

- **Simulated latency:** every blob get, list, set and delete waits 40–120 ms, like a cross-region round trip.
- **Data size:** 50 accounts, 20 families, 199 sessions plus the owner's, 100 push devices, 60 alerts, 160 receipt photos, 2,000 events, 200 audit rows, and community data (40 contributors, 120 price shards, 30 ledgers, 20 product links).
- **Simulated ms:** (wall time with latency − wall time without latency) × time scale + wall time without latency. The time scale is 8.
- **Cold and warm runs:** a cold run starts with the Studio caches cleared. A warm run is the same request repeated straight afterwards.
- **Raw results:** `bench-before.json` and `bench-after.json` are in this folder.

## 2. Before and after, per tab (40–120 ms per call)

| Tab / op | Before cold: gets · ms | Before warm: gets · ms | After cold: gets · ms | After warm: gets · ms |
|---|---|---|---|---|
| me | 4 · 406 | 3 · 353 | 4 · 424 | 3 · 347 |
| Overview | 2,675 · **215,920** | 4 · 425 | 695 · 2,474 | 4 · 309 |
| Accounts | 274 · 21,711 | 273 · **21,383** | 296 · 2,015 | 5 · 231 |
| Families | 2,965 · 239,144 | 294 · 23,882 | 987 · 2,501 | 6 · 409 |
| Invitations | 474 · 39,396 | 473 · 39,793 | 328 · 1,909 | 37 · 538 |
| Notifications | 3,139 · 250,910 | 468 · 38,089 | 1,186 · 2,708 | 66 · 434 |
| Urgent messages | 2,945 · 235,153 | 274 · 21,273 | 987 · 2,702 | 6 · 368 |
| Settings | 5 · 465 | 4 · 477 | 5 · 355 | 4 · 318 |
| System health | 2,687 · 215,492 | 16 · 1,596 | 698 · 2,734 | 7 · 433 |
| Logs (events) | 54 · 4,802 | 53 · 4,492 | 68 · 849 | 67 · 803 |
| Logs (audit) | 54 · 4,673 | 53 · 4,316 | 68 · 808 | 67 · 715 |
| Community prices | 247 · 20,163 | 246 · 19,881 | 217 · 1,388 | 216 · 1,493 |
| Rollout | 4 · 369 | 3 · 341 | 4 · 274 | 3 · 250 |
| Account drawer | 1,223 · 96,243 | 1,222 · 95,889 | 330 · 2,736 | 39 · 826 |
| Family drawer | 28 · 2,204 | 27 · 2,349 | 28 · 418 | 27 · 528 |
| Catalog | no server request: reads the build's static files in the browser | | unchanged | |

### Root cause

Every read ran one after another.

- **Accounts, families, invitations and messages:** these tabs listed and read every user, session and family on every request.
- **Overview:** the recompute read every event of the last 30 days (2,000 reads).
- **Timeouts:** cold Overview, Families, Notifications, Messages and System health took 3.5–4 minutes in this simulation. That is far beyond a function's time limit. The 5-minute overview cache therefore could not be filled. The tabs that depend on the overview recomputed and timed out again on each visit.

### After the fix

- **Warm list tabs:** 3–7 reads and about 0.2–0.5 s.
- **First (cold) build:** about 2–3 s, then cached.
- **Switching back to a visited tab** shows the saved copy at once in the browser, with no network wait.

## 3. What changed

### Backend: `src/netlify/lib/studio.mts`, `src/netlify/functions/studio.mts`

- **Bounded-parallel reads.** `mapLimit` runs at most 16 reads at a time. It is used for the account, session and family scans, family scans (devices, alerts, photo sample, state and observations), flags, sync rows, session and device deletion, family deletion, broadcast counting, and log reads.
- **Index documents.** `index/accounts.json` and `index/families.json` hold redacted summaries: masked email, status, last seen, live-session times, memberships, invite refs without codes, limits and the suspended flag.
  - Each lasts 60 s and is rebuilt from a full scan when missing or expired. Every overview recompute also rebuilds it.
  - `?fresh=1`, sent by the Refresh button, rebuilds it on demand.
  - Studio mutations delete it: disable, enable, sign-out, delete account, transfer, remove member, revoke invite, limits, suspend, delete family.
  - Tests show the index matches the full scan and contains no secrets.
- **Overview counts events from the key listing alone.** The listing takes 30 list calls and no entry reads. `events30` is now the true count; before, it was capped at 2,000.
- **Log keys carry hash tags.** New log keys end in `-a<hash>.f<hash>`, short hashes of the account/actor and family. Filtered log views skip entries that don't match without reading them. Older keys without tags are still read. Days are listed 8 at a time, and the order and cursor are unchanged.
- **Notification reasons are kept per day.** Totals for days before yesterday never change, so they are stored at `view/day/push-reasons/<day>` and pruned with the logs. Yesterday and today are always read live.
- **Community tab.** The three moderation reads now run in parallel through a request-scoped read-ahead store, so `community-prices.mts` is not edited. Results are identical (tested).
- **Request path.**
  - Account lookup and platform settings run in parallel.
  - On reads, the per-minute rate counter updates while the data loads. Nothing is returned and no audit entry is written until the check passes. Mutations still wait for the check first.
- **System health.** All probes run in parallel. The storage probe has a 4 s timeout, and the overview may be stale here.
- **Invitations.** The "recently accepted" list reads 20 events, the number the screen shows (before: 500).
- **Photo bytes** are now estimated from 12 sampled photos per family (before: 40). Sizing a photo means downloading it.

**Unchanged:**
- Admin and role checks on every request.
- CSRF and same-origin checks.
- Audit entries for every audited view and action.
- Redaction.
- Caches never hold authorization decisions, CSRF tokens, invite codes, emails or endpoints.

### Frontend: `src/frontend/studio.ts`, `dist/studio.css`

- **Stale-while-revalidate.** List and summary responses are saved in `sessionStorage`, per tab and per signed-in user. A visited tab renders at once from the saved copy.
  - If the copy is older than 10 s, the same requests run in the background.
  - The tab redraws only if the data changed and nothing is being edited. Otherwise it shows "Có dữ liệu mới · New data".
  - The following are never saved: `me` (which carries the CSRF token), drawers, support view, ledgers, photos.
  - Any POST clears all saved copies.
- **Freshness bar** under each heading:
  - "Cập nhật X giây trước / Updated X s ago"
  - "Bản đã lưu … đang làm mới… / Saved copy … refreshing…"
  - A **↻ Làm mới / Refresh** button that forces a server rebuild.
- **Loading.** Skeleton rows show on a first visit. Reduced motion stops the shimmer.
- **Prefetch.** After the first paint, the overview and the next tab are fetched when the browser is idle. Audited views and the health probe are never prefetched.
- **Fast tab switching.** Each route aborts the previous requests with `AbortController`. Every render draws into its own container, so an older tab can no longer overwrite a newer one. This bug existed before the change.
- **Unchanged behaviour:**
  - `me` is fetched once per page load; switching tabs does not fetch it again.
  - The navigation is no longer rebuilt on every tab switch; only `aria-current` moves.
  - The `#main[aria-busy]` input blocking is kept.
- **Static files.** `studio.js` (122 KB) and `studio.css` are not in the app startup pack or the service-worker precache. The CDN revalidates them with an ETag. See section 6 for hashed filenames.

## 4. Tests (added to `npm test` / `test:all`)

### `tests/studio-speed.test.mjs`

- The index matches a full scan and holds no secrets; the 60 s TTL works.
- Accounts and families paginate server-side, and rows carry only the fields the table shows.
- Disable, enable and suspend are reflected immediately. An outside sign-up appears after Refresh or after the TTL.
- Log filters return the same results as a naive scan, for tagged keys and older untagged keys, and the cursor stays stable.
- `countLog` matches `listLog`.
- Per-day totals are cached, and today is read live.
- Read-ahead community data is identical to a plain read.
- The rate limit still returns 429 on reads, and a refused read writes no audit entry.
- The storage probe times out.
- Request budgets: warm list views make ≤ 8 reads and no listings; recompute does not read every event; concurrency peaks at 16.

### `tests/studio-speed-browser.test.cjs` (`npm run test:studio-speed:browser`)

This test uses the real handler behind a 1.5 s network delay.

- Skeleton rows on a first visit.
- A prefetched tab shows in < 1 s.
- A stale copy shows at once, labelled, then refreshes in the background.
- Refresh sends `fresh=1`, and new data appears.
- Fast switching aborts superseded requests and the last tab wins.
- `me` is fetched once.
- A Studio change clears saved copies, and no CSRF token is ever saved.
- Responsive checks below.

### Existing suites

These still pass locally: `studio.test`, `studio-hooks.test`, `community-prices.test`, `community-rewards.test` and `test:community:browser`. `npm run build && npm run check` passes.

## 5. Responsive QA (rules 7–9)

Screenshots in this folder:

- **Freshness bar, stale copy and refreshed:** at 375×812, 820×1100 and 1280×800, in VI and EN (`stale-copy-*`, `refreshed-*`).
- **Skeleton:** VI at the same three sizes (`skeleton-*`).

Checks made:

- No horizontal overflow.
- The Refresh button is ≥ 44 px tall on mobile and tablet.
- Language switching works.
- Reduced-motion skeleton.

**Limits:**
- Browser viewport simulation only; no physical devices.
- Light theme only for the new bar. Its colours come from the existing theme tokens, which also cover dark mode.
- The header and navigation layout did not change, so there was no narrow 320 px check.
- The community suite's Studio screenshots were not regenerated here.

## 6. Hosting / region findings (need Henry; nothing was changed)

### All stores are already in the same region

`bep-accounts`, `bep-family-data`, `bep-studio` and `bep-community` all use `region: 'ap-southeast-2'` with `consistency: 'strong'`. No store defaults to a far region.

### Function region could not be confirmed

**Functions run in us-east-2 (Ohio) by default.** The hosting API available here does not report the function region. The site is on the `nf_team_dev` plan, so it most likely uses that default.

- **Cost:** if so, every blob call crosses the Pacific, about 150–220 ms per round trip.
- **Benchmark at 180–220 ms per call:** warm list tabs take about 0.75–1.0 s.
- **Most of that is fixed:** about 0.75 s per request goes to sign-in and the rate check (session, user, family, then the rate counter).
- **Benchmark at 5–15 ms per call** (functions in Sydney): the same tabs take 30–70 ms.

**Recommendation:** set the Functions region to Sydney (ap-southeast-2) in the site's function settings, if the plan allows it. This is a hosting change and is not part of this branch.

### Static file caching

Hashed `studio.js` / `studio.css` filenames need a build-script change in `src/scripts/build.cts`, which is outside this agent's ownership. So would a longer `Cache-Control` for them in `netlify.toml`. Today they are ETag-revalidated (304) on each Studio page load.

### Account lookup on every request

`resolveAccount` in `accounts.mts` (outside ownership) reads the session, then the user, then the family in sequence on every request. Parallelising it or caching it per instance would cut one or two more round trips.

### Community moderation reads

`community-prices.mts` (outside ownership) still lists and reads its data key by key. The read-ahead wrapper hides most of this. A native parallel version would remove the remaining per-page waits.
