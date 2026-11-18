# file card src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte ' codemap/files
file src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte component L93 module src/lib/plugins/kanban in2 t1
## imports
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:2 -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts detectWikilinkContext
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:3 -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts matchFilesForWikilink
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:4 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:5 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:6 -> src/lib/core/filesystem/wikilink-resolution.logic.ts isLinkTargetFile
## imported-by
imp src/lib/plugins/kanban/KanbanCard.svelte:17 -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte default
imp src/lib/plugins/kanban/KanbanLane.svelte:14 -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte default
## reach
in2 src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte 1 files in 1 modules: src/lib/plugins/kanban(1)
out2 src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte 5 files in 4 modules: src/lib/utils(2) src/lib/contracts(1) src/lib/core/filesystem(1) src/lib/core/markdown-editor(1)
## tests
test src/tests/lib/plugins/kanban/KanbanWikilinkSuggestions.test.ts imports src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte mirror
## symbols
sym src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:1 component KanbanWikilinkSuggestions props:text,cursorPos,onSelect,placement= L93
by src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:default <- src/lib/plugins/kanban/KanbanCard.svelte:228 in (markup) mount
by src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:default <- src/lib/plugins/kanban/KanbanLane.svelte:413 in (markup) mount
sym src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:44 method handleKeydown(e: KeyboardEvent): boolean L27 | Parent calls this on keydown.
## locals
local src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:72 fn selectItem(index: number) L7
## mounted-at
mount src/lib/plugins/kanban/KanbanCard.svelte:228 KanbanWikilinkSuggestions -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte
mount src/lib/plugins/kanban/KanbanLane.svelte:413 KanbanWikilinkSuggestions -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte
## calls
call src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:25 in context=$derived -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:detectWikilinkContext call
call src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:30 in files=$derived -> src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree call
call src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:30 in files=$derived -> src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile call
call src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:31 in files=$derived -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:matchFilesForWikilink call
call src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:58 in handleKeydown -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:selectItem call +1
call src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:86 in (markup) -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:selectItem markup
## effects
fx src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:37 svelte.$effect in (script)
