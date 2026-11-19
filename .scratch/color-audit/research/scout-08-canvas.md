# Scout 08: Canvas color audit

Read-only audit of `src/lib/features/canvas/*` (nodes, groups, edges, color picker, context menu, toolbar, dialogs, `canvas-markdown.css`, `canvas.types.ts`) plus the `@xyflow/svelte` 1.7.1 default CSS the canvas inherits.

## Method

- Script: `/private/tmp/claude-501/-Users-diegorv-Dev-pet-projects-koko-brain/d34954df-1fbf-4743-96fe-27db3527c128/scratchpad/audit-08-canvas/measure.mts` (7476 measurements, `rows.json` next to it), using a copy of `color-tools.mts` with `apcaContrast` exported. Summaries in `sum*.py`, `extra*.mts`.
- Inputs: `theme-tokens.json` `cssVars` for all 28 themes (15 light, 13 dark). `--lp-codeblock-text` is `var(--editor-fg)` (app.css:430), not in the json, resolved by hand.
- Surface stack as rendered:
  - Canvas background is `--card` (CanvasInner.svelte:759 `--xy-background-color: var(--card)`), not `--editor-bg`. 17 of 28 themes have card != editor-bg, so every syntax token (designed against editor-bg) lands on a slightly different surface.
  - Colored text/file/link node fill = preset hex + alpha byte `20` (12.5%) over `--card` (TextNode.svelte:57, FileNode.svelte:62, LinkNode.svelte:95).
  - Group fill = preset + `10` (6.3%), group border = preset + `60` (37.6%) (GroupNode.svelte:18-19). The inline `buildGroupStyle` in canvas.logic.ts:146 is overridden by `.svelte-flow__node { background: transparent !important; border: none !important }` (CanvasInner.svelte:778), so it is dead for look.
  - Image node border = preset + `60` over card (ImageNode.svelte:52). Image nodes have no fill tint.
  - Context menu, dialogs, picker: `--background`.
- Opacity text (CSS `opacity`) is modeled as fg alpha over the surface.
- Heading thresholds: h1 and h2 at defaults are 26.8px and 21px bold (large, 3:1), h3 to h6 small (4.5:1). User heading typography settings can change that; defaults used.
- Presets measured (hex from `canvas.types.ts:5-10`): red #fb464c, orange #e9973f, yellow #e0de71, green #44cf6e, cyan #53dfdd, purple #a882ff.
- xyflow: the app never passes `colorMode`, so the store resolves `'light'` (initial-store.svelte.js:300) and the root gets class `light`. Every `--xy-*-default` that CanvasInner.svelte:758-775 does not override stays at its LIGHT value, on every theme including dark ones.
- Could not verify in a browser: the Chrome DevTools MCP timed out connecting (60 s), so the xyflow default-driven findings (Controls hover, attribution, edge label frame) are traced from `node_modules/@xyflow/svelte/dist/style.css` and component source, not seen rendered.

## Findings (measured)

### F1 Attribution link unreadable (high)
`<Attribution>` is rendered (no `proOptions.hideAttribution` in CanvasInner.svelte:610). style.css:316-326: background `--xy-attribution-background-color-default` = `rgba(255,255,255,.5)` (light default, not overridden), link `color: #999` hard-coded, 10px. Flattened over `--card`: light themes 2.59 to 2.85:1, dark themes 1.02 to 1.26:1 (KokoBrain Default 1.02, Graphite Violet 1.03). All 28 fail. Also a bright gray patch in the corner of every dark canvas. Fix is app-side (override the attribution background var and link color, or hide per the Svelte Flow license terms; do not decide here).

### F2 Controls button hover: light icon on #f4f4f4 on dark themes (high, traced not rendered)
CanvasInner.svelte:771-772 sets `--xy-controls-button-background-color` and `--xy-controls-button-color` but not the `-hover` variants. style.css hover rule uses `--xy-controls-button-background-color-hover-default: #f4f4f4` and a hover color of `inherit` (resolves to the inherited text color, `--foreground`). `--foreground` on #f4f4f4: 1.03:1 (KokoBrain Default) to 1.52:1 (Zettlr Bordeaux Dark); 13 of 13 dark themes fail. Light themes 7.2 to 19:1 pass. The zoom in/out/fit/lock icons vanish on hover.

### F3 Default edge stroke and arrowheads (high)
`--xy-edge-stroke: rgba(255,255,255,.3)` (CanvasInner.svelte:764) over `--card`. Arrowheads of uncolored edges use the same var (style.css:193-198). Light themes 1.00 to 1.07:1, edges are effectively invisible (15 of 15). Dark themes 2.51 to 2.71:1 (below 3:1, 13 of 13). Uncolored is the default for every new edge.

### F4 Preset colors on light themes: edge strokes, node borders, picker swatches (medium)
Root cause: `CANVAS_COLOR_MAP` (canvas.types.ts:5-10) is a fixed, Obsidian-style dark-theme palette used raw as a stroke, border and swatch. Against `--card` (strokes, borders) and `--background` (swatches), light themes:
- Edge stroke (1px, canvas.logic.ts:168 and CanvasInner.svelte:440): orange 1.91 to 2.34:1, yellow 1.15 to 1.41:1, green/cyan/purple 1.3 to 2.4:1, red 2.81 (Lavender Haze) to 3.45. All 15 light themes fail for orange, yellow, green, cyan, purple. Dark themes 3.48 to 13.6, pass.
- Colored node border (TextNode/FileNode/LinkNode `border-color` = preset): yellow 1.15 to 1.41:1; the 12.5% fill vs card is 1.02 to 1.17:1 (light) and 1.08 to 1.38 (dark). The node boundary relies on this plus a `rgba(0,0,0,.3)` shadow (CanvasInner.svelte:792).
- Picker swatches (ColorPicker.svelte:31, `background-color` = preset) vs menu bg: light 1.09 (yellow, Sepia) to 3.22:1; orange 1.8, cyan 1.24, green 1.55 on Sepia. The swatch is the control's only identity.
Sepia and Lavender Haze are the worst surfaces. Fix direction: per-theme or contrast-adjusted stroke/border (e.g. darken in OKLab with `ensureContrast`), keep stored value unchanged.

### F5 Group container invisible or faint (high)
- Uncolored group (default for `createGroupNode`, canvas.logic.ts:365) is `border: 1px dashed rgba(255,255,255,.2)` and `background: rgba(255,255,255,.03)` (GroupNode.svelte:31-32). Light themes: border 1.00 to 1.04:1, fill 1.00 to 1.01:1, so the group is not visible at all, only its label. Dark: border 1.82 to 1.92:1, fill 1.06 to 1.10.
- Colored group: border 37.6% preset, fill 6.3%. Border vs card 1.06 to 1.64:1 on light, 1.47 to 2.82:1 on dark (fails 3:1 on all 28 themes for every preset); fill 1.01 to 1.05:1 everywhere. Worst: yellow on Lavender Haze 1.06, red on Zettlr Bordeaux Dark 1.47.
The same ~0.2 to 0.6 alpha border pattern is on image node borders (ImageNode.svelte:52, same ratios).

### F6 Low-opacity content text in nodes (high)
Real content, not decoration, set with `opacity` on foreground (card or tinted surface; numbers across all surfaces):
- Link node URL line, 11px, opacity .4 (LinkNode.svelte:184): light 1.89 to 2.82:1, dark 2.31 to 3.65 (APCA dark Lc 19 to 30). Shown on every link node.
- "Could not load file", 12px, .4 (FileNode.svelte:177): same numbers.
- "Empty file", 12px, .3 (FileNode.svelte:183): 1.59 to 2.11 light, 1.87 to 2.63 dark.
- Text node placeholder "Double-click to edit", 13px italic, .4 (TextNode.svelte:108): same as URL line.
- File node subpath, 11px, .5 (FileNode.svelte:154): light 2.27 to 3.93, dark 2.81 to 5.13.
- Textarea placeholder (muted-fg at .5, TextNode.svelte:129): 1.88 to 3.02, fails 28 of 28.
- File/link header icon at opacity .6 (3:1 icon): light 2.75 (Zettlr Berlin Light, red node) to 5.66, 5 light themes below 3:1.
All 28 themes fail the 4.5:1 text threshold for the first five.

### F7 Low-opacity text in canvas chrome (medium)
- Context menu shortcut hints "Ctrl+A" / "Shift+1", 11px, opacity .4 (CanvasContextMenu.svelte:226): light 1.92 to 2.79:1, dark 2.68 to 3.67.
- File picker path line, 11px, .4 (CanvasFilePicker.svelte:140): same numbers.
- Image placeholder file path (shown when an image fails to load), 11px, .5 (ImageNode.svelte:90): light 2.0 to 2.89, dark 2.17 to 3.02. The placeholder icon is .3 (1.48 to ... decorative).

### F8 Markdown colors on tinted node fills (medium, shared root with theme tokens)
`--syntax-*` and `--lp-link` are tuned for `--editor-bg`; in the canvas they sit on `--card` plus a 12.5% saturated tint, which lowers contrast further. Failures below 4.5:1 by element (cases = theme x preset surface, 196 each; "plain" = uncolored node, which already fails for the token itself in a few themes):
- Blockquote text (`--syntax-quote`, canvas-markdown.css:133 on `--lp-blockquote-bg`): 114 of 196 cases fail; worst 2.87:1 Zettlr Bielefeld Dark on a yellow node (Lc 30.5). 8 of 28 themes fail even on plain nodes (Zettlr Bielefeld Dark 3.88, Lavender Haze 3.92).
- Links (`--lp-link`, canvas-markdown.css:89): 87 of 196; worst 3.30:1 Zettlr Frankfurt Dark on yellow (Lc 33.7). Plain: Sakura 4.14, Willemstad Dark 4.34, Shimmering Focus Light 4.35.
- Link node title (`--primary`, LinkNode.svelte:170): 78 of 196; worst 3.05:1 Twilight Violet on yellow (Lc 29.8). Plain: Sakura 4.15, Twilight Violet 4.19.
- Strikethrough (`--syntax-strikethrough`): 61 of 196, 0 plain failures; worst 3.28:1 Twilight Violet on yellow (Lc 32.4).
- h6 (`--syntax-heading6`): 67 of 196; worst 3.30:1 Zettlr Berlin Dark on yellow (Lc 33.5).
- h5: 29 of 196, worst Sakura 3.33 (red). Emphasis: 26, worst Twilight Violet 3.44 (yellow). Inline code: 11, worst Graphite Violet 3.90 (yellow). Strong: 13, worst Shimmering Focus Light 3.68 (red).
- Headings on Sakura fail even plain (card #F5EBEB): h2 2.76:1 (large threshold 3), h3 2.78, h4 2.98; the editor itself is only slightly better (h2 3.01 on editor-bg #FDF5F5), so this part is a theme-token problem.
- `mark` (foreground on `--lp-highlight-bg`, canvas-markdown.css:137): fails in 4 Zettlr dark themes even plain (3.93:1), worst 3.25:1 on a yellow node. Theme token problem, not tint.
Fix direction: app derives text color from the actual node surface (e.g. `ensureContrast` or foreground fallback when the tinted surface fails), plus theme fixes for the plain failures.

### F9 Hard-coded white-alpha chrome invisible on light themes (medium)
`rgba(255,255,255,x)` borders, fills and hover states, built for dark only. Light themes:
- Text inputs in Add link dialog and inline link edit: border `rgba(255,255,255,.15)` (CanvasLinkInput.svelte:108, LinkNode.svelte:199) vs dialog bg: 1.01 to 1.05:1 light, 1.54 to 1.63 dark; fails the 3:1 input-boundary rule on all 28. The fill `.05` is invisible too, so the field has no visible edge on light themes.
- Context menu border (CanvasContextMenu.svelte:183), file picker dialog border, toolbar and Controls button borders (CanvasToolbar.svelte:55, CanvasInner.svelte:773), color picker "none" swatch (ColorPicker.svelte:69, 1.01 to 1.03 vs menu bg, light) and picker hover ring (ColorPicker.svelte:61, 1.04 to 1.14 light): 1.01 to 1.05:1.
- Hover backgrounds `rgba(255,255,255,.06-.1)` for menu items, picker items, file header and link header: 1.01 to 1.02:1 on light, so hover gives no feedback.
- Empty-canvas "+ Add card" button (CanvasInner.svelte:743-744): border `rgba(255,255,255,.3)` 1.00 to 1.07:1 on light; the button reads as bare text.
- Uncolored node border `rgba(255,255,255,.15)` (all node files, e.g. TextNode.svelte:94): 1.00 to 1.03:1 light, 1.52 to 1.62 dark; node edge is shadow only. Toolbar button bg vs canvas bg is 1.04 to 1.25:1 on all themes.
Fix direction: derive from `--border`/`--foreground` with color-mix instead of fixed white.

### F10 Context menu Delete hover: hard-coded red (medium)
Hover state sets `color: #fb464c` on `rgba(251,70,76,.15)` over `--background` (CanvasContextMenu.svelte:210-211). Ratio 2.26 (Sepia) to 2.69:1 on light, 3.69 to 4.64 on dark; 25 of 28 themes below 4.5:1, all 15 light below 3:1. Fix: use `var(--destructive)` or a contrast-adjusted red.

### F11 Minimap nodes invisible (medium/low)
`--xy-minimap-node-background-color: var(--muted)` over `--xy-minimap-background-color: var(--background)` (CanvasInner.svelte:768,770): 1.00 to 1.34:1 light, 1.04 to 2.07:1 dark; 28 of 28 below 3:1. Nodes are not colored by node color either.

### F12 Remaining xyflow light-mode defaults (low)
- Edge label wrapper: `.svelte-flow__edge-label` (style.css:620-627) has background `--xy-edge-label-background-color-default` = `#ffffff` and 2px padding, not overridden. On dark themes the label (card bg, radius 4) sits in a white 2px frame with square corners: white vs card 12 to 19:1, glaring. Text itself is fine (foreground on card 7.97 to 19.8:1). Traced, not rendered.
- Connection line while dragging a new edge: `#b1b1b7` (default) vs card: 1.74 to 2.13:1 on light themes.
- Selection marquee border `rgba(0,89,220,.8)` on dark themes: 1.68 (Graphite Violet) to 2.4:1.

### F13 Empty-canvas "+ Add card" text on dark (low)
`--muted-foreground` on card + `rgba(255,255,255,.05)` (CanvasInner.svelte:743-745), 14px: 8 of 13 dark themes below 4.5:1, worst 3.86:1 Zettlr Berlin Dark (Lc 36.7). Light themes 4.95 to 12.8 pass.

## Passed

- Node foreground text on every surface, 28 themes x 7 surfaces: min 6.63:1 (Zettlr Bordeaux Dark on cyan), APCA Lc >= 64.
- `pre code` (`--editor-fg` on `--lp-codeblock-bg`), `th`, alternating `td` rows: min 6.17:1 on any tint.
- Selected-node ring, resize handles, selected-edge stroke, drag-over outline, input focus border: `--primary` vs card/dialog bg 4.08 to 8.73:1.
- Group label (`--muted-foreground`, 12px) on card: 4.51 (Twilight Violet) to 12.8:1.
- Edge label text on card: 7.97 to 19.8:1. Context menu items, menu label (4.58 min), toolbar icons, dialog titles and inputs' text: pass; btn-ok text 4.51:1 minimum (Zettlr Berlin Light, Willemstad Dark), borderline but passes; btn-cancel, picker-empty, picker input placeholder 4.58 min. Picker X icon on none dot passes 3:1 (min 3.6). Picker active ring (foreground) passes.
- Toolbar hover (`--muted` bg) text/icon passes (4.82 min).

## Not checked / limits

- No rendered check: Chrome DevTools MCP connection timed out, playwright/app launch was forbidden. xyflow-default findings (F1, F2, F12) trace the shipped CSS; Controls hover color `inherit` resolution is from CSS semantics, not a screenshot.
- Wikilinks, tags, task checkboxes, footnotes, callouts are not styled in `canvas-markdown.css` (marked output plus `sanitizeHtml`), so they appear as plain text or native elements; not measured.
- Heading sizes depend on the user's `--heading-hN-*` settings; defaults assumed.
- Custom hex colors are not limited to the six presets: 3-digit or 8-digit hex breaks the `${hex}20`/`60`/`10` alpha suffix (GroupNode.svelte:18-19, TextNode.svelte:57). Not a contrast measurement, noted only.
- Edge labels over a colored edge line, text over overlapping nodes, and the `selected` state of colored edges (inline `stroke` wins over the selected-edge CSS, so a colored edge shows no stroke change when selected) were not measured.
- Dark-mode `--xy-background-pattern-color` and the Background dots are decorative, not scored.
