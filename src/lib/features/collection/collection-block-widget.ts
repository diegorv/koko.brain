import { WidgetType } from '@codemirror/view';
import type { FencedBlockRenderer } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import { executeQuery, formatCellValue, type QueryRowSet } from '#lib/features/collection/collection.logic.js';
import { getViewRowSetPort } from '#lib/features/collection/view-row-set.port.js';
import { isDisplayValue } from '#lib/features/collection/expression/expression.types.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { sanitizeHtml } from '#lib/utils/sanitize.js';
import type { PropertyIndexRecord, CollectionViewDef, QueryResult } from '#lib/features/collection/collection.types.js';
import {
	getCalendarGrid,
	groupRecordsByDate,
	formatMonthYear,
	getWeekDayLabels,
	formatDateKey,
} from '#lib/features/collection/calendar.logic.js';
import {
	buildLinearYearLayout,
	buildColorMapping,
	getColorForValue,
	barTextColor,
} from '#lib/features/collection/linear-calendar.logic.js';

/** Cached query data for one collection block. */
interface CollectionCacheEntry {
	/** `collectionStore.version` the result was queried at. */
	version: number;
	/** The block's first view, as queried (a copy of the parsed entry). */
	view: CollectionViewDef;
	/** Query result the cached renders are built from. */
	result: QueryResult;
}

/** Query cache: yamlContent -> view + result DATA queried at a given store
 *  version. The DOM is rebuilt on every toDOM(): rows/pills/bars carry click
 *  listeners, so HTML strings cannot be cached, and live elements must never be
 *  shared between widgets - CodeMirror builds new lines detached, and a shared
 *  node would be moved to the last widget, blanking the earlier occurrences.
 *  The expensive part (executeQuery over the whole property index) still runs
 *  once per (block, version). Keyed by block content alone, with the version
 *  INSIDE the entry: folding the monotonic counter into the key would grow the
 *  map without bound (one dead QueryResult per block per save, for the whole
 *  session; it is only cleared at vault teardown). */
const collectionCache = new Map<string, CollectionCacheEntry>();

/**
 * Maximum number of table rows a collection block renders in the editor.
 * The table DOM is rebuilt synchronously on every `toDOM()`, so an unfiltered
 * block over a large vault (~10k notes) would build hundreds of thousands of
 * nodes on the main thread and block it. Only rendering is capped: the cached
 * `QueryResult` stays complete and the header shows the full count.
 */
export const COLLECTION_ROW_CAP = 50;

/**
 * Maximum number of event lanes a linear-calendar month row renders in the
 * editor. Lanes from `buildLinearYearLayout` grow without limit and every bar
 * is rebuilt synchronously on every `toDOM()`, so a large vault of dated notes
 * would build one bar per record on the main thread. Bars in higher lanes are
 * replaced by a "+N" marker in the month label cell; the cached `QueryResult`
 * and the dedicated linear-calendar view keep every event.
 */
export const LINEAR_CALENDAR_LANE_CAP = 3;

/** Drops all cached renders. Called during vault teardown. */
export function clearCollectionCache(): void {
	collectionCache.clear();
}

/** Widget that renders a ```collection code block as an inline table */
export class CollectionBlockWidget extends WidgetType {
	private readonly isIndexReady: boolean;
	private readonly version: number;

	constructor(readonly yamlContent: string) {
		super();
		this.isIndexReady = collectionStore.isIndexReady;
		this.version = collectionStore.version;
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'cm-lp-collection-block';

		const cached = collectionCache.get(this.yamlContent);
		if (cached && cached.version === this.version) {
			this.renderView(container, cached.view, cached.result);
			return container;
		}

		const parseResult = parseCollectionYaml(this.yamlContent);
		if (!parseResult.success) {
			const error = document.createElement('div');
			error.className = 'cm-lp-collection-error';
			error.textContent = `Parse error: ${parseResult.error}`;
			container.appendChild(error);
			return container;
		}

		if (!collectionStore.isIndexReady) {
			const loading = document.createElement('div');
			loading.className = 'cm-lp-collection-loading';
			loading.textContent = 'Building index...';
			container.appendChild(loading);
			return container;
		}

		const definition = parseResult.definition;
		const view = definition.views[0];
		if (!view) {
			container.textContent = 'No views defined';
			return container;
		}

		const viewWithDefaults: CollectionViewDef = { ...view };
		// The row rule (no system-folder note, type definition, `.view` or
		// uncited archived note); without a registered port, the plain query.
		const port = getViewRowSetPort();
		const rowSet: QueryRowSet | undefined = port
			? (records, v, d) => port.blockRows(records, v, d)
			: undefined;
		const result = executeQuery(definition, viewWithDefaults, collectionStore.propertyIndex, rowSet);
		collectionCache.set(this.yamlContent, { version: this.version, view: viewWithDefaults, result });

		this.renderView(container, viewWithDefaults, result);
		return container;
	}

	/** Renders the header + view body (filter error / calendar /
	 *  linear-calendar / empty / table) from a query result. Runs on every
	 *  toDOM(), including cache hits, so each widget owns its DOM and click
	 *  handlers stay live. */
	private renderView(container: HTMLElement, view: CollectionViewDef, result: QueryResult): void {
		// View name header
		const header = document.createElement('div');
		header.className = 'cm-lp-collection-header';
		header.textContent = `${view.name} (${result.records.length})`;
		container.appendChild(header);

		if (result.filterError) {
			const error = document.createElement('div');
			error.className = 'cm-lp-collection-error';
			error.textContent = result.filterError;
			container.appendChild(error);
			return;
		}

		if (view.type === 'calendar') {
			this.buildCalendar(container, view, result.records);
			return;
		}

		if (view.type === 'linear-calendar') {
			this.buildLinearCalendar(container, view, result.records);
			return;
		}

		if (result.records.length === 0) {
			const empty = document.createElement('div');
			empty.className = 'cm-lp-collection-empty';
			empty.textContent = 'No results match the current filters';
			container.appendChild(empty);
			return;
		}

		// Build table
		container.appendChild(buildCollectionTable(result));

		if (result.records.length > COLLECTION_ROW_CAP) {
			const footer = document.createElement('div');
			footer.className = 'cm-lp-collection-footer';
			footer.textContent = `Showing ${COLLECTION_ROW_CAP} of ${result.records.length}`;
			container.appendChild(footer);
		}
	}

	/** Renders a compact calendar grid for the live-preview widget */
	private buildCalendar(container: HTMLElement, view: CollectionViewDef, records: PropertyIndexRecord[]) {
		if (!view.dateProperty) {
			const msg = document.createElement('div');
			msg.className = 'cm-lp-collection-empty';
			msg.textContent = 'Configure a date property to display the calendar';
			container.appendChild(msg);
			return;
		}

		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth();
		const weekStartDay = view.weekStartDay ?? 1;

		const eventsByDate = groupRecordsByDate(records, view.dateProperty, view.endDateProperty);

		// Month label
		const monthLabel = document.createElement('div');
		monthLabel.style.cssText = 'font-size: 0.9em; font-weight: 600; margin-bottom: 6px; color: var(--lp-collection-header);';
		monthLabel.textContent = formatMonthYear(year, month);
		container.appendChild(monthLabel);

		// Calendar grid table
		const table = document.createElement('table');
		table.className = 'cm-lp-collection-table';
		table.style.tableLayout = 'fixed';

		// Day-of-week headers
		const thead = document.createElement('thead');
		const headerRow = document.createElement('tr');
		for (const label of getWeekDayLabels(weekStartDay)) {
			const th = document.createElement('th');
			th.textContent = label;
			// Same role as the calendar view's weekday header (text-xs font-medium uppercase)
			th.style.cssText = 'font-size: 1em; font-weight: 500; text-transform: uppercase; letter-spacing: 0.025em; text-align: center;';
			headerRow.appendChild(th);
		}
		thead.appendChild(headerRow);
		table.appendChild(thead);

		// Grid rows
		const grid = getCalendarGrid(year, month, weekStartDay);
		const todayKey = formatDateKey(now);
		const tbody = document.createElement('tbody');

		for (const week of grid) {
			const tr = document.createElement('tr');
			tr.style.cursor = 'default';
			for (const day of week) {
				const td = document.createElement('td');
				td.style.cssText = 'vertical-align: top; padding: 2px 4px; min-height: 40px; height: 40px;';

				if (!day.isCurrentMonth) {
					td.style.opacity = '0.35';
				}

				// Day number
				const dayNum = document.createElement('div');
				dayNum.style.cssText = 'font-size: 0.9em; text-align: right; margin-bottom: 2px;';
				const dateKey = formatDateKey(day.date);
				if (dateKey === todayKey) {
					dayNum.style.cssText += 'font-weight: 700; color: var(--primary);';
				}
				dayNum.textContent = String(day.date.getDate());
				td.appendChild(dayNum);

				// Events
				const events = eventsByDate.get(dateKey);
				if (events) {
					const maxShow = 2;
					for (let i = 0; i < Math.min(events.length, maxShow); i++) {
						const pill = document.createElement('div');
						pill.style.cssText = 'font-size: 0.85em; padding: 1px 3px; margin-bottom: 1px; border-radius: 2px; background: var(--lp-collection-table-alt, rgba(255,255,255,0.05)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer;';
						pill.textContent = events[i].record.basename;
						stopEditorMousedown(pill);
						pill.addEventListener('click', () => handleRowClick(events[i].record));
						td.appendChild(pill);
					}
					if (events.length > maxShow) {
						const more = document.createElement('div');
						more.style.cssText = 'font-size: max(11px, 0.8em); color: var(--lp-collection-null); padding: 0 3px;';
						more.textContent = `+${events.length - maxShow}`;
						td.appendChild(more);
					}
				}

				tr.appendChild(td);
			}
			tbody.appendChild(tr);
		}
		table.appendChild(tbody);
		container.appendChild(table);
	}

	/** Renders a compact linear year calendar for the live-preview widget */
	private buildLinearCalendar(container: HTMLElement, view: CollectionViewDef, records: PropertyIndexRecord[]) {
		if (!view.dateProperty) {
			const msg = document.createElement('div');
			msg.className = 'cm-lp-collection-empty';
			msg.textContent = 'Configure a date property to display the linear calendar';
			container.appendChild(msg);
			return;
		}

		const now = new Date();
		const year = now.getFullYear();
		const layout = buildLinearYearLayout(records, year, view.dateProperty, view.endDateProperty, view.colorProperty);
		const colorMapping = view.colorProperty ? buildColorMapping(records, view.colorProperty) : null;

		// Bar geometry is in em of the bar's own font, so the bar grows with its title and
		// never clips it. The day cell computes the same BAR_FONT in its own em, so its lane
		// pitch matches the bar height whether max() picks the 11px floor or the em size.
		const BAR_FONT = 'max(11px, 0.8em)';
		const BAR_HEIGHT_EM = 1.4;
		const BAR_GAP_PX = 1;

		// Year label
		const yearLabel = document.createElement('div');
		yearLabel.style.cssText = 'font-size: 0.9em; font-weight: 600; margin-bottom: 6px; color: var(--lp-collection-header);';
		yearLabel.textContent = String(year);
		container.appendChild(yearLabel);

		// Table
		const table = document.createElement('table');
		table.className = 'cm-lp-collection-table';
		table.style.tableLayout = 'fixed';

		// Header row: empty + day numbers 1-31
		const thead = document.createElement('thead');
		const headerRow = document.createElement('tr');
		const emptyTh = document.createElement('th');
		// em, so the column widens with the month labels below it
		emptyTh.style.cssText = 'width: 2.5em;';
		headerRow.appendChild(emptyTh);
		for (let d = 1; d <= 31; d++) {
			const th = document.createElement('th');
			th.textContent = String(d);
			// Same role as the linear view's day numbers (text-[11px] font-medium), kept below
			// the month label the way 11px sits below its text-xs label. At a small editor font
			// the 11px floor lifts them above the label.
			th.style.cssText = 'font-size: max(11px, 0.8em); font-weight: 500; text-align: center; padding: 1px;';
			headerRow.appendChild(th);
		}
		thead.appendChild(headerRow);
		table.appendChild(thead);

		// Month rows
		const tbody = document.createElement('tbody');
		for (const row of layout) {
			const tr = document.createElement('tr');
			tr.style.cursor = 'default';

			// Month label
			const labelTd = document.createElement('td');
			labelTd.textContent = row.label;
			labelTd.style.cssText = 'font-size: 0.85em; font-weight: 600; padding: 2px 4px; vertical-align: top; color: var(--lp-collection-null);';
			tr.appendChild(labelTd);

			const hiddenCount = row.events.filter((event) => event.lane >= LINEAR_CALENDAR_LANE_CAP).length;
			if (hiddenCount > 0) {
				const more = document.createElement('div');
				more.className = 'cm-lp-collection-lane-more';
				more.style.cssText = 'font-size: max(11px, 0.9em); font-weight: 400;';
				more.textContent = `+${hiddenCount}`;
				labelTd.appendChild(more);
			}

			// Day cells
			const visibleLanes = Math.min(row.maxLane + 1, LINEAR_CALENDAR_LANE_CAP);
			const rowHeight =
				visibleLanes > 0
					? `calc(${visibleLanes} * (${BAR_HEIGHT_EM} * ${BAR_FONT} + ${BAR_GAP_PX}px) + ${BAR_GAP_PX}px)`
					: `${BAR_HEIGHT_EM}em`;
			for (let d = 1; d <= 31; d++) {
				const td = document.createElement('td');
				td.style.cssText = `position: relative; padding: 0; height: ${rowHeight}; vertical-align: top;`;

				if (d > row.daysInMonth) {
					td.style.opacity = '0.15';
				}

				// Today highlight
				if (row.month === now.getMonth() && d === now.getDate() && year === now.getFullYear()) {
					td.style.background = 'color-mix(in srgb, var(--primary) 15%, transparent)';
				}

				tr.appendChild(td);
			}

			tbody.appendChild(tr);

			// Render event bars (separate pass to get cell references)
			if (row.events.length > 0) {
				const cells = tr.querySelectorAll('td');
				for (const event of row.events) {
					if (event.lane >= LINEAR_CALENDAR_LANE_CAP) continue;
					const startDay = event.startDate.getDate();
					const endDay = event.endDate.getDate();
					const bar = document.createElement('div');
					const color = colorMapping ? (getColorForValue(event.colorValue, colorMapping) ?? 'var(--primary)') : 'var(--primary)';
					bar.style.cssText = `position: absolute; left: 0; right: 0; top: calc(${event.lane} * (${BAR_HEIGHT_EM}em + ${BAR_GAP_PX}px) + ${BAR_GAP_PX}px); height: ${BAR_HEIGHT_EM}em; background: ${color}; border-radius: 2px; font-size: ${BAR_FONT}; color: ${barTextColor(color)}; padding: 0 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; display: flex; align-items: center;`;
					bar.textContent = event.record.basename;
					bar.title = event.record.basename;
					stopEditorMousedown(bar);
					bar.addEventListener('click', () => handleRowClick(event.record));

					// Place bar in start cell, spanning via absolute positioning
					// For live-preview simplicity, add bar to start cell only
					const startCell = cells[startDay]; // +1 because cells[0] is the month label
					if (startCell) {
						// Make bar span across cells using a width percentage trick
						const span = endDay - startDay + 1;
						bar.style.width = `${span * 100}%`;
						bar.style.zIndex = '1';
						startCell.appendChild(bar);
					}
				}
			}
		}

		table.appendChild(tbody);
		container.appendChild(table);
	}

	eq(other: CollectionBlockWidget) {
		return (
			this.yamlContent === other.yamlContent &&
			this.isIndexReady === other.isIndexReady &&
			this.version === other.version
		);
	}

	ignoreEvent() {
		return false;
	}
}

/** Renders `` ```collection `` blocks; the app installs it in the editor's `fencedBlockRenderers`. */
export const collectionBlockRenderer: FencedBlockRenderer = {
	language: 'collection',
	widget: (source) => new CollectionBlockWidget(source),
	// A widget built before the index is ready shows "Building index...", and
	// one built before a change in another note keeps its cached rows.
	rebuildOn: () => [collectionStore.isIndexReady, collectionStore.version],
};

/**
 * Builds the `<table>` for a collection table view from a query result,
 * rendering at most `COLLECTION_ROW_CAP` body rows.
 * Pure DOM construction: DisplayHTML cells render as sanitized innerHTML, plain
 * values as textContent, and null/undefined as the null-class dash cell.
 */
export function buildCollectionTable(result: QueryResult): HTMLTableElement {
	const table = document.createElement('table');
	table.className = 'cm-lp-collection-table';

	// Thead
	const thead = document.createElement('thead');
	const headerRow = document.createElement('tr');
	for (const col of result.columns) {
		const th = document.createElement('th');
		th.textContent = col.displayName;
		headerRow.appendChild(th);
	}
	thead.appendChild(headerRow);
	table.appendChild(thead);

	// Tbody
	const tbody = document.createElement('tbody');
	for (const record of result.records.slice(0, COLLECTION_ROW_CAP)) {
		const tr = document.createElement('tr');
		stopEditorMousedown(tr);
		tr.addEventListener('click', () => handleRowClick(record));

		for (const col of result.columns) {
			const td = document.createElement('td');
			const value = getCellValue(record, col.key);
			if (isDisplayValue(value) && value.__display === 'html') {
				td.innerHTML = sanitizeHtml(value.html);
			} else {
				td.textContent = formatCellValue(value);
			}
			if (value === null || value === undefined) {
				td.className = 'cm-lp-collection-null';
			}
			tr.appendChild(td);
		}
		tbody.appendChild(tr);
	}
	table.appendChild(tbody);
	return table;
}

/**
 * Keeps a press on a clickable row / pill / bar away from CodeMirror. Its own
 * mousedown handler would move the cursor onto the fence, the reveal rule would
 * show the block as source, and the widget DOM would be detached before
 * `click` fires, so the note never opens. Same pattern as the table widget's
 * `attachAddButtons`.
 */
function stopEditorMousedown(el: HTMLElement): void {
	el.addEventListener('mousedown', (e) => {
		e.preventDefault();
		e.stopPropagation();
	});
}

/** Navigates to the clicked note */
function handleRowClick(record: PropertyIndexRecord) {
	openFileInEditor(record.path);
}

/** Resolves a cell value from a record using the property key */
function getCellValue(record: PropertyIndexRecord, key: string): unknown {
	if (key.startsWith('file.')) {
		switch (key) {
			case 'file.name': return record.name;
			case 'file.path': return record.path;
			case 'file.folder': return record.folder;
			case 'file.ext': return record.ext;
			case 'file.size': return record.size;
			case 'file.ctime': return new Date(record.ctime);
			case 'file.mtime': return new Date(record.mtime);
			default: return null;
		}
	}
	return record.properties.get(key) ?? null;
}
