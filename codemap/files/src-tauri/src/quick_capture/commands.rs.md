# file card src-tauri/src/quick_capture/commands.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/quick_capture/commands.rs ' codemap/files
file src-tauri/src/quick_capture/commands.rs rust L884 module src-tauri/src/quick_capture in1 t0 t:inline | Tauri commands for quick-capture.
## imports
imp src-tauri/src/quick_capture/commands.rs:19 -> src-tauri/src/events.rs QC_CAPTURE_DETECTED_EVENT,QC_COMPOSER_CAPTURE_RESULT_EVENT,QC_OPEN_COMPOSER_EVENT
imp src-tauri/src/quick_capture/commands.rs:22 -> src-tauri/src/quick_capture/clipboard.rs Clipboard,SystemClipboard
imp src-tauri/src/quick_capture/commands.rs:23 -> src-tauri/src/quick_capture/kind_detect.rs decide,CaptureInput,ShotSource
imp src-tauri/src/quick_capture/commands.rs:24 -> src-tauri/src/quick_capture/source.rs activate_prev_app,bundle_id_for_pid,frontmost_bundle_id,record_prev_frontmost,resolve_context_for_bundle,CaptureContext,PrevFrontmostPid
imp src-tauri/src/quick_capture/commands.rs:211 -> src-tauri/src/utils/fs.rs validate_vault_path
imp src-tauri/src/quick_capture/commands.rs:248 -> src-tauri/src/utils/logger.rs debug_log
## imported-by
imp src-tauri/src/lib.rs:24 -> src-tauri/src/quick_capture/commands.rs capture_clipboard_now_with,show_composer,COMPOSER_WINDOW_LABEL,LastCaptureSignature
imp src-tauri/src/lib.rs:391 -> src-tauri/src/quick_capture/commands.rs capture_clipboard_now
imp src-tauri/src/lib.rs:392 -> src-tauri/src/quick_capture/commands.rs open_composer
imp src-tauri/src/lib.rs:393 -> src-tauri/src/quick_capture/commands.rs dismiss_composer
imp src-tauri/src/lib.rs:394 -> src-tauri/src/quick_capture/commands.rs submit_composer_capture
imp src-tauri/src/lib.rs:395 -> src-tauri/src/quick_capture/commands.rs report_composer_capture_result
imp src-tauri/src/lib.rs:396 -> src-tauri/src/quick_capture/commands.rs import_staged_shot
## reach
in2 src-tauri/src/quick_capture/commands.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/quick_capture/commands.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/quick_capture/commands.rs:31 const COMPOSER_WINDOW_LABEL L1 | Tauri label of the composer popover window.
by src-tauri/src/quick_capture/commands.rs:COMPOSER_WINDOW_LABEL <- src-tauri/src/lib.rs:138 in build_composer_window ref
sym src-tauri/src/quick_capture/commands.rs:39 struct LastCaptureSignature L1 | Session-only memory of the most recently captured clipboard signature.
by src-tauri/src/quick_capture/commands.rs:LastCaptureSignature <- src-tauri/src/lib.rs:62 in dispatch_shortcut ref +1
sym src-tauri/src/quick_capture/commands.rs:75 fn capture_clipboard_now_with(clipboard: &dyn Clipboard, captured_at: String, context: CaptureContext, last_signature: &mut Option<String>,) -> Resu… L39 | Pure helper: read the clipboard via the injected adapter, decide the kind(s), materialize any in-memory shot bytes to a temp file, and serialize each result in…
by src-tauri/src/quick_capture/commands.rs:capture_clipboard_now_with <- src-tauri/src/lib.rs:70 in dispatch_shortcut lexical
sym src-tauri/src/quick_capture/commands.rs:173 cmd import_staged_shot(source: String, dest_dir: String, vault_path: String,) -> Result<String, String> L7 | Tauri command: move a clipboard screenshot that `materialize_input` staged in the OS temp dir into `dest_dir` inside the vault, so the capture note embeds a fi…
by src-tauri/src/quick_capture/commands.rs:import_staged_shot <- src-tauri/src/lib.rs:396 in run import
sym src-tauri/src/quick_capture/commands.rs:348 cmd capture_clipboard_now(app: tauri::AppHandle<R>, last_signature: tauri::State<'_, LastCaptureSignature>,) -> Result<(), String> L16 | Tauri command: read the system clipboard, detect kind(s), stamp the live frontmost-app context (bundle id + browser tab when applicable), and emit one `qc:capt…
by src-tauri/src/quick_capture/commands.rs:capture_clipboard_now <- src-tauri/src/lib.rs:391 in run import
sym src-tauri/src/quick_capture/commands.rs:393 fn show_composer(app: &tauri::AppHandle<R>) L16 | Show the composer popover window and emit `qc:open-composer` so the route resets its focus state.
by src-tauri/src/quick_capture/commands.rs:show_composer <- src-tauri/src/lib.rs:54 in dispatch_shortcut lexical
sym src-tauri/src/quick_capture/commands.rs:413 cmd open_composer(app: tauri::AppHandle<R>) -> Result<(), String> L4 | Tauri command counterpart of `show_composer`.
by src-tauri/src/quick_capture/commands.rs:open_composer <- src-tauri/src/lib.rs:392 in run import
sym src-tauri/src/quick_capture/commands.rs:422 cmd dismiss_composer(app: tauri::AppHandle<R>) -> Result<(), String> L10 | Hide the composer popover.
by src-tauri/src/quick_capture/commands.rs:dismiss_composer <- src-tauri/src/lib.rs:393 in run import
sym src-tauri/src/quick_capture/commands.rs:439 fn build_composer_note_payload(text: &str, captured_at: String, request_id: &str, context: &CaptureContext,) -> Value L16 | Build a `note`-kind capture payload from composer text, stamped with `context`.
sym src-tauri/src/quick_capture/commands.rs:469 cmd submit_composer_capture(app: tauri::AppHandle<R>, text: String, request_id: String,) -> Result<(), String> L18 | Composer-side save path.
by src-tauri/src/quick_capture/commands.rs:submit_composer_capture <- src-tauri/src/lib.rs:394 in run import
sym src-tauri/src/quick_capture/commands.rs:493 struct ComposerCaptureResult L7 dto:ComposerCaptureResult | Outcome of one composer capture, sent from the main window back to the composer on `qc:composer-capture-result`.
sym src-tauri/src/quick_capture/commands.rs:505 cmd report_composer_capture_result(app: tauri::AppHandle<R>, request_id: String, ok: bool,) -> Result<(), String> L11 | Main-window side of the composer round trip: relays the outcome of a composer capture to the composer window, which keeps its text until it hears `ok`.
by src-tauri/src/quick_capture/commands.rs:report_composer_capture_result <- src-tauri/src/lib.rs:395 in run import
## locals
local src-tauri/src/quick_capture/commands.rs:45 fn capture_signature(input: &CaptureInput) -> Option<String> L14
local src-tauri/src/quick_capture/commands.rs:122 fn materialize_input(input: CaptureInput) -> Result<CaptureInput, String> L13
local src-tauri/src/quick_capture/commands.rs:140 fn write_shot_bytes_to_temp(bytes: &[u8], mime: &str) -> Result<std::path::PathBuf, String> L20
local src-tauri/src/quick_capture/commands.rs:190 fn import_staged_shot_in(temp_dir: &Path, source: &str, dest_dir: &str, vault_path: &str,) -> Result<String, String> L65
local src-tauri/src/quick_capture/commands.rs:263 fn capture_input_to_payload(input: CaptureInput, captured_at: &str, context: &CaptureContext,) -> Result<Value, String> L61
local src-tauri/src/quick_capture/commands.rs:329 fn merge_context(payload: &mut Value, context: &CaptureContext) L14
local src-tauri/src/quick_capture/commands.rs:375 fn schedule_refocus_after_space_move(window: tauri::WebviewWindow<R>) L13
## calls
call src-tauri/src/quick_capture/commands.rs:47 in capture_signature -> src-tauri/src/quick_capture/kind_detect.rs:CaptureInput lexical +5
call src-tauri/src/quick_capture/commands.rs:52 in capture_signature -> src-tauri/src/quick_capture/kind_detect.rs:ShotSource lexical +1
call src-tauri/src/quick_capture/commands.rs:82 in capture_clipboard_now_with -> src-tauri/src/quick_capture/kind_detect.rs:decide lexical
call src-tauri/src/quick_capture/commands.rs:85 in capture_clipboard_now_with -> src-tauri/src/quick_capture/commands.rs:capture_signature call
call src-tauri/src/quick_capture/commands.rs:96 in capture_clipboard_now_with -> src-tauri/src/quick_capture/kind_detect.rs:CaptureInput lexical
call src-tauri/src/quick_capture/commands.rs:97 in capture_clipboard_now_with -> src-tauri/src/quick_capture/kind_detect.rs:ShotSource lexical
call src-tauri/src/quick_capture/commands.rs:100 in capture_clipboard_now_with -> src-tauri/src/quick_capture/commands.rs:materialize_input call
call src-tauri/src/quick_capture/commands.rs:101 in capture_clipboard_now_with -> src-tauri/src/quick_capture/commands.rs:capture_input_to_payload call
call src-tauri/src/quick_capture/commands.rs:124 in materialize_input -> src-tauri/src/quick_capture/kind_detect.rs:CaptureInput lexical +1
call src-tauri/src/quick_capture/commands.rs:125 in materialize_input -> src-tauri/src/quick_capture/kind_detect.rs:ShotSource lexical +1
call src-tauri/src/quick_capture/commands.rs:127 in materialize_input -> src-tauri/src/quick_capture/commands.rs:write_shot_bytes_to_temp call
call src-tauri/src/quick_capture/commands.rs:178 in import_staged_shot -> src-tauri/src/quick_capture/commands.rs:import_staged_shot_in call
call src-tauri/src/quick_capture/commands.rs:211 in import_staged_shot_in -> src-tauri/src/utils/fs.rs:validate_vault_path lexical
call src-tauri/src/quick_capture/commands.rs:248 in import_staged_shot_in -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/quick_capture/commands.rs:269 in capture_input_to_payload -> src-tauri/src/quick_capture/kind_detect.rs:CaptureInput lexical +5
call src-tauri/src/quick_capture/commands.rs:289 in capture_input_to_payload -> src-tauri/src/quick_capture/kind_detect.rs:ShotSource lexical +1
call src-tauri/src/quick_capture/commands.rs:321 in capture_input_to_payload -> src-tauri/src/quick_capture/commands.rs:merge_context call
call src-tauri/src/quick_capture/commands.rs:353 in capture_clipboard_now -> src-tauri/src/quick_capture/source.rs:frontmost_bundle_id lexical
call src-tauri/src/quick_capture/commands.rs:353 in capture_clipboard_now -> src-tauri/src/quick_capture/source.rs:resolve_context_for_bundle lexical
call src-tauri/src/quick_capture/commands.rs:356 in capture_clipboard_now -> src-tauri/src/quick_capture/clipboard.rs:SystemClipboard lexical
call src-tauri/src/quick_capture/commands.rs:356 in capture_clipboard_now -> src-tauri/src/quick_capture/clipboard.rs:SystemClipboard::new lexical
call src-tauri/src/quick_capture/commands.rs:356 in capture_clipboard_now -> src-tauri/src/quick_capture/commands.rs:capture_clipboard_now_with call
call src-tauri/src/quick_capture/commands.rs:399 in show_composer -> src-tauri/src/quick_capture/source.rs:record_prev_frontmost lexical
call src-tauri/src/quick_capture/commands.rs:404 in show_composer -> src-tauri/src/quick_capture/commands.rs:schedule_refocus_after_space_move call
call src-tauri/src/quick_capture/commands.rs:414 in open_composer -> src-tauri/src/quick_capture/commands.rs:show_composer call
call src-tauri/src/quick_capture/commands.rs:428 in dismiss_composer -> src-tauri/src/quick_capture/source.rs:activate_prev_app lexical
call src-tauri/src/quick_capture/commands.rs:452 in build_composer_note_payload -> src-tauri/src/quick_capture/commands.rs:merge_context call
call src-tauri/src/quick_capture/commands.rs:481 in submit_composer_capture -> src-tauri/src/quick_capture/source.rs:bundle_id_for_pid lexical
call src-tauri/src/quick_capture/commands.rs:482 in submit_composer_capture -> src-tauri/src/quick_capture/source.rs:resolve_context_for_bundle lexical
call src-tauri/src/quick_capture/commands.rs:483 in submit_composer_capture -> src-tauri/src/quick_capture/commands.rs:build_composer_note_payload call
## ipc-in
ipc-call src/lib/app/deep-link-actions.ts:111 in importStagedShot -> ipc:import_staged_shot -> src-tauri/src/quick_capture/commands.rs:173
ipc-call src/routes/composer/+page.svelte:77 in dismiss -> ipc:dismiss_composer -> src-tauri/src/quick_capture/commands.rs:422
ipc-call src/routes/composer/+page.svelte:102 in handleSave -> ipc:submit_composer_capture -> src-tauri/src/quick_capture/commands.rs:469
ipc-call src/lib/plugins/quick-capture/quick-capture.service.ts:96 in handleDetectedCapture -> ipc:report_composer_capture_result -> src-tauri/src/quick_capture/commands.rs:505
## effects
fx src-tauri/src/quick_capture/commands.rs:157 rust-fs.write in write_shot_bytes_to_temp
fx src-tauri/src/quick_capture/commands.rs:231 rust-fs.OpenOptions::new in import_staged_shot_in
fx src-tauri/src/quick_capture/commands.rs:244 rust-fs.remove_file in import_staged_shot_in
fx src-tauri/src/quick_capture/commands.rs:247 rust-fs.remove_file in import_staged_shot_in
ev src-tauri/src/quick_capture/commands.rs:359 in capture_clipboard_now -> event:qc:capture-detected -> src/lib/plugins/quick-capture/quick-capture.service.ts:62 in registerQuickCaptureListener
fx src-tauri/src/quick_capture/commands.rs:378 rust-spawn.spawn in schedule_refocus_after_space_move
fx src-tauri/src/quick_capture/commands.rs:380 rust-timer.sleep in schedule_refocus_after_space_move
ev src-tauri/src/quick_capture/commands.rs:406 in show_composer -> event:qc:open-composer -> src/routes/composer/+page.svelte:178 in (script)
ev src-tauri/src/quick_capture/commands.rs:484 in submit_composer_capture -> event:qc:capture-detected -> src/lib/plugins/quick-capture/quick-capture.service.ts:62 in registerQuickCaptureListener
ev src-tauri/src/quick_capture/commands.rs:511 in report_composer_capture_result -> event:qc:composer-capture-result -> src/routes/composer/+page.svelte:188 in (script)
