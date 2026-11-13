# file card src/lib/features/note-list/NoteRow.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/note-list/NoteRow.svelte ' codemap/files
file src/lib/features/note-list/NoteRow.svelte component L133 module src/lib/features/note-list in1 t3
## imports
imp src/lib/features/note-list/NoteRow.svelte:5 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/note-list/NoteRow.svelte:6 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/note-list/NoteRow.svelte:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/note-list/NoteRow.svelte:8 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/note-list/NoteRow.svelte:9 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/features/note-list/NoteRow.svelte:10 -> src/lib/features/file-icons/icon-resolver.ts type:ResolvedIcon
imp src/lib/features/note-list/NoteRow.svelte:11 -> src/lib/core/filesystem/wikilink-resolution.logic.ts resolveWikilink
imp src/lib/features/note-list/NoteRow.svelte:12 -> src/lib/features/type-definitions/type-sidebar.logic.ts splitPropertyIntoPills
imp src/lib/features/note-list/NoteRow.svelte:13 -> src/lib/features/note-list/note-row-menu.context.ts RENAME_SHORTCUT,useNoteRowMenuContext
imp src/lib/features/note-list/NoteRow.svelte:14 -> src/lib/features/note-list/note-row.types.ts type:NoteRowNote
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:57 -> src/lib/features/note-list/NoteRow.svelte default
## reach
in2 src/lib/features/note-list/NoteRow.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/note-list/NoteRow.svelte 22 files in 12 modules: src/lib/core/editor(4) src/lib/utils(4) src/lib/features/file-icons(3) src/lib/core/filesystem(2) src/lib/features/collection(2) +7 modules
## tests
test src/tests/lib/features/note-list/NoteRowMenu.favorite.test.ts harness src/lib/features/note-list/NoteRow.svelte via src/tests/fixtures/NoteRowMenuHarness.svelte
test src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts harness src/lib/features/note-list/NoteRow.svelte via src/tests/fixtures/NoteRowMenuHarness.svelte
test src/tests/lib/features/note-list/NoteRowMenu.test.ts harness src/lib/features/note-list/NoteRow.svelte via src/tests/fixtures/NoteRowMenuHarness.svelte
## symbols
sym src/lib/features/note-list/NoteRow.svelte:1 component NoteRow props:note,icon,isActive,listProperties,allPaths,typeName=,subtitle,italic=,archived=,fallbackIcon=,draggable= L133
by src/lib/features/note-list/NoteRow.svelte:default <- src/lib/features/rail-shell/RailNoteList.svelte:912 in (markup) mount
## mounts
mount src/lib/features/note-list/NoteRow.svelte:54 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/note-list/NoteRow.svelte:84 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
## mounted-at
mount src/lib/features/rail-shell/RailNoteList.svelte:912 NoteRow -> src/lib/features/note-list/NoteRow.svelte
## calls
call src/lib/features/note-list/NoteRow.svelte:44 in menu -> src/lib/features/note-list/note-row-menu.context.ts:useNoteRowMenuContext call
call src/lib/features/note-list/NoteRow.svelte:56 in (markup) -> src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle markup +1
call src/lib/features/note-list/NoteRow.svelte:71 in (markup) -> src/lib/core/editor/editor.service.ts:openFileInEditor markup +2
call src/lib/features/note-list/NoteRow.svelte:108 in (markup) -> src/lib/features/type-definitions/type-sidebar.logic.ts:splitPropertyIntoPills markup
call src/lib/features/note-list/NoteRow.svelte:111 in (markup) -> src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilink markup
