// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';

import { mount, unmount, flushSync } from 'svelte';
import SettingItemHarness from '../../../fixtures/SettingItemHarness.svelte';

// jsdom computes no layout: these tests check the structure and classes. The
// widths themselves are measured in e2e/specs/settings.spec.ts ("setting rows").

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function render(props: { label: string; description?: string; layout?: 'inline' | 'stacked' }): HTMLElement {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(SettingItemHarness, { target, props });
	flushSync();
	const row = target.querySelector<HTMLElement>('.bg-setting-item-bg');
	if (!row) throw new Error('SettingItem row not rendered');
	return row;
}

/** The row's direct children: the text block, then the control column. */
function parts(row: HTMLElement): { text: HTMLElement; control: HTMLElement } {
	const [text, control] = [...row.children] as HTMLElement[];
	expect(row.children).toHaveLength(2);
	expect(text.textContent).toContain('Font family');
	expect(control.querySelector('[data-testid="control"]')).not.toBeNull();
	return { text, control };
}

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

describe('SettingItem', () => {
	it('inline (the default) puts the control after the text, in a column sized by its content', () => {
		const row = render({ label: 'Font family', description: 'CSS font-family value' });
		const { control } = parts(row);
		expect(row.classList.contains('flex-col')).toBe(false);
		expect(row.classList.contains('items-center')).toBe(true);
		expect(control.classList.contains('max-w-[50%]')).toBe(true);
		expect(control.classList.contains('shrink-0')).toBe(true);
		expect(target.querySelector('.w-2\\/5')).toBeNull();
	});

	it('stacked puts the text block above a full-width control inside a flex-col row', () => {
		const row = render({ label: 'Font family', description: 'CSS font-family value', layout: 'stacked' });
		const { control } = parts(row);
		expect(row.classList.contains('flex-col')).toBe(true);
		expect(row.classList.contains('items-stretch')).toBe(true);
		expect(control.classList.contains('w-full')).toBe(true);
		expect(control.classList.contains('max-w-[50%]')).toBe(false);
		expect(target.querySelector('.w-2\\/5')).toBeNull();
	});

	it('renders the label and the description on the chrome type scale', () => {
		const row = render({ label: 'Font family', description: 'CSS font-family value' });
		const { text } = parts(row);
		const [label, description] = [...text.children] as HTMLElement[];
		expect(label.textContent).toBe('Font family');
		expect(label.className).toContain('text-row');
		expect(description.textContent).toBe('CSS font-family value');
		expect(description.className).toContain('text-meta');
		expect(description.className).toContain('text-pretty');
	});

	it('renders no description element for an empty description', () => {
		const row = render({ label: 'Font family', description: '' });
		const { text } = parts(row);
		expect(text.children).toHaveLength(1);
		expect(text.textContent?.trim()).toBe('Font family');
	});
});
