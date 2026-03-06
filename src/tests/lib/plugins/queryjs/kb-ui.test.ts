// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KBUI } from '$lib/plugins/queryjs/kb-ui';
import { DataArray } from '$lib/plugins/queryjs/data-array';

describe('KBUI', () => {
	let container: HTMLElement;
	let ui: KBUI;

	beforeEach(() => {
		container = document.createElement('div');
		ui = new KBUI(container);
	});

	describe('cards', () => {
		it('renders a grid with the correct number of cards', () => {
			ui.cards([
				{ label: 'Total', value: 42, color: 'blue' },
				{ label: 'Active', value: 10, color: 'green' },
				{ label: 'Draft', value: 5, color: 'orange' },
			]);

			const grid = container.firstElementChild as HTMLElement;
			expect(grid).not.toBeNull();
			expect(grid.children.length).toBe(3);
			expect(grid.style.display).toBe('grid');
		});

		it('displays value and label text correctly', () => {
			ui.cards([{ label: 'Notes', value: 99 }]);

			const card = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			const divs = card.querySelectorAll('div');
			expect(divs[0].textContent).toBe('99');
			expect(divs[1].textContent).toBe('Notes');
		});

		it('renders icon when provided', () => {
			ui.cards([{ label: 'Test', value: 1, icon: '📝' }]);

			const card = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			const divs = card.querySelectorAll('div');
			expect(divs[0].textContent).toBe('📝');
			expect(divs[1].textContent).toBe('1');
			expect(divs[2].textContent).toBe('Test');
		});

		it('resolves named color presets to background', () => {
			ui.cards([{ label: 'Test', value: 1, color: 'blue' }]);

			const card = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			expect(card.style.backgroundColor).toContain('66, 153, 225');
		});

		it('passes through custom CSS colors', () => {
			ui.cards([{ label: 'Test', value: 1, color: '#ff0000' }]);

			const card = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			expect(card.style.backgroundColor).toBeTruthy();
		});

		it('uses default gray when no color specified', () => {
			ui.cards([{ label: 'Test', value: 1 }]);

			const card = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			expect(card.style.backgroundColor).toContain('160, 160, 160');
		});

		it('respects columns option', () => {
			ui.cards(
				[
					{ label: 'A', value: 1 },
					{ label: 'B', value: 2 },
					{ label: 'C', value: 3 },
					{ label: 'D', value: 4 },
				],
				{ columns: 2 },
			);

			const grid = container.firstElementChild as HTMLElement;
			expect(grid.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
		});

		it('caps columns at 6', () => {
			const items = Array.from({ length: 10 }, (_, i) => ({
				label: `Item ${i}`,
				value: i,
			}));
			ui.cards(items, { columns: 10 });

			const grid = container.firstElementChild as HTMLElement;
			expect(grid.style.gridTemplateColumns).toBe('repeat(6, 1fr)');
		});

		it('respects borderRadius option', () => {
			ui.cards([{ label: 'Test', value: 1 }], { borderRadius: 16 });

			const card = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			expect(card.style.borderRadius).toBe('16px');
		});

		it('returns the grid element', () => {
			const result = ui.cards([{ label: 'Test', value: 1 }]);
			expect(result).toBe(container.firstElementChild);
		});
	});

	describe('progressBar', () => {
		it('returns a progress bar string with value', () => {
			expect(ui.progressBar(3, 5)).toBe('\u2588\u2588\u2588\u2591\u2591 3');
		});

		it('returns full bar at max value', () => {
			expect(ui.progressBar(5, 5)).toBe('\u2588\u2588\u2588\u2588\u2588 5');
		});

		it('returns empty bar at zero', () => {
			expect(ui.progressBar(0, 5)).toBe('\u2591\u2591\u2591\u2591\u2591 0');
		});

		it('clamps value above max', () => {
			expect(ui.progressBar(10, 5)).toBe('\u2588\u2588\u2588\u2588\u2588 10');
		});

		it('clamps negative value to zero', () => {
			expect(ui.progressBar(-2, 5)).toBe('\u2591\u2591\u2591\u2591\u2591 -2');
		});

		it('hides value when showValue is false', () => {
			expect(ui.progressBar(3, 5, { showValue: false })).toBe('\u2588\u2588\u2588\u2591\u2591');
		});

		it('uses custom fill and empty characters', () => {
			expect(ui.progressBar(2, 4, { fillChar: '#', emptyChar: '-' })).toBe('##-- 2');
		});

		it('respects custom width', () => {
			const bar = ui.progressBar(5, 10, { width: 20, showValue: false });
			expect(bar.length).toBe(20);
			expect(bar.split('\u2588').length - 1).toBe(10);
		});

		it('does NOT append to container (returns string only)', () => {
			ui.progressBar(3, 5);
			expect(container.children.length).toBe(0);
		});

		it('returns value string when max is zero', () => {
			expect(ui.progressBar(5, 0)).toBe('5');
		});

		it('returns empty string when max is zero and showValue is false', () => {
			expect(ui.progressBar(5, 0, { showValue: false })).toBe('');
		});

		it('returns value string when max is negative', () => {
			expect(ui.progressBar(3, -1)).toBe('3');
		});

		it('clamps negative width to zero without throwing', () => {
			expect(ui.progressBar(3, 10, { width: -5 })).toBe(' 3');
		});

		it('clamps fractional width by rounding', () => {
			const bar = ui.progressBar(5, 10, { width: 3.7, showValue: false });
			expect(bar.length).toBe(4);
		});
	});

	describe('heatmap', () => {
		const items = [
			{ name: 'Mon', val: 1 },
			{ name: 'Tue', val: 3 },
			{ name: 'Wed', val: 5 },
		];

		it('renders correct number of cells', () => {
			ui.heatmap(items, { value: (i) => i.val, max: 5 });

			const grid = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			expect(grid.children.length).toBe(3);
		});

		it('shows value text in each cell', () => {
			ui.heatmap(items, { value: (i) => i.val, max: 5 });

			const grid = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			const valueTexts = Array.from(grid.children).map(
				(cell) => (cell.querySelector('span') as HTMLElement).textContent,
			);
			expect(valueTexts).toEqual(['1', '3', '5']);
		});

		it('shows labels when label option is provided', () => {
			ui.heatmap(items, {
				value: (i) => i.val,
				label: (i) => i.name,
				max: 5,
			});

			const grid = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			for (const cell of Array.from(grid.children)) {
				expect(cell.querySelectorAll('span').length).toBe(2);
			}
		});

		it('auto-detects max when not provided', () => {
			ui.heatmap(items, { value: (i) => i.val });
			expect(container.children.length).toBe(1);
		});

		it('auto-detects max correctly with all-negative values', () => {
			const negItems = [
				{ name: 'A', val: -10 },
				{ name: 'B', val: -3 },
				{ name: 'C', val: -7 },
			];
			ui.heatmap(negItems, { value: (i) => i.val, min: -10 });

			// -3 is the max; should not default to 0
			const grid = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			expect(grid.children.length).toBe(3);
			// The highest value (-3) should get the highest color index
			const highCell = grid.children[1] as HTMLElement;
			const lowCell = grid.children[0] as HTMLElement;
			expect(highCell.style.backgroundColor).not.toBe(lowCell.style.backgroundColor);
		});

		it('shows legend by default', () => {
			ui.heatmap(items, { value: (i) => i.val, max: 5 });

			const wrapper = container.firstElementChild as HTMLElement;
			expect(wrapper.children.length).toBe(2);
			expect(wrapper.lastElementChild!.textContent).toContain('Low');
			expect(wrapper.lastElementChild!.textContent).toContain('High');
		});

		it('hides legend when showLegend is false', () => {
			ui.heatmap(items, { value: (i) => i.val, max: 5, showLegend: false });

			const wrapper = container.firstElementChild as HTMLElement;
			expect(wrapper.children.length).toBe(1);
		});

		it('sets tooltip when tooltip option is provided', () => {
			ui.heatmap(items, {
				value: (i) => i.val,
				tooltip: (i) => `${i.name}: ${i.val}`,
				max: 5,
			});

			const grid = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			expect(grid.children[0].getAttribute('title')).toBe('Mon: 1');
		});

		it('accepts DataArray as input', () => {
			const da = new DataArray(items);
			ui.heatmap(da, { value: (i) => i.val, max: 5 });

			const grid = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			expect(grid.children.length).toBe(3);
		});

		it('respects custom cellSize', () => {
			ui.heatmap(items, { value: (i) => i.val, max: 5, cellSize: 32 });

			const cell = (container.firstElementChild as HTMLElement)
				.firstElementChild!.firstElementChild as HTMLElement;
			expect(cell.style.width).toBe('32px');
			expect(cell.style.height).toBe('32px');
		});

		it('returns the wrapper element', () => {
			const result = ui.heatmap(items, { value: (i) => i.val, max: 5 });
			expect(result).toBe(container.firstElementChild);
		});
	});

	describe('tagCloud', () => {
		it('renders chips from string array with auto-counting', () => {
			ui.tagCloud(['js', 'ts', 'js', 'rust', 'js']);

			const chips = container.querySelectorAll('span');
			expect(chips.length).toBe(3);
		});

		it('sorts by frequency (most frequent first)', () => {
			ui.tagCloud(['js', 'ts', 'js', 'rust', 'js', 'ts']);

			const chips = container.querySelectorAll('span');
			expect(chips[0].textContent).toContain('js');
			expect(chips[1].textContent).toContain('ts');
		});

		it('shows count by default', () => {
			ui.tagCloud(['a', 'a', 'b']);

			const chips = container.querySelectorAll('span');
			expect(chips[0].textContent).toBe('a (2)');
			expect(chips[1].textContent).toBe('b (1)');
		});

		it('hides count when showCount is false', () => {
			ui.tagCloud(['a', 'a', 'b'], { showCount: false });

			const chips = container.querySelectorAll('span');
			expect(chips[0].textContent).toBe('a');
			expect(chips[1].textContent).toBe('b');
		});

		it('accepts Record<string, number> input', () => {
			ui.tagCloud({ javascript: 10, python: 5, rust: 3 });

			const chips = container.querySelectorAll('span');
			expect(chips.length).toBe(3);
			expect(chips[0].textContent).toContain('javascript');
		});

		it('most frequent tag has largest font size', () => {
			ui.tagCloud({ big: 100, small: 1 });

			const chips = container.querySelectorAll('span');
			const bigSize = parseFloat((chips[0] as HTMLElement).style.fontSize);
			const smallSize = parseFloat((chips[1] as HTMLElement).style.fontSize);
			expect(bigSize).toBeGreaterThan(smallSize);
		});

		it('respects custom font size range', () => {
			ui.tagCloud({ a: 5 }, { minFontSize: 14, maxFontSize: 30 });

			const chip = container.querySelector('span') as HTMLElement;
			expect(chip.style.fontSize).toBe('30px');
		});

		it('respects custom color', () => {
			ui.tagCloud(['a'], { color: 'rgba(255,0,0,0.5)' });

			const chip = container.querySelector('span') as HTMLElement;
			expect(chip.style.backgroundColor).toContain('255, 0, 0');
		});

		it('returns the cloud element', () => {
			const result = ui.tagCloud(['a']);
			expect(result).toBe(container.firstElementChild);
		});
	});

	describe('tags', () => {
		it('renders tag chips', () => {
			ui.tags(['alpha', 'beta', 'gamma']);
			const wrapper = container.firstElementChild as HTMLElement;
			expect(wrapper.children.length).toBe(3);
			expect(wrapper.children[0].textContent).toBe('alpha');
			expect(wrapper.children[1].textContent).toBe('beta');
			expect(wrapper.children[2].textContent).toBe('gamma');
		});

		it('renders empty wrapper for empty array', () => {
			ui.tags([]);
			const wrapper = container.firstElementChild as HTMLElement;
			expect(wrapper.children.length).toBe(0);
		});

		it('uses inline-flex layout', () => {
			ui.tags(['a']);
			const wrapper = container.firstElementChild as HTMLElement;
			expect(wrapper.style.display).toBe('inline-flex');
		});

		it('applies custom colors', () => {
			ui.tags(['a'], { color: 'rgba(255,0,0,0.2)', textColor: 'red' });
			const wrapper = container.firstElementChild as HTMLElement;
			const chip = wrapper.children[0] as HTMLElement;
			expect(chip.style.backgroundColor).toContain('255, 0, 0');
			expect(chip.style.color).toBe('red');
		});

		it('applies custom fontSize', () => {
			ui.tags(['a'], { fontSize: 14 });
			const wrapper = container.firstElementChild as HTMLElement;
			const chip = wrapper.children[0] as HTMLElement;
			const style = chip.getAttribute('style') ?? '';
			expect(style).toContain('font-size: 14px');
		});

		it('applies custom gap', () => {
			ui.tags(['a', 'b'], { gap: 8 });
			const wrapper = container.firstElementChild as HTMLElement;
			expect(wrapper.style.gap).toBe('8px');
		});

		it('returns the wrapper element', () => {
			const result = ui.tags(['a']);
			expect(result).toBe(container.firstElementChild);
		});
	});

	describe('statusCards', () => {
		const items = [
			{ title: 'Project A', status: 'active', subtitle: 'Frontend' },
			{ title: 'Project B', status: 'draft' },
			{ title: 'Project C', status: 'done' },
		];

		it('renders correct number of cards', () => {
			ui.statusCards(items);

			const wrapper = container.firstElementChild as HTMLElement;
			expect(wrapper.children.length).toBe(3);
		});

		it('displays title text', () => {
			ui.statusCards(items);

			const strongs = container.querySelectorAll('strong');
			expect(strongs[0].textContent).toBe('Project A');
			expect(strongs[1].textContent).toBe('Project B');
		});

		it('displays status badge', () => {
			ui.statusCards(items);

			const badges = container.querySelectorAll('span');
			expect(badges[0].textContent).toBe('active');
			expect(badges[1].textContent).toBe('draft');
			expect(badges[2].textContent).toBe('done');
		});

		it('displays subtitle when provided', () => {
			ui.statusCards(items);

			const firstCard = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			const leftDiv = firstCard.firstElementChild as HTMLElement;
			const subtitle = leftDiv.querySelector('div');
			expect(subtitle).not.toBeNull();
			expect(subtitle!.textContent).toBe('Frontend');
		});

		it('uses default colors for known statuses', () => {
			ui.statusCards([{ title: 'Test', status: 'active' }]);

			const card = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			expect(card.style.backgroundColor).toContain('72, 187, 120');
		});

		it('uses fallback color for unknown status', () => {
			ui.statusCards([{ title: 'Test', status: 'unknown-status' }]);

			const card = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			expect(card.style.backgroundColor).toContain('160, 160, 160');
		});

		it('accepts custom color map', () => {
			ui.statusCards([{ title: 'Test', status: 'custom' }], {
				colors: {
					custom: { bg: 'rgba(255,0,0,0.1)', border: 'rgba(255,0,0,0.4)' },
				},
			});

			const card = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement;
			expect(card.style.backgroundColor).toContain('255, 0, 0');
		});

		it('returns the wrapper element', () => {
			const result = ui.statusCards(items);
			expect(result).toBe(container.firstElementChild);
		});
	});

	describe('timeline', () => {
		const items = [
			{ date: '2026-02-13', title: 'Note A' },
			{ date: '2026-02-13', title: 'Note B', subtitle: 'journal' },
			{ date: '2026-02-14', title: 'Note C' },
		];

		/** Helper: find timeline item rows (non-header children) */
		function getRows(wrapper: HTMLElement): HTMLElement[] {
			return Array.from(wrapper.children).filter(
				(el) => (el as HTMLElement).style.display === 'flex',
			) as HTMLElement[];
		}

		/** Helper: find date headers */
		function getHeaders(wrapper: HTMLElement): HTMLElement[] {
			return Array.from(wrapper.children).filter(
				(el) => (el as HTMLElement).style.fontWeight === 'bold',
			) as HTMLElement[];
		}

		it('groups items by date with headers', () => {
			ui.timeline(items);

			const wrapper = container.firstElementChild as HTMLElement;
			const headers = getHeaders(wrapper);
			expect(headers.length).toBe(2);
			expect(headers[0].textContent).toBe('2026-02-13');
			expect(headers[1].textContent).toBe('2026-02-14');
		});

		it('renders correct number of item rows', () => {
			ui.timeline(items);

			const wrapper = container.firstElementChild as HTMLElement;
			const rows = getRows(wrapper);
			expect(rows.length).toBe(3);
		});

		it('shows title text in each row', () => {
			ui.timeline(items);

			const wrapper = container.firstElementChild as HTMLElement;
			const rows = getRows(wrapper);
			const titles = rows.map((r) => r.querySelectorAll('span')[1]?.textContent);
			expect(titles).toEqual(['Note A', 'Note B', 'Note C']);
		});

		it('renders dot indicators in each row', () => {
			ui.timeline(items);

			const wrapper = container.firstElementChild as HTMLElement;
			const rows = getRows(wrapper);
			for (const row of rows) {
				const dot = row.querySelector('span') as HTMLElement;
				expect(dot.style.borderRadius).toBe('50%');
			}
		});

		it('shows subtitle when provided', () => {
			ui.timeline(items);

			const wrapper = container.firstElementChild as HTMLElement;
			const rows = getRows(wrapper);
			const subtitleSpans = rows[1].querySelectorAll('span');
			const subtitle = subtitleSpans[subtitleSpans.length - 1];
			expect(subtitle.textContent).toBe('journal');
		});

		it('uses custom dot color from item', () => {
			ui.timeline([
				{ date: '2026-01-01', title: 'Test', dotColor: 'rgba(255,0,0,0.8)' },
			]);

			const wrapper = container.firstElementChild as HTMLElement;
			const rows = getRows(wrapper);
			const dot = rows[0].querySelector('span') as HTMLElement;
			expect(dot.style.backgroundColor).toContain('255, 0, 0');
		});

		it('uses default dot color from options', () => {
			ui.timeline([{ date: '2026-01-01', title: 'Test' }], {
				dotColor: 'rgba(0,255,0,0.8)',
			});

			const wrapper = container.firstElementChild as HTMLElement;
			const rows = getRows(wrapper);
			const dot = rows[0].querySelector('span') as HTMLElement;
			expect(dot.style.backgroundColor).toContain('0, 255, 0');
		});

		it('returns the wrapper element', () => {
			const result = ui.timeline(items);
			expect(result).toBe(container.firstElementChild);
		});
	});

	describe('table', () => {
		it('renders a basic table with headers and rows', () => {
			const table = ui.table(['Name', 'Value'], [
				['alpha', '1'],
				['beta', '2'],
			]);

			expect(table.tagName).toBe('TABLE');
			expect(table.className).toBe('cm-lp-qjs-table');
			const ths = table.querySelectorAll('th');
			expect(ths.length).toBe(2);
			expect(ths[0].textContent).toBe('Name');
			expect(ths[1].textContent).toBe('Value');
			const tds = table.querySelectorAll('td');
			expect(tds.length).toBe(4);
			expect(tds[0].textContent).toBe('alpha');
		});

		it('applies column alignment to headers and cells', () => {
			ui.table(['Left', 'Center', 'Right'], [['a', 'b', 'c']], {
				align: ['left', 'center', 'right'],
			});

			const table = container.firstElementChild as HTMLElement;
			const ths = table.querySelectorAll('th');
			expect(ths[0].style.textAlign).toBe('');
			expect(ths[1].style.textAlign).toBe('center');
			expect(ths[2].style.textAlign).toBe('right');

			const tds = table.querySelectorAll('td');
			expect(tds[0].style.textAlign).toBe('');
			expect(tds[1].style.textAlign).toBe('center');
			expect(tds[2].style.textAlign).toBe('right');
		});

		it('applies striped backgrounds to odd rows', () => {
			ui.table(['A'], [['r0'], ['r1'], ['r2'], ['r3']], { striped: true });

			const rows = container.querySelectorAll('tbody tr');
			expect(rows[0].getAttribute('style')).toBeNull();
			expect((rows[1] as HTMLElement).style.backgroundColor).toBeTruthy();
			expect(rows[2].getAttribute('style')).toBeNull();
			expect((rows[3] as HTMLElement).style.backgroundColor).toBeTruthy();
		});

		it('renders footer row in tfoot', () => {
			ui.table(['Name', 'Score'], [['a', '10']], {
				footer: ['Total', '10'],
			});

			const tfoot = container.querySelector('tfoot');
			expect(tfoot).not.toBeNull();
			const tds = tfoot!.querySelectorAll('td');
			expect(tds.length).toBe(2);
			expect(tds[0].textContent).toBe('Total');
			expect(tds[1].textContent).toBe('10');
			expect(tds[0].style.fontWeight).toBe('600');
			expect(tds[0].style.borderTop).toContain('2px');
		});

		it('applies alignment to footer cells', () => {
			ui.table(['A', 'B'], [['a', 'b']], {
				align: ['left', 'right'],
				footer: ['X', 'Y'],
			});

			const footerTds = container.querySelectorAll('tfoot td');
			expect((footerTds[0] as HTMLElement).style.textAlign).toBe('');
			expect((footerTds[1] as HTMLElement).style.textAlign).toBe('right');
		});

		it('rowStyle overrides striped', () => {
			const rowStyle = (row: unknown[], idx: number) =>
				idx === 1 ? 'rgba(255,0,0,0.1)' : null;

			ui.table(['A'], [['r0'], ['r1'], ['r2']], {
				striped: true,
				rowStyle,
			});

			const rows = container.querySelectorAll('tbody tr');
			expect(rows[0].getAttribute('style')).toBeNull();
			expect((rows[1] as HTMLElement).style.backgroundColor).toContain('255, 0, 0');
			expect(rows[2].getAttribute('style')).toBeNull();
		});

		it('rowStyle receives row data and index', () => {
			const calls: Array<{ row: unknown[]; idx: number }> = [];
			const rowStyle = (row: unknown[], idx: number) => {
				calls.push({ row, idx });
				return null;
			};

			ui.table(['A', 'B'], [['a1', 'a2'], ['b1', 'b2']], { rowStyle });

			expect(calls.length).toBe(2);
			expect(calls[0]).toEqual({ row: ['a1', 'a2'], idx: 0 });
			expect(calls[1]).toEqual({ row: ['b1', 'b2'], idx: 1 });
		});

		it('accepts DataArray as rows input', () => {
			const da = new DataArray([['x', '1'], ['y', '2']]);
			ui.table(['Key', 'Val'], da);

			const tds = container.querySelectorAll('td');
			expect(tds.length).toBe(4);
			expect(tds[0].textContent).toBe('x');
		});

		it('uses renderValue callback for cell content', () => {
			const mockRenderValue = (el: HTMLElement, value: unknown) => {
				if (typeof value === 'object' && value !== null && 'special' in value) {
					const b = document.createElement('b');
					b.textContent = (value as { special: string }).special;
					el.appendChild(b);
				} else {
					el.textContent = String(value);
				}
			};

			const uiWithRender = new KBUI(container, mockRenderValue);
			uiWithRender.table(['Col'], [[{ special: 'bold text' }]]);

			const td = container.querySelector('td');
			const bold = td!.querySelector('b');
			expect(bold).not.toBeNull();
			expect(bold!.textContent).toBe('bold text');
		});

		it('uses renderValue for footer cells too', () => {
			const mockRenderValue = (el: HTMLElement, value: unknown) => {
				el.textContent = value == null ? '—' : `[${String(value)}]`;
			};

			const uiWithRender = new KBUI(container, mockRenderValue);
			uiWithRender.table(['A'], [['row']], { footer: ['sum'] });

			const footerTd = container.querySelector('tfoot td');
			expect(footerTd!.textContent).toBe('[sum]');
		});

		it('renders null/undefined cells with fallback', () => {
			ui.table(['A', 'B'], [[null, undefined]]);

			const tds = container.querySelectorAll('td');
			expect(tds[0].textContent).toBe('—');
			expect(tds[1].textContent).toBe('—');
		});

		it('does not render tfoot when footer is not provided', () => {
			ui.table(['A'], [['row']]);

			expect(container.querySelector('tfoot')).toBeNull();
		});

		it('returns the table element', () => {
			const result = ui.table(['A'], [['row']]);
			expect(result).toBe(container.firstElementChild);
			expect(result.tagName).toBe('TABLE');
		});
	});

	describe('chart', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let chartCalls: Array<{ canvas: HTMLElement; config: any }>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let originalChart: any;

		beforeEach(() => {
			chartCalls = [];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			originalChart = (window as any).Chart;
			// Mock Chart.js constructor
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(window as any).Chart = class MockChart {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				constructor(canvas: HTMLElement, config: any) {
					chartCalls.push({ canvas, config });
				}
			};
		});

		afterEach(() => {
			if (originalChart === undefined) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				delete (window as any).Chart;
			} else {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(window as any).Chart = originalChart;
			}
		});

		const radarOpts = {
			labels: ['A', 'B', 'C'],
			datasets: [{ label: 'D1', data: [1, 2, 3], color: 'rgba(66,153,225,1)' }],
		};

		it('creates wrapper > inner > canvas DOM structure', async () => {
			await ui.chart('radar', radarOpts);

			const wrapper = container.firstElementChild as HTMLElement;
			expect(wrapper).not.toBeNull();
			expect(wrapper.style.display).toBe('flex');
			expect(wrapper.style.justifyContent).toBe('center');

			const inner = wrapper.firstElementChild as HTMLElement;
			expect(inner).not.toBeNull();
			expect(inner.style.maxWidth).toBe('600px');

			const canvas = inner.firstElementChild as HTMLElement;
			expect(canvas).not.toBeNull();
			expect(canvas.tagName).toBe('CANVAS');
		});

		it('passes chart type and labels to Chart constructor', async () => {
			await ui.chart('radar', radarOpts);

			expect(chartCalls).toHaveLength(1);
			expect(chartCalls[0].config.type).toBe('radar');
			expect(chartCalls[0].config.data.labels).toEqual(['A', 'B', 'C']);
		});

		it('expands dataset color into Chart.js properties', async () => {
			await ui.chart('radar', radarOpts);

			const ds = chartCalls[0].config.data.datasets[0];
			expect(ds.borderColor).toBe('rgba(66,153,225,1)');
			expect(ds.backgroundColor).toBe('rgba(66,153,225, 0.15)');
			expect(ds.pointBackgroundColor).toBe('rgba(66,153,225,1)');
			expect(ds.borderWidth).toBe(2);
		});

		it('uses square aspect ratio for radar chart', async () => {
			await ui.chart('radar', radarOpts);

			const inner = (container.firstElementChild as HTMLElement)
				.firstElementChild as HTMLElement;
			const style = inner.getAttribute('style') ?? '';
			expect(style).toContain('aspect-ratio: 1');
			expect(style).toContain('max-width: 600px');
		});

		it('does not use square aspect ratio for bar chart', async () => {
			await ui.chart('bar', radarOpts);

			const inner = (container.firstElementChild as HTMLElement)
				.firstElementChild as HTMLElement;
			const style = inner.getAttribute('style') ?? '';
			expect(style).not.toContain('aspect-ratio');
			expect(style).toContain('max-width: 800px');
		});

		it('respects custom maxWidth option', async () => {
			await ui.chart('radar', { ...radarOpts, maxWidth: 400 });

			const inner = (container.firstElementChild as HTMLElement)
				.firstElementChild as HTMLElement;
			expect(inner.style.maxWidth).toBe('400px');
		});

		it('passes scale config for radar charts with max and stepSize', async () => {
			await ui.chart('radar', { ...radarOpts, max: 5, stepSize: 1 });

			const scales = chartCalls[0].config.options.scales;
			expect(scales.r).toBeDefined();
			expect(scales.r.max).toBe(5);
			expect(scales.r.ticks.stepSize).toBe(1);
			expect(scales.r.beginAtZero).toBe(true);
		});

		it('passes scale config for bar charts with x/y axes', async () => {
			await ui.chart('bar', { ...radarOpts, max: 10 });

			const scales = chartCalls[0].config.options.scales;
			expect(scales.x).toBeDefined();
			expect(scales.y).toBeDefined();
			expect(scales.y.max).toBe(10);
			expect(scales.y.beginAtZero).toBe(true);
		});

		it('defaults fill to true for radar', async () => {
			await ui.chart('radar', radarOpts);

			const ds = chartCalls[0].config.data.datasets[0];
			expect(ds.fill).toBe(true);
		});

		it('defaults fill to false for line', async () => {
			await ui.chart('line', radarOpts);

			const ds = chartCalls[0].config.data.datasets[0];
			expect(ds.fill).toBe(false);
		});

		it('hides legend when showLegend is false', async () => {
			await ui.chart('radar', { ...radarOpts, showLegend: false });

			const legend = chartCalls[0].config.options.plugins.legend;
			expect(legend.display).toBe(false);
		});

		it('renders error message when Chart.js fails to load', async () => {
			// Remove window.Chart so loadChartJS attempts CDN load
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			delete (window as any).Chart;

			// Intercept appendChild to fire onerror on script elements
			const origAppendChild = document.head.appendChild.bind(document.head);
			vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
				if (node instanceof HTMLScriptElement && node.src.includes('chart.js')) {
					setTimeout(() => node.onerror?.(new Event('error')), 0);
					return node;
				}
				return origAppendChild(node);
			});

			await ui.chart('radar', radarOpts);

			const inner = (container.firstElementChild as HTMLElement)
				.firstElementChild as HTMLElement;
			const errorEl = inner.firstElementChild as HTMLElement;
			expect(errorEl.textContent).toContain('Chart error:');
			expect(errorEl.textContent).toContain('Failed to load Chart.js from CDN');

			vi.restoreAllMocks();
		});

		it('returns the wrapper element appended to container', async () => {
			const result = await ui.chart('radar', radarOpts);

			expect(result).toBe(container.firstElementChild);
			expect(result.tagName).toBe('DIV');
		});

		it('uses per-segment colors for pie charts with color array', async () => {
			await ui.chart('pie', {
				labels: ['A', 'B', 'C'],
				datasets: [{
					label: 'Segments',
					data: [10, 20, 30],
					color: ['red', 'green', 'blue'],
				}],
			});

			const ds = chartCalls[0].config.data.datasets[0];
			expect(ds.backgroundColor).toEqual(['red', 'green', 'blue']);
			expect(ds.borderColor).toEqual(['red', 'green', 'blue']);
			expect(ds.borderWidth).toBe(1);
		});

		it('expands single color for pie chart segments', async () => {
			await ui.chart('doughnut', {
				labels: ['A', 'B'],
				datasets: [{
					label: 'Segments',
					data: [10, 20],
					color: 'rgba(72,187,120,1)',
				}],
			});

			const ds = chartCalls[0].config.data.datasets[0];
			expect(ds.backgroundColor).toEqual([
				'rgba(72,187,120,1)',
				'rgba(72,187,120,1)',
			]);
		});

		it('does not set scales for pie/doughnut charts', async () => {
			await ui.chart('pie', {
				labels: ['A', 'B'],
				datasets: [{ label: 'D', data: [1, 2], color: 'red' }],
			});

			expect(chartCalls[0].config.options.scales).toBeUndefined();
		});

		it('passes canvas element to Chart constructor', async () => {
			await ui.chart('bar', radarOpts);

			expect(chartCalls[0].canvas.tagName).toBe('CANVAS');
		});
	});

	describe('heatmapCalendar', () => {
		it('renders the graph container with year, months, days, and boxes', () => {
			ui.heatmapCalendar([]);

			const graph = container.querySelector('.heatmap-calendar-graph') as HTMLElement;
			expect(graph).not.toBeNull();
			// 4 children: year, months, days, boxes
			expect(graph.children.length).toBe(4);
		});

		it('displays the 2-digit year label', () => {
			ui.heatmapCalendar([], { year: 2025 });

			const graph = container.querySelector('.heatmap-calendar-graph')!;
			const yearEl = graph.children[0] as HTMLElement;
			expect(yearEl.textContent).toBe('25');
		});

		it('renders 12 month labels', () => {
			ui.heatmapCalendar([]);

			const months = container.querySelector('.heatmap-calendar-graph')!.children[1];
			expect(months.children.length).toBe(12);
			expect(months.children[0].textContent).toBe('Jan');
			expect(months.children[11].textContent).toBe('Dec');
		});

		it('renders 7 day-of-week labels', () => {
			ui.heatmapCalendar([]);

			const days = container.querySelector('.heatmap-calendar-graph')!.children[2];
			expect(days.children.length).toBe(7);
		});

		it('renders 365 day boxes plus leading empty cells for a non-leap year', () => {
			// 2025 is not a leap year; Jan 1 is Wednesday, weekStartDay=1 (Mon)
			// So 2 empty cells before the year starts
			ui.heatmapCalendar([], { year: 2025, weekStartDay: 1 });

			const boxes = container.querySelector('.heatmap-calendar-graph')!.children[3];
			// 365 days + leading empties (Wed with Mon start = 2 empties)
			expect(boxes.children.length).toBe(365 + 2);
		});

		it('renders 366 day boxes for a leap year', () => {
			// 2024 is a leap year; Jan 1 is Monday, weekStartDay=1 (Mon)
			// So 0 empty cells before the year starts
			ui.heatmapCalendar([], { year: 2024, weekStartDay: 1 });

			const boxes = container.querySelector('.heatmap-calendar-graph')!.children[3];
			expect(boxes.children.length).toBe(366);
		});

		it('filters entries to the displayed year only', () => {
			ui.heatmapCalendar(
				[
					{ date: '2025-03-15', intensity: 3 },
					{ date: '2024-06-01', intensity: 5 },
				],
				{ year: 2025 },
			);

			const boxes = container.querySelector('.heatmap-calendar-graph')!.children[3];
			const withData = Array.from(boxes.children).filter(
				(li) => (li as HTMLElement).dataset.date,
			);
			expect(withData.length).toBe(1);
			expect((withData[0] as HTMLElement).dataset.date).toBe('2025-03-15');
		});

		it('applies background color from default palette based on intensity', () => {
			ui.heatmapCalendar(
				[{ date: '2025-01-05', intensity: 3 }],
				{ year: 2025, intensityScaleStart: 1, intensityScaleEnd: 5 },
			);

			const boxes = container.querySelector('.heatmap-calendar-graph')!.children[3];
			const entry = Array.from(boxes.children).find(
				(li) => (li as HTMLElement).dataset.date === '2025-01-05',
			) as HTMLElement;
			expect(entry).not.toBeUndefined();
			expect(entry.style.backgroundColor).toBeTruthy();
			// Intensity 3 maps to index 2 (middle of 5-color scale): #49af5d → rgb(73, 175, 93)
			expect(entry.style.backgroundColor).toBe('rgb(73, 175, 93)');
		});

		it('supports custom color palettes', () => {
			ui.heatmapCalendar(
				[{ date: '2025-02-01', intensity: 3, color: 'red' }],
				{
					year: 2025,
					colors: { red: ['#ffcccc', '#ff6666', '#ff0000'] },
					intensityScaleStart: 1,
					intensityScaleEnd: 3,
				},
			);

			const boxes = container.querySelector('.heatmap-calendar-graph')!.children[3];
			const entry = Array.from(boxes.children).find(
				(li) => (li as HTMLElement).dataset.date === '2025-02-01',
			) as HTMLElement;
			// Intensity 3 with scale 1-3 and 3 colors maps to index 2: #ff0000 → rgb(255, 0, 0)
			expect(entry.style.backgroundColor).toBe('rgb(255, 0, 0)');
		});

		it('renders entry content inside the cell', () => {
			ui.heatmapCalendar(
				[{ date: '2025-06-15', intensity: 2, content: '🏋️' }],
				{ year: 2025 },
			);

			const boxes = container.querySelector('.heatmap-calendar-graph')!.children[3];
			const entry = Array.from(boxes.children).find(
				(li) => (li as HTMLElement).dataset.date === '2025-06-15',
			) as HTMLElement;
			const span = entry.querySelector('span');
			expect(span).not.toBeNull();
			expect(span!.textContent).toBe('🏋️');
		});

		it('marks today with a border when showCurrentDayBorder is true', () => {
			const today = new Date();
			const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

			ui.heatmapCalendar(
				[{ date: todayStr, intensity: 1 }],
				{ year: today.getFullYear(), showCurrentDayBorder: true },
			);

			const boxes = container.querySelector('.heatmap-calendar-graph')!.children[3];
			const todayBox = Array.from(boxes.children).find(
				(li) => (li as HTMLElement).dataset.date === todayStr,
			) as HTMLElement;
			expect(todayBox.style.border).toContain('solid');
		});

		it('does not mark today when showCurrentDayBorder is false', () => {
			const today = new Date();
			const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

			ui.heatmapCalendar(
				[{ date: todayStr, intensity: 1 }],
				{ year: today.getFullYear(), showCurrentDayBorder: false },
			);

			const boxes = container.querySelector('.heatmap-calendar-graph')!.children[3];
			const todayBox = Array.from(boxes.children).find(
				(li) => (li as HTMLElement).dataset.date === todayStr,
			) as HTMLElement;
			expect(todayBox.style.border).toBe('');
		});

		it('uses defaultEntryIntensity when entry has no intensity', () => {
			ui.heatmapCalendar(
				[{ date: '2025-04-01' }],
				{
					year: 2025,
					colors: { default: ['#aaa', '#bbb', '#ccc', '#ddd', '#eee'] },
					defaultEntryIntensity: 4,
					intensityScaleStart: 1,
					intensityScaleEnd: 5,
				},
			);

			const boxes = container.querySelector('.heatmap-calendar-graph')!.children[3];
			const entry = Array.from(boxes.children).find(
				(li) => (li as HTMLElement).dataset.date === '2025-04-01',
			) as HTMLElement;
			// Intensity 4 with scale 1-5 and 5 colors maps to index 3: #ddd → rgb(221, 221, 221)
			expect(entry.style.backgroundColor).toBe('rgb(221, 221, 221)');
		});

		it('returns the graph element', () => {
			const result = ui.heatmapCalendar([]);
			expect(result).toBe(container.firstElementChild);
			expect(result.className).toBe('heatmap-calendar-graph');
		});
	});

	describe('yearlyCalendar', () => {
		it('renders outer container with year label and boxes grid', () => {
			ui.yearlyCalendar([]);

			const outer = container.querySelector('.yearly-calendar') as HTMLElement;
			expect(outer).not.toBeNull();
			expect(outer.children.length).toBe(2); // year + boxes
		});

		it('displays the full year label', () => {
			ui.yearlyCalendar([], { year: 2025 });

			const yearEl = container.querySelector('.yearly-calendar-year') as HTMLElement;
			expect(yearEl.textContent).toBe('2025');
		});

		it('renders 12 month labels inside boxes grid', () => {
			ui.yearlyCalendar([], { year: 2025 });

			const boxes = container.querySelector('.yearly-calendar-boxes')!;
			const monthLabels = Array.from(boxes.children).filter(
				(el) => el.tagName === 'DIV',
			);
			expect(monthLabels.length).toBe(12);
			expect(monthLabels[0].textContent).toBe('J');
			expect(monthLabels[1].textContent).toBe('F');
			expect(monthLabels[11].textContent).toBe('D');
		});

		it('renders correct total number of day boxes (365 for non-leap year)', () => {
			ui.yearlyCalendar([], { year: 2025 });

			const boxes = container.querySelector('.yearly-calendar-boxes')!;
			const dayBoxes = Array.from(boxes.children).filter(
				(el) => el.tagName === 'SPAN',
			);
			expect(dayBoxes.length).toBe(365);
		});

		it('renders 366 day boxes for a leap year', () => {
			ui.yearlyCalendar([], { year: 2024 });

			const boxes = container.querySelector('.yearly-calendar-boxes')!;
			const dayBoxes = Array.from(boxes.children).filter(
				(el) => el.tagName === 'SPAN',
			);
			expect(dayBoxes.length).toBe(366);
		});

		it('places boxes in correct grid column per month', () => {
			ui.yearlyCalendar(
				[{ date: '2025-03-15', intensity: 3 }],
				{ year: 2025 },
			);

			const boxes = container.querySelector('.yearly-calendar-boxes')!;
			const marchEntry = Array.from(boxes.children).find(
				(el) => (el as HTMLElement).dataset.date === '2025-03-15',
			) as HTMLElement;
			expect(marchEntry).not.toBeUndefined();
			// March = column 3
			expect(marchEntry.style.gridColumn).toBe('3');
		});

		it('filters entries to the displayed year only', () => {
			ui.yearlyCalendar(
				[
					{ date: '2025-06-10', intensity: 3 },
					{ date: '2024-06-10', intensity: 5 },
				],
				{ year: 2025 },
			);

			const boxes = container.querySelector('.yearly-calendar-boxes')!;
			const withData = Array.from(boxes.children).filter(
				(el) => (el as HTMLElement).dataset.date,
			);
			expect(withData.length).toBe(1);
			expect((withData[0] as HTMLElement).dataset.date).toBe('2025-06-10');
		});

		it('applies background color from palette based on intensity', () => {
			ui.yearlyCalendar(
				[{ date: '2025-01-05', intensity: 3 }],
				{ year: 2025, intensityScaleStart: 1, intensityScaleEnd: 5 },
			);

			const boxes = container.querySelector('.yearly-calendar-boxes')!;
			const entry = Array.from(boxes.children).find(
				(el) => (el as HTMLElement).dataset.date === '2025-01-05',
			) as HTMLElement;
			// Intensity 3 maps to index 2: #49af5d → rgb(73, 175, 93)
			expect(entry.style.backgroundColor).toBe('rgb(73, 175, 93)');
		});

		it('uses rounded border-radius on boxes', () => {
			ui.yearlyCalendar(
				[{ date: '2025-04-01', intensity: 2 }],
				{ year: 2025 },
			);

			const boxes = container.querySelector('.yearly-calendar-boxes')!;
			const entry = Array.from(boxes.children).find(
				(el) => (el as HTMLElement).dataset.date === '2025-04-01',
			) as HTMLElement;
			expect(entry.style.borderRadius).toBe('25%');
		});

		it('renders entry content inside the box', () => {
			ui.yearlyCalendar(
				[{ date: '2025-07-04', intensity: 5, content: '🎆' }],
				{ year: 2025 },
			);

			const boxes = container.querySelector('.yearly-calendar-boxes')!;
			const entry = Array.from(boxes.children).find(
				(el) => (el as HTMLElement).dataset.date === '2025-07-04',
			) as HTMLElement;
			expect(entry.textContent).toBe('🎆');
		});

		it('marks today with a border when showCurrentDayBorder is true', () => {
			const today = new Date();
			const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

			ui.yearlyCalendar(
				[{ date: todayStr, intensity: 1 }],
				{ year: today.getFullYear(), showCurrentDayBorder: true },
			);

			const boxes = container.querySelector('.yearly-calendar-boxes')!;
			const todayBox = Array.from(boxes.children).find(
				(el) => (el as HTMLElement).dataset.date === todayStr,
			) as HTMLElement;
			expect(todayBox.style.border).toContain('solid');
		});

		it('does not mark today when showCurrentDayBorder is false', () => {
			const today = new Date();
			const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

			ui.yearlyCalendar(
				[{ date: todayStr, intensity: 1 }],
				{ year: today.getFullYear(), showCurrentDayBorder: false },
			);

			const boxes = container.querySelector('.yearly-calendar-boxes')!;
			const todayBox = Array.from(boxes.children).find(
				(el) => (el as HTMLElement).dataset.date === todayStr,
			) as HTMLElement;
			expect(todayBox.style.border).toBe('');
		});

		it('returns the centered wrapper element', () => {
			const result = ui.yearlyCalendar([]);
			expect(result).toBe(container.firstElementChild);
			expect(result.style.justifyContent).toBe('center');
			expect(result.querySelector('.yearly-calendar')).not.toBeNull();
		});
	});
});
