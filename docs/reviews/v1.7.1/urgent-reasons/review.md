# v1.7.1 · Studio "Tin khẩn / Urgent": why urgent messages failed

Branch `agent-dd/urgent-reasons` (based on 945552d). Not pushed. Nothing has been deployed or previewed. This is **not** deploy approval (AGENTS.md rules 1–5, 10, 18).

## Henry's question
The Overview tile said "Urgent messages 5 · 2 failed" but did not say why. "Failed" means alerts with `pushStatus: 'not_sent'`. The stored `pushReason` was never shown in Studio.

## What changed
| Area | Change |
|---|---|
| `src/netlify/lib/push.mts` | `sendPushBatch` now also returns `devices` (matching registered devices), `needsResubscribe`, `typeOff` (urgent switched off) and `quiet` (held by quiet hours). This is additive and no existing field changed. |
| `src/netlify/functions/family.mts` | After an urgent fan-out, the alert record also stores `pushAt` and `pushDetail` = `{v, recipients, devices, selected, accepted, failed, expired, suppressed, needsResubscribe, typeOff, quiet}` (counts only). Target **member ids** were already stored in `targets`. The code was already storing `pushStatus`/`pushReason`. |
| `src/netlify/lib/urgent-report.mts` (new) | `alertRow` builds the overview row (adds id, time, reason and whitelisted counts; never text or names). `urgentList` returns the 30-day list, filters, pages and reason aggregation. `urgentFamily` is the drill-down. |
| `src/netlify/lib/studio.mts` | One line: `scanFamily` uses `alertRow`. The old row fields are kept, so the tile and the "Urgent messages" page are unchanged. |
| `src/netlify/functions/studio.mts` | One import line plus two ops. `urgent` is the metadata list for every Studio read role. `urgent-family` is owner-only and writes the audit entry `view_urgent_family`. |
| `src/frontend/studio-urgent.ts` (new), `dist/studio.html` (+1 script tag) | Adds the Studio page **Tin khẩn / Urgent**, registered through `window.studioPages`. It shows the aggregate by reason (plain words + "How to fix"), then the list: Sydney time + relative time, family, recipients count, devices matched/accepted/failed/expired (+ need re-enabling / urgent off / quiet hours), the status chip (Đã gửi / Không gửi được / Đang gửi), the reason and the fix. Filters: failed only / all, and family. Pages hold 20 rows. "Family details" (owner only) shows sender and recipient display names and each recipient's devices **as they are now**. |
| `src/frontend/studio.ts` | One token: the urgent tile gets class `tile-urgent`. The tile is clickable and has a "See why not delivered →" link (44 px). |
| `src/frontend/household-ui.ts`, `dist/styles.css` | In the app urgent panel, the **sender** of a failed alert gets a one-line "How to fix" under the existing reason text. Recipients and delivered alerts get nothing new. |
| `dist/studio.css`, `dist/styles.css` | CSS added in appended `v1.7.1 urgent-reasons` blocks. The tile hover transition respects reduced motion. |

Reason wording follows `pushReasonText` in `src/frontend/push-ui.ts`. The fix hints are the ones Henry specified (no_device, needs_resubscribe, quiet_hours, delivery_failed, not_configured), plus no_recipient, daily_limit, family_suspended, unknown_member and unfinished (pending for over 15 min).

## Privacy and roles
- Message text never appears in any response or page. Tests assert this for the list, the drill-down and the rendered HTML.
- The list carries no member names. Only the family name is shown, as on other Studio lists. Names appear only in the owner-only, audited drill-down.
- No push endpoints or keys appear anywhere. The product UI does not name any hosting vendor.

## Older alerts
- Alerts sent before this release have no `pushDetail`. They show "No device details (older message)".
- A failed alert with no `pushReason` shows the reason "No details (older message, from before reasons were stored)". Its fix tells Henry to open Family details for the current device state.
- An overview cached before the upgrade (rows without time) still lists; those rows show the date only.

## Tests (added to the chain)
- `src/tests/urgent-reasons.test.mts`, run by `npm test`. It covers:
  - the stored detail for no_device / needs_resubscribe / no_recipient / delivery_failed (410 expired) / sent
  - role gating: owner and support can read the list; the drill-down is owner-only; family accounts get 403; no session gets 401
  - the 30-day window, newest first, failed/all and family filters, pagination clamp, reason aggregation
  - older alerts without details, and stuck-pending → unfinished
  - no text or names in the list
  - drill-down audited exactly once, with no text, endpoints or keys; the list itself is not audited
  - the detail whitelist
- `src/tests/urgent-reasons-browser.test.cts`, run by `npm run test:urgent-reasons:browser` and appended to `test:all`.
  - Studio, against the real handlers, at 320×740 VI light, 375×812 VI light / EN dark, 820×1100 VI dark / EN light and 1280×800 VI light / EN dark:
    - the tile link is ≥44 px, and a click on the tile opens `#urgent` (nav `aria-current`)
    - the reasons and fixes show in both languages, with aggregate counts [2,1,1]
    - the list is failed-only by default
    - controls are ≥44 px, with no horizontal overflow
    - the "all" filter works
    - the drill-down shows names and adds one audit entry
    - the language switch re-renders in place
    - the offline indicator works
  - Support role: list visible, no drill-down button, server returns 403.
  - App urgent panel at 375×812 VI light, 820×1100 EN dark and 1280×800 VI dark: the hint appears only on the sender's own failed alert.

Local runs (sandbox, supporting evidence only):
- passed: `npm run check`, `npm run typecheck`, `npm test` (whole chain), `test:urgent-reasons:browser`, `test:studio-speed:browser`, `test:alerts-online:browser`
- **Not yet run:** GitHub CI. Nothing has been pushed (rule 15).

## Screenshots (this folder)
- Overview tile: `overview-tile-vi-light-mobile-375x812.png`
- Studio Urgent page:
  - `studio-urgent-vi-light-narrow-320x740.png`
  - `studio-urgent-vi-light-mobile-375x812.png`
  - `studio-urgent-en-dark-mobile-375x812.png`
  - `studio-urgent-vi-dark-tablet-820x1100.png`
  - `studio-urgent-en-light-tablet-820x1100.png`
  - `studio-urgent-vi-light-desktop-1280x800.png`
  - `studio-urgent-en-dark-desktop-1280x800.png`
- Family drill-down: `studio-urgent-family-vi-light-desktop-1280x800.png`
- App sender hint:
  - `app-urgent-hint-vi-light-mobile-375x812.png`
  - `app-urgent-hint-en-dark-tablet-820x1100.png`
  - `app-urgent-hint-vi-dark-desktop-1280x800.png`

## Limits
- All size checks are browser viewport simulation in Chromium. No physical iPhone, iPad or PC was tested.
- The list reads the cached overview (≤5 min old). Owner "Refresh" passes `fresh=1`; the drill-down always reads storage directly.
- Overview rows are capped at 300 alerts per family, and the drill-down also reads at most 300.
- Per-alert counts exist only for messages sent after this release. Older ones show "no details".
- In the drill-down, recipient devices show the **current** state, not the state at send time. A device removed after a 410 is no longer listed. The page says this.
- `family_suspended` and `unknown_member` are refused before an alert is stored, so in practice they never appear in the list. Their wording exists for completeness.
- On a 375 px phone the Studio nav scrolls sideways; this is the existing Studio pattern. The 320 px check has no page overflow.
