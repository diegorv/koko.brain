VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `alpha()` in `src/lib/core/settings/theme-builder.logic.ts:80-95` now matches `color-mix(in srgb, X N%, transparent)` with `ALPHA_MIX` and scales N by the new alpha instead of wrapping. `mergeThemeWithDefaults` (`theme.logic.ts:60-81`) derives through `buildTheme`, the only caller of `alpha()`, so every derived token stays one level deep. The validator is unchanged and still refuses nesting. Tests: `theme-builder.logic.test.ts` "folds the alpha into an existing color-mix instead of nesting it" (`#ffffff 50%` x `4d` -> 15%, `oklch(...) 80%` x `80` -> 40%), and `theme-editor.logic.test.ts` "re-imports a theme whose color-mix source tokens were expanded and exported", which puts a color-mix in all four wrapped sources, expands with `mergeThemeWithDefaults`, exports and re-imports, asserting `toEqual({ ok: true, theme })`. Against the old `alpha()` this test would fail on `syntax.activeLine` (nested mix refused), so it guards the bug. Built-in themes are unaffected: the built-in round-trip test and `theme-css-contract.test.ts` still pass. |
| 2 | nit | resolved | `theme-editor.logic.ts:287` now reads `larger than ${MAX_THEME_FILE_LENGTH} characters`; the test asserts the same string. |
| 3 | nit | resolved | `theme-editor.logic.ts:296-301`: blank/missing name gives `Invalid theme file: missing "name"`, missing/null/array colors gives `Invalid theme file: "colors" must be an object`, a top-level array stays a parse error. Tests updated to the new messages, not weakened: the same inputs are still asserted refused, with a more specific message. `ThemeEditor.test.ts:68` still expects `could not parse` for malformed input and passes. |

## Acceptance criteria re-checked

- [met] Failing first: a test that every built-in theme's expanded colors pass the validator, and that export then import of every built-in theme round-trips unchanged. — The fix changes `alpha()`, which builds every built-in theme; "round-trips every built-in theme through export and import unchanged" and "accepts every token of every built-in theme" still pass (targeted run below).
- [met] Import refuses unknown groups and unknown token keys, and a file over a size cap; the theme editor shows the refusal with the offending token path (for example `preview.embedBg`) instead of the current generic message. — Size-cap message changed only in wording; "refuses a file over the size cap" and `ThemeEditor.test.ts` "shows the offending token path and leaves the draft untouched" pass.
- [met] Tests cover happy path, empty / null input, malformed JSON and each rejection class above. — The name/colors refusal tests keep every input and assert the new specific messages; malformed JSON still asserts `could not parse`.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on `theme-builder.logic.test.ts`, `theme-editor.logic.test.ts`, `theme-validation.logic.test.ts`, `ThemeEditor.test.ts`, `theme.logic.test.ts`: exit 0, 156 of 156 pass. `settings.service.test.ts` and `theme-css-contract.test.ts` (also import the builder): exit 0, 73 of 73 pass.
- The full suite and `pnpm build` were not run; deliver runs them.
- The fix commit touches only the files named in the previous findings plus `.scratch/remote-themes/work/01/review.md`; no scope creep, no test deleted or weakened, layer baseline untouched.

## Findings

1. nit, `src/lib/core/settings/theme-builder.logic.ts:80`: `ALPHA_MIX` repeats the `COLOR_MIX` grammar from `theme-validation.logic.ts:10` (capturing the percentage too). If one changes without the other, `alpha()` could again emit a value import refuses. The new re-import test would catch a drift for the four wrapped sources, so this is a note, not a required change; exporting one pattern from a shared place would remove it.
