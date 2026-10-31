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
