# 004 discovery: canvas close-time flush

Issue 015 is merged (da26b0dcd): closeTab saves a dirty tab, re-saves once, and asks
`Failed to save <name>. Close anyway and lose unsaved changes?` on failure.

## Files that change

- src/lib/core/editor/editor.service.ts
  - next to the `tabCloseListeners` registry (:14-46): `pendingEditFlushers: Map<string, Set<() => void>>`,
    `registerPendingEditFlusher(path, flush)` (unregister deletes only that function, by identity;
    the Set is dropped when empty), `flushPendingEdits(path)` (runs each flusher, `error('EDITOR', ...)`
    on a throw, returns false if any threw, true otherwise, true with none registered).
  - closeTab (:311-340): after the pinned check, for a non-virtual tab, call
    `flushPendingEdits(tabPath)` first. Enter the save block when the flush failed or the path is
    dirty (isPathDirty, re-read from the store because the flush replaced content). Prompt when
    the flush failed, the save failed, or the tab is still dirty. A failed flush still saves what
    the tab holds before asking.
- src/lib/features/canvas/CanvasInner.svelte
  - import `onMount` and `registerPendingEditFlusher`; on mount register a flusher for `ownPath`
    (`if (!pendingPersist) return; clearTimeout(nodesChangeTimer); persistChanges(nodes, edges);
    pendingPersist = false;`), return the unregister so it runs on destroy.
  - comment above onDestroy (:243-245): covers a tab switch and a source-mode toggle; a close goes
    through the registered flusher; no claim about quit.

## Tests

- src/tests/lib/features/canvas/canvas-tab-switch.test.ts: add `vi.mock('@tauri-apps/plugin-dialog')`,
  the failing close test from criterion 1, and a no-pending-edit close test (no write, no ask).
- src/tests/lib/core/editor/editor.service.test.ts `describe('closeTab')`: flusher runs before the
  dirty check and its write is saved with no ask; other-path / unregistered / pinned flushers not
  called; unregistering one of two flushers for a path keeps the other; throwing flusher is logged
  (`error` mock from `#lib/utils/debug.js`), asks 015's prompt, Cancel keeps the tab, confirm closes.
- Prior art: the 015 closeTab tests at editor.service.test.ts:626-733 and the registerTabCloseListener
  tests at :765-792.

## Risks

- A flusher calls onContentChangeForPath, which arms the 2 s body autosave; after the close the
  debounced save finds no dirty tab for that path, so it is a no-op.
- Layer rule: core does not import features; the canvas imports core (allowed).

## Defaults taken

- The flush is not run for a virtual tab or a pinned tab (pinned returns before it).
- The returned unregister is idempotent (Set delete).
