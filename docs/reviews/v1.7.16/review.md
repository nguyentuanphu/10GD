# v1.7.16 — the loading screen shows the app's own drawings

Times are in Sydney time (Australia/Sydney). **Not deploy-approved.** Nothing is merged or built on hosting until Henry says DEPLOY.

## Owner report, 8 Nov 2026
Henry sent a phone screenshot of the grey loading screen and asked: *“Tại sao vẫn hiện cái icon cũ này?”*

**Why it happened:** the page shell in `dist/index.html` appears before the app's scripts run. That shell still had the old text symbol ♧ on the reminders button. On a slow start, or while the app was updating, the family saw that symbol until the app replaced it with the drawn bell. The desktop sidebar in the same shell also still had two phone emoji (🏡 family, 🌿 note). These go against rule 19.

## Change
- **Reminders button:** the shell now has the same drawn bell the app shows, with the same size (32 × 42 px on phones, 42 × 42 px from tablet up). Nothing jumps when the app finishes loading. The small dot from the old symbol is gone, as it is in the app.
- **Sidebar:** the family badge and the sidebar note use the app's house and leaf drawings.
- **Footer:** the heart (♡) stays. It is ordinary text, and the app shows the same heart.
- **New `npm run check` step:** it fails if the loading shell shows any emoji or symbol icon. It also checks that the bell is a drawing. On the old shell it reports 🏡 🌿 ♧.


## 2. Removing an invited guest really removes them (owner, 8 Nov 2026, 20:25)
*“Cái có khách có vẻ như để huỷ buổi tiệc hay huỷ invite cho ai đó không được, ví dụ tôi có tesr là khách, vào xoá mà nó vẫn báo là có khách.”*

**Cause, reproduced in the browser:**
- An invitation puts the guest group on every meal it covers.
- “Xem” on Today opened the sheet for one meal only. Removing the group and saving cleared that meal, but the other meals of the invitation still had the guest, so Today kept saying “Khách sắp tới”.
- A second way back: the family sync kept a group removed on one device if another device had changed it meanwhile.

**Change:**
- **Sheet:** removing an invited group shows *“Bấm Lưu để bỏ Tesr khỏi mọi bữa của lời mời và huỷ link đã gửi.”*
- **Lưu:** takes the group off every uncooked meal of the invitation and withdraws the link on the server. The guest page then says the invitation was cancelled. The toast says *“Đã huỷ lời mời: Tesr.”* If the device is offline, it says the link could not be withdrawn yet.
- **Đóng:** changes nothing.
- **Cancelling a whole party:** remove every group and save.
- **Family sync:** a meal's guest list is now one value. Removing all guests is a change like any other, so the newer edit of the meal wins and an older edit on another device cannot bring the guests back. Covered by a new `sync-merge` test, which fails without the fix.

## 3. A bigger “Bắt đầu đi chợ” with a running colour ring (owner, 8 Nov 2026)
*“Nút bắt đầu đi chợ làm to ra và có viền màu flashing chạy viền ngoài.”*

- **Size:** 60 px tall (was 48), pill-shaped, bold, full width on phones. It keeps its cart drawing.
- **Ring:** a colour ring (the art kit's colours) runs around the edge, one turn every 2.4 s. It turns smoothly and does not flash on and off, to keep it comfortable for the eyes.
- **Reduced motion:** the ring stays still (rule 13). It also stays still on old browsers without `@property`.
- **Focus:** keyboard focus shows an orange outline outside the ring.

## Tests
- `npm run check`: the loading-shell step.
- `sync-merge` (in `npm test`): guests removed on one device are not brought back.
- **New suite `test:v1716:browser`** (in `test:all`), run at 375 / 320 / 820 / 1280 px in VI and EN:
  - an invited group on several meals: “Đóng” keeps it; removing and saving takes it off every meal, withdraws the link once and drops it from Today;
  - the start button is ≥ 56 px tall, full width on phones, and keeps its drawing;
  - the ring is present, still under reduced motion and running otherwise;
  - no sideways scroll.
- Screenshots: `guest-remove-note-*`, `guest-removed-today-*`, `shop-start-*`.

## Evidence (loading shell) (Chromium viewport simulation; the app's scripts are blocked to show the loading shell)
| Size | Loading shell | Loaded app |
|---|---|---|
| Phone 375×812 | `shell-mobile-375x812.png` | `app-mobile-375x812.png` |
| Narrow phone 320×740 | `shell-narrow-320x740.png` | `app-narrow-320x740.png` |
| Tablet 820×1100 | `shell-tablet-820x1100.png` | `app-tablet-820x1100.png` |
| Desktop 1280×800 | `shell-desktop-1280x800.png` | `app-desktop-1280x800.png` |

- At every size the bell is drawn, the same size in the shell and in the app, and the page has no sideways scroll.

## Limits
- **Old copies on phones:** phones that saved the old page keep showing it until the app updates itself. That happens on the next open after deploy.
- **Testing:** viewport simulation only, not physical devices.
