# file card src/lib/plugins/queryjs/kb-ui.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/kb-ui.types.ts ' codemap/files
file src/lib/plugins/queryjs/kb-ui.types.ts types L23 module src/lib/plugins/queryjs in1 t0
## imports
imp src/lib/plugins/queryjs/kb-ui.types.ts:3 -> src/lib/plugins/queryjs/contract/kb-api.v1.ts type:KBCardItemV1,type:KBCardsOptionsV1,type:KBProgressBarOptionsV1,type:KBHeatmapOptionsV1,type:KBTagsOptionsV1,type:KBTagCloudOptionsV1,type:KBStatusCardItemV1,type:KBStatusColorMapV1,type:KBStatusCardsOptionsV1,type:KBTimelineItemV1,type:KBTimelineOptionsV1,type:KBTableColumnAlignV1,type:KBUITableOptionsV1,type:KBChartTypeV1,type:KBChartDatasetV1,type:KBHeatmapCalendarEntryV1,type:KBHeatmapCalendarOptionsV1,type:KBYearlyCalendarOptionsV1,type:KBChartOptionsV1
## imported-by
imp src/lib/plugins/queryjs/kb-ui.ts:1 -> src/lib/plugins/queryjs/kb-ui.types.ts type:KBCardItem,type:KBCardsOptions,type:KBProgressBarOptions,type:KBHeatmapOptions,type:KBTagsOptions,type:KBTagCloudOptions,type:KBStatusCardItem,type:KBStatusCardsOptions,type:KBStatusColorMap,type:KBTimelineItem,type:KBTimelineOptions,type:KBUITableOptions,type:KBChartType,type:KBChartDataset,type:KBChartOptions,type:KBHeatmapCalendarEntry,type:KBHeatmapCalendarOptions,type:KBYearlyCalendarOptions
## reach
in2 src/lib/plugins/queryjs/kb-ui.types.ts 1 files in 1 modules: src/lib/plugins/queryjs(1)
out2 src/lib/plugins/queryjs/kb-ui.types.ts 0 files in 0 modules: -
## symbols
sym src/lib/plugins/queryjs/kb-ui.types.ts:4 reexport KBCardItem = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBCardItemV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:5 reexport KBCardsOptions = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBCardsOptionsV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:6 reexport KBProgressBarOptions = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBProgressBarOptionsV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:7 reexport KBHeatmapOptions = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBHeatmapOptionsV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:8 reexport KBTagsOptions = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBTagsOptionsV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:9 reexport KBTagCloudOptions = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBTagCloudOptionsV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:10 reexport KBStatusCardItem = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBStatusCardItemV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:11 reexport KBStatusColorMap = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBStatusColorMapV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:12 reexport KBStatusCardsOptions = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBStatusCardsOptionsV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:13 reexport KBTimelineItem = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBTimelineItemV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:14 reexport KBTimelineOptions = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBTimelineOptionsV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:15 reexport KBTableColumnAlign = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBTableColumnAlignV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:16 reexport KBUITableOptions = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBUITableOptionsV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:17 reexport KBChartType = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBChartTypeV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:18 reexport KBChartDataset = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBChartDatasetV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:19 reexport KBHeatmapCalendarEntry = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBHeatmapCalendarEntryV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:20 reexport KBHeatmapCalendarOptions = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBHeatmapCalendarOptionsV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:21 reexport KBYearlyCalendarOptions = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBYearlyCalendarOptionsV1 L1
sym src/lib/plugins/queryjs/kb-ui.types.ts:22 reexport KBChartOptions = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBChartOptionsV1 L1
