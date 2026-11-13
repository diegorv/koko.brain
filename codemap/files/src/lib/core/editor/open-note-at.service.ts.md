# file card src/lib/core/editor/open-note-at.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/editor/open-note-at.service.ts ' codemap/files
file src/lib/core/editor/open-note-at.service.ts service L49 module src/lib/core/editor in5 t3
## imports
imp src/lib/core/editor/open-note-at.service.ts:1 -> src/lib/utils/clamp.ts clamp
imp src/lib/core/editor/open-note-at.service.ts:2 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/core/editor/open-note-at.service.ts:3 -> src/lib/core/editor/editor.logic.ts lineStartToOffset
imp src/lib/core/editor/open-note-at.service.ts:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
## imported-by
imp src/lib/features/event-calendar/EventTaskChip.svelte:4 -> src/lib/core/editor/open-note-at.service.ts openNoteAt
imp src/lib/features/search/SearchResult.svelte:4 -> src/lib/core/editor/open-note-at.service.ts openNoteAt
imp src/lib/features/tasks/TasksView.svelte:28 -> src/lib/core/editor/open-note-at.service.ts openNoteAt
imp src/lib/plugins/mods/mod-app.service.ts:3 -> src/lib/core/editor/open-note-at.service.ts openNoteAt
imp src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:6 -> src/lib/core/editor/open-note-at.service.ts openNoteAt
## reach
in2 src/lib/core/editor/open-note-at.service.ts 6 files in 4 modules: src/lib/app(2) src/lib/features/event-calendar(2) src/lib/features/search(1) src/lib/plugins/mods(1)
out2 src/lib/core/editor/open-note-at.service.ts 8 files in 4 modules: src/lib/utils(4) src/lib/core/editor(2) src/lib/core/filesystem(1) src/lib/core/markdown-editor(1)
## tests
test src/tests/lib/core/editor/open-note-at.test.ts imports src/lib/core/editor/open-note-at.service.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/core/editor/open-note-at.service.ts
test src/tests/lib/plugins/table-of-contents/TableOfContentsPanel.test.ts mocks src/lib/core/editor/open-note-at.service.ts
## symbols
sym src/lib/core/editor/open-note-at.service.ts:13 type NoteTarget L3 | Where inside a note to place the caret.
sym src/lib/core/editor/open-note-at.service.ts:35 fn openNoteAt(path: string | null, target: NoteTarget): Promise<void> L15 | Single owner of "open this note and put the caret at this position".
by src/lib/core/editor/open-note-at.service.ts:openNoteAt <- src/lib/features/event-calendar/EventTaskChip.svelte:34 in (markup) markup
by src/lib/core/editor/open-note-at.service.ts:openNoteAt <- src/lib/features/search/SearchResult.svelte:112 in handleClick call +2
by src/lib/core/editor/open-note-at.service.ts:openNoteAt <- src/lib/features/tasks/TasksView.svelte:266 in handleTextClick call +2
by src/lib/core/editor/open-note-at.service.ts:openNoteAt <- src/lib/plugins/mods/mod-app.service.ts:32 in MOD_APP ref
by src/lib/core/editor/open-note-at.service.ts:openNoteAt <- src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:60 in (markup) markup
## calls
call src/lib/core/editor/open-note-at.service.ts:39 in openNoteAt -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/core/editor/open-note-at.service.ts:46 in openNoteAt -> src/lib/core/editor/editor.logic.ts:lineStartToOffset call
call src/lib/core/editor/open-note-at.service.ts:48 in openNoteAt -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setPendingScrollPosition mcall
call src/lib/core/editor/open-note-at.service.ts:48 in openNoteAt -> src/lib/utils/clamp.ts:clamp call
