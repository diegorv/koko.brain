# Phase 1: Automated Pattern Scan Findings

10 real bugs, 4 low-probability bugs, 10 acceptable tradeoffs.

## Fix-Now (data-loss / security)

### Finding 1.1: Deep-link prepend/append read-modify-write race
- **File:** src/lib/features/deep-link/deep-link.service.ts:199-228
- **Severity:** data-loss
- **Category:** race-condition
- **Description:** Both prepend and append branches do: `exists(fullPath)` -> `readTextFile(fullPath)` -> `writeTextFile(fullPath, ...)`. If two deep links arrive in quick succession (rapid Shortcuts automation or double-click on koko:// link), the second `readTextFile` may execute before the first `writeTextFile` completes. Second write overwrites first's changes, losing prepended/appended content. Deep links come from external sources (macOS URI handler) -- user cannot control timing.
- **Verdict:** real-bug
- **Fix:** Serialize deep-link processing through a promise queue or mutex.

### Finding 1.2: Deep-link daily note read-modify-write race
- **File:** src/lib/features/deep-link/deep-link.service.ts:285-296
- **Severity:** data-loss
- **Category:** race-condition
- **Description:** `executeDailyAction` reads daily note (`exists` -> `readTextFile`), then writes back with content prepended or appended. Same read-modify-write race as 1.1. Two deep links targeting daily note simultaneously -> one append/prepend lost.
- **Verdict:** real-bug
- **Fix:** Same queue as 1.1 covers both.

### Finding 1.3: saveDirtyTabs discards save promises
- **File:** src/lib/core/editor/editor.service.ts:160
- **Severity:** data-loss
- **Category:** error-handling
- **Description:** `saveDirtyTabs()` calls `saveFileByPath(tab.path)` without `await` for every dirty tab. Returned promises silently discarded. If `writeTextFile` fails (disk full, permissions), error is caught inside `saveFileByPath` and toast shown, but auto-save timer already fired and won't retry until next keystroke triggers new debounce. If app crashes before next successful save, edits lost. Close handler (`saveAllDirtyTabs`) properly awaits -- only auto-save path affected.
- **Verdict:** real-bug
- **Fix:** Collect promises and `await Promise.allSettled(...)`. Or at minimum track failed paths for retry on next debounce.

### Finding 1.4: restoreSnapshot no error handling
- **File:** src/lib/features/file-history/file-history.service.ts:84
- **Severity:** data-loss
- **Category:** error-handling
- **Description:** `invoke('get_snapshot_content', { snapshotId })` has no try/catch. Caller in `FileHistoryDialog.svelte:50` also has no error handling. If IPC fails (corrupt DB row, invalid snapshot ID), user sees uncaught rejection with no feedback, dialog stuck in broken state. User-initiated action ("Restore Version") deserves error message.
- **Verdict:** real-bug
- **Fix:** Wrap in try/catch, show toast on error, reset dialog state.

## Fix-Soon (correctness)

### Finding 1.5: Callout widget leaks document-level listeners
- **File:** src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:106
- **Severity:** correctness
- **Category:** memory
- **Description:** `CalloutTypeSwitcherWidget.toDOM()` adds `document.addEventListener('mousedown', onDocMousedown)` to close popover on outside clicks. No `destroy()` method, no `removeEventListener`. CodeMirror destroys and recreates widgets during scroll/cursor movement. Each viewport entry adds new global listener. Over long session with callouts, accumulates unbounded anonymous listeners on `document`, each holding closure reference to detached DOM.
- **Verdict:** real-bug
- **Fix:** Add `destroy()` method that calls `document.removeEventListener('mousedown', onDocMousedown)`. Requires storing handler as instance property.

### Finding 1.6: KanbanCard service call without untrack()
- **File:** src/lib/plugins/kanban/KanbanCard.svelte:145-153
- **Severity:** correctness
- **Category:** reactive
- **Description:** `loadLinkedFileContent(item.text)` called without `untrack()`. This service reads `fsStore.fileTree` synchronously before the `await`, making it a tracked dependency. Every file tree mutation (create/rename/delete) re-fires this effect for every visible kanban card, causing N unnecessary Tauri IPC calls. Most impactful $effect bug found.
- **Verdict:** real-bug
- **Fix:** Wrap `loadLinkedFileContent(item.text)` in `untrack(() => { ... })`.

### Finding 1.7: OutgoingLinksPanel store mutation outside untrack()
- **File:** src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:37
- **Severity:** correctness
- **Category:** reactive
- **Description:** `outgoingLinksStore.reset()` called in tracked scope of `$effect`. Currently no loop because effect doesn't read from `outgoingLinksStore`. But violates project rule that all store mutations in `$effect` must be in `untrack()`. Future change adding read from that store would silently create loop.
- **Verdict:** real-bug
- **Fix:** Move `outgoingLinksStore.reset()` inside `untrack()` block.

### Finding 1.8: SearchSection invoke() without untrack()
- **File:** src/lib/core/settings/sections/SearchSection.svelte:35-37
- **Severity:** correctness
- **Category:** reactive
- **Description:** Effect calls `refreshRerankerStatus()` which synchronously reads `vaultStore.path` (tracked) then calls `invoke()`. No loop risk currently (result assigned to local state not read by effect), but violates project pattern. Accidental dependency addition would cause loop.
- **Verdict:** real-bug
- **Fix:** Wrap `refreshRerankerStatus()` call in `untrack()`.

### Finding 1.9: Command palette swallows saveSettings errors
- **File:** src/lib/features/command-palette/command-palette.service.ts:155, 165
- **Severity:** correctness
- **Category:** error-handling
- **Description:** `.catch(() => {})` silently discards persistence errors when toggling sidebar/ToC via command palette. Every other `saveSettings` call in codebase logs the error -- these two are the only ones that discard entirely. UI toggles correctly (in-memory), but disk persistence silently fails. Layout reverts on restart.
- **Verdict:** real-bug
- **Fix:** Change to `.catch((err) => error('CMD-PALETTE', 'saveSettings failed:', err))`.

## Monitor (low-probability / cosmetic)

### Finding 1.10: Trash restore path uniqueness race
- **File:** src/lib/core/trash/trash.service.ts:96-106
- **Severity:** data-loss (low probability)
- **Category:** race-condition
- **Description:** `restoreItem` finds unique path via `exists()` loop, then calls `rename(trashPath, restorePath)`. Path may no longer be unique by rename time. Requires near-simultaneous restore operations targeting same path. Silent data loss via overwrite.
- **Verdict:** real-bug (low probability)
- **Fix:** Catch rename overwrite errors, retry with new unique name.

### Finding 1.11: renameItem exists-then-rename TOCTOU
- **File:** src/lib/core/filesystem/fs.service.ts:201-206
- **Severity:** correctness (low probability)
- **Category:** race-condition
- **Description:** `exists(newPath)` then `rename(oldPath, newPath)`. Race window milliseconds, user-initiated, single-user desktop app. Silent overwrite if file appears between check and rename.
- **Verdict:** acceptable-tradeoff

### Finding 1.12: moveItem exists-then-rename TOCTOU
- **File:** src/lib/core/filesystem/fs.service.ts:245-250
- **Severity:** correctness (low probability)
- **Category:** race-condition
- **Description:** Same pattern as 1.11.
- **Verdict:** acceptable-tradeoff

### Finding 1.13: frontmatter-icon read-modify-write
- **File:** src/lib/features/file-icons/frontmatter-icon.service.ts:27-75
- **Severity:** correctness (low probability)
- **Category:** race-condition
- **Description:** `readTextFile` -> parse -> modify -> `writeTextFile` without locking. Concurrent calls to same file could lose first write. User-initiated UI clicks, unlikely concurrent.
- **Verdict:** acceptable-tradeoff

### Finding 1.14: link-updater parallel writes on rename
- **File:** src/lib/core/filesystem/link-updater.service.ts:30-51
- **Severity:** correctness (low probability)
- **Category:** race-condition
- **Description:** `Promise.allSettled` writes to multiple files. Concurrent auto-save on any target file -> last-write-wins. Requires two rapid renames sharing backlinkers.
- **Verdict:** acceptable-tradeoff

## Acceptable Tradeoffs (not bugs)

| # | File | Issue | Why acceptable |
|---|------|-------|----------------|
| T1 | `callout-field.ts` widget DOM listeners | Local element listeners in toDOM() | GC'd with element |
| T2 | All Tauri `listen()` calls | Cleanup discipline | All properly use unlisten pattern |
| T3 | `saveSnapshotForFile` (file-history) | No internal try/catch | Sole caller has .catch() |
| T4 | `ensureEntriesCached` (completion.ts) | try/finally without catch | CodeMirror handles rejected completions gracefully |
| T5 | `EditorSection` list_system_fonts | Empty catch -> [] | Non-critical settings UI, reasonable fallback |
| T6 | Bookmarks saveBookmarks empty catch | Persistence skip | In-memory state correct, retries on next operation |
| T7 | Deep-link template catch | Falls back to raw body | Documented, template optional |
| T8 | fs.watcher subtree scan catch | Falls back to full rescan | Reasonable escalation strategy |
| T9 | Widget caches (mermaid/math/collection) | No LRU eviction | Bounded by vault content, cleared on teardown |
| T10 | Watcher-handler fire-and-forget invoke() | TS/Rust divergence window | All have .catch(), self-correcting on next rebuild |

## Summary by Category

| Category | Real Bugs | Acceptable | False Positives |
|----------|-----------|------------|-----------------|
| race-condition | 3 (1.1, 1.2, 1.10) | 4 | 3 |
| error-handling | 3 (1.3, 1.4, 1.9) | 5 | 20+ |
| reactive ($effect) | 3 (1.6, 1.7, 1.8) | 5 | 1 |
| memory | 1 (1.5) | 3 | 5 |
| **Total** | **10** | **17** | **29+** |

## Priority Order for Fixes

1. **1.1 + 1.2** (deep-link races) - serialize via promise queue
2. **1.3** (saveDirtyTabs) - await promises or retry failed saves
3. **1.4** (restoreSnapshot) - add try/catch + toast
4. **1.5** (callout listener leak) - add destroy() method
5. **1.6** (KanbanCard untrack) - wrap in untrack()
6. **1.7** (OutgoingLinksPanel untrack) - move reset into untrack()
7. **1.8** (SearchSection untrack) - wrap in untrack()
8. **1.9** (command palette catch) - add error logging
9. **1.10** (trash restore race) - catch + retry
