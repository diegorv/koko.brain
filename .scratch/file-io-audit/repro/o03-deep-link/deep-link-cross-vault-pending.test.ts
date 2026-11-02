// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

/** Fake disk shared by the plugin-fs mock. */
const disk = new Map<string, string>();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async (cmd: string) => {
		if (cmd.startsWith('get_all_') || cmd.startsWith('scan_vault')) return [];
		return undefined;
	}),
	Channel: class {},
	convertFileSrc: (p: string) => p,
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(async () => () => {}),
	emit: vi.fn(async () => undefined),
}));

vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: () => ({
		onFocusChanged: vi.fn(async () => () => {}),
		setTitle: vi.fn(async () => undefined),
	}),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (p: string) => disk.has(p) || p === '/vaults/Personal' || p === '/vaults/Work'),
	readTextFile: vi.fn(async (p: string) => {
		if (!disk.has(p)) throw new Error(`not found: ${p}`);
		return disk.get(p)!;
	}),
	writeTextFile: vi.fn(async (p: string, c: string) => {
		disk.set(p, c);
	}),
	mkdir: vi.fn(async () => undefined),
	readDir: vi.fn(async () => []),
	remove: vi.fn(async () => undefined),
	rename: vi.fn(async () => undefined),
	stat: vi.fn(async () => ({ isFile: true, isDirectory: false, mtime: new Date() })),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(async () => true),
	open: vi.fn(async () => null),
	message: vi.fn(async () => undefined),
}));

vi.mock('@tauri-apps/plugin-deep-link', () => ({
	onOpenUrl: vi.fn(() => Promise.resolve(vi.fn())),
	getCurrent: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
	readText: vi.fn(async () => ''),
}));

import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { deepLinkStore } from '#lib/features/deep-link/deep-link.store.svelte.js';
import { executePendingAction, resolveAndDispatch } from '#lib/features/deep-link/deep-link.service.js';
import { initializeVault, teardownVault } from '#lib/app/lifecycle/app-lifecycle.service.js';

const WORK = '/vaults/Work';
const INBOX = `${WORK}/Inbox.md`;

describe('repro o03: cross-vault deep link while another vault is open', () => {
	beforeEach(() => {
		disk.clear();
		vaultStore._reset();
		deepLinkStore.reset();
		// Both vaults are in the recent list; Personal is the open one.
		vaultStore.open(WORK);
		vaultStore.open('/vaults/Personal');
		disk.set(INBOX, '# Inbox\n');
	});

	it('runs the pending append after the switch to the target vault', async () => {
		expect(vaultStore.recentVaults.map((v) => v.name)).toContain('Work');

		// kokobrain://new?vault=Work&name=Inbox&append=true&content=CLIP
		await resolveAndDispatch({ type: 'new', vault: 'Work', name: 'Inbox', append: true, content: 'CLIP' });
		expect(vaultStore.path).toBe(WORK);
		expect(deepLinkStore.hasPending).toBe(true);

		// The (app) layout effect now calls initializeVault(WORK). Personal was
		// initialized (its watcher handle is set), so initializeVault takes the
		// branch at app-lifecycle.service.ts:172-188 and calls teardownVault()
		// before it reaches Step 8, which is executePendingAction() (:503).
		teardownVault();
		await executePendingAction();

		expect(disk.get(INBOX)).toBe('# Inbox\n\nCLIP');
	});

	it('end to end: initializeVault(Work) after Personal was initialized drops the pending append', async () => {
		await initializeVault('/vaults/Personal');

		await resolveAndDispatch({ type: 'new', vault: 'Work', name: 'Inbox', append: true, content: 'CLIP' });
		expect(deepLinkStore.hasPending).toBe(true);

		// What the (app) layout $effect does when vaultStore.path changes.
		await initializeVault(WORK);
		await vi.waitFor(() => expect(deepLinkStore.hasPending).toBe(false));
		await new Promise((r) => setTimeout(r, 50));

		expect(disk.get(INBOX)).toBe('# Inbox\n\nCLIP');
	});

	it('control: the same pending append runs when no vault was initialized before', async () => {
		vaultStore._reset();
		vaultStore.open(WORK);
		vaultStore.open('/vaults/Personal');
		teardownVault();
		await resolveAndDispatch({ type: 'new', vault: 'Work', name: 'Inbox', append: true, content: 'CLIP' });

		await initializeVault(WORK);
		await vi.waitFor(() => expect(disk.get(INBOX)).toBe('# Inbox\n\nCLIP'));
	});
});
