// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DisplayHTML } from '#lib/features/collection/expression/expression.types.js';
import type { QueryResult } from '#lib/features/collection/collection.types.js';

// openFileInEditor is a side-effect service used by the row-click handler (not
// exercised by these render-only assertions) — legitimately mocked. No store or
// .logic mocks per CLAUDE.md: buildCollectionTable is tested directly with real
// QueryResult fixtures and the real formatCellValue / isDisplayValue / sanitizeHtml.
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

import {
	buildCollectionTable,
	CollectionBlockWidget,
	clearCollectionCache,
	COLLECTION_ROW_CAP,
	LINEAR_CALENDAR_LANE_CAP,
} from '#lib/features/collection/collection-block-widget.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { barTextColor, COLOR_PALETTE } from '#lib/features/collection/linear-calendar.logic.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';

import { BLOCK_TEXT_FLOOR, resolveFontSize, resolvedFontPx } from '../../../fixtures/font-size.fixture.js';

/** Builds a minimal PropertyIndexRecord carrying the given properties. */
function record(properties: Map<string, unknown>) {
	return {
		path: '/vault/note.md',
		name: 'note.md',
		basename: 'note',
		folder: '/vault',
		ext: '.md',
		mtime: 0,
		ctime: 0,
		size: 100,
		properties,
	};
}

describe('buildCollectionTable', () => {
	it('renders DisplayHTML values as innerHTML instead of textContent', () => {
		const badgeHtml: DisplayHTML = {
			__display: 'html',
			html: '<span style="color:green">Active</span>',
		};
		const result: QueryResult = {
			records: [record(new Map([['status', badgeHtml]]))],
			columns: [
				{ key: 'file.name', displayName: 'Name' },
				{ key: 'status', displayName: 'Status' },
			],
		};

		const cells = buildCollectionTable(result).querySelectorAll('td');
		expect(cells).toHaveLength(2);

		const span = cells[1].querySelector('span');
		expect(span).not.toBeNull();
		expect(span?.textContent).toBe('Active');
		expect(span?.style.color).toBe('green');
	});

	it('renders plain values as textContent (not innerHTML)', () => {
		const result: QueryResult = {
			records: [record(new Map([['status', 'active']]))],
			columns: [
				{ key: 'file.name', displayName: 'Name' },
				{ key: 'status', displayName: 'Status' },
			],
		};

		const cells = buildCollectionTable(result).querySelectorAll('td');
		expect(cells).toHaveLength(2);
		expect(cells[1].textContent).toBe('active');
		expect(cells[1].querySelector('span')).toBeNull();
	});

	it('sanitizes DisplayHTML before rendering', () => {
		const maliciousHtml: DisplayHTML = {
			__display: 'html',
			html: '<span style="color:red">test</span><script>alert("xss")</script>',
		};
		const result: QueryResult = {
			records: [record(new Map([['status', maliciousHtml]]))],
			columns: [{ key: 'status', displayName: 'Status' }],
		};

		const td = buildCollectionTable(result).querySelector('td')!;
		// Script tag stripped by sanitizeHtml, safe span kept.
		expect(td.querySelector('script')).toBeNull();
		expect(td.querySelector('span')).not.toBeNull();
	});

	it('renders null/undefined values with dash and null class', () => {
		const result: QueryResult = {
			records: [record(new Map())],
			columns: [{ key: 'status', displayName: 'Status' }],
		};

		const td = buildCollectionTable(result).querySelector('td')!;
		expect(td.textContent).toBe('—');
		expect(td.className).toBe('cm-lp-collection-null');
	});

	it('renders one header cell per column in order', () => {
		const result: QueryResult = {
			records: [],
			columns: [
				{ key: 'file.name', displayName: 'Name' },
				{ key: 'status', displayName: 'Status' },
			],
		};

		const headers = buildCollectionTable(result).querySelectorAll('th');
		expect([...headers].map((h) => h.textContent)).toEqual(['Name', 'Status']);
	});

	it('renders at most COLLECTION_ROW_CAP body rows for a large result', () => {
		const result: QueryResult = {
			records: Array.from({ length: 10_000 }, () => record(new Map([['status', 'x']]))),
			columns: [{ key: 'status', displayName: 'Status' }],
		};

		const table = buildCollectionTable(result);
		expect(table.querySelectorAll('tbody tr').length).toBe(COLLECTION_ROW_CAP);
	});
});

describe('CollectionBlockWidget — query data cache', () => {
	const YAML = 'views:\n  - type: table\n    name: "All"\n    order:\n      - file.name\n';

	/** Builds a minimal PropertyIndexRecord living at the given path. */
	function recordAt(path: string, name: string) {
		return {
			path,
			name,
			basename: name.replace(/\.md$/, ''),
			folder: '/vault',
			ext: '.md',
			mtime: 0,
			ctime: 0,
			size: 1,
			properties: new Map<string, unknown>(),
		};
	}

	beforeEach(() => {
		// Real collectionStore + real yaml-parser/executeQuery (CLAUDE.md: never
		// mock stores or .logic). Only openFileInEditor stays mocked (top of file).
		clearCollectionCache();
		collectionStore.reset();
		collectionStore.setPropertyIndex(
			new Map([
				['/vault/a.md', recordAt('/vault/a.md', 'a.md')],
				['/vault/b.md', recordAt('/vault/b.md', 'b.md')],
			]),
		);
		vi.clearAllMocks();
	});

	afterEach(() => {
		collectionStore.reset();
		clearCollectionCache();
	});

	it('renders the header and one row per index record', () => {
		const dom = new CollectionBlockWidget(YAML).toDOM();

		expect(dom.querySelector('.cm-lp-collection-header')?.textContent).toBe('All (2)');
		expect(dom.querySelectorAll('tbody tr').length).toBe(2);
	});

	it('resolves a relative file.inFolder filter against the open vault', () => {
		collectionStore.setPropertyIndex(
			new Map([
				['/vault/work/w.md', { ...recordAt('/vault/work/w.md', 'w.md'), folder: '/vault/work' }],
				['/vault/workshop/s.md', { ...recordAt('/vault/workshop/s.md', 's.md'), folder: '/vault/workshop' }],
			]),
		);
		const yaml = `filters: 'file.inFolder("work")'\n${YAML}`;
		vaultStore.open('/vault');
		try {
			const dom = new CollectionBlockWidget(yaml).toDOM();
			const names = [...dom.querySelectorAll('tbody tr td:first-child')].map((td) => td.textContent);
			expect(names).toEqual(['w.md']);
		} finally {
			vaultStore._reset();
		}
	});

	it('never hands the same DOM node to two widgets with the same block', () => {
		// Regression: CodeMirror builds new lines detached, so two widgets for a
		// duplicated collection block can both call toDOM() while nothing is
		// connected. Sharing the cached node moves it to the last widget and
		// blanks the first occurrence.
		const first = new CollectionBlockWidget(YAML).toDOM();
		expect(first.isConnected).toBe(false);

		const second = new CollectionBlockWidget(YAML).toDOM();

		expect(second).not.toBe(first);
		expect(first.querySelector('table')).not.toBeNull();
		expect(second.querySelector('table')).not.toBeNull();
	});

	it('keeps row clicks working on a cache-hit render', () => {
		new CollectionBlockWidget(YAML).toDOM();
		const second = new CollectionBlockWidget(YAML).toDOM();

		const row = second.querySelector('tbody tr') as HTMLElement;
		row.click();

		expect(openFileInEditor).toHaveBeenCalledWith('/vault/a.md');
	});

	it('re-queries when the index changed without changing size', () => {
		const first = new CollectionBlockWidget(YAML).toDOM();
		expect(first.querySelectorAll('tbody tr').length).toBe(2);

		// Both maps hold exactly TWO records on purpose: the old cache key
		// (yaml|indexSize) is byte-identical across the swap, so only the store
		// version can invalidate it. A different size would flip the old key too
		// and let this probe pass against the stale-cache bug.
		collectionStore.setPropertyIndex(
			new Map([
				['/vault/x.md', recordAt('/vault/x.md', 'x.md')],
				['/vault/y.md', recordAt('/vault/y.md', 'y.md')],
			]),
		);

		const second = new CollectionBlockWidget(YAML).toDOM();
		const names = [...second.querySelectorAll('tbody tr td:first-child')].map(
			(td) => td.textContent,
		);
		expect(names).toEqual(['x.md', 'y.md']);
	});

	it('serves the cached query result while the store version is unchanged', () => {
		const first = new CollectionBlockWidget(YAML).toDOM();
		expect(first.querySelectorAll('tbody tr').length).toBe(2);

		// Mutating the live Map bypasses every store method, so no version bump
		// happens and the cache must still hit. Guards against "fix" attempts
		// that simply delete the cache.
		collectionStore.propertyIndex.set('/vault/z.md', recordAt('/vault/z.md', 'z.md'));

		const second = new CollectionBlockWidget(YAML).toDOM();
		const names = [...second.querySelectorAll('tbody tr td:first-child')].map(
			(td) => td.textContent,
		);
		expect(names).toEqual(['a.md', 'b.md']);
	});

	/** Replaces the index with `count` records named n0.md, n1.md, ... */
	function setIndexOfSize(count: number) {
		const index = new Map<string, ReturnType<typeof recordAt>>();
		for (let i = 0; i < count; i++) {
			const path = `/vault/n${i}.md`;
			index.set(path, recordAt(path, `n${i}.md`));
		}
		collectionStore.setPropertyIndex(index);
	}

	it('caps body rows and adds a footer when the result exceeds the cap', () => {
		setIndexOfSize(10_000);

		const dom = new CollectionBlockWidget(YAML).toDOM();

		expect(COLLECTION_ROW_CAP).toBe(50);
		expect(dom.querySelector('.cm-lp-collection-header')?.textContent).toBe('All (10000)');
		expect(dom.querySelectorAll('tbody tr').length).toBe(COLLECTION_ROW_CAP);
		expect(dom.querySelector('.cm-lp-collection-footer')?.textContent).toBe('Showing 50 of 10000');
	});

	it('renders every row and no footer when the result is exactly the cap', () => {
		setIndexOfSize(COLLECTION_ROW_CAP);

		const dom = new CollectionBlockWidget(YAML).toDOM();

		expect(dom.querySelector('.cm-lp-collection-header')?.textContent).toBe(`All (${COLLECTION_ROW_CAP})`);
		expect(dom.querySelectorAll('tbody tr').length).toBe(COLLECTION_ROW_CAP);
		expect(dom.querySelector('.cm-lp-collection-footer')).toBeNull();
	});

	it('renders no footer under the cap', () => {
		const dom = new CollectionBlockWidget(YAML).toDOM();

		expect(dom.querySelectorAll('tbody tr').length).toBe(2);
		expect(dom.querySelector('.cm-lp-collection-footer')).toBeNull();
	});

	it('keeps the full result cached for the dedicated view', () => {
		setIndexOfSize(10_000);
		new CollectionBlockWidget(YAML).toDOM();

		// Cache hit: the header count comes from the cached QueryResult, so a
		// capped cache would report 50 here.
		const second = new CollectionBlockWidget(YAML).toDOM();
		expect(second.querySelector('.cm-lp-collection-header')?.textContent).toBe('All (10000)');
		expect(second.querySelector('.cm-lp-collection-footer')?.textContent).toBe('Showing 50 of 10000');
	});

	it('shows the filter error in place of rows when a filter does not parse', () => {
		const bad = "filters: \"status = 'active'\"\n" + YAML;

		const dom = new CollectionBlockWidget(bad).toDOM();

		expect(dom.querySelector('.cm-lp-collection-error')?.textContent).toContain("status = 'active'");
		expect(dom.querySelector('table')).toBeNull();
		expect(dom.querySelector('.cm-lp-collection-empty')).toBeNull();
		// Cache hit renders the same error.
		const second = new CollectionBlockWidget(bad).toDOM();
		expect(second.querySelector('.cm-lp-collection-error')?.textContent).toContain("status = 'active'");
	});

	it('shows the filter error in place of a calendar', () => {
		const bad = 'filters: "foo(1) == 2"\nviews:\n  - type: calendar\n    name: "Cal"\n    dateProperty: due\n';

		const dom = new CollectionBlockWidget(bad).toDOM();

		expect(dom.querySelector('.cm-lp-collection-error')?.textContent).toContain('foo');
		expect(dom.querySelector('table')).toBeNull();
	});

	it('eq() is false for a widget built after an in-place index change', () => {
		const before = new CollectionBlockWidget(YAML);
		// Overwriting an EXISTING key leaves propertyIndex.size at 2, so the
		// superseded indexSize-based eq() would report the two widgets equal.
		// Only the store version bump discriminates.
		collectionStore.updateRecord('/vault/a.md', recordAt('/vault/a.md', 'a-renamed.md'));
		const after = new CollectionBlockWidget(YAML);

		expect(collectionStore.propertyIndex.size).toBe(2);
		expect(before.eq(after)).toBe(false);
		expect(after.eq(new CollectionBlockWidget(YAML))).toBe(true);
	});
});

describe('CollectionBlockWidget — linear-calendar lane cap', () => {
	const YAML = 'views:\n  - type: linear-calendar\n    name: "Year"\n    dateProperty: date\n';
	const MARCH_ROW = 2;
	/** The widget reads the year from the clock; the tests pin it so a run across New Year cannot split them. */
	const YEAR = 2026;

	/** Replaces the index with `count` records all dated March 10 of `YEAR`. */
	function setSameDayIndex(count: number) {
		const date = `${YEAR}-03-10`;
		const index = new Map<string, ReturnType<typeof record>>();
		for (let i = 0; i < count; i++) {
			const path = `/vault/e${i}.md`;
			index.set(path, { ...record(new Map([['date', date]])), path, name: `e${i}.md`, basename: `e${i}` });
		}
		collectionStore.setPropertyIndex(index);
	}

	/** Returns the March row's event bars and its "+N" marker. */
	function marchRow(dom: HTMLElement) {
		const row = dom.querySelectorAll('tbody tr')[MARCH_ROW];
		return {
			bars: row.querySelectorAll('div[title]'),
			more: row.querySelector('.cm-lp-collection-lane-more'),
		};
	}

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(YEAR, 5, 15));
		clearCollectionCache();
		collectionStore.reset();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
		collectionStore.reset();
		clearCollectionCache();
	});

	it('renders at most the lane cap of bars per month row plus a "+N" marker', () => {
		setSameDayIndex(20);

		const dom = new CollectionBlockWidget(YAML).toDOM();
		const { bars, more } = marchRow(dom);

		expect(LINEAR_CALENDAR_LANE_CAP).toBe(3);
		expect(dom.querySelector('.cm-lp-collection-header')?.textContent).toBe('Year (20)');
		expect(bars.length).toBe(LINEAR_CALENDAR_LANE_CAP);
		expect(more?.textContent).toBe(`+${20 - LINEAR_CALENDAR_LANE_CAP}`);
	});

	it('sizes a capped month row to the lane cap', () => {
		setSameDayIndex(20);

		const dom = new CollectionBlockWidget(YAML).toDOM();
		const dayCell = dom.querySelectorAll('tbody tr')[MARCH_ROW].querySelectorAll('td')[1] as HTMLElement;

		// lanes * (bar height 1.4 x the floored bar font + 1px gap) + 1px, in the cell's em
		// (jsdom reorders the calc terms)
		expect(dayCell.style.height).toBe(`calc(1px + ${LINEAR_CALENDAR_LANE_CAP} * (1.4 * max(11px, 0.8em) + 1px))`);
	});

	it('renders every bar and no marker when the month row is exactly at the cap', () => {
		setSameDayIndex(LINEAR_CALENDAR_LANE_CAP);

		const { bars, more } = marchRow(new CollectionBlockWidget(YAML).toDOM());

		expect(bars.length).toBe(LINEAR_CALENDAR_LANE_CAP);
		expect(more).toBeNull();
	});

	it('renders every bar and no marker under the cap', () => {
		setSameDayIndex(2);

		const dom = new CollectionBlockWidget(YAML).toDOM();
		const { bars, more } = marchRow(dom);

		expect(bars.length).toBe(2);
		expect(more).toBeNull();
		expect(dom.querySelector('.cm-lp-collection-lane-more')).toBeNull();
	});

	it('draws event bars and the today cell in the theme accent, not the error color', () => {
		setSameDayIndex(1);

		const dom = new CollectionBlockWidget(YAML).toDOM();
		const bar = marchRow(dom).bars[0] as HTMLElement;
		// June 15 (the pinned clock): row 5, cell 15 (cell 0 is the month label)
		const today = dom.querySelectorAll('tbody tr')[5].querySelectorAll('td')[15] as HTMLElement;

		expect(bar.style.cssText).toContain('var(--primary)');
		expect(bar.style.cssText).not.toContain('collection-error');
		expect(today.style.cssText).toContain('var(--primary)');
		expect(today.style.cssText).not.toContain('collection-error');
	});

	it('keeps bar clicks working on a capped row', () => {
		setSameDayIndex(20);

		const { bars } = marchRow(new CollectionBlockWidget(YAML).toDOM());
		(bars[0] as HTMLElement).click();

		expect(openFileInEditor).toHaveBeenCalledTimes(1);
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/e0.md');
	});
});

describe('CollectionBlockWidget — text scales with the editor font', () => {
	const YEAR = 2026;
	const CALENDAR = 'views:\n  - type: calendar\n    name: "Month"\n    dateProperty: date\n';
	const LINEAR = 'views:\n  - type: linear-calendar\n    name: "Year"\n    dateProperty: date\n';
	const LINEAR_COLORED = `${LINEAR}    colorProperty: kind\n`;

	/** Indexes `count` notes dated June 10 of `YEAR` (the pinned month), with a `kind` property. */
	function setIndex(count: number) {
		const index = new Map<string, ReturnType<typeof record>>();
		for (let i = 0; i < count; i++) {
			const path = `/vault/e${i}.md`;
			const props = new Map<string, unknown>([['date', `${YEAR}-06-10`], ['kind', `k${i}`]]);
			index.set(path, { ...record(props), path, name: `e${i}.md`, basename: `e${i}` });
		}
		collectionStore.setPropertyIndex(index);
	}

	/** Every element in the rendered widget with an inline `font-size`. */
	function sizedElements(dom: HTMLElement): HTMLElement[] {
		return [...dom.querySelectorAll<HTMLElement>('[style]')].filter((el) => el.style.fontSize);
	}

	/** Theme sizes of the widget's classes, pinned in styles.test.ts. */
	const CLASS_EM = { 'cm-lp-collection-block': 0.85, 'cm-lp-collection-table': 0.9 };

	/** The small text that carries the 11px floor, per view: "+N" labels, day numbers, bar titles. */
	const FLOORED: Record<string, (el: HTMLElement) => boolean> = {
		calendar: (el) => /^\+\d+$/.test(el.textContent ?? ''),
		'linear-calendar': (el) => el.matches('thead th, .cm-lp-collection-lane-more, div[title]'),
	};

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(YEAR, 5, 15));
		clearCollectionCache();
		collectionStore.reset();
	});

	afterEach(() => {
		vi.useRealTimers();
		collectionStore.reset();
		clearCollectionCache();
	});

	it.each([
		['calendar', CALENDAR],
		['linear-calendar', LINEAR],
	])('the %s widget sizes every text in em, with the floor only on its small text', (name, yaml) => {
		setIndex(4);
		const sized = sizedElements(new CollectionBlockWidget(yaml).toDOM());
		const isFloored = FLOORED[name];
		expect(sized.filter((el) => !isFloored(el)).length).toBeGreaterThan(0);
		expect(sized.filter(isFloored).length).toBeGreaterThan(0);
		for (const el of sized) expect(el.style.fontSize).toMatch(isFloored(el) ? BLOCK_TEXT_FLOOR : /^[\d.]+em$/);
	});

	it.each([
		['calendar', 8, CALENDAR],
		['calendar', 19, CALENDAR],
		['linear-calendar', 8, LINEAR],
		['linear-calendar', 19, LINEAR],
	])('the %s widget floors its small text at 11px (editor font %spx)', (name, editorPx, yaml) => {
		setIndex(4);
		const dom = new CollectionBlockWidget(yaml).toDOM();
		const floored = sizedElements(dom).filter(FLOORED[name]);
		expect(floored.length).toBeGreaterThan(0);
		for (const el of floored) {
			const px = resolvedFontPx(el, dom, editorPx, CLASS_EM);
			const parentPx = resolvedFontPx(el.parentElement!, dom, editorPx, CLASS_EM);
			const em = Number(el.style.fontSize.match(/([\d.]+)em/)![1]);
			// 8px: every em size would fall below 11px. 19px (default): the em size is already above it, so unchanged.
			expect(px).toBeCloseTo(editorPx === 8 ? 11 : em * parentPx);
			expect(px).toBeGreaterThanOrEqual(11);
		}
	});

	it('styles calendar weekday headers like the calendar view (text-xs font-medium uppercase)', () => {
		setIndex(1);
		const ths = [...new CollectionBlockWidget(CALENDAR).toDOM().querySelectorAll<HTMLElement>('thead th')];
		expect(ths).toHaveLength(7);
		for (const th of ths) {
			expect(th.style.fontSize).toBe('1em');
			expect(th.style.fontWeight).toBe('500');
			expect(th.style.textTransform).toBe('uppercase');
		}
	});

	it('styles linear-calendar day numbers like the linear view (11px under a 12px month label, font-medium)', () => {
		setIndex(1);
		const ths = [...new CollectionBlockWidget(LINEAR).toDOM().querySelectorAll<HTMLElement>('thead th')].slice(1);
		expect(ths).toHaveLength(31);
		for (const th of ths) {
			expect(th.style.fontSize).toBe('max(11px, 0.8em)');
			expect(th.style.fontWeight).toBe('500');
		}
		// At the 19px default editor font; below it the floor lifts the day numbers past the label
		const dom = new CollectionBlockWidget(LINEAR).toDOM();
		const dayNumber = dom.querySelectorAll<HTMLElement>('thead th')[1];
		const monthLabel = dom.querySelector<HTMLElement>('tbody td')!;
		expect(resolvedFontPx(dayNumber, dom, 19, CLASS_EM)).toBeLessThan(resolvedFontPx(monthLabel, dom, 19, CLASS_EM));
	});

	it('sizes event bars in em of their own font so the title is never clipped', () => {
		setIndex(1);
		const bar = new CollectionBlockWidget(LINEAR).toDOM().querySelector<HTMLElement>('div[title]')!;
		expect(bar.style.height).toBe('1.4em');
		expect(bar.style.top).toBe('calc(1px + 0 * (1.4em + 1px))');
	});

	it.each([8, 19, 32])('keeps the day cell lane pitch equal to the bar height (editor font %spx)', (editorPx) => {
		setIndex(1);
		const dom = new CollectionBlockWidget(LINEAR).toDOM();
		const bar = dom.querySelector<HTMLElement>('div[title]')!;
		const cell = bar.parentElement!;
		const pitch = cell.style.height.match(/^calc\(1px \+ 1 \* \(([\d.]+) \* (max\([^)]*\)) \+ 1px\)\)$/);
		expect(pitch).not.toBeNull();
		const [, heightFactor, barFont] = pitch!;
		expect(barFont).toBe(bar.style.fontSize);
		const cellPx = resolvedFontPx(cell, dom, editorPx, CLASS_EM);
		const barPx = resolvedFontPx(bar, dom, editorPx, CLASS_EM);
		const barHeightPx = parseFloat(bar.style.height) * barPx;
		expect(Number(heightFactor) * resolveFontSize(barFont, cellPx)).toBeCloseTo(barHeightPx);
	});

	it('gives event bar titles the readable size and the theme pair on the accent bar', () => {
		setIndex(1);
		const bar = new CollectionBlockWidget(LINEAR).toDOM().querySelector<HTMLElement>('div[title]')!;
		expect(bar.style.fontSize).toBe('max(11px, 0.8em)');
		expect(bar.style.color).toBe('var(--primary-foreground)');
	});

	it('picks a bar title color that contrasts with a palette bar', () => {
		setIndex(3);
		const bars = [...new CollectionBlockWidget(LINEAR_COLORED).toDOM().querySelectorAll<HTMLElement>('div[title]')];
		expect(bars).toHaveLength(3);
		for (const bar of bars) {
			// kinds k0..k2 sort to palette slots 0..2; jsdom normalizes colors, so compare through a probe
			const slot = Number(bar.title.slice(1));
			const probe = document.createElement('div');
			probe.style.color = barTextColor(COLOR_PALETTE[slot]);
			probe.style.background = COLOR_PALETTE[slot];
			expect(bar.style.background).toBe(probe.style.background);
			expect(bar.style.color).toBe(probe.style.color);
		}
		// The blue first slot needs dark text.
		expect(barTextColor(COLOR_PALETTE[0])).toBe('#000000');
	});
});
