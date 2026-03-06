/** Configuration for a single stat card in a cards grid */
export interface KBCardItem {
	/** Display label (e.g., "Total Notes") */
	label: string;
	/** Numeric or string value to display prominently */
	value: string | number;
	/** Background color — named preset ('blue', 'green', 'orange', 'red', 'purple', 'yellow', 'gray') or CSS color string */
	color?: string;
	/** Optional icon/emoji to show above the value */
	icon?: string;
}

/** Options for kb.ui.cards() */
export interface KBCardsOptions {
	/** Number of columns in the grid (default: items.length, max 6) */
	columns?: number;
	/** Card border radius in px (default: 8) */
	borderRadius?: number;
}

/** Options for kb.ui.progressBar() */
export interface KBProgressBarOptions {
	/** Character for filled portion (default: "\u2588") */
	fillChar?: string;
	/** Character for empty portion (default: "\u2591") */
	emptyChar?: string;
	/** Whether to append the numeric value after the bar (default: true) */
	showValue?: boolean;
	/** Total width in characters (default: max) */
	width?: number;
}

/** Options for kb.ui.heatmap() */
export interface KBHeatmapOptions<T> {
	/** Function to extract the numeric value from each item */
	value: (item: T) => number;
	/** Function to extract the display label for each cell */
	label?: (item: T) => string;
	/** Function to extract the tooltip text for each cell */
	tooltip?: (item: T) => string;
	/** Maximum value for the color scale (default: auto-detected) */
	max?: number;
	/** Minimum value for the color scale (default: 0) */
	min?: number;
	/** Array of CSS color strings for the scale (default: gray-to-green 6-step) */
	colorScale?: string[];
	/** Cell size in px (default: 48) */
	cellSize?: number;
	/** Whether to show the legend (default: true) */
	showLegend?: boolean;
}

/** Options for kb.ui.tags() */
export interface KBTagsOptions {
	/** Background color for tag chips (default: 'rgba(124,58,237,0.15)') */
	color?: string;
	/** Text color for tag chips (default: 'rgba(186,197,238,0.9)') */
	textColor?: string;
	/** Font size in px (default: 11) */
	fontSize?: number;
	/** Gap between chips in px (default: 4) */
	gap?: number;
}

/** Options for kb.ui.tagCloud() */
export interface KBTagCloudOptions {
	/** Minimum font size in px (default: 14) */
	minFontSize?: number;
	/** Maximum font size in px (default: 26) */
	maxFontSize?: number;
	/** Base color for chips as CSS color (default: 'rgba(139,108,239,0.3)') */
	color?: string;
	/** Whether to show count in parentheses (default: true) */
	showCount?: boolean;
}

/** Configuration for a single status card */
export interface KBStatusCardItem {
	/** Title text (e.g., page basename) */
	title: string;
	/** Status string (used to look up color) */
	status: string;
	/** Optional subtitle text (e.g., tags) */
	subtitle?: string;
}

/** Color mapping for status cards */
export interface KBStatusColorMap {
	[status: string]: {
		/** Background color */
		bg: string;
		/** Border color */
		border: string;
	};
}

/** Options for kb.ui.statusCards() */
export interface KBStatusCardsOptions {
	/** Color map keyed by status string */
	colors?: KBStatusColorMap;
}

/** Configuration for a single timeline entry */
export interface KBTimelineItem {
	/** Date string for grouping (e.g., "2026-02-13") */
	date: string;
	/** Display text for the item */
	title: string;
	/** Optional secondary text */
	subtitle?: string;
	/** Dot color override (default: 'rgba(139,108,239,0.8)') */
	dotColor?: string;
}

/** Options for kb.ui.timeline() */
export interface KBTimelineOptions {
	/** Default dot color (default: 'rgba(139,108,239,0.8)') */
	dotColor?: string;
}

/** Column alignment for kb.ui.table() */
export type KBTableColumnAlign = 'left' | 'center' | 'right';

/** Options for kb.ui.table() */
export interface KBUITableOptions {
	/** Column text alignment per index (default: 'left' for all) */
	align?: KBTableColumnAlign[];
	/** Enable alternating row background colors (default: false) */
	striped?: boolean;
	/** Footer/summary row cells — rendered in a &lt;tfoot&gt; with bold styling */
	footer?: unknown[];
	/** Returns a background color string for a row, or null for no styling. Overrides striped when provided. */
	rowStyle?: (row: unknown[], index: number) => string | null;
}

/** Supported Chart.js chart types for kb.ui.chart() */
export type KBChartType = 'bar' | 'line' | 'radar' | 'pie' | 'doughnut' | 'polarArea';

/** A single dataset for kb.ui.chart() */
export interface KBChartDataset {
	/** Label for the dataset (shown in legend) */
	label: string;
	/** Numeric data values */
	data: number[];
	/** Color as CSS color string, or array of colors for per-segment charts (pie/doughnut). Auto-generates borderColor, backgroundColor, etc. */
	color: string | string[];
}

/** A single entry for the heatmap calendar */
export interface KBHeatmapCalendarEntry {
	/** Date string in YYYY-MM-DD format */
	date: string;
	/** Numeric intensity value — mapped to a color from the palette */
	intensity?: number;
	/** Color key referencing a palette in `colors` (defaults to the first palette) */
	color?: string;
	/** Text or emoji content to display inside the cell */
	content?: string;
}

/** Options for kb.ui.heatmapCalendar() */
export interface KBHeatmapCalendarOptions {
	/** Year to display (default: current year) */
	year?: number;
	/** Color palettes keyed by name — each value is an array of CSS color strings ordered from lowest to highest intensity. Default: GitHub-style green. */
	colors?: Record<string, string[]>;
	/** Whether to show a border on today's cell (default: true) */
	showCurrentDayBorder?: boolean;
	/** Fallback intensity for entries without an explicit intensity (default: 4) */
	defaultEntryIntensity?: number;
	/** Minimum intensity for the mapping scale (default: auto-detected from data) */
	intensityScaleStart?: number;
	/** Maximum intensity for the mapping scale (default: auto-detected from data) */
	intensityScaleEnd?: number;
	/** Day the week starts on: 0 = Sunday, 1 = Monday, … 6 = Saturday (default: 1) */
	weekStartDay?: number;
}

/** Options for kb.ui.yearlyCalendar() */
export interface KBYearlyCalendarOptions {
	/** Year to display (default: current year) */
	year?: number;
	/** Color palettes keyed by name — each value is an array of CSS color strings ordered from lowest to highest intensity. Default: GitHub-style green. */
	colors?: Record<string, string[]>;
	/** Whether to show a border on today's cell (default: true) */
	showCurrentDayBorder?: boolean;
	/** Fallback intensity for entries without an explicit intensity (default: 4) */
	defaultEntryIntensity?: number;
	/** Minimum intensity for the mapping scale (default: auto-detected from data) */
	intensityScaleStart?: number;
	/** Maximum intensity for the mapping scale (default: auto-detected from data) */
	intensityScaleEnd?: number;
}

/** Options for kb.ui.chart() */
export interface KBChartOptions {
	/** Axis/segment labels */
	labels: string[];
	/** One or more datasets to plot */
	datasets: KBChartDataset[];
	/** Maximum value for the scale (e.g., for radar charts). Omit for auto-scaling. */
	max?: number;
	/** Minimum value for the scale (default: 0) */
	min?: number;
	/** Maximum width of the chart container in px (default: 600 for square charts, 800 for bar/line) */
	maxWidth?: number;
	/** Whether to show the legend (default: true) */
	showLegend?: boolean;
	/** Chart.js step size for tick marks */
	stepSize?: number;
	/** Whether to fill area under line/radar (default: true for radar, false for line) */
	fill?: boolean;
}
