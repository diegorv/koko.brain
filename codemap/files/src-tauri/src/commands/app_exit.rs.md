# file card src-tauri/src/commands/app_exit.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/commands/app_exit.rs ' codemap/files
file src-tauri/src/commands/app_exit.rs rust L64 module src-tauri/src/commands in1 t1 | Quit goes through the frontend's `prepareForExit` (save dirty tabs, ask before discarding failed saves, drain pending writes, flush settings) before the proces…
## imported-by
imp src-tauri/src/lib.rs:19 -> src-tauri/src/commands/app_exit.rs exit_decision,ExitDecision,ExitFlushState,MAIN_WINDOW_LABEL
imp src-tauri/src/lib.rs:397 -> src-tauri/src/commands/app_exit.rs confirm_exit
## reach
in2 src-tauri/src/commands/app_exit.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/commands/app_exit.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/commands/app_exit_test.rs imports src-tauri/src/commands/app_exit.rs
## symbols
sym src-tauri/src/commands/app_exit.rs:16 const MAIN_WINDOW_LABEL L1 | Label of the main window, the one whose frontend runs `prepareForExit`.
by src-tauri/src/commands/app_exit.rs:MAIN_WINDOW_LABEL <- src-tauri/src/lib.rs:165 in on_exit_requested ref +1
sym src-tauri/src/commands/app_exit.rs:20 struct ExitFlushState L1 | Whether the frontend already ran `prepareForExit` for the exit under way.
by src-tauri/src/commands/app_exit.rs:ExitFlushState <- src-tauri/src/lib.rs:164 in on_exit_requested ref +1
sym src-tauri/src/commands/app_exit.rs:24 method ExitFlushState::mark_flushed(&self) L3 | Records that the frontend flushed, so the next exit request goes on.
sym src-tauri/src/commands/app_exit.rs:29 method ExitFlushState::is_flushed(&self) -> bool L3 | True once `mark_flushed` ran.
by src-tauri/src/commands/app_exit.rs:ExitFlushState::is_flushed <- src-tauri/src/lib.rs:164 in on_exit_requested lexical-method
sym src-tauri/src/commands/app_exit.rs:36 enum ExitDecision L6 | What `RunEvent::ExitRequested` does.
by src-tauri/src/commands/app_exit.rs:ExitDecision <- src-tauri/src/lib.rs:166 in on_exit_requested lexical
sym src-tauri/src/commands/app_exit.rs:49 fn exit_decision(code: Option<i32>, flushed: bool, has_main_window: bool) -> ExitDecision L8 | Decides one `RunEvent::ExitRequested`.
by src-tauri/src/commands/app_exit.rs:exit_decision <- src-tauri/src/lib.rs:166 in on_exit_requested lexical
sym src-tauri/src/commands/app_exit.rs:61 cmd confirm_exit(app: AppHandle, state: State<'_, ExitFlushState>) L4 | Called by the frontend once `prepareForExit` returned true: marks the flush done and exits with code 0.
by src-tauri/src/commands/app_exit.rs:confirm_exit <- src-tauri/src/lib.rs:397 in run import
## calls
call src-tauri/src/commands/app_exit.rs:62 in confirm_exit -> src-tauri/src/commands/app_exit.rs:ExitFlushState::mark_flushed lexical-method
## ipc-in
ipc-call src/lib/app/tauri-listeners.service.ts:86 in registerExitRequestListener -> ipc:confirm_exit -> src-tauri/src/commands/app_exit.rs:61
