# module card src/lib/features/todoist-sync
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/todoist-sync ' codemap/modules
module src/lib/features/todoist-sync features files 27 in-modules 1 out-modules 9 pub 9/204 ipc 11/0 card ~3k
## neighbors
dep src/lib/app -> src/lib/features/todoist-sync 8
dep src/lib/features/todoist-sync -> src/lib/components 6
dep src/lib/features/todoist-sync -> src/lib/contracts 20
dep src/lib/features/todoist-sync -> src/lib/core/editor 8
dep src/lib/features/todoist-sync -> src/lib/core/filesystem 4
dep src/lib/features/todoist-sync -> src/lib/core/frontmatter 4
dep src/lib/features/todoist-sync -> src/lib/core/markdown-editor 1
dep src/lib/features/todoist-sync -> src/lib/core/settings 8
dep src/lib/features/todoist-sync -> src/lib/core/vault 5
dep src/lib/features/todoist-sync -> src/lib/utils 9
in2 src/lib/features/todoist-sync 1 modules: src/routes(3)
out2 src/lib/features/todoist-sync 1 modules: src/lib/core/trash(1)
## entry files
entry src/lib/features/todoist-sync/sync-scheduler.service.ts ext-in2 src/lib/app/commands.ts src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/features/todoist-sync/TodoistSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte ext-in1 src/lib/app/AppOverlays.svelte
entry src/lib/features/todoist-sync/TodoistSyncStatus.svelte ext-in1 src/lib/app/AppShell.svelte
entry src/lib/features/todoist-sync/sync-log.service.ts ext-in1 src/lib/app/commands.ts
entry src/lib/features/todoist-sync/todoist-sync.service.ts ext-in1 src/lib/app/commands.ts
entry src/lib/features/todoist-sync/todoist-sync.store.svelte.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
## files
file src/lib/features/todoist-sync/TodoistSection.svelte component L208 module src/lib/features/todoist-sync in1 t1
file src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte component L66 module src/lib/features/todoist-sync in1 t1
file src/lib/features/todoist-sync/TodoistSyncStatus.svelte component L31 module src/lib/features/todoist-sync in1 t1
file src/lib/features/todoist-sync/anchor.logic.ts logic L110 module src/lib/features/todoist-sync in8 t1 | `🆔 td-…` anchors that tie a task line to a Todoist task, and the path scope the sync reads lines from.
file src/lib/features/todoist-sync/closed-note-writer.service.ts service L81 module src/lib/features/todoist-sync in2 t1
file src/lib/features/todoist-sync/completion.logic.ts logic L346 module src/lib/features/todoist-sync in2 t2 | Completion sync, as pure planning: which synced lines get their status (and, for a recurring task, their `📅`) rewritten from Todoist, which links push an `ite…
file src/lib/features/todoist-sync/create.logic.ts logic L399 module src/lib/features/todoist-sync in1 t1 | Brain-born tasks, as pure planning: which task lines are created in Todoist, the `item_add` each one sends, and how a pending add finds its Todoist task again …
file src/lib/features/todoist-sync/cycle-log.logic.ts logic L158 module src/lib/features/todoist-sync in4 t5 | The `cycle` rows of the Todoist sync log: one per cycle that started, its summary stored as JSON in the row's message, and the dialog's filter.
file src/lib/features/todoist-sync/detach.logic.ts logic L125 module src/lib/features/todoist-sync in4 t1 | Deletion sync, as pure planning: a task deleted on either side is detached, never deleted on the other (design: Deletion, rules 8c and 9 of `.scratch/todoist-b…
file src/lib/features/todoist-sync/fields.logic.ts logic L466 module src/lib/features/todoist-sync in1 t1 | Field sync between Todoist and the note, as pure planning: per synced line, the content, due date, priority and labels Todoist changed since `remote_base`, eac…
file src/lib/features/todoist-sync/note-writer.service.ts service L104 module src/lib/features/todoist-sync in2 t1
file src/lib/features/todoist-sync/priority.logic.ts logic L46 module src/lib/features/todoist-sync in3 t1
file src/lib/features/todoist-sync/projects.logic.ts logic L300 module src/lib/features/todoist-sync in1 t1 | Project sync, as pure planning: which project notes are renamed after a Todoist rename, which Todoist projects are renamed after a note rename, which new notes…
file src/lib/features/todoist-sync/pull.logic.ts logic L642 module src/lib/features/todoist-sync in11 t3 | The pull half of a sync cycle, as pure planning: which project notes to create, which open Todoist tasks to insert as anchored lines, which links to pair or fr…
file src/lib/features/todoist-sync/sections.logic.ts logic L451 module src/lib/features/todoist-sync in1 t1 | Sections and task moves, as pure planning: a Todoist section is a `##` heading of its project note (`todoist_section_link` ties the two), and a task's place (i…
file src/lib/features/todoist-sync/sync-log.service.ts service L43 module src/lib/features/todoist-sync in2 t1
file src/lib/features/todoist-sync/sync-now.service.ts service L1235 module src/lib/features/todoist-sync in1 t1
file src/lib/features/todoist-sync/sync-scheduler.logic.ts logic L108 module src/lib/features/todoist-sync in5 t1 | Pure rules of the automatic Todoist sync: which saves trigger a cycle, when an automatic cycle may run, and the fixed texts it shows.
file src/lib/features/todoist-sync/sync-scheduler.service.ts service L281 module src/lib/features/todoist-sync in2 t2
file src/lib/features/todoist-sync/sync-scope.logic.ts logic L166 module src/lib/features/todoist-sync in7 t1 | What a vault syncs: the root project's tree plus, optionally, the Inbox (design rule 8c), and the fixed messages for Todoist failures (rule 13).
file src/lib/features/todoist-sync/task-line-edits.logic.ts logic L215 module src/lib/features/todoist-sync in3 t2 | The guarded task-line batch applied to a string, for notes open in a tab.
file src/lib/features/todoist-sync/task-line.logic.ts logic L287 module src/lib/features/todoist-sync in6 t1 | Token patches on a raw task line: each one changes a single field and keeps every other character of the line.
file src/lib/features/todoist-sync/tauri-fetch-adapter.ts other L26 module src/lib/features/todoist-sync in1 t2
file src/lib/features/todoist-sync/todoist-client.ts other L12 module src/lib/features/todoist-sync in2 t2
file src/lib/features/todoist-sync/todoist-sync.service.ts service L72 module src/lib/features/todoist-sync in2 t1
file src/lib/features/todoist-sync/todoist-sync.store.svelte.ts store L96 module src/lib/features/todoist-sync in6 t9
file src/lib/features/todoist-sync/vault-scan.service.ts service L112 module src/lib/features/todoist-sync in1 t0
## public
sym src/lib/features/todoist-sync/TodoistSection.svelte:1 component TodoistSection L208
sym src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:1 component TodoistSyncLogDialog L66
sym src/lib/features/todoist-sync/TodoistSyncStatus.svelte:1 component TodoistSyncStatus L31
sym src/lib/features/todoist-sync/sync-log.service.ts:17 fn showSyncLog(): Promise<void> L13 | Palette "Todoist: Show sync log": reads the newest sync log rows of the open vault (cycle rows, conflict losers, detaches, frozen anchors, skipped lines, termi…
sym src/lib/features/todoist-sync/sync-scheduler.service.ts:86 fn startAutoSync(vaultPath: string): void L18 | Starts the automatic sync for the vault at `vaultPath`: a cycle now (the vault-open trigger), then every `syncIntervalMinutes`, when the window regains focus, …
sym src/lib/features/todoist-sync/sync-scheduler.service.ts:112 fn stopAutoSync(): void L24 | Stops the automatic sync: no trigger fires any more, a queued follow-up is dropped (a waiting "Sync now" resolves as stopped), the persistent failure and over-…
sym src/lib/features/todoist-sync/sync-scheduler.service.ts:142 fn syncNowFromUi(): Promise<void> L5 | Palette "Todoist: Sync now": runs a cycle and shows its message in a toast.
sym src/lib/features/todoist-sync/todoist-sync.service.ts:68 fn checkSyncConnectionFromUi(): Promise<void> L5 | Palette entry point: runs the check and shows its message in a toast.
sym src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:45 store todoistSyncStore L52 | Sync status and last result for the UI.
## stores
store src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:45 todoistSyncStore esc:0
## effects
fx-count dom.focus 1
fx-count tauri-dialog.ask 6
fx-count tauri-fs.readTextFile 1
fx-count tauri-http.fetch 1
fx-count tauri-opener.openUrl 1
fx-count timer.setTimeout 3
ipc-count ipc:create_folder 1
ipc-count ipc:create_note 1
ipc-count ipc:get_all_property_records 1
ipc-count ipc:get_all_tasks_v2 1
ipc-count ipc:todoist_append_log 8
ipc-count ipc:todoist_commit_state 6
ipc-count ipc:todoist_read_kv 2
ipc-count ipc:todoist_read_links 1
ipc-count ipc:todoist_read_log 2
ipc-count ipc:todoist_read_sections 1
ipc-count ipc:write_task_lines 2
## debt
-
