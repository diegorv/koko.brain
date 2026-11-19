# 09: Canvas text, edges, groups and presets read on light themes

**Origin:** color audit 2026-11-19 (`.scratch/color-audit/report.md`, cause A and E). Each finding below has its fg, bg, worst theme, measured ratio and validator fix in `.scratch/color-audit/research/workflow-result.json` (search by `file:line`); notes in `research/scout-*.md` and `research/validation-*.md`; resolved tokens of all 28 themes in `research/theme-tokens.json`.

**What to build** (after ux-quick-wins 06, which moves canvas white alpha, the minimap mask, the danger red, uncoloured groups and the group label onto theme tokens):

1. **Faded secondary text** (high): link URL, file subpath, error and empty states, file picker path, context menu shortcut hints, text node and image placeholders at opacity 0.3 to 0.5 (`LinkNode.svelte:184`, `CanvasContextMenu.svelte:226`, and the sites listed below). Use `muted-foreground` at full strength.
2. **Edges and arrowheads** (high, `CanvasInner.svelte:764`): uncoloured edges are invisible on light themes and under 3:1 on dark; give them a stroke at 3:1 on the canvas background. Remaining xyflow light-mode defaults (edge label frame, connection line, selection marquee, `:758`), the Controls hover (`:771`), minimap nodes (`:770`), the empty-canvas "+ Add card" text (`:745`) and the attribution link (`:610`).
3. **Preset palette** (`canvas.types.ts:5`): used raw as edge stroke, node border and picker swatch, under 3:1 on light themes; lift per theme for strokes and borders (the stored preset in the `.canvas` file does not change).
4. **Text on coloured nodes** (`canvas-markdown.css:133`): markdown text colors on tinted node fills.
5. Anything ux-quick-wins 06 left that the findings below still measure (re-measure after it lands; do not redo its items).

**Size:** M

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [ ] Failing test first, extend the canvas source scan test from ux-quick-wins 06 (`canvas-theme-colors.test.ts`): no `opacity: 0.[0-5]` on text rules in the canvas folder, outside an allow-list with reasons.
- [ ] A contrast test for the edge stroke and the lifted preset strokes on the canvas background over `BUILTIN_THEMES` and the hard palettes fixture (3:1).
- [ ] Frontend gate passes.

## Findings covered

| Finding | Sev | Measured (worst) |
|---|---|---|
| `features/canvas/LinkNode.svelte:184` Canvas secondary text (paths, URLs, shortcuts, placeholders, empty states) at opacity 0.3-0.5 is 1.6-3.7:1 | high | Measured on card, the default node surface. Full URL, file error and text placeholder (foreground@0.4): 28/28 fail, 1.96:1 on Zettlr Berlin Light (... |
| `features/canvas/CanvasContextMenu.svelte:226` Low-opacity hint text in context menu, file picker and image placeholder | medium | Shortcut (foreground at .4 on --background): 28/28 under 4.5, light 1.92 (Zettlr light), dark 2.68-3.67, KokoBrain Default 3.57, Lc 19.5-49.5. Pick... |
| `features/canvas/CanvasLinkInput.svelte:108` Hard-coded white-alpha borders, input edges and hover states invisible on light themes | medium | Menu border rgba(255,255,255,.15) on background: 1.01 Sakura, 1.02 Lavender Haze, dark max 1.63. Input edge vs its .05 fill: 1.01-1.63, 28/28. Unco... |
| `features/canvas/canvas.types.ts:5` Preset palette used raw as edge stroke, node border and picker swatch fails 3:1 on light themes | medium | Preset as edge or border vs card: orange, yellow, green, cyan and purple fail 3:1 on 15/15 light themes; red fails only on Lavender Haze and Sakura... |
| `features/canvas/canvas-markdown.css:133` Markdown text colors lose contrast on tinted node fills | medium | Blockquote (syntax-quote on lp-blockquote-bg over card plus 12.5% preset): 20/28 themes fail, worst 2.87 Zettlr Bielefeld Dark yellow (Lc 30.5); 8 ... |
| `features/canvas/CanvasContextMenu.svelte:211` Context menu Delete hover uses fixed #fb464c on pale red tint | medium | #fb464c on rgba(251,70,76,.15) over --background: 25/28 under 4.5, all 15 light under 3 (Sepia 2.26, Lavender Haze 2.57), dark 3.69-4.64. The scout... |
| `features/canvas/CanvasInner.svelte:764` Uncolored edges and arrowheads invisible on light themes, below 3:1 on dark | high | --xy-edge-stroke rgba(255,255,255,.3) on --card: all 15 light themes 1.00-1.07 (Cool Mist 1.00, Lavender Haze 1.07); all 13 dark 2.51-2.71 (Graphit... |
| `features/canvas/CanvasInner.svelte:745` Empty-canvas '+ Add card' text below 4.5:1 on dark themes | low | --muted-foreground on --card plus white .05: 8/13 dark under 4.5 (Zettlr dark 3.86, Twilight Violet 3.87, KokoBrain Default 4.43), Lc 35.6-43. Ligh... |
| `features/canvas/GroupNode.svelte:31` Group containers invisible (uncolored) or below 1.7:1 (colored) on light themes | medium | Uncolored dashed border rgba(255,255,255,.2) on card: 28/28 under 3:1 (light 1.00-1.04, dark max 1.92); fill .03 invisible. Colored border (preset ... |
| `features/canvas/CanvasInner.svelte:770` Minimap nodes invisible | low | --muted node fill vs --background minimap: 28/28 under 3:1 (Shimmering Focus Light 1.00, Willemstad Dark 1.04, best 2.07 Zettlr KMS Dark). |
| `features/canvas/CanvasInner.svelte:610` Svelte Flow attribution link unreadable on every theme | low | #999 (style.css:324) on rgba(255,255,255,.5) over card: dark 1.02-1.26 (KokoBrain Default 1.02), light 2.59-2.85. With colorMode dark the default b... |
| `features/canvas/CanvasInner.svelte:771` Controls (zoom/fit/lock) hover shows light icon on #f4f4f4 on dark themes | medium | Hover bg #f4f4f4 (style.css:43) with the inherited light foreground: 13/13 dark themes 1.03-1.52 (KokoBrain Default 1.03). Light themes pass. color... |
| `features/canvas/CanvasInner.svelte:758` Remaining xyflow light-mode defaults: edge label frame, connection line, selection marquee | low | Connection line #b1b1b7 on card: 15/15 light under 3:1 (Lavender Haze 1.74, Sakura 1.83). Marquee rgba(0,89,220,.8): 13/13 dark (Graphite Violet 1.... |
| `features/canvas/LinkNode.svelte:184` Link card URL line at 40% opacity unreadable on every theme | medium | 1.96:1 Zettlr light themes, 2.22 Lavender Haze, dark 2.60 (Zettlr Bordeaux Dark) to 3.65, KokoBrain Default 3.36 |

## External dependency

ux-quick-wins 06 (`.scratch/ux-quick-wins/issues/06-canvas-surfaces-overlays-draw-theme-tokens.md`, ready-for-agent, blocked by its 04) edits the same canvas files. Run this ticket only after 06 is delivered; it also owns `CanvasLinkInput.svelte:108`, `GroupNode.svelte:31`, `CanvasContextMenu.svelte:211` from the table, which you only verify here.

## Comments

- 2026-11-19, triage: ready-for-agent. Decided by the owner: builder lifts tokens for every theme (WCAG + APCA), user themes are corrected by the builder and the editor warns, rail icons keep their hue and are darkened per theme (ADR-0033 amendment), Issues run through relay one at a time, the themes repo is fixed with version bumps.
