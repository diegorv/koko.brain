// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn() },
}));

vi.mock('#lib/plugins/mods/mods-host.service.js', () => ({
	enableMod: vi.fn(() => Promise.resolve()),
	disableMod: vi.fn(),
	readModSettings: vi.fn(() => Promise.resolve({ ok: true, values: {} })),
	saveModSetting: vi.fn(),
}));

import { toast } from 'svelte-sonner';

import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import ModsStatusList from '#lib/plugins/mods/ModsStatusList.svelte';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import { disableMod, enableMod, readModSettings, saveModSetting } from '#lib/plugins/mods/mods-host.service.js';
import type { ModSettingField } from '#lib/plugins/mods/mods.logic.js';
import { modsStore, type ModStatusEntry } from '#lib/plugins/mods/mods.store.svelte.js';

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

	it('shows the load time of a loaded mod, and none on error or disabled rows', () => {
		modsStore.setEntries([
			{ id: 'slow', folder: 'slow', name: 'Slow', version: '1.0.0', state: 'loaded', loadMs: 42 },
			{ id: 'quick', folder: 'quick', name: 'Quick', version: '1.0.0', state: 'loaded', loadMs: 0 },
			{ id: 'bad', folder: 'bad', name: 'bad', version: '', state: 'error', error: { message: 'x' } },
			{ id: 'off', folder: 'off', name: 'Off', version: '1.0.0', state: 'disabled' },
		]);
		const root = render();

		expect(row(root, 'slow').textContent).toContain('Loaded · 42 ms');
		expect(row(root, 'slow').querySelector('[data-mod-load-ms]')?.getAttribute('data-mod-load-ms')).toBe('42');
		expect(row(root, 'quick').textContent).toContain('Loaded · < 1 ms');
		expect(row(root, 'quick').querySelector('[data-mod-load-ms]')?.getAttribute('data-mod-load-ms')).toBe('0');
		for (const folder of ['bad', 'off']) {
			expect(row(root, folder).querySelector('[data-mod-load-ms]')).toBeNull();
			expect(row(root, folder).textContent).not.toContain('ms');
		}
	});

	it('shows the new time when a reload replaces the entry', () => {
		modsStore.setEntries([{ id: 'hello', folder: 'hello', name: 'Hello', version: '1.0.0', state: 'loaded', loadMs: 10 }]);
		const root = render();

		modsStore.upsertEntry({ id: 'hello', folder: 'hello', name: 'Hello', version: '1.0.0', state: 'loaded', loadMs: 25 });
		flushSync();

		expect(row(root, 'hello').textContent).toContain('Loaded · 25 ms');
		expect(row(root, 'hello').textContent).not.toContain('10 ms');
	});

	it('updates when the store changes', () => {
		const root = render();

		modsStore.upsertEntry({ id: 'hello', folder: 'hello', name: 'Hello', version: '1.0.0', state: 'loaded' });
		flushSync();

		expect(row(root, 'hello')).not.toBeNull();
		expect(root.textContent).not.toContain('No mods in _system/mods/');
	});

	describe('last callback error', () => {
		const AT = Date.UTC(2026, 10, 11, 14, 32, 7);
		const line = (root: HTMLElement, folder: string) => row(root, folder).querySelector<HTMLElement>('[data-mod-callback-error]');

		it('shows the callback, the time and the message on a loaded row, with the stack in details', () => {
			modsStore.setEntries([{ id: 'saver', folder: 'saver', name: 'Saver', version: '1.0.0', state: 'loaded' }]);
			modsStore.recordCallbackError('saver', { callback: 'onNoteSaved', message: 'bad <b>title</b>', stack: 'Error: bad\n    at main.js:4', at: AT });
			const root = render();

			const p = line(root, 'saver')!;
			expect(p.getAttribute('data-mod-callback-error')).toBe('onNoteSaved');
			expect(p.textContent).toContain('Last callback error (onNoteSaved, ');
			expect(p.textContent).toContain('): bad <b>title</b>');
			expect(p.querySelector('b')).toBeNull();
			expect(p.querySelector('time')?.getAttribute('datetime')).toBe(new Date(AT).toISOString());
			const details = row(root, 'saver').querySelector('details');
			expect(details?.querySelector('summary')?.textContent?.trim()).toBe('Stack trace');
			expect(details?.querySelector('pre')?.textContent).toBe('Error: bad\n    at main.js:4');
		});

		it('shows no stack details without a stack', () => {
			modsStore.setEntries([{ id: 'saver', folder: 'saver', name: 'Saver', version: '1.0.0', state: 'loaded' }]);
			modsStore.recordCallbackError('saver', { callback: 'watch', message: 'bad', at: AT });
			const root = render();

			expect(line(root, 'saver')?.getAttribute('data-mod-callback-error')).toBe('watch');
			expect(row(root, 'saver').querySelector('details')).toBeNull();
		});

		it('is not shown on an error or a disabled row', () => {
			modsStore.setEntries([
				{ id: 'bad', folder: 'bad', name: 'bad', version: '', state: 'error', error: { message: 'x' } },
				{ id: 'off', folder: 'off', name: 'Off', version: '1.0.0', state: 'disabled' },
			]);
			modsStore.recordCallbackError('bad', { callback: 'watch', message: 'stale', at: AT });
			modsStore.recordCallbackError('off', { callback: 'watch', message: 'stale', at: AT });
			const root = render();

			expect(line(root, 'bad')).toBeNull();
			expect(line(root, 'off')).toBeNull();
			expect(root.textContent).not.toContain('stale');
		});

		it('appears when the store is written after mount', () => {
			modsStore.setEntries([{ id: 'saver', folder: 'saver', name: 'Saver', version: '1.0.0', state: 'loaded' }]);
			const root = render();
			expect(line(root, 'saver')).toBeNull();

			modsStore.recordCallbackError('saver', { callback: 'theme.onChange', message: 'late', at: AT });
			flushSync();

			expect(line(root, 'saver')?.getAttribute('data-mod-callback-error')).toBe('theme.onChange');
			expect(line(root, 'saver')?.textContent).toContain('late');
		});
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

	describe('declared settings', () => {
		const FIELDS: ModSettingField[] = [
			{ key: 'folder', type: 'string', label: 'Target folder', default: 'Inbox' },
			{ key: 'compact', type: 'boolean', label: 'Compact view' },
			{ key: 'note', type: 'string', label: 'Note' },
			{ key: 'pinned', type: 'boolean', label: 'Pinned', default: true },
		];
		const PREFS: ModStatusEntry = { id: 'prefs', folder: 'prefs', name: 'Prefs', version: '1.0.0', state: 'loaded', settings: FIELDS };

		const control = <T extends HTMLElement>(root: HTMLElement, label: string) =>
			root.querySelector<T>(`[aria-label="Setting ${label} of Prefs"]`);
		const input = (root: HTMLElement, label: string) => control<HTMLInputElement>(root, label)!;

		/** Renders, then waits for the row's values to be read */
		async function renderRead(...entries: ModStatusEntry[]): Promise<HTMLElement> {
			modsStore.setEntries(entries);
			const root = render();
			await vi.waitFor(() => {
				flushSync();
				expect(root.querySelector('[data-mod-settings], [data-mod-settings-unavailable]')).not.toBeNull();
			});
			return root;
		}

		function typeInto(field: HTMLInputElement, value: string, event: 'input' | 'change'): void {
			field.value = value;
			field.dispatchEvent(new Event(event, { bubbles: true }));
			flushSync();
		}

		it('shows fields only on a loaded row that declares settings', async () => {
			modsEnabledStore.setModEnabled('off', false);
			const root = await renderRead(
				PREFS,
				{ id: 'plain', folder: 'plain', name: 'Plain', version: '1.0.0', state: 'loaded' },
				{ id: 'none', folder: 'none', name: 'None', version: '1.0.0', state: 'loaded', settings: [] },
				{ id: 'bad', folder: 'bad', name: 'Bad', version: '', state: 'error', error: { message: 'x' }, settings: FIELDS },
				{ id: 'off', folder: 'off', name: 'Off', version: '1.0.0', state: 'disabled', settings: FIELDS },
			);

			expect(readModSettings).toHaveBeenCalledTimes(1);
			expect(readModSettings).toHaveBeenCalledWith(VAULT, 'prefs');
			expect(row(root, 'prefs').querySelector('[data-mod-settings]')).not.toBeNull();
			for (const folder of ['plain', 'none', 'bad', 'off']) {
				expect(row(root, folder).querySelector('[data-mod-settings]')).toBeNull();
				expect(row(root, folder).querySelector('input')).toBeNull();
			}
			expect(row(root, 'prefs').textContent).toContain('Target folder');
			expect(row(root, 'prefs').textContent).toContain('Compact view');
		});

		it('shows the stored values, and the default for a key absent or of another type', async () => {
			vi.mocked(readModSettings).mockResolvedValueOnce({ ok: true, values: { folder: 'Work', compact: true, note: 3, pinned: 'yes', other: 1 } });
			const root = await renderRead(PREFS);

			expect(input(root, 'Target folder').value).toBe('Work');
			expect(control(root, 'Compact view')!.getAttribute('aria-checked')).toBe('true');
			expect(input(root, 'Note').value).toBe('');
			expect(control(root, 'Pinned')!.getAttribute('aria-checked')).toBe('true');
		});

		it('shows the defaults when nothing is stored', async () => {
			const root = await renderRead(PREFS);

			expect(input(root, 'Target folder').value).toBe('Inbox');
			expect(control(root, 'Compact view')!.getAttribute('aria-checked')).toBe('false');
			expect(input(root, 'Note').value).toBe('');
			expect(saveModSetting).not.toHaveBeenCalled();
		});

		it('a switch click saves at once and shows the new value', async () => {
			const root = await renderRead(PREFS);

			control(root, 'Compact view')!.click();
			flushSync();

			expect(saveModSetting).toHaveBeenCalledExactlyOnceWith(VAULT, 'prefs', 'compact', true);
			expect(control(root, 'Compact view')!.getAttribute('aria-checked')).toBe('true');
		});

		it('a text field saves on change, never per keystroke, and not when unchanged', async () => {
			const root = await renderRead(PREFS);
			const field = input(root, 'Target folder');

			typeInto(field, 'Hom', 'input');
			typeInto(field, 'Home', 'input');
			expect(saveModSetting).not.toHaveBeenCalled();

			typeInto(field, 'Home', 'change');
			expect(saveModSetting).toHaveBeenCalledExactlyOnceWith(VAULT, 'prefs', 'folder', 'Home');

			typeInto(field, 'Home', 'change');
			expect(saveModSetting).toHaveBeenCalledTimes(1);
			expect(input(root, 'Target folder').value).toBe('Home');
		});

		it('a refused read shows one line and no fields', async () => {
			vi.mocked(readModSettings).mockResolvedValueOnce({ ok: false, reason: 'not valid JSON' });
			const root = await renderRead(PREFS);

			expect(row(root, 'prefs').querySelector('[data-mod-settings-unavailable]')?.textContent?.trim()).toBe(
				'Settings unavailable: data.json is not valid JSON',
			);
			expect(row(root, 'prefs').querySelector('input')).toBeNull();
			expect(control(root, 'Compact view')).toBeNull();
		});

		it('reads again when a reload replaces the loaded entry', async () => {
			const root = await renderRead(PREFS);
			expect(input(root, 'Target folder').value).toBe('Inbox');
			vi.mocked(readModSettings).mockResolvedValueOnce({ ok: true, values: { folder: 'Saved' } });

			modsStore.upsertEntry({ ...PREFS, loadMs: 3 });
			await vi.waitFor(() => {
				flushSync();
				expect(input(root, 'Target folder').value).toBe('Saved');
			});
			expect(readModSettings).toHaveBeenCalledTimes(2);
		});

		it('drops a read that started before a newer edit', async () => {
			const root = await renderRead(PREFS);
			const field = input(root, 'Target folder');
			typeInto(field, 'Home', 'change');

			let resolveStale!: (value: Awaited<ReturnType<typeof readModSettings>>) => void;
			vi.mocked(readModSettings).mockReturnValueOnce(new Promise((resolve) => (resolveStale = resolve)));
			modsStore.upsertEntry({ ...PREFS, loadMs: 1 });
			flushSync();
			expect(readModSettings).toHaveBeenCalledTimes(2);

			typeInto(field, 'Work', 'change');
			resolveStale({ ok: true, values: { folder: 'Home' } });
			await Promise.resolve();
			await Promise.resolve();
			flushSync();
			expect(input(root, 'Target folder').value).toBe('Work');

			typeInto(field, 'Home', 'change');
			expect(saveModSetting).toHaveBeenLastCalledWith(VAULT, 'prefs', 'folder', 'Home');
			expect(saveModSetting).toHaveBeenCalledTimes(3);
		});

		it('renders labels as text', async () => {
			const root = await renderRead({ ...PREFS, settings: [{ key: 'x', type: 'boolean', label: '<b>Bold</b>' }] });

			expect(row(root, 'prefs').textContent).toContain('<b>Bold</b>');
			expect(row(root, 'prefs').querySelector('b')).toBeNull();
		});
	});
});
