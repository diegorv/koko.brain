# module card src-tauri/src
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src-tauri/src ' codemap/modules
module src-tauri/src rust files 4 in-modules 2 out-modules 5 pub 8/13 ipc 0/0 card ~0.9k
## neighbors
dep src-tauri/src/commands -> src-tauri/src 4
dep src-tauri/src/quick_capture -> src-tauri/src 1
dep src-tauri/src -> src-tauri/src/commands 13
dep src-tauri/src -> src-tauri/src/db 1
dep src-tauri/src -> src-tauri/src/quick_capture 4
dep src-tauri/src -> src-tauri/src/utils 1
dep src-tauri/src -> src-tauri/src/vault 2
in2 src-tauri/src 0 modules: -
out2 src-tauri/src 2 modules: src-tauri/src/semantic(11) src-tauri/src/search(4)
## entry files
entry src-tauri/src/events.rs ext-in4 src-tauri/src/commands/semantic.rs src-tauri/src/commands/vault.rs src-tauri/src/commands/watcher.rs src-tauri/src/quick_capture/commands.rs
entry src-tauri/src/error_monitoring.rs ext-in1 src-tauri/src/commands/sentry.rs
## files
file src-tauri/src/error_monitoring.rs rust L66 module src-tauri/src in2 t1
file src-tauri/src/events.rs rust L38 module src-tauri/src in5 t1 | Every Tauri event name the backend emits.
file src-tauri/src/lib.rs rust L406 module src-tauri/src in1 t0
file src-tauri/src/main.rs rust L6 module src-tauri/src in0 t0
## public
sym src-tauri/src/error_monitoring.rs:5 struct SentryState L3 | Holds the Rust Sentry client for as long as the active vault allows reporting.
sym src-tauri/src/error_monitoring.rs:26 fn configure_sentry(state: &SentryState, enabled: bool, dsn: String, release: String,) -> Result<(), String> L41 | Configures Rust error and panic reporting for the current vault.
sym src-tauri/src/events.rs:7 const VAULT_INDEX_UPDATED_EVENT L1 | Emitted after every `VaultIndex` mutation with an `UpdateResult` payload.
sym src-tauri/src/events.rs:11 const VAULT_FILES_CHANGED_EVENT L1 | Emitted on every debounced burst of vault file changes.
sym src-tauri/src/events.rs:14 const SEMANTIC_INDEX_PROGRESS_EVENT L1 | Carries every `SemanticProgress` update (downloads and builds).
sym src-tauri/src/events.rs:29 const QC_CAPTURE_DETECTED_EVENT L1 | Delivers a detected clipboard capture to the frontend.
sym src-tauri/src/events.rs:34 const QC_OPEN_COMPOSER_EVENT L1 | Event the composer popover listens for to focus its editor after a show.
sym src-tauri/src/events.rs:38 const QC_COMPOSER_CAPTURE_RESULT_EVENT L1 | Carries a `ComposerCaptureResult`: whether the main window wrote the capture note of one composer submit.
## debt
-
