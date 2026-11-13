# A: adversarial verification of A-deep-dive.md

Read-only check, 2026-11-02. I re-read the code and grepped only `2026-11-02_14-52-43.log`.
I did not run cargo, the app or the bench.
Tags: VERIFIED means I read it myself. INFERRED means I reasoned it and did not observe it.

## Verdict

**Partially confirmed.**
- The root cause holds.
- F1 and F2 are real, small and safe.
- Several numbers are overstated. One of the proposed acceptance checks would fail.

## Claims that survived

- **The command is sync and reads every note** (VERIFIED).
  - `vault.rs:614-656` is a sync `#[tauri::command]`. It holds the read guard for the whole loop and calls `read_to_string` per entry at `:632`.
  - The sync wrapper calls the body inline and serializes the result there (`tauri-macros-2.7.4/src/command/wrapper.rs:398-430`).
  - Locked versions are tauri 2.12.5, tauri-macros 2.7.4 and wry 0.57.1 (`src-tauri/Cargo.lock`).
- **F1's prefilter is exact** (VERIFIED).
  - `NoteEntry.tasks = extract_tasks(content)` over the full content (`entry.rs:244`).
  - Every production constructor goes through `from_content_full`: `vault.rs:184`, `:287`, `:1304`, `:1322`.
  - The msgpack cache persists `tasks` (`index_cache.rs:22-30`), and parser changes are versioned by `INDEX_SCHEMA_VERSION` (`:18`).
  - `extract_tasks_from_section` (`parsing.rs:1704-1750`) has the same split, fence logic and `parse_task_line` as `extract_tasks` (`:1676-1698`), plus a heading gate.
  - `HEADING_RE` (`:1440`) cannot match `TASK_RE` / `ORDERED_TASK_RE` (`:1426-1435`).
  - So the section result is a subset of `extract_tasks` for the same bytes.
- **The default is the expensive path.** The default `sectionTag` is `'#to-list'` (`tasks.store.svelte.ts:8`, `:30`), and `buildTaskIndex` sends any non-empty tag to the section command (`tasks.service.ts:58-61`). VERIFIED.
- **The doc comments are stale** (`vault.rs:608-613`, `tasks.service.ts:75-80`). VERIFIED.
- **F2 is redundant work** (VERIFIED).
  - The only production caller of `buildTaskIndex` outside the tasks feature is `app-lifecycle.service.ts:409`.
  - The only reader of `fileTaskGroups` is `TasksView.svelte:53`.
  - TasksView mounts only while the Tasks tab is active (`EditorView.svelte:38`, `{#if isTasksTab}` about `:70`). There is a single `<EditorView />` (`AppShell.svelte:237`).
  - Its effect refetches on mount (`TasksView.svelte:78-83`).
  - I found no tab-restore path. Removing the startup call loses no visible state, because the first activation sets `isLoading` and refetches anyway.
- **The log lines match the report** (VERIFIED).
  - Calls: 43.772 -> 45.585 (1819 ms), 25.640 -> 27.217 (1577 ms), 29.380 -> 29.695 (320 ms).
  - Call 3 is a remount, not a bump: `initTodoist` plus `activeTabPath changed -> __virtual__/tasks` at 29.373-29.374.
  - `get_all_property_records` enters at 45.585, and `after exists() @ 1941.0ms` appears at 45.686.
  - 12-session stats: 57,470 / 17 = 3.38 s per call, 57,470 / 12 = 4.79 s per session.
- **Two scans per toggle** (VERIFIED from code). The explicit call is at `tasks.service.ts:137`, and the throttled bump causes the second (`tauri-listeners.service.ts:106`, `:109`).

## Corrections

1. **"Async included" is not log-verified.**
   - Every command that waited in the startup window is sync: `get_all_property_records` (`vault.rs:799`), `get_all_vault_entries_v2` (`:508`) and plugin-fs `exists` (`tauri-plugin-fs-2.7.1/src/commands.rs:1216`, plain `pub fn`).
   - Sync commands queue behind each other on main in any model.
   - That async invokes are also blocked is a strong INFERENCE: WKWebView calls `webView:startURLSchemeTask:` on the main thread (`wry-0.57.1/src/wkwebview/class/url_scheme_handler.rs:42-57`). The log does not prove it.
2. **The log timestamps are when the frontend received the line, not when Rust wrote it.**
   - Rust `debug_log` sends tag and message only (`utils/logger.rs:47-58`, sink at `lib.rs:287-295`). The frontend stamps and writes the time.
   - The durations ("after 1819ms") are Rust-measured and reliable.
   - Each "enter" timestamp includes event-delivery latency. This does not change the conclusion.
3. **F2 frees about 1.2 s for the daily note, not 1.9 s, and the "<50 ms" acceptance check would fail.**
   - `buildTagIndex` blocks JS from about 43.76 to 44.437 (`[HB] stall 817ms`, `buildTagIndex completed in 694ms`).
   - The `exists()` continuation and the `openFileInEditor` call cannot run until JS is free.
   - With F2 alone, expect the probe at about 0.7-0.8 s: the tag block plus `buildPropertyIndex` JS. It only drops under 50 ms if finding C is also fixed.
   - Change the check to: `get_all_property_records` enters within about 20 ms of the `get_all_tags_v2` exit, and the `exists()` probe is no longer tied to the tasks exit.
4. **The "14-22x" bench gain is an input, not a measurement.**
   - `/tmp/ui-resp-bench/A/bench.mjs:28-29` hard-codes the share of notes with tasks (5.6% / 8.6%).
   - The real gain is about N/K for I/O, and K is unknown for this vault. If daily-note templates carry checkboxes, K could be large and the gain could be 2-4x.
   - F1 is still correct and cheap. Log `K` before quoting a gain.
5. **"Each save or watcher change adds a scan while the tab is open" is overstated.**
   - There is one editor pane, so nobody types in a note while TasksView is mounted.
   - Bumps in that state come from toggles, the pending 2 s autosave of the tab just left, watcher or external writes, and Quick Capture.
   - Most real repeats are activations (each one is a full scan) and toggles.
6. **The `get_semantic_stats` 513 ms is a one-off.**
   - The identical queries in `get_semantic_stats_inner` (`semantic.rs:1377-1390`) ran again inside `build_semantic_index` (`:553`). The frontend had that result 10 ms after the `COMMIT — semantic orphan cleanup` line (48.370 -> 48.380).
   - So the first call was cold-cache or a lock wait, not inherent cost.
   - The startup call is also followed about 1 ms later by `buildSemanticIndex`, which returns the same stats (`app-lifecycle.service.ts:450-464`, `search.service.ts:349`).
   - Making it async still works. Skipping the duplicate fetch on the startup path is a simpler option. `SearchSection.svelte:78` also calls `initSemanticSearch`, so the call cannot simply be deleted.
7. **The test at `app-lifecycle.service.test.ts:688` is a watcher test that passes by accident.**
   - It calls `vi.clearAllMocks()`, fires the watcher callback, then flushes one macrotask. Only the still-pending startup `setTimeout(0)` from `initializeVault` calls `buildTaskIndex`. `watcher-handler.service.ts` never calls it (imports at `:1-8`).
   - For F2, delete that line rather than flip it to `not.toHaveBeenCalled`: the watcher path never ran it in the first place.
   - `:535` and `:1172` already assert not-called and stay valid.

## Missed risks

- **F2 moves the cost, it does not remove it, for sessions that open the Tasks tab.**
  - The first activation now pays the cold scan.
  - The log suggests no loss: call 2 still took 1577 ms about 40 s after the startup scan, so the startup read did not keep the page cache warm. RSS was 283 MB -> 1.5 GB in between.
  - Still, the per-session total drops only when the tab is not opened. Do F1 with F2.
- **The main-thread block probably freezes painting too (INFERRED).**
  - WKWebView commits layers through the UI process main thread. The startup UI, and the "Indexing tasks..." placeholder, may not reach the screen during the block.
  - `[NAV] click -> next paint` is measured in the content process and cannot show this.
  - This raises the impact of the block, but it is unobserved.
- **F3 can cause a third scan on toggle.** Two in-flight async scans (explicit plus bump) can now run in parallel and contend for disk. The sequence guard fixes which result wins, not the cost. Keep F1 first, so each scan is cheap.
- **F1 freshness.** I checked the other writer paths:
  - In-app writes that bypass `update_note_in_index`, such as link rewrites on rename, only matter if they add a note's first task, which is unlikely.
  - `create_note` / restore index the content, per the CLAUDE.md `SOURCE_POLICY`.
  - The author's risk statement holds.

## Fix verdicts

| fix | verdict |
|---|---|
| F1 prefilter | Valid quick win. Exact, Rust-only, no DTO change. The size of the gain is unknown until K is logged. |
| F2 drop startup call | Valid quick win. Frontend-only. The gain is about 1.2 s of daily-note latency, not 1.9 s, until C is fixed. Fix the acceptance check and handle the `:688` test as above. |
| F3 async plus seq guard | Valid, small. The author's lock-across-reads warning is correct (`update_note_in_index` takes `.write()` on main, `vault.rs:302-316`). Low marginal value after F1. |
| F4 other async | Mixed. `get_semantic_stats`: the gain is a cold one-off; the duplicate startup fetch is the cheaper fix. The `save_snapshot` / `get_semantic_file_status` wait during a cache load is real by code (`db/mod.rs:110-117`, `semantic.rs:152-193`); the 11.5 s figure is from scout A7 and I did not re-check it. Not a quick win. |
| F5 headings in index | Plausible, medium. The quirk at `parsing.rs:1736-1741` is confirmed by reading. Only worth doing if K stays large after F1. |
