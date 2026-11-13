# file card src/lib/utils/clamp.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/clamp.ts ' codemap/files
file src/lib/utils/clamp.ts other L9 module src/lib/utils in10 t1
## imported-by
imp src/lib/core/editor/open-note-at.service.ts:1 -> src/lib/utils/clamp.ts clamp
imp src/lib/core/settings/sections/FileHistorySection.svelte:4 -> src/lib/utils/clamp.ts clamp
imp src/lib/core/settings/settings.logic.ts:1 -> src/lib/utils/clamp.ts clamp
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:17 -> src/lib/utils/clamp.ts clamp
imp src/lib/features/collection/expression/evaluator.ts:8 -> src/lib/utils/clamp.ts clamp
imp src/lib/features/rail-shell/rail-items.logic.ts:1 -> src/lib/utils/clamp.ts clamp
imp src/lib/plugins/kanban/KanbanLane.svelte:16 -> src/lib/utils/clamp.ts clamp
imp src/lib/plugins/kanban/kanban.logic.ts:1 -> src/lib/utils/clamp.ts clamp
imp src/lib/plugins/queryjs/kb-api.ts:12 -> src/lib/utils/clamp.ts clamp
imp src/lib/plugins/queryjs/kb-ui.ts:25 -> src/lib/utils/clamp.ts clamp
## reach
in2 src/lib/utils/clamp.ts 33 files in 14 modules: src/lib/plugins/kanban(7) src/lib/core/settings(5) src/lib/app(4) src/lib/features/event-calendar(4) src/lib/features/collection(2) +9 modules: q impact src/lib/utils/clamp.ts --depth 2
out2 src/lib/utils/clamp.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/clamp.test.ts imports src/lib/utils/clamp.ts mirror
## symbols
sym src/lib/utils/clamp.ts:7 fn clamp(value: number, min: number, max: number): number L3 | Clamps `value` into the inclusive range `[min, max]`.
by src/lib/utils/clamp.ts:clamp <- src/lib/core/editor/open-note-at.service.ts:48 in openNoteAt call
by src/lib/utils/clamp.ts:clamp <- src/lib/core/settings/sections/FileHistorySection.svelte:9 in clampRetentionDays call
by src/lib/utils/clamp.ts:clamp <- src/lib/core/settings/settings.logic.ts:68 in clampFontSize call +8
by src/lib/utils/clamp.ts:clamp <- src/lib/features/auto-organize/AutoOrganizeSection.svelte:30 in clampDebounce call
by src/lib/utils/clamp.ts:clamp <- src/lib/features/collection/expression/evaluator.ts:456 in evaluateCall call
by src/lib/utils/clamp.ts:clamp <- src/lib/features/rail-shell/rail-items.logic.ts:155 in parseRailWidth call
by src/lib/utils/clamp.ts:clamp <- src/lib/plugins/kanban/KanbanLane.svelte:204 in handleResizeMove call
by src/lib/utils/clamp.ts:clamp <- src/lib/plugins/kanban/kanban.logic.ts:449 in moveItem call +1
more by 2 not shown: src/lib/plugins/queryjs(2): q importers src/lib/utils/clamp.ts:clamp
