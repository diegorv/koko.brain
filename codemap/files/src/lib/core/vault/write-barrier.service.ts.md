# file card src/lib/core/vault/write-barrier.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/vault/write-barrier.service.ts ' codemap/files
file src/lib/core/vault/write-barrier.service.ts service L41 module src/lib/core/vault in3 t3
## imports
imp src/lib/core/vault/write-barrier.service.ts:1 -> src/lib/utils/debug.ts debug
## imported-by
imp src/lib/app/boot.ts:6 -> src/lib/core/vault/write-barrier.service.ts registerWriteBarrier
imp src/lib/core/vault/exit.service.ts:4 -> src/lib/core/vault/write-barrier.service.ts drainPendingWrites
imp src/lib/core/vault/vault.service.ts:8 -> src/lib/core/vault/write-barrier.service.ts drainPendingWrites
## reach
in2 src/lib/core/vault/write-barrier.service.ts 5 files in 4 modules: src/routes(2) src/lib/app(1) src/lib/core/settings(1) src/lib/features/deep-link(1)
out2 src/lib/core/vault/write-barrier.service.ts 5 files in 3 modules: src/lib/contracts(2) src/lib/core/settings(2) src/lib/utils(1)
## tests
test src/tests/lib/core/vault/write-barrier.service.test.ts imports src/lib/core/vault/write-barrier.service.ts mirror
test src/tests/lib/app/tauri-listeners.service.test.ts imports src/lib/core/vault/write-barrier.service.ts
test src/tests/lib/core/vault/exit.service.test.ts imports src/lib/core/vault/write-barrier.service.ts
## symbols
sym src/lib/core/vault/write-barrier.service.ts:23 fn registerWriteBarrier(name: string, drain: () => Promise<void>): () => void L9 | Registers a source of in-flight writes for `drainPendingWrites` to wait on.
by src/lib/core/vault/write-barrier.service.ts:registerWriteBarrier <- src/lib/app/boot.ts:42 in registerAppPorts call
sym src/lib/core/vault/write-barrier.service.ts:37 fn drainPendingWrites(): Promise<void> L5 | Waits for every registered barrier, one after another.
by src/lib/core/vault/write-barrier.service.ts:drainPendingWrites <- src/lib/core/vault/exit.service.ts:17 in prepareForExit call
by src/lib/core/vault/write-barrier.service.ts:drainPendingWrites <- src/lib/core/vault/vault.service.ts:24 in switchVault call
## calls
call src/lib/core/vault/write-barrier.service.ts:26 in registerWriteBarrier -> src/lib/utils/debug.ts:debug call
