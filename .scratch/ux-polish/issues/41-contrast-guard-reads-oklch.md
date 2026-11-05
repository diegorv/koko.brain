# 41: The theme contrast guard reads oklch, so Default's muted sidebar text reaches 4.5:1

**What to build:** `parseRgba` (`src/lib/utils/color.ts:2-12`) reads only hex and `rgb()`, so `contrastRatio`, `ensureContrast`, `flatten`, `mixColors` and `isDarkColor` treat oklch as unparseable. The Default theme overrides `fileExplorerMutedFg`, `rightSidebarMutedFg` and `statusBarFg` (`src/lib/core/settings/theme.logic.ts:125,132,142`, all `oklch(0.55 0.06 268)`) therefore pass through `withReadableContrast` (`theme-builder.logic.ts:156`) unchanged, at roughly 2.8 to 3.2:1 on their panes, the dimmest common text in the main theme. The test records them as expected skips (`src/tests/lib/core/settings/theme-builder.logic.test.ts:233-238`). Teach `parseRgba` the CSS `oklch(L C H)` form with an optional `/ alpha`: L as a number or a percentage, C as a number (a percentage is of 0.4), H in degrees with an optional `deg`. Convert through OKLab (`a = C cos h`, `b = C sin h`) with the existing `oklabToHex` path, which clamps to sRGB as it does today. The builder's final pass then lifts the three tokens itself; do not hand-edit the override values.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first, `src/tests/lib/utils/color.test.ts`: `isDarkColor('oklch(0.2 0.02 270)')` is true and `isDarkColor('oklch(1 0 0)')` is false; `contrastRatio('oklch(0.55 0.06 268)', '#262938')` is a number below 4.5; `ensureContrast('oklch(0.55 0.06 268)', '#262938', 4.5)` returns a hex at 4.5:1 or more; a percentage lightness and a `/ 0.5` alpha parse; `oklch(foo)` stays null. The two existing cases that pin oklch as null (about lines 28 and 40) are rewritten on purpose, not deleted.
- [x] Failing first, `theme-builder.logic.test.ts` "holds for every pair in every built-in theme" (about line 218): the expected-skip list (233-238) becomes `expect(skipped).toEqual([])`, and the hand check of warning on `#242835` (239-241) goes, because warning on the oklch selected row is now a checked pair. `failures` stays empty.
- [x] In `KOKOBRAIN_DEFAULT_THEME`, `ui.fileExplorerMutedFg`, `ui.rightSidebarMutedFg` and `ui.statusBarFg` are hex and at 4.5:1 or more on `fileExplorerBg`, `rightSidebarBg` and `statusBarBg` (asserted).
- [x] The theme snapshot (`theme-snapshot.test.ts`) is regenerated, and the commit body lists its diff: only those three Default tokens change. Any other change is explained or fixed.
- [x] `theme-css-contract.test.ts` and the mermaid widget tests stay green.

## Notes

- **Order with Issue 08:** Issue 08 lands first with the Lavender H1 change and the new `success` token (and its two `READABILITY_PAIRS`). Regenerate the snapshot on top of it; the "only those three Default tokens change" criterion still holds relative to that base, and the success pairs must pass once the skip list is empty.
- **Source:** review-2026-11-04.md section 1 item 11; `work/color.md` H1 and standard 2.
- **Why parsing, not hex overrides:** ADR 0035 lets catalog themes use oklch, and `app.css:140` uses `oklch(1 0 0)` for `--editor-bg`; hex overrides would fix the two built-ins only. It also lets `isDarkColor` read oklch editor backgrounds for the theme mode.
- **Layer:** `utils/color.ts` stays pure (no state, no side effects).
- **Out of scope:** `hsl()` parsing; new `READABILITY_PAIRS` (tab text on the tab bar, switch off-track, input edge, destructive as text, collection empty and null), which change the surface ladder of both themes and need a screenshot pass; saved user themes (`mergeThemeWithDefaults` keeps user-chosen colors verbatim by design).
- **Size:** S.

## Comments

- 2026-11-04, branch `issue/41-contrast-guard-reads-oklch`: `parseRgba` reads `oklch(L C H [/ a])` through OKLab, so the builder lifts Default's `fileExplorerMutedFg`, `rightSidebarMutedFg` and `statusBarFg` to 4.5:1; the expected-skip list is now empty and the snapshot changes only those three tokens. Round 1 fix: `parseRgba` returns null instead of throwing when the OKLab round trip does not parse (extreme chroma). Tests: pnpm check exit 0; targeted vitest 110 passed; full suite + build exit=0, 494 files, 11735 passed, 1 skipped, 1 todo. Reviews: round 1 APPROVED (one minor finding, fixed), round 2 APPROVED (no findings).
