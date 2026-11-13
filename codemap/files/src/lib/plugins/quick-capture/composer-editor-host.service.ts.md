# file card src/lib/plugins/quick-capture/composer-editor-host.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/quick-capture/composer-editor-host.service.ts ' codemap/files
file src/lib/plugins/quick-capture/composer-editor-host.service.ts service L71 module src/lib/plugins/quick-capture in1 t1
## imports
imp src/lib/plugins/quick-capture/composer-editor-host.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/plugins/quick-capture/composer-editor-host.service.ts:2 -> src/lib/core/filesystem/file-entries.logic.ts type:FileEntry
imp src/lib/plugins/quick-capture/composer-editor-host.service.ts:3 -> src/lib/core/filesystem/wikilink-resolution.logic.ts getNoteName,isLinkTargetFile
imp src/lib/plugins/quick-capture/composer-editor-host.service.ts:4 -> src/lib/core/markdown-editor/editor-host.ts NOOP_HOST,type:EditorHost,type:LinkCandidates,type:VaultTag
## imported-by
imp src/routes/composer/+page.svelte:9 -> src/lib/plugins/quick-capture/composer-editor-host.service.ts createComposerEditorHost
## reach
in2 src/lib/plugins/quick-capture/composer-editor-host.service.ts 0 files in 0 modules: -
out2 src/lib/plugins/quick-capture/composer-editor-host.service.ts 6 files in 4 modules: src/lib/contracts(3) src/lib/core/filesystem(1) src/lib/types(1) src/lib/utils(1)
## tests
test src/tests/lib/plugins/quick-capture/composer-editor-host.service.test.ts imports src/lib/plugins/quick-capture/composer-editor-host.service.ts mirror
## symbols
sym src/lib/plugins/quick-capture/composer-editor-host.service.ts:7 interface ComposerEditorHost L4 | The composer's editor host, plus the per-summon reset of its reads.
sym src/lib/plugins/quick-capture/composer-editor-host.service.ts:24 fn createComposerEditorHost(): ComposerEditorHost L48 | The editor host of the composer popover.
by src/lib/plugins/quick-capture/composer-editor-host.service.ts:createComposerEditorHost <- src/routes/composer/+page.svelte:36 in host call
## calls
call src/lib/plugins/quick-capture/composer-editor-host.service.ts:30 in createComposerEditorHost -> src/lib/contracts/ipc.ts:call call +1
call src/lib/plugins/quick-capture/composer-editor-host.service.ts:43 in createComposerEditorHost -> src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile call
call src/lib/plugins/quick-capture/composer-editor-host.service.ts:46 in createComposerEditorHost -> src/lib/core/filesystem/wikilink-resolution.logic.ts:getNoteName call
## effects
ipc-call src/lib/plugins/quick-capture/composer-editor-host.service.ts:30 in createComposerEditorHost -> ipc:get_all_tags_v2 -> src-tauri/src/commands/vault.rs:638
ipc-call src/lib/plugins/quick-capture/composer-editor-host.service.ts:41 in createComposerEditorHost -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
