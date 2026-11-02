# v1.7.2 — Generic / local-grocer receipts ("Ghép giá với giỏ đi chợ") — review record

Scope: Henry's approved backlog `docs/plans/backlog-v1.7.2-and-later-20261102.md`, section "v1.7.2", items 1–7.
Branch `agent-jj/generic-receipts` (from `origin/main` 25d13f7 = v1.7.1). Local only: not pushed, not deployed, no preview.
This record does **not** request deploy approval (AGENTS rules 1–5, 10, 15–18). GitHub CI on the exact PR head commit is still required.

## What changed
1. **Generic lines** (`src/frontend/receipt-parse.ts`, shared parser — extended, not forked). `genericLabel()` marks
   GROCERY / PRODUCE / VEG(ETABLES) / FRUIT / FRUIT & VEG / MEAT / DELI / SEAFOOD / DEPT nn / MISC / ITEM / PLU nnnn /
   bare 3–6-digit code / price only. On stores the parser does not know (local grocers), a price on its own and a
   weighed line with its own price (`0.85kg @ 12.99/kg 11.04`) become generic lines too. Generic lines are **never**
   matched (`matchIngredient` returns unknown, no name-alias memory key, no old `inferIngredient` fallback). Chain
   receipts (ALDI/Woolworths/Coles/UK) are unchanged (all v1.7.1 fixtures re-checked).
2. **Match UI** (`src/frontend/receipt-match-ui.ts`, new; draft/line facts in `receipt-ui.ts`). Panel in the receipt
   form when a receipt has generic lines: prices (line no., amount, printed label, kg × $/kg) beside this week's shopping
   list (ingredient rows + extras; ticked "đã mua" first in tick order, with the tick time). Tap price → tap item(s);
   several items = one line covering several items (saved as one line with `covers`); "Chia tiền theo món" lets the
   family type the parts (must add up to the line; never guessed). Undo for every step. Voice / typed command via the
   existing `createVoiceTake` pipeline and hold-to-talk (`VOICE_HOLD_HANDLERS.rm`): "dòng 3 là thịt ba chỉ", "dòng ba là
   rau muống và hành lá", "line 3 is pork belly", several commands in one sentence. Offline: tap and typed commands work;
   the mic explains offline/unsupported/blocked.
3. **Suggestions** (`src/frontend/receipt-match.ts`, new, pure, deterministic): family history at that store (weight 3)
   or in the same suburb (2; suburb = a non-shop word shared by store names, e.g. "CABRAMATTA"); So Giá prices mapped
   through the catalogue (verified 2 / 1.5, unverified 0.75); $/kg plausibility for weighed lines (meat/fish 6–90,
   loose veg/fruit 0.5–10 $/kg) and the printed department word; "đã mua" tick order vs receipt order; combinations of
   2–3 items only when the family/community prices add up to the line (±5%, min ±$0.15); a joint beam pass (each item
   used once) with a printed-total penalty, and a "total gap" note when the unknown lines cannot add up to the printed
   total. A suggestion needs real evidence (the department word or a tick alone never suggests anything). Each shows a
   one-line VI/EN reason and is applied only on tap.
4. **Per-store learning** (`state.receiptLearning`, family data → synced): store + label/PLU/"price"/"weighed" key +
   price band (±15%, ≥ ±$0.30) → item; learned from confirmed single matches on save; ranks first next time ("Đã ghép
   trước đây ở cửa hàng này: VEG $3.20–$3.50 → Rau muống"); "Đã học ở cửa hàng này" list with "Quên".
5. **"Đồ khác (chưa rõ)"**: unmatched generic lines are saved as `kind:'other', unknown:true` (spending, not
   "chưa đối ứng"), shown in a new Chi tiêu card, excluded from the shopping/pantry reconciliation (no ingredient);
   reopening the receipt shows them unmatched again so they can still be matched.
6. **Community report** (`community-prices.mts`, `community.mts`, `price-scout-ui.ts`, `studio.ts`): "👥 Báo giá cho
   cộng đồng" on an unmatched line of a saved AUD receipt (account mode, eligible): catalogue search, store suburb /
   postcode, consent tick; sent only on that tap; facts only (item, price, store type `viet-grocer`/`other`, branch,
   capture time, receipt/line ids for server verification). Server: the generic flag is read from the **saved**
   receipt line (not the client); such a group is `status:'unverified'` (never confirmed by the trusted-receipt
   shortcut), visible in So Giá as "Chưa xác minh · N người báo" with the capture time, `usable:false` (not a
   comparison price), no points. New `op=confirm` / `confirmSeen()` "Tôi cũng thấy giá này": copies the group's price
   facts with a fresh capture time (≤24 h, not future), counts as that family's report through the unchanged
   `contribute()` path (rate limits, dedupe "one family once", outlier hold, trust, awards); the same family (any
   member) is refused (`self-confirm`), also inside the shard write. When ≥2 families match (existing consensus and
   tolerance) the group is verified; the first reporter gets the confirmed points, the confirmer the corroborate points.
   Studio: "Chưa xác minh" tile + queue rows (kind `unverified`, evidence "dòng chưa rõ món, gia đình tự đặt tên",
   Hide / Reject / Ban unchanged). `dist/privacy.html` (VI/EN) explains the new report and the confirm button (the
   "Updated" date was left at 1 Nov because `usage-browser` asserts it).
7. Version 1.7.2 (package.json / package-lock.json), README "What's new in v1.7.2", CSS block appended
   (`/* === v1.7.2 generic-receipts … === */`), scripts `receipt-match.js`, `receipt-match-ui.js` appended to bootstrap.

## Tests
- `tests/receipt-match.test.cjs` (in `npm test`, 17 checks): the 3 synthetic local-grocer fixtures → generic keys and
  prices, add up to the printed total, never auto-matched even with a learned alias; weighed lines; `genericLabel` keys
  and real names that are NOT generic; v1.7.1 chain fixtures have no generic line; history store vs area; verified vs
  unverified So Giá; $/kg; tick order (+ excluded items keep tick ranks); multi-item combination; total constraint +
  joint pass + total-gap note; determinism; learning band/ranking/forget/cleaning; voice parser VI/EN + name resolution.
- `tests/community-unverified.test.mjs` (in `npm test`, 8 groups, real handlers, in-memory stores): unverified even from a
  trusted contributor, not usable, no identity, no points; generic flag from the saved line; self-confirm refused
  (owner and second member), stale/future capture refused, consent and account required; Studio queue/stats; verified by
  another family, +10 first reporter / +3 confirmer, duplicate confirm refused; non-matching price earns nothing; Studio
  hide still works and hidden prices cannot be confirmed; `groupConsensus` rules.
- `tests/generic-receipts-browser.test.cjs` (`npm run test:generic-receipts:browser`, appended to `test:all`): a rendered
  synthetic photo through the real on-device OCR + parser; tap/suggestion/multi-item/undo/split; hold-to-talk with a
  mocked recogniser + typed EN command; save → "Đồ khác (chưa rõ)", not reconciled, nothing shared automatically;
  spending card; learning used next time + "Quên"; offline; account mode (mocked APIs): report sheet (no send without
  consent, facts-only payload), So Giá unverified vs verified, "Tôi cũng thấy giá này" payload (fresh time); Studio
  unverified row. Each step checks no horizontal overflow, ≥44 px targets, no page errors, no vendor names.
- Local runs: see "Local checks" below. GitHub CI not yet run (rule 15).

## Responsive QA (Chromium viewport simulation — not physical devices)
| Size | Screens (JPEG in this folder) |
|---|---|
| 320×740 | `narrow-match-panel-vi-light` |
| 375×812 | `mobile-match-panel-vi-light`, `mobile-match-panel-en-dark`, `mobile-multi-item-vi-light`, `mobile-voice-vi-light`, `mobile-reconcile-vi-light`, `mobile-spending-unknown-vi-light`, `mobile-learned-vi-light`, `mobile-offline-vi-light`, `mobile-report-sheet-vi-light`, `mobile-so-gia-unverified-vi-light`, `mobile-studio-unverified-vi-light` |
| 820×1100 | `tablet-match-panel-vi-dark`, `tablet-match-panel-en-light`, `tablet-report-sheet-en-dark`, `tablet-so-gia-unverified-en-dark` |
| 1280×800 | `desktop-match-panel-vi-light`, `desktop-match-panel-en-dark`, `desktop-report-sheet-vi-dark`, `desktop-so-gia-unverified-vi-dark`, `desktop-studio-unverified-en-dark` |
Checked at every size: no horizontal overflow, panel/report/So Giá buttons ≥44 px (Studio desktop tables excluded as
before), VI/EN, light/dark, reduced motion (the mic "listening" pulse is off under `prefers-reduced-motion`). Header and
bottom navigation are unchanged. The 320 px modal footer stacks its two buttons (existing modal behaviour).

## Limits
- **No real local-grocer receipts yet** — every fixture is synthetic ("TAN VIET GROCERY CABRAMATTA" etc., invented).
  Henry will send real ones; they must be used locally only and never committed. Real layouts (two columns, Chinese /
  Vietnamese text, quantity columns, "PLU" formats) may need parser additions.
- On the synthetic **photo** the OCR read "TOTAL 32.74" as "Jdion 32.74", so that path had no printed total (the six
  generic prices were read correctly; the pasted-text path finds the total). The form already asks for the amount paid
  when no total is found.
- $/kg bands, the suburb-word "area" and the store type (`viet-grocer` / `other`) are heuristics; suggestions are only
  hints with reasons and are never applied without a tap.
- Voice was tested with a mocked recogniser (no audio); real speech accuracy is the v1.7.1 pipeline's.
- Community: `retailer` for local grocers is `viet-grocer` or `other`, so two different local shops in the same suburb
  share one branch id (same store/area). Me-too confirms are allowed on pending and unverified groups (not on verified).
