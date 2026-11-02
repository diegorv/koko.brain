# UI responsiveness: measured baseline (2026-11-02)

Source: owner session `~/Library/Logs/com.diegorv.kokobrain/2026-11-02_14-52-43.log`
(17:52:43 to 17:57:29, all Troubleshooting toggles on: debug log, heartbeat, LP profiling,
Tauri debug log), plus IPC timings across the 12 newest session logs. Vault:
`/Users/diegorv/kokobrain-vaults/brain-os-vault`, 10,628 notes, 42,925 file-tree nodes, 6,040 tags.

Extracts in `raw/` (read these instead of the 1.5 MB log; grep the log only for a specific window):
- `raw/stall-context-2026-11-02.txt` - every `[HB] stall` with the log lines in its window
- `raw/op-stats-2026-11-02.txt` - per-operation latency stats and slow IPC
- `raw/ipc-stats-last-12-sessions.txt` - per-command count / total / max over 12 sessions
- `raw/lp-profile-2026-11-02.txt` - live-preview decoration plugin cost
- `raw/semantic-memory-2026-11-02.txt` - embedder activity and process RSS
- `raw/queryjs-2026-11-02.txt` - queryjs execution timings

## How to read the instrumentation

- `[HB]` ticks every 250 ms (`src/lib/utils/log.service.ts:96`). `stall Nms` = gap between ticks;
  the webview JS event loop was blocked for roughly N-250 ms. A 330 ms stall is a ~80 ms block.
- `[NAV] click -> next paint` = pointerdown to the first frame after it (sync work only).
- Heartbeat only sees the webview JS thread. Tauri runs commands WITHOUT `async` on the app main
  thread ("Commands without the async keyword are executed on the main thread unless defined with
  #[tauri::command(async)]", https://v2.tauri.app/develop/calling-rust/). A slow sync command can
  freeze the native window without any `[HB] stall`. 44 of 59 commands are sync.

## Healthy

click->paint p50 6 ms, p90 17 ms, p99 63 ms; decoration plugins max 9 ms (except qjs-execute);
docReplace p50 5 ms; backlinks 1 ms; updateIndexesForFile p50 5 ms.

## Findings to deep-dive (preliminary, ordered by suspected impact)

A. Sync Rust commands on the main thread. `get_tasks_in_section_v2`
   (`src-tauri/src/commands/vault.rs:615`) reads all 10,628 notes from disk holding the VaultIndex
   read lock: max 6,164 ms, n=17, 57 s total over 12 sessions. Fired at startup
   (`app-lifecycle.service.ts:409` buildTaskIndex) and on every `vaultIndexVersion` bump while
   TasksView is mounted with a section tag (`TasksView.svelte:79`). Its doc comment claims it only
   fires when the user types a filter. `scan_vault` (sync, recursive) max 2,426 ms, n=77.

B. Whole-vault tree rescans. Creating a note (`openOrCreateNote`) runs `loadDirectoryTree` on the
   whole vault: 464 ms before the new note opens (weekly note at 17:54:53, 478 of 524 ms). The
   watcher "incremental" path (`fs.watcher.ts:~145-185`) rescans the parent dir recursively; when
   the parent is the vault root (a file at root, e.g. `Untitled.kanban`), that is a full
   `scan_vault` (211 ms Rust) plus 269-282 ms JS per save.

C. `buildTagIndex` (`src/lib/features/tags/tags.service.ts:22`) blocks JS 580-2,108 ms on every
   vault open; Rust `get_all_tags_v2` returns in 13 ms. Suspects: `buildTagTree` linear
   `find`+`toLowerCase` per level (`tags.logic.ts:13`, quadratic for a flat tag list) and a deep
   `$state` proxy over the tree including every tag's `filePaths`. Unconfirmed.

D. Opening `vault/resources/use-cases-test/examples/collection-features/bug-triage.collection`
   froze JS 1.3 s (stall 1513 ms, 17:55:56.154 to 17:55:57.446) between `openFileInEditor EXIT`
   and `activeTabPath changed`. No logs inside the collection code.

E. queryjs on first open of journal notes: `qjs-execute` 282 ms
   (`kb.view("_system/queryjs/weekly-wellness-cha...")` in `_journal-week-40-2026.md`) and 155 ms
   (`monthly-satisfactio...` in `10-Oct.md`), on the UI thread.

F. `docReplace` 142 and 156 ms for one note,
   `vault/reading-list/medium-com-roanonlydevs/2026-10-03-I wired a neural network like a fruit fly’s brain. A shuffled copy did about as we...md`
   (14,628 chars), vs ~50 ms for similar-size notes and p50 5 ms.

G. Background: the embedder re-embeds 6 of 6 chunks of the daily journal on repeated autosaves;
   one update took ~22 s to finish (17:54:37 start, 17:54:59 output). RSS 283 MB -> 1,577 MB within
   a minute of startup, 1,0-1,4 GB after. Not the UI thread, but CPU and memory pressure.
