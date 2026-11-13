# file card src-tauri/src/events.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/events.rs ' codemap/files
file src-tauri/src/events.rs rust L38 module src-tauri/src in5 t1 | Every Tauri event name the backend emits.
## imported-by
imp src-tauri/src/commands/semantic.rs:2 -> src-tauri/src/events.rs SEMANTIC_INDEX_PROGRESS_EVENT
imp src-tauri/src/commands/vault.rs:1 -> src-tauri/src/events.rs VAULT_INDEX_UPDATED_EVENT
imp src-tauri/src/commands/watcher.rs:1 -> src-tauri/src/events.rs VAULT_FILES_CHANGED_EVENT
imp src-tauri/src/lib.rs:20 -> src-tauri/src/events.rs APP_EXIT_REQUESTED_EVENT,MENU_SETTINGS_EVENT,QC_CAPTURE_DETECTED_EVENT,TAURI_DEBUG_LOG_EVENT
imp src-tauri/src/quick_capture/commands.rs:19 -> src-tauri/src/events.rs QC_CAPTURE_DETECTED_EVENT,QC_COMPOSER_CAPTURE_RESULT_EVENT,QC_OPEN_COMPOSER_EVENT
## reach
in2 src-tauri/src/events.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/events.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/commands/vault_test.rs imports src-tauri/src/events.rs
## symbols
sym src-tauri/src/events.rs:7 const VAULT_INDEX_UPDATED_EVENT L1 | Emitted after every `VaultIndex` mutation with an `UpdateResult` payload.
by src-tauri/src/events.rs:VAULT_INDEX_UPDATED_EVENT <- src-tauri/src/commands/vault.rs:373 in update_note_in_index ref +8
sym src-tauri/src/events.rs:11 const VAULT_FILES_CHANGED_EVENT L1 | Emitted on every debounced burst of vault file changes.
by src-tauri/src/events.rs:VAULT_FILES_CHANGED_EVENT <- src-tauri/src/commands/watcher.rs:19 in start_vault_watcher ref
sym src-tauri/src/events.rs:14 const SEMANTIC_INDEX_PROGRESS_EVENT L1 | Carries every `SemanticProgress` update (downloads and builds).
by src-tauri/src/events.rs:SEMANTIC_INDEX_PROGRESS_EVENT <- src-tauri/src/commands/semantic.rs:414 in emit_progress ref
sym src-tauri/src/events.rs:18 const TAURI_DEBUG_LOG_EVENT L1 | Carries one `DebugLogPayload` per `debug_log` call, from the log sink set in `lib.rs`.
by src-tauri/src/events.rs:TAURI_DEBUG_LOG_EVENT <- src-tauri/src/lib.rs:289 in run ref
sym src-tauri/src/events.rs:21 const MENU_SETTINGS_EVENT L1 | Emitted with `()` when the user picks Settings in the app menu.
by src-tauri/src/events.rs:MENU_SETTINGS_EVENT <- src-tauri/src/lib.rs:305 in run ref
sym src-tauri/src/events.rs:26 const APP_EXIT_REQUESTED_EVENT L1 | Emitted with `()` to the main window when Quit was requested and the frontend has not flushed yet; the frontend runs `prepareForExit`, then invokes `confirm_ex…
by src-tauri/src/events.rs:APP_EXIT_REQUESTED_EVENT <- src-tauri/src/lib.rs:168 in on_exit_requested ref
sym src-tauri/src/events.rs:29 const QC_CAPTURE_DETECTED_EVENT L1 | Delivers a detected clipboard capture to the frontend.
by src-tauri/src/events.rs:QC_CAPTURE_DETECTED_EVENT <- src-tauri/src/lib.rs:81 in dispatch_shortcut ref
by src-tauri/src/events.rs:QC_CAPTURE_DETECTED_EVENT <- src-tauri/src/quick_capture/commands.rs:359 in capture_clipboard_now ref +1
sym src-tauri/src/events.rs:34 const QC_OPEN_COMPOSER_EVENT L1 | Event the composer popover listens for to focus its textarea after a show.
by src-tauri/src/events.rs:QC_OPEN_COMPOSER_EVENT <- src-tauri/src/quick_capture/commands.rs:406 in show_composer ref
sym src-tauri/src/events.rs:38 const QC_COMPOSER_CAPTURE_RESULT_EVENT L1 | Carries a `ComposerCaptureResult`: whether the main window wrote the capture note of one composer submit.
by src-tauri/src/events.rs:QC_COMPOSER_CAPTURE_RESULT_EVENT <- src-tauri/src/quick_capture/commands.rs:511 in report_composer_capture_result ref
