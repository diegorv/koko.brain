// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// No mock of file-icons.icon-data.js here (unlike Rail.test.ts): the icon must
// come from the real pack load the mods host starts, so the test fails if the
// host never calls preloadPacks or the load never bumps packVersion.

const fsFiles = vi.hoisted(() => new Map<string, string>());

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (path: string) => [...fsFiles.keys()].some((k) => k.startsWith(`${path}/`))),
	readDir: vi.fn(async () => [{ name: 'hello', isDirectory: true, isFile: false, isSymlink: false }]),
	readTextFile: vi.fn(async (path: string) => {
		const text = fsFiles.get(path);
		if (text === undefined) throw new Error(`No such file: ${path}`);
		return text;
	}),
}));

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

import { mount, unmount, flushSync } from 'svelte';

import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { getIconsForPack, getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import Rail from '#lib/features/rail-shell/Rail.svelte';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import { startModsHost, stopModsHost } from '#lib/plugins/mods/mods-host.service.js';

const VAULT = '/vaults/main';

describe("a mod's rail button icon", () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		localStorage.clear();
		vaultStore._reset();
		modsEnabledStore._reset();
		railRegistryStore.reset();
		fileIconsStore.reset();
		vaultStore.open(VAULT);
		modsEnabledStore.setEnabled(true);
		fsFiles.set(`${VAULT}/_system/mods/hello/manifest.json`, JSON.stringify({ id: 'hello', name: 'Hello mod', version: '1.0.0' }));
		fsFiles.set(
			`${VAULT}/_system/mods/hello/main.js`,
			`export default {
	onload(ctx) {
		ctx.addAction({ id: 'hello', title: 'Say hello', run: () => {} });
		ctx.addRailButton({ id: 'main', title: 'Hello mod', icon: 'lucide:sparkles' });
	},
};`,
		);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(Rail, { target, props: { activeItem: 'inbox', onSelect: vi.fn() } });
		flushSync();
	});

	afterEach(() => {
		stopModsHost();
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('shows the fallback while no note has loaded lucide, then the icon once the host-started load finishes', async () => {
		expect(getIconSync('lucide', 'sparkles')).toBeUndefined();

		await startModsHost(VAULT);
		flushSync();

		const svg = () => target.querySelector('[data-rail-item="mod:hello:main"] svg');
		expect(svg()?.getAttribute('class')).toContain('lucide-puzzle');

		await vi.waitFor(
			() => {
				flushSync();
				expect(svg()?.getAttribute('class')).not.toContain('lucide-puzzle');
			},
			{ timeout: 10_000 },
		);
		expect(fileIconsStore.packVersion).toBeGreaterThan(0);
		expect(getIconSync('lucide', 'sparkles')).toBeDefined();
		expect(svg()!.innerHTML).not.toBe('');
	});

	it('a load with the pack already cached leaves packVersion alone, so no icon resolves again', async () => {
		// getIconsForPack fills the cache without bumping packVersion, as a note's earlier load would have.
		await getIconsForPack('lucide');
		const before = fileIconsStore.packVersion;

		await startModsHost(VAULT);
		await new Promise((resolve) => setTimeout(resolve, 0));
		flushSync();

		expect(target.querySelector('[data-rail-item="mod:hello:main"]')).not.toBeNull();
		expect(fileIconsStore.packVersion).toBe(before);
	});
});
