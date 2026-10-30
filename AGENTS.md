# Owner release rules — Bếp Gia Đình / 10GD

Effective 31 October 2026 (Australia/Sydney). These rules supersede all earlier user permission to merge or deploy automatically.

1. Do not merge into, push directly to, reset, or otherwise modify `main` unless Henry explicitly authorises DEPLOY for the specific reviewed release. A prior release's approval does not carry forward.
2. Plan approval, “go ahead”, “proceed”, completion of tests, a successful preview build, and previous merge requests are NOT deploy approval. Mentioning or asking about deploy is not approval.
3. Before deploy approval, keep implementation on a separate feature branch. Local QA is allowed. Do not trigger production deployment or use another branch/hosting path to bypass the approval gate. Do not enable auto-merge.
4. If asked for a plan, provide the concrete scope, meal schedule, data implications, verification and unresolved decisions, then wait for plan approval before changing product code.
5. Before requesting deploy approval, finish the authorised implementation, checks and review evidence, and identify the exact commit/PR and limitations. Do not claim that code merged to main has only been previewed.
6. Preserve family-authored recipes and existing family data. Do not replace or delete them with generated sample recipes. Do not invent missing recipe quantities.

This is an agent workflow rule, not a claim that GitHub branch protection or Netlify configuration has been changed. No hosting settings were changed when recording this rule.
