# Issue 14 discovery

No `spec.md` in `.scratch/finders-ux/`. Line numbers are at 7d59793ff (after Issues 12 and 13).

## Files that change

- `src/lib/plugins/graph-view/graph-view.store.svelte.ts`: `localDepth` `$state` (default 1), getter, `setLocalDepth(n)` clamping to 1-3, `reset()` (`:30`) sets 1. Export `MIN_LOCAL_DEPTH` / `MAX_LOCAL_DEPTH` so the controls disable at the same bounds.
- `src/lib/plugins/graph-view/graph-view.service.ts:42-48`: the `editorStore.addTab` branch of `openGraphTab` calls `graphViewStore.setLocalDepth(1)`. The focus branch and `toggleGraphTab`'s focus branch keep it.
- `src/lib/plugins/graph-view/GraphView.svelte`: after Issue 12 the local subgraph is built in `getBaseData` (`:85-89`), not `getDisplayData`; pass `graphViewStore.localDepth` there instead of `1`. Rebuild effect (`:419-429`) reads `graphViewStore.localDepth`. No refetch.
- `src/lib/plugins/graph-view/GraphControls.svelte`: in local mode only, a `role="group"` `aria-label="Link depth"` with shadcn `Button` (ghost, icon-sm-ish) Minus/Plus, `aria-label` "Decrease depth" / "Increase depth", disabled at the bounds, value shown between them. Placed in the Mode + Zoom bar after a separator.
- `help/documentation/14-graph-view.md:39`: describe the 1-3 depth stepper.

## Tests (prior art in the same files)

- `graph-view.store.test.ts`: default 1, clamp 0->1, 5->3, 2 stays, `reset()` -> 1.
- `GraphView.test.ts` local mode: chain a->b->c centered on a; depth 1 "2 notes", `setLocalDepth(2)` -> "3 notes", `invoke` call count unchanged. Global mode with depth 3 still shows the whole vault plus an unrelated d.
- `GraphControls.test.ts` (mounted through GraphView like the existing cases): no group in global mode; local mode shows group, value 1, Decrease disabled; clicking Increase twice -> store 3, Increase disabled; Decrease -> 2.
- `graph-view.service.test.ts`: depth 3, close tab, `openGraphTab()` -> 1; same with `toggleGraphTab()`; focusing the open tab from another note (both functions) keeps 3.

## Risks

- Depth survives switching tabs because `GraphView` mount does not touch it (Issue requirement); session restore that re-adds the graph tab without `openGraphTab` keeps the session's depth (store is not persisted, so it is 1 after a restart anyway).
- Depth 3 in a dense vault can pull most of the graph; accepted, it reuses the cached snapshot.

## Defaults taken

- Setter rounds nothing: callers pass integers (only the stepper and the service call it).
- Stepper sits in the top bar next to the mode buttons, shown only when `mode === 'local'` (also when no center is set).
