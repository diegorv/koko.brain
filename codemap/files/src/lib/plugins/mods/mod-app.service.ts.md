# file card src/lib/plugins/mods/mod-app.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/mod-app.service.ts ' codemap/files
file src/lib/plugins/mods/mod-app.service.ts service L94 module src/lib/plugins/mods in1 t1
## imports
imp src/lib/plugins/mods/mod-app.service.ts:1 -> src/lib/core/editor/editor.service.ts openFileInEditor,saveFileByPath,syncExternalContentToEditor
imp src/lib/plugins/mods/mod-app.service.ts:2 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/plugins/mods/mod-app.service.ts:3 -> src/lib/core/editor/open-note-at.service.ts openNoteAt
imp src/lib/plugins/mods/mod-app.service.ts:4 -> src/lib/core/frontmatter/frontmatter-write.service.ts updateNoteFrontmatter
imp src/lib/plugins/mods/mod-app.service.ts:5 -> src/lib/core/note-creator/note-creator.service.ts openOrCreateNote
imp src/lib/plugins/mods/mod-app.service.ts:6 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/plugins/mods/mod-app.service.ts:7 -> src/lib/core/vault/vault-entries.service.ts getVaultEntries
imp src/lib/plugins/mods/mod-app.service.ts:8 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/mods/mod-app.service.ts:9 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/plugins/mods/mod-app.service.ts:10 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/plugins/mods/mod-app.service.ts:11 -> src/lib/features/type-definitions/type-definitions.service.ts createTypedNote
imp src/lib/plugins/mods/mod-app.service.ts:12 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/plugins/mods/mod-app.service.ts:14 -> src/lib/plugins/queryjs/kb-api.ts KBAPI
imp src/lib/plugins/mods/mod-app.service.ts:15 -> src/lib/plugins/queryjs/queryjs.service.ts loadExternalScript
imp src/lib/plugins/mods/mod-app.service.ts:17 -> src/lib/plugins/one-on-one/one-on-one.service.ts createOneOnOneNote,openOneOnOnePicker
imp src/lib/plugins/mods/mod-app.service.ts:19 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts dailyNotePath,openOrCreateDailyNote
imp src/lib/plugins/mods/mod-app.service.ts:20 -> src/lib/plugins/mods/mod-commands.store.svelte.ts modCommandsStore
## imported-by
imp src/lib/plugins/mods/mods-host.service.ts:21 -> src/lib/plugins/mods/mod-app.service.ts createModKb,MOD_APP,type:ModApp
## reach
in2 src/lib/plugins/mods/mod-app.service.ts 3 files in 2 modules: src/lib/app(2) src/lib/plugins/mods(1)
out2 src/lib/plugins/mods/mod-app.service.ts 45 files in 18 modules: src/lib/utils(8) src/lib/plugins/queryjs(6) src/lib/core/filesystem(4) src/lib/core/settings(4) src/lib/features/type-definitions(4) +13 modules
## tests
test src/tests/lib/plugins/mods/mod-app.service.test.ts imports src/lib/plugins/mods/mod-app.service.ts mirror
## symbols
sym src/lib/plugins/mods/mod-app.service.ts:26 const MOD_APP L43 | The app's own objects a mod reaches through `ctx.app`: the live objects, not copies or wrappers.
by src/lib/plugins/mods/mod-app.service.ts:MOD_APP <- src/lib/plugins/mods/mods-host.service.ts:708 in createModContext ref
sym src/lib/plugins/mods/mod-app.service.ts:71 type ModApp L1 | Type of `ctx.app`
by src/lib/plugins/mods/mod-app.service.ts:ModApp <- src/lib/plugins/mods/mods-host.service.ts:21 in (module) import
sym src/lib/plugins/mods/mod-app.service.ts:80 fn createModKb(vaultPath: string, assertLive: () => void): Promise<KBAPI> L15 | Builds a new QueryJS `KBAPI` over a fresh vault entries snapshot, the way a QueryJS block builds one (`queryjs-block-widget.ts`).
by src/lib/plugins/mods/mod-app.service.ts:createModKb <- src/lib/plugins/mods/mods-host.service.ts:241 in createModContext call
## calls
call src/lib/plugins/mods/mod-app.service.ts:30 in MOD_APP -> src/lib/core/editor/editor.service.ts:openFileInEditor ref
call src/lib/plugins/mods/mod-app.service.ts:32 in MOD_APP -> src/lib/core/editor/open-note-at.service.ts:openNoteAt ref
call src/lib/plugins/mods/mod-app.service.ts:36 in MOD_APP -> src/lib/features/type-definitions/type-definitions.service.ts:createTypedNote ref
call src/lib/plugins/mods/mod-app.service.ts:38 in MOD_APP -> src/lib/plugins/one-on-one/one-on-one.service.ts:createOneOnOneNote ref
call src/lib/plugins/mods/mod-app.service.ts:43 in MOD_APP -> src/lib/plugins/one-on-one/one-on-one.service.ts:openOneOnOnePicker ref
call src/lib/plugins/mods/mod-app.service.ts:45 in MOD_APP -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:dailyNotePath ref
call src/lib/plugins/mods/mod-app.service.ts:47 in MOD_APP -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreateDailyNote ref
call src/lib/plugins/mods/mod-app.service.ts:53 in MOD_APP -> src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter ref
call src/lib/plugins/mods/mod-app.service.ts:63 in MOD_APP -> src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote ref
call src/lib/plugins/mods/mod-app.service.ts:65 in MOD_APP -> src/lib/core/editor/editor.service.ts:saveFileByPath ref
call src/lib/plugins/mods/mod-app.service.ts:67 in MOD_APP -> src/lib/core/editor/editor.service.ts:syncExternalContentToEditor ref
call src/lib/plugins/mods/mod-app.service.ts:82 in createModKb -> src/lib/core/vault/vault-entries.service.ts:getVaultEntries call
call src/lib/plugins/mods/mod-app.service.ts:84 in createModKb -> src/lib/plugins/queryjs/kb-api.ts:KBAPI new
call src/lib/plugins/mods/mod-app.service.ts:92 in createModKb -> src/lib/plugins/queryjs/queryjs.service.ts:loadExternalScript ref
