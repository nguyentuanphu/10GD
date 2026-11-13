# Lessons

Each lesson records what went wrong, what it cost, and the habit and rule that prevent it. Newest first. All dates are Sydney time.

## 13 Nov 2026: re-check of every audit fix (Henry: "different chats … may create mistakes or miss to fix errors")
1. **A guarded call hid a function that does not exist.**
   - What happened: the S2 fix called `receiptWeekStart(record)` behind `typeof receiptWeekStart==='function'`. That function lives inside the IIFE of `receipt-ui.ts`, so the guard was always false and the old "week on screen" path ran. Only the new browser test showed it. The same pattern had hidden `ingredientName` (never defined) since v1.7.1, so EN taste labels showed Vietnamese names.
   - Habit: a `typeof x==='function'` guard is for load order, not for "maybe it exists". Check the name is global (top-level in a non-IIFE file, or set on `globalThis`), and add a test that fails when the fallback runs.
2. **"Fixed" in one helper's file, missed in the twin.** The re-check found the price form in Tiền tệ & giá still saving a price for the first ingredient (twin of A15/C25), the receipt total reader still at 5 digits (twin of L6's line fix), the receipt-match reasons still in AUD (twin of B13), and the mark-bought path still on the screen's week (twin of the receipt-check sheet). Rule 29 applies to every fix; grep for the same helper or regex before calling it done.
3. **A test compared the app with itself.** `extras-audit` checked A12 against the button's aria-label, the same source the app used, so it could never fail. Tests compare with what the family sees (`innerText`).
4. **The sweep skipped a control by accident.** Its sign-in filter `/log-?in/` matched `extra-catalog-ing`. Skip filters need word ends.
5. **The lead ruled out the real cause.**
   - What happened: the intermittent Viết món amount loss was blamed on test timing; the lead had written off the sheet keep-in-place handler as "scrolls only". The helper's event trace showed the late scroll (250 ms after "+ Thêm nguyên liệu") moved the suggestion out from under the finger, so the pick was lost and the amount went into the name. It had been there since b860268 and showed on CI about 1 run in 10.
   - Habit: "it only scrolls" is not harmless — anything that moves the page after a tap can move a target under the finger. Trace events in an in-page array (console logging changes timing), and treat a test that fails sometimes as a real bug until the trace says otherwise.

## 13 Nov 2026: v1.7.19 merge and CI
1. **A wording fix crashed start-up on a new device.**
   - What happened: the lead agent wrapped the planner banner in `tr()`. The planner is drawn once during start-up, before `language.js` loads, so a new device opening on Thực đơn saw “Chưa mở được Bếp Nhà”. Only `test:menu-reactions` caught it, on CI.
   - Habit: in `app.ts` render paths use `uiText(vi,en)` (guarded), never bare `tr()`. Enforced by the new `test:fresh-start:browser` (every screen, nothing stored).
2. **Helper agents' tests were green; the merged branch was not.**
   - What happened: W5's general sheet keep-in-place passed W5's own suite but broke the unit picker, receipt lines and Viết món amounts (a typed “2” was lost); none of those suites was in W5's run, and every CI run on the merged code was cancelled by the next push.
   - Habit: after merging helper work, run the suites of every screen the change can reach, not only the helper's; let one CI run finish before pushing again when nothing urgent is waiting (rules 30, 35).
3. **Old tests still expected the old behaviour after an owner decision.**
   - What happened: the spoon-amount decision and the dish-sheet redesign changed behaviour; W3 updated its own suites, but `recipe-ingredients` still expected a spoon line as an amount and the old edit button.
   - Habit: when a decision changes behaviour, grep all tests for the old selector or wording (rule 29 applies to tests too).

## 12 Nov 2026: the v1.7.18 release and the whole-app audit
1. **Changed one place and left its twins.**
   - What happened: the buying-unit sheet changed on Đi chợ, but Viết món kept the old list.
   - Habit: list every related place before coding. Enforced by rule 29 and `release-check` §1.
2. **Trusted helper agents' reports.**
   - What happened: merged helper work without opening the related screens myself.
   - Habit: the lead agent checks every changed screen itself. Enforced by rule 30.
3. **Buttons that lied.**
   - What happened: "Đồ trong tủ (27)" opened an empty sheet, and two buttons showed different numbers.
   - Habit: every count equals what it opens; no empty sheets. Enforced by rule 31 and `test:pantry-check:browser`.
4. **Silent defaults.**
   - What happened: a whole rooster was saved as "1 g", and unknown prices were saved as $0.
   - Habit: unknown stays unknown, and the family picks. Enforced by rule 32 and the audit sweep's form check.
5. **States the app could not reload.**
   - What happened: guests above 30 portions and GBP receipts were rejected by the app's own validator, which stops sync and backup.
   - Habit: round-trip `validImport` in tests. Enforced by rule 33.
6. **Tested only the defaults.**
   - What happened: a menu week starting on Saturday or Sunday broke guests and search; the device time zone was shown instead of Sydney.
   - Habit: test families' own settings. Enforced by rule 34.
7. **Privacy text changed without asking.**
   - What happened: privacy section 7a went live as part of a feature Henry had approved, without his answer on the wording.
   - Habit: ask first, with the exact wording. Enforced by rule 28.
8. **Looked only where we changed.**
   - What happened: no whole-app sweep before saying "ready".
   - Habit: run `test:audit:browser` and review before every release. Enforced by rule 35.
9. **Fixed the report, not the pattern.**
   - What happened: the "1 g" bug lived in three more places.
   - Habit: find the bug's family and fix all of it. Enforced by rule 36.
