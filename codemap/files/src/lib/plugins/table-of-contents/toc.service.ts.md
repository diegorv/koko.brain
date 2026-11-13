# file card src/lib/plugins/table-of-contents/toc.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/table-of-contents/toc.service.ts ' codemap/files
file src/lib/plugins/table-of-contents/toc.service.ts service L25 module src/lib/plugins/table-of-contents in2 t3
## imports
imp src/lib/plugins/table-of-contents/toc.service.ts:1 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/plugins/table-of-contents/toc.service.ts:2 -> src/lib/plugins/table-of-contents/toc.logic.ts extractTocHeadings
imp src/lib/plugins/table-of-contents/toc.service.ts:3 -> src/lib/plugins/table-of-contents/toc.store.svelte.ts tocStore
## imported-by
imp src/lib/app/EditorView.svelte:23 -> src/lib/plugins/table-of-contents/toc.service.ts showTableOfContents
imp src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:9 -> src/lib/plugins/table-of-contents/toc.service.ts rebuildToc
## reach
in2 src/lib/plugins/table-of-contents/toc.service.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/table-of-contents/toc.service.ts 5 files in 3 modules: src/lib/core/settings(3) src/lib/core/markdown-editor(1) src/lib/plugins/table-of-contents(1)
## tests
test src/tests/lib/plugins/table-of-contents/toc.service.test.ts imports src/lib/plugins/table-of-contents/toc.service.ts mirror
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/plugins/table-of-contents/toc.service.ts
test src/tests/lib/plugins/table-of-contents/TableOfContentsPanel.test.ts imports src/lib/plugins/table-of-contents/toc.service.ts
## symbols
sym src/lib/plugins/table-of-contents/toc.service.ts:9 fn rebuildToc(content: string | null): void L7 | Parses `content` into headings and updates `tocStore`.
by src/lib/plugins/table-of-contents/toc.service.ts:rebuildToc <- src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:37 in $effect@34 call
sym src/lib/plugins/table-of-contents/toc.service.ts:22 fn showTableOfContents(path: string): void L4 | Shows the right sidebar with the Table of contents section turned on and expanded on `path` (the action bar's TOC button).
by src/lib/plugins/table-of-contents/toc.service.ts:showTableOfContents <- src/lib/app/EditorView.svelte:69 in (markup) markup
## calls
call src/lib/plugins/table-of-contents/toc.service.ts:11 in rebuildToc -> src/lib/plugins/table-of-contents/toc.store.svelte.ts:tocStore.reset mcall
call src/lib/plugins/table-of-contents/toc.service.ts:14 in rebuildToc -> src/lib/plugins/table-of-contents/toc.logic.ts:extractTocHeadings call
call src/lib/plugins/table-of-contents/toc.service.ts:14 in rebuildToc -> src/lib/plugins/table-of-contents/toc.store.svelte.ts:tocStore.setHeadings mcall
call src/lib/plugins/table-of-contents/toc.service.ts:23 in showTableOfContents -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/plugins/table-of-contents/toc.service.ts:24 in showTableOfContents -> src/lib/plugins/table-of-contents/toc.store.svelte.ts:tocStore.setExpandedPath mcall
