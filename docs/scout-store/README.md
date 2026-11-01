# FamTray Price Compare (FamTray So sánh giá): getting it to families without commands

There are two ways to install, and neither needs a command:

1. **From the family app (works after the next approved deploy).** The production build now makes the extension zip itself and serves it at `/downloads/famtray-scout.zip`, with the app address already filled in. In the app, go to My kitchen → Family connection → "Ghép máy tính này / Pair this computer". The card shows illustrated steps: download → unzip → open `chrome://extensions` → Developer mode → Load unpacked. Then it shows one **"Ghép ngay / Pair now"** button. Chrome only allows this kind of install with Developer mode turned on.
2. **From the Chrome Web Store / Edge Add-ons (one click, no Developer mode).** This works once you have published the extension. The steps are below.

You can also download a ready zip from GitHub without commands: Actions → any green **CI** run → Artifacts → **famtray-scout-extension** (kept for 30 days). It contains `dist-extension.zip`, which you unzip and load, and `dist-extension-store.zip`, which is the file to upload to the stores. To have the app address filled in for those zips, add a repository variable named `SCOUT_SERVER_ORIGIN` with your app address, for example `https://<your app address>`. In GitHub, go to Settings → Secrets and variables → Actions → Variables.

## Henry's steps for the Chrome Web Store

1. Go to the Chrome Web Store Developer Dashboard (chrome.google.com/webstore/devconsole) and sign in with the Google account that should own the listing. Pay the **one-time registration fee** and finish the account checks Google asks for, which can include contact email verification.
2. Click **New item**. Upload `dist-extension-store.zip`. Get it from the GitHub artifact above, or from a production build: it is the copy **without** the `key` field, which the store does not accept.
3. Fill in the listing from `docs/scout-store/listing.md`: name, short and long description (VI and EN), category, single purpose, permission justifications, the data usage answers, and the privacy policy URL `https://<app address>/privacy.html`.
4. Upload the icon and screenshots from `docs/scout-store/` (128px icon, 1280×800 screenshots, 440×280 promo tile).
5. Choose visibility. **Unlisted** is a good start: only people with the link can install it. Then submit for review. Google reviews it, which can take from a few days to a few weeks. They may ask questions about the permissions; the answers are in `listing.md`.
6. When it is approved, copy two things from the dashboard:
   - the **store link** (`https://chromewebstore.google.com/detail/...`);
   - the **extension id** (32 letters a–p). The store gives it a **different id** from the zip version, because the zip has a fixed key.
7. Tell the app about them. Neither needs a command:
   - Hosting environment variable `SCOUT_EXTENSION_IDS`: add the store id after the existing one, separated by a comma: `mjeoekikdicoojgoppnfibjbfpcfngja,<store id>`. Without it, the server refuses requests from the store version.
   - Store link: either in Studio → Mạng so sánh giá → "Cài từ cửa hàng tiện ích / Store install links" → paste → Save, or as the environment variable `SCOUT_STORE_URL`. The environment variable takes priority.
   - The app's install check tries every id it is given: the bundled id plus the ids in `SCOUT_EXTENSION_IDS`, which the page reads from `scout?op=public`. Both versions are found.
8. The "Pair this computer" card then shows **"Cài từ Chrome Web Store"** above the manual steps.

## Edge Add-ons (optional)

Do the same at the Microsoft Partner Center (Edge Add-ons). Check the current registration terms when you sign up. Upload the same `dist-extension-store.zip`, reuse the listing text, add the Edge id to `SCOUT_EXTENSION_IDS`, and put the Edge link in Studio, or in `SCOUT_EDGE_STORE_URL`. Edge users then see "Cài từ Edge Add-ons". Edge can also install the Chrome Web Store version.

## Hosting variables (all optional except the first)

| Variable | Purpose |
|---|---|
| `SCOUT_EXTENSION_IDS` | **Required.** Comma-separated ids the server accepts: `mjeoekikdicoojgoppnfibjbfpcfngja` plus any store ids. |
| `URL` | Set by the hosting build automatically. The production build bakes it into the zip as the app address and allows that address to talk to the extension ("Pair now"). |
| `SCOUT_SERVER_ORIGIN` | Overrides `URL` if the app is opened at a different https address. |
| `SCOUT_APP_ORIGINS` | Extra https app addresses allowed to use "Pair now", separated by commas. |
| `SCOUT_STORE_URL`, `SCOUT_EDGE_STORE_URL` | Store links. They take priority over the Studio setting. |
| `SCOUT_AUTO=off` | Hard kill switch for scheduled runs and Run now. |

## Keeping the home computer reachable (remote control)

Studio → Mạng so sánh giá lets you watch each computer from your phone and send Run now, Stop, Pause/Resume, change the pace, refresh the rules, and re-check store names. Commands arrive the next time the computer checks in, which happens about once a minute while Chrome is running. A computer that is asleep, switched off, or has Chrome closed **cannot be woken remotely**. Commands wait for up to 30 minutes and then expire. On the home computer:

- keep it plugged in;
- turn off sleep during price-compare windows. On Windows: Settings → System → Power → Sleep: Never when plugged in. On Mac: System Settings → Lock Screen / Battery → prevent automatic sleeping on power adapter;
- let Chrome keep running in the background: `chrome://settings/system` → "Continue running background apps when Google Chrome is closed". In Edge, use `edge://settings/system`;
- make Chrome open at login. On Windows: Settings → Apps → Startup, or put a Chrome shortcut in the `shell:startup` folder. On Mac: System Settings → General → Login Items → add Google Chrome;
- no remote desktop is needed.
