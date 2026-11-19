# 16: Theme editor reports the label it lifts, and theme previews show the lifted colors

**Origin:** follow-ups filed by the main session from two deferred review findings: Issue 05 re-review round 2, findings 1 and 2 (`.scratch/color-audit/work/05/review-2.md:21-22`), and Issue 12 review, finding 7 (`.scratch/color-audit/work/12/review.md:20`).

**What to build:**

1. **Report what the lift changes** (`src/lib/core/settings/theme-builder.logic.ts`, `readabilityFailures`, around `:321`): it measures every pair on the fully lifted theme, including `primary` after the hover move (`fillUnderLabel`). When a typed `primaryForeground` fails on the typed `primary` and the hover move then moves `primary`, the label passes on the moved primary, so the editor reports `ui.primary` but not `ui.primaryForeground`, although the lift changes both (the reviewer's seeded probe: 43 of 2100 random overrides, e.g. Lavender Haze with primary `#a047b8` and label `#31dfd2`). Measure the `primaryForeground` on `primary` pair before the hover move and keep the hover branch as is.
2. **Optional, label at the limit** (`fillUnderLabel`, around `:383-395`): with a mid-grey override label the hover fill can stay under 4.5:1 or |Lc| 45 after 100 steps (8 of 2100 probe cases). The editor already warns. If it is cheap, move the label to black or white when the fill cannot reach; otherwise say in the commit why it stays.
3. **Theme list previews** (`src/lib/core/settings/sections/ThemePreview.svelte:21`): the preview cards paint the typed colors, while the app applies them lifted. Paint the lifted values (the same `withReadableContrast` the apply path uses), so a preview matches what the user gets.

**Size:** S

**Blocked by:** 05

**Status:** needs-triage

**Gate:** pnpm check + pnpm vitest run.

- [ ] Failing test first, `theme-builder.logic.test.ts`: a case in "reports exactly the tokens the lift changes" with Lavender Haze, primary `#a047b8`, label `#31dfd2`, expects both `ui.primary` and `ui.primaryForeground`; it fails today.
- [ ] A ThemePreview component test: a theme with a failing pair renders the lifted value, not the typed one.
- [ ] Frontend gate passes.

## Comments

- 2026-11-19, filed: needs-triage (item 2 is optional; the owner decides whether it is worth doing).
