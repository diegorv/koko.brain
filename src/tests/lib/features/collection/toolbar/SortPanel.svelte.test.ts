// @vitest-environment jsdom
// The sort panel's row labels, over the real collection logic.
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import SortPanel from '#lib/features/collection/toolbar/SortPanel.svelte';
import type { PropertyConfig, SortDef } from '#lib/features/collection/collection.types.js';

describe('SortPanel', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function render(sorts: SortDef[], propertyConfigs: Record<string, PropertyConfig> = {}) {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(SortPanel, {
			target,
			props: {
				sorts,
				availableProperties: ['file.name', 'status'],
				propertyConfigs,
				propertyIndex: new Map(),
				onSortsChange: () => {},
			},
		});
		flushSync();
	}

	/** The property name of each sort row. */
	function rowLabels(): string[] {
		return [...target.querySelectorAll('[role="listitem"] span.truncate')].map((s) => s.textContent?.trim() ?? '');
	}

	it('labels a file.name sort Name and keeps a note property raw', () => {
		render([
			{ column: 'file.name', direction: 'ASC' },
			{ column: 'status', direction: 'DESC' },
		]);

		expect(rowLabels()).toEqual(['Name', 'status']);
	});

	it('uses a configured displayName first', () => {
		render([{ column: 'file.name', direction: 'ASC' }], { 'file.name': { displayName: 'Note' } });

		expect(rowLabels()).toEqual(['Note']);
	});

	it('shows the empty text with no sorts', () => {
		render([]);

		expect(rowLabels()).toEqual([]);
		expect(target.textContent).toContain('No sorts applied');
	});
});
