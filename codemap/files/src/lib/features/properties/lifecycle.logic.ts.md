# file card src/lib/features/properties/lifecycle.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/properties/lifecycle.logic.ts ' codemap/files
file src/lib/features/properties/lifecycle.logic.ts logic L64 module src/lib/features/properties in3 t3
## imports
imp src/lib/features/properties/lifecycle.logic.ts:1 -> src/lib/core/frontmatter/properties.types.ts type:Property
## imported-by
imp src/lib/features/note-action-bar/note-action-bar.logic.ts:3 -> src/lib/features/properties/lifecycle.logic.ts getLifecycleState,isFavorite,isOrganized
imp src/lib/features/properties/bookmark-migration.service.ts:8 -> src/lib/features/properties/lifecycle.logic.ts toggleFavorite
imp src/lib/features/properties/lifecycle.service.ts:11 -> src/lib/features/properties/lifecycle.logic.ts getLifecycleState,isFavorite,isOrganized,setBooleanFlag,toggleArchived,toggleFavorite,toggleOrganized
## reach
in2 src/lib/features/properties/lifecycle.logic.ts 7 files in 4 modules: src/lib/app(3) src/lib/features/note-action-bar(2) src/lib/features/note-list(1) src/lib/features/rail-shell(1)
out2 src/lib/features/properties/lifecycle.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/properties/lifecycle.logic.test.ts imports src/lib/features/properties/lifecycle.logic.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-value-types.test.ts imports src/lib/features/properties/lifecycle.logic.ts
test src/tests/lib/features/properties/bookmark-migration.service.test.ts imports src/lib/features/properties/lifecycle.logic.ts
## symbols
sym src/lib/features/properties/lifecycle.logic.ts:4 type LifecycleState L1 | Lifecycle state derived from frontmatter flags.
sym src/lib/features/properties/lifecycle.logic.ts:7 fn getLifecycleState(properties: Property[]): LifecycleState L5 | Returns the lifecycle state of a note from its properties.
by src/lib/features/properties/lifecycle.logic.ts:getLifecycleState <- src/lib/features/note-action-bar/note-action-bar.logic.ts:38 in getActionBarState call
by src/lib/features/properties/lifecycle.logic.ts:getLifecycleState <- src/lib/features/properties/lifecycle.service.ts:92 in toggleActiveNoteArchived call
sym src/lib/features/properties/lifecycle.logic.ts:14 fn isFavorite(properties: Property[]): boolean L4 | Returns whether the note is a favorite.
by src/lib/features/properties/lifecycle.logic.ts:isFavorite <- src/lib/features/note-action-bar/note-action-bar.logic.ts:36 in getActionBarState call
by src/lib/features/properties/lifecycle.logic.ts:isFavorite <- src/lib/features/properties/lifecycle.service.ts:79 in toggleActiveNoteFavorite call
sym src/lib/features/properties/lifecycle.logic.ts:24 fn isOrganized(properties: Property[]): boolean L3 | Returns whether the note is organized, whatever its archive state.
by src/lib/features/properties/lifecycle.logic.ts:isOrganized <- src/lib/features/note-action-bar/note-action-bar.logic.ts:37 in getActionBarState call
by src/lib/features/properties/lifecycle.logic.ts:isOrganized <- src/lib/features/properties/lifecycle.service.ts:84 in toggleActiveNoteOrganized call
sym src/lib/features/properties/lifecycle.logic.ts:32 fn setBooleanFlag(properties: Property[], key: string, value: boolean): Property[] L11 | Sets a boolean flag in properties, creating it if absent.
by src/lib/features/properties/lifecycle.logic.ts:setBooleanFlag <- src/lib/features/properties/lifecycle.service.ts:70 in setTypeRailPin call
sym src/lib/features/properties/lifecycle.logic.ts:49 fn toggleOrganized(properties: Property[], organized: boolean): Property[] L3 | Sets the organized flag.
by src/lib/features/properties/lifecycle.logic.ts:toggleOrganized <- src/lib/features/properties/lifecycle.service.ts:84 in toggleActiveNoteOrganized call
sym src/lib/features/properties/lifecycle.logic.ts:57 fn toggleArchived(properties: Property[], archived: boolean): Property[] L3 | Toggles the archived state.
by src/lib/features/properties/lifecycle.logic.ts:toggleArchived <- src/lib/features/properties/lifecycle.service.ts:92 in toggleActiveNoteArchived call
sym src/lib/features/properties/lifecycle.logic.ts:62 fn toggleFavorite(properties: Property[], favorite: boolean): Property[] L3 | Toggles the favorite flag.
by src/lib/features/properties/lifecycle.logic.ts:toggleFavorite <- src/lib/features/properties/bookmark-migration.service.ts:80 in migrateBookmarksToFavorites call
by src/lib/features/properties/lifecycle.logic.ts:toggleFavorite <- src/lib/features/properties/lifecycle.service.ts:52 in toggleFavoriteForPath call +1
## calls
call src/lib/features/properties/lifecycle.logic.ts:10 in getLifecycleState -> src/lib/features/properties/lifecycle.logic.ts:isOrganized call
call src/lib/features/properties/lifecycle.logic.ts:50 in toggleOrganized -> src/lib/features/properties/lifecycle.logic.ts:setBooleanFlag call
call src/lib/features/properties/lifecycle.logic.ts:58 in toggleArchived -> src/lib/features/properties/lifecycle.logic.ts:setBooleanFlag call
call src/lib/features/properties/lifecycle.logic.ts:63 in toggleFavorite -> src/lib/features/properties/lifecycle.logic.ts:setBooleanFlag call
