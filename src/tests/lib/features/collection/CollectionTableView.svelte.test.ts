// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import CollectionTableView from '#lib/features/collection/CollectionTableView.svelte';
import type { PropertyIndexRecord, QueryResult } from '#lib/features/collection/collection.types.js';

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

	function render(result: QueryResult): { setResult: (r: QueryResult) => void } {
		target = document.body.appendChild(document.createElement('div'));
		const props = $state({ result });
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
});
