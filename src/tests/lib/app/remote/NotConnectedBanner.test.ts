// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import NotConnectedBanner from '#lib/app/remote/NotConnectedBanner.svelte';
import { remoteConnectionStore } from '#lib/app/remote/remote-connection.store.svelte.js';
import { installTauriBridgeStandIn } from '#lib/app/remote/tauri-bridge-stand-in.js';

type Globals = Record<string, unknown>;
const g = window as unknown as Globals;

describe('NotConnectedBanner', () => {
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		delete g.__TAURI_INTERNALS__;
		delete g.__TAURI_EVENT_PLUGIN_INTERNALS__;
		remoteConnectionStore.reset();
	});

	function render(reload: () => void = () => {}): HTMLElement {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(NotConnectedBanner, { target, props: { reload } });
		flushSync();
		return target;
	}

	it('shows "Disconnected from the Mac" with a reload action when the browser lost the Mac', () => {
		installTauriBridgeStandIn({ hasTauriRuntime: false });
		remoteConnectionStore.setStatus('disconnected');
		const reload = vi.fn();
		const target = render(reload);
		const banner = target.querySelector('[data-testid="not-connected-banner"]');
		expect(banner?.getAttribute('role')).toBe('alert');
		expect(banner?.textContent).toContain('Disconnected from the Mac');
		const button = banner?.querySelector('button');
		expect(button?.textContent?.trim()).toBe('Reload');
		button?.click();
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('shows nothing while connecting or connected to an open vault', () => {
		installTauriBridgeStandIn({ hasTauriRuntime: false });
		const target = render();
		expect(target.querySelector('[role="status"]')).toBeNull();
		remoteConnectionStore.setStatus('connected');
		remoteConnectionStore.setVaultRoot('/v');
		flushSync();
		expect(target.querySelector('[role="status"]')).toBeNull();
	});

	it('shows the no-vault state when the desktop has no vault open', () => {
		installTauriBridgeStandIn({ hasTauriRuntime: false });
		remoteConnectionStore.setStatus('connected');
		const target = render();
		const banner = target.querySelector('[data-testid="no-vault-banner"]');
		expect(banner?.textContent).toContain('No vault open.');
	});

	it('renders nothing inside Tauri (no stand-in)', () => {
		installTauriBridgeStandIn({ hasTauriRuntime: true });
		remoteConnectionStore.setStatus('disconnected');
		const target = render();
		expect(target.textContent?.trim()).toBe('');
	});

	it('renders nothing under a real bridge', () => {
		g.__TAURI_INTERNALS__ = { invoke: () => Promise.resolve() };
		const target = render();
		expect(target.querySelector('[role="status"]')).toBeNull();
	});
});
