# v1.7.1 · "Scout" → "So Giá / Price Check", Studio-assigned extension access, one-tap pairing, 8-file extension

Branch `agent-bb/rename-compare` (from 945552d). Not deployed, not pushed. GitHub CI has not run on this branch yet (rule 15). That run is still needed before this is release evidence.

## What changed
- **Naming (copy only):** the feature is "So Giá" / "Price Check". The extension is "FamTray So Giá" / "FamTray Price Check" (manifest name "FamTray So Giá · Price Check", short name "So Giá"). Automatic mode is "So Giá tự động" / "Automatic price check". The Studio page is "Mạng So Giá" / "Price Check network". The price source label is "🔎 Máy So Giá" / "🔎 Price Checker". Internal ids, storage keys, API ops, env vars, flag keys and the extension id/key are unchanged.
- **Access:** only accounts listed in Studio → Mạng So Giá → "Tài khoản được dùng tiện ích" may pair or run the extension. STUDIO_ADMINS are always allowed. The server refuses everyone else with 403 `not_assigned`, covering pair-code, studio-pair-code (now bound to a chosen assigned account), pair, and every device op except unpair. Migration happens on the first request: trusted price checkers and accounts with paired devices are added and audited once. When an account is removed, its devices are refused at once and Studio shows them as "Bị thu hồi quyền". Re-adding the account re-enables those devices without re-pairing. Tokens are never deleted on removal, and only an admin can re-grant.
- **App, assigned accounts only:**
  - Today shows a one-tap banner when an unpaired extension is found. It is dismissible for the day, and the tap is the confirmation.
  - `#pair-extension` comes from the popup. It asks for the same confirming tap, and shows a plain sign-in prompt first if the person is signed out.
  - `#kitchen-family-pair` opens the pairing card.
  - The "So Giá trên máy tính" entry in Tài khoản & cài đặt opens the install guide and pairing on desktop Chrome/Edge. On phones and tablets it shows "Mở trên máy tính" with Copy and Share.
  - A newly assigned account sees a one-time notice on Today and gets a push of type `scout`, so its push types and quiet hours apply.
  - Unassigned owners and members, view-only members and device-only use see none of this.
  - Manual codes in My kitchen and Studio are now under "Nâng cao / Advanced".
- **Popup:**
  - `html,body` are a fixed 360 px wide.
  - The title fits on one line, with "FamTray" in small text above "So Giá".
  - The language control is a VI │ EN toggle that marks the current language with aria-pressed.
  - Pause is a small header button and appears only when paired.
  - Unpaired state: "Ghép ngay" opens the app at `#pair-extension` (or the Settings page when no app address is known), with an inline "Nhập mã" field.
  - When the server refuses the account, the popup shows the not-assigned message.
- **Package:** 8 files (`manifest.json`, `background.js`, `content.js`, `ui.js`, 3 pages with CSS inlined, `icon.png`). The parser config and build info are embedded as data.
- **Voice:** "so giá", "price check" and the old words ("scout", "price scout", "so sánh giá", "price compare") all answer where the feature is.

## Verified (local, browser viewport simulation; not physical devices)
- Extension in real Chromium MV3 (`test:scout:browser`):
  - popup at 360×600 with deviceScaleFactor 1.0 and 1.5 (Windows 100 %/150 %), VI/EN, light/dark: body ≥ 340 px, no horizontal overflow, title on one line, Pair now and Enter code visible without scrolling, targets ≥ 44 px;
  - popup Pair now → app `#pair-extension` → confirming tap → paired;
  - found banner → one tap → paired, and no pairing before the tap;
  - Studio removal → device refused, popup explains, app shows nothing.
- App (`test:scout-pair:browser`):
  - assigned-only visibility in Today, My kitchen, Account & settings and the deep links (owner/member/trusted-unassigned/device-only);
  - banner at 375/820/1280, VI/EN, light/dark;
  - dismiss for the day;
  - one-time notice;
  - phone entry with Copy + Share.
- Server (`scout-allowlist.test`): migration and its audit, CRUD (owner + CSRF, support role read-only), every endpoint refusing, removal and re-add, push on new assignment.
- Studio (`test:scout-studio:browser`): allowlist card, Advanced pairing code collapsed by default.

## Screenshots (this folder)
- Popup: `popup-unpaired-*-360x600@1x/@1.5x`, `popup-paired-vi-light-360x600`, `popup-not-assigned-vi-light-360x600`.
- Banner: `banner-*`, `pair-extension-desktop-*`, `e2e-pair-extension-confirm-*`.
- Notice and settings entry: `granted-notice-*`, `settings-entry-mobile-*`.
- Pairing card: `pair-card-install-*`.
- Studio network page: `studio-scout-*`.
- Shopping panel: `shopping-compare-*` (375×812 and 1280×800, VI/EN).

## Limits
- Browser viewport simulation only. Real Windows Chrome at 125 %/150 % display scaling was not tested on hardware. It was emulated with deviceScaleFactor 1.5 (1.25 was not captured separately).
- A one-click `.crx` install works only through the Chrome Web Store. Until there is an Unlisted Store listing, the zip-and-folder install with Developer mode remains.
- An unassigned person who has the extension learns why only when the popup is refused by the server. The app shows nothing, as decided.
- Intentional remaining "Scout"/"săn giá" text:
  - internal identifiers, file names, storage keys, API ops and env vars;
  - code comments and historic README sections (v1.5–v1.7);
  - the `#scout` anchor in privacy.html;
  - the reward badge "Thợ săn giá / Price hunter";
  - voice synonyms kept on purpose.
- Deploy is not approved. Responsive QA does not grant deployment approval.
