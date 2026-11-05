# Issue 23 discovery

No `spec.md` in `.scratch/ux-polish/`; the Issue is the source. Repeats Issue 22's pattern (`work/22`): token values in CodeMirror theme specs, rule strings read back in the tests, ratchet in `src/tests/lib/radius-scale.test.ts`. Differences below.

## Files that change

- `src/lib/core/markdown-editor/setup/editor-theme.ts:66-76`
  - `.cm-tooltip`: add `borderRadius: 'var(--radius-md)'`, `boxShadow: 'var(--shadow-md)'`. No `overflow`.
  - autocomplete block: `& > ul` `padding: '4px'`, `& > ul > li` `borderRadius: 'var(--radius-sm)'`; aria-selected rule kept.
- `src/lib/core/markdown-editor/extensions/live-preview/styles.ts:483-514`
  - popover: `background: var(--popover)`, `color: var(--popover-foreground)`, `border: 1px solid var(--border)`, `borderRadius: var(--radius-md)`, `boxShadow: var(--shadow-md)`.
  - option: `borderRadius: var(--radius-sm)`; option hover: `background: var(--accent)`, `color: var(--accent-foreground)`.
- `src/tests/lib/core/markdown-editor/setup/editor-theme.test.ts`: tooltip chrome tests through `themeRule()`.
- `src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts`: popover/option tests through `exactRule()` (:175).
- `src/tests/lib/radius-scale.test.ts:203`: drop the `styles.ts` entry (2 -> 0).

## Plan

1. Red: both test files; run, see them fail.
2. Green: the two style edits and the baseline line; run the three test files.
3. Visual check: render the emitted CSS (both themes' tokens from `src/app.css`) with autocomplete and popover markup in headless Chromium, read the screenshots, note it in the commit.
4. Targeted checks: `pnpm check` and the three test files.

## Specificity (the one thing the Issue text does not cover)

CodeMirror's autocomplete base theme sets `padding: 0` on `.ͼ1 .cm-tooltip.cm-tooltip-autocomplete > ul` (0,3,1). A theme rule keyed `.cm-tooltip-autocomplete` emits `.ͼN .cm-tooltip-autocomplete > ul` (0,2,1) and loses, so the 4px padding would never apply. Default taken: key the autocomplete block `.cm-tooltip.cm-tooltip-autocomplete` (same selector as the base theme; the theme is mounted after it, so it wins on order). This raises the existing aria-selected rule from (0,3,2) to (0,4,2), which only makes it beat the base `&dark ... li[aria-selected]` (0,3,2) on specificity as well as order. The visual check confirms the padding applies.

## Owner decision (retry): drop `frontmatterBg` / `frontmatterBorder`

`theme-css-contract.test.ts` "reads every themed variable a theme emits" fails on main+branch: nothing reads `--lp-frontmatter-bg/-border` after the popover move.

- Remove the fields: `theme.types.ts:171-172`, `theme.logic.ts:204-205,304`, `theme-builder.logic.ts:279`, the "Frontmatter" group `theme-editor.logic.ts:157-160`. `app.css` has none. Snapshot `theme-snapshot.test.ts.snap:62-63,202-203` regenerated.
- Keep old themes loading. Saved user themes already drop unknown keys (`mergeThemeWithDefaults` / `pickTokens`). Catalog and installed packages do not: `parseThemePackage` runs `findInvalidThemeToken` on `overrides`, which refuses an unknown key, so the package would be skipped, and `buildTheme` spreads overrides as-is. The same check refuses an exported theme file on import (`parseThemeFromImport`).
- Default taken: `RETIRED_THEME_TOKENS` in `theme-validation.logic.ts`. `findInvalidThemeToken` skips those keys, and `withoutRetiredTokens()` drops them in `parseThemePackage` (overrides) and `parseThemeFromImport` (colors), so no retired value reaches CSS.
- Tests that name the keys: `theme.logic.test.ts:347` (Lavender popover vs blocks; its `frontmatterBg` equals `codeblockBg`, so the check loses nothing), `theme-package.logic.test.ts` `savedVars` (the legacy fixture still carries the keys and stays as captured data; the expected CSS vars leave out the two retired ones).
- `help/documentation/26-theming.md:268-282`: the "Frontmatter" token table lists no live token after this (the other nine rows were already stale); the section goes.
- New tests: validation skips retired keys; a package / catalog entry / installed package with the keys loads without them; an import with the keys parses without them; a saved user theme with them loads and emits no `--lp-frontmatter-*` var.
