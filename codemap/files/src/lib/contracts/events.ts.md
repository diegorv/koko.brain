# file card src/lib/contracts/events.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/contracts/events.ts ' codemap/files
file src/lib/contracts/events.ts other L57 module src/lib/contracts in7 t1 | The typed Tauri event contract: one `EVENT_NAMES` entry per `*_EVENT` const in `src-tauri/src/events.rs`, and one `EventMap` entry per name with the payload Ru…
## imports
imp src/lib/contracts/events.ts:7 -> src/lib/contracts/index.ts type:ComposerCaptureResult,type:DebugLogPayload,type:SemanticProgress,type:UpdateResult,type:VaultFilesChangedPayload
## imported-by
imp src/lib/app/tauri-listeners.service.ts:3 -> src/lib/contracts/events.ts EVENT_NAMES
imp src/lib/contracts/ipc.ts:4 -> src/lib/contracts/events.ts type:EventMap
imp src/lib/core/filesystem/fs.watcher.ts:3 -> src/lib/contracts/events.ts EVENT_NAMES
imp src/lib/features/search/search.service.ts:2 -> src/lib/contracts/events.ts EVENT_NAMES
imp src/lib/plugins/quick-capture/quick-capture.service.ts:2 -> src/lib/contracts/events.ts EVENT_NAMES
imp src/lib/utils/debug.ts:2 -> src/lib/contracts/events.ts EVENT_NAMES
imp src/routes/composer/+page.svelte:6 -> src/lib/contracts/events.ts EVENT_NAMES
## reach
in2 src/lib/contracts/events.ts 79 files in 34 modules: src/lib/core/settings(9) src/lib/features/todoist-sync(8) src/lib/app(7) src/lib/core/filesystem(4) src/lib/features/rail-shell(4) +29 modules: q impact src/lib/contracts/events.ts --depth 2
out2 src/lib/contracts/events.ts 52 files in 1 modules: src/lib/contracts(52)
## tests
test src/tests/lib/contracts/events-parity.test.ts imports src/lib/contracts/events.ts mirror
test e2e/mocks/tauri-core.ts imports-type src/lib/contracts/events.ts
test e2e/mocks/tauri-event.ts imports-type src/lib/contracts/events.ts
test src/tests/lib/contracts/ipc.test.ts imports-type src/lib/contracts/events.ts
## symbols
sym src/lib/contracts/events.ts:16 const EVENT_NAMES L11 | Every event name Rust emits, keyed by its Rust const name minus `_EVENT`.
by src/lib/contracts/events.ts:EVENT_NAMES <- src/lib/app/tauri-listeners.service.ts:28 in registerMenuSettingsListener member +2
by src/lib/contracts/events.ts:EVENT_NAMES <- src/lib/core/filesystem/fs.watcher.ts:276 in startWatching member
by src/lib/contracts/events.ts:EVENT_NAMES <- src/lib/features/search/search.service.ts:85 in startSemanticProgressListener member
by src/lib/contracts/events.ts:EVENT_NAMES <- src/lib/plugins/quick-capture/quick-capture.service.ts:62 in registerQuickCaptureListener member
by src/lib/contracts/events.ts:EVENT_NAMES <- src/lib/utils/debug.ts:128 in startTauriDebugListener member
by src/lib/contracts/events.ts:EVENT_NAMES <- src/routes/composer/+page.svelte:214 in (script) member +1
sym src/lib/contracts/events.ts:29 type EventName L1 | A Rust-emitted event name.
sym src/lib/contracts/events.ts:32 interface EventMap L26 | The payload of each event, as it arrives in JS.
by src/lib/contracts/events.ts:EventMap <- src/lib/contracts/ipc.ts:4 in (module) import
