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
		expect(invoke).toHaveBeenCalledWith('start_remote_server', { port: 4747, tailnetHost: '', ownerLogin: '' });
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
		expect(invoke).toHaveBeenLastCalledWith('start_remote_server', { port: 5123, tailnetHost: '', ownerLogin: '' });

		portInput().value = '80';
		portInput().dispatchEvent(new Event('change', { bubbles: true }));
		await settle();
		expect(settingsStore.remoteServer.port).toBe(1024);
		expect(portInput().value).toBe('1024');
	});

	function field(label: string): HTMLInputElement {
		return target.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
	}

	function commit(input: HTMLInputElement, value: string): void {
		input.value = value;
		input.dispatchEvent(new Event('change', { bubbles: true }));
	}

	it('shows the exact Serve commands for the configured port', async () => {
		const text = () => target.querySelector('[data-testid="serve-commands"]')?.textContent ?? '';
		expect(text()).toContain('tailscale serve --bg --https=4747 http://127.0.0.1:4747');
		expect(text()).toContain('tailscale serve --https=4747 off');
		expect(text()).toContain('tailscale serve status');

		commit(portInput(), '5123');
		await settle();
		expect(text()).toContain('tailscale serve --bg --https=5123 http://127.0.0.1:5123');
		expect(text()).toContain('tailscale serve --https=5123 off');
	});

	it('a Funnel port is refused and falls back to the default', async () => {
		commit(portInput(), '8443');
		await settle();
		expect(settingsStore.remoteServer.port).toBe(4747);
		expect(portInput().value).toBe('4747');
	});

	it('says when a typed port was replaced, and clears the note on an accepted one', async () => {
		const note = () => target.querySelector('[data-testid="port-note"]')?.textContent ?? null;
		expect(note()).toBeNull();

		commit(portInput(), '10000');
		await settle();
		expect(note()).toContain('10000');
		expect(note()).toContain('4747');

		commit(portInput(), '5123');
		await settle();
		expect(note()).toBeNull();
	});

	it('saves the tailnet name and owner login, normalized', async () => {
		commit(field('Tailnet host name'), ' https://Mac.tail1234.ts.net:4747/ ');
		commit(field('Owner Tailscale login'), ' me@example.com ');
		await settle();

		expect(settingsStore.remoteServer.tailnetHost).toBe('mac.tail1234.ts.net');
		expect(settingsStore.remoteServer.ownerLogin).toBe('me@example.com');
		expect(field('Tailnet host name').value).toBe('mac.tail1234.ts.net');
		expect(invoke).not.toHaveBeenCalled();
	});

	it('a tailnet change while on restarts the host with it and shows the tailnet URL', async () => {
		toggle().click();
		await settle();
		commit(field('Tailnet host name'), 'mac.tail1234.ts.net');
		await settle();
		commit(field('Owner Tailscale login'), 'me@example.com');
		await settle();

		expect(invoke).toHaveBeenLastCalledWith('start_remote_server', {
			port: 4747,
			tailnetHost: 'mac.tail1234.ts.net',
			ownerLogin: 'me@example.com',
		});
		expect(target.querySelector('[role="status"]')?.textContent).toContain('https://mac.tail1234.ts.net:4747');
	});

	it('a port change while off only saves the port', async () => {
		portInput().value = '5123';
		portInput().dispatchEvent(new Event('change', { bubbles: true }));
		await settle();

		expect(settingsStore.remoteServer.port).toBe(5123);
		expect(invoke).not.toHaveBeenCalled();
	});
});
