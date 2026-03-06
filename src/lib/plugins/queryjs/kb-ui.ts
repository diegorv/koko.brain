import type {
	KBCardItem,
	KBCardsOptions,
	KBProgressBarOptions,
	KBHeatmapOptions,
	KBTagsOptions,
	KBTagCloudOptions,
	KBStatusCardItem,
	KBStatusCardsOptions,
	KBStatusColorMap,
	KBTimelineItem,
	KBTimelineOptions,
	KBUITableOptions,
	KBChartType,
	KBChartDataset,
	KBChartOptions,
	KBHeatmapCalendarEntry,
	KBHeatmapCalendarOptions,
	KBYearlyCalendarOptions,
} from './kb-ui.types';
import { DataArray } from './data-array';
import { COLOR_PRESET_BG } from '$lib/utils/color-presets';

/** Default color scale for heatmaps: gray -> red -> yellow -> green (6 steps, 0-5) */
const DEFAULT_HEATMAP_COLORS = [
	'rgba(160,160,160,0.2)',
	'rgba(239,68,68,0.5)',
	'rgba(245,158,11,0.5)',
	'rgba(234,179,8,0.5)',
	'rgba(132,204,22,0.5)',
	'rgba(34,197,94,0.6)',
];


/** Timeout in milliseconds for loading Chart.js from CDN */
const CHARTJS_LOAD_TIMEOUT = 10_000;

/** Default status color mapping */
const DEFAULT_STATUS_COLORS: KBStatusColorMap = {
	active: { bg: 'rgba(72,187,120,0.1)', border: 'rgba(72,187,120,0.4)' },
	planning: { bg: 'rgba(66,153,225,0.1)', border: 'rgba(66,153,225,0.4)' },
	done: { bg: 'rgba(160,160,160,0.1)', border: 'rgba(160,160,160,0.4)' },
	draft: { bg: 'rgba(237,137,54,0.1)', border: 'rgba(237,137,54,0.4)' },
};

/**
 * UI render helpers for QueryJS.
 * Provides high-level widget methods (cards, heatmap, tagCloud, etc.)
 * that abstract away manual DOM construction.
 * Accessed via `kb.ui`.
 */
export class KBUI {
	/** The DOM container to render into */
	private readonly container: HTMLElement;
	/** Callback to render a value into a DOM element (handles KBLink, dates, etc.) */
	private readonly renderValue: (el: HTMLElement, value: unknown) => void;

	constructor(
		container: HTMLElement,
		renderValue?: (el: HTMLElement, value: unknown) => void,
	) {
		this.container = container;
		this.renderValue = renderValue ?? KBUI.defaultRenderValue;
	}

	/** Fallback renderer: plain string conversion */
	private static defaultRenderValue(el: HTMLElement, value: unknown): void {
		el.textContent = value == null ? '—' : String(value);
	}

	/**
	 * Renders a grid of stat cards.
	 * Each card shows a prominent value with a label underneath.
	 */
	cards(items: KBCardItem[], options?: KBCardsOptions): HTMLElement {
		const cols = Math.min(options?.columns ?? items.length, 6);
		const radius = options?.borderRadius ?? 8;

		const grid = document.createElement('div');
		grid.style.cssText = `display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 12px;`;

		for (const item of items) {
			const bg = this.resolveCardColor(item.color);

			const card = document.createElement('div');
			card.style.cssText = `padding: 16px; border-radius: ${radius}px; text-align: center; border: 1px solid rgba(255,255,255,0.1); background: ${bg};`;

			if (item.icon) {
				const iconEl = document.createElement('div');
				iconEl.style.cssText = 'font-size: 20px; margin-bottom: 4px;';
				iconEl.textContent = item.icon;
				card.appendChild(iconEl);
			}

			const valueEl = document.createElement('div');
			valueEl.style.cssText = 'font-size: 28px; font-weight: bold;';
			valueEl.textContent = String(item.value);
			card.appendChild(valueEl);

			const labelEl = document.createElement('div');
			labelEl.style.cssText = 'font-size: 15px; opacity: 0.7; margin-top: 4px;';
			labelEl.textContent = item.label;
			card.appendChild(labelEl);

			grid.appendChild(card);
		}

		this.container.appendChild(grid);
		return grid;
	}

	/**
	 * Returns a unicode progress bar string for use in table cells.
	 * Does NOT render to DOM — returns a string value.
	 */
	progressBar(value: number, max: number, options?: KBProgressBarOptions): string {
		const showValue = options?.showValue ?? true;

		// Guard against degenerate max — no bar can be drawn
		if (max <= 0) return showValue ? String(value) : '';

		const fillChar = options?.fillChar ?? '\u2588';
		const emptyChar = options?.emptyChar ?? '\u2591';
		const width = Math.max(0, Math.round(options?.width ?? max));

		const clamped = Math.max(0, Math.min(value, max));
		const filled = Math.round((clamped / max) * width);
		const empty = width - filled;

		const bar = fillChar.repeat(filled) + emptyChar.repeat(empty);
		return showValue ? `${bar} ${value}` : bar;
	}

	/**
	 * Renders a color-scaled heatmap grid with optional legend.
	 * Items are rendered as colored cells with value + label.
	 */
	heatmap<T>(items: Iterable<T> | DataArray<T>, options: KBHeatmapOptions<T>): HTMLElement {
		const arr = items instanceof DataArray ? items.array() : Array.from(items);
		const colorScale = options.colorScale ?? DEFAULT_HEATMAP_COLORS;
		const cellSize = options.cellSize ?? 48;
		const showLegend = options.showLegend ?? true;
		const minVal = options.min ?? 0;

		// Auto-detect max from data if not provided
		let maxVal = options.max ?? -Infinity;
		if (options.max === undefined) {
			for (const item of arr) {
				const v = options.value(item);
				if (v > maxVal) maxVal = v;
			}
		}
		// Prevent division by zero
		if (maxVal === minVal) maxVal = minVal + 1;

		const wrapper = document.createElement('div');

		const grid = document.createElement('div');
		grid.style.cssText = 'display: flex; gap: 4px; flex-wrap: wrap;';

		for (const item of arr) {
			const val = options.value(item);
			const colorIdx = Math.round(
				((Math.min(Math.max(val, minVal), maxVal) - minVal) / (maxVal - minVal)) *
					(colorScale.length - 1),
			);
			const color = colorScale[Math.min(colorIdx, colorScale.length - 1)];

			const cell = document.createElement('div');
			cell.style.cssText = `width: ${cellSize}px; height: ${cellSize}px; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; background: ${color};`;

			if (options.tooltip) {
				cell.title = options.tooltip(item);
			}

			const valSpan = document.createElement('span');
			valSpan.style.cssText = 'font-weight: bold; font-size: 16px;';
			valSpan.textContent = String(val);
			cell.appendChild(valSpan);

			if (options.label) {
				const labelSpan = document.createElement('span');
				labelSpan.style.opacity = '0.6';
				labelSpan.textContent = options.label(item);
				cell.appendChild(labelSpan);
			}

			grid.appendChild(cell);
		}

		wrapper.appendChild(grid);

		if (showLegend) {
			const legend = document.createElement('div');
			legend.style.cssText =
				'display: flex; gap: 6px; align-items: center; margin-top: 8px; font-size: 14px; opacity: 0.6;';
			legend.appendChild(document.createTextNode('Low '));
			for (const c of colorScale) {
				const box = document.createElement('span');
				box.style.cssText = `width: 16px; height: 16px; border-radius: 3px; display: inline-block; background: ${c};`;
				legend.appendChild(box);
			}
			legend.appendChild(document.createTextNode(' High'));
			wrapper.appendChild(legend);
		}

		this.container.appendChild(wrapper);
		return wrapper;
	}

	/**
	 * Renders a tag cloud where tag size/opacity scales with frequency.
	 * Accepts either a plain string[] (auto-counted) or a Record<string, number> of tag->count.
	 */
	tagCloud(
		tags: string[] | Record<string, number>,
		options?: KBTagCloudOptions,
	): HTMLElement {
		const minFont = options?.minFontSize ?? 14;
		const maxFont = options?.maxFontSize ?? 26;
		const baseColor = options?.color ?? 'rgba(139,108,239,0.3)';
		const showCount = options?.showCount ?? true;

		// Normalize to Record<string, number>
		let counts: Record<string, number>;
		if (Array.isArray(tags)) {
			counts = {};
			for (const tag of tags) {
				counts[tag] = (counts[tag] || 0) + 1;
			}
		} else {
			counts = tags;
		}

		const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
		const maxCount = entries.reduce((mx, [, c]) => (c > mx ? c : mx), 1);

		const cloud = document.createElement('div');
		cloud.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px;';

		for (const [tag, count] of entries) {
			const ratio = count / maxCount;
			const size = minFont + ratio * (maxFont - minFont);
			const opacity = 0.4 + ratio * 0.6;

			const chip = document.createElement('span');
			chip.textContent = showCount ? `${tag} (${count})` : tag;
			chip.style.cssText = `font-size: ${size}px; opacity: ${opacity}; padding: 3px 8px; border-radius: 12px; white-space: nowrap; background: ${baseColor};`;
			cloud.appendChild(chip);
		}

		this.container.appendChild(cloud);
		return cloud;
	}

	/**
	 * Renders an inline list of styled tag chips.
	 * For simple tag display in table cells and text — unlike tagCloud() which scales by frequency.
	 */
	tags(tags: string[], options?: KBTagsOptions): HTMLElement {
		const bg = options?.color ?? 'rgba(124,58,237,0.15)';
		const text = options?.textColor ?? 'rgba(186,197,238,0.9)';
		const size = options?.fontSize ?? 11;
		const gap = options?.gap ?? 4;

		const wrapper = document.createElement('span');
		wrapper.style.cssText = `display: inline-flex; gap: ${gap}px; flex-wrap: wrap;`;

		for (const tag of tags) {
			const chip = document.createElement('span');
			chip.textContent = tag;
			chip.style.cssText = `padding: 1px 8px; border-radius: 10px; font-size: ${size}px; background-color: ${bg}; color: ${text}; white-space: nowrap;`;
			wrapper.appendChild(chip);
		}

		this.container.appendChild(wrapper);
		return wrapper;
	}

	/**
	 * Renders a list of status-colored cards with badges.
	 */
	statusCards(items: KBStatusCardItem[], options?: KBStatusCardsOptions): HTMLElement {
		const colorMap = options?.colors ?? DEFAULT_STATUS_COLORS;
		const fallback = { bg: 'rgba(160,160,160,0.1)', border: 'rgba(160,160,160,0.4)' };

		const wrapper = document.createElement('div');

		for (const item of items) {
			const c = colorMap[item.status] ?? fallback;

			const card = document.createElement('div');
			card.style.cssText = `padding: 10px 14px; margin: 6px 0; border-radius: 8px; border: 1px solid ${c.border}; display: flex; justify-content: space-between; align-items: center; background: ${c.bg};`;

			const left = document.createElement('div');
			const name = document.createElement('strong');
			name.textContent = item.title;
			left.appendChild(name);

			if (item.subtitle) {
				const sub = document.createElement('div');
				sub.style.cssText = 'font-size: 14px; opacity: 0.6; margin-top: 2px;';
				sub.textContent = item.subtitle;
				left.appendChild(sub);
			}
			card.appendChild(left);

			const badge = document.createElement('span');
			badge.textContent = item.status;
			badge.style.cssText = `padding: 2px 10px; border-radius: 12px; font-size: 14px; color: #fff; background: ${c.border};`;
			card.appendChild(badge);

			wrapper.appendChild(card);
		}

		this.container.appendChild(wrapper);
		return wrapper;
	}

	/**
	 * Renders a grouped timeline with date headers and dot indicators.
	 */
	timeline(items: KBTimelineItem[], options?: KBTimelineOptions): HTMLElement {
		const defaultDotColor = options?.dotColor ?? 'rgba(139,108,239,0.8)';
		const wrapper = document.createElement('div');

		let lastDate = '';
		for (const item of items) {
			if (item.date !== lastDate) {
				const dateHeader = document.createElement('div');
				dateHeader.style.cssText =
					'font-weight: bold; padding: 8px 0 4px; border-bottom: 1px solid rgba(150,150,150,0.2); margin-top: 12px; font-size: 16px; opacity: 0.7;';
				dateHeader.textContent = item.date;
				wrapper.appendChild(dateHeader);
				lastDate = item.date;
			}

			const row = document.createElement('div');
			row.style.cssText =
				'padding: 4px 0 4px 16px; display: flex; align-items: center; gap: 8px;';

			const dot = document.createElement('span');
			const dotColor = item.dotColor ?? defaultDotColor;
			dot.style.cssText = `display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${dotColor};`;
			row.appendChild(dot);

			const titleSpan = document.createElement('span');
			titleSpan.textContent = item.title;
			row.appendChild(titleSpan);

			if (item.subtitle) {
				const sub = document.createElement('span');
				sub.style.cssText = 'font-size: 14px; opacity: 0.5; margin-left: auto;';
				sub.textContent = item.subtitle;
				row.appendChild(sub);
			}

			wrapper.appendChild(row);
		}

		this.container.appendChild(wrapper);
		return wrapper;
	}

	/**
	 * Renders an enhanced table with alignment, striping, conditional row styling, and footer.
	 * Uses the same CSS class as kb.table() but adds inline style enhancements.
	 */
	table(
		headers: string[],
		rows: unknown[][] | DataArray<unknown[]>,
		options?: KBUITableOptions,
	): HTMLElement {
		const arr = rows instanceof DataArray ? rows.array() : rows;
		const align = options?.align ?? [];
		const striped = options?.striped ?? false;
		const oddBg = 'rgba(255,255,255,0.03)';

		const table = document.createElement('table');
		table.className = 'cm-lp-qjs-table';

		// ── thead ──
		const thead = document.createElement('thead');
		const headerRow = document.createElement('tr');
		for (let i = 0; i < headers.length; i++) {
			const th = document.createElement('th');
			th.textContent = String(headers[i]);
			const colAlign = align[i];
			if (colAlign && colAlign !== 'left') {
				th.style.textAlign = colAlign;
			}
			headerRow.appendChild(th);
		}
		thead.appendChild(headerRow);
		table.appendChild(thead);

		// ── tbody ──
		const tbody = document.createElement('tbody');
		for (let rowIdx = 0; rowIdx < arr.length; rowIdx++) {
			const row = arr[rowIdx];
			const tr = document.createElement('tr');
			const cells = Array.isArray(row) ? row : [row];

			if (options?.rowStyle) {
				const bg = options.rowStyle(cells, rowIdx);
				if (bg) tr.style.backgroundColor = bg;
			} else if (striped && rowIdx % 2 !== 0) {
				tr.style.backgroundColor = oddBg;
			}

			for (let colIdx = 0; colIdx < cells.length; colIdx++) {
				const td = document.createElement('td');
				const colAlign = align[colIdx];
				if (colAlign && colAlign !== 'left') {
					td.style.textAlign = colAlign;
				}
				this.renderValue(td, cells[colIdx]);
				tr.appendChild(td);
			}
			tbody.appendChild(tr);
		}
		table.appendChild(tbody);

		// ── tfoot ──
		if (options?.footer) {
			const tfoot = document.createElement('tfoot');
			const footerRow = document.createElement('tr');
			for (let i = 0; i < options.footer.length; i++) {
				const td = document.createElement('td');
				td.style.fontWeight = '600';
				td.style.borderTop = '2px solid rgba(150,150,150,0.3)';
				const colAlign = align[i];
				if (colAlign && colAlign !== 'left') {
					td.style.textAlign = colAlign;
				}
				this.renderValue(td, options.footer[i]);
				footerRow.appendChild(td);
			}
			tfoot.appendChild(footerRow);
			table.appendChild(tfoot);
		}

		this.container.appendChild(table);
		return table;
	}

	/**
	 * Renders a Chart.js chart (radar, bar, line, pie, doughnut, polarArea).
	 * Lazy-loads Chart.js from CDN on first use. Detects theme for text/grid colors.
	 * If Chart.js fails to load, renders an inline error message.
	 */
	async chart(type: KBChartType, options: KBChartOptions): Promise<HTMLElement> {
		const wrapper = document.createElement('div');
		wrapper.style.cssText = 'display: flex; justify-content: center; width: 100%;';

		const isSquare = KBUI.isSquareChart(type);
		const maxW = options.maxWidth ?? (isSquare ? 600 : 800);

		const inner = document.createElement('div');
		inner.setAttribute(
			'style',
			isSquare
				? `width: 100%; max-width: ${maxW}px; aspect-ratio: 1;`
				: `width: 100%; max-width: ${maxW}px;`,
		);

		const canvas = document.createElement('canvas');
		inner.appendChild(canvas);
		wrapper.appendChild(inner);
		this.container.appendChild(wrapper);

		// Attempt to load Chart.js
		try {
			await KBUI.loadChartJS();
		} catch (err) {
			const errorEl = document.createElement('div');
			errorEl.style.cssText =
				'padding: 12px; border-radius: 8px; color: rgba(239,68,68,0.9); font-size: 13px; background: rgba(239,68,68,0.1);';
			errorEl.textContent = `Chart error: ${err instanceof Error ? err.message : String(err)}`;
			inner.replaceChild(errorEl, canvas);
			return wrapper;
		}

		// Theme detection
		const isDark = document.documentElement.classList.contains('dark');
		const highlight = isDark ? '#fff' : '#000';
		const gridColor = 'rgba(128, 128, 128, 0.3)';
		const textColor = highlight;

		// Determine fill default
		const fill = options.fill ?? type === 'radar';

		// Expand datasets
		const datasets = options.datasets.map((ds) =>
			KBUI.expandDataset(ds, type, highlight, fill),
		);

		// Build Chart.js config
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const ChartCtor = (window as any).Chart;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const config: Record<string, any> = {
			type,
			data: { labels: options.labels, datasets },
			options: {
				responsive: true,
				plugins: {
					legend: {
						display: options.showLegend ?? true,
						position: 'bottom',
						labels: { color: textColor, usePointStyle: true, padding: 15 },
					},
				},
			},
		};

		// Scale configuration based on chart type
		if (type === 'radar') {
			config.options.scales = {
				r: {
					beginAtZero: true,
					min: options.min ?? 0,
					...(options.max !== undefined ? { max: options.max } : {}),
					ticks: {
						...(options.stepSize !== undefined ? { stepSize: options.stepSize } : {}),
						color: textColor,
					},
					grid: { color: gridColor },
					angleLines: { color: gridColor },
					pointLabels: { color: textColor, font: { size: 13, weight: 'bold' } },
				},
			};
		} else if (type === 'bar' || type === 'line') {
			config.options.scales = {
				x: {
					ticks: { color: textColor },
					grid: { color: gridColor },
				},
				y: {
					beginAtZero: true,
					min: options.min ?? 0,
					...(options.max !== undefined ? { max: options.max } : {}),
					ticks: {
						...(options.stepSize !== undefined ? { stepSize: options.stepSize } : {}),
						color: textColor,
					},
					grid: { color: gridColor },
				},
			};
		} else if (type === 'polarArea') {
			config.options.scales = {
				r: {
					beginAtZero: true,
					min: options.min ?? 0,
					...(options.max !== undefined ? { max: options.max } : {}),
					ticks: { color: textColor },
					grid: { color: gridColor },
				},
			};
		}

		new ChartCtor(canvas, config);

		return wrapper;
	}

	/**
	 * Renders a GitHub-style heatmap calendar for an entire year.
	 * Each day is a small colored cell whose intensity maps to a color palette.
	 * Compatible with the Obsidian heatmap-calendar plugin API.
	 */
	heatmapCalendar(
		entries: KBHeatmapCalendarEntry[],
		options?: KBHeatmapCalendarOptions,
	): HTMLElement {
		const year = options?.year ?? new Date().getFullYear();
		const colors: Record<string, string[]> = options?.colors ?? {
			default: ['#c6e48b', '#7bc96f', '#49af5d', '#2e8840', '#196127'],
		};
		const showCurrentDayBorder = options?.showCurrentDayBorder ?? true;
		const defaultEntryIntensity = options?.defaultEntryIntensity ?? 4;
		const weekStartDay = options?.weekStartDay ?? 1;

		// Filter entries to displayed year
		const calEntries = entries.filter(
			(e) => new Date(e.date + 'T00:00').getFullYear() === year,
		);

		// Determine intensity scale from data
		const intensities = calEntries.filter((e) => e.intensity != null).map((e) => e.intensity!);
		const minIntensity = intensities.length ? Math.min(...intensities) : 1;
		const maxIntensity = intensities.length ? Math.max(...intensities) : 5;
		const scaleStart = options?.intensityScaleStart ?? minIntensity;
		const scaleEnd = options?.intensityScaleEnd ?? maxIntensity;

		// Map entries to day-of-year index with resolved intensity
		const firstColorKey = Object.keys(colors)[0];
		const mappedEntries: Record<number, { date: string; intensity: number; color?: string; content?: string }> = {};

		for (const e of calEntries) {
			const intensity = e.intensity ?? defaultEntryIntensity;
			const colorArr = colors[e.color ?? ''] ?? colors[firstColorKey];
			const numLevels = colorArr.length;

			let mapped: number;
			if (minIntensity === maxIntensity && scaleStart === scaleEnd) {
				mapped = numLevels;
			} else {
				mapped = Math.round(KBUI.mapRange(intensity, scaleStart, scaleEnd, 1, numLevels));
			}

			const dayOfYear = KBUI.getDayOfYear(new Date(e.date + 'T00:00'));
			mappedEntries[dayOfYear] = {
				date: e.date,
				intensity: mapped,
				color: e.color,
				content: e.content,
			};
		}

		// Build box data for the year
		const isDark = document.documentElement.classList.contains('dark');
		const emptyColor = isDark ? '#333' : '#ebedf0';
		const firstDay = new Date(Date.UTC(year, 0, 1));
		const emptyBefore = (firstDay.getUTCDay() + 7 - weekStartDay) % 7;
		const lastDay = new Date(Date.UTC(year, 11, 31));
		const daysInYear = KBUI.getDayOfYear(lastDay);
		const todayDayLocal = KBUI.getDayOfYearLocal(new Date());
		const todayYear = new Date().getFullYear();

		interface Box {
			bg: string;
			date?: string;
			content?: string;
			isToday: boolean;
			hasData: boolean;
			monthClass: string;
		}

		const boxes: Box[] = [];

		// Empty leading cells
		for (let i = 0; i < emptyBefore; i++) {
			boxes.push({ bg: 'transparent', isToday: false, hasData: false, monthClass: '' });
		}

		const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

		for (let day = 1; day <= daysInYear; day++) {
			const d = new Date(year, 0, day);
			const monthClass = `month-${MONTHS_SHORT[d.getMonth()]}`;
			const isToday = year === todayYear && day === todayDayLocal && showCurrentDayBorder;

			if (mappedEntries[day]) {
				const entry = mappedEntries[day];
				const colorArr = colors[entry.color ?? ''] ?? colors[firstColorKey];
				const bg = colorArr[Math.max(0, Math.min(entry.intensity - 1, colorArr.length - 1))];
				boxes.push({ bg, date: entry.date, content: entry.content, isToday, hasData: true, monthClass });
			} else {
				boxes.push({ bg: emptyColor, isToday, hasData: false, monthClass });
			}
		}

		// ── Render DOM ──
		const graph = document.createElement('div');
		graph.className = 'heatmap-calendar-graph';
		graph.style.cssText = `
			font-size: 0.65em;
			display: grid;
			grid-template-columns: auto 1fr;
			grid-template-areas: 'year months' 'days boxes';
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
			width: 100%;
			padding: 5px;
		`.replace(/\s+/g, ' ');

		// Year label
		const yearEl = document.createElement('div');
		yearEl.style.cssText = 'grid-area: year; font-weight: bold; font-size: 1.2em;';
		yearEl.textContent = String(year).slice(2);
		graph.appendChild(yearEl);

		// Month labels
		const monthsUl = document.createElement('ul');
		monthsUl.style.cssText = 'display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); grid-area: months; margin: 0.1em 0 0.3em; gap: 0.3em; list-style: none; padding: 0;';
		const MONTHS_DISPLAY = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		for (const m of MONTHS_DISPLAY) {
			const li = document.createElement('li');
			li.textContent = m;
			monthsUl.appendChild(li);
		}
		graph.appendChild(monthsUl);

		// Day-of-week labels
		const daysUl = document.createElement('ul');
		daysUl.style.cssText = 'grid-area: days; margin: 0 0.3em 0 0.1em; white-space: nowrap; display: grid; gap: 0.3em; grid-template-rows: repeat(7, minmax(0, 1fr)); list-style: none; padding: 0;';
		for (let i = 0; i < 7; i++) {
			const li = document.createElement('li');
			li.textContent = new Date(1970, 0, i + weekStartDay + 4).toLocaleDateString('en-US', { weekday: 'short' });
			if (i % 2 === 0) li.style.visibility = 'hidden';
			daysUl.appendChild(li);
		}
		graph.appendChild(daysUl);

		// Boxes grid
		const boxesUl = document.createElement('ul');
		boxesUl.style.cssText = 'grid-auto-flow: column; grid-template-columns: repeat(53, minmax(0, 1fr)); grid-area: boxes; display: grid; gap: 0.3em; grid-template-rows: repeat(7, minmax(0, 1fr)); list-style: none; padding: 0;';

		for (const box of boxes) {
			const li = document.createElement('li');
			li.style.cssText = `position: relative; font-size: 0.75em; width: 100%; aspect-ratio: 1; background-color: ${box.bg};`;

			if (box.isToday) {
				li.style.border = 'solid 1px rgb(61, 61, 61)';
			}
			if (box.date) {
				li.dataset.date = box.date;
			}
			if (box.content) {
				const span = document.createElement('span');
				span.style.cssText = 'position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;';
				span.textContent = box.content;
				li.appendChild(span);
			}

			boxesUl.appendChild(li);
		}
		graph.appendChild(boxesUl);

		this.container.appendChild(graph);
		return graph;
	}

	/**
	 * Renders a vertical year calendar with months as columns and days as rows.
	 * 12 columns × 31 rows of rounded square boxes colored by intensity.
	 * Inspired by the Obsidian every-day-calendar plugin.
	 */
	yearlyCalendar(
		entries: KBHeatmapCalendarEntry[],
		options?: KBYearlyCalendarOptions,
	): HTMLElement {
		const year = options?.year ?? new Date().getFullYear();
		const colors: Record<string, string[]> = options?.colors ?? {
			default: ['#c6e48b', '#7bc96f', '#49af5d', '#2e8840', '#196127'],
		};
		const showCurrentDayBorder = options?.showCurrentDayBorder ?? true;
		const defaultEntryIntensity = options?.defaultEntryIntensity ?? 4;

		// Filter entries to displayed year
		const calEntries = entries.filter(
			(e) => new Date(e.date + 'T00:00').getFullYear() === year,
		);

		// Determine intensity scale
		const intensities = calEntries.filter((e) => e.intensity != null).map((e) => e.intensity!);
		const minIntensity = intensities.length ? Math.min(...intensities) : 1;
		const maxIntensity = intensities.length ? Math.max(...intensities) : 5;
		const scaleStart = options?.intensityScaleStart ?? minIntensity;
		const scaleEnd = options?.intensityScaleEnd ?? maxIntensity;

		// Index entries by "month-day" key for fast lookup
		const firstColorKey = Object.keys(colors)[0];
		const entryMap: Record<string, { intensity: number; color?: string; content?: string; date: string }> = {};

		for (const e of calEntries) {
			const d = new Date(e.date + 'T00:00');
			const key = `${d.getMonth() + 1}-${d.getDate()}`;
			const intensity = e.intensity ?? defaultEntryIntensity;
			const colorArr = colors[e.color ?? ''] ?? colors[firstColorKey];
			const numLevels = colorArr.length;

			let mapped: number;
			if (minIntensity === maxIntensity && scaleStart === scaleEnd) {
				mapped = numLevels;
			} else {
				mapped = Math.round(KBUI.mapRange(intensity, scaleStart, scaleEnd, 1, numLevels));
			}

			entryMap[key] = { intensity: mapped, color: e.color, content: e.content, date: e.date };
		}

		const isDark = document.documentElement.classList.contains('dark');
		const emptyColor = isDark ? '#333' : '#ebedf0';
		const today = new Date();
		const todayMonth = today.getMonth() + 1;
		const todayDay = today.getDate();
		const todayYear = today.getFullYear();

		const MONTH_NARROW = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

		// ── Render DOM ──
		// Height-driven layout: 32 rows (1 label + 31 days) fit within max-height,
		// width is derived from height × (12/32) to keep boxes square.
		const gap = 2;
		const numRows = 32;
		const numCols = 12;

		const outer = document.createElement('div');
		outer.className = 'yearly-calendar';
		outer.style.cssText = `display: inline-grid; grid-template-columns: 100%; gap: ${gap}px; max-height: 65vh; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;`;

		// Year label
		const yearEl = document.createElement('div');
		yearEl.className = 'yearly-calendar-year';
		yearEl.style.cssText = 'text-align: center; font-weight: bold; font-size: 1.1em; padding: 2px 0;';
		yearEl.textContent = String(year);
		outer.appendChild(yearEl);

		// Boxes grid: 12 columns × 32 rows, height-constrained
		const boxesDiv = document.createElement('div');
		boxesDiv.className = 'yearly-calendar-boxes';
		boxesDiv.style.cssText = `display: grid; grid-template-columns: repeat(${numCols}, 1fr); grid-template-rows: repeat(${numRows}, 1fr); grid-auto-flow: dense; gap: ${gap}px; height: 100%; aspect-ratio: ${numCols} / ${numRows};`;

		for (let month = 1; month <= 12; month++) {
			// Month label
			const monthLabel = document.createElement('div');
			monthLabel.style.cssText = `grid-column: ${month}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85em;`;
			monthLabel.textContent = MONTH_NARROW[month - 1];
			boxesDiv.appendChild(monthLabel);

			// Day boxes
			const daysInMonth = new Date(year, month, 0).getDate();
			for (let day = 1; day <= daysInMonth; day++) {
				const key = `${month}-${day}`;
				const entry = entryMap[key];
				const isToday = showCurrentDayBorder && year === todayYear && month === todayMonth && day === todayDay;

				const box = document.createElement('span');
				let bg = emptyColor;
				if (entry) {
					const colorArr = colors[entry.color ?? ''] ?? colors[firstColorKey];
					bg = colorArr[Math.max(0, Math.min(entry.intensity - 1, colorArr.length - 1))];
				}

				box.style.cssText = `grid-column: ${month}; border-radius: 25%; background-color: ${bg};`;

				if (isToday) {
					box.style.border = 'solid 1px rgb(61, 61, 61)';
				}
				if (entry?.date) {
					box.dataset.date = entry.date;
				}
				if (entry?.content) {
					box.style.display = 'flex';
					box.style.alignItems = 'center';
					box.style.justifyContent = 'center';
					box.style.fontSize = '0.7em';
					box.textContent = entry.content;
				}

				boxesDiv.appendChild(box);
			}
		}

		outer.appendChild(boxesDiv);

		const wrapper = document.createElement('div');
		wrapper.style.cssText = 'display: flex; justify-content: center; width: 100%;';
		wrapper.appendChild(outer);
		this.container.appendChild(wrapper);
		return wrapper;
	}

	/** Resolves a color name to a CSS color string. Named presets are supported. */
	private resolveCardColor(color?: string): string {
		if (!color) return 'rgba(160,160,160,0.15)';
		return COLOR_PRESET_BG[color] ?? color;
	}

	/**
	 * Lazy-loads Chart.js from CDN if not already available on window.
	 * Caches on window.Chart. Rejects after timeout or network error.
	 */
	private static loadChartJS(): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if ((window as any).Chart) return Promise.resolve();

		return new Promise<void>((resolve, reject) => {
			const script = document.createElement('script');
			script.src = 'https://cdn.jsdelivr.net/npm/chart.js/dist/chart.umd.min.js';

			const timer = setTimeout(() => {
				script.remove();
				reject(new Error('Chart.js load timeout (10s)'));
			}, CHARTJS_LOAD_TIMEOUT);

			script.onload = () => {
				clearTimeout(timer);
				resolve();
			};

			script.onerror = () => {
				clearTimeout(timer);
				script.remove();
				reject(new Error('Failed to load Chart.js from CDN'));
			};

			document.head.appendChild(script);
		});
	}

	/** Returns true for chart types that render best in a square aspect ratio */
	private static isSquareChart(type: KBChartType): boolean {
		return type === 'radar' || type === 'pie' || type === 'doughnut' || type === 'polarArea';
	}

	/** Returns 1-based day-of-year using UTC (e.g. Jan 1 = 1, Feb 3 = 34) */
	private static getDayOfYear(date: Date): number {
		return (
			(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
				Date.UTC(date.getUTCFullYear(), 0, 0)) /
			86_400_000
		);
	}

	/** Returns 1-based day-of-year using local time (for comparing with "today") */
	private static getDayOfYearLocal(date: Date): number {
		return (
			(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
				Date.UTC(date.getFullYear(), 0, 0)) /
			86_400_000
		);
	}

	/** Linear interpolation with clamping from [inMin,inMax] to [outMin,outMax] */
	private static mapRange(
		current: number,
		inMin: number,
		inMax: number,
		outMin: number,
		outMax: number,
	): number {
		const mapped = ((current - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
		return Math.max(outMin, Math.min(mapped, outMax));
	}

	/** Expands a simplified KBChartDataset into a full Chart.js dataset config */
	private static expandDataset(
		ds: KBChartDataset,
		type: KBChartType,
		highlight: string,
		fill: boolean,
	): Record<string, unknown> {
		const isSegmented = type === 'pie' || type === 'doughnut' || type === 'polarArea';
		const colors = Array.isArray(ds.color) ? ds.color : [ds.color];

		if (isSegmented) {
			// Per-segment colors: expand single color to array length, or use provided array
			const segmentColors =
				colors.length === 1
					? ds.data.map(() => colors[0])
					: colors;
			const segmentBorders =
				colors.length === 1
					? ds.data.map(() => highlight)
					: colors;
			return {
				label: ds.label,
				data: ds.data,
				backgroundColor: segmentColors,
				borderColor: segmentBorders,
				borderWidth: 1,
			};
		}

		// Line/bar/radar: single color with transparent fill
		const color = colors[0];
		const transparent = color.replace(/,\s*[\d.]+\)$/, ', 0.15)');
		return {
			label: ds.label,
			data: ds.data,
			borderColor: color,
			backgroundColor: transparent,
			pointBackgroundColor: color,
			pointBorderColor: highlight,
			pointHoverBackgroundColor: highlight,
			pointHoverBorderColor: color,
			borderWidth: 2,
			fill,
		};
	}
}
