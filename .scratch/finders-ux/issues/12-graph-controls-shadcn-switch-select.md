# 12: Graph controls on shadcn Switch/Select: no Close, working "All", accessible names, filter that does not trap

**Origin:** design review 2026-11-17, proposal P154 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-graph.md` (fold into 208) and `.scratch/finders-ux/research/breakdown.md` (fold into 208). Absorbs the graph half of `.scratch/open-itens/issues/208-graph-controls-event-dialog-use-shadcn-select.md`; its EventDialog checkbox half is not part of this ticket.

**What to build:** in `src/lib/plugins/graph-view/GraphControls.svelte`, with a small prop change in `GraphView.svelte`:

1. **shadcn controls.** The two native `<select>`s (`:100-109` tags, `:113-122` folders) become the shadcn `Select` (`#lib/components/ui/select/`), and the two hand-built switch buttons (`:88-96` Orphans, `:131-139` Arrows) become the shadcn `Switch` (`#lib/components/ui/switch/`). Each Switch is named by its visible label ("Orphans", "Arrows").
2. **"All" items.** "All tags" and "All folders" use a sentinel value (for example `__all__`) mapped back to `null` in `setFilters`, because bits-ui treats `''` as "no value" (`node_modules/bits-ui/dist/bits/select/select.svelte.js:151,199,233`), so an `''` item would show as unselected.
3. **No Close.** Remove the Close button (`:67-73`), its separator (`:65`) and the `X` and `closeGraphTab` imports (`:2`, `:8`), and update the `<!-- Mode + Close -->` comment at `:27`. `closeGraphTab` stays in the service for `resetGraphView`. The graph tab still closes from the tab bar X and with Cmd+G. Update `help/documentation/14-graph-view.md:62`.
4. **Icon button names.** The Global, Local, Zoom in and Zoom out buttons (`:29-63`) get an `aria-label` (they have only `title`).
5. **Trapped filter fix.** Build the filter options from the graph before filters are applied (the global graph, or the local graph in local mode), not from `simNodes` (`GraphView.svelte:457`). Today picking a folder with no subfolders leaves one folder, `folders.length > 1` (`:112`) is false, the select disappears, and nothing in the panel can clear the filter; a tag plus folder combination that leaves zero nodes hides the tag select the same way (`:99`). `fullData` (`GraphView.svelte:44`) is a plain `let`, so keep a `$state.raw` copy of the pre-filter nodes and pass it to `GraphControls`.
6. Search stays a filter. No "Filters (n)" popover.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing test first, in a new `src/tests/lib/plugins/graph-view/GraphControls.test.ts` (real `graphViewStore`, no store mock; Select recipe from `src/tests/lib/core/settings/UpdateSection.channel.test.ts:33-100`): with notes in folders `a/` and `b/`, after picking folder `a` the folder control is still shown and offers "All folders" and `b`; choosing "All folders" sets `filters.folder` to `null`.
- [x] Picking a tag sets `filters.tag` to it; "All tags" sets `null`.
- [x] Orphans and Arrows are `role="switch"` with `aria-checked`; toggling them sets `filters.showOrphans` and `display.showArrows`.
- [x] No native `<select>` is left in GraphControls.
- [x] There is no Close button in the controls; the graph tab still closes from the tab bar and with Cmd+G (existing `graph-view.service.test.ts` cases stay green).
- [x] The mode and zoom buttons have accessible names.
- [x] `GraphView.test.ts` stays green; the help page no longer mentions a Close button.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P154.** Graph controls: fake switches, native selects and a duplicate Close. Use shadcn Switch and Select and remove the Close button. A "Filters (n)" popover is optional. Validation: search keeps filtering, as in Obsidian.
- **208 (absorbed, graph half).** GraphControls uses native selects and a hand-built switch; replace them with the shadcn `Select` and `Switch`. Native date and time inputs stay.

## Problem

The Orphans and Arrows toggles are plain buttons with no switch role or state. The filters are native selects that do not match the rest of the app. Close duplicates the tab's close X. The icon buttons have no accessible names. The folder and tag options come from the already-filtered nodes, so picking a folder with no subfolders hides the folder select and the filter cannot be cleared from the panel.

## Evidence

Checked at `bb57e6165`.

- `src/lib/plugins/graph-view/GraphControls.svelte:22-23`: options derived from the `nodes` prop; `:29-63` icon buttons with only `title`; `:65-73` separator and Close; `:88-96` and `:131-139` hand-built switches; `:99` and `:112` the option-count gates; `:100-122` native selects.
- `src/lib/plugins/graph-view/GraphView.svelte:44` `let fullData`; `:63-74` `getDisplayData` applies the filters; `:456-460` `<GraphControls nodes={simNodes} ...>`.
- `src/lib/plugins/graph-view/graph-view.service.ts:60-70`: `toggleGraphTab` (Cmd+G). `src/lib/core/markdown-editor/EditorTabs.svelte:84-91`: the tab's close button.
- `.scratch/archived/audit-2026-11-04/findings.md:65`: the trapped filter, confirmed then, never ticketed.
- `src/lib/components/ui/select/` and `src/lib/components/ui/switch/` exist. bits-ui is 2.20.6 in `node_modules`, and the `''` handling above holds in it.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: remove the graph Close button (the tab bar and Cmd+G still close it); the trapped-filter fix is part of this ticket.
- 2026-11-17, branch issue/12-graph-controls-shadcn-switch-select: GraphControls moved to shadcn Switch/Select (no native `<select>`), the Close button removed (help page updated), "All folders"/"All tags" clear the filter, a set filter outside the current options stays selectable, mode and zoom buttons have accessible names. Review round 1 APPROVED with findings (fixed: tests for set filters outside local-mode options, label-click toggles once); round 2 APPROVED, no findings. Tests: `pnpm check` 0 errors; GraphControls.test.ts 12 passed; full suite 645 files, 17244 passed, 54 skipped, 0 failed (one earlier run had a load-induced codemap timeout).
