// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../fixtures/localStorage.fixture';
setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
	readDir: vi.fn(),
	mkdir: vi.fn(),
	rename: vi.fn(),
	remove: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), dismiss: vi.fn() }),
}));

import { invoke } from '@tauri-apps/api/core';
import { exists, mkdir, readTextFile, remove, rename, writeTextFile } from '@tauri-apps/plugin-fs';
import { deleteItem, renameItem } from '#lib/core/filesystem/fs.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { trashStore } from '#lib/core/trash/trash.store.svelte.js';

const VAULT = '/vault';
const P = (name: string) => `${VAULT}/${name}.md`;

/**
 * A disk where the move lands and a later step fails: `scan_vault` (the tree
 * refresh that runs after the disk op) rejects, as it does when one folder
 * under the vault cannot be read (`scan_dir` propagates the error).
 */
const disk = new Map<string, string>();

function installDisk(): void {
	disk.clear();
	vi.mocked(exists).mockImplementation(async (p) => disk.has(String(p)));
	vi.mocked(readTextFile).mockImplementation(async (p) => {
		const c = disk.get(String(p));
		if (c === undefined) throw new Error(`No such file: ${String(p)}`);
		return c;
	});
	vi.mocked(writeTextFile).mockImplementation(async (p, data) => {
		disk.set(String(p), String(data));
	});
	vi.mocked(mkdir).mockResolvedValue(undefined);
	vi.mocked(remove).mockResolvedValue(undefined);
	vi.mocked(rename).mockImplementation(async (from, to) => {
		const content = disk.get(String(from));
		if (content === undefined) throw new Error(`No such file: ${String(from)}`);
		disk.set(String(to), content);
		disk.delete(String(from));
	});
	vi.mocked(invoke).mockImplementation(async (cmd) => {
		if (cmd === 'scan_vault') throw new Error('Failed to read directory: Permission denied (os error 13)');
		if (cmd === 'get_backlinks_v2') return [];
		return undefined;
	});
}

describe('calendar-5 / rename-move-delete-6: a failure after the disk op', () => {
	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open(VAULT);
		editorStore.reset();
		trashStore.clear();
		installDisk();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('a rename whose tree refresh fails still re-keys the Rust index for the note it moved', async () => {
		disk.set(P('Standup'), '---\n_type: Event\n---\n');

		await renameItem(P('Standup'), 'Daily.md').catch(() => undefined);

		// The disk move landed.
		expect(disk.has(P('Daily'))).toBe(true);
		expect(disk.has(P('Standup'))).toBe(false);
		// Correct behavior: the Rust VaultIndex is re-keyed from the old path to
		// the new one, so the index does not keep serving the vanished path.
		// Actual: `rename_note` is skipped because the refresh threw first.
		expect(invoke).toHaveBeenCalledWith('rename_note', { from: P('Standup'), to: P('Daily') });
	});

	it('a delete whose tree refresh fails still drops the note from the Rust index', async () => {
		disk.set(P('Standup'), '---\n_type: Event\n---\n');

		await deleteItem(P('Standup')).catch(() => undefined);

		// The note is in the Trash.
		expect(disk.has(P('Standup'))).toBe(false);
		expect(trashStore.items).toHaveLength(1);
		// Correct behavior: the index drops the trashed note. Actual: `forgetNote`
		// is never reached, so `remove_note_from_index` is not sent.
		expect(invoke).toHaveBeenCalledWith('remove_note_from_index', { path: P('Standup') });
	});
});
