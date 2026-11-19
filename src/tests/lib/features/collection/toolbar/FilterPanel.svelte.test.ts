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

	function render(
		options: { showGlobal?: boolean; embedded?: boolean; viewFilters?: FilterGroup[]; globalFilters?: FilterGroup[] } = {},
	) {
		viewChanges = [];
		globalChanges = [];
		target = document.body.appendChild(document.createElement('div'));
		const props = $state({
			globalFilters: options.globalFilters ?? ([] as FilterGroup[]),
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
			...(options.embedded === undefined ? {} : { embedded: options.embedded }),
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

	it('counts the filters of each section in a pill drawn in the text-on-tint primary', () => {
		render({
			globalFilters: [{ conjunction: 'and', rows: [
				{ id: 'g1', property: 'status', operator: 'is', value: 'done' },
				{ id: 'g2', property: 'file.name', operator: 'contains', value: 'a' },
			] }],
			viewFilters: [{ conjunction: 'and', rows: [{ id: 'v1', property: 'status', operator: 'is', value: 'done' }] }],
		});
		for (const [section, count] of [['global', '2'], ['view', '1']]) {
			const pill = target.querySelector<HTMLElement>(`[data-filter-panel-count="${section}"]`)!;
			expect(pill.textContent?.trim(), section).toBe(count);
			expect(pill.classList).toContain('bg-primary/15');
			expect(pill.classList).toContain('text-primary-tint-fg');
			expect(pill.classList).not.toContain('text-primary');
		}
	});

	it('renders only This view with showGlobal false', () => {
		render({ showGlobal: false });
		expect(target.textContent).not.toContain('All views');
		expect(target.textContent).toContain('This view');
		expect(target.querySelector('[data-slot="separator"]')).toBeNull();
		expect(buttons('Add filter')).toHaveLength(1);
	});

	describe('embedded', () => {
		const rows: FilterGroup[] = [{ conjunction: 'and', rows: [{ id: 'v1', property: 'status', operator: 'is', value: 'done' }] }];

		it('shows the view rows without the "This view" header or its "Add filter" button', () => {
			render({ showGlobal: false, embedded: true, viewFilters: rows });
			expect(target.textContent).not.toContain('This view');
			expect(target.textContent).not.toContain('All views');
			expect(buttons('Add filter')).toHaveLength(0);
			expect(target.querySelector<HTMLInputElement>('input[placeholder="Value..."]')?.value).toBe('done');
		});

		it('still reports a conjunction change through onViewFiltersChange', async () => {
			render({ showGlobal: false, embedded: true, viewFilters: rows });
			await openMenu(buttons('All the following are true')[0]);
			await clickMenuItem('Any of the following are true');
			expect(lastView()[0].conjunction).toBe('or');
		});

		it('renders nothing for no groups', () => {
			render({ showGlobal: false, embedded: true });
			expect(target.textContent?.trim()).toBe('');
			expect(target.querySelectorAll('button')).toHaveLength(0);
		});
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

	describe('conjunction trigger', () => {
		const group = (id: string): FilterGroup[] => [
			{ conjunction: 'and', rows: [{ id, property: 'status', operator: 'is', value: 'done' }] },
		];

		/** The styled conjunction buttons: the innermost button carrying the label, inside the menu trigger. */
		function conjunctionTriggers(text: string): HTMLButtonElement[] {
			return buttons(text).filter((b) => !b.querySelector('button'));
		}

		it('looks like the row selectors in both groups: bordered, with a chevron, the label unchanged', () => {
			render({ globalFilters: group('g1'), viewFilters: group('v1') });

			const triggers = conjunctionTriggers('All the following are true');
			expect(triggers).toHaveLength(2);
			for (const trigger of triggers) {
				expect(trigger.lastElementChild?.tagName.toLowerCase()).toBe('svg');
				for (const cls of ['border', 'h-7', 'rounded-md', 'px-2', 'hover:bg-accent']) {
					expect(trigger.classList.contains(cls)).toBe(true);
				}
				expect(trigger.classList.contains('min-w-[80px]')).toBe(false);
			}
		});

		it('still reports "Any" as or for the global group', async () => {
			render({ globalFilters: group('g1'), viewFilters: group('v1') });

			await openMenu(conjunctionTriggers('All the following are true')[0]);
			await clickMenuItem('Any of the following are true');

			expect(globalChanges[globalChanges.length - 1][0].conjunction).toBe('or');
			expect(viewChanges).toEqual([]);
		});
	});
});
