// "Todoist: Show sync log" over the real store, with the in-memory vault
// behind invoke.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';
import { createFakeVault, type FakeVault } from '../../../fixtures/todoist-vault.fake';

setupLocalStorage();

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast }));
vi.mock('#lib/utils/debug.js', () => ({ debug: vi.fn(), error: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { error } from '#lib/utils/debug.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { todoistSyncStore } from '#lib/features/todoist-sync/todoist-sync.store.svelte.js';
import { showSyncLog } from '#lib/features/todoist-sync/sync-log.service.js';

let vault: FakeVault;

async function appendLog(entries: { kind: string; anchor: string | null; message: string }[]) {
	await vault.invoke('todoist_append_log', { vaultPath: vault.root, entries });
}

beforeEach(() => {
	vi.clearAllMocks();
	clearLocalStorage();
	vaultStore._reset();
	todoistSyncStore.reset();
	vault = createFakeVault('/vault');
	vi.mocked(invoke).mockImplementation((cmd, args) => vault.invoke(cmd, args as Record<string, unknown> | undefined));
	vaultStore.open('/vault');
});

describe('showSyncLog', () => {
	it('opens the dialog on the newest entries first', async () => {
		await appendLog([
			{ kind: 'frozen', anchor: 'td-1', message: 'Anchor td-1 appears 2 times' },
			{ kind: 'unmatched', anchor: 'td-2', message: 'No open task' },
		]);

		await showSyncLog();

		expect(todoistSyncStore.logOpen).toBe(true);
		expect(todoistSyncStore.logEntries.map((e) => [e.id, e.kind, e.anchor])).toEqual([
			[2, 'unmatched', 'td-2'],
			[1, 'frozen', 'td-1'],
		]);
	});

	it('lists at most the newest 100 entries', async () => {
		await appendLog(Array.from({ length: 120 }, (_, i) => ({ kind: 'stale', anchor: null, message: `m${i}` })));

		await showSyncLog();

		expect(todoistSyncStore.logEntries).toHaveLength(100);
		expect(todoistSyncStore.logEntries[0].id).toBe(120);
	});

	it('opens an empty dialog when nothing was logged', async () => {
		await showSyncLog();

		expect(todoistSyncStore.logOpen).toBe(true);
		expect(todoistSyncStore.logEntries).toEqual([]);
	});

	it('says to open a vault when none is open', async () => {
		vaultStore.close();

		await showSyncLog();

		expect(toast.error).toHaveBeenCalledWith('Open a vault to see its Todoist sync log.');
		expect(todoistSyncStore.logOpen).toBe(false);
	});

	it('shows an error toast and keeps the dialog closed when the log cannot be read', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('db closed'));

		await showSyncLog();

		expect(toast.error).toHaveBeenCalledWith('Could not read the Todoist sync log. Details are in the log.');
		expect(vi.mocked(error)).toHaveBeenCalledWith('TODOIST', 'reading the sync log failed:', expect.any(Error));
		expect(todoistSyncStore.logOpen).toBe(false);
	});
});
