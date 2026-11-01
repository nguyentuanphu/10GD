# v1.7 alerts-online — release record (agent Y)

Branch `agent-y/alerts-online` (based on local `v17-base` = v1.6 code). Not deployed and no preview; GitHub CI still has to run (AGENTS.md rules 14–18).

## Henry's report and root causes

1. **"có mạng mà báo không có mạng"**: the app showed Offline even though the phone had a connection.
   - `bootstrap.ts` `check()` set `BEP_OFFLINE = true` after **any** failed session check: an HTTP 5xx (for example a slow cold start that fails), the 15 s timeout, or a fetch `TypeError`. iOS aborts requests when the PWA goes to the background and often fails the first request after resume. `check()` runs on `visibilitychange` and `pageshow`, so one failed request after resuming was enough to show Offline.
   - The cold-start path set `BEP_OFFLINE = !navigator.onLine || !!offlineGrant`, so any failed first status request on a device with an offline grant started in Offline.
   - Nothing cleared the state unless the browser fired `online` (it does not when the network never went away) or a later check succeeded (next visibility change, or up to 60 s). Henry had to tap "Thử kết nối", and that button also treated a server error as "still offline".
   - The `online` listener in `offline-access.ts` set `BEP_OFFLINE = false` without checking the network.
   - Measured on v1.6 (Chromium): one HTTP 502 → Offline; one dropped request → Offline.
   - Checked and **not** a cause: the service worker never handles `/.netlify/*` requests, the edge gate only serves `/login`, and there is no cached "offline" flag in localStorage.
2. **Slow, janky urgent send.** The client did these steps in order: a full family-state `PUT` (whenever anything was unsaved), then `alert-send`, then waited for the alerts list to reload, then re-rendered the whole page. The server read the family document, wrote the record and the index, read keys and devices and **read the family document again**, sent to every device, and replied only after all pushes finished and the status was updated.
3. **Late push notifications.** Urgent pushes were already sent at send time with `urgency: high` and in parallel. The delay came from the reply waiting on the push fan-out. Reminders are sent only by the `reminders` schedule (`*/15`), and each is due in a 15-minute window, so a reminder set to 17:05 arrives at about 17:15.

## Changes
- `src/frontend/offline-access.ts`: new `createConnectivity()` state machine plus browser wiring (`BepConnectivity`):
  - A 5xx or slow response marks the service "degraded": the header stays Online and the waves dim.
  - A network error is checked with `/health.json` plus 2 retries (about 1 s and 2 s apart). The app shows Offline only if all of them fail, or if `navigator.onLine` is false.
  - Recovery happens on `online`, on `visibilitychange` (visible), on `pageshow`, and on a backoff of 2/5/10/20/30 s.
  - Checks are deferred while the page is hidden.
  - Removed the `online → BEP_OFFLINE=false` shortcut.
- `dist/health.json` (static). `sw.ts` never handles it, so it always goes to the network. Urgent notifications now use `renotify`, `requireInteraction` and `timestamp`.
- `bootstrap.ts`: failures are reported to the checker by type (`server` / `timeout` / `network`) instead of switching to Offline. `online` also re-runs the session check.
- `household-ui.ts`:
  - **Optimistic send.** The message appears at once marked "Đã gửi · đang chuyển thông báo…". Only the urgent panel is repainted, not the whole page.
  - A double tap sends once (per-id guard).
  - On failure the message is removed, the form reopens with the same text and id, and an error is shown. Resending never duplicates.
  - The full-state sync before sending is gone. If the server reports `unknown_member`, the app syncs once and resends.
  - Alert refreshes keep messages that are still sending. Family requests report to the connectivity checker.
- `family.mts`:
  - `alert-send` reads the family document in parallel with the request body and reuses it for push.
  - It replies as soon as the message is stored. The push fan-out and status update run in `runtime.waitUntil`, falling back to synchronous when that is not available.
  - Returns `reason:'unknown_member'`.
  - Saving the state runs reminders due now in the background (same dedupe keys as the schedule, throttled to once per minute per family per instance).
- `push.mts`:
  - Keys, devices and the family document are read in parallel, and no second read when a caller already has the document.
  - Sends use `Promise.allSettled`.
  - `pushOptions()`: urgent uses `Urgency: high` with a TTL of 7200 s.
  - 404/410 subscriptions are pruned (now tested).
  - `scheduledReminders` accepts a state the caller already loaded.
- `personal-ui.ts` (2 surgical edits): the `online` handler waits for the checker. "Thử kết nối" uses the checker and tells "no network" apart from "service slow".
- CSS block `v1.7 alerts-online`: sending dot, degraded pill. The animation stops under reduced motion.

## Measured timings (Chromium simulation, local server, same browser test run against both builds)
| | v1.6 | v1.7 |
|---|---|---|
| One HTTP 502 on the session check | **Offline** | stays Online |
| One dropped connection (TypeError) | **Offline** | stays Online (health ping OK) |
| Server 3 s slow on every family call | Online | Online (no flicker, sampled every 150 ms) |
| Network really blocked (sockets reset, navigator online) | — | Offline after 3.0 s (3 pings) |
| Network restored | needs a tap / next check | automatic, 2.0 s |
| Urgent message visible after tapping Send (600 ms simulated function latency, 2 s push) | 2686 ms | **9–13 ms** |
| `alert-send` handler reply (2 s push) | 2042 ms | 16–35 ms |
| Handler bench, 25 ms/storage op, 600 ms push, 4 devices | 860–940 ms | 180–190 ms reply (push finishes in the background) |

## Tests
- `tests/alerts-online.test.mjs`, added to `npm test`. It covers:
  - the state machine: one failure is not offline; TypeError plus failed retries is offline; recovery on online, visible, pageshow and backoff; checks deferred while hidden; shared verification;
  - the alert reply arriving before any push completes;
  - 4 devices in flight at once, with `urgency: high` and TTL;
  - pruning of 410 subscriptions, duplicate ids not pushed again, and `unknown_member`;
  - the synchronous fallback, parallel reads, and reminders sent when the state is saved.
- `tests/alerts-online-browser.test.cjs` (`npm run test:alerts-online:browser`, appended to `test:all`) covers:
  - a 3 s slow server, one 502 and one dropped request: never Offline;
  - a blocked network: Offline, then automatic recovery;
  - `navigator` offline and online;
  - the sent state shown in under 100 ms, a double tap sending once, the server replying before the push fan-out, and the push outcome shown after refresh;
  - rollback and resend;
  - no horizontal overflow; screenshots.
- Local runs (supporting evidence only, rule 15): `check`, `typecheck`, `npm test`, `test:browser`, `test:authenticated-startup`, `test:alerts-online:browser`, `test:offline:browser`, `test:update:browser`: all pass. GitHub CI on the PR head commit is still required.

## Responsive evidence
| Size | Screenshots | Light/dark and language |
|---|---|---|
| 375×812 (mobile) | `urgent-mobile-*`, `today-offline-mobile-*` | VI light, EN dark |
| 820×1100 (tablet) | `urgent-tablet-*`, `today-offline-tablet-*` | VI light, EN dark |
| 1280×800 (desktop) | `urgent-desktop-*`, `today-offline-desktop-*` | VI light, EN dark |
| 320×740 (narrow phone, header pill) | `today-online-narrow-320-vi.png` | VI |

Each set covers the Today card offline state and the urgent panel with one message in the "sending" state. The browser test asserts no horizontal overflow and a fully visible status pill at every size. Reduced motion was on for the run. Each file is under 150 KB.

## Limits
- Chromium viewport simulation only. **iOS Safari and the home-screen PWA were not tested** (not available here), and no physical hardware was tested. iOS resume behaviour is modelled by dropped or aborted requests and by hidden-page deferral.
- Push delivery is mocked. Apple and FCM delivery latency after `Urgency: high` is outside the app's control.
- `waitUntil` background delivery relies on the functions runtime's `context.waitUntil`. Without it, the handler waits for the push fan-out as before.
- Pre-existing, not changed: the tablet sidebar tagline "LESS WORRY, MORE FAMIL…" is clipped at 820 px.
- **Reminders** are still only as precise as the 15-minute schedule unless the family state is saved during the due window. Changing `netlify.toml` `[functions."reminders"] schedule` to `*/5 * * * *` (owned by agent X) would make them at most 5 minutes late. It is safe because each reminder already has a dedupe key and a 15-minute due window. The cost is 3× more schedule runs.
- Optional hosting header (not added; agent X owns `netlify.toml`): `/health.json` with `Cache-Control: no-store`. The client already uses `cache:'no-store'` plus a unique query string.
