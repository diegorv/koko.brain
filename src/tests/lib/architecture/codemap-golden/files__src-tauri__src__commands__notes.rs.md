# file card src-tauri/src/commands/notes.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/commands/notes.rs ' codemap/files
file src-tauri/src/commands/notes.rs rust L41 module src-tauri/src/commands in1 t1 t:inline | Note commands.
## imports
imp src-tauri/src/commands/notes.rs:2 -> src-tauri/src/events.rs INDEX_UPDATED_EVENT
imp src-tauri/src/commands/notes.rs:3 -> src-tauri/src/index.rs Index
imp src-tauri/src/commands/notes.rs:4 -> src-tauri/src/utils/fs.rs write_atomic
## imported-by
imp src-tauri/src/lib.rs:10 -> src-tauri/src/commands/notes.rs get_tags
imp src-tauri/src/lib.rs:11 -> src-tauri/src/commands/notes.rs save_note
## reach
in2 src-tauri/src/commands/notes.rs 0 files in 0 modules: -
out2 src-tauri/src/commands/notes.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/notes_test.rs imports src-tauri/src/commands/notes.rs
## symbols
sym src-tauri/src/commands/notes.rs:9 struct TagAggregate L4 dto:TagAggregate | A tag with its note count.
sym src-tauri/src/commands/notes.rs:16 cmd get_tags() -> Vec<TagAggregate> L3 | Returns every tag.
by src-tauri/src/commands/notes.rs:get_tags <- src-tauri/src/lib.rs:10 in run import
sym src-tauri/src/commands/notes.rs:26 cmd save_note(app: AppHandle, path: String, content: String) -> Result<(), String> L7 | Writes a note and tells the frontend.
by src-tauri/src/commands/notes.rs:save_note <- src-tauri/src/lib.rs:11 in run import
## locals
local src-tauri/src/commands/notes.rs:20 fn collect() -> Vec<TagAggregate> L3
## calls
call src-tauri/src/commands/notes.rs:17 in get_tags -> src-tauri/src/commands/notes.rs:collect call
call src-tauri/src/commands/notes.rs:27 in save_note -> src-tauri/src/utils/fs.rs:write_atomic lexical
call src-tauri/src/commands/notes.rs:28 in save_note -> src-tauri/src/index.rs:Index lexical
call src-tauri/src/commands/notes.rs:29 in save_note -> src-tauri/src/index.rs:Index::update_entry lexical-method
## ipc-in
ipc-call src/lib/core/notes/notes.service.ts:19 in loadTags -> ipc:get_tags -> src-tauri/src/commands/notes.rs:16
ipc-call src/lib/core/notes/notes.service.ts:15 in saveNote -> ipc:save_note -> src-tauri/src/commands/notes.rs:26
## effects
ev src-tauri/src/commands/notes.rs:30 in save_note -> event:index-updated -> src/lib/plugins/cal/cal.ts:6 in listenIndex
