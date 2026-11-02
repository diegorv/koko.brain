# 09 A watcher rescan (dropped FSEvents) never reloads open tabs, so the next save overwrites the external change

Status: needs-triage
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
