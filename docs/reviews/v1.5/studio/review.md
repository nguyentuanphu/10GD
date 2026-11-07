# Studio: owner console (v1.5, Agent F)

Brand (provisional): **FamTray · Bếp Gia Đình**, Studio.
Branch: `agent-f/studio`, based on `8d7a7a7`. Not merged, pushed or deployed. Responsive QA does not grant deploy approval (AGENTS.md rule 10).

## What was added

| File | Purpose |
|---|---|
| `dist/studio.html`, `dist/studio.css` | Standalone page at `/studio.html` with its own stylesheet. It is not part of the app startup pack or the service-worker precache. |
| `src/frontend/studio.ts` → `dist/studio.js` | Console UI: plain TS wrapped in an IIFE so it shares no globals with the app. VI/EN toggle, auto/light/dark theme, URL hash routing, accessible tables and dialogs. |
| `src/netlify/functions/studio.mts` | Single API with `op=` routing. Exports `createStudioHandler()` for tests. |
| `src/netlify/lib/studio.mts` | Roles, audit/event logs, platform settings, hook helpers, password re-confirm, metrics. |
| `src/tests/studio.test.mts` | Backend suite, added to `npm test`. |
| `docs/reviews/v1.5/studio/studio-shots.mts` | Screenshot harness: synthetic seed, real handlers, in-memory stores. |

Size: `studio.js` is 78 KB raw and 23 KB gzipped. This is **over the 60 KB raw target**. The TypeScript emitter pretty-prints the output, and every string is stored in both languages. The source file is 67 KB. No minifier exists in the build.

## Operator guide

1. In the hosting provider's environment variables, set `STUDIO_ADMINS=henrynguyen` (comma-separated, case-insensitive). Redeploy.
2. Sign in to the app normally at `/login`, then open **`/studio.html`**. If you are not signed in, the page links to `/login?return=/studio.html`.
3. If `STUDIO_ADMINS` is unset, every Studio API call returns 403 with instructions for turning it on. The public banner endpoint still works.
4. Optional read-only support staff: set `STUDIO_SUPPORT=name1,name2` **and** turn on *Settings → Studio support role*. Support staff can see counts and metadata only. They cannot run mutations, reveal emails, export data, open support views or read the audit log.
5. Optional environment overrides. These always win over stored values, and the Settings page marks them "environment":
   - `STUDIO_SIGNUPS` = `open` | `closed` | `invite-only`. The existing `ALLOW_ACCOUNT_SIGNUP=false` maps to `closed`.
   - `STUDIO_MAX_FAMILIES_PER_ACCOUNT`, `STUDIO_MAX_MEMBERS_PER_FAMILY`, `STUDIO_MAX_DEVICES_PER_FAMILY`
   - `STUDIO_MAINTENANCE_MESSAGE`, `STUDIO_MIN_APP_EDITION`, `STUDIO_PRICE_SCOUT_STATES` (for example `NSW,QLD`)
   - `STUDIO_FLAG_PRICE_SCOUT`, `STUDIO_FLAG_VOICE`, `STUDIO_FLAG_URGENT_MESSAGES`, `STUDIO_FLAG_SUPPORT_ROLE` (each `true` or `false`)
6. No routing change was needed. The edge gate passes `/studio.html` through as a static file, and the API lives at `/.netlify/functions/studio`.

### Sections (URL hash)

`#overview` `#accounts` `#families` `#invites` `#notifications` `#messages` `#broadcast` `#settings` `#health` `#logs` `#catalog` `#rollout`

- **Overview:** each tile carries a one-line "what this means". The overview is cached for 5 minutes in the Studio store, and there is a "Recompute now" button. Recomputing also prunes old logs.
- **Accounts:** search, status filter, sort and pagination. Sorting is available as column headers on wide screens and as selects on all sizes. The detail drawer shows memberships, sessions, push devices and recent events. Actions:
  - disable or enable the account
  - sign out everywhere
  - send a reset link (only when email is configured and the account has an email)
  - issue a new recovery code, shown once
  - delete the account (password re-confirm required)
- **Families:** the detail drawer shows:
  - members and roles, with transfer-ownership and remove-member actions
  - invites (revoke)
  - sync and storage health
  - reminder times
  - per-family limits
  - a time-limited, audited support view
  - export backup (reason required, audited)
  - suspend (read-only)
  - delete (password, typed family name and reason all required)
- **Invitations:** listing with revoke. Codes are never shown.
- **Notifications:** devices by platform and per family, send outcomes by reason, the reminder run log, and "send test to my device".
- **Urgent messages:** 14-day counts and failures only. Message text is never shown.
- **Broadcast:**
  - The VI and EN banner has a severity, a start and end time, and an audience (all, account or device-only).
  - Push broadcast always does a dry-run count first. It then needs you to type `SEND` and give a reason. It is limited to one every 6 hours and is audited. It sends only to account-linked, opted-in devices and respects quiet hours.
- **Settings:** shows the source of each value (environment, stored or default). It also holds the public links (privacy, terms, support email).
- **System health:** green/amber/red with plain-language "what to do" hints. It checks:
  - email sender and email link address (presence only)
  - per-family push signing keys
  - last reminder run
  - Price Scout feed and last run
  - storage reachability (timed probe)
  - build id (`COMMIT_REF`)
  - errors in the last 24 hours
  - custom domain
  - sign-up policy
  - Studio admins
- **Logs:** the event log, and the audit log (owner only). Filters by type, date range, account and family, with "load more".
- **Catalog:** loads the build's `seed.js`, `recipe-catalog.js` and `artwork.js` in the browser. Shows recipe counts by category, cuisine, diet and tags, plus how many recipes lack artwork. Price Scout's `data/master-catalog.json` (or `master-catalog.json`) is shown if present; currently it is "Not present".
- **Rollout checklist:**
  - Detected automatically: privacy link, terms link, support email, custom domain, email sender, rate limits, abuse tools, Studio.
  - Ticked manually: everything else, for example backups.

## Security model

- Studio needs a live account session. It uses the same `resolveAccount` cookie, epoch and expiry check as the other APIs. The username must also be in `STUDIO_ADMINS` (owner) or `STUDIO_SUPPORT` with the flag on (support).
- A disabled account has no access even if it is listed as an admin. Denied attempts are audited as `access_denied`.
- Every mutation requires:
  - the same `Origin` as the API
  - an `x-studio-csrf` header, which is a SHA-256 value derived from the session key and compared in constant time
  - JSON of 60 KB or less
  - the owner role
- Rate limits are 180 requests per minute and 30 mutations per minute per admin, stored in the Studio store.
- Destructive actions (delete account, delete family) re-verify the admin's password. The scrypt parameters (N=131072, r=8, p=1) are identical to sign-in. `accounts.mts` does not export `passwordMatches`, so the same parameters are reimplemented in `verifyPassword`. The lead may later switch this to an exported helper. Failed password attempts are audited with `result:"bad_password"`.
- The API never returns any of the following (each is asserted in tests):
  - password hashes or salts
  - session tokens or keys
  - recovery hashes or codes (except the single response that issues a new code)
  - invite plaintext codes or invite key hashes (the API uses a separate opaque `ref`)
  - push keys, auth values or full endpoints (only the host and last 6 characters are shown)
  - full email addresses (masked as `a•••e@e•••.com`; the owner can "Reveal" with a reason, which is audited)
  - family content
- Audited actions, each recording who, role, what, target, when, reason and result:
  - every mutation
  - every privileged view: account detail, family detail, support view (start and each view), email reveal, export, event-log view, audit-log view
- No user-facing text names the hosting or storage vendor. The health check for the default address only says "Default hosting address".

## Data, storage and concurrency

All Studio data is stored in a new store, `bep-studio` (strong consistency, `ap-southeast-2`):

| Key | Content |
|---|---|
| `events/YYYY-MM-DD/<ms>-<type>-<rand>` | One key per event. |
| `audit/YYYY-MM-DD/<ms>-<action>-<rand>` | One key per audit entry. |
| `settings/platform` | Etag-guarded edit (`editRecord`). |
| `family-flags/<familyId>` | Suspension and per-family limits. |
| `sync/<familyId>` | Write count, conflict count, last write, bytes. |
| `cron/<name>` | Last run of a scheduled job. |
| `cache/overview` | Cached overview, 5-minute TTL. |
| `support/<admin>/<familyId>` | Time-limited support grant. |
| `trash/families/<id>` | Data copy of a deleted family, kept 30 days. |
| `rate/…`, `broadcast/<6h-slot>`, `probe/…` | Rate limits, broadcast throttle, health probe. |

**Why one key per event:** every log entry is a new key written with `onlyIfNew`. Concurrent writers never contend, there are no read-modify-write races, and nothing is ever overwritten, so the log is append-only by construction. Daily JSONL files would need conditional appends, which retry under contention and can lose entries.

**Reading the logs:** keys are listed per day prefix, newest first. The type is encoded in the key, so type filters skip reads. Account and family filters read each record, with a cap of 3000 reads per page.

**Retention:** events are kept 90 days and audit entries about 400 days. Trash is purged after 30 days. Pruning runs on "Recompute now" and on `op=prune`, at most 2000 deletions per run.

**Existing stores are read:**
- `bep-accounts`: `users/`, `sessions/`, `families/`, `invite-lookup/`, `mail-tokens/`
- `bep-family-data`: `households/<id>/state`, `receipt-photo/*`, `push/subscriptions/*`, `push/vapid-keys`, `family-alert/*`
- Optional Price Scout data at `grocery/<id>/observations.json` or `households/<id>/grocery/observations.json`

**Changes Studio makes to existing data:**
- `disabled*` fields and `epoch` on `users/<u>`
- `recoveryHash` on `users/<u>`
- deleting `sessions/*` for a user
- family `members`, `invites` and `invite-lookup`
- deleting a user's push subscriptions after removal
- full household deletion, only on Delete family

**Family data preservation:**
- Delete account is refused when the user is the only owner of any family, including a family with no other members, so family data is never orphaned or lost.
- Delete family keeps a 30-day recoverable copy of the state (photos are not copied) in `trash/`.

Metrics have known limits:
- "Active" and "last seen" are estimated from session start times (expiry minus the 8-hour or 30-day lifetime). Logged-out sessions disappear from this estimate until the login event hook is installed.
- Invite "created" time is estimated as expiry minus 7 days.
- Photo size is sampled from 40 photos per family and extrapolated.
- Device-only usage is deliberately not measured.
- Listing reads every user, session and family. This is fine for hundreds or low thousands. Beyond that, move the scans to a scheduled job.

## Privacy (Australia)

**Default views:**
- Default views are metadata and counts only.
- The support view needs a reason (at least 8 characters), lasts 5–60 minutes, is read-only, and is audited on every view. It shows counts, sizes, sync health, errors, reminder settings and the data *shape* (key names and item counts), never content.
- Export downloads full family content as JSON. It is owner-only, needs a reason, and is audited. Use it only on the family's request or for recovery.

**Before public rollout, address the Privacy Act 1988 (Cth) and the Australian Privacy Principles:**
- **APP 1:** publish a privacy policy (link it in Settings → Public links).
- **APP 5:** give a collection notice at sign-up.
- **APP 6 (use and disclosure):** the support view and export are your access controls; document when staff may use them.
- **APP 11 (security, and deletion when no longer needed):** this covers the retention periods above and the 30-day trash.
- **APP 12/13 (access and correction):** export supports these.
- **Notifiable Data Breaches scheme:** plan for it.

The small-business exemption (turnover under $3M) may not apply if the service handles health information. Allergen or diet notes could count as health information, so get advice. Also publish terms, a support or deletion contact, and an abuse-reporting process.

## Hooks the lead should add after merging

**Status (v1.5, branch `agent-h/studio-hooks`): items 1–14 below are now wired.** Details, adaptations to the current code and test evidence are in [`../studio-hooks/review.md`](../studio-hooks/review.md). Summary:

| # | Hook | Where it landed |
|---|---|---|
| 1 | Disabled accounts rejected in `resolveAccount` (existing sessions stop working) | `src/netlify/lib/accounts.mts` |
| 2 | Disabled accounts blocked at login (403, `error` + `errorEn`, no session issued, `login_failed` event) | `accounts.mts` |
| 3 | Sign-up policy open / closed / invite-only at register (invite must be a real, unexpired invite for that username); `status.signup` + new `status.signupMode` | `accounts.mts`; login page now sends the invitation field with register (`src/frontend/login.ts`, one line) |
| 4 | Events: signup, login, login_failed, family_created, invite_created, invite_accepted, invite_revoked, error | `accounts.mts` |
| 5 | Limits: `maxFamiliesPerAccount` on create-family; per-family `maxMembers` on join (default 20) | `accounts.mts` |
| 6 | Suspended family read-only: 423 on state/photo/alert-send/push-send writes (reads work); also blocks new invites and joins | `src/netlify/functions/family.mts`, `accounts.mts` |
| 7 | `recordSync` on state PUT success and 409 | `family.mts` |
| 8 | `push_send` events (type, reason, accepted, failed, expired) after alert-send, push-send, push-test | `family.mts` |
| 9 | Per-family `maxDevices` on push-subscribe (default 50) | `family.mts`; device listing cap raised to 500 in `push.mts` |
| 10 | `error` event in the family catch block | `family.mts` |
| 11 | Reminder runs (`recordCronRun('reminders')`) | `src/netlify/functions/reminders.mts` (inside `runReminders`) |
| 12 | `sendPushBatch` returns `expired` (404/410) | `src/netlify/lib/push.mts` |
| 13 | Price Scout runs (`recordCronRun('price-scout')`, counts only; outside-window runs not logged) | `src/netlify/functions/grocery-cron.mts` |
| 14 | Public banner, maintenance note, update prompt, feature switches in the app | `src/frontend/platform-banner.ts` (+ 423 toast in `family-features.ts`) |

Original instructions, kept for reference:

(Written before the hooks were wired; the code has since changed, so the snippets were adapted rather than pasted.) Import `{recordEvent,recordSync,recordCronRun,isAccountDisabled,signupPolicy,isFamilySuspended,familyLimits,platformSettings}` from `../lib/studio.mjs` (from `./studio.mjs` inside lib). There is an ESM import cycle between `accounts.mts` and `studio.mts`. It is safe because neither module calls the other at load time. Every hook helper swallows errors.

**`src/netlify/lib/accounts.mts`**

1. **Enforce disabled accounts in `resolveAccount`.** After `if(!account||account.epoch!==session.epoch)return null;` add:
   `if(isAccountDisabled(account))return null;`
2. **Block disabled accounts at login.** Before the final login `return json({account:publicUser(account)},200,…)` add:
   `if(isAccountDisabled(account))fail('Tài khoản đang tạm khóa. Liên hệ hỗ trợ.',403);`
3. **Honour the sign-up policy in `register`.** Replace `if(!signupFn())…` with:
   `const policy=await signupPolicy(getStoreFn,{invite:parseInviteInput(body.invite)});if(!signupFn()||!policy.allowed)fail(policy.reason==='invite-only'?'Đăng ký mới cần mã mời.':'Đăng ký mới đang tắt.',403);`
   In `op==='status'`, use:
   `signup:signupFn()&&(await signupPolicy(getStoreFn)).reason!=='closed'`
4. **Record events:**
   - after a successful register: `await recordEvent(getStoreFn,'signup',{account:name});`
   - login success: `await recordEvent(getStoreFn,'login',{account:name});`
   - login failure (before `fail(…401)`): `await recordEvent(getStoreFn,'login_failed',{});`
   - create-family: `await recordEvent(getStoreFn,'family_created',{account:account.username,family:id});`
   - invite: `await recordEvent(getStoreFn,'invite_created',{account:account.username,family:family.id,targeted:!!target});`
   - join success: `await recordEvent(getStoreFn,'invite_accepted',{account:account.username,family:id});`
   - revoke-invite: `await recordEvent(getStoreFn,'invite_revoked',{account:account.username,family:family.id});`
5. **Enforce limits:**
   - In `create-family`, refuse when the user already owns `(await platformSettings(getStoreFn)).values.maxFamiliesPerAccount` families.
   - In `join`, replace the constant `20` with `(await familyLimits(getStoreFn,id)).maxMembers`, computed before `editRecord`.

**`src/netlify/functions/family.mts`**

6. **Make suspended families read-only.** After the viewer check add:
   `if(!['GET','HEAD'].includes(request.method)&&['state','photo','alert-send','push-send'].includes(op)&&await isFamilySuspended(getStoreFn,accountContext.household.id))return json({error:'Gia đình đang tạm dừng (chỉ xem).'},423);`
7. **Record sync health.** In the `state` PUT handler:
   - on success: `await recordSync(getStoreFn,accountContext.household.id,{bytes:Buffer.byteLength(raw)});`
   - on the 409 branch: `await recordSync(getStoreFn,accountContext.household.id,{conflict:true});`
8. **Record send outcomes.** After `sendPushBatch` in `alert-send`, `push-send` and `push-test`:
   `await recordEvent(getStoreFn,'push_send',{family:accountContext.household.id,type:<type>,reason:result.reason,accepted:result.accepted,failed:result.failed});`
9. **Use the per-family device limit.** In `push-subscribe`, replace `list.length>=50` with:
   `list.length>=(await familyLimits(getStoreFn,accountContext.household.id)).maxDevices`
10. **Record errors.** In the catch block:
    `await recordEvent(getStoreFn,'error',{area:'family',op});`

**`src/netlify/functions/reminders.mts`**

11. **Log reminder runs.** Before `return Response.json(…)`:
    `await recordCronRun(getStore,'reminders',{families:results.length,jobs:results.reduce((n,r)=>n+r.jobs,0),accepted:results.reduce((n,r)=>n+r.accepted,0),failed:results.filter(r=>r.failed).length});`

**`src/netlify/lib/push.mts` (optional)**

12. **Report expired subscriptions.** Have `sendPushBatch` count `expired++` on 404/410 and return it. The `push_send` events then feed the "Subscription expired" bucket.

**Price Scout scheduled job (Agent's new function)**

13. **Log Price Scout runs.**
    `await recordCronRun(getStore,'price-scout',{items,stores});`

**App frontend (public banner, maintenance, minimum edition)**

14. **Show the banner and reload prompt.** In a late startup script (for example `family-features.ts`):
    `fetch('/.netlify/functions/studio?op=banner').then(r=>r.ok?r.json():null).then(b=>{if(!b)return;/* show b.banner[appLanguage==='en'?'en':'vi'] with b.banner.severity when b.banner.audience matches account/device-only mode; show b.maintenance; if b.minAppEdition > family status release, prompt reload */}).catch(()=>{});`
    The response is public, cacheable for 60 seconds, and contains no personal data. It also returns `flags` and `signups` so the app can hide features that are turned off.

## Responsive QA

**Method:**
- Ran Chromium 1243 headless (Playwright 1.64.1, browser viewport simulation; this is not physical hardware testing).
- Used real Studio, accounts and family handlers with in-memory stores and synthetic data: 27 accounts, 8 families, push devices on 4 platforms, urgent-message records, events and reminder runs.
- To reproduce, run `npm run build && node docs/reviews/v1.5/studio/studio-shots.mts`.

**Sizes and states captured:**

| Size | States |
|---|---|
| Mobile 375×812 | VI light, EN dark |
| Narrow phone 320×740 | VI light, reduced motion |
| Tablet 820×1100 | EN light, VI dark |
| Desktop 1280×800 | EN light, VI dark |

**Pages captured:**
- Light themes: overview, accounts, families, family detail, notifications, settings and health.
- Dark themes: overview, families, family detail, settings and health.
- Desktop extras: invites, messages, broadcast, logs, audit, catalog and rollout.
- Narrow phone: account drawer and confirmation modal.

The screenshots are 46 JPEGs, 2.7 MB in total.

**Checked automatically:**
- No horizontal page overflow on any captured page or size (scrollWidth ≤ innerWidth).
- At 320 px, no visible link, button, select or input is shorter than 44 px.
- Keyboard navigation: Enter on a nav link moves focus to the page `<h1>`.
- Esc closes the modal.
- The language toggle switches `<html lang>` and every label.
- The offline state shows "Offline" (Ngoại tuyến).
- With reduced motion, the toast `transition-duration` is 0s.
- Sign-out-everywhere, delete and other dialogs require a reason; delete also requires a password and a typed name.

**Layout fixes made during QA:**
- Tables switch to labelled cards at 900 px and below.
- Sort selects were added because column headers are hidden on cards.
- Small buttons grow to 44 px on touch devices and at 960 px and below.
- Focus is restored to the heading after navigation.
- Source badges no longer stretch.

**Known limits:**
- The two remaining console 404s are the expected probes for a master catalog that is not present.
- Tablet portrait shows the navigation as a horizontally scrolling strip, which scrolls inside its own container, not the page.
- Real push delivery was not exercised; a stub sender was used.
- Email sending was not exercised; it is stubbed in tests.
- The production store's `list()` pagination was not exercised, only the in-memory equivalent.

## Tests

`node tests/studio.test.mjs` is chained into `npm test`. It covers:
- Studio disabled without the environment variable (403 with instructions, no vendor names), and the banner still public.
- 401 when signed out; 403 for non-admins (audited); support role needs the flag and is read-only.
- CSRF missing or wrong and cross-origin rejection; the mutation rate limit returns 429.
- Overview totals; accounts, families, account detail, family detail and messages are redacted (no hashes, tokens, codes, endpoints, raw emails or content).
- Email reveal is audited; the support view needs a reason and returns a summary only.
- Disable revokes sessions and sets the `disabled` flag, and enable clears it.
- Force sign-out invalidates sessions; an issued recovery code works with the existing `recover` flow; the reset link uses the mailer and needs an email.
- Account delete: wrong password returns 401 and is audited; sole owner returns 409; deleting a member leaves the family data intact.
- Families: invite revoke, limits, suspend and unsuspend, export (reason required, no codes), transfer validation, delete (name and password checks, trash copy).
- Push: test send to the admin's own device; broadcast dry run counts only account-linked devices; `SEND` confirmation required.
- Settings: banner save, public `op=banner` with `Cache-Control: public, max-age=60` and expiry; env-over-stored precedence with sources; sign-up policy; `ALLOW_ACCOUNT_SIGNUP=false` maps to closed.
- Hooks and logs: event sanitisation drops token and password keys; `recordSync` and `recordCronRun` feed family health, notifications and system health; audit entries exist for every action with who and when; audit filters by family.
