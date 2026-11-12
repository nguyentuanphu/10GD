# Repo notes (build and test facts)

- **Build:** `npm run build` compiles `src/frontend/*.ts` to `dist/*.js` and `src/tests/*.cts|mts` to `tests/`. The browser test scripts do NOT rebuild, so build first.
- **Browser tests:** they serve `dist/` through Playwright `page.route` on `https://kitchen.test`, with service workers blocked. Device-only mode is set through localStorage (`bep-local-locked`, `guest/bep-language`, `bep-theme-mode`). See `src/tests/unit-picker-browser.test.cts`. App globals (`state`, `currentWeek()`, `save()`, `render()`, `closeModal()`) seed data.
- **Screenshots:** test runs overwrite screenshots under `docs/reviews/**`. Restore with `git checkout -- docs/` and `git clean -fd docs/reviews` (exclude the current release folder) before committing.
- **Known local-only failure:** `test:v1713:browser` (narrow VI order) fails in the cloud sandbox and passes on GitHub CI; it fails on `main` too.
- **Fixed race, 12 Nov 2026:** `test:voice-default:browser` used to fail locally and once on CI ("0/0 MB"). The small fake files kept reporting progress after the chip appeared. The test now waits for the progress to settle before setting its numbers. Lesson: an "environmental" failure is a race until proven otherwise; find it.
- **Cancelled CI:** a CI run on a superseded commit is cancelled. It reports "npm run test:all failure" with 0 failed jobs; that is not a real failure. Check the jobs with `gh api repos/nguyentuanphu/10GD/actions/runs/<id>/jobs`.
- **CI layout:** CI splits every `test:all` step into parallel jobs, read from `package.json`, so a new suite is picked up automatically once it is in `test:all`.
- **Weeks:** weeks are keyed by the family's start day, `planStartOf(state,date)`. Never use Monday.
- **Push links:** a push notification link must match the same pattern in three places: `src/netlify/lib/push.mts` (server; unknown links fall back to `/#shopping`), `src/frontend/sw.ts` (falls back to `/#today`) and `src/frontend/household-ui.ts` `pushOpenHash`.
- **Bootstrap:** `src/frontend/bootstrap.ts` holds the ordered script list. A new frontend module must be added there.
- **Skill copies:** the henry-master skill seen in sessions is a synced copy of Henry's claude.ai skill. Local edits to it do not persist; Henry updates it on claude.ai.
