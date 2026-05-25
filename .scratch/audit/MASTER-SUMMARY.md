# Exploratory Bug Audit - Master Summary

**Scope:** ~50K lines in src/lib/ across 7 phases.
**Result:** 24 unique real bugs found. 6 fixed so far.

## FIXED (6 bugs - 2 commits)

| # | Bug | Commit | Fix |
|---|-----|--------|-----|
| 1 | Delete-autosave race | `b902a62` | Close tabs BEFORE moveToTrash |
| 2 | Rename-autosave race | `b902a62` | Update tab path right after rename(), before link updates |
| 3 | Move-autosave race | `b902a62` | Update tab path right after rename(), before refreshTree |
| 4 | Deep-link discards dirty content | `99b18ce` | Added syncExternalContentToEditor after writes |
| 5 | Deep-link daily same issue | `99b18ce` | Same fix as #4 |
| 9 | Deep-link skips all indexes | `99b18ce` | Added notifyAfterSave after ALL deep-link writes |

---

## REMAINING (18 bugs) - Grouped by Domain

### Domain: Editor / Save Pipeline (2 bugs)

| # | Bug | File | Severity | Description |
|---|-----|------|----------|-------------|
| 6 | saveDirtyTabs unawaited | editor.service.ts:157-163 | P1 | Failed autosave silently lost, no retry |
| 7 | Canvas quit data loss | CanvasInner.svelte:208-220 | P0 | 300ms debounce not flushed on quit |

### Domain: App Lifecycle / Vault Switch (4 bugs)

| # | Bug | File | Severity | Description |
|---|-----|------|----------|-------------|
| 14 | todoistStore not reset | todoist.store.svelte.ts | P1 | Stale Todoist data after vault switch |
| 15 | lifecycleFilterStore not reset | lifecycle-filter.store.svelte.ts:6 | P1 | Stale archived paths after vault switch |
| 16 | typeDefinitionsStore not reset | type-definitions.store.svelte.ts:4-6 | P1 | Stale type sidebar after vault switch |
| 17 | setTimeout version guard bypass | app-lifecycle.service.ts:221-231 | P1 | Secondary builders run against reset stores |

### Domain: Kanban (3 bugs)

| # | Bug | File | Severity | Description |
|---|-----|------|----------|-------------|
| 11 | KanbanCard untrack missing | KanbanCard.svelte:145 | P1 | N unnecessary IPCs per file tree change |
| 12 | Kanban IDs regenerated | kanban.logic.ts:83,97 | P1 | Full DOM teardown on every edit |
| 13 | Kanban stale cache | kanban.service.ts:37-76 | P1 | Preview never refreshed after linked file edit |

### Domain: Live Preview / Widgets (1 bug)

| # | Bug | File | Severity | Description |
|---|-----|------|----------|-------------|
| 10 | Callout listener leak | callout-field.ts:103-106 | P1 | document listeners accumulate unboundedly |

### Domain: Trash (1 bug)

| # | Bug | File | Severity | Description |
|---|-----|------|----------|-------------|
| 18 | Trash restore phantom entry | trash.service.ts:106-114 | P1 | Manifest save fails -> unrecoverable phantom |

### Domain: File History (1 bug)

| # | Bug | File | Severity | Description |
|---|-----|------|----------|-------------|
| 8 | restoreSnapshot no error handling | file-history.service.ts:84 | P1 | IPC fail -> dialog stuck |

### Domain: QueryJS Security (2 bugs)

| # | Bug | File | Severity | Description |
|---|-----|------|----------|-------------|
| 19 | No queryjs execution timeout | queryjs-block-widget.ts:158-203 | P2 | while(true) -> persistent DoS via shared vault |
| 20 | Chart.js CDN without SRI | kb-ui.ts:948-974 | P2 | Supply chain risk |

### Domain: Cosmetic / Low Priority (4 bugs)

| # | Bug | File | Severity | Description |
|---|-----|------|----------|-------------|
| 21 | OutgoingLinksPanel untrack | OutgoingLinksPanel.svelte:37 | P3 | Store mutation outside untrack |
| 22 | SearchSection untrack | SearchSection.svelte:35 | P3 | invoke() without untrack |
| 23 | Command palette swallows errors | command-palette.service.ts:155,165 | P3 | .catch(() => {}) discards errors |
| 24 | CollectionTableView no virtualization | CollectionTableView.svelte:43 | P3 | Freezes on large vaults |

---

## Fix Order (next domains to attack)

1. **Editor / Save Pipeline** (bugs 6-7) - data loss risk
2. **App Lifecycle / Vault Switch** (bugs 14-17) - correctness on vault switch
3. **Kanban** (bugs 11-13) - performance + correctness
4. **Live Preview** (bug 10) - memory leak
5. **Trash + File History** (bugs 8, 18) - edge cases
6. **QueryJS Security** (bugs 19-20) - shared vault scenario
7. **Cosmetic** (bugs 21-24) - nice to fix
