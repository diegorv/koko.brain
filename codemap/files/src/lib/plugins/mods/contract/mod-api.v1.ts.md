# file card src/lib/plugins/mods/contract/mod-api.v1.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/contract/mod-api.v1.ts ' codemap/files
file src/lib/plugins/mods/contract/mod-api.v1.ts other L2 module src/lib/plugins/mods in5 t0
## imported-by
imp src/lib/plugins/mods/mod-query.service.ts:7 -> src/lib/plugins/mods/contract/mod-api.v1.ts type:ModQueryV1
imp src/lib/plugins/mods/mod-theme.svelte.ts:5 -> src/lib/plugins/mods/contract/mod-api.v1.ts type:ModThemeColorsV1,type:ModThemeStateV1
imp src/lib/plugins/mods/mod-vault.service.ts:15 -> src/lib/plugins/mods/contract/mod-api.v1.ts type:ModContextV1,type:ModDataCorruptErrorV1,type:ModVaultV1,type:ModWorkspaceV1
imp src/lib/plugins/mods/mods-host.service.ts:20 -> src/lib/plugins/mods/contract/mod-api.v1.ts type:ModActionV1,type:ModContextV1,type:ModNotifyKindV1,type:ModRunV1,type:ModThemeV1,type:ModUiV1,type:ModV1
imp src/lib/plugins/mods/mods.logic.ts:1 -> src/lib/plugins/mods/contract/mod-api.v1.ts type:ModV1
## reach
in2 src/lib/plugins/mods/contract/mod-api.v1.ts 7 files in 2 modules: src/lib/plugins/mods(4) src/lib/app(3)
out2 src/lib/plugins/mods/contract/mod-api.v1.ts 0 files in 0 modules: -
## tests
test src/tests/help/mods-example.test.ts imports-type src/lib/plugins/mods/contract/mod-api.v1.ts
test src/tests/help/mods-examples.test.ts imports-type src/lib/plugins/mods/contract/mod-api.v1.ts
test src/tests/help/mods-types.test.ts imports-type src/lib/plugins/mods/contract/mod-api.v1.ts
test src/tests/lib/plugins/mods/ModDialogDiagnostics.test.ts imports-type src/lib/plugins/mods/contract/mod-api.v1.ts
test src/tests/lib/plugins/mods/ModDialogHost.test.ts imports-type src/lib/plugins/mods/contract/mod-api.v1.ts
test src/tests/lib/plugins/mods/mod-note-created.test.ts imports-type src/lib/plugins/mods/contract/mod-api.v1.ts
test src/tests/lib/plugins/mods/mod-note-moved.test.ts imports-type src/lib/plugins/mods/contract/mod-api.v1.ts
test src/tests/lib/plugins/mods/mod-query.service.test.ts imports-type src/lib/plugins/mods/contract/mod-api.v1.ts
test src/tests/lib/plugins/mods/mod-theme.test.ts imports-type src/lib/plugins/mods/contract/mod-api.v1.ts
test src/tests/lib/plugins/mods/mod-vault-paths.test.ts imports-type src/lib/plugins/mods/contract/mod-api.v1.ts
test src/tests/lib/plugins/mods/mod-vault.service.test.ts imports-type src/lib/plugins/mods/contract/mod-api.v1.ts
test src/tests/lib/plugins/mods/mods-host-trace.service.test.ts imports-type src/lib/plugins/mods/contract/mod-api.v1.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports-type src/lib/plugins/mods/contract/mod-api.v1.ts
