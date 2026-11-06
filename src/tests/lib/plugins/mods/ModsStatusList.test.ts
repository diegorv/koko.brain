// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

import ModsStatusList from '#lib/plugins/mods/ModsStatusList.svelte';
import { modsStore } from '#lib/plugins/mods/mods.store.svelte.js';

describe('ModsStatusList', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		modsStore.reset();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function render(): HTMLElement {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(ModsStatusList, { target });
		flushSync();
		return target;
	}

	function row(root: HTMLElement, folder: string): HTMLElement {
		return root.querySelector<HTMLElement>(`[data-mod-folder="${folder}"]`)!;
	}

	it('says so when there are no mods', () => {
		expect(render().textContent).toContain('No mods in _system/mods/');
	});

	it('shows a loaded row and an error row with its message and the stack in details', () => {
		modsStore.setEntries([
			{ id: 'hello', folder: 'hello', name: 'Hello', version: '1.0.0', state: 'loaded' },
			{
				id: 'broken',
				folder: 'broken',
				name: 'Broken',
				version: '0.1.0',
				state: 'error',
				error: { message: '_system/mods/broken: onload failed: boom', stack: 'Error: boom\n    at kokobrain-mods/broken/main.js:3' },
			},
		]);
		const root = render();

		const loaded = row(root, 'hello');
		expect(loaded.textContent).toContain('Hello');
		expect(loaded.textContent).toContain('1.0.0');
		expect(loaded.textContent).toContain('Loaded');
		expect(loaded.querySelector('details')).toBeNull();

		const failed = row(root, 'broken');
		expect(failed.textContent).toContain('Broken');
		expect(failed.textContent).toContain('Error');
		expect(failed.textContent).toContain('_system/mods/broken: onload failed: boom');
		const details = failed.querySelector('details');
		expect(details).not.toBeNull();
		expect(details!.querySelector('summary')?.textContent?.trim()).toBe('Stack trace');
		expect(details!.querySelector('pre')?.textContent).toBe('Error: boom\n    at kokobrain-mods/broken/main.js:3');
	});

	it('shows an error without a stack and no details', () => {
		modsStore.setEntries([
			{
				id: 'bad',
				folder: 'bad',
				name: 'bad',
				version: '',
				state: 'error',
				error: { message: '_system/mods/bad: manifest.json is not valid JSON' },
			},
		]);
		const failed = row(render(), 'bad');

		expect(failed.textContent).toContain('_system/mods/bad: manifest.json is not valid JSON');
		expect(failed.querySelector('details')).toBeNull();
	});

	it('updates when the store changes', () => {
		const root = render();

		modsStore.upsertEntry({ id: 'hello', folder: 'hello', name: 'Hello', version: '1.0.0', state: 'loaded' });
		flushSync();

		expect(row(root, 'hello')).not.toBeNull();
		expect(root.textContent).not.toContain('No mods in _system/mods/');
	});
});
