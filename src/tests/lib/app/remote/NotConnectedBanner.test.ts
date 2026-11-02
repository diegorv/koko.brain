// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import NotConnectedBanner from '#lib/app/remote/NotConnectedBanner.svelte';
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
	});

	function render(): HTMLElement {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(NotConnectedBanner, { target });
		flushSync();
		return target;
	}

	it('shows the not-connected state when the browser stand-in is installed', () => {
		installTauriBridgeStandIn({ hasTauriRuntime: false });
		const target = render();
		const banner = target.querySelector('[role="status"]');
		expect(banner?.textContent).toContain('Not connected.');
		expect(banner?.textContent).toContain('not connected to the Kokobrain desktop app');
	});

	it('renders nothing inside Tauri (no stand-in)', () => {
		installTauriBridgeStandIn({ hasTauriRuntime: true });
		const target = render();
		expect(target.textContent?.trim()).toBe('');
	});

	it('renders nothing under a real bridge', () => {
		g.__TAURI_INTERNALS__ = { invoke: () => Promise.resolve() };
		const target = render();
		expect(target.querySelector('[role="status"]')).toBeNull();
	});
});
