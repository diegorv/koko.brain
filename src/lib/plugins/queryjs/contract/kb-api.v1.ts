/**
 * QueryJS scripting API, contract version 1: the public surface user scripts
 * see as `kb` / `dv` (ADR-0010 amendment 2026-11-01). Hand-written so it
 * constrains the implementation instead of following it; the classes in
 * `../kb-api.ts`, `../kb-ui.ts`, `../data-array.ts` and `../kb-datetime.ts`
 * `implements` these interfaces.
 *
 * Rules for editing this file:
 * - Members are function-typed properties, never method signatures: methods
 *   are checked bivariantly, so a parameter made required or a narrowed union
 *   would still satisfy `implements`.
 * - It imports nothing. In particular not `#lib/types/`, `#lib/features/` or
 *   generated IPC bindings, whose changes must not reach user scripts.
 * - It is a `.ts` file, not a `.d.ts`: `skipLibCheck` would skip type errors
 *   inside a declaration file.
 * - DTO firewall: `NoteEntryV2` and the collection `PropertyIndexRecord` are read only
 *   by `../queryjs.logic.ts::buildKBPage` (and its `buildReverseIndex`
 *   helper), which maps them to `KBPageV1`. Neither this file nor a public
 *   KBAPI signature names a DTO; the KBAPI constructor, which takes the
 *   entries, is internal. A new DTO field leaves the page unchanged until this
 *   contract exposes it; a renamed one fails to compile in `buildKBPage`.
 *   Enforced by `src/tests/lib/plugins/queryjs/kbapi-firewall.test.ts`.
 * - Compatibility policy (help/documentation/13-queryjs.md, "API version and
 *   compatibility"): a new KBApiV1 or KBUIV1 member is additive; removing or
 *   changing a member, or adding a DataArrayV1 member or a page-root key, is a
 *   major change that bumps `version`.
 */

// ── Pages ──

/** Clickable link to a file */
export interface KBLinkV1 {
	/** Absolute path to the target file */
	path: string;
	/** The basename without extension; for outlinks, the wikilink alias or else the target text as written */
	display: string;
}

/** A task extracted from a page's content */
export interface KBTaskV1 {
	/** The raw text of the task (without the checkbox prefix) */
	text: string;
	/** Whether the task is completed */
	completed: boolean;
	/** 1-based line number within the file */
	line: number;
	/** Absolute path of the file containing this task */
	path: string;
}

/** File metadata of a page (`page.file`) */
export interface KBPageFileV1 {
	/** Absolute file path */
	path: string;
	/** Filename with extension */
	name: string;
	/** Filename without extension */
	basename: string;
	/** Absolute parent folder path */
	folder: string;
	/** KBLink to this page */
	link: KBLinkV1;
	/** All tags (frontmatter + inline) */
	tags: string[];
	/** Files that link TO this file */
	inlinks: KBLinkV1[];
	/** Files this file links TO */
	outlinks: KBLinkV1[];
	/** File size in bytes */
	size: number;
	/** Creation timestamp (ms) */
	ctime: number;
	/** Modification timestamp (ms) */
	mtime: number;
	/** Tasks extracted from file content */
	tasks: KBTaskV1[];
}

/**
 * Every key the app puts on a page root beside the note's own frontmatter
 * keys. `file` comes from `buildKBPage`; the rest are injected into the record
 * properties by `project_note_record` (Rust, `commands/vault.rs`) and its TS
 * mirror `projectDerivedProperties` (`collection.logic.ts`): `tags`,
 * `organized`, `archived` and `favorite` on every page, `_type` when the note
 * has a type, and the three relationship keys when they have targets. Adding
 * a name here is a page-root key, so a major change.
 */
export type KBPageRootKeyV1 =
	| 'file'
	| 'tags'
	| 'organized'
	| 'archived'
	| 'favorite'
	| '_type'
	| '_belongs_to'
	| '_related_to'
	| '_has_many';

/**
 * Page object representing a single note, returned by kb.pages() and kb.current().
 *
 * Frontmatter values come from the Rust parser (vault scan) or the TS parser
 * (edit fast path). `note-record-projection.json` pins that both give the same
 * values for `_type`, block scalars (`|`, `>`), plain multi-line scalars and
 * quoted commas in flow and block arrays.
 *
 * Known differences, current contract behaviour until sidebar-redesign 26
 * unifies the parsers (a value can change after a vault rebuild):
 * - YAML 1.2 octal (`0o17`): TS gives the number `15`, Rust the string `"0o17"`.
 * - `.inf` / `.nan`: TS gives `Infinity` / `NaN`, Rust the strings `".inf"` / `".nan"`.
 * - Nested maps (`nested: {a: 1}`): TS drops the key, Rust gives `null`.
 */
export interface KBPageV1 {
	/** File metadata object */
	file: KBPageFileV1;
	/**
	 * Frontmatter properties accessible as direct keys (e.g., page.created),
	 * plus the injected keys listed in `KBPageRootKeyV1`.
	 */
	[key: string]: unknown;
}

/** Options for kb.el() */
export interface KBElOptionsV1 {
	/** HTML attributes to set on the element */
	attr?: Record<string, string>;
	/** CSS class(es) to add */
	cls?: string;
}

/** Bundle of aggregate statistics from DataArray.stats() */
export interface AggregateStatsV1 {
	/** Sum of all values */
	sum: number;
	/** Arithmetic mean */
	avg: number;
	/** Minimum value */
	min: number;
	/** Maximum value */
	max: number;
	/** Number of values */
	count: number;
}

// ── Dates ──

/** Duration accepted by KBDateTimeV1.plus() / minus() */
export interface KBDurationV1 {
	/** Years */
	years?: number;
	/** Months */
	months?: number;
	/** Days */
	days?: number;
	/** Hours */
	hours?: number;
	/** Minutes */
	minutes?: number;
}

/** Unit accepted by KBDateTimeV1.startOf() / endOf() */
export type KBDateUnitV1 = 'day' | 'week' | 'month' | 'quarter' | 'year';

/** Lightweight Luxon-compatible date wrapper returned by kb.date() / kb.tryDate() */
export interface KBDateTimeV1 {
	/** Year (e.g. 2024) */
	readonly year: number;
	/** Month (1-12, Luxon convention) */
	readonly month: number;
	/** Day of month (1-31) */
	readonly day: number;
	/** Hour (0-23) */
	readonly hour: number;
	/** Minute (0-59) */
	readonly minute: number;
	/** Timestamp in milliseconds */
	readonly ts: number;
	/** Quarter number (1-4) */
	readonly quarter: number;
	/** ISO 8601 week number (1-53) */
	readonly weekNumber: number;
	/** Returns a new date advanced by the given duration */
	plus: (duration: KBDurationV1) => KBDateTimeV1;
	/** Returns a new date set back by the given duration */
	minus: (duration: KBDurationV1) => KBDateTimeV1;
	/** ISO date string (YYYY-MM-DD) */
	toISODate: () => string;
	/** Formats with the tokens yyyy, MMMM, MMM, MM, dd, HH, mm */
	toFormat: (fmt: string) => string;
	/** True when both dates fall in the same unit */
	hasSame: (other: KBDateTimeV1, unit: 'day' | 'month' | 'year') => boolean;
	/** Start of the given unit (weeks start Monday) */
	startOf: (unit: KBDateUnitV1) => KBDateTimeV1;
	/** End of the given unit (weeks start Monday) */
	endOf: (unit: KBDateUnitV1) => KBDateTimeV1;
	/** Timestamp, so `<` / `>` compare dates */
	valueOf: () => number;
	/** Full ISO string */
	toString: () => string;
	/** A copy of the underlying native Date */
	toJSDate: () => Date;
}

// ── DataArray ──

/**
 * Chainable array wrapper, the implementable part. Every member added here is
 * a MAJOR change: the runtime Proxy maps a property name across items only
 * when DataArray has no member of that name, so a new member shadows a
 * frontmatter key of the same name (`pages.status` stops mapping `status`).
 */
export interface DataArrayV1<T> {
	/** Filter items by predicate */
	where: (predicate: (item: T) => boolean) => DataArrayV1<T>;
	/** Alias for where */
	filter: (predicate: (item: T) => boolean) => DataArrayV1<T>;
	/** Items with a tag equal to, or nested under, any of the prefixes */
	whereTag: (...prefixes: string[]) => DataArrayV1<T>;
	/** Items whose `item[field]` date falls in [start, end], by day */
	whereDate: (field: string, start: KBDateTimeV1, end: KBDateTimeV1) => DataArrayV1<T>;
	/** For each day, the first item whose `item[field]` is that day, else null */
	byDate: (field: string, days: KBDateTimeV1[]) => (T | null)[];
	/** Map items to a new type */
	map: <U>(fn: (item: T, index: number) => U) => DataArrayV1<U>;
	/** Map items and flatten results */
	flatMap: <U>(fn: (item: T) => U[]) => DataArrayV1<U>;
	/** Sort by an optional key function with optional direction (default 'asc') */
	sort: <U>(key?: (item: T) => U, direction?: 'asc' | 'desc') => DataArrayV1<T>;
	/** Sort by a key function with optional direction (default 'asc') */
	sortBy: <U>(key: (item: T) => U, direction?: 'asc' | 'desc') => DataArrayV1<T>;
	/** Group items by a key function */
	groupBy: <K>(key: (item: T) => K) => DataArrayV1<{ key: K; rows: DataArrayV1<T> }>;
	/** Remove duplicate items by an optional key function */
	distinct: <U>(key?: (item: T) => U) => DataArrayV1<T>;
	/** Take the first N items */
	limit: (n: number) => DataArrayV1<T>;
	/** Slice the array */
	slice: (start?: number, end?: number) => DataArrayV1<T>;
	/** Concatenate with another iterable */
	concat: (other: Iterable<T>) => DataArrayV1<T>;
	/** Run fn on every item in place, returning the same DataArray */
	mutate: (fn: (item: T) => void) => DataArrayV1<T>;
	/** First item matching a predicate */
	find: (predicate: (item: T) => boolean) => T | undefined;
	/** Index of the first item matching a predicate, or -1 */
	findIndex: (predicate: (item: T) => boolean) => number;
	/** Index of an item, or -1 */
	indexOf: (item: T) => number;
	/** True if the item is in the array */
	includes: (item: T) => boolean;
	/** True if predicate holds for at least one item */
	some: (predicate: (item: T) => boolean) => boolean;
	/** True if predicate holds for all items */
	every: (predicate: (item: T) => boolean) => boolean;
	/** True if predicate is false for all items */
	none: (predicate: (item: T) => boolean) => boolean;
	/** First item (undefined if empty) */
	first: () => T | undefined;
	/** Last item (undefined if empty) */
	last: () => T | undefined;
	/** Map every item to `item[key]`, flattening arrays (what the Proxy calls) */
	to: (key: string) => DataArrayV1<unknown>;
	/** Map every item to `item[key]`, without flattening */
	into: (key: string) => DataArrayV1<unknown>;
	/** The underlying items (Obsidian compatibility) */
	readonly values: T[];
	/** A plain array copy of the items */
	array: () => T[];
	/** Number of items */
	readonly length: number;
	/** Iterate over items */
	forEach: (fn: (item: T, index: number) => void) => void;
	/** Sum of the values, or of key(item) */
	sum: (key?: (item: T) => number) => number;
	/** Arithmetic mean, 0 for an empty array */
	avg: (key?: (item: T) => number) => number;
	/** Minimum, Infinity for an empty array */
	min: (key?: (item: T) => number) => number;
	/** Maximum, -Infinity for an empty array */
	max: (key?: (item: T) => number) => number;
	/** sum, avg, min, max and count in one call */
	stats: (key?: (item: T) => number) => AggregateStatsV1;
	/** Occurrences of each value, or of key(item) */
	countBy: (key?: (item: T) => string) => Record<string, number>;
	/** Standard reduce */
	reduce: <U>(fn: (acc: U, item: T, index: number) => U, initial: U) => U;
	/** Join items as strings (default separator ', ') */
	join: (separator?: string) => string;
	/** Items joined with ', ' */
	toString: () => string;
	/** for-of iteration */
	[Symbol.iterator]: () => Iterator<T>;
}

/** DataArrayV1 members that return a DataArray, re-typed in ScriptDataArrayV1 */
type DataArrayChainKeyV1 =
	| 'where'
	| 'filter'
	| 'whereTag'
	| 'whereDate'
	| 'map'
	| 'flatMap'
	| 'sort'
	| 'sortBy'
	| 'groupBy'
	| 'distinct'
	| 'limit'
	| 'slice'
	| 'concat'
	| 'mutate'
	| 'to'
	| 'into';

/** The chain members of DataArrayV1, returning the script view */
interface ScriptDataArrayChainV1<T> {
	where: (predicate: (item: T) => boolean) => ScriptDataArrayV1<T>;
	filter: (predicate: (item: T) => boolean) => ScriptDataArrayV1<T>;
	whereTag: (...prefixes: string[]) => ScriptDataArrayV1<T>;
	whereDate: (field: string, start: KBDateTimeV1, end: KBDateTimeV1) => ScriptDataArrayV1<T>;
	map: <U>(fn: (item: T, index: number) => U) => ScriptDataArrayV1<U>;
	flatMap: <U>(fn: (item: T) => U[]) => ScriptDataArrayV1<U>;
	sort: <U>(key?: (item: T) => U, direction?: 'asc' | 'desc') => ScriptDataArrayV1<T>;
	sortBy: <U>(key: (item: T) => U, direction?: 'asc' | 'desc') => ScriptDataArrayV1<T>;
	groupBy: <K>(key: (item: T) => K) => ScriptDataArrayV1<{ key: K; rows: ScriptDataArrayV1<T> }>;
	distinct: <U>(key?: (item: T) => U) => ScriptDataArrayV1<T>;
	limit: (n: number) => ScriptDataArrayV1<T>;
	slice: (start?: number, end?: number) => ScriptDataArrayV1<T>;
	concat: (other: Iterable<T>) => ScriptDataArrayV1<T>;
	mutate: (fn: (item: T) => void) => ScriptDataArrayV1<T>;
	to: (key: string) => ScriptDataArrayV1<unknown>;
	into: (key: string) => ScriptDataArrayV1<unknown>;
}

/**
 * What a script holds at runtime: the DataArray Proxy, where any name that is
 * not a DataArrayV1 member maps that property across the items
 * (`kb.pages().file.link`), at any depth and after any chain method. A class
 * cannot implement the index signature, hence the split from DataArrayV1.
 * Typing only: the implementation is checked against DataArrayV1.
 */
export type ScriptDataArrayV1<T> = Omit<DataArrayV1<T>, DataArrayChainKeyV1> &
	ScriptDataArrayChainV1<T> & { [key: string]: ScriptDataArrayV1<unknown> };

/** Item type for DataArrayReturningKeyV1, distinct from any real item */
interface ChainProbeV1 {
	/** Brand */
	readonly chainProbe: 'kb-api-v1-chain-probe';
}

/**
 * DataArrayV1 members whose return type is a DataArray. The probe item type
 * keeps `T`-returning members (`first`, `find`) from matching, and inferring
 * the return type reads a generic `U` return (`reduce`) as `unknown`.
 */
type DataArrayReturningKeyV1 = {
	[K in keyof DataArrayV1<ChainProbeV1>]: DataArrayV1<ChainProbeV1>[K] extends (
		...args: never[]
	) => infer R
		? [R] extends [DataArrayV1<any>]
			? K
			: never
		: never;
}[keyof DataArrayV1<ChainProbeV1>];

/** True when A and B are the same key union */
type SameKeysV1<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Compiles only when T is `true` */
type AssertTrueV1<T extends true> = T;

/**
 * Fails to compile when DataArrayChainKeyV1 or ScriptDataArrayChainV1 misses
 * a DataArray-returning member (the script view would return a plain
 * DataArrayV1 for it and the shorthand would break after it), or lists one
 * that does not return a DataArray.
 */
type DataArrayChainKeysCheckV1 = [
	AssertTrueV1<SameKeysV1<DataArrayChainKeyV1, DataArrayReturningKeyV1>>,
	AssertTrueV1<SameKeysV1<keyof ScriptDataArrayChainV1<unknown>, DataArrayReturningKeyV1>>
];

// ── kb.ui option types ──

/** Configuration for a single stat card in a cards grid */
export interface KBCardItemV1 {
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
export interface KBCardsOptionsV1 {
	/** Number of columns in the grid (default: items.length, max 6) */
	columns?: number;
	/** Card border radius in px (default: 8) */
	borderRadius?: number;
}

/** Options for kb.ui.progressBar() */
export interface KBProgressBarOptionsV1 {
	/** Character for filled portion (default: "█") */
	fillChar?: string;
	/** Character for empty portion (default: "░") */
	emptyChar?: string;
	/** Whether to append the numeric value after the bar (default: true) */
	showValue?: boolean;
	/** Total width in characters (default: max) */
	width?: number;
}

/** Options for kb.ui.heatmap() */
export interface KBHeatmapOptionsV1<T> {
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
export interface KBTagsOptionsV1 {
	/** Background color for tag chips (default: 'rgba(124,58,237,0.15)') */
	color?: string;
	/** Text color for tag chips (default: 'rgba(186,197,238,0.9)') */
	textColor?: string;
	/** Font size in px (default: 0.6875em of the block, 11px at the default editor font) */
	fontSize?: number;
	/** Gap between chips in px (default: 4) */
	gap?: number;
}

/** Options for kb.ui.tagCloud() */
export interface KBTagCloudOptionsV1 {
	/** Minimum font size in px. When neither bound is set the range is 0.875em-1.625em of the block (14-26px at the default editor font); setting one makes both px, the other defaulting to 14 / 26. */
	minFontSize?: number;
	/** Maximum font size in px (see `minFontSize` for the default) */
	maxFontSize?: number;
	/** Base color for chips as CSS color (default: 'rgba(139,108,239,0.3)') */
	color?: string;
	/** Whether to show count in parentheses (default: true) */
	showCount?: boolean;
}

/** Configuration for a single status card */
export interface KBStatusCardItemV1 {
	/** Title text (e.g., page basename) */
	title: string;
	/** Status string (used to look up color) */
	status: string;
	/** Optional subtitle text (e.g., tags) */
	subtitle?: string;
}

/** Color mapping for status cards */
export interface KBStatusColorMapV1 {
	[status: string]: {
		/** Background color */
		bg: string;
		/** Border color */
		border: string;
	};
}

/** Options for kb.ui.statusCards() */
export interface KBStatusCardsOptionsV1 {
	/** Color map keyed by status string */
	colors?: KBStatusColorMapV1;
}

/** Configuration for a single timeline entry */
export interface KBTimelineItemV1 {
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
export interface KBTimelineOptionsV1 {
	/** Default dot color (default: 'rgba(139,108,239,0.8)') */
	dotColor?: string;
}

/** Column alignment for kb.ui.table() */
export type KBTableColumnAlignV1 = 'left' | 'center' | 'right';

/** Options for kb.ui.table() */
export interface KBUITableOptionsV1 {
	/** Column text alignment per index (default: 'left' for all) */
	align?: KBTableColumnAlignV1[];
	/** Enable alternating row background colors (default: false) */
	striped?: boolean;
	/** Footer/summary row cells — rendered in a &lt;tfoot&gt; with bold styling */
	footer?: unknown[];
	/** Returns a background color string for a row, or null for no styling. Overrides striped when provided. */
	rowStyle?: (row: unknown[], index: number) => string | null;
	/**
	 * Page size in rows. When > 0, the table renders only `pageSize` rows at a time
	 * with Prev/Next controls + a `Page X of Y` indicator beneath the table. Pages
	 * are 1-indexed in the UI; state lives on the rendered DOM node so the user can
	 * paginate without re-running the script.
	 */
	pageSize?: number;
}

/** Supported Chart.js chart types for kb.ui.chart() */
export type KBChartTypeV1 = 'bar' | 'line' | 'radar' | 'pie' | 'doughnut' | 'polarArea';

/** A single dataset for kb.ui.chart() */
export interface KBChartDatasetV1 {
	/** Label for the dataset (shown in legend) */
	label: string;
	/** Numeric data values */
	data: number[];
	/** Color as CSS color string, or array of colors for per-segment charts (pie/doughnut). Auto-generates borderColor, backgroundColor, etc. */
	color: string | string[];
}

/** A single entry for the heatmap calendar */
export interface KBHeatmapCalendarEntryV1 {
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
export interface KBHeatmapCalendarOptionsV1 {
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
export interface KBYearlyCalendarOptionsV1 {
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
export interface KBChartOptionsV1 {
	/** Axis/segment labels */
	labels: string[];
	/** One or more datasets to plot */
	datasets: KBChartDatasetV1[];
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

// ── kb.ui ──

/** UI render helpers (`kb.ui`). Every method appends to the block's container. */
export interface KBUIV1 {
	/** Grid of stat cards */
	cards: (items: KBCardItemV1[], options?: KBCardsOptionsV1) => HTMLElement;
	/** Unicode progress bar string with the value appended by default; renders nothing */
	progressBar: (value: number, max: number, options?: KBProgressBarOptionsV1) => string;
	/** Color-scaled heatmap grid with optional legend */
	heatmap: <T>(items: Iterable<T>, options: KBHeatmapOptionsV1<T>) => HTMLElement;
	/** Tag cloud from a tag list (auto-counted) or a tag -> count record */
	tagCloud: (tags: string[] | Record<string, number>, options?: KBTagCloudOptionsV1) => HTMLElement;
	/** Inline tag chips */
	tags: (tags: string[], options?: KBTagsOptionsV1) => HTMLElement;
	/** Status-colored cards with badges */
	statusCards: (items: KBStatusCardItemV1[], options?: KBStatusCardsOptionsV1) => HTMLElement;
	/** Grouped timeline with date headers */
	timeline: (items: KBTimelineItemV1[], options?: KBTimelineOptionsV1) => HTMLElement;
	/** Styled table with alignment, striping, footer, row styles and paging */
	table: <R extends unknown[]>(
		headers: string[],
		rows: R[] | DataArrayV1<R>,
		options?: KBUITableOptionsV1,
	) => HTMLElement;
	/** Chart.js chart, loaded on first use */
	chart: (type: KBChartTypeV1, options: KBChartOptionsV1) => Promise<HTMLElement>;
	/** GitHub-style year heatmap calendar */
	heatmapCalendar: (
		entries: KBHeatmapCalendarEntryV1[],
		options?: KBHeatmapCalendarOptionsV1,
	) => HTMLElement;
	/** Vertical year calendar, months as columns */
	yearlyCalendar: (
		entries: KBHeatmapCalendarEntryV1[],
		options?: KBYearlyCalendarOptionsV1,
	) => HTMLElement;
}

// ── kb ──

/** The `kb` (and legacy `dv`) object a QueryJS script receives */
export interface KBApiV1 {
	/** Contract major version. Feature-detect members with `typeof kb.x`. */
	readonly version: 1;
	/** The block's DOM container every render method appends to */
	readonly container: HTMLElement;
	/** UI render helpers */
	readonly ui: KBUIV1;
	/** All pages, or those matching '#tag' (with subtags) or '"folder"' */
	pages: (source?: string) => DataArrayV1<KBPageV1>;
	/** Absolute paths of pages(source) */
	pagePaths: (source?: string) => DataArrayV1<string>;
	/** The page the block runs in, or null */
	current: () => KBPageV1 | null;
	/** The page at an absolute path, or undefined */
	page: (path: string) => KBPageV1 | undefined;
	/** A date from a string, timestamp or Date; now when omitted */
	date: (input?: string | number | Date) => KBDateTimeV1;
	/** Any date-like value as a date, or null */
	tryDate: (value: unknown) => KBDateTimeV1 | null;
	/** One date per day from start to end, inclusive; empty when either is invalid or start > end */
	getDaysInRange: (start: unknown, end: unknown) => DataArrayV1<KBDateTimeV1>;
	/** Wraps a value or array in a DataArray */
	array: (raw: unknown) => DataArrayV1<unknown>;
	/** True for a DataArray or plain Array */
	isArray: (raw: unknown) => boolean;
	/** A link to a path; `embed` is ignored */
	fileLink: (path: string, embed?: boolean, display?: string) => KBLinkV1;
	/** Negative, zero or positive; null/undefined sort first */
	compare: (a: unknown, b: unknown) => number;
	/** compare(a, b) === 0 */
	equal: (a: unknown, b: unknown) => boolean;
	/** Number(value), or 0 when that is NaN or 0 */
	number: (value: unknown) => number;
	/** Unicode progress bar string, no value appended */
	progressBar: (value: number, max: number) => string;
	/** Creates and appends an element */
	el: <K extends keyof HTMLElementTagNameMap>(
		tag: K,
		text?: string,
		options?: KBElOptionsV1,
	) => HTMLElementTagNameMap[K];
	/** Appends a paragraph */
	paragraph: (text: string) => HTMLParagraphElement;
	/** Appends an h1-h6 (level clamped); content may be a string or a KBLink */
	header: (level: number, content: unknown) => HTMLElement;
	/** Appends a span */
	span: (text: string, options?: KBElOptionsV1) => HTMLSpanElement;
	/** Appends a bulleted list; KBLink items become links */
	list: (items: Iterable<unknown>) => HTMLElement;
	/** Appends a table */
	table: <R extends unknown[]>(headers: string[], rows: R[] | DataArrayV1<R>) => HTMLElement;
	/** Appends a read-only checkbox list */
	taskList: (tasks: { text: string; completed: boolean }[]) => HTMLElement;
	/**
	 * Loads `<vault>/<scriptPath>.js` and runs it with `kb`, `dv` and `input`.
	 * Errors render inline; the Promise resolves either way.
	 */
	view: (scriptPath: string, input?: unknown) => Promise<void>;
}

/**
 * KBApiV1 as a script sees it: the DataArray-returning members give the
 * script view, so the property shorthand type-checks. This is the type of the
 * `kb` / `dv` globals in help/examples/queryjs-globals.d.ts.
 *
 * The two `table` members are re-declared to take the script view: a
 * ScriptDataArrayV1 is not assignable to DataArrayV1, because DataArrayV1 is
 * invariant in T (`includes`, `indexOf`, `concat` take a T) and groupBy's
 * `rows` differ between the two.
 */
export type KBScriptApiV1 = Omit<
	KBApiV1,
	'pages' | 'pagePaths' | 'getDaysInRange' | 'array' | 'table' | 'ui'
> & {
	/** UI render helpers */
	readonly ui: Omit<KBUIV1, 'table'> & {
		/** Styled table with alignment, striping, footer, row styles and paging */
		table: <R extends unknown[]>(
			headers: string[],
			rows: R[] | ScriptDataArrayV1<R>,
			options?: KBUITableOptionsV1,
		) => HTMLElement;
	};
	/** Appends a table */
	table: <R extends unknown[]>(headers: string[], rows: R[] | ScriptDataArrayV1<R>) => HTMLElement;
	/** All pages, or those matching '#tag' (with subtags) or '"folder"' */
	pages: (source?: string) => ScriptDataArrayV1<KBPageV1>;
	/** Absolute paths of pages(source) */
	pagePaths: (source?: string) => ScriptDataArrayV1<string>;
	/** One date per day from start to end, inclusive; empty when either is invalid or start > end */
	getDaysInRange: (start: unknown, end: unknown) => ScriptDataArrayV1<KBDateTimeV1>;
	/** Wraps a value or array in a DataArray */
	array: (raw: unknown) => ScriptDataArrayV1<unknown>;
};
