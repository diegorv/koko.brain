---
summary: "Two-way sync between a vault's note task lines and one Todoist project tree."
---

## Responsibility

Owns the Todoist sync of a vault: pairing note task lines with Todoist items through a visible td- anchor, pulling and pushing projects, sections, tasks, completion, due dates, priority and labels, and recording sync state and a bounded sync log. It runs manual Sync now cycles and automatic cycles (vault open, interval, window focus, after a save of an anchored note), and offers the connection check and the settings-side root project picker. It does not own the Todoist settings values (core/settings), the vault index and file I/O commands (src-tauri vault commands, core/filesystem), or the generic database layer (src-tauri/src/db); it calls into them.

## Key files

- `src/lib/features/todoist-sync/sync-now.service.ts`: syncNow: one full cycle (pull, detach, completion, field edits, moves, creates, projects, sections), with caps and a vault-switch guard.
- `src/lib/features/todoist-sync/sync-scheduler.service.ts`: startAutoSync, stopAutoSync, syncNowFromUi: automatic triggers, one-at-a-time queueing, rate-limit and rejected-token handling, toasts.
- `src/lib/features/todoist-sync/todoist-sync.service.ts`: checkSyncConnection and fetchRootProjectChoices: read-only; writes no note and no sync state.
- `src/lib/features/todoist-sync/todoist-sync.store.svelte.ts`: Status, last result, last error, last synced time and the sync log dialog state.
- `src/lib/features/todoist-sync/pull.logic.ts`: planPull: pure planning of what a pull inserts or rewrites in the vault.
- `src/lib/features/todoist-sync/fields.logic.ts`: planFields: two-base field merge (local_base against the line, remote_base against the item), Todoist wins conflicts.
- `src/lib/features/todoist-sync/anchor.logic.ts`: The td- anchor format and parsing that pairs lines with Todoist ids.
- `src/lib/features/todoist-sync/todoist-client.ts`: createTodoistClient: the official SDK client over the Tauri HTTP fetch adapter (tauri-fetch-adapter.ts).
- `src-tauri/src/commands/todoist.rs`: The todoist_* IPC commands over the sync tables in kokobrain.db; each refuses a vault root mismatch.

## State

- Sync state in kokobrain.db, written only through IPC: todoist_kv, todoist_task_link, todoist_section_link and a bounded todoist_sync_log (src-tauri/src/db/schema.rs, todoist_repo.rs).
- todoistSyncStore (in memory): status, last result, last error, last synced time, log dialog rows; reset on vault teardown.
- Scheduler state in sync-scheduler.service.ts: active session (vault path and timers), running flag, queued follow-up trigger, rate-limit block time, rejected token and open persistent toasts.
- Note files in the vault are written by this module (task lines, project notes, section headings, frontmatter project ids) through vault write commands and the app's rename and frontmatter paths.

## Collaborators

- `IPC:todoist_read_kv`: Sync token, first_run_done and project state at the start of each cycle.
- `IPC:todoist_read_links`: Task link rows pairing anchored lines with Todoist items.
- `IPC:todoist_read_sections`: Section link rows for the heading mapping.
- `IPC:todoist_commit_state`: Commits sync token, bases, links, kv and section changes in one transaction per step.
- `IPC:todoist_append_log`: Appends cycle and event rows to the bounded log.
- `IPC:todoist_read_log`: Newest log rows for the dialog and the last cycle record.
- `IPC:get_all_tasks_v2`: vault-scan.service reads indexed task groups to find anchored and brain-born lines.
- `IPC:get_all_property_records`: vault-scan.service reads property records for project notes and their ids.
- `IPC:write_task_lines`: Guarded task-line edits applied to a note (src-tauri/src/vault/task_lines.rs).
- `IPC:create_folder`: closed-note-writer creates the folder of a new project note.
- `IPC:create_note`: closed-note-writer creates a new project note file.
- `src/lib/core/vault`: Vault path and index readiness; a cycle is refused while the index is not ready and stops after a vault switch.
- `src/lib/core/settings`: Todoist settings (token, sync enabled, root project, folder, interval, inbox flag) and clampSyncIntervalMinutes; SettingItem for the settings section.
- `src/lib/core/editor`: syncExternalContentToEditor for externally written notes; addAfterSaveObserver for the after-save trigger; markRecentSave for own writes.
- `src/lib/core/filesystem`: renameItem and addToTree for project notes; settleTaskWrite and applyNoteChange after writes.
- `src/lib/core/frontmatter`: updateNoteFrontmatter writes the project id; parse and rebuild helpers for project note updates.
- `src/lib/core/markdown-editor`: note-writer.service uses docDiff from doc-diff.logic to apply task-line edits to an open editor as a minimal change.
- `src/lib/contracts`: Typed call() wrapper and generated ts-rs types for IPC payloads.
- `src/lib/app`: AppShell mounts the status chip; AppOverlays the log dialog; SettingsPanel the section; commands trigger sync and log; app-lifecycle starts and stops auto sync and resets the store.

## Gotchas

- Task lines are located by their td- anchor plus the expected line text, never by line number. Line numbers are not stable pairing keys.
- A cycle captures the vault path at start and rechecks it before every write; after a vault switch it stops. Every todoist_* Rust command also refuses a vault root that does not match the open database.
- Sync writes into notes that may be open in the editor, so it calls syncExternalContentToEditor and markRecentSave. Removing either changes what the editor shows and what the save observer sees.
- Conflict policy: a field changed on both sides takes the Todoist value and the brain value goes to the sync log (docs/adr/0037-todoist-two-way-sync.md). Merge compares projected values so lossy fields do not ping-pong.
- Nothing is deleted on either side. Missing or moved tasks detach the link (detach.logic.ts).
- Per-cycle caps on close and reopen pushes, detaches, field pushes and creates are named constants in sync-now.service.ts. A manual cycle asks before exceeding them. An automatic cycle skips that action class and shows a persistent toast.
- Automatic cycles stop while the token is one Todoist rejected with 401 and pause after a 429 for the Retry-After wait.
- Automatic cycles do not start before first_run_done is set. A manual first cycle with creates previews them first.
- A line brake stops a cycle when fewer than half of the attached links have a line in the vault scan, so a partial scan does not detach links. A manual cycle asks instead.
- No Tauri event listeners. Triggers are the after-save observer, the DOM window focus event and an interval timer.
