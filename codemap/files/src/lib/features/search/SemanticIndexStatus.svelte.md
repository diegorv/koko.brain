# file card src/lib/features/search/SemanticIndexStatus.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/SemanticIndexStatus.svelte ' codemap/files
file src/lib/features/search/SemanticIndexStatus.svelte component L69 module src/lib/features/search in1 t1
## imports
imp src/lib/features/search/SemanticIndexStatus.svelte:6 -> src/lib/contracts/ipc.ts call
imp src/lib/features/search/SemanticIndexStatus.svelte:7 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/search/SemanticIndexStatus.svelte:8 -> src/lib/core/editor/editor.logic.ts isVirtualTab
imp src/lib/features/search/SemanticIndexStatus.svelte:9 -> src/lib/core/editor/editor.hooks.ts addAfterSaveObserver
imp src/lib/features/search/SemanticIndexStatus.svelte:10 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/search/SemanticIndexStatus.svelte:11 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SemanticIndexStatus.svelte:12 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/search/SemanticIndexStatus.svelte:13 -> src/lib/features/search/semantic-index-status.logic.ts toVaultRelativePath,isMarkdownPath,resolveStatusLabel,type:SemanticFileStatus
## imported-by
imp src/lib/app/AppShell.svelte:52 -> src/lib/features/search/SemanticIndexStatus.svelte default
## reach
in2 src/lib/features/search/SemanticIndexStatus.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/search/SemanticIndexStatus.svelte 13 files in 7 modules: src/lib/contracts(3) src/lib/core/settings(3) src/lib/utils(3) src/lib/core/editor(1) src/lib/core/filesystem(1) +2 modules
## tests
test src/tests/lib/features/search/SemanticIndexStatus.test.ts imports src/lib/features/search/SemanticIndexStatus.svelte mirror
## symbols
sym src/lib/features/search/SemanticIndexStatus.svelte:1 component SemanticIndexStatus L69
by src/lib/features/search/SemanticIndexStatus.svelte:default <- src/lib/app/AppShell.svelte:305 in (markup) mount
## mounted-at
mount src/lib/app/AppShell.svelte:305 SemanticIndexStatus -> src/lib/features/search/SemanticIndexStatus.svelte
## calls
call src/lib/features/search/SemanticIndexStatus.svelte:23 in (script) -> src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver call
call src/lib/features/search/SemanticIndexStatus.svelte:31 in $effect@29 -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/lib/features/search/SemanticIndexStatus.svelte:32 in $effect@29 -> src/lib/features/search/semantic-index-status.logic.ts:toVaultRelativePath call
call src/lib/features/search/SemanticIndexStatus.svelte:38 in $effect@29 -> src/lib/features/search/semantic-index-status.logic.ts:isMarkdownPath call
call src/lib/features/search/SemanticIndexStatus.svelte:44 in $effect@29 -> src/lib/contracts/ipc.ts:call call
call src/lib/features/search/SemanticIndexStatus.svelte:55 in label=$derived -> src/lib/features/search/semantic-index-status.logic.ts:resolveStatusLabel call
## effects
reg src/lib/features/search/SemanticIndexStatus.svelte:23 src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver in (script) args=(filePath) => { if (filePath === editorStore.activeTab?.path) { saveBump++; } }
fx src/lib/features/search/SemanticIndexStatus.svelte:29 svelte.$effect in (script)
ipc-call src/lib/features/search/SemanticIndexStatus.svelte:44 in $effect@29 -> ipc:get_semantic_file_status -> src-tauri/src/commands/semantic.rs:1235
