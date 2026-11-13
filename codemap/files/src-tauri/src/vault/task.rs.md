# file card src-tauri/src/vault/task.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/vault/task.rs ' codemap/files
file src-tauri/src/vault/task.rs rust L306 module src-tauri/src/vault in4 t8 t:inline | Task data types and IPC structs for the Tasks/Tags Phase 7 work.
## imports
imp src-tauri/src/vault/task.rs:216 -> src-tauri/src/vault/index.rs UpdateResult
imp src-tauri/src/vault/task.rs:236 -> src-tauri/src/vault/index.rs UpdateResult
## imported-by
imp src-tauri/src/commands/vault.rs:9 -> src-tauri/src/vault/task.rs FileTaskGroup,TagAggregate,TaskStatus,TaskTextWriteResult,ToggleTaskResult
imp src-tauri/src/vault/entry.rs:17 -> src-tauri/src/vault/task.rs Task,TaskHeading
imp src-tauri/src/vault/index.rs:16 -> src-tauri/src/vault/task.rs display_name,FileTaskGroup,TagAggregate
imp src-tauri/src/vault/parsing.rs:18 -> src-tauri/src/vault/task.rs RecurrenceRule,Task,TaskHeading,TaskMetadata,TaskPriority,TaskStatus
## reach
in2 src-tauri/src/vault/task.rs 3 files in 2 modules: src-tauri/src/vault(2) src-tauri/src(1)
out2 src-tauri/src/vault/task.rs 3 files in 2 modules: src-tauri/src/vault(2) src-tauri/src/utils(1)
## tests
test src-tauri/tests/commands/vault_test.rs imports src-tauri/src/vault/task.rs
test src-tauri/tests/ipc_contracts_test.rs imports src-tauri/src/vault/task.rs
test src-tauri/tests/utils_fs_test.rs imports src-tauri/src/vault/task.rs
test src-tauri/tests/vault_file_ops_test.rs imports src-tauri/src/vault/task.rs
test src-tauri/tests/vault_index_test.rs imports src-tauri/src/vault/task.rs
test src-tauri/tests/vault_task_line_edits_parity_test.rs imports src-tauri/src/vault/task.rs
test src-tauri/tests/vault_task_test.rs imports src-tauri/src/vault/task.rs
test src-tauri/tests/vault_task_text_test.rs imports src-tauri/src/vault/task.rs
## symbols
sym src-tauri/src/vault/task.rs:22 struct Task L19 dto:Task | One task list item parsed from a note's body.
by src-tauri/src/vault/task.rs:Task <- src-tauri/src/vault/entry.rs:187 in (module) ref
by src-tauri/src/vault/task.rs:Task <- src-tauri/src/vault/parsing.rs:1650 in parse_task_line ref +5
sym src-tauri/src/vault/task.rs:48 struct TaskHeading L9 dto:TaskHeading | One markdown heading of a note that has tasks, as stored in `NoteEntry.task_headings`.
by src-tauri/src/vault/task.rs:TaskHeading <- src-tauri/src/vault/entry.rs:192 in (module) ref
by src-tauri/src/vault/task.rs:TaskHeading <- src-tauri/src/vault/parsing.rs:1720 in extract_tasks_and_headings ref +2
sym src-tauri/src/vault/task.rs:63 enum TaskStatus L10 dto:TaskStatus | Task status parsed from the checkbox character.
by src-tauri/src/vault/task.rs:TaskStatus <- src-tauri/src/commands/vault.rs:677 in toggle_task_status_inner ref +5
by src-tauri/src/vault/task.rs:TaskStatus <- src-tauri/src/vault/parsing.rs:1606 in map_checkbox_char ref +17
sym src-tauri/src/vault/task.rs:79 enum TaskPriority L8 dto:TaskPriority | Task priority parsed from emoji signifiers (🔺/⏫/🔼/🔽/⏬).
by src-tauri/src/vault/task.rs:TaskPriority <- src-tauri/src/vault/parsing.rs:1497 in (module) ref +6
sym src-tauri/src/vault/task.rs:93 struct RecurrenceRule L3 dto:RecurrenceRule | Recurrence rule extracted from the 🔁 signifier.
by src-tauri/src/vault/task.rs:RecurrenceRule <- src-tauri/src/vault/parsing.rs:1813 in parse_task_metadata ref
sym src-tauri/src/vault/task.rs:103 struct TaskMetadata L50 dto:TaskMetadata | Structured metadata extracted from a task's raw text.
by src-tauri/src/vault/task.rs:TaskMetadata <- src-tauri/src/vault/parsing.rs:1771 in parse_task_metadata ref +1
sym src-tauri/src/vault/task.rs:160 struct TagAggregate L9 dto:TagAggregate | Aggregate tag info returned by `VaultIndex::lookup_all_tags`.
by src-tauri/src/vault/task.rs:TagAggregate <- src-tauri/src/commands/vault.rs:640 in get_all_tags_v2 ref
by src-tauri/src/vault/task.rs:TagAggregate <- src-tauri/src/vault/index.rs:1039 in VaultIndex::lookup_all_tags ref +2
sym src-tauri/src/vault/task.rs:174 struct FileTaskGroup L13 dto:FileTaskGroup | One file's worth of tasks, as returned by `VaultIndex::lookup_all_tasks`.
by src-tauri/src/vault/task.rs:FileTaskGroup <- src-tauri/src/commands/vault.rs:654 in get_all_tasks_v2 ref
by src-tauri/src/vault/task.rs:FileTaskGroup <- src-tauri/src/vault/index.rs:1070 in VaultIndex::lookup_all_tasks ref +2
sym src-tauri/src/vault/task.rs:193 fn display_name(path: &str) -> String L7 | Returns the display name for a file path: the basename with the trailing extension dropped (e.g. `/vault/foo.md` -> `foo`, `/vault/.hidden` -> `.hidden`).
by src-tauri/src/vault/task.rs:display_name <- src-tauri/src/vault/index.rs:1077 in VaultIndex::lookup_all_tasks lexical
sym src-tauri/src/vault/task.rs:207 struct ToggleTaskResult L14 dto:ToggleTaskResult | Result of a single `toggle_task_status` mutation.
by src-tauri/src/vault/task.rs:ToggleTaskResult <- src-tauri/src/commands/vault.rs:679 in toggle_task_status_inner ref +3
sym src-tauri/src/vault/task.rs:229 struct TaskTextWriteResult L15 dto:TaskTextWriteResult | Result of `write_task_text`: the note content after the call, the index diff, whether the line was stale, and the re-parsed task.
by src-tauri/src/vault/task.rs:TaskTextWriteResult <- src-tauri/src/commands/vault.rs:900 in write_task_text_inner ref +3
## calls
call src-tauri/src/vault/task.rs:216 in (module) -> src-tauri/src/vault/index.rs:UpdateResult lexical +1
