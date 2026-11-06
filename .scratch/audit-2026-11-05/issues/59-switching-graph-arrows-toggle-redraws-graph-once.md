# 59: Switching the graph Arrows toggle redraws the graph at once, also after the layout has settled

**What to build:** GraphControls.svelte:131-134 calls graphViewStore.setDisplay({ showArrows }). render() reads display.showArrows (src/lib/plugins/graph-view/GraphView.svelte:154), but render runs only on simulation ticks (:124), resizeCanvas (:274), zoom events (:301-304) and a hovered-node change (:354-358). The $effect at :375-385 tracks mode, filters and centerPath, not display, and the d3 simulation stops ticking once it cools, so the toggle changes nothing on screen until the user zooms, pans or hovers another node. Fix direction: an effect that reads graphViewStore.display and calls render() untracked.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/plugins/graph-view/GraphView.test.ts (or a sibling GraphView.render.test.ts if the module-level getContext stub at :18 gets in the way): give the canvas a recording 2D context stub, mount the graph, stop or settle the simulation, record the draw call count, call graphViewStore.setDisplay({ showArrows: true }) and flushSync; a new frame was drawn (for example clearRect ran again and arrowheads were filled). It fails today.
- [ ] Switching arrows off redraws without arrowheads.
- [ ] Mode, filter and center changes still rebuild the simulation as before (existing tests stay green).
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/low. The graph view is not in the owner's daily list.
- **Trigger:** Open the graph, wait a few seconds for the force layout to settle, then switch Display > Arrows on or off.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/plugins/graph-view/GraphControls.svelte:131-134 toggle -> graphViewStore.setDisplay. src/lib/plugins/graph-view/graph-view.store.svelte.ts:5,18,25 display state, getter and setter. src/lib/plugins/graph-view/GraphView.svelte:154 drawArrows read only inside render(); render callers :124 (tick), :274 (resizeCanvas), :303 (zoom), :357 (hover change); :375-385 $effect tracks graphViewStore.mode, filters and centerPath only; :390-395 the vaultIndexVersion effect rebuilds only on index changes. rg 'display' in graph-view finds no other reader.
- **Related Issues before the audit:** `.scratch/ux-polish/issues/69-native-controls-to-shadcn.md`
- **Source:** audit 2026-11-05, domain `shell`, finding `N-shell-05` (from shell-ux-3). Size S.

## Comments
