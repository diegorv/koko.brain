# file card src-tauri/src/semantic/update_plan.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/semantic/update_plan.rs ' codemap/files
file src-tauri/src/semantic/update_plan.rs rust L69 module src-tauri/src/semantic in1 t1 | Plans a single-file semantic update from the file's stored chunk rows and its fresh chunks, without touching the model or the database.
## imports
imp src-tauri/src/semantic/update_plan.rs:14 -> src-tauri/src/semantic/types.rs Chunk
## imported-by
imp src-tauri/src/commands/semantic.rs:15 -> src-tauri/src/semantic/update_plan.rs plan_file_update
## reach
in2 src-tauri/src/semantic/update_plan.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/semantic/update_plan.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/semantic_update_plan_test.rs imports src-tauri/src/semantic/update_plan.rs
## symbols
sym src-tauri/src/semantic/update_plan.rs:17 struct UpdatePlan L10 | What a single-file update must write.
sym src-tauri/src/semantic/update_plan.rs:31 method UpdatePlan::is_noop(&self) -> bool L3 | True when every fresh chunk is stored under its own key with its own hash and no stored key is stale.
by src-tauri/src/semantic/update_plan.rs:UpdatePlan::is_noop <- src-tauri/src/commands/semantic.rs:1334 in update_semantic_file lexical-method
sym src-tauri/src/semantic/update_plan.rs:42 fn plan_file_update(existing: &HashMap<String, String>, chunks: &'a [Chunk]) -> UpdatePlan<'a> L28 | Plans the update of one file.
by src-tauri/src/semantic/update_plan.rs:plan_file_update <- src-tauri/src/commands/semantic.rs:1331 in update_semantic_file lexical
