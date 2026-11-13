# Deep-dive group h02-watcher-bulk

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## external-change-7: Bulk external changes never update FTS5 or semantic rows, and directory-only batches (external folder rename or move) update no index
- claimed severity: stale-state
- anchor: src/lib/app/lifecycle/watcher-handler.service.ts:66
- scenario: git pull changes or deletes 12 notes. Search returns old snippets and lists deleted notes, and opening one shows 'Failed to open file.' This lasts until the next vault open. An external folder rename leaves the old children in the VaultIndex and FTS (inferred: FSEvents reports only the directory paths).
- evidence given: The full path at watcher-handler.service.ts:66-75 calls only rebuildIndex, buildPropertyIndex, buildFrontmatterIconIndex and notifyContentInvalidated. The FTS and semantic update commands are called only from note-change.service.ts:209, :217, :247 and :252 and from search.service.ts:301-330. buildSearchIndex has a single caller, app-lifecycle.service.ts:421. scan_vault_v2_cached_inner (vault.rs:1198-1300) touches only the VaultIndex and the cache. Directory-only batches return at watcher-handler.service.ts:41-44.

## external-change-4: An FSEvents rescan (dropped events) is forwarded as a bare directory path that neither the tab reloader nor the index handler acts on
- claimed severity: data-loss
- anchor: src-tauri/src/vault/watcher.rs:256
- scenario: A large checkout or sync makes FSEvents drop events, and MustScanSubDirs arrives for /vault/Projects. Open clean tabs under Projects are not reloaded, so the next keystroke overwrites the external version (same chain as finding 3). Notes changed there keep stale VaultIndex, FTS5 and semantic rows until each is touched again or the vault is reopened. The tree does update.
- evidence given: watcher.rs:254-262 forwards event.paths and ignores the flags and kind. The notify-8.2.0 fsevent.rs source (fetched) maps MustScanSubDirs, UserDropped and KernelDropped to EventKind::Other with Flag::Rescan, carrying the directory path. editor.service.ts:379 matches tabs by exact path, so a directory matches none. watcher-handler.service.ts:33-44 drops dot-less basenames and returns early for directory-only batches.

## external-change-3: A failed tree refresh drops the burst's listener fan-out, so clean tabs go stale and the next keystroke overwrites the external version
- claimed severity: data-loss
- anchor: src/lib/core/filesystem/fs.watcher.ts:149
- scenario: The vault contains a subfolder the process cannot list, or a folder is removed between its stat and its read_dir during a sync. Every burst whose rescan covers the vault root (a root-level note change, more than 5 parents, or the incremental fallback) makes refreshTree reject. notifyListeners never runs, so open clean tabs are not reloaded and the indexes are not updated. The user's next keystroke autosaves the stale buffer over the external change. For a persistent unreadable folder this lasts the whole session. A related variant: if start_vault_watcher fails, it is only logged and the vault runs unwatched.
- evidence given: fs.watcher.ts:137, :149 and :175 call refreshTree with no try, and notifyListeners runs only after them (:139, :151, :177, :185). The handler is called with void at :199, so the rejection is unhandled. fs.service.ts:96-98 rethrows. src-tauri/src/commands/vault.rs:96 (read_dir ?) and :139 (recursive ?) fail the whole scan. fs.logic.ts:310 returns [vaultPath] for root-level changes. At open the failure is only a toast and init continues (app-lifecycle.service.ts:314-318). A watcher start failure is only logged at fs.watcher.ts:202-208, and the .catch at app-lifecycle.service.ts:499-501 is dead.
