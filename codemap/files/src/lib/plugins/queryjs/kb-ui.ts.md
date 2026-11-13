# file card src/lib/plugins/queryjs/kb-ui.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/kb-ui.ts ' codemap/files
file src/lib/plugins/queryjs/kb-ui.ts other L1069 module src/lib/plugins/queryjs in1 t2
## imports
imp src/lib/plugins/queryjs/kb-ui.ts:1 -> src/lib/plugins/queryjs/kb-ui.types.ts type:KBCardItem,type:KBCardsOptions,type:KBProgressBarOptions,type:KBHeatmapOptions,type:KBTagsOptions,type:KBTagCloudOptions,type:KBStatusCardItem,type:KBStatusCardsOptions,type:KBStatusColorMap,type:KBTimelineItem,type:KBTimelineOptions,type:KBUITableOptions,type:KBChartType,type:KBChartDataset,type:KBChartOptions,type:KBHeatmapCalendarEntry,type:KBHeatmapCalendarOptions,type:KBYearlyCalendarOptions
imp src/lib/plugins/queryjs/kb-ui.ts:21 -> src/lib/plugins/queryjs/contract/kb-api.v1.ts type:DataArrayV1,type:KBUIV1
imp src/lib/plugins/queryjs/kb-ui.ts:22 -> src/lib/plugins/queryjs/data-array.ts DataArray
imp src/lib/plugins/queryjs/kb-ui.ts:23 -> src/lib/plugins/queryjs/queryjs-charts.ts trackChart
imp src/lib/plugins/queryjs/kb-ui.ts:24 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG
imp src/lib/plugins/queryjs/kb-ui.ts:25 -> src/lib/utils/clamp.ts clamp
imp src/lib/plugins/queryjs/kb-ui.ts:26 -> src/lib/utils/font-stacks.ts APP_SANS_FONT_STACK
## imported-by
imp src/lib/plugins/queryjs/kb-api.ts:7 -> src/lib/plugins/queryjs/kb-ui.ts KBUI
## reach
in2 src/lib/plugins/queryjs/kb-ui.ts 3 files in 2 modules: src/lib/plugins/mods(2) src/lib/plugins/queryjs(1)
out2 src/lib/plugins/queryjs/kb-ui.ts 2 files in 1 modules: src/lib/plugins/queryjs(2)
## tests
test src/tests/lib/plugins/queryjs/kb-ui.test.ts imports src/lib/plugins/queryjs/kb-ui.ts mirror
test src/tests/lib/plugins/queryjs/kb-api-contract.test.ts imports src/lib/plugins/queryjs/kb-ui.ts
## symbols
sym src/lib/plugins/queryjs/kb-ui.ts:84 class KBUI L986 | UI render helpers for QueryJS.
by src/lib/plugins/queryjs/kb-ui.ts:KBUI <- src/lib/plugins/queryjs/kb-api.ts:152 in KBAPI.ui new
## calls
call src/lib/plugins/queryjs/kb-ui.ts:115 in KBUI.cards -> src/lib/plugins/queryjs/kb-ui.ts:KBUI.resolveCardColor call
call src/lib/plugins/queryjs/kb-ui.ts:158 in KBUI.progressBar -> src/lib/utils/clamp.ts:clamp call
call src/lib/plugins/queryjs/kb-ui.ts:565 in KBUI.chart -> src/lib/plugins/queryjs/kb-ui.ts:KBUI.isSquareChart call
call src/lib/plugins/queryjs/kb-ui.ts:584 in KBUI.chart -> src/lib/plugins/queryjs/kb-ui.ts:KBUI.loadChartJS call
call src/lib/plugins/queryjs/kb-ui.ts:606 in KBUI.chart -> src/lib/plugins/queryjs/kb-ui.ts:KBUI.expandDataset call
call src/lib/plugins/queryjs/kb-ui.ts:672 in KBUI.chart -> src/lib/plugins/queryjs/queryjs-charts.ts:trackChart call
call src/lib/plugins/queryjs/kb-ui.ts:687 in KBUI.heatmapCalendar -> src/lib/plugins/queryjs/kb-ui.ts:KBUI.calendarPreamble call
call src/lib/plugins/queryjs/kb-ui.ts:693 in KBUI.heatmapCalendar -> src/lib/plugins/queryjs/kb-ui.ts:KBUI.getDayOfYear call +1
call src/lib/plugins/queryjs/kb-ui.ts:701 in KBUI.heatmapCalendar -> src/lib/plugins/queryjs/kb-ui.ts:KBUI.getDayOfYearLocal call
call src/lib/plugins/queryjs/kb-ui.ts:730 in KBUI.heatmapCalendar -> src/lib/utils/clamp.ts:clamp call
call src/lib/plugins/queryjs/kb-ui.ts:818 in KBUI.yearlyCalendar -> src/lib/plugins/queryjs/kb-ui.ts:KBUI.calendarPreamble call
call src/lib/plugins/queryjs/kb-ui.ts:875 in KBUI.yearlyCalendar -> src/lib/utils/clamp.ts:clamp call
call src/lib/plugins/queryjs/kb-ui.ts:995 in KBUI.calendarPreamble -> src/lib/plugins/queryjs/kb-ui.ts:KBUI.mapRange call
call src/lib/plugins/queryjs/kb-ui.ts:1021 in KBUI.mapRange -> src/lib/utils/clamp.ts:clamp call
