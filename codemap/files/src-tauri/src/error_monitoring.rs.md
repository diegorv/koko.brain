# file card src-tauri/src/error_monitoring.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/error_monitoring.rs ' codemap/files
file src-tauri/src/error_monitoring.rs rust L66 module src-tauri/src in2 t1
## imported-by
imp src-tauri/src/commands/sentry.rs:3 -> src-tauri/src/error_monitoring.rs configure_sentry,SentryState
imp src-tauri/src/lib.rs:34 -> src-tauri/src/error_monitoring.rs SentryState
## reach
in2 src-tauri/src/error_monitoring.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/error_monitoring.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/error_monitoring_test.rs imports src-tauri/src/error_monitoring.rs
## symbols
sym src-tauri/src/error_monitoring.rs:5 struct SentryState L3 | Holds the Rust Sentry client for as long as the active vault allows reporting.
by src-tauri/src/error_monitoring.rs:SentryState <- src-tauri/src/commands/sentry.rs:8 in configure_sentry ref
by src-tauri/src/error_monitoring.rs:SentryState <- src-tauri/src/lib.rs:321 in run lexical
sym src-tauri/src/error_monitoring.rs:18 fn is_sentry_active(state: &SentryState) -> Result<bool, String> L4 | Returns whether a Rust Sentry client is active for the current process.
sym src-tauri/src/error_monitoring.rs:26 fn configure_sentry(state: &SentryState, enabled: bool, dsn: String, release: String,) -> Result<(), String> L41 | Configures Rust error and panic reporting for the current vault.
by src-tauri/src/error_monitoring.rs:configure_sentry <- src-tauri/src/commands/sentry.rs:13 in configure_sentry lexical
## locals
local src-tauri/src/error_monitoring.rs:10 fn SentryState::default() -> Self L5
