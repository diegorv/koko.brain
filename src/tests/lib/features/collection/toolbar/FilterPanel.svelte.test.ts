// @vitest-environment jsdom
// The filter panel's sections and its view-filter callbacks, over the real
// filter logic. Each callback writes back into the props, as its hosts do.
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import FilterPanel from '#lib/features/collection/toolbar/FilterPanel.svelte';
import type { FilterGroup } from '#lib/features/collection/toolbar/toolbar.types.js';

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

describe('FilterPanel', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let viewChanges: FilterGroup[][] = [];
	let globalChanges: FilterGroup[][] = [];

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function render(options: { showGlobal?: boolean; viewFilters?: FilterGroup[] } = {}) {
		viewChanges = [];
		globalChanges = [];
		target = document.body.appendChild(document.createElement('div'));
		const props = $state({
			globalFilters: [] as FilterGroup[],
			viewFilters: options.viewFilters ?? ([] as FilterGroup[]),
			availableProperties: ['file.name', 'status'],
			propertyIndex: new Map(),
			onGlobalFiltersChange: (groups: FilterGroup[]) => {
				globalChanges.push(groups);
				props.globalFilters = groups;
			},
			onViewFiltersChange: (groups: FilterGroup[]) => {
				viewChanges.push(groups);
				props.viewFilters = groups;
			},
			...(options.showGlobal === undefined ? {} : { showGlobal: options.showGlobal }),
		});
		component = mount(FilterPanel, { target, props });
		flushSync();
	}

	function buttons(text: string): HTMLButtonElement[] {
		return [...target.querySelectorAll<HTMLButtonElement>('button')].filter((b) => b.textContent?.trim() === text);
	}

	/** A synthetic click (detail 0, the keyboard path in bits-ui) toggles the menu open. */
	async function openMenu(trigger: HTMLElement) {
		trigger.click();
		await settle();
	}

	async function clickMenuItem(text: string) {
		const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) => el.textContent?.trim() === text);
		if (!item) throw new Error(`menu item "${text}" not found`);
		item.click();
		await settle();
	}

	const lastView = () => viewChanges[viewChanges.length - 1];

	it('renders both sections, with a separator, by default', () => {
		render();
		expect(target.textContent).toContain('All views');
		expect(target.textContent).toContain('This view');
		expect(target.querySelector('[data-slot="separator"]')).not.toBeNull();
		expect(buttons('Add filter')).toHaveLength(2);
	});

	it('renders only This view with showGlobal false', () => {
		render({ showGlobal: false });
		expect(target.textContent).not.toContain('All views');
		expect(target.textContent).toContain('This view');
		expect(target.querySelector('[data-slot="separator"]')).toBeNull();
		expect(buttons('Add filter')).toHaveLength(1);
	});

	it('reports add, edit, conjunction change and remove through onViewFiltersChange with showGlobal false', async () => {
		render({ showGlobal: false });

		buttons('Add filter')[0].click();
		await settle();
		expect(lastView()).toEqual([{ conjunction: 'and', rows: [expect.objectContaining({ property: 'file.name', operator: 'is', value: '' })] }]);

		const value = target.querySelector<HTMLInputElement>('input[placeholder="Value..."]')!;
		value.value = 'Alpha';
		value.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		expect(lastView()[0].rows[0].value).toBe('Alpha');

		await openMenu(buttons('All the following are true')[0]);
		await clickMenuItem('Any of the following are true');
		expect(lastView()[0].conjunction).toBe('or');
		expect(lastView()[0].rows[0].value).toBe('Alpha');

		// The row's delete button is the only icon button in the panel.
		const remove = [...target.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === '' && b.querySelector('svg'))!;
		remove.click();
		await settle();
		expect(lastView()).toEqual([]);
		expect(globalChanges).toEqual([]);
	});
});
