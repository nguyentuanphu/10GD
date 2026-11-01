# Backlog: v1.7.2 and later (owner notes, 2 Nov 2026)

These are ideas Henry approved for later releases. None of them is built yet. They follow the release rules in AGENTS.md (plan → build → GitHub CI green → explicit DEPLOY).

## v1.7.2: generic / local-grocery receipts (Henry: "làm ở v1.7.2")

**Problem.** Asian grocers, butchers and greengrocers often print only "GROCERY 4.50", "VEG 3.20", "MEAT 12.80", "DEPT 01", or just prices. No receipt reader can guess the item from that.

**Approach: match prices to the shopping basket** ("Ghép giá với giỏ đi chợ").

1. **Detect generic lines.**
   - Lines with only a price, or with a generic label (GROCERY, PRODUCE, VEG, MEAT, DEPT nn, MISC), become "Chưa rõ món". They are never auto-matched.
2. **Match to basket.**
   - Show the unmatched prices next to this week's shopping list, with items ticked "đã mua" first.
   - Tap a price, then an item, to match them. One price line may cover several items (e.g. "VEG 8.40" = rau muống + hành lá).
   - Voice works too: "dòng 3 là thịt ba chỉ".
3. **Suggestions** (shown for confirmation, never applied automatically):
   - the family's own price history at that store, plus So Giá community prices (e.g. $3.20 at chợ X ≈ rau muống, last seen $3.00–3.50);
   - $/kg plausibility from weighed lines (e.g. 0.85 kg @ $12.99/kg looks like meat, not vegetables);
   - the order items were ticked "đã mua" in the app versus the scan order on the receipt;
   - the printed total, to rule out combinations that don't add up.
4. **Learn per store.**
   - Remember "store + generic label + price range → item", and store-specific PLU/item codes, so later suggestions improve.
5. **Unmatched lines are never lost.**
   - They are saved in spending as "Đồ khác (chưa rõ)".
   - Only matched lines take part in the shopping/pantry reconciliation.
6. **Community report for unmatched lines** (Henry: "So Giá vẫn nhận nhưng note chỉ 1 người báo chưa được verify, cần thêm người verify để nhận"):
   - A "Báo giá cho cộng đồng" button. The user names or picks the item; it is never sent without that tap.
   - So Giá accepts it but labels it **"Chưa xác minh · 1 người báo"**, with the capture time. It is visible to others, but it is not used as the main comparison price and earns no points.
   - It becomes **"Đã xác minh"** when other families report a matching price at the same store/area. The first reporter's points are awarded then. Add a "Tôi cũng thấy giá này" one-tap confirm.
   - Existing gates still apply: outlier hold, one family counts once (duplicate receipts), Studio moderation and removal.
7. **Test data.** Ask Henry for a few real local grocer receipts. Use them locally only, never commit them; commit synthetic fixtures.

## Native accuracy option (Capacitor), if web OCR/voice on iPhone is still not good enough

- **Why:** The app is a PWA, so TypeScript/JavaScript is required in the browser. Heavy parts already run as WebAssembly: OCR (Tesseract) and voice (Whisper via ONNX Runtime).
- **Proposal:** Wrap the existing app with **Capacitor**, keeping the same TypeScript code. Add a thin layer that calls iOS Vision OCR / Apple speech and Android ML Kit / speech, then publish to the App Store and Google Play.
- **Trade-offs:** Apple's annual developer fee, store review, and a native shell to maintain. Decide after real-iPhone results of v1.7.1 receipts and voice.

## Other pending items

- **Chrome Web Store listing (Unlisted)** for FamTray So Giá: one-click install, auto-updates, no Developer mode. The pack is ready in `docs/scout-store/`. Henry's step: register a developer account (one-time fee) and upload `dist-extension-store.zip`. Then add the store extension id to `SCOUT_EXTENSION_IDS` and the store link in Studio. Edge Add-ons is optional.
- **Functions region → Sydney:** faster requests, since data lives in Sydney. This needs a hosting plan change, so it is deferred by Henry.
- **Reminders every 5 minutes** instead of 15 (`netlify.toml` schedule `*/5 * * * *`). Reminders would be at most ~5 min late; duplicates are already prevented; it costs about 3× more scheduled runs. Urgent alerts already push immediately.
- **Pantry expiry estimates:** needs shelf-life data per category. Today receipts add the purchase date only.
- **Receipt photo tips in the app:** whole receipt in frame, flat, no thumb over the price column, avoid diagonal shadows. Several of the 15 test receipts failed only for these physical reasons.
- **Paid online accurate voice** (e.g. a cloud transcription API): considered and set aside. The on-device "More accurate" pack is free and is now the default.
- **Two Studio nav items with similar names** ("Tin nhắn khẩn" daily counts vs "Tin khẩn" failure reasons): consider merging into one page.
