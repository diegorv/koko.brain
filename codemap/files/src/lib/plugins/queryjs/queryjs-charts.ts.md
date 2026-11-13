# file card src/lib/plugins/queryjs/queryjs-charts.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/queryjs-charts.ts ' codemap/files
file src/lib/plugins/queryjs/queryjs-charts.ts other L31 module src/lib/plugins/queryjs in3 t3 | Chart.js instances created by `kb.ui.chart()`, by canvas.
## imported-by
imp src/lib/plugins/queryjs/kb-ui.ts:23 -> src/lib/plugins/queryjs/queryjs-charts.ts trackChart
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:11 -> src/lib/plugins/queryjs/queryjs-charts.ts destroyChartsIn
imp src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:44 -> src/lib/plugins/queryjs/queryjs-charts.ts destroyChartsIn
## reach
in2 src/lib/plugins/queryjs/queryjs-charts.ts 5 files in 2 modules: src/lib/plugins/queryjs(3) src/lib/app(2)
out2 src/lib/plugins/queryjs/queryjs-charts.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/queryjs/kb-ui.test.ts imports src/lib/plugins/queryjs/queryjs-charts.ts
test src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts imports src/lib/plugins/queryjs/queryjs-charts.ts
test src/tests/lib/plugins/queryjs/queryjs-session.store.test.ts imports src/lib/plugins/queryjs/queryjs-charts.ts
## symbols
sym src/lib/plugins/queryjs/queryjs-charts.ts:19 fn trackChart(canvas: HTMLCanvasElement, chart: DestroyableChart): void L3 | Records the chart drawn on `canvas` so `destroyChartsIn` can find it.
by src/lib/plugins/queryjs/queryjs-charts.ts:trackChart <- src/lib/plugins/queryjs/kb-ui.ts:672 in KBUI.chart call
sym src/lib/plugins/queryjs/queryjs-charts.ts:24 fn destroyChartsIn(root: HTMLElement): void L8 | Destroys every tracked chart whose canvas is inside `root`.
by src/lib/plugins/queryjs/queryjs-charts.ts:destroyChartsIn <- src/lib/plugins/queryjs/queryjs-block-widget.ts:186 in QueryjsBlockWidget.destroy call +3
by src/lib/plugins/queryjs/queryjs-charts.ts:destroyChartsIn <- src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:55 in dropResult call
