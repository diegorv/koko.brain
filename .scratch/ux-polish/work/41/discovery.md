# Issue 41 discovery

No `spec.md` in `.scratch/ux-polish/`. Issue 08 (success token) is already on main, so the snapshot base includes it.

## Files that change
- `src/lib/utils/color.ts:1-12` `parseRgba`: add the `oklch(L C H [/ A])` branch. L number or %, C number or % (of 0.4), H number with optional `deg`, alpha number or %. L and alpha clamp to [0,1], C to >= 0 (CSS clamps the same way). Convert `[L, C cos h, C sin h]` through `oklabToHex` (gamut clamp) and read the hex back. Doc comments at :1, :46-47, :56-57 say "hex or rgb()" and gain oklch.
- `src/tests/lib/utils/color.test.ts`: new failing cases from the Issue. The oklch-as-null cases at :28 and :40 are rewritten to oklch-parses cases; the other oklch-as-unparseable cases (:91 ensureContrast, :105 flatten, :144 mixColors) switch to `hsl(...)`, which stays unparseable (hsl is out of scope).
- `src/tests/lib/core/settings/theme-builder.logic.test.ts:249-262`: skip list becomes `toEqual([])`; the `#242835` hand check (comment, accent pin, warning check at :260-262) goes. New `it` asserts the three Default tokens are hex and >= 4.5:1 on `fileExplorerBg` / `rightSidebarBg` / `statusBarBg`.
- `src/tests/lib/core/settings/theme-builder.logic.test.ts:76-79` "falls back to the first hue when a palette mix cannot be computed" uses oklch as the unmixable value; switch to `hsl(...)`.
- `src/tests/lib/core/settings/theme.logic.test.ts:94-100` "treats an editor background it cannot parse as dark" uses oklch; switch to `hsl(...)` so it still tests the unparseable branch. Comment `src/lib/core/settings/theme.logic.ts:36` ("such as oklch") becomes "such as hsl()".
- `src/tests/lib/core/settings/__snapshots__/theme-snapshot.test.ts.snap`: regenerated; expected diff is only `--file-explorer-muted-fg`, `--right-sidebar-muted-fg`, `--status-bar-fg` of Default.

No change to `theme.logic.ts` override values (the builder's final pass lifts them).

## Plan
1. Failing color tests -> implement oklch branch -> green.
2. Failing theme-builder skip-list test + new Default-token assertion -> green (no source change needed after step 1) and fix the two tests that used oklch as "unparseable".
3. Regenerate snapshot, check diff is only the three tokens.
4. Targeted checks: `pnpm check`, color / theme-builder / theme / theme-snapshot / theme-css-contract / mermaid-widget tests.

## Prior-art tests
- `color.test.ts` existing ensureContrast/contrastRatio cases; `theme-builder.logic.test.ts` "holds for every pair".

## Risks
- `selected: oklch(0.28 0.025 272)` (Default) is now readable as a background: `warning@fileExplorerAccent:3` is checked for real. Warning already passes on `#242835` (the old hand check), so no token moves.
- `ensureContrast` on a translucent oklch fg returns an opaque hex (alpha dropped), same as `rgba()` input today. No built-in token hits this.
- `isDarkColor` now reads oklch editor backgrounds (mermaid theme, elevation vars): intended per the Issue's Notes.

## Defaults taken
- Alpha may be a number or a percentage; `none` and other angle units (rad, turn) stay unparseable.
