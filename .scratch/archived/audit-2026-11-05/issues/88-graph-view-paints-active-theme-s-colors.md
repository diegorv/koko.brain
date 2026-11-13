# 88: The graph view paints with the active theme's colors

**Migrated from:** `.scratch/ux-polish/issues/45-graph-view-theme-palette.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Polish/low. The Default background change is a recommended but unconfirmed owner decision.

**Audit check at `5f8003d67`:** still_present (polish, low). src/lib/plugins/graph-view/GraphView.svelte:45-50 fixed hex/rgba constants, :243 and :251 rgba literals, :428 style="background: {BG_COLOR}". No graphPalette in graph-view.logic.ts and no revision getter in applied-theme.store.svelte.ts (rg graphPalette|revision in src/lib: no match). Graph is a dark slab on Lavender Haze; the graph tab is not in the owner's daily list.

**Stale in the text below:** Constants at lines 45-50 (Issue says 46-51), literals at 243/251 (Issue says 244/252). Blocker 39 is done, but the store only exposes isDark, so the revision getter still has to be added.

**Owner decision (2026-11-06):** the graph paints with the active theme's colors, and the Default theme's graph background becomes the editor background (#2a2e3d). Any wording below that assumes this decision, calls it recommended or unconfirmed, or asks to confirm it with the owner is superseded: the owner confirmed it on 2026-11-06.

**What to build:** `src/lib/plugins/graph-view/GraphView.svelte` paints a fixed dark palette: constants at lines 46-51 (`BG_COLOR '#1a1a1e'`, nodes `#8b8b8b`, active `#c084fc`, labels `#a1a1aa`, two edge rgba values), literals at 244 and 252, and the background inline at 429. On Lavender Haze the graph is a near-black slab (`references/ux-polish-2026-11-04/screens/lavender/12-cmd-toggle-graph-view.png`). Changes:
- `graph-view.logic.ts`: a pure `graphPalette(tokens)` taking `{ editorBg, foreground, mutedForeground, primary }` strings and returning `{ background, node, nodeActive, nodeDimmed, edge, edgeHighlight, label, labelDimmed }`, using `mixColors` from `utils/color.ts`: background `editorBg`; node `mutedForeground`; nodeActive `primary`; nodeDimmed `mix(mutedForeground, editorBg, 0.8)`; edge `mix(mutedForeground, editorBg, 0.4)`; edgeHighlight `mix(primary, editorBg, 0.5)`; label `mix(foreground, mutedForeground, 0.5)`; labelDimmed `mix(label, editorBg, 0.7)`. If any token is empty or unparseable it returns the current constants as an exported fallback palette. JSDoc on both exports.
- `applied-theme.store.svelte.ts` gains a `revision` getter (a number) that `theme.service.ts` bumps on every apply, in the helper Issue 39 added, so a switch between two dark themes also repaints.
- `GraphView.svelte`: on mount and in an `$effect` that reads `appliedThemeStore.revision` (body in `untrack()`, per `docs/PATTERNS.md`), read the four tokens with `getComputedStyle(document.documentElement).getPropertyValue(...)` for `--editor-bg`, `--foreground`, `--muted-foreground` and `--primary`, keep the palette in a local, and call `render()`, because the simulation may have cooled and no tick will repaint. `render()` and the container `style` read the palette; the constants go.

**Blocked by:** none

**Status:** resolved

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh` for the extended spec.

- [x] Failing first, `src/tests/lib/plugins/graph-view/graph-view.logic.test.ts`: with the `ui` tokens of `LAVENDER_HAZE_THEME` and of `KOKOBRAIN_DEFAULT_THEME`, `background` equals `editorBg`, `node` equals `mutedForeground`, `nodeActive` equals `primary`, `node` is at 3:1 or more and `label` at 4.5:1 or more on `background` (`contrastRatio`); an empty token and an unparseable token each return the fallback palette.
- [x] `src/tests/lib/core/settings/theme.service.test.ts`: `applyTheme`, `applyStoredTheme` and `applyActiveTheme` each bump `appliedThemeStore.revision`.
- [x] `e2e/specs/theme-mode.spec.ts` gains a case per theme: open the Graph tab (as `e2e/specs/rail-shell.spec.ts:247-273` does) and assert the graph container's computed `background-color` is `rgb(243, 240, 248)` on Lavender Haze and `rgb(42, 46, 61)` on KokoBrain Default (add a `data-testid` on the container if no stable selector exists).
- [x] No hex or `rgba(` literal is left in `GraphView.svelte`; the fallback palette lives in `graph-view.logic.ts`.

## Notes

- **Source:** review-2026-11-04.md section 1 item 9 and row 97; `work/color.md` H3; `work/views.md` P1.
- **Owner decision, recommended:** the Default graph background moves from `#1a1a1e` to the theme's editor background `#2a2e3d`, matching the editor pane.
- **Layer:** `plugins/graph-view` imports a `core/settings` store (allowed); `graph-view.logic.ts` imports only `utils/color.ts` (`pure-logic.test.ts`).
- **Out of scope:** label font and zoom sizing (`:253`), native controls in `GraphControls.svelte`, the pluralized counter, empty and error states, the GraphControls card elevation.
- **Size:** M.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/45-graph-view-theme-palette.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: owner decision recorded from the 2026-11-06 survey; status ready-for-agent.
- 2026-11-06: delivered from branch `issue/88-graph-view-paints-active-theme-s-colors`. The graph palette is derived from the active theme's `ui` tokens (`graph-view.logic.ts`, fallback palette there), `appliedThemeStore.revision` counts theme applications so GraphView repaints on theme change, and the E2E checks the container background per theme. Review round 1 APPROVED with two findings, fixed: `bumpRevision()` writes without tracking (new effect test), `palette` is `$state.raw`. Review round 2 APPROVED, no findings. Tests: pnpm check 0 errors; full suite at 79f2e0a02: vitest 547 files, 13010 passed, 1 skipped, 1 todo; pnpm build ok.
