# file card src/lib/core/vault/vault.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/vault/vault.logic.ts ' codemap/files
file src/lib/core/vault/vault.logic.ts logic L32 module src/lib/core/vault in1 t1
## imports
imp src/lib/core/vault/vault.logic.ts:1 -> src/lib/utils/path.ts basename
## imported-by
imp src/lib/core/vault/vault.store.svelte.ts:1 -> src/lib/core/vault/vault.logic.ts extractVaultName,updateRecentVaults,type:RecentVault
## reach
in2 src/lib/core/vault/vault.logic.ts 83 files in 34 modules: src/lib/app(8) src/lib/features/rail-shell(6) src/lib/features/properties(5) src/lib/features/todoist-sync(5) src/lib/core/filesystem(4) +29 modules: q impact src/lib/core/vault/vault.logic.ts --depth 2
out2 src/lib/core/vault/vault.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/vault/vault.logic.test.ts imports src/lib/core/vault/vault.logic.ts mirror
## symbols
sym src/lib/core/vault/vault.logic.ts:4 interface RecentVault L8 | Entry in the "recent vaults" list persisted to localStorage
by src/lib/core/vault/vault.logic.ts:RecentVault <- src/lib/core/vault/vault.store.svelte.ts:1 in (module) import
sym src/lib/core/vault/vault.logic.ts:16 fn extractVaultName(path: string): string L3 | Extracts the vault name from its path (e.g. "/Users/me/notes" → "notes")
by src/lib/core/vault/vault.logic.ts:extractVaultName <- src/lib/core/vault/vault.store.svelte.ts:81 in vaultStore.open call
sym src/lib/core/vault/vault.logic.ts:24 fn updateRecentVaults(current: RecentVault[], path: string, name: string, now: number = Date.now()): RecentVault[] L9 | Adds or bumps a vault to the top of the recent list, capping at MAX_RECENT_VAULTS.
by src/lib/core/vault/vault.logic.ts:updateRecentVaults <- src/lib/core/vault/vault.store.svelte.ts:85 in vaultStore.open call
## calls
call src/lib/core/vault/vault.logic.ts:17 in extractVaultName -> src/lib/utils/path.ts:basename call
