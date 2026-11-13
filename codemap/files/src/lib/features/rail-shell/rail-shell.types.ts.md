# file card src/lib/features/rail-shell/rail-shell.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/rail-shell.types.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols
file src/lib/features/rail-shell/rail-shell.types.ts types L234 module src/lib/features/rail-shell in15 t0
## imports
imp src/lib/features/rail-shell/rail-shell.types.ts:3 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/rail-shell/rail-shell.types.ts:4 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/features/rail-shell/rail-shell.types.ts:5 -> src/lib/features/note-list/note-row.types.ts type:NoteRowNote
imp src/lib/features/rail-shell/rail-shell.types.ts:6 -> src/lib/features/type-definitions/type-definitions.logic.ts type:TypeMetadata
imp src/lib/features/rail-shell/rail-shell.types.ts:220 -> src/lib/utils/menu-action.types.ts type:MenuActionTarget,type:MenuActionItem
## imported-by
imp src/lib/features/rail-shell/FilesNavigator.svelte:57 -> src/lib/features/rail-shell/rail-shell.types.ts type:Lens,type:RailFolderCreator
imp src/lib/features/rail-shell/Rail.svelte:43 -> src/lib/features/rail-shell/rail-shell.types.ts type:RailAction,type:RailPin
imp src/lib/features/rail-shell/RailNoteList.svelte:94 -> src/lib/features/rail-shell/rail-shell.types.ts type:FileKind,type:Lens,type:LensContext,type:LensNote,type:NewNoteRule,type:RailHeaderAction,type:RailTodaySection,type:ResolvedLens
imp src/lib/features/rail-shell/TypesNavigator.svelte:54 -> src/lib/features/rail-shell/rail-shell.types.ts type:Lens,type:LensContext,type:TypeNavigatorRow
imp src/lib/features/rail-shell/lens.logic.ts:45 -> src/lib/features/rail-shell/rail-shell.types.ts type:FileKind,type:Lens,type:LensContext,type:LensGroup,type:LensNote,type:NewNoteContext,type:NewNoteRule,type:PlainNewNoteRule,type:RailLensProvider,type:RailNavigator,type:RailPin,type:ResolvedLens,type:TypeNavigatorRow,type:ViewLensStatus
imp src/lib/features/rail-shell/list-prefs.logic.ts:1 -> src/lib/features/rail-shell/rail-shell.types.ts type:Lens
imp src/lib/features/rail-shell/list-properties.logic.ts:2 -> src/lib/features/rail-shell/rail-shell.types.ts type:LensNote
imp src/lib/features/rail-shell/list-search.logic.ts:2 -> src/lib/features/rail-shell/rail-shell.types.ts type:LensNote,type:ResolvedLens
imp src/lib/features/rail-shell/list-sort-compare.logic.ts:3 -> src/lib/features/rail-shell/rail-shell.types.ts type:LensGroup,type:LensNote,type:ResolvedLens
imp src/lib/features/rail-shell/new-note.service.ts:11 -> src/lib/features/rail-shell/rail-shell.types.ts type:NewNoteRule
imp src/lib/features/rail-shell/rail-items.logic.ts:3 -> src/lib/features/rail-shell/rail-shell.types.ts type:RailAction,type:RailNavigator,type:RailPin
imp src/lib/features/rail-shell/rail-registry.store.svelte.ts:1 -> src/lib/features/rail-shell/rail-shell.types.ts type:RailAction,type:RailFolderCreator,type:RailLensProvider,type:RailMenuItem,type:RailNavigator,type:RailTodaySection
imp src/lib/features/rail-shell/view-lens.service.ts:6 -> src/lib/features/rail-shell/rail-shell.types.ts type:LensContext
imp src/lib/plugins/calendar/calendar-rail.service.ts:6 -> src/lib/features/rail-shell/rail-shell.types.ts type:Lens
imp src/lib/plugins/calendar/day-lens.logic.ts:5 -> src/lib/features/rail-shell/rail-shell.types.ts type:Lens,type:LensContext,type:NewNoteContext,type:NewNoteRule,type:ResolvedLens
## reach
in2 src/lib/features/rail-shell/rail-shell.types.ts 17 files in 7 modules: src/lib/app(5) src/lib/features/rail-shell(5) src/lib/plugins/mods(2) src/lib/plugins/one-on-one(2) src/lib/features/search(1) +2 modules: q impact src/lib/features/rail-shell/rail-shell.types.ts --depth 2
out2 src/lib/features/rail-shell/rail-shell.types.ts 3 files in 3 modules: src/lib/contracts(1) src/lib/core/filesystem(1) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/app/rail-navigation.test.ts imports-type src/lib/features/rail-shell/rail-shell.types.ts
test src/tests/lib/features/rail-shell/FilesNavigator.test.ts imports-type src/lib/features/rail-shell/rail-shell.types.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts imports-type src/lib/features/rail-shell/rail-shell.types.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports-type src/lib/features/rail-shell/rail-shell.types.ts
test src/tests/lib/features/rail-shell/lens.logic.test.ts imports-type src/lib/features/rail-shell/rail-shell.types.ts
test src/tests/lib/features/rail-shell/list-prefs.logic.test.ts imports-type src/lib/features/rail-shell/rail-shell.types.ts
test src/tests/lib/features/rail-shell/list-properties.logic.test.ts imports-type src/lib/features/rail-shell/rail-shell.types.ts
test src/tests/lib/features/rail-shell/list-search.logic.test.ts imports-type src/lib/features/rail-shell/rail-shell.types.ts
test src/tests/lib/features/rail-shell/list-sort-compare.logic.test.ts imports-type src/lib/features/rail-shell/rail-shell.types.ts
test src/tests/lib/features/rail-shell/new-note.service.test.ts imports-type src/lib/features/rail-shell/rail-shell.types.ts
test src/tests/lib/features/rail-shell/rail-items.logic.test.ts imports-type src/lib/features/rail-shell/rail-shell.types.ts
test src/tests/lib/features/rail-shell/rail-registry.store.test.ts imports-type src/lib/features/rail-shell/rail-shell.types.ts
test src/tests/lib/features/rail-shell/view-lens.service.test.ts imports-type src/lib/features/rail-shell/rail-shell.types.ts
test src/tests/lib/plugins/calendar/day-lens.logic.test.ts imports-type src/lib/features/rail-shell/rail-shell.types.ts
## symbols
sym src/lib/features/rail-shell/rail-shell.types.ts:12 interface Lens L6 | What the user picked on the left: a rail item, a navigator entry or a note's neighbourhood.
by src/lib/features/rail-shell/rail-shell.types.ts:Lens <- src/lib/features/rail-shell/FilesNavigator.svelte:57 in (script) import
by src/lib/features/rail-shell/rail-shell.types.ts:Lens <- src/lib/features/rail-shell/RailNoteList.svelte:96 in (script) import
by src/lib/features/rail-shell/rail-shell.types.ts:Lens <- src/lib/features/rail-shell/TypesNavigator.svelte:54 in (script) import
by src/lib/features/rail-shell/rail-shell.types.ts:Lens <- src/lib/features/rail-shell/lens.logic.ts:47 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:Lens <- src/lib/features/rail-shell/list-prefs.logic.ts:1 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:Lens <- src/lib/plugins/calendar/calendar-rail.service.ts:6 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:Lens <- src/lib/plugins/calendar/day-lens.logic.ts:5 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:20 interface LensContext L12 | The snapshot a lens resolves against.
by src/lib/features/rail-shell/rail-shell.types.ts:LensContext <- src/lib/features/rail-shell/RailNoteList.svelte:97 in (script) import
by src/lib/features/rail-shell/rail-shell.types.ts:LensContext <- src/lib/features/rail-shell/TypesNavigator.svelte:54 in (script) import
by src/lib/features/rail-shell/rail-shell.types.ts:LensContext <- src/lib/features/rail-shell/lens.logic.ts:48 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:LensContext <- src/lib/features/rail-shell/view-lens.service.ts:6 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:LensContext <- src/lib/plugins/calendar/day-lens.logic.ts:5 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:34 type FileKind L1 | The kind of a listed file, which picks its row icon.
by src/lib/features/rail-shell/rail-shell.types.ts:FileKind <- src/lib/features/rail-shell/RailNoteList.svelte:95 in (script) import
by src/lib/features/rail-shell/rail-shell.types.ts:FileKind <- src/lib/features/rail-shell/lens.logic.ts:46 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:37 interface LensNote L14 | A note as the rail note list shows it.
by src/lib/features/rail-shell/rail-shell.types.ts:LensNote <- src/lib/features/rail-shell/RailNoteList.svelte:98 in (script) import
by src/lib/features/rail-shell/rail-shell.types.ts:LensNote <- src/lib/features/rail-shell/lens.logic.ts:50 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:LensNote <- src/lib/features/rail-shell/list-properties.logic.ts:2 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:LensNote <- src/lib/features/rail-shell/list-search.logic.ts:2 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:LensNote <- src/lib/features/rail-shell/list-sort-compare.logic.ts:3 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:53 interface LensGroup L8 | A titled group of a lens's notes, shown under its own header (e.g. Today's notes).
by src/lib/features/rail-shell/rail-shell.types.ts:LensGroup <- src/lib/features/rail-shell/lens.logic.ts:49 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:LensGroup <- src/lib/features/rail-shell/list-sort-compare.logic.ts:3 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:63 interface ResolvedLens L12 | A lens turned into what the note list shows.
by src/lib/features/rail-shell/rail-shell.types.ts:ResolvedLens <- src/lib/features/rail-shell/RailNoteList.svelte:102 in (script) import
by src/lib/features/rail-shell/rail-shell.types.ts:ResolvedLens <- src/lib/features/rail-shell/lens.logic.ts:57 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:ResolvedLens <- src/lib/features/rail-shell/list-search.logic.ts:2 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:ResolvedLens <- src/lib/features/rail-shell/list-sort-compare.logic.ts:3 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:ResolvedLens <- src/lib/plugins/calendar/day-lens.logic.ts:5 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:77 type ViewLensStatus L7 | Why a lens cannot show its list.
by src/lib/features/rail-shell/rail-shell.types.ts:ViewLensStatus <- src/lib/features/rail-shell/lens.logic.ts:59 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:86 interface TypeNavigatorRow L18 | A row of the Types navigator: a view, a type, or Untyped.
by src/lib/features/rail-shell/rail-shell.types.ts:TypeNavigatorRow <- src/lib/features/rail-shell/TypesNavigator.svelte:54 in (script) import
by src/lib/features/rail-shell/rail-shell.types.ts:TypeNavigatorRow <- src/lib/features/rail-shell/lens.logic.ts:58 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:106 interface RailPin L12 | A `.view` or a type definition pinned to the rail with `_rail: true`.
by src/lib/features/rail-shell/rail-shell.types.ts:RailPin <- src/lib/features/rail-shell/Rail.svelte:43 in (script) import
by src/lib/features/rail-shell/rail-shell.types.ts:RailPin <- src/lib/features/rail-shell/lens.logic.ts:56 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:RailPin <- src/lib/features/rail-shell/rail-items.logic.ts:3 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:120 interface PlainNewNoteRule L6 | A plain "+ New here" note: where it goes and the frontmatter it inherits.
by src/lib/features/rail-shell/rail-shell.types.ts:PlainNewNoteRule <- src/lib/features/rail-shell/lens.logic.ts:53 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:128 interface TypedNewNoteRule L4 | A "+ New here" note of a type: the type's folder, dedupe and template decide the rest.
sym src/lib/features/rail-shell/rail-shell.types.ts:134 type NewNoteRule L1 | What "+ New here" creates for a lens.
by src/lib/features/rail-shell/rail-shell.types.ts:NewNoteRule <- src/lib/features/rail-shell/RailNoteList.svelte:99 in (script) import
by src/lib/features/rail-shell/rail-shell.types.ts:NewNoteRule <- src/lib/features/rail-shell/lens.logic.ts:52 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:NewNoteRule <- src/lib/features/rail-shell/new-note.service.ts:11 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:NewNoteRule <- src/lib/plugins/calendar/day-lens.logic.ts:5 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:137 interface NewNoteContext L12 | What a lens's creation rule reads.
by src/lib/features/rail-shell/rail-shell.types.ts:NewNoteContext <- src/lib/features/rail-shell/lens.logic.ts:51 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:NewNoteContext <- src/lib/plugins/calendar/day-lens.logic.ts:5 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:151 interface RailLensProvider L10 | Resolves one lens kind; registered by the plugin that owns the kind.
by src/lib/features/rail-shell/rail-shell.types.ts:RailLensProvider <- src/lib/features/rail-shell/lens.logic.ts:54 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:RailLensProvider <- src/lib/features/rail-shell/rail-registry.store.svelte.ts:1 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:163 interface RailHeaderAction L12 | A note list header button a lens provider adds.
by src/lib/features/rail-shell/rail-shell.types.ts:RailHeaderAction <- src/lib/features/rail-shell/RailNoteList.svelte:100 in (script) import
sym src/lib/features/rail-shell/rail-shell.types.ts:177 interface RailNavigator L12 | A navigator panel a plugin adds to the rail shell (e.g. the Calendar navigator).
by src/lib/features/rail-shell/rail-shell.types.ts:RailNavigator <- src/lib/features/rail-shell/lens.logic.ts:55 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:RailNavigator <- src/lib/features/rail-shell/rail-items.logic.ts:3 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:RailNavigator <- src/lib/features/rail-shell/rail-registry.store.svelte.ts:1 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:191 interface RailTodaySection L8 | A section a plugin adds to the Today lens (e.g. My people).
by src/lib/features/rail-shell/rail-shell.types.ts:RailTodaySection <- src/lib/features/rail-shell/RailNoteList.svelte:101 in (script) import
by src/lib/features/rail-shell/rail-shell.types.ts:RailTodaySection <- src/lib/features/rail-shell/rail-registry.store.svelte.ts:1 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:204 interface RailAction L14 | A rail button that runs something on click (e.g. a vault mod's button).
by src/lib/features/rail-shell/rail-shell.types.ts:RailAction <- src/lib/features/rail-shell/Rail.svelte:43 in (script) import
by src/lib/features/rail-shell/rail-shell.types.ts:RailAction <- src/lib/features/rail-shell/rail-items.logic.ts:3 in (module) import
by src/lib/features/rail-shell/rail-shell.types.ts:RailAction <- src/lib/features/rail-shell/rail-registry.store.svelte.ts:1 in (module) import
sym src/lib/features/rail-shell/rail-shell.types.ts:220 reexport RailMenuItem = src/lib/utils/menu-action.types.ts:MenuActionItem L1
sym src/lib/features/rail-shell/rail-shell.types.ts:220 reexport RailMenuTarget = src/lib/utils/menu-action.types.ts:MenuActionTarget L1
sym src/lib/features/rail-shell/rail-shell.types.ts:223 interface RailFolderCreator L12 | A "New <thing>" item a plugin adds to the Files navigator's folder menu (e.g. New Kanban Board).
by src/lib/features/rail-shell/rail-shell.types.ts:RailFolderCreator <- src/lib/features/rail-shell/FilesNavigator.svelte:57 in (script) import
by src/lib/features/rail-shell/rail-shell.types.ts:RailFolderCreator <- src/lib/features/rail-shell/rail-registry.store.svelte.ts:1 in (module) import
