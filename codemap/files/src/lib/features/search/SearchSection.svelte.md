# file card src/lib/features/search/SearchSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/SearchSection.svelte ' codemap/files
file src/lib/features/search/SearchSection.svelte component L159 module src/lib/features/search in1 t1
## imports
imp src/lib/features/search/SearchSection.svelte:3 -> src/lib/contracts/ipc.ts call
imp src/lib/features/search/SearchSection.svelte:4 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/search/SearchSection.svelte:5 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/features/search/SearchSection.svelte:7 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/search/SearchSection.svelte:8 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/search/SearchSection.svelte:9 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SearchSection.svelte:10 -> src/lib/features/search/search.service.ts initSemanticSearch,buildSemanticIndex,startSemanticProgressListener,stopSemanticProgressListener
imp src/lib/features/search/SearchSection.svelte:16 -> src/lib/utils/debug.ts debug
imp src/lib/features/search/SearchSection.svelte:17 -> src/lib/core/settings/sections/SettingItem.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:8 -> src/lib/features/search/SearchSection.svelte default
## reach
in2 src/lib/features/search/SearchSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/search/SearchSection.svelte 16 files in 8 modules: src/lib/core/settings(4) src/lib/features/search(3) src/lib/components(2) src/lib/contracts(2) src/lib/utils(2) +3 modules
## tests
test src/tests/lib/core/settings/settings-copy.test.ts imports src/lib/features/search/SearchSection.svelte
## symbols
sym src/lib/features/search/SearchSection.svelte:1 component SearchSection L159
by src/lib/features/search/SearchSection.svelte:default <- src/lib/app/SettingsPanel.svelte:79 in sectionComponents ref
## locals
local src/lib/features/search/SearchSection.svelte:25 fn refreshRerankerStatus() L9
local src/lib/features/search/SearchSection.svelte:39 fn handleRerankerDownload() L16
local src/lib/features/search/SearchSection.svelte:56 fn handleToggle(enabled: boolean) L40
## mounts
mount src/lib/features/search/SearchSection.svelte:101 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/search/SearchSection.svelte:105 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/search/SearchSection.svelte:133 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/search/SearchSection.svelte:140 Button -> src/lib/components/ui/button/button.svelte
## calls
call src/lib/features/search/SearchSection.svelte:29 in refreshRerankerStatus -> src/lib/contracts/ipc.ts:call call
call src/lib/features/search/SearchSection.svelte:31 in refreshRerankerStatus -> src/lib/utils/debug.ts:debug call
call src/lib/features/search/SearchSection.svelte:36 in $effect@35 -> src/lib/features/search/SearchSection.svelte:refreshRerankerStatus call
call src/lib/features/search/SearchSection.svelte:45 in handleRerankerDownload -> src/lib/features/search/search.service.ts:startSemanticProgressListener call
call src/lib/features/search/SearchSection.svelte:46 in handleRerankerDownload -> src/lib/contracts/ipc.ts:call call
call src/lib/features/search/SearchSection.svelte:49 in handleRerankerDownload -> src/lib/utils/debug.ts:debug call
call src/lib/features/search/SearchSection.svelte:57 in handleToggle -> src/lib/utils/debug.ts:debug call +8
call src/lib/features/search/SearchSection.svelte:58 in handleToggle -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateSearch mcall +1
call src/lib/features/search/SearchSection.svelte:66 in handleToggle -> src/lib/features/search/search.service.ts:startSemanticProgressListener call
call src/lib/features/search/SearchSection.svelte:68 in handleToggle -> src/lib/contracts/ipc.ts:call call +1
call src/lib/features/search/SearchSection.svelte:79 in handleToggle -> src/lib/features/search/search.service.ts:initSemanticSearch call
call src/lib/features/search/SearchSection.svelte:82 in handleToggle -> src/lib/features/search/search.service.ts:buildSemanticIndex call
call src/lib/features/search/SearchSection.svelte:93 in handleToggle -> src/lib/features/search/search.service.ts:stopSemanticProgressListener call
call src/lib/features/search/SearchSection.svelte:108 in (markup) -> src/lib/features/search/SearchSection.svelte:handleToggle markup
call src/lib/features/search/SearchSection.svelte:140 in (markup) -> src/lib/features/search/SearchSection.svelte:handleRerankerDownload markup
## effects
ipc-call src/lib/features/search/SearchSection.svelte:29 in refreshRerankerStatus -> ipc:is_reranker_model_available -> src-tauri/src/commands/semantic.rs:406
fx src/lib/features/search/SearchSection.svelte:35 svelte.$effect in (script)
ipc-call src/lib/features/search/SearchSection.svelte:46 in handleRerankerDownload -> ipc:download_reranker_model -> src-tauri/src/commands/semantic.rs:422
ipc-call src/lib/features/search/SearchSection.svelte:68 in handleToggle -> ipc:is_semantic_model_available -> src-tauri/src/commands/semantic.rs:399
ipc-call src/lib/features/search/SearchSection.svelte:74 in handleToggle -> ipc:download_semantic_model -> src-tauri/src/commands/semantic.rs:452
