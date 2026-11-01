# Studio hooks: wired into the app (v1.5)

Branch `agent-h/studio-hooks` (based on `claude/bold-pascal-riryi0` at 0dbde45). This is preview/test work only. It has **not** been deployed and there is **no** deploy approval.

These hooks connect the owner console (Studio) to the normal app paths. They implement items 1–14 from `docs/reviews/v1.5/studio/review.md` → "Hooks the lead should add after merging". Each hook was adapted to the current code rather than pasted from that list.

## Behaviour

### Accounts (`src/netlify/lib/accounts.mts`)

**Disabled accounts**
- `resolveAccount` returns `null` for an account marked `disabled`. Existing sessions therefore stop working everywhere: accounts, family, grocery and Studio.
- Login returns 403 with `error` "Tài khoản đang tạm khóa…" and `errorEn` "This account is temporarily locked…".
- No session cookie is issued.
- A `login_failed` event is recorded with `reason:'disabled'`.

**Sign-up policy**
- `register` honours the policy:
  - `closed` → 403 "Đăng ký mới đang tắt." / "New sign-ups are turned off."
  - `invite-only` → registration needs `body.invite`, which can be a code or a link. It must be a real, unexpired invite that is open or addressed to that username. A random well-formed code is refused.
- `ALLOW_ACCOUNT_SIGNUP=false` still closes sign-up.
- `status.signup` is false only when sign-up is closed.
- New field `status.signupMode` is `open`, `invite-only` or `closed`.
- The login page now sends its existing invitation field as `invite` on register. This is a one-line edit to `src/frontend/login.ts`. After registering, the page still calls `join` as before, so the invited person is connected to the family (AGENTS.md rule 12).

**Limits**
- **Families per account:** `create-family` refuses with 403 when the account already owns `maxFamiliesPerAccount` families (default 5). Owned families are counted from the membership index.
- **Members per family:** `join` uses `familyLimits(id).maxMembers` instead of the constant 20. A per-family override wins over the platform setting, and the default is still 20. The status code stays 400, and the message is now bilingual.

**Suspended families**
- `invite` and `join` return 423 for a suspended family.
- `revoke-invite` still works, because it only reduces access.

**Events**
- `signup` (with `invited` flag), `login`, `login_failed` (`credentials` / `disabled`), `family_created`, `invite_created` (`targeted`), `invite_accepted`, `invite_revoked`, and `error` (unexpected 5xx only).
- Error responses now include `errorEn` when one is defined. They also carry a generic English text for 503 errors.

### Family (`src/netlify/functions/family.mts`)

**Suspended families are read-only**
- Non-GET `state`, `photo`, `alert-send` and `push-send` requests return **423** with this body:
  `{error:'Gia đình đang tạm dừng (chỉ xem).', errorEn:'This family is paused (read-only).', reason:'family_suspended'}`
- GET state, alerts, push-status, read receipts and device registration still work.
- The suspension check runs only on those write ops. It costs one small read.

**Other hooks**
- **Sync records:** `recordSync` runs on a successful state PUT (bytes) and on a 409 conflict.
- **Push events:** `push_send` is recorded after alert-send (`urgent`), push-send (`urgent`/`shopping`) and push-test (`test`). Each event has `reason`, `accepted`, `failed` and `expired`. The reason is `expired` when every failure was an expired subscription, which feeds Studio's "Subscription expired" bucket.
- **Device limit:** push-subscribe enforces the family's `maxDevices` (default 50). It returns 400 with `reason:'device_limit'`, and re-registering an existing device is still allowed.
- **Errors:** an `error` event is recorded in the catch block.

### Push and scheduled jobs

**Push (`src/netlify/lib/push.mts`)**
- `sendPushBatch` counts `expired` (404/410) and returns it. Those subscription records are still deleted.
- `devices()` now lists up to 500 records instead of 50. This matches the largest per-family limit Studio allows. Without the change, a limit above 50 could never be reached or delivered to. Registration still enforces the family's own limit.

**Reminders (`reminders.mts`)**
- `runReminders` records `recordCronRun('reminders',{families,jobs,accepted,failed})`.

**Price Scout (`grocery-cron.mts`)**
- Runs record `recordCronRun('price-scout',{imported,reason,stores,items})`. This covers `not-configured`, import success or failure, and errors.
- The run outside the 06:xx window is skipped and not logged.
- Only counts are stored, never prices or feed contents.

### Failure safety and latency

- Every Studio helper used here swallows its own storage errors. Where a limit is read, it falls back to the defaults of 20 members and 50 devices.
- Events and sync records go through `runtime.waitUntil` when the platform passes it to the handler. They then finish after the response, so sign-in, sync and push latency are unchanged. Without `waitUntil`, as in tests, they are awaited, and they cannot throw.
- Platform settings use Studio's 60-second in-memory cache.

### App (`src/frontend/platform-banner.ts`, loaded after `household-ui.js`)

**When it fetches**
- The app fetches the public `studio?op=banner` once at startup.
- It fetches again when the page becomes visible or comes back online, at most every 10 minutes.
- It sends no cookies. Offline, a non-200 response or a network error shows nothing and raises no error.

**What it shows**
- **Banner:** VI or EN text follows the app language and re-renders when the language changes. Severity is info or warning. The audience setting is honoured: `all`; `account` (shown only when signed in); `device-only` (shown only without an account).
- **Dismissing the banner:** the dismissal is stored per banner id in `localStorage`. This is only a per-viewer convenience: if storage is unavailable, the banner simply shows again.
- **Maintenance note:** a warning style with a "Bảo trì / Maintenance" prefix. It can be dismissed for the session.
- **Update prompt:** shown when `minAppEdition` is a whole number greater than `APP_EDITION` (core.ts, currently 5). It reads "Có bản cập nhật — tải lại" / "An update is available — reload". The **Tải lại / Reload** button reloads the page, and the × button hides the prompt for the session.

**Feature switches**
- `flags.priceScout===false` → `body.flag-off-priceScout` hides `.price-scout`.
- `voice===false` → hides the `[data-personal="voice"]` entry.
- `urgentMessages===false` → hides `.family-urgent` and the "Báo khẩn" (`[data-house="urgent-new"]`) button.
- The last-known switches are cached locally and applied at startup, so a feature that is turned off does not flash before the network answers.
- `price-scout-ui.ts` was not edited.

**Paused family**
- `familyRequest` shows the toast "Gia đình đang tạm dừng (chỉ xem)" / "This family is paused (read-only)" on any 423, throttled to once per 20 seconds.
- Sync and photo upload stop quietly on 423 so that the generic "đang chờ lưu" toast does not overwrite it. Changes stay on the device, marked dirty.

**Accessibility**
- Notices sit in a labelled region above `#main`, and each notice has `role=status`.
- Every button is at least 44×44 px and has a visible focus ring.
- There is no animation, so reduced motion needs no special handling.
- Text wraps, and a dark-mode palette is included.
- No hosting vendor is named in any user-facing text.

## Tests

**`src/tests/studio-hooks.test.mts`** (new, in `npm test`) runs the real handlers with in-memory stores and synthetic data. It covers:
- A disabled account cannot log in, gets a bilingual 403 and no cookie, and its existing session is rejected by accounts and family.
- Sign-up policy:
  - invite-only refuses no code, an unknown code and a code addressed to someone else, and accepts a valid invite link, after which the account joins;
  - closed is refused;
  - `status.signup`/`signupMode` are correct.
- Limits:
  - families per account;
  - members per family (per-family override, and an existing member re-joining is not double-counted);
  - devices per family (same-device re-register allowed);
  - defaults 20/50.
- Suspended family:
  - PUT state, push-send and alert-send return 423 with VI/EN text;
  - GET state and alerts still work and family data stays intact;
  - invites are blocked;
  - writes resume after unsuspend.
- `recordSync` on PUT and on 409.
- `push_send` events for sent and for expired (410, `expired:1`). Events contain no endpoint or keys.
- Events are recorded for signup, login, login_failed, family_created and the invite_* types.
- Reminder runs and Price Scout runs are recorded, and an outside-window run is not logged.
- With a console store that throws on every call, register, status, login, create-family, invite, join, state PUT/409, push-subscribe, push-test, reminders and the Price Scout cron all still succeed.
- `waitUntil` is used when the runtime provides it.

**`src/tests/studio.test.mts`:** one assertion changed. The family's sync `writes` is now 2: the seed state PUT is recorded by the hook, plus the manual `recordSync`.

**`src/tests/platform-banner-browser.test.cts`** (new, `npm run test:banner:browser`, added to `test:all`) covers:
- VI at 375×812, 820×1100, 1280×800 and 320×740: banner and update prompt shown above main content, touch targets ≥44 px, no horizontal overflow, no page errors.
- EN at mobile (light) and tablet/desktop (dark), including the warning and maintenance styles, and re-rendering on language switch.
- Dismissing persists across a reload.
- "Later" for the update prompt.
- Reload button navigates.
- Audience: an `account` banner is hidden in device-only mode, and a `device-only` banner is shown.
- A non-numeric `minAppEdition` is ignored.
- A 503 shows nothing.
- All three flags hide Price Scout, voice and urgent entry points, and turn back on.
- Offline makes no request.

## Responsive QA evidence

Chromium 1243 headless, browser viewport simulation, device-only mode, reduced motion on. **This is not physical device testing.**

| Size | Screenshots |
|---|---|
| Mobile 375×812 | `banner-vi-mobile-375x812.png`, `banner-en-light-mobile-375x812.png` |
| Narrow 320×740 | `banner-vi-narrow-320x740.png` |
| Tablet 820×1100 | `banner-vi-tablet-820x1100.png`, `banner-en-dark-tablet-820x1100.png`, `flags-off-shopping-tablet-820x1100.png` |
| Desktop 1280×800 | `banner-vi-desktop-1280x800.png`, `banner-en-dark-desktop-1280x800.png` (warning severity + maintenance note) |

## Limits / not done

- **423 toast:** not captured in a screenshot. Its behaviour is covered at the API level, and the toast reuses the app's existing `toast()`.
- **Account-mode banner:** the audience logic is tested only in device-only mode in the browser. Account mode uses the same `accountSession` / `BEP_SESSION` check.
- **Non-numeric `minAppEdition`:** a value such as a release name is deliberately ignored rather than guessed.
- **`waitUntil` in production:** this assumes the hosting runtime passes a context with `waitUntil` as the handler's second argument. If it does not, hooks are awaited, which adds one small storage write per event.
- **Login page language:** errors on the login page still show the Vietnamese `error` field, as before. `errorEn` is available to clients that use it.
- **No deploy:** nothing has been merged to `main` and nothing has been deployed.
