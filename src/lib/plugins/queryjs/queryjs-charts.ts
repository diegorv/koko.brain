/**
 * Chart.js instances created by `kb.ui.chart()`, by canvas.
 *
 * Chart.js keeps every chart in a module-level registry until `destroy()`
 * runs, so a cached result that is dropped without destroying its charts
 * keeps its canvases alive for the session. The session store and the block
 * widget call `destroyChartsIn` when a result leaves the cache for good.
 * Kept apart from `kb-ui.ts` so disposing never loads Chart.js.
 */

/** The part of a Chart.js instance disposal needs. */
interface DestroyableChart {
	destroy(): void;
}

const chartByCanvas = new WeakMap<HTMLCanvasElement, DestroyableChart>();

/** Records the chart drawn on `canvas` so `destroyChartsIn` can find it. */
export function trackChart(canvas: HTMLCanvasElement, chart: DestroyableChart): void {
	chartByCanvas.set(canvas, chart);
}

/** Destroys every tracked chart whose canvas is inside `root`. Safe to call twice. */
export function destroyChartsIn(root: HTMLElement): void {
	for (const canvas of root.querySelectorAll('canvas')) {
		const chart = chartByCanvas.get(canvas);
		if (!chart) continue;
		chartByCanvas.delete(canvas);
		chart.destroy();
	}
}
