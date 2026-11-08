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

## Evidence (Chromium viewport simulation; the app's scripts are blocked to show the loading shell)
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
