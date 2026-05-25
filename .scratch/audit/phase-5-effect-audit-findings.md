# Phase 5: $effect Deep Audit

No new bugs beyond Phase 1. 40 of 44 effects verified correct.

## Confirmed Bugs (already tracked in Phase 1)

### Finding 5.1: KanbanCard service call without untrack()
- **File:** src/lib/plugins/kanban/KanbanCard.svelte:145
- Confirmed: `loadLinkedFileContent` reads `fsStore.fileTree` synchronously before await -> hidden tracked dependency. Every file tree change re-fires for every visible card.

### Finding 5.2: SearchSection invoke() without untrack()
- **File:** src/lib/core/settings/sections/SearchSection.svelte:35
- Confirmed: `refreshRerankerStatus()` reads `vaultStore.path` in tracking scope. Extra IPC during teardown.

## Verified Correct

40 effects follow project patterns correctly:
- All MarkdownEditor effects (7): proper untrack(), cleanup returns
- All panel effects (BacklinksPanel, OutgoingLinksPanel, TagsPanel, TasksView): proper untrack() + debounce
- All layout effects (+layout.svelte): proper untrack() + cleanup
- Canvas effects: syncing flag + lastSyncedJson guard prevent loops
- GraphView effects: proper untrack()
- All timer effects: return cleanup functions

## Vault Teardown Ordering: Safe
- Store resets fire dependent effects with null/undefined values
- All panel effects have null guards
- Debounced functions won't fire before component unmount
- No data loss or corruption possible from teardown ordering
