# Exploratory Bug Audit - Master Summary

**Scope:** ~50K lines in src/lib/ across 7 phases.
**Result:** 24 unique real bugs found. 22 fixed, 2 remaining (1 deferred, 1 feature request).

## FIXED (22 bugs - 15 commits)

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

| 20 | Chart.js CDN -> bundled | `1f4f848` | Install chart.js, dynamic import, tighten CSP |
| 21 | OutgoingLinksPanel untrack | `bb57174` | Move reset into untrack() |
| 22 | SearchSection untrack | `bb57174` | Wrap refreshRerankerStatus in untrack() |
| 23 | Command palette catch | `bb57174` | Log errors instead of swallowing |

## REMAINING (2 bugs)

| # | Bug | Status | Description |
|---|-----|--------|-------------|
| 19 | No queryjs execution timeout | DEFERRED | Needs architectural decision (timeout vs worker vs iframe sandbox) |
| 24 | CollectionTableView no virtualization | FEATURE REQUEST | Performance for 5000+ note vaults, not a bug |
