# file card src/lib/plugins/quick-capture/quick-capture.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/quick-capture/quick-capture.service.ts ' codemap/files
file src/lib/plugins/quick-capture/quick-capture.service.ts service L173 module src/lib/plugins/quick-capture in1 t1
## imports
imp src/lib/plugins/quick-capture/quick-capture.service.ts:2 -> src/lib/contracts/events.ts EVENT_NAMES
imp src/lib/plugins/quick-capture/quick-capture.service.ts:3 -> src/lib/contracts/ipc.ts call,on
imp src/lib/plugins/quick-capture/quick-capture.service.ts:4 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/quick-capture/quick-capture.service.ts:5 -> src/lib/features/deep-link/deep-link.service.ts executeAction
imp src/lib/plugins/quick-capture/quick-capture.service.ts:6 -> src/lib/features/deep-link/deep-link.types.ts type:CaptureAction,type:CaptureKind
imp src/lib/plugins/quick-capture/quick-capture.service.ts:7 -> src/lib/utils/debug.ts debug,error
## imported-by
imp src/routes/(app)/+layout.svelte:15 -> src/lib/plugins/quick-capture/quick-capture.service.ts registerQuickCaptureListener
## reach
in2 src/lib/plugins/quick-capture/quick-capture.service.ts 0 files in 0 modules: -
out2 src/lib/plugins/quick-capture/quick-capture.service.ts 16 files in 9 modules: src/lib/contracts(2) src/lib/core/editor(2) src/lib/core/filesystem(2) src/lib/core/note-creator(2) src/lib/core/settings(2) +4 modules
## tests
test src/tests/lib/plugins/quick-capture/quick-capture.service.test.ts imports src/lib/plugins/quick-capture/quick-capture.service.ts mirror
## symbols
sym src/lib/plugins/quick-capture/quick-capture.service.ts:17 interface QuickCaptureDetectedPayload L24 | Partial `CaptureAction` shape the Rust side (`quick_capture::commands` and the global-shortcut dispatcher in `lib.rs`) emits on `qc:capture-detected`, built wi…
sym src/lib/plugins/quick-capture/quick-capture.service.ts:51 fn registerQuickCaptureListener(): () => void L32 | Registers the Tauri event listener that routes a Rust-detected clipboard capture into kokobrain's `executeAction` pipeline.
by src/lib/plugins/quick-capture/quick-capture.service.ts:registerQuickCaptureListener <- src/routes/(app)/+layout.svelte:63 in $effect@62 call
sym src/lib/plugins/quick-capture/quick-capture.service.ts:91 fn handleDetectedCapture(payload: QuickCaptureDetectedPayload): Promise<void> L8 | Handles a single detected capture: fills `vault` from the active vault and dispatches via `executeAction`.
sym src/lib/plugins/quick-capture/quick-capture.service.ts:126 fn buildCaptureAction(payload: QuickCaptureDetectedPayload, vaultName: string): CaptureAction | null L48 | Assemble a typed `CaptureAction` from the Rust payload + the active vault name.
## locals
local src/lib/plugins/quick-capture/quick-capture.service.ts:101 fn dispatchCapture(payload: QuickCaptureDetectedPayload): Promise<boolean> L18
## calls
call src/lib/plugins/quick-capture/quick-capture.service.ts:62 in registerQuickCaptureListener -> src/lib/contracts/ipc.ts:on call
call src/lib/plugins/quick-capture/quick-capture.service.ts:64 in registerQuickCaptureListener -> src/lib/plugins/quick-capture/quick-capture.service.ts:handleDetectedCapture call
call src/lib/plugins/quick-capture/quick-capture.service.ts:67 in registerQuickCaptureListener -> src/lib/utils/debug.ts:error call +1
call src/lib/plugins/quick-capture/quick-capture.service.ts:94 in handleDetectedCapture -> src/lib/plugins/quick-capture/quick-capture.service.ts:dispatchCapture call
call src/lib/plugins/quick-capture/quick-capture.service.ts:96 in handleDetectedCapture -> src/lib/contracts/ipc.ts:call call
call src/lib/plugins/quick-capture/quick-capture.service.ts:105 in dispatchCapture -> src/lib/utils/debug.ts:error call +1
call src/lib/plugins/quick-capture/quick-capture.service.ts:110 in dispatchCapture -> src/lib/plugins/quick-capture/quick-capture.service.ts:buildCaptureAction call
call src/lib/plugins/quick-capture/quick-capture.service.ts:116 in dispatchCapture -> src/lib/utils/debug.ts:debug call
call src/lib/plugins/quick-capture/quick-capture.service.ts:117 in dispatchCapture -> src/lib/features/deep-link/deep-link.service.ts:executeAction call
## effects
ev src-tauri/src/lib.rs:81 in dispatch_shortcut -> event:qc:capture-detected -> src/lib/plugins/quick-capture/quick-capture.service.ts:62 in registerQuickCaptureListener
ev src-tauri/src/quick_capture/commands.rs:359 in capture_clipboard_now -> event:qc:capture-detected -> src/lib/plugins/quick-capture/quick-capture.service.ts:62 in registerQuickCaptureListener
ev src-tauri/src/quick_capture/commands.rs:484 in submit_composer_capture -> event:qc:capture-detected -> src/lib/plugins/quick-capture/quick-capture.service.ts:62 in registerQuickCaptureListener
ipc-call src/lib/plugins/quick-capture/quick-capture.service.ts:96 in handleDetectedCapture -> ipc:report_composer_capture_result -> src-tauri/src/quick_capture/commands.rs:505
