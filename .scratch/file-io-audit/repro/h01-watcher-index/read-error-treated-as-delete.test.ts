import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';
setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { rebuildAllIndexes } from '#lib/app/lifecycle/watcher-handler.service.js';

/**
 * Repro for h01 cross-cutting-11. `read_files_batch` (commands/files.rs:63-74)
 * reports a file that exists but cannot be read as `content: None` plus an
 * `error`. The watcher handler maps every `content: null` to a delete
 * (watcher-handler.service.ts:105-109), so the note is dropped from the Rust
 * index, FTS5 and semantic tables even though the file is still on disk.
 *
 * The control case (a path that really is gone) must keep removing the note.
 */
const NOTE = '/vault/latin1.md';

function commandsCalled(): string[] {
	return vi.mocked(invoke).mock.calls.map(([cmd]) => cmd as string);
}

describe('repro h01 cross-cutting-11: a read error is not a deleted note', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vaultStore.open('/vault');
	});

	afterEach(() => {
		clearAllIndexed();
		clearLocalStorage();
	});

	it('an existing note that fails to decode as UTF-8 stays in the Rust index and search tables', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'read_files_batch') {
				return [{ path: NOTE, content: null, error: 'stream did not contain valid UTF-8' }];
			}
			return undefined;
		});

		await rebuildAllIndexes([NOTE]);

		const cmds = commandsCalled();
		expect(cmds).toContain('read_files_batch');
		expect(cmds).not.toContain('remove_note_from_index');
		expect(cmds).not.toContain('remove_from_search_index');
		expect(cmds).not.toContain('remove_semantic_file');
	});

	it('control: a path that no longer exists is still removed from the index', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'read_files_batch') {
				return [{ path: NOTE, content: null, error: 'Failed to resolve path: No such file or directory (os error 2)' }];
			}
			return undefined;
		});

		await rebuildAllIndexes([NOTE]);

		expect(invoke).toHaveBeenCalledWith('remove_note_from_index', { path: NOTE });
	});
});
