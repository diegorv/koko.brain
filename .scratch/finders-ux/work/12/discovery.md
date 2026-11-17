# Issue 12 discovery

No `spec.md` in `.scratch/finders-ux/`. Line numbers below are at 5a84215b3 and match the Issue.

## Files that change

- `src/lib/plugins/graph-view/GraphControls.svelte`
  - `:2`, `:8` drop `X` and `closeGraphTab` imports; `:65-73` drop separator + Close; `:27` comment becomes "Mode + Zoom".
  - `:29-63` add `aria-label` ("Global graph", "Local graph", "Zoom in", "Zoom out") next to `title`.
  - `:86-97`, `:129-140` hand-built switches become shadcn `Switch` inside the existing `<label>` (implicit label gives the name "Orphans" / "Arrows"), `onCheckedChange` writes the store.
  - `:99-123` native selects become shadcn `Select` (`type="single"`), triggers `size="sm"` with `aria-label` "Tag filter" / "Folder filter". "All" items use the sentinel `__all__`, mapped to `null` in `setFilters`.
  - Gates `:99` / `:112` also stay open while that filter is set (`|| filters.tag` / `|| filters.folder`), so a value missing from the current option list (e.g. folder set in global, then local mode) still shows a control that can clear it.
- `src/lib/plugins/graph-view/GraphView.svelte`
  - `:63-74` split `getDisplayData` into `getBaseData()` (global, or local when centered) + the filter step.
  - New `let filterOptionNodes = $state.raw<GraphNode[]>([])`, set from the base graph in `initSimulation` (`:96`), passed as `nodes` at `:457` instead of `simNodes`.
- `help/documentation/14-graph-view.md:62` drop the Close button mention; say the tab closes from the tab bar X or Cmd+G.

## Tests

- New `src/tests/lib/plugins/graph-view/GraphControls.test.ts` (jsdom, real `graphViewStore`). Select recipe from `src/tests/lib/core/settings/UpdateSection.channel.test.ts:33-100` and the `choose()` helper at `src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts:186-200` (pointerup + click on the option). It mounts the controls through `GraphView` (stubs copied from `GraphView.test.ts`), because the trap lives in which nodes GraphView passes: a direct mount with fixed nodes would pass before the fix. Cases: folder pick keeps "All folders" + `b`, "All folders" -> null, tag pick / "All tags" -> null, tag + folder leaving zero nodes keeps the tag control, switches role + aria-checked + store writes, no `<select>`, no Close button, mode/zoom names. Option queries are scoped to the trigger's `aria-controls` listbox (a closed Select's content can linger in jsdom).
- `graph-view.service.test.ts` closeGraphTab / toggle cases stay as is.

## Risks

- Switch inside `<label>`: clicking the label forwards one click to the button; clicking the button itself does not double-toggle (label activation skips its own control).
- The Select portals its content to `document.body`; tests query `document`.

## Defaults taken

- Sentinel `__all__`; a real tag or folder named `__all__` is ignored as a non-case.
- Trigger names "Tag filter" / "Folder filter" (the Issue names only the switches).
