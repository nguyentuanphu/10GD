# v1.5 My kitchen review: simpler kitchen, account-only avatar, Other settings

Status: implemented on feature branch `agent-l/simplify-kitchen` for preview testing. **Not deployed. Deploy approval is still required.** Responsive QA below used browser viewport simulation (Chromium), not physical hardware.

## Owner feedback (Henry, iPhone preview, 1 Nov 2026)
When signed out, “Đăng nhập” in the avatar menu opened the same screen as the big “Bếp của nhà mình” button (My kitchen → Family access). My kitchen was also crowded: eight sections plus a strip of section chips. The agreed design separates three things: **account** (avatar), **family kitchen** (big button) and **other settings** (one secondary sheet).

## What changed
### A. Avatar = account only (`accountMenuItems()` / `accountMenuHead()` in `src/frontend/personal-ui.ts`)
- **Signed out / device-only:** “Đang dùng trên máy này · Dữ liệu chỉ lưu ở đây.”, then **Đăng nhập**, which opens the real sign-in page `/login?return=/` (plus the current `#hash`), and **Tạo tài khoản**, which opens `/login?return=/&mode=register`. Nothing else. These links no longer open My kitchen.
- **Signed in:** name, @username and family · role, then **Tài khoản & bảo mật**, the family switch list (only when the account has more than one family), **Dùng riêng trên máy này…** and **Đăng xuất…**. Both of the last two still use the same confirmation dialogs.
- **Account & security sheet** (`accountSecurityModal()`): one card each for the recovery email (the existing `#account-email` form, or an “internet needed” note when offline), the password (“Đổi mật khẩu…”, which opens `/login?mode=request-reset`; reset by email or by backup code are the existing flows) and this device (trusted or not, the date until which sign-in is remembered from the signed offline grant, offline readiness, device-only and sign out). This content was removed from My kitchen.
- Small edit outside my ownership: `src/frontend/login.ts` (3 lines) now honours `?mode=register|request-reset|recover`. Invitation and reset links take precedence as before.

### B. “Bếp của nhà mình” = family kitchen only, four cards in order (`kitchenModal()`)
Each card has a short title and a one-line description (≤ 60 characters, enforced by the test):
1. **Thành viên & khẩu phần**: “Suất mỗi bữa; 1 suất = ¼ công thức 4 người.” Member rows, add/remove, save. The separate explanation paragraph is merged into the description.
2. **Kết nối gia đình**: signed in, this shows the family · role, sync status, **Mời người nhà** (owners only) and **Đồng bộ ngay**. A family list appears when there is more than one family. Connected accounts, join with a code and create a family are collapsed or secondary. Device-only: “Cần tài khoản để dùng chung với người nhà.” with **Đăng nhập** and **Tạo tài khoản** (both go to the real sign-in page) and a collapsed “Có mã mời từ người nhà?” form. The form goes to `/login?invite=…`, so the person joins right after registering (AGENTS rule 12). Offline, it explains that sign-in needs internet.
3. **Thực đơn**: budget, max cooking time, and foods to avoid/allergies (label warning kept). Dishes per meal, weekend meals, noodle-soup preference and dinner time are collapsed. **Lưu thực đơn**, plus “Thiết lập lại từ đầu” (guided setup for meals/days).
4. **Nhắc nhở & thông báo**: one **Mở nhắc nhở & thông báo** button. Before, two buttons opened the same push sheet.
- Removed from My kitchen: the section-chip strip, Appearance, Currency & prices, Data & backup, and Account & security. Old deep links (`settingsModal('account'|'appearance'|'currency'|'data')`) now open the new sheets.

### C. Other settings (`otherSettingsModal()`)
- One sheet with three cards: **Giao diện** (light/dark plus seasonal theme, this device only), **Tiền tệ & giá** (current currency, change currency & ingredient prices) and **Dữ liệu & sao lưu** (export, restore, import from Notes, family sync settings when signed in, offline readiness).
- Entry points:
  - Mobile **More** menu: “⚙ Cài đặt khác”, replacing the My kitchen item. The big button already sits under every page heading.
  - Desktop/tablet sidebar: “Nhắc nhở & cài đặt” became two links, **Nhắc nhở** (opens My kitchen §4) and **Cài đặt khác**.
- The decorative sidebar note now hides on screens shorter than 980 px, and the desktop sidebar scrolls. Before this, on 1280×800 the old sidebar link was below the fold and could not be clicked (the test found this).

### D. Kept
- All strings use `tr()`. `Cài đặt khác` was added to the static-text dictionary.
- Dark mode (`html[data-theme=dark]`) and no new animations (reduced motion unaffected).
- Controls are ≥ 44 px. Dialogs use the shared modal (focus moves to it, Esc closes, focus returns to the avatar or the opener).
- Data handling: no data changes, and no vendor names in the UI.
- Invitations: owners still see the Today invite button (same rule), and Kết nối gia đình is card 2.
- CSS is appended only, in the `v1.5 my-kitchen-simplify` block of `dist/styles.css`.

## Senior-design self-review
**Tap depth (phone)**, before → after:
| Task | Before | After |
|---|---|---|
| Change portions | Big button → edit → Save (2 + typing) | same (card 1, top of sheet) |
| Invite family (owner) | Today “Mời người nhà” (1) or My kitchen → Invite (2) | same, Invite is now in card 2 without the chip strip above |
| Sign in (device-only) | Avatar → “Đăng nhập / Kết nối” → My kitchen → Kết nối gia đình → login (3) | Avatar → Đăng nhập → login page (2) |
| Create account | same as sign in, then switch tab (4) | Avatar → Tạo tài khoản (2), opens on the register tab |
| Sign out | Avatar → Đăng xuất… → confirm (3) | same (3) |
| Recovery email | Big button → chip → expand Account → form (3 + typing) | Avatar → Tài khoản & bảo mật → form (2 + typing) |
| Change theme | Big button → chip “Giao diện” → select (3) | More → Cài đặt khác → select (3); desktop header quick toggle (1) unchanged |
| Reminders | Bell (1) or My kitchen → one of two identical buttons (2) | Bell (1) or My kitchen → one button (2) |

**Clutter removed:**
- 8-chip jump strip
- 4 of 8 sections in My kitchen
- duplicate reminders button
- portion, menu and appearance hint paragraphs (folded into one-line descriptions)
- My kitchen duplicate in More
- the misleading “Đăng nhập / Kết nối gia đình” label
- the decorative sidebar note on short desktop screens

**Remaining overlaps, accepted:**
- The header bell and the desktop sidebar “Nhắc nhở” both lead to reminders. The bell opens the push sheet directly; the sidebar link opens My kitchen §4, as specified.
- In device-only mode the Today banner “Kết nối gia đình” and the big button both open My kitchen. The banner is the prominent family-connection nudge required by rule 12.
- The desktop header theme quick toggle and Other settings → Giao diện both change the theme. One is a one-tap toggle, the other the full choice including seasonal themes.

**Copy:** card descriptions are one line on tablet and desktop. At 320–375 px a few wrap to two short lines (Vietnamese is longer). They are not truncated.

## Verification
- `tests/kitchen-hub.test.cjs`:
  - My kitchen has exactly four cards in order, with VI titles and one short description each. Removed controls (`#theme-mode-select`, currency, export/import, account email, sign-out, device-only, chip strip) are absent from My kitchen, and there are no links to the other sheets.
  - Other settings has appearance → currency → data, the theme select still applies dark/light, and it holds nothing from My kitchen or the account sheet.
  - Old deep links work.
  - Signed-in avatar: Account & security comes first, then the family switch (2 families), device-only and sign out. Keyboard (arrows, wrap, Home/End, Esc) and focus return were checked. The account sheet has the three cards plus the identity and nothing from the kitchen; Esc closes it and focus returns to the avatar.
  - Signed-out avatar: only “Đăng nhập” and “Tạo tài khoản”. They navigate to `/login?return=/` and `/login?…mode=register`, and My kitchen never opens.
  - New section 7, one visible entry point per destination at 375×812 and 1280×800 (signed in and device-only, Today and Shopping): exactly one My kitchen entry and only the avatar for account. Other settings is in the sidebar on desktop only and once in More on phones, where More no longer repeats My kitchen. The sidebar Nhắc nhở and Cài đặt khác links are clickable at 1280×800, and the account menu and My kitchen hold no cross-links.
  - No horizontal page/sheet/card overflow and no untranslated Vietnamese in English (text, `aria-label`, `placeholder`, `title`; user content excluded) for My kitchen (owner and device-only), Other settings and the account sheet at 320×740, 375×812 and 1280×800 (plus 820×1100 and dark when `KITCHEN_SCREENSHOTS=1`).
  - Confirmations are unchanged: text, focus on Cancel, Tab trap, Esc, 44 px and the pending-sync warning.
- `tests/authenticated-startup.test.cjs`:
  - The recovery-email step now goes avatar → Tài khoản & bảo mật (it used My kitchen → Account & security).
  - New check: the real sign-in page opened with `?mode=register` selects the Đăng ký tab.
- These were test changes only where behaviour intentionally changed: section list/order, menu items and order, and where the email form lives. No assertion was removed without a replacement; device-only confirmation, overflow and EN checks were extended to the new sheets.

## Screenshots (this folder; Vietnamese with light, English with dark, at 320×740, 375×812, 820×1100, 1280×800)
- My kitchen:
  - signed-in owner: `kitchen-owner-{vi-light,en-dark}-{narrow,mobile,tablet,desktop}-*.png`
  - device-only: `kitchen-device-…`
  - family card scrolled into view: `kitchen-{owner,device}-family-…` (mobile, desktop)
- Avatar menu: `account-menu-signed-in-…` and `account-menu-device-…`
- Account & security sheet: `account-sheet-…`
- Other settings: `other-settings-…`
- Confirmations: `confirm-device-only-375x812.png` (pending-sync warning) and `confirm-device-only-en-375x812.png`
- More menu: `more-menu-en-375x812.png`

## Limits
- Browser viewport simulation only; no physical iPhone/iPad/Android, VoiceOver or TalkBack.
- Account data is mocked in the `kitchen-hub` harness.
- No in-app “change password while signed in” API exists. “Đổi mật khẩu…” uses the existing email-reset or backup-code flows on the sign-in page.
- The sign-in page itself (server module) remains Vietnamese-first, as before.
- GitHub CI has not run on this branch yet (AGENTS rule 15). The sandbox runs are supporting evidence only.
