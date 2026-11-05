import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(() => Promise.resolve(vi.fn())),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(() => Promise.resolve()),
	mkdir: vi.fn(),
	exists: vi.fn(() => Promise.resolve(true)),
	readDir: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn(),
	ask: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-deep-link', () => ({
	onOpenUrl: vi.fn(() => Promise.resolve(vi.fn())),
	getCurrent: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
	readText: vi.fn(() => Promise.resolve('')),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	perfStart: vi.fn(() => 0),
	perfEnd: vi.fn(),
	perfBaseline: vi.fn(),
}));

vi.mock('#lib/utils/log.service.js', () => ({
	appendLog: vi.fn(),
}));

vi.mock('#lib/features/event-calendar/event-calendar.service.js', () => ({
	drainEventCalendarWrites: vi.fn(() => Promise.resolve()),
}));

import { invoke } from '@tauri-apps/api/core';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { ask, open } from '@tauri-apps/plugin-dialog';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { openRecentVault, openVaultDialog, switchVault } from '#lib/core/vault/vault.service.js';
import { resolveAndDispatch } from '#lib/features/deep-link/deep-link.service.js';
import { deepLinkStore } from '#lib/features/deep-link/deep-link.store.svelte.js';
import { registerFileHistoryHook } from '#lib/features/file-history/file-history.service.js';
import { registerSearchIndexHook } from '#lib/features/search/search.service.js';
import { drainEventCalendarWrites } from '#lib/features/event-calendar/event-calendar.service.js';
import { registerAppPorts } from '#lib/app/boot.js';

// The app shell registers the calendar write barrier switchVault drains.
registerAppPorts();

const VAULT_A = '/vaults/A';
const VAULT_B = '/vaults/B';
const NOTE = `${VAULT_A}/note.md`;

/** Vault path observed by each `writeTextFile` call, in call order. */
let vaultAtWrite: (string | null)[] = [];
/** Ordered trace of the save, the calendar drain and the vault change. */
let trace: string[] = [];
let unsubscribers: (() => void)[] = [];

/** Opens vault A with the observers `initializeVault` registers and one dirty tab. */
function openVaultAWithDirtyTab(): void {
	vaultStore.open(VAULT_B);
	vaultStore.open(VAULT_A);
	settingsStore.updateHistory({ snapshotBackupEnabled: false });
	unsubscribers = [registerFileHistoryHook(), registerSearchIndexHook()];
	editorStore.addTab({ path: NOTE, name: 'note.md', content: 'old', savedContent: 'old' });
	editorStore.updateContent('edited in A');
}

/** Returns the args of every `invoke(command)` call. */
function invokeArgs(command: string): Record<string, unknown>[] {
	return vi.mocked(invoke).mock.calls
		.filter(([cmd]) => cmd === command)
		.map(([, args]) => args as Record<string, unknown>);
}

/** Asserts the last save of A's tab went through A's history and search observers. */
function expectSavedInVaultA(): void {
	expect(vaultAtWrite).toEqual([VAULT_A]);
	expect(invokeArgs('save_snapshot')).toEqual([{ filePath: 'note.md', content: 'edited in A' }]);
	expect(invokeArgs('update_search_index_file')).toEqual([
		{ filePath: 'note.md', content: 'edited in A', vaultPath: VAULT_A },
	]);
	expect(editorStore.tabs[0].savedContent).toBe('edited in A');
	expect(trace).toEqual([`write:${VAULT_A}`, `drain:${VAULT_A}`]);
	expect(vaultStore.path).toBe(VAULT_B);
}

describe('vault switch with a dirty tab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		resetHooks();
		vaultStore._reset();
		editorStore.reset();
		deepLinkStore.reset();
		vaultAtWrite = [];
		trace = [];
		vi.mocked(writeTextFile).mockImplementation(async () => {
			vaultAtWrite.push(vaultStore.path);
			trace.push(`write:${vaultStore.path}`);
		});
		vi.mocked(drainEventCalendarWrites).mockImplementation(async () => {
			trace.push(`drain:${vaultStore.path}`);
		});
	});

	afterEach(() => {
		for (const unsubscribe of unsubscribers) unsubscribe();
		unsubscribers = [];
	});

	it('switchVault saves the tab in vault A, with its snapshot and search row, before opening B', async () => {
		openVaultAWithDirtyTab();

		expect(await switchVault(VAULT_B)).toBe(true);

		expectSavedInVaultA();
		expect(ask).not.toHaveBeenCalled();
	});

	it('a deep link to vault B saves the tab in vault A before switching', async () => {
		openVaultAWithDirtyTab();

		await resolveAndDispatch({ type: 'open', vault: 'B', file: 'x.md' });

		expectSavedInVaultA();
		expect(ask).not.toHaveBeenCalled();
	});

	it('switchVault with no dirty tab writes nothing and still drains before opening B', async () => {
		vaultStore.open(VAULT_A);
		unsubscribers = [registerFileHistoryHook(), registerSearchIndexHook()];

		expect(await switchVault(VAULT_B)).toBe(true);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(invokeArgs('save_snapshot')).toEqual([]);
		expect(trace).toEqual([`drain:${VAULT_A}`]);
		expect(vaultStore.path).toBe(VAULT_B);
		expect(ask).not.toHaveBeenCalled();
	});

	it('switchVault opens B only after the user agrees to discard a tab of A whose save failed', async () => {
		openVaultAWithDirtyTab();
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		vi.mocked(ask).mockResolvedValueOnce(true);

		expect(await switchVault(VAULT_B)).toBe(true);

		expect(ask).toHaveBeenCalledTimes(1);
		expect(ask).toHaveBeenCalledWith(
			'Failed to save: note.md. Switch anyway and lose unsaved changes?',
			{ title: 'Unsaved Changes', kind: 'warning', okLabel: 'Switch Anyway', cancelLabel: 'Cancel' },
		);
		expect(invokeArgs('save_snapshot')).toEqual([]);
		expect(editorStore.tabs[0].savedContent).toBe('old');
		expect(trace).toEqual([`drain:${VAULT_A}`]);
		expect(vaultStore.path).toBe(VAULT_B);
	});

	it('switchVault stays in A, with the dirty tab, when the user cancels the discard of a failed save', async () => {
		openVaultAWithDirtyTab();
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		vi.mocked(ask).mockResolvedValueOnce(false);

		expect(await switchVault(VAULT_B)).toBe(false);

		expect(ask).toHaveBeenCalledTimes(1);
		expect(vaultStore.path).toBe(VAULT_A);
		expect(editorStore.tabs[0].content).toBe('edited in A');
		expect(editorStore.tabs[0].savedContent).toBe('old');
		expect(trace).toEqual([]);
	});

	it.each([
		['openVaultDialog', () => {
			vi.mocked(open).mockResolvedValueOnce(VAULT_B);
			return openVaultDialog();
		}],
		['openRecentVault', () => openRecentVault(VAULT_B)],
	])('%s returns false and stays in A when the discard of a failed save is cancelled', async (_name, openB) => {
		openVaultAWithDirtyTab();
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		vi.mocked(ask).mockResolvedValueOnce(false);

		expect(await openB()).toBe(false);

		expect(vaultStore.path).toBe(VAULT_A);
		expect(editorStore.tabs[0].content).toBe('edited in A');
	});
});
