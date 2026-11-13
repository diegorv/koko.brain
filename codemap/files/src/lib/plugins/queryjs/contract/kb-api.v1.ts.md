# file card src/lib/plugins/queryjs/contract/kb-api.v1.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/contract/kb-api.v1.ts ' codemap/files
file src/lib/plugins/queryjs/contract/kb-api.v1.ts other L739 module src/lib/plugins/queryjs in6 t0 | QueryJS scripting API, contract version 1: the public surface user scripts see as `kb` / `dv` (ADR-0010 amendment 2026-11-01).
## imported-by
imp src/lib/plugins/queryjs/data-array.ts:2 -> src/lib/plugins/queryjs/contract/kb-api.v1.ts type:DataArrayV1,type:KBDateTimeV1
imp src/lib/plugins/queryjs/kb-api.ts:4 -> src/lib/plugins/queryjs/contract/kb-api.v1.ts type:DataArrayV1,type:KBApiV1,type:KBDateTimeV1
imp src/lib/plugins/queryjs/kb-datetime.ts:6 -> src/lib/plugins/queryjs/contract/kb-api.v1.ts type:KBDateTimeV1
imp src/lib/plugins/queryjs/kb-ui.ts:21 -> src/lib/plugins/queryjs/contract/kb-api.v1.ts type:DataArrayV1,type:KBUIV1
imp src/lib/plugins/queryjs/kb-ui.types.ts:3 -> src/lib/plugins/queryjs/contract/kb-api.v1.ts type:KBCardItemV1,type:KBCardsOptionsV1,type:KBProgressBarOptionsV1,type:KBHeatmapOptionsV1,type:KBTagsOptionsV1,type:KBTagCloudOptionsV1,type:KBStatusCardItemV1,type:KBStatusColorMapV1,type:KBStatusCardsOptionsV1,type:KBTimelineItemV1,type:KBTimelineOptionsV1,type:KBTableColumnAlignV1,type:KBUITableOptionsV1,type:KBChartTypeV1,type:KBChartDatasetV1,type:KBHeatmapCalendarEntryV1,type:KBHeatmapCalendarOptionsV1,type:KBYearlyCalendarOptionsV1,type:KBChartOptionsV1
imp src/lib/plugins/queryjs/queryjs.types.ts:3 -> src/lib/plugins/queryjs/contract/kb-api.v1.ts type:KBLinkV1,type:KBElOptionsV1,type:KBPageV1,type:KBTaskV1,type:AggregateStatsV1
## reach
in2 src/lib/plugins/queryjs/contract/kb-api.v1.ts 4 files in 2 modules: src/lib/plugins/mods(2) src/lib/plugins/queryjs(2)
out2 src/lib/plugins/queryjs/contract/kb-api.v1.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/queryjs/kb-api-contract.test.ts imports-type src/lib/plugins/queryjs/contract/kb-api.v1.ts
test src/tests/lib/plugins/queryjs/kbapi-firewall.test.ts imports-type src/lib/plugins/queryjs/contract/kb-api.v1.ts
## symbols
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:32 interface KBLinkV1 L6 | Clickable link to a file
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBLinkV1 <- src/lib/plugins/queryjs/kb-api.ts:3 in (module) import
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBLinkV1 <- src/lib/plugins/queryjs/queryjs.logic.ts:2 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:40 interface KBTaskV1 L10 | A task extracted from a page's content
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBTaskV1 <- src/lib/plugins/queryjs/queryjs.logic.ts:2 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:52 interface KBPageFileV1 L26 | File metadata of a page (`page.file`)
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:88 type KBPageRootKeyV1 L10 | Every key the app puts on a page root beside the note's own frontmatter keys.
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:113 interface KBPageV1 L9 | Page object representing a single note, returned by kb.pages() and kb.current().
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBPageV1 <- src/lib/plugins/queryjs/kb-api.ts:3 in (module) import
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBPageV1 <- src/lib/plugins/queryjs/queryjs.logic.ts:2 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:124 interface KBElOptionsV1 L6 | Options for kb.el()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBElOptionsV1 <- src/lib/plugins/queryjs/kb-api.ts:3 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:132 interface AggregateStatsV1 L12 | Bundle of aggregate statistics from DataArray.stats()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:AggregateStatsV1 <- src/lib/plugins/queryjs/data-array.ts:1 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:148 interface KBDurationV1 L12 | Duration accepted by KBDateTimeV1.plus() / minus()
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:162 type KBDateUnitV1 L1 | Unit accepted by KBDateTimeV1.startOf() / endOf()
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:165 interface KBDateTimeV1 L38 | Lightweight Luxon-compatible date wrapper returned by kb.date() / kb.tryDate()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBDateTimeV1 <- src/lib/plugins/queryjs/data-array.ts:2 in (module) import
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBDateTimeV1 <- src/lib/plugins/queryjs/kb-api.ts:4 in (module) import
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBDateTimeV1 <- src/lib/plugins/queryjs/kb-datetime.ts:6 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:212 interface DataArrayV1 L82 | Chainable array wrapper, the implementable part.
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:DataArrayV1 <- src/lib/plugins/queryjs/data-array.ts:2 in (module) import
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:DataArrayV1 <- src/lib/plugins/queryjs/kb-api.ts:4 in (module) import
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:DataArrayV1 <- src/lib/plugins/queryjs/kb-ui.ts:21 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:341 type ScriptDataArrayV1 L2 | What a script holds at runtime: the DataArray Proxy, where any name that is not a DataArrayV1 member maps that property across the items (`kb.pages().file.link…
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:385 interface KBCardItemV1 L10 | Configuration for a single stat card in a cards grid
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBCardItemV1 <- src/lib/plugins/queryjs/kb-ui.ts:2 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:397 interface KBCardsOptionsV1 L6 | Options for kb.ui.cards()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBCardsOptionsV1 <- src/lib/plugins/queryjs/kb-ui.ts:3 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:405 interface KBProgressBarOptionsV1 L10 | Options for kb.ui.progressBar()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBProgressBarOptionsV1 <- src/lib/plugins/queryjs/kb-ui.ts:4 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:417 interface KBHeatmapOptionsV1 L18 | Options for kb.ui.heatmap()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBHeatmapOptionsV1 <- src/lib/plugins/queryjs/kb-ui.ts:5 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:437 interface KBTagsOptionsV1 L10 | Options for kb.ui.tags()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBTagsOptionsV1 <- src/lib/plugins/queryjs/kb-ui.ts:6 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:449 interface KBTagCloudOptionsV1 L10 | Options for kb.ui.tagCloud()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBTagCloudOptionsV1 <- src/lib/plugins/queryjs/kb-ui.ts:7 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:461 interface KBStatusCardItemV1 L8 | Configuration for a single status card
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBStatusCardItemV1 <- src/lib/plugins/queryjs/kb-ui.ts:8 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:471 interface KBStatusColorMapV1 L8 | Color mapping for status cards
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBStatusColorMapV1 <- src/lib/plugins/queryjs/kb-ui.ts:10 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:481 interface KBStatusCardsOptionsV1 L4 | Options for kb.ui.statusCards()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBStatusCardsOptionsV1 <- src/lib/plugins/queryjs/kb-ui.ts:9 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:487 interface KBTimelineItemV1 L10 | Configuration for a single timeline entry
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBTimelineItemV1 <- src/lib/plugins/queryjs/kb-ui.ts:11 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:499 interface KBTimelineOptionsV1 L4 | Options for kb.ui.timeline()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBTimelineOptionsV1 <- src/lib/plugins/queryjs/kb-ui.ts:12 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:505 type KBTableColumnAlignV1 L1 | Column alignment for kb.ui.table()
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:508 interface KBUITableOptionsV1 L17 | Options for kb.ui.table()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBUITableOptionsV1 <- src/lib/plugins/queryjs/kb-ui.ts:13 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:527 type KBChartTypeV1 L1 | Supported Chart.js chart types for kb.ui.chart()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBChartTypeV1 <- src/lib/plugins/queryjs/kb-ui.ts:14 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:530 interface KBChartDatasetV1 L8 | A single dataset for kb.ui.chart()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBChartDatasetV1 <- src/lib/plugins/queryjs/kb-ui.ts:15 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:540 interface KBHeatmapCalendarEntryV1 L10 | A single entry for the heatmap calendar
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBHeatmapCalendarEntryV1 <- src/lib/plugins/queryjs/kb-ui.ts:17 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:552 interface KBHeatmapCalendarOptionsV1 L16 | Options for kb.ui.heatmapCalendar()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBHeatmapCalendarOptionsV1 <- src/lib/plugins/queryjs/kb-ui.ts:18 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:570 interface KBYearlyCalendarOptionsV1 L14 | Options for kb.ui.yearlyCalendar()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBYearlyCalendarOptionsV1 <- src/lib/plugins/queryjs/kb-ui.ts:19 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:586 interface KBChartOptionsV1 L18 | Options for kb.ui.chart()
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBChartOptionsV1 <- src/lib/plugins/queryjs/kb-ui.ts:16 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:608 interface KBUIV1 L34 | UI render helpers (`kb.ui`).
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBUIV1 <- src/lib/plugins/queryjs/kb-ui.ts:21 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:646 interface KBApiV1 L59 | The `kb` (and legacy `dv`) object a QueryJS script receives
by src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBApiV1 <- src/lib/plugins/queryjs/kb-api.ts:4 in (module) import
sym src/lib/plugins/queryjs/contract/kb-api.v1.ts:716 type KBScriptApiV1 L24 | KBApiV1 as a script sees it: the DataArray-returning members give the script view, so the property shorthand type-checks.
