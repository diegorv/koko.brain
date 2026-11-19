# 10: QueryJS charts, heatmaps and mermaid follow the theme

**Origin:** color audit 2026-11-19 (`.scratch/color-audit/report.md`, cause E). Each finding below has its fg, bg, worst theme, measured ratio and validator fix in `.scratch/color-audit/research/workflow-result.json` (search by `file:line`); notes in `research/scout-*.md` and `research/validation-*.md`; resolved tokens of all 28 themes in `research/theme-tokens.json`.

**What to build** (`src/lib/plugins/queryjs/kb-ui.ts` unless noted):

1. **Theme switch**: charts and calendars bake `html.dark` colors at render time and never redraw (`:608`); mermaid keeps its old theme after a light/dark switch (`live-preview/widgets/mermaid-widget.ts:121`, traced, not run). Re-render on an applied-theme change (find the existing theme-change signal; the live-preview rules say how widgets rebuild).
2. **Heatmap**: value text uses the theme text color on a fixed rgba scale (`:29`) and the cell label is at opacity 0.6 over a colored cell (`:215`): pick the label per cell (`labelColors` on the flattened cell) and drop the opacity.
3. **Calendars**: the GitHub green scale and the empty cell are fixed hex values (`:977`), the today marker `rgb(61,61,61)` is invisible on dark themes (`:800`): derive from theme tokens.
4. **Table `striped`** (`:421`): invisible on light themes; use a token mix that is visible on both.
5. **Chart series colors** (`:1067`): the documented defaults are under 3:1 against the block on light themes; lift them against `collectionBg` or pick a theme-aware default set.

Read `docs/agents/live-preview-rules.md` first.

**Size:** M

**Blocked by:** 08

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [ ] Failing test first, `kb-ui.test.ts`: heatmap cell label reaches 4.5:1 on its flattened cell on `BUILTIN_THEMES`; the today marker and the empty cell reach 3:1 on `collectionBg`; striped rows differ from the block background by 1.1:1 or more.
- [ ] A test that a theme change triggers a chart redraw (mock Chart.js at the boundary, assert on the new colors passed) and a mermaid re-render.
- [ ] Frontend gate passes.

## Findings covered

| Finding | Sev | Measured (worst) |
|---|---|---|
| `core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:121` Mermaid diagram keeps its old theme after a light/dark switch (traced, not run) | low | Traced, not run in the app. Mermaid 12.3.0 default-theme lineColor #333333 on a dark code block bg: 1.05 to 1.52. Dark-theme textColor #ccc on a li... |
| `plugins/queryjs/kb-ui.ts:215` kb.ui.heatmap cell label at opacity 0.6 over a colored cell is unreadable in every theme | medium | editor-fg at .6 over each default step flattened on the block: red step fails 28/28, amber/yellow/lime/green 27/28, gray 19/28. Worst 1.87 SF Dark ... |
| `plugins/queryjs/kb-ui.ts:29` kb.ui.heatmap value text uses the theme text color on a fixed rgba scale and fails on dark and Zettlr light themes | low | Value text (editor-fg, bold ~14px) fails the green step on 11 dark themes (SF Dark 2.80 Lc-43, Zettlr Bordeaux Dark 2.89, Twilight Violet 3.15, Zet... |
| `plugins/queryjs/kb-ui.ts:608` Charts and calendars bake html.dark colors at render time and are not redrawn on a theme switch | low | Stale #000 on dark collection bg 1.14 to 1.39, #fff on light 1.08 to 1.39. Traced in code, not run in the app |
| `plugins/queryjs/kb-ui.ts:800` heatmapCalendar and yearlyCalendar today marker rgb(61,61,61) is invisible on dark themes | medium | rgb(61,61,61) border vs the #333 empty cell is 1.16 on all 13 dark themes, and 1.39 to 1.70 vs the block bg. Light themes pass (9.26) |
| `plugins/queryjs/kb-ui.ts:977` Calendar default GitHub green scale and empty cell are fixed hex values that do not contrast with the collection surface | medium | Light: level 1 vs block 1.01 (Lavender Haze) to 1.31, level 1 vs the empty cell 1.20, empty vs block 1.01 to 1.19. Dark: level 5 #196127 vs block 1... |
| `plugins/queryjs/kb-ui.ts:1067` Documented chart series colors have under 3:1 against the block background on light themes | low | Lavender Haze: yellow 1.38, green 1.74, orange 1.83, gray 1.88, blue 2.19. All 15 light themes are under 3:1 for these five; dark themes pass |
| `plugins/queryjs/kb-ui.ts:421` kb.ui.table striped option is invisible on light themes | low | The stripe flattened over the block is 1.00 to 1.01 on all 15 light themes and 1.07 to 1.10 on dark |

## Comments

- 2026-11-19, triage: ready-for-agent. Decided by the owner: builder lifts tokens for every theme (WCAG + APCA), user themes are corrected by the builder and the editor warns, rail icons keep their hue and are darkened per theme (ADR-0033 amendment), Issues run through relay one at a time, the themes repo is fixed with version bumps.
