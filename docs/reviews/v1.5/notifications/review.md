# v1.5 review — notifications, urgent messages, family restore, offline grant

Branch `agent-a/notifications` (based on 8d7a7a7). Preview/testing only — deploy to `main` is NOT approved.

## What changed
- **Push delivery (root cause fixed).** A device belongs to the household member it was registered for. An account with no linked member (every owner after create-family) is linked to the member it registers for, server-side and conflict-safe (409 `member_linked_other` / `member_has_account`). Owners/editors can register a *shared device* for a member without an account (e.g. a grandparent's phone). Old devices registered by an unlinked account start working immediately.
- **Precise outcomes** from test/urgent/request sends: `not_configured`, `no_device`, `needs_resubscribe`, `no_recipient`, `quiet_hours`, `daily_limit`, `delivery_failed` (with count), `sent` — shown in Vietnamese/English instead of always "register this device first".
- **Quiet hours:** urgent messages alert during quiet hours by default (owner decision); each device can turn it off. Settings text updated.
- **iOS Safari tab:** no more raw `Notification` error; guidance "Add to Home Screen (iOS 16.4+), open from the icon, sign in there".
- **Delivery errors:** logged (status + short body, no secrets); 404/410 remove the subscription; 403 marks the device "register again". Payload trimmed by UTF-8 bytes (≤3000), test notifications get unique tags; the service worker tells open windows to refresh urgent messages on each push and guards `client.navigate`.
- **Urgent messages:** list/mark-read use the account-linked member; record + index committed before push, index retries with backoff + jitter, same-id retry re-indexes, push failure never returns 503; refresh on push, visibility, focus, network return and after send; archive reverts with a toast if the server rejects; offline send keeps the text. Panel is now a collapsible card with unread count, auto-opens for a new unread message and remembers open/closed on this device.
- **Family restore after login:** invalid/removed session family falls back; last-used family persisted on every successful resolution; most recently used/joined membership auto-picked; per-user membership index (backfilled once for old records); non-secret `bep-account=1` presence cookie set on login/register, cleared on logout.
- **Offline grant:** grants are verified only against a separately pinned public key (page: from live status; service worker: fetched itself). Forged grants are rejected.

## Verification
- `npm run check`, `npm test` (incl. new `notifications.test.mjs`, extended push/offline/family-invitations tests), `npm run typecheck`, `npm run test:browser` — pass.
- `test:authenticated-startup` reaches line 159 (after real-account worker install, signed offline reload and 320/375/820/1280 header checks with no page errors) and then stops with the known sandbox `ENOTFOUND kitchen.localhost` in Node's request context — environment limitation.
- Responsive QA script (Chromium viewport simulation, device-only mode with stubbed family requests, synthetic messages): mobile 375×812, tablet 820×1100, desktop 1280×800, narrow 320×740. Checked: no horizontal overflow, summary ≥ 44 px tall, all panel buttons ≥ 44 px, labels not clipped, auto-open/remember/re-open, keyboard toggle (Enter), archive failure revert + toast, mark-read uses the active member, offline send keeps text, iOS guidance (Notification undefined), bilingual delivery-failure toast, reduced motion (chevron transition 0s).

## Screenshots
`urgent-expanded-*` / `urgent-collapsed-*` (mobile/tablet/desktop, VI/EN, light/dark, plus narrow), `urgent-archive-failure-toast-mobile-vi.png`, `urgent-offline-send-mobile-vi.png`, `push-ios-guidance-mobile-vi.png`, `push-error-toast-tablet-en-light.png`, `push-error-toast-desktop-vi-dark.png`.

## Limits
- Browser viewport simulation only; no physical iPhone/Android hardware and no real push service delivery (transport mocked in tests).
- Users who are offline at the very first launch after this update and have no pinned key yet cannot use the old offline grant until they are online once (security trade-off).
- Pre-existing dark-mode contrast issues outside the urgent panel (sidebar family card, white select fields) are visible in dark screenshots; not changed here.
