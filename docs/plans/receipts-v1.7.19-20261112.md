# v1.7.19 plan — receipts the app has not seen yet (owner, 12 Nov 2026, Sydney time)

Owner chose A and B (pop-up, 12 Nov 2026): “There will be other receipts that you have not tested — how will you be able to read those?”
Not chosen: C (AI reading of the photo). Ships after v1.7.18. Release rules in AGENTS.md apply (plan → build → tests → DEPLOY).

## A. “Gửi chữ hoá đơn để sửa cách đọc” (send the receipt text to fix the reader)
- After the family corrects a receipt (lines, prices, store, date), one tap sends to Studio: the OCR text, the corrected lines, the reader's version, store / retailer id and app build.
- Never the photo. Card, member, bank, terminal, ABN-of-customer and receipt numbers are removed on the phone before sending (reuse `isSensitive` / `redact`); the preview shows exactly what is sent; nothing is sent without the tap.
- Studio → Góp ý / Hoá đơn: list, diff “read vs corrected”, status. Each report becomes a text fixture + test (as done for Costco, HP Meats, Cuong Thien in v1.7.18) so that layout stays fixed.
- Privacy page section updated (what is sent, kept how long, how to delete).

## B. Photo quality hints
- Before the family starts correcting: when the read lines do not add up to the printed total / payment, the printed item count differs, OCR confidence is low, or the photo is blurry / crooked / cut off at the price column, show a short hint with what to do: “Chụp lại: để thẳng, đủ sáng, thấy cả cột giá và dòng TOTAL”.
- Offer “Chụp lại” and “Vẫn dùng bản này”; never blocks saving.
- Uses only what the reader already measures (difference, count, confidence, crop frame); no new data leaves the phone.
