# file card src/lib/features/file-icons/icon-resolver.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-icons/icon-resolver.ts ' codemap/files
file src/lib/features/file-icons/icon-resolver.ts other L98 module src/lib/features/file-icons in10 t2
## imports
imp src/lib/features/file-icons/icon-resolver.ts:1 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore,type:FrontmatterIconRef
imp src/lib/features/file-icons/icon-resolver.ts:2 -> src/lib/features/file-icons/file-icons.icon-data.ts getIconSync
imp src/lib/features/file-icons/icon-resolver.ts:3 -> src/lib/features/file-icons/file-icons.types.ts type:NormalizedIcon
## imported-by
imp src/lib/app/EditorView.svelte:24 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/app/boot.ts:11 -> src/lib/features/file-icons/icon-resolver.ts registerTypeIconLookup
imp src/lib/features/note-list/NoteRow.svelte:10 -> src/lib/features/file-icons/icon-resolver.ts type:ResolvedIcon
imp src/lib/features/properties/PropertiesView.svelte:25 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath,resolveIconForType
imp src/lib/features/properties/RelationshipSearch.svelte:10 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/rail-shell/FilesNavigator.svelte:45 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/rail-shell/Rail.svelte:21 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/rail-shell/RailNoteList.svelte:32 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/rail-shell/TypesNavigator.svelte:28 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/tasks/TasksView.svelte:29 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
## reach
in2 src/lib/features/file-icons/icon-resolver.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/features/file-icons/icon-resolver.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/file-icons/icon-resolver.test.ts imports src/lib/features/file-icons/icon-resolver.ts mirror
test src/tests/lib/features/properties/PropertiesView.test.ts imports src/lib/features/file-icons/icon-resolver.ts
## symbols
sym src/lib/features/file-icons/icon-resolver.ts:12 interface TypeIconLookup L6 | The type questions the icon chain asks. file-icons sits below type-definitions (ADR-0003), so the app fills this slot from `registerAppPorts()` instead of file…
sym src/lib/features/file-icons/icon-resolver.ts:26 fn registerTypeIconLookup(lookup: TypeIconLookup): () => void L6 | Installs the lookup the resolver uses for type icons.
by src/lib/features/file-icons/icon-resolver.ts:registerTypeIconLookup <- src/lib/app/boot.ts:55 in registerAppPorts call
sym src/lib/features/file-icons/icon-resolver.ts:38 interface ResolvedIcon L8 | Result of icon resolution: the one answer to how an item looks, read by every place that shows one.
by src/lib/features/file-icons/icon-resolver.ts:ResolvedIcon <- src/lib/features/note-list/NoteRow.svelte:10 in (script) import
sym src/lib/features/file-icons/icon-resolver.ts:64 fn resolveIconForPath(path: string): ResolvedIcon | undefined L14 | Resolves the display icon and colors for a file path: 1.
by src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath <- src/lib/app/EditorView.svelte:57 in (markup) markup +1
by src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath <- src/lib/features/properties/PropertiesView.svelte:258 in (markup) markup
by src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath <- src/lib/features/properties/RelationshipSearch.svelte:65 in (markup) markup
by src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath <- src/lib/features/rail-shell/FilesNavigator.svelte:433 in (markup) markup
by src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath <- src/lib/features/rail-shell/Rail.svelte:167 in pinRow call +1
by src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath <- src/lib/features/rail-shell/RailNoteList.svelte:653 in resolveNoteIcon call +1
by src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath <- src/lib/features/rail-shell/TypesNavigator.svelte:279 in (markup) markup +1
by src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath <- src/lib/features/tasks/TasksView.svelte:754 in (markup) markup
sym src/lib/features/file-icons/icon-resolver.ts:84 fn resolveIconForType(typeName: string): ResolvedIcon | undefined L7 | Resolves the display icon for a type name by looking up the type definition note's frontmatter icon.
by src/lib/features/file-icons/icon-resolver.ts:resolveIconForType <- src/lib/features/properties/PropertiesView.svelte:173 in (markup) markup +1
## locals
local src/lib/features/file-icons/icon-resolver.ts:48 fn resolveRef(ref: FrontmatterIconRef | undefined): ResolvedIcon | undefined L6
local src/lib/features/file-icons/icon-resolver.ts:93 fn resolveTypeIconForPath(path: string): ResolvedIcon | undefined L6
## calls
call src/lib/features/file-icons/icon-resolver.ts:50 in resolveRef -> src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync call
call src/lib/features/file-icons/icon-resolver.ts:67 in resolveIconForPath -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.getFrontmatterIcon mcall
call src/lib/features/file-icons/icon-resolver.ts:67 in resolveIconForPath -> src/lib/features/file-icons/icon-resolver.ts:resolveRef call
call src/lib/features/file-icons/icon-resolver.ts:70 in resolveIconForPath -> src/lib/features/file-icons/icon-resolver.ts:resolveTypeIconForPath call
call src/lib/features/file-icons/icon-resolver.ts:89 in resolveIconForType -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.getFrontmatterIcon mcall
call src/lib/features/file-icons/icon-resolver.ts:89 in resolveIconForType -> src/lib/features/file-icons/icon-resolver.ts:resolveRef call
call src/lib/features/file-icons/icon-resolver.ts:97 in resolveTypeIconForPath -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForType call
