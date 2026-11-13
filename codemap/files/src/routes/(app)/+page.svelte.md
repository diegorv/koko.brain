# file card src/routes/(app)/+page.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/routes/(app)/+page.svelte ' codemap/files
file src/routes/(app)/+page.svelte component L72 module src/routes in0 t0
## imports
imp src/routes/(app)/+page.svelte:2 -> src/lib/components/ui/button/index.ts Button
imp src/routes/(app)/+page.svelte:3 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/routes/(app)/+page.svelte:4 -> src/lib/core/vault/vault.service.ts openVaultDialog,openRecentVault
imp src/routes/(app)/+page.svelte:5 -> src/lib/core/settings/BuildInfo.svelte default
## reach
in2 src/routes/(app)/+page.svelte 0 files in 0 modules: -
out2 src/routes/(app)/+page.svelte 7 files in 4 modules: src/lib/core/vault(3) src/lib/utils(2) src/lib/components(1) src/lib/core/editor(1)
## symbols
sym src/routes/(app)/+page.svelte:1 component +page L72
## locals
local src/routes/(app)/+page.svelte:12 fn handleOpenVault() L3
local src/routes/(app)/+page.svelte:16 fn handleOpenRecent(path: string) L3
local src/routes/(app)/+page.svelte:20 fn handleRemoveRecent(path: string) L3
## mounts
mount src/routes/(app)/+page.svelte:31 Button -> src/lib/components/ui/button/button.svelte
mount src/routes/(app)/+page.svelte:70 BuildInfo -> src/lib/core/settings/BuildInfo.svelte
## calls
call src/routes/(app)/+page.svelte:13 in handleOpenVault -> src/lib/core/vault/vault.service.ts:openVaultDialog call
call src/routes/(app)/+page.svelte:17 in handleOpenRecent -> src/lib/core/vault/vault.service.ts:openRecentVault call
call src/routes/(app)/+page.svelte:21 in handleRemoveRecent -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.removeRecent mcall
call src/routes/(app)/+page.svelte:31 in (markup) -> src/routes/(app)/+page.svelte:handleOpenVault markup
call src/routes/(app)/+page.svelte:51 in (markup) -> src/routes/(app)/+page.svelte:handleOpenRecent markup
call src/routes/(app)/+page.svelte:60 in (markup) -> src/routes/(app)/+page.svelte:handleRemoveRecent markup
