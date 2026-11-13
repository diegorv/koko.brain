# file card src/lib/utils/color-presets.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/color-presets.ts ' codemap/files
file src/lib/utils/color-presets.ts other L30 module src/lib/utils in6 t1
## imported-by
imp src/lib/features/collection/expression/evaluator.ts:7 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG,COLOR_PRESET_TEXT
imp src/lib/plugins/kanban/KanbanCard.svelte:13 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG,COLOR_PRESET_TEXT
imp src/lib/plugins/kanban/KanbanCardText.svelte:3 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG,COLOR_PRESET_TEXT
imp src/lib/plugins/kanban/KanbanListView.svelte:6 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG
imp src/lib/plugins/kanban/KanbanTableView.svelte:6 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG,COLOR_PRESET_TEXT
imp src/lib/plugins/queryjs/kb-ui.ts:24 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG
## reach
in2 src/lib/utils/color-presets.ts 6 files in 4 modules: src/lib/features/collection(2) src/lib/plugins/kanban(2) src/lib/features/auto-organize(1) src/lib/plugins/queryjs(1)
out2 src/lib/utils/color-presets.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/color-presets.test.ts imports src/lib/utils/color-presets.ts mirror
## symbols
sym src/lib/utils/color-presets.ts:23 const COLOR_PRESET_BG: Record<string, string> L3 | Named color presets with background (low opacity) variant.
by src/lib/utils/color-presets.ts:COLOR_PRESET_BG <- src/lib/features/collection/expression/evaluator.ts:447 in evaluateCall ref +1
by src/lib/utils/color-presets.ts:COLOR_PRESET_BG <- src/lib/plugins/kanban/KanbanCard.svelte:159 in (markup) markup
by src/lib/utils/color-presets.ts:COLOR_PRESET_BG <- src/lib/plugins/kanban/KanbanCardText.svelte:38 in (markup) markup +1
by src/lib/utils/color-presets.ts:COLOR_PRESET_BG <- src/lib/plugins/kanban/KanbanListView.svelte:33 in (markup) markup
by src/lib/utils/color-presets.ts:COLOR_PRESET_BG <- src/lib/plugins/kanban/KanbanTableView.svelte:40 in (markup) markup +1
by src/lib/utils/color-presets.ts:COLOR_PRESET_BG <- src/lib/plugins/queryjs/kb-ui.ts:910 in KBUI.resolveCardColor ref
sym src/lib/utils/color-presets.ts:28 const COLOR_PRESET_TEXT: Record<string, string> L3 | Named color presets with full opacity for text/bars.
by src/lib/utils/color-presets.ts:COLOR_PRESET_TEXT <- src/lib/features/collection/expression/evaluator.ts:448 in evaluateCall ref +5
by src/lib/utils/color-presets.ts:COLOR_PRESET_TEXT <- src/lib/plugins/kanban/KanbanCard.svelte:244 in (markup) markup
by src/lib/utils/color-presets.ts:COLOR_PRESET_TEXT <- src/lib/plugins/kanban/KanbanCardText.svelte:38 in (markup) markup +2
by src/lib/utils/color-presets.ts:COLOR_PRESET_TEXT <- src/lib/plugins/kanban/KanbanTableView.svelte:60 in (markup) markup
## locals
local src/lib/utils/color-presets.ts:13 fn rgba([r, g, b]: [number, number, number], alpha: number): string L3
local src/lib/utils/color-presets.ts:18 fn rgb([r, g, b]: [number, number, number]): string L3
## calls
call src/lib/utils/color-presets.ts:24 in COLOR_PRESET_BG -> src/lib/utils/color-presets.ts:rgba call
call src/lib/utils/color-presets.ts:29 in COLOR_PRESET_TEXT -> src/lib/utils/color-presets.ts:rgb call
