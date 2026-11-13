# file card src/lib/plugins/mods/mod-query.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/mod-query.service.ts ' codemap/files
file src/lib/plugins/mods/mod-query.service.ts service L60 module src/lib/plugins/mods in1 t1
## imports
imp src/lib/plugins/mods/mod-query.service.ts:1 -> src/lib/features/collection/collection.logic.ts executeQuery
imp src/lib/plugins/mods/mod-query.service.ts:2 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/plugins/mods/mod-query.service.ts:3 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:QueryResult
imp src/lib/plugins/mods/mod-query.service.ts:4 -> src/lib/features/collection/view-row-set.port.ts getViewRowSetPort
imp src/lib/plugins/mods/mod-query.service.ts:5 -> src/lib/utils/path.ts relativePath
imp src/lib/plugins/mods/mod-query.service.ts:7 -> src/lib/plugins/mods/contract/mod-api.v1.ts type:ModQueryV1
imp src/lib/plugins/mods/mod-query.service.ts:8 -> src/lib/plugins/mods/mod-vault.service.ts type:ModVaultScope
imp src/lib/plugins/mods/mod-query.service.ts:9 -> src/lib/plugins/mods/mods.logic.ts assertVaultPath
## imported-by
imp src/lib/plugins/mods/mods-host.service.ts:26 -> src/lib/plugins/mods/mod-query.service.ts createModQuery
## reach
in2 src/lib/plugins/mods/mod-query.service.ts 3 files in 2 modules: src/lib/app(2) src/lib/plugins/mods(1)
out2 src/lib/plugins/mods/mod-query.service.ts 17 files in 6 modules: src/lib/core/editor(4) src/lib/core/filesystem(4) src/lib/features/collection(4) src/lib/core/frontmatter(2) src/lib/utils(2) +1 modules
## tests
test src/tests/lib/plugins/mods/mod-query.service.test.ts imports src/lib/plugins/mods/mod-query.service.ts mirror
## symbols
sym src/lib/plugins/mods/mod-query.service.ts:20 fn createModQuery({ modId, vaultPath, assertLive }: ModVaultScope): ModQueryV1 L41 | Builds `ctx.query`: read-only matching over the property index with the engine of views and inline blocks (`executeQuery`).
by src/lib/plugins/mods/mod-query.service.ts:createModQuery <- src/lib/plugins/mods/mods-host.service.ts:700 in createModContext call
## calls
call src/lib/plugins/mods/mod-query.service.ts:28 in createModQuery -> src/lib/plugins/mods/mods.logic.ts:assertVaultPath call
call src/lib/plugins/mods/mod-query.service.ts:45 in createModQuery -> src/lib/features/collection/collection.logic.ts:executeQuery call +1
call src/lib/plugins/mods/mod-query.service.ts:50 in createModQuery -> src/lib/features/collection/view-row-set.port.ts:getViewRowSetPort call
call src/lib/plugins/mods/mod-query.service.ts:57 in createModQuery -> src/lib/utils/path.ts:relativePath call
