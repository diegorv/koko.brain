# file card src/lib/core/filesystem/file-entries.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/filesystem/file-entries.logic.ts ' codemap/files
file src/lib/core/filesystem/file-entries.logic.ts logic L77 module src/lib/core/filesystem in12 t3
## imports
imp src/lib/core/filesystem/file-entries.logic.ts:1 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/core/filesystem/file-entries.logic.ts:2 -> src/lib/utils/fuzzy-match.ts fuzzyMatch
## imported-by
imp src/lib/app/editor-host.ts:7 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree,type:FileEntry
imp src/lib/core/filesystem/link-updater.service.ts:8 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree
imp src/lib/core/markdown-editor/editor-host.ts:3 -> src/lib/core/filesystem/file-entries.logic.ts type:FileEntry
imp src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:1 -> src/lib/core/filesystem/file-entries.logic.ts type:FileEntry
imp src/lib/features/canvas/CanvasFilePicker.svelte:3 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree,filterAndRank
imp src/lib/features/properties/PropertiesView.svelte:14 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree
imp src/lib/features/properties/RelationshipSearch.svelte:7 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree,filterAndRank
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:13 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree,filterAndRank
imp src/lib/features/rail-shell/RailNoteList.svelte:33 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:4 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree
imp src/lib/plugins/kanban/kanban.service.ts:8 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree
imp src/lib/plugins/quick-capture/composer-editor-host.service.ts:2 -> src/lib/core/filesystem/file-entries.logic.ts type:FileEntry
## reach
in2 src/lib/core/filesystem/file-entries.logic.ts 20 files in 7 modules: src/lib/core/markdown-editor(8) src/lib/app(6) src/lib/plugins/kanban(2) src/lib/core/filesystem(1) src/lib/features/canvas(1) +2 modules: q impact src/lib/core/filesystem/file-entries.logic.ts --depth 2
out2 src/lib/core/filesystem/file-entries.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/core/filesystem/file-entries.logic.test.ts imports src/lib/core/filesystem/file-entries.logic.ts mirror
test src/tests/lib/app/editor-host.test.ts imports src/lib/core/filesystem/file-entries.logic.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports src/lib/core/filesystem/file-entries.logic.ts
test src/tests/lib/core/markdown-editor/extensions/wikilink/completion.logic.test.ts imports-type src/lib/core/filesystem/file-entries.logic.ts
test src/tests/lib/plugins/quick-capture/composer-editor.test.ts imports-type src/lib/core/filesystem/file-entries.logic.ts
## symbols
sym src/lib/core/filesystem/file-entries.logic.ts:4 interface FileEntry L5
by src/lib/core/filesystem/file-entries.logic.ts:FileEntry <- src/lib/app/editor-host.ts:7 in (module) import
by src/lib/core/filesystem/file-entries.logic.ts:FileEntry <- src/lib/core/markdown-editor/editor-host.ts:3 in (module) import
by src/lib/core/filesystem/file-entries.logic.ts:FileEntry <- src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:1 in (module) import
by src/lib/core/filesystem/file-entries.logic.ts:FileEntry <- src/lib/plugins/quick-capture/composer-editor-host.service.ts:2 in (module) import
sym src/lib/core/filesystem/file-entries.logic.ts:10 fn flattenFileTree(nodes: FileTreeNode[]): FileEntry[] L17
by src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree <- src/lib/app/editor-host.ts:80 in treeLinkIndex call
by src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree <- src/lib/core/filesystem/link-updater.service.ts:41 in updateLinksAfterRename call
by src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree <- src/lib/features/canvas/CanvasFilePicker.svelte:21 in allFiles=$derived call
by src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree <- src/lib/features/properties/PropertiesView.svelte:61 in relLinksMap=$derived call
by src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree <- src/lib/features/properties/RelationshipSearch.svelte:24 in allFiles=$derived call
by src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree <- src/lib/features/quick-switcher/QuickSwitcher.svelte:21 in allFiles=$derived call
by src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree <- src/lib/features/rail-shell/RailNoteList.svelte:572 in allPaths=$derived call
by src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree <- src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:28 in files=$derived call
more by 1 not shown: src/lib/plugins/kanban(1): q importers src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree
sym src/lib/core/filesystem/file-entries.logic.ts:29 const MAX_RESULTS L1 | Maximum number of results rendered by the quick switcher.
sym src/lib/core/filesystem/file-entries.logic.ts:31 fn filterAndRank(query: string, files: FileEntry[], recentPaths: string[]): FileEntry[] L47
by src/lib/core/filesystem/file-entries.logic.ts:filterAndRank <- src/lib/features/canvas/CanvasFilePicker.svelte:25 in filtered=$derived call
by src/lib/core/filesystem/file-entries.logic.ts:filterAndRank <- src/lib/features/properties/RelationshipSearch.svelte:25 in results=$derived call
by src/lib/core/filesystem/file-entries.logic.ts:filterAndRank <- src/lib/features/quick-switcher/QuickSwitcher.svelte:23 in filteredFiles=$derived call
## calls
call src/lib/core/filesystem/file-entries.logic.ts:16 in flattenFileTree -> src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree call
call src/lib/core/filesystem/file-entries.logic.ts:53 in filterAndRank -> src/lib/utils/fuzzy-match.ts:fuzzyMatch call
