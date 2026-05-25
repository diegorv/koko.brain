# Deep-Dive Validation Report

## Methodology

For each P0 data-loss bug: read exact code, trace execution path, write failing test.
For P1-P3: read code, classify as confirmed/downgraded/false-positive.

## P0 Data-Loss Bugs: VALIDATED (6 of 8 with failing tests)

### CONFIRMED CRITICAL (failing tests prove these):

| # | Bug | Test Result | Real Impact |
|---|-----|-------------|-------------|
| 1 | Delete-autosave race | FAIL (ordering wrong) | File resurrected at original path after trash move |
| 2 | Rename-autosave race | FAIL (tab update after links) | Orphaned file at old path |
| 3 | Move-autosave race | FAIL (tab update after refreshTree) | Orphaned file at source path |
| 4 | Deep-link discards dirty content | FAIL (no syncExternalContentToEditor) | Auto-save overwrites deep-link changes |
| 5 | Deep-link daily same | Same pattern as #4 | Same impact |
| 9 | Deep-link skips indexes | FAIL (no notifyAfterSave) | All indexes stale, watcher suppressed |

**Trigger conditions for bugs 1-3:**
- User has a dirty tab (typed recently)
- User triggers delete/rename/move within 2s of last edit (auto-save pending)
- NOT a corner case: common flow is "edit file, then organize (rename/move/delete)"

**Trigger conditions for bugs 4-5:**
- Any deep-link targeting an already-open dirty file
- NOT a corner case: daily note is almost always open, deep-links target it frequently

### CONFIRMED but harder to trigger:

| # | Bug | Assessment |
|---|-----|------------|
| 6 | saveDirtyTabs unawaited | Real but mitigated by toast notification on failure. Only causes data loss on crash AFTER a failed auto-save. Requires disk error + crash in sequence. DOWNGRADE to P1. |
| 7 | Canvas quit data loss | Real but requires Cmd+Q within 300ms of last canvas node edit. Narrow window. Keep P0 but note tight timing. |
| 8 | restoreSnapshot no error handling | Real but only breaks dialog UX, no data loss (snapshot not overwritten). DOWNGRADE to P1. |

## P1 Correctness Bugs: VALIDATED

| # | Bug | Validated? | Notes |
|---|-----|-----------|-------|
| 10 | Callout listener leak | CONFIRMED | Real accumulation, verified no destroy() hook available in WidgetType |
| 11 | KanbanCard untrack | CONFIRMED by Phase 5 deep audit | fsStore.fileTree is tracked dependency |
| 12 | Kanban IDs regenerated | CONFIRMED | generateKanbanId() called on every parse, no selfUpdate guard |
| 13 | Kanban stale cache | CONFIRMED | No invalidation on vaultIndexVersion change |
| 14-16 | Stores not reset on teardown | CONFIRMED | todoistStore, lifecycleFilterStore, typeDefinitionsStore all missing from teardown |
| 17 | setTimeout version guard | CONFIRMED | Anonymous timer, no cancellation possible |
| 18 | Trash restore phantom | CONFIRMED but low probability | Requires saveManifest to fail (disk error) |

## P2 Security: VALIDATED

| # | Bug | Assessment |
|---|-----|-----------|
| 19 | QueryJS no timeout | CONFIRMED real vulnerability for shared vault scenario. Low priority for single-user. |
| 20 | Chart.js no SRI | CONFIRMED. Easy fix (add integrity attr). Supply-chain risk is real but probabilistically low. |

## P3 Cosmetic: DOWNGRADED

| # | Bug | Assessment |
|---|-----|-----------|
| 21 | OutgoingLinksPanel untrack | No loop, no visible impact. DOWNGRADE to "nice to fix" |
| 22 | SearchSection untrack | One extra IPC on vault teardown. Negligible. DOWNGRADE to "nice to fix" |
| 23 | Command palette catch | Layout reverts on restart. Not data loss. Keep P3. |
| 24 | CollectionTableView no virtualization | Performance issue, not bug. Only affects 5000+ note vaults. Keep P3. |

## FINAL PRIORITY (recalibrated)

### Must Fix (data loss, common trigger):
1. Delete-autosave race (fs.service.ts:166)
2. Rename-autosave race (fs.service.ts:206)
3. Move-autosave race (fs.service.ts:250)
4. Deep-link discards dirty content (deep-link.service.ts:199)
5. Deep-link daily action same (deep-link.service.ts:285)
6. Deep-link skips index updates (deep-link.service.ts all writes)

### Should Fix (correctness, noticeable):
7. Canvas quit data loss (CanvasInner.svelte:208)
8. setTimeout version guard bypass (app-lifecycle.service.ts:221)
9. Callout listener leak (callout-field.ts:103)
10. KanbanCard unnecessary IPCs (KanbanCard.svelte:145)
11. Kanban IDs regenerated (kanban.logic.ts:83)
12. Kanban stale cache (kanban.service.ts:37)
13. Stores not reset: todoistStore, lifecycleFilterStore, typeDefinitionsStore

### Nice to Fix (low impact):
14. saveDirtyTabs unawaited (mitigated by toast)
15. restoreSnapshot error handling
16. Trash restore phantom entry
17. QueryJS timeout (shared vault only)
18. Chart.js SRI hash
19. OutgoingLinksPanel/SearchSection untrack
20. Command palette catch logging
21. CollectionTableView virtualization

## False Positives Eliminated

None of the P0-P1 findings were downgraded to false positive during validation.
All were confirmed by code reading and/or failing tests.
