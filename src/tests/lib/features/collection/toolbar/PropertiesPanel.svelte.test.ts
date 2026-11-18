// @vitest-environment jsdom
// The properties panel's column labels, over the real collection logic.
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PropertiesPanel from '#lib/features/collection/toolbar/PropertiesPanel.svelte';
import type { PropertyConfig } from '#lib/features/collection/collection.types.js';

describe('PropertiesPanel', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function render(allColumns: string[], propertyConfigs: Record<string, PropertyConfig> = {}) {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(PropertiesPanel, {
			target,
			props: {
				visibleColumns: ['file.name'],
				allColumns,
				propertyConfigs,
				onColumnsChange: () => {},
				formulaEntries: [],
				onFormulasChange: () => {},
			},
		});
		flushSync();
	}

	function labels(): string[] {
		return [...target.querySelectorAll('label')].map((l) => l.textContent?.trim() ?? '');
	}

	it('labels file.* columns readably and keeps note properties raw', () => {
		render(['file.name', 'file.mtime', 'due_date']);

		expect(labels()).toEqual(['Name', 'Modified', 'due_date']);
	});

	it('uses a configured displayName first', () => {
		render(['file.name', 'status'], { 'file.name': { displayName: 'Note' }, status: { displayName: 'Status' } });

		expect(labels()).toEqual(['Note', 'Status']);
	});

	it('shows the empty text when there are no columns', () => {
		render([]);

		expect(labels()).toEqual([]);
		expect(target.textContent).toContain('No properties available');
	});
});
