# Lessons

Each lesson records what went wrong, what it cost, and the habit and rule that prevent it. Newest first. All dates are Sydney time.

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
