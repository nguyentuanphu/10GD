# Login blank-screen investigation and TypeScript migration

Base: `49bd566`, branch `fix/login-typescript`. No production deployment, main update or family-data modification.

## Finding and limits

The supplied screenshot shows the static HTML header/footer with an empty `#main`. The original bootstrap only handles script network errors; script runtime errors still fire `load` and the loader proceeds. There is no script/status timeout and `#main` has no fallback. Session revalidation also hides the entire document until a network request finishes. Browser regression tests inject a runtime error into `app.js` with the old bootstrap and reproduce the empty shell. This proves a failure mechanism, **not the exact exception in the owner's Safari session**. The live site redirects anonymous requests to login; no production credentials were requested or used. A normal synthetic account and legacy startup both work in Chromium.

## Change

Strictly typed startup now detects synchronous script execution errors, enforces 15-second request/script timeouts, checks that main content rendered and shows a bilingual retry/sign-in message instead of leaving an empty shell. It preserves device storage, authentication gates and household separation. Session revalidation keeps content visible while waiting. The service worker cache version changes so a future approved deployment can populate a fresh app cache; no family localStorage or IndexedDB is cleared.

All first-party application/backend/test/tooling files are authored under `src` in TypeScript; generated JS preserves existing runtime paths. This is a source-language migration, not full static typing: only bootstrap currently has strict type checking. Legacy code uses `noCheck` pending explicit domain types/module boundaries. Browser/Netlify output must still be JavaScript.

## Validation

Build, strict bootstrap type check, offline asset validation and the 11 existing test suites pass. The offline fixture now reads the running worker's CACHE constant instead of a hardcoded cache version; function extraction accommodates compiler whitespace. Assertions remain intact.

Browser review evidence: mobile 375×812, tablet 820×1100, desktop 1280×800; normal account content and recovery screen screenshots are stored beside this file. Synthetic API responses isolate these checks from live accounts/family records. Browser viewport simulation is not physical iPhone/Safari QA. Live backend login, real phone offline reopening and push delivery remain unverified. No release should claim those checks passed.

Browser checks also exercise VI→EN→VI switching, simulated offline/online state, absence of horizontal overflow, and script timeout recovery. Reduced motion is enabled. Touch controls on the new recovery screen reuse the existing button styles. The source-only build was independently reproduced in `/tmp/10gd-clean-validation` with the installed locked dependencies and all 11 test suites passed.

WebKit testing was attempted, but the browser cannot launch because this worker lacks libgtk-4, libgraphene, libharfbuzz-icu, libmanette, libhyphen and libGLESv2. The worker is non-root and has no sudo. No WebKit, physical Safari or physical-phone pass is claimed. An optional WebKit run on a host with those libraries is `QA_BROWSER=webkit npm run test:browser`.

## Project map

- `src/frontend`: ordered browser scripts for seed/reference recipes, calculation rules, multi-dish family menus, portions/attendance, shopping/pantry, receipts/spending, insights/products, bilingual UI, accounts/onboarding and offline access; `sw.ts` implements authenticated caching, Notes share intake and push display.
- `src/netlify/functions`: family state/photos/push/announcements, account operations, reminder scheduling and weather endpoint.
- `src/netlify/lib`: password/session hashing, live household membership/scoping, signed offline grants, login HTML, push routing/limits, announcement persistence and weather caching. Edge gate protects pages/assets.
- `src/tests`: calculation, backend/auth/isolation, planning, voice/currencies and real service-worker logic under synthetic transports, plus startup browser regressions.
- `src/scripts`: reproducible compiler-output copy and script/offline-artifact checks. HTML/CSS, image assets and existing deployment paths remain in place.
