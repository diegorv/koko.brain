VERDICT: APPROVED

Review of `git diff main...HEAD` (2567ce6ef..1e74d16e7) on branch issue/19-elevation-shadow-ring-scrim-tokens. No `spec.md` exists for ux-polish; the Issue is the spec.

## Acceptance criteria

- [met] Failing first, in `src/tests/lib/core/settings/theme.logic.test.ts`: `themeColorsToCssVars(KOKOBRAIN_DEFAULT_THEME.colors)` has the five dark values; Lavender Haze has the light values tinted from its foreground (for example `--elev-scrim` is `#30284040`); a theme whose `editorBg` is `oklch(0.3 0.02 270)` gets the dark values; every key that existed before is unchanged — theme.logic.test.ts:69-117 covers all four cases (Default -> ELEV_DARK, Lavender -> `#302840` + 0f/1a/29/14/40, oklch editorBg -> ELEV_DARK, every flattened token unchanged across BUILTIN_THEMES). Probe: with main's `theme.logic.ts` restored in place, the file fails 3 tests (dark, light, oklch) and the "unchanged" case passes, as expected; restored afterwards, worktree clean.
- [met] `src/tests/lib/core/settings/theme-css-contract.test.ts`: the "static fallback in :root and .dark" case also covers the five `--elev-*` names, and fails if `app.css` lacks them — theme-css-contract.test.ts:62-78 adds the five names. Probe: branch `theme.logic.ts` with main's `app.css` makes that case fail (1 failed / 4 passed); with the branch `app.css` it passes.
- [met] The theme snapshot (`src/tests/lib/core/settings/__snapshots__/theme-snapshot.test.ts.snap`) is updated on purpose; its diff adds exactly the five keys per theme and changes nothing else — the snapshot diff is two hunks of five `+` lines each (`--elev-ring`, `--elev-scrim`, `--elev-shadow-1/2/3`), Default with the dark constants, Lavender with `#302840` tints, no `-` lines.
- [met] After `pnpm build`, the built CSS defines `--shadow-md` as a variable, `.shadow-md` reads `--elev-ring`, and `.bg-scrim` exists; the commit message records the grep — my own `pnpm build` (exit 0) and grep of `build/_app/immutable/assets/0.CLkyb1fD.css`: `@layer theme{:root,:host{` holds `--shadow-md:0 0 0 1px var(--elev-ring), 0 4px 12px -2px var(--elev-shadow-2), 0 2px 4px -2px var(--elev-shadow-1)` (xs, sm, xl too); `.shadow-md{--tw-shadow:0 0 0 1px var(--tw-shadow-color,var(--elev-ring)), ...}`; `.bg-scrim{background-color:var(--elev-scrim)}`. Commit 8384e6839's Behavior section records the same three greps.
- [met] The three primitive files carry the class swaps above and no other change — each of dialog-overlay.svelte (`bg-black/50` -> `bg-scrim`), dialog-content.svelte (`shadow-lg` -> `shadow-xl`), context-menu-sub-content.svelte and dropdown-menu-sub-content.svelte (`shadow-lg` -> `shadow-md`) has a one-line diff touching only that token. `grep -rn shadow-lg src` and `grep -rn bg-black/ src/lib` find nothing.

## Findings

1. nit, src/lib/core/settings/theme.logic.ts:71-73: the `colors.ui?.editorBg` guard and its comment ("`applyTheme` accepts partial color groups") defend an input the types rule out. `applyTheme(theme: Theme)` takes full `ThemeColors`, and every real source of theme colors goes through `mergeThemeWithDefaults` (theme.logic.ts:376, theme-package.logic.ts:373, ThemeEditor.svelte:112), so only the `as any` fixtures in theme.service.test.ts:110/123 reach this branch. It is harmless and kept the existing tests unchanged, but the comment says something about `applyTheme` that only casts make true. Fix (optional): reword the comment to "partial colors from cast test fixtures", or drop the guard and give those fixtures an `editorBg`.
2. nit, src/tests/lib/core/settings/theme.logic.test.ts:106-116: the "every theme token unchanged" case rebuilds the flattening with its own copy of the group-prefix map, so it partly mirrors the implementation. The snapshot test pins the same keys independently, so coverage holds; no change needed.

## Other checks

- Typecheck: `taskpolicy -c background pnpm check` exit 0 (215 files, 0 errors, 0 warnings).
- Tests my verdict rests on, run by me (exit 0, 6 files, 235 tests): `src/tests/lib/core/settings/theme.logic.test.ts`, `theme-css-contract.test.ts`, `theme-snapshot.test.ts`, `theme.service.test.ts`, `settings.service.test.ts`, `theme-package.logic.test.ts` (every test file that names `themeColorsToCssVars`, `applyTheme` or `applyActiveTheme`). The full suite is deliver's to run.
- `pnpm build` probe: exit 0. The built `.shadow-lg` rule and Tailwind-default `--shadow-lg` remain. `--shadow-lg` is unchanged as the Issue specifies, and no `shadow-lg` class is left in `src/`, so the rule comes from source detection outside `src/`.
- Layer rule: `theme.logic.ts` gains only `#lib/utils/color.js` (core -> utils, allowed); `layer-baseline.json` and `BASELINE_SIZE` are untouched.
- Soft note (shared theme-mode helper): none exists on main (only mermaid-widget.ts:17 calls `isDarkColor` locally), so the local call is correct.
- Scope: no changes outside the Issue's files and its own `.scratch/ux-polish/work/19/` records. Not checked: the look in the running app.

## Resolution

1. Fixed: reworded the comment at theme.logic.ts:71-73 to say that real themes are complete via `mergeThemeWithDefaults` and only cast partial colors (the applyTheme edge-case tests) reach the guard. The guard stays, so the existing theme.service.test.ts edge-case tests stay unchanged.
2. No change: the reviewer marked it as needing none; the snapshot test pins the keys independently.
