// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn() },
}));

vi.mock('#lib/plugins/mods/mods-host.service.js', () => ({
	startModsHost: vi.fn(() => Promise.resolve()),
	stopModsHost: vi.fn(),
	enableMod: vi.fn(() => Promise.resolve()),
	disableMod: vi.fn(),
}));

import { toast } from 'svelte-sonner';

import LabsSection from '#lib/app/LabsSection.svelte';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import { startModsHost, stopModsHost } from '#lib/plugins/mods/mods-host.service.js';
import { modsStore } from '#lib/plugins/mods/mods.store.svelte.js';

const VAULT_A = '/Users/me/Vault A';

describe('LabsSection', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		vaultStore._reset();
		modsEnabledStore._reset();
		modsStore.reset();
		vaultStore.open(VAULT_A);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function render(): HTMLElement {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(LabsSection, { target });
		flushSync();
		return target;
	}

	function modsSwitch(root: HTMLElement): HTMLButtonElement {
		return root.querySelector<HTMLButtonElement>('[role="switch"][aria-label="Vault mods"]')!;
	}

	it('titles the section Labs and labels the toggle with its help line', () => {
		const root = render();

		expect(root.querySelector('h2')?.textContent?.trim()).toBe('Labs');
		expect(root.textContent).toContain('Vault mods');
		expect(root.textContent).toContain(
			'Run JavaScript mods from _system/mods/ in this vault. Mods run with full access to the app and your files. Only enable mods you wrote.',
		);
		expect(root.textContent?.toLowerCase()).not.toContain('reload');
	});

	it('shows the toggle off by default', () => {
		const toggle = modsSwitch(render());

		expect(toggle).not.toBeNull();
		expect(toggle.getAttribute('aria-checked')).toBe('false');
	});

	it('reflects the store when mods are on for the open vault', () => {
		modsEnabledStore.setEnabled(true);

		expect(modsSwitch(render()).getAttribute('aria-checked')).toBe('true');
	});

	it('turns mods on and off for the open vault when clicked', () => {
		const root = render();

		modsSwitch(root).click();
		flushSync();
		expect(modsEnabledStore.enabled).toBe(true);
		expect(modsSwitch(root).getAttribute('aria-checked')).toBe('true');

		modsSwitch(root).click();
		flushSync();
		expect(modsEnabledStore.enabled).toBe(false);
		expect(modsSwitch(root).getAttribute('aria-checked')).toBe('false');
	});

	it('shows an error toast and stays off when the flag cannot be saved', () => {
		const root = render();
		const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError');
		});
		try {
			modsSwitch(root).click();
			flushSync();
		} finally {
			spy.mockRestore();
		}

		expect(modsEnabledStore.enabled).toBe(false);
		expect(modsSwitch(root).getAttribute('aria-checked')).toBe('false');
		expect(toast.error).toHaveBeenCalledWith('Could not save the Vault mods setting');
		expect(startModsHost).not.toHaveBeenCalled();
	});

	it('starts the mods for the open vault when turned on and stops them when turned off', () => {
		const root = render();

		modsSwitch(root).click();
		flushSync();
		expect(startModsHost).toHaveBeenCalledWith(VAULT_A);
		expect(stopModsHost).not.toHaveBeenCalled();

		modsSwitch(root).click();
		flushSync();
		expect(stopModsHost).toHaveBeenCalledTimes(1);
	});

	it('lists the mods under the toggle only while mods are on', () => {
		modsStore.setEntries([{ id: 'hello', folder: 'hello', name: 'Hello', version: '1.0.0', state: 'loaded' }]);
		const root = render();
		expect(root.querySelector('[data-mod-folder="hello"]')).toBeNull();

		modsSwitch(root).click();
		flushSync();

		expect(root.querySelector('[data-mod-folder="hello"]')?.textContent).toContain('Hello');
	});
});
