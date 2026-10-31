# Bếp Gia Đình · v1.4

Family meal planning, shopping and receipts, built with HTML/CSS, TypeScript sources and a Netlify backend. JavaScript files in deployment directories are generated build outputs.

## What is included

- Saved retailer products with manually confirmed/receipt/CSV prices, branch, pack size, barcode and checked date. Search links to Coles, Woolworths and Chemist Warehouse; adding a product updates the family list, not a retailer account/cart. Live retailer catalog APIs are not connected.
- Cooking insights count only meals marked Cooked, exclude future dates, and update on undo. Repeat intervals, likes and paused suggestions affect recommendations and weekly generation.
- Vietnamese/English core interface, product and insights workflows, and push settings. Device-local language does not translate or replace user content or original Vietnamese recipe instructions.
- Mobile navigation keeps Today / Weekly Menu / Shopping and moves secondary tools into More.

- **Simple screens by default** for Today, Weekly Planner and Shopping, with a remembered Full view per device. Shopping uses 18px item names on phones, 44–48px checkbox touch targets, collapsible tools and an optional remaining-items filter.
- **740 reference recipes**, including 40 additional vegetarian dishes, 35 seed/grain/legume salads and 25 dressings. Each entry has quantities, preparation, steps and matching artwork; dressings are separate from automatically planned meals.
- Multi-dish family meals, individual dish replacement, portion scales, per-person attendance and optional rice. Weekend soup selector and weekday meal suggestions respect configured constraints and meal locks.
- Purchase quantity wheel with g/kg, ml/litres, pieces, slices, bunches, packs, boxes, trays, bags, bottles and custom unit names. Remember a preferred buying unit, size estimate, price and note per ingredient.
- Pantry tracks measured quantities and unweighed counts separately. Unknown weights never silently become grams. Budget estimates identify unknown prices.
- Stores with user-entered branch addresses, remembered ingredient/store choices, and shopping views by aisle or store.
- Phone Notes imports with preview, image receipt OCR, manual ingredient matching, weekly spending and unit-price history. Price per bunch is compared with bunches, not kilograms.
- Immediate **“Nhờ mua thêm”** requests containing item, quantity, store/address, sender and note. Requests remain in the shopping list even if push is unavailable.
- Authenticated Netlify Blobs family storage, receipt images and conflict detection; Web Push device registration and scheduled reminders.

## Deploy to Netlify

Build command: `npm run check`; publish directory: `dist`; Functions: `netlify/functions`. The build generates application JavaScript and the authenticated startup source pack from TypeScript. Deploy the full site with Functions and Edge, not `dist` alone.

The site is public: device-only tools require no account. Use individual accounts only to create or join a cloud/family workspace, sync across devices or connect members. Shared family-password login and legacy migration have been retired; `FAMILY_PASSWORD` is ignored. Existing stored records are retained.

For optional password-reset email, follow [Resend setup](docs/RESEND-SETUP.md): configure `RESEND_API_KEY`, `AUTH_EMAIL_FROM` and production `AUTH_PUBLIC_URL` in Netlify. A verified sender is required for real delivery. No sign-up verification or second factor is required; recovery email is optional.

## Run checks

```sh
npm ci
npm run check  # builds TypeScript, checks scripts and offline assets
npm test
npx playwright install chromium
npm run test:browser
```

Tests cover meal quantities, inventory and undo, recipe variants, remembered sale units, unknown weights/prices, store preferences, weekday ranking, receipt matching/prices, authentication, conditional writes, push recipients, Sydney daylight saving and reminder deduplication. Push transport is mocked in tests; delivery to real phones must be verified after Netlify deployment.

## Data and behavior

After one successful online sign-in and complete app download, cached pages and device data work offline with a signed, unexpired offline grant. The app reports offline readiness in My kitchen. A normal session lasts up to 8 hours and requires the same browser session for offline reopening; explicitly trusted devices can reopen for up to 30 days. Known online sign-out or membership changes override cached access. Changes made by an administrator cannot be discovered while the device has no network. Localhost and the internal terminal.local review server allow local development. Cloud synchronization uses a shared family password and detects overlapping edits rather than silently overwriting them. Metadata backups are JSON; receipt photos are separate.

Suggested portions, recipe times and sample prices are editable. Quick noodle/porridge times assume the prepared broth or cooked ingredients stated in the recipe. A weight estimate per bunch/piece is explicitly approximate. A receipt may record actual cost per sale unit without knowing its gram weight.

Scheduled Functions check due reminders every 15 minutes. Roles and selected recipients filter delivery; each device chooses notification language, quiet hours and whether urgent requests can bypass quiet hours. Two automatic sends per device/day are enforced with conditional slot claims. Direct requests are normal by default; urgent requires an explicit choice. Ignored or capped notifications are not queued. Notification display, timing and sound depend on browser/OS permission, connectivity and Focus settings. No background push is claimed before a device has successfully registered.

## Artwork

The built-in catalog has 106 ingredient illustrations and 740 recipe-specific illustrations, explicitly mapped to the matching ingredient IDs and recipe signatures. The existing gouache artwork is extended with companion sheets; all built-in recipes have painted artwork. Family-authored or edited recipes retain an ingredient-led fallback. See [ARTWORK.md](ARTWORK.md) and [the audit and review](docs/reviews/artwork/review.md). Illustrations are not exact recipe photographs, and family data is preserved.

## Family-authored menu

The family planner uses categorised family-authored recipes. The reference catalog remains available separately. Mon–Thu breakfast/dinner, Friday night, Saturday breakfast/lunch and the five-meal weekend batch have explicit rules; the batch includes next Monday breakfast. Recipe quantities support a custom original yield, unknown-quantity lines are preserved, and new ingredients can be entered with their own units. New ingredient prices remain unknown rather than guessed.

Batch cooking deducts pantry once; subsequent meals record portions served. Undoing batch cooking is blocked until served meals are undone. Recorded batch cooks and served meals are counted separately. Existing menus, recipes and historical records are retained; regeneration previews changes and respects cooked/locked meals.

See `AGENTS.md`: each release requires explicit owner DEPLOY approval before updating main or production. The owner approved the previous family-menu release on 31 October 2026. The mobile/access/calendar/alerts changes are a new review-only release and have no deploy approval.


## Mobile access, availability and urgent messages (review release)

- Short mobile actions (Chia sẻ / Tạo tuần / Thực đơn), system font for Vietnamese and SVG bell/cart icons. Touch targets remain generous.
- Netlify Edge protects pages and private assets. The shared password is read only from FAMILY_PASSWORD; it is never embedded in browser code. Legacy family login uses an 8-hour server session and a session cookie. Explicit trusted-browser login uses a 30-day HttpOnly/Secure/SameSite cookie. Logout clears the cookie and private service-worker caches. Failed logins are limited to eight attempts per 15-minute IP window (best-effort shared counter).
- Monthly availability supports member, multiple dates, breakfast/lunch/dinner, away/busy, note, optional deduction and optional reminder. Automatic portions deduct only affected meals. Manually fixed/cooked portions remain fixed and show a reason; undo restores automatic behavior. Existing cooked portions are frozen before availability changes. A meal attendance override clears that occurrence's calendar deduction.
- Availability reminders run at 19:00 Australia/Sydney the day before, subject to each device's calendar subscription, quiet hours and the existing two automatic reminders/day cap.
- Homepage urgent messages persist separately in Blobs with conflict-safe updates and per-name read acknowledgements. Push acceptance is not a read receipt. Names are selected within the shared-password family, not separately authenticated accounts. SMS opens the device composer; the user chooses recipients and sends. No SMS gateway is connected.
- Tests use synthetic passwords and mock push transport. Production Edge behavior, existing Netlify environment configuration, physical phone delivery and airplane-mode installation still require verification after an approved deployment. No real family messages were sent during QA.


## Combined accounts / setup / currency / voice / offline release

Status: local review only. This includes the previous mobile/calendar/urgent-message commit and does not have owner Deploy approval.

- Accounts use a username, display name, scrypt password hash (random salt, N=131072/r=8/p=1) and a one-time recovery code. Email, email verification and email reset are not connected. Recovery rotates the code and invalidates existing account sessions. Opaque random session tokens are stored only as hashes, in HttpOnly/Secure/SameSite cookies with server expiry (8 hours or explicitly trusted 30 days). Signup can be disabled with ALLOW_ACCOUNT_SIGNUP=false.
- Each account creates or joins a household. Targeted invitations are single-use, seven-day codes; owners can revoke invitations and manage editor/viewer access. Every API read/write resolves live membership before choosing a household storage prefix. Photos, state, push keys, announcements and device browser caches are scoped by household. Viewers cannot write family state. Push ignores removed/unlinked account recipients; a browser uses one active household push subscription at a time and must enable it again after switching.
- New families use a saveable five-step walkthrough: people/portions; meals/days; exclusions/allergy notes; currency/time zone/budget/time; cooking routine/favourites and first-week preview. Only explicitly selected reference recipes become family recipes. New kitchens start without sample pantry stock. Existing kitchens retain their recipes, records and planned meals when preferences change.
- Migration requires both a signed-in account that owns an empty destination family and legacy family authentication. Preview one source, download its JSON backup, then confirm. Server migration copies a reviewed snapshot and available receipt photos, retains the source and a server backup, checks the source revision, and refuses overwrites. Local migration can include legacy IndexedDB photos by explicit choice. Push registrations are not copied; enable them again. Conflicting sources are not silently merged.
- Each receipt/product/purchase-price record retains its currency. AUD and VND have separate budgets and explicit price profiles; actual receipt prices can inform estimates only in the same currency and with known quantities. No exchange rates are guessed. VND unknown prices remain unknown. Price history compares matching units/store/currency. Vietnam and Sydney household time zones are supported.
- Voice input uses the browser SpeechRecognition API only after Start mic. It may send audio to the browser/OS recognition service; app audio is not stored. Browser recognition needs internet in this implementation. Typed text and OS keyboard dictation are alternatives. VI/EN amount parsing, known recipe matching, unclear quantities and duplicates lead to an editable preview. Only confirmation adds items/dishes, with a guarded undo. Unknown recipes never receive invented ingredients.
- Personal greetings use account/member name, local household time and planned meals. Optional city weather uses Open-Meteo (Sydney/Hanoi/Ho Chi Minh City), without GPS; only fresh weather is used. A manual hot/cool marker is clearly identified as user input. Busy-today suggestions use saved quick recipes and pantry stock. Assignments and portion feedback are recorded without silently changing portions.

### Offline behavior

Meal plans, family recipes, portions, monthly availability, pantry, shopping ticks/quantities, Notes text import, manual receipts/photos and statistics work on already-downloaded device data. Device edits are persisted and retain a pending-sync marker across closing/reopening. When the server revision is unchanged, reconnect uploads normally with a conditional write; concurrent changes stop for review. Export/restore remains local.

Registration, fresh login/recovery, invitations, live sync, new push subscriptions/test/sending/receipt acknowledgement, urgent delivery, browser speech recognition, fetching weather and retailer/Messenger websites need internet and report that at use. Previously fetched weather expires instead of pretending to be current. Offline receipt photos can be saved and entered manually; OCR model loading needs internet. Push cannot be delivered to a disconnected phone, and the app does not promise background scheduled local notifications.

Offline grants are signed with an ECDSA server key held in private Blobs storage, contain no password/private key, and expire with the authenticated session. Offline cache access rejects expired/tampered grants. Logout clears device grants/private caches even offline and requires explicit sign-in on that browser before reopening. Browser storage is device storage, not encrypted account vault storage: use trusted personal devices and keep backups.

Tests include household isolation, recovery/revocation, concurrent invite acceptance, migration/photo copying without overwrite, currency separation, voice parsing, actual service-worker offline fetch logic, offline edit persistence and reconnect conflict handling. All network transport in tests is mocked; no family notifications/SMS were sent. Browser evidence covers the walkthrough, VI/EN UI, voice preview/confirm/undo and offline-mode shopping/manual VND spending. Physical iPhone mic/push/airplane-mode verification is pending an approved Netlify release.

The header now shows an animated, labelled Online/Offline icon and a direct VI↔EN language button. Motion respects prefers-reduced-motion. AGENTS.md requires mobile/tablet/PC review and saved evidence for every UI release. This review checked 375×828, 820×1100 and 1363×936 browser viewports and corrected overlapping English day labels. Simulated tablet pointer automation had a coordinate limitation; keyboard activation and DOM hit-target checks were used there. Physical device testing is not claimed.

## TypeScript development

Edit only `src/frontend/*.ts`, `src/netlify/**/*.mts` (and Edge `.ts`), `src/tests/*.{cts,mts}` and `src/scripts/*.cts` for application, test and tooling code. HTML/CSS, artwork and recipe data are retained. `npm run build` generates the public JS in `dist`, backend JS in `netlify`, and executable tests/scripts; these outputs are ignored by Git. The compiler does not bundle the legacy browser scripts: global scope and load order remain compatible with the application and service worker. Netlify's existing `npm run check` command performs this build before publication. Run the build before running tests or a static local server.

`npm run typecheck` strictly checks the new startup entry point. **The migration is not a claim of full-project type safety:** legacy dynamic globals, backend, tests and tooling are currently transpiled with `noCheck` in the other configurations. They need explicit domain types and module boundaries before full type checking can be enabled. No `any` annotations or disabled test assertions were added to hide type errors.

For local development after `npm run build`, serve `dist` with `python3 -m http.server 8000 --bind 127.0.0.1 --directory dist`. Backend integration tests use synthetic storage and mock transports. The browser startup regression test uses an intercepted synthetic origin and never signs into the live site or sends real family notifications.

### Startup transport

The build generates `dist/startup-scripts.json` from the startup allowlist. Bootstrap downloads that pack once as a public static asset, validates its structure, then inserts its classic scripts individually and in order. This preserves shared lexical globals and existing function overrides while removing the waterfall of 25 separately authenticated script downloads. It does not use `eval` or `new Function`. The current deployment has no CSP restriction on inline scripts; a future CSP must explicitly support this execution mode before enabling it.

The service worker caches the pack for public device-only offline startup rather than prefetching all 25 individual files. Retry unregisters only the app's root service worker before a fresh navigation and retains localStorage, IndexedDB and caches. The recovery sign-in link uses `/login?locked=1` so a valid existing session cannot immediately redirect it back into the failed app.

For the latest expanded release and verification limits, see [the startup/account/email review](docs/reviews/public-device/review.md). Historical release notes in this document may describe the retired legacy flow.

`npm test` includes the existing suites and the mocked email-security suite. After installing Chromium with `npx playwright install chromium`, run `npm run test:all` for build/type checks, unit tests and both browser suites. No real email or family notifications are sent by these tests.

## Public device mode

No account is needed for local planning, recipes, shopping/pantry, portions, manual receipts/spending/photos, insights, voice/Notes input, weather, timers, exports/imports or native sharing. Server-based family data, multi-device sync and family notifications require an account and selected family workspace. Sign-up/email are optional for the public website; there is no verification email at account creation.

Public offline assets are separate from private account/family state. Guest data uses `guest/`; selected family data uses `account/<household-id>/`. Logging in without a family keeps the same guest work. Cloud workspaces are separate and are not silently populated from guest data. The latest review above supersedes historical mandatory-login and email-verification descriptions.

## Family invitations and device connection

The latest local revision is described in [the family hub review](docs/reviews/family-hub/review.md). Owners can use **Mời người nhà** directly beside the kitchen controls or inside **Bếp của tôi → Tài khoản & gia đình**. Create an invitation and open Email, SMS or Messenger to choose the recipient and send its code/link. Invitations are single-use and expire after seven days. Recipients can register from the link and join immediately, without email verification.

New sessions restore a remembered family only while membership is valid; accounts with exactly one family select it automatically. Multiple-family accounts without a remembered selection choose explicitly. Device-only data remains separate.
