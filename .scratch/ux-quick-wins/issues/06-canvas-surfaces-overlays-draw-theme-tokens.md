# 06: Canvas surfaces and overlays draw from theme tokens

**Origin:** design review 2026-11-17, proposals P12 (part), P13 (group-label typography), P92 (canvas overlay shadows) (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/canvas.html` (P12, P13) and `feedback-components.html` (P92), research `.scratch/ux-quick-wins/research/verdict-canvas.md` (Q4), `verdict-feedback-b.md` (QB4) and `breakdown.md` (old ticket 19). Absorbs open-itens 195 (`.scratch/open-itens/issues/195-canvas-nodes-edges-grid-draw-from-theme.md`) and 196 (`.scratch/open-itens/issues/196-canvas-menus-pickers-edge-labels-use-theme.md`), both already marked wontfix with a pointer here.

**What to build:**

1. **White alpha becomes ink.** Every `rgba(255, 255, 255, A)` in `src/lib/features/canvas/` becomes `color-mix(in oklab, var(--foreground) A%, transparent)` (A as a percentage). Sites: `CanvasInner.svelte` (xyflow variables `:743-775`, 8 sites), `CanvasContextMenu.svelte`, `CanvasFilePicker.svelte`, `CanvasLinkInput.svelte`, `CanvasEdge.svelte`, `CanvasToolbar.svelte`, `ColorPicker.svelte` (colours only, not swatch names), `FileNode.svelte`, `TextNode.svelte`, `LinkNode.svelte`, `ImageNode.svelte`, `GroupNode.svelte`. Default's foreground is `#F8F8F2`, so Default looks the same and light themes get ink at the same strength.
2. **Minimap mask.** `CanvasInner.svelte:769` becomes `color-mix(in oklab, var(--background) 60%, transparent)`.
3. **Danger red.** The context-menu danger item (`CanvasContextMenu.svelte:211`, `#fb464c`) uses `var(--destructive)` with a 15% mix for the hover background. `#fb464c` stays only in `canvas.types.ts:6` (a node colour preset).
4. **Edge fallbacks.** Drop the dead fallbacks in `CanvasEdge.svelte:66-67` (`var(--card, #2a2e3d)`, `var(--foreground, #fff)`).
5. **Uncoloured groups.** `buildGroupStyle` (`src/lib/features/canvas/canvas.logic.ts:146-152`) uses the same form for the uncoloured branch (flow `style` is never serialized, so this is not a write); a coloured group keeps its `20` and `80` suffixes. Reword the "for dark mode" comment at `CanvasInner.svelte:757`.
6. **Group label.** `GroupNode.svelte:36-44`: 13 px, foreground at 80% (`color-mix(in oklab, var(--foreground) 80%, transparent)`), instead of 12 px muted.
7. **Overlay shadows on tokens.** `CanvasContextMenu.svelte:187` becomes `var(--shadow-md)`; `CanvasFilePicker.svelte:97` and `CanvasLinkInput.svelte:94` become `var(--shadow-xl)`. Nothing else in those rules changes; the scrims (`CanvasFilePicker.svelte:81`, `CanvasLinkInput.svelte:81`), the two node shadows (`CanvasInner.svelte:792,796`) and the node-tint hex suffixes (`TextNode.svelte:57`, `GroupNode.svelte:18-19`, the `${bgColor}20` in File and Link nodes) stay as they are. Dark menus gain the 1 px `--elev-ring` of the tokens; that is the intended look.

Not in this ticket: Rename and Edit label for groups and edges (a new `.canvas` write, deferred), the Settings shadow (`SettingsPanel.svelte:116`), a Dialog size prop, the scrim.

**Size:** M (about 13 mechanical files). Split point: items 1 to 6 (colours, `canvas.logic.ts`, the scan test) first; item 7 (three overlay shadows, one scan line) second.

**Blocked by:** 04

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [ ] Failing test first, new `src/tests/lib/features/canvas/canvas-theme-colors.test.ts` (source scan, comments stripped, the style of `canvas-markdown-css.test.ts`): no `.svelte` or `.ts` file in the folder except `canvas.types.ts` has `rgba(255` (any whitespace) or `#fb464c`; `rgba(0` appears only in the two node `box-shadow` lines and the two scrims; the three overlay shadows read `var(--shadow-md)` and `var(--shadow-xl)` exactly.
- [ ] Failing test first, `src/tests/lib/features/canvas/canvas.logic.test.ts` (next to "adds style for group nodes"): an uncoloured group's `style` has `var(--foreground)` and no `rgba(`; a coloured group keeps its `20` and `80` suffixes.
- [ ] The context-menu danger item reads `--destructive` in both themes (source assertion).
- [ ] The two node shadow lines (`CanvasInner.svelte:792,796`) are byte-identical to HEAD; `radius-scale.test.ts` passes unchanged (new CSS uses `var(--radius-*)`, never a px `border-radius`).
- [ ] The commit body records a by-eye check of edges, grid, minimap, menu hover and the overlay lift in Default and Lavender Haze.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P12.** Canvas colours are dark-only: the xyflow variables and the overlay chrome hard-code white or black alpha, so in light themes edges and the grid are barely visible and the minimap is a dark slab. Derive the colours from theme tokens with `color-mix`. Validation: keep. This ticket ships the white-alpha, minimap, danger and group-style parts; node-tint hex suffixes and node shadows stay.
- **P13 (typography only).** Group labels are tiny muted text; a 13 px header chip is proposed. Rename, Edit label and inline inputs are deferred: a new `.canvas` write, the edge persist path ignores edges (`CanvasInner.svelte:229-243`) and clearing a label runs into open-itens 026.
- **P92 (canvas overlays).** Hand-built menus use alpha literals instead of the elevation tokens. Use `var(--shadow-xl)` and the elevation tokens. Validation: revise, shipped for the three canvas overlays only.
- **Open-itens 195 and 196.** Canvas nodes, edges and grid, and canvas menus, pickers and edge labels, draw from the theme. Their criteria are carried, except that `e2e/specs/canvas-view.spec.ts` is no longer pinned untouched.

## Problem

On a light theme such as Lavender Haze the canvas edges are close to invisible, node borders vanish, the minimap mask is a dark grey block and the menus and pickers lose their edges and hover states, because they hard-code white alpha tuned for the dark background. The danger item uses a private red, and the floating surfaces ignore the elevation tokens.

## Evidence

Checked at `085b23c5d`.

- `grep rgba(255` in `src/lib/features/canvas/` finds 34 lines across 13 files (`grep -c`: `CanvasInner.svelte` 8, `CanvasLinkInput.svelte` 4, `LinkNode.svelte` 4, three each in `CanvasContextMenu`, `CanvasFilePicker`, `FileNode`, and the rest 1 to 2). `rgba(0` appears at `CanvasInner.svelte:769,792,796`, `CanvasContextMenu.svelte:187`, `CanvasFilePicker.svelte:81,97`, `CanvasLinkInput.svelte:81,94`. `#fb464c` is at `CanvasContextMenu.svelte:211` and `canvas.types.ts:6`.
- `CanvasInner.svelte:777-785` the `.svelte-flow__node` override (`!important`) hides `buildGroupStyle`; `canvas.logic.ts:151` is its white-alpha branch.
- `app.css:125-130` the `--shadow-*` tokens (in `@theme static`) and `:205-209`, `:279-283` the `--elev-*` tokens in both palettes; already read from TS at `live-preview/styles.ts:529`.
- `src/tests/lib/radius-scale.test.ts:164-205` pins the count of px `border-radius` per canvas file with `toEqual`.

## Why blocked

- 04 edits `FileNode.svelte` (header, open button, `.open-icon` rules at `:134-142`), `LinkNode.svelte` (header and error toast) and `CanvasInner.svelte` (menu wiring) in the same `<style>` and markup regions this ticket recolours; run 04 first so the new open button is recoloured by this ticket instead of re-introducing a literal.

## Sequence with

Tickets 16 (`ImageNode.svelte`, handle CSS in `CanvasInner.svelte`), 17 (`CanvasContextMenu.svelte`, `ColorPicker.svelte` roles, the two pickers) and 43 all edit the same canvas files on other lines; one at a time, this ticket before 16 and 17. shell-sidebars-ux 25 replaces `CanvasToolbar` with a `ViewHeader` in `CanvasInner.svelte`: drop the `CanvasToolbar.svelte:55` site if 25 removed that file first, and never run both in parallel. The `ColorPicker.svelte` swatch names belong to another slice (P88) and are not touched here.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): none.
