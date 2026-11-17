# 14: Local graph depth stepper (1 to 3)

**Origin:** design review 2026-11-17, proposal P155, depth part (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html` (the stepper at `:961`), research `.scratch/finders-ux/research/verdict-graph.md` (ticket T2) and `.scratch/finders-ux/research/breakdown.md` (12). The isolated, loading and error states of P155 are 13.

**What to build:**

1. **Store.** `localDepth` (1 to 3, default 1) in `src/lib/plugins/graph-view/graph-view.store.svelte.ts`, with a getter, a setter that clamps to 1-3, and `reset()` (`:30`) returning it to 1. Session state like `mode` and `filters`, not a persisted setting.
2. **Reset on reopen.** Depth resets to 1 when the Graph tab is created again after being closed: in `openGraphTab` (`graph-view.service.ts:34-49`), the branch that calls `editorStore.addTab` sets `localDepth` to 1. Focusing an already open Graph tab keeps the depth, and so does switching away and back. Do not reset on `GraphView` mount, which also runs on every switch back to the tab. Today the filters and mode do not reset on reopen (only `resetGraphView` calls `reset()`); this ticket changes nothing for them.
3. **Graph.** In `GraphView.svelte`, `getDisplayData` passes `graphViewStore.localDepth` to `getLocalGraph` (`:65`, which already takes a depth, `graph-view.logic.ts:103`), and the rebuild effect (`:386-396`) tracks it. No refetch: depth works over the cached snapshot.
4. **Control.** `GraphControls.svelte` shows a stepper in local mode only: a group labelled "Link depth" with "Decrease depth" and "Increase depth" buttons (shadcn `Button`, as used in the controls after 12), disabled at the bounds, and the current value visible.
5. **Help.** Update `help/documentation/14-graph-view.md:39` ("1 hop away") to describe the 1-3 depth stepper.

**Blocked by:** 12, 13

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing test first, `src/tests/lib/plugins/graph-view/graph-view.store.test.ts`: `localDepth` defaults to 1, the setter clamps to 1-3 (0 becomes 1, 5 becomes 3), `reset()` returns it to 1.
- [x] Failing test first, `GraphView.test.ts` local mode: for a chain A-B-C centered on A, depth 1 shows 2 notes and depth 2 shows 3 (footer count), with no extra `invoke` call.
- [x] `GraphControls.test.ts`: the stepper shows only in local mode; Increase is disabled at 3 and Decrease at 1; clicking them changes `graphViewStore.localDepth`; the group and buttons have accessible names.
- [x] Global mode ignores depth.
- [x] `graph-view.service.test.ts`: with `localDepth` 3, closing the Graph tab and opening it again (`openGraphTab` and `toggleGraphTab`) gives depth 1; focusing the already open tab keeps 3.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P155 (depth part).** The local graph has a fixed depth: a 1-3 depth stepper.

## Problem

The local graph always shows only direct neighbours, so a note's second-hop context is never visible while writing.

## Evidence

Checked at `bb57e6165`.

- `src/lib/plugins/graph-view/GraphView.svelte:63-66`: `getLocalGraph(fullData, graphViewStore.centerPath, 1)`, depth fixed; `:386-396` rebuild effect tracking `mode`, `filters` and `centerPath`.
- `src/lib/plugins/graph-view/graph-view.logic.ts:103`: `getLocalGraph(data, centerPath, depth = 1)`.
- `src/lib/plugins/graph-view/graph-view.store.svelte.ts:30`: `reset()`, no depth field.
- `src/lib/plugins/graph-view/graph-view.service.ts:34-49`: `openGraphTab` focuses an existing tab or creates one with `editorStore.addTab`; `:60-70` `toggleGraphTab` (Cmd+G) opens through it; `:73-76` `resetGraphView()` is the only caller of `graphViewStore.reset()`. Closing the tab does not reset the store, so the research's "reset with the graph like the filters" does not hold: the filters survive a reopen.
- `help/documentation/14-graph-view.md:39`: "Shows only the current note and its direct neighbors (1 hop away)."

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: depth resets when the graph is reopened; it is session state, not a setting. Runs after 12 (`GraphControls.svelte` and its test file) and 13 (`GraphView.svelte` and `GraphView.test.ts`).
- 2026-11-17, delivery (branch `issue/14-local-graph-depth-stepper`): `graphViewStore.localDepth` (1-3, clamped, reset by `reset()` and when the Graph tab is created again), the local graph follows it without refetching, and a Decrease/Increase depth stepper shows in the graph controls in local mode; help page updated. Tests: `pnpm vitest run` 645 files, 17089 passed, 54 skipped, exit 0. Review round 1: APPROVED; its two nits were rejected with reasons in `work/14/review.md` § Resolution, no code change.
