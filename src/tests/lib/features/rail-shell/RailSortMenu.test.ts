// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import RailSortMenu from '#lib/features/rail-shell/RailSortMenu.svelte';
import type { ListSortConfig } from '#lib/features/rail-shell/list-toolbar.types.js';

async function settle(rounds = 6) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

describe('RailSortMenu', () => {
	let target: HTMLElement;
	let instance: Record<string, unknown> | null = null;

	function render(props: {
		config: ListSortConfig | null;
		extraCount?: number;
		properties?: string[];
		onSelect?: (config: ListSortConfig) => void;
		onMultipleSort?: () => void;
	}) {
		instance = mount(RailSortMenu, {
			target,
			props: {
				extraCount: 0,
				properties: [],
				onSelect: vi.fn(),
				...props,
			},
		});
		flushSync();
	}

	const trigger = () => target.querySelector<HTMLButtonElement>('button[data-note-list-sort]')!;

	async function open() {
		trigger().click();
		await settle();
		expect(isMenuOpen()).toBe(true);
	}

	const menu = () => document.querySelector<HTMLElement>('[role="menu"]');
	// jsdom never ends the exit animation, so a closed menu stays in the DOM with data-state="closed".
	const isMenuOpen = () => menu()?.closest('[data-state]')?.getAttribute('data-state') === 'open';
	const row = (option: string) =>
		document.querySelector<HTMLElement>(`[role="menuitemradio"][data-sort-option="${option}"]`);
	const arrow = (option: string, dir: 'asc' | 'desc') =>
		row(option)?.parentElement?.querySelector<HTMLButtonElement>(`[data-sort-dir="${dir}"]`) ?? null;

	beforeEach(() => {
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(async () => {
		if (instance) unmount(instance);
		instance = null;
		await settle();
		document.body.replaceChildren();
	});

	describe('trigger label', () => {
		it('shows the built-in label for a built-in sort', () => {
			render({ config: { option: 'title', direction: 'asc' } });
			expect(trigger().textContent?.trim()).toBe('Title');
		});

		it('shows the property key without its leading underscores', () => {
			render({ config: { option: 'property:_due', direction: 'desc' } });
			expect(trigger().textContent?.trim()).toBe('due');
		});

		it('shows Default when there is no sort', () => {
			render({ config: null });
			expect(trigger().textContent?.trim()).toBe('Default');
		});

		it('appends the count of extra sort columns', () => {
			render({ config: { option: 'modified', direction: 'desc' }, extraCount: 2 });
			expect(trigger().textContent).toContain('+2');
		});

		it('shows no count when there are no extra columns', () => {
			render({ config: { option: 'modified', direction: 'desc' }, extraCount: 0 });
			expect(trigger().textContent).not.toContain('+');
		});
	});

	describe('picking a row', () => {
		it('uses the default direction for a row that is not active', async () => {
			const onSelect = vi.fn();
			render({ config: null, onSelect });
			await open();

			row('modified')!.click();
			expect(onSelect).toHaveBeenLastCalledWith({ option: 'modified', direction: 'desc' });
		});

		it('uses ascending for a text row that is not active', async () => {
			const onSelect = vi.fn();
			render({ config: null, onSelect });
			await open();

			row('title')!.click();
			expect(onSelect).toHaveBeenLastCalledWith({ option: 'title', direction: 'asc' });
		});

		it('keeps the current direction when the row is already active', async () => {
			const onSelect = vi.fn();
			render({ config: { option: 'modified', direction: 'asc' }, onSelect });
			await open();

			row('modified')!.click();
			expect(onSelect).toHaveBeenLastCalledWith({ option: 'modified', direction: 'asc' });
		});

		it('closes the menu after a pick', async () => {
			render({ config: null, onSelect: vi.fn() });
			await open();

			row('created')!.click();
			await settle();
			expect(isMenuOpen()).toBe(false);
		});
	});

	describe('direction arrows', () => {
		it('picks the arrow direction on the row it sits next to', async () => {
			const onSelect = vi.fn();
			render({ config: { option: 'title', direction: 'asc' }, onSelect });
			await open();

			arrow('title', 'desc')!.click();
			expect(onSelect).toHaveBeenCalledTimes(1);
			expect(onSelect).toHaveBeenLastCalledWith({ option: 'title', direction: 'desc' });
		});

		it('picks a non-active row with the arrow direction, not the default', async () => {
			const onSelect = vi.fn();
			render({ config: null, onSelect });
			await open();

			arrow('created', 'asc')!.click();
			expect(onSelect).toHaveBeenCalledTimes(1);
			expect(onSelect).toHaveBeenLastCalledWith({ option: 'created', direction: 'asc' });
		});

		it('keeps the arrows out of the menuitemradio so they cannot pick the row', async () => {
			render({ config: null, onSelect: vi.fn() });
			await open();

			expect(row('title')!.querySelector('[data-sort-dir]')).toBeNull();
			expect(arrow('title', 'asc')!.closest('[role="menuitemradio"]')).toBeNull();
		});
	});

	describe('property rows', () => {
		it('lists no separator and no property rows without properties', async () => {
			render({ config: null, properties: [] });
			await open();

			expect(document.querySelector('[data-sort-separator]')).toBeNull();
			expect(document.querySelectorAll('[role="menuitemradio"][data-sort-option^="property:"]')).toHaveLength(0);
		});

		it('puts a separator before the property rows, labelled without underscores', async () => {
			const onSelect = vi.fn();
			render({ config: null, properties: ['_due', 'budget'], onSelect });
			await open();

			expect(document.querySelector('[data-sort-separator]')).not.toBeNull();
			expect(row('property:_due')?.textContent?.trim()).toBe('due');

			row('property:budget')!.click();
			expect(onSelect).toHaveBeenLastCalledWith({ option: 'property:budget', direction: 'asc' });
		});
	});

	describe('multiple sort item', () => {
		it('is absent without onMultipleSort', async () => {
			render({ config: null, properties: ['budget'] });
			await open();

			expect(document.querySelector('[data-sort-multiple]')).toBeNull();
		});

		it('is present with onMultipleSort and calls it on click', async () => {
			const onMultipleSort = vi.fn();
			render({ config: null, properties: [], onMultipleSort });
			await open();

			const item = document.querySelector<HTMLElement>('[data-sort-multiple]');
			expect(item?.textContent).toContain('Multiple sort...');
			item!.click();
			expect(onMultipleSort).toHaveBeenCalledTimes(1);
		});
	});

	describe('keyboard', () => {
		it('focuses the active row on open', async () => {
			render({ config: { option: 'created', direction: 'desc' } });
			await open();

			expect(document.activeElement).toBe(row('created'));
		});

		it('moves focus down with ArrowDown', async () => {
			render({ config: { option: 'modified', direction: 'desc' } });
			await open();

			menu()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			await settle();
			expect(document.activeElement).toBe(row('created'));
		});

		it('picks the focused row with Enter', async () => {
			const onSelect = vi.fn();
			render({ config: { option: 'modified', direction: 'desc' }, onSelect });
			await open();

			menu()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			await settle();
			document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
			await settle();

			expect(onSelect).toHaveBeenLastCalledWith({ option: 'created', direction: 'desc' });
		});

		it('closes the menu on Escape without picking', async () => {
			const onSelect = vi.fn();
			render({ config: null, onSelect });
			await open();

			document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			await settle();

			expect(isMenuOpen()).toBe(false);
			expect(onSelect).not.toHaveBeenCalled();
		});
	});

	describe('review regressions', () => {
		it('renders the panel outside the list pane, which clips and paints over inline content', async () => {
			render({ config: null });
			await open();
			expect(target.contains(menu())).toBe(false);
		});

		it('does nothing on Enter right after opening a customized sort, keeping its extra columns', async () => {
			const onSelect = vi.fn();
			instance = mount(RailSortMenu, {
				target,
				props: { config: { option: 'title', direction: 'asc' }, extraCount: 2, properties: [], onSelect, customized: true },
			});
			flushSync();
			await open();
			row('title')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
			await settle();
			expect(onSelect).not.toHaveBeenCalled();
			expect(isMenuOpen()).toBe(false);
		});

		it('lets an arrow click collapse a multi-column sort to the same column and direction', async () => {
			const onSelect = vi.fn();
			instance = mount(RailSortMenu, {
				target,
				props: { config: { option: 'title', direction: 'asc' }, extraCount: 2, properties: [], onSelect, customized: true },
			});
			flushSync();
			await open();
			arrow('title', 'asc')!.click();
			expect(onSelect).toHaveBeenCalledWith({ option: 'title', direction: 'asc' });
		});

		it('leaves focus where the arrow keys moved it, after the panel settles', async () => {
			render({ config: { option: 'modified', direction: 'desc' } });
			await open();
			await vi.waitFor(() => expect(document.activeElement).toBe(row('modified')));
			row('modified')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
			expect(document.activeElement).toBe(row('created'));
			await new Promise((resolve) => setTimeout(resolve, 50));
			await settle();
			expect(document.activeElement).toBe(row('created'));
		});

		it('picks a direction with ArrowLeft and ArrowRight on the focused row', async () => {
			const onSelect = vi.fn();
			render({ config: { option: 'modified', direction: 'desc' }, onSelect });
			await open();
			row('created')!.focus();
			row('created')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
			expect(onSelect).toHaveBeenLastCalledWith({ option: 'created', direction: 'asc' });
		});

		it('offers status once, as the built-in', async () => {
			render({ config: null, properties: ['budget', 'status'] });
			await open();
			expect(row('status')).not.toBeNull();
			expect(row('property:status')).toBeNull();
			expect(row('property:budget')).not.toBeNull();
		});

		it('adds a row for an active property no listed note has', async () => {
			render({ config: { option: 'property:gone', direction: 'asc' }, properties: ['budget'] });
			await open();
			expect(row('property:gone')?.getAttribute('aria-checked')).toBe('true');
		});

		it('offers Reset to default only on a customized sort, and it fires onReset', async () => {
			const onReset = vi.fn();
			instance = mount(RailSortMenu, {
				target,
				props: { config: { option: 'title', direction: 'asc' }, extraCount: 0, properties: [], onSelect: vi.fn(), onReset, customized: true },
			});
			flushSync();
			await open();
			document.querySelector<HTMLElement>('[data-sort-reset]')!.click();
			expect(onReset).toHaveBeenCalledOnce();
			unmount(instance);
			instance = null;
			await settle();
			document.body.innerHTML = '';
			target = document.body.appendChild(document.createElement('div'));
			instance = mount(RailSortMenu, {
				target,
				props: { config: { option: 'title', direction: 'asc' }, extraCount: 0, properties: [], onSelect: vi.fn(), onReset, customized: false },
			});
			flushSync();
			await open();
			expect(document.querySelector('[data-sort-reset]')).toBeNull();
		});
	});
});
