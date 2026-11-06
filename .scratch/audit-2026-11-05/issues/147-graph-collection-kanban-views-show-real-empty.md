# 147: Graph, collection and kanban views show real empty and error states

**Migrated from:** `.scratch/ux-polish/issues/61-views-empty-error-states.md` (audit 2026-11-05). Priority: later (refactor, deferred, feature) (bucket 5-later). Partially fixed (the canvas already has an empty hint). It needs 59's primitives.

**Audit check at `5f8003d67`:** partially_fixed (ux, low). Graph: src/lib/plugins/graph-view/GraphView.svelte:72-76 loadAndRebuild catches a buildGraph failure, only logs via error() and returns, so the canvas stays blank with the footer '0 notes - 0 links' (:441); the only overlay text is the local-mode 'Open a note' hint (:431-435). No Retry, no InlineAlert. Collection: parse errors show an alert (CollectionView.svelte:502) and 'Building index...' shows at :508, but no real empty-result state. Kanban: KanbanListView.svelte:55 shows ad-hoc 'No cards' text.

**Stale in the text below:** 'The canvas has no empty-state' is out of date: src/lib/features/canvas/CanvasInner.svelte:588-593 renders an empty-hint with an '+ Add card' button when nodes and edges are empty (though not via a primitive). Depends on 59 for the primitives.

**What to build:** The graph view has no empty or error state and fails silently on a failed load; the canvas has no empty-state; collection and kanban show ad-hoc text. Give each view an `EmptyState` for "nothing here" and an `InlineAlert` with Retry for a failed load.

**Blocked by:** 145

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: a graph test with a rejected load shows the error with Retry, and an empty vault shows the empty state
- [ ] Canvas, collection and kanban empty states use the primitive (tests)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Feature views row 6; graph failure dropped from Issue 06.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/61-views-empty-error-states.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
