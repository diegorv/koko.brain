# file card src/lib/features/file-icons/file-icons.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-icons/file-icons.types.ts ' codemap/files
file src/lib/features/file-icons/file-icons.types.ts types L44 module src/lib/features/file-icons in14 t0
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:13 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:30 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/auto-organize/auto-organize.types.ts:4 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/file-icons/IconPicker.svelte:3 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId,type:NormalizedIcon
imp src/lib/features/file-icons/IconRenderer.svelte:2 -> src/lib/features/file-icons/file-icons.types.ts type:NormalizedIcon
imp src/lib/features/file-icons/file-icons.icon-data.ts:1 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId,type:IconPackMeta,type:NormalizedIcon
imp src/lib/features/file-icons/file-icons.logic.ts:2 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId,type:NormalizedIcon,type:RecentIcon
imp src/lib/features/file-icons/file-icons.service.ts:5 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId,type:RecentIcon
imp src/lib/features/file-icons/file-icons.store.svelte.ts:1 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId,type:RecentIcon
imp src/lib/features/file-icons/frontmatter-icon.service.ts:15 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/file-icons/icon-resolver.ts:3 -> src/lib/features/file-icons/file-icons.types.ts type:NormalizedIcon
imp src/lib/features/note-list/NoteRowMenu.svelte:22 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/rail-shell/FilesNavigator.svelte:51 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/rail-shell/TypesNavigator.svelte:34 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
## reach
in2 src/lib/features/file-icons/file-icons.types.ts 18 files in 8 modules: src/lib/app(5) src/lib/features/auto-organize(5) src/lib/features/properties(2) src/lib/features/rail-shell(2) src/lib/features/note-list(1) +3 modules: q impact src/lib/features/file-icons/file-icons.types.ts --depth 2
out2 src/lib/features/file-icons/file-icons.types.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/file-icons/IconRenderer.test.ts imports-type src/lib/features/file-icons/file-icons.types.ts
test src/tests/lib/features/file-icons/file-icons.logic.test.ts imports-type src/lib/features/file-icons/file-icons.types.ts
test src/tests/lib/features/file-icons/icon-resolver.test.ts imports-type src/lib/features/file-icons/file-icons.types.ts
## symbols
sym src/lib/features/file-icons/file-icons.types.ts:2 type IconPackId L13 | Supported icon pack identifiers
by src/lib/features/file-icons/file-icons.types.ts:IconPackId <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:13 in (script) import
by src/lib/features/file-icons/file-icons.types.ts:IconPackId <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:30 in (script) import
by src/lib/features/file-icons/file-icons.types.ts:IconPackId <- src/lib/features/file-icons/IconPicker.svelte:3 in (script) import
by src/lib/features/file-icons/file-icons.types.ts:IconPackId <- src/lib/features/file-icons/file-icons.icon-data.ts:1 in (module) import
by src/lib/features/file-icons/file-icons.types.ts:IconPackId <- src/lib/features/file-icons/file-icons.logic.ts:2 in (module) import
by src/lib/features/file-icons/file-icons.types.ts:IconPackId <- src/lib/features/file-icons/file-icons.service.ts:5 in (module) import
by src/lib/features/file-icons/file-icons.types.ts:IconPackId <- src/lib/features/file-icons/file-icons.store.svelte.ts:1 in (module) import
by src/lib/features/file-icons/file-icons.types.ts:IconPackId <- src/lib/features/file-icons/frontmatter-icon.service.ts:15 in (module) import
more by 3 not shown: src/lib/features/rail-shell(2) src/lib/features/note-list(1): q importers src/lib/features/file-icons/file-icons.types.ts:IconPackId
sym src/lib/features/file-icons/file-icons.types.ts:17 interface RecentIcon L6 | A recently used icon reference (pack + name, no path)
by src/lib/features/file-icons/file-icons.types.ts:RecentIcon <- src/lib/features/file-icons/file-icons.logic.ts:2 in (module) import
by src/lib/features/file-icons/file-icons.types.ts:RecentIcon <- src/lib/features/file-icons/file-icons.service.ts:5 in (module) import
by src/lib/features/file-icons/file-icons.types.ts:RecentIcon <- src/lib/features/file-icons/file-icons.store.svelte.ts:1 in (module) import
sym src/lib/features/file-icons/file-icons.types.ts:25 interface IconPackMeta L6 | Metadata about an available icon pack
by src/lib/features/file-icons/file-icons.types.ts:IconPackMeta <- src/lib/features/file-icons/file-icons.icon-data.ts:1 in (module) import
sym src/lib/features/file-icons/file-icons.types.ts:33 interface NormalizedIcon L12 | A normalized icon ready for rendering
by src/lib/features/file-icons/file-icons.types.ts:NormalizedIcon <- src/lib/features/file-icons/IconPicker.svelte:3 in (script) import
by src/lib/features/file-icons/file-icons.types.ts:NormalizedIcon <- src/lib/features/file-icons/IconRenderer.svelte:2 in (script) import
by src/lib/features/file-icons/file-icons.types.ts:NormalizedIcon <- src/lib/features/file-icons/file-icons.icon-data.ts:1 in (module) import
by src/lib/features/file-icons/file-icons.types.ts:NormalizedIcon <- src/lib/features/file-icons/file-icons.logic.ts:2 in (module) import
by src/lib/features/file-icons/file-icons.types.ts:NormalizedIcon <- src/lib/features/file-icons/icon-resolver.ts:3 in (module) import
