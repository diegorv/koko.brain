// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PropertyField from '#lib/features/properties/PropertyField.svelte';
import type { Property } from '#lib/core/frontmatter/properties.types.js';

describe('PropertyField value input', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	function render(property: Property, accept: boolean) {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(PropertyField, {
			target,
			props: { property, onUpdate: () => accept, onRename: () => {}, onRemove: () => {} },
		});
		flushSync();
	}

	const valueInput = () => target.querySelector<HTMLInputElement>('input:not([data-property-key])')!;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('shows the stored value again when the edit is refused', () => {
		render({ key: 'title', value: 'x', type: 'text' }, false);
		const input = valueInput();
		input.value = 'xa';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		expect(valueInput().value).toBe('x');
	});

	it('unchecks a checkbox again when the edit is refused', () => {
		render({ key: 'done', value: false, type: 'boolean' }, false);
		const input = valueInput();
		input.checked = true;
		input.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(valueInput().checked).toBe(false);
	});

	it('keeps the typed text when the edit is accepted', () => {
		render({ key: 'title', value: 'x', type: 'text' }, true);
		const input = valueInput();
		input.value = 'xa';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		expect(valueInput().value).toBe('xa');
	});
});

describe('PropertyField text roles', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	function render(property: Property) {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(PropertyField, {
			target,
			props: { property, onUpdate: () => true, onRename: () => {}, onRemove: () => {} },
		});
		flushSync();
	}

	const key = () => target.querySelector<HTMLElement>('[data-property-key]')!;
	const value = () => target.querySelector<HTMLElement>('[data-property-value]')!;
	/** The value color token every value type shares. */
	const VALUE_COLOR = /(^|\s)!?text-right-sidebar-fg\/70(\s|$)/;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('sets key and value apart by weight, both on the row role', () => {
		render({ key: 'title', value: 'x', type: 'text' });

		expect(key().classList).toContain('text-row');
		expect(key().classList).not.toContain('font-medium');
		expect(value().classList).toContain('text-row');
		expect(value().classList).toContain('font-medium');
		expect(value().className).toMatch(VALUE_COLOR);
	});

	it('renders a boolean value like the other values', () => {
		render({ key: 'done', value: true, type: 'boolean' });

		expect(value().textContent).toBe('true');
		expect(value().classList).toContain('text-row');
		expect(value().classList).toContain('font-medium');
		expect(value().className).toMatch(VALUE_COLOR);
	});

	it('colors a date value with the same token as a text value', () => {
		render({ key: 'due', value: '2026-11-04', type: 'date' });

		expect(value().getAttribute('type')).toBe('date');
		expect(value().className).toMatch(VALUE_COLOR);
		// The WebKit date fields are colored by app.css through this variable.
		expect(value().style.getPropertyValue('--date-input-fg')).toBe('var(--right-sidebar-fg)');
		const css = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');
		expect(css).toMatch(/input\[type="date"\][^{]*\{[^}]*var\(--date-input-fg, var\(--foreground\)\)/);
	});
});
