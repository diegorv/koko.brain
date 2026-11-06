# 09: A watcher rescan (dropped FSEvents) never reloads open tabs, so the next save overwrites the external change

**Status:** wontfix

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) h02-watcher-bulk (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TRACE (deep dive priority P1, severity data-loss)
- Claims covered: external-change-4

**How a user hits it.** Requires FSEvents to drop events (MustScanSubDirs) during a large checkout or sync, plus a clean open tab whose file changed in the dropped window, plus a keystroke in that tab before the file changes again. Uncommon but realistic for large git pulls or sync clients.

**Recoverable from.** Only via git history or sync-client version history. The app's undo cannot recover it, because the stale buffer is what autosave writes.

**Root cause.** src-tauri/src/vault/watcher.rs start_watcher_inner (event.paths forwarded regardless of event.kind or Rescan flag) + src/lib/core/editor/editor.service.ts:378-381 (reloadExternallyChangedTabs matches tabs by exact path, so a directory matches none) + src/lib/app/lifecycle/watcher-handler.service.ts:33-44 (dot-less directory names filtered out, then early return). Overwrite via src/lib/core/editor/editor.service.ts:168 saveFileByPath (unconditional writeTextFile of tab.content).

**Evidence.** notify 8.2.1 (src-tauri/Cargo.lock:3159-3160; the claim said 8.2.0) fsevent.rs fetched from docs.rs source view https://docs.rs/crate/notify/8.2.1/source/src/fsevent.rs: MUST_SCAN_SUBDIRS -> EventKind::Other + Flag::Rescan, UserDropped/KernelDropped only add an info string, event carries only the single reported directory path, no descendants. raw.githubusercontent.com and github.com URLs returned 404. Tree does update: resolveRescanParents (src/lib/core/filesystem/fs.logic.ts:298-313) maps /vault/Projects to [vaultPath], full rescan. reloadExternallyChangedTabs (editor.service.ts:375-381) finds no tab for the directory. app-lifecycle.service.ts:486-487 then passes the directory to rebuildAllIndexes, which returns early at watcher-handler.service.ts:41-44. The only other focus listener (tauri-listeners.service.ts:309) handles the daily note only. The FSEvents trigger is an OS runtime fact not verified here.

**The indexes stay stale too.** The rescan batch holds only the directory path, so rebuildAllIndexes drops it from filePaths (src/lib/app/lifecycle/watcher-handler.service.ts:33-36) and returns at :41-44 as "directory-only changes", before both the incremental and the full-rebuild branch. Every note changed in the dropped window, open or not, keeps its pre-burst VaultIndex entry (backlinks, tags, tasks, properties), FTS5 row and semantic chunks until restart, vault reopen or a later per-file event for that note. Issue 28's bulk fix (FTS5/semantic in the >10-file branch) and folder-rename fix (applyPathChange) do not reach this batch, because it returns before either branch runs.

**Fix sketch.**
1. Rust: in the notify callback in start_watcher_inner (src-tauri/src/vault/watcher.rs:254-262), check `event.need_rescan()` (notify-types 2.1.0, true for Flag::Rescan). Carry the flag through the bridge: the channel at watcher.rs:250 carries only `String` paths, and run_debounce_loop (watcher.rs:152) buffers and filters those, so the flag needs its own slot in the buffered burst. Emit it as a rescan marker on the payload, e.g. `rescan: bool` on VaultFilesChangedPayload (watcher.rs:36-43). That struct is `#[ts(export)]`, so this is an IPC DTO change: `cargo test` regenerates src/lib/contracts/generated/ and the gate is Both.
2. TS: handleChangedPaths (src/lib/core/filesystem/fs.watcher.ts:122) passes the marker on to the change listeners (onFileChange :65, notifyListeners :73) after the tree refresh.
3. runWatcherBatch (src/lib/app/lifecycle/app-lifecycle.service.ts:481-488): on a rescan batch, call reloadExternallyChangedTabs with every open non-virtual tab path (it already skips dirty tabs and tabs whose disk content equals savedContent, src/lib/core/editor/editor.service.ts:379-405), and run the full-rebuild path of rebuildAllIndexes instead of the directory-only early return: rebuildIndex plus an FTS5/semantic reconcile. Share that reconcile with issue 28's bulk fix rather than adding a second one.

- [ ] Failing test comes first: a Rust watcher test feeds an event with Flag::Rescan and only a directory path, and asserts the emitted payload carries the rescan marker
- [ ] A rescan batch reloads every open clean tab whose disk content differs from savedContent, and leaves dirty tabs untouched
- [ ] A rescan batch runs the full index rebuild (VaultIndex through rebuildIndex, plus the FTS5 and semantic rows) instead of returning at the directory-only early return in watcher-handler.service.ts
- [ ] A directory-only batch without the rescan marker still skips the rebuild, as today

## Audit evidence (editor-data-safety, 2026-11-02)

- Finding F35 (P1, rare): "Notify's rescan flag is dropped, so a dropped-event burst skips the index rebuild". No repro test exists for it under .scratch/editor-data-safety/repro/; the evidence is a code trace.
- src-tauri/src/vault/watcher.rs:254-262: the notify callback loops over `event.paths` and sends each path string; nothing reads `need_rescan()` or the event flag. watcher.rs:36-43: VaultFilesChangedPayload carries only `paths`.
- src-tauri/Cargo.lock:3178-3179: notify-types 2.1.0, whose src/event.rs:648 defines `Event::need_rescan()` as `matches!(self.flag(), Some(Flag::Rescan))`.
- src/lib/app/lifecycle/watcher-handler.service.ts:33-36 filters out dot-less basenames, and :41-44 returns when no file path is left.
- src/lib/app/lifecycle/app-lifecycle.service.ts:486-487: reloadExternallyChangedTabs(paths) then rebuildAllIndexes(paths), both with the directory-only batch.
- src/lib/core/editor/editor.service.ts:379-385: reloadExternallyChangedTabs matches tabs by exact path (`t.path === filePath`), so a directory path matches no tab.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/100-watcher-rescan-dropped-fsevents-reloads-open-tabs.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
