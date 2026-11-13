# file card src-tauri/src/quick_capture/source.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/quick_capture/source.rs ' codemap/files
file src-tauri/src/quick_capture/source.rs rust L344 module src-tauri/src/quick_capture in2 t0 t:inline | Frontmost-app source helpers.
## imported-by
imp src-tauri/src/lib.rs:28 -> src-tauri/src/quick_capture/source.rs frontmost_bundle_id,resolve_context_for_bundle,PrevFrontmostPid
imp src-tauri/src/quick_capture/commands.rs:24 -> src-tauri/src/quick_capture/source.rs activate_prev_app,bundle_id_for_pid,frontmost_bundle_id,record_prev_frontmost,resolve_context_for_bundle,CaptureContext,PrevFrontmostPid
## reach
in2 src-tauri/src/quick_capture/source.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/quick_capture/source.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/quick_capture/source.rs:24 struct CaptureContext L5 | What we stamp onto a `CaptureAction` payload before dispatching.
by src-tauri/src/quick_capture/source.rs:CaptureContext <- src-tauri/src/quick_capture/commands.rs:78 in capture_clipboard_now_with ref +3
sym src-tauri/src/quick_capture/source.rs:36 struct PrevFrontmostPid L1 | Tauri-managed PID of the macOS app that was frontmost when the composer was last summoned. -1 means "no recorded frontmost".
by src-tauri/src/quick_capture/source.rs:PrevFrontmostPid <- src-tauri/src/lib.rs:322 in run lexical
by src-tauri/src/quick_capture/source.rs:PrevFrontmostPid <- src-tauri/src/quick_capture/commands.rs:480 in submit_composer_capture ref
sym src-tauri/src/quick_capture/source.rs:39 method PrevFrontmostPid::new() -> Self L3
by src-tauri/src/quick_capture/source.rs:PrevFrontmostPid::new <- src-tauri/src/lib.rs:322 in run lexical
sym src-tauri/src/quick_capture/source.rs:43 method PrevFrontmostPid::store(&self, pid: i32) L3
sym src-tauri/src/quick_capture/source.rs:48 method PrevFrontmostPid::take(&self) -> i32 L3 | Atomically read the stored PID and reset to -1.
sym src-tauri/src/quick_capture/source.rs:55 method PrevFrontmostPid::peek(&self) -> i32 L3 | Read the stored PID without resetting.
sym src-tauri/src/quick_capture/source.rs:66 fn record_prev_frontmost(app: &tauri::AppHandle<R>) L20 | Snapshot the macOS frontmost-app PID into `PrevFrontmostPid`.
by src-tauri/src/quick_capture/source.rs:record_prev_frontmost <- src-tauri/src/quick_capture/commands.rs:399 in show_composer lexical
sym src-tauri/src/quick_capture/source.rs:94 fn activate_prev_app(app: &tauri::AppHandle<R>) L20 | Activate the app whose PID was last recorded by `record_prev_frontmost`.
by src-tauri/src/quick_capture/source.rs:activate_prev_app <- src-tauri/src/quick_capture/commands.rs:428 in dismiss_composer lexical
sym src-tauri/src/quick_capture/source.rs:123 fn frontmost_bundle_id() -> Option<String> L20 | Read the bundle identifier of whatever macOS app is currently frontmost.
by src-tauri/src/quick_capture/source.rs:frontmost_bundle_id <- src-tauri/src/lib.rs:61 in dispatch_shortcut lexical
by src-tauri/src/quick_capture/source.rs:frontmost_bundle_id <- src-tauri/src/quick_capture/commands.rs:353 in capture_clipboard_now lexical
sym src-tauri/src/quick_capture/source.rs:154 fn bundle_id_for_pid(pid: i32) -> Option<String> L20 | Resolve an NSRunningApplication by PID and return its bundle identifier.
by src-tauri/src/quick_capture/source.rs:bundle_id_for_pid <- src-tauri/src/quick_capture/commands.rs:481 in submit_composer_capture lexical
sym src-tauri/src/quick_capture/source.rs:184 fn resolve_context_for_bundle(bundle_id: Option<&str>) -> CaptureContext L18 | Build a `CaptureContext` from a macOS bundle id.
by src-tauri/src/quick_capture/source.rs:resolve_context_for_bundle <- src-tauri/src/lib.rs:61 in dispatch_shortcut lexical
by src-tauri/src/quick_capture/source.rs:resolve_context_for_bundle <- src-tauri/src/quick_capture/commands.rs:353 in capture_clipboard_now lexical +1
sym src-tauri/src/quick_capture/source.rs:264 fn parse_url_then_title(out: Option<String>) -> (Option<String>, Option<String>) L17 | Parse a two-line "url\ntitle" string into (title, url).
## locals
local src-tauri/src/quick_capture/source.rs:204 fn browser_active_tab_chrome(bundle: &str) -> (Option<String>, Option<String>) L11
local src-tauri/src/quick_capture/source.rs:222 fn safari_active_tab(bundle: &str) -> (Option<String>, Option<String>) L10
local src-tauri/src/quick_capture/source.rs:243 fn run_osascript(script: &str) -> Option<String> L17
## calls
call src-tauri/src/quick_capture/source.rs:192 in resolve_context_for_bundle -> src-tauri/src/quick_capture/source.rs:browser_active_tab_chrome call
call src-tauri/src/quick_capture/source.rs:193 in resolve_context_for_bundle -> src-tauri/src/quick_capture/source.rs:safari_active_tab call
call src-tauri/src/quick_capture/source.rs:213 in browser_active_tab_chrome -> src-tauri/src/quick_capture/source.rs:parse_url_then_title call
call src-tauri/src/quick_capture/source.rs:213 in browser_active_tab_chrome -> src-tauri/src/quick_capture/source.rs:run_osascript call
call src-tauri/src/quick_capture/source.rs:230 in safari_active_tab -> src-tauri/src/quick_capture/source.rs:parse_url_then_title call
call src-tauri/src/quick_capture/source.rs:230 in safari_active_tab -> src-tauri/src/quick_capture/source.rs:run_osascript call
