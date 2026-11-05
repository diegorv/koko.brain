# 07: Local graph centers on the note that was active before the graph tab opened

**What to build:** Local mode shows the chosen note and its neighbours instead of an empty canvas. When no note was open, it shows the 'Open a note to see its local graph' hint. The active-note highlight works in global mode. Fix: record a center note path when the graph tab is activated (openGraphTab/toggleGraphTab in src/lib/plugins/graph-view/graph-view.service.ts capture editorStore.activeTabPath when it is a real note, i.e. not a virtual tab), stored in graphViewStore with a getter. Then GraphView.svelte:53-56 (getLocalGraph center), :431 (hint) and :231-233 (active-node highlight) read that path instead of editorStore.activeTabPath.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing test first: in src/tests/lib/plugins/graph-view/graph-view.service.test.ts, with the real editorStore and graphViewStore, add markdown tab '/vault/A.md' and call openGraphTab(). Assert that graphViewStore's center path is '/vault/A.md'. It fails today (no such state; the only source is activeTabPath = '__virtual__/graph').
- [x] Test: opening the graph with no note tab (or from another virtual tab) leaves the center null, and switching from note A to the already open graph tab updates the center to A.
- [x] Test (graph-view.store.test.ts): the center getter and reset() clearing it.
- [x] If feasible in jsdom, a GraphView test asserting '2 notes' in local mode for A linked to B (mock only the IPC call); otherwise state why it was skipped.
- [x] Frontend gate green.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 1 of the parallel plan.
- **Finding `graph-local-empty`:** real, medium. Root cause: Local mode centers on editorStore.activeTabPath. GraphView is mounted only while the graph tab is active, so that path is always the virtual GRAPH_VIRTUAL_PATH, getLocalGraph finds no node, and the graph is empty. The 'Open a note' hint and the active-node highlight read the same path, so neither can ever trigger.
  Evidence: EditorView.svelte:74-75 is the only mount of GraphView, under {:else if isGraphTab}. graph-view.service.ts:20-33 openGraphTab adds and activates path GRAPH_VIRTUAL_PATH (editor.logic.ts:9). GraphView.svelte:53-56 calls getLocalGraph(fullData, editorStore.activeTabPath, 1). :431 shows the hint only when !editorStore.activeTabPath, which is never true while mounted. :231-233 highlights the active node by activeTabPath, which is also always the virtual path. graph-view.store.svelte.ts stores no center note. GraphControls.svelte:42 only calls setMode('local').
- **Owner decision (2026-11-04):** D6 (a): center on the real note that was active when the graph tab was opened or focused.
- The logic layer is correct (getLocalGraph with a nonexistent center returns empty, as tested in graph-view.logic.test.ts). The bug is the caller's input. Other activeTabPath readers that may see a virtual tab (TableOfContentsPanel.svelte:12, queryjs-block-widget.ts:110) were not checked.
- **Size:** S.

## Comments

- 2026-11-05, branch issue/07-graph-local-mode-center: graphViewStore holds a center note path (getter + reset). openGraphTab/toggleGraphTab capture the active real note, and GraphView reads it for the local center, the hint and the active-node highlight. Round-1 fix: openGraphTab returns early when the graph tab is already active, so the center is kept. Findings 1 and 3 (center following every focus, hint when the center leaves the data) are deferred to a follow-up. Tests: targeted graph-view, commands, global-keybindings and EditorView (7 files, 191 tests) passed, pnpm check 0 errors; full suite vitest 496 files / 11795 passed, 1 skipped, 1 todo, pnpm build exit 0. Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
