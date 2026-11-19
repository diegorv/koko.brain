// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import CollectionCalendarView from '#lib/features/collection/CollectionCalendarView.svelte';
import type { PropertyIndexRecord, QueryResult } from '#lib/features/collection/collection.types.js';

function makeRecord(basename: string, date: string): PropertyIndexRecord {
	return {
		path: `/vault/${basename}.md`,
		name: `${basename}.md`,
		basename,
		folder: '/vault',
		ext: '.md',
		mtime: 0,
		ctime: 0,
		size: 0,
		properties: new Map([['date', date]]),
	};
}

describe('CollectionCalendarView adjacent-month days', () => {
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		vi.useRealTimers();
	});

	/** Renders June 2026 (Monday start, so July 1 to 5 trail the month) with four notes on July 2. */
	function render(): HTMLElement {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(2026, 5, 15));
		const target = document.body.appendChild(document.createElement('div'));
		const records = ['a', 'b', 'c', 'd'].map((n) => makeRecord(n, '2026-07-02'));
		const result: QueryResult = { records, columns: [] };
		component = mount(CollectionCalendarView, { target, props: { result, dateProperty: 'date' } });
		flushSync();
		return target;
	}

	/** The first or last day cell whose day number reads `n`; trailing days come after the month's. */
	function cell(target: HTMLElement, n: number, which: 'first' | 'last' = 'first'): HTMLElement {
		const cells = [...target.querySelectorAll<HTMLElement>('div.min-h-24')].filter(
			(c) => c.querySelector('span.rounded-full')?.textContent?.trim() === String(n),
		);
		return which === 'first' ? cells[0] : cells.at(-1)!;
	}

	const dayNumber = (c: HTMLElement) => c.querySelector<HTMLElement>('span.rounded-full')!;

	it('draws a trailing day number in the full muted token and a current one in the full foreground', () => {
		const target = render();
		const july2 = cell(target, 2, 'last');
		const june2 = cell(target, 2, 'first');
		expect(july2).not.toBe(june2);

		expect(dayNumber(july2).classList).toContain('text-muted-foreground');
		expect(dayNumber(july2).className).not.toMatch(/text-(muted-)?foreground\/\d+/);
		expect(dayNumber(june2).classList).toContain('text-foreground');
		expect(dayNumber(june2).className).not.toMatch(/text-(muted-)?foreground\/\d+/);
	});

	it('keeps a trailing cell on the card surface, so its "+N more" label keeps the muted token contrast', () => {
		const target = render();
		const july2 = cell(target, 2, 'last');

		expect(july2.className).not.toMatch(/(^|\s)bg-muted/);
		const more = [...july2.querySelectorAll('span')].find((s) => s.textContent?.trim() === '+1 more')!;
		expect(more.classList).toContain('text-muted-foreground');
	});
});
