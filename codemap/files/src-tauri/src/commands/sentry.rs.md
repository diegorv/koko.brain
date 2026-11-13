# file card src-tauri/src/commands/sentry.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/commands/sentry.rs ' codemap/files
file src-tauri/src/commands/sentry.rs rust L14 module src-tauri/src/commands in1 t0
## imports
imp src-tauri/src/commands/sentry.rs:3 -> src-tauri/src/error_monitoring.rs configure_sentry,SentryState
## imported-by
imp src-tauri/src/lib.rs:388 -> src-tauri/src/commands/sentry.rs configure_sentry
## reach
in2 src-tauri/src/commands/sentry.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/commands/sentry.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/commands/sentry.rs:7 cmd configure_sentry(state: State<'_, SentryState>, enabled: bool, dsn: String, release: String,) -> Result<(), String> L8 | Enables or disables Rust error and panic reporting for the active vault.
by src-tauri/src/commands/sentry.rs:configure_sentry <- src-tauri/src/lib.rs:388 in run import
## calls
call src-tauri/src/commands/sentry.rs:13 in configure_sentry -> src-tauri/src/error_monitoring.rs:configure_sentry lexical
## ipc-in
ipc-call src/lib/core/settings/sentry.service.ts:50 in applySentryConfiguration -> ipc:configure_sentry -> src-tauri/src/commands/sentry.rs:7
