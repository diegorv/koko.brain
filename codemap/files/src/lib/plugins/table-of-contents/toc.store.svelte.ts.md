# file card src/lib/plugins/table-of-contents/toc.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/table-of-contents/toc.store.svelte.ts ' codemap/files
file src/lib/plugins/table-of-contents/toc.store.svelte.ts store L27 module src/lib/plugins/table-of-contents in2 t5
## imports
imp src/lib/plugins/table-of-contents/toc.store.svelte.ts:1 -> src/lib/plugins/table-of-contents/toc.types.ts type:TocHeading
## imported-by
imp src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:8 -> src/lib/plugins/table-of-contents/toc.store.svelte.ts tocStore
imp src/lib/plugins/table-of-contents/toc.service.ts:3 -> src/lib/plugins/table-of-contents/toc.store.svelte.ts tocStore
## reach
in2 src/lib/plugins/table-of-contents/toc.store.svelte.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/plugins/table-of-contents/toc.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/table-of-contents/toc.store.test.ts imports src/lib/plugins/table-of-contents/toc.store.svelte.ts mirror
test src/tests/lib/app/EditorView.test.ts imports src/lib/plugins/table-of-contents/toc.store.svelte.ts
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/plugins/table-of-contents/toc.store.svelte.ts
test src/tests/lib/plugins/table-of-contents/TableOfContentsPanel.test.ts imports src/lib/plugins/table-of-contents/toc.store.svelte.ts
test src/tests/lib/plugins/table-of-contents/toc.service.test.ts imports src/lib/plugins/table-of-contents/toc.store.svelte.ts
## symbols
sym src/lib/plugins/table-of-contents/toc.store.svelte.ts:14 store tocStore L14 | Reactive store for the table-of-contents panel.
by src/lib/plugins/table-of-contents/toc.store.svelte.ts:tocStore <- src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:12 in expanded=$derived member +9
by src/lib/plugins/table-of-contents/toc.store.svelte.ts:tocStore <- src/lib/plugins/table-of-contents/toc.service.ts:11 in rebuildToc mcall +2
## store
store src/lib/plugins/table-of-contents/toc.store.svelte.ts:14 tocStore esc:0
mem src/lib/plugins/table-of-contents/toc.store.svelte.ts:15 get tocStore.headings r:src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:49,src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:53 w-via:setHeadings,reset
mem src/lib/plugins/table-of-contents/toc.store.svelte.ts:17 get tocStore.expandedPath r:src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:12,src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:22 w-via:setExpandedPath | The note the panel is expanded on, or null when collapsed.
mem src/lib/plugins/table-of-contents/toc.store.svelte.ts:20 do tocStore.setHeadings w:src/lib/plugins/table-of-contents/toc.service.ts:14 | Replaces the heading list (called by the service after parsing).
mem src/lib/plugins/table-of-contents/toc.store.svelte.ts:23 do tocStore.setExpandedPath w:src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:15,src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:23,src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:32,src/lib/plugins/table-of-contents/toc.service.ts:24 | Expands the panel on `path`, or collapses it with null.
mem src/lib/plugins/table-of-contents/toc.store.svelte.ts:26 do tocStore.reset w:src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:24,src/lib/plugins/table-of-contents/toc.service.ts:11 | Clears the heading list (no active file / non-markdown tab).
