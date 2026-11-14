# Owner release rules — Bếp Gia Đình / 10GD

Effective 31 October 2026 (Australia/Sydney). These rules supersede all earlier user permission to merge or deploy automatically.

1. Do not merge into, push directly to, reset, or otherwise modify `main` unless Henry explicitly authorises DEPLOY for the specific reviewed release. A prior release's approval does not carry forward.
2. Plan approval, “go ahead”, “proceed”, completion of tests, a successful preview build, and previous merge requests are NOT deploy approval. Mentioning or asking about deploy is not approval.
3. Before deploy approval, keep implementation on a separate feature branch. Local QA is allowed. Do not trigger production deployment or use another branch/hosting path to bypass the approval gate. Do not enable auto-merge.
4. If asked for a plan, provide the concrete scope, meal schedule, data implications, verification and unresolved decisions, then wait for plan approval before changing product code.
5. Before requesting deploy approval, finish the authorised implementation, checks and review evidence, and identify the exact commit/PR and limitations. Do not claim that code merged to main has only been previewed.
6. Preserve family-authored recipes and existing family data. Do not replace or delete them with generated sample recipes. Do not invent missing recipe quantities.

This is an agent workflow rule, not a claim that GitHub branch protection or hosting configuration has been changed. No hosting settings were changed when recording this rule.

## Required responsive review — owner instruction, 31 October 2026

7. Every release that changes interface, layout, navigation, text sizing, icons, forms or interactions must be reviewed on mobile, tablet and desktop/PC before it is marked ready. Test at least one representative size in each class (for example mobile 375×812, tablet 820×1100, desktop 1280×800); include a narrow phone check when header/navigation changes.
8. Exercise the affected interactions at all three sizes, including navigation and modal/form behavior where relevant. Check horizontal overflow, clipped or wrapped labels, tap/click targets, fixed bottom navigation/safe areas, readable prices/amounts, language switching and the online/offline state. Respect reduced-motion settings for animations.
9. Save screenshot evidence for mobile, tablet and PC and state the sizes and verification limits in the release record. Browser viewport simulation is not a claim of testing physical hardware. If a size cannot be tested, record the exact blocker and do not claim responsive QA is complete.
10. Responsive QA does not grant deployment approval. The separate explicit Deploy gate above continues to apply to every release.

## Product wording and account/family entry

11. Never name the hosting/storage infrastructure vendor in user-facing UI copy, status labels, help, notification text or assistant explanations. Use plain product language such as “Đồng bộ gia đình”, “Dữ liệu trực tuyến”, “Đã kết nối” and “Đồng bộ ngay”. Keep required SDK imports, API paths and deployment configuration internal; do not rewrite user-authored data or invent a custom domain.
12. Keep family connection and owner invitations easy to find. Sign-up must accept a valid invitation code/link and connect the recipient after registration; preserve normal account-free device use. Never silently merge device-only and shared-family data.
13. Prominent animated controls must respect prefers-reduced-motion and retain readable labels and accessible focus/touch targets.

## Continuous integration — owner instruction, 1 November 2026

14. Every test suite must run on GitHub. The `CI` workflow (`.github/workflows/ci.yml`) runs `npm run test:all` — build and static checks, typecheck, all unit/integration suites and every browser suite — on every pull request and every push. Any new suite must be added to `test:all` so CI runs it.
15. A release is not ready for review, and deploy approval must not be requested, until the `CI` workflow has passed on the exact head commit of its PR. Report the run link with the release evidence. Local or sandbox test runs are supporting evidence only and do not replace GitHub CI.
16. Never skip, disable, weaken or quarantine a test, step or workflow to obtain a green run. Fix the cause, or report the failure and its blocker to Henry. A green CI run is not deploy approval; rules 1–5 and 10 still apply.
17. To keep work fast, the full suite runs on GitHub, not on the agent's machine. The `CI` workflow splits every `test:all` step into parallel jobs (read from package.json, so new suites are included automatically) and reports one combined `npm run test:all` result. Locally, agents run only the checks relevant to what they changed (build/check, the touched suites, and any browser suite for touched UI) before pushing, then wait for GitHub CI. Rule 15 still applies: only a green GitHub CI run on the exact head commit counts as release evidence.

## Local test runs — owner instruction, 7 November 2026 (Sydney time)

17a. ~~GitHub CI can wait about two hours … local is enough to report ready, CI follows.~~ Replaced 14 Nov 2026 (Sydney time), Henry's pop-up answer "Chỉ dựa vào CI": CI runs every `test:all` step in parallel on GitHub, so the agent no longer runs the whole `test:all` on its own machine. A release is ready to report when the `CI` workflow is green on the exact head of its PR (rule 15). Locally the agent runs only the checks for what it changed (rule 17) and whatever is needed to find the cause of a CI failure. Rules 1–3, 16 and 18 are unchanged.

## Hosting build credits — owner instruction, 1 November 2026

18. Nothing is built or loaded on the hosting provider until Henry explicitly authorises DEPLOY. `netlify.toml` cancels every non-production build (deploy previews and branch deploys) before it starts; do not remove or weaken that `ignore` rule, do not trigger builds or deploys through the hosting API/CLI/tools, and do not create preview links. Review happens with local QA evidence and GitHub CI (rules 7–9, 14–17). A one-off preview is allowed only when Henry asks for one for a specific commit; then the head commit message must contain `[netlify-preview]`, and that request is not deploy approval.

## Own artwork, one style — owner instruction, 5 November 2026

19. No phone/system emoji in the app's interface. Every icon, picture or emoji-like symbol the family sees (app, Studio, notifications shown in the app) is our own drawing, in ONE shared style taken from the `nguyentuanphu/tpn` art kit (`js/art/kit.ts`): 48×48 viewBox SVG, chunky shapes, soft dark outline `#3b2a4f` at 2.6 px, round joins, the same colour family. In this repo the kit is `src/frontend/ui-art.ts` (`uiArt(name)`); food and recipe illustrations keep their existing artwork system.
    Owner decision, 5 Nov 2026: **ingredient and grocery-product pictures use the supermarket's product photo** (Coles, ALDI, Woolworths or Harris Farm, as returned by Pinch / WhichGrocer for the owner-confirmed product), with the source named; only items without such a photo get a new drawing in the shared style. Dish/recipe illustrations stay drawn, never product photos. When the photo cannot load (offline, removed), the drawing or a neutral placeholder shows instead — never an emoji.
20. A new picture gets a new drawing of its own, never a borrowed one or an emoji. Pictures are decorative (`aria-hidden`) next to words that carry the meaning; small motions stop under `prefers-reduced-motion`; touch targets stay ≥ 44 px.
21. New or changed UI must not add emoji. Existing emoji are replaced screen by screen (planned and reviewed like any release); family-authored text (names, notes, recipes) is never rewritten.

## Time zone — owner instruction, 6 November 2026

22. Everything is in Sydney time (Australia/Sydney, AEST/AEDT): reports to Henry, schedules and reminders, release records, Studio and app displays, and issue text. Show the zone when it is not obvious ("giờ Sydney" / "Sydney time"). UTC may only be used internally (stored timestamps, cron fields written with `CRON_TZ=Australia/Sydney`).

## Agent does the preparation — owner instruction, 6 November 2026

23. Henry only says **DEPLOY**. Everything before it is the agent's job without asking: create the release branch, implement and test, keep the release record and evidence, push, open the pull request to `main` as soon as the release is ready for review (not a draft), watch CI, fix real failures, and tell Henry — in Sydney time, with the PR and CI links — when the exact PR head is green and ready. Opening or updating a PR is not a deploy; rules 1–3, 15–16 and 18 still apply: nothing is merged into `main` or built on the hosting provider until Henry says DEPLOY for that release. Questions to Henry are only for real product decisions (plans under rule 4, data or privacy choices), asked with the pop-up question tool when available.

## Buttons keep the page still — owner instruction, 7 November 2026

24. Tapping a button, tab or chip must not make the page jump up or down. The tapped control stays where it was on screen after the view redraws (for example the Bữa sáng / Bữa trưa / Bữa tối tabs). Only real navigation (a new screen, opening a sheet, a link to a section) may move the page. Every change to buttons, tabs or redraws keeps a browser check that the tapped control does not move.

## Sheet buttons and wording — owner instruction, 7 November 2026

25. In every sheet (pop-up), the dismiss X, *Đóng / Xong* and *Lưu* each show their own drawn picture from the shared art kit (X in a circle = dismiss, chevron down = close, green tick = save), so the family can tell them apart at a glance. *Đóng* and *Lưu* buttons are pill-shaped (fully rounded) and float at the bottom of the sheet, always visible without scrolling. Buttons in one sheet footer are the same size and side by side — on phones too, as small pills with the picture above the words — and wrap their words instead of dropping to another row; they never stack. Every change to a sheet keeps a browser check for this.
26. Vietnamese and English text is written for the situation, not translated word for word: say what the button does or what just happened (“Bỏ đánh dấu đã nấu”, not “Hoàn tác bữa”). Family-authored text is never rewritten.

## Every button has a drawing — owner instruction, 7 November 2026

27. Main buttons show a drawing from the shared art kit (one drawing per meaning) next to their words: the main action of a screen or sheet (`.primary`, and main actions such as plan the week, add a dish, cooked, cooking mode, add to the list/pantry, put away), icon-only buttons (the drawing replaces a text symbol), the sheet X / Đóng / Lưu (rule 25), the bottom navigation and share buttons. Owner, 7 Nov 2026: “Nhiều emoji quá, giảm bớt thôi” — chips, tabs, disclosures and secondary buttons are words only, without a drawing. Phone emoji are never used. When a label is too long for its button, use a short name that fits the situation (“Chưa nấu”, “Bỏ qua”, “Lượng mua”) and keep the full wording for screen readers. A browser check fails when a main or icon-only button has no drawing, or a chip, tab or secondary button has one.

## Privacy changes need Henry first — owner instruction, 12 November 2026 (Sydney time)

28. Never change the privacy policy (`dist/privacy.html`), the terms, or what personal or family data the app collects, sends, stores or shares without asking Henry first, with the pop-up question tool. Show him the exact new wording (VI and EN) and what data changes, and wait for his answer before the change goes on any release branch. Approval of a feature is not approval of its privacy text. The release report to Henry must name every privacy or data-handling change in plain words; a line in the PR body is not enough. Henry, 12 Nov 2026: “Any changes to privacy you will need to ask me first.”

## Change every related place — owner instruction, 12 November 2026 (Sydney time)

29. When a feature changes, update every place in the app that does the same job or shows the same thing, in the same release (for example, the buying-unit sheet on Đi chợ and the unit choice in Viết món, receipts, the pantry and added items). Before the plan or the change, list every related place found in the code. Say which ones are changed and why any is left out, and ask Henry about any left out. Every related place gets the same browser checks. Henry, 12 Nov 2026: “Lần sau khi update thì phải update những cái liên quan chứ không thể update một nơi mà nơi khác liên quan bỏ qua như vậy.”

## Lessons from the 12 November 2026 audit — owner instruction (Sydney time)

Henry, 12 Nov 2026: “Vậy bài học ở đây sau khi bị nhiều lỗi là gì thêm vào skill và những thứ khác để không bị lặp lại.” The whole-app audit (`docs/reviews/audit-20261112/`) found 105 problems, 22 of them serious, in released code. Rules 30–36 hold for every release from now on, and the `release-check` skill (`.claude/skills/release-check/SKILL.md`) is the checklist the agent follows before it says a release is ready.

30. **The agent who reports to Henry checks the work itself.** A helper agent's report is not evidence. Before merging a helper's work, the lead agent reads the diff and opens every changed screen in the browser with realistic data and with empty data. It also checks the related places (rule 29) itself.
31. **Every control does what it says.** Every button, chip, link and sheet that a release adds or changes is tapped in a browser test:
    - with data and with nothing to show;
    - a number on a control equals what it opens;
    - a sheet never opens empty without saying why and what to do;
    - anything the family can add, they can also edit and undo, the same way as similar items.
32. **No silent defaults.** A form never saves a value the family did not choose or the app could not know. This covers units, amounts, prices, places, people, stores and dates.
    - When the app cannot know, the value stays empty or “Chưa rõ”, and the family is asked.
    - A suggestion comes only from matched data, such as the ingredient's own unit.
    - An unknown price is never shown as $0.
33. **Whatever the app saves, it can load.** Every state the app writes must pass its own validators, sync merge and backup import. The browser tests that change data end with a round trip through `validImport` and the sync merge.
34. **Test the family's own settings, not just the defaults.** Each release that touches the area is tested with:
    - a menu week that starts on a day other than Monday (each family chooses its own shopping day; never assume Monday);
    - English;
    - a phone whose time zone is not Sydney;
    - a currency other than AUD;
    - recipes with their own yield;
    - guests;
    - a second device syncing.
35. **Look before saying ready.** For any release with interface or data changes:
    - Run the audit sweep: `test:audit:browser` (taps every control on every screen in VI and EN, with empty and full data) plus a review of every changed place against rules 29–34.
    - List what was found in the release record.
    - Fix serious findings before asking for DEPLOY; list the rest for Henry.
36. **When Henry finds a bug, find its family.** Search the code for the same pattern everywhere, fix all of them in the same release, and add a test that would have caught each one.
