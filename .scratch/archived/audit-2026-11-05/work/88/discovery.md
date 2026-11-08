# Issue 88 discovery

No `spec.md` for audit-2026-11-05 (PRD.md only); the Issue is self-contained.

## Files that change

- `src/lib/plugins/graph-view/graph-view.logic.ts` (end of file): add `GraphPalette`, `GraphThemeTokens`, `FALLBACK_GRAPH_PALETTE` (the current constants) and pure `graphPalette(tokens)` using `mixColors` from `#lib/utils/color.js`.
- `src/lib/core/settings/applied-theme.store.svelte.ts:1-19`: `revision` `$state` number, getter, `bumpRevision()`, `_reset()` zeroes it.
- `src/lib/core/settings/theme.service.ts:29-35` `applyMode()`: call `appliedThemeStore.bumpRevision()` (the Issue 39 helper, shared by `applyTheme`, `applyStoredTheme`, `applyActiveTheme`).
- `src/lib/plugins/graph-view/GraphView.svelte`: drop constants (:45-50) and rgba literals (:243, :251); local `palette` `$state` initialised to the fallback; `readPalette()` reads `--editor-bg`, `--foreground`, `--muted-foreground`, `--primary` from `getComputedStyle(document.documentElement)`; an `$effect` reading `appliedThemeStore.revision` runs `untrack(() => { palette = ...; render(); })` (runs on mount too); `render()` uses `palette.*`; container `style="background: {palette.background};"` plus `data-testid="graph-view"`.

## Tests

- `src/tests/lib/plugins/graph-view/graph-view.logic.test.ts`: new `describe('graphPalette')` with both themes' `colors.ui` (`KOKOBRAIN_DEFAULT_THEME`, `LAVENDER_HAZE_THEME` from `theme.logic.ts`), `contrastRatio` checks, empty and unparseable token return `FALLBACK_GRAPH_PALETTE`.
- `src/tests/lib/core/settings/theme.service.test.ts`: in "the applied theme decides dark mode" block (prior art for all three apply functions), one case per function asserting `revision` grows.
- `src/tests/lib/core/settings/applied-theme.store.test.ts`: getter test for `revision` (every getter needs a test).
- `e2e/specs/theme-mode.spec.ts`: a case in each describe: `Mod+G` (as `rail-shell.spec.ts:280-281`), `expectTabActive(page, 'Graph View')`, `toHaveCSS('background-color', ...)` on `[data-testid="graph-view"]`.

## Defaults taken

- Tokens come from `theme.colors.ui` (`editorBg`, `foreground`, `mutedForeground`, `primary`); CSS vars are kebab-case of those names.
- Fallback when any token is empty or `mixColors` returns null (unparseable). Fallback keeps the current hex/rgba values verbatim (dimmed node and label rgba included).
- `revision` starts at 0 and increments by 1 per apply; GraphView repaints on any change.

## Risks

- jsdom `getComputedStyle` may not return custom properties: GraphView test then sees the fallback, which is fine (canvas has no 2D context there).
- If a theme's `mutedForeground` is below 3:1 on `editorBg`, the contrast criterion cannot hold with the specified formula: checked by running the test first.
