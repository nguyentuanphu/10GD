# v1.7.11 — FamTray · Bếp Nhà: name, tagline, English-first language

Owner decisions (Henry, 7 Nov 2026, Sydney time). Branch `release/v1.7.11`, built on `release/v1.7.10` (PR #30, not yet deployed); merge #30 first.

## 1. Name
- English **FamTray**, Vietnamese **Bếp Nhà**, combined **FamTray · Bếp Nhà**, short name **FamTray**. Replaces “Bếp Gia Đình” in all user-facing copy: manifest (name, short_name, description), `<title>` of index / Studio / privacy / sign-in pages, app header and side menu, welcome guide (“Bắt đầu với Bếp Nhà”), page eyebrow “BẾP NHÀ”, startup error, push and test notifications, password-reset email subject, backup-file message, shared shopping-list signature, privacy & terms, README title, NETLIFY-SETUP title, Price Check store listing (`docs/scout-store/listing.md`), and the extension (manifest description, options, popup, update steps: “Mở Bếp Nhà …”; English: “Open FamTray to pair”).
- **Not changed:** internal ids, package name `bep-gia-dinh`, storage keys (`bep-gia-dinh-v1`, `bep-language`), API paths, extension id/key, env vars, the AGENTS.md title, test fixtures that are snapshots of earlier deployed code, and family-authored data (recipe names, notes, family names).
- The extension stays **FamTray So Giá · Price Check**.

## 2. Tagline
- **One table, the whole family** / **Một mâm, cả nhà** replaces “Bữa cơm, nhẹ lo” (and its English “Less worry, more family”) wherever it was the app's tagline: side-menu brand line, manifest description, sign-in page, shared shopping-list signature. It was not used anywhere else.

## 3. Default language — English main, Vietnamese fully supported
Decided in `storage-context.ts`, the first script, before any script builds default data (so a new device's first data cannot make it look “in use”), and saved for the current scope (device or signed-in family):
1. a language saved for this scope wins (a VI │ EN tap is saved the same way and clears the “guessed” mark);
2. else a language **chosen** on this device in another scope (guest first), e.g. on the sign-in page — a language the app only guessed does not count;
3. else a device or account **already in use** — family data in any scope, the pre-account cache, or a signed-in family — keeps **Vietnamese**, the old default, and it is saved; no device in use flips to English after the update;
4. else (a new device) the phone/browser language: **Vietnamese if “vi” comes first among VI/EN** in `navigator.languages`, otherwise **English**; saved with a “guessed” mark.
- A new account created on a new device keeps the language it was created in (the sign-in page saves it at registration, so step 3 does not turn it Vietnamese).
- The **sign-in / sign-up / invitation page** (first screen) follows the same rule, is fully bilingual (every label, placeholder, button, message and the server messages it can show) and has its own VI │ EN switch (≥ 44 px) that is saved for the app too.
- `<html lang>` is set by the first script; the privacy page follows the same phone rule; manifest `"lang": "en"`. Voice recognition defaults and date/number formats already follow the app language.

## 4. Reference recipes without English cooking steps — decision
- **Count:** 125 reference recipes, 625 prep/step sentences, **0** without English (all translated and checked in v1.7.10; `language:browser` fails if any reference recipe step has no English).
- **Decision:** nothing to translate or postpone in this release; no “English steps coming soon” note is needed. Family-authored recipes are never translated (shown exactly as written; rule 6/21).

## 5b. What needs an account (owner decisions by pop-up, 7 Nov 2026, Sydney time: folded into v1.7.11)
Principle: what only serves one person on one device stays account-free (rule 12); an account is needed when the server keeps the data, it costs money, or other people see it. An account with no family works as a family of one.
- **Online supermarket prices — 5 tries, then an account.** Each lookup costs money. Without an account a device gets **5 tries in all** (not per day): one try is one “Làm mới giá” (shared supermarket prices only — never any family's data) or one “Tìm giá online” request. The **server counts** them per device id (hashed), with a cap of 20 tries a day per network so clearing the browser does not reset it. So Giá shows “Dùng thử giá online: còn N/5 lượt” with *Tạo tài khoản*; at 0 the line and a sheet invite an account; the last try says it was the last. Automatic background refreshes never use a try. Saving prices to a family still needs an account.
- **Phone reminders (push) — account needed** (already required by the server). The *Push & người nhận* sheet now says so first, with *Tạo tài khoản* (or “create a family under Family — just you is fine” when signed in without one), instead of only greyed-out buttons.
- **Already account-only, unchanged:** sync and online backup, sharing prices / recipes with the community, pairing the Price Check extension, reading replies to feedback.
- **Stays account-free:** menus, shopping list, pantry, family recipes, receipt reading (on the device), spending, voice input, appearance and language, reference library, weather, sharing by Messages / Messenger.
- **Tests:** `grocery-api` (unit) — no device id → sign in; 5 tries (refresh and find count alike) with the remaining count 4…0; then 403 `trial-used` for both; guests get no family observations; per-network daily cap; another network unaffected; saving still needs an account. `default-language:browser` — trial line, a refresh uses a try (server count), all used → sheet with *Tạo tài khoản*, reminders sheet asks for an account, ≥ 44 px, no emoji, at 375 / 1280 / 320, VI and EN. Evidence: `docs/reviews/v1.7.11/{vi,en}-{size}-{trial-line,trial-used,reminders-account}.png`.

## 5. TypeScript only (Henry: “Rules là tất cả viết bằng ts, tại sao tôi vẫn thấy viết bằng js?”)
- The JavaScript files seen in `dist/`, `tests/`, `netlify/` and `scripts/` are **build output** from TypeScript and are not tracked in git.
- Hand-written JavaScript that was still tracked is gone: the two inline scripts in `privacy.html` and one in `studio.html` are now `src/frontend/privacy-head.ts`, `privacy-page.ts` and `studio-theme.ts`; three archived review tools (`docs/reviews/…/make-report`, `startup-timing`, `studio-shots`) are renamed to `.cts` / `.mts`.
- `npm run check` (in CI) now fails if any hand-written `.js/.cjs/.mjs` file is tracked or a page carries an inline `<script>`.
- Cost: Studio and the privacy page load one extra tiny file (0.4 KB) that used to be inline; `studio-nav:browser` now counts two scripts at start (studio-theme.js + studio.js); its timing targets are unchanged and pass.

## 6. Tests
- New suite **`test:default-language:browser`** (in `test:all`): new device with a Vietnamese phone → Vietnamese; English phone → English, and it stays English after the device has data and reloads; other phone languages (fr+vi → VI, de+en → EN, fr+ja → EN); devices in use (guest data, pre-account cache, family cache) with an English phone → Vietnamese, saved, still Vietnamese after reload; saved choice wins both ways and on a device in use; the VI │ EN switch is saved as a choice; sign-in page in English / Vietnamese / device in use, its switch saved for the app; manifest name, short name, lang, description; header name and tagline, welcome card and switch at 320 / 375 / 820 / 1280, VI and EN, online and offline; sign-in and sign-up pages at each size.
- The voice suites set their own UI language in the test data and include an “English-only device” case, so their browsers keep the default locale (first CI run failed when they were given a Vietnamese phone).
- Existing browser suites describe their family's phone explicitly: every test browser now opens with `locale: 'vi-VN'` (they were written for a Vietnamese family's device and assumed the old default). Their checks are unchanged; English is covered where those suites already switch language, and the new default rules are covered by the new suite.

## 7. Evidence (Chromium viewport simulation, not physical devices)
- `docs/reviews/v1.7.11/{vi,en}-{narrow,mobile,tablet,desktop}-{online,offline}-today.png` — header name / tagline, welcome card, VI │ EN switch.
- `docs/reviews/v1.7.11/{vi,en}-{size}-signin.png`, `…-signup.png` — sign-in and sign-up (invitation field) pages.
- Sizes: narrow 320×640, mobile 375×812, tablet 820×1100, desktop 1280×800.

## Limits
- Server messages outside the sign-in page (family, Studio) stay as the server writes them; the app translates the ones it shows through its English table.
- The installed app's name on a phone home screen changes only when the phone refreshes the manifest (or the app is re-added).
