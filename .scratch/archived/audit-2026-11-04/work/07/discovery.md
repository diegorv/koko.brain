# Issue 07 discovery: graph local mode center

No `spec.md` in `.scratch/audit-2026-11-04/` (only `findings.md`); the Issue is self-contained.

## Files that change

- `src/lib/plugins/graph-view/graph-view.store.svelte.ts:4-24`: add `centerPath` state, `centerPath` getter, `setCenterPath()`, clear it in `reset()`.
- `src/lib/plugins/graph-view/graph-view.service.ts:20-54`: `openGraphTab()` records the center from `editorStore.activeTab` before it adds or focuses the graph tab; `toggleGraphTab()` does the same on its focus branch (its open branch goes through `openGraphTab()`). The close branch leaves the center alone.
- `src/lib/plugins/graph-view/GraphView.svelte:53-56, 231-235, 376-386, 431`: read `graphViewStore.centerPath` for the local-graph center, the active-node highlight, the re-init effect dependency and the "Open a note" hint.
- Tests: `src/tests/lib/plugins/graph-view/graph-view.service.test.ts`, `graph-view.store.test.ts`, new `GraphView.test.ts` (jsdom).

## Plan

1. Store: `centerPath: string | null`, getter + setter + reset. Test in store test.
2. Service: private `captureCenter()` = `activeTab && isMarkdownNoteTab(activeTab) ? activeTab.path : null`, called before the graph tab becomes active. Tests: note A then `openGraphTab()` -> `/vault/A.md` (fails first); no tab -> null; from Tags virtual tab -> null; A active with graph already open -> focus updates center to A; `toggleGraphTab()` focus branch updates; close branch keeps it.
3. GraphView: swap the three `editorStore.activeTabPath` reads (plus the effect dependency) for `graphViewStore.centerPath`. Drop the `editorStore` import if unused.
4. GraphView jsdom test: mock `@tauri-apps/api/core` `invoke` only, stub `ResizeObserver`, `getBoundingClientRect` (non-zero size so `initSimulation` runs) and canvas `getContext` (null, so `render()` returns early). A links B, C unrelated; local mode with center A -> footer `2 notes`; local mode with no center -> hint text.

## Prior art

- `src/tests/lib/app/EditorView.test.ts:1-40`: jsdom mount, ResizeObserver stub, invoke mock.
- `graph-view.service.test.ts` already uses the real `editorStore` / `graphViewStore`.

## Defaults taken

- "Real note" = `isMarkdownNoteTab` (editor.logic.ts:27), not just `!isVirtualTab`: graph nodes are notes, so a canvas/image/.view tab yields null and the hint, instead of an empty canvas with no hint.
- Opening from a virtual tab or with no tab sets the center to null (does not keep an older center): the Issue asks for null there.

## Risks

- Focusing the graph tab by clicking it in the tab bar goes through `editor.service.ts::switchTab` (core), which cannot import the plugin (ADR-0003). That path keeps the last recorded center (or null after a session restore, which shows the hint). Out of the Issue's prescribed fix; reported, not handled.
- jsdom component test depends on d3-zoom/d3-drag tolerating jsdom; fall back to stating why if it does not.
