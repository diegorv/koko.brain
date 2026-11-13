# file card src/lib/app/EditorView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/EditorView.svelte ' codemap/files
file src/lib/app/EditorView.svelte component L159 module src/lib/app in1 t3
## imports
imp src/lib/app/EditorView.svelte:8 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/app/EditorView.svelte:9 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/EditorView.svelte:10 -> src/lib/core/editor/editor.service.ts onContentChange,onContentChangeForPath
imp src/lib/app/EditorView.svelte:11 -> src/lib/core/markdown-editor/EditorTabs.svelte default
imp src/lib/app/EditorView.svelte:12 -> src/lib/core/markdown-editor/MarkdownEditor.svelte default
imp src/lib/app/EditorView.svelte:13 -> src/lib/app/editor-host.ts appBlockLinks,appEditorHost,appFencedBlockRenderers,openWikilinkTarget
imp src/lib/app/EditorView.svelte:14 -> src/lib/features/collection/CollectionView.svelte default
imp src/lib/app/EditorView.svelte:15 -> src/lib/features/type-definitions/type-definitions.service.ts rewriteViewFile
imp src/lib/app/EditorView.svelte:16 -> src/lib/features/tasks/TasksView.svelte default
imp src/lib/app/EditorView.svelte:17 -> src/lib/features/tags/TagsView.svelte default
imp src/lib/app/EditorView.svelte:18 -> src/lib/plugins/graph-view/GraphView.svelte default
imp src/lib/app/EditorView.svelte:19 -> src/lib/features/canvas/CanvasView.svelte default
imp src/lib/app/EditorView.svelte:20 -> src/lib/plugins/kanban/KanbanView.svelte default
imp src/lib/app/EditorView.svelte:21 -> src/lib/features/event-calendar/EventCalendarView.svelte default
imp src/lib/app/EditorView.svelte:22 -> src/lib/features/note-action-bar/NoteActionBar.svelte default
imp src/lib/app/EditorView.svelte:23 -> src/lib/plugins/table-of-contents/toc.service.ts showTableOfContents
imp src/lib/app/EditorView.svelte:24 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/app/EditorView.svelte:25 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/app/EditorView.svelte:26 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/app/EditorView.svelte:27 -> src/lib/core/editor/editor.logic.ts isMarkdownNoteTab,isVirtualTab
imp src/lib/app/EditorView.svelte:28 -> src/lib/core/editor/editor.types.ts type:EditorTab
## imported-by
imp src/lib/app/AppShell.svelte:40 -> src/lib/app/EditorView.svelte default
## reach
in2 src/lib/app/EditorView.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/app/EditorView.svelte 133 files in 29 modules: src/lib/features/collection(18) src/lib/features/event-calendar(12) src/lib/features/tasks(12) src/lib/core/markdown-editor(11) src/lib/utils(10) +24 modules
## tests
test src/tests/lib/app/EditorView.test.ts imports src/lib/app/EditorView.svelte mirror
test src/tests/lib/features/canvas/canvas-tab-switch.test.ts imports src/lib/app/EditorView.svelte
test src/tests/lib/features/collection/CollectionView.view-writes.test.ts imports src/lib/app/EditorView.svelte
## symbols
sym src/lib/app/EditorView.svelte:1 component EditorView L159
by src/lib/app/EditorView.svelte:default <- src/lib/app/AppShell.svelte:262 in (markup) mount
## mounts
mount src/lib/app/EditorView.svelte:59 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/app/EditorView.svelte:67 EditorTabs -> src/lib/core/markdown-editor/EditorTabs.svelte
mount src/lib/app/EditorView.svelte:69 NoteActionBar -> src/lib/features/note-action-bar/NoteActionBar.svelte
mount src/lib/app/EditorView.svelte:73 TasksView -> src/lib/features/tasks/TasksView.svelte
mount src/lib/app/EditorView.svelte:75 TagsView -> src/lib/features/tags/TagsView.svelte
mount src/lib/app/EditorView.svelte:77 GraphView -> src/lib/plugins/graph-view/GraphView.svelte
mount src/lib/app/EditorView.svelte:79 EventCalendarView -> src/lib/features/event-calendar/EventCalendarView.svelte
mount src/lib/app/EditorView.svelte:81 KanbanView -> src/lib/plugins/kanban/KanbanView.svelte
mount src/lib/app/EditorView.svelte:85 CanvasView -> src/lib/features/canvas/CanvasView.svelte
mount src/lib/app/EditorView.svelte:90 CollectionView -> src/lib/features/collection/CollectionView.svelte
mount src/lib/app/EditorView.svelte:93 MarkdownEditor -> src/lib/core/markdown-editor/MarkdownEditor.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:262 EditorView -> src/lib/app/EditorView.svelte
## calls
call src/lib/app/EditorView.svelte:44 in isVirtual=$derived -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/lib/app/EditorView.svelte:45 in isMarkdownNote=$derived -> src/lib/core/editor/editor.logic.ts:isMarkdownNoteTab call
call src/lib/app/EditorView.svelte:57 in (markup) -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath markup +1
call src/lib/app/EditorView.svelte:61 in (markup) -> src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle markup
call src/lib/app/EditorView.svelte:69 in (markup) -> src/lib/plugins/table-of-contents/toc.service.ts:showTableOfContents markup
call src/lib/app/EditorView.svelte:73 in (markup) -> src/lib/app/editor-host.ts:openWikilinkTarget markup +1
call src/lib/app/EditorView.svelte:81 in (markup) -> src/lib/core/editor/editor.service.ts:onContentChange markup +1
call src/lib/app/EditorView.svelte:85 in (markup) -> src/lib/core/editor/editor.service.ts:onContentChangeForPath markup
call src/lib/app/EditorView.svelte:90 in (markup) -> src/lib/features/type-definitions/type-definitions.service.ts:rewriteViewFile markup
call src/lib/app/EditorView.svelte:140 in (markup) -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setLivePreview markup
## effects
fx src/lib/app/EditorView.svelte:48 svelte.$effect in (script)
