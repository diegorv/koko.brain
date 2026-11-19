// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import CollectionLinearCalendarView from '#lib/features/collection/CollectionLinearCalendarView.svelte';
import type { PropertyIndexRecord, QueryResult } from '#lib/features/collection/collection.types.js';

const YEAR = new Date().getFullYear();

function makeRecord(basename: string, properties: Record<string, unknown>): PropertyIndexRecord {
	return {
		path: `/vault/${basename}.md`,
		name: `${basename}.md`,
		basename,
		folder: '/vault',
		ext: '.md',
		mtime: 0,
		ctime: 0,
		size: 0,
		properties: new Map(Object.entries(properties)),
	};
}

describe('CollectionLinearCalendarView', () => {
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function render(records: PropertyIndexRecord[], colorProperty?: string): HTMLElement {
		const target = document.body.appendChild(document.createElement('div'));
		const result: QueryResult = { records, columns: [] };
		component = mount(CollectionLinearCalendarView, { target, props: { result, dateProperty: 'date', colorProperty } });
		flushSync();
		return target;
	}

	function bar(target: HTMLElement, basename: string): HTMLButtonElement {
		const el = target.querySelector<HTMLButtonElement>(`button.absolute[title="${basename}"]`);
		if (!el) throw new Error(`no bar for ${basename}`);
		return el;
	}

	it('gives a light palette bar black text instead of white', () => {
		const target = render([makeRecord('Trip', { date: `${YEAR}-03-15`, status: 'planned' })], 'status');
		const trip = bar(target, 'Trip');

		// jsdom normalizes the inline `color: #000000` to rgb()
		expect(trip.style.color).toBe('rgb(0, 0, 0)');
		expect(trip.classList).not.toContain('text-white');
	});

	it('gives the var(--primary) fallback bar the theme primary foreground', () => {
		const target = render([makeRecord('Trip', { date: `${YEAR}-03-15` })]);
		const style = bar(target, 'Trip').getAttribute('style') ?? '';

		expect(style).toContain('background: var(--primary)');
		expect(style).toContain('color: var(--primary-foreground)');
	});

	it('renders no bar for an empty result', () => {
		const target = render([]);
		expect(target.querySelector('button.absolute')).toBeNull();
	});
});
