# file card src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte ' codemap/files
file src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte component L91 module src/lib/plugins/kanban in2 t1
## imports
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:2 -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts detectWikilinkContext
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:3 -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts matchFilesForWikilink
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:4 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:5 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:6 -> src/lib/core/filesystem/wikilink-resolution.logic.ts isLinkTargetFile
## imported-by
imp src/lib/plugins/kanban/KanbanCard.svelte:16 -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte default
imp src/lib/plugins/kanban/KanbanLane.svelte:14 -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte default
## reach
in2 src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte 1 files in 1 modules: src/lib/plugins/kanban(1)
out2 src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte 4 files in 4 modules: src/lib/contracts(1) src/lib/core/filesystem(1) src/lib/core/markdown-editor(1) src/lib/utils(1)
## tests
test src/tests/lib/plugins/kanban/KanbanWikilinkSuggestions.test.ts imports src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte mirror
## symbols
sym src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:1 component KanbanWikilinkSuggestions props:text,cursorPos,onSelect L91
by src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:default <- src/lib/plugins/kanban/KanbanCard.svelte:190 in (markup) mount
by src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:default <- src/lib/plugins/kanban/KanbanLane.svelte:368 in (markup) mount
sym src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:42 method handleKeydown(e: KeyboardEvent): boolean L27 | Parent calls this on keydown.
## locals
local src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:70 fn selectItem(index: number) L7
## mounted-at
mount src/lib/plugins/kanban/KanbanCard.svelte:190 KanbanWikilinkSuggestions -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte
mount src/lib/plugins/kanban/KanbanLane.svelte:368 KanbanWikilinkSuggestions -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte
## calls
call src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:23 in context=$derived -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:detectWikilinkContext call
call src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:28 in files=$derived -> src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree call
call src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:28 in files=$derived -> src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile call
call src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:29 in files=$derived -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:matchFilesForWikilink call
call src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:56 in handleKeydown -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:selectItem call +1
call src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:84 in (markup) -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:selectItem markup
## effects
fx src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:35 svelte.$effect in (script)
