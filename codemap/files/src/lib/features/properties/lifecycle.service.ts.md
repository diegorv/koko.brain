# file card src/lib/features/properties/lifecycle.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/properties/lifecycle.service.ts ' codemap/files
file src/lib/features/properties/lifecycle.service.ts service L93 module src/lib/features/properties in5 t15
## imports
imp src/lib/features/properties/lifecycle.service.ts:1 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/properties/lifecycle.service.ts:2 -> src/lib/core/editor/editor.logic.ts isMarkdownNoteTab
imp src/lib/features/properties/lifecycle.service.ts:3 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/properties/lifecycle.service.ts:4 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,toastFrontmatterWriteError,updateNoteFrontmatter
imp src/lib/features/properties/lifecycle.service.ts:9 -> src/lib/core/frontmatter/properties.logic.ts removeProperty
imp src/lib/features/properties/lifecycle.service.ts:10 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/features/properties/lifecycle.service.ts:11 -> src/lib/features/properties/lifecycle.logic.ts getLifecycleState,isFavorite,isOrganized,setBooleanFlag,toggleArchived,toggleFavorite,toggleOrganized
## imported-by
imp src/lib/app/commands.ts:52 -> src/lib/features/properties/lifecycle.service.ts toggleActiveNoteFavorite,toggleActiveNoteOrganized
imp src/lib/app/global-keybindings.ts:28 -> src/lib/features/properties/lifecycle.service.ts toggleActiveNoteFavorite,toggleActiveNoteOrganized
imp src/lib/features/note-action-bar/NoteActionBar.svelte:29 -> src/lib/features/properties/lifecycle.service.ts toggleActiveNoteArchived,toggleActiveNoteFavorite,toggleActiveNoteOrganized
imp src/lib/features/note-list/NoteRowMenu.svelte:23 -> src/lib/features/properties/lifecycle.service.ts toggleFavoriteForPath
imp src/lib/features/rail-shell/TypesNavigator.svelte:45 -> src/lib/features/properties/lifecycle.service.ts setTypeRailPin
## reach
in2 src/lib/features/properties/lifecycle.service.ts 5 files in 3 modules: src/lib/app(3) src/lib/features/rail-shell(1) src/routes(1)
out2 src/lib/features/properties/lifecycle.service.ts 6 files in 3 modules: src/lib/core/editor(3) src/lib/utils(2) src/lib/core/vault(1)
## tests
test src/tests/lib/features/properties/lifecycle.service.favorite-path.test.ts imports src/lib/features/properties/lifecycle.service.ts mirror
test src/tests/lib/features/properties/lifecycle.service.rail-pin.test.ts imports src/lib/features/properties/lifecycle.service.ts mirror
test src/tests/lib/features/properties/lifecycle.service.test.ts imports src/lib/features/properties/lifecycle.service.ts mirror
test src/tests/lib/features/properties/frontmatter-number-spelling.test.ts imports src/lib/features/properties/lifecycle.service.ts
test src/tests/lib/features/properties/panel-meta-bind-lossy-rewrite.test.ts imports src/lib/features/properties/lifecycle.service.ts
test src/tests/lib/app/commands.test.ts mocks src/lib/features/properties/lifecycle.service.ts
test src/tests/lib/app/global-keybindings.test.ts mocks src/lib/features/properties/lifecycle.service.ts
test src/tests/lib/features/note-list/NoteRowMenu.test.ts mocks src/lib/features/properties/lifecycle.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts mocks src/lib/features/properties/lifecycle.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts mocks src/lib/features/properties/lifecycle.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts mocks src/lib/features/properties/lifecycle.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts mocks src/lib/features/properties/lifecycle.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts mocks src/lib/features/properties/lifecycle.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts mocks src/lib/features/properties/lifecycle.service.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts mocks src/lib/features/properties/lifecycle.service.ts
## symbols
sym src/lib/features/properties/lifecycle.service.ts:48 fn toggleFavoriteForPath(filePath: string, favorite: boolean): Promise<void> L10 | Toggles _favorite on a note by path through `updateNoteFrontmatter`, so an open tab keeps its unsaved edits.
by src/lib/features/properties/lifecycle.service.ts:toggleFavoriteForPath <- src/lib/features/note-list/NoteRowMenu.svelte:261 in (markup) markup
sym src/lib/features/properties/lifecycle.service.ts:66 fn setTypeRailPin(definitionPath: string, pinned: boolean): Promise<void> L10 | Pins the type whose definition note is at `definitionPath` to the rail (`_rail: true`) or unpins it (the key removed), through `updateNoteFrontmatter`, so the …
by src/lib/features/properties/lifecycle.service.ts:setTypeRailPin <- src/lib/features/rail-shell/TypesNavigator.svelte:384 in (markup) markup
sym src/lib/features/properties/lifecycle.service.ts:78 fn toggleActiveNoteFavorite(): Promise<void> L3 | Flips `_favorite` on the active note.
by src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteFavorite <- src/lib/app/commands.ts:336 in getBuiltInCommands call
by src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteFavorite <- src/lib/app/global-keybindings.ts:195 in GLOBAL_KEYBINDINGS call
by src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteFavorite <- src/lib/features/note-action-bar/NoteActionBar.svelte:151 in (markup) markup
sym src/lib/features/properties/lifecycle.service.ts:83 fn toggleActiveNoteOrganized(): Promise<void> L3 | Flips `_organized` on the active note; `_archived` is left as-is.
by src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteOrganized <- src/lib/app/commands.ts:343 in getBuiltInCommands call
by src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteOrganized <- src/lib/app/global-keybindings.ts:201 in GLOBAL_KEYBINDINGS call
by src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteOrganized <- src/lib/features/note-action-bar/NoteActionBar.svelte:160 in (markup) markup
sym src/lib/features/properties/lifecycle.service.ts:91 fn toggleActiveNoteArchived(): Promise<void> L3 | Archives the active note, or restores it when archived.
by src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteArchived <- src/lib/features/note-action-bar/NoteActionBar.svelte:207 in (markup) markup
## locals
local src/lib/features/properties/lifecycle.service.ts:30 fn updateActiveNote(mutate: (props: Property[]) => Property[]): Promise<void> L12
## calls
call src/lib/features/properties/lifecycle.service.ts:32 in updateActiveNote -> src/lib/core/editor/editor.logic.ts:isMarkdownNoteTab call
call src/lib/features/properties/lifecycle.service.ts:34 in updateActiveNote -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh mcall
call src/lib/features/properties/lifecycle.service.ts:36 in updateActiveNote -> src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter call
call src/lib/features/properties/lifecycle.service.ts:39 in updateActiveNote -> src/lib/core/frontmatter/frontmatter-write.service.ts:toastFrontmatterWriteError call
call src/lib/features/properties/lifecycle.service.ts:50 in toggleFavoriteForPath -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh mcall
call src/lib/features/properties/lifecycle.service.ts:52 in toggleFavoriteForPath -> src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter call
call src/lib/features/properties/lifecycle.service.ts:52 in toggleFavoriteForPath -> src/lib/features/properties/lifecycle.logic.ts:toggleFavorite call
call src/lib/features/properties/lifecycle.service.ts:55 in toggleFavoriteForPath -> src/lib/core/frontmatter/frontmatter-write.service.ts:toastFrontmatterWriteError call
call src/lib/features/properties/lifecycle.service.ts:68 in setTypeRailPin -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh mcall
call src/lib/features/properties/lifecycle.service.ts:70 in setTypeRailPin -> src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter call
call src/lib/features/properties/lifecycle.service.ts:70 in setTypeRailPin -> src/lib/core/frontmatter/properties.logic.ts:removeProperty call
call src/lib/features/properties/lifecycle.service.ts:70 in setTypeRailPin -> src/lib/features/properties/lifecycle.logic.ts:setBooleanFlag call
call src/lib/features/properties/lifecycle.service.ts:73 in setTypeRailPin -> src/lib/core/frontmatter/frontmatter-write.service.ts:toastFrontmatterWriteError call
call src/lib/features/properties/lifecycle.service.ts:79 in toggleActiveNoteFavorite -> src/lib/features/properties/lifecycle.logic.ts:isFavorite call
call src/lib/features/properties/lifecycle.service.ts:79 in toggleActiveNoteFavorite -> src/lib/features/properties/lifecycle.logic.ts:toggleFavorite call
call src/lib/features/properties/lifecycle.service.ts:79 in toggleActiveNoteFavorite -> src/lib/features/properties/lifecycle.service.ts:updateActiveNote call
call src/lib/features/properties/lifecycle.service.ts:84 in toggleActiveNoteOrganized -> src/lib/features/properties/lifecycle.logic.ts:isOrganized call
call src/lib/features/properties/lifecycle.service.ts:84 in toggleActiveNoteOrganized -> src/lib/features/properties/lifecycle.logic.ts:toggleOrganized call
call src/lib/features/properties/lifecycle.service.ts:84 in toggleActiveNoteOrganized -> src/lib/features/properties/lifecycle.service.ts:updateActiveNote call
call src/lib/features/properties/lifecycle.service.ts:92 in toggleActiveNoteArchived -> src/lib/features/properties/lifecycle.logic.ts:getLifecycleState call
call src/lib/features/properties/lifecycle.service.ts:92 in toggleActiveNoteArchived -> src/lib/features/properties/lifecycle.logic.ts:toggleArchived call
call src/lib/features/properties/lifecycle.service.ts:92 in toggleActiveNoteArchived -> src/lib/features/properties/lifecycle.service.ts:updateActiveNote call
