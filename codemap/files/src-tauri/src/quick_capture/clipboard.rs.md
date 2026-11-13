# file card src-tauri/src/quick_capture/clipboard.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/quick_capture/clipboard.rs ' codemap/files
file src-tauri/src/quick_capture/clipboard.rs rust L206 module src-tauri/src/quick_capture in3 t0 t:inline | Clipboard adapter.
## imported-by
imp src-tauri/src/lib.rs:23 -> src-tauri/src/quick_capture/clipboard.rs SystemClipboard
imp src-tauri/src/quick_capture/commands.rs:22 -> src-tauri/src/quick_capture/clipboard.rs Clipboard,SystemClipboard
imp src-tauri/src/quick_capture/kind_detect.rs:22 -> src-tauri/src/quick_capture/clipboard.rs ClipboardSnapshot
## reach
in2 src-tauri/src/quick_capture/clipboard.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/quick_capture/clipboard.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/quick_capture/clipboard.rs:21 enum ClipboardSnapshot L5 | What `Clipboard::read` returns.
by src-tauri/src/quick_capture/clipboard.rs:ClipboardSnapshot <- src-tauri/src/quick_capture/kind_detect.rs:79 in decide ref +3
sym src-tauri/src/quick_capture/clipboard.rs:28 enum ClipboardError L9
sym src-tauri/src/quick_capture/clipboard.rs:53 trait Clipboard L3 | Adapter trait.
by src-tauri/src/quick_capture/clipboard.rs:Clipboard <- src-tauri/src/quick_capture/commands.rs:76 in capture_clipboard_now_with ref
sym src-tauri/src/quick_capture/clipboard.rs:60 struct SystemClipboard L1 | Real backend, backed by `arboard`.
by src-tauri/src/quick_capture/clipboard.rs:SystemClipboard <- src-tauri/src/lib.rs:71 in dispatch_shortcut lexical
by src-tauri/src/quick_capture/clipboard.rs:SystemClipboard <- src-tauri/src/quick_capture/commands.rs:356 in capture_clipboard_now lexical
sym src-tauri/src/quick_capture/clipboard.rs:63 method SystemClipboard::new() -> Self L3
by src-tauri/src/quick_capture/clipboard.rs:SystemClipboard::new <- src-tauri/src/lib.rs:71 in dispatch_shortcut lexical
by src-tauri/src/quick_capture/clipboard.rs:SystemClipboard::new <- src-tauri/src/quick_capture/commands.rs:356 in capture_clipboard_now lexical
sym src-tauri/src/quick_capture/clipboard.rs:143 struct FakeClipboard L3 | Test-support fake.
sym src-tauri/src/quick_capture/clipboard.rs:148 method FakeClipboard::with(snapshot: Result<ClipboardSnapshot, ClipboardError>) -> Self L5
## locals
local src-tauri/src/quick_capture/clipboard.rs:39 fn ClipboardError::fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result L9
local src-tauri/src/quick_capture/clipboard.rs:69 fn SystemClipboard::default() -> Self L3
local src-tauri/src/quick_capture/clipboard.rs:75 fn SystemClipboard::read(&self) -> Result<ClipboardSnapshot, ClipboardError> L39
local src-tauri/src/quick_capture/clipboard.rs:118 fn image_to_png_snapshot(img: arboard::ImageData<'_>,) -> Result<ClipboardSnapshot, ClipboardError> L19
local src-tauri/src/quick_capture/clipboard.rs:156 fn FakeClipboard::read(&self) -> Result<ClipboardSnapshot, ClipboardError> L7
## calls
call src-tauri/src/quick_capture/clipboard.rs:70 in SystemClipboard::default -> src-tauri/src/quick_capture/clipboard.rs:SystemClipboard::new call
call src-tauri/src/quick_capture/clipboard.rs:93 in SystemClipboard::read -> src-tauri/src/quick_capture/clipboard.rs:image_to_png_snapshot call
