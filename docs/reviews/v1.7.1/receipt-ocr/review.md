# v1.7.1 — Receipt reading (spending form + So Giá) — review record

Henry's report: “receipt đọc sai hết” (ALDI Wolli Creek in “Chụp / nhập hóa đơn”), and the same photo was also wrong in So Giá.

Branch `agent-ii/receipt-ocr` (local only, not pushed, not deployed). This record does **not** request deploy approval (AGENTS rules 1–5, 10, 15–18). GitHub CI on the exact PR head commit is still required.

## Root causes
1. **No image preparation**: the photo (hand, table, shadow, slight tilt) went straight to Tesseract with automatic page segmentation, which merged the receipt edge/shadow into each line (“Si 380307 …”, “hen 566385 …”) and lost the right-hand price column on some lines.
2. **A generic one-pattern parser** (`parseReceiptText`): first line = store (“aS”), item codes kept, no ALDI/Woolworths/Coles knowledge, no continuation lines (weighed “1.611kg Net @ 3.49 $/kg”, “Qty 2 @ …”, “ea”), totals regex only matched `TOTAL…` so ALDI's “SUBTOTAL (INCL GST)” was skipped and the **line sum was used as the amount paid**; a line preceded by noise was dropped.
3. **No size repair or abbreviation knowledge**, so “Burratal50g”, “Chillil75g”, “8pk/1689” and “Frz/Chs/Wtrmelon/HSChkn” never matched; matching was a plain substring search.
4. **So Giá used its own single-price reader** on the same photo, so receipts were treated as one shelf tag.

## What changed
- `src/frontend/receipt-parse.ts` (new, ONE shared module): on-device preparation (paper crop, shadow flattening by background division, deskew + smooth warp field for curl/perspective, contrast stretch, upscaling of small text, speck/edge-line removal; hot loops optimised 11.5 s → 3.5 s in Node for a 1512×2016 photo), receipt OCR settings (single block, keep spacing, 300 dpi) with fallback to the plain photo only when it clearly reads better; retailer detection (ALDI / Woolworths AU / Coles / Woolworths UK / generic) and line parsing (codes, `> * # ^ % *%` markers and junk prefixes removed; weighed, multi-buy and `ea` lines; ×N duplicate hints; several subtotal blocks; discounts/credits/surcharge/rounding as separate non-ingredient lines; refunds; warranty and EFTPOS/bank blocks ignored); size repair only next to a unit (l/I/|→1, O→0, S→5, B→8, Z→2, “1689”→168 g) with plausibility; right-edge clipped prices repaired **only** when the printed total confirms; printed total / item count vs what was read, with VI/EN warnings (“Thiếu 2.79 — có thể đọc sót một dòng”, “Hoá đơn ghi 24 món, đọc được 23”, no total, two receipts in one photo, misread total line, odd price, non-AUD, refund); `redact()` removes card/AID/ARQC/TVR/TSI/ATC/terminal/reference/auth/merchant/transaction/staff lines from everything saved; abbreviation table + EN aliases + confidence matching; duplicate fingerprint (salted SHA-256 of the printed transaction number, else of retailer/store/date/time/total); reconciliation maths.
- `src/frontend/receipt-ui.ts` (new): the receipt form uses the shared OCR + parser (photo and pasted text), shows warnings and per-line hints, keeps unknown amounts/prices empty, remembers confirmed mappings by retailer + item code/name (existing `state.aliases` memory); duplicate prompt before saving (exact: “Hoá đơn này có vẻ đã lưu ngày … Vẫn lưu?” with “Xem hoá đơn đã lưu” / “Không lưu” (default focus) / “Vẫn lưu (lần mua khác)”; near: “Có thể trùng”); after “Kiểm tra & lưu khoản chi” the reconciliation sheet (Đủ / Còn thiếu X / Dư X → cất kho, duplicates grouped “2 × 150 g = 300 g”, one tap “Cập nhật đi chợ & kho”, untick per line, undo bar + “Hoàn tác” later, lines without a known amount listed); refunds and non-AUD never touch shopping or pantry. So Giá: a photo that reads as a receipt opens the same form with the same parse; shelf tags keep the existing single-price flow.
- Small edits outside my files: `family-features.ts` (saveReceipt: refund may be negative; receipt/line extra facts kept; “Vẫn lưu” bypasses the old identical-fingerprint block), `spending-core.ts` (validSpending accepts a negative total only with `refund:true`), `bootstrap.ts` (2 scripts appended), `community-prices.mts` (server: receipt shares dedupe by the receipt's stored salted key; refunds never shared), `community-prices.test.mts`, `package.json`, CSS block appended to `dist/styles.css`.
- Saved receipt facts: `retailer`, `refund`, `printed:{time,count,storeNo}`, `receiptKey` (hash only), line `lineKind/code/size/weightKg/perKg/multi/discount/nonFood`. The raw text kept with a receipt is redacted.

## Accuracy on the 15 real photos (local only — photos never committed)
Before = old pipeline (photo → Tesseract auto layout → old parser). After = new pipeline (same code as the app, Node harness; the browser test runs the identical module). Items = lines with correct price and a recognisable name / ground-truth lines.

| Photo | Items | Sizes | Total | Date | Store | Warnings after |
|---|---|---|---|---|---|---|
| aldi-wolli-creek | 0/16 → **16/16** | 0/14 → 13/14 | ✗ → ✓ 88.37 | n/a | ✗ → ✓ | — |
| aldi-2025-03-03-a | 0/8 → 0/8 (8 names, prices clipped) | 0/5 → 0/5 | ✗ → ✗ | ✗ → ✓ | ✗ → ✓ | short, missing-price |
| aldi-2025-03-03-b | 0/8 → 0/8 | 0/5 → 0/5 | ✗ → ✗ | ✗ → ✗ | ✗ → ✗ | no-total, missing-price |
| aldi-2021-refund | 0/1 → 1/1 | — | ✗ → ✓ −50.23 | ✗ → ✓ | ✗ → ✓ | total-conflict, refund |
| aldi-2020-full | 0/19 → 16/19 | 0/2 → 1/2 | ✗ → ✓ 455.50 | ✗ → ✓ | ✗ → ✓ | total-conflict, short, count |
| aldi-2020-bottom | no items → “Không thấy dòng món nào” | — | ✗ → ✓ | ✗ → ✓ | ✗ → ✗ | no-items |
| ww 9 (torn, folded) | 0/9 → 0/9 | 0/7 → 0/7 | none printed | ✗ → ✗ | ✗ → ✗ | no-total |
| ww 10 (two receipts) | 0/10 → 0/10 | 0/4 → 0/4 | ✗ → ✗ | ✗ → ✓ | ✗ → ✗ | no-total |
| ww 11 (clipped) | 0/10 → 2/10 | — | none printed | n/a | ✗ → ✓ | no-total, missing-price |
| ww UK 12 | 8/10 → 9/10 | — | ✓ → ✓ | n/a | ✗ → ✓ | non-aud, over |
| ww 13 | 6/8 → **8/8** | 4/7 → 6/7 | ✗ → ✓ | n/a | ✗ → ✓ | — |
| coles 14 | 0/10 → **10/10** | 0/8 → 8/8 | ✗ → ✓ | n/a | ✗ → ✓ | — |
| coles 15 | 5/15 → **15/15** | 5/15 → 14/15 | ✗ → ✓ | ✓ → ✓ | ✗ → ✓ | — |
| coles 16 | 5/5 → 5/5 | 3/5 → 4/5 | ✓ → ✓ | ✓ → ✓ | ✗ → ✓ | — |
| coles 17 | 4/4 → 3/4 (OCR 19.50 for 9.50) | 3/4 → 2/4 | ✓ → ✓ | ✓ → ✓ | ✗ → ✓ | over |
| **All** | **28/133 → 85/133** | **15/76 → 48/76** | | | | |

Character accuracy of the OCR text (vs. transcription), plain photo → prepared: wolli-creek 0.71 → 0.89, 2020-full 0.22 → 0.85, 2025-03-03-a 0.11 → 0.61, ww 13 0.88 → 0.93. Preparation time (Node, desktop CPU): 1.5–4.8 s per photo; phones will be slower.
Weak cases are physical: the 03 MAR 2025 photos have the price column cut off by the photo edge (shown as “chưa đọc được giá”, never guessed), WW 9 is folded and covered, WW 10 holds two receipts (the parser reads one and warns), WW 11 is clipped on the right. The 03 MAR a/b duplicate check works on the receipt text (same transaction → same key); on these two real photos the footer was not read well enough to produce the key, so the prompt there depends on store/date/total being read.

## Tests
- `tests/receipt-parse.test.cjs` (in `npm test`, 35 checks): every fixture → structured output; old-app OCR of aldi-wolli-creek; missing-line warning text; size repair; abbreviations + matching (snack/non-food unmatched, learned mapping); WW/Coles/UK formats; torn/clipped; clipped-price repair only with total check; refund; redaction; duplicates (exact/near/none, salted key, a/b same key); reconciliation maths; line quantities.
- `tests/receipt-ocr-browser.test.cjs` (`npm run test:receipt-ocr:browser`, appended to `test:all`): synthetic renders (tilted, shadowed) → full pipeline (16/16 and 5/5 prices, totals, stores); form, reconciliation apply **offline** + undo, duplicate exact/near prompts, refund, UK, So Giá receipt capture; ≥44 px footer targets, no horizontal overflow, no page errors; `RECEIPT_PHOTOS_DIR=…` (local only) also runs real photos.
- Text fixtures `src/tests/fixtures/receipts.cts`: all payment/bank values synthetic, staff names replaced.
- `community-prices.test.mjs`: second saved copy of a receipt → 409 duplicate; refund line → 422.
- Run locally: check, typecheck, `npm test`, test:browser, test:offline:browser, test:price-scout:browser, test:community:browser, test:scout-studio:browser, receipt suites — all pass.

## Responsive QA (viewport simulation, Chromium; not physical devices)
Screenshots (JPEG): `mobile-receipt-form-{vi,en}`, `mobile-reconcile-{vi,en}`, `mobile-reconcile-undo-bar-vi`, `mobile-duplicate-{vi,en}`, `mobile-so-gia-receipt-{vi,en}` at 375×812; `tablet-*-vi` at 820×1100; `desktop-*-vi` at 1280×800. The app rendered in its dark theme in these runs. Header/navigation unchanged, so no 320 px check.

## Limits
- OCR quality still depends on the photo: cut-off price columns, folds and covered text cannot be recovered; such lines are listed without a price for manual entry.
- Duplicate check of So Giá against the account's own shares uses the family's saved receipts (a So Giá receipt photo is saved as a family receipt first); server dedupe covers community shares.
- Shelf-life data does not exist in the app, so pantry lines get the purchase date and no expiry.
- Preparation takes a few seconds on a phone; there is no progress bar for that step (OCR progress is shown).
