# Phase 6: Cache + Memory Audit

3 new bugs (stores not reset on teardown). 1 confirmed from Phase 1 (callout listener leak).

## Real Bugs

### Finding 6.1: Callout document listener leak (confirmed from Phase 1)
- **File:** src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:103-106
- **Severity:** performance
- **Description:** `document.addEventListener('mousedown', ...)` in toDOM() without removeEventListener. Each viewport rebuild adds listener. Closures retain detached DOM.

### Finding 6.2: todoistStore never reset on vault teardown
- **File:** src/lib/features/tasks/todoist.store.svelte.ts
- **Severity:** correctness
- **Description:** `resetTasks()` resets `tasksStore` but not `todoistStore`. After vault switch, stale Todoist projects/sections/sent-tasks persist and show in wrong vault.
- **Fix:** Add `todoistStore.reset()` call in `teardownVault()` or in `resetTasks()`.

### Finding 6.3: lifecycleFilterStore never reset on vault teardown
- **File:** src/lib/features/properties/lifecycle-filter.store.svelte.ts:6
- **Severity:** correctness
- **Description:** `archivedPaths` Set survives vault teardown. After vault switch, old vault's archived paths could filter out files in new vault if paths match.
- **Fix:** Add reset call in teardown (add to `resetProperties()` or add dedicated reset).

### Finding 6.4: typeDefinitionsStore never reset on vault teardown
- **File:** src/lib/features/type-definitions/type-definitions.store.svelte.ts:4-6
- **Severity:** correctness
- **Description:** `typeMetadataMap` and `entries` (100-500 KB) survive vault teardown. Stale type sidebar data visible during transition.
- **Fix:** Add reset call in teardown.

## Memory Estimate (8h session, 50 files)

| Category | Estimate |
|----------|----------|
| Per-file caches | ~37.5 KB |
| Per-edit caches (mermaid/math/collection) | ~300 KB |
| Fixed overhead (LRU, completion, icons) | ~830 KB |
| **Total** | **~1.2 MB** |

Well within acceptable bounds for desktop app.

## All Caches Audited (23 total)
- 4 real bugs
- 5 acceptable tradeoffs (unbounded but cleared on teardown)
- 14 false positives (properly bounded and/or cleared)
