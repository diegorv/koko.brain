# Phase 7: Feature-Level Audit (Canvas, Kanban, Collection)

4 real bugs.

## Real Bugs

### Finding 7.1: Canvas loses last edit on quit
- **File:** src/lib/features/canvas/CanvasInner.svelte:208-220
- **Severity:** data-loss
- **Category:** persist timing
- **Description:** Canvas uses 300ms internal debounce before calling `onContentChange`. `saveAllDirtyTabs` reads `tab.content` which may not reflect latest node data if quit happens within 300ms window. Last canvas edit lost.
- **Repro:** Edit canvas text node, Cmd+Q within 300ms.
- **Fix:** Flush canvas debounce in component destroy, or expose flush method called by saveAllDirtyTabs.

### Finding 7.2: Kanban linkedContentCache serves stale content
- **File:** src/lib/plugins/kanban/kanban.service.ts:37-76
- **Severity:** correctness
- **Category:** cache staleness
- **Description:** Cache keyed by card text, never invalidated when linked files change on disk. Preview shows old content indefinitely until vault teardown.
- **Repro:** Card with `[[Note A]]`. Edit Note A in another tab. Switch back to kanban - stale preview.
- **Fix:** Subscribe to `vaultIndexVersion` to clear cache on changes, or add TTL.

### Finding 7.3: Kanban IDs regenerated on every parse
- **File:** src/lib/plugins/kanban/kanban.logic.ts:83,97
- **Severity:** correctness
- **Category:** DOM stability
- **Description:** `parseKanbanBoard` generates new IDs for every lane/item on every parse. Self-triggered content change re-parses board -> full DOM teardown -> orphans editingItemId, kills focus/scroll.
- **Repro:** Edit card text, blur -> entire board re-renders with new DOM nodes.
- **Fix:** Add `selfUpdate` guard (like CollectionView) or use deterministic IDs.

### Finding 7.4: CollectionTableView no virtualization
- **File:** src/lib/features/collection/CollectionTableView.svelte:43
- **Severity:** correctness
- **Category:** performance
- **Description:** Renders ALL rows without windowing. 5000+ notes -> 100K DOM nodes -> multi-second freeze.
- **Repro:** Collection with no filter in large vault.
- **Fix:** Add row virtualization or default limit with "Show all" button.

## Verified Safe
- Canvas undo/redo syncing flag: queueMicrotask always resets (even on throw)
- Canvas history: bounded at 50 entries
- Canvas SvelteFlow sync: two-flag guard prevents feedback loops
- Kanban drag-and-drop: atomic within JS execution context
- Kanban settings: stored in comment block, no frontmatter conflict
- Collection evaluator: try/catch at every boundary, graceful degradation
- Collection circular refs: depth limit 10, caught and shown as null
- Collection property mutation: clone-before-mutate pattern correct
- Collection html(): DOMPurify sanitization chain correct
