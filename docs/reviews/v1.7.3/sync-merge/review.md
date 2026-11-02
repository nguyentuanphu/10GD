# v1.7.3 — Automatic family sync merge (agent RR, branch `agent-rr/sync-merge`)

Owner request (Henry): “tôi hay thấy clash vì các device không sync kịp đồng bộ” — devices often clash because they do not sync in time.

## What changed
- **Three-way merge** (`src/frontend/sync-merge-core.ts`, new): base = last synced copy (kept in IndexedDB), local, remote.
  Items match by stable id in every id-keyed list (recipes, members, pantry, receipts and their lines, shopping extras,
  products, stores, errands, revisions …); meals, weeks, preferences and settings are items too. Fields merge one by one:
  a one-side change wins, equal changes agree, different changes → last writer by the item’s `updatedAt` (deterministic tie-break).
  Lists without ids (activity log, deletedRecipeIds, tags) merge as sets. Menu reactions use their existing merge.
- **Family recipe content** (name, ingredients, steps, prep) edited differently on both devices: the newer stays and the other
  version is kept in `state.recipeRevisions` (open), shown as “Có 2 bản chỉnh sửa — xem bản kia”; the family can view and
  restore it. Restoring keeps the replaced version too. Nothing is discarded; no quantity is invented.
- **Deleted vs edited** → kept (edited) with a short note. Deletions are tombstoned (`state.syncTombstones`, 120 days, max 4000).
- **Stamping**: local writes stamp `updatedAt`/`updatedBy` on changed items (once per burst of edits, before a push/pull and on page hide).
  Migration: states without stamps are the baseline (time 0); nothing is rewritten or lost.
- **Server** (`family.mts`, `lib/sync-guard.mts`): merging clients send `sync:2`; a stale write gets 409 **with the stored copy**
  (no extra read), the client merges and retries (≤5 attempts, jitter). A write that would drop items the stored copy has and
  the new state does not tombstone is refused (`would_drop`) → client re-merges without a base (union). `onlyIfMatch`/`onlyIfNew`
  still decide every race. New `op=state-version` (etag only). Legacy clients unchanged.
- **Sync speed**: pull before push — version check every 15 s while visible and idle, on focus, visibility and network return;
  full read only on change. Push debounced 1.2 s; “bought”/“done” and urgent alerts push immediately.
  The “stop syncing until the user decides” behaviour is gone; the blocking dialog remains only for a newer app edition,
  a merged state the app cannot validate, or the first link of a device to a family (AGENTS rule 12: never silently combine).
- **Bug found and fixed while testing**: the merge base could alias the working state object, so later edits looked like
  “unchanged” and the remote copy won. The base is now always a private copy. A re-check while linked (network recovered)
  no longer adopts the stored etag without merging.
- **UX**: status “Đang đồng bộ… / Đã đồng bộ · vừa xong / Đã gộp thay đổi từ thiết bị khác” (sidebar + header pill attribute/title);
  a short pill after a merge; a non-blocking notice for two recipe versions. Bilingual, ≥44 px targets, reduced motion respected.
- **Studio**: sync record now counts writes, `merges`, `stale` (merged-and-retried) and real `conflicts` separately; family page shows “Auto-merged”.

## Tests
- `tests/sync-merge.test.cjs` (13): every collection, field-level LWW, meals, deletes vs edits, recipe dual revision,
  idempotence, commutativity, no-base union + tombstones, reactions, stamping/migration, push loop (409 → merge → retry,
  bounded retries with jitter, would_drop union retry, newer edition stop).
- `tests/sync-guard.test.mjs`: guard, 409 with state, version check, legacy behaviour, Studio counters.
- `tests/sync-merge-browser.test.cjs` (`npm run test:sync-merge:browser`, in `test:all`): two browser contexts, same family,
  real gate/accounts/family handlers, in-memory store — online and offline concurrent edits survive on both devices;
  same recipe renamed on both → newer wins + revision + notice + restore on both; shopping item checked/renamed → both; no clash dialog.
- `tests/offline.test.mjs` updated to the new requirement (reconnect merges against the last synced revision; the first link still asks).

## Responsive evidence (viewport simulation in Chromium, not physical devices)
375×812 VI/EN (merged pill, two-versions notice, dialog), 320×740, 820×1100, 1280×800 (notice + dialog, EN). No horizontal overflow asserted at each size.
Limits: light theme only for the notice screenshots; dark-mode CSS added but not screenshotted. GitHub CI not run by this agent (no push).
