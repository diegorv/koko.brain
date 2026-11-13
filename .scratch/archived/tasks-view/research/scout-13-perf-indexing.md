# Scout 13: perf-indexing

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

I did not write the file. The subagent instructions say to return findings as the final message instead of a report .md, so the findings are below. Read-only; I ran only Read and `git grep`.

**Summary (120 words):** Every `vaultIndexVersion` bump refetches tasks. The default section tag `#to-list` (tasks.store.svelte.ts:8) routes each refresh to `get_tasks_in_section_v2`, which reads from disk every note with at least one task (commands/vault.rs:736-753). Cost scales with notes-with-tasks, not with what changed, and the effect ignores whether any task changed. The list also blanks to "Indexing tasks..." on every refresh (TasksView.svelte:169). A richer query engine should filter in Rust over `VaultIndex`, add heading data to the index, and gate refreshes on task-relevant deltas.

## Facts

- **Trigger:** `TasksView.svelte:78-83` runs `buildTaskIndex()` in an `$effect` that reads `vaultStore.vaultIndexVersion`. It also runs on mount.
- **Fetch branch:** `tasks.service.ts:68-71` calls `get_tasks_in_section_v2({sectionTag})` when the tag is non-empty, else `get_all_tasks_v2()`.
- **Default tag:** `tasks.store.svelte.ts:8` sets `sectionTag = '#to-list'`. `reset()` restores it (:30). Default mode is therefore the disk-read path.
- **Loading flag:** `tasks.service.ts:65` sets `isLoading=true` on every call. `TasksView.svelte:169-170` shows "Indexing tasks..." instead of the list while it is true. Each refresh unmounts the list and likely resets scroll (inferred from the template, not run).
- **Latest-wins:** `tasks.service.ts:53,64,72` discards stale results, but the Rust scan still runs to completion.
- **Section scan:** `commands/vault.rs:672-683` picks candidates where `e.tasks` is non-empty. `:689-725` reads each file with `read_to_string` on a blocking thread, runs `extract_tasks_from_section`, and sorts. Read errors are skipped with only `debug_log` (:700-711).
- **Headings not indexed:** `commands/vault.rs:727-729` says `VaultIndex` does not store headings, which is why the section scan reads disk.
- **Plain path:** `commands/vault.rs:647-655` calls `lookup_all_tasks` (`vault/index.rs:1063-1076`). This is an in-memory clone of task vectors with no disk I/O.
- **Emit gating:** `commands/vault.rs:367` emits `vault-index-updated` only when `result.changed`. The Rust-side `changed` short-circuit is noted at `note-change.service.ts:77`. Whether body-only edits set `changed` was not verified.
- **Throttle:** `tauri-listeners.service.ts:106` sets `REFRESH_DELAY_MS=2000`; `:109` sets `REFRESH_MIN_INTERVAL_MS=10000`; `:116` sets `INCREMENTAL_REFRESH_MAX_PATHS=200`. The bump is throttled, not the scan.
- **Toggle double scan:** `tasks.service.ts:150` refetches directly after `toggle_task_status`. `commands/vault.rs:822` emits an index update, which bumps the version and triggers a second refetch via the throttled effect.
- **Lifecycle comment:** `app-lifecycle.service.ts:396-398` says the task index is not built at init and is fetched by TasksView on mount.
- **Other reader:** `event-calendar.service.ts:119` also calls `get_all_tasks_v2`.
- **Rules doc:** `docs/agents/indexing-watcher-rules.md` rules 1, 2, 4, 6, 8, 9, 12 (see below).

## Cost estimate (large vault, not measured)

Assume 1,500 notes with tasks at about 15 KB each, so about 22 MB read per scan. I expect roughly 100-400 ms per scan on a warm cache, dominated by read and line split. This is from memory and needs a real measurement.

- Per refresh: one full scan of all task notes, regardless of what changed.
- While the Tasks tab is open and editing: up to about 6 scans per minute (throttle floor 10 s), plus one extra per toggle and one per 400 ms pause in the section-tag box.
- Any save that sets `changed` triggers a scan, even if no task changed.
- Stale superseded scans still consume disk and CPU on the Rust side.
- Without a section tag, the IPC carries every task in the vault. Payload size is unmeasured.

## Problems and gaps

1. A save anywhere refreshes the whole section scan. No per-file or per-task-signature diff gates it.
2. Refresh replaces the list with a loading placeholder every time.
3. Section filtering needs disk reads because headings are not in `VaultIndex`. Every richer rule that depends on structure inherits this cost.
4. Read failures are silent to the user (`commands/vault.rs:700-711`).
5. Toggle causes two scans in quick succession.
6. Rust cannot cancel superseded scans.
7. Filtering, grouping and sorting are all client-side (TasksView.svelte:52-60) on top of a server-side tag filter, so the two filters are split across layers.

## Ideas worth keeping

- Store the heading path on each `Task` at scan time and update it through `update_note_in_index`. Section filters then become in-memory like `lookup_all_tasks`, and the disk scan goes away. Costs: more index memory and a ts-rs regeneration.
- Add a Rust query over `VaultIndex` (for example `query_tasks(spec)`). TS holds only the spec. This fits rule 1.
- Gate refetch on the delta: refetch only when an upserted or removed path has tasks now or previously had tasks. `UpdateResult` already carries `upserted`/`removed`.
- For non-section rules, read `entry.tasks` from the `vault-entries.service.ts` memo, which the delta patch keeps current (rule 12), instead of a new IPC per bump.
- Keep the `latestTaskIndexRequest` pattern. Keep the loading flag from replacing visible rows.

## Rules that constrain a richer query engine

- **Rule 1:** filtering must live Rust-side over `VaultIndex`; TS must not mirror tasks.
- **Rule 2:** panels refetch on `vaultIndexVersion`. A rule engine with several saved queries multiplies scans unless results are cached per version or per delta.
- **Rules 4 and 6:** any new per-file derived index must register as an `applyNoteChange` consumer. It must not call updaters directly. `.view` files in a watcher batch get no `vaultPath`.
- **Rule 8:** dedupe on identical content means no bump, which helps only for no-op saves.
- **Rule 9:** folder or source filters must use absolute paths.
- **Rule 12:** the memo plus delta patch is the cheap read path. Exposing new `NoteEntryV2` fields to KBAPI is a contract edit.

## Open questions

- Does `UpdateResult.changed` become true for body-only edits that touch no tasks? Needs a read of `update_note_in_index_inner`.
- Real scan timings on a large vault, measured with `timeAsync('TASKS', ...)` logs.
- Does TasksView unmount when its tab closes? The lifecycle comment implies it, but I did not check the tab mount code.
- Is the section tag persisted across restarts? I saw no persistence in the store, but did not check settings.
