// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import CollectionTableView from '#lib/features/collection/CollectionTableView.svelte';
import type { PropertyIndexRecord, QueryResult, SortDef } from '#lib/features/collection/collection.types.js';

function makeRecord(i: number): PropertyIndexRecord {
	const name = `note-${i}.md`;
	return {
		path: `/vault/${name}`,
		name,
		basename: `note-${i}`,
		folder: '/vault',
		ext: '.md',
		mtime: 0,
		ctime: 0,
		size: 0,
		properties: new Map(),
	};
}

function makeResult(count: number): QueryResult {
	return {
		records: Array.from({ length: count }, (_, i) => makeRecord(i)),
		columns: [{ key: 'file.name', displayName: 'Name' }],
	};
}

describe('CollectionTableView', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function render(result: QueryResult, currentSort: SortDef[] = []): { setResult: (r: QueryResult) => void } {
		target = document.body.appendChild(document.createElement('div'));
		const props = $state({ result, currentSort });
		component = mount(CollectionTableView, { target, props });
		flushSync();
		return {
			setResult: (r) => {
				props.result = r;
				flushSync();
			},
		};
	}

	function rows(): HTMLTableRowElement[] {
		return [...target.querySelectorAll<HTMLTableRowElement>('tbody tr')];
	}

	function headers(): HTMLTableCellElement[] {
		return [...target.querySelectorAll<HTMLTableCellElement>('thead th')];
	}

	/** A one-record result with the given columns, each value read from the record. */
	function roadmapResult(columns: QueryResult['columns'], properties: Record<string, unknown> = {}): QueryResult {
		return {
			records: [{ ...makeRecord(0), path: '/vault/Projects/Roadmap.md', name: 'Roadmap.md', basename: 'Roadmap', properties: new Map(Object.entries(properties)) }],
			columns,
		};
	}

	function showMoreButton(): HTMLButtonElement | null {
		return [...target.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Show more') ?? null;
	}

	it('renders at most 200 rows and says how many are shown', () => {
		render(makeResult(450));

		expect(rows()).toHaveLength(200);
		expect(target.textContent).toContain('Showing 200 of 450');
		expect(showMoreButton()).not.toBeNull();
	});

	it('adds rows on "Show more" until every record is shown', () => {
		render(makeResult(450));

		showMoreButton()!.click();
		flushSync();
		expect(rows()).toHaveLength(400);
		expect(target.textContent).toContain('Showing 400 of 450');

		showMoreButton()!.click();
		flushSync();
		expect(rows()).toHaveLength(450);
		expect(target.textContent).not.toContain('Showing');
		expect(showMoreButton()).toBeNull();
	});

	it('shows every row and no footer when the result is under the cap', () => {
		render(makeResult(5));

		expect(rows()).toHaveLength(5);
		expect(target.textContent).not.toContain('Showing');
		expect(showMoreButton()).toBeNull();
	});

	it('shows the empty state for an empty result', () => {
		render(makeResult(0));

		expect(rows()).toHaveLength(0);
		expect(target.textContent).toContain('No results match the current filters');
	});

	it('keys rows by record path, so a reordered result keeps each row node', () => {
		const result = makeResult(3);
		const { setResult } = render(result);
		const firstRow = rows()[0];
		expect(firstRow.textContent).toContain('note-0');

		setResult({ ...result, records: [...result.records].reverse() });

		expect(rows()[2]).toBe(firstRow);
		expect(rows()[2].textContent).toContain('note-0');
	});

	it('shows a file.name cell without .md and keeps a file.path cell whole', () => {
		render(roadmapResult([
			{ key: 'file.name', displayName: 'Name' },
			{ key: 'file.path', displayName: 'Path' },
		]));

		const cells = [...rows()[0].querySelectorAll('td')].map((td) => td.textContent?.trim());
		expect(cells).toEqual(['Roadmap', '/vault/Projects/Roadmap.md']);
	});

	it('gives a header the raw key as its title when the label differs', () => {
		render(roadmapResult([
			{ key: 'file.name', displayName: 'Name' },
			{ key: 'status', displayName: 'status' },
		]));

		expect(headers()[0].textContent?.trim()).toBe('Name');
		expect(headers()[0].title).toBe('file.name');
		expect(headers()[1].hasAttribute('title')).toBe(false);
	});

	it('numbers each sorted header when more than one sort exists, with aria-sort on the primary only', () => {
		render(
			roadmapResult([
				{ key: 'file.name', displayName: 'Name' },
				{ key: 'status', displayName: 'status' },
				{ key: 'priority', displayName: 'priority' },
			]),
			[
				{ column: 'file.name', direction: 'ASC' },
				{ column: 'status', direction: 'DESC' },
			],
		);

		const [name, status, priority] = headers();
		expect(name.querySelector('[data-sort-rank]')?.textContent).toBe('1');
		expect(status.querySelector('[data-sort-rank]')?.textContent).toBe('2');
		expect(priority.querySelector('[data-sort-rank]')).toBeNull();
		expect(name.getAttribute('aria-sort')).toBe('ascending');
		expect(status.hasAttribute('aria-sort')).toBe(false);
		expect(priority.hasAttribute('aria-sort')).toBe(false);
		expect(status.textContent?.trim()).toBe('status \u21932');
	});

	it('shows no rank for a single sort and marks its header descending', () => {
		render(roadmapResult([{ key: 'status', displayName: 'status' }]), [{ column: 'status', direction: 'DESC' }]);

		expect(headers()[0].querySelector('[data-sort-rank]')).toBeNull();
		expect(headers()[0].textContent?.trim()).toBe('status \u2193');
		expect(headers()[0].getAttribute('aria-sort')).toBe('descending');
	});

	it('truncates a long text cell in a span that carries the full text as its title', () => {
		const long = 'x'.repeat(120);
		render(roadmapResult([{ key: 'summary', displayName: 'summary' }], { summary: long }));

		const span = rows()[0].querySelector('td span')!;
		expect(span.textContent).toBe(long);
		expect(span.getAttribute('title')).toBe(long);
		expect(span.classList.contains('max-w-80')).toBe(true);
		expect(span.classList.contains('truncate')).toBe(true);
	});

	it('makes the header sticky with no overflow-* element between it and the component root', () => {
		render(makeResult(3));

		const th = headers()[0];
		expect(th.classList.contains('sticky')).toBe(true);
		expect(th.classList.contains('top-0')).toBe(true);
		const between: Element[] = [];
		for (let el = th.parentElement; el && el !== target; el = el.parentElement) between.push(el);
		expect(between.length).toBeGreaterThan(0);
		for (const el of between) {
			expect([...el.classList].filter((c) => c.startsWith('overflow-'))).toEqual([]);
		}
	});
});
