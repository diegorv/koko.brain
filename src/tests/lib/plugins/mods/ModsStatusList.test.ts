// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn() },
}));

vi.mock('#lib/plugins/mods/mods-host.service.js', () => ({
	enableMod: vi.fn(() => Promise.resolve()),
	disableMod: vi.fn(),
}));

import { toast } from 'svelte-sonner';

import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import ModsStatusList from '#lib/plugins/mods/ModsStatusList.svelte';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import { disableMod, enableMod } from '#lib/plugins/mods/mods-host.service.js';
import { modsStore } from '#lib/plugins/mods/mods.store.svelte.js';

const VAULT = '/Users/me/Vault A';

describe('ModsStatusList', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		vaultStore._reset();
		modsEnabledStore._reset();
		modsStore.reset();
		vaultStore.open(VAULT);
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

	describe('per-mod switch', () => {
		function modSwitch(root: HTMLElement, folder: string): HTMLButtonElement {
			return row(root, folder).querySelector<HTMLButtonElement>('[role="switch"]')!;
		}

		it('shows a switch on for a loaded or failed mod and off for a disabled one', () => {
			modsEnabledStore.setModEnabled('off', false);
			modsStore.setEntries([
				{ id: 'hello', folder: 'hello', name: 'Hello', version: '1.0.0', state: 'loaded' },
				{ id: 'bad', folder: 'bad', name: 'bad', version: '', state: 'error', error: { message: 'x' } },
				{ id: 'off', folder: 'off', name: 'Off', version: '1.0.0', state: 'disabled' },
			]);
			const root = render();

			expect(modSwitch(root, 'hello').getAttribute('aria-checked')).toBe('true');
			expect(modSwitch(root, 'hello').getAttribute('aria-label')).toBe('Enable Hello');
			expect(modSwitch(root, 'bad').getAttribute('aria-checked')).toBe('true');
			expect(modSwitch(root, 'off').getAttribute('aria-checked')).toBe('false');
			expect(row(root, 'off').textContent).toContain('Disabled');
		});

		it('turning a mod off saves it and unloads only that mod', () => {
			modsStore.setEntries([{ id: 'hello', folder: 'hello', name: 'Hello', version: '1.0.0', state: 'loaded' }]);
			const root = render();

			modSwitch(root, 'hello').click();
			flushSync();

			expect(modsEnabledStore.disabledMods).toEqual(['hello']);
			expect(disableMod).toHaveBeenCalledWith('hello');
			expect(enableMod).not.toHaveBeenCalled();
		});

		it('turning a mod on saves it and loads it in the open vault', () => {
			modsEnabledStore.setModEnabled('off', false);
			modsStore.setEntries([{ id: 'off', folder: 'off', name: 'Off', version: '1.0.0', state: 'disabled' }]);
			const root = render();

			modSwitch(root, 'off').click();
			flushSync();

			expect(modsEnabledStore.disabledMods).toEqual([]);
			expect(enableMod).toHaveBeenCalledWith(VAULT, 'off');
			expect(disableMod).not.toHaveBeenCalled();
		});

		it('shows the saved switch while the mod is still loading, so a second click turns it off', () => {
			modsEnabledStore.setModEnabled('off', false);
			modsStore.setEntries([{ id: 'off', folder: 'off', name: 'Off', version: '1.0.0', state: 'disabled' }]);
			const root = render();

			modSwitch(root, 'off').click();
			flushSync();
			expect(modSwitch(root, 'off').getAttribute('aria-checked')).toBe('true');

			modSwitch(root, 'off').click();
			flushSync();
			expect(modsEnabledStore.disabledMods).toEqual(['off']);
			expect(disableMod).toHaveBeenCalledWith('off');
			expect(modSwitch(root, 'off').getAttribute('aria-checked')).toBe('false');
		});

		it('shows an error toast and changes nothing when the switch cannot be saved', () => {
			modsStore.setEntries([{ id: 'hello', folder: 'hello', name: 'Hello', version: '1.0.0', state: 'loaded' }]);
			const root = render();
			const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
				throw new Error('QuotaExceededError');
			});
			try {
				modSwitch(root, 'hello').click();
				flushSync();
			} finally {
				spy.mockRestore();
			}

			expect(modsEnabledStore.disabledMods).toEqual([]);
			expect(modSwitch(root, 'hello').getAttribute('aria-checked')).toBe('true');
			expect(toast.error).toHaveBeenCalledWith('Could not save the setting for Hello');
			expect(disableMod).not.toHaveBeenCalled();
		});
	});
});
