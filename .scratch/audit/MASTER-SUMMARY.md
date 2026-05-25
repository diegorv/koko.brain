# Exploratory Bug Audit - Master Summary

**Scope:** ~50K lines in src/lib/ across 7 phases.
**Result:** 24 unique real bugs (deduplicated across phases).

## All Bugs by Priority

### P0: Data Loss Risk (8 bugs)

| # | Bug | File | Phase | Description |
|---|-----|------|-------|-------------|
| 1 | Delete-autosave race | fs.service.ts:166-175 | 3 | File moved to trash, autosave recreates at original path |
| 2 | Rename-autosave race | fs.service.ts:206-215 | 3 | Tab path not updated yet, autosave writes to old path |
| 3 | Move-autosave race | fs.service.ts:250-254 | 3 | Wider window: tab path updated after async refreshTree |
| 4 | Deep-link discards dirty content | deep-link.service.ts:199-228 | 3 | Reads disk not dirty tab, autosave overwrites deep-link content |
| 5 | Deep-link daily same issue | deep-link.service.ts:285-296 | 3 | Same as #4 for daily note |
| 6 | saveDirtyTabs unawaited | editor.service.ts:157-163 | 1 | Failed autosave silently lost, no retry |
| 7 | Canvas quit data loss | CanvasInner.svelte:208-220 | 7 | 300ms debounce not flushed on quit |
| 8 | restoreSnapshot no error handling | file-history.service.ts:84 | 1 | IPC fail -> dialog stuck, user can't restore |

### P1: Correctness (10 bugs)

| # | Bug | File | Phase | Description |
|---|-----|------|-------|-------------|
| 9 | Deep-link skips all indexes | deep-link.service.ts (all writes) | 3 | markRecentSave suppresses watcher, no notifyAfterSave |
| 10 | Callout listener leak | callout-field.ts:103-106 | 1 | document listeners accumulate unboundedly |
| 11 | KanbanCard untrack missing | KanbanCard.svelte:145 | 1 | N unnecessary IPCs per file tree change |
| 12 | Kanban IDs regenerated | kanban.logic.ts:83,97 | 7 | Full DOM teardown on every edit |
| 13 | Kanban stale cache | kanban.service.ts:37-76 | 7 | Preview never refreshed after linked file edit |
| 14 | todoistStore not reset | todoist.store.svelte.ts | 6 | Stale Todoist data after vault switch |
| 15 | lifecycleFilterStore not reset | lifecycle-filter.store.svelte.ts:6 | 6 | Stale archived paths after vault switch |
| 16 | typeDefinitionsStore not reset | type-definitions.store.svelte.ts:4-6 | 6 | Stale type sidebar after vault switch |
| 17 | setTimeout version guard bypass | app-lifecycle.service.ts:221-231 | 2 | Secondary builders run against reset stores |
| 18 | Trash restore phantom entry | trash.service.ts:106-114 | 3 | Manifest save fails -> unrecoverable phantom |

### P2: Security (2 bugs)

| # | Bug | File | Phase | Description |
|---|-----|------|-------|-------------|
| 19 | No queryjs execution timeout | queryjs-block-widget.ts:158-203 | 4 | while(true) -> persistent DoS via shared vault |
| 20 | Chart.js CDN without SRI | kb-ui.ts:948-974 | 4 | Supply chain risk, no integrity check |

### P3: Cosmetic / Low Priority (4 bugs)

| # | Bug | File | Phase | Description |
|---|-----|------|-------|-------------|
| 21 | OutgoingLinksPanel untrack | OutgoingLinksPanel.svelte:37 | 1 | Store mutation outside untrack (no loop now) |
| 22 | SearchSection untrack | SearchSection.svelte:35 | 1 | invoke() without untrack (extra IPC on teardown) |
| 23 | Command palette swallows errors | command-palette.service.ts:155,165 | 1 | .catch(() => {}) discards saveSettings errors |
| 24 | CollectionTableView no virtualization | CollectionTableView.svelte:43 | 7 | All rows rendered, freezes on large vaults |

## Deep-Dive Validation Status

All findings need validation via code reading + test writing before fixing.
Priority: P0 data-loss bugs first (items 1-8), with failing tests to demonstrate each bug.

## Phase-by-Phase Summary

| Phase | Scope | Real Bugs | New (unique) |
|-------|-------|-----------|--------------|
| 1 | Automated scans | 10 | 10 |
| 2 | Save + watcher pipeline | 2 | 1 |
| 3 | File operations | 7 | 7 |
| 4 | QueryJS security | 2 | 2 |
| 5 | $effect deep audit | 2 | 0 (confirmed Phase 1) |
| 6 | Cache + memory | 4 | 3 |
| 7 | Canvas/Kanban/Collection | 4 | 4 |
| **Total** | | | **24 unique** |
