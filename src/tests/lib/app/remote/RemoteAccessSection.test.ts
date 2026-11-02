// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve(null)),
}));

import { flushSync, mount, tick, unmount } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import RemoteAccessSection from '#lib/app/remote/RemoteAccessSection.svelte';
import { remoteServerStore } from '#lib/app/remote/remote-server.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

/** Lets the awaited invoke and the store writes after it settle. */
async function settle(): Promise<void> {
	for (let i = 0; i < 5; i++) await tick();
	flushSync();
}

describe('RemoteAccessSection', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		settingsStore.reset();
		remoteServerStore.reset();
		vi.mocked(invoke).mockReset();
		vi.mocked(invoke).mockResolvedValue(null);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(RemoteAccessSection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
		remoteServerStore.reset();
	});

	function toggle(): HTMLButtonElement {
		return target.querySelector('[role="switch"]') as HTMLButtonElement;
	}

	function portInput(): HTMLInputElement {
		return target.querySelector('input[aria-label="Browser access port"]') as HTMLInputElement;
	}

	it('is off by default and shows the default port', () => {
		expect(toggle().getAttribute('aria-checked')).toBe('false');
		expect(portInput().value).toBe('4747');
		expect(target.querySelector('[role="alert"]')).toBeNull();
	});

	it('turning it on persists the setting, starts the server and shows the URL', async () => {
		toggle().click();
		await settle();

		expect(settingsStore.remoteServer.enabled).toBe(true);
		expect(invoke).toHaveBeenCalledWith('start_remote_server', { port: 4747 });
		expect(target.querySelector('[role="status"]')?.textContent).toContain('http://127.0.0.1:4747');
	});

	it('turning it off stops the server', async () => {
		toggle().click();
		await settle();
		toggle().click();
		await settle();

		expect(settingsStore.remoteServer.enabled).toBe(false);
		expect(invoke).toHaveBeenLastCalledWith('stop_remote_server');
		expect(target.querySelector('[role="status"]')).toBeNull();
	});

	it('shows a port-in-use error instead of failing silently', async () => {
		vi.mocked(invoke).mockRejectedValueOnce('Port 4747 is already in use');
		toggle().click();
		await settle();

		const alert = target.querySelector('[role="alert"]');
		expect(alert?.textContent).toContain('Port 4747 is already in use');
		expect(target.querySelector('[role="status"]')).toBeNull();
	});

	it('a port change while on restarts on the new port; out-of-range input is clamped', async () => {
		toggle().click();
		await settle();

		portInput().value = '5123';
		portInput().dispatchEvent(new Event('change', { bubbles: true }));
		await settle();
		expect(settingsStore.remoteServer.port).toBe(5123);
		expect(invoke).toHaveBeenLastCalledWith('start_remote_server', { port: 5123 });

		portInput().value = '80';
		portInput().dispatchEvent(new Event('change', { bubbles: true }));
		await settle();
		expect(settingsStore.remoteServer.port).toBe(1024);
		expect(portInput().value).toBe('1024');
	});

	it('a port change while off only saves the port', async () => {
		portInput().value = '5123';
		portInput().dispatchEvent(new Event('change', { bubbles: true }));
		await settle();

		expect(settingsStore.remoteServer.port).toBe(5123);
		expect(invoke).not.toHaveBeenCalled();
	});
});
