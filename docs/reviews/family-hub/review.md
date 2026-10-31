# Family hub, invitations and device connection

31 October 2026. Local feature branch `fix/family-invites-and-navigation`. This revision has no production-release approval.

## Problem and resulting behavior

A new account session stored no selected household. The family list could therefore show an owner membership while the active context remained empty; owner invitation controls and family synchronization depended on that active context. Resolution now restores a remembered selection only with current membership, or selects the sole family. Multiple memberships with no remembered selection require an explicit choice. A removed selection does not silently select another family. Selecting, creating or joining a family remembers the choice across devices. The family dialog reloads the correct workspace before loading shared data. A newly empty shared workspace is initialized with a conditional write; device-only data remains separate.

Owners now have a direct **Mời người nhà** button beside the main kitchen/voice controls and in the family dialog. Invitations no longer require the recipient to create an account beforehand. Owners choose editor/viewer permissions, optionally restrict a username, and create a single-use code expiring in seven days. Only its hash is stored. Existing targeted invitations retain their restrictions. The server still enforces ownership, membership, expiry, atomic consumption and family capacity.

Email and SMS links open composition apps; Messenger uses the device share sheet, with copy/open fallback when sharing is unavailable. The user chooses a recipient and confirms sending. This implementation does not send messages automatically. A shared link pre-fills the invitation, opens registration, and joins after successful registration/login. Failed joining preserves the code and an independently created account/recovery code.

## Interface

- Product labels use **Đồng bộ gia đình**, **Đã kết nối** and similar plain wording. The persistent wording rule is recorded in AGENTS.md. Required technical imports, API paths and configuration remain internal.
- Larger **Bếp của tôi** and **Nhập bằng lời nói** controls sit together with animated color borders. Reduced motion disables the animation; focus and touch targets remain visible.
- The account dialog puts family selection/invitations before collapsed account/email settings.
- Shopping Notes and Products & prices share one aligned row. Notification recipient/device-name fields share matching heights and alignment.
- A generated transparent bowl/home/heart mark replaces the clover across headers, sign-in, app icon and push icon. Existing family-authored recipes/data are preserved.

## Verification

`npm run test:all` covers build/static checks, configured strict TypeScript checks, the existing core/backend/auth/offline suites, and both browser suites. Legacy source modules still use their existing `noCheck` configuration; this is not a claim of project-wide strict typing.

New account tests exercise old-session repair, fresh-device restoration, remembered selection, ambiguous and revoked contexts, invitations created before signup, single-use consumption, expiry and owner permissions. Existing tests cover household isolation, targeted invitations and concurrent acceptance.

Browser tests use real local account handlers and isolated in-memory storage. They exercise owner invitation creation, email/SMS composition links, a mocked native share call, registration from an invitation link, joining with editor permissions, and a second fresh browser signing into the owner account and loading the same selected family and shared budget. No personal account or production family data is used.

Responsive evidence covers narrow phone **320×740**, phone **375×812**, tablet **820×1100**, desktop **1280×800**. At every size the tests exercise the kitchen controls, shopping actions, notification settings and language switching; check overflow and aligned field/button geometry; and verify reduced motion. Login/register/recovery layouts retain stable geometry and form input. Guest offline use, stale-worker recovery and timeout recovery are also covered. Screenshots are stored in this directory: `*-family-actions.png`, `*-shopping-actions.png`, `*-notifications.png`, `*-invitation.png`, `*-family-dialog.png`, `*-login.png`, `*-register.png`, and `owner-invitation.png`.

These are browser viewport simulations. Physical iPhone/Android speech, native share-app selection, actual email/SMS/Messenger delivery and real push delivery have not been tested. No real messages were sent. Deployment remains subject to a new explicit Deploy instruction under AGENTS.md rules 1–5 and 10.
