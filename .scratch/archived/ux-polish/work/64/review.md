VERDICT: APPROVED

## Acceptance criteria

- [met] Theme snapshot tests are updated on purpose and show H2-H5 derived from the ramp in both themes — `git diff main...HEAD` changes exactly 8 snapshot lines (`--syntax-heading2..5` in "KokoBrain Default is unchanged" and "Lavender Haze is unchanged"); H1/H6 and every other token are untouched. The new test `theme-builder.logic.test.ts:151-159` pins each built-in's H2-H5 to `mixColors(heading1, mutedForeground, i/5)`, the same formula as `headingAt` (`theme-builder.logic.ts`, inside `buildTheme`), so a re-added override fails it. Snapshot values match that formula (Default #d6a3ef/#c3a0df/#b09dd0/#9d9ac0, Lavender #674d9e/#665294/#655689/#64597f).
- [met] The contrast guard still passes for every heading level — `READABILITY_PAIRS` includes heading1..heading6 at 3:1 on `editorBg`; "holds for every pair in every built-in theme" (`theme-builder.logic.test.ts:239`) passes in my run. Independent probe on the snapshot values: Default H1-H6 range 7.23 to 4.55:1 on #2a2e3d, Lavender 6.05 to 5.60:1 on #F3F0F8, all above 3:1.

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/core/settings src/tests/lib/core/markdown-editor/highlight-styles.test.ts src/tests/lib/features/canvas/canvas-markdown-css.test.ts`: exit 0, 31 files, 685 tests passed. The test verdict rests on these files, chiefly `theme-builder.logic.test.ts`, `theme-snapshot.test.ts`, `theme.logic.test.ts`, `theme-css-contract.test.ts` and `theme.service.test.ts`.
- Full suite and `pnpm build` not run: deliver's job.
- Searched the repo for the removed hex values: the only remaining copies outside `theme.logic.ts` shared tokens are the `src/app.css` fallbacks (finding 2). No docs, help pages or E2E specs reference the old heading colors.
- `mergeThemeWithDefaults` fills a custom theme's missing tokens from its own derived core (`pickTokens(..., derived.syntax)`), so saved custom themes that omit H2-H5 are not affected by the default theme change; custom themes with explicit H2-H5 keep them.
- Scope: only the eight override lines, one test and the snapshot changed. No layer baseline or composition-root changes.

## Findings

1. minor — src/lib/core/settings/theme.logic.ts:283 (Lavender Haze) — With H1 #6848A8 and muted #645c74 both mid-dark purples of similar luminance, the Lavender ramp is nearly flat: adjacent heading levels differ by a contrast ratio of only 1.01 to 1.02 (Default: about 1.09 to 1.10), so in Lavender H1-H6 read as practically one color and level is told apart by size and weight alone. This is what the Issue asked for (`headingAt`, no formula change), so not a blocker. Fix: include it in the owner visual check the Issue already calls for; if the owner wants visible steps, a follow-up Issue can widen the Lavender ramp (a different H6 endpoint or a hue step), not this one.
2. nit — src/app.css:259-262 — The static `.dark` fallback block still sets `--syntax-heading2..5` to the old rainbow (#5DCCFF, #42E8A8, #FFD93D, #FF8C69). These apply only before `applyTheme` writes the inline variables, and the block already drifts from the Default theme in about 23 other tokens, so the visible effect is at most a first-paint flicker. Fix: optional; update those four lines to the ramp values if the fallback is meant to mirror Default, or leave it with the rest of the pre-existing drift.

## Resolution

1. No code change, by design: the flat Lavender ramp is what `headingAt` gives for this Issue's scope. Left for the owner visual check the Issue already calls for; a wider Lavender ramp would be a follow-up Issue.
2. Fixed: `src/app.css` `.dark` fallback `--syntax-heading2..5` now carry the Default theme's ramp values (#d6a3ef, #c3a0df, #b09dd0, #9d9ac0, the snapshot values), so first paint no longer shows the removed rainbow. The fallback's H1 (#E8A5FF) and H6 (#8a96b1) already match Default's ramp endpoints. The other drifted tokens in that block are out of scope.
