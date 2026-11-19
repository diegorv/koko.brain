// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import CollectionLinearCalendarView from '#lib/features/collection/CollectionLinearCalendarView.svelte';
import type { PropertyIndexRecord, QueryResult } from '#lib/features/collection/collection.types.js';
import { barColors, COLOR_PALETTE } from '#lib/features/collection/linear-calendar.logic.js';

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

	it('gives the blue first palette bar white text on a darker fill, matched by its legend swatch', () => {
		const target = render([makeRecord('Trip', { date: `${YEAR}-03-15`, status: 'planned' })], 'status');
		const trip = bar(target, 'Trip');
		const { fill } = barColors(COLOR_PALETTE[0]);
		// jsdom normalizes inline colors to rgb(), so compare through a probe
		const probe = document.createElement('span');
		probe.style.background = fill;

		expect(trip.style.color).toBe('rgb(255, 255, 255)');
		expect(trip.style.background).toBe(probe.style.background);
		expect(trip.classList).not.toContain('text-white');
		expect(target.querySelector<HTMLElement>('span.size-3')!.style.background).toBe(probe.style.background);
		// Light fills vanish on the card: the swatch has a 3:1 input edge
		expect(target.querySelector<HTMLElement>('span.size-3')!.classList).toContain('border-input');
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
