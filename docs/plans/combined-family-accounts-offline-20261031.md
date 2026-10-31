# Combined family release — 31 October 2026 (Sydney)

Owner approved continuing the discussed implementation, including the later requirement to work offline. No Deploy approval exists for this release. This extends local commit 657720d; main/production remain unchanged.

Implemented: username accounts/recovery/session lifecycle; household membership and roles; targeted expiring invitations; isolated state/photos/push/announcements/device caches; explicit legacy migration with backup and no overwrite; five-step onboarding and household cooking routines; AUD/VND price/history separation; Vietnam/Sydney time zones; typed/browser voice preview and guarded undo; contextual greetings and optional city weather; task assignments, portion feedback and quick pantry suggestions; signed offline launch and conditional reconnect synchronization.

The owner's offline request supersedes the previous review's online-only launch rule. Core operations work from downloaded data with an unexpired signed offline grant. New login and external/server operations explain network requirements. Trusted offline access lasts up to 30 days; a normal 8-hour session requires the same browser session to reopen offline. Logout clears local access even without internet; administrator revocation is discovered when the device reconnects. No claim of immediate remote revocation while offline or encrypted device storage.

Preservation: the legacy family store/cache remains separate. Existing kitchens are not forced through setup. Migration requires legacy authentication and an account-owned empty family, source revision match, backup, and explicit confirmation. Photos are copied; push registrations are re-enabled explicitly. Existing records/meal history remain when routines/preferences change.

Evidence: test suites cover account isolation (state/photo/push), scrypt/recovery, roles and revoked recipients, one-use/concurrent invitations, legacy migration and photos, currency separation, voice parsing, exclusions, onboarding schedule, actual SW offline fetch and signed grant checks, pending edits across unload, same-revision reconnect and concurrent conflict preservation. UI review: Vietnamese/English, five walkthrough steps/first-week preview, VND 1,500,000 budget, three-item Vietnamese voice draft/confirmation/undo, no horizontal overflow, offline-mode shopping edit survives reload/tick, 65,000 VND manual receipt records actual spending and leaves 1,435,000 budget. No live family messages sent.

Verification limits: browser offline UI was exercised with the app's offline state in a local fixture; network failure and SW fallback are exercised by tests. Local server does not run a live Netlify deployment. Physical iPhone microphone, OS push, installation/airplane-mode, Netlify Edge deployment and real weather egress remain to be verified after an approved release. Email verification/reset and SMS gateway are not connected. All temporary QA HTML must be excluded from release.

Release gate: local branch only until Henry explicitly says Deploy for this combined reviewed version. No source push, PR merge or production deployment has been performed in this work.

## Mandatory responsive QA applied to this release

AGENTS.md now requires mobile/tablet/PC review and screenshot evidence for every UI release, with reduced-motion support and the separate Deploy gate retained.

| View | Browser viewport | Findings / verification |
| --- | --- | --- |
| Mobile | 375×828 iframe (360px content after scrollbar) | Online icon animation; direct VI↔EN button activation; compact header and fixed bottom tabs; short day labels; body scrollWidth equals clientWidth. |
| Tablet | 820×1100 iframe (805px content after scrollbar) | Offline icon animation and banner; sidebar/menu and settings modal; language button keyboard activation; short day labels stacked with date; no day overflow and no body horizontal overflow. |
| PC | 1363×936 browser | Online status; direct pointer activation of VI↔EN; sidebar and settings modal; short days; body scrollWidth equals clientWidth (1348px). |

The tall tablet iframe caused pointer-coordinate/protocol limitations in the browser automation. DOM hit-target checks showed the button unobstructed; keyboard activation verified the behavior there. This is viewport simulation, not a physical tablet touch test.

Saved review images: bep-mobile-final-1793411780398.jpg; bep-tablet-final-1793411827172.jpg; bep-pc-final-1793411837599.jpg. Earlier offline spending proof: bep-offline-review-final-1793411281996.jpg. Animated status follows prefers-reduced-motion; it is shown with text and a different icon, not color alone.
