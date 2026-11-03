VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `DEFAULT_APPEARANCE` (`src/lib/core/settings/theme.logic.ts:308-313`) now carries `builtinsFromCode: true` and `exBuiltinsMigrated: true`. The no-file, empty-file and catch branches of `loadSettings` (`settings.service.ts:35-52`, `:168`) save `structuredClone(DEFAULT_SETTINGS)`, so they now persist both flags. Regression check: the saved-file path passes `parsed.appearance ?? {}` straight to `loadAppearance` (`settings.service.ts:112`) and nothing else spreads `DEFAULT_APPEARANCE` into a saved appearance (`normalizeSettings` does not touch `appearance`), so an existing vault without the flags still runs both migrations. The new `it.each` in `settings.service.test.ts:942-965` covers all three branches. Mutation probe: I deleted `exBuiltinsMigrated: true` from the defaults and all three cases failed (3 failed, 72 passed), then restored the file. |
| 2 | minor | rejection stands | Verified on main: `normalizeAppearance` split an edited built-in into "(edited)" only when `!raw.builtinsFromCode && !PRESET_THEMES.includes(builtin)`. Sakura and Twilight Violet were not presets, so any load since f9aca6d9 (Fri Oct 30 2026) already split such an edit. The ADR-0035 consequence (`docs/adr/0035-remote-theme-catalog.md:36`) states the loss, the date and the narrow window correctly. Telling an edit apart would need those colors back in app code, which criterion 4 removes. This is still an owner choice, and the ADR records it. |
| 3 | nit | resolved | `settings.service.test.ts:937-938` parses the last `writeTextFile` payload and asserts `appearance.exBuiltinsMigrated === true`. |
| 4 | nit | resolved | `help/documentation/26-theming.md:67` now says "The others leave your theme list." |

## Acceptance criteria

- [met] The migration runs once, gated by an appearance flag next to the existing `builtinsFromCode` one; a second load does not re-run it or touch themes installed later. — `exBuiltinsMigrated` gates `migrateExBuiltins` (`theme-package.logic.ts:340`). Saved vaults get it from `loadAppearance` and fresh or fallback vaults get it from `DEFAULT_APPEARANCE`. The three new `settings.service.test.ts` cases install and activate Sakura 1.0.3 in a fresh vault, reload, and get exactly one unchanged package. They fail when the default flag is removed (mutation probe).
- [met] The catalog no longer shows "Built-in" for the 22 (Issue 03's transitional state goes away); a fresh install of the app has exactly the two built-ins until the user installs more. — The fix leaves `DEFAULT_APPEARANCE.themes` as `[KokoBrain Default, Lavender Haze]` (`theme.logic.test.ts:274-277`). The fresh-install flag gap is now closed (see finding 1).
- [met] Docs that list or describe the built-in themes (including the theming help page) are updated; the ADR from Issue 03 gains the migration rule. — The help-page wording is fixed at `26-theming.md:67`. ADR-0035 gains the consequence for a pre-flag Sakura/Twilight Violet edit.

## Findings

None open or new. The fixes touch only `theme.logic.ts` (the two flags plus the JSDoc that explains them), two test files, the ADR and the help page. There is no scope creep, and no test was weakened or deleted.

## Checks run (this review)

- `pnpm check`: exit 0, 0 errors and 0 warnings.
- `pnpm vitest run src/tests/lib/core/settings src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`: exit 0, 26 files and 622 tests passed.
- Mutation probe on `theme.logic.ts` (reverted, worktree clean afterwards): the three new cases fail without the default flag.
- Not run: the full suite, `pnpm build` and E2E. Deliver runs those.
