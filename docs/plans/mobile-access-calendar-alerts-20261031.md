# Mobile access, calendar and alerts — review release

Status: implemented for local review. No owner Deploy approval for this release. No production or main updates performed.

Scope: shorter mobile labels/system font, bell/cart icons; Netlify Edge site gate using environment-only password; ordinary 8-hour session and optional 30-day trusted cookie; monthly per-member/per-meal availability with optional deductions and prior-day reminders; persisted urgent family messages with opt-in push, read acknowledgements and manual SMS/share.

Data: existing recipes, menus and spending retained. Availability is additive to the shared state. Cooked and manually fixed portions are preserved. Announcements have separate Blobs records and conflict-safe updates, so concurrent state sync cannot erase messages. Device-selected family names share one authentication credential.

Validation: eight automated test suites, syntax/asset checks and diff checks. Browser review at 375px content width confirmed one-line controls and no horizontal overflow. Dad away dinner on 2 November changed dinner from 3.15 to 2.15 portions, leaving breakfast at 3.15. Calendar controls, urgent form and trusted-login screen reviewed. Local preview refuses actual urgent sending and preserves the draft. Push transport is mocked; no real family messages or SMS sent.

Limitations: requires approved Netlify deployment to enable production lock. Existing Netlify environment value was neither inspected nor changed. Edge hosting behavior, physical-device push/SMS and OS sound/Focus behavior need post-deploy verification. Full-site access requires online session validation. Calendar reminders obey quiet hours, subscription filters and automatic daily cap; delivery is not guaranteed. SMS opens a composer, not an automatic gateway. GitHub Pages is not a protected Netlify host and the bootstrap fails closed there.

Release gate: AGENTS.md applies. Keep feature branch local until the owner explicitly says Deploy for this reviewed release.
