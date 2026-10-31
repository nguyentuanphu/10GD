# Public device tools and optional family accounts

This revision supersedes the mandatory entry/account and sign-up email-verification behavior in `d698f5f`. It remains on `fix/authenticated-startup-timeout`; nothing in this revision has been pushed or deployed.

## Product access

Anyone can open the site and use device-only meal planning, recipes, portions/local attendance, pantry, shopping, manual receipts/photos/spending, insights/products, voice input, Notes import, JSON export/import, cooking timers, city weather and the phone share menu. Network/device/browser capabilities still apply to OCR, voice, weather and external websites; they do not require an application account.

An individual account is needed to create/join a shared family, invite/connect/manage members and roles, sync that family workspace across devices, store its data/photos in the cloud and deliver server-based family reminders or urgent messages. A family workspace can have one person; invitations are optional. Merely creating an account does not upload device-only work automatically.

Guest work uses the `guest/` storage scope and its own photo database. Signing up or logging in without a selected family continues using that same device workspace. Selecting a family uses its separate `account/<household-id>/` scope and server membership checks. Guest data is retained and can be revisited with Use device-only; no automatic merge or overwrite is performed. Manual backups remain available without an account.

## Implementation

- Edge serves the static application and login page publicly without calling the account service per asset. Account/family endpoints enforce live sessions, membership and roles independently. The weather endpoint only serves cached allowlisted city weather and is public.
- New visitors start device mode without waiting for an account API. Login/register records account intent and requests profile connection explicitly. Existing signed offline identity or account intent is rechecked when available; expired/absent identity falls back to guest tools.
- The existing single startup source pack, loading feedback, bounded downloads, reliable recovery buttons and fixed login/register layout are retained. Accounts without a household are no longer forced onto a family-creation landing screen. Family creation/join is an optional modal.
- Public offline shell/assets are cached independently of account identity. Offline-readiness reporting for a selected family additionally checks its signed identity; guest readiness only needs public assets. Private API responses and receipt photos never enter that cache. A valid signed identity is still required to select a cached account/family workspace offline; otherwise the client uses guest scope. Logout clears private identity and opens device mode, preserving guest work and the public shell.
- Account creation does not require an email and sends no verification message. The verification endpoint is retired. An optional recovery email can be saved with the current password; no verification mail is sent when it is saved. Password reset requires opening the random, expiring, one-use link sent to that address. This is the proof for the reset, not an extra sign-up step or 2FA. Password/session hashing, reset expiry, atomic consumption and epoch-based session revocation are retained.

## Validation

`npm run test:all` passed: build, strict checks of bootstrap/login/mail-service, 12 unit suites and both browser suites.

Browser integration serves actual files through the real gate and account/family handlers with synthetic stores and mocked mail. It proves anonymous guest edits persist after reload/offline use on mobile 375×812, tablet 820×1100 and desktop 1280×800, without private family reads/writes; account creation with no email retains guest work; anonymous family API reads/writes still return 401; optional reset email works with a mock transport; creating a family and switching back preserves guest work; both recovery actions navigate correctly. Login/register/reset coordinate stability is checked at 320×740 as well as the three larger sizes. Screenshot evidence is in this directory.

Scope limits: Chromium viewport simulation, not physical Safari/iPhone testing; no real email was sent. Resend credentials and a verified sending domain are still needed only for real reset-email delivery, never for visiting the website or creating an account. The existing legacy TypeScript migration still does not claim project-wide strict checking.

## Review/deployment

The previous Deploy approval applied to an earlier release. This changed revision requires its own approval under AGENTS.md before a main push or production deployment. Expected post-deploy checks: anonymous `/` returns the usable app, `/login` shows optional account forms, and unauthenticated private family reads/writes remain blocked. Backend release marker: `20261031-public-device`.

Final focused browser validation also covers canonical same-origin login return URLs and deterministic timeout reproduction after the stalled request is actually pending. No live messages were sent.
