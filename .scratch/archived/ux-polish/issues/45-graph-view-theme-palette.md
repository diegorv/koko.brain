# 45: The graph view paints with the active theme's colors

**What to build:** `src/lib/plugins/graph-view/GraphView.svelte` paints a fixed dark palette: constants at lines 46-51 (`BG_COLOR '#1a1a1e'`, nodes `#8b8b8b`, active `#c084fc`, labels `#a1a1aa`, two edge rgba values), literals at 244 and 252, and the background inline at 429. On Lavender Haze the graph is a near-black slab (`references/ux-polish-2026-11-04/screens/lavender/12-cmd-toggle-graph-view.png`). Changes:
- `graph-view.logic.ts`: a pure `graphPalette(tokens)` taking `{ editorBg, foreground, mutedForeground, primary }` strings and returning `{ background, node, nodeActive, nodeDimmed, edge, edgeHighlight, label, labelDimmed }`, using `mixColors` from `utils/color.ts`: background `editorBg`; node `mutedForeground`; nodeActive `primary`; nodeDimmed `mix(mutedForeground, editorBg, 0.8)`; edge `mix(mutedForeground, editorBg, 0.4)`; edgeHighlight `mix(primary, editorBg, 0.5)`; label `mix(foreground, mutedForeground, 0.5)`; labelDimmed `mix(label, editorBg, 0.7)`. If any token is empty or unparseable it returns the current constants as an exported fallback palette. JSDoc on both exports.
- `applied-theme.store.svelte.ts` gains a `revision` getter (a number) that `theme.service.ts` bumps on every apply, in the helper Issue 39 added, so a switch between two dark themes also repaints.
- `GraphView.svelte`: on mount and in an `$effect` that reads `appliedThemeStore.revision` (body in `untrack()`, per `docs/PATTERNS.md`), read the four tokens with `getComputedStyle(document.documentElement).getPropertyValue(...)` for `--editor-bg`, `--foreground`, `--muted-foreground` and `--primary`, keep the palette in a local, and call `render()`, because the simulation may have cooled and no tick will repaint. `render()` and the container `style` read the palette; the constants go.

**Blocked by:** 39

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh` for the extended spec.

- [ ] Failing first, `src/tests/lib/plugins/graph-view/graph-view.logic.test.ts`: with the `ui` tokens of `LAVENDER_HAZE_THEME` and of `KOKOBRAIN_DEFAULT_THEME`, `background` equals `editorBg`, `node` equals `mutedForeground`, `nodeActive` equals `primary`, `node` is at 3:1 or more and `label` at 4.5:1 or more on `background` (`contrastRatio`); an empty token and an unparseable token each return the fallback palette.
- [ ] `src/tests/lib/core/settings/theme.service.test.ts`: `applyTheme`, `applyStoredTheme` and `applyActiveTheme` each bump `appliedThemeStore.revision`.
- [ ] `e2e/specs/theme-mode.spec.ts` gains a case per theme: open the Graph tab (as `e2e/specs/rail-shell.spec.ts:247-273` does) and assert the graph container's computed `background-color` is `rgb(243, 240, 248)` on Lavender Haze and `rgb(42, 46, 61)` on KokoBrain Default (add a `data-testid` on the container if no stable selector exists).
- [ ] No hex or `rgba(` literal is left in `GraphView.svelte`; the fallback palette lives in `graph-view.logic.ts`.

## Notes

- **Source:** review-2026-11-04.md section 1 item 9 and row 97; `work/color.md` H3; `work/views.md` P1.
- **Owner decision, recommended:** the Default graph background moves from `#1a1a1e` to the theme's editor background `#2a2e3d`, matching the editor pane.
- **Layer:** `plugins/graph-view` imports a `core/settings` store (allowed); `graph-view.logic.ts` imports only `utils/color.ts` (`pure-logic.test.ts`).
- **Out of scope:** label font and zoom sizing (`:253`), native controls in `GraphControls.svelte`, the pluralized counter, empty and error states, the GraphControls card elevation.
- **Size:** M.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/88-graph-view-paints-active-theme-s-colors.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
