# module card src-tauri/src/quick_capture
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src-tauri/src/quick_capture ' codemap/modules
module src-tauri/src/quick_capture rust files 6 in-modules 1 out-modules 2 pub 19/38 ipc 0/6 card ~1.9k
## neighbors
dep src-tauri/src -> src-tauri/src/quick_capture 4
dep src-tauri/src/quick_capture -> src-tauri/src 1
dep src-tauri/src/quick_capture -> src-tauri/src/utils 2
in2 src-tauri/src/quick_capture 0 modules: -
out2 src-tauri/src/quick_capture 0 modules: -
## entry files
entry src-tauri/src/quick_capture/clipboard.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/quick_capture/commands.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/quick_capture/shortcuts.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/quick_capture/source.rs ext-in1 src-tauri/src/lib.rs
## files
file src-tauri/src/quick_capture/clipboard.rs rust L206 module src-tauri/src/quick_capture in3 t0 t:inline | Clipboard adapter.
file src-tauri/src/quick_capture/commands.rs rust L884 module src-tauri/src/quick_capture in1 t0 t:inline | Tauri commands for quick-capture.
file src-tauri/src/quick_capture/kind_detect.rs rust L355 module src-tauri/src/quick_capture in1 t0 t:inline | Pure kind detection.
file src-tauri/src/quick_capture/mod.rs rust L13 module src-tauri/src/quick_capture in0 t0 | Quick Capture module.
file src-tauri/src/quick_capture/shortcuts.rs rust L79 module src-tauri/src/quick_capture in1 t0 t:inline | Global-shortcut intent registry.
file src-tauri/src/quick_capture/source.rs rust L344 module src-tauri/src/quick_capture in2 t0 t:inline | Frontmost-app source helpers.
## public
sym src-tauri/src/quick_capture/clipboard.rs:60 struct SystemClipboard L1 | Real backend, backed by `arboard`.
sym src-tauri/src/quick_capture/clipboard.rs:63 method SystemClipboard::new() -> Self L3
sym src-tauri/src/quick_capture/commands.rs:31 const COMPOSER_WINDOW_LABEL L1 | Tauri label of the composer popover window.
sym src-tauri/src/quick_capture/commands.rs:39 struct LastCaptureSignature L1 | Session-only memory of the most recently captured clipboard signature.
sym src-tauri/src/quick_capture/commands.rs:75 fn capture_clipboard_now_with(clipboard: &dyn Clipboard, captured_at: String, context: CaptureContext, last_signature: &mut Option<String>,) -> Resu… L39 | Pure helper: read the clipboard via the injected adapter, decide the kind(s), materialize any in-memory shot bytes to a temp file, and serialize each result in…
sym src-tauri/src/quick_capture/commands.rs:173 cmd import_staged_shot(source: String, dest_dir: String, vault_path: String,) -> Result<String, String> L7 | Tauri command: move a clipboard screenshot that `materialize_input` staged in the OS temp dir into `dest_dir` inside the vault, so the capture note embeds a fi…
sym src-tauri/src/quick_capture/commands.rs:348 cmd capture_clipboard_now(app: tauri::AppHandle<R>, last_signature: tauri::State<'_, LastCaptureSignature>,) -> Result<(), String> L16 | Tauri command: read the system clipboard, detect kind(s), stamp the live frontmost-app context (bundle id + browser tab when applicable), and emit one `qc:capt…
sym src-tauri/src/quick_capture/commands.rs:393 fn show_composer(app: &tauri::AppHandle<R>) L16 | Show the composer popover window and emit `qc:open-composer` so the route resets its focus state.
sym src-tauri/src/quick_capture/commands.rs:413 cmd open_composer(app: tauri::AppHandle<R>) -> Result<(), String> L4 | Tauri command counterpart of `show_composer`.
sym src-tauri/src/quick_capture/commands.rs:422 cmd dismiss_composer(app: tauri::AppHandle<R>) -> Result<(), String> L10 | Hide the composer popover.
sym src-tauri/src/quick_capture/commands.rs:469 cmd submit_composer_capture(app: tauri::AppHandle<R>, text: String, request_id: String,) -> Result<(), String> L18 | Composer-side save path.
sym src-tauri/src/quick_capture/commands.rs:505 cmd report_composer_capture_result(app: tauri::AppHandle<R>, request_id: String, ok: bool,) -> Result<(), String> L11 | Main-window side of the composer round trip: relays the outcome of a composer capture to the composer window, which keeps its text until it hears `ok`.
sym src-tauri/src/quick_capture/shortcuts.rs:14 enum ShortcutId L4 | Closed set of shortcut intents wired in this merge.
sym src-tauri/src/quick_capture/shortcuts.rs:21 struct ShortcutBinding L4 | One row in the registry: which accelerator triggers it.
sym src-tauri/src/quick_capture/shortcuts.rs:28 fn default_registry() -> Vec<ShortcutBinding> L12 | Default Phase 1 registry.
sym src-tauri/src/quick_capture/source.rs:36 struct PrevFrontmostPid L1 | Tauri-managed PID of the macOS app that was frontmost when the composer was last summoned. -1 means "no recorded frontmost".
sym src-tauri/src/quick_capture/source.rs:39 method PrevFrontmostPid::new() -> Self L3
sym src-tauri/src/quick_capture/source.rs:123 fn frontmost_bundle_id() -> Option<String> L20 | Read the bundle identifier of whatever macOS app is currently frontmost.
sym src-tauri/src/quick_capture/source.rs:184 fn resolve_context_for_bundle(bundle_id: Option<&str>) -> CaptureContext L18 | Build a `CaptureContext` from a macOS bundle id.
## effects
fx-count rust-fs.OpenOptions::new 1
fx-count rust-fs.remove_file 2
fx-count rust-fs.write 1
fx-count rust-spawn.spawn 1
fx-count rust-timer.sleep 1
## debt
-
