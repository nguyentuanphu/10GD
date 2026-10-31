# Combined release deployment approval — 31 October 2026, Australia/Sydney

Henry authorised deployment of the completed combined review: “Sắp xong chưa? Nếu mọi thứ ok thì có thể deploy”. This is approval for reviewed local commit a2c52fe (including 657720d), conditional on final checks passing. It does not approve later releases.

The reviewed scope includes individual accounts/households and migration, onboarding, AUD/VND and Vietnam/Sydney time zones, voice drafts, contextual greetings, calendar/urgent messages, offline persistence/access, network indicators and one-tap language switching. AGENTS.md requires responsive evidence and retains the explicit release gate.

Final pre-deployment validation: application/manifest/offline-asset checks; eleven test suites; clean working tree before this approval record; mobile/tablet/PC review documented in combined-family-accounts-offline-20261031.md. Browser viewport simulation is not physical phone/tablet testing. Mic, OS push, airplane-mode installation and Netlify runtime checks remain deployment follow-up; no real family messages are to be sent during verification.

Production target is the existing Netlify site 10gd.netlify.app via the existing GitHub main integration. Preserve existing data and environment values. Publish through a feature PR with expected-head merge, and verify actual Netlify runtime independently from GitHub Pages/Actions. No password, private key or session token belongs in source or release logs.
