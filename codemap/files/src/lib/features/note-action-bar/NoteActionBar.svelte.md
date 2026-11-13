# file card src/lib/features/note-action-bar/NoteActionBar.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/note-action-bar/NoteActionBar.svelte ' codemap/files
file src/lib/features/note-action-bar/NoteActionBar.svelte component L236 module src/lib/features/note-action-bar in1 t1
## imports
imp src/lib/features/note-action-bar/NoteActionBar.svelte:18 -> src/lib/components/ui/dropdown-menu/index.ts DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator,DropdownMenuTrigger
imp src/lib/features/note-action-bar/NoteActionBar.svelte:25 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/note-action-bar/NoteActionBar.svelte:26 -> src/lib/core/editor/editor.service.ts toggleSourceMode
imp src/lib/features/note-action-bar/NoteActionBar.svelte:27 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/note-action-bar/NoteActionBar.svelte:28 -> src/lib/core/filesystem/delete-note.service.ts deleteNoteWithConfirm
imp src/lib/features/note-action-bar/NoteActionBar.svelte:29 -> src/lib/features/properties/lifecycle.service.ts toggleActiveNoteArchived,toggleActiveNoteFavorite,toggleActiveNoteOrganized
imp src/lib/features/note-action-bar/NoteActionBar.svelte:34 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/note-action-bar/NoteActionBar.svelte:35 -> src/lib/features/rail-shell/neighbourhood.service.ts openNeighbourhood
imp src/lib/features/note-action-bar/NoteActionBar.svelte:36 -> src/lib/utils/debug.ts error
imp src/lib/features/note-action-bar/NoteActionBar.svelte:37 -> src/lib/features/note-action-bar/note-action-bar.logic.ts HUB_ACTION_WIDTH,foldActions,getActionBarState,resolveHubAction,type:FoldableAction
imp src/lib/features/note-action-bar/NoteActionBar.svelte:38 -> src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts noteActionBarActionsStore
imp src/lib/features/note-action-bar/NoteActionBar.svelte:39 -> src/lib/features/note-action-bar/note-action-bar.service.ts copyNoteDeepLink,copyNotePath,createLinkedNote,revealNote,toggleWideNotes
## imported-by
imp src/lib/app/EditorView.svelte:22 -> src/lib/features/note-action-bar/NoteActionBar.svelte default
## reach
in2 src/lib/features/note-action-bar/NoteActionBar.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/note-action-bar/NoteActionBar.svelte 45 files in 15 modules: src/lib/components(17) src/lib/core/settings(4) src/lib/core/editor(3) src/lib/core/filesystem(3) src/lib/core/frontmatter(3) +10 modules
## tests
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/features/note-action-bar/NoteActionBar.svelte mirror
## symbols
sym src/lib/features/note-action-bar/NoteActionBar.svelte:1 component NoteActionBar props:path,onShowTableOfContents L236
by src/lib/features/note-action-bar/NoteActionBar.svelte:default <- src/lib/app/EditorView.svelte:69 in (markup) mount
## locals
local src/lib/features/note-action-bar/NoteActionBar.svelte:111 fn run(action: () => Promise<void>, name: string) L3
## mounts
mount src/lib/features/note-action-bar/NoteActionBar.svelte:187 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/features/note-action-bar/NoteActionBar.svelte:188 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/features/note-action-bar/NoteActionBar.svelte:191 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/features/note-action-bar/NoteActionBar.svelte:194 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/note-action-bar/NoteActionBar.svelte:199 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/note-action-bar/NoteActionBar.svelte:205 DropdownMenuSeparator -> src/lib/components/ui/dropdown-menu/dropdown-menu-separator.svelte
mount src/lib/features/note-action-bar/NoteActionBar.svelte:207 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/note-action-bar/NoteActionBar.svelte:216 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:69 NoteActionBar -> src/lib/features/note-action-bar/NoteActionBar.svelte
## calls
call src/lib/features/note-action-bar/NoteActionBar.svelte:56 in bar=$derived -> src/lib/features/note-action-bar/note-action-bar.logic.ts:getActionBarState call
call src/lib/features/note-action-bar/NoteActionBar.svelte:67 in hubButton=$derived -> src/lib/features/note-action-bar/note-action-bar.logic.ts:resolveHubAction call
call src/lib/features/note-action-bar/NoteActionBar.svelte:71 in hubButton=$derived -> src/lib/features/note-action-bar/NoteActionBar.svelte:run call +1
call src/lib/features/note-action-bar/NoteActionBar.svelte:73 in hubButton=$derived -> src/lib/features/note-action-bar/note-action-bar.service.ts:createLinkedNote call
call src/lib/features/note-action-bar/NoteActionBar.svelte:79 in fold=$derived -> src/lib/features/note-action-bar/note-action-bar.logic.ts:foldActions call
call src/lib/features/note-action-bar/NoteActionBar.svelte:90 in foldable=$derived -> src/lib/features/rail-shell/neighbourhood.service.ts:openNeighbourhood call
call src/lib/features/note-action-bar/NoteActionBar.svelte:96 in foldable=$derived -> src/lib/features/note-action-bar/note-action-bar.service.ts:toggleWideNotes ref
call src/lib/features/note-action-bar/NoteActionBar.svelte:102 in foldable=$derived -> src/lib/features/note-action-bar/NoteActionBar.svelte:run call +1
call src/lib/features/note-action-bar/NoteActionBar.svelte:102 in foldable=$derived -> src/lib/features/note-action-bar/note-action-bar.service.ts:revealNote call
call src/lib/features/note-action-bar/NoteActionBar.svelte:104 in foldable=$derived -> src/lib/features/note-action-bar/note-action-bar.service.ts:copyNotePath call
call src/lib/features/note-action-bar/NoteActionBar.svelte:112 in run -> src/lib/utils/debug.ts:error call
call src/lib/features/note-action-bar/NoteActionBar.svelte:151 in (markup) -> src/lib/features/note-action-bar/NoteActionBar.svelte:run markup +4
call src/lib/features/note-action-bar/NoteActionBar.svelte:151 in (markup) -> src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteFavorite markup
call src/lib/features/note-action-bar/NoteActionBar.svelte:160 in (markup) -> src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteOrganized markup
call src/lib/features/note-action-bar/NoteActionBar.svelte:178 in (markup) -> src/lib/core/editor/editor.service.ts:toggleSourceMode markup
call src/lib/features/note-action-bar/NoteActionBar.svelte:199 in (markup) -> src/lib/features/note-action-bar/note-action-bar.service.ts:copyNoteDeepLink markup
call src/lib/features/note-action-bar/NoteActionBar.svelte:207 in (markup) -> src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteArchived markup
call src/lib/features/note-action-bar/NoteActionBar.svelte:216 in (markup) -> src/lib/core/filesystem/delete-note.service.ts:deleteNoteWithConfirm markup
