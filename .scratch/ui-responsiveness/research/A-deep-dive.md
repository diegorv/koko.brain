# A: Sync Rust commands on the app main thread (deep dive)

Read-only investigation, 2026-11-02. Log: `~/Library/Logs/com.diegorv.kokobrain/2026-11-02_14-52-43.log`
(only this log was grepped). Tags: VERIFIED = read in code or log; INFERRED = reasoned, not observed.
Microbenchmark: `/tmp/ui-resp-bench/A/bench.mjs` (synthetic data deleted after the run, script kept).

## Summary

- `get_tasks_in_section_v2` (`src-tauri/src/commands/vault.rs:614-656`) is a sync command. It runs
  on the thread that receives IPC. It reads every indexed note from disk (10,628) to return a
  handful of tasks ("3 files, 4 tasks"). VERIFIED.
- The default `sectionTag` is `'#to-list'` (`src/lib/features/tasks/tasks.store.svelte.ts:8`,
  reset to the same value at `:30`). So the expensive path is the default one, and it runs at
  every vault open (`src/lib/app/lifecycle/app-lifecycle.service.ts:409`) even when the Tasks tab
  is closed. VERIFIED.
- New, log-verified: while it runs, every other IPC (sync and async) waits behind it. At startup
  the daily note opened **1.94 s late**, and `get_all_property_records` (issued at 43.744) only
  entered at 45.585, the same millisecond the tasks command exited. The JS heartbeat stays green
  through all of it.
- The startup call is redundant. The only reader of its output is `TasksView.svelte:53`, which
  refetches on mount (`TasksView.svelte:78-83`).
- The disk reads are mostly wasted. A section task is always also an `extract_tasks` task. So a
  note whose indexed `NoteEntry.tasks` is empty can never contribute, and skipping those notes is
  exact (not a heuristic). The bench shows a 14-22x cut in warm cost with identical results.
- The other sync commands are much smaller. `scan_vault` (mean 221 ms, max 2.4 s) is the next
  largest; it is shared with finding B. `get_semantic_stats` (~0.5 s at startup) and
  `save_snapshot` / `get_semantic_file_status` (which can wait on a DB mutex held for 11.5 s
  during a semantic cache load) follow.

## Evidence

### Code (VERIFIED)

- `vault.rs:614-615`: `#[tauri::command] pub fn get_tasks_in_section_v2`, no `async`.
- `vault.rs:620-622`: the `VaultIndex` read guard is taken. It is held through the loop
  (`:624-653`) and dropped at function end (`:656`).
- `vault.rs:632`: `std::fs::read_to_string(&entry.path)` runs for every entry.
  `vault.rs:645`: `extract_tasks_from_section` runs on each file.
- `vault.rs:608-613` (doc comment): "fired only when the user types a non-empty filter". This is
  stale. `tasks.service.ts:75-80` repeats the claim.
- Tauri 2.12.5 dispatch (crate source in `~/.cargo/registry`):
  - The sync body (`tauri-macros-2.7.4/src/command/wrapper.rs:398-430`, `body_blocking`) calls the
    function inline, then `kind.block(result, resolver)`. So argument parsing, the body and JSON
    serialization of the result all run on the IPC-receiving thread.
  - The async body (`wrapper.rs:355-390`) moves args, body and serialization into
    `respond_async_serialized`, which does `async_runtime::spawn` (`tauri-2.12.5/src/ipc/mod.rs:370-380`).
  - Tauri docs: "Commands without the async keyword are executed on the main thread"
    (https://v2.tauri.app/develop/calling-rust/, quoted in the baseline).
- Exactness of the prefilter:
  - `NoteEntry.tasks = extract_tasks(content)` (`src-tauri/src/vault/entry.rs:244`).
  - `extract_tasks` (`vault/parsing.rs:1676-1698`) and `extract_tasks_from_section` (`:1704-1750`)
    split on `'\n'` the same way, use the same fence logic (`detect_code_fence`, `:1662`) and the
    same `parse_task_line` (`:1618`).
  - The section variant only adds a heading gate. A heading line (`HEADING_RE`, `:1440`) never
    matches `TASK_RE`/`ORDERED_TASK_RE` (`:1426-1435`).
  - Therefore `section(c) ⊆ extract_tasks(c)` for the same content.
- Callers of `buildTaskIndex` (`tasks.service.ts:54-73`, no request-sequence guard):
  - startup: `app-lifecycle.service.ts:404-415`, `setTimeout(0)`, with tags, properties and icons;
  - TasksView mount and every `vaultStore.vaultIndexVersion` bump while mounted (`TasksView.svelte:78-83`);
  - section filter typing, 400 ms debounce (`TasksView.svelte:40-46` -> `tasks.service.ts:81-84`);
  - each toggle (`tasks.service.ts:119`, `:137`), plus the bump that toggle causes. That is 2 scans per click.
- Bumps are throttled. `REFRESH_DELAY_MS = 2000` (`src/lib/app/tauri-listeners.service.ts:106`),
  and the minimum interval is 10 s in a burst (`:109`).
- The only reader of `tasksStore.fileTaskGroups` / `isLoading` is `TasksView.svelte:53` / `:169`.
  - TasksView renders only while the Tasks tab is active (`src/lib/app/EditorView.svelte:38`, `:70-71`).
  - Teardown closes the tab (`tasks.service.ts:186-189`, from `app-lifecycle.service.ts:635`).
  - A grep found no tab-restore path.

### Log, session 17:52:43-17:57:29 (VERIFIED)

| # | enter -> exit | body | trigger |
|---|---|---|---|
| 1 | 43.772 -> 45.585 | 1819 ms | startup step 5b |
| 2 | 53:25.640 -> 27.217 | 1577 ms | Tasks tab opened (mount effect) |
| 3 | 53:29.380 -> 29.695 | 320 ms | Tasks tab re-activated (remount) |

Queueing behind call 1 (log lines 51-94):
- At 43.744 step 5b issues tags, tasks, properties and icons. At 43.745 `openOrCreateNote` issues
  `exists()`. `exists` is `plugin:fs|exists`, a sync plugin command per scout A8, not re-read here.
- `get_all_tags_v2` runs 43.747-43.757, then tasks enters at 43.772. The 15 ms gap is INFERRED to
  be the main-thread serialization of 6,040 tag aggregates.
- `get_all_property_records` **enters at 45.585**, the exit ms of tasks. Its body is 13 ms.
  `buildPropertyIndex completed in 1897.0ms`.
- `openOrCreateNote: after exists() @ 1941.0ms`. The daily note's `openFileInEditor` EXIT lands at
  45.787 instead of about 43.85.
- `[HB] alive` ticks at 44.688 / 44.939 / 45.190 / 45.443. The only stall (817 ms at 44.437) is
  `buildTagIndex` JS (finding C). So the heartbeat cannot see this block.

Calls 2 and 3 have no index writes in their windows, so no bump-driven call was observed this
session. The first click after call 2 shows `[NAV] click "div" -> next paint 81ms` at 27.302,
85 ms after the exit. INFERRED: the click was queued during the block. It is not provable from
the log, because NAV timing starts in the content process.

12-session IPC extract (`raw/ipc-stats-last-12-sessions.txt`): n=17, total 57,470 ms, max
6,164 ms, mean 3.4 s per call, about 4.8 s per session. The other sessions' contexts were not checked.

### Microbenchmark (node, warm page cache, port of `parsing.rs:1618-1750` and the `vault.rs:624-655` loop)

| synthetic vault | files with any task | full scan (today) | parse share | prefiltered to notes with tasks | results equal |
|---|---|---|---|---|---|
| 10,628 notes, 4 KB avg (41 MB) | 595 (5.6%) | 379 ms | 56 ms | 17 ms | 54 = 54 |
| 10,628 notes, 12 KB avg (126 MB) | 917 (8.6%) | 479 ms | 128 ms | 33 ms | 32 = 32 |

The warm full-scan floor (380-480 ms) matches the app's warm call 3 (320 ms). The 1.6-6.2 s calls
are cold or disk-contended. At startup the FTS reconcile (`build_search_index`, async) walks the
same 10,628 files concurrently (log: reconcile ends 45.786, "in 858ms"). I/O dominates the cost,
so the cut scales with the share of notes that have tasks. That share is unmeasured for this vault.

## Root cause

1. The command is sync, so its body, the lock hold and the result serialization run on the
   IPC/main thread. Tauri receives every invoke there (custom-protocol `start_task`). While it
   runs, no other invoke can even be dispatched, async ones included. VERIFIED by the startup
   queue above. That AppKit window events and input also stall is INFERRED from the macOS
   main-thread model; it is not observed.
2. Its cost is O(all notes) disk reads, because `VaultIndex` keeps no headings. It ignores that the
   index already knows which notes have tasks (`NoteEntry.tasks`).
3. The frontend default makes the expensive path the common path (`'#to-list'`). It also fires it
   when nobody can see the result (startup, `app-lifecycle.service.ts:409`).
4. The stale doc comments (`vault.rs:608-613`, `tasks.service.ts:75-80`) hid 2 and 3.

## Impact

- **Every vault open (daily):** the main thread is blocked 1.6-1.8 s this session, up to 6.2 s in
  the 12-session max.
  - The daily note appears about 1.9 s late. VERIFIED.
  - Everything issued in the same window waits: property index, icons, the first editor read.
  - The window does not respond to clicks, typing, scroll or drag. INFERRED.
  - The heartbeat shows nothing, which is why this was missed.
- **Tasks tab in use:** each activation costs 0.3-1.6 s, with "Indexing tasks..." replacing the
  list (`TasksView.svelte:169-170`).
  - Each save or watcher change costs one more full scan per 2-10 s throttle window.
  - Each toggle costs 2 full scans. INFERRED from code; not observed this session.
- **Lock side effect:** the read guard spans the whole scan. An async writer
  (`scan_vault_v2_cached` build, `vault.rs:1244-1247`, `:1349-1352`) waits for it. Not observed.
- **Others (smaller, ranked):**
  - `scan_vault` (`vault.rs:81`): mean 221 ms, max 2,426 ms, n=77 over 12 sessions, plus about
    88 ms of untraced main-thread serialization. Runs on every create, rename, move, delete and
    root-level watcher change. Overlaps finding B.
  - `get_semantic_stats` (`commands/semantic.rs:1133`): about 513 ms at startup (log
    47.591 -> 48.104), with `COUNT(*)` + `COUNT(DISTINCT source_path)` over 156,860 rows. The
    gap is a JS round trip; the body is not traced.
  - `save_snapshot` (`commands/history.rs:57`, every save) and `get_semantic_file_status`
    (`semantic.rs:1145`, every save and tab switch) take the global `DB` mutex (`db/mod.rs:110-117`).
    `get_or_load_cache` holds that mutex during the whole embedding load (`semantic.rs:152-193`,
    11.5 s measured by scout A7 in the 2026-11-01 log, not re-checked). So a save within about
    11 s of a semantic/hybrid search after any re-embed freezes the main thread. PLAUSIBLE, not
    observed (no semantic search this session).
  - `get_all_property_records` / `get_all_vault_entries_v2` / `get_all_tags_v2`: 13-93 ms body
    plus untraced serialization of all entries, on main.
  - `shutdown_semantic`, `close_vault_db`: teardown only, can wait on long-held mutexes.

## Fixes (ranked by gain)

### F1. Read only notes whose indexed entry has tasks (quick-win)

In `get_tasks_in_section_v2`, add `if entry.tasks.is_empty() { continue; }` before
`read_to_string` (`vault.rs:624-632`). Also fix the doc comment at `:608-613`.

- **Gain:** disk reads drop from N to K (notes with any task). Bench: 14-22x on warm cost (379 -> 17 ms,
  479 -> 33 ms) with identical output. The cold-cache gain should be at least as large (INFERRED).
  It covers every trigger: startup, mount, bump, toggle, typing.
- **Risks:**
  - Exact for the same content. It now trusts the index's view of which notes have tasks, so a
    note edited outside the app shows its first task only after the watcher's
    `update_note_in_index` (500 ms debounce plus JS). This is the same freshness
    `get_all_tasks_v2` already accepts. Saves go through `applyNoteChange`'s `save` rule, which
    always fires the Rust IPC, so in-app edits are fresh by the next bump.
  - No DTO, cache or contract change. The Rust-only gate applies.
- **Test (failing first):** extract the loop into
  `fn tasks_in_section(entries, tag, read: impl FnMut(&str) -> io::Result<String>)`. Index two
  notes: A has a `## Todo #to-list` section with a task, B has none. Assert that `read` is called
  only for A and that A's tasks are returned. Today it reads both. Add a parity test: the same
  result as the unfiltered loop over a fixture vault. Files: `src-tauri/src/commands/vault.rs`,
  `src-tauri/tests/commands/vault_test.rs`.

### F2. Stop the redundant startup call (quick-win, frontend only)

Remove `buildTaskIndex()` at `app-lifecycle.service.ts:409`.

- **Proof it is redundant:**
  - It writes `tasksStore.fileTaskGroups` (`tasks.service.ts:63`), whose only reader is
    `TasksView.svelte:53`.
  - TasksView refetches on mount (`:78-83`) and renders only while the Tasks tab is active
    (`EditorView.svelte:38,70`).
  - Teardown closes the tab (`tasks.service.ts:188`), and no tab-restore path exists.
- **Gain:** removes 100% of the startup freeze from this command (1.6-6.2 s per vault open), without
  touching Rust. The Mac is throttled, so a frontend-only gate is cheaper.
- **Risk:** `app-lifecycle.service.test.ts:615` and `:688` assert that it IS called, so update them
  to assert it is not. That is a deliberate behavior change, not a weakened test. The comment at
  `app-lifecycle.service.ts:395-402` lists tasks among the stale-fill builders, so drop it there.
- **Test (failing first):** after `initializeVault` and the macrotask flush, expect
  `buildTaskIndex` not to have been called. Then check the log: in the next session, the
  `after exists()` probe should be under 50 ms and `get_all_property_records` should enter about
  43.75 instead of 45.585.

### F3. Make the command async, with reads outside the lock (small)

```rust
#[tauri::command]
pub async fn get_tasks_in_section_v2(section_tag: String, state: tauri::State<'_, VaultIndexState>)
    -> Result<Vec<FileTaskGroup>, String> {
    let candidates: Vec<(String, i64)> = { /* brief read(): entries with !tasks.is_empty() -> (path, modified_at) */ };
    tokio::task::spawn_blocking(move || /* F1 loop over candidates, no lock */).await.map_err(..)
}
```

This mirrors `get_unlinked_mentions_v2` (`vault.rs:543-580`).

- **Gain:** zero main-thread time. The IPC queue is no longer blocked, and async index builds are not
  held up by a seconds-long read guard.
- **Risks:**
  1. **Do not hold the guard across the reads in the async version.** `update_note_in_index`
     (`vault.rs:302-316`), `toggle_task_status` and `create_note` are sync writers on the main
     thread. A worker holding the read lock for seconds would make every save block the main
     thread on `.write()`. That is worse than today.
  2. **Ordering:** sync calls used to complete FIFO. Async ones can resolve out of order, so an
     older section filter or pre-toggle result could overwrite a newer one. Add a sequence guard in
     `buildTaskIndex` (`tasks.service.ts:54`): `const seq = ++taskSeq; ... if (seq !== taskSeq) return;`.
     Only the latest call clears `isLoading`.
  3. The Rust side changes to async, which is "Both" with the TS guard. The contract shape is
     unchanged (`src/lib/contracts/commands.ts:82`).
- **Tests:** Rust: the F1 inner test still covers behavior. TS (failing first, mocking only
  `call`): start two `buildTaskIndex` calls, resolve the second first, and assert that
  `tasksStore.fileTaskGroups` holds the second result and `isLoading` is false only after both.
  Files: `src-tauri/src/commands/vault.rs`, `src/lib/features/tasks/tasks.service.ts`,
  `src/tests/lib/features/tasks/tasks.service.test.ts`.

### F4. Make other heavy sync commands async (small each, independent)

The pattern is `pub async fn` + `spawn_blocking`. For commands that touch `VaultIndexState`, clone
under a brief guard and process outside it.

| command | gain | extra risk |
|---|---|---|
| `get_semantic_stats` (`semantic.rs:1133`) | about 0.5 s main-thread at startup (INFERRED body) | none, called once (`search.service.ts:349`) and after builds (`:393`) |
| `scan_vault` (`vault.rs:81`) | 200-300 ms typical, 2.4 s max, plus serialization, per tree refresh | `loadDirectoryTree` (`fs.service.ts:74-101`) has no sequence guard. Async completion can land an older tree last, so add a generation guard. Coordinate with finding B, which owns the rescans |
| `save_snapshot` (`history.rs:57`), `get_semantic_file_status` (`semantic.rs:1145`) | removes the up to 11.5 s main-thread wait on `DB` during a cache load | two saves of the same file can now race on dedupe or `created_at` order. The status widget needs a stale-response guard |
| `get_all_property_records` / `get_all_vault_entries_v2` / `get_all_tags_v2` | 13-93 ms body plus serialization off main, per refresh | ordering, already guarded by the `vaultIndexVersion` memo and deltas (verify per caller) |
| `shutdown_semantic`, `close_vault_db` | teardown only | ordering against the next vault's `open_vault_db` (`db.rs:7`) must stay intact |

### F5. Index-backed sections, no disk reads at all (medium/large)

Record heading marks (line, level, plus text only when it contains `#`) at parse time. Then answer
from `entry.tasks` plus the marks.

- **Gain over F1+F3:** removes the K reads. Only worth it if K is large.
- **Risks:**
  - `NoteEntry` is `#[ts(export)]` and goes out over IPC (`scan_vault_v2` etc.), so the new field must
    not leak. It must also survive the msgpack cache, so bump `INDEX_SCHEMA_VERSION`
    (`index_cache.rs:18`); that forces one full rescan.
  - The state machine quirk below must be ported faithfully or fixed test-first.

### F6. Cut redundant refetches (small, low value after F1+F3)

- Toggle does an explicit `buildTaskIndex` (`tasks.service.ts:137`) and then the bump triggers
  another one. Keep the explicit one: the throttle makes the bump late, and the comment at
  `:92-94` explains why.
- Optionally skip the bump refetch when the `UpdateResult` paths contain no note that has or had
  tasks. That needs the payload, which the listener already reads (`get_index_delta`). Not worth it
  once a refetch costs milliseconds.

## Quick wins

1. **F2:** drop `buildTaskIndex()` from startup (`app-lifecycle.service.ts:409`) and update the two
   test assertions. Frontend-only gate. Removes the 1.6-6.2 s startup freeze.
2. **F1:** `entry.tasks.is_empty()` prefilter in `get_tasks_in_section_v2`, plus an inner fn test.
   Rust-only gate. Cuts every remaining call 14-22x (bench).
3. **F4 row 1:** `get_semantic_stats` to async. A tiny diff; the gain is an INFERRED 0.5 s per
   startup, so confirm it with a `CmdTrace`-style log first.

F3 (async plus the TS sequence guard) is the follow-up that makes the command main-thread free. It
is small, but it changes ordering semantics, so it is not listed as a quick win.

## Open questions

- How many of the 10,628 notes have at least one task (K)? This sets the F1 gain and whether F5 is
  ever worth it. Measure by logging `candidates.len()` once in F1.
- The 6,164 ms max: which session and trigger? A cold start after boot is suspected; the other 11
  logs were not checked.
- Does input really stall? A native-side probe (e.g. an `NSEvent` timestamp vs handling time, or a
  Rust main-thread heartbeat via `run_on_main_thread` every 250 ms) would make main-thread blocks
  visible the way `[HB]` does for JS. Recommended before and after the fixes.
- Is the section-scan quirk intended? With `## A #to-list` / `### B #to-list` / `### C`, the tasks
  under `C` are excluded although `A` is still open (`parsing.rs:1736-1741`, only the last match's
  level is kept). Verified by reading, not executed. It matters only for F5.
- Does `get_semantic_stats` take 513 ms itself, or did it wait on the `DB` mutex? It is not traced.

Not verified: no cargo, app or E2E run. Main-thread input blocking is INFERRED; IPC queueing is
VERIFIED from the log. The bench is warm-cache node on synthetic data, not the Rust binary on the
real vault.
