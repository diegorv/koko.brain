// @vitest-environment jsdom
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
