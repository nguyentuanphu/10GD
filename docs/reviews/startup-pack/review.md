# Authenticated startup, stable login tabs and verified-email recovery

Branch: `fix/authenticated-startup-timeout`, based on production `a471927`. This is a new release and has not been pushed or deployed.

## Observed failure and reproduction

The owner reported a fresh-browser personal login followed by a `seed.js` timeout. The deployed loader made 25 sequential script requests; each can invoke the account gate and, when controlled, the service worker's additional session request. Those requests had no deadline in the worker/gate. The recovery sign-in link targeted `/login`, where a still-authenticated session redirected straight back to the app. A previous build only rendered an error rather than removing these failure paths.

The new browser integration test serves real application files through the actual gate, account and family handlers backed by synthetic stores. It preserves the deployed bootstrap as a fixture, stalls `seed.js`, reproduces its timeout and proves the old sign-in redirect loop. This establishes the request/failure mechanism; it does not prove the exact upstream Netlify latency in the owner's Safari session. No live account credentials or family records were used.

## Changes

- Generate one authenticated `startup-scripts.json` download, validate the allowlist and execute classic scripts separately in their original order. No `eval`/`new Function`; existing shared lexical globals and overrides remain intact. Current deployment has no CSP restriction on inline script execution; a future CSP must support this mode explicitly.
- Bound Edge account checks and service-worker requests to 8 seconds and startup-pack download to 30 seconds. Worker cache installation is bounded and can activate with partial assets; offline readiness still requires the complete asset set and a valid signed grant. Cache the pack instead of 25 separate scripts.
- Show loading feedback; recovery removes stale modal backdrops. Both buttons retire only the root app worker and retain caches, localStorage and IndexedDB. Retry makes a fresh navigation; sign-in uses `locked=1` to stop the redirect loop. New recovery controls are at least 48px tall.
- Remove the old shared-password login, HMAC session module, migration UI/endpoints, old weather authorization and root-store reminder scheduling. Existing stored records are not deleted. Backend tests now authenticate real synthetic individual accounts rather than depending on the retired shared-password path.
- Login is the default and only two main tabs remain. A fixed top anchor and reserved form rows keep the card and shared controls in place across login/register/reset modes. Values persist between tabs; hidden fields cannot block login validation. Login client is authored and strictly checked in TypeScript, compiled and safely embedded in login HTML so an older worker cannot block an external login script.
- Add verified-email binding and password recovery using Resend, without adding 2FA. Registration requests email verification; existing accounts can bind an address with their current password. Missing sender configuration is reported honestly; backup recovery codes are retained.

## Security and storage

Passwords remain salted scrypt hashes (16 random salt bytes; N=131072, r=8, p=1, 64-byte result). The `bep-accounts` private Netlify Blobs store holds account records, email/pending email and verified status, session hashes and hashed mail tokens. No plaintext password is saved or emailed. Opaque session cookies use HttpOnly/Secure/SameSite=Strict and server expiration of 8 hours or 30 days when trusted. Each API resolves current membership before household storage access.

Mail links use 32 random bytes; only SHA-256 token digests are stored. Verification expires after 24 hours, reset after 15 minutes. Token consumption uses conditional writes. A reset rotates the password salt/hash, account epoch and backup recovery code; previous server sessions and older reset links fail. A disconnected device cannot learn server revocation until reconnecting, and previously signed offline access retains its documented expiry behavior.

Only verified email can receive a reset. Responses avoid directly revealing whether a named account has a verified address. Per-IP and per-account throttles limit requests; cross-origin mutations are rejected. Sender credentials are backend-only. Resend receives the destination address and reset/verification link to deliver the message. This is not end-to-end encrypted storage, a penetration test, or a claim of perfect security.

## Validation

- Build, strict bootstrap/login-client/mail-service type checks, asset checks and ESM execution of Edge entries.
- Existing 11 suites: state/calculations, spending, backend, units, push (mocked), products/insights, family menus, account/access/calendar, personal and offline behavior.
- Email suite: verified-address requirement, generic responses, hashed token storage, expiry/reuse/stale rejection, concurrent consumption, password replacement, session revocation and rotated backup codes; existing-account email binding; Resend payload/HTTPS origin; missing configuration and provider failure. All mail mocked.
- Browser regression: normal and failed startup at 375×812, 820×1100 and 1280×800.
- Authentication layout: exact document coordinates and dimensions of card/common controls across login/register/reset at 320×740, 375×812, 820×1100 and 1280×800. Input retention, hidden-field validation, horizontal overflow, navigation/modals and VI/EN/online/offline state are exercised. Screenshot evidence is stored beside this file.
- Actual gate/handlers with an active browser service worker: authenticated reload, signed offline launch, absence of individual `seed.js` requests, modal cleanup, and clicks on both recovery actions while an old worker is stalled. Registration→email verification→email reset runs against real handlers with a mock mail transport.

Limits: Chromium viewport simulation, not physical iPhone/Safari testing. WebKit remains unavailable because the host lacks required system libraries and sudo. No live email has been sent; Resend API key and verified sender remain external prerequisites. Legacy dynamic modules still use the previously documented noCheck migration configuration; strict checking is not yet project-wide.

Final validation also passed `npm run test:all`. A fresh archive of the staged source (without generated JavaScript), using the locked installed dependencies, passed build/type checks and the default 12-suite command under Node 22. The working checkout also passed both browser suites. Email transport remained mocked throughout.

## Publication

No production update or main push is authorized for this expanded release yet. The earlier Deploy approval covered the previous release only, as specified by AGENTS.md. Review this exact implementation and complete the Resend configuration before enabling real email delivery.
