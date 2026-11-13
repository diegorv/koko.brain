# file card src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte ' codemap/files
file src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte component L82 module src/lib/plugins/table-of-contents in1 t1
## imports
imp src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:4 -> src/lib/components/ui/separator/index.ts Separator
imp src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:5 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:6 -> src/lib/core/editor/open-note-at.service.ts openNoteAt
imp src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:7 -> src/lib/core/layout/SidebarSection.svelte default
imp src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:8 -> src/lib/plugins/table-of-contents/toc.store.svelte.ts tocStore
imp src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:9 -> src/lib/plugins/table-of-contents/toc.service.ts rebuildToc
## imported-by
imp src/lib/app/AppShell.svelte:47 -> src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte default
## reach
in2 src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte 9 files in 5 modules: src/lib/core/editor(3) src/lib/components(2) src/lib/plugins/table-of-contents(2) src/lib/core/settings(1) src/lib/utils(1)
## tests
test src/tests/lib/plugins/table-of-contents/TableOfContentsPanel.test.ts imports src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte mirror
## symbols
sym src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:1 component TableOfContentsPanel L82
by src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:default <- src/lib/app/AppShell.svelte:282 in (markup) mount
## locals
local src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:14 fn setExpanded(open: boolean) L3
## mounts
mount src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:46 SidebarSection -> src/lib/core/layout/SidebarSection.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:282 TableOfContentsPanel -> src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte
## calls
call src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:15 in setExpanded -> src/lib/plugins/table-of-contents/toc.store.svelte.ts:tocStore.setExpandedPath mcall
call src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:23 in $effect@19 -> src/lib/plugins/table-of-contents/toc.store.svelte.ts:tocStore.setExpandedPath mcall
call src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:24 in $effect@19 -> src/lib/plugins/table-of-contents/toc.store.svelte.ts:tocStore.reset mcall
call src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:32 in (script) -> src/lib/plugins/table-of-contents/toc.store.svelte.ts:tocStore.setExpandedPath mcall
call src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:37 in $effect@34 -> src/lib/plugins/table-of-contents/toc.service.ts:rebuildToc call
call src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:46 in (markup) -> src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:setExpanded markup
call src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:60 in (markup) -> src/lib/core/editor/open-note-at.service.ts:openNoteAt markup
## effects
fx src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:19 svelte.$effect in (script)
fx src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:34 svelte.$effect in (script)
