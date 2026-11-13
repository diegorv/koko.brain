# file card src-tauri/src/vault/task_lines.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/vault/task_lines.rs ' codemap/files
file src-tauri/src/vault/task_lines.rs rust L403 module src-tauri/src/vault in1 t1 | Guarded edits of task lines located by their `🆔 td-…` anchor plus the line the caller expects there, never by line number (todoist-bisync design rule 12).
## imports
imp src-tauri/src/vault/task_lines.rs:6 -> src-tauri/src/vault/index.rs UpdateResult
imp src-tauri/src/vault/task_lines.rs:7 -> src-tauri/src/vault/parsing.rs detect_code_fence,HEADING_RE,ID_RE
## imported-by
imp src-tauri/src/commands/vault.rs:10 -> src-tauri/src/vault/task_lines.rs apply_task_line_edits,TaskLineEditOutcome,TaskLineEdits,TaskLinesOutcome,TaskLinesWriteResult
## reach
in2 src-tauri/src/vault/task_lines.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/vault/task_lines.rs 5 files in 2 modules: src-tauri/src/vault(3) src-tauri/src/utils(2)
## tests
test src-tauri/tests/vault_task_lines_test.rs imports src-tauri/src/vault/task_lines.rs
## symbols
sym src-tauri/src/vault/task_lines.rs:16 struct TaskLineReplace L14 dto:TaskLineReplace | Replaces the one line that carries `anchor`, if it still equals `expected_line`.
sym src-tauri/src/vault/task_lines.rs:36 struct TaskLineInsert L17 dto:TaskLineInsert | Inserts lines under a heading, above the note's sections, or at the end of the note.
sym src-tauri/src/vault/task_lines.rs:59 struct TaskHeadingRename L6 dto:TaskHeadingRename | Renames the one `##` heading whose text is `from` (as `after_heading` matches it) to `to`.
sym src-tauri/src/vault/task_lines.rs:70 struct TaskLineRemove L6 dto:TaskLineRemove | Removes the one line that carries `anchor`, if it still equals `expected_line`.
sym src-tauri/src/vault/task_lines.rs:84 struct TaskLineEdits L12 dto:TaskLineEdits | One note's batch, applied all or nothing.
by src-tauri/src/vault/task_lines.rs:TaskLineEdits <- src-tauri/src/commands/vault.rs:804 in write_task_lines_inner ref +1
sym src-tauri/src/vault/task_lines.rs:101 enum TaskLinesStaleReason L16 dto:TaskLinesStaleReason | Why a batch was not applied.
sym src-tauri/src/vault/task_lines.rs:122 struct TaskLinesStale L6 dto:TaskLinesStale | The first check that failed, and the anchor or heading it failed on.
sym src-tauri/src/vault/task_lines.rs:133 enum TaskLinesOutcome L12 dto:TaskLinesOutcome | What `write_task_lines` did.
by src-tauri/src/vault/task_lines.rs:TaskLinesOutcome <- src-tauri/src/commands/vault.rs:827 in write_task_lines_inner lexical +4
sym src-tauri/src/vault/task_lines.rs:150 struct TaskLinesWriteResult L11 dto:TaskLinesWriteResult | Result of `write_task_lines`.
by src-tauri/src/vault/task_lines.rs:TaskLinesWriteResult <- src-tauri/src/commands/vault.rs:805 in write_task_lines_inner ref +3
sym src-tauri/src/vault/task_lines.rs:164 enum TaskLineEditOutcome L6 | Result of [`apply_task_line_edits`].
by src-tauri/src/vault/task_lines.rs:TaskLineEditOutcome <- src-tauri/src/commands/vault.rs:827 in write_task_lines_inner lexical +1
sym src-tauri/src/vault/task_lines.rs:184 fn apply_task_line_edits(content: &str, edits: &TaskLineEdits) -> Result<TaskLineEditOutcome, String> L74 | Applies `edits` to `content`.
by src-tauri/src/vault/task_lines.rs:apply_task_line_edits <- src-tauri/src/commands/vault.rs:826 in write_task_lines_inner lexical
## locals
local src-tauri/src/vault/task_lines.rs:259 fn validate(edits: &TaskLineEdits) -> Result<(), String> L38
local src-tauri/src/vault/task_lines.rs:299 fn anchors(line: &str) -> impl Iterator<Item = &str> L3
local src-tauri/src/vault/task_lines.rs:304 fn locate(lines: &[String], anchor: &str, expected: &str) -> Result<usize, TaskLinesStale> L13
local src-tauri/src/vault/task_lines.rs:320 fn locate_unanchored(lines: &[String], line_number: u32, anchor: &str, expected: &str) -> Result<usize, TaskLinesStale> L10
local src-tauri/src/vault/task_lines.rs:333 fn section_end(lines: &[String], heading: &str) -> Result<usize, TaskLinesStale> L6
local src-tauri/src/vault/task_lines.rs:342 fn unique_heading(headings: &[(usize, usize, String)], heading: &str) -> Result<usize, TaskLinesStale> L10
local src-tauri/src/vault/task_lines.rs:356 fn before_sections(lines: &[String]) -> usize L6
local src-tauri/src/vault/task_lines.rs:364 fn after_last_non_blank(lines: &[String], from: usize, to: usize) -> Option<usize> L3
local src-tauri/src/vault/task_lines.rs:369 fn heading_indexes(lines: &[String]) -> Vec<(usize, usize, String)> L28
local src-tauri/src/vault/task_lines.rs:398 fn stale(reason: TaskLinesStaleReason, subject: &str) -> TaskLinesStale L6
## calls
call src-tauri/src/vault/task_lines.rs:185 in apply_task_line_edits -> src-tauri/src/vault/task_lines.rs:validate call
call src-tauri/src/vault/task_lines.rs:189 in apply_task_line_edits -> src-tauri/src/vault/task_lines.rs:stale call +2
call src-tauri/src/vault/task_lines.rs:194 in apply_task_line_edits -> src-tauri/src/vault/task_lines.rs:heading_indexes call
call src-tauri/src/vault/task_lines.rs:194 in apply_task_line_edits -> src-tauri/src/vault/task_lines.rs:unique_heading call
call src-tauri/src/vault/task_lines.rs:213 in apply_task_line_edits -> src-tauri/src/vault/task_lines.rs:locate_unanchored call
call src-tauri/src/vault/task_lines.rs:214 in apply_task_line_edits -> src-tauri/src/vault/task_lines.rs:locate call
call src-tauri/src/vault/task_lines.rs:236 in apply_task_line_edits -> src-tauri/src/vault/task_lines.rs:anchors call +1
call src-tauri/src/vault/task_lines.rs:247 in apply_task_line_edits -> src-tauri/src/vault/task_lines.rs:before_sections call
call src-tauri/src/vault/task_lines.rs:248 in apply_task_line_edits -> src-tauri/src/vault/task_lines.rs:after_last_non_blank call
call src-tauri/src/vault/task_lines.rs:249 in apply_task_line_edits -> src-tauri/src/vault/task_lines.rs:section_end call
call src-tauri/src/vault/task_lines.rs:277 in validate -> src-tauri/src/vault/task_lines.rs:anchors call +1
call src-tauri/src/vault/task_lines.rs:305 in locate -> src-tauri/src/vault/task_lines.rs:anchors call
call src-tauri/src/vault/task_lines.rs:307 in locate -> src-tauri/src/vault/task_lines.rs:stale call +2
call src-tauri/src/vault/task_lines.rs:323 in locate_unanchored -> src-tauri/src/vault/task_lines.rs:stale call +1
call src-tauri/src/vault/task_lines.rs:325 in locate_unanchored -> src-tauri/src/vault/task_lines.rs:anchors call
call src-tauri/src/vault/task_lines.rs:334 in section_end -> src-tauri/src/vault/task_lines.rs:heading_indexes call
call src-tauri/src/vault/task_lines.rs:335 in section_end -> src-tauri/src/vault/task_lines.rs:unique_heading call
call src-tauri/src/vault/task_lines.rs:337 in section_end -> src-tauri/src/vault/task_lines.rs:after_last_non_blank call
call src-tauri/src/vault/task_lines.rs:345 in unique_heading -> src-tauri/src/vault/task_lines.rs:stale call +1
call src-tauri/src/vault/task_lines.rs:357 in before_sections -> src-tauri/src/vault/task_lines.rs:heading_indexes call
call src-tauri/src/vault/task_lines.rs:358 in before_sections -> src-tauri/src/vault/task_lines.rs:after_last_non_blank call +1
call src-tauri/src/vault/task_lines.rs:379 in heading_indexes -> src-tauri/src/vault/parsing.rs:detect_code_fence lexical
