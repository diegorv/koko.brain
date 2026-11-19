// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { Input } from '#lib/components/ui/input/index.js';

describe('Input', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
	});

	function renderInput(props: Record<string, unknown> = {}): HTMLInputElement {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(Input, { target, props });
		flushSync();
		return target.querySelector<HTMLInputElement>('[data-slot="input"]')!;
	}

	it.each([{}, { type: 'file' }])('draws its edge with the 3:1 input token and focus with a 2px full ring (%o)', (props) => {
		const classes = [...renderInput(props).classList];
		expect(classes).toContain('border-input');
		expect(classes).toContain('focus-visible:ring-2');
		expect(classes).toContain('focus-visible:ring-ring');
		expect(classes.filter((c) => /ring-ring\/|ring-\[3px\]/.test(c))).toEqual([]);
	});
});
