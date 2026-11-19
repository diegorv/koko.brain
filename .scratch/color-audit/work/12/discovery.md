# Discovery: Issue 12, user themes lifted on apply, editor warns

No `spec.md`; the Issue, `report.md` and `research/workflow-result.json` (keys `theme.logic.ts:105`, `theme-builder.logic.ts:105`, `ThemeColorRow.svelte:52`, `utils/color.ts:14`) are the spec. Issue 05 has not run, so item 3's pairs are added here.

## Files that change
- `utils/color.ts:14-34` `parseRgba`: add `#rgba`, `hsl()`/`hsla()` (comma or space syntax, optional `deg`, alpha number or %), space/slash `rgb(r g b / a)` (and % channels/alpha). Doc comments of `isDarkColor`/`contrastRatio` list the new forms.
- `core/settings/theme-builder.logic.ts:105-170` `READABILITY_PAIRS`, 4.5:1: `settingsText` on `settingsHoverBg`, `settingItemBg`, `settingsSidebarBg`; `mutedForeground` on `settingsDialogBg`, `settingsHoverBg`, `settingItemBg`; `primary` on `settingsHoverBg`, `settingItemBg`; `destructive` (as text) on `settingsDialogBg`, `settingItemBg`. The `primary` and `destructive` pairs sit before `primaryForeground`/`destructiveForeground`, so those are measured on the lifted fill.
- Same file `:173` `withReadableContrast` exported; new `readabilityFailures(colors)`: per token (`group.key`) the worst pair its own colors fail, `{ bgGroup, bgKey, ratio, min }`, measured like the lift (bg flattened over `editorBg`), unparseable pairs skipped.
- `core/settings/theme.logic.ts:60-75` `themeColorsToCssVars`: complete colors (have `ui.editorBg`) go through `withReadableContrast` before mapping and `elevationVars`; the input object is not touched. Partial cast colors keep the as-is path. This is the single path for `applyTheme` and `applyActiveTheme` (`theme.service.ts:47,80`), so saved, edited and imported themes and the editor's draft preview are all lifted; the saved file is never rewritten. `:36` comment about hsl() updated.
- `sections/ThemeEditor.svelte`: `$derived(readabilityFailures(draftColors))`, passes each row its failure.
- `sections/ThemeColorRow.svelte:52`: optional `failure` prop renders a line "R:1 on <Bg label>, needs M:1. The app shows it lifted." (ratio floored to 2 decimals); swatch edge `border-settings-text` (settingsText is 4.5:1 on the dialog, so the edge is 3:1+).

## Tests (prior art)
- `src/tests/lib/utils/color.test.ts`: failing first, new forms through `flatten`/`isDarkColor`; unparseable still null. Existing "unparseable" examples using `hsl(200 50% 50%)` switch to `hwb(...)`/`var()` (premise changed, not weakened).
- `theme.logic.test.ts` `themeColorsToCssVars`: user theme with a failing `mutedForeground` gets a lifted var, input deep-equals its clone. `:97` unparseable editor bg example changes from `hsl()` to `var(--x)`. Existing "emits every theme token unchanged" pins that built-ins are not re-lifted.
- `theme-builder.logic.test.ts`: `readabilityFailures` (none on built-ins, failing token with ratio/min, unparseable skipped); new Settings pairs lift a `buildTheme` override; destructive text lift keeps `destructiveForeground` at 4.5. `:78` palette-mix fallback example `hsl()` -> `var()`.
- `ThemeEditor.test.ts` (mount pattern there): a theme with a failing token shows its warning with the ratio; a built-in shows none.
- Snapshot `theme-snapshot.test.ts` updated on purpose if the new pairs move built-in tokens.

## Defaults taken
- Lift at apply for every theme, not only user ones: built-ins and catalog themes already pass every pair, so it is a no-op there (pinned by the existing test).
- Warnings measure the user's own colors, not the lifted ones; a token failing several pairs shows the worst (lowest ratio/min).
- `linear-calendar.logic.ts` keeps its own `hslToHex` (out of scope).

## Risks
- Destructive lifted to 4.5 on dark Settings surfaces can flip `destructiveForeground` to dark text on destructive buttons (same choice Issue 05 records). Issue 05 rebases over the new pairs.
- `withReadableContrast` now runs on every draft change in the editor (about 100 pairs, cheap).
