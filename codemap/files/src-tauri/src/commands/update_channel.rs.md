# file card src-tauri/src/commands/update_channel.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/commands/update_channel.rs ' codemap/files
file src-tauri/src/commands/update_channel.rs rust L177 module src-tauri/src/commands in1 t1 t:inline | Channel-aware in-app updater commands.
## imported-by
imp src-tauri/src/lib.rs:390 -> src-tauri/src/commands/update_channel.rs check_for_update_on_channel
## reach
in2 src-tauri/src/commands/update_channel.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/commands/update_channel.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/commands/update_channel_test.rs imports src-tauri/src/commands/update_channel.rs
## symbols
sym src-tauri/src/commands/update_channel.rs:25 const STABLE_ENDPOINT L2 | Stable channel `latest.json` URL.
sym src-tauri/src/commands/update_channel.rs:31 const NIGHTLY_ENDPOINT L2 | Nightly channel `latest.json` URL.
sym src-tauri/src/commands/update_channel.rs:40 fn endpoint_for_channel(channel: &str) -> &'static str L6 | Map a channel name to its `latest.json` URL.
sym src-tauri/src/commands/update_channel.rs:57 struct UpdateMetadata L15 dto:UpdateMetadata | Metadata for an available update, returned to the frontend.
sym src-tauri/src/commands/update_channel.rs:88 cmd check_for_update_on_channel(webview: Webview<R>, channel: String, allow_downgrades: Option<bool>,) -> Result<Option<UpdateMetadata>, String> L42 | Check for an available update on the given release channel.
by src-tauri/src/commands/update_channel.rs:check_for_update_on_channel <- src-tauri/src/lib.rs:390 in run import
## calls
call src-tauri/src/commands/update_channel.rs:93 in check_for_update_on_channel -> src-tauri/src/commands/update_channel.rs:endpoint_for_channel call
## ipc-in
ipc-call src/lib/core/settings/sections/UpdateSection.svelte:150 in checkForUpdates -> ipc:check_for_update_on_channel -> src-tauri/src/commands/update_channel.rs:88
ipc-call src/lib/core/settings/update-check.service.ts:24 in maybeAutoCheckForUpdates -> ipc:check_for_update_on_channel -> src-tauri/src/commands/update_channel.rs:88
