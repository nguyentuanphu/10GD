# Proposed family-authored meal planner

Status: awaiting owner approval. No product implementation authorised by this plan. Release rule: no main merge or deployment until explicit owner DEPLOY approval for the reviewed release; see AGENTS.md.

## Proposed scope

- Enlarge the mobile bottom navigation: three primary items Today / Weekly Menu / Shopping plus More; icons 26–28 px, labels 13–14 px, minimum 56 px touch targets and safe-area support. Verify Vietnamese and English at narrow phone widths.
- Family-authored recipe database is the source for automatic generation. Keep the existing sample library separate and opt-in; preserve it and existing user data without silently deleting or overwriting recipes.
- Recipe fields: name, primary ingredients, preparation/method, one or more usage categories (Main dish, Side dish, Breakfast, Friday night, Weekends feast). Separate the usage category from dinner role (Soup, Savoury main, Stir-fried vegetable/side) so weekday dinner slots can be filled correctly.
- Support quantity, sale unit and recipe yield to produce a shopping list. Permit quick name/category entry, but flag missing quantities and exclude unknown costs rather than inventing them.
- Monday–Thursday: one Breakfast selection; Dinner contains 1 soup + 1 savoury main + 1 stir-fried dish. Friday: Breakfast plus a Friday night dinner selection.
- Weekend feast: one linked batch/plan covering Saturday dinner, Sunday breakfast/lunch/dinner and the next Monday breakfast. Separate servings per meal, one batch shopping requirement, track remaining portions. Do not blindly multiply a recipe by five or deduct pantry ingredients at every serving.
- Monday breakfast supplied by the preceding weekend must not be overwritten by generation of the next week. Use actual calendar dates and stable batch IDs; rebuild only the meal scope explicitly selected.
- Proposed unspecified Saturday breakfast/lunch: keep manual/blank until the owner chooses a rule. Do not add them to the feast automatically.
- After generation, add/remove/replace dishes per meal; preserve other dishes, locked/cooked meals, notes and attendance. Recalculate shopping, budget estimates and prep tasks. Removing a serving from a batch adjusts uncommitted quantities but does not undo already recorded cooking/consumption silently.
- Randomise only eligible family-authored recipes; avoid recently repeated dishes when enough candidates exist. If a required role has no recipes, show the gap and offer entry/manual choice. Do not substitute sample recipes silently.

## Review and acceptance

- Show the exact generated week and all five linked weekend meals including Monday in the next calendar week.
- Test custom quantity/yield changes, different attendance, add/remove dishes, insufficient recipe pools, regeneration with locks and linked Monday breakfast.
- Test one batch shopping calculation without double counting, cooking once versus serving repeatedly, and undo.
- Verify migration/backups and preservation of family data; clearly label historical cooked meals and unmeasured ingredients.
- Provide phone-width screenshots before asking for release approval. Plan approval authorises implementation only, not deployment.

## Owner decisions requested

1. Should Saturday breakfast/lunch remain manual, use Breakfast recipes and a normal lunch, or join the feast?
2. Is Weekend feast one large dish/batch for all five meals, or a bundle of several dishes to rotate across those meals?
3. For Monday–Thursday, does the three-dish rule apply only to dinner (proposed), or to breakfast too?

## Owner approval and implementation review

Owner approved the plan and automatic generation on 31 October 2026. Working interpretation announced before implementation: Saturday breakfast and normal three-dish lunch are automatic; one weekend batch covers the five specified meals; the three-dish rule applies to Mon–Thu dinner only.

Implemented on local branch `work/family-authored-menu-review`, without a remote push, merge or deployment. Current production remains unchanged. The family has not supplied actual authored recipes yet: browser verification uses clearly labelled QA records stored only in the local preview browser.

Review checks: family-only selection, insufficient category pools without sample fallback, breakfast/yield handling, Friday and Saturday schedules, five linked feast meals, next Monday preservation, pantry deduction once per batch, serving/undo, meal locks, custom ingredient hydration and backup validation. Phone-width browser QA confirms 28 px icons, 14 px tab labels, 66 px targets and no horizontal overflow. Example QA batch: 3.15 standard portions × 5 meals = 15.75 portions. Manual dish selection and per-meal portion multipliers remain editable.

## Release authorisation

After reviewing implementation evidence, the owner explicitly said “Deploy” on 31 October 2026, authorising publication of this reviewed family-menu release. This approval is specific to this release and does not authorise subsequent main merges or deployments.
