import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

/** Fake disk shared by the plugin-fs mock. */
const disk = new Map<string, string>();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async () => undefined),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (p: string) => disk.has(p)),
	readTextFile: vi.fn(async (p: string) => {
		if (!disk.has(p)) throw new Error(`not found: ${p}`);
		return disk.get(p)!;
	}),
	writeTextFile: vi.fn(async (p: string, c: string) => {
		disk.set(p, c);
	}),
	mkdir: vi.fn(async () => undefined),
	readDir: vi.fn(async () => []),
}));

vi.mock('@tauri-apps/plugin-deep-link', () => ({
	onOpenUrl: vi.fn(() => Promise.resolve(vi.fn())),
	getCurrent: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
	readText: vi.fn(async () => ''),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { executeAction } from '#lib/features/deep-link/deep-link.service.js';
import { parseDeepLinkUri } from '#lib/features/deep-link/deep-link.logic.js';
import { resolveFilePath } from '#lib/utils/path.js';

const VAULT = '/Users/me/kokobrain-vaults/Work';

async function run(url: string): Promise<void> {
	const parsed = parseDeepLinkUri(url);
	expect(parsed.ok).toBe(true);
	if (!parsed.ok) return;
	await executeAction(parsed.action, VAULT);
}

describe('repro o03: deep-link path safety', () => {
	beforeEach(() => {
		disk.clear();
		editorStore.reset();
		vaultStore._reset();
		vaultStore.open(VAULT);
	});

	it('a name that normalizes to the vault root never resolves outside the vault', () => {
		for (const name of ['.', '/', '../Work', 'a/..']) {
			let resolved: string | null = null;
			try {
				resolved = resolveFilePath(VAULT, name);
			} catch {
				resolved = null; // refusing is fine
			}
			if (resolved !== null) expect(resolved.startsWith(VAULT + '/')).toBe(true);
		}
	});

	it('silent new with name=. writes nothing outside the vault', async () => {
		await run('kokobrain://new?vault=Work&name=.&silent=true&content=x');

		const outside = [...disk.keys()].filter((p) => !p.startsWith(VAULT + '/'));
		expect(outside).toEqual([]);
	});

	it('overwrite refuses to rewrite app-owned files under .kokobrain', async () => {
		const manifest = `${VAULT}/.kokobrain/trash/trash-manifest.json`;
		const settings = `${VAULT}/.kokobrain/settings.json`;
		disk.set(manifest, '[{"id":"1"}]');
		disk.set(settings, '{"history":{"enabled":true}}');

		await run('kokobrain://new?vault=Work&file=.kokobrain/trash/trash-manifest.json&overwrite=true&content=[]');
		await run('kokobrain://new?vault=Work&file=.kokobrain/settings.json&overwrite=true&content=nope');

		expect(disk.get(manifest)).toBe('[{"id":"1"}]');
		expect(disk.get(settings)).toBe('{"history":{"enabled":true}}');
	});
});
