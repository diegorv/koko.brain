# file card src/lib/features/file-icons/file-icons.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-icons/file-icons.store.svelte.ts ' codemap/files
file src/lib/features/file-icons/file-icons.store.svelte.ts store L59 module src/lib/features/file-icons in9 t26
## imports
imp src/lib/features/file-icons/file-icons.store.svelte.ts:1 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId,type:RecentIcon
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:12 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:15 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/file-icons/IconPicker.svelte:6 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/file-icons/file-icons.service.ts:6 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore,type:FrontmatterIconRef
imp src/lib/features/file-icons/icon-resolver.ts:1 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore,type:FrontmatterIconRef
imp src/lib/features/note-list/NoteRowMenu.svelte:20 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:49 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/rail-shell/Rail.svelte:20 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/rail-shell/TypesNavigator.svelte:32 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
## reach
in2 src/lib/features/file-icons/file-icons.store.svelte.ts 13 files in 7 modules: src/lib/app(5) src/lib/features/auto-organize(2) src/lib/features/properties(2) src/lib/features/note-list(1) src/lib/features/rail-shell(1) +2 modules: q impact src/lib/features/file-icons/file-icons.store.svelte.ts --depth 2
out2 src/lib/features/file-icons/file-icons.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/file-icons/file-icons.store.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts mirror
test src/tests/lib/app/EditorView.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/app/lifecycle/watcher-handler.mixed-batch.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/app/lifecycle/watcher-handler.service.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/core/filesystem/note-change.service.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/file-icons/IconPicker.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/file-icons/file-icons.service.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/file-icons/frontmatter-icon.service.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/file-icons/icon-resolver.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/note-list/NoteRowMenu.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/properties/PropertiesView.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/properties/RelationshipSearch.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/rail-shell/FilesNavigator.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/rail-shell/Rail.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/tasks/TasksView.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
test src/tests/lib/plugins/mods/mod-rail-icon.test.ts imports src/lib/features/file-icons/file-icons.store.svelte.ts
## symbols
sym src/lib/features/file-icons/file-icons.store.svelte.ts:4 interface FrontmatterIconRef L6 | What a file's frontmatter sets for its look: an icon, colors, or both
by src/lib/features/file-icons/file-icons.store.svelte.ts:FrontmatterIconRef <- src/lib/features/file-icons/file-icons.service.ts:6 in (module) import
by src/lib/features/file-icons/file-icons.store.svelte.ts:FrontmatterIconRef <- src/lib/features/file-icons/icon-resolver.ts:1 in (module) import
sym src/lib/features/file-icons/file-icons.store.svelte.ts:16 store fileIconsStore L44 | Reactive store for file/folder icons
by src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:212 in resolvedIcon member
by src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:279 in getResolvedIcon member
by src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore <- src/lib/features/file-icons/IconPicker.svelte:73 in recentNormalized=$derived member
by src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore <- src/lib/features/file-icons/file-icons.service.ts:18 in (module) mcall +23
by src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore <- src/lib/features/file-icons/icon-resolver.ts:65 in resolveIconForPath member +3
by src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore <- src/lib/features/note-list/NoteRowMenu.svelte:55 in iconPickerRef=$derived mcall
by src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore <- src/lib/features/rail-shell/FilesNavigator.svelte:102 in iconPickerRef=$derived mcall
by src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore <- src/lib/features/rail-shell/Rail.svelte:200 in actionIcon member
more by 1 not shown: src/lib/features/rail-shell(1): q importers src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore
## store
store src/lib/features/file-icons/file-icons.store.svelte.ts:16 fileIconsStore esc:0
mem src/lib/features/file-icons/file-icons.store.svelte.ts:17 get fileIconsStore.recentIcons r:src/lib/features/file-icons/IconPicker.svelte:73,src/lib/features/file-icons/file-icons.service.ts:69,src/lib/features/file-icons/file-icons.service.ts:78 w-via:setRecentIcons,reset
mem src/lib/features/file-icons/file-icons.store.svelte.ts:18 get fileIconsStore.frontmatterIcons r:- w-via:setFrontmatterIcons,updateFrontmatterIcon,reset
mem src/lib/features/file-icons/file-icons.store.svelte.ts:20 get fileIconsStore.packVersion r:src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:212,src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:279,src/lib/features/file-icons/icon-resolver.ts:65,src/lib/features/file-icons/icon-resolver.ts:85,src/lib/features/rail-shell/Rail.svelte:200 w-via:bumpPackVersion,reset | Version counter incremented when icon packs finish loading into cache
mem src/lib/features/file-icons/file-icons.store.svelte.ts:23 do fileIconsStore.getFrontmatterIcon w:8 | Looks up a frontmatter-derived icon for the given path
more w 8 not shown: src/lib/features/file-icons(5) src/lib/features/rail-shell(2) src/lib/features/note-list(1): q store src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.getFrontmatterIcon
mem src/lib/features/file-icons/file-icons.store.svelte.ts:28 do fileIconsStore.setRecentIcons w:src/lib/features/file-icons/file-icons.service.ts:52,src/lib/features/file-icons/file-icons.service.ts:57,src/lib/features/file-icons/file-icons.service.ts:60,src/lib/features/file-icons/file-icons.service.ts:79 | Replaces the recently used icons list
mem src/lib/features/file-icons/file-icons.store.svelte.ts:33 do fileIconsStore.setFrontmatterIcons w:src/lib/features/file-icons/file-icons.service.ts:225 | Replaces the frontmatter icon index
mem src/lib/features/file-icons/file-icons.store.svelte.ts:38 do fileIconsStore.bumpPackVersion w:src/lib/features/file-icons/file-icons.service.ts:18 | Increments packVersion to trigger reactive re-render in icon consumers
mem src/lib/features/file-icons/file-icons.store.svelte.ts:43 do fileIconsStore.updateFrontmatterIcon w:12 | Updates or removes a single frontmatter icon entry
more w 12 not shown: src/lib/features/file-icons(12): q store src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.updateFrontmatterIcon
mem src/lib/features/file-icons/file-icons.store.svelte.ts:54 do fileIconsStore.reset w:src/lib/features/file-icons/file-icons.service.ts:309 | Clears all recent icons and frontmatter icons
