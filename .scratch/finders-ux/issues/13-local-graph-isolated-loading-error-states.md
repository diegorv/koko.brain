# 13: Local graph isolated, loading and error states with Retry

**Origin:** design review 2026-11-17, proposal P155 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-graph.md` (fold into 206) and `.scratch/finders-ux/research/breakdown.md` (fold into 206). Absorbs the graph half of `.scratch/open-itens/issues/206-graph-collection-kanban-views-show-real-empty.md`; its canvas, collection and kanban halves are not part of this ticket. The depth stepper half of P155 is 14.

**What to build:** in `src/lib/plugins/graph-view/GraphView.svelte`, as overlays in the same style as the existing "Open a note to see its local graph" hint (`:451-455`: `absolute inset-0 flex items-center justify-center`, `text-sm text-muted-foreground`). Plain markup matching the existing panels; no new shared primitive. Old 206 planned `EmptyState` and `InlineAlert` primitives from open-itens 204, but `src/lib/components/ui/` has neither and 204 is abandoned with `.scratch/open-itens`.

1. **Isolated note.** In local mode, when the center note is present in the full graph with zero links, show "This note has no links yet". It shows with Orphans on and with Orphans off: with Orphans off `filterGraphData` (`graph-view.logic.ts:70-87`) removes the center and 0 nodes draw, so the check reads the full graph, not the displayed one. It shows only when the center is present in the graph; a center path missing from the graph keeps today's behaviour (out of scope here).
2. **Empty vault.** When the first snapshot resolves with zero notes, show "No notes to graph yet".
3. **Loading.** "Building graph..." until the first snapshot resolves. `loadAndRebuild` runs on every `vaultIndexVersion` bump (`:411-416`), which happens on each save, so later rebuilds keep the current graph on screen without the line.
4. **Error with Retry.** When `buildGraph` rejects (`:81-91`, today only logged), keep the logged `error()` and show an inline error, "Could not build the graph.", with a Retry button (the shared `Button`) inside `role="alert"`. Retry re-runs `loadAndRebuild()`; a successful retry removes the alert and shows the graph. A failed refresh after a successful load keeps the previous graph and shows the alert.
5. Reuse 12's pre-filter `$state.raw` state for the isolated check; do not add a second reactive copy of `fullData`.

**Blocked by:** 12

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first, `src/tests/lib/plugins/graph-view/GraphView.test.ts`: a local graph centered on a note with no links shows "This note has no links yet", with Orphans on and with Orphans off.
- [ ] A local graph centered on a note with links does not show the isolated message.
- [ ] While the first `invoke('get_all_vault_entries_v2')` is pending, "Building graph..." shows; after it resolves the line is gone; a later `vaultIndexVersion` bump with a pending fetch does not show it.
- [ ] Failing test first: a rejected load shows "Could not build the graph." with a Retry button in `role="alert"`; Retry with a resolving `invoke` removes the alert and the footer shows the note count.
- [ ] A first snapshot with zero notes shows "No notes to graph yet".
- [ ] The existing "Open a note to see its local graph" hint and the other `GraphView.test.ts` cases stay green.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P155.** The local graph has a fixed depth and no isolated, loading or error state. A 1-3 depth stepper, "This note has no links yet", a loading line, and an inline error with Retry.
- **206 (absorbed, graph half).** The graph view has no empty or error state and fails silently on a failed load. Give it an empty state for "nothing here" and an inline alert with Retry for a failed load. Its criterion: a graph test with a rejected load shows the error with Retry, and an empty vault shows the empty state.

## Problem

The canvas is blank while the graph builds. A failed load only goes to the log, so the canvas stays blank with the footer "0 notes - 0 links". A note with no links shows a lone dot, or nothing at all when Orphans is off, with no explanation.

## Evidence

Checked at `bb57e6165`.

- `src/lib/plugins/graph-view/GraphView.svelte:44` `let fullData` (not reactive); `:63-74` `getDisplayData` (local graph, then filters); `:81-91` `loadAndRebuild` catches, logs with `error()` and returns; `:411-416` the `vaultIndexVersion` effect that also runs on mount; `:451-455` the only overlay, the no-center hint; `:461-463` footer count.
- `src/lib/plugins/graph-view/graph-view.logic.ts:70-87`: `filterGraphData` drops nodes with `linkCount` 0 when Orphans is off, including the center.
- `src/tests/lib/plugins/graph-view/GraphView.test.ts:18`: `getContext` returns null, so `render()` returns early; overlay assertions need no canvas.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: isolated message wording as in the review ("This note has no links yet"); the isolated state shows only when the center note is present in the graph; plain markup instead of shared empty-state and alert primitives; runs after 12 because both add reactive graph state at `GraphView.svelte:44` and edit the adjacent template lines `:451-460`; the loading line shows only before the first snapshot. Wording for the states the review does not word: "Building graph...", "Could not build the graph." with Retry, and "No notes to graph yet".
