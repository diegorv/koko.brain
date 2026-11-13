# file card src/lib/features/rail-shell/view-lens.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/view-lens.service.ts ' codemap/files
file src/lib/features/rail-shell/view-lens.service.ts service L48 module src/lib/features/rail-shell in1 t2
## imports
imp src/lib/features/rail-shell/view-lens.service.ts:1 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/rail-shell/view-lens.service.ts:2 -> src/lib/utils/log.service.ts appendLog
imp src/lib/features/rail-shell/view-lens.service.ts:3 -> src/lib/features/type-definitions/type-sidebar.logic.ts railViewNameNote
imp src/lib/features/rail-shell/view-lens.service.ts:4 -> src/lib/features/type-definitions/view-parse-cache.ts refreshViewDefinition
imp src/lib/features/rail-shell/view-lens.service.ts:5 -> src/lib/features/rail-shell/lens.logic.ts queryViewLens,resolveViewLens,viewLoadFromQuery,viewReadError,type:ViewLoad
imp src/lib/features/rail-shell/view-lens.service.ts:6 -> src/lib/features/rail-shell/rail-shell.types.ts type:LensContext
## imported-by
imp src/lib/features/rail-shell/TypesNavigator.svelte:53 -> src/lib/features/rail-shell/view-lens.service.ts countViewNotes,type:ViewCount
## reach
in2 src/lib/features/rail-shell/view-lens.service.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/view-lens.service.ts 19 files in 9 modules: src/lib/features/collection(4) src/lib/core/filesystem(3) src/lib/features/type-definitions(3) src/lib/utils(3) src/lib/core/settings(2) +4 modules
## tests
test src/tests/lib/features/rail-shell/view-lens.service.test.ts imports src/lib/features/rail-shell/view-lens.service.ts mirror
test src/tests/lib/features/collection/CollectionView.test.ts imports src/lib/features/rail-shell/view-lens.service.ts
## symbols
sym src/lib/features/rail-shell/view-lens.service.ts:9 type ViewCount L4 | A view's navigator badge: the number of notes its list holds, or why it has no list.
by src/lib/features/rail-shell/view-lens.service.ts:ViewCount <- src/lib/features/rail-shell/TypesNavigator.svelte:53 in (script) import
sym src/lib/features/rail-shell/view-lens.service.ts:22 fn countViewNotes(viewPaths: readonly string[], ctx: LensContext, propertyIndex: Map<string, PropertyIndexRecord>): Promise<Map<string, … L27 | Counts the notes each view lists, the same way its note list resolves it.
by src/lib/features/rail-shell/view-lens.service.ts:countViewNotes <- src/lib/features/rail-shell/TypesNavigator.svelte:90 in recountViews call
## calls
call src/lib/features/rail-shell/view-lens.service.ts:33 in countViewNotes -> src/lib/features/type-definitions/view-parse-cache.ts:refreshViewDefinition call
call src/lib/features/rail-shell/view-lens.service.ts:34 in countViewNotes -> src/lib/features/type-definitions/type-sidebar.logic.ts:railViewNameNote call
call src/lib/features/rail-shell/view-lens.service.ts:36 in countViewNotes -> src/lib/features/rail-shell/lens.logic.ts:queryViewLens call
call src/lib/features/rail-shell/view-lens.service.ts:36 in countViewNotes -> src/lib/features/rail-shell/lens.logic.ts:viewLoadFromQuery call
call src/lib/features/rail-shell/view-lens.service.ts:39 in countViewNotes -> src/lib/utils/log.service.ts:appendLog call
call src/lib/features/rail-shell/view-lens.service.ts:40 in countViewNotes -> src/lib/features/rail-shell/lens.logic.ts:viewReadError call
call src/lib/features/rail-shell/view-lens.service.ts:42 in countViewNotes -> src/lib/features/rail-shell/lens.logic.ts:resolveViewLens call
