# file card src/lib/utils/color-presets.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/color-presets.ts ' codemap/files
file src/lib/utils/color-presets.ts other L61 module src/lib/utils in6 t4
## imported-by
imp src/lib/features/collection/expression/evaluator.ts:7 -> src/lib/utils/color-presets.ts COLOR_PRESET_BAR,COLOR_PRESET_BG,COLOR_PRESET_CHIP_TEXT,COLOR_PRESET_PLAIN_TEXT
imp src/lib/plugins/kanban/KanbanCard.svelte:15 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG,COLOR_PRESET_TEXT
imp src/lib/plugins/kanban/KanbanCardText.svelte:3 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG,COLOR_PRESET_CHIP_TEXT
imp src/lib/plugins/kanban/KanbanListView.svelte:6 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG
imp src/lib/plugins/kanban/KanbanTableView.svelte:6 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG,COLOR_PRESET_CHIP_TEXT
imp src/lib/plugins/queryjs/kb-ui.ts:24 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG
## reach
in2 src/lib/utils/color-presets.ts 6 files in 4 modules: src/lib/features/collection(2) src/lib/plugins/kanban(2) src/lib/features/auto-organize(1) src/lib/plugins/queryjs(1)
out2 src/lib/utils/color-presets.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/color-presets.test.ts imports src/lib/utils/color-presets.ts mirror
test src/tests/lib/features/collection/expression/evaluator.test.ts imports src/lib/utils/color-presets.ts
test src/tests/lib/features/collection/expression/methods.test.ts imports src/lib/utils/color-presets.ts
test src/tests/lib/tint-text-tokens.test.ts imports src/lib/utils/color-presets.ts
## symbols
sym src/lib/utils/color-presets.ts:23 const COLOR_PRESET_BG: Record<string, string> L3 | Named color presets with background (low opacity) variant.
by src/lib/utils/color-presets.ts:COLOR_PRESET_BG <- src/lib/features/collection/expression/evaluator.ts:447 in evaluateCall ref +1
by src/lib/utils/color-presets.ts:COLOR_PRESET_BG <- src/lib/plugins/kanban/KanbanCard.svelte:204 in (markup) markup +1
by src/lib/utils/color-presets.ts:COLOR_PRESET_BG <- src/lib/plugins/kanban/KanbanCardText.svelte:34 in (markup) markup +1
by src/lib/utils/color-presets.ts:COLOR_PRESET_BG <- src/lib/plugins/kanban/KanbanListView.svelte:33 in (markup) markup
by src/lib/utils/color-presets.ts:COLOR_PRESET_BG <- src/lib/plugins/kanban/KanbanTableView.svelte:43 in (markup) markup +1
by src/lib/utils/color-presets.ts:COLOR_PRESET_BG <- src/lib/plugins/queryjs/kb-ui.ts:922 in KBUI.resolveCardColor ref
sym src/lib/utils/color-presets.ts:28 const COLOR_PRESET_TEXT: Record<string, string> L3 | Named color presets with full opacity: the kanban color swatches, and the hue the text and bar mixes start from.
by src/lib/utils/color-presets.ts:COLOR_PRESET_TEXT <- src/lib/plugins/kanban/KanbanCard.svelte:312 in (markup) markup +1
sym src/lib/utils/color-presets.ts:39 const COLOR_PRESET_CHIP_TEXT: Record<string, string> L3 | Named color presets for text on a `COLOR_PRESET_BG` chip (kanban tags, the collection `badge()`): the preset mixed toward `--editor-fg`, so it keeps a hue cast…
by src/lib/utils/color-presets.ts:COLOR_PRESET_CHIP_TEXT <- src/lib/features/collection/expression/evaluator.ts:448 in evaluateCall ref +2
by src/lib/utils/color-presets.ts:COLOR_PRESET_CHIP_TEXT <- src/lib/plugins/kanban/KanbanCardText.svelte:34 in (markup) markup +1
by src/lib/utils/color-presets.ts:COLOR_PRESET_CHIP_TEXT <- src/lib/plugins/kanban/KanbanTableView.svelte:66 in (markup) markup
sym src/lib/utils/color-presets.ts:49 const COLOR_PRESET_PLAIN_TEXT: Record<string, string> L3 | Named color presets for text on the bare collection surface (`color()`): no tint sits under it, so it keeps more of the preset than chip text and the colors st…
by src/lib/utils/color-presets.ts:COLOR_PRESET_PLAIN_TEXT <- src/lib/features/collection/expression/evaluator.ts:463 in evaluateCall ref +1
sym src/lib/utils/color-presets.ts:59 const COLOR_PRESET_BAR: Record<string, string> L3 | Named color presets for a bar (the collection `progress()` fill and track outline): the preset moved toward `--editor-fg` until it reaches 3:1, the non-text mi…
by src/lib/utils/color-presets.ts:COLOR_PRESET_BAR <- src/lib/features/collection/expression/evaluator.ts:455 in evaluateCall ref +1
## locals
local src/lib/utils/color-presets.ts:13 fn rgba([r, g, b]: [number, number, number], alpha: number): string L3
local src/lib/utils/color-presets.ts:18 fn rgb([r, g, b]: [number, number, number]): string L3
## calls
call src/lib/utils/color-presets.ts:24 in COLOR_PRESET_BG -> src/lib/utils/color-presets.ts:rgba call
call src/lib/utils/color-presets.ts:29 in COLOR_PRESET_TEXT -> src/lib/utils/color-presets.ts:rgb call
call src/lib/utils/color-presets.ts:40 in COLOR_PRESET_CHIP_TEXT -> src/lib/utils/color-presets.ts:rgb call
call src/lib/utils/color-presets.ts:50 in COLOR_PRESET_PLAIN_TEXT -> src/lib/utils/color-presets.ts:rgb call
call src/lib/utils/color-presets.ts:60 in COLOR_PRESET_BAR -> src/lib/utils/color-presets.ts:rgb call
