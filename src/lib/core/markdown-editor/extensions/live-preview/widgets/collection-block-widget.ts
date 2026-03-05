import { WidgetType } from '@codemirror/view';
import { parseCollectionYaml } from '$lib/features/collection/yaml-parser';
import { executeQuery, formatCellValue } from '$lib/features/collection/collection.logic';
import { isDisplayValue } from '$lib/features/collection/expression/expression.types';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { sanitizeHtml } from '$lib/utils/sanitize';
import type { NoteRecord, CollectionViewDef } from '$lib/features/collection/collection.types';
import {
	getCalendarGrid,
	groupRecordsByDate,
	formatMonthYear,
	getWeekDayLabels,
	formatDateKey,
} from '$lib/features/collection/calendar.logic';
import {
	buildLinearYearLayout,
	buildColorMapping,
	getColorForValue,
} from '$lib/features/collection/linear-calendar.logic';

/** Widget that renders a ```collection code block as an inline table */
export class CollectionBlockWidget extends WidgetType {
	private readonly isIndexReady: boolean;
	private readonly indexSize: number;

	constructor(readonly yamlContent: string) {
		super();
		this.isIndexReady = collectionStore.isIndexReady;
		this.indexSize = collectionStore.propertyIndex.size;
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'cm-lp-collection-block';

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
		const result = executeQuery(definition, viewWithDefaults, collectionStore.propertyIndex);

		// View name header
		const header = document.createElement('div');
		header.className = 'cm-lp-collection-header';
		header.textContent = `${view.name} (${result.records.length})`;
		container.appendChild(header);

		if (view.type === 'calendar') {
			this.buildCalendar(container, view, result.records);
			return container;
		}

		if (view.type === 'linear-calendar') {
			this.buildLinearCalendar(container, view, result.records);
			return container;
		}

		if (result.records.length === 0) {
			const empty = document.createElement('div');
			empty.className = 'cm-lp-collection-empty';
			empty.textContent = 'No results match the current filters';
			container.appendChild(empty);
			return container;
		}

		// Build table
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
		for (const record of result.records) {
			const tr = document.createElement('tr');
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
		container.appendChild(table);

		return container;
	}

	/** Renders a compact calendar grid for the live-preview widget */
	private buildCalendar(container: HTMLElement, view: CollectionViewDef, records: NoteRecord[]) {
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
		monthLabel.style.cssText = 'font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--lp-collection-header);';
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
			th.style.textAlign = 'center';
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
				dayNum.style.cssText = 'font-size: 11px; text-align: right; margin-bottom: 2px;';
				const dateKey = formatDateKey(day.date);
				if (dateKey === todayKey) {
					dayNum.style.cssText += 'font-weight: 700; color: var(--lp-collection-error, #60a5fa);';
				}
				dayNum.textContent = String(day.date.getDate());
				td.appendChild(dayNum);

				// Events
				const events = eventsByDate.get(dateKey);
				if (events) {
					const maxShow = 2;
					for (let i = 0; i < Math.min(events.length, maxShow); i++) {
						const pill = document.createElement('div');
						pill.style.cssText = 'font-size: 10px; padding: 1px 3px; margin-bottom: 1px; border-radius: 2px; background: var(--lp-collection-table-alt, rgba(255,255,255,0.05)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer;';
						pill.textContent = events[i].record.basename;
						pill.addEventListener('click', () => handleRowClick(events[i].record));
						td.appendChild(pill);
					}
					if (events.length > maxShow) {
						const more = document.createElement('div');
						more.style.cssText = 'font-size: 9px; color: var(--lp-collection-null); padding: 0 3px;';
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
	private buildLinearCalendar(container: HTMLElement, view: CollectionViewDef, records: NoteRecord[]) {
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

		const BAR_HEIGHT = 16;
		const BAR_GAP = 1;

		// Year label
		const yearLabel = document.createElement('div');
		yearLabel.style.cssText = 'font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--lp-collection-header);';
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
		emptyTh.style.cssText = 'width: 32px; font-size: 9px;';
		headerRow.appendChild(emptyTh);
		for (let d = 1; d <= 31; d++) {
			const th = document.createElement('th');
			th.textContent = String(d);
			th.style.cssText = 'font-size: 9px; text-align: center; padding: 1px;';
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
			labelTd.style.cssText = 'font-size: 10px; font-weight: 600; padding: 2px 4px; vertical-align: top; color: var(--lp-collection-null);';
			tr.appendChild(labelTd);

			// Day cells
			for (let d = 1; d <= 31; d++) {
				const td = document.createElement('td');
				const rowHeight = row.maxLane >= 0 ? (row.maxLane + 1) * (BAR_HEIGHT + BAR_GAP) + BAR_GAP : 20;
				td.style.cssText = `position: relative; padding: 0; height: ${rowHeight}px; vertical-align: top;`;

				if (d > row.daysInMonth) {
					td.style.opacity = '0.15';
				}

				// Today highlight
				if (row.month === now.getMonth() && d === now.getDate() && year === now.getFullYear()) {
					td.style.background = 'var(--lp-collection-error, rgba(96,165,250,0.15))';
				}

				tr.appendChild(td);
			}

			tbody.appendChild(tr);

			// Render event bars (separate pass to get cell references)
			if (row.events.length > 0) {
				const cells = tr.querySelectorAll('td');
				for (const event of row.events) {
					const startDay = event.startDate.getDate();
					const endDay = event.endDate.getDate();
					const bar = document.createElement('div');
					const color = colorMapping ? (getColorForValue(event.colorValue, colorMapping) ?? 'var(--lp-collection-error, #60a5fa)') : 'var(--lp-collection-error, #60a5fa)';
					bar.style.cssText = `position: absolute; left: 0; right: 0; top: ${event.lane * (BAR_HEIGHT + BAR_GAP) + BAR_GAP}px; height: ${BAR_HEIGHT}px; background: ${color}; border-radius: 2px; font-size: 9px; color: white; padding: 0 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; display: flex; align-items: center;`;
					bar.textContent = event.record.basename;
					bar.title = event.record.basename;
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
			this.indexSize === other.indexSize
		);
	}

	ignoreEvent() {
		return false;
	}
}

/** Navigates to the clicked note */
function handleRowClick(record: NoteRecord) {
	openFileInEditor(record.path);
}

/** Resolves a cell value from a record using the property key */
function getCellValue(record: NoteRecord, key: string): unknown {
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
