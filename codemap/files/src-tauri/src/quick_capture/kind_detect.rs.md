# file card src-tauri/src/quick_capture/kind_detect.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/quick_capture/kind_detect.rs ' codemap/files
file src-tauri/src/quick_capture/kind_detect.rs rust L355 module src-tauri/src/quick_capture in1 t0 t:inline | Pure kind detection.
## imports
imp src-tauri/src/quick_capture/kind_detect.rs:22 -> src-tauri/src/quick_capture/clipboard.rs ClipboardSnapshot
## imported-by
imp src-tauri/src/quick_capture/commands.rs:23 -> src-tauri/src/quick_capture/kind_detect.rs decide,CaptureInput,ShotSource
## reach
in2 src-tauri/src/quick_capture/kind_detect.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/quick_capture/kind_detect.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/quick_capture/kind_detect.rs:28 enum CaptureInput L21 | One detected capture.
by src-tauri/src/quick_capture/kind_detect.rs:CaptureInput <- src-tauri/src/quick_capture/commands.rs:45 in capture_signature ref +18
sym src-tauri/src/quick_capture/kind_detect.rs:51 enum ShotSource L7
by src-tauri/src/quick_capture/kind_detect.rs:ShotSource <- src-tauri/src/quick_capture/commands.rs:52 in capture_signature lexical +6
sym src-tauri/src/quick_capture/kind_detect.rs:60 enum KindDetectError L6
sym src-tauri/src/quick_capture/kind_detect.rs:79 fn decide(snapshot: ClipboardSnapshot) -> Result<Vec<CaptureInput>, KindDetectError> L9 | Decide which `CaptureInput`s a `ClipboardSnapshot` becomes.
by src-tauri/src/quick_capture/kind_detect.rs:decide <- src-tauri/src/quick_capture/commands.rs:82 in capture_clipboard_now_with lexical
## locals
local src-tauri/src/quick_capture/kind_detect.rs:68 fn KindDetectError::fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result L6
local src-tauri/src/quick_capture/kind_detect.rs:89 fn decide_text(raw: String) -> Result<CaptureInput, KindDetectError> L14
local src-tauri/src/quick_capture/kind_detect.rs:104 fn decide_files(paths: Vec<PathBuf>) -> Result<Vec<CaptureInput>, KindDetectError> L6
local src-tauri/src/quick_capture/kind_detect.rs:111 fn decide_one_path(path: PathBuf) -> CaptureInput L17
local src-tauri/src/quick_capture/kind_detect.rs:129 fn guess_mime(path: &Path) -> String L6
local src-tauri/src/quick_capture/kind_detect.rs:146 fn url_from_trimmed(trimmed: &str) -> Option<String> L28
## calls
call src-tauri/src/quick_capture/kind_detect.rs:81 in decide -> src-tauri/src/quick_capture/clipboard.rs:ClipboardSnapshot lexical +2
call src-tauri/src/quick_capture/kind_detect.rs:81 in decide -> src-tauri/src/quick_capture/kind_detect.rs:decide_text call
call src-tauri/src/quick_capture/kind_detect.rs:85 in decide -> src-tauri/src/quick_capture/kind_detect.rs:decide_files call
call src-tauri/src/quick_capture/kind_detect.rs:95 in decide_text -> src-tauri/src/quick_capture/kind_detect.rs:url_from_trimmed call
call src-tauri/src/quick_capture/kind_detect.rs:112 in decide_one_path -> src-tauri/src/quick_capture/kind_detect.rs:guess_mime call
