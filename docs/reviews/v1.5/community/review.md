# Community Price Pilot / Giá cộng đồng: v1.5 review record

Status: the feature is implemented on the feature branch `agent-g/community`, on top of `19b7099` (Price Scout and Studio).

- **Not deploy-approved.** Responsive QA does not grant deployment approval (AGENTS.md rule 10).
- **Off by default.** The pilot only runs after the owner turns on the Studio flag `communityPrices` (or sets `STUDIO_FLAG_COMMUNITY_PRICES=true`). It is limited to the Price Scout states that are also NSW or QLD.

## What it does

### When the flag is off

Nothing changes for users. The new UI never renders, and the source-mix labels are hidden. Every community API operation except `status` returns 404 `{disabled:true}`. The optimizer output is identical (this is tested).

### Contributing

Contributions come only from **shelf-tag photos** (new capture button "📸 Ảnh kệ giá ở cửa hàng") and **confirmed receipt lines** (the "👥 Chia sẻ" button on receipt-derived rows). Screenshots, website/app captures, bookmark captures and manual entries stay family-only, and the confirm sheet says so.

- **Opt-in per observation.** The "Chia sẻ giá này với cộng đồng (ẩn danh)" checkbox is unchecked by default. It asks for the store branch as a suburb plus postcode.
- **Consent.** On the first opt-in, a short bilingual consent sheet appears. The server stores the acceptance timestamp and the terms version.
- **Facts only.** The client sends only extracted facts: item, label, price, unit price, pack, retailer, branch, state, promo, validUntil, capturedAt, image hash, and OCR price or receipt line reference. It never sends the recorder's name, notes or raw OCR text. This is asserted in the browser test.
- **Held items.** If the server holds a shelf photo for moderation, the app asks before uploading the photo. The server accepts the upload only when its SHA-256 equals the evidence hash. The photo is deleted after moderation, or by the prune job after 14 days.

### Community price card

The "👥 Giá cộng đồng · Thử nghiệm" card shows, for each price:

- a status chip: **✓ Đã xác nhận** or **⏳ Chờ xác nhận** ("chỉ tham khảo")
- "N gia đình xác nhận · X ngày trước"
- source icons (📸 shelf photo, 🧾 receipt)
- the store branch
- a promo end date
- **⚑ Báo giá sai**, which opens a dialog with a reason and a note

Prices are greyed after 14 days. The card always carries a "not a guaranteed shelf price" notice.

Shop-posted prices appear as "🏪 Giá do tiệm đăng · <shop>" with "Tiệm tự đăng, chưa kiểm chứng". The card also offers "Chi nhánh tôi hay đi", which limits totals to chosen branches.

### Optimizer

`optimizeBasket` uses prices in this order: **own-family prices (and the licensed official feed) → CONFIRMED community prices → shop-posted prices**. Pending, held and greyed prices are never used in totals; they come back as `hints`.

The one-stop and split totals carry a `sourceMix`, rendered as "🧮 12 giá của nhà mình · 5 giá cộng đồng đã xác nhận · 1 giá do tiệm đăng".

### Shop channel

A shop applies with a form (shop name, ABN as free text, suburb and postcode). The owner approves or rejects the application in Studio. Shop prices are separate from consensus, expire after 14 days (or at their `validUntil`), and can be reported.

### Studio: "Cộng đồng giá / Community prices" (`#community`)

- **Pilot switch.** Saving it is confirmed with a dialog and audited through `settings-save`.
- **Stats.** Submissions, confirmed, pending, held, open reports, contributors, banned, and the trust distribution.
- **Moderation queue.** Covers held, flagged, reported and shop-reported items. Each entry shows the evidence summary, the OCR match, the hash prefix, a "View photo (audited)" button, the contributor's trust and flags, and the reports. Actions: approve, reject, hide, restore, dismiss reports, ban (shadow-limit) and unban.
- **Shops tab.** Applications (approve, reject, revoke) and the list of shop-posted prices.
- **COI tab.** Conflict-of-interest signals.
- **Rules tab.** A plain-language summary of the rules.

Every view and action is written to the existing Studio audit log as `view_community`, `view_community_photo` or `community_<action>`, with the actor and reason. Reject, hide, ban and shop-hide require a reason.

## Gates and rules (server, `src/netlify/lib/community-prices.mts`)

| Rule | Implementation |
|---|---|
| Eligibility | The account must be ≥ 7 days old (`createdAt`). It must also have **either** a verified recovery email (`emailVerifiedAt` and `email`) **or** a current family whose `createdAt` is ≥ 7 days ago. The account must not be `disabled`, and the user must not be a viewer. Note: the account system does not currently set `emailVerifiedAt` (email verification is optional, and `verify-email` answers "not needed"), so **in practice the family-age rule applies**. The verified-email branch is wired for when verification exists. |
| Rate limits | ≤ 30 contributions per account per day and ≤ 60 per salted IP hash per day. Reports are capped at ≤ 20 per account per day. The counters are `rate/<day>/…` keys, which are deleted after 2 days. |
| Evidence | Evidence must be `shelf-photo` or `receipt`; anything else returns 422 `family-only`. For a shelf photo, the OCR price must be within $0.01 of the entered price, or the server returns 422 `ocr-mismatch`. For a receipt, the line must exist in the family's synced state with a matching total (AUD), dated within 7 days, or the server returns 422 `receipt-unconfirmed`. `capturedAt` must fall within the last 7 days (`too-old`) and must not be in the future (`future`, 5 min skew allowed). |
| Duplicates | `dedupe/<sha256(imageHash or family+receipt+line)>` is written with `onlyIfNew`, so a second writer gets 409 `duplicate`. This is atomic under concurrency. |
| Consensus | Group = (itemId, retailer, branch, promo window). Prices match on the same unit basis within ±2% or ±$0.05. **CONFIRMED** needs ≥ 2 distinct families whose captures fall within 7 days of each other, or 1 receipt from a contributor with trust ≥ 0.7 at submission. Only one vote per family counts. Anything else is **PENDING**. |
| Outlier hold | A price outside 40%–250% of the 35-day median is held. The median is taken over confirmed community prices for the item and state plus the submitter family's own observations, on the same basis, and needs ≥ 3 values. **HELD** prices are not shown. |
| Trust | Trust starts at 0.5. It rises by 0.05 when another family corroborates a submission and falls by 0.15 when ≥ 2 other families contradict it or a moderator rejects it. Each move applies at most once per contributor per price group, so repeating the same report earns nothing. Trust < 0.3 means submissions are accepted but never counted. |
| Ban | A ban is a shadow-limit. The contributor gets normal responses, but all their submissions are excluded from display and counting. Unban restores them. |
| COI signals | Signals are flagged and never auto-banned. **shared-ip:** ≥ 3 accounts behind one IP hash. **new-account-burst:** ≥ 3 accounts younger than 14 days reporting one branch within 24 h; the whole burst is flagged. **single-branch-low:** ≥ 5 submissions, ≥ 80% at one branch, and ≥ 80% of the compared ones below the median of competitors (other branches and retailers, same item). Flagged reports do not count toward confirmation until a moderator approves them. |
| Expiry | Specials last until `validUntil`. Regular prices count for 14 days, are shown greyed until 21 days, then are hidden. Shop prices last 14 days. The client re-ages a cached copy while offline. |
| Identity | The public API never returns usernames, family references, IP hashes or evidence references. This is asserted in the tests. Users see only "Cộng đồng". Studio (owner only) shows the username, which is needed to ban. |

## Storage and concurrency (store `bep-community`, strong consistency)

The store has a per-state, per-item shard `items/<STATE>/<itemId>` holding submissions, reports and hidden groups. Writes to a shard are conditional read-modify-writes (`onlyIfMatch`, or `onlyIfNew` for a new shard), retried 12 times with jitter. Other records are:

- `contributors/<username>`
- `ip/<ipHash>`
- `branches/<STATE>/<hash>`
- `shops/applications/<username>`
- `shop-prices/<username>`

These use the existing etag-guarded `editRecord`. Evidence dedupe and the photo marker are `onlyIfNew` keys. Contention is per item and per branch, not global. A shard keeps about 40 days, plus held items.

The public GET lists the state's shards and computes consensus on read. This suits the pilot because the catalog has 136 items per state. A cached summary would be the next step at scale.

**Concurrency test.** Six families contribute in parallel to one shard, and all six submissions survive. If a shard write finally fails, the dedupe marker is removed so the user can retry.

## API

`/.netlify/functions/community`. It uses the same session cookie and household resolution as the grocery and family APIs, and same-origin is required for POST.

- `GET status`: flag, states, eligibility, terms acceptance, shop status.
- `GET prices&state=NSW[&branch=…]`
- `POST accept-terms`
- `POST contribute` with `{consent:true, observation, branch}`
- `POST photo&id&state&item`: raw bytes, held items only.
- `POST report`
- `POST shop-apply`
- `POST shop-price`

**Signed-in only for the pilot.** Device-only users do not read community prices. Reading requires a session so that abuse controls, rate limits and reporting tie back to a family.

Studio ops: `community`, `community-photo`, `community-action`, and `prune` and `recompute`, which now also prune community rate keys and expired photos.

## Tests

### Backend: `tests/community-prices.test.mjs`

This suite is in `npm test`. It uses real accounts, family, grocery and Studio handlers with in-memory stores. It covers:

- the flag-off no-op
- signed-in only access and the origin check
- eligibility: young account, young family, and verified email allowed
- terms and consent required
- evidence: family-only types, OCR mismatch, too old, future, duplicate hash, out-of-state branch
- one vote per family, and the 2-family confirm
- trust: +0.05 on corroboration
- outlier hold, then photo upload: hash mismatch rejected, only the owner may upload, 14-day expiry
- receipts: confirmed line required, duplicate line rejected, trust ≥ 0.7 receipt confirms alone
- a low-trust contributor not counted
- contradiction lowers trust by 0.15
- the three COI flags, with no auto-ban and flagged reports not counted
- rate limits per account and per IP
- viewer and disabled accounts
- report → queue, and one report per family
- Studio queue contents, the audited photo view, approve (photo deleted), reject (reason required, −0.15), hide and restore a group, approve flagged reports so the group confirms, ban (shadow) and unban
- the audit log contains every action with actor and reason; non-admins get 403
- the shop channel: apply → approve → post → separate from consensus → report → hide, and 14-day expiry
- regular and special expiry
- concurrency: 6 parallel writes
- cross-family isolation, no identity leaks, and state separation

### Optimizer: `tests/price-scout.test.cjs`

New block covering:

- own-family prices beat cheaper community prices
- community prices fill gaps
- shop prices are used last
- pending and greyed prices are never used in totals and come back as hints
- source-mix counts
- the branch preference filter
- shareability (shelf photo with OCR within $0.01, or receipt; never screenshot or bookmark)
- the flag-off result is identical

### Browser: `npm run test:community:browser`

Mocked APIs. Writes 42 PNGs to this folder.

## Responsive QA

**Method.** Chromium 1243 headless (Playwright 1.64.1), `reducedMotion: reduce`, service workers blocked, mocked community, grocery, account and Studio APIs. All prices and accounts are synthetic QA fixtures. This is **browser viewport simulation, not physical-device testing.**

| Screen | Mobile 375×812 | Tablet 820×1100 | Desktop 1280×800 |
|---|---|---|---|
| Community badges + report button (`community-badges-*`) | VI light, EN dark | VI light, EN dark | VI dark, EN light |
| Totals with source-mix label (`totals-mix-*`) | VI light, EN dark | VI light, EN dark | VI dark, EN light |
| Contribute opt-in in the confirm sheet (`contribute-optin-*`) | VI light, EN dark | VI light | EN light |
| First-use consent (`consent-*`) | VI light, EN dark | VI light | EN light |
| Held → ask before sending photo (`held-photo-ask-*`) | VI light, EN dark | — | — |
| Report dialog (`report-dialog-*`) | VI light | EN dark | VI dark |
| Studio overview + moderation queue (`studio-overview-*`, `studio-queue-*`) | VI light, EN dark | VI light, EN dark | EN light, VI dark |
| Studio ban dialog / Shops tab | VI light (mobile) | VI light (tablet) | — |
| Screenshot stays family-only; ineligible account; offline cached copy | VI light; EN light; EN light (mobile) | — | — |

**Checked automatically in each scenario:**

- No horizontal overflow (`scrollWidth ≤ innerWidth`) in the app and in Studio.
- Touch targets are ≥ 44 px in the Price Scout panel, the community card, the opt-in form, the consent and held dialogs, and the report form. In Studio this is checked at mobile and tablet sizes; on desktop, Studio keeps its own compact buttons.
- No page errors, and no vendor names in visible text.
- The opt-in checkbox starts unchecked.
- The terms are accepted before the first contribution.
- The photo is uploaded only after "Send photo".
- The flag-off state shows no community UI.
- The offline state shows "Offline" and keeps the cached community prices.

Animations: the new UI adds none, and the existing reduced-motion rules still apply. Header and navigation are unchanged, so there is no 320 px check.

**Fix made during QA:** `.scout-form .scout-grid{display:grid}` was overriding the `hidden` attribute on the branch fields. A scoped `[hidden]{display:none!important}` rule fixes it.

## Limits and open items

- **Not tested on physical iPhone or Android hardware.**
  - Real shelf-photo OCR accuracy has not been measured, and OCR still needs a connection the first time.
  - The camera `capture="environment"` behaviour was not verified on devices.
- **Photo size.** The photo hash must match the original file, so the app cannot downscale before upload. Photos over 5.5 MB are not sent (the user is told). The function body limit on the hosting platform is about 6 MB.
- **Email verification.** It does not exist in the account system today, so eligibility relies on family age (≥ 7 days).
- **No contributor data deletion.** There is no bulk "delete my contributions" tool, and account deletion does not yet remove `contributors/<username>`. Both are noted in the legal draft. Moderators can hide, reject or ban instead.
- **Scale.** Consensus is computed on read, scanning all of a state's shards. This is fine for the pilot (≤ 136 items per state). Add a cached summary before a wider rollout.
- **Branches.** Branch identity is user-chosen (retailer + postcode + suburb slug). Two spellings of one suburb create two branches.
- **Shop ABN.** It is free text and not verified automatically.
- **Legal.** `docs/legal/community-prices-terms-draft.md` is a **DRAFT** that needs owner and legal review. Privacy policy and APP 5 collection notice updates are still required before any public use.

## Files outside the stated ownership

- `src/netlify/lib/studio.mts`: added the `communityPrices:false` default flag and the `STUDIO_FLAG_COMMUNITY_PRICES` environment mapping (two small edits).
- `src/netlify/functions/studio.mts`: added the import, the three community ops, and pruning in `prune`/`recompute`.

These are the Studio files listed in the ownership.
