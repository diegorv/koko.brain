# Exploratory Bug Audit - Master Summary

**Scope:** ~50K lines in src/lib/ across 7 phases.
**Result:** 24 unique real bugs found. 18 fixed, 6 remaining.

## FIXED (18 bugs - 12 commits)

| # | Bug | Commit | Fix |
|---|-----|--------|-----|
| 1 | Delete-autosave race | `b902a62` | Close tabs BEFORE moveToTrash |
| 2 | Rename-autosave race | `b902a62` | Update tab path right after rename(), before link updates |
| 3 | Move-autosave race | `b902a62` | Update tab path right after rename(), before refreshTree |
| 4 | Deep-link discards dirty content | `99b18ce` | Added syncExternalContentToEditor after writes |
| 5 | Deep-link daily same issue | `99b18ce` | Same fix as #4 |
| 9 | Deep-link skips all indexes | `99b18ce` | Added notifyAfterSave after ALL deep-link writes |
| 6 | saveDirtyTabs unawaited | `463cad4` | Await promises, retry after 5s on failure |
| 7 | Canvas quit data loss | `44daee1` | Flush pending persist on component destroy |
| 14 | todoistStore not reset | `60d0f14` | Add todoistStore.reset() to teardownVault |
| 15 | lifecycleFilterStore not reset | `60d0f14` | Add lifecycleFilterStore.reset() to teardownVault |
| 16 | typeDefinitionsStore not reset | `60d0f14` | Add typeDefinitionsStore.reset() to teardownVault |
| 17 | setTimeout version guard | `2441fe9` | Store timer handle, cancel in teardownVault, add version guard |
| 11 | KanbanCard untrack | `c1eb64b` | Wrap loadLinkedFileContent in untrack() |
| 13 | Kanban stale cache | `c96e663` | Clear linkedContentCache on save and watcher events |
| 12 | Kanban IDs regenerated | `ea2a180` | Add selfUpdate guard to skip re-parse on own edits |
| 10 | Callout listener leak | `bc5078b` | Add destroy() to remove document listener |
| 8 | restoreSnapshot error | `ad07d54` | Add try/catch, log, re-throw |
| 18 | Trash restore phantom | `f01701c` | Catch manifest save failure, still update store |

---

## REMAINING (6 bugs)

### P2: Security (2 bugs)

| # | Bug | File | Description |
|---|-----|------|-------------|
| 19 | No queryjs execution timeout | queryjs-block-widget.ts:158-203 | while(true) -> persistent DoS via shared vault |
| 20 | Chart.js CDN without SRI | kb-ui.ts:948-974 | Supply chain risk |

### P3: Cosmetic / Low Priority (4 bugs)

| # | Bug | File | Description |
|---|-----|------|-------------|
| 21 | OutgoingLinksPanel untrack | OutgoingLinksPanel.svelte:37 | Store mutation outside untrack |
| 22 | SearchSection untrack | SearchSection.svelte:35 | invoke() without untrack |
| 23 | Command palette swallows errors | command-palette.service.ts:155,165 | .catch(() => {}) discards errors |
| 24 | CollectionTableView no virtualization | CollectionTableView.svelte:43 | Freezes on large vaults |
