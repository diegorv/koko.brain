// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FilterRow from '#lib/features/collection/toolbar/FilterRow.svelte';
import type { FilterRow as FilterRowType } from '#lib/features/collection/toolbar/toolbar.types.js';

describe('FilterRow — raw expression validity', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	/** Mounts a raw row whose onUpdate writes back into its props, like FilterPanel. */
	function render(raw: string): void {
		target = document.body.appendChild(document.createElement('div'));
		const props = $state({
			row: { id: 'r1', property: '', operator: 'is', value: '', raw } as FilterRowType,
			availableProperties: [] as string[],
			propertyIndex: new Map(),
			onUpdate: (row: FilterRowType) => { props.row = row; },
			onRemove: () => {},
		});
		component = mount(FilterRow, { target, props });
		flushSync();
	}

	function input(): HTMLInputElement {
		const el = target.querySelector<HTMLInputElement>('input[placeholder="Expression..."]');
		if (!el) throw new Error('raw input not found');
		return el;
	}

	function type(text: string): void {
		const el = input();
		el.value = text;
		el.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	const message = () => target.querySelector('[data-filter-error]')?.textContent ?? null;

	it('marks text that does not parse as invalid, with a message', () => {
		render("status = 'active'");

		expect(input().getAttribute('aria-invalid')).toBe('true');
		expect(message()).toBeTruthy();
	});

	it('marks a call to an unknown function, naming it', () => {
		render('foo(1) == 2');

		expect(input().getAttribute('aria-invalid')).toBe('true');
		expect(message()).toContain('foo');
	});

	it('stops marking the input once the typed text parses', () => {
		render("status = 'active'");

		type("status == 'active'");

		expect(input().hasAttribute('aria-invalid')).toBe(false);
		expect(message()).toBeNull();
	});

	it('marks the input while the typed text stops parsing', () => {
		render("status == 'active'");
		expect(input().hasAttribute('aria-invalid')).toBe(false);

		type("status == 'active");

		expect(input().getAttribute('aria-invalid')).toBe('true');
		expect(message()).toBeTruthy();
	});

	it('does not mark an empty or blank input', () => {
		render('');
		expect(input().hasAttribute('aria-invalid')).toBe(false);
		expect(message()).toBeNull();

		type('   ');
		expect(input().hasAttribute('aria-invalid')).toBe(false);
		expect(message()).toBeNull();
	});
});
