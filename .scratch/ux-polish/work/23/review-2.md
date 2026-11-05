VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | rejection stands | Visual check in the running app needs a person at `pnpm tauri dev`. No commit after review.md touches `editor-theme.ts`, `styles.ts` or any CSS, so the headless render in commit 225585386 still describes what ships. Left to the owner before release; non-blocking. |
| 2 | nit | rejection stands | `theme-editor.logic.ts:302` still wraps the import in `withoutRetiredTokens`; it keeps the result true to `ThemeColors` and `theme-editor.logic.test.ts` pins it. |
| 3 | nit | rejection stands | `help/documentation/26-theming.md`: the whole Frontmatter section is gone; none of its rows named a token the app still has. |
| 4 | nit | rejection stands | `theme-validation.logic.ts:70` keeps empty groups; `buildTheme` spreads overrides per group, so `preview: {}` is a no-op. |

## Scope of this round

The commits after review.md was first added (1ed13cc1e) are db0c6b77b, 9edcbd815, c174fec96, 275bedf40, ca7dacdec and ac2e81f5c. Only 275bedf40 changes code. ca7dacdec reviewed it, and ac2e81f5c only appends the Resolution section. I re-read the 275bedf40 source diff: the fields come out of `theme.types.ts`, both built-in themes, `theme-builder.logic.ts:279` and the editor's Frontmatter group. `RETIRED_THEME_TOKENS` is skipped in `findInvalidThemeToken` and dropped by `withoutRetiredTokens` in `parseThemePackage` and `parseThemeFromImport`. In `src/lib`, a grep for `frontmatterBg|frontmatterBorder|lp-frontmatter-bg|lp-frontmatter-border` finds only `theme-validation.logic.ts`. The other hits are tests and the captured legacy fixture. Nothing touches src-tauri/, e2e/ or src/tests/lib/architecture/.

## Acceptance criteria re-checked

- [met] Owner decision (2026-11-05): with the callout type popover on the menu tokens, `frontmatterBg` / `frontmatterBorder` (`--lp-frontmatter-bg` / `--lp-frontmatter-border`) have no reader left, so `theme-css-contract.test.ts` "reads every themed variable a theme emits" fails. Remove both fields here: from `theme.types.ts`, both built-in themes in `theme.logic.ts`, `theme-builder.logic.ts`, the "Frontmatter" group in `theme-editor.logic.ts`, the `app.css` fallbacks if any, the theme snapshot and every test that names them. A saved or catalog theme that still carries the two keys must keep loading (the keys are ignored); add a test for that. The contract test passes again without any allowlist entry. — The source diff of 275bedf40 removes both fields everywhere listed, and the snapshot loses 4 lines. Retired-key loading tests are in theme-validation/theme-package/theme-editor logic tests. theme-css-contract.test.ts is unchanged and passes in the targeted run below.
- [met] Visual check in both themes, noted in the commit: wikilink autocomplete with a highlighted row and the callout type popover open — the commit body of 225585386 has the "Visual check, both themes" paragraph, and no later commit changes the rendered CSS. The app-window caveat is previous finding 1, left open as non-blocking.

## Findings

None open or new.

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 216 files, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/core/settings/ src/tests/lib/core/markdown-editor/setup/editor-theme.test.ts src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts src/tests/lib/radius-scale.test.ts`: exit 0, 32 files, 729 tests passed.
- The full suite and `pnpm build` were not run. They belong to deliver.
